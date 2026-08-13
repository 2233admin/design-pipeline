"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { routeComponents } = require("../skill/scripts/component-route-core.cjs");
const { normalizeDesignSystemSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { resolveFrontendStack, validateRegistry } = require("../skill/scripts/frontend-stack-core.cjs");

const references = path.resolve(__dirname, "../skill/references");
const snapshot = JSON.parse(fs.readFileSync(path.join(references, "component-source-catalog.json"), "utf8"));
const catalog = normalizeDesignSystemSnapshot(snapshot);
const registry = JSON.parse(fs.readFileSync(path.join(references, "frontend-stack-registry.json"), "utf8"));
const skills = JSON.parse(fs.readFileSync(path.join(references, "mengto-skills-catalog.json"), "utf8"));

test("SmoothUI and React Bits are discoverable as reference-adaptation component routes", () => {
  const smooth = routeComponents({ catalog, brief: "SmoothUI animated React components", platform: "web" });
  const decrypted = routeComponents({ catalog, brief: "React Bits DecryptedText text animation", platform: "web" });
  assert.equal(smooth.status, "review");
  assert.equal(decrypted.status, "review");
  assert.ok(smooth.routes.some(({ selected }) => selected?.id === "frontend-component-sources:component:smoothui/animated-components"));
  assert.ok(decrypted.routes.some(({ selected }) => selected?.id === "frontend-component-sources:component:react-bits/decrypted-text"));

  const entry = catalog.entries.find(({ localId }) => localId === "react-bits/decrypted-text");
  assert.equal(entry.provenance.license, "MIT + Commons Clause");
  assert.ok(entry.alignment.accessibility.includes("screen-reader text"));
  assert.ok(entry.alignment.cleanup.includes("clear interval"));
});

test("explicit source briefs expose governed tool routes without changing the default stack", () => {
  validateRegistry(registry);
  for (const [brief, id] of [["Use SmoothUI animated components", "SmoothUI/components"], ["Use React Bits DecryptedText", "DavidHDev/react-bits"]]) {
    const result = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief, requested: {} }, registry, skills);
    assert.equal(result.status, "ready");
    assert.ok(result.toolRoutes.some((route) => route.id === id && route.status === "review"));
  }
  const ordinary = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "Build a dashboard", requested: {} }, registry, skills);
  assert.equal(ordinary.toolRoutes.some(({ id }) => id === "SmoothUI/components" || id === "DavidHDev/react-bits"), false);
});
