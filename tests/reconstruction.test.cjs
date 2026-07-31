"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  checkReconstruction,
  validateReconstruction,
} = require("../skill/scripts/reconstruction-core.cjs");
const {
  exactReconstruction,
  readyRoot,
} = require("./fixtures/reconstruction-fixture.cjs");

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");

test("geometry stage independently recomputes distributed landmark error", () => {
  const root = readyRoot();
  const result = checkReconstruction(root, { stage: "geometry" });
  assert.equal(result.status, "ready");
  assert.equal(result.measurements.count, 8);
  assert.equal(result.measurements.regionCount, 5);
  assert.equal(result.measurements.meanErrorPx, 0);
  assert.equal(result.measurements.maxPointErrorPx, 0);
});

test("missing rectification or overlay evidence blocks exact reconstruction", () => {
  const root = readyRoot();
  fs.unlinkSync(path.join(root, "landmark-overlay.png"));
  const result = checkReconstruction(root, { stage: "geometry" });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /landmark-overlay\.png/);
});

test("clustered landmarks cannot masquerade as a calibrated frame", () => {
  const reconstruction = exactReconstruction();
  reconstruction.landmarks.points = reconstruction.landmarks.points.map((entry) => ({
    ...entry,
    region: "center",
  }));
  assert.throws(
    () => validateReconstruction(reconstruction),
    /at least 4 landmark regions/i,
  );
});

test("measured camera mismatch is fidelity-limited instead of ready", () => {
  const reconstruction = exactReconstruction();
  reconstruction.landmarks.points[7].render = { x: 674, y: 329 };
  const root = readyRoot(reconstruction);
  const result = checkReconstruction(root, { stage: "geometry" });
  assert.equal(result.status, "fidelity-limited");
  assert.match(result.mismatches.join("\n"), /max landmark error/i);
});

test("final stage blocks until independent pixel evidence exists", () => {
  const root = readyRoot();
  const result = checkReconstruction(root, { stage: "final" });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /final comparison status is pending/i);
});

test("final exact reconstruction passes only measured pixel and SSIM thresholds", () => {
  const reconstruction = exactReconstruction({
    finalComparison: {
      ...exactReconstruction().finalComparison,
      status: "measured",
      metrics: {
        pixelDifferenceRatio: 0.018,
        ssim: 0.982,
      },
      evidencePort: {
        ...exactReconstruction().finalComparison.evidencePort,
        status: "ready",
        lastProbe: {
          ok: true,
          evidence: "Independent comparator produced the bound fidelity receipt.",
        },
      },
      approval: {
        status: "approved",
        evidence: "User approved the measured locked frame.",
      },
    },
  });
  const root = readyRoot(reconstruction);
  const result = checkReconstruction(root, { stage: "final" });
  assert.equal(result.status, "ready");
});

test("final evidence receipt is bound to the compared render bytes", () => {
  const base = exactReconstruction();
  const reconstruction = exactReconstruction({
    finalComparison: {
      ...base.finalComparison,
      status: "measured",
      metrics: {
        pixelDifferenceRatio: 0.018,
        ssim: 0.982,
      },
      evidencePort: {
        ...base.finalComparison.evidencePort,
        status: "ready",
        lastProbe: {
          ok: true,
          evidence: "Independent comparator produced the bound fidelity receipt.",
        },
      },
      approval: {
        status: "approved",
        evidence: "User approved the measured locked frame.",
      },
    },
  });
  const root = readyRoot(reconstruction);
  fs.appendFileSync(path.join(root, "still-frame.png"), "tampered");
  const result = checkReconstruction(root, { stage: "final" });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join("\n"), /implementation render hash/i);
});

test("exact reconstruction forbids intentional masks that hide mismatches", () => {
  const reconstruction = exactReconstruction();
  reconstruction.finalComparison.intentionalMasks = ["ignore-the-wrong-camera.png"];
  assert.throws(
    () => validateReconstruction(reconstruction),
    /exact reconstruction forbids intentional masks/i,
  );
});

test("public CLI exposes the reconstruction geometry gate", () => {
  const root = readyRoot();
  const child = childProcess.spawnSync(
    process.execPath,
    [
      cli,
      "reconstruction",
      "check",
      "--root",
      root,
      "--change-root",
      root,
      "--stage",
      "geometry",
      "--json",
    ],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, "ready");
  assert.equal(result.stage, "geometry");
});
