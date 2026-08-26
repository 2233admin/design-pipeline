"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultManifest = path.resolve(__dirname, "../references/design-md/manifest.json");
const schema = "design-pipeline.design-md-source.v1";

function invalid(message) {
  const error = new Error(`DesignMD source catalog: ${message}`);
  error.code = "INVALID_DESIGN_MD_SOURCE";
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

function gitObjectId(type, content) {
  return crypto.createHash("sha1").update(`${type} ${content.length}\0`, "utf8").update(content).digest("hex");
}

function gitTreeId(objects) {
  const root = { children: new Map() };
  for (const object of objects) {
    const parts = object.path.split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.children.has(part)) node.children.set(part, { children: new Map() });
      node = node.children.get(part);
    }
    node.children.set(parts.at(-1), object);
  }
  function hashTree(node) {
    const entries = [...node.children.entries()]
      .map(([name, child]) => ({ name, child, tree: Boolean(child.children) }))
      .sort((left, right) => Buffer.compare(
        Buffer.from(`${left.name}${left.tree ? "/" : ""}`),
        Buffer.from(`${right.name}${right.tree ? "/" : ""}`),
      ));
    const content = Buffer.concat(entries.map(({ name, child, tree }) => {
      const oid = tree ? hashTree(child) : child.oid;
      const mode = tree ? "40000" : child.mode;
      return Buffer.concat([Buffer.from(`${mode} ${name}\0`), Buffer.from(oid, "hex")]);
    }));
    return gitObjectId("tree", content);
  }
  return hashTree(root);
}

function loadDesignMdSource(manifestFile = defaultManifest) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { invalid(`cannot read manifest: ${error.message}`); }
  if (manifest?.schema !== schema) invalid("unsupported manifest schema");
  if (!manifest.source || !/^[a-f0-9]{40}$/.test(manifest.source.revision || "")) invalid("source revision is invalid");
  if (!/^[a-f0-9]{40}$/.test(manifest.source.gitTree || "")) invalid("source Git tree is invalid");
  if (manifest.source.license !== "MIT") invalid("source license is invalid");
  safeRelative(manifest.snapshot?.root, "snapshot.root");
  if (!Number.isInteger(manifest.snapshot.fileCount) || manifest.snapshot.fileCount < 1) invalid("snapshot.fileCount is invalid");
  if (!Number.isInteger(manifest.snapshot.byteCount) || manifest.snapshot.byteCount < 1) invalid("snapshot.byteCount is invalid");
  if (!/^[a-f0-9]{64}$/.test(manifest.snapshot.treeSha256 || "")) invalid("snapshot.treeSha256 is invalid");
  if (!Array.isArray(manifest.snapshot.executableFiles)) invalid("snapshot.executableFiles is invalid");
  if (!Array.isArray(manifest.snapshot.objects) || manifest.snapshot.objects.length !== manifest.snapshot.fileCount) {
    invalid("snapshot.objects does not match snapshot.fileCount");
  }
  const objectPaths = new Set();
  for (const [index, object] of manifest.snapshot.objects.entries()) {
    safeRelative(object.path, `snapshot.objects[${index}].path`);
    if (!new Set(["100644", "100755"]).has(object.mode)) invalid(`snapshot.objects[${index}].mode is invalid`);
    if (!/^[a-f0-9]{40}$/.test(object.oid || "")) invalid(`snapshot.objects[${index}].oid is invalid`);
    if (!Number.isInteger(object.size) || object.size < 0) invalid(`snapshot.objects[${index}].size is invalid`);
    if (objectPaths.has(object.path)) invalid(`duplicate snapshot object: ${object.path}`);
    objectPaths.add(object.path);
  }
  if (!Array.isArray(manifest.examples) || !manifest.examples.length) invalid("examples must be a non-empty array");
  const ids = new Set();
  for (const [index, example] of manifest.examples.entries()) {
    for (const key of ["id", "slug", "kind", "name", "description", "admission"]) {
      if (typeof example[key] !== "string" || !example[key]) invalid(`examples[${index}].${key} is invalid`);
    }
    safeRelative(example.path, `examples[${index}].path`);
    if (example.kind !== "example") invalid(`examples[${index}].kind must be example`);
    if (example.admission !== "reference-only") invalid(`examples[${index}].admission must be reference-only`);
    if (example.id !== `design-md:example:${example.slug}`) invalid(`examples[${index}].id is inconsistent`);
    if (example.path !== `upstream/examples/${example.slug}.md`) invalid(`examples[${index}].path is inconsistent`);
    if (ids.has(example.id)) invalid(`duplicate example id: ${example.id}`);
    ids.add(example.id);
  }
  return { manifest, manifestFile: path.resolve(manifestFile), root: path.dirname(path.resolve(manifestFile)) };
}

function verifyDesignMdSource(manifestFile = defaultManifest) {
  const loaded = loadDesignMdSource(manifestFile);
  const sourceRoot = path.join(loaded.root, loaded.manifest.snapshot.root);
  if (!fs.existsSync(sourceRoot) || fs.lstatSync(sourceRoot).isSymbolicLink() || !fs.statSync(sourceRoot).isDirectory()) {
    return { schema: "design-pipeline.design-md-source-verification.v1", status: "blocked", issues: ["snapshot root is missing"] };
  }
  const files = collectFiles(sourceRoot);
  const normalizedFiles = files.map((relative) => relative.split(path.sep).join("/")).sort();
  const objectByPath = new Map(loaded.manifest.snapshot.objects.map((object) => [object.path, object]));
  const byteCount = normalizedFiles.reduce((sum, relative) => sum + fs.statSync(path.join(sourceRoot, ...relative.split("/"))).size, 0);
  const entries = normalizedFiles.map((relative) => {
    const content = fs.readFileSync(path.join(sourceRoot, ...relative.split("/")));
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return `${relative}\0${hash}\n`;
  });
  const treeSha256 = crypto.createHash("sha256").update(entries.join(""), "utf8").digest("hex");
  const issues = [];
  if (files.length !== loaded.manifest.snapshot.fileCount) issues.push(`file count ${files.length} != ${loaded.manifest.snapshot.fileCount}`);
  if (byteCount !== loaded.manifest.snapshot.byteCount) issues.push(`byte count ${byteCount} != ${loaded.manifest.snapshot.byteCount}`);
  if (treeSha256 !== loaded.manifest.snapshot.treeSha256) issues.push(`tree hash ${treeSha256} != ${loaded.manifest.snapshot.treeSha256}`);
  if (gitTreeId(loaded.manifest.snapshot.objects) !== loaded.manifest.source.gitTree) issues.push("Git object inventory does not match source.gitTree");
  if (JSON.stringify(normalizedFiles) !== JSON.stringify([...objectByPath.keys()].sort())) issues.push("Git object inventory does not match bundled files");
  for (const relative of normalizedFiles) {
    const content = fs.readFileSync(path.join(sourceRoot, ...relative.split("/")));
    const object = objectByPath.get(relative);
    if (!object) continue;
    if (content.length !== object.size) issues.push(`Git blob size mismatch: ${relative}`);
    if (gitObjectId("blob", content) !== object.oid) issues.push(`Git blob mismatch: ${relative}`);
  }
  const declared = loaded.manifest.examples.map((example) => example.path.replace(/^upstream\//, "")).sort();
  const discovered = normalizedFiles.filter((relative) => /^examples\/[^/]+\.md$/.test(relative)).sort();
  if (JSON.stringify(declared) !== JSON.stringify(discovered)) issues.push("example catalog does not match bundled example files");
  for (const example of loaded.manifest.examples) {
    if (!fs.existsSync(path.join(loaded.root, example.path))) issues.push(`missing example: ${example.id}`);
  }
  return {
    schema: "design-pipeline.design-md-source-verification.v1",
    status: issues.length ? "blocked" : "ready",
    revision: loaded.manifest.source.revision,
    files: normalizedFiles.length,
    bytes: byteCount,
    examples: loaded.manifest.examples.length,
    treeSha256,
    gitTree: gitTreeId(loaded.manifest.snapshot.objects),
    issues,
    nextAction: issues.length ? "repair the bundled dimabraven/design-md snapshot" : "none",
  };
}

function normalize(text) {
  return text.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

function searchDesignMdSource({ query = "", kind = null, limit = 20, manifestFile = defaultManifest } = {}) {
  if (kind && kind !== "example") invalid(`unknown kind ${kind}`);
  const limitText = String(limit);
  if (!/^[1-9]\d*$/.test(limitText) || Number(limitText) < 1) invalid("limit must be a positive integer");
  const parsedLimit = Number(limitText);
  const loaded = loadDesignMdSource(manifestFile);
  const verification = verifyDesignMdSource(manifestFile);
  if (verification.status !== "ready") invalid(`snapshot verification failed: ${verification.issues.join("; ")}`);
  const phrase = normalize(query);
  const results = loaded.manifest.examples
    .map((example) => {
      const content = fs.readFileSync(path.join(loaded.root, example.path), "utf8");
      const haystack = normalize(`${example.id} ${example.slug} ${example.name} ${example.description} ${content}`);
      const score = !phrase ? 1 : haystack.includes(phrase) ? 100 : phrase.split(" ").filter((token) => token.length > 1).reduce((sum, token) => sum + (haystack.includes(token) ? 4 : 0), 0);
      return { score, example };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.example.id.localeCompare(right.example.id))
    .slice(0, parsedLimit)
    .map(({ example }) => ({
      ...example,
      status: "reference-only",
      contentPath: path.join(loaded.root, example.path),
      executableReady: false,
    }));
  return {
    schema: "design-pipeline.design-md-source-search.v1",
    status: "ready",
    source: loaded.manifest.source.repository,
    revision: loaded.manifest.source.revision,
    count: results.length,
    results,
    instruction: "Treat bundled DESIGN.md files as inspiration-only; synthesize a product DESIGN.md instead of installing a template.",
  };
}

function inspectDesignMdSource(id, manifestFile = defaultManifest) {
  const loaded = loadDesignMdSource(manifestFile);
  const verification = verifyDesignMdSource(manifestFile);
  if (verification.status !== "ready") invalid(`snapshot verification failed: ${verification.issues.join("; ")}`);
  const example = loaded.manifest.examples.find((candidate) => candidate.id === id);
  if (!example) {
    const error = new Error(`entry not found: ${id}`);
    error.code = "ENTRY_NOT_FOUND";
    throw error;
  }
  return {
    schema: "design-pipeline.design-md-source-inspect.v1",
    status: "ready",
    entry: {
      ...example,
      status: "reference-only",
      contentPath: path.join(loaded.root, example.path),
    },
    admission: "reference-only",
    executableReady: false,
  };
}

module.exports = {
  inspectDesignMdSource,
  loadDesignMdSource,
  searchDesignMdSource,
  verifyDesignMdSource,
};
