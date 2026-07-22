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
  const files = fs.readdirSync(changes, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(changes, entry.name, "state.json")))
    .map((entry) => path.join(changes, entry.name, "state.json"));
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
