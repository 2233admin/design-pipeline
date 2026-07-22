"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateStyleSignals } = require("../skill/scripts/adapter-core.cjs");

const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/visual-style-signals.json"), "utf8"));

test("style signals separate defining/supporting/variable/avoid facets and link DESIGN/MOTION decisions", () => {
  assert.equal(validateStyleSignals(catalog).signals, 3);
  for (const signal of catalog.signals) {
    assert.ok(signal.facets.defining.length);
    assert.ok(signal.facets.avoid.length);
    assert.ok(signal.decisionLinks.design.length);
    assert.ok(signal.decisionLinks.motion.length);
  }
});

test("empty facets, missing motion links, and duplicate ids fail", () => {
  const empty = structuredClone(catalog);
  empty.signals[0].facets.avoid = [];
  assert.throws(() => validateStyleSignals(empty), /at least 1/);
  const noMotion = structuredClone(catalog);
  noMotion.signals[0].decisionLinks.motion = [];
  assert.throws(() => validateStyleSignals(noMotion), /at least 1/);
  assert.throws(() => validateStyleSignals({ ...catalog, signals: [...catalog.signals, catalog.signals[0]] }), /duplicate signal/);
});
