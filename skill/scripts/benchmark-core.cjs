"use strict";

const { assertEnum, assertKeys, assertObject, assertString, assertStringArray, fail } = require("./contract-utils.cjs");

const DIMENSIONS = ["responsive", "accessibility", "palette", "motion", "scene", "component-state", "evidence"];
const OPERATIONS = ["generate", "edit", "repair"];

function validateManifest(manifest) {
  assertKeys(manifest, ["schema", "id", "requiredDimensions", "scenarios"], ["schema", "id", "requiredDimensions", "scenarios"], "manifest", "benchmark");
  if (manifest.schema !== "design-pipeline.benchmark-manifest.v1") fail("benchmark", "unsupported manifest schema");
  assertString(manifest.id, "id", "benchmark");
  assertStringArray(manifest.requiredDimensions, "requiredDimensions", "benchmark", { unique: true, min: 1 });
  for (const dimension of manifest.requiredDimensions) assertEnum(dimension, DIMENSIONS, "requiredDimensions", "benchmark");
  if (!Array.isArray(manifest.scenarios) || !manifest.scenarios.length) fail("benchmark", "scenarios must not be empty");
  const ids = new Set();
  for (const [index, scenario] of manifest.scenarios.entries()) {
    const label = `scenarios[${index}]`;
    const keys = ["id", "operation", "dimension", "required", "threshold", "evidenceType"];
    assertKeys(scenario, keys, keys, label, "benchmark");
    assertString(scenario.id, `${label}.id`, "benchmark");
    if (ids.has(scenario.id)) fail("benchmark", `duplicate scenario ${scenario.id}`);
    ids.add(scenario.id);
    assertEnum(scenario.operation, OPERATIONS, `${label}.operation`, "benchmark");
    assertEnum(scenario.dimension, DIMENSIONS, `${label}.dimension`, "benchmark");
    if (typeof scenario.required !== "boolean") fail("benchmark", `${label}.required must be boolean`);
    if (typeof scenario.threshold !== "number" || !Number.isFinite(scenario.threshold) || scenario.threshold < 0 || scenario.threshold > 1) fail("benchmark", `${label}.threshold must be 0..1`);
    assertString(scenario.evidenceType, `${label}.evidenceType`, "benchmark");
  }
  for (const dimension of manifest.requiredDimensions) if (!manifest.scenarios.some((scenario) => scenario.required && scenario.dimension === dimension)) fail("benchmark", `required dimension ${dimension} has no required scenario`);
  return manifest;
}

function evaluateBenchmark(manifest, measurements) {
  validateManifest(manifest);
  assertKeys(measurements, ["schema", "benchmarkId", "measurements"], ["schema", "benchmarkId", "measurements"], "measurements", "benchmark");
  if (measurements.schema !== "design-pipeline.benchmark-measurements.v1" || measurements.benchmarkId !== manifest.id) fail("benchmark", "measurement identity mismatch");
  assertObject(measurements.measurements, "measurements.measurements", "benchmark");
  const scenarios = manifest.scenarios.map((scenario) => {
    const measured = measurements.measurements[scenario.id];
    if (!measured) return { ...scenario, status: "unknown", score: null, evidence: [] };
    assertKeys(measured, ["score", "evidence"], ["score", "evidence"], `measurements.${scenario.id}`, "benchmark");
    if (typeof measured.score !== "number" || !Number.isFinite(measured.score) || measured.score < 0 || measured.score > 1) fail("benchmark", `measurements.${scenario.id}.score must be 0..1`);
    assertStringArray(measured.evidence, `measurements.${scenario.id}.evidence`, "benchmark", { min: 1 });
    return { ...scenario, status: measured.score >= scenario.threshold ? "passed" : "failed", score: measured.score, evidence: measured.evidence };
  });
  const failedRequired = scenarios.filter((scenario) => scenario.required && scenario.status === "failed").map((scenario) => scenario.id);
  const unknownRequired = scenarios.filter((scenario) => scenario.required && scenario.status === "unknown").map((scenario) => scenario.id);
  const scored = scenarios.filter((scenario) => scenario.score !== null);
  const aggregate = scored.length ? scored.reduce((sum, scenario) => sum + scenario.score, 0) / scored.length : null;
  const status = unknownRequired.length ? "blocked" : failedRequired.length ? "failed" : "passed";
  return { schema: "design-pipeline.benchmark-result.v1", benchmarkId: manifest.id, status, aggregate, scenarios, failedRequired, unknownRequired };
}

module.exports = { DIMENSIONS, OPERATIONS, evaluateBenchmark, validateManifest };
