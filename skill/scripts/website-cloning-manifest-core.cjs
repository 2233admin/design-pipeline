"use strict";

const path = require("node:path");

const MANIFEST_SCHEMA = "design-pipeline.website-cloning.v1";
const CHANGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MANIFEST_STATUSES = new Set([
  "planned",
  "in-progress",
  "blocked",
  "fidelity-limited",
  "needs-review",
  "complete",
]);
const TARGET_PHASES = new Set([
  "preflight",
  "reconnaissance",
  "foundation",
  "component-spec-and-build",
  "assembly",
  "visual-and-interaction-qa",
  "complete",
]);
const PORT_STATUSES = new Set(["unresolved", "ready", "blocked", "degraded"]);
const VERIFICATION_STATUSES = new Set(["not-run", "passed", "failed", "blocked"]);

function fail(message) {
  throw new Error(`website-cloning manifest: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertObjectShape(value, label, required, allowed = required) {
  if (!isObject(value)) fail(`${label} must be an object`);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(`${label} is missing ${key}`);
  }
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) fail(`${label} has unsupported properties: ${extras.join(", ")}`);
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) fail(`${label} has invalid value ${String(value)}`);
}

function assertDateTime(value, label, allowNull = false) {
  if (allowNull && value === null) return;
  if (!isNonEmptyString(value) || !Number.isFinite(Date.parse(value))) {
    fail(`${label} must be a valid date-time`);
  }
}

function assertStringArray(value, label, options = {}) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (options.minItems && value.length < options.minItems) {
    fail(`${label} must contain at least ${options.minItems} item(s)`);
  }
  if (!value.every(isNonEmptyString)) fail(`${label} must contain non-empty strings`);
  if (options.unique && new Set(value).size !== value.length) {
    fail(`${label} must contain unique values`);
  }
}

function assertRatio(value, label, allowNull = false) {
  if (allowNull && value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    fail(`${label} must be a number between 0 and 1`);
  }
}

function validateTarget(target, index) {
  const label = `targets[${index}]`;
  assertObjectShape(
    target,
    label,
    ["id", "url", "role", "status", "phase", "artifactRoot"],
  );
  if (!CHANGE_ID_PATTERN.test(target.id)) fail(`${label}.id is invalid`);
  let parsedUrl;
  try {
    parsedUrl = new URL(target.url);
  } catch {
    fail(`${label}.url must be a URI`);
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    fail(`${label}.url must use HTTP or HTTPS`);
  }
  if (parsedUrl.username || parsedUrl.password) {
    fail(`${label}.url must not contain credentials`);
  }
  if (!["primary", "reference"].includes(target.role)) fail(`${label}.role is invalid`);
  assertEnum(target.status, MANIFEST_STATUSES, `${label}.status`);
  assertEnum(target.phase, TARGET_PHASES, `${label}.phase`);
  if (target.artifactRoot !== `targets/${target.id}`) {
    fail(`${label}.artifactRoot must equal targets/${target.id}`);
  }
}

function validateFidelity(fidelity) {
  assertObjectShape(
    fidelity,
    "fidelity",
    ["mode", "comparisonPolicy", "viewports", "gates"],
  );
  if (!["exact", "adaptive"].includes(fidelity.mode)) fail("fidelity.mode is invalid");
  if (!isNonEmptyString(fidelity.comparisonPolicy)) {
    fail("fidelity.comparisonPolicy must be non-empty");
  }
  if (!Array.isArray(fidelity.viewports) || fidelity.viewports.length === 0) {
    fail("fidelity.viewports must contain at least one viewport");
  }
  fidelity.viewports.forEach((viewport, index) => {
    const label = `fidelity.viewports[${index}]`;
    assertObjectShape(viewport, label, ["width", "height"]);
    if (!Number.isInteger(viewport.width) || viewport.width < 1) {
      fail(`${label}.width must be a positive integer`);
    }
    if (!Number.isInteger(viewport.height) || viewport.height < 1) {
      fail(`${label}.height must be a positive integer`);
    }
  });
  assertObjectShape(
    fidelity.gates,
    "fidelity.gates",
    [
      "textCoverage",
      "assetCoverage",
      "interactionCoverage",
      "maxPixelDifferenceRatio",
      "maxLayoutDeltaPx",
    ],
  );
  for (const metric of ["textCoverage", "assetCoverage", "interactionCoverage"]) {
    assertRatio(fidelity.gates[metric], `fidelity.gates.${metric}`);
  }
  assertRatio(
    fidelity.gates.maxPixelDifferenceRatio,
    "fidelity.gates.maxPixelDifferenceRatio",
    true,
  );
  const layoutDelta = fidelity.gates.maxLayoutDeltaPx;
  if (
    layoutDelta !== null &&
    (typeof layoutDelta !== "number" || !Number.isFinite(layoutDelta) || layoutDelta < 0)
  ) {
    fail("fidelity.gates.maxLayoutDeltaPx must be null or a non-negative number");
  }
}

function validateReferenceMapping(mapping, index) {
  const label = `referenceMappings[${index}]`;
  assertObjectShape(
    mapping,
    label,
    [
      "id",
      "kind",
      "designRecord",
      "sourceTargetId",
      "destinationTargetId",
      "sourceRegion",
      "destinationRegion",
      "adoptedProperties",
      "rejectedProperties",
      "requiredStates",
    ],
  );
  if (!CHANGE_ID_PATTERN.test(mapping.id)) fail(`${label}.id is invalid`);
  if (!["supporting", "replacement"].includes(mapping.kind)) {
    fail(`${label}.kind is invalid`);
  }
  for (const field of [
    "designRecord",
    "sourceTargetId",
    "destinationTargetId",
    "sourceRegion",
    "destinationRegion",
  ]) {
    if (!isNonEmptyString(mapping[field])) fail(`${label}.${field} must be non-empty`);
  }
  assertStringArray(mapping.adoptedProperties, `${label}.adoptedProperties`, {
    minItems: 1,
    unique: true,
  });
  assertStringArray(mapping.rejectedProperties, `${label}.rejectedProperties`, {
    unique: true,
  });
  assertStringArray(mapping.requiredStates, `${label}.requiredStates`, {
    minItems: 1,
    unique: true,
  });
}

function validatePort(port, name) {
  const label = `ports.${name}`;
  assertObjectShape(
    port,
    label,
    [
      "status",
      "adapter",
      "requiredCapabilities",
      "availableCapabilities",
      "lastProbe",
    ],
  );
  assertEnum(port.status, PORT_STATUSES, `${label}.status`);
  if (port.adapter !== null && !isNonEmptyString(port.adapter)) {
    fail(`${label}.adapter must be null or a non-empty string`);
  }
  assertStringArray(port.requiredCapabilities, `${label}.requiredCapabilities`, {
    minItems: 1,
    unique: true,
  });
  assertStringArray(port.availableCapabilities, `${label}.availableCapabilities`, {
    unique: true,
  });
  if (port.lastProbe !== null) {
    assertObjectShape(port.lastProbe, `${label}.lastProbe`, ["at", "ok", "message"]);
    assertDateTime(port.lastProbe.at, `${label}.lastProbe.at`);
    if (typeof port.lastProbe.ok !== "boolean") {
      fail(`${label}.lastProbe.ok must be a boolean`);
    }
    if (typeof port.lastProbe.message !== "string") {
      fail(`${label}.lastProbe.message must be a string`);
    }
  }
  if (
    port.status === "ready" &&
    (!isNonEmptyString(port.adapter) || port.lastProbe?.ok !== true)
  ) {
    fail(`${label} must have an adapter and successful probe when ready`);
  }
}

function validateVerification(verification) {
  assertObjectShape(
    verification,
    "verification",
    ["status", "evaluatedAt", "reportPath", "reasons"],
  );
  assertEnum(verification.status, VERIFICATION_STATUSES, "verification.status");
  assertDateTime(verification.evaluatedAt, "verification.evaluatedAt", true);
  if (verification.reportPath !== null && !isNonEmptyString(verification.reportPath)) {
    fail("verification.reportPath must be null or a non-empty string");
  }
  assertStringArray(verification.reasons, "verification.reasons", { unique: true });
}

function validateManifestIdentity(manifest) {
  if (manifest.schema !== MANIFEST_SCHEMA) fail(`schema must be ${MANIFEST_SCHEMA}`);
  if (!CHANGE_ID_PATTERN.test(manifest.changeId)) fail("changeId is invalid");
  assertEnum(manifest.status, MANIFEST_STATUSES, "status");
  assertDateTime(manifest.initializedAt, "initializedAt");
  if (
    !isNonEmptyString(manifest.artifactRoot) ||
    path.isAbsolute(manifest.artifactRoot) ||
    manifest.artifactRoot.split(/[\\/]/).some((part) => !part || part === "." || part === "..")
  ) {
    fail("artifactRoot must be a portable project-relative path");
  }
}

function validateManifestTargets(manifest) {
  if (!Array.isArray(manifest.targets) || manifest.targets.length === 0) {
    fail("targets must contain at least one target");
  }
  manifest.targets.forEach(validateTarget);
  if (new Set(manifest.targets.map((target) => target.id)).size !== manifest.targets.length) {
    fail("target ids must be unique");
  }
}

function validateManifestMappings(manifest) {
  validateFidelity(manifest.fidelity);
  if (!Array.isArray(manifest.referenceMappings)) {
    fail("referenceMappings must be an array");
  }
  manifest.referenceMappings.forEach(validateReferenceMapping);
  if (
    new Set(manifest.referenceMappings.map((mapping) => mapping.id)).size !==
    manifest.referenceMappings.length
  ) {
    fail("reference mapping ids must be unique");
  }
}

function validateManifestPorts(manifest) {
  assertObjectShape(manifest.ports, "ports", ["browser", "builder", "evidence"]);
  for (const name of ["browser", "builder", "evidence"]) validatePort(manifest.ports[name], name);
  validateVerification(manifest.verification);
  assertStringArray(manifest.protocol, "protocol", { minItems: 1 });
}

function validateCompleteManifest(manifest) {
  if (manifest.status !== "complete") return;
  for (const name of ["browser", "builder", "evidence"]) {
    if (manifest.ports[name].status !== "ready") {
      fail(`ports.${name}.status must be ready when complete`);
    }
  }
  if (
    !manifest.targets.every(
      (target) => target.status === "complete" && target.phase === "complete",
    )
  ) {
    fail("all targets must be complete when the manifest is complete");
  }
  if (
    manifest.verification.status !== "passed" ||
    !isNonEmptyString(manifest.verification.reportPath)
  ) {
    fail("verification must be passed with reportPath when complete");
  }
}

function validateWebsiteCloningManifest(manifest) {
  assertObjectShape(
    manifest,
    "root",
    [
      "schema",
      "changeId",
      "status",
      "initializedAt",
      "artifactRoot",
      "targets",
      "fidelity",
      "referenceMappings",
      "ports",
      "verification",
      "protocol",
    ],
  );
  validateManifestIdentity(manifest);
  validateManifestTargets(manifest);
  validateManifestMappings(manifest);
  validateManifestPorts(manifest);
  validateCompleteManifest(manifest);
  return manifest;
}

module.exports = {
  MANIFEST_SCHEMA,
  validateWebsiteCloningManifest,
};
