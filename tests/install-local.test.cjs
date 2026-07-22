"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const installer = path.resolve(__dirname, "../scripts/install-local.cjs");

function fixture(withSkill = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-install-"));
  const source = path.join(root, "source");
  const skills = path.join(root, "skills");
  const target = path.join(skills, "design-pipeline");
  fs.mkdirSync(source);
  if (withSkill) fs.writeFileSync(path.join(source, "SKILL.md"), "# fixture\n");
  fs.writeFileSync(path.join(source, "version.txt"), "new\n");
  return { root, source, skills, target };
}

function run(item, extra = []) {
  return spawnSync(process.execPath, [installer, "--root", item.skills, "--target", item.target, "--source", item.source, ...extra], { encoding: "utf8", windowsHide: true });
}

test("fresh install and explicit replacement complete from a staged copy", () => {
  const item = fixture();
  const first = run(item);
  assert.equal(first.status, 0, first.stderr || first.stdout);
  fs.writeFileSync(path.join(item.source, "version.txt"), "replacement\n");
  const withoutAuthority = run(item);
  assert.equal(withoutAuthority.status, 1);
  assert.equal(fs.readFileSync(path.join(item.target, "version.txt"), "utf8"), "new\n");
  const replacement = run(item, ["--replace"]);
  assert.equal(replacement.status, 0, replacement.stderr || replacement.stdout);
  assert.equal(fs.readFileSync(path.join(item.target, "version.txt"), "utf8"), "replacement\n");
});

test("failed replacement preserves the previous installed tree", () => {
  const item = fixture();
  assert.equal(run(item).status, 0);
  const previousSkill = fs.readFileSync(path.join(item.target, "SKILL.md"));
  fs.rmSync(path.join(item.source, "SKILL.md"));
  const failed = run(item, ["--replace"]);
  assert.equal(failed.status, 1);
  assert.deepEqual(fs.readFileSync(path.join(item.target, "SKILL.md")), previousSkill);
  assert.equal(fs.readFileSync(path.join(item.target, "version.txt"), "utf8"), "new\n");
  assert.equal(fs.readdirSync(item.skills).some((name) => name.includes(".tmp-") || name.includes(".backup-") || name.endsWith(".install.lock")), false);
});

test("source and target nesting is rejected before mutation", () => {
  const item = fixture();
  item.skills = item.source;
  item.target = path.join(item.source, "nested-target");
  const result = run(item);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /descendant/);
  assert.equal(fs.existsSync(item.target), false);
});

test("a packaged installer defaults its source to the extracted package root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-packaged-install-"));
  const packageRoot = path.join(root, "design-pipeline");
  const packageScripts = path.join(packageRoot, "scripts");
  const skills = path.join(root, "skills");
  const target = path.join(skills, "design-pipeline");
  fs.mkdirSync(packageScripts, { recursive: true });
  fs.copyFileSync(installer, path.join(packageScripts, "install-local.cjs"));
  fs.writeFileSync(path.join(packageRoot, "SKILL.md"), "# packaged fixture\n");
  fs.writeFileSync(path.join(packageRoot, "version.txt"), "packaged\n");

  const result = spawnSync(process.execPath, [path.join(packageScripts, "install-local.cjs"), "--root", skills, "--target", target], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.readFileSync(path.join(target, "version.txt"), "utf8"), "packaged\n");
});
