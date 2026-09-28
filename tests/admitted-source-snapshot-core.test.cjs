"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  COMPANION_WORKSPACE_POLICY_SCHEMA,
  createAdmittedSourceSnapshot,
  disposeCompanionWorkspace,
  pruneCompanionWorkspace,
  recoverCompanionWorkspace,
  validateAdmittedSourceSnapshot,
} = require("../skill/scripts/admitted-source-snapshot-core.cjs");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "admitted-source-snapshot-core-"));
  const sourceRoot = path.join(root, "source");
  const targetRoot = path.join(root, "target");
  const companionWorkspaceRoot = path.join(root, "companion");
  for (const directory of [sourceRoot, targetRoot, companionWorkspaceRoot]) fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "source.js"), "export const source = true;\n");
  fs.writeFileSync(path.join(targetRoot, "target.js"), "export const target = true;\n");
  const source = { kind: "local", identity: "fixture://source", revision: "r1", contentHash: "a".repeat(64) };
  const admissionReceipt = { receiptId: "admission-receipt", source };
  const policy = { schema: COMPANION_WORKSPACE_POLICY_SCHEMA, retentionWindowMs: 3600000, maxSnapshots: 2, disposeOnFailure: false, recoveryFromPartialStaging: "remove-staging-preserve-published" };
  return { root, sourceRoot, targetRoot, companionWorkspaceRoot, source, admissionReceipt, policy };
}

function lifecycleInput(fixture, overrides = {}) {
  return { id: "workspace-lifecycle", workspaceRoot: fixture.companionWorkspaceRoot, sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, policy: fixture.policy, now: "2026-09-18T00:00:00.000Z", ...overrides };
}

test("snapshot receipt binds explicit companion workspace policy by hash", () => {
  const fixtureData = fixture();
  const result = createAdmittedSourceSnapshot({ id: "snapshot-one", admissionReceiptId: fixtureData.admissionReceipt.receiptId, companionWorkspaceRoot: fixtureData.companionWorkspaceRoot, materializedPath: path.join(fixtureData.companionWorkspaceRoot, "snapshot-one"), sourceRoot: fixtureData.sourceRoot, targetRoot: fixtureData.targetRoot, source: fixtureData.source, admissionReceipt: fixtureData.admissionReceipt, companionWorkspacePolicy: fixtureData.policy });
  assert.equal(result.status, "ready");
  assert.equal(result.snapshot.companionWorkspacePolicyHash.startsWith("sha256:"), true);
  assert.throws(() => validateAdmittedSourceSnapshot({ ...result.snapshot, companionWorkspacePolicyHash: "sha256:" + "f".repeat(64) }), /companionWorkspacePolicyHash does not match/);
});

test("companion workspace excludes source and target trees", () => {
  const fixtureData = fixture();
  assert.throws(() => disposeCompanionWorkspace(lifecycleInput(fixtureData, { workspaceRoot: fixtureData.sourceRoot })), /outside sourceRoot/);
  assert.throws(() => pruneCompanionWorkspace(lifecycleInput(fixtureData, { targetRoot: fixtureData.companionWorkspaceRoot })), /outside targetRoot/);
  assert.throws(() => createAdmittedSourceSnapshot({ id: "nested", admissionReceiptId: fixtureData.admissionReceipt.receiptId, companionWorkspaceRoot: fixtureData.sourceRoot, materializedPath: path.join(fixtureData.sourceRoot, "snapshot"), sourceRoot: fixtureData.sourceRoot, targetRoot: fixtureData.targetRoot, source: fixtureData.source, admissionReceipt: fixtureData.admissionReceipt, companionWorkspacePolicy: fixtureData.policy }), /outside sourceRoot/);
});

test("retention pruning keeps newest in-window snapshots and is idempotent", () => {
  const fixtureData = fixture();
  const now = Date.parse("2026-09-18T00:00:00.000Z");
  for (const [name, age] of [["snapshot-old", 7200000], ["snapshot-new", 1800000], ["snapshot-newest", 600000]]) {
    const directory = path.join(fixtureData.companionWorkspaceRoot, name);
    fs.mkdirSync(directory);
    fs.utimesSync(directory, new Date(now - age), new Date(now - age));
  }
  const first = pruneCompanionWorkspace(lifecycleInput(fixtureData));
  assert.equal(first.status, "pruned");
  assert.deepEqual(first.receipt.removed, ["snapshot-old"]);
  assert.deepEqual(first.receipt.retained.sort(), ["snapshot-new", "snapshot-newest"]);
  const second = pruneCompanionWorkspace(lifecycleInput(fixtureData));
  assert.equal(second.status, "unchanged");
  assert.deepEqual(second.receipt.removed, []);
});

test("dispose clears only companion workspace and is idempotent", () => {
  const fixtureData = fixture();
  fs.writeFileSync(path.join(fixtureData.sourceRoot, "keep-source"), "source");
  fs.writeFileSync(path.join(fixtureData.targetRoot, "keep-target"), "target");
  fs.mkdirSync(path.join(fixtureData.companionWorkspaceRoot, "snapshot"));
  fs.writeFileSync(path.join(fixtureData.companionWorkspaceRoot, "snapshot", "file"), "workspace");
  const first = disposeCompanionWorkspace(lifecycleInput(fixtureData));
  assert.equal(first.status, "disposed");
  assert.deepEqual(fs.readdirSync(fixtureData.companionWorkspaceRoot), []);
  assert.equal(fs.existsSync(path.join(fixtureData.sourceRoot, "keep-source")), true);
  assert.equal(fs.existsSync(path.join(fixtureData.targetRoot, "keep-target")), true);
  const second = disposeCompanionWorkspace(lifecycleInput(fixtureData));
  assert.equal(second.status, "already-disposed");
});

test("partial staging recovery removes staging and preserves published snapshots", () => {
  const fixtureData = fixture();
  fs.mkdirSync(path.join(fixtureData.companionWorkspaceRoot, "published"));
  fs.mkdirSync(path.join(fixtureData.companionWorkspaceRoot, "published.staging-failed"));
  fs.writeFileSync(path.join(fixtureData.companionWorkspaceRoot, "published.staging-failed", "partial"), "partial");
  const recovered = recoverCompanionWorkspace(lifecycleInput(fixtureData));
  assert.equal(recovered.status, "recovered");
  assert.equal(fs.existsSync(path.join(fixtureData.companionWorkspaceRoot, "published")), true);
  assert.equal(fs.existsSync(path.join(fixtureData.companionWorkspaceRoot, "published.staging-failed")), false);
  const again = recoverCompanionWorkspace(lifecycleInput(fixtureData));
  assert.equal(again.status, "already-recovered");
});

test("failed recovery honors dispose-on-failure policy", () => {
  const fixtureData = fixture();
  fixtureData.policy = { ...fixtureData.policy, disposeOnFailure: true };
  fs.mkdirSync(path.join(fixtureData.companionWorkspaceRoot, "published"));
  fs.mkdirSync(path.join(fixtureData.companionWorkspaceRoot, "published.tmp-failed"));
  const receipt = recoverCompanionWorkspace(lifecycleInput(fixtureData, { failed: true }));
  assert.equal(receipt.status, "disposed-after-failure");
  assert.deepEqual(fs.readdirSync(fixtureData.companionWorkspaceRoot), []);
});
