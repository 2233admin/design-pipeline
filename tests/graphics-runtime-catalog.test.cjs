"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateRegistry } = require("../skill/scripts/adapter-core.cjs");

const references = path.resolve(__dirname, "../skill/references");
const catalog = JSON.parse(fs.readFileSync(path.join(references, "graphics-runtime-catalog.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(references, "adapter-registry.json"), "utf8"));

test("graphics catalog covers stable frontend families and routes only by registry id", () => {
  assert.equal(catalog.schema, "design-pipeline.graphics-runtime-catalog.v2");
  assert.equal(catalog.adapters, undefined);
  const familyIds = catalog.families.map((family) => family.id);
  assert.equal(new Set(familyIds).size, familyIds.length);
  for (const required of ["semantic-ui", "vector-data", "canvas-editor-2d", "scene-renderer-2d", "game-engine-2d", "scene-renderer-3d", "game-engine-3d", "geospatial-3d", "gpu-shader", "narrative-game-ui"]) assert.ok(familyIds.includes(required), `missing graphics family ${required}`);
  assert.equal(validateRegistry(registry, catalog).status, "valid");
});

test("PixiJS and Phaser routes resolve to authoritative support and provenance facts", () => {
  const pixiRoute = catalog.routes.find((route) => route.family === "scene-renderer-2d");
  const phaserRoute = catalog.routes.find((route) => route.family === "game-engine-2d");
  assert.ok(pixiRoute.adapterIds.includes("pixijs-v8"));
  assert.ok(phaserRoute.adapterIds.includes("phaser-v4"));
  const pixi = registry.adapters.find((adapter) => adapter.id === "pixijs-v8");
  const phaser = registry.adapters.find((adapter) => adapter.id === "phaser-v4");
  assert.equal(pixi.support, "companion");
  assert.equal(pixi.license.state, "verified");
  assert.equal(phaser.support, "native");
  assert.equal(phaser.provenance.reviewedVersion, "4.2.1");
});

test("unverified community routes cannot claim native/companion support or install commands", () => {
  for (const adapter of registry.adapters.filter((item) => item.license.state === "unverified")) {
    assert.ok(!["native", "companion"].includes(adapter.support));
    assert.equal(adapter.install, undefined);
    assert.equal(adapter.benchmarkAdmission, "blocked");
  }
});
