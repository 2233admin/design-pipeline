"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("routes the subject-first Victor design guidance", () => {
  const pipeline = read("skill/SKILL.md");
  const stages = read("skill/references/stages.md");
  const antiSlop = read("skill/references/anti-slop-review.md");
  const copy = read("skill/references/plain-language.md");
  const feedback = read("skill/references/feedback-loop.md");
  const routedGuidance = `${pipeline}\n${stages}`;

  assert.match(routedGuidance, /Form sanity backstop/);
  assert.match(routedGuidance, /reader action/);
  assert.match(routedGuidance, /single.?canvas/);
  assert.match(routedGuidance, /subject, audience task, and viewing context/);
  assert.match(antiSlop, /Two-sided craft check/);
  assert.match(antiSlop, /Cause\/effect test/);
  assert.match(copy, /Source-shaped copy/);
  assert.match(copy, /do not invent metadata/);
  assert.match(feedback, /observed behavior -> scope and impact -> evidence/);
});
