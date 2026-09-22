"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateMotion } = require("../skill/scripts/motion-evidence-core.cjs");

function receipt(overrides = {}) {
  return {
    schema: "design-pipeline.motion-verification.v1",
    id: "motion-1",
    primitiveId: "panel-enter",
    trigger: "panel opens",
    purpose: "preserve spatial continuity and expose hierarchy",
    durationMs: 240,
    toleranceMs: 20,
    observedDurationMs: 248,
    frameCadenceMs: 16.67,
    interruption: "reverses from current progress",
    reducedMotion: "instant opacity state change",
    longFrames: [{ atMs: 120, durationMs: 18 }],
    maxLongFrameMs: 24,
    captureId: "capture-fixed-seed",
    deterministic: true,
    ...overrides,
  };
}

test("motion evidence passes timing, interruption, reduced-motion, and frame gates", () => {
  assert.equal(evaluateMotion(receipt()).status, "passed");
});

test("decorative-only motion and missing reduced-motion substitutions fail", () => {
  assert.throws(() => evaluateMotion(receipt({ purpose: "decorative only" })), /purpose/);
  assert.throws(() => evaluateMotion(receipt({ reducedMotion: "none" })), /substitute/);
});

test("duration drift, long frames, and nondeterministic capture fail", () => {
  assert.throws(() => evaluateMotion(receipt({ observedDurationMs: 400 })), /tolerance/);
  assert.throws(() => evaluateMotion(receipt({ longFrames: [{ atMs: 10, durationMs: 30 }] })), /exceeds budget/);
  assert.throws(() => evaluateMotion(receipt({ deterministic: false })), /deterministic/);
});

function lifecycle() {
  return ["rapid-input", "reverse", "unmount", "reduced-motion"].map((scenario) => ({
    scenario, status: "passed", expected: "Preserve state and release resources",
    observed: "State preserved and resources released", captureId: `capture-${scenario}`,
  }));
}

test("legacy coverage is explicit and strict mode requires lifecycle", () => {
  assert.equal(evaluateMotion(receipt()).coverage, "timing-only");
  assert.throws(() => evaluateMotion(receipt(), { requireLifecycle: true }), /lifecycle evidence/);
  assert.equal(evaluateMotion(receipt({ lifecycle: lifecycle() }), { requireLifecycle: true }).coverage, "timing-and-lifecycle");
});

test("lifecycle fails closed on incomplete, duplicate, failed and malformed scenarios", () => {
  for (const value of [null, [], lifecycle().slice(1), [...lifecycle(), lifecycle()[0]]]) {
    assert.throws(() => evaluateMotion(receipt({ lifecycle: value })), /lifecycle/);
  }
  for (const patch of [{ status: "failed" }, { scenario: "invented" }, { captureId: " " }, { extra: true }]) {
    const scenarios = lifecycle();
    Object.assign(scenarios[0], patch);
    assert.throws(() => evaluateMotion(receipt({ lifecycle: scenarios })), /lifecycle/);
  }
});

test("only reverse allows a justified non-applicable scenario", () => {
  const scenarios = lifecycle();
  scenarios[1] = { scenario: "reverse", status: "not-applicable", reason: "One-way notification has no reverse trigger" };
  assert.equal(evaluateMotion(receipt({ lifecycle: scenarios })).status, "passed");
  scenarios[1].reason = " ";
  assert.throws(() => evaluateMotion(receipt({ lifecycle: scenarios })), /reason/);
  scenarios[1] = { scenario: "reduced-motion", status: "not-applicable", reason: "unsupported" };
  assert.throws(() => evaluateMotion(receipt({ lifecycle: scenarios })), /cannot be not-applicable/);
});

test("temporal boundaries and placeholder declarations are checked", () => {
  for (const key of ["frameCadenceMs", "maxLongFrameMs"]) {
    for (const value of [0, -1, NaN, Infinity]) assert.throws(() => evaluateMotion(receipt({ [key]: value })), /motion evidence/);
  }
  for (const key of ["interruption", "reducedMotion"]) {
    for (const value of [" none ", "UNKNOWN", "todo", "n/a"]) assert.throws(() => evaluateMotion(receipt({ [key]: value })), /required/);
  }
  for (const frames of [ [{ atMs: 249, durationMs: 18 }], [{ atMs: 0, durationMs: 0 }], [{ atMs: 20, durationMs: 18 }, { atMs: 10, durationMs: 18 }] ]) {
    assert.throws(() => evaluateMotion(receipt({ longFrames: frames })), /longFrames/);
  }
  assert.equal(evaluateMotion(receipt({ durationMs: 0, observedDurationMs: 0, toleranceMs: 0, longFrames: [] })).status, "passed");
  assert.equal(evaluateMotion(receipt({ observedDurationMs: 260 })).status, "passed");
});

test("published schema declares every receipt field and structured scenarios", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/motion-verification.schema.json"), "utf8"));
  assert.deepEqual([...schema.required].sort(), Object.keys(receipt()).sort());
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(receipt({ lifecycle: [] })).sort());
  assert.equal(schema.properties.frameCadenceMs.exclusiveMinimum, 0);
  assert.equal(schema.properties.lifecycle.items.oneOf.length, 2);
});

test("CLI enforces strict lifecycle and emits machine-readable coverage", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "motion-receipt-"));
  try {
    const file = path.join(directory, "receipt.json");
    const cli = path.join(__dirname, "../skill/scripts/evaluate-motion-evidence.cjs");
    fs.writeFileSync(file, JSON.stringify(receipt()));
    const failed = spawnSync(process.execPath, [cli, "--receipt", file, "--require-lifecycle"], { encoding: "utf8" });
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).ok, false);
    fs.writeFileSync(file, JSON.stringify(receipt({ lifecycle: lifecycle() })));
    const passed = spawnSync(process.execPath, [cli, "--receipt", file, "--require-lifecycle"], { encoding: "utf8" });
    assert.equal(passed.status, 0, passed.stdout + passed.stderr);
    assert.equal(JSON.parse(passed.stdout).coverage, "timing-and-lifecycle");
    const publicCli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
    const args = [publicCli, "verify", "motion", "--root", directory, "--receipt", file, "--require-lifecycle", "--json"];
    const publicPassed = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(publicPassed.status, 0, publicPassed.stdout + publicPassed.stderr);
    assert.equal(JSON.parse(publicPassed.stdout).coverage, "timing-and-lifecycle");
    fs.writeFileSync(file, JSON.stringify(receipt()));
    const publicFailed = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.notEqual(publicFailed.status, 0);
    assert.equal(JSON.parse(publicFailed.stdout).ok, false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
