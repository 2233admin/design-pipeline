"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { isObject, resolveInside, sortValue } = require("../../contract-utils.cjs");
const componentCore = require("../../component-capability-core.cjs");

function defaultReferencesRoot() {
  return path.resolve(__dirname, "../../../references");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeDeclarations(declarations, targetRoot, projectRoot) {
  if (!Array.isArray(declarations)) throw new Error("components.declarations must be an array");
  return declarations.map((declaration, index) => {
    if (!isObject(declaration)) throw new Error(`components.declarations[${index}] must be an object`);
    let source = { path: declaration.sourcePath ?? null, contained: true, exists: false };
    if (typeof declaration.sourcePath === "string" && declaration.sourcePath.trim()) {
      const sourceRoot = declaration.componentOrigin === "workspace-package" ? projectRoot : targetRoot;
      const normalizedSourcePath = declaration.sourcePath.trim().replaceAll("\\", "/");
      const resolved = resolveInside(sourceRoot, normalizedSourcePath, `components.declarations[${index}].sourcePath`, { scope: "component-first components" });
      const exists = fs.existsSync(resolved) && fs.statSync(resolved).isFile();
      const canonical = exists ? fs.realpathSync(resolved) : resolved;
      source = {
        path: path.relative(sourceRoot, canonical).split(path.sep).join("/"),
        contained: true,
        exists,
      };
    }
    return sortValue({ ...declaration, sourcePath: source.path, source });
  }).sort((left, right) => String(left.role || "").localeCompare(String(right.role || "")) || String(left.id || "").localeCompare(String(right.id || "")));
}

function resolveComponentCapabilitiesContext(input = {}, options = {}) {
  if (!isObject(input)) return { status: "invalid", error: "components must be an object" };
  try {
    const referencesRoot = options.referencesRoot || defaultReferencesRoot();
    const capabilityRegistry = options.capabilityRegistry || readJson(path.join(referencesRoot, "component-capabilities.json"));
    const providerRegistry = options.providerRegistry || readJson(path.join(referencesRoot, "component-providers.json"));
    const core = options.core || componentCore;
    let resolution = input.resolution || null;
    if (!resolution && input.request) resolution = core.resolveComponentCapabilities(input.request, options.targetRoot, capabilityRegistry, providerRegistry);
    const framework = resolution?.framework || input.request?.framework || options.framework || "agnostic";
    const discoveredInventory = core.inventoryProjectComponents(options.targetRoot, framework);
    const inventory = { ...discoveredInventory, projectRoot: "." };
    let verification = null;
    if (resolution && input.verificationReceipt) verification = core.verifyComponentReceipt(resolution, input.verificationReceipt);
    const declarations = normalizeDeclarations(input.declarations || [], options.targetRoot, options.projectRoot || options.targetRoot);
    return sortValue({
      status: "ready",
      resolution,
      verification,
      verificationReceiptPresent: Boolean(input.verificationReceipt),
      inventory,
      declarations,
    });
  } catch (error) {
    return { status: "invalid", error: error.message };
  }
}

module.exports = { resolveComponentCapabilitiesContext };
