"use strict";

// `film blender`: render a Blender template into a film project and hand the result to the
// existing gates. Outputs: the encoded film, timeline.json converted from Blender keyframes (when
// the project has no HTML composition of its own), baked per-frame motion for three.js blocks,
// and a composition check of the first, middle and last frames.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fail } = require("./contract-utils.cjs");
const { encodeFrames, probeToTimeline, renderTemplate } = require("./blender-core.cjs");
const { checkComposition } = require("./composition-core.cjs");
const { decodePng } = require("./png-core.cjs");

const HOME = path.join(".design-pipeline", "blender");

function download(url) {
  const script = `require("https").get(${JSON.stringify(url)}, (r) => { if (r.statusCode !== 200) { process.stderr.write("HTTP " + r.statusCode); process.exit(2); } r.pipe(process.stdout); }).on("error", (e) => { process.stderr.write(e.message); process.exit(3); });`;
  const run = spawnSync(process.execPath, ["-e", script], { encoding: "buffer", maxBuffer: 1 << 30, timeout: 300000, windowsHide: true });
  if (run.status !== 0) fail("film blender", `download failed for ${url}: ${String(run.stderr)}. Fix: check network access or use hdri "studio"`, { code: "TOOL_FAILED" });
  return run.stdout;
}

// Poly Haven HDRIs are CC0; files are verified against the API's md5 and cached per project.
function fetchHdri(projectDir, id, resolution = "1k") {
  if (!/^[a-z0-9_]+$/.test(id)) fail("film blender", `hdri id ${id} is not a Poly Haven id (lowercase letters, digits, underscores), e.g. studio_small_09`);
  const file = path.join(projectDir, HOME, "hdri", `${id}_${resolution}.hdr`);
  if (fs.existsSync(file)) return file;
  let info;
  try { info = JSON.parse(download(`https://api.polyhaven.com/files/${id}`).toString("utf8")); } catch { info = null; }
  const entry = info && info.hdri && info.hdri[resolution] && info.hdri[resolution].hdr;
  if (!entry) fail("film blender", `Poly Haven has no ${resolution} HDR for ${id}. Fix: pick an id from polyhaven.com/hdris or use "studio"`);
  const data = download(entry.url);
  if (crypto.createHash("md5").update(data).digest("hex") !== entry.md5) fail("film blender", `downloaded HDRI ${id} failed its md5 check; retry`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}

function renderBlenderShot(projectDir, options = {}) {
  const root = path.resolve(projectDir);
  if (!options.template) fail("film blender", "--template is required; list templates with film blender --list", { code: "OPTION_REQUIRED" });
  const params = { ...(options.params || {}) };
  const work = path.join(root, HOME, options.template);
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(path.join(root, HOME, ".gitignore"), "*/frames/\nhdri/\n");
  const hdriFile = params.hdri && params.hdri !== "studio" ? (options.fetchHdri || fetchHdri)(root, params.hdri) : null;
  if (params.model) params.model = path.resolve(root, params.model);
  const render = (options.render || renderTemplate)(options.template, params, work, { engine: options.engine, blender: options.blender, extra: { hdriFile } });
  const fps = render.probe.fps;
  const output = path.join(root, options.output || path.join("renders", `${options.template}.mp4`));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  (options.encode || encodeFrames)(render.frames, fps, output, { audio: options.audio ? path.resolve(root, options.audio) : undefined });

  const timeline = probeToTimeline(render.probe);
  fs.writeFileSync(path.join(work, "timeline.json"), `${JSON.stringify(timeline, null, 2)}\n`);
  const hasComposition = fs.existsSync(path.join(root, "index.html"));
  if (!hasComposition) fs.writeFileSync(path.join(root, "timeline.json"), `${JSON.stringify(timeline, null, 2)}\n`);
  const motionSource = path.join(render.frames, "motion.json");
  const motionFile = path.join(root, "assets", `${options.template}-motion.json`);
  if (fs.existsSync(motionSource)) {
    fs.mkdirSync(path.dirname(motionFile), { recursive: true });
    fs.copyFileSync(motionSource, motionFile);
  }

  const pngs = fs.readdirSync(render.frames).filter((name) => /^frame_\d+\.png$/.test(name)).sort();
  const picks = [pngs[0], pngs[Math.floor(pngs.length / 2)], pngs[pngs.length - 1]].filter(Boolean);
  const composition = picks.map((name) => {
    const check = checkComposition(decodePng(fs.readFileSync(path.join(render.frames, name)), name), { profile: "frame" });
    return { frame: name, status: check.status, findings: check.findings.map(({ code, severity, fix }) => ({ code, severity, fix })) };
  });

  const rel = (file) => path.relative(root, file).split(path.sep).join("/");
  return {
    status: "rendered",
    template: options.template,
    blender: render.blender.version,
    engine: options.engine || render.template.engine,
    params: render.params,
    frames: pngs.length,
    fps,
    output: rel(output),
    timeline: hasComposition ? rel(path.join(work, "timeline.json")) : "timeline.json",
    motion: fs.existsSync(motionFile) ? rel(motionFile) : null,
    hdri: hdriFile ? rel(hdriFile) : "studio",
    composition,
    next: [
      "Run designer-pipeline film check --project-root . to apply the render, motion, composition and audio gates to the shot.",
      hasComposition ? `Host the shot in index.html as a <video src="${rel(output)}"> clip at its beat, or drive a three.js block from ${fs.existsSync(motionFile) ? rel(motionFile) : "the baked motion"}.` : "The storyboard's beats are judged against timeline.json converted from the Blender keyframes.",
    ],
  };
}

module.exports = { fetchHdri, renderBlenderShot };
