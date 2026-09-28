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
    for (const name of ["storyboard.json", "index.html", "lib/patterns.js", "lib/timeline-probe.js", "reference.md", "sound.md", "qa.md", "FILM.md"]) assert.ok(fs.existsSync(path.join(dir, name)), name);
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
    assert.deepEqual(result.steps.map((step) => [step.gate, step.status]), [["storyboard", "passed"], ["timeline", "skipped"], ["render", "skipped"]]);
    assert.match(result.next, /hyperframes render/);
    assert.equal(result.creativeAcceptance, "not-assessed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("film check uses the capture hook, writes timeline.json, and aggregates fixes", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const probed = JSON.parse(fs.readFileSync(path.join(refs, "timeline.example.json"), "utf8"));
    probed.tweens = probed.tweens.filter((tween) => tween.startSec + tween.durationSec <= 5 || tween.startSec >= 8.2);
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
