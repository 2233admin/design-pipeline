"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  assertEnum,
  assertKeys,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  pathInside,
  sha256,
  sortValue,
} = require("./contract-utils.cjs");

const REQUEST_SCHEMA = "design-pipeline.execution-request.v1";
const PLAN_SCHEMA = "design-pipeline.execution-plan.v1";
const STATE_SCHEMA = "design-pipeline.execution-state.v1";
const OUTCOME_SCHEMA = "design-pipeline.execution-outcome.v1";
const RECEIPT_SCHEMA = "design-pipeline.execution-receipt.v1";
const MODES = ["auto", "in-place", "worktree", "sequential"];

function invalid(message, details = {}) { fail("execution target", message, details); }

function gitResult(root, args) {
  const child = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (child.error) invalid(`git ${args[0]} failed: ${child.error.message}`);
  return child;
}

function git(root, ...args) {
  const child = gitResult(root, args);
  if (child.status !== 0) invalid(`git ${args[0]} failed: ${String(child.stderr || child.stdout).trim() || `exit ${child.status}`}`);
  return String(child.stdout);
}

function samePath(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  if ((process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b)) return true;
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const leftStat = fs.statSync(a);
  const rightStat = fs.statSync(b);
  return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
}

function repository(projectRoot) {
  const input = fs.realpathSync(path.resolve(projectRoot));
  const top = fs.realpathSync(path.resolve(input, git(input, "rev-parse", "--show-toplevel").trim()));
  if (!samePath(input, top)) invalid(`projectRoot must be the Git repository root: ${top}`);
  const branchResult = gitResult(top, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (branchResult.status !== 0) invalid("an attached base branch is required");
  const branch = String(branchResult.stdout).trim();
  return {
    root: top,
    branch,
    head: git(top, "rev-parse", "HEAD").trim(),
    dirty: git(top, "status", "--porcelain=v1", "-z", "--untracked-files=all").length > 0,
  };
}

function validateId(value, label = "id") {
  assertString(value, label, "execution target");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) invalid(`${label} must be a lowercase slug`);
}

function validateHash(value, label) {
  if (!/^[a-f0-9]{64}$/.test(value || "")) invalid(`${label} must be SHA-256`);
}

function validateBranch(value) {
  assertString(value, "branch", "execution target");
  if (!/^codex\/[a-z0-9][a-z0-9._/-]{0,100}$/.test(value) || value.includes("..") || value.includes("//") || value.endsWith("/") || value.endsWith(".lock")) {
    invalid("worktree branch must be a safe codex/* branch");
  }
}

function validateScope(value, label) {
  assertString(value, label, "execution target");
  if (path.isAbsolute(value) || value.includes("\\") || value.includes("\0") || /[*?[\]]/.test(value) || value.startsWith("/") || value !== value.trim()) {
    invalid(`${label} must be a project-relative literal path`);
  }
  const directory = value.endsWith("/");
  const body = directory ? value.slice(0, -1) : value;
  const segments = body.split("/");
  if (!body || segments.some((segment) => !segment || segment === "." || segment === ".." || segment === ".git")) {
    invalid(`${label} contains an unsafe path segment`);
  }
  return value;
}

function scopesOverlap(left, right) {
  if (left === right) return true;
  if (left.endsWith("/") && right.startsWith(left)) return true;
  if (right.endsWith("/") && left.startsWith(right)) return true;
  return false;
}

function validateSlices(slices) {
  if (!Array.isArray(slices) || !slices.length) invalid("slices must contain at least one execution slice");
  const ids = new Set();
  const scopes = [];
  for (const [index, slice] of slices.entries()) {
    assertKeys(slice, ["id", "owner", "scope"], ["id", "owner", "scope"], `slices[${index}]`, "execution target");
    validateId(slice.id, `slices[${index}].id`);
    if (ids.has(slice.id)) invalid(`duplicate slice id ${slice.id}`);
    ids.add(slice.id);
    assertString(slice.owner, `slices[${index}].owner`, "execution target");
    assertStringArray(slice.scope, `slices[${index}].scope`, "execution target", { unique: true, min: 1 });
    for (const raw of slice.scope) {
      const scope = validateScope(raw, `slices[${index}].scope`);
      const overlap = scopes.find((entry) => scopesOverlap(entry.scope, scope));
      if (overlap) invalid(`scope ${scope} overlaps ${overlap.scope}`);
      scopes.push({ scope, owner: slice.owner });
    }
  }
  return slices;
}

function validateRequest(request) {
  assertKeys(
    request,
    ["schema", "id", "toolchainPlanSha256", "preferredMode", "isolation", "slices"],
    ["schema", "id", "toolchainPlanSha256", "preferredMode", "isolation", "branch", "routeId", "slices", "jobPlanSha256"],
    "request",
    "execution target",
  );
  if (request.schema !== REQUEST_SCHEMA) invalid("unsupported request schema");
  validateId(request.id);
  validateHash(request.toolchainPlanSha256, "toolchainPlanSha256");
  assertEnum(request.preferredMode, MODES, "preferredMode", "execution target");
  assertEnum(request.isolation, ["optional", "required"], "isolation", "execution target");
  if (request.branch !== undefined) validateBranch(request.branch);
  if (request.routeId !== undefined) assertString(request.routeId, "routeId", "execution target");
  if (request.jobPlanSha256 !== undefined) validateHash(request.jobPlanSha256, "jobPlanSha256");
  validateSlices(request.slices);
  return request;
}

function bindExecutionJobPlan(request, toolchainPlan) {
  const requestHash = request.jobPlanSha256;
  const planHash = toolchainPlan?.jobPlanSha256;
  if (!requestHash && !planHash) return;
  if (!requestHash || !planHash) invalid("jobPlanSha256 must be present on both the execution request and the toolchain plan");
  if (requestHash !== planHash) invalid("jobPlanSha256 does not match the toolchain plan");
}

function worktreeRoot(projectRoot, id, base) {
  const parent = path.resolve(base || path.join(os.tmpdir(), "design-pipeline-worktrees"));
  const target = path.resolve(parent, sha256(projectRoot).slice(0, 12), id);
  if (!pathInside(parent, target)) invalid("execution root escapes the worktree base");
  return target;
}

function selectedMode(request, repo) {
  if (request.preferredMode !== "auto") return request.preferredMode;
  if (request.isolation === "required" || repo.dirty) return "worktree";
  return request.slices.length > 1 ? "sequential" : "in-place";
}

function resolveExecutionTarget(request, options = {}) {
  validateRequest(request);
  bindExecutionJobPlan(request, options.toolchainPlan);
  const repo = repository(options.projectRoot || process.cwd());
  if (request.routeId !== undefined && !options.toolchainPlan) invalid("routeId requires a toolchain plan");
  if (options.toolchainPlan) {
    if (options.toolchainPlan.schema !== "design-pipeline.toolchain-plan.v1" || !["ready", "blocked"].includes(options.toolchainPlan.status)) {
      invalid("toolchain plan has an unsupported schema or status");
    }
    if (request.toolchainPlanSha256 !== sha256(canonicalJson(options.toolchainPlan))) invalid("toolchainPlanSha256 does not match the toolchain plan");
    if (request.routeId !== undefined) {
      if (request.routeId !== options.toolchainPlan.primaryRouteId) invalid("routeId does not match the toolchain primary route");
      if (request.slices.some((slice) => slice.owner !== request.routeId)) invalid("execution slice owner is not authorized by the selected route");
    }
    if (request.routeId === undefined && options.toolchainPlan.primaryRouteId) invalid("routeId is required when a toolchain primary route is present");
  }
  const mode = selectedMode(request, repo);
  const blockers = [];
  if (options.toolchainPlan?.status === "blocked") blockers.push("toolchain plan is blocked");
  if (request.isolation === "required" && mode !== "worktree") blockers.push("required isolation needs worktree mode");
  if (repo.dirty && ["in-place", "sequential"].includes(mode)) blockers.push(`${mode} cannot start from a dirty repository`);
  if (mode === "in-place" && request.slices.length > 1) blockers.push("multiple execution slices require sequential or worktree mode");
  if (request.branch && mode !== "worktree") blockers.push("an execution branch is only valid in worktree mode");
  const branch = mode === "worktree" ? request.branch || `codex/execution-${request.id}` : repo.branch;
  const executionRoot = mode === "worktree" ? worktreeRoot(repo.root, request.id, options.worktreeBase) : repo.root;
  return sortValue({
    schema: PLAN_SCHEMA,
    status: blockers.length ? "blocked" : "ready",
    id: request.id,
    toolchainPlanSha256: request.toolchainPlanSha256,
    ...(request.routeId ? { routeId: request.routeId } : {}),
    mode,
    projectRoot: repo.root,
    executionRoot,
    branch,
    baseBranch: repo.branch,
    baseHead: repo.head,
    dirtyAtResolution: repo.dirty,
    slices: request.slices,
    cleanup: { onComplete: mode === "worktree" ? "remove-if-clean" : "not-applicable", onFailure: "retain" },
    blockers,
  });
}

function validatePlan(plan, options = {}) {
  const required = ["schema", "status", "id", "toolchainPlanSha256", "mode", "projectRoot", "executionRoot", "branch", "baseBranch", "baseHead", "dirtyAtResolution", "slices", "cleanup", "blockers"];
  assertKeys(plan, required, [...required, "routeId"], "plan", "execution target");
  if (plan.schema !== PLAN_SCHEMA) invalid("unsupported execution plan schema");
  assertEnum(plan.status, ["ready", "blocked"], "status", "execution target");
  validateId(plan.id);
  validateHash(plan.toolchainPlanSha256, "toolchainPlanSha256");
  assertEnum(plan.mode, MODES.slice(1), "mode", "execution target");
  assertString(plan.projectRoot, "projectRoot", "execution target");
  assertString(plan.executionRoot, "executionRoot", "execution target");
  if (plan.mode === "worktree") validateBranch(plan.branch);
  else assertString(plan.branch, "branch", "execution target");
  if (plan.routeId !== undefined) assertString(plan.routeId, "routeId", "execution target");
  assertString(plan.baseBranch, "baseBranch", "execution target");
  if (!/^[a-f0-9]{40,64}$/.test(plan.baseHead || "")) invalid("baseHead must be a Git object id");
  if (typeof plan.dirtyAtResolution !== "boolean") invalid("dirtyAtResolution must be boolean");
  validateSlices(plan.slices);
  assertKeys(plan.cleanup, ["onComplete", "onFailure"], ["onComplete", "onFailure"], "cleanup", "execution target");
  assertEnum(plan.cleanup.onComplete, ["remove-if-clean", "not-applicable"], "cleanup.onComplete", "execution target");
  if (plan.cleanup.onFailure !== "retain") invalid("cleanup.onFailure must be retain");
  assertStringArray(plan.blockers, "blockers", "execution target");
  const repo = repository(options.projectRoot || plan.projectRoot);
  if (plan.projectRoot !== repo.root) invalid("execution plan projectRoot does not match the repository");
  const expectedRoot = plan.mode === "worktree" ? worktreeRoot(repo.root, plan.id, options.worktreeBase) : repo.root;
  if (!samePath(plan.executionRoot, expectedRoot)) invalid("executionRoot does not match the routed target");
  return { plan, repo };
}

function now(options) {
  const value = options.now || new Date().toISOString();
  if (!Number.isFinite(Date.parse(value))) invalid("now must be a date-time");
  return new Date(value).toISOString();
}

function prepareExecutionTarget(plan, options = {}) {
  const { repo } = validatePlan(plan, options);
  if (plan.status !== "ready") invalid("cannot prepare a blocked execution plan", { code: "BLOCKED" });
  if (repo.head !== plan.baseHead) invalid("repository HEAD changed after routing", { code: "BLOCKED" });
  if (plan.mode !== "worktree") {
    if (repo.branch !== plan.branch) invalid("repository branch changed after routing", { code: "BLOCKED" });
    if (repo.dirty) invalid(`${plan.mode} cannot start from a dirty repository`, { code: "BLOCKED" });
    return sortValue({
      schema: STATE_SCHEMA,
      id: plan.id,
      executionPlanSha256: sha256(canonicalJson(plan)),
      toolchainPlanSha256: plan.toolchainPlanSha256,
      mode: plan.mode,
      projectRoot: plan.projectRoot,
      executionRoot: plan.executionRoot,
      branch: plan.branch,
      baseHead: plan.baseHead,
      startedAt: now(options),
      worktreeCreated: false,
    });
  }
  const branchCheck = gitResult(repo.root, ["show-ref", "--verify", "--quiet", `refs/heads/${plan.branch}`]);
  if (branchCheck.status === 0) invalid(`branch ${plan.branch} already exists`);
  if (branchCheck.status !== 1) invalid(`could not verify branch ${plan.branch}`);
  if (fs.existsSync(plan.executionRoot)) invalid(`execution path already exists: ${plan.executionRoot}`);
  fs.mkdirSync(path.dirname(plan.executionRoot), { recursive: true });
  git(repo.root, "worktree", "add", "--no-track", "-b", plan.branch, plan.executionRoot, plan.baseHead);
  const target = repository(plan.executionRoot);
  if (target.branch !== plan.branch || target.head !== plan.baseHead) invalid("created worktree does not match the execution plan");
  return sortValue({
    schema: STATE_SCHEMA,
    id: plan.id,
    executionPlanSha256: sha256(canonicalJson(plan)),
    toolchainPlanSha256: plan.toolchainPlanSha256,
    mode: plan.mode,
    projectRoot: plan.projectRoot,
    executionRoot: plan.executionRoot,
    branch: plan.branch,
    baseHead: plan.baseHead,
    startedAt: now(options),
    worktreeCreated: true,
  });
}

function validateState(state, plan) {
  const keys = ["schema", "id", "executionPlanSha256", "toolchainPlanSha256", "mode", "projectRoot", "executionRoot", "branch", "baseHead", "startedAt", "worktreeCreated"];
  assertKeys(state, keys, keys, "state", "execution target");
  if (state.schema !== STATE_SCHEMA) invalid("unsupported execution state schema");
  if (state.id !== plan.id || state.mode !== plan.mode || state.projectRoot !== plan.projectRoot || state.executionRoot !== plan.executionRoot || state.branch !== plan.branch || state.baseHead !== plan.baseHead) {
    invalid("execution state does not match the plan");
  }
  validateHash(state.executionPlanSha256, "executionPlanSha256");
  if (state.executionPlanSha256 !== sha256(canonicalJson(plan))) invalid("executionPlanSha256 does not match the plan");
  if (state.toolchainPlanSha256 !== plan.toolchainPlanSha256) invalid("state toolchainPlanSha256 does not match the plan");
  if (!Number.isFinite(Date.parse(state.startedAt))) invalid("state.startedAt must be a date-time");
  if (state.worktreeCreated !== (plan.mode === "worktree")) invalid("state.worktreeCreated does not match the mode");
}

function validateOutcome(outcome, state) {
  const keys = ["schema", "status", "invocation", "completedAt", "evidenceReceipts", "notes"];
  assertKeys(outcome, keys, keys, "outcome", "execution target");
  if (outcome.schema !== OUTCOME_SCHEMA) invalid("unsupported execution outcome schema");
  assertEnum(outcome.status, ["complete", "failed"], "outcome.status", "execution target");
  assertKeys(outcome.invocation, ["command", "exitCode"], ["command", "exitCode"], "outcome.invocation", "execution target");
  assertStringArray(outcome.invocation.command, "outcome.invocation.command", "execution target", { min: 1 });
  if (!Number.isInteger(outcome.invocation.exitCode)) invalid("outcome.invocation.exitCode must be an integer");
  if (outcome.status === "complete" && outcome.invocation.exitCode !== 0) invalid("complete outcome requires exit code 0");
  if (outcome.status === "failed" && outcome.invocation.exitCode === 0) invalid("failed outcome requires a non-zero exit code");
  if (!Number.isFinite(Date.parse(outcome.completedAt)) || Date.parse(outcome.completedAt) < Date.parse(state.startedAt)) invalid("outcome.completedAt must follow state.startedAt");
  assertStringArray(outcome.evidenceReceipts, "outcome.evidenceReceipts", "execution target");
  assertStringArray(outcome.notes, "outcome.notes", "execution target");
}

function commonGitDirectory(root) {
  const raw = git(root, "rev-parse", "--git-common-dir").trim();
  return fs.realpathSync(path.resolve(root, raw));
}

function changedFiles(root, baseHead) {
  const commands = [
    ["diff", "--name-only", "--no-renames", "-z", `${baseHead}..HEAD`, "--"],
    ["diff", "--name-only", "--no-renames", "-z", "--"],
    ["diff", "--cached", "--name-only", "--no-renames", "-z", "--"],
    ["ls-files", "--others", "--exclude-standard", "-z", "--"],
  ];
  const files = commands.flatMap((args) => git(root, ...args).split("\0").filter(Boolean));
  for (const file of files) validateScope(file, "changed file");
  return [...new Set(files)].sort();
}

function inScope(file, slices) {
  return slices.some((slice) => slice.scope.some((scope) => scope.endsWith("/") ? file.startsWith(scope) : file === scope));
}

function finalizeExecutionTarget(plan, state, outcome, options = {}) {
  validatePlan(plan, options);
  validateState(state, plan);
  validateOutcome(outcome, state);
  const target = repository(state.executionRoot);
  if (!samePath(commonGitDirectory(state.projectRoot), commonGitDirectory(state.executionRoot))) invalid("execution target is not registered to the project repository");
  const files = changedFiles(state.executionRoot, state.baseHead);
  const outOfScope = files.filter((file) => !inScope(file, plan.slices));
  const dirty = git(state.executionRoot, "status", "--porcelain=v1", "-z", "--untracked-files=all").length > 0;
  const blockers = [];
  if (target.branch !== state.branch) blockers.push("execution branch changed after prepare");
  if (outOfScope.length) blockers.push(`changed files escape declared scope: ${outOfScope.join(", ")}`);
  if (outcome.status === "complete" && !files.length && !outcome.evidenceReceipts.length) blockers.push("complete execution requires changed files or evidence receipts");
  if (outcome.status === "complete" && state.mode === "worktree" && dirty) blockers.push("successful worktree must be clean before removal");
  let status = blockers.length ? "blocked" : outcome.status;
  let cleanup = { action: state.mode === "worktree" ? "retained" : "not-applicable", reason: status };
  if (state.mode === "worktree" && status === "complete") {
    const removed = gitResult(state.projectRoot, ["worktree", "remove", state.executionRoot]);
    if (removed.status === 0) cleanup = { action: "removed", reason: "complete-clean-in-scope" };
    else {
      status = "blocked";
      blockers.push(`worktree cleanup failed: ${String(removed.stderr || removed.stdout).trim() || `exit ${removed.status}`}`);
      cleanup = { action: "retained", reason: "cleanup-failed" };
    }
  }
  return sortValue({
    schema: RECEIPT_SCHEMA,
    id: plan.id,
    status,
    executionPlanSha256: state.executionPlanSha256,
    toolchainPlanSha256: state.toolchainPlanSha256,
    mode: state.mode,
    target: {
      projectRoot: state.projectRoot,
      executionRoot: state.executionRoot,
      branch: state.branch,
      baseHead: state.baseHead,
      finalHead: target.head,
    },
    invocation: outcome.invocation,
    changedFiles: files,
    outOfScope,
    startedAt: state.startedAt,
    completedAt: new Date(outcome.completedAt).toISOString(),
    evidenceReceipts: outcome.evidenceReceipts,
    notes: outcome.notes,
    blockers,
    cleanup,
  });
}

module.exports = {
  OUTCOME_SCHEMA,
  PLAN_SCHEMA,
  RECEIPT_SCHEMA,
  REQUEST_SCHEMA,
  STATE_SCHEMA,
  finalizeExecutionTarget,
  prepareExecutionTarget,
  resolveExecutionTarget,
  validateRequest,
};
