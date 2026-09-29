"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { HINTS } = require("../skill/scripts/film-hints.cjs");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");
const { checkFilmProject, scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { assertEnum, assertKeys } = require("../skill/scripts/contract-utils.cjs");

const scripts = path.join(__dirname, "../skill/scripts");
const refs = path.join(__dirname, "../skill/references/film-choreography");
const cli = path.join(scripts, "designer-pipeline.cjs");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-project-"));

test("every finding code the film gates can emit has a fix hint", () => {
  const core = fs.readFileSync(path.join(scripts, "film-core.cjs"), "utf8");
  const [storyboardSrc, renderSrc] = core.split("// ---------- render evidence");
  const sources = { storyboard: storyboardSrc, render: renderSrc, timeline: fs.readFileSync(path.join(scripts, "film-timeline-core.cjs"), "utf8") };
  for (const [gate, source] of Object.entries(sources)) {
    const codes = [...source.matchAll(/add\("([a-z-]+)"/g)].map((match) => match[1]);
    assert.ok(codes.length > 0, gate);
    for (const code of codes) assert.ok(HINTS[gate][code], `${gate}:${code} has no fix hint`);
  }
});

test("gate findings carry their fix", () => {
  const board = JSON.parse(fs.readFileSync(path.join(refs, "storyboard.example.json"), "utf8"));
  board.beats[1].transformation = { kind: "none" };
  const finding = checkStoryboard(board).findings.find((entry) => entry.code === "transformation-missing");
  assert.match(finding.fix, /state-change/);
});

test("contract errors name the allowed values", () => {
  assert.throws(() => assertEnum("slideshow", ["morph", "match-cut"], "grammar", "x"), /allowed: morph, match-cut/);
  assert.throws(() => assertKeys({ a: 1, z: 2 }, ["a"], ["a", "b"], "thing", "x"), /allowed: a, b/);
});

test("scaffold writes a gate-passing storyboard, a composition wired to its beats, and refuses to overwrite", () => {
  const dir = tmp();
  try {
    const result = scaffoldFilm(dir, { id: "my-film" });
    assert.equal(result.status, "scaffolded");
    for (const name of ["storyboard.json", "index.html", "lib/patterns.js", "lib/timeline-probe.js", "lib/audio-events.js", "lib/instrument-chrome.css", "reference.md", "sound.md", "qa.md", "FILM.md"]) assert.ok(fs.existsSync(path.join(dir, name)), name);
    const board = JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"));
    assert.equal(board.id, "my-film");
    assert.equal(checkStoryboard(board).status, "passed");
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    for (const beat of board.beats) assert.ok(html.includes(`${beat.id} (${beat.role}`), beat.id);
    assert.ok(html.includes('P["continuous-morph"](tl'));
    assert.ok(html.includes(`data-duration="${board.durationSec}"`));
    assert.ok(html.includes('window.__timelines["main"] = tl'));
    assert.throws(() => scaffoldFilm(dir), /--replace/);
    assert.equal(scaffoldFilm(dir, { replace: true }).status, "scaffolded");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("film check reports skipped gates with the command that unblocks them", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    fs.rmSync(path.join(dir, "index.html"));
    const result = checkFilmProject(dir);
    assert.equal(result.status, "incomplete");
    assert.deepEqual(result.steps.map((step) => [step.gate, step.status]), [["storyboard", "passed"], ["timeline", "skipped"], ["render", "skipped"], ["check", "passed"]]);
    assert.match(result.next, /hyperframes render/);
    assert.equal(result.creativeAcceptance, "not-assessed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("film check uses the capture hook, writes timeline.json, and aggregates fixes", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const probed = JSON.parse(fs.readFileSync(path.join(refs, "timeline.example.json"), "utf8"));
    probed.tweens = probed.tweens.filter((tween) => tween.startSec + tween.durationSec <= 3.8 || tween.startSec >= 8.8);
    const result = checkFilmProject(dir, { capture: () => probed });
    assert.ok(fs.existsSync(path.join(dir, "timeline.json")));
    const timeline = result.steps.find((step) => step.gate === "timeline");
    assert.equal(timeline.source, "captured from index.html");
    assert.equal(result.status, "failed");
    assert.ok(result.fixes.some((fix) => fix.code === "beat-static" && fix.beatId === "image-bloom" && fix.fix));
    const failing = checkFilmProject(dir, { capture: () => { throw new Error("no chrome"); } });
    const staleStep = failing.steps.find((step) => step.gate === "timeline");
    assert.match(staleStep.source, /capture failed: no chrome; used existing timeline.json/);
    assert.equal(staleStep.stale, true);
    assert.notEqual(failing.status, "passed", "a stale timeline can never make the check pass");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("film check without a storyboard tells the caller to scaffold", () => {
  const dir = tmp();
  try {
    assert.throws(() => checkFilmProject(dir), /film scaffold/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("CLI film scaffold and capture-timeline give actionable errors", () => {
  const dir = tmp();
  try {
    const scaffold = spawnSync(process.execPath, [cli, "film", "scaffold", "--root", dir, "--output", "promo"], { encoding: "utf8" });
    assert.equal(scaffold.status, 0, scaffold.stdout + scaffold.stderr);
    const again = spawnSync(process.execPath, [cli, "film", "scaffold", "--root", dir, "--output", "promo"], { encoding: "utf8" });
    assert.equal(again.status, 1);
    assert.match(again.stdout, /--replace/);
    // No puppeteer-core is installed next to this composition, so capture names the fix.
    const capture = spawnSync(process.execPath, [cli, "film", "capture-timeline", "--root", dir, "--composition", "promo/index.html", "--chrome", process.execPath], { encoding: "utf8" });
    assert.equal(capture.status, 1);
    assert.match(capture.stdout, /npm i hyperframes|puppeteer-core/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0;

test("film check reviews each beat frame's composition after render", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    fs.rmSync(path.join(dir, "index.html"));
    // A flat single-color render: every beat frame is blank, which the composition gate must fail.
    const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=0x101418:s=320x180:r=30:d=12", "-f", "lavfi", "-i", "sine=f=220:d=12", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", path.join(dir, "out.mp4")], { windowsHide: true, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const result = checkFilmProject(dir);
    const composition = result.steps.find((step) => step.gate === "composition");
    assert.equal(composition.status, "failed");
    assert.equal(composition.frames.length, 5);
    assert.ok(result.fixes.some((fix) => fix.gate === "composition" && fix.code === "blank-frame" && fix.severity === "error" && fix.beatId));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------- nondeterministic-source scan ----------

const { scanCompositionSource } = require("../skill/scripts/film-timeline-core.cjs");
const goldenTimeline = () => JSON.parse(fs.readFileSync(path.join(refs, "timeline.example.json"), "utf8"));
const page = (script, markup = "") => `<!doctype html>\n<html>\n  <body>\n${markup}\n    <script>\n${script}\n    </script>\n  </body>\n</html>\n`;

test("film check fails an index.html that reads Math.random, naming the file and line", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const lines = html.split("\n");
    const at = lines.findIndex((line) => line.includes("const P = window.FilmPatterns;"));
    lines.splice(at + 1, 0, "      const jitter = Math.random() * 4;");
    fs.writeFileSync(path.join(dir, "index.html"), lines.join("\n"));
    const result = checkFilmProject(dir, { capture: goldenTimeline });
    const timeline = result.steps.find((step) => step.gate === "timeline");
    assert.equal(timeline.status, "failed");
    const finding = timeline.findings.find((entry) => entry.code === "nondeterministic-source");
    assert.equal(finding.file, "index.html");
    assert.equal(finding.line, at + 2);
    assert.equal(finding.severity, "error");
    assert.match(finding.message, /index\.html:\d+ uses Math\.random/);
    assert.match(finding.fix, /hash\(seed, frameIndex\)/);
    assert.equal(result.status, "failed");
    assert.ok(result.fixes.some((fix) => fix.code === "nondeterministic-source" && fix.file === "index.html" && fix.line === at + 2));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the scaffolded index.html passes the source scan", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const result = checkFilmProject(dir, { capture: goldenTimeline });
    const timeline = result.steps.find((step) => step.gate === "timeline");
    assert.equal(timeline.status, "passed", JSON.stringify(timeline.findings));
    assert.deepEqual(timeline.sourceFiles, ["index.html"]);
    assert.ok(!timeline.findings.some((entry) => entry.code === "nondeterministic-source"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("seeded hash jitter passes; comments, strings and non-script text are ignored", () => {
  const script = [
    "      // Math.random() was removed; setTimeout is not used either.",
    "      /* Date.now() and",
    "         performance.now() are forbidden */",
    "      function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }",
    "      const hash = (seed, frameIdx) => mulberry32(seed * 7919 + frameIdx)();",
    "      const jitter = (frameIdx) => (hash(42, frameIdx) - 0.5) * 6;",
    "      const note = \"do not call Date.now() // or Math.random()\"; const url = 'https://example.com/requestAnimationFrame';",
    "      const tpl = `setInterval in text ${jitter(3)}`;",
  ].join("\n");
  assert.deepEqual(scanCompositionSource([{ file: "index.html", html: page(script, "    <p>never use Math.random in a film</p>\n    <!-- <audio autoplay src=\"a.wav\"></audio> -->\n    <style>.x::after { content: \"setTimeout\"; }</style>") }]).findings, []);
  const inTemplate = scanCompositionSource([{ file: "index.html", html: page("      const t = `frame ${Math.random()}`;") }]).findings;
  assert.equal(inTemplate.length, 1, "code inside a template expression is still scanned");
});

test("every nondeterministic source is reported with its own line; timers only warn", () => {
  const script = [
    "      const a = Math.random();",
    "      const b = Date.now();",
    "      const c = performance.now();",
    "      window.requestAnimationFrame(tick);",
    "      setTimeout(init, 10);",
    "      setInterval(tick, 16);",
  ].join("\n");
  const findings = scanCompositionSource([{ file: "index.html", html: page(script, "    <video src=\"a.mp4\" muted autoplay></video>\n    <audio id=\"s\" src=\"s.wav\" autoplay=\"\"></audio>\n    <video src=\"b.mp4\" data-autoplay=\"x\"></video>") }]).findings;
  assert.deepEqual(findings.map((entry) => [entry.line, entry.severity]), [[4, "error"], [5, "error"], [8, "error"], [9, "error"], [10, "error"], [11, "error"], [12, "warn"], [13, "warn"]]);
  assert.ok(findings.every((entry) => entry.code === "nondeterministic-source" && entry.fix));
  assert.deepEqual(findings.filter((entry) => /autoplays/.test(entry.message)).map((entry) => entry.line), [4, 5]);
});

test("compositions/*.html are scanned; a warning alone does not fail, a skipped timeline stays skipped", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    fs.mkdirSync(path.join(dir, "compositions"));
    fs.writeFileSync(path.join(dir, "compositions", "hero.html"), page("      setTimeout(() => {}, 10);"));
    let result = checkFilmProject(dir, { capture: goldenTimeline });
    let timeline = result.steps.find((step) => step.gate === "timeline");
    assert.deepEqual(timeline.sourceFiles, ["index.html", "compositions/hero.html"]);
    assert.equal(timeline.status, "passed");
    assert.deepEqual(timeline.findings.map((entry) => [entry.code, entry.severity, entry.file]), [["nondeterministic-source", "warn", "compositions/hero.html"]]);
    fs.writeFileSync(path.join(dir, "compositions", "hero.html"), page("      const x = Date.now();"));
    result = checkFilmProject(dir);
    timeline = result.steps.find((step) => step.gate === "timeline");
    assert.equal(timeline.status, "failed", "an error finding fails the step even without a captured timeline");
    assert.equal(timeline.findings[0].file, "compositions/hero.html");
    assert.equal(result.status, "failed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("local <script src> files are scanned; traversal, network and filesystem-absolute sources are never read", () => {
  const dir = tmp();
  const outside = tmp();
  const sibling = path.join(path.dirname(dir), `escape-${path.basename(dir)}.js`);
  try {
    scaffoldFilm(dir);
    fs.mkdirSync(path.join(dir, "js"));
    fs.writeFileSync(path.join(dir, "js", "jitter.js"), "// clean header\nconst n = 1;\nconst j = Math.random();\nconst quiet = \"Date.now\";\n");
    fs.writeFileSync(path.join(dir, "js", "clean.js"), "const hash = (seed, frameIdx) => (seed * 31 + frameIdx) % 7;\n");
    fs.writeFileSync(path.join(dir, "js", "gsap.min.js"), "Math.random();Date.now();");
    fs.writeFileSync(path.join(outside, "outside.js"), "Math.random();");
    fs.writeFileSync(sibling, "Math.random();");
    const rel = path.relative(dir, path.join(outside, "outside.js")).split(path.sep).join("/");
    const escapes = [`/../${path.basename(sibling)}`, `/js/../../${path.basename(sibling)}`];
    const filesystem = ["C:\\Users\\x\\a.js", "C:/Users/x/a.js", "\\\\host\\share\\a.js", "file:///tmp/a.js"];
    const tags = ["js/jitter.js?v=2", "js/clean.js", "js/gsap.min.js", "js/missing.js", rel, ...escapes, ...filesystem, "https://cdn.example.com/x.js", "//cdn.example.com/y.js"].map((src) => `<script src="${src}"></script>`).join("\n");
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace("</head>", `${tags}\n</head>`);
    fs.writeFileSync(path.join(dir, "index.html"), html);
    const result = checkFilmProject(dir, { capture: goldenTimeline });
    const timeline = result.steps.find((step) => step.gate === "timeline");
    assert.equal(timeline.status, "failed");
    const random = timeline.findings.filter((entry) => entry.code === "nondeterministic-source");
    assert.deepEqual(random.map((entry) => [entry.file, entry.line]), [["js/jitter.js", 3]]);
    assert.deepEqual(timeline.scriptFiles.sort(), ["js/clean.js", "js/jitter.js", "lib/audio-events.js", "lib/patterns.js"]);
    const warned = timeline.findings.filter((entry) => entry.code === "external-script-unscanned");
    assert.ok(warned.every((entry) => entry.severity === "warn"));
    assert.equal(warned.filter((entry) => /outside the project root/.test(entry.message)).length, 3, "relative traversal and both root-relative escapes");
    assert.ok(warned.some((entry) => /does not exist/.test(entry.message) && entry.message.includes("js/missing.js")));
    const reasons = Object.fromEntries(timeline.unscannedScripts.map((entry) => [entry.src, entry.reason]));
    assert.equal(reasons["https://cdn.example.com/x.js"], "network URL");
    assert.equal(reasons["//cdn.example.com/y.js"], "network URL");
    for (const src of filesystem) assert.equal(reasons[src], "filesystem absolute path", src);
    assert.equal(reasons["js/gsap.min.js"], "minified, not scanned");
    assert.ok(warned.some((entry) => /minified/.test(entry.message) && entry.message.includes("js/gsap.min.js") && entry.severity === "warn"), "a local minified script warns instead of being skipped silently");
    assert.ok(!random.some((entry) => entry.file === "js/gsap.min.js"), "minified content is not scanned");
    for (const src of [rel, ...escapes]) assert.equal(reasons[src], "outside project root", src);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); fs.rmSync(sibling, { force: true }); }
});

test("a root-relative <script src=\"/js/app.js\"> resolves against the project root, even from compositions/", () => {
  const dir = tmp();
  try {
    fs.mkdirSync(path.join(dir, "js"));
    fs.mkdirSync(path.join(dir, "compositions"));
    fs.writeFileSync(path.join(dir, "js", "app.js"), "const seed = 1;\nconst r = Math.random();\n");
    const hero = { file: "compositions/hero.html", html: "<script src=\"/js/app.js?v=3\"></script>\n" };
    const scan = scanCompositionSource([hero], { root: dir });
    assert.deepEqual(scan.findings.map((entry) => [entry.code, entry.severity, entry.file, entry.line]), [["nondeterministic-source", "error", "js/app.js", 2]]);
    assert.deepEqual(scan.scriptFiles, ["js/app.js"]);
    assert.deepEqual(scan.unscanned, []);
    const relative = scanCompositionSource([{ file: "compositions/hero.html", html: "<script src=\"../js/app.js\"></script>" }], { root: dir });
    assert.equal(relative.findings.length, 1, "a ../ src from compositions/ still lands inside the root");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a symlink inside the project that points outside is not read; clean local scripts pass", (t) => {
  const dir = tmp();
  const outside = tmp();
  try {
    scaffoldFilm(dir);
    fs.writeFileSync(path.join(outside, "leak.js"), "Math.random();");
    try { fs.symlinkSync(path.join(outside, "leak.js"), path.join(dir, "leak.js")); } catch { t.skip("symlinks unavailable"); return; }
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace("</head>", "<script src=\"leak.js\"></script>\n</head>");
    fs.writeFileSync(path.join(dir, "index.html"), html);
    const timeline = checkFilmProject(dir, { capture: goldenTimeline }).steps.find((step) => step.gate === "timeline");
    assert.ok(!timeline.findings.some((entry) => entry.code === "nondeterministic-source"));
    assert.ok(timeline.findings.some((entry) => entry.code === "external-script-unscanned" && /outside the project root/.test(entry.message)));
    assert.deepEqual(timeline.scriptFiles, ["lib/patterns.js", "lib/audio-events.js"], "the shipped patterns and adapter libraries are clean");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});

test("network scripts, including a CDN .min.js over http, https or //, are listed but never warn or fetch", () => {
  const dir = tmp();
  try {
    const urls = ["http://cdn.example.com/lib.min.js", "https://cdn.example.com/gsap.min.js", "//cdn.example.com/x.min.js", "HTTP://CDN.EXAMPLE.COM/y.js"];
    const html = urls.map((src) => `<script src="${src}"></script>`).join("\n");
    const scan = scanCompositionSource([{ file: "index.html", html }], { root: dir });
    assert.deepEqual(scan.findings, [], "no warning or error for network scripts");
    assert.deepEqual(scan.scriptFiles, []);
    assert.deepEqual(scan.unscanned.map((entry) => [entry.src, entry.reason]), urls.map((src) => [src, "network URL"]));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------- music-driven scaffold: chrome, style table, instrument skeletons, notes ----------

const vm = require("node:vm");
const { CALLS, compositionHtml } = require("../skill/scripts/film-project-core.cjs");
const { summarizeGrid } = require("../skill/scripts/score-core.cjs");
const FilmAudio = require(path.join(refs, "audio-events.js"));
const FilmPatterns = require(path.join(refs, "patterns.js"));
const registry = JSON.parse(fs.readFileSync(path.join(refs, "registry.json"), "utf8"));
const INSTRUMENTS = ["audio-meter", "event-scope", "tick-ticker", "grid-pulse", "build-countdown", "hold-then-hit"];
const exampleBoard = () => JSON.parse(fs.readFileSync(path.join(refs, "storyboard.example.json"), "utf8"));

// Runs the composition's own inline script against the real kit and adapter with a recording
// timeline. It shows what the page would ask GSAP for, not what a browser would paint.
function runComposition(html, audio = FilmAudio) {
  const script = html.match(/<script>\n([\s\S]*?)\n\s*<\/script>/)[1];
  const calls = [];
  const properties = {};
  const record = (method) => (...args) => { calls.push({ method, args }); };
  const tl = { set: record("set"), to: record("to"), fromTo: record("fromTo"), seek: () => {} };
  const window = { FilmPatterns, __timelines: {} };
  const document = { documentElement: { style: { setProperty: (name, value) => { properties[name] = value; } } } };
  vm.runInNewContext(script, { gsap: { timeline: () => tl }, window, document, FilmAudio: audio });
  return { calls, properties, tl, window };
}

// Six 2 s windows, one per instrument; a kick on every second, claps and hats in between.
function instrumentBoard() {
  const board = exampleBoard();
  const template = board.beats[0];
  board.beats = INSTRUMENTS.map((choreography, index) => ({ ...template, id: `plate-${index + 1}`, startSec: index * 2, endSec: index * 2 + 2, choreography }));
  board.durationSec = 12;
  return board;
}
function instrumentGrid() {
  const events = [];
  for (let second = 0; second < 12; second += 1) {
    events.push({ atSec: second, durSec: 0.25, value: { s: "sine", note: "c1", gain: 0.7 } });
    events.push({ atSec: second + 0.5, durSec: 0.08, value: { s: "white", gain: 0.25 } });
    events.push({ atSec: second + 0.25, durSec: 0.03, value: { s: "white", gain: 0.12 } });
  }
  return summarizeGrid(events, { bpm: 120, cps: 0.5, durationSec: 12 });
}

test("every CALLS key is a registry pattern id, and every instrument has a skeleton", () => {
  const ids = registry.patterns.map((entry) => entry.id);
  for (const key of Object.keys(CALLS)) assert.ok(ids.includes(key), `${key} is not a registry pattern id`);
  assert.deepEqual(registry.patterns.filter((entry) => entry.kind === "instrument").map((entry) => entry.id).sort(), [...INSTRUMENTS].sort());
  for (const id of INSTRUMENTS) assert.equal(typeof CALLS[id], "function", id);
});

test("the scaffold ships the adapter and the chrome, links the chrome before the film's style, and loads the kit scripts in order", () => {
  const dir = tmp();
  try {
    const result = scaffoldFilm(dir);
    for (const name of ["lib/audio-events.js", "lib/instrument-chrome.css"]) assert.ok(result.files.includes(name), name);
    assert.equal(fs.readFileSync(path.join(dir, "lib/audio-events.js"), "utf8"), fs.readFileSync(path.join(refs, "audio-events.js"), "utf8"));
    assert.equal(fs.readFileSync(path.join(dir, "lib/instrument-chrome.css"), "utf8"), fs.readFileSync(path.join(refs, "instrument-chrome.css"), "utf8"));
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const at = (needle) => { const index = html.indexOf(needle); assert.ok(index >= 0, needle); return index; };
    assert.ok(at('<link rel="stylesheet" href="lib/instrument-chrome.css"') < at("<style>"), "the film's own style comes after the chrome, so its overrides win by order");
    assert.ok(at('<script src="lib/patterns.js"></script>') < at("<style>"));
    assert.ok(at('<script src="lib/audio-events.js"></script>') < at("<style>"));
    assert.ok(at('<!-- <script src="lib/score-grid.js"></script> -->') > at('<!-- <audio id="score"'), "the grid script is offered as a comment after the audio line");
    assert.ok(!/^\s*<script src="lib\/score-grid\.js">/m.test(html), "not live until film score has written the file");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the style table is the palette's one source: it equals the chrome defaults and is applied to the --fk- properties", () => {
  const html = compositionHtml(exampleBoard());
  assert.equal(html.match(/const STYLE = /g).length, 1, "one style table");
  const { properties, calls, tl, window } = runComposition(html);
  const colours = registry.chrome.properties.filter((property) => /^#[0-9a-f]{6}$/i.test(property.default));
  assert.equal(colours.length, 6);
  assert.deepEqual(properties, Object.fromEntries(colours.map((property) => [property.name, property.default])));
  assert.ok(calls.length > 0 && window.__timelines.main === tl);
});

test("every instrument skeleton runs against the real kit and adapter, and the style table's literals are what the calls receive", () => {
  FilmAudio.setGrid(instrumentGrid());
  const html = compositionHtml(instrumentBoard());
  assert.match(html, /^      const audio = FilmAudio\.fromScoreGrid\(\);/m, "a page that names an instrument reads the grid; the commented line is for the plain scaffold");
  const { calls, properties } = runComposition(html);
  const tweens = calls.filter((call) => call.method !== "seek");
  const on = (selector) => tweens.filter((call) => call.args[0] === selector);
  assert.equal(on("#METER .fk-meter__bar")[1].args.at(-1), 0, "the meter's first attack is on the kick at 0 s");
  assert.ok(on("#FLASH").length > 0 && on("#STAGE").length > 0, "hold-then-hit reached its overlay and stage");
  assert.ok(tweens.some((call) => call.args[0] === "#COUNT .fk-readout__value" && call.method === "to"), "the countdown is one to tween");
  const colours = new Set();
  for (const call of tweens) for (const vars of call.args.slice(1, -1)) for (const key of ["backgroundColor", "color"]) if (vars && vars[key] !== undefined) colours.add(vars[key]);
  assert.ok(colours.size > 0);
  for (const colour of colours) assert.ok(Object.values(properties).includes(colour), `${colour} is not in the style table`);
  assert.ok([...colours].every((colour) => !/var\(/.test(colour)));
  assert.ok(colours.has(properties["--fk-rest"]) && colours.has(properties["--fk-accent"]), "grid-pulse rest and lit");
  assert.ok(colours.has(properties["--fk-text"]) && colours.has(properties["--fk-alert"]), "countdown textColor and alert");
});

test("an instrument page without a loaded grid throws the adapter's fix, and the plain scaffold needs no grid", () => {
  assert.ok(runComposition(compositionHtml(exampleBoard())).calls.length > 0, "the plain scaffold runs without a grid");
  const adapter = path.join(refs, "audio-events.js");
  delete require.cache[require.resolve(adapter)];
  const fresh = require(adapter);
  delete require.cache[require.resolve(adapter)];
  assert.throws(() => runComposition(compositionHtml(instrumentBoard()), fresh), /designer-pipeline film score/);
});

test("a scaffolded project with instrument beats passes the source scan with no findings", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    fs.writeFileSync(path.join(dir, "index.html"), compositionHtml(instrumentBoard()));
    const timeline = checkFilmProject(dir, { capture: goldenTimeline }).steps.find((step) => step.gate === "timeline");
    assert.deepEqual(timeline.findings.filter((entry) => entry.code === "nondeterministic-source" || entry.code === "external-script-unscanned" && !/cdn\.jsdelivr/.test(entry.message)), []);
    assert.deepEqual(timeline.scriptFiles, ["lib/patterns.js", "lib/audio-events.js"]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("sound.md carries the song-map table with the Section column, qa.md the music-driven review, FILM.md the treatment step", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const sound = fs.readFileSync(path.join(dir, "sound.md"), "utf8");
    assert.match(sound, /^\| Beat id \| Window \(s\) \| Bars \| Section \| Music event \| Motion response \|$/m);
    const rows = sound.split("\n").filter((line) => line.startsWith("|"));
    assert.ok(rows.length >= 3);
    for (const row of rows) assert.equal(row.split("|").length - 2, 6, `every song-map row has six cells: ${row}`);
    assert.match(sound, /BPM, bar length \(s\), start of bar 1 \(s\)/);
    const qa = fs.readFileSync(path.join(dir, "qa.md"), "utf8");
    assert.match(qa, /^## Music-driven review/m);
    for (const rule of ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]) assert.match(qa, new RegExp(`^- ${rule} `, "m"), rule);
    assert.ok(qa.indexOf("## Music-driven review") > qa.indexOf("## Creative review") && qa.indexOf("## Music-driven review") < qa.indexOf("## User acceptance"));
    const film = fs.readFileSync(path.join(dir, "FILM.md"), "utf8");
    assert.match(film, /`## Treatment` under the chosen card of concepts\.md/);
    assert.ok(!fs.existsSync(path.join(dir, "concepts.md")), "concepts.md belongs to the concept stage; writing it would end that stage early");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
