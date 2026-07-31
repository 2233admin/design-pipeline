"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  checkReferenceEvidence,
  sourceAvailability,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");
const { checkReconstruction } = require("../skill/scripts/reconstruction-core.cjs");
const {
  exactReconstruction,
  readyRoot,
} = require("./fixtures/reconstruction-fixture.cjs");

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const schemaFile = path.resolve(
  __dirname,
  "../skill/references/reference-evidence.schema.json",
);

const RESOLVED_SOURCE = {
  path: "reference.png",
  kind: "image",
  width: 723,
  height: 405,
  sha256: "a".repeat(64),
};

const PENDING_SOURCE = {
  availability: "pending",
  path: null,
  kind: "image",
  width: null,
  height: null,
  sha256: null,
  pendingReason: "The reference was pasted into the conversation and never written to the repository.",
  requestedFrom: "user",
};

const EXACT_ARTIFACTS = [
  "reference.md",
  "scene.json",
  "3d.md",
  "graybox.png",
  "rectified-reference.png",
  "front-elevation.svg",
  "camera-calibration.json",
  "landmark-overlay.png",
  "reconstruction.json",
];

// A v2 reference owes a per-region structural breakdown. It is authored from the reference, so it
// stays the same whether or not the raster was ever sent: the pending state removes measurement,
// not the reading of the frame the user described.
function composition() {
  return {
    uniform: false,
    regions: [
      { id: "hour-register", rows: 2, columns: 1, breaksFrom: ["minute-register"] },
      { id: "minute-register", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
}

function exactReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v2",
    id: "eva-standard-time",
    source: { ...RESOLVED_SOURCE },
    composition: composition(),
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
    requiredArtifacts: [...EXACT_ARTIFACTS],
    approval: {
      status: "approved",
      evidence: "User confirmed the medium and requested an exact reconstruction.",
    },
    ...overrides,
  };
}

function pendingReference(overrides = {}) {
  return exactReference({ source: { ...PENDING_SOURCE }, ...overrides });
}

function referenceRoot(reference, prefix = "design-pipeline-pending-source-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.writeFileSync(
    path.join(root, "reference-evidence.json"),
    `${JSON.stringify(reference, null, 2)}\n`,
  );
  return root;
}

function reconstructionRoot(reconstruction = exactReconstruction(), reference = pendingReference()) {
  const root = readyRoot(reconstruction);
  fs.writeFileSync(
    path.join(root, "reference-evidence.json"),
    `${JSON.stringify(reference, null, 2)}\n`,
  );
  return root;
}

function measuredFinalReconstruction() {
  const base = exactReconstruction();
  return exactReconstruction({
    finalComparison: {
      ...base.finalComparison,
      status: "measured",
      metrics: { pixelDifferenceRatio: 0.018, ssim: 0.982 },
      evidencePort: {
        ...base.finalComparison.evidencePort,
        status: "ready",
        lastProbe: {
          ok: true,
          evidence: "Independent comparator produced the bound fidelity receipt.",
        },
      },
      approval: {
        status: "approved",
        evidence: "User approved the measured locked frame.",
      },
    },
  });
}

test("a reference supplied only in conversation is recorded as pending, never omitted", () => {
  const result = validateReferenceEvidence(pendingReference());
  assert.equal(result.source.availability, "pending");
  assert.equal(sourceAvailability(result), "pending");
  assert.match(result.source.pendingReason, /conversation/);
  assert.equal(result.source.requestedFrom, "user");
  assert.equal(result.source.path, null);
  assert.equal(result.source.width, null);
  assert.equal(result.source.height, null);
  assert.equal(result.source.sha256, null);
  // Everything the pipeline can still know is still recorded.
  assert.equal(result.route, "3d");
  assert.equal(result.classification.runtimeFamily, "fixed-camera-cinematic-3d");
  assert.equal(result.spatialCues.thickness.present, true);
  assert.equal(result.intent.requestedFidelity, "exact-reconstruction");
  assert.deepEqual(result.requiredArtifacts, EXACT_ARTIFACTS);
  assert.equal(result.approval.status, "approved");
});

test("a pending source blocks the reference check with reason source-pending", () => {
  const root = referenceRoot(pendingReference());
  const result = checkReferenceEvidence(root);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "source-pending");
  assert.match(result.blockers.join("\n"), /source\.availability is pending/);
});

test("a pending source is a readiness state, not a contract failure", () => {
  const root = referenceRoot(pendingReference());
  const result = checkReferenceEvidence(root);
  assert.equal(result.contractValid, true);
  assert.doesNotThrow(() => validateReferenceEvidence(result.reference));
});

test("the CLI separates a pending source from an invalid contract by exit code", () => {
  const pendingRoot = referenceRoot(pendingReference());
  const pending = childProcess.spawnSync(
    process.execPath,
    [cli, "reference", "check", "--root", pendingRoot, "--change-root", pendingRoot, "--json"],
    { cwd: pendingRoot, encoding: "utf8", windowsHide: true },
  );
  assert.equal(pending.status, 2, pending.stderr || pending.stdout);
  const pendingResult = JSON.parse(pending.stdout);
  assert.equal(pendingResult.ok, true);
  assert.equal(pendingResult.status, "blocked");
  assert.equal(pendingResult.reason, "source-pending");
  assert.equal(pendingResult.contractValid, true);

  const brokenRoot = referenceRoot(
    pendingReference({
      source: { ...PENDING_SOURCE, pendingReason: undefined, requestedFrom: undefined },
    }),
    "design-pipeline-pending-source-invalid-",
  );
  const broken = childProcess.spawnSync(
    process.execPath,
    [cli, "reference", "check", "--root", brokenRoot, "--change-root", brokenRoot, "--json"],
    { cwd: brokenRoot, encoding: "utf8", windowsHide: true },
  );
  assert.equal(broken.status, 1, broken.stderr || broken.stdout);
  assert.equal(JSON.parse(broken.stdout).ok, false);
});

test("a resolved source cannot omit its hash", () => {
  const nulled = exactReference({ source: { ...RESOLVED_SOURCE, sha256: null } });
  assert.throws(() => validateReferenceEvidence(nulled), /sha256/i);

  const absent = exactReference();
  delete absent.source.sha256;
  assert.throws(() => validateReferenceEvidence(absent), /sha256/i);

  const declaredResolved = exactReference({
    source: { ...RESOLVED_SOURCE, availability: "resolved", sha256: null },
  });
  assert.throws(() => validateReferenceEvidence(declaredResolved), /sha256/i);
});

test("a resolved source cannot omit its path or dimensions either", () => {
  for (const key of ["path", "width", "height"]) {
    const reference = exactReference({ source: { ...RESOLVED_SOURCE, [key]: null } });
    assert.throws(() => validateReferenceEvidence(reference), new RegExp(key));
  }
});

test("a pending source requires both pendingReason and requestedFrom", () => {
  const withoutReason = pendingReference();
  delete withoutReason.source.pendingReason;
  assert.throws(() => validateReferenceEvidence(withoutReason), /pendingReason/);

  const withoutRequestedFrom = pendingReference();
  delete withoutRequestedFrom.source.requestedFrom;
  assert.throws(() => validateReferenceEvidence(withoutRequestedFrom), /requestedFrom/);
});

test("a pending source cannot claim it was already resolved", () => {
  const reference = pendingReference({
    source: { ...PENDING_SOURCE, resolvedAt: "2026-07-31T00:00:00.000Z" },
  });
  assert.throws(() => validateReferenceEvidence(reference), /resolvedAt/);
});

test("absent availability keeps existing documents valid and defaults to resolved", () => {
  const reference = exactReference();
  assert.equal(Object.hasOwn(reference.source, "availability"), false);
  const result = validateReferenceEvidence(reference);
  assert.equal(sourceAvailability(result), "resolved");

  // The existing v1 shape stays valid too.
  const legacy = exactReference();
  delete legacy.intent;
  legacy.schema = "design-pipeline.reference-evidence.v1";
  legacy.requiredArtifacts = ["reference.md", "scene.json", "3d.md", "graybox.png"];
  assert.equal(sourceAvailability(validateReferenceEvidence(legacy)), "resolved");

  // A document with no reference contract at all is still treated as resolved.
  const root = referenceRoot(exactReference(), "design-pipeline-resolved-default-");
  const check = checkReferenceEvidence(root);
  assert.equal(check.status, "blocked");
  assert.equal(check.reason, "reconstruction-evidence-missing");
});

test("the published schema declares availability with a resolved default", () => {
  const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8"));
  const availability = schema.properties.source.properties.availability;
  assert.deepEqual(availability.enum, ["resolved", "pending"]);
  assert.equal(availability.default, "resolved");
  assert.equal(schema.properties.source.required.includes("availability"), false);
});

test("the geometry stage refuses to measure a pending source", () => {
  const root = reconstructionRoot();
  const result = checkReconstruction(root, { stage: "geometry" });
  assert.equal(result.status, "blocked");
  assert.notEqual(result.status, "fidelity-limited");
  assert.equal(result.reason, "source-pending");
  assert.equal(result.measurements, null);
  assert.equal(result.source.availability, "pending");
  assert.match(result.blockers.join("\n"), /pending/);
});

test("the final stage refuses to measure a pending source", () => {
  const root = reconstructionRoot(measuredFinalReconstruction());
  const result = checkReconstruction(root, { stage: "final" });
  assert.equal(result.status, "blocked");
  assert.notEqual(result.status, "fidelity-limited");
  assert.equal(result.reason, "source-pending");
  assert.equal(result.measurements, null);
});

test("a pending source is never reported as fidelity-limited", () => {
  const drifted = exactReconstruction();
  drifted.landmarks.points[7].render = { x: 674, y: 329 };

  const resolvedRoot = reconstructionRoot(drifted, exactReference());
  assert.equal(
    checkReconstruction(resolvedRoot, { stage: "geometry" }).status,
    "fidelity-limited",
  );

  const pendingRoot = reconstructionRoot(drifted, pendingReference());
  for (const stage of ["geometry", "final"]) {
    const result = checkReconstruction(pendingRoot, { stage });
    assert.equal(result.status, "blocked");
    assert.equal(result.reason, "source-pending");
    assert.deepEqual(result.mismatches, []);
    assert.equal(result.measurements, null);
  }
});

test("the reconstruction CLI reports a pending source as blocked, not fidelity-limited", () => {
  const root = reconstructionRoot();
  const child = childProcess.spawnSync(
    process.execPath,
    [
      cli,
      "reconstruction",
      "check",
      "--root",
      root,
      "--change-root",
      root,
      "--stage",
      "geometry",
      "--json",
    ],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  assert.equal(child.status, 2, child.stderr || child.stdout);
  const result = JSON.parse(child.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "source-pending");
});

test("a pending source does not move requested or effective fidelity", () => {
  const root = referenceRoot(pendingReference());
  const result = checkReferenceEvidence(root);
  assert.equal(result.reference.intent.requestedFidelity, "exact-reconstruction");
  assert.equal(result.reference.intent.effectiveFidelity, "exact-reconstruction");
  assert.equal(result.reference.intent.downgrade.status, "not-requested");
});

test("a pending source cannot be used as evidence for an implicit downgrade", () => {
  const reference = pendingReference({
    intent: {
      role: "inspiration",
      requestedFidelity: "exact-reconstruction",
      effectiveFidelity: "directional-inspiration",
      reconstructionArtifact: null,
      downgrade: {
        status: "not-requested",
        evidence: "The reference image was never written to disk.",
      },
    },
    requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
  });
  assert.throws(
    () => validateReferenceEvidence(reference),
    /exact fidelity downgrade requires explicit user approval/i,
  );
});
