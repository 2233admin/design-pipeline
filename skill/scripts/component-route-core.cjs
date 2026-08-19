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

function routeEntries(catalog) {
  validateCatalog(catalog);
  catalog.entries.forEach(validateRouteEntry);
  return catalog.entries.filter((entry) => entry.kind === "component" && isObject(entry.routing));
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
  return (route.capabilities.includes(capability) ? 100 : 0) + evidenceScore(route.evidenceStatus) + modeScore(route.mode);
}

function implementationStatus(entry) {
  const route = entry.routing;
  if (route.mode === "reference-adaptation" || route.requiresLicense || route.evidenceStatus === "unverified") return "review";
  return "ready";
}

function recommendedComponentDetails(route, capability) {
  const names = route.recommendations?.[capability];
  if (!Array.isArray(names) || !names.length || !Array.isArray(route.componentInventory)) return [];
  const inventory = new Map(route.componentInventory.filter((item) => isObject(item) && typeof item.name === "string").map((item) => [item.name, item]));
  return names.map((name) => inventory.get(name)).filter(Boolean).map((item) => ({
    name: item.name,
    ...(item.displayName ? { displayName: item.displayName } : {}),
    ...(item.category ? { category: item.category } : {}),
    ...(item.docUrl ? { docUrl: item.docUrl } : {}),
    ...(item.installCommand ? { install: item.installCommand } : {}),
    ...(item.dependencies?.length ? { dependencies: item.dependencies } : {}),
    ...(item.registryDependencies?.length ? { registryDependencies: item.registryDependencies } : {}),
    ...(item.complexity ? { complexity: item.complexity } : {}),
    ...(item.hasReducedMotion !== undefined ? { hasReducedMotion: item.hasReducedMotion } : {}),
  }));
}

function summarizeEntry(entry, capability) {
  const route = entry.routing;
  const componentDetails = recommendedComponentDetails(route, capability);
  return sortValue({
    id: entry.id,
    name: entry.name,
    source: entry.provenance.source,
    sourceUrl: entry.provenance.url,
    ...(entry.provenance.sourceCode ? { sourceCode: entry.provenance.sourceCode } : {}),
    license: entry.provenance.license,
    mode: route.mode,
    status: implementationStatus(entry),
    matchedCapability: capability,
    capabilities: route.capabilities,
    platforms: route.platforms,
    ...(route.package ? { package: route.package } : {}),
    ...(route.install ? { install: route.install } : {}),
    ...(route.dependencies ? { dependencies: route.dependencies } : {}),
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
  const entries = routeEntries(options.catalog);
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
  const hasBlockedRoute = routes.some((route) => route.status === "blocked");
  const status = !capabilities.length || !hasSelectedRoute || hasBlockedRoute
    ? "blocked"
    : routes.some((route) => route.status === "review")
      ? "review"
      : "ready";
  const next = status === "blocked"
    ? capabilities.length
      ? `Resolve every unavailable capability (${unavailable.join(", ")}) through an authorized provider or an explicitly approved project-owned fallback before implementation.`
      : "No governed capabilities were recognized from the brief. Treat catalog coverage as unresolved and expand the capability vocabulary or provide explicit capabilities before implementation."
    : status === "review"
      ? "Verify license/source authority or select a project-owned fallback before copying code."
      : null;
  return sortValue({
    schema: ROUTE_SCHEMA,
    status,
    query: options.brief.trim(),
    platform,
    capabilities,
    routes,
    ...(unavailable.length ? { unavailable } : {}),
    ...(next ? { next } : {}),
  });
}

module.exports = { ROUTE_SCHEMA, routeComponents };
