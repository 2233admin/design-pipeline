"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("packages and routes the direct plain-language contract with a scope guard", () => {
  const resources = JSON.parse(read("skill/references/package-resources.json"));
  assert.ok(resources.required.includes("references/plain-language.md"));

  const pipeline = read("skill/SKILL.md");
  const contract = read("skill/references/plain-language.md");
  const qa = read("skill/references/qa-checklist.md");
  assert.match(pipeline, /references\/plain-language\.md/);
  assert.match(contract, /Start with the consequence/);
  assert.match(contract, /three unrecognized fields do not become an invalid file/);
  assert.match(contract, /Two-Pass Review/);
  assert.match(qa, /Plain-Language Checks/);
});
