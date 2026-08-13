const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const script = path.resolve(__dirname, "../skill/scripts/github.cjs");
const { parseArgs, snippet, slug, truncate } = require("../skill/scripts/github.cjs");

test("parses shared GitHub workflow options without shell interpretation", () => {
  assert.deepEqual(parseArgs(["17", "-R", "owner/repo", "--since=2026-08-01T00:00:00Z", "--json"]), {
    positionals: ["17"],
    repo: "owner/repo",
    since: "2026-08-01T00:00:00Z",
    json: true,
  });
  assert.throws(() => parseArgs(["--unknown"]), /unknown option/);
});

test("keeps bounded CI context around the last error marker", () => {
  const log = ["noise", "old error", ...Array.from({ length: 50 }, (_, index) => `line-${index}`), "##[error] root cause", "cleanup", "tail"].join("\n");
  const result = snippet(log, 2, 1, 5);
  assert.match(result, /line-49/);
  assert.match(result, /root cause/);
  assert.doesNotMatch(result, /old error/);
  assert.equal(slug("Build / Windows #1"), "build-windows-1");
  assert.equal(truncate("abcdef", 3), "abc […+3 chars]");
});

test("help is available without gh credentials", () => {
  const result = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /pr-snapshot/);
  assert.match(result.stdout, /ci-failures/);
});
