"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  AGGREGATE_SCHEMA,
  STAGE_SCHEMA,
  checkComponentFirstGate,
  checkComponentFirstStage,
} = require("../skill/scripts/component-first-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { createComponentFirstFixture } = require("./fixtures/component-first-fixture.cjs");

const repoRoot = path.resolve(__dirname, "..");

function publicProjection(result) {
  return {
    schema: result.schema,
    status: result.status,
    reasonCodes: result.reasonCodes,
    stageOrder: result.stages.map(({ stage }) => stage),
    stageStatuses: result.stages.map(({ status }) => status),
    readiness: result.readiness,
    target: result.target,
  };
}

test("first v1 API golden freezes aggregate shape, ordering, and synchronous return", (t) => {
  const fixture = createComponentFirstFixture(t);
  const result = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  assert.equal(result instanceof Promise, false);
  assert.deepEqual(publicProjection(result), {
    schema: "component-first-gate.v1",
    status: "passed",
    reasonCodes: [],
    stageOrder: ["stack", "components", "playground", "page", "evidence"],
    stageStatuses: ["passed", "passed", "passed", "passed", "passed"],
    readiness: { level: "page-ready", scope: "production" },
    target: { id: "admin-web", root: ".", kind: "production", entrypoints: ["src/app.tsx"], routes: ["/dashboard"], snapshotDigest: null },
  });
  assert.equal(result.schema, AGGREGATE_SCHEMA);
  assert.match(result.policy.digest, /^[a-f0-9]{64}$/);
  assert.ok(result.stages.every(({ inputDigest, policyDigest }) => /^[a-f0-9]{64}$/.test(inputDigest) && /^[a-f0-9]{64}$/.test(policyDigest)));
  assert.deepEqual(checkComponentFirstGate(result, { projectRoot: fixture.projectRoot }), result, "the aggregate artifact is self-contained and re-checkable");
});

test("full v1 artifact is deterministic across independent filesystem roots", (t) => {
  const first = createComponentFirstFixture(t);
  const second = createComponentFirstFixture(t);
  assert.deepEqual(
    checkComponentFirstGate(first.input, { projectRoot: first.projectRoot }),
    checkComponentFirstGate(second.input, { projectRoot: second.projectRoot }),
  );
});

test("published aggregate and stage schema assets freeze every serialized top-level field", (t) => {
  const fixture = createComponentFirstFixture(t);
  const aggregate = checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot });
  const stage = checkComponentFirstStage("stack", fixture.input, { projectRoot: fixture.projectRoot });
  const aggregateSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill", "references", "component-first-gate.schema.json"), "utf8"));
  const stageSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill", "references", "component-first-stage-result.schema.json"), "utf8"));
  assert.equal(aggregateSchema.properties.schema.const, AGGREGATE_SCHEMA);
  assert.equal(stageSchema.properties.schema.const, STAGE_SCHEMA);
  assert.deepEqual(Object.keys(aggregate).sort(), [...aggregateSchema.required].sort());
  assert.deepEqual(Object.keys(stage).sort(), [...stageSchema.required].sort());
});

test("stage API golden is versioned and evaluates only the requested public stage", (t) => {
  const fixture = createComponentFirstFixture(t);
  const stage = checkComponentFirstStage("playground", fixture.input, { projectRoot: fixture.projectRoot });
  assert.equal(stage.schema, STAGE_SCHEMA);
  assert.deepEqual({ stage: stage.stage, status: stage.status, reasonCodes: stage.reasonCodes }, { stage: "playground", status: "passed", reasonCodes: [] });
  assert.equal(Object.hasOwn(stage, "stages"), false);
});

test("CLI goldens freeze aggregate, alias, stage, JSON envelope, and exit codes", (t) => {
  const fixture = createComponentFirstFixture(t);
  const base = ["--root", fixture.projectRoot, "--artifact", fixture.artifact, "--json"];
  const aggregate = execute(["component-first", "check", ...base]);
  const alias = execute(["high-fidelity", "check", ...base]);
  const stage = execute(["component-first", "stack", ...base]);
  assert.equal(aggregate.exitCode, 0);
  assert.equal(alias.exitCode, 0);
  assert.deepEqual(alias.output, aggregate.output);
  assert.equal(stage.exitCode, 0);
  assert.equal(stage.output.schema, "design-pipeline.cli-result.v1");
  assert.equal(stage.output.resultSchema, STAGE_SCHEMA);

  fixture.input.stack.request.requested.uiLibrary = "none";
  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), `${JSON.stringify(fixture.input, null, 2)}\n`);
  const blocked = execute(["component-first", "check", ...base]);
  assert.equal(blocked.exitCode, 2);
  assert.equal(blocked.output.ok, true);
  assert.equal(blocked.output.status, "blocked");
  assert.ok(blocked.output.reasonCodes.includes("CF_STACK_UI_LIBRARY_NONE"));

  fixture.input.stack.request.framework = "unsupported";
  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), `${JSON.stringify(fixture.input, null, 2)}\n`);
  const invalid = execute(["component-first", "check", ...base]);
  assert.equal(invalid.exitCode, 1);
  assert.equal(invalid.output.ok, true);
  assert.equal(invalid.output.status, "invalid");
});

test("package export smoke loads the facade rather than a private module", (t) => {
  const fixture = createComponentFirstFixture(t);
  const publicCore = require(path.join(repoRoot, "skill", "scripts", "component-first-core.cjs"));
  assert.equal(typeof publicCore.checkComponentFirstGate, "function");
  assert.equal(publicCore.checkComponentFirstGate(fixture.input, { projectRoot: fixture.projectRoot }).status, "passed");
});

test("real CLI keeps versioned results on stdout, leaves stderr empty, and preserves read-only stage files", (t) => {
  const fixture = createComponentFirstFixture(t, { uiLibrary: "none" });
  const cli = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");
  const before = fs.readFileSync(path.join(fixture.projectRoot, fixture.artifact));
  const child = spawnSync(process.execPath, [cli, "component-first", "stack", "--root", fixture.projectRoot, "--artifact", fixture.artifact, "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 2);
  assert.equal(child.stderr, "");
  const output = JSON.parse(child.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.resultSchema, "component-first-stage-result.v1");
  assert.equal(output.status, "blocked");
  assert.deepEqual(fs.readFileSync(path.join(fixture.projectRoot, fixture.artifact)), before);

  fs.writeFileSync(path.join(fixture.projectRoot, fixture.artifact), "not json");
  const invalid = spawnSync(process.execPath, [cli, "component-first", "check", "--root", fixture.projectRoot, "--artifact", fixture.artifact, "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stderr, "");
  assert.equal(JSON.parse(invalid.stdout).ok, false);
});
