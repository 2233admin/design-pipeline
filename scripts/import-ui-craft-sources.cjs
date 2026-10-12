#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, fail, inspectCheckout } = require("./git-tree-snapshot.cjs");

const CONTENT_HASH_SCOPE = "selected skill and root metadata: sorted POSIX path, NUL, SHA-256 blob hash, newline; gitTree is the upstream repository root, not this scoped snapshot";
const MIT_GRANT = "Permission is hereby granted, free of charge";

// One reviewed record per bundle. Scope is `skills/<skill>/**` plus the listed root files.
const REVIEWED = {
  "emil-design-eng": {
    repository: "https://github.com/emilkowalski/skills",
    revision: "2d228630ba1446365f614a108cb8252f1feda202",
    gitTree: "a8f01f03c19a9ec7e737494dff7b8e416e326bd2",
    treeSha256: "16edf049c960e6ea6d96ec4fa2d436c420183c7f33f2dc1b2f8491273218c674",
    fileCount: 2, byteCount: 28193,
    skill: "emil-design-eng", rootFiles: ["LICENSE"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE", copyright: "Copyright (c) 2026 Emil Kowalski" },
  },
  "make-interfaces-feel-better": {
    repository: "https://github.com/jakubkrehel/make-interfaces-feel-better",
    revision: "35545ea1512ad59fa463e6b1f95ca9c052981fe6",
    gitTree: "178b8d6fe1643aa0cafad3fc20d665f666352d4f",
    treeSha256: "d60a83f0eccb7d6e5b6a1e4eab47e1e1ee9d0a985f4737c8d34decc88db16961",
    fileCount: 9, byteCount: 43641,
    skill: "make-interfaces-feel-better", rootFiles: ["LICENSE", "README.md"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE", copyright: "Copyright (c) 2026 Jakub Krehel" },
  },
  "fixing-accessibility": {
    repository: "https://github.com/ibelick/ui-skills",
    revision: "f2264c30213a8a55bd0a6a7668d0438e4564e090",
    gitTree: "477e37b34f19b7f5c7380219c6b54c0b99aed81e",
    treeSha256: "bc4375b2fce2417ccf354e00b08cc7365e7bd11cd3ce6b5d501ff82a7d15fcd4",
    fileCount: 2, byteCount: 5790,
    skill: "fixing-accessibility", rootFiles: ["LICENSE"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE", copyright: "Copyright (c) 2026 Julien Thibeaut" },
  },
  "12-principles-of-animation": {
    repository: "https://github.com/raphaelsalaja/skill",
    revision: "dc9eef22f13635df77d9b9e67c82aa85d52a97b7",
    gitTree: "e062cfd5c88ba6e7d43aa4c10dfd0644c09ba595",
    treeSha256: "c836d17cb89f4c7d0cdd88829968db5484d9fd8f8e1762b4dc3fc29b067859e7",
    fileCount: 2, byteCount: 5106,
    skill: "12-principles-of-animation", rootFiles: ["README.md"],
    // The repository ships no license file; the only license evidence is the skill frontmatter.
    license: {
      kind: "frontmatter", spdx: "MIT", evidence: "license: MIT",
      note: "Declared only in the skill frontmatter; the upstream repository has no LICENSE file at the reviewed revision and publishes no copyright line.",
    },
  },
  shadcn: {
    repository: "https://github.com/shadcn-ui/ui",
    revision: "993eb2c3151997ce08a49635c10fd8c8ef3713c7",
    gitTree: "73f30996a5cbbc3a75ada6818781d1f121636082",
    treeSha256: "fb90fd9ad20aba550f87fbc2e1aa0e5d0bd7f12035a14ac99f280506365e3fce",
    fileCount: 22, byteCount: 149817,
    skill: "shadcn", rootFiles: ["LICENSE.md"],
    license: { kind: "mit-file", spdx: "MIT", file: "LICENSE.md", copyright: "Copyright (c) 2023 shadcn" },
  },
  "playwright-cli": {
    repository: "https://github.com/microsoft/playwright-cli",
    revision: "b85c7a736bb473bf55b584e54a09ffa698d6d871",
    gitTree: "36df4035a96234a35900b4f221277a617ab4f51b",
    treeSha256: "5edf4c1784bf591cbfc13b06775c07667f6132c2efbfbc504840c5c03362972e",
    fileCount: 13, byteCount: 105918,
    skill: "playwright-cli", rootFiles: ["LICENSE", "README.md"],
    // The copyright line is the filled-in appendix boilerplate of the Apache-2.0 text.
    license: {
      kind: "apache-file", spdx: "Apache-2.0", file: "LICENSE", copyright: "Copyright (c) Microsoft Corporation.",
      notice: "No NOTICE file exists at the reviewed revision.",
    },
  },
};

const LICENSE_NAME = /^(?:licen[cs]e|copying)(?:\.[^/]*)?$/i;
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
  const license = lines.find(line => /^license:/.test(line));
  return { name, description, license: license ? unquote(license.slice("license:".length)) : null };
}

function verifyLicense(name, reviewed, checkout, trackedPaths, entryText) {
  const license = reviewed.license;
  if (license.kind === "frontmatter") {
    if (skillMetadata(entryText).license !== license.spdx || !entryText.includes(`\n${license.evidence}`)) fail(`source skill frontmatter does not declare the reviewed ${name} license: ${license.evidence}`);
    const files = trackedPaths.filter(file => LICENSE_NAME.test(path.posix.basename(file)));
    if (files.length) fail(`reviewed ${name} record expects no license file, but the source tracks ${files.join(", ")}`);
    return { path: `upstream/skills/${reviewed.skill}/SKILL.md`, license: license.spdx, evidence: license.evidence, note: license.note };
  }
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
  const licenseRecord = verifyLicense(name, reviewed, checkout, trackedPaths, entryText);
  const metadata = skillMetadata(entryText);
  if (metadata.name !== reviewed.skill) fail(`frontmatter name does not match reviewed ${name} entry: ${metadata.name}`);
  if (checkout.revision !== reviewed.revision) fail(`source revision must be the reviewed ${reviewed.revision}; received ${checkout.revision}`);
  if (checkout.gitTree !== reviewed.gitTree) fail(`source Git tree does not match reviewed ${name} root tree`);
  const entries = checkout.indexEntries;
  const files = entries.map(item => item.path);
  const byteCount = entries.reduce((sum, item) => sum + item.size, 0);
  if (files.length !== reviewed.fileCount || byteCount !== reviewed.byteCount || reviewed.rootFiles.some(file => !files.includes(file))) {
    fail(`reviewed ${name} scoped inventory does not match ${reviewed.fileCount} files and ${reviewed.byteCount} bytes`);
  }

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
    if (treeSha256 !== reviewed.treeSha256) fail(`source content does not match reviewed ${name} scoped tree hash`);
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
