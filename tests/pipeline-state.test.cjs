"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  advanceChange,
  canonicalJson,
  createInitialState,
  inspectConsistency,
  migrateFile,
  migrateV1,
  parseEvents,
  repairLegacyEvents,
  validateState,
  validateV2,
  writeNewChange,
} = require("../skill/scripts/pipeline-state-core.cjs");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");
const { compileDesignPlan, validatePlan } = require("../skill/scripts/plan-core.cjs");
const { validateArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");

function tempChange() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-state-"));
  return { root, stateFile: path.join(root, "state.json"), eventsFile: path.join(root, "events.jsonl") };
}

function legacy(overrides = {}) {
  return {
    schema: "design-pipeline.state.v1",
    changeId: "example-change",
    status: "ready-for-release",
    phase: "verified",
    updatedAt: "2026-07-23T00:00:00.000Z",
    blockers: [],
    next: ["release"],
    designFoundation: { path: "DESIGN.md", status: "ready", sha256: "a".repeat(64) },
    customField: { keep: true },
    ...overrides,
  };
}

test("both observed v1 dialects migrate deterministically without ambient time", () => {
  const phase = migrateV1(legacy());
  const stage = migrateV1(legacy({ schema: "design-pipeline-state.v1", phase: undefined, stage: "merge-ready", status: "active", next: undefined, nextAction: "ship" }));
  assert.equal(phase.phase, "verification");
  assert.equal(phase.status, "verifying");
  assert.equal(phase.updatedAt, "2026-07-23T00:00:00.000Z");
  assert.equal(phase.migration.sourceNextField, "next");
  assert.deepEqual(phase.extensions.unknown, { customField: { keep: true } });
  assert.equal(stage.phase, "release-readiness");
  assert.equal(stage.status, "verifying");
  assert.deepEqual(stage.nextActions, ["ship"]);
  assert.equal(stage.migration.sourcePhaseField, "stage");
  assert.equal(stage.migration.sourceNextField, "nextAction");
  assert.equal(canonicalJson(migrateV1(legacy())), canonicalJson(migrateV1(legacy())));
});

test("every repository change state is readable and has deterministic v2 migration", () => {
  const changes = path.resolve(__dirname, "../openspec/changes");
  function stateFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? stateFiles(target) : entry.name === "state.json" ? [target] : [];
    });
  }
  const files = stateFiles(changes);
  assert.ok(files.length >= 9);
  for (const file of files) {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    validateState(state);
    if (state.schema === "design-pipeline.state.v2") {
      validateV2(state);
      continue;
    }
    const migrated = migrateV1(state);
    validateV2(migrated);
    assert.equal(canonicalJson(migrated), canonicalJson(migrateV1(state)), file);
  }
});

test("future schemas, unbundled registries, invalid status, and JSONL line errors fail closed", () => {
  assert.throws(() => validateState({ schema: "design-pipeline.state.v99" }), /unsupported schema/);
  const state = migrateV1(legacy());
  assert.throws(() => validateV2({ ...state, registryVersion: "design-pipeline.phases.v99" }), /unknown registry/);
  assert.throws(() => validateV2({ ...state, status: "active" }), /invalid value/);
  assert.throws(() => parseEvents("{}\nnot-json\n"), /line 1|line 2/);
});

test("advance is CAS-guarded, locked, transition-checked, and crash-safe", () => {
  const change = tempChange();
  writeNewChange(change.stateFile, change.eventsFile, createInitialState({ changeId: "state-test", timestamp: "2026-07-23T00:00:00.000Z" }));
  const firstHash = sha256(fs.readFileSync(change.stateFile));
  const advanced = advanceChange(change.stateFile, change.eventsFile, {
    expectedSha256: firstHash,
    timestamp: "2026-07-23T00:01:00.000Z",
    phase: "brief",
    summary: "Brief completed",
    nextActions: ["choose direction"],
  });
  assert.equal(advanced.state.revision, 1);
  assert.equal(advanced.state.lastEventSeq, 1);
  assert.equal(inspectConsistency(advanced.state, fs.readFileSync(change.eventsFile, "utf8")).status, "consistent");
  assert.throws(() => advanceChange(change.stateFile, change.eventsFile, { expectedSha256: firstHash, timestamp: "2026-07-23T00:02:00.000Z", phase: "directions", summary: "stale" }), /does not match/);
  assert.throws(() => advanceChange(change.stateFile, change.eventsFile, { expectedSha256: advanced.stateSha256, timestamp: "2026-07-23T00:02:00.000Z", phase: "archive", summary: "jump" }), /not allowed/);

  const beforeState = fs.readFileSync(change.stateFile);
  const beforeEvents = fs.readFileSync(change.eventsFile);
  for (const failpoint of ["after-stage", "after-backup", "after-events", "after-state"]) {
    assert.throws(() => advanceChange(change.stateFile, change.eventsFile, {
      expectedSha256: sha256(fs.readFileSync(change.stateFile)),
      timestamp: "2026-07-23T00:03:00.000Z",
      phase: "directions",
      summary: `interrupt ${failpoint}`,
      failpoint,
    }), /simulated interruption/);
    assert.deepEqual(fs.readFileSync(change.stateFile), beforeState);
    assert.deepEqual(fs.readFileSync(change.eventsFile), beforeEvents);
  }
  fs.writeFileSync(`${change.stateFile}.lock`, "busy\n");
  assert.throws(() => advanceChange(change.stateFile, change.eventsFile, { expectedSha256: sha256(beforeState), timestamp: "2026-07-23T00:04:00.000Z", phase: "directions", summary: "locked" }), /writer lock exists/);
});

test("new change initialization is locked and never leaves a partial pair", () => {
  for (const failpoint of ["after-stage", "after-events", "after-state"]) {
    const change = tempChange();
    const state = createInitialState({ changeId: "init-test", timestamp: "2026-07-23T00:00:00.000Z" });
    assert.throws(() => writeNewChange(change.stateFile, change.eventsFile, state, { failpoint }), /simulated initialization interruption/);
    assert.equal(fs.existsSync(change.stateFile), false);
    assert.equal(fs.existsSync(change.eventsFile), false);
    assert.equal(fs.existsSync(`${change.stateFile}.lock`), false);
  }

  const change = tempChange();
  const state = createInitialState({ changeId: "init-test", timestamp: "2026-07-23T00:00:00.000Z" });
  writeNewChange(change.stateFile, change.eventsFile, state);
  assert.throws(() => writeNewChange(change.stateFile, change.eventsFile, state), /already exists/);
  assert.equal(inspectConsistency(JSON.parse(fs.readFileSync(change.stateFile, "utf8")), fs.readFileSync(change.eventsFile, "utf8")).status, "consistent");
});

test("legacy event history requires an explicit attributed repair", () => {
  const change = tempChange();
  fs.writeFileSync(change.stateFile, canonicalJson(legacy()));
  fs.writeFileSync(change.eventsFile, `${JSON.stringify({ ts: "2026-07-23T00:00:00.000Z", phase: "verified", type: "legacy", summary: "old", files: [], evidence: [], nextActions: [] })}\n`);
  const sourceHash = sha256(fs.readFileSync(change.stateFile));
  migrateFile(change.stateFile, { write: true, expectedSha256: sourceHash });
  const result = repairLegacyEvents(change.stateFile, change.eventsFile, {
    expectedSha256: sha256(fs.readFileSync(change.stateFile)),
    timestamp: "2026-07-23T00:05:00.000Z",
  });
  assert.equal(result.state.lastEventSeq, 1);
  assert.equal(result.event.type, "state-repair");
  assert.equal(result.state.extensions.legacyEvents.count, 1);
  assert.equal(inspectConsistency(result.state, fs.readFileSync(change.eventsFile, "utf8")).status, "consistent");
});

function visualPlan() {
  return {
    schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "visual-example",
    input_hash: "sha256:" + "a".repeat(64), mode: "clone", fidelity: "exact",
    phases: [{
      id: "outline", depends_on: [], inputs: ["reference.png"], outputs: ["component.html"], gates: [],
      goal: "Match the reference outline", visual: {
        target: "reference/outline", property: "silhouette", references: ["reference.png"],
        scope: ["component.html"], guides: ["references/reconstruction-spec.md"], checks: ["outline-check.json"], review: true,
      },
    }],
  };
}

test("visual task plans validate bounded executable details without changing governed plans", () => {
  const plan = visualPlan();
  assert.equal(validatePlan(plan, { requireVisualTasks: true }), plan);
  const governed = compileDesignPlan({ targetPlatform: "web", primaryTask: "settings", targetScreen: "settings" });
  assert.equal(validatePlan(governed, { requireRunnable: true }), governed);
  assert.throws(() => validatePlan(governed, { requireVisualTasks: true }), /goal|visual/);
  for (const property of [["silhouette", "color"], "", null]) {
    assert.throws(() => validatePlan({ ...plan, phases: [{ ...plan.phases[0], visual: { ...plan.phases[0].visual, property } }] }), /property/);
  }
  for (const field of ["references", "scope", "guides", "checks", "inputs", "outputs"]) {
    for (const unsafe of ["", "../outside.json", "folder/../outside.json", "C:\\outside.json", "C:outside.json", "/outside.json", "\\\\host\\share", ".", "a\u0000b", "$plan", "$task"]) {
      const phase = structuredClone(plan.phases[0]);
      if (["inputs", "outputs"].includes(field)) phase[field] = [unsafe]; else phase.visual[field] = [unsafe];
      assert.throws(() => validatePlan({ ...plan, phases: [phase] }, { requireVisualTasks: true }), /relative|path|non-empty/);
    }
  }
  for (const field of ["references", "scope", "guides", "checks", "outputs"]) {
    const phase = structuredClone(plan.phases[0]);
    if (field === "outputs") phase.outputs = []; else phase.visual[field] = [];
    assert.throws(() => validatePlan({ ...plan, phases: [phase] }, { requireVisualTasks: true }), /empty/);
  }
  const phase = structuredClone(plan.phases[0]);
  phase.visual.review = "yes";
  assert.throws(() => validatePlan({ ...plan, phases: [phase] }), /review/);
  delete phase.visual.review;
  assert.equal(validatePlan({ ...plan, phases: [phase] }, { requireVisualTasks: true }).phases[0], phase);
  phase.visual.checks = [phase.outputs[0]];
  assert.throws(() => validatePlan({ ...plan, phases: [phase] }), /overlap|output/);
  phase.visual.checks = ["outline-check.json"];
  phase.visual.unused = true;
  assert.throws(() => validatePlan({ ...plan, phases: [phase] }), /unsupported/);
});

function visualProgress() {
  const hash = "sha256:" + "b".repeat(64);
  return {
    planHash: hash, planPath: "tasks/visual-plan.json", completed: {
      outline: { taskHash: hash, inputHashes: { $plan: hash, $task: hash, "reference.png": hash }, artifacts: [{
        schema: "design-pipeline.artifact.v1", schema_version: 1, path: "versions/outline/component.html", producer: "outline",
        input_hashes: { $plan: hash }, artifact_hash: hash, dependencies: [], created_at: "2026-07-23T00:00:00.000Z", status: "ready",
      }], status: "stale" },
    }, failures: { enamel: "Missing the required runtime comparison" },
  };
}

test("visual tasks reject aggregate properties and missing capability entry points", () => {
  const plan = visualPlan();
  for (const property of ["轮廓、厚度和倒角", "geometry.all", "surface.ALL", "geometry", "materials", "motion", "component", "page", "all", "implementation", "contour and depth", "geometry/color"]) {
    const phase = structuredClone(plan.phases[0]); phase.visual.property = property;
    assert.throws(() => validatePlan({ ...plan, phases: [phase] }, { requireVisualTasks: true }), /property|atomic/);
  }
  const phase = structuredClone(plan.phases[0]); phase.visual.guides = [];
  assert.throws(() => validatePlan({ ...plan, phases: [phase] }, { requireVisualTasks: true }), /guides|non-empty/);
  for (const property of ["contour", "depth", "structure", "layer.contour", "surface.roughness"]) {
    assert.equal(validatePlan({ ...plan, phases: [{ ...plan.phases[0], visual: { ...plan.phases[0].visual, property } }] }, { requireVisualTasks: true }).phases[0].visual.property, property);
  }
});

test("video visual task source bindings keep the v1 plan and require contained, distinct observations", () => {
  const plan = visualPlan(), phase = plan.phases[0];
  phase.visual.references = ["analysis/report.json"];
  phase.visual.sourceObservation = { report: "analysis/report.json", shotId: "logo-entry", observationIds: ["logo-contour"] };
  assert.equal(validatePlan(plan, { requireVisualTasks: true }), plan);
  for (const binding of [
    null, {}, { report: "../report.json", shotId: "logo-entry", observationIds: ["logo-contour"] },
    { report: "analysis/report.json", shotId: "", observationIds: ["logo-contour"] },
    { report: "analysis/report.json", shotId: "logo-entry", observationIds: [] },
    { report: "analysis/report.json", shotId: "logo-entry", observationIds: ["logo-contour", "logo-contour"] },
    { report: "other-report.json", shotId: "logo-entry", observationIds: ["logo-contour"] },
    { report: "analysis/report.json", shotId: "logo-entry", observationIds: ["logo-contour"], inferred: true },
  ]) {
    const altered = structuredClone(plan); altered.phases[0].visual.sourceObservation = binding;
    assert.throws(() => validatePlan(altered, { requireVisualTasks: true }), /sourceObservation|relative|unique|item|included|unsupported/);
  }
});

test("visual task ids cannot inherit object prototype records", () => {
  for (const id of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"]) {
    const plan = visualPlan(); plan.phases[0].id = id;
    assert.throws(() => validatePlan(plan, { requireVisualTasks: true }), /reserved|id/);
    const legacy = structuredClone(plan); delete legacy.phases[0].visual; delete legacy.phases[0].goal;
    assert.equal(validatePlan(legacy), legacy);
    const state = createInitialState({ changeId: "reserved-id", timestamp: "2026-07-23T00:00:00.000Z", phase: "implementation" });
    const progress = visualProgress();
    progress.completed = { [id]: progress.completed.outline };
    assert.throws(() => validateV2({ ...state, extensions: { visualTasks: progress } }), /reserved|id/);
    progress.completed = {}; progress.failures = { [id]: "Needs correction" };
    assert.throws(() => validateV2({ ...state, extensions: { visualTasks: progress } }), /reserved|id/);
  }
});

test("offline artifact validation does not compare historical metadata with current file bytes", () => {
  const change = tempChange();
  const metadata = visualProgress().completed.outline.artifacts[0];
  const target = path.join(change.root, metadata.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, "changed current component");
  assert.equal(validateArtifactMetadata(metadata, { changeRoot: change.root }).status, "stale");
  assert.equal(validateArtifactMetadata(metadata, { changeRoot: change.root, metadataOnly: true }).status, "ready");
});

test("native state validates visual progress and preserves historical stale evidence", () => {
  const state = createInitialState({ changeId: "visual-state", timestamp: "2026-07-23T00:00:00.000Z", phase: "implementation" });
  const withProgress = (progress) => ({ ...state, extensions: { visualTasks: progress } });
  assert.equal(validateV2(withProgress(visualProgress())).extensions.visualTasks.completed.outline.status, "stale");
  for (const alter of [
    p => { p.planHash = "invalid"; }, p => { p.planPath = "../plan.json"; }, p => { p.completed.outline.taskHash = "invalid"; },
    p => { p.completed.outline.inputHashes.$task = "invalid"; }, p => { p.completed.outline.inputHashes = []; },
    p => { p.completed.outline.artifacts = []; }, p => { p.completed.outline.artifacts[0].schema = "new-receipt"; },
    p => { p.completed.outline.artifacts[0].path = "../outside.html"; }, p => { p.completed.outline.status = "accepted"; },
    p => { p.failures.enamel = ""; }, p => { p.unused = true; }, p => { p.completed.outline.unused = true; },
  ]) {
    const progress = visualProgress(); alter(progress);
    assert.throws(() => validateV2(withProgress(progress)), /visualTasks|artifact/);
  }
});

test("visual progress updates use the existing CAS transaction and retain unrelated extensions", () => {
  const change = tempChange();
  const initial = createInitialState({ changeId: "visual-advance", timestamp: "2026-07-23T00:00:00.000Z", phase: "implementation" });
  initial.extensions.keep = { existing: true };
  writeNewChange(change.stateFile, change.eventsFile, initial);
  const firstHash = sha256(fs.readFileSync(change.stateFile));
  const progress = visualProgress();
  const updated = advanceChange(change.stateFile, change.eventsFile, { expectedSha256: firstHash, timestamp: "2026-07-23T00:01:00.000Z", summary: "Record bounded task evidence", visualTasks: progress });
  assert.deepEqual(updated.state.extensions.visualTasks, progress);
  assert.deepEqual(updated.state.extensions.keep, { existing: true });
  assert.equal(inspectConsistency(updated.state, fs.readFileSync(change.eventsFile, "utf8")).status, "consistent");
  assert.throws(() => advanceChange(change.stateFile, change.eventsFile, { expectedSha256: firstHash, timestamp: "2026-07-23T00:02:00.000Z", summary: "stale update", visualTasks: progress }), /does not match/);
  const before = fs.readFileSync(change.stateFile);
  const eventsBefore = fs.readFileSync(change.eventsFile);
  assert.throws(() => advanceChange(change.stateFile, change.eventsFile, { expectedSha256: updated.stateSha256, timestamp: "2026-07-23T00:03:00.000Z", summary: "invalid update", visualTasks: { ...progress, planPath: "../outside.json" } }), /relative|path/);
  assert.deepEqual(fs.readFileSync(change.stateFile), before);
  assert.deepEqual(fs.readFileSync(change.eventsFile), eventsBefore);
});
