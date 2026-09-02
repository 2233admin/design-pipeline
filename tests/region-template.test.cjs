"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  decomposeReferenceRegions,
  normalizeReferenceSource,
  searchRegionTemplates,
  validateRegionTemplateCatalog,
} = require("../skill/scripts/region-template-core.cjs");

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/region-template-catalog.json"), "utf8"));
const fixture = `<main data-region="dashboard">
  <header data-region="header"></header>
  <section data-region="data-table" data-capabilities="search,filter,sort"></section>
</main>`;

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "region-template-"));
}

function sourceInput(sourceKind, file) {
  return {
    referenceId: `fixture-${sourceKind}`,
    sourceKind,
    pathOrProjectRef: file,
    capturedAt: "2026-09-01T12:00:00.000Z",
    provenance: { source: "task-3-fixture", owner: "design-pipeline" },
    licenseState: "project-owned",
    allowedDerivations: ["region-metadata", "reference-only"],
  };
}

test("normalizes project-page and local-HTML references with stable hashes and provenance", () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, "project.html"), fixture);
  fs.writeFileSync(path.join(root, "local.html"), fixture);
  const project = normalizeReferenceSource(sourceInput("project_page", "project.html"), root);
  const projectAgain = normalizeReferenceSource(sourceInput("project_page", "project.html"), root);
  const local = normalizeReferenceSource(sourceInput("local_html", "local.html"), root);
  const expectedHash = crypto.createHash("sha256").update(fixture).digest("hex");

  assert.equal(project.parseStatus, "pending");
  assert.equal(project.contentHash, expectedHash);
  assert.equal(project.contentHash, projectAgain.contentHash);
  assert.deepEqual(project.provenance, { source: "task-3-fixture", owner: "design-pipeline" });
  assert.equal(local.sourceKind, "local_html");
  assert.equal(local.contentHash, expectedHash);
});

test("decomposes only explicit markers in stable source order", () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, "fixture.html"), fixture);
  const source = normalizeReferenceSource(sourceInput("local_html", "fixture.html"), root);
  const regions = decomposeReferenceRegions(source);

  assert.equal(regions.status, "parsed");
  assert.deepEqual(regions.map((region) => region.regionKind), ["dashboard", "header", "data-table"]);
  assert.deepEqual(regions[2].capabilities, ["search", "filter", "sort"]);
  assert.deepEqual(regions.map((region) => region.order), [0, 1, 2]);
});

test("malformed, unmarked, invalid, and unavailable references stay visibly blocked", () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, "unmarked.html"), "<main><p>no region marker</p></main>");
  fs.writeFileSync(path.join(root, "malformed.html"), "<main data-region=\"dashboard\"><section>");
  const unmarked = decomposeReferenceRegions(normalizeReferenceSource(sourceInput("local_html", "unmarked.html"), root));
  const malformed = decomposeReferenceRegions(normalizeReferenceSource(sourceInput("local_html", "malformed.html"), root));
  const unavailable = normalizeReferenceSource(sourceInput("local_html", "missing.html"), root);
  const invalid = normalizeReferenceSource({ ...sourceInput("remote", "missing.html") }, root);

  assert.equal(unmarked.status, "blocked");
  assert.equal(unmarked.reason, "regions-unmarked");
  assert.equal(malformed.status, "blocked");
  assert.equal(malformed.reason, "html-malformed");
  assert.equal(unavailable.parseStatus, "unavailable");
  assert.equal(invalid.parseStatus, "invalid");
});

test("supports unquoted region markers and fails closed on unclosed comments", () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, "unquoted.html"), "<main data-region=dashboard><section data-region=data-table></section></main>");
  fs.writeFileSync(path.join(root, "comment.html"), "<main data-region=\"dashboard\"></main><!-- <section data-region=\"data-table\">");
  fs.writeFileSync(path.join(root, "unterminated-quote.html"), "<main data-region=\"dashboard></main>");
  const unquoted = decomposeReferenceRegions(normalizeReferenceSource(sourceInput("local_html", "unquoted.html"), root));
  const comment = decomposeReferenceRegions(normalizeReferenceSource(sourceInput("local_html", "comment.html"), root));
  const unterminatedQuote = decomposeReferenceRegions(normalizeReferenceSource(sourceInput("local_html", "unterminated-quote.html"), root));

  assert.equal(unquoted.status, "parsed");
  assert.deepEqual(unquoted.map((region) => region.regionKind), ["dashboard", "data-table"]);
  assert.equal(comment.status, "blocked");
  assert.equal(unterminatedQuote.status, "blocked");
  assert.equal(unterminatedQuote.reason, "html-malformed");
  assert.equal(comment.reason, "html-malformed");
});

test("classifies a missing root as unavailable", () => {
  const root = path.join(tempRoot(), "does-not-exist");
  const source = normalizeReferenceSource(sourceInput("local_html", "fixture.html"), root);
  assert.equal(source.parseStatus, "unavailable");
  assert.equal(source.reason, "source-unavailable");
});

test("validates inert catalog and ranks a matching data-table candidate", () => {
  const validated = validateRegionTemplateCatalog(catalog);
  const result = searchRegionTemplates(validated, {
    regionKind: "data-table",
    capabilities: ["search", "filter", "sort"],
    surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" },
    accessibilityRequired: true,
    selectionMode: "adopt",
  });
  const broadResult = searchRegionTemplates(validated, {
    regionKind: "data-table",
    capabilities: ["search", "filter"],
    surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" },
  });

  assert.equal(result.status, "ready");
  assert.equal(result.matches[0].templateId, "project-data-table-web-react");
  assert.ok(result.rejected.some((item) => item.reasonCode === "surface-platform-mismatch"));
  assert.ok(broadResult.rejected.some((item) => item.reasonCode === "surface-framework-mismatch"));
  assert.deepEqual(result.surfaceBinding, { platform: "web", framework: "react", profileVersion: "1" });
});

test("rejects a candidate without accessibility evidence when required", () => {
  const inaccessible = {
    ...catalog,
    entries: [
      {
        ...catalog.entries[0],
        templateId: "inaccessible-data-table",
        layoutTraits: ["dense", "responsive"],
        componentsUsed: ["table"],
        accessibility: false,
      },
      {
        ...catalog.entries[0],
        templateId: "negative-string-data-table",
        layoutTraits: ["dense", "responsive"],
        componentsUsed: ["table"],
        accessibility: "not accessible",
      },
      {
        ...catalog.entries[0],
        templateId: "failed-object-data-table",
        layoutTraits: ["dense", "responsive"],
        componentsUsed: ["table"],
        accessibility: { status: "fail", ready: true },
      },
    ],
  };
  const result = searchRegionTemplates(inaccessible, {
    regionKind: "data-table",
    capabilities: ["search", "filter", "sort"],
    surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" },
    accessibilityRequired: true,
  });
  assert.equal(result.status, "no-suitable-candidate");
  assert.equal(result.rejected.length, 3);
  assert.deepEqual(result.rejected.map((item) => item.templateId), [
    "inaccessible-data-table",
    "negative-string-data-table",
    "failed-object-data-table",
  ]);
});

test("returns rejection reasons and no-suitable-candidate instead of empty success", () => {
  const result = searchRegionTemplates(catalog, {
    regionKind: "data-table",
    capabilities: ["export"],
    surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" },
  });
  assert.equal(result.status, "no-suitable-candidate");
  assert.equal(result.matches.length, 0);
  assert.ok(result.rejected.some((item) => item.reasonCode === "capability-mismatch"));
});

test("missing license or provenance cannot produce an adoptable result", () => {
  const incomplete = {
    ...catalog,
    entries: [{
      ...catalog.entries[0],
      templateId: "incomplete-data-table",
      license: "unverified",
      provenance: {},
    }],
  };
  const result = searchRegionTemplates(incomplete, {
    regionKind: "data-table",
    capabilities: ["search"],
    surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" },
    selectionMode: "adopt",
  });
  assert.equal(result.status, "no-suitable-candidate");
  assert.equal(result.matches.length, 0);
  assert.ok(result.rejected.some((item) => item.reasonCode === "license-unavailable"));
  const provenanceMissing = searchRegionTemplates({
    ...catalog,
    entries: [{ ...catalog.entries[0], templateId: "missing-provenance-data-table", provenance: {} }],
  }, {
    regionKind: "data-table",
    capabilities: ["search"],
    surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" },
    selectionMode: "adopt",
  });
  assert.equal(provenanceMissing.status, "no-suitable-candidate");
  assert.ok(provenanceMissing.rejected.some((item) => item.reasonCode === "provenance-unavailable"));
});
test("rejects explicitly unconstrained region requests and reserved first-wave surfaces", () => {
  const base = { regionKind: "data-table", surfaceBinding: { platform: "web", framework: "react", profileVersion: "1" } };
  for (const request of [
    { ...base, capabilities: [] },
    { ...base, layoutTraits: [] },
    { ...base, accessibility: {} },
    { ...base, accessibilityRequired: undefined },
    { ...base, accessibility: { required: "true" } },
  ]) {
    const result = searchRegionTemplates(catalog, request);
    assert.equal(result.status, "blocked");
    assert.match(result.reason, /empty|boolean|accessibility/i);
  }
  const game = searchRegionTemplates(catalog, {
    regionKind: "data-table",
    capabilities: ["search"],
    surfaceBinding: { platform: "game", framework: "custom", profileVersion: "1", firstWave: false },
  });
  assert.equal(game.status, "blocked");
  assert.match(game.reason, /game|first.wave/i);
});
