"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");
const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "returned command "));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const invoke = (root, ...args) => spawnSync(process.execPath, [cli, ...args, "--root", root, "--project-root", root, "--json"], { encoding: "utf8", windowsHide: true });
const execute = (command, cwd) => spawnSync(command, { cwd, shell: true, encoding: "utf8", windowsHide: true, timeout: 120000 });

for (const stale of [false, true]) test(`${stale ? "stale" : "invalid"} plan recovery command targets the same spaced file from unrelated cwd`, t => {
  const root = temporary(t), elsewhere = temporary(t);
  const rel = "plans/job plan with spaces.json", file = path.join(root, rel);
  const plan = buildJobPlan(routeJob({ query: "A four-second logo sting video" }));
  fs.mkdirSync(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(plan));
  const started = invoke(root, "next", "--deliverable", "film", "--tier", "quick");
  assert.equal(started.status, 0, started.stdout + started.stderr);
  if (stale) {
    const bound = invoke(root, "next", "--job-plan", rel);
    assert.equal(bound.status, 0, bound.stdout + bound.stderr);
  }
  fs.writeFileSync(file, "{}");
  const failed = stale ? invoke(root, "next") : invoke(root, "next", "--job-plan", rel);
  assert.equal(failed.status, 1, failed.stdout + failed.stderr);
  const error = JSON.parse(failed.stdout).error;
  if (stale) assert.equal(error.code, "JOB_PLAN_STALE");
  const recovery = [...error.message.matchAll(/`([^`]+)`/g)].map(match => match[1]).find(command => /\bnext\b/.test(command));
  assert.ok(recovery, `missing complete recovery command: ${error.message}`);
  fs.writeFileSync(file, JSON.stringify(plan));
  const repaired = execute(recovery, elsewhere);
  assert.equal(repaired.status, 0, repaired.stdout + repaired.stderr);
  const state = JSON.parse(fs.readFileSync(path.join(root, ".design-pipeline/state.json")));
  assert.equal(state.jobPlan.jobPlanPath, rel);
  assert.equal(state.jobPlan.jobId, plan.jobId);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), plan);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});
