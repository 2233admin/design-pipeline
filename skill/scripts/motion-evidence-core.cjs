"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertKeys, assertString, assertStringArray, fail, pathInside } = require("./contract-utils.cjs");
const {
  validateAnimationJob,
  validateMotionGraph,
  validateLifecycleAdapter,
  validatePerformanceBudgets,
  validateDeterministicInputs,
} = require("./motion-foundation-core.cjs");

const MOTION_SCHEMA = "design-pipeline.motion-verification.v1";
const MATRIX_SCHEMA = "design-pipeline.component-state-matrix.v1";
const REQUIRED_STATES = ["hover", "focus", "pressed", "disabled", "loading", "empty", "error"];

function finiteNonNegative(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail("motion evidence", `${label} must be non-negative number`);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function evaluateMotion(receipt) {
  const keys = ["schema", "id", "primitiveId", "trigger", "purpose", "durationMs", "toleranceMs", "observedDurationMs", "frameCadenceMs", "interruption", "reducedMotion", "longFrames", "maxLongFrameMs", "captureId", "deterministic"];
  const optionalKeys = ["animationJob", "motionGraph", "deterministicInputs", "performanceBudgets", "lifecycleAdapter", "sampledFrames"];
  assertKeys(receipt, keys, [...keys, ...optionalKeys], "receipt", "motion evidence");
  if (receipt.schema !== MOTION_SCHEMA) fail("motion evidence", `schema must be ${MOTION_SCHEMA}`);
  for (const key of ["id", "primitiveId", "trigger", "purpose", "interruption", "reducedMotion", "captureId"]) assertString(receipt[key], key, "motion evidence");
  for (const key of ["durationMs", "toleranceMs", "observedDurationMs", "frameCadenceMs", "maxLongFrameMs"]) finiteNonNegative(receipt[key], key);
  if (receipt.deterministic !== true) fail("motion evidence", "deterministic must be true");
  if (/decorative only|decoration only/i.test(receipt.purpose)) fail("motion evidence", "motion purpose must communicate state, hierarchy, continuity, or feedback");
  if (/^(?:none|missing|unknown)$/i.test(receipt.reducedMotion)) fail("motion evidence", "motion reducedMotion substitute is required");
  if (Math.abs(receipt.observedDurationMs - receipt.durationMs) > receipt.toleranceMs) fail("motion evidence", "observed duration exceeds tolerance");
  if (!Array.isArray(receipt.longFrames)) fail("motion evidence", "longFrames must be an array");
  receipt.longFrames.forEach((frame, index) => {
    assertKeys(frame, ["atMs", "durationMs"], ["atMs", "durationMs"], `longFrames[${index}]`, "motion evidence");
    finiteNonNegative(frame.atMs, `longFrames[${index}].atMs`);
    finiteNonNegative(frame.durationMs, `longFrames[${index}].durationMs`);
    if (frame.durationMs > receipt.maxLongFrameMs) fail("motion evidence", `longFrames[${index}] exceeds budget`);
  });
  const animationJob = receipt.animationJob;
  if (animationJob !== undefined) validateAnimationJob(animationJob);
  const effectiveGraph = animationJob ? animationJob.motionGraph : receipt.motionGraph;
  if (receipt.motionGraph !== undefined) validateMotionGraph(receipt.motionGraph);
  if (effectiveGraph !== undefined && receipt.motionGraph !== undefined && canonicalJson(effectiveGraph) !== canonicalJson(receipt.motionGraph)) fail("motion evidence", "animationJob and motionGraph bindings do not agree");
  if (effectiveGraph !== undefined) validateMotionGraph(effectiveGraph);
  if (receipt.deterministicInputs !== undefined) {
    validateDeterministicInputs(receipt.deterministicInputs);
    if (animationJob && canonicalJson(receipt.deterministicInputs) !== canonicalJson(animationJob.deterministic)) fail("motion evidence", "deterministicInputs do not match animationJob");
  }
  if (receipt.performanceBudgets !== undefined) {
    validatePerformanceBudgets(receipt.performanceBudgets);
    if (animationJob && canonicalJson(receipt.performanceBudgets) !== canonicalJson(animationJob.budgets)) fail("motion evidence", "performanceBudgets do not match animationJob");
  }
  if (receipt.lifecycleAdapter !== undefined) {
    const lifecycleContract = receipt.lifecycleAdapter.contract || receipt.lifecycleAdapter;
    validateLifecycleAdapter(lifecycleContract);
    if (animationJob && canonicalJson(lifecycleContract) !== canonicalJson(animationJob.lifecycle)) fail("motion evidence", "lifecycleAdapter does not match animationJob");
  }
  if (receipt.sampledFrames !== undefined) {
    if (!Array.isArray(receipt.sampledFrames) || receipt.sampledFrames.length === 0) fail("motion evidence", "sampledFrames must not be empty");
    let previous = -1;
    receipt.sampledFrames.forEach((frame, index) => {
      const label = `sampledFrames[${index}]`;
      assertKeys(frame, ["timeMs", "stateHash"], ["timeMs", "stateHash"], label, "motion evidence");
      finiteNonNegative(frame.timeMs, `${label}.timeMs`);
      assertString(frame.stateHash, `${label}.stateHash`, "motion evidence");
      if (frame.timeMs < previous) fail("motion evidence", "sampledFrames must be monotonic by authored time");
      previous = frame.timeMs;
      if (effectiveGraph && frame.timeMs > effectiveGraph.durationMs) fail("motion evidence", `${label}.timeMs exceeds motion graph duration`);
    });
  }
  return { status: "passed", receipt };
}
function checkComponentMatrix(matrix, options = {}) {
  assertKeys(matrix, ["schema", "id", "entries"], ["schema", "id", "entries"], "matrix", "component states");
  if (matrix.schema !== MATRIX_SCHEMA) fail("component states", `schema must be ${MATRIX_SCHEMA}`);
  assertString(matrix.id, "id", "component states");
  if (!Array.isArray(matrix.entries) || matrix.entries.length === 0) fail("component states", "entries must not be empty");
  const evidenceRoot = options.evidenceRoot ? fs.realpathSync(path.resolve(options.evidenceRoot)) : null;
  matrix.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;
    const keys = ["component", "variant", "states", "inputs", "viewports", "reducedMotion", "evidence"];
    assertKeys(entry, keys, keys, label, "component states");
    assertString(entry.component, `${label}.component`, "component states");
    assertString(entry.variant, `${label}.variant`, "component states");
    assertStringArray(entry.states, `${label}.states`, "component states", { unique: true });
    for (const state of REQUIRED_STATES) if (!entry.states.includes(state)) fail("component states", `${label} is missing ${state}`);
    assertStringArray(entry.inputs, `${label}.inputs`, "component states", { unique: true });
    for (const input of ["keyboard", "touch"]) if (!entry.inputs.includes(input)) fail("component states", `${label} is missing ${input} input`);
    assertStringArray(entry.viewports, `${label}.viewports`, "component states", { unique: true });
    for (const viewport of ["mobile", "desktop"]) if (!entry.viewports.includes(viewport)) fail("component states", `${label} is missing ${viewport} viewport`);
    assertString(entry.reducedMotion, `${label}.reducedMotion`, "component states");
    if (/^(?:none|missing|unknown)$/i.test(entry.reducedMotion)) fail("component states", `${label}.reducedMotion requires a substitute`);
    assertStringArray(entry.evidence, `${label}.evidence`, "component states", { min: 1, unique: true });
    if (evidenceRoot) for (const evidence of entry.evidence) {
      const target = path.resolve(evidenceRoot, evidence);
      if (!pathInside(evidenceRoot, target) || (options.requireFiles && !fs.existsSync(target))) fail("component states", `${label} has dangling evidence ${evidence}`);
    }
  });
  return { status: "passed", matrix };
}

module.exports = { MATRIX_SCHEMA, MOTION_SCHEMA, REQUIRED_STATES, checkComponentMatrix, evaluateMotion };
