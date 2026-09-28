"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createDeployProfile, validateDeployProfile } = require("../skill/scripts/deploy-profile-core.cjs");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-profile-core-"));
  const source = path.join(root, "source");
  const target = path.join(root, "target");
  const workspace = path.join(root, "workspace");
  for (const directory of [source, target, workspace]) fs.mkdirSync(directory, { recursive: true });
  const profile = createDeployProfile({
    id: "deploy-profile", receiptId: "deploy-profile-receipt", status: "ready",
    executionTarget: { id: "execution-target", receiptId: "execution-target" },
    sourceAdmissionReceiptId: "admission", sourceContentHash: "a".repeat(64), routeId: "native-route", toolchainPlanSha256: "b".repeat(64),
    source: { root: source, allowlist: ["source.js"], exclude: [] },
    target: { root: target, allowlist: ["artifact.js"], exclude: [] },
    operations: { commands: ["build"], lifecycleHooks: ["init"], packageScripts: ["test"] },
    sandbox: { workspaceRoot: workspace, mode: "contained", network: { mode: "none", hosts: [] } },
  });
  return { root, source, target, workspace, profile };
}

test("deploy profile binds source, target, sandbox, route, and toolchain policy", () => {
  const { profile, workspace } = fixture();
  assert.equal(profile.status, "ready");
  assert.equal(profile.sandbox.workspaceRoot, workspace);
  assert.equal(validateDeployProfile(profile, { expectedStatus: "ready", routeId: "native-route", toolchainPlanSha256: "b".repeat(64) }).id, profile.id);
});

test("deploy profile rejects arbitrary command, lifecycle hook, and package script operations", () => {
  const { profile } = fixture();
  for (const operation of [
    { type: "command", name: "curl-untrusted" },
    { type: "lifecycleHook", name: "postinstall-untrusted" },
    { type: "packageScript", name: "publish-untrusted" },
]) assert.throws(() => validateDeployProfile(profile, { operation }), /outside the declared allowlist/);
});

test("deploy profile rejects overlapping source, target, and sandbox roots", () => {
  const { profile, source } = fixture();
  assert.throws(() => validateDeployProfile({ ...profile, target: { ...profile.target, root: source } }), /source and target roots must be distinct/);
  assert.throws(() => validateDeployProfile({ ...profile, sandbox: { ...profile.sandbox, workspaceRoot: source } }), /workspaceRoot must be outside the source tree/);
});
