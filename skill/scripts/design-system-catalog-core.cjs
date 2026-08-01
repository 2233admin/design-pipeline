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

module.exports = {
  CATALOG_SCHEMA,
  COLLECTIONS,
  KINDS,
  SNAPSHOT_SCHEMA,
  VERSION,
  canonicalCatalogJson: serializeCatalog,
  normalizeDesignSystemSnapshot: normalizeSnapshot,
  normalizeSnapshot,
  searchCatalog,
  searchDesignSystemCatalog: searchCatalog,
  serializeCatalog,
  validateCatalog,
  validateSnapshot,
};
