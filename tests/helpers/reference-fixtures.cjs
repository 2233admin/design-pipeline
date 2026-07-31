"use strict";

// Shared reference-evidence, graybox, and composition fixtures.
//
// Four test files grew their own near-identical copies of these documents. Every builder here takes
// named overrides and nothing else: a call site passes the field the test is actually exercising and
// inherits the rest, so what a test is about stays readable at the call site rather than being
// buried in a preset bundle.
//
// Schema names are written as literals rather than imported from the implementation, so a test that
// compares a fixture's schema against `referenceCore.SCHEMA_V2` is still comparing two things.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// --- temp roots and artifact writers -----------------------------------------------------------
// Cleanup stays with the caller: the files that register a `test.after` sweep keep doing so, and the
// ones that leave their roots for the OS keep doing that.

function tempRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeArtifact(root, relative, content = "evidence") {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeJson(root, relative, document) {
  writeArtifact(root, relative, `${JSON.stringify(document, null, 2)}\n`);
}

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function writeReference(root, reference) {
  writeJson(root, "reference-evidence.json", reference);
}

function referenceRoot(reference, prefix) {
  const root = tempRoot(prefix);
  writeReference(root, reference);
  return root;
}

// --- required artifact lists -------------------------------------------------------------------

const THREE_D_ARTIFACTS = ["reference.md", "scene.json", "3d.md", "graybox.png"];
const PLANAR_ARTIFACTS = ["reference.md", "graybox.png"];
const RECONSTRUCTION_ARTIFACTS = [
  "rectified-reference.png",
  "front-elevation.svg",
  "camera-calibration.json",
  "landmark-overlay.png",
  "reconstruction.json",
];
const EXACT_3D_ARTIFACTS = [...THREE_D_ARTIFACTS, ...RECONSTRUCTION_ARTIFACTS];
const EXACT_PLANAR_ARTIFACTS = [...PLANAR_ARTIFACTS, ...RECONSTRUCTION_ARTIFACTS];

// --- source blocks -----------------------------------------------------------------------------

function resolvedSource(overrides = {}) {
  return {
    path: "reference.png",
    kind: "image",
    width: 723,
    height: 405,
    sha256: "b".repeat(64),
    ...overrides,
  };
}

// A source the user described but never sent: the measured chain cannot run, and no measurement may
// be invented to stand in for it.
function pendingSource(overrides = {}) {
  return {
    path: null,
    kind: "image",
    width: null,
    height: null,
    sha256: null,
    availability: "pending",
    pendingReason: "The user described the HUD clock from memory and has not sent the still.",
    requestedFrom: "the user",
    ...overrides,
  };
}

// --- classification and spatial cue blocks -------------------------------------------------------

function fixedCameraClassification(overrides = {}) {
  return {
    objectDimensionality: "3d",
    cameraModel: "fixed-perspective",
    interactionModel: "none",
    outputSurface: "locked-cinematic-frame",
    runtimeFamily: "fixed-camera-cinematic-3d",
    ...overrides,
  };
}

function planarClassification(overrides = {}) {
  return {
    objectDimensionality: "2.5d",
    cameraModel: "fixed-orthographic",
    interactionModel: "bounded-parallax",
    outputSurface: "screen-space-ui",
    runtimeFamily: "layered-parallax-ui",
    ...overrides,
  };
}

function fixedCameraCues(overrides = {}) {
  return {
    thickness: { present: true, evidence: "Visible right rail and slab side wall." },
    occlusion: { present: true, evidence: "Raised digits overlap the recessed field." },
    contactShadows: { present: true, evidence: "Digits cast short shadows onto the substrate." },
    bevelHighlights: { present: true, evidence: "Rails and glyph rims carry directional highlights." },
    perspectiveConvergence: { present: true, evidence: "Horizontal rails converge toward frame left." },
    depthOfField: { present: true, evidence: "Near right rail and distant left labels soften differently." },
    ...overrides,
  };
}

function planarCues(overrides = {}) {
  return {
    thickness: { present: true, evidence: "Board plates carry a visible extruded edge." },
    occlusion: { present: true, evidence: "Register cards overlap the backing plate." },
    contactShadows: { present: true, evidence: "Cards drop a short shadow onto the plate." },
    bevelHighlights: { present: false, evidence: "Edges read flat with no directional highlight." },
    perspectiveConvergence: { present: false, evidence: "Every rail stays parallel to the frame." },
    depthOfField: { present: false, evidence: "All layers are uniformly sharp." },
    ...overrides,
  };
}

// --- intent blocks -------------------------------------------------------------------------------

function directionalIntent(overrides = {}) {
  return {
    role: "inspiration",
    requestedFidelity: "directional-inspiration",
    effectiveFidelity: "directional-inspiration",
    reconstructionArtifact: null,
    downgrade: {
      status: "not-requested",
      evidence: "The user asked for a planar layered treatment, not a rebuild.",
    },
    ...overrides,
  };
}

function exactIntent(overrides = {}) {
  return {
    role: "primary-target",
    requestedFidelity: "exact-reconstruction",
    effectiveFidelity: "exact-reconstruction",
    reconstructionArtifact: "reconstruction.json",
    downgrade: {
      status: "not-requested",
      evidence: "The user asked for an identical rebuild of the HUD clock.",
    },
    ...overrides,
  };
}

// --- graybox blocks ------------------------------------------------------------------------------

const SUPPRESSED_TREATMENTS = ["materials", "glow", "bloom", "depth-of-field", "scanlines", "grading"];
const GRAYBOX_DISABLED_LAYERS = ["emissive", "optical", "texture"];

function rootAttributeMode(overrides = {}) {
  return {
    mechanism: "root-attribute",
    token: "data-graybox",
    disables: [...GRAYBOX_DISABLED_LAYERS],
    ...overrides,
  };
}

function queryParameterMode(overrides = {}) {
  return {
    mechanism: "query-parameter",
    token: "?graybox=1",
    disables: [...GRAYBOX_DISABLED_LAYERS],
    ...overrides,
  };
}

function matchingRegions(ids, describe) {
  return ids.map((id) => ({ id, finding: describe(id), status: "matches" }));
}

// `capturedAt` and `comparison` are deliberately not defaulted: they are what a graybox test is
// usually about, so every call site states them.
function grayboxBlock(overrides = {}) {
  return {
    capture: "graybox.png",
    viewport: { width: 723, height: 405 },
    runtimeMode: rootAttributeMode(),
    suppressed: [...SUPPRESSED_TREATMENTS],
    approval: {
      status: "approved",
      evidence: "User compared the layout-only capture against the reference before any treatment.",
    },
    ...overrides,
  };
}

// --- composition blocks ---------------------------------------------------------------------------

// Two regions whose ids the shared graybox comparisons address, so the bidirectional binding is
// satisfied by default and a failure is the one under test.
function boardRegisterComposition() {
  return {
    uniform: false,
    regions: [
      { id: "board", rows: 2, columns: 1, breaksFrom: ["register"] },
      { id: "register", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
}

// --- reference documents ---------------------------------------------------------------------------

function fixedCameraReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v1",
    id: "eva-standard-time",
    source: resolvedSource(),
    classification: fixedCameraClassification(),
    spatialCues: fixedCameraCues(),
    route: "3d",
    confidence: 0.98,
    requiredArtifacts: [...THREE_D_ARTIFACTS],
    approval: {
      status: "approved",
      evidence: "User corrected the medium to 3D and requested a fresh implementation.",
    },
    ...overrides,
  };
}

function planarReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v2",
    id: "eva-standard-time",
    source: resolvedSource(),
    composition: boardRegisterComposition(),
    classification: planarClassification(),
    spatialCues: planarCues(),
    route: "2.5d",
    confidence: 0.88,
    requiredArtifacts: [...PLANAR_ARTIFACTS],
    intent: directionalIntent(),
    approval: {
      status: "approved",
      evidence: "User confirmed the layered planar reading of the reference.",
    },
    ...overrides,
  };
}

// The exact combination the unconditional gate exists for: planar route, primary target, exact
// reconstruction requested.
function exactPlanarReference(overrides = {}) {
  return planarReference({
    requiredArtifacts: [...EXACT_PLANAR_ARTIFACTS],
    intent: exactIntent(),
    ...overrides,
  });
}

module.exports = {
  EXACT_3D_ARTIFACTS,
  EXACT_PLANAR_ARTIFACTS,
  GRAYBOX_DISABLED_LAYERS,
  PLANAR_ARTIFACTS,
  SUPPRESSED_TREATMENTS,
  THREE_D_ARTIFACTS,
  boardRegisterComposition,
  directionalIntent,
  exactIntent,
  exactPlanarReference,
  fixedCameraClassification,
  fixedCameraCues,
  fixedCameraReference,
  grayboxBlock,
  matchingRegions,
  pendingSource,
  planarClassification,
  planarCues,
  planarReference,
  queryParameterMode,
  readJson,
  referenceRoot,
  resolvedSource,
  rootAttributeMode,
  tempRoot,
  writeArtifact,
  writeJson,
  writeReference,
};
