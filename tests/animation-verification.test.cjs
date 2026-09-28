"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  INPUT_TRACE_SCHEMA,
  FIXED_STEP_FPS,
  adaptEvidenceChain,
  evaluateInputOracle,
  evaluatePerformanceBudget,
  evaluateReducedMotion,
  evaluateTransitionOracle,
  probeAuthoredTime,
  probeLifecycle,
  replayDeterministicInputs,
  sampleFixedSteps,
  validateEvidenceChain,
} = require("../skill/scripts/animation-verification-core.cjs");
const { ANIMATION_JOB_SCHEMA, LIFECYCLE_ADAPTER_SCHEMA, MOTION_GRAPH_SCHEMA, createAnimationJob, createLifecycleAdapter } = require("../skill/scripts/motion-foundation-core.cjs");

function createBudgetJob(budgets) {
  const lifecycle = createLifecycleAdapter({
    schema: LIFECYCLE_ADAPTER_SCHEMA,
    id: "budget-lifecycle",
    renderer: "dom",
    handlers: { init() {}, resize() {}, update() {}, render() {}, dispose() {} },
    ownership: { owner: "budget-job", resources: [{ id: "frame-loop", kind: "frame-loop", owner: "budget-job", disposable: true }] },
    containment: { root: "#root", boundary: "job-owned" },
    cleanup: { observable: true, checks: ["frame loop released"] },
  });
  return createAnimationJob({
    schema: ANIMATION_JOB_SCHEMA,
    id: "budget-job",
    motionGraph: { schema: MOTION_GRAPH_SCHEMA, id: "budget-graph", durationMs: 1000, tracks: [{ id: "progress", subject: "subject", property: "progress", from: 0, to: 1, startMs: 0, durationMs: 1000 }], responses: [], semanticCarrier: "subject", reducedMotion: { mode: "resting-state", description: "show resting state" } },
    deterministic: { seed: 1, input: { mode: "preview" }, viewport: { width: 800, height: 600 }, dpr: 1, reducedMotion: false },
    mechanism: { purpose: "continuity", subject: "subject", channels: ["progress"] },
    skin: { tokens: { accent: "blue" } },
    renderer: { kind: "dom", adapterId: "budget-lifecycle" },
    lifecycle: lifecycle.contract,
    budgets,
    lifecycleAdapter: lifecycle,
  });
}
const { createAnimationFixture, createAnimationFixtures, createReceiptChainFixture } = require("./fixtures/animation-verification-fixture.cjs");

test("synthetic mechanisms pass authored-time seek, settle, reset, and fixed-step sampling", () => {
  for (const fixture of createAnimationFixtures()) {
    const authored = probeAuthoredTime(fixture, { durationMs: fixture.durationMs });
    assert.equal(authored.status, "passed", fixture.spec.id);
    for (const fps of FIXED_STEP_FPS) {
      fixture.reset();
      const sampled = sampleFixedSteps(fixture, { durationMs: fixture.durationMs, fps });
      assert.equal(sampled.deterministic, true);
      assert.equal(sampled.times[0], 0);
      assert.equal(sampled.times.at(-1), fixture.durationMs);
      assert.equal(sampled.states.length, sampled.times.length);
    }
  }
});

test("authored probes block when a repeated reset changes sampled state", () => {
  const fixture = createAnimationFixture("latch-paper");
  const reset = fixture.reset.bind(fixture);
  let resetCount = 0;
  fixture.reset = () => {
    const result = reset();
    resetCount += 1;
    fixture.state.resetCount = resetCount;
    return result;
  };
  assert.equal(sampleFixedSteps(fixture, { durationMs: fixture.durationMs, fps: 30 }).status, "blocked");
  assert.equal(probeAuthoredTime(fixture, { durationMs: fixture.durationMs }).status, "blocked");
});

test("versioned input trace envelope replays strict touch, keyboard, and drag events", () => {
  const events = [
    { type: "pointer", action: "down", atMs: 0, x: 10, y: 20 },
    { type: "drag", phase: "start", atMs: 20, x: 20, y: 20 },
    { type: "drag", phase: "move", atMs: 60, x: 60, y: 20 },
    { type: "drag", phase: "end", atMs: 100, x: 80, y: 20 },
    { type: "wheel", atMs: 120, deltaY: 16 },
    { type: "scroll", atMs: 140, deltaY: 24 },
    { type: "keyboard", atMs: 160, key: "Enter" },
    { type: "touch", phase: "start", atMs: 180, x: 80, y: 20 },
    { type: "touch", phase: "end", atMs: 200, x: 80, y: 20 },
  ];
  const trace = { schema: INPUT_TRACE_SCHEMA, version: 1, source: { id: "synthetic-latch", kind: "fixture" }, viewport: { width: 800, height: 600, dpr: 1 }, events };
  const replay = replayDeterministicInputs(createAnimationFixture("latch-paper"), { trace });
  assert.equal(replay.status, "passed");
  assert.equal(replay.trace.schema, INPUT_TRACE_SCHEMA);
  assert.equal(evaluateInputOracle(replay, { requiredTypes: ["pointer", "wheel", "scroll", "drag", "touch"] }).status, "passed");
  assert.throws(() => replayDeterministicInputs(createAnimationFixture(), { trace: { ...trace, events: [{ ...events[1], atMs: 20 }, events[0]] } }), /ordered/);
  assert.throws(() => replayDeterministicInputs(createAnimationFixture(), { trace: { ...trace, events: [{ ...events[6], key: "" }] } }), /key/);
  assert.throws(() => replayDeterministicInputs(createAnimationFixture(), { trace: { ...trace, events: [{ type: "drag", phase: "move", atMs: 0, x: 0, y: 0 }] } }), /drag move/);
  assert.throws(() => replayDeterministicInputs(createAnimationFixture(), { trace: { ...trace, events: [{ type: "drag", phase: "start", atMs: 0, x: 0, y: 0 }, { type: "drag", phase: "move", atMs: 1, x: 1, y: 1 }] } }), /end event/);
});

test("transition oracle fails closed without a metric and checks declared multi-channel vectors", () => {
  const fixture = createAnimationFixture("rail-glass");
  const sampled = sampleFixedSteps(fixture, { durationMs: fixture.durationMs, fps: 30 });
  const fromState = sampled.states[0].state;
  const toState = sampled.states.at(-1).state;
  const missingMetric = evaluateTransitionOracle({ durationMs: fixture.durationMs, fromState, toState, states: sampled.states });
  assert.equal(missingMetric.status, "blocked");
  assert.match(missingMetric.checks.find((check) => check.id === "no-teleport").reason, /metric extractor/);

  const states = sampled.states.map((sample) => ({
    ...sample,
    state: {
      ...sample.state,
      rotation: [sample.state.position / 2, 0],
      scale: [1 + sample.state.position / 4, 1 + sample.state.position / 4],
    },
  }));
  const vectorFrom = states[0].state;
  const vectorTo = states.at(-1).state;
  const channels = [
    { id: "position", path: "position", maxStep: 0.2 },
    { id: "rotation", path: "rotation", maxStep: 0.2 },
    { id: "scale", path: "scale", maxStep: 0.2 },
  ];
  const result = evaluateTransitionOracle({ durationMs: fixture.durationMs, fromState: vectorFrom, toState: vectorTo, states }, { channels });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.checks.map((check) => check.id), ["mid-transition", "state-exit", "no-teleport"]);

  const teleported = states.map((sample) => ({ ...sample, state: { ...sample.state, rotation: sample.timeMs === fixture.durationMs / 2 ? [9, 9] : sample.state.rotation } }));
  const negative = evaluateTransitionOracle({ durationMs: fixture.durationMs, fromState: vectorFrom, toState: vectorTo, states: teleported }, { channels });
  assert.equal(negative.status, "blocked");
  assert.equal(negative.checks.find((check) => check.id === "no-teleport").passed, false);
});

test("reduced-motion oracle accepts a terminal fallback and rejects intermediate motion", () => {
  const fixture = createAnimationFixture("latch-paper");
  const expected = fixture.seek(fixture.durationMs);
  assert.equal(evaluateReducedMotion({ expected, reduced: { prefersReducedMotion: true, state: expected } }).status, "passed");
  assert.equal(evaluateReducedMotion({ expected, reduced: { prefersReducedMotion: true, state: { ...expected, position: 0 }, samples: [{ state: { ...expected, position: 0 } }, { state: expected }] } }).status, "blocked");
});

test("reduced-motion oracle blocks missing expected terminal state", () => {
  const fixture = createAnimationFixture("latch-paper");
  const state = fixture.seek(fixture.durationMs);
  assert.equal(evaluateReducedMotion({ reduced: { prefersReducedMotion: true, state } }).status, "blocked");
});
test("lifecycle oracle requires cleanup and idempotent disposal", () => {
  const result = probeLifecycle(createAnimationFixture("rail-glass"));
  assert.equal(result.status, "passed");
  assert.equal(result.disposed.listeners, 0);
  assert.equal(result.disposedAgain.resources, 0);
});

test("lifecycle oracle integrates init, cleanupStatus, and idempotent adapter disposal", () => {
  const calls = [];
  const adapter = createLifecycleAdapter({
    schema: LIFECYCLE_ADAPTER_SCHEMA,
    id: "verification-lifecycle",
    renderer: "dom",
    handlers: {
      init: () => calls.push("init"),
      resize: () => {},
      update: () => {},
      render: () => {},
      dispose: () => calls.push("dispose"),
    },
    ownership: { owner: "verification", resources: [{ id: "frame-loop", kind: "frame-loop", owner: "verification", disposable: true }] },
    containment: { root: "#root", boundary: "job-owned" },
    cleanup: { observable: true, checks: ["frame loop released"] },
  });
  const result = probeLifecycle(adapter);
  assert.equal(result.status, "passed");
  assert.deepEqual(calls, ["init", "dispose"]);
  assert.equal(result.disposed.disposed, true);
  assert.equal(result.disposed.resources.every((resource) => resource.released), true);
  assert.equal(probeLifecycle({ init() {}, dispose() {} }).status, "blocked");
});

test("performance budget consumes core Animation Job budgets and fails missing or over limits", () => {
  const budgets = {
    object: { applicable: true, max: 10 },
    particle: { applicable: false },
    texture: { applicable: false },
    frame: { applicable: true, maxMs: 24, targetFps: 60, maxLongFrames: 0, maxInputLatencyMs: 8, maxCpuMs: 8 },
  };
  const job = createBudgetJob(budgets);
  const passing = evaluatePerformanceBudget({ samples: [{ durationMs: 16, inputLatencyMs: 4, cpuMs: 3 }, { durationMs: 20, inputLatencyMs: 5, cpuMs: 4 }], budgets: job.contract.budgets });
  assert.equal(passing.status, "passed");
  const failing = evaluatePerformanceBudget({ samples: [{ durationMs: 32, inputLatencyMs: 12, cpuMs: 9 }], budgets: job.contract.budgets });
  assert.equal(failing.status, "blocked");
  const missing = { ...job.contract.budgets, frame: { ...job.contract.budgets.frame, maxLongFrames: undefined } };
  assert.equal(evaluatePerformanceBudget({ samples: [{ durationMs: 16 }], budgets: missing }).status, "blocked");
  assert.equal(evaluatePerformanceBudget({ samples: [{ durationMs: 16 }], budget: { maxLongFrameMs: 24 } }).status, "blocked");
  assert.equal(evaluatePerformanceBudget({ samples: [], budgets: job.contract.budgets }).status, "blocked");
});

test("receipt-chain adapter validates owner-produced native receipts and capture lineage", async () => {
  const chain = await createReceiptChainFixture("latch-paper");
  const adapted = adaptEvidenceChain(chain, chain.validationOptions);
  assert.equal(adapted.status, "passed");
  assert.equal(adapted.validation, "validated");
  assert.equal(adapted.references, chain);
  assert.equal(chain.sourceAdmission.receipt.schema, "design-pipeline.source-admission.v1");
  assert.equal(chain.executionTarget.receipt.schema, "design-pipeline.execution-receipt.v1");
  assert.equal(chain.capture.receipt.schema, "design-pipeline.evidence-receipt.v1");
  assert.equal(chain.capture.receipt.routeId, chain.executionTarget.receipt.routeId);
  assert.equal(chain.capture.receipt.toolchainPlanSha256, chain.executionTarget.receipt.toolchainPlanSha256);
});

test("native receipt-chain validation blocks incomplete and mismatched owner evidence", async () => {
  const chain = await createReceiptChainFixture("latch-paper");
  for (const missing of ["admittedSnapshot", "executionTarget", "existingGateReceipt"]) {
    assert.equal(validateEvidenceChain({ ...chain, [missing]: undefined }, chain.validationOptions).status, "blocked");
  }
  assert.equal(validateEvidenceChain({ ...chain, source: "not-an-object" }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain({ ...chain, source: { ...chain.source, contentHash: "bad-hash" } }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain({ ...chain, admittedSnapshot: { ...chain.admittedSnapshot, receipt: { ...chain.admittedSnapshot.receipt, schema: "wrong-schema" } } }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain({ ...chain, capture: { ...chain.capture, receipt: { ...chain.capture.receipt, toolchainPlanSha256: "f".repeat(64) } } }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain({ ...chain, capture: { ...chain.capture, receipt: { ...chain.capture.receipt, sourceAdmissionReceiptId: "wrong-admission" } } }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain({ ...chain, capture: { ...chain.capture, receipt: { ...chain.capture.receipt, routeId: "wrong-route" } } }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain({ ...chain, admittedSnapshot: { ...chain.admittedSnapshot, receipt: { ...chain.admittedSnapshot.receipt, companionWorkspaceRoot: chain.validationOptions.artifactRoot } } }, chain.validationOptions).status, "blocked");
  assert.equal(validateEvidenceChain(chain, { ...chain.validationOptions, workspaceRoot: chain.validationOptions.artifactRoot }).status, "blocked");
});
test("real browser input adapter replays DOM and Canvas evidence through capture receipt", async (t) => {
  const server = await startFixtureServer("paper");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-real-input-capture-"));
  const output = path.join(root, "evidence");
  const args = [
    captureScript,
    "--project-root", root,
    "--adapter-path", realInputAdapter,
    "--output-root", output,
    "--url", server.url,
    "--width", "640",
    "--height", "480",
    "--execution-receipt-id", "execution-real-input",
    "--execution-plan-sha256", "a".repeat(64),
    "--composition-receipt-id", "composition-real-input",
    "--composition-receipt-hash", "sha256:" + "b".repeat(64),
    "--source-admission-receipt-id", "admission-real-input",
    "--source-content-hash", "c".repeat(64),
    "--route-id", "real-input-route",
    "--toolchain-plan-sha256", "d".repeat(64),
  ];
  try {
    const result = spawnSync(process.execPath, args, { encoding: "utf8", windowsHide: true, timeout: 60000 });
    if (result.status !== 0 && /BROWSER_UNAVAILABLE|WebSocket is unavailable|CDP did not start/.test(result.stderr || result.stdout)) {
      t.skip((result.stderr || result.stdout).trim());
      return;
    }
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const envelope = JSON.parse(result.stdout);
    assert.equal(envelope.ok, true);
    assert.equal(envelope.receipt.status, "complete");
    assert.equal(envelope.receipt.sourceAdmissionReceiptId, "admission-real-input");
    assert.equal(envelope.receipt.routeId, "real-input-route");
    assert.ok(fs.existsSync(path.join(output, "screenshot.png")));
    const trace = JSON.parse(fs.readFileSync(path.join(output, "trace.json"), "utf8"));
    assert.equal(trace.schema, INPUT_TRACE_SCHEMA);
    assert.deepEqual(new Set(trace.events.map((event) => event.type)), new Set(["pointer", "drag", "wheel", "scroll", "keyboard"]));
    const observation = JSON.parse(fs.readFileSync(path.join(output, "renderer-observation.json"), "utf8"));
    assert.equal(observation.status, "passed");
    assert.equal(observation.first.records.some((record) => record.after.dom.transform), true);
    assert.equal(observation.first.records.some((record) => record.after.canvasHash), true);
  } finally {
    await server.close();
  }
});
