"use strict";

const { assertEnum, assertKeys, assertObject, assertString, assertStringArray, fail } = require("./contract-utils.cjs");
const { projectJudgment } = require("./judgment-core.cjs");
const { evaluateFidelityThresholds, measureFidelity } = require("./fidelity-metrics-core.cjs");

const DIMENSIONS = ["responsive", "accessibility", "palette", "motion", "scene", "component-state", "evidence"];
const V3_DIMENSIONS = [...DIMENSIONS, "visual-quality", "reference-fidelity"];
const JUDGED_DIMENSIONS = ["visual-taste", "ux-clarity", "responsiveness", "motion-quality"];
const PURPOSES = ["fidelity", "design-quality", "combined"];
const OPERATIONS = ["generate", "edit", "repair"];
const CHANNELS = ["stable", "canary", "beta", "experimental"];
const FAIRNESS_CHECKS = ["samePrompts", "sameEnvironmentClass", "evaluatorBlind", "expectedAnswersHidden", "freshContext", "representativeDelivery"];
const V1 = "design-pipeline.benchmark-manifest.v1";
const V2 = "design-pipeline.benchmark-manifest.v2";
const V3 = "design-pipeline.benchmark-manifest.v3";
const DIGEST = /^sha256:[a-f0-9]{64}$/;

function assertDigest(value, label) {
  assertString(value, label, "benchmark");
  if (!DIGEST.test(value)) fail("benchmark", `${label} must be a sha256 digest`);
}

const BARE_HASH = /^[a-f0-9]{64}$/;

function assertBareHash(value, label) {
  assertString(value, label, "benchmark");
  if (!BARE_HASH.test(value)) fail("benchmark", `${label} must be a bare 64-character sha256 hash`);
}

function assertUnitNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) fail("benchmark", `${label} must be 0..1`);
}

function modelIdentity(system) {
  const at = system.lastIndexOf("@");
  return at > 0 ? system.slice(0, at) : null;
}

function validateScenarios(manifest, version) {
  if (!Array.isArray(manifest.scenarios) || !manifest.scenarios.length) fail("benchmark", "scenarios must not be empty");
  const prompted = version === V2 || version === V3;
  const dimensions = version === V3 ? V3_DIMENSIONS : DIMENSIONS;
  const ids = new Set();
  for (const [index, scenario] of manifest.scenarios.entries()) {
    const label = `scenarios[${index}]`;
    const keys = ["id", "operation", "dimension", "required", "threshold", "evidenceType"];
    const required = prompted ? [...keys, "prompt"] : keys;
    const allowed = prompted ? [...required, "privateExpectations", "expectedComponents"] : keys;
    assertKeys(scenario, required, allowed, label, "benchmark");
    assertString(scenario.id, `${label}.id`, "benchmark");
    if (ids.has(scenario.id)) fail("benchmark", `duplicate scenario ${scenario.id}`);
    ids.add(scenario.id);
    assertEnum(scenario.operation, OPERATIONS, `${label}.operation`, "benchmark");
    assertEnum(scenario.dimension, dimensions, `${label}.dimension`, "benchmark");
    if (typeof scenario.required !== "boolean") fail("benchmark", `${label}.required must be boolean`);
    assertUnitNumber(scenario.threshold, `${label}.threshold`);
    if (version === V3 && scenario.dimension === "visual-quality" && scenario.threshold <= 0.5) {
      fail("benchmark", `${label}.threshold must exceed 0.5 for visual-quality; parity is not lift`);
    }
    assertString(scenario.evidenceType, `${label}.evidenceType`, "benchmark");
    if (prompted) {
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

function validateJudgmentPolicy(policy) {
  const keys = ["rubricId", "rubricPath", "rubricDigest", "judgeId", "judgedDimensions", "bothOrders", "humanSpotCheckFraction", "minHumanAgreement", "referenceSetId", "referenceSetPath", "referenceSetDigest", "binding"];
  assertKeys(policy, keys, keys, "judgmentPolicy", "benchmark");
  assertString(policy.rubricId, "judgmentPolicy.rubricId", "benchmark");
  // Paths, not just digests: the projector recomputes each document's digest from its bytes, so a
  // declared digest that matches nothing on disk cannot pass.
  assertString(policy.rubricPath, "judgmentPolicy.rubricPath", "benchmark");
  assertString(policy.referenceSetPath, "judgmentPolicy.referenceSetPath", "benchmark");
  // The binding must be complete: an empty object would let any plan lineage through.
  assertObject(policy.binding, "judgmentPolicy.binding", "benchmark");
  const bindingKeys = ["targetIdentityDigest", "snapshotDigest", "policyDigest"];
  assertKeys(policy.binding, bindingKeys, bindingKeys, "judgmentPolicy.binding", "benchmark");
  assertBareHash(policy.binding.targetIdentityDigest, "judgmentPolicy.binding.targetIdentityDigest");
  assertDigest(policy.binding.snapshotDigest, "judgmentPolicy.binding.snapshotDigest");
  assertBareHash(policy.binding.policyDigest, "judgmentPolicy.binding.policyDigest");
  assertDigest(policy.rubricDigest, "judgmentPolicy.rubricDigest");
  assertString(policy.judgeId, "judgmentPolicy.judgeId", "benchmark");
  assertStringArray(policy.judgedDimensions, "judgmentPolicy.judgedDimensions", "benchmark", { unique: true, min: 1 });
  for (const dimension of policy.judgedDimensions) {
    if (!JUDGED_DIMENSIONS.includes(dimension)) {
      fail("benchmark", `judgmentPolicy.judgedDimensions cannot include ${dimension}; it is settled by a hard gate, not rendered evidence`);
    }
  }
  if (policy.bothOrders !== true) fail("benchmark", "judgmentPolicy.bothOrders must be true");
  assertUnitNumber(policy.humanSpotCheckFraction, "judgmentPolicy.humanSpotCheckFraction");
  if (policy.humanSpotCheckFraction <= 0) fail("benchmark", "judgmentPolicy.humanSpotCheckFraction must exceed 0");
  assertUnitNumber(policy.minHumanAgreement, "judgmentPolicy.minHumanAgreement");
  assertString(policy.referenceSetId, "judgmentPolicy.referenceSetId", "benchmark");
  assertDigest(policy.referenceSetDigest, "judgmentPolicy.referenceSetDigest");
}

// Metrics this adapter actually computes. Naming anything else would promise a measurement the
// projector cannot take.
const COMPUTED_METRICS = ["pixelDifferenceRatio", "ssim"];

function validateMetricPolicy(policy) {
  const keys = ["adapterId", "metrics", "thresholds", "references", "maxExtraElementRate"];
  assertKeys(policy, keys, keys, "metricPolicy", "benchmark");
  assertString(policy.adapterId, "metricPolicy.adapterId", "benchmark");
  assertStringArray(policy.metrics, "metricPolicy.metrics", "benchmark", { unique: true, min: 1 });
  for (const metric of policy.metrics) {
    if (!COMPUTED_METRICS.includes(metric)) fail("benchmark", `metricPolicy.metrics names ${metric}, which this adapter does not compute`);
  }
  // Thresholds live in the manifest policy, never in the submitted measurement, so a run cannot
  // pick lax limits for itself.
  const thresholdKeys = ["maxPixelDifferenceRatio", "minSsim"];
  assertKeys(policy.thresholds, thresholdKeys, thresholdKeys, "metricPolicy.thresholds", "benchmark");
  assertUnitNumber(policy.thresholds.maxPixelDifferenceRatio, "metricPolicy.thresholds.maxPixelDifferenceRatio");
  assertUnitNumber(policy.thresholds.minSsim, "metricPolicy.thresholds.minSsim");
  // The adapter measures exact reconstruction only, and the authoritative reconstruction contract
  // caps that mode at 0.03 / 0.97 (reconstruction-fidelity-contract.cjs:92-101). Accepting looser
  // limits here would weaken an existing gate rather than add a new one.
  if (policy.thresholds.maxPixelDifferenceRatio > 0.03) fail("benchmark", "metricPolicy.thresholds.maxPixelDifferenceRatio cannot exceed 0.03 for exact reconstruction");
  if (policy.thresholds.minSsim < 0.97) fail("benchmark", "metricPolicy.thresholds.minSsim cannot be lower than 0.97 for exact reconstruction");
  assertUnitNumber(policy.maxExtraElementRate, "metricPolicy.maxExtraElementRate");
}

// Each reference-fidelity scenario names its authorized reference artifact in the manifest, so a
// submission cannot supply its own "reference" bytes or viewport.
function validateMetricReferences(manifest) {
  const references = manifest.metricPolicy.references;
  assertObject(references, "metricPolicy.references", "benchmark");
  const expected = manifest.scenarios.filter((scenario) => scenario.dimension === "reference-fidelity").map((scenario) => scenario.id).sort();
  const declared = Object.keys(references).sort();
  if (declared.join(",") !== expected.join(",")) {
    fail("benchmark", `metricPolicy.references must name exactly the reference-fidelity scenarios ${expected.join(", ") || "(none)"}`);
  }
  for (const id of expected) {
    const entry = references[id];
    const entryKeys = ["path", "sha256", "viewport"];
    assertKeys(entry, entryKeys, entryKeys, `metricPolicy.references.${id}`, "benchmark");
    assertString(entry.path, `metricPolicy.references.${id}.path`, "benchmark");
    assertBareHash(entry.sha256, `metricPolicy.references.${id}.sha256`);
    const viewportKeys = ["width", "height"];
    assertKeys(entry.viewport, viewportKeys, viewportKeys, `metricPolicy.references.${id}.viewport`, "benchmark");
    for (const key of viewportKeys) {
      if (!Number.isInteger(entry.viewport[key]) || entry.viewport[key] <= 0) fail("benchmark", `metricPolicy.references.${id}.viewport.${key} must be a positive integer`);
    }
  }
}

function validatePurpose(manifest) {
  assertEnum(manifest.benchmarkPurpose, PURPOSES, "benchmarkPurpose", "benchmark");
  const has = (dimension) => manifest.scenarios.some((scenario) => scenario.dimension === dimension);
  const needsFidelity = manifest.benchmarkPurpose !== "design-quality";
  const needsQuality = manifest.benchmarkPurpose !== "fidelity";
  if (needsFidelity && !has("reference-fidelity")) fail("benchmark", `benchmarkPurpose ${manifest.benchmarkPurpose} requires a reference-fidelity scenario`);
  if (needsQuality && !has("visual-quality")) fail("benchmark", `benchmarkPurpose ${manifest.benchmarkPurpose} requires a visual-quality scenario`);
  if (has("visual-quality") && !Object.hasOwn(manifest, "judgmentPolicy")) fail("benchmark", "judgmentPolicy is required when a visual-quality scenario exists");
  if (has("reference-fidelity") && !Object.hasOwn(manifest, "metricPolicy")) fail("benchmark", "metricPolicy is required when a reference-fidelity scenario exists");
  if (Object.hasOwn(manifest, "judgmentPolicy")) validateJudgmentPolicy(manifest.judgmentPolicy);
  if (Object.hasOwn(manifest, "metricPolicy")) {
    validateMetricPolicy(manifest.metricPolicy);
    validateMetricReferences(manifest);
  }
}

function validateAblationAxis(manifest) {
  // Exactly two arms: an ablation is candidate versus comparator. Three systems would validate
  // here and then fail at projection, which requires a two-label blinded comparison.
  if (manifest.systems.length !== 2) fail("benchmark", `an ablation manifest binds exactly two arms; found ${manifest.systems.length}`);
  const identities = new Set();
  for (const system of manifest.systems) {
    const identity = modelIdentity(system);
    if (!identity) fail("benchmark", `systems entry ${system} must be shaped <model>@<arm>`);
    identities.add(identity);
  }
  if (identities.size !== 1) {
    fail("benchmark", `systems must bind one model identity; found ${[...identities].sort().join(", ")}. Cross-model comparison uses one manifest per model`);
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
  if (![V1, V2, V3].includes(version)) fail("benchmark", "unsupported manifest schema");
  const comparative = version === V2 || version === V3;
  const base = comparative
    ? ["schema", "id", "candidateSystem", "systems", "systemChannels", "fairness", "requiredDimensions", "scenarios"]
    : ["schema", "id", "requiredDimensions", "scenarios"];
  const required = version === V3 ? [...base, "benchmarkPurpose"] : base;
  const allowed = version === V3
    ? [...required, "allowCanaryMix", "judgmentPolicy", "metricPolicy"]
    : comparative ? [...required, "allowCanaryMix"] : required;
  assertKeys(manifest, required, allowed, "manifest", "benchmark");
  assertString(manifest.id, "id", "benchmark");
  assertStringArray(manifest.requiredDimensions, "requiredDimensions", "benchmark", { unique: true, min: 1 });
  const dimensions = version === V3 ? V3_DIMENSIONS : DIMENSIONS;
  for (const dimension of manifest.requiredDimensions) assertEnum(dimension, dimensions, "requiredDimensions", "benchmark");
  if (comparative) {
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
  if (version === V3) validateAblationAxis(manifest);
  validateScenarios(manifest, version);
  if (version === V3) validatePurpose(manifest);
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

function evaluateV3(manifest, measurements, projectRoot) {
  const checks = Object.fromEntries(FAIRNESS_CHECKS.map((check) => [check, manifest.fairness[check] === true]));
  const channels = inspectChannels(manifest);
  const invalidReasons = [
    ...FAIRNESS_CHECKS.filter((check) => !checks[check]).map((check) => `fairness.${check} must be true`),
    ...channels.invalidReasons,
  ];
  const { invalidReasons: channelReasons, ...channelChecks } = channels;
  const fairness = { valid: invalidReasons.length === 0, checks, channels: { ...channelChecks, invalidReasons: channelReasons } };
  const base = {
    schema: "design-pipeline.benchmark-result.v3",
    benchmarkId: manifest.id,
    benchmarkPurpose: manifest.benchmarkPurpose,
    candidateSystem: manifest.candidateSystem,
  };
  if (invalidReasons.length) {
    const unknownRequired = manifest.scenarios.filter((scenario) => scenario.required).map((scenario) => `${manifest.candidateSystem}/${scenario.id}`);
    return {
      ...base, status: "blocked", aggregate: null, aggregates: {}, scenarios: [], systems: [], reportOnlySystems: [],
      failedRequired: [], unknownRequired, incompleteComparators: [], measurementEvidence: {}, fairness, invalidReasons,
    };
  }

  // A raw `{score, evidence}` for a measured dimension would let a caller hand-write 0.7 and skip
  // the rubric, blinding, calibration, or the actual pixel measurement. v3 therefore takes
  // judgment and fidelity inputs as paths and projects both itself.
  const keys = ["schema", "benchmarkId", "measurements", "judgments", "fidelity"];
  assertKeys(measurements, keys, keys, "measurements", "benchmark");
  if (measurements.schema !== "design-pipeline.benchmark-measurements.v3" || measurements.benchmarkId !== manifest.id) fail("benchmark", "measurement identity mismatch");
  assertObject(measurements.measurements, "measurements.measurements", "benchmark");
  assertObject(measurements.judgments, "measurements.judgments", "benchmark");
  assertObject(measurements.fidelity, "measurements.fidelity", "benchmark");
  const extraSystems = Object.keys(measurements.measurements).filter((system) => !manifest.systems.includes(system));
  if (extraSystems.length) fail("benchmark", `measurements has unsupported systems: ${extraSystems.join(", ")}`);

  const measuredDimensions = { "visual-quality": "verified judgment receipt", "reference-fidelity": "measured fidelity receipt" };
  for (const scenario of manifest.scenarios) {
    const source = measuredDimensions[scenario.dimension];
    if (!source) continue;
    for (const [system, rows] of Object.entries(measurements.measurements)) {
      if (Object.hasOwn(rows, scenario.id)) {
        fail("benchmark", `${scenario.dimension} scenario ${scenario.id} cannot take a raw score for ${system}; it is projected from a ${source}`, { code: "MEASUREMENT_BYPASS_REJECTED" });
      }
    }
  }

  const judged = manifest.scenarios.filter((scenario) => scenario.dimension === "visual-quality");
  const projected = Object.fromEntries(manifest.systems.map((system) => [system, { ...(measurements.measurements[system] || {}) }]));
  const judgments = {};
  for (const scenario of judged) {
    const input = measurements.judgments[scenario.id];
    if (!input) continue;
    if (Object.hasOwn(input, "projectRoot")) {
      fail("benchmark", `measurements.judgments.${scenario.id} must not carry projectRoot; containment is owned by the caller`, { code: "MEASUREMENT_ROOT_REJECTED" });
    }
    const projection = projectJudgment({
      ...input,
      projectRoot,
      scenario,
      policy: manifest.judgmentPolicy,
      benchmarkId: manifest.id,
      systems: manifest.systems,
      candidateSystem: manifest.candidateSystem,
    });
    judgments[scenario.id] = { status: projection.status, calibration: projection.calibration, tally: projection.tally, planHash: projection.planHash };
    for (const [system, row] of Object.entries(projection.measurements)) projected[system][scenario.id] = row;
  }

  // Layer A: each arm's own render is measured against the shared reference artifact, and the
  // projected score is the measured SSIM. The declared thresholds are evaluated against computed
  // values, so a fidelity claim cannot be typed in.
  const fidelity = {};
  for (const scenario of manifest.scenarios.filter((entry) => entry.dimension === "reference-fidelity")) {
    const input = measurements.fidelity[scenario.id];
    if (!input) continue;
    assertObject(input, `measurements.fidelity.${scenario.id}`, "benchmark");
    assertObject(input.arms, `measurements.fidelity.${scenario.id}.arms`, "benchmark");
    if (Object.hasOwn(input, "projectRoot")) {
      fail("benchmark", `measurements.fidelity.${scenario.id} must not carry projectRoot; containment is owned by the caller`, { code: "MEASUREMENT_ROOT_REJECTED" });
    }
    // The reference is authorized by the manifest, not chosen by the submission: otherwise both
    // arms could be compared against a blank self-authored "reference" and pass.
    const authorized = manifest.metricPolicy.references[scenario.id];
    if (!authorized) fail("benchmark", `metricPolicy.references has no authorized reference for ${scenario.id}`, { code: "FIDELITY_REFERENCE_UNAUTHORIZED" });
    const perArm = {};
    for (const system of manifest.systems) {
      const arm = input.arms[system];
      if (!arm) continue;
      const measured = measureFidelity({
        projectRoot,
        referencePath: authorized.path,
        implementationPath: arm.implementationPath,
        diffPath: arm.diffPath,
        mode: input.mode,
        scenarioId: scenario.id,
        dimension: scenario.dimension,
      });
      if (measured.receipt.referenceSha256 !== authorized.sha256) {
        fail("benchmark", `the reference measured for ${scenario.id} is not the authorized reference artifact`, { code: "FIDELITY_REFERENCE_UNAUTHORIZED" });
      }
      if (measured.receipt.viewport.width !== authorized.viewport.width || measured.receipt.viewport.height !== authorized.viewport.height) {
        fail("benchmark", `the renders measured for ${scenario.id} are not at the locked viewport`, { code: "FIDELITY_VIEWPORT_MISMATCH" });
      }
      // Thresholds come from the validated manifest policy, never from the submitted input, so a
      // run cannot choose lax limits for itself.
      const verdict = evaluateFidelityThresholds(measured.receipt, manifest.metricPolicy.thresholds);
      // The whole receipt is retained: file paths are not lineage, and the reference,
      // implementation, and diff hashes plus the viewport are what make the score re-derivable.
      perArm[system] = { status: verdict.status, reasons: verdict.reasons, receipt: measured.receipt, measurement: measured.measurement };
      // SSIM stays the continuous score, but it cannot erase the second hard metric: a render can
      // clear the SSIM threshold while exceeding the pixel-difference cap. A gate failure forces
      // the score to 0 so the scenario fails instead of passing on one metric.
      const score = verdict.status === "ready" ? measured.receipt.metrics.ssim : 0;
      projected[system][scenario.id] = { score, evidence: [arm.implementationPath, authorized.path] };
    }
    fidelity[scenario.id] = perArm;
  }
  measurements = { ...measurements, measurements: projected };

  const dimensions = [...new Set(manifest.scenarios.map((scenario) => scenario.dimension))].sort();
  const dimensionAggregates = (scored) => Object.fromEntries(dimensions.map((dimension) => {
    const rows = scored.filter((scenario) => scenario.dimension === dimension && scenario.score !== null);
    return [dimension, rows.length ? rows.reduce((sum, scenario) => sum + scenario.score, 0) / rows.length : null];
  }));

  const reportOnlySystems = manifest.systems.filter((system) => system !== manifest.candidateSystem);
  const systems = manifest.systems.map((system) => {
    const summary = summarize(scoreScenarios(manifest, measurements.measurements[system] || {}));
    // A single mean across a similarity score, a lift win rate, and a hard-gate score is a
    // meaningless number, so it is only exposed when exactly one dimension was measured.
    const aggregates = dimensionAggregates(summary.scenarios);
    const measured = dimensions.filter((dimension) => aggregates[dimension] !== null);
    return {
      system, channel: manifest.systemChannels[system], reportOnly: system !== manifest.candidateSystem,
      ...summary, aggregate: measured.length === 1 ? aggregates[measured[0]] : null, aggregates,
    };
  });
  const candidate = systems.find((result) => result.system === manifest.candidateSystem);
  const scenarios = systems.flatMap((result) => result.scenarios.map((scenario) => ({ system: result.system, reportOnly: result.reportOnly, ...scenario })));

  const incompleteComparators = manifest.scenarios
    .filter((scenario) => scenario.required)
    .filter((scenario) => systems.some((result) => result.reportOnly && result.scenarios.some((scored) => scored.id === scenario.id && scored.status === "unknown")))
    .map((scenario) => `${manifest.candidateSystem}/${scenario.id}`);

  const failedRequired = candidate.failedRequired.map((id) => `${candidate.system}/${id}`);
  const candidateUnknown = candidate.unknownRequired.map((id) => `${candidate.system}/${id}`);
  const unknownRequired = [...new Set([...candidateUnknown, ...incompleteComparators])].sort();
  const status = unknownRequired.length ? "blocked" : failedRequired.length ? "failed" : "passed";

  // Aggregates were computed per dimension per system above; the candidate's are reused here.
  const aggregates = candidate.aggregates;
  const aggregate = candidate.aggregate;

  // Evidence stays what the v2 measurement contract guarantees: caller-declared paths. Calling it
  // a verified receipt digest would overstate what was checked.
  const measurementEvidence = Object.fromEntries(candidate.scenarios
    .filter((scenario) => Array.isArray(scenario.evidence) && scenario.evidence.length)
    .map((scenario) => [`${candidate.system}/${scenario.id}`, scenario.evidence]));

  return { ...base, status, aggregate, aggregates, scenarios, systems, reportOnlySystems, failedRequired, unknownRequired, incompleteComparators, judgments, fidelity, measurementEvidence, fairness, invalidReasons };
}

function evaluateBenchmark(manifest, measurements, options = {}) {
  assertObject(manifest, "manifest", "benchmark");
  if (manifest.schema === V3) {
    validateManifest(manifest, { allowUnverifiedFairness: true, allowInvalidChannels: true });
    // The root is supplied by the caller that owns containment, never by the submitted
    // measurement. A submitted root could name a drive root and read outside the project.
    assertString(options.projectRoot, "options.projectRoot", "benchmark");
    return evaluateV3(manifest, measurements, options.projectRoot);
  }
  if (manifest.schema === V2) {
    validateManifest(manifest, { allowUnverifiedFairness: true, allowInvalidChannels: true });
    return evaluateV2(manifest, measurements);
  }
  validateManifest(manifest);
  return evaluateV1(manifest, measurements);
}

module.exports = { CHANNELS, DIMENSIONS, FAIRNESS_CHECKS, JUDGED_DIMENSIONS, OPERATIONS, PURPOSES, V3_DIMENSIONS, createDeveloperBrief, evaluateBenchmark, validateManifest };
