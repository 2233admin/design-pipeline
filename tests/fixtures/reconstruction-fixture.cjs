"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function writeArtifact(root, relative, content = "evidence") {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function point(id, region, sourceX, sourceY, renderX = sourceX, renderY = sourceY) {
  return {
    id,
    region,
    source: { x: sourceX, y: sourceY },
    render: { x: renderX, y: renderY },
  };
}

function exactReconstruction(overrides = {}) {
  return {
    schema: "design-pipeline.reconstruction.v1",
    id: "eva-standard-time",
    referenceId: "eva-standard-time",
    mode: "exact-reconstruction",
    coordinateSpaces: {
      image: "Source and render pixels in the locked 723x405 viewport.",
      canonical: "Rectified front-elevation coordinates.",
      world: "Shallow-relief object coordinates in scene units.",
      camera: "Locked perspective camera coordinates.",
    },
    rectification: {
      method: "planar-homography",
      artifact: "rectified-reference.png",
      frontElevation: "front-elevation.svg",
      sourceViewport: { width: 723, height: 405 },
      canonicalViewport: { width: 723, height: 405 },
      anchors: [
        { id: "panel-tl", source: { x: 91, y: 111 }, canonical: { x: 70, y: 70 } },
        { id: "panel-tr", source: { x: 655, y: 15 }, canonical: { x: 653, y: 70 } },
        { id: "panel-br", source: { x: 680, y: 205 }, canonical: { x: 653, y: 250 } },
        { id: "panel-bl", source: { x: 82, y: 246 }, canonical: { x: 70, y: 250 } },
      ],
    },
    camera: {
      model: "perspective",
      locked: true,
      calibrationArtifact: "camera-calibration.json",
      renderViewport: { width: 723, height: 405 },
      parameters: {
        verticalFovDegrees: 35,
        near: 0.1,
        far: 100,
        position: [0, 0, 12],
        target: [0, 0, 0],
        up: [0, 1, 0],
        rollDegrees: -1.5,
      },
    },
    landmarks: {
      overlayArtifact: "landmark-overlay.png",
      thresholds: {
        minCount: 8,
        minRegions: 4,
        maxMeanErrorPx: 1.5,
        maxPointErrorPx: 3,
      },
      points: [
        point("panel-tl", "top-left", 91, 111),
        point("title-left", "top-left", 35, 66),
        point("panel-tr", "top-right", 655, 15),
        point("right-rail", "top-right", 678, 202),
        point("digit-center", "center", 372, 141),
        point("digit-baseline", "center", 377, 221),
        point("lower-left", "bottom-left", 64, 311),
        point("lower-right", "bottom-right", 668, 329),
      ],
    },
    geometryGate: {
      approval: {
        status: "approved",
        evidence: "Overlay reviewed at the locked output viewport.",
      },
    },
    finalComparison: {
      status: "pending",
      referenceRender: "reference.png",
      implementationRender: "still-frame.png",
      diffArtifact: "pixel-diff.png",
      intentionalMasks: [],
      thresholds: {
        maxPixelDifferenceRatio: 0.03,
        minSsim: 0.97,
      },
      metrics: null,
      evidencePort: {
        status: "pending",
        adapter: "independent-image-comparator",
        availableCapabilities: [
          "render-reference",
          "render-implementation",
          "pixel-diff",
          "ssim",
        ],
        lastProbe: {
          ok: false,
          evidence: "EvidencePort has not measured the final frame.",
        },
        receiptArtifact: "fidelity-receipt.json",
      },
      approval: {
        status: "pending",
        evidence: "Final material and lighting pass has not been measured.",
      },
    },
    ...overrides,
  };
}

function readyRoot(reconstruction = exactReconstruction()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-reconstruction-"));
  for (const artifact of [
    "rectified-reference.png",
    "front-elevation.svg",
    "camera-calibration.json",
    "landmark-overlay.png",
    "reference.png",
    "still-frame.png",
    "pixel-diff.png",
  ]) writeArtifact(root, artifact);
  if (reconstruction.finalComparison.metrics) {
    const digest = (relative) => crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, relative)))
      .digest("hex");
    writeArtifact(
      root,
      reconstruction.finalComparison.evidencePort.receiptArtifact,
      `${JSON.stringify({
        schema: "design-pipeline.reconstruction-evidence.v1",
        referenceSha256: digest(reconstruction.finalComparison.referenceRender),
        implementationSha256: digest(
          reconstruction.finalComparison.implementationRender,
        ),
        diffSha256: digest(reconstruction.finalComparison.diffArtifact),
        viewport: { width: 723, height: 405 },
        metrics: reconstruction.finalComparison.metrics,
      }, null, 2)}\n`,
    );
  }
  writeArtifact(root, "reconstruction.json", `${JSON.stringify(reconstruction, null, 2)}\n`);
  return root;
}

module.exports = {
  exactReconstruction,
  readyRoot,
};
