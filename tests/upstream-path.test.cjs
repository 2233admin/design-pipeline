"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { STORED_NAME, storedPath, upstreamFiles, upstreamPath } = require("../skill/scripts/upstream-path.cjs");
const { canonicalTree, copyTrackedFiles } = require("../scripts/git-tree-snapshot.cjs");
const { verifyMengToSnapshot } = require("../skill/scripts/mengto-skills-core.cjs");

const repo = path.resolve(__dirname, "..");

test("SKILL.md and UPSTREAM-SKILL.md map both ways and nothing else changes", () => {
  assert.equal(STORED_NAME, "UPSTREAM-SKILL.md");
  assert.equal(storedPath("skills/good-css/SKILL.md"), "skills/good-css/UPSTREAM-SKILL.md");
  assert.equal(storedPath("skills\\good-css\\SKILL.md"), "skills\\good-css\\UPSTREAM-SKILL.md");
  assert.equal(storedPath("SKILL.md"), "UPSTREAM-SKILL.md");
  assert.equal(storedPath("skills/SKILL.md.bak"), "skills/SKILL.md.bak");
  assert.equal(upstreamPath("skills/good-css/UPSTREAM-SKILL.md"), "skills/good-css/SKILL.md");
  assert.equal(upstreamPath("README.md"), "README.md");
  assert.throws(() => storedPath("skills/x/UPSTREAM-SKILL.md"), (error) => error.code === "UPSTREAM_NAME_RESERVED");
  assert.throws(() => upstreamPath("skills/x/SKILL.md"), (error) => error.code === "UPSTREAM_NAME_UNMAPPED");
  assert.deepEqual(upstreamFiles(["a/UPSTREAM-SKILL.md", "b/SKILL.md", "c.md"]), { files: ["a/SKILL.md", "c.md"], stray: ["b/SKILL.md"], issues: ["b/SKILL.md must be stored as UPSTREAM-SKILL.md"] });
});

test("an import stores SKILL.md under the stored name and hashes it under the upstream name", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "upstream-path-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const entries = [{ path: "skills/a/SKILL.md", mode: "100644" }, { path: "README.md", mode: "100644" }];
  const blobs = new Map([["skills/a/SKILL.md", Buffer.from("skill\n")], ["README.md", Buffer.from("readme\n")]]);
  copyTrackedFiles(dir, entries, blobs);
  assert.equal(fs.existsSync(path.join(dir, "skills/a/SKILL.md")), false);
  assert.equal(fs.readFileSync(path.join(dir, "skills/a/UPSTREAM-SKILL.md"), "utf8"), "skill\n");
  const control = fs.mkdtempSync(path.join(os.tmpdir(), "upstream-path-control-"));
  t.after(() => fs.rmSync(control, { recursive: true, force: true }));
  fs.mkdirSync(path.join(control, "skills/a"), { recursive: true });
  fs.writeFileSync(path.join(control, "skills/a/SKILL.md"), "skill\n");
  fs.writeFileSync(path.join(control, "README.md"), "readme\n");
  // The canonical tree hash is the upstream tree's hash, whatever name the file is stored under.
  const crypto = require("node:crypto");
  const expected = crypto.createHash("sha256").update(["README.md", "skills/a/SKILL.md"].map((file) => `${file}\0${crypto.createHash("sha256").update(fs.readFileSync(path.join(control, file))).digest("hex")}\n`).join(""), "utf8").digest("hex");
  assert.equal(canonicalTree(dir, ["skills/a/SKILL.md", "README.md"]), expected);
});

test("an upstream that already uses the stored name is refused before any write", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "upstream-path-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const entries = [{ path: "a.md", mode: "100644" }, { path: "skills/a/UPSTREAM-SKILL.md", mode: "100644" }];
  assert.throws(() => copyTrackedFiles(dir, entries, new Map([["a.md", Buffer.from("a")], ["skills/a/UPSTREAM-SKILL.md", Buffer.from("b")]])), /reserved name/);
  assert.deepEqual(fs.readdirSync(dir), [], "nothing was written");
});

test("a SKILL.md that escaped the rename blocks verification and is named", (t) => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "upstream-path-mengto-"));
  t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
  fs.cpSync(path.join(repo, "skill/vendor/mengto-skills"), copy, { recursive: true });
  const manifest = path.join(copy, "manifest.json");
  assert.equal(verifyMengToSnapshot(manifest).status, "ready", "the stored snapshot verifies against the unchanged manifest");
  const skill = JSON.parse(fs.readFileSync(manifest, "utf8")).skills[0].path;
  fs.renameSync(path.join(copy, storedPath(skill)), path.join(copy, skill));
  const result = verifyMengToSnapshot(manifest);
  assert.equal(result.status, "blocked");
  assert.ok(result.issues.some((issue) => issue.includes(skill.replace(/^upstream\//, "")) && issue.includes("must be stored as UPSTREAM-SKILL.md")), JSON.stringify(result.issues.slice(0, 3)));
});

test("the skill directory holds exactly one SKILL.md", () => {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === "SKILL.md") found.push(path.relative(repo, file).split(path.sep).join("/"));
    }
  };
  walk(path.join(repo, "skill"));
  assert.deepEqual(found, ["skill/SKILL.md"]);
});
