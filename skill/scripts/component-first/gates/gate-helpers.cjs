"use strict";

const { canonicalJson, sha256 } = require("../contracts/pure-utils.cjs");
const { createGateResult } = require("../contracts/gate-result.cjs");

function finding(code, message, details = {}) {
  return { code, message, details };
}

function result(gateId, status, input, policy, findings = [], evidenceRefs = []) {
  return createGateResult({
    gateId,
    gateVersion: 1,
    status,
    reasonCodes: findings.map(({ code }) => code),
    findings,
    evidenceRefs,
    inputDigest: sha256(canonicalJson(input)),
    policyDigest: policy.digest,
  });
}

module.exports = { finding, result };
