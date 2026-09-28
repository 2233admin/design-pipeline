"use strict";

// Product-film gates: turn the prose contract in references/product-film-direction.md into
// deterministic storyboard checks and objective render evidence. These gates reject known
// failure shapes (panel slideshow, surface-only motion, unclosed timelines, unbound sound);
// they never grant creative acceptance, which stays a separate reviewed state.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { assertEnum, assertKeys, assertString, fail } = require("./contract-utils.cjs");
const { withFix } = require("./film-hints.cjs");

const STORYBOARD_SCHEMA = "design-pipeline.film-storyboard.v1";
const RENDER_SCHEMA = "design-pipeline.film-render-evidence.v1";
const SCOPE = "film storyboard";
const GRAMMARS = ["continuous-transformation", "product-demonstration", "match-cut-montage", "footage-led", "kinetic-type", "combination"];
const BEAT_ROLES = ["action", "title-hold", "brand-hold"];
const TRANSFORMATIONS = ["morph", "state-change", "reveal-in-context", "camera-move", "match-cut", "type-to-object", "data-update", "assembly", "footage", "none"];
const HANDOFFS = ["open", "continuation", "match-cut", "morph", "camera-carry", "hard-cut", "dissolve", "reset"];
const CUT_HANDOFFS = new Set(["hard-cut", "match-cut"]);
const DETACHED_HANDOFFS = new Set(["reset", "dissolve"]);
const SURFACE_MOTION = new Set(["fade", "fade-in", "fade-out", "opacity", "scale", "scale-in", "scale-out", "zoom", "ken-burns", "slide-in", "slide-out", "blur-in", "blur-out"]);
const CUE_KINDS = ["entry", "exit", "downbeat", "accent", "riser", "impact", "voiceover", "silence"];
const PLACEHOLDER = /^(tbd|todo|n\/?a|none|-|\.\.\.|placeholder)$/i;
const FRAME_TOLERANCE_SEC = 0.05;
const MAX_HOLD_SHARE = 0.25;

function real(value, label) {
  assertString(value, label, SCOPE);
  if (PLACEHOLDER.test(value.trim())) fail(SCOPE, `${label} must not be a placeholder`);
}
function seconds(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(SCOPE, `${label} must be a non-negative number`);
}
function loadChoreographyIds() {
  const file = path.join(__dirname, "../references/film-choreography/registry.json");
  return new Set(JSON.parse(fs.readFileSync(file, "utf8")).patterns.map((pattern) => pattern.id));
}

function validateShape(board) {
  assertKeys(board, ["schema", "id", "durationSec", "grammar", "benefit", "proofAction", "sound", "beats"], ["schema", "id", "durationSec", "fps", "grammar", "benefit", "proofAction", "reference", "sound", "beats"], "storyboard", SCOPE);
  if (board.schema !== STORYBOARD_SCHEMA) fail(SCOPE, `schema must be ${STORYBOARD_SCHEMA}`);
  real(board.id, "id");
  if (!(board.durationSec > 0)) fail(SCOPE, "durationSec must be positive");
  if (board.fps !== undefined && !(Number.isInteger(board.fps) && board.fps > 0)) fail(SCOPE, "fps must be a positive integer");
  assertEnum(board.grammar, GRAMMARS, "grammar", SCOPE);
  real(board.benefit, "benefit");
  real(board.proofAction, "proofAction");
  if (board.reference !== undefined) real(board.reference, "reference");
  const sound = board.sound;
  assertKeys(sound, ["mode"], ["mode", "reason", "source", "cues", "usage", "assets"], "sound", SCOPE);
  if (sound.usage !== undefined) assertEnum(sound.usage, ["commercial", "personal", "internal"], "sound.usage", SCOPE);
  if (sound.assets !== undefined) {
    if (!Array.isArray(sound.assets)) fail(SCOPE, "sound.assets must be an array");
    for (const [index, asset] of sound.assets.entries()) {
      const label = `sound.assets[${index}]`;
      assertKeys(asset, ["id", "license", "commercialUse"], ["id", "license", "commercialUse", "file", "source"], label, SCOPE);
      real(asset.id, `${label}.id`);
      real(asset.license, `${label}.license`);
      if (typeof asset.commercialUse !== "boolean") fail(SCOPE, `${label}.commercialUse must be true or false`);
    }
  }
  assertEnum(sound.mode, ["scored", "silent", "pending"], "sound.mode", SCOPE);
  if (sound.mode !== "scored") real(sound.reason, "sound.reason");
  if (sound.mode === "scored") real(sound.source, "sound.source");
  const cues = sound.cues ?? [];
  if (!Array.isArray(cues)) fail(SCOPE, "sound.cues must be an array");
  const cueIds = new Set();
  for (const [index, cue] of cues.entries()) {
    const label = `sound.cues[${index}]`;
    assertKeys(cue, ["id", "atSec", "kind", "note"], ["id", "atSec", "kind", "note"], label, SCOPE);
    real(cue.id, `${label}.id`);
    if (cueIds.has(cue.id)) fail(SCOPE, `${label} duplicates ${cue.id}`);
    cueIds.add(cue.id);
    seconds(cue.atSec, `${label}.atSec`);
    assertEnum(cue.kind, CUE_KINDS, `${label}.kind`, SCOPE);
    real(cue.note, `${label}.note`);
  }
  if (!Array.isArray(board.beats) || board.beats.length === 0) fail(SCOPE, "beats must be a non-empty array");
  const beatIds = new Set();
  for (const [index, beat] of board.beats.entries()) {
    const label = `beats[${index}]`;
    assertKeys(beat, ["id", "startSec", "endSec", "role", "subject", "productAction", "transformation", "handoff", "motion"], ["id", "startSec", "endSec", "role", "subject", "productAction", "transformation", "handoff", "motion", "choreography", "soundCues", "note"], label, SCOPE);
    real(beat.id, `${label}.id`);
    if (beatIds.has(beat.id)) fail(SCOPE, `${label} duplicates ${beat.id}`);
    beatIds.add(beat.id);
    seconds(beat.startSec, `${label}.startSec`);
    seconds(beat.endSec, `${label}.endSec`);
    assertEnum(beat.role, BEAT_ROLES, `${label}.role`, SCOPE);
    real(beat.subject, `${label}.subject`);
    assertKeys(beat.transformation, ["kind"], ["kind", "from", "to"], `${label}.transformation`, SCOPE);
    assertEnum(beat.transformation.kind, TRANSFORMATIONS, `${label}.transformation.kind`, SCOPE);
    assertEnum(beat.handoff, HANDOFFS, `${label}.handoff`, SCOPE);
    if (!Array.isArray(beat.motion) || beat.motion.length === 0 || beat.motion.some((entry) => typeof entry !== "string" || !entry.trim())) fail(SCOPE, `${label}.motion must be a non-empty string array`);
    if (beat.soundCues !== undefined) {
      if (!Array.isArray(beat.soundCues)) fail(SCOPE, `${label}.soundCues must be an array`);
      for (const id of beat.soundCues) if (!cueIds.has(id)) fail(SCOPE, `${label}.soundCues references unknown cue ${id}`);
    }
  }
}

function checkStoryboard(board, options = {}) {
  validateShape(board);
  const choreography = options.choreographyIds || loadChoreographyIds();
  const findings = [];
  const add = (code, message, beatId) => findings.push(withFix("storyboard", beatId ? { code, beatId, message } : { code, message }));
  const beats = board.beats;
  const total = board.durationSec;

  // Timeline closure: contiguous beats from 0 to durationSec.
  if (Math.abs(beats[0].startSec) > FRAME_TOLERANCE_SEC) add("timeline-open-start", "first beat must start at 0s", beats[0].id);
  for (const [index, beat] of beats.entries()) {
    if (beat.endSec - beat.startSec <= 0) add("beat-empty", "beat must have positive duration", beat.id);
    const next = beats[index + 1];
    if (next && Math.abs(next.startSec - beat.endSec) > FRAME_TOLERANCE_SEC) add("timeline-gap", `beat ends at ${beat.endSec}s but next starts at ${next.startSec}s`, beat.id);
  }
  const last = beats[beats.length - 1];
  if (Math.abs(last.endSec - total) > FRAME_TOLERANCE_SEC) add("timeline-open-end", `last beat ends at ${last.endSec}s, film declares ${total}s`, last.id);
  if (beats[0].handoff !== "open") add("handoff-first", "first beat handoff must be open", beats[0].id);
  for (const beat of beats.slice(1)) if (beat.handoff === "open") add("handoff-open-midfilm", "only the first beat may use handoff open", beat.id);

  // Every action beat demonstrates the product and changes its subject.
  const actionBeats = beats.filter((beat) => beat.role === "action");
  if (actionBeats.length === 0) add("no-product-action", "film has no action beats");
  const surfaceOnly = (beat) => beat.motion.every((entry) => SURFACE_MOTION.has(entry.trim().toLowerCase()));
  for (const beat of actionBeats) {
    if (typeof beat.productAction !== "string" || !beat.productAction.trim() || PLACEHOLDER.test(beat.productAction.trim())) add("action-missing", "action beat must name the visible product action", beat.id);
    if (beat.transformation.kind === "none") add("transformation-missing", "action beat must change its subject (transformation.kind none)", beat.id);
    else if (beat.transformation.kind !== "footage" && (!beat.transformation.from || !beat.transformation.to)) add("transformation-endpoints", "transformation must name from and to states", beat.id);
    if (surfaceOnly(beat)) add("surface-only-motion", `motion ${JSON.stringify(beat.motion)} only changes opacity/scale/position of a panel`, beat.id);
    if (beat.choreography !== undefined && !choreography.has(beat.choreography)) add("choreography-unknown", `unknown choreography ${beat.choreography}`, beat.id);
  }

  // Holds are allowed for pacing but must not dominate or chain.
  const holds = beats.filter((beat) => beat.role !== "action");
  const holdShare = holds.reduce((sum, beat) => sum + (beat.endSec - beat.startSec), 0) / total;
  if (holdShare > MAX_HOLD_SHARE) add("hold-dominant", `title/brand holds take ${(holdShare * 100).toFixed(0)}% of runtime (max ${MAX_HOLD_SHARE * 100}%)`);
  for (let index = 1; index < beats.length; index += 1) {
    if (beats[index].role !== "action" && beats[index - 1].role !== "action") add("hold-chain", "consecutive holds stall the film", beats[index].id);
  }

  // Slideshow detector: detached handoffs between panels that only fade/scale.
  const transitions = beats.slice(1);
  const detached = transitions.filter((beat) => DETACHED_HANDOFFS.has(beat.handoff));
  if (transitions.length >= 2 && detached.length / transitions.length > 0.5) add("slideshow-handoffs", `${detached.length}/${transitions.length} handoffs reset or dissolve; attention never carries between actions`);
  for (let index = 1; index < beats.length; index += 1) {
    const [prev, beat] = [beats[index - 1], beats[index]];
    if (DETACHED_HANDOFFS.has(beat.handoff) && surfaceOnly(beat) && surfaceOnly(prev)) add("slideshow-pair", "entrance-hold-exit panels: both beats are surface-only and joined by reset/dissolve", beat.id);
  }

  // Sound binds to the composition clock.
  const cues = board.sound.cues ?? [];
  for (const cue of cues) if (cue.atSec > total + FRAME_TOLERANCE_SEC) add("cue-outside-film", `cue ${cue.id} at ${cue.atSec}s is after the film ends`);
  if (board.sound.mode === "scored") {
    if (!cues.some((cue) => cue.kind === "entry")) add("sound-no-entry", "scored film must declare a music entry cue");
    const accented = actionBeats.filter((beat) => (beat.soundCues ?? []).length > 0).length;
    if (actionBeats.length && accented / actionBeats.length < 0.5) add("sound-unbound", `${accented}/${actionBeats.length} action beats bind a sound cue`);
  }

  const cutsPlanned = transitions.filter((beat) => CUT_HANDOFFS.has(beat.handoff)).map((beat) => beat.startSec);
  return {
    schema: STORYBOARD_SCHEMA,
    id: board.id,
    status: findings.length ? "failed" : "passed",
    findings,
    metrics: {
      beats: beats.length,
      actionBeats: actionBeats.length,
      holdShare: Number(holdShare.toFixed(3)),
      detachedHandoffShare: transitions.length ? Number((detached.length / transitions.length).toFixed(3)) : 0,
      surfaceOnlyActionBeats: actionBeats.filter(surfaceOnly).length,
      plannedCutsSec: cutsPlanned,
    },
    creativeAcceptance: "not-assessed",
  };
}

// ---------- render evidence ----------

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, { encoding: options.binary ? "buffer" : "utf8", maxBuffer: 1 << 28, windowsHide: true });
  if (result.error) fail("film render", `${bin} unavailable: ${result.error.message}`, { code: "TOOL_MISSING" });
  if (result.status !== 0) fail("film render", `${bin} exited ${result.status}: ${String(result.stderr).trim().split("\n").slice(-1)[0]}`, { code: "TOOL_FAILED" });
  return result;
}

function probe(video, tools) {
  const out = run(tools.ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate", "-of", "json", video]).stdout;
  const info = JSON.parse(out);
  const streams = info.streams || [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  if (!videoStream) fail("film render", "file has no video stream");
  const [num, den] = String(videoStream.r_frame_rate || "0/1").split("/").map(Number);
  return { durationSec: Number(info.format?.duration || 0), fps: den ? num / den : 0, hasAudio: streams.some((stream) => stream.codec_type === "audio") };
}

function detectCuts(video, tools, threshold) {
  const { stderr } = run(tools.ffmpeg, ["-hide_banner", "-nostats", "-i", video, "-an", "-vf", `select='gt(scene,${threshold})',showinfo`, "-f", "null", "-"]);
  return [...String(stderr).matchAll(/pts_time:([0-9.]+)/g)].map((match) => Number(Number(match[1]).toFixed(3)));
}

// Energy-flux onsets on an 8 kHz mono envelope; enough to test cut/accent alignment.
function detectOnsets(video, tools) {
  const rate = 8000;
  const { stdout } = run(tools.ffmpeg, ["-hide_banner", "-nostats", "-i", video, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"], { binary: true });
  const hop = 256;
  const frames = Math.floor(stdout.length / 2 / hop);
  const energy = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let i = 0; i < hop; i += 1) { const sample = stdout.readInt16LE((frame * hop + i) * 2) / 32768; sum += sample * sample; }
    energy[frame] = Math.sqrt(sum / hop);
  }
  const flux = Array.from(energy, (value, index) => Math.max(0, value - (energy[index - 1] ?? 0)));
  const mean = flux.reduce((a, b) => a + b, 0) / (flux.length || 1);
  const sd = Math.sqrt(flux.reduce((a, b) => a + (b - mean) ** 2, 0) / (flux.length || 1));
  const threshold = mean + 2 * sd;
  const onsets = [];
  const minGap = Math.round(0.08 * rate / hop);
  let lastIndex = -Infinity;
  for (let index = 1; index < flux.length - 1; index += 1) {
    if (flux[index] > threshold && flux[index] >= flux[index - 1] && flux[index] >= flux[index + 1] && index - lastIndex >= minGap) {
      onsets.push(Number(((index * hop) / rate).toFixed(3)));
      lastIndex = index;
    }
  }
  return onsets;
}

function nearest(list, value) {
  let best = Infinity;
  for (const item of list) best = Math.min(best, Math.abs(item - value));
  return best;
}

function contactSheet(video, beats, outDir, tools) {
  fs.mkdirSync(outDir, { recursive: true });
  const frames = [];
  for (const [index, beat] of beats.entries()) {
    const atSec = Number(((beat.startSec + beat.endSec) / 2).toFixed(3));
    const file = path.join(outDir, `beat-${String(index + 1).padStart(3, "0")}.png`);
    run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(atSec), "-i", video, "-frames:v", "1", "-vf", "scale=480:-2", file]);
    frames.push({ beatId: beat.id, atSec, file: path.basename(file) });
  }
  const columns = Math.min(4, frames.length);
  const rows = Math.ceil(frames.length / columns);
  const sheet = path.join(outDir, "contact-sheet.png");
  run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-framerate", "1", "-i", path.join(outDir, "beat-%03d.png"), "-vf", `tile=${columns}x${rows}:padding=8:margin=8`, "-frames:v", "1", sheet]);
  return { frames, sheet: path.basename(sheet) };
}

function evaluateFilmRender(board, video, options = {}) {
  const storyboard = checkStoryboard(board, options);
  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  const cutTolerance = options.cutToleranceSec ?? 0.2;
  const syncTolerance = options.syncToleranceSec ?? 0.1;
  if (!fs.existsSync(video) || fs.statSync(video).size === 0) fail("film render", "video file is missing or empty");
  const media = probe(video, tools);
  const findings = [];
  const add = (code, message) => findings.push(withFix("render", { code, message }));

  const durationDelta = Number((media.durationSec - board.durationSec).toFixed(3));
  if (Math.abs(durationDelta) > 0.5) add("duration-mismatch", `render is ${media.durationSec}s, storyboard declares ${board.durationSec}s`);

  const cuts = detectCuts(video, tools, options.sceneThreshold ?? 0.3);
  const planned = storyboard.metrics.plannedCutsSec;
  const missed = planned.filter((at) => nearest(cuts, at) > cutTolerance);
  const unplanned = cuts.filter((at) => nearest(board.beats.map((beat) => beat.startSec), at) > cutTolerance);
  if (planned.length && missed.length / planned.length > 0.5) add("planned-cuts-missing", `${missed.length}/${planned.length} planned cuts not found in render`);

  let audio = { present: media.hasAudio, onsets: 0, cutsOnOnset: null };
  if (board.sound.mode === "scored" && !media.hasAudio) add("audio-missing", "storyboard is scored but render has no audio stream; audiovisual acceptance is incomplete");
  if (media.hasAudio) {
    const onsets = detectOnsets(video, tools);
    const aligned = cuts.filter((at) => nearest(onsets, at) <= syncTolerance).length;
    audio = { present: true, onsets: onsets.length, cutsOnOnset: cuts.length ? Number((aligned / cuts.length).toFixed(3)) : null };
    if (board.sound.mode === "scored" && cuts.length >= 3 && aligned / cuts.length < 0.3) add("cuts-off-beat", `${aligned}/${cuts.length} cuts land within ${syncTolerance}s of an audio onset`);
  }

  const sheet = options.outDir ? contactSheet(video, board.beats, options.outDir, tools) : null;
  return {
    schema: RENDER_SCHEMA,
    id: board.id,
    status: storyboard.status === "passed" && findings.length === 0 ? "passed" : "failed",
    storyboard: { status: storyboard.status, findings: storyboard.findings },
    findings,
    media: { durationSec: media.durationSec, durationDeltaSec: durationDelta, fps: Number(media.fps.toFixed(3)) },
    cuts: { detectedSec: cuts, plannedSec: planned, missedSec: missed, unplannedSec: unplanned },
    audio,
    contactSheet: sheet,
    creativeAcceptance: "not-assessed",
    limits: "Objective signals only: scene-change cuts, energy-flux onsets and midpoint frames. Creative review of comprehension, continuity, rhythm and identity remains a separate qa.md record.",
  };
}

module.exports = { STORYBOARD_SCHEMA, RENDER_SCHEMA, checkStoryboard, evaluateFilmRender, detectOnsets };
