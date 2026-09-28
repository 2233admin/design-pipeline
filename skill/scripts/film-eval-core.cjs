"use strict";

// Cross-model film evaluation. Scores each system's film deliverables with the film gates and
// emits design-pipeline.benchmark-measurements.v2, so the existing `benchmark evaluate` gate
// (fairness, channels, required scenarios) decides the outcome. No parallel scoring system.
//
// Run layout: <runs>/<system>/<scenario-id>/{storyboard.json, timeline.json, out.mp4}
// Storyboard defects score once, in the storyboard component; timeline and render score only
// their own findings. A missing scenario directory is left unmeasured, so the benchmark reports it as blocked.

const fs = require("node:fs");
const path = require("node:path");
const { validateManifest } = require("./benchmark-core.cjs");
const { checkStoryboard, evaluateFilmRender } = require("./film-core.cjs");
const { checkTimeline } = require("./film-timeline-core.cjs");
const { fail, readJson } = require("./contract-utils.cjs");

const WEIGHTS = { storyboard: 0.35, timeline: 0.35, render: 0.3 };
const PENALTY_PER_FINDING = 0.15;

function gateScore(findings) {
  return Math.max(0, 1 - PENALTY_PER_FINDING * findings);
}

function attempt(label, run) {
  try {
    return run();
  } catch (error) {
    return { status: "error", error: `${label}: ${error.message}` };
  }
}

function measureRun(dir, options = {}) {
  const evidence = [];
  const parts = {};
  const storyboardFile = path.join(dir, "storyboard.json");
  const board = fs.existsSync(storyboardFile) ? attempt("storyboard", () => readJson(storyboardFile, "film storyboard")) : null;
  const boardOk = board && board.status !== "error";

  if (!board) { parts.storyboard = 0; evidence.push("storyboard: missing storyboard.json"); }
  else if (!boardOk) { parts.storyboard = 0; evidence.push(board.error); }
  else {
    const result = attempt("storyboard", () => checkStoryboard(board));
    parts.storyboard = result.status === "error" ? 0 : gateScore(result.findings.filter((finding) => finding.severity !== "warn").length);
    evidence.push(result.status === "error" ? result.error : `storyboard: ${result.status}${result.findings.length ? ` (${result.findings.map((f) => f.code).join(", ")})` : ""}`);
  }

  const timelineFile = path.join(dir, "timeline.json");
  if (!boardOk || !fs.existsSync(timelineFile)) { parts.timeline = 0; evidence.push(`timeline: ${boardOk ? "missing timeline.json" : "not checked without a valid storyboard"}`); }
  else {
    const result = attempt("timeline", () => checkTimeline(readJson(timelineFile, "film timeline"), board));
    parts.timeline = result.status === "error" ? 0 : gateScore(result.findings.filter((finding) => finding.severity !== "warn").length);
    evidence.push(result.status === "error" ? result.error : `timeline: ${result.status}${result.findings.length ? ` (${result.findings.map((f) => f.code).join(", ")})` : ""}; carried handoffs ${result.metrics.carriedHandoffs}`);
  }

  const video = path.join(dir, "out.mp4");
  if (!boardOk || !fs.existsSync(video)) { parts.render = 0; evidence.push(`render: ${boardOk ? "missing out.mp4" : "not checked without a valid storyboard"}`); }
  else {
    const result = attempt("render", () => evaluateFilmRender(board, video, { ...options.render, outDir: path.join(dir, "evidence") }));
    parts.render = result.status === "error" ? 0 : gateScore(result.findings.filter((finding) => finding.severity !== "warn").length);
    evidence.push(result.status === "error" ? result.error : `render: ${result.status}${result.findings.length ? ` (${result.findings.map((f) => f.code).join(", ")})` : ""}; cuts on onsets ${result.audio.cutsOnOnset}`);
  }

  const score = Number((WEIGHTS.storyboard * parts.storyboard + WEIGHTS.timeline * parts.timeline + WEIGHTS.render * parts.render).toFixed(3));
  evidence.push(`components: storyboard ${parts.storyboard.toFixed(2)}, timeline ${parts.timeline.toFixed(2)}, render ${parts.render.toFixed(2)}`);
  return { score, evidence };
}

function measureFilmBenchmark(manifest, runsRoot, options = {}) {
  validateManifest(manifest, { allowUnverifiedFairness: true, allowInvalidChannels: true });
  if (manifest.schema !== "design-pipeline.benchmark-manifest.v2") fail("film eval", "film evaluation requires a v2 benchmark manifest");
  if (!fs.existsSync(runsRoot) || !fs.statSync(runsRoot).isDirectory()) fail("film eval", `runs directory does not exist: ${runsRoot}`);
  const measurements = {};
  for (const system of manifest.systems) {
    const systemDir = path.join(runsRoot, system);
    measurements[system] = {};
    for (const scenario of manifest.scenarios) {
      const dir = path.join(systemDir, scenario.id);
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      measurements[system][scenario.id] = measureRun(dir, options);
    }
  }
  return { schema: "design-pipeline.benchmark-measurements.v2", benchmarkId: manifest.id, measurements };
}

module.exports = { WEIGHTS, measureFilmBenchmark, measureRun };
