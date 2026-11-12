"use strict";

// tunables.json: what an owner may change in a film or a page without touching code. `params`
// are Playground controls (same vocabulary, same validator) plus unit/window/dynamic; `values`
// are the owner's changes. `tunables.js` is generated from the effective values and is the one
// thing every runtime reads: window.tunable(id), --tn-<id> custom properties, data-tn-<id>
// attributes on <html>, and data-tn-text bindings. No runtime is named anywhere in the contract.
// This module holds the contract, the generator, the checks and the stale-render test; command
// parsing lives in cli-core.cjs and the local editor in tunables-preview-core.cjs.

const fs = require("node:fs");
const path = require("node:path");
const { assertControl, valueMatches } = require("./playground-core.cjs");
const { canonicalJson, fail, sha256 } = require("./contract-utils.cjs");
const { cliCommand, shellPath } = require("./workflows/shared.cjs");

const SCHEMA = "design-pipeline.tunables.v1";
const FILE = "tunables.json";
const SCRIPT = "tunables.js";
const SCOPE = "tunables";
const MAX_PARAMS = 64;
const MAX_TEXT = 500;
const MAX_FILES = 5000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const CSS_UNITS = new Set(["px", "rem", "em", "%", "s", "ms", "deg", "vw", "vh"]);
const HEX = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const SCAN_EXTENSIONS = new Set([".html", ".js", ".mjs", ".cjs", ".css", ".ts", ".tsx", ".jsx", ".vue", ".svelte"]);
const SKIP_DIRS = new Set(["node_modules", "evidence", "renders", "qa"]);
const INCLUDE_TAG = `<script src="${SCRIPT}"></script>`;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const rel = (root, file) => path.relative(root, file).split(path.sep).join("/");

function command(root, action, extra = "") {
  const dir = shellPath(path.resolve(root));
  return `${cliCommand()} tunables ${action} --root ${dir} --project-root ${dir}${extra}`;
}

function finding(root, code, message, extra = {}) {
  const id = extra.id;
  const fixes = {
    "tunables-invalid": `Fix the param in ${FILE} (references/tunables.schema.json describes it), then run \`${command(root, "sync")}\`.`,
    "value-invalid": `Set a valid value with \`${command(root, "set", ` --param ${id || "<id>"}=<value>`)}\` or drop it with \`${command(root, "reset", ` --param ${id || "<id>"}`)}\`.`,
    "value-unknown": `Remove "${id}" from values in ${FILE}, or declare it in params.`,
    "script-stale": `Run \`${command(root, "sync")}\`; never edit ${SCRIPT} by hand.`,
    "script-not-included": `Add ${INCLUDE_TAG} to index.html before your own scripts (a library from a CDN or node_modules may come first).`,
    "param-unread": `Read "${id}" in the page: tunable("${id}") in script, var(--tn-${id}) in CSS, data-tn-text="${id}" on an element, or [data-tn-${id}] in a selector. Remove the param if nothing should use it, or set "dynamic": true when the id is built at run time.`,
    "read-undeclared": `Declare "${id}" in params of ${FILE}, or correct the id; tunable() throws on an undeclared id.`,
  };
  return { code, severity: "error", ...(id ? { id } : {}), message, fix: fixes[code] };
}

// A value problem as a sentence, or null when the value fits its param.
function valueProblem(param, value) {
  if (!valueMatches(param, value)) {
    if (param.type === "range") return `must be a number from ${param.min} to ${param.max}`;
    if (param.type === "select") return `must be one of: ${param.options.join(", ")}`;
    if (param.type === "checkbox") return "must be true or false";
    return "must be a string";
  }
  if (param.type === "color" && !HEX.test(value)) return "must be #rrggbb or #rrggbbaa in lower case";
  if (param.type === "text" && (value.length > MAX_TEXT || CONTROL_CHARS.test(value))) return `must be at most ${MAX_TEXT} characters with no control characters`;
  return null;
}

function assertParam(param, index) {
  assertControl(param, index, { scope: SCOPE, label: `params[${index}]`, extraKeys: ["unit", "window", "dynamic"] });
  const label = `params[${index}]`;
  const problem = valueProblem(param, param.default);
  if (problem) fail(SCOPE, `${label}.default ${problem}`);
  if (Object.hasOwn(param, "unit") && (typeof param.unit !== "string" || !param.unit || param.unit.length > 12 || CONTROL_CHARS.test(param.unit))) {
    fail(SCOPE, `${label}.unit must be a short label such as px, s or deg`);
  }
  if (Object.hasOwn(param, "dynamic") && typeof param.dynamic !== "boolean") fail(SCOPE, `${label}.dynamic must be true or false`);
  if (Object.hasOwn(param, "window")) {
    const window = param.window;
    if (!isObject(window) || Object.keys(window).sort().join() !== "endSec,startSec" || !Number.isFinite(window.startSec) || !Number.isFinite(window.endSec) || window.startSec < 0 || window.startSec >= window.endSec) {
      fail(SCOPE, `${label}.window must be { startSec, endSec } with 0 <= startSec < endSec`);
    }
  }
}

// Every problem in a document as { code, id, message }; empty when it is sound.
function inspectDocument(doc) {
  if (!isObject(doc)) return [{ code: "tunables-invalid", id: null, message: `${FILE} must be a JSON object` }];
  const extras = Object.keys(doc).filter((key) => !["schema", "params", "values"].includes(key));
  if (doc.schema !== SCHEMA) return [{ code: "tunables-invalid", id: null, message: `${FILE} schema must be ${SCHEMA}` }];
  if (extras.length) return [{ code: "tunables-invalid", id: null, message: `${FILE} has unsupported properties: ${extras.join(", ")}` }];
  if (!Array.isArray(doc.params) || doc.params.length > MAX_PARAMS) return [{ code: "tunables-invalid", id: null, message: `params must be an array of at most ${MAX_PARAMS} params` }];
  if (!isObject(doc.values)) return [{ code: "tunables-invalid", id: null, message: "values must be an object (use {} for none)" }];
  const problems = [];
  const seen = new Set();
  doc.params.forEach((param, index) => {
    try {
      assertParam(param, index);
    } catch (error) {
      problems.push({ code: "tunables-invalid", id: typeof param?.id === "string" ? param.id : null, message: error.message.replace(/^tunables: /, "") });
      return;
    }
    if (seen.has(param.id)) problems.push({ code: "tunables-invalid", id: param.id, message: `params has the id ${param.id} more than once` });
    seen.add(param.id);
  });
  if (problems.length) return problems;
  const byId = new Map(doc.params.map((param) => [param.id, param]));
  for (const [id, value] of Object.entries(doc.values)) {
    const param = byId.get(id);
    if (!param) {
      problems.push({ code: "value-unknown", id, message: `values names ${id}, which no param declares` });
      continue;
    }
    const problem = valueProblem(param, value);
    if (problem) problems.push({ code: "value-invalid", id, message: `values.${id} ${problem}` });
  }
  return problems;
}

function assertDocument(doc) {
  const [problem] = inspectDocument(doc);
  if (problem) fail(SCOPE, problem.message, { code: problem.code === "tunables-invalid" ? "TUNABLES_INVALID" : "VALUE_INVALID", id: problem.id });
}

function emptyDocument() {
  return { schema: SCHEMA, params: [], values: {} };
}

function effectiveValues(doc) {
  const out = {};
  for (const param of [...doc.params].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    out[param.id] = Object.hasOwn(doc.values, param.id) ? doc.values[param.id] : param.default;
  }
  return out;
}

function valuesDigest(doc) {
  return sha256(canonicalJson(effectiveValues(doc)));
}

// A command-line string (or a JSON value from the panel) to the param's own type.
function coerceValue(param, raw) {
  let value = raw;
  if (typeof raw === "string") {
    if (param.type === "range") {
      if (!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(raw.trim())) fail(SCOPE, `${param.id}=${raw} must be a number from ${param.min} to ${param.max}`, { code: "VALUE_INVALID", id: param.id });
      value = Number(raw);
    } else if (param.type === "checkbox") {
      const word = raw.trim().toLowerCase();
      if (["true", "1", "on", "yes"].includes(word)) value = true;
      else if (["false", "0", "off", "no"].includes(word)) value = false;
      else fail(SCOPE, `${param.id}=${raw} must be true or false`, { code: "VALUE_INVALID", id: param.id });
    } else if (param.type === "color") {
      value = raw.trim().toLowerCase();
    }
  }
  const problem = valueProblem(param, value);
  if (problem) fail(SCOPE, `${param.id}=${typeof raw === "string" ? raw : JSON.stringify(raw)} ${problem}`, { code: "VALUE_INVALID", id: param.id });
  return value;
}

// New document with the given values applied; a value equal to its default is dropped, so
// `values` holds only changes. Nothing is written.
function applyValues(doc, entries) {
  const byId = new Map(doc.params.map((param) => [param.id, param]));
  const values = { ...doc.values };
  for (const [id, raw] of entries) {
    const param = byId.get(id);
    if (!param) fail(SCOPE, `no param named ${id}; declared: ${doc.params.map((item) => item.id).join(", ") || "none"}`, { code: "VALUE_UNKNOWN", id });
    const value = coerceValue(param, raw);
    if (Object.is(value, param.default)) delete values[id];
    else values[id] = value;
  }
  return { ...doc, values };
}

function removeValues(doc, ids) {
  const known = new Set(doc.params.map((param) => param.id));
  for (const id of ids) if (!known.has(id)) fail(SCOPE, `no param named ${id}; declared: ${[...known].join(", ") || "none"}`, { code: "VALUE_UNKNOWN", id });
  const values = { ...doc.values };
  for (const id of ids) delete values[id];
  return { ...doc, values };
}

function serialize(doc) {
  const values = Object.fromEntries(Object.keys(doc.values).sort().map((id) => [id, doc.values[id]]));
  return `${JSON.stringify({ schema: doc.schema, params: doc.params, values }, null, 2)}\n`;
}

// Deterministic: ids sorted, no clock, no random source, no location or storage read.
function generateScript(doc) {
  const effective = effectiveValues(doc);
  const lines = [
    `// generated by designer-pipeline tunables sync; do not edit. digest sha256:${valuesDigest(doc)}`,
    "(function () {",
    `  var v = ${JSON.stringify(effective)};`,
    "  window.tunable = function (id) {",
    '    if (!Object.prototype.hasOwnProperty.call(v, id)) throw new Error("undeclared tunable: " + id);',
    "    return v[id];",
    "  };",
    "  var root = document.documentElement;",
  ];
  for (const param of [...doc.params].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const value = effective[param.id];
    if (param.type === "range") {
      const unit = CSS_UNITS.has(param.unit) ? param.unit : "";
      lines.push(`  root.style.setProperty(${JSON.stringify(`--tn-${param.id}`)}, ${JSON.stringify(`${value}${unit}`)});`);
    } else if (param.type === "color") {
      lines.push(`  root.style.setProperty(${JSON.stringify(`--tn-${param.id}`)}, ${JSON.stringify(value)});`);
    } else if (param.type === "select" || param.type === "checkbox") {
      lines.push(`  root.setAttribute(${JSON.stringify(`data-tn-${param.id}`)}, ${JSON.stringify(String(value))});`);
    }
  }
  lines.push(
    "  function fill() {",
    '    var nodes = document.querySelectorAll("[data-tn-text]");',
    "    for (var i = 0; i < nodes.length; i++) {",
    '      var key = nodes[i].getAttribute("data-tn-text");',
    "      if (Object.prototype.hasOwnProperty.call(v, key)) nodes[i].textContent = String(v[key]);",
    "    }",
    "  }",
    '  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();',
    "})();",
    "",
  );
  return lines.join("\n");
}

function readTunables(root) {
  const file = path.join(path.resolve(root), FILE);
  if (!fs.existsSync(file)) fail(SCOPE, `no ${FILE} in ${path.resolve(root)}. Fix: run \`${command(root, "init")}\``, { code: "TUNABLES_MISSING" });
  const bytes = fs.readFileSync(file);
  let doc;
  try { doc = JSON.parse(bytes.toString("utf8")); } catch (error) { fail(SCOPE, `${FILE} is not valid JSON: ${error.message}`, { code: "TUNABLES_INVALID" }); }
  return { file, doc, bytes, revision: sha256(bytes) };
}

// A document that must be sound before any command changes it.
function loadValid(root) {
  const loaded = readTunables(root);
  assertDocument(loaded.doc);
  return loaded;
}

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === content) return false;
  const temp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temp, content);
  fs.renameSync(temp, file);
  return true;
}

// Writes tunables.json and tunables.js; a file whose bytes already match keeps its mtime, so a
// no-op sync cannot make a render look stale.
function writeTunables(root, doc) {
  assertDocument(doc);
  const base = path.resolve(root);
  const wrote = [];
  if (writeIfChanged(path.join(base, FILE), serialize(doc))) wrote.push(FILE);
  if (writeIfChanged(path.join(base, SCRIPT), generateScript(doc))) wrote.push(SCRIPT);
  return { wrote, revision: sha256(fs.readFileSync(path.join(base, FILE))) };
}

function initTunables(root, options = {}) {
  const base = path.resolve(root);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) fail(SCOPE, `project root does not exist: ${base}`, { code: "ROOT_NOT_FOUND" });
  const existing = [FILE, SCRIPT].filter((name) => fs.existsSync(path.join(base, name)));
  if (existing.length && !options.replace) fail(SCOPE, `refusing to overwrite ${existing.join(", ")} in ${base}. Fix: pass --replace, or use \`${command(root, "sync")}\` on the existing file`, { code: "OUTPUT_EXISTS" });
  const written = writeTunables(base, emptyDocument());
  const page = path.join(base, "index.html");
  return {
    status: "initialized",
    files: [FILE, SCRIPT],
    wrote: written.wrote,
    include: INCLUDE_TAG,
    indexHtml: fs.existsSync(page) ? "index.html is unchanged; add the include line before your own scripts" : "no index.html here yet; add the include line to the page you build",
    next: `Declare params in ${FILE} (references/tunables.schema.json), read them in the page, then run \`${command(root, "check")}\`.`,
  };
}

function summarize(doc, written, extra) {
  return { ...extra, changed: Object.keys(doc.values).sort(), wrote: written.wrote, revision: written.revision };
}

// `id=value` strings from --param to [id, raw] pairs.
function parseAssignments(raws) {
  return raws.map((raw) => {
    const at = String(raw).indexOf("=");
    if (at < 1) fail(SCOPE, `--param needs id=value, got ${JSON.stringify(raw)}`, { code: "OPTION_VALUE_REQUIRED" });
    return [raw.slice(0, at), raw.slice(at + 1)];
  });
}

// Every value is checked before anything is written, so a bad one leaves every file as it was.
function setTunables(root, entries) {
  if (!entries.length) fail(SCOPE, "--param id=value is required (repeat it for several)", { code: "OPTION_REQUIRED" });
  const { doc } = loadValid(root);
  const next = applyValues(doc, entries);
  return summarize(next, writeTunables(root, next), { status: "set", set: [...new Set(entries.map(([id]) => id))] });
}

function resetTunables(root, ids, all = false) {
  const { doc } = loadValid(root);
  if (!all && !ids.length) fail(SCOPE, "--param <id> (repeatable) or --all is required", { code: "OPTION_REQUIRED" });
  const target = all ? doc.params.map((param) => param.id) : ids;
  const next = removeValues(doc, target);
  return summarize(next, writeTunables(root, next), { status: "reset", reset: target });
}

function syncTunables(root) {
  const { doc } = loadValid(root);
  return summarize(doc, writeTunables(root, doc), { status: "synced" });
}

function listTunables(root) {
  const { doc, revision } = loadValid(root);
  const effective = effectiveValues(doc);
  return {
    revision,
    params: doc.params.map((param) => ({
      id: param.id,
      label: param.label,
      group: param.group,
      type: param.type,
      default: param.default,
      value: effective[param.id],
      changed: Object.hasOwn(doc.values, param.id),
      ...(param.unit ? { unit: param.unit } : {}),
      ...(param.window ? { window: param.window } : {}),
      ...(param.dynamic ? { dynamic: true } : {}),
    })),
  };
}

function walkProject(root, visit) {
  const stack = [root];
  let count = 0;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) stack.push(full);
      } else if (entry.isFile() && entry.name !== SCRIPT && SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        if (++count > MAX_FILES) return;
        visit(full);
      }
    }
  }
}

// Which files read which ids: literal tunable("id") calls, --tn-<id>, data-tn-text="id", data-tn-<id>.
function scanReads(root) {
  const base = path.resolve(root);
  const reads = new Map();
  const calls = new Map();
  const note = (map, id, file) => {
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(rel(base, file));
  };
  walkProject(base, (file) => {
    if (fs.statSync(file).size > MAX_FILE_BYTES) return;
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/\btunable\(\s*(["'])([^"']+)\1\s*\)/g)) { note(calls, match[2], file); note(reads, match[2], file); }
    for (const match of text.matchAll(/--tn-([a-z0-9-]*[a-z0-9])/g)) note(reads, match[1], file);
    for (const match of text.matchAll(/data-tn-text\s*=\s*(["'])([^"']+)\1/g)) note(reads, match[2], file);
    for (const match of text.matchAll(/data-tn-([a-z0-9-]*[a-z0-9])/g)) note(reads, match[1], file);
  });
  return { reads, calls };
}

// tunables.js must be the first project script in index.html; libraries from a CDN or
// node_modules cannot read it, so they may come before.
function includeProblem(root) {
  const page = path.join(path.resolve(root), "index.html");
  if (!fs.existsSync(page)) return "there is no index.html at the project root";
  const html = fs.readFileSync(page, "utf8");
  for (const match of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = match[1];
    const type = /\btype\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && !/(?:javascript|ecmascript|module)/.test(type)) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (src && /(?:^|\/)tunables\.js(?:[?#].*)?$/.test(src)) return null;
    if (src && /^(?:https?:)?\/\/|^node_modules\//i.test(src)) continue;
    return src ? `${src} loads before ${SCRIPT}` : "an inline script runs before " + SCRIPT;
  }
  return `index.html has no ${INCLUDE_TAG}`;
}

// The checks `tunables check` and the `film check` tunables step share.
function checkTunables(root) {
  const base = path.resolve(root);
  const loaded = readTunables(base);
  const found = inspectDocument(loaded.doc).map((problem) => finding(base, problem.code, problem.message, { id: problem.id || undefined }));
  const summary = (findings, extra = {}) => ({
    status: findings.some((item) => item.severity === "error") ? "failed" : "passed",
    findings,
    revision: loaded.revision,
    params: Array.isArray(loaded.doc.params) ? loaded.doc.params.length : 0,
    changed: isObject(loaded.doc.values) ? Object.keys(loaded.doc.values).length : 0,
    ...extra,
  });
  if (found.length) return summary(found);
  const doc = loaded.doc;
  const scriptFile = path.join(base, SCRIPT);
  const expected = generateScript(doc);
  if (!fs.existsSync(scriptFile) || fs.readFileSync(scriptFile, "utf8") !== expected) {
    found.push(finding(base, "script-stale", `${SCRIPT} ${fs.existsSync(scriptFile) ? "differs from what the effective values generate" : "is missing"}`));
  }
  if (doc.params.length) {
    const problem = includeProblem(base);
    if (problem) found.push(finding(base, "script-not-included", `${problem}; params exist but the page may not load ${SCRIPT} first`));
  }
  const { reads, calls } = scanReads(base);
  const declared = new Set(doc.params.map((param) => param.id));
  for (const param of doc.params) {
    if (!param.dynamic && !reads.has(param.id)) found.push(finding(base, "param-unread", `no project file reads ${param.id}`, { id: param.id }));
  }
  for (const [id, files] of [...calls].sort()) {
    if (!declared.has(id)) found.push(finding(base, "read-undeclared", `${[...files].sort().join(", ")} calls tunable("${id}"), which no param declares`, { id }));
  }
  return summary(found, { reads: Object.fromEntries([...reads].filter(([id]) => declared.has(id)).map(([id, files]) => [id, [...files].sort()])) });
}

// tunables.json or tunables.js newer than the newest render: the render predates the values.
function renderOlderThanValues(root, video) {
  const base = path.resolve(root);
  if (!video || !fs.existsSync(video)) return null;
  const rendered = fs.statSync(video).mtimeMs;
  const newer = [FILE, SCRIPT].filter((name) => fs.existsSync(path.join(base, name)) && fs.statSync(path.join(base, name)).mtimeMs > rendered);
  if (!newer.length) return null;
  return {
    code: "render-older-than-values",
    severity: "error",
    message: `${newer.join(" and ")} changed after ${rel(base, video)} was rendered`,
    fix: `Render again so the video shows the current values: npx --no-install --prefix ${shellPath(base)} hyperframes render ${shellPath(base)} --output ${shellPath(path.join(base, "out.mp4"))}, then re-run film check. A re-render reopens the owner's review.`,
  };
}

module.exports = {
  CSS_UNITS,
  FILE,
  INCLUDE_TAG,
  MAX_TEXT,
  SCHEMA,
  SCRIPT,
  applyValues,
  assertDocument,
  checkTunables,
  coerceValue,
  command,
  effectiveValues,
  emptyDocument,
  generateScript,
  initTunables,
  inspectDocument,
  listTunables,
  parseAssignments,
  readTunables,
  removeValues,
  renderOlderThanValues,
  resetTunables,
  scanReads,
  serialize,
  setTunables,
  syncTunables,
  valueProblem,
  valuesDigest,
  writeTunables,
};
