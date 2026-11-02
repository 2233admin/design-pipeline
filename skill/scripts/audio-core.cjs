"use strict";

// Audio gate: measures a film's soundtrack (audio file or video with audio) with ffmpeg and
// checks delivery loudness (EBU R128 integrated LUFS), true peak, clipping, unexpected silence,
// abrupt endings, music entry/exit against the storyboard's sound cues, whether hit cues (impact,
// accent, downbeat) carry a sound onset on their frame, and recorded licensing.
// Every finding carries a concrete fix, often the ffmpeg command that repairs it. Musical taste,
// mix balance and whether the score suits the film remain creative review.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { assertEnum, fail } = require("./contract-utils.cjs");
const { installCommand } = require("./install-hints.cjs");
const { cliCommand, shellPath } = require("./workflows/shared.cjs");

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
// Cue sync, after earshot's timeline: offset = sound onset minus the cue (negative = early), on the
// frame within one frame, heard within 100 ms, and the share of the film's time that random cue
// times would also find an onset within 100 ms of ("chance"); matches only mean something above it.
const SYNC_KINDS = ["impact", "accent", "downbeat"];
const SYNC_WINDOW_SEC = 0.1;
const SYNC_RATE = 16000;
const SYNC_WINDOW = 512; // 32 ms: shorter windows read the ripple of a low note as onsets
const SYNC_STEP = 128; // 8 ms
const SYNC_MIN_GAP_SEC = 0.05;
const SYNC_FLOOR = 0.3; // summed log-energy rise of both bands, about 3 dB: below it is ripple, not an attack
const SYNC_CHANCE_MAX = 0.5;
const SYNC_MIN_CUES = 3;

const FIX = {
  "audio-missing": "The file has no audio stream. Add the score to the composition (<audio data-start data-duration>) and re-render, or set sound.mode to silent with a reason.",
  "loudness-off-target": "Normalize the score to the delivery target: `{master}` (two-pass loudnorm to {lufs} LUFS, {tp} dBTP), then point the composition at the mastered file and re-render.",
  "true-peak-over": "Lower the peaks below {tp} dBTP: `{master}`, or add a true-peak limiter before export.",
  "clipping": "The waveform is flat-topped at its peak. Reduce gain before the master bus or re-export the stem at lower level; clipped audio cannot be repaired by normalization afterwards.",
  "unexpected-silence": "Silence appears mid-film without a planned silence cue. Extend or loop the music across the gap, or add a sound cue of kind silence at this time if the pause is intended.",
  "abrupt-end": "Audio is still loud at the last frame. Fade out the last 0.5-1.5 s (`{master}`, or afade=t=out:st={start}:d=1) or end on a resolved hit.",
  "entry-late": "Music starts later than the storyboard's entry cue. Move the audio element's data-start or trim leading silence (atrim/silenceremove) so sound arrives on the cue.",
  "exit-early": "Music ends before the storyboard's exit cue. Extend the track, loop a section, or move the exit cue to where the music actually ends.",
  "impact-unsounded": "No sound onset within 100 ms of this impact cue. Place the hit's attack on the cue frame; if it is there, it is buried: raise it 3-10 dB over the music around it (earshot's kit.gain_db sets that from the bed) or duck the music for 0.3-0.5 s before it. Change the cue's kind only if the moment is meant to be soft.",
  "cue-unsounded": "No sound onset within 100 ms of this cue. Put an audible attack on it (a tick, a pop, the music's downbeat); if one is there, it is buried under the music: raise it 3-10 dB over the bed. Remove the cue if the moment is meant to pass without sound.",
  "cue-off-frame": "The nearest sound onset is {offsetMs} ms from the cue (negative = early), more than one frame. Shift that sound by {shiftMs} ms (its data-start, or the cue time if the picture moved) so the attack lands on the frame. If the cue's own sound is quieter than the music, the onset found may be the music's: raise the effect over the bed instead.",
  "sync-at-chance": "Onsets are so dense that random times land within 100 ms of one {chancePct}% of the time, so the cue matches prove nothing. Check the effects stem on its own: `{verifyStem}`.",
  "license-unrecorded": "Record each sound asset in storyboard sound.assets with id, license and commercialUse, so reuse rights can be checked.",
  "license-noncommercial": "This asset's license forbids commercial use but the film is commercial. Replace it with user-owned or commercially licensed audio, or set sound.usage to the actual non-commercial use.",
};

function hint(code, values = {}) {
  return FIX[code].replace(/\{(\w+)\}/g, (_, key) => (values[key] !== undefined ? String(values[key]) : `{${key}}`));
}

function run(tools, args, binary = false) {
  const result = spawnSync(tools.ffmpeg, args, { encoding: binary ? "buffer" : "utf8", maxBuffer: 1 << 30, windowsHide: true });
  if (result.error) fail(SCOPE, `ffmpeg unavailable: ${result.error.message}. Fix: run \`${installCommand("ffmpeg")}\` and keep ffmpeg on PATH`, { code: "TOOL_MISSING" });
  if (result.status !== 0) fail(SCOPE, `ffmpeg exited ${result.status}: ${String(result.stderr).trim().split("\n").slice(-1)[0]}`, { code: "TOOL_FAILED" });
  return result;
}

function hasAudio(file, tools) {
  const result = spawnSync(tools.ffprobe, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file], { encoding: "utf8", windowsHide: true });
  if (result.error) fail(SCOPE, `ffprobe unavailable: ${result.error.message}. Fix: run \`${installCommand("ffmpeg")}\` (it installs ffprobe too)`, { code: "TOOL_MISSING" });
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

// Onsets for hit timing: the rise of log energy in 32 ms windows every 8 ms, summed over the full
// band and a high band (first difference), so a bright tick on a sustained pad counts as well as a
// low hit; each peak is judged against the 1.5 s around it. Reported at the start of the step that rose.
function hitOnsets(file, tools) {
  const { stdout } = run(tools, ["-hide_banner", "-nostats", "-i", file, "-vn", "-ac", "1", "-ar", String(SYNC_RATE), "-f", "s16le", "-"], true);
  const samples = Math.floor(stdout.length / 2);
  const frames = samples >= SYNC_WINDOW ? Math.floor((samples - SYNC_WINDOW) / SYNC_STEP) + 1 : 0;
  const x = new Float64Array(samples);
  for (let i = 0; i < samples; i += 1) x[i] = stdout.readInt16LE(i * 2) / 32768;
  const level = (v) => Math.log1p(1000 * v);
  const odf = new Float64Array(frames);
  let prevFull = 0;
  let prevHigh = 0;
  for (let f = 0; f < frames; f += 1) {
    let full = 0;
    let high = 0;
    for (let i = f * SYNC_STEP; i < f * SYNC_STEP + SYNC_WINDOW; i += 1) { full += x[i] * x[i]; const d = x[i] - (i > 0 ? x[i - 1] : 0); high += d * d; }
    const lf = level(Math.sqrt(full / SYNC_WINDOW));
    const lh = level(Math.sqrt(high / SYNC_WINDOW));
    odf[f] = Math.max(0, lf - prevFull) + Math.max(0, lh - prevHigh); // before the file: silence
    prevFull = lf;
    prevHigh = lh;
  }
  const sums = [0];
  const squares = [0];
  for (const v of odf) { sums.push(sums.at(-1) + v); squares.push(squares.at(-1) + v * v); }
  const reach = Math.round((1.5 * SYNC_RATE) / SYNC_STEP);
  const minGap = Math.round((SYNC_MIN_GAP_SEC * SYNC_RATE) / SYNC_STEP);
  const at = (f) => (f === 0 ? 0 : (f * SYNC_STEP + SYNC_WINDOW - SYNC_STEP) / SYNC_RATE);
  const picked = [];
  for (let f = 0; f < frames; f += 1) {
    if (!(odf[f] >= (odf[f - 1] ?? 0) && odf[f] >= (odf[f + 1] ?? 0) && odf[f] > SYNC_FLOOR)) continue;
    const from = Math.max(0, f - reach);
    const to = Math.min(frames, f + reach + 1);
    const n = to - from;
    const mean = (sums[to] - sums[from]) / n;
    const sd = Math.sqrt(Math.max(0, (squares[to] - squares[from]) / n - mean * mean));
    if (odf[f] <= mean + 2 * sd) continue;
    const last = picked.at(-1);
    if (last && f - last.f < minGap) { if (odf[f] > last.v) picked[picked.length - 1] = { f, v: odf[f] }; continue; }
    picked.push({ f, v: odf[f] });
  }
  return picked.map((p) => Number(at(p.f).toFixed(3)));
}

// Each hit cue against the nearest measured onset. Returns per-cue rows and the chance baseline.
function cueSync(file, tools, cues, fps, span) {
  const onsets = hitOnsets(file, tools);
  const frameSec = 1 / fps;
  const rows = cues.map((cue) => {
    let nearest = null;
    for (const at of onsets) if (nearest === null || Math.abs(at - cue.atSec) < Math.abs(nearest - cue.atSec)) nearest = at;
    const offsetSec = nearest === null ? null : nearest - cue.atSec;
    const heard = offsetSec !== null && Math.abs(offsetSec) <= SYNC_WINDOW_SEC;
    const onFrame = heard && Math.abs(offsetSec) <= frameSec + 1e-6;
    return { id: cue.id, kind: cue.kind, atSec: cue.atSec, offsetMs: heard ? Math.round(offsetSec * 1000) : null, status: onFrame ? "on-frame" : heard ? "off-frame" : "unsounded" };
  });
  // Chance: the share of the audible span within the window of some onset (union of intervals).
  let covered = 0;
  let reach = span.start;
  for (const at of onsets) {
    const from = Math.max(reach, at - SYNC_WINDOW_SEC, span.start);
    const to = Math.min(at + SYNC_WINDOW_SEC, span.end);
    if (to > from) covered += to - from;
    reach = Math.max(reach, to);
  }
  const length = span.end - span.start;
  const chance = length > 0 ? covered / length : 0;
  const heard = rows.filter((row) => row.status !== "unsounded").length;
  return {
    rows,
    summary: { cues: rows.length, onFrame: rows.filter((row) => row.status === "on-frame").length, heard, hitRate: rows.length ? Number((heard / rows.length).toFixed(3)) : null, chance: Number(chance.toFixed(3)), onsets: onsets.length, fps },
  };
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
  const add = (code, severity, message, values = {}) => {
    if (["loudness-off-target", "true-peak-over", "abrupt-end"].includes(code)) {
      const input = path.resolve(file);
      const root = path.dirname(input);
      const output = path.join(root, `${path.parse(input).name}-mastered.wav`);
      values = { ...values, master: `${cliCommand()} audio master --root ${shellPath(root)} --input ${shellPath(input)} --output ${shellPath(output)} --target ${targetName}${code === "abrupt-end" ? " --fade-out 1" : ""}` };
    }
    findings.push({ code, severity, message, fix: hint(code, values) });
  };

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

  let sync = null;
  if (sound) {
    const entry = (sound.cues || []).find((cue) => cue.kind === "entry");
    const exit = (sound.cues || []).find((cue) => cue.kind === "exit");
    if (entry && firstActive !== null && firstActive > entry.atSec + 0.3) add("entry-late", "error", `audio becomes audible at ${firstActive.toFixed(2)}s, entry cue is ${entry.atSec}s`);
    if (exit && lastActive !== null && lastActive < exit.atSec - 0.5) add("exit-early", "warn", `audio fades out at ${lastActive.toFixed(2)}s, exit cue is ${exit.atSec}s`);
    const hitCues = (sound.cues || []).filter((cue) => SYNC_KINDS.includes(cue.kind));
    if (hitCues.length && firstActive !== null) {
      sync = cueSync(file, tools, hitCues, Number(board.fps) > 0 ? Number(board.fps) : 30, { start: firstActive, end: lastActive });
      for (const row of sync.rows) {
        if (row.status === "unsounded") add(row.kind === "impact" ? "impact-unsounded" : "cue-unsounded", row.kind === "impact" ? "error" : "warn", `${row.kind} cue ${row.id} at ${row.atSec}s has no sound onset within ${SYNC_WINDOW_SEC * 1000} ms`);
        if (row.status === "off-frame") add("cue-off-frame", "warn", `${row.kind} cue ${row.id} at ${row.atSec}s: nearest onset ${row.offsetMs > 0 ? "+" : ""}${row.offsetMs} ms, more than one frame at ${sync.summary.fps} fps`, { offsetMs: row.offsetMs, shiftMs: -row.offsetMs });
      }
      if (sync.rows.length >= SYNC_MIN_CUES && sync.summary.chance >= SYNC_CHANCE_MAX) {
        add("sync-at-chance", "warn", `${sync.summary.heard}/${sync.summary.cues} hit cues hear an onset, but random times would ${Math.round(sync.summary.chance * 100)}% of the time`, { chancePct: Math.round(sync.summary.chance * 100), verifyStem: `${cliCommand()} verify audio --audio <effects-stem.wav> --storyboard <storyboard.json>` });
      }
    }
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
      ...(sync ? { cueSync: { ...sync.summary, rows: sync.rows } } : {}),
    },
    creativeAcceptance: "not-assessed",
  };
}

const MAX_LIMIT_DB = 10;
const CODEC_HEADROOM_DB = 1.5;

// Two-pass EBU R128 normalization to a delivery target with an optional fade-out: the repair the
// loudness, true-peak and abrupt-end findings point to, packaged so an agent does not hand-tune it.
function masterAudio(input, output, options = {}) {
  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  const targetName = options.target || "web";
  assertEnum(targetName, Object.keys(TARGETS), "target", SCOPE);
  const target = TARGETS[targetName];
  if (!fs.existsSync(input)) fail(SCOPE, `input not found: ${input}`);
  if (!hasAudio(input, tools)) fail(SCOPE, `input has no audio stream: ${input}`);
  // The master sits CODEC_HEADROOM_DB under the delivery ceiling: encoding the film's AAC track
  // adds inter-sample peaks (a MAD master at -1.4 dBTP encoded at +0.2 dBFS, and HyperFrames then
  // attenuated renders by 1.7 dB, below the loudness target, or refused to render).
  const ceiling = target.truePeak - (options.codecHeadroomDb ?? CODEC_HEADROOM_DB);
  const base = `I=${target.lufs}:TP=${ceiling}:LRA=11`;
  const measure = (pre) => {
    const { stderr } = run(tools, ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", `${pre ? `${pre},` : ""}loudnorm=${base}:print_format=json`, "-f", "null", "-"]);
    try { return JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1)); } catch { return fail(SCOPE, "could not read loudnorm measurement from ffmpeg output", { code: "TOOL_FAILED" }); }
  };
  const inputMeasured = measure(null);
  // Headroom: loudnorm reaches the target linearly only when the gain it needs keeps the true peak
  // under the ceiling. A peaky mix (kicks, hits) fails that, and loudnorm's dynamic fallback then
  // flattens the arrangement: a MAD's verse, chorus and bridge all came out at the same loudness.
  // A lookahead limiter first shaves the transients (at most MAX_LIMIT_DB), so the gain stays
  // linear and the sections keep their levels.
  // The limiter works on sample peaks, lowers the loudness a little, and loudnorm's resampling
  // adds inter-sample peaks, so each attempt is rendered and its true peak measured with the same
  // meter the audio gate uses; a peak over the ceiling adds limiting and renders again.
  const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value)));
  const fade = Number(options.fadeOutSec || 0);
  let fadeFilter = null;
  if (fade > 0) {
    const probe = spawnSync(tools.ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input], { encoding: "utf8", windowsHide: true });
    const duration = Number(probe.stdout.trim());
    if (!(duration > fade)) fail(SCOPE, `fade-out ${fade}s is not shorter than the ${duration}s input`);
    fadeFilter = `afade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade}`;
  }
  const render = (limitDb) => {
    const limiter = limitDb > 0 ? `alimiter=limit=${Math.max(0.0625, 10 ** ((Number(inputMeasured.input_tp) - limitDb) / 20)).toFixed(5)}:attack=2:release=60:level=false:latency=true` : null;
    const measured = limiter ? measure(limiter) : inputMeasured;
    const m = { i: clamp(measured.input_i, -99, 0), tp: clamp(measured.input_tp, -99, 99), lra: clamp(measured.input_lra, 0, 99), thresh: clamp(measured.input_thresh, -99, 0), offset: clamp(measured.target_offset, -99, 99) };
    const filters = [...(limiter ? [limiter] : []), `loudnorm=${base}:measured_I=${m.i}:measured_TP=${m.tp}:measured_LRA=${m.lra}:measured_thresh=${m.thresh}:offset=${m.offset}:linear=true:print_format=json`, ...(fadeFilter ? [fadeFilter] : [])];
    const second = run(tools, ["-hide_banner", "-nostats", "-y", "-i", input, "-vn", "-af", filters.join(","), "-ar", String(RATE), output]).stderr;
    let normalization = null;
    try { normalization = JSON.parse(second.slice(second.lastIndexOf("{"), second.lastIndexOf("}") + 1)).normalization_type; } catch { normalization = null; }
    return { normalization, peak: loudness(output, tools).truePeakDbtp };
  };
  const headroom = ceiling - 0.3;
  const shortfall = Number(inputMeasured.input_tp) + (target.lufs - Number(inputMeasured.input_i)) - headroom;
  const limiting = options.limit !== false && Number(inputMeasured.input_i) > -70;
  let limiterDb = limiting && shortfall > 0 ? Number(Math.min(shortfall + 0.2, MAX_LIMIT_DB).toFixed(2)) : 0;
  let result = render(limiterDb);
  for (let pass = 0; limiting && pass < 3 && limiterDb < MAX_LIMIT_DB; pass += 1) {
    const over = result.normalization === "dynamic" ? Math.max(shortfall - limiterDb, 0.5) : result.peak - headroom;
    if (!(over > 0)) break;
    limiterDb = Number(Math.min(limiterDb + over + 0.2, MAX_LIMIT_DB).toFixed(2));
    result = render(limiterDb);
  }
  const mode = result.normalization;
  // Dynamic mode means loudnorm could not reach the target linearly (usually the true-peak
  // ceiling) and compressed the mix, flattening accents; the caller should know.
  const warnings = mode === "dynamic" ? [`loudnorm fell back to dynamic normalization: accents were compressed to reach ${target.lufs} LUFS within ${ceiling} dBTP, which flattens the arrangement's loud and quiet sections. Lower the peaks in the source mix (softer kicks and hits, more sustained parts) and master again.`] : [];
  return { status: "mastered", input, output, target: targetName, normalization: mode || "unknown", limiterDb, measuredInput: { integratedLufs: Number(inputMeasured.input_i), truePeakDbtp: Number(inputMeasured.input_tp), loudnessRangeLu: Number(inputMeasured.input_lra) }, fadeOutSec: fade || 0, warnings };
}

module.exports = { SCHEMA, FIX, TARGETS, checkAudio, masterAudio };
