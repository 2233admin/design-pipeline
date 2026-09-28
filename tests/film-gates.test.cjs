"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkStoryboard, evaluateFilmRender } = require("../skill/scripts/film-core.cjs");
const patterns = require("../skill/references/film-choreography/patterns.js");

const refs = path.join(__dirname, "../skill/references/film-choreography");
const example = () => JSON.parse(fs.readFileSync(path.join(refs, "storyboard.example.json"), "utf8"));
const codes = (result) => result.findings.map((finding) => finding.code);

function slideshow() {
  const board = example();
  board.id = "slideshow";
  board.beats = board.beats.map((beat, index) => ({
    ...beat,
    handoff: index === 0 ? "open" : "dissolve",
    motion: ["fade-in", "scale-in", "fade-out"],
    transformation: beat.role === "action" ? { kind: "reveal-in-context", from: "hidden panel", to: "visible panel" } : beat.transformation,
  }));
  return board;
}

test("golden storyboard passes and never claims creative acceptance", () => {
  const result = checkStoryboard(example());
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.equal(result.creativeAcceptance, "not-assessed");
});

test("entrance-hold-exit slideshow fails with surface-only and slideshow findings", () => {
  const result = checkStoryboard(slideshow());
  assert.equal(result.status, "failed");
  for (const code of ["surface-only-motion", "slideshow-handoffs", "slideshow-pair"]) assert.ok(codes(result).includes(code), code);
});

test("timeline must close from 0 to the declared duration", () => {
  const board = example();
  board.beats[2].startSec = 5.5;
  board.durationSec = 13;
  const result = checkStoryboard(board);
  assert.ok(codes(result).includes("timeline-gap"));
  assert.ok(codes(result).includes("timeline-open-end"));
});

test("action beats need a real transformation and known choreography", () => {
  const board = example();
  board.beats[1].transformation = { kind: "none" };
  board.beats[2].transformation = { kind: "morph" };
  board.beats[3].choreography = "spin-wow";
  const result = checkStoryboard(board);
  for (const code of ["transformation-missing", "transformation-endpoints", "choreography-unknown"]) assert.ok(codes(result).includes(code), code);
});

test("holds cannot dominate or chain", () => {
  const board = example();
  board.beats[3].role = "title-hold";
  board.beats[3].transformation = { kind: "none" };
  const result = checkStoryboard(board);
  assert.ok(codes(result).includes("hold-dominant"));
  assert.ok(codes(result).includes("hold-chain"));
});

test("scored films bind sound to beats; silent films state why", () => {
  const board = example();
  for (const beat of board.beats) delete beat.soundCues;
  board.sound.cues = board.sound.cues.filter((cue) => cue.kind !== "entry");
  const result = checkStoryboard(board);
  assert.ok(codes(result).includes("sound-no-entry"));
  assert.ok(codes(result).includes("sound-unbound"));
  const silent = example();
  silent.sound = { mode: "silent" };
  assert.throws(() => checkStoryboard(silent), /sound.reason/);
  silent.sound.reason = "TBD";
  assert.throws(() => checkStoryboard(silent), /placeholder/);
});

test("malformed storyboards are rejected as contract errors", () => {
  const board = example();
  board.beats[0].extra = true;
  assert.throws(() => checkStoryboard(board), /unsupported properties/);
  const bad = example();
  bad.beats[1].soundCues = ["nope"];
  assert.throws(() => checkStoryboard(bad), /unknown cue/);
  assert.throws(() => checkStoryboard({ ...example(), grammar: "slideshow" }), /grammar/);
});

test("carried handoffs must name what survives the boundary", () => {
  assert.ok(!codes(checkStoryboard(example())).includes("carrier-unnamed"));
  const missing = example();
  delete missing.beats[1].carrier;
  const failing = checkStoryboard(missing);
  assert.ok(codes(failing).includes("carrier-unnamed"));
  const finding = failing.findings.find((f) => f.code === "carrier-unnamed");
  assert.equal(finding.beatId, missing.beats[1].id);
  assert.ok(finding.fix);
  const placeholder = example();
  placeholder.beats[2].carrier = "TBD";
  assert.ok(codes(checkStoryboard(placeholder)).includes("carrier-unnamed"));
});

test("uniform-cadence fails near-equal beat lengths and passes uneven ones", () => {
  const golden = checkStoryboard(example());
  assert.ok(!codes(golden).includes("uniform-cadence"));
  assert.equal(golden.metrics.cadenceRatio, 3.57);
  const uniform = example();
  let t = 0;
  for (const beat of uniform.beats) { beat.startSec = t; t += 2.4; beat.endSec = t; }
  const result = checkStoryboard(uniform);
  assert.ok(codes(result).includes("uniform-cadence"));
  assert.ok(result.findings.find((f) => f.code === "uniform-cadence").fix);
  assert.equal(result.metrics.cadenceRatio, 1);
});

test("uniform-cadence uses the raw ratio, not a rounded-to-2-decimals one, at the boundary", () => {
  const board = example();
  const lens = [1, 1, 1, 2.996];
  let t = 0;
  board.beats = board.beats.slice(0, 4).map((beat, index) => {
    const startSec = t;
    t += lens[index];
    const { soundCues: _soundCues, ...rest } = beat;
    return { ...rest, startSec, endSec: t };
  });
  board.durationSec = t;
  const result = checkStoryboard(board);
  assert.ok(codes(result).includes("uniform-cadence"), JSON.stringify(result.metrics));
  assert.ok(Math.abs(result.metrics.cadenceRatio - 3) < 0.01, result.metrics.cadenceRatio);
});

test("no-rest fails a film with no hold or stillness, and passes with a hold role or holdSec", () => {
  const golden = checkStoryboard(example());
  assert.ok(!codes(golden).includes("no-rest"));
  assert.equal(golden.metrics.restSec, 2);
  const noRest = example();
  noRest.beats[4].role = "action";
  noRest.beats[4].transformation = { kind: "state-change", from: "finished strip", to: "logo mark" };
  noRest.beats[4].motion = ["kinetic-type"];
  delete noRest.beats[4].holdSec;
  const result = checkStoryboard(noRest);
  assert.ok(codes(result).includes("no-rest"));
  assert.ok(result.findings.find((f) => f.code === "no-rest").fix);
  assert.equal(result.metrics.restSec, 0);
  const withHoldSec = JSON.parse(JSON.stringify(noRest));
  withHoldSec.beats[3].holdSec = 0.3;
  const passing = checkStoryboard(withHoldSec);
  assert.equal(passing.status, "passed", JSON.stringify(passing.findings));
  assert.ok(!codes(passing).includes("no-rest"));
  assert.equal(passing.metrics.restSec, 0.3);
});

test("holdSec outside the beat's own range is a contract error", () => {
  const tooLong = example();
  tooLong.beats[4].holdSec = 5;
  assert.throws(() => checkStoryboard(tooLong), /holdSec/);
  const notPositive = example();
  notPositive.beats[4].holdSec = 0;
  assert.throws(() => checkStoryboard(notPositive), /holdSec/);
});

test("choreography registry and module agree and patterns only tween seek-safe properties", () => {
  const registry = JSON.parse(fs.readFileSync(path.join(refs, "registry.json"), "utf8"));
  assert.deepEqual(registry.patterns.map((entry) => entry.id).sort(), Object.keys(patterns).sort());
  const layout = new Set(["top", "left", "right", "bottom", "width", "height", "display", "visibility", "margin", "padding"]);
  const args = {
    "continuous-morph": { from: "#a", to: "#b", delta: { x: 10, y: 0, scale: 2 } },
    "match-cut": { from: "#a", to: "#b" },
    "camera-push": { stage: "#w", focus: { x: 10, y: 5 } },
    "camera-follow": { stage: "#w", subject: "#s", path: [{ x: 10, y: 20 }], lead: { x: 4, y: -6 }, rest: 0.5 },
    "kinetic-type": { words: ".w", target: "#t", count: 3 },
    "ui-demo": { cursor: "#c", path: [{ x: 1, y: 2 }], result: "#r" },
    "assembly": { pieces: ".p", offsets: [{ x: 5, y: 5, rotation: 3 }] },
    "reveal-in-context": { subject: "#s" },
  };
  for (const [id, pattern] of Object.entries(patterns)) {
    const calls = [];
    const tl = new Proxy({}, { get: (_, method) => (...callArgs) => { calls.push({ method, callArgs }); return tl; } });
    const end = pattern(tl, { ...args[id], at: 1 });
    assert.ok(end > 1, `${id} returns its handoff time`);
    assert.ok(calls.length > 0, `${id} adds tweens`);
    for (const { callArgs } of calls) {
      for (const vars of callArgs.filter((value) => value && typeof value === "object" && !Array.isArray(value))) {
        for (const key of Object.keys(vars)) assert.ok(!layout.has(key), `${id} tweens layout property ${key}`);
        assert.notEqual(vars.repeat, -1, `${id} repeats forever`);
      }
      assert.equal(typeof callArgs[callArgs.length - 1], "number", `${id} positions every tween absolutely`);
    }
    const again = [];
    const tl2 = new Proxy({}, { get: (_, method) => (...callArgs) => { again.push({ method, callArgs }); return tl2; } });
    pattern(tl2, { ...args[id], at: 1 });
    assert.equal(JSON.stringify(again, (k, v) => (typeof v === "function" ? String(v) : v)), JSON.stringify(calls, (k, v) => (typeof v === "function" ? String(v) : v)), `${id} is deterministic`);
  }
  assert.throws(() => patterns["match-cut"]({}, { from: "#a", at: 0 }), /missing option to/);
});

test("camera-follow: the stage leads the subject to the negated lead point and holds through the rest", () => {
  const calls = [];
  const tl = new Proxy({}, { get: (_, method) => (...callArgs) => { calls.push({ method, callArgs }); return tl; } });
  const path = [{ x: 10, y: 20 }, { x: 30, y: -5 }];
  const end = patterns["camera-follow"](tl, { stage: "#w", subject: "#s", path, lead: { x: 4, y: -6 }, rest: 0.5, duration: 0.8, at: 1 });
  const stageCalls = calls.filter((call) => call.callArgs[0] === "#w");
  const subjectCalls = calls.filter((call) => call.callArgs[0] === "#s");
  assert.equal(stageCalls.length, 2, "one stage tween per path point");
  assert.equal(subjectCalls.length, 2, "one subject tween per path point");
  assert.deepEqual(
    stageCalls.map((call) => [call.callArgs[1].x, call.callArgs[1].y]),
    path.map((point) => [-(point.x + 4), -(point.y - 6)]),
    "the stage moves to the negated point plus lead",
  );
  stageCalls.forEach((call, index) => {
    assert.ok(call.callArgs[1].duration < subjectCalls[index].callArgs[1].duration, "the stage tween is shorter than the subject's");
    assert.equal(call.callArgs[2], subjectCalls[index].callArgs[2], "the stage and subject start together, so the stage lands first");
  });
  const rest = calls[calls.length - 1];
  assert.equal(rest.callArgs[1].duration, 0.5, "the rest is a scheduled no-op tween");
  assert.equal(rest.callArgs[2] + rest.callArgs[1].duration, end, "the returned handoff time includes the rest");
});

test("camera-follow: at is optional and defaults to 0", () => {
  const calls = [];
  const tl = new Proxy({}, { get: (_, method) => (...callArgs) => { calls.push({ method, callArgs }); return tl; } });
  const path = [{ x: 10, y: 20 }, { x: 30, y: -5 }];
  const end = patterns["camera-follow"](tl, { stage: "#w", subject: "#s", path, lead: { x: 0, y: 0 }, rest: 0.5, duration: 0.8 });
  assert.equal(end, path.length * 0.8 + 0.5, "the handoff time is measured from an implicit at of 0");
  assert.equal(calls[0].callArgs[2], 0, "the first tween is positioned at 0, not undefined");
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0 && spawnSync("ffprobe", ["-version"], { windowsHide: true }).status === 0;

function synthesize(dir, { audio = true, cuts = [3, 6, 9] } = {}) {
  const colors = ["red", "blue", "green", "yellow"];
  const bounds = [0, ...cuts, 12];
  const inputs = [];
  const filters = [];
  colors.forEach((color, index) => {
    // Each scene has a moving box: frozen action beats now fail the render motion check.
    const d = bounds[index + 1] - bounds[index];
    inputs.push("-f", "lavfi", "-i", `color=c=${color}:s=160x90:r=30:d=${d}[bg];color=c=white:s=20x20:r=30:d=${d}[b];[bg][b]overlay=x='mod(t*60,140)':y=30`);
    filters.push(`[${index}:v]`);
  });
  const args = ["-hide_banner", "-loglevel", "error", "-y", ...inputs];
  let graph = `${filters.join("")}concat=n=4:v=1:a=0[v]`;
  const map = ["-map", "[v]"];
  if (audio) {
    // Quiet bed with loud clicks exactly on each cut.
    const clicks = cuts.map((at) => `between(t,${at},${at + 0.03})*0.9*sin(2*PI*1000*t)`).join("+");
    args.push("-f", "lavfi", "-i", `aevalsrc='0.01*sin(2*PI*220*t)+${clicks}':s=8000:d=12`);
    map.push("-map", "4:a");
  }
  const file = path.join(dir, audio ? "film.mp4" : "silent.mp4");
  const result = spawnSync("ffmpeg", [...args, "-filter_complex", graph, ...map, "-c:v", "libx264", "-pix_fmt", "yuv420p", ...(audio ? ["-c:a", "aac"] : []), file], { windowsHide: true, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return file;
}

function cutBoard() {
  const board = example();
  board.beats[2].handoff = "match-cut";
  board.beats[3].handoff = "hard-cut";
  board.beats[2].startSec = 6; board.beats[1].endSec = 6;
  board.beats[3].startSec = 9; board.beats[2].endSec = 9;
  board.beats[3].endSec = 9.3; board.beats[4].startSec = 9.3;
  board.beats[1].startSec = 3; board.beats[0].endSec = 3;
  board.beats[1].handoff = "hard-cut";
  board.sound.cues = board.sound.cues.map((cue) => ({ ...cue, atSec: Math.min(cue.atSec, 12) }));
  return board;
}

test("render evidence finds planned cuts, cut/onset sync and writes a contact sheet", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-render-"));
  try {
    const video = synthesize(dir);
    const out = path.join(dir, "evidence");
    const result = evaluateFilmRender(cutBoard(), video, { outDir: out });
    assert.equal(result.status, "passed", JSON.stringify(result, null, 2));
    assert.deepEqual(result.cuts.missedSec, []);
    assert.equal(result.cuts.detectedSec.length, 3);
    assert.ok(result.audio.cutsOnOnset >= 0.66, JSON.stringify(result.audio));
    assert.equal(result.contactSheet.frames.length, 5);
    assert.ok(fs.statSync(path.join(out, "contact-sheet.png")).size > 0);
    assert.equal(result.creativeAcceptance, "not-assessed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("render evidence flags missing audio and wrong duration for a scored film", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-render-"));
  try {
    const video = synthesize(dir, { audio: false });
    const board = cutBoard();
    board.durationSec = 20; board.beats[4].endSec = 20;
    const result = evaluateFilmRender(board, video);
    assert.equal(result.status, "failed");
    assert.ok(codes(result).includes("audio-missing"));
    assert.ok(codes(result).includes("duration-mismatch"));
    assert.equal(result.contactSheet, null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("CLI verify film-storyboard returns exit 2 for a slideshow", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-cli-"));
  try {
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(slideshow()));
    const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
    const run = spawnSync(process.execPath, [cli, "verify", "film-storyboard", "--root", dir, "--storyboard", "storyboard.json"], { encoding: "utf8" });
    assert.equal(run.status, 2, run.stdout + run.stderr);
    assert.equal(JSON.parse(run.stdout).status, "failed");
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(example()));
    const ok = spawnSync(process.execPath, [cli, "verify", "film-storyboard", "--root", dir, "--storyboard", "storyboard.json"], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
