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
const { GSAP_VERSION, HYPERFRAMES_VERSION, hyperframesCli } = require("../skill/scripts/film-capture-core.cjs");
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
    for (const name of ["package.json", "storyboard.json", "index.html", "lib/patterns.js", "lib/timeline-probe.js", "reference.md", "sound.md", "qa.md", "FILM.md"]) assert.ok(fs.existsSync(path.join(dir, name)), name);
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

test("scaffold pins the reviewed runtime and loads GSAP from the local install", () => {
  const dir = tmp();
  try {
    const result = scaffoldFilm(dir, { id: "My Film" });
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    assert.deepEqual(pkg.devDependencies, { gsap: GSAP_VERSION, hyperframes: HYPERFRAMES_VERSION });
    assert.equal(pkg.private, true);
    assert.equal(pkg.name, "my-film");
    assert.deepEqual(result.runtime, { gsap: "3.15.0", hyperframes: "0.8.137", install: "npm install", run: "npx --no-install hyperframes" });
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    assert.doesNotMatch(html, /https?:\/\//, "render and capture need no network");
    assert.ok(html.includes('<script src="node_modules/gsap/dist/gsap.min.js"></script>'));
    const guide = fs.readFileSync(path.join(dir, "FILM.md"), "utf8");
    assert.match(guide, /1\. `npm install` once/);
    assert.match(guide, /npx --no-install hyperframes render/);
    assert.doesNotMatch(guide, /`npx hyperframes/);
    assert.match(result.next[0], /hyperframes@0\.8\.137 and gsap@3\.15\.0/);
    // Replacing keeps the project's own package fields and only sets the pins.
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "kept", scripts: { render: "custom" }, devDependencies: { hyperframes: "^0.8.145", sharp: "1.0.0" } }));
    scaffoldFilm(dir, { replace: true });
    const merged = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    assert.equal(merged.name, "kept");
    assert.equal(merged.scripts.render, "custom");
    assert.deepEqual(merged.devDependencies, { hyperframes: "0.8.137", sharp: "1.0.0", gsap: "3.15.0" });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("every HyperFrames call defaults to the reviewed release", () => {
  assert.equal(hyperframesCli(), "hyperframes@0.8.137");
  assert.equal(hyperframesCli("0.9.0"), "hyperframes@0.9.0");
  const reviewed = fs.readFileSync(path.join(__dirname, "../skill/references/hyperframes.md"), "utf8");
  assert.ok(reviewed.includes(`Reviewed release: \`hyperframes@${HYPERFRAMES_VERSION}\``));
  for (const file of ["film-capture-core.cjs", "film-blocks-core.cjs"]) assert.doesNotMatch(fs.readFileSync(path.join(scripts, file), "utf8"), /: "hyperframes";/, file);
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

test("CLI motion study scaffolds runnable dependencies and preserves notes on replacement", () => {
  const dir = tmp();
  try {
    const result = spawnSync(process.execPath, [cli, "film", "scaffold", "--root", dir, "--output", "study", "--template", "motion-study"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const root = path.join(dir, "study");
    const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    for (const [, source] of html.matchAll(/<script src="([^"]+)"/g)) {
      assert.doesNotMatch(source, /^https?:/, source);
      const installed = /^node_modules\/([^/]+)\//.exec(source);
      if (installed) assert.ok(pkg.devDependencies[installed[1]], `${installed[1]} is pinned in package.json`);
      else assert.ok(fs.existsSync(path.join(root, source)), source);
    }
    assert.ok(html.includes('P["pose-to-pose"](tl'));
    const board = JSON.parse(fs.readFileSync(path.join(root, "storyboard.json"), "utf8"));
    assert.equal(board.durationSec, 4);
    assert.equal(board.sound.mode, "silent");
    assert.equal(checkStoryboard(board).status, "passed");
    fs.writeFileSync(path.join(root, "qa.md"), "My observed motion choice.\n");
    assert.throws(() => scaffoldFilm(root, { template: "motion-study" }), /--replace/);
    scaffoldFilm(root, { template: "motion-study", replace: true });
    assert.equal(fs.readFileSync(path.join(root, "qa.md"), "utf8"), "My observed motion choice.\n");
    const unknown = spawnSync(process.execPath, [cli, "film", "scaffold", "--root", dir, "--output", "unknown", "--template", "narration-only"], { encoding: "utf8" });
    assert.equal(unknown.status, 1);
    assert.match(unknown.stdout, /allowed: default, motion-study/);
    assert.equal(fs.existsSync(path.join(dir, "unknown")), false);
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
    // An explicit missing module keeps this check hermetic even when NODE_PATH supplies Puppeteer.
    const capture = spawnSync(process.execPath, [cli, "film", "capture-timeline", "--root", dir, "--composition", "promo/index.html", "--chrome", process.execPath, "--puppeteer-module", path.join(dir, "missing-puppeteer-core.cjs")], { encoding: "utf8" });
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
