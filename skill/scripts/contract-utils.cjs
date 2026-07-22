"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function fail(scope, message, details = {}) {
  const error = new Error(`${scope}: ${message}`);
  error.code = details.code || "CONTRACT_INVALID";
  error.details = details;
  throw error;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertObject(value, label, scope) {
  if (!isObject(value)) fail(scope, `${label} must be an object`);
}

function assertKeys(value, required, allowed, label, scope) {
  assertObject(value, label, scope);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(scope, `${label} is missing ${key}`);
  }
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) fail(scope, `${label} has unsupported properties: ${extras.join(", ")}`);
}

function assertString(value, label, scope) {
  if (!nonEmpty(value)) fail(scope, `${label} must be a non-empty string`);
}

function assertStringArray(value, label, scope, options = {}) {
  if (!Array.isArray(value) || !value.every(nonEmpty)) {
    fail(scope, `${label} must contain non-empty strings`);
  }
  if (options.unique && new Set(value).size !== value.length) {
    fail(scope, `${label} must contain unique values`);
  }
  if (options.min !== undefined && value.length < options.min) {
    fail(scope, `${label} must contain at least ${options.min} item(s)`);
  }
}

function assertEnum(value, allowed, label, scope) {
  if (!allowed.includes(value)) fail(scope, `${label} has invalid value ${String(value)}`);
}

function pathInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function resolveInside(root, raw, label, options = {}) {
  if (!nonEmpty(raw)) fail(options.scope || "path", `${label} requires a path`);
  const base = path.resolve(root);
  const target = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(base, raw);
  if (!pathInside(base, target)) fail(options.scope || "path", `${label} must stay inside ${base}`);
  if (!fs.existsSync(base)) fail(options.scope || "path", `root does not exist: ${base}`);
  const realBase = fs.realpathSync(base);
  let existing = target;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing || !pathInside(base, parent)) fail(options.scope || "path", `${label} has no contained existing parent`);
    existing = parent;
  }
  const projected = path.resolve(fs.realpathSync(existing), path.relative(existing, target));
  if (!pathInside(realBase, projected)) fail(options.scope || "path", `${label} resolves outside ${realBase}`);
  if (options.mustExist && !fs.existsSync(target)) fail(options.scope || "path", `${label} does not exist: ${target}`);
  return target;
}

function readJson(file, scope = "json") {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(scope, `cannot parse ${file}: ${error.message}`, { code: "JSON_PARSE" });
  }
  return parsed;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function canonicalJson(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

function jsonResult(ok, data = {}, error = null) {
  return ok
    ? { ...data, schema: "design-pipeline.cli-result.v1", ok: true }
    : {
        schema: "design-pipeline.cli-result.v1",
        ok: false,
        error: {
          code: error?.code || "COMMAND_FAILED",
          message: error?.message || String(error),
          details: error?.details || {},
        },
      };
}

function rejectExecutable(value, label, scope) {
  const text = JSON.stringify(value);
  const rules = [
    /<script\b/i,
    /\b(?:eval|Function)\s*\(/,
    /\b(?:require|import)\s*\(/,
    /(?:^|[,{])\s*"on[A-Z][^"]*"\s*:/,
    /https?:\/\//i,
  ];
  if (rules.some((rule) => rule.test(text))) fail(scope, `${label} contains executable or remote content`);
}

module.exports = {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  isObject,
  jsonResult,
  nonEmpty,
  pathInside,
  readJson,
  rejectExecutable,
  resolveInside,
  sha256,
  sortValue,
};
