"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const skill = require("./helpers/skill-surface.cjs").readSkillSurface();
const routedReferences = [
  "skill/references/pipeline-method.md",
  "skill/references/feature-routes.md",
  "skill/references/stages.md",
  "skill/references/lifecycle.md",
].map((relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8"));
const publicContract = [skill, ...routedReferences].join("\n");

function run(args, cwd = repoRoot) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { cwd, encoding: "utf8", windowsHide: true });
  let output;
  try { output = JSON.parse(child.stdout); } catch { output = { stdout: child.stdout, stderr: child.stderr }; }
  return { ...child, output };
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("SKILL front-door commands are present in the public CLI contract", () => {
  assert.match(publicContract, /Use the public CLI for the complete lifecycle/);
  const help = run(["help"]).output.help;
  assert.match(publicContract, /designer-pipeline route --query/);
  assert.match(publicContract, /--write --output job-plan\.json/);
  assert.match(help, /^ {2}route --query/m);
  for (const [command, action] of [
    ["mengto", "search"],
    ["prism", "route"],
    ["prism", "search"],
    ["holosticker", "inspect"],
    ["designmd", "verify"],
    ["iart", "search"],
    ["iart", "route"],
    ["component", "resolve"],
    ["toolchain", "resolve"],
    ["execution", "route"],
    ["reference", "resolve"],
  ]) {
    assert.match(publicContract, new RegExp(`(?:designer-pipeline\\s+)?${command}\\s+${action}`), `${command} ${action} is missing from routed contract`);
    assert.match(help, new RegExp(`\\b${command}[^\\n]*\\b${action}\\b`), `${command} ${action} is missing from public help`);
  }
});

test("SKILL front doors hand off to local CLI routes without MCP or external services", () => {
  const dispatched = run(["route", "--root", repoRoot, "--query", "clone this landing page 1:1"]);
  assert.equal(dispatched.status, 0, dispatched.stderr || dispatched.stdout);
  assert.equal(dispatched.output.ok, true);
  assert.equal(dispatched.output.job, "website-clone");
  assert.equal(dispatched.output.ambiguous, false);

  const planRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-cli-job-plan-"));
  try {
    const planned = run(["route", "--root", planRoot, "--query", "clone this landing page 1:1", "--write", "--output", "job-plan.json"]);
    assert.equal(planned.status, 0, planned.stderr || planned.stdout);
    assert.equal(planned.output.planSha256.length, 64);
    assert.equal(fs.existsSync(path.join(planRoot, "job-plan.json")), true);

    writeJson(path.join(planRoot, "toolchain-request.json"), {
      schema: "design-pipeline.toolchain-request.v1",
      framework: "react",
      brief: "clone this landing page 1:1",
      requested: { styling: "none", uiLibrary: "none" },
      jobId: "website-clone",
      jobPlanSha256: planned.output.planSha256,
      jobPlanPath: "job-plan.json",
      deliverableForm: dispatched.output.deliverableForm,
    });
    const bound = run(["toolchain", "resolve", "--root", planRoot, "--artifact", "toolchain-request.json"]);
    assert.equal(bound.status, 0, bound.stderr || bound.stdout);
    assert.equal(bound.output.plan.jobId, "website-clone");
    assert.equal(bound.output.plan.jobPlanSha256, planned.output.planSha256);
    assert.notEqual(bound.output.plan.primaryRouteId, bound.output.plan.jobId);
    const validRequest = JSON.parse(fs.readFileSync(path.join(planRoot, "toolchain-request.json"), "utf8"));
    const planPath = path.join(planRoot, "job-plan.json");
    const originalPlan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    writeJson(planPath, { ...originalPlan, query: "Build a stale settings page" });
    for (const action of ["resolve", "probe"]) {
      const stale = run(["toolchain", action, "--root", planRoot, "--artifact", "toolchain-request.json"]);
      assert.equal(stale.status, 1, stale.stderr || stale.stdout);
      assert.equal(stale.output.ok, false);
      assert.match(stale.output.error.message, /job plan hash does not match contents/);
    }
    writeJson(planPath, originalPlan);
    const { jobId, jobPlanSha256, jobPlanPath, deliverableForm, ...unbound } = validRequest;
    for (const action of ["resolve", "probe"]) {
      for (const [request, error] of [
        [unbound, /missing Stage 0 binding/],
        [{ ...validRequest, jobPlanPath: "missing.json" }, /job plan/],
        [{ ...validRequest, jobPlanSha256: "a".repeat(64) }, /does not match/],
        [{ ...validRequest, brief: "制作滚动叙事页面" }, /deliverable-form conflict/],
      ]) {
        writeJson(path.join(planRoot, "rejected-request.json"), request);
        const rejected = run(["toolchain", action, "--root", planRoot, "--artifact", "rejected-request.json"]);
        assert.equal(rejected.status, 1, rejected.stdout);
        assert.equal(rejected.output.ok, false);
        assert.match(rejected.output.error.message, error);
      }
    }
  } finally {
    fs.rmSync(planRoot, { recursive: true, force: true });
  }

  const prism = run(["prism", "route", "--root", repoRoot, "--query", "检查这个界面的可访问性和对比度"]);
  assert.equal(prism.status, 0, prism.stderr || prism.stdout);
  assert.equal(prism.output.ok, true);
  assert.equal(prism.output.route, "ui-craft");

  const mengto = run(["mengto", "search", "--root", repoRoot, "--query", "progressive blur", "--limit", "1"]);
  assert.equal(mengto.status, 0, mengto.stderr || mengto.stdout);
  assert.equal(mengto.output.ok, true);
  assert.equal(fs.existsSync(mengto.output.results[0].skillPath), true);

  const holosticker = run(["holosticker", "inspect", "--root", repoRoot, "--capability", "die-cut-mask"]);
  assert.equal(holosticker.status, 0, holosticker.stderr || holosticker.stdout);
  assert.equal(holosticker.output.ok, true);
  assert.equal(holosticker.output.integration.adapter, "threejs");
});

test("SKILL toolchain handoff reaches execution route and rejects a tossed owner", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-cli-handoff-"));
  try {
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "pipeline@example.test");
    git(root, "config", "user.name", "Design Pipeline Test");
    fs.writeFileSync(path.join(root, "README.md"), "# fixture\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "fixture");

    const routedJob = run(["route", "--root", root, "--query", "Build a React settings page", "--write", "--output", "job-plan.json"]);
    assert.equal(routedJob.status, 0, routedJob.stderr || routedJob.stdout);
    const jobPlan = JSON.parse(fs.readFileSync(path.join(root, "job-plan.json"), "utf8"));
    writeJson(path.join(root, "toolchain-request.json"), {
      jobId: jobPlan.jobId,
      jobPlanSha256: jobPlan.planSha256,
      jobPlanPath: "job-plan.json",
      deliverableForm: jobPlan.deliverableForm,
      schema: "design-pipeline.toolchain-request.v1",
      framework: "react",
      brief: "Build a React settings page",
      requested: { styling: "none", uiLibrary: "none" },
    });
    const toolchain = run(["toolchain", "resolve", "--root", root, "--artifact", "toolchain-request.json", "--write", "--output", "toolchain-plan.json"]);
    assert.equal(toolchain.status, 0, toolchain.stderr || toolchain.stdout);
    assert.equal(toolchain.output.plan.primaryRouteId, "design-pipeline/core");

    const plan = JSON.parse(fs.readFileSync(path.join(root, "toolchain-plan.json"), "utf8"));
    const planHash = sha256(canonicalJson(plan));
    writeJson(path.join(root, "execution-request.json"), {
      schema: "design-pipeline.execution-request.v1",
      id: "skill-handoff",
      toolchainPlanSha256: planHash,
      jobPlanSha256: plan.jobPlanSha256,
      preferredMode: "auto",
      isolation: "optional",
      routeId: plan.primaryRouteId,
      slices: [{ id: "ui", owner: plan.primaryRouteId, scope: ["README.md"] }],
    });
    const routed = run(["execution", "route", "--root", root, "--artifact", "execution-request.json", "--plan", "toolchain-plan.json", "--write", "--output", "execution-plan.json"]);
    assert.equal(routed.status, 0, routed.stderr || routed.stdout);
    assert.equal(routed.output.plan.routeId, plan.primaryRouteId);

    writeJson(path.join(root, "bad-execution-request.json"), {
      ...JSON.parse(fs.readFileSync(path.join(root, "execution-request.json"), "utf8")),
      routeId: "tossed-owner",
      slices: [{ id: "ui", owner: "tossed-owner", scope: ["README.md"] }],
    });
    const rejected = run(["execution", "route", "--root", root, "--artifact", "bad-execution-request.json", "--plan", "toolchain-plan.json"]);
    assert.equal(rejected.status, 1);
    assert.equal(rejected.output.ok, false);
    assert.match(rejected.output.error.message, /primary route/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
