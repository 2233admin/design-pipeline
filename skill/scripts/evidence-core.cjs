"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  fail,
  pathInside,
} = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.evidence-receipt.v1";
const ARTIFACT_KEYS = ["screenshot", "trace", "dom", "console", "network", "accessibility", "performance"];

function validateReceipt(receipt, options = {}) {
  const rootKeys = ["schema", "id", "status", "adapter", "target", "capturedAt", "artifacts", "hashes", "redaction"];
  const linkageKeys = ["executionReceiptId", "executionPlanSha256", "compositionReceiptId", "compositionReceiptHash", "sourceAdmissionReceiptId", "sourceContentHash", "routeId", "toolchainPlanSha256"];
  assertKeys(receipt, rootKeys, [...rootKeys, ...linkageKeys], "receipt", "evidence");
  if (receipt.schema !== SCHEMA) fail("evidence", `schema must be ${SCHEMA}`);
  assertString(receipt.id, "id", "evidence");
  assertEnum(receipt.status, ["complete", "partial", "blocked", "unknown"], "status", "evidence");
  assertKeys(receipt.adapter, ["id", "version", "availability", "probe"], ["id", "version", "availability", "probe"], "adapter", "evidence");
  assertString(receipt.adapter.id, "adapter.id", "evidence");
  assertString(receipt.adapter.version, "adapter.version", "evidence");
  assertEnum(receipt.adapter.availability, ["available", "unavailable", "blocked", "unknown"], "adapter.availability", "evidence");
  assertKeys(receipt.adapter.probe, ["ok", "message"], ["ok", "message"], "adapter.probe", "evidence");
  if (typeof receipt.adapter.probe.ok !== "boolean") fail("evidence", "adapter.probe.ok must be boolean");
  assertString(receipt.adapter.probe.message, "adapter.probe.message", "evidence");
  if (receipt.executionReceiptId !== undefined || receipt.executionPlanSha256 !== undefined) {
    assertString(receipt.executionReceiptId, "executionReceiptId", "evidence");
    if (!/^[a-f0-9]{64}$/.test(receipt.executionPlanSha256 || "")) fail("evidence", "executionPlanSha256 must be SHA-256");
  }
  if (receipt.compositionReceiptId !== undefined || receipt.compositionReceiptHash !== undefined) {
    assertString(receipt.compositionReceiptId, "compositionReceiptId", "evidence");
    if (!/^sha256:[a-f0-9]{64}$/.test(receipt.compositionReceiptHash || "")) fail("evidence", "compositionReceiptHash must be a sha256:<digest> value");
  }
  if (receipt.sourceAdmissionReceiptId !== undefined || receipt.sourceContentHash !== undefined) {
    assertString(receipt.sourceAdmissionReceiptId, "sourceAdmissionReceiptId", "evidence");
    if (!/^[a-f0-9]{64}$/.test(receipt.sourceContentHash || "")) fail("evidence", "sourceContentHash must be SHA-256");
  }
  if (receipt.routeId !== undefined || receipt.toolchainPlanSha256 !== undefined) {
    assertString(receipt.routeId, "routeId", "evidence");
    if (!/^[a-f0-9]{64}$/.test(receipt.toolchainPlanSha256 || "")) fail("evidence", "toolchainPlanSha256 must be SHA-256");
  }
  if (options.expectedRouteId && receipt.routeId !== options.expectedRouteId) fail("evidence", "routeId does not match the execution target");
  if (options.expectedToolchainPlanSha256 && receipt.toolchainPlanSha256 !== options.expectedToolchainPlanSha256) fail("evidence", "toolchainPlanSha256 does not match the execution target");
  if (options.expectedExecutionPlanSha256 && receipt.executionPlanSha256 !== options.expectedExecutionPlanSha256) fail("evidence", "executionPlanSha256 does not match the execution target");
  if (options.expectedCompositionReceiptId && receipt.compositionReceiptId !== options.expectedCompositionReceiptId) fail("evidence", "compositionReceiptId does not match the composition");
  if (options.expectedCompositionReceiptHash && receipt.compositionReceiptHash !== options.expectedCompositionReceiptHash) fail("evidence", "compositionReceiptHash does not match the composition");
  if (options.expectedSourceAdmissionReceiptId && receipt.sourceAdmissionReceiptId !== options.expectedSourceAdmissionReceiptId) fail("evidence", "sourceAdmissionReceiptId does not match the admitted source");
  if (options.expectedSourceContentHash && receipt.sourceContentHash !== options.expectedSourceContentHash) fail("evidence", "sourceContentHash does not match the admitted source");
  if (options.expectedExecutionPlanSha256 && receipt.executionPlanSha256 !== options.expectedExecutionPlanSha256) fail("evidence", "executionPlanSha256 does not match the execution target");
  assertKeys(receipt.target, ["url", "viewport"], ["url", "viewport"], "target", "evidence");
  let url;
  try { url = new URL(receipt.target.url); } catch { fail("evidence", "target.url must be a URL"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) fail("evidence", "target.url must be credential-free HTTP(S)");
  assertKeys(receipt.target.viewport, ["width", "height"], ["width", "height"], "target.viewport", "evidence");
  for (const key of ["width", "height"]) if (!Number.isInteger(receipt.target.viewport[key]) || receipt.target.viewport[key] < 1) fail("evidence", `target.viewport.${key} must be positive integer`);
  if (receipt.capturedAt !== null && (!receipt.capturedAt || !Number.isFinite(Date.parse(receipt.capturedAt)))) fail("evidence", "capturedAt must be null or date-time");
  assertKeys(receipt.artifacts, ARTIFACT_KEYS, ARTIFACT_KEYS, "artifacts", "evidence");
  assertObject(receipt.hashes, "hashes", "evidence");
  const presentKeys = ARTIFACT_KEYS.filter((key) => receipt.artifacts[key] !== null);
  assertKeys(receipt.hashes, presentKeys, presentKeys, "hashes", "evidence");
  const evidenceRoot = options.evidenceRoot ? fs.realpathSync(path.resolve(options.evidenceRoot)) : null;
  for (const key of ARTIFACT_KEYS) {
    const artifact = receipt.artifacts[key];
    if (artifact === null) continue;
    assertString(artifact, `artifacts.${key}`, "evidence");
    if (path.isAbsolute(artifact)) fail("evidence", `artifacts.${key} must be relative`);
    if (evidenceRoot) {
      const target = path.resolve(evidenceRoot, artifact);
      if (!pathInside(evidenceRoot, target)) fail("evidence", `artifacts.${key} escapes evidence root`);
      if (options.requireFiles && !fs.existsSync(target)) fail("evidence", `artifacts.${key} is missing`);
      if (options.requireFiles) {
        const realTarget = fs.realpathSync(target);
        if (!pathInside(evidenceRoot, realTarget) || fs.lstatSync(target).isSymbolicLink()) fail("evidence", `artifacts.${key} resolves outside evidence root or is a link`);
        if (!fs.statSync(realTarget).isFile()) fail("evidence", `artifacts.${key} must be a file`);
        const actualHash = crypto.createHash("sha256").update(fs.readFileSync(realTarget)).digest("hex");
        if (actualHash !== receipt.hashes[key].toLowerCase()) fail("evidence", `hashes.${key} does not match the artifact`);
      }
    }
    if (!/^[a-f0-9]{64}$/i.test(receipt.hashes[key] || "")) fail("evidence", `hashes.${key} must be SHA-256`);
  }
  assertKeys(receipt.redaction, ["status", "notes"], ["status", "notes"], "redaction", "evidence");
  assertEnum(receipt.redaction.status, ["not-required", "applied", "blocked"], "redaction.status", "evidence");
  if (!Array.isArray(receipt.redaction.notes) || !receipt.redaction.notes.every((item) => typeof item === "string")) fail("evidence", "redaction.notes must be strings");
  const missing = ARTIFACT_KEYS.filter((key) => receipt.artifacts[key] === null);
  if (receipt.status === "complete" && (missing.length || receipt.adapter.availability !== "available" || receipt.adapter.probe.ok !== true || receipt.redaction.status === "blocked")) {
    fail("evidence", `complete receipt is missing measurements or readiness: ${missing.join(", ")}`);
  }
  return receipt;
}

module.exports = { ARTIFACT_KEYS, SCHEMA, validateReceipt };
