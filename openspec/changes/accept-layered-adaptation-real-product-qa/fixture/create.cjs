#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const repoRoot = path.resolve(__dirname, "../../../..");
const argumentIndex = process.argv.indexOf("--output-root");
const outputRoot = path.resolve(argumentIndex >= 0 ? process.argv[argumentIndex + 1] : path.join(__dirname, "project"));
const changeId = "change";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    let value = (crc ^ byte) & 0xff;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    crc = (crc >>> 8) ^ value;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngBytes(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunk = (type, data) => {
    const name = Buffer.from(type); const output = Buffer.alloc(12 + data.length);
    output.writeUInt32BE(data.length, 0); name.copy(output, 4); data.copy(output, 8);
    output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length); return output;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.alloc(height * (1 + width * 4)))), chunk("IEND", Buffer.alloc(0))]);
}

function write(relative, value) {
  const file = path.join(outputRoot, relative); const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
  return { path: relative.replaceAll("\\", "/"), sha256: sha256(bytes) };
}

function writeAt(base, relative, value) {
  const file = path.join(outputRoot, base, relative); const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes);
  return { path: relative.replaceAll("\\", "/"), sha256: sha256(bytes) };
}

const design = `---
version: "1.0"
name: "Layered adaptation acceptance fixture"
description: "A deterministic project for bounded collaboration adaptation."
---

# Acceptance fixture

## Product Context
This fixture evaluates inspectable, reversible collaboration guidance for a small design workflow.

## Overview
The product is calm, exact, and inspectable; the public CLI and durable files are its interface.

## Colors
Use terminal status colors only: green ready, amber fallback, red blocked, blue neutral.

## Typography
Use readable system sans for prose and monospace for commands, paths, hashes, and contracts.

## Layout
Present intent, evidence, decisions, tasks, implementation, verification, and handoff in that order.

## Components
Use one accessible component surface, single-file Playgrounds, and explicit CLI receipts.

## Do's and Don'ts
- Do expose evidence, scope, and recovery targets.
- Don't hide adaptation or weaken quality, security, or accessibility gates.

## Source Decisions
### Adopted
- Adopted bounded, hash-linked, OpenSpec-style artifacts and a static motion posture.
### Rejected
- Rejected hidden profiles, remote execution, and one aggregate score as product evidence.
`;

const motion = `---
schema: design-pipeline.motion-foundation.v0.1
name: "Layered adaptation acceptance motion"
posture: static
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Motion foundation

## Motion Thesis
The fixture is understood through immediate CLI and document state, not animation.

## Motion Principles
- State changes remain legible without motion.
- Motion never weakens focus, contrast, or recovery.

## Motion Vocabulary
No moving primitive is selected for the static fixture posture.

## Procedural Motion
Disabled. No procedural motion is needed for acceptance.

## Runtime Policy
The fixture has no animation runtime; target products declare one separately.

## Reduced Motion
Fallback: all state, evidence, prompts, and recovery actions remain available immediately as text.

## Source Decisions
### Adopted
- Adopted an explicit static posture and immediate text state.
### Rejected
- Rejected decorative motion and motion-only meaning.
`;

const html = `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; font-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'">
<main data-design-playground>
<h1 data-playground-title>Fixture design surface</h1>
<div data-playground-controls>
<label>Corner radius <input data-playground-control="radius" type="range" min="0" max="32" step="1" value="12"></label>
<label>Density <select data-playground-control="density"><option>airy</option><option selected>balanced</option><option>compact</option></select></label>
<label><input data-playground-control="outlined" type="checkbox" checked> Outlined</label>
<button data-playground-preset="calm">Calm</button><button data-playground-preset="compact">Compact</button><button data-playground-preset="bold">Bold</button>
</div>
<section data-playground-preview aria-live="polite"></section><output data-playground-prompt></output><button data-playground-copy type="button">Copy prompt</button>
</main>
<script>
const state = { radius: 12, density: "balanced", outlined: true };
const presetValues = { calm: { radius: 12, density: "airy", outlined: true }, compact: { radius: 8, density: "compact", outlined: true }, bold: { radius: 20, density: "balanced", outlined: false } };
const controls = document.querySelectorAll("[data-playground-control]");
function renderPreview() { document.querySelector("[data-playground-preview]").textContent = JSON.stringify(state); }
function updatePrompt() { document.querySelector("[data-playground-prompt]").textContent = "Update this surface to " + state.density + " spacing with a " + state.radius + "px radius while preserving accessibility."; }
function updateAll() { renderPreview(); updatePrompt(); }
function syncControl(control) { state[control.dataset.playgroundControl] = control.type === "checkbox" ? control.checked : control.type === "range" ? Number(control.value) : control.value; }
controls.forEach((control) => { control.addEventListener("input", () => { syncControl(control); updateAll(); }); control.addEventListener("change", () => { syncControl(control); updateAll(); }); });
document.querySelectorAll("[data-playground-preset]").forEach((preset) => preset.addEventListener("click", () => { Object.assign(state, presetValues[preset.dataset.playgroundPreset]); updateAll(); }));
document.querySelector("[data-playground-copy]").addEventListener("click", () => navigator.clipboard.writeText(document.querySelector("[data-playground-prompt]").textContent)); updateAll();
</script>
`;

function makePlayground(id, kind, title, targetName) {
  const base = path.join("change", "playgrounds", id); const artifact = writeAt(base, path.join("playground", "index.html"), html);
  const controls = [
    { id: "radius", label: "Corner radius", group: "Shape", type: "range", default: 12, min: 0, max: 32, step: 1 },
    { id: "density", label: "Density", group: "Layout", type: "select", default: "balanced", options: ["airy", "balanced", "compact"] },
    { id: "outlined", label: "Outlined", group: "Material", type: "checkbox", default: true },
  ];
  const blueprint = kind === "code-map" ? "code-map" : kind === "game-balance" ? "game-balance" : "design-playground";
  const surface = { kind, blueprint: { source: "builtin", id: blueprint }, title, context: `Choose and adjust the initial strategy for ${title}.`, artifact, controls, presets: [
    { id: "calm", name: "Calm", values: { radius: 12, density: "airy", outlined: true } },
    { id: "compact", name: "Compact", values: { radius: 8, density: "compact", outlined: true } },
    { id: "bold", name: "Bold", values: { radius: 20, density: "balanced", outlined: false } },
  ] };
  const { surfaceContractSha256, selectionStateSha256 } = require(path.join(repoRoot, "skill", "scripts", "playground-core.cjs"));
  const values = { radius: 8, density: "compact", outlined: true }; const changedControlIds = ["radius", "density"];
  const prompt = writeAt(base, path.join("playground", "selection-prompt.md"), `Apply the ${title} choice with compact spacing and an 8px radius while preserving accessibility and the existing information architecture.\n`);
  const stateSha256 = selectionStateSha256(surface, values, changedControlIds); const surfaceSha256 = surfaceContractSha256(surface);
  const checks = { everyControlUpdatesState: true, everyPresetAppliesDeclaredState: true, previewUpdatesImmediately: true, promptUpdatesImmediately: true, copyMatchesPrompt: true, keyboardOperable: true };
  const evidence = writeAt(base, path.join("playground", "verification.json"), JSON.stringify({ schema: "design-pipeline.playground-verification.v1", changeId: id, method: "manual-browser", checkedAt: "2026-08-15T00:00:00.000Z", surfaceSha256, checks }, null, 2) + "\n");
  const target = writeAt(base, targetName, `playground-kind: ${kind}\nplayground-artifact-sha256: ${artifact.sha256}\nplayground-state-sha256: ${stateSha256}\nplayground-prompt-sha256: ${prompt.sha256}\n`);
  writeAt(base, "playground.json", JSON.stringify({ schema: "design-pipeline.playground.v1", changeId: id, applicability: { status: "required", reason: "parameter-sensitive", rationale: "The user must choose and adjust the strategy against a live preview." }, surface, selection: { status: "selected", values, changedControlIds, stateSha256, prompt }, verification: { status: "passed", method: "manual-browser", checkedAt: "2026-08-15T00:00:00.000Z", surfaceSha256, checks, evidence }, integration: { status: "applied", target } }, null, 2) + "\n");
}

const defaultFixtureRoot = path.resolve(__dirname, "project");
if (outputRoot === defaultFixtureRoot && fs.existsSync(outputRoot)) fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true }); write("DESIGN.md", design); write("MOTION.md", motion); write("brief.md", "# Acceptance fixture\n\nCompare a fixed baseline with bounded adapted rules.\n");
const changeBrief = "# Layered adaptation acceptance direction\n\nUse the same content and viewport for all candidates.\n";
writeAt("change", "brief.md", changeBrief);
const directionIndex = writeAt("change", "direction-previews/index.html", "<!doctype html><main data-direction-preview><section data-direction-id=\"quiet\"></section><section data-direction-id=\"signal\"></section><section data-direction-id=\"field\"></section></main>\n");
const directions = [["quiet", "Quiet Grid", { luminance: "light", typeFamily: "sans", color: "monochrome", layout: "grid", density: "airy", era: "modern", material: "flat" }], ["signal", "Signal Console", { luminance: "dark", typeFamily: "mono", color: "duotone", layout: "split", density: "dense", era: "futurist", material: "glass" }], ["field", "Field Notes", { luminance: "light", typeFamily: "serif", color: "multicolor", layout: "asymmetric", density: "balanced", era: "industrial", material: "paper" }]].map(([id, name, axes]) => ({ id, name, thesis: `${name} makes evidence legible.`, signature: `${name} acceptance signature`, axes, screenshot: writeAt("change", `direction-previews/${id}.png`, pngBytes(1440, 900)) }));
write("change/direction-preview.json", JSON.stringify({ schema: "design-pipeline.direction-preview.v1", changeId, applicability: { status: "required", reason: "visual-redesign" }, comparison: { brief: { path: "brief.md", sha256: sha256(Buffer.from(changeBrief)) }, index: directionIndex, viewport: { width: 1440, height: 900 }, contentFixtureSha256: sha256("fixed-acceptance-content-v1"), stateCoverage: ["default", "blocked", "selected"] }, directions, decision: { status: "selected", selectedDirectionId: "quiet", rationale: "Quiet Grid gives the clearest repeated-use scan path while preserving evidence and recovery states." } }, null, 2) + "\n");
makePlayground("architecture-visualization", "code-map", "Architecture visualization", "handoff.md"); makePlayground("component-design-adjustment", "component", "Component design adjustment", "design.md"); makePlayground("layout-brainstorming", "layout", "Layout brainstorming", "design.md"); makePlayground("game-balance", "game-balance", "Game balance", "scene.md");
write("component-request.json", JSON.stringify({ schema: "design-pipeline.component-resolution-request.v1", framework: "react", capabilities: ["data.grid", "overlay.dialog", "keyboard.navigation"] }, null, 2) + "\n");
const invariants = { accessibility: true, quality: true, security: true, determinism: true };
write("evaluation-manifest.json", JSON.stringify({ schema: "design-pipeline.acceptance-evaluation-manifest.v1", version: "fixed-v1", taskIds: ["architecture-visualization", "component-design-adjustment", "layout-brainstorming", "game-balance"], partitions: { construction: ["construction-architecture"], replay: ["replay-component", "replay-layout"], heldOut: ["held-out-architecture", "held-out-game"] }, evaluator: { role: "independent-evaluator", identityHash: sha256("independent-evaluator-v1") }, dimensions: ["communication-density", "representation", "evidence-order"], effectRows: [{ dimension: "communication-density", baseline: { corrections: 4, score: 0.62, invariants }, adapted: { corrections: 2, score: 0.81, invariants } }, { dimension: "representation", baseline: { corrections: 3, score: 0.58, invariants }, adapted: { corrections: 1, score: 0.79, invariants } }, { dimension: "evidence-order", baseline: { corrections: 5, score: 0.55, invariants }, adapted: { corrections: 2, score: 0.84, invariants } }] }, null, 2) + "\n");
write("adaptation/experience-one.json", JSON.stringify({ schema: "design-pipeline.adaptation-experience.v1", signal: "explicit", evidence: ["user correction: prefer inspectable output"] }, null, 2) + "\n"); write("adaptation/experience-two.json", JSON.stringify({ schema: "design-pipeline.adaptation-experience.v1", signal: "explicit", evidence: ["user confirmation: keep evidence visible"] }, null, 2) + "\n"); write("external/project-skill.json", JSON.stringify({ schema: "design-pipeline.adaptation-skill.v1", scope: "project", version: "1.0.0", rules: [] }, null, 2) + "\n");
console.log(JSON.stringify({ schema: "design-pipeline.acceptance-fixture.v1", root: outputRoot, changeRoot: path.join(outputRoot, "change"), designSha256: sha256(Buffer.from(design)), motionSha256: sha256(Buffer.from(motion)), playgrounds: 4, directionPreview: path.join(outputRoot, "change", "direction-preview.json"), evaluationManifest: path.join(outputRoot, "evaluation-manifest.json") }, null, 2));
