"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { routeComponents } = require("../skill/scripts/component-route-core.cjs");

function catalog() {
  return normalizeSnapshot(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/component-source-catalog.json"), "utf8")));
}

test("routes web app UI to a ready local source before licensed references", () => {
  const result = routeComponents({ catalog: catalog(), brief: "SaaS dashboard app UI", platform: "web" });
  assert.equal(result.status, "ready");
  assert.equal(result.routes.find((route) => route.capability === "app-ui").selected.id, "frontend-component-sources:component:smoothui/components");
  assert.equal(result.routes.find((route) => route.capability === "app-ui").selected.requiresLicense, undefined);
});

test("routes Expo numeric content through the native package and web numeric content through the platform fallback", () => {
  const expo = routeComponents({ catalog: catalog(), brief: "animated numeric stat", platform: "expo" });
  assert.equal(expo.status, "ready");
  assert.ok(expo.routes.filter((route) => route.selected).every((route) => route.selected.id === "frontend-component-sources:component:expo-content-transition/numeric-text"));

  const web = routeComponents({ catalog: catalog(), brief: "animated numeric stat", platform: "web" });
  assert.equal(web.status, "ready");
  assert.ok(web.routes.filter((route) => route.selected).every((route) => route.selected.id === "frontend-component-sources:component:native/dom-numeric-transition"));
});

test("routes the proven public React Bits depth carousel as ready and blocks it on Expo", () => {
  const web = routeComponents({ catalog: catalog(), brief: "depth carousel", platform: "web" });
  assert.equal(web.status, "ready");
  const selected = web.routes.find((route) => route.capability === "depth-carousel").selected;
  assert.equal(selected.id, "frontend-component-sources:component:reactbits/depth-carousel");
  assert.equal(selected.sourceId, "davidhdev/react-bits");
  assert.equal(selected.licenseEvidence.state, "verified");
  assert.equal(selected.licenseEvidence.id, "LicenseRef-MIT-Commons-Clause");
  assert.match(selected.install, /@react-bits\/DepthCarousel-TS-TW/);
  assert.match(selected.sourceCode, /496968c4117e21278f13917201b7d615bc5e7450/);
  assert.match(selected.licenseNotice, /redistribut/i);
  assert.equal(catalog().entries.some((entry) => entry.localId === "reactbits-pro/depth-carousel"), false);

  const expo = routeComponents({ catalog: catalog(), brief: "depth carousel", platform: "expo" });
  assert.equal(expo.status, "blocked");
  assert.ok(expo.unavailable.includes("depth-carousel"));
});

test("routes free React Bits Dither requests to a ready web shader background source", () => {
  const result = routeComponents({ catalog: catalog(), brief: "Dither shader background", platform: "web" });
  assert.equal(result.status, "ready");
  const route = result.routes.find((item) => item.capability === "dither-background");
  assert.equal(route.selected.id, "frontend-component-sources:component:reactbits/dither");
  assert.match(route.selected.sourceCode, /github\.com\/DavidHDev\/react-bits/);
  assert.equal(route.selected.license, "MIT + Commons Clause");
  assert.match(route.selected.licenseNotice, /copyright|license|redistribute/i);
});

test("routes SmoothUI requests to its local 130-component inventory", () => {
  const result = routeComponents({ catalog: catalog(), brief: "SmoothUI animated tabs and magnetic button", platform: "web" });
  assert.equal(result.status, "ready");
  const tabs = result.routes.find((route) => route.capability === "tabs");
  const button = result.routes.find((route) => route.capability === "button");
  assert.equal(tabs.selected.id, "frontend-component-sources:component:smoothui/components");
  assert.equal(tabs.selected.componentCount, 130);
  assert.ok(tabs.selected.recommendedComponents.includes("animated-tabs"));
  assert.match(tabs.selected.install, /smoothui\.dev\/r\/<component>\.json/);
  assert.equal(tabs.selected.recommendedComponentDetails[0].name, "animated-tabs");
  assert.match(tabs.selected.recommendedComponentDetails[0].docUrl, /smoothui\.dev\/docs\/components\/animated-tabs/);
  assert.match(tabs.selected.recommendedComponentDetails[0].install, /shadcn@latest add/);
  assert.equal(button.selected.license, "MIT");
  assert.ok(button.selected.recommendedComponents.includes("magnetic-button"));
});

test("route output is deterministic and rejects unsupported platforms", () => {
  const first = routeComponents({ catalog: catalog(), brief: "dashboard app UI", platform: "web" });
  const second = routeComponents({ catalog: catalog(), brief: "dashboard app UI", platform: "web" });
  assert.deepEqual(first, second);
  assert.throws(() => routeComponents({ catalog: catalog(), brief: "dashboard", platform: "ios" }), /not supported/);
});

test("includes the user-curated component libraries as searchable web references", () => {
  const expected = [
    ["beautiful-ui/reference-library", "https://www.beautifului.dev/"],
    ["beui/reference-library", "https://beui.dev/"],
    ["rareui/reference-library", "https://rareui.com/"],
    ["transitions/reference-library", "https://transitions.dev/"],
    ["shadcn/ui", "https://ui.shadcn.com/"],
    ["shadcnblocks/reference-library", "https://shadcnblocks.com/"],
    ["magicui/reference-library", "https://magicui.design/"],
    ["aceternity/reference-library", "https://ui.aceternity.com/"],
    ["ai-sdk-elements/reference-library", "https://elements.ai-sdk.dev/"],
  ];
  const entries = catalog().entries.filter((entry) => expected.some(([localId]) => localId === entry.localId));
  assert.equal(entries.length, expected.length);
  for (const [localId, url] of expected) {
    const entry = entries.find((candidate) => candidate.localId === localId);
    assert.equal(entry.provenance.url, url);
    assert.deepEqual(entry.routing.platforms, ["web"]);
    assert.equal(entry.routing.mode, "reference-adaptation");
    assert.equal(entry.routing.evidenceStatus, "user-provided");
  }
});

test("routes AI interface language to the AI SDK Elements reference", () => {
  const chat = routeComponents({
    catalog: catalog(),
    brief: "AI chat interface",
    platform: "web",
  });
  const chatRoute = chat.routes.find((item) => item.capability === "ai-chat");
  assert.ok(chatRoute);
  assert.ok([chatRoute.selected, ...chatRoute.alternatives].some((entry) => entry.id === "frontend-component-sources:component:ai-sdk-elements/reference-library"));

  const voiceWorkflow = routeComponents({
    catalog: catalog(),
    brief: "voice UI workflow",
    platform: "web",
  });
  assert.equal(voiceWorkflow.status, "review");
  for (const capability of ["voice-ui", "workflow"]) {
    const route = voiceWorkflow.routes.find((item) => item.capability === capability);
    assert.equal(route.selected.id, "frontend-component-sources:component:ai-sdk-elements/reference-library");
  }
});
test("keeps user-curated references metadata-only and preserves mixed-license review", () => {
  const curatedIds = new Set([
    "beautiful-ui/reference-library",
    "beui/reference-library",
    "rareui/reference-library",
    "transitions/reference-library",
    "shadcn/ui",
    "shadcnblocks/reference-library",
    "magicui/reference-library",
    "aceternity/reference-library",
    "ai-sdk-elements/reference-library",
  ]);
  const curated = catalog().entries.filter((entry) => curatedIds.has(entry.localId));
  for (const entry of curated) {
    assert.equal(entry.routing.package, undefined);
    assert.equal(entry.routing.install, undefined);
    assert.equal(entry.provenance.sourceCode, undefined);
  }
  const shadcnblocks = curated.find((entry) => entry.localId === "shadcnblocks/reference-library");
  assert.equal(shadcnblocks.routing.requiresLicense, true);
  const result = routeComponents({
    catalog: { ...catalog(), entries: [shadcnblocks] },
    brief: "Curated reference", platform: "web", capabilities: [shadcnblocks.routing.capabilities[0]],
  });
  assert.equal(result.status, "review");
  assert.equal(result.routes[0].status, "review");
  assert.equal(result.routes[0].selected.id, shadcnblocks.id);
  assert.equal(result.routes[0].selected.requiresLicense, true);
  assert.equal(result.routes[0].selected.package, undefined);
  assert.equal(result.routes[0].selected.install, undefined);
  assert.equal(result.routes[0].selected.sourceCode, undefined);
});

test("route validates routing metadata on every component entry, including ones web ranking filters out", () => {
  const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/component-source-catalog.json"), "utf8"));
  const hidden = raw.components.find((entry) => entry.routing);
  hidden.webRanking = false;
  hidden.routing.capabilities = "app-ui";
  const malformed = normalizeSnapshot(raw);
  const id = malformed.entries.find((entry) => entry.webRanking === false && typeof entry.routing?.capabilities === "string").id;
  assert.throws(
    () => routeComponents({ catalog: malformed, brief: "SaaS dashboard app UI", platform: "web" }),
    new RegExp(`${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.routing\\.capabilities must be a non-empty string array`),
  );
});

for (const recordType of ["source", "method", "template"]) {
  test(`route rejects malformed routing metadata on a ${recordType} record instead of skipping it`, () => {
    const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/component-source-catalog.json"), "utf8"));
    const record = recordType === "source"
      ? raw.docs.find((entry) => entry.recordType === "source")
      : Object.assign(raw.components.find((entry) => entry.routing), { recordType });
    record.routing = { ...(record.routing || {}), capabilities: "bad", platforms: ["web"], mode: "package" };
    const malformed = normalizeSnapshot(raw);
    const id = malformed.entries.find((entry) => entry.recordType === recordType && entry.routing).id;
    assert.throws(
      () => routeComponents({ catalog: malformed, brief: "SaaS dashboard app UI", platform: "web" }),
      new RegExp(`${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.routing\\.capabilities must be a non-empty string array`),
    );
  });
}
