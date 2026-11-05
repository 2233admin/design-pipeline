"use strict";

// `film voiceover`: narration first, picture second. Measure where the spoken phrases of a
// narration file start and end with ffmpeg silencedetect (deterministic, no speech model), write
// them as `voiceover` cues the storyboard's beats bind to, and record the narration's hash so the
// storyboard gate reopens when the take changes. Pauses inside a phrase are reported as candidate
// word boundaries; without a recognizer they are where the speaker paused, not every word.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");
const { checkStoryboard, run } = require("./film-core.cjs");

const SCOPE = "film voiceover";
const CUE_PREFIX = "vo-";
// Shortest pause silencedetect reports: a word gap in clear speech measured 0.05-0.07 s (flite).
const WORD_GAP_SEC = 0.05;
// Default phrase boundary without a script: sentence and clause pauses in read narration.
const DEFAULT_MIN_PAUSE_SEC = 0.25;
// Speech shorter than this between two pauses is a click or breath, not a word.
const MIN_SPEECH_SEC = 0.06;
// Silence is judged against the file's own peak, so a quiet take and a hot take split alike.
const PEAK_RELATIVE_DB = 35;
const NOISE_FLOOR_RANGE_DB = [-70, -25];
// A take whose loudest sample stays under this is silence or room tone, not narration.
const SILENT_PEAK_DB = -60;
// With a script, a chosen boundary this close in length to the longest rejected pause is ambiguous.
const AMBIGUOUS_RATIO = 1.5;
// A line break shorter than this (or than --min-pause, if smaller) is a word gap: the speaker ran the
// lines together. flite word gaps measured 0.05-0.07 s; its sentence pauses 0.14-0.19 s.
const MIN_LINE_BREAK_SEC = 0.15;
// Dry-take checks. The floor is the 5th percentile of 50 ms RMS levels (the quietest moments, i.e. the
// pauses). Noise peaks ride about 10 dB over a noise floor's RMS, so a floor less than 10 dB under the
// pause threshold makes pauses flicker over it: a pink bed 30 dB under the voice had its floor 0.7 dB
// over the threshold and merged two phrases; 36 dB under, 4.8 dB below it, split correctly.
const FLOOR_PERCENTILE = 0.05;
const FLOOR_WINDOW_SEC = 0.05;
const FLOOR_MARGIN_DB = 10;
// Read narration pauses within a few seconds; a longer take with no phrase break is a mix or a bed.
const DRY_CHECK_MIN_SEC = 4;
const DRY_FIX = "Fix: pass the dry narration stem: the voice alone, before music, ambience and sound effects are mixed in. Phrase times are read from the quiet between phrases, and a music bed or room noise fills that quiet, so phrases merge or vanish without any error. Export the voice track from the mix, or record it again in a quiet room";

const round = (value) => Number(value.toFixed(3));

function measureSilences(file, tools) {
  const peakOut = run(tools.ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { scope: SCOPE }).stderr;
  const peakMatch = /max_volume:\s*(-?[0-9.]+|-inf) dB/.exec(String(peakOut));
  if (!peakMatch || peakMatch[1] === "-inf" || Number(peakMatch[1]) < SILENT_PEAK_DB) fail(SCOPE, `${path.basename(file)} has no audible signal (peak under ${SILENT_PEAK_DB} dBFS). Fix: pass the narration take itself (wav or mp3 with the spoken lines)`, { code: "NARRATION_SILENT" });
  const peakDb = Number(peakMatch[1]);
  const noiseDb = Math.min(NOISE_FLOOR_RANGE_DB[1], Math.max(NOISE_FLOOR_RANGE_DB[0], peakDb - PEAK_RELATIVE_DB));
  const durOut = run(tools.ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { scope: SCOPE }).stdout;
  const durationSec = Number(String(durOut).trim());
  if (!(durationSec > 0)) fail(SCOPE, `${path.basename(file)} reports no duration. Fix: re-export the narration as wav`, { code: "NARRATION_UNREADABLE" });
  const out = String(run(tools.ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `silencedetect=n=${noiseDb.toFixed(1)}dB:d=${WORD_GAP_SEC}`, "-f", "null", "-"], { scope: SCOPE }).stderr);
  const silences = [];
  let open = null;
  for (const match of out.matchAll(/silence_(start|end):\s*(-?[0-9.]+)/g)) {
    const at = Math.max(0, Number(match[2]));
    if (match[1] === "start") open = at;
    else if (open !== null) { silences.push([open, Math.min(at, durationSec)]); open = null; }
  }
  if (open !== null) silences.push([open, durationSec]);
  return { durationSec, peakDb, noiseDb, floorDb: noiseFloor(file, tools), silences };
}

// 5th percentile of 50 ms RMS levels in dBFS on an 8 kHz mono decode: the level of the take's pauses.
function noiseFloor(file, tools) {
  const rate = 8000;
  const { stdout } = run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", file, "-vn", "-ac", "1", "-ar", String(rate), "-f", "s16le", "-"], { binary: true, scope: SCOPE });
  const size = Math.round(FLOOR_WINDOW_SEC * rate);
  const levels = [];
  for (let start = 0; start + size <= stdout.length / 2; start += size) {
    let sum = 0;
    for (let i = 0; i < size; i += 1) { const sample = stdout.readInt16LE((start + i) * 2) / 32768; sum += sample * sample; }
    levels.push(Math.max(-120, 10 * Math.log10(sum / size || 1e-12)));
  }
  if (!levels.length) return -120;
  levels.sort((a, b) => a - b);
  return Number(levels[Math.floor(levels.length * FLOOR_PERCENTILE)].toFixed(1));
}

// Speech segments are the complement of the silences; clicks shorter than MIN_SPEECH_SEC fold into
// the silence around them.
function speechSegments(durationSec, silences) {
  const segments = [];
  let cursor = 0;
  for (const [start, end] of silences) {
    if (start > cursor) segments.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < durationSec) segments.push([cursor, durationSec]);
  return segments.filter(([start, end]) => end - start >= MIN_SPEECH_SEC);
}

// Phrases from segments: either every pause of at least minPauseSec splits, or (with a script of N
// lines) the N-1 longest pauses split, ties going to the earlier pause.
function groupPhrases(segments, { minPauseSec, lines }) {
  const gaps = segments.slice(1).map((segment, index) => ({ index, startSec: segments[index][1], endSec: segment[0], lengthSec: segment[0] - segments[index][1] }));
  let split;
  let ambiguity = null;
  if (lines) {
    if (gaps.length < lines.length - 1) {
      fail(SCOPE, `the script has ${lines.length} lines but the narration has only ${gaps.length + 1} stretch(es) of speech between pauses. Fix: record a short pause (about 0.3 s) between the script's lines, or join script lines the narrator says without pausing`, { code: "PHRASES_UNMATCHED" });
    }
    const ranked = [...gaps].sort((a, b) => b.lengthSec - a.lengthSec || a.startSec - b.startSec);
    const chosen = ranked.slice(0, lines.length - 1);
    const shortest = Math.min(MIN_LINE_BREAK_SEC, minPauseSec);
    const runOn = [...chosen].sort((a, b) => a.startSec - b.startSec).findIndex((gap) => gap.lengthSec < shortest);
    if (runOn >= 0) {
      const gap = [...chosen].sort((a, b) => a.startSec - b.startSec)[runOn];
      fail(SCOPE, `the break between script lines ${runOn + 1} and ${runOn + 2} would be a ${round(gap.lengthSec)}s pause at ${round(gap.startSec)}s, shorter than ${shortest}s: that is a gap between words, so the speaker did not pause between those lines. Fix: record a short pause (about 0.3 s) between those lines, or join them into one script line`, { code: "PHRASES_UNMATCHED" });
    }
    split = new Set(chosen.map((gap) => gap.index));
    const weakest = chosen.length ? Math.min(...chosen.map((gap) => gap.lengthSec)) : null;
    const strongestRejected = ranked[lines.length - 1]?.lengthSec ?? null;
    if (weakest !== null && strongestRejected !== null && weakest < AMBIGUOUS_RATIO * strongestRejected) {
      ambiguity = { weakestBoundarySec: round(weakest), longestInnerPauseSec: round(strongestRejected) };
    }
  } else {
    split = new Set(gaps.filter((gap) => gap.lengthSec >= minPauseSec).map((gap) => gap.index));
  }
  const phrases = [];
  let current = [segments[0]];
  for (const gap of gaps) {
    if (split.has(gap.index)) { phrases.push(current); current = []; }
    current.push(segments[gap.index + 1]);
  }
  phrases.push(current);
  return { phrases, ambiguity, pauses: gaps };
}

function readScript(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) fail(SCOPE, `${path.basename(file)} has no lines. Fix: write one spoken phrase per line, in the order spoken`, { code: "SCRIPT_EMPTY" });
  return lines;
}

// Pure alignment: measured silences in, phrase list out (exported for tests and reuse).
function alignNarration(measure, { startSec = 0, minPauseSec = DEFAULT_MIN_PAUSE_SEC, lines = null } = {}) {
  if (!measure.silences.length) fail(SCOPE, `the take has no pause at all (nothing quieter than ${measure.noiseDb ?? "the pause threshold"} dBFS for ${WORD_GAP_SEC}s). ${DRY_FIX}`, { code: "NARRATION_NOT_DRY" });
  if (measure.floorDb !== undefined && measure.durationSec > DRY_CHECK_MIN_SEC && measure.floorDb > measure.noiseDb - FLOOR_MARGIN_DB) {
    fail(SCOPE, `the take's quietest moments sit at ${measure.floorDb} dBFS, only ${round(measure.peakDb - measure.floorDb)} dB under its peak and less than ${FLOOR_MARGIN_DB} dB under the ${measure.noiseDb.toFixed(1)} dBFS pause threshold, so pauses cannot be told from what fills them. ${DRY_FIX}`, { code: "NARRATION_NOT_DRY" });
  }
  const segments = speechSegments(measure.durationSec, measure.silences);
  if (!segments.length) fail(SCOPE, "no speech found above the noise floor. Fix: pass the narration take itself, not a silent or music-only file", { code: "NARRATION_SILENT" });
  const { phrases, ambiguity } = groupPhrases(segments, { minPauseSec, lines });
  if (!lines && phrases.length === 1 && measure.durationSec > DRY_CHECK_MIN_SEC) {
    fail(SCOPE, `the ${round(measure.durationSec)}s take has no pause of ${minPauseSec}s or more, so it measures as one phrase. ${DRY_FIX}. If it really is one unbroken line, pass --script with that single line`, { code: "NARRATION_NOT_DRY" });
  }
  const result = phrases.map((parts, index) => ({
    id: `${CUE_PREFIX}${String(index + 1).padStart(2, "0")}`,
    atSec: round(startSec + parts[0][0]),
    endSec: round(startSec + parts.at(-1)[1]),
    // Pauses inside the phrase: where the speaker paused between words; candidate word boundaries.
    wordBoundariesSec: parts.slice(1).map((part, k) => round(startSec + (parts[k][1] + part[0]) / 2)),
    ...(lines ? { text: lines[index] } : {}),
  }));
  return { phrases: result, ambiguity };
}

function voiceoverFilm(projectDir, options = {}) {
  const root = path.resolve(projectDir);
  const storyboardFile = path.join(root, "storyboard.json");
  if (!fs.existsSync(storyboardFile)) fail(SCOPE, `no storyboard.json in ${root}. Fix: run film scaffold or write the storyboard first; the cues are written into it`, { code: "INPUT_MISSING" });
  if (!options.audio) fail(SCOPE, "--audio <narration file> is required", { code: "OPTION_REQUIRED" });
  let audio;
  try { audio = resolveInside(root, options.audio, "--audio", { scope: SCOPE }); }
  catch (error) { fail(SCOPE, `${error.message}. Fix: copy the narration take into the project (for example assets/narration.wav) and pass that path; its hash is recorded relative to the project`, { code: "PATH_ESCAPE" }); }
  if (!fs.existsSync(audio) || !fs.statSync(audio).isFile()) fail(SCOPE, `${options.audio} does not exist. Fix: put the narration take inside the project (for example assets/narration.wav) and pass that path`, { code: "INPUT_MISSING" });
  const startSec = options.startSec ?? 0;
  if (!Number.isFinite(startSec) || startSec < 0) fail(SCOPE, "--start must be a non-negative number of seconds (where the narration starts in the film)", { code: "OPTION_INVALID" });
  const minPauseSec = options.minPauseSec ?? DEFAULT_MIN_PAUSE_SEC;
  if (!Number.isFinite(minPauseSec) || minPauseSec < WORD_GAP_SEC) fail(SCOPE, `--min-pause must be a number of seconds of at least ${WORD_GAP_SEC}`, { code: "OPTION_INVALID" });
  const lines = options.script ? readScript(options.script) : null;
  const board = readJson(storyboardFile, "film storyboard");
  checkStoryboard(board, { projectRoot: root });

  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  const measure = measureSilences(audio, tools);
  const { phrases, ambiguity } = alignNarration(measure, { startSec, minPauseSec, lines });
  const relative = path.relative(root, audio).split(path.sep).join("/");
  const cues = phrases.map((phrase, index) => ({
    id: phrase.id,
    atSec: phrase.atSec,
    endSec: phrase.endSec,
    kind: "voiceover",
    note: phrase.text ? phrase.text : `narration phrase ${index + 1} of ${phrases.length}`,
  }));
  const narration = { file: relative, sha256: sha256(fs.readFileSync(audio)), startSec, ...(lines ? { phrases: lines.length } : { minPauseSec }) };

  // The new cues replace the earlier measured ones (vo-*); other cues and beat bindings stay.
  const next = { ...board, sound: { ...board.sound, cues: [...(board.sound.cues || []).filter((cue) => !(cue.kind === "voiceover" && cue.id.startsWith(CUE_PREFIX))), ...cues], narration } };
  const findings = [];
  if (phrases.at(-1).endSec > board.durationSec + 0.05) findings.push({ code: "voiceover-past-end", severity: "error", message: `narration ends at ${phrases.at(-1).endSec}s, after the film's ${board.durationSec}s`, fix: "Cut narration lines or extend durationSec and the last beat; a voice that runs past the end is clipped." });
  if (ambiguity) findings.push({ code: "voiceover-boundary-ambiguous", severity: "warn", message: `the shortest pause chosen as a line break (${ambiguity.weakestBoundarySec}s) is barely longer than the longest pause kept inside a line (${ambiguity.longestInnerPauseSec}s)`, fix: "Listen at the reported cue times: if a line break landed mid-sentence, record a slightly longer pause between script lines or join the lines the narrator runs together." });
  let binding = null;
  try {
    const check = checkStoryboard(next, { projectRoot: root, choreographyIds: options.choreographyIds });
    binding = check.findings.filter((finding) => finding.code.startsWith("voiceover-"));
  } catch (error) {
    // Re-measuring can drop a cue a beat still binds; the shape error names it.
    findings.push({ code: "voiceover-binding-broken", severity: "error", message: error.message, fix: "Rebind the beat's soundCues to one of the cue ids listed in phrases, then run film voiceover again." });
  }
  if (binding) findings.push(...binding);
  if (options.write && !findings.some((finding) => finding.code === "voiceover-binding-broken")) fs.writeFileSync(storyboardFile, `${JSON.stringify(next, null, 2)}\n`);
  return {
    status: findings.some((finding) => finding.severity !== "warn") ? "failed" : "passed",
    written: Boolean(options.write) && !findings.some((finding) => finding.code === "voiceover-binding-broken"),
    narration: { ...narration, durationSec: round(measure.durationSec), peakDb: measure.peakDb, pauseThresholdDb: Number(measure.noiseDb.toFixed(1)), floorDb: measure.floorDb },
    phrases,
    cues,
    findings,
    next: options.write
      ? "Bind each beat that shows what a phrase says to that phrase: add its cue id to the beat's soundCues and start the beat on the phrase, then run verify film-storyboard."
      : "Rerun with --write to record these cues and the narration hash in storyboard.json.",
    creativeAcceptance: "not-assessed",
    limits: "Phrase times are measured from pauses (silencedetect against the take's own peak); word boundaries are the pauses inside a phrase, not every word. No speech recognition is involved. The take must be the dry narration stem (voice only, before music and effects): a bed or noise fills the pauses, and a take whose quiet is within 10 dB of the pause threshold, or that has no pause, is refused as NARRATION_NOT_DRY.",
  };
}

module.exports = { DEFAULT_MIN_PAUSE_SEC, alignNarration, measureSilences, speechSegments, voiceoverFilm };
