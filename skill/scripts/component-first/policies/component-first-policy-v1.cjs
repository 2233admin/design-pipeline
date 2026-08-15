"use strict";

const COMPONENT_FIRST_POLICY_V1 = Object.freeze({
  policyId: "component-first-default",
  version: 1,
  baselineComponentRoles: Object.freeze(["action", "form-control", "selection", "overlay", "feedback"]),
  allowedComponentOrigins: Object.freeze(["installed-package", "workspace-package", "project-owned", "generated"]),
  projectOwnedEvidence: Object.freeze([
    "sourcePath",
    "symbol",
    "contract",
    "tokenEvidence",
    "keyboardEvidence",
    "focusEvidence",
    "stateEvidence",
    "playgroundEvidence",
    "pageUsageEvidence",
  ]),
  requiredStates: Object.freeze(["disabled", "loading", "error"]),
  playground: Object.freeze({ required: true, kind: "component", stage: "integration" }),
  evidence: Object.freeze({ minimumWidth: 64, minimumHeight: 48, allowTransparent: false }),
});

module.exports = { COMPONENT_FIRST_POLICY_V1 };
