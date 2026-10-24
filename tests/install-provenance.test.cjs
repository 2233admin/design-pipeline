"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const installer = path.join(repoRoot, "scripts/install-local.cjs");
const { treeDigest, FILE, SCHEMA } = require("../skill/scripts/install-provenance.cjs");
const { installCommand } = require("../skill/scripts/install-hints.cjs");
const { WHOLE_BUNDLES } = require("../skill/scripts/vendor-cache.cjs");

// Long real paths: the doctor classifies its location from its own resolved path.
const scratch = (prefix) => fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");

function git(cwd, ...args) {
  const result = spawnSync("git", ["-c", "core.autocrlf=false", "-c", "user.name=QA", "-c", "user.email=qa@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

// One committed checkout of the working skill (repository layout: VERSION beside skill/). The
// on-demand bundles are left out, as in a package: doctor then lists them as optional downloads.
const work = scratch("design-pipeline-provenance-");
const checkout = path.join(work, "checkout");
const checkoutSkill = path.join(checkout, "skill");
const onDemand = new Set(WHOLE_BUNDLES.map((bundle) => path.join(repoRoot, "skill", "vendor", bundle, "upstream")));
let head;
test.before(() => {
  fs.cpSync(path.join(repoRoot, "skill"), checkoutSkill, { recursive: true, filter: (source) => !onDemand.has(source) });
  fs.writeFileSync(path.join(checkout, "VERSION"), "9.8.7\n");
  git(checkout, "init", "-q");
  git(checkout, "add", "-A");
  git(checkout, "commit", "-q", "-m", "fixture");
  head = git(checkout, "rev-parse", "HEAD");
});
test.after(() => fs.rmSync(work, { recursive: true, force: true }));

// Installs under <project>/.agents/skills, a standard location when doctor runs from <project>.
function install(source, name, extra = []) {
  const project = path.join(work, name);
  const skills = path.join(project, ".agents", "skills");
  fs.mkdirSync(skills, { recursive: true });
  const result = spawnSync(process.execPath, [installer, "--root", skills, "--source", source, ...extra], { encoding: "utf8", windowsHide: true });
  return { result, project, target: path.join(skills, "design-pipeline") };
}

function doctor(item, json = true) {
  const child = spawnSync(process.execPath, [path.join(item.target, "scripts/designer-pipeline.cjs"), "doctor", ...(json ? ["--json"] : [])], { cwd: item.project, encoding: "utf8", windowsHide: true });
  return { ...child, output: json ? JSON.parse(child.stdout) : null };
}

const reinstall = installCommand("skill");
const find = (report, tier, id) => report.environment.tiers[tier].find((entry) => entry.id === id);

test("digest rules v1: sorted UTF-8 path bytes, raw bytes, the record and runtime state excluded", () => {
  const root = scratch("design-pipeline-digest-");
  try {
    const files = {
      "SKILL.md": "line\r\nnext\n",
      "a.b": "dot",
      "a/b": "slash",
      "\uff61.txt": "halfwidth",
      "\u{1f600}.txt": "emoji",
    };
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      fs.writeFileSync(path.join(root, name), content);
    }
    // UTF-16 order would put the emoji (D83D) before U+FF61; UTF-8 bytes put EF BD A1 before F0 9F.
    const order = ["SKILL.md", "a.b", "a/b", "\uff61.txt", "\u{1f600}.txt"];
    const expected = `sha256:${sha(Buffer.concat(order.map((name) => Buffer.from(`${name}\0${sha(Buffer.from(files[name]))}\n`, "utf8"))))}`;
    const digest = treeDigest(root);
    assert.equal(digest, expected);

    fs.writeFileSync(path.join(root, FILE), "{\"anything\": true}\n");
    fs.mkdirSync(path.join(root, ".design-pipeline"));
    fs.writeFileSync(path.join(root, ".design-pipeline", "state.json"), "{}\n");
    assert.equal(treeDigest(root), digest, "the record and runtime state are not part of the digest");

    fs.writeFileSync(path.join(root, "SKILL.md"), "line\nnext\n");
    assert.notEqual(treeDigest(root), digest, "line endings are bytes");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

let clean;
test("a fresh install records its commit and version, and doctor shows a matching digest", () => {
  clean = install(checkoutSkill, "clean");
  assert.equal(clean.result.status, 0, clean.result.stderr || clean.result.stdout);
  const record = JSON.parse(fs.readFileSync(path.join(clean.target, FILE), "utf8"));
  assert.deepEqual(record, { schema: SCHEMA, version: "9.8.7", commit: head, dirty: false, treeDigest: record.treeDigest, digestRules: "v1" });
  assert.deepEqual(JSON.parse(clean.result.stdout).provenance, { version: "9.8.7", commit: head, dirty: false, treeDigest: record.treeDigest });

  const report = doctor(clean);
  assert.equal(report.status, 0, report.stdout);
  assert.equal(report.output.status, "ready");
  assert.equal(report.output.environment.install.kind, "agents-skills");
  assert.equal(report.output.provenance.commit, head);
  assert.equal(report.output.provenance.digestMatch, true);
  assert.equal(find(report.output, "required", "provenance").ok, true);
  const text = doctor(clean, false);
  assert.equal(text.status, 0);
  assert.match(text.stdout, new RegExp(`Source {8}v9\\.8\\.7, commit ${head.slice(0, 7)}, clean, digest matches`));
});

test("runtime state written into the installed root keeps the digest", () => {
  fs.mkdirSync(path.join(clean.target, ".design-pipeline"), { recursive: true });
  fs.writeFileSync(path.join(clean.target, ".design-pipeline", "state.json"), "{}\n");
  const report = doctor(clean);
  assert.equal(report.status, 0, report.stdout);
  assert.equal(report.output.provenance.digestMatch, true);
});

test("installing a packaged root whose recorded digest does not match its files fails", () => {
  const packaged = path.join(work, "packaged", "design-pipeline");
  fs.cpSync(clean.target, packaged, { recursive: true });
  fs.rmSync(path.join(packaged, ".design-pipeline"), { recursive: true });
  const intact = install(packaged, "packaged-intact");
  assert.equal(intact.result.status, 0, intact.result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(intact.target, FILE), "utf8")), JSON.parse(fs.readFileSync(path.join(packaged, FILE), "utf8")), "a carried record is kept");

  fs.appendFileSync(path.join(packaged, "SKILL.md"), "\nedited after packaging\n");
  const tampered = install(packaged, "packaged-tampered");
  assert.equal(tampered.result.status, 1);
  assert.match(tampered.result.stderr, /source files do not match PACKAGE\.json/);
  assert.equal(fs.existsSync(tampered.target), false);
});

test("an edited file in the installed copy blocks doctor with the reinstall command", () => {
  fs.appendFileSync(path.join(clean.target, "references", "stages.md"), "\nlocal edit\n");
  const report = doctor(clean);
  assert.equal(report.status, 2);
  assert.equal(report.output.status, "blocked");
  assert.equal(report.output.missing.length, 0);
  assert.equal(report.output.provenance.digestMatch, false);
  const entry = find(report.output, "required", "provenance");
  assert.equal(entry.ok, false);
  assert.equal(entry.fix, reinstall);
  assert.match(entry.detail, /digest mismatch/);
  const text = doctor(clean, false);
  assert.match(text.stdout, /Result: blocked/);
  assert.ok(text.stdout.includes(`run: ${reinstall}`));
});

test("without the record doctor warns once and does not block", () => {
  fs.rmSync(path.join(clean.target, FILE));
  const report = doctor(clean);
  assert.equal(report.status, 0, report.stdout);
  assert.equal(report.output.status, "ready");
  assert.equal(report.output.provenance.status, "absent");
  assert.equal(find(report.output, "required", "provenance"), undefined);
  const warning = find(report.output, "recommended", "provenance");
  assert.equal(warning.ok, false);
  assert.equal(warning.detail, "provenance not recorded");
  assert.equal(warning.fix, reinstall);
});

test("a source with uncommitted changes installs with dirty: true and doctor blocks", () => {
  fs.appendFileSync(path.join(checkoutSkill, "references", "stages.md"), "\nuncommitted\n");
  try {
    const dirty = install(checkoutSkill, "dirty");
    assert.equal(dirty.result.status, 0, dirty.result.stderr || dirty.result.stdout);
    assert.equal(JSON.parse(dirty.result.stdout).provenance.dirty, true);
    const report = doctor(dirty);
    assert.equal(report.status, 2);
    assert.equal(report.output.provenance.dirty, true);
    assert.equal(report.output.provenance.digestMatch, true);
    const entry = find(report.output, "required", "provenance");
    assert.equal(entry.ok, false);
    assert.equal(entry.fix, reinstall);
    assert.match(entry.detail, /uncommitted changes/);
  } finally {
    git(checkout, "checkout", "--", "skill/references/stages.md");
  }
});

test("a checkout run in place shows its Git state and is never blocked by it", () => {
  fs.appendFileSync(path.join(checkoutSkill, "references", "stages.md"), "\nuncommitted\n");
  try {
    const child = spawnSync(process.execPath, [path.join(checkoutSkill, "scripts/designer-pipeline.cjs"), "doctor", "--json"], { cwd: work, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stdout);
    const report = JSON.parse(child.stdout);
    assert.equal(report.environment.install.kind, "other");
    assert.deepEqual(report.environment.install.git, { commit: head, branch: report.environment.install.git.branch, dirty: true });
    assert.equal(report.environment.tiers.recommended.some((entry) => entry.id === "provenance"), false);
  } finally {
    git(checkout, "checkout", "--", "skill/references/stages.md");
  }
});
