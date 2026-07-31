"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  checkReferenceEvidence,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");
const fixtures = require("./helpers/reference-fixtures.cjs");

const {
  EXACT_3D_ARTIFACTS,
  fixedCameraClassification,
  tempRoot,
  writeReference,
} = fixtures;

function fixedCameraReference(overrides = {}) {
  return fixtures.fixedCameraReference({
    source: fixtures.resolvedSource({ sha256: "a".repeat(64) }),
    approval: {
      status: "approved",
      evidence: "User explicitly corrected the medium to 3D and requested a fresh implementation.",
    },
    ...overrides,
  });
}

// The graybox capture and the structural comparison the unconditional gate asks for. It is
// qualitative: nothing in this file writes the source raster, so nothing here may claim a measured
// comparison against it.
function grayboxBlock(overrides = {}) {
  return fixtures.grayboxBlock({
    capturedAt: "2026-07-23T09:00:00.000Z",
    comparison: {
      mode: "qualitative",
      regions: [
        { id: "slab", finding: "Slab spans the same share of the frame as the reference.", status: "matches" },
        { id: "readout", finding: "Readout sat left of the label; moved above it.", status: "corrected" },
      ],
    },
    ...overrides,
  });
}

// A v2 reference owes a per-region structural breakdown, and the graybox comparison above
// addresses exactly these ids.
function composition() {
  return {
    uniform: false,
    regions: [
      { id: "slab", rows: 2, columns: 1, breaksFrom: ["readout"] },
      { id: "readout", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
}

function exactReconstructionReference(overrides = {}) {
  return fixedCameraReference({
    schema: "design-pipeline.reference-evidence.v2",
    composition: composition(),
    intent: fixtures.exactIntent({
      downgrade: {
        status: "not-requested",
        evidence: "The user requested an identical reconstruction.",
      },
    }),
    requiredArtifacts: [...EXACT_3D_ARTIFACTS],
    ...overrides,
  });
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
    classification: fixedCameraClassification({
      objectDimensionality: "2d",
      runtimeFamily: "semantic-ui",
    }),
  });
  assert.throws(() => validateReferenceEvidence(reference), /spatial route contradiction/i);
});

test("approval is a blocking readiness gate, not a schema error", () => {
  const root = tempRoot("design-pipeline-reference-");
  writeReference(root, fixedCameraReference({
    approval: { status: "pending", evidence: "Awaiting user alignment on medium classification." },
  }));
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
    intent: fixtures.directionalIntent({
      requestedFidelity: "exact-reconstruction",
      downgrade: {
        status: "not-requested",
        evidence: "The implementation was easier this way.",
      },
    }),
  });
  assert.throws(
    () => validateReferenceEvidence(reference),
    /exact fidelity downgrade requires explicit user approval/i,
  );
});

test("user-approved downgrade is explicit and remains reviewable", () => {
  const reference = exactReconstructionReference({
    intent: fixtures.directionalIntent({
      requestedFidelity: "exact-reconstruction",
      downgrade: {
        status: "approved-by-user",
        evidence: "User explicitly changed the request from exact reconstruction to inspiration.",
      },
    }),
    requiredArtifacts: [...fixtures.THREE_D_ARTIFACTS],
  });
  const result = validateReferenceEvidence(reference);
  assert.equal(result.intent.downgrade.status, "approved-by-user");
});

test("reference check keeps exact reconstruction blocked until calibration exists", () => {
  const root = tempRoot("design-pipeline-exact-reference-");
  writeReference(root, exactReconstructionReference());
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

test("approved fixed-camera evidence is ready once the graybox gate is satisfied", () => {
  const root = tempRoot("design-pipeline-reference-");

  // Approval alone is not readiness. Structural proof precedes optical treatment on every route,
  // so an approved reference with no layout-only capture is blocked, not ready. This assertion
  // previously read `ready`, which was the behaviour the unconditional graybox gate exists to end.
  writeReference(root, fixedCameraReference());
  const withoutGraybox = checkReferenceEvidence(root);
  assert.equal(withoutGraybox.status, "blocked");
  assert.equal(withoutGraybox.reason, "graybox-missing");
  assert.equal(withoutGraybox.stages.graybox.status, "blocked");

  fs.writeFileSync(path.join(root, "graybox.png"), "layout-only capture");
  writeReference(root, fixedCameraReference({ graybox: grayboxBlock() }));
  const ready = checkReferenceEvidence(root);
  assert.equal(ready.status, "ready", ready.blockers?.join("\n"));
  assert.equal(ready.stages.graybox.status, "ready");
});
