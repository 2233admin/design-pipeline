"use strict";

// `verify interaction`: the probe-document contract and the measurement behind the gate. A probe
// says what an interaction should do; a recording (one sample per animation frame, captured in a
// real browser) says what it did. `evaluateSamples` joins the two and is deliberately pure -- no
// filesystem, no browser, no clock -- so every threshold below is testable without Chrome.

const { assertEnum, assertKeys, assertObject, assertString, fail } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.interaction-probe.v1";
const RESULT_SCHEMA = "design-pipeline.interaction-result.v1";
const SCOPE = "interaction probe";
const INPUT_KINDS = ["pointer-sweep", "wheel", "click"];
const RESPONSES = ["spring", "linear", "stepped"];
const PHASES = ["pre", "input", "post"];
const EXPECT_KEYS = ["responds", "settleWithinMs", "returnsToRest", "response"];
const BOX_KEYS = ["x", "y", "width", "height"];
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const DEFAULT_SETTLE_MS = 1200;
const MAX_VIEWPORT_PX = 4096;
const MAX_DURATION_MS = 5000;

// Thresholds from the probe contract. A frame that moves the centre by no more than 0.5 px counts
// as at rest; the final box may sit 1 px from the pre-input box; opacity has moved once it differs
// by more than 0.01; a spring counts as overshooting once it passes its final value by 2% of the
// travel. They are the contract, not tuning knobs.
const MOVE_EPS_PX = 0.5;
const REST_TOLERANCE_PX = 1;
const OPACITY_EPS = 0.01;
const OVERSHOOT_RATIO = 0.02;
const MAX_LISTED_URLS = 20;
// A recording shorter than this cannot carry a pre/input/post story at all: the harness failed.
const MIN_SAMPLES = 5;

// One concrete repair per finding, in the shape film-hints.cjs uses: the agent reading a gate
// result should know what to change without opening the reference first.
const HINTS = {
  "dead-interaction": "Wire the input to the target: check that the selector names the element that actually animates, that its listener is attached, and that nothing (pointer-events: none, an overlay) swallows the input. If opacity-only is reported alongside it, the listener already works and that finding is the one to act on.",
  "no-settle": "Let the motion end: damp the spring harder (dampingRatio toward 1) or shorten the animation so it reaches rest inside settleWithinMs, and raise settleWithinMs only if the long settle is the intended feel.",
  "rest-drift": "Send the element back to the box it started in: reset the transform to its rest value when the input ends instead of leaving the last pointer offset applied.",
  "linear-response": "Give the motion a spring shape: accelerate into it and decelerate out with a small overshoot (the spring-settle primitive, or an ease that is not constant speed), or set expect.response to linear or stepped if constant-speed motion is the intent.",
  "opacity-only": "Move the element, not only its opacity: animate transform (translate, scale, rotate) so the interaction has a physical response, or set expect.responds to false if a fade really is the whole interaction.",
  "external-request": "Serve every listed resource from the page's own origin: vendor the fonts, scripts and images next to the page so the probe runs with no network, or point the probe at the origin that already serves them.",
};

// ---------- probe document ----------

const HTTP_URL = /^https?:\/\//i;
const URL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const WINDOWS_DRIVE = /^[a-zA-Z]:[\\/]/;

function numberBetween(value, label, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail(SCOPE, `${label} must be a number between ${min} and ${max}`);
}

function boolean(value, label) {
  if (typeof value !== "boolean") fail(SCOPE, `${label} must be true or false`);
}

function point(value, label) {
  const ok = Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry >= 0);
  if (!ok) fail(SCOPE, `${label} must be [x, y] with two finite numbers of at least 0`);
}

// An http(s) page URL is used as is; anything else is a path resolved against the probe file's
// directory, so it may not be absolute and may not climb out of that directory.
function validateUrl(url) {
  assertString(url, "url", SCOPE);
  const raw = url.trim();
  if (HTTP_URL.test(raw)) return;
  if (URL_SCHEME.test(raw) || WINDOWS_DRIVE.test(raw) || raw.startsWith("/") || raw.startsWith("\\")) {
    fail(SCOPE, "url must be an http(s) URL or a path relative to the probe file");
  }
  let depth = 0;
  for (const part of raw.split(/[\\/]+/)) {
    if (part === "" || part === ".") continue;
    depth += part === ".." ? -1 : 1;
    if (depth < 0) fail(SCOPE, "url must not escape the probe file's directory");
  }
}

function validateViewport(viewport) {
  assertKeys(viewport, ["width", "height"], ["width", "height"], "viewport", SCOPE);
  for (const key of ["width", "height"]) {
    const value = viewport[key];
    if (!Number.isInteger(value) || value <= 0 || value > MAX_VIEWPORT_PX) fail(SCOPE, `viewport.${key} must be a positive integer of at most ${MAX_VIEWPORT_PX}`);
  }
  return { width: viewport.width, height: viewport.height };
}

function validateInput(input, label) {
  assertKeys(input, ["kind"], ["kind", "from", "to", "durationMs", "deltaY", "steps", "intervalMs", "at"], label, SCOPE);
  assertEnum(input.kind, INPUT_KINDS, `${label}.kind`, SCOPE);
  if (input.kind === "pointer-sweep") {
    assertKeys(input, ["kind", "from", "to", "durationMs"], ["kind", "from", "to", "durationMs"], label, SCOPE);
    point(input.from, `${label}.from`);
    point(input.to, `${label}.to`);
    numberBetween(input.durationMs, `${label}.durationMs`, 1, MAX_DURATION_MS);
    return;
  }
  if (input.kind === "wheel") {
    assertKeys(input, ["kind", "deltaY", "steps", "intervalMs"], ["kind", "deltaY", "steps", "intervalMs"], label, SCOPE);
    if (typeof input.deltaY !== "number" || !Number.isFinite(input.deltaY)) fail(SCOPE, `${label}.deltaY must be a finite number`);
    if (!Number.isInteger(input.steps) || input.steps < 1 || input.steps > 600) fail(SCOPE, `${label}.steps must be an integer between 1 and 600`);
    numberBetween(input.intervalMs, `${label}.intervalMs`, 1, 1000);
    // A wheel gesture is bounded like a pointer sweep's durationMs. Without this, steps x intervalMs
    // reaches ten minutes, which no capture can deliver: the CLI kills the capture kernel at 60 s,
    // so such a probe is contract-valid and yet can only ever produce a kernel error.
    const wheelMs = input.steps * input.intervalMs;
    if (wheelMs > MAX_DURATION_MS) fail(SCOPE, `${label} turns the wheel for ${wheelMs} ms (steps x intervalMs); the limit is ${MAX_DURATION_MS} ms, the same budget a pointer sweep has`);
    return;
  }
  assertKeys(input, ["kind", "at"], ["kind", "at"], label, SCOPE);
  point(input.at, `${label}.at`);
}

// Returns the expectation with its defaults applied, so `evaluateSamples` never re-applies them.
function validateExpect(expectation, label) {
  assertKeys(expectation, [], EXPECT_KEYS, label, SCOPE);
  if (expectation.responds !== undefined) boolean(expectation.responds, `${label}.responds`);
  if (expectation.returnsToRest !== undefined) boolean(expectation.returnsToRest, `${label}.returnsToRest`);
  if (expectation.settleWithinMs !== undefined) numberBetween(expectation.settleWithinMs, `${label}.settleWithinMs`, 1, MAX_DURATION_MS);
  if (expectation.response !== undefined) assertEnum(expectation.response, RESPONSES, `${label}.response`, SCOPE);
  return {
    ...expectation,
    responds: expectation.responds ?? true,
    settleWithinMs: expectation.settleWithinMs ?? DEFAULT_SETTLE_MS,
    returnsToRest: expectation.returnsToRest ?? false,
  };
}

function validateProbeFile(doc) {
  assertKeys(doc, ["schema", "id", "url", "probes"], ["schema", "id", "url", "probes", "viewport"], "probe file", SCOPE);
  if (doc.schema !== SCHEMA) fail(SCOPE, `schema must be ${SCHEMA}`);
  assertString(doc.id, "id", SCOPE);
  validateUrl(doc.url);
  const viewport = doc.viewport === undefined ? { ...DEFAULT_VIEWPORT } : validateViewport(doc.viewport);
  if (!Array.isArray(doc.probes) || doc.probes.length === 0) fail(SCOPE, "probes must be a non-empty array");
  const ids = new Set();
  const probes = doc.probes.map((probe, index) => {
    const label = `probes[${index}]`;
    assertKeys(probe, ["id", "target", "input", "expect"], ["id", "target", "input", "expect"], label, SCOPE);
    assertString(probe.id, `${label}.id`, SCOPE);
    if (ids.has(probe.id)) fail(SCOPE, `${label} duplicates probe id ${probe.id}`);
    ids.add(probe.id);
    assertString(probe.target, `${label}.target`, SCOPE);
    validateInput(probe.input, `${label}.input`);
    return { ...probe, expect: validateExpect(probe.expect, `${label}.expect`) };
  });
  return { ...doc, viewport, probes };
}

// ---------- measurement ----------

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function px(value) {
  return value.toFixed(2);
}

function span(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return max - min;
}

function readSamples(samples, probeId) {
  if (!Array.isArray(samples) || samples.length === 0) fail(SCOPE, `probe ${probeId} recorded no samples`);
  if (samples.length < MIN_SAMPLES) fail(SCOPE, `probe ${probeId} recorded only ${samples.length} samples; a recording with fewer than ${MIN_SAMPLES} frames cannot be measured, so the capture harness failed`);
  return samples.map((sample, index) => {
    const label = `probe ${probeId} samples[${index}]`;
    assertObject(sample, label, SCOPE);
    if (typeof sample.t !== "number" || !Number.isFinite(sample.t)) fail(SCOPE, `${label}.t must be a finite number`);
    if (sample.phase !== undefined) assertEnum(sample.phase, PHASES, `${label}.phase`, SCOPE);
    assertObject(sample.box, `${label}.box`, SCOPE);
    for (const key of BOX_KEYS) {
      if (typeof sample.box[key] !== "number" || !Number.isFinite(sample.box[key])) fail(SCOPE, `${label}.box.${key} must be a finite number`);
    }
    return {
      t: sample.t,
      phase: sample.phase ?? "pre",
      box: { x: sample.box.x, y: sample.box.y, width: sample.box.width, height: sample.box.height },
      transform: typeof sample.transform === "string" ? sample.transform : "none",
      opacity: typeof sample.opacity === "number" && Number.isFinite(sample.opacity) ? sample.opacity : 1,
    };
  });
}

function lastIndexOfPhase(frames, phase) {
  for (let index = frames.length - 1; index >= 0; index -= 1) if (frames[index].phase === phase) return index;
  return -1;
}

// The speed profile is measured over the moving part of the recording: the capture always brackets
// the interaction with still frames (200 ms of "pre", then the settle tail), and those would
// otherwise put the peak in the interior for every motion, including a constant-speed one. Speed
// itself is displacement over elapsed time, never per frame index: real frame spacing is uneven.
function movingSpeeds(steps) {
  let first = 0;
  while (first < steps.length && steps[first].displacement <= MOVE_EPS_PX) first += 1;
  let last = steps.length - 1;
  while (last >= first && steps[last].displacement <= MOVE_EPS_PX) last -= 1;
  return steps.slice(first, last + 1).map((step) => (step.dt > 0 ? step.displacement / step.dt : 0));
}

function peaksInInterior(speeds) {
  if (speeds.length < 3) return false;
  let peak = 0;
  for (let index = 1; index < speeds.length; index += 1) if (speeds[index] > speeds[peak]) peak = index;
  return peak > 0 && peak < speeds.length - 1;
}

// `data:`, `blob:` and `about:` are not network fetches from another origin, so they never count as
// external. Everything else is compared by origin, favicons included: a favicon pulled from another
// origin is exactly the remote runtime dependency this gate exists to catch.
function externalUrls(requests, pageOrigin) {
  if (!pageOrigin || !Array.isArray(requests)) return [];
  const seen = new Set();
  const external = [];
  for (const request of requests) {
    if (typeof request !== "string" || !request.trim()) continue;
    const url = request.trim();
    if (/^(?:data|blob|about):/i.test(url)) continue;
    let origin = null;
    try {
      origin = new URL(url).origin;
    } catch {
      origin = null;
    }
    const outside = pageOrigin === "file:" ? !/^file:/i.test(url) : origin !== pageOrigin;
    if (!outside || seen.has(url)) continue;
    seen.add(url);
    external.push(url);
  }
  return external;
}

// Pure: one normalized probe (optionally carrying `pageOrigin` from the capture), the frames the
// recorder produced, and the request URLs the page made. No I/O, so the gate's arithmetic can be
// unit-tested with synthetic recordings.
function evaluateSamples(probe, samples, requests = []) {
  assertObject(probe, "probe", SCOPE);
  const expectation = probe.expect ?? {};
  const responds = expectation.responds ?? true;
  const settleWithinMs = expectation.settleWithinMs ?? DEFAULT_SETTLE_MS;
  const returnsToRest = expectation.returnsToRest ?? false;
  const frames = readSamples(samples, probe.id);
  const centres = frames.map((frame) => ({ x: frame.box.x + frame.box.width / 2, y: frame.box.y + frame.box.height / 2 }));
  const last = frames.length - 1;

  // Rest reference: the last frame before the input started; a recording without "pre" frames
  // falls back to its own first frame.
  const restIndex = Math.max(lastIndexOfPhase(frames, "pre"), 0);
  const inputEnd = lastIndexOfPhase(frames, "input");
  const inputEndMs = frames[inputEnd >= 0 ? inputEnd : restIndex].t;

  const mainAxis = span(centres.map((centre) => centre.y)) > span(centres.map((centre) => centre.x)) ? "y" : "x";
  const positions = centres.map((centre) => centre[mainAxis]);
  const restPosition = positions[restIndex];
  const finalPosition = positions[last];
  const travel = finalPosition - restPosition;
  const travelPx = Math.abs(travel);
  const direction = Math.sign(travel);

  const deltas = centres.map((centre, index) => (index === 0 ? 0 : Math.hypot(centre.x - centres[index - 1].x, centre.y - centres[index - 1].y)));
  const steps = positions.slice(1).map((position, index) => ({ displacement: Math.abs(position - positions[index]), dt: frames[index + 1].t - frames[index].t }));

  let peakDisplacementPx = 0;
  let overshootPx = 0;
  let maxFrameDeltaPx = 0;
  let opacityDeltaMax = 0;
  for (let index = 0; index < frames.length; index += 1) {
    peakDisplacementPx = Math.max(peakDisplacementPx, Math.abs(positions[index] - restPosition));
    overshootPx = Math.max(overshootPx, direction * (positions[index] - finalPosition));
    maxFrameDeltaPx = Math.max(maxFrameDeltaPx, deltas[index]);
    opacityDeltaMax = Math.max(opacityDeltaMax, Math.abs(frames[index].opacity - frames[0].opacity));
  }

  // Settle: the earliest post-input frame from which no later frame moves more than 0.5 px.
  let settleIndex = -1;
  for (let index = last; index >= 1; index -= 1) {
    if (deltas[index] > MOVE_EPS_PX) break;
    if (frames[index].phase === "post") settleIndex = index;
  }
  const settleMs = settleIndex >= 0 ? frames[settleIndex].t - inputEndMs : null;

  // The recording is supposed to end at the deadline; a recording that stops short (navigation,
  // a closed target, a harness timeout) must never read as "it settled".
  const deadlineMs = inputEndMs + settleWithinMs;
  if (frames[last].t < deadlineMs) {
    fail(SCOPE, `probe ${probe.id} stopped recording at ${round(frames[last].t)} ms, before the ${round(deadlineMs)} ms settle deadline; the recording is truncated and cannot show whether the motion settled`);
  }

  // Movement "at the deadline" is the step that lands on or crosses it — the capture's last frame is
  // the first one at or after the deadline, so stopping one step earlier would judge the motion a
  // frame too soon and pass a target that is still travelling when the budget runs out.
  let deadlineDelta = deltas[1];
  for (let index = 1; index < frames.length; index += 1) {
    deadlineDelta = deltas[index];
    if (frames[index].t >= deadlineMs) break;
  }

  const restDriftPx = Math.max(...BOX_KEYS.map((key) => Math.abs(frames[last].box[key] - frames[restIndex].box[key])));
  const boxChanged = BOX_KEYS.some((key) => span(frames.map((frame) => frame.box[key])) > MOVE_EPS_PX);
  const transformChanged = frames.some((frame) => frame.transform !== frames[0].transform);

  const metrics = {
    frames: frames.length,
    durationMs: round(frames[last].t - frames[0].t),
    mainAxis,
    travelPx: round(travelPx),
    peakDisplacementPx: round(peakDisplacementPx),
    overshootPx: round(Math.max(overshootPx, 0)),
    overshootRatio: travelPx > 0 ? round(Math.max(overshootPx, 0) / travelPx) : 0,
    settleMs: settleMs === null ? null : round(settleMs),
    restDriftPx: round(restDriftPx),
    maxFrameDeltaPx: round(maxFrameDeltaPx),
    opacityDeltaMax: round(opacityDeltaMax),
    transformChanged,
    boxChanged,
  };

  const findings = [];
  const add = (code, severity, message, extra = {}) => findings.push({ code, severity, message, fix: HINTS[code], ...extra });

  if (responds && !boxChanged && !transformChanged) {
    add("dead-interaction", "error", `${probe.target ?? "the target"} never responded: across ${frames.length} frames its own box stayed within ${MOVE_EPS_PX} px and its computed transform never changed (only this element is measured, so motion on a descendant does not count)`);
  }
  if (deadlineDelta > MOVE_EPS_PX) {
    add("no-settle", "error", `still moving ${px(deadlineDelta)} px per frame at the ${settleWithinMs} ms settle deadline (limit ${MOVE_EPS_PX} px per frame)`);
  } else if (settleMs !== null && settleMs > settleWithinMs) {
    add("no-settle", "error", `came to rest only ${px(settleMs)} ms after the input, past the ${settleWithinMs} ms budget`);
  }
  if (returnsToRest && restDriftPx > REST_TOLERANCE_PX) {
    add("rest-drift", "error", `the final box sits ${px(restDriftPx)} px from the pre-input box (limit ${REST_TOLERANCE_PX} px)`);
  }
  if (expectation.response === "spring") {
    const moving = movingSpeeds(steps);
    const springLike = (travelPx > 0 && overshootPx > OVERSHOOT_RATIO * travelPx) || peaksInInterior(moving);
    if (moving.length > 0 && !springLike) {
      const shape = moving.length < 3 ? "the motion happens in a single step" : "peak speed sits at the first or last moving frame instead of rising and falling";
      add("linear-response", "warning", `expected a spring: overshoot is ${px(Math.max(overshootPx, 0))} px of ${px(travelPx)} px travel (needs more than ${OVERSHOOT_RATIO * 100}%) and ${shape}`);
    }
  }
  if (opacityDeltaMax > OPACITY_EPS && !boxChanged && !transformChanged) {
    add("opacity-only", "error", `only opacity responded (by ${opacityDeltaMax.toFixed(3)}); the box stayed within ${MOVE_EPS_PX} px and the computed transform never changed`);
  }
  const external = externalUrls(requests, probe.pageOrigin);
  if (external.length) {
    add("external-request", "error", `${external.length} request${external.length === 1 ? "" : "s"} went outside the page origin ${probe.pageOrigin}`, { urls: external.slice(0, MAX_LISTED_URLS) });
  }

  return {
    id: probe.id,
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "passed",
    metrics,
    findings,
  };
}

// ---------- result document ----------

function evaluateProbeFile(doc, capture) {
  const normalized = validateProbeFile(doc);
  assertObject(capture, "capture", SCOPE);
  if (!Array.isArray(capture.probes)) fail(SCOPE, "capture.probes must be an array");
  const recorded = new Map();
  for (const entry of capture.probes) {
    if (entry !== null && typeof entry === "object" && typeof entry.id === "string") recorded.set(entry.id, entry);
  }
  const probes = normalized.probes.map((probe) => {
    const shot = recorded.get(probe.id);
    if (!shot) fail(SCOPE, `capture is missing probe ${probe.id}`);
    const result = evaluateSamples({ ...probe, pageOrigin: capture.pageOrigin }, shot.samples, shot.requests ?? []);
    const samples = shot.samples;
    return {
      id: result.id,
      status: result.status,
      metrics: result.metrics,
      samples: { count: samples.length, firstMs: samples[0].t, lastMs: samples[samples.length - 1].t },
      findings: result.findings,
    };
  });
  return {
    schema: RESULT_SCHEMA,
    id: normalized.id,
    url: normalized.url,
    status: probes.some((probe) => probe.status === "failed") ? "failed" : "passed",
    probes,
    findings: probes.flatMap((probe) => probe.findings.map((finding) => ({ probeId: probe.id, ...finding }))),
  };
}

module.exports = { SCHEMA, RESULT_SCHEMA, HINTS, validateProbeFile, evaluateSamples, evaluateProbeFile };
