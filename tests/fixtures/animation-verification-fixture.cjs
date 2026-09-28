"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createSourceAdmission } = require("../../skill/scripts/source-admission-core.cjs");
const { createAdmittedSourceSnapshot } = require("../../skill/scripts/admitted-source-snapshot-core.cjs");
const { createDeployProfile } = require("../../skill/scripts/deploy-profile-core.cjs");
const { createDynamicDesignComposition } = require("../../skill/scripts/dynamic-design-composition-core.cjs");
const { createArtifactMetadata } = require("../../skill/scripts/artifact-core.cjs");
const { resolveExecutionTarget, prepareExecutionTarget, finalizeExecutionTarget, OUTCOME_SCHEMA } = require("../../skill/scripts/execution-target-core.cjs");
const { ANIMATION_JOB_SCHEMA, LIFECYCLE_ADAPTER_SCHEMA, MOTION_GRAPH_SCHEMA, createAnimationJob, createLifecycleAdapter } = require("../../skill/scripts/motion-foundation-core.cjs");
const captureScript = path.resolve(__dirname, "../../skill/scripts/capture-web-evidence.cjs");
const { sha256, canonicalJson } = require("../../skill/scripts/contract-utils.cjs");
const { evaluateMotion } = require("../../skill/scripts/motion-evidence-core.cjs");
const CASES = Object.freeze([
  { id: "latch-paper", mechanism: "latch", skin: "paper", durationMs: 480 },
  { id: "rail-glass", mechanism: "rail", skin: "glass", durationMs: 600 },
]);

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

class SyntheticAnimationFixture {
  constructor(spec) {
    this.spec = { ...spec };
    this.durationMs = spec.durationMs;
    this.mounted = false;
    this.disposed = false;
    this.reset();
  }

  reset() {
    this.state = {
      mechanism: this.spec.mechanism,
      skin: this.spec.skin,
      phase: "rest",
      position: 0,
      scroll: 0,
      pointerX: 0,
      pointerY: 0,
      inputCount: 0,
    };
    this.disposed = false;
    return this.snapshot();
  }

  seek(timeMs) {
    const clamped = Math.max(0, Math.min(this.durationMs, timeMs));
    const progress = this.durationMs === 0 ? 1 : clamped / this.durationMs;
    const eased = 1 - ((1 - progress) ** 2);
    this.state.position = Number(eased.toFixed(6));
    this.state.phase = progress === 0 ? "rest" : (progress === 1 ? "settled" : "moving");
    return this.snapshot();
  }

  settle() {
    return this.seek(this.durationMs);
  }

  snapshot() {
    return copy(this.state);
  }

  applyInput(event) {
    if (this.disposed) return this.snapshot();
    this.state.inputCount += 1;
    switch (event.type) {
      case "pointer":
        this.state.pointerX = event.x;
        this.state.pointerY = event.y;
        this.state.phase = event.action === "up" ? "settled" : "grabbed";
        break;
      case "drag":
        this.state.pointerX = event.x;
        this.state.pointerY = event.y;
        this.state.position = Number(Math.max(0, Math.min(1, event.x / 100)).toFixed(6));
        this.state.phase = event.phase === "end" ? "settled" : "dragging";
        break;
      case "wheel":
      case "scroll":
        this.state.scroll = Number((this.state.scroll + (event.deltaY || event.deltaX || 0)).toFixed(6));
        this.state.phase = "scrolled";
        break;
      case "keyboard":
        this.state.phase = event.key === "Enter" ? "expanded" : "focused";
        break;
      case "touch":
        this.state.pointerX = event.x;
        this.state.pointerY = event.y;
        this.state.phase = "touched";
        break;
      default:
        break;
    }
    return this.snapshot();
  }

  mount() {
    this.mounted = true;
    this.disposed = false;
    return this.snapshot();
  }

  dispose() {
    this.disposed = true;
    this.mounted = false;
    return this.snapshot();
  }

  metrics() {
    return {
      mounted: this.mounted,
      disposed: this.disposed,
      listeners: this.mounted && !this.disposed ? 4 : 0,
      timers: this.mounted && !this.disposed ? 1 : 0,
      raf: this.mounted && !this.disposed ? 1 : 0,
      resources: this.mounted && !this.disposed ? 1 : 0,
      observers: this.mounted && !this.disposed ? 1 : 0,
      subscriptions: this.mounted && !this.disposed ? 1 : 0,
    };
  }
}
function createAnimationFixture(spec = CASES[0]) {
  const selected = typeof spec === "string" ? CASES.find((entry) => entry.id === spec) : spec;
  if (!selected) throw new Error(`unknown synthetic animation fixture: ${spec}`);
  return new SyntheticAnimationFixture(selected);
}

function createAnimationFixtures() {
  return CASES.map((spec) => createAnimationFixture(spec));
}


function receiptHash(receipt) {
  return `sha256:${sha256(canonicalJson(receipt))}`;
}
function git(root, ...args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function writeFixtureAdapter(file) {
  fs.writeFileSync(file, `const crypto=require("node:crypto");const fs=require("node:fs");const path=require("node:path");let input="";process.stdin.setEncoding("utf8");process.stdin.on("data",c=>input+=c);process.stdin.on("end",()=>{const r=JSON.parse(input);const keys=["screenshot","trace","dom","console","network","accessibility","performance"];const artifacts={};const hashes={};for(const k of keys){const n=k+".txt";const b=Buffer.from(k+String.fromCharCode(10));fs.writeFileSync(path.join(r.outputRoot,n),b);artifacts[k]=n;hashes[k]=crypto.createHash("sha256").update(b).digest("hex");}process.stdout.write(JSON.stringify({schema:"design-pipeline.evidence-receipt.v1",id:"capture-native",status:"complete",executionReceiptId:r.executionReceiptId,executionPlanSha256:r.executionPlanSha256,compositionReceiptId:r.compositionReceiptId,compositionReceiptHash:r.compositionReceiptHash,sourceAdmissionReceiptId:r.sourceAdmissionReceiptId,sourceContentHash:r.sourceContentHash,routeId:r.routeId,toolchainPlanSha256:r.toolchainPlanSha256,adapter:{id:"fixture-adapter",version:"1",availability:"available",probe:{ok:true,message:"ready"}},target:{url:r.url,viewport:r.viewport},capturedAt:"2026-09-18T00:00:00.000Z",artifacts,hashes,redaction:{status:"not-required",notes:[]}}));});`);
}
function captureNative(options) {
  const args = ["--project-root", options.projectRoot, "--adapter-path", options.adapterPath, "--output-root", options.outputRoot, "--url", options.url];
  for (const [key, flag] of [["executionReceiptId", "--execution-receipt-id"], ["executionPlanSha256", "--execution-plan-sha256"], ["compositionReceiptId", "--composition-receipt-id"], ["compositionReceiptHash", "--composition-receipt-hash"], ["sourceAdmissionReceiptId", "--source-admission-receipt-id"], ["sourceContentHash", "--source-content-hash"], ["routeId", "--route-id"], ["toolchainPlanSha256", "--toolchain-plan-sha256"]]) args.push(flag, options[key]);
  const result = spawnSync(process.execPath, [captureScript, ...args], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`capture failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout).receipt;
}

function motionReceipt(captureId) {
  const graph = { schema: MOTION_GRAPH_SCHEMA, id: "fixture-graph", durationMs: 1000, tracks: [{ id: "progress", subject: "panel", property: "progress", from: 0, to: 1, startMs: 0, durationMs: 1000 }], responses: [], semanticCarrier: "panel", reducedMotion: { mode: "resting-state", description: "show the authored resting state" } };
  const deterministic = { seed: 7, input: { mode: "preview" }, viewport: { width: 320, height: 240 }, dpr: 1, reducedMotion: false };
  const budgets = { object: { applicable: true, max: 10 }, particle: { applicable: false }, texture: { applicable: false }, frame: { applicable: true, maxMs: 16.7, targetFps: 60, maxLongFrames: 3, maxInputLatencyMs: 100, maxCpuMs: 8 } };
  const lifecycleAdapter = createLifecycleAdapter({ schema: LIFECYCLE_ADAPTER_SCHEMA, id: "fixture-lifecycle", renderer: "dom", handlers: { init() {}, resize() {}, update() {}, render() {}, dispose() {} }, ownership: { owner: "motion-evidence", resources: [{ id: "frame-loop", kind: "frame-loop", owner: "motion-evidence", disposable: true }] }, containment: { root: "#root", boundary: "job-owned" }, cleanup: { observable: true, checks: ["frame loop released"] } });
  const job = createAnimationJob({ schema: ANIMATION_JOB_SCHEMA, id: "fixture-job", motionGraph: graph, deterministic, mechanism: { purpose: "continuity", subject: "panel", channels: ["progress"] }, skin: { tokens: { accent: "blue" } }, renderer: { kind: "dom", adapterId: lifecycleAdapter.contract.id }, lifecycle: lifecycleAdapter.contract, budgets, lifecycleAdapter });
  return { schema: "design-pipeline.motion-verification.v1", id: "motion-native", primitiveId: "panel-enter", trigger: "panel opens", purpose: "preserve spatial continuity and expose hierarchy", durationMs: 240, toleranceMs: 20, observedDurationMs: 248, frameCadenceMs: 16.67, interruption: "reverses from current progress", reducedMotion: "instant opacity state change", longFrames: [{ atMs: 120, durationMs: 18 }], maxLongFrameMs: 24, captureId, deterministic: true, animationJob: job.contract, motionGraph: graph, deterministicInputs: deterministic, performanceBudgets: budgets, lifecycleAdapter: lifecycleAdapter.contract, sampledFrames: [{ timeMs: 0, stateHash: "start" }, { timeMs: 1000, stateHash: "end" }] };
}

async function createReceiptChainFixture(id = CASES[0].id) {
  const spec = CASES.find((entry) => entry.id === id);
  if (!spec) throw new Error(`unknown synthetic animation fixture: ${id}`);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `design-pipeline-animation-${spec.id}-`));
  const projectRoot = path.join(root, "project");
  const sourceRoot = path.join(root, "source");
  const artifactRoot = path.join(root, "artifacts");
  const snapshotTargetRoot = path.join(root, "snapshot-target");
  const companionWorkspaceRoot = path.join(root, "companion");
  fs.mkdirSync(projectRoot, { recursive: true });
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.mkdirSync(snapshotTargetRoot, { recursive: true });
  fs.writeFileSync(path.join(projectRoot, "README.txt"), `native animation fixture ${spec.id}\n`);
  fs.writeFileSync(path.join(sourceRoot, "animation-source.txt"), `source ${spec.id}\n`);
  git(projectRoot, "init", "-q");
  git(projectRoot, "config", "user.email", "fixture@example.com");
  git(projectRoot, "config", "user.name", "Animation Fixture");
  git(projectRoot, "add", ".");
  git(projectRoot, "commit", "-qm", "fixture baseline");
  const routeId = "native-animation-route";
  const toolchainPlan = { schema: "design-pipeline.toolchain-plan.v1", status: "ready", primaryRouteId: routeId, tools: [{ id: routeId, source: "fixture", mode: "native", status: "ready" }] };
  const toolchainPlanSha256 = sha256(canonicalJson(toolchainPlan));
  const executionId = `execution-${spec.id}`;
  const request = { schema: "design-pipeline.execution-request.v1", id: executionId, toolchainPlanSha256, preferredMode: "worktree", isolation: "required", routeId, slices: [{ id: "animation", owner: routeId, scope: ["README.txt"] }] };
  const worktreeBase = path.join(root, "worktrees");
  const plan = resolveExecutionTarget(request, { projectRoot, toolchainPlan, worktreeBase });
  const state = prepareExecutionTarget(plan, { worktreeBase });
  fs.writeFileSync(path.join(state.executionRoot, "README.txt"), `native animation fixture ${spec.id} updated\n`);
  git(state.executionRoot, "add", "README.txt");
  git(state.executionRoot, "commit", "-qm", "fixture execution");
  const sourceContentHash = sha256(fs.readFileSync(path.join(sourceRoot, "animation-source.txt")));
  const companionWorkspacePolicy = { schema: "design-pipeline.companion-workspace-policy.v1", retentionWindowMs: 86400000, maxSnapshots: 3, disposeOnFailure: true, recoveryFromPartialStaging: "remove-staging-preserve-published" };
  const admissionId = `admission-${spec.id}`;
  const deploy = createDeployProfile({ id: `deploy-${spec.id}`, receiptId: `deploy-receipt-${spec.id}`, status: "ready", executionTarget: { id: executionId, receiptId: executionId }, sourceAdmissionReceiptId: admissionId, sourceContentHash, routeId, toolchainPlanSha256, source: { root: sourceRoot, allowlist: ["animation-source.txt"], exclude: [] }, target: { root: artifactRoot, allowlist: ["runtime.js", "final.js"], exclude: [] }, operations: { commands: [], lifecycleHooks: [], packageScripts: [] }, sandbox: { workspaceRoot: companionWorkspaceRoot, mode: "contained", network: { mode: "none", hosts: [] } } });
  fs.mkdirSync(path.join(root, "sandbox"), { recursive: true });
  const outcome = { schema: OUTCOME_SCHEMA, status: "complete", invocation: { command: ["fixture", "animation"], exitCode: 0 }, completedAt: new Date(Date.parse(state.startedAt) + 1000).toISOString(), evidenceReceipts: [], notes: ["native fixture execution" ] };
  const executionReceipt = finalizeExecutionTarget(plan, state, outcome, { worktreeBase, requireLineageBindings: true, sourceAdmissionReceiptId: admissionId, sourceContentHash, routeId, toolchainPlanSha256, toolchainPlan });
  const admission = createSourceAdmission({ id: admissionId, receiptId: admissionId, source: { kind: "local", identity: `fixture://${spec.id}`, revision: `revision-${spec.id}`, contentHash: sourceContentHash }, provenance: { status: "verified", evidence: ["fixture-source"] }, license: { status: "verified", evidence: ["fixture-license"] }, status: "admitted", admission: "admitted", promotion: { status: "governed", deployProfileId: deploy.id, executionTargetId: executionId, sourceContentHash }, routeId, toolchainPlanSha256, validation: { executionTarget: executionReceipt, executionReceipt, deployProfile: deploy } });
  const snapshotResult = createAdmittedSourceSnapshot({ id: `snapshot-${spec.id}`, admissionReceiptId: admission.receiptId, companionWorkspaceRoot, materializedPath: path.join(companionWorkspaceRoot, "materialized"), sourceRoot, targetRoot: snapshotTargetRoot, source: admission.source, admissionReceipt: admission.receipt, companionWorkspacePolicy });
  const snapshot = snapshotResult.snapshot;
  const source = admission.source;
  const runtimeFile = path.join(artifactRoot, "runtime.js");
  fs.writeFileSync(runtimeFile, `runtime ${spec.id}\n`);
  const runtimeInputs = { source: `sha256:${source.contentHash}`, admission: receiptHash(admission), admittedSnapshot: receiptHash(snapshot), executionReceipt: receiptHash(executionReceipt), deployProfile: receiptHash(deploy) };
  const runtime = createArtifactMetadata({ path: "runtime.js", producer: "native-animation-runtime", input_hashes: runtimeInputs, dependencies: ["motion-native"], created_at: "2026-09-18T00:00:00.000Z", required: true }, { changeRoot: artifactRoot });
  const runtimeBinding = { id: "runtime", receiptId: "runtime-receipt", status: "ready", contentHash: receiptHash(runtime), upstreamReceiptId: deploy.receiptId, receipt: runtime };
  const compositionResult = createDynamicDesignComposition({ id: `composition-${spec.id}`, receiptId: `composition-receipt-${spec.id}`, status: "ready", renderer: { kind: "dom", adapterId: "fixture-adapter" }, scene: { id: "fixture-scene", subject: "panel", elements: ["panel"] }, motion: { channels: ["progress"], interactions: [{ id: "open", type: "transition", trigger: "panel opens" }], reducedMotion: "instant opacity state change" }, evidenceRefs: [{ id: runtimeBinding.id, receiptId: runtimeBinding.receiptId, contentHash: runtimeBinding.contentHash }] });
  const composition = { id: compositionResult.composition.id, receiptId: compositionResult.composition.receiptId, status: compositionResult.composition.status, contentHash: receiptHash(compositionResult.composition), upstreamReceiptId: runtimeBinding.receiptId, receipt: compositionResult.composition };
  const adapterPath = path.join(projectRoot, "fixture-capture-adapter.cjs");
  writeFixtureAdapter(adapterPath);
  const evidenceRoot = path.join(projectRoot, "evidence");
  const captureReceipt = captureNative({ projectRoot, adapterPath, outputRoot: evidenceRoot, url: "https://example.com", executionReceiptId: executionReceipt.id, executionPlanSha256: executionReceipt.executionPlanSha256, compositionReceiptId: composition.receipt.id, compositionReceiptHash: composition.contentHash, sourceAdmissionReceiptId: admission.receiptId, sourceContentHash: source.contentHash, routeId, toolchainPlanSha256 });
  const captureBinding = { id: captureReceipt.id, receiptId: captureReceipt.id, status: captureReceipt.status, contentHash: receiptHash(captureReceipt), upstreamReceiptId: executionReceipt.id, receipt: captureReceipt };
  const gateReceipt = motionReceipt(captureReceipt.id);
  const gate = { id: gateReceipt.id, receiptId: gateReceipt.id, status: evaluateMotion(gateReceipt).status, contentHash: receiptHash(gateReceipt), upstreamReceiptId: captureBinding.receiptId, receipt: gateReceipt };
  const finalFile = path.join(artifactRoot, "final.js");
  fs.writeFileSync(finalFile, `final ${spec.id}\n`);
  const finalArtifact = createArtifactMetadata({ path: "final.js", producer: "native-animation-final", input_hashes: { source: `sha256:${source.contentHash}`, runtime: runtime.artifact_hash, composition: composition.contentHash, capture: captureBinding.contentHash, gate: gate.contentHash }, dependencies: [runtimeBinding.receiptId, composition.receiptId, captureBinding.receiptId, gate.receiptId], created_at: "2026-09-18T00:00:00.000Z", required: true }, { changeRoot: artifactRoot });
  const chain = { source: { ...source }, sourceAdmission: { id: admission.id, receiptId: admission.receiptId, status: admission.status, contentHash: receiptHash(admission), receipt: admission }, admittedSnapshot: { id: snapshot.id, receiptId: snapshot.receiptId, status: snapshot.status, contentHash: receiptHash(snapshot), receipt: snapshot }, executionTarget: { id: executionReceipt.id, receiptId: executionReceipt.id, status: executionReceipt.status, contentHash: receiptHash(executionReceipt), receipt: executionReceipt, plan, state, outcome, toolchainPlan }, deployProfile: { id: deploy.id, receiptId: deploy.receiptId, status: deploy.status, contentHash: receiptHash(deploy), upstreamReceiptId: executionReceipt.id, receipt: deploy }, runtimeOrStaticArtifact: runtimeBinding, composition, capture: captureBinding, existingGateReceipt: gate, finalArtifact: { id: "final.js", receiptId: "final-receipt", status: "ready", contentHash: receiptHash(finalArtifact), upstreamReceiptId: gate.receiptId, receipt: finalArtifact }, validationOptions: { workspaceRoot: companionWorkspaceRoot, artifactRoot, evidenceRoot } };
  return chain;
}
module.exports = { CASES, SyntheticAnimationFixture, createAnimationFixture, createAnimationFixtures, createReceiptChainFixture };
