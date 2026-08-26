"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultManifest = path.resolve(__dirname, "../references/iart-motion-skills/manifest.json");
const schema = "design-pipeline.iart-motion-skills-source.v1";
const searchOverlays = {
  "web-animation-skills/gsap-web": { terms: "scrolltrigger lenis splittext flip pin scrub" },
  "web-animation-skills/accessible-animation": { terms: "prefers reduced motion reduced-motion" },
  "web-animation-skills/page-transition-animation": { terms: "view transitions route transition" },
  "webgl-animation-skills/threejs-animation": { terms: "three.js webgl shader scene" },
  "kinetic-typography-skills/kinetic-typography": { terms: "kinetic type text animation titles" },
};

function invalid(message) {
  const error = new Error(`iart motion skills catalog: ${message}`);
  error.code = "INVALID_IART_MOTION_CATALOG";
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

function loadIartCatalog(manifestFile = defaultManifest) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { invalid(`cannot read manifest: ${error.message}`); }
  if (manifest?.schema !== schema) invalid("unsupported manifest schema");
  if (!manifest.index || !/^[a-f0-9]{40}$/.test(manifest.index.revision || "")) invalid("index revision is invalid");
  if (manifest.index.license !== "MIT") invalid("index license is invalid");
  if (!Array.isArray(manifest.packs) || !manifest.packs.length) invalid("packs must be a non-empty array");
  if (!Array.isArray(manifest.excluded)) invalid("excluded must be an array");
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
  if (!Array.isArray(manifest.skills) || !manifest.skills.length) invalid("skills must be a non-empty array");
  const ids = new Set();
  const familyCounts = {};
  for (const [index, skill] of manifest.skills.entries()) {
    for (const key of ["id", "name", "pack", "family", "description", "activation"]) {
      if (typeof skill[key] !== "string" || !skill[key]) invalid(`skills[${index}].${key} is invalid`);
    }
    safeRelative(skill.path, `skills[${index}].path`);
    if (!Array.isArray(skill.stages) || !skill.stages.length) invalid(`skills[${index}].stages is invalid`);
    if (!new Set(["automatic", "explicit"]).has(skill.activation)) invalid(`skills[${index}].activation is invalid`);
    if (skill.id !== `${skill.pack}/${skill.name}`) invalid(`skills[${index}].id is inconsistent`);
    if (skill.path !== `upstream/${skill.pack}/skills/${skill.name}/SKILL.md`) invalid(`skills[${index}].path is inconsistent`);
    if (ids.has(skill.id)) invalid(`duplicate skill id: ${skill.id}`);
    ids.add(skill.id);
    familyCounts[skill.family] = (familyCounts[skill.family] || 0) + 1;
  }
  if (JSON.stringify(Object.entries(manifest.families || {}).sort()) !== JSON.stringify(Object.entries(familyCounts).sort())) {
    invalid("family counts do not match skills");
  }
  return { manifest, manifestFile: path.resolve(manifestFile), root: path.dirname(path.resolve(manifestFile)) };
}

function verifyIartSnapshot(manifestFile = defaultManifest) {
  const loaded = loadIartCatalog(manifestFile);
  const sourceRoot = path.join(loaded.root, loaded.manifest.snapshot.root);
  if (!fs.existsSync(sourceRoot) || fs.lstatSync(sourceRoot).isSymbolicLink() || !fs.statSync(sourceRoot).isDirectory()) {
    return { schema: "design-pipeline.iart-motion-skills-verification.v1", status: "blocked", issues: ["snapshot root is missing"] };
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
  const discoveredSkills = normalizedFiles.filter((relative) => /^[^/]+\/skills\/[^/]+\/SKILL\.md$/.test(relative)).sort();
  const declaredSkills = loaded.manifest.skills.map((skill) => skill.path.replace(/^upstream\//, "")).sort();
  if (JSON.stringify(discoveredSkills) !== JSON.stringify(declaredSkills)) issues.push("skill catalog does not match bundled SKILL.md files");
  for (const skill of loaded.manifest.skills) {
    if (!fs.existsSync(path.join(loaded.root, skill.path))) issues.push(`missing skill: ${skill.id}`);
  }
  if (normalizedFiles.some((relative) => relative.startsWith("generative-illustration-skills/"))) {
    issues.push("excluded generative-illustration-skills was copied");
  }
  return {
    schema: "design-pipeline.iart-motion-skills-verification.v1",
    status: issues.length ? "blocked" : "ready",
    revision: loaded.manifest.index.revision,
    files: normalizedFiles.length,
    bytes: byteCount,
    skills: loaded.manifest.skills.length,
    packs: loaded.manifest.packs.length,
    excluded: loaded.manifest.excluded.map((entry) => entry.id),
    treeSha256,
    issues,
  };
}

function normalize(text) {
  return text.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

const FAMILY_ROUTES = [
  {
    id: "motion-graphics",
    runtime: "hyperframes",
    keywords: [
      "tiktok", "reels", "shorts", "caption", "lower third", "explainer", "whiteboard",
      "audiogram", "youtube", "promo", "testimonial", "ad creative", "product demo",
      "slideshow", "map animation", "short-form", "remotion", "manim", "after effects",
      "aftereffects", "短视频", "片头", "字幕", "解说",
    ],
  },
  {
    id: "web-motion",
    runtime: "css-gsap",
    keywords: [
      "gsap", "scrolltrigger", "lottie", "svg", "page transition", "micro-interaction",
      "accessible animation", "reduced motion", "60fps", "kinetic", "glassmorphism", "lenis",
    ],
  },
  {
    id: "webgl",
    runtime: "threejs",
    keywords: ["three.js", "threejs", "webgl", "shader", "glsl", "particle", "粒子"],
  },
  {
    id: "motion-design",
    runtime: "css-gsap",
    keywords: [
      "animation principles", "art direction", "logo animation", "color motion",
      "beat sync", "shot composition", "motion background",
    ],
  },
  {
    id: "ops",
    runtime: "none",
    keywords: ["pricing", "client revision", "creative brief", "delivery spec", "brand motion"],
  },
];

const RUNTIME_OVERRIDES = [
  { runtime: "remotion", keywords: ["remotion"], installRequired: true },
  { runtime: "manim", keywords: ["manim"], installRequired: true },
  { runtime: "after-effects", keywords: ["after effects", "aftereffects"], installRequired: true },
];

function scoreFamilies(text) {
  return FAMILY_ROUTES
    .map((route, order) => {
      const matchedKeywords = route.keywords.filter((keyword) => text.includes(keyword));
      return { ...route, order, score: matchedKeywords.length, matchedKeywords };
    })
    .sort((left, right) => right.score - left.score || left.order - right.order);
}

function resolveRuntime(text, family) {
  const override = RUNTIME_OVERRIDES.find((candidate) => candidate.keywords.some((keyword) => text.includes(keyword)));
  if (override) return { runtime: override.runtime, installRequired: true, matchedKeywords: override.keywords.filter((keyword) => text.includes(keyword)) };
  return { runtime: family?.runtime || "none", installRequired: false, matchedKeywords: [] };
}

function searchIartSkills({ query, family = null, pack = null, limit = 5, manifestFile = defaultManifest }) {
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const limitText = String(limit);
  if (!/^(?:[1-9]|1[0-9]|20)$/.test(limitText)) invalid("limit must be an integer from 1 to 20");
  const parsedLimit = Number(limitText);
  const loaded = loadIartCatalog(manifestFile);
  const verification = verifyIartSnapshot(manifestFile);
  if (verification.status !== "ready") invalid(`snapshot verification failed: ${verification.issues.join("; ")}`);
  if (family !== null && !Object.hasOwn(loaded.manifest.families, family)) invalid(`unknown family: ${family}`);
  if (pack !== null && !loaded.manifest.packs.some((entry) => entry.id === pack)) invalid(`unknown pack: ${pack}`);
  const phrase = normalize(query);
  if (!phrase) invalid("query must contain searchable letters or numbers");
  const tokens = [...new Set(phrase.split(" ").filter((token) => token.length > 1))];
  const results = loaded.manifest.skills
    .filter((skill) => (family === null || skill.family === family) && (pack === null || skill.pack === pack))
    .map((skill) => {
      const name = normalize(skill.name);
      const overlay = searchOverlays[skill.id];
      const overlayTerms = normalize(overlay?.terms || "");
      const haystack = normalize(`${skill.id} ${skill.name} ${skill.description} ${skill.family} ${skill.stages.join(" ")} ${overlayTerms}`);
      let score = name === phrase ? 1000 : name.includes(phrase) ? 300 : haystack.includes(phrase) ? 100 : 0;
      if (overlayTerms.split(" ").includes(phrase)) score += 500;
      for (const token of tokens) if (haystack.includes(token)) score += name.includes(token) ? 20 : 4;
      return { score, skill };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id))
    .slice(0, parsedLimit)
    .map(({ skill }) => ({
      ...skill,
      skillPath: path.join(loaded.root, skill.path),
    }));
  return {
    schema: "design-pipeline.iart-motion-skills-search.v1",
    status: "ready",
    query,
    family,
    pack,
    revision: loaded.manifest.index.revision,
    totalSkills: loaded.manifest.skills.length,
    results,
    instruction: "Read the narrowest matching bundled SKILL.md; project DESIGN/MOTION, HyperFrames for HTML video, and repository rules remain authoritative.",
  };
}

function routeIartRequest({ query, limit = 5, manifestFile = defaultManifest }) {
  if (typeof query !== "string" || !query.trim()) invalid("query is required");
  const text = query.toLocaleLowerCase("en-US");
  const families = scoreFamilies(text);
  const [top, second] = families;
  const familyTie = top.score > 0 && second && top.score === second.score;
  const family = top.score > 0 && !familyTie ? top : null;
  const searched = searchIartSkills({ query, limit, manifestFile });
  const results = searched.results;
  const runtime = resolveRuntime(text, family);
  const selected = results[0] || null;
  const alternatives = results.slice(1, 3);
  const ready = Boolean(family && selected);
  return {
    schema: "design-pipeline.iart-motion-skills-route.v1",
    status: ready ? "ready" : "needs-clarification",
    query,
    family: family?.id || null,
    confidence: !top.score ? "none" : familyTie || !selected ? "low" : top.score >= 2 ? "high" : "medium",
    ambiguous: !ready,
    selected,
    alternatives,
    runtime: runtime.runtime,
    installRequired: runtime.installRequired,
    executableReady: false,
    families: families.map(({ id, score, matchedKeywords, runtime: familyRuntime }) => ({
      id,
      score,
      matchedKeywords,
      runtime: familyRuntime,
    })),
    revision: searched.revision,
    instruction: ready
      ? "Record this selection before implementing. Adapt the selected playbook through MOTION.md. HTML video uses HyperFrames unless Remotion, Manim, or After Effects was named. Do not install a runtime from this result."
      : "Choose among the ranked families and playbooks; ask one question only if the runtime or deliverable changes.",
  };
}

module.exports = { loadIartCatalog, routeIartRequest, searchIartSkills, verifyIartSnapshot };
