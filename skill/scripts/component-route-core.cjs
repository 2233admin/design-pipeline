"use strict";

const { decomposeCapabilities, validateCatalog } = require("./design-system-catalog-core.cjs");
const { fail, isObject, sortValue } = require("./contract-utils.cjs");
const ROUTE_SCHEMA = "design-pipeline.component-route.v1";
const ROUTE_MODES = new Set(["project-owned", "platform", "package", "registry-copy", "reference-adaptation"]);

function invalid(message) { fail("component route", message); }
function strings(value, label) {
  if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== "string" || !item.trim())) invalid(`${label} must be a non-empty string array`);
  return [...new Set(value.map((item) => item.trim()))].sort();
}
function normalizePlatform(value) {
  const platform = String(value || "web").trim().toLowerCase().replace(/^react native$/, "react-native");
  if (!["web", "react-native", "expo"].includes(platform)) invalid(`platform ${platform} is not supported`);
  return platform;
}
function entryStatus(entry) {
  const route = entry.routing;
  return route.mode === "reference-adaptation" || route.requiresLicense || route.evidenceStatus === "unverified" ? "review" : "ready";
}
function summary(entry, capability) {
  return sortValue({ id: entry.id, name: entry.name, source: entry.provenance.source, license: entry.provenance.license, mode: entry.routing.mode, status: entryStatus(entry), matchedCapability: capability, capabilities: entry.routing.capabilities, platforms: entry.routing.platforms, ...(entry.routing.fallback ? { fallback: entry.routing.fallback } : {}), ...(entry.routing.requiresLicense ? { requiresLicense: true } : {}) });
}
function routeComponents(options = {}) {
  if (!isObject(options) || typeof options.brief !== "string" || !options.brief.trim()) invalid("brief must be a non-empty string");
  validateCatalog(options.catalog);
  const platform = normalizePlatform(options.platform);
  const capabilities = options.capabilities?.length ? strings(options.capabilities, "capabilities") : decomposeCapabilities(options.brief, { allowPartialWords: false });
  const entries = options.catalog.entries.filter((entry) => entry.kind === "component" && isObject(entry.routing));
  for (const entry of entries) {
    strings(entry.routing.capabilities, `${entry.id}.routing.capabilities`); strings(entry.routing.platforms, `${entry.id}.routing.platforms`);
    if (!ROUTE_MODES.has(entry.routing.mode)) invalid(`${entry.id}.routing.mode is invalid`);
  }
  const routes = capabilities.map((capability) => {
    const candidates = entries.filter((entry) => entry.routing.capabilities.includes(capability) && entry.routing.platforms.includes(platform)).sort((a, b) => entryStatus(a).localeCompare(entryStatus(b)) || a.id.localeCompare(b.id));
    if (!candidates.length) return { capability, status: "blocked", selected: null, alternatives: [], rationale: `No ${platform} route advertises ${capability}.` };
    return { capability, status: entryStatus(candidates[0]), selected: summary(candidates[0], capability), alternatives: candidates.slice(1, 4).map((entry) => summary(entry, capability)), rationale: `${candidates[0].provenance.source} is the strongest recorded ${platform} route.` };
  });
  const status = !routes.some((route) => route.selected) ? "blocked" : routes.some((route) => route.status === "review") ? "review" : "ready";
  return sortValue({ schema: ROUTE_SCHEMA, status, query: options.brief.trim(), platform, capabilities, routes, unavailable: routes.filter((route) => !route.selected).map((route) => route.capability) });
}

module.exports = { ROUTE_SCHEMA, routeComponents };
