"use strict";

// HyperFrames catalog bridge. The catalog already ships hundreds of tested blocks (3D camera
// moves, WebGL carousels, shader transitions, device mockups, typography); reusing them beats
// writing new templates. This module caches `hyperframes catalog --json`, searches it for a
// beat's action, and lets storyboards name blocks that the gates can verify exist.

const fs = require("node:fs");
const path = require("node:path");
const { fail } = require("./contract-utils.cjs");
const { runNpx } = require("./film-capture-core.cjs");

const SCOPE = "film blocks";
const CACHE = path.join(".design-pipeline", "hyperframes-catalog.json");

function fetchCatalog(projectDir, options = {}) {
  const cli = options.cliVersion ? `hyperframes@${options.cliVersion}` : "hyperframes";
  const result = runNpx(["--yes", cli, "catalog", "--json"], { cwd: projectDir });
  const start = String(result.stdout || "").indexOf("[");
  let items;
  try { items = JSON.parse(String(result.stdout).slice(start)); } catch { items = null; }
  if (!Array.isArray(items)) fail(SCOPE, "could not read `npx hyperframes catalog --json`. Fix: check network access and that HyperFrames runs in this project (npx hyperframes doctor)", { code: "TOOL_FAILED" });
  return items;
}

function loadCatalog(projectDir, options = {}) {
  const file = path.join(projectDir, CACHE);
  if (!options.refresh && fs.existsSync(file)) return { items: JSON.parse(fs.readFileSync(file, "utf8")).items, cached: true, file };
  if (options.offline) return null;
  const items = (options.fetch || fetchCatalog)(projectDir, options);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ schema: "design-pipeline.hyperframes-catalog-cache.v1", items }, null, 2)}\n`);
  return { items, cached: false, file };
}

const tokenize = (text) => String(text || "").toLowerCase().split(/[^a-z0-9一-鿿]+/).filter((token) => token.length > 1);

// Plain lexical ranking: name and tag hits outweigh description hits. Deterministic, offline.
function searchBlocks(items, query = "", options = {}) {
  const terms = tokenize(query);
  const tag = options.tag ? String(options.tag).toLowerCase() : null;
  const scored = items
    .filter((item) => !options.type || item.type === options.type)
    .filter((item) => !tag || (item.tags || []).map((t) => t.toLowerCase()).includes(tag))
    .map((item) => {
      const name = tokenize(`${item.name} ${item.title}`);
      const tags = (item.tags || []).flatMap(tokenize);
      const text = tokenize(item.description);
      let score = 0;
      for (const term of terms) {
        if (name.includes(term)) score += 3;
        if (tags.includes(term)) score += 2;
        if (text.includes(term)) score += 1;
      }
      return { item, score };
    })
    .filter((entry) => !terms.length || entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, options.limit || 10).map(({ item, score }) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    tags: item.tags || [],
    durationSec: item.duration ?? null,
    score,
    description: String(item.description || "").slice(0, 240),
    install: `npx hyperframes add ${item.name}`,
  }));
}

function blockNames(projectDir) {
  const file = path.join(projectDir, CACHE);
  if (!fs.existsSync(file)) return null;
  return new Set(JSON.parse(fs.readFileSync(file, "utf8")).items.map((item) => item.name));
}

module.exports = { CACHE, blockNames, loadCatalog, searchBlocks };
