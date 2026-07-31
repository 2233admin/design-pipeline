"use strict";

const {
  assertEnum,
  assertKeys,
  assertString,
  fail,
} = require("./contract-utils.cjs");

const REFERENCE_ROLES = ["primary-target", "constraint", "inspiration"];
const FIDELITY_MODES = [
  "exact-reconstruction",
  "adaptive-reconstruction",
  "directional-inspiration",
];
const DOWNGRADE_STATUSES = ["not-requested", "pending-user", "approved-by-user"];

function validateIntent(intent) {
  const intentKeys = [
    "role",
    "requestedFidelity",
    "effectiveFidelity",
    "reconstructionArtifact",
    "downgrade",
  ];
  assertKeys(intent, intentKeys, intentKeys, "intent", "reference evidence");
  assertEnum(intent.role, REFERENCE_ROLES, "intent.role", "reference evidence");
  assertEnum(
    intent.requestedFidelity,
    FIDELITY_MODES,
    "intent.requestedFidelity",
    "reference evidence",
  );
  assertEnum(
    intent.effectiveFidelity,
    FIDELITY_MODES,
    "intent.effectiveFidelity",
    "reference evidence",
  );
  if (
    intent.reconstructionArtifact !== null
    && (typeof intent.reconstructionArtifact !== "string" || !intent.reconstructionArtifact.trim())
  ) {
    fail("reference evidence", "intent.reconstructionArtifact must be a non-empty string or null");
  }
  assertKeys(
    intent.downgrade,
    ["status", "evidence"],
    ["status", "evidence"],
    "intent.downgrade",
    "reference evidence",
  );
  assertEnum(
    intent.downgrade.status,
    DOWNGRADE_STATUSES,
    "intent.downgrade.status",
    "reference evidence",
  );
  assertString(intent.downgrade.evidence, "intent.downgrade.evidence", "reference evidence");

  if (
    intent.requestedFidelity === "exact-reconstruction"
    && intent.effectiveFidelity !== "exact-reconstruction"
    && intent.downgrade.status !== "approved-by-user"
  ) {
    fail(
      "reference evidence",
      "exact fidelity downgrade requires explicit user approval",
    );
  }
  if (
    intent.requestedFidelity === intent.effectiveFidelity
    && intent.downgrade.status === "approved-by-user"
  ) {
    fail("reference evidence", "downgrade cannot be approved when fidelity was not downgraded");
  }
  if (intent.effectiveFidelity === "exact-reconstruction") {
    if (intent.role !== "primary-target") {
      fail("reference evidence", "exact reconstruction requires a primary-target reference role");
    }
    assertString(
      intent.reconstructionArtifact,
      "intent.reconstructionArtifact",
      "reference evidence",
    );
  }
  if (
    intent.effectiveFidelity === "adaptive-reconstruction"
    && intent.reconstructionArtifact === null
  ) {
    fail("reference evidence", "adaptive reconstruction requires intent.reconstructionArtifact");
  }
}

module.exports = {
  DOWNGRADE_STATUSES,
  FIDELITY_MODES,
  REFERENCE_ROLES,
  validateIntent,
};
