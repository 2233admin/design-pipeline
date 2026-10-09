#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

const destination = path.resolve(__dirname, "../skill/vendor/good-css");
const repository = "https://github.com/vojtaholik/good-css";
const reviewedRevision = "6d16d2fd27f4892e2aea4b5c5c2b016f45be7eef";

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
  for (const file of ["LICENSE", "PRACTICES.md", "skills/good-css/SKILL.md"]) {
    if (!fs.existsSync(path.join(source, file))) fail(`source is not a complete vojtaholik/good-css checkout: missing ${file}`);
  }
  const checkout = inspectCheckout(source);
  const license = checkout.blobs.get("LICENSE")?.toString("utf8") || "";
  if (!license.startsWith("MIT License") || !license.includes("Copyright (c) 2026 Vojta Holik")) fail("source LICENSE does not match reviewed good-css MIT attribution");
  if (checkout.revision !== reviewedRevision) fail(`source revision must be the reviewed ${reviewedRevision}; received ${checkout.revision}`);
  const files = checkout.indexEntries.map((entry) => entry.path);
  const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let category;
  const practices = [];
  for (const heading of checkout.blobs.get("PRACTICES.md").toString("utf8").matchAll(/^(##|###) (.+)$/gm)) {
    if (heading[1] === "##") category = slugify(heading[2]);
    else {
      const slug = slugify(heading[2]);
      const specimen = `harness/demos/${slug}.html`;
      if (!files.includes(specimen)) fail(`missing practice specimen: ${specimen}`);
      practices.push({ slug, title: heading[2].trim(), category, source: `upstream/PRACTICES.md#${slug}`, reference: `upstream/skills/good-css/references/${category}.md`, specimen: `upstream/${specimen}` });
    }
  }
  const references = files.filter((file) => /^skills\/good-css\/references\/[^/]+\.md$/.test(file));
  if (files.length !== 133 || practices.length !== 47 || references.length !== 8) fail("reviewed source inventory does not match 133 files, 47 practices and 8 references");

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".good-css-stage-"));
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream);
    copyTrackedFiles(upstream, checkout.indexEntries, checkout.blobs);
    manifest = {
      schema: "design-pipeline.good-css-source.v1",
      source: { repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt, license: "MIT", reviewedAt, scope: ["**"] },
      licenses: [
        { path: "upstream/LICENSE", license: "MIT", copyright: "Copyright (c) 2026 Vojta Holik" },
        { path: "upstream/harness/public/fonts/Inter-OFL.txt", license: "OFL-1.1", copyright: "Copyright (c) 2016 The Inter Project Authors" },
        { path: "upstream/harness/public/fonts/GeistMono-OFL.txt", license: "OFL-1.1", copyright: "Copyright 2024 The Geist Project Authors" },
      ],
      snapshot: {
        root: "upstream", fileCount: files.length,
        byteCount: checkout.indexEntries.reduce((sum, entry) => sum + entry.size, 0),
        treeSha256: canonicalTree(upstream, files),
        executableFiles: checkout.indexEntries.filter((entry) => entry.mode === "100755").map((entry) => entry.path).sort(),
        objects: checkout.indexEntries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size })),
      },
      practices,
      boundary: { mode: "built-in-reference-adaptation", installsUpstreamDependencies: false, executesDeployment: false, changesProjectRuntime: false },
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
  if (options.help) process.stdout.write("Usage: node scripts/import-good-css.cjs --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n");
  else {
    const manifest = importSnapshot(options.source, options.reviewedAt);
    process.stdout.write(`${JSON.stringify({ status: "imported", revision: manifest.source.revision, files: manifest.snapshot.fileCount, practices: manifest.practices.length, treeSha256: manifest.snapshot.treeSha256 })}\n`);
  }
} catch (error) {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
}
