"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  checkReconstruction,
  validateReconstruction,
} = require("../skill/scripts/reconstruction-core.cjs");
const {
  checkReferenceEvidence,
  sourceAvailability,
  validateReferenceEvidence,
} = require("../skill/scripts/reference-evidence-core.cjs");
const {
  exactReconstruction,
  readyRoot,
} = require("./fixtures/reconstruction-fixture.cjs");

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const CAPTURED_AT = "2026-02-11T09:00:00.000Z";
const REQUESTED_AT = "2026-02-11T08:30:00.000Z";

function grayboxRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-graybox-"));
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

// A source the user described but never sent: the measured chain cannot run, and no measurement
// may be invented to stand in for it.
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
    requestedAt: REQUESTED_AT,
    ...overrides,
  };
}

function grayboxComparison(overrides = {}) {
  return {
    mode: "qualitative",
    regions: [
      {
        id: "board",
        finding: "Board unit spans the same share of the frame width as the reference.",
        status: "matches",
      },
      {
        id: "register",
        finding: "Register label sat beside the readout; moved above it.",
        status: "corrected",
      },
    ],
    ...overrides,
  };
}

function grayboxBlock(overrides = {}) {
  return {
    capture: "graybox.png",
    capturedAt: CAPTURED_AT,
    viewport: { width: 723, height: 405 },
    // The expanded form. A bare token would be a declaration the gate cannot check, and the tests
    // below that expect `ready` are entitled to a mode whose disabled layers are actually named.
    runtimeMode: {
      mechanism: "query-parameter",
      token: "?graybox=1",
      disables: ["emissive", "optical", "texture"],
    },
    suppressed: ["materials", "glow", "bloom", "depth-of-field", "scanlines", "grading"],
    comparison: grayboxComparison(),
    approval: {
      status: "approved",
      evidence: "User compared the layout-only capture against the reference before any treatment.",
    },
    ...overrides,
  };
}

// The per-region structural breakdown names exactly the two regions the graybox comparison
// addresses. A v2 reference owes one, and the graybox binding is checked against these ids.
function planarComposition() {
  return {
    uniform: false,
    regions: [
      { id: "board", rows: 2, columns: 1, breaksFrom: ["register"] },
      { id: "register", rows: 1, columns: 3, breaksFrom: [] },
    ],
  };
}

function planarReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v2",
    id: "jst-hud-clock",
    source: resolvedSource(),
    composition: planarComposition(),
    classification: {
      objectDimensionality: "2.5d",
      cameraModel: "fixed-orthographic",
      interactionModel: "bounded-parallax",
      outputSurface: "screen-space-ui",
      runtimeFamily: "layered-parallax-ui",
    },
    spatialCues: {
      thickness: { present: true, evidence: "Board plates carry a visible extruded edge." },
      occlusion: { present: true, evidence: "Register cards overlap the backing plate." },
      contactShadows: { present: true, evidence: "Cards drop a short shadow onto the plate." },
      bevelHighlights: { present: false, evidence: "Edges read flat with no directional highlight." },
      perspectiveConvergence: { present: false, evidence: "Every rail stays parallel to the frame." },
      depthOfField: { present: false, evidence: "All layers are uniformly sharp." },
    },
    route: "2.5d",
    confidence: 0.88,
    requiredArtifacts: ["reference.md", "graybox.png"],
    intent: {
      role: "inspiration",
      requestedFidelity: "directional-inspiration",
      effectiveFidelity: "directional-inspiration",
      reconstructionArtifact: null,
      downgrade: {
        status: "not-requested",
        evidence: "The user asked for a planar layered treatment, not a rebuild.",
      },
    },
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
    requiredArtifacts: [
      "reference.md",
      "graybox.png",
      "rectified-reference.png",
      "front-elevation.svg",
      "camera-calibration.json",
      "landmark-overlay.png",
      "reconstruction.json",
    ],
    intent: {
      role: "primary-target",
      requestedFidelity: "exact-reconstruction",
      effectiveFidelity: "exact-reconstruction",
      reconstructionArtifact: "reconstruction.json",
      downgrade: {
        status: "not-requested",
        evidence: "The user asked for an identical rebuild of the HUD clock.",
      },
    },
    ...overrides,
  });
}

function fixedCameraReference(overrides = {}) {
  return {
    schema: "design-pipeline.reference-evidence.v1",
    id: "eva-standard-time",
    source: resolvedSource(),
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
      depthOfField: { present: true, evidence: "Near and distant rails soften differently." },
    },
    route: "3d",
    confidence: 0.98,
    requiredArtifacts: ["reference.md", "scene.json", "3d.md", "graybox.png"],
    approval: {
      status: "approved",
      evidence: "User corrected the medium to 3D and requested a fresh implementation.",
    },
    ...overrides,
  };
}

test("a planar route with reference evidence is gated by graybox until a capture and comparison exist", () => {
  const root = grayboxRoot();
  writeJson(root, "reference-evidence.json", planarReference());

  const missing = checkReconstruction(root, { stage: "graybox" });
  assert.equal(missing.stage, "graybox");
  assert.equal(missing.status, "blocked");
  assert.equal(missing.reason, "graybox-missing");
  // The gate is reachable with no reconstruction artifact at all: it costs one screenshot.
  assert.equal(fs.existsSync(path.join(root, "reconstruction.json")), false);

  writeJson(root, "reference-evidence.json", planarReference({ graybox: grayboxBlock() }));
  const withoutCapture = checkReconstruction(root, { stage: "graybox" });
  assert.equal(withoutCapture.status, "blocked");
  assert.equal(withoutCapture.reason, "graybox-capture-missing");
  assert.match(withoutCapture.blockers.join("\n"), /graybox\.png/);

  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({ comparison: grayboxComparison({ regions: [] }) }),
  }));
  const withoutComparison = checkReconstruction(root, { stage: "graybox" });
  assert.equal(withoutComparison.status, "blocked");
  assert.equal(withoutComparison.reason, "graybox-comparison-missing");

  writeJson(root, "reference-evidence.json", planarReference({ graybox: grayboxBlock() }));
  const ready = checkReconstruction(root, { stage: "graybox" });
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.reasons, []);
  assert.equal(ready.carrier, "reference-evidence.json");
});

test("an open graybox region keeps the gate blocked before any optical treatment", () => {
  const root = grayboxRoot();
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({
      comparison: grayboxComparison({
        regions: [
          { id: "board", finding: "Board unit reads roughly 40% oversized.", status: "open" },
          { id: "register", finding: "Register label sits above the readout.", status: "matches" },
        ],
      }),
      approval: { status: "pending", evidence: "Structural mismatch is still unresolved." },
    }),
  }));
  const result = checkReconstruction(root, { stage: "graybox" });
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "graybox-region-open");
  assert.match(result.blockers.join("\n"), /board/);
});

test(
  "REGRESSION: 2.5d + primary-target + exact-reconstruction + unavailable source is still gated by graybox",
  () => {
    // This exact combination fell between the 3d/hybrid graybox rule and the measured geometry
    // rule and previously triggered no look-before-polish gate at all.
    const root = grayboxRoot();
    writeJson(root, "reference-evidence.json", exactPlanarReference({ source: pendingSource() }));
    const reference = validateReferenceEvidence(readJson(root, "reference-evidence.json"));
    assert.equal(reference.route, "2.5d");
    assert.equal(reference.intent.role, "primary-target");
    assert.equal(reference.intent.effectiveFidelity, "exact-reconstruction");
    assert.equal(sourceAvailability(reference), "pending");

    const referenceCheck = checkReferenceEvidence(root);
    assert.equal(referenceCheck.status, "blocked");
    assert.equal(referenceCheck.reason, "source-pending");
    assert.equal(referenceCheck.contractValid, true);
    // The unavailable source moves the verification claim, never the requested fidelity.
    assert.equal(referenceCheck.reference.intent.requestedFidelity, "exact-reconstruction");
    assert.equal(referenceCheck.reference.intent.downgrade.status, "not-requested");

    const blocked = checkReconstruction(root, { stage: "graybox" });
    assert.equal(blocked.stage, "graybox");
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.reason, "graybox-missing");
    assert.equal(blocked.source.availability, "pending");

    // And the gate is satisfiable without the source: a layout-only capture plus a written
    // structural comparison is all it asks for.
    writeArtifact(root, "graybox.png");
    writeJson(root, "reference-evidence.json", exactPlanarReference({
      source: pendingSource(),
      graybox: grayboxBlock(),
    }));
    const gated = checkReconstruction(root, { stage: "graybox" });
    assert.equal(gated.status, "ready");
    assert.equal(gated.comparisonMode, "qualitative");
    assert.equal(gated.fidelityEvidence, false);
  },
);

test("an unavailable source still requires a graybox and a qualitative one is not fidelity evidence", () => {
  const root = grayboxRoot();
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", planarReference({
    source: pendingSource(),
    graybox: grayboxBlock({ comparison: grayboxComparison({ mode: "measured" }) }),
  }));
  const unmeasurable = checkReconstruction(root, { stage: "graybox" });
  assert.equal(unmeasurable.status, "blocked");
  assert.equal(unmeasurable.reason, "graybox-comparison-unmeasurable");

  writeJson(root, "reference-evidence.json", planarReference({
    source: pendingSource(),
    graybox: grayboxBlock(),
  }));
  const qualitative = checkReconstruction(root, { stage: "graybox" });
  assert.equal(qualitative.status, "ready");
  assert.equal(qualitative.comparisonMode, "qualitative");
  assert.equal(qualitative.fidelityEvidence, false);

  // Measurability is read from disk, not from the declaration. This root declares a resolved
  // source at `reference.png` but that raster was never written here, so nothing can be measured
  // against it: the measured claim blocks and grants no fidelity evidence. The declared mode is
  // still reported as declared rather than quietly rewritten - `measurable` is what says the
  // evidence could not support it.
  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({ comparison: grayboxComparison({ mode: "measured" }) }),
  }));
  const unwritten = checkReconstruction(root, { stage: "graybox" });
  assert.equal(unwritten.status, "blocked");
  assert.equal(unwritten.reason, "graybox-comparison-unmeasurable");
  assert.equal(unwritten.measurable, false);
  assert.equal(unwritten.fidelityEvidence, false);
  assert.match(unwritten.blockers.join("\n"), /reference\.png/);

  // Once the declared raster is actually on disk the same document measures, and only then is the
  // comparison fidelity evidence.
  writeArtifact(root, "reference.png");
  const measured = checkReconstruction(root, { stage: "graybox" });
  assert.equal(measured.status, "ready");
  assert.equal(measured.comparisonMode, "measured");
  assert.equal(measured.measurable, true);
  assert.equal(measured.fidelityEvidence, true);
});

test("a capture claiming suppression without a declared runtime graybox mode is blocked", () => {
  const root = grayboxRoot();
  writeArtifact(root, "graybox.png");
  const undeclared = grayboxBlock();
  delete undeclared.runtimeMode;
  writeJson(root, "reference-evidence.json", planarReference({ graybox: undeclared }));
  const result = checkReconstruction(root, { stage: "graybox" });
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "graybox-mode-undeclared");

  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({ runtimeMode: null }),
  }));
  assert.equal(checkReconstruction(root, { stage: "graybox" }).reason, "graybox-mode-undeclared");

  // A bare token declares a mode but never says what it turns off, so nothing here can be checked
  // against the emissive, optical, and texture layers. An unverifiable declaration is not evidence
  // that they were disabled: the stage blocks, and the document stays contract-valid.
  const bareToken = planarReference({ graybox: grayboxBlock({ runtimeMode: "?graybox=1" }) });
  writeJson(root, "reference-evidence.json", bareToken);
  const unverifiable = checkReconstruction(root, { stage: "graybox" });
  assert.equal(unverifiable.status, "blocked");
  assert.equal(unverifiable.reason, "graybox-mode-unverifiable");
  assert.match(unverifiable.blockers.join("\n"), /emissive, optical, texture/);
  assert.doesNotThrow(() => validateReferenceEvidence(bareToken));

  writeJson(root, "reference-evidence.json", planarReference({
    graybox: grayboxBlock({
      suppressed: ["materials", "glow", "bloom"],
    }),
  }));
  const partial = checkReconstruction(root, { stage: "graybox" });
  assert.equal(partial.status, "blocked");
  assert.equal(partial.reason, "graybox-suppression-incomplete");
  assert.match(partial.blockers.join("\n"), /depth-of-field/);
});

test("a declared graybox mode that leaves a runtime layer enabled is blocked", () => {
  const root = readyRoot(exactReconstruction({
    graybox: grayboxBlock({
      runtimeMode: {
        mechanism: "root-attribute",
        token: "data-graybox",
        disables: ["emissive", "optical"],
      },
    }),
  }));
  writeArtifact(root, "graybox.png");
  const incomplete = checkReconstruction(root, { stage: "graybox" });
  assert.equal(incomplete.status, "blocked");
  assert.equal(incomplete.reason, "graybox-mode-incomplete");
  assert.match(incomplete.blockers.join("\n"), /texture/);

  const complete = readyRoot(exactReconstruction({
    graybox: grayboxBlock({
      runtimeMode: {
        mechanism: "root-attribute",
        token: "data-graybox",
        disables: ["emissive", "optical", "texture"],
      },
    }),
  }));
  writeArtifact(complete, "graybox.png");
  const ready = checkReconstruction(complete, { stage: "graybox" });
  assert.equal(ready.status, "ready");
  assert.equal(ready.carrier, "reconstruction.json");
});

test("a blocked geometry stage and a ready graybox stage are reported separately", () => {
  const root = readyRoot(exactReconstruction({ graybox: grayboxBlock() }));
  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", exactPlanarReference({
    id: "eva-standard-time",
    source: pendingSource(),
  }));

  const geometry = checkReconstruction(root, { stage: "geometry" });
  assert.equal(geometry.status, "blocked");
  assert.equal(geometry.reason, "source-pending");
  // A missing measurement is a status, never a fabricated number.
  assert.equal(geometry.measurements, null);
  assert.equal(geometry.stages.geometry.status, "blocked");
  assert.equal(geometry.stages.graybox.status, "ready");
  assert.equal(geometry.stages.graybox.reason, null);

  // Optical treatment is governed by the graybox stage alone, so the blocked geometry stage does
  // not hold the change back.
  const graybox = checkReconstruction(root, { stage: "graybox" });
  assert.equal(graybox.status, "ready");
  assert.equal(graybox.source.availability, "pending");
});

test("both stages blocked report distinct reasons so the process gap stays visible", () => {
  const root = readyRoot();
  writeJson(root, "reference-evidence.json", exactPlanarReference({
    id: "eva-standard-time",
    source: pendingSource(),
  }));

  const geometry = checkReconstruction(root, { stage: "geometry" });
  assert.equal(geometry.stages.geometry.status, "blocked");
  assert.equal(geometry.stages.geometry.reason, "source-pending");
  assert.equal(geometry.stages.graybox.status, "blocked");
  // `graybox-missing` is a process gap; `source-pending` is the environmental limitation. They are
  // never collapsed into one blocker.
  assert.equal(geometry.stages.graybox.reason, "graybox-missing");
  assert.notEqual(geometry.stages.graybox.reason, geometry.stages.geometry.reason);
});

test("a pre-existing change with no graybox block is blocked rather than invalid", () => {
  const reconstruction = exactReconstruction();
  assert.equal(Object.hasOwn(reconstruction, "graybox"), false);
  assert.doesNotThrow(() => validateReconstruction(reconstruction));

  const root = readyRoot(reconstruction);
  const graybox = checkReconstruction(root, { stage: "graybox" });
  assert.equal(graybox.status, "blocked");
  assert.equal(graybox.reason, "graybox-missing");
  assert.equal(graybox.graybox, null);
  assert.equal(graybox.carrier, null);

  // The measured chain keeps its existing behaviour.
  const geometry = checkReconstruction(root, { stage: "geometry" });
  assert.equal(geometry.status, "ready");
  assert.equal(geometry.stages.graybox.status, "blocked");
});

test("3D routes still require graybox.png by name and the stage checks that same capture", () => {
  assert.doesNotThrow(() => validateReferenceEvidence(fixedCameraReference()));
  assert.throws(
    () => validateReferenceEvidence(fixedCameraReference({
      requiredArtifacts: ["reference.md", "scene.json", "3d.md"],
    })),
    /graybox\.png/,
  );

  const root = grayboxRoot();
  writeJson(root, "reference-evidence.json", fixedCameraReference({
    graybox: grayboxBlock({ comparison: grayboxComparison({ mode: "measured" }) }),
  }));
  const missing = checkReconstruction(root, { stage: "graybox" });
  assert.equal(missing.status, "blocked");
  assert.equal(missing.reason, "graybox-capture-missing");
  assert.match(missing.blockers.join("\n"), /graybox\.png/);

  // This root declares a resolved source at `reference.png`, and the comparison above claims
  // `measured`. Measurability is read from disk, so the raster the document names has to actually
  // be here - otherwise the measured claim blocks and the assertion below would be asserting
  // fidelity evidence that nothing produced.
  writeArtifact(root, "graybox.png");
  writeArtifact(root, "reference.png");
  const ready = checkReconstruction(root, { stage: "graybox" });
  assert.equal(ready.status, "ready");
  assert.equal(ready.graybox.capture, "graybox.png");
  assert.equal(ready.measurable, true);
  assert.equal(ready.fidelityEvidence, true);
  // A reference document carrying the graybox block stays schema-valid.
  assert.doesNotThrow(
    () => validateReferenceEvidence(readJson(root, "reference-evidence.json")),
  );
});

test("public CLI exposes the graybox stage independently of the measured chain", () => {
  const root = grayboxRoot();
  writeJson(root, "reference-evidence.json", planarReference());
  const run = () => childProcess.spawnSync(
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
      "graybox",
      "--json",
    ],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );

  const blocked = run();
  assert.equal(blocked.status, 2, blocked.stderr || blocked.stdout);
  const blockedResult = JSON.parse(blocked.stdout);
  assert.equal(blockedResult.ok, true);
  assert.equal(blockedResult.stage, "graybox");
  assert.equal(blockedResult.status, "blocked");
  assert.equal(blockedResult.reason, "graybox-missing");

  writeArtifact(root, "graybox.png");
  writeJson(root, "reference-evidence.json", planarReference({ graybox: grayboxBlock() }));
  const ready = run();
  assert.equal(ready.status, 0, ready.stderr || ready.stdout);
  const readyResult = JSON.parse(ready.stdout);
  assert.equal(readyResult.stage, "graybox");
  assert.equal(readyResult.status, "ready");
});
