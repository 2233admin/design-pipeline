"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  normalizeSnapshot,
  searchCatalog,
  validateCatalog,
  validateSnapshot,
} = require("../skill/scripts/design-system-catalog-core.cjs");
const { routeComponents } = require("../skill/scripts/component-route-core.cjs");
const { resolveFrontendStack } = require("../skill/scripts/frontend-stack-core.cjs");

const references = path.resolve(__dirname, "../skill/references");
const manifest = JSON.parse(fs.readFileSync(path.join(references, "../vendor/mengto-skills/manifest.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(references, "frontend-stack-registry.json"), "utf8"));
const preservedRoutes = {
  "website-cloning": ["html-to-interaction-prompts", "stitched-full-page-capture", "audit-reference-originality", "iterate-until-verified"],
  "interaction-extraction": ["html-to-interaction-prompts", "animation-systems", "optimize-web-animations"],
  tailwindcss: ["tailwindcss"],
  "visual-style": ["design-first-ui-prompting", "build-awwwards-quality-sites"],
  verification: ["iterate-until-verified", "audit-verify-explain-grade-5"],
};

function snapshot(entry = {}) {
  return {
    schema: "design-pipeline.design-system-snapshot.v1",
    version: "1",
    namespace: "source-contract",
    provenance: { source: "Example UI", url: "https://example.test/ui", license: "MIT" },
    components: [{
      id: "button",
      name: "Button",
      routing: { capabilities: ["button"], platforms: ["web", "expo"], mode: "package", evidenceStatus: "verified" },
      ...entry,
    }],
  };
}

function metadata(overrides = {}) {
  return {
    sourceId: "example-ui",
    recordType: "component",
    availability: "bundled-implementation",
    license: { state: "verified", id: "MIT", evidence: ["vendor/example-ui/upstream/LICENSE"] },
    ...overrides,
  };
}

function route(entry = {}, platform = "web") {
  return routeComponents({ catalog: normalizeSnapshot(snapshot(entry)), brief: "Button", capabilities: ["button"], platform });
}

function projection() {
  const categories = {};
  for (const skill of manifest.skills) (categories[skill.category] ||= []).push(skill.name);
  return {
    schema: "design-pipeline.skill-catalog.v1",
    source: manifest.source.repository,
    revision: manifest.source.revision,
    license: manifest.source.license,
    count: manifest.skills.length,
    categories,
    routes: structuredClone(preservedRoutes),
  };
}

function resolve(skills) {
  return resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "Build a dashboard", requested: {} }, registry, skills);
}

test("legacy snapshots and route summaries remain valid without source metadata", () => {
  const input = snapshot();
  assert.equal(validateSnapshot(input), input);
  const catalog = normalizeSnapshot(input);
  assert.equal(validateCatalog(catalog), catalog);
  const selected = route().routes[0].selected;
  assert.equal(selected.id, "source-contract:component:button");
  assert.equal(selected.license, "MIT");
  assert.equal(selected.status, "ready");
  assert.equal(Object.hasOwn(selected, "sourceId"), false);
  assert.equal(Object.hasOwn(selected, "licenseEvidence"), false);
});

test("explicit source metadata and local path members survive normalization without losing provenance", () => {
  const input = snapshot(metadata({
    localPaths: {
      guide: "references/example-ui.md",
      manifest: "vendor/example-ui/manifest.json",
      catalog: "references/example-ui.json",
      implementation: "vendor/example-ui/upstream/components/button.tsx",
    },
    provenance: {
      revision: "0123456789abcdef0123456789abcdef01234567",
      gitTree: "89abcdef0123456789abcdef0123456789abcdef",
      hashScope: "vendored implementation files",
    },
  }));
  const untouched = structuredClone(input);
  assert.equal(validateSnapshot(input), input);
  const catalog = normalizeSnapshot(input);
  assert.equal(validateCatalog(catalog), catalog);
  const entry = catalog.entries[0];
  assert.equal(entry.id, "source-contract:component:button");
  assert.equal(entry.sourceId, "example-ui");
  assert.deepEqual(entry.localPaths, input.components[0].localPaths);
  assert.deepEqual(entry.license, input.components[0].license);
  assert.equal(entry.provenance.license, "MIT");
  assert.equal(entry.provenance.revision, input.components[0].provenance.revision);
  assert.equal(entry.provenance.hashScope, "vendored implementation files");
  assert.deepEqual(input, untouched);
  const changed = structuredClone(input);
  changed.components[0].license.evidence.push("https://example.test/license");
  assert.notEqual(normalizeSnapshot(changed).entries[0].hash, entry.hash);
});

test("source metadata fields remain independently optional", () => {
  for (const entry of [
    { sourceId: "example-ui" },
    { sourceId: "facebook/astryx" },
    { sourceId: "vercel/next.js" },
    { recordType: "component" },
    { availability: "reference-link" },
    { localPaths: { guide: "references/example-ui.md" } },
    { license: { state: "platform", evidence: ["Web platform API"] } },
    { webRanking: false },
  ]) assert.doesNotThrow(() => normalizeSnapshot(snapshot(entry)));
});

const invalidMetadata = [
  ["sourceId", "Example/UI"],
  ["sourceId", "example_ui"],
  ["sourceId", "example--ui"],
  ["sourceId", ""],
  ["sourceId", null],
  ["recordType", "library"],
  ["recordType", null],
  ["availability", "bundled"],
  ["availability", null],
  ["webRanking", "false"],
  ["license", "MIT"],
  ["license", null],
  ["license", { state: "verified" }],
  ["license", { state: "verified", evidence: [] }],
  ["license", { state: "verified", evidence: [" "] }],
  ["license", { state: "verified", evidence: [7] }],
  ["license", { state: "verified", evidence: "LICENSE" }],
  ["license", { state: "verified+commercial", evidence: ["LICENSE"] }],
  ["license", { state: "verified", id: " ", evidence: ["LICENSE"] }],
  ["license", { state: "verified", evidence: ["LICENSE"], commercial: true }],
];
for (const [field, value] of invalidMetadata) {
  test(`supplied ${field} rejects ${JSON.stringify(value)}`, () => {
    const input = snapshot({ [field]: value });
    assert.throws(() => validateSnapshot(input), new RegExp(field));
    assert.throws(() => normalizeSnapshot(input), new RegExp(field));
    const catalog = normalizeSnapshot(snapshot());
    catalog.entries[0][field] = value;
    assert.throws(() => validateCatalog(catalog), new RegExp(field));
  });
}

test("localPaths validates its explicit members instead of treating the object as a path string", () => {
  for (const member of ["guide", "manifest", "catalog", "implementation"]) {
    assert.doesNotThrow(() => normalizeSnapshot(snapshot({ localPaths: { [member]: "references/example.md" } })));
    for (const value of ["../secret", "nested/../secret", "C:\\secret", "C:secret", "/secret", "\\\\server\\share\\secret", "https://example.test/file", "secret\u0000file", " ", 7, null]) {
      assert.throws(() => validateSnapshot(snapshot({ localPaths: { [member]: value } })), /localPaths/);
    }
  }
  for (const value of ["references/example.md", [], null, { unexpected: "references/example.md" }]) {
    assert.throws(() => validateSnapshot(snapshot({ localPaths: value })), /localPaths/);
  }
});

for (const field of ["revision", "gitTree", "hashScope"]) {
  test(`supplied provenance ${field} must be nonempty text`, () => {
    for (const value of [" ", 7, null]) {
      const input = snapshot({ provenance: { [field]: value } });
      assert.throws(() => validateSnapshot(input), new RegExp(field));
      assert.throws(() => normalizeSnapshot(input), new RegExp(field));
      const defaults = snapshot();
      defaults.provenance[field] = value;
      assert.throws(() => validateSnapshot(defaults), new RegExp(field));
    }
  });
}

test("source records are searchable docs and cannot be registered as component implementations", () => {
  const input = snapshot();
  input.docs = [{ id: "film-source", ...metadata({ sourceId: "film-source", recordType: "source", webRanking: false }), name: "Film source" }];
  const catalog = normalizeSnapshot(input);
  const source = searchCatalog(catalog, { query: "Film source", kind: "doc" })[0];
  assert.equal(source.kind, "doc");
  assert.equal(source.recordType, "source");
  assert.equal(source.id, "source-contract:doc:film-source");
  const result = routeComponents({ catalog, brief: "Button", capabilities: ["button"], platform: "web" });
  assert.equal(result.routes[0].selected.id, "source-contract:component:button");
  assert.throws(() => normalizeSnapshot(snapshot(metadata({ recordType: "source" }))), /source.*doc|doc.*source/);
});

test("explicit method and template records cannot enter component implementation ranking", () => {
  for (const recordType of ["method", "template"]) {
    const result = route(metadata({ recordType }));
    assert.equal(result.status, "blocked");
    assert.equal(result.routes[0].selected, null);
  }
});

test("webRanking false keeps film and GEPA candidates out of web routes without disabling other platforms", () => {
  for (const sourceId of ["film-source", "gepa"]) {
    const entry = metadata({ sourceId, webRanking: false });
    assert.equal(route(entry, "web").status, "blocked");
    assert.equal(route(entry, "expo").status, "ready");
  }
});

for (const state of ["unverified", "commercial"]) {
  test(`explicit ${state} license needs review and the route preserves both license surfaces`, () => {
    const license = { state, evidence: ["https://example.test/license-review"] };
    const result = route(metadata({ availability: "reference-link", license }));
    assert.equal(result.status, "review");
    assert.equal(result.routes[0].status, "review");
    const selected = result.routes[0].selected;
    assert.equal(selected.status, "review");
    assert.equal(selected.sourceId, "example-ui");
    assert.equal(selected.availability, "reference-link");
    assert.equal(selected.license, "MIT");
    assert.deepEqual(selected.licenseEvidence, license);
  });
}

for (const state of ["unverified", "commercial"]) {
  test(`${state} references never expose executable copy or installation routes`, () => {
    const input = snapshot(metadata({
      availability: "reference-link",
      license: { state, evidence: ["https://example.test/license-review"] },
      provenance: { sourceCode: "https://example.test/source" },
      routing: {
        capabilities: ["button"], platforms: ["web"], mode: "registry-copy",
        evidenceStatus: "verified", package: "@example/ui", install: "npm install @example/ui",
        dependencies: ["example-runtime"], recommendations: { button: ["Button"] },
        componentInventory: [{ name: "Button", docUrl: "https://example.test/button",
          installCommand: "npx example add button", dependencies: ["example-runtime"],
          registryDependencies: ["example-registry"] }],
      },
    }));
    input.components.push({ ...structuredClone(input.components[0]), id: "alternative" });
    const result = routeComponents({ catalog: normalizeSnapshot(input), brief: "Button", capabilities: ["button"], platform: "web" });
    const candidates = [result.routes[0].selected, ...result.routes[0].alternatives];
    assert.equal(candidates.length, 2);
    for (const candidate of candidates) {
      assert.equal(candidate.status, "review");
      assert.equal(candidate.mode, "reference-adaptation");
      for (const key of ["package", "install", "dependencies", "sourceCode"]) assert.equal(candidate[key], undefined);
      assert.equal(candidate.recommendedComponentDetails[0].docUrl, "https://example.test/button");
      for (const key of ["install", "dependencies", "registryDependencies"]) {
        assert.equal(candidate.recommendedComponentDetails[0][key], undefined);
      }
    }
  });
}

test("verified, project-owned and platform license states retain ready ranking and expose metadata", () => {
  for (const state of ["verified", "project-owned", "platform"]) {
    const entry = metadata({ license: { state, evidence: ["Recorded authority"] } });
    const result = route(entry);
    assert.equal(result.status, "ready");
    assert.equal(result.routes[0].selected.sourceId, "example-ui");
    assert.equal(result.routes[0].selected.availability, "bundled-implementation");
    assert.deepEqual(result.routes[0].selected.licenseEvidence, entry.license);
  }
});

test("maintained MengTo projection equals the immutable manifest and retains existing routes", () => {
  const actual = JSON.parse(fs.readFileSync(path.join(references, "mengto-skills-catalog.json"), "utf8"));
  assert.deepEqual(actual, projection());
});

test("frontend stack accepts the current manifest projection and reports its actual revision", () => {
  const result = resolve(projection());
  assert.equal(result.status, "ready");
  assert.ok(result.evidence.includes(`mengto:${manifest.source.revision}`));
});

const projectionMutations = [
  ["same-count skill replacement", (value) => { value.categories.codex[0] = "not-in-the-manifest"; }],
  ["stale revision", (value) => { value.revision = "3f4c22d10055d3fdddb17248d59d0c1b731cb8d3"; }],
  ["wrong source", (value) => { value.source = "https://example.test/wrong-source"; }],
  ["wrong license", (value) => { value.license = "unverified"; }],
  ["wrong count", (value) => { value.count -= 1; }],
  ["missing category", (value) => { delete value.categories.workflow; }],
  ["duplicate skill", (value) => { value.categories.codex[0] = value.categories.codex[1]; }],
];
for (const [label, mutate] of projectionMutations) {
  test(`frontend stack rejects manifest drift: ${label}`, () => {
    const value = projection();
    mutate(value);
    assert.throws(() => resolve(value), /MengTo.*(manifest|invalid)/);
  });
}

test("frontend stack no longer accepts the obsolete 127-skill projection contract", () => {
  const value = projection();
  value.count = 127;
  value.categories = { codex: manifest.skills.slice(0, 127).map(({ name }) => name) };
  assert.throws(() => resolve(value), /MengTo.*(manifest|invalid)/);
});
