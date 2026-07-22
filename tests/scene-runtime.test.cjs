"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { checkScene, validateScene } = require("../skill/scripts/scene-runtime-core.cjs");

function makeScene(family, adapter) {
  return {
    schema: "design-pipeline.scene-runtime.v1",
    id: `${family}-example`,
    family,
    adapter: { id: adapter, version: "1.0.0", support: "native", availability: "available" },
    foundations: { designSha256: "a".repeat(64), motionSha256: "b".repeat(64) },
    lifecycle: { owner: "application shell", clock: "monotonic frame clock", updateLoop: "single owned update loop", cleanupOwner: "scene disposer" },
    coordinateSystem: { model: "top-left logical pixels", camera: "viewport-fit camera" },
    assets: [{ id: "hero", source: "assets/hero.png", license: "project-owned", sha256: "c".repeat(64) }],
    input: { pointer: "hit-tested actions", keyboard: "semantic action map", touch: "coarse target map", focus: "DOM focus mirror" },
    accessibility: { semanticOverlay: "DOM semantic mirror", keyboardFallback: "all actions mapped", announcements: "polite state region", reducedMotion: "static state substitution" },
    budgets: { targetFps: 60, longFrameMs: 24, memoryMb: 256, drawCalls: 300 },
    evidence: { deterministic: true, seed: 42, receiptPaths: ["evidence/scene.json"] },
    degradation: { status: "none", fallback: "semantic static composition" },
    cleanup: { owners: ["scene disposer"], checks: ["remove listeners", "destroy textures", "stop update loop"] },
  };
}

function markdown(scene) {
  return [
    "# Scene Runtime",
    "",
    `Scene ID: \`${scene.id}\``,
    `DESIGN SHA-256: \`${scene.foundations.designSha256}\``,
    `MOTION SHA-256: \`${scene.foundations.motionSha256}\``,
    `Adapter: \`${scene.adapter.id}@${scene.adapter.version}\``,
    "Sidecar: [scene.json](./scene.json)",
    "",
    ...["Runtime Thesis", "Lifecycle", "Coordinates and Camera", "Assets and Provenance", "Input", "Accessibility", "Performance Budgets", "Deterministic Evidence", "Degradation", "Cleanup Ownership"].flatMap((heading) => [`## ${heading}`, "Concrete runtime decision.", ""]),
  ].join("\n");
}

test("DOM narrative, PixiJS, Phaser, and 3D scene contracts pass", () => {
  for (const [family, adapter] of [["narrative-game-ui", "narrative-dom-runtime"], ["scene-renderer-2d", "pixijs-v8"], ["game-engine-2d", "phaser-v4"], ["scene-renderer-3d", "threejs"]]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-scene-"));
    const scene = makeScene(family, adapter);
    fs.writeFileSync(path.join(root, "scene.json"), `${JSON.stringify(scene, null, 2)}\n`);
    fs.writeFileSync(path.join(root, "scene.md"), markdown(scene));
    assert.equal(checkScene(root).status, "ready");
  }
});

test("legacy scene markdown produces a deterministic non-writing upgrade preview", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-scene-"));
  const scene = makeScene("scene-renderer-2d", "pixijs-v8");
  fs.writeFileSync(path.join(root, "scene.md"), markdown(scene));
  const first = checkScene(root);
  const second = checkScene(root);
  assert.equal(first.status, "upgrade-required");
  assert.deepEqual(first.preview, second.preview);
  assert.equal(fs.existsSync(path.join(root, "scene.json")), false);
});

test("honest unknown adapter availability is valid but blocks execution", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-scene-"));
  const scene = makeScene("scene-renderer-3d", "candidate-3d-runtime");
  scene.adapter.availability = "unknown";
  fs.writeFileSync(path.join(root, "scene.json"), `${JSON.stringify(scene, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "scene.md"), markdown(scene));
  assert.equal(validateScene(scene).adapter.availability, "unknown");
  assert.equal(checkScene(root).status, "blocked");
});

test("placeholder ownership, missing accessibility, and cross-file identity drift fail", () => {
  const scene = makeScene("game-engine-2d", "phaser-v4");
  assert.throws(() => validateScene({ ...scene, lifecycle: { ...scene.lifecycle, cleanupOwner: "TBD" } }), /placeholder/);
  const broken = structuredClone(scene);
  delete broken.accessibility.reducedMotion;
  assert.throws(() => validateScene(broken), /missing reducedMotion/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-scene-"));
  fs.writeFileSync(path.join(root, "scene.json"), `${JSON.stringify(scene, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "scene.md"), markdown({ ...scene, id: "wrong-id" }));
  assert.throws(() => checkScene(root), /Scene ID does not match/);
});
