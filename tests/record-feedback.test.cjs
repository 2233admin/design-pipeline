const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const recordScript = path.join(repoRoot, "skill/scripts/record-feedback.cjs");

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-feedback-"));
}

function runRecord(root, args) {
  return spawnSync(
    process.execPath,
    [
      recordScript,
      "--root",
      root,
      "--json",
      "--kind",
      "capability-gap",
      "--source",
      "runtime",
      "--skill",
      "animejs",
      "--title",
      "Anime.js companion lacks adapter guidance",
      "--summary",
      "The installed companion is missing a supported target adapter.",
      ...args,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DESIGN_PIPELINE_NOW: "2026-07-19T00:00:00.000Z",
      },
    },
  );
}

function readOnlyObservation(root) {
  const dir = path.join(root, ".design-pipeline", "feedback", "observations");
  const files = fs.readdirSync(dir);
  assert.equal(files.length, 1);
  return JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
}

test("records a redacted observation and local Issue draft", () => {
  const root = makeRoot();
  try {
    const tokenSample = ["ghp", "abcdefghijklmnopqrstuvwxyz1234567890"].join("_");
    const result = runRecord(root, [
      "--evidence",
      `Failure at ${path.join(root, "private", "file.js")} Authorization: Bearer ${tokenSample}`,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    const observation = readOnlyObservation(root);
    const draft = fs.readFileSync(path.join(root, observation.draftPath), "utf8");

    assert.equal(observation.route, "issue");
    assert.equal(observation.privacy.redacted, true);
    assert.equal(observation.privacy.remotePublished, false);
    assert.match(observation.evidence[0], /<PROJECT_ROOT>/);
    assert.doesNotMatch(JSON.stringify(observation), /ghp_/);
    assert.match(draft, /Remote publication: not performed/);
    assert.equal(output.created, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deduplicates repeated findings and merges unique evidence", () => {
  const root = makeRoot();
  try {
    const first = runRecord(root, ["--evidence", "missing marker: adapters"]);
    const second = runRecord(root, [
      "--evidence",
      "missing marker: adapters",
      "--evidence",
      "Three.js target requested",
    ]);

    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(second.status, 0, second.stderr || second.stdout);

    const observation = readOnlyObservation(root);
    assert.equal(observation.occurrences, 2);
    assert.deepEqual(observation.evidence, [
      "missing marker: adapters",
      "Three.js target requested",
    ]);
    assert.equal(JSON.parse(second.stdout).created, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("creates a PR draft only when explicitly routed with patch evidence", () => {
  const root = makeRoot();
  try {
    const result = runRecord(root, [
      "--route",
      "pr",
      "--changed-file",
      "skill/references/companion-capabilities.json",
      "--validation",
      "node scripts/qa.cjs passed",
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const observation = readOnlyObservation(root);
    const draft = fs.readFileSync(path.join(root, observation.draftPath), "utf8");

    assert.equal(observation.route, "pr");
    assert.match(draft, /## Changed files/);
    assert.match(draft, /node scripts\/qa\.cjs passed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a PR route without changed files and validation", () => {
  const root = makeRoot();
  try {
    const result = runRecord(root, ["--route", "pr"]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires at least one --changed-file and --validation/);
    assert.equal(fs.existsSync(path.join(root, ".design-pipeline")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
