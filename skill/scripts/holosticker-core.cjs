"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultManifest = path.resolve(__dirname, "../references/holosticker/manifest.json");
const schema = "design-pipeline.holosticker-source.v1";
const adoptionModes = new Set(["core", "optional"]);

function invalid(message) {
  const error = new Error(`holosticker: ${message}`);
  error.code = "INVALID_HOLOSTICKER";
  throw error;
}

function safeRelative(value, label) {
  if (
    typeof value !== "string" ||
    !value ||
    path.isAbsolute(value) ||
    value.split(/[\\/]/).includes("..")
  ) invalid(`${label} must be a safe relative path`);
  return value;
}

function collectFiles(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relative, entry.name);
    const absolute = path.join(root, next);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) invalid(`snapshot contains a symbolic link: ${next}`);
    if (entry.isDirectory()) return collectFiles(root, next);
    if (!entry.isFile()) invalid(`snapshot contains an unsupported entry: ${next}`);
    return [next];
  });
}

function loadHolosticker(manifestFile = defaultManifest) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { invalid(`cannot read manifest: ${error.message}`); }
  if (manifest?.schema !== schema) invalid("unsupported manifest schema");
  if (manifest.source?.repository !== "https://github.com/jal-co/holosticker") invalid("source repository is invalid");
  if (!/^[a-f0-9]{40}$/.test(manifest.source?.revision || "")) invalid("source revision is invalid");
  if (!/^[a-f0-9]{40}$/.test(manifest.source?.gitTree || "")) invalid("source Git tree is invalid");
  if (manifest.source?.license !== "MIT") invalid("source license is invalid");
  safeRelative(manifest.snapshot?.root, "snapshot.root");
  if (!Number.isInteger(manifest.snapshot?.fileCount) || manifest.snapshot.fileCount < 1) invalid("snapshot.fileCount is invalid");
  if (!Number.isInteger(manifest.snapshot?.byteCount) || manifest.snapshot.byteCount < 1) invalid("snapshot.byteCount is invalid");
  if (!/^[a-f0-9]{64}$/.test(manifest.snapshot?.treeSha256 || "")) invalid("snapshot.treeSha256 is invalid");
  if (!Array.isArray(manifest.capabilities) || !manifest.capabilities.length) invalid("capabilities are required");
  const ids = new Set();
  for (const [index, capability] of manifest.capabilities.entries()) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capability?.id || "")) invalid(`capabilities[${index}].id is invalid`);
    if (ids.has(capability.id)) invalid(`duplicate capability: ${capability.id}`);
    ids.add(capability.id);
    for (const key of ["label", "useWhen"]) if (typeof capability[key] !== "string" || !capability[key].trim()) invalid(`capabilities[${index}].${key} is invalid`);
    if (!Array.isArray(capability.sourceFiles) || !capability.sourceFiles.length) invalid(`capabilities[${index}].sourceFiles are required`);
    capability.sourceFiles.forEach((file, fileIndex) => safeRelative(file, `capabilities[${index}].sourceFiles[${fileIndex}]`));
    if (!Array.isArray(capability.dependencies) || !capability.dependencies.every((item) => typeof item === "string" && item.trim())) invalid(`capabilities[${index}].dependencies are invalid`);
    if (!adoptionModes.has(capability.adoption)) invalid(`capabilities[${index}].adoption is invalid`);
  }
  return { manifest, manifestFile: path.resolve(manifestFile), root: path.dirname(path.resolve(manifestFile)) };
}

function verifyHolostickerSnapshot(manifestFile = defaultManifest) {
  const loaded = loadHolosticker(manifestFile);
  const sourceRoot = path.join(loaded.root, loaded.manifest.snapshot.root);
  if (!fs.existsSync(sourceRoot)) {
    return { schema: "design-pipeline.holosticker-verification.v1", status: "blocked", issues: ["snapshot root is missing"] };
  }
  const files = collectFiles(sourceRoot).sort((left, right) => left.split(path.sep).join("/").localeCompare(right.split(path.sep).join("/"), "en"));
  const fileSet = new Set(files.map((file) => file.split(path.sep).join("/")));
  const bytes = files.reduce((sum, relative) => sum + fs.statSync(path.join(sourceRoot, relative)).size, 0);
  const records = files.map((relative) => {
    const portable = relative.split(path.sep).join("/");
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(sourceRoot, relative))).digest("hex");
    return `${portable}\0${hash}\n`;
  });
  const treeSha256 = crypto.createHash("sha256").update(records.join(""), "utf8").digest("hex");
  const issues = [];
  if (files.length !== loaded.manifest.snapshot.fileCount) issues.push(`file count ${files.length} != ${loaded.manifest.snapshot.fileCount}`);
  if (bytes !== loaded.manifest.snapshot.byteCount) issues.push(`byte count ${bytes} != ${loaded.manifest.snapshot.byteCount}`);
  if (treeSha256 !== loaded.manifest.snapshot.treeSha256) issues.push(`tree hash ${treeSha256} != ${loaded.manifest.snapshot.treeSha256}`);
  for (const capability of loaded.manifest.capabilities) {
    for (const sourceFile of capability.sourceFiles) if (!fileSet.has(sourceFile)) issues.push(`capability ${capability.id} source is missing: ${sourceFile}`);
  }
  return {
    schema: "design-pipeline.holosticker-verification.v1",
    status: issues.length ? "blocked" : "ready",
    revision: loaded.manifest.source.revision,
    version: loaded.manifest.source.version,
    files: files.length,
    bytes,
    capabilities: loaded.manifest.capabilities.length,
    treeSha256,
    issues,
  };
}

function inspectHolosticker({ capability = null, manifestFile = defaultManifest } = {}) {
  const loaded = loadHolosticker(manifestFile);
  const verification = verifyHolostickerSnapshot(manifestFile);
  if (verification.status !== "ready") return verification;
  const capabilities = capability === null
    ? loaded.manifest.capabilities
    : loaded.manifest.capabilities.filter((entry) => entry.id === capability);
  if (capability !== null && !capabilities.length) invalid(`unknown capability: ${capability}`);
  return {
    schema: "design-pipeline.holosticker-inspection.v1",
    status: "ready",
    source: loaded.manifest.source,
    capabilities: capabilities.map((entry) => ({
      ...entry,
      sourceFiles: entry.sourceFiles.map((file) => `upstream/${file}`),
    })),
    integration: {
      mode: "reference-adaptation",
      family: "scene-renderer-3d",
      adapter: "threejs",
      requiredArtifacts: ["scene.json", "3d.md", "motion.md", "qa.md"],
      dependencyPolicy: "Preserve the target project runtime; add only dependencies required by the selected capability.",
    },
  };
}

module.exports = { inspectHolosticker, loadHolosticker, verifyHolostickerSnapshot };
