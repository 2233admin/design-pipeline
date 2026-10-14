"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, decideVisualTask: actualDecideVisualTask, diligence, initState, nextAction, nextVisualTask, readState, recordGate: recordWorkflowGate } = require("../skill/scripts/workflow-core.cjs");
const { advanceChange, createInitialState, inspectConsistency, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { createArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { analyzeVideo } = require("../skill/scripts/reference-video-core.cjs");
const { stages: webStages } = require("../skill/scripts/workflows/web.cjs");
const { validateShape } = require("../skill/scripts/runtime-review-core.cjs");
const { PLAYBACK, SECTIONS, STATED, acceptSections, approveDescription, confirmPlayback, pickVariant, statedSkip, toBuild, toComponents, variantsPage, writeDescription, writeVariants } = require("./helpers/web-flow.cjs");

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
// An interaction pass carries the rendered-dependency lineage the real verifier records.
function recordGate(root, gate, status) {
  const state = readState(root);
  const inputs = {
    storyboard: ["storyboard.json", ...(state.mode === "replicate" || (state.tier !== "quick" && state.decisions.reference !== "none" && fs.existsSync(path.join(root, "reference.md"))) ? ["reference.md"] : [])],
    film: ["storyboard.json", "out.mp4", ...["index.html", "timeline.json", "score-grid.json"].filter(file => fs.existsSync(path.join(root, file)))],
    edit: ["edit.json", "edit/analysis.json", "renders/edit.mp4"],
    interaction: ["interaction.json", "index.html"],
  }[gate] || [];
  return recordWorkflowGate(root, gate, status, inputs, {}, gate === "interaction" ? { files: ["index.html"], tokens: [], absent: [], remote: [] } : null);
}

// The smallest probe file the web probe stage accepts: it audits the page.
const webProbeFile = JSON.stringify({ schema: "design-pipeline.interaction-probe.v1", id: "page", url: "index.html", probes: [{ id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } }] });

function rewriteSameTime(root, file, body) {
  const absolute = path.join(root, file), before = fs.statSync(absolute);
  touch(root, file, body);
  fs.utimesSync(absolute, before.atime, before.mtime);
}

// A rebuilt draft. A web page keeps the section markers the owner accepted, so it stays built and
// the changed bytes reach the probe and the review.
const redraft = (deliverable, text) => deliverable === "web" ? SECTIONS.map(id => `<section data-section="${id}">${text}</section>`).join("\n") : text;

function prepareWebComponents(root) {
  decide(root, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  touch(root, "component-manifest.json", JSON.stringify({ fromScratch: true, entries: [] }));
}

function checkedWorkflowFixture(deliverable, tier = "standard") {
  const root = tmp();
  initState(root, { deliverable, tier });
  if (deliverable === "web") toComponents(root);
  else if (tier !== "quick") {
    decide(root, { by: "owner", stage: "intake", answer: "default" });
    if (deliverable !== "edit") decide(root, { by: "owner", stage: "reference", answer: "none" });
    decide(root, { by: "owner", stage: "concept", choice: deliverable === "edit" ? "pv" : "1" });
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
  } else if (deliverable === "web") {
    prepareWebComponents(root);
    toBuild(root);
    touch(root, "index.html");
    acceptSections(root);
    touch(root, "interaction.json", webProbeFile);
    recordGate(root, "interaction", "passed");
  } else {
    touch(root, "index.html");
    touch(root, "interaction.json", webProbeFile);
    recordGate(root, "interaction", "passed");
  }
  return root;
}

// Every tier ends at the owner's review of the checked work, so a project at review (or done) is
// past its check stage.
function afterCheck(dir) {
  const next = nextAction(dir);
  return next.type === "done" || next.stage === "review" ? "checked" : next.stage;
}

// Conversational web projects, driven through next/decide and the real CLI. A project made by
// webProject is removed when its test ends.
function webProject(t, { deliverable = "web", tier = "standard", mode = "brief" } = {}) {
  const root = tmp();
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  initState(root, { deliverable, tier, mode });
  return root;
}

// Every file under the project with its digest; a refused record changes none of them.
function snapshot(root, dir = root, files = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) snapshot(root, file, files);
    else files[path.relative(root, file).split(path.sep).join("/")] = sha256(fs.readFileSync(file));
  }
  return files;
}

// A refused record fails with `code` and changes no file; the error is returned for its message.
function refuses(root, options, code) {
  const before = snapshot(root);
  let error = null;
  try { decide(root, { by: "owner", ...options }); } catch (thrown) { error = thrown; }
  assert.equal(error?.code, code, `${JSON.stringify(options)}: ${error ? error.message : "was recorded"}`);
  assert.deepEqual(snapshot(root), before, `refused ${JSON.stringify(options)} changed the project`);
  return error;
}

// The real CLI, run from outside the project; stdout is exactly one JSON result.
function runCli(...args) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
  let json = null;
  try { json = JSON.parse(child.stdout); } catch { json = null; }
  assert.ok(json, `stdout is not one JSON result: ${child.stdout}${child.stderr}`);
  return { status: child.status, json, text: child.stdout + child.stderr };
}
const nextCli = root => runCli("next", "--root", root, "--project-root", root).json;

function decideCli(root, ...args) {
  const result = runCli("decide", "--root", root, "--project-root", root, ...(args.includes("--by") ? [] : ["--by", "owner"]), ...args);
  assert.equal(result.status, 0, result.text);
  assert.equal(result.json.status, "recorded", result.text);
  return result.json.next;
}

function refusesCli(root, args, code) {
  const before = snapshot(root);
  const result = runCli("decide", "--root", root, "--project-root", root, ...(args.includes("--by") ? [] : ["--by", "owner"]), ...args);
  assert.equal(result.status, 1, result.text);
  assert.equal(result.json.ok, false, result.text);
  assert.equal(result.json.error.code, code, result.text);
  assert.deepEqual(snapshot(root), before, `refused ${args.join(" ")} changed the project`);
  return result.json.error;
}

// index.html with one marked section per id, then anything extra (a revision, a comment).
function buildPage(root, ids, extra = "") {
  touch(root, "index.html", `<!doctype html>\n<html lang="en"><body>\n${ids.map(id => `<section data-section="${id}"><h2>${id}</h2></section>\n`).join("")}${extra}</body></html>\n`);
}

// A project at build whose approved description lists `sections`, with components from scratch.
// `keep` keeps review checkpoints with the owner, for tests about the owner's asks.
function approved(t, sections = ["first-screen", "proof"], { keep = [], ...options } = {}) {
  const root = webProject(t, options);
  toComponents(root, { keep });
  prepareWebComponents(root);
  toBuild(root, sections);
  return root;
}

// A project whose sections are all built and accepted, standing at probe.
function atProbe(t, sections = ["first-screen"], options = {}) {
  const root = approved(t, sections, options);
  buildPage(root, sections);
  assert.equal(acceptSections(root).stage, "probe");
  return root;
}

// The interaction pass the probe stage waits for, bound to the checked page.
function passProbe(root) {
  touch(root, "interaction.json", webProbeFile);
  recordGate(root, "interaction", "passed");
}

const rulesFrom = root => readState(root).rules.map(rule => rule.from);
// A rule's words, origin and scope; `since` (its place among the role entries) is left out.
const ruleShapes = root => readState(root).rules.map(({ text, from, scope, object }) => ({ text, from, scope, ...(object ? { object } : {}) }));

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
  assert.match(action.instruction, /sourceObservation.*report.*shotId.*observationIds/);
  assert.equal(fs.existsSync(path.join(dir, ".design-pipeline/state.json")), false);
});

for (const route of ["decompose", "complete", "review"]) {
  test(`native returned ${route} command selects its change from unrelated cwd without media tools`, t => {
    const fixture = visualFixture(), elsewhere = tmp();
    t.after(() => {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
      fs.rmSync(elsewhere, { recursive: true, force: true });
    });
    let action;
    if (route === "decompose") {
      action = nextVisualTask(fixture.dir);
    } else {
      if (route === "review") {
        const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
        plan.phases[0].visual.review = true;
        touch(fixture.dir, fixture.plan, canonicalJson(plan));
      }
      action = nextVisualTask(fixture.dir, { plan: fixture.plan });
      if (route === "review") {
        touch(fixture.dir, "outline.html", visualHtml);
        const completed = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact: "outline-completion.json" });
        assert.equal(completed.status, "recorded", completed.failure);
        action = completed.next;
        assert.equal(action.stage, "visual-review");
      }
    }
    const root = fs.realpathSync.native(fixture.dir).split(path.sep).join("/");
    const command = (action.record || action.command)
      .replace("<change>", `"${root}"`)
      .replace("<file>", "missing-plan.json")
      .replace("accept|reject", "accept")
      .replace("<metadata.json>", "outline-completion.json")
      .replace(' [--answer "<concrete feedback>"]', "");
    const child = spawnSync(command + " --json", { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, route === "complete" ? 2 : 0, child.stdout + child.stderr);
    const result = JSON.parse(child.stdout);
    if (route === "decompose") assert.equal(result.stage, "decompose");
    if (route === "complete") {
      assert.equal(result.status, "blocked", "an unfinished task still fails its own verification, not root validation");
      assert.match(result.failure, /Completion requires an actual task change within its source scope or declared outputs/);
    }
    if (route === "review") {
      assert.equal(result.status, "recorded");
      assert.equal(result.review.valid, true);
      assert.equal(result.next.task.id, "surface");
    }
    assert.ok(command.includes(`--root ${root}`) || command.includes(`--root "${root}"`), command);
    assert.ok(command.includes(`--change-root ${root}`) || command.includes(`--change-root "${root}"`), command);
    assert.deepEqual(fs.readdirSync(elsewhere), []);
    assert.equal(fs.existsSync(path.join(fixture.dir, ".design-pipeline/state.json")), false);
  });
}

test("public native failures retain measured fixes and bound repeated attempts to input/output bytes", t => {
  const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
  let chrome, puppeteerModule;
  try {
    chrome = resolveBrowser(); resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
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
  const rechecked = complete();
  assert.equal(rechecked.value.next.sameSnapshot, true, rechecked.value.failure);
  assert.equal(rechecked.value.next.attempts, 1, "actual verification restarts the count for changed output bytes: " + rechecked.value.failure);
  touch(fixture.dir, "outside.txt", "outside original authorization");
  const scope = complete(); assert.equal(scope.exit, 2);
  assert.equal(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.failures.outline.attempts, 1, "scope blocking is not another observed verifier failure");
  fs.unlinkSync(path.join(fixture.dir, "outside.txt"));
  const missing = invoke("decide", "--choice", "outline", "--verdict", "complete", "--chrome", path.join(fixture.dir, "missing-chrome"), "--puppeteer-module", puppeteerModule);
  assert.equal(missing.exit, 2);
  assert.equal(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.failures.outline.attempts, 1, "missing tools do not add observed attempts");
});

test("native completion refuses a page that loaded another binding's check before writing any check", t => {
  const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
  let chrome, puppeteerModule;
  try {
    chrome = resolveBrowser(); resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE) : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  }
  catch (error) { if (error.code === "TOOL_MISSING") { t.skip(error.message); return; } throw error; }
  const fixture = visualFixture(); t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  // A second page with its own probe and check; only the first page loads that check's bytes.
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan))), task = plan.phases[0];
  const probe = JSON.parse(fs.readFileSync(path.join(fixture.dir, "outline-probe.json"), "utf8"));
  touch(fixture.dir, "second-probe.json", canonicalJson({ ...probe, id: "second", url: "second.html" }));
  task.inputs.push("second-probe.json"); task.outputs.push("second.html"); task.visual.scope.push("second.html");
  task.visual.checks.push("second-check.json");
  task.visual.verification.push({ kind: "interaction", probe: "second-probe.json", target: "second.html", check: "second-check.json" });
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  touch(fixture.dir, "second-check.json", '{"status":"earlier attempt"}');
  gitFixture(fixture.dir, "add", "."); gitFixture(fixture.dir, "commit", "-qm", "two verified pages");
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8", windowsHide: true });
    assert.ok(result.stdout, result.stderr || result.error?.message);
    return { exit: result.status, value: JSON.parse(result.stdout) };
  };
  assert.equal(invoke("next", "--plan", fixture.plan).exit, 0);
  touch(fixture.dir, "outline.html", `${visualHtml}<link rel="stylesheet" href="second-check.json">`);
  touch(fixture.dir, "second.html", visualHtml);
  const before = fs.readFileSync(path.join(fixture.dir, "second-check.json"));
  const result = invoke("decide", "--choice", "outline", "--verdict", "complete", "--chrome", chrome, "--puppeteer-module", puppeteerModule);
  assert.equal(result.value.status, "blocked", JSON.stringify(result.value));
  assert.match(result.value.failure, /second-check\.json, which the page loaded/);
  assert.deepEqual(fs.readFileSync(path.join(fixture.dir, "second-check.json")), before, "the loaded check keeps the bytes the page was measured with");
  assert.equal(fs.existsSync(path.join(fixture.dir, "outline-check.json")), false, "no check is written");
});

test("incomplete capture preserves old observed attempts until the changed output is measured", t => {
  const fixture = visualFixture(); t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  nextVisualTask(fixture.dir, { plan: fixture.plan });
  touch(fixture.dir, "outline.html", visualHtml.replace(' onclick="this.style.transform=\'translateX(20px)\'"', ""));
  for (let attempt = 1; attempt <= 3; attempt++) decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" });
  const stateFile = path.join(fixture.dir, "state.json"), before = JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks;
  assert.equal(before.failures.outline.attempts, 3);
  rewriteSameTime(fixture.dir, "outline.html", fs.readFileSync(path.join(fixture.dir, "outline.html"), "utf8") + "\n<!-- another broken output -->");
  const cliCore = require("../skill/scripts/cli-core.cjs"), observe = cliCore.observeInteraction;
  cliCore.observeInteraction = () => { throw new Error("probe click recorded only 2 samples; capture harness failed"); };
  let blocked;
  try { blocked = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" }); }
  finally { cliCore.observeInteraction = observe; }
  assert.equal(blocked.status, "blocked"); assert.match(blocked.failure, /only 2 samples/);
  const after = JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks;
  assert.equal(after.failures.outline.attempts, 3);
  assert.deepEqual(after.failures.outline.inputHashes, before.failures.outline.inputHashes);
  assert.deepEqual(after.active, before.active);
  assert.equal(blocked.next.sameSnapshot, false); assert.equal(blocked.next.recovery, undefined);
  const measured = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" });
  assert.equal(measured.next.sameSnapshot, true); assert.equal(measured.next.attempts, 1);
  assert.ok(measured.next.findings.some(finding => finding.code === "dead-interaction"));
});

test("public native menu selection fails with typed repair evidence and completes only after real journey repair", t => {
  const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
  let chrome, puppeteerModule;
  try {
    chrome = resolveBrowser(); resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
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
  fs.appendFileSync(path.join(fixture.dir, "outline.html"), "<!-- actual rejected-version repair -->");
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

test("native completion rejects unchanged good outputs and verifier-only writes before observation", t => {
  for (const mode of ["clean", "pre-existing-dirty", "verifier-only"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
    plan.phases[0].visual.scope = ["outline.html", "evidence/", "outline-completion.json", "state.json", "events.jsonl"];
    plan.phases[0].visual.checks = ["evidence/outline-check.json"];
    plan.phases[0].visual.verification[0].check = "evidence/outline-check.json";
    touch(fixture.dir, fixture.plan, canonicalJson(plan));
    touch(fixture.dir, "outline.html", visualHtml);
    gitFixture(fixture.dir, "add", "."); gitFixture(fixture.dir, "commit", "-qm", "pre-existing good output");
    if (mode === "pre-existing-dirty") fs.appendFileSync(path.join(fixture.dir, "outline.html"), "<!-- already dirty -->");
    nextVisualTask(fixture.dir, { plan: fixture.plan });
    const stateFile = path.join(fixture.dir, "state.json");
    const baseline = JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.active;
    if (mode === "verifier-only") {
      touch(fixture.dir, "evidence/outline-check.json", "previous verifier report");
      touch(fixture.dir, "outline-completion.json", "previous verifier metadata");
    }
    const cliCore = require("../skill/scripts/cli-core.cjs"), observe = cliCore.observeInteraction;
    let captures = 0;
    cliCore.observeInteraction = (...args) => { captures++; return syntheticInteraction(...args); };
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const blocked = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" });
        assert.equal(blocked.status, "blocked", mode);
        assert.match(blocked.failure, /actual task change.*source scope.*outputs/i);
        assert.deepEqual(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.active, baseline, "repeated observation retains the original window");
        assert.equal(nextVisualTask(fixture.dir).status, undefined, "an untouched window still dispatches");
      }
    } finally { cliCore.observeInteraction = observe; }
    assert.equal(captures, 0, "no browser observation precedes task work");
    for (const [file, previous] of [["evidence/outline-check.json", "previous verifier report"], ["outline-completion.json", "previous verifier metadata"]]) {
      assert.equal(fs.existsSync(path.join(fixture.dir, file)), mode === "verifier-only", file);
      if (mode === "verifier-only") assert.equal(fs.readFileSync(path.join(fixture.dir, file), "utf8"), previous, "completion preserves verifier-only files");
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(stateFile)).extensions.visualTasks.completed, {});
  }
});

test("native completion accepts actual source or output edits beside verifier evidence", t => {
  for (const changed of ["evidence/source.txt", "outline.html"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
    plan.phases[0].visual.scope = ["evidence/"];
    plan.phases[0].visual.checks = ["evidence/outline-check.json"];
    plan.phases[0].visual.verification[0].check = "evidence/outline-check.json";
    touch(fixture.dir, fixture.plan, canonicalJson(plan)); touch(fixture.dir, "outline.html", visualHtml);
    nextVisualTask(fixture.dir, { plan: fixture.plan });
    touch(fixture.dir, changed, changed.endsWith(".html") ? visualHtml + "<!-- actual output edit -->" : "actual source edit");
    const completed = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" });
    assert.equal(completed.status, "recorded", completed.failure);
    const record = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"))).extensions.visualTasks.completed.outline;
    assert.ok(record.observation.scope.changedFiles.includes(changed));
    assert.equal(record.status, "ready");
    assert.equal(record.review, undefined, "task work and technical verification do not grant owner acceptance");
  }
});

test("native task-change rechecks reject reverted source work before and after evidence writes", t => {
  for (const timing of ["capture", "metadata"]) {
    const fixture = visualFixture();
    t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan)));
    plan.phases[0].visual.scope = ["evidence/"];
    plan.phases[0].visual.checks = ["evidence/outline-check.json"];
    plan.phases[0].visual.verification[0].check = "evidence/outline-check.json";
    touch(fixture.dir, fixture.plan, canonicalJson(plan)); touch(fixture.dir, "outline.html", visualHtml);
    nextVisualTask(fixture.dir, { plan: fixture.plan });
    touch(fixture.dir, "evidence/source.txt", "sole actual task change");
    const source = path.join(fixture.dir, "evidence/source.txt"), cliCore = require("../skill/scripts/cli-core.cjs"), observe = cliCore.observeInteraction, write = fs.writeFileSync;
    cliCore.observeInteraction = (...args) => { const result = syntheticInteraction(...args); if (timing === "capture") fs.unlinkSync(source); return result; };
    fs.writeFileSync = (file, ...args) => { const result = write.call(fs, file, ...args); if (timing === "metadata" && path.basename(String(file)) === "outline-completion.json") fs.unlinkSync(source); return result; };
    let completed;
    try { completed = actualDecideVisualTask(fixture.dir, { choice: "outline", verdict: "complete" }); }
    finally { cliCore.observeInteraction = observe; fs.writeFileSync = write; }
    assert.equal(completed.status, "blocked", timing);
    assert.match(completed.failure, /actual task change/);
    const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"))).extensions.visualTasks;
    assert.equal(progress.completed.outline, undefined);
    assert.ok(progress.active, "restored source cannot close the original window");
    assert.equal(fs.existsSync(path.join(fixture.dir, "evidence/outline-check.json")), timing === "metadata");
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
    const repairedArtifact = visualEvidence(fixture, repaired);
    fs.appendFileSync(path.join(fixture.dir, "outline.html"), "<!-- actual edit after plan rebinding -->");
    const completed = decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact: repairedArtifact });
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
    fs.appendFileSync(path.join(fixture.dir, "outline.html"), "<!-- actual task edit before collision check -->");
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
    fs.writeFileSync = (file, ...args) => {
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
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  assert.equal(stage(), "reference");
  decide(dir, { by: "owner", stage: "reference", answer: "none" });
  assert.equal(nextAction(dir).type, "run", "concepts must be written before the user is asked");
  touch(dir, "concepts.md");
  assert.equal(nextAction(dir).type, "ask");
  decide(dir, { by: "owner", stage: "concept", choice: 2 });
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
  assert.throws(() => decide(dir, { by: "owner", stage: "review", verdict: "reject" }), /one sentence/);
  for (const answer of ["no", "ok", "暗"]) assert.throws(() => decide(dir, { by: "owner", stage: "review", verdict: "reject", answer }), /at least 2 words/, answer);
  assert.equal(readState(dir).decisions.drafts, undefined, "a refused rejection records nothing");
  decide(dir, { by: "owner", stage: "review", verdict: "reject", answer: "The logo lands too early." });
  const again = nextAction(dir);
  assert.equal(again.stage, "check", "a rejection reopens the check for the rebuilt draft");
  assert.deepEqual(again.rules, ["The logo lands too early."]);
  recordGate(dir, "film", "passed");
  decide(dir, { by: "owner", stage: "review", verdict: "accept" });
  assert.equal(stage(), "deliver");
  touch(dir, "final.mp4");
  decide(dir, { by: "owner", stage: "deliver", answer: "final.mp4" });
  const done = nextAction(dir);
  assert.equal(done.type, "done");
  assert.equal(done.evidence.drafts.length, 2);
});

test("quick film skips intake and concepts", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "quick" });
  assert.equal(nextAction(dir).stage, "plan");
  assert.equal(nextAction(dir).remaining, 4);
  const waived = tmp();
  initState(waived, { deliverable: "film", tier: "standard" });
  decide(waived, { by: "owner", stage: "intake", answer: "default" });
  decide(waived, { by: "owner", stage: "reference", answer: "none" });
  decide(waived, { by: "owner", stage: "concept", choice: "1" });
  for (const project of [dir, waived]) {
    touch(project, "reference.md", "Unused scaffold reference note.");
    for (const board of [null, "{}"]) {
      if (board) touch(project, "storyboard.json", board);
      const action = nextAction(project);
      assert.match(action.instruction, /brief|chosen direction/);
      assert.doesNotMatch(action.instruction, /observed shots|frame ids|Set reference/);
    }
  }
});

test("quick film asks for frame review and the owner's verdict before done", () => {
  const dir = checkedWorkflowFixture("film", "quick");
  try {
    const review = nextAction(dir);
    assert.equal(review.type, "ask", "a passing film check is not acceptance");
    assert.equal(review.stage, "review");
    assert.deepEqual(review.completed, ["plan", "build", "check"]);
    assert.match(review.first, /every frame at full size/);
    assert.match(review.first, /qa\.md/);
    assert.match(review.line, /^film\/quick: review \(4\/4\) - Review the checked draft frame by frame first: .*Then ask the owner: Accept this checked draft, or reject it/);
    decide(dir, { by: "owner", stage: "review", verdict: "reject", answer: "Labels cross the terminal at 23 s." });
    assert.equal(nextAction(dir).stage, "check", "a rejection reopens the check");
    assert.deepEqual(nextAction(dir).rules, ["Labels cross the terminal at 23 s."]);
    recordGate(dir, "film", "passed");
    assert.equal(nextAction(dir).stage, "review");
    decide(dir, { by: "owner", stage: "review", verdict: "accept" });
    const done = nextAction(dir);
    assert.equal(done.type, "done");
    assert.deepEqual(done.evidence.drafts.map((draft) => draft.verdict), ["reject", "accept"]);
    rewriteSameTime(dir, "out.mp4", "a new draft after acceptance");
    recordGate(dir, "film", "passed");
    assert.equal(nextAction(dir).stage, "review", "a new draft needs a new verdict");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  for (const deliverable of ["edit", "web"]) {
    const other = checkedWorkflowFixture(deliverable, "quick");
    try {
      const review = nextAction(other);
      assert.equal(review.stage, "review", `${deliverable} quick ends at the owner's review`);
      assert.equal(review.type, "ask");
      decide(other, { by: "owner", stage: "review", verdict: "accept" });
      assert.equal(nextAction(other).type, "done");
    }
    finally { fs.rmSync(other, { recursive: true, force: true }); }
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
    assert.match(missing.instruction, /storyboard.json.rendering/);
    touch(dir, "storyboard.json", JSON.stringify({ rendering: { route: "webgl", requirements: ["clearcoat", "view-dependent-color"], reason: "Enamel reference", samples: [] } }));
    recordGate(dir, "storyboard", "passed");
    const build = nextAction(dir);
    assert.equal(build.stage, "build");
    assert.match(build.instruction, /clearcoat.*view-dependent-color.*webgl/);
    assert.match(build.instruction, /enamel.mjs/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("edit asks mad or pv as its first decision and routes to film-edit commands", () => {
  const dir = tmp();
  initState(dir, { deliverable: "edit", tier: "standard" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  const noSources = nextAction(dir);
  assert.match(noSources.instruction, /sources\//);
  assert.equal(noSources.command, undefined, "putting footage in place has no command");
  fs.mkdirSync(path.join(dir, "sources"));
  assert.match(nextAction(dir).command, /film-edit analyze/);
  touch(dir, "edit/analysis.json", "{}");
  const style = nextAction(dir);
  assert.equal(style.stage, "style");
  decide(dir, { by: "owner", stage: "concept", choice: "pv" });
  assert.match(nextAction(dir).command, /film-edit auto .*--style pv/);
});

test("ui uses OpenSpec only at the full tier", () => {
  const quick = tmp();
  initState(quick, { deliverable: "ui", tier: "quick" });
  assert.doesNotMatch(nextAction(quick).instruction, /OpenSpec change/);
  const full = tmp();
  initState(full, { deliverable: "ui", tier: "full" });
  decide(full, { by: "owner", stage: "intake", answer: "default" });
  assert.match(nextAction(full).instruction, /OpenSpec change/);
});

test("art director mode routes the concept and review asks to the director", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "standard", director: "claude-opus-5-5" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  decide(dir, { by: "owner", stage: "reference", answer: "none" });
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
    const premature = invoke("decide", "--stage", "deliver", "--by", "agent", "--answer", "out.mp4");
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
      ["missing", (_state, dir) => fs.unlinkSync(path.join(dir, "interaction.json")), "workflow-input-missing", "interaction.json", /restore|rebuild/i],
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
  const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
  let chrome, puppeteerModule;
  try {
    resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    chrome = resolveBrowser();
    puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core", { paths: [process.cwd()] });
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    t.skip(error.message);
    return;
  }
  const dir = tmp();
  try {
    initState(dir, { deliverable: "web", tier: "quick" });
    toComponents(dir);
    prepareWebComponents(dir);
    const html = '<!doctype html><html style="background:#fff;font-family:sans-serif"><button id="target" style="position:absolute;left:20px;top:20px;width:80px;height:40px;font-family:inherit">target</button></html>';
    touch(dir, "index.html", html);
    touch(dir, "other.html", html);
    // A real static click records the visited surface; this does not claim a motion response. The
    // page audit the web probe stage requires runs beside it; its optional checks are not declared.
    const audit = { id: "page-audit", kind: "audit", thresholds: { fonts: ["sans-serif"] } };
    const probe = { schema: "design-pipeline.interaction-probe.v1", id: "page-binding", url: "index.html", probes: [{ id: "static-click", target: "#target", input: { kind: "click", at: [50, 40] }, expect: { responds: false } }, audit] };
    const verify = () => {
      touch(dir, "interaction.json", JSON.stringify(probe));
      const result = spawnSync(process.execPath, [cli, "verify", "interaction", "--root", dir, "--probe", "interaction.json", "--chrome", chrome, "--puppeteer-module", puppeteerModule, "--json"], { encoding: "utf8", windowsHide: true, timeout: 30000 });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(JSON.parse(result.stdout).status, "passed");
    };
    verify();
    assert.ok(readState(dir).gates.interaction.inputHashes["index.html"]);
    assert.equal(nextAction(dir).stage, "review", "a passed probe leaves the owner's final review");
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
    ["measured page same file", (dir, _external, probe) => {
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
      prepareWebComponents(dir);
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
  assert.equal(afterCheck(dir), "checked");
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
  assert.equal(afterCheck(dir), "checked");
  const edited = new Date(Date.now() + 1000);
  fs.utimesSync(path.join(dir, "out.mp4"), edited, edited);
  assert.equal(afterCheck(dir), "checked", "timestamps alone do not invalidate identical bytes");
  rewriteSameTime(dir, "out.mp4", "changed without a newer timestamp");
  assert.equal(nextAction(dir).stage, "check");
});

test("replicate mode requires the reference study", () => {
  const film = tmp();
  initState(film, { deliverable: "film", tier: "standard", mode: "replicate" });
  decide(film, { by: "owner", stage: "intake", answer: "default" });
  const ref = nextAction(film);
  assert.equal(ref.stage, "reference");
  assert.equal(ref.then, undefined, "no waiver is offered");
  assert.throws(() => decide(film, { by: "owner", stage: "reference", answer: "none" }), /replicate mode cannot skip/);
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
  assert.match(unadapted.instruction, /reference\.md/);
  assert.match(unadapted.instruction, /subject.*productAction.*transformation/);
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
      if (deliverable === "web") statedSkip(dir);
      touch(dir, "index.html");
      const observed = nextAction(dir);
      assert.equal(observed.stage, "reference", `${deliverable} must observe before continuing existing output`);
      assert.equal(observed.then, undefined);
      assert.match(observed.instruction, /reference-spec\.md/);
      assert.match(observed.instruction, /reconstruction-spec\.md/);
      assert.match(observed.instruction, /bounded graybox/);
      assert.match(observed.instruction, /document delivery.*not.*verified observation/);
      assert.throws(() => decide(dir, { by: "owner", stage: "reference", answer: "none" }), /replicate mode cannot skip/);
      touch(dir, "reference.md", "Observed structure and motion; measurements remain to be checked.");
      recordGate(dir, "reference", "failed");
      assert.equal(nextAction(dir).stage, deliverable === "web" ? "components" : "work", "aggregate checks must not deadlock observation before graybox exists");
      if (deliverable === "web") {
        prepareWebComponents(dir);
        assert.equal(nextAction(dir).stage, "probe");
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("frontend replication uses the reference at every tier without replacement concept selection", () => {
  for (const deliverable of ["web", "ui"]) {
    for (const tier of ["quick", "standard", "full"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable, tier, mode: "replicate" });
        if (deliverable === "web") (tier === "quick" ? statedSkip : confirmPlayback)(dir);
        else if (tier !== "quick") decide(dir, { by: "owner", stage: "intake", answer: "default" });
        assert.equal(nextAction(dir).stage, "reference");
        touch(dir, "reference.md");
        if (deliverable === "web") {
          assert.equal(nextAction(dir).stage, "components");
          prepareWebComponents(dir);
          toBuild(dir);
        }
        const build = nextAction(dir);
        assert.equal(build.stage, deliverable === "web" ? "build" : "work");
        assert.match(build.instruction, /reference.*invariants/);
        assert.doesNotMatch(build.instruction, /chosen concept/);
        assert.equal(/OpenSpec change/.test(build.instruction), tier === "full");
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
      if (deliverable === "web") {
        statedSkip(dir);
        prepareWebComponents(dir);
      }
      const build = nextAction(dir);
      assert.match(build.instruction, /tasks\.md/);
      for (const field of ["reference region", "scene node", "goal", "invariants", "inputs", "literal modification scope", "outputs", "runtime", "comparison", "failure return"]) {
        assert.ok(build.instruction.includes(field), `${deliverable} task instruction must include ${field}`);
      }
      assert.match(build.instruction, /bounded graybox.*structure and occlusion/);
      assert.match(build.instruction, /complete results.*reference check.*reconstruction check.*scene check/);
      assert.match(build.instruction, /not ready.*repair.*before material.*polish.*motion/);
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
        if (deliverable === "web") toComponents(dir);
        assert.equal(nextAction(dir).stage, deliverable === "web" ? "components" : "work");
        if (deliverable === "web") {
          prepareWebComponents(dir);
          assert.equal(nextAction(dir).stage, "build");
        }
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    for (const tier of ["standard", "full"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable: "web", tier, mode });
        confirmPlayback(dir);
        decide(dir, { by: "owner", stage: "reference", answer: "none" });
        assert.equal(nextAction(dir).stage, "concepts");
        writeVariants(dir);
        assert.equal(nextAction(dir).type, "ask");
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  }
});

test("web quick walks intake, components, build then probe; standard adds reference, concepts, description, review, deliver; full opens OpenSpec at build", () => {
  const quick = tmp();
  initState(quick, { deliverable: "web", tier: "quick" });
  assert.equal(nextAction(quick).stage, "intake");
  statedSkip(quick);
  assert.equal(nextAction(quick).stage, "components");
  assert.equal(nextAction(quick).remaining, 4);
  prepareWebComponents(quick);
  assert.equal(nextAction(quick).stage, "build");
  assert.equal(nextAction(quick).remaining, 3);
  touch(quick, "index.html");
  assert.equal(nextAction(quick).stage, "probe");

  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  const stage = () => nextAction(dir).stage;
  assert.equal(stage(), "intake");
  confirmPlayback(dir);
  assert.equal(stage(), "reference");
  decide(dir, { by: "owner", stage: "reference", answer: "none" });
  assert.equal(nextAction(dir).type, "run", "concepts must be written before the user is asked");
  writeVariants(dir);
  assert.equal(nextAction(dir).type, "ask");
  pickVariant(dir, "B");
  assert.equal(stage(), "components");
  prepareWebComponents(dir);
  assert.equal(stage(), "description");
  toBuild(dir);
  assert.equal(stage(), "build");
  assert.doesNotMatch(nextAction(dir).instruction, /OpenSpec change/);
  touch(dir, "index.html");
  assert.equal(acceptSections(dir).stage, "probe");

  const full = tmp();
  initState(full, { deliverable: "web", tier: "full" });
  toComponents(full);
  assert.equal(nextAction(full).stage, "components");
  prepareWebComponents(full);
  toBuild(full);
  assert.match(nextAction(full).instruction, /OpenSpec change/);
});

test("probe asks to write interaction.json when missing, then routes to verify interaction", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "quick" });
  toComponents(dir);
  prepareWebComponents(dir);
  touch(dir, "index.html");
  const missing = nextAction(dir);
  assert.equal(missing.stage, "probe");
  assert.match(missing.instruction, /interaction\.json/);
  assert.match(missing.instruction, /audit probe/, "the first probe file already asks for the page audit");
  assert.equal(missing.command, undefined, "writing the probe is not a command");
  touch(dir, "interaction.json", webProbeFile);
  assert.match(nextAction(dir).command, / verify interaction /);
  recordGate(dir, "interaction", "failed");
  assert.equal(nextAction(dir).stage, "probe", "a failed interaction gate keeps probe open");
  recordGate(dir, "interaction", "passed");
  assert.equal(nextAction(dir).stage, "review", "a passed probe shows the page works; the owner still accepts it");
});

test("a passed interaction gate goes stale when index.html changes", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "quick" });
  toComponents(dir);
  prepareWebComponents(dir);
  touch(dir, "index.html");
  touch(dir, "interaction.json", webProbeFile);
  recordGate(dir, "interaction", "passed");
  assert.equal(nextAction(dir).stage, "review");
  rewriteSameTime(dir, "index.html", "a rebuilt page");
  assert.equal(nextAction(dir).stage, "probe", "a rebuilt page must be probed again");
});

test("a rejected web draft returns to build until the page changes, then probe", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  toComponents(dir);
  prepareWebComponents(dir);
  toBuild(dir);
  touch(dir, "index.html");
  acceptSections(dir);
  touch(dir, "interaction.json", webProbeFile);
  recordGate(dir, "interaction", "passed");
  const review = nextAction(dir);
  assert.equal(review.stage, "review");
  decide(dir, { by: "owner", stage: "review", verdict: "reject", answer: "The hero tilt snaps instead of easing." });
  const repair = nextAction(dir);
  assert.equal(repair.stage, "build", "the unchanged page is repaired before it is shown again");
  assert.match(repair.instruction, /The hero tilt snaps instead of easing/);
  rewriteSameTime(dir, "index.html", redraft("web", "repaired tilt"));
  assert.equal(nextAction(dir).stage, "probe", "the repaired page is probed again");
});

test("web concepts asks for a switchable variants page and a treatment before the choice", () => {
  const dir = tmp();
  try {
    initState(dir, { deliverable: "web", tier: "standard" });
    confirmPlayback(dir);
    decide(dir, { by: "owner", stage: "reference", answer: "none" });
    const write = nextAction(dir);
    assert.equal(write.stage, "concepts");
    assert.equal(write.type, "run");
    assert.match(write.instruction, /concepts\.html/);
    assert.match(write.instruction, /\?variant=/);
    assert.match(write.instruction, /switcher/);
    assert.match(write.instruction, /section/i);
    assert.match(write.instruction, /## Treatment/);
    assert.doesNotMatch(write.instruction, /between beats|the picture/i);
    touch(dir, "concepts.md");
    assert.equal(nextAction(dir).type, "run", "concepts.md alone is not the variants page");
    const findings = () => {
      const action = nextAction(dir);
      assert.equal(action.type, "run");
      return action.findings.map(item => item.code);
    };
    touch(dir, "concepts.html", '<section data-variant="A"></section><section data-variant="B"></section><section data-variant="C"></section>');
    assert.deepEqual(findings(), ["variant-switcher-missing"], "the owner flips between the variants with the switcher");
    touch(dir, "concepts.html", variantsPage(["A", "B"]));
    assert.deepEqual(findings(), ["variants-incomplete"], "all three first screens are on the page");
    touch(dir, "concepts.html", variantsPage());
    const choose = nextAction(dir);
    assert.equal(choose.type, "ask");
    assert.ok(choose.show.includes(path.join(dir, "concepts.html")), "the owner opens the variants page");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("web stage ids per tier and mode keep their order", () => {
  assert.deepEqual(webStages({ tier: "quick" }).map((stage) => stage.id), ["intake", "components", "build", "probe", "review"]);
  assert.deepEqual(webStages({ tier: "quick", mode: "replicate" }).map((stage) => stage.id), ["intake", "reference", "components", "build", "probe", "review"]);
  for (const tier of ["standard", "full"]) {
    assert.deepEqual(webStages({ tier }).map((stage) => stage.id), ["intake", "reference", "concepts", "components", "description", "build", "probe", "review", "deliver"], tier);
    assert.deepEqual(webStages({ tier, mode: "replicate" }).map((stage) => stage.id), ["intake", "reference", "components", "description", "build", "probe", "review", "deliver"], `${tier} replicate`);
  }
});

// The first build step names only the first section: after the treatment and the section briefs
// outside replicate, inside an OpenSpec change at full. Quick builds the whole page (below).
test("web build names only the first section first, extends the chosen card with a treatment outside replicate and opens OpenSpec at full", t => {
  for (const [tier, mode] of [["standard", "brief"], ["full", "freeform"], ["standard", "replicate"], ["full", "replicate"]]) {
    const label = `${tier}/${mode}`;
    const build = nextAction(approved(t, ["first-screen", "pickup"], { tier, mode }));
    assert.equal(build.stage, "build", label);
    assert.equal(build.type, "run", label);
    assert.equal(build.section, "first-screen", label);
    assert.match(build.instruction, /data-section="first-screen"/, label);
    assert.doesNotMatch(build.instruction, /pickup/, `${label}: later sections wait for the owner's review of the first screen`);
    if (mode === "replicate") assert.doesNotMatch(build.instruction, /treatment/i, `${label}: replicate has no concept card to extend`);
    else assert.match(build.instruction, /## Treatment/, label);
    assert.equal(/OpenSpec change/.test(build.instruction), tier === "full", `${label}: OpenSpec at full only`);
    assert.equal(build.remaining, 4, `${label}: build, probe, review, deliver`);
  }
});

test("an existing index.html whose first section is not marked gets the full first-screen step", t => {
  for (const mode of ["brief", "replicate"]) {
    const root = approved(t, ["hero", "pickup"], { mode });
    const fresh = nextAction(root);
    assert.equal(fresh.type, "run", mode);
    assert.equal(fresh.section, "hero", mode);
    buildPage(root, [], "<main>The page as it was before this project</main>\n");
    const existing = nextAction(root);
    assert.equal(existing.stage, "build", mode);
    assert.equal(existing.type, "run", `${mode}: an unmarked first screen is still to be built, not reviewed`);
    assert.equal(existing.section, "hero", mode);
    assert.match(existing.instruction, /data-section="hero"/, mode);
    if (mode === "replicate") assert.doesNotMatch(existing.instruction, /treatment/i, mode);
    else assert.match(existing.instruction, /## Treatment/, mode);
    assert.deepEqual(existing, fresh, `${mode}: the same step as with no page yet`);
  }
});

// The web conversation: assertions pin stages, action shapes, records and rules, not the wording of
// a question; the instruction checks below only check that a mechanism is named.

test("standard and full web intake opens with one open question and a skip command, never a list", t => {
  const openings = {};
  for (const tier of ["standard", "full"]) for (const mode of ["brief", "freeform", "replicate"]) {
    const label = `${tier}/${mode}`;
    const root = webProject(t, { tier, mode });
    const before = snapshot(root);
    const ask = nextAction(root);
    assert.deepEqual(nextAction(root), ask, `${label}: next is stable`);
    assert.deepEqual(snapshot(root), before, `${label}: next only reads`);
    assert.equal(ask.type, "ask", label);
    assert.equal(ask.stage, "intake", label);
    assert.equal(ask.first, undefined, `${label}: nothing comes before the opening question`);
    assert.equal(typeof ask.question, "string", label);
    assert.doesNotMatch(ask.question, /\n/, `${label}: one question, not a list`);
    assert.equal(ask.question.split("?").length - 1, 1, `${label}: exactly one question: ${ask.question}`);
    for (const key of ["questions", "options", "recommended"]) assert.equal(ask[key], undefined, `${label} intake has no ${key}`);
    assert.match(ask.record, /--stage intake --verdict accept --answer /, label);
    assert.match(ask.correction, /--stage intake --verdict reject --answer /, label);
    assert.match(ask.skip, /--stage intake --choice skip --answer /, label);
    openings[label] = ask.question;
  }
  for (const tier of ["standard", "full"]) {
    assert.equal(openings[`${tier}/freeform`], openings[`${tier}/brief`], `${tier}: freeform opens like brief`);
    assert.notEqual(openings[`${tier}/replicate`], openings[`${tier}/brief`], `${tier}: replicate opens on the page being reproduced`);
  }
});

// Mechanism check (spec: the intake instruction carries the conversation rules).
test("the web intake instruction names the conversation rules", t => {
  for (const tier of ["standard", "full"]) for (const mode of ["brief", "replicate"]) {
    const label = `${tier}/${mode}`;
    const { instruction } = nextAction(webProject(t, { tier, mode }));
    assert.match(instruction, /look(?:ed)? up/i, `${label}: facts are looked up`);
    assert.match(instruction, /never ask/i, `${label}: facts are not asked`);
    assert.match(instruction, /one open question per message/i, `${label}: one open question per message`);
    assert.match(instruction, /short card, one line each: three intent lines \(what the page expresses, who it connects with and how, what makes it unlike other pages\)/, `${label}: the playback is a card of three intent lines`);
    assert.match(instruction, /uncertainties still open/, `${label}: the card names the open uncertainties`);
    assert.match(instruction, /what you will decide and what stays theirs/, `${label}: the card carries the delegation line`);
    assert.match(instruction, /\bsaid\b/i, `${label}: what the owner said`);
    assert.match(instruction, /\bguess/i, `${label}: apart from what the agent guessed`);
  }
});

test("a web skip records only a stated decision through the CLI, and web intake never writes brief.md", t => {
  const root = webProject(t);
  const skip = answer => ["--stage", "intake", "--choice", "skip", ...(answer === undefined ? [] : ["--answer", answer])];
  for (const answer of [undefined, "default"]) refusesCli(root, skip(answer), "CONTRACT_INVALID");
  refusesCli(root, ["--stage", "intake", "--answer", "A landing page for a bakery that takes preorders"], "CONTRACT_INVALID");
  assert.equal(decideCli(root, ...skip(STATED)).stage, "reference");
  assert.deepEqual(readState(root).decisions.intake, { answer: STATED, skipped: true, by: "owner" });
  assert.equal(readState(root).delegation.intake.to, "agent", "a skipped conversation hands intake to the agent");
  assert.equal(fs.existsSync(path.join(root, "brief.md")), false);

  const quick = webProject(t, { tier: "quick" });
  const run = nextCli(quick);
  assert.equal(run.type, "run");
  assert.equal(run.stage, "intake");
  assert.match(run.command, / decide .*--by agent --stage intake --choice skip --answer /, "quick intake is the agent's stated decision");
  refusesCli(quick, ["--stage", "intake", "--answer", STATED], "CONTRACT_INVALID");
  assert.equal(decideCli(quick, "--by", "agent", ...skip(STATED)).stage, "components");
  assert.deepEqual(readState(quick).decisions.intake, { answer: STATED, skipped: true, by: "agent", agent: "unspecified" });
  assert.equal(fs.existsSync(path.join(quick, "brief.md")), false);
});

// A go-ahead is not a decision: a stated decision (the skip line, the confirmed playback) needs six
// words, two CJK characters counting as one. A "no" is the owner's own feedback: two words, each CJK
// character counting as one, so short Chinese feedback is a complete reason and a bare "no" is not.
test("stated decisions need six words and every no two, through the CLI", t => {
  const root = webProject(t), quick = webProject(t, { tier: "quick" });
  const intake = (...args) => ["--stage", "intake", ...args];
  for (const answer of ["OK, start.", "proceed", "do it", "just start", "yes, build it as shown", "默认", "直接开始吧", "我要做一个面包店的预订"]) {
    for (const [project, args] of [[root, intake("--choice", "skip")], [root, intake("--verdict", "accept")], [quick, intake("--choice", "skip")]]) {
      assert.match(refusesCli(project, [...args, "--answer", answer], "CONTRACT_INVALID").message, /at least 6 words/, `${args.join(" ")} --answer ${answer}`);
    }
  }
  const tooShort = ["no", "ok", "暗"];
  for (const answer of tooShort) assert.match(refusesCli(root, intake("--verdict", "reject", "--answer", answer), "CONTRACT_INVALID").message, /at least 2 words; each CJK character counts as one/, answer);
  for (const answer of ["Too dark", "首屏太暗了", "太挤"]) decideCli(root, ...intake("--verdict", "reject", "--answer", answer));
  assert.deepEqual(readState(root).rules.map(rule => rule.text), ["Too dark", "首屏太暗了", "太挤"], "short owner feedback is a complete reason");
  assert.equal(decideCli(root, ...intake("--choice", "skip", "--answer", STATED)).stage, "reference");
  decideCli(root, ...intake("--choice", "skip", "--answer", "我要做一个面包店的预订页"));
  assert.equal(readState(root).decisions.intake.answer, "我要做一个面包店的预订页", "twelve CJK characters are six words");
  assert.equal(decideCli(quick, ...intake("--choice", "skip", "--answer", "I will build the pricing card")).stage, "components");

  const built = approved(t, ["first-screen"]);
  buildPage(built, ["first-screen"]);
  const section = answer => ["--stage", "section", "--choice", "first-screen", "--verdict", "reject", "--answer", answer];
  for (const answer of tooShort) assert.match(refusesCli(built, section(answer), "CONTRACT_INVALID").message, /at least 2 words/, answer);
  decideCli(built, ...section("首屏太暗了"));
  assert.deepEqual(ruleShapes(built), [{ text: "首屏太暗了", from: "section first-screen 1", scope: "object", object: { stage: "section", choice: "first-screen" } }]);
});

test("anti-goals named with the confirmed playback or a skip become project rules through the CLI", t => {
  for (const tier of ["standard", "quick"]) assert.match(nextAction(webProject(t, { tier })).instruction, /--anti-goal/, `${tier}: the intake instruction offers the flag`);
  const goals = (...texts) => texts.flatMap(text => ["--anti-goal", text]);
  const root = webProject(t);
  const accept = ["--stage", "intake", "--verdict", "accept", "--answer", PLAYBACK];
  assert.match(refusesCli(root, [...accept, ...goals("Ads")], "CONTRACT_INVALID").message, /at least 2 words/, "an anti-goal is a no");
  assert.match(refusesCli(root, ["--stage", "intake", "--verdict", "reject", "--answer", "It is for florists, not bakeries", ...goals("Never look like a delivery app")], "CONTRACT_INVALID").message, /--anti-goal/, "a correction is already a rule");
  decideCli(root, ...accept, ...goals("Never look like a delivery app"));
  assert.deepEqual(readState(root).rules, [{ text: "Never look like a delivery app", from: "anti-goal 1", scope: "project" }]);
  decideCli(root, "--stage", "intake", "--choice", "skip", "--answer", STATED, ...goals("Never look like a delivery app", "No countdown timers or pop-ups"));
  assert.deepEqual(readState(root).rules, [
    { text: "Never look like a delivery app", from: "anti-goal 1", scope: "project" },
    { text: "No countdown timers or pop-ups", from: "anti-goal 2", scope: "project" },
  ], "the repeated anti-goal is not added again");
  assert.deepEqual(nextCli(root).rules, ["Never look like a delivery app", "No countdown timers or pop-ups"]);
  assert.match(refusesCli(root, ["--stage", "reference", "--answer", "none", ...goals("No stock photos anywhere")], "CONTRACT_INVALID").message, /--anti-goal/, "another stage");
  const film = webProject(t, { deliverable: "film" });
  assert.match(refusesCli(film, ["--stage", "intake", "--answer", "A launch film for the bakery app", ...goals("Never look like an advert")], "CONTRACT_INVALID").message, /--anti-goal/, "a film project");
  const quick = webProject(t, { tier: "quick" });
  decideCli(quick, "--stage", "intake", "--choice", "skip", "--answer", STATED, ...goals("No carousel anywhere on the page"));
  assert.deepEqual(readState(quick).rules, [{ text: "No carousel anywhere on the page", from: "anti-goal 1", scope: "project" }]);
});

// The intake commands next returns carry the repeatable --anti-goal, so an agent that runs a command
// as returned keeps every anti-goal. The command is split into arguments (no shell), its placeholders
// filled, and run with the real CLI.
test("the intake commands next returns record two anti-goals through the real CLI", t => {
  const PLACEHOLDER = '[--anti-goal "<anti-goal>" ...]';
  const goals = ["Never look like a delivery app", "No countdown timers or pop-ups"];
  const run = (root, template, answer) => {
    assert.ok(template.endsWith(` ${PLACEHOLDER}`), template);
    const command = template.replace(PLACEHOLDER, goals.map(goal => `--anti-goal "${goal}"`).join(" ")).replace(/"<[^>]*>"/, `"${answer}"`);
    const [node, ...args] = command.match(/"[^"]*"|\S+/g).map(token => token.replace(/^"(.*)"$/, "$1"));
    assert.equal(node, "node", command);
    assert.ok(!args.some(arg => /[<>[\]]/.test(arg)), `no placeholder is left: ${command}`);
    const child = spawnSync(process.execPath, [...args, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    assert.deepEqual(readState(root).rules, goals.map((text, index) => ({ text, from: `anti-goal ${index + 1}`, scope: "project" })), command);
    assert.notEqual(nextAction(root).stage, "intake", "intake is finished");
  };
  const standard = webProject(t);
  const ask = nextAction(standard);
  assert.ok(!ask.correction.includes("--anti-goal"), "a correction takes no anti-goal");
  run(standard, ask.record, PLAYBACK);
  const skipped = webProject(t);
  run(skipped, nextAction(skipped).skip, STATED);
  const quick = webProject(t, { tier: "quick" });
  run(quick, nextAction(quick).command, STATED);
});

test("the playback must be confirmed before concepts; each correction becomes a rule and reopens intake", t => {
  const root = webProject(t);
  const opening = nextAction(root);
  decide(root, { by: "owner", stage: "intake", verdict: "reject", answer: "It is for florists, not bakeries" });
  const corrected = nextAction(root);
  assert.equal(corrected.stage, "intake");
  assert.equal(corrected.type, "ask");
  assert.equal(typeof corrected.first, "string", "the agent plays it back again before it asks");
  assert.ok(corrected.first.includes("It is for florists, not bakeries"), corrected.first);
  assert.ok(corrected.line.endsWith(`${corrected.first} ${corrected.question}`), corrected.line);
  assert.notEqual(corrected.question, opening.question);
  assert.equal(corrected.questions, undefined);
  // Later work on disk opens nothing while the playback is unconfirmed.
  decide(root, { by: "owner", stage: "reference", answer: "none" });
  writeVariants(root);
  assert.equal(nextAction(root).stage, "intake");
  refuses(root, { by: "owner", stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");
  refuses(root, { by: "owner", stage: "concept", verdict: "reject", answer: "The variants are too busy" }, "WORKFLOW_NOT_READY");
  decide(root, { by: "owner", stage: "intake", verdict: "reject", answer: "Mention same-day pickup" });
  assert.equal(nextAction(root).stage, "intake");
  assert.deepEqual(ruleShapes(root), [
    { text: "It is for florists, not bakeries", from: "playback 1", scope: "object", object: { stage: "review" } },
    { text: "Mention same-day pickup", from: "playback 2", scope: "object", object: { stage: "review" } },
  ]);

  confirmPlayback(root);
  const concepts = nextAction(root);
  assert.equal(concepts.stage, "concepts");
  assert.equal(concepts.type, "ask");
  assert.deepEqual(readState(root).decisions.intake, { answer: PLAYBACK, playback: "confirmed", by: "owner" });
  assert.deepEqual(readState(root).decisions.playbacks.map(item => item.verdict), ["reject", "reject", "accept"]);
  assert.equal(fs.existsSync(path.join(root, "brief.md")), false);

  pickVariant(root, "A");
  assert.equal(nextAction(root).stage, "components");
  decide(root, { by: "owner", stage: "intake", verdict: "reject", answer: "Pickup is on weekends only" });
  assert.equal(nextAction(root).stage, "intake", "a later correction reopens intake");
  assert.deepEqual(rulesFrom(root), ["playback 1", "playback 2", "playback 3"]);
  confirmPlayback(root);
  assert.equal(nextAction(root).stage, "components");
});

test("a no in the decision round is a project rule and leaves the components decision open", t => {
  const root = webProject(t);
  const no = "Do not reuse the old carousel component";
  confirmPlayback(root, PLAYBACK, ["components"]);
  decide(root, { by: "owner", stage: "reference", answer: "none" });
  writeVariants(root);
  assert.equal(nextAction(root).stage, "concepts");
  refuses(root, { by: "owner", stage: "components", verdict: "reject", answer: no }, "WORKFLOW_NOT_READY");
  pickVariant(root);
  assert.equal(nextAction(root).stage, "components");
  refuses(root, { by: "owner", stage: "components", verdict: "accept", answer: no }, "CONTRACT_INVALID");
  refuses(root, { by: "owner", stage: "components", verdict: "reject", choice: "scratch", answer: no }, "CONTRACT_INVALID");
  decide(root, { by: "owner", stage: "components", verdict: "reject", answer: no });
  const ask = nextAction(root);
  assert.equal(ask.stage, "components");
  assert.equal(ask.type, "ask");
  assert.deepEqual(ask.rules, [no]);
  const { decisions, rules } = readState(root);
  assert.equal(decisions.components, undefined, "a correction records no components decision");
  assert.equal(decisions.componentSources, undefined);
  assert.deepEqual(decisions.rounds.map(({ verdict, reason }) => ({ verdict, reason })), [{ verdict: "reject", reason: no }]);
  assert.deepEqual(ruleShapes(root), [{ text: no, from: "decisions 1", scope: "object", object: { stage: "review" } }]);
  assert.ok(rules.length === 1);
  decide(root, { by: "owner", stage: "components", verdict: "reject", answer: "Keep the icons out of the header" });
  assert.deepEqual(rulesFrom(root), ["decisions 1", "decisions 2"]);
  prepareWebComponents(root);
  assert.equal(nextAction(root).stage, "description");
});

test("nothing is built until the owner approves the description, through the CLI", t => {
  const root = webProject(t);
  toComponents(root, { keep: ["description", "section"] });
  prepareWebComponents(root);
  buildPage(root, ["first-screen"]);
  const unwritten = nextCli(root);
  assert.equal(unwritten.stage, "description", "a page written early does not skip the description");
  assert.equal(unwritten.type, "run");
  assert.match(unwritten.instruction, /brief\.md/);
  refusesCli(root, ["--stage", "description", "--verdict", "accept", "--choice", "first-screen"], "WORKFLOW_NOT_READY");
  refusesCli(root, ["--stage", "section", "--choice", "first-screen", "--verdict", "accept"], "WORKFLOW_NOT_READY");

  writeDescription(root, ["first-screen", "proof"]);
  const ask = nextCli(root);
  assert.equal(ask.stage, "description");
  assert.equal(ask.type, "ask");
  assert.deepEqual(ask.show.map(file => path.relative(root, file)), ["brief.md"], "the owner is shown brief.md");
  assert.match(ask.record, /--stage description --verdict accept --choice /);
  assert.match(ask.correction, /--stage description --verdict reject --answer /);
  refusesCli(root, ["--stage", "section", "--choice", "first-screen", "--verdict", "accept"], "WORKFLOW_NOT_READY");
  for (const choice of ["first-screen,pricing", "First-Screen", "first-screen,first-screen", "first-screen"]) {
    refusesCli(root, ["--stage", "description", "--verdict", "accept", "--choice", choice], "CONTRACT_INVALID");
  }

  const revise = decideCli(root, "--stage", "description", "--verdict", "reject", "--answer", "Say who the regulars are");
  assert.equal(revise.stage, "description");
  assert.equal(revise.type, "ask");
  assert.ok(revise.first.includes("Say who the regulars are"), revise.first);
  assert.deepEqual(ruleShapes(root), [{ text: "Say who the regulars are", from: "description 1", scope: "object", object: { stage: "review" } }]);
  fs.appendFileSync(path.join(root, "brief.md"), "\nFor regulars who reserve tomorrow's bread on their phones.\n");

  fs.rmSync(path.join(root, "index.html"));
  const build = decideCli(root, "--stage", "description", "--verdict", "accept", "--choice", "first-screen,proof");
  assert.equal(build.stage, "build");
  assert.equal(build.type, "run");
  assert.equal(build.section, "first-screen");
  assert.match(build.instruction, /data-section="first-screen"/);
  assert.doesNotMatch(build.instruction, /data-section="proof"/);
  assert.match(build.instruction, /## Treatment/);
  const approval = readState(root).decisions.descriptions.at(-1);
  assert.equal(approval.verdict, "accept");
  assert.deepEqual(approval.sections, ["first-screen", "proof"]);
  assert.equal(approval.sha256, `sha256:${sha256(fs.readFileSync(path.join(root, "brief.md")))}`);
});

test("the description approval names the brief's ## Sections list exactly, and a reorder keeps the accepted sections", t => {
  const root = webProject(t);
  toComponents(root, { keep: ["description", "section"] });
  prepareWebComponents(root);
  const jobs = { pickup: "how pickup works", hero: "today's bakes and the reserve button", story: "the shop's story" };
  const brief = order => `# Brief\n\nA one-page site for a bakery that takes preorders.\n\n## Sections\n\n${order.map(id => `- ${id}: ${jobs[id]}`).join("\n")}\n\n## Constraints\n\n- phones: most visitors reserve on their phones\n`;
  touch(root, "brief.md", "# Brief\n\nA one-page site for a bakery that takes preorders. Sections in build order: pickup, hero, story.\n");
  refuses(root, { by: "owner", stage: "description", verdict: "accept", choice: "pickup,hero,story" }, "CONTRACT_INVALID");
  touch(root, "brief.md", brief(["pickup", "hero", "story"]));
  for (const choice of ["pickup,hero,site,story", "hero,pickup,story"]) {
    assert.match(refuses(root, { by: "owner", stage: "description", verdict: "accept", choice }, "CONTRACT_INVALID").message, /pickup, hero, story/, `${choice} is checked against the list`);
  }
  decide(root, { by: "owner", stage: "description", verdict: "accept", choice: "pickup,hero,story" });
  assert.deepEqual(readState(root).decisions.descriptions.at(-1).sections, ["pickup", "hero", "story"]);
  buildPage(root, ["pickup"]);
  decide(root, { by: "owner", stage: "section", choice: "pickup", verdict: "accept" });
  assert.equal(nextAction(root).section, "hero");
  decide(root, { by: "owner", stage: "description", verdict: "accept", choice: "pickup,hero,story" });
  const kept = nextAction(root);
  assert.equal(kept.stage, "build");
  assert.equal(kept.section, "hero", "the identical approval recorded again keeps the accepted sections");

  touch(root, "brief.md", brief(["hero", "pickup", "story"]));
  const reordered = nextAction(root);
  assert.equal(reordered.stage, "description", "a reordered list is a changed description");
  assert.match(reordered.first, /the section order/);
  refuses(root, { by: "owner", stage: "description", verdict: "accept", choice: "hero,pickup,story", revision: "bytes" }, "CONTRACT_INVALID");
  decide(root, { by: "owner", stage: "description", verdict: "accept", choice: "hero,pickup,story", revision: "commitment", affects: "none" });
  buildPage(root, ["hero", "pickup"]);
  const ask = nextAction(root);
  assert.equal(ask.section, "hero", "the build follows the new order");
  decide(root, { by: "owner", stage: "section", choice: "hero", verdict: "accept" });
  assert.equal(nextAction(root).section, "story", "pickup keeps the verdict it was given before the reorder");
});

test("an owner's BRIEF.md is the description the approval binds", t => {
  const root = webProject(t);
  toComponents(root, { keep: ["description", "section"] });
  prepareWebComponents(root);
  touch(root, "BRIEF.md", "# Brief\n\nThe owner's own brief.\n\n## Sections\n\n- first-screen: today's bakes and the reserve button\n");
  const ask = nextAction(root);
  assert.equal(ask.stage, "description");
  assert.equal(ask.type, "ask");
  assert.deepEqual(ask.show.map(file => path.relative(root, file)), ["BRIEF.md"]);
  decide(root, { by: "owner", stage: "description", verdict: "accept", choice: "first-screen" });
  assert.equal(nextAction(root).stage, "build");
  fs.appendFileSync(path.join(root, "BRIEF.md"), "\nAdded after the approval.\n");
  assert.equal(nextAction(root).stage, "description");
});

test("quick builds the whole page with no description and no section reviews", t => {
  const root = webProject(t, { tier: "quick" });
  toComponents(root);
  prepareWebComponents(root);
  const run = nextAction(root);
  assert.equal(run.stage, "build");
  assert.equal(run.type, "run");
  assert.equal(run.section, undefined, "quick builds the whole page");
  assert.doesNotMatch(run.instruction, /treatment/i);
  writeDescription(root, ["first-screen"]);
  refuses(root, { by: "owner", stage: "description", verdict: "accept", choice: "first-screen" }, "CONTRACT_INVALID");
  buildPage(root, []);
  assert.equal(nextAction(root).stage, "probe");
  buildPage(root, ["first-screen"]);
  refuses(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "reject", answer: "Make the headline bigger" }, "CONTRACT_INVALID");
});

test("sections are built and accepted one at a time in the approved order, each rejection a rule", t => {
  const root = approved(t, ["first-screen", "proof"], { keep: ["section"] });
  assert.equal(nextAction(root).section, "first-screen");
  buildPage(root, ["first-screen"]);
  const first = nextAction(root);
  assert.equal(first.stage, "build");
  assert.equal(first.type, "ask");
  assert.equal(first.section, "first-screen");
  assert.equal(first.first, undefined);
  assert.match(first.record, /--stage section --choice first-screen --verdict accept\|reject/);
  refuses(root, { by: "owner", stage: "section", choice: "proof", verdict: "accept" }, "WORKFLOW_NOT_READY");
  buildPage(root, ["first-screen", "proof"]);
  assert.equal(nextAction(root).section, "first-screen", "a later section waits for the first");
  refuses(root, { by: "owner", stage: "section", choice: "proof", verdict: "accept" }, "WORKFLOW_NOT_READY");
  refuses(root, { by: "owner", stage: "section", choice: "pricing", verdict: "reject", answer: "Add the prices here" }, "CONTRACT_INVALID");

  buildPage(root, ["first-screen"]);
  decide(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "accept" });
  const second = nextAction(root);
  assert.equal(second.stage, "build");
  assert.equal(second.type, "run");
  assert.equal(second.section, "proof");
  assert.match(second.instruction, /data-section="proof"/);
  buildPage(root, ["first-screen", "proof"]);
  const proof = nextAction(root);
  assert.equal(proof.type, "ask");
  assert.equal(proof.section, "proof");
  refuses(root, { by: "owner", stage: "section", choice: "proof", verdict: "reject" }, "CONTRACT_INVALID");

  decide(root, { by: "owner", stage: "section", choice: "proof", verdict: "reject", answer: "The quotes need names and photos" });
  const revise = nextAction(root);
  assert.equal(revise.type, "ask");
  assert.equal(revise.section, "proof");
  assert.ok(revise.first.includes("The quotes need names and photos"), revise.first);
  assert.deepEqual(ruleShapes(root), [{ text: "The quotes need names and photos", from: "section proof 1", scope: "object", object: { stage: "section", choice: "proof" } }]);
  buildPage(root, ["first-screen", "proof"], "<!-- quotes with names and photos -->\n");
  const revised = nextAction(root);
  assert.equal(revised.section, "proof");
  assert.equal(revised.first, undefined);

  decide(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "reject", answer: "The headline wraps on phones" });
  assert.equal(nextAction(root).section, "first-screen", "a later rejection reopens an accepted section");
  assert.deepEqual(rulesFrom(root), ["section proof 1", "section first-screen 1"]);
  assert.equal(acceptSections(root).stage, "probe");
  assert.deepEqual(readState(root).decisions.sections.map(item => `${item.section} ${item.verdict}`), ["first-screen accept", "proof reject", "first-screen reject", "first-screen accept", "proof accept"]);
});

// A rule recorded mid-build needs no edit to brief.md, so the approved description stays current.
test("a section rejection after an accepted section asks that section again and leaves the description current", t => {
  const root = approved(t, ["hero", "proof"], { keep: ["section"] });
  buildPage(root, ["hero"]);
  decide(root, { by: "owner", stage: "section", choice: "hero", verdict: "accept" });
  buildPage(root, ["hero", "proof"]);
  decide(root, { by: "owner", stage: "section", choice: "proof", verdict: "reject", answer: "No stock photos anywhere on the page" });
  const again = nextAction(root);
  assert.equal(again.stage, "build");
  assert.equal(again.type, "ask");
  assert.equal(again.section, "proof");
  assert.ok(again.completed.includes("description"), "the new rule does not ask for the description again");
  assert.deepEqual(again.rules, ["section proof: No stock photos anywhere on the page"], "a section rule is labelled with its section");
  buildPage(root, ["hero", "proof"], "<!-- proof without stock photos -->\n");
  assert.equal(acceptSections(root).stage, "probe");
  assert.deepEqual(readState(root).decisions.sections.map(item => `${item.section} ${item.verdict}`), ["hero accept", "proof reject", "proof accept"], "hero is not asked again");
});

// Mechanism check (spec: section comments name elements in text).
test("the section review asks the owner to name elements in text and never offers to click or pick them", t => {
  const root = approved(t, ["first-screen"], { keep: ["section"] });
  buildPage(root, ["first-screen"]);
  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.equal(ask.section, "first-screen");
  for (const [term, what] of [[/\btext\b/i, "text"], [/\blabel\b/i, "label"], [/\bplace\b/i, "place"]]) assert.match(ask.instruction, term, `elements are named by their ${what}`);
  const mentions = [ask.question, ask.instruction, ask.recommended, ask.why].join(" ").split(/(?<=[.?!])\s+/).filter(sentence => /\b(?:click|pick)/i.test(sentence));
  for (const sentence of mentions) assert.match(sentence, /\b(?:do not|don't|never)\b/i, `only a prohibition mentions clicking or picking: ${sentence}`);
});

test("a data-section marker inside an HTML comment is not a built section", t => {
  const root = approved(t, ["first-screen", "proof"]);
  const verdicts = (choice, answer) => ["accept", "reject"].map(verdict => ({ stage: "section", choice, verdict, ...(verdict === "reject" ? { answer } : {}) }));
  buildPage(root, [], '<!-- <section data-section="first-screen"></section> -->\n');
  const first = nextAction(root);
  assert.equal(first.stage, "build");
  assert.equal(first.type, "run", "the commented first screen is still to be built, not reviewed");
  assert.equal(first.section, "first-screen");
  for (const options of verdicts("first-screen", "The headline wraps on phones")) refuses(root, options, "WORKFLOW_NOT_READY");
  buildPage(root, ["first-screen"], '<!-- data-section="proof" goes here -->\n');
  decide(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "accept" });
  const proof = nextAction(root);
  assert.equal(proof.type, "run", "the commented proof section is still to be built");
  assert.equal(proof.section, "proof");
  for (const options of verdicts("proof", "The quotes need names and photos")) refuses(root, options, "WORKFLOW_NOT_READY");
});

test("a section rejection can cite recorded runtime-review Feedback through the CLI, and nothing else", t => {
  // tests/fixtures/runtime-review-record.json is real `runtime-review build` + `runtime-review record` CLI output on the tests/runtime-review.test.cjs fixture.
  const bytes = fs.readFileSync(path.join(__dirname, "fixtures/runtime-review-record.json"));
  const record = JSON.parse(bytes.toString("utf8"));
  const { $defs } = require("../skill/references/runtime-review.schema.json");
  validateShape(record, $defs.Record, "Record", $defs);
  const root = approved(t, ["first-screen"], { keep: ["section"] });
  buildPage(root, ["first-screen"]);
  // runtime-review record names each file by the digest of its Feedback.
  const recordedPath = value => `runtime-review/feedback/${sha256(canonicalJson(value.feedback))}.json`;
  const cited = recordedPath(record);
  touch(root, cited, bytes);
  const pickup = { ...record, feedback: { ...record.feedback, objectId: "pickup-steps", category: "component-conformance", actual: "The pickup steps are a plain list.", expected: "The project's Steps component." } };
  validateShape(pickup, $defs.Record, "Record", $defs);
  const second = recordedPath(pickup);
  touch(root, second, `${JSON.stringify(pickup, null, 2)}\n`);
  const reject = (...evidence) => ["--stage", "section", "--choice", "first-screen", "--verdict", "reject", ...evidence.flatMap(file => ["--evidence", file])];

  // The hand-written partial record an earlier check accepted, other JSON, and files missing or outside the project.
  const handWritten = { schema: "design-pipeline.runtime-review-record.v1", lifecycle: "recorded", feedback: { schema: "design-pipeline.runtime-review-feedback.v1", objectId: "hero-reserve-button", category: "visual-acceptance", actual: "The reserve button is grey on grey and easy to miss.", expected: "A warm, high-contrast reserve button above the fold.", acceptance: ["The button reads at arm's length on a phone"] }, contextAtRecord: {}, recordedAt: "2026-10-13T08:00:00.000Z" };
  touch(root, "runtime-review/feedback/hand-written.json", JSON.stringify(handWritten));
  touch(root, "runtime-review/feedback/not-a-record.json", JSON.stringify({ objectId: "hero", actual: "grey", expected: "warm" }));
  for (const file of ["runtime-review/feedback/hand-written.json", "runtime-review/feedback/not-a-record.json"]) {
    const error = refusesCli(root, reject(file), "CONTRACT_INVALID");
    assert.ok(error.message.includes(file) && /Record[.:]/.test(error.message), `${file} is refused by the Record schema: ${error.message}`);
  }
  const outside = tmp();
  t.after(() => fs.rmSync(outside, { recursive: true, force: true, maxRetries: 3 }));
  touch(outside, "x.json", bytes);
  for (const file of ["runtime-review/feedback/missing.json", path.join(outside, "x.json"), `../${path.basename(outside)}/x.json`]) {
    const error = refusesCli(root, reject(file), "CONTRACT_INVALID");
    assert.ok(error.message.includes(file), `${file}: ${error.message}`);
  }
  // Copies of the real record with one field broken are refused for that field.
  for (const [field, broken] of [
    ["Record.lifecycle", { ...record, lifecycle: "exported" }],
    ["Record.schema", { ...record, schema: record.feedback.schema }],
    ["Record.feedback.category", { ...record, feedback: { ...record.feedback, category: "taste" } }],
    ["Record.feedback.expected", { ...record, feedback: { ...record.feedback, expected: " " } }],
  ]) {
    touch(root, "runtime-review/feedback/broken.json", JSON.stringify(broken));
    const error = refuses(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "reject", evidence: ["runtime-review/feedback/broken.json"] }, "CONTRACT_INVALID");
    assert.ok(error.message.includes(field), `${field}: ${error.message}`);
  }

  const next = decideCli(root, ...reject(cited));
  assert.equal(next.stage, "build");
  assert.equal(next.type, "ask");
  assert.equal(next.section, "first-screen");
  assert.equal(typeof next.first, "string", "the section is asked again with a revise step");
  const verdict = readState(root).decisions.sections.at(-1);
  assert.equal(verdict.verdict, "reject");
  assert.equal(verdict.reason, null);
  assert.deepEqual(verdict.evidence, [{ path: cited, sha256: `sha256:${sha256(bytes)}`, objectId: "cta", category: "visual-acceptance" }]);
  const ctaRule = `cta: ${record.feedback.actual} Expected: ${record.feedback.expected}`;
  assert.deepEqual(ruleShapes(root), [{ text: ctaRule, from: "section first-screen 1", scope: "object", object: { stage: "section", choice: "first-screen" } }]);
  assert.deepEqual(next.rules, [`section first-screen: ${ctaRule}`]);

  decideCli(root, ...reject(cited, second), "--answer", "And the photo is too dark");
  const section = { stage: "section", choice: "first-screen" };
  assert.deepEqual(ruleShapes(root).slice(1), [
    { text: "And the photo is too dark", from: "section first-screen 2", scope: "object", object: section },
    { text: ctaRule, from: "section first-screen 2", scope: "object", object: section },
    { text: `pickup-steps: ${pickup.feedback.actual} Expected: ${pickup.feedback.expected}`, from: "section first-screen 2", scope: "object", object: section },
  ]);
  assert.deepEqual(readState(root).decisions.sections.at(-1).evidence.map(item => item.path), [cited, second]);
});

// Runs a command next returned, as an agent would, and returns its parsed JSON result.
function runReturned(command) {
  const child = spawnSync(`${command} --json`, { shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  return JSON.parse(child.stdout);
}

test("a reworded description goes back for approval, and a bytes re-approval keeps every section", t => {
  const root = atProbe(t, ["first-screen", "proof"]);
  const verdicts = readState(root).decisions.sections;
  fs.appendFileSync(path.join(root, "brief.md"), "\nPickup is on weekends only.\n");
  const stale = nextAction(root);
  assert.equal(stale.stage, "description");
  assert.equal(stale.type, "run", "a delegated description is the agent's self-check");
  assert.match(stale.instruction, /only the wording of the brief/);
  assert.match(stale.command, /--by agent .*--choice first-screen,proof --revision bytes$/, "the returned command carries the tier");
  refuses(root, { by: "agent", stage: "section", choice: "first-screen", verdict: "accept" }, "WORKFLOW_NOT_READY");
  refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen,proof" }, "CONTRACT_INVALID");
  runReturned(stale.command);
  assert.equal(nextAction(root).stage, "probe", "a wording change reopens no section");
  assert.deepEqual(readState(root).decisions.sections, verdicts, "earlier verdicts are kept, not rewritten");
});

test("a byte-only change to a kept description comes back as the agent's carry-forward, not an owner ask", t => {
  const root = atProbe(t, ["first-screen", "proof"], { keep: ["description", "section"] });
  fs.appendFileSync(path.join(root, "brief.md"), "\nPickup is on weekends only.\n");
  const carry = nextAction(root);
  assert.equal(carry.stage, "description");
  assert.equal(carry.type, "run");
  assert.equal(carry.carryForward, true);
  assert.match(carry.command, /--by agent .*--choice first-screen,proof --revision bytes$/);
  runReturned(carry.command);
  assert.equal(nextAction(root).stage, "probe", "the carried-forward approval reopens no section");
  assert.equal(readState(root).decisions.descriptions.at(-1).revision, "bytes");
  // A commitment on the kept description stays the owner's ask, and its commands carry the tier.
  fs.writeFileSync(path.join(root, "brief.md"), fs.readFileSync(path.join(root, "brief.md"), "utf8").replace(/^- proof\b.*$/m, "- proof: three customer quotes"));
  const ask = nextAction(root);
  assert.equal(ask.type, "ask", "a changed section line goes back to the owner");
  assert.match(ask.record, /--by owner .*--choice first-screen,proof --revision commitment --affects <[^>]*at least proof/);
});

// A different component decision does the same (tests/workflow-components.test.cjs).
test("a re-picked variant or a new playback makes the description approval stale", t => {
  const root = atProbe(t);
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  pickVariant(root, "C");
  assert.equal(nextAction(root).stage, "description", "a re-picked variant");
  refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen", revision: "bytes" }, "CONTRACT_INVALID");
  decide(root, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen", revision: "commitment", affects: "none" });
  assert.equal(nextAction(root).section, "first-screen", "a new direction reopens the section by its key");
  assert.equal(acceptSections(root).stage, "review", "the checked page is unchanged, so its probe pass still counts");
  confirmPlayback(root, `${PLAYBACK}\nStill open: pickup on weekends only.`);
  assert.equal(nextAction(root).stage, "description", "a new playback");
  refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen", revision: "bytes" }, "CONTRACT_INVALID");
  decide(root, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen", revision: "commitment", affects: "none" });
  assert.equal(nextAction(root).stage, "review", "a playback change that touches no section reopens none");
});

test("the probe binds the checked page, and the final review still turns a rejection into a rule", t => {
  const root = atProbe(t);
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  fs.appendFileSync(path.join(root, "index.html"), "<!-- edited after the check -->\n");
  const stale = nextAction(root);
  assert.equal(stale.stage, "probe");
  assert.equal(stale.verification.status, "stale");
  assert.ok(stale.verification.findings.some(item => item.code === "workflow-input-changed" && item.path === "index.html"), JSON.stringify(stale.verification.findings));
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  for (const answer of ["no", "ok"]) assert.match(refusesCli(root, ["--stage", "review", "--verdict", "reject", "--answer", answer], "CONTRACT_INVALID").message, /at least 2 words/, answer);
  assert.deepEqual(readState(root).rules, [], "a bare no at the final review records no rule");
  assert.equal(nextAction(root).stage, "review", "and leaves the checked page under review");
  decide(root, { by: "owner", stage: "review", verdict: "reject", answer: "The reserve button gets lost below the fold" });
  assert.deepEqual(ruleShapes(root), [{ text: "The reserve button gets lost below the fold", from: "draft 1", scope: "object", object: { stage: "review" } }]);
  assert.equal(readState(root).gates.interaction, undefined);
  assert.equal(nextAction(root).stage, "build", "the rejected page is repaired first");
  fs.appendFileSync(path.join(root, "index.html"), "<!-- reserve button moved up -->\n");
  assert.equal(nextAction(root).stage, "probe");
});

test("every no along the way is a rule, and next returns those still open", t => {
  const root = webProject(t);
  decide(root, { by: "owner", stage: "intake", verdict: "reject", answer: "It is for florists" });
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: PLAYBACK, antiGoals: ["Never look like a delivery app"] });
  decide(root, { by: "owner", stage: "reference", answer: "none" });
  writeVariants(root);
  decide(root, { by: "owner", stage: "concept", verdict: "reject", answer: "No stock photography" });
  pickVariant(root, "B");
  decide(root, { by: "owner", stage: "components", verdict: "reject", answer: "Keep the old carousel out" });
  prepareWebComponents(root);
  writeDescription(root, ["first-screen"]);
  decide(root, { by: "owner", stage: "description", verdict: "reject", answer: "Name the opening hours" });
  approveDescription(root, ["first-screen"]);
  buildPage(root, ["first-screen"]);
  decide(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "reject", answer: "The reserve button is too small" });
  buildPage(root, ["first-screen"], "<!-- a larger reserve button -->\n");
  assert.equal(acceptSections(root).stage, "probe");
  passProbe(root);
  decide(root, { by: "owner", stage: "review", verdict: "reject", answer: "The reserve button gets lost below the fold" });
  const next = nextAction(root);
  assert.deepEqual(rulesFrom(root), ["playback 1", "anti-goal 1", "variants 1", "decisions 1", "description 1", "section first-screen 1", "draft 1"]);
  assert.deepEqual(readState(root).rules.map(rule => rule.scope), ["object", "project", "object", "object", "object", "object", "object"], "anti-goals are project rules; every other no binds to what it was about");
  // The section rule retired when the revised section was accepted; the rest hold until the owner accepts the page.
  assert.deepEqual(next.rules, ["It is for florists", "Never look like a delivery app", "No stock photography", "Keep the old carousel out", "Name the opening hours", "The reserve button gets lost below the fold"]);
});

test("components, description and section records are refused on film, edit and ui projects", t => {
  for (const deliverable of ["film", "edit", "ui"]) {
    const root = webProject(t, { deliverable });
    for (const options of [
      { stage: "components", choice: "scratch", answer: "Write from scratch" },
      { stage: "components", verdict: "reject", answer: "Keep the old carousel out" },
      { stage: "description", verdict: "accept", choice: "first-screen" },
      { stage: "description", verdict: "reject", answer: "The intro is too long" },
      { stage: "section", choice: "first-screen", verdict: "accept" },
      { stage: "section", choice: "first-screen", verdict: "reject", answer: "The hero is too dark" },
    ]) assert.match(refuses(root, options, "CONTRACT_INVALID").message, /only to web/, `${deliverable} ${options.stage}`);
  }
});

test("delivery and review cannot bypass unfinished prerequisites or write state", () => {
  for (const deliverable of ["film", "edit", "web", "ui"]) {
    const dir = tmp();
    try {
      initState(dir, { deliverable, tier: "standard" });
      const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile, "utf8");
      assert.throws(() => decide(dir, { by: "owner", stage: "deliver", answer: "final.mp4" }), /intake/);
      assert.equal(fs.readFileSync(stateFile, "utf8"), before);
      if (deliverable !== "ui") {
        assert.throws(() => decide(dir, { by: "owner", stage: "review", verdict: "accept" }), /intake|review/);
        assert.equal(fs.readFileSync(stateFile, "utf8"), before);
      }
      if (deliverable === "web") confirmPlayback(dir);
      else decide(dir, { by: "owner", stage: "intake", answer: "default" });
      if (["film", "web"].includes(deliverable)) {
        const afterIntake = fs.readFileSync(stateFile, "utf8");
        assert.throws(() => decide(dir, { by: "owner", stage: "deliver", answer: "final.mp4" }), /reference/);
        assert.equal(fs.readFileSync(stateFile, "utf8"), afterIntake);
      }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const ui = tmp();
  try {
    initState(ui, { deliverable: "ui", tier: "quick", mode: "replicate" });
    const before = fs.readFileSync(path.join(ui, ".design-pipeline/state.json"), "utf8");
    assert.throws(() => decide(ui, { by: "owner", stage: "deliver", answer: "evidence.png" }), /reference/);
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
      assert.equal(afterCheck(dir), "checked");
      const state = readState(dir);
      state.gates[gate] = { status: "passed", at: Date.now() };
      touch(dir, ".design-pipeline/state.json", JSON.stringify(state));
      assert.equal(nextAction(dir).stage, gate === "storyboard" ? "plan" : deliverable === "web" ? "probe" : "check", "legacy state is readable but is not current evidence");
      recordGate(dir, gate, "passed");
      assert.equal(afterCheck(dir), "checked");
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
      assert.equal(afterCheck(dir), "checked");
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
    assert.equal(afterCheck(film), "checked", "an empty video is not a render candidate");
    touch(film, "renders/newer.mp4", "new render");
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(path.join(film, "renders/newer.mp4"), later, later);
    assert.equal(nextAction(film).stage, "check", "the old out.mp4 pass cannot prove the newly selected render");
    recordWorkflowGate(film, "film", "passed", ["storyboard.json", "renders/newer.mp4"]);
    assert.equal(afterCheck(film), "checked", "a pass of the actual selected render advances");
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
      decide(dir, { by: "owner", stage: "review", verdict: "accept" });
      assert.equal(nextAction(dir).stage, "deliver");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "deliver", "rechecking identical bytes preserves the accepted snapshot");
      decide(dir, { by: "owner", stage: "review", verdict: "reject", answer: "The final action reads too early." });
      if (deliverable === "web") {
        assert.equal(nextAction(dir).stage, "build", "a rejected page is repaired before it is checked again");
        rewriteSameTime(dir, file, redraft(deliverable, "repaired final action"));
      } else assert.equal(nextAction(dir).stage, "check");
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review", "a historical accept cannot override the latest rejection");
      decide(dir, { by: "owner", stage: "review", verdict: "accept" });
      rewriteSameTime(dir, file, redraft(deliverable, "new draft after acceptance"));
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
      decide(dir, { by: "owner", stage: "review", verdict: "accept" });
      touch(dir, "delivered/directory/file.txt");
      for (const answer of [undefined, "missing.mp4", "../outside.mp4", "delivered/directory"]) {
        const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile, "utf8");
        assert.throws(() => decide(dir, { by: "owner", stage: "deliver", answer }), /path|file|exist|inside|answer|directory/);
        assert.equal(fs.readFileSync(stateFile, "utf8"), before);
      }
      const output = deliverable === "film" ? "out.mp4" : "renders/edit.mp4";
      assert.equal(decide(dir, { by: "owner", stage: "deliver", answer: output }).next.type, "done");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const quick = checkedWorkflowFixture(deliverable, "quick");
    try {
      const output = deliverable === "film" ? "out.mp4" : "renders/edit.mp4";
      assert.throws(() => decide(quick, { by: "owner", stage: "deliver", answer: output }), /review/, "quick work records delivery only after the owner's verdict");
      decide(quick, { by: "owner", stage: "review", verdict: "accept" });
      assert.equal(decide(quick, { by: "owner", stage: "deliver", answer: output }).next.type, "done");
    } finally { fs.rmSync(quick, { recursive: true, force: true }); }
  }
  const web = checkedWorkflowFixture("web", "quick"), ui = tmp();
  try {
    decide(web, { by: "owner", stage: "review", verdict: "accept" });
    assert.equal(decide(web, { by: "owner", stage: "deliver", answer: "https://example.test/page" }).next.type, "done");
    initState(ui, { deliverable: "ui", tier: "quick" });
    const declared = decide(ui, { by: "agent", stage: "deliver", answer: "evidence.png" }).next;
    assert.equal(declared.stage, "review", "ui work ends with the owner's acceptance of the delivered result");
    assert.equal(declared.type, "ask");
    assert.equal(decide(ui, { by: "owner", stage: "review", verdict: "accept" }).next.type, "done");
  } finally {
    fs.rmSync(web, { recursive: true, force: true });
    fs.rmSync(ui, { recursive: true, force: true });
  }
});

test("standard delivery binds its checked snapshot and film/edit delivery file", () => {
  for (const [deliverable, file, gate] of [["film", "out.mp4", "film"], ["edit", "renders/edit.mp4", "edit"], ["web", "index.html", "interaction"]]) {
    const dir = checkedWorkflowFixture(deliverable);
    try {
      decide(dir, { by: "owner", stage: "review", verdict: "accept" });
      const delivery = deliverable === "web" ? "https://example.test/page" : "final.mp4";
      if (deliverable !== "web") touch(dir, delivery, "delivered version");
      decide(dir, { by: "owner", stage: "deliver", answer: delivery });
      assert.equal(nextAction(dir).type, "done");
      if (deliverable !== "web") {
        rewriteSameTime(dir, delivery, "changed delivery file");
        assert.equal(nextAction(dir).stage, "deliver", "a changed final file requires delivery recording again");
        decide(dir, { by: "owner", stage: "deliver", answer: delivery });
        assert.equal(nextAction(dir).type, "done");
      }
      rewriteSameTime(dir, file, redraft(deliverable, "changed after delivery"));
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review");
      decide(dir, { by: "owner", stage: "review", verdict: "accept" });
      assert.equal(nextAction(dir).stage, "deliver", "a new acceptance does not restore the old delivery snapshot");
      decide(dir, { by: "owner", stage: "deliver", answer: delivery });
      assert.equal(nextAction(dir).type, "done");
      decide(dir, { by: "owner", stage: "review", verdict: "reject", answer: "The accepted draft still needs a repair." });
      if (deliverable === "web") rewriteSameTime(dir, file, redraft(deliverable, "repaired after the rejection"));
      recordGate(dir, gate, "passed");
      assert.equal(nextAction(dir).stage, "review", "a rejection after done revokes dependent acceptance and delivery");
      decide(dir, { by: "owner", stage: "review", verdict: "accept" });
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
    decide(dir, { by: "owner", stage: "review", verdict: "accept" });
    assert.equal(nextAction(dir).stage, "deliver");
    assert.equal(readState(dir).decisions.drafts.length, 2, "legacy history is preserved");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// --- decision roles (adopt-ai-fluency-decision-roles, phase 1) -------------------------------------

test("a new project records its delegation map with locked owner checkpoints and director defaults", t => {
  const web = webProject(t);
  const map = readState(web).delegation;
  assert.deepEqual(Object.keys(map).sort(), ["components", "concept", "creative-intent", "deliver", "description", "intake", "reference", "review", "section"]);
  assert.equal(map.review.to, "owner");
  assert.equal(map.review.locked, true);
  assert.equal(map["creative-intent"].locked, true);
  assert.equal(map.reference.to, "agent");
  assert.equal(map.concept.to, "owner");
  const directed = tmp();
  t.after(() => fs.rmSync(directed, { recursive: true, force: true }));
  initState(directed, { deliverable: "web", tier: "standard", director: "art-model", assistedBy: "Claude Code (test)" });
  const state = readState(directed);
  assert.equal(state.delegation.concept.to, "agent", "--director delegates the concept pick");
  assert.equal(state.delegation.section.to, "agent", "--director delegates section reviews");
  assert.equal(state.delegation.review.to, "owner", "final acceptance never goes to the director");
  assert.equal(state.assistedBy, "Claude Code (test)");
  const quick = webProject(t, { tier: "quick" });
  assert.equal(readState(quick).delegation.intake.to, "agent", "a quick piece states its intake decision");
  assert.equal(readState(quick).delegation.section, undefined, "quick builds the page whole");
});

test("decide requires --by, refuses agent records the owner keeps, and never lets an agent accept", t => {
  const root = webProject(t);
  assert.match(refuses(root, { stage: "intake", verdict: "accept", answer: PLAYBACK, by: undefined }, "CONTRACT_INVALID").message, /--by is required/);
  assert.match(refuses(root, { stage: "intake", verdict: "accept", answer: PLAYBACK, by: "someone" }, "CONTRACT_INVALID").message, /--by is required/);
  assert.match(refuses(root, { stage: "intake", verdict: "accept", answer: PLAYBACK, by: "agent" }, "CONTRACT_INVALID").message, /owner's to decide.*--delegate intake/);
  assert.match(refuses(root, { stage: "intake", verdict: "accept", answer: PLAYBACK, delegate: ["review"] }, "CONTRACT_INVALID").message, /stays with the owner/);
  assert.match(refuses(root, { stage: "intake", verdict: "accept", answer: PLAYBACK, delegate: ["colours"] }, "CONTRACT_INVALID").message, /unknown checkpoint "colours".*components/);
  assert.match(refuses(root, { stage: "reference", answer: "none", delegate: ["components"] }, "CONTRACT_INVALID").message, /go on the intake record/);
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: PLAYBACK, delegate: ["components"], keep: ["reference"] });
  const map = readState(root).delegation;
  assert.deepEqual([map.components.to, map.components.set], ["agent", "owner"]);
  assert.deepEqual([map.reference.to, map.reference.set], ["owner", "owner"]);
  const film = checkedWorkflowFixture("film", "quick");
  t.after(() => fs.rmSync(film, { recursive: true, force: true }));
  assert.match(refuses(film, { stage: "review", verdict: "accept", by: "agent" }, "CONTRACT_INVALID").message, /stays with the owner; only --by owner/);
});

test("records carry who decided, agent records name the agent, and returned commands carry the role", t => {
  const root = tmp();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "web", tier: "standard", director: "art-model", assistedBy: "Claude Code (test)" });
  const intake = nextAction(root);
  assert.match(intake.record, / --by owner --stage intake /);
  assert.ok(intake.delegation.agent.includes("concept") && intake.delegation.locked.includes("review"), "the playback learns what the agent decides");
  confirmPlayback(root);
  decide(root, { by: "agent", stage: "reference", answer: "none" });
  writeVariants(root);
  decide(root, { by: "agent", stage: "concept", choice: "B" });
  const state = readState(root);
  assert.equal(state.decisions.variants.at(-1).by, "agent");
  assert.equal(state.decisions.variants.at(-1).agent, "art-model", "a directed pick names the art director");
  const roles = state.decisions.roles.map(entry => [entry.stage, entry.by, entry.agent ?? null]);
  assert.deepEqual(roles, [["intake", "owner", null], ["creative-intent", "owner", null], ["reference", "agent", "Claude Code (test)"], ["concept", "agent", "art-model"]]);
});

test("ui and quick work end with the owner's acceptance, and done renders the diligence statement", t => {
  const ui = tmp();
  t.after(() => fs.rmSync(ui, { recursive: true, force: true }));
  initState(ui, { deliverable: "ui", tier: "quick", assistedBy: "Claude Code (test)" });
  const work = nextAction(ui);
  assert.match(work.command, / --by agent --stage deliver /);
  refuses(ui, { stage: "deliver", by: "agent" }, "INPUT_MISSING");
  const review = decide(ui, { by: "agent", stage: "deliver", answer: "index.html checked in a browser" }).next;
  assert.equal(review.stage, "review");
  assert.match(review.why, /passing check/);
  assert.match(review.record, / --by owner --stage review /);
  assert.equal(nextAction(ui).diligence, undefined);
  decide(ui, { by: "owner", stage: "review", verdict: "reject", answer: "The header feels cramped on phones" });
  assert.equal(nextAction(ui).stage, "work", "a rejection sends the work back");
  decide(ui, { by: "agent", stage: "deliver", answer: "index.html with a roomier header" });
  const done = decide(ui, { by: "owner", stage: "review", verdict: "accept", answer: "That header looks right now" }).next;
  assert.equal(done.type, "done");
  assert.deepEqual(done.diligence, { path: ".design-pipeline/diligence.md", current: true });
  const statement = fs.readFileSync(path.join(ui, ".design-pipeline/diligence.md"), "utf8");
  assert.match(statement, /^# AI diligence statement/);
  assert.match(statement, /## Decided by the owner\n- Final acceptance: reject — "The header feels cramped on phones"\n- Final acceptance: accept — "That header looks right now"/);
  assert.match(statement, /## Decided by the agent under delegation\n- Delivery — "index\.html checked in a browser" \(agent: Claude Code \(test\); delegated by default\)/);
  assert.match(statement, /Final acceptance recorded by the owner at .*: "That header looks right now"/);
  assert.match(statement, /## The owner's "no", in their words\n- "The header feels cramped on phones" \(draft 1; for the result under review, since accepted\)/, "the owner's own words, not a count");
  assert.match(statement, /Suggested trailer: Assisted-by: Claude Code \(test\)/);
  assert.match(statement, /## Delegation\n- Delivery: agent\n- Final acceptance: owner \(locked\)/);
  // A later decision makes the statement stale until done renders it again.
  decide(ui, { by: "agent", stage: "deliver", answer: "index.html after a copy fix" });
  assert.equal(nextAction(ui).stage, "review");
  const rendered = diligence(ui);
  assert.equal(rendered.written, false);
  assert.match(rendered.text, /Delivery — "index\.html after a copy fix"/);
  assert.equal(fs.readFileSync(path.join(ui, ".design-pipeline/diligence.md"), "utf8"), statement, "diligence without write changes nothing");
});

test("the diligence statement separates technical checks from owner acceptance and counts unauthored records", t => {
  const film = checkedWorkflowFixture("film", "quick");
  t.after(() => fs.rmSync(film, { recursive: true, force: true }));
  const state = readState(film);
  state.decisions.drafts = [{ verdict: "reject", reason: "An old verdict without an author.", at: "2026-01-01T00:00:00.000Z", inputHashes: {} }];
  state.decisions.reference = "none"; // a single-value decision recorded before decision roles
  touch(film, ".design-pipeline/state.json", JSON.stringify(state));
  const { text } = diligence(film, { write: true });
  assert.match(text, /## Technical checks \(not creative acceptance\)\n- storyboard: passed\n- film: passed/);
  assert.match(text, /- 2 decision record\(s\) predate decision roles/, "history entries and single-value decisions without an author both count");
  assert.match(text, /No owner acceptance recorded yet/);
  assert.ok(fs.existsSync(path.join(film, ".design-pipeline/diligence.md")));
  const cli = runCli("diligence", "--root", film, "--project-root", film);
  assert.equal(cli.status, 0, cli.text);
  assert.match(cli.json.text, /^# AI diligence statement/);
});

test("returned commands take their role from the delegation map, and only the owner changes it", t => {
  const root = tmp();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "web", tier: "standard", director: "art-model" });
  confirmPlayback(root);
  decide(root, { by: "agent", stage: "reference", answer: "none" });
  writeVariants(root);
  const concepts = nextAction(root);
  assert.equal(concepts.stage, "concepts");
  assert.match(concepts.director, /art-model/);
  assert.match(concepts.record, / --by agent --stage concept /, "a pick delegated to the art director is recorded as the agent's");
  assert.match(concepts.correction, / --by agent --stage concept /);
  const quick = webProject(t, { tier: "quick" });
  assert.match(refuses(quick, { stage: "intake", choice: "skip", answer: STATED, by: "agent", delegate: ["components"] }, "CONTRACT_INVALID").message, /go only on an intake recorded with --by owner/);
  assert.equal(readState(quick).delegation.components.to, "agent", "the refused record leaves the default the agent's");
});

test("a quick page the owner rejects goes back to build until it is repaired", t => {
  const dir = checkedWorkflowFixture("web", "quick");
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(nextAction(dir).stage, "review");
  decide(dir, { by: "owner", stage: "review", verdict: "reject", answer: "The price is lost below the fold" });
  const repair = nextAction(dir);
  assert.equal(repair.stage, "build", "the unchanged page is repaired before it is probed again");
  assert.match(repair.instruction, /The price is lost below the fold/);
  rewriteSameTime(dir, "index.html", "<!doctype html><title>Repaired</title>");
  assert.equal(nextAction(dir).stage, "probe", "the repaired page is probed again");
});

test("a refused decide on a project without a delegation map leaves its state untouched", t => {
  const root = webProject(t);
  const state = readState(root);
  delete state.delegation;
  touch(root, ".design-pipeline/state.json", JSON.stringify(state, null, 2));
  refuses(root, { stage: "intake", verdict: "accept", answer: PLAYBACK, by: undefined }, "CONTRACT_INVALID");
  assert.equal(readState(root).delegation, undefined, "the map is filled only when a decision is recorded");
  confirmPlayback(root);
  assert.equal(readState(root).delegation.review.locked, true);
});

// --- owner attention, phase 1 (owner-attention-asks) -------------------------------------------------

// Drives a web project from intake to done the way an agent following next would, with the owner's
// replies where next asks and the agent's own records where it self-checks; returns the owner asks.
function walkToDone(root, sections = ["first-screen", "proof"]) {
  const asks = [];
  for (let step = 0; step < 60; step++) {
    const action = nextAction(root);
    if (action.type === "done") return asks;
    if (action.type === "ask") asks.push(action.stage);
    if (action.stage === "intake") {
      if (action.type === "ask") confirmPlayback(root);
      else statedSkip(root);
    } else if (action.stage === "reference") decide(root, { by: "agent", stage: "reference", answer: "none" });
    else if (action.stage === "concepts") {
      if (action.type === "ask") pickVariant(root);
      else writeVariants(root);
    } else if (action.stage === "components") {
      assert.equal(action.selfCheck, true, "component sources are the agent's self-check");
      decide(root, { by: "agent", stage: "components", choice: "scratch", answer: "Write from scratch: the project has no components yet" });
      touch(root, "component-manifest.json", JSON.stringify({ fromScratch: true, entries: [] }));
    } else if (action.stage === "description") {
      if (action.selfCheck) decide(root, { by: "agent", stage: "description", verdict: "accept", choice: sections.join(",") });
      else writeDescription(root, sections);
    } else if (action.stage === "build") {
      if (action.selfCheck) decide(root, { by: "agent", stage: "section", choice: action.section, verdict: "accept" });
      else if (readState(root).tier === "quick") buildPage(root, []);
      else buildPage(root, sections.slice(0, sections.indexOf(action.section) + 1));
    } else if (action.stage === "probe") passProbe(root);
    else if (action.stage === "review") decide(root, { by: "owner", stage: "review", verdict: "accept", answer: "That is the page I wanted" });
    else if (action.stage === "deliver") decide(root, { by: "agent", stage: "deliver", answer: "https://example.test/bakery" });
    else assert.fail(`unexpected step ${action.stage} ${action.type}`);
  }
  assert.fail("the walk did not reach done");
}

test("a new web map gives component sources, the description and section reviews to the agent, and stored entries stay", t => {
  const map = readState(webProject(t)).delegation;
  for (const checkpoint of ["components", "description", "section"]) assert.deepEqual([map[checkpoint].to, map[checkpoint].set], ["agent", "default"], checkpoint);
  for (const checkpoint of ["intake", "concept", "review"]) assert.equal(map[checkpoint].to, "owner", checkpoint);
  assert.equal(readState(webProject(t, { tier: "quick" })).delegation.components.to, "agent");
  const film = tmp();
  t.after(() => fs.rmSync(film, { recursive: true, force: true }));
  initState(film, { deliverable: "film", tier: "standard" });
  assert.equal(readState(film).delegation.components, undefined, "only web has these checkpoints");
  // A project recorded before the new defaults keeps the entries it stored.
  const root = webProject(t);
  const state = readState(root);
  state.delegation.section = { to: "owner", set: "default" };
  touch(root, ".design-pipeline/state.json", JSON.stringify(state, null, 2));
  confirmPlayback(root);
  assert.equal(readState(root).delegation.section.to, "owner");
});

test("a two-section standard page asks the owner three times, and quick work only for acceptance", t => {
  assert.deepEqual(walkToDone(webProject(t)), ["intake", "concepts", "review"]);
  assert.deepEqual(walkToDone(webProject(t, { tier: "quick" })), ["review"]);
});

test("a delegated section is a self-check with an agent accept and an owner correction", t => {
  const root = approved(t, ["first-screen"]);
  buildPage(root, ["first-screen"]);
  const check = nextAction(root);
  assert.equal(check.type, "run");
  assert.equal(check.selfCheck, true);
  assert.equal(check.checkpoint, "section");
  assert.equal(check.section, "first-screen");
  assert.match(check.command, / --by agent --stage section --choice first-screen --verdict accept$/);
  assert.doesNotMatch(check.command, /accept\|reject|\[/, "the command records the acceptance as it is");
  assert.match(check.correction, / --by owner --stage section --choice first-screen --verdict reject --answer /);
  assert.equal(check.question, undefined, "nothing is addressed to the owner");
  assert.match(check.check, /yourself/);
  assert.match(check.instruction, /trade-off/);
  assert.match(check.instruction, /--tradeoff/);
  assert.equal(typeof check.language, "string");
  assert.match(check.line, /build \(\d+\/\d+\) - Open index\.html/);
  decide(root, { by: "agent", stage: "section", choice: "first-screen", verdict: "accept" });
  assert.equal(nextAction(root).stage, "probe");
  assert.deepEqual(readState(root).decisions.sections.map(item => [item.section, item.verdict, item.by]), [["first-screen", "accept", "agent"]]);
});

test("a kept section is asked, an art director keeps the routed ask, and a delegated pick keeps its ask", t => {
  const kept = approved(t, ["first-screen"], { keep: ["section"] });
  buildPage(kept, ["first-screen"]);
  const ask = nextAction(kept);
  assert.equal(ask.type, "ask");
  assert.equal(ask.section, "first-screen");
  assert.equal(typeof ask.language, "string");
  assert.equal(ask.selfCheck, undefined, "the self-check text never reaches an owner ask");
  const directed = tmp();
  t.after(() => fs.rmSync(directed, { recursive: true, force: true }));
  initState(directed, { deliverable: "web", tier: "standard", director: "art-model" });
  toComponents(directed);
  prepareWebComponents(directed);
  toBuild(directed, ["first-screen"]);
  buildPage(directed, ["first-screen"]);
  const routed = nextAction(directed);
  assert.equal(routed.type, "ask");
  assert.match(routed.director, /art-model/);
  const picked = webProject(t);
  decide(picked, { by: "owner", stage: "intake", verdict: "accept", answer: PLAYBACK, delegate: ["concept"] });
  decide(picked, { by: "agent", stage: "reference", answer: "none" });
  writeVariants(picked);
  const concepts = nextAction(picked);
  assert.equal(concepts.type, "ask", "a delegated concept pick keeps its ask");
  assert.match(concepts.record, / --by agent --stage concept /);
  decide(picked, { by: "agent", stage: "concept", choice: "B" });
  assert.equal(nextAction(picked).stage, "components");
});

test("a section with build findings is not a self-check and cannot be accepted", t => {
  const root = approved(t, ["first-screen"]);
  buildPage(root, ["first-screen"], '<div data-variant="A"></div>\n');
  const run = nextAction(root);
  assert.equal(run.type, "run");
  assert.equal(run.section, "first-screen");
  assert.equal(run.selfCheck, undefined);
  refuses(root, { by: "agent", stage: "section", choice: "first-screen", verdict: "accept" }, "WORKFLOW_NOT_READY");
});

test("an agent never records a no, and cannot accept what the owner rejected until it changes", t => {
  const root = approved(t, ["first-screen"]);
  buildPage(root, ["first-screen"]);
  assert.match(refuses(root, { by: "agent", stage: "section", choice: "first-screen", verdict: "reject", answer: "The headline wraps on phones" }, "CONTRACT_INVALID").message, /cannot record a "no"/);
  decide(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "reject", answer: "The headline wraps on phones" });
  const again = nextAction(root);
  assert.equal(again.selfCheck, true);
  assert.match(again.instruction, /The headline wraps on phones/);
  assert.match(refuses(root, { by: "agent", stage: "section", choice: "first-screen", verdict: "accept" }, "WORKFLOW_NOT_READY").message, /unchanged/);
  buildPage(root, ["first-screen"], "<!-- headline fits on phones -->\n");
  decide(root, { by: "agent", stage: "section", choice: "first-screen", verdict: "accept" });
  assert.equal(nextAction(root).stage, "probe");

  const described = webProject(t);
  toComponents(described);
  prepareWebComponents(described);
  writeDescription(described, ["first-screen"]);
  assert.equal(nextAction(described).selfCheck, true);
  refuses(described, { by: "agent", stage: "description", verdict: "reject", answer: "Too long for one page" }, "CONTRACT_INVALID");
  decide(described, { by: "owner", stage: "description", verdict: "reject", answer: "Say who the regulars are" });
  refuses(described, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen" }, "WORKFLOW_NOT_READY");
  fs.appendFileSync(path.join(described, "brief.md"), "\nFor regulars who reserve on their phones.\n");
  decide(described, { by: "agent", stage: "description", verdict: "accept", choice: "first-screen" });
  assert.equal(nextAction(described).stage, "build");
});

test("the intake offers section reviews only where there are sections", t => {
  assert.match(nextAction(webProject(t)).delegation.instruction, /--keep section/);
  assert.doesNotMatch(nextAction(webProject(t, { deliverable: "film" })).delegation?.instruction ?? "", /--keep section/);
});

test("an owner's answer to a trade-off ask keeps what was asked, and only the owner's record can", t => {
  const root = webProject(t);
  toComponents(root);
  const check = nextAction(root);
  assert.equal(check.selfCheck, true);
  assert.match(check.instruction, /a new dependency, a license obligation or a notable cost/);
  assert.match(check.instruction, /what is new, your recommendation and its cost, and how they can see the difference/);
  const asked = "Adds a GPL chart library; I recommend the MIT one at 12 KB more";
  refuses(root, { by: "agent", stage: "components", choice: "scratch", answer: "Write from scratch", tradeoff: asked }, "CONTRACT_INVALID");
  refuses(root, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch", tradeoff: "ok" }, "CONTRACT_INVALID");
  // The owner says no to the recommendation: the correction, by the owner, with what was asked.
  assert.match(check.correction, / --by owner --stage components --verdict reject --answer /);
  const declined = decideCli(root, "--by", "owner", "--stage", "components", "--verdict", "reject", "--answer", "No GPL libraries in this site", "--tradeoff", asked);
  assert.equal(declined.stage, "components");
  const entry = readState(root).decisions.roles.at(-1);
  assert.deepEqual([entry.stage, entry.by, entry.verdict, entry.tradeoff], ["components", "owner", "reject", asked]);
  assert.ok(readState(root).rules.some(rule => rule.text === "No GPL libraries in this site"));
  // The owner takes the recommendation: the command with --by owner, and what was asked.
  decideCli(root, "--by", "owner", "--stage", "components", "--choice", "discover", "--answer", "Use the MIT chart library you found", "--tradeoff", asked);
  assert.equal(readState(root).decisions.roles.at(-1).tradeoff, asked);
  const { text } = diligence(root);
  assert.match(text, /Component sources: discover — "Use the MIT chart library you found" \(asked about: "Adds a GPL chart library; I recommend the MIT one at 12 KB more"\)/);
});

test("every ask and self-check carries the language line, the first ask before any state included", t => {
  const empty = tmp();
  t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
  for (const action of [nextAction(empty), nextAction(webProject(t))]) {
    assert.equal(action.type, "ask");
    assert.match(action.language, /project's language: the brief's, else the one the owner writes in/);
  }
  const root = webProject(t);
  toComponents(root);
  assert.match(nextAction(root).language, /keep commands, ids and file names unchanged/);
  const film = checkedWorkflowFixture("film", "quick");
  t.after(() => fs.rmSync(film, { recursive: true, force: true }));
  const review = nextAction(film);
  assert.equal(review.type, "ask");
  assert.equal(typeof review.language, "string");
});

test("confirming the playback card records creative intent as the owner's, and a skip leaves it unstated", t => {
  const root = webProject(t);
  confirmPlayback(root);
  const intent = readState(root).decisions.roles.find(entry => entry.stage === "creative-intent");
  assert.deepEqual([intent.by, intent.verdict, intent.answer], ["owner", "accept", PLAYBACK], "the whole card is kept");
  const confirmed = diligence(root).text;
  assert.match(confirmed, /## Decided by the owner\n- Intake: accept — "[^"\n]+"\n- Creative intent: accept — "Expresses: a landing page for small bakeries[^"\n]+ \/ Connects with: /);
  assert.doesNotMatch(confirmed, /planned in phase 2|Creative intent: not stated/);
  const skipped = webProject(t);
  statedSkip(skipped);
  assert.equal(readState(skipped).decisions.roles.some(entry => entry.stage === "creative-intent"), false);
  assert.match(diligence(skipped).text, /## Not stated by the owner\n- Intake: the owner skipped the questions; the agent stated its decisions instead\n- Creative intent: not stated by the owner/);
  const quick = webProject(t, { tier: "quick" });
  statedSkip(quick);
  assert.doesNotMatch(diligence(quick).text, /Creative intent/, "quick work has no creative-intent checkpoint");
  // A one-paragraph playback is not a card, so it records no creative intent.
  const paragraph = webProject(t);
  confirmPlayback(paragraph, PLAYBACK.split("\n").join(" "));
  assert.equal(readState(paragraph).decisions.roles.some(entry => entry.stage === "creative-intent"), false);
  assert.match(diligence(paragraph).text, /Creative intent: not stated by the owner/);
});

test("--scope is refused on records that cannot hold a no, before any file is written", t => {
  const root = webProject(t);
  confirmPlayback(root);
  refuses(root, { by: "agent", stage: "reference", answer: "none", verdict: "reject", scope: "object" }, "CONTRACT_INVALID");
  const film = webProject(t, { deliverable: "film" });
  refuses(film, { stage: "intake", answer: "default", verdict: "reject", scope: "project" }, "CONTRACT_INVALID");
  assert.equal(fs.existsSync(path.join(film, "brief.md")), false);
});

test("a no binds to what it was about: a section rule retires with the section, an earlier no holds until the result is accepted", t => {
  const root = webProject(t);
  confirmPlayback(root);
  decide(root, { by: "agent", stage: "reference", answer: "none" });
  writeVariants(root);
  pickVariant(root);
  decide(root, { by: "owner", stage: "components", verdict: "reject", answer: "No GPL libraries in this site" });
  prepareWebComponents(root);
  approveDescription(root, ["hero"]);
  buildPage(root, ["hero"]);
  decide(root, { by: "owner", stage: "section", choice: "hero", verdict: "reject", answer: "Drop the gradient" });
  assert.deepEqual(nextAction(root).rules, ["No GPL libraries in this site", "section hero: Drop the gradient"]);
  buildPage(root, ["hero"], "<!-- flat background -->\n");
  assert.equal(acceptSections(root).stage, "probe");
  assert.deepEqual(nextAction(root).rules, ["No GPL libraries in this site"], "the accepted section's rule retires; the round's no holds through the build");
  assert.equal(readState(root).rules.length, 2, "a retired rule stays recorded");
  passProbe(root);
  const review = nextAction(root);
  assert.equal(review.stage, "review");
  assert.deepEqual(review.ruleCandidates.map(({ from, object, active }) => [from, object, active]), [["decisions 1", "the result", true], ["section hero 1", "section hero", false]]);
  assert.match(review.instruction, /ask the owner once whether to keep.*--promote "<from>"/);
  decide(root, { by: "owner", stage: "review", verdict: "accept", answer: "That is the page I wanted" });
  assert.equal(nextAction(root).rules, undefined, "after the owner accepts the page, its rules retire");
});

test("--scope project keeps a no for the rest of the project, and --scope is refused where it means nothing", t => {
  const root = approved(t, ["hero"]);
  buildPage(root, ["hero"]);
  refuses(root, { stage: "section", choice: "hero", verdict: "reject", answer: "Drop the gradient", scope: "everywhere" }, "CONTRACT_INVALID");
  refuses(root, { by: "agent", stage: "section", choice: "hero", verdict: "accept", scope: "project" }, "CONTRACT_INVALID");
  decideCli(root, "--stage", "section", "--choice", "hero", "--verdict", "reject", "--answer", "No gradients anywhere, from now on", "--scope", "project");
  assert.deepEqual(readState(root).rules.map(rule => rule.scope), ["project"]);
  buildPage(root, ["hero"], "<!-- flat -->\n");
  assert.equal(acceptSections(root).stage, "probe");
  assert.deepEqual(nextAction(root).rules, ["No gradients anywhere, from now on"], "a project rule outlives the section");
  const intake = webProject(t);
  refuses(intake, { stage: "intake", verdict: "accept", answer: PLAYBACK, antiGoals: ["Never look like a delivery app"], scope: "project" }, "CONTRACT_INVALID");
});

test("an anti-goal matching an earlier correction still becomes a project rule", t => {
  const root = webProject(t);
  decide(root, { by: "owner", stage: "intake", verdict: "reject", answer: "No stock photos" });
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: PLAYBACK, antiGoals: ["No stock photos"] });
  assert.deepEqual(ruleShapes(root).map(({ from, scope }) => [from, scope]), [["playback 1", "object"], ["anti-goal 1", "project"]]);
  decide(root, { by: "owner", stage: "intake", verdict: "accept", answer: PLAYBACK, antiGoals: ["No stock photos"] });
  assert.equal(readState(root).rules.length, 2, "an anti-goal already a project rule is not repeated");
});

test("the owner promotes rules at the final review: a retired rule returns, every rule of that origin goes, and only there", t => {
  const root = atProbe(t, ["first-screen"], { keep: ["section"] });
  // Reopen the accepted section with a no carrying text and cited Feedback, so two rules share one origin.
  const bytes = fs.readFileSync(path.join(__dirname, "fixtures/runtime-review-record.json"));
  const cited = `runtime-review/feedback/${sha256(canonicalJson(JSON.parse(bytes.toString("utf8")).feedback))}.json`;
  touch(root, cited, bytes);
  decide(root, { by: "owner", stage: "section", choice: "first-screen", verdict: "reject", answer: "The photo is too dark", evidence: [cited] });
  buildPage(root, ["first-screen"], "<!-- brighter -->\n");
  assert.equal(acceptSections(root).stage, "probe");
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  refuses(root, { stage: "review", verdict: "accept", answer: "That is the page I wanted", promote: ["section footer 9"] }, "CONTRACT_INVALID");
  refuses(root, { stage: "section", choice: "first-screen", verdict: "reject", answer: "Still too dark", promote: ["section first-screen 1"] }, "CONTRACT_INVALID");
  refuses(root, { by: "agent", stage: "review", verdict: "accept", answer: "That is the page I wanted", promote: ["section first-screen 1"] }, "CONTRACT_INVALID");
  decideCli(root, "--stage", "review", "--verdict", "accept", "--answer", "That is the page I wanted", "--promote", "section first-screen 1");
  const promoted = readState(root).rules;
  assert.equal(promoted.length, 2);
  for (const rule of promoted) assert.deepEqual([rule.scope, rule.givenScope, typeof rule.promotedAt], ["project", "object", "string"]);
  const after = nextAction(root);
  assert.equal(after.stage, "deliver");
  assert.ok(after.rules.includes("The photo is too dark"), "a promoted rule is returned again");
  const statement = diligence(root).text;
  assert.match(statement, /"The photo is too dark" \(section first-screen 1; promoted to a project rule\)/);
});

test("the diligence statement names each rule's scope", t => {
  const root = approved(t, ["hero"], { keep: ["section"] });
  buildPage(root, ["hero"]);
  decide(root, { by: "owner", stage: "section", choice: "hero", verdict: "reject", answer: "Drop the gradient" });
  decide(root, { by: "owner", stage: "description", verdict: "reject", answer: "Name the opening hours" });
  const text = diligence(root).text;
  assert.match(text, /"Drop the gradient" \(section hero 1; for section hero\)/);
  assert.match(text, /"Name the opening hours" \(description 1; for the result under review\)/);
});

// --- change tiers (owner-attention-change-tiers) ----------------------------------------------------

const briefWith = (root, lines, prose = "A one-page description of the page.") => touch(root, "brief.md", `# Brief\n\n${prose}\n\n## Sections\n\n${lines.map(([id, job]) => `- ${id}: ${job}`).join("\n")}\n`);
const LINES = [["hero", "today's bakes and the reserve button"], ["proof", "what regulars say"]];
// A standard project at probe whose two sections were accepted under a description with LINES.
function tiered(t, keep = ["description", "section"]) {
  const root = webProject(t);
  toComponents(root, { keep });
  prepareWebComponents(root);
  briefWith(root, LINES);
  decide(root, { by: keep.includes("description") ? "owner" : "agent", stage: "description", verdict: "accept", choice: "hero,proof" });
  buildPage(root, ["hero", "proof"]);
  assert.equal(acceptSections(root).stage, "probe");
  return root;
}
const reapprove = (root, extra = {}, by = "owner") => decide(root, { by, stage: "description", verdict: "accept", choice: "hero,proof", ...extra });

test("an approval stores its inputs, and each section line keeps its job whatever the separator", t => {
  const root = tiered(t);
  const record = readState(root).decisions.descriptions.at(-1);
  assert.equal(record.upstream, undefined);
  assert.deepEqual(Object.keys(record.inputs).sort(), ["brief", "components", "direction", "playback", "sections"]);
  assert.deepEqual(record.inputs.sections, [{ id: "hero", job: "today's bakes and the reserve button" }, { id: "proof", job: "what regulars say" }]);
  const { briefSections } = require("../skill/scripts/workflows/web.cjs");
  for (const line of ["- hero: today's  bakes and the reserve button", "- hero - today's bakes and the reserve button", "- `hero` — today's bakes and the reserve button", "1. hero today's bakes and the reserve button"]) {
    assert.deepEqual(briefSections(`## Sections\n\n${line}\n  continuation is not part of it\n`), [{ id: "hero", job: "today's bakes and the reserve button" }], line);
  }
  assert.deepEqual(briefSections("## Sections\n\n- hero\n"), [{ id: "hero", job: "" }], "an id-only line has an empty job");
});

test("a changed section line reopens only that section, and a commitment reopens only what it names", t => {
  const root = tiered(t);
  briefWith(root, [LINES[0], ["proof", "what regulars say, with their photos"]]);
  const stale = nextAction(root);
  assert.match(stale.first, /the line of section proof/);
  assert.match(stale.first, /--revision commitment --affects .*at least proof/);
  reapprove(root, { revision: "commitment", affects: "proof" });
  assert.equal(nextAction(root).section, "proof", "hero keeps its verdict; proof is reviewed again");
  decide(root, { by: "owner", stage: "section", choice: "proof", verdict: "accept" });
  assert.equal(nextAction(root).stage, "probe");
  briefWith(root, [LINES[0], ["proof", "what regulars say, with their photos"]], "A one-page site for regulars who reserve on their phones.");
  reapprove(root, { revision: "commitment", affects: "hero" });
  assert.equal(nextAction(root).section, "hero", "the named section is reopened");
  decide(root, { by: "owner", stage: "section", choice: "hero", verdict: "accept" });
  assert.equal(nextAction(root).stage, "probe", "proof stays accepted");
  briefWith(root, [LINES[0], ["proof", "what regulars say, with their photos"]], "A one-page site for regulars.");
  reapprove(root, { revision: "commitment", affects: "all" });
  assert.equal(nextAction(root).section, "hero", "all reopens every section");
});

test("a reverted line does not undo the owner's no, and a re-added section is reviewed again", t => {
  const root = tiered(t);
  briefWith(root, [LINES[0], ["proof", "what regulars say, with their photos"]]);
  reapprove(root, { revision: "commitment", affects: "none" });
  decide(root, { by: "owner", stage: "section", choice: "proof", verdict: "reject", answer: "The photos look like stock" });
  briefWith(root, LINES);
  reapprove(root, { revision: "commitment", affects: "none" });
  assert.equal(nextAction(root).section, "proof", "the latest verdict is the owner's no, whatever key it was given under");

  const readded = tiered(t);
  briefWith(readded, [LINES[0]]);
  decide(readded, { by: "owner", stage: "description", verdict: "accept", choice: "hero", revision: "commitment", affects: "none" });
  assert.equal(nextAction(readded).stage, "probe", "a removed section is not asked for");
  briefWith(readded, LINES);
  reapprove(readded, { revision: "commitment", affects: "none" });
  assert.equal(nextAction(readded).section, "proof", "a section added back is reviewed again");
});

test("a re-approval mid-build keeps the accepted sections before the current one", t => {
  const root = webProject(t);
  toComponents(root, { keep: ["description", "section"] });
  prepareWebComponents(root);
  briefWith(root, LINES);
  decide(root, { by: "owner", stage: "description", verdict: "accept", choice: "hero,proof" });
  buildPage(root, ["hero"]);
  decide(root, { by: "owner", stage: "section", choice: "hero", verdict: "accept" });
  briefWith(root, LINES, "A one-page description of the bakery page.");
  reapprove(root, { revision: "bytes" });
  const next = nextAction(root);
  assert.equal(next.section, "proof", "hero stays accepted and the build moves on");
  assert.equal(next.type, "run");
});

test("the revision flags are refused where they mean nothing or do not fit what changed", t => {
  const fresh = webProject(t);
  toComponents(fresh, { keep: ["description"] });
  prepareWebComponents(fresh);
  briefWith(fresh, LINES);
  refuses(fresh, { stage: "description", verdict: "accept", choice: "hero,proof", revision: "bytes" }, "CONTRACT_INVALID");
  const root = tiered(t);
  refuses(root, { stage: "description", verdict: "accept", choice: "hero,proof", revision: "bytes" }, "CONTRACT_INVALID");
  briefWith(root, LINES, "Reworded.");
  for (const extra of [{}, { revision: "everything" }, { revision: "bytes", affects: "hero" }, { revision: "commitment" }, { revision: "commitment", affects: "footer" }, { affects: "hero" }]) {
    refuses(root, { stage: "description", verdict: "accept", choice: "hero,proof", ...extra }, "CONTRACT_INVALID");
  }
  refuses(root, { stage: "section", choice: "hero", verdict: "accept", revision: "bytes" }, "CONTRACT_INVALID");
  assert.match(refuses(root, { stage: "review", verdict: "accept", affects: "all" }, "CONTRACT_INVALID").message, /only with a re-approval \(--verdict accept\) of the web description/);
  const before = readState(root).decisions.descriptions.length;
  refuses(root, { stage: "description", verdict: "reject", answer: "The proof line is wrong", revision: "commitment", affects: "all" }, "CONTRACT_INVALID");
  assert.equal(readState(root).decisions.descriptions.length, before, "a rejection never carries a tier, and nothing is recorded");
});

test("after a no on a changed description, the returned approval still carries the tier and runs as given", t => {
  const root = tiered(t, []);
  briefWith(root, LINES, "Pickup is on weekends.");
  decide(root, { by: "owner", stage: "description", verdict: "reject", answer: "Say which weekend days" });
  briefWith(root, LINES, "Pickup is on Saturdays and Sundays.");
  const step = nextAction(root);
  assert.equal(step.stage, "description");
  assert.match(step.command, /--by agent .*--choice hero,proof --revision bytes$/, "measured against the last accept, as decide measures it");
  assert.equal(step.carryForward, undefined, "after a no the step is a self-check, not a carry-forward");
  assert.match(step.instruction, /only the wording of the brief.*--revision bytes/, "it still names what changed since the last accept and the tier");
  runReturned(step.command);
  assert.equal(nextAction(root).stage, "probe");
});

test("a malformed section item is named, not dropped, and never reaches a returned command", t => {
  const root = tiered(t, []);
  const { briefSections } = require("../skill/scripts/workflows/web.cjs");
  assert.deepEqual(briefSections("## Sections\n\n- hero: job\n- : proof\n").map(item => item.id), ["hero", "- : proof"]);
  touch(root, "brief.md", "# Brief\n\nReworded.\n\n## Sections\n\n- hero: today's bakes and the reserve button\n- : what regulars say\n");
  assert.match(refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "hero", revision: "commitment", affects: "none" }, "CONTRACT_INVALID").message, /- : what regulars say/);
  touch(root, "brief.md", "# Brief\n\nReworded.\n\n## Sections\n\n- hero$(touch${IFS}pwned): job\n- proof: what regulars say\n");
  const step = nextAction(root);
  assert.equal(step.stage, "description");
  assert.doesNotMatch(step.command, /\$\(/, "an id that is not valid never reaches the shell");
  assert.match(step.command, /--choice <section-ids-in-order,comma-separated>/);
  for (const key of ["command", "instruction"]) assert.doesNotMatch(step[key], /--affects <[^>]*\$\(/, `${key}: an invalid id never enters the --affects hint`);
});

test("all and none are reserved from section ids, since --affects reads them", t => {
  const root = tiered(t, []);
  for (const id of ["all", "none"]) {
    briefWith(root, [[id, "a section with a reserved id"], ...LINES]);
    assert.match(refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: `${id},hero,proof`, revision: "commitment", affects: "none" }, "CONTRACT_INVALID").message, /not all or none/, id);
  }
});

test("the agent carries a byte-only change to a kept description forward, and nothing else", t => {
  const root = tiered(t);
  briefWith(root, LINES, "A one-page description of the bakery page.");
  refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "hero,proof" }, "CONTRACT_INVALID");
  refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "hero,proof", revision: "commitment", affects: "none" }, "CONTRACT_INVALID");
  reapprove(root, { revision: "bytes" }, "agent");
  const entry = readState(root).decisions.roles.at(-1);
  assert.deepEqual([entry.stage, entry.by, entry.revision, entry.carriedForward], ["description", "agent", "bytes", true]);
  assert.match(diligence(root).text, /Description: accept hero,proof \(bytes revision\) \(agent: unspecified; carried forward a byte-only change to the owner's description\)/);
  // After the owner's no, the kept description is theirs again.
  decide(root, { by: "owner", stage: "description", verdict: "reject", answer: "Say who the regulars are" });
  briefWith(root, LINES, "A one-page description for the bakery's regulars.");
  refuses(root, { by: "agent", stage: "description", verdict: "accept", choice: "hero,proof", revision: "bytes" }, "CONTRACT_INVALID");
  reapprove(root, { revision: "bytes" });
  assert.equal(nextAction(root).stage, "probe");
});

test("a description approved before change tiers is approved again once, and its sections reviewed once", t => {
  const root = tiered(t);
  const state = readState(root);
  for (const record of state.decisions.descriptions) { record.upstream = "sha256:legacy"; delete record.inputs; }
  for (const record of state.decisions.sections) delete record.key;
  touch(root, ".design-pipeline/state.json", JSON.stringify(state, null, 2));
  const stale = nextAction(root);
  assert.equal(stale.stage, "description");
  assert.match(stale.first, /before change tiers were recorded, so this approval counts as a first one/);
  reapprove(root);
  assert.equal(nextAction(root).section, "hero", "verdicts without a key are reviewed once more");
});
