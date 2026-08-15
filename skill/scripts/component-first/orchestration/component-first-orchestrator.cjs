"use strict";

const path = require("node:path");
const { canonicalJson, isObject, sha256 } = require("../../contract-utils.cjs");
const { createEvaluationContext } = require("../contracts/evaluation-context.cjs");
const { createGateResult, notEvaluated } = require("../contracts/gate-result.cjs");
const { loadComponentFirstPolicy } = require("../policies/policy-loader.cjs");
const { resolveTarget } = require("../adapters/target-resolver.cjs");
const { resolveFrontendStackContext } = require("../adapters/frontend-stack-adapter.cjs");
const { resolveComponentCapabilitiesContext } = require("../adapters/component-capability-adapter.cjs");
const { resolvePlaygroundContext } = require("../adapters/playground-adapter.cjs");
const { loadEvidenceContext } = require("../adapters/evidence-loader.cjs");
const { GATE_ID: STACK_GATE, evaluateStackRuntimeGate } = require("../gates/stack-runtime-gate.cjs");
const { GATE_ID: COMPONENT_GATE, evaluateComponentContractGate } = require("../gates/component-contract-gate.cjs");
const { GATE_ID: PLAYGROUND_GATE, evaluatePlaygroundGate } = require("../gates/playground-gate.cjs");
const { GATE_ID: PAGE_GATE, evaluatePageUsageGate } = require("../gates/page-usage-gate.cjs");
const { GATE_ID: EVIDENCE_GATE, evaluateEvidenceBindingGate } = require("../gates/evidence-binding-gate.cjs");
const { aggregateResults } = require("./aggregate-result.cjs");

const STAGES = Object.freeze({
  stack: { gateId: STACK_GATE, needs: ["stack"] },
  components: { gateId: COMPONENT_GATE, needs: ["stack", "components"] },
  playground: { gateId: PLAYGROUND_GATE, needs: ["playground"] },
  page: { gateId: PAGE_GATE, needs: ["stack", "components", "page"] },
  evidence: { gateId: EVIDENCE_GATE, needs: ["evidence"] },
});
const AGGREGATE_ORDER = Object.freeze(["stack", "components", "playground", "page", "evidence"]);
const PUBLIC_STAGES = Object.freeze(["stack", "components", "playground", "page"]);

function invalidResult(stage, code, message, input, policy) {
  return createGateResult({
    gateId: STAGES[stage].gateId,
    gateVersion: 1,
    status: "invalid",
    reasonCodes: [code],
    findings: [{ code, message, details: {} }],
    evidenceRefs: [],
    inputDigest: sha256(canonicalJson(input)),
    policyDigest: policy.digest,
  });
}

function failureOutcome(input, stage, code, message, policy) {
  const selected = stage ? [stage] : AGGREGATE_ORDER;
  const results = selected.map((name, index) => index === 0
    ? invalidResult(name, code, message, input, policy)
    : notEvaluated(STAGES[name].gateId, policy.digest, sha256(canonicalJson(input))));
  const unresolvedTarget = { id: "unresolved-target", root: ".", kind: "prototype", entrypoints: [], routes: [], snapshotDigest: null };
  return { input: isObject(input) ? input : {}, context: createEvaluationContext({ target: unresolvedTarget, policy }), policy, results, aggregate: aggregateResults(results), requestedStage: stage || null };
}

function resolveAdapters(options) {
  return {
    target: options.adapters?.target || resolveTarget,
    stack: options.adapters?.stack || resolveFrontendStackContext,
    components: options.adapters?.components || resolveComponentCapabilitiesContext,
    playground: options.adapters?.playground || resolvePlaygroundContext,
    evidence: options.adapters?.evidence || loadEvidenceContext,
  };
}

function runComponentFirst(input, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const requestedStage = options.stage || null;
  if (requestedStage && !PUBLIC_STAGES.includes(requestedStage)) throw new Error(`unknown component-first stage ${requestedStage}`);
  let fallbackPolicy = loadComponentFirstPolicy({});
  if (!isObject(input) || input.schema !== "component-first-gate.v1") return failureOutcome(input, requestedStage, "CF_INPUT_INVALID", "component-first input must use component-first-gate.v1", fallbackPolicy);
  let policy;
  try { policy = loadComponentFirstPolicy(input.policy || {}); }
  catch (error) { return failureOutcome(input, requestedStage, "CF_POLICY_INVALID", error.message, fallbackPolicy); }
  let targetResolution;
  const adapters = resolveAdapters(options);
  try { targetResolution = adapters.target(projectRoot, input.target); }
  catch (error) { return failureOutcome(input, requestedStage, "CF_TARGET_INVALID", error.message, policy); }

  const selected = requestedStage ? [requestedStage] : AGGREGATE_ORDER;
  const needs = new Set(selected.flatMap((stage) => STAGES[stage].needs));
  const stack = needs.has("stack") ? adapters.stack(input.stack || {}, options.adapterOptions?.stack || {}) : {};
  const components = needs.has("components")
      ? adapters.components(input.components || {}, {
        targetRoot: targetResolution.targetRoot,
        projectRoot,
        framework: stack.runtime?.framework,
        ...(options.adapterOptions?.components || {}),
      })
    : {};
  const playground = needs.has("playground")
    ? adapters.playground(input.playground || {}, { projectRoot, ...(options.adapterOptions?.playground || {}) })
    : {};
  const evidence = needs.has("evidence")
    ? adapters.evidence(input.evidence || {}, { projectRoot, ...policy.evidence, ...(options.adapterOptions?.evidence || {}) })
    : {};
  const context = createEvaluationContext({
    target: targetResolution.target,
    policy,
    stack,
    runtime: stack.runtime || {},
    components,
    playground,
    pageUsage: input.pageUsage,
    evidence,
  });
  const evaluated = new Map();
  const evaluateStack = () => {
    if (!evaluated.has("stack")) evaluated.set("stack", evaluateStackRuntimeGate(context, policy));
    return evaluated.get("stack");
  };
  const evaluateComponents = () => {
    const upstream = evaluateStack();
    if (!evaluated.has("components")) evaluated.set("components", upstream.status === "invalid"
      ? notEvaluated(COMPONENT_GATE, policy.digest, sha256(canonicalJson(context.components)))
      : evaluateComponentContractGate(context, policy));
    return evaluated.get("components");
  };
  const evaluators = {
    stack: evaluateStack,
    components: evaluateComponents,
    playground: () => evaluatePlaygroundGate(context, policy),
    page: () => {
      const stackResult = evaluateStack();
      const componentResult = evaluateComponents();
      return stackResult.status === "invalid" || componentResult.status === "invalid"
        ? notEvaluated(PAGE_GATE, policy.digest, sha256(canonicalJson(context.pageUsage)))
        : evaluatePageUsageGate(context, policy);
    },
    evidence: () => evaluateEvidenceBindingGate(context, policy),
  };
  const results = [];
  for (const stage of selected) {
    if (stage === "components" || stage === "page") {
      if (needs.has("stack")) evaluateStack();
      if (needs.has("components")) evaluateComponents();
    }
    results.push(evaluators[stage]());
  }
  const dependencyResults = requestedStage === "components"
    ? [evaluateStack(), ...results]
    : requestedStage === "page"
      ? [evaluateStack(), evaluateComponents(), ...results]
      : results;
  return { input, context, policy, results, dependencyResults, aggregate: aggregateResults(dependencyResults), requestedStage };
}

module.exports = { AGGREGATE_ORDER, PUBLIC_STAGES, STAGES, runComponentFirst };
