"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateDesignCodeMap, validateTokens, validateUiIr } = require("../skill/scripts/interoperability-core.cjs");

const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/ui-pattern-catalog.json"), "utf8"));

function tokens() {
  return {
    schema: "design-pipeline.design-tokens.v1",
    dtcgProfile: "2025.10",
    provenance: { source: "DESIGN.md", sha256: "a".repeat(64), license: "project-owned" },
    tokens: {
      color: {
        $type: "color",
        accent: { $value: "#ff4d00", $description: "Primary action", $extensions: { "design-pipeline": { role: "color.action.primary" } } },
        surface: { $value: "#101114", $extensions: { "design-pipeline": { role: "color.surface.base" } } },
      },
      motion: { $type: "duration", fast: { $value: "120ms", $extensions: { "design-pipeline": { role: "motion.duration.fast" } } } },
    },
  };
}

test("DTCG-profile tokens require semantic roles, provenance, and finite values", () => {
  assert.equal(validateTokens(tokens()).tokenCount, 3);
  const missingRole = tokens();
  delete missingRole.tokens.color.accent.$extensions;
  assert.throws(() => validateTokens(missingRole), /semantic role/);
  const nonFinite = tokens();
  nonFinite.tokens.color.accent.$value = Number.POSITIVE_INFINITY;
  assert.throws(() => validateTokens(nonFinite), /invalid/);
});

test("UI IR accepts trusted catalog ids and rejects executable or remote props", () => {
  const ir = { schema: "design-pipeline.ui-ir.v1", catalogVersion: catalog.version, nodes: [{ id: "cta", componentId: "button", props: { label: "Start" }, children: [] }] };
  assert.equal(validateUiIr(ir, catalog).nodeCount, 1);
  assert.throws(() => validateUiIr({ ...ir, nodes: [{ ...ir.nodes[0], componentId: "invented" }] }, catalog), /not in catalog/);
  assert.throws(() => validateUiIr({ ...ir, nodes: [{ ...ir.nodes[0], props: { onClick: "alert(1)" } }] }, catalog), /executable or remote/);
  assert.throws(() => validateUiIr({ ...ir, nodes: [{ ...ir.nodes[0], props: { image: "https://remote.example/a.png" } }] }, catalog), /executable or remote/);
});

test("design-code maps require project-relative locations, token refs, and evidence", () => {
  const document = {
    schema: "design-pipeline.design-code-map.v1",
    uiIrSha256: "b".repeat(64),
    tokenSha256: "c".repeat(64),
    mappings: [{ renderedId: "cta", sourcePath: "src/components/Button.tsx", line: 12, column: 3, componentId: "button", tokenRefs: ["color.accent"], evidence: ["evidence/cta.json"] }],
  };
  assert.equal(validateDesignCodeMap(document).mappingCount, 1);
  const escaped = structuredClone(document);
  escaped.mappings[0].sourcePath = "../outside.ts";
  assert.throws(() => validateDesignCodeMap(escaped), /project-relative/);
  const emptyEvidence = structuredClone(document);
  emptyEvidence.mappings[0].evidence = [];
  assert.throws(() => validateDesignCodeMap(emptyEvidence), /at least 1/);
});
