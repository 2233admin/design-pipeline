"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalTree } = require("../scripts/git-tree-snapshot.cjs");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");
const { restoreUpstreamNames, storedTree, upstreamFilesIn } = require("./helpers/upstream-names.cjs");
const { SHA1, lockedSource } = require("./helpers/locked-source.cjs");

const repoRoot = path.resolve(__dirname, "..");
const vendorRoot = path.join(repoRoot, "skill/vendor/gepa");
const sourceRoot = path.join(vendorRoot, "upstream");
const manifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, "manifest.json"), "utf8"));
const skillPrefix = ".claude/skills/gepa-optimize-anything/";
const rootFiles = ["LICENSE", "README.md", "pyproject.toml"];
// The scope is the official skill folder plus three root files at the locked revision.
const reviewedFiles = upstreamFilesIn(sourceRoot);
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, ...env }, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

test("GEPA preserves the official skill folder and selected root metadata as exact locked blobs", () => {
  assert.equal(manifest.schema, "design-pipeline.gepa-source.v1");
  assert.equal(manifest.source.repository, "https://github.com/gepa-ai/gepa");
  assert.equal(manifest.source.revision, lockedSource("gepa").revision);
  assert.match(manifest.source.gitTree, SHA1);
  assert.deepEqual(manifest.source.scope, [`${skillPrefix}**`, "LICENSE", "README.md", "pyproject.toml"]);
  assert.match(manifest.source.contentHashScope, /selected.*upstream repository root.*not this scoped snapshot/);
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(reviewedFiles.filter(file => !file.startsWith(skillPrefix) && !rootFiles.includes(file)), []);
  for (const file of [...rootFiles, `${skillPrefix}SKILL.md`]) assert.ok(reviewedFiles.includes(file), file);
  assert.equal(manifest.snapshot.fileCount, reviewedFiles.length);
  assert.equal(manifest.snapshot.root, "upstream");
  assert.deepEqual(manifest.snapshot.objects.map(object => object.path).sort(), reviewedFiles);
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    const content = fs.readFileSync(path.join(sourceRoot, storedPath(object.path)));
    bytes += content.length;
    assert.equal(object.mode, "100644", object.path);
    assert.equal(object.size, content.length, object.path);
    assert.equal(object.oid, crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex"), object.path);
  }
  assert.equal(bytes, manifest.snapshot.byteCount);
  assert.equal(manifest.snapshot.treeSha256, lockedSource("gepa").treeSha256);
  assert.equal(canonicalTree(sourceRoot, reviewedFiles), manifest.snapshot.treeSha256);
  assert.deepEqual(manifest.snapshot.executableFiles, []);
  assert.deepEqual(manifest.skills, [{ name: "gepa-optimize-anything", path: `upstream/${skillPrefix}SKILL.md` }]);
  assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "MIT", copyright: "Copyright © 2025 Lakshya A Agrawal" }]);
  assert.ok(fs.readFileSync(path.join(sourceRoot, "LICENSE"), "utf8").startsWith(manifest.licenses[0].copyright));
  for (const field of ["installsUpstreamDependencies", "executesUpstreamScripts", "executesDeployment", "changesProjectRuntime"]) assert.equal(manifest.boundary[field], false, field);
});

test("GEPA import rejects dirty, incomplete and invalid-date input without replacing prior output", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-gepa-import-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "skill/scripts"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "skill/scripts/upstream-path.cjs"), path.join(root, "skill/scripts/upstream-path.cjs"));
  for (const file of ["import-gepa.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(root, "scripts", file));
  const destination = path.join(root, "skill/vendor/gepa");
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, "manifest.json"), "previous snapshot\n");
  fs.writeFileSync(path.join(destination, "preserved.txt"), "previous bytes\n");
  const before = storedTree(destination);
  const source = path.join(root, "source");
  fs.cpSync(sourceRoot, source, { recursive: true });
  restoreUpstreamNames(source);
  const git = args => { const result = run("git", args, source); assert.equal(result.status, 0, result.stderr); };
  git(["init", "--quiet"]);
  git(["config", "core.autocrlf", "false"]);
  git(["add", "--force", "."]);
  const commit = () => git(["-c", "user.name=GEPA Test", "-c", "user.email=gepa-test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
  commit();
  const rejects = (pattern, date = "2026-10-09") => {
    const result = run(process.execPath, [path.join(root, "scripts/import-gepa.cjs"), "--source", source, "--reviewed-at", date], root);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, pattern);
    assert.equal(storedTree(destination), before);
    assert.deepEqual(fs.readdirSync(path.dirname(destination)), ["gepa"]);
  };
  fs.appendFileSync(path.join(source, "README.md"), "dirty\n");
  rejects(/tracked working-tree changes/);
  fs.copyFileSync(path.join(sourceRoot, "README.md"), path.join(source, "README.md"));
  fs.writeFileSync(path.join(source, "LICENSE"), "wrong license\n");
  git(["add", "."]); commit();
  rejects(/LICENSE does not match reviewed/);
  fs.rmSync(path.join(source, skillPrefix, "SKILL.md"));
  rejects(/missing .*SKILL/);
  rejects(/valid YYYY-MM-DD/, "2026-02-30");
});

test("GEPA guide and supporting entry reach the packaged source and every declared local link", () => {
  const resources = JSON.parse(read("skill/references/package-resources.json"));
  const prefix = "vendor/gepa/upstream/";
  assert.ok(resources.required.includes("references/gepa.md"));
  assert.ok(resources.required.includes("vendor/gepa/manifest.json"));
  assert.deepEqual(resources.required.filter(file => file.startsWith(prefix)).map(file => file.slice(prefix.length)).sort(), reviewedFiles.map(storedPath).sort());
  const guidePath = path.join(repoRoot, "skill/references/gepa.md");
  const guide = fs.readFileSync(guidePath, "utf8");
  assert.ok(read("skill/SKILL.md").includes("`references/gepa.md`"));
  assert.match(read("skill/tools/README.md"), /gepa\.md/);
  assert.match(read("skill/references/capability-routing.md"), /gepa\.md/);
  const links = [...guide.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]).filter(target => !/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith("#"));
  assert.ok(links.includes(`../vendor/gepa/upstream/${skillPrefix}UPSTREAM-SKILL.md`));
  assert.ok(links.includes("../vendor/gepa/upstream/LICENSE"));
  for (const target of links) {
    const file = path.resolve(path.dirname(guidePath), decodeURIComponent(target.split("#")[0]));
    const relative = path.relative(path.join(repoRoot, "skill"), file);
    assert.ok(relative && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`), target);
    assert.ok(fs.statSync(file).isFile(), target);
  }
});

test("relocated core resource checking rejects a missing official GEPA source file", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-gepa-resources-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const skillRoots = path.join(root, "skills");
  const installed = path.join(skillRoots, "design-pipeline");
  fs.mkdirSync(path.join(installed, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(installed, "references"));
  fs.cpSync(vendorRoot, path.join(installed, "vendor/gepa"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "skill/SKILL.md"), path.join(installed, "SKILL.md"));
  fs.copyFileSync(path.join(repoRoot, "skill/scripts/check-deps.cjs"), path.join(installed, "scripts/check-deps.cjs"));
  const resources = JSON.parse(read("skill/references/package-resources.json"));
  resources.required = resources.required.filter(file => file.startsWith("vendor/gepa/"));
  fs.writeFileSync(path.join(installed, "references/package-resources.json"), JSON.stringify(resources));
  const registry = { schema: "design-pipeline-companions.v1", groups: [{ name: "Core pipeline", level: "required", skills: ["design-pipeline"], resourceManifest: "package-resources.json" }], profiles: [], surfaces: [] };
  fs.writeFileSync(path.join(installed, "references/companion-capabilities.json"), JSON.stringify(registry));
  const env = { DESIGN_PIPELINE_SKILL_ROOTS: skillRoots, CODEX_SKILLS_DIR: "", CODEX_HOME: path.join(root, "home/.codex"), HOME: path.join(root, "home"), USERPROFILE: path.join(root, "home") };
  const check = () => run(process.execPath, [path.join(installed, "scripts/check-deps.cjs"), "--json"], root, env);
  const complete = check();
  assert.equal(complete.status, 0, complete.stderr || complete.stdout);
  const missing = `vendor/gepa/upstream/${skillPrefix}UPSTREAM-SKILL.md`;
  fs.rmSync(path.join(installed, missing));
  const broken = check();
  assert.equal(broken.status, 1, broken.stdout);
  const core = JSON.parse(broken.stdout).groups.find(group => group.name === "Core pipeline");
  assert.ok(core.missingResources.includes(`design-pipeline/${missing}`));
});
