"use strict";

const { sortValue } = require("../contracts/pure-utils.cjs");
const { aggregateResults } = require("../orchestration/aggregate-result.cjs");
const { AGGREGATE_ORDER } = require("../orchestration/component-first-orchestrator.cjs");

const AGGREGATE_SCHEMA = "component-first-gate.v1";
const GATE_TO_STAGE = new Map([
  ["component-first.stack-runtime", "stack"],
  ["component-first.component-contract", "components"],
  ["component-first.playground", "playground"],
  ["component-first.page-usage", "page"],
  ["component-first.evidence-binding", "evidence"],
]);

function stageValue(result) {
  return sortValue({
    stage: GATE_TO_STAGE.get(result.gateId),
    status: result.status,
    reasonCodes: result.reasonCodes,
    findings: result.findings,
    evidenceRefs: result.evidenceRefs,
    inputDigest: result.inputDigest,
    policyDigest: result.policyDigest,
  });
}

function dedupeEvidence(refs) {
  const seen = new Set();
  return refs.filter((ref) => {
    const key = JSON.stringify(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function serializeComponentFirstGateV1(outcome) {
  const aggregate = aggregateResults(outcome.results);
  const stages = outcome.results.map(stageValue).sort((left, right) => AGGREGATE_ORDER.indexOf(left.stage) - AGGREGATE_ORDER.indexOf(right.stage));
  const candidateReadiness = outcome.context.pageUsage?.readiness;
  const readiness = candidateReadiness?.level === "page-ready" && ["prototype", "production"].includes(candidateReadiness.scope)
    ? { level: candidateReadiness.level, scope: candidateReadiness.scope }
    : null;
  return sortValue({
    schema: AGGREGATE_SCHEMA,
    status: aggregate.status,
    reasonCodes: aggregate.reasonCodes,
    findings: aggregate.findings,
    evidenceRefs: dedupeEvidence(aggregate.evidenceRefs),
    target: outcome.context.target,
    policy: {
      id: outcome.policy.policyId,
      version: outcome.policy.version,
      additionalComponentRoles: outcome.policy.additionalComponentRoles,
      pageRequirements: outcome.policy.pageRequirements,
      digest: outcome.policy.digest,
    },
    stack: outcome.input.stack || {},
    components: outcome.input.components || {},
    playground: outcome.input.playground || {},
    pageUsage: outcome.input.pageUsage || {},
    evidence: outcome.input.evidence || {},
    readiness,
    stages,
  });
}

module.exports = { AGGREGATE_SCHEMA, GATE_TO_STAGE, serializeComponentFirstGateV1, stageValue };
