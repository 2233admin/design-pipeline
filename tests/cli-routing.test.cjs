"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const references = path.join(repoRoot, "skill/references");
const { resolveFrontendStack } = require("../skill/scripts/frontend-stack-core.cjs");
const { decomposeCapabilities } = require("../skill/scripts/design-system-catalog-core.cjs");
const { resolveExecutionTarget } = require("../skill/scripts/execution-target-core.cjs");
const { routePrismRequest } = require("../skill/scripts/prism-system-core.cjs");

const registry = JSON.parse(fs.readFileSync(path.join(references, "frontend-stack-registry.json"), "utf8"));
const skills = JSON.parse(fs.readFileSync(path.join(references, "mengto-skills-catalog.json"), "utf8"));

function run(args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--root", repoRoot, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return { ...child, output: JSON.parse(child.stdout) };
}

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test("拒绝未消费的位置参数", () => {
  assert.equal(run(["doctor", "garbage"]).output.error.code, "UNKNOWN_ARGUMENT");
  assert.equal(run(["doctor", "garbage", "extra"]).output.error.code, "UNKNOWN_ARGUMENT");
  assert.equal(run(["status", "garbage"]).output.error.code, "UNKNOWN_ARGUMENT");
  assert.equal(run(["component", "decompose", "--query", "table", "garbage"]).output.error.code, "UNKNOWN_ARGUMENT");
});

test("中英文输入进入一致的 Prism 路由", () => {
  assert.equal(routePrismRequest({ query: "检查这个界面的可访问性和对比度" }).route, "ui-craft");
  assert.equal(routePrismRequest({ query: "review this frame for accessibility and contrast" }).route, "ui-craft");
  assert.equal(routePrismRequest({ query: "做一个响应式后台原型" }).route, "prototype");
  assert.equal(routePrismRequest({ query: "设计一个新体验流程" }).route, "new-experience");
});

test("同分路由必须澄清而不是静默 ready", () => {
  const result = routePrismRequest({ query: "new prototype dashboard" });
  assert.equal(result.status, "needs-clarification");
  assert.equal(result.route, null);
  assert.equal(result.ambiguous, true);
  assert.ok(result.candidates.filter(({ score }) => score === 1).length >= 2);
});

test("中文能力分解保留表格、筛选、分页和状态能力", () => {
  const result = decomposeCapabilities("带筛选、排序、分页的后台数据表格，以及支持键盘导航、错误态和空状态的弹窗表单", { allowPartialWords: false });
  for (const capability of ["data-table", "search", "pagination", "navigation", "dialog", "text-input", "error-state", "empty-state"]) {
    assert.ok(result.includes(capability), capability);
  }
});

test("主路由优先具体能力来源，用户上下文保持有限且可审计", () => {
  const result = resolveFrontendStack({
    schema: "design-pipeline.frontend-stack-request.v1",
    framework: "react",
    brief: "clone this website and reverse engineer the reference",
    requested: { styling: "none", uiLibrary: "none" },
    context: {
      schema: "design-pipeline.adaptation-policy-input.v1",
      task: [{ id: "questions", dimension: "question-sequencing", value: "one-at-a-time" }],
      constraints: [{ id: "accessibility" }],
      gates: [],
    },
  }, registry, skills);
  assert.equal(result.primaryRoute.id, "design-pipeline/website-cloning");
  assert.equal(result.routingContext.rules[0].dimension, "question-sequencing");
  assert.equal(result.routingContext.rules[0].layer, "task");
  assert.equal(result.routingContext.constraints[0].id, "accessibility");
});

test("执行 owner 必须绑定工具链主路由", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "routing-owner-"));
  try {
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "pipeline@example.test");
    git(root, "config", "user.name", "Design Pipeline Test");
    fs.writeFileSync(path.join(root, "README.md"), "# fixture\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "fixture");
    const toolchainPlan = {
      schema: "design-pipeline.toolchain-plan.v1",
      status: "ready",
      primaryRouteId: "design-pipeline/core",
    };
    const request = {
      schema: "design-pipeline.execution-request.v1",
      id: "bound-route",
      toolchainPlanSha256: require("../skill/scripts/contract-utils.cjs").sha256(require("../skill/scripts/contract-utils.cjs").canonicalJson(toolchainPlan)),
      preferredMode: "auto",
      isolation: "optional",
      routeId: "design-pipeline/core",
      slices: [{ id: "ui", owner: "design-pipeline/core", scope: ["README.md"] }],
    };
    assert.equal(resolveExecutionTarget(request, { projectRoot: root, toolchainPlan }).status, "ready");
    assert.throws(() => resolveExecutionTarget({ ...request, routeId: "other-route" }, { projectRoot: root, toolchainPlan }), /primary route/);
    assert.throws(() => resolveExecutionTarget({ ...request, slices: [{ id: "ui", owner: "other-route", scope: ["README.md"] }] }, { projectRoot: root, toolchainPlan }), /slice owner/);
    assert.throws(() => resolveExecutionTarget({ ...request, routeId: undefined }, { projectRoot: root, toolchainPlan }), /routeId is required/);
    assert.throws(() => resolveExecutionTarget(request, { projectRoot: root }), /requires a toolchain plan/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
