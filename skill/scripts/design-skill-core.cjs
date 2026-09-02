"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, isObject, nonEmpty, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");
const { checkDirectionPreview } = require("./direction-preview-core.cjs");
const { promotionReceipt, selectionReceipt, checkV2Artifact } = require("./component-first-v2-core.cjs");

const MANIFEST_SCHEMA = "design-pipeline.design-skill-manifest.v1";
const PROTOTYPE_SCHEMA = "prototype-set.v1";
const HANDOFF_SCHEMA = "design-promotion-handoff.v1";
const EFFECTS = new Set(["reference-only", "repository-read", "artifact-write", "plan-write", "sandbox-write", "target-write", "browser-execute", "dependency-install", "external-execute"]);
const SHA256 = /^[0-9a-f]{64}$/;
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

function loadDirectionPreview(input, options = {}) {
  assertObject(input, "prototype input");
  assertNonEmpty(input.changeRoot, "prototype changeRoot");
  const projectRoot = options.projectRoot || process.cwd();
  const changeRoot = resolveInside(projectRoot, input.changeRoot, "prototype changeRoot", { scope: "design.prototype", mustExist: true });
  const artifact = input.artifact || "direction-preview.json";
  const artifactPath = resolveInside(changeRoot, artifact, "direction preview artifact", { scope: "design.prototype", mustExist: false });
  let preview;
  try {
    preview = checkDirectionPreview(changeRoot, { artifact, stage: "preview" });
  } catch (error) {
    preview = { status: "blocked", applicable: true, blockers: [error.message || "direction preview is invalid"] };
  }
  let ready = preview.status === "ready";
  let receipt = null;
  if (ready) {
    try {
      receipt = readJson(artifactPath, "direction preview");
    } catch (error) {
      preview = { status: "blocked", applicable: true, blockers: [error.message || "direction preview is invalid"] };
      ready = false;
    }
  }
  return {
    changeRoot,
    artifactPath,
    artifactSha256: ready ? sha256(fs.readFileSync(artifactPath)) : null,
    receipt,
    preview,
  };
}

function runPrototype(input, options = {}) {
  const loaded = loadDirectionPreview(input, options);
  const { receipt, preview } = loaded;
  const previewBinding = {
    status: preview.status,
    changeRoot: path.relative(options.projectRoot || loaded.changeRoot, loaded.changeRoot).split(path.sep).join("/") || ".",
    artifact: path.relative(loaded.changeRoot, loaded.artifactPath).split(path.sep).join("/"),
    artifactSha256: loaded.artifactSha256,
    viewport: receipt?.comparison?.viewport || null,
    contentFixtureSha256: receipt?.comparison?.contentFixtureSha256 || null,
    stateCoverage: receipt?.comparison?.stateCoverage || [],
  };
  if (preview.status !== "ready" || preview.applicable === false) {
    const target = input.target || { kind: "sandbox", root: "." };
    const policy = input.policy || { id: "component-first-default", version: 1 };
    const reason = preview.applicable === false ? "direction-preview-waived" : "direction-preview-required";
    return {
      schema: PROTOTYPE_SCHEMA,
      status: "blocked",
      reason,
      blockers: preview.blockers.length ? preview.blockers : ["design.prototype requires an applicable direction preview with candidates"],
      target,
      policy,
      directions: [],
      preview: previewBinding,
      promotion: "blocked-until-preview",
    };
  }
  const prototypeSet = {
    schema: PROTOTYPE_SCHEMA,
    status: "awaiting-selection",
    target: input.target || { kind: "sandbox", root: "." },
    policy: input.policy || { id: "component-first-default", version: 1 },
    directions: receipt.directions.map((direction) => ({ ...direction, isolated: true })),
    preview: previewBinding,
    promotion: "blocked-until-selection",
  };
  return { ...prototypeSet, prototypeSetHash: hash(prototypeSet) };
}

function runDesignSkill(skill, input, options = {}) {
  const manifest = manifests()[skill];
  if (!manifest) fail(`unknown skill ${String(skill)}`, "UNKNOWN_SKILL");
  enforceEffects(manifest, options.effects || manifest.effects);
  if (skill === "design.prototype") return { manifest, result: runPrototype(input, options) };
  if (skill === "design.review") return { manifest, result: runReview(input, "review") };
  if (skill === "design.audit") return { manifest, result: runReview(input, "audit") };
  return { manifest, result: runLibraryPicker(input) };
}

function verifyPrototypePreview(prototypeSet, projectRoot) {
  const binding = prototypeSet.preview;
  assertNonEmpty(binding.changeRoot, "prototype preview changeRoot");
  assertNonEmpty(binding.artifact, "prototype preview artifact");
  const loaded = loadDirectionPreview({ changeRoot: binding.changeRoot, artifact: binding.artifact }, { projectRoot });
  if (loaded.preview.status !== "ready" || loaded.artifactSha256 !== binding.artifactSha256 || !loaded.receipt) {
    fail("prototype set direction preview is stale or unverified", "DIRECTION_PREVIEW_STALE");
  }
  const expectedDirections = loaded.receipt.directions.map((direction) => ({ ...direction, isolated: true }));
  if (canonicalJson(expectedDirections) !== canonicalJson(prototypeSet.directions)) {
    fail("prototype set directions do not match the verified direction preview", "DIRECTION_PREVIEW_STALE");
  }
}

function selectPrototype(prototypeSet, input, options = {}) {
  assertObject(prototypeSet, "prototype set");
  if (prototypeSet.schema !== PROTOTYPE_SCHEMA || prototypeSet.status !== "awaiting-selection" || !Array.isArray(prototypeSet.directions)) {
    fail("prototype set schema, status, or directions are invalid", "PROTOTYPE_INVALID");
  }
  if (!isObject(prototypeSet.preview) || prototypeSet.preview.status !== "ready" || !SHA256.test(prototypeSet.preview.artifactSha256 || "")) {
    fail("prototype selection requires a ready direction preview", "DIRECTION_PREVIEW_REQUIRED");
  }
  if (!SHA256.test(prototypeSet.prototypeSetHash || "")) fail("prototype set hash is invalid", "PROTOTYPE_HASH_INVALID");
  const { prototypeSetHash, ...prototypeBody } = prototypeSet;
  if (hash(prototypeBody) !== prototypeSetHash) fail("prototype set hash is stale", "PROTOTYPE_STALE");
  verifyPrototypePreview(prototypeSet, options.projectRoot || process.cwd());
  assertObject(input, "selection");
  const selected = prototypeSet.directions.find((direction) => direction.id === input.selectedPrototypeId);
  if (!selected) fail("selected prototype does not exist", "SELECTION_INVALID");
  return selectionReceipt({ prototypeSetHash, selectedPrototypeId: selected.id, targetIdentityDigest: input.targetIdentityDigest, snapshotDigest: input.snapshotDigest, policyDigest: input.policyDigest, approvedBy: input.approvedBy });
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
