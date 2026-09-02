"use strict";

const { canonicalJson, fail, isObject, nonEmpty, sha256, sortValue } = require("./contract-utils.cjs");
const { normalizeDesignSystemSnapshot, validateCatalog } = require("./design-system-catalog-core.cjs");

const FIT_SCHEMA = "design-pipeline.component-fit-matrix.v1";
const DIRECTION_LOCK_SCHEMA = "design-pipeline.direction-lock.v1";
const DIMENSIONS = Object.freeze(["behavior", "accessibility", "framework", "license", "visualFit", "provenance"]);
const DIMENSION_STATUSES = new Set(["pass", "review", "fail"]);
const DECISIONS = new Set(["reuse", "adopt", "substitute", "custom", "blocked"]);
const ROLES = new Set(["foundation", "provider", "reference-only", "platform-fallback", "project-owned"]);
const PROVIDER_SCHEMA = "design-pipeline.component-provider-registry.v1";
const PROVIDER_STATUSES = new Set(["ready", "review", "experimental"]);
const FRAMEWORKS = new Set(["agnostic", "react", "vue", "nuxt", "svelte", "solid"]);
const HASH = /^[a-f0-9]{64}$/;
const PROVIDER_REGISTRY_KEYS = new Set(["schema", "version", "reviewedAt", "providers"]);
const PROVIDER_KEYS = new Set(["id", "label", "frameworks", "interfaces", "capabilities", "packages", "mode", "status", "source"]);
const PROJECT_INVENTORY_KEYS = new Set(["schema", "status", "framework", "projectRoot", "declarationFile", "components", "componentInventory"]);
const PROJECT_COMPONENT_KEYS = new Set(["id", "file", "framework", "capabilities", "provenance", "accessibility", "status"]);
const PROJECT_COMPONENT_STATUSES = new Set(["ready", "review", "blocked"]);

function assertFramework(value, label) {
  assertString(value, label);
  if (!FRAMEWORKS.has(value)) fail("component-fit", `${label} has an unsupported framework`);
}

function normalizeProjectInventory(source, fallbackFramework) {
  const input = source === undefined || source === null ? {} : source;
  const isArray = Array.isArray(input);
  if (!isArray) assertObject(input, "project component inventory");
  if (!isArray && Object.keys(input).some((key) => !PROJECT_INVENTORY_KEYS.has(key))) {
    fail("component-fit", "project component inventory contains unsupported fields");
  }
  if (!isArray && input.schema !== undefined && input.schema !== "design-pipeline.component-inventory.v1") {
    fail("component-fit", "project component inventory schema is unsupported");
  }
  const governed = !isArray && input.schema !== undefined;
  if (governed) {
    if (input.status !== "ready") fail("component-fit", "project component inventory status must be ready");
    if (!Object.hasOwn(input, "framework") || !Object.hasOwn(input, "projectRoot") || !Object.hasOwn(input, "declarationFile") || !Object.hasOwn(input, "components")) {
      fail("component-fit", "project component inventory is missing required fields");
    }
  } else if (!isArray && input.status !== undefined && !PROJECT_COMPONENT_STATUSES.has(input.status)) {
    fail("component-fit", "project component inventory status is invalid");
  }
  const inheritedFramework = !isArray && input.framework !== undefined ? input.framework : fallbackFramework;
  if (!isArray && input.projectRoot !== undefined) assertString(input.projectRoot, "project component inventory projectRoot");
  if (!isArray && input.declarationFile !== undefined && input.declarationFile !== null) assertString(input.declarationFile, "project component inventory declarationFile");
  if (!isArray && input.components !== undefined && input.componentInventory !== undefined) {
    fail("component-fit", "project component inventory cannot define both components and componentInventory");
  }
  const inventory = isArray ? input : input.componentInventory ?? input.components ?? [];
  if (governed) assertFramework(inheritedFramework, "project component inventory framework");
  else if (inventory.length && inheritedFramework !== undefined && inheritedFramework !== null) assertFramework(inheritedFramework, "project component inventory framework");
  const seen = new Set();
  const components = inventory.map((component, index) => {
    assertObject(component, `project component ${index}`);
    if (Object.keys(component).some((key) => !PROJECT_COMPONENT_KEYS.has(key))) {
      fail("component-fit", `project component ${index} contains unsupported fields`);
    }
    assertString(component.id, `project component ${index}.id`);
    if (seen.has(component.id)) fail("component-fit", `duplicate project component ${component.id}`);
    seen.add(component.id);
    if (component.file !== undefined) assertString(component.file, `project component ${component.id}.file`);
    const framework = component.framework ?? inheritedFramework;
    assertFramework(framework, `project component ${component.id}.framework`);
    assertStringArray(component.capabilities, `project component ${component.id}.capabilities`, { unique: true });
    assertString(component.provenance, `project component ${component.id}.provenance`);
    if (component.accessibility !== undefined
      && typeof component.accessibility !== "boolean"
      && typeof component.accessibility !== "string"
      && !isObject(component.accessibility)
      && !Array.isArray(component.accessibility)) {
      fail("component-fit", `project component ${component.id}.accessibility is invalid`);
    }
    if (component.status !== undefined && !PROJECT_COMPONENT_STATUSES.has(component.status)) {
      fail("component-fit", `project component ${component.id}.status is invalid`);
    }
    return sortValue({ ...component, framework });
  }).sort((a, b) => a.id.localeCompare(b.id) || canonicalJson(a).localeCompare(canonicalJson(b)));
  if (isArray) return { components, array: true, status: "ready" };
  const status = input.status || "ready";
  const document = { ...input, components };
  delete document.componentInventory;
  return { components, array: false, status, document: sortValue(document) };
}
const UNSPECIFIC_LICENSES = new Set(["unverified", "mixed", "unknown", "unspecified", "undisclosed"]);

function assertObject(value, label) {
  if (!isObject(value)) fail("component-fit", `${label} must be an object`);
}

function assertString(value, label) {
  if (!nonEmpty(value)) fail("component-fit", `${label} must be a non-empty string`);
}

function assertHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) fail("component-fit", `${label} must be a SHA-256 hash`);
}

function assertStringArray(value, label, options = {}) {
  if (!Array.isArray(value) || !value.every(nonEmpty)) fail("component-fit", `${label} must contain non-empty strings`);
  if (options.unique && new Set(value).size !== value.length) fail("component-fit", `${label} must contain unique values`);
}
function optionalStringArray(value, label) {
  if (value === undefined) return;
  assertStringArray(value, label, { unique: true });
}

function validateVisualFit(value, label) {
  if (value === undefined) return;
  assertObject(value, label);
  for (const [id, assessment] of Object.entries(value)) {
    assertString(id, `${label} source id`);
    if (typeof assessment === "string") {
      if (!["pass", "review", "fail"].includes(assessment)) fail("component-fit", `${label}.${id} has invalid status`);
      continue;
    }
    assertObject(assessment, `${label}.${id}`);
    if (!["pass", "review", "fail"].includes(assessment.status)) fail("component-fit", `${label}.${id}.status has invalid value`);
    if (assessment.reason !== undefined) assertString(assessment.reason, `${label}.${id}.reason`);
  }
}

function canonicalDirectionLockBody(lock) {
  const body = { ...lock };
  delete body.directionLockHash;
  return body;
}
function createDirectionLock(input) {
  assertObject(input, "direction lock");
  assertString(input.directionId, "directionLock.directionId");
  assertHash(input.selectionReceiptHash, "directionLock.selectionReceiptHash");
  assertHash(input.previewArtifactSha256, "directionLock.previewArtifactSha256");
  assertObject(input.constraints, "directionLock.constraints");
  if (input.foundationId !== undefined) assertString(input.foundationId, "directionLock.foundationId");
  optionalStringArray(input.preferredSources, "directionLock.preferredSources");
  optionalStringArray(input.rejectedSources, "directionLock.rejectedSources");
  optionalStringArray(input.visualKeywords, "directionLock.visualKeywords");
  validateVisualFit(input.visualFit, "directionLock.visualFit");
  const body = sortValue({
    schema: DIRECTION_LOCK_SCHEMA,
    status: "locked",
    directionId: input.directionId,
    selectionReceiptHash: input.selectionReceiptHash,
    previewArtifactSha256: input.previewArtifactSha256,
    constraints: input.constraints,
    ...(input.foundationId ? { foundationId: input.foundationId } : {}),
    ...(Array.isArray(input.preferredSources) ? { preferredSources: [...input.preferredSources].sort() } : {}),
    ...(Array.isArray(input.rejectedSources) ? { rejectedSources: [...input.rejectedSources].sort() } : {}),
    ...(Array.isArray(input.visualKeywords) ? { visualKeywords: [...input.visualKeywords].sort() } : {}),
    ...(isObject(input.visualFit) ? { visualFit: sortValue(input.visualFit) } : {}),
  });
  return sortValue({ ...body, directionLockHash: sha256(canonicalJson(body)) });
}

function validateDirectionLock(lock) {
  assertObject(lock, "direction lock");
  if (lock.schema !== DIRECTION_LOCK_SCHEMA || lock.status !== "locked") fail("component-fit", "a locked direction-lock.v1 is required");
  for (const [key, label] of [["directionId", "directionLock.directionId"], ["selectionReceiptHash", "directionLock.selectionReceiptHash"], ["previewArtifactSha256", "directionLock.previewArtifactSha256"], ["directionLockHash", "directionLock.directionLockHash"]]) {
    assertString(lock[key], label);
  }
  assertHash(lock.selectionReceiptHash, "directionLock.selectionReceiptHash");
  assertHash(lock.previewArtifactSha256, "directionLock.previewArtifactSha256");
  assertHash(lock.directionLockHash, "directionLock.directionLockHash");
  assertObject(lock.constraints, "directionLock.constraints");
  if (lock.foundationId !== undefined) assertString(lock.foundationId, "directionLock.foundationId");
  optionalStringArray(lock.preferredSources, "directionLock.preferredSources");
  optionalStringArray(lock.rejectedSources, "directionLock.rejectedSources");
  optionalStringArray(lock.visualKeywords, "directionLock.visualKeywords");
  validateVisualFit(lock.visualFit, "directionLock.visualFit");
  if (sha256(canonicalJson(canonicalDirectionLockBody(lock))) !== lock.directionLockHash) fail("component-fit", "direction lock hash is stale");
  return sortValue(lock);
}

function entryName(entry) {
  return typeof entry.name === "string" ? entry.name : entry.name?.en || entry.name?.zh || entry.localId;
}

function classifyRole(entry) {
  const mode = entry.routing?.mode;
  const category = entry.category || "";
  if (mode === "platform") return "platform-fallback";
  if (mode === "project-owned") return "project-owned";
  if (mode === "reference-adaptation") return "reference-only";
  if (category === "component-library" || category === "foundation") return "foundation";
  if (mode === "package" || mode === "registry-copy") return "provider";
  return "reference-only";
}

function entryPlatforms(entry) {
  return Array.isArray(entry.routing?.platforms) ? entry.routing.platforms : [];
}

function evidenceStatus(entry) {
  return entry.routing?.evidenceStatus || "unverified";
}

function hasAccessibilitySignal(value) {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized || /\b(?:not|no|never|unverified|unsupported|inaccessible|failed|fail|missing|none)\b/.test(normalized)) return false;
  return /verified|accessible|keyboard|focus|aria|reduced[- ]motion/.test(normalized);
}
function hasAccessibleSignal(entry) {
  const explicit = entry.alignment?.accessibility;
  if (explicit !== undefined) return hasAccessibilitySignal(explicit);
  const values = [
    entry.alignment?.quality,
    entry.routing?.fallback,
    entry.routing?.description,
    ...(entry.componentInventory || []).flatMap((item) => Object.values(item)),
  ];
  return values.some((value) => hasAccessibilitySignal(typeof value === "string" ? value : JSON.stringify(value)));
}
function candidateKeywords(entry) {
  return JSON.stringify({ name: entry.name, category: entry.category, routing: entry.routing, alignment: entry.alignment }).toLowerCase();
}
function visualFitStatus(entry, directionLock) {
  const id = entry.id;
  if (directionLock.rejectedSources?.includes(id)) return { status: "fail", reason: "direction lock rejects this source" };
  const explicit = directionLock.visualFit?.[id];
  if (explicit === "pass" || explicit?.status === "pass") return { status: "pass", reason: explicit?.reason || "direction lock records a visual-fit approval" };
  if (explicit === "fail" || explicit?.status === "fail") return { status: "fail", reason: explicit?.reason || "direction lock records a visual-fit rejection" };
  if (explicit === "review" || explicit?.status === "review") return { status: "review", reason: explicit?.reason || "direction lock requires visual-fit review" };
  if (directionLock.preferredSources?.includes(id)) return { status: "pass", reason: "direction lock prefers this source" };
  const keywords = (directionLock.visualKeywords || []).map((value) => String(value).toLowerCase()).filter(Boolean);
  if (keywords.length && keywords.some((keyword) => candidateKeywords(entry).includes(keyword))) {
    return { status: "pass", reason: "source metadata matches a locked visual keyword" };
  }
  return { status: "review", reason: "visual fit requires comparison against the locked direction" };
}
function projectComponents(normalized) {
  return normalized.components.map((component) => ({
    id: component.id,
    capabilities: [...component.capabilities].sort(),
    framework: component.framework,
    accessibility: component.accessibility || null,
    provenance: component.provenance,
    status: component.status || normalized.status || "ready",
  }));
}

function projectInventoryDocument(normalized) {
  return normalized.array ? normalized.components : normalized.document;
}

function fitDimension(entry, capability, dimension, request, directionLock) {
  const platforms = entryPlatforms(entry);
  if (dimension === "behavior") {
    return entry.routing?.capabilities?.includes(capability)
      ? { status: "pass", reason: "catalog declares the requested capability" }
      : { status: "fail", reason: "catalog does not declare the requested capability" };
  }
  if (dimension === "framework") {
    const requestedFramework = typeof request.framework === "string" ? request.framework.toLowerCase() : null;
    const candidateFramework = typeof entry.alignment?.framework === "string" ? entry.alignment.framework.toLowerCase() : null;
    if (request.platform && platforms.length && !platforms.includes(request.platform)) return { status: "fail", reason: `source does not target ${request.platform}` };
    const platformFramework = request.platform === "web" && ["agnostic", "web", "web platform"].includes(candidateFramework);
    if (requestedFramework && candidateFramework && candidateFramework !== requestedFramework && !platformFramework) return { status: "fail", reason: `source targets ${entry.alignment.framework}, not ${request.framework}` };
    if (!platforms.length && !candidateFramework) return { status: "review", reason: "framework/platform compatibility is undocumented" };
    return { status: "pass", reason: "framework/platform compatibility is declared" };
  }
  if (dimension === "accessibility") {
    if (hasAccessibleSignal(entry)) return { status: "pass", reason: "catalog contains accessibility evidence" };
    return { status: "review", reason: "accessibility behavior requires implementation verification" };
  }
  if (dimension === "license") {
    const license = typeof entry.provenance?.license === "string" ? entry.provenance.license.trim().toLowerCase() : null;
    if (entry.routing?.requiresLicense || (license && UNSPECIFIC_LICENSES.has(license))) return { status: "review", reason: "license or commercial terms require project review" };
    if (!nonEmpty(entry.provenance?.license)) return { status: "fail", reason: "source has no license declaration" };
    return { status: "pass", reason: "source license is declared" };
  }
  if (dimension === "provenance") {
    if (evidenceStatus(entry) === "verified") return { status: "pass", reason: "source evidence is verified" };
    if (evidenceStatus(entry) === "user-provided") return { status: "review", reason: "source is user-provided and metadata-only" };
    return { status: "fail", reason: "source evidence is unverified" };
  }
  if (dimension === "visualFit") return visualFitStatus(entry, directionLock);
  return { status: "review", reason: "dimension is not evaluated" };
}
function fitDimensions(entry, capability, request, directionLock) {
  return Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, fitDimension(entry, capability, dimension, request, directionLock)]));
}

function candidateStatus(dimensions) {
  const statuses = Object.values(dimensions).map(({ status }) => status);
  if (statuses.includes("fail")) return "blocked";
  if (statuses.includes("review")) return "review";
  return "ready";
}



function projectCandidate(component, capability, request, directionLock) {
  const pseudoEntry = {
    id: `project:${component.id}`,
    localId: component.id,
    name: component.id,
    category: "project-owned",
    routing: { mode: "project-owned", capabilities: component.capabilities, platforms: request.platform ? [request.platform] : [] },
    provenance: { license: "project-owned", source: "project" },
    alignment: { framework: component.framework, accessibility: component.accessibility },
  };
  const dimensions = fitDimensions(pseudoEntry, capability, request, directionLock);
  dimensions.provenance = component.provenance === "project-declared"
    ? { status: "pass", reason: "project component capability is explicitly declared" }
    : { status: "review", reason: "project component capability declaration is missing" };
  const computedStatus = candidateStatus(dimensions);
  const status = component.status === "blocked"
    ? "blocked"
    : component.status === "review" && computedStatus === "ready"
      ? "review"
      : computedStatus;
  return { id: pseudoEntry.id, source: "project", name: component.id, role: "project-owned", status, dimensions, entry: pseudoEntry };
}
function summarizeCandidate(entry, capability, request, directionLock) {
  const dimensions = fitDimensions(entry, capability, request, directionLock);
  const status = candidateStatus(dimensions);
  return {
    id: entry.id,
    source: entry.provenance?.source || entryName(entry),
    sourceUrl: entry.provenance?.url || null,
    name: entryName(entry),
    role: classifyRole(entry),
    status,
    dimensions,
    capabilities: [...(entry.routing?.capabilities || [])].sort(),
    mode: entry.routing?.mode || null,
    fallback: entry.routing?.fallback || null,
    license: entry.provenance?.license || null,
    evidenceStatus: evidenceStatus(entry),
    requiresLicense: entry.routing?.requiresLicense === true,
  };
}

function providerCandidates(providers, capability, request, directionLock) {
  return providers.filter((provider) => provider.capabilities?.includes(capability)).map((provider) => {
    const entry = {
      id: `provider:${provider.id}`,
      name: provider.label || provider.id,
      category: "provider",
      routing: {
        mode: provider.mode === "project-owned" ? "project-owned" : "package",
        capabilities: provider.capabilities,
        platforms: [request.platform],
      },
      provenance: {
        license: provider.mode === "project-owned" ? "project-owned" : provider.license || null,
        source: provider.source || provider.id,
        url: provider.source || null,
      },
      alignment: { framework: request.framework },
    };
    const dimensions = fitDimensions(entry, capability, request, directionLock);
    const requestedFramework = typeof request.framework === "string" ? request.framework.toLowerCase() : null;
    const providerFrameworks = (provider.frameworks || []).map((framework) => framework.toLowerCase());
    const compatibleFramework = !requestedFramework || providerFrameworks.includes(requestedFramework) || providerFrameworks.includes("agnostic");
    dimensions.framework = compatibleFramework
      ? { status: "pass", reason: "provider declares framework compatibility" }
      : { status: "fail", reason: "provider does not target the requested framework" };
    const hasAccessibilityEvidence = ["aria.control-semantics", "focus.management", "keyboard.navigation"].some((signal) => provider.capabilities.includes(signal));
    dimensions.accessibility = provider.status === "ready" && hasAccessibilityEvidence
      ? { status: "pass", reason: "ready provider declares accessibility capabilities" }
      : { status: "review", reason: "provider accessibility behavior requires verification" };
    dimensions.provenance = provider.status === "ready"
      ? { status: "pass", reason: "provider registry entry is ready" }
      : { status: "review", reason: "provider registry entry is not ready" };
    const status = candidateStatus(dimensions);
    return {
      id: entry.id,
      source: entry.provenance.source,
      sourceUrl: entry.provenance.url,
      name: entry.name,
      role: provider.mode === "project-owned" ? "project-owned" : "provider",
      status,
      dimensions,
      capabilities: [...provider.capabilities].sort(),
      mode: provider.mode,
      fallback: null,
      license: entry.provenance.license,
      evidenceStatus: provider.status,
      requiresLicense: false,
    };
  });
}

function candidateDecision(candidates, capability, directionLock) {
  const ready = candidates.filter((candidate) => candidate.status === "ready");
  if (!ready.length) {
    const hasCandidates = candidates.length > 0;
    const blockers = candidates.flatMap((candidate) => Object.entries(candidate.dimensions)
      .filter(([, value]) => value.status === "fail")
      .map(([dimension, value]) => ({ candidate: candidate.id, dimension, reason: value.reason })));
    return {
      capability,
      action: hasCandidates ? "blocked" : "custom",
      candidate: null,
      reason: hasCandidates
        ? "no candidate passes all fit dimensions"
        : "no catalog or project candidate declares this capability",
      blockers,
    };
  }
  const reusable = ready.find((candidate) => candidate.role === "project-owned");
  if (reusable) return { capability, action: "reuse", candidate: reusable.id, reason: "project-owned component passes the fit gates", blockers: [] };
  const foundation = ready.filter((candidate) => candidate.role === "foundation");
  if (foundation.length > 1 && !directionLock.foundationId) {
    return { capability, action: "blocked", candidate: null, reason: "multiple foundation candidates pass; lock one system before adoption", blockers: foundation.map((candidate) => ({ candidate: candidate.id, dimension: "foundation", reason: "foundation coherence requires an explicit choice" })) };
  }
  if (directionLock.foundationId && foundation.length) {
    const locked = foundation.find((candidate) => candidate.id === directionLock.foundationId);
    if (!locked) {
      return { capability, action: "blocked", candidate: null, reason: "direction lock names a foundation that does not pass this capability", blockers: [{ candidate: directionLock.foundationId, dimension: "foundation", reason: "locked foundation is unavailable or fails fit gates" }] };
    }
  }
  const preferred = directionLock.foundationId ? ready.find((candidate) => candidate.id === directionLock.foundationId) : null;
  const selected = preferred || foundation[0] || ready[0];
  let action = "adopt";
  if (selected.role === "platform-fallback" || selected.role === "reference-only") action = "substitute";
  const reason = action === "adopt"
    ? "candidate passes all fit gates"
    : "candidate is a fallback/reference and must remain project-owned";
  return { capability, action, candidate: selected.id, reason, blockers: [] };
}

function providerEntries(input) {
  if (input.providers === undefined) return [];
  if (!isObject(input.providers) || input.providers.schema !== PROVIDER_SCHEMA || input.providers.version !== "1") {
    fail("component-fit", "providers must be the governed component-provider-registry.v1 document");
  }
  if (Object.keys(input.providers).some((key) => !PROVIDER_REGISTRY_KEYS.has(key))) fail("component-fit", "provider registry contains unsupported fields");
  assertString(input.providers.reviewedAt, "provider registry reviewedAt");
  const reviewedAt = input.providers.reviewedAt;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) || Number.isNaN(Date.parse(`${reviewedAt}T00:00:00Z`)) || new Date(`${reviewedAt}T00:00:00Z`).toISOString().slice(0, 10) !== reviewedAt) {
    fail("component-fit", "provider registry reviewedAt must be an ISO date");
  }
  const providers = input.providers.providers;
  if (!Array.isArray(providers) || providers.length === 0) fail("component-fit", "provider registry must contain providers");
  const capabilityIds = input.capabilityRegistry?.capabilities
    ? new Set(input.capabilityRegistry.capabilities.map((capability) => capability.id))
    : null;
  const seen = new Set();
  return providers.map((provider) => {
    assertObject(provider, "provider");
    if (Object.keys(provider).some((key) => !PROVIDER_KEYS.has(key))) fail("component-fit", "provider contains unsupported fields");
    assertString(provider.id, "provider.id");
    if (seen.has(provider.id)) fail("component-fit", `duplicate provider id ${provider.id}`);
    seen.add(provider.id);
    assertString(provider.label, `provider.${provider.id}.label`);
    assertStringArray(provider.frameworks, `provider.${provider.id}.frameworks`, { unique: true });
    if (!provider.frameworks.length || provider.frameworks.some((framework) => !FRAMEWORKS.has(framework))) {
      fail("component-fit", `${provider.id} has an unsupported framework`);
    }
    assertStringArray(provider.interfaces, `provider.${provider.id}.interfaces`, { unique: true });
    if (!provider.interfaces.length) fail("component-fit", `${provider.id}.interfaces must not be empty`);
    assertStringArray(provider.capabilities, `provider.${provider.id}.capabilities`, { unique: true });
    if (!provider.capabilities.length) fail("component-fit", `provider.${provider.id}.capabilities must not be empty`);
    if (capabilityIds && provider.capabilities.some((capability) => !capabilityIds.has(capability))) {
      fail("component-fit", `${provider.id} provides unknown capability`);
    }
    assertObject(provider.packages, `provider.${provider.id}.packages`);
    for (const [framework, packages] of Object.entries(provider.packages)) {
      if (!FRAMEWORKS.has(framework)) fail("component-fit", `${provider.id}.packages has unsupported framework ${framework}`);
      assertStringArray(packages, `provider.${provider.id}.packages.${framework}`, { unique: true });
      if (!packages.length) fail("component-fit", `${provider.id}.packages.${framework} must not be empty`);
    }
    if (!["project-owned", "project-pinned-adapter"].includes(provider.mode)) fail("component-fit", `${provider.id}.mode is invalid`);
    assertString(provider.source, `provider.${provider.id}.source`);
    if (!PROVIDER_STATUSES.has(provider.status)) fail("component-fit", `${provider.id}.status is invalid`);
    return sortValue(provider);
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function normalizedProviderDocument(source, providers) {
  if (Array.isArray(source)) return providers;
  if (isObject(source)) return sortValue({ ...source, providers });
  return providers;
}
function normalizedCatalogDocument(catalog) {
  return sortValue({ ...catalog, entries: [...catalog.entries].sort((a, b) => a.id.localeCompare(b.id)) });
}
function validateComponentCatalogRouting(catalog) {
  for (const entry of catalog.entries) {
    if (entry.routing !== undefined) assertObject(entry.routing, `catalog entry ${entry.id}.routing`);
    for (const key of ["capabilities", "platforms"]) {
      if (entry.routing?.[key] !== undefined) assertStringArray(entry.routing[key], `catalog entry ${entry.id}.routing.${key}`, { unique: true });
    }
  }
}

function buildComponentFitMatrix(input) {
  assertObject(input, "component fit request");
  if (input.schema && input.schema !== "design-pipeline.component-fit-request.v1") fail("component-fit", "unsupported component fit request schema");
  const directionLock = validateDirectionLock(input.directionLock);
  const catalog = input.catalog?.schema === "design-pipeline.design-system-catalog.v1"
    ? validateCatalog(input.catalog)
    : normalizeDesignSystemSnapshot(input.catalog);
  validateComponentCatalogRouting(catalog);
  const providers = providerEntries(input);
  const providerDocument = normalizedProviderDocument(input.providers || [], providers);
  assertStringArray(input.capabilities, "capabilities", { unique: true });
  const capabilities = [...new Set(input.capabilities)].sort();
  if (!capabilities.length) fail("component-fit", "capabilities must not be empty");
  assertString(input.framework, "component fit framework");
  if (input.platform !== undefined) assertString(input.platform, "component fit platform");
  const request = { framework: input.framework, platform: input.platform || "web", project: input.project || {} };
  const normalizedProject = normalizeProjectInventory(input.project, request.framework);
  const project = projectComponents(normalizedProject);
  const projectInventory = projectInventoryDocument(normalizedProject);
  const entries = catalog.entries.filter((entry) => entry.kind === "component" && (!request.platform || !entryPlatforms(entry).length || entryPlatforms(entry).includes(request.platform)));
  const rows = capabilities.map((capability) => {
    const candidates = [
      ...project.filter((component) => component.capabilities.includes(capability)).map((component) => projectCandidate(component, capability, request, directionLock)),
      ...providerCandidates(providers, capability, request, directionLock),
      ...entries.filter((entry) => entry.routing?.capabilities?.includes(capability)).map((entry) => summarizeCandidate(entry, capability, request, directionLock)),
    ].sort((a, b) => a.id.localeCompare(b.id));
    const decision = candidateDecision(candidates, capability, directionLock);
    return { capability, candidates, decision };
  });
  const foundationCandidates = [...new Set(rows.flatMap((row) => row.candidates.filter((candidate) => candidate.role === "foundation").map((candidate) => candidate.id)))].sort();
  const foundationReadyCandidates = [...new Set(rows.flatMap((row) => row.candidates.filter((candidate) => candidate.role === "foundation" && candidate.status === "ready").map((candidate) => candidate.id)))].sort();
  const foundationUnknown = directionLock.foundationId && !foundationCandidates.includes(directionLock.foundationId);
  const foundationAmbiguous = foundationReadyCandidates.length > 1 && !directionLock.foundationId;
  if (foundationAmbiguous) {
    const blockers = foundationReadyCandidates.map((candidate) => ({ candidate, dimension: "foundation", reason: "foundation coherence requires an explicit choice" }));
    for (const row of rows) {
      row.decision = {
        capability: row.capability,
        action: "blocked",
        candidate: null,
        reason: "multiple ready foundation sources require one explicit lock",
        blockers,
      };
    }
  }
  const decisions = rows.map((row) => row.decision);
  const hasBlocked = decisions.some((decision) => decision.action === "blocked");
  const hasCustom = decisions.some((decision) => decision.action === "custom");
  const hasSubstitute = decisions.some((decision) => decision.action === "substitute");
  const foundationSelection = directionLock.foundationId || (foundationReadyCandidates.length === 1 ? foundationReadyCandidates[0] : null);
  const foundationSelectionNotReady = Boolean(foundationSelection && !foundationReadyCandidates.includes(foundationSelection));
  let status = "ready";
  if (hasBlocked || hasCustom || foundationUnknown || foundationAmbiguous || foundationSelectionNotReady) {
    status = "blocked";
  } else if (hasSubstitute) {
    status = "review";
  }
  let foundationCoherence = "requires-selection";
  let foundationBlocker = null;
  if (foundationUnknown) {
    foundationCoherence = "blocked";
    foundationBlocker = { candidate: directionLock.foundationId, reason: "direction lock names an unknown foundation source" };
  } else if (foundationAmbiguous) {
    foundationCoherence = "blocked";
    foundationBlocker = { candidates: foundationReadyCandidates, reason: "multiple ready foundation sources require one explicit lock" };
  } else if (foundationSelectionNotReady) {
    foundationCoherence = "blocked";
    foundationBlocker = { candidate: foundationSelection, reason: "selected foundation source is not ready" };
  } else if (foundationSelection) {
    foundationCoherence = "locked";
  }
  const foundation = {
    candidates: foundationCandidates,
    selected: foundationSelection,
    coherence: foundationCoherence,
    blocker: foundationBlocker,
  };
  const body = sortValue({
    schema: FIT_SCHEMA,
    version: 1,
    status,
    platform: request.platform,
    framework: request.framework,
    catalogHash: sha256(canonicalJson(normalizedCatalogDocument(catalog))),
    providerHash: sha256(canonicalJson(providerDocument)),
    projectHash: sha256(canonicalJson(projectInventory)),
    directionLock: {
      directionId: directionLock.directionId,
      directionLockHash: directionLock.directionLockHash,
      previewArtifactSha256: directionLock.previewArtifactSha256,
    },
    foundation,
    capabilities,
    rows,
    decisions,
    constraints: [
      "direction-lock.v1 must be hash-valid before component fit",
      "fit is evaluated per capability; no global best library is selected",
      "foundation candidates require one coherent system selection",
      "reference-only sources never become direct project dependencies",
      "review dimensions cannot be promoted without evidence",
    ],
  });
  return sortValue({ ...body, matrixHash: sha256(canonicalJson(body)) });
}
function validateDecisionCandidate(decision, candidate, label, selectedFoundation) {
  if (["reuse", "adopt", "substitute"].includes(decision.action) && !candidate) {
    fail("component-fit", `${label} references an unknown candidate`);
  }
  if (decision.action === "reuse" && candidate.role !== "project-owned") fail("component-fit", `${label} reuse requires a project-owned candidate`);
  if (decision.action === "adopt" && ["project-owned", "reference-only", "platform-fallback"].includes(candidate.role)) {
    fail("component-fit", `${label} adopt is invalid for candidate role ${candidate.role}`);
  }
  if (decision.action === "adopt" && candidate.role === "foundation" && selectedFoundation !== null && candidate.id !== selectedFoundation) {
    fail("component-fit", `${label} adopt conflicts with the selected foundation`);
  }
  if (decision.action === "substitute" && !["reference-only", "platform-fallback"].includes(candidate.role)) {
    fail("component-fit", `${label} substitute requires a reference or platform fallback`);
  }
  if (["reuse", "adopt", "substitute"].includes(decision.action) && candidate.status !== "ready") {
    fail("component-fit", `${label} decision requires a ready candidate`);
  }
}
function deriveFoundationState(rows, selected) {
  const candidates = [...new Set(rows.flatMap((row) => row.candidates.filter((candidate) => candidate.role === "foundation").map((candidate) => candidate.id)))].sort();
  const readyCandidates = [...new Set(rows.flatMap((row) => row.candidates.filter((candidate) => candidate.role === "foundation" && candidate.status === "ready").map((candidate) => candidate.id)))].sort();
  const unknownSelection = selected !== null && !candidates.includes(selected);
  const invalidSelection = selected !== null && !readyCandidates.includes(selected);
  const ambiguous = readyCandidates.length > 1 && selected === null;
  const missingSelection = readyCandidates.length === 1 && selected === null;
  const blocked = unknownSelection || invalidSelection || ambiguous || missingSelection;
  return {
    candidates,
    selected,
    coherence: blocked ? "blocked" : selected ? "locked" : "requires-selection",
    blocked,
  };
}
function validateMatrixShape(matrix) {
  if (matrix.schema !== FIT_SCHEMA || matrix.version !== 1 || !["ready", "review", "blocked"].includes(matrix.status)) fail("component-fit", "component fit matrix header is invalid");
  for (const [key, label] of [["catalogHash", "matrix.catalogHash"], ["providerHash", "matrix.providerHash"], ["projectHash", "matrix.projectHash"], ["matrixHash", "matrix.matrixHash"]]) assertHash(matrix[key], label);
  assertString(matrix.platform, "matrix.platform");
  assertString(matrix.framework, "matrix.framework");
  assertObject(matrix.directionLock, "matrix.directionLock");
  assertString(matrix.directionLock.directionId, "matrix.directionLock.directionId");
  assertHash(matrix.directionLock.directionLockHash, "matrix.directionLock.directionLockHash");
  assertHash(matrix.directionLock.previewArtifactSha256, "matrix.directionLock.previewArtifactSha256");
  assertObject(matrix.foundation, "matrix.foundation");
  assertStringArray(matrix.foundation.candidates, "matrix.foundation.candidates", { unique: true });
  if (matrix.foundation.selected !== null) assertString(matrix.foundation.selected, "matrix.foundation.selected");
  if (!["locked", "requires-selection", "blocked"].includes(matrix.foundation.coherence)) fail("component-fit", "matrix.foundation.coherence is invalid");
  assertStringArray(matrix.capabilities, "matrix.capabilities", { unique: true });
  if (!matrix.capabilities.length) fail("component-fit", "matrix.capabilities must not be empty");
  if (!Array.isArray(matrix.rows) || matrix.rows.length !== matrix.capabilities.length) fail("component-fit", "matrix.rows must cover every capability");
  const seenCapabilities = new Set();
  const rowsByCapability = new Map();
  for (const row of matrix.rows) {
    assertObject(row, "matrix row");
    assertString(row.capability, "matrix row capability");
    if (seenCapabilities.has(row.capability)) fail("component-fit", `duplicate matrix row ${row.capability}`);
    seenCapabilities.add(row.capability);
    rowsByCapability.set(row.capability, row);
    if (!Array.isArray(row.candidates)) fail("component-fit", `matrix row ${row.capability} candidates must be an array`);
    const candidateIds = new Set();
    const candidatesById = new Map();
    for (const candidate of row.candidates) {
      assertObject(candidate, "matrix candidate");
      assertString(candidate.id, "matrix candidate.id");
      if (candidateIds.has(candidate.id)) fail("component-fit", `duplicate matrix candidate ${candidate.id}`);
      candidateIds.add(candidate.id);
      candidatesById.set(candidate.id, candidate);
      if (!ROLES.has(candidate.role) || !["ready", "review", "blocked"].includes(candidate.status)) fail("component-fit", "matrix candidate role/status is invalid");
      assertObject(candidate.dimensions, "matrix candidate.dimensions");
      if (Object.keys(candidate.dimensions).length !== DIMENSIONS.length || DIMENSIONS.some((dimension) => !Object.hasOwn(candidate.dimensions, dimension))) {
        fail("component-fit", `matrix candidate ${candidate.id} dimensions are invalid`);
      }
      for (const dimension of DIMENSIONS) {
        if (!DIMENSION_STATUSES.has(candidate.dimensions[dimension]?.status)) fail("component-fit", `matrix candidate ${candidate.id} has invalid ${dimension} status`);
      }
      if (candidate.status !== candidateStatus(candidate.dimensions)) fail("component-fit", `matrix candidate ${candidate.id} status contradicts its dimension statuses`);
    }
    assertObject(row.decision, `matrix row ${row.capability} decision`);
    validateMatrixDecision(row.decision, row.capability, candidateIds, `matrix row ${row.capability} decision`);
    validateDecisionCandidate(row.decision, candidatesById.get(row.decision.candidate), `matrix row ${row.capability} decision`, matrix.foundation.selected);
  }
  if (seenCapabilities.size !== matrix.capabilities.length || matrix.capabilities.some((capability) => !seenCapabilities.has(capability))) fail("component-fit", "matrix rows do not match capabilities");
  if (!Array.isArray(matrix.decisions) || matrix.decisions.length !== matrix.rows.length) fail("component-fit", "matrix.decisions must cover every capability");
  const seenDecisions = new Set();
  for (const decision of matrix.decisions) {
    assertObject(decision, "matrix decision");
    const row = rowsByCapability.get(decision.capability);
    if (!row || seenDecisions.has(decision.capability)) fail("component-fit", "matrix decisions do not match rows");
    seenDecisions.add(decision.capability);
    const candidateIds = new Set(row.candidates.map((candidate) => candidate.id));
    const candidate = row.candidates.find((item) => item.id === decision.candidate);
    validateMatrixDecision(decision, decision.capability, candidateIds, "matrix decision");
    validateDecisionCandidate(decision, candidate, "matrix decision", matrix.foundation.selected);
    if (canonicalJson(decision) !== canonicalJson(row.decision)) fail("component-fit", `matrix decision ${decision.capability} disagrees with row decision`);
  }
  const foundationState = deriveFoundationState(matrix.rows, matrix.foundation.selected);
  if (canonicalJson(matrix.foundation.candidates) !== canonicalJson(foundationState.candidates)
    || matrix.foundation.coherence !== foundationState.coherence) {
    fail("component-fit", "matrix foundation state contradicts candidates");
  }
  const hasBlocked = matrix.decisions.some((decision) => decision.action === "blocked");
  const hasCustom = matrix.decisions.some((decision) => decision.action === "custom");
  const hasSubstitute = matrix.decisions.some((decision) => decision.action === "substitute");
  const expectedStatus = foundationState.blocked || hasBlocked || hasCustom ? "blocked" : hasSubstitute ? "review" : "ready";
  if (matrix.status !== expectedStatus) fail("component-fit", "matrix status contradicts rows and foundation");
  assertStringArray(matrix.constraints, "matrix.constraints", { unique: true });
}
function validateMatrixDecision(decision, capability, candidateIds, label) {
  if (!DECISIONS.has(decision.action) || decision.capability !== capability) fail("component-fit", `${label} is invalid`);
  if (!Object.hasOwn(decision, "candidate") || (decision.candidate !== null && !nonEmpty(decision.candidate))) fail("component-fit", `${label}.candidate is invalid`);
  if (["reuse", "adopt", "substitute"].includes(decision.action) && (!decision.candidate || !candidateIds.has(decision.candidate))) fail("component-fit", `${label} references an unknown candidate`);
  if (["custom", "blocked"].includes(decision.action) && decision.candidate !== null) fail("component-fit", `${label} must not select a candidate`);
}

function validateComponentFitMatrix(matrix, options = {}) {
  assertObject(matrix, "component fit matrix");
  validateMatrixShape(matrix);
  const body = { ...matrix };
  delete body.matrixHash;
  if (sha256(canonicalJson(body)) !== matrix.matrixHash) fail("component-fit", "component fit matrix hash is stale");
  if (options.directionLock) {
    const directionLock = validateDirectionLock(options.directionLock);
    if (directionLock.directionLockHash !== matrix.directionLock?.directionLockHash
      || directionLock.directionId !== matrix.directionLock?.directionId
      || directionLock.previewArtifactSha256 !== matrix.directionLock?.previewArtifactSha256) {
      fail("component-fit", "component fit matrix direction lock binding is stale");
    }
  }
  if (options.catalog) {
    const catalog = options.catalog?.schema === "design-pipeline.design-system-catalog.v1"
      ? validateCatalog(options.catalog)
      : normalizeDesignSystemSnapshot(options.catalog);
    if (sha256(canonicalJson(normalizedCatalogDocument(catalog))) !== matrix.catalogHash) fail("component-fit", "component fit matrix catalog binding is stale");
  }
  if (options.providers) {
    const providers = providerEntries({ providers: options.providers });
    if (sha256(canonicalJson(normalizedProviderDocument(options.providers, providers))) !== matrix.providerHash) fail("component-fit", "component fit matrix provider binding is stale");
  }
  if (options.project) {
    const normalizedProject = normalizeProjectInventory(options.project, matrix.framework);
    const projectInventory = projectInventoryDocument(normalizedProject);
    if (sha256(canonicalJson(projectInventory)) !== matrix.projectHash) fail("component-fit", "component fit matrix project binding is stale");
  }
  return sortValue(matrix);
}

module.exports = {
  DECISIONS,
  DIMENSIONS,
  DIRECTION_LOCK_SCHEMA,
  FIT_SCHEMA,
  ROLES,
  buildComponentFitMatrix,
  createDirectionLock,
  validateComponentFitMatrix,
  validateDirectionLock,
};
