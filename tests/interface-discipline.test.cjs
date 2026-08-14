"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const disciplineRoot = path.join(__dirname, "../skill/references/interface-discipline");
const manifest = JSON.parse(fs.readFileSync(path.join(disciplineRoot, "manifest.json"), "utf8"));
const packageResources = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../skill/references/package-resources.json"), "utf8"),
);

function collectFiles(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name);
    return entry.isDirectory() ? collectFiles(root, next) : [next];
  });
}

test("bundles the complete pinned interface-discipline source snapshot", () => {
  assert.equal(manifest.schema, "design-pipeline.interface-discipline-source.v1");
  assert.deepEqual(manifest.source, {
    repository: "https://github.com/jakubkrehel/skills",
    revision: "0c1f1e5b2481e86c168301bebb6aa3869691ac78",
    license: "MIT",
    reviewedAt: "2026-08-12",
    scope: ["LICENSE", "README.md", "skills/**"],
  });
  assert.deepEqual(manifest.skills, [
    "better-accessibility",
    "better-colors",
    "better-interface",
    "better-layout",
    "better-typography",
    "better-ui",
    "better-writing",
    "interface-review",
  ]);

  const sourceRoot = path.join(disciplineRoot, manifest.snapshot.root);
  const entries = collectFiles(sourceRoot)
    .sort()
    .map((relative) => {
      const content = fs.readFileSync(path.join(sourceRoot, relative));
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      return `${relative.split(path.sep).join("/")}\0${hash}\n`;
    });
  const treeSha256 = crypto.createHash("sha256").update(entries.join(""), "utf8").digest("hex");

  assert.equal(entries.length, manifest.snapshot.fileCount);
  assert.equal(treeSha256, manifest.snapshot.treeSha256);
  const resourcePaths = packageResources.required
    .filter((entry) => entry.startsWith("references/interface-discipline/upstream/"))
    .map((entry) => entry.slice("references/interface-discipline/upstream/".length))
    .sort();
  assert.deepEqual(resourcePaths, collectFiles(sourceRoot).map((entry) => entry.split(path.sep).join("/")).sort());
  assert.match(fs.readFileSync(path.join(sourceRoot, "LICENSE"), "utf8"), /Copyright \(c\) 2026 Jakub Krehel/);
  for (const skill of manifest.skills) {
    assert.ok(fs.existsSync(path.join(sourceRoot, "skills", skill, "SKILL.md")), `missing ${skill}`);
  }
});

test("publishes the bundle as a built-in pipeline protocol", () => {
  const protocol = fs.readFileSync(path.join(disciplineRoot, "../interface-discipline.md"), "utf8");
  const pipeline = fs.readFileSync(path.join(__dirname, "../skill/SKILL.md"), "utf8");
  assert.match(protocol, /not an\noptional companion/);
  assert.match(protocol, /Introduced` \/ `Regression` \/ `Pre-existing/);
  assert.match(pipeline, /references\/interface-discipline\.md/);
});
