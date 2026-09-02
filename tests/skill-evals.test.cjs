"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { allowedRoutes, allowedStates, knownJobs, loadManifest, validateEvals } = require("../skill/scripts/validate-evals.cjs");

const repoRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(repoRoot, "skill", "evals", "evals.json");
const validatorPath = path.join(repoRoot, "skill", "scripts", "validate-evals.cjs");
const cliPath = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");
const manifest = loadManifest(manifestPath);
const frontDoor = fs.readFileSync(path.join(repoRoot, "skill", "SKILL.md"), "utf8");

function runValidator(file) {
  return spawnSync(process.execPath, [validatorPath, file], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function runRoute(query) {
  return spawnSync(process.execPath, [cliPath, "route", "--root", repoRoot, "--query", query, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

test("bundled skill eval manifest is valid and covers the supported routes", () => {
  assert.deepEqual(validateEvals(manifest), []);
  assert.deepEqual(new Set(manifest.cases.map((item) => item.expectedRoute)), allowedRoutes);
  assert.deepEqual(new Set(manifest.cases.map((item) => item.expectedState)), new Set(["ready", "blocked"]));
  assert.ok(allowedStates.has("blocked"));
  assert.ok(manifest.cases.some((item) => item.expectedState === "blocked" && item.requiredSignals.includes("fail-closed")));
  assert.ok(manifest.source.upstream.some((url) => url.includes("frontend-design/SKILL.md")));
  assert.ok(manifest.source.upstream.some((url) => url.includes("skill-creator/SKILL.md")));
  assert.ok(manifest.source.upstream.some((url) => url.includes("webapp-testing/SKILL.md")));
  for (const route of allowedRoutes) {
    assert.match(frontDoor, new RegExp(`\\| \`${route}\` \\|`), `${route} is missing from the front-door map`);
  }
  assert.ok(manifest.cases.every((item) => knownJobs.has(item.expectedJob)));
});

test("representative prompts dispatch to canonical job IDs", () => {
  for (const item of manifest.cases) {
    const result = runRoute(item.prompt);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.job, item.expectedJob, `${item.id} dispatched to ${output.job}`);
  }
});

test("validator rejects duplicate cases, unsafe artifacts, unknown routes, and malformed source URLs", () => {
  const invalid = structuredClone(manifest);
  invalid.cases[1].id = invalid.cases[0].id;
  invalid.cases[1].expectedRoute = "unknown-route";
  invalid.cases[1].expectedJob = "unknown-job";
  invalid.cases[1].expectedState = "unknown-state";
  invalid.cases[1].requiredArtifacts = ["../outside.json"];
  invalid.cases[1].fixtures = ["../outside-fixture.json"];
  invalid.source.upstream[0] = "https://";
  const errors = validateEvals(invalid);
  assert.ok(errors.some((error) => error.includes("must be unique")));
  assert.ok(errors.some((error) => error.includes("unsupported")));
  assert.ok(errors.some((error) => error.includes("expectedJob is unknown")));
  assert.ok(errors.some((error) => error.includes("expectedState is unsupported")));
  assert.ok(errors.some((error) => error.includes("is invalid")));
  assert.ok(errors.some((error) => error.includes("source.upstream[0]")));
  const mismatched = structuredClone(manifest);
  mismatched.cases[0].expectedRoute = "dynamic-web-verification";
  assert.ok(validateEvals(mismatched).some((error) => error.includes("not declared by expectedJob")));
  for (const state of ["needs-clarification", "unverified"]) {
    const invalidState = structuredClone(manifest);
    invalidState.cases[0].expectedState = state;
    assert.ok(validateEvals(invalidState).some((error) => error.includes("expectedState is unsupported")));
  }
});

test("fixture paths are contained by the manifest directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evals-root-"));
  try {
    const valid = structuredClone(manifest);
    valid.cases[0].fixtures = ["fixtures/reference.png"];
    assert.deepEqual(validateEvals(valid, { baseDir: root }), []);
    const invalid = structuredClone(manifest);
    invalid.cases[0].fixtures = ["../../outside.png"];
    assert.ok(validateEvals(invalid, { baseDir: root }).some((error) => error.includes("fixtures[0] is invalid")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("validator CLI reports a machine-readable success envelope", () => {
  const result = runValidator(manifestPath);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schema, "design-pipeline.skill-eval-result.v1");
  assert.equal(output.ok, true);
  assert.equal(output.caseCount, manifest.cases.length);
  assert.deepEqual(output.errors, []);
});

test("validator CLI rejects malformed JSON without throwing to the caller", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evals-"));
  const malformed = path.join(root, "evals.json");
  try {
    fs.writeFileSync(malformed, "{ malformed");
    const result = runValidator(malformed);
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.schema, "design-pipeline.skill-eval-result.v1");
    assert.equal(output.ok, false);
    assert.equal(output.caseCount, null);
    assert.equal(output.errors.length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
