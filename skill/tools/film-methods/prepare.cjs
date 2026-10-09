"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, assertKeys, assertString, assertStringArray, fail, readJson, resolveInside, sha256 } = require("../../scripts/contract-utils.cjs");
const { checkStoryboard } = require("../../scripts/film-core.cjs");

const scope = "film methods";
const vendor = path.resolve(__dirname, "../../vendor");
const cinetic = "cinetic/upstream/skills/cinetic";
const SOURCES = {
  cinetic: { bundle: "cinetic", entry: "skills/cinetic/SKILL.md" },
  "product-film": { bundle: "product-film-skill", entry: "plugins/product-film/skills/product-film/SKILL.md" },
};
const TASKS = ["product-film", "feature-loop", "logo-sting", "motion-study"];
const MODES = ["import-as-is", "frame-twin", "redraw"];

function sourceRecord(method) {
  const source = SOURCES[method];
  const manifest = readJson(path.join(vendor, source.bundle, "manifest.json"), scope);
  return { method, ...manifest.source, entry: `vendor/${source.bundle}/upstream/${source.entry}`, entrySha256: sha256(sourceBytes(source.bundle, source.entry)), snapshotSha256: manifest.snapshot.treeSha256 };
}

function sourceBytes(bundle, file) {
  const manifest = readJson(path.join(vendor, bundle, "manifest.json"), scope);
  const expected = manifest.snapshot.objects.find((item) => item.path === file);
  const bytes = fs.readFileSync(path.join(vendor, bundle, "upstream", file));
  if (!expected || sha256(bytes) !== expected.sha256) fail(scope, `source snapshot mismatch: ${bundle}/${file}`, { code: "SOURCE_CHANGED" });
  return bytes;
}

function fileRecord(root, file, label) {
  const target = resolveInside(root, file, label, { mustExist: true, scope });
  if (!fs.statSync(target).isFile()) fail(scope, `${label} must be a regular file`);
  return { file: path.relative(root, target).split(path.sep).join("/"), sha256: sha256(fs.readFileSync(target)) };
}

function prepareFilmMethods(projectRoot, request, options = {}) {
  const root = path.resolve(options.root || projectRoot);
  const project = resolveInside(root, projectRoot, "project-root", { mustExist: true, scope });
  assertKeys(request, ["task", "methods", "concept"], ["task", "methods", "concept", "brand", "components", "techniques"], "request", scope);
  assertEnum(request.task, TASKS, "task", scope);
  assertStringArray(request.methods, "methods", scope, { min: 1, unique: true });
  for (const method of request.methods) assertEnum(method, Object.keys(SOURCES), "method", scope);
  assertString(request.concept, "concept", scope);
  const boardPath = path.join(project, "storyboard.json");
  const board = readJson(boardPath, scope);
  const storyboard = checkStoryboard(board);
  if (storyboard.status !== "passed") fail(scope, "storyboard must pass the existing film-storyboard gate before method preparation", { code: "STORYBOARD_FAILED", result: storyboard });
  for (const name of ["brand", "components"]) if (request[name] !== undefined && !Array.isArray(request[name])) fail(scope, `${name} must be an array`);
  const brand = (request.brand || []).map((item) => {
    assertKeys(item, ["file", "note"], ["file", "note"], "brand", scope);
    assertString(item.note, "brand.note", scope);
    return { ...fileRecord(root, item.file, "brand.file"), note: item.note };
  });
  const components = (request.components || []).map((item) => {
    assertKeys(item, ["file", "mode", "reason"], ["file", "mode", "reason"], "component", scope);
    assertEnum(item.mode, MODES, "component.mode", scope);
    assertString(item.reason, "component.reason", scope);
    return { ...fileRecord(root, item.file, "component.file"), mode: item.mode, reason: item.reason };
  });
  if (request.methods.includes("product-film") && (!brand.length || !components.length)) fail(scope, "product-film requires inspected brand and real component sources with reuse reasons", { code: "PRODUCT_SOURCE_REQUIRED" });
  const ids = request.techniques || [];
  assertStringArray(ids, "techniques", scope, { unique: true, min: request.methods.includes("cinetic") ? 1 : 0 });
  if (ids.length && !request.methods.includes("cinetic")) fail(scope, "techniques require explicit cinetic selection");
  const libraryPath = path.join(vendor, cinetic, "assets/library/techniques.json");
  const library = ids.length ? JSON.parse(sourceBytes("cinetic", "skills/cinetic/assets/library/techniques.json")).techniques : [];
  const techniques = ids.map((id) => {
    const technique = library.find((entry) => entry.id === id);
    if (!technique) fail(scope, `unknown technique ${id}; read the bundled technique library`, { code: "TECHNIQUE_UNKNOWN" });
    return technique;
  });
  const result = {
    status: "planned", task: request.task, concept: request.concept,
    sources: request.methods.map(sourceRecord),
    storyboard: fileRecord(root, path.relative(root, boardPath), "storyboard"),
    brand, components, techniques,
    techniqueLibrary: ids.length ? { file: `vendor/${cinetic}/assets/library/techniques.json`, sha256: sha256(fs.readFileSync(libraryPath)) } : null,
    fps: board.fps || null, sound: board.sound.mode,
    creativeAcceptance: "not-assessed", files: [],
    next: ["Apply the selected recipes to the existing storyboard and composition; record deviations and actual observations in reference.md and qa.md.", "Render through the selected existing engine (HTML video: HyperFrames), then run film check.", "Watch motion and audition sound when present; record Component Conformance and Visual Acceptance separately."],
  };
  if (options.write) {
    const files = { "film-methods.md": notes(result) };
    if (request.methods.includes("cinetic")) {
      files["lib/cinetic-motion-source.js"] = sourceBytes("cinetic", "skills/cinetic/assets/hyperframes-starter/motion.js");
      files["lib/cinetic-LICENSE"] = sourceBytes("cinetic", "LICENSE");
      files["lib/film-motion.js"] = fs.readFileSync(path.join(__dirname, "motion.js"));
    }
    const targets = Object.keys(files).map((name) => resolveInside(project, name, name, { scope }));
    for (const target of targets) {
      if (fs.existsSync(target) && !fs.statSync(target).isFile()) fail(scope, `output is not a regular file: ${target}`, { code: "OUTPUT_TYPE" });
      let parent = path.dirname(target);
      while (!fs.existsSync(parent)) parent = path.dirname(parent);
      if (!fs.statSync(parent).isDirectory()) fail(scope, `output parent is not a directory: ${parent}`, { code: "OUTPUT_TYPE" });
    }
    const existing = targets.filter((target) => fs.existsSync(target));
    if (existing.length && !options.replace) fail(scope, `refusing to overwrite ${existing.map((target) => path.relative(project, target)).join(", ")}; pass --replace for these method files`, { code: "OUTPUT_EXISTS" });
    for (const [name, content] of Object.entries(files)) {
      const target = resolveInside(project, name, name, { scope });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
      result.files.push({ file: path.relative(root, target).split(path.sep).join("/"), sha256: sha256(content) });
    }
  }
  return result;
}

function notes(result) {
  return `# Selected film methods\n\nTask: ${result.task}\n\nConcept: ${result.concept}\n\nThe existing storyboard remains the plan: ${result.storyboard.file} (SHA-256 ${result.storyboard.sha256}). Frame rate: ${result.fps || "undeclared; choose in the existing storyboard"}; sound: ${result.sound}.\n\n## Complete source entries\n\n${result.sources.map((source) => `- ${source.method}: ${source.entry}; ${source.repository}@${source.revision}; snapshot SHA-256 ${source.snapshotSha256}`).join("\n")}\n\n## Inspected brand and component sources\n\n${result.brand.map((item) => `- Brand: ${item.file} (SHA-256 ${item.sha256}): ${item.note}`).join("\n")}\n${result.components.map((item) => `- Component: ${item.file} (SHA-256 ${item.sha256}), ${item.mode}: ${item.reason}`).join("\n")}\n\nThese hashes establish input identity, not proof that a component was reused or a claim was demonstrated. Add actual product states, claims and rendered observations to reference.md/qa.md. Changed inputs reopen the existing plan and dependent evidence.\n\n## Selected techniques (explicit choices)\n\n${result.techniques.map((item) => `### ${item.id}: ${item.name}\n\n${item.summary}\n\nRecipe: ${item.recipe}\n\nTiming: ${item.timing}\n\nUse when: ${item.use_when}\n\nAvoid when: ${item.avoid_when}\n`).join("\n")}\n\nTreat recipe frame numbers as its source setting; convert time for the selected fps. Record how each choice serves the actual product, what was adapted, and its storyboard beat in existing notes. User/project brand and constraints govern; upstream style bans, random draws, Remotion and 60fps defaults are not adopted.\n\n## Maintained implementation\n\n${result.sources.some((source) => source.method === "cinetic") ? "Load lib/cinetic-motion-source.js then lib/film-motion.js. Use FilmMotion.create({fps: <storyboard fps>, bpm: <chosen/measured tempo>}); E/SPR and closed-form spring reuse Cinetic, while b/sec/at use the caller's fps. Install retains the MIT license. This is a motion primitive adapter, not a renderer or sound generator.\n" : "Use the project's existing components and frame-driven twins; no Cinetic runtime is selected.\n"}\nUnexecuted upstream shell/Python/TS/TSX scripts remain source material. This preparation runs the existing storyboard gate; it does not run render, timeline, audio or creative review.\n\n${result.next.map((line, index) => `${index + 1}. ${line}`).join("\n")}\n\nComponent Conformance: pending existing checks. Visual Acceptance: not assessed.\n`;
}

module.exports = { prepareFilmMethods };
