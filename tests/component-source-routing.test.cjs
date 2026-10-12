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

test("explicit source briefs promote governed review routes and block execution", () => {
  validateRegistry(registry);
  for (const [brief, id] of [["Use SmoothUI animated components", "SmoothUI/components"], ["Use React Bits DecryptedText", "DavidHDev/react-bits"]]) {
    const result = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief, requested: {} }, registry, skills);
    assert.equal(result.status, "blocked");
    assert.equal(result.primaryRoute.id, id);
    assert.ok(result.toolRoutes.some((route) => route.id === id && route.status === "review"));
  }
  const ordinary = resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "Build a dashboard", requested: {} }, registry, skills);
  assert.equal(ordinary.toolRoutes.some(({ id }) => id === "SmoothUI/components" || id === "DavidHDev/react-bits"), false);
});

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const { spawnSync } = require("node:child_process");
function runDiscovery(action, query, extra = []) {
  const run = spawnSync(process.execPath, [cli, "design-system", action, "--root", path.dirname(references), "--query", query, "--json", ...extra], { cwd: require("node:os").tmpdir(), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(run.status, 0, action + " " + query + ": " + run.stdout + "\n" + run.stderr);
  return JSON.parse(run.stdout);
}

test("public web CLI discovers verified npm animation libraries for spring, scroll and timeline", () => {
  for (const query of ["spring animation", "scroll reveal", "timeline"]) {
    const routed = runDiscovery("route", query, ["--platform", "web"]);
    const candidates = routed.routes.flatMap(({ selected, alternatives }) => [selected, ...alternatives]).filter(Boolean);
    for (const packageName of ["motion", "animejs"]) {
      const candidate = candidates.find((entry) => entry.package === packageName);
      assert.ok(candidate, query + " must route " + packageName);
      assert.equal(candidate.status, "ready");
      assert.equal(candidate.licenseEvidence.state, "verified");
      assert.equal(candidate.licenseEvidence.id, "MIT");
      assert.ok(candidate.install.includes(packageName));
    }
    const searched = runDiscovery("search", query, ["--platform", "web"]);
    assert.equal(searched.namespace, "frontend-component-sources");
    for (const packageName of ["motion", "animejs"]) assert.ok(searched.results.some((entry) => entry.routing?.package === packageName), query + " must search " + packageName);
  }
});

test("public web search filters method/template references in default and explicit index modes", () => {
  for (const extra of [[], ["--snapshot", path.join(references, "component-source-catalog.json")]]) {
    for (const query of ["film", "GEPA", "Prompt Motion", "HyperFrames"]) {
      const searched = runDiscovery("search", query, ["--platform", "web", ...extra]);
      assert.equal(searched.namespace, "frontend-component-sources");
      for (const entry of searched.results) {
        assert.equal(entry.kind, "component");
        assert.equal(entry.recordType, "component");
        assert.notEqual(entry.webRanking, false);
        assert.ok(!["rieranthony/product-film-skill", "gepa-ai/gepa", "prompt-motion", "heygen-com/hyperframes"].includes(entry.sourceId));
      }
    }
  }
});

test("public search without platform preserves the Astryx default", () => {
  assert.equal(runDiscovery("search", "button").namespace, "astryx");
});

test("web route candidates exclude method/template sources even when named explicitly", () => {
  for (const brief of ["film transition", "GEPA workflow", "Prompt Motion animation", "HyperFrames timeline"]) {
    const result = routeComponents({ catalog, brief, platform: "web" });
    for (const candidate of result.routes.flatMap(({ selected, alternatives }) => [selected, ...alternatives]).filter(Boolean)) assert.ok(!["rieranthony/product-film-skill", "gepa-ai/gepa", "prompt-motion", "heygen-com/hyperframes"].includes(candidate.sourceId));
  }
});

test("owner decisions preserve dated no-copy and no-entitlement boundaries", () => {
  const paidScopes = new Set(["magicuidesign/magicui", "jakubantalik/transitions.dev", "starc007/ui-components", "shadcnio/react-shadcn-components"]);
  for (const entry of catalog.entries.filter((entry) => ["unverified", "commercial"].includes(entry.license?.state) || paidScopes.has(entry.sourceId))) {
    assert.ok(entry.license.evidence.some((item) => item.includes("2026-10-12") && item.includes("study and reimplement") && item.includes("never copy")), entry.id);
    assert.ok(entry.licenseScope.includes("no entitlement"), entry.id);
  }
});

test("GSAP is usable under Standard No Charge conditions rather than MIT", () => {
  const source = catalog.entries.find((entry) => entry.localId === "source/greensock/gsap");
  assert.equal(source.license.state, "verified");
  assert.equal(source.license.id, "LicenseRef-GSAP-Standard-No-Charge");
  assert.ok(source.licenseScope.includes("2026-10-12"));
  assert.ok(source.licenseScope.includes("no-code"));
  assert.ok(source.licenseScope.includes("not MIT"));
  const routed = runDiscovery("route", "timeline", ["--platform", "web"]);
  const candidates = routed.routes.flatMap(({ selected, alternatives }) => [selected, ...alternatives]).filter(Boolean);
  const gsap = candidates.find((entry) => entry.package === "gsap");
  assert.ok(gsap);
  assert.equal(gsap.status, "ready");
  assert.equal(gsap.licenseEvidence.id, "LicenseRef-GSAP-Standard-No-Charge");
});
