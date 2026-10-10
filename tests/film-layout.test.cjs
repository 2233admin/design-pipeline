"use strict";

// Composition gate layout checks in `film check`: visible text sampled between beat midpoints.
// The fixtures under fixtures/film-layout are layout-probe captures of the two dogfooding films
// (experiments/project-motion, f41da71): the accepted finals and rebuilt earlier rounds whose
// defects the owner found only in frame review (onboarding: terminal at 14% / 5% opacity under
// the stage bar 23.5-26.5 s, closing line ~35 px from the edge, transient overlap at 23.13 s;
// clone: viewport labels crossing the SSIM row at ~11.3 s). Rounds are rebuilt from the round's
// documented content.json values, so they reproduce the reviewed defects, not every pixel.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const { checkFilmLayout } = require("../skill/scripts/composition-core.cjs");
const { checkFilmProject, layoutTimes, scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { captureLayout, resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");

const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const refs = path.join(__dirname, "../skill/references/film-choreography");
const fixture = (name) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, "fixtures/film-layout", `${name}.layout.json.gz`))));
const VIEW = { width: 1920, height: 1080 };
const grid = (end) => Array.from({ length: Math.round(end / 0.2) }, (_, index) => Number((0.1 + index * 0.2).toFixed(3)));
const layoutOf = (runsAt, end = 4) => ({ viewport: VIEW, samples: grid(end).map((atSec) => ({ atSec, runs: runsAt(atSec) })) });
const text = (id, rect, extra = {}) => ({ id, text: `${id} text`, opacity: 1, fontPx: 40, rects: [rect], ...extra });
const of = (result, code) => result.findings.filter((finding) => finding.code === code);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-layout-"));

test("held overlap of two legible texts is an error; a passing overlap and a dissolve are not", () => {
  const base = text("#a", [400, 500, 600, 50]);
  const held = checkFilmLayout(layoutOf((at) => [base, ...(at > 1 && at < 2 ? [text("#b", [500, 510, 600, 50])] : [])]));
  assert.equal(held.status, "failed");
  assert.equal(of(held, "text-overlap").length, 1);
  assert.match(of(held, "text-overlap")[0].message, /1\.1-1\.9s: #a .* \/ #b /);
  assert.equal(of(held, "text-overlap")[0].atSec, 1.1);

  const passing = checkFilmLayout(layoutOf((at) => [base, ...(at === 1.1 ? [text("#b", [500, 510, 600, 50])] : [])]));
  assert.equal(passing.status, "passed");
  assert.deepEqual(of(passing, "text-overlap").map((finding) => finding.severity), ["warn"]);
  assert.match(of(passing, "text-overlap")[0].message, /in passing/);

  // A crossfade: one caption fades out while the next fades in over the same place.
  const dissolve = checkFilmLayout(layoutOf((at) => {
    const progress = Math.min(1, Math.max(0, (at - 1) / 2));
    return [text("#out", [400, 500, 600, 50], { opacity: 1 - progress }), text("#in", [400, 500, 600, 50], { opacity: progress })].filter((run) => run.opacity >= 0.02);
  }));
  assert.deepEqual(dissolve.findings, []);
});

test("a steady faint copy under legible text is a review prompt, not a failure", () => {
  const result = checkFilmLayout(layoutOf((at) => [text("#label", [400, 500, 200, 40]), ...(at > 1 ? [text("#ghost", [380, 495, 600, 50], { opacity: 0.05 })] : [])]));
  assert.equal(result.status, "passed");
  assert.equal(of(result, "text-overlap")[0].severity, "warn");
  assert.match(of(result, "text-overlap")[0].message, /faint copy/);
});

test("covered, nested, allowed and off-canvas text never counts as overlap", () => {
  const result = checkFilmLayout(layoutOf(() => [
    text("#a", [400, 500, 600, 50]),
    text("#under-card", [400, 500, 600, 50], { occluded: true }),
    text("#layered", [400, 500, 600, 50], { allowOverlap: true }),
    text("#child", [420, 505, 100, 40], { within: [0] }),
    text("#parked", [-900, 500, 600, 50]),
    text("#parked-twin", [-880, 500, 600, 50]),
  ]));
  assert.deepEqual(of(result, "text-overlap"), []);
});

test("resting text near the edge or below the size floor is a prompt; moving text is not", () => {
  const result = checkFilmLayout(layoutOf((at) => [
    text("#closing", [35, 900, 1850, 60]),
    text("#flying", [10 + at * 100, 20, 300, 40]),
    text("#tick", [800, 600, 60, 24], { fontPx: 20 }),
    text("#tick2", [900, 600, 60, 24], { fontPx: 20 }),
  ]));
  assert.equal(result.status, "passed");
  assert.deepEqual(of(result, "text-edge-margin").map((finding) => finding.target), ["#closing"]);
  assert.match(of(result, "text-edge-margin")[0].message, /35px from the frame edge.*minimum 43px/);
  assert.equal(of(result, "text-too-small").length, 1, "small text is one aggregated prompt");
  assert.match(of(result, "text-too-small")[0].message, /2 resting text run\(s\) below 26px/);
  const allowed = checkFilmLayout(layoutOf(() => [text("#tick", [800, 600, 60, 24], { fontPx: 20 })]), { allow: ["text-too-small"] });
  assert.deepEqual(allowed.findings, []);
  assert.equal(allowed.allowed[0].code, "text-too-small");
  assert.throws(() => checkFilmLayout(layoutOf(() => []), { allow: ["not-a-code"] }), /allowed codes/);
});

test("dogfooding rounds: defects the owner found are flagged, accepted finals stay clean", () => {
  const summary = (name) => checkFilmLayout(fixture(name)).findings.map(({ code, severity, atSec }) => `${severity} ${code} @${atSec}`);
  assert.deepEqual(summary("onboarding-final"), []);
  assert.deepEqual(summary("clone-final"), ["warn text-too-small @3.7"], "24 px tick labels and footnote are a prompt, not a failure");
  const round1 = checkFilmLayout(fixture("onboarding-round1"));
  assert.equal(round1.status, "failed");
  assert.deepEqual(of(round1, "text-overlap").filter((finding) => finding.severity === "error").map((finding) => finding.atSec), [23.3, 24.3], "terminal at 14% under the bar and the cards");
  assert.match(of(round1, "text-edge-margin")[0].message, /#closing .* rests 35px/);
  assert.deepEqual(summary("onboarding-round3").filter((line) => line.includes("text-overlap")), ["warn text-overlap @23.1", "warn text-overlap @23.5", "warn text-overlap @24.1"], "5% ghost stays a prompt");
  assert.deepEqual(summary("onboarding-round4"), ["warn text-overlap @23.1"], "the transient HyperFrames reported at 23.13 s");
  assert.deepEqual(summary("clone-round2").filter((line) => line.includes("text-overlap")), ["warn text-overlap @11.3"]);
});

test("layout samples cover a 5 fps grid and both sides of every beat boundary", () => {
  const board = { durationSec: 4, beats: [{ startSec: 0 }, { startSec: 1.6 }, { startSec: 3.85 }] };
  const times = layoutTimes(board);
  assert.deepEqual(times.slice(0, 3), [0.1, 0.3, 0.5]);
  for (const at of [1.55, 1.65, 3.8, 3.9]) assert.ok(times.includes(at), at);
  assert.ok(times.every((at, index) => at < 4 && (index === 0 || at > times[index - 1])));
});

test("film check merges layout findings into the existing composition gate", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const probed = JSON.parse(fs.readFileSync(path.join(refs, "timeline.example.json"), "utf8"));
    const board = JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"));
    const boundary = board.beats[2].startSec;
    let requested;
    const overlap = (times) => ({ viewport: VIEW, samples: times.map((atSec) => ({ atSec, runs: [text("#title", [400, 500, 600, 50]), ...(Math.abs(atSec - boundary) <= 0.3 ? [text("#next", [450, 510, 600, 50])] : [])] })) });
    const result = checkFilmProject(dir, { capture: () => probed, layout: (composition, url, times) => { requested = times; return overlap(times); } });
    assert.ok(requested.includes(Number((boundary - 0.05).toFixed(3))));
    const composition = result.steps.find((step) => step.gate === "composition");
    assert.equal(composition.status, "failed");
    assert.equal(composition.layout.status, "failed");
    assert.equal(result.steps.filter((step) => step.gate === "composition").length, 1, "no new gate");
    const finding = composition.findings.find((item) => item.code === "text-overlap");
    assert.equal(finding.severity, "error");
    assert.ok([board.beats[1].id, board.beats[2].id].includes(finding.beatId));
    assert.ok(result.fixes.some((fix) => fix.gate === "composition" && fix.code === "text-overlap" && fix.fix));
    assert.equal(result.creativeAcceptance, "not-assessed");

    const broken = checkFilmProject(dir, { capture: () => probed, layout: () => { throw new Error("no layout"); } });
    const unavailable = broken.steps.find((step) => step.gate === "composition");
    assert.deepEqual(unavailable.layout, { status: "unavailable", reason: "layout capture failed: no layout" });
    assert.equal(unavailable.status, "passed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

function browserTools() {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core");
    resolvePuppeteer(process.cwd(), puppeteerModule);
    return { puppeteerModule, chrome: resolveChrome(), gsap: require.resolve("gsap/dist/gsap.min.js") };
  } catch (error) {
    if (!["TOOL_MISSING", "MODULE_NOT_FOUND"].includes(error.code)) throw error;
    return { skip: `browser or GSAP unavailable: ${error.message}` };
  }
}
const BROWSER = browserTools();

// Text that must not count: a typing reveal hidden by clip-path, a row scrolled out of an
// overflow box, text under an opaque card and a clip outside its data-start window. #next
// arrives over #title for 0.6 s around the boundary at `at`.
function layoutPage(dir, at, duration) {
  fs.mkdirSync(path.join(dir, "node_modules/gsap/dist"), { recursive: true });
  fs.copyFileSync(BROWSER.gsap, path.join(dir, "node_modules/gsap/dist/gsap.min.js"));
  const html = `<!doctype html><html><head><meta charset="UTF-8"><script src="node_modules/gsap/dist/gsap.min.js"></script>
<style>*{margin:0;padding:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#0b0d12;color:#eee;font:40px sans-serif}
#root{position:relative;width:100%;height:100%}.t{position:absolute;white-space:nowrap}
#box{position:absolute;left:380px;top:300px;width:700px;height:120px;overflow:hidden}#box .t{top:200px;left:20px}
#card{position:absolute;left:380px;top:640px;width:700px;height:120px;background:#223}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080">
<div id="title" class="t" style="left:400px;top:500px">Title that stays</div>
<div id="next" class="t" style="left:420px;top:505px;opacity:0">Next line arrives</div>
<div id="typed" class="t" style="left:400px;top:500px;clip-path:inset(0% 100% 0% 0%)">Typed later</div>
<div id="box"><div id="scrolled" class="t">Scrolled away under the title</div></div>
<div id="under" class="t" style="left:400px;top:660px">Under the card</div>
<div id="card"><div id="card-text" class="t" style="left:20px;top:20px">Card text</div></div>
<div id="later" class="t" style="left:1200px;top:800px" data-start="${duration - 0.5}" data-duration="0.5">Later clip</div>
</div><script>
const tl = gsap.timeline({ paused: true });
tl.to("#next", { opacity: 1, duration: 0.01 }, ${at - 0.3}).to("#next", { opacity: 0, duration: 0.01 }, ${at + 0.3}).to("#title", { x: 0, duration: ${duration} }, 0);
window.__timelines["main"] = tl;
</script></body></html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

test("layout probe measures what is visible in the browser", { skip: BROWSER.skip }, async () => {
  const dir = tmp();
  try {
    layoutPage(dir, 2, 4);
    const layout = await captureLayout(path.join(dir, "index.html"), [1.0, 1.9, 2.1, 3.7], { puppeteerModule: BROWSER.puppeteerModule, chrome: BROWSER.chrome });
    assert.deepEqual(layout.viewport, VIEW);
    assert.equal(layout.seek, "timeline");
    const ids = (atSec) => layout.samples.find((sample) => sample.atSec === atSec).runs;
    const at = (atSec, id) => ids(atSec).find((run) => run.id === id);
    assert.equal(at(1.0, "#next"), undefined, "opacity 0 is not visible");
    assert.equal(at(1.9, "#next").opacity, 1);
    assert.equal(at(1.0, "#typed"), undefined, "clip-path inset hides the typed text");
    assert.equal(at(1.0, "#scrolled"), undefined, "overflow clips the scrolled row");
    assert.equal(at(1.0, "#under").occluded, true, "an opaque card paints above it");
    assert.equal(at(1.0, "#card-text").occluded, undefined);
    assert.equal(at(1.0, "#later"), undefined, "outside its data-start window");
    assert.ok(at(3.7, "#later"), "inside its data-start window");
    assert.equal(at(1.0, "#title").fontPx, 40);
    const result = checkFilmLayout(layout);
    assert.deepEqual(result.findings.filter((finding) => finding.severity === "error").map((finding) => finding.target), ["#next | #title"]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Under the HyperFrames runtime the probe seeks through window.__hf and leaves clip visibility to
// the runtime. A stand-in runtime keeps #later visible outside its data-start window and hides
// #title before 2 s, so each sample shows which clock drove it.
test("layout probe seeks through the HyperFrames runtime when it is present", { skip: BROWSER.skip }, async () => {
  const dir = tmp();
  try {
    layoutPage(dir, 2, 4);
    const file = path.join(dir, "index.html");
    // Shape observed in the hyperframes@0.8.137 preview: __hf lists a seek key without a function
    // and the player seeks.
    const runtime = `<script>window.__hf = { seek: undefined }; window.__player = { seek: (t) => { window.__timelines.main.seek(t, false); document.getElementById("title").style.visibility = t < 2 ? "hidden" : "visible"; } };</script></body>`;
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("</body>", runtime));
    const layout = await captureLayout(file, [1.0, 2.1], { puppeteerModule: BROWSER.puppeteerModule, chrome: BROWSER.chrome });
    assert.equal(layout.seek, "hyperframes-runtime");
    const at = (atSec, id) => layout.samples.find((sample) => sample.atSec === atSec).runs.find((run) => run.id === id);
    assert.equal(at(1.0, "#title"), undefined, "the runtime's visibility is respected");
    assert.ok(at(2.1, "#title"));
    assert.ok(at(1.0, "#later"), "clip windows are not emulated over the runtime");
    assert.equal(at(2.1, "#next").opacity, 1, "the runtime seek drove the timeline");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("CLI film check flags text injected over a beat boundary", { skip: BROWSER.skip }, () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const board = JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"));
    const boundary = board.beats[2].startSec;
    layoutPage(dir, boundary, board.durationSec);
    const check = spawnSync(process.execPath, [cli, "film", "check", "--root", dir, "--project-root", ".", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule, "--json"], { encoding: "utf8", windowsHide: true, timeout: 120000 });
    assert.equal(check.status, 2, check.stdout + check.stderr);
    const result = JSON.parse(check.stdout);
    const composition = result.steps.find((step) => step.gate === "composition");
    assert.equal(composition.layout.status, "failed");
    const finding = composition.findings.find((item) => item.code === "text-overlap" && item.severity === "error");
    assert.equal(finding.target, "#next | #title");
    assert.ok(Math.abs(finding.atSec - boundary) <= 0.3, `${finding.atSec} near ${boundary}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
