"use strict";

// Cut sheet (e-conte) for film storyboards: the optional `cuts` list, its checks, the reference
// parity report and the printable sheet. One continuous shot per cut, inside one beat. Vocabulary
// follows the Japanese TV-animation cut sheet. Checks extend the storyboard gate; parity compares
// cut times, energy and declared sound with a `reference analyze-video --shots` report and is
// reported apart from structure. Nothing here grants visual or creative acceptance.

const fs = require("node:fs");
const path = require("node:path");
const { assertKeys, assertString, fail } = require("./contract-utils.cjs");

const SCOPE = "film storyboard";
const CUT_SIZES = ["LONG", "FULL", "KNEE", "WAIST", "BUST", "UP", "BIGUP", "INSERT", "GRAPHIC"];
const CUT_CAMERAS = ["FIX", "PAN", "TILT", "TU", "TB", "FOLLOW", "ZOOM-IN", "ZOOM-OUT", "ROLL", "SHAKE", "RACK"];
const CUT_TRANSITIONS = ["CT", "OL", "FI", "FO", "WI", "WO", "WIPE", "GLITCH", "FLASH"];
const CUT_ENERGY = ["still", "low", "mid", "high"];
const PLACEHOLDER = /^(tbd|todo|n\/?a|none|-|\.\.\.|placeholder)$/i;
const FRAME_TOLERANCE_SEC = 0.05;
const PARITY_START_FRAMES = 2;
const PARITY_SOUND_SEC = 0.1;
const CUT_KEYS = ["no", "startSec", "endSec", "size", "camera", "picture", "action", "dialogue", "text", "sound", "transition", "energy", "note", "ref", "thumb"];

const text = (value) => typeof value === "string" && value.trim() !== "" && !PLACEHOLDER.test(value.trim());
const energyOf = (meanShare) => (meanShare < 0.03 ? "still" : meanShare < 0.15 ? "low" : meanShare < 0.4 ? "mid" : "high");

// Shape only: types and uniqueness. Vocabulary and description are findings so a seeded sheet
// (empty picture) fails the gate with a repair instead of a contract error.
function validateCuts(cuts, board) {
  if (!Array.isArray(cuts) || cuts.length === 0) fail(SCOPE, "cuts must be a non-empty array");
  const numbers = new Set();
  for (const [index, cut] of cuts.entries()) {
    const label = `cuts[${index}]`;
    assertKeys(cut, ["no", "startSec", "endSec", "picture", "transition"], CUT_KEYS, label, SCOPE);
    assertString(cut.no, `${label}.no`, SCOPE);
    if (numbers.has(cut.no)) fail(SCOPE, `${label} duplicates cut number ${cut.no}`);
    numbers.add(cut.no);
    for (const key of ["startSec", "endSec"]) {
      if (typeof cut[key] !== "number" || !Number.isFinite(cut[key]) || cut[key] < 0) fail(SCOPE, `${label}.${key} must be a non-negative number`);
    }
    if (typeof cut.picture !== "string") fail(SCOPE, `${label}.picture must be a string (empty until described)`);
    if (typeof cut.transition !== "string") fail(SCOPE, `${label}.transition must be a string`);
    if (cut.size !== undefined && typeof cut.size !== "string") fail(SCOPE, `${label}.size must be a string`);
    if (cut.camera !== undefined && (!Array.isArray(cut.camera) || cut.camera.some((entry) => typeof entry !== "string"))) fail(SCOPE, `${label}.camera must be a string array`);
    for (const key of ["action", "dialogue", "text", "note", "ref", "thumb", "energy"]) {
      if (cut[key] !== undefined && typeof cut[key] !== "string") fail(SCOPE, `${label}.${key} must be a string`);
    }
    if (cut.sound !== undefined) {
      if (!Array.isArray(cut.sound)) fail(SCOPE, `${label}.sound must be an array of { atSec, note }`);
      for (const [soundIndex, entry] of cut.sound.entries()) {
        assertKeys(entry, ["atSec", "note"], ["atSec", "note"], `${label}.sound[${soundIndex}]`, SCOPE);
        if (typeof entry.atSec !== "number" || !Number.isFinite(entry.atSec) || entry.atSec < 0) fail(SCOPE, `${label}.sound[${soundIndex}].atSec must be a non-negative number`);
        if (typeof entry.note !== "string") fail(SCOPE, `${label}.sound[${soundIndex}].note must be a string`);
      }
    }
  }
  if (board.referenceCuts !== undefined) assertString(board.referenceCuts, "referenceCuts", SCOPE);
  if (board.parityStrict !== undefined && typeof board.parityStrict !== "boolean") fail(SCOPE, "parityStrict must be true or false");
}

// add(code, message, subject, severity) pushes one finding; the caller decides fix text and severity.
function checkCuts(board, add) {
  const cuts = board.cuts;
  const beats = board.beats;
  const list = (values) => values.join(", ");
  if (Math.abs(cuts[0].startSec) > FRAME_TOLERANCE_SEC) add("cut-open-start", "first cut must start at 0s", cuts[0].no);
  const last = cuts[cuts.length - 1];
  if (Math.abs(last.endSec - board.durationSec) > FRAME_TOLERANCE_SEC) add("cut-open-end", `last cut ends at ${last.endSec}s, film declares ${board.durationSec}s`, last.no);
  for (const [index, cut] of cuts.entries()) {
    if (cut.endSec - cut.startSec <= 0) add("cut-empty", `cut ${cut.no} must have positive duration`, cut.no);
    const next = cuts[index + 1];
    if (next) {
      if (next.startSec - cut.endSec > FRAME_TOLERANCE_SEC) add("cut-gap", `cut ${cut.no} ends at ${cut.endSec}s but cut ${next.no} starts at ${next.startSec}s`, next.no);
      else if (cut.endSec - next.startSec > FRAME_TOLERANCE_SEC) add("cut-overlap", `cut ${cut.no} ends at ${cut.endSec}s but cut ${next.no} starts at ${next.startSec}s`, next.no);
    }
    const home = beats.find((beat) => cut.startSec >= beat.startSec - FRAME_TOLERANCE_SEC && cut.startSec < beat.endSec - FRAME_TOLERANCE_SEC);
    if (home && cut.endSec > home.endSec + FRAME_TOLERANCE_SEC) {
      const away = beats.find((beat) => beat !== home && cut.endSec > beat.startSec + FRAME_TOLERANCE_SEC && cut.endSec <= beat.endSec + FRAME_TOLERANCE_SEC);
      add("cut-beat-span", `cut ${cut.no} (${cut.startSec}s-${cut.endSec}s) starts in beat ${home.id} and ends in beat ${away ? away.id : "the next"}`, cut.no);
    }
    const bad = [];
    if (cut.size !== undefined && !CUT_SIZES.includes(cut.size)) bad.push(["size", cut.size, CUT_SIZES]);
    for (const move of cut.camera || []) if (!CUT_CAMERAS.includes(move)) bad.push(["camera", move, CUT_CAMERAS]);
    if (!CUT_TRANSITIONS.includes(cut.transition)) bad.push(["transition", cut.transition, CUT_TRANSITIONS]);
    if (cut.energy !== undefined && !CUT_ENERGY.includes(cut.energy)) bad.push(["energy", cut.energy, CUT_ENERGY]);
    for (const [field, value, allowed] of bad) add("cut-vocabulary", `cut ${cut.no} ${field} "${value}" is not in the cut-sheet vocabulary; allowed: ${list(allowed)}`, cut.no);
    const missing = [];
    if (!text(cut.picture)) missing.push("picture");
    if (cut.size === undefined) missing.push("size");
    if (!Array.isArray(cut.camera) || cut.camera.length === 0) missing.push("camera");
    if (missing.length) add("cut-undescribed", `cut ${cut.no} has no ${list(missing)}`, cut.no);
  }
}

function loadReference(board, projectRoot) {
  const file = path.resolve(projectRoot, board.referenceCuts);
  const rel = path.relative(path.resolve(projectRoot), file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) fail(SCOPE, `referenceCuts ${board.referenceCuts} must stay inside the project`);
  if (!fs.existsSync(file)) return { error: `referenceCuts ${board.referenceCuts} does not exist in the project` };
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const shots = (report.segments || []).filter((segment) => segment.reason === "detected-shot");
  if (!shots.length) return { error: `referenceCuts ${board.referenceCuts} has no detected-shot segments; run reference analyze-video --shots` };
  return { shots };
}

// Parity findings are warnings unless the board sets parityStrict. Returns the summary stored in
// the storyboard result under `parity`.
function checkParity(board, add, projectRoot) {
  const severity = board.parityStrict === true ? undefined : "warn";
  if (!projectRoot) return { status: "skipped", reason: "no project root" };
  const loaded = loadReference(board, projectRoot);
  if (loaded.error) {
    add("parity-reference-unreadable", loaded.error, undefined, undefined);
    return { status: "unreadable", reason: loaded.error };
  }
  const fps = board.fps || 30;
  const byId = new Map(loaded.shots.map((shot) => [shot.id, shot]));
  const covered = new Set();
  const counts = { drift: 0, energy: 0, sound: 0, missing: 0, unreferenced: 0, unknownRef: 0 };
  for (const cut of board.cuts) {
    if (cut.ref === undefined) {
      counts.unreferenced += 1;
      add("parity-cut-unreferenced", `cut ${cut.no} names no reference shot (ref)`, cut.no, severity);
      continue;
    }
    const shot = byId.get(cut.ref);
    if (!shot) {
      counts.unknownRef += 1;
      add("parity-ref-unknown", `cut ${cut.no} ref ${cut.ref} is not a detected shot of ${board.referenceCuts}`, cut.no, severity);
      continue;
    }
    covered.add(shot.id);
    if (Math.abs(cut.startSec - shot.startSec) > PARITY_START_FRAMES / fps + 1e-9) {
      counts.drift += 1;
      add("parity-cut-drift", `cut ${cut.no} starts at ${cut.startSec}s, reference ${shot.id} at ${Number(shot.startSec.toFixed(3))}s`, cut.no, severity);
    }
    if (cut.energy !== undefined && shot.motion) {
      const want = energyOf(shot.motion.meanShare);
      if (Math.abs(CUT_ENERGY.indexOf(cut.energy) - CUT_ENERGY.indexOf(want)) > 1) {
        counts.energy += 1;
        add("parity-energy-mismatch", `cut ${cut.no} energy ${cut.energy}, reference ${shot.id} is ${want}`, cut.no, severity);
      }
    }
    const declared = (cut.sound || []).map((entry) => entry.atSec);
    const unmatched = (shot.soundEvents || []).filter((event) => !declared.some((at) => Math.abs(at - event.atSec) <= PARITY_SOUND_SEC));
    if (unmatched.length) {
      counts.sound += 1;
      add("parity-sound-missing", `cut ${cut.no} declares no sound within ${PARITY_SOUND_SEC}s of reference ${shot.id} onsets at ${unmatched.map((event) => Number(event.atSec.toFixed(3))).join(", ")}s`, cut.no, severity);
    }
  }
  const missing = loaded.shots.filter((shot) => !covered.has(shot.id)).map((shot) => shot.id);
  counts.missing = missing.length;
  if (missing.length) add("parity-shot-missing", `${missing.length} reference shot(s) have no cut: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? ", ..." : ""}`, undefined, severity);
  return { status: "compared", referenceShots: loaded.shots.length, cuts: board.cuts.length, strict: board.parityStrict === true, counts, creativeAcceptance: "not-assessed" };
}

// Seconds plus frames for a duration: 3.5 s at 24 fps is 3+12.
function timeLabel(durationSec, fps) {
  const frames = Math.round(durationSec * fps);
  return `${Math.floor(frames / fps)}+${frames % fps}`;
}

const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (value) => escapeHtml(value).replace(/\n/g, "<br>");

function renderCutSheet(board) {
  const fps = board.fps || 30;
  const thumbs = board.cuts.some((cut) => cut.thumb);
  const rows = board.cuts.map((cut) => {
    const picture = [cut.size, ...(cut.camera || [])].filter(Boolean).join(" / ");
    const sound = (cut.sound || []).map((entry) => `${entry.atSec.toFixed(2)}s ${entry.note}`).join("\n");
    const speech = [cut.dialogue, cut.text].filter(Boolean).join("\n");
    return `<tr><td class="no">${cell(cut.no)}<br><small>${cell(cut.transition)}</small></td>${thumbs ? `<td class="thumb">${cut.thumb ? `<img src="${escapeHtml(cut.thumb)}" alt="${escapeHtml(cut.no)}">` : ""}</td>` : ""}<td><b>${cell(picture)}</b><br>${cell(cut.picture)}</td><td>${cell(cut.action)}${cut.note ? `<br><small>${cell(cut.note)}</small>` : ""}</td><td>${cell(speech)}</td><td>${cell(sound)}</td><td class="time">${timeLabel(cut.endSec - cut.startSec, fps)}<br><small>${cut.startSec.toFixed(2)}s</small></td></tr>`;
  });
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(board.id)} cut sheet</title>
<style>
@page{size:A4 landscape;margin:10mm}
body{font:12px/1.5 system-ui,"Yu Gothic",sans-serif;margin:16px;color:#111;background:#fff}
h1{font-size:16px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #444;padding:4px 6px;vertical-align:top;text-align:left}
th{background:#eee}
td.no,td.time{text-align:center;white-space:nowrap}
td.thumb img{display:block;width:160px;height:auto}
tr{break-inside:avoid}
</style></head><body>
<h1>${escapeHtml(board.id)} — ${board.cuts.length} cuts, ${board.durationSec}s @ ${fps}fps</h1>
<table><thead><tr><th>CUT</th>${thumbs ? "<th>画像</th>" : ""}<th>画</th><th>アクション</th><th>セリフ・文字</th><th>音</th><th>秒+コマ</th></tr></thead><tbody>
${rows.join("\n")}
</tbody></table></body></html>
`;
}

// Cuts from a `--shots` analysis report. Descriptive fields stay empty; transition CT is the
// detector's own claim (a detected hard cut), size and camera stay unset for the author.
function seedCuts(board, report, options = {}) {
  if (board.cuts !== undefined) fail("film cut-sheet", "storyboard.json already has cuts; refusing to overwrite. Fix: delete cuts first if the analysis really should replace them", { code: "CUTS_EXIST" });
  const shots = (report.segments || []).filter((segment) => segment.reason === "detected-shot");
  if (!shots.length) fail("film cut-sheet", "the analysis has no detected-shot segments. Fix: run `reference analyze-video --shots` first", { code: "NOT_SHOT_ANALYSIS" });
  const frames = new Map((report.frames || []).map((frame) => [frame.id, frame]));
  const pad = String(shots.length).length;
  return shots.map((shot, index) => {
    const ids = shot.frameIds || [];
    const frame = frames.get(ids[Math.floor(ids.length / 2)]) || frames.get(ids[0]);
    const cut = {
      no: String(index + 1).padStart(Math.max(pad, 3), "0"),
      startSec: Number(shot.startSec.toFixed(3)),
      endSec: Number(shot.endSec.toFixed(3)),
      picture: "",
      transition: "CT",
      ref: shot.id,
    };
    // The last detected shot can stop short of the media end by the sampling step; close it.
    if (index === shots.length - 1 && report.durationSec > shot.endSec && report.durationSec - shot.endSec < 0.25) cut.endSec = Number(report.durationSec.toFixed(3));
    if (frame && options.thumbPath) cut.thumb = options.thumbPath(frame);
    if (shot.motion) {
      cut.energy = energyOf(shot.motion.meanShare);
      cut.note = `reference motion mean ${(shot.motion.meanShare * 100).toFixed(1)}%, peak ${(shot.motion.peakShare * 100).toFixed(0)}%`;
    }
    if (shot.soundEvents?.length) cut.sound = shot.soundEvents.map((event) => ({ atSec: Number(event.atSec.toFixed(3)), note: `reference onset (strength ${event.strength})` }));
    return cut;
  });
}

module.exports = { CUT_SIZES, CUT_CAMERAS, CUT_TRANSITIONS, CUT_ENERGY, validateCuts, checkCuts, checkParity, renderCutSheet, seedCuts, timeLabel };
