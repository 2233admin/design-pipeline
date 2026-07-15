const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const initializer = path.join(repoRoot, "skill", "scripts", "init-website-clone.cjs");

function makeProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-clone-"));
  fs.mkdirSync(path.join(projectRoot, "openspec", "changes"), { recursive: true });
  return projectRoot;
}

function run(projectRoot, ...args) {
  return spawnSync(
    process.execPath,
    [initializer, "--project-root", projectRoot, ...args],
    { encoding: "utf8" },
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

test("initializes a resumable website-cloning change from one URL", () => {
  const projectRoot = makeProject();
  const result = run(
    projectRoot,
    "--change-id",
    "clone-example",
    "--url",
    "https://Example.com/#hero",
  );

  assert.equal(result.status, 0, result.stderr);

  const changeRoot = path.join(projectRoot, "openspec", "changes", "clone-example");
  const manifest = readJson(path.join(changeRoot, "website-cloning.json"));
  const state = readJson(path.join(changeRoot, "state.json"));

  assert.equal(manifest.schema, "design-pipeline.website-cloning.v1");
  assert.equal(manifest.changeId, "clone-example");
  assert.equal(manifest.targets.length, 1);
  assert.deepEqual(manifest.targets[0], {
    id: "example-com",
    url: "https://example.com/",
    role: "primary",
    status: "planned",
    phase: "preflight",
    artifactRoot: "targets/example-com",
  });
  assert.equal(manifest.fidelity.mode, "exact");
  assert.equal(manifest.fidelity.gates.textCoverage, 1);
  assert.equal(manifest.fidelity.gates.assetCoverage, 1);
  assert.equal(manifest.fidelity.gates.interactionCoverage, 1);
  assert.equal(manifest.ports.browser.status, "unresolved");
  assert.equal(manifest.ports.builder.status, "unresolved");
  assert.equal(manifest.ports.evidence.status, "unresolved");
  assert.equal(state.schema, "design-pipeline.state.v1");
  assert.equal(state.changeId, "clone-example");
  assert.equal(state.status, "planned");
  assert.deepEqual(state.nextActions, [
    "Verify authorization and browser capabilities for every target",
    "Capture reconnaissance evidence for example-com",
  ]);

  for (const relative of [
    "proposal.md",
    "brief.md",
    "directions.md",
    "design.md",
    "motion.md",
    "tasks.md",
    "qa.md",
    "events.jsonl",
    "handoff.md",
    "targets/example-com/research/behaviors.md",
    "targets/example-com/research/page-topology.md",
    "targets/example-com/research/design-tokens.md",
    "targets/example-com/research/component-inventory.md",
    "targets/example-com/assets/manifest.json",
  ]) {
    assert.ok(fs.existsSync(path.join(changeRoot, relative)), `missing ${relative}`);
  }

  for (const relative of [
    "targets/example-com/research/components",
    "targets/example-com/evidence/screenshots",
    "targets/example-com/evidence/visual-diff",
  ]) {
    assert.ok(fs.statSync(path.join(changeRoot, relative)).isDirectory());
  }
});

test("isolates primary and reference targets with stable ids", () => {
  const projectRoot = makeProject();
  const result = run(
    projectRoot,
    "--change-id",
    "compare-sites",
    "--url",
    "https://example.com/pricing",
    "--reference-url=https://docs.example.org/guide/",
  );

  assert.equal(result.status, 0, result.stderr);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "compare-sites");
  const manifest = readJson(path.join(changeRoot, "website-cloning.json"));

  assert.deepEqual(
    manifest.targets.map(({ id, url, role }) => ({ id, url, role })),
    [
      {
        id: "example-com-pricing",
        url: "https://example.com/pricing",
        role: "primary",
      },
      {
        id: "docs-example-org-guide",
        url: "https://docs.example.org/guide/",
        role: "reference",
      },
    ],
  );
  for (const target of manifest.targets) {
    assert.ok(fs.existsSync(path.join(changeRoot, target.artifactRoot, "research")));
  }
});

test("rejects invalid input atomically", () => {
  for (const args of [
    ["--change-id", "../escape", "--url", "https://example.com"],
    ["--change-id", "bad-url", "--url", "file:///etc/passwd"],
    ["--change-id", "missing-url"],
    ["--change-id", "reference-only", "--reference-url", "https://example.com"],
  ]) {
    const projectRoot = makeProject();
    const result = run(projectRoot, ...args);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readdirSync(path.join(projectRoot, "openspec", "changes")).length, 0);
  }
});

test("rejects duplicate normalized URLs without partial output", () => {
  const projectRoot = makeProject();
  const result = run(
    projectRoot,
    "--change-id",
    "duplicates",
    "--url",
    "https://example.com/#one",
    "--reference-url",
    "https://EXAMPLE.com/#two",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate/i);
  assert.equal(fs.readdirSync(path.join(projectRoot, "openspec", "changes")).length, 0);
});

test("rerunning the same command resumes without rewriting state history", () => {
  const projectRoot = makeProject();
  const args = [
    "--change-id",
    "resume-example",
    "--url",
    "https://example.com",
  ];

  const first = run(projectRoot, ...args);
  assert.equal(first.status, 0, first.stderr);

  const changeRoot = path.join(projectRoot, "openspec", "changes", "resume-example");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const statePath = path.join(changeRoot, "state.json");
  const eventsPath = path.join(changeRoot, "events.jsonl");
  const before = {
    manifest: fs.readFileSync(manifestPath, "utf8"),
    state: fs.readFileSync(statePath, "utf8"),
    events: fs.readFileSync(eventsPath, "utf8"),
  };

  const second = run(projectRoot, ...args);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already initialized/i);
  assert.equal(fs.readFileSync(manifestPath, "utf8"), before.manifest);
  assert.equal(fs.readFileSync(statePath, "utf8"), before.state);
  assert.equal(fs.readFileSync(eventsPath, "utf8"), before.events);
});

test("augments an existing OpenSpec change without discarding headless history", () => {
  const projectRoot = makeProject();
  const changeRoot = path.join(projectRoot, "openspec", "changes", "existing-change");
  fs.mkdirSync(changeRoot, { recursive: true });
  const originalState = {
    schema: "design-pipeline.state.v1",
    changeId: "existing-change",
    status: "in-progress",
    phase: "stage-3-design-spec",
    updatedAt: "2026-01-01T00:00:00.000Z",
    artifactRoot: "openspec/changes/existing-change",
    projectRoot: ".",
    surfaces: ["existing-surface"],
    capabilities: { missing: [], fallbacks: [] },
    openSpec: {
      detected: true,
      changeId: "existing-change",
      paths: ["openspec/changes/existing-change"],
    },
    gbrain: { detected: false, syncPlanned: false, paths: [] },
    motion: {
      required: false,
      motionSpec: "motion.md",
      implementationLibrary: "none",
      reducedMotion: "not-applicable",
    },
    qa: { status: "not-run", evidenceRoot: "qa.md", scores: {} },
    decisions: ["keep-this-decision"],
    blockers: [],
    nextActions: ["keep-this-action"],
  };
  fs.writeFileSync(
    path.join(changeRoot, "state.json"),
    `${JSON.stringify(originalState, null, 2)}\n`,
  );
  const originalEvent =
    '{"ts":"2026-01-01T00:00:00.000Z","phase":"stage-3-design-spec","type":"decision","summary":"keep this event","files":[],"evidence":[],"nextActions":[]}\n';
  fs.writeFileSync(path.join(changeRoot, "events.jsonl"), originalEvent);
  fs.writeFileSync(path.join(changeRoot, "handoff.md"), "# Existing Handoff\n\nKeep this note.\n");

  const result = run(
    projectRoot,
    "--change-id",
    "existing-change",
    "--url",
    "https://example.com",
  );

  assert.equal(result.status, 0, result.stderr);
  const state = readJson(path.join(changeRoot, "state.json"));
  assert.equal(state.status, "in-progress");
  assert.ok(state.surfaces.includes("existing-surface"));
  assert.ok(state.surfaces.includes("example-com"));
  assert.ok(state.decisions.includes("keep-this-decision"));
  assert.ok(state.nextActions.includes("keep-this-action"));
  assert.ok(
    state.nextActions.includes("Verify authorization and browser capabilities for every target"),
  );

  const events = fs.readFileSync(path.join(changeRoot, "events.jsonl"), "utf8");
  assert.ok(events.startsWith(originalEvent));
  assert.equal(events.trim().split(/\r?\n/).length, 2);

  const handoff = fs.readFileSync(path.join(changeRoot, "handoff.md"), "utf8");
  assert.match(handoff, /Keep this note/);
  assert.match(handoff, /Website Cloning/);
});
