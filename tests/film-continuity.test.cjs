"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { evaluateFilmRender } = require("../skill/scripts/film-core.cjs");
const { HINTS } = require("../skill/scripts/film-hints.cjs");
const { carryContinuity, checkFilmProject } = require("../skill/scripts/film-project-core.cjs");
const { TIMELINE_SCHEMA } = require("../skill/scripts/film-timeline-core.cjs");

const codes = (result) => result.findings.map((finding) => finding.code);
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

// A 12s, 4-beat board: open, then three carried boundaries (continuation, morph or
// camera-carry) at 3/6/9s. `handoffAt9` lets a case swap the last boundary to match-cut.
function carryBoard(handoffAt9 = "camera-carry") {
  return {
    schema: "design-pipeline.film-storyboard.v1", id: "carry-render-test", durationSec: 12, grammar: "product-demonstration",
    benefit: "One shape becomes the next.", proofAction: "A shape travels, morphs and carries the camera across the film.",
    sound: { mode: "silent", reason: "carry test" },
    beats: [
      { id: "open", startSec: 0, endSec: 3, role: "action", subject: "shape", productAction: "Shape appears and starts moving", transformation: { kind: "state-change", from: "off", to: "on" }, handoff: "open", motion: ["travel"] },
      { id: "continue", startSec: 3, endSec: 6, role: "action", subject: "shape", productAction: "Shape keeps traveling", transformation: { kind: "state-change", from: "left", to: "right" }, handoff: "continuation", motion: ["travel"] },
      { id: "morph", startSec: 6, endSec: 9, role: "action", subject: "shape", productAction: "Shape morphs into the next form", transformation: { kind: "morph", from: "circle", to: "square" }, handoff: "morph", motion: ["continuous-morph"] },
      { id: "carry", startSec: 9, endSec: 12, role: "action", subject: "shape", productAction: "Shape resolves", transformation: { kind: "state-change", from: "moving", to: "settled" }, handoff: handoffAt9, motion: ["travel"] },
    ],
  };
}

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0 && spawnSync("ffprobe", ["-version"], { windowsHide: true }).status === 0;
const skip = !hasFfmpeg && "ffmpeg not installed";

// Four scenes with a hard color cut at each boundary; a moving box keeps action beats non-static.
function synthesizeCuts(dir, name, cuts, colors) {
  const bounds = [0, ...cuts, 12];
  const inputs = [];
  const filters = [];
  colors.forEach((color, index) => {
    const d = bounds[index + 1] - bounds[index];
    inputs.push("-f", "lavfi", "-i", `color=c=${color}:s=160x90:r=30:d=${d}[bg];color=c=white:s=20x20:r=30:d=${d}[b];[bg][b]overlay=x='mod(t*60,140)':y=30`);
    filters.push(`[${index}:v]`);
  });
  const graph = `${filters.join("")}concat=n=${colors.length}:v=1:a=0[v]`;
  const file = path.join(dir, name);
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", file], { windowsHide: true, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return file;
}

// One continuous scene: a moving box, no color cut anywhere in the 12s.
function synthesizeContinuous(dir, name) {
  const file = path.join(dir, name);
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=160x90:r=30:d=12[bg];color=c=white:s=20x20:r=30:d=12[b];[bg][b]overlay=x='mod(t*40,140)':y=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", file], { windowsHide: true, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return file;
}

test("a hard scene cut on a carried boundary gives carry-cut; match-cut stays exempt", { skip }, () => {
  const dir = tmp("film-carry-cut-");
  try {
    const video = synthesizeCuts(dir, "cuts.mp4", [3, 6, 9], ["red", "blue", "green", "yellow"]);
    const result = evaluateFilmRender(carryBoard("match-cut"), video);
    const carryCuts = result.findings.filter((finding) => finding.code === "carry-cut");
    // "continue" (continuation@3) and "morph" (morph@6) are carried and cut: both fire.
    // "carry" is now match-cut@9: a cut there is by design and stays exempt.
    assert.deepEqual(carryCuts.map((finding) => finding.beatId).sort(), ["continue", "morph"]);
    assert.match(carryCuts.find((finding) => finding.beatId === "continue").message, /planned continuation at 3s renders as a scene cut/);
    assert.ok(carryCuts.every((finding) => finding.fix), JSON.stringify(carryCuts));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the same carried boundaries with continuous motion give no carry-cut finding", { skip }, () => {
  const dir = tmp("film-carry-continuous-");
  try {
    const video = synthesizeContinuous(dir, "continuous.mp4");
    const result = evaluateFilmRender(carryBoard("camera-carry"), video);
    assert.ok(!codes(result).includes("carry-cut"), JSON.stringify(result.findings));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("stillness.stillShare is present and higher for a mostly static clip than a moving one", { skip }, () => {
  const dir = tmp("film-stillness-");
  try {
    const staticVideo = path.join(dir, "static.mp4");
    const staticRun = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=160x90:r=30:d=12", "-c:v", "libx264", "-pix_fmt", "yuv420p", staticVideo], { windowsHide: true, encoding: "utf8" });
    assert.equal(staticRun.status, 0, staticRun.stderr);
    const movingVideo = synthesizeContinuous(dir, "moving.mp4");
    const board = carryBoard("camera-carry");
    const staticResult = evaluateFilmRender(board, staticVideo);
    const movingResult = evaluateFilmRender(board, movingVideo);
    assert.equal(typeof staticResult.stillness.stillShare, "number");
    assert.equal(typeof movingResult.stillness.stillShare, "number");
    assert.ok(staticResult.stillness.stillShare > movingResult.stillness.stillShare, JSON.stringify({ static: staticResult.stillness, moving: movingResult.stillness }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("every new render finding has a fix", () => {
  assert.ok(HINTS.render["carry-cut"]);
  assert.ok(HINTS.check["low-carry"]);
});

// carryContinuity is the exported aggregation checkFilmProject uses for carryScore; testing it
// directly covers the low-carry threshold without a slow full render.
test("carryContinuity: a boundary is carried only when neither gate that ran flags it", () => {
  const board = carryBoard("camera-carry"); // open + 3 carried boundaries: continue, morph, carry
  const noGates = carryContinuity(board, []);
  // Neither gate ran to veto any boundary, so all 3 vacuously count as carried, but with no
  // evidence at all carryScore itself is null.
  assert.deepEqual(noGates, { carryScore: null, carriedBoundaries: 3, plannedCarriedBoundaries: 3 });

  // Timeline breaks "continue", render breaks "morph"; "carry" is clean on both -> 1/3 survive.
  const steps = [
    { gate: "timeline", status: "passed", findings: [{ code: "handoff-not-carried", severity: "error", beatId: "continue", message: "x" }] },
    { gate: "render", status: "passed", findings: [{ code: "carry-cut", severity: "error", beatId: "morph", message: "x" }] },
  ];
  const broken = carryContinuity(board, steps);
  assert.deepEqual(broken, { carryScore: 0.333, carriedBoundaries: 1, plannedCarriedBoundaries: 3 });
});

test("film check: low-carry fires on a project with 3 carried boundaries of which 2 are broken", () => {
  const dir = tmp("film-check-carry-");
  try {
    const board = carryBoard("camera-carry");
    fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify(board));
    fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>carry</title>");
    // Only the "carry" boundary (9s) has a tween spanning both sides; "continue" (3s) and
    // "morph" (6s) have nothing nearby, so the timeline gate reports handoff-not-carried on them.
    const timeline = {
      schema: TIMELINE_SCHEMA, compositionId: "carry-check", durationSec: 12,
      tweens: [{ targets: ["#shape"], startSec: 8, durationSec: 2, props: ["x"], ease: "power2.inOut" }],
    };
    const result = checkFilmProject(dir, { capture: () => timeline });
    const checkStep = result.steps.find((step) => step.gate === "check");
    assert.deepEqual(checkStep.metrics, { carryScore: 0.333, carriedBoundaries: 1, plannedCarriedBoundaries: 3 });
    assert.equal(checkStep.status, "failed");
    assert.ok(checkStep.findings.some((finding) => finding.code === "low-carry" && finding.fix));
    assert.equal(result.status, "failed");
    assert.ok(result.fixes.some((fix) => fix.gate === "check" && fix.code === "low-carry"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
