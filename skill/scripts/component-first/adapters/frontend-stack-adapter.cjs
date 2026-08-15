"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { isObject, sortValue } = require("../../contract-utils.cjs");
const frontendCore = require("../../frontend-stack-core.cjs");

function defaultReferencesRoot() {
  return path.resolve(__dirname, "../../../references");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normalizeDecision(decision) {
  if (!isObject(decision) || decision.schema !== frontendCore.DECISION_SCHEMA) throw new Error("unsupported frontend stack decision");
  if (!isObject(decision.selected) || !isObject(decision.selected.uiLibrary) || typeof decision.framework !== "string") throw new Error("frontend stack decision is incomplete");
  return decision;
}

function resolveFrontendStackContext(input = {}, options = {}) {
  if (!isObject(input)) return { status: "invalid", error: "stack must be an object" };
  try {
    let decision = input.decision || null;
    let source = "decision";
    if (!decision && input.request) {
      const referencesRoot = options.referencesRoot || defaultReferencesRoot();
      const registry = options.registry || readJson(path.join(referencesRoot, "frontend-stack-registry.json"));
      const skillCatalog = options.skillCatalog || readJson(path.join(referencesRoot, "mengto-skills-catalog.json"));
      const resolve = options.resolveFrontendStack || frontendCore.resolveFrontendStack;
      decision = resolve(input.request, registry, skillCatalog);
      source = "request";
    }
    if (!decision) return { status: "missing", decision: null, runtime: null };
    normalizeDecision(decision);
    return sortValue({
      status: "ready",
      source,
      decision,
      runtime: {
        framework: decision.framework,
        runtimeStack: decision.framework,
        styling: decision.selected.styling?.id || "none",
        uiLibrary: decision.selected.uiLibrary.id,
      },
    });
  } catch (error) {
    return { status: "invalid", error: error.message };
  }
}

module.exports = { resolveFrontendStackContext };
