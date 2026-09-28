"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { resolveFrontendStack, validateRegistry } = require("../skill/scripts/frontend-stack-core.cjs");
const { routeJob } = require("../skill/scripts/job-route-core.cjs");

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

test("English and Chinese product showcases select the existing HyperFrames route", () => {
  for (const brief of ["Create an HTML product showcase video", "制作 HTML 产品发布宣传视频"]) {
    const result = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "agnostic", brief }, registry, skills);
    assert.ok(result.toolRoutes.some(({ id }) => id === "heygen-com/hyperframes"));
  }
});

test("product showcase animation keeps Stage 0 and HyperFrames aligned", () => {
  for (const query of [
    "Create a product showcase animation", "产品宣传展示动画", "产品宣传动画",
    "给我们的画布做一个宣传动画", "HTML 宣传动画，宣传我们的画布项目",
    "做一个推广动画", "Make a promotional animation for our canvas",
  ]) {
    const stage0 = routeJob({ query });
    assert.equal(stage0.job, "motion-graphics", query);
    assert.equal(stage0.deliverableForm, "product-launch-video", query);
    const frontend = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "agnostic", brief: query }, registry, skills);
    assert.ok(frontend.toolRoutes.some(({ id }) => id === "heygen-com/hyperframes"), query);
  }
});

test("product film direction is reachable from authoring entry points and included in the package", () => {
  for (const file of ["../SKILL.md", "stages.md", "hyperframes.md"]) {
    assert.ok(fs.readFileSync(path.join(references, file), "utf8").includes("references/product-film-direction.md"), file);
  }
  const resources = JSON.parse(fs.readFileSync(path.join(references, "package-resources.json"), "utf8"));
  assert.ok(resources.required.includes("references/product-film-direction.md"));
  assert.ok(fs.existsSync(path.join(references, "product-film-direction.md")));
});

test("ordinary UI and marketing pages retain their delivery intent", () => {
  for (const query of ["给画布节点增加连接动画", "制作产品宣传页面", "Build a marketing page with hover animation"]) {
    assert.notEqual(routeJob({ query }).deliverableForm, "product-launch-video", query);
    const result = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "agnostic", brief: query }, registry, skills);
    assert.equal(result.toolRoutes.some(({ id }) => id === "heygen-com/hyperframes"), false, query);
  }
});
