"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { normalizeSnapshot, validateSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { projectDesignSystemTokens } = require("../skill/scripts/design-system-decision-core.cjs");

const file = path.join(__dirname, "../skill/references/astryx-design-system-snapshot.json");
const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
// sources:update regenerates the snapshot from the release the lock records.
const locked = JSON.parse(fs.readFileSync(path.join(__dirname, "../sources.lock.json"), "utf8")).sources.find(({ id }) => id === "astryx");

test("bundles the pinned stable Astryx catalog as inert JSON", () => {
  assert.equal(validateSnapshot(snapshot), snapshot);
  assert.equal(snapshot.namespace, "astryx");
  assert.equal(snapshot.provenance.provider, "astryx");
  assert.equal(snapshot.provenance.version, locked.version);
  assert.equal(snapshot.provenance.upstreamVersion, locked.version);
  assert.equal(snapshot.provenance.revision, locked.revision);
  assert.match(snapshot.provenance.acquisition, /^Static parse of the @astryxdesign\/core and @astryxdesign\/cli \S+ npm tarballs; no upstream code executed$/);
  for (const name of ["@astryxdesign/core", "@astryxdesign/cli"]) assert.match(snapshot.provenance.integrity[name], /^sha512-[A-Za-z0-9+/]{86}==$/);
  assert.equal(snapshot.provenance.license, "MIT");
  assert.deepEqual(snapshot.provenance.runtime, {
    react: ">=19",
    "react-dom": ">=19",
    stylex: "^0.19",
    "@stylexjs/stylex": "^0.19",
  });
  assert.ok(snapshot.components.length >= 150);
  assert.ok(snapshot.hooks.length >= 40);
  assert.ok(snapshot.docs.length >= 20);
  assert.ok(snapshot.templates.length >= 650);
});

test("has unique IDs and excludes unstable package surfaces", () => {
  for (const [name, entries] of Object.entries({
    components: snapshot.components,
    docs: snapshot.docs,
    templates: snapshot.templates,
    hooks: snapshot.hooks,
  })) {
    assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length, `${name} IDs`);
    for (const entry of entries) {
      assert.equal(entry.status, "stable");
      assert.doesNotMatch(String(entry.package || ""), /(?:private|canary|charts|lab|vega)/i);
      assert.equal(entry.private, undefined);
      assert.equal(entry.canaryOnly, undefined);
    }
  }
});

test("preserves rich official component and foundation documentation", () => {
  const rich = snapshot.components.filter((entry) => entry.usage?.description && entry.props?.length);
  assert.ok(rich.length >= 100, `only ${rich.length} rich components`);
  assert.ok(rich.filter((entry) => entry.docsZh && entry.docsDense).length >= 60);
  assert.ok(snapshot.components.some((entry) => entry.usage?.bestPractices?.length));
  assert.ok(snapshot.components.some((entry) => entry.theming));
  assert.ok(snapshot.hooks.some((entry) => entry.docsDense?.params?.length));
  // Topic sections carry the token tables; the tokens topic gathers them for the projection.
  assert.ok(snapshot.docs.some((doc) => doc.sections?.some((section) =>
    section.content?.some((content) => content.type === "table" && content.rows?.some((row) => row[0] === "--color-accent")),
  )));
  assert.ok(snapshot.docs.some((doc) => doc.docsZh?.sections?.length));
  const tokens = snapshot.docs.find(({ id }) => id === "tokens");
  assert.ok(Object.keys(tokens.theme.tokens).length >= 180);
  assert.deepEqual(tokens.theme.tokens["--color-accent"], ["#0064E0", "#2694FE"]);
  assert.match(tokens.theme.tokens["--spacing-4"], /^(?:16px|1rem)$/);
  assert.equal(tokens.theme.tokens["--duration-medium"], "410ms");
  const projection = projectDesignSystemTokens(normalizeSnapshot(snapshot));
  assert.equal(projection.status, "ready", JSON.stringify(projection.losses));
  assert.equal(projection.tokens.schema, "design-pipeline.design-tokens.v1");
  assert.ok(projection.tokens.tokens.color);
});

test("stores a docsZh or docsDense lens only where it reads differently from the entry", () => {
  for (const collection of ["components", "hooks", "docs"]) {
    for (const entry of snapshot[collection]) {
      const { id, status, package: owner, docsZh, docsDense, theme, ...english } = entry;
      for (const lens of [docsZh, docsDense].filter(Boolean)) {
        const { package: lensOwner, ...rest } = lens;
        assert.notDeepEqual(rest, english, `${collection}/${id} stores a lens identical to the entry`);
      }
    }
  }
});
