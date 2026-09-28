"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("documents the governed animation opportunity and motion-first capability route", () => {
  const pipeline = read("skill/SKILL.md");
  const routing = read("skill/references/capability-routing.md");
  const reference = read("skill/references/animation-opportunity-and-review.md");
  const capability = read("skill/references/motion-first-capability.md");
  const registry = JSON.parse(read("skill/references/motion-primitives.json"));
  const packageResources = JSON.parse(read("skill/references/package-resources.json"));

  assert.match(pipeline, /animation-opportunity-and-review\.md/);
  assert.match(pipeline, /motion-first-capability\.md/);
  assert.ok(packageResources.required.includes("references/motion-first-capability.md"));
  assert.match(routing, /Animation opportunity and review/);
  assert.match(routing, /motion-first-capability\.md/);
  assert.match(routing, /response\.spring-settle/);
  assert.match(routing, /continuity\.shared-anchor/);
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
  assert.match(capability, /reference-only/);
  assert.match(capability, /codeCopied: false/);
  assert.match(capability, /authored[- ]time/i);
  assert.match(capability, /requestAnimationFrame/);

  const added = registry.primitives.filter((primitive) => ["response.spring-settle", "continuity.shared-anchor"].includes(primitive.id));
  assert.deepEqual(added.map((primitive) => primitive.id), ["response.spring-settle", "continuity.shared-anchor"]);
  for (const primitive of added) {
    assert.equal(primitive.provenance.source, "https://github.com/feitangyuan/motion-web");
    assert.equal(primitive.provenance.codeCopied, false);
    assert.ok(primitive.reducedMotion);
  }
});
