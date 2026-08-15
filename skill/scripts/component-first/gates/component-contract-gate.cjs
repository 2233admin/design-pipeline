"use strict";

const { isObject } = require("../contracts/pure-utils.cjs");
const { finding, result } = require("./gate-helpers.cjs");

const GATE_ID = "component-first.component-contract";

function evidencePresent(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim());
}

function declarationFindings(component, policy) {
  const details = { component: component.id || null, role: component.role || null };
  const findings = [];
  if (!policy.allowedComponentOrigins.includes(component.componentOrigin) || component.runtimeStack === "project-owned") findings.push(finding("CF_COMPONENT_ORIGIN_INVALID", "component origin is invalid or was modeled as a runtime stack", details));
  if (!component.sourcePath || component.source?.exists !== true) findings.push(finding("CF_COMPONENT_SOURCE_MISSING", "component source file is missing", details));
  if (typeof component.symbol !== "string" || !component.symbol.trim()) findings.push(finding("CF_COMPONENT_SYMBOL_MISSING", "component implementation symbol is missing", details));
  if (!isObject(component.contract) || typeof component.contract.id !== "string" || !component.contract.id.trim()) findings.push(finding("CF_COMPONENT_CONTRACT_MISSING", "component contract is missing", details));
  if (component.componentOrigin === "project-owned") {
    if (!evidencePresent(component.tokenEvidence)) findings.push(finding("CF_COMPONENT_TOKEN_EVIDENCE_MISSING", "project-owned component lacks token-use evidence", details));
    if (!evidencePresent(component.keyboardEvidence)) findings.push(finding("CF_COMPONENT_KEYBOARD_EVIDENCE_MISSING", "project-owned component lacks keyboard evidence", details));
    if (!evidencePresent(component.focusEvidence)) findings.push(finding("CF_COMPONENT_FOCUS_EVIDENCE_MISSING", "project-owned component lacks focus evidence", details));
    const missingStates = policy.requiredStates.filter((state) => !evidencePresent(component.stateEvidence?.[state]));
    if (missingStates.length) findings.push(finding("CF_COMPONENT_STATE_EVIDENCE_MISSING", "project-owned component lacks required state evidence", { ...details, missingStates }));
    if (!evidencePresent(component.playgroundEvidence)) findings.push(finding("CF_COMPONENT_PLAYGROUND_EVIDENCE_MISSING", "project-owned component lacks Playground evidence", details));
    if (!evidencePresent(component.pageUsageEvidence)) findings.push(finding("CF_COMPONENT_PAGE_EVIDENCE_MISSING", "project-owned component lacks page-use evidence", details));
  }
  return findings;
}

function evaluateComponentContractGate(context, policy) {
  const components = context.components;
  if (components.status === "invalid") return result(GATE_ID, "invalid", components, policy, [finding("CF_COMPONENT_INPUT_INVALID", components.error || "component input is invalid")]);
  const findings = [];
  if (!components.resolution) findings.push(finding("CF_COMPONENT_RESOLUTION_MISSING", "component capability resolution is missing"));
  else if (components.resolution.status !== "ready") findings.push(finding("CF_COMPONENT_RESOLUTION_BLOCKED", "component capability resolution is blocked", { blockers: components.resolution.blockers || [] }));
  if (!components.verificationReceiptPresent) findings.push(finding("CF_COMPONENT_VERIFICATION_MISSING", "component verification receipt is missing"));
  else if (!components.verification || components.verification.status !== "verified") findings.push(finding("CF_COMPONENT_VERIFICATION_BLOCKED", "component verification is blocked", { missing: components.verification?.missing || [], failed: components.verification?.failed || [] }));
  const declarations = Array.isArray(components.declarations) ? components.declarations : [];
  const requiredRoles = [...policy.baselineComponentRoles, ...policy.additionalComponentRoles];
  for (const role of requiredRoles) if (!declarations.some((component) => component.role === role)) findings.push(finding("CF_COMPONENT_BASELINE_ROLE_MISSING", `required component role ${role} is missing`, { role }));
  for (const component of declarations) findings.push(...declarationFindings(component, policy));
  const invalid = findings.some(({ code }) => ["CF_COMPONENT_INPUT_INVALID", "CF_COMPONENT_ORIGIN_INVALID"].includes(code));
  const evidenceRefs = [
    ...(components.verification?.evidence || []).map((id) => ({ id, kind: "component-verification", path: null, sha256: null })),
    ...declarations.filter(({ sourcePath }) => sourcePath).map(({ id, sourcePath }) => ({ id: `component:${id}`, kind: "component-source", path: sourcePath, sha256: null })),
  ];
  return result(GATE_ID, invalid ? "invalid" : findings.length ? "blocked" : "passed", components, policy, findings, evidenceRefs);
}

module.exports = { GATE_ID, evaluateComponentContractGate };
