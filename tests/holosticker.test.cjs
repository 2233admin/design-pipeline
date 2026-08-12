"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/references/holosticker/manifest.json");
const packageResources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
const { inspectHolosticker, loadHolosticker, verifyHolostickerSnapshot } = require("../skill/scripts/holosticker-core.cjs");

test("bundles the complete pinned Holosticker implementation", () => {
  const { manifest } = loadHolosticker(manifestFile);
  assert.deepEqual(manifest.source, {
    repository: "https://github.com/jal-co/holosticker",
    revision: "34688eb3fd2986c6721ff270a00ca9267f8a195c",
    gitTree: "11a1e9e0622d5a14a28a139c7dbcf17501eb1e0f",
    version: "1.6.1",
    license: "MIT",
    reviewedAt: "2026-08-12",
    scope: "complete tracked repository",
  });
  assert.equal(manifest.snapshot.fileCount, 57);
  assert.equal(manifest.snapshot.byteCount, 3422382);
  assert.equal(manifest.capabilities.length, 8);
  assert.equal(verifyHolostickerSnapshot(manifestFile).status, "ready");
  for (const resource of [
    "scripts/holosticker-core.cjs",
    "references/holosticker.md",
    "references/holosticker/manifest.json",
    "references/holosticker/upstream/LICENSE",
    "references/holosticker/upstream/src/lib/settings.ts",
    "references/holosticker/upstream/src/lib/three-renderer.ts",
  ]) assert.ok(packageResources.required.includes(resource), resource);
});

test("routes each Holosticker feature to the minimum real source slice", () => {
  const all = inspectHolosticker();
  assert.equal(all.integration.family, "scene-renderer-3d");
  assert.equal(all.integration.adapter, "threejs");
  assert.equal(all.capabilities.length, 8);
  const animated = inspectHolosticker({ capability: "animated-export" });
  assert.deepEqual(animated.capabilities[0].dependencies, ["three", "gifenc"]);
  assert.deepEqual(animated.capabilities[0].sourceFiles, [
    "upstream/src/components/GifExportDialog.tsx",
    "upstream/src/lib/three-renderer.ts",
  ]);
  assert.throws(() => inspectHolosticker({ capability: "future-feature" }), /unknown capability/);
});

test("snapshot verification detects byte drift", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-holosticker-"));
  const copy = path.join(root, "holosticker");
  fs.cpSync(path.dirname(manifestFile), copy, { recursive: true });
  fs.appendFileSync(path.join(copy, "upstream", "README.md"), "\ndrift\n");
  const result = verifyHolostickerSnapshot(path.join(copy, "manifest.json"));
  assert.equal(result.status, "blocked");
  assert.ok(result.issues.some((issue) => issue.startsWith("byte count")));
});

test("public CLI inspects and verifies the installed Holosticker source", () => {
  for (const args of [
    ["holosticker", "inspect", "--root", repoRoot, "--capability", "die-cut-mask", "--json"],
    ["holosticker", "verify", "--root", repoRoot, "--json"],
  ]) {
    const child = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const output = JSON.parse(child.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.status, "ready");
  }
});
