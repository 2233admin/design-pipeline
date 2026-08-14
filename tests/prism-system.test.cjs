"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/references/prism-system/manifest.json");
const packageResources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
const { loadPrismCatalog, routePrismRequest, searchPrismSkills, verifyPrismSnapshot } = require("../skill/scripts/prism-system-core.cjs");

test("bundles the complete pinned Prism design-skill layer", () => {
  const { manifest, registry } = loadPrismCatalog(manifestFile);
  assert.equal(manifest.source.repository, "https://github.com/appariciojunior/PrismSystem");
  assert.equal(manifest.source.revision, "e93f2a3019162f1da19a9a8c3a5db0f1fba48631");
  assert.equal(manifest.source.skillsTree, "a4cbce60f29831615f017c758b81e362e862eda7");
  assert.equal(registry.skills.length, 107);
  assert.deepEqual(manifest.index.categories, { design: 18, discovery: 9, figma: 21, foundations: 8, handoff: 6, quality: 14, react: 20, workflow: 11 });
  assert.equal(verifyPrismSnapshot(manifestFile).status, "ready");
  for (const resource of [
    "scripts/prism-system-core.cjs",
    "references/prism-system.md",
    "references/prism-system/manifest.json",
    "references/prism-system/upstream/LICENSE",
    "references/prism-system/upstream/skills/skills.json",
    "references/prism-system/upstream/skills/skills.extended.json",
  ]) assert.ok(packageResources.required.includes(resource), resource);
});

test("search uses the full registry and exposes local extended metadata", () => {
  const result = searchPrismSkills({ query: "dark mode token contrast", category: "foundations", limit: 3 });
  assert.equal(result.status, "ready");
  assert.equal(result.totalSkills, 107);
  assert.ok(result.results.some((entry) => entry.name === "contrast-check" || entry.name === "dark-mode-mapping"));
  assert.ok(result.results.every((entry) => fs.existsSync(entry.skillPath)));
  assert.ok(result.results.every((entry) => entry.metadata && Array.isArray(entry.metadata.required_inputs)));
});

test("route composes the pinned five-route design front door", () => {
  const review = routePrismRequest({ query: "Review this frame for accessibility and contrast" });
  assert.equal(review.route, "ui-craft");
  assert.equal(review.sequence[0], "design/foundation/design-dna.md");
  assert.equal(review.ambiguous, false);
  const unknown = routePrismRequest({ query: "hello there" });
  assert.equal(unknown.status, "needs-clarification");
  assert.equal(unknown.route, null);
});

test("verification blocks a partial Prism snapshot", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-prism-"));
  try {
    const copiedRoot = path.join(temporary, "snapshot");
    fs.cpSync(path.dirname(manifestFile), copiedRoot, { recursive: true });
    fs.rmSync(path.join(copiedRoot, "upstream", "skills", "design", "foundation", "design-dna.md"));
    const result = verifyPrismSnapshot(path.join(copiedRoot, "manifest.json"));
    assert.equal(result.status, "blocked");
    assert.ok(result.issues.length > 0);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("public CLI searches, routes, and verifies the installed Prism snapshot", () => {
  for (const args of [
    ["prism", "search", "--root", repoRoot, "--query", "token contrast", "--json"],
    ["prism", "route", "--root", repoRoot, "--query", "prototype a responsive dashboard", "--json"],
    ["prism", "verify", "--root", repoRoot, "--json"],
  ]) {
    const child = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const output = JSON.parse(child.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.status, "ready");
  }
});
