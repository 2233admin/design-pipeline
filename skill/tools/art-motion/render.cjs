#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { resolveChrome, resolvePuppeteer } = require("../../scripts/film-capture-core.cjs");
const { run, probe } = require("../../scripts/film-core.cjs");
const { assertKeys, resolveInside, readJson, sha256 } = require("../../scripts/contract-utils.cjs");

const SOURCE = path.resolve(__dirname, "../../vendor/huashu-art-motion/upstream/scripts/engine");
const RUNTIME = path.join(__dirname, "huashu-runtime.js");
function number(value, label, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label} must be ${integer ? "an integer" : "finite"} in ${min}..${max}`);
  return value;
}

function validateSpec(spec) {
  assertKeys(spec, ["width", "height", "duration", "fps"], ["width", "height", "duration", "fps", "scene", "grammar", "safe", "theme", "alpha", "data", "cues", "assets", "fonts", "seed", "fit"], "spec", "art motion");
  number(spec.width, "width", 1, 8192, true); number(spec.height, "height", 1, 8192, true);
  if (spec.width * spec.height > 16000000) throw new Error("canvas exceeds 16 megapixels");
  number(spec.fps, "fps", 1, 120, true); number(spec.duration, "duration", 1 / spec.fps, 3600);
  const frames = spec.duration * spec.fps;
  if (Math.abs(frames - Math.round(frames)) > 1e-7 || frames > 216000) throw new Error("duration must be an exact number of frames, at most 216000");
  if (Boolean(spec.scene) === Boolean(spec.grammar)) throw new Error("choose exactly one scene or grammar");
  for (const [key, directory] of [["scene", "scenes"], ["grammar", "clips"]]) {
    if (spec[key] !== undefined && (!/^[a-z0-9_]+$/.test(spec[key]) || spec[key] === "index" || !fs.existsSync(path.join(SOURCE, directory, `${spec[key]}.js`)))) throw new Error(`unknown ${key}: ${spec[key]}`);
  }
  if (spec.alpha !== undefined && typeof spec.alpha !== "boolean") throw new Error("alpha must be boolean");
  if (spec.seed !== undefined) number(spec.seed, "seed", 0, 0xffffffff, true);
  if (spec.fit !== undefined && !["contain", "cover"].includes(spec.fit)) throw new Error("fit must be contain or cover");
  if (spec.safe !== undefined) {
    assertKeys(spec.safe, [], ["left", "right", "top", "bottom", "fill"], "safe", "art motion");
    for (const edge of ["left", "right", "top", "bottom"]) if (spec.safe[edge] !== undefined) number(spec.safe[edge], `safe.${edge}`, 0, 8192);
    if ((spec.safe.left || 0) + (spec.safe.right || 0) >= spec.width || (spec.safe.top || 0) + (spec.safe.bottom || 0) >= spec.height) throw new Error("safe must leave a positive content box");
    if (spec.safe.fill !== undefined && typeof spec.safe.fill !== "string") throw new Error("safe.fill must be a CSS color string");
    if (spec.scene) throw new Error("safe applies to grammar layout; recompose authored scene previews explicitly");
  }
  if (spec.assets !== undefined && (!spec.assets || Array.isArray(spec.assets) || typeof spec.assets !== "object")) throw new Error("assets must map keys to project-relative image paths");
  if (spec.cues !== undefined && (!Array.isArray(spec.cues) || spec.cues.length > 1000)) throw new Error("cues must be an array of at most 1000 entries");
  for (const [index, cue] of (spec.cues || []).entries()) {
    if (!cue || typeof cue !== "object" || Array.isArray(cue)) throw new Error(`cue ${index} must be an object`);
    number(cue.at, `cues[${index}].at`, 0, spec.duration);
    if (cue.at >= spec.duration) throw new Error(`cue ${index} starts after the last rendered frame`);
    if (typeof cue.kind !== "string" || !cue.kind) throw new Error(`cues[${index}].kind is required`);
    if (cue.dur !== undefined) number(cue.dur, `cues[${index}].dur`, 1 / spec.fps, spec.duration - cue.at);
  }
  return spec;
}

function dataFile(file, mime) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 32 * 1024 * 1024) throw new Error(`asset must be a file <=32 MiB: ${file}`);
  const bytes = fs.readFileSync(file);
  return { url: `data:${mime};base64,${bytes.toString("base64")}`, sha256: sha256(bytes) };
}

function loadInputs(root, spec, specFile) {
  const assetRoot = path.dirname(specFile);
  const files = [], assets = {}, fonts = [];
  let remaining = 64 * 1024 * 1024;
  const load = (file, mime) => {
    const bytes = fs.statSync(file).size;
    if (bytes > remaining) throw new Error("combined image/font inputs exceed 64 MiB");
    remaining -= bytes;
    return dataFile(file, mime);
  };
  const assetPaths = new Map(Object.entries(spec.assets || {}));
  for (const value of [...(spec.cues || []).map(cue => cue.image), spec.data?.image].filter(Boolean)) if (!assetPaths.has(value)) assetPaths.set(value, value);
  if (assetPaths.size > 128) throw new Error("at most 128 image assets are supported");
  for (const [key, file] of assetPaths) {
    if (typeof file !== "string" || /^(?:https?:|data:)/i.test(file)) throw new Error("images must be explicitly supplied local files");
    const full = resolveInside(root, path.resolve(assetRoot, file), "image", { mustExist: true });
    const ext = path.extname(full).toLowerCase();
    const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[ext];
    if (!mime) throw new Error("use PNG, JPEG or WebP image assets");
    const loaded = load(full, mime); Object.defineProperty(assets, key, { value: loaded.url, enumerable: true });
    files.push({ path: path.relative(root, full).replaceAll("\\", "/"), sha256: loaded.sha256 });
  }
  const sourceFaces = [...fs.readFileSync(path.join(SOURCE, "lib/fonts.js"), "utf8").matchAll(/\{family:'([^']+)', url:'([^']+)'(?:, desc:\{weight:'([^']+)'\})?\}/g)].map(([, family, file, weight]) => ({ family, file, ...(weight ? { weight } : {}) }));
  const requested = spec.fonts === "bundled" ? sourceFaces.map(face => face.family) : (spec.fonts || []);
  if (!Array.isArray(requested) || requested.length > 64) throw new Error("fonts must be 'bundled' or at most 64 explicit family names/font descriptors");
  for (const item of requested) {
    let face, full;
    if (typeof item === "string") {
      face = sourceFaces.find(value => value.family === item);
      if (!face) throw new Error(`unknown bundled font ${item}`);
      full = resolveInside(SOURCE, face.file, "bundled font", { mustExist: true });
    } else {
      assertKeys(item, ["family", "file"], ["family", "file", "weight", "style"], "font", "art motion");
      face = item; full = resolveInside(root, path.resolve(assetRoot, face.file), "font", { mustExist: true });
    }
    if (typeof face.family !== "string" || !face.family || face.family.length > 128) throw new Error("font family must be a nonempty name <=128 characters");
    if (!/\.(woff|ttf|otf)$/i.test(full)) throw new Error("glyph coverage requires WOFF1, TTF or OTF");
    const loaded = load(full, "application/octet-stream");
    fonts.push({ family: face.family, url: loaded.url, desc: { ...(face.weight ? { weight: face.weight } : {}), ...(face.style ? { style: face.style } : {}) } });
    files.push({ path: typeof item === "string" ? `bundled:${face.file}` : path.relative(root, full).replaceAll("\\", "/"), sha256: loaded.sha256 });
  }
  return { assets, fonts, files };
}

async function render(root, options) {
  root = path.resolve(root);
  const specFile = resolveInside(root, options.spec, "spec", { mustExist: true });
  if (fs.statSync(specFile).size > 2 * 1024 * 1024) throw new Error("spec exceeds 2 MiB");
  const specBytes = fs.readFileSync(specFile), spec = validateSpec(readJson(specFile));
  const directory = resolveInside(root, options.output, "output");
  if (fs.existsSync(directory)) throw new Error("output already exists; choose a new directory");
  const times = options.stills === undefined ? null : options.stills;
  if (times !== null && (!Array.isArray(times) || !times.length || times.length > 100 || new Set(times).size !== times.length)) throw new Error("stills must contain 1..100 distinct seconds");
  for (const time of times || []) number(time, "still time", 0, spec.duration);
  if (!times && !spec.alpha && (spec.width % 2 || spec.height % 2)) throw new Error("H.264 export requires even dimensions; PNG/alpha exports can retain odd dimensions");
  const inputs = loadInputs(root, spec, specFile);
  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  if (!times) { run(tools.ffmpeg, ["-version"]); run(tools.ffprobe, ["-version"]); }
  const puppeteer = resolvePuppeteer(root, options.puppeteerModule);
  const browser = await puppeteer.launch({ executablePath: resolveChrome(options.chrome), headless: true });
  let encoder, encoded, encoderError = "", closed = false;
  try {
    const page = await browser.newPage(), errors = [], warnings = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); else if (message.type() === "warning") warnings.push(message.text()); });
    await page.setViewport({ width: spec.width, height: spec.height });
    await page.setContent("<!doctype html><meta charset=utf-8><canvas id=artCanvas></canvas>");
    await page.addScriptTag({ path: RUNTIME });
    await page.evaluate(async ({ spec, assets, fonts }) => {
      const loaded = Object.create(null); let pixels = 0;
      for (const [key, url] of Object.entries(assets)) {
        const image = new Image(); image.src = url; await image.decode(); pixels += image.naturalWidth * image.naturalHeight;
        if (pixels > 64000000) throw new Error("decoded image assets exceed 64 megapixels");
        loaded[key] = image;
      }
      for (const face of fonts) { const font = new FontFace(face.family, `url(${face.url})`, face.desc); document.fonts.add(await font.load()); }
      await document.fonts.ready;
      const canvas = document.getElementById("artCanvas"); canvas.width = spec.width; canvas.height = spec.height;
      const context = canvas.getContext("2d");
      window.resetArt = async () => {
        window.art?.dispose();
        window.art = HuashuArtMotion.createHuashuRuntime({ width: spec.width, height: spec.height, assets: loaded, fonts, seed: spec.seed ?? 1,
          createCanvas(width, height) { const value = document.createElement("canvas"); value.width = width; value.height = height; return value; },
          capabilities: { Path2D, DOMMatrix, DOMPoint } });
        if (["y1_kurzgesagt", "y4_storytime"].includes(spec.grammar)) window.art.enableDemoArt();
        await window.art.libraries.U.loadCmaps(fonts);
      };
      await window.resetArt();
      window.drawArt = time => {
        const start = performance.now(); context.reset(); context.clearRect(0, 0, canvas.width, canvas.height);
        if (spec.scene) window.art.drawScene(spec.scene, context, time, { fit: spec.fit || "contain" });
        else window.art.drawClip(spec.grammar, context, time, { cues: [], ...Object.fromEntries(["grammar", "duration", "fps", "width", "height", "safe", "theme", "alpha", "data", "cues"].filter(key => spec[key] !== undefined).map(key => [key, spec[key]])) });
        const pixels = canvas.toDataURL("image/png").split(",")[1];
        return { pixels, renderMs: performance.now() - start };
      };
    }, { spec, assets: inputs.assets, fonts: inputs.fonts });
    if (errors.length) throw new Error(errors.join("\n"));
    fs.mkdirSync(path.dirname(directory), { recursive: true }); fs.mkdirSync(directory);
    const records = [], count = times ? times.length : Math.round(spec.duration * spec.fps);
    const temporary = path.join(directory, spec.alpha ? "render.partial.mov" : "render.partial.mp4");
    if (!times) {
      const codec = spec.alpha ? ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-alpha_bits", "16"] : ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", "-g", String(spec.fps)];
      encoder = spawn(tools.ffmpeg, ["-v", "error", "-n", "-f", "image2pipe", "-framerate", String(spec.fps), "-c:v", "png", "-i", "pipe:0", "-an", ...codec, temporary], { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
      encoder.stderr.on("data", data => { encoderError = (encoderError + data).slice(-8192); });
      encoder.stdin.on("error", error => { encoderError = error.message; });
      encoded = new Promise((resolve, reject) => { encoder.on("error", reject); encoder.on("close", code => { closed = true; code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}: ${encoderError}`)); }); });
      encoded.catch(() => {});
    }
    let first;
    for (let index = 0; index < count; index++) {
      const atSec = times ? times[index] : index / spec.fps;
      const result = await page.evaluate(time => window.drawArt(time), atSec);
      if (errors.length) throw new Error(errors.join("\n"));
      const png = Buffer.from(result.pixels, "base64"), digest = sha256(png);
      first ||= { atSec, sha256: digest };
      const file = `frame-${String(index).padStart(6, "0")}.png`;
      if (times || index === 0 || index === count - 1) fs.writeFileSync(path.join(directory, file), png, { flag: "wx" });
      if (encoder) {
        if (closed || encoder.stdin.destroyed) { await encoded; throw new Error("FFmpeg closed before receiving all frames"); }
        if (!encoder.stdin.write(png)) await Promise.race([once(encoder.stdin, "drain"), encoded.then(() => { throw new Error("FFmpeg closed while writing frames"); })]);
      }
      records.push({ atSec, sha256: digest, renderMs: result.renderMs, ...(times || index === 0 || index === count - 1 ? { path: file } : {}) });
    }
    const warm = await page.evaluate(time => window.drawArt(time), first.atSec);
    await page.evaluate(() => window.resetArt());
    const cold = await page.evaluate(time => window.drawArt(time), first.atSec);
    const deterministic = first.sha256 === sha256(Buffer.from(warm.pixels, "base64")) && first.sha256 === sha256(Buffer.from(cold.pixels, "base64"));
    if (errors.length) throw new Error(errors.join("\n"));
    if (!deterministic) throw new Error("cold/reordered frame mismatch; inspect stateful drawing before export");
    let video = null;
    if (encoder) {
      encoder.stdin.end(); await encoded;
      const media = probe(temporary, tools);
      if (Math.abs(media.durationSec - spec.duration) > 1 / spec.fps + 0.001 || Math.abs(media.fps - spec.fps) > 0.001) throw new Error("encoded timing does not match requested frames/fps");
      video = spec.alpha ? "render.mov" : "render.mp4"; fs.renameSync(temporary, path.join(directory, video));
    }
    const report = { specSha256: sha256(specBytes), inputs: inputs.files, sourceCommit: "26dba25b2b495c2138848c29a2c90df356a20325", width: spec.width, height: spec.height, fps: spec.fps, durationSec: spec.duration, video, frames: records, coldAndReorderedMatch: deterministic, warnings: [...new Set(warnings)], limits: ["Canvas timing includes PNG readback; it is not real-time playback performance.", "Authored style scenes retain source composition; contain/cover is not responsive reflow.", "Rendered output and technical diagnostics do not grant creative acceptance."] };
    fs.writeFileSync(path.join(directory, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
    return { directory, video, frames: count, coldAndReorderedMatch: deterministic, report: path.join(directory, "render-report.json") };
  } finally {
    if (encoder && !closed) { encoder.stdin.destroy(); encoder.kill(); }
    await browser.close();
  }
}

if (require.main === module) {
  const names = { "--root": "root", "--spec": "spec", "--output": "output", "--stills": "stills", "--chrome": "chrome", "--puppeteer-module": "puppeteerModule", "--ffmpeg": "ffmpeg", "--ffprobe": "ffprobe" };
  (async () => {
    const options = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = names[process.argv[i]], value = process.argv[i + 1];
      if (!key || value === undefined || value.startsWith("--") || Object.hasOwn(options, key)) throw new Error(`invalid option ${process.argv[i]}`);
      options[key] = key === "stills" ? value.split(",").map(Number) : value;
    }
    console.log(JSON.stringify(await render(options.root || process.cwd(), options), null, 2));
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { validateSpec, loadInputs, render };
