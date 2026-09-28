"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertString,
  canonicalJson,
  fail,
  pathInside,
  sha256,
} = require("./contract-utils.cjs");

const ADMITTED_SNAPSHOT_SCHEMA = "design-pipeline.admitted-source-snapshot.v1";
const SNAPSHOT_STATUSES = ["ready", "blocked"];
const COMPANION_WORKSPACE_POLICY_SCHEMA = "design-pipeline.companion-workspace-policy.v1";
const COMPANION_WORKSPACE_RECEIPT_SCHEMA = "design-pipeline.companion-workspace-receipt.v1";
const RECOVERY_MODES = ["remove-staging-preserve-published"];
const LIFECYCLE_STATUSES = ["disposed", "already-disposed", "pruned", "unchanged", "recovered", "already-recovered", "disposed-after-failure"];

function invalid(message, details = {}) { fail("admitted source snapshot", message, details); }

function canonicalExisting(raw, label) {
  assertString(raw, label, "admitted source snapshot");
  const absolute = path.resolve(raw);
  let current = absolute;
  const suffix = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) invalid(label + " has no existing parent");
    suffix.unshift(path.basename(current));
    current = parent;
  }
  return path.resolve(fs.realpathSync.native(current), ...suffix);
}

function outside(root, other) { return !pathInside(root, other) && !pathInside(other, root); }

function treeHash(raw) {
  const target = canonicalExisting(raw, "tree");
  const stat = fs.statSync(target);
  if (stat.isFile()) return sha256(fs.readFileSync(target));
  if (!stat.isDirectory()) invalid("tree path must be a file or directory: " + target);
  const entries = [];
  function walk(directory, relative) {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const childRelative = relative ? path.join(relative, name) : name;
      const childStat = fs.lstatSync(absolute);
      if (childStat.isSymbolicLink()) invalid("tree path contains a symbolic link: " + childRelative);
      if (childStat.isDirectory()) walk(absolute, childRelative);
      else if (childStat.isFile()) entries.push({ path: childRelative.split(path.sep).join("/"), hash: sha256(fs.readFileSync(absolute)) });
      else invalid("tree path contains unsupported entry: " + childRelative);
    }
  }
  walk(target, "");
  return sha256(canonicalJson(entries));
}

function validateCompanionWorkspacePolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) invalid("companionWorkspacePolicy must be an object");
  const required = ["schema", "retentionWindowMs", "maxSnapshots", "disposeOnFailure", "recoveryFromPartialStaging"];
  assertKeys(policy, required, required, "companionWorkspacePolicy", "admitted source snapshot");
  if (policy.schema !== COMPANION_WORKSPACE_POLICY_SCHEMA) invalid("unsupported companion workspace policy schema");
  if (!Number.isSafeInteger(policy.retentionWindowMs) || policy.retentionWindowMs < 0) invalid("companionWorkspacePolicy.retentionWindowMs must be a non-negative integer");
  if (!Number.isSafeInteger(policy.maxSnapshots) || policy.maxSnapshots < 1) invalid("companionWorkspacePolicy.maxSnapshots must be a positive integer");
  if (typeof policy.disposeOnFailure !== "boolean") invalid("companionWorkspacePolicy.disposeOnFailure must be boolean");
  assertEnum(policy.recoveryFromPartialStaging, RECOVERY_MODES, "companionWorkspacePolicy.recoveryFromPartialStaging", "admitted source snapshot");
  return policy;
}

function companionWorkspacePolicyHash(policy) {
  validateCompanionWorkspacePolicy(policy);
  return "sha256:" + sha256(canonicalJson(policy));
}

function workspaceContext(input) {
  const workspace = canonicalExisting(input.workspaceRoot || input.companionWorkspaceRoot, "workspaceRoot");
  const source = canonicalExisting(input.sourceRoot, "sourceRoot");
  const target = canonicalExisting(input.targetRoot, "targetRoot");
  if (workspace === path.parse(workspace).root) invalid("workspaceRoot must not be a filesystem root");
  if (!outside(workspace, source)) invalid("workspaceRoot must be outside sourceRoot");
  if (!outside(workspace, target)) invalid("workspaceRoot must be outside targetRoot");
  if (!outside(source, target)) invalid("sourceRoot and targetRoot must be distinct and non-nested");
  return { workspace, source, target };
}

function safeWorkspaceEntries(workspace) {
  return fs.readdirSync(workspace).sort().map((name) => {
    const absolute = path.join(workspace, name);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) invalid("workspace contains a symbolic link: " + name);
    const real = path.resolve(fs.realpathSync.native(absolute));
    if (!pathInside(workspace, real)) invalid("workspace entry escapes workspaceRoot: " + name);
    return { name, absolute, stat };
  });
}

function removeWorkspaceEntry(entry) {
  if (!pathInside(entry.workspace, path.resolve(entry.absolute))) invalid("workspace removal escaped workspaceRoot");
  fs["rmSync"](entry.absolute, { recursive: true, force: true });
}

function partialStagingName(name) { return name.includes(".staging-") || name.includes(".tmp-") || name.startsWith("staging-"); }

function cleanPartialStaging(workspace, entries = safeWorkspaceEntries(workspace)) {
  const removed = [];
  for (const entry of entries) {
    if (!partialStagingName(entry.name)) continue;
    removeWorkspaceEntry({ ...entry, workspace });
    removed.push(entry.name);
  }
  return removed;
}

function snapshotBody(input, sourceTreeHash, targetTreeHash, snapshotContentHash) {
  const policy = validateCompanionWorkspacePolicy(input.companionWorkspacePolicy);
  return {
    schema: ADMITTED_SNAPSHOT_SCHEMA,
    id: input.id,
    receiptId: input.receiptId || input.id,
    status: "ready",
    admissionReceiptId: input.admissionReceiptId,
    source: { ...input.source },
    companionWorkspaceRoot: path.resolve(input.companionWorkspaceRoot),
    materializedPath: path.resolve(input.materializedPath),
    sourceRoot: path.resolve(input.sourceRoot),
    targetRoot: path.resolve(input.targetRoot),
    sourceTreeHash,
    targetTreeHash,
    snapshotContentHash,
    sourceMutation: false,
    targetMutation: false,
    companionWorkspacePolicy: { ...policy },
    companionWorkspacePolicyHash: companionWorkspacePolicyHash(policy),
  };
}

function validateAdmittedSourceSnapshot(snapshot, options = {}) {
  const required = ["schema", "id", "receiptId", "status", "admissionReceiptId", "source", "companionWorkspaceRoot", "materializedPath", "sourceRoot", "targetRoot", "sourceTreeHash", "targetTreeHash", "snapshotContentHash", "sourceMutation", "targetMutation", "companionWorkspacePolicy", "companionWorkspacePolicyHash", "contentHash"];
  assertKeys(snapshot, required, required, "admitted source snapshot", "admitted source snapshot");
  if (snapshot.schema !== ADMITTED_SNAPSHOT_SCHEMA) invalid("unsupported admitted source snapshot schema");
  assertString(snapshot.id, "id", "admitted source snapshot");
  assertString(snapshot.receiptId, "receiptId", "admitted source snapshot");
  assertEnum(snapshot.status, SNAPSHOT_STATUSES, "status", "admitted source snapshot");
  assertString(snapshot.admissionReceiptId, "admissionReceiptId", "admitted source snapshot");
  assertKeys(snapshot.source, ["kind", "identity", "revision", "contentHash"], ["kind", "identity", "revision", "contentHash"], "source", "admitted source snapshot");
  for (const key of ["kind", "identity", "revision"]) assertString(snapshot.source[key], "source." + key, "admitted source snapshot");
  if (!/^[a-f0-9]{64}$/.test(snapshot.source.contentHash || "")) invalid("source.contentHash must be SHA-256");
  for (const key of ["sourceTreeHash", "targetTreeHash", "snapshotContentHash"]) if (!/^[a-f0-9]{64}$/.test(snapshot[key] || "")) invalid(key + " must be SHA-256");
  validateCompanionWorkspacePolicy(snapshot.companionWorkspacePolicy);
  if (snapshot.companionWorkspacePolicyHash !== companionWorkspacePolicyHash(snapshot.companionWorkspacePolicy)) invalid("companionWorkspacePolicyHash does not match the policy");
  const context = workspaceContext({ workspaceRoot: snapshot.companionWorkspaceRoot, sourceRoot: snapshot.sourceRoot, targetRoot: snapshot.targetRoot });
  const materialized = canonicalExisting(snapshot.materializedPath, "materializedPath");
  if (!pathInside(context.workspace, materialized)) invalid("materializedPath must be contained in companionWorkspaceRoot");
  if (!/^sha256:[a-f0-9]{64}$/.test(snapshot.contentHash || "")) invalid("contentHash must be a sha256:<digest> value");
  if (snapshot.sourceMutation !== false || snapshot.targetMutation !== false) invalid("materialization must not mutate source or target");
  const body = { ...snapshot };
  delete body.contentHash;
  if (snapshot.contentHash !== "sha256:" + sha256(canonicalJson(body))) invalid("contentHash does not match snapshot receipt");
  if (options.admissionReceipt) {
    const admission = options.admissionReceipt;
    if (snapshot.admissionReceiptId !== admission.receiptId) invalid("admissionReceiptId does not match source admission receipt");
    for (const key of ["kind", "identity", "revision", "contentHash"]) if (snapshot.source[key] !== admission.source[key]) invalid("source." + key + " does not match source admission " + key);
  }
  if (options.workspaceRoot && canonicalExisting(options.workspaceRoot, "workspaceRoot") !== context.workspace) invalid("companionWorkspaceRoot does not match the trusted workspace root");
  if (options.requireFiles !== false) {
    if (!fs.existsSync(materialized) || !fs.existsSync(context.workspace)) invalid("ready admitted source snapshot must exist");
    if (treeHash(materialized) !== snapshot.snapshotContentHash) invalid("snapshotContentHash does not match materialized bytes");
    if (options.revalidateTrees !== false) {
      if (treeHash(context.source) !== snapshot.sourceTreeHash) invalid("source tree changed after snapshot materialization");
      if (treeHash(context.target) !== snapshot.targetTreeHash) invalid("target tree changed after snapshot materialization");
    }
  }
  return { status: snapshot.status, snapshot };
}

function materializeAdmittedSourceSnapshot(input) {
  for (const key of ["id", "admissionReceiptId", "companionWorkspaceRoot", "materializedPath", "sourceRoot", "targetRoot"]) assertString(input[key], key, "admitted source snapshot");
  validateCompanionWorkspacePolicy(input.companionWorkspacePolicy);
  const context = workspaceContext(input);
  const materialized = path.resolve(input.materializedPath);
  if (!pathInside(context.workspace, materialized) || fs.existsSync(materialized)) invalid("materializedPath must be a new path inside companionWorkspaceRoot");
  const parent = path.dirname(materialized);
  fs.mkdirSync(parent, { recursive: true });
  if (!pathInside(context.workspace, parent)) invalid("materializedPath parent must remain inside companionWorkspaceRoot");
  const stage = materialized + ".staging-" + process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  if (fs.existsSync(stage) || !pathInside(context.workspace, stage)) invalid("fresh staging path is unavailable");
  const sourceBefore = treeHash(context.source);
  const targetBefore = treeHash(context.target);
  let published = false;
  try {
    fs.cpSync(context.source, stage, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    const stagedContentHash = treeHash(stage);
    const sourceAfter = treeHash(context.source);
    const targetAfter = treeHash(context.target);
    if (sourceBefore !== sourceAfter || targetBefore !== targetAfter) invalid("source or target changed during materialization");
    fs.renameSync(stage, materialized);
    published = true;
    if (treeHash(materialized) !== stagedContentHash) invalid("published snapshot bytes changed during atomic publish");
    const body = snapshotBody(input, sourceAfter, targetAfter, stagedContentHash);
    return validateAdmittedSourceSnapshot({ ...body, contentHash: "sha256:" + sha256(canonicalJson(body)) }, { admissionReceipt: input.admissionReceipt, workspaceRoot: context.workspace, requireFiles: true });
  } catch (error) {
    cleanPartialStaging(context.workspace);
    if (fs.existsSync(stage)) fs["rmSync"](stage, { recursive: true, force: true });
    if (published && fs.existsSync(materialized)) fs["rmSync"](materialized, { recursive: true, force: true });
    throw error;
  }
}

function lifecycleReceipt(input, operation, status, details) {
  const policy = validateCompanionWorkspacePolicy(input.policy);
  const context = workspaceContext(input);
  const body = { schema: COMPANION_WORKSPACE_RECEIPT_SCHEMA, id: input.id, receiptId: input.receiptId || input.id, operation, status, workspaceRoot: context.workspace, policy: { ...policy }, policyHash: companionWorkspacePolicyHash(policy), ...details, createdAt: new Date(input.now || Date.now()).toISOString() };
  return { ...body, contentHash: "sha256:" + sha256(canonicalJson(body)) };
}

function validateCompanionWorkspaceReceipt(receipt, options = {}) {
  const required = ["schema", "id", "receiptId", "operation", "status", "workspaceRoot", "policy", "policyHash", "removed", "retained", "createdAt", "contentHash"];
  assertKeys(receipt, required, required, "companion workspace receipt", "admitted source snapshot");
  if (receipt.schema !== COMPANION_WORKSPACE_RECEIPT_SCHEMA) invalid("unsupported companion workspace receipt schema");
  assertString(receipt.id, "id", "admitted source snapshot");
  assertString(receipt.receiptId, "receiptId", "admitted source snapshot");
  assertEnum(receipt.operation, ["dispose", "prune", "recover"], "operation", "admitted source snapshot");
  assertEnum(receipt.status, LIFECYCLE_STATUSES, "status", "admitted source snapshot");
  const parent = path.dirname(receipt.workspaceRoot);
  const fallback = { sourceRoot: path.join(parent, ".source-unbound"), targetRoot: path.join(parent, ".target-unbound") };
  const context = workspaceContext({ workspaceRoot: receipt.workspaceRoot, sourceRoot: options.sourceRoot || fallback.sourceRoot, targetRoot: options.targetRoot || fallback.targetRoot });
  validateCompanionWorkspacePolicy(receipt.policy);
  if (receipt.policyHash !== companionWorkspacePolicyHash(receipt.policy)) invalid("policyHash does not match policy");
  if (!Array.isArray(receipt.removed) || !receipt.removed.every((entry) => typeof entry === "string")) invalid("removed must be an array of names");
  if (!Array.isArray(receipt.retained) || !receipt.retained.every((entry) => typeof entry === "string")) invalid("retained must be an array of names");
  if (!Number.isFinite(Date.parse(receipt.createdAt))) invalid("createdAt must be a date-time");
  if (!/^sha256:[a-f0-9]{64}$/.test(receipt.contentHash || "")) invalid("contentHash must be a sha256:<digest> value");
  const body = { ...receipt };
  delete body.contentHash;
  if (receipt.contentHash !== "sha256:" + sha256(canonicalJson(body))) invalid("contentHash does not match companion workspace receipt");
  if (options.workspaceRoot && canonicalExisting(options.workspaceRoot, "workspaceRoot") !== context.workspace) invalid("receipt workspaceRoot does not match the trusted workspace root");
  return { status: receipt.status, receipt };
}

function disposeCompanionWorkspace(input) {
  const context = workspaceContext(input);
  const entries = safeWorkspaceEntries(context.workspace);
  for (const entry of entries) removeWorkspaceEntry({ ...entry, workspace: context.workspace });
  const receipt = lifecycleReceipt(input, "dispose", entries.length ? "disposed" : "already-disposed", { removed: entries.map((entry) => entry.name), retained: [] });
  return validateCompanionWorkspaceReceipt(receipt, input);
}

function pruneCompanionWorkspace(input) {
  const context = workspaceContext(input);
  const policy = validateCompanionWorkspacePolicy(input.policy);
  const nowMs = Date.parse(input.now || new Date().toISOString());
  if (!Number.isFinite(nowMs)) invalid("now must be a date-time");
  const entries = safeWorkspaceEntries(context.workspace).filter((entry) => entry.stat.isDirectory() && !partialStagingName(entry.name));
  const newestFirst = entries.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
  const keep = newestFirst.filter((entry, index) => index < policy.maxSnapshots && nowMs - entry.stat.mtimeMs <= policy.retentionWindowMs);
  const keepNames = new Set(keep.map((entry) => entry.name));
  const removed = newestFirst.filter((entry) => !keepNames.has(entry.name)).map((entry) => entry.name);
  for (const entry of newestFirst) if (!keepNames.has(entry.name)) removeWorkspaceEntry({ ...entry, workspace: context.workspace });
  const receipt = lifecycleReceipt(input, "prune", removed.length ? "pruned" : "unchanged", { removed, retained: keep.map((entry) => entry.name) });
  return validateCompanionWorkspaceReceipt(receipt, input);
}

function recoverCompanionWorkspace(input) {
  const context = workspaceContext(input);
  const entries = safeWorkspaceEntries(context.workspace);
  const removed = cleanPartialStaging(context.workspace, entries);
  if (input.failed === true && input.policy.disposeOnFailure) {
    const remaining = safeWorkspaceEntries(context.workspace);
    for (const entry of remaining) removeWorkspaceEntry({ ...entry, workspace: context.workspace });
    const receipt = lifecycleReceipt(input, "recover", "disposed-after-failure", { removed: [...new Set(removed.concat(remaining.map((entry) => entry.name)))], retained: [] });
    return validateCompanionWorkspaceReceipt(receipt, input);
  }
  const receipt = lifecycleReceipt(input, "recover", removed.length ? "recovered" : "already-recovered", { removed, retained: safeWorkspaceEntries(context.workspace).map((entry) => entry.name) });
  return validateCompanionWorkspaceReceipt(receipt, input);
}

function createAdmittedSourceSnapshot(input) { return materializeAdmittedSourceSnapshot(input); }

module.exports = {
  ADMITTED_SNAPSHOT_SCHEMA,
  COMPANION_WORKSPACE_POLICY_SCHEMA,
  COMPANION_WORKSPACE_RECEIPT_SCHEMA,
  RECOVERY_MODES,
  SNAPSHOT_STATUSES,
  companionWorkspacePolicyHash,
  createAdmittedSourceSnapshot,
  disposeCompanionWorkspace,
  materializeAdmittedSourceSnapshot,
  pruneCompanionWorkspace,
  recoverCompanionWorkspace,
  treeHash,
  validateAdmittedSourceSnapshot,
  validateCompanionWorkspacePolicy,
  validateCompanionWorkspaceReceipt,
};
