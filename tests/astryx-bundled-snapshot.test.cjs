"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { normalizeSnapshot, validateSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { projectDesignSystemTokens } = require("../skill/scripts/design-system-decision-core.cjs");

const file = path.join(__dirname, "../skill/references/astryx-design-system-snapshot.json");
const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));

test("bundles the pinned stable Astryx catalog as inert JSON", () => {
  assert.equal(validateSnapshot(snapshot), snapshot);
  assert.equal(snapshot.namespace, "astryx");
  assert.equal(snapshot.provenance.provider, "astryx");
  assert.equal(snapshot.provenance.version, "0.2.0");
  assert.equal(snapshot.provenance.upstreamVersion, "0.2.0");
  assert.equal(snapshot.provenance.revision, "921d3db31ae4323e0625d2f5a95c32fe07a3d5d7");
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
  const rich = snapshot.components.filter((entry) =>
    entry.usage?.description && entry.props?.length && entry.docsZh && entry.docsDense,
  );
  assert.ok(rich.length >= 80, `only ${rich.length} rich components`);
  assert.ok(snapshot.components.some((entry) => entry.usage?.bestPractices?.length));
  assert.ok(snapshot.components.some((entry) => entry.theming));
  const tokens = snapshot.docs.find(({ id }) => id === "tokens");
  assert.ok(tokens.sections.some((section) =>
    section.content?.some((content) => content.type === "table" && content.rows?.some((row) => row[0] === "--color-accent")),
  ));
  assert.equal(tokens.docsZh.name, "tokens");
  assert.equal(tokens.docsDense.name, "tokens");
  assert.ok(Object.keys(tokens.theme.tokens).length >= 180);
  assert.deepEqual(tokens.theme.tokens["--color-accent"], ["#0064E0", "#2694FE"]);
  assert.equal(tokens.theme.tokens["--spacing-4"], "16px");
  assert.equal(tokens.theme.tokens["--duration-medium"], "410ms");
  const projection = projectDesignSystemTokens(normalizeSnapshot(snapshot));
  assert.equal(projection.tokens.schema, "design-pipeline.design-tokens.v1");
  assert.ok(projection.tokens.tokens.color);
});
