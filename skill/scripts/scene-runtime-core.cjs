"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  fail,
  readJson,
  resolveInside,
} = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.scene-runtime.v1";
const FAMILIES = ["semantic-ui", "canvas-editor-2d", "scene-renderer-2d", "game-engine-2d", "scene-renderer-3d", "game-engine-3d", "geospatial-3d", "gpu-shader", "narrative-game-ui"];
const HEADINGS = ["Runtime Thesis", "Lifecycle", "Coordinates and Camera", "Assets and Provenance", "Input", "Accessibility", "Performance Budgets", "Deterministic Evidence", "Degradation", "Cleanup Ownership"];
const SUPPORT = ["native", "generic-workflow", "companion", "reference-only", "unsupported", "out-of-scope"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function noPlaceholder(value, label) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text || /\b(?:todo|tbd|unknown|placeholder|fill me)\b|待定|占位/i.test(text)) {
    fail("scene runtime", `${label} contains a placeholder`);
  }
}

function checkAuthoredText(value, label) {
  assertString(value, label, "scene runtime");
  noPlaceholder(value, label);
}

function validateScene(scene) {
  const rootKeys = ["schema", "id", "family", "adapter", "foundations", "lifecycle", "coordinateSystem", "assets", "input", "accessibility", "budgets", "evidence", "degradation", "cleanup"];
  assertKeys(scene, rootKeys, rootKeys, "scene", "scene runtime");
  if (scene.schema !== SCHEMA) fail("scene runtime", `schema must be ${SCHEMA}`);
  assertString(scene.id, "id", "scene runtime");
  assertEnum(scene.family, FAMILIES, "family", "scene runtime");
  assertKeys(scene.adapter, ["id", "version", "support", "availability"], ["id", "version", "support", "availability"], "adapter", "scene runtime");
  assertString(scene.adapter.id, "adapter.id", "scene runtime");
  assertString(scene.adapter.version, "adapter.version", "scene runtime");
  assertEnum(scene.adapter.availability, ["available", "unavailable", "blocked", "unknown"], "adapter.availability", "scene runtime");
  assertEnum(scene.adapter.support, SUPPORT, "adapter.support", "scene runtime");
  assertKeys(scene.foundations, ["designSha256", "motionSha256"], ["designSha256", "motionSha256"], "foundations", "scene runtime");
  for (const key of ["designSha256", "motionSha256"]) {
    if (!/^[a-f0-9]{64}$/i.test(scene.foundations[key])) fail("scene runtime", `foundations.${key} must be SHA-256`);
  }
  assertKeys(scene.lifecycle, ["owner", "clock", "updateLoop", "cleanupOwner"], ["owner", "clock", "updateLoop", "cleanupOwner"], "lifecycle", "scene runtime");
  for (const key of ["owner", "clock", "updateLoop", "cleanupOwner"]) checkAuthoredText(scene.lifecycle[key], `lifecycle.${key}`);
  assertKeys(scene.coordinateSystem, ["model", "camera"], ["model", "camera"], "coordinateSystem", "scene runtime");
  for (const key of ["model", "camera"]) checkAuthoredText(scene.coordinateSystem[key], `coordinateSystem.${key}`);
  if (!Array.isArray(scene.assets)) fail("scene runtime", "assets must be an array");
  scene.assets.forEach((asset, index) => {
    assertKeys(asset, ["id", "source", "license", "sha256"], ["id", "source", "license", "sha256"], `assets[${index}]`, "scene runtime");
    assertString(asset.id, `assets[${index}].id`, "scene runtime");
    for (const key of ["source", "license"]) checkAuthoredText(asset[key], `assets[${index}].${key}`);
    if (asset.sha256 !== null && !/^[a-f0-9]{64}$/i.test(asset.sha256)) fail("scene runtime", `assets[${index}].sha256 must be null or SHA-256`);
  });
  assertKeys(scene.input, ["pointer", "keyboard", "touch", "focus"], ["pointer", "keyboard", "touch", "focus"], "input", "scene runtime");
  for (const key of ["pointer", "keyboard", "touch", "focus"]) checkAuthoredText(scene.input[key], `input.${key}`);
  assertKeys(scene.accessibility, ["semanticOverlay", "keyboardFallback", "announcements", "reducedMotion"], ["semanticOverlay", "keyboardFallback", "announcements", "reducedMotion"], "accessibility", "scene runtime");
  for (const key of ["semanticOverlay", "keyboardFallback", "announcements", "reducedMotion"]) checkAuthoredText(scene.accessibility[key], `accessibility.${key}`);
  assertKeys(scene.budgets, ["targetFps", "longFrameMs", "memoryMb", "drawCalls"], ["targetFps", "longFrameMs", "memoryMb", "drawCalls"], "budgets", "scene runtime");
  for (const key of ["targetFps", "longFrameMs", "memoryMb", "drawCalls"]) {
    if (typeof scene.budgets[key] !== "number" || !Number.isFinite(scene.budgets[key]) || scene.budgets[key] <= 0) fail("scene runtime", `budgets.${key} must be positive`);
  }
  assertKeys(scene.evidence, ["deterministic", "seed", "receiptPaths"], ["deterministic", "seed", "receiptPaths"], "evidence", "scene runtime");
  if (scene.evidence.deterministic !== true) fail("scene runtime", "evidence.deterministic must be true");
  if (scene.evidence.seed === null || (!["string", "number"].includes(typeof scene.evidence.seed))) fail("scene runtime", "evidence.seed is required");
  assertStringArray(scene.evidence.receiptPaths, "evidence.receiptPaths", "scene runtime", { min: 1 });
  assertKeys(scene.degradation, ["status", "fallback"], ["status", "fallback"], "degradation", "scene runtime");
  assertEnum(scene.degradation.status, ["none", "degraded", "blocked"], "degradation.status", "scene runtime");
  checkAuthoredText(scene.degradation.fallback, "degradation.fallback");
  assertKeys(scene.cleanup, ["owners", "checks"], ["owners", "checks"], "cleanup", "scene runtime");
  assertStringArray(scene.cleanup.owners, "cleanup.owners", "scene runtime", { min: 1 });
  assertStringArray(scene.cleanup.checks, "cleanup.checks", "scene runtime", { min: 1 });
  scene.cleanup.owners.forEach((value, index) => noPlaceholder(value, `cleanup.owners[${index}]`));
  scene.cleanup.checks.forEach((value, index) => noPlaceholder(value, `cleanup.checks[${index}]`));
  return scene;
}

function validateSceneMarkdown(text, scene = null) {
  for (const heading of HEADINGS) {
    const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "mi");
    if (!pattern.test(text)) fail("scene runtime", `scene.md is missing ## ${heading}`);
  }
  if (!/scene\.json/i.test(text)) fail("scene runtime", "scene.md must link scene.json");
  if (scene) {
    const markers = [
      ["Scene ID", scene.id],
      ["DESIGN SHA-256", scene.foundations.designSha256],
      ["MOTION SHA-256", scene.foundations.motionSha256],
      ["Adapter", `${scene.adapter.id}@${scene.adapter.version}`],
    ];
    for (const [label, value] of markers) {
      if (!new RegExp(`^${escapeRegExp(label)}:\\s*\\x60${escapeRegExp(value)}\\x60\\s*$`, "mi").test(text)) {
        fail("scene runtime", `scene.md ${label} does not match scene.json`);
      }
    }
  }
  noPlaceholder(text, "scene.md");
  return true;
}

function checkScene(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const markdown = resolveInside(root, options.markdown || "scene.md", "scene.md", { scope: "scene runtime", mustExist: true });
  const sidecarPath = resolveInside(root, options.sidecar || "scene.json", "scene.json", { scope: "scene runtime" });
  const markdownText = fs.readFileSync(markdown, "utf8");
  if (!fs.existsSync(sidecarPath)) {
    return { status: "upgrade-required", markdown, sidecar: sidecarPath, preview: { schema: SCHEMA, id: path.basename(root), source: "legacy-scene-md" } };
  }
  const scene = validateScene(readJson(sidecarPath, "scene runtime"));
  validateSceneMarkdown(markdownText, scene);
  const status = scene.adapter.availability === "available" && scene.degradation.status !== "blocked" ? "ready" : "blocked";
  return { status, markdown, sidecar: sidecarPath, scene };
}

module.exports = { FAMILIES, HEADINGS, SCHEMA, SUPPORT, checkScene, validateScene, validateSceneMarkdown };
