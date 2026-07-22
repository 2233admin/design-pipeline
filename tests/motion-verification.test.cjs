"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
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
