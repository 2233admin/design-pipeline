#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, fail, frontmatter, inspectCheckout } = require("./git-tree-snapshot.cjs");

const destination = path.resolve(__dirname, "../skill/vendor/taste-skill");
const repository = "https://github.com/Leonxlnx/taste-skill";
const reviewedRevision = "b482f7a970abb98c4108d4a9f761e458c64cefc8";
const reviewedGitTree = "2589404b7fd08979aafbeb8074d4bc416fe428a3";
const reviewedTreeSha256 = "5c05edf236140ec2152a02c95f079911ce4636dd1b15089ad9292be9d0b5a40a";
const reviewedSkills = new Map([
  ["brandkit", "brandkit"],
  ["brutalist-skill", "industrial-brutalist-ui"],
  ["gpt-tasteskill", "gpt-taste"],
  ["image-to-code-skill", "image-to-code"],
  ["imagegen-frontend-mobile", "imagegen-frontend-mobile"],
  ["imagegen-frontend-web", "imagegen-frontend-web"],
  ["minimalist-skill", "minimalist-ui"],
  ["output-skill", "full-output-enforcement"],
  ["redesign-skill", "redesign-existing-projects"],
  ["soft-skill", "high-end-visual-design"],
  ["stitch-skill", "stitch-design-taste"],
  ["taste-skill-v1", "design-taste-frontend-v1"],
  ["taste-skill", "design-taste-frontend"],
]);

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
  for (const file of ["LICENSE", "README.md", ...[...reviewedSkills.keys()].map(directory => `skills/${directory}/SKILL.md`)]) {
    if (!fs.existsSync(path.join(source, file))) fail(`source is not a complete Leonxlnx/taste-skill checkout: missing ${file}`);
  }
  const checkout = inspectCheckout(source);
  const license = checkout.blobs.get("LICENSE")?.toString("utf8") || "";
  if (!license.startsWith("MIT License") || !license.includes("Copyright (c) 2026 Leonxlnx")) fail("source LICENSE does not match reviewed Taste-Skill MIT attribution");
  if (checkout.revision !== reviewedRevision) fail(`source revision must be the reviewed ${reviewedRevision}; received ${checkout.revision}`);
  if (checkout.gitTree !== reviewedGitTree) fail("source Git tree does not match reviewed Taste-Skill tree");
  const files = checkout.indexEntries.map(entry => entry.path);
  const byteCount = checkout.indexEntries.reduce((sum, entry) => sum + entry.size, 0);
  const skillFiles = files.filter(file => /^skills\/[^/]+\/SKILL\.md$/.test(file));
  if (files.length !== 62 || byteCount !== 4824721 || skillFiles.length !== 13) fail("reviewed source inventory does not match 62 files, 4824721 bytes and 13 skills");

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const backup = `${destination}.backup-${process.pid}`;
  if (fs.existsSync(backup)) fail(`stale import backup already exists: ${backup}`);
  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".taste-skill-stage-"));
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream);
    copyTrackedFiles(upstream, checkout.indexEntries, checkout.blobs);
    const treeSha256 = canonicalTree(upstream, files);
    if (treeSha256 !== reviewedTreeSha256) fail("source content does not match reviewed Taste-Skill tree hash");
    const skills = skillFiles.map(file => {
      const directory = file.split("/")[1];
      const metadata = frontmatter(path.join(upstream, file));
      if (reviewedSkills.get(directory) !== metadata.name || !metadata.description.trim()) fail(`frontmatter does not match reviewed Taste-Skill entry: ${file}`);
      return { name: metadata.name, directory, path: `upstream/${file}`, description: metadata.description };
    });
    if (new Set(skills.map(skill => skill.name)).size !== 13) fail("reviewed Taste-Skill names must be unique");
    manifest = {
      schema: "design-pipeline.taste-skill-source.v1",
      source: { repository, revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt, license: "MIT", reviewedAt, scope: ["**"] },
      licenses: [{ path: "upstream/LICENSE", license: "MIT", copyright: "Copyright (c) 2026 Leonxlnx" }],
      snapshot: {
        root: "upstream", fileCount: files.length, byteCount, treeSha256,
        executableFiles: checkout.indexEntries.filter(entry => entry.mode === "100755").map(entry => entry.path).sort(),
        objects: checkout.indexEntries.map(({ path: file, mode, oid, size }) => ({ path: file, mode, oid, size })),
      },
      skills,
      boundary: { mode: "built-in-reference-adaptation", installsUpstreamDependencies: false, executesDeployment: false, executesUpstreamScripts: false, changesProjectRuntime: false },
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
  if (options.help) process.stdout.write("Usage: node scripts/import-taste-skill.cjs --source <clean-reviewed-checkout> --reviewed-at YYYY-MM-DD\n");
  else {
    const manifest = importSnapshot(options.source, options.reviewedAt);
    process.stdout.write(`${JSON.stringify({ status: "imported", revision: manifest.source.revision, files: manifest.snapshot.fileCount, skills: manifest.skills.length, treeSha256: manifest.snapshot.treeSha256 })}\n`);
  }
} catch (error) {
  process.stderr.write(`FAIL ${error.message}\n`);
  process.exitCode = 1;
}
