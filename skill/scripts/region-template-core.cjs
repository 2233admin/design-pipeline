"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  fail,
  isObject,
  nonEmpty,
  sha256,
} = require("./contract-utils.cjs");
const { resolveContainedReference } = require("./reference-evidence-core.cjs");
const { validateSurfaceBinding, resolveSurfaceProfile } = require("./surface-profile-core.cjs");

const SOURCE_SCHEMA = "design-pipeline.reference-source.v1";
const CATALOG_SCHEMA = "design-pipeline.region-template-catalog.v1";
const TEMPLATE_SCHEMA = "design-pipeline.region-template.v1";
const SOURCE_KINDS = ["project_page", "local_html"];
const PARSE_STATUSES = ["pending", "parsed", "blocked", "unavailable", "invalid"];
const CATALOG_STATUSES = ["candidate", "active", "deprecated", "blocked"];
const FRAMEWORKS = new Set(["agnostic", "react", "react-native", "vue", "nuxt", "svelte", "solid"]);
const PLATFORMS = new Set(["web", "mobile", "game", "agnostic"]);
const UNSPECIFIED_LICENSES = new Set(["", "unknown", "unverified", "unspecified", "undisclosed", "missing"]);
const REGION_KEYS = [
  "schema", "templateId", "templateVersion", "regionKind", "capabilities", "layoutTraits",
  "componentsUsed", "framework", "platform", "license", "provenance", "adaptationBoundary", "catalogStatus",
];
const REGION_OPTIONAL_KEYS = ["accessibility"];
const CATALOG_KEYS = ["schema", "version", "entries"];
const SOURCE_KEYS = [
  "schema", "referenceId", "sourceKind", "pathOrProjectRef", "contentHash", "capturedAt",
  "provenance", "licenseState", "allowedDerivations", "parseStatus",
];
const REASON_CODES = Object.freeze({
  REGION_KIND: "region-kind-mismatch",
  CAPABILITIES: "capability-mismatch",
  PLATFORM: "surface-platform-mismatch",
  FRAMEWORK: "surface-framework-mismatch",
  ACCESSIBILITY: "accessibility-not-supported",
  LICENSE: "license-unavailable",
  PROVENANCE: "provenance-unavailable",
  LAYOUT: "layout-trait-mismatch",
  COMPONENT: "component-fit-binding-failed",
  STATUS: "catalog-status-not-eligible",
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isTimestamp(value) {
  return typeof value === "string" && nonEmpty(value) && Number.isFinite(Date.parse(value));
}

function safeSourceId(input, contentHash) {
  if (typeof input.referenceId === "string" && input.referenceId.trim()) return input.referenceId;
  return `reference:${sha256(`${input.sourceKind || "invalid"}:${input.pathOrProjectRef || ""}:${contentHash}`).slice(0, 24)}`;
}

function invalidSource(input, reason, parseStatus = "invalid") {
  const source = isObject(input) ? input : {};
  const contentHash = /^[a-f0-9]{64}$/i.test(source.contentHash || "") ? source.contentHash : sha256("");
  const result = {
    schema: SOURCE_SCHEMA,
    referenceId: safeSourceId(source, contentHash),
    sourceKind: typeof source.sourceKind === "string" ? source.sourceKind : "invalid",
    pathOrProjectRef: typeof source.pathOrProjectRef === "string" ? source.pathOrProjectRef : "",
    contentHash,
    capturedAt: isTimestamp(source.capturedAt) ? source.capturedAt : new Date(0).toISOString(),
    provenance: isObject(source.provenance) ? clone(source.provenance) : {},
    licenseState: typeof source.licenseState === "string" ? source.licenseState : "missing",
    allowedDerivations: Array.isArray(source.allowedDerivations) ? source.allowedDerivations.filter(nonEmpty) : [],
    parseStatus,
    reason,
  };
  return result;
}

function normalizeReferenceSource(input, root) {
  if (!isObject(input)) return invalidSource({}, "source must be an object");
  if (!SOURCE_KINDS.includes(input.sourceKind)) return invalidSource(input, "unsupported-source-kind");
  if (!nonEmpty(input.pathOrProjectRef)) return invalidSource(input, "source path is required");
  if (!isTimestamp(input.capturedAt)) return invalidSource(input, "capturedAt must be an ISO timestamp");
  if (!isObject(input.provenance) || !Object.keys(input.provenance).length) return invalidSource(input, "provenance is required");
  if (!nonEmpty(input.licenseState)) return invalidSource(input, "licenseState is required");
  if (!Array.isArray(input.allowedDerivations) || !input.allowedDerivations.every(nonEmpty)) {
    return invalidSource(input, "allowedDerivations must contain non-empty strings");
  }

  let resolved;
  try {
    resolved = resolveContainedReference(root, input.pathOrProjectRef);
  } catch (error) {
    const unavailable = /does not exist|no contained existing parent|root does not exist|no such file or directory|ENOENT/i.test(error.message);
    return invalidSource(input, unavailable ? "source-unavailable" : "source-path-invalid", unavailable ? "unavailable" : "invalid");
  }
  const result = {
    schema: SOURCE_SCHEMA,
    referenceId: safeSourceId(input, resolved.sha256),
    sourceKind: input.sourceKind,
    pathOrProjectRef: resolved.relativePath,
    contentHash: resolved.sha256,
    capturedAt: input.capturedAt,
    provenance: clone(input.provenance),
    licenseState: input.licenseState,
    allowedDerivations: [...input.allowedDerivations],
    parseStatus: "pending",
  };
  Object.defineProperties(result, {
    _content: { value: resolved.bytes.toString("utf8"), enumerable: false },
    _root: { value: resolved.root, enumerable: false },
    _absolutePath: { value: resolved.path, enumerable: false },
  });
  return result;
}

function blockedRegions(status, reason, source) {
  const result = [];
  Object.defineProperties(result, {
    status: { value: status, enumerable: false },
    reason: { value: reason, enumerable: false },
    sourceReferenceId: { value: source?.referenceId || null, enumerable: false },
    regions: { value: result, enumerable: false },
  });
  return result;
}

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const MALFORMED_ATTRIBUTE = Symbol("malformed-attribute");
function attributeValue(attributes, name) {
  const quotedStart = new RegExp(`\\b${name}\\s*=\\s*([\\\"'])`, "i").exec(attributes);
  if (quotedStart) {
    const quote = quotedStart[1];
    const valueStart = quotedStart.index + quotedStart[0].length;
    if (attributes.indexOf(quote, valueStart) === -1) return MALFORMED_ATTRIBUTE;
  }
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:([\\\"'])(.*?)\\1|([^\\s>]+))`, "i");
  const match = attributes.match(pattern);
  return match ? (match[2] ?? match[3]) : null;
}

function decomposeReferenceRegions(referenceSource) {
  if (!isObject(referenceSource)) return blockedRegions("blocked", "source-invalid", referenceSource);
  if (referenceSource.parseStatus === "invalid") return blockedRegions("blocked", referenceSource.reason || "source-invalid", referenceSource);
  if (referenceSource.parseStatus === "unavailable") return blockedRegions("blocked", "source-unavailable", referenceSource);
  const html = referenceSource._content;
  if (typeof html !== "string" || !html.trim()) return blockedRegions("blocked", "source-content-unavailable", referenceSource);
  if ((html.match(/<!--/g) || []).length !== (html.match(/-->/g) || []).length) {
    return blockedRegions("blocked", "html-malformed", referenceSource);
  }

  const tokens = [...html.matchAll(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g)];
  const stack = [];
  const regions = [];
  let markerCount = 0;
  for (const token of tokens) {
    const text = token[0];
    if (text.startsWith("<!--")) continue;
    const closing = /^<\//.test(text);
    const match = text.match(/^<\/?([A-Za-z][A-Za-z0-9:-]*)([\s\S]*?)>$/);
    if (!match) return blockedRegions("blocked", "html-malformed", referenceSource);
    const tag = match[1].toLowerCase();
    if (closing) {
      if (!stack.length || stack.pop() !== tag) return blockedRegions("blocked", "html-malformed", referenceSource);
      continue;
    }
    const attributes = match[2];
    const regionKind = attributeValue(attributes, "data-region");
    if (regionKind === MALFORMED_ATTRIBUTE) return blockedRegions("blocked", "html-malformed", referenceSource);
    if (regionKind !== null) {
      if (!nonEmpty(regionKind)) return blockedRegions("blocked", "region-marker-empty", referenceSource);
      const rawCapabilities = attributeValue(attributes, "data-capabilities") || "";
      if (rawCapabilities === MALFORMED_ATTRIBUTE) return blockedRegions("blocked", "html-malformed", referenceSource);
      const capabilities = [...new Set(rawCapabilities.split(",").map((value) => value.trim()).filter(Boolean))];
      regions.push({
        regionId: `${regionKind}:${markerCount}`,
        regionKind,
        capabilities,
        order: markerCount,
        sourceReferenceId: referenceSource.referenceId,
        marker: `data-region=${regionKind}`,
      });
      markerCount += 1;
    }
    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(text)) stack.push(tag);
  }
  if (stack.length) return blockedRegions("blocked", "html-malformed", referenceSource);
  if (!regions.length) return blockedRegions("blocked", "regions-unmarked", referenceSource);
  Object.defineProperties(regions, {
    status: { value: "parsed", enumerable: false },
    sourceReferenceId: { value: referenceSource.referenceId, enumerable: false },
    regions: { value: regions, enumerable: false },
  });
  return regions;
}

function validateTemplateEntry(entry, index) {
  const scope = `region-template-catalog.entries[${index}]`;
  assertKeys(entry, REGION_KEYS, [...REGION_KEYS, ...REGION_OPTIONAL_KEYS], "region template", scope);
  assertString(entry.schema, "schema", scope);
  if (entry.schema !== TEMPLATE_SCHEMA) fail(scope, `schema must be ${TEMPLATE_SCHEMA}`);
  for (const key of ["templateId", "templateVersion", "regionKind", "framework", "platform", "license"]) assertString(entry[key], key, scope);
  assertStringArray(entry.capabilities, "capabilities", scope, { unique: true });
  assertStringArray(entry.layoutTraits, "layoutTraits", scope, { unique: true });
  assertStringArray(entry.componentsUsed, "componentsUsed", scope, { unique: true });
  assertStringArray(entry.adaptationBoundary, "adaptationBoundary", scope, { unique: true });
  assertEnum(entry.platform, [...PLATFORMS], "platform", scope);
  if (!FRAMEWORKS.has(entry.framework)) fail(scope, `framework ${entry.framework} is not supported`);
  assertObject(entry.provenance, "provenance", scope);
  assertEnum(entry.catalogStatus, CATALOG_STATUSES, "catalogStatus", scope);
  if (entry.accessibility !== undefined && !["boolean", "object", "string"].includes(typeof entry.accessibility)) {
    fail(scope, "accessibility must be a boolean, object, or string");
  }
  const serialized = JSON.stringify(entry);
  if (/<script\b|\beval\s*\(|\bFunction\s*\(|\b(?:require|import)\s*\(/i.test(serialized)) {
    fail(scope, "entry contains executable source");
  }
  return clone(entry);
}

function validateRegionTemplateCatalog(catalog) {
  const scope = "region-template-catalog";
  assertKeys(catalog, CATALOG_KEYS, CATALOG_KEYS, "catalog", scope);
  if (catalog.schema !== CATALOG_SCHEMA) fail(scope, `schema must be ${CATALOG_SCHEMA}`);
  assertString(catalog.version, "version", scope);
  if (!Array.isArray(catalog.entries)) fail(scope, "entries must be an array");
  const entries = catalog.entries.map(validateTemplateEntry);
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.templateId)) fail(scope, `duplicate templateId ${entry.templateId}`);
    ids.add(entry.templateId);
  }
  return { schema: catalog.schema, version: catalog.version, entries };
}
function candidateHasAccessibility(entry) {
  if (entry.accessibility === true) return true;
  if (entry.accessibility === false || entry.accessibility === undefined) return false;
  if (isObject(entry.accessibility)) {
    const hasStatus = Object.hasOwn(entry.accessibility, "status");
    const hasReady = Object.hasOwn(entry.accessibility, "ready");
    const status = entry.accessibility.status;
    const ready = entry.accessibility.ready;
    if (hasStatus && !["pass", "fail", "review", "pending", "unknown"].includes(status)) return false;
    if (hasReady && typeof ready !== "boolean") return false;
    if (hasStatus && status === "pass" && hasReady && ready !== true) return false;
    if (hasStatus && status !== "pass" && hasReady && ready === true) return false;
    return (hasStatus && status === "pass" && (!hasReady || ready === true))
      || (hasReady && ready === true && !hasStatus);
  }
  if (typeof entry.accessibility === "string") {
    return new Set(["pass", "accessible", "supported"]).has(entry.accessibility.trim().toLowerCase());
  }
  return false;
}

function sourceFailureStatus(error) {
  return /unavailable|does not exist|no such file|no contained existing parent|root does not exist/i.test(error?.message || "")
    ? "source-unavailable"
    : "source-invalid";
}

function validateSearchReferenceSource(source, root) {
  if (!isObject(source)) return { status: "source-invalid", reason: "source-invalid" };
  if (Object.hasOwn(source, "availability")) {
    if (source.availability === "unavailable") return { status: "source-unavailable", reason: "source-unavailable" };
    if (!["pending", "resolved", "available"].includes(source.availability)) return { status: "source-invalid", reason: "source-invalid" };
  }
  if (source.parseStatus === "unavailable") return { status: "source-unavailable", reason: "source-unavailable" };
  if (["invalid", "blocked"].includes(source.parseStatus)) return { status: "source-invalid", reason: "source-invalid" };
  if (source.parseStatus !== undefined && !["pending", "parsed"].includes(source.parseStatus)) {
    return { status: "source-invalid", reason: "source-invalid" };
  }
  let normalized = source;
  try {
    if (root) {
      normalized = normalizeReferenceSource(source, root);
      if (source.contentHash !== normalized.contentHash) return { status: "source-invalid", reason: "source-hash-mismatch" };
    } else {
      if (typeof source.contentHash !== "string" || !/^[a-f0-9]{64}$/i.test(source.contentHash)) {
        return { status: "source-invalid", reason: "source-invalid" };
      }
      if (typeof source._content !== "string" || sha256(Buffer.from(source._content, "utf8")) !== source.contentHash) {
        return { status: "source-invalid", reason: "source-content-unavailable" };
      }
    }
  } catch (error) {
    return { status: sourceFailureStatus(error), reason: sourceFailureStatus(error) };
  }
  const regions = decomposeReferenceRegions(normalized);
  if (regions.status !== "parsed") {
    return {
      status: regions.reason === "source-unavailable" ? "source-unavailable" : "source-invalid",
      reason: regions.reason || "source-invalid",
    };
  }
  return null;
}

function rejectCandidate(entry, reason, extra = {}) {
  return { templateId: entry.templateId, templateVersion: entry.templateVersion, reason, reasonCode: reason, ...extra };
}

function normalizeRequest(request) {
  assertObject(request, "request", "region-template-search");
  const regionKind = Object.hasOwn(request, "regionKind") ? request.regionKind
    : Object.hasOwn(request, "region") ? request.region : undefined;
  if (!nonEmpty(regionKind)) fail("region-template-search", "regionKind is required");
  const capabilities = Object.hasOwn(request, "capabilities") ? request.capabilities : [];
  assertStringArray(capabilities, "capabilities", "region-template-search", { unique: true });
  if (Object.hasOwn(request, "capabilities") && capabilities.length === 0) {
    fail("region-template-search", "capabilities must not be empty when supplied");
  }
  const binding = Object.hasOwn(request, "surfaceBinding") ? request.surfaceBinding
    : Object.hasOwn(request, "surface") ? request.surface : undefined;
  if (!isObject(binding)) fail("region-template-search", "surfaceBinding is required");
  const surface = resolveSurfaceProfile(binding);
  if (surface.platform === "game") {
    fail("region-template-search", "game is reserved and unavailable for first-wave template search");
  }
  const surfaceBinding = validateSurfaceBinding({
    platform: binding.platform,
    framework: binding.framework,
    profileVersion: Object.hasOwn(binding, "profileVersion") ? binding.profileVersion : surface.version,
    ...(Object.hasOwn(binding, "profileId") ? { profileId: binding.profileId } : {}),
    ...(binding.firstWave !== undefined ? { firstWave: binding.firstWave } : {}),
    ...(binding.operation !== undefined ? { operation: binding.operation } : {}),
  }, surface);
  const layoutTraits = Object.hasOwn(request, "layoutTraits") ? request.layoutTraits
    : Object.hasOwn(request, "layout") ? request.layout : [];
  assertStringArray(layoutTraits, "layoutTraits", "region-template-search", { unique: true });
  if ((Object.hasOwn(request, "layoutTraits") || Object.hasOwn(request, "layout")) && layoutTraits.length === 0) {
    fail("region-template-search", "layoutTraits must not be empty when supplied");
  }
  const mode = Object.hasOwn(request, "selectionMode") ? request.selectionMode
    : Object.hasOwn(request, "mode") ? request.mode : "reference";
  assertEnum(mode, ["adopt", "reference"], "selectionMode", "region-template-search");
  let accessibilityRequired = false;
  for (const key of ["accessibilityRequired", "requiresAccessibility"]) {
    if (Object.hasOwn(request, key)) {
      if (typeof request[key] !== "boolean") fail("region-template-search", `${key} must be a boolean`);
      accessibilityRequired ||= request[key];
    }
  }
  if (Object.hasOwn(request, "accessibility")) {
    if (typeof request.accessibility === "boolean") {
      accessibilityRequired ||= request.accessibility;
    } else if (isObject(request.accessibility)) {
      if (!Object.keys(request.accessibility).length) fail("region-template-search", "accessibility object must not be empty");
      assertKeys(request.accessibility, [], ["required"], "accessibility", "region-template-search");
      if (!Object.hasOwn(request.accessibility, "required") || typeof request.accessibility.required !== "boolean") {
        fail("region-template-search", "accessibility.required must be a boolean");
      }
      accessibilityRequired ||= request.accessibility.required;
    } else {
      fail("region-template-search", "accessibility must be a boolean or object");
    }
  }
  const hasReferenceSource = Object.hasOwn(request, "referenceSource") || Object.hasOwn(request, "source");
  const referenceSource = Object.hasOwn(request, "referenceSource") ? request.referenceSource
    : Object.hasOwn(request, "source") ? request.source : null;
  return {
    regionKind,
    capabilities: [...capabilities],
    surfaceBinding,
    accessibilityRequired,
    layoutTraits: [...layoutTraits],
    selectionMode: mode,
    componentFit: Object.hasOwn(request, "componentFitBinding") ? request.componentFitBinding
      : Object.hasOwn(request, "componentFit") ? request.componentFit : null,
    referenceSource,
    hasReferenceSource,
    referenceRoot: request.referenceRoot,
  };
}

function searchRegionTemplates(catalog, request) {
  let normalizedCatalog;
  try {
    normalizedCatalog = validateRegionTemplateCatalog(catalog);
  } catch (error) {
    return { status: "blocked", matches: [], rejected: [], query: request || null, surfaceBinding: null, reason: error.message };
  }
  let query;
  try {
    query = normalizeRequest(request);
  } catch (error) {
    return { status: "blocked", matches: [], rejected: [], query: request || null, surfaceBinding: null, reason: error.message };
  }
  if (query.hasReferenceSource) {
    const sourceFailure = validateSearchReferenceSource(query.referenceSource, query.referenceRoot);
    if (sourceFailure) {
      return {
        status: sourceFailure.status,
        matches: [],
        rejected: [],
        query: request || null,
        surfaceBinding: query.surfaceBinding,
        reason: sourceFailure.reason,
      };
    }
  }
  const matches = [];
  const rejected = [];
  const preRejected = [];
  const eligibleEntries = normalizedCatalog.entries.filter((entry) => {
    if (["deprecated", "blocked"].includes(entry.catalogStatus)) {
      preRejected.push(rejectCandidate(entry, REASON_CODES.STATUS));
      return false;
    }
    return true;
  });
  for (const entry of eligibleEntries) {
    if (entry.regionKind !== query.regionKind) {
      rejected.push(rejectCandidate(entry, REASON_CODES.REGION_KIND));
      continue;
    }
    if (!query.capabilities.every((capability) => entry.capabilities.includes(capability))) {
      rejected.push(rejectCandidate(entry, REASON_CODES.CAPABILITIES, { missing: query.capabilities.filter((capability) => !entry.capabilities.includes(capability)) }));
      continue;
    }
    if (entry.platform !== query.surfaceBinding.platform && entry.platform !== "agnostic") {
      rejected.push(rejectCandidate(entry, REASON_CODES.PLATFORM));
      continue;
    }
    if (entry.framework !== query.surfaceBinding.framework && entry.framework !== "agnostic") {
      rejected.push(rejectCandidate(entry, REASON_CODES.FRAMEWORK));
      continue;
    }
    if (query.accessibilityRequired && !candidateHasAccessibility(entry)) {
      rejected.push(rejectCandidate(entry, REASON_CODES.ACCESSIBILITY));
      continue;
    }
    const source = query.referenceSource;
    const sourceLicenseMissing = isObject(source)
      && UNSPECIFIED_LICENSES.has(typeof source.licenseState === "string" ? source.licenseState.toLowerCase() : "missing");
    const sourceProvenanceMissing = isObject(source)
      && (!isObject(source.provenance) || !Object.keys(source.provenance).length);
    const licenseMissing = UNSPECIFIED_LICENSES.has(entry.license.toLowerCase()) || sourceLicenseMissing;
    const provenanceMissing = !isObject(entry.provenance) || !Object.keys(entry.provenance).length || sourceProvenanceMissing;
    if (query.selectionMode === "adopt" && licenseMissing) {
      rejected.push(rejectCandidate(entry, REASON_CODES.LICENSE));
      continue;
    }
    if (query.selectionMode === "adopt" && provenanceMissing) {
      rejected.push(rejectCandidate(entry, REASON_CODES.PROVENANCE));
      continue;
    }
    if (!query.layoutTraits.every((trait) => entry.layoutTraits.includes(trait))) {
      rejected.push(rejectCandidate(entry, REASON_CODES.LAYOUT, { missing: query.layoutTraits.filter((trait) => !entry.layoutTraits.includes(trait)) }));
      continue;
    }
    const binding = query.componentFit;
    if (binding === false || (binding && (binding.status === "blocked" || binding.status === "fail" || binding.status === "rejected" || binding.compatible === false))) {
      rejected.push(rejectCandidate(entry, REASON_CODES.COMPONENT));
      continue;
    }
    if (binding && Array.isArray(binding.templateIds) && !binding.templateIds.includes(entry.templateId)) {
      rejected.push(rejectCandidate(entry, REASON_CODES.COMPONENT));
      continue;
    }
    const score = query.capabilities.length * 10 + query.layoutTraits.filter((trait) => entry.layoutTraits.includes(trait)).length * 2 + (entry.framework === query.surfaceBinding.framework ? 2 : 0);
    matches.push({ ...entry, score, matchedCapabilities: [...query.capabilities] });
  }
  matches.sort((left, right) => right.score - left.score || left.templateId.localeCompare(right.templateId));
  const publicQuery = { ...query };
  delete publicQuery.hasReferenceSource;
  delete publicQuery.referenceRoot;
  return {
    status: matches.length ? "ready" : "no-suitable-candidate",
    matches,
    rejected: [...preRejected, ...rejected],
    query: publicQuery,
    surfaceBinding: query.surfaceBinding,
  };
}

module.exports = {
  CATALOG_SCHEMA,
  PARSE_STATUSES,
  REASON_CODES,
  SOURCE_KINDS,
  SOURCE_SCHEMA,
  TEMPLATE_SCHEMA,
  decomposeReferenceRegions,
  normalizeReferenceSource,
  searchRegionTemplates,
  validateRegionTemplateCatalog,
};
