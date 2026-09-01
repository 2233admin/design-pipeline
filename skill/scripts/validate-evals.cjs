#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const allowedRoutes = new Set([
  "design-synthesis",
  "reference-reconstruction",
  "website-cloning",
  "component-first",
  "motion-graphics",
  "dynamic-web-verification",
  "product-foundation",
  "feedback-loop",
]);
const allowedStates = new Set(["ready", "blocked"]);
const MANIFEST_SCHEMA = "design-pipeline.skill-evals.v1";
const RESULT_SCHEMA = "design-pipeline.skill-eval-result.v1";
const DEFAULT_MANIFEST_PATH = path.join(__dirname, "..", "evals", "evals.json");
const JOB_REGISTRY_PATH = path.join(__dirname, "..", "references", "job-registry.json");

function loadJobIds(file = JOB_REGISTRY_PATH) {
  const registry = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!registry || !Array.isArray(registry.jobs)) throw new Error("job registry must contain a jobs array");
  return new Set(registry.jobs.map((job) => job?.id).filter(isNonEmptyString));
}
function loadJobContracts(file = JOB_REGISTRY_PATH) {
  const registry = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!registry || !Array.isArray(registry.jobs)) throw new Error("job registry must contain a jobs array");
  return new Map(
    registry.jobs
      .filter((job) => isNonEmptyString(job?.id))
      .map((job) => [job.id, Array.isArray(job.routeContracts) ? job.routeContracts : []]),
  );
}

const jobContracts = loadJobContracts();

const knownJobs = loadJobIds();

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function isSafeRelativePath(value) {
  return isNonEmptyString(value) && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value) && !value.split(/[\\/]/).includes("..");
}

function isContainedFixturePath(value, baseDir) {
  if (!isSafeRelativePath(value)) return false;
  const root = path.resolve(baseDir || path.join(__dirname, "..", "evals"));
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function validateList(values, label, isValid, errors) {
  if (!Array.isArray(values) || values.length < 1) {
    errors.push(`${label} must contain at least one entry`);
    return;
  }
  values.forEach((value, index) => {
    if (!isValid(value)) errors.push(`${label}[${index}] is invalid`);
  });
}

function validateEvals(manifest, options = {}) {
  const fixtureRoot = options && typeof options === "object" ? options.baseDir : undefined;
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["manifest must be an object"];
  }
  if (manifest.schema !== MANIFEST_SCHEMA) errors.push(`schema must be ${MANIFEST_SCHEMA}`);
  if (manifest.version !== 1) errors.push("version must be 1");
  if (!manifest.source || !Array.isArray(manifest.source.upstream) || manifest.source.upstream.length < 1) {
    errors.push("source.upstream must contain at least one URL");
  } else {
    manifest.source.upstream.forEach((url, index) => {
      if (!isHttpsUrl(url)) errors.push(`source.upstream[${index}] must be an https URL`);
    });
  }
  if (!Array.isArray(manifest.cases) || manifest.cases.length < 5) {
    errors.push("cases must contain at least five evaluation cases");
    return errors;
  }

  const ids = new Set();
  manifest.cases.forEach((item, index) => {
    const label = `cases[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!isNonEmptyString(item.id)) errors.push(`${label}.id must be a non-empty string`);
    else if (ids.has(item.id)) errors.push(`${label}.id must be unique: ${item.id}`);
    else ids.add(item.id);
    for (const field of ["name", "prompt", "expectedRoute", "expectedJob", "expectedState"]) {
      if (!isNonEmptyString(item[field])) errors.push(`${label}.${field} must be a non-empty string`);
    }
    if (isNonEmptyString(item.expectedJob) && !knownJobs.has(item.expectedJob)) {
      errors.push(`${label}.expectedJob is unknown: ${item.expectedJob}`);
    }
    if (isNonEmptyString(item.expectedRoute) && !allowedRoutes.has(item.expectedRoute)) {
      errors.push(`${label}.expectedRoute is unsupported: ${item.expectedRoute}`);
    }
    if (knownJobs.has(item.expectedJob) && allowedRoutes.has(item.expectedRoute) && !jobContracts.get(item.expectedJob).includes(item.expectedRoute)) {
      errors.push(`${label}.expectedRoute is not declared by expectedJob ${item.expectedJob}`);
    }
    if (isNonEmptyString(item.expectedState) && !allowedStates.has(item.expectedState)) {
      errors.push(`${label}.expectedState is unsupported: ${item.expectedState}`);
    }
    validateList(item.requiredSignals, `${label}.requiredSignals`, isNonEmptyString, errors);
    if (item.expectedState === "blocked" && !item.requiredSignals?.includes("blocked")) {
      errors.push(`${label}.blocked state must require a blocked signal`);
    }
    validateList(item.requiredArtifacts, `${label}.requiredArtifacts`, isSafeRelativePath, errors);
    if (item.fixtures !== undefined) {
      validateList(item.fixtures, `${label}.fixtures`, (value) => isContainedFixturePath(value, fixtureRoot), errors);
    }
  });
  return errors;
}

function loadManifest(file = DEFAULT_MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function main() {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_MANIFEST_PATH;
  try {
    const manifest = loadManifest(file);
    const errors = validateEvals(manifest, { baseDir: path.dirname(file) });
    const result = {
      schema: RESULT_SCHEMA,
      ok: errors.length === 0,
      file,
      caseCount: errors.length === 0 ? manifest.cases.length : null,
      errors,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ schema: RESULT_SCHEMA, ok: false, file, caseCount: null, errors: [errorMessage(error)] }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { allowedRoutes, allowedStates, jobContracts, knownJobs, loadJobContracts, loadJobIds, loadManifest, validateEvals };
