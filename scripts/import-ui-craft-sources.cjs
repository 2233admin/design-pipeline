#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

const CONTENT_HASH_SCOPE = "selected skill and root metadata: sorted POSIX path, NUL, SHA-256 blob hash, newline; gitTree is the upstream repository root, not this scoped snapshot";
const MIT_GRANT = "Permission is hereby granted, free of charge";

// One record per bundle; the revision comes from the checkout and sources.lock.json records it. Scope is `skills/<skill>/**` plus the listed root files.
const REVIEWED = {
  "emil-design-eng": {
    repository: "https://github.com/emilkowalski/skills",
    skill: "emil-design-eng", rootFiles: ["LICENSE"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE", copyright: "Copyright (c) 2026 Emil Kowalski" },
  },
  "make-interfaces-feel-better": {
    repository: "https://github.com/jakubkrehel/make-interfaces-feel-better",
    skill: "make-interfaces-feel-better", rootFiles: ["LICENSE", "README.md"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE", copyright: "Copyright (c) 2026 Jakub Krehel" },
  },
  "fixing-accessibility": {
    repository: "https://github.com/ibelick/ui-skills",
    skill: "fixing-accessibility", rootFiles: ["LICENSE"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE", copyright: "Copyright (c) 2026 Julien Thibeaut" },
  },
  shadcn: {
    repository: "https://github.com/shadcn-ui/ui",
    skill: "shadcn", rootFiles: ["LICENSE.md"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE.md", copyright: "Copyright (c) 2023 shadcn" },
  },
  "playwright-cli": {
    repository: "https://github.com/microsoft/playwright-cli",
    skill: "playwright-cli", rootFiles: ["LICENSE", "README.md"],
    // The copyright line is the filled-in appendix boilerplate of the Apache-2.0 text.
    license: {
      kind: "apache-file", spdx: "Apache-2.0", file: "LICENSE", copyright: "Copyright (c) Microsoft Corporation.",
      notice: "No NOTICE file exists at the reviewed revision.",
    },
  },
};

const NOTICE_NAME = /^notice(?:\.[^/]*)?$/i;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (!["--name", "--source", "--reviewed-at"].includes(token)) fail(`unknown option: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) fail(`${token} requires a value`);
    options[token.slice(2)] = value;
  }
  if (!Object.hasOwn(REVIEWED, options.name || "")) fail(`--name must be one of ${Object.keys(REVIEWED).join(", ")}`);
  if (!options.source) fail("--source is required");
  const date = options["reviewed-at"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { name: options.name, source: path.resolve(options.source), reviewedAt: date };
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { fail(`invalid quoted frontmatter value: ${trimmed}`); }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replaceAll("''", "'");
  return trimmed;
}

// Reads skill frontmatter: plain or quoted scalars, and folded (`>`, `>-`) or literal (`|`, `|-`)
// block scalars, which the reviewed make-interfaces-feel-better description uses.
function skillMetadata(text) {
  const block = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) fail("skill entry has no frontmatter");
  const lines = block[1].split(/\r?\n/);
  const value = key => {
    const index = lines.findIndex(line => line.startsWith(`${key}:`));
    if (index < 0) return null;
    const inline = lines[index].slice(key.length + 1).trim();
    const style = inline.match(/^([>|])-?$/);
    if (!style) return unquote(inline);
    const body = [];
    for (const line of lines.slice(index + 1)) {
      if (line.trim() && !/^\s/.test(line)) break;
      body.push(line.trim());
    }
    return (style[1] === ">" ? body.filter(Boolean).join(" ") : body.join("\n")).trim();
  };
  const name = value("name");
  const description = value("description");
  if (!name || !description) fail("skill entry frontmatter is missing name or description");
  return { name, description };
}

function verifyLicense(name, reviewed, checkout, trackedPaths) {
  const license = reviewed.license;
  const text = checkout.blobs.get(license.file)?.toString("utf8") || "";
  const copyrightLine = new RegExp(`^\\s*${license.copyright.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
  if (license.kind === "mit-file") {
    if (!text.startsWith("MIT License") || !text.includes(MIT_GRANT) || !copyrightLine.test(text)) fail(`source ${license.file} does not match reviewed ${name} MIT attribution`);
    return { path: `upstream/${license.file}`, license: license.spdx, copyright: license.copyright };
  }
  if (!/^\s*Apache License\r?\n\s*Version 2\.0, January 2004\r?\n/.test(text) || !text.includes("TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION") || !copyrightLine.test(text)) {
    fail(`source ${license.file} does not match reviewed ${name} Apache-2.0 license`);
  }
  const notices = trackedPaths.filter(file => NOTICE_NAME.test(path.posix.basename(file)));
  if (notices.length) fail(`reviewed ${name} record expects no NOTICE file, but the source tracks ${notices.join(", ")}`);
  return { path: `upstream/${license.file}`, license: license.spdx, copyright: license.copyright, notice: license.notice };
}

function importSnapshot(name, source, reviewedAt) {
  const reviewed = REVIEWED[name];
  const prefix = `skills/${reviewed.skill}/`;
  const entry = `${prefix}SKILL.md`;
  for (const file of [entry, ...reviewed.rootFiles]) {
    if (!fs.existsSync(path.join(source, file))) fail(`source is not a complete ${reviewed.repository} checkout: missing ${file}`);
  }
  const trackedPaths = [];
  const checkout = inspectCheckout(source, {
    include: file => { trackedPaths.push(file); return file.startsWith(prefix) || reviewed.rootFiles.includes(file); },
  });
  const entryBlob = checkout.blobs.get(entry);
  if (!entryBlob) fail(`source does not track the ${name} skill entry: ${entry}`);
  const entryText = entryBlob.toString("utf8");
  const licenseRecord = verifyLicense(name, reviewed, checkout, trackedPaths);
  const metadata = skillMetadata(entryText);
  if (metadata.name !== reviewed.skill) fail(`frontmatter name does not match reviewed ${name} entry: ${metadata.name}`);
  const entries = checkout.indexEntries;
  const files = entries.map(item => item.path);
  const byteCount = entries.reduce((sum, item) => sum + item.size, 0);
  if (reviewed.rootFiles.some(file => !files.includes(file))) fail(`upstream ${name} scope lost a root file: ${reviewed.rootFiles.filter(file => !files.includes(file)).join(", ")}`);

  const destination = path.resolve(__dirname, "../skill/vendor", name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), `.${name}-stage-`));
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream);
    copyTrackedFiles(upstream, entries, checkout.blobs);
    const treeSha256 = canonicalTree(upstream, files);
    manifest = {
      schema: "design-pipeline.ui-craft-source.v1",
      name,
      source: {
        repository: reviewed.repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt,
        license: reviewed.license.spdx, reviewedAt, scope: [`${prefix}**`, ...reviewed.rootFiles], contentHashScope: CONTENT_HASH_SCOPE,
      },
      licenses: [licenseRecord],
      snapshot: {
        root: "upstream", fileCount: files.length, byteCount, treeSha256,
        executableFiles: entries.filter(item => item.mode === "100755").map(item => item.path).sort(),
        objects: entries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size, sha256: crypto.createHash("sha256").update(checkout.blobs.get(file)).digest("hex") })),
      },
      skills: [{ name: metadata.name, path: `upstream/${entry}`, description: metadata.description }],
      boundary: { mode: "built-in-reference-adaptation", installsUpstreamDependencies: false, executesUpstreamCommands: false, fetchesRemotePrompts: false, changesProjectRuntime: false },
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

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) process.stdout.write(`Usage: node scripts/import-ui-craft-sources.cjs --name ${Object.keys(REVIEWED).join("|")} --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n`);
    else {
      const manifest = importSnapshot(options.name, options.source, options.reviewedAt);
      process.stdout.write(`${JSON.stringify({ status: "imported", name: options.name, revision: manifest.source.revision, files: manifest.snapshot.fileCount, treeSha256: manifest.snapshot.treeSha256 })}\n`);
    }
  } catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { REVIEWED, skillMetadata };
