"use strict";

const {
  assertEnum,
  assertKeys,
  assertString,
  assertStringArray,
  fail,
  nonEmpty,
} = require("./contract-utils.cjs");
const { validateDeployProfile } = require("./deploy-profile-core.cjs");

const SOURCE_ADMISSION_SCHEMA = "design-pipeline.source-admission.v1";
const SOURCE_KINDS = ["vcs", "url", "archive", "registry", "local"];
const NON_VCS_SOURCE_KINDS = SOURCE_KINDS.filter((kind) => kind !== "vcs");
const ADMISSION_STATUSES = ["reference-only", "admitted", "blocked", "review-required"];
const EVIDENCE_STATUSES = ["verified", "unverified", "blocked"];
const LICENSE_STATUSES = EVIDENCE_STATUSES;
const PROMOTION_STATUSES = ["governed"];

function invalid(message, details = {}) {
  fail("source admission", message, details);
}

function validateSource(source) {
  assertKeys(source, ["kind", "identity", "revision", "contentHash"], ["kind", "identity", "revision", "contentHash", "commit"], "source", "source admission");
  assertEnum(source.kind, SOURCE_KINDS, "source.kind", "source admission");
  assertString(source.identity, "source.identity", "source admission");
  assertString(source.revision, "source.revision", "source admission");
  if (!/^[a-f0-9]{64}$/.test(source.contentHash || "")) invalid("source.contentHash must be a SHA-256 digest");
  if (source.kind === "vcs") {
    if (!/^[a-f0-9]{40,64}$/.test(source.commit || "")) invalid("VCS source requires a bound commit SHA");
    if (source.revision !== source.commit) invalid("VCS source revision must equal the bound commit SHA");
  } else if (source.commit !== undefined) {
    invalid("non-VCS sources must not carry a Git commit");
  }
  return source;
}

function validateEvidence(value, label) {
  assertKeys(value, ["status", "evidence"], ["status", "evidence"], label, "source admission");
  assertEnum(value.status, EVIDENCE_STATUSES, `${label}.status`, "source admission");
  assertStringArray(value.evidence, `${label}.evidence`, "source admission", { unique: true, min: 1 });
  return value;
}

function validateLicense(license) {
  return validateEvidence(license, "license");
}

function validateProvenance(provenance) {
  assertKeys(provenance, ["status", "evidence"], ["status", "evidence", "observedAt", "provider"], "provenance", "source admission");
  validateEvidence(provenance, "provenance");
  if (provenance.observedAt !== undefined) {
    assertString(provenance.observedAt, "provenance.observedAt", "source admission");
    if (!Number.isFinite(Date.parse(provenance.observedAt))) invalid("provenance.observedAt must be a date-time");
  }
  if (provenance.provider !== undefined) assertString(provenance.provider, "provenance.provider", "source admission");
  return provenance;
}

function validatePromotion(promotion) {
  assertKeys(promotion, ["status", "deployProfileId", "executionTargetId", "sourceContentHash"], ["status", "deployProfileId", "executionTargetId", "sourceContentHash", "evidence"], "promotion", "source admission");
  assertEnum(promotion.status, PROMOTION_STATUSES, "promotion.status", "source admission");
  assertString(promotion.deployProfileId, "promotion.deployProfileId", "source admission");
  assertString(promotion.executionTargetId, "promotion.executionTargetId", "source admission");
  if (!/^[a-f0-9]{64}$/.test(promotion.sourceContentHash || "")) invalid("promotion.sourceContentHash must be a SHA-256 digest");
  if (promotion.evidence !== undefined) assertStringArray(promotion.evidence, "promotion.evidence", "source admission", { unique: true, min: 1 });
  return promotion;
}

function validateSourceAdmission(receipt, options = {}) {
  const allowed = ["schema", "id", "receiptId", "source", "provenance", "license", "status", "admission", "promotion", "routeId", "toolchainPlanSha256", "reason"];
  assertKeys(receipt, ["schema", "id", "receiptId", "source", "provenance", "license", "status", "admission"], allowed, "source admission receipt", "source admission");
  if (receipt.schema !== SOURCE_ADMISSION_SCHEMA) invalid("unsupported source admission schema");
  assertString(receipt.id, "id", "source admission");
  assertString(receipt.receiptId, "receiptId", "source admission");
  validateSource(receipt.source);
  validateProvenance(receipt.provenance);
  validateLicense(receipt.license);
  assertEnum(receipt.status, ADMISSION_STATUSES, "status", "source admission");
  assertEnum(receipt.admission, ADMISSION_STATUSES, "admission", "source admission");
  if (receipt.status !== receipt.admission) invalid("status and admission must agree");
  if (receipt.reason !== undefined) assertString(receipt.reason, "reason", "source admission");
  if (receipt.promotion !== undefined) validatePromotion(receipt.promotion);
  const hasRouteBinding = receipt.routeId !== undefined || receipt.toolchainPlanSha256 !== undefined;
  if (hasRouteBinding || receipt.status === "admitted") {
    assertString(receipt.routeId, "routeId", "source admission");
    if (!/^[a-f0-9]{64}$/.test(receipt.toolchainPlanSha256 || "")) invalid("toolchainPlanSha256 must be SHA-256");
  }
  if (receipt.status === "admitted") {
    if (receipt.license.status !== "verified") invalid("admitted source requires verified license status");
    if (receipt.provenance.status !== "verified") invalid("admitted source requires verified provenance status");
    if (!receipt.promotion) invalid("admitted source requires an explicit governed promotion");
    if (receipt.promotion.sourceContentHash !== receipt.source.contentHash) invalid("promotion.sourceContentHash does not match source.contentHash");
    if (!options.executionTarget) invalid("admitted source requires a validated execution target");
    if (receipt.promotion.executionTargetId !== options.executionTarget.id) invalid("promotion.executionTargetId does not match the execution target");
    if (options.executionReceipt && options.executionReceipt.id !== options.executionTarget.id) invalid("executionReceipt does not match the execution target");
    if (options.executionReceipt && options.executionReceipt.routeId !== receipt.routeId) invalid("execution routeId does not match source admission");
    if (options.executionReceipt && options.executionReceipt.toolchainPlanSha256 !== receipt.toolchainPlanSha256) invalid("execution toolchainPlanSha256 does not match source admission");
    if (!options.deployProfile) invalid("admitted source requires a validated deploy profile");
    const profile = validateDeployProfile(options.deployProfile, {
      executionReceipt: options.executionReceipt || options.executionTarget,
      sourceAdmissionReceiptId: receipt.receiptId,
      sourceContentHash: receipt.source.contentHash,
      routeId: receipt.routeId,
      toolchainPlanSha256: receipt.toolchainPlanSha256,
      executionPlan: options.executionPlan,
      expectedStatus: "ready",
    });
    if (profile.id !== receipt.promotion.deployProfileId) invalid("promotion.deployProfileId does not match the deploy profile");
    if (profile.executionTarget.id !== receipt.promotion.executionTargetId) invalid("promotion.executionTargetId does not match the deploy profile");
    if (profile.routeId !== receipt.routeId || profile.toolchainPlanSha256 !== receipt.toolchainPlanSha256) invalid("deploy profile route/toolchain binding does not match source admission");
  }
  if (options.expectedSource) {
    const expected = validateSource(options.expectedSource);
    for (const key of ["kind", "identity", "revision", "contentHash"]) {
      if (receipt.source[key] !== expected[key]) invalid(`source.${key} does not match expected source`);
    }
  }
  return receipt;
}

function createSourceAdmission(input) {
  const receipt = {
    schema: SOURCE_ADMISSION_SCHEMA,
    id: input.id,
    receiptId: input.receiptId || input.id,
    source: { ...input.source },
    provenance: { ...input.provenance },
    license: { ...input.license },
    status: input.status || input.admission || "reference-only",
    admission: input.admission || input.status || "reference-only",
    ...(input.promotion ? { promotion: { ...input.promotion } } : {}),
    ...(input.routeId ? { routeId: input.routeId } : {}),
    ...(input.toolchainPlanSha256 ? { toolchainPlanSha256: input.toolchainPlanSha256 } : {}),
    ...(nonEmpty(input.reason) ? { reason: input.reason } : {}),
  };
  return validateSourceAdmission(receipt, input.validation || {});
}

module.exports = {
  ADMISSION_STATUSES,
  EVIDENCE_STATUSES,
  LICENSE_STATUSES,
  NON_VCS_SOURCE_KINDS,
  PROMOTION_STATUSES,
  SOURCE_ADMISSION_SCHEMA,
  SOURCE_KINDS,
  createSourceAdmission,
  validatePromotion,
  validateSourceAdmission,
  validateProvenance,
};
