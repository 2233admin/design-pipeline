"use strict";

// Music-led editing (PV, MAD, beat montage). Unlike generated motion, these films cut existing
// footage to music. The pipeline: analyze the music (beat grid, bars, energy) and the sources
// (shots, motion peaks), place shots on the grid (automatically or by hand in edit.json), render
// with ffmpeg, then check the edit: cuts on the grid, shot-length rhythm against tempo, reuse,
// licensing, plus the existing render and audio gates through a storyboard derived from the edit.

const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, assertKeys, assertString, fail } = require("./contract-utils.cjs");
const { detectCuts, motionProfile, probe, run } = require("./film-core.cjs");

const SCOPE = "film edit";
const EDIT_SCHEMA = "design-pipeline.edit-list.v1";
const ANALYSIS_SCHEMA = "design-pipeline.edit-analysis.v1";
const TOOLS = { ffmpeg: "ffmpeg", ffprobe: "ffprobe" };
const FX = ["flash", "freeze", "zoom-punch"];

// ---------- music ----------

// Onset-strength envelope: half-wave rectified change of log energy in 23 ms hops at 11025 Hz.
function onsetEnvelope(file, tools = TOOLS) {
  const rate = 11025;
  const hop = 256;
  const { stdout } = run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", file, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"], { binary: true });
  const frames = Math.floor(stdout.length / 2 / hop);
  const energy = new Float64Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = 0; i < hop; i += 1) { const s = stdout.readInt16LE((f * hop + i) * 2) / 32768; sum += s * s; }
    energy[f] = Math.log1p(1000 * Math.sqrt(sum / hop));
  }
  const envelope = new Float64Array(frames);
  for (let f = 1; f < frames; f += 1) envelope[f] = Math.max(0, energy[f] - energy[f - 1]);
  return { envelope, energy, hopSec: hop / rate, durationSec: (frames * hop) / rate };
}

// Tempo by autocorrelation of the envelope over 70-180 BPM with a mild preference for ~120 BPM
// (resolves octave ambiguity), then the beat phase that collects the most onset strength.
function trackBeats(env) {
  const { envelope, hopSec, durationSec } = env;
  let best = { bpm: 120, score: -Infinity };
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = 60 / bpm / hopSec;
    let score = 0;
    for (let f = 0; f + lag * 4 < envelope.length; f += 1) {
      const a = envelope[f];
      if (!a) continue;
      for (const k of [1, 2, 4]) {
        const idx = f + lag * k;
        const lo = Math.floor(idx);
        score += a * (envelope[lo] * (1 - (idx - lo)) + (envelope[lo + 1] || 0) * (idx - lo)) / k;
      }
    }
    score *= Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (score > best.score) best = { bpm, score };
  }
  const period = 60 / best.bpm;
  const coarse = (t) => { const i = Math.round(t / hopSec); let m = 0; for (let j = i - 1; j <= i + 1; j += 1) m = Math.max(m, envelope[j] || 0); return m; };
  let phase = 0;
  let phaseScore = -1;
  for (let p = 0; p < period; p += hopSec) {
    let s = 0;
    for (let t = p; t < durationSec; t += period) s += coarse(t);
    if (s > phaseScore) { phaseScore = s; phase = p; }
  }
  // Refine: snap each predicted beat to the strongest onset within +-25% of a period, then fit
  // time = phase + k * period by weighted least squares. A 0.5 BPM search step alone drifts by
  // several frames over a minute of music.
  const peakNear = (t) => {
    const lo = Math.max(0, Math.round((t - 0.25 * period) / hopSec));
    const hi = Math.min(envelope.length - 1, Math.round((t + 0.25 * period) / hopSec));
    let best = { t, w: 0 };
    for (let i = lo; i <= hi; i += 1) if (envelope[i] > best.w) best = { t: i * hopSec, w: envelope[i] };
    return best;
  };
  let fitted = { phase, period };
  for (let pass = 0; pass < 2; pass += 1) {
    let sw = 0; let sk = 0; let st = 0; let skk = 0; let skt = 0;
    for (let k = 0; fitted.phase + k * fitted.period < durationSec; k += 1) {
      const peak = peakNear(fitted.phase + k * fitted.period);
      if (!peak.w) continue;
      sw += peak.w; sk += peak.w * k; st += peak.w * peak.t; skk += peak.w * k * k; skt += peak.w * k * peak.t;
    }
    const denominator = sw * skk - sk * sk;
    if (sw > 0 && Math.abs(denominator) > 1e-9) {
      const slope = (sw * skt - sk * st) / denominator;
      if (Math.abs(slope - fitted.period) < 0.05 * fitted.period) fitted = { period: slope, phase: (st - slope * sk) / sw };
    }
  }
  while (fitted.phase - fitted.period >= -0.02) fitted.phase -= fitted.period;
  if (fitted.phase < -0.02) fitted.phase += fitted.period;
  best.bpm = Number((60 / fitted.period).toFixed(2));
  const beats = [];
  for (let t = Math.max(0, fitted.phase); t < durationSec - 1e-6; t += fitted.period) beats.push(Number(t.toFixed(4)));
  const strength = (t) => peakNear(t).w;
  // Downbeats: the bar phase (of 4) whose beats carry the most onset strength.
  let barOffset = 0;
  let barScore = -1;
  for (let o = 0; o < 4; o += 1) {
    let s = 0;
    for (let i = o; i < beats.length; i += 4) s += strength(beats[i]);
    if (s > barScore) { barScore = s; barOffset = o; }
  }
  return { bpm: best.bpm, beats, downbeats: beats.filter((_, i) => i % 4 === barOffset) };
}

function analyzeMusic(file, options = {}) {
  const tools = { ...TOOLS, ...options.tools };
  const env = onsetEnvelope(file, tools);
  const grid = options.grid ? { bpm: options.grid.bpm, beats: options.grid.beats.filter((t) => t < env.durationSec), downbeats: options.grid.beats.filter((t, i) => i % 4 === 0 && t < env.durationSec), source: "score-grid" } : { ...trackBeats(env), source: "detected" };
  // Energy per bar, normalized 0..1: sections for shot pacing.
  const bars = grid.downbeats.map((start, i) => {
    const end = grid.downbeats[i + 1] ?? env.durationSec;
    let sum = 0;
    let n = 0;
    for (let f = Math.floor(start / env.hopSec); f < Math.floor(end / env.hopSec) && f < env.energy.length; f += 1) { sum += env.energy[f]; n += 1; }
    return { startSec: start, endSec: Number(end.toFixed(4)), energy: n ? sum / n : 0 };
  });
  const max = Math.max(...bars.map((bar) => bar.energy), 1e-9);
  const min = Math.min(...bars.map((bar) => bar.energy));
  for (const bar of bars) bar.energy = Number(((bar.energy - min) / Math.max(1e-9, max - min)).toFixed(3));
  return { file: path.basename(file), durationSec: Number(env.durationSec.toFixed(3)), bpm: grid.bpm, gridSource: grid.source, beats: grid.beats, downbeats: grid.downbeats, bars };
}

// ---------- sources ----------

function analyzeSource(file, options = {}) {
  const tools = { ...TOOLS, ...options.tools };
  const media = probe(file, tools);
  const cuts = detectCuts(file, tools, 0.3);
  const motion = motionProfile(file, tools);
  const bounds = [0, ...cuts.filter((t) => t > 0.2 && t < media.durationSec - 0.2), media.durationSec];
  // Long uncut shots are offered as several candidate windows (about 2.5 s each), so one long
  // take yields distinct moments instead of being reused.
  const spans = [];
  for (let i = 1; i < bounds.length; i += 1) {
    const [start, end] = [bounds[i - 1], bounds[i]];
    const pieces = end - start > 3 ? Math.round((end - start) / 2.5) : 1;
    for (let p = 0; p < pieces; p += 1) spans.push([start + ((end - start) * p) / pieces, start + ((end - start) * (p + 1)) / pieces]);
  }
  const segments = [];
  for (const [start, end] of spans) {
    if (end - start < 0.4) continue;
    const inside = motion.filter((sample) => sample.atSec > start + 0.05 && sample.atSec < end - 0.05);
    const peak = inside.reduce((best, sample) => (sample.share > best.share ? sample : best), { atSec: (start + end) / 2, share: 0 });
    const mean = inside.length ? inside.reduce((sum, sample) => sum + sample.share, 0) / inside.length : 0;
    segments.push({ startSec: Number(start.toFixed(3)), endSec: Number(end.toFixed(3)), peakSec: Number(peak.atSec.toFixed(3)), peakMotion: Number(peak.share.toFixed(4)), meanMotion: Number(mean.toFixed(4)) });
  }
  return { file: path.basename(file), durationSec: Number(media.durationSec.toFixed(3)), fps: Number(media.fps.toFixed(3)), hasAudio: media.hasAudio, segments };
}

// ---------- automatic edit ----------

const STYLES = {
  // MAD: fast, energy-driven; high-energy bars cut every beat, calm bars every two.
  mad: { shotBeats: (energy) => (energy >= 0.66 ? 1 : energy >= 0.33 ? 2 : 4), flashOnDownbeat: true },
  // PV: readable shots that follow phrasing; cut on downbeats, longer shots in calm bars.
  pv: { shotBeats: (energy) => (energy >= 0.66 ? 2 : energy >= 0.33 ? 4 : 8), flashOnDownbeat: false },
};

function autoEdit(music, sources, options = {}) {
  const style = options.style || "mad";
  assertEnum(style, Object.keys(STYLES), "style", SCOPE);
  const rules = STYLES[style];
  const duration = Math.min(options.durationSec || music.durationSec, music.durationSec);
  const beats = music.beats.filter((t) => t < duration - 0.05);
  if (beats.length < 4) fail(SCOPE, "the music has fewer than 4 beats in the edit length; use a longer track or a longer --duration");
  const pool = sources.flatMap((source) => source.segments.map((segment) => ({ source: source.id, ...segment })));
  if (!pool.length) fail(SCOPE, "no usable source shots (each must be at least 0.4 s between cuts); add footage to the sources directory");
  // Strongest motion first; round-robin over sources so one clip does not dominate.
  const bySource = new Map();
  for (const segment of pool.sort((a, b) => b.peakMotion - a.peakMotion)) {
    if (!bySource.has(segment.source)) bySource.set(segment.source, []);
    bySource.get(segment.source).push(segment);
  }
  const order = [];
  for (let round = 0; order.length < pool.length; round += 1) for (const list of bySource.values()) if (list[round]) order.push(list[round]);
  const used = new Map();
  const energyAt = (t) => (music.bars.find((bar) => t >= bar.startSec && t < bar.endSec) || { energy: 0.5 }).energy;
  const downbeats = new Set(music.downbeats.map((t) => t.toFixed(3)));
  const clips = [];
  let cursor = 0;
  let pick = 0;
  // The first shot starts at 0 even if the first beat is later; later shots start on beats.
  let startIndex = 0;
  while (startIndex < beats.length) {
    const atSec = clips.length === 0 ? 0 : beats[startIndex];
    const span = rules.shotBeats(energyAt(beats[startIndex]));
    const endIndex = Math.min(beats.length, startIndex + span);
    const endSec = endIndex >= beats.length ? duration : beats[endIndex];
    const length = endSec - atSec;
    if (length < 0.08) break;
    let chosen = null;
    for (let tries = 0; tries < order.length && !chosen; tries += 1) {
      const candidate = order[(pick + tries) % order.length];
      const room = candidate.endSec - candidate.startSec;
      const speed = room >= length ? 1 : Math.max(0.5, room / length);
      if (room / speed + 1e-6 < length) continue;
      // Put the shot's motion peak just after the cut, so the hit lands on the beat.
      const needed = length * speed;
      let inSec = Math.min(Math.max(candidate.startSec, candidate.peakSec - 0.12 * needed), candidate.endSec - needed);
      const key = `${candidate.source}@${candidate.startSec}`;
      const reuse = used.get(key) || 0;
      if (reuse && candidate.endSec - candidate.startSec > needed * 2) inSec = Math.min(candidate.endSec - needed, inSec + needed * reuse);
      used.set(key, reuse + 1);
      chosen = { source: candidate.source, inSec: Number(inSec.toFixed(3)), outSec: Number((inSec + needed).toFixed(3)), speed: Number(speed.toFixed(3)) };
      pick = (pick + tries + 1) % order.length;
    }
    if (!chosen) fail(SCOPE, `no source shot is long enough for a ${length.toFixed(2)} s cut; add longer footage or use --style pv`);
    const fx = rules.flashOnDownbeat && clips.length > 0 && downbeats.has(atSec.toFixed(3)) && energyAt(atSec) >= 0.66 ? ["flash"] : [];
    clips.push({ ...chosen, atSec: Number(atSec.toFixed(3)), durSec: Number(length.toFixed(3)), ...(fx.length ? { fx } : {}) });
    cursor = endSec;
    startIndex = endIndex;
  }
  return {
    schema: EDIT_SCHEMA,
    id: options.id || `${style}-edit`,
    style,
    durationSec: Number(cursor.toFixed(3)),
    fps: options.fps || 30,
    width: options.width || 1280,
    height: options.height || 720,
    music: { file: options.musicFile || music.file, bpm: music.bpm, gridSource: music.gridSource },
    sources: sources.map(({ id, file, license, commercialUse }) => ({ id, file, license, commercialUse })),
    clips,
  };
}

// ---------- validation and checks ----------

function validateEdit(edit) {
  assertKeys(edit, ["schema", "id", "durationSec", "fps", "width", "height", "music", "sources", "clips"], ["schema", "id", "style", "durationSec", "fps", "width", "height", "music", "sources", "clips", "usage"], "edit", SCOPE);
  if (edit.schema !== EDIT_SCHEMA) fail(SCOPE, `schema must be ${EDIT_SCHEMA}`);
  if (!Array.isArray(edit.sources) || !edit.sources.length) fail(SCOPE, "sources must list at least one footage file");
  const ids = new Set();
  for (const [i, source] of edit.sources.entries()) {
    assertKeys(source, ["id", "file", "license", "commercialUse"], ["id", "file", "license", "commercialUse"], `sources[${i}]`, SCOPE);
    assertString(source.license, `sources[${i}].license`, SCOPE);
    if (typeof source.commercialUse !== "boolean") fail(SCOPE, `sources[${i}].commercialUse must be true or false`);
    ids.add(source.id);
  }
  for (const [i, clip] of edit.clips.entries()) {
    assertKeys(clip, ["source", "inSec", "outSec", "atSec", "durSec"], ["source", "inSec", "outSec", "atSec", "durSec", "speed", "fx", "note"], `clips[${i}]`, SCOPE);
    if (!ids.has(clip.source)) fail(SCOPE, `clips[${i}].source ${clip.source} is not in sources`);
    if (!(clip.outSec > clip.inSec) || !(clip.durSec > 0)) fail(SCOPE, `clips[${i}] needs outSec > inSec and durSec > 0`);
    for (const fx of clip.fx || []) assertEnum(fx, FX, `clips[${i}].fx`, SCOPE);
  }
}

const HINTS = {
  "timeline-gap": "Make each clip start where the previous one ends (atSec = previous atSec + durSec).",
  "timeline-overlap": "Shorten the earlier clip or move the later one so clips do not overlap.",
  "cut-off-grid": "Review the cut against the phrase, action and sound. Snap to the suggested beat if the offset is accidental; retain an intentional pickup, delay or counterpoint and record why in qa.md.",
  "shot-too-short": "Hold the shot at least one beat; shorter flashes read as glitches unless that is the intent.",
  "shot-too-long": "Split the shot or cut away within four bars; long holds stall a music-led edit.",
  "monotone-rhythm": "Vary shot lengths with the music's energy: cut every beat in the chorus, every two or four beats in verses.",
  "clip-reused": "Use a different moment of the footage; repeating the same range reads as filler.",
  "speed-extreme": "Keep speed between 0.5x and 2x unless the ramp is a deliberate effect.",
  "license-noncommercial": "Replace the footage with commercially licensed material, or set edit usage to the real non-commercial use.",
  "source-range": "Keep inSec/outSec inside the source's duration.",
  "cut-not-visible": "The two shots look alike, so the cut does not read. Follow it with a shot of different brightness, colour or scale, or mark the cut with a flash.",
};

function checkEdit(edit, music, sources = {}) {
  validateEdit(edit);
  const findings = [];
  const add = (code, severity, message, clipIndex) => findings.push({ code, severity, message, fix: HINTS[code], ...(clipIndex !== undefined ? { clip: clipIndex } : {}) });
  const frame = 1 / edit.fps;
  const clips = [...edit.clips].sort((a, b) => a.atSec - b.atSec);
  const beatSec = 60 / music.bpm;
  const points = [...music.beats, 0, edit.durationSec];
  const nearest = (t) => points.reduce((best, p) => (Math.abs(p - t) < Math.abs(best - t) ? p : best), points[0]);
  const lengths = [];
  clips.forEach((clip, i) => {
    const prev = clips[i - 1];
    if (prev) {
      const gap = clip.atSec - (prev.atSec + prev.durSec);
      if (gap > frame) add("timeline-gap", "error", `${gap.toFixed(3)} s gap before clip ${i}`, i);
      if (gap < -frame) add("timeline-overlap", "error", `clip ${i} overlaps the previous clip by ${(-gap).toFixed(3)} s`, i);
      const snap = nearest(clip.atSec);
      if (Math.abs(snap - clip.atSec) > frame) add("cut-off-grid", "warn", `cut at ${clip.atSec}s is ${Math.abs(snap - clip.atSec).toFixed(3)} s off the beat grid (nearest ${snap.toFixed(3)}s)`, i);
    }
    const beatsLong = clip.durSec / beatSec;
    lengths.push(Math.round(beatsLong * 2) / 2);
    if (beatsLong < 0.9 && i < clips.length - 1) add("shot-too-short", "warn", `clip ${i} lasts ${beatsLong.toFixed(2)} beats`, i);
    if (beatsLong > 16) add("shot-too-long", "warn", `clip ${i} lasts ${beatsLong.toFixed(1)} beats`, i);
    const speed = clip.speed ?? (clip.outSec - clip.inSec) / clip.durSec;
    if (speed < 0.45 || speed > 2.2) add("speed-extreme", "warn", `clip ${i} plays at ${speed.toFixed(2)}x`, i);
    const info = sources[clip.source];
    if (info && (clip.inSec < -frame || clip.outSec > info.durationSec + frame)) add("source-range", "error", `clip ${i} reads ${clip.inSec}-${clip.outSec}s from a ${info.durationSec}s source`, i);
  });
  const last = clips[clips.length - 1];
  if (last && Math.abs(last.atSec + last.durSec - edit.durationSec) > frame) add("timeline-gap", "error", `clips end at ${(last.atSec + last.durSec).toFixed(3)}s but the edit declares ${edit.durationSec}s`);
  if (clips.length >= 8 && new Set(lengths).size === 1) add("monotone-rhythm", "warn", `all ${clips.length} shots last ${lengths[0]} beats`);
  const ranges = new Map();
  clips.forEach((clip, i) => {
    for (const [j, other] of (ranges.get(clip.source) || []).entries()) {
      const overlap = Math.min(clip.outSec, other.outSec) - Math.max(clip.inSec, other.inSec);
      if (overlap > 0.5 * Math.min(clip.outSec - clip.inSec, other.outSec - other.inSec)) { add("clip-reused", "warn", `clip ${i} repeats ${clip.source} ${clip.inSec}-${clip.outSec}s already used by clip ${other.index}`, i); break; }
      void j;
    }
    ranges.set(clip.source, [...(ranges.get(clip.source) || []), { ...clip, index: i }]);
  });
  const usage = edit.usage || "commercial";
  for (const source of edit.sources) if (usage === "commercial" && source.commercialUse === false) add("license-noncommercial", "error", `${source.id} (${source.license}) does not allow commercial use`);
  const sortedLengths = [...lengths].sort((a, b) => a - b);
  return {
    schema: "design-pipeline.edit-check.v1",
    id: edit.id,
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "passed",
    findings,
    metrics: { shots: clips.length, bpm: music.bpm, medianShotBeats: sortedLengths[Math.floor(sortedLengths.length / 2)] ?? null, distinctShotLengths: new Set(lengths).size },
    creativeAcceptance: "not-assessed",
  };
}

// A storyboard derived from the edit lets the render and audio gates judge the result: every
// clip is a hard-cut footage beat, so planned cuts, frozen shots and audio all get checked.
function storyboardFromEdit(edit, music) {
  const clips = [...edit.clips].sort((a, b) => a.atSec - b.atSec);
  return {
    schema: "design-pipeline.film-storyboard.v1",
    id: edit.id,
    durationSec: edit.durationSec,
    fps: edit.fps,
    grammar: "footage-led",
    benefit: `Music-led ${edit.style || "edit"} cut to ${music.bpm} BPM.`,
    proofAction: "Each shot lands on the beat.",
    sound: { mode: "scored", source: edit.music.file, usage: edit.usage || "commercial", assets: [], cues: [{ id: "music-in", atSec: 0, kind: "entry", note: "track starts" }, ...clips.slice(1).map((clip, i) => ({ id: `cut-${i + 2}`, atSec: clip.atSec, kind: "accent", note: "cut on the beat" }))] },
    beats: clips.map((clip, i) => ({
      id: `shot-${i + 1}`,
      startSec: clip.atSec,
      endSec: Number((clip.atSec + clip.durSec).toFixed(3)),
      role: "action",
      subject: clip.source,
      productAction: `footage ${clip.source} ${clip.inSec}-${clip.outSec}s`,
      transformation: { kind: "footage" },
      handoff: i === 0 ? "open" : "hard-cut",
      motion: ["footage"],
      soundCues: [i === 0 ? "music-in" : `cut-${i + 1}`],
    })),
  };
}

// ---------- render ----------

function renderEdit(edit, root, output, options = {}) {
  validateEdit(edit);
  const tools = { ...TOOLS, ...options.tools };
  const files = Object.fromEntries(edit.sources.map((source) => [source.id, path.resolve(root, source.file)]));
  for (const [id, file] of Object.entries(files)) if (!fs.existsSync(file)) fail(SCOPE, `source ${id} not found at ${file}`);
  const musicFile = path.resolve(root, edit.music.file);
  if (!fs.existsSync(musicFile)) fail(SCOPE, `music not found at ${musicFile}`);
  const clips = [...edit.clips].sort((a, b) => a.atSec - b.atSec);
  const inputs = [];
  const filters = [];
  clips.forEach((clip, i) => {
    inputs.push("-ss", String(clip.inSec), "-t", String((clip.outSec - clip.inSec + 0.2).toFixed(3)), "-i", files[clip.source]);
    const speed = (clip.outSec - clip.inSec) / clip.durSec;
    const chain = [
      `setpts=(PTS-STARTPTS)/${speed.toFixed(6)}`,
      `fps=${edit.fps}`,
      `scale=${edit.width}:${edit.height}:force_original_aspect_ratio=increase`,
      `crop=${edit.width}:${edit.height}`,
      "setsar=1",
    ];
    if ((clip.fx || []).includes("zoom-punch")) chain.push(`scale=iw*1.12:ih*1.12,crop=${edit.width}:${edit.height}`);
    chain.push(`trim=duration=${clip.durSec.toFixed(4)}`, "setpts=PTS-STARTPTS");
    if ((clip.fx || []).includes("freeze")) chain.push(`trim=duration=${(clip.durSec * 0.6).toFixed(4)}`, `tpad=stop_mode=clone:stop_duration=${(clip.durSec * 0.4).toFixed(4)}`);
    if ((clip.fx || []).includes("flash")) chain.push("fade=t=in:st=0:d=0.12:color=white");
    chain.push("format=yuv420p");
    filters.push(`[${i}:v]${chain.join(",")}[v${i}]`);
  });
  const concat = `${clips.map((_, i) => `[v${i}]`).join("")}concat=n=${clips.length}:v=1:a=0[vout]`;
  const audioIndex = clips.length;
  // A -2.5 dBFS sample limiter keeps the AAC true peak under -1 dBTP; at -1.5 dBFS the encoded peak still measured -0.8 dBTP.
  const audio = `[${audioIndex}:a]atrim=duration=${edit.durationSec},afade=t=out:st=${Math.max(0, edit.durationSec - 0.8).toFixed(3)}:d=0.8,alimiter=limit=0.75:level=false[aout]`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const args = ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-i", musicFile, "-filter_complex", [...filters, concat, audio].join(";"), "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", String(edit.durationSec), output];
  run(tools.ffmpeg, args);
  return output;
}

module.exports = { ANALYSIS_SCHEMA, EDIT_SCHEMA, HINTS, analyzeMusic, analyzeSource, autoEdit, checkEdit, onsetEnvelope, renderEdit, storyboardFromEdit, trackBeats, validateEdit };
