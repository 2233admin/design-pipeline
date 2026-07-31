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

// Every message this module raises is scoped to the carrier, never to the caller.
const SCOPE = "reference evidence";
const DEFAULT_AVAILABILITY = "resolved";
const PENDING_AVAILABILITY = "pending";
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const SOURCE_DIMENSION_KEYS = ["width", "height"];
const COMPOSITION_AXIS_KEYS = ["rows", "columns"];
const COMPOSITION_KEYS = ["uniform", "regions"];
const COMPOSITION_MIN_REGIONS = 2;
const CLASSIFICATION_KEYS = [
  "objectDimensionality",
  "cameraModel",
  "interactionModel",
  "outputSurface",
  "runtimeFamily",
];
const CLASSIFICATION_ENUMS = [
  ["objectDimensionality", DIMENSIONS],
  ["cameraModel", CAMERA_MODELS],
  ["interactionModel", INTERACTION_MODELS],
  ["outputSurface", OUTPUT_SURFACES],
];
const CUE_KEYS = ["present", "evidence"];
const APPROVAL_KEYS = ["status", "evidence"];
const APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const BASE_ROOT_KEYS = [
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
const V2_ONLY_ROOT_KEYS = ["intent", "composition"];
const SPATIAL_CUE_CONTRADICTION_THRESHOLD = 2;
const FLAT_DIMENSIONALITY = "2d";
const FLAT_ROUTE = "2d";
const FIXED_CAMERA_RUNTIME_FAMILY = "fixed-camera-cinematic-3d";
const FIXED_CAMERA_MODELS = ["fixed-perspective", "fixed-orthographic"];
const THREE_D_ARTIFACT_ROUTES = ["3d", "hybrid"];
const EXACT_RECONSTRUCTION_FIDELITY = "exact-reconstruction";
const RECONSTRUCTION_FIDELITIES = ["exact-reconstruction", "adaptive-reconstruction"];
const GRAYBOX_READY_STATUS = "ready";
const DEFAULT_REFERENCE_ARTIFACT = "reference-evidence.json";

function assertTimestamp(value, label, scope) {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    fail(scope, `${label} must be an ISO 8601 timestamp`);
  }
}

function sourceAvailability(reference) {
  const declared = reference?.source?.availability;
  return declared === undefined ? DEFAULT_AVAILABILITY : declared;
}

function validateCue(cue, name) {
  assertKeys(cue, CUE_KEYS, CUE_KEYS, `spatialCues.${name}`, SCOPE);
  if (typeof cue.present !== "boolean") fail(SCOPE, `spatialCues.${name}.present must be boolean`);
  assertString(cue.evidence, `spatialCues.${name}.evidence`, SCOPE);
}

// --- source -----------------------------------------------------------------
// The availability discriminator, the pending-branch fields, and the resolved-branch fields are
// three independent contracts. Only the discriminator is shared.

function readSourceAvailability(source, scope) {
  if (Object.hasOwn(source, "availability")) {
    assertEnum(source.availability, SOURCE_AVAILABILITY, "source.availability", scope);
  }
  assertEnum(source.kind, SOURCE_KINDS, "source.kind", scope);
  return source.availability === undefined ? DEFAULT_AVAILABILITY : source.availability;
}

function validatePendingSource(source, scope) {
  assertString(source.pendingReason, "source.pendingReason", scope);
  assertString(source.requestedFrom, "source.requestedFrom", scope);
  if (Object.hasOwn(source, "resolvedAt")) {
    fail(scope, "source.resolvedAt is not allowed while source.availability is pending");
  }
  if (source.path !== null) assertString(source.path, "source.path", scope);
  for (const dimension of SOURCE_DIMENSION_KEYS) {
    if (source[dimension] === null) continue;
    if (!Number.isInteger(source[dimension]) || source[dimension] <= 0) {
      fail(scope, `source.${dimension} must be a positive integer or null while source.availability is pending`);
    }
  }
  if (source.sha256 !== null && !SHA256_PATTERN.test(source.sha256)) {
    fail(scope, "source.sha256 must be a SHA-256 digest or null while source.availability is pending");
  }
}

function validateResolvedSource(source, scope) {
  if (Object.hasOwn(source, "pendingReason")) {
    fail(scope, "source.pendingReason is only allowed while source.availability is pending");
  }
  for (const key of SOURCE_MEASUREMENT_KEYS) {
    if (source[key] === null) {
      fail(scope, `source.${key} must not be null while source.availability is resolved`);
    }
  }
  assertString(source.path, "source.path", scope);
  for (const dimension of SOURCE_DIMENSION_KEYS) {
    if (!Number.isInteger(source[dimension]) || source[dimension] <= 0) {
      fail(scope, `source.${dimension} must be a positive integer`);
    }
  }
  if (!SHA256_PATTERN.test(source.sha256)) {
    fail(scope, "source.sha256 must be a SHA-256 digest");
  }
}

function validateSourceProvenance(source, availability, scope) {
  if (Object.hasOwn(source, "requestedFrom") && availability !== PENDING_AVAILABILITY) {
    assertString(source.requestedFrom, "source.requestedFrom", scope);
  }
  if (Object.hasOwn(source, "requestedAt")) {
    assertTimestamp(source.requestedAt, "source.requestedAt", scope);
  }
  if (Object.hasOwn(source, "resolvedAt")) {
    assertTimestamp(source.resolvedAt, "source.resolvedAt", scope);
  }
}

function validateSource(source) {
  const scope = SCOPE;
  assertKeys(source, SOURCE_REQUIRED_KEYS, SOURCE_KEYS, "source", scope);
  const availability = readSourceAvailability(source, scope);
  if (availability === PENDING_AVAILABILITY) {
    validatePendingSource(source, scope);
  } else {
    validateResolvedSource(source, scope);
  }
  validateSourceProvenance(source, availability, scope);
  return availability;
}

// --- composition ------------------------------------------------------------

function regionStructureKey(region) {
  return `${region.rows}x${region.columns}`;
}

function assertCompositionShape(composition, scope) {
  assertKeys(composition, COMPOSITION_KEYS, COMPOSITION_KEYS, "composition", scope);
  if (typeof composition.uniform !== "boolean") {
    fail(scope, "composition.uniform must be boolean");
  }
  if (!Array.isArray(composition.regions)) {
    fail(scope, "composition.regions must be an array");
  }
  if (composition.regions.length < COMPOSITION_MIN_REGIONS) {
    fail(scope, `composition.regions must describe at least ${COMPOSITION_MIN_REGIONS} regions`);
  }
}

function validateRegionShapes(regions, scope) {
  const ids = [];
  regions.forEach((region, index) => {
    const label = `composition.regions[${index}]`;
    assertKeys(region, COMPOSITION_REGION_KEYS, COMPOSITION_REGION_KEYS, label, scope);
    assertString(region.id, `${label}.id`, scope);
    for (const axis of COMPOSITION_AXIS_KEYS) {
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
  return ids;
}

function assertBreaksFromIntegrity(regions, ids, scope) {
  regions.forEach((region, index) => {
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
}

// The tie-break between equally common structures is first-insertion-order: the strictly-greater
// comparison keeps the earliest key seen. A reviewer has flagged that as an open question; it is
// deliberately preserved here so this refactor stays behaviour-neutral.
function modalRegionStructure(regions) {
  const counts = new Map();
  for (const region of regions) {
    const key = regionStructureKey(region);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let modal = null;
  for (const [key, count] of counts) {
    if (modal === null || count > counts.get(modal)) modal = key;
  }
  return modal;
}

function assertUniformComposition(regions, breaking, scope) {
  if (breaking.length) {
    fail(
      scope,
      "composition contradiction: composition.uniform is true but "
      + `${breaking.map((region) => region.id).join(", ")} record breaksFrom entries`,
    );
  }
  const [first] = regions;
  const differing = regions.filter(
    (region) => region.rows !== first.rows || region.columns !== first.columns,
  );
  if (differing.length) {
    fail(
      scope,
      "composition contradiction: composition.uniform is true but "
      + `${differing.map((region) => region.id).join(", ")} differ in rows or columns from ${first.id}`,
    );
  }
}

// One named exception is not enough. Every region that departs from the modal row/column
// structure is an exception, and the scenario requires each one to be named - either because it
// records what it breaks from, or because another region names it as the thing being broken.
function assertExceptionalComposition(regions, breaking, named, scope) {
  if (!breaking.length) {
    fail(
      scope,
      "composition contradiction: composition.uniform is false but no region records a breaksFrom entry",
    );
  }
  const modal = modalRegionStructure(regions);
  const unnamed = regions.filter(
    (region) => regionStructureKey(region) !== modal
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

function validateComposition(composition) {
  const scope = SCOPE;
  assertCompositionShape(composition, scope);
  const { regions } = composition;
  const ids = validateRegionShapes(regions, scope);
  assertBreaksFromIntegrity(regions, ids, scope);

  const breaking = regions.filter((region) => region.breaksFrom.length > 0);
  const named = new Set(regions.flatMap((region) => region.breaksFrom));
  if (composition.uniform === true) {
    assertUniformComposition(regions, breaking, scope);
  } else {
    assertExceptionalComposition(regions, breaking, named, scope);
  }
  return ids;
}

// --- reference evidence -----------------------------------------------------

// `composition` is required from v2 onward. A v1 document predates the per-region checklist and
// keeps its legacy shape; a document written against the current schema does not get to omit the
// structural breakdown, because that omission is the failure the checklist exists to catch.
function rootKeysFor(schema) {
  return schema === SCHEMA_V2 ? [...BASE_ROOT_KEYS, ...V2_ONLY_ROOT_KEYS] : BASE_ROOT_KEYS;
}

function validateClassification(classification) {
  assertKeys(classification, CLASSIFICATION_KEYS, CLASSIFICATION_KEYS, "classification", SCOPE);
  for (const [key, allowed] of CLASSIFICATION_ENUMS) {
    assertEnum(classification[key], allowed, `classification.${key}`, SCOPE);
  }
  assertString(classification.runtimeFamily, "classification.runtimeFamily", SCOPE);
}

function validateSpatialCues(spatialCues) {
  assertKeys(spatialCues, CUE_NAMES, CUE_NAMES, "spatialCues", SCOPE);
  for (const cueName of CUE_NAMES) validateCue(spatialCues[cueName], cueName);
}

function validateApproval(approval) {
  assertKeys(approval, APPROVAL_KEYS, APPROVAL_KEYS, "approval", SCOPE);
  assertEnum(approval.status, APPROVAL_STATUSES, "approval.status", SCOPE);
  assertString(approval.evidence, "approval.evidence", SCOPE);
}

function assertSpatialClassificationCoherence(reference) {
  const spatialCueCount = CUE_NAMES.filter((name) => reference.spatialCues[name].present).length;
  if (
    spatialCueCount >= SPATIAL_CUE_CONTRADICTION_THRESHOLD
    && (reference.route === FLAT_ROUTE
      || reference.classification.objectDimensionality === FLAT_DIMENSIONALITY)
  ) {
    fail(SCOPE, `spatial route contradiction: ${spatialCueCount} strong spatial cues cannot be classified as 2d`);
  }

  if (reference.classification.runtimeFamily !== FIXED_CAMERA_RUNTIME_FAMILY) return;
  const fixedCameraContract = reference.classification.objectDimensionality === "3d"
    && FIXED_CAMERA_MODELS.includes(reference.classification.cameraModel)
    && reference.classification.interactionModel === "none"
    && reference.classification.outputSurface === "locked-cinematic-frame"
    && reference.route === "3d";
  if (!fixedCameraContract) {
    fail(SCOPE, "fixed-camera-cinematic-3d requires 3d geometry, a fixed camera, no navigation, and a locked cinematic frame");
  }
}

// The artifacts a route owes, derived as `[artifact, message]` pairs in the order they are checked.
// Structural proof precedes optical treatment on every route, so every change that has a
// reference owes a graybox capture - not only the 3d and hybrid routes that already owed one.
function derivedArtifactRequirements(reference) {
  const requirements = [[GRAYBOX_ARTIFACT, `every reference route requires ${GRAYBOX_ARTIFACT}`]];
  if (THREE_D_ARTIFACT_ROUTES.includes(reference.route)) {
    for (const artifact of THREE_D_ARTIFACTS) {
      requirements.push([artifact, `3D routes require ${artifact}`]);
    }
  }
  if (reference.intent?.effectiveFidelity === EXACT_RECONSTRUCTION_FIDELITY) {
    for (const artifact of EXACT_RECONSTRUCTION_ARTIFACTS) {
      requirements.push([artifact, `exact reconstruction requires ${artifact}`]);
    }
    requirements.push([
      reference.intent.reconstructionArtifact,
      "requiredArtifacts must include intent.reconstructionArtifact",
    ]);
  }
  return requirements;
}

function assertRequiredArtifacts(reference) {
  for (const [artifact, message] of derivedArtifactRequirements(reference)) {
    if (!reference.requiredArtifacts.includes(artifact)) fail(SCOPE, message);
  }
}

function validateReferenceEvidence(reference) {
  const rootKeys = rootKeysFor(reference.schema);
  assertKeys(reference, rootKeys, [...rootKeys, "composition", "graybox"], "reference", SCOPE);
  if (!SCHEMAS.includes(reference.schema)) {
    fail(SCOPE, `schema must be one of: ${SCHEMAS.join(", ")}`);
  }
  assertString(reference.id, "id", SCOPE);
  if (reference.schema === SCHEMA_V2) validateIntent(reference.intent);

  validateSource(reference.source);
  validateClassification(reference.classification);
  validateSpatialCues(reference.spatialCues);

  assertEnum(reference.route, ROUTES, "route", SCOPE);
  if (typeof reference.confidence !== "number" || reference.confidence < 0 || reference.confidence > 1) {
    fail(SCOPE, "confidence must be a number between 0 and 1");
  }
  assertStringArray(reference.requiredArtifacts, "requiredArtifacts", SCOPE, { unique: true, min: 1 });
  validateApproval(reference.approval);

  const compositionRegionIds = Object.hasOwn(reference, "composition")
    ? validateComposition(reference.composition)
    : null;
  if (Object.hasOwn(reference, "graybox")) {
    validateGraybox(reference.graybox, { compositionRegionIds });
  }

  assertSpatialClassificationCoherence(reference);
  assertRequiredArtifacts(reference);
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

// --- aggregate gate: status derivation --------------------------------------

function approvalGate(reference) {
  if (reference.approval.status === "approved") return null;
  return {
    reason: reference.approval.status === "rejected"
      ? BLOCKED_REASONS.APPROVAL_REJECTED
      : BLOCKED_REASONS.APPROVAL_PENDING,
    blocker: `reference approval status is ${reference.approval.status}`,
  };
}

function sourceGate(reference) {
  if (sourceAvailability(reference) !== PENDING_AVAILABILITY) return null;
  return {
    reason: BLOCKED_REASONS.SOURCE_PENDING,
    blocker: `source.availability is pending: ${reference.source.pendingReason} `
      + `(requested from ${reference.source.requestedFrom})`,
  };
}

// --- aggregate gate: result assembly ----------------------------------------

function grayboxContext(root, reference, relative) {
  const graybox = grayboxStage(root, reference, relative);
  return {
    graybox,
    blocked: graybox.status !== GRAYBOX_READY_STATUS,
    summary: {
      graybox: { status: graybox.status, reason: graybox.reason, reasons: graybox.reasons },
    },
  };
}

function trailingGrayboxBlockers(stage) {
  return stage.blocked ? stage.graybox.blockers : [];
}

function blockedResult(gate, stage, artifact, reference) {
  return {
    status: "blocked",
    reason: gate.reason,
    contractValid: true,
    blockers: [gate.blocker, ...trailingGrayboxBlockers(stage)],
    artifact,
    reference,
    stages: stage.summary,
  };
}

function reconstructionResult(reconstruction, stage, artifact, reference) {
  return {
    status: stage.blocked ? "blocked" : reconstruction.status,
    reason: reconstruction.reason ?? (stage.blocked ? stage.graybox.reason : null),
    contractValid: true,
    blockers: [...reconstruction.blockers, ...trailingGrayboxBlockers(stage)],
    mismatches: reconstruction.mismatches,
    artifact,
    reference,
    reconstruction,
    stages: {
      ...stage.summary,
      geometry: {
        status: reconstruction.status,
        reason: reconstruction.reason ?? null,
        reasons: reconstruction.reasons ?? [],
      },
    },
  };
}

function grayboxOnlyResult(stage, artifact, reference) {
  return {
    status: stage.blocked ? "blocked" : "ready",
    reason: stage.blocked ? stage.graybox.reason : null,
    contractValid: true,
    blockers: trailingGrayboxBlockers(stage),
    artifact,
    reference,
    stages: stage.summary,
  };
}

function checkReconstructionStage(root, stage, artifact, reference) {
  const reconstructionArtifact = resolveInside(
    root,
    reference.intent.reconstructionArtifact,
    "reconstruction artifact",
    { scope: SCOPE },
  );
  if (!fs.existsSync(reconstructionArtifact)) {
    return blockedResult(
      {
        reason: BLOCKED_REASONS.RECONSTRUCTION_EVIDENCE_MISSING,
        blocker: `missing reconstruction evidence: ${reference.intent.reconstructionArtifact}`,
      },
      stage,
      artifact,
      reference,
    );
  }
  const { checkReconstruction } = require("./reconstruction-core.cjs");
  const reconstruction = checkReconstruction(root, {
    artifact: reference.intent.reconstructionArtifact,
    stage: "geometry",
  });
  if (reconstruction.reconstruction.referenceId !== reference.id) {
    fail(
      SCOPE,
      "reconstruction.referenceId must match reference evidence id",
    );
  }
  if (
    reconstruction.reconstruction.mode
    !== reference.intent.effectiveFidelity
  ) {
    fail(
      SCOPE,
      "reconstruction.mode must match intent.effectiveFidelity",
    );
  }
  return reconstructionResult(reconstruction, stage, artifact, reference);
}

function checkReferenceEvidence(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const relative = options.artifact || DEFAULT_REFERENCE_ARTIFACT;
  const artifact = resolveInside(root, relative, "reference evidence", {
    scope: SCOPE,
    mustExist: true,
  });
  const reference = validateReferenceEvidence(readJson(artifact, SCOPE));
  const stage = grayboxContext(root, reference, relative);

  for (const gate of [approvalGate(reference), sourceGate(reference)]) {
    if (gate) return blockedResult(gate, stage, artifact, reference);
  }

  if (RECONSTRUCTION_FIDELITIES.includes(reference.intent?.effectiveFidelity)) {
    return checkReconstructionStage(root, stage, artifact, reference);
  }
  return grayboxOnlyResult(stage, artifact, reference);
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
