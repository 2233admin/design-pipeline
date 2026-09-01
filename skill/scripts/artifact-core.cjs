"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  canonicalJson,
  fail,
  isObject,
  readJson,
  resolveInside,
  sha256,
} = require("./contract-utils.cjs");

const ARTIFACT_SCHEMA = "design-pipeline.artifact.v1";
const ARTIFACT_STATUSES = ["ready", "stale", "blocked", "inconclusive"];

function prefixedHash(value) { return `sha256:${sha256(value)}`; }
function validHash(value) { return typeof value === "string" && /^sha256:[a-f0-9]{64}$/i.test(value); }

function artifactPath(changeRoot, raw, options = {}) {
  const target = resolveInside(changeRoot, raw, "artifact path", { scope: "artifact", mustExist: options.mustExist !== false });
  if (options.mustExist !== false && fs.existsSync(target)) {
    const real = fs.realpathSync(target);
    if (!pathInsideReal(changeRoot, real)) fail("artifact", `artifact path resolves outside ${path.resolve(changeRoot)}`, { code: "ARTIFACT_PATH_ESCAPE" });
  }
  return target;
}

function pathInsideReal(root, target) {
  const relative = path.relative(fs.realpathSync(root), target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function relativeArtifactPath(changeRoot, target) {
  const relative = path.relative(path.resolve(changeRoot), path.resolve(target));
  return relative.split(path.sep).join("/");
}

function hashArtifactFile(file) {
  if (!fs.existsSync(file)) return null;
  if (!fs.statSync(file).isFile()) return null;
  return prefixedHash(fs.readFileSync(file));
}

function createArtifactMetadata(input, options = {}) {
  assertObject(input, "artifact", "artifact");
  for (const key of ["path", "producer", "input_hashes", "dependencies", "created_at"]) if (!Object.hasOwn(input, key)) fail("artifact", `artifact is missing ${key}`);
  assertString(input.path, "path", "artifact");
  assertString(input.producer, "producer", "artifact");
  assertObject(input.input_hashes, "input_hashes", "artifact");
  for (const [key, value] of Object.entries(input.input_hashes)) {
    assertString(key, "input_hashes key", "artifact");
    if (!validHash(value)) fail("artifact", `input_hashes.${key} must be sha256`);
  }
  if (!Array.isArray(input.dependencies) || !input.dependencies.every((value) => typeof value === "string" && value.trim())) fail("artifact", "dependencies must contain non-empty strings");
  assertString(input.created_at, "created_at", "artifact");
  if (Number.isNaN(new Date(input.created_at).getTime())) fail("artifact", "created_at must be a valid date-time");
  const root = path.resolve(options.changeRoot || process.cwd());
  const file = artifactPath(root, input.path, { mustExist: options.requireFile !== false });
  const artifactHash = input.artifact_hash || hashArtifactFile(file);
  if (!validHash(artifactHash)) fail("artifact", "artifact_hash must be sha256 and the artifact file must exist");
  const metadata = {
    schema: ARTIFACT_SCHEMA,
    schema_version: 1,
    path: relativeArtifactPath(root, file),
    producer: input.producer,
    input_hashes: Object.fromEntries(Object.entries(input.input_hashes).sort(([a], [b]) => a.localeCompare(b))),
    artifact_hash: artifactHash,
    dependencies: [...input.dependencies],
    created_at: new Date(input.created_at).toISOString(),
    status: input.status || "ready",
  };
  if (input.required !== undefined) metadata.required = input.required === true;
  if (input.stale_cause) metadata.stale_cause = input.stale_cause;
  if (input.reason) metadata.reason = input.reason;
  validateArtifactMetadata(metadata, { changeRoot: root, requireFile: options.requireFile !== false, checkHash: false });
  return metadata;
}

function validateArtifactMetadata(metadata, options = {}) {
  assertObject(metadata, "artifact", "artifact");
  const required = ["schema", "schema_version", "path", "producer", "input_hashes", "artifact_hash", "dependencies", "created_at", "status"];
  const allowed = [...required, "required", "stale_cause", "reason"];
  assertKeys(metadata, required, allowed, "artifact", "artifact");
  if (metadata.schema !== ARTIFACT_SCHEMA) fail("artifact", `schema must be ${ARTIFACT_SCHEMA}`);
  if (metadata.schema_version !== 1) fail("artifact", "schema_version must be 1");
  assertString(metadata.path, "path", "artifact");
  assertString(metadata.producer, "producer", "artifact");
  assertObject(metadata.input_hashes, "input_hashes", "artifact");
  for (const [key, value] of Object.entries(metadata.input_hashes)) {
    if (!validHash(value)) fail("artifact", `input_hashes.${key} must be sha256`);
  }
  if (!validHash(metadata.artifact_hash)) fail("artifact", "artifact_hash must be sha256");
  if (!Array.isArray(metadata.dependencies) || !metadata.dependencies.every((value) => typeof value === "string" && value.trim())) fail("artifact", "dependencies must contain non-empty strings");
  assertString(metadata.created_at, "created_at", "artifact");
  if (Number.isNaN(new Date(metadata.created_at).getTime())) fail("artifact", "created_at must be a valid date-time");
  assertEnum(metadata.status, ARTIFACT_STATUSES, "status", "artifact");
  if (metadata.required !== undefined && typeof metadata.required !== "boolean") fail("artifact", "required must be boolean");
  const root = path.resolve(options.changeRoot || process.cwd());
  const file = artifactPath(root, metadata.path, { mustExist: false });
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  if (!exists && options.requireFile !== false) return { status: "blocked", code: "ARTIFACT_MISSING", path: metadata.path, reason: "required artifact does not exist", metadata };
  if (exists && options.checkHash !== false) {
    const actual = hashArtifactFile(file);
    if (actual !== metadata.artifact_hash) return { status: "stale", code: "ARTIFACT_HASH_DRIFT", path: metadata.path, expected: metadata.artifact_hash, actual, reason: "artifact hash no longer matches metadata", metadata: { ...metadata, status: "stale", stale_cause: "artifact hash drift" } };
  }
  if (metadata.status === "stale") return { status: "stale", code: "ARTIFACT_MARKED_STALE", path: metadata.path, reason: metadata.stale_cause || "artifact is marked stale", metadata };
  if (metadata.status === "blocked") return { status: "blocked", code: "ARTIFACT_MARKED_BLOCKED", path: metadata.path, reason: metadata.reason || "artifact is marked blocked", metadata };
  if (metadata.status === "inconclusive") return { status: "inconclusive", code: "ARTIFACT_INCONCLUSIVE", path: metadata.path, reason: metadata.reason || "artifact validation is inconclusive", metadata };
  return { status: "ready", path: metadata.path, metadata };
}

function readArtifactMetadata(file, options = {}) {
  const metadata = readJson(file, "artifact metadata");
  return validateArtifactMetadata(metadata, options);
}

function writeArtifactMetadata(file, metadata) {
  validateArtifactMetadata(metadata, { changeRoot: path.dirname(file), requireFile: false, checkHash: false });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, canonicalJson(metadata));
  return metadata;
}

module.exports = {
  ARTIFACT_SCHEMA,
  ARTIFACT_STATUSES,
  artifactPath,
  createArtifactMetadata,
  hashArtifactFile,
  readArtifactMetadata,
  relativeArtifactPath,
  validateArtifactMetadata,
  writeArtifactMetadata,
};
