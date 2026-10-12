"use strict";

const { decomposeCapabilities, validateCatalog } = require("./design-system-catalog-core.cjs");
const { fail, isObject, sortValue } = require("./contract-utils.cjs");

const ROUTE_SCHEMA = "design-pipeline.component-route.v1";
const ROUTE_MODES = new Set(["project-owned", "platform", "package", "registry-copy", "reference-adaptation"]);
const KNOWN_PLATFORMS = new Set(["web", "react-native", "expo"]);

function routeFail(message) {
  fail("component route", message);
}

function strings(value, label) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !item.trim())) {
    routeFail(`${label} must be a non-empty string array`);
  }
  return [...new Set(value.map((item) => item.trim()))].sort();
}

function normalizePlatform(value) {
  const platform = String(value || "web").trim().toLowerCase();
  if (platform === "reactnative" || platform === "react native") return "react-native";
  if (!KNOWN_PLATFORMS.has(platform)) routeFail(`platform ${platform} is not supported`);
  return platform;
}

function validateRouteEntry(entry) {
  if (entry.kind !== "component") return;
  const route = entry.routing;
  if (!isObject(route)) return;
  strings(route.capabilities, `${entry.id}.routing.capabilities`);
  strings(route.platforms, `${entry.id}.routing.platforms`);
  if (!ROUTE_MODES.has(route.mode)) routeFail(`${entry.id}.routing.mode is invalid`);
  if (route.evidenceStatus !== undefined && !["verified", "user-provided", "unverified"].includes(route.evidenceStatus)) {
    routeFail(`${entry.id}.routing.evidenceStatus is invalid`);
  }
  if (route.requiresLicense !== undefined && typeof route.requiresLicense !== "boolean") {
    routeFail(`${entry.id}.routing.requiresLicense must be boolean`);
  }
  if (route.dependencies !== undefined) strings(route.dependencies, `${entry.id}.routing.dependencies`);
  if (route.componentCount !== undefined && (!Number.isInteger(route.componentCount) || route.componentCount < 1)) {
    routeFail(`${entry.id}.routing.componentCount must be a positive integer`);
  }
  if (route.recommendations !== undefined) {
    if (!isObject(route.recommendations)) routeFail(`${entry.id}.routing.recommendations must be an object`);
    for (const [capability, components] of Object.entries(route.recommendations)) {
      strings(components, `${entry.id}.routing.recommendations.${capability}`);
    }
  }
  if (route.componentInventory !== undefined && (!Array.isArray(route.componentInventory) || !route.componentInventory.length)) {
    routeFail(`${entry.id}.routing.componentInventory must be a non-empty array`);
  }
}

function routeEntries(catalog, platform) {
  validateCatalog(catalog);
  // Validate every entry's routing metadata first, as v1 did, so malformed metadata on a record
  // that is filtered out below still fails instead of being silently accepted.
  catalog.entries.forEach(validateRouteEntry);
  return catalog.entries.filter((entry) => entry.kind === "component"
    && (entry.recordType === undefined || entry.recordType === "component")
    && (platform !== "web" || entry.webRanking !== false)
    && isObject(entry.routing));
}

function evidenceScore(status) {
  return status === "verified" ? 30 : status === "user-provided" ? 10 : 0;
}

function modeScore(mode) {
  return {
    "project-owned": 25,
    platform: 24,
    package: 20,
    "registry-copy": 15,
    "reference-adaptation": 5,
  }[mode] || 0;
}

function candidateScore(entry, capability) {
  const route = entry.routing;
  const readiness = implementationStatus(entry) === "ready" ? 50 : 0;
  return (route.capabilities.includes(capability) ? 100 : 0) + readiness + evidenceScore(route.evidenceStatus) + modeScore(route.mode);
}

function implementationStatus(entry) {
  const route = entry.routing;
  if (entry.license?.state === "unverified" || entry.license?.state === "commercial") return "review";
  if (route.mode === "reference-adaptation" || route.requiresLicense || route.evidenceStatus === "unverified") return "review";
  return "ready";
}

function recommendedComponentDetails(route, capability, referenceOnly) {
  const names = route.recommendations?.[capability];
  if (!Array.isArray(names) || !names.length || !Array.isArray(route.componentInventory)) return [];
  const inventory = new Map(route.componentInventory.filter((item) => isObject(item) && typeof item.name === "string").map((item) => [item.name, item]));
  return names.map((name) => inventory.get(name)).filter(Boolean).map((item) => ({
    name: item.name,
    ...(item.displayName ? { displayName: item.displayName } : {}),
    ...(item.category ? { category: item.category } : {}),
    ...(item.docUrl ? { docUrl: item.docUrl } : {}),
    ...(!referenceOnly && item.installCommand ? { install: item.installCommand } : {}),
    ...(!referenceOnly && item.dependencies?.length ? { dependencies: item.dependencies } : {}),
    ...(!referenceOnly && item.registryDependencies?.length ? { registryDependencies: item.registryDependencies } : {}),
    ...(item.complexity ? { complexity: item.complexity } : {}),
    ...(item.hasReducedMotion !== undefined ? { hasReducedMotion: item.hasReducedMotion } : {}),
  }));
}

function summarizeEntry(entry, capability) {
  const route = entry.routing;
  const referenceOnly = entry.license?.state === "unverified" || entry.license?.state === "commercial";
  const componentDetails = recommendedComponentDetails(route, capability, referenceOnly);
  return sortValue({
    id: entry.id,
    name: entry.name,
    source: entry.provenance.source,
    sourceUrl: entry.provenance.url,
    ...(!referenceOnly && entry.provenance.sourceCode ? { sourceCode: entry.provenance.sourceCode } : {}),
    license: entry.provenance.license,
    ...(entry.sourceId ? { sourceId: entry.sourceId } : {}),
    ...(entry.availability ? { availability: entry.availability } : {}),
    ...(entry.license ? { licenseEvidence: entry.license } : {}),
    mode: referenceOnly ? "reference-adaptation" : route.mode,
    status: implementationStatus(entry),
    matchedCapability: capability,
    capabilities: route.capabilities,
    platforms: route.platforms,
    ...(!referenceOnly && route.package ? { package: route.package } : {}),
    ...(!referenceOnly && route.install ? { install: route.install } : {}),
    ...(!referenceOnly && route.dependencies ? { dependencies: route.dependencies } : {}),
    ...(route.componentCount ? { componentCount: route.componentCount } : {}),
    ...(route.recommendations?.[capability]?.length ? { recommendedComponents: route.recommendations[capability] } : {}),
    ...(componentDetails.length ? { recommendedComponentDetails: componentDetails } : {}),
    ...(route.fallback ? { fallback: route.fallback } : {}),
    ...(route.degradation ? { degradation: route.degradation } : {}),
    ...(entry.provenance.licenseNotice ? { licenseNotice: entry.provenance.licenseNotice } : {}),
    ...(route.requiresLicense ? { requiresLicense: true } : {}),
    ...(route.evidenceStatus ? { evidenceStatus: route.evidenceStatus } : {}),
  });
}

function routeComponents(options = {}) {
  if (!isObject(options)) routeFail("options must be an object");
  if (typeof options.brief !== "string" || !options.brief.trim()) routeFail("brief must be a non-empty string");
  const platform = normalizePlatform(options.platform);
  const capabilities = Array.isArray(options.capabilities) && options.capabilities.length
    ? strings(options.capabilities, "capabilities")
    : decomposeCapabilities(options.brief, { allowPartialWords: false });
  const entries = routeEntries(options.catalog, platform);
  const routes = [];
  const unavailable = [];

  for (const capability of capabilities) {
    const candidates = entries
      .filter((entry) => entry.routing.capabilities.includes(capability) && entry.routing.platforms.includes(platform))
      .sort((left, right) => candidateScore(right, capability) - candidateScore(left, capability) || left.id.localeCompare(right.id));
    if (!candidates.length) {
      unavailable.push(capability);
      routes.push({ capability, status: "blocked", selected: null, alternatives: [], rationale: `No ${platform} route advertises ${capability}.` });
      continue;
    }
    const selected = candidates[0];
    const status = implementationStatus(selected);
    routes.push({
      capability,
      status,
      selected: summarizeEntry(selected, capability),
      alternatives: candidates.slice(1, 4).map((entry) => summarizeEntry(entry, capability)),
      rationale: status === "review"
        ? `${selected.provenance.source} is the strongest recorded match, but its source or license still needs project authority.`
        : `${selected.provenance.source} is the strongest compatible ${platform} route for ${capability}.`,
    });
  }

  const hasSelectedRoute = routes.some((route) => route.selected);
  const status = !capabilities.length || !hasSelectedRoute
    ? "blocked"
    : routes.some((route) => route.status === "review")
      ? "review"
      : "ready";
  return sortValue({
    schema: ROUTE_SCHEMA,
    status,
    query: options.brief.trim(),
    platform,
    capabilities,
    routes,
    ...(unavailable.length ? { unavailable } : {}),
    ...(status === "review" ? { next: "Study and reimplement commercial/unverified references without copying code; verify other source authority or select a project-owned fallback." } : {}),
  });
}

module.exports = { ROUTE_SCHEMA, routeComponents };
