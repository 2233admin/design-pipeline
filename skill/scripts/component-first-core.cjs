"use strict";

const { runComponentFirst } = require("./component-first/orchestration/component-first-orchestrator.cjs");
const { AGGREGATE_SCHEMA, serializeComponentFirstGateV1 } = require("./component-first/serializers/component-first-gate-v1.cjs");
const { STAGE_SCHEMA, serializeComponentFirstStageV1 } = require("./component-first/serializers/component-first-stage-result-v1.cjs");

function checkComponentFirstGate(input, options = {}) {
  return serializeComponentFirstGateV1(runComponentFirst(input, options));
}

function checkComponentFirstStage(stage, input, options = {}) {
  return serializeComponentFirstStageV1(stage, runComponentFirst(input, { ...options, stage }));
}

module.exports = { AGGREGATE_SCHEMA, STAGE_SCHEMA, checkComponentFirstGate, checkComponentFirstStage };
