"use strict";

const { canonicalJson, isObject, sha256, sortValue } = require("../contracts/pure-utils.cjs");
const { COMPONENT_FIRST_POLICY_V1 } = require("./component-first-policy-v1.cjs");

const ROLE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function stringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !ROLE.test(item))) throw new Error(`${label} must contain valid role ids`);
  return [...new Set(value)].sort();
}

function loadComponentFirstPolicy(input = {}) {
  if (!isObject(input)) throw new Error("policy must be an object");
  const allowed = new Set(["id", "version", "additionalComponentRoles", "pageRequirements", "digest"]);
  const extras = Object.keys(input).filter((key) => !allowed.has(key));
  if (extras.length) throw new Error(`policy has unsupported properties: ${extras.join(", ")}`);
  if (input.id !== undefined && input.id !== COMPONENT_FIRST_POLICY_V1.policyId) throw new Error(`unsupported policy ${String(input.id)}`);
  if (input.version !== undefined && input.version !== COMPONENT_FIRST_POLICY_V1.version) throw new Error(`unsupported policy version ${String(input.version)}`);
  const additionalComponentRoles = stringArray(input.additionalComponentRoles || [], "additionalComponentRoles");
  const pageRequirements = input.pageRequirements || {};
  if (!isObject(pageRequirements)) throw new Error("pageRequirements must be an object");
  const allowedRoles = new Set([...COMPONENT_FIRST_POLICY_V1.baselineComponentRoles, ...additionalComponentRoles]);
  const normalizedRequirements = {};
  for (const route of Object.keys(pageRequirements).sort()) {
    if (typeof route !== "string" || !route.startsWith("/")) throw new Error(`page requirement route is invalid: ${String(route)}`);
    const roles = stringArray(pageRequirements[route], `pageRequirements.${route}`);
    for (const role of roles) if (!allowedRoles.has(role)) throw new Error(`pageRequirements.${route} references unknown role ${role}`);
    normalizedRequirements[route] = roles;
  }
  const policy = sortValue({
    policyId: COMPONENT_FIRST_POLICY_V1.policyId,
    version: COMPONENT_FIRST_POLICY_V1.version,
    baselineComponentRoles: [...COMPONENT_FIRST_POLICY_V1.baselineComponentRoles],
    additionalComponentRoles,
    pageRequirements: normalizedRequirements,
    allowedComponentOrigins: [...COMPONENT_FIRST_POLICY_V1.allowedComponentOrigins],
    projectOwnedEvidence: [...COMPONENT_FIRST_POLICY_V1.projectOwnedEvidence],
    requiredStates: [...COMPONENT_FIRST_POLICY_V1.requiredStates],
    playground: { ...COMPONENT_FIRST_POLICY_V1.playground },
    evidence: { ...COMPONENT_FIRST_POLICY_V1.evidence },
  });
  const digest = sha256(canonicalJson(policy));
  if (input.digest !== undefined && input.digest !== digest) throw new Error("policy digest does not match the normalized v1 policy");
  return { ...policy, digest };
}

module.exports = { loadComponentFirstPolicy };
