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

const SCOPE = "materials";
const REGISTRY = path.resolve(__dirname, "../references/material-sources.json");
const MATERIALS_DIR = "materials";
const RECORDS = "licenses.json";
const USER_AGENT = "design-pipeline-materials/1.0 (https://github.com/2233admin/design-pipeline; low volume)";
const OPEN_LICENSES = new Set(["CC0", "PDM", "public-domain"]);
const KINDS = new Set(["image", "font", "scan", "photo", "texture", "other"]);
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
    next: ["Re-measure with `materials sources --probe`; search the automated sources with `materials search --query \"key,butterfly\"`."],
  };
}

// ---- licence records (shared with film-edit) ------------------------------------------------

function readRecords(dir) {
  const file = path.join(dir, RECORDS);
  if (!fs.existsSync(file)) return {};
  const records = readJson(file, "material licenses");
  if (!records || typeof records !== "object" || Array.isArray(records)) fail(SCOPE, `${RECORDS} must be an object keyed by file`, { code: "CONTRACT_INVALID" });
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
  const record = {
    license: options.license,
    commercialUse: options.commercialUse ?? isOpenLicense(options.license),
    kind,
    source: options.source || "owner-supplied",
    sourceUrl: options.sourceUrl || "owner-supplied",
    author: options.author,
    retrieved: options.retrieved || today(),
    ...(options.title ? { title: options.title } : {}),
    ...(options.use ? { use: options.use } : {}),
    ...fileFacts(path.join(dir, rel)),
  };
  records[rel] = record;
  writeRecords(dir, records);
  return { status: "recorded", file: `${MATERIALS_DIR}/${rel}`, record, next: [nextCut(project, rel)] };
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
      sha256: sha256(bytes), width: output.image.width, height: output.image.height,
      derivedFrom: { file: rel, sha256: result.input.sha256, finish: output.finish, ...(output.piece !== undefined ? { piece: output.piece } : {}), placement: output.placement, ...operation },
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
    visualAcceptance: "not-assessed",
    next: ["Look at every piece at its use size before placing it: the measurements flag likely dirty mattes, they do not prove a clean one."],
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
      findings.push({ code: "material-unrecorded", severity: "error", file: rel, message: `${rel} has no licence record`, fix: `Record it: materials add --file ${MATERIALS_DIR}/${rel} --license <licence> --by <author> [--url <source page>], or delete the file` });
      continue;
    }
    if (!record.license || record.license === "unrecorded") findings.push({ code: "material-license-missing", severity: "error", file: rel, message: `${rel} has no licence`, fix: "Set the licence from the source's own rights field (materials add --replace --license ...)" });
    const missing = PROVENANCE_FIELDS.filter((field) => !record[field]);
    if (missing.length) findings.push({ code: "material-provenance-incomplete", severity: "error", file: rel, message: `${rel} is missing ${missing.join(", ")}`, fix: `Re-record with materials add --replace and supply ${missing.join(", ")}` });
    if (record.sha256 && hashOf(rel) !== record.sha256 && !record.derivedFrom) findings.push({ code: "material-changed", severity: "error", file: rel, message: `${rel} no longer matches its recorded hash`, fix: "If the edit is intended, re-record it with materials add --replace; then re-cut its pieces" });
    if (record.derivedFrom) {
      const parent = records[record.derivedFrom.file];
      const parentHash = hashOf(record.derivedFrom.file);
      if (!parent || !parentHash) findings.push({ code: "material-derived-orphan", severity: "error", file: rel, message: `${rel} comes from ${record.derivedFrom.file}, which is gone or unrecorded`, fix: `Restore and record ${record.derivedFrom.file}, or delete ${rel}` });
      else if (parentHash !== record.derivedFrom.sha256) findings.push({ code: "material-derived-stale", severity: "error", file: rel, message: `${rel} was cut from an earlier version of ${record.derivedFrom.file}`, fix: `Cut again: materials cut --file ${MATERIALS_DIR}/${record.derivedFrom.file} --mode ${record.derivedFrom.mode} --replace` });
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

function classify(httpStatus, body = "") {
  const challenge = /just a moment|cf-chl|_incapsula_resource|captcha/i.test(body);
  if (httpStatus >= 200 && httpStatus < 400) return challenge ? "blocked" : "reachable";
  if (httpStatus === 429) return "rate-limited";
  if (httpStatus === 401 || /api_key_missing|api key/i.test(body)) return "needs-key";
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
    json: async (url, headers) => (await request(url, { Accept: "application/json", ...headers })).json(),
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
      return ADAPTERS.cleveland.normalize((await http.json(`https://openaccess-api.clevelandart.org/api/artworks/${encodeURIComponent(id)}`)).data);
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
        if (point && /iiif/.test(point) && !imageUrl) { imageUrl = point; rights = firstText((carrier.referred_to_by || []).map((entry) => entry.content)); }
        if (point && carrier.format === "text/html" && !pageUrl) pageUrl = point;
      }
      const names = (item.identified_by || []).filter((entry) => entry.type === "Name").map((entry) => entry.content);
      const license = /publicdomain\/zero/.test(rights || "") ? "CC0" : /publicdomain\/mark/.test(rights || "") ? "PDM" : rights || "unknown";
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
      const license = /^cc0/i.test(short) ? "CC0" : /public domain|^pd\b|^pd-/i.test(short) ? "public-domain" : short;
      return {
        id: page.title, title: value("ObjectName") || page.title, author: value("Artist") || "unknown", date: value("DateTimeOriginal"),
        pageUrl: info.descriptionurl, imageUrl: info.thumburl || info.url, imageSize: info.thumbwidth ? `${info.thumbwidth}x${info.thumbheight}` : null,
        license, licenseEvidence: `LicenseShortName=${short}`,
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
    status: results.length ? "found" : "empty",
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

async function fetchMaterial({ project, sourceId, id, use, name, width = 1200, replace = false, http = httpClient(), ffmpeg = "ffmpeg" }) {
  if (!id) fail(SCOPE, "--id is required", { code: "OPTION_REQUIRED" });
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
  if (!item.imageUrl) return { status: "refused", source: sourceId, id: item.id, message: "the record has no downloadable image", fix: "Pick another object" };
  const rel = `raw/${name ? slug(name) : `${source.id}-${slug(item.id)}`}.png`;
  const target = path.join(dir, rel);
  if (fs.existsSync(target) && !replace) fail(SCOPE, `${MATERIALS_DIR}/${rel} exists. Fix: pass --replace or --name <other>`, { code: "OUTPUT_EXISTS" });
  // Download the smallest published size that still covers the kept width.
  const covering = (item.sizes || []).filter((size) => size.longSide >= width).sort((a, b) => a.longSide - b.longSide)[0];
  const fileUrl = covering ? covering.url : imageForWidth(item.imageUrl, width);
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
  for (const source of registry.sources.filter((entry) => !sources?.length || sources.includes(entry.id))) {
    const routes = {};
    for (const [route, url] of Object.entries(source.probes || {})) routes[route] = { url, ...(await http.status(url)) };
    const measured = summarize(routes), recorded = source.reachability.status;
    // An intermittent rate limit answers either way on a single probe; only another status is drift.
    const drift = source.reachability.intermittent ? !["reachable", "rate-limited"].includes(measured) : measured !== recorded;
    out.push({ id: source.id, recorded, measured, drift, ...(source.reachability.intermittent ? { intermittent: true } : {}), routes });
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
  addMaterial, checkMaterials, classify, cutMaterial, fetchMaterial, httpClient, isOpenLicense, licenseOf, listSources, loadRegistry, probeSources, readRecords, searchSources, writeRecords,
};
