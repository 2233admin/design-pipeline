"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { canonicalJson, resolveInside, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { resolveToolchain } = require("../skill/scripts/toolchain-core.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");
const {
  captureGitSnapshot,
  finalizeExecutionTarget,
  inspectGitChanges,
  prepareExecutionTarget,
  resolveExecutionTarget,
  samePath,
  validateGitSnapshot,
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

function repository(t, { tempRoot = os.tmpdir() } = {}) {
  const root = fs.mkdtempSync(path.join(tempRoot, "execution-target-repo-"));
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "pipeline@example.test");
  git(root, "config", "user.name", "Design Pipeline Test");
  git(root, "config", "core.autocrlf", "false");
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, ".gitignore"), ".design-pipeline/\n");
  fs.writeFileSync(path.join(root, "src", "App.tsx"), "export default function App() { return null; }\n");
  fs.writeFileSync(path.join(root, "README.md"), "# Fixture\n");
  git(root, "add", ".");
  git(root, "commit", "-m", "fixture");
  const worktreeBase = fs.mkdtempSync(path.join(tempRoot, "execution-target-worktrees-"));
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
  const jobPlan = buildJobPlan(routeJob({ query: brief }));
  return resolveToolchain({
    jobId: jobPlan.jobId,
    jobPlanSha256: jobPlan.planSha256,
    jobPlanPath: "job-plan.json",
    deliverableForm: jobPlan.deliverableForm,
    schema: "design-pipeline.toolchain-request.v1",
    framework: "react",
    brief,
    requested: { styling: "tailwindcss", uiLibrary: "shadcn" },
  }, toolchainSources, { jobPlan });
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
  const react = resolveExecutionTarget(request({ jobPlanSha256: reactToolchain.jobPlanSha256, toolchainPlanSha256: sha256(canonicalJson(reactToolchain)), routeId: reactToolchain.primaryRouteId, slices: [{ id: "ui", owner: reactToolchain.primaryRouteId, scope: ["src/"] }] }), {
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
    jobPlanSha256: cloneToolchain.jobPlanSha256,
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
    jobId: jobPlan.jobId,
    jobPlanPath: "job-plan.json",
    deliverableForm: jobPlan.deliverableForm,
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
    jobPlanSha256: toolchain.jobPlanSha256,
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

test("contained paths keep lexical coordinates and Windows aliases retain physical containment", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "execution-containment-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "execution-containment-outside-"));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  const nested = path.join(root, "nested");
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(nested, "file.txt"), "contained\n");
  const canonicalRoot = fs.realpathSync.native(root);
  const future = path.join(root, "nested", "new", "file.txt");
  assert.equal(resolveInside(root, "nested/new/file.txt", "future"), future);
  assert.throws(() => resolveInside(root, path.join(outside, "file.txt"), "outside"), /must stay inside/);
  assert.throws(() => resolveInside(root, "../outside.txt", "traversal"), /must stay inside/);
  if (process.platform === "win32") {
    assert.equal(resolveInside(root, path.join(canonicalRoot, "nested", "file.txt"), "long spelling", { mustExist: true }), path.join(root, "nested", "file.txt"));
    assert.equal(resolveInside(canonicalRoot, future, "short spelling"), path.join(canonicalRoot, "nested", "new", "file.txt"));
    assert.equal(resolveInside(canonicalRoot + path.sep, future, "trailing separator"), path.join(canonicalRoot, "nested", "new", "file.txt"));
    assert.equal(resolveInside(path.parse(root).root, root, "drive root", { mustExist: true }), root);
    const upperSpelling = path.join(canonicalRoot, "nested", "file.txt").toUpperCase();
    assert.equal(resolveInside(canonicalRoot, upperSpelling, "case-insensitive spelling", { mustExist: true }), upperSpelling);
    assert.equal(samePath(future, future), true);
    assert.equal(samePath(future, future.toUpperCase()), false);
    if (path.relative(root, canonicalRoot) !== "") {
      const originalStat = fs.statSync;
      try {
        fs.statSync = function (file, options) {
          const stat = originalStat.call(this, file, options);
          if (file === canonicalRoot && options?.bigint) stat.ino = 0n;
          return stat;
        };
        assert.throws(() => resolveInside(canonicalRoot, future, "unobservable alias"), /must stay inside/);
        assert.equal(samePath(root, canonicalRoot), false);
      } finally { fs.statSync = originalStat; }
      const originalLstat = fs.lstatSync;
      try {
        fs.lstatSync = function (file, options) {
          const stat = originalLstat.call(this, file, options);
          if (file === root && options?.bigint && stat) stat.dev += 1n;
          return stat;
        };
        assert.throws(() => resolveInside(canonicalRoot, future, "different device alias"), /must stay inside/);
      } finally { fs.lstatSync = originalLstat; }
    }
  }

  const linkType = process.platform === "win32" ? "junction" : "dir";
  const containedLink = path.join(root, "contained-link");
  const outsideLink = path.join(root, "outside-link");
  const inboundLink = path.join(outside, "inbound-link");
  try {
    fs.symlinkSync(nested, containedLink, linkType);
    fs.symlinkSync(outside, outsideLink, linkType);
    fs.symlinkSync(root, inboundLink, linkType);
  } catch (error) {
    if (error.code !== "EPERM") throw error;
    t.diagnostic("directory link checks unavailable on this host");
    return;
  }
  assert.equal(resolveInside(root, "contained-link/new/file.txt", "contained link"), path.join(containedLink, "new", "file.txt"));
  assert.throws(() => resolveInside(root, "outside-link/new/file.txt", "external link"), /resolves outside/);
  assert.throws(() => resolveInside(canonicalRoot, path.join(inboundLink, "nested", "file.txt"), "outside alias"), /must stay inside/);
  if (process.platform === "win32") {
    const canonicalLinkPath = path.join(canonicalRoot, "contained-link", "file.txt");
    assert.equal(resolveInside(root, canonicalLinkPath, "contained link long spelling", { mustExist: true }), path.join(containedLink, "file.txt"));
    const { createArtifactMetadata, validateArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
    const metadata = createArtifactMetadata({ path: path.join(canonicalRoot, "nested", "file.txt"), producer: "alias fixture", input_hashes: {}, dependencies: [], created_at: new Date().toISOString() }, { changeRoot: containedLink });
    assert.equal(metadata.path, "file.txt", "physical aliases retain caller-root artifact coordinates");
    assert.equal(validateArtifactMetadata(metadata, { metadataOnly: true }).status, "ready");
    assert.throws(() => validateArtifactMetadata({ ...metadata, path: "../nested/file.txt" }, { changeRoot: containedLink }), /must stay inside/);
    const ancestorLink = path.join(outside, "ancestor-link");
    fs.symlinkSync(path.dirname(root), ancestorLink, "junction");
    assert.throws(() => resolveInside(canonicalRoot, path.join(ancestorLink, path.basename(root), "nested", "file.txt"), "outside ancestor alias"), /must stay inside/);
  }
  const brokenLink = path.join(root, "broken-link");
  fs.symlinkSync(path.join(outside, "absent"), brokenLink, linkType);
  assert.throws(() => resolveInside(root, "broken-link/file.txt", "broken link"), /unresolved symlink/);
  if (process.platform === "win32") {
    const caseDirectory = path.join(root, "case-sensitive");
    fs.mkdirSync(caseDirectory);
    const enabled = spawnSync("fsutil.exe", ["file", "setCaseSensitiveInfo", caseDirectory, "enable"], { encoding: "utf8", windowsHide: true, timeout: 10000 });
    if (enabled.status !== 0) {
      t.diagnostic("temporary NTFS case-sensitive directory unavailable; alias identity checks still ran");
      return;
    }
    const upper = path.join(caseDirectory, "Root"), lower = path.join(caseDirectory, "root");
    fs.mkdirSync(upper);
    if (fs.existsSync(lower)) {
      t.diagnostic("temporary directory remains case-insensitive despite fsutil exit 0; distinct-root scenario unavailable");
      return;
    }
    fs.mkdirSync(lower);
    fs.writeFileSync(path.join(lower, "outside.txt"), "different physical root\n");
    assert.notEqual(fs.statSync(upper, { bigint: true }).ino, fs.statSync(lower, { bigint: true }).ino);
    const canonicalUpper = fs.realpathSync.native(upper), canonicalLower = fs.realpathSync.native(lower);
    assert.equal(samePath(canonicalUpper, canonicalLower), false);
    assert.throws(() => resolveInside(canonicalUpper, path.join(canonicalLower, "outside.txt"), "case-sensitive root"), /resolves outside/);
    assert.throws(() => resolveInside(canonicalUpper + path.sep, path.join(canonicalLower, "new", "outside.txt"), "case-sensitive future root"), /resolves outside/);
    assert.throws(() => resolveInside(canonicalUpper, path.join(lower, "outside.txt"), "case-sensitive alias root"), /must stay inside|resolves outside/);
  }
});

test("Git snapshots preserve unchanged dirty work and detect another edit with the same status", (t) => {
  const { root } = repository(t);
  const readme = path.join(root, "README.md");
  fs.appendFileSync(readme, "pre-existing work\n");
  fs.writeFileSync(path.join(root, "owner-notes.txt"), "another owner's untracked work\n");
  const baseline = captureGitSnapshot(path.join(root, "src"));
  assert.equal(baseline.root, fs.realpathSync.native(root));
  assert.equal(validateGitSnapshot(baseline), baseline);
  assert.equal(baseline.files["README.md"].status, " M");
  const unchanged = inspectGitChanges(baseline, ["src/"], { root });
  assert.equal(unchanged.status, "passed");
  assert.deepEqual(unchanged.changedFiles, []);
  assert.equal(fs.readFileSync(readme, "utf8"), "# Fixture\npre-existing work\n");
  assert.equal(fs.readFileSync(path.join(root, "owner-notes.txt"), "utf8"), "another owner's untracked work\n");
  if (process.platform === "win32") {
    assert.equal(samePath(root, root.toUpperCase()), true);
    assert.equal(inspectGitChanges(baseline, ["src/"], { root: root.toUpperCase() }).status, "passed");
    assert.equal(inspectGitChanges(baseline, ["src/"], { root: fs.realpathSync.native(root) }).status, "passed");
  }

  fs.appendFileSync(readme, "a new task edit\n");
  const changed = inspectGitChanges(baseline, ["src/"], { root: path.join(root, "src") });
  assert.equal(changed.current.files["README.md"].status, baseline.files["README.md"].status);
  assert.equal(changed.status, "blocked");
  assert.deepEqual(changed.changedFiles, ["README.md"]);
  assert.deepEqual(changed.outOfScope, ["README.md"]);
  assert.match(changed.blockers.join("\n"), /scope/);
});

test("Git scope detects an index-only edit while working bytes and MM status stay unchanged", (t) => {
  const { root } = repository(t);
  const readme = path.join(root, "README.md");
  fs.writeFileSync(readme, "first staged contents\n");
  git(root, "add", "README.md");
  fs.writeFileSync(readme, "unchanged working contents\n");
  const baseline = captureGitSnapshot(root);
  assert.equal(baseline.files["README.md"].status, "MM");
  assert.equal(inspectGitChanges(baseline, ["src/"]).status, "passed");
  const blob = spawnSync("git", ["hash-object", "-w", "--stdin"], { cwd: root, input: "different staged contents\n", encoding: "utf8", windowsHide: true });
  assert.equal(blob.status, 0, blob.stderr);
  git(root, "update-index", "--cacheinfo", `100644,${blob.stdout.trim()},README.md`);
  const result = inspectGitChanges(baseline, ["src/"]);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.outOfScope, ["README.md"]);
  assert.equal(result.current.files["README.md"].status, "MM");
  assert.equal(result.current.files["README.md"].sha256, baseline.files["README.md"].sha256);
  assert.notEqual(result.current.files["README.md"].index[0].oid, baseline.files["README.md"].index[0].oid);
  assert.equal(fs.readFileSync(readme, "utf8"), "unchanged working contents\n");
});

test("Git scope retains rename endpoints, deleted files, untracked paths and index modes", (t) => {
  const { root } = repository(t);
  const baseline = captureGitSnapshot(root);
  fs.mkdirSync(path.join(root, "docs"));
  git(root, "mv", "src/App.tsx", "docs/App.tsx");
  fs.unlinkSync(path.join(root, "README.md"));
  fs.writeFileSync(path.join(root, "new.txt"), "untracked\n");
  git(root, "update-index", "--chmod=+x", ".gitignore");
  const result = inspectGitChanges(baseline, ["src/"]);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.changedFiles, [".gitignore", "README.md", "docs/App.tsx", "new.txt", "src/App.tsx"]);
  assert.deepEqual(result.outOfScope, [".gitignore", "README.md", "docs/App.tsx", "new.txt"]);
  assert.equal(result.current.files["README.md"].type, "missing");
  assert.equal(result.current.files[".gitignore"].index[0].mode, "100755");
  git(root, "add", "-A");
  git(root, "commit", "-m", "rename, delete and add");
  const committed = inspectGitChanges(baseline, ["src/"]);
  assert.ok(committed.commitChangedFiles.includes("src/App.tsx"));
  assert.ok(committed.commitChangedFiles.includes("docs/App.tsx"));
  assert.ok(committed.commitChangedFiles.includes("README.md"));
  assert.ok(committed.commitChangedFiles.includes("new.txt"));
});

test("Git scope blocks unresolved index stages even when the conflict path is authorized", (t) => {
  const { root } = repository(t);
  git(root, "checkout", "-b", "conflicting");
  fs.writeFileSync(path.join(root, "README.md"), "other branch\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "other branch");
  git(root, "checkout", "main");
  fs.writeFileSync(path.join(root, "README.md"), "main branch\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "main branch");
  const baseline = captureGitSnapshot(root);
  const merge = spawnSync("git", ["merge", "--no-edit", "conflicting"], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(merge.status, 1, merge.stderr || merge.stdout);
  const result = inspectGitChanges(baseline, ["README.md"]);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.outOfScope, []);
  assert.deepEqual(result.current.files["README.md"].index.map(({ stage }) => stage), [1, 2, 3]);
  assert.match(result.blockers.join("\n"), /unresolved Git index stages/);
});

test("Git scope observes every commit when an out-of-scope edit is later reverted", (t) => {
  const { root } = repository(t);
  const baseline = captureGitSnapshot(root);
  fs.appendFileSync(path.join(root, "README.md"), "temporary committed escape\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "outside task scope");
  git(root, "revert", "--no-edit", "HEAD");
  const result = inspectGitChanges(baseline, ["src/"]);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.current.files, baseline.files);
  assert.deepEqual(result.commitChangedFiles, ["README.md"]);
  assert.deepEqual(result.outOfScope, ["README.md"]);
});

test("Git scope refuses root, branch and baseline history replacement", async (t) => {
  await t.test("another Git root", (child) => {
    const first = repository(child);
    const second = repository(child);
    git(second.root, "fetch", first.root, "main");
    git(second.root, "reset", "--hard", "FETCH_HEAD");
    assert.equal(git(second.root, "rev-parse", "HEAD"), git(first.root, "rev-parse", "HEAD"));
    assert.equal(samePath(first.root, second.root), false);
    const result = inspectGitChanges(captureGitSnapshot(first.root), ["src/"], { root: second.root });
    assert.equal(result.status, "blocked");
    assert.match(result.blockers.join("\n"), /Git root changed/);
  });
  await t.test("another branch", (child) => {
    const { root } = repository(child);
    const baseline = captureGitSnapshot(root);
    git(root, "checkout", "-b", "different");
    const result = inspectGitChanges(baseline, ["src/"]);
    assert.equal(result.status, "blocked");
    assert.match(result.blockers.join("\n"), /Git branch changed/);
  });
  await t.test("same branch with replaced history", (child) => {
    const { root } = repository(child);
    const baseline = captureGitSnapshot(root);
    git(root, "commit", "--amend", "-m", "replacement initial commit");
    const result = inspectGitChanges(baseline, ["src/"]);
    assert.equal(result.current.branch, baseline.branch);
    assert.deepEqual(result.changedFiles, []);
    assert.equal(result.status, "blocked");
    assert.match(result.blockers.join("\n"), /ancestor/);
  });
});

test("scope inspection retains a successful worktree until the existing finalizer removes it", (t) => {
  // A revision range must not be probed as a filename relative to a long cwd.
  let tempRoot = os.tmpdir();
  let longTempRoot;
  if (tempRoot.length < 130) {
    longTempRoot = fs.mkdtempSync(path.join(tempRoot, "scope-long-temp-"));
    tempRoot = longTempRoot;
    while (tempRoot.length < 130) tempRoot = path.join(tempRoot, "subpath");
    fs.mkdirSync(tempRoot, { recursive: true });
  }
  const { root, worktreeBase } = repository(t, { tempRoot });
  if (longTempRoot) t.after(() => fs.rmSync(longTempRoot, { recursive: true, force: true }));
  const plan = resolveExecutionTarget(request({ id: "inspect-no-cleanup", isolation: "required" }), { projectRoot: root, worktreeBase });
  const state = prepareExecutionTarget(plan, { projectRoot: root, worktreeBase, now: "2026-08-13T00:00:00.000Z" });
  const baseline = captureGitSnapshot(state.executionRoot);
  fs.appendFileSync(path.join(state.executionRoot, "src", "App.tsx"), "// verified scope\n");
  git(state.executionRoot, "add", "src/App.tsx");
  git(state.executionRoot, "commit", "-m", "in scope");
  const result = inspectGitChanges(baseline, ["src/"]);
  assert.equal(result.status, "passed", `execution root: ${state.executionRoot}\n${result.blockers.join("\n")}`);
  assert.deepEqual(result.changedFiles, ["src/App.tsx"]);
  assert.equal(fs.existsSync(state.executionRoot), true);
  const receipt = finalizeExecutionTarget(plan, state, outcome(), { projectRoot: root, worktreeBase });
  assert.equal(receipt.status, "complete");
  assert.equal(receipt.cleanup.action, "removed");
  assert.equal(fs.existsSync(state.executionRoot), false);
});

test("existing finalizer retains a clean worktree whose out-of-scope commit was reverted", (t) => {
  const { root, worktreeBase } = repository(t);
  const plan = resolveExecutionTarget(request({ id: "inspect-revert-retained", isolation: "required" }), { projectRoot: root, worktreeBase });
  const state = prepareExecutionTarget(plan, { projectRoot: root, worktreeBase, now: "2026-08-13T00:00:00.000Z" });
  fs.appendFileSync(path.join(state.executionRoot, "README.md"), "committed scope escape\n");
  git(state.executionRoot, "add", "README.md");
  git(state.executionRoot, "commit", "-m", "scope escape");
  git(state.executionRoot, "revert", "--no-edit", "HEAD");
  assert.equal(git(state.executionRoot, "status", "--porcelain"), "");
  const receipt = finalizeExecutionTarget(plan, state, outcome(), { projectRoot: root, worktreeBase });
  assert.equal(receipt.status, "blocked");
  assert.deepEqual(receipt.outOfScope, ["README.md"]);
  assert.equal(receipt.cleanup.action, "retained");
  assert.equal(fs.existsSync(state.executionRoot), true);
});

test("Git snapshots hash link identity without reading targets outside the repository", (t) => {
  const { root, worktreeBase } = repository(t);
  const outside = path.join(worktreeBase, "outside.txt");
  fs.writeFileSync(outside, "external original\n");
  const link = path.join(root, "outside-link");
  try { fs.symlinkSync(outside, link, "file"); } catch (error) {
    if (error.code !== "EPERM") throw error;
    t.skip("file symlink creation is not permitted by this host");
    return;
  }
  const baseline = captureGitSnapshot(root);
  assert.equal(baseline.files["outside-link"].type, "symlink");
  assert.equal(baseline.files["outside-link"].sha256, sha256(fs.readlinkSync(link, { encoding: "buffer" })));
  fs.writeFileSync(outside, "external updated\n");
  assert.equal(inspectGitChanges(baseline, ["src/"]).status, "passed");
  fs.unlinkSync(link);
  fs.symlinkSync(path.join(worktreeBase, "missing.txt"), link, "file");
  const result = inspectGitChanges(baseline, ["src/"]);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.outOfScope, ["outside-link"]);
  assert.equal(fs.readFileSync(outside, "utf8"), "external updated\n");
});

test("Git scope blocks missing observation and a tracked parent linked outside the repository", async (t) => {
  await t.test("non-Git target", (child) => {
    const { root, worktreeBase } = repository(child);
    const baseline = captureGitSnapshot(root);
    const ceiling = process.env.GIT_CEILING_DIRECTORIES;
    let result;
    try {
      // F-drive test temp lives under this maintenance checkout; stop discovery
      // before Git can inherit that unrelated parent repository.
      process.env.GIT_CEILING_DIRECTORIES = path.dirname(worktreeBase);
      result = inspectGitChanges(baseline, ["src/"], { root: worktreeBase });
    } finally {
      if (ceiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
      else process.env.GIT_CEILING_DIRECTORIES = ceiling;
    }
    assert.equal(result.status, "blocked");
    assert.ok(result.current === null, "unobservable target must not produce a current snapshot");
    assert.match(result.blockers.join("\n"), /cannot observe Git scope/);
  });
  await t.test("external directory link", (child) => {
    const { root, worktreeBase } = repository(child);
    const baseline = captureGitSnapshot(root);
    const outside = path.join(worktreeBase, "external");
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, "App.tsx"), "external protected contents\n");
    fs.renameSync(path.join(root, "src"), path.join(worktreeBase, "saved-src"));
    try { fs.symlinkSync(outside, path.join(root, "src"), process.platform === "win32" ? "junction" : "dir"); } catch (error) {
      if (error.code !== "EPERM") throw error;
      child.skip("directory link creation is not permitted by this host");
      return;
    }
    const result = inspectGitChanges(baseline, ["src/"]);
    assert.equal(result.status, "blocked");
    assert.match(result.blockers.join("\n"), /resolves outside/);
    assert.equal(fs.readFileSync(path.join(outside, "App.tsx"), "utf8"), "external protected contents\n");
  });
});

test("Git scope refuses a mixed snapshot when a new out-of-scope commit lands during file hashing", (t) => {
  const { root } = repository(t);
  const baseline = captureGitSnapshot(root);
  const originalRead = fs.readFileSync;
  let committed = false;
  let result;
  try {
    fs.readFileSync = function (file, ...args) {
      if (!committed && file === path.join(baseline.root, ".gitignore")) {
        committed = true;
        fs.writeFileSync(path.join(root, "late-outside.txt"), "committed during observation\n");
        git(root, "add", "late-outside.txt");
        git(root, "commit", "-m", "late scope escape");
      }
      return originalRead.call(this, file, ...args);
    };
    result = inspectGitChanges(baseline, ["src/"]);
  } finally { fs.readFileSync = originalRead; }
  assert.equal(committed, true);
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /changed during snapshot/);
  const settled = inspectGitChanges(baseline, ["src/"]);
  assert.equal(settled.status, "blocked");
  assert.deepEqual(settled.outOfScope, ["late-outside.txt"]);
});
