"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertString,
  assertStringArray,
  fail,
  readJson,
  resolveInside,
} = require("./contract-utils.cjs");
const {
  DOWNGRADE_STATUSES,
  FIDELITY_MODES,
  REFERENCE_ROLES,
  validateIntent,
} = require("./reference-intent-contract.cjs");

const SCHEMA_V1 = "design-pipeline.reference-evidence.v1";
const SCHEMA_V2 = "design-pipeline.reference-evidence.v2";
const SCHEMA = SCHEMA_V2;
const SCHEMAS = [SCHEMA_V1, SCHEMA_V2];
const ROUTES = ["2d", "2.5d", "3d", "hybrid"];
const DIMENSIONS = ["2d", "2.5d", "3d"];
const CAMERA_MODELS = ["none", "fixed-orthographic", "fixed-perspective", "navigable-perspective"];
const INTERACTION_MODELS = ["none", "bounded-parallax", "inspectable", "navigable"];
const OUTPUT_SURFACES = ["screen-space-ui", "locked-cinematic-frame", "interactive-scene"];
const CUE_NAMES = [
  "thickness",
  "occlusion",
  "contactShadows",
  "bevelHighlights",
  "perspectiveConvergence",
  "depthOfField",
];
const THREE_D_ARTIFACTS = ["reference.md", "scene.json", "3d.md", "graybox.png"];
const EXACT_RECONSTRUCTION_ARTIFACTS = [
  "rectified-reference.png",
  "front-elevation.svg",
  "camera-calibration.json",
  "landmark-overlay.png",
  "reconstruction.json",
];

function validateCue(cue, name) {
  assertKeys(cue, ["present", "evidence"], ["present", "evidence"], `spatialCues.${name}`, "reference evidence");
  if (typeof cue.present !== "boolean") fail("reference evidence", `spatialCues.${name}.present must be boolean`);
  assertString(cue.evidence, `spatialCues.${name}.evidence`, "reference evidence");
}

function validateReferenceEvidence(reference) {
  const baseRootKeys = [
    "schema",
    "id",
    "source",
    "classification",
    "spatialCues",
    "route",
    "confidence",
    "requiredArtifacts",
    "approval",
  ];
  const rootKeys = reference.schema === SCHEMA_V2
    ? [...baseRootKeys, "intent"]
    : baseRootKeys;
  assertKeys(reference, rootKeys, rootKeys, "reference", "reference evidence");
  if (!SCHEMAS.includes(reference.schema)) {
    fail("reference evidence", `schema must be one of: ${SCHEMAS.join(", ")}`);
  }
  assertString(reference.id, "id", "reference evidence");
  if (reference.schema === SCHEMA_V2) validateIntent(reference.intent);

  assertKeys(reference.source, ["path", "kind", "width", "height", "sha256"], ["path", "kind", "width", "height", "sha256"], "source", "reference evidence");
  assertString(reference.source.path, "source.path", "reference evidence");
  assertEnum(reference.source.kind, ["image", "video", "live-page", "document", "other"], "source.kind", "reference evidence");
  for (const dimension of ["width", "height"]) {
    if (!Number.isInteger(reference.source[dimension]) || reference.source[dimension] <= 0) {
      fail("reference evidence", `source.${dimension} must be a positive integer`);
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(reference.source.sha256)) {
    fail("reference evidence", "source.sha256 must be a SHA-256 digest");
  }

  const classificationKeys = ["objectDimensionality", "cameraModel", "interactionModel", "outputSurface", "runtimeFamily"];
  assertKeys(reference.classification, classificationKeys, classificationKeys, "classification", "reference evidence");
  assertEnum(reference.classification.objectDimensionality, DIMENSIONS, "classification.objectDimensionality", "reference evidence");
  assertEnum(reference.classification.cameraModel, CAMERA_MODELS, "classification.cameraModel", "reference evidence");
  assertEnum(reference.classification.interactionModel, INTERACTION_MODELS, "classification.interactionModel", "reference evidence");
  assertEnum(reference.classification.outputSurface, OUTPUT_SURFACES, "classification.outputSurface", "reference evidence");
  assertString(reference.classification.runtimeFamily, "classification.runtimeFamily", "reference evidence");

  assertKeys(reference.spatialCues, CUE_NAMES, CUE_NAMES, "spatialCues", "reference evidence");
  for (const cueName of CUE_NAMES) validateCue(reference.spatialCues[cueName], cueName);

  assertEnum(reference.route, ROUTES, "route", "reference evidence");
  if (typeof reference.confidence !== "number" || reference.confidence < 0 || reference.confidence > 1) {
    fail("reference evidence", "confidence must be a number between 0 and 1");
  }
  assertStringArray(reference.requiredArtifacts, "requiredArtifacts", "reference evidence", { unique: true, min: 1 });
  assertKeys(reference.approval, ["status", "evidence"], ["status", "evidence"], "approval", "reference evidence");
  assertEnum(reference.approval.status, ["pending", "approved", "rejected"], "approval.status", "reference evidence");
  assertString(reference.approval.evidence, "approval.evidence", "reference evidence");

  const spatialCueCount = CUE_NAMES.filter((name) => reference.spatialCues[name].present).length;
  if (
    spatialCueCount >= 2
    && (reference.route === "2d" || reference.classification.objectDimensionality === "2d")
  ) {
    fail("reference evidence", `spatial route contradiction: ${spatialCueCount} strong spatial cues cannot be classified as 2d`);
  }

  if (reference.classification.runtimeFamily === "fixed-camera-cinematic-3d") {
    const fixedCameraContract = reference.classification.objectDimensionality === "3d"
      && ["fixed-perspective", "fixed-orthographic"].includes(reference.classification.cameraModel)
      && reference.classification.interactionModel === "none"
      && reference.classification.outputSurface === "locked-cinematic-frame"
      && reference.route === "3d";
    if (!fixedCameraContract) {
      fail("reference evidence", "fixed-camera-cinematic-3d requires 3d geometry, a fixed camera, no navigation, and a locked cinematic frame");
    }
  }

  if (["3d", "hybrid"].includes(reference.route)) {
    for (const artifact of THREE_D_ARTIFACTS) {
      if (!reference.requiredArtifacts.includes(artifact)) {
        fail("reference evidence", `3D routes require ${artifact}`);
      }
    }
  }
  if (reference.intent?.effectiveFidelity === "exact-reconstruction") {
    for (const artifact of EXACT_RECONSTRUCTION_ARTIFACTS) {
      if (!reference.requiredArtifacts.includes(artifact)) {
        fail("reference evidence", `exact reconstruction requires ${artifact}`);
      }
    }
    if (!reference.requiredArtifacts.includes(reference.intent.reconstructionArtifact)) {
      fail(
        "reference evidence",
        "requiredArtifacts must include intent.reconstructionArtifact",
      );
    }
  }
  return reference;
}

function checkReferenceEvidence(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const artifact = resolveInside(root, options.artifact || "reference-evidence.json", "reference evidence", {
    scope: "reference evidence",
    mustExist: true,
  });
  const reference = validateReferenceEvidence(readJson(artifact, "reference evidence"));
  if (reference.approval.status !== "approved") {
    return {
      status: "blocked",
      blockers: [`reference approval status is ${reference.approval.status}`],
      artifact,
      reference,
    };
  }
  if (
    ["exact-reconstruction", "adaptive-reconstruction"]
      .includes(reference.intent?.effectiveFidelity)
  ) {
    const reconstructionArtifact = resolveInside(
      root,
      reference.intent.reconstructionArtifact,
      "reconstruction artifact",
      { scope: "reference evidence" },
    );
    if (!fs.existsSync(reconstructionArtifact)) {
      return {
        status: "blocked",
        blockers: [
          `missing reconstruction evidence: ${reference.intent.reconstructionArtifact}`,
        ],
        artifact,
        reference,
      };
    }
    const { checkReconstruction } = require("./reconstruction-core.cjs");
    const reconstruction = checkReconstruction(root, {
      artifact: reference.intent.reconstructionArtifact,
      stage: "geometry",
    });
    if (reconstruction.reconstruction.referenceId !== reference.id) {
      fail(
        "reference evidence",
        "reconstruction.referenceId must match reference evidence id",
      );
    }
    if (
      reconstruction.reconstruction.mode
      !== reference.intent.effectiveFidelity
    ) {
      fail(
        "reference evidence",
        "reconstruction.mode must match intent.effectiveFidelity",
      );
    }
    return {
      status: reconstruction.status,
      blockers: reconstruction.blockers,
      mismatches: reconstruction.mismatches,
      artifact,
      reference,
      reconstruction,
    };
  }
  return {
    status: "ready",
    blockers: [],
    artifact,
    reference,
  };
}

module.exports = {
  CAMERA_MODELS,
  CUE_NAMES,
  DIMENSIONS,
  DOWNGRADE_STATUSES,
  EXACT_RECONSTRUCTION_ARTIFACTS,
  FIDELITY_MODES,
  INTERACTION_MODELS,
  OUTPUT_SURFACES,
  REFERENCE_ROLES,
  ROUTES,
  SCHEMA,
  SCHEMAS,
  SCHEMA_V1,
  SCHEMA_V2,
  THREE_D_ARTIFACTS,
  checkReferenceEvidence,
  validateReferenceEvidence,
};
