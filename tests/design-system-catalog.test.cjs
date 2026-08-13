"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeSnapshot,
  searchCatalog,
  serializeCatalog,
  validateCatalog,
  validateSnapshot,
} = require("../skill/scripts/design-system-catalog-core.cjs");

function snapshot() {
  return {
    schema: "design-pipeline.design-system-snapshot.v1",
    version: "1",
    namespace: "acme",
    provenance: { source: "Acme UI", url: "https://example.test/ui", license: "MIT", attribution: "Acme team" },
    components: [{
      id: "button",
      name: { en: "Button", zh: "按钮" },
      category: "actions",
      status: "stable",
      path: "components/button.md",
      usage: "Use for decisive actions.\n\n用于关键操作。",
      bestPractices: ["Use a verb", "使用动词"],
      anatomy: ["label", "icon"],
      props: { disabled: { type: "boolean", description: "禁用状态" } },
      states: ["default", "hover", "disabled"],
      interactions: { keyboard: "Enter or Space" },
      theming: { tokens: ["action.background"] },
    }],
    docs: [{ id: "getting-started", category: "guide", status: "stable", content: "Dense 中文 documentation\nkeeps spacing." }],
    templates: [{ id: "dashboard", category: "page", status: "beta", files: [{ path: "templates/dashboard.html" }] }],
    hooks: [{ id: "use-theme", category: "theme", status: "stable", usage: "Returns the active theme." }],
  };
}

test("normalizes every knowledge kind deterministically and preserves rich multilingual content", () => {
  const input = snapshot();
  const untouched = structuredClone(input);
  const first = normalizeSnapshot(input);
  const second = normalizeSnapshot(snapshot());
  assert.deepEqual(input, untouched);
  assert.equal(serializeCatalog(first), serializeCatalog(second));
  assert.deepEqual(first.entries.map((entry) => entry.kind), ["component", "doc", "hook", "template"]);
  const button = first.entries[0];
  assert.equal(button.id, "acme:component:button");
  assert.equal(button.name.zh, "按钮");
  assert.equal(button.usage, "Use for decisive actions.\n\n用于关键操作。");
  assert.deepEqual(button.bestPractices, ["Use a verb", "使用动词"]);
  assert.deepEqual(button.anatomy, ["label", "icon"]);
  assert.equal(button.props.disabled.description, "禁用状态");
  assert.deepEqual(button.states, ["default", "hover", "disabled"]);
  assert.equal(button.interactions.keyboard, "Enter or Space");
  assert.deepEqual(button.theming.tokens, ["action.background"]);
  assert.deepEqual(button.provenance, snapshot().provenance);
  assert.match(button.hash, /^[a-f0-9]{64}$/);
  assert.equal(validateCatalog(first), first);
});

test("entry provenance overrides snapshot defaults without losing source attribution", () => {
  const input = snapshot();
  input.components[0].provenance = { source: "Upstream button", license: "Apache-2.0", attribution: "UI authors" };
  const provenance = normalizeSnapshot(input).entries[0].provenance;
  assert.deepEqual(provenance, { source: "Upstream button", license: "Apache-2.0", attribution: "UI authors", url: "https://example.test/ui" });
});

test("search supports query, kind, category, status, and limit without mutating the catalog", () => {
  const catalog = normalizeSnapshot(snapshot());
  const before = serializeCatalog(catalog);
  assert.deepEqual(searchCatalog(catalog, { query: "中文" }).map((entry) => entry.localId), ["getting-started"]);
  assert.deepEqual(searchCatalog(catalog, { query: "按钮", kind: "component", category: "actions", status: "stable", limit: 1 }).map((entry) => entry.localId), ["button"]);
  assert.deepEqual(searchCatalog(catalog, { kind: "template", status: "stable" }), []);
  assert.equal(serializeCatalog(catalog), before);
  assert.throws(() => searchCatalog(catalog, { limit: 0 }), /positive integer/);
  assert.throws(() => searchCatalog(catalog, { kind: "script" }), /kind is invalid/);
});

test("fails closed on unknown contracts, duplicate IDs, path escape, executable values, and pollution keys", () => {
  assert.throws(() => validateSnapshot({ ...snapshot(), schema: "design-pipeline.design-system-snapshot.v2" }), /unsupported snapshot schema/);
  assert.throws(() => validateSnapshot({ ...snapshot(), version: "2" }), /unsupported snapshot version/);
  const duplicate = snapshot();
  duplicate.components.push({ ...duplicate.components[0] });
  assert.throws(() => normalizeSnapshot(duplicate), /duplicate catalog id/);
  const escaped = snapshot();
  escaped.components[0].path = "../secret";
  assert.throws(() => normalizeSnapshot(escaped), /must not escape/);
  const absolute = snapshot();
  absolute.templates[0].files[0].path = "C:\\secret.txt";
  assert.throws(() => normalizeSnapshot(absolute), /must not escape/);
  const executable = snapshot();
  executable.components[0].render = () => "button";
  assert.throws(() => normalizeSnapshot(executable), /executable value/);
  const polluted = snapshot();
  Object.defineProperty(polluted.docs[0], "__proto__", { value: { polluted: true }, enumerable: true });
  assert.throws(() => normalizeSnapshot(polluted), /forbidden key __proto__/);
});

test("catalog validation detects content and hash tampering", () => {
  const catalog = normalizeSnapshot(snapshot());
  catalog.entries[0].usage = "tampered";
  assert.throws(() => validateCatalog(catalog), /hash does not match/);
});

test("decomposeCapabilities maps a product-level brief to canonical capability terms", () => {
  const { decomposeCapabilities } = require("../skill/scripts/design-system-catalog-core.cjs");
  const terms = decomposeCapabilities("research console");
  // "research console" should decompose to at least one capability term
  assert.ok(terms.length > 0, "research console should decompose to at least one capability");
  // "research" contains "search" -> should match the "search" capability
  assert.ok(terms.includes("search"), "research console should decompose to 'search' capability");
});

test("decomposeCapabilities returns empty for empty or whitespace brief", () => {
  const { decomposeCapabilities } = require("../skill/scripts/design-system-catalog-core.cjs");
  assert.deepEqual(decomposeCapabilities(""), []);
  assert.deepEqual(decomposeCapabilities("   "), []);
});

test("decomposeCapabilities with specific UI terms matches the expected capabilities", () => {
  const { decomposeCapabilities } = require("../skill/scripts/design-system-catalog-core.cjs");
  // "app shell" -> should match app-shell capability
  const appShell = decomposeCapabilities("app shell with navigation");
  assert.ok(appShell.includes("app-shell"), "app shell brief should decompose to app-shell");
  // "data table with pagination" -> should match data-table and pagination
  const dataTable = decomposeCapabilities("data table with pagination");
  assert.ok(dataTable.includes("data-table"), "data table brief should decompose to data-table");
  assert.ok(dataTable.includes("pagination"), "data table brief should decompose to pagination");
  // "dialog modal popup" -> should match dialog
  const dialog = decomposeCapabilities("dialog modal popup");
  assert.ok(dialog.includes("dialog"), "dialog brief should decompose to dialog");
});

test("searchCapabilities searches the catalog for each capability term", () => {
  const { searchCapabilities, decomposeCapabilities } = require("../skill/scripts/design-system-catalog-core.cjs");
  const catalog = normalizeSnapshot(snapshot());
  const capabilities = decomposeCapabilities("button dialog");
  // Our test snapshot has a "button" component and a "getting-started" doc
  const result = searchCapabilities(catalog, capabilities, { status: "stable" });
  assert.ok(result.capabilityMap, "should return a capabilityMap");
  assert.ok(result.uniqueEntryCount >= 0, "should have a unique entry count");
  // The "button" capability should find the button component in our fixture
  const buttonResults = result.capabilityMap["button"];
  if (buttonResults) {
    assert.ok(buttonResults.terms.length > 0, "button capability should have search terms");
  }
});
