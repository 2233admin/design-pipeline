"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultManifest = path.resolve(__dirname, "../references/prism-system/manifest.json");
const schema = "design-pipeline.prism-system-source.v1";

function invalid(message) {
  const error = new Error(`Prism System: ${message}`);
  error.code = "INVALID_PRISM_SYSTEM";
  throw error;
}

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
    invalid(`${label} must be a safe relative path`);
  }
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

function gitTreeId(root) {
  function hashDirectory(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .map((entry) => ({ entry, name: entry.name }))
      .sort((left, right) => Buffer.compare(
        Buffer.from(`${left.name}${left.entry.isDirectory() ? "/" : ""}`),
        Buffer.from(`${right.name}${right.entry.isDirectory() ? "/" : ""}`),
      ));
    const content = Buffer.concat(entries.map(({ entry, name }) => {
      const absolute = path.join(directory, name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) invalid(`snapshot contains a symbolic link: ${absolute}`);
      const tree = entry.isDirectory();
      if (!tree && !entry.isFile()) invalid(`snapshot contains an unsupported entry: ${absolute}`);
      const oid = tree ? hashDirectory(absolute) : gitObjectId("blob", fs.readFileSync(absolute));
      return Buffer.concat([Buffer.from(`${tree ? "40000" : "100644"} ${name}\0`), Buffer.from(oid, "hex")]);
    }));
    return gitObjectId("tree", content);
  }
  return hashDirectory(root);
}

function snapshotSha256(root, files) {
  const records = files.map((relative) => {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
    return `${relative.split(path.sep).join("/")}\0${hash}\n`;
  });
  return crypto.createHash("sha256").update(records.join(""), "utf8").digest("hex");
}

function loadPrismCatalog(manifestFile = defaultManifest) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { invalid(`cannot read manifest: ${error.message}`); }
  if (manifest?.schema !== schema) invalid("unsupported manifest schema");
  if (!manifest.source || !/^[a-f0-9]{40}$/.test(manifest.source.revision || "")) invalid("source revision is invalid");
  if (manifest.source.license !== "MIT") invalid("source license is invalid");
  if (!/^[a-f0-9]{40}$/.test(manifest.source.skillsTree || "")) invalid("source skills tree is invalid");
  if (!/^[a-f0-9]{40}$/.test(manifest.source.licenseBlob || "")) invalid("source license blob is invalid");
  safeRelative(manifest.snapshot?.root, "snapshot.root");
  if (!Number.isInteger(manifest.snapshot.fileCount) || manifest.snapshot.fileCount < 1) invalid("snapshot.fileCount is invalid");
  if (!Number.isInteger(manifest.snapshot.byteCount) || manifest.snapshot.byteCount < 1) invalid("snapshot.byteCount is invalid");
  if (!/^[a-f0-9]{64}$/.test(manifest.snapshot.treeSha256 || "")) invalid("snapshot.treeSha256 is invalid");
  if (!manifest.index || !Number.isInteger(manifest.index.skillCount) || manifest.index.skillCount < 1) invalid("index.skillCount is invalid");
  if (!manifest.index.categories || typeof manifest.index.categories !== "object" || Array.isArray(manifest.index.categories)) invalid("index.categories is invalid");
  if (!Array.isArray(manifest.routes) || !manifest.routes.length) invalid("routes are invalid");

  const root = path.dirname(path.resolve(manifestFile));
  const snapshotRoot = path.join(root, manifest.snapshot.root);
  let registry;
  let extended;
  try {
    registry = JSON.parse(fs.readFileSync(path.join(snapshotRoot, "skills", "skills.json"), "utf8"));
    extended = JSON.parse(fs.readFileSync(path.join(snapshotRoot, "skills", "skills.extended.json"), "utf8"));
  } catch (error) { invalid(`cannot read bundled registries: ${error.message}`); }
  if (registry.name !== manifest.index.name || registry.version !== manifest.index.version) invalid("registry identity does not match manifest");
  if (!Array.isArray(registry.skills) || registry.skills.length !== manifest.index.skillCount) invalid("registry skill count does not match manifest");
  if (!extended.skills || typeof extended.skills !== "object" || Array.isArray(extended.skills)) invalid("extended registry is invalid");

  const names = new Set();
  const categoryCounts = {};
  for (const [index, skill] of registry.skills.entries()) {
    for (const key of ["name", "description", "category", "path", "autonomy"]) {
      if (typeof skill?.[key] !== "string" || !skill[key]) invalid(`skills[${index}].${key} is invalid`);
    }
    safeRelative(skill.path, `skills[${index}].path`);
    if (!Array.isArray(skill.agents) || skill.agents.some((agent) => typeof agent !== "string" || !agent)) invalid(`skills[${index}].agents is invalid`);
    if (names.has(skill.name)) invalid(`duplicate skill name: ${skill.name}`);
    names.add(skill.name);
    categoryCounts[skill.category] = (categoryCounts[skill.category] || 0) + 1;
    if (!Object.hasOwn(extended.skills, skill.name)) invalid(`missing extended metadata: ${skill.name}`);
  }
  const sortedCounts = (value) => Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  if (JSON.stringify(sortedCounts(categoryCounts)) !== JSON.stringify(sortedCounts(manifest.index.categories))) invalid("category counts do not match manifest");
  if (Object.keys(extended.skills).length !== registry.skills.length) invalid("extended registry count does not match skills registry");
  const knownPaths = new Set(registry.skills.map((skill) => skill.path));
  for (const route of manifest.routes) {
    if (typeof route.id !== "string" || !route.id || !Array.isArray(route.keywords) || !route.keywords.length || !Array.isArray(route.sequence) || !route.sequence.length) invalid("route is invalid");
    for (const skillPath of route.sequence) if (!knownPaths.has(skillPath)) invalid(`route ${route.id} references unknown skill ${skillPath}`);
  }
  return { manifest, registry, extended, root, snapshotRoot };
}

function verifyPrismSnapshot(manifestFile = defaultManifest) {
  let loaded;
  try { loaded = loadPrismCatalog(manifestFile); }
  catch (error) {
    return { schema: "design-pipeline.prism-system-verification.v1", status: "blocked", issues: [error.message] };
  }
  const files = collectFiles(loaded.snapshotRoot).sort();
  const bytes = files.reduce((sum, relative) => sum + fs.statSync(path.join(loaded.snapshotRoot, relative)).size, 0);
  const treeSha256 = snapshotSha256(loaded.snapshotRoot, files);
  const skillsTree = gitTreeId(path.join(loaded.snapshotRoot, "skills"));
  const licenseBlob = gitObjectId("blob", fs.readFileSync(path.join(loaded.snapshotRoot, "LICENSE")));
  const issues = [];
  if (files.length !== loaded.manifest.snapshot.fileCount) issues.push(`file count ${files.length} != ${loaded.manifest.snapshot.fileCount}`);
  if (bytes !== loaded.manifest.snapshot.byteCount) issues.push(`byte count ${bytes} != ${loaded.manifest.snapshot.byteCount}`);
  if (treeSha256 !== loaded.manifest.snapshot.treeSha256) issues.push(`tree hash ${treeSha256} != ${loaded.manifest.snapshot.treeSha256}`);
  if (skillsTree !== loaded.manifest.source.skillsTree) issues.push(`skills Git tree ${skillsTree} != ${loaded.manifest.source.skillsTree}`);
  if (licenseBlob !== loaded.manifest.source.licenseBlob) issues.push(`license Git blob ${licenseBlob} != ${loaded.manifest.source.licenseBlob}`);
  for (const skill of loaded.registry.skills) {
    if (!fs.existsSync(path.join(loaded.snapshotRoot, "skills", skill.path))) issues.push(`missing skill source: ${skill.path}`);
  }
  return {
    schema: "design-pipeline.prism-system-verification.v1",
    status: issues.length ? "blocked" : "ready",
    revision: loaded.manifest.source.revision,
    files: files.length,
    bytes,
    skills: loaded.registry.skills.length,
    categories: loaded.manifest.index.categories,
    routes: loaded.manifest.routes.length,
    treeSha256,
    skillsTree,
    licenseBlob,
    issues,
  };
}

function normalize(text) {
  return text.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

function searchPrismSkills({ query, category = null, limit = 5, manifestFile = defaultManifest }) {
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const parsedLimit = Number.parseInt(String(limit), 10);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) invalid("limit must be an integer from 1 to 20");
  const loaded = loadPrismCatalog(manifestFile);
  const verification = verifyPrismSnapshot(manifestFile);
  if (verification.status !== "ready") invalid(`snapshot verification failed: ${verification.issues.join("; ")}`);
  if (category !== null && !Object.hasOwn(loaded.manifest.index.categories, category)) invalid(`unknown category: ${category}`);
  const phrase = normalize(query);
  const tokens = [...new Set(phrase.split(" ").filter((token) => token.length > 1))];
  const results = loaded.registry.skills
    .filter((skill) => category === null || skill.category === category)
    .map((skill) => {
      const metadata = loaded.extended.skills[skill.name];
      const name = normalize(skill.name);
      const haystack = normalize(`${skill.name} ${skill.description} ${skill.category} ${skill.path} ${skill.agents.join(" ")} ${JSON.stringify(metadata)}`);
      let score = name === phrase ? 1000 : name.includes(phrase) ? 300 : haystack.includes(phrase) ? 100 : 0;
      for (const token of tokens) if (haystack.includes(token)) score += name.includes(token) ? 20 : 4;
      return { score, skill, metadata };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.skill.name.localeCompare(right.skill.name))
    .slice(0, parsedLimit)
    .map(({ skill, metadata }) => ({
      ...skill,
      metadata,
      skillPath: path.join(loaded.snapshotRoot, "skills", skill.path),
    }));
  return {
    schema: "design-pipeline.prism-system-search.v1",
    status: "ready",
    query,
    category,
    revision: loaded.manifest.source.revision,
    totalSkills: loaded.registry.skills.length,
    results,
    instruction: "Read only the narrowest matching bundled skill. Project DESIGN/MOTION, current code, and workspace authority rules override upstream recipes.",
  };
}

function routePrismRequest({ query, manifestFile = defaultManifest }) {
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const loaded = loadPrismCatalog(manifestFile);
  const text = query.toLocaleLowerCase("en-US");
  const scored = loaded.manifest.routes.map((route, order) => {
    const matchedKeywords = route.keywords.filter((keyword) => text.includes(keyword));
    return { route, order, score: matchedKeywords.length, matchedKeywords };
  }).sort((left, right) => right.score - left.score || left.order - right.order);
  const [top, second] = scored;
  const ambiguous = top.score === 0 || top.score === second.score;
  return {
    schema: "design-pipeline.prism-system-route.v1",
    status: top.score === 0 ? "needs-clarification" : "ready",
    query,
    route: top.score === 0 ? null : top.route.id,
    confidence: top.score === 0 ? "none" : ambiguous ? "low" : top.score >= 3 ? "high" : "medium",
    ambiguous,
    sequence: top.score === 0 ? [] : top.route.sequence,
    candidates: scored.map(({ route, score, matchedKeywords }) => ({ id: route.id, score, matchedKeywords })),
    instruction: ambiguous ? "Use project context to resolve the top candidates; ask one concise question only if the choice changes the work." : "Load Design DNA first, then run the narrow sequence through the native pipeline stages.",
  };
}

module.exports = { loadPrismCatalog, routePrismRequest, searchPrismSkills, verifyPrismSnapshot };
