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
// A decaying 90 Hz hit whose attack sits exactly at `at` seconds.
const hit = (at, level = 0.8) => `if(gte(t,${at}),${level}*exp(-60*(t-${at}))*sin(2*PI*90*(t-${at})),0)`;
// The example storyboard's hit cues: accent 2.4 s, downbeat 5 s, impact 8.8 s.
const exampleHits = [2.4, 5, 8.8];
const scored = (cues, fps = 30) => ({ fps, sound: { mode: "scored", assets: [{ id: "own", license: "user-owned", commercialUse: true }], cues: [{ id: "in", atSec: 0, kind: "entry" }, ...cues] } });

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

test("a peaky mix is limited before a linear gain, so its quiet and loud sections keep their difference", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    // 6 s quiet pad, then 6 s louder pad with a sharp click every half second (high crest factor).
    const expr = "if(lt(t,6),0.03,0.09)*sin(2*PI*220*t)+if(gte(t,6),0.9*exp(-400*mod(t,0.5))*sin(2*PI*60*t),0)";
    const mix = tone(dir, "peaky.wav", expr, 12);
    const mastered = masterAudio(mix, path.join(dir, "mastered.wav"), { target: "web" });
    assert.equal(mastered.normalization, "linear", JSON.stringify(mastered));
    assert.ok(mastered.limiterDb > 0, JSON.stringify(mastered));
    const rms = (file, from, to) => {
      const raw = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(from), "-t", String(to - from), "-i", file, "-ac", "1", "-f", "s16le", "-"], { windowsHide: true, maxBuffer: 1 << 26 }).stdout;
      let sum = 0; for (let i = 0; i + 1 < raw.length; i += 2) { const v = raw.readInt16LE(i) / 32768; sum += v * v; }
      return 20 * Math.log10(Math.sqrt(sum / (raw.length / 2)));
    };
    const before = rms(mix, 7, 11) - rms(mix, 1, 5);
    const after = rms(path.join(dir, "mastered.wav"), 7, 11) - rms(path.join(dir, "mastered.wav"), 1, 5);
    assert.ok(after > before - 3, `section difference ${before.toFixed(1)} dB became ${after.toFixed(1)} dB`);
    // The master leaves codec headroom under the -1 dBTP delivery ceiling.
    assert.ok(checkAudio(path.join(dir, "mastered.wav")).metrics.truePeakDbtp <= -2.3);
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
    tone(dir, "ok.wav", [fadeOut(0.02), ...exampleHits.map((at) => hit(at, 0.2))].join("+"));
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

test("hit cues are timed against measured onsets: on the frame, off the frame, unsounded", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const file = tone(dir, "hits.wav", [fadeOut(0.05), ...exampleHits.map((at) => hit(at))].join("+"));
    const onCue = checkAudio(file, { storyboard: scored([{ id: "a", atSec: 2.4, kind: "accent" }, { id: "d", atSec: 5, kind: "downbeat" }, { id: "i", atSec: 8.8, kind: "impact" }]) });
    const sync = onCue.metrics.cueSync;
    assert.deepEqual([sync.cues, sync.onFrame, sync.heard], [3, 3, 3], JSON.stringify(sync));
    assert.ok(sync.chance < 0.2, JSON.stringify(sync));
    for (const code of ["impact-unsounded", "cue-unsounded", "cue-off-frame", "sync-at-chance"]) assert.ok(!codes(onCue).includes(code), code);
    // A cue 60 ms before its hit (two frames at 30 fps) is off the frame; an impact on nothing fails.
    const off = checkAudio(file, { storyboard: scored([{ id: "a", atSec: 2.34, kind: "accent" }, { id: "i", atSec: 7, kind: "impact" }, { id: "d", atSec: 3.5, kind: "downbeat" }]) });
    const row = (id) => off.metrics.cueSync.rows.find((r) => r.id === id);
    assert.equal(row("a").status, "off-frame");
    assert.ok(Math.abs(row("a").offsetMs - 60) <= 10, JSON.stringify(row("a")));
    assert.match(off.findings.find((f) => f.code === "cue-off-frame").fix, /Shift that sound by -\d+ ms/);
    assert.equal(off.findings.find((f) => f.code === "impact-unsounded").severity, "error");
    assert.equal(off.findings.find((f) => f.code === "cue-unsounded").severity, "warn");
    assert.equal(off.status, "failed");
    // A downbeat on the very first sample is found at 0.
    const first = tone(dir, "first.wav", [hit(0), hit(4)].join("+"), 6);
    assert.equal(checkAudio(first, { storyboard: scored([{ id: "d0", atSec: 0, kind: "downbeat" }]) }).metrics.cueSync.rows[0].status, "on-frame");
    // At 12 fps the same 60 ms is within a frame.
    assert.equal(checkAudio(file, { storyboard: scored([{ id: "a", atSec: 2.34, kind: "accent" }], 12) }).metrics.cueSync.rows[0].status, "on-frame");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("dense onsets make cue matches meaningless and say so", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const busy = Array.from({ length: 70 }, (_, k) => hit((0.5 + k * 0.15).toFixed(2), 0.5));
    const file = tone(dir, "busy.wav", [fadeOut(0.05), ...busy].join("+"));
    const result = checkAudio(file, { storyboard: scored([{ id: "a", atSec: 2, kind: "accent" }, { id: "b", atSec: 4.03, kind: "accent" }, { id: "c", atSec: 6.6, kind: "impact" }]) });
    assert.ok(result.metrics.cueSync.chance >= 0.5, JSON.stringify(result.metrics.cueSync));
    const finding = result.findings.find((f) => f.code === "sync-at-chance");
    assert.ok(finding, JSON.stringify(result.findings));
    assert.match(finding.fix, /verify audio --audio <effects-stem\.wav>/);
    // Fewer than three hit cues: chance is reported but not judged.
    assert.ok(!codes(checkAudio(file, { storyboard: scored([{ id: "a", atSec: 2, kind: "accent" }]) })).includes("sync-at-chance"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("riser, voiceover, entry and exit cues are not timed as hits", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    const file = tone(dir, "pad.wav", fadeOut(0.05));
    const result = checkAudio(file, { storyboard: scored([{ id: "r", atSec: 4, kind: "riser" }, { id: "v", atSec: 6, kind: "voiceover" }]) });
    assert.equal(result.metrics.cueSync, undefined);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("hits mixed over a real music bed are found on their frames", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
  try {
    // The repository's seed score, 12 s, with a bright tick and a low hit at known times riding over it.
    const bed = path.join(__dirname, "../examples/seed-film-reference/assets/field-notes-score.wav");
    const tick = (at) => `if(gte(t,${at}),0.5*exp(-120*(t-${at}))*sin(2*PI*2400*(t-${at})),0)`;
    const times = [2.31, 4.87, 7.4, 9.93];
    const hits = [tick(times[0]), hit(times[1], 0.5), tick(times[2]), hit(times[3], 0.5)].join("+");
    const file = path.join(dir, "bed-hits.wav");
    const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-t", "12", "-i", bed, "-f", "lavfi", "-i", `aevalsrc='${hits}|${hits}':s=48000:d=12`, "-filter_complex", "[0:a]aresample=48000,aformat=channel_layouts=stereo[b];[b][1:a]amix=inputs=2:normalize=0[o]", "-map", "[o]", file], { windowsHide: true, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const result = checkAudio(file, { storyboard: scored(times.map((atSec, i) => ({ id: `h${i}`, atSec, kind: i % 2 ? "impact" : "accent" }))) });
    const sync = result.metrics.cueSync;
    assert.equal(sync.onFrame, 4, JSON.stringify(sync.rows));
    assert.ok(sync.chance < 0.5, JSON.stringify(sync));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
