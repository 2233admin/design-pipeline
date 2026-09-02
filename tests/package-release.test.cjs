"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const { readReleaseContract, validateReleaseContract, formatReleaseContractResult } = require(
  path.join(repoRoot, "scripts", "release-contract.cjs"),
);

function makeReleaseFixture(version, changelogVersions = [version]) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-release-"));
  fs.writeFileSync(path.join(fixtureRoot, "VERSION"), `${version}\n`);
  fs.writeFileSync(
    path.join(fixtureRoot, "CHANGELOG.md"),
    `# Changelog\n\n${changelogVersions.map((entry) => `## [${entry}] - 2026-09-02\n`).join("\n")}`,
  );
  return fixtureRoot;
}

test("release contract accepts matching VERSION, changelog, and tag", () => {
  const result = validateReleaseContract(repoRoot, { version: "0.10.0", tag: "v0.10.0" });
  assert.deepEqual(result, {
    ok: true,
    version: "0.10.0",
    declaredVersion: "0.10.0",
    tag: "v0.10.0",
    changelogEntryCount: 1,
    errors: [],
  });
  assert.equal(formatReleaseContractResult(result), "OK release contract: v0.10.0");
});

test("release contract reports requested-version, tag, duplicate, and missing-entry failures", () => {
  const duplicateRoot = makeReleaseFixture("1.2.3", ["1.2.3", "1.2.3"]);
  const missingRoot = makeReleaseFixture("1.2.3", ["1.2.2"]);
  try {
    const mismatch = validateReleaseContract(duplicateRoot, { version: "1.2.4", tag: "v1.2.4" });
    assert.equal(mismatch.ok, false);
    assert.match(mismatch.errors.join("\n"), /does not match VERSION/);
    assert.match(mismatch.errors.join("\n"), /tag must equal/);
    assert.match(mismatch.errors.join("\n"), /exactly one/);

    const duplicate = validateReleaseContract(duplicateRoot, { version: "1.2.3" });
    assert.equal(duplicate.changelogEntryCount, 2);
    assert.match(formatReleaseContractResult(duplicate), /found 2/);

    const missing = validateReleaseContract(missingRoot, { version: "1.2.3" });
    assert.equal(missing.changelogEntryCount, 0);
    assert.match(missing.errors.join("\n"), /found 0/);
  } finally {
    fs.rmSync(duplicateRoot, { recursive: true, force: true });
    fs.rmSync(missingRoot, { recursive: true, force: true });
  }
});

test("release contract CLI emits deterministic JSON and exits on failure", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "release-contract.cjs"), "--version", "0.10.0", "--tag", "v0.10.0", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    version: "0.10.0",
    declaredVersion: "0.10.0",
    tag: "v0.10.0",
    changelogEntryCount: 1,
    errors: [],
  });
  assert.ok(readReleaseContract(repoRoot).changelogEntryCount > 1);
});

test("release-mode package enforces VERSION without mutating output on drift", () => {
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
          PACKAGE_VERSION: "0.10.1",
          RELEASE_MODE: "1",
        },
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match VERSION/);
    assert.deepEqual(fs.readdirSync(outputRoot), []);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});


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

test("package ignores non-tag GitHub ref names when choosing a version", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "package.cjs"), "--help"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PACKAGE_VERSION: "",
        GITHUB_REF_NAME: "12/merge",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("release-mode package ignores v-prefixed branch names as tags", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "package.cjs"), "--help"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PACKAGE_VERSION: "0.10.0",
        RELEASE_MODE: "1",
        GITHUB_REF_TYPE: "branch",
        GITHUB_REF_NAME: "v0.10.0",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});


test("release workflow derives VERSION, validates tags, and enables release mode", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github", "workflows", "release.yml"),
    "utf8",
  );
  const resolveStep = workflow
    .split("      - name: Resolve version")[1]
    .split("      - name: QA")[0];
  const validationStep = workflow
    .split("      - name: Validate release contract")[1]
    .split("      - name: QA")[0];
  const packageStep = workflow
    .split("      - name: Package")[1]
    .split("      - name: Create GitHub Release")[0];

  assert.doesNotMatch(workflow, /inputs\.version/);
  assert.match(resolveStep, /node -e .*VERSION/);
  assert.match(validationStep, /release-contract\.cjs/);
  assert.match(validationStep, /GITHUB_REF_TYPE/);
  assert.match(validationStep, /--tag "\$GITHUB_REF_NAME"/);
  assert.match(packageStep, /PACKAGE_VERSION: \$\{\{ steps\.ver\.outputs\.version \}\}/);
  assert.match(packageStep, /RELEASE_MODE: "1"/);
});

test("release workflow binds manual releases to the tested commit and marks prereleases", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github", "workflows", "release.yml"),
    "utf8",
  );
  const releaseStep = workflow.split("      - name: Create GitHub Release")[1];

  assert.match(releaseStep, /target_commitish: \$\{\{ github\.sha \}\}/);
  assert.match(releaseStep, /prerelease: \$\{\{ contains\(steps\.ver\.outputs\.version, '-'\) \}\}/);
});
