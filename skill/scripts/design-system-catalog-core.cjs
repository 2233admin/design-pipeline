"use strict";

const path = require("node:path");
const {
  canonicalJson,
  fail,
  isObject,
  sha256,
  sortValue,
} = require("./contract-utils.cjs");

const SNAPSHOT_SCHEMA = "design-pipeline.design-system-snapshot.v1";
const CATALOG_SCHEMA = "design-pipeline.design-system-catalog.v1";
const VERSION = "1";
const COLLECTIONS = Object.freeze({ components: "component", docs: "doc", templates: "template", hooks: "hook" });
const KINDS = Object.freeze(Object.values(COLLECTIONS));
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const LOCAL_ID = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function invalid(message) {
  fail("design system catalog", message);
}

function ownObject(value, label) {
  if (!isObject(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    invalid(`${label} must be a plain object`);
  }
}

function safeClone(value, label = "value", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(`${label} contains a non-finite number`);
    return value;
  }
  if (typeof value !== "object") invalid(`${label} contains a non-JSON or executable value`);
  if (seen.has(value)) invalid(`${label} contains a cycle`);
  seen.add(value);
  let copy;
  if (Array.isArray(value)) {
    copy = value.map((item, index) => safeClone(item, `${label}[${index}]`, seen));
  } else {
    ownObject(value, label);
    copy = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) invalid(`${label} contains forbidden key ${key}`);
      copy[key] = safeClone(value[key], `${label}.${key}`, seen);
    }
  }
  seen.delete(value);
  return copy;
}

function requireVersionedDocument(value, schema, label) {
  ownObject(value, label);
  if (value.schema !== schema) invalid(`unsupported ${label} schema ${String(value.schema)}`);
  if (value.version !== VERSION) invalid(`unsupported ${label} version ${String(value.version)}`);
  safeClone(value, label);
}

function validateRelativePath(value, label) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} must be a non-empty relative path`);
  const segments = value.split(/[\\/]/);
  if (path.win32.isAbsolute(value) || path.posix.isAbsolute(value) || segments.includes("..") || value.includes("\0")) {
    invalid(`${label} must not escape its snapshot root`);
  }
}

function validatePaths(value, label) {
  if (Array.isArray(value)) return value.forEach((item, index) => validatePaths(item, `${label}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (/paths?$/i.test(key)) {
      const paths = Array.isArray(item) ? item : [item];
      paths.forEach((candidate, index) => validateRelativePath(candidate, `${label}.${key}${Array.isArray(item) ? `[${index}]` : ""}`));
    }
    else validatePaths(item, `${label}.${key}`);
  }
}

function validateProvenance(value, label) {
  ownObject(value, label);
  if (typeof value.source !== "string" || !value.source.trim()) invalid(`${label}.source must be a non-empty string`);
  if (typeof value.license !== "string" || !value.license.trim()) invalid(`${label}.license must be a non-empty string`);
  for (const key of ["url", "attribution"]) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || !value[key].trim())) invalid(`${label}.${key} must be a non-empty string`);
  }
}

function normalizedProvenance(snapshotProvenance, entryProvenance, label) {
  const merged = { ...safeClone(snapshotProvenance, "snapshot.provenance"), ...(entryProvenance === undefined ? {} : safeClone(entryProvenance, `${label}.provenance`)) };
  validateProvenance(merged, `${label}.provenance`);
  return sortValue(merged);
}

function validateSnapshot(snapshot) {
  requireVersionedDocument(snapshot, SNAPSHOT_SCHEMA, "snapshot");
  const allowed = new Set(["schema", "version", "namespace", "provenance", ...Object.keys(COLLECTIONS)]);
  const extras = Object.keys(snapshot).filter((key) => !allowed.has(key));
  if (extras.length) invalid(`snapshot has unsupported properties: ${extras.join(", ")}`);
  if (typeof snapshot.namespace !== "string" || !NAMESPACE.test(snapshot.namespace)) invalid("snapshot.namespace is invalid");
  validateProvenance(snapshot.provenance, "snapshot.provenance");
  let count = 0;
  for (const collection of Object.keys(COLLECTIONS)) {
    const entries = snapshot[collection];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) invalid(`snapshot.${collection} must be an array`);
    entries.forEach((entry, index) => {
      const label = `snapshot.${collection}[${index}]`;
      ownObject(entry, label);
      if (typeof entry.id !== "string" || !LOCAL_ID.test(entry.id)) invalid(`${label}.id is invalid`);
      if (entry.provenance !== undefined) ownObject(entry.provenance, `${label}.provenance`);
      validatePaths(entry, label);
      count += 1;
    });
  }
  if (!count) invalid("snapshot must contain at least one catalog entry");
  return snapshot;
}

function normalizeSnapshot(snapshot) {
  validateSnapshot(snapshot);
  const entries = [];
  const ids = new Set();
  for (const [collection, kind] of Object.entries(COLLECTIONS)) {
    for (const sourceEntry of snapshot[collection] || []) {
      const localId = sourceEntry.id;
      const id = `${snapshot.namespace}:${kind}:${localId}`;
      if (ids.has(id)) invalid(`duplicate catalog id ${id}`);
      ids.add(id);
      const cloned = safeClone(sourceEntry, `${collection}.${localId}`);
      delete cloned.id;
      const provenance = normalizedProvenance(snapshot.provenance, cloned.provenance, `${collection}.${localId}`);
      delete cloned.provenance;
      const entry = sortValue({ ...cloned, id, kind, localId, provenance });
      entry.hash = sha256(canonicalJson(entry));
      entries.push(sortValue(entry));
    }
  }
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return validateCatalog(sortValue({ schema: CATALOG_SCHEMA, version: VERSION, namespace: snapshot.namespace, entries }));
}

function validateCatalog(catalog) {
  requireVersionedDocument(catalog, CATALOG_SCHEMA, "catalog");
  const allowed = ["schema", "version", "namespace", "entries"];
  const extras = Object.keys(catalog).filter((key) => !allowed.includes(key));
  if (extras.length) invalid(`catalog has unsupported properties: ${extras.join(", ")}`);
  if (typeof catalog.namespace !== "string" || !NAMESPACE.test(catalog.namespace)) invalid("catalog.namespace is invalid");
  if (!Array.isArray(catalog.entries) || !catalog.entries.length) invalid("catalog.entries must not be empty");
  const ids = new Set();
  for (const [index, entry] of catalog.entries.entries()) {
    const label = `catalog.entries[${index}]`;
    ownObject(entry, label);
    if (!KINDS.includes(entry.kind)) invalid(`${label}.kind is invalid`);
    if (typeof entry.localId !== "string" || !LOCAL_ID.test(entry.localId)) invalid(`${label}.localId is invalid`);
    const expectedId = `${catalog.namespace}:${entry.kind}:${entry.localId}`;
    if (entry.id !== expectedId) invalid(`${label}.id must be ${expectedId}`);
    if (ids.has(entry.id)) invalid(`duplicate catalog id ${entry.id}`);
    ids.add(entry.id);
    validateProvenance(entry.provenance, `${label}.provenance`);
    validatePaths(entry, label);
    if (!/^[a-f0-9]{64}$/.test(entry.hash || "")) invalid(`${label}.hash must be SHA-256`);
    const hashInput = safeClone(entry, label);
    delete hashInput.hash;
    if (sha256(canonicalJson(sortValue(hashInput))) !== entry.hash) invalid(`${label}.hash does not match its content`);
  }
  return catalog;
}

function searchCatalog(catalog, options = {}) {
  validateCatalog(catalog);
  ownObject(options, "search options");
  safeClone(options, "search options");
  const allowed = ["query", "kind", "category", "status", "limit"];
  const extras = Object.keys(options).filter((key) => !allowed.includes(key));
  if (extras.length) invalid(`search has unsupported options: ${extras.join(", ")}`);
  const query = options.query === undefined ? "" : String(options.query).trim().toLowerCase();
  if (options.kind !== undefined && !KINDS.includes(options.kind)) invalid("search kind is invalid");
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) invalid("search limit must be a positive integer");
  for (const key of ["category", "status"]) if (options[key] !== undefined && (typeof options[key] !== "string" || !options[key].trim())) invalid(`search ${key} must be a non-empty string`);
  const matches = catalog.entries.filter((entry) => {
    if (options.kind && entry.kind !== options.kind) return false;
    if (options.category && entry.category !== options.category) return false;
    if (options.status && entry.status !== options.status) return false;
    return !query || canonicalJson(entry).toLowerCase().includes(query);
  });
  return matches.slice(0, options.limit === undefined ? matches.length : options.limit).map((entry) => safeClone(entry));
}

function serializeCatalog(catalog) {
  validateCatalog(catalog);
  return canonicalJson(catalog);
}

// Canonical UI capability terms mapped by UI pattern. Each entry lists the search terms
// to use when decomposing a product-level brief into catalog-searched capabilities.
// Keys are canonical UI pattern names; values are arrays of catalog search terms.
const CAPABILITY_TERMS = Object.freeze({
  "app-shell": ["app shell", "shell", "layout", "top bar", "sidebar", "navigation"],
  "command-palette": ["command", "palette", "command palette", "kbd", "shortcut", "quick action"],
  "side-nav": ["side nav", "navigation", "sidebar", "sidenav", "nav", "menu"],
  "data-table": ["data table", "table", "datagrid", "grid", "row", "column"],
  progress: ["progress", "loading", "spinner", "progress bar", "skeleton"],
  dialog: ["dialog", "modal", "alertdialog", "popup", "popover", "tooltip"],
  tabs: ["tab", "tabs", "tab bar"],
  button: ["button", "icon button", "action"],
  "text-input": ["input", "text field", "textarea", "form", "field"],
  select: ["select", "dropdown", "combobox", "listbox", "menu"],
  "date-picker": ["date", "date picker", "calendar", "date range"],
  toggle: ["toggle", "switch", "checkbox", "radio"],
  avatar: ["avatar", "avatar group", "person"],
  badge: ["badge", "tag", "chip", "pill"],
  card: ["card", "tile", "panel"],
  "empty-state": ["empty state", "empty", "placeholder", "no data", "illustration"],
  "error-state": ["error", "error state", "alert", "warning", "banner"],
  "loading-state": ["loading", "skeleton", "spinner", "progress"],
  pagination: ["pagination", "page", "pager", "previous", "next"],
  breadcrumb: ["breadcrumb", "breadcrumbs", "trail", "path"],
  search: ["search", "search input", "search bar", "filter"],
  stepper: ["stepper", "step", "wizard", "progress stepper"],
  "toast-notification": ["toast", "notification", "snackbar", "notice"],
  "accordion": ["accordion", "collapse", "expand", "disclosure"],
  drawer: ["drawer", "panel", "side panel", "sheet"],
  "file-upload": ["file upload", "upload", "dropzone", "file"],
  "color-picker": ["color picker", "color", "picker"],
  slider: ["slider", "range", "range slider"],
  tooltip: ["tooltip", "popover", "hint", "help"],
  divider: ["divider", "separator", "rule"],
  "list-group": ["list", "list group", "item", "item list"],
  "typography": ["text", "heading", "paragraph", "typography", "font"],
  "app-ui": ["app ui", "application ui", "dashboard", "settings", "profile", "auth", "workspace"],
  "animated-ui": ["animated ui", "motion ui", "animated interface", "micro interaction"],
  "basic-ui": ["basic ui", "animated input", "animated tabs", "accordion", "checkbox", "modal", "dropdown"],
  "text-animation": ["text animation", "animated text", "typewriter text", "reveal text", "scramble text", "shimmer text", "animated heading"],
  "ai-ui": ["ai ui", "ai interface", "assistant ui", "assistant interface", "agent interface"],
  "ai-chat": ["ai chat", "chat interface", "conversation ui", "prompt composer", "message list"],
  "ai-agent": ["ai agent", "agent workflow", "tool call", "task list", "approval card", "reasoning trace"],
  orb: ["orb", "assistant orb", "siri orb"],
  transition: ["transition", "page transition", "route transition", "shader transition", "reveal transition"],
  form: ["form", "form input", "form field", "otp"],
  feedback: ["feedback", "toast feedback", "notification feedback", "modal feedback"],
  input: ["input", "text input", "file upload", "otp input", "prompt input"],
  modal: ["modal", "popover", "drawer"],
  dropdown: ["dropdown", "combobox", "select menu", "searchable dropdown"],
  "data-display": ["data display", "number flow", "price flow", "metadata", "contribution graph", "stats display"],
  layout: ["layout", "card stack", "expandable cards", "infinite slider", "dynamic island"],
  smoothui: ["smoothui", "smooth ui"],
  "page-block": ["page block", "landing page", "page section", "section"],
  hero: ["hero", "hero section"],
  features: ["feature", "features", "feature section"],
  pricing: ["pricing", "pricing table", "plan"],
  faq: ["faq", "frequently asked questions"],
  cta: ["cta", "call to action"],
  stats: ["stats", "statistics", "metrics", "metric"],
  navigation: ["navigation", "navbar", "nav bar", "menu"],
  carousel: ["carousel", "slider", "slideshow"],
  "depth-carousel": ["depth carousel", "depth card", "3d carousel", "stacked carousel"],
  "parallax-carousel": ["parallax carousel", "parallax cards"],
  "3d-depth": ["3d depth", "depth effect", "perspective card"],
  "interactive-card": ["interactive card", "tilt card", "hover card"],
  "dither-background": ["dither background", "dithering", "dither", "抖动背景", "抖动"],
  "animated-background": ["animated background", "动态背景"],
  "shader-background": ["shader background", "webgl background", "着色器背景"],
  "numeric-content-transition": ["numeric text", "numeric", "counter", "animated number", "count up", "ticker", "changing number"],
  "numeric-text": ["numeric text", "number text", "rolling digits", "numeric"],
  "animated-stat": ["animated stat", "animated metric", "live counter", "stat"],
});

// Inverse lookup: map individual search terms back to their canonical capability names.
const TERM_TO_CAPABILITY = new Map();
for (const [capability, terms] of Object.entries(CAPABILITY_TERMS)) {
  for (const term of terms) {
    if (!TERM_TO_CAPABILITY.has(term)) TERM_TO_CAPABILITY.set(term, []);
    TERM_TO_CAPABILITY.get(term).push(capability);
  }
}

/**
 * Decompose a product-level brief phrase into canonical capability terms.
 * Returns a deduplicated list of canonical capability names whose terms are likely
 * relevant to the brief, based on substring matching of the brief against known terms.
 *
 * @param {string} brief - The product-level brief or query phrase.
 * @param {object} [options]
 * @param {number} [options.minScore=1] - Minimum matching term count to include a capability.
 * @returns {string[]} Sorted, deduplicated canonical capability names.
 */
function decomposeCapabilities(brief, options = {}) {
  if (typeof brief !== "string" || !brief.trim()) return [];
  ownObject(options, "decompose options");
  safeClone(options, "decompose options");
  const minScore = options.minScore === undefined ? 1 : Number(options.minScore);
  const allowPartialWords = options.allowPartialWords === undefined ? true : options.allowPartialWords === true;
  const lower = brief.trim().toLowerCase();
  const words = lower.split(/[\s,;.()\[\]{}"'\/=]+/).filter(Boolean);
  const scores = new Map();
  for (const [capability, terms] of Object.entries(CAPABILITY_TERMS)) {
    let score = 0;
    for (const term of terms) {
      // Direct substring match of the term in the brief
      if (lower.includes(term)) score += 1;
      // Match individual words from the brief against term parts
      if (allowPartialWords) {
        for (const word of words) {
          if (word.length >= 3 && term.includes(word)) score += 0.5;
        }
      }
    }
    score = Math.round(score);
    if (score >= minScore) scores.set(capability, score);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([capability]) => capability);
}

/**
 * Search the catalog for each capability term and return a map of capability → search results.
 * Each result entry includes the capability name, the search terms used, the number of matches,
 * and the matched catalog entries (cloned, safe).
 *
 * @param {object} catalog - Validated design system catalog.
 * @param {string[]} capabilities - Canonical capability names from decomposeCapabilities.
 * @param {object} [searchOptions] - Additional search options (kind, category, status, limit).
 * @returns {object} { capabilityMap: { [capability]: { terms, count, entries } } }
 */
function searchCapabilities(catalog, capabilities, searchOptions = {}) {
  validateCatalog(catalog);
  if (!Array.isArray(capabilities)) invalid("capabilities must be an array");
  safeClone(searchOptions, "search capabilities options");
  const capabilityMap = {};
  const seenIds = new Set();
  for (const capability of capabilities) {
    const terms = CAPABILITY_TERMS[capability];
    if (!terms) continue;
    const matched = new Map();
    for (const term of terms) {
      const results = searchCatalog(catalog, { ...searchOptions, query: term });
      for (const entry of results) {
        if (!matched.has(entry.id)) {
          matched.set(entry.id, { entry, matchedTerms: [] });
        }
        matched.get(entry.id).matchedTerms.push(term);
      }
    }
    const entries = [...matched.values()].map((item) => {
      const cloned = safeClone(item.entry);
      cloned.matchedTerms = item.matchedTerms;
      return cloned;
    });
    entries.forEach((entry) => seenIds.add(entry.id));
    capabilityMap[capability] = {
      terms,
      count: entries.length,
      entries,
    };
  }
  return { capabilityMap, uniqueEntryCount: seenIds.size };
}

module.exports = {
  CAPABILITY_TERMS,
  CATALOG_SCHEMA,
  COLLECTIONS,
  KINDS,
  SNAPSHOT_SCHEMA,
  TERM_TO_CAPABILITY,
  VERSION,
  canonicalCatalogJson: serializeCatalog,
  decomposeCapabilities,
  normalizeDesignSystemSnapshot: normalizeSnapshot,
  normalizeSnapshot,
  searchCapabilities,
  searchCatalog,
  searchDesignSystemCatalog: searchCatalog,
  serializeCatalog,
  validateCatalog,
  validateSnapshot,
};
