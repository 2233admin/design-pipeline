#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

const destination = path.resolve(__dirname, "../skill/vendor/gepa");
const repository = "https://github.com/gepa-ai/gepa";
const reviewedRevision = "462e437a09be67d2acb59564cc0ea59132f5777c";
const reviewedGitTree = "105cafea9959b259f1fa63ca0b5b375bcc611b9e";
const reviewedTreeSha256 = "c8bc85080ff2179e42879d573a29fa4f7d779e179da67a9d37528b8d2cfc2795";
const skillPrefix = ".claude/skills/gepa-optimize-anything/";
const rootFiles = ["LICENSE", "README.md", "pyproject.toml"];
const copyright = "Copyright © 2025 Lakshya A Agrawal";

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

function importSnapshot(source, reviewedAt) {
  for (const file of [...rootFiles, `${skillPrefix}SKILL.md`]) {
    if (!fs.existsSync(path.join(source, file))) fail(`source is not a complete gepa-ai/gepa checkout: missing ${file}`);
  }
  const checkout = inspectCheckout(source);
  const license = checkout.blobs.get("LICENSE")?.toString("utf8") || "";
  if (!license.startsWith(copyright) || !license.includes("Permission is hereby granted, free of charge")) fail("source LICENSE does not match reviewed GEPA MIT attribution");
  if (checkout.revision !== reviewedRevision) fail(`source revision must be the reviewed ${reviewedRevision}; received ${checkout.revision}`);
  if (checkout.gitTree !== reviewedGitTree) fail("source Git tree does not match reviewed GEPA root tree");
  const entries = checkout.indexEntries.filter(entry => entry.path.startsWith(skillPrefix) || rootFiles.includes(entry.path));
  const files = entries.map(entry => entry.path);
  const byteCount = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (files.length !== 10 || byteCount !== 107619 || files.filter(file => file.startsWith(skillPrefix)).length !== 7) fail("reviewed scoped source inventory does not match 10 files, 107619 bytes and 7 official skill files");

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".gepa-stage-"));
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream);
    copyTrackedFiles(upstream, entries, checkout.blobs);
    const treeSha256 = canonicalTree(upstream, files);
    if (treeSha256 !== reviewedTreeSha256) fail("source content does not match reviewed GEPA scoped tree hash");
    manifest = {
      schema: "design-pipeline.gepa-source.v1",
      source: {
        repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt,
        license: "MIT", reviewedAt, scope: [`${skillPrefix}**`, ...rootFiles],
        contentHashScope: "selected official skill and root metadata: sorted POSIX path, NUL, SHA-256 blob hash, newline; gitTree is the upstream repository root, not this scoped snapshot",
      },
      licenses: [{ path: "upstream/LICENSE", license: "MIT", copyright }],
      snapshot: {
        root: "upstream", fileCount: files.length, byteCount, treeSha256,
        executableFiles: entries.filter(entry => entry.mode === "100755").map(entry => entry.path).sort(),
        objects: entries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size })),
      },
      skills: [{ name: "gepa-optimize-anything", path: `upstream/${skillPrefix}SKILL.md` }],
      boundary: { mode: "built-in-reference-adaptation", installsUpstreamDependencies: false, executesUpstreamScripts: false, executesDeployment: false, changesProjectRuntime: false },
    };
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
  if (options.help) process.stdout.write("Usage: node scripts/import-gepa.cjs --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n");
  else {
    const manifest = importSnapshot(options.source, options.reviewedAt);
    process.stdout.write(`${JSON.stringify({ status: "imported", revision: manifest.source.revision, files: manifest.snapshot.fileCount, treeSha256: manifest.snapshot.treeSha256 })}\n`);
  }
} catch (error) {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
}
