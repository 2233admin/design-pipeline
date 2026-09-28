"use strict";

// `film edit`: the project workflow for music-led edits.
//   analyze  music + sources/ -> edit/analysis.json (beat grid, bars, energy; shots and motion peaks)
//   auto     analysis -> edit.json (shots placed on the grid, style mad or pv)
//   render   edit.json -> renders/edit.mp4 (ffmpeg)
//   check    edit.json + render -> edit rules, render evidence, audio and composition gates
// Footage licenses come from sources/licenses.json; unrecorded footage counts as non-commercial.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("./contract-utils.cjs");
const { analyzeMusic, analyzeSource, autoEdit, checkEdit, renderEdit, storyboardFromEdit, validateEdit } = require("./edit-core.cjs");
const { evaluateFilmRender } = require("./film-core.cjs");
const { checkAudio } = require("./audio-core.cjs");
const { checkComposition } = require("./composition-core.cjs");
const { decodePng } = require("./png-core.cjs");

const VIDEO = /\.(mp4|mov|webm|mkv|m4v)$/i;
const ANALYSIS = path.join("edit", "analysis.json");

function sourceList(root, sourcesDir) {
  const dir = path.join(root, sourcesDir);
  if (!fs.existsSync(dir)) fail("film edit", `no ${sourcesDir}/ directory. Fix: put the footage clips (mp4, mov, webm) in ${sourcesDir}/`, { code: "INPUT_MISSING" });
  const files = fs.readdirSync(dir).filter((name) => VIDEO.test(name)).sort();
  if (!files.length) fail("film edit", `${sourcesDir}/ has no video files`, { code: "INPUT_MISSING" });
  const licensesFile = path.join(dir, "licenses.json");
  const licenses = fs.existsSync(licensesFile) ? readJson(licensesFile, "source licenses") : {};
  return files.map((name) => {
    const id = name.replace(VIDEO, "").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
    const record = licenses[name] || licenses[id] || {};
    return { id, file: path.posix.join(sourcesDir.split(path.sep).join("/"), name), path: path.join(dir, name), license: record.license || "unrecorded", commercialUse: record.commercialUse === true };
  });
}

function analyzeProject(root, options = {}) {
  if (!options.music) fail("film edit", "--audio <music file> is required", { code: "OPTION_REQUIRED" });
  const musicPath = path.resolve(root, options.music);
  if (!fs.existsSync(musicPath)) fail("film edit", `music not found: ${options.music}`);
  const gridFile = path.join(root, "score-grid.json");
  const music = analyzeMusic(musicPath, { grid: fs.existsSync(gridFile) && !options.detect ? readJson(gridFile, "score grid") : null });
  const sources = sourceList(root, options.sources || "sources").map((source) => ({ ...analyzeSource(source.path), id: source.id, file: source.file, license: source.license, commercialUse: source.commercialUse }));
  const analysis = { schema: "design-pipeline.edit-analysis.v1", music: { ...music, file: path.relative(root, musicPath).split(path.sep).join("/") }, sources };
  fs.mkdirSync(path.join(root, "edit"), { recursive: true });
  fs.writeFileSync(path.join(root, ANALYSIS), `${JSON.stringify(analysis, null, 2)}\n`);
  const unlicensed = sources.filter((source) => !source.commercialUse).map((source) => source.id);
  return {
    status: "analyzed",
    analysis: ANALYSIS,
    bpm: music.bpm,
    gridSource: music.gridSource,
    beats: music.beats.length,
    bars: music.bars.length,
    sources: sources.map(({ id, durationSec, segments, license }) => ({ id, durationSec, shots: segments.length, license })),
    next: [
      `designer-pipeline film edit auto --project-root . --style mad|pv [--duration <sec>]`,
      unlicensed.length ? `Record licenses in sources/licenses.json for: ${unlicensed.join(", ")} ({"<file>": {"license": "...", "commercialUse": true}}); unrecorded footage is treated as non-commercial.` : "All sources record commercial-use licenses.",
    ],
  };
}

function autoProject(root, options = {}) {
  const analysisFile = path.join(root, ANALYSIS);
  if (!fs.existsSync(analysisFile)) fail("film edit", "no edit/analysis.json. Fix: run film edit analyze first", { code: "INPUT_MISSING" });
  const editFile = path.join(root, "edit.json");
  if (fs.existsSync(editFile) && !options.replace) fail("film edit", "edit.json exists. Fix: edit it by hand and run film edit render, or pass --replace to regenerate", { code: "OUTPUT_EXISTS" });
  const analysis = readJson(analysisFile, "edit analysis");
  const edit = autoEdit(analysis.music, analysis.sources, { style: options.style, durationSec: options.durationSec, musicFile: analysis.music.file, width: options.width, height: options.height, id: options.id });
  fs.writeFileSync(editFile, `${JSON.stringify(edit, null, 2)}\n`);
  const check = checkEdit(edit, analysis.music, Object.fromEntries(analysis.sources.map((source) => [source.id, source])));
  return { status: "edited", edit: "edit.json", style: edit.style, shots: edit.clips.length, durationSec: edit.durationSec, check, next: ["designer-pipeline film edit render --project-root .", "Adjust edit.json by hand where the automatic choice is wrong; every cut must stay on a beat."] };
}

function renderProject(root, options = {}) {
  const edit = readJson(path.join(root, "edit.json"), "edit list");
  const output = path.join(root, options.output || path.join("renders", "edit.mp4"));
  (options.render || renderEdit)(edit, root, output);
  return { status: "rendered", output: path.relative(root, output).split(path.sep).join("/"), next: ["designer-pipeline film edit check --project-root ."] };
}

function checkProject(root, options = {}) {
  const edit = readJson(path.join(root, "edit.json"), "edit list");
  validateEdit(edit);
  const analysis = fs.existsSync(path.join(root, ANALYSIS)) ? readJson(path.join(root, ANALYSIS), "edit analysis") : null;
  if (!analysis) fail("film edit", "no edit/analysis.json. Fix: run film edit analyze first", { code: "INPUT_MISSING" });
  const steps = [];
  const rules = checkEdit(edit, analysis.music, Object.fromEntries(analysis.sources.map((source) => [source.id, source])));
  steps.push({ gate: "edit", status: rules.status, findings: rules.findings, metrics: rules.metrics });
  const video = path.join(root, options.output || path.join("renders", "edit.mp4"));
  if (fs.existsSync(video)) {
    const board = storyboardFromEdit(edit, analysis.music);
    // Edits get their own rhythm checks (monotone-rhythm, shot-too-long) tuned to music-driven
    // cutting; the storyboard's cadence and rest rules assume freeform choreography and would
    // fight them, so the derived storyboard skips filmRhythm here.
    const render = evaluateFilmRender(board, video, { outDir: path.join(root, "evidence"), filmRhythm: false });
    // A planned cut the scene detector cannot see joins two near-identical shots: it does not read.
    const hints = require("./edit-core.cjs").HINTS;
    const invisible = render.cuts.missedSec.map((at) => ({ code: "cut-not-visible", severity: "warn", message: `the cut at ${at}s is not visible in the render`, fix: hints["cut-not-visible"] }));
    steps.push({ gate: "render", status: render.status, findings: [...render.findings, ...invisible], cuts: render.cuts });
    const audio = checkAudio(video, { target: options.audioTarget || "web" });
    steps.push({ gate: "audio", status: audio.status, findings: audio.findings, metrics: audio.metrics });
    const frames = (render.contactSheet ? render.contactSheet.frames : []).map((frame) => {
      const check = checkComposition(decodePng(fs.readFileSync(path.join(root, "evidence", frame.file)), frame.file), { profile: "frame" });
      return { shot: frame.beatId, status: check.status, findings: check.findings };
    });
    steps.push({ gate: "composition", status: frames.some((frame) => frame.status === "failed") ? "failed" : "passed", findings: frames.flatMap((frame) => frame.findings.map((finding) => ({ ...finding, shot: frame.shot }))) });
  } else {
    steps.push({ gate: "render", status: "skipped", next: "Run film edit render, then check again." });
  }
  const failed = steps.some((step) => step.status === "failed");
  const skipped = steps.some((step) => step.status === "skipped");
  return {
    schema: "design-pipeline.edit-project-check.v1",
    id: edit.id,
    status: failed ? "failed" : skipped ? "incomplete" : "passed",
    steps,
    fixes: steps.flatMap((step) => (step.findings || []).map((finding) => ({ gate: step.gate, code: finding.code, severity: finding.severity || "error", fix: finding.fix }))),
    creativeAcceptance: "not-assessed",
  };
}

module.exports = { analyzeProject, autoProject, checkProject, renderProject, sourceList };
