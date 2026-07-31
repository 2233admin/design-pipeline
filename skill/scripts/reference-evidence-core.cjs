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
// The graybox block has exactly one contract. `reference-evidence.json` is a carrier for it, not a
// second definition of it, so it consumes the same validator, enums, and reason strings that
// `reconstruction.json` does.
const {
  GRAYBOX_APPROVAL_STATUSES,
  GRAYBOX_COMPARISON_MODES,
  GRAYBOX_REGION_STATUSES,
  GRAYBOX_SUPPRESSED_TREATMENTS,
  GRAYBOX_UNRESOLVED_REGION_STATUSES,
  validateGraybox,
} = require("./reconstruction-contract.cjs");

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
const SOURCE_KINDS = ["image", "video", "live-page", "document", "other"];
const SOURCE_AVAILABILITY = ["resolved", "pending"];
const SOURCE_MEASUREMENT_KEYS = ["path", "width", "height", "sha256"];
const SOURCE_REQUIRED_KEYS = ["path", "kind", "width", "height", "sha256"];
const SOURCE_KEYS = [
  ...SOURCE_REQUIRED_KEYS,
  "availability",
  "pendingReason",
  "requestedFrom",
  "requestedAt",
  "resolvedAt",
];
const COMPOSITION_REGION_KEYS = ["id", "rows", "columns", "breaksFrom"];
const GRAYBOX_ARTIFACT = "graybox.png";
const GRAYBOX_FINDING_STATUSES = GRAYBOX_REGION_STATUSES;
const GRAYBOX_UNRESOLVED_FINDING_STATUSES = GRAYBOX_UNRESOLVED_REGION_STATUSES;
const BLOCKED_REASONS = {
  APPROVAL_PENDING: "approval-pending",
  APPROVAL_REJECTED: "approval-rejected",
  SOURCE_PENDING: "source-pending",
  RECONSTRUCTION_EVIDENCE_MISSING: "reconstruction-evidence-missing",
};

function assertTimestamp(value, label, scope) {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    fail(scope, `${label} must be an ISO 8601 timestamp`);
  }
}

function sourceAvailability(reference) {
  const declared = reference?.source?.availability;
  return declared === undefined ? "resolved" : declared;
}

function validateCue(cue, name) {
  assertKeys(cue, ["present", "evidence"], ["present", "evidence"], `spatialCues.${name}`, "reference evidence");
  if (typeof cue.present !== "boolean") fail("reference evidence", `spatialCues.${name}.present must be boolean`);
  assertString(cue.evidence, `spatialCues.${name}.evidence`, "reference evidence");
}

function validateSource(source) {
  const scope = "reference evidence";
  assertKeys(source, SOURCE_REQUIRED_KEYS, SOURCE_KEYS, "source", scope);
  if (Object.hasOwn(source, "availability")) {
    assertEnum(source.availability, SOURCE_AVAILABILITY, "source.availability", scope);
  }
  assertEnum(source.kind, SOURCE_KINDS, "source.kind", scope);
  const availability = source.availability === undefined ? "resolved" : source.availability;

  if (availability === "pending") {
    assertString(source.pendingReason, "source.pendingReason", scope);
    assertString(source.requestedFrom, "source.requestedFrom", scope);
    if (Object.hasOwn(source, "resolvedAt")) {
      fail(scope, "source.resolvedAt is not allowed while source.availability is pending");
    }
    if (source.path !== null) assertString(source.path, "source.path", scope);
    for (const dimension of ["width", "height"]) {
      if (source[dimension] === null) continue;
      if (!Number.isInteger(source[dimension]) || source[dimension] <= 0) {
        fail(scope, `source.${dimension} must be a positive integer or null while source.availability is pending`);
      }
    }
    if (source.sha256 !== null && !/^[a-f0-9]{64}$/i.test(source.sha256)) {
      fail(scope, "source.sha256 must be a SHA-256 digest or null while source.availability is pending");
    }
  } else {
    if (Object.hasOwn(source, "pendingReason")) {
      fail(scope, "source.pendingReason is only allowed while source.availability is pending");
    }
    for (const key of SOURCE_MEASUREMENT_KEYS) {
      if (source[key] === null) {
        fail(scope, `source.${key} must not be null while source.availability is resolved`);
      }
    }
    assertString(source.path, "source.path", scope);
    for (const dimension of ["width", "height"]) {
      if (!Number.isInteger(source[dimension]) || source[dimension] <= 0) {
        fail(scope, `source.${dimension} must be a positive integer`);
      }
    }
    if (!/^[a-f0-9]{64}$/i.test(source.sha256)) {
      fail(scope, "source.sha256 must be a SHA-256 digest");
    }
  }
  if (Object.hasOwn(source, "requestedFrom") && availability !== "pending") {
    assertString(source.requestedFrom, "source.requestedFrom", scope);
  }
  if (Object.hasOwn(source, "requestedAt")) {
    assertTimestamp(source.requestedAt, "source.requestedAt", scope);
  }
  if (Object.hasOwn(source, "resolvedAt")) {
    assertTimestamp(source.resolvedAt, "source.resolvedAt", scope);
  }
  return availability;
}

function validateComposition(composition) {
  const scope = "reference evidence";
  assertKeys(composition, ["uniform", "regions"], ["uniform", "regions"], "composition", scope);
  if (typeof composition.uniform !== "boolean") {
    fail(scope, "composition.uniform must be boolean");
  }
  if (!Array.isArray(composition.regions)) {
    fail(scope, "composition.regions must be an array");
  }
  if (composition.regions.length < 2) {
    fail(scope, "composition.regions must describe at least 2 regions");
  }
  const ids = [];
  composition.regions.forEach((region, index) => {
    const label = `composition.regions[${index}]`;
    assertKeys(region, COMPOSITION_REGION_KEYS, COMPOSITION_REGION_KEYS, label, scope);
    assertString(region.id, `${label}.id`, scope);
    for (const axis of ["rows", "columns"]) {
      if (!Number.isInteger(region[axis]) || region[axis] <= 0) {
        fail(scope, `${label}.${axis} must be a positive integer`);
      }
    }
    assertStringArray(region.breaksFrom, `${label}.breaksFrom`, scope, { unique: true });
    if (ids.includes(region.id)) {
      fail(scope, `${label}.id duplicates an earlier region id ${region.id}`);
    }
    ids.push(region.id);
  });
  composition.regions.forEach((region, index) => {
    const label = `composition.regions[${index}]`;
    for (const target of region.breaksFrom) {
      if (target === region.id) {
        fail(scope, `${label}.breaksFrom cannot name its own region id ${region.id}`);
      }
      if (!ids.includes(target)) {
        fail(scope, `${label}.breaksFrom names an undeclared region id ${target}`);
      }
    }
  });

  const breaking = composition.regions.filter((region) => region.breaksFrom.length > 0);
  const named = new Set(composition.regions.flatMap((region) => region.breaksFrom));
  if (composition.uniform === true) {
    if (breaking.length) {
      fail(
        scope,
        "composition contradiction: composition.uniform is true but "
        + `${breaking.map((region) => region.id).join(", ")} record breaksFrom entries`,
      );
    }
    const [first] = composition.regions;
    const differing = composition.regions.filter(
      (region) => region.rows !== first.rows || region.columns !== first.columns,
    );
    if (differing.length) {
      fail(
        scope,
        "composition contradiction: composition.uniform is true but "
        + `${differing.map((region) => region.id).join(", ")} differ in rows or columns from ${first.id}`,
      );
    }
  } else if (!breaking.length) {
    fail(
      scope,
      "composition contradiction: composition.uniform is false but no region records a breaksFrom entry",
    );
  } else {
    // One named exception is not enough. Every region that departs from the modal row/column
    // structure is an exception, and the scenario requires each one to be named - either because it
    // records what it breaks from, or because another region names it as the thing being broken.
    const counts = new Map();
    for (const region of composition.regions) {
      const key = `${region.rows}x${region.columns}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let modal = null;
    for (const [key, count] of counts) {
      if (modal === null || count > counts.get(modal)) modal = key;
    }
    const unnamed = composition.regions.filter(
      (region) => `${region.rows}x${region.columns}` !== modal
        && !region.breaksFrom.length
        && !named.has(region.id),
    );
    if (unnamed.length) {
      fail(
        scope,
        "composition contradiction: composition.uniform is false but "
        + `${unnamed.map((region) => region.id).join(", ")} differ in rows or columns from the `
        + `modal ${modal} structure without naming what they break from`,
      );
    }
  }
  return ids;
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
  // `composition` is required from v2 onward. A v1 document predates the per-region checklist and
  // keeps its legacy shape; a document written against the current schema does not get to omit the
  // structural breakdown, because that omission is the failure the checklist exists to catch.
  const rootKeys = reference.schema === SCHEMA_V2
    ? [...baseRootKeys, "intent", "composition"]
    : baseRootKeys;
  assertKeys(reference, rootKeys, [...rootKeys, "composition", "graybox"], "reference", "reference evidence");
  if (!SCHEMAS.includes(reference.schema)) {
    fail("reference evidence", `schema must be one of: ${SCHEMAS.join(", ")}`);
  }
  assertString(reference.id, "id", "reference evidence");
  if (reference.schema === SCHEMA_V2) validateIntent(reference.intent);

  validateSource(reference.source);

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

  const compositionRegionIds = Object.hasOwn(reference, "composition")
    ? validateComposition(reference.composition)
    : null;
  if (Object.hasOwn(reference, "graybox")) {
    validateGraybox(reference.graybox, { compositionRegionIds });
  }

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

  // Structural proof precedes optical treatment on every route, so every change that has a
  // reference owes a graybox capture - not only the 3d and hybrid routes that already owed one.
  if (!reference.requiredArtifacts.includes(GRAYBOX_ARTIFACT)) {
    fail("reference evidence", `every reference route requires ${GRAYBOX_ARTIFACT}`);
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

// The aggregate gate is the one an agent is told to run, so it has to carry every stage the change
// owes. A graybox that reports blocked keeps the aggregate blocked on every route: a stage nobody
// is forced to look at is not a gate.
function grayboxStage(root, reference, referenceArtifact) {
  const options = {
    referenceArtifact,
    ...(reference.intent?.reconstructionArtifact
      ? { artifact: reference.intent.reconstructionArtifact }
      : {}),
  };
  try {
    const { checkGraybox } = require("./reconstruction-core.cjs");
    const result = checkGraybox(root, options);
    return {
      status: result.status,
      reason: result.reason,
      reasons: result.reasons,
      blockers: result.blockers,
    };
  } catch (error) {
    // A graybox block that cannot be validated is blocked, never ready.
    return {
      status: "blocked",
      reason: "graybox-invalid",
      reasons: ["graybox-invalid"],
      blockers: [error.message],
    };
  }
}

function checkReferenceEvidence(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const relative = options.artifact || "reference-evidence.json";
  const artifact = resolveInside(root, relative, "reference evidence", {
    scope: "reference evidence",
    mustExist: true,
  });
  const reference = validateReferenceEvidence(readJson(artifact, "reference evidence"));
  const availability = sourceAvailability(reference);
  const graybox = grayboxStage(root, reference, relative);
  const grayboxSummary = {
    graybox: { status: graybox.status, reason: graybox.reason, reasons: graybox.reasons },
  };
  const grayboxBlocked = graybox.status !== "ready";
  if (reference.approval.status !== "approved") {
    return {
      status: "blocked",
      reason: reference.approval.status === "rejected"
        ? BLOCKED_REASONS.APPROVAL_REJECTED
        : BLOCKED_REASONS.APPROVAL_PENDING,
      contractValid: true,
      blockers: [
        `reference approval status is ${reference.approval.status}`,
        ...(grayboxBlocked ? graybox.blockers : []),
      ],
      artifact,
      reference,
      stages: grayboxSummary,
    };
  }
  if (availability === "pending") {
    return {
      status: "blocked",
      reason: BLOCKED_REASONS.SOURCE_PENDING,
      contractValid: true,
      blockers: [
        `source.availability is pending: ${reference.source.pendingReason} `
        + `(requested from ${reference.source.requestedFrom})`,
        ...(grayboxBlocked ? graybox.blockers : []),
      ],
      artifact,
      reference,
      stages: grayboxSummary,
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
        reason: BLOCKED_REASONS.RECONSTRUCTION_EVIDENCE_MISSING,
        contractValid: true,
        blockers: [
          `missing reconstruction evidence: ${reference.intent.reconstructionArtifact}`,
          ...(grayboxBlocked ? graybox.blockers : []),
        ],
        artifact,
        reference,
        stages: grayboxSummary,
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
      status: grayboxBlocked ? "blocked" : reconstruction.status,
      reason: reconstruction.reason ?? (grayboxBlocked ? graybox.reason : null),
      contractValid: true,
      blockers: [...reconstruction.blockers, ...(grayboxBlocked ? graybox.blockers : [])],
      mismatches: reconstruction.mismatches,
      artifact,
      reference,
      reconstruction,
      stages: {
        ...grayboxSummary,
        geometry: {
          status: reconstruction.status,
          reason: reconstruction.reason ?? null,
          reasons: reconstruction.reasons ?? [],
        },
      },
    };
  }
  return {
    status: grayboxBlocked ? "blocked" : "ready",
    reason: grayboxBlocked ? graybox.reason : null,
    contractValid: true,
    blockers: grayboxBlocked ? graybox.blockers : [],
    artifact,
    reference,
    stages: grayboxSummary,
  };
}

module.exports = {
  BLOCKED_REASONS,
  CAMERA_MODELS,
  COMPOSITION_REGION_KEYS,
  CUE_NAMES,
  DIMENSIONS,
  DOWNGRADE_STATUSES,
  EXACT_RECONSTRUCTION_ARTIFACTS,
  FIDELITY_MODES,
  GRAYBOX_APPROVAL_STATUSES,
  GRAYBOX_COMPARISON_MODES,
  GRAYBOX_FINDING_STATUSES,
  GRAYBOX_SUPPRESSED_TREATMENTS,
  GRAYBOX_UNRESOLVED_FINDING_STATUSES,
  INTERACTION_MODELS,
  OUTPUT_SURFACES,
  REFERENCE_ROLES,
  ROUTES,
  SCHEMA,
  SCHEMAS,
  SCHEMA_V1,
  SCHEMA_V2,
  SOURCE_AVAILABILITY,
  SOURCE_KINDS,
  THREE_D_ARTIFACTS,
  checkReferenceEvidence,
  sourceAvailability,
  validateComposition,
  validateGraybox,
  validateReferenceEvidence,
};
