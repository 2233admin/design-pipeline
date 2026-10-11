"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { selectionStateSha256, surfaceContractSha256, VERIFICATION_CHECKS } = require("../skill/scripts/playground-core.cjs");
const { createV2Artifact, STAGES } = require("../skill/scripts/component-first-v2-core.cjs");
const { ARTIFACT_KEYS } = require("../skill/scripts/evidence-core.cjs");
const { rgbaPng } = require("./fixtures/component-first-fixture.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = process.env.DESIGN_PIPELINE_CLI_PATH || path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const capturedAt = "2026-09-30T08:00:00.000Z";

// 沿用 public CLI child-process harness。所有输入都是合成数据，不是运行真实性证明。
function run(args, options = {}) {
  const child = spawnSync(process.execPath, [...(options.preload ? ["--require", options.preload] : []), cli, ...args, "--json"], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  let output;
  try { output = JSON.parse(child.stdout); }
  catch { output = { parseError: child.stdout, stderr: child.stderr }; }
  return { ...child, output };
}
function write(root, relative, bytes) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return { path: relative, sha256: sha256(bytes) };
}
function json(root, relative, value) { return write(root, relative, canonicalJson(value)); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { throw new Error("合成产物 JSON 无效", { cause: error }); } }
function syntheticPlaygroundHtml() {
  return `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; font-src 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'">
<main data-design-playground><div data-playground-controls><input data-playground-control="size"><button data-playground-preset="small"></button><button data-playground-preset="medium"></button><button data-playground-preset="large"></button></div><section data-playground-preview></section><output data-playground-prompt></output><button data-playground-copy></button></main>
<script>
const state={size:1};
const controls=document.querySelectorAll("[data-playground-control]");
const presets=document.querySelectorAll("[data-playground-preset]");
const presetValues={small:{size:1},medium:{size:2},large:{size:3}};
function renderPreview(){document.querySelector("[data-playground-preview]").dataset.size=state.size;}
function updatePrompt(){document.querySelector("[data-playground-prompt]").textContent="请按所选尺寸调整合成按钮，并保留其键盘操作与语义。";}
function updateAll(){renderPreview();updatePrompt();}
function syncControl(control){state[control.dataset.playgroundControl]=Number(control.value);}
controls.forEach((control)=>{control.addEventListener("input",()=>{syncControl(control);updateAll();});control.addEventListener("change",()=>{syncControl(control);updateAll();});});
presets.forEach((preset)=>preset.addEventListener("click",()=>{Object.assign(state,presetValues[preset.dataset.playgroundPreset]);updateAll();}));
document.querySelector("[data-playground-copy]").addEventListener("click",()=>navigator.clipboard.writeText(document.querySelector("[data-playground-prompt]").textContent));
</script>`;
}
function fixture(t, options = {}) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-review-negative-"));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  const root = path.join(projectRoot, "review-change");
  fs.mkdirSync(root);
  const targetRoot = path.join(projectRoot, "target");
  fs.mkdirSync(targetRoot);
  const surface = {
    kind: "component", blueprint: { source: "builtin", id: "design-playground" }, title: "合成按钮", context: "比较合成按钮尺寸，保留语义和键盘行为。",
    artifact: write(root, "playground/index.html", syntheticPlaygroundHtml()),
    controls: [{ id: "size", label: "尺寸", group: "布局", type: "range", default: 1, min: 1, max: 3, step: 1 }],
    presets: [{ id: "small", name: "小", values: { size: 1 } }, { id: "medium", name: "中", values: { size: 2 } }, { id: "large", name: "大", values: { size: 3 } }],
  };
  const prompt = write(root, "playground/prompt.md", "Adjust the synthetic review button to the selected medium size, preserving its semantic role, visible label and keyboard focus behavior.\n");
  const checks = Object.fromEntries(VERIFICATION_CHECKS.map((key) => [key, true]));
  const report = { schema: "design-pipeline.playground-verification.v1", changeId: "review-change", method: "manual-browser", checkedAt: capturedAt, surfaceSha256: surfaceContractSha256(surface), checks };
  const reportRef = json(root, "playground/report.json", report);
  const playground = {
    schema: "design-pipeline.playground.v1", changeId: "review-change", applicability: { status: "required", reason: "parameter-sensitive", rationale: "合成负例前置输入。" }, surface,
    selection: { status: "selected", values: { size: 2 }, changedControlIds: ["size"], stateSha256: selectionStateSha256(surface, { size: 2 }, ["size"]), prompt },
    verification: { status: "passed", method: "manual-browser", checkedAt: capturedAt, surfaceSha256: report.surfaceSha256, checks, evidence: reportRef }, integration: { status: "pending", target: null },
  };
  const pgRef = json(root, "playground.json", playground);
  const catalog = { schema: "design-pipeline.ui-pattern-catalog.v1", version: "synthetic-1", patterns: [{ id: "button", aliases: [], category: "action", platforms: ["web"], anatomy: ["label"], states: ["default"], interactions: ["activate"], checks: ["focus"], relations: [], provenance: "synthetic", support: "native" }] };
  const catalogRef = json(root, "catalog.json", catalog);
  const uiIr = { schema: "design-pipeline.ui-ir.v1", catalogVersion: catalog.version, nodes: [{ id: "cta", componentId: "button", props: { label: "合成按钮" }, children: [] }, { id: "uncaptured", componentId: "button", props: { label: "没有观察" }, children: [] }] };
  const irRef = json(root, "ui-ir.json", uiIr);
  const tokens = { schema: "design-pipeline.design-tokens.v1", dtcgProfile: "2025.10", provenance: { source: "synthetic", sha256: sha256("synthetic"), license: "project-owned" }, tokens: { color: { $type: "color", accent: { $value: "#245443", $extensions: { "design-pipeline": { role: "color.action.primary" } } } } } };
  const tokenRef = json(root, "tokens.json", tokens);
  const sourceRef = write(targetRoot, "button.js", 'export const label = "合成按钮";\n// </script><img src=x onerror=alert(1)>\n');
  const codeMap = { schema: "design-pipeline.design-code-map.v1", uiIrSha256: irRef.sha256, tokenSha256: tokenRef.sha256, mappings: [{ renderedId: "cta", sourcePath: "button.js", line: 1, column: 1, componentId: "button", tokenRefs: ["color.accent"], evidence: ["仅 mapping 文本，不作为 evidence 文件读取"] }] };
  const mapRef = json(root, "code-map.json", codeMap);
  const componentFirst = createV2Artifact({ schema: "component-first-gate.v1", target: { id: "synthetic-target", root: "target", kind: "prototype", entrypoints: ["button.js"], routes: ["/synthetic"] }, policy: { id: "synthetic-policy", version: 1 }, stages: STAGES.map((stage) => ({ stage, status: "passed", inputDigest: sha256(stage), evidenceRefs: [] })) }, { snapshotDigest: "sha256:" + sha256("original-snapshot") });
  componentFirst.visualAcceptance = { schema: "component-first-visual-acceptance.v1", status: "passed", reason: "合成历史值，不能外推为当前验收" };
  const cfRef = json(root, "component-first.json", componentFirst);
  const artifacts = Object.fromEntries(ARTIFACT_KEYS.map((key) => [key, null]));
  artifacts.dom = "dom.txt";
  const domRef = write(root, "evidence/dom.txt", '<button id="cta">合成按钮</button><script>不执行</script>');
  const evidenceReceipt = { schema: "design-pipeline.evidence-receipt.v1", id: "synthetic-capture", status: "partial", adapter: { id: "synthetic-author", version: "1", availability: "available", probe: { ok: true, message: "合成负例，不是真实 browser capture" } }, target: { url: "http://127.0.0.1:3000/synthetic?mode=fixture", viewport: { width: 640, height: 480 } }, capturedAt, artifacts, hashes: { dom: domRef.sha256 }, redaction: { status: "not-required", notes: [] } };
  const evidenceRef = json(root, "evidence/receipt.json", evidenceReceipt);
  const blueprintFile = path.join(repoRoot, "skill/references/playground-templates/design-playground.md");
  function bind() {
    const sourceFiles = [sourceRef];
    const designIdentitySha256 = sha256(canonicalJson({ playgroundReceiptSha256: pgRef.sha256, selectionStateSha256: playground.selection.stateSha256, surfaceSha256: surface.artifact.sha256, surfaceContractSha256: surfaceContractSha256(surface), promptSha256: prompt.sha256, blueprintSha256: sha256(fs.readFileSync(blueprintFile)), verificationReportSha256: reportRef.sha256, uiIrSha256: irRef.sha256, catalogSha256: catalogRef.sha256, tokenSha256: tokenRef.sha256, codeMapSha256: mapRef.sha256 }));
    return { schema: "design-pipeline.runtime-review-observation.v1", mode: "captured", dataMode: options.dataMode || "fixture", capturedAt, targetIdentityDigest: componentFirst.target.targetIdentityDigest, snapshotDigest: componentFirst.target.snapshotDigest, policyDigest: componentFirst.policy.digest, designIdentitySha256, sourceSetSha256: sha256(canonicalJson(sourceFiles)), evidenceReceipt: evidenceRef, objects: [{ renderedId: "cta", state: "default", actual: "合成按钮尺寸与期待不同", evidenceKeys: ["dom"] }] };
  }
  const observation = bind();
  const observationRef = json(root, "observation.json", observation);
  const manifest = { schema: "design-pipeline.runtime-review-input.v1", id: "review-1", acceptedDesign: { kind: "playground-selection", artifact: pgRef }, designIntent: prompt, uiIr: irRef, catalog: catalogRef, tokens: tokenRef, codeMap: mapRef, componentFirst: cfRef, sourceFiles: [sourceRef], runtimeObservation: observationRef };
  json(root, "manifest.json", manifest);
  json(root, "state.json", { protected: "ledger 不写" });
  write(root, "events.jsonl", "合成 ledger 保持原样\n");
  const f = { projectRoot, root, targetRoot, manifest, playground, componentFirst, codeMap, observation, evidenceReceipt, uiIr, tokens,
    args: ["--root", projectRoot, "--change-root", root],
    saveManifest() { json(root, "manifest.json", manifest); },
    saveMap() { Object.assign(mapRef, json(root, "code-map.json", codeMap)); },
    saveCapture() { Object.assign(observationRef, json(root, "observation.json", observation)); },
    rebindDesign() { observation.designIdentitySha256 = bind().designIdentitySha256; this.saveCapture(); this.saveManifest(); },
  };
  return f;
}
function action(f, name, flags, options = {}) { return run(["runtime-review", name, ...f.args, ...flags], options); }
function built(f) {
  const result = action(f, "build", ["--manifest", "manifest.json"]);
  assert.equal(result.status, 0, JSON.stringify(result.output));
  return { result: result.output, bundle: readJson(path.join(f.root, result.output.artifact)), artifact: result.output.artifact };
}
function feedback(bundle, patch = {}) { return { schema: "design-pipeline.runtime-review-feedback.v1", bundleSha256: bundle.bundleSha256, objectId: "cta", ...bundle.identity, category: "component-conformance", actual: "按钮太窄", expected: "能读到完整标签", acceptance: ["键盘 focus 可见", "640px viewport 标签完整"], ...patch }; }
function record(f, artifact, value) { json(f.root, "feedback-input.json", value); return action(f, "record", ["--artifact", artifact, "--observation", "feedback-input.json"]); }
function noProduct(f) { assert.equal(fs.existsSync(path.join(f.root, "runtime-review", f.manifest.id)), false); }
function protectedHashes(f) {
  const files = [path.join(f.targetRoot, "button.js"), ...["state.json", "events.jsonl", "component-first.json", "playground.json", "evidence/receipt.json", "evidence/dom.txt"].map((relative) => path.join(f.root, relative))];
  return files.map((file) => sha256(fs.readFileSync(file)));
}


function faultChild(config) {
  const childFs = require("node:fs");
  const childPath = require("node:path");
  const error = (code) => { const fault = new Error("合成底层故障 " + code); fault.code = code; return fault; };
  if (config.mode === "source-access") {
    const lstat = childFs.lstatSync;
    childFs.lstatSync = function (file, ...rest) {
      if (childPath.resolve(String(file)) === config.parent) throw error(config.code);
      return lstat(file, ...rest);
    };
    return;
  }
  const writeFile = childFs.writeFileSync;
  const write = childFs.writeSync;
  let applied = false;
  function recordBytes(data) {
    try {
      const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const document = JSON.parse(bytes.toString("utf8"));
      return document?.schema === "design-pipeline.runtime-review-record.v1" ? bytes : null;
    } catch { return null; }
  }
  function fault(data, partialWrite) {
    if (applied) return;
    const bytes = recordBytes(data);
    if (!bytes) return;
    applied = true;
    if (config.mode === "partial-write") {
      partialWrite(bytes.subarray(0, Math.min(17, bytes.length)));
      throw error("ENOSPC");
    }
    if (config.mode === "winner") writeFile(config.final, childFs.readFileSync(config.winnerPath), { flag: "wx" });
  }
  childFs.writeFileSync = function (target, data, options) {
    fault(data, (partial) => writeFile(target, partial, options));
    return writeFile(target, data, options);
  };
  childFs.writeSync = function (fd, data, ...rest) {
    fault(data, (partial) => write(fd, partial));
    return write(fd, data, ...rest);
  };
}
function faultPreload(f, config) {
  return path.join(f.projectRoot, write(f.projectRoot, "fault-preload.cjs", "(" + faultChild.toString() + ")(" + JSON.stringify(config) + ");").path);
}
function recordSetup(t) {
  const f = fixture(t);
  const review = built(f);
  const value = feedback(review.bundle);
  json(f.root, "feedback-input.json", value);
  const directory = path.join(f.root, "runtime-review", "feedback");
  const final = path.join(directory, sha256(canonicalJson(value)) + ".json");
  const flags = ["--artifact", review.artifact, "--observation", "feedback-input.json"];
  return { f, ...review, value, directory, final, flags };
}
function actualSourceSet(f) {
  const refs = f.manifest.sourceFiles.map((ref) => ({ path: ref.path, sha256: sha256(fs.readFileSync(path.join(f.targetRoot, ref.path))) }));
  refs.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return sha256(canonicalJson(refs));
}

test("public CLI 拒绝重复/未知/跨 action 参数，不接受隐式 action", () => {
  for (const args of [["runtime-review"], ["runtime-review", "build", "--manifest", "a", "--manifest", "b"], ["runtime-review", "check", "--manifest", "a"], ["runtime-review", "build", "--write"], ["runtime-review", "record", "--unknown", "a"]]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(result.output.ok, false);
  }
  const help = run(["runtime-review", "--help"]);
  assert.equal(help.status, 0);
  assert.match(JSON.stringify(help.output), /runtime-review/);
});

test("未接受的 pending/waived selection 不生成成功产物", (t) => {
  for (const waived of [false, true]) {
    const f = fixture(t);
    f.playground.selection = { status: waived ? "waived" : "pending", values: null, changedControlIds: [], stateSha256: null, prompt: null };
    if (waived) {
      f.playground.applicability = { status: "waived", reason: "non-visual", rationale: "合成 waiver 不是 selection" };
      f.playground.surface = null;
      f.playground.verification = { status: "waived", method: null, checkedAt: null, surfaceSha256: null, checks: null, evidence: null };
      f.playground.integration = { status: "waived", target: null };
    }
    f.manifest.acceptedDesign.artifact = json(f.root, "playground.json", f.playground);
    f.saveManifest();
    const result = action(f, "build", ["--manifest", "manifest.json"]);
    assert.notEqual(result.status, 0);
    noProduct(f);
  }
});

test("错误 prompt、双 hash、capture tuple/对象/时间/key 都拒绝", (t) => {
  const mutations = [
    (f) => { f.manifest.designIntent = write(f.root, "other.md", "Different natural-language selected intent without original authority.\n"); },
    (f) => { f.codeMap.uiIrSha256 = "a".repeat(64); f.saveMap(); f.rebindDesign(); },
    (f) => { f.codeMap.tokenSha256 = "b".repeat(64); f.saveMap(); f.rebindDesign(); },
    (f) => { f.observation.sourceSetSha256 = "a".repeat(64); f.saveCapture(); },
    (f) => { f.observation.designIdentitySha256 = "b".repeat(64); f.saveCapture(); },
    (f) => { f.observation.targetIdentityDigest = "c".repeat(64); f.saveCapture(); },
    (f) => { f.observation.objects[0].renderedId = "foreign"; f.saveCapture(); },
    (f) => { f.observation.objects[0].evidenceKeys = ["screenshot"]; f.saveCapture(); },
    (f) => { f.observation.capturedAt = "2026-09-29T08:00:00Z"; f.saveCapture(); },
    (f) => { f.observation.dataMode = "not-a-mode"; f.saveCapture(); },
    (f) => { f.observation.objects.push({ ...f.observation.objects[0] }); f.saveCapture(); },
    (f) => { f.manifest.sourceFiles.push({ ...f.manifest.sourceFiles[0] }); },
  ];
  for (const mutate of mutations) {
    const f = fixture(t);
    mutate(f); f.saveManifest();
    assert.equal(action(f, "build", ["--manifest", "manifest.json"]).status, 1);
    noProduct(f);
  }
});

test("source 不可读/非 UTF-8、哈希漂移不伪造空源码", (t) => {
  for (const mutation of ["missing", "binary", "changed"]) {
    const f = fixture(t);
    const file = path.join(f.targetRoot, "button.js");
    if (mutation === "missing") fs.unlinkSync(file);
    else fs.writeFileSync(file, mutation === "binary" ? Buffer.from([0xff, 0xfe]) : "changed source\n");
    const result = action(f, "build", ["--manifest", "manifest.json"]);
    assert.equal(result.status, 2);
    assert.equal(result.output.status, mutation === "changed" ? "stale" : "blocked");
    assert.equal(result.output.artifact, null);
    noProduct(f);
  }
});

test("unknown mapping、未声明/越界/component/token 缺口保留具体原因；无 runtime 不显示 pass", (t) => {
  const mutations = [
    (f) => { f.codeMap.mappings.push({ ...f.codeMap.mappings[0] }); },
    (f) => { f.codeMap.mappings[0].sourcePath = "undeclared.js"; },
    (f) => { f.codeMap.mappings[0].line = 999; },
    (f) => { f.codeMap.mappings[0].column = 999; },
    (f) => { f.codeMap.mappings[0].componentId = "other"; },
    (f) => { f.codeMap.mappings[0].tokenRefs.push("color.missing"); },
  ];
  for (const mutate of mutations) {
    const f = fixture(t); mutate(f); f.saveMap(); f.rebindDesign();
    const { bundle, result } = built(f);
    const object = bundle.objects.find((item) => item.renderedId === "cta");
    assert.ok(object.sourceStatus.status === "unknown" || object.tokenStatus.status === "unknown");
    assert.ok(object.sourceStatus.reasons.length || object.tokenStatus.reasons.length);
    assert.equal(bundle.objects.find((item) => item.renderedId === "uncaptured").runtime, null);
    assert.equal(result.context.componentConformance.scope, "captured-lineage");
    if (f.codeMap.mappings[0].tokenRefs.includes("color.missing")) assert.deepEqual(object.tokenValues, [{ ref: "color.accent", value: "#245443" }]);
  }
});

test("unsafe literal paths/普通文件/输入输出重叠无成功产物", (t) => {
  for (const unsafe of ["../escape.js", "./button.js", "x//button.js", "/absolute.js", "C:/drive.js", "\\\\host\\share", "src/*.js", "a\u0000b"]) {
    const f = fixture(t); f.manifest.sourceFiles[0].path = unsafe; f.saveManifest();
    assert.equal(action(f, "build", ["--manifest", "manifest.json"]).status, 1); noProduct(f);
  }
  const directory = fixture(t); fs.unlinkSync(path.join(directory.targetRoot, "button.js")); fs.mkdirSync(path.join(directory.targetRoot, "button.js"));
  assert.equal(action(directory, "build", ["--manifest", "manifest.json"]).status, 1);
  const overlap = fixture(t);
  overlap.manifest.designIntent = write(overlap.root, "runtime-review/review-1/prompt.md", "Synthetic prompt file overlapping output, must never be overwritten.\n"); overlap.saveManifest();
  const before = fs.readFileSync(path.join(overlap.root, overlap.manifest.designIntent.path));
  assert.equal(action(overlap, "build", ["--manifest", "manifest.json"]).status, 1);
  assert.deepEqual(fs.readFileSync(path.join(overlap.root, overlap.manifest.designIntent.path)), before);
});

test("source/evidence/output/change-root 的 link/junction 全拒绝", (t) => {
  for (const kind of ["source", "evidence", "output", "change-root"]) {
    const f = fixture(t);
    if (kind === "source") {
      fs.renameSync(f.targetRoot, path.join(f.projectRoot, "target-real")); fs.symlinkSync(path.join(f.projectRoot, "target-real"), f.targetRoot, "junction");
    } else if (kind === "evidence") {
      fs.renameSync(path.join(f.root, "evidence"), path.join(f.root, "evidence-real")); fs.symlinkSync(path.join(f.root, "evidence-real"), path.join(f.root, "evidence"), "junction");
    } else if (kind === "output") {
      fs.mkdirSync(path.join(f.root, "output-real")); fs.symlinkSync(path.join(f.root, "output-real"), path.join(f.root, "runtime-review"), "junction");
    } else {
      fs.renameSync(f.root, path.join(f.projectRoot, "change-real")); fs.symlinkSync(path.join(f.projectRoot, "change-real"), f.root, "junction");
    }
    assert.equal(action(f, "build", ["--manifest", "manifest.json"]).status, 1);
  }
});

test("字节/声明集合/evidence/lineage/HTML 漂移与 missing 不继承旧通过，check 只读", (t) => {
  const mutations = [
    (f) => { fs.appendFileSync(path.join(f.targetRoot, "button.js"), "changed\n"); },
    (f) => { fs.writeFileSync(path.join(f.root, "ui-ir.json"), "{ broken changed JSON"); },
    (f) => { fs.appendFileSync(path.join(f.root, "evidence/dom.txt"), "changed"); },
    (f) => { f.manifest.sourceFiles.push(write(f.targetRoot, "a-extra.js", "extra\n")); f.saveManifest(); },
    (f) => { fs.appendFileSync(path.join(f.root, "component-first.json"), " "); },
    (f, artifact) => { fs.appendFileSync(path.join(f.root, path.dirname(artifact), "index.html"), "changed"); },
    (f) => { fs.unlinkSync(path.join(f.root, "evidence/dom.txt")); },
    (f) => { fs.rmSync(path.join(f.root, "evidence"), { recursive: true, force: true }); },
    (f) => { fs.unlinkSync(path.join(f.root, "manifest.json")); },
  ];
  for (const mutate of mutations) {
    const f = fixture(t); const { artifact, bundle } = built(f); mutate(f, artifact);
    const result = action(f, "check", ["--artifact", artifact]);
    assert.equal(result.status, 2, JSON.stringify(result.output));
    assert.ok(["stale", "blocked"].includes(result.output.status));
    assert.equal(result.output.context.freshness, result.output.status);
    assert.equal(result.output.context.componentConformance.status, "stale");
    assert.equal(result.output.context.visualAcceptance.status, "stale");
    assert.equal(result.output.context.componentConformance.scope, "current-not-verified");
    assert.equal(result.output.context.visualAcceptance.scope, "current-not-verified");
    assert.deepEqual(result.output.context.identity, bundle.identity);
    assert.equal(result.output.context.observed.sourceSetSha256, actualSourceSet(f));
    assert.ok(result.output.context.findings.length);
    assert.equal(result.output.result, undefined);
    const reviewBefore = fs.readFileSync(path.join(f.root, artifact));
    action(f, "check", ["--artifact", artifact]);
    assert.deepEqual(fs.readFileSync(path.join(f.root, artifact)), reviewBefore);
  }
});

test("原 bundle/schema 损坏或 changed unsafe path 为 invalid，不当作普通漂移", (t) => {
  const f = fixture(t); const { artifact, bundle } = built(f);
  bundle.sources[0].text = "forged";
  const body = { ...bundle }; delete body.html; delete body.bundleSha256;
  bundle.bundleSha256 = sha256(canonicalJson(body));
  json(f.root, artifact, bundle);
  assert.equal(action(f, "check", ["--artifact", artifact]).status, 1);
  const g = fixture(t); const review = built(g);
  g.manifest.sourceFiles[0].path = "../outside.js"; g.saveManifest();
  assert.equal(action(g, "check", ["--artifact", review.artifact]).status, 1);
  const h = fixture(t); h.manifest.acceptedDesign.extra = "not allowed"; h.saveManifest();
  assert.equal(action(h, "build", ["--manifest", "manifest.json"]).status, 1);
});

test("record 拒绝错误身份/空字段/类别/额外 resolved；HTML damage 不允许历史反馈", (t) => {
  const mutations = [{ bundleSha256: "a".repeat(64) }, { objectId: "foreign" }, { sourceSetSha256: "b".repeat(64) }, { policyDigest: "c".repeat(64) }, { observationSha256: "d".repeat(64) }, { actual: " " }, { expected: "" }, { acceptance: [] }, { acceptance: [""] }, { category: "resolved" }, { resolved: true }];
  for (const patch of mutations) {
    const f = fixture(t); const { bundle, artifact } = built(f);
    const before = protectedHashes(f);
    assert.equal(record(f, artifact, feedback(bundle, patch)).status, 1);
    assert.equal(fs.existsSync(path.join(f.root, "runtime-review/feedback")), false);
    assert.deepEqual(protectedHashes(f), before);
  }
  for (const missing of [false, true]) {
    const f = fixture(t); const { bundle, artifact, result } = built(f);
    if (missing) fs.unlinkSync(path.join(f.root, result.html)); else fs.appendFileSync(path.join(f.root, result.html), "tampered");
    assert.equal(record(f, artifact, feedback(bundle)).status, 1);
    assert.equal(fs.existsSync(path.join(f.root, "runtime-review/feedback")), false);
  }
});

test("历史 stale/blocked feedback 仅 recorded，重复不覆盖，不写 target/ledger/receipts", (t) => {
  for (const blocked of [false, true]) {
    const f = fixture(t); const { bundle, artifact } = built(f);
    if (blocked) fs.unlinkSync(path.join(f.root, "evidence/dom.txt")); else fs.appendFileSync(path.join(f.targetRoot, "button.js"), "changed\n");
    const result = record(f, artifact, feedback(bundle));
    assert.equal(result.status, 0, JSON.stringify(result.output));
    assert.equal(result.output.status, "recorded");
    const file = path.join(f.root, result.output.feedbackPath);
    const recordBytes = fs.readFileSync(file);
    const saved = readJson(file);
    assert.equal(saved.lifecycle, "recorded"); assert.equal(saved.resolved, undefined);
    assert.equal(saved.contextAtRecord.freshness, blocked ? "blocked" : "stale");
    assert.equal(saved.contextAtRecord.componentConformance.status, "stale");
    assert.equal(saved.feedback.bundleSha256, bundle.bundleSha256);
    assert.equal(record(f, artifact, feedback(bundle)).output.feedbackPath, result.output.feedbackPath);
    assert.deepEqual(fs.readFileSync(file), recordBytes);
  }
  const f = fixture(t); const before = protectedHashes(f); const { bundle, artifact } = built(f);
  action(f, "check", ["--artifact", artifact]); record(f, artifact, feedback(bundle));
  assert.deepEqual(protectedHashes(f), before);
});

test("stale/expired lineage 拒绝新 build，blocked conformance 与 partial receipt 不被升级", (t) => {
  const expired = fixture(t);
  expired.componentFirst.receipts.stack.expiresAt = "2000-01-01T00:00:00Z";
  const { receiptHash } = require("../skill/scripts/component-first-v2-core.cjs");
  expired.componentFirst.receipts.stack.receiptHash = receiptHash(expired.componentFirst.receipts.stack);
  expired.manifest.componentFirst = json(expired.root, "component-first.json", expired.componentFirst); expired.saveManifest();
  assert.notEqual(action(expired, "build", ["--manifest", "manifest.json"]).status, 0); noProduct(expired);
  const f = fixture(t);
  for (const receipt of Object.values(f.componentFirst.receipts)) receipt.status = "blocked";
  for (const stage of STAGES) {
    const parents = { stack: [], components: ["stack"], playground: ["stack"], page: ["stack", "components", "playground"], evidence: ["page"] }[stage];
    f.componentFirst.receipts[stage].parentReceiptHashes = parents.map((parent) => f.componentFirst.receipts[parent].receiptHash);
    f.componentFirst.receipts[stage].receiptHash = receiptHash(f.componentFirst.receipts[stage]);
  }
  f.manifest.componentFirst = json(f.root, "component-first.json", f.componentFirst); f.saveManifest();
  assert.equal(built(f).result.context.componentConformance.status, "blocked");
});

test("PNG 非有效 bytes 无成功产物；二进制 evidence 只作为不可执行附件", (t) => {
  const f = fixture(t);
  const png = write(f.root, "evidence/screen.png", rgbaPng(64, 48));
  f.evidenceReceipt.artifacts.screenshot = png.path.split("/").at(-1); f.evidenceReceipt.hashes.screenshot = png.sha256;
  f.observation.evidenceReceipt = json(f.root, "evidence/receipt.json", f.evidenceReceipt); f.observation.objects[0].evidenceKeys.push("screenshot"); f.saveCapture(); f.saveManifest();
  const { result } = built(f);
  fs.writeFileSync(path.join(f.root, "evidence/screen.png"), "not PNG");
  assert.equal(action(f, "check", ["--artifact", result.artifact]).output.status, "stale");
  const g = fixture(t); const binary = write(g.root, "evidence/trace.bin", Buffer.from([0xff, 0x00, 0x01]));
  g.evidenceReceipt.artifacts.trace = "trace.bin"; g.evidenceReceipt.hashes.trace = binary.sha256;
  g.observation.evidenceReceipt = json(g.root, "evidence/receipt.json", g.evidenceReceipt); g.observation.objects[0].evidenceKeys.push("trace"); g.saveCapture(); g.saveManifest();
  assert.equal(built(g).bundle.evidence.find((item) => item.key === "trace").mediaType, "application/octet-stream");
  const invalid = fixture(t);
  const invalidPng = write(invalid.root, "evidence/screen.png", "not PNG");
  invalid.evidenceReceipt.artifacts.screenshot = "screen.png"; invalid.evidenceReceipt.hashes.screenshot = invalidPng.sha256;
  invalid.observation.evidenceReceipt = json(invalid.root, "evidence/receipt.json", invalid.evidenceReceipt); invalid.observation.objects[0].evidenceKeys.push("screenshot"); invalid.saveCapture(); invalid.saveManifest();
  assert.equal(action(invalid, "build", ["--manifest", "manifest.json"]).status, 1);
  noProduct(invalid);
});


test("legacy evidence uppercase hashes 绑定真实 PNG，不误报漂移或重写原 receipt", (t) => {
  const f = fixture(t);
  const pngBytes = rgbaPng(64, 48);
  const png = write(f.root, "evidence/screen.png", pngBytes);
  f.evidenceReceipt.artifacts.screenshot = "screen.png";
  f.evidenceReceipt.hashes.screenshot = png.sha256.toUpperCase();
  f.evidenceReceipt.hashes.dom = f.evidenceReceipt.hashes.dom.toUpperCase();
  f.observation.evidenceReceipt = json(f.root, "evidence/receipt.json", f.evidenceReceipt);
  f.observation.objects[0].evidenceKeys.push("screenshot"); f.saveCapture(); f.saveManifest();
  const raw = fs.readFileSync(path.join(f.root, "evidence/receipt.json"));
  const { bundle, artifact } = built(f);
  assert.deepEqual(Buffer.from(bundle.evidenceReceiptBytes), raw);
  const screenshot = bundle.evidence.find((item) => item.key === "screenshot");
  assert.equal(screenshot.sha256, sha256(pngBytes));
  assert.deepEqual(Buffer.from(screenshot.content, "base64"), pngBytes);
  const checked = action(f, "check", ["--artifact", artifact]);
  assert.equal(checked.status, 0, JSON.stringify(checked.output));
  assert.equal(checked.output.context.freshness, "matched");
  assert.deepEqual(fs.readFileSync(path.join(f.root, "evidence/receipt.json")), raw);
  const strictRef = fixture(t);
  strictRef.manifest.designIntent.sha256 = strictRef.manifest.designIntent.sha256.toUpperCase(); strictRef.saveManifest();
  assert.equal(action(strictRef, "build", ["--manifest", "manifest.json"]).status, 1);
  noProduct(strictRef);
});

test("record 部分真实写入后 ENOSPC 不残留 final，普通 CLI 重试保存合法 Record", (t) => {
  const setup = recordSetup(t);
  const before = protectedHashes(setup.f);
  const preload = faultPreload(setup.f, { mode: "partial-write" });
  const failed = action(setup.f, "record", setup.flags, { preload });
  assert.equal(failed.status, 1, JSON.stringify(failed.output));
  assert.equal(failed.output.error.code, "ENOSPC");
  assert.equal(fs.existsSync(setup.final), false);
  assert.deepEqual(protectedHashes(setup.f), before);
  const retry = action(setup.f, "record", setup.flags);
  assert.equal(retry.status, 0, JSON.stringify(retry.output));
  assert.equal(retry.output.status, "recorded");
  const saved = readJson(setup.final);
  assert.equal(saved.schema, "design-pipeline.runtime-review-record.v1");
  assert.equal(saved.lifecycle, "recorded");
  assert.deepEqual(saved.feedback, setup.value);
  assert.deepEqual(saved.contextAtRecord.identity, setup.bundle.identity);
  assert.deepEqual(protectedHashes(setup.f), before);
});

test("record publication EEXIST 复用同反馈 winner，不覆盖其历史 context", (t) => {
  const setup = recordSetup(t);
  const original = action(setup.f, "record", setup.flags);
  assert.equal(original.status, 0, JSON.stringify(original.output));
  const winner = fs.readFileSync(setup.final);
  const winnerRecord = readJson(setup.final);
  const winnerPath = path.join(setup.f.projectRoot, "winner-record.json");
  fs.renameSync(setup.final, winnerPath);
  fs.appendFileSync(path.join(setup.f.targetRoot, "button.js"), "latest inspect differs from winner history\n");
  const before = protectedHashes(setup.f);
  const preload = faultPreload(setup.f, { mode: "winner", final: setup.final, winnerPath });
  const outcome = action(setup.f, "record", setup.flags, { preload });
  assert.equal(outcome.status, 0, JSON.stringify(outcome.output));
  assert.equal(outcome.output.status, "recorded");
  assert.equal(outcome.output.context.freshness, "stale");
  assert.deepEqual(fs.readFileSync(setup.final), winner);
  assert.deepEqual(readJson(setup.final).contextAtRecord, winnerRecord.contextAtRecord);
  assert.deepEqual(protectedHashes(setup.f), before);
});



test("source 祖先 lstat EACCES/EPERM 使真实 build/check blocked，不变成 invalid", (t) => {
  for (const code of ["EACCES", "EPERM"]) for (const name of ["build", "check"]) {
    const f = fixture(t);
    const nested = write(f.targetRoot, "locked/button.js", fs.readFileSync(path.join(f.targetRoot, "button.js")));
    f.manifest.sourceFiles = [nested];
    f.codeMap.mappings[0].sourcePath = nested.path;
    f.saveMap(); f.rebindDesign();
    f.observation.sourceSetSha256 = actualSourceSet(f);
    f.saveCapture(); f.saveManifest();
    const locked = path.join(f.targetRoot, "locked");
    const nestedBefore = fs.readFileSync(path.join(f.targetRoot, nested.path));
    const review = name === "check" ? built(f) : null;
    const before = protectedHashes(f);
    const preload = faultPreload(f, { mode: "source-access", parent: locked, code });
    const result = action(f, name, name === "check" ? ["--artifact", review.artifact] : ["--manifest", "manifest.json"], { preload });
    assert.equal(result.status, 2, JSON.stringify(result.output));
    assert.equal(result.output.status, "blocked");
    if (review) {
      assert.deepEqual(result.output.context.identity, review.bundle.identity);
      assert.equal(result.output.context.componentConformance.scope, "current-not-verified");
      assert.equal(result.output.context.visualAcceptance.scope, "current-not-verified");
    } else noProduct(f);
    assert.deepEqual(protectedHashes(f), before);
    assert.deepEqual(fs.readFileSync(path.join(f.targetRoot, nested.path)), nestedBefore);
  }
});

test("已漂移 Playground 合法 JSON 缺 surface Ref/blueprint 仍 stale，可记历史反馈", (t) => {
  for (const kind of ["surface-artifact", "surface-blueprint", "blueprint-id", "custom-blueprint-artifact"]) {
    const f = fixture(t); const { bundle, artifact } = built(f);
    if (kind === "surface-artifact") delete f.playground.surface.artifact;
    else if (kind === "surface-blueprint") delete f.playground.surface.blueprint;
    else if (kind === "blueprint-id") delete f.playground.surface.blueprint.id;
    else f.playground.surface.blueprint = { source: "change", id: "custom", integrationTarget: "design.md" };
    json(f.root, "playground.json", f.playground); // 保留旧 Ref：这是已引用 bytes 漂移，不是新 accepted design。
    const check = action(f, "check", ["--artifact", artifact]);
    assert.equal(check.status, 2, JSON.stringify(check.output));
    assert.equal(check.output.status, "stale");
    assert.deepEqual(check.output.context.identity, bundle.identity);
    assert.equal(check.output.context.observed.designIdentitySha256, null);
    assert.equal(check.output.context.componentConformance.status, "stale");
    assert.equal(check.output.context.visualAcceptance.status, "stale");
    const saved = record(f, artifact, feedback(bundle));
    assert.equal(saved.status, 0, JSON.stringify(saved.output));
    const persisted = readJson(path.join(f.root, saved.output.feedbackPath));
    assert.equal(persisted.contextAtRecord.freshness, "stale");
    assert.deepEqual(persisted.contextAtRecord.identity, bundle.identity);
    assert.equal(persisted.lifecycle, "recorded");
  }
});

test("漂移 Playground 缺兄弟字段不能掩盖仍提供的 unsafe Ref/link", (t) => {
  for (const kind of ["unsafe-surface", "unsafe-blueprint", "surface-link"]) {
    const f = fixture(t); const { bundle, artifact } = built(f);
    if (kind === "unsafe-blueprint") {
      delete f.playground.surface.artifact;
      f.playground.surface.blueprint = { source: "change", id: "custom", integrationTarget: "design.md", artifact: { path: "../outside.md", sha256: "a".repeat(64) } };
    } else {
      delete f.playground.surface.blueprint;
      if (kind === "unsafe-surface") f.playground.surface.artifact.path = "../outside.html";
      else {
        fs.symlinkSync(path.join(f.root, "playground"), path.join(f.root, "surface-link"), process.platform === "win32" ? "junction" : "dir");
        f.playground.surface.artifact.path = "surface-link/index.html";
      }
    }
    json(f.root, "playground.json", f.playground);
    const checked = action(f, "check", ["--artifact", artifact]);
    assert.equal(checked.status, 1); assert.equal(checked.output.ok, false);
    assert.equal(record(f, artifact, feedback(bundle)).status, 1);
    assert.equal(fs.existsSync(path.join(f.root, "runtime-review/feedback")), false);
  }
});

test("当前 Ref 匹配的非法 UI IR 优先 invalid，合法 IR 缺 catalog 才 blocked", (t) => {
  for (const invalid of [true, false]) for (const name of ["build", "check"]) {
    const f = fixture(t);
    const review = name === "check" ? built(f) : null;
    if (invalid) delete f.uiIr.nodes[0].children;
    else f.uiIr.nodes[0].props.label = "合法改变后的标签";
    f.manifest.uiIr = json(f.root, "ui-ir.json", f.uiIr);
    f.saveManifest();
    fs.unlinkSync(path.join(f.root, "catalog.json"));
    const result = action(f, name, review ? ["--artifact", review.artifact] : ["--manifest", "manifest.json"]);
    assert.equal(result.status, invalid ? 1 : 2, JSON.stringify(result.output));
    if (invalid) assert.equal(result.output.ok, false);
    else assert.equal(result.output.status, "blocked");
    if (!review) noProduct(f);
  }
});

test("Component blocked 与 Visual passed/waived 独立投影，源码漂移不互相升级", (t) => {
  const { receiptHash } = require("../skill/scripts/component-first-v2-core.cjs");
  for (const visual of ["passed", "waived"]) {
    const f = fixture(t);
    const parents = { stack: [], components: ["stack"], playground: ["stack"], page: ["stack", "components", "playground"], evidence: ["page"] };
    for (const stage of STAGES) {
      const receipt = f.componentFirst.receipts[stage];
      receipt.status = "blocked";
      receipt.parentReceiptHashes = parents[stage].map((parent) => f.componentFirst.receipts[parent].receiptHash);
      receipt.receiptHash = receiptHash(receipt);
    }
    f.componentFirst.visualAcceptance.status = visual;
    f.manifest.componentFirst = json(f.root, "component-first.json", f.componentFirst); f.saveManifest();
    const { artifact, bundle, result } = built(f);
    assert.equal(result.context.componentConformance.status, "blocked");
    assert.equal(result.context.visualAcceptance.status, visual);
    assert.equal(result.context.componentConformance.scope, "captured-lineage");
    assert.equal(result.context.visualAcceptance.scope, "captured-lineage");
    fs.appendFileSync(path.join(f.targetRoot, "button.js"), "new actual bytes\n");
    const checked = action(f, "check", ["--artifact", artifact]);
    assert.equal(checked.status, 2);
    assert.equal(checked.output.context.componentConformance.status, "stale");
    assert.equal(checked.output.context.visualAcceptance.status, "stale");
    assert.equal(checked.output.context.componentConformance.scope, "current-not-verified");
    assert.equal(checked.output.context.visualAcceptance.scope, "current-not-verified");
    assert.deepEqual(checked.output.context.identity, bundle.identity);
    assert.equal(checked.output.context.observed.sourceSetSha256, actualSourceSet(f));
    assert.notEqual(checked.output.context.observed.sourceSetSha256, bundle.identity.sourceSetSha256);
  }
});

