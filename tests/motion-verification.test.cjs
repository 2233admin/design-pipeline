"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateMotion } = require("../skill/scripts/motion-evidence-core.cjs");
const {
  ANIMATION_JOB_SCHEMA,
  LIFECYCLE_ADAPTER_SCHEMA,
  MOTION_GRAPH_SCHEMA,
  createLifecycleAdapter,
} = require("../skill/scripts/motion-foundation-core.cjs");

function motionGraph(overrides = {}) {
  return {
    schema: MOTION_GRAPH_SCHEMA,
    id: "graph-evidence",
    durationMs: 1000,
    tracks: [{ id: "progress", subject: "panel", property: "progress", from: 0, to: 1, startMs: 0, durationMs: 1000 }],
    responses: [],
    semanticCarrier: "panel",
    reducedMotion: { mode: "resting-state", description: "show the authored resting state" },
    ...overrides,
  };
}

function deterministicInputs(overrides = {}) {
  return { seed: 7, input: { mode: "preview" }, viewport: { width: 320, height: 240 }, dpr: 1, reducedMotion: false, ...overrides };
}

function performanceBudgets(overrides = {}) {
  const { frame, ...rest } = overrides;
  return {
    object: { applicable: true, max: 10 },
    particle: { applicable: false },
    texture: { applicable: false },
    frame: { applicable: true, maxMs: 16.7, targetFps: 60, maxLongFrames: 3, maxInputLatencyMs: 100, maxCpuMs: 8, ...frame },
    ...rest,
  };
}

function lifecycleAdapter(overrides = {}) {
  return createLifecycleAdapter({
    schema: LIFECYCLE_ADAPTER_SCHEMA, id: "lifecycle-evidence", renderer: "dom",
    handlers: { init() {}, resize() {}, update() {}, render() {}, dispose() {} },
    ownership: { owner: "motion-evidence", resources: [{ id: "frame-loop", kind: "frame-loop", owner: "motion-evidence", disposable: true }] },
    containment: { root: "#root", boundary: "job-owned" }, cleanup: { observable: true, checks: ["frame loop released"] },
    ...overrides,
  });
}

function animationJob(overrides = {}) {
  const graph = motionGraph();
  const inputs = deterministicInputs();
  const budgets = performanceBudgets();
  const adapter = lifecycleAdapter();
  return {
    schema: ANIMATION_JOB_SCHEMA, id: "job-evidence", motionGraph: graph, deterministic: inputs,
    mechanism: { purpose: "continuity", subject: "panel", channels: ["progress"] }, skin: { tokens: { accent: "blue" } },
    renderer: { kind: "dom", adapterId: adapter.contract.id }, lifecycle: adapter.contract, budgets, ...overrides,
  };
}

function receipt(overrides = {}) {
  const job = animationJob();
  return {
    schema: "design-pipeline.motion-verification.v1", id: "motion-1", primitiveId: "panel-enter", trigger: "panel opens",
    purpose: "preserve spatial continuity and expose hierarchy", durationMs: 240, toleranceMs: 20, observedDurationMs: 248,
    frameCadenceMs: 16.67, interruption: "reverses from current progress", reducedMotion: "instant opacity state change",
    longFrames: [{ atMs: 120, durationMs: 18 }], maxLongFrameMs: 24, captureId: "capture-fixed-seed", deterministic: true,
    animationJob: job, motionGraph: job.motionGraph, deterministicInputs: job.deterministic, performanceBudgets: job.budgets,
    lifecycleAdapter: lifecycleAdapter(), sampledFrames: [{ timeMs: 0, stateHash: "start" }, { timeMs: 1000, stateHash: "end" }],
    ...overrides,
  };
}

test("motion evidence binds the complete animation job contract", () => {
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

test("motion evidence rejects graph/job binding mismatch and job-only out-of-range samples", () => {
  assert.throws(() => evaluateMotion(receipt({ motionGraph: motionGraph({ id: "other-graph" }) })), /bindings do not agree/);
  assert.throws(() => evaluateMotion(receipt({ motionGraph: undefined, sampledFrames: [{ timeMs: 1001, stateHash: "late" }] })), /exceeds motion graph duration/);
});

test("motion evidence rejects non-monotonic samples and duplicate binding mismatches", () => {
  assert.throws(() => evaluateMotion(receipt({ sampledFrames: [{ timeMs: 20, stateHash: "a" }, { timeMs: 10, stateHash: "b" }] })), /monotonic/);
  assert.throws(() => evaluateMotion(receipt({ deterministicInputs: deterministicInputs({ seed: 8 }) })), /deterministicInputs do not match/);
  assert.throws(() => evaluateMotion(receipt({ performanceBudgets: performanceBudgets({ frame: { maxMs: 12 } }) })), /performanceBudgets do not match/);
  assert.throws(() => evaluateMotion(receipt({ lifecycleAdapter: lifecycleAdapter({ id: "other-lifecycle" }).contract })), /lifecycleAdapter does not match/);
});

test("motion evidence rejects nested invalid animation job contracts", () => {
  assert.throws(() => evaluateMotion(receipt({ animationJob: animationJob({ motionGraph: motionGraph({ tracks: [{ ...motionGraph().tracks[0], to: undefined }] }) }) })), /must declare from and to/);
});
