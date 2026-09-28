"use strict";

// Audio gate: measures a film's soundtrack (audio file or video with audio) with ffmpeg and
// checks delivery loudness (EBU R128 integrated LUFS), true peak, clipping, unexpected silence,
// abrupt endings, music entry/exit against the storyboard's sound cues, and recorded licensing.
// Every finding carries a concrete fix, often the ffmpeg command that repairs it. Musical taste,
// mix balance and whether the score suits the film remain creative review.

const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { assertEnum, fail } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.audio-check.v1";
const SCOPE = "audio";
const TARGETS = {
  web: { lufs: -14, tolerance: 1.5, truePeak: -1 },
  podcast: { lufs: -16, tolerance: 1.5, truePeak: -1 },
  broadcast: { lufs: -23, tolerance: 1, truePeak: -1 },
};
const RATE = 48000;
const WINDOW = 0.05;
const ACTIVE_DB = -45;
const SILENCE_DB = -50;
const SILENCE_MIN_SEC = 0.75;

const FIX = {
  "audio-missing": "The file has no audio stream. Add the score to the composition (<audio data-start data-duration>) and re-render, or set sound.mode to silent with a reason.",
  "loudness-off-target": "Normalize the score to the delivery target: designer-pipeline audio master --input <score> --output <score-mastered.wav> --target {target} (two-pass loudnorm to {lufs} LUFS, {tp} dBTP), then point the composition at the mastered file and re-render.",
  "true-peak-over": "Lower the peaks below {tp} dBTP: designer-pipeline audio master --input <score> --output <mastered.wav> --target {target}, or add a true-peak limiter before export.",
  "clipping": "The waveform is flat-topped at its peak. Reduce gain before the master bus or re-export the stem at lower level; clipped audio cannot be repaired by normalization afterwards.",
  "unexpected-silence": "Silence appears mid-film without a planned silence cue. Extend or loop the music across the gap, or add a sound cue of kind silence at this time if the pause is intended.",
  "abrupt-end": "Audio is still loud at the last frame. Fade out the last 0.5-1.5 s (designer-pipeline audio master ... --fade-out 1, or afade=t=out:st={start}:d=1) or end on a resolved hit.",
  "entry-late": "Music starts later than the storyboard's entry cue. Move the audio element's data-start or trim leading silence (atrim/silenceremove) so sound arrives on the cue.",
  "exit-early": "Music ends before the storyboard's exit cue. Extend the track, loop a section, or move the exit cue to where the music actually ends.",
  "license-unrecorded": "Record each sound asset in storyboard sound.assets with id, license and commercialUse, so reuse rights can be checked.",
  "license-noncommercial": "This asset's license forbids commercial use but the film is commercial. Replace it with user-owned or commercially licensed audio, or set sound.usage to the actual non-commercial use.",
};

function hint(code, values = {}) {
  return FIX[code].replace(/\{(\w+)\}/g, (_, key) => (values[key] !== undefined ? String(values[key]) : `{${key}}`));
}

function run(tools, args, binary = false) {
  const result = spawnSync(tools.ffmpeg, args, { encoding: binary ? "buffer" : "utf8", maxBuffer: 1 << 30, windowsHide: true });
  if (result.error) fail(SCOPE, `ffmpeg unavailable: ${result.error.message}. Fix: install ffmpeg and put it on PATH`, { code: "TOOL_MISSING" });
  if (result.status !== 0) fail(SCOPE, `ffmpeg exited ${result.status}: ${String(result.stderr).trim().split("\n").slice(-1)[0]}`, { code: "TOOL_FAILED" });
  return result;
}

function hasAudio(file, tools) {
  const result = spawnSync(tools.ffprobe, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file], { encoding: "utf8", windowsHide: true });
  if (result.error) fail(SCOPE, `ffprobe unavailable: ${result.error.message}`, { code: "TOOL_MISSING" });
  return result.status === 0 && result.stdout.trim().length > 0;
}

function loudness(file, tools) {
  const { stderr } = run(tools, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const number = (pattern) => { const m = summary.match(pattern); return m ? (m[1] === "-inf" ? -Infinity : Number(m[1])) : null; };
  return { integratedLufs: number(/I:\s+(-?[\d.]+|-inf) LUFS/), rangeLu: number(/LRA:\s+(-?[\d.]+|-inf) LU/), truePeakDbtp: number(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

// 50 ms RMS envelope (dBFS, max over channels) and clipped-sample count from 48 kHz float PCM.
function envelope(file, tools) {
  const { stdout } = run(tools, ["-hide_banner", "-nostats", "-i", file, "-vn", "-ac", "2", "-ar", String(RATE), "-f", "f32le", "-"], true);
  const frames = Math.floor(stdout.length / 8);
  const hop = Math.round(RATE * WINDOW);
  const windows = Math.ceil(frames / hop);
  const db = new Float64Array(windows);
  // Clipping = flat tops: runs of 6+ samples exactly at a peak of at least -0.18 dBFS. Encoders
  // saturate below 1.0, so a full-scale test misses it; a clean crest (even 20 Hz) repeats its peak value about 4x at most.
  let peak = 0;
  for (let i = 0; i < frames * 2; i += 1) peak = Math.max(peak, Math.abs(stdout.readFloatLE(i * 4)));
  const ceiling = peak >= 0.98 ? peak - 1e-6 : Infinity;
  let clipped = 0;
  const runs = [0, 0];
  for (let w = 0; w < windows; w += 1) {
    let left = 0;
    let right = 0;
    let n = 0;
    for (let f = w * hop; f < Math.min(frames, (w + 1) * hop); f += 1) {
      const l = stdout.readFloatLE(f * 8);
      const r = stdout.readFloatLE(f * 8 + 4);
      [l, r].forEach((sample, channel) => {
        if (Math.abs(sample) >= ceiling) { runs[channel] += 1; if (runs[channel] === 6) clipped += 6; else if (runs[channel] > 6) clipped += 1; }
        else runs[channel] = 0;
      });
      left += l * l; right += r * r; n += 1;
    }
    const rms = Math.sqrt(Math.max(left, right) / Math.max(1, n));
    db[w] = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  }
  return { db, durationSec: frames / RATE, clipped };
}

function silences(db, floorDb, minSec) {
  const spans = [];
  let start = null;
  for (let w = 0; w <= db.length; w += 1) {
    const quiet = w < db.length && db[w] < floorDb;
    if (quiet && start === null) start = w;
    if (!quiet && start !== null) {
      if ((w - start) * WINDOW >= minSec) spans.push({ startSec: Number((start * WINDOW).toFixed(2)), endSec: Number((w * WINDOW).toFixed(2)) });
      start = null;
    }
  }
  return spans;
}

function checkAudio(file, options = {}) {
  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  const targetName = options.target || "web";
  assertEnum(targetName, Object.keys(TARGETS), "target", SCOPE);
  const target = TARGETS[targetName];
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) fail(SCOPE, `audio file is missing or empty: ${file}`);
  const board = options.storyboard || null;
  const sound = board ? board.sound : null;
  const findings = [];
  const add = (code, severity, message, values) => findings.push({ code, severity, message, fix: hint(code, values) });

  if (!hasAudio(file, tools)) {
    if (!sound || sound.mode === "scored") add("audio-missing", "error", "no audio stream in the file");
    return { schema: SCHEMA, target: targetName, status: findings.length ? "failed" : "passed", findings, metrics: { audio: false }, creativeAcceptance: "not-assessed" };
  }

  const level = loudness(file, tools);
  const env = envelope(file, tools);
  const activeIndexes = [...env.db.keys()].filter((w) => env.db[w] >= ACTIVE_DB);
  const firstActive = activeIndexes.length ? activeIndexes[0] * WINDOW : null;
  const lastActive = activeIndexes.length ? (activeIndexes[activeIndexes.length - 1] + 1) * WINDOW : null;
  const tail = env.db.slice(Math.max(0, env.db.length - 2));
  const tailDb = Math.max(...tail);

  if (level.integratedLufs !== null && Number.isFinite(level.integratedLufs) && Math.abs(level.integratedLufs - target.lufs) > target.tolerance) {
    add("loudness-off-target", "error", `integrated loudness ${level.integratedLufs} LUFS, target ${target.lufs} ±${target.tolerance} (${targetName})`, { lufs: target.lufs, tp: target.truePeak, target: targetName });
  }
  if (level.truePeakDbtp !== null && level.truePeakDbtp > target.truePeak) add("true-peak-over", "error", `true peak ${level.truePeakDbtp} dBTP exceeds ${target.truePeak} dBTP`, { tp: target.truePeak, target: targetName });
  if (env.clipped > 3) add("clipping", "error", `${env.clipped} samples in flat-topped runs at the peak`);

  const plannedSilence = (sound?.cues || []).filter((cue) => cue.kind === "silence").map((cue) => cue.atSec);
  const inner = silences(env.db, SILENCE_DB, SILENCE_MIN_SEC).filter((span) => firstActive !== null && span.startSec > firstActive && span.endSec < lastActive);
  for (const span of inner) {
    if (!plannedSilence.some((at) => at >= span.startSec - 0.25 && at <= span.endSec + 0.25)) add("unexpected-silence", "warn", `silence from ${span.startSec}s to ${span.endSec}s with no planned silence cue`);
  }
  if (tailDb > -30) add("abrupt-end", "warn", `last 100 ms still at ${tailDb.toFixed(1)} dBFS`, { start: Math.max(0, env.durationSec - 1).toFixed(2) });

  if (sound) {
    const entry = (sound.cues || []).find((cue) => cue.kind === "entry");
    const exit = (sound.cues || []).find((cue) => cue.kind === "exit");
    if (entry && firstActive !== null && firstActive > entry.atSec + 0.3) add("entry-late", "error", `audio becomes audible at ${firstActive.toFixed(2)}s, entry cue is ${entry.atSec}s`);
    if (exit && lastActive !== null && lastActive < exit.atSec - 0.5) add("exit-early", "warn", `audio fades out at ${lastActive.toFixed(2)}s, exit cue is ${exit.atSec}s`);
    if (sound.mode === "scored") {
      const assets = sound.assets || [];
      if (!assets.length) add("license-unrecorded", "warn", "sound.assets records no license for the score");
      const usage = sound.usage || "commercial";
      for (const asset of assets) if (usage === "commercial" && asset.commercialUse === false) add("license-noncommercial", "error", `${asset.id} (${asset.license}) does not allow commercial use`);
    }
  }

  return {
    schema: SCHEMA,
    target: targetName,
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "passed",
    findings,
    metrics: {
      audio: true,
      durationSec: Number(env.durationSec.toFixed(3)),
      integratedLufs: level.integratedLufs,
      loudnessRangeLu: level.rangeLu,
      truePeakDbtp: level.truePeakDbtp,
      clippedSamples: env.clipped,
      firstAudibleSec: firstActive === null ? null : Number(firstActive.toFixed(2)),
      lastAudibleSec: lastActive === null ? null : Number(lastActive.toFixed(2)),
      tailDbfs: Number.isFinite(tailDb) ? Number(tailDb.toFixed(1)) : null,
    },
    creativeAcceptance: "not-assessed",
  };
}

// Two-pass EBU R128 normalization to a delivery target with an optional fade-out: the repair the
// loudness, true-peak and abrupt-end findings point to, packaged so an agent does not hand-tune it.
function masterAudio(input, output, options = {}) {
  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  const targetName = options.target || "web";
  assertEnum(targetName, Object.keys(TARGETS), "target", SCOPE);
  const target = TARGETS[targetName];
  if (!fs.existsSync(input)) fail(SCOPE, `input not found: ${input}`);
  if (!hasAudio(input, tools)) fail(SCOPE, `input has no audio stream: ${input}`);
  const base = `I=${target.lufs}:TP=${target.truePeak}:LRA=11`;
  const { stderr } = run(tools, ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", `loudnorm=${base}:print_format=json`, "-f", "null", "-"]);
  const json = stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1);
  let measured;
  try { measured = JSON.parse(json); } catch { fail(SCOPE, "could not read loudnorm measurement from ffmpeg output", { code: "TOOL_FAILED" }); }
  // loudnorm rejects measurements outside its option ranges (a clipped mix can measure above 0 LUFS).
  const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value)));
  const m = { i: clamp(measured.input_i, -99, 0), tp: clamp(measured.input_tp, -99, 99), lra: clamp(measured.input_lra, 0, 99), thresh: clamp(measured.input_thresh, -99, 0), offset: clamp(measured.target_offset, -99, 99) };
  const filters = [`loudnorm=${base}:measured_I=${m.i}:measured_TP=${m.tp}:measured_LRA=${m.lra}:measured_thresh=${m.thresh}:offset=${m.offset}:linear=true:print_format=json`];
  const fade = Number(options.fadeOutSec || 0);
  if (fade > 0) {
    const probe = spawnSync(tools.ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input], { encoding: "utf8", windowsHide: true });
    const duration = Number(probe.stdout.trim());
    if (!(duration > fade)) fail(SCOPE, `fade-out ${fade}s is not shorter than the ${duration}s input`);
    filters.push(`afade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade}`);
  }
  const second = run(tools, ["-hide_banner", "-nostats", "-y", "-i", input, "-vn", "-af", filters.join(","), "-ar", String(RATE), output]).stderr;
  let mode = null;
  try { mode = JSON.parse(second.slice(second.lastIndexOf("{"), second.lastIndexOf("}") + 1)).normalization_type; } catch { mode = null; }
  // Dynamic mode means loudnorm could not reach the target linearly (usually the true-peak
  // ceiling) and compressed the mix, flattening accents; the caller should know.
  const warnings = mode === "dynamic" ? [`loudnorm fell back to dynamic normalization: accents were compressed to reach ${target.lufs} LUFS within ${target.truePeak} dBTP. For punchier hits, lower the peaks in the source mix (limiter on the accents) and master again.`] : [];
  return { status: "mastered", input, output, target: targetName, normalization: mode || "unknown", measuredInput: { integratedLufs: Number(measured.input_i), truePeakDbtp: Number(measured.input_tp), loudnessRangeLu: Number(measured.input_lra) }, fadeOutSec: fade || 0, warnings };
}

module.exports = { SCHEMA, FIX, TARGETS, checkAudio, masterAudio };
