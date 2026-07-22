"use strict";

const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  fail,
  isObject,
  rejectExecutable,
} = require("./contract-utils.cjs");

const TOKEN_TYPES = ["color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"];
const SUPPORT = ["native", "generic-workflow", "companion", "unsupported", "out-of-scope"];

function validateTokenNode(node, label, inheritedType, seen) {
  assertObject(node, label, "design tokens");
  const isToken = Object.hasOwn(node, "$value");
  if (isToken) {
    const allowed = ["$value", "$type", "$description", "$extensions"];
    const extras = Object.keys(node).filter((key) => !allowed.includes(key));
    if (extras.length) fail("design tokens", `${label} has unsupported fields: ${extras.join(", ")}`);
    const type = node.$type || inheritedType;
    assertEnum(type, TOKEN_TYPES, `${label}.$type`, "design tokens");
    if (node.$value === undefined || (typeof node.$value === "number" && !Number.isFinite(node.$value))) fail("design tokens", `${label}.$value is invalid`);
    if (node.$description !== undefined && typeof node.$description !== "string") fail("design tokens", `${label}.$description must be a string`);
    const role = node.$extensions?.["design-pipeline"]?.role;
    assertString(role, `${label} semantic role`, "design tokens");
    seen.count += 1;
    return;
  }
  const groupType = node.$type || inheritedType;
  const children = Object.entries(node).filter(([key]) => !key.startsWith("$"));
  if (!children.length) fail("design tokens", `${label} group is empty`);
  for (const [key, value] of children) {
    if (!/^[A-Za-z0-9_-]+$/.test(key)) fail("design tokens", `${label}.${key} has invalid name`);
    validateTokenNode(value, `${label}.${key}`, groupType, seen);
  }
}

function validateTokens(document) {
  assertKeys(document, ["schema", "dtcgProfile", "provenance", "tokens"], ["schema", "dtcgProfile", "provenance", "tokens"], "tokens", "design tokens");
  if (document.schema !== "design-pipeline.design-tokens.v1") fail("design tokens", "unsupported schema");
  if (document.dtcgProfile !== "2025.10") fail("design tokens", "dtcgProfile must be 2025.10");
  assertKeys(document.provenance, ["source", "sha256", "license"], ["source", "sha256", "license"], "provenance", "design tokens");
  for (const key of ["source", "license"]) assertString(document.provenance[key], `provenance.${key}`, "design tokens");
  if (!/^[a-f0-9]{64}$/i.test(document.provenance.sha256)) fail("design tokens", "provenance.sha256 must be SHA-256");
  const seen = { count: 0 };
  validateTokenNode(document.tokens, "tokens", null, seen);
  return { status: "valid", tokenCount: seen.count, document };
}

function validateCatalog(catalog) {
  assertKeys(catalog, ["schema", "version", "patterns"], ["schema", "version", "patterns"], "catalog", "patterns");
  if (catalog.schema !== "design-pipeline.ui-pattern-catalog.v1") fail("patterns", "unsupported catalog schema");
  assertString(catalog.version, "version", "patterns");
  if (!Array.isArray(catalog.patterns) || !catalog.patterns.length) fail("patterns", "patterns must not be empty");
  const ids = new Set();
  for (const [index, pattern] of catalog.patterns.entries()) {
    const label = `patterns[${index}]`;
    const keys = ["id", "aliases", "category", "platforms", "anatomy", "states", "interactions", "checks", "relations", "provenance", "support"];
    assertKeys(pattern, keys, keys, label, "patterns");
    assertString(pattern.id, `${label}.id`, "patterns");
    if (ids.has(pattern.id)) fail("patterns", `duplicate pattern id ${pattern.id}`);
    ids.add(pattern.id);
    for (const key of ["aliases", "platforms", "anatomy", "states", "interactions", "checks", "relations"]) assertStringArray(pattern[key], `${label}.${key}`, "patterns", { unique: true });
    assertString(pattern.category, `${label}.category`, "patterns");
    assertString(pattern.provenance, `${label}.provenance`, "patterns");
    assertEnum(pattern.support, SUPPORT, `${label}.support`, "patterns");
  }
  for (const pattern of catalog.patterns) for (const relation of pattern.relations) if (!ids.has(relation)) fail("patterns", `${pattern.id} references unknown relation ${relation}`);
  return catalog;
}

function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return rows[a.length][b.length];
}

function searchPatterns(catalog, options = {}) {
  validateCatalog(catalog);
  const query = String(options.query || "").trim().toLowerCase();
  return catalog.patterns
    .filter((pattern) => !options.category || pattern.category === options.category)
    .filter((pattern) => !options.platform || pattern.platforms.includes(options.platform))
    .map((pattern) => {
      const terms = [pattern.id, ...pattern.aliases].map((item) => item.toLowerCase());
      const score = query ? Math.min(...terms.map((term) => term === query ? 0 : term.includes(query) ? 1 : editDistance(term, query) + 2)) : 0;
      return { ...pattern, score };
    })
    .filter((pattern) => !query || pattern.score <= Math.max(4, Math.ceil(query.length / 2) + 2))
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
}

function auditPatterns(catalog) {
  validateCatalog(catalog);
  const coverage = Object.fromEntries(SUPPORT.map((support) => [support, catalog.patterns.filter((pattern) => pattern.support === support).map((pattern) => pattern.id)]));
  return { status: "valid", total: catalog.patterns.length, coverage };
}

function validateUiIr(ir, catalog) {
  assertKeys(ir, ["schema", "catalogVersion", "nodes"], ["schema", "catalogVersion", "nodes"], "ir", "ui ir");
  if (ir.schema !== "design-pipeline.ui-ir.v1") fail("ui ir", "unsupported schema");
  validateCatalog(catalog);
  if (ir.catalogVersion !== catalog.version) fail("ui ir", "catalogVersion does not match catalog");
  if (!Array.isArray(ir.nodes) || !ir.nodes.length) fail("ui ir", "nodes must not be empty");
  const ids = new Set();
  const componentIds = new Set(catalog.patterns.map((pattern) => pattern.id));
  ir.nodes.forEach((node, index) => {
    const label = `nodes[${index}]`;
    assertKeys(node, ["id", "componentId", "props", "children"], ["id", "componentId", "props", "children"], label, "ui ir");
    assertString(node.id, `${label}.id`, "ui ir");
    if (ids.has(node.id)) fail("ui ir", `duplicate node id ${node.id}`);
    ids.add(node.id);
    if (!componentIds.has(node.componentId)) fail("ui ir", `${label}.componentId is not in catalog`);
    assertObject(node.props, `${label}.props`, "ui ir");
    assertStringArray(node.children, `${label}.children`, "ui ir", { unique: true });
    rejectExecutable(node.props, `${label}.props`, "ui ir");
  });
  for (const node of ir.nodes) for (const child of node.children) if (!ids.has(child)) fail("ui ir", `${node.id} references unknown child ${child}`);
  return { status: "valid", nodeCount: ir.nodes.length, ir };
}

function validateDesignCodeMap(document, options = {}) {
  assertKeys(document, ["schema", "uiIrSha256", "tokenSha256", "mappings"], ["schema", "uiIrSha256", "tokenSha256", "mappings"], "map", "design code map");
  if (document.schema !== "design-pipeline.design-code-map.v1") fail("design code map", "unsupported schema");
  for (const key of ["uiIrSha256", "tokenSha256"]) if (!/^[a-f0-9]{64}$/i.test(document[key])) fail("design code map", `${key} must be SHA-256`);
  if (!Array.isArray(document.mappings) || !document.mappings.length) fail("design code map", "mappings must not be empty");
  document.mappings.forEach((mapping, index) => {
    const label = `mappings[${index}]`;
    const keys = ["renderedId", "sourcePath", "line", "column", "componentId", "tokenRefs", "evidence"];
    assertKeys(mapping, keys, keys, label, "design code map");
    for (const key of ["renderedId", "sourcePath", "componentId"]) assertString(mapping[key], `${label}.${key}`, "design code map");
    if (path.isAbsolute(mapping.sourcePath) || mapping.sourcePath.split(/[\\/]/).includes("..")) fail("design code map", `${label}.sourcePath must be project-relative`);
    for (const key of ["line", "column"]) if (!Number.isInteger(mapping[key]) || mapping[key] < 1) fail("design code map", `${label}.${key} must be positive integer`);
    assertStringArray(mapping.tokenRefs, `${label}.tokenRefs`, "design code map", { unique: true });
    assertStringArray(mapping.evidence, `${label}.evidence`, "design code map", { min: 1, unique: true });
  });
  return { status: "valid", mappingCount: document.mappings.length, document };
}

module.exports = { SUPPORT, auditPatterns, searchPatterns, validateCatalog, validateDesignCodeMap, validateTokens, validateUiIr };
