"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/references/design-md/manifest.json");
const {
  loadDesignMdSource,
  searchDesignMdSource,
  verifyDesignMdSource,
} = require("../skill/scripts/design-md-source-core.cjs");

test("bundles the pinned dimabraven/design-md example tree", () => {
  const { manifest } = loadDesignMdSource(manifestFile);
  assert.deepEqual(manifest.source.repository, "https://github.com/dimabraven/design-md");
  assert.equal(manifest.source.revision, "f74ca151f92af178f1e0b93f2191e5ec77b33203");
  assert.equal(manifest.source.license, "MIT");
  assert.equal(manifest.examples.length, 4);
  assert.deepEqual(manifest.examples.map((example) => example.slug).sort(), [
    "linear",
    "minimal-saas",
    "stripe",
    "vercel",
  ]);
  assert.equal(manifest.examples.every((example) => example.admission === "reference-only"), true);
  const verification = verifyDesignMdSource(manifestFile);
  assert.equal(verification.status, "ready", verification.issues.join("; "));
  assert.match(
    fs.readFileSync(path.join(path.dirname(manifestFile), "upstream/LICENSE"), "utf8"),
    /Copyright \(c\) 2026 Dima Braven/,
  );
});

test("offline search stays inspiration-only and does not require a directory catalog", () => {
  const result = searchDesignMdSource({ query: "keyboard-first", limit: 2 });
  assert.equal(result.results[0].id, "design-md:example:linear");
  assert.equal(result.results[0].status, "reference-only");
  assert.equal(result.results[0].executableReady, false);
  assert.ok(fs.existsSync(result.results[0].contentPath));

  const child = spawnSync(process.execPath, [
    cli, "designmd", "search", "--root", repoRoot, "--query", "geist", "--limit", "1", "--json",
  ], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const output = JSON.parse(child.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.results[0].id, "design-md:example:vercel");

  const verified = spawnSync(process.execPath, [
    cli, "designmd", "verify", "--root", repoRoot, "--json",
  ], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  assert.equal(verified.status, 0, verified.stderr || verified.stdout);
  assert.equal(JSON.parse(verified.stdout).status, "ready");
});

test("inspect rejects unknown ids and keeps examples non-executable", () => {
  const inspect = spawnSync(process.execPath, [
    cli, "designmd", "inspect", "--root", repoRoot, "--id", "design-md:example:linear", "--json",
  ], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  assert.equal(inspect.status, 0, inspect.stderr || inspect.stdout);
  const output = JSON.parse(inspect.stdout);
  assert.equal(output.admission, "reference-only");
  assert.equal(output.executableReady, false);

  const missing = spawnSync(process.execPath, [
    cli, "designmd", "inspect", "--root", repoRoot, "--id", "design-md:example:missing", "--json",
  ], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /entry not found/);
});
