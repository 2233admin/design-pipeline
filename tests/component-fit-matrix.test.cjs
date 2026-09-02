"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { canonicalJson, sha256, sortValue } = require("../skill/scripts/contract-utils.cjs");
const {
  buildComponentFitMatrix,
  createDirectionLock,
  validateComponentFitMatrix,
} = require("../skill/scripts/component-fit-core.cjs");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, relativePath), "utf8"));
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function catalog() {
  return normalizeSnapshot(readJson("../skill/references/component-source-catalog.json"));
}

function providerRegistry() {
  return readJson("../skill/references/component-providers.json");
}

function directionLock(overrides = {}) {
  return createDirectionLock({
    directionId: "signal",
    selectionReceiptHash: hashText("selection"),
    previewArtifactSha256: hashText("preview"),
    constraints: { era: "futurist", density: "dense", material: "glass" },
    visualKeywords: ["smoothui"],
    ...overrides,
  });
}

test("builds a capability-level matrix across the full component source catalog", () => {
  const result = buildComponentFitMatrix({
    schema: "design-pipeline.component-fit-request.v1",
    framework: "react",
    platform: "web",
    capabilities: ["app-ui", "button"],
    directionLock: directionLock({ foundationId: "frontend-component-sources:component:smoothui/components" }),
    catalog: catalog(),
  });

  assert.equal(result.schema, "design-pipeline.component-fit-matrix.v1");
  assert.ok(result.rows.every((row) => row.candidates.length > 1));
  assert.ok(result.rows.find((row) => row.capability === "button").candidates.some((candidate) => candidate.id.endsWith(":smoothui/components")));
  assert.equal(result.foundation.selected, "frontend-component-sources:component:smoothui/components");
  assert.equal(result.decisions.find((decision) => decision.capability === "button").action, "adopt");
  assert.equal(validateComponentFitMatrix(result).matrixHash, result.matrixHash);
});
test("requires string platform bindings at request and matrix boundaries", () => {
  const base = { framework: "react", platform: "web", capabilities: ["button"], directionLock: directionLock(), catalog: catalog() };
  assert.throws(() => buildComponentFitMatrix({ ...base, platform: 42 }), /component fit platform/);
  const matrix = buildComponentFitMatrix(base);
  const invalid = { ...matrix, platform: 42 };
  delete invalid.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...invalid, matrixHash: sha256(canonicalJson(invalid)) }), /matrix\.platform/);
});

test("reuses an explicitly declared project component before external candidates", () => {
  const project = {
    components: [{ id: "Tabs", framework: "react", capabilities: ["tabs"], provenance: "project-declared", accessibility: "verified", file: "src/components/Tabs.tsx" }],
  };
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["tabs"],
    directionLock: directionLock({ visualFit: { "project:Tabs": "pass" } }),
    project,
    catalog: catalog(),
  });

  const decision = result.decisions.find((item) => item.capability === "tabs");
  assert.equal(decision.action, "reuse");
  assert.equal(decision.candidate, "project:Tabs");
  assert.equal(result.rows[0].candidates.find((candidate) => candidate.id === "project:Tabs").status, "ready");
  assert.equal(validateComponentFitMatrix(result, { project }).matrixHash, result.matrixHash);
  assert.throws(() => validateComponentFitMatrix(result, { project: { components: [{ ...project.components[0], file: "src/components/Other.tsx" }] } }), /project binding is stale/);
  assert.throws(() => validateComponentFitMatrix(result, { project: { ...project, framework: "vue" } }), /project binding is stale/);
});
test("does not reuse blocked project components", () => {
  const project = {
    components: [{
      id: "Tabs",
      framework: "react",
      capabilities: ["tabs"],
      provenance: "project-declared",
      accessibility: "verified",
      status: "blocked",
      file: "src/components/Tabs.tsx",
    }],
  };
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["tabs"],
    directionLock: directionLock({ visualFit: { "project:Tabs": "pass" } }),
    project,
    catalog: catalog(),
  });
  assert.equal(result.rows[0].candidates.find((candidate) => candidate.id === "project:Tabs").status, "blocked");
  assert.notEqual(result.decisions[0].action, "reuse");
});

test("keeps unverified and visually unapproved references out of direct adoption", () => {
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["dialog"],
    directionLock: directionLock(),
    catalog: catalog(),
  });

  const shadcn = result.rows[0].candidates.find((candidate) => candidate.id.endsWith(":shadcn/ui"));
  assert.ok(shadcn);
  assert.equal(shadcn.role, "reference-only");
  assert.equal(shadcn.dimensions.license.status, "review");
  assert.equal(shadcn.dimensions.visualFit.status, "review");
  assert.notEqual(result.decisions[0].candidate, shadcn.id);
});
test("negative accessibility evidence cannot become an adopted candidate", () => {
  const source = catalog();
  const original = source.entries.find((entry) => entry.id.endsWith(":smoothui/components"));
  const inaccessible = {
    ...original,
    alignment: { ...original.alignment, accessibility: "not accessible" },
  };
  delete inaccessible.hash;
  inaccessible.hash = sha256(canonicalJson(sortValue(inaccessible)));
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: directionLock({ foundationId: inaccessible.id }),
    catalog: { ...source, entries: source.entries.map((entry) => entry.id === inaccessible.id ? inaccessible : entry) },
  });
  const candidate = result.rows[0].candidates.find((item) => item.id === inaccessible.id);
  assert.equal(candidate.dimensions.accessibility.status, "review");
  assert.notEqual(result.decisions[0].action, "adopt");
});
test("trims unspecified license metadata before adoption", () => {
  const source = catalog();
  const original = source.entries.find((entry) => entry.id.endsWith(":smoothui/components"));
  const unlicensed = {
    ...original,
    provenance: { ...original.provenance, license: " unknown " },
  };
  delete unlicensed.hash;
  unlicensed.hash = sha256(canonicalJson(sortValue(unlicensed)));
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: directionLock({ foundationId: unlicensed.id }),
    catalog: { ...source, entries: source.entries.map((entry) => entry.id === unlicensed.id ? unlicensed : entry) },
  });
  const candidate = result.rows[0].candidates.find((item) => item.id === unlicensed.id);
  assert.equal(candidate.dimensions.license.status, "review");
  assert.notEqual(result.decisions[0].action, "adopt");
});

test("requires a fresh direction lock and rejects stale matrix hashes", () => {
  const lock = directionLock();
  const matrix = buildComponentFitMatrix({ framework: "react", platform: "web", capabilities: ["button"], directionLock: lock, catalog: catalog() });
  assert.throws(() => buildComponentFitMatrix({ framework: "react", platform: "web", capabilities: ["button"], directionLock: { ...lock, directionId: "changed" }, catalog: catalog() }), /direction lock hash is stale/);
  assert.throws(() => validateComponentFitMatrix({ ...matrix, platform: "expo" }), /component fit matrix hash is stale/);
  assert.throws(() => validateComponentFitMatrix(matrix, { directionLock: directionLock({ directionId: "changed" }) }), /direction lock binding is stale/);
  const rewrittenDirection = { ...matrix, directionLock: { ...matrix.directionLock, directionId: "spoofed" } };
  delete rewrittenDirection.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...rewrittenDirection, matrixHash: sha256(canonicalJson(rewrittenDirection)) }, { directionLock: lock }), /direction lock binding is stale/);
  const changedCatalog = { ...catalog(), entries: catalog().entries.slice(0, -1) };
  assert.throws(() => validateComponentFitMatrix(matrix, { catalog: changedCatalog }), /catalog binding is stale/);
});
test("exposes direction locking and fit matrix generation through the public CLI", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "component-fit-cli-"));
  try {
    const lockRequest = {
      directionId: "signal",
      selectionReceiptHash: "a".repeat(64),
      previewArtifactSha256: "b".repeat(64),
      constraints: { era: "futurist", density: "dense" },
      visualKeywords: ["smoothui"],
    };
    fs.writeFileSync(path.join(root, "lock-request.json"), JSON.stringify(lockRequest));
    fs.writeFileSync(path.join(root, "catalog.json"), JSON.stringify(catalog()));
    fs.writeFileSync(path.join(root, "providers.json"), JSON.stringify(providerRegistry()));
    fs.writeFileSync(path.join(root, "inventory.json"), JSON.stringify({
      schema: "design-pipeline.component-inventory.v1",
      status: "ready",
      framework: "react",
      projectRoot: "src",
      declarationFile: null,
      components: [],
    }));
    const locked = execute(["component", "lock", "--root", root, "--artifact", "lock-request.json", "--write", "--output", "direction-lock.json", "--json"]);
    assert.equal(locked.exitCode, 0);
    assert.equal(locked.output.lock.schema, "design-pipeline.direction-lock.v1");

    fs.writeFileSync(path.join(root, "fit-request.json"), JSON.stringify({
      framework: "react",
      platform: "web",
      capabilities: ["button"],
      directionLock: locked.output.lock,
    }));
    const fitted = execute(["component", "fit", "--root", root, "--artifact", "fit-request.json", "--catalog", "catalog.json", "--providers", "providers.json", "--inventory", "inventory.json", "--write", "--output", "component-fit-matrix.json", "--json"]);
    assert.equal(fitted.exitCode, 0);
    assert.equal(fitted.output.matrix.schema, "design-pipeline.component-fit-matrix.v1");
    const validated = execute(["component", "validate-fit", "--root", root, "--artifact", "component-fit-matrix.json", "--direction-lock", "direction-lock.json", "--catalog", "catalog.json", "--providers", "providers.json", "--inventory", "inventory.json", "--json"]);
    assert.equal(validated.exitCode, 0);
    assert.equal(validated.output.status, "valid");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("includes governed framework providers alongside catalog sources for capability-level decisions", () => {
  const providers = providerRegistry();
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["overlay.dialog"],
    directionLock: directionLock({ visualFit: { "provider:project-dom": "pass" } }),
    providers,
    catalog: catalog(),
  });

  const row = result.rows[0];
  assert.ok(row.candidates.some((candidate) => candidate.id === "provider:project-dom"));
  assert.ok(row.candidates.some((candidate) => candidate.id === "provider:react-aria"));
  assert.equal(row.decision.action, "reuse");
  assert.equal(row.decision.candidate, "provider:project-dom");
  assert.equal(result.providerHash.length, 64);
  const reactAria = row.candidates.find((candidate) => candidate.id === "provider:react-aria");
  assert.equal(reactAria.dimensions.license.status, "fail");
  assert.equal(reactAria.status, "blocked");
  const reordered = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["overlay.dialog"],
    directionLock: directionLock({ visualFit: { "provider:project-dom": "pass" } }),
    providers: { ...providers, providers: [...providers.providers].reverse() },
    catalog: catalog(),
  });
  assert.equal(reordered.providerHash, result.providerHash);
  assert.equal(reordered.matrixHash, result.matrixHash);
});
test("blocks adoption when ready foundation candidates are split across capabilities", () => {
  const base = catalog();
  const original = base.entries.find((entry) => entry.id.endsWith(":smoothui/components"));
  const duplicate = { ...original, localId: "smoothui-alt", id: `${base.namespace}:component:smoothui-alt` };
  delete duplicate.hash;
  duplicate.hash = sha256(canonicalJson(sortValue(duplicate)));
  const splitCatalog = { ...base, entries: [...base.entries, duplicate] };
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: directionLock({ visualKeywords: ["smoothui"] }),
    catalog: splitCatalog,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.foundation.coherence, "blocked");
  assert.match(result.foundation.blocker.reason, /multiple ready foundation/);
});
test("blocks every decision when foundations are globally ambiguous", () => {
  const base = catalog();
  const original = base.entries.find((entry) => entry.id.endsWith(":smoothui/components"));
  const makeFoundation = (suffix, capabilities) => {
    const entry = {
      ...original,
      localId: `smoothui-${suffix}`,
      id: `${base.namespace}:component:smoothui-${suffix}`,
      routing: { ...original.routing, capabilities },
    };
    delete entry.hash;
    entry.hash = sha256(canonicalJson(sortValue(entry)));
    return entry;
  };
  const disjointCatalog = {
    ...base,
    entries: [
      ...base.entries.filter((entry) => entry.id !== original.id),
      makeFoundation("button", ["button"]),
      makeFoundation("dialog", ["dialog"]),
    ],
  };
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button", "dialog"],
    directionLock: directionLock({ visualKeywords: ["smoothui"] }),
    catalog: disjointCatalog,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.foundation.coherence, "blocked");
  assert.ok(result.decisions.length > 1);
  assert.ok(result.decisions.every((decision) => decision.action === "blocked" && decision.candidate === null));
});
test("keeps selected non-ready foundations blocked and self-validating", () => {
  const result = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: directionLock({ foundationId: "frontend-component-sources:component:smoothui/components", visualKeywords: [] }),
    catalog: catalog(),
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.foundation.coherence, "blocked");
  assert.match(result.foundation.blocker.reason, /not ready/);
  assert.doesNotThrow(() => validateComponentFitMatrix(result));
});
test("rejects malformed capabilities, direction-lock options, providers, and matrix structure", () => {
  assert.throws(() => buildComponentFitMatrix({ capabilities: "button", directionLock: directionLock(), catalog: catalog() }), /capabilities must contain/);
  assert.throws(() => createDirectionLock({
    directionId: "signal",
    selectionReceiptHash: "a".repeat(64),
    previewArtifactSha256: "b".repeat(64),
    constraints: {},
    preferredSources: [42],
  }), /preferredSources must contain/);
  assert.throws(() => buildComponentFitMatrix({
    capabilities: ["button"],
    directionLock: directionLock(),
    providers: [{ id: "fake", frameworks: ["react"], capabilities: ["button"], status: "ready" }],
    catalog: catalog(),
  }), /governed component-provider-registry/);
  const governed = providerRegistry();
  assert.throws(() => buildComponentFitMatrix({ capabilities: ["button"], directionLock: directionLock(), providers: { ...governed, reviewedAt: "yesterday" }, catalog: catalog() }), /reviewedAt must be an ISO date/);
  assert.throws(() => buildComponentFitMatrix({
    capabilities: ["button"],
    directionLock: directionLock(),
    providers: { ...governed, providers: [{ ...governed.providers[0], interfaces: [] }, ...governed.providers.slice(1)] },
    catalog: catalog(),
  }), /interfaces must not be empty/);
  assert.throws(() => buildComponentFitMatrix({ capabilities: ["button"], directionLock: directionLock(), catalog: catalog() }), /component fit framework/);
  const matrix = buildComponentFitMatrix({ framework: "react", capabilities: ["button"], directionLock: directionLock(), catalog: catalog() });
  const forgedBody = { ...matrix, capabilities: [], rows: [], decisions: [] };
  delete forgedBody.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...forgedBody, matrixHash: sha256(canonicalJson(forgedBody)) }), /matrix.capabilities must not be empty/);
});
test("rejects forged derived statuses, decisions, and foundation state", () => {
  const matrix = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: directionLock({ foundationId: "frontend-component-sources:component:smoothui/components" }),
    catalog: catalog(),
  });
  const forgedCandidate = structuredClone(matrix);
  const reviewCandidate = forgedCandidate.rows[0].candidates.find((candidate) => candidate.status === "review");
  reviewCandidate.status = "ready";
  delete forgedCandidate.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...forgedCandidate, matrixHash: sha256(canonicalJson(forgedCandidate)) }), /status contradicts its dimension statuses/);
  const forgedDecision = structuredClone(matrix);
  const blockedCandidate = forgedDecision.rows[0].candidates.find((candidate) => candidate.status !== "ready");
  forgedDecision.rows[0].decision = { ...forgedDecision.rows[0].decision, action: "adopt", candidate: blockedCandidate.id };
  forgedDecision.decisions[0] = forgedDecision.rows[0].decision;
  delete forgedDecision.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...forgedDecision, matrixHash: sha256(canonicalJson(forgedDecision)) }), /adopt is invalid for candidate role/);
  const splitCatalog = catalog();
  const original = splitCatalog.entries.find((entry) => entry.id.endsWith(":smoothui/components"));
  const duplicate = { ...original, localId: "smoothui-alt", id: `${splitCatalog.namespace}:component:smoothui-alt` };
  delete duplicate.hash;
  duplicate.hash = sha256(canonicalJson(sortValue(duplicate)));
  const selectedFoundation = buildComponentFitMatrix({
    framework: "react",
    platform: "web",
    capabilities: ["button"],
    directionLock: directionLock({ foundationId: original.id, visualKeywords: ["smoothui"] }),
    catalog: { ...splitCatalog, entries: [...splitCatalog.entries, duplicate] },
  });
  const alternate = selectedFoundation.rows[0].candidates.find((candidate) => candidate.role === "foundation" && candidate.id !== selectedFoundation.foundation.selected);
  const forgedFoundationDecision = structuredClone(selectedFoundation);
  forgedFoundationDecision.rows[0].decision = { ...forgedFoundationDecision.rows[0].decision, action: "adopt", candidate: alternate.id };
  forgedFoundationDecision.decisions[0] = forgedFoundationDecision.rows[0].decision;
  delete forgedFoundationDecision.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...forgedFoundationDecision, matrixHash: sha256(canonicalJson(forgedFoundationDecision)) }), /adopt conflicts with the selected foundation/);

  const forgedStatus = { ...matrix, status: "blocked" };
  delete forgedStatus.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...forgedStatus, matrixHash: sha256(canonicalJson(forgedStatus)) }), /matrix status contradicts rows and foundation/);

  const forgedFoundation = { ...matrix, foundation: { ...matrix.foundation, coherence: "requires-selection" } };
  delete forgedFoundation.matrixHash;
  assert.throws(() => validateComponentFitMatrix({ ...forgedFoundation, matrixHash: sha256(canonicalJson(forgedFoundation)) }), /matrix foundation state contradicts candidates/);
});

test("rejects malformed project component inventories instead of filtering them", () => {
  assert.throws(() => buildComponentFitMatrix(null), /component fit request/);
  const base = { framework: "react", platform: "web", capabilities: ["button"], directionLock: directionLock(), catalog: catalog() };
  assert.throws(() => buildComponentFitMatrix({ ...base, project: { components: [null] } }), /project component 0 must be an object/);
  assert.throws(() => buildComponentFitMatrix({ ...base, project: { components: [{ id: "Button", framework: "react", capabilities: ["button"], provenance: "project-declared", extra: true }] } }), /contains unsupported fields/);
  assert.throws(() => buildComponentFitMatrix({ ...base, project: { components: [{ id: "Button", framework: "react", capabilities: ["button"], provenance: "project-declared" }, { id: "Button", framework: "react", capabilities: [], provenance: "unverified" }] } }), /duplicate project component/);
  assert.throws(() => buildComponentFitMatrix({
    ...base,
    project: {
      schema: "design-pipeline.component-inventory.v1",
      status: "ready",
      framework: null,
      projectRoot: ".",
      declarationFile: null,
      components: [],
    },
  }), /project component inventory framework/);
  const malformedCatalog = catalog();
  const malformedEntry = { ...malformedCatalog.entries.find((entry) => entry.id.endsWith(":smoothui/components")), routing: { ...malformedCatalog.entries.find((entry) => entry.id.endsWith(":smoothui/components")).routing, capabilities: "button" } };
  delete malformedEntry.hash;
  malformedEntry.hash = sha256(canonicalJson(sortValue(malformedEntry)));
  assert.throws(() => buildComponentFitMatrix({
    ...base,
    catalog: { ...malformedCatalog, entries: malformedCatalog.entries.map((entry) => entry.id === malformedEntry.id ? malformedEntry : entry) },
  }), /routing\.capabilities must contain/);
});
