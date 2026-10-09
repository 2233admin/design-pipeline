"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
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
// A fresh headless page has its pointer parked at (0,0), and Chrome may send a mousemove there by
// itself once the page has laid out; whether it lands before the recording is a race. The card
// follows only moves that actually travel, so that stray event cannot pull it off its rest box.
window.addEventListener("mousemove", function (event) { if (event.movementX || event.movementY) target = event.clientX - 200; });
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

test("delayed native pointer delivery keeps intermediate positions and real jumps still fail the smoothness check", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-delayed-"));
  let site = null;
  try {
    const movesFile = path.join(dir, "moves.json"), wrapper = path.join(dir, "puppeteer.cjs");
    const modulePath = PUPPETEER_MODULE ? path.resolve(PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
    // Delay one real native move like a stalled driver/CDP round trip. Recording stays in the
    // browser's rAF; the wrapper neither synthesizes DOM input nor changes captured samples.
    fs.writeFileSync(wrapper, `const fs=require("node:fs"),puppeteer=require(${JSON.stringify(modulePath)});
module.exports={...puppeteer,async launch(options){
  const browser=await puppeteer.launch(options),newPage=browser.newPage.bind(browser),close=browser.close.bind(browser),moves=[];let startupMoves=0;
  browser.newPage=async()=>{const page=await newPage(),move=page.mouse.move.bind(page.mouse);
    // Reproduce Chrome's stationary startup event with real native input after the recorder sees
    // rest frames. Setup bypasses the swept-move log; the actual driver still stalls on move six.
    page.mouse.move=async(x,y,...args)=>{if(!moves.length){
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await move(0,0);
      await page.evaluate(()=>new Promise(requestAnimationFrame));startupMoves++;}
      const startedAt=performance.now();if(moves.length===6)await new Promise(resolve=>setTimeout(resolve,250));
      const result=await move(x,y,...args);moves.push({x,y,startedAt,t:performance.now()});return result;};return page;};
  browser.close=async()=>{fs.writeFileSync(${JSON.stringify(movesFile)},JSON.stringify({moves,startupMoves}));return close();};return browser;
}};`);
    fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><style>${CARD_CSS}</style><div id="card"></div><script>
// Ignore the stationary startup event, as the live spring specimen already does.
addEventListener("mousemove",event=>{if(!event.movementX&&!event.movementY)return;document.querySelector("#card").style.transform="translateX("+(event.clientX-200)+"px)";});
</script>`);
    site = await fileServer(dir);
    const doc = document_(`${site.origin}/index.html`, sweep("delayed-sweep", 600, 800));
    const raw = await captureInteraction(path.join(dir, "interaction.json"), { doc, puppeteerModule: wrapper });
    const { moves, startupMoves } = JSON.parse(fs.readFileSync(movesFile, "utf8"));
    assert.equal(startupMoves, 1, "the stationary native startup input must actually execute");
    assert.ok(Math.max(...moves.slice(1).map((move, index) => move.t - moves[index].t)) >= 250, "the native input driver actually stalled");
    // A 60 Hz step needs a new wait after actual delivery, even after the 250 ms stall.
    // Allow timer rounding to 15 ms; expired absolute deadlines must not burst with no wait.
    const pauses = moves.slice(1).map((move, index) => move.startedAt - moves[index].t);
    assert.ok(Math.min(...pauses) >= 15, `native pointer delivery caught up in a burst: minimum pause ${Math.min(...pauses)}ms`);
    assert.deepEqual([moves[0].x, moves.at(-1).x], [200, 1080]);
    const maxPointerStep = Math.max(...moves.slice(1).map((move, index) => move.x - moves[index].x));
    assert.ok(maxPointerStep <= 25, `a slow native move must not skip intermediate input coordinates: maximum step ${maxPointerStep}px`);
    const samples = raw.probes[0].samples, positions = xs(samples), travel = Math.max(...positions) - Math.min(...positions);
    const largestSampleStep = samples.slice(1).map((sample, index) => ({ delta: Math.abs(sample.box.x - samples[index].box.x), from: samples[index], to: sample }))
      .reduce((largest, step) => step.delta > largest.delta ? step : largest);
    assert.ok(largestSampleStep.delta < travel / 10, `driver delay must not make the responding specimen jump: ${largestSampleStep.delta}px of ${travel}px travel, frame gap ${largestSampleStep.to.t - largestSampleStep.from.t}ms (${largestSampleStep.from.phase}->${largestSampleStep.to.phase}), driver duration ${moves.at(-1).t - moves[0].t}ms`);

    fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><style>${CARD_CSS}</style><div id="card"></div><script>
addEventListener("mousemove",event=>{if(event.clientX>200)document.querySelector("#card").style.transform="translateX(880px)";});
</script>`);
    const jumped = await capture(dir, document_(`${site.origin}/index.html`, sweep("jumping-target", 600, 800)));
    const jumpPositions = xs(jumped.probes[0].samples), jumpTravel = Math.max(...jumpPositions) - Math.min(...jumpPositions);
    assert.ok(jumpTravel > 800, "the real pointer input reached the jumping page");
    const jumpDelta = Math.max(...jumpPositions.slice(1).map((x, index) => Math.abs(x - jumpPositions[index])));
    assert.ok(jumpDelta >= jumpTravel / 10, `an actual target jump must still fail the same smoothness threshold: ${jumpDelta}px of ${jumpTravel}px travel`);
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
    const evaluated = require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(doc, result);
    assert.equal(evaluated.status, "failed");
    assert.ok(evaluated.findings.some(finding => finding.code === "dead-interaction" && finding.severity === "error"));

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

const LOCAL_BUTTON = '<!doctype html><button id="card" style="position:absolute;left:200px;top:300px;width:320px;height:200px" onclick="this.style.transform=\'translateX(20px)\';location.hash=\'clicked\'">target</button>';
const click = id => ({ id, target: "#card", input: { kind: "click", at: [360, 400] }, expect: { responds: true, settleWithinMs: 100, returnsToRest: false, response: "stepped" } });

const MENU_HTML = `<!doctype html><div id="wrapper"><button id="toggle" aria-expanded="false" onclick="menu.hidden=!menu.hidden;this.setAttribute('aria-expanded',String(!menu.hidden))">Choose</button><div id="menu" hidden><button id="blue" aria-selected="false" onclick="selected.textContent='Blue';this.setAttribute('aria-selected','true')">Blue</button></div><output id="selected">None</output></div><script>
const toggle=document.querySelector('#toggle'),menu=document.querySelector('#menu'),selected=document.querySelector('#selected');
document.addEventListener('keydown',event=>{if(event.key==='ArrowDown'&&!menu.hidden){event.preventDefault();document.querySelector('#blue').focus()}if(event.key==='Escape'){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus()}});
</script>`;
function menuJourney() {
  return { id: "menu", target: "#wrapper", steps: [
    { id: "initial", timeoutMs: 20, assertions: [{ selector: "#menu", kind: "visible", equals: false }, { selector: "#selected", kind: "text", equals: "None" }] },
    { id: "open", input: { kind: "click", selector: "#toggle" }, timeoutMs: 80, assertions: [{ selector: "#menu", kind: "visible", equals: true }, { selector: "#toggle", kind: "attribute", name: "aria-expanded", equals: "true" }] },
    { id: "focus", input: { kind: "key", key: "ArrowDown" }, timeoutMs: 80, assertions: [{ selector: "#blue", kind: "focused", equals: true }] },
    { id: "choose", input: { kind: "key", key: "Enter" }, timeoutMs: 80, assertions: [{ selector: "#selected", kind: "text", equals: "Blue" }, { selector: "#blue", kind: "attribute", name: "aria-selected", equals: "true" }] },
    { id: "close", input: { kind: "key", key: "Escape" }, timeoutMs: 80, assertions: [{ selector: "#menu", kind: "visible", equals: false }, { selector: "#toggle", kind: "focused", equals: true }, { selector: "#selected", kind: "text", equals: "Blue" }] },
  ] };
}
test("menu journey keeps actual open, selection, close and keyboard focus state on one page", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-menu-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), MENU_HTML);
    const doc = document_("index.html", menuJourney()), raw = await capture(dir, doc);
    const result = require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(doc, raw);
    assert.equal(result.status, "passed", JSON.stringify(result.findings));
    assert.equal(raw.probes[0].steps.length, 5);
    assert.equal(Object.hasOwn(raw.probes[0], "samples"), false);
    assert.equal(result.probes[0].steps[4].assertions[2].actual, "Blue");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("menu journey fails broken selection and a transient value that reverses before the window ends", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-menu-failed-"));
  try {
    for (const html of [
      MENU_HTML.replace("selected.textContent='Blue';", "this.style.transform='translateX(20px)';"),
      MENU_HTML.replace("selected.textContent='Blue';", "selected.textContent='Blue';setTimeout(()=>selected.textContent='None',30);"),
    ]) {
      fs.writeFileSync(path.join(dir, "index.html"), html);
      const journey = menuJourney(); journey.steps[3].input = { kind: "click", selector: "#blue" };
      const doc = document_("index.html", journey), raw = await capture(dir, doc);
      const result = require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(doc, raw);
      assert.equal(result.status, "failed");
      assert.equal(result.probes[0].steps[3].assertions[0].actual, "None");
      assert(result.findings.some(finding => finding.stepId === "choose" && finding.code === "state-mismatch"));
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("journey state selectors are unique inside the wrapper and ancestor hiding is observed", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-menu-contained-"));
  try {
    for (const [html, assertion, expectedFound, expectedActual] of [
      [MENU_HTML, { selector: "#absent", kind: "visible", equals: false }, false, null],
      [MENU_HTML + '<output id="outside">Blue</output>', { selector: "#outside", kind: "text", equals: "Blue" }, false, null],
      [MENU_HTML + '<output id="selected">None</output>', { selector: "#selected", kind: "text", equals: "None" }, false, null],
      [MENU_HTML.replace('<div id="wrapper">', '<div id="wrapper" style="opacity:0">'), { selector: "#toggle", kind: "visible", equals: true }, true, false],
    ]) {
      fs.writeFileSync(path.join(dir, "index.html"), html);
      const doc = document_("index.html", { id: "contained", target: "#wrapper", steps: [{ id: "observe", timeoutMs: 1, assertions: [assertion] }] });
      const raw = await capture(dir, doc), observed = raw.probes[0].steps[0].observations[0];
      assert.equal(observed.found, expectedFound); assert.equal(observed.actual, expectedActual);
      assert.ok(raw.probes[0].steps[0].elapsedMs >= 1);
      assert.equal(require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(doc, raw).status, "failed");
    }
    fs.writeFileSync(path.join(dir, "index.html"), MENU_HTML + '<button id="outside">Other menu</button>');
    const doc = document_("index.html", { id: "outside-click", target: "#wrapper", steps: [{ id: "click", input: { kind: "click", selector: "#outside" }, timeoutMs: 20, assertions: [{ selector: "#toggle", kind: "focused", equals: false }] }] });
    await assert.rejects(capture(dir, doc), /click selector .*one element inside/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("journey click redirects retain the canonical local-page guard", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-menu-redirect-"));
  try {
    fs.writeFileSync(path.join(dir, "other.html"), MENU_HTML);
    fs.writeFileSync(path.join(dir, "index.html"), MENU_HTML.replace("menu.hidden=!menu.hidden;", "location.replace('./other.html');menu.hidden=!menu.hidden;"));
    await assert.rejects(capture(dir, document_("index.html", menuJourney())), error => error.code === "INTERACTION_TARGET_MISMATCH");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("journey captures real load requests and preserves the external-request finding", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-menu-network-"));
  let external;
  try {
    external = await serve((_request, response) => { response.writeHead(200, { "content-type": "image/png" }); response.end(PIXEL); });
    fs.writeFileSync(path.join(dir, "index.html"), MENU_HTML + `<img src="${external.origin}/pixel.png">`);
    const doc = document_("index.html", menuJourney()), raw = await capture(dir, doc);
    assert(raw.probes[0].requests.includes(`${external.origin}/pixel.png`));
    const result = require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(doc, raw);
    assert.equal(result.status, "failed"); assert(result.findings.some(finding => finding.code === "external-request"));
  } finally { if (external) await close(external.server); fs.rmSync(dir, { recursive: true, force: true }); }
});

for (const kind of ["JavaScript", "meta refresh"]) {
  test(`local ${kind} redirect cannot measure a different file as the requested page`, { skip }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-redirect-"));
    try {
      fs.writeFileSync(path.join(dir, "other.html"), LOCAL_BUTTON);
      fs.writeFileSync(path.join(dir, "index.html"), kind === "JavaScript"
        ? '<!doctype html><script>location.replace("./other.html")</script>'
        : '<!doctype html><meta http-equiv="refresh" content="0; url=./other.html">');
      await assert.rejects(capture(dir, document_("index.html", click("redirect"))), error => error.code === "INTERACTION_TARGET_MISMATCH" && /other\.html/.test(error.message));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("local redirect to a hard-link alias is a different page target despite identical file bytes", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-hardlink-redirect-"));
  try {
    fs.writeFileSync(path.join(dir, "index.html"), LOCAL_BUTTON + '<script>if (location.pathname.toLowerCase().endsWith("/index.html")) location.replace("./other.html")</script>');
    fs.linkSync(path.join(dir, "index.html"), path.join(dir, "other.html"));
    await assert.rejects(capture(dir, document_("index.html", click("hardlink-redirect"))), error => error.code === "INTERACTION_TARGET_MISMATCH" && /other\.html/.test(error.message));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("local capture retains the actual same-file fragment and Windows case spelling", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-fragment-"));
  try {
    const sameFile = process.platform === "win32" ? "INDEX.html" : "index.html";
    fs.writeFileSync(path.join(dir, "index.html"), LOCAL_BUTTON + `<script>if (!location.hash) location.replace(${JSON.stringify(sameFile + "#loaded")})</script>`);
    const result = await capture(dir, document_("index.html", click("fragment"), click("fragment-again")));
    const actual = new URL(result.url);
    assert.equal(actual.hash, "#clicked");
    assert.equal(actual.href, pathToFileURL(path.join(dir, sameFile)).href + "#clicked");
    assert.equal(result.probes.length, 2);
    for (const probe of result.probes) {
      assert.ok(probe.samples.length >= 5);
      assert.ok(probe.samples.some(sample => sample.box.x >= 219.5), "the real click still moved the declared target");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a local page redirecting to a remote page is rejected while legacy remote redirects remain measurable", { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "interaction-remote-redirect-"));
  let site = null;
  try {
    site = await serve((request, response) => {
      if (request.url === "/redirect") {
        response.writeHead(302, { location: "/target" }).end();
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(LOCAL_BUTTON);
    });
    fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><script>location.replace(${JSON.stringify(site.origin + "/target")})</script>`);
    await assert.rejects(capture(dir, document_("index.html", click("local-to-remote"))), error => error.code === "INTERACTION_TARGET_MISMATCH" && error.message.includes(site.origin));
    const remote = await capture(dir, document_(`${site.origin}/redirect`, click("legacy-remote")));
    assert.equal(remote.url, `${site.origin}/redirect`, "the remote legacy capture URL contract is unchanged");
    assert.ok(remote.probes[0].samples.length >= 5);
    assert.ok(remote.probes[0].samples.some(sample => sample.box.x >= 219.5));
  } finally {
    if (site) await close(site.server);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
