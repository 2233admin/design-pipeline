"use strict";

const { canonicalJson, fail, isObject, sha256, sortValue } = require("./contract-utils.cjs");

const REGISTRY_SCHEMA = "design-pipeline.frontend-stack-registry.v1";
const REQUEST_SCHEMA = "design-pipeline.frontend-stack-request.v1";
const DECISION_SCHEMA = "design-pipeline.frontend-stack-decision.v1";
const FRAMEWORKS = new Set(["react", "svelte", "vue", "solid", "reflex", "agnostic"]);
const REQUIRED_STYLING = ["less", "none", "postcss-only", "scss", "tailwindcss"];
const REQUIRED_UI = ["ant-design", "ark-ui", "base-ui", "chakra-ui", "daisyui", "headless-ui", "heroui", "mantine", "mui", "none", "park-ui", "radix-ui", "react-aria", "shadcn-svelte", "shadcn-ui"];
const REQUIRED_TOOLS = ["MengTo/skills", "hi5jeff/deepclonewebsite", "koboyo/icons", "wevm/frog"];
const HAND_DRAWN_ICON_TERMS = ["koboyo", "hand-drawn icon", "hand drawn icon", "sketch icon", "sketched icon", "手绘图标", "手绘 icon", "涂鸦图标"];

function invalid(message) { fail("frontend stack", message); }
function strings(value, label, allowEmpty = true) {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.some((item) => typeof item !== "string" || !item.trim())) invalid(`${label} must be a string array`);
  return [...new Set(value.map((item) => item.trim()))].sort();
}

function validateRegistry(registry) {
  if (!isObject(registry) || registry.schema !== REGISTRY_SCHEMA || registry.version !== "1") invalid("unsupported registry");
  for (const key of ["styling", "uiLibraries", "tools"]) if (!Array.isArray(registry[key]) || !registry[key].length) invalid(`${key} must not be empty`);
  for (const [key, entries] of [["styling", registry.styling], ["uiLibraries", registry.uiLibraries], ["tools", registry.tools]]) {
    const ids = new Set();
    for (const entry of entries) {
      if (!isObject(entry) || typeof entry.id !== "string" || !entry.id.trim()) invalid(`${key} contains an invalid id`);
      if (ids.has(entry.id)) invalid(`${key} contains duplicate ${entry.id}`);
      ids.add(entry.id);
    }
  }
  for (const tool of registry.tools) {
    strings(tool.capabilities, `tools.${tool.id}.capabilities`, false);
    if (!["always", "capability", "keyword"].includes(tool.activation)) invalid(`tool ${tool.id} has an invalid activation`);
    if (tool.activation === "keyword") strings(tool.keywords, `tools.${tool.id}.keywords`, false);
    for (const key of ["mode", "status", "source"]) if (typeof tool[key] !== "string" || !tool[key].trim()) invalid(`tool ${tool.id} has an invalid ${key}`);
  }
  if (registry.styling.map(({ id }) => id).sort().join("|") !== REQUIRED_STYLING.join("|")) invalid("styling options do not match the governed set");
  if (registry.uiLibraries.map(({ id }) => id).sort().join("|") !== REQUIRED_UI.join("|")) invalid("UI libraries do not match the governed set");
  for (const id of REQUIRED_TOOLS) if (!registry.tools.some((tool) => tool.id === id)) invalid(`required tool ${id} is missing`);
  const shadcn = registry.shadcn;
  if (!isObject(shadcn) || !isObject(shadcn.defaults)) invalid("shadcn presets are missing");
  for (const key of ["bases", "styles", "baseColors", "themes", "chartColors", "iconLibraries", "fonts", "fontHeadings", "radii", "menuAccents", "menuColors"]) strings(shadcn[key], `shadcn.${key}`, false);
  for (const style of shadcn.styles) if (!isObject(shadcn.defaults[style])) invalid(`shadcn default ${style} is missing`);
  return registry;
}

function aliases(entries) {
  const result = new Map();
  for (const entry of entries) {
    result.set(entry.id.toLowerCase(), entry);
    for (const alias of entry.aliases || []) result.set(alias.toLowerCase(), entry);
  }
  return result;
}

function select(entries, raw, label) {
  const entry = aliases(entries).get(String(raw || "none").trim().toLowerCase());
  if (!entry) invalid(`unknown ${label} ${String(raw)}`);
  return entry;
}

function normalizePreset(raw, registry) {
  const preset = typeof raw === "string" ? { name: raw } : raw || { name: "nova" };
  if (!isObject(preset)) invalid("shadcnPreset must be a preset name or object");
  const name = String(preset.name || preset.style || "nova").trim().toLowerCase();
  const base = registry.shadcn.defaults[name];
  if (!base) invalid(`unknown shadcn preset ${name}`);
  const result = { ...base, ...preset, name };
  const checks = {
    base: "bases", style: "styles", baseColor: "baseColors", theme: "themes", chartColor: "chartColors",
    iconLibrary: "iconLibraries", font: "fonts", fontHeading: "fontHeadings", radius: "radii",
    menuAccent: "menuAccents", menuColor: "menuColors",
  };
  for (const [field, collection] of Object.entries(checks)) if (!registry.shadcn[collection].includes(result[field])) invalid(`invalid shadcn ${field} ${String(result[field])}`);
  return sortValue(result);
}

function requestedCapabilities(request, styling) {
  const capabilities = new Set(strings(request.capabilities || [], "capabilities"));
  capabilities.add("design-workflow");
  capabilities.add("friction-logging");
  if (styling.id === "tailwindcss") capabilities.add("tailwindcss");
  const brief = String(request.brief || "").toLowerCase();
  if (["clone", "cloning", "rebuild", "replicate", "reverse engineer", "复刻", "克隆", "仿站", "逆向", "1:1"].some((term) => brief.includes(term))) capabilities.add("website-cloning");
  if (HAND_DRAWN_ICON_TERMS.some((term) => brief.includes(term))) {
    capabilities.add("hand-drawn-icons");
    capabilities.add("icon-search");
  }
  return [...capabilities].sort();
}

function routeTools(request, registry, capabilities, skillCatalog) {
  const brief = String(request.brief || "").toLowerCase();
  const tools = registry.tools.filter((tool) => tool.activation === "always" || tool.capabilities.some((capability) => capabilities.includes(capability)) || (tool.keywords || []).some((term) => brief.includes(term)));
  const routes = tools.map((tool) => ({
    id: tool.id, mode: tool.mode, status: tool.status, capabilities: tool.capabilities.filter((item) => capabilities.includes(item)), source: tool.source,
    ...(tool.revision ? { revision: tool.revision } : {}), ...(tool.reviewedAt ? { reviewedAt: tool.reviewedAt } : {}),
    ...(tool.license ? { license: tool.license } : {}), ...(tool.licenseUrl ? { licenseUrl: tool.licenseUrl } : {}),
    ...(tool.endpoint ? { endpoint: tool.endpoint } : {}), ...(tool.interfaces ? { interfaces: tool.interfaces } : {}),
    ...(tool.readOnlyTools ? { readOnlyTools: tool.readOnlyTools } : {}), ...(tool.requirements ? { requirements: tool.requirements } : {}),
    ...(tool.constraints ? { constraints: tool.constraints } : {}), ...(tool.fallback ? { fallback: tool.fallback } : {}),
    ...(tool.lifecycle ? { lifecycle: tool.lifecycle } : {}),
  }));
  const recommendedSkills = [...new Set(capabilities.flatMap((capability) => skillCatalog.routes[capability] || []))].sort();
  return { routes: sortValue(routes), recommendedSkills };
}

function resolveFrontendStack(request, registry, skillCatalog) {
  validateRegistry(registry);
  if (!isObject(request) || request.schema !== REQUEST_SCHEMA) invalid("unsupported request");
  const extras = Object.keys(request).filter((key) => !["schema", "framework", "brief", "existing", "requested", "capabilities"].includes(key));
  if (extras.length) invalid(`request has unsupported properties: ${extras.join(", ")}`);
  if (typeof request.framework !== "string" || !request.framework.trim()) invalid("framework is required");
  if (typeof request.brief !== "string" || !request.brief.trim()) invalid("brief is required");
  const framework = request.framework.trim().toLowerCase();
  if (!FRAMEWORKS.has(framework)) invalid(`unsupported framework ${framework}`);
  const wanted = request.requested || {};
  const existing = request.existing || {};
  if (!isObject(wanted) || !isObject(existing)) invalid("requested and existing must be objects");
  const styling = select(registry.styling, wanted.styling ?? existing.styling ?? "none", "styling option");
  const ui = select(registry.uiLibraries, wanted.uiLibrary ?? wanted.ui ?? existing.uiLibrary ?? existing.ui ?? "none", "UI library");
  const blockers = [];
  const reviews = [];
  if (!ui.frameworks.includes("agnostic") && framework !== "agnostic" && !ui.frameworks.includes(framework)) blockers.push(`${ui.id} does not support ${framework}`);
  if (ui.requiredStyling && !ui.requiredStyling.includes(styling.id)) blockers.push(`${ui.id} requires ${ui.requiredStyling.join(" or ")}`);
  if (ui.externalStyleEngine) reviews.push(`${ui.id} also owns styling through ${ui.externalStyleEngine}`);
  let shadcnPreset = null;
  if (ui.id === "shadcn-ui") shadcnPreset = normalizePreset(wanted.shadcnPreset ?? existing.shadcnPreset, registry);
  else if (wanted.shadcnPreset !== undefined || existing.shadcnPreset !== undefined) invalid("shadcnPreset requires shadcn-ui");
  if (!isObject(skillCatalog) || skillCatalog.schema !== "design-pipeline.skill-catalog.v1" || Object.values(skillCatalog.categories || {}).flat().length !== skillCatalog.count || skillCatalog.count !== 127) invalid("MengTo skill catalog is invalid");
  const capabilities = requestedCapabilities(request, styling);
  const toolRouting = routeTools(request, registry, capabilities, skillCatalog);
  const status = blockers.length ? "blocked" : "ready";
  return sortValue({
    schema: DECISION_SCHEMA,
    status,
    framework,
    registryHash: sha256(canonicalJson(registry)),
    selected: {
      styling: { id: styling.id, label: styling.label },
      uiLibrary: { id: ui.id, label: ui.label, source: ui.source, license: ui.license },
      ...(shadcnPreset ? { shadcnPreset } : {}),
    },
    capabilities,
    toolRoutes: toolRouting.routes,
    recommendedSkills: toolRouting.recommendedSkills,
    blockers,
    reviews,
    evidence: [`registry:${registry.reviewedAt}`, `mengto:${skillCatalog.revision}`, ...toolRouting.routes.map((tool) => `tool:${tool.id}@${tool.revision || tool.source}`)],
  });
}

module.exports = { DECISION_SCHEMA, REGISTRY_SCHEMA, REQUEST_SCHEMA, resolveFrontendStack, validateRegistry };
