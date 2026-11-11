"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { fileURLToPath } = require("node:url");
const {
  canonicalJson,
  fail,
  isObject,
  sha256,
  sortValue,
} = require("./contract-utils.cjs");

const SNAPSHOT_SCHEMA = "design-pipeline.design-system-snapshot.v1";
const CATALOG_SCHEMA = "design-pipeline.design-system-catalog.v1";
const VERSION = "1";
const COLLECTIONS = Object.freeze({ components: "component", docs: "doc", templates: "template", hooks: "hook" });
const KINDS = Object.freeze(Object.values(COLLECTIONS));
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const LOCAL_ID = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const NAMESPACE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)?$/;
const RECORD_TYPES = new Set(["source", "component", "method", "template", "term"]);
// downloaded-implementation: the package carries the manifest and `sources fetch` installs the code
// (MengTo, iart; skill/scripts/vendor-cache.cjs); search returns the installed paths.
const AVAILABILITIES = new Set(["bundled-implementation", "downloaded-implementation", "reference-link", "metadata-only", "project-owned"]);
const LICENSE_STATES = new Set(["verified", "unverified", "commercial", "project-owned", "platform"]);
const LOCAL_PATH_MEMBERS = new Set(["guide", "manifest", "catalog", "implementation"]);

function invalid(message) {
  fail("design system catalog", message);
}

function ownObject(value, label) {
  if (!isObject(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    invalid(`${label} must be a plain object`);
  }
}

function safeClone(value, label = "value", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(`${label} contains a non-finite number`);
    return value;
  }
  if (typeof value !== "object") invalid(`${label} contains a non-JSON or executable value`);
  if (seen.has(value)) invalid(`${label} contains a cycle`);
  seen.add(value);
  let copy;
  if (Array.isArray(value)) {
    copy = value.map((item, index) => safeClone(item, `${label}[${index}]`, seen));
  } else {
    ownObject(value, label);
    copy = {};
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) invalid(`${label} contains forbidden key ${key}`);
      copy[key] = safeClone(value[key], `${label}.${key}`, seen);
    }
  }
  seen.delete(value);
  return copy;
}

function requireVersionedDocument(value, schema, label) {
  ownObject(value, label);
  if (value.schema !== schema) invalid(`unsupported ${label} schema ${String(value.schema)}`);
  if (value.version !== VERSION) invalid(`unsupported ${label} version ${String(value.version)}`);
  safeClone(value, label);
}

function validateRelativePath(value, label) {
  if (typeof value !== "string" || !value.trim()) invalid(`${label} must be a non-empty relative path`);
  const segments = value.split(/[\\/]/);
  if (path.win32.parse(value).root || path.posix.isAbsolute(value) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) || segments.includes("..") || value.includes("\0")) {
    invalid(`${label} must not escape its snapshot root`);
  }
}

function validatePaths(value, label) {
  if (Array.isArray(value)) return value.forEach((item, index) => validatePaths(item, `${label}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "localPaths") {
      ownObject(item, `${label}.localPaths`);
      for (const [member, candidate] of Object.entries(item)) {
        if (!LOCAL_PATH_MEMBERS.has(member)) invalid(`${label}.localPaths has unsupported member ${member}`);
        validateRelativePath(candidate, `${label}.localPaths.${member}`);
      }
    }
    else if (/paths?$/i.test(key)) {
      const paths = Array.isArray(item) ? item : [item];
      paths.forEach((candidate, index) => validateRelativePath(candidate, `${label}.${key}${Array.isArray(item) ? `[${index}]` : ""}`));
    }
    else validatePaths(item, `${label}.${key}`);
  }
}


// Internal build evidence, not a gate or a second catalog/schema.
function manifestInvalid(message) {
  fail("component manifest", message);
}

function manifestFile(root, value, label) {
  if (typeof value !== "string" || !value.trim()) manifestInvalid(label + " must name a project file");
  let candidate = value;
  if (value.startsWith("file:")) {
    try { candidate = fileURLToPath(value); } catch { manifestInvalid(label + " has an invalid file URL"); }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate) && !path.isAbsolute(candidate)) manifestInvalid(label + " must name a project file");
  const realRoot = fs.realpathSync(root);
  let realFile;
  try { realFile = fs.realpathSync(path.resolve(root, candidate)); }
  catch (error) {
    if (["ENOENT", "ENOTDIR", "EINVAL"].includes(error.code)) manifestInvalid(label + " must exist inside the project");
    throw error;
  }
  const relative = path.relative(realRoot, realFile);
  if (relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative) || !fs.statSync(realFile).isFile()) {
    manifestInvalid(label + " must be a file contained inside the project");
  }
  return realFile;
}

// First path segments on github.com that are GitHub pages, not repository owners.
const GITHUB_NON_OWNERS = new Set(["topics", "orgs", "sponsors", "marketplace", "settings", "features", "collections", "explore", "enterprise", "login", "apps", "users", "search"]);

function githubRepository(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.port || url.username || url.password || url.search || url.hash) return null;
    const match = url.pathname.match(/^\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)\/?$/i);
    if (!match || GITHUB_NON_OWNERS.has(match[1].toLowerCase())) return null;
    return (match[1] + "/" + match[2].replace(/\.git$/i, "")).toLowerCase();
  } catch { return null; }
}

function sourceRepositories(record) {
  return [record.provenance?.repository, record.provenance?.url, ...(record.aliases || [])].map(githubRepository).filter(Boolean);
}

// Web components decision sources in canonical stored order; scratch is exclusive.
const COMPONENT_SOURCES = Object.freeze(["project", "github", "index", "discover", "scratch"]);
// A discovered source may be copied or imported only when verified under one of these SPDX ids.
const PERMISSIVE_LICENSES = Object.freeze(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Zlib", "Unlicense", "CC0-1.0"]);
const PERMISSIVE_LIST = PERMISSIVE_LICENSES.slice(0, -1).join(", ") + " or " + PERMISSIVE_LICENSES.at(-1);

function httpsUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch { return null; }
}

// owner/repo of an https github.com URL without credentials, deep links included.
function githubRepositoryIn(value) {
  const url = httpsUrl(value);
  if (!url || url.hostname.toLowerCase() !== "github.com" || url.port) return null;
  const match = url.pathname.match(/^\/([a-z0-9_.-]+)\/([a-z0-9_.-]+)(?:\/|$)/i);
  return match && !GITHUB_NON_OWNERS.has(match[1].toLowerCase()) ? (match[1] + "/" + match[2].replace(/\.git$/i, "")).toLowerCase() : null;
}

// Indexed sourceIds whose recorded URLs or aliases point into this GitHub repository.
function indexedSourcesIn(records, repository) {
  return [...new Set(records
    .filter(record => [record.provenance?.url, record.provenance?.repository, ...(record.aliases || [])].map(githubRepositoryIn).includes(repository))
    .map(record => record.sourceId))].sort();
}

// Moving refs that never pin the checked license.
const MOVING_REVISIONS = new Set(["head", "main", "master"]);

// The git ref an evidence URL on the repository points at: the raw (undecoded) path segment right
// after blob, tree, raw, commit, releases/tag or archive, as in
// https://github.com/<owner>/<repo>/blob/<revision>/LICENSE. An encoded slash stays inside one segment.
function evidenceRef(value, repository) {
  if (githubRepositoryIn(value) !== repository) return null;
  const segments = new URL(value).pathname.split("/").slice(3);
  if (["blob", "tree", "raw", "commit"].includes(segments[0])) return segments[1] || null;
  if (segments[0] === "releases" && segments[1] === "tag") return segments[2] || null;
  if (segments[0] === "archive") {
    const ref = segments[1] === "refs" && segments[2] === "tags" ? segments[3] : segments[1];
    return ref?.replace(/\.(?:zip|tar\.gz)$/, "") || null;
  }
  return null;
}

function validateComponentManifest(manifest, { root, decision, componentSources } = {}) {
  if (!isObject(manifest) || !Array.isArray(manifest.entries)) manifestInvalid("entries must be an array");
  if (typeof root !== "string" || !root.trim()) manifestInvalid("root must name the project directory");
  if (typeof decision !== "string" || !decision.trim()) manifestInvalid("a recorded components decision is required");
  if (!Array.isArray(componentSources) || !componentSources.length
    || componentSources.some(value => !COMPONENT_SOURCES.includes(value))
    || componentSources.includes("scratch") && componentSources.length !== 1) manifestInvalid("a recorded componentSources set is required; scratch cannot be combined");
  if (manifest.fromScratch !== undefined && typeof manifest.fromScratch !== "boolean") manifestInvalid("fromScratch must be a boolean");
  const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, "../references/component-source-catalog.json"), "utf8"));
  const records = Object.keys(COLLECTIONS).flatMap(key => snapshot[key] || []);
  const fromScratch = manifest.fromScratch === true;
  if (componentSources.includes("scratch")) {
    if (!fromScratch) manifestInvalid("scratch choice requires explicit fromScratch: true");
  } else {
    if (fromScratch) manifestInvalid("fromScratch: true contradicts the recorded reuse or discovery componentSources");
    if (manifest.entries.length === 0) manifestInvalid("reuse or discovery componentSources require non-empty entries");
  }
  const nonempty = value => typeof value === "string" && Boolean(value.trim());
  const namedRepositories = (decision.match(/https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/?/gi) || []).map(githubRepository);
  for (const [index, entry] of manifest.entries.entries()) {
    const label = "entries[" + index + "]";
    if (!isObject(entry) || !nonempty(entry.name) || !AVAILABILITIES.has(entry.availability) || !LICENSE_STATES.has(entry.license?.state)) {
      manifestInvalid(label + " requires name, availability and license.state");
    }
    if (!nonempty(entry.sourceId) && !nonempty(entry.url)) manifestInvalid(label + " requires sourceId or url");
    let record;
    let projectOwned = false;
    let namedUrl = false;
    let discovered = false;
    if (nonempty(entry.sourceId)) {
      record = records.find(candidate => candidate.recordType === "source" && candidate.sourceId === entry.sourceId)
        || records.find(candidate => candidate.sourceId === entry.sourceId);
      if (!record) {
        manifestFile(root, entry.sourceId, label + ".sourceId");
        projectOwned = true;
      }
    } else {
      const repository = githubRepositoryIn(entry.url);
      if (repository && namedRepositories.includes(repository)) {
        if (githubRepository(entry.url) !== repository) manifestInvalid(label + ".url links inside the named GitHub repository " + repository + "; cite the repository URL https://github.com/" + repository);
        namedUrl = true;
        record = records.find(candidate => candidate.recordType === "source" && sourceRepositories(candidate).includes(repository));
        if (["project-owned", "platform"].includes(entry.license.state)) manifestInvalid(label + " GitHub source cannot claim project-owned/platform licensing");
      } else if (repository && indexedSourcesIn(records, repository).length) {
        // An indexed source keeps its recorded identity and license state, whichever of its URLs is cited.
        manifestInvalid(label + ".url matches the indexed source " + indexedSourcesIn(records, repository).join(", ") + ": cite it by sourceId, or by url only as a GitHub repository named in the components decision");
      } else if (repository && githubRepository(entry.url) === repository) {
        discovered = true;
      } else if (repository || /^[a-z][a-z0-9+.-]*:/i.test(entry.url) && !/^file:/i.test(entry.url) && !path.isAbsolute(entry.url)) {
        manifestInvalid(label + ".url must be a GitHub repository URL https://github.com/<owner>/<repo> or a project file");
      } else {
        manifestFile(root, entry.url, label + ".url");
        projectOwned = true;
      }
    }
    if (record?.availability === "project-owned" && record.license?.state === "project-owned") projectOwned = true;
    if (record && entry.license.state !== record.license?.state) manifestInvalid(label + ".license.state must match the indexed source");
    if (projectOwned && (entry.license.state !== "project-owned" || entry.availability !== "project-owned")) manifestInvalid(label + " project files require project-owned availability and license.state");
    if (fromScratch && !projectOwned) manifestInvalid(label + " external source contradicts fromScratch");
    // Each entry must come from a category the owner selected, judged by how it cites its source:
    // a decision-named GitHub url needs github; a contained file or the indexed project-components
    // record needs project; any other GitHub repository url is discovered and needs discover; every
    // other indexed sourceId, platform records included, needs index.
    if (!componentSources.includes("scratch")) {
      const category = namedUrl ? "github" : projectOwned ? "project" : discovered ? "discover" : "index";
      if (!componentSources.includes(category)) {
        manifestInvalid(label + " source category " + category + " is not in the recorded componentSources " + componentSources.join(",")
          + (category === "index" && componentSources.includes("github") ? "; cite a named GitHub repository by url instead of sourceId" : "")
          + (category === "discover" ? "; its url is not a GitHub repository named in the components decision, an indexed source or a project file" : ""));
      }
    }
    // A discovered source pins the revision whose license was checked and links that license on GitHub.
    let permissive = false;
    if (discovered) {
      const repository = githubRepository(entry.url);
      if (!["bundled-implementation", "reference-link", "metadata-only"].includes(entry.availability)) manifestInvalid(label + " discovered sources use availability bundled-implementation, reference-link or metadata-only");
      if (!["verified", "unverified", "commercial"].includes(entry.license.state)) manifestInvalid(label + " discovered sources use license.state verified, unverified or commercial, not project-owned or platform");
      if (!nonempty(entry.revision)) manifestInvalid(label + ".revision must pin the commit SHA or tag whose license was checked");
      const revision = entry.revision.trim();
      if (MOVING_REVISIONS.has(revision.toLowerCase())) manifestInvalid(label + ".revision must pin a commit SHA or tag, not the moving ref " + revision);
      if (entry.license.id !== undefined && !nonempty(entry.license.id)) manifestInvalid(label + ".license.id, when given, must be the SPDX license expression at that revision");
      if (!Array.isArray(entry.license.evidence) || !entry.license.evidence.length || !entry.license.evidence.every(httpsUrl)) {
        manifestInvalid(label + ".license.evidence must be a non-empty array of https URLs to the license text at that revision");
      }
      if (!entry.license.evidence.some(value => evidenceRef(value, repository) === revision)) {
        manifestInvalid(label + ".license.evidence must include a URL on https://github.com/" + repository + " whose blob, tree, raw, commit, releases/tag or archive ref is the revision " + revision
          + ", for example https://github.com/" + repository + "/blob/" + revision + "/LICENSE");
      }
      // The project keeps its own copy of the license text; its content is not inspected.
      if (entry.license.file !== undefined) {
        const licenseFile = manifestFile(root, entry.license.file, label + ".license.file");
        if (!fs.readFileSync(licenseFile, "utf8").trim()) manifestInvalid(label + ".license.file must not be empty");
      }
      permissive = entry.license.state === "verified" && nonempty(entry.license.id)
        && PERMISSIVE_LICENSES.some(id => id.toLowerCase() === entry.license.id.trim().toLowerCase());
    }
    if (!Array.isArray(entry.usedIn) || !entry.usedIn.length) manifestInvalid(label + ".usedIn must be nonempty");
    for (const [useIndex, use] of entry.usedIn.entries()) {
      const useLabel = label + ".usedIn[" + useIndex + "]";
      if (!isObject(use) || !nonempty(use.how) || !nonempty(use.marker)) manifestInvalid(useLabel + " requires how and marker");
      const file = manifestFile(root, use.file, useLabel + ".file");
      if (!fs.readFileSync(file, "utf8").includes(use.marker)) manifestInvalid(useLabel + ".marker must actually appear in its file");
      // A discovered entry declaring bundled-implementation ships its code, whatever how says.
      const copied = (discovered && entry.availability === "bundled-implementation")
        || /\b(?:copy|copied|copying|paste|pasted|vendor|vendored|vendoring|bundle|bundled|bundling|self-host|self-hosted|self-hosting|download|downloaded|downloading)\b|复制|拷贝|粘贴|打包|自托管|下载/i.test(use.how);
      const imported = /\b(?:import|imported|importing|require|install|installed)\b|导入|引入|安装/i.test(use.how);
      const studied = /\b(?:study|studied|reimplement|reimplemented|reimplementation)\b|研究|学习|重写|重新实现/i.test(use.how);
      if (discovered && (copied || imported)) {
        if (!permissive) manifestInvalid(useLabel + " copying or importing a discovered source requires license.state verified and a permissive license.id (" + PERMISSIVE_LIST + "); otherwise only study/reimplementation");
        if (entry.license.file === undefined) manifestInvalid(useLabel + " copying or importing a discovered source requires license.file naming the project file that holds its license text");
      }
      // Without a verified permissive license kept in the project, a discovered source is study-only.
      if (discovered && !(permissive && entry.license.file !== undefined) && !studied) {
        manifestInvalid(useLabel + " a discovered source without license.state verified, a permissive license.id and license.file allows only study/reimplementation");
      }
      if (["unverified", "commercial"].includes(entry.license.state)) {
        if (copied || imported) manifestInvalid(useLabel + " unverified/commercial sources cannot be copied or imported");
        if (!studied) manifestInvalid(useLabel + " unverified/commercial sources allow only study/reimplementation");
      }
      if (entry.license.state === "verified" && (copied || imported)
        && !/\b(?:attribution|copyright|licen[cs]e[ -]notices?|notices?)\b|署名|版权|许可声明/i.test(use.how)) {
        manifestInvalid(useLabel + ".how must document attribution/license-notice handling for verified imports/copies");
      }
    }
  }
  return manifest;
}

function validateProvenance(value, label, partial = false) {
  ownObject(value, label);
  for (const key of ["source", "license"]) {
    if (!partial || value[key] !== undefined) {
      if (typeof value[key] !== "string" || !value[key].trim()) invalid(`${label}.${key} must be a non-empty string`);
    }
  }
  for (const key of ["url", "attribution", "revision", "gitTree", "hashScope"]) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || !value[key].trim())) invalid(`${label}.${key} must be a non-empty string`);
  }
}

function validateEntryMetadata(entry, kind, label) {
  if (entry.sourceId !== undefined && (typeof entry.sourceId !== "string" || !SOURCE_ID.test(entry.sourceId))) {
    invalid(`${label}.sourceId must be a canonical lowercase slug`);
  }
  if (entry.recordType !== undefined && !RECORD_TYPES.has(entry.recordType)) invalid(`${label}.recordType is invalid`);
  if (entry.recordType === "source" && kind !== "doc") invalid(`${label}.recordType source must be stored as a doc`);
  if (entry.availability !== undefined && !AVAILABILITIES.has(entry.availability)) invalid(`${label}.availability is invalid`);
  if (entry.webRanking !== undefined && typeof entry.webRanking !== "boolean") invalid(`${label}.webRanking must be boolean`);
  if (entry.license !== undefined) {
    const license = entry.license;
    ownObject(license, `${label}.license`);
    const extras = Object.keys(license).filter((key) => !["state", "id", "evidence"].includes(key));
    if (extras.length) invalid(`${label}.license has unsupported properties: ${extras.join(", ")}`);
    if (!LICENSE_STATES.has(license.state)) invalid(`${label}.license.state is invalid`);
    if (license.id !== undefined && (typeof license.id !== "string" || !license.id.trim())) invalid(`${label}.license.id must be a non-empty string`);
    if (!Array.isArray(license.evidence) || !license.evidence.length) {
      invalid(`${label}.license.evidence must be a non-empty string array`);
    }
    for (const item of license.evidence) {
      if (typeof item !== "string" || !item.trim()) invalid(`${label}.license.evidence must be a non-empty string array`);
    }
  }
}

function normalizedProvenance(snapshotProvenance, entryProvenance, label) {
  const merged = { ...safeClone(snapshotProvenance, "snapshot.provenance"), ...(entryProvenance === undefined ? {} : safeClone(entryProvenance, `${label}.provenance`)) };
  validateProvenance(merged, `${label}.provenance`);
  return sortValue(merged);
}

function validateSnapshot(snapshot) {
  requireVersionedDocument(snapshot, SNAPSHOT_SCHEMA, "snapshot");
  const allowed = new Set(["schema", "version", "namespace", "provenance", ...Object.keys(COLLECTIONS)]);
  const extras = Object.keys(snapshot).filter((key) => !allowed.has(key));
  if (extras.length) invalid(`snapshot has unsupported properties: ${extras.join(", ")}`);
  if (typeof snapshot.namespace !== "string" || !NAMESPACE.test(snapshot.namespace)) invalid("snapshot.namespace is invalid");
  validateProvenance(snapshot.provenance, "snapshot.provenance");
  let count = 0;
  for (const collection of Object.keys(COLLECTIONS)) {
    const entries = snapshot[collection];
    if (entries === undefined) continue;
    if (!Array.isArray(entries)) invalid(`snapshot.${collection} must be an array`);
    entries.forEach((entry, index) => {
      const label = `snapshot.${collection}[${index}]`;
      ownObject(entry, label);
      if (typeof entry.id !== "string" || !LOCAL_ID.test(entry.id)) invalid(`${label}.id is invalid`);
      if (entry.provenance !== undefined) validateProvenance(entry.provenance, `${label}.provenance`, true);
      validateEntryMetadata(entry, COLLECTIONS[collection], label);
      validatePaths(entry, label);
      count += 1;
    });
  }
  if (!count) invalid("snapshot must contain at least one catalog entry");
  return snapshot;
}

function normalizeSnapshot(snapshot) {
  validateSnapshot(snapshot);
  const entries = [];
  const ids = new Set();
  for (const [collection, kind] of Object.entries(COLLECTIONS)) {
    for (const sourceEntry of snapshot[collection] || []) {
      const localId = sourceEntry.id;
      const id = `${snapshot.namespace}:${kind}:${localId}`;
      if (ids.has(id)) invalid(`duplicate catalog id ${id}`);
      ids.add(id);
      const cloned = safeClone(sourceEntry, `${collection}.${localId}`);
      delete cloned.id;
      const provenance = normalizedProvenance(snapshot.provenance, cloned.provenance, `${collection}.${localId}`);
      delete cloned.provenance;
      const entry = sortValue({ ...cloned, id, kind, localId, provenance });
      entry.hash = sha256(canonicalJson(entry));
      entries.push(sortValue(entry));
    }
  }
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return validateCatalog(sortValue({ schema: CATALOG_SCHEMA, version: VERSION, namespace: snapshot.namespace, entries }));
}

function validateCatalog(catalog) {
  requireVersionedDocument(catalog, CATALOG_SCHEMA, "catalog");
  const allowed = ["schema", "version", "namespace", "entries"];
  const extras = Object.keys(catalog).filter((key) => !allowed.includes(key));
  if (extras.length) invalid(`catalog has unsupported properties: ${extras.join(", ")}`);
  if (typeof catalog.namespace !== "string" || !NAMESPACE.test(catalog.namespace)) invalid("catalog.namespace is invalid");
  if (!Array.isArray(catalog.entries) || !catalog.entries.length) invalid("catalog.entries must not be empty");
  const ids = new Set();
  for (const [index, entry] of catalog.entries.entries()) {
    const label = `catalog.entries[${index}]`;
    ownObject(entry, label);
    if (!KINDS.includes(entry.kind)) invalid(`${label}.kind is invalid`);
    if (typeof entry.localId !== "string" || !LOCAL_ID.test(entry.localId)) invalid(`${label}.localId is invalid`);
    const expectedId = `${catalog.namespace}:${entry.kind}:${entry.localId}`;
    if (entry.id !== expectedId) invalid(`${label}.id must be ${expectedId}`);
    if (ids.has(entry.id)) invalid(`duplicate catalog id ${entry.id}`);
    ids.add(entry.id);
    validateProvenance(entry.provenance, `${label}.provenance`);
    validateEntryMetadata(entry, entry.kind, label);
    validatePaths(entry, label);
    if (!/^[a-f0-9]{64}$/.test(entry.hash || "")) invalid(`${label}.hash must be SHA-256`);
    const hashInput = safeClone(entry, label);
    delete hashInput.hash;
    if (sha256(canonicalJson(sortValue(hashInput))) !== entry.hash) invalid(`${label}.hash does not match its content`);
  }
  return catalog;
}

function searchCatalog(catalog, options = {}) {
  validateCatalog(catalog);
  ownObject(options, "search options");
  safeClone(options, "search options");
  const allowed = ["query", "kind", "category", "status", "limit", "platform"];
  const extras = Object.keys(options).filter((key) => !allowed.includes(key));
  if (extras.length) invalid(`search has unsupported options: ${extras.join(", ")}`);
  const query = options.query === undefined ? "" : String(options.query).trim().toLowerCase();
  if (options.kind !== undefined && !KINDS.includes(options.kind)) invalid("search kind is invalid");
  if (options.platform !== undefined && !["web", "react-native", "expo"].includes(options.platform)) invalid("search platform is invalid");
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) invalid("search limit must be a positive integer");
  for (const key of ["category", "status"]) if (options[key] !== undefined && (typeof options[key] !== "string" || !options[key].trim())) invalid(`search ${key} must be a non-empty string`);
  const matches = catalog.entries.filter((entry) => {
    if (options.platform && (entry.kind !== "component"
      || (entry.recordType !== undefined && entry.recordType !== "component")
      || (options.platform === "web" && entry.webRanking === false)
      || !entry.routing?.platforms?.includes(options.platform))) return false;
    if (options.kind && entry.kind !== options.kind) return false;
    if (options.category && entry.category !== options.category) return false;
    if (options.status && entry.status !== options.status) return false;
    return true;
  });
  const limited = (entries) => entries.slice(0, options.limit === undefined ? entries.length : options.limit).map((entry) => safeClone(entry));
  if (!query) return limited(matches);
  const literal = (entry) => canonicalJson(entry).toLowerCase().includes(query);
  // Vocabulary terms answer descriptions, not only literal substrings: they are ranked by lexical
  // overlap with their name, aliases and definition and listed before every other record. Records
  // of any other type keep the literal match and their catalog order.
  const terms = rankTerms(matches.filter((entry) => entry.recordType === "term"), query);
  const ranked = new Set(terms);
  return limited([
    ...terms,
    ...matches.filter((entry) => entry.recordType === "term" && !ranked.has(entry) && literal(entry)),
    ...matches.filter((entry) => entry.recordType !== "term" && literal(entry)),
  ]);
}

// Deterministic lexical matching for `recordType: "term"` records (the motion vocabulary). No
// model and no embedding: tokens, field weights and the two coverage thresholds below.
const TERM_STOP_WORDS = new Set(["a", "an", "the", "it", "its", "is", "are", "be", "that", "this", "these", "those", "there", "what", "whats", "which", "when", "where", "how", "do", "does", "you", "your", "i", "my", "we", "of", "to", "and", "or", "as", "at", "by", "for", "with", "so", "can", "call", "called", "name", "term", "word", "thing", "effect", "kind", "sort", "some", "something", "animation", "animate", "motion", "seem", "seems", "look", "looks", "like", "just", "one", "s", "t"]);
const TERM_STOP_PHRASES_ZH = ["叫什么名字", "叫什么", "叫啥", "是什么", "什么", "怎么", "这个", "那个", "这种", "那种", "一个", "一种", "的时候", "时候", "效果", "动效", "动画", "好像", "就是", "可以", "的", "了", "地", "得", "是", "吗", "呢", "啊", "吧"];
const TERM_FIELD_WEIGHTS = Object.freeze({ name: 3, alias: 2, keyword: 1.5, description: 1 });
// A term is listed when it covers half of what the query says in words the vocabulary knows. The
// three best may be listed from a quarter: the closest names for a description no term fits well.
const TERM_COVERAGE = 0.5;
const TERM_NEAR_COVERAGE = 0.25;
const TERM_NEAR_COUNT = 3;

function termStem(word) {
  let stem = word;
  if (stem.length > 4 && stem.endsWith("ies")) stem = `${stem.slice(0, -3)}y`;
  else if (stem.length > 3 && stem.endsWith("s") && !stem.endsWith("ss")) stem = stem.slice(0, -1);
  if (stem.length > 5 && stem.endsWith("ing")) stem = stem.slice(0, -3);
  else if (stem.length > 4 && stem.endsWith("ed")) stem = stem.slice(0, -2);
  else if (stem.length > 4 && stem.endsWith("ly")) stem = stem.slice(0, -2);
  if (stem.length > 4 && /[ey]$/.test(stem)) stem = stem.slice(0, -1);
  if (stem.length > 3 && /([b-df-hj-np-tv-z])\1$/.test(stem)) stem = stem.slice(0, -1);
  return stem;
}

// Latin words are stemmed; each run of CJK characters becomes its bigrams (a single character
// stays as it is) after the question and filler phrases are removed.
function termTokens(text) {
  const tokens = [];
  const folded = String(text).toLowerCase().replace(/['’]/g, "");
  for (const word of folded.match(/[a-z0-9]+/g) || []) {
    if (!TERM_STOP_WORDS.has(word)) tokens.push(termStem(word));
  }
  for (const run of folded.match(/[㐀-鿿]+/g) || []) {
    let rest = run;
    for (const phrase of TERM_STOP_PHRASES_ZH) rest = rest.split(phrase).join(" ");
    for (const part of rest.split(" ").filter(Boolean)) {
      if (part.length === 1) tokens.push(part);
      for (let index = 0; index + 1 < part.length; index += 1) tokens.push(part.slice(index, index + 2));
    }
  }
  return tokens;
}

function termFields(entry) {
  const names = typeof entry.name === "string" ? [entry.name] : isObject(entry.name) ? Object.values(entry.name).filter((value) => typeof value === "string") : [];
  const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  return { names, aliases: list(entry.aliases), keywords: list(entry.keywords), description: typeof entry.description === "string" ? entry.description : "" };
}

function rankTerms(entries, query) {
  const queryTokens = [...new Set(termTokens(query))];
  if (!entries.length || !queryTokens.length) return [];
  const indexed = entries.map((entry) => {
    const fields = termFields(entry);
    const weights = new Map();
    const add = (text, weight) => { for (const token of termTokens(text)) if ((weights.get(token) || 0) < weight) weights.set(token, weight); };
    fields.names.forEach((text) => add(text, TERM_FIELD_WEIGHTS.name));
    fields.aliases.forEach((text) => add(text, TERM_FIELD_WEIGHTS.alias));
    fields.keywords.forEach((text) => add(text, TERM_FIELD_WEIGHTS.keyword));
    add(fields.description, TERM_FIELD_WEIGHTS.description);
    // "Fade in / Fade out" answers to either half; a query that contains a whole name ranks first.
    const nameSets = fields.names.flatMap((name) => [name, ...name.split("/")]).map((name) => [...new Set(termTokens(name))]).filter((tokens) => tokens.length);
    const phrases = [...fields.names, ...fields.aliases].map((text) => [...new Set(termTokens(text))]).filter((tokens) => tokens.length);
    return { entry, weights, nameSets, phrases };
  });
  const frequency = new Map();
  for (const item of indexed) for (const token of item.weights.keys()) frequency.set(token, (frequency.get(token) || 0) + 1);
  const rarity = (token) => Math.log(1 + indexed.length / frequency.get(token));
  // Words no term knows carry no evidence either way, so coverage is measured over the rest: a
  // long sentence is not penalised for its filler, and a query made only of unknown words finds
  // no term.
  const known = queryTokens.filter((token) => frequency.has(token));
  const total = known.reduce((sum, token) => sum + rarity(token), 0);
  if (!total) return [];
  const asked = new Set(known);
  const scored = [];
  for (const item of indexed) {
    let matched = 0;
    let score = 0;
    for (const token of known) {
      const weight = item.weights.get(token);
      if (!weight) continue;
      matched += rarity(token);
      score += weight * rarity(token);
    }
    if (!score || matched / total < TERM_NEAR_COVERAGE) continue;
    // The closest single phrase decides between terms that share words: the share of that phrase
    // the query covers, weighted by how rare the shared words are.
    let phrase = 0;
    for (const tokens of item.phrases) {
      const shared = tokens.filter((token) => asked.has(token));
      if (!shared.length) continue;
      const value = shared.reduce((sum, token) => sum + rarity(token), 0) * (shared.length / tokens.length);
      if (value > phrase) phrase = value;
    }
    const named = item.nameSets.some((tokens) => tokens.every((token) => asked.has(token)));
    // A query that is exactly one of the term's names or aliases outranks a term whose name is only
    // part of it ("shared layout animation" is an alias of one term and contains the name of another).
    const exact = item.phrases.some((tokens) => tokens.length === asked.size && tokens.every((token) => asked.has(token)));
    scored.push({ entry: item.entry, coverage: matched / total, score: score + 2 * phrase + (named ? 3 * total : 0) + (exact ? 4 * total : 0) });
  }
  scored.sort((left, right) => right.score - left.score || (left.entry.id < right.entry.id ? -1 : left.entry.id > right.entry.id ? 1 : 0));
  return scored.filter((item, index) => item.coverage >= TERM_COVERAGE || index < TERM_NEAR_COUNT).map((item) => item.entry);
}

function serializeCatalog(catalog) {
  validateCatalog(catalog);
  return canonicalJson(catalog);
}

const CAPABILITY_TERMS = Object.freeze({
  "app-shell": ["app shell", "shell", "layout", "top bar", "sidebar", "navigation"],
  "command-palette": ["command", "palette", "command palette", "shortcut", "quick action"],
  "side-nav": ["side nav", "navigation", "sidebar", "sidenav", "nav", "menu"],
  "data-table": ["data table", "table", "datagrid", "grid", "row", "column", "数据表", "表格", "数据网格", "行", "列"],
  progress: ["progress", "loading", "spinner", "progress bar", "skeleton"],
  dialog: ["dialog", "modal", "alertdialog", "popup", "popover", "tooltip", "弹窗", "对话框", "模态框"],
  tabs: ["tab", "tabs", "tab bar"], button: ["button", "icon button", "action"],
  "text-input": ["input", "text field", "textarea", "form", "field", "输入框", "文本框", "表单", "字段"],
  select: ["select", "dropdown", "combobox", "listbox", "menu"],
  "date-picker": ["date", "date picker", "calendar", "date range"],
  toggle: ["toggle", "switch", "checkbox", "radio"], avatar: ["avatar", "avatar group", "person"],
  badge: ["badge", "tag", "chip", "pill"], card: ["card", "tile", "panel"],
  "empty-state": ["empty state", "empty", "placeholder", "no data", "illustration", "空状态", "无数据", "占位"],
  "error-state": ["error", "error state", "alert", "warning", "banner", "错误态", "错误状态", "警告"],
  "loading-state": ["loading", "skeleton", "spinner", "progress"],
  pagination: ["pagination", "pager", "previous page", "next page", "分页", "上一页", "下一页"], breadcrumb: ["breadcrumb", "breadcrumbs", "trail", "path", "面包屑"],
  search: ["search", "search input", "search bar", "filter", "搜索", "筛选", "过滤"], stepper: ["stepper", "step", "wizard", "progress stepper", "步骤", "向导"],
  "toast-notification": ["toast", "notification", "snackbar", "notice"], accordion: ["accordion", "collapse", "expand", "disclosure"],
  drawer: ["drawer", "panel", "side panel", "sheet"], "file-upload": ["file upload", "upload", "dropzone", "file"],
  "color-picker": ["color picker", "color", "picker"], slider: ["slider", "range", "range slider"],
  tooltip: ["tooltip", "popover", "hint", "help"], divider: ["divider", "separator", "rule"],
  "list-group": ["list", "list group", "item", "item list"], typography: ["text", "heading", "paragraph", "typography", "font"],
  "app-ui": ["app ui", "application ui", "dashboard", "settings", "profile", "auth", "workspace"],
  "animated-ui": ["animated ui", "motion ui", "animated interface", "animated react components", "micro interaction"],
  "animated-react-components": ["animated react components"],
  "page-block": ["page block", "landing page", "page section", "section"], hero: ["hero", "hero section"],
  features: ["feature", "features", "feature section"], pricing: ["pricing", "pricing table", "plan"],
  faq: ["faq", "frequently asked questions"], cta: ["cta", "call to action"], stats: ["stats", "statistics", "metrics", "metric"],
  navigation: ["navigation", "navbar", "nav bar", "menu", "导航", "键盘导航"], carousel: ["carousel", "slider", "slideshow"],
  "depth-carousel": ["depth carousel", "depth card", "3d carousel", "stacked carousel"],
  "parallax-carousel": ["parallax carousel", "parallax cards"], "3d-depth": ["3d depth", "depth effect", "perspective card"],
  "interactive-card": ["interactive card", "tilt card", "hover card"],
  "dither-background": ["dither background", "dithering", "dither", "抖动背景", "抖动"],
  "animated-background": ["animated background", "动态背景"], "shader-background": ["shader background", "webgl background", "着色器背景"],
  smoothui: ["smoothui", "smooth ui"], "react-bits": ["react bits", "reactbits"], "decrypted-text": ["decrypted text", "decryptedtext", "decrypting text"],
  "spring-animation": ["spring animation", "spring physics", "spring"],
  "scroll-reveal": ["scroll reveal", "scroll animation", "scroll-triggered"],
  timeline: ["timeline", "animation timeline", "sequenced animation"],
  "text-animation": ["text animation", "animated text", "scramble text", "reveal text", "glitch text", "typewriter text", "文字动画"],
  transition: ["transition", "page transition", "scene transition", "过渡"],
  "numeric-content-transition": ["numeric text", "numeric", "counter", "animated number", "count up", "ticker", "changing number"],
  "numeric-text": ["numeric text", "number text", "rolling digits", "numeric"], "animated-stat": ["animated stat", "animated metric", "live counter", "stat"],
  "ai-chat": ["ai chat", "chat interface", "chatbot", "AI 对话", "聊天界面", "对话界面"],
  "ai-native-ui": ["ai-native", "ai native", "ai ui", "AI UI", "AI interface"],
  conversation: ["conversation", "chat conversation", "message list", "对话"],
  "prompt-input": ["prompt input", "prompt composer", "提示输入"],
  "streaming-ui": ["streaming ui", "streaming response", "流式界面", "流式响应"],
  "tool-call": ["tool call", "tool invocation", "tool result", "工具调用"],
  "voice-ui": ["voice ui", "voice input", "voice agent", "语音界面", "语音输入"],
  workflow: ["workflow", "workflow ui", "agent workflow", "工作流"],
});

const TERM_TO_CAPABILITY = new Map();
for (const [capability, terms] of Object.entries(CAPABILITY_TERMS)) {
  for (const term of terms) {
    if (!TERM_TO_CAPABILITY.has(term)) TERM_TO_CAPABILITY.set(term, []);
    TERM_TO_CAPABILITY.get(term).push(capability);
  }
}

function decomposeCapabilities(brief, options = {}) {
  if (typeof brief !== "string" || !brief.trim()) return [];
  ownObject(options, "decompose options");
  safeClone(options, "decompose options");
  const minScore = options.minScore === undefined ? 1 : Number(options.minScore);
  const allowPartialWords = options.allowPartialWords !== false;
  const lower = brief.trim().toLowerCase();
  const words = lower.split(/[\s,;.()\[\]{}"'\/=]+/).filter(Boolean);
  const scores = [];
  for (const [capability, terms] of Object.entries(CAPABILITY_TERMS)) {
    let score = 0;
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower)) score += 1;
      if (allowPartialWords) for (const word of words) if (word.length >= 3 && (term.includes(word) || word.includes(term))) score += 0.5;
    }
    score = Math.round(score);
    if (score >= minScore) scores.push([capability, score]);
  }
  return scores.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([capability]) => capability);
}

function searchCapabilities(catalog, capabilities, searchOptions = {}) {
  validateCatalog(catalog);
  if (!Array.isArray(capabilities)) invalid("capabilities must be an array");
  const capabilityMap = {};
  const seenIds = new Set();
  const matchesTerm = (entry, term) => {
    const text = canonicalJson({ id: entry.id, localId: entry.localId, name: entry.name, displayName: entry.displayName, category: entry.category, group: entry.group, keywords: entry.keywords, description: entry.description, docs: entry.docsDense ? { name: entry.docsDense.name, keywords: entry.docsDense.keywords, description: entry.docsDense.description } : undefined }).toLowerCase();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
  };
  for (const capability of capabilities) {
    const terms = CAPABILITY_TERMS[capability];
    if (!terms) continue;
    const matched = new Map();
    const eligible = searchCatalog(catalog, { ...searchOptions, query: "" });
    for (const term of terms) for (const entry of eligible.filter((candidate) => matchesTerm(candidate, term))) {
      if (!matched.has(entry.id)) matched.set(entry.id, { entry, matchedTerms: [] });
      matched.get(entry.id).matchedTerms.push(term);
    }
    const entries = [...matched.values()].map(({ entry, matchedTerms }) => ({ ...safeClone(entry), matchedTerms }));
    entries.forEach((entry) => seenIds.add(entry.id));
    capabilityMap[capability] = { terms, count: entries.length, entries };
  }
  return { capabilityMap, uniqueEntryCount: seenIds.size };
}

module.exports = {
  CAPABILITY_TERMS,
  CATALOG_SCHEMA,
  COLLECTIONS,
  COMPONENT_SOURCES,
  KINDS,
  PERMISSIVE_LIST,
  SNAPSHOT_SCHEMA,
  TERM_TO_CAPABILITY,
  VERSION,
  canonicalCatalogJson: serializeCatalog,
  decomposeCapabilities,
  normalizeDesignSystemSnapshot: normalizeSnapshot,
  normalizeSnapshot,
  searchCatalog,
  searchCapabilities,
  searchDesignSystemCatalog: searchCatalog,
  serializeCatalog,
  validateCatalog,
  validateComponentManifest,
  validateSnapshot,
};
