"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { auditPatterns, searchPatterns, validateCatalog } = require("../skill/scripts/interoperability-core.cjs");

const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/ui-pattern-catalog.json"), "utf8"));

test("clean-room pattern catalog validates relationships and stable support coverage", () => {
  validateCatalog(catalog);
  const audit = auditPatterns(catalog);
  assert.equal(audit.total, 7);
  assert.ok(audit.coverage.native.includes("button"));
  assert.ok(audit.coverage["generic-workflow"].includes("dialog"));
  assert.deepEqual(audit.coverage.companion, []);
});

test("search uses aliases, fuzzy matching, category/platform filters, and deterministic ordering", () => {
  assert.equal(searchPatterns(catalog, { query: "modal" })[0].id, "dialog");
  assert.equal(searchPatterns(catalog, { query: "buton" })[0].id, "button");
  const game = searchPatterns(catalog, { platform: "game-ui", category: "narrative" });
  assert.deepEqual(game.map((item) => item.id), ["dialogue-box"]);
  assert.deepEqual(searchPatterns(catalog, {}).map((item) => item.id), searchPatterns(catalog, {}).map((item) => item.id));
});

test("duplicate ids and dangling relations fail", () => {
  assert.throws(() => validateCatalog({ ...catalog, patterns: [...catalog.patterns, catalog.patterns[0]] }), /duplicate/);
  const dangling = structuredClone(catalog);
  dangling.patterns[0].relations = ["missing-pattern"];
  assert.throws(() => validateCatalog(dangling), /unknown relation/);
});
