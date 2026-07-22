"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateRegistry } = require("../skill/scripts/adapter-core.cjs");

const root = path.resolve(__dirname, "../skill/references");
const registry = JSON.parse(fs.readFileSync(path.join(root, "adapter-registry.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "graphics-runtime-catalog.json"), "utf8"));

test("adapter registry is authoritative for support, provenance, license, security, and degradation", () => {
  const result = validateRegistry(registry, catalog);
  assert.equal(result.adapters, 23);
  assert.equal(result.support.companion, 1);
  assert.ok(registry.adapters.every((adapter) => adapter.provenance.url && adapter.security.execution && adapter.degradation));
});

test("catalog route drift and duplicated ids fail", () => {
  const drift = structuredClone(catalog);
  drift.routes.find((route) => route.adapterIds.includes("pixijs-v8")).family = "game-engine-2d";
  assert.throws(() => validateRegistry(registry, drift), /contradicts registry/);
  assert.throws(() => validateRegistry({ ...registry, adapters: [...registry.adapters, registry.adapters[0]] }), /duplicate adapter/);
});

test("unverified entries cannot gain install or companion claims", () => {
  const unsafe = structuredClone(registry);
  const target = unsafe.adapters.find((adapter) => adapter.license.state === "unverified");
  target.support = "companion";
  target.install = "https://example.invalid/install";
  assert.throws(() => validateRegistry(unsafe), /unverified license|install/);
});
