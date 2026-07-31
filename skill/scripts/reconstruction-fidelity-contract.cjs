"use strict";

const {
  assertEnum,
  assertKeys,
  assertString,
  assertStringArray,
  fail,
} = require("./contract-utils.cjs");

const EXACT_EVIDENCE_CAPABILITIES = [
  "render-reference",
  "render-implementation",
  "pixel-diff",
  "ssim",
];

function assertFiniteNumber(value, label, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("reconstruction", `${label} must be a finite number`);
  }
  if (options.minimum !== undefined && value < options.minimum) {
    fail("reconstruction", `${label} must be at least ${options.minimum}`);
  }
  if (options.maximum !== undefined && value > options.maximum) {
    fail("reconstruction", `${label} must be at most ${options.maximum}`);
  }
}

function validateViewport(value, label) {
  assertKeys(value, ["width", "height"], ["width", "height"], label, "reconstruction");
  for (const dimension of ["width", "height"]) {
    if (!Number.isInteger(value[dimension]) || value[dimension] < 1) {
      fail("reconstruction", `${label}.${dimension} must be a positive integer`);
    }
  }
}

function validateApproval(value, label) {
  assertKeys(value, ["status", "evidence"], ["status", "evidence"], label, "reconstruction");
  assertEnum(
    value.status,
    ["pending", "approved", "rejected"],
    `${label}.status`,
    "reconstruction",
  );
  assertString(value.evidence, `${label}.evidence`, "reconstruction");
}

function validateFinalComparison(value, mode) {
  const keys = [
    "status",
    "referenceRender",
    "implementationRender",
    "diffArtifact",
    "intentionalMasks",
    "thresholds",
    "metrics",
    "evidencePort",
    "approval",
  ];
  assertKeys(value, keys, keys, "finalComparison", "reconstruction");
  assertEnum(value.status, ["pending", "measured"], "finalComparison.status", "reconstruction");
  for (const key of ["referenceRender", "implementationRender", "diffArtifact"]) {
    assertString(value[key], `finalComparison.${key}`, "reconstruction");
  }
  if (
    !Array.isArray(value.intentionalMasks)
    || !value.intentionalMasks.every((entry) => typeof entry === "string" && entry.trim())
  ) {
    fail("reconstruction", "finalComparison.intentionalMasks must contain non-empty paths");
  }
  if (mode === "exact-reconstruction" && value.intentionalMasks.length) {
    fail("reconstruction", "exact reconstruction forbids intentional masks");
  }
  assertKeys(
    value.thresholds,
    ["maxPixelDifferenceRatio", "minSsim"],
    ["maxPixelDifferenceRatio", "minSsim"],
    "finalComparison.thresholds",
    "reconstruction",
  );
  assertFiniteNumber(
    value.thresholds.maxPixelDifferenceRatio,
    "finalComparison.thresholds.maxPixelDifferenceRatio",
    { minimum: 0, maximum: 1 },
  );
  assertFiniteNumber(value.thresholds.minSsim, "finalComparison.thresholds.minSsim", {
    minimum: 0,
    maximum: 1,
  });
  if (mode === "exact-reconstruction") {
    if (value.thresholds.maxPixelDifferenceRatio > 0.03) {
      fail(
        "reconstruction",
        "exact reconstruction maxPixelDifferenceRatio cannot exceed 0.03",
      );
    }
    if (value.thresholds.minSsim < 0.97) {
      fail("reconstruction", "exact reconstruction minSsim cannot be lower than 0.97");
    }
  }
  if (value.metrics !== null) {
    assertKeys(
      value.metrics,
      ["pixelDifferenceRatio", "ssim"],
      ["pixelDifferenceRatio", "ssim"],
      "finalComparison.metrics",
      "reconstruction",
    );
    assertFiniteNumber(
      value.metrics.pixelDifferenceRatio,
      "finalComparison.metrics.pixelDifferenceRatio",
      { minimum: 0, maximum: 1 },
    );
    assertFiniteNumber(value.metrics.ssim, "finalComparison.metrics.ssim", {
      minimum: 0,
      maximum: 1,
    });
  }
  if (value.status === "measured" && value.metrics === null) {
    fail("reconstruction", "measured finalComparison requires metrics");
  }
  const evidenceKeys = [
    "status",
    "adapter",
    "availableCapabilities",
    "lastProbe",
    "receiptArtifact",
  ];
  assertKeys(
    value.evidencePort,
    evidenceKeys,
    evidenceKeys,
    "finalComparison.evidencePort",
    "reconstruction",
  );
  assertEnum(
    value.evidencePort.status,
    ["pending", "ready"],
    "finalComparison.evidencePort.status",
    "reconstruction",
  );
  assertString(
    value.evidencePort.adapter,
    "finalComparison.evidencePort.adapter",
    "reconstruction",
  );
  assertStringArray(
    value.evidencePort.availableCapabilities,
    "finalComparison.evidencePort.availableCapabilities",
    "reconstruction",
    { unique: true },
  );
  assertKeys(
    value.evidencePort.lastProbe,
    ["ok", "evidence"],
    ["ok", "evidence"],
    "finalComparison.evidencePort.lastProbe",
    "reconstruction",
  );
  if (typeof value.evidencePort.lastProbe.ok !== "boolean") {
    fail("reconstruction", "finalComparison.evidencePort.lastProbe.ok must be boolean");
  }
  assertString(
    value.evidencePort.lastProbe.evidence,
    "finalComparison.evidencePort.lastProbe.evidence",
    "reconstruction",
  );
  assertString(
    value.evidencePort.receiptArtifact,
    "finalComparison.evidencePort.receiptArtifact",
    "reconstruction",
  );
  if (value.status === "measured") {
    if (value.evidencePort.status !== "ready") {
      fail("reconstruction", "measured finalComparison requires a ready EvidencePort");
    }
    if (value.evidencePort.lastProbe.ok !== true) {
      fail("reconstruction", "measured finalComparison requires a successful EvidencePort probe");
    }
    for (const capability of EXACT_EVIDENCE_CAPABILITIES) {
      if (!value.evidencePort.availableCapabilities.includes(capability)) {
        fail("reconstruction", `EvidencePort lacks ${capability}`);
      }
    }
  }
  validateApproval(value.approval, "finalComparison.approval");
}

function validateEvidenceReceipt(receipt, comparison, viewport) {
  const keys = [
    "schema",
    "referenceSha256",
    "implementationSha256",
    "diffSha256",
    "viewport",
    "metrics",
  ];
  assertKeys(receipt, keys, keys, "evidence receipt", "reconstruction");
  if (receipt.schema !== "design-pipeline.reconstruction-evidence.v1") {
    fail(
      "reconstruction",
      "evidence receipt schema must be design-pipeline.reconstruction-evidence.v1",
    );
  }
  for (const key of [
    "referenceSha256",
    "implementationSha256",
    "diffSha256",
  ]) {
    if (!/^[a-f0-9]{64}$/i.test(receipt[key])) {
      fail("reconstruction", `evidence receipt ${key} must be a SHA-256 digest`);
    }
  }
  validateViewport(receipt.viewport, "evidence receipt.viewport");
  if (
    receipt.viewport.width !== viewport.width
    || receipt.viewport.height !== viewport.height
  ) {
    fail("reconstruction", "evidence receipt viewport must match the locked render viewport");
  }
  assertKeys(
    receipt.metrics,
    ["pixelDifferenceRatio", "ssim"],
    ["pixelDifferenceRatio", "ssim"],
    "evidence receipt.metrics",
    "reconstruction",
  );
  assertFiniteNumber(
    receipt.metrics.pixelDifferenceRatio,
    "evidence receipt.metrics.pixelDifferenceRatio",
    { minimum: 0, maximum: 1 },
  );
  assertFiniteNumber(receipt.metrics.ssim, "evidence receipt.metrics.ssim", {
    minimum: 0,
    maximum: 1,
  });
  if (
    receipt.metrics.pixelDifferenceRatio
      !== comparison.metrics.pixelDifferenceRatio
    || receipt.metrics.ssim !== comparison.metrics.ssim
  ) {
    fail(
      "reconstruction",
      "evidence receipt metrics must match finalComparison.metrics",
    );
  }
  return receipt;
}

module.exports = {
  EXACT_EVIDENCE_CAPABILITIES,
  validateEvidenceReceipt,
  validateFinalComparison,
};
