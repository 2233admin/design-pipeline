"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, isObject, sha256, sortValue } = require("./contract-utils.cjs");

const CAPABILITY_REGISTRY_SCHEMA = "design-pipeline.component-capability-registry.v1";
const PROVIDER_REGISTRY_SCHEMA = "design-pipeline.component-provider-registry.v1";
const IR_SCHEMA = "design-pipeline.component-capability.v1";
const REQUEST_SCHEMA = "design-pipeline.component-resolution-request.v1";
const RESOLUTION_SCHEMA = "design-pipeline.component-resolution.v1";
const RECEIPT_SCHEMA = "design-pipeline.component-verification-receipt.v1";
const VERIFICATION_SCHEMA = "design-pipeline.component-verification.v1";
const INVENTORY_SCHEMA = "design-pipeline.component-inventory.v1";
const BINDING_PLAN_SCHEMA = "design-pipeline.component-binding-plan.v1";
const BINDING_DECISION_SCHEMA = "design-pipeline.component-binding-decision.v1";
const FRAMEWORKS = new Set(["agnostic", "react", "vue", "nuxt", "svelte", "solid"]);

function invalid(message) { fail("component capability", message); }
function strings(value, label, options = {}) {
  if (!Array.isArray(value) || (options.nonEmpty && value.length === 0) || value.some((item) => typeof item !== "string" || !item.trim())) invalid(`${label} must be a string array`);
  const result = [...new Set(value.map((item) => item.trim()))];
  if (result.length !== value.length) invalid(`${label} must contain unique values`);
  return result;
}

function validateCapabilityRegistry(registry) {
  if (!isObject(registry) || registry.schema !== CAPABILITY_REGISTRY_SCHEMA || registry.version !== "1") invalid("unsupported capability registry");
  if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) invalid("capabilities must not be empty");
  const ids = new Set();
  for (const capability of registry.capabilities) {
    if (!isObject(capability) || typeof capability.id !== "string" || !capability.id.trim()) invalid("capability id is required");
    if (ids.has(capability.id)) invalid(`duplicate capability ${capability.id}`);
    ids.add(capability.id);
    strings(capability.keywords, `${capability.id}.keywords`, { nonEmpty: true });
    strings(capability.requires || [], `${capability.id}.requires`);
    strings(capability.verification, `${capability.id}.verification`, { nonEmpty: true });
  }
  for (const capability of registry.capabilities) for (const dependency of capability.requires || []) if (!ids.has(dependency)) invalid(`${capability.id} requires unknown capability ${dependency}`);
  return registry;
}

function validateProviderRegistry(registry, capabilityRegistry) {
  validateCapabilityRegistry(capabilityRegistry);
  if (!isObject(registry) || registry.schema !== PROVIDER_REGISTRY_SCHEMA || registry.version !== "1") invalid("unsupported provider registry");
  if (!Array.isArray(registry.providers) || registry.providers.length === 0) invalid("providers must not be empty");
  const capabilityIds = new Set(capabilityRegistry.capabilities.map(({ id }) => id));
  const ids = new Set();
  for (const provider of registry.providers) {
    if (!isObject(provider) || typeof provider.id !== "string" || !provider.id.trim()) invalid("provider id is required");
    if (ids.has(provider.id)) invalid(`duplicate provider ${provider.id}`);
    ids.add(provider.id);
    const frameworks = strings(provider.frameworks, `${provider.id}.frameworks`, { nonEmpty: true });
    if (frameworks.some((framework) => !FRAMEWORKS.has(framework))) invalid(`${provider.id} has an unsupported framework`);
    for (const capability of strings(provider.capabilities, `${provider.id}.capabilities`, { nonEmpty: true })) if (!capabilityIds.has(capability)) invalid(`${provider.id} provides unknown capability ${capability}`);
    if (!isObject(provider.packages)) invalid(`${provider.id}.packages must be an object`);
    for (const [framework, packages] of Object.entries(provider.packages)) {
      if (!FRAMEWORKS.has(framework)) invalid(`${provider.id}.packages has unsupported framework ${framework}`);
      strings(packages, `${provider.id}.packages.${framework}`, { nonEmpty: true });
    }
    if (!["ready", "review", "experimental"].includes(provider.status)) invalid(`${provider.id} has invalid status`);
  }
  return registry;
}

function capabilityMap(registry) { return new Map(validateCapabilityRegistry(registry).capabilities.map((item) => [item.id, item])); }

function expandDependencies(ids, registry) {
  const byId = capabilityMap(registry);
  const expanded = new Set();
  function visit(id) {
    const capability = byId.get(id);
    if (!capability) invalid(`unknown capability ${id}`);
    if (expanded.has(id)) return;
    expanded.add(id);
    for (const dependency of capability.requires || []) visit(dependency);
  }
  for (const id of ids) visit(id);
  return [...expanded].sort();
}

function decomposeComponentBrief(brief, registry) {
  validateCapabilityRegistry(registry);
  if (typeof brief !== "string" || !brief.trim()) invalid("brief is required");
  const normalized = brief.toLowerCase();
  const direct = registry.capabilities.filter((capability) => capability.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))).map(({ id }) => id);
  const capabilities = expandDependencies(direct, registry);
  const components = [];
  if (["table", "data grid", "datatable", "表格", "数据表"].some((term) => normalized.includes(term))) components.push("data-grid");
  else if (["dialog", "modal", "弹窗", "对话框"].some((term) => normalized.includes(term))) components.push("dialog");
  else if (["form", "表单"].some((term) => normalized.includes(term))) components.push("form");
  else components.push("custom-component");
  const byId = capabilityMap(registry);
  const requiredChecks = [...new Set(capabilities.flatMap((id) => byId.get(id).verification))].sort();
  return sortValue({
    schema: IR_SCHEMA,
    status: capabilities.length ? "ready" : "blocked",
    brief: brief.trim(),
    components,
    capabilities,
    requiredChecks,
    registryHash: sha256(canonicalJson(registry)),
    blockers: capabilities.length ? [] : ["no governed component capability matched the brief"],
  });
}

function projectPackages(projectRoot) {
  const packageFile = path.join(path.resolve(projectRoot), "package.json");
  if (!fs.existsSync(packageFile)) return { packageFile: null, names: new Set() };
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(packageFile, "utf8")); } catch (error) { invalid(`cannot parse project package.json: ${error.message}`); }
  const names = new Set(Object.keys({ ...(manifest.dependencies || {}), ...(manifest.devDependencies || {}), ...(manifest.peerDependencies || {}), ...(manifest.optionalDependencies || {}) }));
  return { packageFile, names };
}

function providerPackages(provider, framework) {
  return [...new Set([...(provider.packages[framework] || []), ...(provider.packages.agnostic || [])])];
}

function probeComponentProviders(projectRoot, providerRegistry, capabilityRegistry, framework = "agnostic") {
  validateProviderRegistry(providerRegistry, capabilityRegistry);
  if (!FRAMEWORKS.has(framework)) invalid(`unsupported framework ${framework}`);
  const project = projectPackages(projectRoot);
  const providers = providerRegistry.providers.filter((provider) => provider.frameworks.includes("agnostic") || framework === "agnostic" || provider.frameworks.includes(framework)).map((provider) => {
    const packages = providerPackages(provider, framework);
    const installedPackages = packages.filter((name) => project.names.has(name));
    const projectOwned = provider.mode === "project-owned";
    return sortValue({
      id: provider.id,
      label: provider.label,
      status: provider.status,
      mode: provider.mode,
      frameworks: provider.frameworks,
      capabilities: provider.capabilities,
      interfaces: provider.interfaces,
      source: provider.source,
      packages,
      installedPackages,
      available: projectOwned || installedPackages.length > 0,
      activation: projectOwned ? "project-owned" : installedPackages.length ? "installed" : "candidate",
    });
  });
  return sortValue({ schema: "design-pipeline.component-provider-probe.v1", status: "ready", framework, packageFile: project.packageFile, providers });
}

function validateResolutionRequest(request, capabilityRegistry) {
  if (!isObject(request) || request.schema !== REQUEST_SCHEMA) invalid("unsupported resolution request");
  const allowed = ["schema", "framework", "brief", "capabilities", "preferredProviders"];
  const extras = Object.keys(request).filter((key) => !allowed.includes(key));
  if (extras.length) invalid(`resolution request has unsupported properties: ${extras.join(", ")}`);
  if (!FRAMEWORKS.has(request.framework)) invalid(`unsupported framework ${String(request.framework)}`);
  if (request.brief === undefined && request.capabilities === undefined) invalid("brief or capabilities is required");
  if (request.brief !== undefined && (typeof request.brief !== "string" || !request.brief.trim())) invalid("brief must be a non-empty string");
  if (request.capabilities !== undefined) expandDependencies(strings(request.capabilities, "capabilities", { nonEmpty: true }), capabilityRegistry);
  strings(request.preferredProviders || [], "preferredProviders");
  return request;
}

function resolveComponentCapabilities(request, projectRoot, capabilityRegistry, providerRegistry) {
  validateResolutionRequest(request, capabilityRegistry);
  validateProviderRegistry(providerRegistry, capabilityRegistry);
  const providerIds = new Set(providerRegistry.providers.map(({ id }) => id));
  for (const id of request.preferredProviders || []) if (!providerIds.has(id)) invalid(`unknown preferred provider ${id}`);
  const decomposed = request.brief ? decomposeComponentBrief(request.brief, capabilityRegistry) : null;
  const capabilities = expandDependencies([...(request.capabilities || []), ...(decomposed?.capabilities || [])], capabilityRegistry);
  const probe = probeComponentProviders(projectRoot, providerRegistry, capabilityRegistry, request.framework);
  const preferred = new Map((request.preferredProviders || []).map((id, index) => [id, index]));
  const routes = [];
  const missing = [];
  for (const capability of capabilities) {
    const candidates = probe.providers.filter((provider) => provider.capabilities.includes(capability)).sort((a, b) => {
      const preferredA = preferred.has(a.id) ? 1000 - preferred.get(a.id) : 0;
      const preferredB = preferred.has(b.id) ? 1000 - preferred.get(b.id) : 0;
      const availabilityA = a.activation === "installed" ? 200 : a.activation === "project-owned" ? 100 : 0;
      const availabilityB = b.activation === "installed" ? 200 : b.activation === "project-owned" ? 100 : 0;
      return (preferredB + availabilityB) - (preferredA + availabilityA) || a.id.localeCompare(b.id);
    });
    if (!candidates.length) { missing.push(capability); continue; }
    const selected = candidates[0];
    routes.push({ capability, provider: selected.id, activation: selected.activation, status: selected.status, interfaces: selected.interfaces, packages: selected.packages, adoptionRequired: selected.activation === "candidate" });
  }
  const byId = capabilityMap(capabilityRegistry);
  const requiredChecks = [...new Set(capabilities.flatMap((id) => byId.get(id).verification))].sort();
  const reviewRoutes = routes.filter((route) => route.status === "review" || route.status === "experimental");
  const base = {
    schema: RESOLUTION_SCHEMA,
    status: missing.length || capabilities.length === 0 ? "blocked" : reviewRoutes.length ? "review" : "ready",
    framework: request.framework,
    brief: request.brief || null,
    capabilities,
    routes,
    requiredChecks,
    missingCapabilities: missing,
    blockers: capabilities.length === 0 ? ["no component capabilities were requested"] : missing.map((id) => `no provider covers ${id}`),
    reviews: reviewRoutes.map((route) => `${route.provider} is ${route.status} for ${route.capability}`),
    registryHashes: { capabilities: sha256(canonicalJson(capabilityRegistry)), providers: sha256(canonicalJson(providerRegistry)) },
    constraints: ["resolution never installs packages or rewrites project configuration", "candidate providers require an explicit adoption decision"],
  };
  return sortValue({ ...base, resolutionHash: sha256(canonicalJson(base)) });
}

function verifyComponentReceipt(resolution, receipt) {
  if (!isObject(resolution) || resolution.schema !== RESOLUTION_SCHEMA || typeof resolution.resolutionHash !== "string") invalid("unsupported component resolution");
  if (!isObject(receipt) || receipt.schema !== RECEIPT_SCHEMA) invalid("unsupported verification receipt");
  if (receipt.resolutionHash !== resolution.resolutionHash) invalid("verification receipt does not match the resolution");
  if (!Array.isArray(receipt.checks)) invalid("verification checks must be an array");
  const seen = new Set();
  const checks = new Map();
  for (const check of receipt.checks) {
    if (!isObject(check) || typeof check.id !== "string" || !check.id.trim()) invalid("verification check id is required");
    if (seen.has(check.id)) invalid(`duplicate verification check ${check.id}`);
    seen.add(check.id);
    if (!["pass", "fail", "missing"].includes(check.status)) invalid(`${check.id} has invalid verification status`);
    if (!Array.isArray(check.evidence) || check.evidence.some((item) => typeof item !== "string" || !item.trim())) invalid(`${check.id}.evidence must be a string array`);
    if (check.status === "pass" && check.evidence.length === 0) invalid(`${check.id} cannot pass without evidence`);
    checks.set(check.id, check);
  }
  const missing = resolution.requiredChecks.filter((id) => !checks.has(id) || checks.get(id).status === "missing");
  const failed = resolution.requiredChecks.filter((id) => checks.get(id)?.status === "fail");
  const passed = resolution.requiredChecks.filter((id) => checks.get(id)?.status === "pass");
  return sortValue({ schema: VERIFICATION_SCHEMA, status: missing.length || failed.length ? "blocked" : "verified", resolutionHash: resolution.resolutionHash, passed, failed, missing, evidence: passed.flatMap((id) => checks.get(id).evidence) });
}

function inventoryProjectComponents(projectRoot, framework) {
  if (!FRAMEWORKS.has(framework)) invalid(`unsupported framework ${framework}`);
  const root = path.resolve(projectRoot);
  const extensionMap = { vue: [".vue"], nuxt: [".vue"], react: [".jsx", ".tsx"], svelte: [".svelte"], solid: [".jsx", ".tsx"], agnostic: [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"] };
  const roots = [path.join(root, "src", "components"), path.join(root, "components")].filter((entry) => fs.existsSync(entry));
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (extensionMap[framework].includes(path.extname(entry.name).toLowerCase())) files.push(target);
    }
  }
  for (const directory of roots) walk(directory);
  let declarations = {};
  const declarationFile = path.join(root, "component-capabilities.json");
  if (fs.existsSync(declarationFile)) {
    try { declarations = JSON.parse(fs.readFileSync(declarationFile, "utf8")); } catch (error) { invalid(`cannot parse component-capabilities.json: ${error.message}`); }
    if (!isObject(declarations)) invalid("component-capabilities.json must be an object");
  }
  const components = files.map((file) => {
    const id = path.basename(file, path.extname(file));
    const declared = declarations[id] || [];
    strings(declared, `component-capabilities.${id}`);
    return { id, file: path.relative(root, file).split(path.sep).join("/"), framework, capabilities: [...declared].sort(), provenance: declared.length ? "project-declared" : "unverified" };
  }).sort((a, b) => a.id.localeCompare(b.id) || a.file.localeCompare(b.file));
  return sortValue({ schema: INVENTORY_SCHEMA, status: "ready", framework, projectRoot: root, declarationFile: fs.existsSync(declarationFile) ? "component-capabilities.json" : null, components });
}

function bindingFor(provider, framework) {
  if (provider === "vuetify0") return framework === "nuxt" ? "nuxt-composable" : "vue-composable";
  if (provider === "react-aria") return "react-component";
  if (provider === "ark-ui") return `${framework}-headless-component`;
  return "project-component";
}

function bindComponentResolution(resolution, inventory, providerRegistry) {
  if (!isObject(resolution) || resolution.schema !== RESOLUTION_SCHEMA || resolution.status !== "ready") invalid("a ready component resolution is required");
  if (!isObject(inventory) || inventory.schema !== INVENTORY_SCHEMA || inventory.framework !== resolution.framework) invalid("matching component inventory is required");
  const providerIds = new Set(providerRegistry.providers.map(({ id }) => id));
  const bindings = resolution.routes.map((route) => {
    if (!providerIds.has(route.provider)) invalid(`binding references unknown provider ${route.provider}`);
    return { capability: route.capability, provider: route.provider, binding: bindingFor(route.provider, resolution.framework), activation: route.activation, adoptionRequired: route.adoptionRequired };
  });
  const base = { schema: BINDING_PLAN_SCHEMA, status: "ready", framework: resolution.framework, resolutionHash: resolution.resolutionHash, inventoryComponents: inventory.components.map(({ id }) => id), bindings, generatedFiles: [], constraints: ["binding planning never generates source or installs packages"] };
  return sortValue({ ...base, bindingPlanHash: sha256(canonicalJson(base)) });
}

function decideComponentBindings(plan, inventory) {
  if (!isObject(plan) || plan.schema !== BINDING_PLAN_SCHEMA) invalid("unsupported binding plan");
  if (!isObject(inventory) || inventory.schema !== INVENTORY_SCHEMA || inventory.framework !== plan.framework) invalid("matching component inventory is required");
  const decisions = plan.bindings.map((binding) => {
    const reusable = inventory.components.find((component) => component.capabilities.includes(binding.capability));
    if (reusable) return { capability: binding.capability, action: "reuse", component: reusable.id, provider: "project" };
    if (binding.provider === "project-dom") return { capability: binding.capability, action: "custom", component: null, provider: binding.provider };
    return { capability: binding.capability, action: binding.adoptionRequired ? "adopt" : "substitute", component: null, provider: binding.provider };
  });
  return sortValue({ schema: BINDING_DECISION_SCHEMA, status: "ready", bindingPlanHash: plan.bindingPlanHash, decisions, constraints: ["reuse requires explicit project capability declarations", "adopt never installs a package"] });
}

module.exports = {
  CAPABILITY_REGISTRY_SCHEMA,
  IR_SCHEMA,
  PROVIDER_REGISTRY_SCHEMA,
  RECEIPT_SCHEMA,
  REQUEST_SCHEMA,
  RESOLUTION_SCHEMA,
  VERIFICATION_SCHEMA,
  BINDING_DECISION_SCHEMA,
  BINDING_PLAN_SCHEMA,
  INVENTORY_SCHEMA,
  bindComponentResolution,
  decideComponentBindings,
  decomposeComponentBrief,
  inventoryProjectComponents,
  probeComponentProviders,
  resolveComponentCapabilities,
  validateCapabilityRegistry,
  validateProviderRegistry,
  verifyComponentReceipt,
};
