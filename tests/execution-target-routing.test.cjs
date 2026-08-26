"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { resolveToolchain } = require("../skill/scripts/toolchain-core.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");
const {
  finalizeExecutionTarget,
  prepareExecutionTarget,
  resolveExecutionTarget,
} = require("../skill/scripts/execution-target-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill", "scripts", "designer-pipeline.cjs");
const references = path.join(repoRoot, "skill", "references");
const readReference = (name) => JSON.parse(fs.readFileSync(path.join(references, name), "utf8"));
const toolchainSources = {
  frontendRegistry: readReference("frontend-stack-registry.json"),
  skillCatalog: readReference("mengto-skills-catalog.json"),
  adapterRegistry: readReference("adapter-registry.json"),
  graphicsCatalog: readReference("graphics-runtime-catalog.json"),
};

function git(root, ...args) {
  const child = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  return child.stdout.trim();
}

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "execution-target-repo-"));
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "pipeline@example.test");
  git(root, "config", "user.name", "Design Pipeline Test");
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, ".gitignore"), ".design-pipeline/\n");
  fs.writeFileSync(path.join(root, "src", "App.tsx"), "export default function App() { return null; }\n");
  fs.writeFileSync(path.join(root, "README.md"), "# Fixture\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "fixture");
  const worktreeBase = fs.mkdtempSync(path.join(os.tmpdir(), "execution-target-worktrees-"));
  t.after(() => {
    spawnSync("git", ["worktree", "prune"], { cwd: root, encoding: "utf8", windowsHide: true });
    fs.rmSync(worktreeBase, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, worktreeBase };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function runCli(root, args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--root", root, "--json"], { cwd: root, encoding: "utf8", windowsHide: true });
  let output;
  try { output = JSON.parse(child.stdout); } catch { output = { stdout: child.stdout, stderr: child.stderr }; }
  return { ...child, output };
}

function resolvedToolchain(brief) {
  return resolveToolchain({
    schema: "design-pipeline.toolchain-request.v1",
    framework: "react",
    brief,
    requested: { styling: "tailwindcss", uiLibrary: "shadcn" },
  }, toolchainSources);
}

function request(overrides = {}) {
  return {
    schema: "design-pipeline.execution-request.v1",
    id: "react-settings",
    toolchainPlanSha256: "a".repeat(64),
    preferredMode: "auto",
    isolation: "optional",
    slices: [{ id: "ui", owner: "frontend", scope: ["src/"] }],
    ...overrides,
  };
}

function outcome(overrides = {}) {
  return {
    schema: "design-pipeline.execution-outcome.v1",
    status: "complete",
    invocation: { command: ["npm", "test"], exitCode: 0 },
    completedAt: "2026-08-13T01:00:00.000Z",
    evidenceReceipts: [],
    notes: [],
    ...overrides,
  };
}

test("auto routing keeps one clean React slice in place and sequences multiple owners", (t) => {
  const { root, worktreeBase } = repository(t);
  const inPlace = resolveExecutionTarget(request(), { projectRoot: root, worktreeBase });
  assert.equal(inPlace.status, "ready");
  assert.equal(inPlace.mode, "in-place");
  assert.equal(fs.statSync(inPlace.executionRoot).ino, fs.statSync(root).ino);

  const sequential = resolveExecutionTarget(request({
    id: "react-multi-owner",
    slices: [
      { id: "ui", owner: "frontend", scope: ["src/"] },
      { id: "docs", owner: "writer", scope: ["README.md"] },
    ],
  }), { projectRoot: root, worktreeBase });
  assert.equal(sequential.mode, "sequential");
  assert.deepEqual(sequential.slices.map(({ owner }) => owner), ["frontend", "writer"]);
});

test("React and website-cloning toolchain plans feed the same execution router", (t) => {
  const { root, worktreeBase } = repository(t);
  const reactToolchain = resolvedToolchain("Build a React settings page");
  const react = resolveExecutionTarget(request({ toolchainPlanSha256: sha256(canonicalJson(reactToolchain)), routeId: reactToolchain.primaryRouteId, slices: [{ id: "ui", owner: reactToolchain.primaryRouteId, scope: ["src/"] }] }), {
    projectRoot: root,
    worktreeBase,
    toolchainPlan: reactToolchain,
  });
  assert.equal(react.mode, "in-place");

  const cloneToolchain = resolvedToolchain("Clone and reverse engineer a marketing website");
  assert.ok(cloneToolchain.tools.some(({ id }) => id === "design-pipeline/website-cloning"));
  const clone = resolveExecutionTarget(request({
    id: "website-clone-chain",
    toolchainPlanSha256: sha256(canonicalJson(cloneToolchain)),
    isolation: "required",
    routeId: cloneToolchain.primaryRouteId,
    slices: [{ id: "ui", owner: cloneToolchain.primaryRouteId, scope: ["src/"] }],
  }), { projectRoot: root, worktreeBase, toolchainPlan: cloneToolchain });
  assert.equal(clone.mode, "worktree");
});

test("dirty or isolated routes select worktree while unsafe explicit modes fail closed", (t) => {
  const { root, worktreeBase } = repository(t);
  const isolated = resolveExecutionTarget(request({ id: "website-clone", isolation: "required" }), { projectRoot: root, worktreeBase });
  assert.equal(isolated.mode, "worktree");
  assert.match(isolated.branch, /^codex\/execution-website-clone$/);
  assert.equal(isolated.cleanup.onFailure, "retain");

  fs.appendFileSync(path.join(root, "README.md"), "dirty\n");
  const automatic = resolveExecutionTarget(request({ id: "dirty-repo" }), { projectRoot: root, worktreeBase });
  assert.equal(automatic.mode, "worktree");
  const unsafe = resolveExecutionTarget(request({ preferredMode: "in-place" }), { projectRoot: root, worktreeBase });
  assert.equal(unsafe.status, "blocked");
  assert.ok(unsafe.blockers.some((item) => item.includes("dirty")));
});

test("execution requires the same job plan hash as the toolchain plan", (t) => {
  const { root, worktreeBase } = repository(t);
  const jobPlan = buildJobPlan(routeJob({ query: "clone this landing page" }));
  const toolchain = resolveToolchain({
    schema: "design-pipeline.toolchain-request.v1",
    framework: "react",
    brief: "clone this landing page",
    requested: { styling: "none", uiLibrary: "none" },
    jobPlanSha256: jobPlan.planSha256,
  }, toolchainSources, { jobPlan });
  const bound = request({
    toolchainPlanSha256: sha256(canonicalJson(toolchain)),
    routeId: toolchain.primaryRouteId,
    slices: [{ id: "ui", owner: toolchain.primaryRouteId, scope: ["src/"] }],
    jobPlanSha256: jobPlan.planSha256,
  });
  const matched = resolveExecutionTarget(bound, { projectRoot: root, worktreeBase, toolchainPlan: toolchain });
  assert.equal(matched.status, "ready");

  assert.throws(
    () => resolveExecutionTarget({ ...bound, jobPlanSha256: undefined }, { projectRoot: root, worktreeBase, toolchainPlan: toolchain }),
    /both the execution request and the toolchain plan/,
  );
  assert.throws(
    () => resolveExecutionTarget({ ...bound, jobPlanSha256: "b".repeat(64) }, { projectRoot: root, worktreeBase, toolchainPlan: toolchain }),
    /does not match the toolchain plan/,
  );
});

test("execution without a job plan keeps current behavior", (t) => {
  const { root, worktreeBase } = repository(t);
  const result = resolveExecutionTarget(request(), { projectRoot: root, worktreeBase });
  assert.equal(result.status, "ready");
});

test("scope and branch validation rejects traversal, overlap, and non-agent branches", (t) => {
  const { root, worktreeBase } = repository(t);
  assert.throws(
    () => resolveExecutionTarget(request({ slices: [{ id: "escape", owner: "frontend", scope: ["../outside"] }] }), { projectRoot: root, worktreeBase }),
    /scope/,
  );
  assert.throws(
    () => resolveExecutionTarget(request({
      slices: [
        { id: "one", owner: "a", scope: ["src/"] },
        { id: "two", owner: "b", scope: ["src/components/"] },
      ],
    }), { projectRoot: root, worktreeBase }),
    /overlap/,
  );
  assert.throws(
    () => resolveExecutionTarget(request({ preferredMode: "worktree", branch: "main" }), { projectRoot: root, worktreeBase }),
    /branch/,
  );
});

test("a real worktree completes only from a clean in-scope commit and is then removed", (t) => {
  const { root, worktreeBase } = repository(t);
  const plan = resolveExecutionTarget(request({ id: "isolated-success", isolation: "required" }), { projectRoot: root, worktreeBase });
  const state = prepareExecutionTarget(plan, { projectRoot: root, worktreeBase, now: "2026-08-13T00:00:00.000Z" });
  assert.equal(git(state.executionRoot, "rev-parse", "HEAD"), plan.baseHead);
  assert.equal(git(state.executionRoot, "branch", "--show-current"), plan.branch);

  fs.appendFileSync(path.join(state.executionRoot, "src", "App.tsx"), "// routed\n");
  git(state.executionRoot, "add", "src/App.tsx");
  git(state.executionRoot, "commit", "-m", "test: routed change");
  const receipt = finalizeExecutionTarget(plan, state, outcome(), { projectRoot: root, worktreeBase });
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.executionPlanSha256, sha256(canonicalJson(plan)));
  assert.equal(receipt.toolchainPlanSha256, plan.toolchainPlanSha256);
  assert.deepEqual(receipt.changedFiles, ["src/App.tsx"]);
  assert.equal(receipt.cleanup.action, "removed");
  assert.equal(fs.existsSync(state.executionRoot), false);
  assert.equal(git(root, "show-ref", "--verify", `refs/heads/${plan.branch}`).length > 0, true);
});

test("failures, dirty success, and out-of-scope commits retain the worktree", async (t) => {
  for (const scenario of ["failed", "dirty", "out-of-scope"]) {
    await t.test(scenario, (child) => {
      const { root, worktreeBase } = repository(child);
      const plan = resolveExecutionTarget(request({ id: `retain-${scenario}`, isolation: "required" }), { projectRoot: root, worktreeBase });
      const state = prepareExecutionTarget(plan, { projectRoot: root, worktreeBase, now: "2026-08-13T00:00:00.000Z" });
      let result = outcome();
      if (scenario === "failed") {
        fs.appendFileSync(path.join(state.executionRoot, "src", "App.tsx"), "// failed\n");
        result = outcome({ status: "failed", invocation: { command: ["npm", "test"], exitCode: 1 } });
      } else if (scenario === "dirty") {
        fs.appendFileSync(path.join(state.executionRoot, "src", "App.tsx"), "// dirty\n");
      } else {
        fs.appendFileSync(path.join(state.executionRoot, "README.md"), "outside scope\n");
        git(state.executionRoot, "add", "README.md");
        git(state.executionRoot, "commit", "-m", "test: outside scope");
      }
      const receipt = finalizeExecutionTarget(plan, state, result, { projectRoot: root, worktreeBase });
      assert.equal(receipt.status, scenario === "failed" ? "failed" : "blocked");
      assert.equal(receipt.cleanup.action, "retained");
      assert.equal(fs.existsSync(state.executionRoot), true);
      if (scenario === "out-of-scope") assert.deepEqual(receipt.outOfScope, ["README.md"]);
    });
  }
});

test("prepare refuses an existing branch or execution path without changing it", (t) => {
  const { root, worktreeBase } = repository(t);
  const plan = resolveExecutionTarget(request({ id: "collision", isolation: "required" }), { projectRoot: root, worktreeBase });
  git(root, "branch", plan.branch);
  assert.throws(() => prepareExecutionTarget(plan, { projectRoot: root, worktreeBase }), /already exists/);
  assert.equal(fs.existsSync(plan.executionRoot), false);

  const pathPlan = resolveExecutionTarget(request({ id: "collision-path", isolation: "required" }), { projectRoot: root, worktreeBase });
  fs.mkdirSync(pathPlan.executionRoot, { recursive: true });
  assert.throws(() => prepareExecutionTarget(pathPlan, { projectRoot: root, worktreeBase }), /path already exists/);
});

test("CLI routes, prepares, and finalizes a React execution with bound receipts", (t) => {
  const { root } = repository(t);
  const artifactRoot = path.join(root, ".design-pipeline");
  const toolchain = resolvedToolchain("Build a React settings page");
  const executionRequest = request({
    toolchainPlanSha256: sha256(canonicalJson(toolchain)),
    routeId: toolchain.primaryRouteId,
    slices: [{ id: "ui", owner: toolchain.primaryRouteId, scope: ["src/"] }],
  });
  writeJson(path.join(artifactRoot, "toolchain-plan.json"), toolchain);
  writeJson(path.join(artifactRoot, "execution-request.json"), executionRequest);

  const route = runCli(root, ["execution", "route", "--artifact", ".design-pipeline/execution-request.json", "--plan", ".design-pipeline/toolchain-plan.json", "--write", "--output", ".design-pipeline/execution-plan.json"]);
  assert.equal(route.status, 0, route.stderr || route.stdout);
  assert.equal(route.output.plan.mode, "in-place");

  const prepare = runCli(root, ["execution", "prepare", "--artifact", ".design-pipeline/execution-plan.json", "--timestamp", "2026-08-13T00:00:00.000Z", "--write", "--output", ".design-pipeline/execution-state.json"]);
  assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);
  fs.appendFileSync(path.join(root, "src", "App.tsx"), "// cli routed\n");
  writeJson(path.join(artifactRoot, "execution-outcome.json"), outcome());

  const finalize = runCli(root, ["execution", "finalize", "--artifact", ".design-pipeline/execution-plan.json", "--state", ".design-pipeline/execution-state.json", "--outcome", ".design-pipeline/execution-outcome.json", "--write", "--output", ".design-pipeline/execution-receipt.json"]);
  assert.equal(finalize.status, 0, finalize.stderr || finalize.stdout);
  assert.equal(finalize.output.receipt.status, "complete");
  assert.equal(finalize.output.receipt.toolchainPlanSha256, executionRequest.toolchainPlanSha256);
  assert.deepEqual(finalize.output.receipt.changedFiles, ["src/App.tsx"]);
});
