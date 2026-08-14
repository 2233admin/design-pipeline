"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  decomposeComponentBrief,
  inventoryProjectComponents,
  bindComponentResolution,
  decideComponentBindings,
  probeComponentProviders,
  resolveComponentCapabilities,
  validateCapabilityRegistry,
  validateProviderRegistry,
  verifyComponentReceipt,
} = require("../skill/scripts/component-capability-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const capabilities = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/component-capabilities.json"), "utf8"));
const providers = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/component-providers.json"), "utf8"));

function project(manifest = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "component-capability-"));
  fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify({ name: "fixture", private: true, ...manifest }, null, 2)}\n`);
  return root;
}

test("validates the governed capability and provider registries", () => {
  assert.equal(validateCapabilityRegistry(capabilities), capabilities);
  assert.equal(validateProviderRegistry(providers, capabilities), providers);
  assert.throws(() => validateProviderRegistry({ ...providers, providers: [{ ...providers.providers[0], capabilities: ["unknown"] }] }, capabilities), /unknown capability/);
});

test("decomposes a data-grid brief and closes accessibility dependencies", () => {
  const inventory = decomposeComponentBrief("支持筛选、排序、分页和多选的数据表格", capabilities);
  assert.equal(inventory.status, "ready");
  assert.deepEqual(inventory.components, ["data-grid"]);
  for (const id of ["data.grid", "data.filtering", "data.sorting", "data.pagination", "selection.multiple", "keyboard.navigation", "focus.management", "aria.control-semantics", "state.loading", "state.empty", "state.error"]) assert.ok(inventory.capabilities.includes(id), id);
  assert.ok(inventory.requiredChecks.includes("aria-sort"));
  assert.ok(inventory.requiredChecks.includes("selection-announcement"));
});

test("provider probing is read-only and detects project-pinned packages", () => {
  const root = project({ dependencies: { "@vuetify/v0": "1.0.0" } });
  const probe = probeComponentProviders(root, providers, capabilities, "vue");
  const vuetify = probe.providers.find(({ id }) => id === "vuetify0");
  assert.equal(vuetify.activation, "installed");
  assert.deepEqual(vuetify.installedPackages, ["@vuetify/v0"]);
  assert.equal(fs.readFileSync(path.join(root, "package.json"), "utf8").includes("1.0.0"), true);
});

test("resolution prefers installed framework providers and preserves project fallback", () => {
  const vueRoot = project({ dependencies: { "@vuetify/v0": "1.0.0" } });
  const request = { schema: "design-pipeline.component-resolution-request.v1", framework: "vue", brief: "筛选、分页和多选的数据表格" };
  const installed = resolveComponentCapabilities(request, vueRoot, capabilities, providers);
  assert.equal(installed.status, "ready");
  assert.equal(installed.routes.find(({ capability }) => capability === "data.pagination").provider, "vuetify0");
  assert.equal(installed.routes.find(({ capability }) => capability === "state.loading").provider, "project-dom");
  assert.equal(installed.missingCapabilities.length, 0);

  const plain = resolveComponentCapabilities(request, project(), capabilities, providers);
  assert.ok(plain.routes.every(({ provider }) => provider === "project-dom"));
  assert.ok(plain.constraints.some((value) => value.includes("never installs")));
});

test("explicit provider preference can produce an adoption-required candidate route", () => {
  const resolution = resolveComponentCapabilities({
    schema: "design-pipeline.component-resolution-request.v1",
    framework: "react",
    capabilities: ["overlay.dialog"],
    preferredProviders: ["react-aria"],
  }, project(), capabilities, providers);
  assert.equal(resolution.status, "ready");
  assert.ok(resolution.routes.some(({ provider, adoptionRequired }) => provider === "react-aria" && adoptionRequired));
  assert.throws(() => resolveComponentCapabilities({
    schema: "design-pipeline.component-resolution-request.v1",
    framework: "react",
    capabilities: ["overlay.dialog"],
    preferredProviders: ["typo-provider"],
  }, project(), capabilities, providers), /unknown preferred provider/);
});

test("verification is hash-bound and fails closed on missing evidence", () => {
  const resolution = resolveComponentCapabilities({ schema: "design-pipeline.component-resolution-request.v1", framework: "solid", capabilities: ["selection.multiple"] }, project(), capabilities, providers);
  const blocked = verifyComponentReceipt(resolution, { schema: "design-pipeline.component-verification-receipt.v1", resolutionHash: resolution.resolutionHash, checks: [] });
  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.missing.length > 0);

  const receipt = {
    schema: "design-pipeline.component-verification-receipt.v1",
    resolutionHash: resolution.resolutionHash,
    checks: resolution.requiredChecks.map((id) => ({ id, status: "pass", evidence: [`playwright:${id}`] })),
  };
  const verified = verifyComponentReceipt(resolution, receipt);
  assert.equal(verified.status, "verified");
  assert.equal(verified.passed.length, resolution.requiredChecks.length);
  assert.throws(() => verifyComponentReceipt(resolution, { ...receipt, resolutionHash: "0".repeat(64) }), /does not match/);
});

test("public component CLI exposes decompose, providers, resolve, and verify", () => {
  const root = project({ dependencies: { "react-aria-components": "1.0.0" } });
  const decompose = execute(["component", "decompose", "--root", root, "--query", "paginated multi-select data table", "--json"]);
  assert.equal(decompose.exitCode, 0);
  assert.equal(decompose.output.inventory.schema, "design-pipeline.component-capability.v1");

  const probe = execute(["component", "providers", "--root", root, "--framework", "react", "--json"]);
  assert.equal(probe.exitCode, 0);
  assert.equal(probe.output.probe.providers.find(({ id }) => id === "react-aria").activation, "installed");

  fs.writeFileSync(path.join(root, "request.json"), JSON.stringify({ schema: "design-pipeline.component-resolution-request.v1", framework: "react", capabilities: ["overlay.dialog"] }));
  const resolved = execute(["component", "resolve", "--root", root, "--artifact", "request.json", "--write", "--output", "resolution.json", "--json"]);
  assert.equal(resolved.exitCode, 0);
  const resolution = JSON.parse(fs.readFileSync(path.join(root, "resolution.json"), "utf8"));
  fs.writeFileSync(path.join(root, "receipt.json"), JSON.stringify({ schema: "design-pipeline.component-verification-receipt.v1", resolutionHash: resolution.resolutionHash, checks: resolution.requiredChecks.map((id) => ({ id, status: "pass", evidence: [`browser:${id}`] })) }));
  const verified = execute(["component", "verify", "--root", root, "--artifact", "resolution.json", "--receipt", "receipt.json", "--json"]);
  assert.equal(verified.exitCode, 0);
  assert.equal(verified.output.status, "verified");
});

test("inventory exposes project components without inventing capabilities", () => {
  const root = project();
  fs.mkdirSync(path.join(root, "src/components"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/components/DataTable.vue"), "<template><table /></template>");
  fs.writeFileSync(path.join(root, "src/components/Dialog.vue"), "<template><dialog /></template>");
  const inventory = inventoryProjectComponents(root, "vue");
  assert.equal(inventory.schema, "design-pipeline.component-inventory.v1");
  assert.deepEqual(inventory.components.map(({ id }) => id), ["DataTable", "Dialog"]);
  assert.ok(inventory.components.every(({ capabilities: ids }) => ids.length === 0));
});

test("binding plan maps resolution routes to framework bindings without generating source", () => {
  const root = project({ dependencies: { "@vuetify/v0": "1.0.0" } });
  const resolution = resolveComponentCapabilities({ schema: "design-pipeline.component-resolution-request.v1", framework: "vue", capabilities: ["data.pagination"] }, root, capabilities, providers);
  const inventory = inventoryProjectComponents(root, "vue");
  const plan = bindComponentResolution(resolution, inventory, providers);
  assert.equal(plan.schema, "design-pipeline.component-binding-plan.v1");
  assert.equal(plan.bindings.find(({ capability }) => capability === "data.pagination").binding, "vue-composable");
  assert.equal(plan.generatedFiles.length, 0);
});

test("decisions distinguish reuse, adopt, and custom per capability", () => {
  const root = project();
  fs.mkdirSync(path.join(root, "src/components"), { recursive: true });
  fs.writeFileSync(path.join(root, "src/components/Dialog.tsx"), "export function Dialog() {}");
  fs.writeFileSync(path.join(root, "component-capabilities.json"), JSON.stringify({ Dialog: ["overlay.dialog"] }));
  const inventory = inventoryProjectComponents(root, "react");
  const resolution = resolveComponentCapabilities({ schema: "design-pipeline.component-resolution-request.v1", framework: "react", capabilities: ["overlay.dialog"] }, root, capabilities, providers);
  const plan = bindComponentResolution(resolution, inventory, providers);
  const decision = decideComponentBindings(plan, inventory);
  assert.equal(decision.schema, "design-pipeline.component-binding-decision.v1");
  assert.equal(decision.decisions.find(({ capability }) => capability === "overlay.dialog").action, "reuse");
  assert.ok(decision.decisions.some(({ action }) => action === "custom"));
});
