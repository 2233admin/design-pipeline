"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");

test("package rejects a non-SemVer version before writing artifacts", () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-package-"));
  try {
    const result = spawnSync(
      process.execPath,
      [path.join(repoRoot, "scripts", "package.cjs"), "--output-root", outputRoot],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          PACKAGE_VERSION: "not-semver",
          SOURCE_DATE_EPOCH: "1784764800",
        },
      },
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SemVer/);
    assert.deepEqual(fs.readdirSync(outputRoot), []);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("release workflow passes dispatch input through env and validates it", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github", "workflows", "release.yml"),
    "utf8",
  );
  const resolveStep = workflow
    .split("      - name: Resolve version")[1]
    .split("      - name: QA")[0];
  const runScript = resolveStep.split("        run: |")[1];

  assert.match(resolveStep, /REQUESTED_VERSION: \$\{\{ inputs\.version \}\}/);
  assert.doesNotMatch(runScript, /\$\{\{ inputs\.version \}\}/);
  assert.match(runScript, /node scripts\/package\.cjs --help/);
});
