"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { checkComponentFirstGate } = require("../skill/scripts/component-first-core.cjs");
const {
  checkV2Artifact,
  migrateV1ToV2,
  policyDigest,
  promotionReceipt,
  receiptHash,
  selectionReceipt,
  targetDigest,
} = require("../skill/scripts/component-first-v2-core.cjs");
const { createComponentFirstFixture, sha256 } = require("./fixtures/component-first-fixture.cjs");

function fixture(t) {
  const source = createComponentFirstFixture(t);
  const v1 = checkComponentFirstGate(source.input, { projectRoot: source.projectRoot });
  const snapshotDigest = `sha256:${sha256("component-first-v2-snapshot")}`;
  return { ...source, v1, v2: migrateV1ToV2(v1, { snapshotDigest }) };
}

test("v2 migration binds target, snapshot, policy, and every parent receipt", (t) => {
  const { projectRoot, v1, v2 } = fixture(t);
  assert.equal(v2.schema, "component-first-gate.v2");
  assert.equal(v2.target.targetIdentityDigest, targetDigest(v2.target));
  assert.equal(v2.policy.digest, policyDigest(v1.policy));
  assert.deepEqual(v2.receipts.components.parentReceiptHashes, [v2.receipts.stack.receiptHash]);
  assert.deepEqual(v2.receipts.page.parentReceiptHashes, [v2.receipts.stack.receiptHash, v2.receipts.components.receiptHash, v2.receipts.playground.receiptHash]);
  assert.equal(checkV2Artifact(v2, { projectRoot }).status, "passed");
  assert.equal(v2.migration.from, "component-first-gate.v1");
});

test("upstream receipt, target snapshot, and policy drift become stale", (t) => {
  const { projectRoot, v1, v2 } = fixture(t);
  const receipt = { ...v2.receipts.stack, inputDigest: sha256("changed") };
  receipt.receiptHash = receiptHash(receipt);
  const tampered = { ...v2, receipts: { ...v2.receipts, stack: receipt } };
  const changedParent = checkV2Artifact(tampered, { projectRoot });
  assert.equal(changedParent.status, "blocked");
  assert.ok(changedParent.reasonCodes.includes("CF_V2_RECEIPT_STALE"));

  const changedSnapshot = checkV2Artifact(v2, { projectRoot, current: { target: { ...v2.target, snapshotDigest: `sha256:${sha256("new-snapshot")}` } } });
  assert.equal(changedSnapshot.status, "blocked");
  assert.ok(changedSnapshot.reasonCodes.includes("CF_V2_TARGET_STALE"));

  const changedPolicy = checkV2Artifact(v2, { projectRoot, current: { policy: { id: "component-first-default", version: 2, additionalComponentRoles: [], pageRequirements: {} } } });
  assert.equal(changedPolicy.status, "blocked");
  assert.ok(changedPolicy.reasonCodes.includes("CF_V2_POLICY_STALE"));

  const expired = migrateV1ToV2(v1, { snapshotDigest: v2.target.snapshotDigest, expiresAt: "2026-08-25T00:00:00.000Z" });
  const expiredResult = checkV2Artifact(expired, { projectRoot, now: "2026-08-26T00:00:00.000Z" });
  assert.equal(expiredResult.status, "blocked");
  assert.ok(expiredResult.reasonCodes.includes("CF_V2_RECEIPT_EXPIRED"));
});

test("selection and promotion receipts are explicit and visual acceptance stays separate", (t) => {
  const { projectRoot, v2 } = fixture(t);
  const selection = selectionReceipt({
    prototypeSetHash: sha256("prototype-set"),
    selectedPrototypeId: "direction-a",
    targetIdentityDigest: v2.target.targetIdentityDigest,
    snapshotDigest: v2.target.snapshotDigest,
    policyDigest: v2.policy.digest,
    approvedBy: "human-reviewer",
  });
  const promotion = promotionReceipt({
    selectionReceiptHash: selection.receiptHash,
    targetIdentityDigest: v2.target.targetIdentityDigest,
    snapshotDigest: v2.target.snapshotDigest,
    policyDigest: v2.policy.digest,
    sourceKind: "prototype",
    targetKind: "production",
    componentConformanceStatus: "passed",
    visualAcceptanceStatus: "not-evaluated",
    approvedBy: "human-reviewer",
  });
  const promoted = { ...v2, selection, promotions: [promotion] };
  const result = checkV2Artifact(promoted, { projectRoot });
  assert.equal(result.status, "passed");
  assert.equal(result.conformance, "passed");
  assert.equal(result.visualAcceptance, "not-evaluated");

  const duplicate = checkV2Artifact({ ...promoted, promotions: [promotion, promotion] }, { projectRoot });
  assert.equal(duplicate.status, "blocked");
  assert.ok(duplicate.reasonCodes.includes("CF_V2_DUPLICATE_PROMOTION"));
});

test("target path escapes and receipt hash drift fail closed", (t) => {
  const { projectRoot, v2 } = fixture(t);
  const escaped = { ...v2, target: { ...v2.target, root: "../outside" } };
  assert.equal(checkV2Artifact(escaped, { projectRoot }).status, "invalid");
  assert.equal(checkV2Artifact({ ...v2, receipts: { ...v2.receipts, page: { ...v2.receipts.page, receiptHash: sha256("tampered") } } }, { projectRoot }).status, "invalid");
});
