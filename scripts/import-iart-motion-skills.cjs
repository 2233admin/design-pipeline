#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  canonicalTree,
  copyTrackedFiles,
  fail,
  frontmatter,
  inspectCheckout,
} = require("./git-tree-snapshot.cjs");

const repoRoot = path.resolve(__dirname, "..");
const destination = path.join(repoRoot, "skill", "references", "iart-motion-skills");
const org = "https://github.com/iart-ai";

const PACKS = [
  { id: "motion-skills", family: "index", activationDefault: "reference" },
  { id: "web-animation-skills", family: "web-motion", activationDefault: "automatic" },
  { id: "webgl-animation-skills", family: "webgl", activationDefault: "automatic" },
  { id: "motion-design-skills", family: "motion-design", activationDefault: "automatic" },
  { id: "kinetic-typography-skills", family: "web-motion", activationDefault: "automatic" },
  { id: "data-animation-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "tiktok-video-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "text-message-video-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "youtube-video-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "ecommerce-video-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "ad-video-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "explainer-video-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "map-animation-skills", family: "motion-graphics", activationDefault: "explicit" },
  { id: "freelance-motion-skills", family: "ops", activationDefault: "explicit" },
  { id: "manim-skills", family: "motion-graphics", activationDefault: "explicit" },
];

const EXCLUDED = [
  { id: "generative-illustration-skills", reason: "reviewed revision has no LICENSE file" },
];

const EXPLICIT_SKILLS = new Set([
  "after-effects",
  "remotion-video",
  "motion-pricing",
  "client-revisions",
  "video-delivery-specs",
]);

function parseArgs(argv) {
  let sourceRoot = null;
  let reviewedAt = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source-root") {
      sourceRoot = argv[index + 1];
      if (!sourceRoot || sourceRoot.startsWith("--")) fail("--source-root requires a value");
      index += 1;
    } else if (token === "--reviewed-at") {
      reviewedAt = argv[index + 1];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt || "")) fail("--reviewed-at requires YYYY-MM-DD");
      index += 1;
    } else if (token === "--help" || token === "-h") {
      return { help: true };
    } else {
      fail(`unknown option: ${token}`);
    }
  }
  if (!sourceRoot) fail("--source-root is required");
  if (!reviewedAt) fail("--reviewed-at is required");
  return { sourceRoot: path.resolve(sourceRoot), reviewedAt, help: false };
}

function stages(family, name, activation) {
  if (family === "index") return ["reference"];
  if (activation === "explicit" && family === "ops") return ["brief", "qa"];
  if (family === "motion-graphics") return ["directions", "implementation", "qa"];
  if (family === "webgl") return ["directions", "implementation", "qa"];
  if (family === "web-motion") return ["directions", "implementation", "qa"];
  if (name === "animation-principles" || name === "motion-art-direction" || name === "shot-composition") {
    return ["directions", "qa"];
  }
  return ["directions", "implementation", "qa"];
}

function importSnapshot(sourceRoot, reviewedAt) {
  for (const excluded of EXCLUDED) {
    const excludedPath = path.join(sourceRoot, excluded.id);
    if (fs.existsSync(path.join(excludedPath, "LICENSE"))) {
      fail(`${excluded.id} now has a LICENSE; update the importer instead of silently skipping it`);
    }
  }

  const checkouts = PACKS.map((pack) => {
    const source = path.join(sourceRoot, pack.id);
    if (!fs.existsSync(path.join(source, "LICENSE"))) fail(`${pack.id} is missing LICENSE`);
    return { pack, checkout: inspectCheckout(source) };
  });

  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".iart-motion-skills-stage-"));
  const backup = `${destination}.backup-${process.pid}`;
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream, { recursive: true });
    const objects = [];
    const executableFiles = [];
    const skills = [];
    const packs = [];

    for (const { pack, checkout } of checkouts) {
      const packRoot = path.join(upstream, pack.id);
      fs.mkdirSync(packRoot, { recursive: true });
      copyTrackedFiles(packRoot, checkout.indexEntries, checkout.blobs);
      for (const entry of checkout.indexEntries) {
        const relative = `${pack.id}/${entry.path}`;
        objects.push({ path: relative, mode: entry.mode, oid: entry.oid, size: entry.size });
        if (entry.mode === "100755") executableFiles.push(relative);
      }
      const skillFiles = checkout.indexEntries
        .map((entry) => entry.path)
        .filter((relative) => /^skills\/[^/]+\/SKILL\.md$/.test(relative));
      for (const relative of skillFiles) {
        const name = relative.split("/")[1];
        const metadata = frontmatter(path.join(packRoot, relative));
        if (metadata.name !== name) fail(`frontmatter name does not match directory: ${pack.id}/${relative}`);
        const activation = EXPLICIT_SKILLS.has(name) || pack.activationDefault === "explicit"
          ? "explicit"
          : pack.activationDefault === "automatic"
            ? "automatic"
            : "explicit";
        skills.push({
          id: `${pack.id}/${name}`,
          name,
          pack: pack.id,
          family: pack.family,
          description: metadata.description,
          path: `upstream/${pack.id}/${relative}`,
          activation,
          stages: stages(pack.family, name, activation),
        });
      }
      packs.push({
        id: pack.id,
        repository: `${org}/${pack.id}`,
        revision: checkout.revision,
        gitTree: checkout.gitTree,
        committedAt: checkout.committedAt,
        license: "MIT",
        family: pack.family,
        activationDefault: pack.activationDefault,
        skillCount: skillFiles.length,
        fileCount: checkout.indexEntries.length,
      });
    }

    objects.sort((left, right) => left.path.localeCompare(right.path));
    executableFiles.sort();
    skills.sort((left, right) => left.id.localeCompare(right.id));
    const files = objects.map((object) => object.path);
    const byteCount = files.reduce((sum, relative) => sum + fs.statSync(path.join(upstream, relative)).size, 0);

    manifest = {
      schema: "design-pipeline.iart-motion-skills-source.v1",
      index: {
        repository: `${org}/motion-skills`,
        revision: checkouts.find(({ pack }) => pack.id === "motion-skills").checkout.revision,
        license: "MIT",
        reviewedAt,
      },
      excluded: EXCLUDED,
      packs,
      snapshot: {
        root: "upstream",
        fileCount: files.length,
        byteCount,
        treeSha256: canonicalTree(upstream, files),
        executableFiles,
        objects,
      },
      families: Object.fromEntries(
        [...new Set(skills.map((skill) => skill.family))]
          .sort()
          .map((family) => [family, skills.filter((skill) => skill.family === family).length]),
      ),
      skills,
    };
    fs.writeFileSync(path.join(stage, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

    if (fs.existsSync(destination)) {
      fs.renameSync(destination, backup);
      movedOld = true;
    }
    fs.renameSync(stage, destination);
    if (movedOld) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(destination) && movedOld && fs.existsSync(backup)) fs.renameSync(backup, destination);
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    throw error;
  }
  return manifest;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  process.stdout.write("Usage: node scripts/import-iart-motion-skills.cjs --source-root <dir-of-checkouts> --reviewed-at YYYY-MM-DD\n");
} else {
  const manifest = importSnapshot(options.sourceRoot, options.reviewedAt);
  process.stdout.write(`${JSON.stringify({
    status: "imported",
    packs: manifest.packs.length,
    files: manifest.snapshot.fileCount,
    skills: manifest.skills.length,
    excluded: manifest.excluded.map((entry) => entry.id),
    treeSha256: manifest.snapshot.treeSha256,
  })}\n`);
}
