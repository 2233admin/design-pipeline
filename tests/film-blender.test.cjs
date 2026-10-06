"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const { spawnSync } = require("node:child_process");
const { findBlender, listTemplates, probeToTimeline, resolveParams } = require("../skill/scripts/blender-core.cjs");
const { fetchHdri, renderBlenderShot } = require("../skill/scripts/blender-project-core.cjs");
const { decodePng, encodePng } = require("../skill/scripts/png-core.cjs");
const { checkTimeline } = require("../skill/scripts/film-timeline-core.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-blender-"));
const turntable = () => listTemplates().find((template) => template.id === "product-turntable");
const PROBE = {
  fps: 24, frames: 96,
  fcurves: [
    { object: "Camera", path: "location", index: 1, keys: [[0, "BEZIER", "AUTO"], [3.9583, "BEZIER", "AUTO"]] },
    { object: "Product", path: "rotation_euler", index: 2, keys: [[0, "LINEAR", "AUTO"], [2, "LINEAR", "AUTO"], [3.9583, "LINEAR", "AUTO"]] },
  ],
};

test("templates declare typed parameters and a script shipped beside them", () => {
  for (const template of listTemplates()) {
    assert.ok(fs.existsSync(path.join(__dirname, "../skill/references/blender-templates", template.script)), template.id);
    for (const [key, spec] of Object.entries(template.params)) assert.ok(spec.description && spec.type, `${template.id}.${key}`);
  }
});

test("parameters are validated with actionable messages and defaults filled", () => {
  const resolved = resolveParams(turntable(), { color: "#2f6bff" });
  assert.equal(resolved.color, "#2f6bff");
  assert.equal(resolved.cameraMove, "push");
  assert.throws(() => resolveParams(turntable(), { spin: 3 }), /no parameter spin; allowed:/);
  assert.throws(() => resolveParams(turntable(), { cameraMove: "dolly" }), /allowed: push, orbit, static/);
  assert.throws(() => resolveParams(turntable(), { color: "blue" }), /hex color/);
  assert.throws(() => resolveParams(turntable(), { durationSec: 0 }), /from 1 to 60/);
  assert.throws(() => resolveParams(turntable(), { model: "missing.glb" }), /file not found/);
});

test("Blender keyframes become a film timeline the timeline gate can judge", () => {
  const timeline = probeToTimeline(PROBE);
  assert.equal(timeline.durationSec, 4);
  assert.deepEqual(timeline.tweens.map((t) => [t.targets[0], t.props[0], t.startSec, t.ease]), [
    ["#Camera", "locationY", 0, "bezier"],
    ["#Product", "rotationZ", 0, "linear"],
    ["#Product", "rotationZ", 2, "linear"],
  ]);
  const board = {
    schema: "design-pipeline.film-storyboard.v1", id: "shot", durationSec: 4, grammar: "product-demonstration",
    benefit: "The product in the round.", proofAction: "It turns into its hero pose.", sound: { mode: "silent", reason: "shot test" },
    beats: [{ id: "turn", startSec: 0, endSec: 4, role: "action", subject: "product", productAction: "Product turns to face the viewer", transformation: { kind: "camera-move", from: "side", to: "three-quarter" }, handoff: "open", motion: ["turntable"] }],
  };
  const result = checkTimeline(timeline, board);
  assert.equal(result.status, "passed");
  assert.equal(result.findings.filter((f) => f.code === "linear-motion").length, 2, "linear keyframes on a turning product warn");
});

test("HDRI ids are validated before any download", () => {
  assert.throws(() => fetchHdri(tmp(), "../etc"), /not a Poly Haven id/);
});

test("Blender discovery honors configured paths, searches PATH, and exposes selected-tool failures", () => {
  const dir = tmp();
  const executableName = process.platform === "win32" ? "blender.exe" : "blender";
  const explicit = path.join(dir, "explicit", executableName);
  const env = path.join(dir, "env", executableName);
  const onPath = path.join(dir, "path", executableName);
  for (const executable of [explicit, env, onPath]) {
    fs.mkdirSync(path.dirname(executable), { recursive: true });
    fs.writeFileSync(executable, "stub");
  }
  const previousPath = process.env.PATH;
  const previousBlenderPath = process.env.BLENDER_PATH;
  const originalSpawnSync = childProcess.spawnSync;
  const calls = [];
  try {
    process.env.PATH = path.dirname(onPath);
    process.env.BLENDER_PATH = env;
    childProcess.spawnSync = (executable) => {
      calls.push(executable);
      return { status: 0, stdout: "Blender 4.2.0\n", stderr: "" };
    };
    assert.equal(findBlender(explicit).path, explicit);
    assert.equal(findBlender().path, env);
    delete process.env.BLENDER_PATH;
    assert.equal(findBlender().path, onPath);

    calls.length = 0;
    childProcess.spawnSync = (executable) => {
      calls.push(executable);
      return { status: 1, stdout: "", stderr: "injected version failure" };
    };
    assert.throws(() => findBlender(explicit), (error) => error.code === "TOOL_FAILED" && /injected version failure/.test(error.message));
    assert.deepEqual(calls, [explicit], "a selected executable failure does not fall through to another Blender");
    assert.throws(() => findBlender(path.join(dir, "missing", executableName)), (error) => error.code === "TOOL_FAILED");
  } finally {
    childProcess.spawnSync = originalSpawnSync;
    if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath;
    if (previousBlenderPath === undefined) delete process.env.BLENDER_PATH; else process.env.BLENDER_PATH = previousBlenderPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("film blender renders into the project, converts keyframes and checks frames", () => {
  const dir = tmp();
  try {
    const fakeRender = (template, params, work) => {
      const frames = path.join(work, "frames");
      fs.mkdirSync(frames, { recursive: true });
      for (let i = 1; i <= 3; i += 1) {
        const data = Buffer.alloc(160 * 90 * 4);
        for (let p = 0; p < 160 * 90; p += 1) { const x = p % 160; const y = Math.floor(p / 160); const inside = x > 60 && x < 100 && y > 20 && y < 80; data[p * 4] = inside ? 47 : 14; data[p * 4 + 1] = inside ? 107 : 17; data[p * 4 + 2] = inside ? 255 : 22; data[p * 4 + 3] = 255; }
        fs.writeFileSync(path.join(frames, `frame_${String(i).padStart(4, "0")}.png`), encodePng({ width: 160, height: 90, data }));
      }
      fs.writeFileSync(path.join(frames, "motion.json"), JSON.stringify({ fps: 24, camera: [] }));
      return { template: turntable(), params, blender: { version: "5.2.2" }, probe: PROBE, frames };
    };
    let encoded = null;
    const result = renderBlenderShot(dir, { template: "product-turntable", params: { color: "#2f6bff" }, render: fakeRender, encode: (frames, fps, output) => { encoded = { fps, output }; fs.writeFileSync(output, "mp4"); } });
    assert.equal(result.status, "rendered");
    assert.equal(encoded.fps, 24);
    assert.equal(result.output, "renders/product-turntable.mp4");
    assert.equal(result.timeline, "timeline.json", "without an HTML composition the Blender timeline is the project timeline");
    assert.ok(fs.existsSync(path.join(dir, "timeline.json")));
    assert.equal(result.motion, "assets/product-turntable-motion.json");
    assert.equal(result.composition.length, 3);
    assert.ok(result.composition.every((frame) => frame.status === "passed"));
    assert.throws(() => renderBlenderShot(dir, {}), /--template is required/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

let blender = null;
try { blender = findBlender(); } catch (error) { if (error.code !== "TOOL_MISSING") throw error; }
const ffmpegProbe = spawnSync("ffmpeg", ["-version"], { windowsHide: true });
if (ffmpegProbe.error && ffmpegProbe.error.code !== "ENOENT") throw ffmpegProbe.error;
if (!ffmpegProbe.error && ffmpegProbe.status !== 0) throw new Error(`ffmpeg version probe failed with status ${ffmpegProbe.status}`);
const hasFfmpeg = !ffmpegProbe.error;

test("real Blender renders the turntable headless and deterministically", { skip: (!blender || !hasFfmpeg) && "Blender or ffmpeg not detected" }, () => {
  const dir = tmp();
  try {
    const params = { shape: "phone", width: 160, height: 90, durationSec: 1, fps: 12, samples: 4 };
    const first = renderBlenderShot(dir, { template: "product-turntable", params, output: "renders/a.mp4" });
    assert.equal(first.frames, 12);
    assert.ok(fs.statSync(path.join(dir, "renders/a.mp4")).size > 0);
    // Compare pixels, not bytes: Blender stamps render time and date into PNG metadata.
    const frameA = decodePng(fs.readFileSync(path.join(dir, ".design-pipeline/blender/product-turntable/frames/frame_0006.png"))).data;
    renderBlenderShot(dir, { template: "product-turntable", params, output: "renders/b.mp4" });
    const frameB = decodePng(fs.readFileSync(path.join(dir, ".design-pipeline/blender/product-turntable/frames/frame_0006.png"))).data;
    assert.ok(frameA.equals(frameB), "EEVEE renders are pixel-identical across runs");
    const timeline = JSON.parse(fs.readFileSync(path.join(dir, "timeline.json"), "utf8"));
    assert.ok(timeline.tweens.some((t) => t.targets[0] === "#Camera"));
    assert.ok(timeline.tweens.some((t) => t.targets[0] === "#Product" && t.props[0] === "rotationZ"));
  } finally {
    const tempRoot = path.resolve(os.tmpdir());
    const tempDir = path.resolve(dir);
    assert.ok(tempDir.startsWith(`${tempRoot}${path.sep}`), `refusing to remove a path outside the OS temp directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
