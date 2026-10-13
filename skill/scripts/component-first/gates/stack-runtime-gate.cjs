"use strict";

const { finding, result } = require("./gate-helpers.cjs");

const GATE_ID = "component-first.stack-runtime";

function evaluateStackRuntimeGate(context, policy) {
  const stack = context.stack;
  if (stack.status === "invalid") return result(GATE_ID, "invalid", stack, policy, [finding("CF_STACK_INPUT_INVALID", stack.error || "stack input is invalid")]);
  if (stack.status === "missing" || !stack.decision) return result(GATE_ID, "blocked", stack, policy, [finding("CF_STACK_DECISION_MISSING", "frontend stack decision is missing")]);
  const findings = [];
  if (stack.decision.status !== "ready") findings.push(finding("CF_STACK_DECISION_BLOCKED", "frontend stack decision is not ready", { blockers: stack.decision.blockers || [] }));
  if (!stack.runtime || typeof stack.runtime.runtimeStack !== "string" || !stack.runtime.runtimeStack) findings.push(finding("CF_STACK_RUNTIME_UNSUPPORTED", "runtime stack could not be resolved"));
  if (stack.runtime?.uiLibrary === "none") findings.push(finding("CF_STACK_UI_LIBRARY_NONE", "component-first conformance requires a governed UI library or project-owned provider; UI library none cannot pass"));
  const refs = [
    ...(stack.decision.evidence?.map(id => ({ id, kind: "stack", path: null, sha256: null })) || []),
    ...Object.entries(stack.designSystem?.inputHashes || {}).map(([path, sha256]) => ({ id: `design-system:${path}`, kind: "design-system", path, sha256 })),
    ...(stack.designSystem?.entryDigest ? [{ id: "frontend-entry", kind: "frontend-entry", path: null, sha256: stack.designSystem.entryDigest }] : []),
  ];
  return result(GATE_ID, findings.length ? "blocked" : "passed", stack, policy, findings, refs);
}

module.exports = { GATE_ID, evaluateStackRuntimeGate };
