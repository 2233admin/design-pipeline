"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkTimeline } = require("../skill/scripts/film-timeline-core.cjs");
const { checkStoryboard, evaluateFilmRender } = require("../skill/scripts/film-core.cjs");
const { HINTS } = require("../skill/scripts/film-hints.cjs");

const codes = (result) => result.findings.map((finding) => finding.code);
const refs = path.join(__dirname, "../skill/references/film-choreography");
const example = () => JSON.parse(fs.readFileSync(path.join(refs, "storyboard.example.json"), "utf8"));
const golden = () => JSON.parse(fs.readFileSync(path.join(refs, "timeline.example.json"), "utf8"));

function clipBoard(extra = {}, beat = {}) {
  return {
    schema: "design-pipeline.film-storyboard.v1", id: "clip", durationSec: 4, grammar: "product-demonstration",
    benefit: "One card shows its state.", proofAction: "The card moves to its new place.",
    sound: { mode: "silent", reason: "motion test" },
    beats: [{ id: "move", startSec: 0, endSec: 4, role: "action", subject: "card", productAction: "Card travels and lands", transformation: { kind: "state-change", from: "left", to: "right" }, handoff: "open", motion: ["travel"], ...beat }],
    ...extra,
  };
}

test("storyboard accepts endState and arc, rejects unknown values with the allowed list", () => {
  assert.equal(checkStoryboard(clipBoard({ endState: "loop" }, { arc: "anticipate-act-settle" })).status, "passed");
  assert.throws(() => checkStoryboard(clipBoard({ endState: "bounce" })), /allowed: free, rest, loop/);
  assert.throws(() => checkStoryboard(clipBoard({}, { arc: "wiggle" })), /allowed: anticipate-act-settle/);
});

test("two tweens driving one property at overlapping times are a conflict; handing off is fine", () => {
  const timeline = golden();
  assert.ok(!codes(checkTimeline(timeline, example())).includes("property-conflict"));
  timeline.tweens.push({ targets: ["#image"], startSec: 6.0, durationSec: 1.0, props: ["y"], ease: "power2.out" });
  const result = checkTimeline(timeline, example());
  const conflict = result.findings.find((f) => f.code === "property-conflict");
  assert.match(conflict.message, /#image y/);
  assert.equal(conflict.severity, "error");
  assert.equal(result.status, "failed");
});

test("linear easing on moving elements warns without failing; drivers and opacity are exempt", () => {
  const timeline = golden();
  timeline.tweens.push({ targets: ["#badge"], startSec: 11, durationSec: 0.8, props: ["x"], ease: "none" });
  timeline.tweens.push({ targets: ["#caption"], startSec: 11, durationSec: 0.8, props: ["opacity"], ease: "none" });
  timeline.tweens.push({ targets: ["object"], startSec: 0, durationSec: 4, props: ["u"], ease: "none", driver: true });
  const result = checkTimeline(timeline, example());
  const linear = result.findings.filter((f) => f.code === "linear-motion");
  assert.equal(linear.length, 1);
  assert.equal(linear[0].severity, "warn");
  assert.equal(result.status, "passed");
});

test("every new motion finding has a fix", () => {
  for (const code of ["property-conflict", "linear-motion"]) assert.ok(HINTS.timeline[code], code);
  for (const code of ["rest-drift", "loop-seam-jump", "missing-anticipation", "missing-settle"]) assert.ok(HINTS.render[code], code);
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0;
const skip = !hasFfmpeg && "ffmpeg not installed";

// A 4 s clip with a white box whose x follows the given ffmpeg expression in t.
function clip(dir, name, xExpr) {
  const file = path.join(dir, name);
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=0x202830:s=320x180:r=30:d=4[bg];color=c=white:s=40x40:r=30:d=4[b];[bg][b]overlay=x='${xExpr}':y=70`, "-c:v", "libx264", "-pix_fmt", "yuv420p", file], { windowsHide: true, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return file;
}

test("rest films must end on their opening frame", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "motion-"));
  try {
    // Returns to the start by 3.5 s and holds: a settled ending.
    const back = clip(dir, "back.mp4", "20+120*sin(PI*min(t,3.5)/3.5)");
    const away = clip(dir, "away.mp4", "20+60*t");
    assert.ok(!codes(evaluateFilmRender(clipBoard({ endState: "rest" }), back)).includes("rest-drift"));
    const drift = evaluateFilmRender(clipBoard({ endState: "rest" }), away);
    assert.ok(codes(drift).includes("rest-drift"));
    assert.equal(drift.status, "failed");
    assert.ok(!codes(evaluateFilmRender(clipBoard(), away)).includes("rest-drift"), "free films may end anywhere");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("loops must not jump at the seam", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "motion-"));
  try {
    const smooth = clip(dir, "smooth.mp4", "140+100*sin(2*PI*t/4)");
    const jumpy = clip(dir, "jumpy.mp4", "10+65*t");
    assert.ok(!codes(evaluateFilmRender(clipBoard({ endState: "loop" }), smooth)).includes("loop-seam-jump"));
    assert.ok(codes(evaluateFilmRender(clipBoard({ endState: "loop" }), jumpy)).includes("loop-seam-jump"));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("anticipate-act-settle beats warn on full-speed starts and dead stops", { skip }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "motion-"));
  try {
    const eased = clip(dir, "eased.mp4", "20+120*(1-cos(PI*t/4))");
    const constant = clip(dir, "constant.mp4", "20+60*t");
    const arc = { arc: "anticipate-act-settle" };
    const good = evaluateFilmRender(clipBoard({}, arc), eased);
    assert.ok(!codes(good).includes("missing-anticipation") && !codes(good).includes("missing-settle"), JSON.stringify(good.findings));
    const bad = evaluateFilmRender(clipBoard({}, arc), constant);
    assert.ok(codes(bad).includes("missing-anticipation"));
    assert.ok(codes(bad).includes("missing-settle"));
    assert.equal(bad.status, "passed", "arc findings are warnings");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
