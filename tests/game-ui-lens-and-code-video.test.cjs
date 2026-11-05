"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const flat = (relative) => read(relative).replace(/\s+/g, " ");
const hasFfmpeg = ["ffmpeg", "ffprobe"].every((bin) => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0);

test("game UI guide carries the advisory world-branded UI and key art lens", () => {
  const guide = flat("skill/references/game-ui-and-narrative.md");
  assert.match(guide, /## World-Branded UI And Key Art Review Lens/);
  for (const lens of [
    "L1 Diegetic or non-diegetic", "L2 Material", "L3 Depth in flat UI", "L4 Decorative typography coherence",
    "L5 Focus control and world grounds", "L6 Transition logic", "L7 Feedback that answers input",
  ]) assert.ok(guide.includes(`### ${lens}`), lens);
  const lensText = guide.slice(guide.indexOf("## World-Branded UI And Key Art Review Lens"));
  assert.equal((lensText.match(/Good sign:/g) || []).length, 7);
  assert.equal((lensText.match(/Bad sign:/g) || []).length, 7);
  assert.equal((lensText.match(/- Check:/g) || []).length, 7);
  assert.match(lensText, /\*\*advisory\*\*: no lens blocks a stage, adds a gate or decides taste/);
  assert.match(lensText, /https:\/\/gameinstitute\.qq\.com\/article\/10027/);
  assert.match(lensText, /ablation eval \(#260\)/);
  // Checks are existing commands, with their limits stated.
  for (const check of ["verify composition", "verify interaction", "verify film-render", "composition capture"]) assert.ok(lensText.includes(check), check);
  assert.match(lensText, /skips text whose background is an image or gradient/);
  assert.match(lensText, /particles drawn on a canvas are not measured/);
  assert.match(read("skill/references/capability-routing.md"), /advisory review lens covers world-branded UI and key art/);
  const resources = JSON.parse(read("skill/references/package-resources.json"));
  assert.ok(resources.required.includes("references/game-ui-and-narrative.md"));
});

test("film guides carry the audited code-video mechanisms without a new gate", () => {
  const hyperframes = flat("skill/references/hyperframes.md");
  assert.match(hyperframes, /### Code drawn from time/);
  assert.match(hyperframes, /--workers 1 --format png-sequence/);
  assert.match(hyperframes, /--workers 3 --format png-sequence/);
  const film = flat("skill/references/workflow-film.md");
  assert.match(film, /tile=12x1/);
  assert.match(film, /fps=1,scale=360:-1,tile=5x3/);
  assert.match(film, /-stream_loop 1/);
  assert.match(film, /\*\*Motion blur \(optional\)\.\*\*/);
  assert.match(film, /Put cut times on whole frames/);
  const score = flat("skill/references/film-score.md");
  assert.match(score, /## Placing sound effects: hits by onset, swells by peak/);
  assert.match(score, /Put the onset on the cue frame and declare the cue `impact`, `accent` or `downbeat`/);
  assert.match(score, /declare the cue `riser`/);
  assert.match(score, /audio-gate\.md#hit-cues/);
  assert.match(score, /confirm the anchor by listening/);
  assert.doesNotMatch(flat("skill/references/game-ui-and-narrative.md"), /composition capture --seek/);
  assert.match(flat("skill/references/product-film-direction.md"), /Name a style by a concrete work/);
  const prompt = flat("skill/references/prompt-motion.md");
  assert.match(prompt, /## Code-animation style library \(companion, not bundled\)/);
  assert.match(prompt, /69ccbeaf0b821591a40936572c2f559d8f4cfb68/);
  assert.match(prompt, /do not vendor it and do not register it as a `sources fetch` bundle/);
  const methods = flat("skill/references/film-methods.md");
  assert.match(methods, /## Code-video libraries audited \(2026-11-04\)/);
  assert.match(methods, /3d90d349ef3fdde9b7e89de4df4a2159c9e8697f/);
  assert.match(methods, /ablation eval \(#260\)/);
  // The style library is routed, never registered as a fetchable bundle.
  assert.doesNotMatch(read("skill/scripts/cli-core.cjs"), /code-animation-prompts/);
});

function blendFilterFromGuide() {
  const match = read("skill/references/workflow-film.md").match(/-vf "(tmix=frames=4,select='eq\(mod\(n\\,8\)\\,3\)',setpts=N\/30\/TB)"/);
  assert.ok(match, "workflow-film.md documents the 30 fps blend filter");
  return match[1];
}

function run(args) {
  const result = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, String(result.stderr));
  return result.stdout;
}

test("documented subframe blur smears motion and never blends across a cut on a frame boundary", { skip: !hasFfmpeg }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dp-blur-"));
  try {
    const source = path.join(dir, "sub240.mkv");
    // 1 s at 240 fps: red then blue (hard cut at 0.5 s = output frame 15), a 20x60 white box moving 1200 px/s.
    run([
      "-f", "lavfi", "-i", "color=red:s=320x180:r=240:d=0.5", "-f", "lavfi", "-i", "color=blue:s=320x180:r=240:d=0.5",
      "-f", "lavfi", "-i", "color=white:s=20x60:r=240:d=1",
      "-filter_complex", "[0][1]concat=n=2:v=1[c];[c][2]overlay=x='mod(t*1200\\,300)':y=60:shortest=1[v]",
      "-map", "[v]", "-c:v", "ffv1", "-pix_fmt", "bgr0", source,
    ]);
    const blurred = path.join(dir, "blur30.mkv");
    run(["-i", source, "-vf", blendFilterFromGuide(), "-r", "30", "-c:v", "ffv1", "-pix_fmt", "bgr0", blurred]);
    const frames = run(["-i", blurred, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    const frameBytes = 320 * 180 * 3;
    assert.equal(frames.length / frameBytes, 30);
    const corner = [];
    for (let f = 0; f < 30; f += 1) {
      const [r, , b] = frames.subarray(f * frameBytes, f * frameBytes + 3);
      corner.push(r > 100 && b > 100 ? "mixed" : r > 100 ? "red" : b > 100 ? "blue" : "other");
    }
    assert.deepEqual(corner, [...Array(15).fill("red"), ...Array(15).fill("blue")]);
    const row = (buffer, f) => buffer.subarray(f * frameBytes + 90 * 320 * 3, f * frameBytes + 91 * 320 * 3);
    const covered = (pixels) => { let n = 0; for (let x = 0; x < 320; x += 1) if (pixels[x * 3 + 1] > 40) n += 1; return n; };
    const sharp = run(["-i", source, "-vf", "select='eq(n\\,40)'", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    const sharpWidth = covered(row(sharp, 0));
    assert.ok(sharpWidth >= 19 && sharpWidth <= 21, `sharp box ${sharpWidth} px`);
    // 4 subframes 5 px apart: the box covers about 20 + 15 px in the blended frame (overlay rounds x).
    const smear = covered(row(frames, 5));
    assert.ok(smear >= 33 && smear <= 36, `smeared box ${smear} px`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
