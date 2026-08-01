"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  acquireDesignSystemProvider,
  loadProfiles,
  runProviderCommand,
} = require("../skill/scripts/design-system-provider-core.cjs");
const { validateSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");

const fixture = path.resolve(__dirname, "fixtures", "design-system-provider", "fake-adapter.js");
const officialFixture = path.resolve(__dirname, "fixtures", "design-system-provider", "fake-astryx-cli.mjs");

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-system-provider-"));
  fs.copyFileSync(fixture, path.join(root, "adapter.js"));
  return root;
}

function workspaceWithAstryxCli() {
  const root = workspace();
  const cli = path.join(root, "node_modules", "@astryxdesign", "cli", "clients", "cli", "bin", "astryx.mjs");
  fs.mkdirSync(path.dirname(cli), { recursive: true });
  fs.copyFileSync(officialFixture, cli);
  return { root, cli };
}

test("Astryx profile pins its official and compatibility contract", () => {
  const profile = loadProfiles().profiles.find(({ id }) => id === "astryx");
  assert.deepEqual(profile, {
    id: "astryx",
    name: "Astryx",
    officialUrl: "https://astryx.atmeta.com/",
    repositoryUrl: "https://github.com/facebook/astryx",
    license: "MIT",
    apiVersions: ["1"],
    compatibility: { react: ">=19", "react-dom": ">=19", "@stylexjs/stylex": "^0.19" },
    canary: { default: "deny" },
  });
});

test("local adapter acquisition is deterministic and records generic collections and hashes", () => {
  const root = workspace();
  const options = { root, adapterPath: "adapter.js", providerId: "astryx", apiVersion: "1" };
  const first = acquireDesignSystemProvider(options);
  const second = acquireDesignSystemProvider(options);
  assert.deepEqual(second, first);
  assert.equal(first.status, "complete");
  assert.equal(validateSnapshot(first.snapshot), first.snapshot);
  assert.deepEqual(first.snapshot.components.map(({ id }) => id), ["button"]);
  assert.deepEqual(first.snapshot.docs.find(({ id }) => id === "environment").value.leaked, []);
  assert.equal(first.snapshot.provenance.license, "MIT");
  assert.equal(first.snapshot.docs[0].id, "provider-manifest");
  assert.deepEqual(first.snapshot.docs[0].runtime, { react: ">=19", "react-dom": ">=19", "@stylexjs/stylex": "^0.19" });
  assert.equal(first.receipt.commands.length, 5);
  assert.match(first.receipt.snapshotSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.receipt.loss, ["interactive examples are represented as text"]);
});

test("bundled Astryx adapter discovers the local official CLI and translates only read-only commands", () => {
  const { root, cli } = workspaceWithAstryxCli();
  const log = path.join(root, "astryx-commands.jsonl");
  const result = acquireDesignSystemProvider({ root, env: { PATH: process.env.PATH, FAKE_ASTRYX_LOG: log } });
  assert.equal(result.status, "complete");
  assert.equal(result.receipt.provider.version, "0.2.0");
  assert.equal(validateSnapshot(result.snapshot), result.snapshot);
  assert.equal(result.snapshot.components[0].id, "Button");
  assert.deepEqual([
    result.snapshot.components[0].status,
    result.snapshot.docs.find(({ id }) => id === "getting-started").status,
    result.snapshot.templates[0].status,
    result.snapshot.hooks[0].status,
  ], ["stable", "stable", "stable", "stable"]);
  assert.equal(result.snapshot.components[0].docsZh.docs, "操作按钮");
  assert.equal(result.snapshot.components[0].docsZh.usage, "用于关键操作。");
  assert.deepEqual(result.snapshot.components[0].docsZh.props, { disabled: { type: "boolean" } });
  assert.deepEqual(result.snapshot.components[0].docsZh.theming, { tokens: ["action.background"] });
  assert.equal(result.snapshot.components[0].docsDense.docs, "Button dense reference");
  assert.equal(result.snapshot.hooks[0].docsZh.docs, "控制对话框。");
  assert.deepEqual(result.snapshot.hooks[0].docsZh.props, { modal: { type: "boolean" } });
  const docs = result.snapshot.docs.find(({ id }) => id === "getting-started");
  assert.equal(docs.docsZh.content, "入门指南");
  assert.equal(docs.docsZh.usage, "先安装主题。");
  assert.deepEqual(docs.docsZh.sections, [{ name: "Install", content: "入门指南" }]);
  assert.equal(docs.docsDense.content, "Dense guidance");
  assert.equal(result.snapshot.templates[0].id, "Dashboard");
  assert.equal(result.receipt.providerCliSha256, crypto.createHash("sha256").update(fs.readFileSync(cli)).digest("hex"));
  assert.deepEqual(fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse), [
    ["manifest", "--json"],
    ["component", "--list", "--detail", "full", "--json"],
    ["component", "--list", "--detail", "full", "--zh", "--json"],
    ["component", "--list", "--detail", "full", "--dense", "--json"],
    ["docs", "--json"],
    ["docs", "getting-started", "--json"],
    ["docs", "getting-started", "--zh", "--json"],
    ["docs", "getting-started", "--dense", "--json"],
    ["template", "--list", "--json"],
    ["hook", "--list", "--detail", "full", "--json"],
    ["hook", "--list", "--detail", "full", "--zh", "--json"],
    ["hook", "--list", "--detail", "full", "--dense", "--json"],
  ]);
});

test("bundled Astryx adapter requires a contained local official CLI", () => {
  const root = workspace();
  assert.equal(acquireDesignSystemProvider({ root }).receipt.failures[0].code, "PATH_INVALID");
  assert.equal(acquireDesignSystemProvider({ root, providerCliPath: officialFixture }).receipt.failures[0].code, "PATH_INVALID");
});

test("bundled Astryx adapter rejects mutating commands before invoking the official CLI", () => {
  const { root } = workspaceWithAstryxCli();
  const log = path.join(root, "astryx-commands.jsonl");
  for (const type of ["init", "swizzle", "upgrade", "theme-build", "agent-docs"]) {
    assert.throws(() => runProviderCommand({ root, type, env: { PATH: process.env.PATH, FAKE_ASTRYX_LOG: log } }), { code: "COMMAND_DENIED" });
  }
  assert.equal(fs.existsSync(log), false);
});

test("custom adapters fail closed on prerelease status in every collection", () => {
  const plural = { component: "components", docs: "docs", template: "templates", hook: "hooks" };
  for (const type of Object.keys(plural)) {
    const root = workspace();
    const result = acquireDesignSystemProvider({ root, adapterPath: "adapter.js", selections: { [type]: [`${type}-beta`] } });
    assert.equal(result.status, "failed");
    assert.equal(result.snapshot, null);
    assert.equal(Object.hasOwn(result, "catalog"), false);
    assert.deepEqual(result.receipt.failures[0].details, { collection: plural[type], id: `${type}-beta`, status: "beta" });
  }
});

test("status gate allows explicit prerelease acquisition but rejects deprecated, unknown, and missing statuses", () => {
  for (const status of ["canary", "beta", "experimental"]) {
    const root = workspace();
    const denied = acquireDesignSystemProvider({ root, adapterPath: "adapter.js", selections: { component: [`button-${status}`] } });
    assert.equal(denied.receipt.failures[0].code, "STATUS_DENIED");
    const allowed = acquireDesignSystemProvider({ root, adapterPath: "adapter.js", allowCanary: true, selections: { component: [`button-${status}`] } });
    assert.equal(allowed.status, "complete");
  }
  for (const status of ["deprecated", "unknown", "missing"]) {
    const root = workspace();
    const result = acquireDesignSystemProvider({ root, adapterPath: "adapter.js", allowCanary: true, selections: { component: [`button-${status}`] } });
    assert.equal(result.status, "failed");
    assert.equal(result.receipt.failures[0].code, "STATUS_DENIED");
  }
});

test("bundled Astryx entries use the same status gate", () => {
  const plural = { component: "components", docs: "docs", template: "templates", hook: "hooks" };
  for (const type of Object.keys(plural)) {
    const deniedWorkspace = workspaceWithAstryxCli();
    const selections = Object.fromEntries(Object.keys(plural).filter((candidate) => candidate !== type).map((candidate) => [candidate, []]));
    const denied = acquireDesignSystemProvider({ root: deniedWorkspace.root, selections, env: { PATH: process.env.PATH, FAKE_ASTRYX_STATUS: "beta" } });
    assert.equal(denied.status, "failed");
    assert.equal(denied.snapshot, null);
    assert.equal(denied.receipt.failures[0].code, "STATUS_DENIED");
    assert.equal(denied.receipt.failures[0].details.collection, plural[type]);
    assert.equal(denied.receipt.failures[0].details.status, "beta");
  }
  const allowedWorkspace = workspaceWithAstryxCli();
  const allowed = acquireDesignSystemProvider({ root: allowedWorkspace.root, allowCanary: true, env: { PATH: process.env.PATH, FAKE_ASTRYX_STATUS: "experimental" } });
  assert.equal(allowed.status, "complete");
  assert.equal(allowed.snapshot.components[0].status, "experimental");
});

test("proxy, token, and credential environment values are not passed to adapters", () => {
  const root = workspace();
  const result = runProviderCommand({
    root,
    adapterPath: "adapter.js",
    providerId: "astryx",
    apiVersion: "1",
    type: "docs",
    id: "environment",
    env: { PATH: process.env.PATH, HTTP_PROXY: "http://proxy", ACCESS_TOKEN: "token", DB_CREDENTIAL: "credential" },
  });
  assert.deepEqual(result.envelope.data.value.leaked, []);
});

test("unknown and mutating commands are rejected before adapter execution", () => {
  const root = workspace();
  for (const type of ["init", "install", "swizzle", "upgrade", "theme-build", "AGENTS.md"]) {
    assert.throws(() => runProviderCommand({ root, adapterPath: "adapter.js", type }), { code: "COMMAND_DENIED" });
  }
});

test("canary, path escape, wrong type, timeout, and non-zero exit fail closed", () => {
  const root = workspace();
  assert.throws(() => runProviderCommand({ root, adapterPath: "adapter.js", type: "manifest", channel: "canary" }), { code: "CANARY_DENIED" });
  assert.throws(() => runProviderCommand({ root, adapterPath: fixture, type: "manifest" }), { code: "PATH_INVALID" });
  assert.throws(() => runProviderCommand({ root, adapterPath: "adapter.js", type: "component", id: "wrong-type" }), { code: "TYPE_MISMATCH" });
  assert.throws(() => runProviderCommand({ root, adapterPath: "adapter.js", type: "component", id: "timeout", timeoutMs: 50 }), { code: "ADAPTER_TIMEOUT" });
  assert.throws(() => runProviderCommand({ root, adapterPath: "adapter.js", type: "component", id: "exit" }), { code: "ADAPTER_EXIT" });
});

test("acquisition records failures and atomic output cannot escape the root", () => {
  const root = workspace();
  const failed = acquireDesignSystemProvider({ root, adapterPath: "adapter.js", selections: { component: ["exit"] } });
  assert.equal(failed.status, "failed");
  assert.equal(failed.snapshot, null);
  assert.equal(failed.receipt.failures[0].code, "ADAPTER_EXIT");
  const complete = acquireDesignSystemProvider({ root, adapterPath: "adapter.js", output: "evidence/provider.json" });
  const persisted = JSON.parse(fs.readFileSync(path.join(root, "evidence", "provider.json"), "utf8"));
  assert.equal(persisted.receipt.status, "complete");
  assert.deepEqual(persisted.snapshot, complete.snapshot);
  assert.deepEqual(persisted.catalog, complete.catalog);
  assert.throws(() => acquireDesignSystemProvider({ root, adapterPath: "adapter.js", output: "../outside.json" }), { code: "PATH_ESCAPE" });
});
