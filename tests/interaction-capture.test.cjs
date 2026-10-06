"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { captureInteraction } = require("../skill/scripts/interaction-capture-core.cjs");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");

// The canonical recording the evaluator consumes: the browser capture is asserted against its
// shape so the two layers cannot drift apart on keys, types or units.
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "interaction-samples.json"), "utf8"));
const CANONICAL = FIXTURE.capture.probes[0].samples[0];
const PUPPETEER_MODULE = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE;

// Only a missing tool skips, and the resolver's own message is the reason. Anything else thrown
// here is a bug in the capture layer and must fail the run: in this repository the skip path is
// the one CI takes, so a broad catch would hide a broken module forever.
function missingTool() {
  for (const probe of [() => resolvePuppeteer(process.cwd(), PUPPETEER_MODULE), () => resolveChrome()]) {
    try {
      probe();
    } catch (error) {
      if (error.code !== "TOOL_MISSING") throw error;
      return `no browser for the interaction probe (${error.message})`;
    }
  }
  return false;
}
const skip = missingTool();

// A 1x1 PNG, so the "external" origin serves a real image instead of a failed request.
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

// The card sits at exactly the fixture's rest geometry (200,300 320x200) so a real recording's
// first box can be compared with the canonical one value for value.
// overflow:hidden keeps a scrollbar from appearing when the card travels past the viewport edge,
// which would move the box for reasons that have nothing to do with the interaction.
const CARD_CSS = "html,body{margin:0;overflow:hidden;background:#101014}#card{position:absolute;left:200px;top:300px;width:320px;height:200px;background:#44aaff;will-change:transform}";

function liveHtml() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>live card</title><style>${CARD_CSS}</style></head>
<body><div id="card"></div><img src="/pixel.png" alt="" width="1" height="1">
<script>
var card = document.getElementById("card");
var target = 0, x = 0, velocity = 0;
window.addEventListener("mousemove", function (event) { target = event.clientX - 200; });
function tick() {
  velocity = (velocity + (target - x) * 0.14) * 0.78;
  x += velocity;
  card.style.transform = "translateX(" + x.toFixed(3) + "px)";
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
</script></body></html>`;
}

// The data: icon stops Chrome from fetching /favicon.ico on its own: it does so on the first load only,
// so the two probes' request lists would differ by a request the page never made.
function deadHtml(externalOrigin) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>dead card</title><link rel="icon" href="data:,"><style>${CARD_CSS}</style></head>
<body><div id="card"></div><img src="${externalOrigin}/remote.png" alt="" width="1" height="1"></body></html>`;
}

function serve(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

const close = (server) => new Promise((resolve) => server.close(resolve));

function fileServer(dir) {
  return serve((request, response) => {
    const name = request.url.split("?")[0].replace(/^\//, "") || "index.html";
    if (name === "pixel.png") {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(PIXEL);
      return;
    }
    const file = path.join(dir, path.basename(name));
    if (!fs.existsSync(file)) {
      response.writeHead(404).end("no");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(fs.readFileSync(file));
  });
}

// A fully specified document, the way validateProbeFile hands one over: the capture re-defaults
// nothing, so anything left out here would surface as a capture error rather than a guess.
function document_(url, ...probes) {
  return { schema: FIXTURE.document.schema, id: "browser-probe", url, viewport: { width: 1280, height: 800 }, probes };
}

function sweep(id, durationMs, settleWithinMs) {
  return {
    id,
    target: "#card",
    input: { kind: "pointer-sweep", from: [200, 400], to: [1080, 400], durationMs },
    expect: { responds: true, settleWithinMs, returnsToRest: false, response: "spring" },
  };
}

function assertCanonicalShape(sample, label) {
  assert.deepEqual(Object.keys(sample).sort(), Object.keys(CANONICAL).sort(), `${label}: sample keys`);
  assert.deepEqual(Object.keys(sample.box).sort(), Object.keys(CANONICAL.box).sort(), `${label}: box keys`);
  for (const key of Object.keys(CANONICAL)) assert.equal(typeof sample[key], typeof CANONICAL[key], `${label}: type of ${key}`);
  for (const key of Object.keys(CANONICAL.box)) assert.equal(typeof sample.box[key], typeof CANONICAL.box[key], `${label}: type of box.${key}`);
  assert.ok(Number.isFinite(sample.t) && sample.t >= 0, `${label}: t must be milliseconds from the recording start, got ${sample.t}`);
  assert.ok(["pre", "input", "post"].includes(sample.phase), `${label}: phase ${sample.phase}`);
  assert.ok(sample.opacity >= 0 && sample.opacity <= 1, `${label}: opacity ${sample.opacity}`);
}

const xs = (samples) => samples.map((sample) => sample.box.x);
const gaps = (samples) => samples.slice(1).map((sample, index) => sample.t - samples[index].t);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function capture(dir, doc) {
  const probeFile = path.join(dir, "interaction.json");
  fs.writeFileSync(probeFile, JSON.stringify(doc, null, 2));
  return captureInteraction(probeFile, { doc, puppeteerModule: PUPPETEER_MODULE });
}

test("a card that follows the pointer records real motion in the canonical sample shape", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-live-"));
  let site = null;
  try {
    fs.writeFileSync(path.join(dir, "live.html"), liveHtml());
    site = await fileServer(dir);
    const probe = sweep("card-follows-pointer", 600, 800);
    const result = await capture(dir, document_(`${site.origin}/live.html`, probe));

    assert.equal(result.schema, FIXTURE.capture.schema);
    assert.equal(result.pageOrigin, site.origin);
    const samples = result.probes[0].samples;
    assertCanonicalShape(samples[0], "first sample");
    assertCanonicalShape(samples[samples.length - 1], "last sample");

    // Units: at rest the recorded box is the card's CSS geometry in viewport pixels, which is what
    // the canonical fixture holds; the time origin is the recording start, not the epoch.
    assert.deepEqual(samples[0].box, CANONICAL.box, JSON.stringify(samples[0]));
    assert.ok(samples[0].t < 50, `recording starts near zero, got ${samples[0].t}`);
    assert.ok(samples[samples.length - 1].t > 1000, `recording spans pre + 600ms input + settle, got ${samples[samples.length - 1].t}`);
    // The evaluator reads the settle deadline off the recording, so the endpoint sample has to sit
    // at or past inputEnd + settleWithinMs however the frames fall.
    const lastInput = [...samples].reverse().find((sample) => sample.phase === "input");
    const deadline = lastInput.t + probe.expect.settleWithinMs;
    assert.ok(samples[samples.length - 1].t >= deadline, `recording ends at ${samples[samples.length - 1].t}ms, before the ${deadline}ms settle deadline`);
    assert.deepEqual(gaps(samples).filter((gap) => gap <= 0), [], "sample times must be monotonic");

    // Frames, not polls: a throttled renderer would show gaps of hundreds of milliseconds and make
    // every settle measurement meaningless.
    assert.ok(median(gaps(samples)) < 25, `median frame gap ${median(gaps(samples))}ms looks throttled`);

    // Phases are contiguous and cover the whole recording.
    const phases = samples.map((sample) => sample.phase);
    assert.deepEqual([...new Set(phases)], ["pre", "input", "post"], JSON.stringify([...new Set(phases)]));

    // The pointer sweep really moved the card, and it moved by transform rather than layout.
    const positions = xs(samples);
    const travel = Math.max(...positions) - Math.min(...positions);
    assert.ok(travel > 100, `card travelled ${travel}px, expected the sweep to drag it across the page`);
    const transforms = new Set(samples.map((sample) => sample.transform));
    assert.ok(transforms.size > 5, `only ${transforms.size} distinct transforms recorded`);
    assert.match(samples[samples.length - 1].transform, /^matrix\(/);
    // Genuine intermediate pointer positions: a sweep that teleported to its endpoint would hand
    // the card its whole travel in one go, and the frame deltas would be a large fraction of it.
    const deltas = positions.slice(1).map((x, index) => Math.abs(x - positions[index]));
    assert.ok(deltas.filter((delta) => delta > 0.5).length > 10, `only ${deltas.filter((delta) => delta > 0.5).length} frames of movement; the input is not being driven step by step`);
    assert.ok(Math.max(...deltas) < travel / 10, `one frame moved the card ${Math.max(...deltas)}px of its ${travel}px travel, which is a teleporting pointer, not a sweep`);

    // Every request the page made is its own origin's.
    const requests = result.probes[0].requests;
    assert.ok(requests.includes(`${site.origin}/pixel.png`), JSON.stringify(requests));
    assert.deepEqual(requests.filter((url) => !url.startsWith(`${site.origin}/`)), [], JSON.stringify(requests));
  } finally {
    if (site) await close(site.server);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a page that ignores the pointer records a motionless target and its off-origin request", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-dead-"));
  let site = null;
  let external = null;
  try {
    external = await serve((_request, response) => {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(PIXEL);
    });
    fs.writeFileSync(path.join(dir, "dead.html"), deadHtml(external.origin));
    site = await fileServer(dir);
    const doc = document_(`${site.origin}/dead.html`, sweep("card-ignores-pointer", 400, 600), sweep("card-still-ignores-pointer", 200, 300));
    const result = await capture(dir, doc);

    const samples = result.probes[0].samples;
    assertCanonicalShape(samples[0], "first sample");
    assert.ok(samples.length > 20, `expected a full recording, got ${samples.length} samples`);

    // Nothing moves and nothing transforms: exactly the recording a dead-interaction finding rests on.
    const drift = Math.max(...xs(samples)) - Math.min(...xs(samples));
    assert.ok(drift <= 0.5, `an inert page moved the card by ${drift}px`);
    assert.deepEqual([...new Set(samples.map((sample) => sample.transform))], ["none"]);
    assert.deepEqual([...new Set(samples.map((sample) => sample.box.y))], [CANONICAL.box.y]);

    // The request list is what the external-request finding reads: it carries the off-origin image,
    // and the reload between probes means the second probe sees its own load, not the first's too.
    const requests = result.probes[0].requests;
    assert.ok(requests.includes(`${external.origin}/remote.png`), JSON.stringify(requests));
    assert.deepEqual(requests.filter((url) => !url.startsWith(`${result.pageOrigin}/`)), [`${external.origin}/remote.png`], JSON.stringify(requests));
    assert.deepEqual(result.probes.map((probe) => probe.requests), [requests, requests], JSON.stringify(result.probes.map((probe) => probe.requests)));
    assert.notStrictEqual(result.probes[1].requests, requests, "each probe must own its request list");
  } finally {
    if (site) await close(site.server);
    if (external) await close(external.server);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
