"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  readJson,
  resolveInside,
  sha256,
} = require("./contract-utils.cjs");
const {
  EXACT_EVIDENCE_CAPABILITIES,
  GRAYBOX_RUNTIME_LAYERS,
  GRAYBOX_SUPPRESSED_TREATMENTS,
  GRAYBOX_UNRESOLVED_REGION_STATUSES,
  LANDMARK_REGIONS,
  MODES,
  SCHEMA,
  STAGES,
  validateEvidenceReceipt,
  validateGraybox,
  validateReconstruction,
} = require("./reconstruction-contract.cjs");

const REFERENCE_ARTIFACT = "reference-evidence.json";
const RECONSTRUCTION_ARTIFACT = "reconstruction.json";
const SOURCE_AVAILABILITY = ["resolved", "pending"];

function landmarkMeasurements(reconstruction) {
  const errors = reconstruction.landmarks.points.map((landmark) => ({
    id: landmark.id,
    errorPx: Math.hypot(
      landmark.source.x - landmark.render.x,
      landmark.source.y - landmark.render.y,
    ),
  }));
  const sum = errors.reduce((total, entry) => total + entry.errorPx, 0);
  return {
    count: errors.length,
    regionCount: new Set(
      reconstruction.landmarks.points.map((landmark) => landmark.region),
    ).size,
    meanErrorPx: sum / errors.length,
    maxPointErrorPx: Math.max(...errors.map((entry) => entry.errorPx)),
    points: errors,
  };
}

function missingArtifacts(root, artifacts) {
  const missing = [];
  for (const artifact of artifacts) {
    const file = resolveInside(root, artifact, artifact, { scope: "reconstruction" });
    if (!fs.existsSync(file)) missing.push(artifact);
  }
  return missing;
}

function approvalReason(prefix, status) {
  return status === "rejected"
    ? `${prefix}-approval-rejected`
    : `${prefix}-approval-pending`;
}

// `state` separates the three cases a caller has to tell apart: the document is absent (legacy, no
// opinion), the document is present and readable, or the document is present and cannot be read.
// The last one is never silently folded into the first.
function readCarrier(root, relative) {
  let file;
  try {
    file = resolveInside(root, relative, "graybox carrier", { scope: "reconstruction" });
  } catch {
    return { state: "absent", relative, file: null, document: null };
  }
  if (!fs.existsSync(file)) return { state: "absent", relative, file: null, document: null };
  let document;
  try {
    document = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { state: "unparseable", relative, file, document: null };
  }
  if (document === null || typeof document !== "object" || Array.isArray(document)) {
    return { state: "unparseable", relative, file, document: null };
  }
  return { state: "present", relative, file, document };
}

// The reference contract owns `source.availability`. An absent document and an absent field both
// mean `resolved`, so documents written before the pending state existed keep their behaviour. A
// document that is present but says something the contract does not recognise is a loud failure:
// an unreadable declaration is not evidence that the source was supplied.
function referenceSourceState(root, options = {}) {
  const relative = options.referenceArtifact || REFERENCE_ARTIFACT;
  const carrier = readCarrier(root, relative);
  if (carrier.state === "absent") {
    return { availability: "resolved", declared: false, resolvable: true, path: null };
  }
  if (carrier.state === "unparseable") {
    return {
      availability: "unknown",
      declared: false,
      resolvable: false,
      path: null,
      artifact: relative,
      invalid: {
        reason: "reference-source-unparseable",
        blocker: `reference evidence ${relative} cannot be parsed`,
      },
    };
  }
  const source = carrier.document.source;
  if (source === undefined) {
    return {
      availability: "resolved",
      declared: false,
      resolvable: true,
      path: null,
      artifact: relative,
    };
  }
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return {
      availability: "unknown",
      declared: false,
      resolvable: false,
      path: null,
      artifact: relative,
      invalid: {
        reason: "reference-source-malformed",
        blocker: `reference evidence ${relative} records source as ${
          Array.isArray(source) ? "an array" : String(source)
        } rather than an object`,
      },
    };
  }
  const availability = source.availability;
  if (availability !== undefined && !SOURCE_AVAILABILITY.includes(availability)) {
    return {
      availability: "unknown",
      declared: true,
      resolvable: false,
      path: null,
      artifact: relative,
      invalid: {
        reason: "reference-source-availability-invalid",
        blocker: `reference evidence ${relative} declares source.availability ${
          JSON.stringify(availability)
        }, which is not one of ${SOURCE_AVAILABILITY.join(", ")}`,
      },
    };
  }
  if (availability === "pending") {
    const reason = typeof source.pendingReason === "string" && source.pendingReason.trim()
      ? source.pendingReason.trim()
      : null;
    return {
      availability: "pending",
      declared: true,
      resolvable: false,
      path: typeof source.path === "string" ? source.path : null,
      artifact: relative,
      ...(reason ? { pendingReason: reason } : {}),
    };
  }
  // A declared path is only evidence once it is on disk. A raster that was never written cannot
  // support a measured comparison, however confidently the document describes it.
  const declaredPath = typeof source.path === "string" && source.path.trim()
    ? source.path.trim()
    : null;
  let resolvable = false;
  if (declaredPath) {
    try {
      const file = resolveInside(root, declaredPath, "reference source", { scope: "reconstruction" });
      resolvable = fs.existsSync(file) && fs.statSync(file).isFile();
    } catch {
      resolvable = false;
    }
  }
  return {
    availability: "resolved",
    declared: typeof availability === "string",
    resolvable,
    path: declaredPath,
    artifact: relative,
  };
}

// The graybox comparison is bound to the composition region ids recorded in the reference
// document, whichever carrier holds the graybox block. Moving the block into `reconstruction.json`
// does not release it from the binding.
function compositionRegionIds(root, options = {}) {
  const relative = options.referenceArtifact || REFERENCE_ARTIFACT;
  const carrier = readCarrier(root, relative);
  if (carrier.state !== "present") return null;
  if (!Object.hasOwn(carrier.document, "composition")) return null;
  const { validateComposition } = require("./reference-evidence-core.cjs");
  return validateComposition(carrier.document.composition);
}

function grayboxCarrier(root, options = {}) {
  const primary = options.artifact || RECONSTRUCTION_ARTIFACT;
  const referenceArtifact = options.referenceArtifact || REFERENCE_ARTIFACT;
  const candidates = primary === referenceArtifact ? [primary] : [primary, referenceArtifact];
  const regionIds = compositionRegionIds(root, options);
  for (const relative of candidates) {
    const carrier = readCarrier(root, relative);
    if (carrier.state !== "present") continue;
    const block = carrier.document.graybox;
    if (block === undefined || block === null) continue;
    return {
      artifact: carrier.file,
      carrier: relative,
      graybox: validateGraybox(block, { compositionRegionIds: regionIds }),
    };
  }
  return { artifact: null, carrier: null, graybox: null };
}

function grayboxResult(root, graybox, source) {
  if (!graybox) {
    return {
      status: "blocked",
      blockers: [
        "graybox block is missing: record a layout-only capture and a structural comparison",
      ],
      reasons: ["graybox-missing"],
      mismatches: [],
      comparisonMode: null,
      measurable: false,
      fidelityEvidence: false,
    };
  }
  const blockers = [];
  const reasons = [];
  for (const artifact of missingArtifacts(root, [graybox.capture])) {
    blockers.push(`missing graybox evidence: ${artifact}`);
    reasons.push("graybox-capture-missing");
  }
  const unsuppressed = GRAYBOX_SUPPRESSED_TREATMENTS.filter(
    (treatment) => !graybox.suppressed.includes(treatment),
  );
  if (unsuppressed.length) {
    blockers.push(`graybox does not suppress: ${unsuppressed.join(", ")}`);
    reasons.push("graybox-suppression-incomplete");
  }
  const runtimeMode = graybox.runtimeMode ?? null;
  if (runtimeMode === null) {
    blockers.push(
      "graybox capture claims suppression without a declared runtime graybox mode",
    );
    reasons.push("graybox-mode-undeclared");
  } else if (typeof runtimeMode === "string") {
    // A bare token names a mode without saying what it turns off. The gate cannot check that the
    // emissive, optical, and texture layers were actually disabled, and an unverifiable claim is
    // not evidence that they were. The document stays valid - this is a blocked stage, not a
    // contract failure - and expanding the token into `{mechanism, token, disables}` clears it.
    blockers.push(
      `declared graybox mode ${runtimeMode} does not name the layers it disables: `
      + `${GRAYBOX_RUNTIME_LAYERS.join(", ")}`,
    );
    reasons.push("graybox-mode-unverifiable");
  } else {
    const enabled = GRAYBOX_RUNTIME_LAYERS.filter(
      (layer) => !runtimeMode.disables.includes(layer),
    );
    if (enabled.length) {
      blockers.push(
        `declared graybox mode ${runtimeMode.token} does not disable: ${enabled.join(", ")}`,
      );
      reasons.push("graybox-mode-incomplete");
    }
  }
  if (!graybox.comparison.regions.length) {
    blockers.push("graybox comparison records no regions");
    reasons.push("graybox-comparison-missing");
  }
  const open = graybox.comparison.regions.filter(
    (region) => GRAYBOX_UNRESOLVED_REGION_STATUSES.includes(region.status),
  );
  if (open.length) {
    blockers.push(
      `graybox regions are still open: ${open.map((region) => region.id).join(", ")}`,
    );
    reasons.push("graybox-region-open");
  }
  // Measurability is a property of the disk, not of the declaration. A comparison is measured only
  // when the reference contract resolves AND the raster it names is actually there.
  const measurable = source.availability === "resolved" && source.resolvable === true;
  if (graybox.comparison.mode === "measured" && !measurable) {
    blockers.push(
      source.availability === "pending"
        ? "graybox comparison claims measured mode while the reference source is pending"
        : source.invalid
          ? `graybox comparison claims measured mode while ${source.invalid.blocker}`
          : "graybox comparison claims measured mode while the reference source file "
            + `${source.path ?? "(none declared)"} is not present in the change root`,
    );
    reasons.push("graybox-comparison-unmeasurable");
  }
  if (graybox.approval.status !== "approved") {
    blockers.push(`graybox approval status is ${graybox.approval.status}`);
    reasons.push(approvalReason("graybox", graybox.approval.status));
  }
  const status = blockers.length ? "blocked" : "ready";
  return {
    status,
    blockers,
    reasons,
    mismatches: [],
    // The declared mode is reported as declared - a claim the gate refused is not quietly rewritten
    // into one it would have accepted. `measurable` says whether the evidence could support it.
    comparisonMode: graybox.comparison.mode,
    measurable,
    // A qualitative comparison proves ordering discipline, never fidelity.
    fidelityEvidence: status === "ready" && measurable && graybox.comparison.mode === "measured",
  };
}

function pendingSourceResult(source, stage) {
  const detail = source.pendingReason ? `: ${source.pendingReason}` : "";
  return {
    status: "blocked",
    blockers: [
      `reference source is pending${detail}; the ${stage} stage cannot measure an unresolved source`,
    ],
    reasons: ["source-pending"],
    mismatches: [],
    measurements: null,
  };
}

// A reference document that states something the contract does not recognise is not a licence to
// measure. It blocks with its own reason so the malformed field, not a fabricated default, is what
// the report names.
function invalidSourceResult(source, stage) {
  return {
    status: "blocked",
    blockers: [
      `${source.invalid.blocker}; the ${stage} stage cannot measure against an unreadable `
      + "source declaration",
    ],
    reasons: [source.invalid.reason],
    mismatches: [],
    measurements: null,
  };
}

function geometryResult(root, reconstruction, source = { availability: "resolved" }) {
  if (source.invalid) return invalidSourceResult(source, "geometry");
  if (source.availability === "pending") return pendingSourceResult(source, "geometry");
  const measurements = landmarkMeasurements(reconstruction);
  const blockers = missingArtifacts(root, [
    reconstruction.rectification.artifact,
    reconstruction.rectification.frontElevation,
    reconstruction.camera.calibrationArtifact,
    reconstruction.landmarks.overlayArtifact,
  ]).map((artifact) => `missing reconstruction evidence: ${artifact}`);
  const reasons = blockers.length ? ["geometry-evidence-missing"] : [];
  if (reconstruction.geometryGate.approval.status !== "approved") {
    blockers.push(
      `geometry approval status is ${reconstruction.geometryGate.approval.status}`,
    );
    reasons.push(approvalReason("geometry", reconstruction.geometryGate.approval.status));
  }
  const mismatches = [];
  if (
    measurements.meanErrorPx
    > reconstruction.landmarks.thresholds.maxMeanErrorPx
  ) {
    mismatches.push(
      `mean landmark error ${measurements.meanErrorPx.toFixed(3)}px exceeds `
      + `${reconstruction.landmarks.thresholds.maxMeanErrorPx}px`,
    );
  }
  if (
    measurements.maxPointErrorPx
    > reconstruction.landmarks.thresholds.maxPointErrorPx
  ) {
    mismatches.push(
      `max landmark error ${measurements.maxPointErrorPx.toFixed(3)}px exceeds `
      + `${reconstruction.landmarks.thresholds.maxPointErrorPx}px`,
    );
  }
  if (mismatches.length) reasons.push("geometry-threshold-exceeded");
  const status = blockers.length
    ? "blocked"
    : mismatches.length
      ? "fidelity-limited"
      : "ready";
  return { status, blockers, reasons: [...new Set(reasons)], mismatches, measurements };
}

function finalResult(root, reconstruction, geometry) {
  if (geometry.status !== "ready") return geometry;
  const comparison = reconstruction.finalComparison;
  const blockers = [];
  const reasons = [];
  const mismatches = [];
  if (comparison.status !== "measured") {
    blockers.push(`final comparison status is ${comparison.status}`);
    reasons.push("final-not-measured");
  }
  if (comparison.approval.status !== "approved") {
    blockers.push(`final comparison approval status is ${comparison.approval.status}`);
    reasons.push(approvalReason("final", comparison.approval.status));
  }
  if (comparison.evidencePort.status !== "ready") {
    blockers.push(`EvidencePort status is ${comparison.evidencePort.status}`);
    reasons.push("final-evidence-port-pending");
  }
  if (comparison.evidencePort.lastProbe.ok !== true) {
    blockers.push("EvidencePort has no successful capability probe");
    reasons.push("final-probe-missing");
  }
  for (const artifact of missingArtifacts(root, [
    comparison.referenceRender,
    comparison.implementationRender,
    comparison.diffArtifact,
    comparison.evidencePort.receiptArtifact,
    ...comparison.intentionalMasks,
  ])) {
    blockers.push(`missing final comparison evidence: ${artifact}`);
    reasons.push("final-evidence-missing");
  }
  const receiptFile = resolveInside(
    root,
    comparison.evidencePort.receiptArtifact,
    "EvidencePort receipt",
    { scope: "reconstruction" },
  );
  if (fs.existsSync(receiptFile) && comparison.metrics) {
    const receipt = validateEvidenceReceipt(
      readJson(receiptFile, "reconstruction evidence receipt"),
      comparison,
      reconstruction.camera.renderViewport,
    );
    const bindings = [
      ["reference render", comparison.referenceRender, receipt.referenceSha256],
      [
        "implementation render",
        comparison.implementationRender,
        receipt.implementationSha256,
      ],
      ["diff render", comparison.diffArtifact, receipt.diffSha256],
    ];
    for (const [label, relative, expected] of bindings) {
      const file = resolveInside(root, relative, label, { scope: "reconstruction" });
      if (fs.existsSync(file) && sha256(fs.readFileSync(file)) !== expected) {
        blockers.push(`${label} hash does not match the EvidencePort receipt`);
        reasons.push("final-receipt-mismatch");
      }
    }
  }
  if (comparison.metrics) {
    if (
      comparison.metrics.pixelDifferenceRatio
      > comparison.thresholds.maxPixelDifferenceRatio
    ) {
      mismatches.push(
        `pixel difference ratio ${comparison.metrics.pixelDifferenceRatio} exceeds `
        + comparison.thresholds.maxPixelDifferenceRatio,
      );
    }
    if (comparison.metrics.ssim < comparison.thresholds.minSsim) {
      mismatches.push(
        `SSIM ${comparison.metrics.ssim} is below ${comparison.thresholds.minSsim}`,
      );
    }
    if (mismatches.length) reasons.push("final-threshold-exceeded");
  } else {
    blockers.push("final comparison metrics are not measured");
    reasons.push("final-metrics-missing");
  }
  const status = blockers.length
    ? "blocked"
    : mismatches.length
      ? "fidelity-limited"
      : "ready";
  return {
    status,
    blockers,
    reasons: [...new Set(reasons)],
    mismatches,
    measurements: geometry.measurements,
    finalMeasurements: comparison.metrics,
  };
}

function summarize(result) {
  return {
    status: result.status,
    reason: result.reasons?.[0] ?? null,
    reasons: result.reasons,
  };
}

// The graybox stage never depends on the measured chain: it is evaluated from its own block,
// on its own carrier, and its failures are reported without touching geometry.
function checkGraybox(root, options = {}) {
  const source = referenceSourceState(root, options);
  const carrier = grayboxCarrier(root, options);
  const result = grayboxResult(root, carrier.graybox, source);
  return {
    ...result,
    reason: result.reasons[0] ?? null,
    stage: "graybox",
    artifact: carrier.artifact,
    carrier: carrier.carrier,
    graybox: carrier.graybox,
    reconstruction: null,
    source,
    stages: { graybox: summarize(result) },
  };
}

function grayboxSummary(root, options) {
  try {
    return summarize(checkGraybox(root, options));
  } catch (error) {
    return { status: "blocked", reasons: ["graybox-invalid"], error: error.message };
  }
}

function checkReconstruction(changeRoot, options = {}) {
  const stage = options.stage || "geometry";
  assertEnum(stage, STAGES, "stage", "reconstruction");
  const root = fs.realpathSync(path.resolve(changeRoot));
  if (stage === "graybox") return checkGraybox(root, options);
  const artifact = resolveInside(
    root,
    options.artifact || RECONSTRUCTION_ARTIFACT,
    "reconstruction artifact",
    { scope: "reconstruction", mustExist: true },
  );
  const reconstruction = validateReconstruction(readJson(artifact, "reconstruction"));
  const source = referenceSourceState(root, options);
  const geometry = geometryResult(root, reconstruction, source);
  const result = stage === "geometry"
    ? geometry
    : finalResult(root, reconstruction, geometry);
  return {
    ...result,
    reason: result.reasons?.[0] ?? null,
    stage,
    artifact,
    reconstruction,
    source,
    stages: {
      graybox: grayboxSummary(root, options),
      geometry: summarize(geometry),
      ...(stage === "final" ? { final: summarize(result) } : {}),
    },
  };
}

module.exports = {
  EXACT_EVIDENCE_CAPABILITIES,
  GRAYBOX_RUNTIME_LAYERS,
  GRAYBOX_SUPPRESSED_TREATMENTS,
  LANDMARK_REGIONS,
  MODES,
  SCHEMA,
  STAGES,
  checkGraybox,
  checkReconstruction,
  landmarkMeasurements,
  referenceSourceState,
  validateGraybox,
  validateReconstruction,
};
