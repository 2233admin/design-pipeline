"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");

const {
  resolveComponentCapabilities,
} = require("../../skill/scripts/component-capability-core.cjs");
const {
  selectionStateSha256,
  surfaceContractSha256,
} = require("../../skill/scripts/playground-core.cjs");

const repoRoot = path.resolve(__dirname, "../..");
const references = path.join(repoRoot, "skill", "references");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return result;
}

function rgbaPng(width = 96, height = 64, options = {}) {
  const rows = [];
  const alpha = options.transparent ? 0 : 255;
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4;
      row[offset] = (x * 3) % 256;
      row[offset + 1] = (y * 5) % 256;
      row[offset + 2] = 96;
      row[offset + 3] = alpha;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return { path: relative.split(path.sep).join("/"), sha256: sha256(content) };
}

function playgroundHtml() {
  return Buffer.from(`<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; font-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'">
<main data-design-playground>
  <aside data-playground-controls>
    <input data-playground-control="density">
    <button data-playground-preset="comfortable"></button>
    <button data-playground-preset="compact"></button>
    <button data-playground-preset="touch"></button>
  </aside>
  <section data-playground-preview></section>
  <output data-playground-prompt></output>
  <button data-playground-copy></button>
</main>
<script>
const state = { density: "comfortable" };
const controls = document.querySelectorAll("[data-playground-control]");
const presets = document.querySelectorAll("[data-playground-preset]");
const presetValues = { comfortable: { density: "comfortable" }, compact: { density: "compact" }, touch: { density: "touch" } };
function renderPreview() { document.querySelector("[data-playground-preview]").dataset.density = state.density; }
function updatePrompt() { document.querySelector("[data-playground-prompt]").textContent = "Use " + state.density + " component density."; }
function updateAll() { renderPreview(); updatePrompt(); }
controls.forEach((control) => {
  control.addEventListener("input", () => { state[control.dataset.playgroundControl] = control.value; updateAll(); });
  control.addEventListener("change", () => { state[control.dataset.playgroundControl] = control.value; updateAll(); });
});
presets.forEach((preset) => preset.addEventListener("click", () => { Object.assign(state, presetValues[preset.dataset.playgroundPreset]); updateAll(); }));
document.querySelector("[data-playground-copy]").addEventListener("click", () => navigator.clipboard.writeText(document.querySelector("[data-playground-prompt]").textContent));
</script>`);
}

function createPlayground(projectRoot) {
  const changeRoot = path.join(projectRoot, "openspec", "changes", "component-fixture");
  fs.mkdirSync(changeRoot, { recursive: true });
  const artifact = write(changeRoot, "playground/index.html", playgroundHtml());
  const surface = {
    kind: "component",
    blueprint: { source: "builtin", id: "design-playground" },
    title: "Component baseline",
    context: "Verify the shared component baseline in the target product context.",
    artifact,
    controls: [
      { id: "density", label: "Density", group: "Layout", type: "select", default: "comfortable", options: ["comfortable", "compact", "touch"] },
    ],
    presets: [
      { id: "comfortable", name: "Comfortable", values: { density: "comfortable" } },
      { id: "compact", name: "Compact", values: { density: "compact" } },
      { id: "touch", name: "Touch", values: { density: "touch" } },
    ],
  };
  const values = { density: "compact" };
  const changedControlIds = ["density"];
  const prompt = write(changeRoot, "playground/selection.md", "Use the compact component density while preserving keyboard behavior, visible focus, and every declared component state.\n");
  const checks = {
    everyControlUpdatesState: true,
    everyPresetAppliesDeclaredState: true,
    previewUpdatesImmediately: true,
    promptUpdatesImmediately: true,
    copyMatchesPrompt: true,
    keyboardOperable: true,
  };
  const verificationReport = {
    schema: "design-pipeline.playground-verification.v1",
    changeId: "component-fixture",
    method: "browser",
    checkedAt: "2026-08-15T04:00:00.000Z",
    surfaceSha256: surfaceContractSha256(surface),
    checks,
  };
  const verification = write(changeRoot, "playground/verification.json", `${JSON.stringify(verificationReport, null, 2)}\n`);
  const designText = `# Component fixture

playground-kind: component
playground-artifact-sha256: ${artifact.sha256}
playground-state-sha256: ${selectionStateSha256(surface, values, changedControlIds)}
playground-prompt-sha256: ${prompt.sha256}
`;
  const integration = write(changeRoot, "design.md", designText);
  const receipt = {
    schema: "design-pipeline.playground.v1",
    changeId: "component-fixture",
    applicability: { status: "required", reason: "explicit-playground", rationale: "Component-first page readiness requires an integrated component Playground." },
    surface,
    selection: { status: "selected", values, changedControlIds, stateSha256: selectionStateSha256(surface, values, changedControlIds), prompt },
    verification: { status: "passed", method: "browser", checkedAt: verificationReport.checkedAt, surfaceSha256: verificationReport.surfaceSha256, checks, evidence: verification },
    integration: { status: "applied", target: integration },
  };
  write(changeRoot, "playground.json", `${JSON.stringify(receipt, null, 2)}\n`);
  return path.relative(projectRoot, changeRoot).split(path.sep).join("/");
}

function componentDeclarations(projectRoot) {
  const roles = ["action", "form-control", "selection", "overlay", "feedback"];
  return roles.map((role) => {
    const symbol = `${role.replaceAll("-", "_")}_component`;
    const sourcePath = `src/components/${symbol}.tsx`;
    write(projectRoot, sourcePath, `export function ${symbol}() { return null; }\n`);
    return {
      id: symbol,
      role,
      runtimeStack: "react",
      componentOrigin: "project-owned",
      capabilitySource: "source-analysis",
      sourcePath,
      symbol,
      contract: { id: `${role}.v1`, status: "complete" },
      tokenEvidence: [`tokens:${role}`],
      keyboardEvidence: [`keyboard:${role}`],
      focusEvidence: [`focus:${role}`],
      stateEvidence: { disabled: [`disabled:${role}`], loading: [`loading:${role}`], error: [`error:${role}`] },
      playgroundEvidence: ["component-fixture:playground"],
      pageUsageEvidence: ["/dashboard"],
    };
  });
}

function createComponentFirstFixture(t, overrides = {}) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "component-first-"));
  const projectRoot = path.join(parent, "workspace");
  fs.mkdirSync(projectRoot, { recursive: true });
  if (t) t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  write(projectRoot, "package.json", `${JSON.stringify({ name: "component-fixture", private: true, dependencies: { react: "19.1.1", "react-aria-components": "1.12.0" } }, null, 2)}\n`);
  const declarations = componentDeclarations(projectRoot);
  const playgroundRoot = createPlayground(projectRoot);
  const screenshot = write(projectRoot, "evidence/dashboard.png", rgbaPng(overrides.width || 96, overrides.height || 64, { transparent: overrides.transparent }));
  const capabilityRegistry = JSON.parse(fs.readFileSync(path.join(references, "component-capabilities.json"), "utf8"));
  const providerRegistry = JSON.parse(fs.readFileSync(path.join(references, "component-providers.json"), "utf8"));
  const componentRequest = {
    schema: "design-pipeline.component-resolution-request.v1",
    framework: "react",
    capabilities: ["aria.control-semantics"],
    preferredProviders: ["project-dom"],
  };
  const resolution = resolveComponentCapabilities(componentRequest, projectRoot, capabilityRegistry, providerRegistry);
  const verificationReceipt = {
    schema: "design-pipeline.component-verification-receipt.v1",
    resolutionHash: resolution.resolutionHash,
    checks: resolution.requiredChecks.map((id) => ({ id, status: "pass", evidence: [`verification:${id}`] })),
  };
  const uses = declarations.map((component) => ({
    role: component.role,
    symbol: component.symbol,
    sourceIdentity: component.sourcePath,
    rendered: true,
    hidden: false,
    evidenceIds: ["dashboard-shot"],
  }));
  const input = {
    schema: "component-first-gate.v1",
    target: { id: "admin-web", root: ".", kind: overrides.targetKind || "production", entrypoints: ["src/app.tsx"], routes: ["/dashboard"], snapshotDigest: null },
    policy: { id: "component-first-default", version: 1, additionalComponentRoles: [], pageRequirements: { "/dashboard": ["action", "form-control", "selection", "overlay", "feedback"] } },
    stack: { request: { schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: "Build a production component-first dashboard", requested: { styling: "none", uiLibrary: overrides.uiLibrary || "react-aria" } } },
    components: { request: componentRequest, verificationReceipt, declarations },
    playground: { changeRoot: playgroundRoot, artifact: "playground.json", required: true },
    pageUsage: { routes: [{ route: "/dashboard", uses }], readiness: { level: "page-ready", scope: overrides.readinessScope || "production" } },
    evidence: { screenshots: [{ id: "dashboard-shot", path: screenshot.path, sha256: overrides.evidenceSha256 || screenshot.sha256, minWidth: 64, minHeight: 48, allowTransparent: false }] },
  };
  const artifact = write(projectRoot, "component-first.json", `${JSON.stringify(input, null, 2)}\n`);
  return { projectRoot, input, artifact: artifact.path, declarations, screenshot };
}

module.exports = { createComponentFirstFixture, rgbaPng, sha256, write };
