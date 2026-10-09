"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { compileDesignPlan, validatePlan } = require("../skill/scripts/plan-core.cjs");
const { createArtifactMetadata, validateArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { invalidateDownstream } = require("../skill/scripts/invalidation-core.cjs");
const { checkInteractionStateCoverage, APPLICABLE_STATES } = require("../skill/scripts/gate-core.cjs");
const { createInitialState, validateV2, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { loadArtifacts, readPlan } = require("../skill/scripts/control-runtime-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");

function root() { return fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-control-")); }
function manifest(overrides = {}) {
  return { targetPlatform: "web", primaryTask: "manage records", targetScreen: "dashboard", mode: "rebuild", fidelity: "exact", ...overrides };
}
function allCoverageStates() {
  return Object.fromEntries(APPLICABLE_STATES.map((state) => [state, { applicable: false, reason: "not applicable to this control" }]));
}

test("plan compilation is deterministic and blocks missing intent", () => {
  const first = compileDesignPlan(manifest());
  const second = compileDesignPlan(manifest());
  assert.equal(first.input_hash, second.input_hash);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.status, "ready");
  assert.equal(first.phases[0].id, "intent");
  const blocked = compileDesignPlan(manifest({ targetScreen: undefined }));
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.runnable, false);
  assert.equal(blocked.blockers[0].field, "targetScreen");
  assert.throws(() => compileDesignPlan(manifest({ mode: 42 })), /mode must be a string/);
  assert.throws(() => compileDesignPlan(manifest({ fidelity: false })), /fidelity must be a string/);
});

test("plan validation rejects cyclic or misordered persisted plans", () => {
  const base = compileDesignPlan(manifest());
  assert.throws(() => validatePlan({ ...base, phases: [{ ...base.phases[1], depends_on: [base.phases[0].id] }, base.phases[0], ...base.phases.slice(2)] }), /follow dependency/);
  assert.throws(() => validatePlan({ ...base, phases: base.phases.map((phase) => phase.id === "intent" ? { ...phase, depends_on: ["package"] } : phase) }), /cycle|follow dependency|unknown phase/);
});

function interactionVisualPlan() {
  return {
    schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "local-web", input_hash: "sha256:" + "a".repeat(64), mode: "greenfield", fidelity: "adaptive",
    phases: [{
      id: "toggle", depends_on: [], inputs: ["interaction.json"], outputs: ["index.html"], gates: [], goal: "Make the toggle respond to activation.",
      visual: {
        target: "toggle", property: "activation", references: ["reference.md"], scope: ["index.html"], guides: ["guides/interaction.md"], checks: ["evidence/interaction-check.json"],
        verification: [{ kind: "interaction", probe: "interaction.json", target: "index.html", check: "evidence/interaction-check.json" }],
      },
    }],
  };
}

test("visual plans accept declared interaction bindings and keep report-only legacy plans readable", () => {
  const plan = interactionVisualPlan();
  const before = JSON.stringify(plan);
  assert.equal(validatePlan(plan, { requireVisualTasks: true }), plan);
  assert.equal(JSON.stringify(plan), before, "validation must not rewrite the bound plan");
  const legacy = structuredClone(plan);
  delete legacy.phases[0].visual.verification;
  assert.equal(validatePlan(legacy, { requireVisualTasks: true }), legacy);

  const twoChecks = structuredClone(plan);
  twoChecks.phases[0].visual.checks.push("evidence/second-check.json");
  twoChecks.phases[0].visual.verification.push({ kind: "interaction", probe: "interaction.json", target: "index.html", check: "evidence/second-check.json" });
  assert.equal(validatePlan(twoChecks, { requireVisualTasks: true }), twoChecks);
});

test("visual verification rejects unsupported, duplicate and undeclared check bindings", () => {
  const cases = [
    ["unsupported kind", phase => { phase.visual.verification[0].kind = "shell"; }, /kind/],
    ["arbitrary command", phase => { phase.visual.verification[0].command = "node check.cjs"; }, /unknown|unexpected|allowed|command/],
    ["missing descriptor field", phase => { delete phase.visual.verification[0].target; }, /target/],
    ["object instead of list", phase => { phase.visual.verification = phase.visual.verification[0]; }, /array/],
    ["empty list", phase => { phase.visual.verification = []; }, /non-empty|binding|check/],
    ["undeclared probe", phase => { phase.visual.verification[0].probe = "other-probe.json"; }, /probe.*inputs|inputs.*probe/],
    ["undeclared output", phase => { phase.visual.verification[0].target = "other.html"; }, /target.*outputs|outputs.*target/],
    ["undeclared check", phase => { phase.visual.verification[0].check = "evidence/other-check.json"; }, /check.*checks|checks.*check/],
    ["missing required check", phase => { phase.visual.checks.push("evidence/second-check.json"); }, /binding|verification/],
    ["duplicate check binding", phase => { phase.visual.verification.push({ ...phase.visual.verification[0] }); }, /duplicate|exactly once/],
    ["duplicate normalized check binding", phase => { phase.visual.verification.push({ ...phase.visual.verification[0], check: "evidence/./interaction-check.json" }); }, /duplicate|exactly once/],
    ["duplicate declared check", phase => { phase.visual.checks.push(phase.visual.checks[0]); }, /duplicate|exactly once/],
  ];
  for (const [label, mutate, expected] of cases) {
    const plan = interactionVisualPlan();
    mutate(plan.phases[0]);
    assert.throws(() => validatePlan(plan, { requireVisualTasks: true }), expected, label);
  }
});

test("visual verification paths stay contained and bind normalized declared paths", () => {
  const normalized = interactionVisualPlan();
  normalized.phases[0].visual.verification[0] = { kind: "interaction", probe: "./interaction.json", target: "./index.html", check: "evidence\\interaction-check.json" };
  assert.equal(validatePlan(normalized, { requireVisualTasks: true }), normalized);
  for (const key of ["probe", "target", "check"]) {
    for (const value of ["../outside.json", "nested/../outside.json", "/outside.json", "C:\\outside.json", "https://example.test/index.html", "$plan"]) {
      const plan = interactionVisualPlan();
      plan.phases[0].visual.verification[0][key] = value;
      assert.throws(() => validatePlan(plan, { requireVisualTasks: true }), /contained relative path/, `${key}: ${value}`);
    }
  }
});

test("persisted control plans must remain governed and runnable", () => {
  const changeRoot = root();
  const plan = compileDesignPlan(manifest());
  const planFile = path.join(changeRoot, "plan.json");
  fs.writeFileSync(planFile, JSON.stringify(plan));
  assert.equal(readPlan(planFile).plan_id, plan.plan_id);
  const forged = {
    ...plan,
    plan_id: "attacker",
    input_hash: "sha256:" + "0".repeat(64),
    manifest: undefined,
    phases: [{ id: "fake", depends_on: [], inputs: [], outputs: [], gates: [] }],
  };
  fs.writeFileSync(planFile, JSON.stringify(forged));
  assert.throws(() => readPlan(planFile), /runnable plan|registry|input_hash|phase/i);
});

test("artifact metadata validates contained hashes and reports drift", () => {
  const changeRoot = root();
  const file = path.join(changeRoot, "structure.json");
  fs.writeFileSync(file, "structure\n");
  const metadata = createArtifactMetadata({ path: "structure.json", producer: "structure", input_hashes: { "manifest.json": "sha256:" + "a".repeat(64) }, dependencies: [], created_at: "2026-09-01T00:00:00.000Z" }, { changeRoot });
  assert.equal(validateArtifactMetadata(metadata, { changeRoot }).status, "ready");
  fs.writeFileSync(file, "changed\n");
  assert.equal(validateArtifactMetadata(metadata, { changeRoot }).status, "stale");
  assert.throws(() => createArtifactMetadata({ ...metadata, path: "../outside.json" }, { changeRoot, requireFile: false }), /outside|contained|stay inside/);
  assert.throws(() => createArtifactMetadata({ ...metadata, artifact_hash: "sha256:" + "0".repeat(64) }, { changeRoot }), /does not match.*artifact file/i);
});

test("runtime reloads persisted artifact maps", () => {
  const changeRoot = root();
  const metadata = { schema: "design-pipeline.artifact.v1", schema_version: 1, path: "structure.json", producer: "structure", input_hashes: {}, artifact_hash: "sha256:" + "d".repeat(64), dependencies: [], created_at: "2026-09-01T00:00:00.000Z", status: "ready" };
  const state = { extensions: { control: { artifacts: { "structure.json": metadata } } } };
  assert.deepEqual(loadArtifacts(changeRoot, state), [metadata]);
});

test("invalidation marks only the changed phase and declared dependents", () => {
  const plan = {
    schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "plan", input_hash: "sha256:" + "a".repeat(64), mode: "greenfield", fidelity: "adaptive",
    phases: [
      { id: "structure", depends_on: [], inputs: [], outputs: ["structure.json"], gates: [] },
      { id: "anchor", depends_on: ["structure"], inputs: ["structure.json"], outputs: ["anchor.json"], gates: [] },
      { id: "unrelated", depends_on: [], inputs: [], outputs: ["unrelated.json"], gates: [] },
    ],
  };
  const artifacts = ["structure.json", "anchor.json", "unrelated.json"].map((file) => ({ schema: "design-pipeline.artifact.v1", schema_version: 1, path: file, producer: "test", input_hashes: {}, artifact_hash: "sha256:" + "b".repeat(64), dependencies: [], created_at: "2026-09-01T00:00:00.000Z", status: "ready" }));
  const result = invalidateDownstream(plan, artifacts, "structure.json", { cause: "structure changed" });
  assert.deepEqual(result.invalidated.sort(), ["anchor.json", "structure.json"]);
  assert.equal(result.artifacts.find((item) => item.path === "unrelated.json").status, "ready");
  const again = invalidateDownstream(plan, result.artifacts, "structure.json", { cause: "structure changed" });
  assert.deepEqual(again.invalidated, []);
});

test("declared invalidation scope can keep new evidence local", () => {
  const plan = compileDesignPlan(manifest());
  const artifacts = plan.phases.flatMap((phase) => phase.outputs.map((file) => ({
    schema: "design-pipeline.artifact.v1", schema_version: 1, path: file, producer: phase.id, input_hashes: {}, artifact_hash: "sha256:" + "c".repeat(64), dependencies: [], created_at: "2026-09-01T00:00:00.000Z", status: "ready",
  })));
  const result = invalidateDownstream(plan, artifacts, "evidence/reference-index.json", { cause: "new evidence" });
  assert.deepEqual(result.invalidated, ["evidence/reference-index.json"]);
  assert.deepEqual(result.invalidatedPhases, ["evidence"]);
});

test("state coverage rejects missing evidence and accepts explicit applicability", () => {
  const noEvidenceStates = allCoverageStates();
  const noEvidence = { entries: [{ id: "blank", interactive: false, inputs: ["pointer"], viewports: ["mobile", "desktop"], states: { default: {}, ...noEvidenceStates } }] };
  assert.equal(checkInteractionStateCoverage(noEvidence).status, "blocked");
  const defaultOnly = checkInteractionStateCoverage({ entries: [{ id: "save", interactive: true, inputs: ["keyboard"], viewports: ["mobile", "desktop"], reducedMotion: "instant", states: { default: { covered: true, evidence: ["default"] } } }] });
  assert.equal(defaultOnly.status, "blocked");
  const states = allCoverageStates();
  states.focus = { applicable: true, covered: true, evidence: ["focus"] };
  states.pressed = { applicable: true, covered: true, evidence: ["pressed"] };
  const covered = checkInteractionStateCoverage({ entries: [{ id: "save", interactive: true, inputs: ["keyboard"], viewports: ["mobile", "desktop"], reducedMotion: "instant", states: { default: { covered: true, evidence: ["default"] }, ...states } }] });
  assert.equal(covered.status, "passed");
});

test("CLI plan uses the common JSON envelope and does not emit blocked plans", () => {
  const changeRoot = root();
  fs.writeFileSync(path.join(changeRoot, "manifest.json"), JSON.stringify(manifest()));
  const ready = execute(["plan", "--root", changeRoot, "--manifest", "manifest.json", "--output", "plan.json", "--json"]);
  assert.equal(ready.exitCode, 0);
  assert.equal(ready.output.ok, true);
  assert.equal(fs.existsSync(path.join(changeRoot, "plan.json")), true);
  fs.writeFileSync(path.join(changeRoot, "bad.json"), JSON.stringify(manifest({ targetPlatform: undefined })));
  const blocked = execute(["plan", "--root", changeRoot, "--manifest", "bad.json", "--output", "bad-plan.json", "--json"]);
  assert.equal(blocked.exitCode, 2);
  assert.equal(blocked.output.ok, true);
  assert.equal(fs.existsSync(path.join(changeRoot, "bad-plan.json")), false);
});

test("control projection remains in the existing state extension boundary", () => {
  const changeRoot = root();
  const state = createInitialState({ changeId: "control-state", timestamp: "2026-09-01T00:00:00.000Z", control: { phaseStatus: "not_started", outcome: null } });
  writeNewChange(path.join(changeRoot, "state.json"), path.join(changeRoot, "events.jsonl"), state);
  validateV2(JSON.parse(fs.readFileSync(path.join(changeRoot, "state.json"), "utf8")));
  assert.deepEqual(state.extensions.control, { phaseStatus: "not_started", outcome: null });
});

test("run, status, explain-block, and package share the control projection", () => {
  const rootDir = root();
  const changeRoot = path.join(rootDir, "change");
  fs.mkdirSync(changeRoot);
  fs.writeFileSync(path.join(rootDir, "manifest.json"), JSON.stringify(manifest()));
  const planned = execute(["plan", "--root", rootDir, "--manifest", "manifest.json", "--output", "change/plan.json", "--json"]);
  assert.equal(planned.exitCode, 0);
  writeNewChange(path.join(changeRoot, "state.json"), path.join(changeRoot, "events.jsonl"), createInitialState({ changeId: "control-cli", timestamp: "2026-09-01T00:00:00.000Z" }));
  const run = execute(["run", "--root", rootDir, "--plan", "change/plan.json", "--change-root", "change", "--to", "intent", "--timestamp", "2026-09-01T00:01:00Z", "--json"]);
  assert.equal(run.exitCode, 2, JSON.stringify(run.output));
  assert.equal(run.output.ok, true);
  const status = execute(["status", "--root", rootDir, "--change-root", "change", "--json"]);
  assert.equal(status.output.control.phaseStatus, "blocked");
  const explanation = execute(["explain-block", "--root", rootDir, "--change-root", "change", "--json"]);
  assert.equal(explanation.output.status, "blocked");
  assert.equal(explanation.output.blockers[0].code, "ARTIFACT_MISSING");
  const packaged = execute(["package", "--root", rootDir, "--change-root", "change", "--output", "package.json", "--json"]);
  assert.equal(packaged.exitCode, 2);
  assert.equal(packaged.output.status, "blocked");
  const collision = execute(["package", "--root", rootDir, "--change-root", "change", "--output", "change/plan.json", "--json"]);
  assert.equal(collision.exitCode, 2);
  assert.equal(collision.output.blockers[0].code, "OUTPUT_COLLISION");
});
