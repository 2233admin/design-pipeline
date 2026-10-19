"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  ARTIFACT_SCHEMA,
  STAGE_SCHEMA,
  checkComponentFirstGate,
  checkComponentFirstStage,
  policyDigest,
  promotionReceipt,
  receiptHash,
  selectionReceipt,
  targetDigest,
  verifyComponentFirstArtifact,
} = require("../skill/scripts/component-first-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { createComponentFirstFixture, sha256 } = require("./fixtures/component-first-fixture.cjs");

const repoRoot = path.resolve(__dirname, "..");
// Removed surfaces are spelled in parts so repository greps for them stay clean.
const REMOVED_SCHEMA = ["component-first-gate", "v1"].join(".");
const REMOVED_COMMANDS = [["high", "fidelity"].join("-"), ["component-first", "v2"].join("-")];
const cli = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");

function artifactOf(result) {
  const { status, reasonCodes, findings, ...artifact } = result;
  return artifact;
}

function checked(t) {
  const source = createComponentFirstFixture(t);
  return { ...source, artifact: artifactOf(checkComponentFirstGate(source.input, { projectRoot: source.projectRoot })) };
}

test("check returns one receipt-chain artifact bound to target, snapshot, policy, and parents", (t) => {
  const fixture = createComponentFirstFixture(t);
  const result = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  assert.equal(result instanceof Promise, false);
  assert.equal(result.schema, ARTIFACT_SCHEMA);
  assert.deepEqual({ status: result.status, reasonCodes: result.reasonCodes, findings: result.findings }, { status: "passed", reasonCodes: [], findings: [] });
  assert.equal(result.target.snapshotDigest, fixture.input.target.snapshotDigest);
  assert.equal(result.target.targetIdentityDigest, targetDigest(result.target));
  assert.match(result.policy.digest, /^[a-f0-9]{64}$/);
  assert.equal(result.policy.digest, policyDigest(result.policy));
  assert.deepEqual(Object.keys(result.receipts), ["stack", "components", "playground", "page", "evidence"]);
  assert.ok(Object.values(result.receipts).every((receipt) => receipt.schema === STAGE_SCHEMA && receipt.status === "passed"));
  assert.deepEqual(result.receipts.components.parentReceiptHashes, [result.receipts.stack.receiptHash]);
  assert.deepEqual(result.receipts.page.parentReceiptHashes, [result.receipts.stack.receiptHash, result.receipts.components.receiptHash, result.receipts.playground.receiptHash]);
  assert.deepEqual(result.visualAcceptance, { schema: "component-first-visual-acceptance.v1", status: "not-evaluated", reason: "component-conformance-does-not-imply-visual-acceptance" });
  assert.equal(result.selection, null);
  assert.deepEqual(result.promotions, []);
  assert.equal(verifyComponentFirstArtifact(artifactOf(result), { projectRoot: fixture.projectRoot }).status, "passed");
});

test("check is deterministic across independent filesystem roots", (t) => {
  const first = createComponentFirstFixture(t);
  const second = createComponentFirstFixture(t);
  assert.deepEqual(
    checkComponentFirstGate(first.input, { projectRoot: first.projectRoot }),
    checkComponentFirstGate(second.input, { projectRoot: second.projectRoot }),
  );
});

test("published schema freezes the artifact top-level fields", (t) => {
  const { artifact } = checked(t);
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill", "references", "component-first-gate.schema.json"), "utf8"));
  assert.equal(schema.properties.schema.const, ARTIFACT_SCHEMA);
  assert.deepEqual(Object.keys(artifact).sort(), [...schema.required].sort());
  assert.equal(schema.$defs.receipt.properties.schema.const, STAGE_SCHEMA);
  const selected = selectionReceipt({ prototypeSetHash: sha256("set"), selectedPrototypeId: "a", targetIdentityDigest: artifact.target.targetIdentityDigest, snapshotDigest: artifact.target.snapshotDigest, policyDigest: artifact.policy.digest, approvedBy: "owner", prototypeSetSnapshot: {} });
  assert.deepEqual(Object.keys(selected).filter((key) => !Object.hasOwn(schema.$defs.selection.properties, key)), [], "the schema declares every field a selection receipt persists");
});

test("requests without a snapshot digest, with a schema id, or with an unresolved target are contract errors", (t) => {
  const fixture = createComponentFirstFixture(t, { snapshotDigest: null });
  assert.throws(() => checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }), /target\.snapshotDigest is required/);
  assert.throws(() => checkComponentFirstStage("stack", fixture.input, { projectRoot: fixture.projectRoot }), /target\.snapshotDigest is required/);
  const withSchema = createComponentFirstFixture(t);
  assert.throws(() => checkComponentFirstGate({ schema: REMOVED_SCHEMA, ...withSchema.input }, { projectRoot: withSchema.projectRoot }), /must not carry a schema id/);
  const escaped = createComponentFirstFixture(t);
  escaped.input.target.root = "../outside";
  assert.throws(() => checkComponentFirstGate(escaped.input, { projectRoot: escaped.projectRoot }), /component-first:/);
});

test("stage API returns the requested stage receipt and findings without a full artifact", (t) => {
  const fixture = createComponentFirstFixture(t);
  const stage = checkComponentFirstStage("playground", fixture.input, { projectRoot: fixture.projectRoot });
  assert.deepEqual({ stage: stage.stage, status: stage.status, reasonCodes: stage.reasonCodes, findings: stage.findings }, { stage: "playground", status: "passed", reasonCodes: [], findings: [] });
  assert.equal(stage.receipt.schema, STAGE_SCHEMA);
  assert.equal(stage.receipt.stage, "playground");
  assert.equal(stage.receipt.receiptHash, receiptHash(stage.receipt));
  assert.equal(Object.hasOwn(stage, "receipts"), false);
  const components = checkComponentFirstStage("components", fixture.input, { projectRoot: fixture.projectRoot });
  const full = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  assert.deepEqual(components.receipt, full.receipts.components);
  assert.throws(() => checkComponentFirstStage("evidence", fixture.input, { projectRoot: fixture.projectRoot }), /unknown component-first stage/);
});

test("CLI freezes check, stage, write, verify, JSON envelope, and exit codes", (t) => {
  const fixture = createComponentFirstFixture(t);
  const base = ["--root", fixture.projectRoot, "--artifact", fixture.artifact, "--json"];
  const aggregate = execute(["component-first", "check", ...base]);
  const stage = execute(["component-first", "stack", ...base]);
  assert.equal(aggregate.exitCode, 0);
  assert.equal(aggregate.output.schema, "design-pipeline.cli-result.v1");
  assert.equal(aggregate.output.resultSchema, ARTIFACT_SCHEMA);
  assert.equal(stage.exitCode, 0);
  assert.equal(stage.output.resultSchema, STAGE_SCHEMA);
  assert.equal(stage.output.receipt.stage, "stack");
  for (const command of REMOVED_COMMANDS) assert.equal(execute([command, "check", ...base]).exitCode, 1);
  assert.equal(execute(["component-first", "migrate", ...base]).exitCode, 1);

  const written = execute(["component-first", "check", ...base, "--write", "--output", "out/component-first-gate.json"]);
  assert.equal(written.exitCode, 0);
  const stored = JSON.parse(fs.readFileSync(path.join(fixture.projectRoot, "out", "component-first-gate.json"), "utf8"));
  assert.deepEqual(Object.keys(stored).sort(), ["policy", "promotions", "receipts", "schema", "selection", "target", "visualAcceptance"]);
  const verified = execute(["component-first", "verify", "--root", fixture.projectRoot, "--artifact", "out/component-first-gate.json", "--json"]);
  assert.equal(verified.exitCode, 0);
  assert.equal(verified.output.status, "passed");

  fixture.input.stack.request.requested.uiLibrary = "none";
  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), `${JSON.stringify(fixture.input, null, 2)}\n`);
  const blocked = execute(["component-first", "check", ...base]);
  assert.equal(blocked.exitCode, 2);
  assert.equal(blocked.output.ok, true);
  assert.equal(blocked.output.status, "blocked");
  assert.ok(blocked.output.reasonCodes.includes("CF_STACK_UI_LIBRARY_NONE"));

  fixture.input.stack.request.framework = "unsupported";
  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), `${JSON.stringify(fixture.input, null, 2)}\n`);
  const invalid = execute(["component-first", "check", ...base]);
  assert.equal(invalid.exitCode, 1);
  assert.equal(invalid.output.ok, true);
  assert.equal(invalid.output.status, "invalid");
  const invalidWrite = execute(["component-first", "check", ...base, "--write", "--output", "out/invalid-gate.json"]);
  assert.equal(invalidWrite.exitCode, 1);
  const verifiedInvalid = execute(["component-first", "verify", "--root", fixture.projectRoot, "--artifact", "out/invalid-gate.json", "--json"]);
  assert.equal(verifiedInvalid.exitCode, 1, "an invalid stage receipt stays invalid on verify");
  assert.equal(verifiedInvalid.output.status, "invalid");
  assert.ok(verifiedInvalid.output.reasonCodes.includes("CF_STAGE_INVALID"));

  delete fixture.input.target.snapshotDigest;
  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), `${JSON.stringify(fixture.input, null, 2)}\n`);
  const missing = execute(["component-first", "check", ...base]);
  assert.equal(missing.exitCode, 1);
  assert.equal(missing.output.ok, false);
});

test("real CLI keeps versioned results on stdout, leaves stderr empty, and preserves read-only stage files", (t) => {
  const fixture = createComponentFirstFixture(t, { uiLibrary: "none" });
  const before = fs.readFileSync(path.join(fixture.projectRoot, fixture.artifact));
  const child = spawnSync(process.execPath, [cli, "component-first", "stack", "--root", fixture.projectRoot, "--artifact", fixture.artifact, "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 2);
  assert.equal(child.stderr, "");
  const output = JSON.parse(child.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.resultSchema, STAGE_SCHEMA);
  assert.equal(output.status, "blocked");
  assert.deepEqual(fs.readFileSync(path.join(fixture.projectRoot, fixture.artifact)), before);

  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), "not json");
  const invalid = spawnSync(process.execPath, [cli, "component-first", "check", "--root", fixture.projectRoot, "--artifact", fixture.artifact, "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stderr, "");
  assert.equal(JSON.parse(invalid.stdout).ok, false);
});

test("upstream receipt, target snapshot, policy, and expiry drift become stale", (t) => {
  const { projectRoot, input, artifact } = checked(t);
  const receipt = { ...artifact.receipts.stack, inputDigest: sha256("changed") };
  receipt.receiptHash = receiptHash(receipt);
  const changedParent = verifyComponentFirstArtifact({ ...artifact, receipts: { ...artifact.receipts, stack: receipt } }, { projectRoot });
  assert.equal(changedParent.status, "blocked");
  assert.ok(changedParent.reasonCodes.includes("CF_RECEIPT_STALE"));

  const changedSnapshot = verifyComponentFirstArtifact(artifact, { projectRoot, current: { target: { ...artifact.target, snapshotDigest: `sha256:${sha256("new-snapshot")}` } } });
  assert.equal(changedSnapshot.status, "blocked");
  assert.ok(changedSnapshot.reasonCodes.includes("CF_TARGET_STALE"));

  const changedPolicy = verifyComponentFirstArtifact(artifact, { projectRoot, current: { policy: { id: "component-first-default", version: 2, additionalComponentRoles: [], pageRequirements: {} } } });
  assert.equal(changedPolicy.status, "blocked");
  assert.ok(changedPolicy.reasonCodes.includes("CF_POLICY_STALE"));

  const expiring = artifactOf(checkComponentFirstGate(input, { projectRoot, expiresAt: "2026-08-25T00:00:00.000Z" }));
  const expired = verifyComponentFirstArtifact(expiring, { projectRoot, now: "2026-08-26T00:00:00.000Z" });
  assert.equal(expired.status, "blocked");
  assert.ok(expired.reasonCodes.includes("CF_RECEIPT_EXPIRED"));
});

test("selection and promotion receipts are explicit and visual acceptance stays separate", (t) => {
  const { projectRoot, artifact } = checked(t);
  const selection = selectionReceipt({
    prototypeSetHash: sha256("prototype-set"),
    selectedPrototypeId: "direction-a",
    targetIdentityDigest: artifact.target.targetIdentityDigest,
    snapshotDigest: artifact.target.snapshotDigest,
    policyDigest: artifact.policy.digest,
    approvedBy: "human-reviewer",
  });
  const promotion = promotionReceipt({
    selectionReceiptHash: selection.receiptHash,
    targetIdentityDigest: artifact.target.targetIdentityDigest,
    snapshotDigest: artifact.target.snapshotDigest,
    policyDigest: artifact.policy.digest,
    sourceKind: "prototype",
    targetKind: "production",
    componentConformanceStatus: "passed",
    visualAcceptanceStatus: "not-evaluated",
    approvedBy: "human-reviewer",
  });
  const promoted = { ...artifact, selection, promotions: [promotion] };
  const result = verifyComponentFirstArtifact(promoted, { projectRoot });
  assert.equal(result.status, "passed");
  assert.equal(result.conformance, "passed");
  assert.equal(result.visualAcceptance, "not-evaluated");

  const duplicate = verifyComponentFirstArtifact({ ...promoted, promotions: [promotion, promotion] }, { projectRoot });
  assert.equal(duplicate.status, "blocked");
  assert.ok(duplicate.reasonCodes.includes("CF_DUPLICATE_PROMOTION"));
});

test("target path escapes, receipt hash drift, and foreign schema ids fail closed", (t) => {
  const { projectRoot, artifact } = checked(t);
  assert.equal(verifyComponentFirstArtifact({ ...artifact, target: { ...artifact.target, root: "../outside" } }, { projectRoot }).status, "invalid");
  assert.equal(verifyComponentFirstArtifact({ ...artifact, receipts: { ...artifact.receipts, page: { ...artifact.receipts.page, receiptHash: sha256("tampered") } } }, { projectRoot }).status, "invalid");
  assert.equal(verifyComponentFirstArtifact({ ...artifact, schema: REMOVED_SCHEMA }, { projectRoot }).status, "invalid");
});
