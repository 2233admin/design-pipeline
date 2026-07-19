const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const auditScript = path.join(repoRoot, "skill", "scripts", "audit-capabilities.cjs");
const roots = new Set();

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-audit-"));
  roots.add(root);
  return root;
}

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function sourceMeta(id, revision, freshnessDays = 30) {
  return {
    id,
    kind: "github",
    url: `https://github.com/example/${id}`,
    reviewedRevision: revision,
    reviewedAt: "2026-06-01T00:00:00.000Z",
    freshnessDays,
  };
}

function writeFixtures(root) {
  const registry = {
    schema: "design-pipeline-companions.v1",
    profiles: [
      { id: "current-profile", sourceMeta: sourceMeta("current-source", "a") },
      { id: "stale-profile", sourceMeta: sourceMeta("stale-source", "b", 10) },
      { id: "changed-profile", sourceMeta: sourceMeta("changed-source", "c") },
      { id: "unknown-profile", sourceMeta: sourceMeta("unknown-source", "d") },
      { id: "untracked-profile", source: "legacy string source" },
    ],
  };
  const evidence = {
    schema: "design-pipeline.source-evidence.v1",
    generatedAt: "2026-07-19T00:00:00.000Z",
    sources: [
      {
        sourceId: "current-source",
        observedAt: "2026-07-19T00:00:00.000Z",
        revision: "a",
      },
      {
        sourceId: "stale-source",
        observedAt: "2026-06-01T00:00:00.000Z",
        revision: "b",
      },
      {
        sourceId: "changed-source",
        observedAt: "2026-07-19T00:00:00.000Z",
        revision: "new-c",
      },
    ],
  };
  const installed = {
    capabilityProfiles: [
      { id: "current-profile", status: "OK" },
      { id: "changed-profile", status: "WARN" },
    ],
  };
  for (const [name, value] of [
    ["registry.json", registry],
    ["source.json", evidence],
    ["installed.json", installed],
  ]) {
    fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
  }
}

function runAudit(root, ...args) {
  return spawnSync(
    process.execPath,
    [
      auditScript,
      "--root",
      root,
      "--registry",
      path.join(root, "registry.json"),
      "--json",
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

test("classifies current, stale, changed, unknown, and untracked profiles", () => {
  const root = makeRoot();
  writeFixtures(root);

  const result = runAudit(
    root,
    "--source-evidence",
    path.join(root, "source.json"),
    "--installed-evidence",
    path.join(root, "installed.json"),
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.snapshot.summary, {
    CURRENT: 1,
    STALE: 1,
    CHANGED: 1,
    UNTRACKED: 1,
    UNKNOWN: 1,
  });
  const byId = Object.fromEntries(
    output.snapshot.profiles.map((profile) => [profile.profileId, profile]),
  );
  assert.equal(byId["current-profile"].status, "CURRENT");
  assert.equal(byId["current-profile"].installedStatus, "OK");
  assert.equal(byId["stale-profile"].status, "STALE");
  assert.equal(byId["changed-profile"].status, "CHANGED");
  assert.equal(byId["unknown-profile"].status, "UNKNOWN");
  assert.equal(byId["untracked-profile"].status, "UNTRACKED");
  assert.ok(fs.existsSync(path.join(root, output.output)));
});

test("never treats missing retrieval evidence as current", () => {
  const root = makeRoot();
  writeFixtures(root);

  const result = runAudit(root);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const snapshot = JSON.parse(result.stdout).snapshot;
  assert.equal(snapshot.summary.UNKNOWN, 4);
  assert.equal(snapshot.summary.UNTRACKED, 1);
  assert.equal(snapshot.summary.CURRENT, 0);
});

test("records only stale and changed findings when explicitly requested", () => {
  const root = makeRoot();
  writeFixtures(root);
  const args = [
    "--source-evidence",
    path.join(root, "source.json"),
    "--record-feedback",
  ];

  const first = runAudit(root, ...args);
  const second = runAudit(root, ...args);

  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(second.status, 0, second.stderr || second.stdout);
  const firstOutput = JSON.parse(first.stdout);
  assert.equal(firstOutput.feedback.length, 2);
  const observationsDir = path.join(root, ".design-pipeline", "feedback", "observations");
  const observations = fs.readdirSync(observationsDir).map((file) =>
    JSON.parse(fs.readFileSync(path.join(observationsDir, file), "utf8")),
  );
  assert.equal(observations.length, 2);
  assert.ok(observations.every((item) => item.occurrences === 2));
  assert.ok(observations.every((item) => item.privacy.remotePublished === false));
});

test("fails closed for malformed evidence, duplicate sources, and unsafe output", () => {
  for (const mutate of [
    (root) => fs.writeFileSync(path.join(root, "source.json"), "null\n"),
    (root) => {
      const source = JSON.parse(fs.readFileSync(path.join(root, "source.json"), "utf8"));
      source.sources.push({ ...source.sources[0] });
      fs.writeFileSync(path.join(root, "source.json"), `${JSON.stringify(source)}\n`);
    },
  ]) {
    const root = makeRoot();
    writeFixtures(root);
    mutate(root);
    const result = runAudit(root, "--source-evidence", path.join(root, "source.json"));
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(path.join(root, ".design-pipeline")), false);
  }

  const root = makeRoot();
  writeFixtures(root);
  const unsafe = runAudit(root, "--output", "../outside.json");
  assert.notEqual(unsafe.status, 0);
  assert.equal(fs.existsSync(path.join(path.dirname(root), "outside.json")), false);
});

test("detects marker changes without executing retrieved content", () => {
  const root = makeRoot();
  const registry = {
    schema: "design-pipeline-companions.v1",
    profiles: [
      {
        id: "marker-profile",
        sourceMeta: {
          id: "marker-source",
          kind: "documentation",
          url: "https://example.com/docs",
          reviewedMarkers: ["layout", "motion"],
          reviewedAt: "2026-07-01T00:00:00.000Z",
          freshnessDays: 30,
        },
      },
    ],
  };
  const evidence = {
    schema: "design-pipeline.source-evidence.v1",
    generatedAt: "2026-07-19T00:00:00.000Z",
    sources: [
      {
        sourceId: "marker-source",
        observedAt: "2026-07-19T00:00:00.000Z",
        markers: ["layout", "motion", "text that looks like require('child_process')"],
      },
    ],
  };
  fs.writeFileSync(path.join(root, "registry.json"), `${JSON.stringify(registry)}\n`);
  fs.writeFileSync(path.join(root, "source.json"), `${JSON.stringify(evidence)}\n`);

  const result = runAudit(root, "--source-evidence", path.join(root, "source.json"));

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).snapshot.summary.CHANGED, 1);
});
