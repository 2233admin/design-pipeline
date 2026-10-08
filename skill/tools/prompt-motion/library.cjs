"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, assertKeys, assertString, assertStringArray, fail, readJson, resolveInside } = require("../../scripts/contract-utils.cjs");

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const SCOPE = "film templates";
const HOME = "https://www.prompt-motion.com/";
const CATEGORIES = ["ui-loop", "product-film", "brand-motion", "typography", "data-story", "explainer", "editing", "abstract-motion"];

function date(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail(SCOPE, `${label} must be a calendar date`);
}

function uniqueIds(records, label) {
  if (!Array.isArray(records) || !records.length) fail(SCOPE, `${label} must be a nonempty array`);
  const ids = new Set();
  for (const record of records) {
    if (!record || typeof record.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id) || ids.has(record.id)) fail(SCOPE, `${label} contains an invalid or duplicate id`);
    ids.add(record.id);
  }
  return ids;
}

function loadLibrary(packageRoot = PACKAGE_ROOT) {
  const index = readJson(path.join(packageRoot, "references/prompt-motion/source-index.json"), SCOPE);
  const catalog = readJson(path.join(packageRoot, "references/prompt-motion/templates.json"), SCOPE);
  assertKeys(index, ["source", "entries"], ["source", "entries"], "source index", SCOPE);
  assertKeys(index.source, ["url", "reviewedAt", "pageSha256"], ["url", "reviewedAt", "pageSha256"], "source identity", SCOPE);
  assertKeys(catalog, ["reviewedAt", "templates"], ["reviewedAt", "templates"], "catalog", SCOPE);
  if (index.source?.url !== HOME || !/^[a-f0-9]{64}$/.test(index.source?.pageSha256 || "")) fail(SCOPE, "source index needs the reviewed homepage identity");
  date(index.source.reviewedAt, "source review");
  const caseIds = uniqueIds(index.entries, "source entries");
  for (const entry of index.entries) {
    const keys = ["id", "title", "author", "publishedAt", "types", "promptShared", "url"];
    assertKeys(entry, keys, keys, "source entry", SCOPE);
    assertString(entry.title, "case title", SCOPE);
    assertString(entry.author, "case author", SCOPE);
    date(entry.publishedAt, "case publication");
    assertStringArray(entry.types, "case types", SCOPE, { unique: true, min: 1 });
    entry.types.forEach((type) => assertEnum(type, ["prompt", "skill"], "case type", SCOPE));
    if (typeof entry.promptShared !== "boolean") fail(SCOPE, "case prompt availability must be explicit");
    if (entry.url !== HOME + entry.id) fail(SCOPE, `case URL does not match ${entry.id}`);
  }
  date(catalog.reviewedAt, "recipe review");
  uniqueIds(catalog.templates, "templates");
  for (const template of catalog.templates) {
    const keys = ["id", "title", "category", "tags", "sources", "reviewedAt", "summary", "inputs", "sequence", "invariants", "gotchas", "relatedGuides", "status", "observation", "limitations", "adaptation"];
    assertKeys(template, keys, keys, "template", SCOPE);
    for (const field of ["title", "summary"]) assertString(template[field], `template ${field}`, SCOPE);
    assertEnum(template.category, CATEGORIES, "template category", SCOPE);
    assertEnum(template.status, ["recipe"], "template status", SCOPE);
    date(template.reviewedAt, "template review");
    for (const field of ["tags", "sources", "sequence", "invariants", "gotchas", "relatedGuides", "limitations"]) assertStringArray(template[field], `template ${field}`, SCOPE, { unique: true, min: 1 });
    if (template.sources.some((id) => !caseIds.has(id))) fail(SCOPE, `template ${template.id} names an unknown source case`);
    if (!Array.isArray(template.inputs) || !template.inputs.length) fail(SCOPE, `template ${template.id} needs replaceable inputs`);
    const names = new Set();
    for (const input of template.inputs) {
      assertKeys(input, ["name", "description", "required"], ["name", "description", "required"], "input", SCOPE);
      assertString(input?.name, "input name", SCOPE);
      assertString(input.description, "input description", SCOPE);
      if (typeof input.required !== "boolean" || names.has(input.name)) fail(SCOPE, "inputs need unique names and explicit required flags");
      names.add(input.name);
    }
    const observations = ["basis", "videoWatched", "audioHeard", "rendered"];
    assertKeys(template.observation, observations, observations, "observation", SCOPE);
    if (template.observation.basis !== "page-prompt" || ["videoWatched", "audioHeard", "rendered"].some((key) => template.observation[key] !== false)) fail(SCOPE, "recipe inclusion cannot claim motion observation or execution");
    assertKeys(template.adaptation, ["basis", "note"], ["basis", "note"], "adaptation", SCOPE);
    assertEnum(template.adaptation.basis, ["authored"], "adaptation basis", SCOPE);
    assertString(template.adaptation.note, "adaptation note", SCOPE);
    template.relatedGuides.forEach((file) => {
      const guide = resolveInside(packageRoot, file, "related guide", { scope: SCOPE, mustExist: true });
      if (!fs.statSync(guide).isFile()) fail(SCOPE, "related guide must be a regular file");
    });
  }
  return { index, catalog };
}

function templates(options = {}, packageRoot = PACKAGE_ROOT) {
  if (options.template && (options.query || options.all)) fail(SCOPE, "--template cannot be combined with --query or --all");
  const { index, catalog } = loadLibrary(packageRoot);
  const sourceCases = (recipe) => recipe.sources.map((id) => index.entries.find((entry) => entry.id === id));
  if (options.template) {
    const template = catalog.templates.find((item) => item.id === options.template);
    if (!template) fail(SCOPE, `unknown template ${options.template}`, { code: "TEMPLATE_UNKNOWN" });
    return { status: "recipe", template: { ...template, sourceCases: sourceCases(template) } };
  }
  const terms = String(options.query || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (values) => terms.every((term) => values.join(" ").toLowerCase().includes(term));
  return {
    status: "library", reviewedAt: catalog.reviewedAt,
    totalTemplates: catalog.templates.length, totalCases: index.entries.length,
    templates: catalog.templates.filter((item) => matches([item.id, item.title, item.category, item.summary, ...item.tags, ...sourceCases(item).map((entry) => entry.author)])).map((item) => ({ ...item, sourceCases: sourceCases(item) })),
    ...(options.all ? { indexedCases: index.entries.filter((entry) => matches([entry.id, entry.title, entry.author, ...entry.types])).map((entry) => ({ ...entry, status: "indexed", curatedBy: catalog.templates.filter((item) => item.sources.includes(entry.id)).map((item) => item.id) })) } : {}),
    scope: "Maintained recipe library; no project generation, media download, rendering or acceptance assessment.",
  };
}

module.exports = { loadLibrary, templates };
