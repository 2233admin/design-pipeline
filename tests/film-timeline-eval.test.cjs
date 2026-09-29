"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkTimeline, scanCompositionSource } = require("../skill/scripts/film-timeline-core.cjs");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");
const { checkGridAlignment } = require("../skill/scripts/score-core.cjs");
const { measureFilmBenchmark } = require("../skill/scripts/film-eval-core.cjs");
const { evaluateBenchmark } = require("../skill/scripts/benchmark-core.cjs");
const { probe } = require("../skill/references/film-choreography/timeline-probe.js");

const refs = path.join(__dirname, "../skill/references/film-choreography");
const evals = path.join(__dirname, "../skill/evals/film");
const load = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const board = () => load(path.join(refs, "storyboard.example.json"));
const timeline = () => load(path.join(refs, "timeline.example.json"));
const codes = (result) => result.findings.map((finding) => finding.code);

function slideshowTimeline() {
  const tweens = [{ targets: ["#bg"], startSec: 0, durationSec: 12, props: ["x"] }];
  board().beats.forEach((beat, index) => {
    tweens.push({ targets: [`#p${index}`], startSec: beat.startSec, durationSec: 0.4, props: ["opacity"] });
    tweens.push({ targets: [`#p${index}`], startSec: beat.endSec - 0.4, durationSec: 0.4, props: ["opacity"] });
  });
  return { schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 12, tweens };
}

test("probed golden timeline (real GSAP + shipped patterns) passes and carries every planned handoff", () => {
  const result = checkTimeline(timeline(), board());
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.equal(result.metrics.carriedHandoffs, 1);
  assert.equal(result.creativeAcceptance, "not-assessed");
});

test("fade-in/fade-out panel timeline fails even behind an ambient background tween", () => {
  const result = checkTimeline(slideshowTimeline(), board());
  assert.equal(result.status, "failed");
  assert.deepEqual(result.metrics.ambientTargets, ["#bg"]);
  assert.equal(result.metrics.fadeOnlyActionBeats, 4);
  assert.ok(codes(result).includes("handoff-not-carried"));
});

test("layout tweens, infinite repeats, static beats and duration drift are reported", () => {
  const data = timeline();
  data.tweens.push({ targets: ["#card"], startSec: 1, durationSec: 0.5, props: ["width"] });
  data.tweens.push({ targets: ["#spinner"], startSec: 2, durationSec: 0.5, props: ["rotation"], repeat: -1 });
  data.durationSec = 12.5;
  const result = checkTimeline(data, board());
  for (const code of ["layout-tween", "infinite-repeat", "duration-mismatch"]) assert.ok(codes(result).includes(code), code);
  const empty = timeline();
  empty.tweens = empty.tweens.filter((tween) => tween.startSec + tween.durationSec <= 3.8 || tween.startSec >= 8.8);
  assert.ok(checkTimeline(empty, board()).findings.some((finding) => finding.code === "beat-static" && finding.beatId === "image-bloom"));
});

test("malformed timelines are contract errors", () => {
  assert.throws(() => checkTimeline({ ...timeline(), schema: "x" }), /schema/);
  const data = timeline();
  data.tweens[0].startSec = -1;
  assert.throws(() => checkTimeline(data, board()), /non-negative/);
});

test("probe flattens nested timelines with absolute times and strips control vars", () => {
  const tween = (targets, start, duration, vars) => ({ startTime: () => start, duration: () => duration, targets: () => targets, vars, repeat: () => vars.repeat || 0 });
  const nested = { startTime: () => 2, duration: () => 1, timeScale: () => 1, getChildren: () => [tween([{ id: "b" }], 0.5, 0.5, { x: 10, ease: "none", startAt: { x: 0 } })] };
  const root = { duration: () => 3, timeScale: () => 1, getChildren: () => [tween([{ id: "a" }], 0, 1, { opacity: 1, duration: 1, onComplete() {} }), nested] };
  const manifest = probe(root, "main");
  assert.equal(manifest.durationSec, 3);
  assert.deepEqual(manifest.tweens.map((t) => [t.targets[0], t.startSec, t.props.join()]), [["#a", 0, "opacity"], ["#b", 2.5, "x"]]);
  assert.deepEqual(manifest.tweens[1].from, { x: 0 });
  assert.throws(() => probe({}), /GSAP timeline/);
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0;

function synthesize(file) {
  // Segment durations (not equal 3s/3s/3s/3s) so the actual scene cuts at 2/5/8s land clear of
  // the golden storyboard's carried-boundary beat starts (1.6/3.8/8.8/10.6s).
  const durations = [2, 3, 3, 4];
  const cuts = [2, 5, 8];
  const inputs = ["red", "blue", "green", "yellow"].flatMap((color, index) => ["-f", "lavfi", "-i", `color=c=${color}:s=160x90:r=30:d=${durations[index]}[bg];color=c=white:s=20x20:r=30:d=${durations[index]}[b];[bg][b]overlay=x='mod(t*60,140)':y=30`]);
  const clicks = cuts.map((at) => `between(t,${at},${at + 0.03})*0.9*sin(2*PI*1000*t)`).join("+");
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-f", "lavfi", "-i", `aevalsrc='0.01*sin(2*PI*220*t)+${clicks}':s=8000:d=12`,
    "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[v]", "-map", "[v]", "-map", "4:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", file], { windowsHide: true, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
}

test("film benchmark manifest is a valid v2 benchmark whose brief hides private expectations", () => {
  const manifest = load(path.join(evals, "film-benchmark.json"));
  const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
  const run = spawnSync(process.execPath, [cli, "benchmark", "brief", "--manifest", path.join(evals, "film-benchmark.json"), "--root", path.join(__dirname, "..")], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.ok(!run.stdout.includes("privateExpectations"));
  assert.ok(run.stdout.includes("music-driven-launch"), "the blind brief lists the new scenario");
  assert.equal(manifest.scenarios.length, 4);
  const scenario = manifest.scenarios.find((entry) => entry.id === "music-driven-launch");
  assert.ok(scenario, "the music-driven scenario is registered");
  assert.equal(scenario.required, false, "a required scenario would block every existing run until it was measured");
  assert.equal(scenario.evidenceType, "film-gates");
  assert.ok(manifest.scenarios.filter((entry) => entry.id !== "music-driven-launch").every((entry) => entry.required === true), "the three v1 scenarios stay required");
  const fixture = load(path.join(evals, "slideshow.storyboard.json"));
  assert.equal(checkStoryboard(fixture).status, "failed", "repair fixture must start broken");
});

test("an unmeasured optional scenario neither blocks nor fails the benchmark", () => {
  const manifest = load(path.join(evals, "film-benchmark.json"));
  const measured = Object.fromEntries(manifest.scenarios.filter((entry) => entry.required).map((entry) => [entry.id, { score: 1, evidence: ["measured"] }]));
  const result = evaluateBenchmark(manifest, { schema: "design-pipeline.benchmark-measurements.v2", benchmarkId: manifest.id, measurements: Object.fromEntries(manifest.systems.map((system) => [system, measured])) });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.unknownRequired, []);
  assert.ok(result.scenarios.filter((entry) => entry.id === "music-driven-launch").every((entry) => entry.status === "unknown" && entry.required === false), "the optional scenario stays unknown");
});

test("film-eval measures systems through the film gates and benchmark evaluate ranks them", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-eval-"));
  try {
    const manifest = load(path.join(evals, "film-benchmark.json"));
    const put = (system, scenario, files) => {
      const target = path.join(dir, system, scenario);
      fs.mkdirSync(target, { recursive: true });
      for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(target, name), typeof value === "string" ? value : JSON.stringify(value));
      return target;
    };
    for (const scenario of manifest.scenarios) {
      const good = put("claude", scenario.id, { "storyboard.json": board(), "timeline.json": timeline() });
      synthesize(path.join(good, "out.mp4"));
      put("codex", scenario.id, { "storyboard.json": load(path.join(evals, "slideshow.storyboard.json")), "timeline.json": slideshowTimeline() });
    }
    put("omp", "canvas-launch", { "storyboard.json": "{not json" });

    const measurements = measureFilmBenchmark(manifest, dir);
    assert.equal(measurements.schema, "design-pipeline.benchmark-measurements.v2");
    assert.equal(measurements.measurements.claude["canvas-launch"].score, 1);
    assert.ok(measurements.measurements.codex["canvas-launch"].score < 0.4);
    assert.equal(measurements.measurements.omp["canvas-launch"].score, 0);
    assert.equal(measurements.measurements.omp["cli-launch"], undefined);

    const result = evaluateBenchmark(manifest, measurements);
    assert.equal(result.status, "blocked", "unmeasured omp scenarios block the benchmark");
    const system = (name) => result.systems.find((entry) => entry.system === name);
    assert.equal(system("claude").status, "passed");
    assert.equal(system("codex").status, "failed");
    assert.ok(result.unknownRequired.includes("omp/cli-launch"));

    const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
    fs.copyFileSync(path.join(evals, "film-benchmark.json"), path.join(dir, "manifest.json"));
    const run = spawnSync(process.execPath, [cli, "film-eval", "measure", "--root", dir, "--manifest", "manifest.json", "--runs", ".", "--output", "measurements.json"], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(load(path.join(dir, "measurements.json")).measurements.claude["repair-slideshow"].score, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a one-take subject animated by a chain of actions stays a subject, not an ambient target", () => {
  const boundaries = board().beats.slice(1).map((beat) => beat.startSec);
  const edges = [0, ...boundaries, 12];
  const tweens = [{ targets: ["#bg"], startSec: 0, durationSec: 12, props: ["x"] }];
  // One action per beat on the same element, each overlapping the next boundary slightly.
  for (let index = 0; index < edges.length - 1; index += 1) {
    const start = Math.max(0, edges[index] - 0.1);
    const end = Math.min(12, edges[index + 1] + 0.1);
    tweens.push({ targets: ["#hero"], startSec: start, durationSec: Number((end - start).toFixed(3)), props: ["x", "y", "rotation"] });
  }
  const result = checkTimeline({ schema: "design-pipeline.film-timeline.v1", compositionId: "main", durationSec: 12, tweens }, board());
  assert.deepEqual(result.metrics.ambientTargets, ["#bg"], "only the single long drift is ambient");
  assert.ok(!codes(result).includes("handoff-not-carried"), JSON.stringify(result.findings));
});

// ---------- music-driven golden case (skill/evals/film/music-driven) ----------

const golden = path.join(evals, "music-driven");
const FilmPatterns = require(path.join(refs, "patterns.js"));
const FilmAudio = require(path.join(refs, "audio-events.js"));
const goldenBuild = require(path.join(golden, "build.js"));
const registry = load(path.join(refs, "registry.json"));
const goldenBoard = () => load(path.join(golden, "storyboard.json"));
const pageSource = () => fs.readFileSync(path.join(golden, "index.html"), "utf8");

// The pattern's events come from regenerate-grid.cjs, the one model that also writes the fixture:
// Strudel is AGPL and cannot run inside the suite, so the model states the same twelve bars row by
// row (README, "Fixture provenance"). The fixture must deep-equal summarizeGrid of those events.
const { goldenGrid } = require(path.join(golden, "regenerate-grid.cjs"));

// The literal tables of the page: the same STYLE and GROUND the page applies and build.js reads.
function pageTable(name) {
  const match = new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n      \\});`).exec(pageSource());
  assert.ok(match, `index.html declares ${name}`);
  return new Function(`return ${match[1]};`)();
}

// A recorder timeline: what the real probe reads from real GSAP tweens.
function recorderTimeline() {
  const calls = [];
  const add = (target, from, vars, position) => calls.push({ target, from, vars, position });
  const tl = {
    set: (target, vars, position) => add(target, null, { ...vars, duration: 0 }, position),
    to: (target, vars, position) => add(target, null, vars, position),
    fromTo: (target, from, vars, position) => add(target, from, vars, position),
  };
  const children = () => calls.map((call) => ({ startTime: () => call.position, duration: () => call.vars.duration || 0, targets: () => [call.target], vars: call.from ? { ...call.vars, startAt: call.from } : call.vars, repeat: () => 0 }));
  const root = () => ({ duration: () => Math.max(0, ...calls.map((call) => call.position + (call.vars.duration || 0))), timeScale: () => 1, getChildren: children });
  return { tl, calls, root };
}

function buildGolden() {
  const audio = FilmAudio.fromScoreGrid(load(path.join(golden, "score-grid.json")));
  const recorded = recorderTimeline();
  const end = goldenBuild.build(recorded.tl, { FilmPatterns, FilmAudio, audio, GROUND: pageTable("GROUND") });
  return { ...recorded, end };
}

test("golden storyboard passes the storyboard gate with no finding, warnings included", () => {
  const result = checkStoryboard(goldenBoard());
  assert.equal(result.status, "passed");
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.metrics.plannedCutsSec, [2, 10, 14, 20, 22]);
  assert.equal(result.metrics.cadenceRatio, 4, "plate lengths 2, 8, 4, 6, 2, 2 clear uniform-cadence");
  assert.equal(goldenBoard().durationSec, 24);
});

test("golden score grid equals summarizeGrid of the pattern's events, and the storyboard's cuts and cues sit on it", () => {
  const fixture = load(path.join(golden, "score-grid.json"));
  assert.deepEqual(fixture, goldenGrid(), "run node skill/evals/film/music-driven/regenerate-grid.cjs");
  assert.equal(fixture.bpm, 120);
  assert.equal(fixture.durationSec, 24);
  assert.deepEqual(checkGridAlignment(goldenBoard(), fixture).findings, []);
});

test("golden build passes the timeline gate through the real probe with no finding and ends at 24 s", () => {
  const { calls, root, end } = buildGolden();
  assert.equal(end, 24);
  const manifest = probe(root(), "main");
  assert.ok(Math.abs(manifest.durationSec - 24) < 0.001, `timeline ends at ${manifest.durationSec}`);
  const result = checkTimeline(manifest, goldenBoard());
  assert.deepEqual(result.findings, [], "no error and no warning");
  assert.equal(result.status, "passed");
  assert.ok(calls.length > 300 && calls.length < 700, `${calls.length} tweens`);
  const beats = new Map(result.metrics.beats.map((entry) => [entry.id, entry]));
  for (const id of ["type-on-pad", "cells-on-kick", "countdown-build", "drop-impact", "break-settle"]) {
    assert.ok(beats.get(id).tweens > 0 && !beats.get(id).props.every((prop) => ["opacity", "scale"].includes(prop)), `${id} moves more than opacity and scale`);
  }
  // The music is answered where the song map says: each section's instruments tween only inside its window.
  const window = { "#intro-log-col": [0, 2], "#cell0": [2, 10], "#queue-bar": [2, 10], "#jobs-col": [2, 10], "#w1-bar": [2, 10], "#w2-bar": [2, 10], "#w3-bar": [2, 10], "#count-value": [10, 14], "#depth-bar": [10, 14], "#w4-bar": [10, 14], "#render-col": [10, 14], "#frame0": [14, 20], "#clap-bar": [14, 20], "#bass-bar": [14, 20], "#wa-bar": [14, 20], "#wb-bar": [14, 20], "#trace0": [20, 22], "#wordmark": [22, 24] };
  for (const tween of manifest.tweens) {
    const range = window[tween.targets[0]];
    if (range && tween.durationSec > 0) assert.ok(tween.startSec >= range[0] - 1e-9 && tween.startSec + tween.durationSec <= range[1] + 1e-9, `${tween.targets[0]} tweens ${tween.startSec}+${tween.durationSec} outside ${range}`);
  }
  // R3: nothing but the countdown's explicit hold moves in the 0.5 s before the drop and in the 0.6 s before the stab.
  for (const [from, to] of [[13.5, 14], [21.4, 22]]) {
    const moving = manifest.tweens.filter((tween) => tween.durationSec > 0 && !tween.driver && tween.startSec < to - 1e-9 && tween.startSec + tween.durationSec > from + 1e-9);
    assert.deepEqual(moving.map((tween) => tween.targets[0]), moving.filter((tween) => tween.targets[0] === "#count-value").map((tween) => tween.targets[0]), `only the countdown tween may span ${from}-${to}`);
  }
  // The still moments are still: a lane whose last hit is cut off by `until` would freeze mid-release and show as a
  // stray spike in the hold, so every lane that ends before a hold must end at its rest state.
  for (const target of [...Array.from({ length: 24 }, (_, index) => `#trace${index}`), "#depth-bar", "#w4-bar"]) {
    const mine = calls.filter((call) => call.target === target);
    const rest = mine.find((call) => call.vars.duration === 0).vars.clipPath;
    const last = mine.filter((call) => call.vars.duration > 0).sort((a, b) => a.position + a.vars.duration - (b.position + b.vars.duration)).pop();
    assert.equal(last.vars.clipPath, rest, `${target} ends at ${last.vars.clipPath}, not at rest ${rest}`);
  }
});

test("golden page uses only documented chrome classes and custom properties, and its build targets exist", () => {
  const html = pageSource();
  const chrome = registry.chrome;
  const documented = new Set(chrome.recipes.map((recipe) => recipe.class));
  const used = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((match) => match[1].split(/\s+/)).filter((name) => name.startsWith(chrome.prefix)));
  assert.ok(used.size >= 15, "the page uses the recipes");
  assert.deepEqual([...used].filter((name) => !documented.has(name)), [], "every fk- class is a documented recipe");
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join("\n");
  assert.ok(![...css.matchAll(/\.(fk-[\w-]+)/g)].some((match) => !documented.has(match[1])), "the film's CSS names only documented recipes");
  const properties = new Set(chrome.properties.map((property) => property.name));
  const style = pageTable("STYLE");
  const ground = pageTable("GROUND");
  const named = new Set([...html.matchAll(/--fk-[a-z-]+/g)].map((match) => match[0]));
  for (const key of Object.keys(style)) named.add(`--fk-${key}`);
  for (const table of Object.values(ground)) for (const key of Object.keys(table)) named.add(`--fk-${key}`);
  assert.deepEqual([...named].filter((name) => !properties.has(name)), [], "every --fk- custom property is documented");
  // The palette has one source: the ground tables re-scope colour slots only, and the base table sets every colour slot.
  const colours = ["ink", "line", "text", "rest", "accent", "alert"];
  for (const key of colours) assert.match(style[key], /^#[0-9a-f]{6}$/i, `STYLE.${key} is a literal colour`);
  for (const [name, table] of Object.entries(ground)) assert.deepEqual(Object.keys(table).sort(), [...colours].sort(), `GROUND.${name} fills the six colour slots`);
  const grounds = Object.values(ground).map((table) => table.ink);
  for (let index = 1; index < grounds.length; index += 1) assert.notEqual(grounds[index], grounds[index - 1], `plates ${index} and ${index + 1} share a ground, so their cut would be invisible (R7)`);
  // Nothing in the film's own CSS may fight the timeline.
  for (const construct of [/\banimation\b/, /\btransition\b/, /@keyframes/, /@import/, /@font-face/, /url\(/, /clip-path/, /\btransform\s*:/, /(?<!repeating-linear)-gradient/]) assert.doesNotMatch(css, construct, `the film's CSS declares ${construct}`);
  // Every element the build tweens exists once in the page.
  const { calls } = buildGolden();
  const ids = [...new Set(calls.map((call) => call.target).filter((target) => typeof target === "string"))];
  assert.ok(ids.length >= 50);
  // The node canvas is live, not decoration: every wire's signal bar is driven by the build, and a wire ends in ports.
  const wires = [...html.matchAll(/lw-wire[^"]*"[^>]*><div class="fk-meter__track"><div id="([\w-]+)"/g)].map((match) => match[1]);
  assert.ok(wires.length >= 6, `${wires.length} wires`);
  for (const wire of wires) assert.ok(ids.includes(`#${wire}`), `wire ${wire} is driven by an instrument`);
  assert.ok(html.split('class="lw-port ').length - 1 >= wires.length * 2, "every wire has a port at each end");
  for (const target of ids) {
    assert.match(target, /^#[\w-]+$/, `${target} is an id selector`);
    assert.equal(html.split(`id="${target.slice(1)}"`).length - 1, 1, `${target} exists once in index.html`);
  }
  // Clip windows equal the storyboard's beats.
  const clips = [...html.matchAll(/<section id="plate-(\w+)" class="clip plate[\w -]*" data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map((match) => [Number(match[2]), Number(match[2]) + Number(match[3])]);
  assert.deepEqual(clips, goldenBoard().beats.map((beat) => [beat.startSec, beat.endSec]));
});

test("golden page and build pass the source scan", () => {
  const html = pageSource();
  const script = fs.readFileSync(path.join(golden, "build.js"), "utf8");
  const scan = scanCompositionSource([{ file: "index.html", html }, { file: "build.js", html: `<script>${script}</script>` }]);
  assert.deepEqual(scan.findings, []);
  assert.ok(html.indexOf("lib/audio-events.js") < html.indexOf("lib/score-grid.js") && html.indexOf("lib/score-grid.js") < html.indexOf("build.js"), "the adapter loads before the grid, the grid before the build");
  assert.ok(html.indexOf("lib/instrument-chrome.css") < html.indexOf("<style>"), "the chrome is linked before the film's own style");
});

test("golden song map and treatment agree with the storyboard, the page and the score", () => {
  const board = goldenBoard();
  const sound = fs.readFileSync(path.join(golden, "sound.md"), "utf8");
  assert.match(sound, /BPM 120, bar length 2\.0 s, bar 1 starts at 0 s/, "the header states the tempo facts the windows are computed from");
  const rows = sound.split("\n").filter((line) => /^\| `/.test(line)).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  assert.ok(sound.includes("| Beat id | Window (s) | Bars | Section | Music event | Motion response |"), "song map columns");
  assert.deepEqual(rows.map((row) => row[0].replace(/`/g, "")), board.beats.map((beat) => beat.id), "one row per beat, in storyboard order");
  const barSec = 60 / 120 * 4;
  const sections = ["intro", "groove", "build", "drop", "break", "outro"];
  rows.forEach((row, index) => {
    const beat = board.beats[index];
    assert.equal(row[1], `${beat.startSec}-${beat.endSec}`, `${beat.id} window`);
    const [first, last = first] = row[2].split("-").map(Number);
    assert.deepEqual([(first - 1) * barSec, last * barSec], [beat.startSec, beat.endSec], `${beat.id} bars ${row[2]} are its window`);
    assert.equal(row[3], sections[index], `${beat.id} section`);
    for (const cue of beat.soundCues) if (board.sound.cues.find((entry) => entry.id === cue).kind !== "exit") assert.ok(row[4].includes(cue), `${beat.id} names its cue ${cue}`);
  });
  const treatment = fs.readFileSync(path.join(golden, "treatment.md"), "utf8");
  const ids = new Set(registry.patterns.map((pattern) => pattern.id));
  for (const beat of board.beats) {
    const brief = treatment.split(`### ${beat.id}\n`)[1];
    assert.ok(brief, `a plate brief for ${beat.id}`);
    const own = brief.split("\n### ")[0];
    for (const kit of beat.motion.filter((entry) => ids.has(entry))) assert.ok(own.includes(`\`${kit}\``), `${beat.id}'s brief names ${kit}`);
    for (const cue of beat.soundCues) assert.ok(own.includes(`\`${cue}\``), `${beat.id}'s brief names its cue ${cue}`);
    assert.ok(own.includes(`primary \`${beat.choreography}\``), `${beat.id}'s brief names its primary kit id`);
  }
  const literals = [...Object.values(pageTable("STYLE")), ...Object.values(pageTable("GROUND")).flatMap((table) => Object.values(table))].filter((value) => /^#[0-9a-f]{6}$/i.test(value));
  for (const literal of new Set(literals)) assert.ok(treatment.includes(`\`${literal}\``), `the style-bible seed lists ${literal}`);
  assert.match(treatment, /^- Must not copy:/m, "the seed carries a must-not-copy line");
});
