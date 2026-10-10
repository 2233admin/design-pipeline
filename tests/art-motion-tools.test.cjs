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
const { execute, parseArgs } = require("../skill/scripts/cli-core.cjs");
const repo = path.resolve(__dirname, ".."), tool = path.join(repo, "skill/tools/art-motion");
const runtime = path.join(tool, "runtime.js"), license = path.join(tool, "LICENSE");
const example = JSON.parse(fs.readFileSync(path.join(tool, "clip.example.json")));
const catalog = JSON.parse(fs.readFileSync(path.join(tool, "fonts/catalog.json"))).faces;
const LIBRARIES = ["brush", "camera", "chart", "collage", "diagram", "kit", "motion", "paint", "post", "render", "rig", "toon", "typo", "ui", "util"];
const SCENES = ["01_cave", "02_egypt", "03_greek", "04_roman", "05_gothic", "06_renaissance", "08_impressionism", "09_postimp", "10_nouveau", "11_cubism", "12_bauhaus", "13_pop", "14_8bit", "15_raytrace", "16_2026", "17_ink", "18_klimt", "19_munch", "20_dunhuang", "21_kusama", "22_constructivism", "23_dali", "24_hopper", "25_ghibli", "26_vaporwave", "27_kirby", "28_monet", "29_seurat", "30_matisse", "31_haring", "32_rembrandt", "33_rubberhose", "34_shadowpuppet", "35_shinkai", "36_picasso_blue"];
const CLIPS = ["t1_3b1b", "t2_keynote_ui", "t3_finance_chart", "y1_kurzgesagt", "y2_vox", "y3_whiteboard", "y4_storytime", "y5_kinetic_type"];
// Film render checks need ffmpeg and ffprobe on PATH and skip without them (AGENTS.md); CI runners have neither.
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0 && spawnSync("ffprobe", ["-version"], { windowsHide: true }).status === 0;
const skipWithoutFfmpeg = !hasFfmpeg && "ffmpeg not installed";
function browserTools() {
  try {
    resolvePuppeteer(repo, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [repo] });
    return { chrome: resolveChrome(), puppeteerModule };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `browser is unavailable: ${error.message}` };
  }
}
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "art-motion-tools-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true })); return directory;
}
const bundledInputs = families => families.map(family => `bundled:${catalog.find(face => face.family === family).file}`);
const jsFiles = directory => fs.readdirSync(path.join(tool, "engine", directory)).filter(file => file.endsWith(".js")).map(file => file.slice(0, -3)).sort();

test("owned engine, fonts, examples and license are complete and the runtime rebuilds unchanged", () => {
  assert.deepEqual(jsFiles("lib"), LIBRARIES);
  assert.deepEqual(jsFiles("scenes"), SCENES);
  assert.deepEqual(jsFiles("clips"), CLIPS);
  assert.ok(fs.statSync(path.join(tool, "engine/transitions.js")).isFile());
  assert.equal(catalog.length, 45);
  assert.equal(new Set(catalog.map(face => face.family)).size, 45, "font families are unique");
  for (const face of catalog) {
    assert.deepEqual(Object.keys(face).filter(key => !["family", "file", "weight"].includes(key)), [], `catalog entry ${face.family} has only family, file and weight`);
    assert.ok(typeof face.family === "string" && face.family && typeof face.file === "string" && !face.file.includes("/"), `catalog entry ${face.family} names a file in fonts/`);
    assert.ok(fs.statSync(path.join(tool, "fonts", face.file)).isFile(), `missing font ${face.file}`);
  }
  for (const notice of ["OFL.txt", "LICENSES.md"]) assert.ok(fs.statSync(path.join(tool, "fonts", notice)).isFile(), `missing font notice ${notice}`);
  const examples = fs.readdirSync(path.join(tool, "examples")).filter(file => file.endsWith(".json")).sort();
  assert.deepEqual(examples, CLIPS.map(id => `${id}.json`));
  const images = [];
  const collect = value => {
    if (typeof value === "string") { if (/\.(?:png|jpe?g|webp)$/i.test(value)) images.push(value); }
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  for (const file of examples) collect(JSON.parse(fs.readFileSync(path.join(tool, "examples", file))));
  assert.ok(images.length >= 3, "examples reference their image assets");
  for (const image of images) assert.ok(fs.statSync(path.resolve(tool, "examples", image)).isFile(), `missing example image ${image}`);
  for (const name of ["candlestick-landscape", "revenue-portrait", "finance-chart-landscape"]) assert.ok(images.includes(`assets/${name}.png`), `examples use assets/${name}.png`);
  const bundle = fs.readFileSync(runtime, "utf8");
  assert.ok(bundle.includes(fs.readFileSync(license, "utf8")), "runtime.js header embeds LICENSE verbatim");
  const before = fs.readFileSync(runtime);
  const build = spawnSync(process.execPath, [path.join(repo, "scripts/build-art-motion-runtime.cjs")], { encoding: "utf8", windowsHide: true });
  assert.equal(build.status, 0, build.stderr); assert.deepEqual(fs.readFileSync(runtime), before);
  assert.deepEqual(Object.keys(require(runtime)), ["createArtMotionRuntime"]);
});

test("scaffold opens offline, renders material, resizes and seeks identically without host-global helpers", async t => {
  const root = temporary(t), scaffold = scaffoldVisualCraft(root, { template: "art-motion", output: "study" });
  assert.deepEqual([...scaffold.files].sort(), ["LICENSE.art-motion", "clip.example.json", "index.html", "runtime.js"]);
  assert.deepEqual(fs.readdirSync(scaffold.directory).sort(), ["LICENSE.art-motion", "clip.example.json", "index.html", "runtime.js"]);
  assert.deepEqual(fs.readFileSync(path.join(scaffold.directory, "LICENSE.art-motion")), fs.readFileSync(license));
  assert.deepEqual(fs.readFileSync(path.join(scaffold.directory, "runtime.js")), fs.readFileSync(runtime));
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

test("render validates inputs, preserves asset aliases and exports timed PNG, H264 and alpha frames", { skip: skipWithoutFfmpeg }, async t => {
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
  assert.equal(report.runtimeSha256, sha256(fs.readFileSync(runtime)));
  assert.equal(Object.hasOwn(report, "sourceCommit"), false);
  assert.deepEqual(report.inputs.map(item => item.path), bundledInputs(example.fonts));
  assert.equal(report.frames.length, 4); assert.equal(report.frames[3].atSec, 0.75);
  assert.ok(new Set(report.frames.map(frame => frame.sha256)).size > 1);
  assert.equal(report.warnings.length, 0);
  await assert.rejects(render(root, options), /already exists/);
  const portrait = { ...spec, width: 270, height: 480, alpha: true, grammar: "y5_kinetic_type", fonts: ["PuHui-Black", "PuHui-Heavy", "PuHui-Bold"], safe: {}, data: {}, cues: [{ at: 0, kind: "title", text: "动画" }] };
  fs.writeFileSync(path.join(root, "portrait.json"), JSON.stringify(portrait));
  const still = await render(root, { spec: "portrait.json", output: "stills", stills: [0.5, 0, 0.75] });
  const stillReport = JSON.parse(fs.readFileSync(still.report));
  assert.deepEqual(stillReport.inputs.map(item => item.path), bundledInputs(portrait.fonts));
  const png = decodePng(fs.readFileSync(path.join(still.directory, "frame-000000.png")));
  assert.equal(png.width, 270); assert.equal(png.height, 480);
  assert.ok(png.data.some((value, index) => index % 4 === 3 && value === 0), "alpha is present");
  assert.ok(png.data.some((value, index) => index % 4 === 3 && value > 0), "content is present");
  const alpha = await render(root, { spec: "portrait.json", output: "alpha" });
  const stream = JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt,nb_frames,width,height", "-of", "json", path.join(alpha.directory, alpha.video)]).stdout).streams[0];
  assert.equal(stream.codec_name, "prores"); assert.match(stream.pix_fmt, /^yuva/); assert.equal(Number(stream.nb_frames), 4);
});

test("reference study joins source-bound motion/audio evidence without inventing a silent track", { skip: skipWithoutFfmpeg }, t => {
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

test("art-motion render CLI rejects an invalid spec and unregistered options without writing output", t => {
  const root = temporary(t), spec = JSON.stringify({ width: 64, height: 64, duration: 1, fps: 1 });
  fs.writeFileSync(path.join(root, "invalid.json"), spec);
  const invalid = execute(["art-motion", "render", "--root", root, "--spec", "invalid.json", "--output", "out", "--stills", "0", "--json"]);
  assert.equal(invalid.exitCode, 1, JSON.stringify(invalid.output));
  assert.equal(invalid.output.ok, false);
  assert.equal(invalid.output.error.code, "KERNEL_FAILED"); assert.match(invalid.output.error.message, /choose exactly one scene or grammar/);
  assert.equal(fs.readFileSync(path.join(root, "invalid.json"), "utf8"), spec);
  assert.deepEqual(fs.readdirSync(root), ["invalid.json"]);
  const unknown = execute(["art-motion", "render", "--root", root, "--spec", "invalid.json", "--output", "out", "--scene", "12_bauhaus", "--json"]);
  assert.equal(unknown.exitCode, 1);
  assert.equal(unknown.output.ok, false); assert.equal(unknown.output.error.code, "UNKNOWN_OPTION");
  assert.deepEqual(fs.readdirSync(root), ["invalid.json"]);
});

const BROWSER = browserTools();
test("art-motion render CLI renders a still through the kernel and reports the runtime digest", { skip: BROWSER.skip }, t => {
  const root = temporary(t);
  fs.writeFileSync(path.join(root, "tiny.json"), JSON.stringify({ width: 64, height: 64, duration: 1, fps: 1, scene: "12_bauhaus" }));
  const rendered = execute(["art-motion", "render", "--root", root, "--spec", "tiny.json", "--output", "still", "--stills", "0", "--chrome", BROWSER.chrome, "--puppeteer-module", BROWSER.puppeteerModule, "--json"]);
  assert.equal(rendered.exitCode, 0, JSON.stringify(rendered.output));
  assert.equal(rendered.output.ok, true); assert.equal(rendered.output.status, "rendered");
  assert.equal(rendered.output.video, null); assert.equal(rendered.output.frames, 1); assert.equal(rendered.output.coldAndReorderedMatch, true);
  const report = JSON.parse(fs.readFileSync(path.join(root, "still/render-report.json")));
  assert.equal(report.runtimeSha256, sha256(fs.readFileSync(runtime)));
  assert.equal(report.frames.length, 1); assert.equal(report.frames[0].atSec, 0);
  const png = decodePng(fs.readFileSync(path.join(root, "still", report.frames[0].path)));
  assert.equal(png.width, 64); assert.equal(png.height, 64);
});

test("reference analyze-video writes study evidence only with --study", { skip: skipWithoutFfmpeg }, t => {
  const root = temporary(t);
  run("ffmpeg", ["-v", "error", "-n", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=8:duration=1.5", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=22050:duration=1.5", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(root, "source.mp4")]);
  const analyze = (output, ...extra) => execute(["reference", "analyze-video", "--root", root, "--path", "source.mp4", "--output", output, "--fps", "4", "--max-frames", "20", ...extra, "--json"]);
  const studied = analyze("studied", "--study");
  assert.equal(studied.exitCode, 0, JSON.stringify(studied.output)); assert.equal(studied.output.ok, true);
  assert.equal(studied.output.studyPath, "studied/study.json"); assert.equal(studied.output.audioAvailable, true);
  const study = JSON.parse(fs.readFileSync(path.join(root, "studied/study.json")));
  assert.equal(study.sourceSha256, sha256(fs.readFileSync(path.join(root, "source.mp4"))));
  assert.ok(study.audio, "a source with sound yields audio evidence");
  assert.ok(Array.isArray(study.audio.beats));
  assert.ok(fs.existsSync(path.join(root, "studied", study.audio.waveform.path)));
  assert.ok(fs.existsSync(path.join(root, "studied", study.audio.spectrum.path)));
  const plain = analyze("plain");
  assert.equal(plain.exitCode, 0, JSON.stringify(plain.output)); assert.equal(plain.output.ok, true);
  assert.equal(Object.hasOwn(plain.output, "studyPath"), false); assert.equal(Object.hasOwn(plain.output, "audioAvailable"), false);
  assert.ok(fs.statSync(path.join(root, "plain")).isDirectory());
  assert.equal(fs.existsSync(path.join(root, "plain/study.json")), false);
  assert.equal(fs.existsSync(path.join(root, "plain/reference-audio.wav")), false);
  assert.equal(fs.existsSync(path.join(root, "plain/spectrum.png")), false);
});

test("Art Motion guides link to existing files and document only registered CLI options", () => {
  const references = path.join(repo, "skill/references");
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : entry.name.endsWith(".md") ? [path.join(directory, entry.name)] : []);
  const docs = [
    ...fs.readdirSync(tool).filter(file => file.endsWith(".md")).map(file => path.join(tool, file)),
    path.join(references, "art-motion.md"),
    ...walk(path.join(references, "art-motion")),
  ];
  assert.ok(docs.length > 3);
  const broken = [], unknown = [];
  for (const doc of docs) {
    const text = fs.readFileSync(doc, "utf8"), relative = path.relative(repo, doc).replaceAll("\\", "/");
    const prose = text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
    const targets = [
      ...[...prose.matchAll(/\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g)].map(match => match[1]),
      ...[...prose.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/gm)].map(match => match[1]),
    ];
    for (const raw of targets) {
      const target = raw.replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:)/i.test(target) || target.startsWith("#")) continue;
      const file = decodeURIComponent(target.replace(/[?#].*$/, ""));
      if (!fs.existsSync(path.resolve(path.dirname(doc), file))) broken.push(`${relative}: ${raw}`);
    }
    for (const line of text.split("\n").filter(value => /art-motion render|reference analyze-video/.test(value))) {
      for (const [flag] of line.matchAll(/(?<![\w-])--[a-z][a-z0-9-]*/g)) {
        try { parseArgs([flag, "value"]); }
        catch (error) { if (error.code === "UNKNOWN_OPTION") unknown.push(`${relative}: ${flag}`); else throw error; }
      }
    }
  }
  assert.deepEqual(broken, [], "relative Markdown links resolve");
  assert.deepEqual([...new Set(unknown)], [], "documented CLI flags are registered");
});
