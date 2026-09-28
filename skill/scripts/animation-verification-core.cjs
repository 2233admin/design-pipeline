"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {
  assertObject,
  assertString,
  canonicalJson,
  fail,
  sha256,
} = require("./contract-utils.cjs");
const { validatePerformanceBudgets } = require("./motion-foundation-core.cjs");
const { validateSourceAdmission } = require("./source-admission-core.cjs");
const { validateDeployProfile } = require("./deploy-profile-core.cjs");
const { validateExecutionReceipt } = require("./execution-target-core.cjs");
const { validateArtifactMetadata } = require("./artifact-core.cjs");
const { validateReceipt: validateEvidenceReceipt } = require("./evidence-core.cjs");
const { MOTION_SCHEMA, evaluateMotion } = require("./motion-evidence-core.cjs");
const { validateDynamicDesignComposition } = require("./dynamic-design-composition-core.cjs");
const { validateAdmittedSourceSnapshot } = require("./admitted-source-snapshot-core.cjs");

const PROBE_SCHEMA = "design-pipeline.animation-verification.v1";
const INPUT_TRACE_SCHEMA = "design-pipeline.animation-input-trace.v1";
const FIXED_STEP_FPS = Object.freeze([30, 60, 120]);
const REAL_INPUT_EVIDENCE_SCHEMA = "design-pipeline.animation-real-input-evidence.v1";
const INPUT_TYPES = Object.freeze(["keyboard", "pointer", "wheel", "scroll", "drag", "touch"]);
const METRIC_KEYS = Object.freeze(["listeners", "timers", "raf", "resources", "observers", "subscriptions"]);

function finite(value, label, { min = -Infinity } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) fail("animation verification", `${label} must be a finite number${min > -Infinity ? ` >= ${min}` : ""}`);
  return value;
}

function nonEmpty(value, label) {
  assertString(value, label, "animation verification");
  if (!value.trim()) fail("animation verification", `${label} must not be empty`);
  return value;
}
function canonicalRoot(raw, label) {
  assertString(raw, label, "animation verification");
  const absolute = path.resolve(raw);
  if (!fs.existsSync(absolute)) fail("animation verification", label + " must exist");
  return path.resolve(fs.realpathSync.native(absolute));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function clone(value) {
  if (value === undefined) return undefined;
  try {
    return stable(JSON.parse(JSON.stringify(value)));
  } catch (error) {
    fail("animation verification", `snapshot must be JSON-serializable: ${error.message}`);
  }
}

function same(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function syncResult(value, label) {
  if (value && typeof value.then === "function") fail("animation verification", `${label} must be synchronous for deterministic evidence`);
  return value;
}

function graphSnapshot(graph, returned) {
  if (returned !== undefined && typeof returned !== "function") return clone(returned);
  if (typeof graph.snapshot === "function") return clone(syncResult(graph.snapshot(), "snapshot"));
  if (typeof graph.state === "function") return clone(syncResult(graph.state(), "state"));
  if (graph.state && typeof graph.state === "object") return clone(graph.state);
  return returned === undefined ? null : clone(returned);
}

function graphSeek(graph, timeMs) {
  if (typeof graph.seek === "function") return syncResult(graph.seek(timeMs), "seek");
  if (graph.timeline && typeof graph.timeline.seek === "function") return syncResult(graph.timeline.seek(timeMs), "timeline.seek");
  if (typeof graph.sample === "function") return syncResult(graph.sample(timeMs), "sample");
  fail("animation verification", "graph must expose seek(timeMs), timeline.seek(timeMs), or sample(timeMs)");
}

function graphReset(graph) {
  if (typeof graph.reset !== "function") return undefined;
  return syncResult(graph.reset(), "reset");
}

function graphSettle(graph, durationMs) {
  if (typeof graph.settle === "function") return syncResult(graph.settle(), "settle");
  return graphSeek(graph, durationMs);
}

function graphDispose(graph) {
  if (typeof graph.dispose === "function") return syncResult(graph.dispose(), "dispose");
  if (typeof graph.destroy === "function") return syncResult(graph.destroy(), "destroy");
  if (typeof graph.unmount === "function") return syncResult(graph.unmount(), "unmount");
  fail("animation verification", "lifecycle target must expose dispose(), destroy(), or unmount()");
}

function assertDuration(durationMs) {
  return finite(durationMs, "durationMs", { min: 0 });
}

function sampleFixedSteps(graph, options = {}) {
  assertObject(options, "options", "animation verification");
  const durationMs = assertDuration(options.durationMs);
  const fps = options.fps === undefined ? 60 : options.fps;
  if (!FIXED_STEP_FPS.includes(fps)) fail("animation verification", `fps must be one of ${FIXED_STEP_FPS.join(", ")}`);
  const stepMs = 1000 / fps;
  const frameCount = Math.max(0, Math.round(durationMs / stepMs));
  const times = [];
  for (let index = 0; index <= frameCount; index += 1) {
    const timeMs = Math.min(durationMs, Number((index * stepMs).toFixed(6)));
    if (!times.length || timeMs !== times[times.length - 1]) times.push(timeMs);
  }
  if (!times.length || times[times.length - 1] !== durationMs) times.push(durationMs);
  const sample = () => {
    graphReset(graph);
    return times.map((timeMs) => {
      const returned = graphSeek(graph, timeMs);
      return { timeMs, state: graphSnapshot(graph, returned) };
    });
  };
  const states = sample();
  const replay = sample();
  const deterministic = same(states, replay);
  return { schema: PROBE_SCHEMA, status: deterministic ? "passed" : "blocked", fps, stepMs, durationMs, times, states, replay, deterministic };
}

function probeAuthoredTime(graph, options = {}) {
  assertObject(graph, "graph", "animation verification");
  const durationMs = assertDuration(options.durationMs);
  const midpointMs = options.midpointMs === undefined ? durationMs / 2 : finite(options.midpointMs, "midpointMs", { min: 0 });
  if (midpointMs > durationMs) fail("animation verification", "midpointMs must not exceed durationMs");
  const sequence = () => {
    graphReset(graph);
    const resetState = graphSnapshot(graph);
    const startReturned = graphSeek(graph, 0);
    const startState = graphSnapshot(graph, startReturned);
    const midReturned = graphSeek(graph, midpointMs);
    const midState = graphSnapshot(graph, midReturned);
    const endReturned = graphSeek(graph, durationMs);
    const endState = graphSnapshot(graph, endReturned);
    const settledReturned = graphSettle(graph, durationMs);
    const settledState = graphSnapshot(graph, settledReturned);
    graphReset(graph);
    const resetAfterState = graphSnapshot(graph);
    return { reset: resetState, start: startState, mid: midState, end: endState, settled: settledState, resetAfter: resetAfterState };
  };
  const states = sequence();
  const replay = sequence();
  const deterministic = same(states, replay);
  const checks = [
    { id: "seek-start", passed: same(states.start, states.reset) },
    { id: "seek-mid", passed: midpointMs === 0 || !same(states.mid, states.start) },
    { id: "seek-end", passed: same(states.settled, states.end) },
    { id: "reset", passed: same(states.resetAfter, states.reset) },
    { id: "deterministic-replay", passed: deterministic },
  ];
  const passed = checks.every((check) => check.passed);
  return { schema: PROBE_SCHEMA, status: passed ? "passed" : "blocked", deterministic: passed, durationMs, midpointMs, states, replay, checks };
}

function normalizeInputEvents(events) {
  if (!Array.isArray(events) || events.length === 0) fail("animation verification", "input events must not be empty");
  let previous = -Infinity;
  let dragState = "idle";
  const normalized = events.map((event, index) => {
    assertObject(event, `events[${index}]`, "animation verification");
    nonEmpty(event.type, `events[${index}].type`);
    if (!INPUT_TYPES.includes(event.type)) fail("animation verification", `events[${index}].type is unsupported`);
    const atMs = finite(event.atMs, `events[${index}].atMs`, { min: 0 });
    if (atMs < previous) fail("animation verification", "input events must be ordered by authored atMs");
    previous = atMs;
    if (["pointer", "drag", "touch"].includes(event.type)) {
      finite(event.x, `events[${index}].x`);
      finite(event.y, `events[${index}].y`);
    }
    if (["pointer", "touch"].includes(event.type)) {
      const phase = event.phase || event.action;
      const phases = event.type === "pointer" ? ["down", "move", "up", "cancel"] : ["start", "move", "end", "cancel"];
      if (!phases.includes(phase)) fail("animation verification", `events[${index}].${event.type} phase is unsupported`);
    }
    if (event.type === "drag") {
      const phase = event.phase || event.action;
      if (!["start", "move", "end"].includes(phase)) fail("animation verification", `events[${index}].drag phase is unsupported`);
      if (phase === "start") {
        if (dragState !== "idle") fail("animation verification", "drag sequence must start only when idle");
        dragState = "active";
      } else if (phase === "move") {
        if (dragState !== "active") fail("animation verification", "drag move requires an active drag");
      } else {
        if (dragState !== "active") fail("animation verification", "drag end requires an active drag");
        dragState = "idle";
      }
    }
    if (event.type === "keyboard") nonEmpty(event.key, `events[${index}].key`);
    if (["wheel", "scroll"].includes(event.type)) {
      if (event.deltaX === undefined && event.deltaY === undefined) fail("animation verification", `events[${index}] needs deltaX or deltaY`);
      if (event.deltaX !== undefined) finite(event.deltaX, `events[${index}].deltaX`);
      if (event.deltaY !== undefined) finite(event.deltaY, `events[${index}].deltaY`);
    }
    return clone(event);
  });
  if (dragState !== "idle") fail("animation verification", "drag sequence must end with an end event");
  return normalized;
}

function validateInputTrace(trace) {
  assertObject(trace, "trace", "animation verification");
  if (trace.schema !== INPUT_TRACE_SCHEMA) fail("animation verification", `trace.schema must be ${INPUT_TRACE_SCHEMA}`);
  if (trace.version !== 1) fail("animation verification", "trace.version must be 1");
  assertObject(trace.source, "trace.source", "animation verification");
  nonEmpty(trace.source.id, "trace.source.id");
  assertObject(trace.viewport, "trace.viewport", "animation verification");
  finite(trace.viewport.width, "trace.viewport.width", { min: 1 });
  finite(trace.viewport.height, "trace.viewport.height", { min: 1 });
  if (trace.viewport.dpr !== undefined) finite(trace.viewport.dpr, "trace.viewport.dpr", { min: 0.1 });
  return { ...trace, events: normalizeInputEvents(trace.events) };
}

function createInputTrace(input) {
  assertObject(input, "trace input", "animation verification");
  return validateInputTrace({ schema: INPUT_TRACE_SCHEMA, version: 1, source: input.source, viewport: input.viewport, events: input.events });
}

function applyInput(target, event, apply) {
  if (typeof apply === "function") return syncResult(apply(event, target), "input replay");
  if (typeof target.applyInput === "function") return syncResult(target.applyInput(event), "applyInput");
  if (typeof target.dispatchInput === "function") return syncResult(target.dispatchInput(event), "dispatchInput");
  fail("animation verification", "input target must expose applyInput(event) or dispatchInput(event)");
}

function replayOnce(target, events, apply) {
  graphReset(target);
  const records = events.map((event) => {
    graphSeek(target, event.atMs);
    const before = graphSnapshot(target);
    const returned = applyInput(target, event, apply);
    const after = graphSnapshot(target, returned);
    return { event, before, after, changed: !same(before, after) };
  });
  return { records, final: graphSnapshot(target) };
}

function replayDeterministicInputs(target, options = {}) {
  const trace = options.trace ? validateInputTrace(options.trace) : createInputTrace({ source: options.source, viewport: options.viewport, events: options.events });
  const first = replayOnce(target, trace.events, options.apply);
  const second = replayOnce(target, trace.events, options.apply);
  const deterministic = same(first, second);
  return { schema: PROBE_SCHEMA, trace, events: trace.events, deterministic, first, second, status: deterministic ? "passed" : "blocked" };
}
function browserPhase(event) {
  return event.phase || event.action;
}

async function browserSeek(page, timeMs) {
  return page.evaluate((value) => {
    const animation = window.__animation;
    if (!animation || typeof animation.seek !== "function") throw new Error("window.__animation.seek(timeMs) is required");
    return animation.seek(value);
  }, timeMs);
}

async function browserReset(page) {
  return page.evaluate(() => {
    const animation = window.__animation;
    if (!animation || typeof animation.reset !== "function") throw new Error("window.__animation.reset() is required");
    return animation.reset();
  });
}

async function browserSettle(page) {
  return page.evaluate(() => {
    const animation = window.__animation;
    if (!animation || typeof animation.settle !== "function") throw new Error("window.__animation.settle() is required");
    return animation.settle();
  });
}

async function dispatchBrowserInput(page, event) {
  const phase = browserPhase(event);
  if (event.type === "pointer") {
    await page.mouse.move(event.x, event.y);
    if (phase === "down") await page.mouse.down();
    else if (phase === "up" || phase === "cancel") await page.mouse.up();
    return;
  }
  if (event.type === "drag") {
    await page.mouse.move(event.x, event.y);
    if (phase === "start") await page.mouse.down();
    else if (phase === "end") await page.mouse.up();
    return;
  }
  if (event.type === "wheel" || event.type === "scroll") {
    await page.mouse.wheel({ deltaX: event.deltaX || 0, deltaY: event.deltaY || 0 });
    return;
  }
  if (event.type === "keyboard") {
    if (phase === "down") await page.keyboard.down(event.key);
    else if (phase === "up") await page.keyboard.up(event.key);
    else await page.keyboard.press(event.key);
    return;
  }
  fail("animation verification", "real browser input does not support " + event.type + "; use synthetic replay for touch");
}

async function observeBrowserRenderer(page, options = {}) {
  const domSelector = options.domSelector || "[data-animation-dom]";
  const canvasSelector = options.canvasSelector || "canvas[data-animation-canvas]";
  const observed = await page.evaluate(({ domSelector: dom, canvasSelector: canvas }) => {
    const animation = window.__animation;
    if (!animation || (typeof animation.state !== "function" && typeof animation.snapshot !== "function")) throw new Error("window.__animation.state() or snapshot() is required");
    const target = document.querySelector(dom);
    const canvasNode = document.querySelector(canvas);
    const style = target ? getComputedStyle(target) : null;
    return {
      state: typeof animation.state === "function" ? animation.state() : animation.snapshot(),
      dom: { transform: style ? style.transform : null },
      canvasDataUrl: canvasNode ? canvasNode.toDataURL("image/png") : null,
    };
  }, { domSelector, canvasSelector });
  return {
    state: clone(observed.state),
    dom: clone(observed.dom),
    canvasHash: observed.canvasDataUrl ? "sha256:" + sha256(Buffer.from(observed.canvasDataUrl)) : null,
  };
}

async function replayRealBrowserInputs(page, options = {}) {
  const trace = validateInputTrace(options.trace || createInputTrace(options));
  const run = async () => {
    await browserReset(page);
    const records = [];
    for (const event of trace.events) {
      await browserSeek(page, event.atMs);
      const before = await observeBrowserRenderer(page, options);
      await dispatchBrowserInput(page, event);
      await browserSettle(page);
      const after = await observeBrowserRenderer(page, options);
      records.push({ event, before, after, changed: !same(before, after) });
    }
    return { records, final: await observeBrowserRenderer(page, options) };
  };
  const first = await run();
  const second = await run();
  const deterministic = same(first, second);
  return { schema: REAL_INPUT_EVIDENCE_SCHEMA, trace, events: trace.events, deterministic, first, second, status: deterministic ? "passed" : "blocked" };
}

function evaluateInputOracle(replay, options = {}) {
  assertObject(replay, "replay", "animation verification");
  const requiredTypes = options.requiredTypes || ["pointer", "wheel", "scroll", "drag"];
  const events = replay.first?.records || [];
  const checks = requiredTypes.map((type) => {
    const matching = events.filter(({ event }) => event.type === type);
    const changed = matching.length > 0 && matching.every((record) => record.changed === true || options.allowNoopTypes?.includes(type));
    return { id: `input-${type}`, passed: matching.length > 0 && changed, count: matching.length };
  });
  const dragEvents = events.filter(({ event }) => event.type === "drag").map(({ event }) => event.phase || event.action).filter(Boolean);
  if (dragEvents.length) checks.push({ id: "drag-sequence", passed: dragEvents.includes("start") && dragEvents.includes("move") && dragEvents.includes("end") });
  const passed = replay.deterministic === true && checks.every((check) => check.passed);
  return { schema: PROBE_SCHEMA, status: passed ? "passed" : "blocked", deterministic: replay.deterministic === true, checks };
}

function metricPathValue(value, path) {
  return path.split(".").reduce((current, key) => current && current[key], value);
}

function metricValues(state, definition) {
  let value;
  if (typeof definition.extract === "function") value = definition.extract(state);
  else if (typeof definition.path === "string" && definition.path.trim()) value = metricPathValue(state, definition.path);
  else return null;
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number" && Number.isFinite(item))) return value;
  return null;
}

function transitionMetrics(input, options) {
  const declaredChannels = options.channels || input.channels;
  if (Array.isArray(declaredChannels) && declaredChannels.length > 0) {
    return declaredChannels.map((channel, index) => {
      assertObject(channel, `channels[${index}]`, "animation verification");
      const id = nonEmpty(channel.id || `channel-${index}`, `channels[${index}].id`);
      const maxStep = finite(channel.maxStep, `channels[${index}].maxStep`, { min: 0 });
      if (typeof channel.extract !== "function" && typeof channel.path !== "string") fail("animation verification", `channels[${index}] needs extract or path`);
      return { id, extract: channel.extract, path: channel.path, maxStep };
    });
  }
  const extract = options.metric || input.metric;
  const path = options.metricPath || input.metricPath;
  if (typeof extract !== "function" && typeof path !== "string") return null;
  const maxStep = options.maxStep ?? input.maxStep;
  if (maxStep === undefined) return null;
  return [{ id: "metric", extract, path, maxStep: finite(maxStep, "maxStep", { min: 0 }) }];
}

function evaluateTransitionOracle(input, options = {}) {
  assertObject(input, "input", "animation verification");
  const samples = input.samples || input.states;
  if (!Array.isArray(samples) || samples.length < 2) fail("animation verification", "transition samples must contain at least two samples");
  const normalized = samples.map((sample, index) => {
    const timeMs = finite(sample.timeMs ?? sample.atMs, `samples[${index}].timeMs`, { min: 0 });
    return { timeMs, state: sample.state ?? sample.value ?? sample };
  }).sort((a, b) => a.timeMs - b.timeMs);
  const durationMs = assertDuration(input.durationMs ?? normalized[normalized.length - 1].timeMs);
  const fromState = input.fromState;
  const toState = input.toState;
  const middle = normalized.filter((sample) => sample.timeMs > 0 && sample.timeMs < durationMs);
  const middleDistinct = middle.some((sample) => !same(sample.state, fromState) && !same(sample.state, toState));
  const midTransition = middle.length > 0 && middleDistinct;
  const earlyExit = normalized.some((sample) => sample.timeMs < durationMs && same(sample.state, toState));
  const final = normalized[normalized.length - 1];
  const stateExit = same(final.state, toState);
  const metricDefinitions = transitionMetrics(input, options);
  let noTeleportCheck;
  if (!metricDefinitions) {
    noTeleportCheck = { id: "no-teleport", passed: false, reason: "declared metric extractor or channels are required" };
  } else {
    const metricSamples = normalized.map((sample) => metricDefinitions.map((definition) => metricValues(sample.state, definition)));
    const metricValid = metricSamples.every((sample) => sample.every((value) => value !== null));
    const distances = [];
    if (metricValid) {
      for (let index = 1; index < metricSamples.length; index += 1) {
        for (let channelIndex = 0; channelIndex < metricDefinitions.length; channelIndex += 1) {
          const previous = metricSamples[index - 1][channelIndex];
          const current = metricSamples[index][channelIndex];
          if (previous.length !== current.length) {
            distances.push({ channel: metricDefinitions[channelIndex].id, maxObservedStep: Infinity, passed: false });
            continue;
          }
          const maxObservedStep = Math.max(...current.map((value, vectorIndex) => Math.abs(value - previous[vectorIndex])));
          distances.push({ channel: metricDefinitions[channelIndex].id, maxObservedStep, passed: maxObservedStep <= metricDefinitions[channelIndex].maxStep });
        }
      }
    }
    noTeleportCheck = { id: "no-teleport", passed: metricValid && distances.length > 0 && distances.every((distance) => distance.passed), channels: distances };
    if (!metricValid) noTeleportCheck.reason = "declared metric extractor did not return finite scalar/vector values for every sample";
  }
  const checks = [
    { id: "mid-transition", passed: midTransition },
    { id: "state-exit", passed: stateExit && !earlyExit },
    noTeleportCheck,
  ];
  return { schema: PROBE_SCHEMA, status: checks.every((check) => check.passed) ? "passed" : "blocked", durationMs, checks, samples: normalized };
}

function evaluateReducedMotion(input) {
  assertObject(input, "input", "animation verification");
  const reduced = input.reduced || input.reducedMotion;
  assertObject(reduced, "reduced", "animation verification");
  const expected = input.expected ?? input.final;
  const state = reduced.state ?? reduced.snapshot ?? reduced;
  const samples = reduced.samples || [];
  const checks = [
    { id: "terminal-state", passed: expected !== undefined && same(state, expected) },
    { id: "no-intermediate-motion", passed: samples.length <= 1 || samples.every((sample) => same(sample.state ?? sample, state)) },
    { id: "preference-applied", passed: reduced.prefersReducedMotion === true },
  ];
  return { schema: PROBE_SCHEMA, status: checks.every((check) => check.passed) ? "passed" : "blocked", checks, state };
}


function lifecycleSnapshot(adapter) {
  if (typeof adapter.cleanupStatus === "function") return clone(syncResult(adapter.cleanupStatus(), "cleanupStatus"));
  if (typeof adapter.metrics === "function") return clone(syncResult(adapter.metrics(), "metrics"));
  if (typeof adapter.snapshot === "function") return clone(syncResult(adapter.snapshot(), "snapshot"));
  return null;
}

function lifecycleCleanupPassed(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (snapshot.disposed === true && Array.isArray(snapshot.resources)) return snapshot.resources.length > 0 && snapshot.resources.every((resource) => resource && resource.released === true);
  const source = snapshot.metrics && typeof snapshot.metrics === "object" ? snapshot.metrics : snapshot;
  const present = METRIC_KEYS.filter((key) => source[key] !== undefined);
  return present.length > 0 && present.length === METRIC_KEYS.length && present.every((key) => Number(source[key]) === 0);
}

function probeLifecycle(adapter) {
  assertObject(adapter, "adapter", "animation verification");
  const hasInit = typeof adapter.init === "function" || typeof adapter.mount === "function";
  const hasDispose = typeof adapter.dispose === "function" || typeof adapter.destroy === "function" || typeof adapter.unmount === "function";
  const hasSource = typeof adapter.cleanupStatus === "function" || typeof adapter.metrics === "function" || typeof adapter.snapshot === "function";
  if (!hasInit || !hasDispose || !hasSource) {
    const checks = [
      { id: "lifecycle-source", passed: false, reason: "observable lifecycle source with init/mount and dispose is required" },
      { id: "cleanup", passed: false },
      { id: "idempotent-dispose", passed: false },
    ];
    return { schema: PROBE_SCHEMA, status: "blocked", before: null, mounted: null, disposed: null, disposedAgain: null, checks };
  }
  const before = lifecycleSnapshot(adapter);
  if (typeof adapter.init === "function") syncResult(adapter.init(), "init");
  else syncResult(adapter.mount(), "mount");
  const mounted = lifecycleSnapshot(adapter);
  graphDispose(adapter);
  const disposed = lifecycleSnapshot(adapter);
  graphDispose(adapter);
  const disposedAgain = lifecycleSnapshot(adapter);
  const checks = [
    { id: "lifecycle-source", passed: mounted !== null },
    { id: "cleanup", passed: lifecycleCleanupPassed(disposed) },
    { id: "idempotent-dispose", passed: same(disposed, disposedAgain) },
  ];
  return { schema: PROBE_SCHEMA, status: checks.every((check) => check.passed) ? "passed" : "blocked", before, mounted, disposed, disposedAgain, checks };
}

function evaluatePerformanceBudget(input) {
  assertObject(input, "input", "animation verification");
  const samples = input.samples || input.frames || [];
  if (!Array.isArray(samples)) fail("animation verification", "performance samples must be an array");
  const budgets = input.budgets || input.job?.budgets || input.job?.contract?.budgets || input.contract?.budgets;
  const blocked = (reason) => ({ schema: PROBE_SCHEMA, status: "blocked", budgets: budgets || null, longFrames: [], checks: [{ id: "budget-declaration", passed: false, reason }] });
  if (samples.length === 0) return blocked("performance samples must be a non-empty array");
  if (input.budget !== undefined) return blocked("flat budget API is unsupported; provide core Animation Job budgets");
  if (!budgets || typeof budgets !== "object" || Array.isArray(budgets)) return blocked("core Animation Job budgets are required");
  let validated;
  try {
    validated = validatePerformanceBudgets(budgets);
  } catch (error) {
    return blocked(error.message);
  }
  const frameBudget = validated.frame;
  if (frameBudget.applicable !== true || frameBudget.maxLongFrames === undefined) return blocked("budgets.frame must declare applicable maxMs and maxLongFrames");
  const hasInput = samples.some((sample) => sample.inputLatencyMs !== undefined);
  const hasCpu = samples.some((sample) => sample.cpuMs !== undefined);
  if (hasInput && frameBudget.maxInputLatencyMs === undefined) return blocked("budgets.frame.maxInputLatencyMs is required for input samples");
  if (hasCpu && frameBudget.maxCpuMs === undefined) return blocked("budgets.frame.maxCpuMs is required for CPU samples");
  const measuredTypes = [
    ["object", "objects", validated.object],
    ["particle", "particles", validated.particle],
    ["texture-count", "textureCount", validated.texture],
    ["texture-bytes", "textureBytes", validated.texture],
  ];
  for (const [id, sampleKey, budget] of measuredTypes) {
    if (samples.some((sample) => sample[sampleKey] !== undefined) && budget.applicable !== true) return blocked(`budgets.${id} must be applicable for observed ${sampleKey}`);
  }
  const frameDurations = samples.map((sample, index) => finite(sample.durationMs ?? sample.frameMs, `samples[${index}].durationMs`, { min: 0 }));
  const longFrames = frameDurations.filter((durationMs) => durationMs > frameBudget.maxMs);
  const checks = [{ id: "long-frame-count", passed: longFrames.length <= frameBudget.maxLongFrames, observed: longFrames.length, limit: frameBudget.maxLongFrames }];
  const maxObserved = (key) => Math.max(0, ...samples.map((sample, index) => sample[key] === undefined ? 0 : finite(sample[key], `samples[${index}].${key}`, { min: 0 })));
  if (hasInput) checks.push({ id: "input-latency", passed: maxObserved("inputLatencyMs") <= frameBudget.maxInputLatencyMs, observed: maxObserved("inputLatencyMs"), limit: frameBudget.maxInputLatencyMs });
  if (hasCpu) checks.push({ id: "cpu", passed: maxObserved("cpuMs") <= frameBudget.maxCpuMs, observed: maxObserved("cpuMs"), limit: frameBudget.maxCpuMs });
  for (const [id, sampleKey, budget] of measuredTypes) {
    if (budget.applicable !== true) continue;
    const limit = id === "object" || id === "particle" ? budget.max : id === "texture-count" ? budget.maxCount : budget.maxBytes;
    if (limit === undefined) continue;
    const observed = maxObserved(sampleKey);
    checks.push({ id, passed: observed <= limit, observed, limit });
  }
  return { schema: PROBE_SCHEMA, status: checks.every((check) => check.passed) ? "passed" : "blocked", budgets: validated, longFrames, checks };
}

function nativeReceiptHash(receipt) {
  return `sha256:${sha256(canonicalJson(receipt))}`;
}

function bindingError(blockers, label, message) {
  blockers.push(`${label}: ${message}`);
}

function validateBinding(binding, label, validator, options, blockers, expectedStatus) {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
    bindingError(blockers, label, "binding is required");
    return null;
  }
  for (const key of ["id", "receiptId", "status", "contentHash", "receipt"]) {
    if (typeof binding[key] !== "string" && key !== "receipt") bindingError(blockers, label, `${key} is required`);
  }
  if (!binding.receipt || typeof binding.receipt !== "object" || Array.isArray(binding.receipt)) {
    bindingError(blockers, label, "receipt is required");
    return null;
  }
  if (typeof binding.contentHash === "string" && binding.contentHash !== nativeReceiptHash(binding.receipt)) bindingError(blockers, label, "contentHash does not match receipt");
  if (binding.receipt.id !== undefined && binding.id !== binding.receipt.id) bindingError(blockers, label, "id does not match native receipt id");
  if (binding.receipt.receiptId !== undefined && binding.receiptId !== binding.receipt.receiptId) bindingError(blockers, label, "receiptId does not match native receipt receiptId");
  if (binding.receipt.receiptId === undefined && binding.receipt.id !== undefined && binding.receiptId !== binding.receipt.id) bindingError(blockers, label, "receiptId must bind the native receipt id");
  let result;
  try {
    result = validator(binding.receipt, options);
  } catch (error) {
    bindingError(blockers, label, error.message);
    return null;
  }
  const nativeStatus = typeof result?.status === "string" ? result.status : binding.receipt.status || options?.fallbackStatus;
  if (expectedStatus && nativeStatus !== expectedStatus) bindingError(blockers, label, `status must be ${expectedStatus}`);
  if (binding.status !== nativeStatus) bindingError(blockers, label, "status does not match native authority outcome");
  if (options?.upstreamReceiptId && binding.upstreamReceiptId !== options.upstreamReceiptId) bindingError(blockers, label, "upstreamReceiptId does not match the preceding receipt");
  return result;
}

function validateGateNative(receipt) {
  if (receipt.schema !== MOTION_SCHEMA) fail("animation verification", "unsupported native motion-evidence receipt schema");
  return evaluateMotion(receipt);
}

function validateEvidenceChain(chain, options = {}) {
  const blockers = [];
  if (!chain || typeof chain !== "object" || Array.isArray(chain)) return { status: "blocked", blockers: ["chain must be an object"] };
  const source = chain.source;
  if (!source || typeof source !== "object" || Array.isArray(source)) blockers.push("source is required");
  else {
    for (const key of ["kind", "identity", "revision", "contentHash"]) if (typeof source[key] !== "string" || !source[key].trim()) blockers.push(`source.${key} is required`);
    if (typeof source.contentHash === "string" && !/^[a-f0-9]{64}$/.test(source.contentHash)) blockers.push("source.contentHash must be a SHA-256 digest");
  }
  const bindingSections = ["sourceAdmission", "admittedSnapshot", "executionTarget", "deployProfile", "runtimeOrStaticArtifact", "composition", "capture", "existingGateReceipt", "finalArtifact"];
  for (const section of bindingSections) {
    const value = chain[section];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      blockers.push(`${section} is required`);
      continue;
    }
    for (const key of ["id", "receiptId", "status", "contentHash"]) if (typeof value[key] !== "string" || !value[key].trim()) blockers.push(`${section}.${key} is required`);
    if (!value.receipt || typeof value.receipt !== "object" || Array.isArray(value.receipt)) blockers.push(`${section}.receipt is required`);
  }
  if (chain.executionTarget && (!chain.executionTarget.toolchainPlan || typeof chain.executionTarget.toolchainPlan !== "object" || Array.isArray(chain.executionTarget.toolchainPlan))) blockers.push("executionTarget.toolchainPlan native payload is required");
  if (blockers.length) return { status: "blocked", blockers, references: chain };
  const execution = validateBinding(chain.executionTarget, "executionTarget", validateExecutionReceipt, {
    plan: chain.executionTarget.plan,
    state: chain.executionTarget.state,
    outcome: chain.executionTarget.outcome,
    toolchainPlan: chain.executionTarget.toolchainPlan,
    toolchainPlanSha256: chain.executionTarget.receipt.toolchainPlanSha256,
    requireLineageBindings: true,
    sourceAdmissionReceiptId: chain.sourceAdmission.receiptId,
    sourceContentHash: source.contentHash,
  }, blockers, "complete");
  if (!execution) return { status: "blocked", blockers, references: chain };
  const deploy = validateBinding(chain.deployProfile, "deployProfile", validateDeployProfile, {
    executionReceipt: chain.executionTarget.receipt,
    sourceAdmissionReceiptId: chain.sourceAdmission.receiptId,
    sourceContentHash: source.contentHash,
    expectedStatus: "ready",
    upstreamReceiptId: chain.executionTarget.receiptId,
  }, blockers, "ready");
  if (!deploy) return { status: "blocked", blockers, references: chain };
  const admission = validateBinding(chain.sourceAdmission, "sourceAdmission", validateSourceAdmission, {
    expectedSource: source,
    deployProfile: chain.deployProfile.receipt,
    executionTarget: chain.executionTarget.receipt,
    executionReceipt: chain.executionTarget.receipt,
  }, blockers, "admitted");
  if (!admission) return { status: "blocked", blockers, references: chain };
  if (typeof options.workspaceRoot !== "string" || !options.workspaceRoot.trim()) return { status: "blocked", blockers: ["workspaceRoot is required for admitted snapshot validation"], references: chain };
  const deployWorkspaceRoot = chain.deployProfile.receipt.sandbox && chain.deployProfile.receipt.sandbox.workspaceRoot;
  if (typeof deployWorkspaceRoot !== "string" || !deployWorkspaceRoot.trim()) return { status: "blocked", blockers: ["deployProfile.sandbox.workspaceRoot is required for admitted snapshot validation"], references: chain };
  try {
    const trustedWorkspace = canonicalRoot(deployWorkspaceRoot, "deployProfile.sandbox.workspaceRoot");
    const requestedWorkspace = canonicalRoot(options.workspaceRoot, "workspaceRoot");
    const snapshotWorkspace = canonicalRoot(chain.admittedSnapshot.receipt.companionWorkspaceRoot, "admittedSnapshot.companionWorkspaceRoot");
    if (trustedWorkspace !== requestedWorkspace) bindingError(blockers, "admittedSnapshot", "workspaceRoot does not match deploy profile sandbox workspaceRoot");
    if (trustedWorkspace !== snapshotWorkspace) bindingError(blockers, "admittedSnapshot", "companionWorkspaceRoot does not match deploy profile sandbox workspaceRoot");
  } catch (error) {
    bindingError(blockers, "admittedSnapshot", error.message);
  }
  if (blockers.length) return { status: "blocked", blockers, references: chain };
  const snapshot = validateBinding(chain.admittedSnapshot, "admittedSnapshot", validateAdmittedSourceSnapshot, {
    admissionReceipt: chain.sourceAdmission.receipt,
    workspaceRoot: deployWorkspaceRoot,
    requireFiles: true,
  }, blockers, "ready");
  if (!snapshot) return { status: "blocked", blockers, references: chain };
  if (typeof options.artifactRoot !== "string" || !options.artifactRoot.trim()) {
    return { status: "blocked", blockers: ["artifactRoot is required for contained artifact validation"], references: chain };
  }
  if (typeof options.evidenceRoot !== "string" || !options.evidenceRoot.trim()) {
    return { status: "blocked", blockers: ["evidenceRoot is required for contained capture validation"], references: chain };
  }
  const runtime = validateBinding(chain.runtimeOrStaticArtifact, "runtimeOrStaticArtifact", validateArtifactMetadata, {
    changeRoot: options.artifactRoot,
    requireFile: true,
    checkHash: true,
    upstreamReceiptId: chain.deployProfile.receiptId,
  }, blockers, "ready");
  const runtimeInputs = chain.runtimeOrStaticArtifact.receipt.input_hashes || {};
  if (runtime && runtimeInputs.source !== `sha256:${source.contentHash}`) bindingError(blockers, "runtimeOrStaticArtifact", "input_hashes.source does not bind source contentHash");
  if (runtime && runtimeInputs.admission !== nativeReceiptHash(chain.sourceAdmission.receipt)) bindingError(blockers, "runtimeOrStaticArtifact", "input_hashes.admission does not bind source admission receipt");
  if (runtime && runtimeInputs.admittedSnapshot !== nativeReceiptHash(chain.admittedSnapshot.receipt)) bindingError(blockers, "runtimeOrStaticArtifact", "input_hashes.admittedSnapshot does not bind admitted snapshot");
  if (runtime && runtimeInputs.executionReceipt !== nativeReceiptHash(chain.executionTarget.receipt)) bindingError(blockers, "runtimeOrStaticArtifact", "input_hashes.executionReceipt does not bind execution receipt");
  if (runtime && runtimeInputs.deployProfile !== nativeReceiptHash(chain.deployProfile.receipt)) bindingError(blockers, "runtimeOrStaticArtifact", "input_hashes.deployProfile does not bind deploy profile");
  const composition = validateBinding(chain.composition, "composition", validateDynamicDesignComposition, {
    upstreamReceiptId: chain.runtimeOrStaticArtifact.receiptId,
  }, blockers, "ready");
  if (composition && runtime && !chain.composition.receipt.evidenceRefs.some((ref) => ref.id === chain.runtimeOrStaticArtifact.id && ref.receiptId === chain.runtimeOrStaticArtifact.receiptId && ref.contentHash === chain.runtimeOrStaticArtifact.contentHash)) bindingError(blockers, "composition", "evidenceRefs do not bind the runtime artifact");
  const capture = validateBinding(chain.capture, "capture", validateEvidenceReceipt, {
    evidenceRoot: options.evidenceRoot,
    requireFiles: true,
    expectedExecutionReceiptId: chain.executionTarget.receipt.id,
    expectedExecutionPlanSha256: chain.executionTarget.receipt.executionPlanSha256,
    expectedCompositionReceiptId: chain.composition.receipt.id,
    expectedCompositionReceiptHash: nativeReceiptHash(chain.composition.receipt),
    upstreamReceiptId: chain.executionTarget.receiptId,
    expectedSourceAdmissionReceiptId: chain.sourceAdmission.receipt.receiptId,
    expectedSourceContentHash: chain.source.contentHash,
    expectedRouteId: chain.executionTarget.receipt.routeId,
    expectedToolchainPlanSha256: chain.executionTarget.receipt.toolchainPlanSha256,
  }, blockers, "complete");
  const gate = validateBinding(chain.existingGateReceipt, "existingGateReceipt", validateGateNative, {
    upstreamReceiptId: chain.capture.receiptId,
  }, blockers, "passed");
  if (gate && chain.existingGateReceipt.receipt.captureId !== chain.capture.receipt.id) bindingError(blockers, "existingGateReceipt", "captureId does not bind the native capture receipt");
  const finalArtifact = validateBinding(chain.finalArtifact, "finalArtifact", validateArtifactMetadata, {
    changeRoot: options.artifactRoot,
    requireFile: true,
    checkHash: true,
    upstreamReceiptId: chain.existingGateReceipt.receiptId,
  }, blockers, "ready");
  const finalInputs = chain.finalArtifact.receipt.input_hashes || {};
  if (finalArtifact && finalInputs.source !== `sha256:${source.contentHash}`) bindingError(blockers, "finalArtifact", "input_hashes.source does not bind source contentHash");
  if (finalArtifact && runtime && finalInputs.runtime !== chain.runtimeOrStaticArtifact.receipt.artifact_hash) bindingError(blockers, "finalArtifact", "input_hashes.runtime does not bind runtime artifact hash");
  if (finalArtifact && composition && finalInputs.composition !== nativeReceiptHash(chain.composition.receipt)) bindingError(blockers, "finalArtifact", "input_hashes.composition does not bind composition hash");
  if (finalArtifact && capture && finalInputs.capture !== nativeReceiptHash(chain.capture.receipt)) bindingError(blockers, "finalArtifact", "input_hashes.capture does not bind capture hash");
  if (finalArtifact && gate && finalInputs.gate !== nativeReceiptHash(chain.existingGateReceipt.receipt)) bindingError(blockers, "finalArtifact", "input_hashes.gate does not bind gate hash");
  return blockers.length ? { status: "blocked", blockers, references: chain } : { status: "passed", validation: "validated", references: chain };
}

function adaptEvidenceChain(receipts, options = {}) {
  return validateEvidenceChain(receipts, options);
}

module.exports = {
  FIXED_STEP_FPS,
  INPUT_TRACE_SCHEMA,
  INPUT_TYPES,
  METRIC_KEYS,
  PROBE_SCHEMA,
  REAL_INPUT_EVIDENCE_SCHEMA,
  adaptEvidenceChain,
  createInputTrace,
  evaluateInputOracle,
  evaluatePerformanceBudget,
  evaluateReducedMotion,
  evaluateTransitionOracle,
  observeBrowserRenderer,
  probeAuthoredTime,
  probeLifecycle,
  replayDeterministicInputs,
  replayRealBrowserInputs,
  sampleFixedSteps,
  validateEvidenceChain,
  validateInputTrace,
};
