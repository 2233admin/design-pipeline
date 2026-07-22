"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { ARTIFACT_KEYS, validateReceipt } = require("../skill/scripts/evidence-core.cjs");

function fixture(root) {
  const artifacts = {};
  const hashes = {};
  for (const key of ARTIFACT_KEYS) {
    const file = `${key}.txt`;
    const bytes = Buffer.from(`${key}\n`);
    fs.writeFileSync(path.join(root, file), bytes);
    artifacts[key] = file;
    hashes[key] = crypto.createHash("sha256").update(bytes).digest("hex");
  }
  return {
    schema: "design-pipeline.evidence-receipt.v1",
    id: "evidence-example",
    status: "complete",
    adapter: { id: "fake-web", version: "1.0.0", availability: "available", probe: { ok: true, message: "fake adapter ready" } },
    target: { url: "https://example.com/", viewport: { width: 1280, height: 720 } },
    capturedAt: "2026-07-23T00:00:00.000Z",
    artifacts,
    hashes,
    redaction: { status: "not-required", notes: [] },
  };
}

test("a complete attributed evidence receipt validates with file hashes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evidence-"));
  assert.equal(validateReceipt(fixture(root), { evidenceRoot: root, requireFiles: true }).status, "complete");
});

test("complete status cannot hide missing measurements or an unavailable adapter", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evidence-"));
  const receipt = fixture(root);
  receipt.artifacts.performance = null;
  delete receipt.hashes.performance;
  assert.throws(() => validateReceipt(receipt, { evidenceRoot: root }), /missing measurements/);
  const unavailable = fixture(root);
  unavailable.adapter.availability = "unavailable";
  assert.throws(() => validateReceipt(unavailable, { evidenceRoot: root }), /missing measurements or readiness/);
});

test("artifact paths cannot be absolute, escape the evidence root, or omit hashes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-evidence-"));
  const escaped = fixture(root);
  escaped.artifacts.screenshot = "../outside.png";
  assert.throws(() => validateReceipt(escaped, { evidenceRoot: root }), /escapes evidence root/);
  const unhashed = fixture(root);
  delete unhashed.hashes.trace;
  assert.throws(() => validateReceipt(unhashed, { evidenceRoot: root }), /missing trace|SHA-256/);
  const forged = fixture(root);
  forged.hashes.dom = "f".repeat(64);
  assert.throws(() => validateReceipt(forged, { evidenceRoot: root, requireFiles: true }), /does not match/);
});
