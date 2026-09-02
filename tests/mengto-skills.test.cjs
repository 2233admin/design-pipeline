"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/references/mengto-skills/manifest.json");
const kageCaseStudyFile = path.join(repoRoot, "skill/references/kage-scroll-world.md");
const { gitTreeId, loadMengToCatalog, searchMengToSkills, verifyMengToSnapshot } = require("../skill/scripts/mengto-skills-core.cjs");

test("bundles the complete pinned MengTo skills source tree", () => {
  const { manifest } = loadMengToCatalog(manifestFile);
  assert.deepEqual(manifest.source, {
    repository: "https://github.com/MengTo/skills",
    revision: "3f4c22d10055d3fdddb17248d59d0c1b731cb8d3",
    gitTree: "d7d6a6b440a85bb183d40311d0506876d09493b3",
    committedAt: "2026-08-11T17:06:55+08:00",
    license: "MIT",
    reviewedAt: "2026-08-12",
    scope: ["**"],
  });
  assert.deepEqual(manifest.categories, {
    codex: 19,
    "game-development": 20,
    media: 2,
    ui: 1,
    "web-design": 85,
  });
  assert.equal(manifest.skills.length, 127);
  assert.equal(manifest.snapshot.fileCount, 867);
  assert.equal(manifest.snapshot.byteCount, 94402253);
  assert.equal(manifest.snapshot.treeSha256, "36db5446edb2ea7be57d282081b4b9602a0e9653661311ed0bd4a7e5f1b70536");
  assert.equal(manifest.snapshot.executableFiles.length, 9);
  assert.equal(manifest.snapshot.objects.length, 867);
  assert.equal(gitTreeId(manifest.snapshot.objects), manifest.source.gitTree);
  const verification = verifyMengToSnapshot(manifestFile);
  assert.equal(verification.status, "ready");
  assert.equal(verification.executableFiles, 9);
  assert.equal(verification.gitTree, manifest.source.gitTree);
  assert.match(
    fs.readFileSync(path.join(path.dirname(manifestFile), "upstream/LICENSE"), "utf8"),
    /Copyright \(c\) 2026 Meng To/,
  );
});

test("search routes design playbooks while preserving explicit-only boundaries", () => {
  const scroll = searchMengToSkills({ query: "scroll controlled threejs world", limit: 3 });
  assert.equal(scroll.results[0].id, "web-design/build-threejs-scroll-worlds");
  assert.equal(scroll.results[0].activation, "automatic");
  assert.ok(fs.existsSync(scroll.results[0].skillPath));

  const voice = searchMengToSkills({ query: "write like Meng on X", limit: 1 });
  assert.equal(voice.results[0].id, "codex/write-like-meng-on-x");
  assert.equal(voice.results[0].activation, "explicit");

  const ship = searchMengToSkills({ query: "ship web games", limit: 1 });
  assert.equal(ship.results[0].id, "game-development/ship-web-games");
  assert.equal(ship.results[0].activation, "explicit");
  assert.ok(ship.results[0].stages.includes("publication"));

  assert.throws(() => searchMengToSkills({ query: "!!!" }), /searchable letters or numbers/);
  assert.throws(() => searchMengToSkills({ query: "blur", limit: "2junk" }), /integer from 1 to 20/);
  assert.throws(() => searchMengToSkills({ query: "blur", limit: 2.9 }), /integer from 1 to 20/);
});

test("routes Kage through the bundled playbook and clean-room delta", () => {
  const result = searchMengToSkills({ query: "Kage", limit: 3 });
  assert.equal(result.results[0].id, "web-design/build-threejs-scroll-worlds");
  assert.deepEqual(result.results[0].pipelineReferences, [kageCaseStudyFile]);

  const caseStudy = fs.readFileSync(kageCaseStudyFile, "utf8");
  assert.match(caseStudy, /4399487d2fb42bce39c7b032fbbb50d230bf4f0b/);
  assert.match(caseStudy, /no license is granted/i);
  assert.match(caseStudy, /document\.documentElement\.clientWidth/);
  assert.match(caseStudy, /backdrop-filter/);
  assert.match(caseStudy, /overflow-x: clip/);

  const packageResources = JSON.parse(fs.readFileSync(
    path.join(repoRoot, "skill/references/package-resources.json"),
    "utf8",
  ));
  assert.ok(packageResources.required.includes("references/kage-scroll-world.md"));
});

test("public CLI searches and verifies the installed bundled snapshot", () => {
  for (const args of [
    ["mengto", "search", "--root", repoRoot, "--query", "progressive blur", "--limit", "2", "--json"],
    ["mengto", "verify", "--root", repoRoot, "--json"],
  ]) {
    const child = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const output = JSON.parse(child.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.status, "ready");
  }
});
