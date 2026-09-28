"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSourceAdmission } = require("../skill/scripts/source-admission-core.cjs");
const { createDeployProfile } = require("../skill/scripts/deploy-profile-core.cjs");

function source(overrides = {}) {
  return { kind: "url", identity: "https://example.test/motion", revision: "2026-09-18", contentHash: "a".repeat(64), ...overrides };
}

function roots() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "source-admission-core-"));
  const sourceRoot = path.join(root, "source");
  const targetRoot = path.join(root, "target");
  const workspaceRoot = path.join(root, "workspace");
  for (const directory of [sourceRoot, targetRoot, workspaceRoot]) fs.mkdirSync(directory, { recursive: true });
  return { root, sourceRoot, targetRoot, workspaceRoot };
}

function deployFixture() {
  const fixture = roots();
  const routeId = "native-source-route";
  const toolchainPlanSha256 = "b".repeat(64);
  const executionReceipt = { id: "execution-source", routeId, toolchainPlanSha256 };
  const profile = createDeployProfile({
    id: "deploy-source", receiptId: "deploy-source-receipt", status: "ready",
    executionTarget: { id: executionReceipt.id, receiptId: executionReceipt.id },
    sourceAdmissionReceiptId: "admission-source", sourceContentHash: source().contentHash,
    routeId, toolchainPlanSha256,
    source: { root: fixture.sourceRoot, allowlist: ["source.js"], exclude: [] },
    target: { root: fixture.targetRoot, allowlist: ["artifact.js"], exclude: [] },
    operations: { commands: ["build"], lifecycleHooks: ["init"], packageScripts: ["test"] },
    sandbox: { workspaceRoot: fixture.workspaceRoot, mode: "contained", network: { mode: "none", hosts: [] } },
  });
  return { ...fixture, routeId, toolchainPlanSha256, executionReceipt, profile };
}

test("reference-only source admission is inert by default", () => {
  const receipt = createSourceAdmission({
    id: "reference-source", source: source(),
    provenance: { status: "unverified", evidence: ["not-yet-reviewed"] },
    license: { status: "unverified", evidence: ["not-yet-reviewed"] },
  });
  assert.equal(receipt.status, "reference-only");
  assert.equal(receipt.admission, "reference-only");
  assert.equal(receipt.promotion, undefined);
});

test("governed promotion admits a source only with execution, profile, and evidence bindings", () => {
  const fixture = deployFixture();
  const receipt = createSourceAdmission({
    id: "admission-source", receiptId: "admission-source", source: source(),
    provenance: { status: "verified", evidence: ["fixture-provenance"] },
    license: { status: "verified", evidence: ["fixture-license"] },
    status: "admitted", admission: "admitted",
    promotion: { status: "governed", deployProfileId: fixture.profile.id, executionTargetId: fixture.executionReceipt.id, sourceContentHash: source().contentHash },
    routeId: fixture.routeId, toolchainPlanSha256: fixture.toolchainPlanSha256,
    validation: { executionTarget: fixture.executionReceipt, executionReceipt: fixture.executionReceipt, deployProfile: fixture.profile },
  });
  assert.equal(receipt.status, "admitted");
  assert.equal(receipt.promotion.status, "governed");
  assert.equal(receipt.routeId, fixture.routeId);
});

test("governed promotion rejects missing execution/profile authorities", () => {
  assert.throws(() => createSourceAdmission({
    id: "admission-missing-authority", source: source(),
    provenance: { status: "verified", evidence: ["fixture"] },
    license: { status: "verified", evidence: ["fixture"] },
    status: "admitted", admission: "admitted",
    promotion: { status: "governed", deployProfileId: "missing", executionTargetId: "missing", sourceContentHash: source().contentHash },
    routeId: "route", toolchainPlanSha256: "c".repeat(64),
  }), /validated execution target/);
});
