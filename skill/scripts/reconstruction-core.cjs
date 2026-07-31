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

// `state` separates the cases a caller has to tell apart: the document is absent (legacy, no
// opinion), the document is present and readable, the document is present and cannot be read, or
// the path names somewhere outside the change root. None is silently folded into another - in
// particular a path the contract refused to resolve is not the same fact as a file nobody wrote,
// and reporting it as `absent` would send the reader looking for a missing document instead of a
// bad argument.
function readCarrier(root, relative) {
  let file;
  try {
    file = resolveInside(root, relative, "graybox carrier", { scope: "reconstruction" });
  } catch {
    return { state: "uncontained", relative, file: null, document: null };
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

// A source declaration the contract cannot read is `unknown`, never a quiet `resolved`. `declared`
// says whether the document got as far as naming an availability before the fault was found.
function unreadableSource(relative, declared, reason, blocker) {
  return {
    availability: "unknown",
    declared,
    resolvable: false,
    path: null,
    artifact: relative,
    invalid: { reason, blocker },
  };
}

// The malformed shapes each map to their own reason. They are checked from the outside in, so the
// reason names the outermost thing that is wrong rather than the first field that happens to fail.
function sourceShapeFault(relative, source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return {
      declared: false,
      reason: "reference-source-malformed",
      blocker: `reference evidence ${relative} records source as ${
        Array.isArray(source) ? "an array" : String(source)
      } rather than an object`,
    };
  }
  if (
    source.availability !== undefined
    && !SOURCE_AVAILABILITY.includes(source.availability)
  ) {
    return {
      declared: true,
      reason: "reference-source-availability-invalid",
      blocker: `reference evidence ${relative} declares source.availability ${
        JSON.stringify(source.availability)
      }, which is not one of ${SOURCE_AVAILABILITY.join(", ")}`,
    };
  }
  return null;
}

function pendingSourceState(relative, source) {
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
function rasterOnDisk(root, declaredPath) {
  try {
    const file = resolveInside(root, declaredPath, "reference source", { scope: "reconstruction" });
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

// Absence of evidence is not evidence. A reference document nobody wrote, and a document that never
// names a source, both leave the reference unresolved: nothing on disk was consulted, so nothing can
// be measured against it. The legacy `resolved` availability survives - an older change keeps its
// geometry behaviour - but `resolvable` stays false and the measured claim blocks on its own reason
// rather than inheriting a verdict from a declaration that was never made.
function unresolvedSourceState(reason, blocker, extra = {}) {
  return {
    availability: "resolved",
    declared: false,
    resolvable: false,
    path: null,
    ...extra,
    unresolved: { reason, blocker },
  };
}

function resolvedSourceState(root, relative, source) {
  const declaredPath = typeof source.path === "string" && source.path.trim()
    ? source.path.trim()
    : null;
  return {
    availability: "resolved",
    declared: typeof source.availability === "string",
    resolvable: declaredPath ? rasterOnDisk(root, declaredPath) : false,
    path: declaredPath,
    artifact: relative,
  };
}

// The reference contract owns `source.availability`. An absent document and an absent field both
// keep the legacy `resolved` availability, so documents written before the pending state existed
// keep their behaviour on the measured chain. Neither one resolves anything: no path was named and
// no file was opened, so `resolvable` is false and a `measured` claim has nothing to stand on. A
// document that is present but says something the contract does not recognise is a loud failure:
// an unreadable declaration is not evidence that the source was supplied.
function referenceSourceState(root, options = {}) {
  const relative = options.referenceArtifact || REFERENCE_ARTIFACT;
  const carrier = readCarrier(root, relative);
  if (carrier.state === "absent") {
    return unresolvedSourceState(
      "reference-source-unrecorded",
      `no reference evidence document (${relative}) records a source`,
    );
  }
  if (carrier.state === "uncontained") {
    return unreadableSource(
      relative,
      false,
      "reference-source-uncontained",
      `reference evidence path ${relative} does not resolve inside the change root`,
    );
  }
  if (carrier.state === "unparseable") {
    return unreadableSource(
      relative,
      false,
      "reference-source-unparseable",
      `reference evidence ${relative} cannot be parsed`,
    );
  }
  const source = carrier.document.source;
  if (source === undefined) {
    return unresolvedSourceState(
      "reference-source-undeclared",
      `reference evidence ${relative} declares no source`,
      { artifact: relative },
    );
  }
  const fault = sourceShapeFault(relative, source);
  if (fault) return unreadableSource(relative, fault.declared, fault.reason, fault.blocker);
  if (source.availability === "pending") return pendingSourceState(relative, source);
  return resolvedSourceState(root, relative, source);
}

// The graybox comparison is bound to the composition region ids recorded in the reference
// document, whichever carrier holds the graybox block. Moving the block into `reconstruction.json`
// does not release it from the binding, and neither does the schema version: a composition that is
// present is applied, v1 or v2. `state` keeps the three ways a binding can be missing apart, so a
// document that recorded nothing is never reported as a document that recorded a match.
function compositionBinding(root, options = {}) {
  const relative = options.referenceArtifact || REFERENCE_ARTIFACT;
  const carrier = readCarrier(root, relative);
  if (carrier.state === "absent") return { ids: null, state: "unrecorded", artifact: relative };
  if (carrier.state === "uncontained") {
    return { ids: null, state: "uncontained", artifact: relative };
  }
  if (carrier.state === "unparseable") return { ids: null, state: "unreadable", artifact: relative };
  if (!Object.hasOwn(carrier.document, "composition")) {
    return { ids: null, state: "undeclared", artifact: relative };
  }
  const { validateComposition } = require("./reference-evidence-core.cjs");
  return {
    ids: validateComposition(carrier.document.composition),
    state: "recorded",
    artifact: relative,
  };
}

// One change, one graybox block. Two carriers holding one is an authoring error - the two blocks can
// disagree about the very thing the gate reports - so no winner is picked and neither block is
// validated: the disagreement itself is the verdict.
function grayboxCarrier(root, options = {}) {
  const primary = options.artifact || RECONSTRUCTION_ARTIFACT;
  const referenceArtifact = options.referenceArtifact || REFERENCE_ARTIFACT;
  const candidates = primary === referenceArtifact ? [primary] : [primary, referenceArtifact];
  const binding = compositionBinding(root, options);
  const holders = [];
  // A candidate path that will not resolve inside the change root is reported, never skipped: the
  // stage read nothing there, and "the block is missing" would describe a document instead of the
  // argument that named a place the contract refuses to look. The reference carrier's own
  // containment failure is already named by `referenceSourceState`, so only the primary - which
  // nothing else resolves at this stage - is recorded here.
  const uncontained = [];
  for (const relative of candidates) {
    const carrier = readCarrier(root, relative);
    if (carrier.state === "uncontained") {
      if (relative !== referenceArtifact) uncontained.push(relative);
      continue;
    }
    if (carrier.state !== "present") continue;
    const block = carrier.document.graybox;
    if (block === undefined || block === null) continue;
    holders.push(carrier);
  }
  if (holders.length > 1) {
    return {
      artifact: null,
      carrier: null,
      graybox: null,
      binding,
      uncontained,
      conflict: holders.map((holder) => holder.relative),
    };
  }
  if (!holders.length) {
    return { artifact: null, carrier: null, graybox: null, binding, uncontained, conflict: null };
  }
  const [holder] = holders;
  return {
    artifact: holder.file,
    carrier: holder.relative,
    graybox: validateGraybox(holder.document.graybox, { compositionRegionIds: binding.ids }),
    binding,
    uncontained,
    conflict: null,
  };
}

// Each step below yields `{ blocker, reason }` pairs in the order the report has always listed
// them; `null` or an empty array means the step had nothing to say.
function grayboxSuppressionIssue(graybox) {
  const unsuppressed = GRAYBOX_SUPPRESSED_TREATMENTS.filter(
    (treatment) => !graybox.suppressed.includes(treatment),
  );
  if (!unsuppressed.length) return null;
  return {
    blocker: `graybox does not suppress: ${unsuppressed.join(", ")}`,
    reason: "graybox-suppression-incomplete",
  };
}

function grayboxModeIssue(graybox) {
  const runtimeMode = graybox.runtimeMode ?? null;
  if (runtimeMode === null) {
    return {
      blocker: "graybox capture claims suppression without a declared runtime graybox mode",
      reason: "graybox-mode-undeclared",
    };
  }
  // A bare token names a mode without saying what it turns off. The gate cannot check that the
  // emissive, optical, and texture layers were actually disabled, and an unverifiable claim is
  // not evidence that they were. The document stays valid - this is a blocked stage, not a
  // contract failure - and expanding the token into `{mechanism, token, disables}` clears it.
  if (typeof runtimeMode === "string") {
    return {
      blocker: `declared graybox mode ${runtimeMode} does not name the layers it disables: `
        + `${GRAYBOX_RUNTIME_LAYERS.join(", ")}`,
      reason: "graybox-mode-unverifiable",
    };
  }
  const enabled = GRAYBOX_RUNTIME_LAYERS.filter(
    (layer) => !runtimeMode.disables.includes(layer),
  );
  if (!enabled.length) return null;
  return {
    blocker: `declared graybox mode ${runtimeMode.token} does not disable: ${enabled.join(", ")}`,
    reason: "graybox-mode-incomplete",
  };
}

function grayboxComparisonIssues(graybox) {
  const issues = [];
  if (!graybox.comparison.regions.length) {
    issues.push({
      blocker: "graybox comparison records no regions",
      reason: "graybox-comparison-missing",
    });
  }
  const open = graybox.comparison.regions.filter(
    (region) => GRAYBOX_UNRESOLVED_REGION_STATUSES.includes(region.status),
  );
  if (open.length) {
    issues.push({
      blocker: `graybox regions are still open: ${open.map((region) => region.id).join(", ")}`,
      reason: "graybox-region-open",
    });
  }
  return issues;
}

// Why the declared measured mode could not be honoured. A pending source, a source nothing ever
// recorded, a source the document never declared, and a raster that is simply not there are four
// different stories, and each keeps its own reason: a measured claim is never refused by a reason
// that describes some other change's problem.
function unmeasurableIssue(source) {
  if (source.availability === "pending") {
    return {
      blocker: "graybox comparison claims measured mode while the reference source is pending",
      reason: "graybox-comparison-unmeasurable",
    };
  }
  if (source.unresolved) {
    return {
      blocker: `graybox comparison claims measured mode while ${source.unresolved.blocker}`,
      reason: source.unresolved.reason,
    };
  }
  return {
    blocker: "graybox comparison claims measured mode while the reference source file "
      + `${source.path ?? "(none declared)"} is not present in the change root`,
    reason: "graybox-comparison-unmeasurable",
  };
}

// A reference document the contract cannot read blocks the graybox stage on every path, qualitative
// included. The stage reads its region binding out of that same document, so a parse failure held
// quietly in the state while the verdict says ready is the gate reporting on evidence it never saw.
function unreadableReferenceIssue(source) {
  if (!source.invalid) return null;
  return {
    blocker: `${source.invalid.blocker}; the graybox stage cannot be checked against an `
      + "unreadable reference document",
    reason: source.invalid.reason,
  };
}

function uncontainedCarrierIssue(relative) {
  return {
    blocker: `graybox carrier path ${relative} does not resolve inside the change root; `
      + "name a path inside it so the stage reports on a document it can read",
    reason: "graybox-carrier-uncontained",
  };
}

function carrierConflictIssue(carriers) {
  return {
    blocker: `two carriers record a graybox block for this change: ${carriers.join(", ")}; `
      + "keep exactly one so the stage reports on a single block",
    reason: "graybox-carrier-conflict",
  };
}

function grayboxMissingIssue() {
  return {
    blocker: "graybox block is missing: record a layout-only capture and a structural comparison",
    reason: "graybox-missing",
  };
}

// The comparison names regions; the composition is what says those names mean anything. With no
// composition recorded anywhere the comparison is asserting against a structure nothing wrote down,
// so it is blocked rather than passed - and the document that should have carried the breakdown is
// named, because "no document at all" and "a document with no composition" are different repairs.
// `unreadable` and `uncontained` bindings are already blocked through `referenceSourceState`, so
// they return null here rather than being re-reported as a document that recorded no composition.
function grayboxBindingIssue(graybox, binding) {
  if (
    binding.state === "recorded"
    || binding.state === "unreadable"
    || binding.state === "uncontained"
  ) return null;
  const named = graybox.comparison.regions.map((region) => region.id);
  if (!named.length) return null;
  if (binding.state === "unrecorded") {
    return {
      blocker: `graybox comparison names regions ${named.join(", ")} while no reference evidence `
        + `document (${binding.artifact}) records a composition to bind them to`,
      reason: "graybox-composition-unrecorded",
    };
  }
  return {
    blocker: `graybox comparison names regions ${named.join(", ")} while reference evidence `
      + `${binding.artifact} records no composition to bind them to`,
    reason: "graybox-composition-undeclared",
  };
}

function blockedGrayboxResult(issues) {
  return {
    status: "blocked",
    blockers: issues.map((issue) => issue.blocker),
    reasons: issues.map((issue) => issue.reason),
    mismatches: [],
    comparisonMode: null,
    measurable: false,
    fidelityEvidence: false,
  };
}

function grayboxResult(root, carrier, source) {
  // Everything the stage owes about the documents themselves, before a single block field is read.
  const leading = [
    unreadableReferenceIssue(source),
    ...(carrier.uncontained ?? []).map(uncontainedCarrierIssue),
  ].filter((issue) => issue !== null);
  if (carrier.conflict) {
    return blockedGrayboxResult([...leading, carrierConflictIssue(carrier.conflict)]);
  }
  const graybox = carrier.graybox;
  if (!graybox) return blockedGrayboxResult([...leading, grayboxMissingIssue()]);
  // Measurability is a property of the disk, not of the declaration. A comparison is measured only
  // when the reference contract resolves AND the raster it names is actually there.
  const measurable = source.availability === "resolved" && source.resolvable === true;
  const issues = [
    ...leading,
    ...missingArtifacts(root, [graybox.capture]).map((artifact) => ({
      blocker: `missing graybox evidence: ${artifact}`,
      reason: "graybox-capture-missing",
    })),
    grayboxSuppressionIssue(graybox),
    grayboxModeIssue(graybox),
    ...grayboxComparisonIssues(graybox),
    grayboxBindingIssue(graybox, carrier.binding),
    // An unreadable declaration is already blocked above; re-reporting it as a measurability
    // failure would answer a question the stage never got far enough to ask.
    graybox.comparison.mode === "measured" && !measurable && !source.invalid
      ? unmeasurableIssue(source)
      : null,
    graybox.approval.status !== "approved"
      ? {
        blocker: `graybox approval status is ${graybox.approval.status}`,
        reason: approvalReason("graybox", graybox.approval.status),
      }
      : null,
  ].filter((issue) => issue !== null);
  const blockers = issues.map((issue) => issue.blocker);
  const status = blockers.length ? "blocked" : "ready";
  return {
    status,
    blockers,
    reasons: issues.map((issue) => issue.reason),
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

// What the comparison says about itself, before any file on disk is opened.
function finalDeclarationIssues(comparison) {
  const issues = [];
  if (comparison.status !== "measured") {
    issues.push({
      blocker: `final comparison status is ${comparison.status}`,
      reason: "final-not-measured",
    });
  }
  if (comparison.approval.status !== "approved") {
    issues.push({
      blocker: `final comparison approval status is ${comparison.approval.status}`,
      reason: approvalReason("final", comparison.approval.status),
    });
  }
  if (comparison.evidencePort.status !== "ready") {
    issues.push({
      blocker: `EvidencePort status is ${comparison.evidencePort.status}`,
      reason: "final-evidence-port-pending",
    });
  }
  if (comparison.evidencePort.lastProbe.ok !== true) {
    issues.push({
      blocker: "EvidencePort has no successful capability probe",
      reason: "final-probe-missing",
    });
  }
  return issues;
}

// The receipt binds each render to the bytes that were actually measured. The receipt path is
// resolved unconditionally so an escaping path is rejected whether or not the file is there.
function finalReceiptIssues(root, comparison, renderViewport) {
  const receiptFile = resolveInside(
    root,
    comparison.evidencePort.receiptArtifact,
    "EvidencePort receipt",
    { scope: "reconstruction" },
  );
  if (!fs.existsSync(receiptFile) || !comparison.metrics) return [];
  const receipt = validateEvidenceReceipt(
    readJson(receiptFile, "reconstruction evidence receipt"),
    comparison,
    renderViewport,
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
  const issues = [];
  for (const [label, relative, expected] of bindings) {
    const file = resolveInside(root, relative, label, { scope: "reconstruction" });
    if (fs.existsSync(file) && sha256(fs.readFileSync(file)) !== expected) {
      issues.push({
        blocker: `${label} hash does not match the EvidencePort receipt`,
        reason: "final-receipt-mismatch",
      });
    }
  }
  return issues;
}

function finalThresholdMismatches(comparison) {
  const mismatches = [];
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
  return mismatches;
}

function finalResult(root, reconstruction, geometry) {
  if (geometry.status !== "ready") return geometry;
  const comparison = reconstruction.finalComparison;
  const issues = [
    ...finalDeclarationIssues(comparison),
    ...missingArtifacts(root, [
      comparison.referenceRender,
      comparison.implementationRender,
      comparison.diffArtifact,
      comparison.evidencePort.receiptArtifact,
      ...comparison.intentionalMasks,
    ]).map((artifact) => ({
      blocker: `missing final comparison evidence: ${artifact}`,
      reason: "final-evidence-missing",
    })),
    ...finalReceiptIssues(root, comparison, reconstruction.camera.renderViewport),
  ];
  const blockers = issues.map((issue) => issue.blocker);
  const reasons = issues.map((issue) => issue.reason);
  const mismatches = comparison.metrics ? finalThresholdMismatches(comparison) : [];
  if (!comparison.metrics) {
    blockers.push("final comparison metrics are not measured");
    reasons.push("final-metrics-missing");
  } else if (mismatches.length) {
    reasons.push("final-threshold-exceeded");
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
  const result = grayboxResult(root, carrier, source);
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
    // `summarize` always carries a `reason`; this branch owes the same shape, and the same value
    // `reference-evidence-core.cjs` `grayboxStage` reports for the identical failure.
    return {
      status: "blocked",
      reason: "graybox-invalid",
      reasons: ["graybox-invalid"],
      error: error.message,
    };
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
