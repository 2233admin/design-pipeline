"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  pngDimensions,
  readJson,
  resolveInside,
  sha256,
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
const COMPOSITION_REGION_REQUIRED_KEYS = ["id", "rows", "columns", "breaksFrom"];
const COMPOSITION_REGION_KEYS = [...COMPOSITION_REGION_REQUIRED_KEYS, "contents"];
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
// `as above` describes the row before it, not the region in front of the author. A description that
// defers to a neighbour is the exact failure the per-region checklist exists to catch: it lets one
// reading be copied down the table instead of each region being read from the reference. The prose
// in `reference-spec.md` has forbidden these since the checklist landed; this is the list the
// validator actually applies.
const REGION_BACK_REFERENCES = [
  /\bas\s+above\b/i,
  /\bsame\s+as\b/i,
  /\bsee\s+above\b/i,
  /\bditto\b/i,
  /\bidem\b/i,
];
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
  // A source that was never supplied has nothing to measure. Permitting a path, a pixel size, or a
  // digest here let a document say the bytes never arrived while carrying the hash of those bytes,
  // and a reader would have to guess which half of that sentence to believe. Every measurement is
  // null under pending, so the absence is the claim rather than something inferred from it.
  const measured = SOURCE_MEASUREMENT_KEYS.filter((key) => source[key] !== null);
  if (measured.length) {
    fail(
      scope,
      "source contradiction: source.availability is pending but "
      + `${measured.join(", ")} carr${measured.length === 1 ? "ies" : "y"} a value; a source that `
      + "was never supplied cannot carry measurements, so each must be null",
    );
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

// A recorded description is held to the independence rule. A blank or whitespace-only string is a
// description that was reached for and not written, which `assertString` already rejects.
function validateRegionContents(region, label, scope) {
  assertString(region.contents, `${label}.contents`, scope);
  const backReference = REGION_BACK_REFERENCES.find((pattern) => pattern.test(region.contents));
  if (backReference) {
    fail(
      scope,
      `composition back-reference: ${label}.contents defers to another region `
      + `(${region.contents.trim()}); describe ${region.id} from the reference instead`,
    );
  }
}

// `contents` is absent from every region of a composition written before the field existed, and that
// absence is read as the legacy default rather than as a failure. Absent from *some* regions is a
// different claim: the document has adopted the field and then declined to answer for one region,
// which is the back-reference dodge wearing an empty cell instead of the words `as above`.
function assertRegionContentsAdoption(regions, described, scope) {
  if (!described.length || described.length === regions.length) return;
  const silent = regions.filter((region) => !Object.hasOwn(region, "contents"));
  fail(
    scope,
    "composition contradiction: composition.regions record contents for "
    + `${described.map((region) => region.id).join(", ")} but not for `
    + `${silent.map((region) => region.id).join(", ")}; a composition either predates the contents `
    + "field or describes every region, never some of them",
  );
}

function validateRegionShapes(regions, scope) {
  const ids = [];
  const described = [];
  regions.forEach((region, index) => {
    const label = `composition.regions[${index}]`;
    assertKeys(region, COMPOSITION_REGION_REQUIRED_KEYS, COMPOSITION_REGION_KEYS, label, scope);
    assertString(region.id, `${label}.id`, scope);
    for (const axis of COMPOSITION_AXIS_KEYS) {
      if (!Number.isInteger(region[axis]) || region[axis] <= 0) {
        fail(scope, `${label}.${axis} must be a positive integer`);
      }
    }
    if (Object.hasOwn(region, "contents")) {
      validateRegionContents(region, label, scope);
      described.push(region);
    }
    assertStringArray(region.breaksFrom, `${label}.breaksFrom`, scope, { unique: true });
    if (ids.includes(region.id)) {
      fail(scope, `${label}.id duplicates an earlier region id ${region.id}`);
    }
    ids.push(region.id);
  });
  assertRegionContentsAdoption(regions, described, scope);
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

// The modal structure is whichever `rows x columns` key the most regions share, read from the
// counts alone. Declaration order never enters it: the old strictly-greater scan over a Map kept
// whichever tied key happened to be written first, which let an author flip the verdict by
// reordering the table. Every key that reaches the top count is returned, so a tie is visible to
// the caller instead of being silently resolved.
function modalRegionStructures(regions) {
  const counts = new Map();
  for (const region of regions) {
    const key = regionStructureKey(region);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const count = Math.max(...counts.values());
  const modal = [...counts.keys()].filter((key) => counts.get(key) === count).sort();
  return { modal, count };
}

// A region is accounted for when the document says something about it: either it records what it
// breaks from, or another region names it as the thing being broken from.
function isRegionAccountedFor(region, named) {
  return region.breaksFrom.length > 0 || named.has(region.id);
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
  const { modal, count } = modalRegionStructures(regions);
  // An exact tie is not a norm. Keeping the first-written key, or the larger group, would both be
  // guesses that make the verdict depend on how the table was ordered. With nothing modal, no
  // region gets the free pass of "this one just follows the norm", so every region has to be
  // accounted for explicitly and the author is told to declare which structure is the norm.
  if (modal.length > 1) {
    const unaccounted = regions.filter((region) => !isRegionAccountedFor(region, named));
    if (unaccounted.length) {
      fail(
        scope,
        "composition ambiguity: composition.uniform is false and no rows-by-columns structure is "
        + `modal (${modal.join(" and ")} each describe ${count} region(s)), so `
        + `${unaccounted.map((region) => region.id).join(", ")} cannot be read as following a norm `
        + "the document never declared; record what each one breaks from",
      );
    }
    return;
  }
  const [structure] = modal;
  const unnamed = regions.filter(
    (region) => regionStructureKey(region) !== structure && !isRegionAccountedFor(region, named),
  );
  if (unnamed.length) {
    fail(
      scope,
      "composition contradiction: composition.uniform is false but "
      + `${unnamed.map((region) => region.id).join(", ")} differ in rows or columns from the `
      + `modal ${structure} structure without naming what they break from`,
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

// v1 is a frozen legacy carrier, not a live schema version. Keying the composition and intent
// requirements on the declared version alone made v1 a switch that turns those checks off, so a
// brand-new document could dodge the whole checklist by writing an older version string.
//
// The rule: a document declaring v1 that stays inside the v1 feature set is a genuinely older
// document and keeps validating exactly as it did - the absence of `intent` and `composition` is a
// real signal about its age. A document declaring v1 while carrying a construct that only exists
// from v2 onward is not older; it is current work wearing a stale label, so it is validated as v2
// and owes everything v2 owes. `graybox` counts as a v2-era construct: its comparison is checked
// against the declared composition region ids, so a graybox block with no composition to bind to is
// a stage reporting success on evidence nothing could check.
const V2_ERA_ROOT_KEYS = ["intent", "graybox"];

function effectiveSchemaFor(reference) {
  if (reference.schema !== SCHEMA_V1) return reference.schema;
  const carried = V2_ERA_ROOT_KEYS.filter((key) => Object.hasOwn(reference, key));
  if (!carried.length) return SCHEMA_V1;
  const missing = V2_ONLY_ROOT_KEYS.filter((key) => !Object.hasOwn(reference, key));
  if (missing.length) {
    fail(
      SCOPE,
      `schema era mismatch: schema is ${SCHEMA_V1} but the document carries the v2-era `
      + `${carried.join(" and ")} block, so it is validated as ${SCHEMA_V2} and must record `
      + `${missing.join(" and ")}`,
    );
  }
  return SCHEMA_V2;
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
  assertObject(reference, "reference", SCOPE);
  // The declared version is read before the key checklist, because which keys the document owes is
  // derived from the era it actually belongs to rather than from the label it wrote.
  if (!SCHEMAS.includes(reference.schema)) {
    fail(SCOPE, `schema must be one of: ${SCHEMAS.join(", ")}`);
  }
  const schema = effectiveSchemaFor(reference);
  const rootKeys = rootKeysFor(schema);
  assertKeys(
    reference,
    rootKeys,
    [...rootKeys, ...V2_ONLY_ROOT_KEYS, "graybox"],
    "reference",
    SCOPE,
  );
  assertString(reference.id, "id", SCOPE);
  if (schema === SCHEMA_V2) validateIntent(reference.intent);

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

function atomicWriteJson(file, value) {
  const temporary = `${file}.${process.pid}.${process.hrtime.bigint()}.tmp`;
  fs.writeFileSync(temporary, canonicalJson(value));
  fs.renameSync(temporary, file);
}

function posixInside(root, target) {
  return path.relative(root, target).split(path.sep).join("/");
}

// Shared by reference carriers that need byte identity without changing the
// reconstruction source-kind contract. The caller owns the interpretation of
// the bytes (for example PNG dimensions or HTML parsing).
function resolveContainedReference(rootInput, rawPath, label = "reference source") {
  const root = fs.realpathSync(path.resolve(rootInput));
  const target = resolveInside(root, rawPath, label, {
    scope: SCOPE,
    mustExist: true,
  });
  const real = fs.realpathSync(target);
  resolveInside(root, real, label, { scope: SCOPE });
  if (!fs.statSync(real).isFile()) fail(SCOPE, `${label} must be a regular file`);
  const bytes = fs.readFileSync(real);
  return {
    root,
    path: real,
    relativePath: posixInside(root, real),
    bytes,
    sha256: sha256(bytes),
  };
}

function referenceFileHash(file) {
  return sha256(fs.readFileSync(file));
}

function resolveReferenceSource(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const relative = options.artifact || DEFAULT_REFERENCE_ARTIFACT;
  const artifact = resolveInside(root, relative, "reference evidence", {
    scope: SCOPE,
    mustExist: true,
  });
  const reference = validateReferenceEvidence(readJson(artifact, SCOPE));
  if (sourceAvailability(reference) !== PENDING_AVAILABILITY) {
    fail(SCOPE, "source.availability must be pending before it can be resolved");
  }
  if (typeof options.path !== "string" || !options.path.trim()) {
    fail(SCOPE, "source path is required");
  }
  const resolved = resolveContainedReference(root, options.path);
  const { path: real, bytes } = resolved;
  const dimensions = pngDimensions(bytes);
  if (!dimensions) fail(SCOPE, "reference source must be a readable PNG raster");
  const resolvedAt = options.timestamp || new Date().toISOString();
  assertTimestamp(resolvedAt, "source.resolvedAt", SCOPE);

  const nextSource = {
    kind: reference.source.kind,
    ...(Object.hasOwn(reference.source, "requestedFrom")
      ? { requestedFrom: reference.source.requestedFrom }
      : {}),
    ...(Object.hasOwn(reference.source, "requestedAt")
      ? { requestedAt: reference.source.requestedAt }
      : {}),
    availability: "resolved",
    path: posixInside(root, real),
    width: dimensions.width,
    height: dimensions.height,
    sha256: resolved.sha256,
    resolvedAt,
  };
  const next = { ...reference, source: nextSource };
  validateReferenceEvidence(next);
  atomicWriteJson(artifact, next);
  return {
    status: "ready",
    previousAvailability: PENDING_AVAILABILITY,
    source: nextSource,
    artifact: relative,
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
  resolveReferenceSource,
  resolveContainedReference,
  referenceFileHash,
  sourceAvailability,
  validateComposition,
  validateGraybox,
  validateReferenceEvidence,
};
