"use strict";

const { assertObject, assertString, fail, isObject } = require("./contract-utils.cjs");

const STATE_COVERAGE_SCHEMA = "design-pipeline.interaction-state-matrix.v1";
const APPLICABLE_STATES = ["loading", "empty", "partial", "error", "offline", "permission-denied", "disabled", "overflow", "long-content", "responsive-collapse", "focus", "pressed", "reduced-motion"];

function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }
function normalizeState(state) { return String(state).replaceAll("_", "-"); }

function stateDeclarations(entry) {
  const raw = entry.states ?? entry.coverage;
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((state) => [normalizeState(state), { applicable: true, covered: false }]));
  if (!isObject(raw)) fail("state coverage", "entry.states must be an array or object");
  const declarations = {};
  for (const [state, value] of Object.entries(raw)) {
    const key = normalizeState(state);
    if (isObject(value)) declarations[key] = { ...value, applicable: value.applicable !== false, covered: value.covered === true };
    else declarations[key] = { applicable: value === true, covered: false };
  }
  if (isObject(entry.applicability)) for (const [state, value] of Object.entries(entry.applicability)) {
    const key = normalizeState(state);
    declarations[key] = { ...(declarations[key] || {}), applicable: value === true || (isObject(value) && value.applicable === true), reason: isObject(value) ? value.reason : undefined };
  }
  return declarations;
}

function hasEvidence(value) {
  if (Array.isArray(value)) return value.some(nonEmpty);
  return nonEmpty(value);
}

function checkInteractionStateCoverage(matrix) {
  assertObject(matrix, "matrix", "state coverage");
  if (!Array.isArray(matrix.entries) || matrix.entries.length === 0) fail("state coverage", "entries must not be empty");
  const blockers = [];
  const checked = [];
  matrix.entries.forEach((entry, index) => {
    assertObject(entry, `entries[${index}]`, "state coverage");
    const label = entry.id || entry.interaction || entry.component || `entries[${index}]`;
    const declarations = stateDeclarations(entry);
    const defaultState = declarations.default;
    if (!defaultState || defaultState.applicable === false || defaultState.covered !== true || !hasEvidence(defaultState.evidence)) {
      blockers.push({ code: "DEFAULT_STATE_MISSING", entry: label, message: `${label} must cover default state with evidence` });
    }
    const applicableNonDefault = APPLICABLE_STATES.filter((state) => declarations[state]?.applicable === true);
    if (!applicableNonDefault.length) {
      blockers.push({ code: "NON_DEFAULT_STATE_MISSING", entry: label, message: `${label} needs at least one applicable non-default state` });
    }
    for (const state of APPLICABLE_STATES) {
      const declaration = declarations[state];
      if (!declaration) {
        blockers.push({ code: "STATE_APPLICABILITY_MISSING", entry: label, state, message: `${label} must explicitly declare whether ${state} applies` });
      } else if (declaration.applicable === false) {
        if (!nonEmpty(declaration.reason)) blockers.push({ code: "INAPPLICABLE_REASON_MISSING", entry: label, state, message: `${label} must explain why ${state} does not apply` });
      } else if (declaration.covered !== true || !hasEvidence(declaration.evidence)) {
        blockers.push({ code: "STATE_EVIDENCE_MISSING", entry: label, state, message: `${label} is missing ${state} evidence` });
      }
    }
    const inputs = Array.isArray(entry.inputs) ? entry.inputs : [];
    if (!inputs.some(nonEmpty)) blockers.push({ code: "INPUT_COVERAGE_MISSING", entry: label, message: `${label} needs at least one input path` });
    const viewports = Array.isArray(entry.viewports) ? entry.viewports : [];
    for (const viewport of ["mobile", "desktop"]) if (!viewports.includes(viewport)) blockers.push({ code: "VIEWPORT_COVERAGE_MISSING", entry: label, viewport, message: `${label} is missing ${viewport} viewport coverage` });
    const interactive = entry.interactive !== false && !["decorative", "static"].includes(entry.kind);
    if (interactive && inputs.includes("keyboard")) {
      for (const state of ["focus", "pressed"]) if (declarations[state]?.applicable !== true || declarations[state]?.covered === false) blockers.push({ code: "KEYBOARD_STATE_MISSING", entry: label, state, message: `${label} keyboard interaction requires ${state} coverage` });
    }
    const reducedMotion = entry.reducedMotion ?? entry.reduced_motion;
    if (interactive && (!nonEmpty(reducedMotion) || /^(?:none|missing|unknown)$/i.test(reducedMotion))) blockers.push({ code: "REDUCED_MOTION_MISSING", entry: label, message: `${label} must declare reduced-motion behavior` });
    checked.push({ entry: label, applicableStates: applicableNonDefault });
  });
  return blockers.length ? { status: "blocked", blockers, checked } : { status: "passed", checked };
}


module.exports = {
  APPLICABLE_STATES,
  STATE_COVERAGE_SCHEMA,
  checkInteractionStateCoverage,
};
