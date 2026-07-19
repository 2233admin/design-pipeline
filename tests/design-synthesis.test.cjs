const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const initializer = path.join(repoRoot, "skill", "scripts", "init-design-synthesis.cjs");
const advancer = path.join(repoRoot, "skill", "scripts", "advance-design-synthesis.cjs");
const createdRoots = new Set();

function makeRoot(withOpenSpec = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-synthesis-"));
  createdRoots.add(root);
  if (withOpenSpec) fs.mkdirSync(path.join(root, "openspec", "changes"), { recursive: true });
  return root;
}

test.after(() => {
  for (const root of createdRoots) fs.rmSync(root, { recursive: true, force: true });
});

function runInit(projectRoot, ...args) {
  return spawnSync(
    process.execPath,
    [initializer, "--project-root", projectRoot, ...args],
    { encoding: "utf8" },
  );
}

function runAdvance(changeRoot, ...args) {
  return spawnSync(
    process.execPath,
    [advancer, "--change-root", changeRoot, ...args],
    { encoding: "utf8" },
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function initBasic(projectRoot, changeId = "create-ops-design", ...extra) {
  return runInit(
    projectRoot,
    "--change-id",
    changeId,
    "--problem",
    "Design an operations console for support leads handling urgent escalations",
    ...extra,
  );
}

function validDesign(changeId) {
  return `---
version: alpha
name: Escalation Atlas
description: An operations design system for urgent support work
---

# Escalation Atlas

## Product Context

The audience is support leads resolving urgent escalations under time pressure.
Active synthesis change: ${changeId}.

## Overview

Dense, calm, evidence-forward operational UI inspired by incident command boards.

## Colors

Use warm paper neutrals, near-black text, and one vermilion escalation accent.

## Typography

Use a highly legible sans for workflow content and monospace only for identifiers.

## Layout

Use a persistent queue rail and a constrained investigation workspace.

## Components

Buttons, filters, escalation rows, evidence panels, status badges, and recovery notices have explicit states.

## Do's and Don'ts

- Do keep the active incident and next action visible.
- Don't use decorative gradients, glass surfaces, or nested cards.

## Source Decisions

- Adopted: compact navigation rhythm because it supports repeated scanning.
- Rejected: the reference brand, copy, colors, and marketing composition.
`;
}

test("initializes a requirements-driven synthesis run with attributed inputs", () => {
  const projectRoot = makeRoot();
  const result = initBasic(
    projectRoot,
    "hybrid-design",
    "--reference-url",
    "https://Example.com/app#queue",
    "--template",
    "awesome-design-md:linear",
    "--framework",
    "nextjs",
    "--budget",
    "session",
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\/grill-with-docs/);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "hybrid-design");
  const manifest = readJson(path.join(changeRoot, "design-synthesis.json"));
  const state = readJson(path.join(changeRoot, "state.json"));
  const schema = readJson(
    path.join(repoRoot, "skill", "references", "design-synthesis.schema.json"),
  );

  assert.equal(manifest.schema, "design-pipeline.design-synthesis.v1");
  assert.equal(manifest.inputs.mode, "hybrid");
  assert.equal(manifest.inputs.references[0].url, "https://example.com/app");
  assert.equal(manifest.inputs.references[0].role, "reference-site");
  assert.equal(manifest.inputs.templates[0].role, "template");
  assert.equal(manifest.output.path, "DESIGN.md");
  assert.equal(manifest.scope.threshold, 24);
  assert.equal(state.designSynthesis.stage, "grill-with-docs");
  assert.ok(state.nextActions.some((item) => item.startsWith("/grill-with-docs")));
  for (const property of schema.required) {
    assert.ok(Object.hasOwn(manifest, property), `manifest misses ${property}`);
  }
  for (const relative of [
    "proposal.md",
    "brief.md",
    "directions.md",
    "design.md",
    "motion.md",
    "tasks.md",
    "qa.md",
    "state.json",
    "events.jsonl",
    "handoff.md",
  ]) {
    assert.ok(fs.existsSync(path.join(changeRoot, relative)), `missing ${relative}`);
  }
});

test("supports requirements-only and template-evidence modes", () => {
  const requirementsRoot = makeRoot();
  const templateRoot = makeRoot();
  assert.equal(initBasic(requirementsRoot, "requirements-only").status, 0);
  assert.equal(
    initBasic(templateRoot, "template-only", "--template", "stylebase:developer-dark").status,
    0,
  );
  assert.equal(
    readJson(
      path.join(requirementsRoot, "openspec", "changes", "requirements-only", "design-synthesis.json"),
    ).inputs.mode,
    "requirements-only",
  );
  assert.equal(
    readJson(
      path.join(templateRoot, "openspec", "changes", "template-only", "design-synthesis.json"),
    ).inputs.mode,
    "template-evidence",
  );
});

test("rejects unsafe or malformed initialization atomically", () => {
  const cases = [
    ["--change-id", "../escape", "--problem", "x"],
    ["--change-id", "missing-problem"],
    ["--change-id", "credential-url", "--problem", "x", "--reference-url", "https://user:secret@example.com"],
    ["--change-id", "duplicate-template", "--problem", "x", "--template", "one", "--template", "one"],
    ["--change-id", "output-escape", "--problem", "x", "--output", "../DESIGN.md"],
  ];
  for (const args of cases) {
    const projectRoot = makeRoot();
    const result = runInit(projectRoot, ...args);
    assert.notEqual(result.status, 0);
    assert.equal(fs.readdirSync(path.join(projectRoot, "openspec", "changes")).length, 0);
  }
});

test("resumes an identical request and rejects a changed request", () => {
  const projectRoot = makeRoot();
  const first = initBasic(projectRoot, "resume-synthesis");
  assert.equal(first.status, 0, first.stderr);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "resume-synthesis");
  const before = fs.readFileSync(path.join(changeRoot, "events.jsonl"), "utf8");

  const resumed = initBasic(projectRoot, "resume-synthesis");
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.match(resumed.stdout, /already initialized/i);
  assert.equal(fs.readFileSync(path.join(changeRoot, "events.jsonl"), "utf8"), before);

  const changed = runInit(
    projectRoot,
    "--change-id",
    "resume-synthesis",
    "--problem",
    "A different product problem",
  );
  assert.notEqual(changed.status, 0);
  assert.equal(fs.readFileSync(path.join(changeRoot, "events.jsonl"), "utf8"), before);
});

test("augments an existing change without rewriting its design artifacts or history", () => {
  const projectRoot = makeRoot();
  const changeRoot = path.join(projectRoot, "openspec", "changes", "existing-synthesis");
  fs.mkdirSync(changeRoot, { recursive: true });
  fs.writeFileSync(path.join(changeRoot, "design.md"), "# Existing design\n");
  fs.writeFileSync(
    path.join(changeRoot, "state.json"),
    `${JSON.stringify({
      schema: "design-pipeline.state.v1",
      changeId: "existing-synthesis",
      status: "in-progress",
      phase: "stage-1-brief",
      surfaces: ["existing"],
      decisions: ["keep"],
      nextActions: ["preserve"],
    }, null, 2)}\n`,
  );
  const originalEvent =
    '{"ts":"2026-01-01T00:00:00.000Z","phase":"stage-1-brief","type":"decision","summary":"keep","files":[],"evidence":[],"nextActions":[]}\n';
  fs.writeFileSync(path.join(changeRoot, "events.jsonl"), originalEvent);
  fs.writeFileSync(path.join(changeRoot, "handoff.md"), "# Handoff\n\nKeep this note.\n");

  const result = initBasic(projectRoot, "existing-synthesis");

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(changeRoot, "design.md"), "utf8"), "# Existing design\n");
  assert.ok(fs.readFileSync(path.join(changeRoot, "events.jsonl"), "utf8").startsWith(originalEvent));
  const state = readJson(path.join(changeRoot, "state.json"));
  assert.ok(state.surfaces.includes("existing"));
  assert.ok(state.decisions.includes("keep"));
  assert.ok(state.nextActions.includes("preserve"));
  assert.match(fs.readFileSync(path.join(changeRoot, "handoff.md"), "utf8"), /Keep this note/);
});

test("runs the fitting scope path through DESIGN.md validation and implementation", () => {
  const projectRoot = makeRoot();
  assert.equal(initBasic(projectRoot, "fit-synthesis").status, 0);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "fit-synthesis");
  fs.mkdirSync(path.join(changeRoot, "decisions"));
  fs.writeFileSync(path.join(changeRoot, "decisions", "grill.md"), "# Grill decisions\n");

  const grilled = runAdvance(
    changeRoot,
    "--event",
    "grill-completed",
    "--evidence",
    "decisions/grill.md",
  );
  assert.equal(grilled.status, 0, grilled.stderr);

  const scoped = runAdvance(
    changeRoot,
    "--event",
    "scope-assessed",
    "--surface-count",
    "2",
    "--workflow-count",
    "2",
    "--integration-count",
    "1",
    "--unknown-count",
    "2",
    "--decision-count",
    "3",
  );
  assert.equal(scoped.status, 0, scoped.stderr);
  assert.match(scoped.stdout, /Scope fits/);
  assert.equal(readJson(path.join(changeRoot, "design-synthesis.json")).scope.score, 18);

  fs.writeFileSync(path.join(projectRoot, "DESIGN.md"), validDesign("fit-synthesis"));
  const generated = runAdvance(
    changeRoot,
    "--event",
    "design-generated",
    "--design-file",
    "DESIGN.md",
  );
  assert.equal(generated.status, 0, generated.stderr);
  const validated = readJson(path.join(changeRoot, "design-synthesis.json"));
  assert.equal(validated.output.status, "validated");
  assert.match(validated.output.sha256, /^[a-f0-9]{64}$/);

  const continued = runAdvance(changeRoot, "--event", "continue");
  assert.equal(continued.status, 0, continued.stderr);
  assert.match(continued.stdout, /Happily continuing/i);
  const complete = readJson(path.join(changeRoot, "design-synthesis.json"));
  const state = readJson(path.join(changeRoot, "state.json"));
  assert.equal(complete.status, "ready-to-implement");
  assert.equal(complete.stage, "implementation");
  assert.equal(state.phase, "stage-5-implementation");
  assert.equal(state.status, "in-progress");
});

test("uses Wayfinder only when deterministic scope exceeds the budget", () => {
  const projectRoot = makeRoot();
  assert.equal(initBasic(projectRoot, "large-synthesis", "--budget", "small").status, 0);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "large-synthesis");
  fs.writeFileSync(path.join(changeRoot, "grill.md"), "# decisions\n");
  assert.equal(
    runAdvance(changeRoot, "--event", "grill-completed", "--evidence", "grill.md").status,
    0,
  );

  const scoped = runAdvance(
    changeRoot,
    "--event",
    "scope-assessed",
    "--surface-count",
    "3",
    "--workflow-count",
    "2",
    "--integration-count",
    "1",
    "--unknown-count",
    "2",
    "--decision-count",
    "2",
  );
  assert.equal(scoped.status, 0, scoped.stderr);
  assert.match(scoped.stdout, /哦，天哪，这比我预期的要大得多/);
  assert.match(scoped.stdout, /\/wayfinder 为此制作一张地图/);
  const oversized = readJson(path.join(changeRoot, "design-synthesis.json"));
  assert.equal(oversized.status, "awaiting-wayfinder");
  assert.equal(oversized.scope.status, "oversized");
  assert.equal(oversized.wayfinder.status, "required");

  const premature = runAdvance(changeRoot, "--event", "continue");
  assert.notEqual(premature.status, 0);

  const unsafeMap = runAdvance(
    changeRoot,
    "--event",
    "wayfinder-linked",
    "--map-url",
    "https://user:secret@example.com/issues/1",
  );
  assert.notEqual(unsafeMap.status, 0);
  assert.equal(
    readJson(path.join(changeRoot, "design-synthesis.json")).wayfinder.status,
    "required",
  );

  const placeholderMap = runAdvance(
    changeRoot,
    "--event",
    "wayfinder-linked",
    "--map-url",
    "https://example.com/placeholder",
  );
  assert.notEqual(placeholderMap.status, 0);
  assert.match(placeholderMap.stderr, /supported issue-tracker URL/i);

  const queryCredential = runAdvance(
    changeRoot,
    "--event",
    "wayfinder-linked",
    "--map-url",
    "https://github.com/example/project/issues/123?token=secret",
  );
  assert.notEqual(queryCredential.status, 0);
  assert.match(queryCredential.stderr, /must not contain a query/i);

  const linked = runAdvance(
    changeRoot,
    "--event",
    "wayfinder-linked",
    "--map-url",
    "https://github.com/example/project/issues/123",
  );
  assert.equal(linked.status, 0, linked.stderr);
  const resumed = readJson(path.join(changeRoot, "design-synthesis.json"));
  assert.equal(resumed.status, "ready-for-synthesis");
  assert.equal(resumed.wayfinder.status, "linked");
});

test("rejects an artifact root that resolves outside the project", (t) => {
  const projectRoot = makeRoot(false);
  const outsideRoot = makeRoot(false);
  const openspecRoot = path.join(projectRoot, "openspec");
  const linkedChanges = path.join(openspecRoot, "changes");
  fs.mkdirSync(openspecRoot);
  try {
    fs.symlinkSync(
      outsideRoot,
      linkedChanges,
      process.platform === "win32" ? "junction" : "dir",
    );
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
      t.skip(`directory links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const result = initBasic(projectRoot, "linked-artifact-root");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /artifact root resolves outside/i);
  assert.equal(fs.readdirSync(outsideRoot).length, 0);
});

test("fails closed for missing grill evidence and incomplete DESIGN.md", () => {
  const projectRoot = makeRoot();
  assert.equal(initBasic(projectRoot, "guarded-synthesis").status, 0);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "guarded-synthesis");

  const outsideEvidence = path.join(projectRoot, "outside.md");
  fs.writeFileSync(outsideEvidence, "# outside\n");
  const unsafe = runAdvance(
    changeRoot,
    "--event",
    "grill-completed",
    "--evidence",
    "../../../outside.md",
  );
  assert.notEqual(unsafe.status, 0);
  assert.equal(readJson(path.join(changeRoot, "design-synthesis.json")).stage, "grill-with-docs");

  fs.writeFileSync(path.join(changeRoot, "grill.md"), "# decisions\n");
  assert.equal(
    runAdvance(changeRoot, "--event", "grill-completed", "--evidence", "grill.md").status,
    0,
  );
  assert.equal(
    runAdvance(
      changeRoot,
      "--event",
      "scope-assessed",
      "--surface-count",
      "1",
      "--workflow-count",
      "1",
      "--integration-count",
      "0",
      "--unknown-count",
      "0",
      "--decision-count",
      "1",
    ).status,
    0,
  );
  fs.writeFileSync(
    path.join(projectRoot, "DESIGN.md"),
    "---\nname: Incomplete\n---\n\n## Overview\n\nNot enough.\n",
  );
  const invalid = runAdvance(
    changeRoot,
    "--event",
    "design-generated",
    "--design-file",
    "DESIGN.md",
  );
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /missing required sections/i);
  assert.equal(readJson(path.join(changeRoot, "design-synthesis.json")).stage, "design-synthesis");
});

test("requires revalidation when DESIGN.md changes after validation", () => {
  const projectRoot = makeRoot();
  assert.equal(initBasic(projectRoot, "changed-design").status, 0);
  const changeRoot = path.join(projectRoot, "openspec", "changes", "changed-design");
  fs.writeFileSync(path.join(changeRoot, "grill.md"), "# decisions\n");
  assert.equal(
    runAdvance(changeRoot, "--event", "grill-completed", "--evidence", "grill.md").status,
    0,
  );
  assert.equal(
    runAdvance(
      changeRoot,
      "--event",
      "scope-assessed",
      "--surface-count",
      "1",
      "--workflow-count",
      "1",
      "--integration-count",
      "0",
      "--unknown-count",
      "0",
      "--decision-count",
      "1",
    ).status,
    0,
  );
  fs.writeFileSync(path.join(projectRoot, "DESIGN.md"), validDesign("changed-design"));
  assert.equal(
    runAdvance(changeRoot, "--event", "design-generated", "--design-file", "DESIGN.md").status,
    0,
  );
  fs.appendFileSync(path.join(projectRoot, "DESIGN.md"), "\nChanged after validation.\n");

  const result = runAdvance(changeRoot, "--event", "continue");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /changed/i);
  assert.equal(readJson(path.join(changeRoot, "design-synthesis.json")).stage, "design-validation");
});

test("falls back to design/changes instead of an unrelated changes directory", () => {
  const projectRoot = makeRoot(false);
  fs.mkdirSync(path.join(projectRoot, "changes"));
  const result = initBasic(projectRoot, "fallback-root");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    fs.existsSync(path.join(projectRoot, "design", "changes", "fallback-root", "design-synthesis.json")),
  );
  assert.equal(fs.readdirSync(path.join(projectRoot, "changes")).length, 0);
});
