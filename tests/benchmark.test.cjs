"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { CHANNELS, DIMENSIONS, FAIRNESS_CHECKS, createDeveloperBrief, evaluateBenchmark, validateManifest } = require("../skill/scripts/benchmark-core.cjs");
const manifestSchema = require("../skill/references/benchmark-manifest.schema.json");
const resultSchema = require("../skill/references/benchmark-result.schema.json");

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

function manifestV2() {
  return {
    schema: "design-pipeline.benchmark-manifest.v2",
    id: "fair-benchmark",
    candidateSystem: "Astryx",
    systems: ["Astryx", "custom-comparator"],
    systemChannels: { Astryx: "stable", "custom-comparator": "stable" },
    fairness: Object.fromEntries(FAIRNESS_CHECKS.map((check) => [check, true])),
    requiredDimensions: [...DIMENSIONS],
    scenarios: DIMENSIONS.map((dimension, index) => ({
      id: `${["generate", "edit", "repair"][index % 3]}-${dimension}`,
      operation: ["generate", "edit", "repair"][index % 3],
      dimension,
      required: true,
      threshold: 0.8,
      evidenceType: `${dimension}-receipt`,
      prompt: `Deliver the ${dimension} scenario.`,
      expectedComponents: [`private-${dimension}-answer`],
    })),
  };
}

function measurementsV2(scores = {}) {
  const manifest = manifestV2();
  return {
    schema: "design-pipeline.benchmark-measurements.v2",
    benchmarkId: manifest.id,
    measurements: Object.fromEntries(manifest.systems.map((system) => [
      system,
      Object.fromEntries(manifest.scenarios.map((scenario) => [scenario.id, {
        score: scores[system] ?? 0.9,
        evidence: [`evidence/${system}/${scenario.id}.json`],
      }])),
    ])),
  };
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

test("v1 remains byte-shape compatible", () => {
  const result = evaluateBenchmark(manifest(), measurements());
  assert.deepEqual(Object.keys(result), ["schema", "benchmarkId", "status", "aggregate", "scenarios", "failedRequired", "unknownRequired"]);
  assert.equal(result.schema, "design-pipeline.benchmark-result.v1");
  assert.equal(Object.hasOwn(result, "fairness"), false);
});

test("v2 evaluates Astryx as an ordinary candidate beside a custom system", () => {
  const measured = measurementsV2({ Astryx: 0.81, "custom-comparator": 0.95 });
  const result = evaluateBenchmark(manifestV2(), measured);
  assert.equal(result.status, "passed");
  assert.equal(result.fairness.valid, true);
  assert.equal(result.fairness.channels.valid, true);
  assert.deepEqual(result.invalidReasons, []);
  assert.deepEqual(result.systems.map(({ system, channel, status }) => ({ system, channel, status })), [
    { system: "Astryx", channel: "stable", status: "passed" },
    { system: "custom-comparator", channel: "stable", status: "passed" },
  ]);
  assert.ok(Math.abs(result.systems[0].aggregate - 0.81) < Number.EPSILON * 4);
  assert.ok(Math.abs(result.systems[1].aggregate - 0.95) < Number.EPSILON * 4);
});

test("v2 accepts a private quality expectation with no component names", () => {
  const source = manifestV2();
  const palette = source.scenarios.find((scenario) => scenario.dimension === "palette");
  delete palette.expectedComponents;
  palette.privateExpectations = ["Contrast and semantic color roles meet the stated quality threshold."];
  const result = evaluateBenchmark(source, measurementsV2());
  assert.equal(result.status, "passed");
  assert.equal(result.systems.find(({ system }) => system === "custom-comparator").status, "passed");
});

test("v2 preserves expectedComponents manifests from upstream", () => {
  const source = manifestV2();
  assert.doesNotThrow(() => validateManifest(source));
  assert.equal(evaluateBenchmark(source, measurementsV2()).status, "passed");
});

test("v2 requires at least one non-empty private expectation field", () => {
  const missing = manifestV2();
  delete missing.scenarios[0].expectedComponents;
  assert.throws(() => validateManifest(missing), /requires privateExpectations or expectedComponents/);

  const empty = manifestV2();
  empty.scenarios[0].privateExpectations = [];
  assert.throws(() => validateManifest(empty), /privateExpectations must contain at least 1 item/);
});

test("v2 blocks stable and prerelease mixing by default", () => {
  const source = manifestV2();
  source.systemChannels["custom-comparator"] = "canary";
  const result = evaluateBenchmark(source, measurementsV2());
  assert.equal(result.status, "blocked");
  assert.equal(result.aggregate, null);
  assert.deepEqual(result.systems, []);
  assert.equal(result.fairness.channels.stablePrereleaseMix, true);
  assert.equal(result.fairness.channels.allowCanaryMix, false);
  assert.equal(result.fairness.channels.mixPermitted, false);
  assert.deepEqual(result.invalidReasons, ["stable and prerelease channels require allowCanaryMix=true"]);
  assert.throws(() => validateManifest(source), /require allowCanaryMix=true/);
});

test("v2 permits stable and prerelease mixing only when explicitly allowed", () => {
  const source = manifestV2();
  source.systemChannels["custom-comparator"] = "beta";
  source.allowCanaryMix = true;
  const result = evaluateBenchmark(source, measurementsV2());
  assert.equal(result.status, "passed");
  assert.equal(result.fairness.channels.mixPermitted, true);
  assert.deepEqual(result.systems.map(({ system, channel }) => ({ system, channel })), [
    { system: "Astryx", channel: "stable" },
    { system: "custom-comparator", channel: "beta" },
  ]);
});

test("v2 does not require mix permission when every system is prerelease", () => {
  const source = manifestV2();
  source.systemChannels = { Astryx: "canary", "custom-comparator": "experimental" };
  const result = evaluateBenchmark(source, measurementsV2());
  assert.equal(result.status, "passed");
  assert.equal(result.fairness.channels.stablePrereleaseMix, false);
});

test("v2 channel mapping fails closed on unknown, missing, extra, and malformed inputs", () => {
  const adversarial = [
    [source => { source.systemChannels.Astryx = "preview"; }, /invalid channel preview/, "systemChannels.Astryx has invalid channel preview"],
    [source => { delete source.systemChannels.Astryx; }, /is missing Astryx/, "systemChannels is missing Astryx"],
    [source => { source.systemChannels.unlisted = "stable"; }, /unsupported system unlisted/, "systemChannels has unsupported system unlisted"],
    [source => { source.systemChannels.Astryx = { preview: true }; }, /invalid channel/, "systemChannels.Astryx has invalid channel [object Object]"],
    [source => { source.allowCanaryMix = "true"; }, /allowCanaryMix must be boolean/, "allowCanaryMix must be boolean"],
  ];
  for (const [mutate, error, reason] of adversarial) {
    const source = manifestV2();
    mutate(source);
    assert.throws(() => validateManifest(source), error);
    const result = evaluateBenchmark(source, measurementsV2());
    assert.equal(result.status, "blocked");
    assert.ok(result.invalidReasons.includes(reason));
    assert.equal(result.fairness.channels.valid, false);
    assert.ok(Object.values(result.fairness.channels.systemChannels).every((channel) => typeof channel === "string"));
  }

  const absent = manifestV2();
  delete absent.systemChannels;
  assert.throws(() => evaluateBenchmark(absent, measurementsV2()), /manifest is missing systemChannels/);
});

test("v2 schemas require channel mapping, constrain channels, and record channel checks", () => {
  const v2Manifest = manifestSchema.oneOf.find((schema) => schema.properties.schema.const.endsWith("v2"));
  const v2Result = resultSchema.oneOf.find((schema) => schema.properties.schema.const.endsWith("v2"));
  assert.ok(v2Manifest.required.includes("systemChannels"));
  assert.deepEqual(v2Manifest.properties.systemChannels.additionalProperties.enum, CHANNELS);
  assert.equal(v2Manifest.properties.allowCanaryMix.type, "boolean");
  assert.ok(v2Result.properties.fairness.required.includes("channels"));
  assert.ok(v2Result.properties.systems.items.required.includes("channel"));
});

for (const check of FAIRNESS_CHECKS) {
  test(`v2 fails closed when fairness.${check} is not verified`, () => {
    const unfair = manifestV2();
    unfair.fairness[check] = false;
    assert.throws(() => validateManifest(unfair), new RegExp(`fairness\\.${check} must be true`));
    const result = evaluateBenchmark(unfair, measurementsV2());
    assert.equal(result.status, "blocked");
    assert.equal(result.aggregate, null);
    assert.equal(result.fairness.valid, false);
    assert.deepEqual(result.invalidReasons, [`fairness.${check} must be true`]);
    assert.equal(result.unknownRequired.length, DIMENSIONS.length * unfair.systems.length);
    assert.deepEqual(result.systems, []);
  });
}

test("developer brief and v2 result never expose either private expectation field", () => {
  const source = manifestV2();
  source.scenarios[0].privateExpectations = ["private-quality-answer"];
  const brief = createDeveloperBrief(source);
  const result = evaluateBenchmark(source, measurementsV2());
  for (const output of [brief, result]) {
    const serialized = JSON.stringify(output);
    assert.doesNotMatch(serialized, /privateExpectations/);
    assert.doesNotMatch(serialized, /expectedComponents/);
    assert.doesNotMatch(serialized, /private-quality-answer/);
    assert.doesNotMatch(serialized, /private-responsive-answer/);
  }
  assert.deepEqual(brief.scenarios.map((scenario) => scenario.prompt), source.scenarios.map((scenario) => scenario.prompt));
});

test("v2 output is deterministic for identical inputs", () => {
  const source = manifestV2();
  const measured = measurementsV2();
  assert.equal(JSON.stringify(evaluateBenchmark(source, measured)), JSON.stringify(evaluateBenchmark(source, measured)));
  assert.equal(JSON.stringify(createDeveloperBrief(source)), JSON.stringify(createDeveloperBrief(source)));
});
