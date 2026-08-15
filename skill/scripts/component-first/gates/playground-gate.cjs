"use strict";

const { finding, result } = require("./gate-helpers.cjs");

const GATE_ID = "component-first.playground";

function evaluatePlaygroundGate(context, policy) {
  const playground = context.playground;
  if (playground.status === "invalid") return result(GATE_ID, "invalid", playground, policy, [finding("CF_PLAYGROUND_INPUT_INVALID", playground.error || "Playground input is invalid")]);
  if (playground.status === "missing") return result(GATE_ID, "blocked", playground, policy, [finding("CF_PLAYGROUND_RECEIPT_MISSING", "component Playground receipt is missing")]);
  const findings = [];
  if (playground.result?.applicable === false && policy.playground.required) findings.push(finding("CF_PLAYGROUND_WAIVER_NOT_ALLOWED", "component-first policy does not allow the Playground receipt to be waived"));
  if (playground.kind !== policy.playground.kind) findings.push(finding("CF_PLAYGROUND_PROFILE_MISMATCH", `Playground kind must be ${policy.playground.kind}`, { actual: playground.kind }));
  if (playground.result?.status !== "ready") findings.push(finding("CF_PLAYGROUND_RECEIPT_BLOCKED", "component Playground receipt is blocked", { reasons: playground.result?.reasons || [], blockers: playground.result?.blockers || [] }));
  const evidenceRefs = playground.artifact ? [{ id: "component-playground", kind: "playground-receipt", path: playground.artifact, sha256: null }] : [];
  return result(GATE_ID, findings.length ? "blocked" : "passed", playground, policy, findings, evidenceRefs);
}

module.exports = { GATE_ID, evaluatePlaygroundGate };
