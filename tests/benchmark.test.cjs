"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { DIMENSIONS, evaluateBenchmark } = require("../skill/scripts/benchmark-core.cjs");

function manifest() {
  return {
    schema: "design-pipeline.benchmark-manifest.v1",
    id: "release-benchmark",
    requiredDimensions: [...DIMENSIONS],
    scenarios: DIMENSIONS.map((dimension, index) => ({ id: `${["generate", "edit", "repair"][index % 3]}-${dimension}`, operation: ["generate", "edit", "repair"][index % 3], dimension, required: true, threshold: 0.8, evidenceType: `${dimension}-receipt` })),
  };
}

function measurements(score = 0.9) {
  const document = { schema: "design-pipeline.benchmark-measurements.v1", benchmarkId: "release-benchmark", measurements: {} };
  for (const scenario of manifest().scenarios) document.measurements[scenario.id] = { score, evidence: [`evidence/${scenario.id}.json`] };
  return document;
}

test("all required quality dimensions and generate/edit/repair operations can pass", () => {
  const result = evaluateBenchmark(manifest(), measurements());
  assert.equal(result.status, "passed");
  assert.ok(Math.abs(result.aggregate - 0.9) < Number.EPSILON * 4);
  assert.deepEqual(new Set(result.scenarios.map((item) => item.operation)), new Set(["generate", "edit", "repair"]));
});

test("a high aggregate cannot hide one required failure", () => {
  const measured = measurements(1);
  measured.measurements["repair-palette"].score = 0.1;
  const result = evaluateBenchmark(manifest(), measured);
  assert.equal(result.status, "failed");
  assert.ok(result.aggregate > 0.8);
  assert.deepEqual(result.failedRequired, ["repair-palette"]);
});

test("missing required evidence is unknown and blocking, never guessed as zero", () => {
  const measured = measurements();
  delete measured.measurements["generate-responsive"];
  const result = evaluateBenchmark(manifest(), measured);
  assert.equal(result.status, "blocked");
  assert.equal(result.scenarios.find((item) => item.id === "generate-responsive").score, null);
  assert.deepEqual(result.unknownRequired, ["generate-responsive"]);
});
