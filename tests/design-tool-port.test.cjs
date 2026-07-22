"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateDesignToolReceipt } = require("../skill/scripts/adapter-core.cjs");

function receipt(overrides = {}) {
  return {
    schema: "design-pipeline.design-tool-receipt.v1",
    id: "figma-round-trip",
    provider: { id: "figma-host", version: "host-2026.07", availability: "available" },
    operation: "round-trip",
    status: "valid",
    source: { artifact: "ui-ir.json", sha256: "a".repeat(64) },
    mappings: { elements: ["node:hero=>frame:12"], components: ["button=>component:4"], tokens: ["color.accent=>variable:7"], sourceLocations: ["frame:12=>src/Hero.tsx:8"] },
    editable: true,
    evidence: ["evidence/figma-round-trip.json"],
    ...overrides,
  };
}

test("Figma-, Penpot-, and Onlook-class hosts share one provider-neutral editable receipt", () => {
  for (const id of ["figma-host", "penpot-host", "onlook-host"]) {
    assert.equal(validateDesignToolReceipt(receipt({ provider: { id, version: "pinned", availability: "available" } })).status, "valid");
  }
});

test("unavailable hosts cannot imply valid support and valid handoff requires mappings/evidence", () => {
  assert.throws(() => validateDesignToolReceipt(receipt({ provider: { id: "figma-host", version: "pinned", availability: "unavailable" } })), /cannot produce a valid/);
  assert.throws(() => validateDesignToolReceipt(receipt({ editable: false })), /requires editable/);
  const empty = receipt();
  empty.mappings.elements = [];
  assert.throws(() => validateDesignToolReceipt(empty), /requires editable/);
});
