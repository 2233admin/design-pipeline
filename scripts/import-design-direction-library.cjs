#!/usr/bin/env node
"use strict";

// Imports the MIT-licensed reference design skill (https://github.com/alchaincyf/huashu-design) as the
// design direction library. This is the only repository file besides THIRD_PARTY_NOTICES.md and the
// vendored folder that may name the upstream project (scripts/reference-name-scope.cjs).
//
// Text and HTML specimens are copied into skill/vendor/<upstream>/upstream/ (shipped). Binaries and
// everything else are recorded with SHA-256 in the manifest's `fetched` section and downloaded on
// demand by `designer-pipeline sources fetch` (skill/scripts/vendor-cache.cjs). Upstream scripts are
// stored as inert reference material and never run.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

const destination = path.resolve(__dirname, "../skill/vendor/huashu-design");
const repository = "https://github.com/alchaincyf/huashu-design";
const copyright = "Copyright (c) 2026 alchaincyf (花叔 · 花生)";
const reviewed = {
  revision: "798c4235ebff03d5c45e3c8affdf5e9d18f9dfa7",
  gitTree: "cf7e7baaf14ed1331ee1bb06cff2bc8e1af344de",
  shippedTreeSha256: "00f8af6104de1fed3f732dab5cda61fa60acd6e052490fdb6e169e9912c63542",
  fetchedTreeSha256: "94c0ed573aea3620ecba6d304c9fcfa2a38cdd4a24c1301f8973055fef74b573",
  shipped: { files: 181, bytes: 1594218 },
  fetched: { files: 208, bytes: 40136313 },
  specimens: 84,
};

const rootTexts = new Set(["LICENSE", "README.md", "README.en.md", "SECURITY.md", "SKILL.md", "test-prompts.json"]);
const textExtension = /\.(md|html|jsx|js|mjs|cjs|py|sh|json|svg|txt)$/i;

// Which scope may ship: reference text, the HTML specimens, small text assets, inert scripts.
function inShippedScope(file) {
  if (rootTexts.has(file)) return true;
  if (file.startsWith("references/")) return true;
  if (/^assets\/style-specimens\/[^/]+\/[^/]+\.html$/.test(file)) return true;
  if (/^assets\/[^/]+\.(jsx|js|svg|json|html)$/.test(file)) return true;
  if (file === "assets/showcases/INDEX.md") return true;
  if (/^assets\/director-notes-samples\/[^/]+\.md$/.test(file)) return true;
  if (file.startsWith("scripts/")) return true;
  return false;
}

function isText(content) {
  if (content.includes(0)) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(content); return true; } catch { return false; }
}

const sha256 = (content) => crypto.createHash("sha256").update(content).digest("hex");

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (token !== "--source" && token !== "--reviewed-at") fail(`unknown option: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) fail(`${token} requires a value`);
    options[token.slice(2)] = value;
  }
  if (!options.source) fail("--source is required");
  const date = options["reviewed-at"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { source: path.resolve(options.source), reviewedAt: date };
}

function treeSha256(entries, blobs) {
  const lines = entries.map((entry) => entry.path).sort().map((file) => `${file}\0${sha256(blobs.get(file))}\n`);
  return sha256(lines.join(""));
}

function section(entries, blobs, root) {
  const objects = entries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size, sha256: sha256(blobs.get(file)) }));
  return {
    root,
    fileCount: objects.length,
    byteCount: objects.reduce((sum, object) => sum + object.size, 0),
    treeSha256: treeSha256(entries, blobs),
    executableFiles: objects.filter((object) => object.mode === "100755").map((object) => object.path).sort(),
    objects,
  };
}

function importSnapshot(source, reviewedAt) {
  const checkout = inspectCheckout(source);
  if (checkout.revision !== reviewed.revision) fail(`source revision must be the reviewed ${reviewed.revision}; received ${checkout.revision}`);
  if (checkout.gitTree !== reviewed.gitTree) fail("source Git tree does not match the reviewed tree");
  const license = checkout.blobs.get("LICENSE")?.toString("utf8") || "";
  if (!license.startsWith("MIT License") || !license.includes(copyright)) fail("source LICENSE does not match the reviewed MIT attribution");
  for (const file of ["SKILL.md", "README.md", "references/design-styles.md", "references/directions.md"]) {
    if (!checkout.blobs.has(file)) fail(`source is not a complete reference checkout: missing ${file}`);
  }

  const shippedEntries = [];
  const fetchedEntries = [];
  for (const entry of checkout.indexEntries) {
    // A scoped file that is not UTF-8 text (a PNG fixture beside the scripts) is fetched, not shipped.
    const ships = inShippedScope(entry.path) && (entry.path === "LICENSE" || textExtension.test(entry.path)) && isText(checkout.blobs.get(entry.path));
    (ships ? shippedEntries : fetchedEntries).push(entry);
  }
  const specimenFiles = shippedEntries.map((entry) => entry.path).filter((file) => /^assets\/style-specimens\/[^/]+\/[^/]+\.html$/.test(file));
  if (specimenFiles.length !== reviewed.specimens) fail(`expected ${reviewed.specimens} HTML specimens; found ${specimenFiles.length}`);
  const fetchedPaths = new Set(fetchedEntries.map((entry) => entry.path));
  const specimens = specimenFiles.map((file) => {
    const [, family, name] = file.match(/^assets\/style-specimens\/([^/]+)\/([^/]+)\.html$/);
    const preview = `assets/style-specimens/${family}/${name}.jpg`;
    const title = checkout.blobs.get(file).toString("utf8").match(/<title>([^<]*)<\/title>/)?.[1]?.trim() || name;
    return { id: `${family}/${name}`, family, title, path: `upstream/${file}`, preview: fetchedPaths.has(preview) ? preview : null };
  });

  const shipped = section(shippedEntries, checkout.blobs, "upstream");
  const fetched = section(fetchedEntries, checkout.blobs, "fetched");
  if (shipped.treeSha256 !== reviewed.shippedTreeSha256 || fetched.treeSha256 !== reviewed.fetchedTreeSha256) fail(`content does not match the reviewed hashes (shipped ${shipped.treeSha256}, fetched ${fetched.treeSha256})`);
  if (shipped.fileCount !== reviewed.shipped.files || shipped.byteCount !== reviewed.shipped.bytes || fetched.fileCount !== reviewed.fetched.files || fetched.byteCount !== reviewed.fetched.bytes) fail(`reviewed inventory does not match (shipped ${shipped.fileCount} files ${shipped.byteCount} bytes, fetched ${fetched.fileCount} files ${fetched.byteCount} bytes)`);
  if (checkout.indexEntries.length !== shipped.fileCount + fetched.fileCount) fail("shipped and fetched files must cover the whole tree");

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".direction-library-stage-"));
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream);
    copyTrackedFiles(upstream, shippedEntries, checkout.blobs);
    manifest = {
      schema: "design-pipeline.direction-library-source.v1",
      bundle: "design-direction-library",
      source: { repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt, license: "MIT", reviewedAt, scope: ["**"] },
      licenses: [{ path: "upstream/LICENSE", license: "MIT", copyright }],
      snapshot: shipped,
      fetched,
      specimens,
      boundary: {
        mode: "reference-material",
        inertScripts: "upstream/scripts/**",
        installsUpstreamDependencies: false,
        executesUpstreamScripts: false,
        changesProjectRuntime: false,
      },
    };
    for (const entry of shippedEntries) {
      if (!fs.existsSync(path.join(upstream, ...storedPath(entry.path).split("/")))) fail(`stage is missing ${entry.path}`);
    }
    fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    if (fs.existsSync(destination)) { fs.renameSync(destination, backup); movedOld = true; }
    fs.renameSync(stage, destination);
  } catch (error) {
    if (!fs.existsSync(destination) && movedOld && fs.existsSync(backup)) fs.renameSync(backup, destination);
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  if (movedOld) fs.rmSync(backup, { recursive: true, force: true });
  return manifest;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) process.stdout.write("Usage: node scripts/import-design-direction-library.cjs --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n");
  else {
    const manifest = importSnapshot(options.source, options.reviewedAt);
    process.stdout.write(`${JSON.stringify({ status: "imported", revision: manifest.source.revision, shipped: manifest.snapshot.fileCount, fetched: manifest.fetched.fileCount, specimens: manifest.specimens.length })}\n`);
  }
} catch (error) {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
}
