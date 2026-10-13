"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { decomposeCapabilities, normalizeSnapshot, searchCapabilities, searchCatalog } = require("../skill/scripts/design-system-catalog-core.cjs");
const { decideDesignSystem, projectDesignSystemTokens, validateDesignSystemDecision } = require("../skill/scripts/design-system-decision-core.cjs");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { validateTokens } = require("../skill/scripts/interoperability-core.cjs");

function catalog(options = {}) {
  const tokens = options.tokens || {
    "color.action.primary": ["var(--action-light)", "var(--action-dark)"],
    "spacing.small": { value: "0.5rem", type: "dimension", role: "space.inline.small" },
  };
  return normalizeSnapshot({
    schema: "design-pipeline.design-system-snapshot.v1",
    version: "1",
    namespace: "example",
    provenance: { source: "https://example.test/design-system", license: "MIT" },
    templates: [{
      id: "example-react", name: "Example React", status: options.status || "stable", category: "react",
      keywords: ["app shell"],
      runtime: options.runtime || { react: "^19.0.0", reactDom: "^19.0.0", stylex: "^0.15.0" },
      theme: { tokens },
    }, ...(options.extraTemplates || [])],
  });
}

function inventory(value, query = "app shell", capabilities = decomposeCapabilities(query, { allowPartialWords: false }), searchOptions = {}) {
  const ids = capabilities.map((item) => typeof item === "string" ? item : item.capability || item.id);
  const direct = searchCatalog(value, { ...searchOptions, query });
  const { capabilityMap, uniqueEntryCount } = searchCapabilities(value, ids, searchOptions);
  return {
    catalogHash: sha256(canonicalJson(value)),
    searchOptions,
    directQuery: query,
    directQueryResults: direct.length,
    directMatchedIds: direct.map((entry) => entry.id),
    searchedCapabilities: capabilities,
    capabilityResults: Object.fromEntries(Object.entries(capabilityMap).map(([id, result]) => [id, { terms: result.terms, count: result.count, matchedIds: result.entries.map((entry) => entry.id) }])),
    zeroResultInconclusive: direct.length === 0 && uniqueEntryCount > 0,
  };
}

function searchSelection(mode, value) {
  return {
    basis: "capability-search",
    authority: {
      actor: mode === "substitute" || mode === "custom" ? "owner" : "agent",
      source: "request",
      choice: mode,
      text: mode === "substitute" ? "Replace the existing system with the compatible catalog candidate." : mode === "custom" ? "Use a project-owned fallback after comparing the catalog candidates." : "Compare the catalog candidates for this project.",
    },
    rationale: "The compared candidates establish the intended use and project fit.",
    compatibility: "Keep the current React, react-dom and StyleX versions and the existing product constraints.",
    compared: value.entries.map((entry) => ({ id: entry.id, reason: "Compared the candidate's runtime and project fit." })),
  };
}

function governed(value) {
  return {
    frontendStackDecision: {
      schema: "design-pipeline.frontend-stack-decision.v1",
      status: "ready",
      registryHash: "a".repeat(64),
      selected: { styling: { id: "none" }, uiLibrary: { id: "none" } },
      toolRoutes: [],
    },
    capabilityInventory: inventory(value.catalog),
    selection: searchSelection(value.mode, value.catalog),
    ...value,
  };
}

function scratch(value = {}) {
  const request = governed({ mode: "custom", catalog: catalog(), project: {}, ...value });
  delete request.capabilityInventory;
  request.selection = {
    basis: "owner-scratch",
    authority: { actor: "owner", source: "request", choice: "custom", text: "Build this UI from scratch; do not use a catalog design system." },
    rationale: "The owner explicitly selected project-owned scratch work.",
    compared: [],
  };
  return request;
}

test("projects light/dark tuples, CSS strings, and semantic roles without loss", () => {
  const result = projectDesignSystemTokens(catalog());
  assert.equal(result.status, "ready");
  assert.deepEqual(result.losses, []);
  assert.equal(result.tokens.tokens.color["action-primary"].$value, "var(--action-light)");
  assert.deepEqual(result.tokens.tokens.color["action-primary"].$extensions["design-pipeline"].modes, { light: "var(--action-light)", dark: "var(--action-dark)" });
  assert.equal(result.tokens.tokens.spacing.small.$extensions["design-pipeline"].role, "space.inline.small");
  assert.equal(validateTokens(result.tokens).tokenCount, 2);
});

test("bundled Astryx snapshot projects all 184 tokens without path collisions", () => {
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/astryx-design-system-snapshot.json"), "utf8"));
  const result = projectDesignSystemTokens(normalizeSnapshot(snapshot));
  assert.notEqual(result.status, "blocked");
  assert.equal(validateTokens(result.tokens).tokenCount, 184);
  assert.ok(!result.losses.some((loss) => loss.code === "path-collision"));
  assert.ok(result.losses.every((loss) => loss.path && loss.message));
  assert.equal(result.tokens.tokens.color.accent.$extensions["design-pipeline"].sourceName, "--color-accent");
  assert.equal(result.tokens.tokens.color.accent.$extensions["design-pipeline"].role, "color.accent");
  assert.equal(result.tokens.tokens.color["accent-muted"].$extensions["design-pipeline"].sourceName, "--color-accent-muted");
  assert.equal(result.tokens.tokens.font["weight-normal"].$type, "fontWeight");
  assert.equal(result.tokens.tokens.font["size-base"].$type, "dimension");
});

test("true normalized token-name duplicates remain blocked", () => {
  const result = projectDesignSystemTokens(catalog({ tokens: { "--color-accent": "#06f", "color.accent": "#07f" } }));
  assert.equal(result.status, "blocked");
  assert.equal(result.losses[0].code, "path-collision");
});

test("unknown token semantics produce an explicit review loss", () => {
  const result = projectDesignSystemTokens(catalog({ tokens: { mystery: "var(--opaque)" } }));
  assert.equal(result.status, "review");
  assert.equal(result.losses[0].code, "type-unresolved");
});

test("projects tokens from the normalized v1 catalog entry shape", () => {
  const result = projectDesignSystemTokens(catalog({ tokens: { "color.surface": { value: "#fff", role: "color.surface.base" } } }));
  assert.equal(result.status, "ready");
  assert.equal(result.tokens.provenance.source, "https://example.test/design-system");
  assert.equal(validateTokens(result.tokens).tokenCount, 1);
});

test("adopt requires compatible React, react-dom, StyleX and admitted intake", () => {
  const base = governed({ mode: "adopt", catalog: catalog(), project: { runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } } });
  assert.equal(decideDesignSystem(base).status, "blocked");
  assert.equal(decideDesignSystem({ ...base, adapterIntake: { status: "admissible" } }).status, "ready");
  const incompatible = structuredClone(base);
  incompatible.project.runtime.react = "18.3.0";
  incompatible.adapterIntake = { status: "admissible" };
  assert.equal(decideDesignSystem(incompatible).rejected[0].reason, "runtime-incompatible");
});

test("StyleX caret ranges respect zero-major minor boundaries", () => {
  const value = catalog({ runtime: { react: "^19.0.0", reactDom: "^19.0.0", stylex: "^0.19" } });
  const request = governed({ mode: "adopt", catalog: value, adapterIntake: { status: "admitted" }, project: { runtime: { react: "19.0.0", reactDom: "19.0.0", stylex: "0.19.3" } } });
  assert.equal(decideDesignSystem(request).status, "ready");
  request.project.runtime.stylex = "0.15.4";
  assert.equal(decideDesignSystem(request).rejected[0].reason, "runtime-incompatible");
});

test("runtime comparison supports minimum and exact semantic versions", () => {
  const value = catalog({ runtime: { react: ">=19", reactDom: "19.1.0", stylex: "0.19.3" } });
  const base = governed({ mode: "adopt", catalog: value, adapterIntake: { status: "admitted" }, project: { runtime: { react: "19.2.0", reactDom: "19.1.0", stylex: "0.19.3" } } });
  assert.equal(decideDesignSystem(base).status, "ready");
  base.project.runtime.stylex = "0.19.4";
  assert.equal(decideDesignSystem(base).status, "blocked");
});

test("canary is denied by default and allowed explicitly", () => {
  const request = governed({ mode: "reference", catalog: catalog({ status: "canary" }), project: {} });
  assert.equal(decideDesignSystem(request).status, "blocked");
  assert.equal(decideDesignSystem({ ...request, allowCanary: true }).selected.status, "canary");
});

test("existing project authority is retained without short-circuiting governed modes", () => {
  const project = { designSystem: "local-system", runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } };
  const request = governed({ mode: "reference", catalog: catalog(), project });
  const first = decideDesignSystem(request);
  const second = decideDesignSystem(structuredClone(request));
  assert.equal(first.projectAuthority.id, "local-system");
  assert.equal(first.selected.id, "example:template:example-react");
  assert.deepEqual(first, second);
  const adopted = decideDesignSystem({ ...request, mode: "adopt", selection: searchSelection("adopt", request.catalog), adapterIntake: { status: "admitted" } });
  assert.equal(adopted.selected.id, "example:template:example-react");
  assert.equal(adopted.projectAuthority.id, "local-system");
  const substituted = decideDesignSystem({ ...request, mode: "substitute", selection: searchSelection("substitute", request.catalog), adapterIntake: { status: "admitted" } });
  assert.ok(substituted.rejected.some((item) => item.id === "local-system" && item.reason === "explicitly-substituted"));
});

test("known non-stable statuses are filtered per entry without poisoning the catalog", () => {
  const value = catalog({ status: "experimental", extraTemplates: [{ id: "stable-react", status: "stable", runtime: {} }] });
  assert.equal(decideDesignSystem(governed({ mode: "reference", catalog: value, project: {} })).selected.id, "example:template:stable-react");
  assert.equal(decideDesignSystem(governed({ mode: "reference", catalog: catalog({ status: "experimental" }), project: {}, allowCanary: true })).selected.status, "experimental");
  for (const status of ["deprecated", "unknown"]) {
    const result = decideDesignSystem(governed({ mode: "reference", catalog: catalog({ status }), project: {} }));
    assert.equal(result.status, "blocked");
    assert.equal(result.rejected[0].reason, `status-${status}`);
  }
});

test("unknown schemas, statuses, versions, and modes fail closed", () => {
  assert.throws(() => decideDesignSystem(governed({ mode: "invented", catalog: catalog(), project: {} })), /invalid value/);
  assert.throws(() => decideDesignSystem(governed({ schema: "future", mode: "reference", catalog: catalog(), project: {} })), /unsupported request schema/);
  assert.throws(() => decideDesignSystem(governed({ version: "2", mode: "reference", catalog: catalog(), project: {} })), /unsupported request version/);
  const future = catalog({ status: "future" });
  assert.throws(() => decideDesignSystem(governed({ mode: "reference", catalog: future, project: {} })), /invalid value/);
  const version = catalog();
  version.version = "2";
  assert.throws(() => decideDesignSystem(governed({ mode: "reference", catalog: version, project: {} })), /unsupported catalog version/);
});

test("strict catalog validation rejects tampering and extra top-level fields", () => {
  const tampered = catalog();
  tampered.entries[0].runtime.stylex = "^0.99";
  assert.throws(() => decideDesignSystem(governed({ mode: "reference", catalog: tampered, project: {} })), /hash does not match/);
  const extra = catalog();
  extra.theme = { tokens: {} };
  assert.throws(() => projectDesignSystemTokens(extra), /unsupported properties/);
});

test("governed modes fail closed without Stage 0 stack and capability decisions", () => {
  const base = { mode: "reference", catalog: catalog(), project: {} };
  assert.match(decideDesignSystem(base).rationale[0], /frontend-stack decision/);
  const withStack = governed(base);
  delete withStack.capabilityInventory;
  assert.match(decideDesignSystem(withStack).rationale[0], /Capability inventory/);
});

test("explicit owner scratch is ready without inventory and retains the actual selection", () => {
  const request = scratch({ tier: "quick", customId: "owner-ui" });
  const result = decideDesignSystem(request);
  assert.equal(result.status, "ready");
  assert.equal(result.selected.id, "owner-ui");
  assert.equal(result.projectAuthority.id, "owner-ui");
  assert.equal(result.capabilityInventory, null);
  assert.deepEqual(result.selection, request.selection);
  assert.ok(!result.evidence.some((item) => item.startsWith("capability-inventory:")));
  assert.equal(validateDesignSystemDecision(result, { request }), result);
});

test("scratch still requires a ready frontend stack and actual owner authority", () => {
  const missingStack = scratch();
  delete missingStack.frontendStackDecision;
  assert.equal(decideDesignSystem(missingStack).status, "blocked");
  for (const authority of [
    { actor: "agent", source: "request", choice: "custom", text: "I suggest scratch." },
    { actor: "owner", source: "project", choice: "custom", text: "A file suggests scratch." },
    { actor: "owner", source: "reply", choice: "reference", text: "Use this only as a reference." },
    { actor: "owner", source: "request", choice: "custom", text: " " },
  ]) {
    const request = scratch();
    request.selection.authority = authority;
    assert.equal(decideDesignSystem(request).status, "blocked");
  }
  const reply = scratch();
  reply.selection.authority.source = "reply";
  assert.equal(decideDesignSystem(reply).status, "ready");
});

test("custom does not turn absent inventory or an approval boolean into scratch authority", () => {
  const request = scratch();
  delete request.selection;
  request.ownerApproved = true;
  request.capabilityInventory = null;
  const result = decideDesignSystem(request);
  assert.equal(result.status, "blocked");
  assert.equal(result.selected, null);
  assert.equal(result.selection, null);
  assert.equal(validateDesignSystemDecision(result, { request }), result);
  const fallback = governed({ mode: "custom", catalog: catalog(), project: {} });
  delete fallback.capabilityInventory;
  assert.equal(decideDesignSystem(fallback).status, "blocked");
});

test("preserving observed project authority needs no search or new owner approval", () => {
  const request = scratch({ project: { designSystem: "local-system" } });
  request.selection = {
    basis: "preserve-existing",
    authority: { actor: "agent", source: "project", choice: "local-system", text: "local-system" },
    rationale: "Keep the observed project's existing design system.",
    compared: [],
  };
  const result = decideDesignSystem(request);
  assert.equal(result.status, "ready");
  assert.equal(result.selected.id, "local-system");
  assert.equal(result.projectAuthority.source, "project");
  assert.equal(result.capabilityInventory, null);
  assert.equal(validateDesignSystemDecision(result, { request }), result);
  const observedText = structuredClone(request);
  observedText.project.designSystem = { id: "local-system", source: "DESIGN.md", text: "Keep the product's blue brand and existing spacing scale." };
  observedText.selection.authority.text = observedText.project.designSystem.text;
  assert.equal(decideDesignSystem(observedText).status, "ready");
  const designDocument = structuredClone(request);
  designDocument.project = { designMd: "Keep the product's blue brand and existing spacing scale." };
  designDocument.selection.authority.choice = "project-design";
  designDocument.selection.authority.text = designDocument.project.designMd;
  assert.equal(decideDesignSystem(designDocument).selected.id, "project-design");
});

test("preserve-existing cannot manufacture project identity or evidence from a flag", () => {
  const request = scratch({ project: { designSystem: "local-system" } });
  request.selection = { basis: "preserve-existing", authority: { actor: "agent", source: "project", choice: "local-system", text: "local-system" }, rationale: "Retain the observed design system.", compared: [] };
  for (const mutate of [
    (value) => { value.project = {}; },
    (value) => { value.selection.authority.choice = "other-system"; },
    (value) => { value.selection.authority.text = "Invented project observation."; },
    (value) => { value.selection.authority.source = "request"; },
    (value) => { value.project = { designMd: true }; value.selection.authority.choice = "project-design"; value.selection.authority.text = "DESIGN.md"; },
  ]) {
    const invalid = structuredClone(request);
    mutate(invalid);
    assert.equal(decideDesignSystem(invalid).status, "blocked");
  }
  const contradictory = structuredClone(request);
  contradictory.customId = "replacement-system";
  assert.equal(decideDesignSystem(contradictory).status, "blocked");
});

test("searched custom fallback requires complete comparisons, compatibility and owner statement", () => {
  const request = governed({ mode: "custom", catalog: catalog(), project: {}, customId: "product-ui" });
  const result = decideDesignSystem(request);
  assert.equal(result.status, "ready");
  assert.equal(result.selected.id, "product-ui");
  assert.deepEqual(result.rejected, [{ id: "example:template:example-react", reason: "Compared the candidate's runtime and project fit." }]);
  assert.equal(validateDesignSystemDecision(result, { request }), result);
  for (const mutate of [
    (value) => { delete value.selection.compatibility; },
    (value) => { value.selection.compared = []; },
    (value) => { delete value.selection.compared[0].reason; },
    (value) => { value.selection.rationale = ""; },
    (value) => { value.selection.authority.text = ""; },
    (value) => { value.selection.authority.actor = "agent"; },
    (value) => { value.selection.authority.source = "project"; },
    (value) => { value.selection.authority.choice = "reference"; },
  ]) {
    const invalid = structuredClone(request);
    mutate(invalid);
    assert.equal(decideDesignSystem(invalid).status, "blocked");
  }
});

test("reference research authority does not silently authorize fallback or substitution", () => {
  const value = catalog();
  const reference = governed({ mode: "reference", catalog: value, project: { designSystem: "local-system", runtime: { react: "18.3.0" } } });
  const result = decideDesignSystem(reference);
  assert.equal(result.status, "ready");
  assert.equal(result.projectAuthority.id, "local-system");
  assert.ok(result.rationale.includes("Selected as a non-runtime reference."));
  assert.equal(result.selection.authority.actor, "agent");
  for (const mode of ["adopt", "substitute", "custom"]) {
    assert.equal(decideDesignSystem({ ...reference, mode, adapterIntake: { status: "admitted" } }).status, "blocked");
  }
  const custom = governed({ mode: "custom", catalog: value, project: {} });
  custom.selection.authority = { ...custom.selection.authority, actor: "agent" };
  assert.equal(decideDesignSystem(custom).status, "blocked");
  const substitute = governed({ mode: "substitute", catalog: value, project: {}, adapterIntake: { status: "admitted" } });
  substitute.selection.authority.actor = "agent";
  assert.equal(decideDesignSystem(substitute).status, "blocked");
});

test("ordinary adoption retains agent selection while enforcing runtime and intake", () => {
  const request = governed({ mode: "adopt", catalog: catalog(), project: { runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } }, adapterIntake: { status: "admitted" } });
  const result = decideDesignSystem(request);
  assert.equal(result.status, "ready");
  assert.equal(result.selection.authority.actor, "agent");
  assert.equal(validateDesignSystemDecision(result, { request }), result);
});

test("unknown supplied candidate identities are clarified rather than translated", () => {
  const request = governed({ mode: "reference", catalog: catalog(), project: {}, candidateId: "familiar-ui" });
  assert.throws(() => decideDesignSystem(request), /unknown or ambiguous catalog candidate.*clarify/);
  const compared = governed({ mode: "custom", catalog: catalog(), project: {} });
  compared.selection.compared[0].id = "familiar-ui";
  assert.throws(() => decideDesignSystem(compared), /unknown compared candidate/);
  const contradictory = scratch({ candidateId: "example:template:example-react" });
  assert.equal(decideDesignSystem(contradictory).status, "blocked");
});

test("inventory replays actual catalog hashes, options, terms, counts and complete matched ids", () => {
  const request = governed({ mode: "reference", catalog: catalog(), project: {} });
  assert.equal(decideDesignSystem(request).status, "ready");
  for (const [mutate, message] of [
    [(value) => { value.catalogHash = "b".repeat(64); }, /catalogHash/],
    [(value) => { delete value.searchOptions; }, /missing searchOptions/],
    [(value) => { value.searchOptions.query = "no hits"; }, /unsupported properties/],
    [(value) => { value.directQueryResults = 0; }, /directQueryResults/],
    [(value) => { value.directMatchedIds = []; }, /directMatchedIds/],
    [(value) => { value.capabilityResults["app-shell"].count = 0; }, /count/],
    [(value) => { value.capabilityResults["app-shell"].terms = ["unsearched phrase"]; }, /terms/],
    [(value) => { value.capabilityResults["app-shell"].matchedIds = []; }, /matchedIds/],
    [(value) => { value.capabilityResults["app-shell"].matchedIds = ["example:template:invented"]; }, /matchedIds/],
    [(value) => { value.capabilityResults.extra = { terms: [], count: 0, matchedIds: [] }; }, /searched capabilities/],
    [(value) => { value.searchedCapabilities = ["invented"]; }, /unknown capability/],
    [(value) => { value.zeroResultInconclusive = true; }, /contradicts/],
  ]) {
    const invalid = structuredClone(request);
    mutate(invalid.capabilityInventory);
    assert.throws(() => decideDesignSystem(invalid), message);
  }
});

test("inventory accepts identified decomposer objects without trusting fabricated terms", () => {
  const value = catalog();
  const request = governed({ mode: "reference", catalog: value, project: {}, capabilityInventory: inventory(value, "app shell", [{ capability: "app-shell", score: 2 }]) });
  assert.equal(decideDesignSystem(request).status, "ready");
  request.capabilityInventory.searchedCapabilities = [{ id: "app-shell" }];
  assert.equal(decideDesignSystem(request).status, "ready");
  request.capabilityInventory.searchedCapabilities = [{ id: "app-shell", capability: "dialog" }];
  assert.throws(() => decideDesignSystem(request), /contradictory identities/);
  request.capabilityInventory.searchedCapabilities = [{ capability: "app-shell", terms: ["invented search"] }];
  assert.throws(() => decideDesignSystem(request), /catalog search terms/);
});

test("truncating true searches at fifty ids cannot masquerade as complete inventory", () => {
  const value = catalog({ extraTemplates: Array.from({ length: 51 }, (_, index) => ({ id: `shell-${index}`, name: `App shell ${index}`, runtime: {} })) });
  const request = governed({ mode: "reference", catalog: value, project: {} });
  assert.ok(request.capabilityInventory.capabilityResults["app-shell"].count > 50);
  assert.equal(decideDesignSystem(request).status, "ready");
  request.capabilityInventory.capabilityResults["app-shell"].matchedIds = request.capabilityInventory.capabilityResults["app-shell"].matchedIds.slice(0, 50);
  assert.throws(() => decideDesignSystem(request), /matchedIds/);
});

test("truthful bounded searches remain useful but cannot establish unsearched fallback exhaustion", () => {
  const value = catalog({ extraTemplates: [{ id: "second-shell", name: "App shell", runtime: {} }] });
  const bounded = inventory(value, "app shell", ["app-shell"], { limit: 1 });
  const reference = governed({ mode: "reference", catalog: value, project: {}, capabilityInventory: bounded });
  assert.equal(decideDesignSystem(reference).status, "ready");
  const fallback = governed({ mode: "custom", catalog: value, project: {}, capabilityInventory: bounded });
  assert.equal(decideDesignSystem(fallback).status, "blocked");
  assert.ok(decideDesignSystem(fallback).rationale.some((item) => /Bounded or filtered/.test(item)));
  const filtered = inventory(value, "app shell", ["app-shell"], { status: "experimental" });
  assert.equal(decideDesignSystem(governed({ mode: "custom", catalog: value, project: {}, capabilityInventory: filtered })).status, "blocked");
});

test("real research-console product miss is inconclusive against actual Astryx capability hits", () => {
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/astryx-design-system-snapshot.json"), "utf8"));
  const value = normalizeSnapshot(snapshot);
  const brief = "Research console with app shell, command palette, side nav, data table, progress, dialog and tabs";
  const capabilities = decomposeCapabilities(brief, { minScore: 1, allowPartialWords: false });
  for (const id of ["app-shell", "command-palette", "side-nav", "data-table", "progress", "dialog", "tabs"]) assert.ok(capabilities.includes(id), id);
  const actual = inventory(value, "research console", capabilities);
  assert.equal(actual.directQueryResults, 0);
  for (const id of capabilities) assert.ok(actual.capabilityResults[id].count > 0, id);
  const request = governed({ mode: "custom", catalog: value, project: {}, brief, capabilityInventory: actual });
  const unsearched = structuredClone(request);
  delete unsearched.capabilityInventory;
  assert.equal(decideDesignSystem(unsearched).status, "blocked");
  const uncompared = structuredClone(request);
  uncompared.selection.compared = [{ id: "astryx:component:AlertDialog", reason: "Compared only one overlay." }];
  const missing = decideDesignSystem(uncompared);
  assert.equal(missing.status, "blocked");
  assert.ok(missing.evidence.includes("zero-result-inconclusive"));
  const complete = decideDesignSystem(request);
  assert.equal(complete.status, "ready");
  assert.equal(validateDesignSystemDecision(complete, { request }), complete);
  const forged = structuredClone(request);
  for (const item of Object.values(forged.capabilityInventory.capabilityResults)) { item.count = 0; item.matchedIds = []; }
  forged.capabilityInventory.zeroResultInconclusive = false;
  assert.throws(() => decideDesignSystem(forged), /count does not match/);
  const omitted = structuredClone(request);
  omitted.capabilityInventory = inventory(value, "research console", ["dialog"]);
  assert.equal(decideDesignSystem(omitted).status, "blocked");
  assert.ok(decideDesignSystem(omitted).rationale.some((item) => /omits capabilities/.test(item)));
});

test("decision replay rejects edits to every authoritative output field", () => {
  const request = governed({ mode: "reference", catalog: catalog(), project: { designSystem: "local-system" } });
  const result = decideDesignSystem(request);
  assert.equal(validateDesignSystemDecision(result, { request }), result);
  for (const mutate of [
    (value) => { value.status = "review"; },
    (value) => { value.mode = "adopt"; },
    (value) => { value.projectAuthority.id = "invented"; },
    (value) => { value.selected.id = "invented"; },
    (value) => { value.selected.sourceHash = "b".repeat(64); },
    (value) => { value.rejected = [{ id: "invented", reason: "invented" }]; },
    (value) => { value.rationale = ["Forged ready decision."]; },
    (value) => { value.evidence = []; },
    (value) => { value.frontendStackDecision.registryHash = "b".repeat(64); },
    (value) => { value.capabilityInventory.directQueryResults = 0; },
    (value) => { value.selection.authority.text = "A fabricated replacement statement."; },
  ]) {
    const edited = structuredClone(result);
    mutate(edited);
    assert.throws(() => validateDesignSystemDecision(edited, { request }), /does not match replay/);
  }
});

test("forged-ready decisions cannot bypass missing stack, intake, or runtime evidence", () => {
  const requests = [
    { ...scratch(), frontendStackDecision: null },
    governed({ mode: "adopt", catalog: catalog(), project: { runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } } }),
    governed({ mode: "adopt", catalog: catalog(), adapterIntake: { status: "admitted" }, project: { runtime: { react: "18.3.0", reactDom: "18.3.0", stylex: "0.15.4" } } }),
  ];
  for (const request of requests) {
    const result = decideDesignSystem(request);
    assert.equal(result.status, "blocked");
    result.status = "ready";
    result.selected = { id: "example:template:example-react", status: "stable", sourceHash: request.catalog.entries[0].hash };
    result.selection = request.selection;
    assert.throws(() => validateDesignSystemDecision(result, { request }), /does not match replay/);
  }
});

test("published request can replay while supplied current request takes precedence", () => {
  const request = scratch();
  const published = {
    ...decideDesignSystem(request),
    request: structuredClone(request),
    sourceBindings: { requestPath: "request.json", inputHashes: { "request.json": `sha256:${"a".repeat(64)}`, "stack.json": `sha256:${"b".repeat(64)}` } },
  };
  assert.equal(validateDesignSystemDecision(published), published);
  const current = structuredClone(request);
  current.selection.authority.text = "The current owner statement differs from the published selection.";
  assert.throws(() => validateDesignSystemDecision(published, { request: current }), /does not match replay/);
  assert.throws(() => validateDesignSystemDecision(decideDesignSystem(request)), /resolved request/);
  assert.throws(() => validateDesignSystemDecision({ ...published, approved: true }), /unsupported properties/);
});

test("publication binding shape never treats malformed hashes or paths as authority", () => {
  const request = scratch();
  const published = { ...decideDesignSystem(request), request, sourceBindings: { requestPath: "request.json", inputHashes: { "request.json": `sha256:${"a".repeat(64)}` } } };
  for (const mutate of [
    (value) => { value.sourceBindings.requestPath = "../request.json"; },
    (value) => { value.sourceBindings.inputHashes["request.json"] = "a".repeat(64); },
    (value) => { value.sourceBindings.inputHashes = {}; },
    (value) => { value.sourceBindings.inputHashes["C:/request.json"] = `sha256:${"a".repeat(64)}`; },
  ]) {
    const invalid = structuredClone(published);
    mutate(invalid);
    assert.throws(() => validateDesignSystemDecision(invalid), /relative path|sha256-prefixed|hash the request/);
  }
});

test("preservation matches the governing project system rather than an alternate declaration", () => {
  const request = scratch({ project: { designSystem: "local-system", existingDesignSystem: "alternate-system", designMd: "An unrelated design document." } });
  request.selection = { basis: "preserve-existing", authority: { actor: "agent", source: "project", choice: "local-system", text: "alternate-system" }, rationale: "Retain the governing project system.", compared: [] };
  assert.equal(decideDesignSystem(request).status, "blocked");
  request.selection.authority.text = "An unrelated design document.";
  assert.equal(decideDesignSystem(request).status, "blocked");
  request.selection.authority.text = "local-system";
  assert.equal(decideDesignSystem(request).status, "ready");
  request.project.designSystem = { source: "DESIGN.md", text: "The system's identity is not resolved." };
  assert.throws(() => decideDesignSystem(request), /identity is missing or ambiguous/);
});

test("unrelated comparison prose does not stand in for actual searched candidates", () => {
  const value = catalog();
  const request = governed({ mode: "custom", catalog: value, project: {}, capabilityInventory: inventory(value, "research console", ["dialog"]) });
  const result = decideDesignSystem(request);
  assert.equal(result.status, "blocked");
  assert.ok(result.rationale.some((item) => /actual searched candidates/.test(item)));
});

test("substitution compares its actual selected candidate and preserves version and intake gates", () => {
  const value = catalog({ extraTemplates: [{ id: "aaa-other", name: "Other UI", runtime: {} }] });
  const request = governed({ mode: "substitute", catalog: value, candidateId: "example:template:aaa-other", project: { designSystem: "local-system" }, adapterIntake: { status: "admitted" } });
  request.selection.compared = [{ id: "example:template:example-react", reason: "Compared the actual app-shell search hit." }];
  const missing = decideDesignSystem(request);
  assert.equal(missing.status, "blocked");
  assert.ok(missing.rationale.some((item) => /actual comparison of the selected/.test(item)));
  request.selection.compared.push({ id: "example:template:aaa-other", reason: "Compared the owner's explicitly requested candidate." });
  assert.equal(decideDesignSystem(request).status, "ready");
  const canary = governed({ mode: "substitute", catalog: catalog({ status: "canary" }), project: { designSystem: "local-system", runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } }, adapterIntake: { status: "admitted" } });
  assert.ok(decideDesignSystem(canary).rejected.some((item) => item.reason === "prerelease-not-allowed"));
  canary.allowCanary = true;
  assert.equal(decideDesignSystem(canary).status, "ready");
  canary.adapterIntake.status = "review";
  assert.ok(decideDesignSystem(canary).rejected.some((item) => item.reason === "adapter-intake-not-admitted"));
  canary.adapterIntake.status = "admitted";
  canary.project.runtime.reactDom = "18.3.0";
  assert.ok(decideDesignSystem(canary).rejected.some((item) => item.reason === "runtime-incompatible"));
});
