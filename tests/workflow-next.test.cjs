"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, decideVisualTask: actualDecideVisualTask, initState, nextAction, nextVisualTask, readState, recordGate: recordWorkflowGate } = require("../skill/scripts/workflow-core.cjs");
const { advanceChange, createInitialState, inspectConsistency, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { createArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { analyzeVideo } = require("../skill/scripts/reference-video-core.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "workflow-"));
const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const touch = (dir, rel, body = "x") => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };

// Pure projection/lineage tests substitute only the trusted capture boundary. Public CLI
// cases below run Chrome itself; supplied reports never enter this observation seam.
function syntheticInteraction(dir, binding) {
    const cliCore = require("../skill/scripts/cli-core.cjs");
    const context = cliCore.preflightInteraction(dir, binding);
    const responds = fs.readFileSync(context.localPage, "utf8").includes("translateX(20px)");
    const capture = { pageOrigin: "file:", probes: context.doc.probes.map(probe => ({ id: probe.id, samples: [0, 50, 100, 150, 200, 250].map((t, index) => ({ t, phase: index < 2 ? "pre" : index === 2 ? "input" : "post", box: { x: responds && index >= 3 ? 40 : 20, y: 20, width: 80, height: 40 }, transform: responds && index >= 3 ? "matrix(1,0,0,1,20,0)" : "none", opacity: 1 })), requests: [] })) };
    return { ...context, result: require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(context.doc, capture) };
}
function decideVisualTask(root, options) {
  const cliCore = require("../skill/scripts/cli-core.cjs"), observe = cliCore.observeInteraction;
  cliCore.observeInteraction = syntheticInteraction;
  try { return actualDecideVisualTask(root, options); } finally { cliCore.observeInteraction = observe; }
}

function gitFixture(root, ...args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const visualHtml = '<!doctype html><button id="target" style="position:absolute;left:20px;top:20px;width:80px;height:40px" onclick="this.style.transform=\'translateX(20px)\'">target</button>';

// Synthetic passes exercise workflow branches; the public CLI test below runs the actual verifier.
function recordGate(root, gate, status) {
  const state = readState(root);
  const inputs = {
    storyboard: ["storyboard.json", ...(state.mode === "replicate" || (state.tier !== "quick" && state.decisions.reference !== "none" && fs.existsSync(path.join(root, "reference.md"))) ? ["reference.md"] : [])],
    film: ["storyboard.json", "out.mp4", ...["index.html", "timeline.json", "score-grid.json"].filter(file => fs.existsSync(path.join(root, file)))],
    edit: ["edit.json", "edit/analysis.json", "renders/edit.mp4"],
    interaction: ["interaction.json", "index.html"],
  }[gate] || [];
  return recordWorkflowGate(root, gate, status, inputs);
}

function rewriteSameTime(root, file, body) {
  const absolute = path.join(root, file), before = fs.statSync(absolute);
  touch(root, file, body);
  fs.utimesSync(absolute, before.atime, before.mtime);
}

function checkedWorkflowFixture(deliverable, tier = "standard") {
  const root = tmp();
  initState(root, { deliverable, tier });
  if (tier !== "quick") {
    decide(root, { stage: "intake", answer: "default" });
    if (deliverable !== "edit") decide(root, { stage: "reference", answer: "none" });
    decide(root, { stage: "concept", choice: deliverable === "edit" ? "pv" : "1" });
  }
  if (deliverable === "film") {
    touch(root, "storyboard.json", "{}");
    recordGate(root, "storyboard", "passed");
    touch(root, "out.mp4");
    recordGate(root, "film", "passed");
  } else if (deliverable === "edit") {
    touch(root, "edit/analysis.json", "{}");
    touch(root, "edit.json", "{}");
    touch(root, "renders/edit.mp4");
    recordGate(root, "edit", "passed");
  } else {
    touch(root, "index.html");
    touch(root, "interaction.json", "{}");
    recordGate(root, "interaction", "passed");
  }
  return root;
}

function visualFixture(nativePhase = "implementation") {
  const dir = tmp();
  const state = createInitialState({ changeId: "visual-example", timestamp: new Date().toISOString(), phase: nativePhase, status: "implementing" });
  writeNewChange(path.join(dir, "state.json"), path.join(dir, "events.jsonl"), state);
  touch(dir, "reference.json", '{"outline":"rounded"}');
  touch(dir, "references/reference-spec.md", "Inspect the source before changing the declared property.");
  const phase = (id, depends_on, property) => {
    touch(dir, `${id}-probe.json`, canonicalJson({ schema: "design-pipeline.interaction-probe.v1", id, url: `${id}.html`, probes: [{ id: "click", target: "#target", input: { kind: "click", at: [50, 40] }, expect: { response: "stepped", settleWithinMs: 120 } }] }));
    return { id, depends_on, inputs: ["reference.json", `${id}-probe.json`], outputs: [`${id}.html`], gates: [], goal: `Match the observed ${property}.`, visual: { target: "main-surface", property, references: ["reference.json"], scope: [`${id}.html`], guides: ["references/reference-spec.md"], checks: [`${id}-check.json`], verification: [{ kind: "interaction", probe: `${id}-probe.json`, target: `${id}.html`, check: `${id}-check.json` }] } };
  };
  const plan = { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "visual-example", input_hash: "sha256:" + "a".repeat(64), mode: "clone", fidelity: "exact", phases: [phase("outline", [], "outline"), phase("surface", ["outline"], "roughness")] };
  touch(dir, "visual-plan.json", canonicalJson(plan));
  gitFixture(dir, "init", "-q");
  gitFixture(dir, "config", "user.name", "Harness Test");
  gitFixture(dir, "config", "user.email", "harness@example.invalid");
  gitFixture(dir, "add", ".");
  gitFixture(dir, "commit", "-qm", "baseline");
  return { dir, plan: "visual-plan.json" };
}

function menuFixture() {
  const fixture = visualFixture(), plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan))), task = plan.phases[0];
  task.id = "menu-selection"; task.depends_on = []; task.inputs = ["brief.md", "interaction.json", "guides/qa.md"]; task.outputs = ["index.html"];
  task.goal = "Open, select 按更新时间, close and preserve the value through keyboard focus recovery.";
  task.visual = { target: "sort-menu", property: "menu.selection", references: ["brief.md"], scope: ["index.html", "implementation.md"], guides: ["guides/qa.md"], checks: ["evidence/menu-check.json"], review: true, verification: [{ kind: "interaction", probe: "interaction.json", target: "index.html", check: "evidence/menu-check.json" }] };
  plan.phases = [task]; touch(fixture.dir, fixture.plan, canonicalJson(plan));
  touch(fixture.dir, "brief.md", "Opening focuses the default item. Selection persists after closing and Escape restores focus.");
  touch(fixture.dir, "guides/qa.md", "Check actual selected state with the unchanged journey, separately from visual acceptance.");
  const visible = equals => ({ selector: "#sort-menu", kind: "visible", equals });
  const text = () => ({ selector: "#selection-value", kind: "text", equals: "按更新时间" });
  const focused = selector => ({ selector, kind: "focused", equals: true });
  const click = selector => ({ kind: "click", selector });
  const step = (id, input, assertions) => ({ id, ...(input ? { input } : {}), assertions, timeoutMs: 20 });
  touch(fixture.dir, "interaction.json", canonicalJson({ schema: "design-pipeline.interaction-probe.v1", id: "sort-menu", url: "index.html", probes: [{ id: "menu-selection", target: "#menu-demo", steps: [
    step("initial", null, [visible(false), { selector: "#menu-trigger", kind: "attribute", name: "aria-expanded", equals: "false" }, { selector: "#selection-value", kind: "text", equals: "默认顺序" }]),
    step("open", click("#menu-trigger"), [visible(true)]),
    step("choose", click("#sort-updated"), [text(), visible(false)]),
    step("reopen", click("#menu-trigger"), [focused("#sort-default")]),
    step("next-option", { kind: "key", key: "ArrowDown" }, [focused("#sort-updated")]),
    step("keyboard-select", { kind: "key", key: "Enter" }, [text(), visible(false), focused("#menu-trigger")]),
    step("open-for-escape", click("#menu-trigger"), [visible(true)]),
    step("escape", { kind: "key", key: "Escape" }, [visible(false), focused("#menu-trigger"), text()]),
  ] }] }));
  return fixture;
}

function menuHtml(broken = false) {
  return `<!doctype html><section id="menu-demo"><button id="menu-trigger" aria-expanded="false">Sort</button><output id="selection-value">默认顺序</output><div id="sort-menu" hidden><button id="sort-default">默认顺序</button><button id="sort-updated">按更新时间</button></div></section><script>
  const trigger=document.querySelector('#menu-trigger'), menu=document.querySelector('#sort-menu'), first=document.querySelector('#sort-default'), updated=document.querySelector('#sort-updated'), value=document.querySelector('#selection-value');
  const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();};
  trigger.onclick=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');first.focus();};
  for(const option of [first,updated]) option.onclick=()=>{${broken ? "" : "value.textContent=option.textContent;"}close();};
  document.addEventListener('keydown',event=>{if(menu.hidden)return;if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='ArrowDown'){event.preventDefault();updated.focus();}});
  </script>`;
}

function visualEvidence(fixture, action, report = { status: "passed", checks: ["Observed the fixed-time runtime frame."] }) {
  const task = action.task, inputHashes = action.inputHashes;
  for (const output of task.outputs) touch(fixture.dir, output, report.status === "failed" ? visualHtml.replace(' onclick="this.style.transform=\'translateX(20px)\'"', "") : visualHtml);
  const dependencies = fixture.plan && JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8")).phases.filter(p => task.depends_on.includes(p.id)).flatMap(p => p.outputs) || [];
  const metadata = task.outputs.map(file => createArtifactMetadata({ path: file, producer: "test-runtime", input_hashes: inputHashes, dependencies, created_at: new Date().toISOString() }, { changeRoot: fixture.dir }));
  const reportInputs = { ...inputHashes, ...Object.fromEntries(metadata.map(m => ["output:" + m.path, m.artifact_hash])) };
  for (const check of task.visual.checks) {
    touch(fixture.dir, check, canonicalJson(report));
    metadata.push(createArtifactMetadata({ path: check, producer: "test-runtime-check", input_hashes: reportInputs, dependencies: task.outputs, created_at: new Date().toISOString() }, { changeRoot: fixture.dir }));
  }
  const metadataPath = `${task.id}-completion.json`;
  touch(fixture.dir, metadataPath, canonicalJson(metadata));
  return metadataPath;
}

test("native visual next asks for a concrete decomposition without creating legacy workflow state", () => {
  const { dir } = visualFixture();
  const action = nextVisualTask(dir);
  assert.equal(action.stage, "decompose");
  assert.equal(action.type, "run");
  assert.ok(action.template.phases[0].visual.target);
  assert.ok(action.template.phases[0].visual.property);
  assert.ok(action.template.phases[0].visual.checks.length);
  assert.equal(action.template.phases[0].visual.target, "sort-menu");
  assert.equal(action.template.phases[0].visual.property, "menu.selection");
  assert.deepEqual(action.template.phases[0].visual.guides, ["guides/qa.md"]);
  assert.match(action.template.phases[0].goal, /open.*select.*clos.*Escape.*focus/i);
  assert.match(action.command, /sourceObservation.*report.*shotId.*observationIds/);
  assert.equal(fs.existsSync(path.join(dir, ".design-pipeline/state.json")), false);
});

test("public native failures retain measured fixes and bound repeated attempts to input/output bytes", t => {
  const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  let chrome, puppeteerModule;
  try {
    chrome = resolveChrome(); resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  }
  catch (error) { if (error.code === "TOOL_MISSING") { t.skip(error.message); return; } throw error; }
  const fixture = visualFixture(); t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8", windowsHide: true });
    assert.ok(result.stdout, result.stderr || result.error?.message);
    return { exit: result.status, value: JSON.parse(result.stdout) };
  };
  const complete = () => invoke("decide", "--choice", "outline", "--verdict", "complete", "--chrome", chrome, "--puppeteer-module", puppeteerModule);
  const first = invoke("next", "--plan", fixture.plan); assert.equal(first.exit, 0);
  touch(fixture.dir, "outline.html", visualHtml.replace(' onclick="this.style.transform=\'translateX(20px)\'"', ""));
  const stateFile = path.join(fixture.dir, "state.json");
  for (let attempt = 1; attempt <= 3; attempt++) {
    const failed = complete(); assert.equal(failed.exit, 2, JSON.stringify(failed.value)); assert.equal(failed.value.status, "blocked", JSON.stringify(failed.value));
    const beforeNext = fs.readFileSync(stateFile), next = invoke("next").value;
    assert.deepEqual(fs.readFileSync(stateFile), beforeNext, "repeated next does not count another verification");
    assert.equal(typeof next.feedback, "string");
    assert.equal(next.attempts, attempt, JSON.stringify(next));
    assert.ok(next.findings.some(item => item.code === "dead-interaction" && item.probeId === "click" && item.path === "outline-check.json" && item.message && item.fix));
    if (attempt === 3) assert.equal(next.recovery.code, "stop-repeating");
    else assert.equal(next.recovery, undefined);
    const progress = JSON.parse(beforeNext).extensions.visualTasks;
    assert.ok(progress.active); assert.equal(progress.completed.outline, undefined);
    assert.equal(progress.failures.outline.attempts, attempt);
    assert.equal(progress.failures.outline.inputHashes["output:outline.html"], "sha256:" + sha256(fs.readFileSync(path.join(fixture.dir, "outline.html"))));
  }
  rewriteSameTime(fixture.dir, "outline.html", fs.readFileSync(path.join(fixture.dir, "outline.html"), "utf8") + "\n<!-- changed bytes, still broken -->");
  assert.equal(invoke("next").value.recovery, undefined, "a changed unverified snapshot does not inherit the repeat hint");
  assert.equal(complete().value.next.attempts, 1, "actual verification restarts the count for changed output bytes");
  touch(fixture.dir, "outside.txt", "outside original authorization");
  const scope = complete(); assert.equal(scope.exit, 2);
  assert.equal(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.failures.outline.attempts, 1, "scope blocking is not another observed verifier failure");
  fs.unlinkSync(path.join(fixture.dir, "outside.txt"));
  const missing = invoke("decide", "--choice", "outline", "--verdict", "complete", "--chrome", path.join(fixture.dir, "missing-chrome"), "--puppeteer-module", puppeteerModule);
  assert.equal(missing.exit, 2);
  assert.equal(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.failures.outline.attempts, 1, "missing tools do not add observed attempts");
});

test("public native menu selection fails with typed repair evidence and completes only after real journey repair", t => {
  const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  let chrome, puppeteerModule;
  try {
    chrome = resolveChrome(); resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  }
  catch (error) { if (error.code === "TOOL_MISSING") { t.skip(error.message); return; } throw error; }
  const fixture = menuFixture(); t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8", windowsHide: true });
    assert.ok(result.stdout, result.stderr || result.error?.message);
    return { exit: result.status, value: JSON.parse(result.stdout) };
  };
  const complete = () => invoke("decide", "--choice", "menu-selection", "--verdict", "complete", "--chrome", chrome, "--puppeteer-module", puppeteerModule);
  const first = invoke("next", "--plan", fixture.plan); assert.equal(first.exit, 0);
  touch(fixture.dir, "index.html", menuHtml(true));
  const failed = complete(); assert.equal(failed.exit, 2, JSON.stringify(failed.value)); assert.equal(failed.value.status, "blocked", JSON.stringify(failed.value));
  const repair = invoke("next").value;
  assert.equal(repair.attempts, 1, JSON.stringify(repair));
  const finding = repair.findings.find(item => item.stepId === "choose" && item.selector === "#selection-value");
  assert.equal(finding.code, "state-mismatch"); assert.equal(finding.expected, "按更新时间"); assert.equal(finding.actual, "默认顺序"); assert.ok(finding.fix);
  assert.equal(repair.stage, "visual-task", JSON.stringify(repair));
  const probeBefore = fs.readFileSync(path.join(fixture.dir, "interaction.json"));
  touch(fixture.dir, "index.html", menuHtml());
  const checked = complete(); assert.equal(checked.exit, 0, JSON.stringify(checked.value)); assert.equal(checked.value.next.stage, "visual-review", JSON.stringify(checked.value));
  assert.deepEqual(fs.readFileSync(path.join(fixture.dir, "interaction.json")), probeBefore, "repair preserves the independently declared journey");
  const report = JSON.parse(fs.readFileSync(path.join(fixture.dir, "evidence/menu-check.json"))), row = report.probes[0];
  assert.equal(row.steps.length, 8); assert.ok(row.steps.every(step => step.status === "passed"));
  assert.equal(row.samples, undefined); assert.equal(row.metrics, undefined, "state-only proof does not fabricate motion frames");
  const stateFile = path.join(fixture.dir, "state.json"), progress = JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks;
  assert.equal(progress.completed["menu-selection"].observation.kind, "interaction"); assert.equal(progress.failures["menu-selection"], undefined);
  const accepted = invoke("decide", "--choice", "menu-selection", "--verdict", "accept", "--artifact", first.value.metadataPath);
  assert.equal(accepted.exit, 0); assert.equal(accepted.value.next.type, "done");
  const probe = JSON.parse(probeBefore); probe.probes[0].steps.at(-1).assertions.at(-1).equals = "another expected value";
  touch(fixture.dir, "interaction.json", canonicalJson(probe));
  const stale = invoke("next").value; assert.equal(stale.stage, "visual-task");
  assert.equal(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.completed["menu-selection"].review.valid, false);
});

test("native journey completeness projection rejects altered passing reports at the trusted observation seam", t => {
  // Synthetic measurements isolate declaration/result projection. The test above owns actual menu behavior proof.
  for (const [label, mutate] of [
    ["missing step", report => { report.probes[0].steps.pop(); }],
    ["reordered step", report => { report.probes[0].steps.reverse(); }],
    ["missing assertion", report => { report.probes[0].steps[0].assertions.pop(); }],
    ["forged matched literal", report => { report.probes[0].steps[2].assertions[0].actual = "wrong actual value"; }],
    ["missing false target", report => { const assertion = report.probes[0].steps[0].assertions[0]; assertion.found = false; assertion.actual = null; }],
    ["report mode label", report => { report.probes[0] = { id: report.probes[0].id, status: "passed", mode: "state-only", steps: [], findings: [] }; }],
  ]) {
    const fixture = menuFixture(); t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    nextVisualTask(fixture.dir, { plan: fixture.plan }); touch(fixture.dir, "index.html", menuHtml());
    const cliCore = require("../skill/scripts/cli-core.cjs"), observe = cliCore.observeInteraction;
    cliCore.observeInteraction = (root, binding) => {
      const context = cliCore.preflightInteraction(root, binding);
      const capture = { pageOrigin: "file:", probes: context.doc.probes.map(probe => ({ id: probe.id, steps: probe.steps.map(step => ({ id: step.id, elapsedMs: step.timeoutMs, observations: step.assertions.map(({ equals, ...identity }) => ({ ...identity, found: true, actual: equals })) })), requests: [] })) };
      const result = require("../skill/scripts/interaction-core.cjs").evaluateProbeFile(context.doc, capture); mutate(result);
      return { ...context, result };
    };
    let result;
    try { result = actualDecideVisualTask(fixture.dir, { choice: "menu-selection", verdict: "complete" }); } finally { cliCore.observeInteraction = observe; }
    assert.equal(result.status, "blocked", label);
    const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"))).extensions.visualTasks;
    assert.equal(progress.completed["menu-selection"], undefined, label); assert.ok(progress.active, label);
    assert.equal(typeof progress.failures["menu-selection"], "string", "malformed passing evidence is not counted as an observed semantic failure");
  }
});

test("native CAS conflicts preserve the prior observed failure count and original window", t => {
  const fixture = visualFixture(); t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  nextVisualTask(fixture.dir, { plan: fixture.plan }); touch(fixture.dir, "outline.html", visualHtml.replace(' onclick="this.style.transform=\'translateX(20px)\'"', ""));
  decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" });
  const stateFile = path.join(fixture.dir, "state.json"), originalState = JSON.parse(fs.readFileSync(stateFile));
  assert.equal(originalState.extensions.visualTasks.failures.outline.attempts, 1);
  const cliCore = require("../skill/scripts/cli-core.cjs"), observe = cliCore.observeInteraction;
  cliCore.observeInteraction = (root, binding) => {
    const result = syntheticInteraction(root, binding);
    advanceChange(stateFile, path.join(fixture.dir, "events.jsonl"), { expectedSha256: sha256(fs.readFileSync(stateFile)), timestamp: new Date().toISOString(), summary: "independent concurrent writer", type: "concurrent-test" });
    return result;
  };
  let result;
  try { result = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" }); } finally { cliCore.observeInteraction = observe; }
  assert.equal(result.status, "blocked"); assert.match(result.failure, /CAS|changed/);
  const state = JSON.parse(fs.readFileSync(stateFile));
  assert.equal(state.revision, originalState.revision + 1);
  assert.deepEqual(state.extensions.visualTasks.failures, originalState.extensions.visualTasks.failures);
  assert.deepEqual(state.extensions.visualTasks.active, originalState.extensions.visualTasks.active);
});

test("native visual next dispatches one goal and advances only with bound outputs and passed checks", () => {
  const fixture = visualFixture();
  let action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  assert.equal(action.task.id, "outline");
  assert.equal(action.task.visual.property, "outline");
  assert.match(action.inputHashes["reference.json"], /^sha256:/);
  assert.match(action.inputHashes.$plan, /^sha256:/);
  assert.match(action.inputHashes.$task, /^sha256:/);
  assert.equal(action.visualAcceptance, "not-evaluated");
  touch(fixture.dir, "outline.html", "exists but has no completion evidence");
  assert.equal(nextVisualTask(fixture.dir, { plan: fixture.plan }).task.id, "outline");
  assert.throws(() => decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "surface", verdict: "complete", artifact: "completion.json" }), /current|outline/);
  let artifact = visualEvidence(fixture, action, { status: "failed", checks: ["Runtime frame is blank."] });
  assert.equal(decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "complete", artifact }).next.task.id, "outline");
  const failure = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks.failures.outline;
  assert.match(failure.message || failure, /passed|failed/);
  artifact = visualEvidence(fixture, action);
  const completed = decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "complete", artifact });
  assert.equal(completed.next.task.id, "surface");
  assert.match(completed.next.inputHashes["outline.html"], /^sha256:/);
  action = completed.next;
  artifact = visualEvidence(fixture, action);
  const done = decideVisualTask(fixture.dir, { choice: "surface", verdict: "complete", artifact });
  assert.equal(done.next.type, "done");
  assert.equal(done.next.visualAcceptance, "not-evaluated");
  const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
  assert.equal(inspectConsistency(state, fs.readFileSync(path.join(fixture.dir, "events.jsonl"), "utf8")).status, "consistent");
  assert.equal(fs.existsSync(path.join(fixture.dir, ".design-pipeline/state.json")), false);
});

test("native report-only plans remain readable but cannot promote even correctly hashed reports", () => {
  const fixture = visualFixture(), plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
  plan.phases.forEach(task => delete task.visual.verification);
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  assert.equal(action.status, "blocked");
  assert.match(action.blockers[0], /verification.*binding/);
  const rejected = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact: visualEvidence(fixture, action) });
  assert.equal(rejected.next.task.id, "outline");
  assert.match(rejected.failure, /verification.*binding/);
});

test("native completion rejects a remote or different local probe target before capture", t => {
  for (const url of ["other.html", "https://example.invalid/page"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const probe = JSON.parse(fs.readFileSync(path.join(fixture.dir, "outline-probe.json"))); probe.url = url;
    touch(fixture.dir, "outline-probe.json", canonicalJson(probe));
    touch(fixture.dir, "other.html", visualHtml);
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan }); visualEvidence(fixture, action);
    const result = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", chrome: process.execPath, puppeteerModule: path.join(fixture.dir, "missing.cjs") });
    assert.equal(result.status, "blocked", url);
    assert.match(result.failure, /declared local output target/);
    assert.doesNotMatch(result.failure, /puppeteer|kernel|capture failed/);
  }
});

test("native review shows canonical output/check paths for equivalent plan spellings", t => {
  const fixture = visualFixture();
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan))), task = plan.phases[0];
  task.outputs = ["./outline.html"]; task.visual.checks = ["./outline-check.json"];
  task.visual.verification[0].target = "./outline.html"; task.visual.verification[0].check = "./outline-check.json";
  task.visual.review = true;
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  const completed = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact: visualEvidence(fixture, action) });
  assert.equal(completed.status, "recorded", completed.failure);
  assert.deepEqual(completed.next.evidence.outputs.map(metadata => metadata.path), ["outline.html"]);
  assert.deepEqual(completed.next.evidence.checks.map(metadata => metadata.path), ["outline-check.json"]);
  assert.deepEqual(completed.next.show, [path.join(fs.realpathSync.native(fixture.dir), "outline.html")]);
});

test("native visual completion cannot promote arbitrary check rows over a failed observed interaction", () => {
  for (const status of ["inconclusive", "skipped", "stale"]) {
    const fixture = visualFixture(), action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    const artifact = visualEvidence(fixture, action, { status: "passed", checks: [{ id: "runtime", status }] });
    touch(fixture.dir, "outline.html", visualHtml.replace(' onclick="this.style.transform=\'translateX(20px)\'"', ""));
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).next.task.id, "outline", status);
  }
});

test("native visual task progress stays inside the implementation phase", () => {
  const fixture = visualFixture("tasks");
  assert.throws(() => nextVisualTask(fixture.dir, { plan: fixture.plan }), /implementation/);
  assert.throws(() => decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "reject", answer: "Need work." }), /implementation/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).phase, "tasks");
});

test("native visual reference drift invalidates downstream while retaining old artifact evidence", () => {
  const fixture = visualFixture();
  for (const id of ["outline", "surface"]) {
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    assert.equal(action.task.id, id);
    decideVisualTask(fixture.dir, { plan: fixture.plan, choice: id, verdict: "complete", artifact: visualEvidence(fixture, action) });
  }
  touch(fixture.dir, "reference.json", '{"outline":"angular"}');
  assert.equal(nextVisualTask(fixture.dir).task.id, "outline");
  const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks;
  assert.equal(progress.completed.outline.status, "stale");
  assert.equal(progress.completed.surface.status, "stale");
  assert.ok(progress.completed.outline.artifacts.length);
});

test("native visual guide drift invalidates completed work and missing declared inputs block dispatch", t => {
  const fixture = visualFixture();
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const initialPlan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
  initialPlan.phases[0].visual.scope.push("assets/rebuilt-character.svg");
  touch(fixture.dir, fixture.plan, canonicalJson(initialPlan));
  for (const id of ["outline", "surface"]) {
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    assert.match(action.inputHashes["references/reference-spec.md"], /^sha256:/);
    decideVisualTask(fixture.dir, { choice: id, verdict: "complete", artifact: visualEvidence(fixture, action) });
  }
  touch(fixture.dir, "references/reference-spec.md", "Corrected wheel entry and adaptation instructions.");
  assert.equal(nextVisualTask(fixture.dir).task.id, "outline");
  const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks;
  assert.equal(progress.completed.outline.status, "stale");
  assert.equal(progress.completed.surface.status, "stale");
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].inputs.push("assets/rebuilt-character.svg");
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const blocked = nextVisualTask(fixture.dir);
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.blockers[0], /rebuilt-character/);
  touch(fixture.dir, "assets/rebuilt-character.svg", "<svg></svg>");
  assert.equal(nextVisualTask(fixture.dir).status, undefined);
});

test("native video visual tasks bind real local evidence at dispatch and recheck it at completion", {
  skip: !["ffmpeg", "ffprobe"].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0),
}, t => {
  const fixture = visualFixture();
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=32x24:rate=10:duration=1", "-c:v", "ffv1", path.join(fixture.dir, "input.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const sampled = analyzeVideo(fixture.dir, { path: "input.mkv", output: "analysis" });
  const report = sampled.report, reportPath = sampled.descriptor.path;
  const frameIds = report.frames.map(frame => frame.id);
  report.shots = [{ id: "test-shot", startSec: report.sampling.startSec, endSec: report.sampling.endSec, frameIds, targets: [{ target: "main-surface", properties: ["geometry.contour"] }] }];
  report.observations = [{ id: "test-contour", target: "main-surface", property: "geometry.contour", startSec: report.sampling.startSec, endSec: report.sampling.endSec, startState: "Visible outline at the first frame", endState: "Visible outline at the last frame", frameIds, basis: "observed", description: "The test source has visible outlined color regions.", uncertainties: [] }];
  const saveReport = () => touch(fixture.dir, reportPath, canonicalJson(report));
  saveReport();
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases.forEach(phase => {
    phase.visual.property = "geometry.contour";
    phase.visual.references = [reportPath];
    phase.visual.sourceObservation = { report: reportPath, shotId: "test-shot", observationIds: ["test-contour"] };
  });
  const savePlan = () => touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const binding = plan.phases[0].visual.sourceObservation;
  delete plan.phases[0].visual.sourceObservation; savePlan();
  assert.match(nextVisualTask(fixture.dir, { plan: fixture.plan }).blockers[0], /sourceObservation/);
  plan.phases[0].visual.sourceObservation = { ...binding, observationIds: ["not-an-observation"] }; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.sourceObservation = { ...binding, shotId: "wrong-shot" }; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.sourceObservation = binding;
  plan.phases[0].visual.property = "material.roughness"; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.property = "geometry.contour";
  plan.phases[0].visual.target = "other-object"; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.target = "main-surface"; savePlan();
  let action = nextVisualTask(fixture.dir);
  assert.equal(action.status, undefined, action.blockers?.join("; "));
  assert.equal(action.sourceEvidence.shot.id, "test-shot");
  assert.deepEqual(action.sourceEvidence.observations.map(row => row.id), ["test-contour"]);
  for (const file of [reportPath, "input.mkv", ...report.frames.map(frame => frame.path), "references/reference-spec.md"]) assert.match(action.inputHashes[file], /^sha256:/);
  const artifact = visualEvidence(fixture, action);
  report.observations[0].basis = "unknown";
  report.observations[0].uncertainties = ["The claimed observation needs review."]; saveReport();
  assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).status, "blocked", "dispatch evidence cannot conceal report drift before completion");
  report.observations[0].basis = "observed";
  report.observations[0].uncertainties = []; saveReport();
  for (const id of ["outline", "surface"]) {
    action = nextVisualTask(fixture.dir);
    assert.equal(action.task.id, id);
    assert.equal(decideVisualTask(fixture.dir, { choice: id, verdict: "complete", artifact: visualEvidence(fixture, action) }).status, "recorded");
  }
  assert.equal(nextVisualTask(fixture.dir).type, "done");
  fs.appendFileSync(path.join(fixture.dir, "input.mkv"), "changed source bytes");
  const changed = nextVisualTask(fixture.dir);
  assert.equal(changed.status, "blocked");
  const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks;
  assert.equal(progress.completed.outline.status, "stale");
  assert.equal(progress.completed.surface.status, "stale");
});

test("native visual rejection stays on the current goal with concrete feedback", () => {
  const fixture = visualFixture();
  nextVisualTask(fixture.dir, { plan: fixture.plan });
  assert.throws(() => decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "reject" }), /answer|feedback/);
  const result = decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "reject", answer: "The upper edge is too round." });
  assert.equal(result.next.task.id, "outline");
  assert.match(result.next.feedback, /upper edge/);
});

test("native visual CLI next and decide share the native projection and failed checks do not advance", () => {
  const fixture = visualFixture();
  const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--puppeteer-module", puppeteerModule, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8" });
    return { exitCode: result.status, value: JSON.parse(result.stdout) };
  };
  assert.equal(run("next").value.stage, "decompose");
  const next = run("next", "--plan", fixture.plan);
  assert.equal(next.exitCode, 0);
  assert.equal(next.value.task.id, "outline");
  let artifact = visualEvidence(fixture, next.value, { status: "failed", checks: ["Missing fixed-time frame."] });
  const failed = run("decide", "--choice", "outline", "--verdict", "complete", "--artifact", artifact);
  assert.equal(failed.exitCode, 2, JSON.stringify(failed.value));
  assert.equal(failed.value.next.task.id, "outline");
  artifact = visualEvidence(fixture, next.value);
  const completed = run("decide", "--choice", "outline", "--verdict", "complete", "--artifact", artifact);
  assert.equal(completed.exitCode, 0, JSON.stringify(completed.value));
  assert.equal(completed.value.next.task.id, "surface");
  assert.equal(run("next").value.task.id, "surface");
  assert.equal(fs.existsSync(path.join(fixture.dir, ".design-pipeline/state.json")), false);
});

test("public native visual review asks for its exact evidence and advances only after scoped acceptance", () => {
  const fixture = visualFixture();
  const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].visual.review = true;
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--puppeteer-module", puppeteerModule, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8" });
    return { exitCode: result.status, value: JSON.parse(result.stdout) };
  };
  const action = run("next", "--plan", fixture.plan).value;
  const artifact = visualEvidence(fixture, action);
  const completed = run("decide", "--choice", "outline", "--verdict", "complete", "--artifact", artifact);
  assert.equal(completed.exitCode, 0, JSON.stringify(completed.value));
  const review = completed.value.next;
  assert.equal(review.type, "ask");
  assert.equal(review.stage, "visual-review");
  assert.equal(review.task.id, "outline");
  assert.equal(review.technicalCompletion, "passed");
  assert.equal(review.visualAcceptance, "not-evaluated");
  assert.match(review.question, /main-surface.*outline/);
  assert.match(review.record, /--verdict accept\|reject.*--artifact/);
  assert.deepEqual(review.artifacts, JSON.parse(fs.readFileSync(path.join(fixture.dir, artifact), "utf8")));
  assert.deepEqual(review.evidence.outputs.map(item => item.path), ["outline.html"]);
  assert.deepEqual(review.evidence.checks.map(item => item.path), ["outline-check.json"]);
  assert.ok(review.show.includes(path.join(fs.realpathSync.native(fixture.dir), "outline.html")));
  assert.equal(run("next").value.stage, "visual-review");
  assert.equal(run("decide", "--choice", "surface", "--verdict", "complete", "--artifact", artifact).exitCode, 1);
  assert.equal(run("decide", "--choice", "surface", "--verdict", "reject", "--answer", "A future task cannot be rejected.").exitCode, 1);
  assert.equal(run("decide", "--choice", "outline", "--verdict", "accept").exitCode, 2);
  const accepted = run("decide", "--choice", "outline", "--verdict", "accept", "--artifact", artifact);
  assert.equal(accepted.exitCode, 0);
  assert.equal(accepted.value.visualAcceptance, "not-evaluated");
  assert.equal(accepted.value.review.verdict, "accept");
  assert.equal(accepted.value.review.valid, true);
  assert.match(accepted.value.review.artifactHash, /^sha256:/);
  assert.equal(accepted.value.next.task.id, "surface");
  const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
  assert.equal(inspectConsistency(state, fs.readFileSync(path.join(fixture.dir, "events.jsonl"), "utf8")).status, "consistent");
});

test("native review cannot accept or reject an older completion version", () => {
  const fixture = visualFixture();
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].visual.review = true;
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  const artifact = visualEvidence(fixture, action);
  decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact });
  touch(fixture.dir, "old-completion.json", fs.readFileSync(path.join(fixture.dir, artifact), "utf8"));
  decideVisualTask(fixture.dir, { choice: "outline", verdict: "reject", artifact, answer: "Repair this version." });
  visualEvidence(fixture, nextVisualTask(fixture.dir));
  decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact });
  const before = fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8");
  for (const verdict of ["accept", "reject"]) {
    const result = decideVisualTask(fixture.dir, { choice: "outline", verdict, artifact: "old-completion.json", answer: "The older outline was wrong." });
    assert.equal(result.status, "blocked", verdict);
    assert.match(result.failure, /completion|snapshot|version|metadata/i);
    assert.equal(result.next.stage, "visual-review");
    assert.equal(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"), before, "an old decision must not change the current evidence or feedback");
  }
  assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact }).next.task.id, "surface");
});

test("public native rejection reopens a completed target and invalidates dependent evidence", () => {
  const fixture = visualFixture();
  const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].invalidates = []; // Explicit extra invalidations cannot hide real dependency lineage.
  plan.phases.forEach(task => { task.visual.review = true; });
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--puppeteer-module", puppeteerModule, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8" });
    return { exitCode: result.status, value: JSON.parse(result.stdout) };
  };
  for (const id of ["outline", "surface"]) {
    const action = run("next", "--plan", fixture.plan).value;
    const artifact = visualEvidence(fixture, action);
    touch(fixture.dir, `${id}-completion.json`, fs.readFileSync(path.join(fixture.dir, artifact), "utf8"));
    const completed = run("decide", "--choice", id, "--verdict", "complete", "--artifact", `${id}-completion.json`);
    assert.equal(completed.exitCode, 0, JSON.stringify(completed.value));
    assert.equal(run("next").value.stage, "visual-review");
    assert.equal(run("decide", "--choice", id, "--verdict", "accept", "--artifact", `${id}-completion.json`).exitCode, 0);
  }
  assert.equal(run("next").value.type, "done");
  assert.equal(run("decide", "--choice", "outline", "--verdict", "reject", "--answer", "A completed version needs its evidence.").exitCode, 2);
  assert.equal(run("next").value.type, "done");
  assert.equal(run("decide", "--choice", "outline", "--verdict", "reject", "--artifact", "outline-completion.json").exitCode, 1);
  const rejected = run("decide", "--choice", "outline", "--verdict", "reject", "--artifact", "outline-completion.json", "--answer", "The upper corner must be less rounded.");
  assert.equal(rejected.exitCode, 2);
  assert.equal(rejected.value.next.task.id, "outline");
  assert.match(rejected.value.next.feedback, /upper corner/);
  assert.ok(rejected.value.next.previousArtifacts.every(metadata => metadata.status === "stale"));
  const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
  assert.equal(state.extensions.visualTasks.completed.outline.status, "stale");
  assert.equal(state.extensions.visualTasks.completed.surface.status, "stale");
  assert.equal(state.extensions.visualTasks.completed.outline.review.valid, false);
  assert.equal(state.extensions.visualTasks.completed.surface.review.valid, false);
  assert.equal(state.extensions.visualTasks.completed.surface.artifacts.length, 2);
  assert.equal(inspectConsistency(state, fs.readFileSync(path.join(fixture.dir, "events.jsonl"), "utf8")).status, "consistent");
  assert.equal(run("decide", "--choice", "surface", "--verdict", "reject", "--answer", "Future repair must wait.").exitCode, 1);
  assert.equal(run("decide", "--choice", "unknown", "--verdict", "reject", "--answer", "No such target.").exitCode, 1);
});

test("native input, output and plan drift invalidate accepted task reviews while preserving their history", () => {
  for (const changed of ["input", "output", "plan"]) {
    const fixture = visualFixture();
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
    plan.phases[0].visual.review = true;
    touch(fixture.dir, fixture.plan, canonicalJson(plan));
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    const artifact = visualEvidence(fixture, action);
    decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact });
    const accepted = decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact });
    assert.equal(accepted.status, "recorded");
    const oldReview = accepted.review;
    if (changed === "input") touch(fixture.dir, "reference.json", '{"outline":"angular"}');
    if (changed === "output") touch(fixture.dir, "outline.html", "a different rendered version");
    if (changed === "plan") { plan.phases[0].goal = "Match the corrected outline."; touch(fixture.dir, fixture.plan, canonicalJson(plan)); }
    const repair = nextVisualTask(fixture.dir);
    assert.equal(repair.stage, "visual-task", changed);
    assert.equal(repair.task.id, "outline");
    const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
    const review = state.extensions.visualTasks.completed.outline.review;
    assert.deepEqual(review, { ...oldReview, valid: false });
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact }).status, "blocked");
  }
});

test("native scope preserves dirty baselines, rejects another task and resists expanded-scope laundering", t => {
  for (const changed of ["outside.txt", "surface.html"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    touch(fixture.dir, "outside.txt", "pre-existing dirty bytes");
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    const state = () => JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json")));
    const original = structuredClone(state().extensions.visualTasks.active);
    const artifact = visualEvidence(fixture, action);
    touch(fixture.dir, changed, "out-of-scope edit");
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).status, "blocked", changed);
    assert.deepEqual(state().extensions.visualTasks.active, original, "failure and repeated next keep the baseline");
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
    plan.phases[0].visual.scope.push(changed);
    touch(fixture.dir, fixture.plan, canonicalJson(plan));
    const expanded = nextVisualTask(fixture.dir);
    assert.equal(expanded.status, "blocked");
    assert.match(expanded.blockers[0], /original authorization/);
    assert.deepEqual(state().extensions.visualTasks.active, original, "new plan cannot authorize an old edit");
    if (changed === "outside.txt") touch(fixture.dir, changed, "pre-existing dirty bytes"); else fs.unlinkSync(path.join(fixture.dir, changed));
    const repaired = nextVisualTask(fixture.dir);
    assert.equal(repaired.status, undefined, repaired.blockers?.join("; "));
    assert.notEqual(state().extensions.visualTasks.active.planHash, original.planHash);
    const completed = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact: visualEvidence(fixture, repaired) });
    assert.equal(completed.status, "recorded", completed.failure);
    assert.equal(fs.readFileSync(path.join(fixture.dir, "outside.txt"), "utf8"), "pre-existing dirty bytes");
  }
});

test("native baselines require Git, reject cross-root state and do not infer pre-dispatch success", t => {
  const first = visualFixture(), second = visualFixture(), nonGit = fs.mkdtempSync(path.join(os.homedir(), ".design-pipeline-native-nongit-"));
  for (const root of [first.dir, second.dir, nonGit]) t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const action = nextVisualTask(first.dir, { plan: first.plan });
  for (const file of ["state.json", "events.jsonl"]) touch(second.dir, file, fs.readFileSync(path.join(first.dir, file)));
  const crossRoot = nextVisualTask(second.dir, { plan: second.plan });
  assert.equal(crossRoot.status, "blocked");
  assert.match(crossRoot.blockers[0], /another change root/);
  for (const file of ["state.json", "events.jsonl", first.plan, "reference.json", "references/reference-spec.md", "outline-probe.json", "surface-probe.json"]) touch(nonGit, file, fs.readFileSync(path.join(first.dir, file)));
  // Obtain a consistent fresh native state without copying an old root-bound attempt.
  const fresh = createInitialState({ changeId: "visual-example", timestamp: new Date().toISOString(), phase: "implementation", status: "implementing" });
  fs.unlinkSync(path.join(nonGit, "state.json")); fs.unlinkSync(path.join(nonGit, "events.jsonl"));
  writeNewChange(path.join(nonGit, "state.json"), path.join(nonGit, "events.jsonl"), fresh);
  // QA's isolated home may itself sit below the maintenance repo; this fixture must not
  // inherit an ancestor repository when exercising the non-Git boundary.
  const previousCeiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = path.dirname(nonGit);
  try {
    const nonGitAction = nextVisualTask(nonGit, { plan: first.plan });
    assert.equal(nonGitAction.status, "blocked", nonGitAction.blockers?.join("; "));
    assert.match(nonGitAction.blockers.join("; "), /Git/);
  } finally {
    if (previousCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = previousCeiling;
  }
  const missing = visualFixture();
  t.after(() => fs.rmSync(missing.dir, { recursive: true, force: true }));
  const result = decideVisualTask(missing.dir, { plan: missing.plan, choice: "outline", verdict: "complete", artifact: visualEvidence(missing, action) });
  assert.equal(result.status, "blocked");
  assert.match(result.failure, /baseline is missing/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(missing.dir, "state.json"))).extensions.visualTasks.completed.outline, undefined);
});

test("native scope maps a nested change's paths into Git coordinates", t => {
  const fixture = visualFixture(), nested = path.join(fixture.dir, "changes/nested");
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  for (const file of ["state.json", "events.jsonl", fixture.plan, "reference.json", "references/reference-spec.md", "outline-probe.json", "surface-probe.json"]) touch(nested, file, fs.readFileSync(path.join(fixture.dir, file)));
  gitFixture(fixture.dir, "add", "."); gitFixture(fixture.dir, "commit", "-qm", "nested change");
  const action = nextVisualTask(nested, { plan: fixture.plan });
  assert.equal(action.status, undefined, action.blockers?.join("; "));
  const active = JSON.parse(fs.readFileSync(path.join(nested, "state.json"))).extensions.visualTasks.active;
  assert.equal(active.baseline.root, fs.realpathSync.native(fixture.dir));
  assert.ok(active.authorization.every(file => file.startsWith("changes/nested/")));
  assert.equal(decideVisualTask(nested, { choice: "outline", verdict: "complete", artifact: visualEvidence({ dir: nested, plan: fixture.plan }, action) }).status, "recorded");
});

test("native baseline and review retain canonical roots across filesystem aliases", t => {
  const fixture = visualFixture(), aliasParent = tmp(), alias = path.join(aliasParent, "change-alias");
  t.after(() => fs.rmSync(aliasParent, { recursive: true, force: true }));
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
  plan.phases[0].visual.review = true; touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  fs.symlinkSync(fixture.dir, alias, process.platform === "win32" ? "junction" : "dir");
  for (const root of [alias, ...(process.platform === "win32" ? [fixture.dir.toUpperCase()] : [])]) {
    const pending = nextVisualTask(root);
    assert.equal(pending.status, undefined, pending.blockers?.join("; "));
  }
  const artifact = visualEvidence(fixture, action);
  const completed = decideVisualTask(alias, { choice: "outline", verdict: "complete", artifact });
  assert.equal(completed.status, "recorded", completed.failure);
  assert.equal(nextVisualTask(alias).stage, "visual-review");
  assert.equal(decideVisualTask(alias, { choice: "outline", verdict: "accept", artifact }).status, "recorded");
});

test("native completion protects references, guides, outputs, plan and both native controls before capture", t => {
  for (const file of ["reference.json", "references/reference-spec.md", "$reference.json", "$guide.md", "outline.html", "visual-plan.json", "state.json", "events.jsonl"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    if (file.startsWith("$")) {
      touch(fixture.dir, file, "a bound $-prefixed method input");
      const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
      plan.phases[0].visual[file.endsWith(".md") ? "guides" : "references"].push(file);
      touch(fixture.dir, fixture.plan, canonicalJson(plan));
    }
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    visualEvidence(fixture, action);
    fs.unlinkSync(path.join(fixture.dir, "outline-check.json"));
    fs.linkSync(path.join(fixture.dir, file), path.join(fixture.dir, "outline-check.json"));
    const source = fs.readFileSync(path.join(fixture.dir, file)), cliCore = require("../skill/scripts/cli-core.cjs"), original = cliCore.observeInteraction;
    let captures = 0;
    cliCore.observeInteraction = () => { captures++; throw new Error("must not capture"); };
    let result;
    try { result = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" }); } finally { cliCore.observeInteraction = original; }
    assert.equal(result.status, "blocked", file);
    assert.match(result.failure, /overwrite/);
    assert.equal(captures, 0, file);
    assert.deepEqual(fs.readFileSync(path.join(fixture.dir, "outline-check.json")), source, `${file} alias never receives a report`);
    if (!["state.json", "events.jsonl"].includes(file)) assert.deepEqual(fs.readFileSync(path.join(fixture.dir, file)), source);
  }
});

test("native metadata destination cannot overwrite a same-name bound input or another output", t => {
  for (const role of ["inputs", "outputs"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
    plan.phases[0][role].push("outline-completion.json");
    touch(fixture.dir, fixture.plan, canonicalJson(plan));
    touch(fixture.dir, "outline.html", visualHtml);
    touch(fixture.dir, "outline-completion.json", "this bound input/output must remain intact");
    nextVisualTask(fixture.dir, { plan: fixture.plan });
    const before = fs.readFileSync(path.join(fixture.dir, "outline-completion.json"));
    const result = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", chrome: process.execPath, puppeteerModule: path.join(fixture.dir, "missing.cjs") });
    assert.equal(result.status, "blocked", role);
    assert.match(result.failure, /overwrite/);
    assert.deepEqual(fs.readFileSync(path.join(fixture.dir, "outline-completion.json")), before);
  }
});

test("native report destination cannot alias another required check", t => {
  const fixture = visualFixture();
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
  plan.phases[0].visual.checks.push("second-check.json");
  plan.phases[0].visual.verification.push({ ...plan.phases[0].visual.verification[0], check: "second-check.json" });
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const action = nextVisualTask(fixture.dir, { plan: fixture.plan }); visualEvidence(fixture, action);
  fs.unlinkSync(path.join(fixture.dir, "second-check.json"));
  fs.linkSync(path.join(fixture.dir, "outline-check.json"), path.join(fixture.dir, "second-check.json"));
  const before = fs.readFileSync(path.join(fixture.dir, "outline-check.json"));
  const result = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", chrome: process.execPath, puppeteerModule: path.join(fixture.dir, "missing.cjs") });
  assert.equal(result.status, "blocked");
  assert.match(result.failure, /overwrite/);
  assert.deepEqual(fs.readFileSync(path.join(fixture.dir, "outline-check.json")), before);
});

test("native legacy observed-record absence and probe/report drift invalidate technical evidence and review", t => {
  for (const changed of ["legacy", "probe", "report"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
    plan.phases[0].visual.review = true;
    touch(fixture.dir, fixture.plan, canonicalJson(plan));
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    const artifact = visualEvidence(fixture, action);
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).status, "recorded");
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact }).status, "recorded");
    const stateFile = path.join(fixture.dir, "state.json");
    if (changed === "legacy") {
      const state = JSON.parse(fs.readFileSync(stateFile)); delete state.extensions.visualTasks.completed.outline.observation;
      advanceChange(stateFile, path.join(fixture.dir, "events.jsonl"), { expectedSha256: sha256(fs.readFileSync(stateFile)), timestamp: new Date().toISOString(), type: "legacy-fixture", summary: "legacy record has no observed run", visualTasks: state.extensions.visualTasks });
    } else fs.appendFileSync(path.join(fixture.dir, changed === "probe" ? "outline-probe.json" : "outline-check.json"), "\n ");
    const repair = nextVisualTask(fixture.dir);
    assert.equal(repair.task.id, "outline", changed);
    const record = JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.completed.outline;
    assert.equal(record.status, "stale");
    assert.equal(record.review.valid, false);
    assert.equal(record.artifacts.length, 2, "keep old evidence for diagnosis");
  }
});

test("native verification rejects execution-time byte drift and concurrent native CAS changes", t => {
  for (const changed of ["outline.html", "reference.json", "outline-probe.json", "visual-plan.json", "state.json"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan }); visualEvidence(fixture, action);
    const stateFile = path.join(fixture.dir, "state.json"), cliCore = require("../skill/scripts/cli-core.cjs"), original = cliCore.observeInteraction;
    const before = JSON.parse(fs.readFileSync(stateFile)).revision;
    cliCore.observeInteraction = (root, binding) => {
      const observed = syntheticInteraction(root, binding);
      if (changed === "state.json") advanceChange(stateFile, path.join(fixture.dir, "events.jsonl"), { expectedSha256: sha256(fs.readFileSync(stateFile)), timestamp: new Date().toISOString(), summary: "concurrent native writer", type: "concurrent-test" });
      else fs.appendFileSync(path.join(fixture.dir, changed), "\n ");
      return observed;
    };
    let result;
    try { result = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" }); } finally { cliCore.observeInteraction = original; }
    assert.equal(result.status, "blocked", changed);
    assert.match(result.failure, /drift|changed|CAS|scope/i, changed);
    const state = JSON.parse(fs.readFileSync(stateFile));
    assert.equal(state.extensions.visualTasks.completed.outline, undefined);
    assert.ok(state.extensions.visualTasks.active, "unfinished observation retains its original window");
    if (changed === "state.json") assert.equal(state.revision, before + 1, "failed CAS does not overwrite the concurrent transaction");
  }
});

test("native completion rechecks scope and bound bytes after writing observed evidence", t => {
  for (const changed of ["outside.txt", "outline.html", "outline-check.json"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan }); visualEvidence(fixture, action);
    const write = fs.writeFileSync;
    let injected = false;
    fs.writeFileSync = function(file, ...args) {
      const result = write.call(fs, file, ...args);
      if (!injected && path.resolve(String(file)) === path.join(fs.realpathSync.native(fixture.dir), "outline-completion.json")) {
        injected = true;
        write.call(fs, path.join(fixture.dir, changed), "changed after evidence write");
      }
      return result;
    };
    let completed;
    try { completed = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" }); } finally { fs.writeFileSync = write; }
    assert.equal(injected, true);
    assert.equal(completed.status, "blocked", changed);
    assert.match(completed.failure, /scope|drift|hash/i);
    const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"))).extensions.visualTasks;
    assert.equal(progress.completed.outline, undefined);
    assert.ok(progress.active, "late write does not close or reset the attempt");
  }
});

test("without state, next asks for deliverable and tier with a recommendation", () => {
  const dir = tmp();
  const action = nextAction(dir);
  assert.equal(action.type, "ask");
  assert.match(action.record, /--deliverable film\|edit\|web\|ui --tier quick\|standard\|full/);
  assert.ok(action.recommended);
});

test("standard film walks intake, reference, concepts, plan, build, check, review, deliver with two decisions", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "standard" });
  const stage = () => nextAction(dir).stage;
  assert.equal(stage(), "intake");
  assert.equal(nextAction(dir).questions.length, 4);
  decide(dir, { stage: "intake", answer: "default" });
  assert.equal(stage(), "reference");
  decide(dir, { stage: "reference", answer: "none" });
  assert.equal(nextAction(dir).type, "run", "concepts must be written before the user is asked");
  touch(dir, "concepts.md");
  assert.equal(nextAction(dir).type, "ask");
  decide(dir, { stage: "concept", choice: 2 });
  assert.equal(stage(), "plan");
  touch(dir, "storyboard.json", "{}");
  recordGate(dir, "storyboard", "failed");
  assert.equal(stage(), "plan", "a failed storyboard gate keeps the plan stage open");
  recordGate(dir, "storyboard", "passed");
  assert.equal(stage(), "build");
  touch(dir, "out.mp4");
  assert.equal(stage(), "check");
  recordGate(dir, "film", "failed");
  assert.equal(stage(), "check", "the draft is not shown until gates pass");
  recordGate(dir, "film", "passed");
  const review = nextAction(dir);
  assert.equal(review.stage, "review");
  assert.ok(review.show.includes(path.join(dir, "out.mp4")));
  assert.equal(review.show.includes(path.join(dir, "evidence/contact-sheet.png")), false, "a missing contact sheet is not available to review");
  assert.throws(() => decide(dir, { stage: "review", verdict: "reject" }), /one sentence/);
  decide(dir, { stage: "review", verdict: "reject", answer: "The logo lands too early." });
  const again = nextAction(dir);
  assert.equal(again.stage, "check", "a rejection reopens the check for the rebuilt draft");
  assert.deepEqual(again.rules, ["The logo lands too early."]);
  recordGate(dir, "film", "passed");
  decide(dir, { stage: "review", verdict: "accept" });
  assert.equal(stage(), "deliver");
  touch(dir, "final.mp4");
  decide(dir, { stage: "deliver", answer: "final.mp4" });
  const done = nextAction(dir);
  assert.equal(done.type, "done");
  assert.equal(done.evidence.drafts.length, 2);
});

test("quick film skips intake, concepts and review", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "quick" });
  assert.equal(nextAction(dir).stage, "plan");
  assert.equal(nextAction(dir).remaining, 3);
  const waived = tmp();
  initState(waived, { deliverable: "film", tier: "standard" });
  decide(waived, { stage: "intake", answer: "default" });
  decide(waived, { stage: "reference", answer: "none" });
  decide(waived, { stage: "concept", choice: "1" });
  for (const project of [dir, waived]) {
    touch(project, "reference.md", "Unused scaffold reference note.");
    for (const board of [null, "{}"]) {
      if (board) touch(project, "storyboard.json", board);
      const action = nextAction(project);
      assert.match(action.command, /brief|chosen direction/);
      assert.doesNotMatch(action.command, /observed shots|frame ids|Set reference/);
    }
  }
});

test("replicate film requires material routing before build and returns the recorded route", () => {
  const dir = tmp();
  try {
    initState(dir, { deliverable: "film", tier: "quick", mode: "replicate" });
    touch(dir, "reference.md", "Observed blue enamel, metal bevel and foil color at changing angles.");
    touch(dir, "storyboard.json", JSON.stringify({}));
    recordGate(dir, "storyboard", "passed");
    const missing = nextAction(dir);
    assert.equal(missing.stage, "plan");
    assert.match(missing.command, /storyboard.json.rendering/);
    touch(dir, "storyboard.json", JSON.stringify({ rendering: { route: "webgl", requirements: ["clearcoat", "view-dependent-color"], reason: "Enamel reference", samples: [] } }));
    recordGate(dir, "storyboard", "passed");
    const build = nextAction(dir);
    assert.equal(build.stage, "build");
    assert.match(build.command, /clearcoat.*view-dependent-color.*webgl/);
    assert.match(build.command, /enamel.mjs/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("edit asks mad or pv as its first decision and routes to film-edit commands", () => {
  const dir = tmp();
  initState(dir, { deliverable: "edit", tier: "standard" });
  decide(dir, { stage: "intake", answer: "default" });
  assert.match(nextAction(dir).command, /sources\//);
  fs.mkdirSync(path.join(dir, "sources"));
  assert.match(nextAction(dir).command, /film-edit analyze/);
  touch(dir, "edit/analysis.json", "{}");
  const style = nextAction(dir);
  assert.equal(style.stage, "style");
  decide(dir, { stage: "concept", choice: "pv" });
  assert.match(nextAction(dir).command, /film-edit auto .*--style pv/);
});

test("ui uses OpenSpec only at the full tier", () => {
  const quick = tmp();
  initState(quick, { deliverable: "ui", tier: "quick" });
  assert.doesNotMatch(nextAction(quick).command, /OpenSpec change/);
  const full = tmp();
  initState(full, { deliverable: "ui", tier: "full" });
  decide(full, { stage: "intake", answer: "default" });
  assert.match(nextAction(full).command, /OpenSpec change/);
});

test("art director mode routes the concept and review asks to the director", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "standard", director: "claude-opus-5-5" });
  decide(dir, { stage: "intake", answer: "default" });
  decide(dir, { stage: "reference", answer: "none" });
  touch(dir, "concepts.md");
  assert.match(nextAction(dir).director, /claude-opus-5-5/);
});

test("state is validated and not silently replaced", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film" });
  assert.equal(readState(dir).tier, "standard");
  assert.throws(() => initState(dir, { deliverable: "film" }), /--replace/);
  assert.throws(() => initState(dir, { deliverable: "podcast", replace: true }), /allowed: film, edit, web, ui/);
  assert.throws(() => decide(tmp(), { stage: "intake", answer: "x" }), /no project state/);
});

test("CLI next and decide drive the workflow and gates report back", () => {
  const dir = tmp();
  try {
    const invoke = (...args) => spawnSync(process.execPath, [cli, ...args, "--root", dir, "--json"], { encoding: "utf8", windowsHide: true });
    const run = (...args) => {
      const result = invoke(...args);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return JSON.parse(result.stdout);
    };
    assert.equal(run("next", "--deliverable", "film", "--tier", "quick").stage, "plan");
    run("film", "scaffold", "--output", ".");
    run("verify", "film-storyboard", "--storyboard", "storyboard.json");
    assert.equal(run("next").stage, "build", "verify film-storyboard recorded its pass in the state");
    const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json"), "utf8");
    const premature = invoke("decide", "--stage", "deliver", "--answer", "out.mp4");
    assert.equal(premature.status, 1, premature.stdout || premature.stderr);
    assert.match(premature.stdout + premature.stderr, /build/);
    assert.equal(fs.readFileSync(path.join(dir, ".design-pipeline/state.json"), "utf8"), before, "a rejected declaration does not write state");
    assert.ok(readState(dir).gates.storyboard.inputHashes?.["storyboard.json"], "the actual verifier binds its input bytes");
    const board = JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"));
    board.id = "changed-after-check";
    rewriteSameTime(dir, "storyboard.json", JSON.stringify(board));
    assert.equal(run("next").stage, "plan", "actual verifier evidence cannot authorize changed bytes with the old timestamp");
    run("verify", "film-storyboard", "--storyboard", "storyboard.json");
    assert.equal(run("next").stage, "build");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("public next retains failed storyboard repair hints and names changed checked input without writing state", () => {
  const dir = tmp();
  try {
    const invoke = (...args) => spawnSync(process.execPath, [cli, ...args, "--root", dir, "--json"], { encoding: "utf8", windowsHide: true });
    const run = (...args) => {
      const result = invoke(...args);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return JSON.parse(result.stdout);
    };
    run("next", "--deliverable", "film", "--tier", "quick");
    run("film", "scaffold", "--output", ".");
    const original = fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"), board = JSON.parse(original);
    board.beats[0].transformation.kind = "none";
    touch(dir, "storyboard.json", JSON.stringify(board));
    const failed = invoke("verify", "film-storyboard", "--storyboard", "storyboard.json");
    assert.equal(failed.status, 2, failed.stderr || failed.stdout);
    const report = JSON.parse(failed.stdout), finding = report.findings.find(item => item.code === "transformation-missing");
    assert.equal(report.status, "failed");
    assert.ok(finding?.fix, "a contract-valid action with no transformation produces an actionable gate finding");
    const stateFile = path.join(dir, ".design-pipeline/state.json"), afterFailure = fs.readFileSync(stateFile);
    const pending = run("next");
    assert.equal(pending.stage, "plan");
    assert.equal(pending.verification?.gate, "storyboard");
    assert.equal(pending.verification.status, "failed");
    assert.equal(pending.verification.recordedStatus, "failed");
    assert.ok(pending.verification.findings.some(item => item.code === finding.code && item.fix === finding.fix), "a separate next call retains the actual verifier's repair hint");
    assert.deepEqual(fs.readFileSync(stateFile), afterFailure);
    touch(dir, "storyboard.json", original);
    assert.equal(run("verify", "film-storyboard", "--storyboard", "storyboard.json").status, "passed");
    assert.equal(run("next").stage, "build");
    rewriteSameTime(dir, "storyboard.json", JSON.stringify({ ...JSON.parse(original), id: "edited-after-verification" }));
    const beforeResume = fs.readFileSync(stateFile), stale = run("next");
    assert.equal(stale.stage, "plan");
    assert.equal(stale.verification.gate, "storyboard");
    assert.equal(stale.verification.status, "stale");
    assert.equal(stale.verification.recordedStatus, "passed");
    assert.ok(stale.verification.findings.some(item => item.code === "workflow-input-changed" && item.path === "storyboard.json" && typeof item.fix === "string" && item.fix.trim()), "recovery names the changed checked file and a concrete rerun action");
    assert.deepEqual(fs.readFileSync(stateFile), beforeResume);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("public next retains actual film-check step findings and capture-failure recovery through the report seam", () => {
  const { checkFilmProject, scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
  const dir = tmp();
  try {
    initState(dir, { deliverable: "film", tier: "quick" });
    scaffoldFilm(dir);
    const checked = spawnSync(process.execPath, [cli, "verify", "film-storyboard", "--root", dir, "--storyboard", "storyboard.json", "--json"], { encoding: "utf8", windowsHide: true });
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const timeline = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/timeline.example.json"), "utf8"));
    timeline.tweens = timeline.tweens.filter(tween => tween.startSec + tween.durationSec <= 3.8 || tween.startSec >= 8.8);
    touch(dir, "timeline.json", JSON.stringify(timeline));
    const report = checkFilmProject(dir, { capture: () => { throw new Error("isolated capture unavailable"); } });
    const failedStep = report.steps.find(step => step.gate === "timeline"), actual = failedStep.findings.find(finding => finding.code === "beat-static");
    assert.equal(report.status, "failed");
    assert.ok(actual?.message && actual.fix, "the actual timeline check reports the visible failure and repair");
    assert.equal(failedStep.stale, true);
    assert.match(failedStep.source, /capture failed: isolated capture unavailable; used existing timeline\.json/);
    // The real report was computed without a video. This placeholder only reaches CHECK for
    // its public recovery projection; it is never evaluated and proves no render quality.
    touch(dir, "out.mp4", "availability fixture only");
    recordWorkflowGate(dir, "film", report.status, [], report);
    const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile);
    const result = spawnSync(process.execPath, [cli, "next", "--root", dir, "--json"], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const pending = JSON.parse(result.stdout), retained = pending.verification?.findings.find(finding => finding.code === actual.code && finding.gate === "timeline");
    assert.equal(pending.stage, "check");
    assert.equal(pending.verification.status, "failed");
    assert.equal(retained?.message, actual.message, "the step finding's actual explanation survives recordGate and a separate next process");
    assert.equal(retained.fix, actual.fix);
    assert.ok(pending.verification.findings.some(finding => finding.gate === "timeline" && finding.message.includes(failedStep.source) && finding.fix === failedStep.next), "stale capture source/error and its recovery command stay together");
    const skipped = report.steps.find(step => step.gate === "render");
    assert.ok(pending.verification.findings.some(finding => finding.gate === "render" && finding.message.includes(skipped.reason) && finding.fix === skipped.next), "the actual missing-render reason retains the command that unblocks it");
    assert.deepEqual(fs.readFileSync(stateFile), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("public review shows its checked page or video and only available contained supplemental files", () => {
  for (const [deliverable, primary] of [["web", "index.html"], ["film", "renders/checked.mp4"], ["edit", "renders/edit.mp4"]]) {
    const dir = checkedWorkflowFixture(deliverable), external = tmp();
    try {
      if (deliverable === "film") {
        touch(dir, "renders/other.mp4", "another render");
        touch(dir, primary, "the checked render");
        const latest = new Date(Date.now() + 60_000);
        fs.utimesSync(path.join(dir, primary), latest, latest);
        recordWorkflowGate(dir, "film", "passed", ["storyboard.json", primary]);
      }
      const runNext = () => {
        const result = spawnSync(process.execPath, [cli, "next", "--root", dir, "--json"], { encoding: "utf8", windowsHide: true });
        assert.equal(result.status, 0, result.stderr || result.stdout);
        return JSON.parse(result.stdout);
      };
      const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), sheet = path.join(dir, "evidence/contact-sheet.png");
      const initial = runNext();
      assert.equal(initial.stage, "review");
      assert.ok(initial.show.includes(path.join(dir, primary)), `${deliverable} review names the actual checked primary file`);
      assert.doesNotMatch(JSON.stringify(initial.show), /the draft video|the gate summary/);
      assert.equal(initial.show.includes(sheet), false, "unavailable evidence is not presented as a file to open");
      if (deliverable === "web") assert.match(initial.question, /page|interaction/i);
      if (deliverable === "film") {
        assert.equal(initial.show.includes(path.join(dir, "out.mp4")), false);
        assert.equal(initial.show.includes(path.join(dir, "renders/other.mp4")), false);
      }
      touch(dir, "evidence/contact-sheet.png", "available comparison");
      assert.ok(runNext().show.includes(sheet));
      fs.unlinkSync(sheet);
      fs.rmdirSync(path.join(dir, "evidence"));
      touch(external, "contact-sheet.png", "external comparison must not be exposed");
      fs.symlinkSync(external, path.join(dir, "evidence"), process.platform === "win32" ? "junction" : "dir");
      const escaped = runNext();
      assert.ok(escaped.show.includes(path.join(dir, primary)));
      assert.equal(escaped.show.includes(sheet), false, "a supplemental path that resolves outside the project is not available");
      assert.equal(escaped.show.includes(path.join(external, "contact-sheet.png")), false);
      assert.deepEqual(fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), before);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(external, { recursive: true, force: true });
    }
  }
});

test("public next projects actionable missing, unbound, legacy and external cached-pass recovery without writing state", () => {
  const external = tmp(), outsideFile = path.join(external, "private.txt"), secret = "external-file-content-must-not-be-exposed";
  touch(external, "private.txt", secret);
  try {
    for (const [label, prepare, code, file, repair] of [
      ["missing", (state, dir) => fs.unlinkSync(path.join(dir, "interaction.json")), "workflow-input-missing", "interaction.json", /restore|rebuild/i],
      ["unbound", state => delete state.gates.interaction.inputHashes["index.html"], "workflow-input-unbound", "index.html", /interaction\.json\.url.*local index\.html/i],
      ["legacy", state => { state.gates.interaction = { status: "passed", at: Date.now() }; }, "workflow-pass-unbound", undefined, /rerun.*check/i],
      ["external", state => { state.gates.interaction.inputHashes[outsideFile] = "sha256:" + "a".repeat(64); }, "workflow-input-unavailable", outsideFile, /contained.*path/i],
    ]) {
      const dir = checkedWorkflowFixture("web", "quick");
      try {
        const state = readState(dir);
        prepare(state, dir);
        touch(dir, ".design-pipeline/state.json", JSON.stringify(state));
        const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile);
        const result = spawnSync(process.execPath, [cli, "next", "--root", dir, "--json"], { encoding: "utf8", windowsHide: true });
        assert.equal(result.status, 0, result.stderr || result.stdout);
        const pending = JSON.parse(result.stdout), finding = pending.verification?.findings.find(item => item.code === code);
        assert.equal(pending.stage, "probe", label);
        assert.equal(pending.verification.gate, "interaction", label);
        assert.equal(pending.verification.status, "stale", label);
        assert.equal(pending.verification.recordedStatus, "passed", label);
        assert.ok(finding, `${label} identifies the blocked evidence`);
        assert.equal(finding.path, file, label);
        assert.match(finding.fix, repair, label);
        assert.equal(result.stdout.includes(secret), false, "external input bytes never become recovery context");
        assert.deepEqual(fs.readFileSync(stateFile), before, `${label} is a read-only projection of prepared cached state`);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  } finally { fs.rmSync(external, { recursive: true, force: true }); }
});

test("real browser verification binds the page it opened rather than another workflow page", t => {
  const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  let chrome, puppeteerModule;
  try {
    resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    chrome = resolveChrome();
    puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core", { paths: [process.cwd()] });
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    t.skip(error.message);
    return;
  }
  const dir = tmp();
  try {
    initState(dir, { deliverable: "web", tier: "quick" });
    const html = '<!doctype html><button id="target" style="position:absolute;left:20px;top:20px;width:80px;height:40px">target</button>';
    touch(dir, "index.html", html);
    touch(dir, "other.html", html);
    // A real static click records the visited surface; this does not claim a motion response.
    const probe = { schema: "design-pipeline.interaction-probe.v1", id: "page-binding", url: "index.html", probes: [{ id: "static-click", target: "#target", input: { kind: "click", at: [50, 40] }, expect: { responds: false } }] };
    const verify = () => {
      touch(dir, "interaction.json", JSON.stringify(probe));
      const result = spawnSync(process.execPath, [cli, "verify", "interaction", "--root", dir, "--probe", "interaction.json", "--chrome", chrome, "--puppeteer-module", puppeteerModule, "--json"], { encoding: "utf8", windowsHide: true, timeout: 30000 });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(JSON.parse(result.stdout).status, "passed");
    };
    verify();
    assert.ok(readState(dir).gates.interaction.inputHashes["index.html"]);
    assert.equal(nextAction(dir).type, "done");
    probe.url = "other.html";
    verify();
    const checked = readState(dir).gates.interaction.inputHashes;
    assert.ok(checked["other.html"]);
    assert.equal(checked["index.html"], undefined, "an unvisited page is not a checked input");
    const pending = nextAction(dir);
    assert.equal(pending.stage, "probe", "checking other.html does not prove the workflow's index.html");
    const recovery = pending.verification.findings.find(item => item.code === "workflow-input-unbound" && item.path === "index.html");
    assert.match(recovery.fix, /interaction\.json\.url.*local index\.html/i);
    fs.unlinkSync(path.join(dir, "index.html"));
    verify();
    assert.equal(nextAction(dir).stage, "build", "a valid alternate-page verification does not invent a required local index file");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("Windows public storyboard verification accepts the filesystem's case-insensitive path spelling", t => {
  if (process.platform !== "win32") { t.skip("Windows path compatibility"); return; }
  const dir = tmp();
  try {
    const run = (...args) => {
      const result = spawnSync(process.execPath, [cli, ...args, "--root", dir, "--json"], { encoding: "utf8", windowsHide: true });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return JSON.parse(result.stdout);
    };
    run("next", "--deliverable", "film", "--tier", "quick");
    run("film", "scaffold", "--output", ".");
    const original = fs.statSync(path.join(dir, "storyboard.json"), { bigint: true });
    const upper = fs.statSync(path.join(dir, "STORYBOARD.JSON"), { bigint: true });
    assert.notEqual(original.ino, 0n);
    assert.equal(upper.dev, original.dev);
    assert.equal(upper.ino, original.ino);
    assert.equal(run("verify", "film-storyboard", "--storyboard", "STORYBOARD.JSON").status, "passed");
    assert.equal(run("next").stage, "build", "the existing storyboard.json was actually checked through its Windows alias");
    t.diagnostic("Windows storyboard uppercase path verified");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("public interaction output collisions fail before capture without changing protected inputs or external files", async t => {
  const hardlinkOutput = (dir, source) => {
    fs.mkdirSync(path.join(dir, "alias"));
    fs.linkSync(path.join(dir, source), path.join(dir, "alias/interaction.json"));
    return ["--probe", "interaction.json", "--output", "alias"];
  };
  const cases = [
    ["probe same file", () => ["--probe", "interaction.json", "--output", "."], "OUTPUT_COLLISION"],
    ["probe hardlink", dir => hardlinkOutput(dir, "interaction.json"), "OUTPUT_COLLISION"],
    ["measured page hardlink", dir => hardlinkOutput(dir, "index.html"), "OUTPUT_COLLISION"],
    ["workflow state hardlink", dir => hardlinkOutput(dir, ".design-pipeline/state.json"), "OUTPUT_COLLISION"],
    ["measured page same file", (dir, external, probe) => {
      touch(dir, "probe.json", JSON.stringify({ ...probe, url: "interaction.json" }));
      touch(dir, "interaction.json", fs.readFileSync(path.join(dir, "index.html")));
      return ["--probe", "probe.json", "--output", "."];
    }, "OUTPUT_COLLISION"],
    ["default evidence directory escapes", (dir, external) => {
      fs.symlinkSync(external, path.join(dir, "evidence"), process.platform === "win32" ? "junction" : "dir");
      return ["--probe", "interaction.json"];
    }],
    ["default report leaf escapes", (dir, external) => {
      fs.mkdirSync(path.join(dir, "evidence"));
      fs.symlinkSync(path.join(external, "interaction.json"), path.join(dir, "evidence/interaction.json"), "file");
      return ["--probe", "interaction.json"];
    }],
    ["dangling report leaf escapes", (dir, external) => {
      fs.mkdirSync(path.join(dir, "evidence"));
      fs.symlinkSync(path.join(external, "new-report.json"), path.join(dir, "evidence/interaction.json"), "file");
      return ["--probe", "interaction.json"];
    }, undefined, "new-report.json"],
    ["dangling default evidence directory escapes", (dir, external) => {
      fs.symlinkSync(path.join(external, "new-dir"), path.join(dir, "evidence"), process.platform === "win32" ? "junction" : "dir");
      return ["--probe", "interaction.json"];
    }, undefined, "new-dir"],
  ];
  for (const [label, configure, code, missingTarget] of cases) await t.test(label, () => {
    const dir = tmp(), external = tmp();
    try {
      initState(dir, { deliverable: "web", tier: "quick" });
      touch(dir, "index.html", '<!doctype html><button id="target">target</button>');
      const probe = { schema: "design-pipeline.interaction-probe.v1", id: "output-collision", url: "index.html", probes: [{ id: "click", target: "#target", input: { kind: "click", at: [20, 20] }, expect: { responds: false } }] };
      touch(dir, "interaction.json", JSON.stringify(probe));
      touch(external, "interaction.json", "external file must stay unchanged");
      const args = configure(dir, external, probe);
      if (missingTarget) assert.equal(fs.existsSync(path.join(external, missingTarget)), false);
      const files = [path.join(dir, "interaction.json"), path.join(dir, "index.html"), path.join(dir, ".design-pipeline/state.json"), path.join(external, "interaction.json"), ...["probe.json"].filter(file => fs.existsSync(path.join(dir, file))).map(file => path.join(dir, file))];
      const before = files.map(file => fs.readFileSync(file));
      // Invalid tools make a premature capture return KERNEL_FAILED, not the required input/path rejection.
      const result = spawnSync(process.execPath, [cli, "verify", "interaction", "--root", dir, ...args, "--chrome", process.execPath, "--puppeteer-module", path.join(dir, "missing-puppeteer.cjs"), "--json"], { encoding: "utf8", windowsHide: true, timeout: 10000 });
      assert.equal(result.status, 1, result.stderr || result.stdout);
      files.forEach((file, index) => assert.deepEqual(fs.readFileSync(file), before[index], `${label}: ${file}`));
      if (missingTarget) assert.equal(fs.existsSync(path.join(external, missingTarget)), false, "verification must not create the external target");
      const failure = JSON.parse(result.stdout);
      if (code) assert.equal(failure.error.code, code, label);
      else { assert.notEqual(failure.error.code, "KERNEL_FAILED", label); assert.match(failure.error.message, /inside|outside|contain|escape/i); }
      assert.doesNotMatch(failure.error.message, /puppeteer|kernel|capture failed/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(external, { recursive: true, force: true });
    }
  });
});

test("film, edit and web actions name a guide section that exists for every stage", () => {
  for (const deliverable of ["film", "edit", "web"]) {
    const guide = fs.readFileSync(path.join(__dirname, `../skill/references/workflow-${deliverable}.md`), "utf8");
    for (const tier of ["quick", "standard"]) {
      for (const mode of ["brief", "replicate"]) {
        const { stages } = require(`../skill/scripts/workflows/${deliverable}.cjs`);
        for (const stage of stages({ deliverable, tier, mode })) {
          assert.match(guide, new RegExp(`^## ${stage.id}$`, "m"), `${deliverable} guide lacks ## ${stage.id}`);
        }
      }
    }
  }
  const dir = tmp();
  initState(dir, { deliverable: "edit", tier: "quick" });
  assert.equal(nextAction(dir).guide, "references/workflow-edit.md#analyze");
  const ui = tmp();
  initState(ui, { deliverable: "ui", tier: "quick" });
  assert.equal(nextAction(ui).guide, undefined);
});

test("a gate result goes stale when its inputs change", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "quick" });
  touch(dir, "storyboard.json", "{}");
  recordGate(dir, "storyboard", "passed");
  touch(dir, "out.mp4");
  recordGate(dir, "film", "passed");
  assert.equal(nextAction(dir).type, "done");
  rewriteSameTime(dir, "out.mp4", "a different render");
  assert.equal(nextAction(dir).stage, "check", "a re-rendered draft must be checked again");
  rewriteSameTime(dir, "storyboard.json", '{"id":"changed"}');
  assert.equal(nextAction(dir).stage, "plan", "an edited storyboard must pass its gate again");
});

test("unchanged bytes remain checked despite file-clock skew; changed bytes do not", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "quick" });
  touch(dir, "storyboard.json", "{}");
  recordGate(dir, "storyboard", "passed");
  touch(dir, "out.mp4");
  recordGate(dir, "film", "passed");
  const skewed = new Date(Date.now() + 20);
  fs.utimesSync(path.join(dir, "out.mp4"), skewed, skewed);
  assert.equal(nextAction(dir).type, "done");
  const edited = new Date(Date.now() + 1000);
  fs.utimesSync(path.join(dir, "out.mp4"), edited, edited);
  assert.equal(nextAction(dir).type, "done", "timestamps alone do not invalidate identical bytes");
  rewriteSameTime(dir, "out.mp4", "changed without a newer timestamp");
  assert.equal(nextAction(dir).stage, "check");
});

test("replicate mode requires the reference study", () => {
  const film = tmp();
  initState(film, { deliverable: "film", tier: "standard", mode: "replicate" });
  decide(film, { stage: "intake", answer: "default" });
  const ref = nextAction(film);
  assert.equal(ref.stage, "reference");
  assert.equal(ref.then, undefined, "no waiver is offered");
  assert.throws(() => decide(film, { stage: "reference", answer: "none" }), /replicate mode cannot skip/);
  touch(film, "reference.md");
  assert.equal(nextAction(film).stage, "concepts");
  const quick = tmp();
  initState(quick, { deliverable: "film", tier: "quick", mode: "replicate" });
  assert.equal(nextAction(quick).stage, "reference");
  const edit = tmp();
  initState(edit, { deliverable: "edit", tier: "quick", mode: "replicate" });
  touch(edit, "edit/analysis.json", "{}");
  assert.equal(nextAction(edit).stage, "reference");
  touch(edit, "reference.md");
  assert.equal(nextAction(edit).stage, "cut");
});

test("replicate film adapts the scaffold before building and reference edits reopen the plan", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "quick", mode: "replicate" });
  touch(dir, "reference.md", "Source shot: the badge turns; separate its base and enamel face. Asset gaps: edge thickness.");
  const board = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
  board.id = "renamed-example";
  board.rendering = { route: "webgl", requirements: [], reason: "Recorded route for a controlled test", samples: [] };
  touch(dir, "storyboard.json", JSON.stringify(board));
  recordGate(dir, "storyboard", "passed");
  const runNext = () => {
    const result = spawnSync(process.execPath, [cli, "next", "--root", dir, "--project-root", dir, "--json"], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };
  const unadapted = runNext();
  assert.equal(unadapted.stage, "plan", "a structurally passing renamed sample is still the source example");
  assert.match(unadapted.command, /reference\.md/);
  assert.match(unadapted.command, /subject.*productAction.*transformation/);
  assert.ok(unadapted.guides.includes("references/product-film-direction.md#from-reference-to-producible-shots"));
  board.beats[0].subject = "badge enamel face";
  board.beats[0].productAction = "The enamel face turns into the light";
  touch(dir, "storyboard.json", JSON.stringify(board));
  recordGate(dir, "storyboard", "passed");
  const build = runNext();
  assert.equal(build.stage, "build", "template detection is not semantic or visual acceptance");
  rewriteSameTime(dir, "reference.md", "Source shot changed: the badge stays still; only the camera turns.");
  assert.equal(runNext().stage, "plan", "changed source notes invalidate the prior plan check");
});

test("quick frontend replication observes the reference before existing output and cannot waive it", () => {
  for (const deliverable of ["web", "ui"]) {
    const dir = tmp();
    try {
      initState(dir, { deliverable, tier: "quick", mode: "replicate" });
      touch(dir, "index.html");
      const observed = nextAction(dir);
      assert.equal(observed.stage, "reference", `${deliverable} must observe before continuing existing output`);
      assert.equal(observed.then, undefined);
      assert.match(observed.command, /reference-spec\.md/);
      assert.match(observed.command, /reconstruction-spec\.md/);
      assert.match(observed.command, /bounded graybox/);
      assert.match(observed.command, /document delivery.*not.*verified observation/);
      assert.throws(() => decide(dir, { stage: "reference", answer: "none" }), /replicate mode cannot skip/);
      touch(dir, "reference.md", "Observed structure and motion; measurements remain to be checked.");
      recordGate(dir, "reference", "failed");
      assert.equal(nextAction(dir).stage, deliverable === "web" ? "probe" : "work", "aggregate checks must not deadlock observation before graybox exists");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("frontend replication uses the reference at every tier without replacement concept selection", () => {
  for (const deliverable of ["web", "ui"]) {
    for (const tier of ["quick", "standard", "full"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable, tier, mode: "replicate" });
        if (tier !== "quick") decide(dir, { stage: "intake", answer: "default" });
        assert.equal(nextAction(dir).stage, "reference");
        touch(dir, "reference.md");
        const build = nextAction(dir);
        assert.equal(build.stage, deliverable === "web" ? "build" : "work");
        assert.match(build.command, /reference.*invariants/);
        assert.doesNotMatch(build.command, /chosen concept/);
        assert.equal(/OpenSpec change/.test(build.command), tier === "full");
        assert.equal(readState(dir).decisions.concept, undefined);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  }
});

test("frontend actions define bounded visual tasks and keep polish dependent on complete existing checks", () => {
  for (const deliverable of ["web", "ui"]) {
    const dir = tmp();
    try {
      initState(dir, { deliverable, tier: "quick", mode: "replicate" });
      touch(dir, "reference.md");
      const build = nextAction(dir);
      assert.match(build.command, /tasks\.md/);
      for (const field of ["reference region", "scene node", "goal", "invariants", "inputs", "literal modification scope", "outputs", "runtime", "comparison", "failure return"]) {
        assert.ok(build.command.includes(field), `${deliverable} task instruction must include ${field}`);
      }
      assert.match(build.command, /bounded graybox.*structure and occlusion/);
      assert.match(build.command, /complete results.*reference check.*reconstruction check.*scene check/);
      assert.match(build.command, /not ready.*repair.*before material.*polish.*motion/);
      assert.equal(nextAction(dir).stage, build.stage, "task instructions do not create a file-existence completion gate");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("brief and freeform frontend work preserve their quick and concept workflows", () => {
  for (const mode of ["brief", "freeform"]) {
    for (const deliverable of ["web", "ui"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable, tier: "quick", mode });
        assert.equal(nextAction(dir).stage, deliverable === "web" ? "build" : "work");
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    for (const tier of ["standard", "full"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable: "web", tier, mode });
        decide(dir, { stage: "intake", answer: "default" });
        decide(dir, { stage: "reference", answer: "none" });
        assert.equal(nextAction(dir).stage, "concepts");
        touch(dir, "concepts.md");
        assert.equal(nextAction(dir).type, "ask");
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  }
});

test("web quick walks build then probe; standard adds intake, reference, concepts, review, deliver; full opens OpenSpec at build", () => {
  const quick = tmp();
  initState(quick, { deliverable: "web", tier: "quick" });
  assert.equal(nextAction(quick).stage, "build");
  assert.equal(nextAction(quick).remaining, 2);
  touch(quick, "index.html");
  assert.equal(nextAction(quick).stage, "probe");

  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  const stage = () => nextAction(dir).stage;
  assert.equal(stage(), "intake");
  decide(dir, { stage: "intake", answer: "default" });
  assert.equal(stage(), "reference");
  decide(dir, { stage: "reference", answer: "none" });
  assert.equal(nextAction(dir).type, "run", "concepts must be written before the user is asked");
  touch(dir, "concepts.md");
  assert.equal(nextAction(dir).type, "ask");
  decide(dir, { stage: "concept", choice: 2 });
  assert.equal(stage(), "build");
  assert.doesNotMatch(nextAction(dir).command, /OpenSpec change/);
  touch(dir, "index.html");
  assert.equal(stage(), "probe");

  const full = tmp();
  initState(full, { deliverable: "web", tier: "full" });
  decide(full, { stage: "intake", answer: "default" });
  decide(full, { stage: "reference", answer: "none" });
  touch(full, "concepts.md");
  decide(full, { stage: "concept", choice: 1 });
  assert.match(nextAction(full).command, /OpenSpec change/);
});

test("probe asks to write interaction.json when missing, then routes to verify interaction", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "quick" });
  touch(dir, "index.html");
  const missing = nextAction(dir);
  assert.equal(missing.stage, "probe");
  assert.match(missing.command, /interaction\.json/);
  assert.doesNotMatch(missing.command, /verify interaction/);
  touch(dir, "interaction.json", "{}");
  assert.match(nextAction(dir).command, /verify interaction --probe interaction\.json/);
  recordGate(dir, "interaction", "failed");
  assert.equal(nextAction(dir).stage, "probe", "a failed interaction gate keeps probe open");
  recordGate(dir, "interaction", "passed");
  assert.equal(nextAction(dir).type, "done");
});

test("a passed interaction gate goes stale when index.html changes", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "quick" });
  touch(dir, "index.html");
  touch(dir, "interaction.json", "{}");
  recordGate(dir, "interaction", "passed");
  assert.equal(nextAction(dir).type, "done");
  rewriteSameTime(dir, "index.html", "a rebuilt page");
  assert.equal(nextAction(dir).stage, "probe", "a rebuilt page must be probed again");
});

test("a rejected web draft reopens probe", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  decide(dir, { stage: "intake", answer: "default" });
  decide(dir, { stage: "reference", answer: "none" });
  touch(dir, "concepts.md");
  decide(dir, { stage: "concept", choice: 1 });
  touch(dir, "index.html");
  touch(dir, "interaction.json", "{}");
  recordGate(dir, "interaction", "passed");
  const review = nextAction(dir);
  assert.equal(review.stage, "review");
  decide(dir, { stage: "review", verdict: "reject", answer: "The hero tilt snaps instead of easing." });
  assert.equal(nextAction(dir).stage, "probe", "a rejection reopens probe");
});

test("delivery and review cannot bypass unfinished prerequisites or write state", () => {
  for (const deliverable of ["film", "edit", "web", "ui"]) {
    const dir = tmp();
    try {
      initState(dir, { deliverable, tier: "standard" });
      const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile, "utf8");
      assert.throws(() => decide(dir, { stage: "deliver", answer: "final.mp4" }), /intake/);
      assert.equal(fs.readFileSync(stateFile, "utf8"), before);
      if (deliverable !== "ui") {
        assert.throws(() => decide(dir, { stage: "review", verdict: "accept" }), /intake|review/);
        assert.equal(fs.readFileSync(stateFile, "utf8"), before);
      }
      decide(dir, { stage: "intake", answer: "default" });
      if (["film", "web"].includes(deliverable)) {
        const afterIntake = fs.readFileSync(stateFile, "utf8");
        assert.throws(() => decide(dir, { stage: "deliver", answer: "final.mp4" }), /reference/);
        assert.equal(fs.readFileSync(stateFile, "utf8"), afterIntake);
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const ui = tmp();
  try {
    initState(ui, { deliverable: "ui", tier: "quick", mode: "replicate" });
    const before = fs.readFileSync(path.join(ui, ".design-pipeline/state.json"), "utf8");
    assert.throws(() => decide(ui, { stage: "deliver", answer: "evidence.png" }), /reference/);
    assert.equal(fs.readFileSync(path.join(ui, ".design-pipeline/state.json"), "utf8"), before);
  } finally { fs.rmSync(ui, { recursive: true, force: true }); }
});

test("missing required files and timestamp-only legacy passes reopen existing checks", () => {
  for (const [deliverable, gate, missing, stage] of [
    ["film", "storyboard", "storyboard.json", "plan"],
    ["film", "film", "out.mp4", "build"],
    ["edit", "edit", "renders/edit.mp4", "render"],
    ["web", "interaction", "interaction.json", "probe"],
  ]) {
    const dir = checkedWorkflowFixture(deliverable, "quick");
    try {
      assert.equal(nextAction(dir).type, "done");
      const state = readState(dir);
      state.gates[gate] = { status: "passed", at: Date.now() };
      touch(dir, ".design-pipeline/state.json", JSON.stringify(state));
      assert.equal(nextAction(dir).stage, gate === "storyboard" ? "plan" : deliverable === "web" ? "probe" : "check", "legacy state is readable but is not current evidence");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).type, "done");
      fs.unlinkSync(path.join(dir, missing));
      assert.equal(nextAction(dir).stage, stage, "missing checked bytes cannot count as a pass");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("active film composition, timeline, score grid and edit analysis belong to the check snapshot", () => {
  for (const [deliverable, file, gate] of [
    ["film", "index.html", "film"],
    ["film", "timeline.json", "film"],
    ["film", "score-grid.json", "film"],
    ["edit", "edit/analysis.json", "edit"],
  ]) {
    const dir = checkedWorkflowFixture(deliverable, "quick");
    try {
      touch(dir, file, "initial checked input");
      if (deliverable === "film") assert.equal(nextAction(dir).stage, "check", "newly active input was absent from the old checked snapshot");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).type, "done");
      rewriteSameTime(dir, file, "different checked input");
      assert.equal(nextAction(dir).stage, "check", file);
      if (deliverable === "film") {
        recordGate(dir, gate, "passed");
        fs.unlinkSync(path.join(dir, file));
        assert.equal(nextAction(dir).stage, "check", "a removed checked optional input invalidates its proof");
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("film progress follows the actual newest nonempty render and edit custom outputs do not prove the default", () => {
  const film = checkedWorkflowFixture("film", "quick"), edit = checkedWorkflowFixture("edit", "quick");
  try {
    touch(film, "renders/empty.mp4", "");
    assert.equal(nextAction(film).type, "done", "an empty video is not a render candidate");
    touch(film, "renders/newer.mp4", "new render");
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(path.join(film, "renders/newer.mp4"), later, later);
    assert.equal(nextAction(film).stage, "check", "the old out.mp4 pass cannot prove the newly selected render");
    recordWorkflowGate(film, "film", "passed", ["storyboard.json", "renders/newer.mp4"]);
    assert.equal(nextAction(film).type, "done", "a pass of the actual selected render advances");
    rewriteSameTime(film, "renders/newer.mp4", "changed selected render");
    assert.equal(nextAction(film).stage, "check");
    touch(edit, "renders/custom.mp4", "different edit output");
    recordWorkflowGate(edit, "edit", "passed", ["edit.json", "edit/analysis.json", "renders/custom.mp4"]);
    assert.equal(nextAction(edit).stage, "check", "a different output does not prove renders/edit.mp4");
  } finally {
    fs.rmSync(film, { recursive: true, force: true });
    fs.rmSync(edit, { recursive: true, force: true });
  }
});

test("latest owner verdict and changed checked bytes require a fresh review", () => {
  for (const [deliverable, file, gate] of [["film", "out.mp4", "film"], ["edit", "renders/edit.mp4", "edit"], ["web", "index.html", "interaction"]]) {
    const dir = checkedWorkflowFixture(deliverable);
    try {
      assert.equal(nextAction(dir).stage, "review");
      decide(dir, { stage: "review", verdict: "accept" });
      assert.equal(nextAction(dir).stage, "deliver");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "deliver", "rechecking identical bytes preserves the accepted snapshot");
      decide(dir, { stage: "review", verdict: "reject", answer: "The final action reads too early." });
      assert.equal(nextAction(dir).stage, deliverable === "web" ? "probe" : "check");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review", "a historical accept cannot override the latest rejection");
      decide(dir, { stage: "review", verdict: "accept" });
      rewriteSameTime(dir, file, "new draft after acceptance");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review", "engineering conformance does not accept a new draft");
      assert.deepEqual(readState(dir).decisions.drafts.map(draft => draft.verdict), ["accept", "reject", "accept"]);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("film and edit delivery requires an existing contained file and quick may record its checked output", () => {
  for (const deliverable of ["film", "edit"]) {
    const dir = checkedWorkflowFixture(deliverable);
    try {
      decide(dir, { stage: "review", verdict: "accept" });
      touch(dir, "delivered/directory/file.txt");
      for (const answer of [undefined, "missing.mp4", "../outside.mp4", "delivered/directory"]) {
        const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile, "utf8");
        assert.throws(() => decide(dir, { stage: "deliver", answer }), /path|file|exist|inside|answer|directory/);
        assert.equal(fs.readFileSync(stateFile, "utf8"), before);
      }
      const output = deliverable === "film" ? "out.mp4" : "renders/edit.mp4";
      assert.equal(decide(dir, { stage: "deliver", answer: output }).next.type, "done");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const quick = checkedWorkflowFixture(deliverable, "quick");
    try {
      const output = deliverable === "film" ? "out.mp4" : "renders/edit.mp4";
      assert.equal(decide(quick, { stage: "deliver", answer: output }).next.type, "done");
    } finally { fs.rmSync(quick, { recursive: true, force: true }); }
  }
  const web = checkedWorkflowFixture("web", "quick"), ui = tmp();
  try {
    assert.equal(decide(web, { stage: "deliver", answer: "https://example.test/page" }).next.type, "done");
    initState(ui, { deliverable: "ui", tier: "quick" });
    const declared = decide(ui, { stage: "deliver", answer: "evidence.png" }).next;
    assert.equal(declared.type, "done");
    assert.equal(declared.visualAcceptance, "not-evaluated");
  } finally {
    fs.rmSync(web, { recursive: true, force: true });
    fs.rmSync(ui, { recursive: true, force: true });
  }
});

test("standard delivery binds its checked snapshot and film/edit delivery file", () => {
  for (const [deliverable, file, gate] of [["film", "out.mp4", "film"], ["edit", "renders/edit.mp4", "edit"], ["web", "index.html", "interaction"]]) {
    const dir = checkedWorkflowFixture(deliverable);
    try {
      decide(dir, { stage: "review", verdict: "accept" });
      const delivery = deliverable === "web" ? "https://example.test/page" : "final.mp4";
      if (deliverable !== "web") touch(dir, delivery, "delivered version");
      decide(dir, { stage: "deliver", answer: delivery });
      assert.equal(nextAction(dir).type, "done");
      if (deliverable !== "web") {
        rewriteSameTime(dir, delivery, "changed delivery file");
        assert.equal(nextAction(dir).stage, "deliver", "a changed final file requires delivery recording again");
        decide(dir, { stage: "deliver", answer: delivery });
        assert.equal(nextAction(dir).type, "done");
      }
      rewriteSameTime(dir, file, "changed after delivery");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review");
      decide(dir, { stage: "review", verdict: "accept" });
      assert.equal(nextAction(dir).stage, "deliver", "a new acceptance does not restore the old delivery snapshot");
      decide(dir, { stage: "deliver", answer: delivery });
      assert.equal(nextAction(dir).type, "done");
      decide(dir, { stage: "review", verdict: "reject", answer: "The accepted draft still needs a repair." });
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review", "a rejection after done revokes dependent acceptance and delivery");
      decide(dir, { stage: "review", verdict: "accept" });
      assert.equal(nextAction(dir).stage, "deliver");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("unbound legacy review and delivery decisions remain readable but require fresh checkpoints", () => {
  const dir = checkedWorkflowFixture("web");
  try {
    const state = readState(dir);
    state.decisions.drafts = [{ verdict: "accept", reason: null, at: new Date().toISOString() }];
    state.decisions.delivered = "https://example.test/page";
    touch(dir, ".design-pipeline/state.json", JSON.stringify(state));
    assert.equal(nextAction(dir).stage, "review");
    decide(dir, { stage: "review", verdict: "accept" });
    assert.equal(nextAction(dir).stage, "deliver");
    assert.equal(readState(dir).decisions.drafts.length, 2, "legacy history is preserved");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
