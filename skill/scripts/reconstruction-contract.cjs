"use strict";

const {
  assertEnum,
  assertKeys,
  assertString,
  fail,
} = require("./contract-utils.cjs");
const {
  EXACT_EVIDENCE_CAPABILITIES,
  validateEvidenceReceipt,
  validateFinalComparison,
} = require("./reconstruction-fidelity-contract.cjs");

const SCHEMA = "design-pipeline.reconstruction.v1";
const MODES = ["exact-reconstruction", "adaptive-reconstruction"];
const STAGES = ["geometry", "final"];
const LANDMARK_REGIONS = ["top-left", "top-right", "center", "bottom-left", "bottom-right"];

function assertFiniteNumber(value, label, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("reconstruction", `${label} must be a finite number`);
  }
  if (options.minimum !== undefined && value < options.minimum) {
    fail("reconstruction", `${label} must be at least ${options.minimum}`);
  }
  if (options.maximum !== undefined && value > options.maximum) {
    fail("reconstruction", `${label} must be at most ${options.maximum}`);
  }
}

function assertPositiveInteger(value, label, minimum = 1) {
  if (!Number.isInteger(value) || value < minimum) {
    fail("reconstruction", `${label} must be an integer of at least ${minimum}`);
  }
}

function validateViewport(value, label) {
  assertKeys(value, ["width", "height"], ["width", "height"], label, "reconstruction");
  assertPositiveInteger(value.width, `${label}.width`);
  assertPositiveInteger(value.height, `${label}.height`);
}

function validatePoint(value, label, viewport) {
  assertKeys(value, ["x", "y"], ["x", "y"], label, "reconstruction");
  assertFiniteNumber(value.x, `${label}.x`, { minimum: 0, maximum: viewport.width });
  assertFiniteNumber(value.y, `${label}.y`, { minimum: 0, maximum: viewport.height });
}

function validateVector(value, label) {
  if (
    !Array.isArray(value)
    || value.length !== 3
    || value.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
  ) {
    fail("reconstruction", `${label} must contain exactly three finite numbers`);
  }
}

function validateCoordinateSpaces(value) {
  const keys = ["image", "canonical", "world", "camera"];
  assertKeys(value, keys, keys, "coordinateSpaces", "reconstruction");
  for (const key of keys) assertString(value[key], `coordinateSpaces.${key}`, "reconstruction");
}

function validateRectification(value) {
  const keys = [
    "method",
    "artifact",
    "frontElevation",
    "sourceViewport",
    "canonicalViewport",
    "anchors",
  ];
  assertKeys(value, keys, keys, "rectification", "reconstruction");
  assertEnum(
    value.method,
    ["planar-homography", "multi-plane", "not-required-front-view"],
    "rectification.method",
    "reconstruction",
  );
  assertString(value.artifact, "rectification.artifact", "reconstruction");
  assertString(value.frontElevation, "rectification.frontElevation", "reconstruction");
  validateViewport(value.sourceViewport, "rectification.sourceViewport");
  validateViewport(value.canonicalViewport, "rectification.canonicalViewport");
  if (!Array.isArray(value.anchors) || value.anchors.length < 4) {
    fail("reconstruction", "rectification.anchors must contain at least 4 anchors");
  }
  const ids = new Set();
  for (const [index, anchor] of value.anchors.entries()) {
    const label = `rectification.anchors[${index}]`;
    assertKeys(anchor, ["id", "source", "canonical"], ["id", "source", "canonical"], label, "reconstruction");
    assertString(anchor.id, `${label}.id`, "reconstruction");
    if (ids.has(anchor.id)) fail("reconstruction", `duplicate rectification anchor id ${anchor.id}`);
    ids.add(anchor.id);
    validatePoint(anchor.source, `${label}.source`, value.sourceViewport);
    validatePoint(anchor.canonical, `${label}.canonical`, value.canonicalViewport);
  }
}

function validateCamera(value) {
  const keys = ["model", "locked", "calibrationArtifact", "renderViewport", "parameters"];
  assertKeys(value, keys, keys, "camera", "reconstruction");
  assertEnum(value.model, ["perspective", "orthographic"], "camera.model", "reconstruction");
  if (value.locked !== true) fail("reconstruction", "camera.locked must be true");
  assertString(value.calibrationArtifact, "camera.calibrationArtifact", "reconstruction");
  validateViewport(value.renderViewport, "camera.renderViewport");
  const common = ["near", "far", "position", "target", "up", "rollDegrees"];
  const specific = value.model === "perspective" ? "verticalFovDegrees" : "viewHeight";
  const parameterKeys = [...common, specific];
  assertKeys(
    value.parameters,
    parameterKeys,
    parameterKeys,
    "camera.parameters",
    "reconstruction",
  );
  assertFiniteNumber(value.parameters.near, "camera.parameters.near", { minimum: Number.EPSILON });
  assertFiniteNumber(value.parameters.far, "camera.parameters.far", { minimum: Number.EPSILON });
  if (value.parameters.far <= value.parameters.near) {
    fail("reconstruction", "camera.parameters.far must be greater than near");
  }
  assertFiniteNumber(value.parameters.rollDegrees, "camera.parameters.rollDegrees");
  validateVector(value.parameters.position, "camera.parameters.position");
  validateVector(value.parameters.target, "camera.parameters.target");
  validateVector(value.parameters.up, "camera.parameters.up");
  if (value.model === "perspective") {
    assertFiniteNumber(
      value.parameters.verticalFovDegrees,
      "camera.parameters.verticalFovDegrees",
      { minimum: 1, maximum: 179 },
    );
  } else {
    assertFiniteNumber(
      value.parameters.viewHeight,
      "camera.parameters.viewHeight",
      { minimum: Number.EPSILON },
    );
  }
}

function validateLandmarks(value, mode, sourceViewport, renderViewport) {
  const keys = ["overlayArtifact", "thresholds", "points"];
  assertKeys(value, keys, keys, "landmarks", "reconstruction");
  assertString(value.overlayArtifact, "landmarks.overlayArtifact", "reconstruction");
  const thresholdKeys = [
    "minCount",
    "minRegions",
    "maxMeanErrorPx",
    "maxPointErrorPx",
  ];
  assertKeys(
    value.thresholds,
    thresholdKeys,
    thresholdKeys,
    "landmarks.thresholds",
    "reconstruction",
  );
  assertPositiveInteger(value.thresholds.minCount, "landmarks.thresholds.minCount");
  assertPositiveInteger(value.thresholds.minRegions, "landmarks.thresholds.minRegions");
  assertFiniteNumber(
    value.thresholds.maxMeanErrorPx,
    "landmarks.thresholds.maxMeanErrorPx",
    { minimum: 0 },
  );
  assertFiniteNumber(
    value.thresholds.maxPointErrorPx,
    "landmarks.thresholds.maxPointErrorPx",
    { minimum: 0 },
  );
  if (value.thresholds.maxPointErrorPx < value.thresholds.maxMeanErrorPx) {
    fail("reconstruction", "maxPointErrorPx cannot be lower than maxMeanErrorPx");
  }
  if (mode === "exact-reconstruction") {
    if (value.thresholds.minCount < 8) {
      fail("reconstruction", "exact reconstruction requires at least 8 landmarks");
    }
    if (value.thresholds.minRegions < 4) {
      fail("reconstruction", "exact reconstruction requires at least 4 landmark regions");
    }
    if (value.thresholds.maxMeanErrorPx > 1.5) {
      fail("reconstruction", "exact reconstruction maxMeanErrorPx cannot exceed 1.5");
    }
    if (value.thresholds.maxPointErrorPx > 3) {
      fail("reconstruction", "exact reconstruction maxPointErrorPx cannot exceed 3");
    }
  }
  if (!Array.isArray(value.points) || value.points.length < value.thresholds.minCount) {
    fail(
      "reconstruction",
      `landmarks.points must contain at least ${value.thresholds.minCount} points`,
    );
  }
  const ids = new Set();
  const regions = new Set();
  for (const [index, landmark] of value.points.entries()) {
    const label = `landmarks.points[${index}]`;
    assertKeys(
      landmark,
      ["id", "region", "source", "render"],
      ["id", "region", "source", "render"],
      label,
      "reconstruction",
    );
    assertString(landmark.id, `${label}.id`, "reconstruction");
    if (ids.has(landmark.id)) fail("reconstruction", `duplicate landmark id ${landmark.id}`);
    ids.add(landmark.id);
    assertEnum(landmark.region, LANDMARK_REGIONS, `${label}.region`, "reconstruction");
    regions.add(landmark.region);
    validatePoint(landmark.source, `${label}.source`, sourceViewport);
    validatePoint(landmark.render, `${label}.render`, renderViewport);
  }
  if (regions.size < value.thresholds.minRegions) {
    fail(
      "reconstruction",
      `at least ${value.thresholds.minRegions} landmark regions are required`,
    );
  }
}

function validateApproval(value, label) {
  assertKeys(value, ["status", "evidence"], ["status", "evidence"], label, "reconstruction");
  assertEnum(
    value.status,
    ["pending", "approved", "rejected"],
    `${label}.status`,
    "reconstruction",
  );
  assertString(value.evidence, `${label}.evidence`, "reconstruction");
}

function validateReconstruction(reconstruction) {
  const rootKeys = [
    "schema",
    "id",
    "referenceId",
    "mode",
    "coordinateSpaces",
    "rectification",
    "camera",
    "landmarks",
    "geometryGate",
    "finalComparison",
  ];
  assertKeys(reconstruction, rootKeys, rootKeys, "reconstruction", "reconstruction");
  if (reconstruction.schema !== SCHEMA) {
    fail("reconstruction", `schema must be ${SCHEMA}`);
  }
  assertString(reconstruction.id, "id", "reconstruction");
  assertString(reconstruction.referenceId, "referenceId", "reconstruction");
  assertEnum(reconstruction.mode, MODES, "mode", "reconstruction");
  validateCoordinateSpaces(reconstruction.coordinateSpaces);
  validateRectification(reconstruction.rectification);
  validateCamera(reconstruction.camera);
  if (
    reconstruction.rectification.sourceViewport.width
      !== reconstruction.camera.renderViewport.width
    || reconstruction.rectification.sourceViewport.height
      !== reconstruction.camera.renderViewport.height
  ) {
    fail(
      "reconstruction",
      "source and render viewports must match for locked-frame landmark calibration",
    );
  }
  validateLandmarks(
    reconstruction.landmarks,
    reconstruction.mode,
    reconstruction.rectification.sourceViewport,
    reconstruction.camera.renderViewport,
  );
  assertKeys(
    reconstruction.geometryGate,
    ["approval"],
    ["approval"],
    "geometryGate",
    "reconstruction",
  );
  validateApproval(reconstruction.geometryGate.approval, "geometryGate.approval");
  validateFinalComparison(reconstruction.finalComparison, reconstruction.mode);
  return reconstruction;
}

module.exports = {
  EXACT_EVIDENCE_CAPABILITIES,
  LANDMARK_REGIONS,
  MODES,
  SCHEMA,
  STAGES,
  validateEvidenceReceipt,
  validateReconstruction,
};
