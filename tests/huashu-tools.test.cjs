"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");
const { render, validateSpec, loadInputs } = require("../skill/tools/art-motion/render.cjs");
const { fitCutGrid, analyzeReference } = require("../skill/tools/art-motion/reference.cjs");
const { scaffoldVisualCraft } = require("../skill/tools/visual-craft/scaffold.cjs");
const { resolvePuppeteer, resolveChrome } = require("../skill/scripts/film-capture-core.cjs");
const { run } = require("../skill/scripts/film-core.cjs");
const { encodePng, decodePng } = require("../skill/scripts/png-core.cjs");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");
const { included } = require("../scripts/import-huashu-art-motion.cjs");
const repo = path.resolve(__dirname, ".."), vendor = path.join(repo, "skill/vendor/huashu-art-motion");
const example = JSON.parse(fs.readFileSync(path.join(repo, "skill/tools/art-motion/clip.example.json")));
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "huashu-tools-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true })); return directory;
}

test("complete pinned source keeps original paths and rebuilds the same static runtime", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(vendor, "manifest.json")));
  assert.equal(manifest.files.length, 324);
  for (const entry of manifest.files) {
    assert.equal(entry.localPath, `upstream/${entry.sourcePath}`);
    assert.equal(included(entry.sourcePath), true);
    assert.equal(sha256(fs.readFileSync(path.join(vendor, entry.localPath))), entry.sha256);
  }
  assert.ok(manifest.files.some(file => file.sourcePath.endsWith("ARPHICPL.TXT")));
  assert.equal(included("scripts/engine/demos/_shared/hero/author.png"), false);
  const runtime = path.join(repo, "skill/tools/art-motion/huashu-runtime.js"), before = fs.readFileSync(runtime);
  const build = spawnSync(process.execPath, [path.join(repo, "skill/tools/art-motion/build-huashu-runtime.cjs")], { encoding: "utf8", windowsHide: true });
  assert.equal(build.status, 0, build.stderr); assert.deepEqual(fs.readFileSync(runtime), before);
});

test("scaffold opens offline, renders material, resizes and seeks identically without host-global helpers", async t => {
  const root = temporary(t), scaffold = scaffoldVisualCraft(root, { template: "art-motion", output: "study" });
  assert.throws(() => scaffoldVisualCraft(root, { template: "art-motion", output: "study" }), /exists/);
  const browser = await resolvePuppeteer(repo).launch({ executablePath: resolveChrome(), headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(pathToFileURL(scaffold.entry).href);
  for (const width of [390, 1280]) {
    await page.setViewport({ width, height: 900 });
    const capture = time => page.evaluate(time => {
      const state = renderStudy(time);
      return { state, pixels: document.querySelector("canvas").toDataURL(), scrollWidth: document.documentElement.scrollWidth, globals: [typeof window.U, typeof window.PAINT] };
    }, time);
    const first = await capture(0.6);
    assert.ok(first.scrollWidth <= width); assert.deepEqual(first.globals, ["undefined", "undefined"]);
    assert.notEqual((await capture(0.9)).pixels, first.pixels);
    await capture(0.1); assert.deepEqual(await capture(0.6), first);
  }
  assert.deepEqual(errors, []);
});

test("render validates inputs, preserves asset aliases and exports timed PNG, H264 and alpha frames", async t => {
  const root = temporary(t), spec = { ...example, width: 480, height: 270, duration: 1, fps: 4, safe: { bottom: 25 } };
  fs.writeFileSync(path.join(root, "clip.json"), JSON.stringify(spec));
  assert.throws(() => validateSpec({ ...spec, duration: 0.3 }), /exact number of frames/);
  assert.throws(() => validateSpec({ ...spec, safe: { left: 480 } }), /positive content box/);
  assert.throws(() => validateSpec({ ...spec, cues: [{ at: 1, kind: "title" }] }), /last rendered frame/);
  assert.throws(() => validateSpec({ ...spec, cues: [{ at: 0.75, dur: 0.5, kind: "title" }] }), /dur/);
  fs.writeFileSync(path.join(root, "image.png"), encodePng({ width: 1, height: 1, data: Buffer.from([255, 0, 0, 255]) }));
  const input = loadInputs(root, { assets: { hero: "image.png" }, cues: [{ image: "hero" }] }, path.join(root, "clip.json"));
  assert.equal(input.files.length, 1); assert.match(input.assets.hero, /^data:image\/png/);
  assert.throws(() => loadInputs(root, { assets: { hero: "../escape.png" } }, path.join(root, "clip.json")), /inside|escape|contain/i);
  const options = { spec: "clip.json", output: "video" };
  const video = await render(root, options);
  assert.equal(video.frames, 4); assert.equal(video.coldAndReorderedMatch, true);
  const report = JSON.parse(fs.readFileSync(video.report));
  assert.equal(report.frames.length, 4); assert.equal(report.frames[3].atSec, 0.75);
  assert.ok(new Set(report.frames.map(frame => frame.sha256)).size > 1);
  assert.equal(report.warnings.length, 0);
  await assert.rejects(render(root, options), /already exists/);
  const portrait = { ...spec, width: 270, height: 480, alpha: true, grammar: "y5_kinetic_type", fonts: ["PuHui-Black", "PuHui-Heavy", "PuHui-Bold"], safe: {}, data: {}, cues: [{ at: 0, kind: "title", text: "动画" }] };
  fs.writeFileSync(path.join(root, "portrait.json"), JSON.stringify(portrait));
  const still = await render(root, { spec: "portrait.json", output: "stills", stills: [0.5, 0, 0.75] });
  const png = decodePng(fs.readFileSync(path.join(still.directory, "frame-000000.png")));
  assert.equal(png.width, 270); assert.equal(png.height, 480);
  assert.ok(png.data.some((value, index) => index % 4 === 3 && value === 0), "alpha is present");
  assert.ok(png.data.some((value, index) => index % 4 === 3 && value > 0), "content is present");
  const alpha = await render(root, { spec: "portrait.json", output: "alpha" });
  const stream = JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt,nb_frames,width,height", "-of", "json", path.join(alpha.directory, alpha.video)]).stdout).streams[0];
  assert.equal(stream.codec_name, "prores"); assert.match(stream.pix_fmt, /^yuva/); assert.equal(Number(stream.nb_frames), 4);
});

test("reference study joins source-bound motion/audio evidence without inventing a silent track", t => {
  const root = temporary(t), grid = fitCutGrid([0.01, 0.51, 1.01, 1.51, 2.01]);
  assert.ok(Math.abs(grid.stepSec - 0.5) < 0.01); assert.equal(fitCutGrid([0, 1]), null);
  assert.throws(() => fitCutGrid([0, 1, 0.5, 2]), /ordered/);
  run("ffmpeg", ["-v", "error", "-n", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=8:duration=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=22050:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(root, "source.mp4")]);
  const result = analyzeReference(root, { path: "source.mp4", output: "study", startSec: 0.5, endSec: 1.5, sampleFps: 8, maxFrames: 20 });
  const study = JSON.parse(fs.readFileSync(path.join(root, result.studyPath)));
  assert.equal(result.audioAvailable, true); assert.equal(study.audio.sourceStartSec, 0.5);
  assert.equal(study.sourceSha256, sha256(fs.readFileSync(path.join(root, "source.mp4"))));
  assert.equal(study.reference.sha256, result.descriptor.sha256);
  assert.ok(result.report.motionMaps.length > 0); assert.ok(study.audio.beats.every(time => time >= 0.5 && time <= 1.5));
  assert.ok(fs.existsSync(path.join(root, "study", study.audio.spectrum.path)));
  run("ffmpeg", ["-v", "error", "-n", "-i", path.join(root, "source.mp4"), "-an", "-c:v", "copy", path.join(root, "silent.mp4")]);
  const silent = analyzeReference(root, { path: "silent.mp4", output: "silent", sampleFps: 4, maxFrames: 20 });
  assert.equal(silent.audioAvailable, false); assert.equal(JSON.parse(fs.readFileSync(path.join(root, silent.studyPath))).audio, null);
});
