"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const referenceRoot = path.join(repoRoot, "skill", "references", "deepclonewebsite");
const manifest = JSON.parse(fs.readFileSync(path.join(referenceRoot, "manifest.json"), "utf8"));
const packageResources = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "skill", "references", "package-resources.json"), "utf8"),
);

function collectFiles(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name);
    return entry.isDirectory() ? collectFiles(root, next) : [next];
  });
}

test("bundles the pinned deepclonewebsite feature slice", () => {
  assert.equal(manifest.schema, "design-pipeline.deepclonewebsite-source.v1");
  assert.deepEqual(manifest.source, {
    repository: "https://github.com/hi5jeff/deepclonewebsite",
    revision: "ab180fbe14a0f86c478bf033b375b1d40fabe6b1",
    gitTree: "6deeff7edb181ed4f50dff024c3620fe138e32a7",
    license: "MIT",
    reviewedAt: "2026-08-12",
    scope: [
      "LICENSE",
      "README.zh-CN.md",
      "open-lovable/package.json",
      "open-lovable/lib/i18n.ts",
      "open-lovable/lib/crawl/**",
      "open-lovable/app/api/crawl/**",
      "open-lovable/app/site-clone/page.tsx",
    ],
  });

  const sourceRoot = path.join(referenceRoot, manifest.snapshot.root);
  let normalizedByteCount = 0;
  const entries = collectFiles(sourceRoot)
    .sort()
    .map((relative) => {
      const content = fs.readFileSync(path.join(sourceRoot, relative), "utf8").replace(/\r\n/g, "\n");
      normalizedByteCount += Buffer.byteLength(content);
      const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
      return `${relative.split(path.sep).join("/")}\0${hash}\n`;
    });
  const treeSha256 = crypto.createHash("sha256").update(entries.join(""), "utf8").digest("hex");

  assert.equal(entries.length, manifest.snapshot.fileCount);
  assert.equal(normalizedByteCount, manifest.snapshot.normalizedByteCount);
  assert.equal(treeSha256, manifest.snapshot.treeSha256);
  assert.match(fs.readFileSync(path.join(sourceRoot, "LICENSE"), "utf8"), /Copyright \(c\) 2026 hi5jeff/);
  for (const relative of [
    "open-lovable/lib/crawl/browser-session.ts",
    "open-lovable/lib/crawl/site-crawler.ts",
    "open-lovable/lib/crawl/rebuild-site.ts",
    "open-lovable/lib/crawl/analyze-site.ts",
    "open-lovable/lib/crawl/run-task.ts",
    "open-lovable/app/site-clone/page.tsx",
  ]) {
    assert.ok(fs.existsSync(path.join(sourceRoot, relative)), `missing ${relative}`);
  }

  const packaged = packageResources.required
    .filter((entry) => entry.startsWith("references/deepclonewebsite/upstream/"))
    .map((entry) => entry.slice("references/deepclonewebsite/upstream/".length))
    .sort();
  assert.deepEqual(
    packaged,
    collectFiles(sourceRoot).map((entry) => entry.split(path.sep).join("/")).sort(),
  );
});

test("integrates the feature slice as a strict passive protocol", () => {
  const protocol = fs.readFileSync(path.join(referenceRoot, "../deepclonewebsite.md"), "utf8");
  const cloning = fs.readFileSync(path.join(referenceRoot, "../website-cloning.md"), "utf8");
  const pipeline = fs.readFileSync(path.join(repoRoot, "skill", "SKILL.md"), "utf8");

  assert.equal(manifest.boundary.passiveReferenceOnly, true);
  assert.equal(manifest.boundary.addsRuntimeDependency, false);
  assert.match(protocol, /Do not swallow navigation, download/);
  assert.match(protocol, /Do not use blind retries/);
  assert.match(protocol, /hypotheses derived from visible UI evidence/);
  assert.match(protocol, /Direct[\s\S]*Structure[\s\S]*Full/);
  assert.match(cloning, /references\/deepclonewebsite\.md/);
  assert.match(pipeline, /references\/deepclonewebsite\.md/);
  assert.ok(packageResources.required.includes("references/deepclonewebsite.md"));
  assert.ok(packageResources.required.includes("references/deepclonewebsite/manifest.json"));
});
