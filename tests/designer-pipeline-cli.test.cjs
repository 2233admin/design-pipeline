"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = process.env.DESIGN_PIPELINE_CLI_PATH || path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");

function run(args, cwd = repoRoot) {
  const child = spawnSync(process.execPath, [cli, ...args, ...(args.includes("--json") ? [] : ["--json"])], { cwd, encoding: "utf8", windowsHide: true });
  let output;
  try { output = JSON.parse(child.stdout); } catch { output = { parseError: child.stdout, stderr: child.stderr }; }
  return { ...child, output };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function sceneFixture(root) {
  const scene = {
    schema: "design-pipeline.scene-runtime.v1", id: "cli-scene", family: "scene-renderer-2d",
    adapter: { id: "pixijs-v8", version: "8.0.0", support: "companion", availability: "available" },
    foundations: { designSha256: "a".repeat(64), motionSha256: "b".repeat(64) },
    lifecycle: { owner: "app", clock: "ticker", updateLoop: "one loop", cleanupOwner: "disposer" },
    coordinateSystem: { model: "logical pixels", camera: "fit viewport" }, assets: [],
    input: { pointer: "mapped", keyboard: "mapped", touch: "mapped", focus: "semantic mirror" },
    accessibility: { semanticOverlay: "DOM mirror", keyboardFallback: "all actions", announcements: "state region", reducedMotion: "static substitute" },
    budgets: { targetFps: 60, longFrameMs: 24, memoryMb: 128, drawCalls: 200 },
    evidence: { deterministic: true, seed: 7, receiptPaths: ["evidence/scene.json"] },
    degradation: { status: "none", fallback: "semantic still" }, cleanup: { owners: ["disposer"], checks: ["stop loop"] },
  };
  writeJson(path.join(root, "scene.json"), scene);
  const headings = ["Runtime Thesis", "Lifecycle", "Coordinates and Camera", "Assets and Provenance", "Input", "Accessibility", "Performance Budgets", "Deterministic Evidence", "Degradation", "Cleanup Ownership"];
  fs.writeFileSync(path.join(root, "scene.md"), [`# Scene`, `Scene ID: \`${scene.id}\``, `DESIGN SHA-256: \`${scene.foundations.designSha256}\``, `MOTION SHA-256: \`${scene.foundations.motionSha256}\``, `Adapter: \`${scene.adapter.id}@${scene.adapter.version}\``, `Sidecar: [scene.json](./scene.json)`, ...headings.flatMap((heading) => [`## ${heading}`, "Concrete decision."])].join("\n"));
}

function fixtures(root) {
  writeJson(path.join(root, "evidence.json"), {
    schema: "design-pipeline.evidence-receipt.v1", id: "partial", status: "partial",
    adapter: { id: "fake", version: "1", availability: "available", probe: { ok: true, message: "ready" } },
    target: { url: "https://example.com", viewport: { width: 800, height: 600 } }, capturedAt: "2026-07-23T00:00:00.000Z",
    artifacts: { screenshot: null, trace: null, dom: null, console: null, network: null, accessibility: null, performance: null }, hashes: {}, redaction: { status: "not-required", notes: [] },
  });
  writeJson(path.join(root, "motion.json"), { schema: "design-pipeline.motion-verification.v1", id: "motion", primitiveId: "enter", trigger: "open", purpose: "show hierarchy", durationMs: 200, toleranceMs: 20, observedDurationMs: 205, frameCadenceMs: 16, interruption: "reverse", reducedMotion: "instant state", longFrames: [], maxLongFrameMs: 24, captureId: "fixed", deterministic: true });
  writeJson(path.join(root, "components.json"), { schema: "design-pipeline.component-state-matrix.v1", id: "matrix", entries: [{ component: "button", variant: "primary", states: ["hover", "focus", "pressed", "disabled", "loading", "empty", "error"], inputs: ["keyboard", "touch"], viewports: ["mobile", "desktop"], reducedMotion: "instant state", evidence: ["evidence.json"] }] });
  writeJson(path.join(root, "tokens.json"), { schema: "design-pipeline.design-tokens.v1", dtcgProfile: "2025.10", provenance: { source: "DESIGN.md", sha256: "a".repeat(64), license: "project" }, tokens: { accent: { $type: "color", $value: "#f50", $extensions: { "design-pipeline": { role: "color.action" } } } } });
  writeJson(path.join(root, "ui-ir.json"), { schema: "design-pipeline.ui-ir.v1", catalogVersion: "1.0.0", nodes: [{ id: "cta", componentId: "button", props: { label: "Go" }, children: [] }] });
  writeJson(path.join(root, "map.json"), { schema: "design-pipeline.design-code-map.v1", uiIrSha256: "b".repeat(64), tokenSha256: "c".repeat(64), mappings: [{ renderedId: "cta", sourcePath: "src/App.tsx", line: 1, column: 1, componentId: "button", tokenRefs: ["accent"], evidence: ["evidence.json"] }] });
  const dimensions = ["responsive", "accessibility", "palette", "motion", "scene", "component-state", "evidence"];
  const scenarios = dimensions.map((dimension, index) => ({ id: `s${index}`, operation: ["generate", "edit", "repair"][index % 3], dimension, required: true, threshold: 0.8, evidenceType: "receipt" }));
  writeJson(path.join(root, "benchmark.json"), { schema: "design-pipeline.benchmark-manifest.v1", id: "cli-benchmark", requiredDimensions: dimensions, scenarios });
  writeJson(path.join(root, "measurements.json"), { schema: "design-pipeline.benchmark-measurements.v1", benchmarkId: "cli-benchmark", measurements: Object.fromEntries(scenarios.map((scenario) => [scenario.id, { score: 0.9, evidence: ["evidence.json"] }])) });
  writeJson(path.join(root, "design-tool.json"), { schema: "design-pipeline.design-tool-receipt.v1", id: "handoff", provider: { id: "figma-host", version: "1", availability: "available" }, operation: "round-trip", status: "valid", source: { artifact: "ui-ir.json", sha256: "d".repeat(64) }, mappings: { elements: ["cta=>frame"], components: ["button=>component"], tokens: ["accent=>variable"], sourceLocations: ["frame=>src/App.tsx:1"] }, editable: true, evidence: ["evidence.json"] });
  writeJson(path.join(root, "intake.json"), { schema: "design-pipeline.adapter-intake.v1", adapterId: "candidate", source: { url: "https://github.com/example/candidate", revision: "a".repeat(40), sha256: "b".repeat(64) }, license: { state: "verified", id: "MIT", evidence: ["LICENSE"] }, maintenance: { status: "active", evidence: ["release"] }, security: { permissions: ["read-project"], network: "none", executableRemotePrompts: false, evidence: ["review"] }, adoption: { mode: "principle", updatePolicy: "re-review", removalPolicy: "remove on regression" }, score: null, decision: { requestedSupport: "companion" } });
}

test("help, doctor, foundation, and stable JSON error envelopes work", () => {
  for (const args of [["help"], ["doctor", "--root", repoRoot], ["foundation", "check", "--root", repoRoot, "--project-root", repoRoot]]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.output.schema, "design-pipeline.cli-result.v1");
    assert.equal(result.output.ok, true);
  }
  const unknown = run(["does-not-exist", "--root", repoRoot]);
  assert.equal(unknown.status, 1);
  assert.equal(unknown.output.schema, "design-pipeline.cli-result.v1");
  assert.equal(unknown.output.ok, false);
  assert.equal(unknown.output.error.code, "UNKNOWN_COMMAND");
  const unknownOption = run(["doctor", "--root", repoRoot, "--typo"]);
  assert.equal(unknownOption.status, 1);
  assert.equal(unknownOption.output.error.code, "UNKNOWN_OPTION");
  const duplicate = run(["doctor", "--root", repoRoot, "--root", repoRoot]);
  assert.equal(duplicate.status, 1);
  assert.equal(duplicate.output.error.code, "DUPLICATE_OPTION");
});

test("change init, status/resume, advance, migrate, and legacy repair are executable", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-cli-"));
  const init = run(["change", "init", "--root", root, "--change-id", "cli-change", "--change-root", "change", "--timestamp", "2026-07-23T00:00:00Z"]);
  assert.equal(init.status, 0, init.stderr || init.stdout);
  const stateFile = path.join(root, "change/state.json");
  fs.writeFileSync(path.join(root, "DESIGN.md"), "# Design foundation\n");
  fs.writeFileSync(path.join(root, "MOTION.md"), "# Motion foundation\n");
  for (const command of ["status", "resume"]) {
    const args = command === "status" ? ["status"] : ["change", "resume"];
    const result = run([...args, "--root", root, "--change-root", "change"]);
    assert.equal(result.status, 0);
    assert.equal(result.output.stateSchema, "design-pipeline.state.v2");
  }
  const advance = run(["change", "advance", "--root", root, "--change-root", "change", "--expected-sha256", sha(stateFile), "--timestamp", "2026-07-23T00:01:00Z", "--phase", "brief", "--summary", "Brief done", "--design-foundation", "DESIGN.md", "--motion-foundation", "MOTION.md", "--evidence", "qa/brief.json"]);
  assert.equal(advance.status, 0, advance.stderr || advance.stdout);
  assert.equal(advance.output.state.phase, "brief");
  assert.equal(advance.output.state.foundations.motion.sha256, sha(path.join(root, "MOTION.md")));
  assert.deepEqual(advance.output.state.evidence, ["qa/brief.json"]);

  const legacyRoot = path.join(root, "legacy"); fs.mkdirSync(legacyRoot);
  writeJson(path.join(legacyRoot, "state.json"), { schema: "design-pipeline-state.v1", changeId: "legacy-change", status: "active", stage: "merge-ready", updatedAt: "2026-07-23T00:00:00Z", nextAction: "release" });
  fs.writeFileSync(path.join(legacyRoot, "events.jsonl"), `${JSON.stringify({ ts: "2026-07-23T00:00:00Z", phase: "merge-ready", type: "legacy", summary: "old", files: [], evidence: [], nextActions: [] })}\n`);
  const migrate = run(["change", "migrate", "--root", root, "--change-root", "legacy", "--write", "--expected-sha256", sha(path.join(legacyRoot, "state.json"))]);
  assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);
  const repair = run(["change", "repair", "--root", root, "--change-root", "legacy", "--legacy-events", "--expected-sha256", sha(path.join(legacyRoot, "state.json")), "--timestamp", "2026-07-23T00:02:00Z"]);
  assert.equal(repair.status, 0, repair.stderr || repair.stdout);
  assert.equal(repair.output.event.type, "state-repair");
});

test("every P1-P3 public validation namespace is routed by the source CLI", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-cli-"));
  fixtures(root);
  const sceneRoot = path.join(root, "scene"); fs.mkdirSync(sceneRoot); sceneFixture(sceneRoot);
  const commands = [
    ["scene", "check", "--change-root", "scene"],
    ["evidence", "check", "--receipt", "evidence.json"],
    ["verify", "motion", "--receipt", "motion.json"],
    ["verify", "components", "--matrix", "components.json"],
    ["patterns", "search", "--query", "modal"],
    ["patterns", "audit"],
    ["tokens", "check", "--artifact", "tokens.json"],
    ["ui-ir", "check", "--artifact", "ui-ir.json"],
    ["design-code-map", "check", "--artifact", "map.json"],
    ["benchmark", "evaluate", "--manifest", "benchmark.json", "--measurements", "measurements.json"],
    ["adapter", "audit"],
    ["adapter", "receipt-check", "--receipt", "design-tool.json"],
    ["adapter", "intake", "--artifact", "intake.json"],
    ["style-signals", "check"],
  ];
  for (const command of commands) {
    const result = run([...command, "--root", root]);
    assert.equal(result.status, 0, `${command.join(" ")}: ${result.stderr || result.stdout}`);
    assert.equal(result.output.schema, "design-pipeline.cli-result.v1");
    assert.equal(result.output.ok, true);
  }
  const adapter = path.join(root, "fake-adapter.cjs");
  fs.writeFileSync(adapter, `const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path");let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const r=JSON.parse(s),keys=["screenshot","trace","dom","console","network","accessibility","performance"],artifacts={},hashes={};for(const k of keys){const n=k+".txt",b=Buffer.from(k);fs.writeFileSync(path.join(r.outputRoot,n),b);artifacts[k]=n;hashes[k]=crypto.createHash("sha256").update(b).digest("hex")}process.stdout.write(JSON.stringify({schema:"design-pipeline.evidence-receipt.v1",id:"cli-capture",status:"complete",adapter:{id:"fake",version:"1",availability:"available",probe:{ok:true,message:"ready"}},target:{url:r.url,viewport:r.viewport},capturedAt:"2026-07-23T00:00:00Z",artifacts,hashes,redaction:{status:"not-required",notes:[]}}))});`);
  const capture = run(["evidence", "capture", "--root", root, "--project-root", root, "--adapter-path", adapter, "--output-root", "captured", "--url", "https://example.com"]);
  assert.equal(capture.status, 0, capture.stderr || capture.stdout);
  assert.equal(capture.output.ok, true);
});

test("feedback record/prepare stay local and project paths cannot escape --root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-cli-"));
  fixtures(root);
  const record = run(["feedback", "record", "--root", root, "--kind", "pipeline-bug", "--source", "qa", "--title", "Example", "--summary", "Local example"]);
  assert.equal(record.status, 0, record.stderr || record.stdout);
  const observationPath = record.output.kernel.observationPath;
  const prepare = run(["feedback", "prepare", "--root", root, "--observation", observationPath, "--repository", "2233admin/design-pipeline"]);
  assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);
  assert.equal(prepare.output.kernel.remotePublished, false);
  const request = prepare.output.kernel.request;
  writeJson(path.join(root, "publication-receipt.json"), {
    schema: "design-pipeline.publication-receipt.v1",
    idempotencyKey: request.idempotencyKey,
    action: request.action,
    repository: request.repository,
    remote: { url: "https://github.com/2233admin/design-pipeline/issues/42", number: 42, state: "open", createdAt: "2026-07-23T00:00:00.000Z" },
  });
  const reconcile = run(["feedback", "reconcile", "--root", root, "--request", prepare.output.kernel.path, "--receipt", "publication-receipt.json"]);
  assert.equal(reconcile.status, 0, reconcile.stderr || reconcile.stdout);
  assert.equal(reconcile.output.kernel.reconciled, true);
  const escaped = run(["tokens", "check", "--root", root, "--artifact", "../outside.json"]);
  assert.equal(escaped.status, 1);
  assert.equal(escaped.output.ok, false);
  assert.match(escaped.output.error.message, /stay inside/);
});

test("new change paths cannot traverse an existing directory link", (context) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-cli-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-outside-"));
  const linked = path.join(root, "linked");
  try { fs.symlinkSync(outside, linked, process.platform === "win32" ? "junction" : "dir"); }
  catch (error) { context.skip(`directory links unavailable: ${error.code || error.message}`); return; }
  const result = run(["change", "init", "--root", root, "--change-id", "escaped-change", "--change-root", "linked/change"]);
  assert.equal(result.status, 1);
  assert.match(result.output.error.message, /resolves outside/);
  assert.equal(fs.existsSync(path.join(outside, "change")), false);
});

test("failed benchmark scenarios can enter the deduplicated local feedback loop", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-cli-"));
  fixtures(root);
  const measurementsFile = path.join(root, "measurements.json");
  const measurements = JSON.parse(fs.readFileSync(measurementsFile, "utf8"));
  measurements.measurements.s0.score = 0.1;
  writeJson(measurementsFile, measurements);

  const args = ["benchmark", "evaluate", "--root", root, "--manifest", "benchmark.json", "--measurements", "measurements.json", "--record-feedback"];
  const first = run(args);
  const second = run(args);
  assert.equal(first.status, 2, first.stderr || first.stdout);
  assert.equal(first.output.status, "failed");
  assert.equal(first.output.feedback.observation.kind, "quality-gap");
  assert.equal(second.output.feedback.observation.id, first.output.feedback.observation.id);
  assert.equal(second.output.feedback.observation.occurrences, 2);
  assert.equal(second.output.feedback.observation.privacy.remotePublished, false);
});
