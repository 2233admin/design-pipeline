"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  sha256,
} = require("./contract-utils.cjs");

const DEPLOY_PROFILE_SCHEMA = "design-pipeline.deploy-profile.v1";
const DEPLOY_STATUSES = ["ready", "blocked", "review-required"];
const OPERATION_TYPES = ["command", "lifecycleHook", "packageScript"];
const OPERATION_KEYS = Object.freeze({ command: "commands", lifecycleHook: "lifecycleHooks", packageScript: "packageScripts" });

function invalid(message, details = {}) {
  fail("deploy profile", message, details);
}

function canonicalRoot(value, label) {
  assertString(value, label, "deploy profile");
  const absolute = path.resolve(value);
  let existing = absolute;
  const suffix = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    suffix.unshift(path.basename(existing));
    existing = parent;
  }
  const realExisting = fs.existsSync(existing) ? fs.realpathSync.native(existing) : existing;
  return path.resolve(realExisting, ...suffix).replace(/[\\/]$/, "").toLowerCase();
}

function pathInside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

function rootsOverlap(left, right) {
  return pathInside(left, right) || pathInside(right, left);
}

function validatePathList(value, label) {
  assertStringArray(value, label, "deploy profile", { unique: true });
  for (const entry of value) {
    if (entry.includes("\0") || /(^|[\\/])\.\.?([\\/]|$)/.test(entry)) invalid(`${label} contains an unsafe path: ${entry}`);
  }
  return value;
}

function pathExcluded(candidate, excluded) {
  const value = candidate.replaceAll("\\", "/").replace(/\/$/, "");
  return excluded.some((entry) => {
    const normalized = entry.replaceAll("\\", "/").replace(/\/$/, "");
    return value === normalized || value.startsWith(`${normalized}/`);
  });
}

function validateRootPolicy(policy, label) {
  assertKeys(policy, ["root", "allowlist", "exclude"], ["root", "allowlist", "exclude"], label, "deploy profile");
  canonicalRoot(policy.root, `${label}.root`);
  validatePathList(policy.allowlist, `${label}.allowlist`);
  validatePathList(policy.exclude, `${label}.exclude`);
  for (const allowed of policy.allowlist) {
    if (pathExcluded(allowed, policy.exclude)) invalid(`${label}.allowlist contains an excluded path: ${allowed}`);
  }
  return policy;
}

function validateOperations(operations) {
  assertKeys(operations, ["commands", "lifecycleHooks", "packageScripts"], ["commands", "lifecycleHooks", "packageScripts"], "operations", "deploy profile");
  for (const key of Object.values(OPERATION_KEYS)) assertStringArray(operations[key], `operations.${key}`, "deploy profile", { unique: true });
  return operations;
}

function validateNetwork(network) {
  assertKeys(network, ["mode", "hosts"], ["mode", "hosts"], "sandbox.network", "deploy profile");
  assertEnum(network.mode, ["none", "allowlist"], "sandbox.network.mode", "deploy profile");
  assertStringArray(network.hosts, "sandbox.network.hosts", "deploy profile", { unique: true });
  if (network.mode === "none" && network.hosts.length) invalid("sandbox.network.hosts must be empty when network mode is none");
  if (network.mode === "allowlist" && !network.hosts.length) invalid("sandbox.network.hosts is required when network mode is allowlist");
  return network;
}

function validateRequestedOperation(profile, operation) {
  assertKeys(operation, ["type", "name"], ["type", "name", "source"], "operation", "deploy profile");
  assertEnum(operation.type, OPERATION_TYPES, "operation.type", "deploy profile");
  assertString(operation.name, "operation.name", "deploy profile");
  const key = OPERATION_KEYS[operation.type];
  if (!profile.operations[key].includes(operation.name)) invalid(`operation ${operation.type}:${operation.name} is outside the declared allowlist`, { code: "OPERATION_NOT_ALLOWLISTED" });
  return operation;
}

function profileBody(profile) {
  const body = { ...profile };
  delete body.contentHash;
  return body;
}

function validateDeployProfile(profile, options = {}) {
  const required = ["schema", "id", "receiptId", "status", "executionTarget", "sourceAdmissionReceiptId", "sourceContentHash", "source", "target", "operations", "sandbox", "contentHash"];
  const allowed = [...required, "routeId", "toolchainPlanSha256"];
  assertKeys(profile, required, allowed, "deploy profile", "deploy profile");
  if (profile.schema !== DEPLOY_PROFILE_SCHEMA) invalid("unsupported deploy profile schema");
  assertString(profile.id, "id", "deploy profile");
  assertString(profile.receiptId, "receiptId", "deploy profile");
  assertEnum(profile.status, DEPLOY_STATUSES, "status", "deploy profile");
  assertKeys(profile.executionTarget, ["id", "receiptId"], ["id", "receiptId"], "executionTarget", "deploy profile");
  assertString(profile.executionTarget.id, "executionTarget.id", "deploy profile");
  assertString(profile.executionTarget.receiptId, "executionTarget.receiptId", "deploy profile");
  validateRootPolicy(profile.source, "source");
  validateRootPolicy(profile.target, "target");
  const sourceRoot = canonicalRoot(profile.source.root, "source.root");
  const targetRoot = canonicalRoot(profile.target.root, "target.root");
  if (sourceRoot === targetRoot) invalid("source and target roots must be distinct");
  validateOperations(profile.operations);
  assertKeys(profile.sandbox, ["workspaceRoot", "mode", "network"], ["workspaceRoot", "mode", "network"], "sandbox", "deploy profile");
  const workspaceRoot = canonicalRoot(profile.sandbox.workspaceRoot, "sandbox.workspaceRoot");
  if (rootsOverlap(sourceRoot, workspaceRoot)) invalid("sandbox.workspaceRoot must be outside the source tree");
  if (rootsOverlap(targetRoot, workspaceRoot)) invalid("sandbox.workspaceRoot must be outside the target tree");
  assertEnum(profile.sandbox.mode, ["contained"], "sandbox.mode", "deploy profile");
  validateNetwork(profile.sandbox.network);
  if (!/^sha256:[a-f0-9]{64}$/.test(profile.contentHash || "")) invalid("contentHash must be a sha256:<digest> value");
  const expectedHash = `sha256:${sha256(canonicalJson(profileBody(profile)))}`;
  if (profile.contentHash !== expectedHash) invalid("contentHash does not match the deploy profile");
  if (!/^[a-f0-9]{64}$/.test(profile.sourceContentHash || "")) invalid("sourceContentHash must be a SHA-256 digest");
  if (profile.routeId !== undefined || profile.toolchainPlanSha256 !== undefined) {
    assertString(profile.routeId, "routeId", "deploy profile");
    if (!/^[a-f0-9]{64}$/.test(profile.toolchainPlanSha256 || "")) invalid("toolchainPlanSha256 must be a SHA-256 digest");
  }
  if (options.sourceAdmissionReceiptId && profile.sourceAdmissionReceiptId !== options.sourceAdmissionReceiptId) invalid("sourceAdmissionReceiptId does not match the admitted source");
  if (options.sourceContentHash && profile.sourceContentHash !== options.sourceContentHash) invalid("sourceContentHash does not match the admitted source");
  if (options.routeId && profile.routeId !== options.routeId) invalid("routeId does not match the native route");
  if (options.toolchainPlanSha256 && profile.toolchainPlanSha256 !== options.toolchainPlanSha256) invalid("toolchainPlanSha256 does not match the native toolchain authority");
  if (options.executionReceipt) {
    const receipt = options.executionReceipt;
    if (profile.executionTarget.receiptId !== receipt.id) invalid("executionTarget.receiptId does not match the execution receipt");
    if (profile.executionTarget.id !== receipt.id) invalid("executionTarget.id does not match the execution receipt");
    if (profile.routeId !== undefined && receipt.routeId !== undefined && profile.routeId !== receipt.routeId) invalid("routeId does not match the execution receipt");
    if (profile.toolchainPlanSha256 !== undefined && profile.toolchainPlanSha256 !== receipt.toolchainPlanSha256) invalid("toolchainPlanSha256 does not match the execution receipt");
  }
  if (options.executionPlan && profile.executionTarget.id !== options.executionPlan.id) {
    invalid("executionTarget.id does not match the execution plan");
  }
  if (options.expectedStatus && profile.status !== options.expectedStatus) invalid(`status must be ${options.expectedStatus}`);
  if (options.operation) validateRequestedOperation(profile, options.operation);
  if (options.operations) {
    assertStringArray(options.operations, "operations", "deploy profile");
    for (const name of options.operations) {
      const type = OPERATION_TYPES.find((candidate) => profile.operations[OPERATION_KEYS[candidate]].includes(name));
      if (!type) invalid(`operation ${name} is outside every declared allowlist`, { code: "OPERATION_NOT_ALLOWLISTED" });
    }
  }
  return profile;
}

function createDeployProfile(input) {
  const body = {
    schema: DEPLOY_PROFILE_SCHEMA,
    id: input.id,
    receiptId: input.receiptId || input.id,
    status: input.status || "review-required",
    executionTarget: { ...input.executionTarget },
    sourceAdmissionReceiptId: input.sourceAdmissionReceiptId,
    sourceContentHash: input.sourceContentHash,
    ...(input.routeId ? { routeId: input.routeId } : {}),
    ...(input.toolchainPlanSha256 ? { toolchainPlanSha256: input.toolchainPlanSha256 } : {}),
    source: { ...input.source, allowlist: [...input.source.allowlist], exclude: [...input.source.exclude] },
    target: { ...input.target, allowlist: [...input.target.allowlist], exclude: [...input.target.exclude] },
    operations: {
      commands: [...(input.operations?.commands || [])],
      lifecycleHooks: [...(input.operations?.lifecycleHooks || [])],
      packageScripts: [...(input.operations?.packageScripts || [])],
    },
    sandbox: { ...input.sandbox, network: { ...input.sandbox.network, hosts: [...input.sandbox.network.hosts] } },
  };
  return validateDeployProfile({ ...body, contentHash: `sha256:${sha256(canonicalJson(body))}` });
}

module.exports = {
  DEPLOY_PROFILE_SCHEMA,
  DEPLOY_STATUSES,
  OPERATION_KEYS,
  OPERATION_TYPES,
  createDeployProfile,
  validateDeployProfile,
  validateRequestedOperation,
};
