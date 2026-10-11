"use strict";

// Product-film gates: turn the prose contract in references/product-film-direction.md into
// deterministic storyboard checks and objective render evidence. These gates reject known
// failure shapes (panel slideshow, surface-only motion, unclosed timelines, unbound sound);
// they never grant creative acceptance, which stays a separate reviewed state.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { assertEnum, assertKeys, assertString, fail, resolveInside, sha256 } = require("./contract-utils.cjs");
const { withFix } = require("./film-hints.cjs");

const STORYBOARD_SCHEMA = "design-pipeline.film-storyboard.v1";
const RENDER_SCHEMA = "design-pipeline.film-render-evidence.v1";
const SCOPE = "film storyboard";
const GRAMMARS = ["continuous-transformation", "product-demonstration", "match-cut-montage", "footage-led", "kinetic-type", "combination"];
const BEAT_ROLES = ["action", "title-hold", "brand-hold"];
const TRANSFORMATIONS = ["morph", "state-change", "reveal-in-context", "camera-move", "match-cut", "type-to-object", "data-update", "assembly", "footage", "none"];
const HANDOFFS = ["open", "continuation", "match-cut", "morph", "camera-carry", "hard-cut", "dissolve", "reset"];
const CUT_HANDOFFS = new Set(["hard-cut", "match-cut"]);
const CARRIED_HANDOFFS = new Set(["continuation", "morph", "camera-carry"]);
const DETACHED_HANDOFFS = new Set(["reset", "dissolve"]);
const NAMED_CARRY_HANDOFFS = new Set(["continuation", "morph", "camera-carry", "match-cut"]);
const SURFACE_MOTION = new Set(["fade", "fade-in", "fade-out", "opacity", "scale", "scale-in", "scale-out", "zoom", "ken-burns", "slide-in", "slide-out", "blur-in", "blur-out"]);
const CUE_KINDS = ["entry", "exit", "downbeat", "accent", "riser", "impact", "voiceover", "silence"];
const PLACEHOLDER = /^(tbd|todo|n\/?a|none|-|\.\.\.|placeholder)$/i;
const FRAME_TOLERANCE_SEC = 0.05;
const MAX_HOLD_SHARE = 0.25;
// These are review prompts, not universal laws of animation or editing.
const RHYTHM_WARNINGS = new Set(["uniform-cadence", "no-rest", "hold-dominant", "hold-chain", "slideshow-handoffs", "sound-unbound"]);
const MATERIAL_REQUIREMENTS = ["solid-depth", "bevel", "clearcoat", "view-dependent-color", "surface-relief"];
const RENDER_ROUTES = ["dom", "canvas2d", "css3d", "webgl", "blender", "footage"];
// Product-promo admission (storyboard.productSource): a product-launch-video film is evaluated
// only when it is built from the real product, run at a pinned commit and captured. The record
// binds files by path and sha256; it cannot prove that captured pixels are real.
const PRODUCT_PROMO_FORM = "product-launch-video";
const SOURCE_STATUSES = ["admitted", "blocked"];
const CAPTURE_KINDS = ["ui-state", "operation"];
const BLOCKER_KINDS = ["no-repository", "access-denied", "build-failed", "run-failed", "needs-credentials", "capture-failed"];
const FLOW_STEPS = ["action", "response", "result"];
const COMMIT_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const CAPTURE_MEDIA = /\.(?:png|jpe?g|webp|gif|mp4|webm|mov|mkv)$/i;
// Run and capture times are RFC 3339 date-times with seconds and an explicit offset (Z or ±hh:mm):
// a time without an offset would be read in each host's own timezone and order captures differently.
const RFC3339_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;
// Unsourced beats may only be pure brand cards (brand-hold, transformation none), within the
// existing hold share; everything that shows product behavior, results or claims cites captures.
const MAX_UNSOURCED_SHARE = MAX_HOLD_SHARE;

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
// Epoch milliseconds of an RFC 3339 date-time computed from its own offset, or NaN; never the host
// timezone. A leap second (:60) orders as the start of the next minute.
function instant(value) {
  const match = typeof value === "string" ? RFC3339_DATE_TIME.exec(value) : null;
  if (!match) return NaN;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const offset = match[8].toUpperCase();
  const [offsetHour, offsetMinute] = offset === "Z" ? [0, 0] : [Number(offset.slice(1, 3)), Number(offset.slice(4, 6))];
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 60 || offsetHour > 23 || offsetMinute > 59) return NaN;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return NaN;
  const sign = offset.startsWith("-") ? -1 : 1;
  return date.getTime() + ((hour - sign * offsetHour) * 60 + minute - sign * offsetMinute) * 60000 + (second + Number(`0${match[7] || ""}`)) * 1000;
}
function dateTime(value, label) {
  assertString(value, label, SCOPE);
  if (!Number.isFinite(instant(value))) fail(SCOPE, `${label} must be an RFC 3339 date-time with seconds and a Z or +hh:mm/-hh:mm offset, for example 2026-09-19T10:55:00Z or 2026-09-19T18:55:00+08:00; a time without an offset would be read in each machine's own timezone`);
}
function projectPath(value, label) {
  real(value, label);
  const slashed = value.replace(/\\/g, "/");
  if (path.isAbsolute(value) || path.win32.isAbsolute(value) || /^[a-z]:/i.test(value) || slashed.split("/").includes("..")) fail(SCOPE, `${label} must be a project-relative path`);
}
function digest(value, label) {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) fail(SCOPE, `${label} must be the file's lowercase SHA-256 hex digest`);
}
function networkUrl(value, label, protocols) {
  real(value, label);
  let url;
  try { url = new URL(value); } catch { fail(SCOPE, `${label} must be a URL`); }
  if (!protocols.includes(url.protocol) || !url.hostname) fail(SCOPE, `${label} must be a ${protocols.map((protocol) => protocol.slice(0, -1)).join("/")} URL, not a local path`);
  if (url.password || (url.username && url.protocol.startsWith("http"))) fail(SCOPE, `${label} must not contain credentials`);
  return url;
}
function repositoryUrl(value) {
  const label = "productSource.repository";
  real(value, label);
  if (/^[\w.-]+@[\w.-]+:[^\s:]+$/.test(value)) return; // scp-like git@host:owner/repo
  const url = networkUrl(value, label, ["https:", "http:", "ssh:", "git:"]);
  if (url.pathname.replace(/\/+$/, "").length <= 1) fail(SCOPE, `${label} must name the repository, not only its host`);
}

// Shape of storyboard.productSource; returns the captures by id for beats[].source.
function validateProductSource(source) {
  assertKeys(source, ["status"], ["status", "repository", "commit", "run", "captures", "flow", "blocker"], "productSource", SCOPE);
  assertEnum(source.status, SOURCE_STATUSES, "productSource.status", SCOPE);
  if (source.repository !== undefined) repositoryUrl(source.repository);
  if (source.commit !== undefined && (typeof source.commit !== "string" || !COMMIT_SHA.test(source.commit))) fail(SCOPE, "productSource.commit must be a full 40- or 64-character lowercase commit SHA, not a branch, tag or short SHA");
  if (source.status === "blocked") {
    for (const key of ["run", "captures", "flow"]) if (source[key] !== undefined) fail(SCOPE, `a blocked productSource must not carry ${key}; record what is missing in blocker`);
    assertKeys(source.blocker, ["kind", "reason", "needs"], ["kind", "reason", "needs"], "productSource.blocker", SCOPE);
    assertEnum(source.blocker.kind, BLOCKER_KINDS, "productSource.blocker.kind", SCOPE);
    real(source.blocker.reason, "productSource.blocker.reason");
    real(source.blocker.needs, "productSource.blocker.needs");
    return new Map();
  }
  if (source.blocker !== undefined) fail(SCOPE, "productSource.blocker is only allowed when status is blocked");
  for (const key of ["repository", "commit", "run", "captures", "flow"]) if (source[key] === undefined) fail(SCOPE, `productSource is missing ${key}`);
  const run = source.run;
  assertKeys(run, ["command", "observedAt", "log"], ["command", "observedAt", "log", "url"], "productSource.run", SCOPE);
  real(run.command, "productSource.run.command");
  dateTime(run.observedAt, "productSource.run.observedAt");
  assertKeys(run.log, ["path", "sha256"], ["path", "sha256"], "productSource.run.log", SCOPE);
  projectPath(run.log.path, "productSource.run.log.path");
  digest(run.log.sha256, "productSource.run.log.sha256");
  if (run.url !== undefined) networkUrl(run.url, "productSource.run.url", ["http:", "https:"]);
  if (!Array.isArray(source.captures) || source.captures.length === 0) fail(SCOPE, "productSource.captures must be a non-empty array");
  const captures = new Map();
  for (const [index, capture] of source.captures.entries()) {
    const label = `productSource.captures[${index}]`;
    assertKeys(capture, ["id", "kind", "path", "sha256", "shows", "capturedAt"], ["id", "kind", "path", "sha256", "shows", "capturedAt"], label, SCOPE);
    real(capture.id, `${label}.id`);
    if (captures.has(capture.id)) fail(SCOPE, `${label} duplicates ${capture.id}`);
    assertEnum(capture.kind, CAPTURE_KINDS, `${label}.kind`, SCOPE);
    projectPath(capture.path, `${label}.path`);
    if (!CAPTURE_MEDIA.test(capture.path)) fail(SCOPE, `${label}.path must be an image or video capture (png, jpg, webp, gif, mp4, webm, mov or mkv)`);
    digest(capture.sha256, `${label}.sha256`);
    real(capture.shows, `${label}.shows`);
    dateTime(capture.capturedAt, `${label}.capturedAt`);
    captures.set(capture.id, capture);
  }
  assertKeys(source.flow, FLOW_STEPS, FLOW_STEPS, "productSource.flow", SCOPE);
  for (const step of FLOW_STEPS) {
    const ids = source.flow[step];
    const label = `productSource.flow.${step}`;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || !id.trim())) fail(SCOPE, `${label} must be a non-empty array of capture ids`);
    if (new Set(ids).size !== ids.length) fail(SCOPE, `${label} must not repeat capture ids`);
    for (const id of ids) if (!captures.has(id)) fail(SCOPE, `${label} references unknown capture ${id}`);
  }
  return captures;
}

// Admission is a precondition for evaluating a product-promo film, not one more weighted finding:
// callers stop before any other evaluation unless the status is admitted. Required for the Stage 0
// product-launch-video form and whenever a storyboard declares productSource. options.shots
// false checks the record alone (before beats are planned).
function productSourceAdmission(board, options = {}) {
  const source = board.productSource;
  const form = options.deliverableForm || null;
  const required = form === PRODUCT_PROMO_FORM || source !== undefined;
  if (!required) return { required: false, status: "not-required", form, findings: [] };
  if (source !== undefined) validateProductSource(source);
  const findings = [];
  const add = (code, message, beatId) => findings.push(withFix("storyboard", { code, severity: "error", message, ...(beatId ? { beatId } : {}) }));
  const result = (status) => ({ required: true, status, form, ...(source?.repository ? { repository: source.repository } : {}), ...(source?.commit ? { commit: source.commit } : {}), findings });
  if (source === undefined) {
    add("product-source-missing", "a product-launch-video film needs storyboard.json.productSource: the real product's repository, pinned commit, run evidence, UI and operation captures, and shots built from them. Text, cards or invented screens cannot stand in for the product.");
    return result("failed");
  }
  if (source.status === "blocked") {
    add("product-source-blocked", `the product could not be sourced (${source.blocker.kind}): ${source.blocker.reason} Needs: ${source.blocker.needs}`);
    return result("blocked");
  }
  if (!options.projectRoot) fail(SCOPE, "productSource verification needs the project root that contains its run log and captures");
  const bytes = (rel, label) => {
    let file;
    try { file = resolveInside(options.projectRoot, rel, label, { scope: SCOPE }); }
    catch (error) { add("product-source-file-missing", `${label} ${rel} is not a file inside the project (${error.message})`); return null; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { add("product-source-file-missing", `${label} ${rel} does not exist`); return null; }
    return fs.readFileSync(file);
  };
  const log = bytes(source.run.log.path, "productSource.run.log");
  if (log) {
    if (sha256(log) !== source.run.log.sha256) add("product-source-file-changed", `productSource.run.log ${source.run.log.path} no longer matches its recorded sha256`);
    if (!log.toString("utf8").toLowerCase().includes(source.commit)) add("product-source-run-unpinned", `run log ${source.run.log.path} does not show the pinned commit ${source.commit}`);
  }
  for (const capture of source.captures) {
    const content = bytes(capture.path, `capture ${capture.id}`);
    if (content && sha256(content) !== capture.sha256) add("product-source-file-changed", `capture ${capture.id} (${capture.path}) no longer matches its recorded sha256`);
  }
  const byId = new Map(source.captures.map((capture) => [capture.id, capture]));
  const missingKinds = CAPTURE_KINDS.filter((kind) => !source.captures.some((capture) => capture.kind === kind));
  if (missingKinds.length) add("product-source-captures-incomplete", `captures need at least one ${missingKinds.join(" and one ")} capture`);
  if (!source.flow.action.some((id) => byId.get(id).kind === "operation")) add("product-source-captures-incomplete", "flow.action must cite an operation capture of the user's action");
  const observedAt = instant(source.run.observedAt);
  const early = source.captures.filter((capture) => instant(capture.capturedAt) < observedAt).map((capture) => capture.id);
  if (early.length) add("product-source-time-order", `captures ${early.join(", ")} predate the recorded run (${source.run.observedAt})`);
  // Every capture of a step precedes every capture of the next step, not only the earliest ones.
  const times = (step) => source.flow[step].map((id) => instant(byId.get(id).capturedAt));
  if (Math.max(...times("action")) > Math.min(...times("response")) || Math.max(...times("response")) > Math.min(...times("result"))) add("product-source-time-order", "the flow's captures are out of order: every action capture must come before every response capture, and every response capture before every result capture");
  if (options.shots !== false) {
    // Copy and claims ride on real material: every beat cites the captures it shows, except a pure
    // brand card (a brand-hold that changes nothing). Title cards, result cards and benefit claims
    // without captures are invented material, whatever share of the film is real.
    const pureBrand = (beat) => beat.role === "brand-hold" && beat.transformation.kind === "none";
    for (const beat of board.beats) {
      if ((beat.source || []).length || pureBrand(beat)) continue;
      add("shot-source-missing", beat.role === "action"
        ? `action beat ${beat.id} names no real product capture in source`
        : `${beat.role} ${beat.id} presents copy or a product claim without real product material; cite the captures it shows (only a brand-hold that changes nothing may stay unsourced)`, beat.id);
    }
    // Each flow step is shown by an action beat citing one of that step's captures, in order: the
    // action is first shown no later than the response, the response no later than the result (one
    // continuous beat may carry all three). A hold or card cannot show a step.
    const firstShown = {};
    for (const step of FLOW_STEPS) {
      const index = board.beats.findIndex((beat) => beat.role === "action" && (beat.source || []).some((id) => source.flow[step].includes(id)));
      if (index < 0) add("flow-unshown", `no action beat cites a capture of the recorded flow ${step} (${source.flow[step].join(", ")}); a title, card or hold cannot stand in for it`);
      else firstShown[step] = index;
    }
    if (Object.keys(firstShown).length === FLOW_STEPS.length && (firstShown.action > firstShown.response || firstShown.response > firstShown.result)) {
      add("flow-out-of-order", `the film shows the flow out of order (action first at ${board.beats[firstShown.action].id}, response at ${board.beats[firstShown.response].id}, result at ${board.beats[firstShown.result].id}); show the action before its response and the response before the result, or carry them in one continuous beat`);
    }
    // Secondary bound: unsourced brand cards stay within the existing hold share.
    const unsourcedSec = board.beats.filter((beat) => !(beat.source || []).length).reduce((sum, beat) => sum + Math.max(0, beat.endSec - beat.startSec), 0);
    const unsourced = unsourcedSec / board.durationSec;
    if (unsourced > MAX_UNSOURCED_SHARE) add("source-share-low", `beats without real captures take ${(unsourced * 100).toFixed(0)}% of the film; unsourced brand cards may take at most ${MAX_UNSOURCED_SHARE * 100}%`);
  }
  return result(findings.length ? "failed" : "admitted");
}

// Project-relative files an admitted record binds; workflow gates hash them as checked inputs so a
// changed capture or run log reopens the checks that relied on it.
function productSourceFiles(board) {
  const source = board && typeof board === "object" ? board.productSource : null;
  if (!source || source.status !== "admitted" || !Array.isArray(source.captures)) return [];
  return [source.run?.log?.path, ...source.captures.map((capture) => capture?.path)].filter((file) => typeof file === "string" && file.trim());
}

function validateShape(board) {
  assertKeys(board, ["schema", "id", "durationSec", "grammar", "benefit", "proofAction", "sound", "beats"], ["schema", "id", "durationSec", "fps", "grammar", "benefit", "proofAction", "reference", "sound", "beats", "endState", "rendering", "productSource"], "storyboard", SCOPE);
  if (board.endState !== undefined) assertEnum(board.endState, ["free", "rest", "loop"], "endState", SCOPE);
  if (board.schema !== STORYBOARD_SCHEMA) fail(SCOPE, `schema must be ${STORYBOARD_SCHEMA}`);
  real(board.id, "id");
  if (!(board.durationSec > 0)) fail(SCOPE, "durationSec must be positive");
  if (board.fps !== undefined && !(Number.isInteger(board.fps) && board.fps > 0)) fail(SCOPE, "fps must be a positive integer");
  assertEnum(board.grammar, GRAMMARS, "grammar", SCOPE);
  real(board.benefit, "benefit");
  real(board.proofAction, "proofAction");
  if (board.reference !== undefined) real(board.reference, "reference");
  if (board.rendering !== undefined) {
    const rendering = board.rendering;
    assertKeys(rendering, ["route", "requirements", "reason", "samples"], ["route", "requirements", "reason", "samples"], "rendering", SCOPE);
    assertEnum(rendering.route, RENDER_ROUTES, "rendering.route", SCOPE);
    real(rendering.reason, "rendering.reason");
    if (!Array.isArray(rendering.requirements)) fail(SCOPE, "rendering.requirements must be an array");
    for (const effect of rendering.requirements) assertEnum(effect, MATERIAL_REQUIREMENTS, "rendering.requirements", SCOPE);
    if (new Set(rendering.requirements).size !== rendering.requirements.length) fail(SCOPE, "rendering.requirements must not contain duplicates");
    if (!Array.isArray(rendering.samples)) fail(SCOPE, "rendering.samples must be an array");
    for (const [index, sample] of rendering.samples.entries()) {
      const label = `rendering.samples[${index}]`;
      assertKeys(sample, ["atSec", "purpose"], ["atSec", "purpose"], label, SCOPE);
      seconds(sample.atSec, `${label}.atSec`);
      if (sample.atSec > board.durationSec) fail(SCOPE, `${label}.atSec must be within the film`);
      real(sample.purpose, `${label}.purpose`);
    }
  }
  const captures = board.productSource === undefined ? new Map() : validateProductSource(board.productSource);
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
    assertKeys(beat, ["id", "startSec", "endSec", "role", "subject", "productAction", "transformation", "handoff", "motion"], ["id", "startSec", "endSec", "role", "subject", "productAction", "transformation", "handoff", "motion", "choreography", "block", "arc", "soundCues", "note", "carrier", "holdSec", "source"], label, SCOPE);
    if (beat.arc !== undefined) assertEnum(beat.arc, ["anticipate-act-settle"], `${label}.arc`, SCOPE);
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
    if (beat.holdSec !== undefined) {
      const beatLength = beat.endSec - beat.startSec;
      if (typeof beat.holdSec !== "number" || !Number.isFinite(beat.holdSec) || beat.holdSec <= 0 || beat.holdSec > beatLength) fail(SCOPE, `${label}.holdSec must be greater than 0 and at most the beat length (${beatLength}s)`);
    }
    if (!Array.isArray(beat.motion) || beat.motion.length === 0 || beat.motion.some((entry) => typeof entry !== "string" || !entry.trim())) fail(SCOPE, `${label}.motion must be a non-empty string array`);
    if (beat.soundCues !== undefined) {
      if (!Array.isArray(beat.soundCues)) fail(SCOPE, `${label}.soundCues must be an array`);
      for (const id of beat.soundCues) if (!cueIds.has(id)) fail(SCOPE, `${label}.soundCues references unknown cue ${id}`);
    }
    if (beat.source !== undefined) {
      if (!Array.isArray(beat.source) || beat.source.length === 0 || beat.source.some((id) => typeof id !== "string" || !id.trim())) fail(SCOPE, `${label}.source must be a non-empty array of productSource capture ids`);
      if (new Set(beat.source).size !== beat.source.length) fail(SCOPE, `${label}.source must not repeat capture ids`);
      for (const id of beat.source) if (!captures.has(id)) fail(SCOPE, `${label}.source references unknown capture ${id}${board.productSource?.status === "admitted" ? "" : " (no admitted productSource records it)"}`);
    }
  }
}

function checkStoryboard(board, options = {}) {
  validateShape(board);
  // A product-launch-video film that is not built from the admitted real product is not evaluated
  // further: no structure, rhythm or later render result can offset a missing product source.
  const { findings: admissionFindings, ...admission } = productSourceAdmission(board, options);
  if (admission.required && admission.status !== "admitted") {
    return { schema: STORYBOARD_SCHEMA, id: board.id, status: admission.status === "blocked" ? "blocked" : "failed", findings: admissionFindings, admission, metrics: null, creativeAcceptance: "not-assessed" };
  }
  const choreography = options.choreographyIds || loadChoreographyIds();
  const filmRhythm = options.filmRhythm !== false;
  const findings = [];
  const add = (code, message, beatId) => findings.push(withFix("storyboard", { code, message, ...(beatId ? { beatId } : {}), ...(RHYTHM_WARNINGS.has(code) ? { severity: "warn" } : {}) }));
  const beats = board.beats;
  const total = board.durationSec;
  if (board.rendering) {
    const { route, requirements, samples } = board.rendering;
    // These routes preserve real geometry/material response or recorded pixels. A route claim
    // is planning conformance, never evidence of shader execution or a visual match.
    if (requirements.length && !["webgl", "blender", "footage"].includes(route)) {
      add("material-route-incapable", `${route} cannot satisfy required material effects: ${requirements.join(", ")}`);
    }
    if (requirements.includes("view-dependent-color") && new Set(samples.map((sample) => sample.atSec)).size < 2) {
      add("material-angle-samples-missing", "view-dependent color needs at least two distinct inspection times with different reference angles");
    }
  }

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

  // A carried boundary must name what survives it: what continues, morphs or carries across.
  for (const beat of beats) {
    if (!NAMED_CARRY_HANDOFFS.has(beat.handoff)) continue;
    const carrier = typeof beat.carrier === "string" ? beat.carrier.trim() : "";
    if (!carrier || PLACEHOLDER.test(carrier)) add("carrier-unnamed", "carried handoff must name what survives the boundary and what it becomes", beat.id);
  }

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
    if (beat.block !== undefined && options.blockNames && !options.blockNames.has(beat.block)) add("block-unknown", `unknown HyperFrames block ${beat.block}`, beat.id);
  }

  // Hold share and chains are review prompts; performance or reading may need stillness.
  const holds = beats.filter((beat) => beat.role !== "action");
  const holdShare = holds.reduce((sum, beat) => sum + (beat.endSec - beat.startSec), 0) / total;
  if (holdShare > MAX_HOLD_SHARE) add("hold-dominant", `title/brand holds take ${(holdShare * 100).toFixed(0)}% of runtime; review their dramatic or reading purpose`);
  for (let index = 1; index < beats.length; index += 1) {
    if (beats[index].role !== "action" && beats[index - 1].role !== "action") add("hold-chain", "consecutive holds: review what each image or pause lets the viewer read", beats[index].id);
  }

  // Rhythm proxies invite review of repetition and contrast; they do not establish intent.
  const beatLengths = beats.map((beat) => beat.endSec - beat.startSec);
  const shortestLen = Math.min(...beatLengths);
  const longestLen = Math.max(...beatLengths);
  const rawCadenceRatio = shortestLen > 0 ? longestLen / shortestLen : null;
  const cadenceRatio = rawCadenceRatio === null ? null : Number(rawCadenceRatio.toFixed(2));
  if (filmRhythm && beats.length >= 4 && rawCadenceRatio !== null && rawCadenceRatio < 3) add("uniform-cadence", `beat lengths span ${shortestLen}s-${longestLen}s (ratio ${cadenceRatio.toFixed(2)}); review whether the regular pulse serves the intended rhythm`);
  const restSec = Number((holds.reduce((sum, beat) => sum + (beat.endSec - beat.startSec), 0) + beats.reduce((sum, beat) => sum + (beat.holdSec || 0), 0)).toFixed(2));
  const hasHoldSec = beats.some((beat) => (beat.holdSec || 0) >= 0.3);
  if (filmRhythm && total >= 8 && holds.length === 0 && !hasHoldSec) add("no-rest", `film is ${total}s with no title/brand hold and no beat holding still for at least 0.3s`);

  // Slideshow detector: detached handoffs between panels that only fade/scale.
  const transitions = beats.slice(1);
  const detached = transitions.filter((beat) => DETACHED_HANDOFFS.has(beat.handoff));
  if (transitions.length >= 2 && detached.length / transitions.length > 0.5) add("slideshow-handoffs", `${detached.length}/${transitions.length} handoffs reset or dissolve; review the intended relation between images`);
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
    status: findings.some((finding) => finding.severity !== "warn") ? "failed" : "passed",
    findings,
    metrics: {
      beats: beats.length,
      actionBeats: actionBeats.length,
      holdShare: Number(holdShare.toFixed(3)),
      detachedHandoffShare: transitions.length ? Number((detached.length / transitions.length).toFixed(3)) : 0,
      surfaceOnlyActionBeats: actionBeats.filter(surfaceOnly).length,
      plannedCutsSec: cutsPlanned,
      cadenceRatio,
      restSec,
    },
    ...(admission.required ? { admission } : {}),
    creativeAcceptance: "not-assessed",
  };
}

// ---------- render evidence ----------

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, { encoding: options.binary ? "buffer" : "utf8", maxBuffer: 1 << 28, windowsHide: true });
  if (result.error) fail("film render", `${bin} unavailable: ${result.error.message}`, { code: "TOOL_MISSING" });
  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    const diagnostic = stderr.length > 6144 ? `${stderr.slice(0, 4096)}\n[diagnostic truncated]\n${stderr.slice(-2048)}` : stderr;
    fail("film render", `${bin} exited ${result.status}: ${diagnostic}`, { code: "TOOL_FAILED", stderrTruncated: stderr.length > 6144 });
  }
  return result;
}

function probe(video, tools) {
  const out = run(tools.ffprobe, ["-v", "error", "-show_entries", "format=duration:stream=codec_type,r_frame_rate,duration", "-of", "json", video]).stdout;
  const info = JSON.parse(out);
  const streams = info.streams || [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  if (!videoStream) fail("film render", "file has no video stream");
  const [num, den] = String(videoStream.r_frame_rate || "0/1").split("/").map(Number);
  // durationSec is the container's, as long as its longest stream; videoDurationSec is the video
  // stream's own, null when the stream reports none (ffprobe prints N/A or omits it).
  const streamSec = videoStream.duration == null ? NaN : Number(videoStream.duration);
  return { durationSec: Number(info.format?.duration || 0), videoDurationSec: Number.isFinite(streamSec) ? streamSec : null, fps: den ? num / den : 0, hasAudio: streams.some((stream) => stream.codec_type === "audio") };
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

// Runtime-agnostic motion evidence: share of pixels that change between consecutive 10 fps
// frames at 160x90. It sees motion the GSAP probe cannot (3D, shader, canvas, Blender, footage).
// Calibration: a frozen clip measures 0.000%; the smallest real motion in a HyperFrames demo
// (a fading logo) measured 0.086%.
const MOTION_FPS = 10;
const MOTION_W = 160;
const MOTION_H = 90;
const FROZEN_SHARE = 0.0002;

function motionProfile(video, tools) {
  const { stdout } = run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", video, "-an", "-vf", `fps=${MOTION_FPS},scale=${MOTION_W}:${MOTION_H},format=gray`, "-f", "rawvideo", "-"], { binary: true });
  const size = MOTION_W * MOTION_H;
  const frames = Math.floor(stdout.length / size);
  const shares = [];
  for (let i = 1; i < frames; i += 1) {
    let changed = 0;
    for (let p = 0; p < size; p += 1) if (Math.abs(stdout[i * size + p] - stdout[(i - 1) * size + p]) > 4) changed += 1;
    shares.push({ atSec: i / MOTION_FPS, share: changed / size });
  }
  const frameAt = (index) => stdout.subarray(index * size, (index + 1) * size);
  // Seam uses the per-step threshold; rest drift uses a coarser one because the first (key)
  // frame and a late frame carry different codec noise: a clip that truly returned and held
  // measured 0.28% at 32 levels, one that drifted away 5.6%.
  let seam = 0;
  let drift = 0;
  if (frames > 1) for (let p = 0; p < size; p += 1) {
    const d = Math.abs(frameAt(frames - 1)[p] - frameAt(0)[p]);
    if (d > 4) seam += 1;
    if (d > 32) drift += 1;
  }
  shares.firstLastShare = frames > 1 ? seam / size : 0;
  shares.restDriftShare = frames > 1 ? drift / size : 0;
  return shares;
}

// Motion-craft checks on the pixel motion curve. A settled film returns to its opening frame; a
// loop's last-to-first step looks like any other step; an anticipate-act-settle beat starts below
// its peak speed and eases out instead of stopping dead.
const REST_DRIFT_SHARE = 0.01;
function craftChecks(board, motion, add) {
  const steps = motion.map((sample) => sample.share);
  const sorted = [...steps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  if (board.endState === "rest" && motion.restDriftShare > REST_DRIFT_SHARE) add("rest-drift", `the last frame differs clearly from the first in ${(motion.restDriftShare * 100).toFixed(2)}% of pixels; the film should settle back to its opening state`);
  if (board.endState === "loop" && motion.firstLastShare > Math.max(3 * median, 0.01)) add("loop-seam-jump", `looping from the last frame to the first changes ${(motion.firstLastShare * 100).toFixed(2)}% of pixels, against a typical step of ${(median * 100).toFixed(2)}%`);
  for (const beat of board.beats) {
    if (beat.arc !== "anticipate-act-settle") continue;
    const inside = motion.filter((sample) => sample.atSec > beat.startSec && sample.atSec <= beat.endSec).map((sample) => sample.share);
    if (inside.length < 8) continue;
    const peak = Math.max(...inside);
    if (peak < FROZEN_SHARE * 5) continue;
    const edge = Math.max(1, Math.round(inside.length * 0.15));
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    if (mean(inside.slice(0, edge)) >= 0.8 * peak) add("missing-anticipation", `beat ${beat.id} starts at ${(100 * mean(inside.slice(0, edge)) / peak).toFixed(0)}% of its peak motion; there is no wind-up before the action`, "warn", beat.id);
    const tail = inside.slice(-edge);
    const peakIndex = inside.indexOf(peak);
    const deadStop = inside.slice(peakIndex + 1).some((value, i) => (i === 0 ? peak : inside[peakIndex + i]) >= 0.8 * peak && value < 0.1 * peak);
    if (mean(tail) >= 0.8 * peak || deadStop) add("missing-settle", `beat ${beat.id} ${deadStop ? "drops from full motion to still in one frame" : "is still at full motion when it ends"}; ease the action out into a settle`, "warn", beat.id);
  }
}

// A panel swap on a calm background changes a large block of pixels in one 10 fps step and
// almost nothing around it; continuous motion spreads its change over many steps. The step at the
// boundary must stand out from both its window (1 s either side) and its immediate neighbours.
// Calibration: a 400x300 card swapped on a 1280x720 dark stage changes about 13% in one step; a
// camera move over a gradient changes a similar share every step and is not flagged.
// A step whose two neighbours are both still (under a tenth of it) is a cut even when camera moves
// fill the rest of the window: a golden case's match cut changed 27% of the frame against 0.6% and
// 0.0% either side, while its 2 s window had a 16% median from the moves around the holds.
const REPLACEMENT_MIN_SHARE = 0.02;
const REPLACEMENT_RATIO = 4;
const STILL_NEIGHBOUR_RATIO = 10;
function instantReplacement(motion, atSec) {
  const at = motion.filter((sample) => Math.abs(sample.atSec - atSec) <= 0.15);
  if (!at.length) return null;
  const peak = at.reduce((best, sample) => (sample.share > best.share ? sample : best));
  const window = motion.filter((sample) => Math.abs(sample.atSec - atSec) <= 1 && !at.includes(sample)).map((sample) => sample.share).sort((a, b) => a - b);
  const typical = window.length ? window[Math.floor(window.length / 2)] : 0;
  const index = motion.indexOf(peak);
  const neighbours = [motion[index - 1], motion[index + 1]].filter(Boolean).map((sample) => sample.share);
  const isolated = neighbours.every((share) => peak.share >= REPLACEMENT_RATIO * share || share < REPLACEMENT_MIN_SHARE / 2);
  const betweenStills = neighbours.length === 2 && neighbours.every((share) => STILL_NEIGHBOUR_RATIO * share < peak.share);
  if (peak.share >= REPLACEMENT_MIN_SHARE && (peak.share >= REPLACEMENT_RATIO * Math.max(typical, FROZEN_SHARE) || betweenStills) && isolated) {
    return { share: Number(peak.share.toFixed(4)), typical: Number(typical.toFixed(4)) };
  }
  return null;
}

function nearest(list, value) {
  let best = Infinity;
  for (const item of list) best = Math.min(best, Math.abs(item - value));
  return best;
}

function contactSheet(video, beats, outDir, tools, extraSamples = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const frames = [];
  for (const [index, beat] of beats.entries()) {
    const atSec = Number(((beat.startSec + beat.endSec) / 2).toFixed(3));
    const file = path.join(outDir, `beat-${String(index + 1).padStart(3, "0")}.png`);
    run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(atSec), "-i", video, "-frames:v", "1", "-vf", "scale=480:-2", file]);
    frames.push({ beatId: beat.id, atSec, file: path.basename(file) });
  }
  // Extra samples (e.g. start and end of procedurally driven beats) stay out of the tiled sheet.
  const extras = [];
  for (const [index, beat] of beats.entries()) {
    for (const [n, fraction] of (extraSamples[beat.id] || []).entries()) {
      const atSec = Number((beat.startSec + (beat.endSec - beat.startSec) * fraction).toFixed(3));
      const file = path.join(outDir, `beat-${String(index + 1).padStart(3, "0")}-s${n}.png`);
      run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(atSec), "-i", video, "-frames:v", "1", "-vf", "scale=480:-2", file]);
      extras.push({ beatId: beat.id, atSec, file: path.basename(file) });
    }
  }
  const columns = Math.min(4, frames.length);
  const rows = Math.ceil(frames.length / columns);
  const sheet = path.join(outDir, "contact-sheet.png");
  run(tools.ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-framerate", "1", "-i", path.join(outDir, "beat-%03d.png"), "-vf", `tile=${columns}x${rows}:padding=8:margin=8`, "-frames:v", "1", sheet]);
  return { frames, extras, sheet: path.basename(sheet) };
}

function evaluateFilmRender(board, video, options = {}) {
  const storyboard = checkStoryboard(board, options);
  if (storyboard.admission && storyboard.admission.status !== "admitted") {
    return {
      schema: RENDER_SCHEMA,
      id: board.id,
      status: storyboard.status,
      storyboard: { status: storyboard.status, findings: storyboard.findings },
      admission: storyboard.admission,
      findings: [],
      creativeAcceptance: "not-assessed",
      limits: "Not evaluated: product-promo render evidence is measured only after the storyboard's product source is admitted.",
    };
  }
  const tools = { ffmpeg: options.ffmpeg || "ffmpeg", ffprobe: options.ffprobe || "ffprobe" };
  const cutTolerance = options.cutToleranceSec ?? 0.2;
  const syncTolerance = options.syncToleranceSec ?? 0.1;
  if (!fs.existsSync(video) || fs.statSync(video).size === 0) fail("film render", "video file is missing or empty");
  const media = probe(video, tools);
  const findings = [];
  const add = (code, message, severity = "error", beatId) => findings.push(withFix("render", { code, severity, message, ...(beatId ? { beatId } : {}) }));

  const durationDelta = Number((media.durationSec - board.durationSec).toFixed(3));
  if (Math.abs(durationDelta) > 0.5) add("duration-mismatch", `render is ${media.durationSec}s, storyboard declares ${board.durationSec}s`);

  const cuts = detectCuts(video, tools, options.sceneThreshold ?? 0.3);
  const motion = motionProfile(video, tools);
  const planned = storyboard.metrics.plannedCutsSec;
  // A planned cut is present when the scene detector sees it, or when one step replaces a block of
  // the frame (the detector carry-cut uses). Dark, desaturated cuts score low on scene change:
  // a golden case's cut from a wide strip to a greyed close-up changed 34% of the frame in one
  // step against 0.2% before it, yet scored 0.155 (threshold 0.3).
  const pixelCuts = planned.filter((at) => nearest(cuts, at) > cutTolerance && instantReplacement(motion, at));
  const missed = planned.filter((at) => nearest(cuts, at) > cutTolerance && !pixelCuts.includes(at));
  const unplanned = cuts.filter((at) => nearest(board.beats.map((beat) => beat.startSec), at) > cutTolerance);
  if (planned.length && missed.length / planned.length > 0.5) add("planned-cuts-missing", `${missed.length}/${planned.length} planned cuts not found in render`);
  const allCuts = [...cuts, ...pixelCuts].sort((a, b) => a - b);

  let audio = { present: media.hasAudio, onsets: 0, cutsOnOnset: null };
  if (board.sound.mode === "scored" && !media.hasAudio) add("audio-missing", "storyboard is scored but render has no audio stream; audiovisual acceptance is incomplete");
  if (media.hasAudio) {
    const onsets = detectOnsets(video, tools);
    const aligned = allCuts.filter((at) => nearest(onsets, at) <= syncTolerance).length;
    audio = { present: true, onsets: onsets.length, cutsOnOnset: allCuts.length ? Number((aligned / allCuts.length).toFixed(3)) : null };
    if (board.sound.mode === "scored" && allCuts.length >= 3 && aligned / allCuts.length < 0.3) add("cuts-off-beat", `${aligned}/${allCuts.length} cuts land within ${syncTolerance}s of an audio onset; review phrasing and intentional counterpoint`, "warn");
  }

  // Continuity carried by the storyboard (not match-cut, which is a cut by design) must not render
  // as a cut at its planned boundary: either a full-frame scene change, or a panel that swaps in a
  // single frame on an otherwise calm background, which the scene detector misses.
  const carryBreaks = [];
  for (const beat of board.beats.slice(1)) {
    if (!CARRIED_HANDOFFS.has(beat.handoff)) continue;
    if (nearest(cuts, beat.startSec) <= cutTolerance) {
      carryBreaks.push({ beatId: beat.id, atSec: beat.startSec, kind: "scene-cut" });
      add("carry-cut", `planned ${beat.handoff} at ${beat.startSec}s renders as a scene cut`, "error", beat.id);
      continue;
    }
    const swap = instantReplacement(motion, beat.startSec);
    if (swap) {
      carryBreaks.push({ beatId: beat.id, atSec: beat.startSec, kind: "instant-replacement", changedShare: swap.share, typicalShare: swap.typical });
      add("carry-cut", `planned ${beat.handoff} at ${beat.startSec}s renders as an instant replacement: ${(swap.share * 100).toFixed(1)}% of the frame changes in one step against a typical ${(swap.typical * 100).toFixed(2)}%`, "error", beat.id);
    }
  }
  const stillCount = motion.filter((sample) => sample.share < FROZEN_SHARE).length;
  const stillness = { stillShare: motion.length ? Number((stillCount / motion.length).toFixed(3)) : 0 };
  const beatMotion = board.beats.map((beat) => {
    const inside = motion.filter((sample) => sample.atSec > beat.startSec && sample.atSec <= beat.endSec);
    const share = inside.length ? inside.reduce((sum, sample) => sum + sample.share, 0) / inside.length : 0;
    return { beatId: beat.id, role: beat.role, changedShare: Number(share.toFixed(5)) };
  });
  for (const entry of beatMotion) {
    const beat = board.beats.find((candidate) => candidate.id === entry.beatId);
    if (entry.role === "action" && beat.endSec - beat.startSec >= 0.5 && entry.changedShare < FROZEN_SHARE) add("render-static-beat", `action beat ${entry.beatId} is frozen in the render (${(entry.changedShare * 100).toFixed(3)}% of pixels change per frame)`);
  }
  craftChecks(board, motion, add);

  const sheet = options.outDir ? contactSheet(video, board.beats, options.outDir, tools, options.extraSamples || {}) : null;
  return {
    schema: RENDER_SCHEMA,
    id: board.id,
    status: storyboard.status === "passed" && !findings.some((finding) => finding.severity !== "warn") ? "passed" : "failed",
    storyboard: { status: storyboard.status, findings: storyboard.findings },
    ...(storyboard.admission ? { admission: storyboard.admission } : {}),
    findings,
    media: { durationSec: media.durationSec, durationDeltaSec: durationDelta, fps: Number(media.fps.toFixed(3)) },
    cuts: { detectedSec: cuts, pixelCutsSec: pixelCuts, plannedSec: planned, missedSec: missed, unplannedSec: unplanned },
    audio,
    motion: beatMotion,
    stillness,
    carryBreaks,
    contactSheet: sheet,
    creativeAcceptance: "not-assessed",
    limits: "Objective signals only: scene-change cuts, energy-flux onsets, per-beat pixel motion and midpoint frames. Creative review of comprehension, continuity, rhythm and identity remains a separate qa.md record.",
  };
}

module.exports = { PRODUCT_PROMO_FORM, STORYBOARD_SCHEMA, RENDER_SCHEMA, checkStoryboard, detectCuts, detectOnsets, evaluateFilmRender, instantReplacement, motionProfile, probe, productSourceAdmission, productSourceFiles, run };
