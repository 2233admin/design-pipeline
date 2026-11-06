"use strict";

// `materials`: public-domain / CC0 image sources, downloads with provenance, collage cutting.
//   sources  list the registry (references/material-sources.json); --probe re-measures reachability
//   search   query the sources that have an adapter and return candidates with their licence field
//   fetch    download one object into materials/raw/ and record it in materials/licenses.json
//   add      register an owner-supplied file (font, scan, photo) in the same licenses.json
//   cut      cut a recorded raw image into cut / sticker / ink / plate pieces (art-motion assets.cjs)
//   check    every material file recorded, provenance complete, derived pieces match their source hash
// Records reuse the film-edit sources/licenses.json shape ({"<file>": {license, commercialUse}}),
// extended with provenance fields, so one reader serves footage and materials.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { fail, readJson, sha256 } = require("./contract-utils.cjs");
const { decodePng, encodePng } = require("./png-core.cjs");
const { cutCollage } = require("../tools/art-motion/assets.cjs");
const procedural = require("../tools/art-motion/procedural.cjs");
const textureStats = require("../tools/art-motion/texture-stats.cjs");
const raster = require("../tools/art-motion/raster.cjs");
const compositor = require("../tools/art-motion/composite.cjs");
const layerContract = require("../tools/template-bank/layers.cjs");

const SCOPE = "materials";
const REGISTRY = path.resolve(__dirname, "../references/material-sources.json");
const MATERIALS_DIR = "materials";
const RECORDS = "licenses.json";
const USER_AGENT = "design-pipeline-materials/1.0 (https://github.com/2233admin/design-pipeline; low volume)";
const OPEN_LICENSES = new Set(["CC0", "PDM", "public-domain"]);
const KINDS = new Set(["image", "font", "scan", "photo", "texture", "generated", "other"]);
const REQUESTS_DIR = "requests";
const COMPOSITE_DIR = "composite";
const MATERIAL_FILE = /\.(png|jpe?g|webp|gif|tiff?|svg|otf|ttf|woff2?|ttc)$/i;
const PROVENANCE_FIELDS = ["source", "sourceUrl", "author", "retrieved"];

function loadRegistry() {
  return readJson(REGISTRY, "material sources");
}

function sourceById(id) {
  const source = loadRegistry().sources.find((entry) => entry.id === id);
  if (!source) fail(SCOPE, `unknown source ${id}. Fix: pick one of ${loadRegistry().sources.map((entry) => entry.id).join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  return source;
}

function listSources() {
  const registry = loadRegistry();
  return {
    status: "ready",
    registry: "references/material-sources.json",
    sources: registry.sources.map(({ id, name, adapter, license, reachability, fix, strengths }) => ({ id, name, automated: Boolean(adapter), licenseField: license.field, reachability, ...(fix ? { fix } : {}), strengths })),
    next: ["Re-measure with `materials probe`; search the automated sources with `materials search --query \"key,butterfly\"`."],
  };
}

// ---- licence records (shared with film-edit) ------------------------------------------------

// `scope` names the caller in errors (film-edit reads footage licences through the same function).
function readRecords(dir, scope = SCOPE) {
  const file = path.join(dir, RECORDS);
  if (!fs.existsSync(file)) return {};
  const records = readJson(file, `${scope} licenses`);
  if (!records || typeof records !== "object" || Array.isArray(records)) fail(scope, `${path.basename(dir)}/${RECORDS} must be an object keyed by file name, like {"<file>": {"license": "...", "commercialUse": true}}`, { code: "CONTRACT_INVALID" });
  return records;
}

function writeRecords(dir, records) {
  fs.mkdirSync(dir, { recursive: true });
  const sorted = Object.fromEntries(Object.keys(records).sort().map((key) => [key, records[key]]));
  fs.writeFileSync(path.join(dir, RECORDS), `${JSON.stringify(sorted, null, 2)}\n`);
}

// The film-edit view of a record: licence string plus commercial-use flag.
function licenseOf(records, ...keys) {
  const record = keys.map((key) => records[key]).find(Boolean) || {};
  return { license: record.license || "unrecorded", commercialUse: record.commercialUse === true };
}

function isOpenLicense(value) {
  return OPEN_LICENSES.has(value);
}

function materialsDir(project) {
  return path.join(project, MATERIALS_DIR);
}

function relativeMaterial(project, file) {
  const dir = materialsDir(project), absolute = path.resolve(project, file);
  const rel = path.relative(dir, absolute);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) fail(SCOPE, `${file} is outside ${MATERIALS_DIR}/. Fix: copy it into ${MATERIALS_DIR}/ (for example ${MATERIALS_DIR}/owner/) and register that path`, { code: "PATH_OUTSIDE_ROOT" });
  if (!fs.existsSync(absolute)) fail(SCOPE, `${file} does not exist`, { code: "INPUT_MISSING" });
  return rel.split(path.sep).join("/");
}

function fileFacts(absolute) {
  const bytes = fs.readFileSync(absolute), facts = { sha256: sha256(bytes), bytes: bytes.length };
  if (/\.png$/i.test(absolute)) {
    const image = decodePng(bytes, absolute);
    Object.assign(facts, { width: image.width, height: image.height });
  }
  return facts;
}

// ---- owner-supplied material ---------------------------------------------------------------

function addMaterial(project, options) {
  if (!options.file) fail(SCOPE, "--file is required", { code: "OPTION_REQUIRED" });
  if (!options.license) fail(SCOPE, "--license is required (for example CC0, public-domain, OFL-1.1, owner-photo)", { code: "OPTION_REQUIRED" });
  if (!options.author) fail(SCOPE, "--by <author or rights holder> is required", { code: "OPTION_REQUIRED" });
  const kind = options.kind || "image";
  if (!KINDS.has(kind)) fail(SCOPE, `--kind must be one of ${[...KINDS].join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const rel = relativeMaterial(project, options.file), dir = materialsDir(project), records = readRecords(dir);
  if (records[rel] && !options.replace) fail(SCOPE, `${rel} is already recorded. Fix: pass --replace to overwrite its record`, { code: "OUTPUT_EXISTS" });
  const facts = fileFacts(path.join(dir, rel));
  const generated = kind === "generated" ? generatedProvenance(project, options) : null;
  if (kind !== "generated" && (options.tool || options.prompt)) fail(SCOPE, "--tool and --prompt record an image model's output; pass --kind generated", { code: "OPTION_VALUE_INVALID" });
  const landmarks = options.landmarks === undefined ? null : parseLandmarks(options.landmarks, facts);
  const record = {
    license: options.license,
    commercialUse: options.commercialUse ?? isOpenLicense(options.license),
    kind,
    source: options.source || (generated ? `image-model:${generated.tool}` : "owner-supplied"),
    sourceUrl: options.sourceUrl || (generated ? `generated:${generated.tool}` : "owner-supplied"),
    author: options.author,
    retrieved: options.retrieved || today(),
    ...(options.title ? { title: options.title } : {}),
    ...(options.use ? { use: options.use } : {}),
    ...(generated ? { generatedBy: generated } : {}),
    ...(landmarks ? { landmarks } : {}),
    ...facts,
  };
  records[rel] = record;
  writeRecords(dir, records);
  return { status: "recorded", file: `${MATERIALS_DIR}/${rel}`, record, next: [generated ? `materials cut --project-root ${project} --file ${MATERIALS_DIR}/${rel} --mode grabcut --finish cut (or --mode none for a transparent PNG with --finish cut)` : nextCut(project, rel)] };
}

// An image model's output is recorded against the task sheet it was made from: the tool, the
// sheet's prompt and structured twin (hashes), the template and layer it was asked for.
function generatedProvenance(project, options) {
  if (!options.tool || !/^[A-Za-z0-9][\w .:+-]{0,63}$/.test(String(options.tool))) fail(SCOPE, "--kind generated needs --tool <name> (the image model or app that made it, e.g. codex, gpt-image-1)", { code: "OPTION_REQUIRED" });
  if (!options.prompt) fail(SCOPE, "--kind generated needs --prompt materials/requests/<name>.md (the task sheet written by materials request)", { code: "OPTION_REQUIRED" });
  const promptRel = relativeMaterial(project, options.prompt);
  if (!promptRel.startsWith(`${REQUESTS_DIR}/`) || !promptRel.endsWith(".md")) fail(SCOPE, `--prompt must be a task sheet under ${MATERIALS_DIR}/${REQUESTS_DIR}/ (.md); write one with materials request --template <id>`, { code: "TASK_SHEET_MISSING" });
  const taskRel = promptRel.replace(/\.md$/, ".json"), taskFile = path.join(materialsDir(project), taskRel);
  if (!fs.existsSync(taskFile)) fail(SCOPE, `${MATERIALS_DIR}/${taskRel} is missing: a prompt without its task sheet cannot be checked. Fix: write the sheet with materials request --template <id> --name ${path.basename(promptRel, ".md")}`, { code: "TASK_SHEET_MISSING" });
  const task = readJson(taskFile, "generation task");
  if (task.schema !== layerContract.TASK_SCHEMA) fail(SCOPE, `${MATERIALS_DIR}/${taskRel} is not a generation task (schema ${layerContract.TASK_SCHEMA})`, { code: "TASK_SHEET_MISSING" });
  return {
    tool: String(options.tool),
    prompt: { file: promptRel, sha256: sha256(fs.readFileSync(path.join(materialsDir(project), promptRel))) },
    task: { file: taskRel, sha256: sha256(fs.readFileSync(taskFile)), template: task.template, layer: task.layer },
  };
}

// Landmarks returned with a generated figure (or annotated on a stand-in), in the file's pixels.
function parseLandmarks(raw, facts) {
  let value = raw;
  if (typeof raw === "string") { try { value = JSON.parse(raw); } catch (error) { fail(SCOPE, `--landmarks is not JSON: ${error.message}`, { code: "OPTION_VALUE_INVALID" }); } }
  const W = facts.width ?? Infinity, H = facts.height ?? Infinity;
  const box = (b, label) => {
    if (!Array.isArray(b) || b.length !== 4 || b.some((v) => !Number.isFinite(v)) || b[0] >= b[2] || b[1] >= b[3] || b[0] < 0 || b[1] < 0 || b[2] > W || b[3] > H) fail(SCOPE, `landmarks.${label} must be [x0, y0, x1, y1] inside the ${W}x${H} image`, { code: "OPTION_VALUE_INVALID" });
    return b;
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(SCOPE, "--landmarks must be an object {foot, headTop, face, hands}", { code: "OPTION_VALUE_INVALID" });
  for (const key of Object.keys(value)) if (!["foot", "headTop", "face", "hands"].includes(key)) fail(SCOPE, `unknown landmark ${key}; known: foot, headTop, face, hands`, { code: "OPTION_VALUE_INVALID" });
  const out = {};
  if (value.foot !== undefined) { if (!Array.isArray(value.foot) || value.foot.length !== 2 || value.foot.some((v) => !Number.isFinite(v))) fail(SCOPE, "landmarks.foot must be [x, y]", { code: "OPTION_VALUE_INVALID" }); out.foot = value.foot; }
  if (value.headTop !== undefined) { if (!Number.isFinite(value.headTop) || (out.foot && value.headTop >= out.foot[1])) fail(SCOPE, "landmarks.headTop must be a y above the foot", { code: "OPTION_VALUE_INVALID" }); out.headTop = value.headTop; }
  if ((out.foot === undefined) !== (out.headTop === undefined)) fail(SCOPE, "give landmarks.foot and landmarks.headTop together (they set the figure's scale)", { code: "OPTION_VALUE_INVALID" });
  if (value.face !== undefined) out.face = box(value.face, "face");
  if (value.hands !== undefined) { if (!Array.isArray(value.hands)) fail(SCOPE, "landmarks.hands is a list of boxes", { code: "OPTION_VALUE_INVALID" }); out.hands = value.hands.map((b, i) => box(b, `hands[${i}]`)); }
  return out;
}

// Landmarks in a cut piece's pixels: the source's minus the piece's placement.
function shiftLandmarks(landmarks, dx, dy) {
  if (!landmarks) return null;
  const b = (v) => [v[0] - dx, v[1] - dy, v[2] - dx, v[3] - dy];
  return { ...(landmarks.foot ? { foot: [landmarks.foot[0] - dx, landmarks.foot[1] - dy], headTop: landmarks.headTop - dy } : {}), ...(landmarks.face ? { face: b(landmarks.face) } : {}), ...(landmarks.hands ? { hands: landmarks.hands.map(b) } : {}) };
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function nextCut(project, rel) {
  return /\.png$/i.test(rel) ? `materials cut --project-root ${project} --file ${MATERIALS_DIR}/${rel} --mode border|paper|white-matte|none [--finish cut,sticker,ink,plate]` : `${rel} is not a PNG; cutting reads PNG (materials fetch converts downloads).`;
}

// ---- cutting -------------------------------------------------------------------------------

function cutMaterial(project, options) {
  if (!options.file) fail(SCOPE, "--file is required", { code: "OPTION_REQUIRED" });
  if (!options.mode) fail(SCOPE, "--mode border|paper|white-matte|none is required", { code: "OPTION_REQUIRED" });
  const dir = materialsDir(project), rel = relativeMaterial(project, options.file), records = readRecords(dir);
  const parent = records[rel];
  if (!parent) fail(SCOPE, `${rel} has no licence record. Fix: record it first with materials fetch or materials add`, { code: "LICENSE_UNRECORDED" });
  if (!/\.png$/i.test(rel)) fail(SCOPE, `${rel} is not a PNG`, { code: "OPTION_VALUE_INVALID" });
  const input = fs.readFileSync(path.join(dir, rel));
  if (parent.sha256 && parent.sha256 !== sha256(input)) fail(SCOPE, `${rel} changed since it was recorded. Fix: re-record it (materials add --replace or materials fetch --replace) before cutting`, { code: "SOURCE_CHANGED" });
  let params = {};
  if (options.params) {
    try { params = JSON.parse(options.params); } catch (error) { fail(SCOPE, `--params is not JSON: ${error.message}`, { code: "OPTION_VALUE_INVALID" }); }
  }
  const finishes = options.finish ? String(options.finish).split(",").map((value) => value.trim()).filter(Boolean) : undefined;
  const result = cutCollage(input, { mode: options.mode, ...(finishes ? { finishes } : {}), params });
  const stem = path.basename(rel, path.extname(rel));
  const outRel = `cut/${stem}`, outDir = path.join(dir, outRel);
  const owner = Object.entries(records).find(([key, record]) => key.startsWith(`${outRel}/`) && record.derivedFrom && record.derivedFrom.file !== rel);
  if (owner) fail(SCOPE, `${MATERIALS_DIR}/${outRel} holds pieces of ${owner[1].derivedFrom.file}. Fix: rename one of the two sources so their stems differ, then re-record it`, { code: "OUTPUT_EXISTS" });
  if (fs.existsSync(outDir)) {
    if (!options.replace) fail(SCOPE, `${MATERIALS_DIR}/${outRel} exists. Fix: pass --replace to cut again`, { code: "OUTPUT_EXISTS" });
    for (const key of Object.keys(records)) if (key.startsWith(`${outRel}/`)) delete records[key];
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });
  const operation = { operation: "collage-cut", mode: result.mode, params: result.params };
  const written = result.outputs.map((output) => {
    const bytes = encodePng(output.image), key = `${outRel}/${output.name}`;
    fs.writeFileSync(path.join(dir, key), bytes);
    records[key] = {
      license: parent.license,
      commercialUse: parent.commercialUse === true,
      kind: parent.kind || "image",
      source: parent.source,
      sourceUrl: parent.sourceUrl,
      author: parent.author,
      retrieved: parent.retrieved,
      ...(parent.title ? { title: parent.title } : {}),
      ...(options.use || parent.use ? { use: options.use || parent.use } : {}),
      ...(parent.generatedBy ? { generatedBy: parent.generatedBy } : {}),
      ...(parent.landmarks && output.finish === "cut" ? { landmarks: shiftLandmarks(parent.landmarks, output.placement.x, output.placement.y) } : {}),
      sha256: sha256(bytes), width: output.image.width, height: output.image.height,
      derivedFrom: { file: rel, sha256: result.input.sha256, finish: output.finish, ...(output.piece !== undefined ? { piece: output.piece } : {}), placement: output.placement, ...operation, ...(result.measurements.edge ? { matte: result.measurements.edge.after || result.measurements.edge.before } : {}) },
    };
    return { file: `${MATERIALS_DIR}/${key}`, finish: output.finish, width: output.image.width, height: output.image.height };
  });
  writeRecords(dir, records);
  const findings = result.findings.map((finding) => ({ ...finding, file: `${MATERIALS_DIR}/${rel}` }));
  return {
    status: findings.some((finding) => finding.severity === "error") ? "failed" : "cut",
    source: `${MATERIALS_DIR}/${rel}`,
    outputs: written,
    measurements: result.measurements,
    findings,
    creativeAcceptance: "not-assessed",
    next: ["Look at every piece at its use size before placing it: the measurements flag likely dirty mattes, they do not prove a clean one."],
  };
}

// ---- procedural, processed and measured material -------------------------------------------

const GENERATED_LICENSE = "generated";
const GENERATED_AUTHOR = "design-pipeline procedural generator";

function parseParams(raw) {
  if (raw === undefined || raw === null || raw === "") return {};
  if (typeof raw === "object") return raw;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value;
  } catch (error) {
    fail(SCOPE, `--params must be a JSON object: ${error.message}`, { code: "OPTION_VALUE_INVALID" });
  }
}

function parseSeed(raw) {
  const seed = raw === undefined || raw === null ? 1 : Number(raw);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail(SCOPE, "--seed must be an integer from 0 to 4294967295", { code: "OPTION_VALUE_INVALID" });
  return seed;
}

function profileFile(project, id) {
  return path.join(materialsDir(project), "calibration", `${id}.json`);
}

function profileRef(project, id) {
  return { id, origin: procedural.loadProfile(id, project).origin };
}

// Digest of one calibration profile as it is now: a built-in entry of
// references/material-calibration.json, or a project file materials/calibration/<id>.json.
function profileDigest(project, id) {
  const builtin = procedural.builtinProfiles().profiles[id];
  if (builtin) return { id, origin: "builtin", file: `references/material-calibration.json#${id}`, sha256: sha256(Buffer.from(JSON.stringify(builtin))) };
  const file = profileFile(project, id);
  return fs.existsSync(file) ? { id, origin: "project", file: `${MATERIALS_DIR}/calibration/${id}.json`, sha256: sha256(fs.readFileSync(file)) } : null;
}

// Every calibration profile a generated or processed file was made or graded from (its own
// profile, the paper it is printed on, a woodcut's grain, the --reference it was measured
// against), with the digest of the profile: changing one, built in or the owner's, makes the file
// stale in materials check.
function calibrationUsed(project, params, extraIds = []) {
  const ids = [...new Set([...["profile", "paper", "grain"].map((key) => params?.[key]), ...extraIds].filter((v) => typeof v === "string" && v !== "none" && !v.startsWith("#")))];
  return ids.map((id) => profileDigest(project, id)).filter(Boolean);
}

function similarityTo(project, stats, kind, referenceId) {
  const id = referenceId || (kind === "halftone" ? "autotype-1904" : null);
  if (!id) return null;
  const profile = procedural.loadProfile(id, project);
  if ((profile.kind === "halftone") !== (kind === "halftone")) fail(SCOPE, `reference ${id} is a ${profile.kind} profile; it cannot be compared with a ${kind} measurement`, { code: "OPTION_VALUE_INVALID" });
  // Held out: the generator was fitted on region A of the scan; it is compared with region B.
  const reference = profile.heldOut || profile.stats;
  const distance = textureStats.distance({ ...stats, kind: reference.kind }, reference, profile.stats);
  const yardsticks = { natural: profile.natural, between: profile.between, grading: profile.grading };
  return { reference: { id, origin: profile.origin, kind: profile.kind, description: profile.description }, distance, assessment: textureStats.assess(kind, distance, yardsticks) };
}

function generatedRecord(run, extra) {
  return {
    license: GENERATED_LICENSE,
    commercialUse: true,
    kind: run.format === "svg" ? "image" : "texture",
    source: "procedural",
    sourceUrl: `design-pipeline:procedural/${run.generator}@${run.version}`,
    author: GENERATED_AUTHOR,
    retrieved: today(),
    ...extra,
    ...(run.calibration.length ? { calibration: run.calibration } : {}),
    generator: { name: run.generator, version: run.version, seed: run.seed, params: run.params, ...(run.profileRef ? { profile: run.profileRef } : {}) },
  };
}

function runGenerator(project, generator, params, seed) {
  const run = procedural.generate(generator, params, seed, project);
  const bytes = run.format === "svg" ? Buffer.from(run.svg) : encodePng(run.image);
  if (run.profile) run.profileRef = profileRef(project, run.profile.id);
  run.calibration = calibrationUsed(project, run.params);
  return { run, bytes };
}

function generateMaterial(project, options) {
  if (options.file) return replayMaterial(project, options.file);
  if (!options.generator) fail(SCOPE, `--generator is required (${Object.keys(procedural.GENERATORS).join(", ")})`, { code: "OPTION_REQUIRED" });
  const params = parseParams(options.params), seed = parseSeed(options.seed);
  const { run, bytes } = runGenerator(project, options.generator, params, seed);
  const dir = materialsDir(project), records = readRecords(dir);
  // The default name carries the seed only when the output depends on it.
  const stem = slug(options.name || `${options.generator}-${run.params.profile || run.params.scene || run.params.motif || run.params.shape || "out"}${run.usesSeed === false ? "" : `-s${seed}`}`);
  const rel = `generated/${stem}.${run.format}`, target = path.join(dir, rel);
  if ((fs.existsSync(target) || records[rel]) && !options.replace) fail(SCOPE, `${MATERIALS_DIR}/${rel} exists. Fix: pass --replace or --name <other>`, { code: "OUTPUT_EXISTS" });
  let similarity = null;
  if (run.image && run.measureAs) {
    const stats = textureStats.measure(run.image, run.measureAs.kind, run.measureAs);
    similarity = similarityTo(project, stats, run.measureAs.kind, options.reference || run.profile?.id);
    if (similarity) run.calibration = calibrationUsed(project, run.params, [similarity.reference.id]);
    if (similarity) similarity = { ...similarity, measured: { rmsL: stats.rmsL, visibleRmsL: stats.visibleRmsL, ...(stats.offLatticeFraction !== undefined ? { offLatticeFraction: stats.offLatticeFraction, periodPx: stats.periodPx } : {}) } };
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  const record = generatedRecord(run, {
    ...(options.use ? { use: options.use } : {}),
    ...(run.geometry ? { geometry: run.geometry } : {}),
    ...(similarity ? { similarity: { reference: similarity.reference.id, metric: similarity.assessment.metric, value: similarity.assessment.value, natural: similarity.assessment.natural, between: similarity.assessment.between, ...(similarity.assessment.histogramL ? { histogramL: similarity.assessment.histogramL } : {}), level: similarity.assessment.level, ...(similarity.assessment.reason ? { reason: similarity.assessment.reason } : {}) } } : {}),
    sha256: sha256(bytes), bytes: bytes.length, width: run.params.width, height: run.params.height,
  });
  records[rel] = record;
  writeRecords(dir, records);
  return {
    status: "generated",
    file: `${MATERIALS_DIR}/${rel}`,
    record,
    ...(similarity ? { similarity } : {}),
    ...(run.geometry ? { geometry: run.geometry } : {}),
    creativeAcceptance: "not-assessed",
    next: [
      `Replay: materials generate --project-root ${project} --file ${MATERIALS_DIR}/${rel} (same bytes from the recorded generator, version, params and seed)`,
      run.format === "png" ? `Process: materials process --project-root ${project} --file ${MATERIALS_DIR}/${rel} --effect woodcut|halftone|papercut|photocopy|duotone` : "SVG line art: place it as vector, or render it to PNG before materials process.",
    ],
  };
}

// Regenerate a recorded file in memory and compare bytes; never overwrites.
function replayMaterial(project, file) {
  const dir = materialsDir(project), rel = relativeMaterial(project, file), records = readRecords(dir), record = records[rel];
  if (!record || !record.generator) fail(SCOPE, `${rel} has no generator record. Fix: only files written by materials generate can be replayed`, { code: "OPTION_VALUE_INVALID" });
  const { name, version, seed, params } = record.generator;
  if (procedural.GENERATORS[name] !== version) {
    return { status: "version-changed", file: `${MATERIALS_DIR}/${rel}`, recorded: version, current: procedural.GENERATORS[name] ?? null, fix: `The ${name} generator is now version ${procedural.GENERATORS[name]}; regenerate with materials generate --project-root ${project} --generator ${name} --params '${JSON.stringify(params)}' --seed ${seed} --name ${path.basename(rel, path.extname(rel))} --replace and re-check the pieces that use it` };
  }
  // Pixels, not deflate bytes, are what a generator promises: a PNG encoder or zlib update may
  // change the bytes of identical pixels. SVG is text and compared as is.
  const { run } = runGenerator(project, name, params, seed);
  const raw = fs.readFileSync(path.join(dir, rel)), fileUnchanged = sha256(raw) === record.sha256;
  const content = (image) => sha256(Buffer.concat([Buffer.from(`${image.width}x${image.height}:`), image.data]));
  const regenerated = run.format === "svg" ? sha256(Buffer.from(run.svg)) : content(run.image);
  let onDisk;
  try { onDisk = run.format === "svg" ? sha256(raw) : content(decodePng(raw, rel)); } catch { onDisk = null; }
  const status = fileUnchanged && regenerated === onDisk ? "reproduced" : "differs";
  return {
    status, file: `${MATERIALS_DIR}/${rel}`, compared: run.format === "svg" ? "svg-text" : "decoded-rgba", recorded: record.sha256, regenerated, onDisk,
    ...(status === "differs" ? { fix: !fileUnchanged ? `The file was edited after generation; re-record it with materials add --project-root ${project} --replace if the edit is intended, or regenerate it with --replace` : `The same generator version no longer gives the same pixels (a calibration profile it uses changed?); regenerate: materials generate --project-root ${project} --generator ${name} --params '${JSON.stringify(params)}' --seed ${seed} --name ${path.basename(rel, path.extname(rel))} --replace` } : {}),
  };
}

function processMaterial(project, options) {
  if (!options.file) fail(SCOPE, "--file is required", { code: "OPTION_REQUIRED" });
  if (!options.effect) fail(SCOPE, `--effect is required (${Object.keys(procedural.EFFECTS).join(", ")})`, { code: "OPTION_REQUIRED" });
  const dir = materialsDir(project), rel = relativeMaterial(project, options.file), records = readRecords(dir), parent = records[rel];
  if (!parent) fail(SCOPE, `${rel} has no licence record. Fix: record it first with materials fetch, add or generate`, { code: "LICENSE_UNRECORDED" });
  if (!/\.png$/i.test(rel)) fail(SCOPE, `${rel} is not a PNG; processing reads PNG`, { code: "OPTION_VALUE_INVALID" });
  const input = fs.readFileSync(path.join(dir, rel));
  if (parent.sha256 && parent.sha256 !== sha256(input)) fail(SCOPE, `${rel} changed since it was recorded. Fix: re-record it before processing`, { code: "SOURCE_CHANGED" });
  const params = parseParams(options.params), seed = parseSeed(options.seed);
  const result = procedural.processImage(input, options.effect, params, seed, project);
  const stem = slug(options.name || `${path.basename(rel, path.extname(rel))}-${options.effect}`), outRel = `processed/${stem}.png`, target = path.join(dir, outRel);
  if ((fs.existsSync(target) || records[outRel]) && !options.replace) fail(SCOPE, `${MATERIALS_DIR}/${outRel} exists. Fix: pass --replace or --name <other>`, { code: "OUTPUT_EXISTS" });
  const bytes = encodePng(result.image);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  records[outRel] = {
    license: parent.license,
    commercialUse: parent.commercialUse === true,
    kind: parent.kind || "image",
    source: parent.source,
    sourceUrl: parent.sourceUrl,
    author: parent.author,
    retrieved: parent.retrieved,
    ...(parent.title ? { title: parent.title } : {}),
    ...(options.use || parent.use ? { use: options.use || parent.use } : {}),
    sha256: sha256(bytes), width: result.image.width, height: result.image.height,
    ...(calibrationUsed(project, result.params).length ? { calibration: calibrationUsed(project, result.params) } : {}),
    derivedFrom: { file: rel, sha256: parent.sha256 || sha256(input), operation: "process", effect: result.effect, version: result.version, seed, params: result.params, ...(result.padPx ? { padPx: result.padPx } : {}) },
  };
  writeRecords(dir, records);
  return { status: "processed", source: `${MATERIALS_DIR}/${rel}`, file: `${MATERIALS_DIR}/${outRel}`, record: records[outRel], creativeAcceptance: "not-assessed", next: ["Look at it at 100% where it will be used; the effect is reproducible from the record, its look is not assessed."] };
}

// ---- generation task sheets and compositing (#311) -------------------------------------------

function templateBank() { return require("../tools/template-bank/bank.cjs"); }
function contractOf(templateId) {
  const bank = templateBank();
  let manifest, style;
  try { manifest = bank.loadManifest(templateId); style = bank.loadStyle(manifest.style); } catch (error) { fail(SCOPE, error.message, { code: error.code || "TEMPLATE_INVALID" }); }
  if (!manifest.layers) {
    const withLayers = bank.templateIds().filter((id) => bank.loadManifest(id).layers);
    fail(SCOPE, `${templateId} declares no layer contract. Fix: use a template with one (${withLayers.join(", ") || "none yet"}) or add manifest.layers`, { code: "OPTION_VALUE_INVALID" });
  }
  return { manifest, style };
}

// `materials request`: a task sheet (prompt .md + structured .json) for an external image model,
// derived from a template's layer contract and its style pack.
function requestMaterial(project, options) {
  if (!options.template) fail(SCOPE, "--template <id> is required (the template whose layer contract the figure must fit)", { code: "OPTION_REQUIRED" });
  const { manifest, style } = contractOf(options.template);
  // one line, bounded: the subject is quoted into the prompt, never free-form instructions
  const subject = options.subject ? String(options.subject).replace(/\s+/g, " ").trim() : "";
  if (subject.length > layerContract.SUBJECT_MAX) fail(SCOPE, `--subject is ${subject.length} characters; keep it to ${layerContract.SUBJECT_MAX} (who the character is, what they wear and do). Fix: shorten it`, { code: "OPTION_VALUE_INVALID" });
  const screen = layerContract.screenSubject(subject);
  if (screen.refused) {
    return { status: "refused", template: manifest.id, subject, matched: screen.matched, message: `the subject asks for an existing work's character or a derivative of it ("${screen.matched}")`, fix: "Describe an original character: role, age, build, clothing, pose and props in the style pack's grammar, without naming any existing work, character or person" };
  }
  const layerId = options.layer || null;
  const name = slug(options.name || `${manifest.id}-${layerId || "char"}`);
  let sheet;
  try { sheet = layerContract.taskSheet({ manifest, style, layerId, subject, tool: options.tool || null, name, srgbToOklab: raster.srgbToOklab }); } catch (error) { fail(SCOPE, error.message, { code: error.code || "OPTION_VALUE_INVALID" }); }
  const dir = path.join(materialsDir(project), REQUESTS_DIR), md = path.join(dir, `${name}.md`), json = path.join(dir, `${name}.json`);
  if ((fs.existsSync(md) || fs.existsSync(json)) && !options.replace) fail(SCOPE, `${MATERIALS_DIR}/${REQUESTS_DIR}/${name}.md exists. Fix: pass --replace or --name <other>`, { code: "OUTPUT_EXISTS" });
  const record = { ...sheet, written: today() }, markdown = layerContract.sheetMarkdown(sheet);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(json, `${JSON.stringify(record, null, 2)}\n`);
  fs.writeFileSync(md, markdown);
  return {
    status: "requested",
    prompt: `${MATERIALS_DIR}/${REQUESTS_DIR}/${name}.md`,
    task: `${MATERIALS_DIR}/${REQUESTS_DIR}/${name}.json`,
    sheet: { template: sheet.template, layer: sheet.layer, minFigureHeightPx: sheet.output.minFigureHeightPx, suggestedCanvas: sheet.output.suggestedCanvas, background: sheet.output.background, light: sheet.light, sizes: sheet.sizes },
    next: [`Run the prompt in ${options.tool || "the image model"}; save the result as ${sheet.return.file}; then ${sheet.return.intake}`],
  };
}

const COMPOSITE_PARAMS = ["landmarks", ...compositor.MODE_KEYS];

function recordedInput(project, records, file, label) {
  const rel = relativeMaterial(project, file), record = records[rel];
  if (!record) fail(SCOPE, `${label} ${rel} has no licence record. Fix: record it with materials fetch, add, generate or cut first`, { code: "LICENSE_UNRECORDED" });
  if (!/\.png$/i.test(rel)) fail(SCOPE, `${label} ${rel} is not a PNG`, { code: "OPTION_VALUE_INVALID" });
  const bytes = fs.readFileSync(path.join(materialsDir(project), rel));
  if (record.sha256 && record.sha256 !== sha256(bytes)) fail(SCOPE, `${label} ${rel} changed since it was recorded. Fix: re-record or re-make it before compositing`, { code: "SOURCE_CHANGED" });
  return { rel, record, bytes, sha: sha256(bytes) };
}

// POSIX-shell quoting, so a recorded command with spaces or quotes in paths can be pasted as is.
function shellQuote(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./:=,@%+-]+$/.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;
}

// What a composite depends on besides its input files: the template's layer contract and the style
// pack's integration for the mode used. A change to either makes the outputs stale.
function compositeDigests(manifest, style, mode) {
  const integration = style.integration || {};
  return {
    contractSha256: sha256(Buffer.from(JSON.stringify(manifest.layers))),
    integrationSha256: sha256(Buffer.from(JSON.stringify({ mode, spec: integration.modes?.[mode] ?? null, texture: integration.texture ?? null, hueRole: integration.hueRole ?? null }))),
  };
}

// `materials composite`: every declared size of a template's layer contract from one set of layers.
function compositeMaterial(project, options) {
  if (!options.template) fail(SCOPE, "--template <id> is required", { code: "OPTION_REQUIRED" });
  const { manifest, style } = contractOf(options.template), contract = manifest.layers;
  const palette = Object.fromEntries(Object.entries(manifest.palette).map(([role, spec]) => [role, spec.value]));
  const integration = style.integration;
  if (!integration) fail(SCOPE, `style ${style.id} declares no integration (sticker or painted). Fix: add integration to styles/${style.id}/style.json`, { code: "OPTION_VALUE_INVALID" });
  const mode = options.mode || integration.mode;
  if (!compositor.MODES.includes(mode) || !integration.modes[mode]) fail(SCOPE, `--mode must be one of ${Object.keys(integration.modes).join(", ")} (style ${style.id} default: ${integration.mode})`, { code: "OPTION_VALUE_INVALID" });
  const params = parseParams(options.params);
  for (const key of Object.keys(params)) if (!COMPOSITE_PARAMS.includes(key)) fail(SCOPE, `unknown composite param ${key}; known: ${COMPOSITE_PARAMS.join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const modeSpec = { ...integration.modes[mode] };
  for (const key of compositor.MODE_KEYS) if (params[key] !== undefined) modeSpec[key] = params[key] && typeof params[key] === "object" && modeSpec[key] && typeof modeSpec[key] === "object" ? { ...modeSpec[key], ...params[key] } : params[key];
  const allSizes = Object.keys(contract.sizes);
  const sizes = options.size ? String(options.size).split(",").map((v) => v.trim()).filter(Boolean) : allSizes;
  for (const key of sizes) if (!contract.sizes[key]) fail(SCOPE, `--size ${key} is not declared by ${manifest.id}; declared: ${allSizes.join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const set = options.set || {}, dir = materialsDir(project), records = readRecords(dir);
  const known = contract.stack.filter((l) => l.role !== "type").map((l) => l.id);
  for (const key of Object.keys(set)) if (!known.includes(key)) fail(SCOPE, `--set ${key}: ${manifest.id} has no layer ${key}; layers: ${known.join(", ")}`, { code: "OPTION_VALUE_INVALID" });
  const inputs = {}, layers = {};
  for (const layer of contract.stack) {
    if (layer.role === "type") continue;
    const needed = layer.role === "char" || layer.plate || (layer.role !== "texture" && sizes.some((key) => contract.sizes[key].boxes?.[layer.id]));
    if (!set[layer.id]) { if (needed) fail(SCOPE, `--set ${layer.id}=materials/<file>.png is required (${layer.role} layer of ${manifest.id})`, { code: "OPTION_REQUIRED" }); continue; }
    const input = recordedInput(project, records, set[layer.id], `--set ${layer.id}`);
    inputs[layer.id] = input;
    layers[layer.id] = raster.planesOf(decodePng(input.bytes, input.rel));
  }
  const charLayer = contract.stack.find((l) => l.role === "char").id, charInput = inputs[charLayer], char = layers[charLayer];
  let opaque = 0;
  for (let i = 0; i < char.A.length; i += 1) if (char.A[i] < 0.99) opaque += 1;
  if (opaque < char.A.length * 0.02) fail(SCOPE, `the ${charLayer} layer ${charInput.rel} has no transparency: it is not cut out. Fix: materials cut --project-root ${project} --file ${MATERIALS_DIR}/${charInput.record.derivedFrom?.file || charInput.rel} --mode grabcut --finish cut, and set the piece`, { code: "OPTION_VALUE_INVALID" });
  const fromAlpha = compositor.alphaLandmarks(char);
  const given = params.landmarks ? parseLandmarks(params.landmarks, { width: char.width, height: char.height }) : charInput.record.landmarks || null;
  const landmarks = { ...fromAlpha, ...(given || {}), from: params.landmarks ? "params" : charInput.record.landmarks ? (charInput.record.generatedBy ? "task-sheet return" : "intake") : "alpha" };
  const name = slug(options.name || `${manifest.id}-${mode}`), outRel = `${COMPOSITE_DIR}/${name}`, outDir = path.join(dir, outRel);
  if (fs.existsSync(outDir)) {
    if (!options.replace) fail(SCOPE, `${MATERIALS_DIR}/${outRel} exists. Fix: pass --replace to composite again`, { code: "OUTPUT_EXISTS" });
    for (const key of Object.keys(records)) if (key.startsWith(`${outRel}/`)) delete records[key];
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });
  const hueRole = integration.hueRole || contract.char.light.rimColour;
  const inputList = Object.entries(inputs).map(([layer, input]) => ({ layer, file: input.rel, sha256: input.sha, license: input.record.license }));
  const licenses = [...new Set(inputList.map((i) => i.license))].sort();
  const commercialUse = Object.values(inputs).every((i) => i.record.commercialUse === true);
  const command = ["materials", "composite", "--project-root", project, "--template", manifest.id, ...Object.entries(set).flatMap(([k, v]) => ["--set", `${k}=${v}`]), "--mode", mode, ...(options.size ? ["--size", sizes.join(",")] : []), ...(options.params ? ["--params", JSON.stringify(params)] : []), "--name", name, "--replace"].map(shellQuote).join(" ");
  const digests = compositeDigests(manifest, style, mode);
  const out = {}, findings = [], shas = {};
  for (const key of sizes) {
    const r = compositor.compositeSize({ contract, key, size: contract.sizes[key], layers, char, landmarks, mode, modeSpec, texture: integration.texture, palette, hueHex: palette[hueRole], charEdge: charInput.record.derivedFrom?.matte || null });
    const files = {};
    for (const [output, image] of [["final", raster.imageOf({ width: r.width, height: r.height, ...r.final })], ["ground", raster.imageOf({ width: r.width, height: r.height, ...r.ground })], ["upper", raster.imageOf({ width: r.width, height: r.height, ...r.upper })], ["mask", raster.greyImage(r.mask, r.width, r.height)]]) {
      const file = `${key}${output === "final" ? "" : `-${output}`}.png`, bytes = encodePng(image), keyRel = `${outRel}/${file}`;
      fs.writeFileSync(path.join(outDir, file), bytes);
      files[output] = file; shas[file] = sha256(bytes);
      records[keyRel] = {
        license: licenses.join(" + "), commercialUse, kind: "image", source: "composite", sourceUrl: `design-pipeline:composite/${manifest.id}`,
        author: [...new Set(Object.values(inputs).map((i) => i.record.author).filter(Boolean))].join("; ") || "unknown", retrieved: today(),
        use: `${manifest.id} ${key} ${output}`, sha256: sha256(bytes), width: r.width, height: r.height,
        derivedFrom: { file: charInput.rel, sha256: charInput.sha, operation: "composite", template: manifest.id, mode, size: key, output, layer: output === "ground" ? "ground" : output === "upper" ? "char" : output, inputs: inputList, ...digests },
      };
    }
    out[key] = { files, measurements: r.measurements, boxes: r.boxes, steps: r.steps, findings: r.findings };
    findings.push(...r.findings.map((f) => ({ ...f, file: `${MATERIALS_DIR}/${outRel}/${files.final}` })));
  }
  const receipt = {
    schema: "design-pipeline.composite.v1",
    template: manifest.id, style: style.id, ...digests, mode, modeSpec, hueRole, landmarks,
    inputs: inputList, command, made: today(),
    outputs: Object.fromEntries(Object.entries(out).flatMap(([key, v]) => Object.entries(v.files).map(([output, file]) => [file, { size: key, output, layer: output === "ground" ? "ground" : output === "upper" ? "char" : output, sha256: shas[file] }]))),
    sizes: out,
    limits: compositor.LIMITS,
  };
  fs.writeFileSync(path.join(outDir, "composite.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  writeRecords(dir, records);
  const failed = findings.some((f) => f.severity === "error");
  return {
    status: failed ? "failed" : "composited",
    template: manifest.id, mode, receipt: `${MATERIALS_DIR}/${outRel}/composite.json`,
    sizes: Object.fromEntries(Object.entries(out).map(([key, v]) => [key, { files: Object.fromEntries(Object.entries(v.files).map(([o, f]) => [o, `${MATERIALS_DIR}/${outRel}/${f}`])), measurements: v.measurements, boxes: v.boxes }])),
    findings,
    creativeAcceptance: "not-assessed",
    next: [
      `Put the ground image under the type as the text ground and the upper image above it: template render ${manifest.id} --set ${manifest.layers.groundSlot || "scene"}=${MATERIALS_DIR}/${outRel}/<WxH>-ground.png --set ${manifest.layers.charSlot || "figure"}=${MATERIALS_DIR}/${outRel}/<WxH>-upper.png -o <out.svg> (or <img data-layer="ground"> in a page), then template check --browser.`,
      "Look at every size at 100%: the measurements bound the matte, grade and safe areas; they do not judge the look.",
    ],
  };
}

// Measure a texture; compare it with a calibration profile; or save it as a project profile.
function measureMaterial(project, options) {
  if (!options.file) fail(SCOPE, "--file is required", { code: "OPTION_REQUIRED" });
  const dir = materialsDir(project), rel = relativeMaterial(project, options.file), records = readRecords(dir), record = records[rel] || null;
  if (!/\.png$/i.test(rel)) fail(SCOPE, `${rel} is not a PNG`, { code: "OPTION_VALUE_INVALID" });
  const params = parseParams(options.params), generated = record?.generator;
  const genKind = generated ? { paper: "paper", print: "print", halftone: "halftone" }[generated.name] : null;
  const kind = options.kind || genKind;
  if (!kind) fail(SCOPE, `--kind is required for ${rel} (${textureStats.KINDS.join(", ")})`, { code: "OPTION_REQUIRED" });
  const pxPerMm = params.pxPerMm ?? generated?.params?.pxPerMm ?? record?.pxPerMm ?? null;
  const image = decodePng(fs.readFileSync(path.join(dir, rel)), rel);
  const stats = textureStats.measure(image, kind, { pxPerMm, roi: params.roi });
  const out = { status: "measured", file: `${MATERIALS_DIR}/${rel}`, kind, stats };
  if (!pxPerMm) out.warning = "No px/mm: bands are in pixels and cannot be compared with a calibration profile. Fix: pass params.pxPerMm (scanner dpi / 25.4, or ruler pixels per mm)";
  if (options.name) {
    // Owner calibration: fit on one half of the region, hold out the other; the halves' distance
    // is the natural variation later generated textures are judged against.
    if (!record) fail(SCOPE, `${rel} has no licence record. Fix: record the scan with materials add --kind scan --license <licence> --by <who scanned it> first`, { code: "LICENSE_UNRECORDED" });
    if (!pxPerMm) fail(SCOPE, "a calibration profile needs params.pxPerMm (scanner dpi / 25.4)", { code: "OPTION_REQUIRED" });
    const [a, b] = textureStats.halves(params.roi);
    const fit = textureStats.measure(image, kind, { pxPerMm, roi: a }), held = textureStats.measure(image, kind, { pxPerMm, roi: b });
    const id = slug(options.name);
    if (procedural.builtinProfiles().profiles[id]) fail(SCOPE, `${id} is a built-in profile name. Fix: choose another --name`, { code: "OUTPUT_EXISTS" });
    const file = profileFile(project, id);
    if (fs.existsSync(file) && !options.replace) fail(SCOPE, `${MATERIALS_DIR}/calibration/${id}.json exists. Fix: pass --replace`, { code: "OUTPUT_EXISTS" });
    const profile = {
      schema: "design-pipeline.material-calibration-profile.v1",
      kind,
      description: options.title || record.title || rel,
      sample: { file: rel, sha256: record.sha256, license: record.license, source: record.source, sourceUrl: record.sourceUrl, author: record.author },
      pxPerMm, fitRoi: a, heldOutRoi: b, stats: fit, heldOut: held, natural: textureStats.distance(fit, held),
      measured: today(),
    };
    // Between: the nearest built-in sample of the same kind, per metric; the profile grades only
    // when the owner's sheet is clearly more like itself than like another real sheet.
    const metrics = kind === "halftone" ? ["offLattice"] : ["spectralDb", "histogramL"], others = [];
    for (const [otherId, other] of Object.entries(procedural.builtinProfiles().profiles)) {
      if (other.kind !== kind) continue;
      const d = textureStats.distance(fit, other.stats);
      if (d.comparable && metrics.every((m) => Number.isFinite(d[m]))) others.push({ id: otherId, ...Object.fromEntries(metrics.map((m) => [m, d[m]])) });
    }
    profile.between = others.length ? Object.fromEntries(metrics.map((m) => [m, Math.min(...others.map((o) => o[m]))])) : null;
    profile.grading = textureStats.calibration(kind, profile.natural, profile.between);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(profile, null, 2)}\n`);
    Object.assign(out, { status: "calibrated", profile: { id, file: `${MATERIALS_DIR}/calibration/${id}.json`, natural: profile.natural, between: profile.between, grading: profile.grading }, next: [kind === "halftone" ? `materials measure --file <generated halftone> --reference ${id}` : `materials generate --generator ${kind === "print" ? "print" : "paper"} --params '{"profile":"${id}","pxPerMm":4}' --seed 1`] });
  }
  const referenceId = options.reference || generated?.params?.profile || (kind === "halftone" && generated ? "autotype-1904" : null);
  if (referenceId && pxPerMm) Object.assign(out, similarityTo(project, stats, kind, referenceId));
  out.creativeAcceptance = "not-assessed";
  return out;
}

function listProfiles(project) {
  const builtin = procedural.builtinProfiles();
  const local = project && fs.existsSync(path.join(materialsDir(project), "calibration")) ? fs.readdirSync(path.join(materialsDir(project), "calibration")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [];
  return {
    builtin: Object.fromEntries(Object.entries(builtin.profiles).map(([id, p]) => [id, { kind: p.kind, description: p.description, pxPerMm: p.pxPerMm, source: p.sample?.sourceUrl, license: p.sample?.license, natural: p.natural?.spectralDb ?? p.natural?.offLattice }])),
    project: local,
  };
}

// ---- check ---------------------------------------------------------------------------------

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (MATERIAL_FILE.test(entry.name)) out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out.sort();
}

function checkMaterials(project) {
  const dir = materialsDir(project);
  if (!fs.existsSync(dir)) fail(SCOPE, `no ${MATERIALS_DIR}/ directory under ${project}. Fix: materials fetch or materials add first`, { code: "INPUT_MISSING" });
  const records = readRecords(dir), files = walk(dir), findings = [];
  const hashes = new Map();
  const hashOf = (rel) => {
    if (!hashes.has(rel)) hashes.set(rel, fs.existsSync(path.join(dir, rel)) ? sha256(fs.readFileSync(path.join(dir, rel))) : null);
    return hashes.get(rel);
  };
  for (const rel of files) {
    const record = records[rel];
    if (!record) {
      findings.push({ code: "material-unrecorded", severity: "error", file: rel, message: `${rel} has no licence record`, fix: `Record it: materials add --project-root ${project} --file ${MATERIALS_DIR}/${rel} --license <licence> --by <author> [--url <source page>], or delete the file` });
      continue;
    }
    if (!record.license || record.license === "unrecorded") findings.push({ code: "material-license-missing", severity: "error", file: rel, message: `${rel} has no licence`, fix: `Set the licence from the source's own rights field (materials add --project-root ${project} --replace --license ...)` });
    const missing = PROVENANCE_FIELDS.filter((field) => !record[field]);
    if (missing.length) findings.push({ code: "material-provenance-incomplete", severity: "error", file: rel, message: `${rel} is missing ${missing.join(", ")}`, fix: `Re-record with materials add --project-root ${project} --replace and supply ${missing.join(", ")}` });
    if (record.generator) {
      const g = record.generator, missingG = ["name", "version", "seed", "params"].filter((key) => g[key] === undefined);
      if (missingG.length) findings.push({ code: "material-generator-incomplete", severity: "error", file: rel, message: `${rel} records a generator without ${missingG.join(", ")}, so it cannot be reproduced`, fix: "Regenerate it with materials generate (which records name, version, params and seed) and --replace" });
      else if (procedural.GENERATORS[g.name] !== g.version) findings.push({ code: "material-generator-version", severity: "warn", file: rel, message: `${rel} was made by ${g.name}@${g.version}; the current generator is ${procedural.GENERATORS[g.name] ?? "gone"}, so a replay may not give the same bytes`, fix: `Keep the file (its bytes are recorded), or regenerate: materials generate --project-root ${project} --generator ${g.name} --params '${JSON.stringify(g.params)}' --seed ${g.seed} --name ${path.basename(rel, path.extname(rel))} --replace` });
    }
    for (const used of Array.isArray(record.calibration) ? record.calibration : []) {
      const current = /^[a-z0-9-]+$/.test(String(used.id)) ? profileDigest(project, used.id) : null, now = current && current.origin === used.origin ? current.sha256 : null;
      if (now === used.sha256) continue;
      const again = record.generator
        ? `materials generate --project-root ${project} --generator ${record.generator.name} --params '${JSON.stringify(record.generator.params)}' --seed ${record.generator.seed} --name ${path.basename(rel, path.extname(rel))} --replace`
        : record.derivedFrom?.operation === "process" ? `materials process --project-root ${project} --file ${MATERIALS_DIR}/${record.derivedFrom.file} --effect ${record.derivedFrom.effect} --seed ${record.derivedFrom.seed} --params '${JSON.stringify(record.derivedFrom.params)}' --name ${path.basename(rel, ".png")} --replace` : "re-make it";
      findings.push({ code: "material-calibration-stale", severity: "error", file: rel, message: `${rel} was made from calibration profile ${used.id}, which ${now ? "has changed" : "is gone"}`, fix: now ? `Regenerate with the current profile: ${again}` : `Restore ${used.file}, or ${again} with another profile` });
    }
    if (record.sha256 && hashOf(rel) !== record.sha256 && !record.derivedFrom) findings.push({ code: "material-changed", severity: "error", file: rel, message: `${rel} no longer matches its recorded hash`, fix: `If the edit is intended, re-record it with materials add --project-root ${project} --replace; then re-cut its pieces` });
    if (record.kind === "generated" && !record.derivedFrom) {
      const g = record.generatedBy, task = g?.task, prompt = g?.prompt;
      const taskFile = task ? path.join(dir, task.file) : null, promptFile = prompt ? path.join(dir, prompt.file) : null;
      if (!g || !task || !prompt || !fs.existsSync(taskFile) || !fs.existsSync(promptFile)) findings.push({ code: "material-task-missing", severity: "error", file: rel, message: `${rel} is a generated image without its task sheet${task ? ` (${task.file} or ${prompt?.file} is gone)` : ""}`, fix: `Restore the sheet, or write one with materials request --project-root ${project} --template <id> and re-record: materials add --project-root ${project} --file ${MATERIALS_DIR}/${rel} --kind generated --tool <tool> --prompt ${MATERIALS_DIR}/${REQUESTS_DIR}/<name>.md --license <terms> --by <who> --replace` });
      else if (sha256(fs.readFileSync(taskFile)) !== task.sha256 || sha256(fs.readFileSync(promptFile)) !== prompt.sha256) findings.push({ code: "material-task-changed", severity: "error", file: rel, message: `the task sheet ${prompt.file} changed after ${rel} was recorded against it`, fix: `If the image was made from the new sheet, re-record it with materials add --replace; otherwise restore the sheet the image was made from` });
    }
    if (record.derivedFrom?.operation === "composite") {
      const stale = [], gone = [];
      for (const input of record.derivedFrom.inputs || []) {
        const now = hashOf(input.file);
        if (!now || !records[input.file]) gone.push(input.file); else if (now !== input.sha256) stale.push(input.file);
      }
      const receipt = path.join(path.dirname(path.join(dir, rel)), "composite.json");
      const again = fs.existsSync(receipt) ? readJson(receipt, "composite receipt").command : `materials composite --project-root ${project} --template ${record.derivedFrom.template} --replace`;
      if (!gone.length && !stale.length && (record.derivedFrom.contractSha256 || record.derivedFrom.integrationSha256)) {
        let now = null;
        try { const bank = templateBank(), manifest = bank.loadManifest(record.derivedFrom.template); now = manifest.layers ? compositeDigests(manifest, bank.loadStyle(manifest.style), record.derivedFrom.mode) : null; } catch { now = null; }
        const changed = !now ? ["the template or its layer contract is gone"] : [
          ...(now.contractSha256 !== record.derivedFrom.contractSha256 ? [`the layer contract of ${record.derivedFrom.template} changed`] : []),
          ...(now.integrationSha256 !== record.derivedFrom.integrationSha256 ? [`the style pack's ${record.derivedFrom.mode} integration changed`] : []),
        ];
        if (changed.length) stale.push(...changed);
      }
      if (gone.length) findings.push({ code: "material-derived-orphan", severity: "error", file: rel, message: `${rel} was composited from ${gone.join(", ")}, which ${gone.length > 1 ? "are" : "is"} gone or unrecorded`, fix: `Restore and record ${gone.join(", ")}, or composite again with other layers` });
      else if (stale.length) findings.push({ code: "material-derived-stale", severity: "error", file: rel, message: `${rel} is stale: ${stale.map((v) => (v.includes(" ") ? v : `${v} changed`)).join("; ")}`, fix: `Composite again: ${again}` });
      if (record.sha256 && hashOf(rel) !== record.sha256) findings.push({ code: "material-changed", severity: "warn", file: rel, message: `${rel} was edited after compositing`, fix: `Composite again (${again}) instead of retouching an output; retouch a layer and re-record it` });
      continue;
    }
    if (record.derivedFrom) {
      const parent = records[record.derivedFrom.file];
      const parentHash = hashOf(record.derivedFrom.file);
      if (!parent || !parentHash) findings.push({ code: "material-derived-orphan", severity: "error", file: rel, message: `${rel} comes from ${record.derivedFrom.file}, which is gone or unrecorded`, fix: `Restore and record ${record.derivedFrom.file}, or delete ${rel}` });
      else if (parentHash !== record.derivedFrom.sha256) {
        const made = record.derivedFrom.operation === "process" ? "processed" : "cut";
        const again = record.derivedFrom.operation === "process"
          ? `Process again: materials process --project-root ${project} --file ${MATERIALS_DIR}/${record.derivedFrom.file} --effect ${record.derivedFrom.effect} --seed ${record.derivedFrom.seed} --params '${JSON.stringify(record.derivedFrom.params)}' --name ${path.basename(rel, ".png")} --replace`
          : `Cut again: materials cut --project-root ${project} --file ${MATERIALS_DIR}/${record.derivedFrom.file} --mode ${record.derivedFrom.mode} --replace`;
        findings.push({ code: "material-derived-stale", severity: "error", file: rel, message: `${rel} was ${made} from an earlier version of ${record.derivedFrom.file}`, fix: again });
      }
      else if (parent.license !== record.license) findings.push({ code: "material-license-mismatch", severity: "error", file: rel, message: `${rel} records ${record.license} but its source records ${parent.license}`, fix: "Derived pieces carry their source's licence; cut again with --replace" });
      if (record.sha256 && hashOf(rel) !== record.sha256) findings.push({ code: "material-changed", severity: "warn", file: rel, message: `${rel} was edited after cutting`, fix: "Fine for hand retouching; note it in the record's notes so the piece is not re-cut over the retouch" });
    }
  }
  for (const rel of Object.keys(records)) if (!files.includes(rel)) findings.push({ code: "material-record-orphan", severity: "warn", file: rel, message: `${rel} is recorded but the file is missing`, fix: "Delete the stale record or restore the file" });
  const failed = findings.some((finding) => finding.severity === "error");
  return {
    schema: "design-pipeline.materials-check.v1",
    status: failed ? "failed" : "passed",
    materials: files.length,
    licenses: [...new Set(files.map((rel) => records[rel]?.license || "unrecorded"))].sort(),
    findings,
    creativeAcceptance: "not-assessed",
  };
}

// ---- network adapters (async; run inside the fetch-materials kernel) -----------------------

class SourceError extends Error {
  constructor(status, message, httpStatus) {
    super(message);
    this.status = status;
    this.httpStatus = httpStatus;
  }
}

// A bot challenge is an HTML page (Cloudflare, Incapsula); a JSON record that mentions "captcha" is content.
function isChallenge(body) {
  return /^\s*</.test(body) && /just a moment|cf-chl|_incapsula_resource|captcha/i.test(body);
}

function classify(httpStatus, body = "") {
  if (httpStatus >= 200 && httpStatus < 400) return isChallenge(body) ? "blocked" : "reachable";
  if (httpStatus === 429) return "rate-limited";
  if (httpStatus === 401 || ((httpStatus === 403 || httpStatus === 400) && /api_key_missing|api[ _]key/i.test(body))) return "needs-key";
  if (httpStatus === 410) return "retired";
  if (httpStatus === 403) return "blocked";
  if (httpStatus === 404) return "not-found";
  return "error";
}

function httpClient(fetchImpl = globalThis.fetch) {
  const request = async (url, headers = {}) => {
    let response;
    try {
      response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, ...headers }, redirect: "follow" });
    } catch (error) {
      throw new SourceError("unreachable", `${url}: ${error.cause?.code || error.message}`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SourceError(classify(response.status, body), `${url}: HTTP ${response.status} ${body.slice(0, 120).replace(/\s+/g, " ")}`, response.status);
    }
    return response;
  };
  return {
    // Read text first: a challenge page answers 200 with HTML, which must report blocked, not a JSON SyntaxError.
    json: async (url, headers) => {
      const response = await request(url, { Accept: "application/json", ...headers });
      const body = await response.text();
      if (isChallenge(body)) throw new SourceError("blocked", `${url}: HTTP ${response.status} bot challenge page instead of data`, response.status);
      try { return JSON.parse(body); } catch { throw new SourceError("error", `${url}: HTTP ${response.status} answered non-JSON: ${body.slice(0, 80).replace(/\s+/g, " ")}`, response.status); }
    },
    bytes: async (url) => Buffer.from(await (await request(url)).arrayBuffer()),
    status: async (url) => {
      try {
        const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
        const body = (await response.text().catch(() => "")).slice(0, 4096);
        return { httpStatus: response.status, status: classify(response.status, body) };
      } catch (error) {
        return { httpStatus: null, status: "unreachable", error: error.cause?.code || error.message };
      }
    },
  };
}

const RIJKS_OPEN = /^https?:\/\/creativecommons\.org\/publicdomain\/(zero|mark)\/1\.0\/?$/i;

// Anchored allow-list for Commons LicenseShortName: CC0, "Public domain" (optionally "mark" or a
// jurisdiction such as "in the United States"), or a PD-* template. Trademark and logo templates
// (PD-textlogo, PD-trademark) say the copyright is void, not that the mark may be reused: refused.
function commonsLicense(short) {
  const value = String(short).trim();
  if (/^cc0(\s|$|-)/i.test(value) || /^cc0$/i.test(value)) return "CC0";
  if (/^pd-/i.test(value)) return /textlogo|trademark|logo|shape|insignia/i.test(value) ? value : "public-domain";
  if (/^public domain( mark( 1\.0)?| in [a-z .]+)?$/i.test(value)) return "public-domain";
  return value;
}

const firstText = (value) => (Array.isArray(value) ? value.map(firstText).find(Boolean) : typeof value === "string" ? value : null);

function findStatement(node) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const item of node) { const hit = findStatement(item); if (hit) return hit; } return null; }
  for (const item of node.referred_to_by || []) if (typeof item.content === "string" && !/^https?:/.test(item.content)) return item.content;
  for (const key of ["part", "carried_out_by"]) { const hit = findStatement(node[key]); if (hit) return hit; }
  return null;
}

const ADAPTERS = {
  cleveland: {
    async search(http, query, limit) {
      const data = await http.json(`https://openaccess-api.clevelandart.org/api/artworks/?${new URLSearchParams({ q: query, cc0: "1", has_image: "1", limit: String(limit) })}`);
      return (data.data || []).map((item) => ADAPTERS.cleveland.normalize(item));
    },
    async object(http, id) {
      const data = (await http.json(`https://openaccess-api.clevelandart.org/api/artworks/${encodeURIComponent(id)}`))?.data;
      if (!data || typeof data !== "object") throw new SourceError("error", `cleveland ${id}: no artwork record`);
      return ADAPTERS.cleveland.normalize(data);
    },
    normalize(item) {
      const image = item.images?.print || item.images?.web || null;
      const sizes = ["web", "print", "full"].map((key) => item.images?.[key]).filter((entry) => entry?.url).map((entry) => ({ url: entry.url, longSide: Math.max(Number(entry.width) || 0, Number(entry.height) || 0) }));
      return {
        id: String(item.id), title: item.title, author: item.creators?.[0]?.description || "unknown", date: item.creation_date || null,
        pageUrl: item.url, imageUrl: image?.url || null, imageSize: image ? `${image.width}x${image.height}` : null, sizes,
        license: item.share_license_status === "CC0" ? "CC0" : String(item.share_license_status || "unknown"),
        licenseEvidence: `share_license_status=${item.share_license_status}`,
      };
    },
  },
  met: {
    async search(http, query, limit) {
      const data = await http.json(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?${new URLSearchParams({ q: query, hasImages: "true", isPublicDomain: "true" })}`);
      const out = [];
      for (const id of (data.objectIDs || []).slice(0, limit)) {
        try { out.push(await ADAPTERS.met.object(http, id)); } catch (error) { if (error.status !== "error") throw error; }
      }
      return out;
    },
    async object(http, id) {
      const item = await http.json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${encodeURIComponent(id)}`);
      return {
        id: String(item.objectID), title: item.title, author: item.artistDisplayName || "unknown maker", date: item.objectDate || null,
        pageUrl: item.objectURL, imageUrl: item.primaryImage || item.primaryImageSmall || null, imageSize: null,
        license: item.isPublicDomain === true ? "CC0" : "not-public-domain",
        licenseEvidence: `isPublicDomain=${item.isPublicDomain}`,
      };
    },
  },
  rijksmuseum: {
    async search(http, query, limit) {
      const data = await http.json(`https://data.rijksmuseum.nl/search/collection?${new URLSearchParams({ description: query, imageAvailable: "true" })}`, { Accept: "application/ld+json" });
      const out = [];
      for (const item of (data.orderedItems || []).slice(0, limit)) out.push(await ADAPTERS.rijksmuseum.object(http, item.id.split("/").pop()));
      return out;
    },
    async object(http, id) {
      const item = await http.json(`https://id.rijksmuseum.nl/${encodeURIComponent(id)}`, { Accept: "application/ld+json" });
      let imageUrl = null, rights = null, pageUrl = null;
      for (const subject of item.subject_of || []) for (const carrier of subject.digitally_carried_by || []) {
        const point = carrier.access_point?.[0]?.id;
        if (point && /iiif/.test(point) && !imageUrl) {
          imageUrl = point;
          const statements = (carrier.referred_to_by || []).map((entry) => entry.content).filter((value) => typeof value === "string");
          rights = statements.find((value) => RIJKS_OPEN.test(value.trim())) || firstText(statements);
        }
        if (point && carrier.format === "text/html" && !pageUrl) pageUrl = point;
      }
      const names = (item.identified_by || []).filter((entry) => entry.type === "Name").map((entry) => entry.content);
      // Only an exact Creative Commons public-domain URL counts; text that merely mentions one does not.
      const match = RIJKS_OPEN.exec((rights || "").trim());
      const license = match ? (match[1] === "zero" ? "CC0" : "PDM") : rights || "unknown";
      return {
        id: String(id), title: names[0] || id, author: findStatement(item.produced_by) || "unknown", date: null,
        pageUrl: pageUrl || item.id, imageUrl, imageSize: null, license, licenseEvidence: `image rights=${rights}`,
      };
    },
  },
  wikimedia: {
    async search() {
      throw new SourceError("rate-limited", "Commons search is not automated here (list=search answers 429). Fix: find the exact File: name in a browser and use materials fetch --source wikimedia --id 'File:<name>'");
    },
    async object(http, id, width = 1200) {
      const title = id.startsWith("File:") ? id : `File:${id}`;
      const data = await http.json(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: String(width), format: "json" })}`);
      const page = Object.values(data.query?.pages || {})[0];
      const info = page?.imageinfo?.[0];
      if (!info) throw new SourceError("error", `${title}: no such file on Commons`);
      const meta = info.extmetadata || {}, value = (key) => (meta[key]?.value ? String(meta[key].value).replace(/<[^>]+>/g, "").trim() : null);
      const short = value("LicenseShortName") || "unknown";
      const license = commonsLicense(short);
      // Restrictions (trademarked, personality rights, insignia...) limit reuse whatever the copyright status.
      const restrictions = value("Restrictions");
      return {
        id: page.title, title: value("ObjectName") || page.title, author: value("Artist") || "unknown", date: value("DateTimeOriginal"),
        pageUrl: info.descriptionurl, imageUrl: info.thumburl || info.url, imageSize: info.thumbwidth ? `${info.thumbwidth}x${info.thumbheight}` : null,
        license, licenseEvidence: `LicenseShortName=${short}${restrictions ? `; Restrictions=${restrictions}` : ""}`,
        ...(restrictions ? { restrictions } : {}),
      };
    },
  },
};

function automated(sourceId) {
  const source = sourceById(sourceId);
  if (!source.adapter) {
    throw new SourceError(source.reachability.status, `${source.name} is ${source.reachability.status} here (${source.reachability.evidence}). Fix: ${source.fix}`);
  }
  return { source, adapter: ADAPTERS[source.adapter] };
}

async function searchSources({ query, sources, limit = 5, http = httpClient() }) {
  if (!query) fail(SCOPE, "--query is required (comma-separate several terms)", { code: "OPTION_REQUIRED" });
  const terms = String(query).split(",").map((term) => term.trim()).filter(Boolean);
  const ids = sources?.length ? sources : loadRegistry().sources.filter((source) => source.adapter && source.reachability.status === "reachable").map((source) => source.id);
  const results = [], unavailable = [];
  for (const id of ids) for (const term of terms) {
    try {
      const { source, adapter } = automated(id);
      for (const item of await adapter.search(http, term, limit)) results.push({ source: source.id, term, ...item, licenseOpen: isOpenLicense(item.license) });
    } catch (error) {
      if (!(error instanceof SourceError)) throw error;
      unavailable.push({ source: id, term, status: error.status, message: error.message, fix: sourceById(id).fix || "Retry later; if it persists, record the source as unavailable and use another one." });
    }
  }
  return {
    status: results.length ? "found" : unavailable.length ? "blocked" : "empty",
    terms,
    candidates: results,
    unavailable,
    next: results.length ? ["Fetch the chosen candidates: materials fetch --project-root <dir> --source <source> --id <id> [--use <purpose>]"] : ["Try other terms or sources; unavailable sources say why and what to do."],
  };
}

function slug(value) {
  return String(value).toLowerCase().replace(/^file:/, "").replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
}

function imageForWidth(url, width) {
  // IIIF servers scale on request; ask for the size we keep instead of the full master.
  return /\/full\/max\/0\/default\.jpg$/.test(url) ? url.replace("/full/max/", `/full/${width},/`) : url;
}

async function fetchMaterial({ project, sourceId, id, use, name, width = 1200, region, replace = false, http = httpClient(), ffmpeg = "ffmpeg" }) {
  if (!id) fail(SCOPE, "--id is required", { code: "OPTION_REQUIRED" });
  if (region !== undefined && (!Array.isArray(region) || region.length !== 4 || region.some((v) => !Number.isInteger(v) || v < 0) || region[2] < 64 || region[3] < 64 || region[2] > 4096 || region[3] > 4096)) {
    fail(SCOPE, "params.region must be [x, y, width, height] in the master image's pixels, each side 64 to 4096", { code: "OPTION_VALUE_INVALID" });
  }
  // A region is kept at native resolution: the point is the detail, not a downscaled overview.
  if (region) width = Math.max(region[2], region[3]);
  if (!Number.isInteger(width) || width < 64 || width > 4096) fail(SCOPE, "--width must be an integer from 64 to 4096 (the longest side kept)", { code: "OPTION_VALUE_INVALID" });
  const dir = materialsDir(project), records = readRecords(dir);
  let source, adapter;
  try { ({ source, adapter } = automated(sourceId)); } catch (error) {
    if (error instanceof SourceError) return { status: "blocked", source: sourceId, reason: error.status, message: error.message };
    throw error;
  }
  let item;
  try { item = await adapter.object(http, id, width); } catch (error) {
    if (error instanceof SourceError) return { status: "blocked", source: sourceId, reason: error.status, message: error.message, fix: source.fix || "Retry later or pick another source; do not work around blocks or rate limits." };
    throw error;
  }
  if (!isOpenLicense(item.license)) {
    return { status: "refused", source: sourceId, id: item.id, license: item.license, licenseEvidence: item.licenseEvidence, message: `${item.title} is ${item.license}, not CC0 or public domain`, fix: "Pick a CC0 / public-domain object; attribution or non-commercial licences are not fetched automatically" };
  }
  if (item.restrictions) {
    return { status: "refused", source: sourceId, id: item.id, license: item.license, restrictions: item.restrictions, licenseEvidence: item.licenseEvidence, message: `${item.title} is ${item.license} but carries restrictions: ${item.restrictions}`, fix: "Pick a file without restrictions; if the owner has cleared this use, download it and record it with materials add --license <licence> --by <author> (commercialUse stays false unless --commercial-use)" };
  }
  if (!item.imageUrl) return { status: "refused", source: sourceId, id: item.id, message: "the record has no downloadable image", fix: "Pick another object" };
  // A region is a native-resolution detail (paper tooth, a halftone screen) cut by the IIIF server.
  if (region && !/\/full\/max\/0\/default\.jpg$/.test(item.imageUrl)) {
    return { status: "refused", source: sourceId, id: item.id, message: `${source.id} has no IIIF image service, so a native-resolution region cannot be requested`, fix: "Fetch the whole image (largest --width) and measure a region with params.roi, or use a IIIF source such as rijksmuseum" };
  }
  const rel = `raw/${name ? slug(name) : `${source.id}-${slug(item.id)}${region ? `-r${region.join("-")}` : ""}`}.png`;
  const target = path.join(dir, rel);
  if (fs.existsSync(target) && !replace) fail(SCOPE, `${MATERIALS_DIR}/${rel} exists. Fix: pass --replace or --name <other>`, { code: "OUTPUT_EXISTS" });
  // Download the smallest published size that still covers the kept width.
  const covering = (item.sizes || []).filter((size) => size.longSide >= width).sort((a, b) => a.longSide - b.longSide)[0];
  const fileUrl = region ? item.imageUrl.replace("/full/max/", `/${region.join(",")}/max/`) : covering ? covering.url : imageForWidth(item.imageUrl, width);
  let bytes;
  try { bytes = await http.bytes(fileUrl); } catch (error) {
    if (error instanceof SourceError) return { status: "blocked", source: sourceId, reason: error.status, message: error.message, fix: "The metadata answered but the image host did not; retry later or download it in a browser and use materials add" };
    throw error;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const download = path.join(path.dirname(target), `.${path.basename(target)}.download`);
  fs.writeFileSync(download, bytes);
  try {
    // Convert to PNG (the cutting route reads PNG) and keep at most `width` on the longest side.
    const scale = `scale='if(gt(iw,ih),min(${width},iw),-2)':'if(gt(iw,ih),-2,min(${width},ih))'`;
    const run = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", download, "-vf", scale, "-frames:v", "1", "-pix_fmt", "rgb24", target], { encoding: "utf8" });
    if (run.error || run.status !== 0) fail(SCOPE, `ffmpeg could not convert ${fileUrl}: ${run.error?.message || run.stderr}. Fix: install ffmpeg on PATH`, { code: "TOOL_MISSING" });
  } finally {
    fs.rmSync(download, { force: true });
  }
  const record = {
    license: item.license,
    commercialUse: true,
    kind: "image",
    source: source.id,
    sourceId: item.id,
    title: item.title,
    author: item.author,
    ...(item.date ? { date: item.date } : {}),
    sourceUrl: item.pageUrl,
    fileUrl,
    licenseEvidence: item.licenseEvidence,
    retrieved: today(),
    ...(region ? { region } : {}),
    ...(use ? { use } : {}),
    downloadedBytes: bytes.length,
    ...fileFacts(target),
  };
  records[rel] = record;
  writeRecords(dir, records);
  return { status: "fetched", file: `${MATERIALS_DIR}/${rel}`, record, next: [nextCut(project, rel)] };
}

// One status per source from its probed routes: the search route decides, except that a
// rate-limited search with a working by-name route stays usable, and a site without an API is html-only.
function summarize(routes) {
  const search = routes.search?.status;
  if (search === "reachable") return "reachable";
  if (search === "rate-limited" && routes.object?.status === "reachable") return "rate-limited";
  if ((search === "not-found" || search === undefined) && routes.site?.status === "reachable") return "html-only";
  return search || Object.values(routes)[0]?.status || "unknown";
}

async function probeSources({ http = httpClient(), sources } = {}) {
  const registry = loadRegistry(), checkedAt = today(), out = [];
  for (const id of sources || []) sourceById(id);
  for (const source of registry.sources.filter((entry) => !sources?.length || sources.includes(entry.id))) {
    const routes = {};
    for (const [route, url] of Object.entries(source.probes || {})) routes[route] = { url, ...(await http.status(url)) };
    const measured = summarize(routes), recorded = source.reachability.status;
    // An intermittent rate limit answers either way on a single probe; only another status is drift.
    const drift = source.reachability.intermittent ? !["reachable", "rate-limited"].includes(measured) : measured !== recorded;
    out.push({ id: source.id, recorded, measured, drift, ...(source.reachability.intermittent ? { intermittent: true } : {}), routes });
  }
  // Every route failing at the network level says nothing about the sources: the environment is offline.
  if (out.every((entry) => Object.values(entry.routes).every((route) => route.status === "unreachable"))) {
    return {
      status: "unreachable-env",
      checkedAt,
      sources: out,
      next: ["No route answered at the network level (DNS, proxy or offline). Fix the network and probe again; the registry is unchanged and must not be edited from this result."],
    };
  }
  return {
    status: out.some((entry) => entry.drift) ? "drift" : "matches",
    checkedAt,
    sources: out,
    next: out.some((entry) => entry.drift) ? ["Update reachability in references/material-sources.json with the measured status, date and evidence (through an OpenSpec change)."] : ["Recorded reachability still holds."],
  };
}

module.exports = {
  ADAPTERS, MATERIALS_DIR, OPEN_LICENSES, SourceError, summarize,
  addMaterial, checkMaterials, classify, compositeMaterial, cutMaterial, fetchMaterial, generateMaterial, httpClient, isOpenLicense, licenseOf, listProfiles, listSources, loadRegistry, measureMaterial, probeSources, processMaterial, readRecords, requestMaterial, replayMaterial, searchSources, writeRecords,
};
