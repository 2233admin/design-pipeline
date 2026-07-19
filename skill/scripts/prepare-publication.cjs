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
    ["--observation", "observation"],
    ["--action", "action"],
    ["--repository", "repository"],
    ["--base", "baseBranch"],
    ["--output", "output"],
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
  return "Usage: node prepare-publication.cjs --observation <id-or-path> --repository <owner/name> [--action issue|pull_request] [--base <branch>] [--output <path>] [--root <path>] [--json]";
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

function resolveInside(root, raw, label, mustExist = true) {
  if (typeof raw !== "string" || !raw || path.isAbsolute(raw)) {
    fail(`${label} must be a root-relative path`);
  }
  const candidate = path.resolve(root, raw);
  if (!inside(root, candidate)) fail(`${label} must stay inside --root`);
  if (mustExist && (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile())) {
    fail(`${label} does not exist: ${raw}`);
  }
  if (mustExist) {
    const realRoot = fs.realpathSync(root);
    const realFile = fs.realpathSync(candidate);
    if (!inside(realRoot, realFile)) fail(`${label} resolves outside --root`);
    return realFile;
  }
  return candidate;
}

function observationPath(options) {
  if (typeof options.observation !== "string" || !options.observation) {
    fail("--observation is required");
  }
  const raw = /^dpf-[a-f0-9]{16}$/.test(options.observation)
    ? `.design-pipeline/feedback/observations/${options.observation}.json`
    : options.observation;
  return resolveInside(options.root, raw, "--observation");
}

function validateObservation(observation) {
  if (
    observation.schema !== "design-pipeline-feedback.v1" ||
    !/^dpf-[a-f0-9]{16}$/.test(observation.id || "") ||
    !/^[a-f0-9]{64}$/.test(observation.fingerprint || "") ||
    typeof observation.title !== "string" ||
    typeof observation.summary !== "string" ||
    !Array.isArray(observation.evidence)
  ) {
    fail("feedback observation has an invalid structure");
  }
  if (observation.privacy?.redacted !== true) {
    fail("feedback observation must be redacted before publication preparation");
  }
  if (observation.changedFiles !== undefined && !Array.isArray(observation.changedFiles)) {
    fail("feedback observation changedFiles must be an array");
  }
  if (observation.validation !== undefined && !Array.isArray(observation.validation)) {
    fail("feedback observation validation must be an array");
  }
  return observation;
}

function normalizeAction(options, observation) {
  const inferred = observation.route === "pr" ? "pull_request" : "issue";
  const action = options.action || inferred;
  if (!["issue", "pull_request"].includes(action)) {
    fail("--action must be issue or pull_request");
  }
  return action;
}

function normalizeRepository(value) {
  const repository = String(value || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail("--repository must be an exact owner/name identity");
  }
  return repository;
}

function uniqueStrings(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim())) {
    fail(`${label} must be a non-empty string array`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}

function renderBody(observation, action) {
  const sections = [
    observation.summary,
    "",
    `Design Pipeline observation: \`${observation.id}\``,
    "",
    "## Evidence",
    "",
    ...(observation.evidence.length
      ? observation.evidence.map((item) => `- ${item}`)
      : ["- No additional evidence recorded."]),
  ];
  if (action === "pull_request") {
    sections.push(
      "",
      "## Changed files",
      "",
      ...observation.changedFiles.map((item) => `- ${item}`),
      "",
      "## Validation",
      "",
      ...observation.validation.map((item) => `- ${item}`),
    );
  }
  sections.push("", "Prepared locally. Publication requires explicit host authority.");
  const body = sections.join("\n");
  if (body.length > 30000) fail("publication body exceeds the 30000 character contract");
  return body;
}

function nowIso() {
  const date = process.env.DESIGN_PIPELINE_NOW
    ? new Date(process.env.DESIGN_PIPELINE_NOW)
    : new Date();
  if (Number.isNaN(date.getTime())) fail("DESIGN_PIPELINE_NOW must be a valid date-time");
  return date.toISOString();
}

function requestKey(parts) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex");
}

function outputPath(options, id) {
  const raw = options.output || `.design-pipeline/feedback/publication-requests/${id}.json`;
  return resolveInside(options.root, raw, "--output", false);
}

function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  fs.renameSync(temp, file);
}

function validateExisting(existing, expected) {
  if (
    existing.schema !== "design-pipeline.publication-request.v1" ||
    existing.idempotencyKey !== expected.idempotencyKey ||
    existing.id !== expected.id ||
    JSON.stringify({ ...existing, requestedAt: expected.requestedAt }) !== JSON.stringify(expected)
  ) {
    fail("existing publication request does not match the deterministic request contract");
  }
  return existing;
}

function prepare(options) {
  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    fail(`root does not exist: ${options.root}`);
  }
  const observation = validateObservation(readJson(observationPath(options), "observation"));
  const action = normalizeAction(options, observation);
  const repository = normalizeRepository(options.repository);
  const changedFiles = uniqueStrings(observation.changedFiles, "changedFiles");
  const validation = uniqueStrings(observation.validation, "validation");
  const baseBranch = action === "pull_request" ? String(options.baseBranch || "").trim() : null;
  if (action === "pull_request" && (!baseBranch || !changedFiles.length || !validation.length)) {
    fail("pull_request requires --base plus observation changedFiles and validation");
  }
  const idempotencyKey = requestKey({
    action,
    baseBranch,
    changedFiles,
    fingerprint: observation.fingerprint,
    repository: repository.toLowerCase(),
    validation,
  });
  const id = `dpp-${idempotencyKey.slice(0, 16)}`;
  const request = {
    schema: "design-pipeline.publication-request.v1",
    id,
    idempotencyKey,
    action,
    repository,
    baseBranch,
    title: observation.title,
    body: renderBody(observation, action),
    observation: {
      id: observation.id,
      fingerprint: observation.fingerprint,
    },
    changedFiles,
    validation,
    authority: {
      state: "required",
    },
    requestedAt: nowIso(),
  };
  const file = outputPath(options, id);
  let created = true;
  let stored = request;
  if (fs.existsSync(file)) {
    stored = validateExisting(readJson(file, "publication request"), request);
    created = false;
  } else {
    atomicWriteJson(file, request);
  }
  return {
    created,
    request: stored,
    path: path.relative(options.root, file).split(path.sep).join("/"),
    remotePublished: false,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(usage());
  else {
    const result = prepare(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`${result.created ? "Prepared" : "Reused"} ${result.request.id}: ${result.path}`);
      console.log("Authority: required. Remote publication: not performed.");
    }
  }
} catch (error) {
  console.error(`prepare-publication: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

