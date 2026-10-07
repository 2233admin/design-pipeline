"use strict";

// Every case here is the canonical recording in tests/fixtures/interaction-samples.json with one
// thing changed: a frozen box, a tail that keeps drifting, a constant-speed ramp, uneven frame
// spacing. Building recordings by hand would let the units drift away from what the capture layer
// actually produces, which is the one thing the fixture exists to prevent.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { HINTS, RESULT_SCHEMA, evaluateProbeFile, evaluateSamples, validateProbeFile, journeyResultFailure } = require("../skill/scripts/interaction-core.cjs");

const FIXTURE = path.join(__dirname, "fixtures/interaction-samples.json");
const fixture = () => JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const recording = () => fixture().capture.probes[0].samples;
const codes = (result) => result.findings.map((finding) => finding.code);

// The fixture's own convention: the card sits at x 200 at rest and carries its offset in a matrix.
const moveTo = (sample, x) => ({ ...sample, box: { ...sample.box, x }, transform: `matrix(1, 0, 0, 1, ${x - 200}, 0)` });
const positions = (samples, xs) => samples.map((sample, index) => moveTo(sample, xs[index]));
const freeze = (samples) => samples.map((sample) => ({ ...sample, box: { ...samples[0].box }, transform: samples[0].transform }));

// Re-space the frames without touching what they show: same count, same phases, new timestamps.
function retime(samples, gaps) {
  let t = samples[0].t;
  return samples.map((sample, index) => {
    if (index) t += gaps[index - 1];
    return { ...sample, t };
  });
}

// One normalized probe plus the capture's pageOrigin, exactly as evaluateProbeFile assembles it.
function probeOf(overrides = {}) {
  const doc = validateProbeFile(fixture().document);
  return { ...doc.probes[0], expect: { ...doc.probes[0].expect, ...overrides }, pageOrigin: fixture().capture.pageOrigin };
}

function evaluate(samples, options = {}) {
  const probe = probeOf(options.expect ?? {});
  if (Object.hasOwn(options, "pageOrigin")) probe.pageOrigin = options.pageOrigin;
  return evaluateSamples(probe, samples ?? recording(), options.requests ?? fixture().capture.probes[0].requests);
}

// x path of a 20-frame recording: 3 still frames, 7 input frames walking `xs`, then a held tail.
const walk = (xs) => [200, 200, 200, ...xs, ...Array.from({ length: 10 }, () => xs[xs.length - 1])];
const RAMP = walk([208, 216, 224, 232, 240, 248, 256]); // constant 8 px per frame
const EASE = walk([202, 208, 220, 236, 248, 254, 256]); // 2, 6, 12, 16, 12, 6, 2 px per frame

test("the canonical recording passes and pins the measurement", () => {
  const capture = fixture().capture;
  const result = evaluateSamples(probeOf(), capture.probes[0].samples, capture.probes[0].requests);
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
  assert.equal(result.metrics.mainAxis, "x");
  assert.equal(result.metrics.travelPx, 64);
  assert.ok(Math.abs(result.metrics.overshootPx - 4.9) < 0.01, `overshootPx ${result.metrics.overshootPx}`);
  assert.equal(result.metrics.settleMs, 96);
  assert.equal(result.metrics.restDriftPx, 64);
  assert.equal(result.metrics.frames, 20);
  assert.equal(result.metrics.boxChanged, true);
  assert.equal(result.metrics.transformChanged, true);
});

test("a recording that ends exactly at the settle deadline and is quiet there settles", () => {
  const samples = recording();
  const inputEndMs = samples.filter((sample) => sample.phase === "input").at(-1).t;
  const expectation = fixture().document.probes[0].expect;
  assert.equal(samples.at(-1).t, inputEndMs + expectation.settleWithinMs); // the deadline, no frame beyond it
  assert.deepEqual(codes(evaluate(samples)), []);
});

test("a recording that stops before the deadline is a contract error, not a settle", () => {
  assert.throws(() => evaluate(recording().slice(0, -1)), /truncated|before the 304 ms settle deadline/);
  // Same frames, a longer budget: the recording no longer covers the window it was asked to cover.
  assert.throws(() => evaluate(recording(), { expect: { settleWithinMs: 400 } }), /before the 544 ms settle deadline/);
});

test("a recording too short to measure is a contract error", () => {
  assert.throws(() => evaluate(recording().slice(0, 4)), /fewer than 5 frames/);
  assert.throws(() => evaluate([]), /recorded no samples/);
});

test("a frozen target is a dead interaction and nothing else", () => {
  const result = evaluate(freeze(recording()));
  assert.equal(result.status, "failed");
  assert.deepEqual(codes(result), ["dead-interaction"]); // no spring verdict on a motion that never happened
  assert.equal(result.metrics.boxChanged, false);
  assert.equal(result.metrics.transformChanged, false);
  assert.match(result.findings[0].message, /descendant/); // only the target element is measured
});

test("a tail that keeps moving at the deadline fails to settle; 0.49 px per frame does not", () => {
  const drifting = (step) => recording().map((sample, index) => (index >= 10 ? moveTo(sample, 268.4 + step * (index - 10)) : sample));
  const quiet = evaluate(drifting(0.49));
  assert.deepEqual(codes(quiet), []);
  assert.equal(quiet.metrics.settleMs, 32);

  const moving = evaluate(drifting(0.51));
  assert.deepEqual(codes(moving), ["no-settle"]);
  assert.equal(moving.metrics.settleMs, null);
  assert.match(moving.findings[0].message, /0\.51 px per frame at the 160 ms settle deadline/);
});

test("movement on the frame that crosses the deadline is what counts, not the frame before it", () => {
  // Budget 156 ms puts the deadline at 300 ms, between the 288 ms and 304 ms frames. The capture
  // stops on the first frame at or after the deadline, so 304 ms is the frame that measures the
  // deadline; reading the quiet 288 ms frame instead would report this still-travelling card as
  // settled.
  const samples = recording().map((sample, index, all) => (index === all.length - 1 ? moveTo(sample, 266) : sample));
  const result = evaluate(samples, { expect: { settleWithinMs: 156 } });
  assert.deepEqual(codes(result), ["no-settle"]);
  assert.match(result.findings[0].message, /2\.00 px per frame at the 156 ms settle deadline/);
});

test("a second wobble after a quiet deadline still counts as no-settle", () => {
  // Budget 80 ms: the card is quiet at the 224 ms deadline, moves again, and only comes to rest at
  // 272 ms. The deadline frame alone would call this settled; metrics.settleMs does not.
  const xs = [...recording().slice(0, 10).map((sample) => sample.box.x), 268, 268, 268, 268, 268, 272, 270, 270, 270, 270];
  const result = evaluate(positions(recording(), xs), { expect: { settleWithinMs: 80 } });
  assert.deepEqual(codes(result), ["no-settle"]);
  assert.equal(result.metrics.settleMs, 128);
  assert.match(result.findings[0].message, /past the 80 ms budget/);
});

test("a target that does not come back to rest drifts; 0.99 px of drift does not", () => {
  const drifted = evaluate(recording(), { expect: { returnsToRest: true } });
  assert.deepEqual(codes(drifted), ["rest-drift"]);
  assert.equal(drifted.metrics.restDriftPx, 64);
  assert.match(drifted.findings[0].message, /64\.00 px from the pre-input box/);

  // The return here is a one-frame snap, which is not a spring; expect "linear" so the case
  // isolates the drift threshold.
  const returned = recording().map((sample, index) => (index >= 15 ? moveTo(sample, 200.99) : sample));
  const result = evaluate(returned, { expect: { returnsToRest: true, response: "linear" } });
  assert.equal(result.metrics.restDriftPx, 0.99);
  assert.deepEqual(codes(result), []);
});

test("constant-speed motion warns about a linear response without failing the gate", () => {
  const result = evaluate(positions(recording(), RAMP));
  assert.equal(result.status, "passed"); // warnings never fail the gate
  assert.deepEqual(codes(result), ["linear-response"]);
  assert.equal(result.findings[0].severity, "warning");
  assert.equal(result.metrics.overshootPx, 0);
  assert.equal(result.metrics.travelPx, 56);
});

test("a monotonic ease and a non-spring expectation are not linear responses", () => {
  assert.deepEqual(codes(evaluate(positions(recording(), EASE))), []); // speed peaks in the interior
  assert.equal(evaluate(positions(recording(), EASE)).metrics.overshootPx, 0); // and never overshoots
  for (const response of ["linear", "stepped"]) {
    assert.deepEqual(codes(evaluate(positions(recording(), RAMP), { expect: { response } })), []);
  }
  const noResponse = probeOf();
  delete noResponse.expect.response;
  assert.deepEqual(codes(evaluateSamples(noResponse, positions(recording(), RAMP), [])), []);
});

test("speed is displacement over elapsed time, so frame spacing changes the verdict", () => {
  // Same 8 px per frame as RAMP; only the timestamps differ, and the middle frames are the fast
  // ones. Measuring per sample index would still read this as constant speed.
  const gaps = [16, 16, 32, 16, 8, 8, 16, 32, 32, ...Array.from({ length: 10 }, () => 16)];
  const uneven = retime(positions(recording(), RAMP), gaps);
  assert.equal(uneven.at(-1).t, uneven.filter((sample) => sample.phase === "input").at(-1).t + 160);
  assert.deepEqual(codes(evaluate(uneven)), []);
  assert.deepEqual(codes(evaluate(positions(recording(), RAMP))), ["linear-response"]);
});

test("a target that only fades is an opacity-only response", () => {
  const fading = freeze(recording()).map((sample, index) => ({ ...sample, opacity: 1 - index * 0.05 }));
  const result = evaluate(fading, { expect: { responds: false } });
  assert.equal(result.status, "failed");
  assert.deepEqual(codes(result), ["opacity-only"]);
  assert.equal(result.metrics.opacityDeltaMax, 0.95);
  // 0.01 is the threshold: a fade smaller than that is not a response either way.
  const still = freeze(recording()).map((sample, index) => ({ ...sample, opacity: index === 0 ? 1 : 0.995 }));
  assert.deepEqual(codes(evaluate(still, { expect: { responds: false } })), []);
  // A probe that expected a response gets both verdicts: nothing moved, and only opacity changed.
  assert.deepEqual(codes(evaluate(fading)), ["dead-interaction", "opacity-only"]);
});

test("requests to another origin are reported with their URLs", () => {
  const requests = [
    "http://127.0.0.1:53123/index.html",
    "http://127.0.0.1:53123/favicon.ico",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "blob:http://127.0.0.1:53123/8f2c",
    "about:blank",
    "https://fonts.example.com/inter.woff2",
    "https://cdn.example.com/favicon.ico",
    "https://fonts.example.com/inter.woff2",
  ];
  const result = evaluate(recording(), { requests });
  assert.equal(result.status, "failed");
  assert.deepEqual(codes(result), ["external-request"]);
  assert.deepEqual(result.findings[0].urls, ["https://fonts.example.com/inter.woff2", "https://cdn.example.com/favicon.ico"]);

  // Without a page origin nothing can be called external.
  assert.deepEqual(codes(evaluate(recording(), { requests, pageOrigin: undefined })), []);
  // A file:// page may only touch file: URLs.
  const fileProbe = evaluate(recording(), { requests: ["file:///C:/site/index.html", "http://127.0.0.1:53123/a.css"], pageOrigin: "file:" });
  assert.deepEqual(fileProbe.findings[0].urls, ["http://127.0.0.1:53123/a.css"]);

  const many = Array.from({ length: 25 }, (_unused, index) => `https://cdn.example.com/chunk-${index}.js`);
  const capped = evaluate(recording(), { requests: many });
  assert.equal(capped.findings[0].urls.length, 20);
  assert.match(capped.findings[0].message, /25 requests/);
});

test("every finding carries a one-line fix", () => {
  const fading = freeze(recording()).map((sample, index) => ({ ...sample, opacity: 1 - index * 0.05 }));
  const findings = [
    ...evaluate(fading).findings,
    ...evaluate(positions(recording(), RAMP)).findings,
    ...evaluate(recording(), { expect: { returnsToRest: true } }).findings,
    ...evaluate(recording(), { requests: ["https://cdn.example.com/a.js"] }).findings,
  ];
  assert.equal(findings.length, 5);
  for (const finding of findings) {
    assert.equal(finding.fix, HINTS[finding.code]);
    assert.ok(finding.fix.length > 20 && !finding.fix.includes("\n"), finding.code);
    assert.ok(["error", "warning"].includes(finding.severity));
  }
});

test("validateProbeFile fills in every default the rest of the system relies on", () => {
  const doc = fixture().document;
  delete doc.viewport;
  doc.probes[0].expect = {};
  const normalized = validateProbeFile(doc);
  assert.deepEqual(normalized.viewport, { width: 1280, height: 800 });
  assert.deepEqual(normalized.probes[0].expect, { responds: true, settleWithinMs: 1200, returnsToRest: false });
  assert.deepEqual(doc.probes[0].expect, {}, "the caller's document is left alone");
  assert.equal(normalized.probes[0].target, "#card");
});

test("validateProbeFile rejects broken probe documents with the reason", () => {
  const withDoc = (mutate) => {
    const doc = fixture().document;
    mutate(doc);
    return () => validateProbeFile(doc);
  };
  assert.throws(withDoc((doc) => { doc.schema = "design-pipeline.interaction-probe.v2"; }), /schema must be design-pipeline\.interaction-probe\.v1/);
  assert.throws(withDoc((doc) => { doc.probes.push({ ...doc.probes[0] }); }), /probes\[1\] duplicates probe id card-follows-pointer/);
  assert.throws(withDoc((doc) => { doc.probes[0].expect.bounce = true; }), /unsupported properties: bounce/);
  assert.throws(withDoc((doc) => { doc.probes[0].input = { kind: "drag", from: [0, 0], to: [1, 1], durationMs: 100 }; }), /input\.kind has invalid value drag/);
  assert.throws(withDoc((doc) => { delete doc.probes[0].input.to; }), /probes\[0\]\.input is missing to/);
  assert.throws(withDoc((doc) => { doc.probes[0].input.durationMs = 0; }), /durationMs must be a number between 1 and 5000/);
  assert.throws(withDoc((doc) => { doc.probes[0].expect.settleWithinMs = 9000; }), /settleWithinMs must be a number between 1 and 5000/);
  assert.throws(withDoc((doc) => { doc.url = "/srv/site/index.html"; }), /url must be an http\(s\) URL or a path relative to the probe file/);
  assert.throws(withDoc((doc) => { doc.url = "C:\\\\site\\\\index.html"; }), /url must be an http\(s\) URL or a path relative to the probe file/);
  assert.throws(withDoc((doc) => { doc.url = "../../other-project/index.html"; }), /url must not escape the probe file's directory/);
  assert.throws(withDoc((doc) => { doc.probes[0].dwellMs = 10; }), /unsupported properties: dwellMs/);
  assert.throws(withDoc((doc) => { doc.viewport = { width: 9000, height: 800 }; }), /viewport\.width must be a positive integer of at most 4096/);
  assert.throws(withDoc((doc) => { doc.probes = []; }), /probes must be a non-empty array/);
  // A wheel gesture no capture could deliver: 600 steps 1 s apart is ten minutes, and the CLI kills
  // the capture kernel at 60 s. A probe that can only ever produce a kernel error is refused here.
  const wheel = (steps, intervalMs) => withDoc((doc) => { doc.probes[0].input = { kind: "wheel", deltaY: 1200, steps, intervalMs }; });
  assert.throws(wheel(600, 1000), /turns the wheel for 600000 ms .*the limit is 5000 ms/);
  assert.doesNotThrow(wheel(50, 100));
});

test("nested paths and http URLs are accepted", () => {
  for (const url of ["index.html", "pages/demo/index.html", "./demo/../demo/index.html", "http://127.0.0.1:5173/", "https://example.com/demo"]) {
    const doc = fixture().document;
    doc.url = url;
    assert.equal(validateProbeFile(doc).url, url);
  }
});

test("evaluateProbeFile joins document and capture into one result document", () => {
  const data = fixture();
  data.document.probes.push({ ...data.document.probes[0], id: "card-returns", expect: { ...data.document.probes[0].expect, returnsToRest: true } });
  data.capture.probes.push({ ...data.capture.probes[0], id: "card-returns" });
  const result = evaluateProbeFile(data.document, data.capture);
  assert.equal(result.schema, RESULT_SCHEMA);
  assert.equal(result.id, "sample-card");
  assert.equal(result.url, "index.html");
  assert.equal(result.status, "failed"); // one failing probe fails the document
  assert.deepEqual(result.probes.map((probe) => probe.status), ["passed", "failed"]);
  assert.deepEqual(result.probes[0].samples, { count: 20, firstMs: 0, lastMs: 304 });
  assert.deepEqual(result.findings.map((finding) => [finding.probeId, finding.code]), [["card-returns", "rest-drift"]]);
  assert.equal(result.findings[0].fix, HINTS["rest-drift"]);
});

test("a probe the capture never recorded is a contract error", () => {
  const data = fixture();
  data.document.probes.push({ ...data.document.probes[0], id: "card-wheel" });
  assert.throws(() => evaluateProbeFile(data.document, data.capture), /capture is missing probe card-wheel/);

  const empty = fixture();
  empty.capture.probes[0].samples = [];
  assert.throws(() => evaluateProbeFile(empty.document, empty.capture), /recorded no samples/);
});

function menuDocument() {
  return { schema: fixture().document.schema, id: "menu-business", url: "index.html", probes: [{ id: "menu", target: "#wrapper", steps: [
    { id: "initial", timeoutMs: 20, assertions: [{ selector: "#menu", kind: "visible", equals: false }] },
    { id: "choose", input: { kind: "click", selector: "#blue" }, timeoutMs: 100, assertions: [{ selector: "#selected", kind: "text", equals: "Blue" }] },
  ] }] };
}
function menuCapture() {
  return { pageOrigin: "file:", probes: [{ id: "menu", requests: ["file:///study/index.html"], steps: [
    { id: "initial", elapsedMs: 20, observations: [{ selector: "#menu", kind: "visible", found: true, actual: false }] },
    { id: "choose", elapsedMs: 100, observations: [{ selector: "#selected", kind: "text", found: true, actual: "Blue" }] },
  ] }] };
}

test("menu journey verifies real business values without inventing motion frames", () => {
  const doc = menuDocument(), capture = menuCapture();
  const result = evaluateProbeFile(doc, capture);
  assert.equal(result.status, "passed");
  assert.equal(result.probes[0].steps.length, 2);
  assert.equal(Object.hasOwn(result.probes[0], "samples"), false);
  assert.equal(Object.hasOwn(result.probes[0], "metrics"), false);
  capture.probes[0].steps[1].observations[0].actual = "None";
  const failed = evaluateProbeFile(doc, capture);
  assert.equal(failed.status, "failed");
  assert.equal(failed.probes[0].steps[1].assertions[0].actual, "None");
  assert.equal(failed.findings[0].stepId, "choose");
});

test("journey contracts reject mixed shapes, executable fields and unbounded observations", () => {
  for (const [mutate, expected] of [
    [doc => { doc.probes[0].input = { kind: "click", at: [0, 0] }; }, /unsupported properties: input/],
    [doc => { doc.probes[0].steps = []; }, /1..16 steps/],
    [doc => { doc.probes[0].steps = Array.from({ length: 17 }, (_, id) => ({ ...doc.probes[0].steps[0], id: String(id) })); }, /1..16 steps/],
    [doc => { doc.probes[0].steps[1].id = "initial"; }, /duplicates step id/],
    [doc => { doc.probes[0].steps[0].assertions = []; }, /1..16 assertions/],
    [doc => { doc.probes[0].steps[0].assertions = Array.from({ length: 17 }, (_, id) => ({ selector: "#row" + id, kind: "text", equals: "" })); }, /1..16 assertions/],
    [doc => { doc.probes[0].steps[0].timeoutMs = null; }, /must be a number/],
    [doc => { doc.probes[0].steps[0].timeoutMs = 5001; }, /must be a number/],
    [doc => { doc.probes[0].steps = Array.from({ length: 4 }, (_, id) => ({ ...doc.probes[0].steps[0], id: String(id), timeoutMs: 5000 })); }, /exceed 15000/],
    [doc => { doc.probes[0].steps[1].input = { kind: "key", key: "Space" }; }, /invalid value Space/],
    [doc => { doc.probes[0].steps[1].input = { kind: "click", selector: "#blue", script: "window.selected='Blue'" }; }, /unsupported properties: script/],
    [doc => { doc.probes[0].steps[0].assertions[0].equals = "false"; }, /must be true or false/],
    [doc => { doc.probes[0].steps[0].assertions[0].evaluate = "document.hidden=false"; }, /unsupported properties: evaluate/],
  ]) {
    const doc = menuDocument(); mutate(doc); assert.throws(() => validateProbeFile(doc), expected);
  }
  const doc = menuDocument(); delete doc.probes[0].steps[0].timeoutMs;
  assert.equal(validateProbeFile(doc).probes[0].steps[0].timeoutMs, 1000);
  assert.equal(doc.probes[0].steps[0].timeoutMs, undefined, "normalization leaves the caller's document alone");
});

test("journey observations and native rows require exact coverage and typed literal comparisons", () => {
  const doc = menuDocument(), probe = validateProbeFile(doc).probes[0], row = evaluateProbeFile(doc, menuCapture()).probes[0];
  assert.equal(journeyResultFailure(probe, row), null);
  for (const mutate of [
    capture => capture.probes.push({ ...capture.probes[0] }),
    capture => capture.probes[0].steps.pop(),
    capture => capture.probes[0].steps.reverse(),
    capture => capture.probes[0].steps[0].observations.push({ ...capture.probes[0].steps[0].observations[0] }),
    capture => { capture.probes[0].steps[1].observations[0].actual = true; },
    capture => { capture.probes[0].steps[1].elapsedMs = 99; },
  ]) { const capture = menuCapture(); mutate(capture); assert.throws(() => evaluateProbeFile(doc, capture), /journey|incomplete|reordered|invalid literal|observation window/); }
  for (const mutate of [
    row => row.steps.reverse(),
    row => { row.steps[1].assertions[0].actual = "None"; },
    row => { row.steps[1].assertions[0].expected = "None"; },
    row => { row.steps[0].assertions[0].found = false; row.steps[0].assertions[0].actual = null; },
    row => { row.samples = { count: 0 }; },
  ]) { const forged = JSON.parse(JSON.stringify(row)); mutate(forged); assert.notEqual(journeyResultFailure(probe, forged), null); }
});

test("missing state nodes cannot satisfy false or null and journey retains external-request failures", () => {
  const doc = menuDocument(), capture = menuCapture();
  capture.probes[0].steps[0].observations[0] = { selector: "#menu", kind: "visible", found: false, actual: null };
  const missing = evaluateProbeFile(doc, capture);
  assert.equal(missing.status, "failed"); assert.equal(missing.findings[0].code, "state-target-missing");
  const attribute = menuDocument(), raw = menuCapture();
  attribute.probes[0].steps[0].assertions[0] = { selector: "#menu", kind: "attribute", name: "aria-hidden", equals: null };
  raw.probes[0].steps[0].observations[0] = { selector: "#menu", kind: "attribute", name: "aria-hidden", found: false, actual: null };
  assert.equal(evaluateProbeFile(attribute, raw).status, "failed");
  raw.probes[0].steps[0].observations[0].found = true;
  assert.equal(evaluateProbeFile(attribute, raw).status, "passed", "a missing attribute on one existing element can be declared explicitly");
  const network = menuCapture(); network.probes[0].requests.push("https://cdn.example.invalid/widget.js");
  const external = evaluateProbeFile(doc, network);
  assert.equal(external.status, "failed"); assert.equal(external.findings[0].code, "external-request");
});

test("journey origin completeness cannot hide off-origin requests while motion stays compatible", () => {
  const doc = menuDocument(), incomplete = menuCapture();
  incomplete.probes[0].requests.push("https://off-origin.invalid/script.js"); delete incomplete.pageOrigin;
  assert.throws(() => evaluateProbeFile(doc, incomplete), /journey.*origin/);
  for (const origin of ["", null, 42, "bogus", "file://", "https://off-origin.invalid", "https://off-origin.invalid/path"]) {
    const raw = menuCapture(); raw.pageOrigin = origin;
    assert.throws(() => evaluateProbeFile(doc, raw), /journey.*origin/);
  }
  const mismatched = menuCapture(); mismatched.url = "https://off-origin.invalid/menu.html";
  assert.throws(() => evaluateProbeFile(doc, mismatched), /journey.*origin/);
  const invalidUrl = menuCapture(); invalidUrl.url = "not-an-absolute-url";
  assert.throws(() => evaluateProbeFile(doc, invalidUrl), /journey.*origin/);
  const local = menuCapture(); local.url = "file:///study/index.html#menu";
  assert.equal(evaluateProbeFile(doc, local).status, "passed");
  const remote = menuCapture(), remoteDoc = menuDocument();
  remoteDoc.url = "https://menu.example.invalid/index.html"; remote.pageOrigin = "https://menu.example.invalid"; remote.url = remoteDoc.url;
  remote.probes[0].requests = [remote.url];
  assert.equal(evaluateProbeFile(remoteDoc, remote).status, "passed");
  const old = fixture(); delete old.capture.pageOrigin;
  old.capture.probes[0].requests.push("https://off-origin.invalid/script.js");
  assert.equal(evaluateProbeFile(old.document, old.capture).status, "passed", "legacy motion's missing-origin behavior is unchanged");
});

// A hover or tilt returns to rest, so its net travel is about zero. Overshoot is then the swing past
// rest after the largest excursion, and a constant-speed out-and-back is not a spring even when
// uneven frame spacing jitters its speed a little.
const outAndBack = (xs) => [200, 200, 200, ...xs, ...Array.from({ length: 20 - 3 - xs.length }, () => 200)];
test("return-to-rest motion: a swing past rest is a spring, a jittery constant-speed out-and-back is not", () => {
  const spring = positions(recording(), outAndBack([220, 245, 262, 266, 255, 232, 206, 188, 186, 193, 199]));
  const springResult = evaluate(spring, { expect: { returnsToRest: true } });
  assert.deepEqual(codes(springResult), []);
  assert.equal(springResult.metrics.overshootBasis, "excursion");
  assert.equal(springResult.metrics.overshootPx, 14);

  // 10 px per frame out and back, with timestamps jittered by up to 2 ms.
  const linear = positions(recording(), outAndBack([210, 220, 230, 240, 250, 240, 230, 220, 210]));
  const gaps = Array.from({ length: 19 }, (_, index) => 16 + [0, 2, -1, 1, -2][index % 5]);
  const linearResult = evaluate(retime(linear, gaps), { expect: { returnsToRest: true, settleWithinMs: 150 } });
  assert.deepEqual(codes(linearResult), ["linear-response"]);
  assert.equal(linearResult.metrics.overshootPx, 0);
  assert.match(linearResult.findings[0].message, /of 50.00 px excursion/);
});
