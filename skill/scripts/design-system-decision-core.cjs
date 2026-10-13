"use strict";

const { assertEnum, assertKeys, assertObject, assertString, assertStringArray, canonicalJson, fail, isObject, nonEmpty, sha256 } = require("./contract-utils.cjs");
const { CAPABILITY_TERMS, CATALOG_SCHEMA, decomposeCapabilities, searchCapabilities, searchCatalog, validateCatalog } = require("./design-system-catalog-core.cjs");
const { validateTokens } = require("./interoperability-core.cjs");

const DECISION_SCHEMA = "design-pipeline.design-system-decision.v1";
const PROJECTION_SCHEMA = "design-pipeline.design-system-token-projection.v1";
const MODES = ["reference", "adopt", "substitute", "custom"];
const STATUSES = ["stable", "canary", "beta", "experimental", "deprecated", "unknown"];
const TYPES = new Set(["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"]);
const SELECTION_BASES = ["owner-scratch", "preserve-existing", "capability-search"];
const DECISION_FIELDS = ["schema", "status", "mode", "projectAuthority", "selected", "rejected", "rationale", "evidence", "frontendStackDecision", "capabilityInventory", "selection"];

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

function inventoryCapabilityIds(value) {
  if (!Array.isArray(value)) fail("design system decision", "capabilityInventory.searchedCapabilities must be an array");
  const ids = value.map((item, index) => {
    const id = typeof item === "string" ? item : isObject(item) ? item.capability || item.id : null;
    if (!nonEmpty(id) || !Object.hasOwn(CAPABILITY_TERMS, id)) fail("design system decision", `searchedCapabilities[${index}] has an unknown capability`);
    if (isObject(item)) {
      if (item.id !== undefined && item.capability !== undefined && item.id !== item.capability) fail("design system decision", `searchedCapabilities[${index}] has contradictory identities`);
      if (item.terms !== undefined && canonicalJson(item.terms) !== canonicalJson(CAPABILITY_TERMS[id])) fail("design system decision", `searchedCapabilities[${index}].terms do not match the catalog search terms`);
    }
    return id;
  });
  if (new Set(ids).size !== ids.length) fail("design system decision", "searchedCapabilities must contain unique capabilities");
  return ids;
}

function validateMatchedIds(value, expected, label) {
  assertStringArray(value, label, "design system decision", { unique: true });
  if (canonicalJson([...value].sort()) !== canonicalJson(expected.map((entry) => entry.id).sort())) fail("design system decision", `${label} do not match current catalog search results`);
}

function validateCapabilityInventory(value, catalog) {
  assertKeys(value, ["catalogHash", "searchOptions", "directQuery", "directQueryResults", "directMatchedIds", "searchedCapabilities", "capabilityResults"], ["catalogHash", "searchOptions", "directQuery", "directQueryResults", "directMatchedIds", "searchedCapabilities", "capabilityResults", "zeroResultInconclusive"], "capabilityInventory", "design system decision");
  if (value.catalogHash !== sha256(canonicalJson(catalog))) fail("design system decision", "capabilityInventory.catalogHash does not match the current catalog");
  assertKeys(value.searchOptions, [], ["kind", "category", "status", "platform", "limit"], "capabilityInventory.searchOptions", "design system decision");
  assertString(value.directQuery, "capabilityInventory.directQuery", "design system decision");
  if (!Number.isInteger(value.directQueryResults) || value.directQueryResults < 0) fail("design system decision", "capabilityInventory.directQueryResults must be a non-negative integer");
  const direct = searchCatalog(catalog, { ...value.searchOptions, query: value.directQuery });
  if (value.directQueryResults !== direct.length) fail("design system decision", "capabilityInventory.directQueryResults do not match current catalog search results");
  validateMatchedIds(value.directMatchedIds, direct, "capabilityInventory.directMatchedIds");
  const ids = inventoryCapabilityIds(value.searchedCapabilities);
  const { capabilityMap, uniqueEntryCount } = searchCapabilities(catalog, ids, value.searchOptions);
  assertObject(value.capabilityResults, "capabilityInventory.capabilityResults", "design system decision");
  if (canonicalJson(Object.keys(value.capabilityResults).sort()) !== canonicalJson(ids.slice().sort())) fail("design system decision", "capabilityInventory.capabilityResults must match the searched capabilities");
  for (const id of ids) {
    const result = value.capabilityResults[id];
    const expected = capabilityMap[id];
    assertKeys(result, ["terms", "count", "matchedIds"], ["terms", "count", "matchedIds"], `capabilityResults.${id}`, "design system decision");
    if (canonicalJson(result.terms) !== canonicalJson(expected.terms)) fail("design system decision", `capabilityResults.${id}.terms do not match the catalog search terms`);
    if (!Number.isInteger(result.count) || result.count !== expected.count) fail("design system decision", `capabilityResults.${id}.count does not match current catalog search results`);
    validateMatchedIds(result.matchedIds, expected.entries, `capabilityResults.${id}.matchedIds`);
  }
  const inconclusive = direct.length === 0 && uniqueEntryCount > 0;
  if (value.zeroResultInconclusive !== undefined && value.zeroResultInconclusive !== inconclusive) fail("design system decision", "capabilityInventory.zeroResultInconclusive contradicts current catalog searches");
  return value;
}

function selectionIssues(value) {
  if (value === undefined || value === null) return ["Structured selection evidence is required before selecting a design system."];
  assertKeys(value, [], ["basis", "authority", "rationale", "compatibility", "compared"], "selection", "design system decision");
  const issues = [];
  if (value.basis === undefined) issues.push("Selection basis is required.");
  else assertEnum(value.basis, SELECTION_BASES, "selection.basis", "design system decision");
  if (value.authority === undefined || value.authority === null) issues.push("Selection authority is required.");
  else {
    assertKeys(value.authority, [], ["actor", "source", "text", "choice"], "selection.authority", "design system decision");
    for (const [key, allowed] of [["actor", ["owner", "agent"]], ["source", ["request", "reply", "project"]]]) {
      if (value.authority[key] === undefined) issues.push(`Selection authority ${key} is required.`);
      else assertEnum(value.authority[key], allowed, `selection.authority.${key}`, "design system decision");
    }
    for (const key of ["text", "choice"]) if (!nonEmpty(value.authority[key])) issues.push(`Selection authority ${key} must record the actual non-empty statement or choice.`);
  }
  if (!nonEmpty(value.rationale)) issues.push("Selection rationale is required.");
  if (value.compatibility !== undefined && !nonEmpty(value.compatibility)) issues.push("Selection compatibility must be non-empty when supplied.");
  if (!Array.isArray(value.compared)) issues.push("Selection compared candidates are required.");
  else {
    const ids = new Set();
    for (const item of value.compared) {
      assertKeys(item, [], ["id", "reason"], "selection.compared candidate", "design system decision");
      if (!nonEmpty(item.id) || !nonEmpty(item.reason)) issues.push("Every compared candidate needs an actual id and reason.");
      else if (ids.has(item.id)) fail("design system decision", `selection.compared has duplicate candidate ${item.id}`);
      else ids.add(item.id);
    }
  }
  return issues;
}

function projectStatements(project) {
  const statements = [];
  const system = project?.designSystem || project?.existingDesignSystem;
  for (const value of system ? [system] : [project?.designMd, project?.DESIGN]) {
    if (nonEmpty(value)) statements.push(value);
    else if (isObject(value)) for (const key of ["id", "text", "evidence"]) if (nonEmpty(value[key])) statements.push(value[key]);
  }
  return statements;
}

function searchedSelectionIssues(request, selection) {
  const issues = [];
  if (!nonEmpty(selection.compatibility)) issues.push("Searched fallback and substitution require a compatibility explanation.");
  if (!selection.compared.length) issues.push("Searched fallback and substitution require compared/rejected candidate ids and reasons.");
  const inventory = request.capabilityInventory;
  const searched = inventoryCapabilityIds(inventory.searchedCapabilities);
  if (!searched.length) issues.push("Searched fallback and substitution require actual capability searches, not only a product query.");
  const required = new Set(decomposeCapabilities(inventory.directQuery, { minScore: 1, allowPartialWords: false }));
  for (const brief of [request.brief, request.query]) for (const id of decomposeCapabilities(brief, { minScore: 1, allowPartialWords: false })) required.add(id);
  if ([...required].some((id) => !searched.includes(id))) issues.push("Capability inventory omits capabilities decomposed from the actual request.");
  const { capabilityMap } = searchCapabilities(request.catalog, [...new Set([...searched, ...required])]);
  const relevant = new Set(searchCatalog(request.catalog, { query: inventory.directQuery }).map((entry) => entry.id));
  for (const result of Object.values(capabilityMap)) for (const entry of result.entries) relevant.add(entry.id);
  if (!relevant.size) issues.push("Searched fallback and substitution need actual searched candidates to compare; an empty product query is not comparison evidence.");
  const recorded = new Set([...inventory.directMatchedIds, ...Object.values(inventory.capabilityResults).flatMap((item) => item.matchedIds)]);
  if ([...relevant].some((id) => !recorded.has(id))) issues.push("Bounded or filtered searches omit relevant catalog hits and cannot establish fallback evidence.");
  const compared = new Set(selection.compared.map((item) => item.id));
  if ([...relevant].some((id) => !compared.has(id))) issues.push("Every relevant catalog hit must be compared or rejected with its reason; a product miss is inconclusive.");
  return issues;
}

function decideDesignSystem(request) {
  assertObject(request, "request", "design system decision");
  if (request.schema !== undefined && request.schema !== "design-pipeline.design-system-decision-request.v1") fail("design system decision", "unsupported request schema");
  if (request.version !== undefined && request.version !== "1") fail("design system decision", "unsupported request version");
  assertEnum(request.mode, MODES, "mode", "design system decision");
  validateCatalog(request.catalog);
  if (request.allowCanary !== undefined && typeof request.allowCanary !== "boolean") fail("design system decision", "allowCanary must be boolean");
  for (const key of ["candidateId", "customId"]) if (request[key] !== undefined) assertString(request[key], key, "design system decision");
  if (request.candidateId !== undefined && !request.catalog.entries.some((entry) => entry.id === request.candidateId)) fail("design system decision", `unknown or ambiguous catalog candidate ${request.candidateId}; clarify its identity`);
  const evidence = [];
  const rationale = [];
  const rejected = [];
  const existing = existingSystem(request.project);
  if (existing && !nonEmpty(existing.id)) fail("design system decision", "observed project design system identity is missing or ambiguous; clarify its identity");
  const missingSelection = selectionIssues(request.selection);
  const selection = missingSelection.length ? null : request.selection;
  const result = (status, selected = null, projectAuthority = existing) => ({ schema: DECISION_SCHEMA, status, mode: request.mode, projectAuthority, selected, rejected, rationale, evidence, frontendStackDecision: request.frontendStackDecision || null, capabilityInventory: request.capabilityInventory ?? null, selection: status === "ready" ? selection : null });
  if (existing) evidence.push(`project-authority:${existing.source}`);
  if (!validateFrontendStackDecision(request.frontendStackDecision)) {
    rationale.push("A ready frontend-stack decision is required before selecting a design system.");
    return result("blocked");
  }
  evidence.push(`frontend-stack:${request.frontendStackDecision.registryHash}`);
  if (request.capabilityInventory !== undefined && request.capabilityInventory !== null) {
    validateCapabilityInventory(request.capabilityInventory, request.catalog);
    const capabilityHits = Object.values(request.capabilityInventory.capabilityResults).reduce((sum, item) => sum + item.count, 0);
    if (request.capabilityInventory.directQueryResults === 0 && capabilityHits > 0) evidence.push("zero-result-inconclusive");
    evidence.push(`capability-inventory:${request.capabilityInventory.searchedCapabilities.length}:${capabilityHits}`);
  }
  if ((!selection || selection.basis === "capability-search" || request.mode !== "custom") && request.capabilityInventory == null) {
    rationale.push("Capability inventory is required before selecting a design system unless explicit owner-scratch or observed preserve-existing selection applies.");
    return result("blocked");
  }
  if (missingSelection.length) {
    rationale.push(...missingSelection);
    return result("blocked");
  }
  for (const item of selection.compared) if (!request.catalog.entries.some((entry) => entry.id === item.id) && item.id !== existing?.id) fail("design system decision", `unknown compared candidate ${item.id}`);
  const authority = selection.authority;
  if (selection.basis === "preserve-existing") {
    if (request.mode !== "custom" || !existing || authority.source !== "project" || ![request.mode, existing.id].includes(authority.choice) || !projectStatements(request.project).includes(authority.text)) {
      rationale.push("Preserve-existing selection must match the observed project's current system, source and actual statement.");
      return result("blocked");
    }
  } else {
    if (authority.choice !== request.mode) {
      rationale.push("Selection authority choice does not match the requested mode.");
      return result("blocked");
    }
    if (selection.basis === "owner-scratch" && request.mode !== "custom") {
      rationale.push("Owner-scratch selection applies only to custom mode.");
      return result("blocked");
    }
    if ((selection.basis === "owner-scratch" || ["custom", "substitute"].includes(request.mode)) && (authority.actor !== "owner" || !["request", "reply"].includes(authority.source))) {
      rationale.push("Scratch, custom fallback and substitution require the actual owner's structured request or reply; research is not adoption authority.");
      return result("blocked");
    }
  }
  if (selection.basis === "capability-search" && ["custom", "substitute"].includes(request.mode)) {
    const issues = searchedSelectionIssues(request, selection);
    if (issues.length) {
      rationale.push(...issues);
      return result("blocked");
    }
  }
  evidence.push(`selection:${selection.basis}:${authority.actor}:${authority.source}`);
  rationale.push(selection.rationale);
  if (request.mode === "custom") {
    if (request.candidateId !== undefined || (existing && request.customId !== undefined && request.customId !== existing.id)) {
      rationale.push("Custom mode retains project-owned authority; clarify a contradictory catalog or replacement identity instead of silently translating it.");
      return result("blocked");
    }
    const selected = existing || { id: request.customId || "project-custom", source: "project" };
    if (selection.basis === "capability-search") rejected.push(...selection.compared.filter((item) => item.id !== selected.id).map((item) => ({ ...item })));
    rationale.push("Custom mode keeps the design system project-owned.");
    evidence.push("mode:custom");
    return result("ready", selected, selected);
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
    selected = { id: entry.id, status: entryStatus, sourceHash: entry.hash };
    evidence.push(`catalog:${entry.id}@${entry.hash}`);
    break;
  }
  if (!selected) {
    rationale.push("No eligible catalog entry satisfies status and runtime constraints.");
    return result("blocked");
  }
  if (request.mode === "substitute" && !selection.compared.some((item) => item.id === selected.id)) {
    rationale.push("Substitution requires an actual comparison of the selected catalog candidate.");
    return result("blocked");
  }
  if (["adopt", "substitute"].includes(request.mode)) {
    const intakeStatus = request.adapterIntake?.status;
    if (!["admitted", "admissible"].includes(intakeStatus)) {
      if (intakeStatus !== undefined && !["blocked", "review"].includes(intakeStatus)) fail("design system decision", `unknown adapter intake status ${intakeStatus}`);
      rejected.push({ id: selected.id, reason: "adapter-intake-not-admitted" });
      rationale.push(`${request.mode} requires an admitted adapter intake.`);
      return result("blocked");
    }
    evidence.push(`adapter-intake:${intakeStatus}`);
  }
  if (existing && request.mode === "substitute") rejected.push({ id: existing.id, reason: "explicitly-substituted" });
  for (const item of selection.compared) if (item.id !== selected.id && !rejected.some((entry) => entry.id === item.id)) rejected.push({ ...item });
  if (existing && request.mode !== "substitute") rationale.push("The project system remains the governing authority.");
  rationale.push(request.mode === "reference" ? "Selected as a non-runtime reference." : `Selected for ${request.mode} with compatible runtime constraints.`);
  return result("ready", selected);
}

function validateBindingPath(value, label) {
  assertString(value, label, "design system decision");
  if (/^[\\/]|^[A-Za-z]:/.test(value) || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..")) fail("design system decision", `${label} must be a contained relative path`);
}

function validateDesignSystemDecision(value, options = {}) {
  assertKeys(options, [], ["request"], "validation options", "design system decision");
  assertKeys(value, DECISION_FIELDS, [...DECISION_FIELDS, "request", "sourceBindings"], "decision", "design system decision");
  if (value.schema !== DECISION_SCHEMA) fail("design system decision", "unsupported decision schema");
  assertEnum(value.status, ["ready", "review", "blocked"], "decision.status", "design system decision");
  assertEnum(value.mode, MODES, "decision.mode", "design system decision");
  for (const key of ["projectAuthority", "selected", "frontendStackDecision", "capabilityInventory"]) if (value[key] !== null) assertObject(value[key], `decision.${key}`, "design system decision");
  if (!Array.isArray(value.rejected)) fail("design system decision", "decision.rejected must be an array");
  for (const item of value.rejected) {
    assertKeys(item, ["id", "reason"], ["id", "reason", "evidence"], "decision.rejected candidate", "design system decision");
    assertString(item.id, "rejected.id", "design system decision");
    assertString(item.reason, "rejected.reason", "design system decision");
    if (item.evidence !== undefined) assertStringArray(item.evidence, "rejected.evidence", "design system decision");
  }
  for (const key of ["rationale", "evidence"]) assertStringArray(value[key], `decision.${key}`, "design system decision");
  if (value.selection !== null) {
    const issues = selectionIssues(value.selection);
    if (issues.length) fail("design system decision", issues.join(" "));
  } else if (value.status === "ready") fail("design system decision", "ready decision requires structured selection evidence");
  if (value.request !== undefined) assertObject(value.request, "decision.request", "design system decision");
  if (value.sourceBindings !== undefined) {
    assertKeys(value.sourceBindings, ["requestPath", "inputHashes"], ["requestPath", "inputHashes"], "sourceBindings", "design system decision");
    validateBindingPath(value.sourceBindings.requestPath, "sourceBindings.requestPath");
    assertObject(value.sourceBindings.inputHashes, "sourceBindings.inputHashes", "design system decision");
    if (!Object.hasOwn(value.sourceBindings.inputHashes, value.sourceBindings.requestPath)) fail("design system decision", "sourceBindings must hash the request path");
    for (const [file, hash] of Object.entries(value.sourceBindings.inputHashes)) {
      validateBindingPath(file, "sourceBindings input path");
      if (!/^sha256:[a-f0-9]{64}$/.test(hash || "")) fail("design system decision", `sourceBindings hash for ${file} must be sha256-prefixed`);
    }
  }
  const request = options.request || value.request;
  if (!request) fail("design system decision", "decision replay requires its resolved request");
  const expected = decideDesignSystem(request);
  const actual = Object.fromEntries(DECISION_FIELDS.map((key) => [key, value[key]]));
  if (canonicalJson(actual) !== canonicalJson(expected)) fail("design system decision", "decision does not match replay of the current request");
  return value;
}

module.exports = { CATALOG_SCHEMA, DECISION_SCHEMA, MODES, PROJECTION_SCHEMA, decideDesignSystem, projectDesignSystemTokens, validateCatalog, validateDesignSystemDecision };
