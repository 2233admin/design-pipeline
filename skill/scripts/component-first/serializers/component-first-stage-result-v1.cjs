"use strict";

const { sortValue } = require("../contracts/pure-utils.cjs");
const { aggregateResults } = require("../orchestration/aggregate-result.cjs");
const { stageValue } = require("./component-first-gate-v1.cjs");

const STAGE_SCHEMA = "component-first-stage-result.v1";

function serializeComponentFirstStageV1(stage, outcome) {
  const requested = stageValue(outcome.results.at(-1));
  const aggregate = aggregateResults(outcome.dependencyResults || outcome.results);
  return sortValue({
    schema: STAGE_SCHEMA,
    stage,
    status: aggregate.status,
    reasonCodes: aggregate.reasonCodes,
    findings: aggregate.findings,
    evidenceRefs: aggregate.evidenceRefs,
    inputDigest: requested.inputDigest,
    policy: { id: outcome.policy.policyId, version: outcome.policy.version, digest: outcome.policy.digest },
    target: outcome.context.target,
  });
}

module.exports = { STAGE_SCHEMA, serializeComponentFirstStageV1 };
