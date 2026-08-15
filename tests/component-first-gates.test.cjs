"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { createEvaluationContext } = require("../skill/scripts/component-first/contracts/evaluation-context.cjs");
const { loadComponentFirstPolicy } = require("../skill/scripts/component-first/policies/policy-loader.cjs");
const { evaluateStackRuntimeGate } = require("../skill/scripts/component-first/gates/stack-runtime-gate.cjs");
const { evaluateComponentContractGate } = require("../skill/scripts/component-first/gates/component-contract-gate.cjs");
const { evaluatePlaygroundGate } = require("../skill/scripts/component-first/gates/playground-gate.cjs");
const { evaluatePageUsageGate } = require("../skill/scripts/component-first/gates/page-usage-gate.cjs");
const { evaluateEvidenceBindingGate } = require("../skill/scripts/component-first/gates/evidence-binding-gate.cjs");
const { runComponentFirst } = require("../skill/scripts/component-first/orchestration/component-first-orchestrator.cjs");

const policy = loadComponentFirstPolicy({
  id: "component-first-default",
  version: 1,
  pageRequirements: { "/dashboard": ["action"] },
});

function declaration(role) {
  return {
    id: `${role}-component`, role, runtimeStack: "react", componentOrigin: "project-owned", sourcePath: `src/${role}.tsx`, symbol: `${role}Component`,
    source: { path: `src/${role}.tsx`, exists: true, contained: true }, contract: { id: `${role}.v1` },
    tokenEvidence: ["token"], keyboardEvidence: ["keyboard"], focusEvidence: ["focus"],
    stateEvidence: { disabled: ["disabled"], loading: ["loading"], error: ["error"] },
    playgroundEvidence: ["playground"], pageUsageEvidence: ["/dashboard"],
  };
}

function passingContext() {
  const declarations = policy.baselineComponentRoles.map(declaration);
  return createEvaluationContext({
    target: { id: "admin-web", root: ".", kind: "production", entrypoints: [], routes: ["/dashboard"], snapshotDigest: null },
    policy,
    stack: { status: "ready", runtime: { runtimeStack: "react", uiLibrary: "react-aria" }, decision: { status: "ready", evidence: [] } },
    components: { status: "ready", resolution: { status: "ready" }, verificationReceiptPresent: true, verification: { status: "verified", evidence: [] }, declarations },
    playground: { status: "ready", kind: "component", artifact: "playground.json", result: { status: "ready", applicable: true } },
    pageUsage: {
      routes: [{ route: "/dashboard", uses: declarations.map((component) => ({ role: component.role, symbol: component.symbol, sourceIdentity: component.sourcePath, rendered: true, hidden: false, evidenceIds: ["dashboard"] })) }],
      readiness: { level: "page-ready", scope: "production" },
    },
    evidence: { status: "ready", errors: [], screenshots: [{ id: "dashboard", path: "dashboard.png", status: "ready", sha256: "a".repeat(64), png: { width: 96, height: 64 } }] },
  });
}

test("each pure gate passes normalized in-memory context without filesystem, browser, or process execution", () => {
  const context = passingContext();
  assert.equal(evaluateStackRuntimeGate(context, policy).status, "passed");
  assert.equal(evaluateComponentContractGate(context, policy).status, "passed");
  assert.equal(evaluatePlaygroundGate(context, policy).status, "passed");
  assert.equal(evaluatePageUsageGate(context, policy).status, "passed");
  assert.equal(evaluateEvidenceBindingGate(context, policy).status, "passed");
});

test("v1 policy is strict, additive, hash-bound, and cannot disable baseline roles", () => {
  const extended = loadComponentFirstPolicy({ id: "component-first-default", version: 1, additionalComponentRoles: ["data-display"], pageRequirements: { "/reports": ["data-display"] } });
  assert.ok(extended.baselineComponentRoles.includes("action"));
  assert.deepEqual(extended.additionalComponentRoles, ["data-display"]);
  assert.match(extended.digest, /^[a-f0-9]{64}$/);
  assert.equal(loadComponentFirstPolicy({ id: extended.policyId, version: extended.version, additionalComponentRoles: extended.additionalComponentRoles, pageRequirements: extended.pageRequirements, digest: extended.digest }).digest, extended.digest);
  assert.throws(() => loadComponentFirstPolicy({ baselineComponentRoles: [] }), /unsupported properties/);
  assert.throws(() => loadComponentFirstPolicy({ pageRequirements: { "/": ["unknown-role"] } }), /unknown role/);
  assert.throws(() => loadComponentFirstPolicy({ digest: "0".repeat(64) }), /digest does not match/);
});

test("pure gates distinguish invalid inputs from valid blocked conformance", () => {
  const context = passingContext();
  context.stack = { status: "invalid", error: "bad request" };
  assert.equal(evaluateStackRuntimeGate(context, policy).status, "invalid");

  const componentContext = passingContext();
  componentContext.components.declarations = componentContext.components.declarations.filter(({ role }) => role !== "overlay");
  const missingRole = evaluateComponentContractGate(componentContext, policy);
  assert.equal(missingRole.status, "blocked");
  assert.ok(missingRole.reasonCodes.includes("CF_COMPONENT_BASELINE_ROLE_MISSING"));

  const owned = passingContext();
  owned.components.declarations[0].keyboardEvidence = [];
  assert.ok(evaluateComponentContractGate(owned, policy).reasonCodes.includes("CF_COMPONENT_KEYBOARD_EVIDENCE_MISSING"));

  const playground = passingContext();
  playground.playground = { status: "missing" };
  assert.deepEqual(evaluatePlaygroundGate(playground, policy).reasonCodes, ["CF_PLAYGROUND_RECEIPT_MISSING"]);

  const page = passingContext();
  page.pageUsage.readiness.scope = "prototype";
  assert.ok(evaluatePageUsageGate(page, policy).reasonCodes.includes("CF_PAGE_READINESS_SCOPE_MISMATCH"));

  const evidence = passingContext();
  evidence.evidence = { status: "invalid", errors: [{ code: "CF_EVIDENCE_PNG_INVALID", message: "bad png" }], screenshots: [] };
  assert.equal(evaluateEvidenceBindingGate(evidence, policy).status, "invalid");
});

function adapterSet(overrides = {}) {
  const context = passingContext();
  return {
    target: () => ({ target: context.target, targetRoot: "." }),
    stack: () => overrides.stack || context.stack,
    components: () => overrides.components || context.components,
    playground: () => overrides.playground || context.playground,
    evidence: () => overrides.evidence || context.evidence,
  };
}

function orchestrationInput() {
  const context = passingContext();
  return {
    schema: "component-first-gate.v1",
    target: context.target,
    policy: { id: "component-first-default", version: 1, pageRequirements: { "/dashboard": ["action"] } },
    stack: {}, components: {}, playground: {}, pageUsage: context.pageUsage, evidence: {},
  };
}

test("orchestrator combines status precedence, stable order, and invalid dependency short-circuit", () => {
  const blocked = runComponentFirst(orchestrationInput(), { projectRoot: ".", adapters: adapterSet({ playground: { status: "missing" } }) });
  assert.equal(blocked.aggregate.status, "blocked");
  assert.deepEqual(blocked.results.map(({ gateId }) => gateId), [
    "component-first.stack-runtime",
    "component-first.component-contract",
    "component-first.playground",
    "component-first.page-usage",
    "component-first.evidence-binding",
  ]);

  const invalidStack = runComponentFirst(orchestrationInput(), { projectRoot: ".", adapters: adapterSet({ stack: { status: "invalid", error: "bad stack" }, playground: { status: "missing" } }) });
  assert.equal(invalidStack.aggregate.status, "invalid");
  assert.equal(invalidStack.results[0].status, "invalid");
  assert.equal(invalidStack.results[1].status, "not_evaluated");
  assert.equal(invalidStack.results[2].status, "blocked");
  assert.equal(invalidStack.results[3].status, "not_evaluated");
  assert.equal(invalidStack.results[4].status, "passed");
});

test("stage orchestration invokes only the requested stage adapters and necessary context", () => {
  const counts = { target: 0, stack: 0, components: 0, playground: 0, evidence: 0 };
  const base = adapterSet();
  const adapters = Object.fromEntries(Object.entries(base).map(([name, adapter]) => [name, (...args) => { counts[name] += 1; return adapter(...args); }]));
  runComponentFirst(orchestrationInput(), { projectRoot: ".", stage: "playground", adapters });
  assert.deepEqual(counts, { target: 1, stack: 0, components: 0, playground: 1, evidence: 0 });

  Object.keys(counts).forEach((key) => { counts[key] = 0; });
  runComponentFirst(orchestrationInput(), { projectRoot: ".", stage: "page", adapters });
  assert.deepEqual(counts, { target: 1, stack: 1, components: 1, playground: 0, evidence: 0 });
});
