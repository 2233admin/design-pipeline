"use strict";

const path = require("node:path");
const {
  assertEnum,
  assertObject,
  assertString,
  canonicalJson,
  fail,
  isObject,
  readJson,
  sha256,
} = require("./contract-utils.cjs");

const PLAN_SCHEMA = "design-pipeline.design-plan.v1";
const CONTROL_REGISTRY = "design-pipeline.control.v1";
const DEFAULT_REGISTRY_FILE = path.join(__dirname, "../references/pipeline-phases.json");
const MODES = ["greenfield", "rebuild", "clone"];
const FIDELITIES = ["exact", "adaptive"];

function hashText(value) { return `sha256:${sha256(value)}`; }

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || null;
}

function normalizeIntentManifest(manifest) {
  assertObject(manifest, "manifest", "design plan");
  const target = isObject(manifest.target) ? manifest.target : {};
  const intent = isObject(manifest.intent) ? manifest.intent : {};
  const normalized = {
    targetPlatform: firstString(manifest.targetPlatform, manifest.platform, target.platform),
    primaryTask: firstString(manifest.primaryTask, manifest.task, intent.primaryTask),
    targetScreen: firstString(manifest.targetScreen, manifest.screen, target.screen),
    mode: firstString(manifest.mode) || "greenfield",
    fidelity: firstString(manifest.fidelity) || "adaptive",
    brandPreference: firstString(manifest.brandPreference, manifest.brand, manifest.designLanguage),
  };
  assertEnum(normalized.mode, MODES, "mode", "design plan");
  assertEnum(normalized.fidelity, FIDELITIES, "fidelity", "design plan");
  const assumptions = [];
  if (!normalized.brandPreference) {
    assumptions.push({ field: "brandPreference", value: "unspecified", reason: "No brand preference was provided by the manifest" });
  }
  return { normalized, assumptions };
}

function loadControlPhaseRegistry(registryFile = DEFAULT_REGISTRY_FILE) {
  const registry = readJson(registryFile, "phase registry");
  const selected = registry.registries?.[CONTROL_REGISTRY];
  if (!selected || !Array.isArray(selected.phases)) fail("design plan", `missing ${CONTROL_REGISTRY} registry`, { code: "CONTROL_REGISTRY_MISSING" });
  const seen = new Set();
  const phases = selected.phases.map((phase, index) => {
    assertObject(phase, `phases[${index}]`, "design plan");
    for (const key of ["id", "depends_on", "inputs", "outputs", "gates", "invalidates"]) {
      if (!Object.hasOwn(phase, key)) fail("design plan", `phases[${index}] is missing ${key}`);
    }
    assertString(phase.id, `phases[${index}].id`, "design plan");
    if (seen.has(phase.id)) fail("design plan", `duplicate phase ${phase.id}`);
    seen.add(phase.id);
    for (const key of ["depends_on", "inputs", "outputs", "gates", "invalidates"]) {
      if (!Array.isArray(phase[key]) || !phase[key].every((value) => typeof value === "string" && value.trim())) {
        fail("design plan", `phases[${index}].${key} must contain non-empty strings`);
      }
    }
    return {
      id: phase.id,
      depends_on: [...phase.depends_on],
      inputs: [...phase.inputs],
      outputs: [...phase.outputs],
      gates: [...phase.gates],
      invalidates: [...phase.invalidates],
    };
  });
  for (const phase of phases) for (const dependency of phase.depends_on) {
    if (!seen.has(dependency)) fail("design plan", `phase ${phase.id} depends on unknown phase ${dependency}`);
  }
  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(phases.map((phase) => [phase.id, phase]));
  function visit(id) {
    if (visiting.has(id)) fail("design plan", `phase dependency cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).depends_on) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const phase of phases) visit(phase.id);
  return { schema: registry.schema, registryId: CONTROL_REGISTRY, phases };
}

function validatePlan(plan) {
  assertObject(plan, "plan", "design plan");
  for (const key of ["schema", "schema_version", "plan_id", "input_hash", "mode", "fidelity", "phases"]) {
    if (!Object.hasOwn(plan, key)) fail("design plan", `plan is missing ${key}`);
  }
  if (plan.schema !== PLAN_SCHEMA) fail("design plan", `schema must be ${PLAN_SCHEMA}`);
  if (plan.schema_version !== 1) fail("design plan", "schema_version must be 1");
  assertString(plan.plan_id, "plan_id", "design plan");
  if (!/^sha256:[a-f0-9]{64}$/i.test(plan.input_hash)) fail("design plan", "input_hash must be sha256");
  assertEnum(plan.mode, MODES, "mode", "design plan");
  assertEnum(plan.fidelity, FIDELITIES, "fidelity", "design plan");
  if (!Array.isArray(plan.phases) || plan.phases.length === 0) fail("design plan", "phases must not be empty");
  const seen = new Set();
  for (const [index, phase] of plan.phases.entries()) {
    assertObject(phase, `phases[${index}]`, "design plan");
    for (const key of ["id", "depends_on", "inputs", "outputs", "gates"]) if (!Object.hasOwn(phase, key)) fail("design plan", `phases[${index}] is missing ${key}`);
    assertString(phase.id, `phases[${index}].id`, "design plan");
    if (seen.has(phase.id)) fail("design plan", `duplicate phase ${phase.id}`);
    seen.add(phase.id);
    for (const key of ["depends_on", "inputs", "outputs", "gates"]) {
      if (!Array.isArray(phase[key]) || !phase[key].every((value) => typeof value === "string" && value.trim())) fail("design plan", `phases[${index}].${key} must contain non-empty strings`);
    }
    if (phase.invalidates !== undefined && (!Array.isArray(phase.invalidates) || !phase.invalidates.every((value) => typeof value === "string" && value.trim()))) {
      fail("design plan", `phases[${index}].invalidates must contain non-empty strings`);
    }
  }
  const byId = new Map(plan.phases.map((phase) => [phase.id, phase]));
  for (const phase of plan.phases) {
    for (const dependency of phase.depends_on) {
      if (!seen.has(dependency)) fail("design plan", `phase ${phase.id} depends on unknown phase ${dependency}`);
      if (plan.phases.findIndex((candidate) => candidate.id === dependency) >= plan.phases.findIndex((candidate) => candidate.id === phase.id)) {
        fail("design plan", `phase ${phase.id} must follow dependency ${dependency}`);
      }
    }
    for (const invalidated of phase.invalidates || []) if (!seen.has(invalidated)) fail("design plan", `phase ${phase.id} invalidates unknown phase ${invalidated}`);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail("design plan", `phase dependency cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).depends_on) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const phase of plan.phases) visit(phase.id);
  return plan;
}

function compileDesignPlan(manifest, options = {}) {
  const { normalized, assumptions } = normalizeIntentManifest(manifest);
  const missing = ["targetPlatform", "primaryTask", "targetScreen"].filter((field) => !normalized[field]);
  const registry = loadControlPhaseRegistry(options.registryFile || DEFAULT_REGISTRY_FILE);
  const input = { manifest: normalized, registry: registry.phases };
  const inputHash = hashText(canonicalJson(input));
  if (missing.length) {
    return {
      schema: PLAN_SCHEMA,
      schema_version: 1,
      status: "blocked",
      runnable: false,
      input_hash: inputHash,
      mode: normalized.mode,
      fidelity: normalized.fidelity,
      assumptions,
      blockers: missing.map((field) => ({ code: "REQUIRED_FIELD_MISSING", field, message: `${field} is required` })),
      next_actions: missing.map((field) => `Provide manifest.${field}`),
    };
  }
  const plan = {
    schema: PLAN_SCHEMA,
    schema_version: 1,
    plan_id: `dpp-${sha256(inputHash).slice(0, 20)}`,
    input_hash: inputHash,
    mode: normalized.mode,
    fidelity: normalized.fidelity,
    assumptions,
    manifest: normalized,
    registry: registry.registryId,
    phases: registry.phases,
    status: "ready",
    runnable: true,
  };
  validatePlan(plan);
  return plan;
}


module.exports = {
  CONTROL_REGISTRY,
  FIDELITIES,
  MODES,
  PLAN_SCHEMA,
  compileDesignPlan,
  loadControlPhaseRegistry,
  normalizeIntentManifest,
  validatePlan,
};
