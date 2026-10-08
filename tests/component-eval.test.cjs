"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { projectEvent } = require("../scripts/component-eval.cjs");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { spawn } = require("node:child_process");
const core = require("../scripts/component-eval.cjs");

test("component workbench exposes tool facts and actual model, excluding private content", () => {
  const start = projectEvent({ type: "tool_execution_start", toolCallId: "call-1", toolName: "write", args: { path: "index.html", content: "public code", password: "PRIVATE-CREDENTIAL" } });
  assert.equal(start?.kind, "tool-start");
  assert.equal(start.callId, "call-1");
  assert.equal(start.args.path, "index.html");
  assert.equal(start.args.password, undefined);
  const response = projectEvent({ type: "message_end", message: { role: "assistant", provider: "test", model: "actual", content: [{ type: "thinking", thinking: "PRIVATE-THOUGHT" }, { type: "text", text: "saved the geometry" }], stopReason: "stop" } });
  assert.equal(response.actualModel, "test/actual");
  assert.equal(response.text, "saved the geometry");
  assert.equal(response.usage, null);
  assert(!JSON.stringify([start, response]).includes("PRIVATE-"));
  assert.equal(projectEvent({ type: "message_update", assistantMessageEvent: { type: "thinking_delta", delta: "PRIVATE-THOUGHT" } }), null);
  const output = projectEvent({type:"tool_execution_end",result:{content:[{type:"text",text:'{"apiKey":"PRIVATE-JSON","password":"PRIVATE-PASSWORD"} Bearer PRIVATE-BEARER'}]}});
  assert(!JSON.stringify(output).includes("PRIVATE-"));
});

test("JSON lines preserve split UTF8 and report malformed input without leaking it", () => {
  const events = [], errors = [];
  const reader = core.jsonLines(e => events.push(e), e => errors.push(e));
  for (const byte of Buffer.from('{"text":"珐琅"}\r\nPRIVATE-BAD-JSON\n{"text":"done"}')) reader.push(Buffer.from([byte]));
  reader.end();
  assert.deepEqual(events, [{ text: "珐琅" }, { text: "done" }]);
  assert.equal(errors.length, 1);
  assert(!JSON.stringify(errors).includes("PRIVATE"));
});

function runStateMessage(run) {
  return JSON.stringify(run && { status: run.status, notice: run.notice, tasks: run.tasks.map(task => {
    const attempt = task.attempts.at(-1);
    return { id: task.id, status: task.status, attempts: task.attempts.length, lastAttempt: attempt && { status: attempt.status, failureCode: attempt.failureCode, failure: attempt.failure } };
  }) });
}

async function until(check, run) {
  // ponytail: concurrent QA reads the full frozen toolkit; calibrate this bound if its size grows.
  const end = Date.now() + 60000;
  while (!check()) {
    if (Date.now() >= end) {
      assert.fail("task did not reach expected state within 60s; last state: " + runStateMessage(run));
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
function fixture(t, mode = "normal") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "component-eval-test-"));
  fs.mkdirSync(path.join(root, "reference"));
  for (const file of ["front.png", "exploded.png", "side.png", "contact-sheet.png"]) fs.writeFileSync(path.join(root, "reference", file), "fixture reference");
  fs.writeFileSync(path.join(root, "comparison-matrix.json"), JSON.stringify({ toolkitSha256: "f".repeat(64), runs: [{ id: "fixture/component", scenario: "component", selector: "test/actual", treatment: "direct", assetBase: "history", status: "time-limit", budgetSec: 720, provenance: { actual: ["test/actual"] } }] }));
  fs.mkdirSync(path.join(root, "history")); fs.writeFileSync(path.join(root, "history", "prompt.md"), "historical dispatched input");
  fs.writeFileSync(path.join(root, "history", "events.jsonl"), JSON.stringify({ type: "tool_execution_start", toolCallId: "old-1", toolName: "read", args: { path: "brief.md" } }) + "\n");
  const bench = new core.Workbench({ root, privateRoot: path.join(root, "private"), executable: process.execPath,
    spawnTask: ({ cwd, task }) => spawn(process.execPath, ["-e", `
      const fs=require('node:fs');
      const task=${JSON.stringify(task.id)}, mode=${JSON.stringify(mode)};
      const file=task==='reference'?'reference.md':'index.html';
      fs.writeFileSync(file,task==='reference'?'observed geometry and material notes':'<html><body>'+task+'</body></html>');
      if(mode==='output-link'){fs.writeFileSync('../outside.md','outside work directory');fs.unlinkSync(file);fs.symlinkSync('../outside.md',file);}
      console.log(JSON.stringify({type:'tool_execution_start',toolCallId:'edit-1',toolName:'write',args:{path:file}}));
      console.log(JSON.stringify({type:'tool_execution_end',toolCallId:'edit-1',toolName:'write',result:{content:[{type:'text',text:'saved'}]}}));
      if(!(mode==='missing-geometry-response' && task==='geometry')) console.log(JSON.stringify({type:'message_end',message:{role:'assistant',provider:'test',model:mode==='mismatch'?'other':'actual',stopReason:mode==='error'?'error':'stop',errorMessage:mode==='error'?'fixture provider failure':undefined,content:[{type:'thinking',thinking:'PRIVATE-THOUGHT'},{type:'text',text:'task saved'}],usage:{totalTokens:2048}}}));
      if(mode==='hold')setInterval(()=>{},1000);
    `], { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }),
    capture: async ({ cwd }) => { for (const name of ["front.png", "side.png"]) fs.writeFileSync(path.join(cwd, name), "independent fixture capture"); return { status: "passed", files: ["front.png", "side.png"], source: "controlled-test-adapter" }; }
  });
  t.after(async () => { await bench.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return { bench, root };
}

test("badge tasks reach review, preserve rejection, and block hash drift through HTTP", async t => {
  assert.equal(typeof core.Workbench, "function", "the component execution boundary is not implemented");
  const { bench } = fixture(t);
  const history = bench.list().find(run => run.kind === "history");
  assert.equal(history.status, "time-limit");
  assert.equal(history.budgetSec, 720);
  assert.equal(bench.detail(history.id).prompt, "historical dispatched input");
  const run = bench.createRun({ model: "test/actual", treatment: "direct" });
  await bench.start(run.id);
  await until(() => bench.detail(run.id).run.tasks[1].status === "awaiting-review", run);
  let detail = bench.detail(run.id), geometry = detail.run.tasks[1], first = geometry.attempts.at(-1);
  assert.equal(detail.run.actualModels[0], "test/actual");
  assert.deepEqual(first.actualModels, ["test/actual"]);
  assert.equal(detail.run.toolkitHash, null);
  assert(detail.run.referenceHashes["front.png"]);
  assert.equal(detail.run.tokenLimit, null);
  assert.equal(detail.run.timeLimitSec, null);
  assert(!first.command.args.some(arg => arg.startsWith("--max-time")));
  assert(bench.events(run.id).events.some(event => event.kind === "tool-start"));
  assert(!JSON.stringify(bench.events(run.id)).includes("PRIVATE-THOUGHT"));
  await bench.review(run.id, { taskId: "geometry", attemptId: first.id, artifactHash: first.artifactHash, verdict: "reject", feedback: "bezel is too wide" });
  await until(() => bench.detail(run.id).run.tasks[1].attempts.length === 2 && bench.detail(run.id).run.tasks[1].status === "awaiting-review", run);
  detail = bench.detail(run.id); geometry = detail.run.tasks[1];
  assert.equal(geometry.attempts[0].review.verdict, "reject");
  const current = geometry.attempts.at(-1);
  assert.match(current.prompt, /bezel is too wide/);
  assert(geometry.attempts[0].artifactHash);
  assert.equal(detail.run.tasks[2].status, "pending");
  const url = await bench.listen(0);
  const headers = { "Content-Type": "application/json", "Origin": url, "X-Workbench-Token": bench.token };
  const denied = await fetch(url + "/api/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId: run.id }) });
  assert.equal(denied.status, 403);
  const accept = await fetch(url + "/api/review", { method: "POST", headers, body: JSON.stringify({ runId: run.id, taskId: "geometry", attemptId: current.id, artifactHash: current.artifactHash, verdict: "accept" }) });
  assert.equal(accept.status, 200);
  await until(() => bench.detail(run.id).run.tasks.find(task => task.id === "materials").status === "awaiting-review", run);
  const material = bench.detail(run.id).run.tasks.find(task => task.id === "materials").attempts.at(-1);
  fs.appendFileSync(path.join(bench.runtimeRoot, run.id, "attempts", material.id, "work", "index.html"), "changed after capture");
  const stale = await fetch(url + "/api/review", { method: "POST", headers, body: JSON.stringify({ runId: run.id, taskId: "materials", attemptId: material.id, artifactHash: material.artifactHash, verdict: "accept" }) });
  assert.equal(stale.status, 409);
  assert.equal(bench.detail(run.id).run.tasks.at(-1).status, "pending");
  assert.equal(material.artifact.status, "stale");
  const escape = await fetch(url + "/api/file?runId=" + run.id + "&attemptId=" + material.id + "&path=../../../../private");
  assert.equal(escape.status, 403);
});

test("drift in an accepted upstream artifact invalidates that decision and downstream evidence", async t => {
  const { bench } = fixture(t), run = bench.createRun({ model: "test/actual", treatment: "direct" });
  await bench.start(run.id); await until(() => run.tasks[1].status === "awaiting-review", run);
  const geometry = run.tasks[1].attempts.at(-1);
  await bench.review(run.id, { taskId:"geometry", attemptId:geometry.id, artifactHash:geometry.artifactHash, verdict:"accept" });
  await until(() => run.tasks[5].status === "awaiting-review", run);
  fs.appendFileSync(path.join(geometry.cwd,"index.html"), "upstream drift");
  const material = run.tasks[5].attempts.at(-1);
  await assert.rejects(bench.review(run.id, {taskId:"materials",attemptId:material.id,artifactHash:material.artifactHash,verdict:"accept"}), {code:"ARTIFACT_CHANGED"});
  assert.equal(geometry.review.verdict,"accept");
  assert.equal(geometry.review.valid,false);
  assert.equal(run.tasks[1].status,"stale");
  assert.equal(run.tasks[5].attempts[0].artifact.status,"stale");
  assert.equal(run.tasks[6].status,"pending");
});

test("each attempt needs its own response; inputs are frozen and the UI has review controls", async t => {
  const { bench, root } = fixture(t, "missing-geometry-response"), run = bench.createRun({ model: "test/actual", treatment: "direct" });
  const frozen = run.referenceHashes["front.png"];
  fs.writeFileSync(path.join(root, "reference", "front.png"), "later input must not rewrite this case");
  await bench.start(run.id); await until(() => bench.detail(run.id).run.status === "failed", run);
  assert.equal(run.tasks[1].attempts[0].failureCode, "NO_MODEL_RESPONSE");
  assert.equal(run.tasks[1].attempts[0].inputHashes["reference/front.png"], frozen);
  assert.equal(run.tasks[2].status, "pending");
  const url = await bench.listen(0), page = await fetch(url);
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const id of ["model", "treatment", "tasks", "timeline", "feedback", "accept", "reject", "before", "after"]) assert(html.includes(`id="${id}"`), id);
  const source = await fetch(url + "/api/file?runId=" + run.id + "&attemptId=" + run.tasks[1].attempts[0].id + "&path=index.html");
  assert.equal(source.status, 200);
});

test("model mismatch, provider error and output links outside the task stop automatic badge work", async t => {
  assert.equal(typeof core.Workbench, "function");
  for (const mode of ["mismatch", "error", "output-link"]) {
    const { bench } = fixture(t, mode), run = bench.createRun({ model: "test/actual", treatment: "direct" });
    await bench.start(run.id);
    await until(() => ["failed","awaiting-review"].includes(bench.detail(run.id).run.status), run);
    const detail = bench.detail(run.id);
    assert.equal(detail.run.status,"failed");
    assert.equal(detail.run.tasks[1].status, "pending");
    assert.equal(detail.run.tasks[0].attempts[0].failureCode, mode === "mismatch" ? "MODEL_MISMATCH" : mode === "error" ? "PROVIDER_ERROR" : "PATH_ESCAPE");
    assert.equal(detail.run.actualModels[0], mode === "mismatch" ? "test/other" : "test/actual");
  }
});

test("user stop targets the owned child and restart does not silently redispatch", async t => {
  assert.equal(typeof core.Workbench, "function");
  const { bench, root } = fixture(t, "hold"), run = bench.createRun({ model: "test/actual", treatment: "direct" });
  await bench.start(run.id); await until(() => bench.events(run.id).events.some(event => event.kind === "assistant"), run);
  await bench.stop(run.id);
  assert.equal(bench.detail(run.id).run.status, "stopped");
  assert.equal(bench.detail(run.id).run.tasks[1].status, "pending");
  await bench.close();
  const restored = new core.Workbench({ root, privateRoot: path.join(root, "private") });
  t.after(() => restored.close());
  assert.equal(restored.detail(run.id).run.status, "stopped");
  assert.equal(restored.active, null);
});

function visualFixture(t, missingPlan = false, mode = "normal") {
  const f = fixture(t);
  const toolkit = path.join(f.root, "toolkit");
  fs.cpSync(path.join(__dirname, "../skill"), toolkit, { recursive: true });
  f.bench.options.toolkitRoot = toolkit;
  f.bench.options.chromePath = require("../skill/scripts/film-capture-core.cjs").resolveChrome();
  f.bench.options.puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core", { paths: [path.resolve(__dirname, "..")] });
  f.bench.options.spawnTask = ({ cwd, task, run }) => {
    const phases = ["outline", "depth"].map((id, i) => ({
      id, goal: i ? "只校准侧面厚度" : "只校准正面轮廓", depends_on: i ? ["outline"] : [],
      inputs: ["reference.md", `${id}-probe.json`], outputs: [`results/${id}/index.html`], gates: [],
      visual: { target: "outer-shell", property: i ? "geometry.depth" : "geometry.contour", references: [i ? "reference/side.png" : "reference/front.png"], scope: ["index.html"], guides: ["references/3d-spec.md"], checks: [`results/${id}/technical-check.json`], ...(mode === "report-only" ? {} : { verification: [{ kind: "interaction", probe: `${id}-probe.json`, target: `results/${id}/index.html`, check: `results/${id}/technical-check.json` }] }) }
    }));
    const plan = { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: run.id, input_hash: "sha256:" + run.commonInputHash, mode: "clone", fidelity: "exact", phases };
    const html = '<!doctype html><button id="target" style="position:absolute;left:20px;top:20px;width:80px;height:40px"' + (mode === "dead-page" ? "" : ' onclick="this.style.transform=\'translateX(20px)\'"') + '>target</button>';
    const probes = Object.fromEntries(phases.map(phase => [`${phase.id}-probe.json`, { schema: "design-pipeline.interaction-probe.v1", id: phase.id, url: `results/${phase.id}/index.html`, probes: [{ id: "click", target: "#target", input: { kind: "click", at: [50, 40] }, expect: { response: "stepped", settleWithinMs: 120 } }] }]));
    return spawn(process.execPath, ["-e", `const fs=require('node:fs');const id=${JSON.stringify(task.id)};
      fs.writeFileSync(id==='reference'?'reference.md':'index.html',id==='reference'?'reference observations':${JSON.stringify(html)});
      if(id==='reference'&&!${JSON.stringify(missingPlan)}) { fs.writeFileSync('tasks-plan.json',JSON.stringify(${JSON.stringify(plan)}));for(const [file,probe] of Object.entries(${JSON.stringify(probes)}))fs.writeFileSync(file,JSON.stringify(probe)); }
      console.log(JSON.stringify({type:'message_end',message:{role:'assistant',provider:'test',model:'actual',stopReason:'stop',content:[{type:'text',text:'saved current task'}]}}));`], { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  };
  f.bench.options.capture = async ({ cwd }) => {
    for (const file of ["front.png", "side.png"]) fs.writeFileSync(path.join(cwd, file), "independent capture");
    return { status: "captured", source: "test-image-fixture", files: ["front.png", "side.png"], visualAcceptance: "not-evaluated" };
  };
  return f;
}

test("tool dispatch consumes product visual tasks rather than the shared seven macros", async t => {
  const { bench } = visualFixture(t), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
  assert.equal(run.status, "awaiting-review", runStateMessage(run));
  assert.deepEqual(run.tasks.map(task => task.id), ["reference", "outline", "depth"]);
  const outline = run.tasks[1].attempts.at(-1), depth = run.tasks[2].attempts.at(-1);
  assert.match(outline.prompt, /geometry.contour/);
  assert.match(depth.prompt, /geometry.depth/);
  assert.match(depth.prompt, /默认入口只呈现当前徽章/);
  assert.match(depth.prompt, /\?inspect=1/);
  assert(fs.existsSync(path.join(depth.cwd, "results/outline/index.html")), "all named upstream inputs must exist in the dispatched work directory");
  const guide = "references/3d-spec.md", guideBytes = fs.readFileSync(path.join(bench.options.toolkitRoot, guide));
  for (const attempt of [outline, depth]) {
    assert.deepEqual(fs.readFileSync(path.join(attempt.cwd, guide)), guideBytes, "dispatch copies actual frozen method bytes");
    assert.match(attempt.pipelineAction.inputHashes[guide], /^sha256:/, "methods participate in existing pipeline input lineage");
    assert.equal(attempt.pipelineAction.inputHashes[guide], "sha256:" + require("../skill/scripts/contract-utils.cjs").sha256(guideBytes));
  }
  const state = JSON.parse(fs.readFileSync(path.join(bench.runtimeRoot, run.id, "state.json")));
  assert.equal(state.extensions.visualTasks.completed.outline.status, "ready");
  assert.equal(state.extensions.visualTasks.completed.depth.status, "ready", "actual native verification precedes human review");
  assert.equal(state.extensions.visualTasks.completed.depth.review, undefined, "technical verification does not grant owner acceptance");
  assert.equal(JSON.parse(fs.readFileSync(path.join(bench.runtimeRoot, run.id, "visual-plan.json"))).phases[1].visual.review, true, "derived owner review is bound before native dispatch");
  for (const id of ["outline", "depth"]) {
    const report = JSON.parse(fs.readFileSync(path.join(bench.runtimeRoot, run.id, `results/${id}/technical-check.json`)));
    assert.equal(report.schema, "design-pipeline.interaction-result.v1");
    assert.equal(report.status, "passed");
    assert.ok(report.probes[0].samples.count >= 5, "the native verifier measured actual Chrome frames");
    assert.equal(Object.hasOwn(report, "checks"), false, "image fixture labels cannot substitute for native measurements");
    assert.equal(fs.existsSync(path.join(bench.runtimeRoot, run.id, `results/${id}/front.png`)), false, "only declared outputs are promoted");
  }
  assert(bench.events(run.id).events.some(event => event.source === "design-pipeline-dispatcher" && event.tool === "next"));
  await bench.review(run.id, { taskId: "depth", attemptId: depth.id, artifactHash: depth.artifactHash, verdict: "reject", feedback: "厚度太大，只改厚度" });
  await until(() => run.tasks[2].attempts.length === 2 && run.status === "awaiting-review", run);
  assert.match(run.tasks[2].attempts.at(-1).prompt, /厚度太大，只改厚度/);
  assert.equal(run.tasks[1].attempts.length, 1, "repair remains scoped to depth");
  const repaired = run.tasks[2].attempts.at(-1);
  await bench.review(run.id, { taskId: "depth", attemptId: repaired.id, artifactHash: repaired.artifactHash, verdict: "accept" });
  await until(() => ["complete", "failed"].includes(run.status), run);
  assert.equal(run.status, "complete", runStateMessage(run));
  const acceptedState = JSON.parse(fs.readFileSync(path.join(bench.runtimeRoot, run.id, "state.json")));
  assert.equal(acceptedState.extensions.visualTasks.completed.depth.review.verdict, "accept");
  assert.equal(acceptedState.extensions.visualTasks.completed.depth.review.valid, true);
});

test("tool reference without a task decomposition cannot silently start whole geometry", async t => {
  const { bench } = visualFixture(t, true), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
  assert.equal(run.status, "failed");
  assert.equal(run.tasks[0].attempts.at(-1).failureCode, "TASK_PLAN_MISSING");
  assert.equal(run.tasks.length, 1);
});

test("tool method binding preserves a conflicting existing run input", async t => {
  const { bench } = visualFixture(t), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  const file = path.join(bench.runtimeRoot, run.id, "references/3d-spec.md");
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, "Existing different method input");
  await bench.start(run.id); await until(() => run.status === "failed", run);
  assert.equal(run.tasks[0].attempts.at(-1).failureCode, "GUIDE_INPUT_CONFLICT");
  assert.equal(fs.readFileSync(file, "utf8"), "Existing different method input");
});

test("native visual review recovers exact evidence without repeating completed work", async t => {
  for (const humanAccepted of [false, true]) {
    const { bench } = visualFixture(t), run = bench.createRun({ model: "test/actual", treatment: "tool" });
    await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
    assert.equal(run.status, "awaiting-review", runStateMessage(run));
    const depth = run.tasks[2].attempts.at(-1);
    const originalPipeline = bench.pipeline.bind(bench);
    if (humanAccepted) {
      bench.pipeline = (current, command, args) => {
        if (command === "decide" && args[args.indexOf("--verdict") + 1] === "accept") throw new Error("fixture interrupted before native accept");
        return originalPipeline(current, command, args);
      };
      await assert.rejects(bench.review(run.id, { taskId: "depth", attemptId: depth.id, artifactHash: depth.artifactHash, verdict: "accept" }), /fixture interrupted/);
    }
    run.status = run.tasks[2].status = depth.status = "inconclusive";
    bench.save(run, "fixture-interrupted-projection", "native review pending; dispatcher projection interrupted");
    await bench.close();
    const restored = new core.Workbench({ ...bench.options }); t.after(() => restored.close());
    const resumed = restored.get(run.id);
    await restored.start(run.id); await until(() => ["complete", "failed", "awaiting-review"].includes(resumed.status), resumed);
    assert.equal(resumed.tasks[2].attempts.length, 1, "checkpoint recovery must not repeat model work");
    if (humanAccepted) {
      assert.equal(resumed.status, "complete", runStateMessage(resumed));
      const state = JSON.parse(fs.readFileSync(path.join(restored.runtimeRoot, run.id, "state.json")));
      assert.equal(state.extensions.visualTasks.completed.depth.review.valid, true);
    } else {
      assert.equal(resumed.status, "awaiting-review", runStateMessage(resumed));
      await restored.review(run.id, { taskId: "depth", attemptId: depth.id, artifactHash: depth.artifactHash, verdict: "reject", feedback: "只修厚度" });
      await until(() => resumed.tasks[2].attempts.length === 2 && resumed.status === "awaiting-review", resumed);
      assert.equal(resumed.tasks[1].attempts.length, 1);
      assert.match(resumed.tasks[2].attempts.at(-1).prompt, /只修厚度/);
    }
  }
});

test("owner decisions survive interruption after native commit without duplicate submission", async t => {
  for (const verdict of ["accept", "reject"]) {
    const { bench } = visualFixture(t), run = bench.createRun({ model: "test/actual", treatment: "tool" });
    await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
    assert.equal(run.status, "awaiting-review", runStateMessage(run));
    const attempt = run.tasks[2].attempts.at(-1);
    const review = { taskId: "depth", attemptId: attempt.id, artifactHash: attempt.artifactHash, verdict, feedback: "只改厚度" };
    const originalPipeline = bench.pipeline.bind(bench);
    bench.pipeline = (current, command, args) => {
      const result = originalPipeline(current, command, args);
      if (command === "decide" && args[args.indexOf("--verdict") + 1] === verdict) throw new Error("fixture interrupted after native commit");
      return result;
    };
    await assert.rejects(bench.review(run.id, review), /fixture interrupted/);
    await bench.close();
    const restored = new core.Workbench({ ...bench.options }); t.after(() => restored.close());
    const resumed = restored.get(run.id);
    await restored.review(run.id, review);
    await until(() => verdict === "accept" ? ["complete", "failed"].includes(resumed.status) : resumed.tasks[2].attempts.length === 2 && resumed.status === "awaiting-review", resumed);
    assert.equal(resumed.status, verdict === "accept" ? "complete" : "awaiting-review", runStateMessage(resumed));
    assert.equal(resumed.tasks[2].attempts.length, verdict === "accept" ? 1 : 2);
    assert.equal(resumed.tasks[1].attempts.length, 1);
    const duplicate = restored.events(run.id).events.filter(event => event.tool === "decide" && event.args.includes(verdict));
    assert.equal(duplicate.length, 1, "native decision must not be submitted twice");
  }
});

test("native technical progress recovers a dispatcher interruption without redoing a completed unit", async t => {
  const { bench } = visualFixture(t), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
  assert.equal(run.status, "awaiting-review", runStateMessage(run));
  const depth = run.tasks[2].attempts.at(-1);
  run.tasks[1].status = run.tasks[1].attempts.at(-1).status = "inconclusive";
  bench.save(run, "fixture-interrupted-projection", "native outline complete, dispatcher projection not yet updated");
  await bench.close();
  const restored = new core.Workbench({ ...bench.options }); t.after(() => restored.close());
  const resumed = restored.get(run.id);
  await restored.review(run.id, { taskId: "depth", attemptId: depth.id, artifactHash: depth.artifactHash, verdict: "reject", feedback: "只改厚度" });
  await until(() => ["failed", "awaiting-review"].includes(resumed.status), resumed);
  assert.equal(resumed.status, "awaiting-review", runStateMessage(resumed));
  assert.equal(resumed.tasks[1].attempts.length, 1);
  assert.equal(resumed.tasks[1].status, "completed");
});

test("report-only product visual plans remain readable but cannot enter review", async t => {
  const { bench } = visualFixture(t, false, "report-only"), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
  assert.equal(run.status, "failed");
  assert.equal(run.tasks[0].attempts.at(-1).failureCode, "TASK_BLOCKED");
  assert.match(run.tasks[0].attempts.at(-1).failure, /verification.*binding/);
  assert.equal(run.tasks[1].attempts.length, 0);
  const state = JSON.parse(fs.readFileSync(path.join(bench.runtimeRoot, run.id, "state.json")));
  assert.deepEqual(state.extensions.visualTasks.completed, {});
});

test("a bad local page cannot enter native review from a successful image fixture", async t => {
  const { bench } = visualFixture(t, false, "dead-page"), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
  assert.equal(run.status, "failed");
  assert.equal(run.tasks[1].attempts.at(-1).failureCode, "TASK_EVIDENCE_FAILED");
  assert.equal(run.tasks[2].attempts.length, 0);
  const root = path.join(bench.runtimeRoot, run.id), report = JSON.parse(fs.readFileSync(path.join(root, "results/outline/technical-check.json")));
  assert.equal(report.status, "failed");
  assert.ok(report.findings.some(finding => finding.code === "dead-interaction"));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "state.json"))).extensions.visualTasks.completed.outline, undefined);
});

test("native output promotion rejects linked destinations before copying any output", t => {
  const { bench } = fixture(t), run = bench.createRun({ model: "test/actual", treatment: "direct" });
  const root = bench.runRoot(run), cwd = path.join(root, "attempts", "promotion-proof", "work");
  fs.mkdirSync(cwd, { recursive: true }); fs.writeFileSync(path.join(cwd, "index.html"), "new page"); fs.writeFileSync(path.join(cwd, "linked.html"), "new linked page");
  for (const [name, kind, protectedName] of [["state", "hardlink", "state.json"], ["probe", "hardlink", "probe.json"], ["guide", "symlink", "references/guide.md"], ["parent", "parent", "references/guide.md"]]) {
    const protectedFile = path.join(root, protectedName); fs.mkdirSync(path.dirname(protectedFile), { recursive: true });
    if (!fs.existsSync(protectedFile)) fs.writeFileSync(protectedFile, "fixed " + name);
    const original = fs.readFileSync(protectedFile), task = { id: name }, prefix = `results/${name}/`, first = path.join(root, prefix, "index.html");
    fs.mkdirSync(path.dirname(first), { recursive: true }); fs.writeFileSync(first, "old first output");
    const alias = path.join(root, prefix, "linked.html");
    if (kind === "hardlink") fs.linkSync(protectedFile, alias);
    else if (kind === "symlink") fs.symlinkSync(protectedFile, alias, "file");
    else { fs.symlinkSync(path.join(root, "references"), path.join(root, prefix, "alias"), "junction"); }
    const outputs = [prefix + "index.html", kind === "parent" ? prefix + "alias/guide.md" : prefix + "linked.html"];
    if (kind === "parent") { fs.mkdirSync(path.join(cwd, "alias")); fs.writeFileSync(path.join(cwd, "alias/guide.md"), "new guide"); }
    const attempt = { cwd, pipelineAction: { task: { outputs }, metadataPath: `${name}-completion.json` } };
    let completed = false; bench.completeVisual = () => { completed = true; };
    assert.throws(() => { bench.sealVisual(run, task, attempt, {}); bench.completeVisual(run, task, attempt); }, { code: "OUTPUT_COLLISION" });
    assert.deepEqual(fs.readFileSync(protectedFile), original, name + " input/control bytes are preserved");
    assert.equal(fs.readFileSync(first, "utf8"), "old first output", "all destinations are checked before the first copy");
    assert.equal(completed, false, "colliding outputs cannot reach native completion");
  }
});

test("fresh native completion cannot transfer old visual acceptance to rewritten metadata", async t => {
  const { bench } = visualFixture(t), run = bench.createRun({ model: "test/actual", treatment: "tool" });
  await bench.start(run.id); await until(() => ["failed", "awaiting-review"].includes(run.status), run);
  assert.equal(run.status, "awaiting-review", runStateMessage(run));
  const attempt = run.tasks[2].attempts.at(-1), root = bench.runRoot(run), previousHash = attempt.artifactHash;
  assert(attempt.artifacts.some(artifact => artifact.path === attempt.completionPath), "the first fixed metadata file is bound into the existing artifact manifest");
  fs.appendFileSync(path.join(root, "results/depth/index.html"), "<!-- another observed output version -->");
  assert.equal(bench.pipeline(run, "next", ["--plan", run.visualPlan]).task.id, "depth");
  const completed = bench.pipeline(run, "decide", ["--plan", run.visualPlan, "--choice", "depth", "--verdict", "complete", "--artifact", attempt.completionPath]);
  assert.equal(completed.status, "recorded", "the public native operation actually remeasures the new page");
  await assert.rejects(bench.review(run.id, { taskId: "depth", attemptId: attempt.id, artifactHash: previousHash, verdict: "accept" }), { code: "ARTIFACT_CHANGED" });
  assert.equal(attempt.review, null, "failed version validation never persists a valid owner decision");
  const native = JSON.parse(fs.readFileSync(path.join(root, "state.json"))).extensions.visualTasks.completed.depth;
  assert.equal(native.status, "ready"); assert.equal(native.review, undefined);
  assert.equal(bench.events(run.id).events.some(event => event.tool === "decide" && event.args.includes("accept")), false);
});
