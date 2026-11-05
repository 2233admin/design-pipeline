#!/usr/bin/env node
"use strict";

// Re-imports a vendored bundle whose manifest records its own scope and hash layout (interface
// discipline, Prism, deepclonewebsite, shadcnio, Holosticker). The bundle's existing manifest
// supplies the scope and every hand-maintained field (skills, routes, index, capabilities); this
// script replaces the copied files and recomputes only the integrity fields: revision, Git tree,
// commit time, file and byte counts, the SHA-256 tree hash and the bundle's extra Git ids. Upstream
// files are copied as data and never executed. Called by scripts/sources-update.cjs.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

// order: how the tree hash sorts paths ("bytes" = code-unit order, "locale" = localeCompare "en").
// remap: [upstream prefix, stored prefix]. lineEndings "LF": the tree hash and byte count read text
// with CRLF folded to LF (the stored bytes stay as upstream wrote them).
const BUNDLES = {
  "interface-discipline": { order: "bytes", requires: ["LICENSE", "skills/interface-review/SKILL.md"] },
  "prism-system": {
    order: "bytes",
    remap: ["packages/tokens/.agents/skills/", "skills/"],
    skillsTree: "packages/tokens/.agents/skills",
    licenseBlob: "LICENSE",
    requires: ["LICENSE", "packages/tokens/.agents/skills/README.md"],
  },
  deepclonewebsite: { order: "bytes", lineEndings: "LF", requires: ["LICENSE", "open-lovable/lib/crawl/site-crawler.ts"] },
  "shadcnio-react-components": { order: "bytes", requires: ["LICENSE", "README.md"] },
  holosticker: { order: "locale", version: "package.json", requires: ["LICENSE", "package.json"] },
};

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (!["--name", "--source", "--reviewed-at", "--vendor-root"].includes(token)) fail(`unknown option: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) fail(`${token} requires a value`);
    options[token.slice(2)] = value;
  }
  if (!Object.hasOwn(BUNDLES, options.name || "")) fail(`--name must be one of ${Object.keys(BUNDLES).join(", ")}`);
  if (!options.source) fail("--source is required");
  const date = options["reviewed-at"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { name: options.name, source: path.resolve(options.source), reviewedAt: date, vendorRoot: path.resolve(options["vendor-root"] || path.join(__dirname, "../skill/vendor")) };
}

function inScope(scope, file) {
  if (scope === "complete tracked repository") return true;
  return scope.some((pattern) => (pattern.endsWith("/**") ? file.startsWith(pattern.slice(0, -2)) : file === pattern));
}

function gitObjectId(type, content) {
  return crypto.createHash("sha1").update(`${type} ${content.length}\0`, "utf8").update(content).digest("hex");
}

// Git tree id of the tracked files below `prefix`, built from their modes and blob ids.
function subtreeId(entries, prefix) {
  const root = { children: new Map() };
  for (const entry of entries.filter((item) => item.path.startsWith(`${prefix}/`))) {
    const parts = entry.path.slice(prefix.length + 1).split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.children.has(part)) node.children.set(part, { children: new Map() });
      node = node.children.get(part);
    }
    node.children.set(parts.at(-1), entry);
  }
  const hash = (node) => {
    const items = [...node.children.entries()]
      .map(([name, child]) => ({ name, child, tree: Boolean(child.children) }))
      .sort((left, right) => Buffer.compare(Buffer.from(`${left.name}${left.tree ? "/" : ""}`), Buffer.from(`${right.name}${right.tree ? "/" : ""}`)));
    return gitObjectId("tree", Buffer.concat(items.map(({ name, child, tree }) => Buffer.concat([Buffer.from(`${tree ? "40000" : child.mode} ${name}\0`), Buffer.from(tree ? hash(child) : child.oid, "hex")]))));
  };
  return hash(root);
}

function importSnapshot({ name, source, reviewedAt, vendorRoot }) {
  const config = BUNDLES[name];
  const destination = path.join(vendorRoot, name);
  const manifestFile = path.join(destination, "manifest.json");
  if (!fs.existsSync(manifestFile)) fail(`no existing manifest to carry forward: ${manifestFile}`);
  const previous = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const scope = previous.source?.scope;
  if (scope !== "complete tracked repository" && !Array.isArray(scope)) fail(`${name} manifest has no source.scope`);
  const checkout = inspectCheckout(source, { include: (file) => inScope(scope, file) });
  for (const file of config.requires) if (!checkout.blobs.has(file)) fail(`upstream no longer provides ${file}; the ${name} import scope needs a decision`);
  for (const pattern of Array.isArray(scope) ? scope : []) {
    const present = pattern.endsWith("/**") ? checkout.indexEntries.some((entry) => entry.path.startsWith(pattern.slice(0, -2))) : checkout.blobs.has(pattern);
    if (!present) fail(`upstream no longer provides scope ${pattern} for ${name}`);
  }
  const stored = (file) => (config.remap && file.startsWith(config.remap[0]) ? `${config.remap[1]}${file.slice(config.remap[0].length)}` : file);
  const entries = checkout.indexEntries.map((entry) => ({ ...entry, path: stored(entry.path), upstreamPath: entry.path }));
  const blobs = new Map(entries.map((entry) => [entry.path, checkout.blobs.get(entry.upstreamPath)]));
  const files = entries.map((entry) => entry.path);
  if (new Set(files).size !== files.length) fail(`${name} remap produced duplicate paths`);
  files.sort(config.order === "locale" ? (left, right) => left.localeCompare(right, "en") : (left, right) => (left < right ? -1 : left > right ? 1 : 0));
  let byteCount = 0;
  const records = files.map((file) => {
    let content = blobs.get(file);
    if (config.lineEndings === "LF") content = Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
    byteCount += content.length;
    return `${file}\0${crypto.createHash("sha256").update(content).digest("hex")}\n`;
  });
  const treeSha256 = crypto.createHash("sha256").update(records.join(""), "utf8").digest("hex");

  const manifest = JSON.parse(JSON.stringify(previous));
  manifest.source.revision = checkout.revision;
  if ("gitTree" in manifest.source) manifest.source.gitTree = checkout.gitTree;
  if ("committedAt" in manifest.source) manifest.source.committedAt = checkout.committedAt;
  manifest.source.reviewedAt = reviewedAt;
  if (config.skillsTree) manifest.source.skillsTree = subtreeId(checkout.indexEntries, config.skillsTree);
  if (config.licenseBlob) manifest.source.licenseBlob = checkout.indexEntries.find((entry) => entry.path === config.licenseBlob).oid;
  if (config.version) {
    const version = JSON.parse(checkout.blobs.get(config.version).toString("utf8")).version;
    if (typeof version !== "string") fail(`${name} ${config.version} has no version`);
    manifest.source.version = version;
  }
  manifest.snapshot.fileCount = files.length;
  if ("byteCount" in manifest.snapshot) manifest.snapshot.byteCount = byteCount;
  if ("normalizedByteCount" in manifest.snapshot) manifest.snapshot.normalizedByteCount = byteCount;
  manifest.snapshot.treeSha256 = treeSha256;

  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(vendorRoot, `.${name}-stage-`));
  let movedOld = false;
  try {
    // Carry forward every non-upstream file of the bundle (for example local license copies).
    for (const item of fs.readdirSync(destination, { withFileTypes: true })) {
      if (item.name === manifest.snapshot.root || item.name === "manifest.json") continue;
      fs.cpSync(path.join(destination, item.name), path.join(stage, item.name), { recursive: true });
    }
    copyTrackedFiles(path.join(stage, manifest.snapshot.root), entries, blobs);
    for (const file of files) if (!fs.existsSync(path.join(stage, manifest.snapshot.root, ...storedPath(file).split("/")))) fail(`stage is missing ${file}`);
    fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.renameSync(destination, backup);
    movedOld = true;
    fs.renameSync(stage, destination);
  } catch (error) {
    if (!fs.existsSync(destination) && movedOld && fs.existsSync(backup)) fs.renameSync(backup, destination);
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  if (movedOld) fs.rmSync(backup, { recursive: true, force: true });
  return manifest;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) process.stdout.write(`Usage: node scripts/import-scoped-snapshot.cjs --name ${Object.keys(BUNDLES).join("|")} --source <clean-checkout> --reviewed-at YYYY-MM-DD\n`);
    else {
      const manifest = importSnapshot(options);
      process.stdout.write(`${JSON.stringify({ status: "imported", name: options.name, revision: manifest.source.revision, files: manifest.snapshot.fileCount, treeSha256: manifest.snapshot.treeSha256 })}\n`);
    }
  } catch (error) {
    process.stderr.write(`FAIL ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { BUNDLES, importSnapshot, inScope, subtreeId };
