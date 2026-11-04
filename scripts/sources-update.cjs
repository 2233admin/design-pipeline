#!/usr/bin/env node
"use strict";

// npm run sources:update [-- --only <id>[,<id>]] [--dry-run] [--reimport] [--today YYYY-MM-DD]
//
// Moves every upstream in sources.lock.json to its latest state: Git sources to the remote HEAD,
// npm runtimes to the latest release (and, when the entry names a repository, that release's tag).
// Each changed repository is fetched shallowly into a temporary directory and treated as untrusted
// data: hooks are disabled, nothing from it is executed, and only the repository's own importer
// (scripts/import-*.cjs) reads it. The importer regenerates the bundle and its integrity hashes; this
// script then rewrites every derived pin (catalog links, companion profiles, adapted-reference
// frontmatter, notices) and the lock. An upstream that moved or removed a file we cite, or changed
// a license text we cite, fails loudly and is left at its locked revision.
//
// Test hooks (no network): SOURCES_REMOTE_BASE maps https://github.com/<owner>/<name> to
// <base>/<owner>/<name>; SOURCES_NPM_VERSIONS is a JSON object of package -> latest version.

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  BUNDLE_KINDS, VERSIONED, collectPins, escapeRegExp, fail, jsonSite, manifestFor, npmSiteVersions, pinFiles,
  readLock, releaseTag, replaceSiteVersion, repoKey, repoRoot, writeLock,
} = require("./sources-lock.cjs");

const LICENSE_PATH = /(^|\/)(licen[cs]e|copying|notice)(\.[^/]*)?$/i;
const COMPANION = "skill/references/companion-capabilities.json";

function parseArgs(argv) {
  const options = { only: null, dryRun: false, reimport: false, today: null, root: repoRoot(), npm: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = () => {
      const next = argv[++index];
      if (!next || next.startsWith("--")) fail(`${token} requires a value`);
      return next;
    };
    if (token === "--only") options.only = value().split(",").map((item) => item.trim()).filter(Boolean);
    else if (token === "--dry-run") options.dryRun = true;
    else if (token === "--reimport") options.reimport = true;
    else if (token === "--no-npm-install") options.npm = false;
    else if (token === "--today") options.today = value();
    else if (token === "--root") options.root = path.resolve(value());
    else if (token === "--help" || token === "-h") options.help = true;
    else fail(`unknown option: ${token}`);
  }
  options.today ||= new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.today)) fail("--today requires YYYY-MM-DD");
  return options;
}

function remoteUrl(repository) {
  const base = process.env.SOURCES_REMOTE_BASE;
  if (!base) return repository;
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/.exec(repository);
  return `${base.replace(/\/$/, "")}/${match[1]}/${match[2]}`;
}

function gitEnv() {
  return { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1", GIT_CONFIG_NOSYSTEM: "1" };
}

// git with hooks, filters and credential helpers disabled: the repository is data.
function safeGit(cwd, args, options = {}) {
  const hardened = ["-c", "core.hooksPath=/dev/null", "-c", "protocol.file.allow=always", "-c", "core.fsmonitor=false", "-c", "credential.helper=", ...args];
  const child = spawnSync("git", hardened, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 512 * 1024 * 1024, env: gitEnv() });
  if (child.status !== 0) {
    if (options.allowFailure) return null;
    fail(`git ${args.join(" ")}: ${String(child.stderr || child.stdout).trim()}`);
  }
  return child.stdout.trim();
}

function lsRemote(repository, ref) {
  const output = safeGit(process.cwd(), ["ls-remote", remoteUrl(repository), ref, `${ref}^{}`]);
  const lines = output.split("\n").filter(Boolean).map((line) => line.split("\t"));
  const peeled = lines.find(([, name]) => name === `${ref}^{}`);
  const direct = lines.find(([, name]) => name === ref);
  const sha = (peeled || direct)?.[0];
  if (!/^[0-9a-f]{40}$/.test(sha || "")) fail(`${repository} has no ${ref}`);
  return sha;
}

// Highest stable semver among a repository's tags that fit the entry's tag template.
function latestReleaseTag(repository, template) {
  const output = safeGit(process.cwd(), ["ls-remote", "--tags", remoteUrl(repository)]);
  const pattern = new RegExp(`^${escapeRegExp(template).replace("\\{version\\}", "(\\d+\\.\\d+\\.\\d+)")}$`);
  const versions = output.split("\n").map((line) => line.split("\t")[1]?.replace(/^refs\/tags\//, "")).filter((tag) => tag && !tag.endsWith("^{}")).map((tag) => tag.match(pattern)?.[1]).filter(Boolean);
  if (!versions.length) fail(`${repository} has no tag matching ${template}`);
  const key = (version) => version.split(".").map(Number);
  return versions.sort((left, right) => { const a = key(left); const b = key(right); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; }).at(-1);
}

function latestRelease(entry) {
  return entry.kind === "release" ? latestReleaseTag(entry.repo, entry.tag) : npmLatest(entry.package);
}

function npmLatest(name) {
  if (process.env.SOURCES_NPM_VERSIONS) {
    const versions = JSON.parse(process.env.SOURCES_NPM_VERSIONS);
    if (!versions[name]) fail(`SOURCES_NPM_VERSIONS has no ${name}`);
    return versions[name];
  }
  const child = spawnSync("npm", ["view", name, "version", "--json"], { encoding: "utf8", windowsHide: true, shell: process.platform === "win32" });
  if (child.status !== 0) fail(`npm view ${name}: ${String(child.stderr).trim()}`);
  return JSON.parse(child.stdout);
}

// Shallow, blob-filtered fetch of the wanted revisions into `dir`; `checkout` materializes one.
function fetchRepository(repository, dir, revisions, checkout) {
  fs.mkdirSync(dir, { recursive: true });
  safeGit(dir, ["init", "-q"]);
  safeGit(dir, ["remote", "add", "origin", remoteUrl(repository)]);
  const missing = [];
  for (const revision of [...new Set(revisions)]) {
    if (safeGit(dir, ["fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", revision], { allowFailure: true }) === null) missing.push(revision);
  }
  if (checkout) safeGit(dir, ["checkout", "-q", "--detach", checkout]);
  return { dir, missing };
}

function objectType(dir, revision, file) {
  return safeGit(dir, ["cat-file", "-t", `${revision}:${file}`], { allowFailure: true });
}

function objectId(dir, revision, file) {
  return safeGit(dir, ["rev-parse", `${revision}:${file}`], { allowFailure: true });
}

function blobText(dir, revision, file) {
  const child = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "cat-file", "blob", `${revision}:${file}`], { cwd: dir, windowsHide: true, maxBuffer: 256 * 1024 * 1024, env: gitEnv() });
  if (child.status !== 0) return null;
  return child.stdout.toString("utf8");
}

function frontmatterField(text, key) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return block?.[1].match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, "m"))?.[1] ?? null;
}

// Adapted-reference hash scopes recorded in frontmatter (see skill/references/*.md sourceMeta).
function adaptedHash(dir, revision, text) {
  const scope = frontmatterField(text, "contentHashScope");
  if (scope === "ordered UTF-8 sourceFiles with path-and-newline separators") {
    const files = (frontmatterField(text, "sourceFiles") || "").split(",").map((file) => file.trim()).filter(Boolean);
    if (!files.length) fail("sourceFiles is empty");
    const parts = files.map((file) => {
      const content = blobText(dir, revision, file);
      if (content === null) fail(`upstream no longer provides ${file}`);
      return `${file}\n${content}\n`;
    });
    return crypto.createHash("sha256").update(parts.join(""), "utf8").digest("hex");
  }
  if (scope === "single-source UTF-8 bytes at reviewedRevision") {
    const file = (frontmatterField(text, "url") || "").match(/\/blob\/[0-9a-f]{7,40}\/(.+)$/)?.[1];
    const content = file ? blobText(dir, revision, decodeURIComponent(file)) : null;
    if (content === null) fail(`upstream no longer provides ${file}`);
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }
  fail(`unsupported contentHashScope ${scope}`);
}

// Companion profiles (skill/references/companion-capabilities.json) recognize an installed upstream
// skill by text patterns. Each requirement whose skill folder exists upstream must still match one
// of that folder's Markdown files at the new revision; otherwise the profile would report a current
// install as missing a capability it has.
function companionProblems(root, dir, revision, profileIds) {
  const file = path.join(root, COMPANION);
  if (!profileIds?.length || !fs.existsSync(file)) return [];
  const registry = JSON.parse(fs.readFileSync(file, "utf8"));
  const tree = safeGit(dir, ["ls-tree", "-r", "--name-only", revision]).split("\n").filter(Boolean);
  const folders = new Map();
  for (const entry of tree.filter((item) => /(^|\/)SKILL(\.src)?\.md$/i.test(item))) {
    const folder = path.posix.dirname(entry);
    const name = path.posix.basename(folder);
    if (!folders.has(name) || folder.length < folders.get(name).length) folders.set(name, folder);
  }
  const texts = new Map();
  const textOf = (folder) => {
    if (!texts.has(folder)) texts.set(folder, tree.filter((item) => item.startsWith(`${folder}/`) && item.endsWith(".md")).map((item) => blobText(dir, revision, item) || "").join("\n"));
    return texts.get(folder);
  };
  const problems = [];
  for (const profile of registry.profiles.filter((item) => profileIds.includes(item.sourceMeta?.id))) {
    for (const requirement of profile.requirements || []) {
      const folder = folders.get(requirement.skill);
      if (!folder) continue;
      const text = textOf(folder);
      for (const pattern of requirement.patterns || []) {
        if (!new RegExp(pattern.source, pattern.flags || "").test(text)) problems.push(`companion profile ${profile.id} requirement ${requirement.id} expects /${pattern.source}/ in ${folder}, which ${revision.slice(0, 12)} no longer has`);
      }
    }
  }
  return problems;
}

// Root license files (LICENSE*, LICENCE*, COPYING*, NOTICE*) by name -> blob id; null when the
// revision is not available locally.
const ROOT_LICENSE = /^(licen[cs]e|copying|notice)([._-].*)?$/i;

function rootLicenses(dir, revision) {
  const listing = safeGit(dir, ["ls-tree", revision], { allowFailure: true });
  if (listing === null) return null;
  return new Map(listing.split("\n").filter(Boolean).map((line) => line.match(/^\d+ blob ([0-9a-f]{40,64})\t(.+)$/)).filter((match) => match && ROOT_LICENSE.test(match[2])).map((match) => [match[2], match[1]]));
}

// Every move is checked for a license change at the repository root, cited or not.
function rootLicenseProblems(dir, from, to) {
  const before = rootLicenses(dir, from);
  const after = rootLicenses(dir, to);
  if (!before) return [`the locked revision ${from.slice(0, 12)} is no longer fetchable, so its root license files cannot be compared with ${to.slice(0, 12)}`];
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changed = names.filter((name) => before.get(name) !== after.get(name)).map((name) => (!before.has(name) ? `${name} added` : !after.has(name) ? `${name} removed` : `${name} changed`));
  return changed.length ? [`root license files differ between ${from.slice(0, 12)} and ${to.slice(0, 12)} (${changed.join(", ")}); review the license before bumping`] : [];
}

function walkFiles(root, relative = "") {
  if (!fs.existsSync(path.join(root, relative))) return [];
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((item) => {
    const child = relative ? `${relative}/${item.name}` : item.name;
    return item.isDirectory() ? walkFiles(root, child) : [child];
  });
}

// Hex identity leaves of a manifest that later files may quote: source, index, pack, snapshot and
// fetched ids. Per-file object ids are excluded; they are not quoted outside the bundle.
function manifestIdentities(manifest) {
  const leaves = new Map();
  const visit = (value, trail) => {
    if (typeof value === "string" && /^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(value)) leaves.set(trail, value);
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, item] of Object.entries(value)) if (!["objects", "executableFiles", "build"].includes(key)) visit(item, `${trail}.${key}`);
    }
  };
  if (!manifest) return leaves;
  for (const key of ["source", "index", "snapshot", "fetched"]) visit(manifest[key], key);
  for (const pack of manifest.packs || []) visit(pack, `packs.${pack.id}`);
  return leaves;
}

function hexReplacer(map) {
  const keys = [...map.keys()].filter((key) => key !== map.get(key)).sort((left, right) => right.length - left.length);
  if (!keys.length) return (text) => text;
  const pattern = new RegExp(`(?<![0-9a-fA-F])(${keys.map(escapeRegExp).join("|")})(?![0-9a-fA-F])`, "g");
  return (text) => text.replace(pattern, (match) => map.get(match));
}

function bundleEntries(lock, bundle) {
  return lock.sources.filter((entry) => BUNDLE_KINDS.has(entry.kind) && entry.bundle === bundle);
}

function runImporter(root, entries, checkouts, today, tempRoot) {
  const [script, ...template] = entries[0].importer;
  const sourceRoot = path.join(tempRoot, `bundle-${entries[0].bundle}`);
  if (template.includes("{sourceRoot}")) {
    fs.mkdirSync(sourceRoot, { recursive: true });
    for (const entry of entries) {
      const name = entry.repo.split("/").pop();
      fs.symlinkSync(checkouts.get(entry.id), path.join(sourceRoot, name), "dir");
    }
  }
  const args = template.map((part) => part.replace("{source}", checkouts.get(entries[0].id) || "").replace("{sourceRoot}", sourceRoot));
  const child = spawnSync(process.execPath, [path.join(root, script), ...args, "--reviewed-at", today], { cwd: root, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (child.status !== 0) fail(`${script} failed: ${String(child.stderr || child.stdout).trim().split("\n").slice(-3).join(" ")}`);
  return child.stdout.trim();
}

// Removed bundle files that our tracked files still cite: by full vendored path, or by their last two
// path segments (guides abbreviate, for example `ID/better-colors/contrast.md`). An exhaustive
// package-resources listing is regenerated, so it does not count as a citation.
function citedRemovals(root, bundle, files, removed, ignoreResources) {
  const texts = files
    .filter((file) => !file.startsWith(`skill/vendor/${bundle}/`) && !(ignoreResources && file === RESOURCES))
    .map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]);
  const lost = [];
  for (const stored of removed) {
    const parts = stored.split("/");
    const needles = [`vendor/${bundle}/upstream/${stored}`, ...(parts.length >= 2 ? [parts.slice(-2).join("/")] : [])];
    const citing = texts.filter(([, text]) => needles.some((needle) => text.includes(needle))).map(([file]) => file);
    if (citing.length) lost.push(`vendor/${bundle}/upstream/${stored} (cited by ${citing.join(", ")})`);
  }
  return lost;
}

// skill/references/package-resources.json lists some bundles file by file. When a bundle's listing
// was exhaustive before the import, it is rewritten to the new file set (sorted as the file keeps
// them); a partial listing names load-bearing files only and stays, guarded by the removal check.
const RESOURCES = "skill/references/package-resources.json";

function listedBundleFiles(root, bundle) {
  const file = path.join(root, RESOURCES);
  if (!fs.existsSync(file)) return null;
  const prefix = `vendor/${bundle}/upstream/`;
  return JSON.parse(fs.readFileSync(file, "utf8")).required.filter((item) => item.startsWith(prefix)).map((item) => item.slice(prefix.length));
}

function rewriteBundleResources(root, bundle, files) {
  const file = path.join(root, RESOURCES);
  const prefix = `vendor/${bundle}/upstream/`;
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const indices = lines.map((line, index) => (line.trim().startsWith(`"${prefix}`) ? index : -1)).filter((index) => index >= 0);
  if (!indices.length) return;
  const indent = lines[indices[0]].match(/^\s*/)[0];
  const sorted = [...files].sort((left, right) => left.localeCompare(right, "en"));
  const block = sorted.map((item) => `${indent}${JSON.stringify(prefix + item)},`);
  const kept = lines.filter((line, index) => !indices.includes(index) || index === indices[0]);
  const at = kept.indexOf(lines[indices[0]]);
  kept.splice(at, 1, ...block);
  let next = kept.join("\n");
  next = next.replace(/,\n(\s*)\]/g, "\n$1]");
  JSON.parse(next);
  fs.writeFileSync(file, next);
}

function update(options) {
  const root = options.root;
  const lock = readLock(root);
  const today = options.today;
  const report = { bumped: [], current: [], held: [], failed: [], removed: [], npm: [] };
  let selected = lock.sources;
  if (options.only) {
    const unknown = options.only.filter((id) => !lock.sources.some((entry) => entry.id === id));
    if (unknown.length) fail(`unknown source id: ${unknown.join(", ")}`);
    const chosen = lock.sources.filter((entry) => options.only.includes(entry.id));
    // Entries that share a repository or a bundle move together.
    selected = lock.sources.filter((entry) => chosen.some((item) => (repoKey(item.repo) && repoKey(item.repo) === repoKey(entry.repo)) || (item.bundle && item.bundle === entry.bundle)));
  }

  // Resolve targets per repository (and per npm package).
  const groups = new Map();
  for (const entry of selected) {
    const key = repoKey(entry.repo) || `${entry.kind}:${entry.package}`;
    if (!groups.has(key)) groups.set(key, { key, entries: [] });
    groups.get(key).entries.push(entry);
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-sources-"));
  const replacements = new Map();
  const touchedBundles = new Set();
  const adaptedDates = [];
  const lockUpdates = new Map();
  const files = pinFiles(root);
  const pins = collectPins(root, files);
  try {
    for (const group of groups.values()) {
      const held = group.entries.find((entry) => entry.held);
      const npmEntry = group.entries.find((entry) => VERSIONED.has(entry.kind));
      let target = null;
      let version = null;
      try {
        if (npmEntry) {
          version = latestRelease(npmEntry);
          if (npmEntry.repo) target = lsRemote(npmEntry.repo, `refs/tags/${releaseTag(npmEntry.tag, version)}`);
        } else target = lsRemote(group.entries[0].repo, "HEAD");
      } catch (error) {
        for (const entry of group.entries) report.failed.push({ id: entry.id, reason: error.message });
        continue;
      }
      const current = group.entries[0].revision;
      const behind = (target && target !== current) || (version && version !== npmEntry.version);
      if (held) {
        for (const entry of group.entries) report.held.push({ id: entry.id, at: entry.version || entry.revision, latest: version || target, issue: entry.held.issue, reason: entry.held.reason });
        continue;
      }
      if (!behind && !options.reimport) {
        // Unchanged upstream: nothing is written, not even a review date, so a quiet week is no diff.
        for (const entry of group.entries) report.current.push({ id: entry.id, at: entry.version || entry.revision });
        continue;
      }
      if (options.dryRun) {
        for (const entry of group.entries) report.bumped.push({ id: entry.id, from: entry.version || entry.revision, to: version || target, dryRun: true });
        continue;
      }
      try {
        const groupReplacements = new Map();
        const updates = new Map();
        if (target) {
          const repoPins = pins.filter((pin) => pin.repo === group.key);
          const oldRevisions = [...new Set([current, ...repoPins.map((pin) => pin.revision)])];
          const checkout = group.entries.some((entry) => BUNDLE_KINDS.has(entry.kind)) ? target : null;
          const fetched = fetchRepository(group.entries[0].repo, path.join(tempRoot, group.key.replace("/", "__")), [target, ...oldRevisions.filter((revision) => revision.length === 40)], checkout);
          const committedAt = safeGit(fetched.dir, ["show", "-s", "--format=%cI", target]);
          // Cited paths must still exist; cited license texts must be unchanged.
          const problems = [];
          for (const pin of repoPins.filter((item) => item.path)) {
            const at = pin.path.replace(/\/$/, "");
            if (!objectType(fetched.dir, target, at)) problems.push(`${pin.file} cites ${at}, which ${target.slice(0, 12)} no longer has`);
            else if (LICENSE_PATH.test(at) && pin.revision.length === 40 && !fetched.missing.includes(pin.revision)) {
              const before = objectId(fetched.dir, pin.revision, at);
              const after = objectId(fetched.dir, target, at);
              if (before && before !== after) problems.push(`${at} changed between ${pin.revision.slice(0, 12)} and ${target.slice(0, 12)} (cited by ${pin.file}); review the license before bumping`);
            }
          }
          problems.push(...rootLicenseProblems(fetched.dir, current, target));
          problems.push(...companionProblems(root, fetched.dir, target, [...new Set(group.entries.flatMap((entry) => entry.profiles || []))]));
          if (problems.length) fail([...new Set(problems)].join("; "));
          for (const revision of oldRevisions) groupReplacements.set(revision, revision.length === 40 ? target : target.slice(0, revision.length));
          for (const entry of group.entries) updates.set(entry.id, { revision: target, committedAt, reviewedAt: today, ...(version ? { version } : {}) });

          for (const entry of group.entries.filter((item) => item.profiles && !item.documents)) adaptedDates.push(entry);
          for (const entry of group.entries.filter((item) => item.kind === "adapted-reference")) {
            for (const document of entry.documents) {
              const text = fs.readFileSync(path.join(root, document), "utf8");
              const before = frontmatterField(text, "reviewedContentHash");
              const after = adaptedHash(fetched.dir, target, text);
              if (before && before !== after) groupReplacements.set(before, after);
            }
            adaptedDates.push(entry);
          }
          group.fetched = fetched;
        } else updates.set(npmEntry.id, { version, reviewedAt: today });
        group.replacements = groupReplacements;
        group.updates = updates;
        group.version = version;
        group.target = target;
      } catch (error) {
        for (const entry of group.entries) report.failed.push({ id: entry.id, reason: error.message });
        group.failed = true;
      }
    }

    // Re-import every bundle whose repositories all moved cleanly.
    const bundles = [...new Set(selected.filter((entry) => BUNDLE_KINDS.has(entry.kind) && !entry.held).map((entry) => entry.bundle))];
    for (const bundle of bundles) {
      const members = bundleEntries(lock, bundle);
      const memberGroups = members.map((entry) => groups.get(repoKey(entry.repo))).filter(Boolean);
      if (memberGroups.some((group) => group.failed) || !memberGroups.some((group) => group.updates)) continue;
      const vendorDir = path.join(root, "skill", "vendor", bundle);
      const backup = path.join(tempRoot, `backup-${bundle}`);
      const beforeManifest = manifestFor(root, members[0]);
      const beforeFiles = new Set(walkFiles(path.join(vendorDir, "upstream")));
      const listed = listedBundleFiles(root, bundle);
      const exhaustive = listed && listed.length > 0 && listed.length === beforeFiles.size && listed.every((file) => beforeFiles.has(file));
      try {
        // Members that stayed current still need a checkout of their locked revision.
        const checkouts = new Map();
        for (const entry of members) {
          const group = groups.get(repoKey(entry.repo));
          if (group?.fetched && group.target) checkouts.set(entry.id, group.fetched.dir);
          else {
            const dir = path.join(tempRoot, `current-${entry.id}`);
            fetchRepository(entry.repo, dir, [entry.revision], entry.revision);
            checkouts.set(entry.id, dir);
          }
        }
        if (fs.existsSync(vendorDir)) fs.cpSync(vendorDir, backup, { recursive: true });
        const output = runImporter(root, members, checkouts, today, tempRoot);
        const afterFiles = new Set(walkFiles(path.join(vendorDir, "upstream")));
        const removed = [...beforeFiles].filter((file) => !afterFiles.has(file)).sort();
        const lost = citedRemovals(root, bundle, files, removed, exhaustive);
        if (lost.length) fail(`upstream removed or moved files we cite: ${lost.join("; ")}`);
        if (removed.length) report.removed.push({ bundle, files: removed });
        if (exhaustive) rewriteBundleResources(root, bundle, [...afterFiles]);
        // Files derived from the bundle manifest (for example the MengTo discovery projection).
        for (const script of [...new Set(members.flatMap((entry) => entry.derive || []))]) {
          const child = spawnSync(process.execPath, [path.join(root, script), root], { cwd: root, encoding: "utf8", windowsHide: true });
          if (child.status !== 0) fail(`${script} failed: ${String(child.stderr || child.stdout).trim()}`);
        }
        const afterManifest = manifestFor(root, members[0]);
        const before = manifestIdentities(beforeManifest);
        for (const [trail, value] of manifestIdentities(afterManifest)) {
          const old = before.get(trail);
          if (old && old !== value) groups.get(repoKey(members[0].repo)).replacements.set(old, value);
        }
        for (const entry of members) {
          if (entry.excludedFromBundle) continue;
          const hashes = { treeSha256: afterManifest.snapshot.treeSha256, ...(afterManifest.fetched ? { fetchedTreeSha256: afterManifest.fetched.treeSha256 } : {}) };
          const group = groups.get(repoKey(entry.repo));
          if (group?.updates?.has(entry.id)) Object.assign(group.updates.get(entry.id), hashes);
          else lockUpdates.set(entry.id, { ...(lockUpdates.get(entry.id) || {}), ...hashes });
        }
        touchedBundles.add(bundle);
        report.bumped.push({ bundle, importer: output });
      } catch (error) {
        if (fs.existsSync(backup)) {
          fs.rmSync(vendorDir, { recursive: true, force: true });
          fs.cpSync(backup, vendorDir, { recursive: true });
        }
        for (const entry of members) {
          const group = groups.get(repoKey(entry.repo));
          if (group) group.failed = true;
          report.failed.push({ id: entry.id, reason: error.message });
        }
      }
    }

    // Apply derived pins of every group that succeeded.
    for (const group of groups.values()) {
      if (group.failed || !group.updates) continue;
      for (const [key, value] of group.replacements) replacements.set(key, value);
      for (const [id, value] of group.updates) {
        lockUpdates.set(id, value);
        const entry = lock.sources.find((item) => item.id === id);
        report.bumped.push({ id, from: entry.version || entry.revision, to: value.version || value.revision });
      }
    }
    const replace = hexReplacer(replacements);
    const skip = (file) => [...touchedBundles].some((bundle) => file.startsWith(`skill/vendor/${bundle}/`));
    for (const file of files) {
      if (skip(file)) continue;
      const absolute = path.join(root, file);
      const text = fs.readFileSync(absolute, "utf8");
      let next = replace(text);
      // A review date written right after a rewritten revision moves with it ("at `<sha>`, checked
      // 2026-10-07", "reviewed on 2026-10-09"). Dates elsewhere are history and stay.
      for (const value of [...replacements.values()].filter((item) => item.length === 40)) {
        next = next.replace(new RegExp(`(${value}[^\\n]{0,60}?(?:reviewed|checked|reviewed on|on)\\s+)\\d{4}-\\d{2}-\\d{2}(?!T)`, "g"), `$1${today}`);
      }
      if (next !== text) fs.writeFileSync(absolute, next);
    }
    // Adapted references record when they were last confirmed current.
    const companionFile = path.join(root, COMPANION);
    const companion = fs.existsSync(companionFile) ? JSON.parse(fs.readFileSync(companionFile, "utf8")) : null;
    for (const entry of adaptedDates) {
      if (groups.get(repoKey(entry.repo))?.failed) continue;
      for (const document of entry.documents || []) {
        const absolute = path.join(root, document);
        const text = fs.readFileSync(absolute, "utf8");
        const next = text.replace(/^(---\r?\n[\s\S]*?^\s*reviewedAt:\s*)\d{4}-\d{2}-\d{2}(T[0-9:.]+Z)?/m, (match, head, time) => `${head}${today}${time ? "T00:00:00.000Z" : ""}`);
        if (next !== text) fs.writeFileSync(absolute, next);
      }
      for (const profile of companion?.profiles || []) {
        if ((entry.profiles || []).includes(profile.sourceMeta?.id)) profile.sourceMeta.reviewedAt = `${today}T00:00:00.000Z`;
      }
    }
    if (companion && adaptedDates.length) fs.writeFileSync(companionFile, `${JSON.stringify(companion, null, 2)}\n`);

    // npm sites.
    let packageJsonChanged = false;
    for (const group of groups.values()) {
      const npmEntry = group.entries.find((entry) => VERSIONED.has(entry.kind));
      if (!npmEntry || group.failed || !group.version || group.version === npmEntry.version) continue;
      // A site whose pattern also matches some other version is too broad to rewrite safely.
      const broad = npmEntry.sites.filter((site) => site.pattern).flatMap((site) => (npmSiteVersions(root, site).versions || []).filter((found) => found !== npmEntry.version).map((found) => `${site.file} "${site.pattern}" also matches ${found}`));
      if (broad.length) {
        report.failed.push({ id: npmEntry.id, reason: `version sites are ambiguous: ${broad.join("; ")}` });
        lockUpdates.delete(npmEntry.id);
        report.bumped = report.bumped.filter((item) => item.id !== npmEntry.id);
        continue;
      }
      for (const site of npmEntry.sites) {
        const absolute = path.join(root, site.file);
        if (site.json) {
          const data = JSON.parse(fs.readFileSync(absolute, "utf8"));
          const found = jsonSite(data, site.json);
          if (!found) fail(`${site.file} has no ${site.json}`);
          found.parent[found.key] = `${String(found.value).match(/^[\^~=]?/)[0]}${group.version}`;
          fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`);
          if (path.basename(site.file) === "package.json") packageJsonChanged = true;
        } else {
          fs.writeFileSync(absolute, replaceSiteVersion(fs.readFileSync(absolute, "utf8"), site.pattern, group.version));
        }
      }
      report.npm.push({ id: npmEntry.id, package: npmEntry.package || npmEntry.repo, from: npmEntry.version, to: group.version });
    }
    if (packageJsonChanged && options.npm) {
      const child = spawnSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: root, encoding: "utf8", windowsHide: true, shell: process.platform === "win32" });
      if (child.status !== 0) report.failed.push({ id: "package-lock", reason: String(child.stderr).trim().split("\n").slice(-3).join(" ") });
    }

    if (!options.dryRun) {
      for (const entry of lock.sources) Object.assign(entry, lockUpdates.get(entry.id) || {});
      writeLock(root, lock);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  return report;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write("Usage: node scripts/sources-update.cjs [--only <id>[,<id>]] [--dry-run] [--reimport] [--today YYYY-MM-DD] [--no-npm-install]\n");
    } else {
      const report = update(options);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      for (const failure of report.failed) process.stderr.write(`FAIL ${failure.id}: ${failure.reason}\n`);
      for (const item of report.held) process.stderr.write(`HELD ${item.id} at ${item.at} (latest ${item.latest}): ${item.issue}\n`);
      if (report.failed.length) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`FAIL ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { adaptedHash, companionProblems, hexReplacer, latestRelease, lsRemote, manifestIdentities, update };
