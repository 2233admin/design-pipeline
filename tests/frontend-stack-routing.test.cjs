"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { resolveFrontendStack, validateRegistry } = require("../skill/scripts/frontend-stack-core.cjs");

const references = path.resolve(__dirname, "../skill/references");
const registry = JSON.parse(fs.readFileSync(path.join(references, "frontend-stack-registry.json"), "utf8"));
const skills = JSON.parse(fs.readFileSync(path.join(references, "mengto-skills-catalog.json"), "utf8"));

test("registry internalizes every requested styling, UI, preset, and skill source", () => {
  validateRegistry(registry);
  assert.equal(registry.styling.length, 5);
  assert.equal(registry.uiLibraries.length, 15);
  assert.deepEqual(Object.keys(registry.shadcn.defaults), registry.shadcn.styles);
  assert.equal(skills.count, 127);
  assert.equal(Object.values(skills.categories).flat().length, 127);
  for (const id of ["hi5jeff/deepclonewebsite", "wevm/frog", "MengTo/skills", "koboyo/icons"]) assert.ok(registry.tools.some((tool) => tool.id === id));
});

test("Koboyo is an explicit reviewed icon route, not a shadcn preset or default tool", () => {
  const result = resolveFrontendStack({
    schema: "design-pipeline.frontend-stack-request.v1",
    framework: "react",
    brief: "Use Koboyo hand-drawn icons for a playful empty state",
    requested: { styling: "tailwindcss", uiLibrary: "shadcn-ui", shadcnPreset: "nova" },
  }, registry, skills);
  const route = result.toolRoutes.find(({ id }) => id === "koboyo/icons");
  assert.equal(result.status, "ready");
  assert.ok(route);
  assert.equal(route.status, "review");
  assert.equal(route.endpoint, "https://api.koboyo.com/v1-mcp");
  assert.equal(route.licenseUrl, "https://koboyo.com/icons/license");
  assert.ok(route.readOnlyTools.includes("search_icons"));
  assert.ok(route.readOnlyTools.includes("get_icon_svg"));
  assert.ok(route.requirements.some((item) => item.includes("never persist an API key")));
  assert.ok(route.constraints.some((item) => item.includes("Do not redistribute")));
  assert.equal(registry.shadcn.iconLibraries.includes("koboyo"), false);

  const ordinary = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "Build a dashboard", requested: {} }, registry, skills);
  assert.equal(ordinary.toolRoutes.some(({ id }) => id === "koboyo/icons"), false);
});

test("a clone brief routes built-ins, all three upstreams, and complete shadcn preset", () => {
  const result = resolveFrontendStack({
    schema: "design-pipeline.frontend-stack-request.v1",
    framework: "react",
    brief: "1:1 复刻网站并提取交互，记录 friction",
    requested: { styling: "tailwind", uiLibrary: "shadcn/ui", shadcnPreset: { name: "sera", base: "aria", iconLibrary: "tabler" } },
    capabilities: ["github-issue-sync", "interaction-extraction", "verification"],
  }, registry, skills);
  assert.equal(result.status, "ready");
  assert.equal(result.selected.styling.id, "tailwindcss");
  assert.equal(result.selected.uiLibrary.id, "shadcn-ui");
  assert.equal(result.selected.shadcnPreset.base, "aria");
  assert.equal(result.selected.shadcnPreset.style, "sera");
  assert.equal(result.selected.shadcnPreset.fontHeading, "playfair-display");
  for (const id of ["design-pipeline/website-cloning", "hi5jeff/deepclonewebsite", "wevm/frog", "MengTo/skills"]) assert.ok(result.toolRoutes.some((tool) => tool.id === id));
  for (const id of ["html-to-interaction-prompts", "stitched-full-page-capture", "iterate-until-verified"]) assert.ok(result.recommendedSkills.includes(id));
});

test("framework and required styling mismatches block instead of silently substituting", () => {
  const result = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "vue", brief: "Vue UI", requested: { styling: "scss", uiLibrary: "shadcn-ui" } }, registry, skills);
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.some((item) => item.includes("does not support vue")));
  assert.ok(result.blockers.some((item) => item.includes("requires tailwindcss")));
  assert.throws(() => resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "React UI", requested: { uiLibrary: "mui", shadcnPreset: "nova" } }, registry, skills), /requires shadcn-ui/);
});

test("routing refuses an implicit request contract", () => {
  assert.throws(() => resolveFrontendStack({ framework: "react", brief: "React UI" }, registry, skills), /unsupported request/);
  assert.throws(() => resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react" }, registry, skills), /brief is required/);
});
