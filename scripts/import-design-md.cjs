#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  canonicalTree,
  copyTrackedFiles,
  fail,
  inspectCheckout,
  yamlName,
} = require("./git-tree-snapshot.cjs");

const repoRoot = path.resolve(__dirname, "..");
const destination = path.join(repoRoot, "skill", "references", "design-md");
const repository = "https://github.com/dimabraven/design-md";

function parseArgs(argv) {
  let source = null;
  let reviewedAt = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source") {
      source = argv[index + 1];
      if (!source || source.startsWith("--")) fail("--source requires a value");
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
  if (!source) fail("--source is required");
  if (!reviewedAt) fail("--reviewed-at is required");
  return { source: path.resolve(source), reviewedAt, help: false };
}

function importSnapshot(source, reviewedAt) {
  if (!fs.existsSync(path.join(source, "LICENSE")) || !fs.existsSync(path.join(source, "examples"))) {
    fail("source is not a dimabraven/design-md checkout");
  }
  const checkout = inspectCheckout(source);
  const tracked = checkout.indexEntries.map((entry) => entry.path);
  if (!tracked.includes("LICENSE") || !tracked.some((relative) => relative.startsWith("examples/"))) {
    fail("source is missing LICENSE or examples");
  }

  const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".design-md-stage-"));
  const backup = `${destination}.backup-${process.pid}`;
  let movedOld = false;
  let manifest;
  try {
    const upstream = path.join(stage, "upstream");
    fs.mkdirSync(upstream, { recursive: true });
    copyTrackedFiles(upstream, checkout.indexEntries, checkout.blobs);

    const examples = tracked
      .filter((relative) => /^examples\/[^/]+\.md$/.test(relative))
      .map((relative) => {
        const slug = path.basename(relative, ".md");
        const meta = yamlName(path.join(upstream, relative));
        return {
          id: `design-md:example:${slug}`,
          slug,
          kind: "example",
          name: meta.name,
          description: meta.style || meta.name,
          path: `upstream/${relative}`,
          admission: "reference-only",
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));
    if (examples.length < 1) fail("source has no example DESIGN.md files");

    const byteCount = tracked.reduce((sum, relative) => sum + fs.statSync(path.join(upstream, relative)).size, 0);
    manifest = {
      schema: "design-pipeline.design-md-source.v1",
      source: {
        repository,
        revision: checkout.revision,
        gitTree: checkout.gitTree,
        committedAt: checkout.committedAt,
        license: "MIT",
        reviewedAt,
        scope: ["**"],
      },
      snapshot: {
        root: "upstream",
        fileCount: tracked.length,
        byteCount,
        treeSha256: canonicalTree(upstream, tracked),
        executableFiles: checkout.indexEntries.filter((entry) => entry.mode === "100755").map((entry) => entry.path).sort(),
        objects: checkout.indexEntries.map((entry) => ({
          path: entry.path,
          mode: entry.mode,
          oid: entry.oid,
          size: entry.size,
        })),
      },
      examples,
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
  process.stdout.write("Usage: node scripts/import-design-md.cjs --source <clean-checkout> --reviewed-at YYYY-MM-DD\n");
} else {
  const manifest = importSnapshot(options.source, options.reviewedAt);
  process.stdout.write(`${JSON.stringify({
    status: "imported",
    revision: manifest.source.revision,
    files: manifest.snapshot.fileCount,
    examples: manifest.examples.length,
    treeSha256: manifest.snapshot.treeSha256,
  })}\n`);
}
