"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/references/shadcnio-react-components/manifest.json");
const packageResources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
const {
  loadShadcnioComponents,
  searchShadcnioComponents,
  verifyShadcnioComponentSnapshot,
} = require("../skill/scripts/shadcnio-react-components-core.cjs");

test("bundles the complete pinned shadcnio repository and README index", () => {
  const { manifest, entries } = loadShadcnioComponents(manifestFile);
  assert.deepEqual(manifest.source, {
    repository: "https://github.com/shadcnio/react-shadcn-components",
    revision: "2dc66e0e7b159fa92e761c84f3c5325c9700c415",
    license: "MIT",
    reviewedAt: "2026-08-12",
    scope: ["LICENSE", "README.md"],
  });
  assert.equal(manifest.snapshot.fileCount, 2);
  assert.equal(entries.length, 75);
  assert.deepEqual(manifest.index.categories, { ai: 16, button: 15, hook: 34, text: 10 });
  for (const resource of [
    "scripts/shadcnio-react-components-core.cjs",
    "references/shadcnio-react-components.md",
    "references/shadcnio-react-components/manifest.json",
    "references/shadcnio-react-components/upstream/LICENSE",
    "references/shadcnio-react-components/upstream/README.md",
  ]) assert.ok(packageResources.required.includes(resource), resource);
  assert.equal(verifyShadcnioComponentSnapshot(manifestFile).status, "ready");
  assert.match(fs.readFileSync(path.join(path.dirname(manifestFile), "upstream/LICENSE"), "utf8"), /Copyright \(c\) 2025 Shadcn IO/);
});

test("search returns review-only component references, not implementation authority", () => {
  const ai = searchShadcnioComponents({ query: "AI prompt input", category: "ai", limit: 1 });
  assert.equal(ai.results[0].id, "ai/prompt-input");
  assert.equal(ai.results[0].kind, "component");
  assert.deepEqual(ai.results[0].integration, {
    mode: "reference-adaptation",
    status: "review",
    implementationLicense: "unverified",
    requirement: "Verify the linked page's source license, dependencies, and project fit before implementation.",
  });

  const hook = searchShadcnioComponents({ query: "media query", category: "hook", limit: 1 });
  assert.equal(hook.results[0].id, "hooks/use-media-query");
  assert.equal(hook.results[0].kind, "hook");
});

test("verification blocks a partial bundled snapshot", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-shadcnio-"));
  try {
    const copiedRoot = path.join(temporary, "snapshot");
    fs.cpSync(path.dirname(manifestFile), copiedRoot, { recursive: true });
    fs.rmSync(path.join(copiedRoot, "upstream", "README.md"));
    const result = verifyShadcnioComponentSnapshot(path.join(copiedRoot, "manifest.json"));
    assert.equal(result.status, "blocked");
    assert.match(result.issues[0], /README|ENOENT/);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("public CLI searches and verifies the installed shadcnio snapshot", () => {
  for (const args of [
    ["shadcnio", "search", "--root", repoRoot, "--query", "copy button", "--json"],
    ["shadcnio", "verify", "--root", repoRoot, "--json"],
  ]) {
    const child = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const output = JSON.parse(child.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.status, "ready");
  }
});
