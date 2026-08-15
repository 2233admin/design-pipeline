"use strict";

const { isObject } = require("../contracts/pure-utils.cjs");
const { finding, result } = require("./gate-helpers.cjs");

const GATE_ID = "component-first.page-usage";

function sourceIdentity(value) {
  return typeof value === "string" ? value.replaceAll("\\", "/").toLowerCase() : value;
}

function evaluatePageUsageGate(context, policy) {
  const pageUsage = context.pageUsage;
  if (!isObject(pageUsage)) return result(GATE_ID, "invalid", pageUsage, policy, [finding("CF_PAGE_INPUT_INVALID", "pageUsage must be an object")]);
  if (!Array.isArray(pageUsage.routes)) return result(GATE_ID, "invalid", pageUsage, policy, [finding("CF_PAGE_INPUT_INVALID", "pageUsage.routes must be an array")]);
  const findings = [];
  if (!pageUsage.routes.length) findings.push(finding("CF_PAGE_USAGE_MISSING", "page usage evidence is missing"));
  const routeMap = new Map();
  for (const entry of pageUsage.routes) {
    if (!isObject(entry) || typeof entry.route !== "string" || !entry.route.startsWith("/") || !Array.isArray(entry.uses)) {
      return result(GATE_ID, "invalid", pageUsage, policy, [finding("CF_PAGE_INPUT_INVALID", "page route entries require a /route and uses array")]);
    }
    if (routeMap.has(entry.route)) return result(GATE_ID, "invalid", pageUsage, policy, [finding("CF_PAGE_INPUT_INVALID", `duplicate page route ${entry.route}`)]);
    routeMap.set(entry.route, entry);
  }
  for (const route of context.target.routes || []) if (!routeMap.has(route)) findings.push(finding("CF_PAGE_ROUTE_MISSING", `target route ${route} has no page-use evidence`, { route }));
  for (const [route, requiredRoles] of Object.entries(policy.pageRequirements)) {
    const entry = routeMap.get(route);
    if (!entry) {
      if (!(context.target.routes || []).includes(route)) findings.push(finding("CF_PAGE_ROUTE_MISSING", `policy route ${route} has no page-use evidence`, { route }));
      continue;
    }
    for (const role of requiredRoles) if (!entry.uses.some((use) => use.role === role)) findings.push(finding("CF_PAGE_REQUIRED_ROLE_MISSING", `route ${route} does not use required role ${role}`, { route, role }));
  }
  const declarations = Array.isArray(context.components.declarations) ? context.components.declarations : [];
  for (const component of declarations) {
    const sameRole = pageUsage.routes.flatMap(({ route, uses }) => uses.map((use) => ({ route, use }))).filter(({ use }) => use.role === component.role);
    const matches = sameRole.filter(({ use }) => use.symbol === component.symbol && sourceIdentity(use.sourceIdentity) === sourceIdentity(component.sourcePath));
    if (!matches.length) {
      findings.push(finding("CF_PAGE_COMPONENT_IDENTITY_MISMATCH", `component ${component.id || component.role} is not bound to page usage by symbol and source identity`, { component: component.id || null, role: component.role || null }));
      continue;
    }
    if (!matches.some(({ use }) => use.rendered === true)) findings.push(finding("CF_PAGE_COMPONENT_NOT_RENDERED", `component ${component.id || component.role} is imported or declared but not rendered`, { component: component.id || null }));
    if (matches.some(({ use }) => use.hidden === true)) findings.push(finding("CF_PAGE_COMPONENT_HIDDEN", `component ${component.id || component.role} is hidden and cannot satisfy page usage`, { component: component.id || null }));
  }
  const readiness = pageUsage.readiness;
  if (!isObject(readiness) || readiness.level !== "page-ready" || !["prototype", "production"].includes(readiness.scope)) findings.push(finding("CF_PAGE_READINESS_MISSING", "page readiness must declare level page-ready and prototype/production scope"));
  else if (context.target.kind === "production" && readiness.scope !== "production") findings.push(finding("CF_PAGE_READINESS_SCOPE_MISMATCH", "prototype page readiness cannot satisfy a production target", { targetKind: context.target.kind, scope: readiness.scope }));
  const evidenceRefs = pageUsage.routes.flatMap(({ route, uses }) =>
    uses.flatMap((use) =>
      (use.evidenceIds || []).map((id) => ({ id, kind: "page-usage", path: route, sha256: null })),
    ),
  );
  return result(GATE_ID, findings.length ? "blocked" : "passed", { pageUsage, target: context.target, components: declarations }, policy, findings, evidenceRefs);
}

module.exports = { GATE_ID, evaluatePageUsageGate };
