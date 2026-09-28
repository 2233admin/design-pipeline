"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { HINTS, analyzeMusic, autoEdit, checkEdit, storyboardFromEdit } = require("../skill/scripts/edit-core.cjs");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");
const { analyzeProject, autoProject, checkProject, renderProject } = require("../skill/scripts/edit-project-core.cjs");

const codes = (result) => result.findings.map((finding) => finding.code);
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0;
const skip = !hasFfmpeg && "ffmpeg not installed";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-edit-"));
const ff = (args) => { const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { windowsHide: true, encoding: "utf8" }); assert.equal(run.status, 0, run.stderr); };

// Click track: quiet bed plus a click on every beat, accented on every fourth beat from `offset`.
function clickTrack(file, bpm, offset, seconds = 16) {
  const period = 60 / bpm;
  ff(["-f", "lavfi", "-i", `aevalsrc='0.02*sin(2*PI*110*t)+0.8*lt(mod(t-${offset}+10*${period},${period}),0.03)*sin(2*PI*1000*t)*(1+0.6*lt(mod(t-${offset}+40*${period},4*${period}),0.03))':s=44100:d=${seconds}`, file]);
}

// Synthetic music analysis: 120 BPM, bars alternating calm and loud.
function music(bars = 8) {
  const beats = [];
  for (let i = 0; i < bars * 4; i += 1) beats.push(i * 0.5);
  return { file: "music.wav", durationSec: bars * 2, bpm: 120, gridSource: "test", beats, downbeats: beats.filter((_, i) => i % 4 === 0), bars: Array.from({ length: bars }, (_, i) => ({ startSec: i * 2, endSec: i * 2 + 2, energy: i % 2 ? 1 : 0.1 })) };
}
function sources() {
  return ["a", "b", "c"].map((id) => ({ id, file: `sources/${id}.mp4`, license: "own", commercialUse: true, durationSec: 12, segments: [0, 4, 8].map((s) => ({ startSec: s, endSec: s + 4, peakSec: s + 1.5, peakMotion: 0.05 + s / 100, meanMotion: 0.02 })) }));
}

test("beat tracker recovers tempo, phase and downbeats of click tracks within a frame", { skip }, () => {
  const dir = tmp();
  try {
    for (const [bpm, offset] of [[128, 0.3], [90, 0.1]]) {
      const file = path.join(dir, `click-${bpm}.wav`);
      clickTrack(file, bpm, offset);
      const result = analyzeMusic(file);
      assert.ok(Math.abs(result.bpm - bpm) < 0.5, `${bpm}: got ${result.bpm}`);
      const period = 60 / bpm;
      const worst = Math.max(...result.beats.map((b) => Math.abs(b - (offset + Math.round((b - offset) / period) * period))));
      assert.ok(worst < 1 / 30, `${bpm}: beat error ${worst}s`);
      assert.ok(Math.abs(result.downbeats[0] - offset) < 1 / 30 || Math.abs(result.downbeats[0] - offset - 4 * period) < 1 / 30, `${bpm}: downbeat ${result.downbeats[0]}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a score grid overrides detection", { skip }, () => {
  const dir = tmp();
  try {
    const file = path.join(dir, "m.wav");
    clickTrack(file, 100, 0);
    const result = analyzeMusic(file, { grid: { bpm: 120, beats: [0, 0.5, 1, 1.5, 2, 2.5] } });
    assert.equal(result.gridSource, "score-grid");
    assert.equal(result.bpm, 120);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("auto edit cuts on beats, paces shots by energy and style, and is deterministic", () => {
  const mad = autoEdit(music(), sources(), { style: "mad" });
  const pv = autoEdit(music(), sources(), { style: "pv" });
  assert.deepEqual(autoEdit(music(), sources(), { style: "mad" }), mad);
  const onBeat = (edit) => edit.clips.every((clip) => Math.abs(clip.atSec * 2 - Math.round(clip.atSec * 2)) < 1e-6);
  assert.ok(onBeat(mad) && onBeat(pv));
  assert.ok(mad.clips.length > pv.clips.length * 1.5, `mad ${mad.clips.length} vs pv ${pv.clips.length}`);
  assert.ok(mad.clips.some((clip) => (clip.fx || []).includes("flash")), "mad flashes loud downbeats");
  assert.equal(checkEdit(mad, music()).status, "passed", JSON.stringify(checkEdit(mad, music()).findings));
  assert.ok(new Set(mad.clips.map((clip) => clip.source)).size === 3, "shots rotate through sources");
  assert.throws(() => autoEdit(music(), sources(), { style: "vlog" }), /allowed: mad, pv/);
});

test("edit check reports each rule with a fix", () => {
  const edit = autoEdit(music(), sources(), { style: "pv" });
  const broken = JSON.parse(JSON.stringify(edit));
  broken.clips[1].atSec += 0.2;
  broken.clips[1].durSec -= 0.2;
  broken.clips[2].atSec -= 0.3;
  broken.sources[0].commercialUse = false;
  const result = checkEdit(broken, music());
  for (const code of ["timeline-gap", "timeline-overlap", "cut-off-grid", "license-noncommercial"]) assert.ok(codes(result).includes(code), code);
  assert.equal(result.status, "failed");
  const monotone = JSON.parse(JSON.stringify(edit));
  monotone.clips = Array.from({ length: 16 }, (_, i) => ({ source: "a", inSec: (i % 3) * 3, outSec: (i % 3) * 3 + 1, atSec: i, durSec: 1 }));
  monotone.durationSec = 16;
  const rhythm = checkEdit(monotone, music());
  assert.ok(codes(rhythm).includes("monotone-rhythm"));
  assert.ok(codes(rhythm).includes("clip-reused"));
  const odd = JSON.parse(JSON.stringify(edit));
  odd.clips[0] = { ...odd.clips[0], outSec: odd.clips[0].inSec + odd.clips[0].durSec * 3 };
  assert.ok(codes(checkEdit(odd, music(), { a: { durationSec: 1 }, b: { durationSec: 12 }, c: { durationSec: 12 } })).some((code) => code === "speed-extreme" || code === "source-range"));
  for (const code of Object.keys(HINTS)) assert.ok(HINTS[code].length > 30, code);
});

test("the storyboard derived from an edit passes the storyboard gate only with filmRhythm off", () => {
  const edit = autoEdit(music(), sources(), { style: "mad" });
  const board = storyboardFromEdit(edit, music());
  const strict = checkStoryboard(board);
  assert.equal(strict.status, "failed");
  assert.ok(codes(strict).includes("no-rest"), "a continuous music-cut edit has no title/brand hold or holdSec");
  const result = checkStoryboard(board, { filmRhythm: false });
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.equal(board.beats.length, edit.clips.length);
  assert.ok(board.beats.slice(1).every((beat) => beat.handoff === "hard-cut"));
});

test("film edit end to end: analyze, auto, render and check generated footage", { skip }, () => {
  const dir = tmp();
  try {
    fs.mkdirSync(path.join(dir, "sources"));
    ff(["-f", "lavfi", "-i", "testsrc2=s=320x180:r=30", "-t", "6", "-pix_fmt", "yuv420p", path.join(dir, "sources", "bars.mp4")]);
    ff(["-f", "lavfi", "-i", "mandelbrot=s=320x180:rate=30:end_scale=0.05", "-t", "6", "-pix_fmt", "yuv420p", path.join(dir, "sources", "fractal.mp4")]);
    clickTrack(path.join(dir, "music.wav"), 120, 0, 8);
    const analysis = analyzeProject(dir, { music: "music.wav" });
    assert.equal(analysis.status, "analyzed");
    assert.ok(Math.abs(analysis.bpm - 120) < 0.5);
    assert.match(analysis.next[1], /licenses\.json/, "unlicensed footage is flagged");
    fs.writeFileSync(path.join(dir, "sources", "licenses.json"), JSON.stringify({ "bars.mp4": { license: "generated", commercialUse: true }, "fractal.mp4": { license: "generated", commercialUse: true } }));
    analyzeProject(dir, { music: "music.wav" });
    const edit = autoProject(dir, { style: "mad", width: 320, height: 180 });
    assert.equal(edit.check.status, "passed");
    assert.throws(() => autoProject(dir, { style: "mad" }), /--replace/);
    renderProject(dir, {});
    assert.ok(fs.statSync(path.join(dir, "renders", "edit.mp4")).size > 0);
    const check = checkProject(dir, {});
    assert.deepEqual(check.steps.map((step) => step.gate), ["edit", "render", "audio", "composition"]);
    const renderStep = check.steps.find((step) => step.gate === "render");
    assert.ok(renderStep.cuts.detectedSec.length >= 3, "cuts are visible in the render");
    // A continuous music-cut edit has no title/brand hold; without edit-project-core forwarding
    // filmRhythm: false to evaluateFilmRender, the derived storyboard's no-rest finding would
    // fail this step even though the render itself is clean.
    assert.equal(renderStep.status, "passed", JSON.stringify(renderStep));
    assert.equal(check.creativeAcceptance, "not-assessed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
