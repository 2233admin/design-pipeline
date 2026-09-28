"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ANIMATION_JOB_SCHEMA,
  MOTION_GRAPH_SCHEMA,
  createAnimationJob,
} = require("../skill/scripts/motion-foundation-core.cjs");
const {
  createSceneLifecycleAdapter,
} = require("../skill/scripts/scene-lifecycle-adapter-core.cjs");
const {
  evaluatePerformanceBudget,
  probeLifecycle,
} = require("../skill/scripts/animation-verification-core.cjs");

function budgets(overrides = {}) {
  return {
    object: { applicable: false, ...overrides.object },
    particle: { applicable: false, ...overrides.particle },
    texture: { applicable: true, maxCount: 4, maxBytes: 1024, ...overrides.texture },
    frame: { applicable: true, maxMs: 16.7, targetFps: 60, maxLongFrames: 1, maxInputLatencyMs: 100, maxCpuMs: 8, ...overrides.frame },
  };
}
function graph() {
  return {
    schema: MOTION_GRAPH_SCHEMA,
    id: "scene-graph",
    durationMs: 500,
    tracks: [{ id: "progress", subject: "scene", property: "opacity", from: 0, to: 1, startMs: 0, durationMs: 500, ease: "linear" }],
    responses: [],
    semanticCarrier: "scene transition",
    reducedMotion: { mode: "resting-state", description: "show the authored resting state" },
  };
}

function makeContext(calls = []) {
  return {
    viewport: (...args) => calls.push(["viewport", ...args]),
    deleteBuffer: (handle) => calls.push(["deleteBuffer", handle]),
    deleteTexture: (handle) => calls.push(["deleteTexture", handle]),
    deleteProgram: (handle) => calls.push(["deleteProgram", handle]),
    deleteFramebuffer: (handle) => calls.push(["deleteFramebuffer", handle]),
    isContextLost: () => false,
  };
}

function makeAdapter(options = {}) {
  const calls = options.calls || [];
  const registry = options.registry || {
    buffers: [{ id: "buffer", handle: "buffer-handle" }],
    textures: [{ id: "texture", handle: "texture-handle", bytes: 16 }],
    programs: [{ id: "program", handle: "program-handle" }],
    framebuffers: [{ id: "framebuffer", handle: "framebuffer-handle" }],
    renderLoops: [{ id: "render-loop", release: () => calls.push("cancel-loop") }],
    observers: [{ id: "observer", release: () => calls.push("disconnect-observer") }],
    listeners: [{ id: "listener", release: () => calls.push("remove-listener") }],
  };
  const adapter = createSceneLifecycleAdapter({
    id: options.id || "scene-renderer",
    renderer: options.renderer || "webgl",
    root: "scene-root",
    scene: { camera: { mode: "orthographic" }, dpr: 2, viewport: { width: 640, height: 360 }, resourceRegistry: registry },
    budgets: budgets(options.budgets),
    gl: options.gl || makeContext(calls),
    handlers: {
      init: () => calls.push("init"),
      resize: () => calls.push("resize"),
      update: (frame) => calls.push(["update", frame.authoredTimeMs]),
      render: (frame) => calls.push(["render", frame.authoredTimeMs]),
      dispose: () => calls.push("dispose"),
    },
  });
  return { adapter, calls };
}

function makeJob(adapter, renderer = "webgl") {
  return createAnimationJob({
    schema: ANIMATION_JOB_SCHEMA,
    id: "scene-job",
    motionGraph: graph(),
    deterministic: { seed: 7, input: { mode: "test" }, viewport: { width: 640, height: 360 }, dpr: 2, reducedMotion: false },
    mechanism: { purpose: "scene continuity", subject: "scene", channels: ["opacity"] },
    skin: { palette: "neutral" },
    renderer: { kind: renderer, adapterId: adapter.contract.id },
    lifecycle: adapter.contract,
    budgets: adapter.budgets,
    lifecycleAdapter: adapter,
  });
}

test("webgl and 3d jobs drive authored update/render through seek, settle, and reset", () => {
  for (const renderer of ["webgl", "3d"]) {
    const calls = [];
    const { adapter } = makeAdapter({ renderer, calls });
    const job = makeJob(adapter, renderer);
    assert.equal(job.state().phase, "active");
    assert.equal(job.seek(125).authoredTimeMs, 125);
    assert.equal(job.settle().authoredTimeMs, 500);
    assert.equal(job.reset().authoredTimeMs, 0);
    assert.deepEqual(calls.filter((call) => Array.isArray(call)).map(([kind, time]) => [kind, time]), [
      ["update", 125], ["render", 125], ["update", 500], ["render", 500], ["update", 0], ["render", 0],
    ]);
    job.dispose();
  }
});

test("texture and particle resources are rejected against core structured budgets", () => {
  assert.throws(() => makeAdapter({ budgets: { texture: { maxCount: 0 } } }), /texture resources exceed/);
  assert.throws(() => createSceneLifecycleAdapter({
    id: "particle-overflow",
    renderer: "3d",
    root: "scene-root",
    scene: {
      camera: { mode: "perspective" },
      dpr: 1,
      viewport: { width: 320, height: 200 },
      resourceRegistry: {
        buffers: [], textures: [], programs: [], framebuffers: [], renderLoops: [], observers: [], listeners: [],
        particles: [{ id: "p1" }, { id: "p2" }],
      },
    },
    budgets: budgets({ particle: { applicable: true, max: 1 } }),
  }), /particle resources exceed/);
});

test("dispose releases every registered resource once and remains idempotent", () => {
  const calls = [];
  const { adapter } = makeAdapter({ calls });
  adapter.init();
  adapter.dispose();
  const first = adapter.cleanupStatus();
  adapter.dispose();
  const second = adapter.cleanupStatus();
  assert.deepEqual(second, first);
  assert.equal(first.disposed, true);
  assert.equal(first.status, undefined);
  assert.ok(first.resources.length >= 7);
  assert.ok(first.resources.every((resource) => resource.released));
  assert.equal(calls.filter((call) => call === "dispose").length, 1);
  assert.equal(calls.filter((call) => Array.isArray(call) && call[0].startsWith("delete")).length, 4);
});

test("cleanup failure is observable as blocked and probeLifecycle fails closed", () => {
  const { adapter } = makeAdapter({ registry: {
    buffers: [{ id: "leaked", release: () => false }],
    textures: [], programs: [], framebuffers: [], renderLoops: [], observers: [], listeners: [],
  } });
  const probe = probeLifecycle(adapter);
  assert.equal(probe.status, "blocked");
  assert.equal(probe.checks.find((check) => check.id === "cleanup").passed, false);
  assert.equal(adapter.cleanupStatus().status, "blocked");
});

test("probeLifecycle passes for a fully disposable scene adapter", () => {
  const { adapter } = makeAdapter();
  const probe = probeLifecycle(adapter);
  assert.equal(probe.status, "passed");
  assert.ok(probe.checks.every((check) => check.passed));
});

test("context loss is blocked without claiming renderer readiness", () => {
  const adapter = makeAdapter({ gl: { isContextLost: () => true } }).adapter;
  assert.equal(adapter.cleanupStatus().status, "blocked");
  assert.equal(adapter.status().status, "blocked");
  assert.equal(adapter.status().ready, undefined);
});

test("performance verification consumes budgets from the animation job contract", () => {
  const { adapter } = makeAdapter();
  const job = makeJob(adapter);
  const result = evaluatePerformanceBudget({ job, samples: [{ durationMs: 8 }, { durationMs: 10 }] });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.budgets, job.contract.budgets);
});
