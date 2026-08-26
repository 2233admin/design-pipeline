"use strict";

const { canonicalJson, isObject, nonEmpty, sha256 } = require("./contract-utils.cjs");
const { promotionReceipt, selectionReceipt, checkV2Artifact } = require("./component-first-v2-core.cjs");

const MANIFEST_SCHEMA = "design-pipeline.design-skill-manifest.v1";
const PROTOTYPE_SCHEMA = "prototype-set.v1";
const HANDOFF_SCHEMA = "design-promotion-handoff.v1";
const EFFECTS = new Set(["reference-only", "repository-read", "artifact-write", "plan-write", "sandbox-write", "target-write", "browser-execute", "dependency-install", "external-execute"]);
const ROUTES = Object.freeze({
  "design.prototype": { effects: ["reference-only", "repository-read", "sandbox-write", "plan-write"], outputSchema: PROTOTYPE_SCHEMA, handoffSchema: "component-first-selection-receipt.v1", gate: "human-selection", versionApplicability: "not-applicable" },
  "design.review": { effects: ["reference-only", "repository-read", "plan-write"], outputSchema: "review-report.v1", handoffSchema: "review-report.v1", gate: "human-review", versionApplicability: "not-applicable" },
  "design.audit": { effects: ["reference-only", "repository-read", "plan-write"], outputSchema: "audit-report.v1", handoffSchema: "audit-report.v1", gate: "human-review", versionApplicability: "not-applicable" },
  "design.pick-library": { effects: ["reference-only", "repository-read", "plan-write"], outputSchema: "library-selection.v1", handoffSchema: "library-selection.v1", gate: "applicability", versionApplicability: "candidate.versionRange against input.packageVersion" },
});

function fail(message, code = "CONTRACT_INVALID") { const error = new Error(`design-skill: ${message}`); error.code = code; throw error; }
function assertObject(value, label) { if (!isObject(value)) fail(`${label} must be an object`); }
function assertNonEmpty(value, label) { if (!nonEmpty(value)) fail(`${label} must be a non-empty string`); }
function hash(value) { return sha256(canonicalJson(value)); }

function manifests() {
  return Object.fromEntries(Object.entries(ROUTES).map(([id, route]) => [id, {
    schema: MANIFEST_SCHEMA,
    id,
    version: 1,
    effects: route.effects,
    inputSchema: `${id}.input.v1`,
    outputSchema: route.outputSchema,
    policyReferences: ["component-first-default@1"],
    humanGates: [route.gate],
    handoffSchema: route.handoffSchema,
    versionApplicability: route.versionApplicability,
  }]));
}

function validateManifest(manifest) {
  assertObject(manifest, "manifest");
  for (const key of ["schema", "id", "version", "effects", "inputSchema", "outputSchema", "policyReferences", "humanGates", "handoffSchema", "versionApplicability"]) if (!Object.hasOwn(manifest, key)) fail(`manifest is missing ${key}`);
  if (manifest.schema !== MANIFEST_SCHEMA || !ROUTES[manifest.id]) fail("manifest id or schema is unsupported");
  if (manifest.version !== 1 || !Array.isArray(manifest.effects) || manifest.effects.some((effect) => !EFFECTS.has(effect))) fail("manifest effects are invalid");
  if (!Array.isArray(manifest.policyReferences) || !manifest.policyReferences.length || !Array.isArray(manifest.humanGates)) fail("manifest policyReferences or humanGates is invalid");
  const expected = ROUTES[manifest.id];
  if (JSON.stringify(manifest.effects) !== JSON.stringify(expected.effects) || manifest.outputSchema !== expected.outputSchema || manifest.versionApplicability !== expected.versionApplicability) fail("manifest effects, outputSchema, or applicability drift from the registered route");
  return manifest;
}

function routeDesignSkill(query) {
  assertNonEmpty(query, "query");
  const text = query.toLowerCase();
  const id = text.includes("prototype") || text.includes("direction") ? "design.prototype"
    : text.includes("review") ? "design.review"
      : text.includes("audit") ? "design.audit"
        : text.includes("library") || text.includes("component source") ? "design.pick-library" : null;
  return id ? { status: "ready", skill: id, manifest: manifests()[id] } : { status: "clarification", candidates: Object.keys(ROUTES), reason: "brief does not identify a design-skill route" };
}

function enforceEffects(manifest, requestedEffects = manifest.effects) {
  validateManifest(manifest);
  if (!Array.isArray(requestedEffects) || requestedEffects.some((effect) => !EFFECTS.has(effect))) fail("requested effects are invalid");
  if (requestedEffects.some((effect) => !manifest.effects.includes(effect))) fail("requested effect is not granted by the manifest", "EFFECT_FORBIDDEN");
  if (manifest.id === "design.prototype" && requestedEffects.includes("target-write")) fail("prototype cannot request target-write", "TARGET_WRITE_FORBIDDEN");
  return { status: "allowed", effects: requestedEffects };
}

function runPrototype(input) {
  assertObject(input, "prototype input");
  if (!Array.isArray(input.directions) || input.directions.length < 3) fail("design.prototype requires at least three directions");
  const ids = input.directions.map((direction) => { assertObject(direction, "direction"); assertNonEmpty(direction.id, "direction.id"); return direction.id; });
  if (new Set(ids).size !== ids.length) fail("prototype directions must have distinct ids");
  const prototypeSet = { schema: PROTOTYPE_SCHEMA, status: "awaiting-selection", target: input.target || { kind: "sandbox", root: "." }, policy: input.policy || { id: "component-first-default", version: 1 }, directions: input.directions.map((direction) => ({ ...direction, isolated: true })) };
  return { ...prototypeSet, prototypeSetHash: hash(prototypeSet), promotion: "blocked-until-selection" };
}

function runReview(input, kind) {
  assertObject(input, `${kind} input`);
  const findings = Array.isArray(input.findings) ? input.findings : [];
  return { schema: kind === "review" ? "review-report.v1" : "audit-report.v1", status: findings.some((item) => item?.status === "blocked") ? "blocked" : "review-required", findings, evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs : [], gate: "human-review" };
}

function runLibraryPicker(input) {
  assertObject(input, "pick-library input");
  if (!Array.isArray(input.candidates) || !input.candidates.length) fail("design.pick-library requires candidates");
  const version = input.packageVersion;
  const candidates = input.candidates.filter((candidate) => candidate && candidate.status === "ready" && versionApplicable(candidate.versionRange, version)).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!candidates.length) return { schema: "library-selection.v1", status: "blocked", reason: "no applicable ready library", applicability: { status: "blocked", packageVersion: version || null }, candidates: [] };
  const selected = candidates[0];
  return { schema: "library-selection.v1", status: "selected", applicability: { status: "applicable", packageVersion: version || null }, selected: { id: selected.id, version: selected.version, sourceDigest: selected.sourceDigest }, candidates: candidates.map(({ id, version, sourceDigest }) => ({ id, version, sourceDigest })) };
}

function versionApplicable(range, version) {
  if (!range) return true;
  if (typeof range !== "string" || !version || typeof version !== "string") return false;
  const expected = range.match(/^\^?(\d+)\.(\d+)\.(\d+)$/);
  const actual = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!expected || !actual) return false;
  const [major, minor, patch] = expected.slice(1).map(Number);
  const [aMajor, aMinor, aPatch] = actual.slice(1).map(Number);
  return range.startsWith("^") ? aMajor === major && (aMinor > minor || (aMinor === minor && aPatch >= patch)) : aMajor === major && aMinor === minor && aPatch === patch;
}

function runDesignSkill(skill, input, options = {}) {
  const manifest = manifests()[skill];
  if (!manifest) fail(`unknown skill ${String(skill)}`, "UNKNOWN_SKILL");
  enforceEffects(manifest, options.effects || manifest.effects);
  if (skill === "design.prototype") return { manifest, result: runPrototype(input) };
  if (skill === "design.review") return { manifest, result: runReview(input, "review") };
  if (skill === "design.audit") return { manifest, result: runReview(input, "audit") };
  return { manifest, result: runLibraryPicker(input) };
}

function selectPrototype(prototypeSet, input) {
  assertObject(prototypeSet, "prototype set");
  if (prototypeSet.schema !== PROTOTYPE_SCHEMA || prototypeSet.status !== "awaiting-selection") fail("prototype set is not selectable");
  assertObject(input, "selection");
  const selected = prototypeSet.directions.find((direction) => direction.id === input.selectedPrototypeId);
  if (!selected) fail("selected prototype does not exist", "SELECTION_INVALID");
  return selectionReceipt({ prototypeSetHash: prototypeSet.prototypeSetHash, selectedPrototypeId: selected.id, targetIdentityDigest: input.targetIdentityDigest, snapshotDigest: input.snapshotDigest, policyDigest: input.policyDigest, approvedBy: input.approvedBy });
}

function promotePrototype(v2Artifact, selection, input) {
  const conformance = checkV2Artifact(v2Artifact, input?.options || {});
  if (conformance.status !== "passed") fail("component conformance must pass before promotion", "CONFORMANCE_REQUIRED");
  const selectionReceiptValue = selection?.selectionReceipt || selection;
  if (!selectionReceiptValue || selectionReceiptValue.receiptHash !== input.selectionReceiptHash) fail("promotion selection does not match the selection receipt", "SELECTION_REQUIRED");
  const checkedSelection = selectionReceipt(selectionReceiptValue);
  if (checkedSelection.receiptHash !== selectionReceiptValue.receiptHash || checkedSelection.targetIdentityDigest !== v2Artifact.target.targetIdentityDigest || checkedSelection.snapshotDigest !== v2Artifact.target.snapshotDigest || checkedSelection.policyDigest !== v2Artifact.policy.digest) fail("promotion selection is stale for this artifact", "SELECTION_STALE");
  const promotion = promotionReceipt({ ...input, targetIdentityDigest: v2Artifact.target.targetIdentityDigest, snapshotDigest: v2Artifact.target.snapshotDigest, policyDigest: v2Artifact.policy.digest, componentConformanceStatus: conformance.conformance, visualAcceptanceStatus: v2Artifact.visualAcceptance?.status || "not-evaluated" });
  return { schema: HANDOFF_SCHEMA, status: "ready-for-explicit-target-write", targetWrite: "blocked-until-explicit-executor", selectionReceiptHash: selectionReceiptValue.receiptHash, promotionReceipt: promotion };
}

module.exports = { MANIFEST_SCHEMA, PROTOTYPE_SCHEMA, HANDOFF_SCHEMA, manifests, validateManifest, routeDesignSkill, enforceEffects, runDesignSkill, selectPrototype, promotePrototype, versionApplicable };
