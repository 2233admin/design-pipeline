"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { FIX, checkAudio, masterAudio } = require("../skill/scripts/audio-core.cjs");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");

const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const example = () => JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
const codes = (result) => result.findings.map((finding) => finding.code);
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0 && spawnSync("ffprobe", ["-version"], { windowsHide: true }).status === 0;
const skip = !hasFfmpeg && "ffmpeg not installed";

// expr is an aevalsrc expression in t, written to both channels. Upmixing mono with -ac 2
// would scale it by 1/sqrt(2) and silently change every level under test.
function tone(dir, name, expr, seconds = 12) {
  const file = path.join(dir, name);
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `aevalsrc='${expr}|${expr}':s=48000:d=${seconds}`, file], { windowsHide: true, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return file;
}
const fadeOut = (level, seconds = 12) => `${level}*sin(2*PI*220*t)*min(1,(${seconds}-t)/1)`;

test("storyboard accepts sound usage and license assets, rejects malformed ones", () => {
  assert.equal(checkStoryboard(example()).status, "passed");
  const bad = example();
  bad.sound.assets = [{ id: "x", license: "CC-BY-NC", commercialUse: "no" }];
  assert.throws(() => checkStoryboard(bad), /commercialUse must be true or false/);
  bad.sound.assets = [];
  bad.sound.usage = "broadcast";
  assert.throws(() => checkStoryboard(bad), /allowed: commercial, personal, internal/);
});

test("every audio fix is concrete", () => {
  for (const [code, fix] of Object.entries(FIX)) assert.ok(fix.length > 40, code);
});

test("quiet mix fails loudness and audio master repairs it", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const quiet = tone(dir, "quiet.wav", fadeOut(0.02));
    const before = checkAudio(quiet);
    assert.equal(before.status, "failed");
    assert.ok(codes(before).includes("loudness-off-target"));
    assert.match(before.findings.find((f) => f.code === "loudness-off-target").fix, /audio master .*--target web/);
    const mastered = masterAudio(quiet, path.join(dir, "mastered.wav"), { target: "web" });
    assert.equal(mastered.status, "mastered");
    assert.ok(["linear", "dynamic"].includes(mastered.normalization));
    const after = checkAudio(path.join(dir, "mastered.wav"));
    assert.ok(!codes(after).includes("loudness-off-target"), JSON.stringify(after.metrics));
    assert.ok(after.metrics.truePeakDbtp <= -1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("clipping, true peak and abrupt endings are reported; fade-out removes the abrupt end", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const hot = tone(dir, "hot.wav", "1.4*sin(2*PI*220*t)", 4);
    const result = checkAudio(hot);
    for (const code of ["clipping", "true-peak-over", "abrupt-end"]) assert.ok(codes(result).includes(code), code);
    const faded = masterAudio(hot, path.join(dir, "faded.wav"), { fadeOutSec: 1 });
    assert.equal(faded.fadeOutSec, 1);
    assert.ok(!codes(checkAudio(path.join(dir, "faded.wav"))).includes("abrupt-end"));
    assert.throws(() => masterAudio(hot, path.join(dir, "x.wav"), { fadeOutSec: 10 }), /not shorter/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a loud clean low-frequency tone is not reported as clipping", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const file = tone(dir, "bass.wav", "0.985*sin(2*PI*20*t)", 3);
    assert.ok(!codes(checkAudio(file)).includes("clipping"), JSON.stringify(checkAudio(file).metrics));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("storyboard cues: unplanned silence, late entry, early exit and licensing", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    // Music from 1s (late for a 0s entry cue), a gap 5-6.5s, and it ends at 9s before the 12s exit cue.
    const file = tone(dir, "gappy.wav", "0.3*sin(2*PI*220*t)*between(t,1,5)+0.3*sin(2*PI*220*t)*between(t,6.5,9)*min(1,(9-t)/0.5)");
    const board = example();
    const result = checkAudio(file, { storyboard: board });
    for (const code of ["entry-late", "unexpected-silence", "exit-early"]) assert.ok(codes(result).includes(code), code);
    board.sound.cues.push({ id: "breath", atSec: 5.5, kind: "silence", note: "planned pause" });
    assert.ok(!codes(checkAudio(file, { storyboard: board })).includes("unexpected-silence"));
    board.sound.assets = [{ id: "nc", license: "CC-BY-NC-4.0", commercialUse: false }];
    assert.ok(codes(checkAudio(file, { storyboard: board })).includes("license-noncommercial"));
    board.sound.usage = "personal";
    assert.ok(!codes(checkAudio(file, { storyboard: board })).includes("license-noncommercial"));
    delete board.sound.assets;
    assert.ok(codes(checkAudio(file, { storyboard: board })).includes("license-unrecorded"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a scored film without an audio stream fails; CLI exit codes and target errors", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=64x36:r=10:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(dir, "mute.mp4")], { windowsHide: true, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(codes(checkAudio(path.join(dir, "mute.mp4"), { storyboard: example() })), ["audio-missing"]);
    tone(dir, "ok.wav", fadeOut(0.02));
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(example()));
    const failed = spawnSync(process.execPath, [cli, "verify", "audio", "--root", dir, "--audio", "ok.wav"], { encoding: "utf8" });
    assert.equal(failed.status, 2, failed.stdout);
    const master = spawnSync(process.execPath, [cli, "audio", "master", "--root", dir, "--input", "ok.wav", "--output", "m.wav", "--fade-out", "1"], { encoding: "utf8" });
    assert.equal(master.status, 0, master.stdout);
    const passed = spawnSync(process.execPath, [cli, "verify", "audio", "--root", dir, "--audio", "m.wav", "--storyboard", "storyboard.json"], { encoding: "utf8" });
    assert.equal(passed.status, 0, passed.stdout);
    const target = spawnSync(process.execPath, [cli, "verify", "audio", "--root", dir, "--audio", "m.wav", "--target", "cinema"], { encoding: "utf8" });
    assert.match(target.stdout, /allowed: web, podcast, broadcast/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
