#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { inspectCheckout, copyTrackedFiles, canonicalTree } = require("./git-tree-snapshot.cjs");
const { sha256, resolveInside } = require("../skill/scripts/contract-utils.cjs");

const REVIEWED = "57d67608ab458f57d9b153b1a2831b921e22498b";
const repo = path.resolve(__dirname, "..");
const destination = path.join(repo, "skill/vendor/huashu-art-motion");

function included(file) {
  if (!/^(references\/|scripts\/|defaults\/|schemas\/|tests\/|(?:LICENSE|README\.md|SKILL\.md|CHANGELOG\.md|CONTRIBUTING\.md|release-manifest\.json|\.gitignore|\.github\/workflows\/tests\.yml)$)/.test(file)) return false;
  // The author's portrait frames are demo-only, not reusable project assets.
  return !/^scripts\/engine\/demos\/(?:_shared\/hero\/|long_scroll\/frames\/).*\.png$/i.test(file);
}

function importSnapshot(source) {
  const checkout = inspectCheckout(path.resolve(source));
  if (checkout.revision !== REVIEWED) throw new Error(`review this revision before importing: expected ${REVIEWED}, got ${checkout.revision}`);
  const entries = checkout.indexEntries.filter(entry => included(entry.path));
  const manifest = {
    source: "https://github.com/alchaincyf/huashu-art-motion",
    sourceCommit: checkout.revision,
    gitTree: checkout.gitTree,
    files: entries.map(entry => ({ sourcePath: entry.path, localPath: `upstream/${entry.path}`, sha256: sha256(checkout.blobs.get(entry.path)) })),
    excluded: checkout.indexEntries.filter(entry => !included(entry.path)).map(entry => ({
      sourcePath: entry.path,
      reason: entry.path.startsWith("scripts/") ? "demo-only author character artwork; supply project-owned assets" : "showcase asset; retained methods use project-owned artwork",
    })),
  };
  const parent = resolveInside(repo, path.dirname(destination), "vendor parent", { mustExist: true });
  resolveInside(repo, destination, "source destination");
  const stage = fs.mkdtempSync(path.join(parent, ".huashu-stage-"));
  const backupRoot = resolveInside(repo, ".design-pipeline/huashu-complete/backups", "source backup");
  fs.mkdirSync(backupRoot, { recursive: true });
  const backup = fs.mkdtempSync(path.join(backupRoot, "source-"));
  let moved = false;
  try {
    copyTrackedFiles(path.join(stage, "upstream"), entries, checkout.blobs);
    fs.writeFileSync(path.join(stage, "LICENSE"), checkout.blobs.get("LICENSE"));
    manifest.treeSha256 = canonicalTree(stage, manifest.files.map(file => file.localPath));
    fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    if (fs.existsSync(destination)) {
      fs.renameSync(destination, path.join(backup, "huashu-art-motion"));
      moved = true;
    }
    fs.renameSync(stage, destination);
  } catch (error) {
    if (moved && !fs.existsSync(destination)) fs.renameSync(path.join(backup, "huashu-art-motion"), destination);
    throw error;
  } finally {
    // Both paths are freshly allocated within the known workspace; never delete the old source backup.
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true });
  }
  return { sourceCommit: checkout.revision, files: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.size, 0), treeSha256: manifest.treeSha256, backup };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== "--source") throw new Error("Usage: node scripts/import-huashu-art-motion.cjs --source <reviewed-local-checkout>");
    console.log(JSON.stringify(importSnapshot(process.argv[3]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { REVIEWED, included, importSnapshot };
