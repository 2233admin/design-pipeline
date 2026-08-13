"use strict";

const { assertEnum, assertObject, canonicalJson, fail, isObject, sha256 } = require("./contract-utils.cjs");
const { CATALOG_SCHEMA, validateCatalog } = require("./design-system-catalog-core.cjs");
const { validateTokens } = require("./interoperability-core.cjs");

const DECISION_SCHEMA = "design-pipeline.design-system-decision.v1";
const PROJECTION_SCHEMA = "design-pipeline.design-system-token-projection.v1";
const MODES = ["reference", "adopt", "substitute", "custom"];
const STATUSES = ["stable", "canary", "beta", "experimental", "deprecated", "unknown"];
const TYPES = new Set(["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"]);

function semanticName(name) {
  return name.replace(/^--/, "").replace(/[^A-Za-z0-9_-]+/g, ".").replace(/[-_]+/g, ".").replace(/^\.+|\.+$/g, "");
}

function inferType(role, value) {
  const name = role.toLowerCase().replace(/[._]+/g, "-");
  if (name.startsWith("color-") || name === "color") return "color";
  if (name.startsWith("shadow-") || name === "shadow") return "shadow";
  if (name.startsWith("duration-") || name === "duration") return "duration";
  if (name.startsWith("ease-") || name.startsWith("easing-")) return "cubicBezier";
  if (name.startsWith("opacity-") || name === "opacity") return "number";
  if (name.startsWith("font-family-")) return "fontFamily";
  if (name.startsWith("font-weight-") || (name.startsWith("text-") && name.endsWith("-weight"))) return "fontWeight";
  if (name.startsWith("font-size-") || (name.startsWith("text-") && name.endsWith("-size"))) return "dimension";
  if ((name.startsWith("text-") && name.endsWith("-leading")) || name.startsWith("font-line-height-")) return "number";
  if (/^(?:spacing|size|radius|border-width)(?:-|$)/.test(name)) return "dimension";
  if (name.startsWith("gradient-") || name === "gradient") return "gradient";
  if (name.startsWith("transition-") || name === "transition") return "transition";
  if (typeof value === "number") return "number";
  if (typeof value === "string" && (/^#|^(?:rgb|hsl|oklch|lab)\(/i.test(value))) return "color";
  if (typeof value === "string" && /^-?(?:\d*\.)?\d+(?:px|rem|em|vh|vw|%)$/i.test(value)) return "dimension";
  if (typeof value === "string" && /^-?(?:\d*\.)?\d+(?:ms|s)$/i.test(value)) return "duration";
  return null;
}

function addToken(root, name, token, losses) {
  const parts = semanticName(name).split(".").filter(Boolean);
  if (!parts.length) fail("token projection", `invalid token name ${name}`);
  const group = parts.length === 1 ? null : parts[0];
  const leaf = parts.length === 1 ? parts[0] : parts.slice(1).join("-");
  if (group !== null && Object.hasOwn(root, group) && Object.hasOwn(root[group], "$value")) {
    losses.push({ severity: "blocked", code: "path-collision", path: name, message: "token group collides with a token" });
    return;
  }
  const parent = group === null ? root : (root[group] ||= {});
  if (Object.hasOwn(parent, leaf)) {
    losses.push({ severity: "blocked", code: "path-collision", path: name, message: "normalized token path is not unique" });
    return;
  }
  parent[leaf] = token;
}

function projectDesignSystemTokens(catalog) {
  validateCatalog(catalog);
  const tokenEntry = catalog.entries.slice().sort((a, b) => a.id.localeCompare(b.id)).find((entry) => entry.theme?.tokens || entry.tokens);
  const source = tokenEntry?.theme?.tokens ?? tokenEntry?.tokens;
  if (!isObject(source) || !Object.keys(source).length) fail("token projection", "catalog entry theme.tokens or tokens must be a non-empty object");
  const projected = {};
  const losses = [];
  for (const name of Object.keys(source).sort()) {
    const raw = source[name];
    let value = raw;
    let type;
    let role = semanticName(name);
    let modes;
    if (Array.isArray(raw)) {
      if (raw.length !== 2 || raw.some((item) => typeof item !== "string" && typeof item !== "number")) fail("token projection", `${name} must be a [light, dark] tuple`);
      [value] = raw;
      modes = { light: raw[0], dark: raw[1] };
    } else if (isObject(raw)) {
      const allowed = ["value", "type", "role"];
      const extras = Object.keys(raw).filter((key) => !allowed.includes(key));
      if (extras.length || !Object.hasOwn(raw, "value")) fail("token projection", `${name} has unsupported token properties`);
      value = raw.value;
      type = raw.type;
      role = raw.role || role;
      if (Array.isArray(value)) {
        if (value.length !== 2 || value.some((item) => typeof item !== "string" && typeof item !== "number")) fail("token projection", `${name}.value must be a [light, dark] tuple`);
        modes = { light: value[0], dark: value[1] };
        [value] = value;
      }
    }
    if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) fail("token projection", `${name} has an invalid value`);
    if (type !== undefined && !TYPES.has(type)) fail("token projection", `${name}.type has invalid value ${String(type)}`);
    type ||= inferType(role, value);
    if (!type) {
      type = "number";
      losses.push({ severity: "review", code: "type-unresolved", path: name, message: "source token type cannot be inferred without semantic interpretation" });
    }
    const extension = { role };
    if (modes) extension.modes = modes;
    extension.sourceName = name;
    addToken(projected, name, { $type: type, $value: value, $extensions: { "design-pipeline": extension } }, losses);
  }
  const blocked = losses.some((loss) => loss.severity === "blocked");
  const tokens = {
    schema: "design-pipeline.design-tokens.v1",
    dtcgProfile: "2025.10",
    provenance: {
      source: tokenEntry.provenance.source,
      sha256: sha256(canonicalJson(source)),
      license: tokenEntry.provenance.license,
    },
    tokens: projected,
  };
  if (!blocked) validateTokens(tokens);
  return { schema: PROJECTION_SCHEMA, status: blocked ? "blocked" : losses.length ? "review" : "ready", tokens, losses };
}

function parseVersion(value, label) {
  const match = String(value || "").trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-[0-9A-Za-z.-]+)?$/);
  if (!match) fail("design system decision", `${label} is not a supported semantic version`);
  return [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)];
}

function compareVersion(left, right) {
  for (let index = 0; index < 3; index += 1) if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  return 0;
}

function satisfiesVersion(actualValue, constraintValue, label) {
  const actual = parseVersion(actualValue, `${label} installed version`);
  const constraint = String(constraintValue).trim();
  if (constraint.startsWith(">=")) return compareVersion(actual, parseVersion(constraint.slice(2), `${label} constraint`)) >= 0;
  if (constraint.startsWith("^")) {
    const lower = parseVersion(constraint.slice(1), `${label} constraint`);
    const upper = lower[0] > 0 ? [lower[0] + 1, 0, 0] : lower[1] > 0 ? [0, lower[1] + 1, 0] : [0, 0, lower[2] + 1];
    return compareVersion(actual, lower) >= 0 && compareVersion(actual, upper) < 0;
  }
  return compareVersion(actual, parseVersion(constraint, `${label} constraint`)) === 0;
}

function runtimeOf(value) {
  const runtime = value?.runtime || value?.content?.runtime || {};
  return {
    react: runtime.react,
    reactDom: runtime.reactDom || runtime["react-dom"],
    stylex: runtime.stylex || runtime["@stylexjs/stylex"],
  };
}

function incompatibilities(project, candidate) {
  const expected = runtimeOf(candidate);
  const actual = runtimeOf(project);
  const issues = [];
  for (const key of ["react", "reactDom", "stylex"]) {
    if (expected[key] && (!actual[key] || !satisfiesVersion(actual[key], expected[key], key))) issues.push(`${key}:${actual[key] || "missing"}!~${expected[key]}`);
  }
  if (actual.react && actual.reactDom && parseVersion(actual.react, "react installed version")[0] !== parseVersion(actual.reactDom, "react-dom installed version")[0]) issues.push("react:react-dom-major-mismatch");
  return issues;
}

function existingSystem(project) {
  const value = project?.designSystem || project?.existingDesignSystem;
  if (value) return typeof value === "string" ? { id: value, source: "project" } : { ...value, source: value.source || "project" };
  if (project?.designMd || project?.DESIGN) return { id: "project-design", source: "DESIGN.md" };
  return null;
}

function validateFrontendStackDecision(value) {
  if (!isObject(value) || value.schema !== "design-pipeline.frontend-stack-decision.v1") return false;
  if (value.status !== "ready" || !/^[a-f0-9]{64}$/.test(value.registryHash || "")) return false;
  return isObject(value.selected) && isObject(value.selected.styling) && isObject(value.selected.uiLibrary) && Array.isArray(value.toolRoutes);
}

function validateCapabilityInventory(value) {
  assertObject(value, "capabilityInventory", "design system decision");
  if (!Array.isArray(value.searchedCapabilities)) fail("design system decision", "capabilityInventory.searchedCapabilities must be an array");
  if (typeof value.directQuery !== "string" || !value.directQuery.trim()) fail("design system decision", "capabilityInventory.directQuery must be a non-empty string");
  if (!Number.isInteger(value.directQueryResults) || value.directQueryResults < 0) fail("design system decision", "capabilityInventory.directQueryResults must be a non-negative integer");
  if (!isObject(value.capabilityResults)) fail("design system decision", "capabilityInventory.capabilityResults must be an object");
}

function decideDesignSystem(request) {
  assertObject(request, "request", "design system decision");
  if (request.schema !== undefined && request.schema !== "design-pipeline.design-system-decision-request.v1") fail("design system decision", "unsupported request schema");
  if (request.version !== undefined && request.version !== "1") fail("design system decision", "unsupported request version");
  assertEnum(request.mode, MODES, "mode", "design system decision");
  validateCatalog(request.catalog);
  if (request.allowCanary !== undefined && typeof request.allowCanary !== "boolean") fail("design system decision", "allowCanary must be boolean");
  const evidence = [];
  const rationale = [];
  const rejected = [];
  const existing = existingSystem(request.project);
  const projectAuthority = existing;
  if (existing) evidence.push(`project-authority:${existing.source}`);
  if (!validateFrontendStackDecision(request.frontendStackDecision)) {
    rationale.push("A ready frontend-stack decision is required before selecting a design system.");
    return { schema: DECISION_SCHEMA, status: "blocked", mode: request.mode, projectAuthority, selected: null, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision || null, capabilityInventory: request.capabilityInventory || null };
  }
  evidence.push(`frontend-stack:${request.frontendStackDecision.registryHash}`);
  if (request.mode !== "custom" && request.capabilityInventory === undefined) {
    rationale.push("Capability inventory is required before selecting a design system. Decompose the brief and search the catalog first.");
    return { schema: DECISION_SCHEMA, status: "blocked", mode: request.mode, projectAuthority, selected: null, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision, capabilityInventory: null };
  }
  if (request.capabilityInventory !== undefined) {
    validateCapabilityInventory(request.capabilityInventory);
    const capabilityHits = Object.values(request.capabilityInventory.capabilityResults).reduce((sum, item) => sum + (item?.count || 0), 0);
    if (request.capabilityInventory.directQueryResults === 0 && capabilityHits > 0) evidence.push("zero-result-inconclusive");
    evidence.push(`capability-inventory:${request.capabilityInventory.searchedCapabilities.length}:${capabilityHits}`);
  }
  if (request.mode === "custom") {
    const selected = existing || { id: request.customId || "project-custom", source: "project" };
    rationale.push("Custom mode keeps the design system project-owned.");
    evidence.push("mode:custom");
    return { schema: DECISION_SCHEMA, status: "ready", mode: request.mode, projectAuthority: selected, selected, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision, capabilityInventory: request.capabilityInventory || null };
  }
  const candidates = request.catalog.entries.slice().sort((a, b) => a.id.localeCompare(b.id));
  let selected = null;
  for (const entry of candidates) {
    if (request.candidateId && entry.id !== request.candidateId) { rejected.push({ id: entry.id, reason: "not-requested" }); continue; }
    const entryStatus = entry.status || "stable";
    assertEnum(entryStatus, STATUSES, `${entry.id}.status`, "design system decision");
    if (["deprecated", "unknown"].includes(entryStatus)) { rejected.push({ id: entry.id, reason: `status-${entryStatus}` }); continue; }
    if (["canary", "beta", "experimental"].includes(entryStatus) && !request.allowCanary) { rejected.push({ id: entry.id, reason: "prerelease-not-allowed" }); continue; }
    const issues = incompatibilities(request.project, entry);
    if (issues.length && request.mode !== "reference") { rejected.push({ id: entry.id, reason: "runtime-incompatible", evidence: issues }); continue; }
    const sourceHash = entry.hash;
    selected = { id: entry.id, status: entryStatus, sourceHash };
    evidence.push(`catalog:${entry.id}@${sourceHash}`);
    break;
  }
  if (!selected) {
    rationale.push("No eligible catalog entry satisfies status and runtime constraints.");
    return { schema: DECISION_SCHEMA, status: "blocked", mode: request.mode, projectAuthority, selected: null, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision, capabilityInventory: request.capabilityInventory };
  }
  if (["adopt", "substitute"].includes(request.mode)) {
    const intakeStatus = request.adapterIntake?.status;
    if (!["admitted", "admissible"].includes(intakeStatus)) {
      if (intakeStatus !== undefined && !["blocked", "review"].includes(intakeStatus)) fail("design system decision", `unknown adapter intake status ${intakeStatus}`);
      rejected.push({ id: selected.id, reason: "adapter-intake-not-admitted" });
      rationale.push(`${request.mode} requires an admitted adapter intake.`);
      return { schema: DECISION_SCHEMA, status: "blocked", mode: request.mode, projectAuthority, selected: null, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision, capabilityInventory: request.capabilityInventory };
    }
    evidence.push(`adapter-intake:${intakeStatus}`);
  }
  if (existing && request.mode === "substitute") rejected.push({ id: existing.id, reason: "explicitly-substituted" });
  if (existing && request.mode !== "substitute") rationale.push("The project system remains the governing authority.");
  rationale.push(request.mode === "reference" ? "Selected as a non-runtime reference." : `Selected for ${request.mode} with compatible runtime constraints.`);
  return { schema: DECISION_SCHEMA, status: "ready", mode: request.mode, projectAuthority, selected, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision, capabilityInventory: request.capabilityInventory };
}

module.exports = { CATALOG_SCHEMA, DECISION_SCHEMA, MODES, PROJECTION_SCHEMA, decideDesignSystem, projectDesignSystemTokens, validateCatalog };
