"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { decideDesignSystem, projectDesignSystemTokens } = require("../skill/scripts/design-system-decision-core.cjs");
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
      runtime: options.runtime || { react: "^19.0.0", reactDom: "^19.0.0", stylex: "^0.15.0" },
      theme: { tokens },
    }, ...(options.extraTemplates || [])],
  });
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
  const base = { mode: "adopt", catalog: catalog(), project: { runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } } };
  assert.equal(decideDesignSystem(base).status, "blocked");
  assert.equal(decideDesignSystem({ ...base, adapterIntake: { status: "admissible" } }).status, "ready");
  const incompatible = structuredClone(base);
  incompatible.project.runtime.react = "18.3.0";
  incompatible.adapterIntake = { status: "admissible" };
  assert.equal(decideDesignSystem(incompatible).rejected[0].reason, "runtime-incompatible");
});

test("StyleX caret ranges respect zero-major minor boundaries", () => {
  const value = catalog({ runtime: { react: "^19.0.0", reactDom: "^19.0.0", stylex: "^0.19" } });
  const request = { mode: "adopt", catalog: value, adapterIntake: { status: "admitted" }, project: { runtime: { react: "19.0.0", reactDom: "19.0.0", stylex: "0.19.3" } } };
  assert.equal(decideDesignSystem(request).status, "ready");
  request.project.runtime.stylex = "0.15.4";
  assert.equal(decideDesignSystem(request).rejected[0].reason, "runtime-incompatible");
});

test("runtime comparison supports minimum and exact semantic versions", () => {
  const value = catalog({ runtime: { react: ">=19", reactDom: "19.1.0", stylex: "0.19.3" } });
  const base = { mode: "adopt", catalog: value, adapterIntake: { status: "admitted" }, project: { runtime: { react: "19.2.0", reactDom: "19.1.0", stylex: "0.19.3" } } };
  assert.equal(decideDesignSystem(base).status, "ready");
  base.project.runtime.stylex = "0.19.4";
  assert.equal(decideDesignSystem(base).status, "blocked");
});

test("canary is denied by default and allowed explicitly", () => {
  const request = { mode: "reference", catalog: catalog({ status: "canary" }), project: {} };
  assert.equal(decideDesignSystem(request).status, "blocked");
  assert.equal(decideDesignSystem({ ...request, allowCanary: true }).selected.status, "canary");
});

test("existing project authority is retained without short-circuiting governed modes", () => {
  const project = { designSystem: "local-system", runtime: { react: "19.1.0", reactDom: "19.1.0", stylex: "0.15.4" } };
  const request = { mode: "reference", catalog: catalog(), project };
  const first = decideDesignSystem(request);
  const second = decideDesignSystem(structuredClone(request));
  assert.equal(first.projectAuthority.id, "local-system");
  assert.equal(first.selected.id, "example:template:example-react");
  assert.deepEqual(first, second);
  const adopted = decideDesignSystem({ ...request, mode: "adopt", adapterIntake: { status: "admitted" } });
  assert.equal(adopted.selected.id, "example:template:example-react");
  assert.equal(adopted.projectAuthority.id, "local-system");
  const substituted = decideDesignSystem({ ...request, mode: "substitute", adapterIntake: { status: "admitted" } });
  assert.ok(substituted.rejected.some((item) => item.id === "local-system" && item.reason === "explicitly-substituted"));
});

test("known non-stable statuses are filtered per entry without poisoning the catalog", () => {
  const value = catalog({ status: "experimental", extraTemplates: [{ id: "stable-react", status: "stable", runtime: {} }] });
  assert.equal(decideDesignSystem({ mode: "reference", catalog: value, project: {} }).selected.id, "example:template:stable-react");
  assert.equal(decideDesignSystem({ mode: "reference", catalog: catalog({ status: "experimental" }), project: {}, allowCanary: true }).selected.status, "experimental");
  for (const status of ["deprecated", "unknown"]) {
    const result = decideDesignSystem({ mode: "reference", catalog: catalog({ status }), project: {} });
    assert.equal(result.status, "blocked");
    assert.equal(result.rejected[0].reason, `status-${status}`);
  }
});

test("unknown schemas, statuses, versions, and modes fail closed", () => {
  assert.throws(() => decideDesignSystem({ mode: "invented", catalog: catalog(), project: {} }), /invalid value/);
  assert.throws(() => decideDesignSystem({ schema: "future", mode: "reference", catalog: catalog(), project: {} }), /unsupported request schema/);
  assert.throws(() => decideDesignSystem({ version: "2", mode: "reference", catalog: catalog(), project: {} }), /unsupported request version/);
  const future = catalog({ status: "future" });
  assert.throws(() => decideDesignSystem({ mode: "reference", catalog: future, project: {} }), /invalid value/);
  const version = catalog();
  version.version = "2";
  assert.throws(() => decideDesignSystem({ mode: "reference", catalog: version, project: {} }), /unsupported catalog version/);
});

test("strict catalog validation rejects tampering and extra top-level fields", () => {
  const tampered = catalog();
  tampered.entries[0].runtime.stylex = "^0.99";
  assert.throws(() => decideDesignSystem({ mode: "reference", catalog: tampered, project: {} }), /hash does not match/);
  const extra = catalog();
  extra.theme = { tokens: {} };
  assert.throws(() => projectDesignSystemTokens(extra), /unsupported properties/);
});
