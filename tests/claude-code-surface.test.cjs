"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("project exposes a valid Claude Code instruction and skill surface", () => {
  const instructions = read("CLAUDE.md");
  const skill = read(".claude/skills/design-pipeline/SKILL.md");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const body = frontmatter ? skill.slice(frontmatter[0].length) : "";

  assert.match(instructions, /skill\/SKILL\.md/);
  assert.ok(frontmatter, "skill frontmatter is required");
  assert.match(frontmatter[1], /^name:\s*design-pipeline\s*$/m);
  assert.match(frontmatter[1], /^description:\s*\S+/m);
  assert.ok(skill.split(/\r?\n/).length < 500, "router must stay progressively disclosed");
  assert.doesNotMatch(body, /^#{1,6}\s/m, "skill body uses XML tags instead of headings");
  for (const tag of ["objective", "quick_start", "success_criteria"]) {
    assert.match(body, new RegExp(`<${tag}>[\\s\\S]*<\\/${tag}>`));
  }
  assert.ok(fs.existsSync(path.join(repoRoot, "skill/SKILL.md")), "packaged skill entrypoint must remain present");
});
