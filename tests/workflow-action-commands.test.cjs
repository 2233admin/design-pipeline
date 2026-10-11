"use strict";

// `next` actions keep a runnable command apart from prose: `command` (and a `record` template) is
// `node <absolute designer-pipeline.cjs> ...`, which works from any directory because the CLI is not
// on PATH; explanations live in `instruction`.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, initState, nextAction, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { canonicalJson } = require("../skill/scripts/contract-utils.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");
const film = require("../skill/scripts/workflows/film.cjs");
const edit = require("../skill/scripts/workflows/edit.cjs");
const web = require("../skill/scripts/workflows/web.cjs");
const { CLI } = require("../skill/scripts/workflows/shared.cjs");

const cliFile = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs").split(path.sep).join("/");
// The runnable invocation, spelled independently of shared.cjs: quoted only when the path needs it.
const INVOCATION = [`node ${cliFile} `, `node "${cliFile}" `];
const runnable = (text) => INVOCATION.some((prefix) => text.startsWith(prefix));

const tmp = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "action-commands-"));
  tmp.dirs.push(dir);
  return dir;
};
tmp.dirs = [];
test.after(() => { for (const dir of tmp.dirs) fs.rmSync(dir, { recursive: true, force: true }); });

const touch = (dir, rel, body = "x") => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };
const writePlan = (dir, query) => touch(dir, "job-plan.json", canonicalJson(buildJobPlan(routeJob({ query }))));

// Every string field an action offers as a command must be the runnable invocation; prose never
// sits there. `then` and `first` are prose that may quote a command.
function check(action, where, seen) {
  assert.ok(["run", "ask", "blocked", "done"].includes(action.type), where);
  for (const field of ["command", "record"]) {
    if (action[field] === undefined) continue;
    assert.equal(typeof action[field], "string", `${where}: ${field}`);
    assert.ok(runnable(action[field]), `${where}: ${field} must start with the runnable node invocation, got: ${action[field].slice(0, 120)}`);
    assert.ok(!/(^|[^\w-])designer-pipeline /.test(action[field].replaceAll(cliFile, "")), `${where}: ${field} must not use the bare designer-pipeline name`);
  }
  if (action.type === "run") assert.ok(action.command || action.instruction, `${where}: a run action has a command, an instruction or both`);
  if (action.instruction !== undefined) assert.equal(typeof action.instruction, "string", `${where}: instruction`);
  if (action.type === "run" && action.line) {
    assert.ok(action.line.includes(action.instruction || action.command), `${where}: line summarizes the action`);
    if (action.instruction && action.command) assert.ok(action.line.endsWith(`Command: ${action.command}`), `${where}: line`);
  }
  seen.push(action);
}

// A project walked from its first action to done by supplying what each stage asks for.
function walk(deliverable, tier, mode) {
  const dir = tmp();
  initState(dir, { deliverable, tier, ...(mode ? { mode } : {}) });
  const fix = {
    intake: () => decide(dir, { stage: "intake", answer: "default" }),
    reference: () => (mode === "replicate" ? touch(dir, "reference.md", "Observed enamel at three angles.") : decide(dir, { stage: "reference", answer: "none" })),
    concepts: () => (fs.existsSync(path.join(dir, "concepts.md")) ? decide(dir, { stage: "concept", choice: "1" }) : touch(dir, "concepts.md")),
    style: () => decide(dir, { stage: "concept", choice: "pv" }),
    analyze: () => (fs.existsSync(path.join(dir, "sources")) ? touch(dir, "edit/analysis.json", "{}") : fs.mkdirSync(path.join(dir, "sources"))),
    cut: () => touch(dir, "edit.json", "{}"),
    render: () => touch(dir, "renders/edit.mp4", "draft"),
    plan: () => (fs.existsSync(path.join(dir, "storyboard.json")) ? recordGate(dir, "storyboard", "passed", ["storyboard.json"]) : touch(dir, "storyboard.json", "{}")),
    build: () => touch(dir, deliverable === "web" ? "index.html" : "out.mp4", "draft"),
    probe: () => (fs.existsSync(path.join(dir, "interaction.json")) ? recordGate(dir, "interaction", "passed", ["interaction.json", "index.html"]) : touch(dir, "interaction.json", "{}")),
    check: () => (deliverable === "edit" ? recordGate(dir, "edit", "passed", ["edit.json", "edit/analysis.json", "renders/edit.mp4"]) : recordGate(dir, "film", "passed", ["storyboard.json", "out.mp4"])),
    review: () => decide(dir, { stage: "review", verdict: "accept" }),
    deliver: () => { if (deliverable !== "web") touch(dir, "final.mp4"); decide(dir, { stage: "deliver", answer: deliverable === "web" ? "https://example.test" : "final.mp4" }); },
    work: () => decide(dir, { stage: "deliver", answer: "done" }),
  };
  const seen = [];
  for (let step = 0; step < 40; step += 1) {
    const action = nextAction(dir);
    check(action, `${deliverable}/${tier}${mode ? `/${mode}` : ""} step ${step} ${action.stage}`, seen);
    if (action.type === "done") return seen;
    assert.ok(fix[action.stage], `no fixture for ${action.stage}`);
    fix[action.stage]();
  }
  throw new Error(`${deliverable}/${tier} did not finish`);
}

test("every command and record template on the film, edit, web and ui walks is the runnable node invocation", () => {
  const all = [];
  for (const [deliverable, tiers] of [["film", ["quick", "standard", "full"]], ["edit", ["quick", "standard"]], ["web", ["quick", "standard", "full"]], ["ui", ["quick", "standard", "full"]]]) {
    for (const tier of tiers) all.push(...walk(deliverable, tier));
  }
  all.push(...walk("web", "standard", "replicate"), ...walk("ui", "full", "replicate"));
  assert.ok(all.length > 60, "the walks cover many actions");
  const commands = all.filter((action) => action.command !== undefined);
  assert.ok(commands.some((action) => action.command.includes(" film check ")), "the film check command is returned");
  assert.ok(commands.some((action) => action.command.includes(" film-edit analyze ")), "the edit analyze command is returned");
  assert.ok(commands.some((action) => action.command.includes(" verify interaction ")), "the web probe command is returned");
  assert.ok(commands.some((action) => action.command.includes(" decide ") && action.command.includes("--stage deliver")), "the delivery command is returned");
  assert.ok(all.filter((action) => action.type === "ask" && action.record).length >= 8, "ask actions keep a runnable record template");
  // Pure instructions (no command) exist, and carry only the prose field.
  const pure = all.filter((action) => action.type === "run" && action.command === undefined);
  assert.ok(pure.length >= 6);
  for (const action of pure) assert.ok(action.instruction.length > 20);
  // Prose never moves into command: no command carries a sentence of its own.
  for (const action of commands) assert.ok(!/ (the|then|and|from|before|first) /.test(action.command.replace(/"[^"]*"/g, "")), action.command);
});

test("product promo actions keep prose out of command: scaffold, source, plan, sample, build and delivery", () => {
  const dir = tmp();
  writePlan(dir, "制作产品宣传动画");
  for (const tier of ["quick", "standard"]) {
    const state = { deliverable: "film", tier, mode: "brief", jobPlan: { deliverableForm: "product-launch-video" }, decisions: {}, gates: {}, rules: [] };
    const seen = [];
    for (const stage of film.stages(state)) check(stage.action(state, dir), `product ${tier} ${stage.id}`, seen);
    assert.ok(seen.length >= 5);
  }
  initState(dir, { deliverable: "film", tier: "quick" });
  const source = nextAction(dir);
  assert.equal(source.stage, "source");
  assert.equal(source.command, `${CLI} film scaffold --output .`);
  assert.match(source.instruction, /^Run the command first, then: Source the real product: /);
  assert.ok(runnable(source.command));
  // The same prose with a storyboard in place has no command at all.
  touch(dir, "storyboard.json", "{}");
  const unscaffolded = nextAction(dir);
  assert.equal(unscaffolded.command, undefined);
  assert.match(unscaffolded.instruction, /^Source the real product: /);
  // Plan and delivery commands of a plain film.
  const plan = film.stages({ deliverable: "film", tier: "quick", decisions: {}, gates: {}, rules: [] }).find((stage) => stage.id === "plan").action({ deliverable: "film", tier: "quick", decisions: {}, gates: {}, rules: [] }, dir);
  assert.equal(plan.command, `${CLI} verify film-storyboard --storyboard storyboard.json`);
  assert.match(plan.instruction, /Author storyboard\.json/);
  const deliver = film.stages({ deliverable: "film", tier: "standard", decisions: {}, gates: {}, rules: [] }).find((stage) => stage.id === "deliver").action();
  assert.equal(deliver.command, `${CLI} decide --project-root . --stage deliver --answer final.mp4`);
  assert.match(deliver.instruction, /hyperframes render --quality high --output final\.mp4/);
});

test("edit and web stages return the command or the instruction, never prose as a command", () => {
  const dir = tmp();
  const state = { deliverable: "edit", tier: "standard", mode: "brief", decisions: {}, gates: {}, rules: [] };
  const seen = [];
  for (const stage of edit.stages(state)) check(stage.action(state, dir), `edit ${stage.id}`, seen);
  touch(dir, "sources/a.mp4");
  for (const stage of edit.stages(state)) check(stage.action(state, dir), `edit+sources ${stage.id}`, seen);
  for (const tier of ["quick", "standard", "full"]) {
    const webState = { deliverable: "web", tier, mode: "brief", decisions: {}, gates: {}, rules: [] };
    for (const stage of web.stages(webState)) check(stage.action(webState, dir), `web ${tier} ${stage.id}`, seen);
  }
  touch(dir, "concepts.md");
  touch(dir, "interaction.json", "{}");
  const webState = { deliverable: "web", tier: "full", mode: "brief", decisions: {}, gates: {}, rules: [] };
  for (const stage of web.stages(webState)) check(stage.action(webState, dir), `web+files ${stage.id}`, seen);
  assert.ok(seen.some((action) => action.type === "run" && action.command === undefined && /sources\//.test(action.instruction)));
});

test("the command a product promo's source stage returns runs as given and reports the promo's next steps", () => {
  const dir = tmp();
  writePlan(dir, "制作产品宣传动画");
  initState(dir, { deliverable: "film", tier: "quick" });
  const action = nextAction(dir);
  assert.equal(action.stage, "source");
  const elsewhere = tmp();
  // From a different directory, so it works only because the path is absolute.
  const child = spawnSync(`${action.command} --root "${dir}" --json`, { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, "scaffolded");
  assert.ok(result.next.some((line) => /storyboard\.json\.productSource/.test(line)), "the scaffold points at the product source record");
  assert.ok(result.next.some((line) => /sample\.mp4/.test(line) && /decide --stage sample/.test(line)), "and at the sample step");
  assert.equal(nextAction(dir).stage, "source", "the scaffold alone does not admit a product");
});
