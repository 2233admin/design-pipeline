"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertString,
  fail,
  pngDimensions,
  readJson,
  resolveInside,
  sha256,
} = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.direction-preview.v1";
const AXES = ["luminance", "typeFamily", "color", "layout", "density", "era", "material"];
const REQUIRED_REASONS = ["open-surface", "visual-redesign", "explicit-comparison"];
const WAIVER_REASONS = [
  "narrow-change",
  "established-surface",
  "non-visual",
  "exact-primary-target",
  "single-user-direction",
];
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function assertHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) fail("direction preview", `${label} must be a lowercase SHA-256`);
}

function assertNullableString(value, label) {
  if (value !== null && (typeof value !== "string" || !value.trim())) {
    fail("direction preview", `${label} must be null or a non-empty string`);
  }
}

function assertArtifact(value, label, extension) {
  assertKeys(value, ["path", "sha256"], ["path", "sha256"], label, "direction preview");
  assertString(value.path, `${label}.path`, "direction preview");
  assertHash(value.sha256, `${label}.sha256`);
  if (extension && path.extname(value.path).toLowerCase() !== extension) {
    fail("direction preview", `${label}.path must end in ${extension}`);
  }
}

function readBoundArtifact(root, value, label, blockers, reasons, expectedViewport = null) {
  const file = resolveInside(root, value.path, label, { scope: "direction preview" });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    reasons.push("direction-preview-file-missing");
    blockers.push(`${label} does not name an existing regular file: ${value.path}`);
    return { file, content: null };
  }
  const content = fs.readFileSync(file);
  if (path.extname(value.path).toLowerCase() === ".png") {
    const dimensions = pngDimensions(content);
    if (!dimensions) {
      reasons.push("direction-preview-screenshot-invalid");
      blockers.push(`${label} is not a PNG with a readable IHDR: ${value.path}`);
    } else if (expectedViewport && (dimensions.width !== expectedViewport.width || dimensions.height !== expectedViewport.height)) {
      reasons.push("direction-preview-screenshot-viewport-mismatch");
      blockers.push(`${label} is ${dimensions.width}x${dimensions.height}, expected ${expectedViewport.width}x${expectedViewport.height}`);
    }
  }
  const actual = sha256(content);
  if (actual !== value.sha256) {
    reasons.push("direction-preview-hash-mismatch");
    blockers.push(`${label} hash does not match ${value.path}`);
  }
  return { file, content };
}

function assertViewport(value) {
  assertKeys(value, ["width", "height"], ["width", "height"], "comparison.viewport", "direction preview");
  for (const key of ["width", "height"]) {
    if (!Number.isInteger(value[key]) || value[key] < 240 || value[key] > 8192) {
      fail("direction preview", `comparison.viewport.${key} must be an integer from 240 to 8192`);
    }
  }
}

function assertStringList(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail("direction preview", `${label} must contain non-empty strings`);
  }
  if (new Set(value).size !== value.length) fail("direction preview", `${label} must contain unique values`);
}

function assertAxes(value, label) {
  assertKeys(value, AXES, AXES, `${label}.axes`, "direction preview");
  for (const axis of AXES) assertString(value[axis], `${label}.axes.${axis}`, "direction preview");
}

function assertDirection(value, index) {
  const label = `directions[${index}]`;
  assertKeys(
    value,
    ["id", "name", "thesis", "signature", "axes", "screenshot"],
    ["id", "name", "thesis", "signature", "axes", "screenshot"],
    label,
    "direction preview",
  );
  assertString(value.id, `${label}.id`, "direction preview");
  if (!ID.test(value.id)) fail("direction preview", `${label}.id must be a lowercase path-safe identifier`);
  for (const key of ["name", "thesis", "signature"]) assertString(value[key], `${label}.${key}`, "direction preview");
  assertAxes(value.axes, label);
  assertArtifact(value.screenshot, `${label}.screenshot`, ".png");
}

function assertDivergence(directions) {
  for (let left = 0; left < directions.length; left += 1) {
    for (let right = left + 1; right < directions.length; right += 1) {
      const changed = AXES.filter((axis) => directions[left].axes[axis] !== directions[right].axes[axis]);
      if (changed.length < 4 || (!changed.includes("luminance") && !changed.includes("era"))) {
        fail(
          "direction preview",
          `directions ${directions[left].id} and ${directions[right].id} must differ on at least four axes, including luminance or era`,
        );
      }
    }
  }
}

function assertDecision(value, directionIds, applicability) {
  assertKeys(
    value,
    ["status", "selectedDirectionId", "rationale"],
    ["status", "selectedDirectionId", "rationale"],
    "decision",
    "direction preview",
  );
  assertNullableString(value.selectedDirectionId, "decision.selectedDirectionId");
  assertNullableString(value.rationale, "decision.rationale");
  const statuses = applicability === "waived" ? ["waived"] : ["pending", "selected"];
  assertEnum(value.status, statuses, "decision.status", "direction preview");
  if (value.status === "pending" && (value.selectedDirectionId !== null || value.rationale !== null)) {
    fail("direction preview", "a pending decision cannot carry a selected direction or rationale");
  }
  if (value.status === "selected") {
    if (!directionIds.includes(value.selectedDirectionId)) fail("direction preview", "selectedDirectionId must name a candidate direction");
    assertString(value.rationale, "decision.rationale", "direction preview");
  }
  if (value.status === "waived" && (value.selectedDirectionId !== null || value.rationale === null)) {
    fail("direction preview", "a waived decision records no selected direction and a non-empty rationale");
  }
}

function blockedResult(reason, blocker, details = {}) {
  return {
    status: "blocked",
    reason,
    reasons: [reason],
    blockers: [blocker],
    ...details,
  };
}

function checkDirectionPreview(changeRoot, options = {}) {
  const receiptInput = options.receipt;
  const root = receiptInput && changeRoot ? fs.realpathSync(path.resolve(changeRoot)) : receiptInput ? null : fs.realpathSync(path.resolve(changeRoot));
  const stage = options.stage || "preview";
  assertEnum(stage, ["preview", "selection"], "stage", "direction preview");
  const artifactName = options.artifact || "direction-preview.json";
  const artifactPath = receiptInput ? null : resolveInside(root, artifactName, "direction preview receipt", { scope: "direction preview" });
  if (!receiptInput && (!fs.existsSync(artifactPath) || !fs.statSync(artifactPath).isFile())) {
    return blockedResult(
      "direction-preview-missing",
      `change ${artifactName} does not exist; record required or waived applicability before selecting a direction`,
      { stage, artifact: artifactPath },
    );
  }

  const receipt = receiptInput || readJson(artifactPath, "direction preview");
  assertKeys(
    receipt,
    ["schema", "changeId", "applicability", "comparison", "directions", "decision"],
    ["schema", "changeId", "applicability", "comparison", "directions", "decision"],
    "receipt",
    "direction preview",
  );
  if (receipt.schema !== SCHEMA) fail("direction preview", `unsupported schema ${String(receipt.schema)}`);
  assertString(receipt.changeId, "changeId", "direction preview");
  if (root && receipt.changeId !== path.basename(root)) fail("direction preview", "changeId must match the change-root directory name");
  assertKeys(
    receipt.applicability,
    ["status", "reason"],
    ["status", "reason"],
    "applicability",
    "direction preview",
  );
  assertEnum(receipt.applicability.status, ["required", "waived"], "applicability.status", "direction preview");

  if (receipt.applicability.status === "waived") {
    assertEnum(receipt.applicability.reason, WAIVER_REASONS, "applicability.reason", "direction preview");
    if (receipt.comparison !== null || !Array.isArray(receipt.directions) || receipt.directions.length !== 0) {
      fail("direction preview", "a waived preview has null comparison and no candidate directions");
    }
    assertDecision(receipt.decision, [], "waived");
    return {
      status: "ready",
      reason: "direction-preview-waived",
      reasons: [],
      blockers: [],
      stage,
      applicable: false,
      waiver: receipt.applicability.reason,
      decision: receipt.decision,
      artifact: artifactPath,
    };
  }

  assertEnum(receipt.applicability.reason, REQUIRED_REASONS, "applicability.reason", "direction preview");
  assertKeys(
    receipt.comparison,
    ["brief", "index", "viewport", "contentFixtureSha256", "stateCoverage"],
    ["brief", "index", "viewport", "contentFixtureSha256", "stateCoverage"],
    "comparison",
    "direction preview",
  );
  assertArtifact(receipt.comparison.brief, "comparison.brief", ".md");
  assertArtifact(receipt.comparison.index, "comparison.index", ".html");
  if (path.basename(receipt.comparison.index.path).toLowerCase() !== "index.html") {
    fail("direction preview", "comparison.index.path must use index.html as the comparison entry point");
  }
  assertViewport(receipt.comparison.viewport);
  assertHash(receipt.comparison.contentFixtureSha256, "comparison.contentFixtureSha256");
  assertStringList(receipt.comparison.stateCoverage, "comparison.stateCoverage");

  if (!Array.isArray(receipt.directions) || receipt.directions.length < 2 || receipt.directions.length > 4) {
    fail("direction preview", "directions must contain two to four comparable candidates");
  }
  receipt.directions.forEach(assertDirection);
  const directionIds = receipt.directions.map((direction) => direction.id);
  if (new Set(directionIds).size !== directionIds.length) fail("direction preview", "direction IDs must be unique");
  assertDivergence(receipt.directions);
  assertDecision(receipt.decision, directionIds, "required");

  const blockers = [];
  const reasons = [];
  const indexArtifact = root
    ? (() => {
      readBoundArtifact(root, receipt.comparison.brief, "comparison brief", blockers, reasons);
      return readBoundArtifact(root, receipt.comparison.index, "comparison index", blockers, reasons);
    })()
    : { content: null };
  if (root) {
    for (const direction of receipt.directions) {
      readBoundArtifact(
        root,
        direction.screenshot,
        `direction ${direction.id} screenshot`,
        blockers,
        reasons,
        receipt.comparison.viewport,
      );
    }
  }

  if (indexArtifact.content !== null) {
    const html = indexArtifact.content.toString("utf8");
    if (!/data-direction-preview(?:\s|=|>)/i.test(html)) {
      reasons.push("direction-preview-marker-missing");
      blockers.push("comparison index has no data-direction-preview marker");
    }
    for (const id of directionIds) {
      const quoted = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`data-direction-id\\s*=\\s*[\"']${quoted}[\"']`, "i").test(html)) {
        reasons.push("direction-preview-stage-missing");
        blockers.push(`comparison index has no stage for direction ${id}`);
      }
    }
  }
  if (stage === "selection" && receipt.decision.status !== "selected") {
    reasons.push("direction-selection-pending");
    blockers.push("direction selection is still pending; record a selected candidate and rationale after reviewing the preview");
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    status: blockers.length ? "blocked" : "ready",
    reason: uniqueReasons[0] || null,
    reasons: uniqueReasons,
    blockers,
    stage,
    applicable: true,
    directionCount: receipt.directions.length,
    viewport: receipt.comparison.viewport,
    decision: receipt.decision,
    artifact: artifactPath,
  };
}

module.exports = {
  AXES,
  REQUIRED_REASONS,
  SCHEMA,
  WAIVER_REASONS,
  checkDirectionPreview,
};
