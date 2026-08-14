"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { INTEGRATION_TARGETS, KINDS, checkPlayground, selectionStateSha256, surfaceContractSha256 } = require("../skill/scripts/playground-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return { path: relative.replaceAll("\\", "/"), sha256: hash(content) };
}

function htmlFixture(extra = "") {
  return Buffer.from(`<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; font-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'">
<main data-design-playground>
  <aside data-playground-controls>
    <input data-playground-control="radius">
    <select data-playground-control="density"></select>
    <input data-playground-control="outlined">
    <button data-playground-preset="calm"></button>
    <button data-playground-preset="compact"></button>
    <button data-playground-preset="bold"></button>
  </aside>
  <section data-playground-preview></section>
  <output data-playground-prompt></output>
  <button data-playground-copy></button>
</main>
<script>
const state = { radius: 12, density: "balanced", outlined: true };
const controls = document.querySelectorAll("[data-playground-control]");
const presets = document.querySelectorAll("[data-playground-preset]");
const presetValues = {
  calm: { radius: 12, density: "airy", outlined: true },
  compact: { radius: 8, density: "compact", outlined: true },
  bold: { radius: 20, density: "balanced", outlined: false }
};
function renderPreview() { document.querySelector("[data-playground-preview]").dataset.radius = state.radius; }
function updatePrompt() { document.querySelector("[data-playground-prompt]").textContent = "Update the card radius to " + state.radius + "px."; }
function updateAll() { renderPreview(); updatePrompt(); }
function syncControl(control) { state[control.dataset.playgroundControl] = control.type === "checkbox" ? control.checked : control.value; }
controls.forEach((control) => {
  control.addEventListener("input", () => { syncControl(control); updateAll(); });
  control.addEventListener("change", () => { syncControl(control); updateAll(); });
});
presets.forEach((preset) => preset.addEventListener("click", () => {
  Object.assign(state, presetValues[preset.dataset.playgroundPreset]);
  updateAll();
}));
document.querySelector("[data-playground-copy]").addEventListener("click", () => navigator.clipboard.writeText(document.querySelector("[data-playground-prompt]").textContent));
</script>${extra}`);
}

function requiredFixture(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "design-playground-"));
  const root = path.join(parent, "tune-card");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const artifact = write(root, "playground/index.html", htmlFixture());
  const controls = [
    { id: "radius", label: "Corner radius", group: "Shape", type: "range", default: 12, min: 0, max: 32, step: 1 },
    { id: "density", label: "Density", group: "Layout", type: "select", default: "balanced", options: ["airy", "balanced", "compact"] },
    { id: "outlined", label: "Outlined", group: "Material", type: "checkbox", default: true },
  ];
  const receipt = {
    schema: "design-pipeline.playground.v1",
    changeId: "tune-card",
    applicability: {
      status: "required",
      reason: "parameter-sensitive",
      rationale: "Radius, density, and material need to be judged together on the real component.",
    },
    surface: {
      kind: "component",
      blueprint: { source: "builtin", id: "design-playground" },
      title: "Settings card",
      context: "Tune the repeated settings card without changing its information architecture.",
      artifact,
      controls,
      presets: [
        { id: "calm", name: "Calm", values: { radius: 12, density: "airy", outlined: true } },
        { id: "compact", name: "Compact", values: { radius: 8, density: "compact", outlined: true } },
        { id: "bold", name: "Bold", values: { radius: 20, density: "balanced", outlined: false } },
      ],
    },
    selection: { status: "pending", values: null, changedControlIds: [], stateSha256: null, prompt: null },
    verification: { status: "pending", method: null, checkedAt: null, surfaceSha256: null, checks: null, evidence: null },
    integration: { status: "pending", target: null },
  };
  fs.writeFileSync(path.join(root, "playground.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  return { root, receipt };
}

function passVerification(root, receipt) {
  const checks = {
    everyControlUpdatesState: true,
    everyPresetAppliesDeclaredState: true,
    previewUpdatesImmediately: true,
    promptUpdatesImmediately: true,
    copyMatchesPrompt: true,
    keyboardOperable: true,
  };
  const report = {
    schema: "design-pipeline.playground-verification.v1",
    changeId: receipt.changeId,
    method: "browser",
    checkedAt: "2026-08-14T08:00:00.000Z",
    surfaceSha256: surfaceContractSha256(receipt.surface),
    checks,
  };
  const evidence = write(root, "playground/verification.json", `${JSON.stringify(report, null, 2)}\n`);
  receipt.verification = { status: "passed", method: report.method, checkedAt: report.checkedAt, surfaceSha256: report.surfaceSha256, checks, evidence };
}

test("gates build, selected state, natural-language handoff, and routed integration", (t) => {
  const { root, receipt } = requiredFixture(t);
  assert.equal(checkPlayground(root, { stage: "build" }).status, "ready");
  const pending = checkPlayground(root, { stage: "selection" });
  assert.ok(pending.reasons.includes("playground-verification-pending"));
  assert.ok(pending.reasons.includes("playground-selection-pending"));
  passVerification(root, receipt);

  const prompt = write(
    root,
    "playground/selection-prompt.md",
    "Update the repeated settings card to use compact spacing and an 8px corner radius while preserving its outlined material and existing information architecture.\n",
  );
  const values = { radius: 8, density: "compact", outlined: true };
  const changedControlIds = ["radius", "density"];
  receipt.selection = {
    status: "selected",
    values,
    changedControlIds,
    stateSha256: selectionStateSha256(receipt.surface, values, changedControlIds),
    prompt,
  };
  fs.writeFileSync(path.join(root, "playground.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(checkPlayground(root, { stage: "selection" }).status, "ready");
  assert.equal(checkPlayground(root, { stage: "integration" }).reason, "playground-integration-pending");

  const design = write(root, "design.md", `# Settings card design

playground-kind: component
playground-artifact-sha256: ${receipt.surface.artifact.sha256}
playground-state-sha256: ${receipt.selection.stateSha256}
playground-prompt-sha256: ${prompt.sha256}
`);
  receipt.integration = { status: "applied", target: design };
  fs.writeFileSync(path.join(root, "playground.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  assert.equal(checkPlayground(root, { stage: "integration" }).status, "ready");

  const cli = execute(["playground", "check", "--root", path.dirname(root), "--change-root", root, "--stage", "integration", "--json"]);
  assert.equal(cli.exitCode, 0);
  assert.equal(cli.output.status, "ready");
});

test("blocks external dependencies, hash drift, and missing live bindings", (t) => {
  const { root, receipt } = requiredFixture(t);
  const html = htmlFixture('<script src="https://example.com/runtime.js"></script>');
  fs.writeFileSync(path.join(root, "playground/index.html"), html);
  receipt.surface.artifact.sha256 = hash(html);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-external-dependency"));

  const relativeAsset = htmlFixture('<img src="./preview.png" alt="">');
  fs.writeFileSync(path.join(root, "playground/index.html"), relativeAsset);
  receipt.surface.artifact.sha256 = hash(relativeAsset);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-external-dependency"));

  fs.appendFileSync(path.join(root, "playground/index.html"), "drift");
  assert.ok(checkPlayground(root).reasons.includes("playground-hash-mismatch"));

  const noLiveUpdate = Buffer.from(htmlFixture().toString("utf8").replaceAll("updateAll", "renderOnly"));
  fs.writeFileSync(path.join(root, "playground/index.html"), noLiveUpdate);
  receipt.surface.artifact.sha256 = hash(noLiveUpdate);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-live-update-missing"));

  const noStateWrite = Buffer.from(htmlFixture().toString("utf8").replace("state[control.dataset.playgroundControl] =", "void"));
  fs.writeFileSync(path.join(root, "playground/index.html"), noStateWrite);
  receipt.surface.artifact.sha256 = hash(noStateWrite);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-live-update-missing"));
});

test("derives non-default controls instead of trusting a stale selection", (t) => {
  const { root, receipt } = requiredFixture(t);
  passVerification(root, receipt);
  receipt.selection = {
    status: "selected",
    values: { radius: 8, density: "compact", outlined: true },
    changedControlIds: ["density"],
    stateSha256: "a".repeat(64),
    prompt: write(root, "playground/selection-prompt.md", "Update the settings card to use compact spacing and tighter corners while retaining the existing outlined treatment.\n"),
  };
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.throws(() => checkPlayground(root, { stage: "selection" }), /exactly match non-default controls/);
});

test("binds the canonical selected state and only the governed target", (t) => {
  const { root, receipt } = requiredFixture(t);
  passVerification(root, receipt);
  const prompt = write(root, "playground/selection-prompt.md", "Update the settings card to use compact spacing and tighter corners while retaining the existing outlined treatment.\n");
  const values = { radius: 8, density: "compact", outlined: true };
  const changedControlIds = ["radius", "density"];
  receipt.selection = {
    status: "selected",
    values,
    changedControlIds,
    stateSha256: selectionStateSha256(receipt.surface, values, changedControlIds),
    prompt,
  };
  const text = `playground-kind: component\nplayground-artifact-sha256: ${receipt.surface.artifact.sha256}\nplayground-state-sha256: ${receipt.selection.stateSha256}\nplayground-prompt-sha256: ${prompt.sha256}\n`;
  const notes = write(root, "notes.md", text);
  receipt.integration = { status: "applied", target: notes };
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root, { stage: "integration" }).reasons.includes("playground-integration-target-invalid"));

  const design = write(root, "design.md", text);
  receipt.integration.target = design;
  receipt.selection.values.radius = 20;
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.throws(() => checkPlayground(root, { stage: "integration" }), /canonical selected state/);
});

test("requires restrictive CSP and rejects active network APIs", (t) => {
  const { root, receipt } = requiredFixture(t);
  const withoutCsp = Buffer.from(htmlFixture().toString("utf8").replace(/<meta http-equiv="Content-Security-Policy"[^>]+>\n/, ""));
  fs.writeFileSync(path.join(root, "playground/index.html"), withoutCsp);
  receipt.surface.artifact.sha256 = hash(withoutCsp);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-csp-incomplete"));

  const withFetch = htmlFixture("<script>fetch('/tracking')</script>");
  fs.writeFileSync(path.join(root, "playground/index.html"), withFetch);
  receipt.surface.artifact.sha256 = hash(withFetch);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-external-dependency"));

  const permissiveCsp = htmlFixture().toString("utf8").replace("connect-src 'none'", "connect-src 'none' https:");
  const permissiveBytes = Buffer.from(permissiveCsp);
  fs.writeFileSync(path.join(root, "playground/index.html"), permissiveBytes);
  receipt.surface.artifact.sha256 = hash(permissiveBytes);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-csp-incomplete"));

  const remoteScriptCsp = htmlFixture('<script type="module">import "https://example.com/module.js"</script>').toString("utf8").replace("script-src 'unsafe-inline'", "script-src 'unsafe-inline' https:");
  const remoteScriptBytes = Buffer.from(remoteScriptCsp);
  fs.writeFileSync(path.join(root, "playground/index.html"), remoteScriptBytes);
  receipt.surface.artifact.sha256 = hash(remoteScriptBytes);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  const remote = checkPlayground(root);
  assert.ok(remote.reasons.includes("playground-csp-incomplete"));
  assert.ok(remote.reasons.includes("playground-external-dependency"));

  const overrideCsp = Buffer.from(htmlFixture().toString("utf8").replace("manifest-src 'none'", "manifest-src 'none'; script-src-elem 'unsafe-inline' https:"));
  fs.writeFileSync(path.join(root, "playground/index.html"), overrideCsp);
  receipt.surface.artifact.sha256 = hash(overrideCsp);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-csp-incomplete"));
});

test("blocks selection until browser behavior evidence is hash-bound", (t) => {
  const { root, receipt } = requiredFixture(t);
  const prompt = write(root, "playground/selection-prompt.md", "Update the settings card to use compact spacing and tighter corners while retaining the existing outlined treatment.\n");
  const values = { radius: 8, density: "compact", outlined: true };
  const changedControlIds = ["radius", "density"];
  receipt.selection = {
    status: "selected",
    values,
    changedControlIds,
    stateSha256: selectionStateSha256(receipt.surface, values, changedControlIds),
    prompt,
  };
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root, { stage: "selection" }).reasons.includes("playground-verification-pending"));
});

test("rejects stale browser evidence after the HTML or control contract changes", (t) => {
  const { root, receipt } = requiredFixture(t);
  passVerification(root, receipt);
  const prompt = write(root, "playground/selection-prompt.md", "Update the settings card to use compact spacing and tighter corners while retaining the existing outlined treatment.\n");
  const values = { radius: 8, density: "compact", outlined: true };
  const changedControlIds = ["radius", "density"];
  receipt.selection = {
    status: "selected",
    values,
    changedControlIds,
    stateSha256: selectionStateSha256(receipt.surface, values, changedControlIds),
    prompt,
  };
  const changedHtml = Buffer.concat([fs.readFileSync(path.join(root, "playground/index.html")), Buffer.from("\n<!-- changed -->\n")]);
  fs.writeFileSync(path.join(root, "playground/index.html"), changedHtml);
  receipt.surface.artifact.sha256 = hash(changedHtml);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root, { stage: "selection" }).reasons.includes("playground-verification-invalid"));
});

for (const [kind, targetName] of [
  ["code-map", "handoff.md"],
  ["concept-map", "brief.md"],
  ["game-balance", "scene.md"],
  ["motion", "motion.md"],
  ["diff-review", "qa.md"],
]) {
  test(`routes ${kind} playground output to ${targetName}`, (t) => {
    const { root, receipt } = requiredFixture(t);
    receipt.surface.kind = kind;
    receipt.surface.blueprint.id = kind === "motion" ? "design-playground" : kind;
    receipt.applicability.reason = "interaction-better-than-text";
    passVerification(root, receipt);
    const prompt = write(
      root,
      "playground/selection-prompt.md",
      `Apply the selected ${kind} state while preserving the declared product constraints and all unaffected behavior.\n`,
    );
    const values = { radius: 8, density: "compact", outlined: true };
    const changedControlIds = ["radius", "density"];
    receipt.selection = {
      status: "selected",
      values,
      changedControlIds,
      stateSha256: selectionStateSha256(receipt.surface, values, changedControlIds),
      prompt,
    };
    const bindings = `playground-kind: ${kind}\nplayground-artifact-sha256: ${receipt.surface.artifact.sha256}\nplayground-state-sha256: ${receipt.selection.stateSha256}\nplayground-prompt-sha256: ${prompt.sha256}\n`;
    receipt.integration = { status: "applied", target: write(root, targetName, bindings) };
    fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
    assert.equal(checkPlayground(root, { stage: "integration" }).status, "ready");

    receipt.integration.target = write(root, "design.md", bindings);
    fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
    if (targetName !== "design.md") {
      assert.ok(checkPlayground(root, { stage: "integration" }).reasons.includes("playground-integration-target-invalid"));
    }
  });
}

test("accepts a change-local blueprint for a new playground kind", (t) => {
  const { root, receipt } = requiredFixture(t);
  const blueprint = write(root, "playground/user-journey-blueprint.md", `# User Journey Blueprint

## Required Surface

Show stages, actors, touchpoints, and recoverable failure paths.

## State And Output

Persist selected stages and emit a contextual implementation prompt.

## QA

Verify keyboard operation, empty states, and prompt synchronization.
`);
  receipt.surface.kind = "user-journey";
  receipt.surface.blueprint = {
    source: "change",
    id: "user-journey",
    artifact: blueprint,
    integrationTarget: "handoff.md",
  };
  receipt.applicability.reason = "interaction-better-than-text";
  passVerification(root, receipt);
  const prompt = write(root, "playground/selection-prompt.md", "Apply the selected user journey stages while preserving recovery paths and all unaffected product behavior.\n");
  const values = { radius: 8, density: "compact", outlined: true };
  const changedControlIds = ["radius", "density"];
  receipt.selection = {
    status: "selected",
    values,
    changedControlIds,
    stateSha256: selectionStateSha256(receipt.surface, values, changedControlIds),
    prompt,
  };
  const target = write(root, "handoff.md", `playground-kind: user-journey\nplayground-artifact-sha256: ${receipt.surface.artifact.sha256}\nplayground-state-sha256: ${receipt.selection.stateSha256}\nplayground-prompt-sha256: ${prompt.sha256}\n`);
  receipt.integration = { status: "applied", target };
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  const result = checkPlayground(root, { stage: "integration" });
  assert.equal(result.status, "ready");
  assert.equal(result.blueprint.id, "user-journey");

  const changedBlueprint = `${fs.readFileSync(path.join(root, blueprint.path), "utf8")}\nA newly governed decision.\n`;
  fs.writeFileSync(path.join(root, blueprint.path), changedBlueprint);
  receipt.surface.blueprint.artifact.sha256 = hash(changedBlueprint);
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root, { stage: "selection" }).reasons.includes("playground-verification-invalid"));
});

test("rejects incomplete or stale change-local blueprints", (t) => {
  const { root, receipt } = requiredFixture(t);
  receipt.surface.blueprint.id = "code-map";
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.throws(() => checkPlayground(root), /no builtin blueprint route matches/);

  const blueprint = write(root, "playground/incomplete.md", "# Incomplete Blueprint\n\n## Required Surface\n\nOnly one section.\n");
  receipt.surface.kind = "workflow-builder";
  receipt.surface.blueprint = { source: "change", id: "workflow-builder", artifact: blueprint, integrationTarget: "handoff.md" };
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify(receipt));
  assert.ok(checkPlayground(root).reasons.includes("playground-blueprint-incomplete"));

  fs.appendFileSync(path.join(root, blueprint.path), "\nchanged\n");
  assert.ok(checkPlayground(root).reasons.includes("playground-hash-mismatch"));
});

test("accepts a closed, explicit waiver", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "design-playground-waiver-"));
  const root = path.join(parent, "fix-copy");
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "playground.json"), JSON.stringify({
    schema: "design-pipeline.playground.v1",
    changeId: "fix-copy",
    applicability: { status: "waived", reason: "non-visual", rationale: "This change only corrects existing copy." },
    surface: null,
    selection: { status: "waived", values: null, changedControlIds: [], stateSha256: null, prompt: null },
    verification: { status: "waived", method: null, checkedAt: null, surfaceSha256: null, checks: null, evidence: null },
    integration: { status: "waived", target: null },
  }));
  const result = checkPlayground(root, { stage: "integration" });
  assert.equal(result.status, "ready");
  assert.equal(result.applicable, false);
});

test("publishes the playground contract, schema, and checker", () => {
  const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
  for (const resource of [
    "references/playground.md",
    "references/playground.schema.json",
    "references/playground-blueprints.json",
    "references/playground-templates/code-map.md",
    "references/playground-templates/concept-map.md",
    "references/playground-templates/data-explorer.md",
    "references/playground-templates/design-playground.md",
    "references/playground-templates/diff-review.md",
    "references/playground-templates/document-critique.md",
    "references/playground-templates/game-balance.md",
    "scripts/playground-core.cjs",
  ]) assert.ok(resources.required.includes(resource), resource);
});

test("packages actionable blueprints for every named playground family", () => {
  const templates = [
    "code-map.md",
    "concept-map.md",
    "data-explorer.md",
    "design-playground.md",
    "diff-review.md",
    "document-critique.md",
    "game-balance.md",
  ];
  for (const name of templates) {
    const text = fs.readFileSync(path.join(repoRoot, "skill/references/playground-templates", name), "utf8");
    for (const heading of ["## Required Surface", "## State And Output", "## QA"]) {
      assert.match(text, new RegExp(`^${heading}$`, "m"), `${name}: ${heading}`);
    }
  }
  const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/playground-blueprints.json"), "utf8"));
  assert.equal(registry.schema, "design-pipeline.playground-blueprints.v1");
  assert.deepEqual(KINDS, registry.routes.map((route) => route.kind));
  assert.deepEqual(INTEGRATION_TARGETS, Object.fromEntries(registry.routes.map((route) => [route.kind, route.integrationTarget])));
  assert.equal(new Set(KINDS).size, KINDS.length);
  for (const route of registry.routes) {
    assert.ok(registry.allowedIntegrationTargets.includes(route.integrationTarget));
    assert.ok(fs.existsSync(path.join(repoRoot, "skill", route.path)), route.path);
  }
});
