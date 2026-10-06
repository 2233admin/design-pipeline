"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/vendor/mengto-skills/manifest.json");
const kageCaseStudyFile = path.join(repoRoot, "skill/references/kage-scroll-world.md");
const { gitTreeId, loadMengToCatalog, searchMengToSkills, verifyMengToSnapshot } = require("../skill/scripts/mengto-skills-core.cjs");

test("bundles the complete pinned MengTo skills source tree", () => {
  const { manifest } = loadMengToCatalog(manifestFile);
  assert.deepEqual(manifest.source, {
    repository: "https://github.com/MengTo/skills",
    revision: "83a47fee32f0b6349bff1fede99257a5ef03dc93",
    gitTree: "4c231bc88ecbad19627105dcd8a16fd122ddf5e7",
    committedAt: "2026-10-06T22:20:24+08:00",
    license: "MIT",
    reviewedAt: "2026-10-07",
    scope: ["**"],
  });
  assert.deepEqual(manifest.categories, {
    "3d": 16,
    codex: 20,
    "game-combat": 6,
    "game-development": 20,
    illustration: 14,
    media: 2,
    ui: 3,
    "web-design": 91,
    workflow: 4,
  });
  assert.equal(manifest.skills.length, 176);
  assert.equal(manifest.snapshot.fileCount, 1313);
  assert.equal(manifest.snapshot.byteCount, 136325371);
  assert.equal(manifest.snapshot.treeSha256, "856f257256ae8022de29a9518df9adebe1e67043d2d1e5a8b442b4c4b7a9ed4c");
  assert.equal(manifest.snapshot.executableFiles.length, 26);
  assert.equal(manifest.snapshot.objects.length, 1313);
  assert.equal(manifest.skills.find((skill) => skill.id === "workflow/workflow-ship-change").activation, "explicit");
  assert.equal(manifest.skills.find((skill) => skill.id === "workflow/workflow-threads-manager").activation, "explicit");
  assert.equal(gitTreeId(manifest.snapshot.objects), manifest.source.gitTree);
  const verification = verifyMengToSnapshot(manifestFile);
  assert.equal(verification.status, "ready");
  assert.equal(verification.executableFiles, 26);
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

  const publish = searchMengToSkills({ query: "ship change publish workflow", limit: 1 });
  assert.equal(publish.results[0].id, "workflow/workflow-ship-change");
  assert.equal(publish.results[0].activation, "explicit");

  const particles = searchMengToSkills({ query: "GPU particle trail mouse interaction", limit: 1 });
  assert.equal(particles.results[0].id, "web-design/build-interactive-particle-trail");
  assert.equal(particles.results[0].activation, "automatic");

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
