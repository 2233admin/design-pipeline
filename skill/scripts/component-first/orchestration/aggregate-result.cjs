"use strict";

const { sortReasonCodes } = require("../contracts/reason-codes.cjs");

function aggregateStatus(results) {
  if (results.some(({ status }) => status === "invalid")) return "invalid";
  if (results.some(({ status }) => status === "blocked")) return "blocked";
  if (results.some(({ status }) => status === "not_evaluated")) return "blocked";
  return "passed";
}

function aggregateResults(results) {
  return {
    status: aggregateStatus(results),
    reasonCodes: sortReasonCodes(results.flatMap(({ reasonCodes }) => reasonCodes)),
    findings: results.flatMap((gate) => gate.findings.map((entry) => ({ stage: gate.gateId, ...entry }))),
    evidenceRefs: results.flatMap(({ evidenceRefs }) => evidenceRefs),
  };
}

function exitCodeForStatus(status) {
  return status === "passed" ? 0 : status === "blocked" ? 2 : 1;
}

module.exports = { aggregateResults, aggregateStatus, exitCodeForStatus };
