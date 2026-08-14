"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { resolveFrontendStack, validateRegistry } = require("../skill/scripts/frontend-stack-core.cjs");

const root = path.resolve(__dirname, "..");
const references = path.join(root, "skill", "references");
const registry = JSON.parse(fs.readFileSync(path.join(references, "frontend-stack-registry.json"), "utf8"));
const skills = JSON.parse(fs.readFileSync(path.join(references, "mengto-skills-catalog.json"), "utf8"));

test("HyperFrames is a video route, not an always-on design workflow", () => {
  validateRegistry(registry);
  const route = registry.tools.find((tool) => tool.id === "heygen-com/hyperframes");
  assert.deepEqual(route.capabilities, ["video-production", "html-video", "hyperframes"]);
  assert.equal(route.revision, "0e4da52c8222b8d18a1211b34f2fb3bd0f7e79ee");
  assert.equal(route.license, "Apache-2.0");
  assert.equal(route.fallback, "Use references/hyperframes.md with the project's existing motion and evidence gates");

  const video = resolveFrontendStack({
    schema: "design-pipeline.frontend-stack-request.v1",
    framework: "react",
    brief: "Create a short animated explainer video with captions",
    requested: {},
  }, registry, skills);
  assert.ok(video.toolRoutes.some(({ id }) => id === "heygen-com/hyperframes"));

  const ordinary = resolveFrontendStack({
    schema: "design-pipeline.frontend-stack-request.v1",
    framework: "react",
    brief: "Build a dashboard with a subtle hover animation",
    requested: {},
  }, registry, skills);
  assert.equal(ordinary.toolRoutes.some(({ id }) => id === "heygen-com/hyperframes"), false);
});

test("bundled HyperFrames reference preserves the official authoring and verification contract", () => {
  const reference = fs.readFileSync(path.join(references, "hyperframes.md"), "utf8");
  for (const marker of [
    "HTML is the source of truth",
    "exactly one synchronous `gsap.timeline({ paused: true })`",
    "No `Date.now`",
    "npx hyperframes check",
    "render only after approval",
  ]) assert.match(reference, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
