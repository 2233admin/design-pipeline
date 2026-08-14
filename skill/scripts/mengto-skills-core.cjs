"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultManifest = path.resolve(__dirname, "../references/mengto-skills/manifest.json");
const schema = "design-pipeline.mengto-skills-source.v1";
const searchOverlays = {
  "web-design/build-threejs-scroll-worlds": {
    terms: "kage kyoto temple editorial night walk",
    references: ["kage-scroll-world.md"],
  },
};

function invalid(message) {
  const error = new Error(`MengTo skills catalog: ${message}`);
  error.code = "INVALID_MENGTO_CATALOG";
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

function loadMengToCatalog(manifestFile = defaultManifest) {
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
  const executableFiles = new Set();
  for (const [index, file] of manifest.snapshot.executableFiles.entries()) {
    safeRelative(file, `snapshot.executableFiles[${index}]`);
    if (executableFiles.has(file)) invalid(`duplicate executable file: ${file}`);
    executableFiles.add(file);
  }
  if (!Array.isArray(manifest.snapshot.objects) || manifest.snapshot.objects.length !== manifest.snapshot.fileCount) {
    invalid("snapshot.objects does not match snapshot.fileCount");
  }
  const objectPaths = new Set();
  for (const [index, object] of manifest.snapshot.objects.entries()) {
    if (!object || typeof object !== "object") invalid(`snapshot.objects[${index}] is invalid`);
    safeRelative(object.path, `snapshot.objects[${index}].path`);
    if (!new Set(["100644", "100755"]).has(object.mode)) invalid(`snapshot.objects[${index}].mode is invalid`);
    if (!/^[a-f0-9]{40}$/.test(object.oid || "")) invalid(`snapshot.objects[${index}].oid is invalid`);
    if (!Number.isInteger(object.size) || object.size < 0) invalid(`snapshot.objects[${index}].size is invalid`);
    if (objectPaths.has(object.path)) invalid(`duplicate snapshot object: ${object.path}`);
    objectPaths.add(object.path);
  }
  if (!manifest.categories || typeof manifest.categories !== "object" || Array.isArray(manifest.categories)) {
    invalid("categories is invalid");
  }
  if (!Array.isArray(manifest.skills) || !manifest.skills.length) invalid("skills must be a non-empty array");

  const ids = new Set();
  const paths = new Set();
  const categoryCounts = {};
  for (const [index, skill] of manifest.skills.entries()) {
    if (!skill || typeof skill !== "object") invalid(`skills[${index}] is invalid`);
    for (const key of ["id", "name", "category", "description", "activation"]) {
      if (typeof skill[key] !== "string" || !skill[key]) invalid(`skills[${index}].${key} is invalid`);
    }
    safeRelative(skill.path, `skills[${index}].path`);
    if (!Array.isArray(skill.stages) || !skill.stages.length || skill.stages.some((stage) => typeof stage !== "string" || !stage)) {
      invalid(`skills[${index}].stages is invalid`);
    }
    if (!new Set(["automatic", "explicit"]).has(skill.activation)) invalid(`skills[${index}].activation is invalid`);
    if (skill.id !== `${skill.category}/${skill.name}`) invalid(`skills[${index}].id is inconsistent`);
    if (skill.path !== `upstream/agent-skills/${skill.category}/${skill.name}/SKILL.md`) {
      invalid(`skills[${index}].path is inconsistent`);
    }
    if (ids.has(skill.id)) invalid(`duplicate skill id: ${skill.id}`);
    if (paths.has(skill.path)) invalid(`duplicate skill path: ${skill.path}`);
    ids.add(skill.id);
    paths.add(skill.path);
    categoryCounts[skill.category] = (categoryCounts[skill.category] || 0) + 1;
  }
  if (JSON.stringify(Object.entries(manifest.categories).sort()) !== JSON.stringify(Object.entries(categoryCounts).sort())) {
    invalid("category counts do not match skills");
  }
  return { manifest, manifestFile: path.resolve(manifestFile), root: path.dirname(path.resolve(manifestFile)) };
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

function verifyMengToSnapshot(manifestFile = defaultManifest) {
  const loaded = loadMengToCatalog(manifestFile);
  const sourceRoot = path.join(loaded.root, loaded.manifest.snapshot.root);
  if (!fs.existsSync(sourceRoot)) {
    return { schema: "design-pipeline.mengto-skills-verification.v1", status: "blocked", issues: ["snapshot root is missing"] };
  }
  const sourceStat = fs.lstatSync(sourceRoot);
  if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
    return { schema: "design-pipeline.mengto-skills-verification.v1", status: "blocked", issues: ["snapshot root is not a real directory"] };
  }
  const files = collectFiles(sourceRoot).sort();
  const normalizedFiles = files.map((relative) => relative.split(path.sep).join("/"));
  const objectByPath = new Map(loaded.manifest.snapshot.objects.map((object) => [object.path, object]));
  const byteCount = files.reduce((sum, relative) => sum + fs.statSync(path.join(sourceRoot, relative)).size, 0);
  const entries = files.map((relative) => {
    const content = fs.readFileSync(path.join(sourceRoot, relative));
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return `${relative.split(path.sep).join("/")}\0${hash}\n`;
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
  const executableFiles = new Set(loaded.manifest.snapshot.executableFiles);
  const recordedExecutables = loaded.manifest.snapshot.objects.filter((object) => object.mode === "100755").map((object) => object.path).sort();
  if (JSON.stringify([...executableFiles].sort()) !== JSON.stringify(recordedExecutables)) issues.push("executable file metadata does not match Git object inventory");
  for (const file of executableFiles) if (!normalizedFiles.includes(file)) issues.push(`missing executable source file: ${file}`);
  const discoveredSkills = normalizedFiles
    .filter((relative) => /^agent-skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(relative))
    .sort();
  const declaredSkills = loaded.manifest.skills
    .map((skill) => skill.path.replace(/^upstream\//, ""))
    .sort();
  if (JSON.stringify(discoveredSkills) !== JSON.stringify(declaredSkills)) issues.push("skill catalog does not match bundled SKILL.md files");
  for (const skill of loaded.manifest.skills) {
    const file = path.join(loaded.root, skill.path);
    if (!fs.existsSync(file)) issues.push(`missing skill: ${skill.id}`);
  }
  return {
    schema: "design-pipeline.mengto-skills-verification.v1",
    status: issues.length ? "blocked" : "ready",
    revision: loaded.manifest.source.revision,
    files: files.length,
    bytes: byteCount,
    skills: loaded.manifest.skills.length,
    executableFiles: executableFiles.size,
    treeSha256,
    gitTree: gitTreeId(loaded.manifest.snapshot.objects),
    issues,
  };
}

function normalize(text) {
  return text.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

function searchMengToSkills({ query, category = null, limit = 5, manifestFile = defaultManifest }) {
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const limitText = String(limit);
  if (!/^(?:[1-9]|1[0-9]|20)$/.test(limitText)) invalid("limit must be an integer from 1 to 20");
  const parsedLimit = Number(limitText);
  const loaded = loadMengToCatalog(manifestFile);
  const verification = verifyMengToSnapshot(manifestFile);
  if (verification.status !== "ready") invalid(`snapshot verification failed: ${verification.issues.join("; ")}`);
  if (category !== null && !Object.hasOwn(loaded.manifest.categories, category)) invalid(`unknown category: ${category}`);
  const phrase = normalize(query);
  if (!phrase) invalid("query must contain searchable letters or numbers");
  const tokens = [...new Set(phrase.split(" ").filter((token) => token.length > 1))];
  const results = loaded.manifest.skills
    .filter((skill) => category === null || skill.category === category)
    .map((skill) => {
      const name = normalize(skill.name);
      const overlay = searchOverlays[skill.id];
      const overlayTerms = normalize(overlay?.terms || "");
      const haystack = normalize(`${skill.id} ${skill.name} ${skill.description} ${skill.stages.join(" ")} ${overlayTerms}`);
      let score = name === phrase ? 1000 : name.includes(phrase) ? 300 : haystack.includes(phrase) ? 100 : 0;
      if (overlayTerms.split(" ").includes(phrase)) score += 500;
      for (const token of tokens) if (haystack.includes(token)) score += name.includes(token) ? 20 : 4;
      return { score, skill };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id))
    .slice(0, parsedLimit)
    .map(({ skill }) => {
      const overlay = searchOverlays[skill.id];
      return {
        ...skill,
        skillPath: path.join(loaded.root, skill.path),
        pipelineReferences: (overlay?.references || []).map((reference) => path.join(loaded.root, "..", reference)),
      };
    });
  return {
    schema: "design-pipeline.mengto-skills-search.v1",
    status: "ready",
    query,
    category,
    revision: loaded.manifest.source.revision,
    totalSkills: loaded.manifest.skills.length,
    results,
    instruction: "Read the narrowest matching bundled SKILL.md and its linked files; project DESIGN/MOTION and repository rules remain authoritative.",
  };
}

module.exports = { gitTreeId, loadMengToCatalog, searchMengToSkills, verifyMengToSnapshot };
