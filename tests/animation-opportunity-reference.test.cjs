"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("documents the governed animation opportunity and review route", () => {
  const pipeline = read("skill/SKILL.md");
  const routing = read("skill/references/capability-routing.md");
  const reference = read("skill/references/animation-opportunity-and-review.md");

  assert.match(pipeline, /animation-opportunity-and-review\.md/);
  assert.match(routing, /Animation opportunity and review/);
  assert.match(routing, /animation-opportunity-and-review\.md/);
  assert.match(reference, /improve-animations/);
  assert.match(reference, /find-animation-opportunities/);
  assert.match(reference, /animation-vocabulary/);
  assert.match(reference, /review-animations/);
  assert.match(reference, /frequency/i);
  assert.match(reference, /purpose/i);
  assert.match(reference, /reduced-motion/);
  assert.match(reference, /interrupt/i);
  assert.match(reference, /cleanup/i);
  assert.match(reference, /transform.*opacity|opacity.*transform/is);
  assert.match(reference, /evidence/i);
});
