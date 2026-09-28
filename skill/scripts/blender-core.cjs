"use strict";

// Blender adapter core. Blender (GPL) is an external program the user installs; this package
// only ships MIT template scripts that Blender runs headless (`blender -b -P template.py -- ...`).
// A template reads a params JSON, builds the scene, renders a PNG sequence and writes a keyframe
// probe. The probe is converted to design-pipeline.film-timeline.v1 so the existing timeline gate
// judges Blender motion exactly like GSAP motion; the rendered film goes through the same render,
// composition and audio gates.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fail } = require("./contract-utils.cjs");

const SCOPE = "film blender";
const TEMPLATE_DIR = path.join(__dirname, "../references/blender-templates");

function findBlender(explicit) {
  const candidates = [explicit, process.env.BLENDER_PATH].filter(Boolean);
  if (process.platform === "win32") {
    const root = path.join(process.env.ProgramFiles || "C:\\Program Files", "Blender Foundation");
    if (fs.existsSync(root)) for (const dir of fs.readdirSync(root).sort().reverse()) candidates.push(path.join(root, dir, "blender.exe"));
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Blender.app/Contents/MacOS/Blender");
  } else {
    candidates.push("/usr/bin/blender", "/usr/local/bin/blender", path.join(os.homedir(), "blender", "blender"));
  }
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    // Blender writes a GPU compatibility cache (.cache/compat.dat) into its working directory.
    const version = spawnSync(candidate, ["-b", "--factory-startup", "--version"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true, timeout: 60000 });
    const match = String(version.stdout).match(/Blender (\d+)\.(\d+)\.(\d+)/);
    if (match) return { path: candidate, version: `${match[1]}.${match[2]}.${match[3]}`, major: Number(match[1]), minor: Number(match[2]) };
  }
  fail(SCOPE, "Blender not found. Fix: install Blender 4.2 LTS or newer (blender.org), then pass --blender <path to blender executable> or set BLENDER_PATH", { code: "TOOL_MISSING" });
}

function listTemplates() {
  return fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, name), "utf8")));
}

// Validate params against the template's declared parameters and fill defaults.
function resolveParams(template, params = {}) {
  const resolved = {};
  const allowed = Object.keys(template.params);
  for (const key of Object.keys(params)) if (!allowed.includes(key)) fail(SCOPE, `template ${template.id} has no parameter ${key}; allowed: ${allowed.join(", ")}`);
  for (const [key, spec] of Object.entries(template.params)) {
    const value = params[key] ?? spec.default;
    if (value === undefined) fail(SCOPE, `template ${template.id} needs ${key}: ${spec.description}`);
    if (spec.type === "number" && (typeof value !== "number" || (spec.min !== undefined && value < spec.min) || (spec.max !== undefined && value > spec.max))) fail(SCOPE, `${key} must be a number${spec.min !== undefined ? ` from ${spec.min}` : ""}${spec.max !== undefined ? ` to ${spec.max}` : ""}`);
    if (spec.type === "enum" && !spec.values.includes(value)) fail(SCOPE, `${key} has invalid value ${value}; allowed: ${spec.values.join(", ")}`);
    if (spec.type === "color" && !/^#[0-9a-f]{6}$/i.test(String(value))) fail(SCOPE, `${key} must be a hex color like #ff7a45`);
    if (spec.type === "file" && value && !fs.existsSync(value)) fail(SCOPE, `${key} file not found: ${value}`);
    resolved[key] = value;
  }
  return resolved;
}

// Blender keyframe probe -> film timeline: each pair of consecutive keys on an fcurve becomes a
// tween on "<object>" animating "<data_path>[index]" with Blender's interpolation as its ease.
const EASE = { LINEAR: "linear", CONSTANT: "steps(1)", BEZIER: "bezier" };
function probeToTimeline(probe) {
  const tweens = [];
  for (const curve of probe.fcurves) {
    const prop = `${curve.path.replace(/_euler$/, "")}${["X", "Y", "Z", "W"][curve.index] || curve.index}`;
    for (let i = 1; i < curve.keys.length; i += 1) {
      const [start, interpolation] = curve.keys[i - 1];
      const [end] = curve.keys[i];
      if (end <= start) continue;
      tweens.push({ targets: [`#${curve.object}`], startSec: start, durationSec: Number((end - start).toFixed(4)), props: [prop], ease: EASE[interpolation] || String(interpolation).toLowerCase() });
    }
  }
  return { schema: "design-pipeline.film-timeline.v1", compositionId: "blender", durationSec: Number((probe.frames / probe.fps).toFixed(4)), tweens: tweens.sort((a, b) => a.startSec - b.startSec) };
}

const ENGINES = { eevee: "BLENDER_EEVEE", cycles: "CYCLES", BLENDER_EEVEE: "BLENDER_EEVEE", CYCLES: "CYCLES" };

function renderTemplate(templateId, params, outDir, options = {}) {
  if (options.engine && !ENGINES[options.engine]) fail(SCOPE, `engine ${options.engine} is not supported; allowed: eevee, cycles`);
  options = { ...options, engine: options.engine ? ENGINES[options.engine] : undefined };
  const template = listTemplates().find((entry) => entry.id === templateId);
  if (!template) fail(SCOPE, `unknown template ${templateId}; allowed: ${listTemplates().map((entry) => entry.id).join(", ")}`);
  const resolved = resolveParams(template, params);
  const blender = options.blenderInfo || findBlender(options.blender);
  if (blender.major < 4 || (blender.major === 4 && blender.minor < 2)) fail(SCOPE, `Blender ${blender.version} is too old; install 4.2 LTS or newer`);
  const frames = path.join(outDir, "frames");
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const paramsFile = path.join(outDir, "blender-params.json");
  fs.writeFileSync(paramsFile, `${JSON.stringify({ template: template.id, engine: options.engine || template.engine || "BLENDER_EEVEE", ...resolved, ...(options.extra || {}) }, null, 2)}\n`);
  const run = spawnSync(blender.path, ["-b", "--factory-startup", "-noaudio", "-P", path.join(TEMPLATE_DIR, template.script), "--", paramsFile, frames], { cwd: outDir, encoding: "utf8", windowsHide: true, timeout: options.timeoutMs || 1800000, maxBuffer: 64 << 20 });
  const log = `${run.stdout || ""}${run.stderr || ""}`;
  fs.writeFileSync(path.join(outDir, "blender.log"), log);
  const error = log.split("\n").find((line) => /Traceback|Error:/.test(line));
  if (run.status !== 0 || error || !fs.existsSync(path.join(frames, "probe.json"))) fail(SCOPE, `Blender render failed${error ? `: ${error.trim()}` : ""}. See ${path.join(outDir, "blender.log")}`, { code: "TOOL_FAILED" });
  const probe = JSON.parse(fs.readFileSync(path.join(frames, "probe.json"), "utf8"));
  return { template, params: resolved, blender, probe, frames };
}

function encodeFrames(framesDir, fps, output, options = {}) {
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(framesDir, "frame_%04d.png")];
  if (options.audio) args.push("-i", options.audio, "-shortest");
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16");
  if (options.audio) args.push("-c:a", "aac", "-b:a", "192k");
  args.push(output);
  const run = spawnSync(options.ffmpeg || "ffmpeg", args, { encoding: "utf8", windowsHide: true, timeout: 600000 });
  if (run.status !== 0) fail(SCOPE, `ffmpeg could not encode the frames: ${String(run.stderr).trim().split("\n").slice(-1)[0]}`, { code: "TOOL_FAILED" });
  return output;
}

module.exports = { TEMPLATE_DIR, encodeFrames, findBlender, listTemplates, probeToTimeline, renderTemplate, resolveParams };
