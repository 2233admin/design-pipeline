"use strict";

const fs = require("node:fs");
const path = require("node:path");

const inputDir = path.resolve(process.argv[2] || ".");
const outputFile = path.resolve(process.argv[3] || "skill/references/astryx-design-system-snapshot.json");

function data(file) {
  const envelope = JSON.parse(fs.readFileSync(path.join(inputDir, file), "utf8"));
  if (envelope.error || envelope.apiVersion !== 1) throw new Error(`${file}: ${envelope.error || "invalid CLI envelope"}`);
  return envelope.data;
}

function grouped(file) {
  return Object.entries(data(file).components).flatMap(([category, entries]) =>
    entries.map((entry) => ({ category, ...entry })),
  );
}

function localized(entries, translated, dense) {
  const zhByName = new Map(translated.map((entry) => [entry.name, entry]));
  const denseByName = new Map(dense.map((entry) => [entry.name, entry]));
  return entries.map((entry) => ({
    id: entry.name,
    status: "stable",
    package: "@astryxdesign/core",
    ...entry,
    docsZh: zhByName.get(entry.name),
    docsDense: denseByName.get(entry.name),
  }));
}

function extractThemeTokens(doc) {
  const tokens = {};
  for (const section of doc.sections || []) {
    for (const table of (section.content || []).filter(({ type }) => type === "table")) {
      const modes = JSON.stringify(table.headers) === JSON.stringify(["Token", "Light", "Dark"]);
      const scalar = JSON.stringify(table.headers) === JSON.stringify(["Token", "Value"]);
      if (!modes && !scalar) continue;
      for (const row of table.rows || []) {
        const [name, ...values] = row;
        if (typeof name !== "string" || !name.startsWith("--")) continue;
        if (Object.hasOwn(tokens, name)) throw new Error(`duplicate token ${name}`);
        tokens[name] = modes ? values.slice(0, 2) : values[0];
      }
    }
  }
  return tokens;
}

const components = localized(grouped("components.json"), grouped("components-zh.json"), grouped("components-dense.json"));
const hooks = localized(grouped("hooks.json"), grouped("hooks-zh.json"), grouped("hooks-dense.json"));
const docs = data("docs-list.json").map(({ topic }) => {
  const doc = data(`docs-${topic}.json`);
  return {
    id: topic,
    status: "stable",
    ...doc,
    ...(topic === "tokens" ? { theme: { tokens: extractThemeTokens(doc) } } : {}),
    docsZh: data(`docs-${topic}-zh.json`),
    docsDense: data(`docs-${topic}-dense.json`),
  };
});
const templates = data("templates.json").map((entry) => ({ status: "stable", ...entry }));

for (const collection of [components, docs, templates, hooks]) {
  collection.sort((a, b) => a.id.localeCompare(b.id, "en"));
}

const snapshot = {
  schema: "design-pipeline.design-system-snapshot.v1",
  version: "1",
  namespace: "astryx",
  provenance: {
    provider: "astryx",
    source: "Astryx",
    url: "https://github.com/facebook/astryx",
    revision: "921d3db31ae4323e0625d2f5a95c32fe07a3d5d7",
    version: "0.2.0",
    upstreamVersion: "0.2.0",
    license: "MIT",
    attribution: "Copyright Meta Platforms, Inc. and affiliates",
    runtime: {
      react: ">=19",
      "react-dom": ">=19",
      stylex: "^0.19",
      "@stylexjs/stylex": "^0.19",
    },
    acquisition: "Official @astryxdesign/cli v0.2.0 read-only JSON output",
  },
  components,
  docs,
  templates,
  hooks,
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`);
