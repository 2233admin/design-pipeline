"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("project instructions use the packaged skill without local agent installations", () => {
  const claude = read("CLAUDE.md");
  const instructions = read("AGENTS.md");
  assert.match(claude, /^@AGENTS\.md$/m, "CLAUDE.md imports the shared AGENTS.md instructions");
  assert.match(claude, /skill\/SKILL\.md/);
  assert.doesNotMatch(claude, /\.claude\/|\.agents\/|_bmad\//);
  const skill = read("skill/SKILL.md");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  assert.match(instructions, /skill\/SKILL\.md/);
  assert.ok(frontmatter, "skill frontmatter is required");
  assert.match(frontmatter[1], /^name:\s*design-pipeline\s*$/m);
  assert.match(frontmatter[1], /^description:\s*\S+/m);
  assert.ok(skill.split(/\r?\n/).length < 500, "skill entry must stay progressively disclosed");
});

test("Git excludes local tools while preserving shared configuration and bundled dotfiles", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-git-hygiene-"));
  const git = (...args) => {
    const child = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stderr);
    return child.stdout.split("\0").filter(Boolean).sort();
  };
  const local = [".agents/skills/example/SKILL.md", ".claude/settings.json", ".sentrux/rules.toml", ".scratch/review.md", ".future-agent/state.json", ".env", "_bmad/config.toml", "_bmad-output/plan.md", "skills-lock.json"];
  const shared = [".gitattributes", ".github/workflows/ci.yml", "README.md", "skill/SKILL.md", "skill/references/.fixture/README.md"];
  try {
    git("init", "--quiet");
    fs.copyFileSync(path.join(repoRoot, ".gitignore"), path.join(root, ".gitignore"));
    for (const file of [...local, ...shared]) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), "");
    }
    git("add", "--all");
    assert.deepEqual(git("ls-files", "-z"), [".gitignore", ...shared].sort());
    git("add", "--force", "--", local[0]);
    assert.deepEqual(git("ls-files", "--cached", "--ignored", "--exclude-standard", "-z"), [local[0]], "QA's Git query detects force-added local files");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
