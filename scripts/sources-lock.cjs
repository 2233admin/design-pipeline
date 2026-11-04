"use strict";

// The upstream lock (sources.lock.json) is the single record of which upstream revision or release
// every bundle, adapted reference, catalog link and runtime pin follows. Policy: track upstream
// HEAD (or the latest npm release for runtimes). Vendor manifests, catalog links, companion
// profiles and frontmatter are derived pins; `checkAgreement` fails when any of them differs from
// the lock. Maintenance code only: nothing under skill/ reads this file at run time; shipped
// manifests carry the revision that `sources fetch` downloads.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCHEMA = "design-pipeline.sources-lock.v1";
const LOCK_NAME = "sources.lock.json";
const KINDS = ["vendored", "fetched-on-demand", "adapted-reference", "catalog-reference", "npm", "release"];
const VERSIONED = new Set(["npm", "release"]);
const GIT_KINDS = new Set(["vendored", "fetched-on-demand", "adapted-reference", "catalog-reference"]);
const BUNDLE_KINDS = new Set(["vendored", "fetched-on-demand"]);
const GITHUB = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/;
const SHA = /^[0-9a-f]{40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Files whose upstream pins are derived from the lock. Research notes, archived changes, change
// records, examples and eval fixtures record history (what was studied or adapted at the time) and
// are not dependencies, so they keep their original citations.
const PIN_PREFIXES = ["skill/", "scripts/", "tests/", ".github/"];
const PIN_FILES = new Set(["THIRD_PARTY_NOTICES.md", "README.md"]);
const PIN_EXCLUDED = [/^skill\/vendor\/[^/]+\/upstream\//, /^skill\/vendor\/[^/]+\/(?:licenses|maintained)\//, /^skill\/vendor\/[^/]+\/LICENSES\.txt$/, /^docs\/research\//, /^docs\/archive\//, /^tests\/fixtures\//];
const BINARY = /\.(png|jpe?g|webp|gif|ico|mp4|mov|webm|mp3|wav|ogg|woff2?|ttf|otf|glb|gltf|bin|zip|tgz|gz|pdf|psd|cube)$/i;
// Prose in notices names derivation commits (concepts rewritten at a commit, code adapted once);
// only revisions the lock records are rewritten there, and nothing else in the notices is checked.
const PROSE_FILES = new Set(["THIRD_PARTY_NOTICES.md"]);

function fail(message) {
  throw new Error(message);
}

function repoRoot() {
  return path.resolve(__dirname, "..");
}

function lockPath(root = repoRoot()) {
  return path.join(root, LOCK_NAME);
}

function readLock(root = repoRoot()) {
  const lock = JSON.parse(fs.readFileSync(lockPath(root), "utf8"));
  const issues = validateLock(lock);
  if (issues.length) fail(`invalid ${LOCK_NAME}: ${issues.join("; ")}`);
  return lock;
}

function writeLock(root, lock) {
  const issues = validateLock(lock);
  if (issues.length) fail(`refusing to write invalid ${LOCK_NAME}: ${issues.join("; ")}`);
  lock.sources.sort((left, right) => left.id.localeCompare(right.id, "en"));
  fs.writeFileSync(lockPath(root), `${JSON.stringify(lock, null, 2)}\n`);
}

function repoKey(repository) {
  const match = GITHUB.exec(String(repository || ""));
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}

function validateLock(lock) {
  const issues = [];
  if (!lock || lock.schema !== SCHEMA) return [`schema must be ${SCHEMA}`];
  if (lock.policy !== "track-upstream-head") issues.push("policy must be track-upstream-head");
  if (!Array.isArray(lock.sources) || !lock.sources.length) return [...issues, "sources must be a non-empty array"];
  const ids = new Set();
  const revisions = new Map();
  for (const entry of lock.sources) {
    const label = entry?.id || "<missing id>";
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(entry?.id || "")) issues.push(`${label}: id must be lower-case kebab`);
    if (ids.has(entry.id)) issues.push(`${label}: duplicate id`);
    ids.add(entry.id);
    if (!KINDS.includes(entry.kind)) issues.push(`${label}: kind must be one of ${KINDS.join(", ")}`);
    if (!DATE.test(entry.reviewedAt || "")) issues.push(`${label}: reviewedAt must be YYYY-MM-DD`);
    if (entry.held !== undefined && (typeof entry.held?.reason !== "string" || !/^https:\/\/github\.com\/.+\/issues\/\d+$/.test(entry.held?.issue || ""))) {
      issues.push(`${label}: held needs a reason and the follow-up issue URL`);
    }
    if (GIT_KINDS.has(entry.kind) || entry.repo !== undefined) {
      if (!repoKey(entry.repo)) issues.push(`${label}: repo must be https://github.com/<owner>/<name>`);
      if (!SHA.test(entry.revision || "")) issues.push(`${label}: revision must be a full commit id`);
      if (typeof entry.committedAt !== "string" || !Number.isFinite(Date.parse(entry.committedAt))) issues.push(`${label}: committedAt must be an ISO time`);
      const key = repoKey(entry.repo);
      if (key && revisions.has(key) && revisions.get(key) !== entry.revision) issues.push(`${label}: every entry for ${key} must lock one revision`);
      if (key) revisions.set(key, entry.revision);
    }
    if (BUNDLE_KINDS.has(entry.kind)) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.bundle || "")) issues.push(`${label}: bundle must name a skill/vendor folder`);
      if (!Array.isArray(entry.importer) || !/^scripts\/import-[a-z0-9-]+\.cjs$/.test(entry.importer[0] || "")) issues.push(`${label}: importer must start with scripts/import-*.cjs`);
      if (!entry.excludedFromBundle && !/^[0-9a-f]{64}$/.test(entry.treeSha256 || "")) issues.push(`${label}: treeSha256 must record the bundle's snapshot hash`);
      if (entry.fetchedTreeSha256 !== undefined && !/^[0-9a-f]{64}$/.test(entry.fetchedTreeSha256)) issues.push(`${label}: fetchedTreeSha256 must be a SHA-256`);
    }
    if (entry.profiles !== undefined && (!Array.isArray(entry.profiles) || entry.profiles.some((id) => typeof id !== "string"))) issues.push(`${label}: profiles lists companion sourceMeta ids`);
    if (entry.derive !== undefined && (!Array.isArray(entry.derive) || entry.derive.some((script) => !/^scripts\/[a-z0-9-]+\.cjs$/.test(script)))) issues.push(`${label}: derive lists scripts/*.cjs that regenerate files from the bundle`);
    if (entry.notice !== undefined && entry.notice !== "manifest") issues.push(`${label}: notice may only be "manifest"`);
    if (entry.excludedFromBundle !== undefined && (typeof entry.excludedFromBundle !== "string" || !BUNDLE_KINDS.has(entry.kind))) issues.push(`${label}: excludedFromBundle is a reason on a bundle entry`);
    if (entry.kind === "adapted-reference" && !Array.isArray(entry.documents)) issues.push(`${label}: adapted-reference needs documents`);
    if (VERSIONED.has(entry.kind)) {
      if (entry.kind === "npm" && (typeof entry.package !== "string" || !entry.package)) issues.push(`${label}: npm entry needs package`);
      if (entry.kind === "release" && !GITHUB.test(entry.repo || "")) issues.push(`${label}: a release entry follows the semver tags of its repo`);
      if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry.version || "")) issues.push(`${label}: version must be an exact semver`);
      if (!Array.isArray(entry.sites) || !entry.sites.length) issues.push(`${label}: ${entry.kind} entry needs sites`);
      for (const site of entry.sites || []) {
        if (typeof site.file !== "string" || (typeof site.json !== "string" && typeof site.pattern !== "string")) issues.push(`${label}: each site needs file and json or pattern`);
        if (typeof site.pattern === "string" && !site.pattern.includes("{version}")) issues.push(`${label}: site pattern must contain {version}`);
      }
      if (entry.repo !== undefined && !/\{(version|major|minor|patch)\}/.test(entry.tag || "")) issues.push(`${label}: an entry with repo needs the release tag pattern`);
    }
  }
  return issues;
}

function git(cwd, args, options = {}) {
  const child = spawnSync("git", args, { cwd, encoding: options.buffer ? undefined : "utf8", windowsHide: true, maxBuffer: 512 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (child.status !== 0) {
    if (options.allowFailure) return null;
    fail(`git ${args.join(" ")}: ${String(child.stderr || child.stdout || "failed").trim()}`);
  }
  return options.buffer ? child.stdout : child.stdout.trim();
}

// Tracked text files that may carry derived pins.
function pinFiles(root) {
  return git(root, ["ls-files", "-z"]).split("\0").filter(Boolean)
    .filter((file) => (PIN_FILES.has(file) || PIN_PREFIXES.some((prefix) => file.startsWith(prefix))) && !PIN_EXCLUDED.some((pattern) => pattern.test(file)) && !BINARY.test(file))
    .sort();
}

const URL_PIN = /github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)\/(blob|tree|commit|raw)\/([0-9a-f]{7,40})(\/[^\s"'`)<>\]#?]*)?/g;
const URL_FIELDS = ["repository", "url", "repo", "source", "sourceCode", "homepage", "upstream"];
const REVISION_FIELDS = ["revision", "reviewedRevision", "commit"];

// Every (repo, revision) a file pins: GitHub blob/tree/commit links, JSON objects that pair a
// GitHub URL with a revision field, and Markdown frontmatter `url:` + `reviewedRevision:` pairs.
function pinsIn(file, text) {
  const pins = [];
  for (const match of text.matchAll(URL_PIN)) {
    pins.push({ file, via: "url", repo: match[1].toLowerCase(), revision: match[3], path: match[2] === "blob" || match[2] === "raw" || match[2] === "tree" ? decodeURIComponent((match[4] || "").replace(/^\//, "").replace(/[.,;:!]+$/, "")) : "" });
  }
  if (file.endsWith(".json")) {
    let data;
    try { data = JSON.parse(text); } catch { return pins; }
    const walk = (value, trail) => {
      if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${trail}[${index}]`));
      if (!value || typeof value !== "object") return;
      const url = URL_FIELDS.map((key) => value[key]).find((item) => typeof item === "string" && /github\.com\//.test(item));
      const field = REVISION_FIELDS.find((key) => typeof value[key] === "string" && /^[0-9a-f]{7,40}$/.test(value[key]));
      if (url && field) {
        const match = url.match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?]|$)/);
        if (match) pins.push({ file, via: `json ${trail}.${field}`, repo: match[1].toLowerCase(), revision: value[field] });
      }
      for (const [key, item] of Object.entries(value)) walk(item, `${trail}.${key}`);
    };
    walk(data, "$");
  }
  if (file.endsWith(".md")) {
    const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const url = block?.[1].match(/^\s*url:\s*https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:[/#?\s]|$)/m);
    const revision = block?.[1].match(/^\s*reviewedRevision:\s*([0-9a-f]{7,40})\s*$/m);
    if (url && revision) pins.push({ file, via: "frontmatter reviewedRevision", repo: url[1].toLowerCase(), revision: revision[1] });
  }
  return pins;
}

function collectPins(root, files = pinFiles(root)) {
  return files.flatMap((file) => pinsIn(file, fs.readFileSync(path.join(root, file), "utf8")));
}

function lockedRevisions(lock) {
  const byRepo = new Map();
  for (const entry of lock.sources) {
    const key = repoKey(entry.repo);
    if (key) byRepo.set(key, entry.revision);
  }
  return byRepo;
}

function readJsonFile(root, file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

// Resolves a dotted JSON site path such as `devDependencies.hyperframes` or
// `tools[id=heygen-com/hyperframes].version` to { parent, key }.
function jsonSite(data, expression) {
  const parts = expression.match(/[^.[\]]+|\[[^\]]+\]/g) || [];
  let parent = null;
  let key = null;
  let node = data;
  for (const part of parts) {
    if (node === undefined || node === null) return null;
    parent = node;
    if (part.startsWith("[")) {
      const [field, wanted] = part.slice(1, -1).split("=");
      if (!Array.isArray(node)) return null;
      key = node.findIndex((item) => item && String(item[field]) === wanted);
      if (key < 0) return null;
    } else key = part;
    node = parent[key];
  }
  return parent === null ? null : { parent, key, value: node };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `{version}` captures the version; `{revision}` matches any full commit id (the hex rewrite owns it).
function sitePattern(pattern) {
  const source = pattern.split(/(\{version\}|\{revision\})/).map((part) => (part === "{version}" ? "(?<version>\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?)" : part === "{revision}" ? "[0-9a-f]{40}" : escapeRegExp(part))).join("");
  return new RegExp(source, "gd");
}

function replaceSiteVersion(text, pattern, version) {
  return text.replace(sitePattern(pattern), (...args) => {
    const [match] = args;
    const found = args.at(-1).version;
    const at = match.indexOf(found, pattern.indexOf("{version}") >= 0 && !pattern.slice(0, pattern.indexOf("{version}")).includes("{revision}") ? pattern.indexOf("{version}") : 0);
    return `${match.slice(0, at)}${version}${match.slice(at + found.length)}`;
  });
}

function releaseTag(template, version) {
  const [major, minor, patch] = version.split(/[.-]/);
  return template.replaceAll("{version}", version).replaceAll("{major}", major).replaceAll("{minor}", minor).replaceAll("{patch}", patch);
}

// Returns the versions each npm site currently records.
function npmSiteVersions(root, site) {
  const file = path.join(root, site.file);
  if (!fs.existsSync(file)) return { error: `missing ${site.file}` };
  if (site.json) {
    const found = jsonSite(readJsonFile(root, site.file), site.json);
    if (!found) return { error: `${site.file} has no ${site.json}` };
    return { versions: [String(found.value).replace(/^[\^~=]/, "")] };
  }
  const versions = [...fs.readFileSync(file, "utf8").matchAll(sitePattern(site.pattern))].map((match) => match.groups.version);
  return versions.length ? { versions } : { error: `${site.file} has no "${site.pattern}"` };
}

function manifestFor(root, entry) {
  const file = path.join(root, "skill", "vendor", entry.bundle, "manifest.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

// The repository and revision a bundle manifest records for one lock entry.
function manifestSource(manifest, entry) {
  if (!manifest) return null;
  if (Array.isArray(manifest.packs)) {
    const pack = manifest.packs.find((item) => repoKey(item.repository) === repoKey(entry.repo));
    return pack ? { repository: pack.repository, revision: pack.revision, gitTree: pack.gitTree, committedAt: pack.committedAt } : null;
  }
  return manifest.source || null;
}

// Every disagreement between the lock and the files derived from it.
function checkAgreement(root = repoRoot(), lock = readLock(root)) {
  const issues = [];
  const byRepo = lockedRevisions(lock);
  for (const pin of collectPins(root)) {
    const locked = byRepo.get(pin.repo);
    if (!locked) issues.push(`${pin.file}: ${pin.via} pins ${pin.repo}@${pin.revision.slice(0, 12)}, which the lock does not record`);
    else if (!locked.startsWith(pin.revision)) issues.push(`${pin.file}: ${pin.via} pins ${pin.repo}@${pin.revision.slice(0, 12)}; the lock records ${locked.slice(0, 12)}`);
  }
  const notices = fs.readFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  for (const entry of lock.sources) {
    if (BUNDLE_KINDS.has(entry.kind) && !entry.excludedFromBundle) {
      const source = manifestSource(manifestFor(root, entry), entry);
      if (!source) issues.push(`${entry.id}: skill/vendor/${entry.bundle}/manifest.json does not record ${entry.repo}`);
      else {
        if (repoKey(source.repository) !== repoKey(entry.repo)) issues.push(`${entry.id}: manifest repository ${source.repository} differs from the lock`);
        if (source.revision !== entry.revision) issues.push(`${entry.id}: manifest revision ${source.revision} differs from the lock ${entry.revision}`);
      }
      // The lock carries the content hash, so rehashing a manifest over edited bytes is a visible lock change.
      const manifest = manifestFor(root, entry);
      if (manifest && manifest.snapshot?.treeSha256 !== entry.treeSha256) issues.push(`${entry.id}: manifest treeSha256 differs from the lock`);
      if (manifest && (manifest.fetched?.treeSha256 || undefined) !== entry.fetchedTreeSha256) issues.push(`${entry.id}: manifest fetched treeSha256 differs from the lock`);
      // A multi-repository bundle may delegate per-repository revisions to its manifest.
      if (entry.notice !== "manifest" && !notices.includes(entry.revision)) issues.push(`${entry.id}: THIRD_PARTY_NOTICES.md does not name the locked revision ${entry.revision}`);
    }
    if (entry.kind === "adapted-reference") {
      for (const document of entry.documents) {
        const text = fs.existsSync(path.join(root, document)) ? fs.readFileSync(path.join(root, document), "utf8") : "";
        if (!text.includes(`reviewedRevision: ${entry.revision}`)) issues.push(`${entry.id}: ${document} does not record reviewedRevision ${entry.revision}`);
      }
    }
    if (VERSIONED.has(entry.kind)) {
      for (const site of entry.sites) {
        const found = npmSiteVersions(root, site);
        if (found.error) issues.push(`${entry.id}: ${found.error}`);
        else for (const version of found.versions) if (version !== entry.version) issues.push(`${entry.id}: ${site.file} records ${entry.package} ${version}; the lock records ${entry.version}`);
      }
    }
  }
  return issues;
}

module.exports = {
  BUNDLE_KINDS,
  GIT_KINDS,
  KINDS,
  LOCK_NAME,
  PROSE_FILES,
  SCHEMA,
  VERSIONED,
  releaseTag,
  replaceSiteVersion,
  checkAgreement,
  collectPins,
  escapeRegExp,
  fail,
  git,
  jsonSite,
  lockPath,
  manifestFor,
  manifestSource,
  npmSiteVersions,
  pinFiles,
  pinsIn,
  readJsonFile,
  readLock,
  repoKey,
  repoRoot,
  sitePattern,
  validateLock,
  writeLock,
};
