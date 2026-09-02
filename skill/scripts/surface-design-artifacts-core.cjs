"use strict";

const fs = require("node:fs");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  isObject,
  resolveInside,
  readJson,
  sha256,
} = require("./contract-utils.cjs");
const { resolveSurfaceProfile, validateSurfaceBinding } = require("./surface-profile-core.cjs");
const { validateComponentFitMatrix, validateDirectionLock } = require("./component-fit-core.cjs");
const { checkDirectionPreview } = require("./direction-preview-core.cjs");

const SELECTION_SCHEMA = "design-pipeline.selection-receipt.v1";
const PLAN_SCHEMA = "design-pipeline.adaptation-plan.v1";
const HASH = /^[a-f0-9]{64}$/;
const SELECTION_MODES = ["adopt", "reference"];
const PLAN_STATUSES = ["draft", "awaiting_review", "revised", "approved", "rejected"];
const PRECEDENCE = Object.freeze([
  "license/provenance/security/accessibility",
  "Surface technical constraints",
  "direction lock",
  "user template selection",
  "soft visual traits",
]);
const RECEIPT_KEYS = [
  "schema", "receiptId", "projectId", "surfaceId", "referenceHash", "region", "candidateTemplateVersion",
  "candidatePlatform", "candidateFramework", "componentCandidateVersions", "selectionMode", "selectionReason", "sourceAndLicenseEvidence",
  "directionLockSnapshot", "directionPreviewSnapshot", "technicalConstraints", "hardGateResults", "allowedChanges", "forbiddenChanges",
  "expectedDifferences", "acceptanceCriteria", "createdAt", "catalogVersion", "surfaceBindingSnapshot", "contentHash",
];
const PLAN_ARRAY_FIELDS = [
  "preservedStructure", "replacedComponents", "platformAdaptations", "accessibilityChanges",
  "licenseAndProvenanceNotes", "forbiddenCopying", "expectedVisualDifferences", "acceptanceChecks",
];
const PLAN_KEYS = [
  "schema", "planId", "receiptId", "receiptHash", "surfaceId", "componentFitBinding", "selectionReceipt", "componentFitMatrix", ...PLAN_ARRAY_FIELDS, "tokenMappings",
  "precedence", "revision", "status", "review", "approval", "revisedFrom", "contentHash",
];
const PLAN_MUTABLE_FIELDS = new Set([...PLAN_ARRAY_FIELDS, "tokenMappings"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const MANDATORY_PLATFORM_ADAPTATION = "respect-surface-platform-constraints";
const MANDATORY_FORBIDDEN_COPYING = "do-not-copy-source-or-protected-content";
function assertHash(value, label, scope) {
  if (typeof value !== "string" || !HASH.test(value)) fail(scope, `${label} must be a lowercase SHA-256 hash`);
}

function timestamp(value, label, scope) {
  const result = value === undefined ? new Date().toISOString() : value;
  assertString(result, label, scope);
  if (!Number.isFinite(Date.parse(result))) fail(scope, `${label} must be an ISO timestamp`);
  return result;
}

function gateStatus(value) {
  if (typeof value === "string") return value.toLowerCase();
  if (isObject(value) && typeof value.status === "string") return value.status.toLowerCase();
  return "missing";
}

function hashBody(value, hashField) {
  const body = clone(value);
  delete body[hashField];
  return sha256(canonicalJson(body));
}
function assertEvidenceIdentifier(value, label, scope) {
  assertString(value, label, scope);
  if (/^(?:anything|unknown|n\/a|na|tbd|placeholder)$/i.test(value.trim())) fail(scope, `${label} must identify a real evidence record`);
}

function validateEvidence(evidence, scope, expectedHashes = []) {
  if (!Array.isArray(evidence) || evidence.length < 2) fail(scope, "sourceAndLicenseEvidence requires license and provenance entries");
  const kinds = new Set();
  for (const [index, item] of evidence.entries()) {
    const itemScope = `${scope}.sourceAndLicenseEvidence[${index}]`;
    assertKeys(item, ["kind", "value", "source", "contentHash"], ["kind", "value", "source", "contentHash", "authorization", "attribution"], "evidence entry", itemScope);
    assertEvidenceIdentifier(item.value, "value", itemScope);
    assertEvidenceIdentifier(item.source, "source", itemScope);
    assertHash(item.contentHash, "contentHash", itemScope);
    if (expectedHashes.length && !expectedHashes.includes(item.contentHash)) fail(itemScope, "contentHash is not bound to the reference or candidate", { code: "STALE_BINDING" });
    if (item.kind === "license") {
      const license = item.value.toLowerCase();
      if (!new Set(["project-owned", "mit", "apache-2.0", "bsd", "bsd-2-clause", "bsd-3-clause", "isc", "gpl-2", "gpl-2.0", "gpl-3", "gpl-3.0"]).has(license)) fail(itemScope, "license value is not an allowlisted license or ownership basis");
      assertEvidenceIdentifier(item.authorization, "authorization", itemScope);
    } else {
      assertEvidenceIdentifier(item.attribution, "attribution", itemScope);
    }
    if (kinds.has(item.kind)) fail(itemScope, `duplicate ${item.kind} evidence`);
    kinds.add(item.kind);
  }
  if (!kinds.has("license") || !kinds.has("provenance")) fail(scope, "sourceAndLicenseEvidence must include separate license and provenance evidence");
  return clone(evidence);
}

function sourceEvidence(input, mode, expectedHashes) {
  if (input.sourceAndLicenseEvidence === undefined) {
    if (mode === "reference") return [];
    fail("selection-receipt", "adopt requires explicit license and provenance evidence");
  }
  return validateEvidence(input.sourceAndLicenseEvidence, "selection-receipt", expectedHashes);
}

function validateAdoptionGates(mode, gates, evidence, expectedHashes = []) {
  if (mode !== "adopt") return;
  for (const name of ["license", "provenance", "security", "accessibility"]) {
    if (gateStatus(gates[name]) !== "pass") fail("selection-receipt", `${name} hard gate must pass for adopt`);
  }
  validateEvidence(evidence, "selection-receipt", expectedHashes);
}

function normalizeCandidate(input) {
  const candidate = input.candidate;
  assertKeys(candidate, ["id", "version"], ["id", "version", "templateVersion", "componentCandidateVersions", "componentVersions", "contentHash", "license", "provenance", "platform", "framework", "regionKind", "catalogStatus"], "candidate", "selection-receipt");
  assertString(candidate.id, "candidate.id", "selection-receipt");
  assertString(candidate.version, "candidate.version", "selection-receipt");
  if (candidate.contentHash !== undefined) assertHash(candidate.contentHash, "candidate.contentHash", "selection-receipt");
  const componentVersions = Object.hasOwn(input, "componentCandidateVersions") ? input.componentCandidateVersions : Object.hasOwn(candidate, "componentCandidateVersions") ? candidate.componentCandidateVersions : Object.hasOwn(candidate, "componentVersions") ? candidate.componentVersions : [];
  assertStringArray(componentVersions, "componentCandidateVersions", "selection-receipt", { unique: true });
  const result = { id: candidate.id, version: candidate.version, componentCandidateVersions: [...componentVersions], ...(candidate.contentHash ? { contentHash: candidate.contentHash } : {}) };
  for (const key of ["platform", "framework", "regionKind", "catalogStatus"]) {
    if (candidate[key] !== undefined) {
      assertString(candidate[key], `candidate.${key}`, "selection-receipt");
      result[key] = candidate[key];
    }
  }
  return result;
}

function normalizeDirectionPreviewBinding(preview, lock) {
  assertObject(preview, "direction preview", "selection-receipt");
  const artifact = preview.artifact || preview.previewArtifact || preview.receipt || (
    preview.schema === "design-pipeline.direction-preview.v1"
      ? Object.fromEntries(["schema", "changeId", "applicability", "comparison", "directions", "decision"].map((key) => [key, preview[key]]))
      : null
  );
  assertObject(artifact, "direction preview artifact", "selection-receipt");
  if (typeof preview.changeRoot !== "string" || !preview.changeRoot.trim()) fail("selection-receipt", "direction preview changeRoot is required for filesystem-bound evidence");
  const checked = checkDirectionPreview(preview.changeRoot, { stage: "selection" });
  if (checked.status !== "ready" || checked.applicable !== true) {
    fail("selection-receipt", checked.blockers?.[0] || "a validated applicable direction preview selection is required");
  }
  if (!Number.isInteger(checked.directionCount) || checked.directionCount < 2 || checked.directionCount > 3) {
    fail("selection-receipt", "direction preview selection must contain two or three materially differentiated directions");
  }
  const checkedArtifact = readJson(checked.artifact, "direction preview");
  if (canonicalJson(artifact) !== canonicalJson(checkedArtifact)) fail("selection-receipt", "direction preview artifact does not match the filesystem-bound artifact");
  const artifactSha256 = preview.artifactSha256 || preview.previewArtifactSha256 || preview.bindingHash;
  assertHash(artifactSha256, "direction preview artifact hash", "selection-receipt");
  const checkedArtifactSha256 = sha256(fs.readFileSync(checked.artifact));
  if (artifactSha256 !== checkedArtifactSha256) fail("selection-receipt", "direction preview artifact hash does not match the filesystem-bound artifact");
  const contentHash = preview.contentHash || preview.previewContentHash || preview.previewArtifactContentHash;
  assertHash(contentHash, "direction preview content hash", "selection-receipt");
  if (contentHash !== sha256(canonicalJson(checkedArtifact))) fail("selection-receipt", "direction preview content hash does not match the preview artifact");
  const selectedLock = preview.directionLockSnapshot || preview.selectedLockSnapshot || preview.lock;
  if (!isObject(selectedLock)) fail("selection-receipt", "direction preview selected lock snapshot is required");
  const checkedSelectedLock = validateDirectionLock(selectedLock);
  if (canonicalJson(checkedSelectedLock) !== canonicalJson(lock)) fail("selection-receipt", "direction preview selected lock snapshot does not match direction lock");
  const selectedDirectionId = checkedArtifact.decision?.selectedDirectionId;
  assertString(selectedDirectionId, "direction preview selectedDirectionId", "selection-receipt");
  if (selectedDirectionId !== lock.directionId) fail("selection-receipt", "direction lock does not match the selected direction preview");
  return { status: "selected", applicable: true, selectedDirectionId, artifactSha256, contentHash, changeRoot: preview.changeRoot, artifact: clone(checkedArtifact), directionLockSnapshot: clone(checkedSelectedLock) };
}

function normalizeSurfaceSnapshot(surface, projectId, surfaceId) {
  if (surface === undefined) fail("selection-receipt", "a validated Surface profile snapshot is required");
  assertObject(surface, "surface", "selection-receipt");
  const profile = resolveSurfaceProfile(surface);
  const binding = validateSurfaceBinding(surface, profile);
  if (binding.platform === "game") fail("selection-receipt", "game is reserved and unavailable for first-wave SelectionReceipt creation");
  if (surface.projectId !== undefined && surface.projectId !== projectId) fail("selection-receipt", "surface projectId does not match receipt");
  if (surface.surfaceId !== undefined && surface.surfaceId !== surfaceId) fail("selection-receipt", "surface surfaceId does not match receipt");
  return { projectId, surfaceId, platform: binding.platform, framework: binding.framework, profileVersion: binding.profileVersion || profile.version, profileId: binding.profileId || profile.profileId };
}

function validateCandidateForSurface(input, candidate, surfaceSnapshot) {
  const sourceCandidate = input.candidate;
  const catalog = input.catalog?.entries
    ? input.catalog
    : input.searchResult?.matches
      ? { entries: input.searchResult.matches }
      : input.searchedCatalog?.entries
        ? input.searchedCatalog
        : null;
  if (!catalog || !Array.isArray(catalog.entries)) fail("selection-receipt", "an immutable searched catalog is required to prove candidate compatibility");
  const entry = catalog.entries.find((item) => item?.templateId === candidate.id || item?.id === candidate.id);
  if (!entry) fail("selection-receipt", "candidate is not a member of the declared search catalog");
  for (const key of ["platform", "framework"]) {
    if (sourceCandidate[key] !== undefined && sourceCandidate[key] !== entry[key]) {
      fail("selection-receipt", `candidate ${key} does not match the immutable catalog entry`);
    }
  }
  if (entry.platform !== "agnostic" && entry.platform !== surfaceSnapshot.platform) fail("selection-receipt", `candidate platform ${entry.platform} does not match Surface ${surfaceSnapshot.platform}`);
  if (entry.framework !== "agnostic" && entry.framework !== surfaceSnapshot.framework) fail("selection-receipt", `candidate framework ${entry.framework} does not match Surface ${surfaceSnapshot.framework}`);
  if (entry.templateVersion !== candidate.version && entry.version !== candidate.version) fail("selection-receipt", "candidate version does not match the declared search catalog");
  return entry;
}

function createSelectionReceipt(input) {
  const scope = "selection-receipt";
  assertObject(input, "selection input", scope);
  for (const key of ["projectId", "surfaceId", "referenceHash"]) assertString(input[key], key, scope);
  assertHash(input.referenceHash, "referenceHash", scope);
  const candidate = normalizeCandidate(input);
  const mode = input.selectionMode === undefined ? "reference" : input.selectionMode;
  assertEnum(mode, SELECTION_MODES, "selectionMode", scope);
  const surfaceSnapshot = normalizeSurfaceSnapshot(input.surface, input.projectId, input.surfaceId);
  const catalogEntry = validateCandidateForSurface(input, candidate, surfaceSnapshot);
  const directionLockSnapshot = validateDirectionLock(input.directionLockSnapshot);
  const directionPreview = normalizeDirectionPreviewBinding(
    input.directionPreview || input.directionPreviewSelection || input.validatedDirectionPreview,
    directionLockSnapshot,
  );
  const gates = isObject(input.hardGateResults) ? clone(input.hardGateResults) : {};
  const expectedEvidenceHashes = [input.referenceHash];
  const evidence = sourceEvidence(input, mode, expectedEvidenceHashes);
  validateAdoptionGates(mode, gates, evidence, expectedEvidenceHashes);
  assertStringArray(input.acceptanceCriteria, "acceptanceCriteria", scope, { unique: true, min: 1 });
  if (input.region !== undefined && input.region !== candidate.id) fail(scope, "region must match the selected candidate");
  const body = {
    schema: SELECTION_SCHEMA,
    receiptId: input.receiptId || `selection-${sha256(canonicalJson({ projectId: input.projectId, surfaceId: input.surfaceId, referenceHash: input.referenceHash, candidate: candidate.id, version: candidate.version })).slice(0, 24)}`,
    projectId: input.projectId,
    surfaceId: input.surfaceId,
    referenceHash: input.referenceHash,
    region: candidate.id,
    candidateTemplateVersion: candidate.version,
    candidatePlatform: catalogEntry.platform,
    candidateFramework: catalogEntry.framework,
    componentCandidateVersions: candidate.componentCandidateVersions,
    selectionMode: mode,
    selectionReason: input.selectionReason || (mode === "adopt" ? "user-selected-template" : "reference-only-selection"),
    sourceAndLicenseEvidence: evidence,
    directionLockSnapshot: clone(directionLockSnapshot),
    directionPreviewSnapshot: directionPreview,
    technicalConstraints: input.technicalConstraints === undefined ? [] : input.technicalConstraints,
    hardGateResults: gates,
    allowedChanges: input.allowedChanges === undefined ? [] : input.allowedChanges,
    forbiddenChanges: input.forbiddenChanges === undefined ? ["copy source code without authorization"] : input.forbiddenChanges,
    expectedDifferences: input.expectedDifferences === undefined ? [] : input.expectedDifferences,
    acceptanceCriteria: [...input.acceptanceCriteria],
    createdAt: timestamp(input.createdAt, "createdAt", scope),
    surfaceBindingSnapshot: surfaceSnapshot,
  };
  for (const key of ["technicalConstraints", "allowedChanges", "forbiddenChanges", "expectedDifferences"]) assertStringArray(body[key], key, scope, { unique: true });
  assertString(body.receiptId, "receiptId", scope);
  assertString(body.region, "region", scope);
  assertString(body.selectionReason, "selectionReason", scope);
  if (input.catalogVersion !== undefined) { assertString(input.catalogVersion, "catalogVersion", scope); body.catalogVersion = input.catalogVersion; }
  body.contentHash = hashBody(body, "contentHash");
  return body;
}

function validateReceiptShape(receipt) {
  const scope = "selection-receipt";
  assertObject(receipt, "receipt", scope);
  assertKeys(receipt, ["schema", "receiptId", "projectId", "surfaceId", "referenceHash", "region", "candidateTemplateVersion", "candidatePlatform", "candidateFramework", "componentCandidateVersions", "selectionMode", "selectionReason", "sourceAndLicenseEvidence", "directionLockSnapshot", "directionPreviewSnapshot", "technicalConstraints", "hardGateResults", "allowedChanges", "forbiddenChanges", "expectedDifferences", "acceptanceCriteria", "createdAt", "surfaceBindingSnapshot", "contentHash"], RECEIPT_KEYS, "selection receipt", scope);
  if (receipt.schema !== SELECTION_SCHEMA) fail(scope, `schema must be ${SELECTION_SCHEMA}`);
  for (const key of ["receiptId", "projectId", "surfaceId", "region", "candidateTemplateVersion", "candidatePlatform", "candidateFramework", "selectionReason"]) assertString(receipt[key], key, scope);
  assertHash(receipt.referenceHash, "referenceHash", scope);
  assertStringArray(receipt.componentCandidateVersions, "componentCandidateVersions", scope, { unique: true });
  assertEnum(receipt.selectionMode, SELECTION_MODES, "selectionMode", scope);
  if (!Array.isArray(receipt.sourceAndLicenseEvidence)) fail(scope, "sourceAndLicenseEvidence must be an array");
  if (receipt.sourceAndLicenseEvidence.length) validateEvidence(receipt.sourceAndLicenseEvidence, scope, [receipt.referenceHash]);
  const lock = validateDirectionLock(receipt.directionLockSnapshot);
  normalizeDirectionPreviewBinding(receipt.directionPreviewSnapshot, lock);
  for (const key of ["technicalConstraints", "allowedChanges", "forbiddenChanges", "expectedDifferences", "acceptanceCriteria"]) assertStringArray(receipt[key], key, scope, { unique: true, min: key === "acceptanceCriteria" ? 1 : undefined });
  assertObject(receipt.hardGateResults, "hardGateResults", scope);
  timestamp(receipt.createdAt, "createdAt", scope);
  const surfaceSnapshot = normalizeSurfaceSnapshot(receipt.surfaceBindingSnapshot, receipt.projectId, receipt.surfaceId);
  if (canonicalJson(surfaceSnapshot) !== canonicalJson(receipt.surfaceBindingSnapshot)) fail(scope, "surface profile binding snapshot is invalid");
  if (receipt.candidatePlatform !== "agnostic" && receipt.candidatePlatform !== surfaceSnapshot.platform) fail(scope, "candidate platform does not match Surface");
  if (receipt.candidateFramework !== "agnostic" && receipt.candidateFramework !== surfaceSnapshot.framework) fail(scope, "candidate framework does not match Surface");
  assertHash(receipt.contentHash, "contentHash", scope);
  if (receipt.catalogVersion !== undefined) assertString(receipt.catalogVersion, "catalogVersion", scope);
  validateAdoptionGates(receipt.selectionMode, receipt.hardGateResults, receipt.sourceAndLicenseEvidence);
  if (receipt.contentHash !== hashBody(receipt, "contentHash")) fail(scope, "content hash does not match receipt contents", { code: "HASH_DRIFT" });
  return clone(receipt);
}
function compareValue(actual, expected, label) {
  if (expected !== undefined && canonicalJson(actual) !== canonicalJson(expected)) fail("selection-receipt", `${label} does not match the current context`, { code: "STALE_BINDING" });
}
function validateSelectionReceipt(receipt, context = {}) {
  const checked = validateReceiptShape(receipt);
  assertObject(context, "context", "selection-receipt");
  if (context.projectId !== undefined && checked.projectId !== context.projectId) fail("selection-receipt", "projectId does not match context", { code: "STALE_BINDING" });
  if (context.surfaceId !== undefined && checked.surfaceId !== context.surfaceId) fail("selection-receipt", "surfaceId does not match context", { code: "STALE_BINDING" });
  let sourceHash;
  for (const key of ["referenceHash", "sourceHash", "referenceContentHash"]) {
    if (Object.hasOwn(context, key)) { sourceHash = context[key]; break; }
  }
  if (sourceHash === undefined && Object.hasOwn(context, "referenceSource") && isObject(context.referenceSource) && Object.hasOwn(context.referenceSource, "contentHash")) sourceHash = context.referenceSource.contentHash;
  if (sourceHash !== undefined) {
    assertHash(sourceHash, "referenceHash", "selection-receipt");
    if (checked.referenceHash !== sourceHash) fail("selection-receipt", "reference hash does not match context", { code: "STALE_BINDING" });
  }
  if (context.selectionMode !== undefined) {
    assertEnum(context.selectionMode, SELECTION_MODES, "selectionMode", "selection-receipt");
    if (checked.selectionMode !== context.selectionMode) fail("selection-receipt", "selection mode drifted", { code: "STALE_BINDING" });
  }
  if (context.candidate !== undefined) {
    assertObject(context.candidate, "candidate", "selection-receipt");
    if (context.candidate.id !== undefined && checked.region !== context.candidate.id) fail("selection-receipt", "candidate does not match receipt region", { code: "STALE_BINDING" });
    for (const key of ["platform", "framework"]) {
      if (context.candidate[key] !== undefined) {
        assertString(context.candidate[key], `candidate.${key}`, "selection-receipt");
        if (context.candidate[key] !== checked[`candidate${key[0].toUpperCase()}${key.slice(1)}`]) fail("selection-receipt", `candidate ${key} drifted`, { code: "STALE_BINDING" });
      }
    }
    const hasVersion = Object.hasOwn(context.candidate, "version") || Object.hasOwn(context.candidate, "templateVersion");
    if (!hasVersion) fail("selection-receipt", "candidate version is required in context", { code: "STALE_BINDING" });
    const version = Object.hasOwn(context.candidate, "version") ? context.candidate.version : context.candidate.templateVersion;
    assertString(version, "candidate.version", "selection-receipt");
    if (checked.candidateTemplateVersion !== version) fail("selection-receipt", "candidate version drifted", { code: "STALE_BINDING" });
    const hasComponents = Object.hasOwn(context.candidate, "componentCandidateVersions") || Object.hasOwn(context.candidate, "componentVersions");
    if (hasComponents) {
      const components = Object.hasOwn(context.candidate, "componentCandidateVersions")
        ? context.candidate.componentCandidateVersions
        : context.candidate.componentVersions;
      assertStringArray(components, "candidate.componentCandidateVersions", "selection-receipt", { unique: true, min: 1 });
      compareValue(checked.componentCandidateVersions, components, "component candidate versions");
    }
    if (context.candidate.contentHash !== undefined) {
      assertHash(context.candidate.contentHash, "candidate.contentHash", "selection-receipt");
      if (checked.sourceAndLicenseEvidence.length) validateEvidence(checked.sourceAndLicenseEvidence, "selection-receipt", [checked.referenceHash, context.candidate.contentHash]);
    }
  }
  if (context.catalog?.entries !== undefined) {
    if (!Array.isArray(context.catalog.entries)) fail("selection-receipt", "catalog entries must be an array");
    const entry = context.catalog.entries.find((item) => item?.templateId === checked.region || item?.id === checked.region);
    if (!entry) fail("selection-receipt", "candidate is no longer in the catalog", { code: "STALE_BINDING" });
    if (entry.platform !== checked.candidatePlatform || entry.framework !== checked.candidateFramework) fail("selection-receipt", "candidate platform/framework drifted", { code: "STALE_BINDING" });
    if (entry.templateVersion !== checked.candidateTemplateVersion && entry.version !== checked.candidateTemplateVersion) fail("selection-receipt", "candidate version drifted", { code: "STALE_BINDING" });
  }
  for (const key of ["candidateTemplateVersion", "candidateVersion", "templateVersion"]) {
    if (Object.hasOwn(context, key)) {
      assertString(context[key], key, "selection-receipt");
      if (checked.candidateTemplateVersion !== context[key]) fail("selection-receipt", "candidate version drifted", { code: "STALE_BINDING" });
    }
  }
  for (const key of ["componentCandidateVersions", "componentVersions"]) {
    if (Object.hasOwn(context, key)) {
      assertStringArray(context[key], key, "selection-receipt", { unique: true, min: 1 });
      compareValue(checked.componentCandidateVersions, context[key], "component candidate versions");
    }
  }
  const catalogVersion = context.catalog?.version ?? context.catalogVersion;
  if (catalogVersion !== undefined) {
    assertString(catalogVersion, "catalogVersion", "selection-receipt");
    if (checked.catalogVersion !== catalogVersion) fail("selection-receipt", "catalog version drifted", { code: "STALE_BINDING" });
  }
  const currentLock = context.directionLockSnapshot || context.directionLock;
  if (currentLock !== undefined) {
    const checkedLock = validateDirectionLock(currentLock);
    if (checked.directionLockSnapshot.directionLockHash !== checkedLock.directionLockHash) fail("selection-receipt", "direction lock changed", { code: "STALE_BINDING" });
  }
  if (context.directionLockHash !== undefined && checked.directionLockSnapshot.directionLockHash !== context.directionLockHash) fail("selection-receipt", "direction lock changed", { code: "STALE_BINDING" });
  const surface = context.surface || context.surfaceBinding;
  if (surface !== undefined) {
    assertObject(surface, "surface", "selection-receipt");
    const profile = resolveSurfaceProfile(surface);
    const binding = validateSurfaceBinding(surface, profile);
    if (surface.projectId !== undefined && checked.projectId !== surface.projectId) fail("selection-receipt", "projectId does not match Surface", { code: "STALE_BINDING" });
    if (surface.surfaceId !== undefined && checked.surfaceId !== surface.surfaceId) fail("selection-receipt", "surfaceId does not match Surface", { code: "STALE_BINDING" });
    if (canonicalJson(checked.surfaceBindingSnapshot) !== canonicalJson({ projectId: checked.projectId, surfaceId: checked.surfaceId, platform: binding.platform, framework: binding.framework, profileVersion: binding.profileVersion || profile.version, profileId: binding.profileId || profile.profileId })) fail("selection-receipt", "Surface profile binding changed", { code: "STALE_BINDING" });
  }
  compareValue(checked.technicalConstraints, context.technicalConstraints, "technical constraints");
  compareValue(checked.hardGateResults, context.hardGateResults, "hard gate results");
  compareValue(checked.acceptanceCriteria, context.acceptanceCriteria, "acceptance criteria");
  return checked;
}

function normalizePlanArray(value, key, fallback, required = false) {
  const result = value === undefined ? fallback : value;
  assertStringArray(result, key, "adaptation-plan", { unique: true, min: required ? 1 : undefined });
  return [...result];
}
function hasMandatoryPolicy(values, required) {
  return Array.isArray(values) && values.includes(required);
}
function requireComponentFitBinding(receipt, context) {
  const matrix = context.componentFitMatrix;
  if (!matrix) fail("adaptation-plan", "a component-fit matrix is required before adaptation");
  const checked = validateComponentFitMatrix(matrix, { directionLock: receipt.directionLockSnapshot });
  const expectedSurface = receipt.surfaceBindingSnapshot;
  if (checked.platform !== expectedSurface.platform || checked.framework !== expectedSurface.framework) {
    fail("adaptation-plan", "component-fit matrix platform/framework does not match receipt Surface");
  }
  const binding = context.componentFitBinding;
  if (!isObject(binding)) fail("adaptation-plan", "componentFitBinding is required");
  assertString(binding.region, "componentFitBinding.region", "adaptation-plan");
  if (binding.region !== receipt.region) fail("adaptation-plan", "component-fit binding must target the selected region");
  assertHash(binding.matrixHash, "componentFitBinding.matrixHash", "adaptation-plan");
  if (binding.matrixHash !== checked.matrixHash) fail("adaptation-plan", "component-fit binding hash is stale");
  return { region: binding.region, matrixHash: binding.matrixHash, matrixStatus: checked.status, platform: checked.platform, framework: checked.framework };
}
function createAdaptationPlan(receipt, context = {}) {
  assertObject(context, "context", "adaptation-plan");
  const requestedSurface = context.surface || context.surfaceBinding;
  if (context.platform === "game" || requestedSurface?.platform === "game") {
    fail("adaptation-plan", "game is reserved and unavailable for first-wave template adaptation");
  }
  const checkedReceipt = validateSelectionReceipt(receipt, context);
  if (context.platform !== undefined && (!requestedSurface || context.platform !== requestedSurface.platform)) {
    fail("adaptation-plan", "context platform does not match Surface platform");
  }
  const platform = requestedSurface?.platform || context.platform || "target Surface";
  const componentFitBinding = requireComponentFitBinding(checkedReceipt, context);
  const body = {
    schema: PLAN_SCHEMA,
    planId: `adaptation-${sha256(canonicalJson({ receiptHash: checkedReceipt.contentHash, surfaceId: checkedReceipt.surfaceId, revision: 1 })).slice(0, 24)}`,
    receiptId: checkedReceipt.receiptId,
    receiptHash: checkedReceipt.contentHash,
    surfaceId: checkedReceipt.surfaceId,
    componentFitBinding,
    selectionReceipt: clone(checkedReceipt),
    componentFitMatrix: clone(context.componentFitMatrix),
    preservedStructure: normalizePlanArray(context.preservedStructure, "preservedStructure", []),
    replacedComponents: normalizePlanArray(context.replacedComponents, "replacedComponents", []),
    platformAdaptations: normalizePlanArray(context.platformAdaptations, "platformAdaptations", [MANDATORY_PLATFORM_ADAPTATION, `Adapt ${platform} layout and interaction behavior without changing the Surface direction lock`], true),
    tokenMappings: context.tokenMappings === undefined ? {} : clone(context.tokenMappings),
    accessibilityChanges: normalizePlanArray(context.accessibilityChanges, "accessibilityChanges", ["Preserve and verify mandatory accessibility gates"]),
    licenseAndProvenanceNotes: normalizePlanArray(context.licenseAndProvenanceNotes, "licenseAndProvenanceNotes", [`Respect ${checkedReceipt.selectionMode} selection mode and preserve source attribution evidence`]),
    forbiddenCopying: normalizePlanArray(context.forbiddenCopying, "forbiddenCopying", [MANDATORY_FORBIDDEN_COPYING, "Do not copy source code, proprietary assets, or protected content without authorization"], true),
    expectedVisualDifferences: normalizePlanArray(context.expectedVisualDifferences, "expectedVisualDifferences", ["Project-native content, tokens, and platform controls may differ from the reference"]),
    acceptanceChecks: normalizePlanArray(context.acceptanceChecks, "acceptanceChecks", checkedReceipt.acceptanceCriteria, true),
    precedence: [...PRECEDENCE],
    revision: 1,
    status: "draft",
  };
  assertObject(body.tokenMappings, "tokenMappings", "adaptation-plan");
  if (!hasMandatoryPolicy(body.platformAdaptations, MANDATORY_PLATFORM_ADAPTATION)
    || body.platformAdaptations.filter((item) => item !== MANDATORY_PLATFORM_ADAPTATION).length < 1
    || !hasMandatoryPolicy(body.forbiddenCopying, MANDATORY_FORBIDDEN_COPYING)) {
    fail("adaptation-plan", "mandatory adaptation, concrete platform adaptation, and no-copying policy entries are required");
  }
  body.contentHash = hashBody(body, "contentHash");
  return body;
}
function validatePlanShape(plan) {
  const scope = "adaptation-plan";
  assertObject(plan, "plan", scope);
  assertKeys(plan, ["schema", "planId", "receiptId", "receiptHash", "surfaceId", "componentFitBinding", ...PLAN_ARRAY_FIELDS, "tokenMappings", "precedence", "revision", "status", "contentHash"], PLAN_KEYS, "adaptation plan", scope);
  if (plan.schema !== PLAN_SCHEMA) fail(scope, `schema must be ${PLAN_SCHEMA}`);
  for (const key of ["planId", "receiptId", "surfaceId"]) assertString(plan[key], key, scope);
  assertHash(plan.receiptHash, "receiptHash", scope);
  assertObject(plan.componentFitBinding, "componentFitBinding", scope);
  assertString(plan.componentFitBinding.region, "componentFitBinding.region", scope);
  assertHash(plan.componentFitBinding.matrixHash, "componentFitBinding.matrixHash", scope);
  assertString(plan.componentFitBinding.platform, "componentFitBinding.platform", scope);
  assertObject(plan.selectionReceipt, "selectionReceipt", scope);
  const checkedReceipt = validateSelectionReceipt(plan.selectionReceipt);
  if (checkedReceipt.contentHash !== plan.receiptHash) fail(scope, "selectionReceipt does not match receiptHash");
  assertObject(plan.componentFitMatrix, "componentFitMatrix", scope);
  const checkedMatrix = validateComponentFitMatrix(plan.componentFitMatrix, { directionLock: checkedReceipt.directionLockSnapshot });
  if (checkedMatrix.matrixHash !== plan.componentFitBinding.matrixHash) fail(scope, "componentFitMatrix does not match matrixHash");
  if (checkedReceipt.receiptId !== plan.receiptId || checkedReceipt.surfaceId !== plan.surfaceId) fail(scope, "selectionReceipt binding is stale");
  if (checkedMatrix.status !== plan.componentFitBinding.matrixStatus
    || checkedMatrix.platform !== plan.componentFitBinding.platform
    || checkedMatrix.framework !== plan.componentFitBinding.framework
    || plan.componentFitBinding.region !== plan.selectionReceipt.region) {
    fail(scope, "componentFitMatrix binding is stale");
  }
  assertString(plan.componentFitBinding.framework, "componentFitBinding.framework", scope);
  assertEnum(plan.componentFitBinding.matrixStatus, ["ready", "review", "blocked"], "componentFitBinding.matrixStatus", scope);
  for (const key of PLAN_ARRAY_FIELDS) {
    const min = ["platformAdaptations", "forbiddenCopying", "acceptanceChecks"].includes(key) ? 1 : undefined;
    assertStringArray(plan[key], key, scope, { unique: true, min });
  }
  if (plan.platformAdaptations.length < 2) fail(scope, "platformAdaptations must include a concrete platform adaptation");
  if (!hasMandatoryPolicy(plan.platformAdaptations, MANDATORY_PLATFORM_ADAPTATION)
    || plan.platformAdaptations.filter((item) => item !== MANDATORY_PLATFORM_ADAPTATION).length < 1
    || !hasMandatoryPolicy(plan.forbiddenCopying, MANDATORY_FORBIDDEN_COPYING)) {
    fail(scope, "mandatory adaptation, concrete platform adaptation, and no-copying policy entries are required");
  }
  assertObject(plan.tokenMappings, "tokenMappings", scope);
  assertStringArray(plan.precedence, "precedence", scope, { unique: true });
  if (canonicalJson(plan.precedence) !== canonicalJson(PRECEDENCE)) fail(scope, "precedence does not match the required policy");
  if (!Number.isInteger(plan.revision) || plan.revision < 1) fail(scope, "revision must be a positive integer");
  assertEnum(plan.status, PLAN_STATUSES, "status", scope);
  assertHash(plan.contentHash, "contentHash", scope);
  if (plan.review !== undefined) assertObject(plan.review, "review", scope);
  if (plan.approval !== undefined) assertObject(plan.approval, "approval", scope);
  if (plan.revisedFrom !== undefined) assertHash(plan.revisedFrom, "revisedFrom", scope);
  if (plan.contentHash !== hashBody(plan, "contentHash")) fail(scope, "content hash does not match plan contents", { code: "HASH_DRIFT" });
  return clone(plan);
}

function reviewAdaptationPlan(plan, review) {
  const checked = validatePlanShape(plan);
  if (["approved", "rejected"].includes(checked.status)) fail("adaptation-plan", `cannot review a ${checked.status} plan`);
  assertObject(review, "review", "adaptation-plan");
  assertString(review.reviewer, "reviewer", "adaptation-plan");
  const next = clone(checked);
  const revision = review.revision || review.changes;
  if (revision !== undefined) {
    assertObject(revision, "revision", "adaptation-plan");
    for (const [key, value] of Object.entries(revision)) {
      if (!PLAN_MUTABLE_FIELDS.has(key)) fail("adaptation-plan", `${key} cannot be revised`);
      if (key === "tokenMappings") { assertObject(value, "tokenMappings", "adaptation-plan"); next[key] = clone(value); }
      else {
        const min = ["platformAdaptations", "forbiddenCopying", "acceptanceChecks"].includes(key) ? 1 : undefined;
        assertStringArray(value, key, "adaptation-plan", { unique: true, min });
        if (key === "platformAdaptations" && value.length < 2) fail("adaptation-plan", "platformAdaptations must include a concrete platform adaptation");
        next[key] = [...value];
      }
    }
    if (!hasMandatoryPolicy(next.platformAdaptations, MANDATORY_PLATFORM_ADAPTATION)
      || next.platformAdaptations.filter((item) => item !== MANDATORY_PLATFORM_ADAPTATION).length < 1
      || !hasMandatoryPolicy(next.forbiddenCopying, MANDATORY_FORBIDDEN_COPYING)
      || !next.acceptanceChecks.length) {
      fail("adaptation-plan", "revision removes mandatory adaptation or acceptance checks");
    }
    next.revision += 1;
    next.revisedFrom = checked.contentHash;
    next.status = "awaiting_review";
  } else if (review.decision === "reject") next.status = "rejected";
  else if (["revise", "request_changes", "changes_requested"].includes(review.decision)) next.status = "revised";
  else next.status = "awaiting_review";
  next.review = clone(review);
  delete next.contentHash;
  next.contentHash = hashBody(next, "contentHash");
  return next;
}

function requirePreviewRootBinding(plan, scope = "adaptation-plan", projectRoot) {
  const changeRoot = plan.selectionReceipt?.directionPreviewSnapshot?.changeRoot;
  if (typeof changeRoot !== "string" || !changeRoot.trim()) fail(scope, "selection receipt preview must retain a filesystem-bound changeRoot");
  if (projectRoot !== undefined) resolveInside(projectRoot, changeRoot, "selection receipt preview changeRoot", { scope, mustExist: true });
}
function approveAdaptationPlan(plan, approval, options = {}) {
  if (options.requirePreviewRoot) requirePreviewRootBinding(plan, "adaptation-plan", options.projectRoot);
  const checked = validatePlanShape(plan);
  assertObject(approval, "approval", "adaptation-plan");
  assertString(approval.reviewer, "reviewer", "adaptation-plan");
  assertString(approval.rationale, "rationale", "adaptation-plan");
  assertHash(approval.planContentHash, "planContentHash", "adaptation-plan");
  if (approval.planContentHash !== checked.contentHash) fail("adaptation-plan", "approval is stale for the persisted plan");
  if (!["draft", "awaiting_review", "revised"].includes(checked.status)) fail("adaptation-plan", `cannot approve plan in ${checked.status} state`);
  const next = clone(checked);
  next.status = "approved";
  next.approval = clone(approval);
  delete next.contentHash;
  next.contentHash = hashBody(next, "contentHash");
  return next;
}
function approvalBindsPlan(plan) {
  if (!isObject(plan.approval) || typeof plan.approval.planContentHash !== "string") return false;
  const candidate = clone(plan);
  const claimed = candidate.approval.planContentHash;
  delete candidate.approval;
  delete candidate.contentHash;
  for (const status of ["draft", "awaiting_review", "revised"]) {
    candidate.status = status;
    if (hashBody(candidate, "contentHash") === claimed) return true;
  }
  return false;
}

function canCreateTasks(plan, options = {}) {
  const reasons = [];
  if (!isObject(plan)) return { allowed: false, reasons: ["adaptation plan is required"] };
  try {
    if (options.requirePreviewRoot) requirePreviewRootBinding(plan, "adaptation-plan", options.projectRoot);
    const checked = validatePlanShape(plan);
    if (checked.componentFitBinding.matrixStatus !== "ready") reasons.push(`component-fit matrix is ${checked.componentFitBinding.matrixStatus}; task eligibility requires a ready result`);
    if (checked.status !== "approved") reasons.push(`adaptation plan is ${checked.status}; approval is required`);
    if (!isObject(checked.approval) || typeof checked.approval.reviewer !== "string" || !checked.approval.reviewer.trim() || typeof checked.approval.rationale !== "string" || !checked.approval.rationale.trim() || !approvalBindsPlan(checked)) reasons.push("adaptation plan has no valid approval record");
    if (!checked.receiptHash) reasons.push("selection receipt binding is missing");
  } catch (error) { reasons.push(error.message); }
  return { allowed: reasons.length === 0, reasons };
}


module.exports = { MANDATORY_FORBIDDEN_COPYING, MANDATORY_PLATFORM_ADAPTATION, PLAN_SCHEMA, PLAN_STATUSES, PRECEDENCE, SELECTION_MODES, SELECTION_SCHEMA, approveAdaptationPlan, canCreateTasks, createAdaptationPlan, createSelectionReceipt, reviewAdaptationPlan, validatePlanShape, validateSelectionReceipt };
