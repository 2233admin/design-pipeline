#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const GROUPS = Object.freeze(["basic", "web", "game", "text", "scene"]);
const CATEGORIES = {
  basic: "principles easing spring timing entrance move scale rotate reaction collection attention svg-path".split(" "),
  web: "web-scroll web-interaction web-layout web-feedback form-state gesture ui-button ui-control ui-navigation ui-loading ui-feedback data-story".split(" "),
  game: "game-hud game-combat game-reward game-progress game-cinematic ui-spatial ui-material game-impact-fx".split(" "),
  scene: "light effect transitions camera particles loops character look depth3d sound".split(" "),
};
function fail(id, message) { throw new Error(`${id}: ${message}`); }
function groupFor(category) {
  if (category.startsWith("tx-")) return "text";
  return Object.keys(CATEGORIES).find(group => CATEGORIES[group].includes(category));
}
function validateCoverage(snapshot, inventory, modules) {
  if (!Array.isArray(inventory.items) || !Array.isArray(snapshot.docs)) fail("coverage", "inventory items and catalogue docs are required");
  const expected = new Map();
  for (const item of inventory.items) {
    if (!item.id || expected.has(item.id)) fail(item.id || "inventory", "duplicate or absent inventory ID");
    if (!groupFor(item.category)) fail(item.id, `unassigned category ${item.category}`);
    expected.set(item.id, item);
  }
  if (inventory.counts.finalUniqueCount !== expected.size) fail("inventory", "declared unique count differs from identity membership");
  const proofs = inventory.countProof?.categorySets;
  if (!Array.isArray(proofs) || proofs.length !== inventory.counts.categoryCount) fail("inventory", "category membership proof missing");
  const proven = new Set();
  const categories = new Set();
  for (const proof of proofs) {
    if (categories.has(proof.id) || !Array.isArray(proof.ids) || proof.count !== proof.ids.length) fail(proof.id, "invalid category count proof");
    categories.add(proof.id);
    for (const id of proof.ids) {
      if (proven.has(id) || expected.get(id)?.category !== proof.id) fail(id, "independent category identity mismatch");
      proven.add(id);
    }
    const declared = inventory.categories.find(category => category.id === proof.id);
    if (!declared || declared.count !== proof.count) fail(proof.id, "category filter/sidebar count mismatch");
  }
  if (proven.size !== expected.size || inventory.countProof.observedCount !== expected.size) fail("inventory", "independent observed membership differs");
  const actual = new Map();
  for (const record of snapshot.docs.filter(row => row.id.startsWith("motion-reference/"))) {
    const id = record.id.slice("motion-reference/".length);
    if (actual.has(id)) fail(id, "duplicate catalogue variant");
    const item = expected.get(id);
    if (!item) fail(id, "extra catalogue variant absent from inventory");
    if (record.sourceId !== "design-pipeline/motion-recipes" || record.recordType !== "method" || record.availability !== "project-owned" || record.license?.state !== "project-owned" || record.webRanking !== false) fail(id, "invalid canonical method ownership");
    const config = record.motionRecipe;
    if (!config || config.variantId !== id) fail(id, "variant ID mismatch");
    if (record.category !== `motion-reference-${item.category}` || config.group !== groupFor(item.category)) fail(id, "category/group mismatch");
    if (!config.recipeId?.startsWith(`${config.group}.`)) fail(id, "descriptor/group mismatch");
    const module = modules[config.group];
    const descriptor = module?.recipes?.[config.recipeId];
    if (module?.group !== config.group || !descriptor || typeof descriptor.validate !== "function" || typeof descriptor.create !== "function" || !descriptor.title) fail(id, `unsupported descriptor ${config.recipeId}`);
    if (!config.parameters || typeof config.parameters !== "object" || Array.isArray(config.parameters)) fail(id, "parameters must be an explicit object");
    if (!Number.isFinite(config.studyDurationMs) || config.studyDurationMs <= 0) fail(id, "invalid study duration");
    if (!Array.isArray(config.usage) || !config.usage.length || config.usage.some(value => !["web", "ui", "film", "edit"].includes(value)) || !config.rationale) fail(id, "usage/rationale missing or unsupported");
    if (!record.name?.en || !record.name?.zh || !record.description || !Array.isArray(record.keywords)) fail(id, "bilingual discovery metadata missing");
    if (record.localPaths?.guide !== `references/motion-recipes/families/${config.group}.md` || record.localPaths?.implementation !== "tools/motion-recipes/full/index.html") fail(id, "local guide/preview path mismatch");
    if (record.inspiration?.url !== item.detailUrl || record.inspiration?.codeCopied !== false || record.inspiration?.assetsCopied !== false || record.inspiration?.redistributionLicense !== "unverified") fail(id, "source attribution boundary mismatch");
    try { descriptor.validate(config.parameters); } catch (error) { fail(id, `unsupported parameters for ${config.recipeId}: ${error.message}`); }
    actual.set(id, record);
  }
  const missing = [...expected.keys()].filter(id => !actual.has(id));
  if (missing.length) fail("coverage", `missing catalogue variants: ${missing.join(", ")}`);
  return [...actual.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function projectData(snapshot, inventory, modules) {
  return validateCoverage(snapshot, inventory, modules).map(record => ({
    id: record.motionRecipe.variantId, name: record.name, category: record.category.slice("motion-reference-".length),
    description: record.description, keywords: record.keywords, guide: record.localPaths.guide,
    inspiration: record.inspiration, motionRecipe: record.motionRecipe,
  }));
}
function serializeData(records) {
  return `/* Generated from component-source-catalog.json by build-data.cjs; do not curate here. */\n(function (root) {\n  "use strict";\n  const records = ${JSON.stringify(records, null, 2).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")};\n  if (typeof module === "object" && module.exports) module.exports = records;\n  else root.MotionRecipeData = records;\n})(typeof globalThis === "object" ? globalThis : this);\n`;
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(file, `unable to read JSON: ${error.message}`); }
}
function loadInputs(root = path.resolve(__dirname, "../../..")) {
  return {
    snapshot: readJson(path.join(root, "references/component-source-catalog.json")),
    inventory: readJson(path.join(root, "references/motion-recipes/full-inventory.json")),
    modules: Object.fromEntries(GROUPS.map(group => [group, require(path.join(root, `tools/motion-recipes/full/${group}.js`))])),
  };
}
function build({ check = false, root, output = path.join(__dirname, "data.js") } = {}) {
  const inputs = loadInputs(root);
  const content = serializeData(projectData(inputs.snapshot, inputs.inventory, inputs.modules));
  if (check) {
    if (!fs.existsSync(output) || fs.readFileSync(output, "utf8") !== content) fail("data.js", "projection is missing or stale; run this helper without --check");
  } else fs.writeFileSync(output, content);
  return inputs.inventory.items.length;
}
if (require.main === module) {
  try {
    if (process.argv.slice(2).some(arg => arg !== "--check") || process.argv.slice(2).length > 1) fail("usage", "only --check is supported");
    const count = build({ check: process.argv.includes("--check") });
    console.log(`${process.argv.includes("--check") ? "Checked" : "Wrote"} ${count} original motion variants`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { GROUPS, groupFor, validateCoverage, projectData, serializeData, loadInputs, build };
