"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ANIMATION_JOB_SCHEMA,
  LIFECYCLE_ADAPTER_SCHEMA,
  MOTION_GRAPH_SCHEMA,
  createAnimationJob,
  createLifecycleAdapter,
  validateAnimationJob,
  validatePerformanceBudgets,
} = require("../skill/scripts/motion-foundation-core.cjs");

function graph() {
  return {
    schema: MOTION_GRAPH_SCHEMA,
    id: "graph-core",
    durationMs: 1000,
    tracks: [{
      id: "progress",
      subject: "subject",
      property: "progress",
      from: 0,
      to: 100,
      startMs: 0,
      durationMs: 1000,
    }],
    responses: [],
    semanticCarrier: "semantic subject",
    reducedMotion: { mode: "resting-state", description: "show the authored resting state" },
  };
}
function budgets(overrides = {}) {
  return {
    object: { applicable: true, max: 10, ...overrides.object },
    particle: { applicable: false, ...overrides.particle },
    texture: { applicable: false, ...overrides.texture },
    frame: { applicable: true, maxMs: 16.7, targetFps: 60, maxLongFrames: 3, maxInputLatencyMs: 100, maxCpuMs: 8, ...overrides.frame },
  };
}

function lifecycle(calls) {
  return createLifecycleAdapter({
    schema: LIFECYCLE_ADAPTER_SCHEMA,
    id: "dom-core",
    renderer: "dom",
    handlers: {
      init: () => calls.push("init"),
      resize: () => calls.push("resize"),
      update: () => calls.push("update"),
      render: () => calls.push("render"),
      dispose: () => calls.push("dispose"),
    },
    ownership: {
      owner: "animation-job",
      resources: [{ id: "frame-loop", kind: "frame-loop", owner: "animation-job", disposable: true }],
    },
    containment: { root: "#root", boundary: "job-owned" },
    cleanup: { observable: true, checks: ["frame loop released"] },
  });
}

function job(overrides = {}) {
  return {
    schema: ANIMATION_JOB_SCHEMA,
    id: "job-core",
    motionGraph: graph(),
    deterministic: {
      seed: 42,
      input: { mode: "preview" },
      viewport: { width: 800, height: 600 },
      dpr: 1,
      reducedMotion: false,
    },
    mechanism: { purpose: "continuity", subject: "subject", channels: ["progress"] },
    skin: { tokens: { accent: "blue" } },
    renderer: { kind: "dom", adapterId: "dom-core" },
    lifecycle: lifecycle([]).contract,
    budgets: budgets(),
    ...overrides,
  };
}

test("animation job exposes authored-time seek, settle, reset, and idempotent dispose", () => {
  const calls = [];
  const runtime = createAnimationJob({ ...job(), lifecycleAdapter: lifecycle(calls) });

  assert.equal(runtime.state().phase, "active");
  assert.equal(runtime.seek(500).values.progress, 50);
  assert.equal(runtime.settle().values.progress, 100);
  assert.equal(runtime.state().phase, "settled");
  assert.equal(runtime.reset().values.progress, 0);
  runtime.dispose();
  runtime.dispose();
  assert.deepEqual(calls, ["init", "update", "render", "update", "render", "update", "render", "dispose"]);
  assert.equal(runtime.state().phase, "disposed");
  assert.throws(() => runtime.seek(100), /disposed/);
});

test("reduced-motion sampling resolves to the authored resting state", () => {
  const runtime = createAnimationJob({
    ...job(),
    deterministic: { ...job().deterministic, reducedMotion: true },
  });
  const frame = runtime.sample(100);
  assert.equal(frame.reducedMotion, true);
  assert.equal(frame.timeMs, 100);
  assert.equal(frame.authoredTimeMs, 100);
  assert.equal(frame.renderTimeMs, 1000);
  assert.equal(frame.values.progress, 100);
  const reset = runtime.reset();
  assert.equal(reset.timeMs, 0);
  assert.equal(reset.renderTimeMs, 1000);
  assert.equal(reset.settled, false);
  assert.equal(runtime.state().phase, "active");
  const seekZero = runtime.seek(0);
  assert.equal(seekZero.timeMs, 0);
  assert.equal(seekZero.renderTimeMs, 1000);
  runtime.dispose();
});
test("animation jobs fail closed for invalid normalized contracts", () => {
  assert.throws(() => validateAnimationJob({ ...job(), budgets: undefined }), /performance budgets/i);
  assert.throws(() => createAnimationJob({
    ...job(),
    motionGraph: { ...graph(), tracks: [{ ...graph().tracks[0], ease: "bounce" }] },
  }), /ease is unsupported/i);
});
test("MotionGraph rejects tracks with missing endpoints", () => {
  assert.throws(() => createAnimationJob({
    ...job(),
    motionGraph: { ...graph(), tracks: [{ ...graph().tracks[0], to: undefined }] },
  }), /must declare from and to/);
});

test("performance budgets pass within limits and reject observed overruns", () => {
  assert.equal(validatePerformanceBudgets(budgets({
    object: { observed: 4 },
    frame: { observedMaxMs: 12, observedInputLatencyMs: 80, observedCpuMs: 6 },
  })).frame.observedMaxMs, 12);
  for (const overrun of [
    budgets({ object: { observed: 11 } }),
    budgets({ particle: { applicable: true, max: 5, observed: 6 } }),
    budgets({ texture: { applicable: true, maxCount: 2, maxBytes: 1024, observedCount: 3 } }),
    budgets({ texture: { applicable: true, maxCount: 2, maxBytes: 1024, observedBytes: 1025 } }),
    budgets({ frame: { observedMaxMs: 17 } }),
    budgets({ frame: { observedInputLatencyMs: 101 } }),
    budgets({ frame: { observedCpuMs: 9 } }),
  ]) {
    assert.throws(() => validatePerformanceBudgets(overrun), /exceeds budget/i);
  }
  for (const invalid of [
    budgets({ frame: { maxInputLatencyMs: -1 } }),
    budgets({ frame: { maxCpuMs: Number.NaN } }),
    budgets({ frame: { maxLongFrames: undefined } }),
    budgets({ frame: { targetFps: 0 } }),
    budgets({ frame: { observedInputLatencyMs: Infinity } }),
    budgets({ frame: { observedCpuMs: -1 } }),
  ]) {
    assert.throws(() => validatePerformanceBudgets(invalid), />=|finite|non-negative|required/i);
  }
});
test("MotionGraph rejects unreachable track ends, invalid stagger values, and duplicate response ids", () => {
  assert.throws(() => createAnimationJob({
    ...job(),
    motionGraph: { ...graph(), tracks: [{ ...graph().tracks[0], durationMs: 1001 }] },
  }), /ends after graph.durationMs/);
  for (const staggerMs of ["slow", -1]) {
    assert.throws(() => createAnimationJob({
      ...job(),
      motionGraph: { ...graph(), tracks: [{ ...graph().tracks[0], staggerMs }] },
    }), /staggerMs/);
  }
  const response = { id: "settle", input: "drag", boundedRange: { min: 0, max: 1 }, settle: "end", interruption: "reverse" };
  assert.throws(() => createAnimationJob({
    ...job(),
    motionGraph: { ...graph(), responses: [response, { ...response }] },
  }), /response id is duplicated/);
});
test("animation jobs reject renderer and lifecycle adapter identity mismatches", () => {
  assert.throws(() => createAnimationJob({
    ...job(),
    renderer: { kind: "webgl", adapterId: "dom-core" },
  }), /renderer kind does not match lifecycle adapter renderer/);
  assert.throws(() => createAnimationJob({
    ...job(),
    lifecycleAdapter: lifecycle([]),
    renderer: { kind: "dom", adapterId: "other-adapter" },
  }), /adapterId does not match lifecycle adapter id/);
});
