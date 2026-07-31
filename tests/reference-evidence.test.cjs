"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  checkReferenceEvidence,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");

function fixedCameraReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v1",
    id: "eva-standard-time",
    source: {
      path: "reference.png",
      kind: "image",
      width: 723,
      height: 405,
      sha256: "a".repeat(64),
    },
    classification: {
      objectDimensionality: "3d",
      cameraModel: "fixed-perspective",
      interactionModel: "none",
      outputSurface: "locked-cinematic-frame",
      runtimeFamily: "fixed-camera-cinematic-3d",
    },
    spatialCues: {
      thickness: { present: true, evidence: "Visible right rail and slab side wall." },
      occlusion: { present: true, evidence: "Raised digits overlap the recessed field." },
      contactShadows: { present: true, evidence: "Digits cast short shadows onto the substrate." },
      bevelHighlights: { present: true, evidence: "Rails and glyph rims carry directional highlights." },
      perspectiveConvergence: { present: true, evidence: "Horizontal rails converge toward frame left." },
      depthOfField: { present: true, evidence: "Near right rail and distant left labels soften differently." },
    },
    route: "3d",
    confidence: 0.98,
    requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
    approval: {
      status: "approved",
      evidence: "User explicitly corrected the medium to 3D and requested a fresh implementation.",
    },
    ...overrides,
  };
}

function exactReconstructionReference(overrides = {}) {
  return {
    ...fixedCameraReference(),
    schema: "design-pipeline.reference-evidence.v2",
    intent: {
      role: "primary-target",
      requestedFidelity: "exact-reconstruction",
      effectiveFidelity: "exact-reconstruction",
      reconstructionArtifact: "reconstruction.json",
      downgrade: {
        status: "not-requested",
        evidence: "The user requested an identical reconstruction.",
      },
    },
    requiredArtifacts: [
      "reference.md",
      "scene.json",
      "3d.md",
      "graybox.png",
      "rectified-reference.png",
      "front-elevation.svg",
      "camera-calibration.json",
      "landmark-overlay.png",
      "reconstruction.json",
    ],
    ...overrides,
  };
}

test("fixed-camera cinematic 3D is valid without user camera navigation", () => {
  const result = validateReferenceEvidence(fixedCameraReference());
  assert.equal(result.classification.objectDimensionality, "3d");
  assert.equal(result.classification.interactionModel, "none");
  assert.equal(result.classification.runtimeFamily, "fixed-camera-cinematic-3d");
});

test("strong spatial evidence cannot be routed as 2D", () => {
  const reference = fixedCameraReference({
    route: "2d",
    classification: {
      ...fixedCameraReference().classification,
      objectDimensionality: "2d",
      runtimeFamily: "semantic-ui",
    },
  });
  assert.throws(() => validateReferenceEvidence(reference), /spatial route contradiction/i);
});

test("approval is a blocking readiness gate, not a schema error", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-reference-"));
  const artifact = fixedCameraReference({
    approval: { status: "pending", evidence: "Awaiting user alignment on medium classification." },
  });
  fs.writeFileSync(path.join(root, "reference-evidence.json"), `${JSON.stringify(artifact, null, 2)}\n`);
  assert.equal(checkReferenceEvidence(root).status, "blocked");
});

test("an exact primary target requires a reconstruction artifact and calibrated evidence", () => {
  const result = validateReferenceEvidence(exactReconstructionReference());
  assert.equal(result.intent.role, "primary-target");
  assert.equal(result.intent.effectiveFidelity, "exact-reconstruction");
  assert.equal(result.intent.reconstructionArtifact, "reconstruction.json");
});

test("exact fidelity cannot be silently downgraded to directional inspiration", () => {
  const reference = exactReconstructionReference({
    intent: {
      role: "inspiration",
      requestedFidelity: "exact-reconstruction",
      effectiveFidelity: "directional-inspiration",
      reconstructionArtifact: null,
      downgrade: {
        status: "not-requested",
        evidence: "The implementation was easier this way.",
      },
    },
  });
  assert.throws(
    () => validateReferenceEvidence(reference),
    /exact fidelity downgrade requires explicit user approval/i,
  );
});

test("user-approved downgrade is explicit and remains reviewable", () => {
  const reference = exactReconstructionReference({
    intent: {
      role: "inspiration",
      requestedFidelity: "exact-reconstruction",
      effectiveFidelity: "directional-inspiration",
      reconstructionArtifact: null,
      downgrade: {
        status: "approved-by-user",
        evidence: "User explicitly changed the request from exact reconstruction to inspiration.",
      },
    },
    requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
  });
  const result = validateReferenceEvidence(reference);
  assert.equal(result.intent.downgrade.status, "approved-by-user");
});

test("reference check keeps exact reconstruction blocked until calibration exists", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-exact-reference-"));
  fs.writeFileSync(
    path.join(root, "reference-evidence.json"),
    `${JSON.stringify(exactReconstructionReference(), null, 2)}\n`,
  );
  const result = checkReferenceEvidence(root);
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /reconstruction\.json/);
});

test("3D routes require scene, projection, and graybox evidence", () => {
  const reference = fixedCameraReference({
    requiredArtifacts: ["reference.md", "scene.json", "3d.md"],
  });
  assert.throws(() => validateReferenceEvidence(reference), /graybox\.png/);
});

test("approved fixed-camera evidence is ready", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-reference-"));
  fs.writeFileSync(
    path.join(root, "reference-evidence.json"),
    `${JSON.stringify(fixedCameraReference(), null, 2)}\n`,
  );
  assert.equal(checkReferenceEvidence(root).status, "ready");
});
