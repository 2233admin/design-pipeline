"use strict";

const { assertEnum, assertKeys, assertObject, assertString, assertStringArray, fail } = require("./contract-utils.cjs");

const DIMENSIONS = ["responsive", "accessibility", "palette", "motion", "scene", "component-state", "evidence"];
const OPERATIONS = ["generate", "edit", "repair"];
const CHANNELS = ["stable", "canary", "beta", "experimental"];
const FAIRNESS_CHECKS = ["samePrompts", "sameEnvironmentClass", "evaluatorBlind", "expectedAnswersHidden", "freshContext", "representativeDelivery"];
const V1 = "design-pipeline.benchmark-manifest.v1";
const V2 = "design-pipeline.benchmark-manifest.v2";

function validateScenarios(manifest, version) {
  if (!Array.isArray(manifest.scenarios) || !manifest.scenarios.length) fail("benchmark", "scenarios must not be empty");
  const ids = new Set();
  for (const [index, scenario] of manifest.scenarios.entries()) {
    const label = `scenarios[${index}]`;
    const keys = ["id", "operation", "dimension", "required", "threshold", "evidenceType"];
    const required = version === V2 ? [...keys, "prompt"] : keys;
    const allowed = version === V2 ? [...required, "privateExpectations", "expectedComponents"] : keys;
    assertKeys(scenario, required, allowed, label, "benchmark");
    assertString(scenario.id, `${label}.id`, "benchmark");
    if (ids.has(scenario.id)) fail("benchmark", `duplicate scenario ${scenario.id}`);
    ids.add(scenario.id);
    assertEnum(scenario.operation, OPERATIONS, `${label}.operation`, "benchmark");
    assertEnum(scenario.dimension, DIMENSIONS, `${label}.dimension`, "benchmark");
    if (typeof scenario.required !== "boolean") fail("benchmark", `${label}.required must be boolean`);
    if (typeof scenario.threshold !== "number" || !Number.isFinite(scenario.threshold) || scenario.threshold < 0 || scenario.threshold > 1) fail("benchmark", `${label}.threshold must be 0..1`);
    assertString(scenario.evidenceType, `${label}.evidenceType`, "benchmark");
    if (version === V2) {
      assertString(scenario.prompt, `${label}.prompt`, "benchmark");
      if (!Object.hasOwn(scenario, "privateExpectations") && !Object.hasOwn(scenario, "expectedComponents")) {
        fail("benchmark", `${label} requires privateExpectations or expectedComponents`);
      }
      for (const field of ["privateExpectations", "expectedComponents"]) {
        if (Object.hasOwn(scenario, field)) assertStringArray(scenario[field], `${label}.${field}`, "benchmark", { unique: true, min: 1 });
      }
    }
  }
  for (const dimension of manifest.requiredDimensions) {
    if (!manifest.scenarios.some((scenario) => scenario.required && scenario.dimension === dimension)) fail("benchmark", `required dimension ${dimension} has no required scenario`);
  }
}

function inspectChannels(manifest) {
  const source = manifest.systemChannels !== null && typeof manifest.systemChannels === "object" && !Array.isArray(manifest.systemChannels)
    ? manifest.systemChannels
    : {};
  const missingSystems = manifest.systems.filter((system) => !Object.hasOwn(source, system));
  const extraSystems = Object.keys(source).filter((system) => !manifest.systems.includes(system)).sort();
  const invalidSystems = manifest.systems.filter((system) => Object.hasOwn(source, system) && !CHANNELS.includes(source[system]));
  const systemChannels = Object.fromEntries(manifest.systems
    .filter((system) => Object.hasOwn(source, system))
    .map((system) => [system, typeof source[system] === "string" ? source[system] : String(source[system])]));
  const known = Object.values(systemChannels).filter((channel) => CHANNELS.includes(channel));
  const stablePrereleaseMix = known.includes("stable") && known.some((channel) => channel !== "stable");
  const permissionValid = !Object.hasOwn(manifest, "allowCanaryMix") || typeof manifest.allowCanaryMix === "boolean";
  const allowCanaryMix = manifest.allowCanaryMix === true;
  const invalidReasons = [
    ...(manifest.systemChannels === null || typeof manifest.systemChannels !== "object" || Array.isArray(manifest.systemChannels) ? ["systemChannels must be an object"] : []),
    ...missingSystems.map((system) => `systemChannels is missing ${system}`),
    ...extraSystems.map((system) => `systemChannels has unsupported system ${system}`),
    ...invalidSystems.map((system) => `systemChannels.${system} has invalid channel ${String(source[system])}`),
    ...(!permissionValid ? ["allowCanaryMix must be boolean"] : []),
    ...(stablePrereleaseMix && !allowCanaryMix ? ["stable and prerelease channels require allowCanaryMix=true"] : []),
  ];
  return {
    valid: invalidReasons.length === 0,
    systemChannels,
    missingSystems,
    extraSystems,
    invalidSystems,
    stablePrereleaseMix,
    allowCanaryMix,
    mixPermitted: !stablePrereleaseMix || allowCanaryMix,
    invalidReasons,
  };
}

function validateManifest(manifest, options = {}) {
  assertObject(manifest, "manifest", "benchmark");
  const version = manifest.schema;
  if (![V1, V2].includes(version)) fail("benchmark", "unsupported manifest schema");
  const required = version === V2
    ? ["schema", "id", "candidateSystem", "systems", "systemChannels", "fairness", "requiredDimensions", "scenarios"]
    : ["schema", "id", "requiredDimensions", "scenarios"];
  const allowed = version === V2 ? [...required, "allowCanaryMix"] : required;
  assertKeys(manifest, required, allowed, "manifest", "benchmark");
  assertString(manifest.id, "id", "benchmark");
  assertStringArray(manifest.requiredDimensions, "requiredDimensions", "benchmark", { unique: true, min: 1 });
  for (const dimension of manifest.requiredDimensions) assertEnum(dimension, DIMENSIONS, "requiredDimensions", "benchmark");
  if (version === V2) {
    assertString(manifest.candidateSystem, "candidateSystem", "benchmark");
    assertStringArray(manifest.systems, "systems", "benchmark", { unique: true, min: 2 });
    if (!manifest.systems.includes(manifest.candidateSystem)) fail("benchmark", "candidateSystem must be included in systems");
    const channels = inspectChannels(manifest);
    if (!options.allowInvalidChannels && channels.invalidReasons.length) fail("benchmark", channels.invalidReasons[0]);
    assertKeys(manifest.fairness, FAIRNESS_CHECKS, FAIRNESS_CHECKS, "fairness", "benchmark");
    for (const check of FAIRNESS_CHECKS) {
      if (typeof manifest.fairness[check] !== "boolean") fail("benchmark", `fairness.${check} must be boolean`);
      if (!options.allowUnverifiedFairness && manifest.fairness[check] !== true) fail("benchmark", `fairness.${check} must be true`);
    }
  }
  validateScenarios(manifest, version);
  return manifest;
}

function createDeveloperBrief(manifest) {
  validateManifest(manifest);
  if (manifest.schema !== V2) fail("benchmark", "developer briefs require a v2 manifest");
  return {
    schema: "design-pipeline.benchmark-developer-brief.v1",
    benchmarkId: manifest.id,
    scenarios: manifest.scenarios.map(({ id, operation, dimension, prompt }) => ({ id, operation, dimension, prompt })),
  };
}

function scoreScenarios(manifest, measured) {
  assertObject(measured, "measurements", "benchmark");
  return manifest.scenarios.map((scenario) => {
    const measurement = measured[scenario.id];
    const visible = manifest.schema === V1 ? { ...scenario } : {
      id: scenario.id,
      operation: scenario.operation,
      dimension: scenario.dimension,
      required: scenario.required,
      threshold: scenario.threshold,
      evidenceType: scenario.evidenceType,
    };
    if (!measurement) return { ...visible, status: "unknown", score: null, evidence: [] };
    assertKeys(measurement, ["score", "evidence"], ["score", "evidence"], `measurements.${scenario.id}`, "benchmark");
    if (typeof measurement.score !== "number" || !Number.isFinite(measurement.score) || measurement.score < 0 || measurement.score > 1) fail("benchmark", `measurements.${scenario.id}.score must be 0..1`);
    assertStringArray(measurement.evidence, `measurements.${scenario.id}.evidence`, "benchmark", { min: 1 });
    return { ...visible, status: measurement.score >= scenario.threshold ? "passed" : "failed", score: measurement.score, evidence: measurement.evidence };
  });
}

function summarize(scenarios) {
  const failedRequired = scenarios.filter((scenario) => scenario.required && scenario.status === "failed").map((scenario) => scenario.id);
  const unknownRequired = scenarios.filter((scenario) => scenario.required && scenario.status === "unknown").map((scenario) => scenario.id);
  const scored = scenarios.filter((scenario) => scenario.score !== null);
  const aggregate = scored.length ? scored.reduce((sum, scenario) => sum + scenario.score, 0) / scored.length : null;
  const status = unknownRequired.length ? "blocked" : failedRequired.length ? "failed" : "passed";
  return { status, aggregate, scenarios, failedRequired, unknownRequired };
}

function evaluateV1(manifest, measurements) {
  assertKeys(measurements, ["schema", "benchmarkId", "measurements"], ["schema", "benchmarkId", "measurements"], "measurements", "benchmark");
  if (measurements.schema !== "design-pipeline.benchmark-measurements.v1" || measurements.benchmarkId !== manifest.id) fail("benchmark", "measurement identity mismatch");
  return { schema: "design-pipeline.benchmark-result.v1", benchmarkId: manifest.id, ...summarize(scoreScenarios(manifest, measurements.measurements)) };
}

function evaluateV2(manifest, measurements) {
  const checks = Object.fromEntries(FAIRNESS_CHECKS.map((check) => [check, manifest.fairness[check] === true]));
  const channels = inspectChannels(manifest);
  const invalidReasons = [
    ...FAIRNESS_CHECKS.filter((check) => !checks[check]).map((check) => `fairness.${check} must be true`),
    ...channels.invalidReasons,
  ];
  const { invalidReasons: channelReasons, ...channelChecks } = channels;
  const fairness = { valid: invalidReasons.length === 0, checks, channels: { ...channelChecks, invalidReasons: channelReasons } };
  if (invalidReasons.length) {
    const unknownRequired = manifest.systems.flatMap((system) => manifest.scenarios.filter((scenario) => scenario.required).map((scenario) => `${system}/${scenario.id}`));
    return {
      schema: "design-pipeline.benchmark-result.v2", benchmarkId: manifest.id, candidateSystem: manifest.candidateSystem,
      status: "blocked", aggregate: null, scenarios: [], systems: [], failedRequired: [], unknownRequired, fairness, invalidReasons,
    };
  }

  assertKeys(measurements, ["schema", "benchmarkId", "measurements"], ["schema", "benchmarkId", "measurements"], "measurements", "benchmark");
  if (measurements.schema !== "design-pipeline.benchmark-measurements.v2" || measurements.benchmarkId !== manifest.id) fail("benchmark", "measurement identity mismatch");
  assertObject(measurements.measurements, "measurements.measurements", "benchmark");
  const extraSystems = Object.keys(measurements.measurements).filter((system) => !manifest.systems.includes(system));
  if (extraSystems.length) fail("benchmark", `measurements has unsupported systems: ${extraSystems.join(", ")}`);
  const systems = manifest.systems.map((system) => {
    const summary = summarize(scoreScenarios(manifest, measurements.measurements[system] || {}));
    return { system, channel: manifest.systemChannels[system], ...summary };
  });
  const scenarios = systems.flatMap((result) => result.scenarios.map((scenario) => ({ system: result.system, ...scenario })));
  const failedRequired = systems.flatMap((result) => result.failedRequired.map((id) => `${result.system}/${id}`));
  const unknownRequired = systems.flatMap((result) => result.unknownRequired.map((id) => `${result.system}/${id}`));
  const scored = scenarios.filter((scenario) => scenario.score !== null);
  const aggregate = scored.length ? scored.reduce((sum, scenario) => sum + scenario.score, 0) / scored.length : null;
  const status = unknownRequired.length ? "blocked" : failedRequired.length ? "failed" : "passed";
  return { schema: "design-pipeline.benchmark-result.v2", benchmarkId: manifest.id, candidateSystem: manifest.candidateSystem, status, aggregate, scenarios, systems, failedRequired, unknownRequired, fairness, invalidReasons };
}

function evaluateBenchmark(manifest, measurements) {
  assertObject(manifest, "manifest", "benchmark");
  if (manifest.schema === V2) {
    validateManifest(manifest, { allowUnverifiedFairness: true, allowInvalidChannels: true });
    return evaluateV2(manifest, measurements);
  }
  validateManifest(manifest);
  return evaluateV1(manifest, measurements);
}

module.exports = { CHANNELS, DIMENSIONS, FAIRNESS_CHECKS, OPERATIONS, createDeveloperBrief, evaluateBenchmark, validateManifest };
