"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeVideo } = require("../../scripts/reference-video-core.cjs");
const { analyzeMusic } = require("../../scripts/edit-core.cjs");
const { probe, run } = require("../../scripts/film-core.cjs");
const { resolveInside, sha256 } = require("../../scripts/contract-utils.cjs");

// Cut-grid method adapted from MIT-licensed work by alchaincyf; see LICENSE in this directory.
// Largest plausible grid, not a claimed musical tempo.
function fitCutGrid(times, { minStepSec = 0.05, maxStepSec = 2, toleranceSec = 0.025, stepSec = 0.001, inlierShare = 0.8 } = {}) {
  if (!Array.isArray(times) || times.length > 256 || times.some((time, i) => !Number.isFinite(time) || time < 0 || (i && time <= times[i - 1]))) throw new Error("cut times must be up to 256 strictly ordered, finite seconds");
  for (const [name, value] of Object.entries({ minStepSec, maxStepSec, toleranceSec, stepSec, inlierShare })) if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive and finite`);
  if (maxStepSec < minStepSec || inlierShare > 1 || (maxStepSec - minStepSec) / stepSec > 20000) throw new Error("grid search exceeds bounds");
  if (times.length < 4) return null;
  // ponytail: bounded grid search; use a robust regression method for more than 256 cut candidates.
  for (let n = Math.floor((maxStepSec - minStepSec) / stepSec); n >= 0; n--) {
    const step = minStepSec + n * stepSec;
    for (const origin of times.slice(0, 3)) {
      const units = times.map(time => Math.round((time - origin) / step));
      const residual = times.map((time, i) => time - origin - units[i] * step);
      const selected = residual.filter(value => Math.abs(value) <= toleranceSec);
      if (selected.length / times.length < inlierShare) continue;
      const inliers = times.flatMap((time, i) => Math.abs(residual[i]) <= toleranceSec ? [{ time, unit: units[i] }] : []);
      const meanUnit = inliers.reduce((sum, row) => sum + row.unit, 0) / inliers.length;
      const meanTime = inliers.reduce((sum, row) => sum + row.time, 0) / inliers.length;
      const variance = inliers.reduce((sum, row) => sum + (row.unit - meanUnit) ** 2, 0);
      if (!variance) continue;
      const period = inliers.reduce((sum, row) => sum + (row.unit - meanUnit) * (row.time - meanTime), 0) / variance;
      if (period < minStepSec || period > maxStepSec) continue;
      const startSec = meanTime - period * meanUnit;
      const residualsSec = times.map((time, i) => time - startSec - units[i] * period);
      const outlierIndices = residualsSec.flatMap((value, i) => Math.abs(value) > toleranceSec ? [i] : []);
      if (1 - outlierIndices.length / times.length < inlierShare) continue;
      return { startSec, stepSec: period, units, residualsSec, outlierIndices, bpmIfQuarter: 60 / period, bpmIfEighth: 30 / period, interpretation: "visual cut-grid candidate; listen and compare audio onsets before choosing a metrical interpretation" };
    }
  }
  return null;
}

function analyzeReference(root, options) {
  root = path.resolve(root);
  const file = resolveInside(root, options.path, "reference video", { mustExist: true });
  const tools = { ffmpeg: "ffmpeg", ffprobe: "ffprobe", ...(options.tools || {}) };
  const media = probe(file, tools);
  const result = analyzeVideo(root, options);
  const directory = resolveInside(root, options.output, "reference output", { mustExist: true });
  const { startSec, endSec } = result.report.sampling;
  let audio = null;
  if (media.hasAudio) {
    const wav = path.join(directory, "reference-audio.wav");
    run(tools.ffmpeg, ["-v", "error", "-n", "-i", file, "-ss", String(startSec), "-t", String(endSec - startSec), "-vn", "-ac", "1", "-ar", "22050", wav]);
    const music = analyzeMusic(wav, { tools });
    const spectrogram = path.join(directory, "spectrum.png");
    run(tools.ffmpeg, ["-v", "error", "-n", "-i", wav, "-lavfi", "showspectrumpic=s=1200x360:legend=1", "-frames:v", "1", "-threads", "1", spectrogram]);
    audio = { ...music, sourceStartSec: startSec, beats: music.beats.map(time => time + startSec), downbeats: music.downbeats.map(time => time + startSec), bars: music.bars.map(bar => ({ ...bar, startSec: bar.startSec + startSec, endSec: bar.endSec + startSec })), waveform: { path: "reference-audio.wav", sha256: sha256(fs.readFileSync(wav)) }, spectrum: { path: "spectrum.png", sha256: sha256(fs.readFileSync(spectrogram)) }, limits: "Detected tempo is a 70–180 BPM autocorrelation candidate; silence, syncopation and half/double-time ambiguity require listening." };
  }
  const cuts = result.report.candidateCutsSec.filter(time => time >= startSec && time <= endSec);
  const visualGrid = cuts.length <= 256 ? fitCutGrid(cuts, { toleranceSec: 1.5 / result.report.nominalFps }) : null;
  const study = { reference: result.descriptor, sourceSha256: result.report.source.sha256, interval: { startSec, endSec }, visualGrid, audio, limits: ["Cut candidates are not verified shot boundaries. Key frames and transfer mechanisms require observation.", "Use the existing ordered window viewers and motion maps; narrow uncertain intervals and resample at the source cadence.", "Audio and visual grids are separate candidates, not proof of instruments, musical metre or creative quality."] };
  if (sha256(fs.readFileSync(file)) !== result.report.source.sha256) throw new Error("source changed during audio analysis; discard this incomplete output and rerun");
  fs.writeFileSync(path.join(directory, "study.json"), `${JSON.stringify(study, null, 2)}\n`, { flag: "wx" });
  return { ...result, studyPath: path.relative(root, path.join(directory, "study.json")).replaceAll("\\", "/"), audioAvailable: Boolean(audio) };
}

module.exports = { fitCutGrid, analyzeReference };
