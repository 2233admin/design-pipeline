"use strict";

const { canonicalJson, isObject, resolveInside, sha256 } = require("./contract-utils.cjs");
const { loadComponentFirstPolicy } = require("./component-first/policies/policy-loader.cjs");
const { aggregateResults } = require("./component-first/orchestration/aggregate-result.cjs");
const { STAGES: STAGE_GATES, runComponentFirst } = require("./component-first/orchestration/component-first-orchestrator.cjs");

const ARTIFACT_SCHEMA = "component-first-gate.v2";
const STAGE_SCHEMA = "component-first-stage-receipt.v2";
const SELECTION_SCHEMA = "component-first-selection-receipt.v1";
const PROMOTION_SCHEMA = "component-first-promotion-receipt.v1";
const VISUAL_SCHEMA = "component-first-visual-acceptance.v1";
const STAGES = Object.freeze(["stack", "components", "playground", "page", "evidence"]);
const PARENTS = Object.freeze({
  stack: [],
  components: ["stack"],
  playground: ["stack"],
  page: ["stack", "components", "playground"],
  evidence: ["page"],
});
const HASH = /^[a-f0-9]{64}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const TARGET_KINDS = new Set(["production", "prototype", "sandbox"]);

function fail(message, details = {}) {
  const error = new Error(`component-first: ${message}`);
  error.code = details.code || "CONTRACT_INVALID";
  error.details = details;
  throw error;
}

function assertObject(value, label) { if (!isObject(value)) fail(`${label} must be an object`); }
function assertHash(value, label) { if (typeof value !== "string" || !HASH.test(value)) fail(`${label} must be a lowercase SHA-256`); }
function assertDigest(value, label) { if (typeof value !== "string" || !DIGEST.test(value)) fail(`${label} must be sha256:<64 lowercase hex>`); }
function assertNonEmpty(value, label) { if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`); }

function targetIdentity(target) {
  assertObject(target, "target");
  for (const key of ["id", "root", "kind"]) assertNonEmpty(target[key], `target.${key}`);
  if (!TARGET_KINDS.has(target.kind)) fail("target.kind is invalid");
  for (const key of ["entrypoints", "routes"]) if (!Array.isArray(target[key]) || target[key].some((value) => typeof value !== "string" || !value.trim())) fail(`target.${key} must be an array of non-empty strings`);
  return { id: target.id, root: target.root.replaceAll("\\", "/"), kind: target.kind, entrypoints: [...target.entrypoints], routes: [...target.routes] };
}

function targetDigest(target) { return sha256(canonicalJson(targetIdentity(target))); }
function policyDigest(policy) {
  assertObject(policy, "policy");
  const { digest: supplied, ...unsigned } = policy;
  const computed = unsigned.id === "component-first-default" && unsigned.version === 1
    ? loadComponentFirstPolicy(unsigned).digest
    : sha256(canonicalJson(unsigned));
  if (supplied !== undefined) {
    assertHash(supplied, "policy.digest");
    if (supplied !== computed) fail("policy.digest does not match policy contents", { code: "POLICY_STALE" });
  }
  return computed;
}

function snapshotDigest(value) {
  assertDigest(value, "target.snapshotDigest");
  return value;
}

function receiptHash(receipt) {
  const { receiptHash: ignored, ...body } = receipt;
  return sha256(canonicalJson(body));
}

function makeStageReceipt(stage, result, target, policy, parentReceiptHashes, expiresAt) {
  const body = {
    schema: STAGE_SCHEMA,
    stage,
    status: result.status,
    targetIdentityDigest: targetDigest(target),
    snapshotDigest: target.snapshotDigest,
    policyDigest: policyDigest(policy),
    inputDigest: result.inputDigest,
    parentReceiptHashes,
    evidenceRefs: Array.isArray(result.evidenceRefs) ? result.evidenceRefs : [],
  };
  if (expiresAt) body.expiresAt = expiresAt;
  return { ...body, receiptHash: receiptHash(body) };
}

function buildReceipts(target, policy, byStage, expiresAt) {
  const receipts = {};
  for (const stage of STAGES) {
    if (!byStage.has(stage)) continue;
    receipts[stage] = makeStageReceipt(stage, byStage.get(stage), target, policy, PARENTS[stage].map((parent) => receipts[parent]?.receiptHash || null), expiresAt);
  }
  return receipts;
}

function normalizePolicy(policy) {
  assertObject(policy, "policy");
  const { digest: ignored, ...unsigned } = policy;
  policyDigest(unsigned);
  return unsigned;
}

function createComponentFirstArtifact(source, options = {}) {
  assertObject(source, "artifact source");
  const { target } = source;
  targetIdentity(target);
  snapshotDigest(target.snapshotDigest);
  const policy = normalizePolicy(source.policy);
  const byStage = new Map((source.stages || []).map((stage) => [stage.stage, stage]));
  for (const stage of STAGES) if (!byStage.has(stage)) fail(`stages.${stage} is missing`);
  return {
    schema: ARTIFACT_SCHEMA,
    target: { ...target, targetIdentityDigest: targetDigest(target) },
    policy: { ...policy, digest: policyDigest(policy) },
    receipts: buildReceipts(target, policy, byStage, options.expiresAt),
    visualAcceptance: { schema: VISUAL_SCHEMA, status: "not-evaluated", reason: "component-conformance-does-not-imply-visual-acceptance" },
    selection: null,
    promotions: [],
  };
}

function validateStageReceipt(stage, receipt, artifact, options = {}) {
  assertObject(receipt, `receipts.${stage}`);
  if (receipt.schema !== STAGE_SCHEMA || receipt.stage !== stage) fail(`receipts.${stage} schema or stage is invalid`);
  if (!["passed", "blocked", "invalid", "not_evaluated", "not_applicable", "stale"].includes(receipt.status)) fail(`receipts.${stage}.status is invalid`);
  assertHash(receipt.targetIdentityDigest, `receipts.${stage}.targetIdentityDigest`);
  assertDigest(receipt.snapshotDigest, `receipts.${stage}.snapshotDigest`);
  assertHash(receipt.policyDigest, `receipts.${stage}.policyDigest`);
  assertHash(receipt.inputDigest, `receipts.${stage}.inputDigest`);
  if (receipt.expiresAt !== undefined && (typeof receipt.expiresAt !== "string" || Number.isNaN(Date.parse(receipt.expiresAt)))) fail(`receipts.${stage}.expiresAt is invalid`);
  if (!Array.isArray(receipt.parentReceiptHashes) || receipt.parentReceiptHashes.some((value) => value !== null && !HASH.test(value))) fail(`receipts.${stage}.parentReceiptHashes is invalid`);
  if (receipt.receiptHash !== receiptHash(receipt)) fail(`receipts.${stage} hash mismatch`, { code: "HASH_DRIFT" });
  if (receipt.targetIdentityDigest !== artifact.target.targetIdentityDigest || receipt.snapshotDigest !== artifact.target.snapshotDigest || receipt.policyDigest !== artifact.policy.digest) return "stale";
  const expectedParents = PARENTS[stage].map((parent) => artifact.receipts[parent]?.receiptHash || null);
  if (JSON.stringify(receipt.parentReceiptHashes) !== JSON.stringify(expectedParents)) return "stale";
  if (receipt.expiresAt && Date.parse(receipt.expiresAt) <= Date.parse(options.now || new Date().toISOString())) return "expired";
  return receipt.status;
}

function selectionReceipt(input) {
  assertObject(input, "selection");
  if (input.schema !== undefined && input.schema !== SELECTION_SCHEMA) fail("selection.schema is invalid");
  if (input.status !== undefined && input.status !== "selected") fail("selection.status is invalid");
  for (const key of ["prototypeSetHash", "selectedPrototypeId", "targetIdentityDigest", "snapshotDigest", "policyDigest", "approvedBy"]) assertNonEmpty(input[key], `selection.${key}`);
  assertHash(input.prototypeSetHash, "selection.prototypeSetHash");
  assertHash(input.targetIdentityDigest, "selection.targetIdentityDigest");
  assertDigest(input.snapshotDigest, "selection.snapshotDigest");
  assertHash(input.policyDigest, "selection.policyDigest");
  if (input.prototypeSetSnapshot !== undefined) assertObject(input.prototypeSetSnapshot, "selection.prototypeSetSnapshot");
  const body = {
    schema: SELECTION_SCHEMA,
    status: "selected",
    prototypeSetHash: input.prototypeSetHash,
    selectedPrototypeId: input.selectedPrototypeId,
    targetIdentityDigest: input.targetIdentityDigest,
    snapshotDigest: input.snapshotDigest,
    policyDigest: input.policyDigest,
    approvedBy: input.approvedBy,
    ...(input.prototypeSetSnapshot !== undefined ? { prototypeSetSnapshot: input.prototypeSetSnapshot } : {}),
  };
  return { ...body, receiptHash: receiptHash(body) };
}

function promotionReceipt(input) {
  assertObject(input, "promotion");
  if (input.schema !== undefined && input.schema !== PROMOTION_SCHEMA) fail("promotion.schema is invalid");
  if (input.status !== undefined && input.status !== "approved") fail("promotion.status is invalid");
  for (const key of ["selectionReceiptHash", "targetIdentityDigest", "snapshotDigest", "policyDigest", "approvedBy"]) assertNonEmpty(input[key], `promotion.${key}`);
  assertHash(input.selectionReceiptHash, "promotion.selectionReceiptHash");
  assertHash(input.targetIdentityDigest, "promotion.targetIdentityDigest");
  assertDigest(input.snapshotDigest, "promotion.snapshotDigest");
  assertHash(input.policyDigest, "promotion.policyDigest");
  if (input.sourceKind !== "prototype" || input.targetKind !== "production") fail("promotion must move prototype to production");
  if (input.componentConformanceStatus !== "passed") fail("promotion requires passed component conformance", { code: "CONFORMANCE_REQUIRED" });
  if (!input.visualAcceptanceStatus || !["passed", "waived", "not-evaluated"].includes(input.visualAcceptanceStatus)) fail("promotion must record visual acceptance separately");
  const body = { schema: PROMOTION_SCHEMA, status: "approved", selectionReceiptHash: input.selectionReceiptHash, targetIdentityDigest: input.targetIdentityDigest, snapshotDigest: input.snapshotDigest, policyDigest: input.policyDigest, sourceKind: input.sourceKind, targetKind: input.targetKind, componentConformanceStatus: input.componentConformanceStatus, visualAcceptanceStatus: input.visualAcceptanceStatus, approvedBy: input.approvedBy };
  return { ...body, receiptHash: receiptHash(body) };
}

function verifyComponentFirstArtifact(input, options = {}) {
  const findings = [];
  try {
    assertObject(input, "artifact");
    if (input.schema !== ARTIFACT_SCHEMA) fail(`artifact.schema must be ${ARTIFACT_SCHEMA}`);
    targetIdentity(input.target);
    if (options.projectRoot) resolveInside(options.projectRoot, input.target.root, "target.root", { scope: "component-first", mustExist: true });
    assertDigest(input.target.snapshotDigest, "target.snapshotDigest");
    if (input.target.targetIdentityDigest !== targetDigest(input.target)) fail("target identity digest mismatch", { code: "TARGET_DRIFT" });
    policyDigest(input.policy);
    assertHash(input.policy.digest, "policy.digest");
    if (!isObject(input.visualAcceptance) || input.visualAcceptance.schema !== VISUAL_SCHEMA || !["passed", "waived", "not-evaluated"].includes(input.visualAcceptance.status)) fail("visualAcceptance is invalid");
    if (!input.receipts || !isObject(input.receipts)) fail("artifact.receipts must be an object");
    const statuses = {};
    for (const stage of STAGES) statuses[stage] = validateStageReceipt(stage, input.receipts[stage], input, options);
    const current = options.current || {};
    if (current.target) {
      if (targetDigest(current.target) !== input.target.targetIdentityDigest || current.target.snapshotDigest !== input.target.snapshotDigest) findings.push({ code: "CF_TARGET_STALE", message: "target snapshot or identity changed" });
    }
    if (current.policy && policyDigest(current.policy) !== input.policy.digest) findings.push({ code: "CF_POLICY_STALE", message: "policy digest changed" });
    for (const [stage, status] of Object.entries(statuses)) {
      if (status === "stale") findings.push({ code: "CF_RECEIPT_STALE", message: `${stage} receipt is stale`, stage });
      if (status === "expired") findings.push({ code: "CF_RECEIPT_EXPIRED", message: `${stage} receipt is expired`, stage });
    }
    if (input.selection !== null) {
      const selected = selectionReceipt(input.selection);
      if (selected.receiptHash !== input.selection.receiptHash) findings.push({ code: "CF_SELECTION_HASH_DRIFT", message: "selection receipt hash mismatch" });
      if (selected.targetIdentityDigest !== input.target.targetIdentityDigest || selected.snapshotDigest !== input.target.snapshotDigest || selected.policyDigest !== input.policy.digest) findings.push({ code: "CF_SELECTION_STALE", message: "selection receipt is stale for this artifact" });
    }
    const seenPromotions = new Set();
    for (const promotion of input.promotions || []) {
      const checked = promotionReceipt(promotion);
      if (checked.receiptHash !== promotion.receiptHash) findings.push({ code: "CF_PROMOTION_HASH_DRIFT", message: "promotion receipt hash mismatch" });
      if (promotion.targetIdentityDigest !== input.target.targetIdentityDigest || promotion.snapshotDigest !== input.target.snapshotDigest || promotion.policyDigest !== input.policy.digest) findings.push({ code: "CF_PROMOTION_STALE", message: "promotion receipt is stale for this artifact" });
      if (seenPromotions.has(promotion.selectionReceiptHash)) findings.push({ code: "CF_DUPLICATE_PROMOTION", message: "selection receipt was promoted more than once" });
      seenPromotions.add(promotion.selectionReceiptHash);
      if (!input.selection || input.selection.receiptHash !== promotion.selectionReceiptHash) findings.push({ code: "CF_SELECTION_MISSING", message: "promotion does not reference the selected prototype" });
    }
    for (const [stage, value] of Object.entries(statuses)) if (value === "invalid") findings.push({ code: "CF_STAGE_INVALID", message: `${stage} receipt records an invalid input; rerun component-first check for its findings`, stage });
    const status = Object.values(statuses).includes("invalid") ? "invalid" : findings.length ? "blocked" : Object.values(statuses).some((value) => ["blocked", "not_evaluated", "not_applicable", "expired"].includes(value)) ? "blocked" : "passed";
    return { schema: ARTIFACT_SCHEMA, status, reasonCodes: [...new Set(findings.map((item) => item.code))], findings, receipts: statuses, conformance: status, visualAcceptance: input.visualAcceptance?.status || "not-evaluated", promotion: input.promotions?.at(-1)?.status || null };
  } catch (error) {
    return { schema: ARTIFACT_SCHEMA, status: "invalid", reasonCodes: [error.code || "CONTRACT_INVALID"], findings: [{ code: error.code || "CONTRACT_INVALID", message: error.message, details: error.details || {} }] };
  }
}

function evaluateRequest(input, options) {
  const outcome = runComponentFirst(input, options);
  if (outcome.failure) fail(outcome.failure.message, { code: outcome.failure.code });
  const { target } = outcome.context;
  if (typeof target.snapshotDigest !== "string") fail("request target.snapshotDigest is required (sha256:<64 lowercase hex>)");
  snapshotDigest(target.snapshotDigest);
  const policy = { id: outcome.policy.policyId, version: outcome.policy.version, additionalComponentRoles: outcome.policy.additionalComponentRoles, pageRequirements: outcome.policy.pageRequirements };
  const evaluated = outcome.dependencyResults || outcome.results;
  const stages = evaluated.map((result) => ({ ...result, stage: STAGES.find((name) => STAGE_GATES[name].gateId === result.gateId) }));
  return { aggregate: aggregateResults(evaluated), target, policy, stages };
}

function summary({ status, reasonCodes, findings }) {
  return { status, reasonCodes, findings };
}

function checkComponentFirstGate(input, options = {}) {
  const { aggregate, target, policy, stages } = evaluateRequest(input, { ...options, stage: undefined });
  return { ...createComponentFirstArtifact({ target, policy, stages }, options), ...summary(aggregate) };
}

function checkComponentFirstStage(stage, input, options = {}) {
  const { aggregate, target, policy, stages } = evaluateRequest(input, { ...options, stage });
  const receipts = buildReceipts(target, normalizePolicy(policy), new Map(stages.map((entry) => [entry.stage, entry])), options.expiresAt);
  return { stage, ...summary(aggregate), receipt: receipts[stage] };
}

module.exports = {
  ARTIFACT_SCHEMA, STAGE_SCHEMA, SELECTION_SCHEMA, PROMOTION_SCHEMA, VISUAL_SCHEMA, STAGES,
  targetDigest, policyDigest, receiptHash,
  createComponentFirstArtifact, checkComponentFirstGate, checkComponentFirstStage, verifyComponentFirstArtifact,
  selectionReceipt, promotionReceipt,
};
