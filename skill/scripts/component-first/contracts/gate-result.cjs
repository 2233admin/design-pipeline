"use strict";

const { sortValue } = require("./pure-utils.cjs");
const { sortReasonCodes } = require("./reason-codes.cjs");
const { createEvidenceRef } = require("./evidence-ref.cjs");

const GATE_STATUSES = Object.freeze(["passed", "blocked", "invalid", "not_evaluated", "not_applicable"]);

function createGateResult(input) {
  if (!input || typeof input.gateId !== "string" || !input.gateId.trim()) throw new Error("gateId is required");
  if (!Number.isInteger(input.gateVersion) || input.gateVersion < 1) throw new Error("gateVersion must be a positive integer");
  if (!GATE_STATUSES.includes(input.status)) throw new Error(`unsupported gate status ${String(input.status)}`);
  const reasonCodes = sortReasonCodes(input.reasonCodes || []);
  if (input.status === "passed" && reasonCodes.length) throw new Error("a passed gate cannot contain reason codes");
  return sortValue({
    gateId: input.gateId,
    gateVersion: input.gateVersion,
    status: input.status,
    reasonCodes,
    findings: Array.isArray(input.findings) ? input.findings : [],
    evidenceRefs: Array.isArray(input.evidenceRefs) ? input.evidenceRefs.map(createEvidenceRef) : [],
    inputDigest: input.inputDigest || null,
    policyDigest: input.policyDigest || null,
  });
}

function notEvaluated(gateId, policyDigest, inputDigest = null) {
  return createGateResult({ gateId, gateVersion: 1, status: "not_evaluated", inputDigest, policyDigest });
}

module.exports = { GATE_STATUSES, createGateResult, notEvaluated };
