#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { canonicalTree, copyTrackedFiles, fail, frontmatter, inspectCheckout } = require("./git-tree-snapshot.cjs");

// The revision comes from the checkout; sources.lock.json records which upstream HEAD was imported.
// `kind: "skill"` bundles carry a SKILL.md entry with frontmatter; `kind: "template"` bundles are
// renderable projects whose entry is their README.
const REVIEWED = {
  cinetic: {
    kind: "skill",
    repository: "https://github.com/Leonxlnx/cinetic",
    copyright: "Copyright (c) 2026 Leonxlnx",
    entry: "skills/cinetic/SKILL.md", skillName: "cinetic",
    externalMedia: "README gallery media-branch videos and linked dependencies are outside this reviewed Git tree; none are mirrored.",
    platform: "Upstream bash pipeline targets macOS/Linux; native Windows and WSL are unverified. Packaged Python/Node scripts are source, not a promise of installed dependencies or pipeline compatibility.",
  },
  "product-film-skill": {
    kind: "skill",
    repository: "https://github.com/Rieranthony/product-film-skill",
    copyright: "Copyright (c) 2026 Rieranthony",
    entry: "plugins/product-film/skills/product-film/SKILL.md", skillName: "product-film",
    externalMedia: "Project fonts, music, Remotion and on-demand Python dependencies are not in this reviewed Git tree; none are mirrored.",
    platform: "Upstream entrypoints require Bun, Remotion and uv-managed Python packages; native Windows and WSL execution is unverified. The render script's npx subprocess also needs a Windows command-launch adaptation.",
  },
  "ff-tracking": {
    kind: "template",
    repository: "https://github.com/mrsarac/ff-tracking",
    copyright: "Copyright (c) 2026 Mustafa Saraç",
    entry: "README.md", templateName: "tracking-hud",
    // Separately licensed parts of the tree, kept beside the repository's MIT license.
    notices: [
      { path: "upstream/licenses/JetBrainsMono-OFL.txt", license: "OFL-1.1", copyright: "Copyright 2020 The JetBrains Mono Project Authors" },
      { path: "upstream/licenses/MT19937.txt", license: "BSD-3-Clause", copyright: "Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura" },
    ],
    externalMedia: "The README demo video is a release asset outside this reviewed Git tree and is not mirrored. Rendered out/ and target/ build output is never part of the snapshot.",
    platform: "Upstream tools/render.sh targets macOS/Metal and tools/render.ps1 native Windows/Vulkan; both need Rust, LLVM/libclang, a shared FFmpeg 9.0 development build and Python numpy/scipy, which the skill never installs. Native Windows render and WSL are unverified by this import.",
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
  if (!Object.hasOwn(REVIEWED, options.name || "")) fail(`--name must be one of ${Object.keys(REVIEWED).join(", ")}`);
  if (!options.source) fail("--source is required");
  const date = options["reviewed-at"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) fail("--reviewed-at requires a valid YYYY-MM-DD");
  return { name: options.name, source: path.resolve(options.source), reviewedAt: date };
}

function importSnapshot(name, source, reviewedAt) {
  const reviewed = REVIEWED[name];
  const checkout = inspectCheckout(source);
  const license = checkout.blobs.get("LICENSE")?.toString("utf8") || "";
  if (!license.startsWith("MIT License") || !license.includes(reviewed.copyright)) fail(`source LICENSE does not match reviewed ${name} MIT attribution`);
  for (const notice of reviewed.notices || []) {
    if (!(checkout.blobs.get(notice.path.slice("upstream/".length))?.toString("utf8") || "").includes(notice.copyright)) fail(`source ${notice.path} does not match reviewed ${name} notice`);
  }
  const files = checkout.indexEntries.map(entry => entry.path);
  const byteCount = checkout.indexEntries.reduce((sum, entry) => sum + entry.size, 0);
  if (!files.includes(reviewed.entry)) fail(`upstream no longer provides the ${name} entry ${reviewed.entry}`);

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
    let entries;
    if (reviewed.kind === "skill") {
      const metadata = frontmatter(path.join(upstream, storedPath(reviewed.entry)));
      if (metadata.name !== reviewed.skillName || !metadata.description.trim()) fail(`frontmatter does not match reviewed ${name} entry`);
      entries = { skills: [{ name: metadata.name, path: `upstream/${reviewed.entry}`, description: metadata.description }] };
    } else if (reviewed.kind === "template") {
      const heading = fs.readFileSync(path.join(upstream, storedPath(reviewed.entry)), "utf8").match(/^\*\*(.+)\*\*\s*$/m);
      if (!heading) fail(`reviewed ${name} entry lacks its summary line`);
      entries = { templates: [{ name: reviewed.templateName, path: `upstream/${reviewed.entry}`, description: heading[1].trim() }] };
    } else fail(`unknown reviewed kind for ${name}`);
    manifest = {
      schema: `design-pipeline.${name}-source.v1`,
      source: { repository: reviewed.repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt, license: "MIT", reviewedAt, scope: ["**"] },
      licenses: [{ path: "upstream/LICENSE", license: "MIT", copyright: reviewed.copyright }, ...(reviewed.notices || [])],
      snapshot: {
        root: "upstream", fileCount: files.length, byteCount, treeSha256,
        executableFiles: checkout.indexEntries.filter(entry => entry.mode === "100755").map(entry => entry.path).sort(),
        objects: checkout.indexEntries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size, sha256: crypto.createHash("sha256").update(checkout.blobs.get(file)).digest("hex") })),
      },
      ...entries,
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
    if (options.help) process.stdout.write(`Usage: node scripts/import-film-sources.cjs --name ${Object.keys(REVIEWED).join("|")} --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n`);
    else {
      const manifest = importSnapshot(options.name, options.source, options.reviewedAt);
      process.stdout.write(`${JSON.stringify({ status: "imported", name: options.name, revision: manifest.source.revision, files: manifest.snapshot.fileCount, treeSha256: manifest.snapshot.treeSha256 })}\n`);
    }
  } catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}

module.exports = { REVIEWED };
