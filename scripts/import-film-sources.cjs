#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, fail, frontmatter, inspectCheckout } = require("./git-tree-snapshot.cjs");

const REVIEWED = {
  cinetic: {
    repository: "https://github.com/Leonxlnx/cinetic",
    revision: "bee5d7807205d5543472c38312507f9bf366cbbf",
    gitTree: "6bf9bcdfbc1af302f3d9233f7438bc0d38d4dfc1",
    treeSha256: "08a00027789a3452f030919e8c2d3ababdf44162c1934dfa9a45b35c505c9a75",
    fileCount: 137, byteCount: 2645694,
    copyright: "Copyright (c) 2026 Leonxlnx",
    entry: "skills/cinetic/SKILL.md", skillName: "cinetic",
    externalMedia: "README gallery media-branch videos and linked dependencies are outside this reviewed Git tree; none are mirrored.",
    platform: "Upstream bash pipeline targets macOS/Linux; native Windows and WSL are unverified. Packaged Python/Node scripts are source, not a promise of installed dependencies or pipeline compatibility.",
  },
  "product-film-skill": {
    repository: "https://github.com/Rieranthony/product-film-skill",
    revision: "fe11efc429d5903e37274d0b294e1b95745b2881",
    gitTree: "ca1b16a4091528f90059b1ed2c0bb1afb8b5769f",
    treeSha256: "6ed8d4b4e6da3e00c82b7e86472c01c23d7c5748a4d2e063bf28b563cf559089",
    fileCount: 30, byteCount: 82908,
    copyright: "Copyright (c) 2026 Rieranthony",
    entry: "plugins/product-film/skills/product-film/SKILL.md", skillName: "product-film",
    externalMedia: "Project fonts, music, Remotion and on-demand Python dependencies are not in this reviewed Git tree; none are mirrored.",
    platform: "Upstream entrypoints require Bun, Remotion and uv-managed Python packages; native Windows and WSL execution is unverified. The render script's npx subprocess also needs a Windows command-launch adaptation.",
  },
};

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
  if (!Object.hasOwn(REVIEWED, options.name || "")) fail("--name must be cinetic or product-film-skill");
  if (!options.source) fail("--source is required");
  const date = options["reviewed-at"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { name: options.name, source: path.resolve(options.source), reviewedAt: date };
}

function importSnapshot(name, source, reviewedAt) {
  const reviewed = REVIEWED[name];
  const checkout = inspectCheckout(source);
  if (checkout.revision !== reviewed.revision) fail(`source revision must be the reviewed ${reviewed.revision}; received ${checkout.revision}`);
  if (checkout.gitTree !== reviewed.gitTree) fail(`source Git tree does not match reviewed ${name} tree`);
  const license = checkout.blobs.get("LICENSE")?.toString("utf8") || "";
  if (!license.startsWith("MIT License") || !license.includes(reviewed.copyright)) fail(`source LICENSE does not match reviewed ${name} MIT attribution`);
  const files = checkout.indexEntries.map(entry => entry.path);
  const byteCount = checkout.indexEntries.reduce((sum, entry) => sum + entry.size, 0);
  if (files.length !== reviewed.fileCount || byteCount !== reviewed.byteCount) fail(`source inventory does not match reviewed ${name} files and bytes`);

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
    copyTrackedFiles(upstream, checkout.indexEntries, checkout.blobs);
    const treeSha256 = canonicalTree(upstream, files);
    if (treeSha256 !== reviewed.treeSha256) fail(`source content does not match reviewed ${name} tree hash`);
    const metadata = frontmatter(path.join(upstream, reviewed.entry));
    if (metadata.name !== reviewed.skillName || !metadata.description.trim()) fail(`frontmatter does not match reviewed ${name} entry`);
    manifest = {
      schema: `design-pipeline.${name}-source.v1`,
      source: { repository: reviewed.repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt, license: "MIT", reviewedAt, scope: ["**"] },
      licenses: [{ path: "upstream/LICENSE", license: "MIT", copyright: reviewed.copyright }],
      snapshot: {
        root: "upstream", fileCount: files.length, byteCount, treeSha256,
        executableFiles: checkout.indexEntries.filter(entry => entry.mode === "100755").map(entry => entry.path).sort(),
        objects: checkout.indexEntries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size, sha256: crypto.createHash("sha256").update(checkout.blobs.get(file)).digest("hex") })),
      },
      skills: [{ name: metadata.name, path: `upstream/${reviewed.entry}`, description: metadata.description }],
      excluded: [],
      boundary: { mode: "built-in-reference-adaptation", installsUpstreamDependencies: false, activatesUpstreamPlugin: false, runsUpstreamPipeline: false, changesProjectRuntime: false, externalMedia: reviewed.externalMedia, platform: reviewed.platform },
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
    if (options.help) process.stdout.write("Usage: node scripts/import-film-sources.cjs --name cinetic|product-film-skill --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n");
    else {
      const manifest = importSnapshot(options.name, options.source, options.reviewedAt);
      process.stdout.write(`${JSON.stringify({ status: "imported", name: options.name, revision: manifest.source.revision, files: manifest.snapshot.fileCount, treeSha256: manifest.snapshot.treeSha256 })}\n`);
    }
  } catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { REVIEWED };
