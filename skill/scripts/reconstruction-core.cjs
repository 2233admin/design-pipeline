"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  readJson,
  resolveInside,
  sha256,
} = require("./contract-utils.cjs");
const {
  EXACT_EVIDENCE_CAPABILITIES,
  LANDMARK_REGIONS,
  MODES,
  SCHEMA,
  STAGES,
  validateEvidenceReceipt,
  validateReconstruction,
} = require("./reconstruction-contract.cjs");

function landmarkMeasurements(reconstruction) {
  const errors = reconstruction.landmarks.points.map((landmark) => ({
    id: landmark.id,
    errorPx: Math.hypot(
      landmark.source.x - landmark.render.x,
      landmark.source.y - landmark.render.y,
    ),
  }));
  const sum = errors.reduce((total, entry) => total + entry.errorPx, 0);
  return {
    count: errors.length,
    regionCount: new Set(
      reconstruction.landmarks.points.map((landmark) => landmark.region),
    ).size,
    meanErrorPx: sum / errors.length,
    maxPointErrorPx: Math.max(...errors.map((entry) => entry.errorPx)),
    points: errors,
  };
}

function missingArtifacts(root, artifacts) {
  const missing = [];
  for (const artifact of artifacts) {
    const file = resolveInside(root, artifact, artifact, { scope: "reconstruction" });
    if (!fs.existsSync(file)) missing.push(artifact);
  }
  return missing;
}

function geometryResult(root, reconstruction) {
  const measurements = landmarkMeasurements(reconstruction);
  const blockers = missingArtifacts(root, [
    reconstruction.rectification.artifact,
    reconstruction.rectification.frontElevation,
    reconstruction.camera.calibrationArtifact,
    reconstruction.landmarks.overlayArtifact,
  ]).map((artifact) => `missing reconstruction evidence: ${artifact}`);
  if (reconstruction.geometryGate.approval.status !== "approved") {
    blockers.push(
      `geometry approval status is ${reconstruction.geometryGate.approval.status}`,
    );
  }
  const mismatches = [];
  if (
    measurements.meanErrorPx
    > reconstruction.landmarks.thresholds.maxMeanErrorPx
  ) {
    mismatches.push(
      `mean landmark error ${measurements.meanErrorPx.toFixed(3)}px exceeds `
      + `${reconstruction.landmarks.thresholds.maxMeanErrorPx}px`,
    );
  }
  if (
    measurements.maxPointErrorPx
    > reconstruction.landmarks.thresholds.maxPointErrorPx
  ) {
    mismatches.push(
      `max landmark error ${measurements.maxPointErrorPx.toFixed(3)}px exceeds `
      + `${reconstruction.landmarks.thresholds.maxPointErrorPx}px`,
    );
  }
  const status = blockers.length
    ? "blocked"
    : mismatches.length
      ? "fidelity-limited"
      : "ready";
  return { status, blockers, mismatches, measurements };
}

function finalResult(root, reconstruction, geometry) {
  if (geometry.status !== "ready") return geometry;
  const comparison = reconstruction.finalComparison;
  const blockers = [];
  const mismatches = [];
  if (comparison.status !== "measured") {
    blockers.push(`final comparison status is ${comparison.status}`);
  }
  if (comparison.approval.status !== "approved") {
    blockers.push(`final comparison approval status is ${comparison.approval.status}`);
  }
  if (comparison.evidencePort.status !== "ready") {
    blockers.push(`EvidencePort status is ${comparison.evidencePort.status}`);
  }
  if (comparison.evidencePort.lastProbe.ok !== true) {
    blockers.push("EvidencePort has no successful capability probe");
  }
  for (const artifact of missingArtifacts(root, [
    comparison.referenceRender,
    comparison.implementationRender,
    comparison.diffArtifact,
    comparison.evidencePort.receiptArtifact,
    ...comparison.intentionalMasks,
  ])) {
    blockers.push(`missing final comparison evidence: ${artifact}`);
  }
  const receiptFile = resolveInside(
    root,
    comparison.evidencePort.receiptArtifact,
    "EvidencePort receipt",
    { scope: "reconstruction" },
  );
  if (fs.existsSync(receiptFile) && comparison.metrics) {
    const receipt = validateEvidenceReceipt(
      readJson(receiptFile, "reconstruction evidence receipt"),
      comparison,
      reconstruction.camera.renderViewport,
    );
    const bindings = [
      ["reference render", comparison.referenceRender, receipt.referenceSha256],
      [
        "implementation render",
        comparison.implementationRender,
        receipt.implementationSha256,
      ],
      ["diff render", comparison.diffArtifact, receipt.diffSha256],
    ];
    for (const [label, relative, expected] of bindings) {
      const file = resolveInside(root, relative, label, { scope: "reconstruction" });
      if (fs.existsSync(file) && sha256(fs.readFileSync(file)) !== expected) {
        blockers.push(`${label} hash does not match the EvidencePort receipt`);
      }
    }
  }
  if (comparison.metrics) {
    if (
      comparison.metrics.pixelDifferenceRatio
      > comparison.thresholds.maxPixelDifferenceRatio
    ) {
      mismatches.push(
        `pixel difference ratio ${comparison.metrics.pixelDifferenceRatio} exceeds `
        + comparison.thresholds.maxPixelDifferenceRatio,
      );
    }
    if (comparison.metrics.ssim < comparison.thresholds.minSsim) {
      mismatches.push(
        `SSIM ${comparison.metrics.ssim} is below ${comparison.thresholds.minSsim}`,
      );
    }
  } else {
    blockers.push("final comparison metrics are not measured");
  }
  const status = blockers.length
    ? "blocked"
    : mismatches.length
      ? "fidelity-limited"
      : "ready";
  return {
    status,
    blockers,
    mismatches,
    measurements: geometry.measurements,
    finalMeasurements: comparison.metrics,
  };
}

function checkReconstruction(changeRoot, options = {}) {
  const stage = options.stage || "geometry";
  assertEnum(stage, STAGES, "stage", "reconstruction");
  const root = fs.realpathSync(path.resolve(changeRoot));
  const artifact = resolveInside(
    root,
    options.artifact || "reconstruction.json",
    "reconstruction artifact",
    { scope: "reconstruction", mustExist: true },
  );
  const reconstruction = validateReconstruction(readJson(artifact, "reconstruction"));
  const geometry = geometryResult(root, reconstruction);
  const result = stage === "geometry"
    ? geometry
    : finalResult(root, reconstruction, geometry);
  return {
    ...result,
    stage,
    artifact,
    reconstruction,
  };
}

module.exports = {
  EXACT_EVIDENCE_CAPABILITIES,
  LANDMARK_REGIONS,
  MODES,
  SCHEMA,
  STAGES,
  checkReconstruction,
  landmarkMeasurements,
  validateReconstruction,
};
