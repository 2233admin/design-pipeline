"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultManifest = path.resolve(__dirname, "../references/shadcnio-react-components/manifest.json");
const schema = "design-pipeline.shadcnio-react-components-source.v1";
const categories = new Map([
  ["React AI Components", "ai"],
  ["React Button Components", "button"],
  ["React Hook Components", "hook"],
  ["React Text Components", "text"],
]);

function invalid(message) {
  const error = new Error(`shadcnio React components: ${message}`);
  error.code = "INVALID_SHADCNIO_COMPONENTS";
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

function normalize(value) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

function parseReadme(readmeFile) {
  let category = null;
  const entries = [];
  for (const line of fs.readFileSync(readmeFile, "utf8").split(/\r?\n/)) {
    const heading = /^## (React (?:AI|Button|Hook|Text) Components)$/.exec(line);
    if (heading) {
      category = categories.get(heading[1]);
      continue;
    }
    const row = /^\|\s*\*\*\[([^\]]+)\]\((https:\/\/www\.shadcn\.io\/[^)]+)\)\*\*\s*\|\s*(.*?)\s*\|$/.exec(line);
    if (!category || !row) continue;
    const pathname = new URL(row[2]).pathname.replace(/^\//, "");
    entries.push({
      id: pathname,
      category,
      kind: category === "hook" ? "hook" : "component",
      name: row[1],
      description: row[3],
      sourceUrl: row[2],
    });
  }
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) invalid(`duplicate README entry: ${entry.id}`);
    ids.add(entry.id);
  }
  return entries;
}

function categoryCounts(entries) {
  return Object.fromEntries([...categories.values()].map((category) => [
    category,
    entries.filter((entry) => entry.category === category).length,
  ]));
}

function loadShadcnioComponents(manifestFile = defaultManifest) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { invalid(`cannot read manifest: ${error.message}`); }
  if (manifest?.schema !== schema) invalid("unsupported manifest schema");
  if (!manifest.source || !/^[a-f0-9]{40}$/.test(manifest.source.revision || "")) invalid("source revision is invalid");
  if (manifest.source.license !== "MIT") invalid("source license is invalid");
  if (JSON.stringify(manifest.source.scope) !== JSON.stringify(["LICENSE", "README.md"])) invalid("source scope is invalid");
  safeRelative(manifest.snapshot?.root, "snapshot.root");
  if (!Number.isInteger(manifest.snapshot.fileCount) || manifest.snapshot.fileCount < 1) invalid("snapshot.fileCount is invalid");
  if (!Number.isInteger(manifest.snapshot.byteCount) || manifest.snapshot.byteCount < 1) invalid("snapshot.byteCount is invalid");
  if (!/^[a-f0-9]{64}$/.test(manifest.snapshot.treeSha256 || "")) invalid("snapshot.treeSha256 is invalid");
  if (!Number.isInteger(manifest.index?.entryCount) || manifest.index.entryCount < 1) invalid("index.entryCount is invalid");

  const root = path.dirname(path.resolve(manifestFile));
  const readmeFile = path.join(root, manifest.snapshot.root, "README.md");
  const entries = parseReadme(readmeFile);
  const counts = categoryCounts(entries);
  if (entries.length !== manifest.index.entryCount) invalid("README entry count does not match manifest");
  if (JSON.stringify(counts) !== JSON.stringify(manifest.index.categories)) invalid("README category counts do not match manifest");
  return { manifest, entries, manifestFile: path.resolve(manifestFile), root };
}

function verifyShadcnioComponentSnapshot(manifestFile = defaultManifest) {
  let loaded;
  try { loaded = loadShadcnioComponents(manifestFile); }
  catch (error) {
    return {
      schema: "design-pipeline.shadcnio-react-components-verification.v1",
      status: "blocked",
      issues: [error.message],
    };
  }
  const sourceRoot = path.join(loaded.root, loaded.manifest.snapshot.root);
  if (!fs.existsSync(sourceRoot)) {
    return { schema: "design-pipeline.shadcnio-react-components-verification.v1", status: "blocked", issues: ["snapshot root is missing"] };
  }
  const files = collectFiles(sourceRoot).sort();
  const bytes = files.reduce((sum, relative) => sum + fs.statSync(path.join(sourceRoot, relative)).size, 0);
  const records = files.map((relative) => {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(sourceRoot, relative))).digest("hex");
    return `${relative.split(path.sep).join("/")}\0${hash}\n`;
  });
  const treeSha256 = crypto.createHash("sha256").update(records.join(""), "utf8").digest("hex");
  const issues = [];
  if (files.length !== loaded.manifest.snapshot.fileCount) issues.push(`file count ${files.length} != ${loaded.manifest.snapshot.fileCount}`);
  if (bytes !== loaded.manifest.snapshot.byteCount) issues.push(`byte count ${bytes} != ${loaded.manifest.snapshot.byteCount}`);
  if (treeSha256 !== loaded.manifest.snapshot.treeSha256) issues.push(`tree hash ${treeSha256} != ${loaded.manifest.snapshot.treeSha256}`);
  return {
    schema: "design-pipeline.shadcnio-react-components-verification.v1",
    status: issues.length ? "blocked" : "ready",
    revision: loaded.manifest.source.revision,
    files: files.length,
    bytes,
    entries: loaded.entries.length,
    categories: categoryCounts(loaded.entries),
    treeSha256,
    issues,
  };
}

function searchShadcnioComponents({ query, category = null, limit = 10, manifestFile = defaultManifest }) {
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const parsedLimit = Number.parseInt(String(limit), 10);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) invalid("limit must be an integer from 1 to 50");
  if (category !== null && ![...categories.values()].includes(category)) invalid(`unknown category: ${category}`);
  const loaded = loadShadcnioComponents(manifestFile);
  const phrase = normalize(query);
  const tokens = [...new Set(phrase.split(" ").filter((token) => token.length > 1))];
  const results = loaded.entries
    .filter((entry) => category === null || entry.category === category)
    .map((entry) => {
      const name = normalize(entry.name);
      const haystack = normalize(`${entry.id} ${entry.name} ${entry.description}`);
      let score = name === phrase ? 1000 : name.includes(phrase) ? 300 : haystack.includes(phrase) ? 100 : 0;
      for (const token of tokens) if (haystack.includes(token)) score += name.includes(token) ? 20 : 4;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id))
    .slice(0, parsedLimit)
    .map(({ entry }) => ({
      ...entry,
      sourceFile: "upstream/README.md",
      integration: {
        mode: "reference-adaptation",
        status: "review",
        implementationLicense: "unverified",
        requirement: "Verify the linked page's source license, dependencies, and project fit before implementation.",
      },
    }));
  return {
    schema: "design-pipeline.shadcnio-react-components-search.v1",
    status: "ready",
    query,
    category,
    revision: loaded.manifest.source.revision,
    totalEntries: loaded.entries.length,
    results,
    instruction: "Use results as reference evidence only; the bundled repository does not contain linked page implementation code.",
  };
}

module.exports = { loadShadcnioComponents, searchShadcnioComponents, verifyShadcnioComponentSnapshot };
