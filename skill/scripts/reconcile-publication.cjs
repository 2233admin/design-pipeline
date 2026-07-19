#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  throw new Error(message);
}

function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${option} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = { root: process.cwd(), json: false };
  const fields = new Map([
    ["--root", "root"],
    ["--request", "request"],
    ["--receipt", "receipt"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    const direct = fields.get(arg);
    const withValue = [...fields.keys()].find((flag) => arg.startsWith(`${flag}=`));
    if (!direct && !withValue) fail(`unknown option: ${arg}`);
    const flag = direct ? arg : withValue;
    options[fields.get(flag)] = direct
      ? takeValue(argv, index, flag)
      : arg.slice(flag.length + 1);
    if (direct) index += 1;
  }
  options.root = path.resolve(options.root);
  return options;
}

function usage() {
  return "Usage: node reconcile-publication.cjs --request <path> --receipt <path> [--root <path>] [--json]";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(file, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`invalid ${label} JSON at ${file}: ${error.message}`);
  }
  if (!isObject(value)) fail(`${label} must contain a JSON object`);
  return value;
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function resolveInside(root, raw, label) {
  if (typeof raw !== "string" || !raw || path.isAbsolute(raw)) {
    fail(`${label} must be a root-relative path`);
  }
  const candidate = path.resolve(root, raw);
  if (!inside(root, candidate)) fail(`${label} must stay inside --root`);
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail(`${label} does not exist: ${raw}`);
  }
  const realRoot = fs.realpathSync(root);
  const realFile = fs.realpathSync(candidate);
  if (!inside(realRoot, realFile)) fail(`${label} resolves outside --root`);
  return realFile;
}

function validateRequest(request) {
  if (
    request.schema !== "design-pipeline.publication-request.v1" ||
    !/^dpp-[a-f0-9]{16}$/.test(request.id || "") ||
    !/^[a-f0-9]{64}$/.test(request.idempotencyKey || "") ||
    !["issue", "pull_request"].includes(request.action) ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(request.repository || "") ||
    !isObject(request.observation) ||
    !/^dpf-[a-f0-9]{16}$/.test(request.observation.id || "") ||
    !/^[a-f0-9]{64}$/.test(request.observation.fingerprint || "") ||
    request.authority?.state !== "required"
  ) {
    fail("publication request has an invalid structure");
  }
  return request;
}

function hasValidReceiptEnvelope(receipt) {
  return [
    receipt.schema === "design-pipeline.publication-receipt.v1",
    /^[a-f0-9]{64}$/.test(receipt.idempotencyKey || ""),
    ["issue", "pull_request"].includes(receipt.action),
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(receipt.repository || ""),
  ].every(Boolean);
}

function hasValidRemoteReceipt(remote) {
  if (!isObject(remote)) return false;
  if (typeof remote.url !== "string") return false;
  if (!remote.url.startsWith("https://")) return false;
  if (!Number.isInteger(remote.number)) return false;
  if (remote.number < 1) return false;
  if (!["open", "closed", "merged"].includes(remote.state)) return false;
  if (Number.isNaN(new Date(remote.createdAt).getTime())) return false;
  return true;
}

function validateReceipt(receipt) {
  if (!hasValidReceiptEnvelope(receipt) || !hasValidRemoteReceipt(receipt.remote)) {
    fail("publication receipt has an invalid structure");
  }
  if (receipt.action === "issue" && receipt.remote.state === "merged") {
    fail("an issue receipt cannot have merged state");
  }
  return receipt;
}

function parseRemoteUrl(value) {
  try {
    return new URL(value);
  } catch {
    fail("receipt remote URL is invalid");
  }
}

function validateGitHubOrigin(remoteUrl) {
  if (remoteUrl.protocol !== "https:") return false;
  if (remoteUrl.hostname.toLowerCase() !== "github.com") return false;
  if (remoteUrl.username || remoteUrl.password) return false;
  if (remoteUrl.port) return false;
  if (remoteUrl.search || remoteUrl.hash) return false;
  return true;
}

function validateRemoteUrl(request, receipt) {
  const remoteUrl = parseRemoteUrl(receipt.remote.url);
  if (!validateGitHubOrigin(remoteUrl)) {
    fail("receipt remote URL does not match the GitHub repository, action, and number");
  }
  const route = request.action === "issue" ? "issues" : "pull";
  const expectedPath = `/${request.repository}/${route}/${receipt.remote.number}`.toLowerCase();
  const actualPath = remoteUrl.pathname.replace(/\/$/, "").toLowerCase();
  if (actualPath !== expectedPath) {
    fail("receipt remote URL does not match the GitHub repository, action, and number");
  }
}

function validateMatch(request, receipt) {
  if (receipt.idempotencyKey !== request.idempotencyKey) {
    fail("receipt idempotency key does not match the request");
  }
  if (receipt.action !== request.action) fail("receipt action does not match the request");
  if (receipt.repository.toLowerCase() !== request.repository.toLowerCase()) {
    fail("receipt repository does not match the request");
  }
  validateRemoteUrl(request, receipt);
}

function validateObservation(observation, request) {
  if (
    observation.schema !== "design-pipeline-feedback.v1" ||
    observation.id !== request.observation.id ||
    observation.fingerprint !== request.observation.fingerprint ||
    observation.privacy?.redacted !== true ||
    typeof observation.privacy.remotePublished !== "boolean"
  ) {
    fail("feedback observation does not match the publication request");
  }
  return observation;
}

function validateIndex(index, observationId) {
  if (
    index.schema !== "design-pipeline-feedback-index.v1" ||
    !Array.isArray(index.observations)
  ) {
    fail("feedback index has an invalid structure");
  }
  const entry = index.observations.find((item) => item?.id === observationId);
  if (!entry) fail("feedback index does not contain the request observation");
  return entry;
}

function nowIso() {
  const date = process.env.DESIGN_PIPELINE_NOW
    ? new Date(process.env.DESIGN_PIPELINE_NOW)
    : new Date();
  if (Number.isNaN(date.getTime())) fail("DESIGN_PIPELINE_NOW must be a valid date-time");
  return date.toISOString();
}

function atomicTemp(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(temp, content, { encoding: "utf8", flag: "wx" });
  return temp;
}

function replaceFile(temp, target) {
  fs.renameSync(temp, target);
}

function commitPair(observationPath, observation, indexPath, index) {
  const observationOriginal = fs.readFileSync(observationPath, "utf8");
  const observationTemp = atomicTemp(observationPath, `${JSON.stringify(observation, null, 2)}\n`);
  const indexTemp = atomicTemp(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  let observationCommitted = false;
  try {
    replaceFile(observationTemp, observationPath);
    observationCommitted = true;
    replaceFile(indexTemp, indexPath);
  } catch (error) {
    for (const temp of [observationTemp, indexTemp]) {
      if (fs.existsSync(temp)) fs.rmSync(temp);
    }
    if (observationCommitted) {
      const rollback = atomicTemp(observationPath, observationOriginal);
      replaceFile(rollback, observationPath);
    }
    throw error;
  }
}

function samePublication(left, right) {
  return JSON.stringify({
    ...left,
    reconciledAt: right.reconciledAt,
  }) === JSON.stringify(right);
}

function reconcile(options) {
  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    fail(`root does not exist: ${options.root}`);
  }
  if (!options.request || !options.receipt) fail("--request and --receipt are required");
  const request = validateRequest(
    readJson(resolveInside(options.root, options.request, "--request"), "publication request"),
  );
  const receipt = validateReceipt(
    readJson(resolveInside(options.root, options.receipt, "--receipt"), "publication receipt"),
  );
  validateMatch(request, receipt);

  const feedbackRoot = path.join(options.root, ".design-pipeline", "feedback");
  const observationPath = path.join(
    feedbackRoot,
    "observations",
    `${request.observation.id}.json`,
  );
  const indexPath = path.join(feedbackRoot, "index.json");
  if (!fs.existsSync(observationPath) || !fs.existsSync(indexPath)) {
    fail("feedback observation or index is missing");
  }
  const observation = validateObservation(
    readJson(observationPath, "feedback observation"),
    request,
  );
  const index = readJson(indexPath, "feedback index");
  const indexEntry = validateIndex(index, observation.id);
  const reconciledAt = nowIso();
  const publication = {
    requestId: request.id,
    idempotencyKey: request.idempotencyKey,
    action: request.action,
    repository: request.repository,
    url: receipt.remote.url,
    number: receipt.remote.number,
    state: receipt.remote.state,
    createdAt: new Date(receipt.remote.createdAt).toISOString(),
    reconciledAt,
  };

  if (observation.publication) {
    if (!samePublication(observation.publication, publication)) {
      fail("observation already contains a different publication receipt");
    }
    return {
      reconciled: false,
      observationId: observation.id,
      publication: observation.publication,
    };
  }

  const nextObservation = {
    ...observation,
    privacy: {
      ...observation.privacy,
      remotePublished: true,
    },
    publication,
  };
  Object.assign(indexEntry, {
    remoteUrl: publication.url,
    publicationState: publication.state,
    publicationAction: publication.action,
  });
  index.updatedAt = reconciledAt;
  commitPair(observationPath, nextObservation, indexPath, index);
  return {
    reconciled: true,
    observationId: observation.id,
    publication,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(usage());
  else {
    const result = reconcile(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`${result.reconciled ? "Reconciled" : "Already reconciled"} ${result.publication.url}`);
    }
  }
} catch (error) {
  console.error(`reconcile-publication: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
