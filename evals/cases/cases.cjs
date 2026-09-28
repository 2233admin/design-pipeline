"use strict";

// Golden case library. Each case is a finished film made by the strongest model and accepted by
// the user, plus counter-examples: small, named defects applied to the golden that the gates must
// catch. The goldens are the answer key for cross-model evaluation, so this directory stays
// outside the shipped skill package; a model under evaluation must never be able to read it.

const fs = require("node:fs");
const path = require("node:path");
const { checkStoryboard } = require("../../skill/scripts/film-core.cjs");
const { checkTimeline } = require("../../skill/scripts/film-timeline-core.cjs");
const { checkGridAlignment } = require("../../skill/scripts/score-core.cjs");

const CASE_SCHEMA = "design-pipeline.golden-case.v1";
const DELIVERABLE_TYPES = ["product-pv", "logo-sting", "mad", "ui-promo", "explainer"];
const STATUSES = ["candidate", "approved", "rejected"];
// Evaluation failure classes (redesign-user-workflow Q33); each maps to a kind of fix.
const FAILURE_CLASSES = ["workflow", "tool-misuse", "generic-concept", "rough-execution", "taste-gap"];
const TARGETS = ["storyboard", "timeline", "render"];
const ENFORCERS = ["gate", "review"];
const GATES = ["storyboard", "score", "timeline", "render", "audio", "composition"];

function fail(message) {
  throw new Error(`golden case: ${message}`);
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function text(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`);
}
function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) fail(`${label} must be one of ${allowed.join(", ")} (got ${JSON.stringify(value)})`);
}
function codeList(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((code) => typeof code !== "string" || !code.trim())) fail(`${label} must be a non-empty array of finding codes`);
}

// ---------- patches ----------
// RFC 6902 replace/add/remove on JSON Pointer paths, plus two array ops that select items by
// field values, so a counter-example names the tween it changes instead of an array index.

function pointer(pathText) {
  if (pathText === "") return [];
  if (typeof pathText !== "string" || !pathText.startsWith("/")) fail(`patch path must be a JSON Pointer, got ${JSON.stringify(pathText)}`);
  return pathText.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}
function resolveParent(doc, parts) {
  let node = doc;
  for (const part of parts.slice(0, -1)) {
    if (node === null || typeof node !== "object" || !(part in node)) fail(`patch path segment ${part} does not exist`);
    node = node[part];
  }
  return node;
}
function resolve(doc, parts) {
  return parts.length ? resolveParent(doc, parts)[parts[parts.length - 1]] : doc;
}
function matches(item, match) {
  return Object.entries(match).every(([key, expected]) => {
    const actual = item[key];
    if (typeof expected === "number" && typeof actual === "number") return Math.abs(actual - expected) < 0.001;
    return JSON.stringify(actual) === JSON.stringify(expected);
  });
}

function applyPatch(doc, ops) {
  if (!Array.isArray(ops) || ops.length === 0) fail("patch must be a non-empty array of operations");
  const out = structuredClone(doc);
  for (const op of ops) {
    const parts = pointer(op.path);
    if (op.op === "replace" || op.op === "add") {
      if (!("value" in op)) fail(`${op.op} at ${op.path} needs a value`);
      const parent = resolveParent(out, parts);
      const key = parts[parts.length - 1];
      if (Array.isArray(parent) && op.op === "add") {
        if (key === "-") parent.push(structuredClone(op.value));
        else parent.splice(Number(key), 0, structuredClone(op.value));
      } else {
        if (op.op === "replace" && !(key in parent)) fail(`replace at ${op.path}: nothing to replace`);
        parent[key] = structuredClone(op.value);
      }
    } else if (op.op === "remove") {
      const parent = resolveParent(out, parts);
      const key = parts[parts.length - 1];
      if (!(key in parent)) fail(`remove at ${op.path}: nothing to remove`);
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete parent[key];
    } else if (op.op === "remove-where" || op.op === "update-where") {
      const list = resolve(out, parts);
      if (!Array.isArray(list)) fail(`${op.op} at ${op.path} needs an array`);
      if (!op.match || typeof op.match !== "object") fail(`${op.op} at ${op.path} needs a match object`);
      const hits = list.filter((item) => matches(item, op.match));
      if (!hits.length) fail(`${op.op} at ${op.path} matched nothing for ${JSON.stringify(op.match)}; the golden changed, so update the counter-example`);
      if (op.op === "remove-where") for (const hit of hits) list.splice(list.indexOf(hit), 1);
      else for (const hit of hits) Object.assign(hit, structuredClone(op.set || {}));
    } else {
      fail(`unknown patch op ${JSON.stringify(op.op)}`);
    }
  }
  return out;
}

// ---------- load and validate ----------

function validateCase(spec, dir) {
  if (spec.schema !== CASE_SCHEMA) fail(`schema must be ${CASE_SCHEMA}`);
  text(spec.id, "id");
  if (path.basename(dir) !== spec.id) fail(`id ${spec.id} must match its directory ${path.basename(dir)}`);
  oneOf(spec.deliverableType, DELIVERABLE_TYPES, "deliverableType");
  if (path.basename(path.dirname(dir)) !== spec.deliverableType) fail(`${spec.id} must live under ${spec.deliverableType}/`);
  oneOf(spec.workflow, ["film", "edit"], "workflow");
  for (const key of ["brief", "product", "author"]) text(spec[key], key);
  oneOf(spec.status, STATUSES, "status");
  if (spec.status === "candidate" && spec.approval !== null) fail("a candidate has approval null until the user decides");
  if (spec.status !== "candidate") {
    const approval = spec.approval || {};
    oneOf(approval.verdict, ["accept", "reject"], "approval.verdict");
    if ((spec.status === "approved") !== (approval.verdict === "accept")) fail("status approved needs verdict accept, and rejected needs reject");
    for (const key of ["by", "date", "note"]) text(approval[key], `approval.${key}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(approval.date)) fail("approval.date must be YYYY-MM-DD");
    if (!/^[0-9a-f]{64}$/.test(approval.renderSha256 || "")) fail("approval.renderSha256 must be the sha256 of the render the user watched");
  }
  const golden = spec.golden || {};
  for (const key of ["storyboard", "timeline", "composition"]) {
    text(golden[key], `golden.${key}`);
    if (!fs.existsSync(path.join(dir, golden[key]))) fail(`golden.${key} ${golden[key]} is missing`);
  }
  if (golden.score) {
    text(golden.score.pattern, "golden.score.pattern");
    if (!(golden.score.bpm >= 40 && golden.score.bpm <= 240)) fail("golden.score.bpm must be 40-240");
  }
  // Third-party interface captures are regenerated from a pinned source and never committed.
  if (golden.captures) {
    const captures = golden.captures;
    for (const key of ["script", "env", "dir"]) text(captures[key], `golden.captures.${key}`);
    if (!fs.existsSync(path.join(dir, captures.script))) fail(`golden.captures.script ${captures.script} is missing`);
    const source = captures.source || {};
    for (const key of ["repo", "commit", "license"]) text(source[key], `golden.captures.source.${key}`);
    if (!/^[0-9a-f]{40}$/.test(source.commit)) fail("golden.captures.source.commit must be a full commit sha");
    if (!Array.isArray(captures.files) || captures.files.length === 0 || captures.files.some((file) => typeof file !== "string" || !file.trim())) fail("golden.captures.files must list the captured files");
  }

  if (!Array.isArray(spec.rules) || spec.rules.length === 0) fail("rules must be a non-empty array");
  const ruleIds = new Set();
  for (const [index, rule] of spec.rules.entries()) {
    const label = `rules[${index}]`;
    text(rule.id, `${label}.id`);
    if (ruleIds.has(rule.id)) fail(`${label} duplicates ${rule.id}`);
    ruleIds.add(rule.id);
    for (const key of ["choice", "rule", "fix"]) text(rule[key], `${label}.${key}`);
    const by = rule.enforcedBy || {};
    oneOf(by.kind, ENFORCERS, `${label}.enforcedBy.kind`);
    if (by.kind === "gate") { oneOf(by.gate, GATES, `${label}.enforcedBy.gate`); codeList(by.codes, `${label}.enforcedBy.codes`); }
    else text(by.gap, `${label}.enforcedBy.gap`);
  }

  if (!Array.isArray(spec.counterExamples) || spec.counterExamples.length === 0) fail("counterExamples must be a non-empty array");
  const counterIds = new Set();
  for (const [index, counter] of spec.counterExamples.entries()) {
    const label = `counterExamples[${index}]`;
    text(counter.id, `${label}.id`);
    if (counterIds.has(counter.id)) fail(`${label} duplicates ${counter.id}`);
    counterIds.add(counter.id);
    oneOf(counter.failureClass, FAILURE_CLASSES, `${label}.failureClass`);
    oneOf(counter.target, TARGETS, `${label}.target`);
    text(counter.defect, `${label}.defect`);
    if (!ruleIds.has(counter.rule)) fail(`${label}.rule ${counter.rule} is not one of this case's rules`);
    codeList(counter.expect, `${label}.expect`);
    if (counter.target === "render") {
      if (!Array.isArray(counter.edits) || !counter.edits.length || counter.edits.some((edit) => typeof edit.find !== "string" || typeof edit.replace !== "string")) fail(`${label}.edits must be [{ find, replace }] on the composition`);
    } else {
      const patches = counter.patch || {};
      if (!Object.keys(patches).length || Object.keys(patches).some((key) => !["storyboard", "timeline"].includes(key))) fail(`${label}.patch must patch storyboard and/or timeline`);
      if (counter.target === "storyboard" && patches.timeline) fail(`${label} targets the storyboard but patches the timeline`);
    }
  }
  // Every gate-enforced rule is proven by at least one counter-example the gate catches.
  for (const rule of spec.rules.filter((entry) => entry.enforcedBy.kind === "gate")) {
    if (!spec.counterExamples.some((counter) => counter.rule === rule.id)) fail(`rule ${rule.id} claims gate enforcement but no counter-example exercises it`);
  }
  for (const [index, entry] of (spec.reviewedWarnings || []).entries()) {
    oneOf(entry.gate, GATES, `reviewedWarnings[${index}].gate`);
    for (const key of ["code", "disposition"]) text(entry[key], `reviewedWarnings[${index}].${key}`);
  }
  return spec;
}

function listCases(root = __dirname) {
  const dirs = [];
  for (const type of fs.readdirSync(root, { withFileTypes: true })) {
    if (!type.isDirectory() || type.name.startsWith(".") || type.name === "node_modules") continue;
    for (const entry of fs.readdirSync(path.join(root, type.name), { withFileTypes: true })) {
      const dir = path.join(root, type.name, entry.name);
      if (entry.isDirectory() && fs.existsSync(path.join(dir, "case.json"))) dirs.push(dir);
    }
  }
  return dirs.sort();
}

function loadCase(dir) {
  const spec = validateCase(readJson(path.join(dir, "case.json")), dir);
  const grid = path.join(dir, "score-grid.json");
  return {
    dir,
    spec,
    storyboard: readJson(path.join(dir, spec.golden.storyboard)),
    timeline: readJson(path.join(dir, spec.golden.timeline)),
    grid: fs.existsSync(grid) ? readJson(grid) : null,
  };
}

// ---------- gates ----------

function codesOf(...results) {
  return [...new Set(results.filter(Boolean).flatMap((result) => result.findings.map((finding) => finding.code)))].sort();
}

// Storyboard gate plus the score-grid alignment `film check` runs whenever score-grid.json exists.
function staticGates(board, timeline, grid) {
  const storyboard = checkStoryboard(board);
  const score = grid ? checkGridAlignment(board, grid) : null;
  const timelineResult = timeline ? checkTimeline(timeline, board) : null;
  return { storyboard, score, timeline: timelineResult, codes: codesOf(storyboard, score, timelineResult) };
}

function checkGolden(loaded) {
  const result = staticGates(loaded.storyboard, loaded.timeline, loaded.grid);
  const failed = [result.storyboard, result.score, result.timeline].filter((entry) => entry && entry.status === "failed");
  return { ...result, passed: failed.length === 0 };
}

function checkCounter(loaded, counter) {
  if (counter.target === "render") fail(`${counter.id} is a render counter-example; run evals/cases/verify.cjs --render`);
  const board = counter.patch.storyboard ? applyPatch(loaded.storyboard, counter.patch.storyboard) : loaded.storyboard;
  const timeline = counter.target === "timeline" ? (counter.patch.timeline ? applyPatch(loaded.timeline, counter.patch.timeline) : loaded.timeline) : null;
  const result = staticGates(board, timeline, loaded.grid);
  return { codes: result.codes, missing: counter.expect.filter((code) => !result.codes.includes(code)) };
}

module.exports = {
  CASE_SCHEMA,
  DELIVERABLE_TYPES,
  FAILURE_CLASSES,
  applyPatch,
  checkCounter,
  checkGolden,
  listCases,
  loadCase,
  validateCase,
};
