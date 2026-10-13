"use strict";

// `next` actions keep a runnable command apart from prose: `command` (and a `record` template) is
// `node <absolute designer-pipeline.cjs> ...`, binding the absolute project root as well as the CLI.
// Both work from unrelated directories; explanations live in `instruction`.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, initState, nextAction, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { canonicalJson } = require("../skill/scripts/contract-utils.cjs");
const { buildJobPlan, routeJob } = require("../skill/scripts/job-route-core.cjs");
const film = require("../skill/scripts/workflows/film.cjs");
const edit = require("../skill/scripts/workflows/edit.cjs");
const web = require("../skill/scripts/workflows/web.cjs");
const { PLAYBACK, SECTIONS, STATED, confirmPlayback, pickVariant, statedSkip, writeDescription, writeVariants } = require("./helpers/web-flow.cjs");

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
// Web probe files: a legacy one without the page audit, then one the probe stage accepts. A
// recorded interaction pass binds the rendered-dependency lineage the real verifier records.
const motionProbe = { id: "tap", target: "#cta", input: { kind: "click", at: [10, 10] }, expect: {} };
const motionProbeFile = JSON.stringify({ schema: "design-pipeline.interaction-probe.v1", id: "page", url: "index.html", probes: [motionProbe] });
const auditProbeFile = JSON.stringify({ schema: "design-pipeline.interaction-probe.v1", id: "page", url: "index.html", probes: [motionProbe, { id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } }] });
const LINEAGE = { files: ["index.html"], tokens: [], absent: [], remote: [] };

// Every string field an action offers as a command must be the runnable invocation; prose never
// sits there. `then` and `first` are prose that may quote a command. Web asks offer a `correction`
// template beside `record`, and the web intake also a `skip` template.
const TEMPLATES = ["command", "record", "correction", "skip"];
function check(action, where, seen) {
  assert.ok(["run", "ask", "blocked", "done"].includes(action.type), where);
  for (const field of TEMPLATES) {
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
  const exists = rel => fs.existsSync(path.join(dir, rel));
  const fix = {
    // Web: the quick stated skip, or the playback the owner confirmed; the others answer the questions.
    intake: action => (deliverable !== "web" ? decide(dir, { stage: "intake", answer: "default" }) : action.type === "run" ? statedSkip(dir) : confirmPlayback(dir)),
    reference: () => (mode === "replicate" ? touch(dir, "reference.md", "Observed enamel at three angles.") : decide(dir, { stage: "reference", answer: "none" })),
    concepts: () => {
      if (deliverable === "web") return exists("concepts.html") ? pickVariant(dir) : writeVariants(dir);
      return exists("concepts.md") ? decide(dir, { stage: "concept", choice: "1" }) : touch(dir, "concepts.md");
    },
    style: () => decide(dir, { stage: "concept", choice: "pv" }),
    components: () => decide(dir, { stage: "components", choice: "scratch", answer: "Write from scratch" }),
    description: () => (exists("brief.md") ? decide(dir, { stage: "description", verdict: "accept", choice: SECTIONS.join(",") }) : writeDescription(dir)),
    analyze: () => (exists("sources") ? touch(dir, "edit/analysis.json", "{}") : fs.mkdirSync(path.join(dir, "sources"))),
    cut: () => touch(dir, "edit.json", "{}"),
    render: () => touch(dir, "renders/edit.mp4", "draft"),
    plan: () => (exists("storyboard.json") ? recordGate(dir, "storyboard", "passed", ["storyboard.json"]) : touch(dir, "storyboard.json", "{}")),
    build: action => {
      if (deliverable !== "web") return touch(dir, "out.mp4", "draft");
      // Standard and full web build one approved section at a time; each built section is reviewed.
      if (action.type === "ask") return decide(dir, { stage: "section", choice: action.section, verdict: "accept" });
      if (!exists("index.html")) touch(dir, "index.html", "draft");
      if (action.section && !fs.readFileSync(path.join(dir, "index.html"), "utf8").includes(`data-section="${action.section}"`)) fs.appendFileSync(path.join(dir, "index.html"), `\n<section data-section="${action.section}"></section>\n`);
      touch(dir, "component-manifest.json", JSON.stringify({ fromScratch: true, entries: [] }));
    },
    probe: () => {
      const file = path.join(dir, "interaction.json");
      if (!fs.existsSync(file)) return touch(dir, "interaction.json", motionProbeFile);
      if (fs.readFileSync(file, "utf8") === motionProbeFile) return touch(dir, "interaction.json", auditProbeFile);
      return recordGate(dir, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
    },
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
    fix[action.stage](action);
  }
  throw new Error(`${deliverable}/${tier} did not finish`);
}

test("every command and record template on the film, edit, web and ui walks is the runnable node invocation", () => {
  const all = [];
  for (const [deliverable, tiers] of [["film", ["quick", "standard", "full"]], ["edit", ["quick", "standard"]], ["ui", ["quick", "standard", "full"]]]) {
    for (const tier of tiers) all.push(...walk(deliverable, tier));
  }
  const webQuick = walk("web", "quick");
  const webWalks = [webQuick, walk("web", "standard"), walk("web", "full"), walk("web", "standard", "replicate")];
  all.push(...webWalks.flat(), ...walk("ui", "full", "replicate"));
  // Quick web starts with the stated decision it runs; standard and full start with the conversation,
  // whose ask offers the confirmed playback, a correction and a stated skip as runnable templates.
  assert.equal(webQuick[0].stage, "intake");
  assert.equal(webQuick[0].type, "run");
  assert.match(webQuick[0].command, /--stage intake --choice skip --answer /);
  for (const walked of webWalks.slice(1)) {
    const intake = walked[0];
    assert.equal(intake.stage, "intake");
    assert.equal(intake.type, "ask");
    for (const field of ["record", "correction", "skip"]) assert.ok(runnable(intake[field]), `web intake ${field}`);
    assert.ok(walked.some(action => action.stage === "description" && action.type === "ask" && action.record.includes("--choice")), "the description ask records the section ids");
    assert.ok(walked.some(action => action.stage === "build" && action.type === "ask" && action.section === SECTIONS[0] && action.record.includes("--stage section")), "each built section is asked about");
  }
  assert.ok(webWalks[1].some(action => action.stage === "concepts" && action.type === "ask" && runnable(action.correction)), "the variants ask offers a correction");
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
  assert.match(source.instruction, /^Run the command first, then: Source the real product: /);
  assert.ok(runnable(source.command));
  // The same prose with a storyboard in place has no command at all.
  touch(dir, "storyboard.json", "{}");
  const unscaffolded = nextAction(dir);
  assert.equal(unscaffolded.command, undefined);
  assert.match(unscaffolded.instruction, /^Source the real product: /);
  // Plan command of a plain film.
  const plan = film.stages({ deliverable: "film", tier: "quick", decisions: {}, gates: {}, rules: [] }).find((stage) => stage.id === "plan").action({ deliverable: "film", tier: "quick", decisions: {}, gates: {}, rules: [] }, dir);
  assert.match(plan.instruction, /Author storyboard\.json/);
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
  touch(dir, "interaction.json", auditProbeFile);
  for (const stage of web.stages(webState)) check(stage.action(webState, dir), `web+audit ${stage.id}`, seen);
  assert.ok(seen.some((action) => action.type === "run" && action.command === undefined && /sources\//.test(action.instruction)));
  assert.ok(seen.some((action) => action.type === "run" && action.command === undefined && /^Add an audit probe/.test(action.instruction)), "a probe file without an audit gets an instruction, not the verify command");
  assert.ok(seen.some((action) => / verify interaction /.test(action.command ?? "")), "an audited probe file gets the verify command");
});

test("the command a product promo's source stage returns runs as given and reports the promo's next steps", () => {
  const dir = tmp();
  writePlan(dir, "制作产品宣传动画");
  initState(dir, { deliverable: "film", tier: "quick" });
  const action = nextAction(dir);
  assert.equal(action.stage, "source");
  const elsewhere = tmp();
  // From a different directory, so it works only because the path is absolute.
  const child = spawnSync(`${action.command} --json`, { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, "scaffolded");
  assert.ok(result.next.some((line) => /storyboard\.json\.productSource/.test(line)), "the scaffold points at the product source record");
  assert.equal(nextAction(dir).stage, "source", "the scaffold alone does not admit a product");
});

// The shared intake writes brief.md from the user's reply and owns it only by its bytes. Web intake
// records a conversation instead and never touches a brief (tested below).
for (const deliverable of ["film", "edit", "ui"]) {
  for (const name of ["BRIEF.md", "brief.md"]) {
    test("intake collision " + deliverable + "/" + name + " neither skips intake nor changes user bytes or state", () => {
      const dir = tmp();
      initState(dir, { deliverable, tier: "standard" });
      const bytes = Buffer.from("User assignment\r\nKeep punctuation and bytes.\r\n");
      touch(dir, name, bytes);
      const stateFile = path.join(dir, ".design-pipeline/state.json");
      const before = fs.readFileSync(stateFile);
      assert.equal(nextAction(dir).stage, "intake");
      assert.throws(() => decide(dir, { stage: "intake", answer: "new answer" }), error => {
        assert.equal(error.code, "OUTPUT_COLLISION");
        assert.match(error.message, /rename|move/i);
        return true;
      });
      assert.deepEqual(fs.readFileSync(path.join(dir, name)), bytes);
      assert.deepEqual(fs.readFileSync(stateFile), before);
    });
  }
  test("intake provenance " + deliverable + " records completion and permits only unchanged owned brief re-records", () => {
    const dir = tmp();
    initState(dir, { deliverable, tier: "standard" });
    decide(dir, { stage: "intake", answer: "first answer" });
    assert.ok(readState(dir).decisions.intake);
    decide(dir, { stage: "intake", answer: "corrected answer" });
    assert.equal(fs.readFileSync(path.join(dir, "brief.md"), "utf8"), "# Brief\n\ncorrected answer\n");
    fs.unlinkSync(path.join(dir, "brief.md"));
    assert.notEqual(nextAction(dir).stage, "intake", "state, not file presence, completes intake");
    decide(dir, { stage: "intake", answer: "restored answer" });
    touch(dir, "brief.md", "User edited this file");
    const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json"));
    assert.throws(() => decide(dir, { stage: "intake", answer: "must not replace" }), { code: "OUTPUT_COLLISION" });
    assert.equal(fs.readFileSync(path.join(dir, "brief.md"), "utf8"), "User edited this file");
    assert.deepEqual(fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), before);
  });
}

// Web intake records the playback the owner confirmed, a correction or a stated skip; brief.md is the
// description approved later, so no intake record creates, reads or changes one. A brief.md directory
// would throw on any read; a bare reply is not a web intake record.
test("web intake playback, correction and stated skip never create, read or change a brief, and a bare answer is refused", () => {
  for (const existing of [null, "BRIEF.md", "brief.md", "brief.md directory"]) {
    const dir = tmp();
    initState(dir, { deliverable: "web", tier: "standard" });
    const bytes = Buffer.from("User assignment\r\nKeep punctuation and bytes.\r\n");
    const name = existing?.split(" ")[0];
    if (existing === "brief.md directory") fs.mkdirSync(path.join(dir, name));
    else if (existing) touch(dir, name, bytes);
    const stat = () => (name ? fs.statSync(path.join(dir, name), { bigint: true }) : null);
    const original = stat(), entries = fs.readdirSync(dir).sort();
    const briefUntouched = when => {
      assert.deepEqual(fs.readdirSync(dir).sort(), entries, `${existing}: ${when} adds or removes no entry`);
      if (!name) return;
      const now = stat();
      if (existing.endsWith("directory")) assert.ok(now.isDirectory(), `${existing}: ${when}`);
      else assert.deepEqual(fs.readFileSync(path.join(dir, name)), bytes, `${existing}: ${when} keeps the user's bytes`);
      assert.equal(now.ino, original.ino, `${existing}: ${when} keeps the same entry`);
      assert.equal(now.mtimeNs, original.mtimeNs, `${existing}: ${when} never writes it`);
    };
    const stateFile = path.join(dir, ".design-pipeline/state.json");
    const before = fs.readFileSync(stateFile);
    assert.throws(() => decide(dir, { stage: "intake", answer: "A page for small bakeries that take preorders" }), error => {
      assert.match(error.message, /--verdict accept/);
      assert.match(error.message, /--choice skip/);
      return true;
    });
    assert.deepEqual(fs.readFileSync(stateFile), before, `${existing}: a bare answer changes no state`);
    briefUntouched("a bare answer");
    confirmPlayback(dir);
    assert.deepEqual(readState(dir).decisions.intake, { answer: PLAYBACK, playback: "confirmed" });
    assert.notEqual(nextAction(dir).stage, "intake");
    briefUntouched("a confirmed playback");
    decide(dir, { stage: "intake", verdict: "reject", answer: "Regulars reserve on the way to work, not at night" });
    assert.equal(nextAction(dir).stage, "intake", "a correction reopens intake");
    assert.ok(readState(dir).rules.some(rule => rule.from === "playback 1"));
    briefUntouched("a correction");
    statedSkip(dir);
    assert.deepEqual(readState(dir).decisions.intake, { answer: STATED, skipped: true });
    assert.notEqual(nextAction(dir).stage, "intake");
    briefUntouched("a stated skip");
  }
});

test("intake legacy decisions complete the stage but never authorize a user brief overwrite", () => {
  for (const deliverable of ["ui", "web"]) {
    const dir = tmp();
    const state = initState(dir, { deliverable, tier: "standard" });
    state.decisions.intake = "default";
    touch(dir, ".design-pipeline/state.json", canonicalJson(state));
    touch(dir, "brief.md", "# Brief\n\ndefault\n");
    const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json"));
    assert.notEqual(nextAction(dir).stage, "intake", `${deliverable}: a legacy intake record completes intake`);
    // The shared intake refuses the collision; web refuses a bare reply before looking at any brief.
    assert.throws(() => decide(dir, { stage: "intake", answer: "replacement" }), deliverable === "web" ? /--verdict accept/ : { code: "OUTPUT_COLLISION" });
    assert.equal(fs.readFileSync(path.join(dir, "brief.md"), "utf8"), "# Brief\n\ndefault\n");
    assert.deepEqual(fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), before);
  }
});

test("intake refuses colliding directories without writing state", () => {
  const dir = tmp();
  initState(dir, { deliverable: "ui", tier: "standard" });
  fs.mkdirSync(path.join(dir, "BRIEF.md"));
  const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json"));
  assert.throws(() => decide(dir, { stage: "intake", answer: "replacement" }), { code: "OUTPUT_COLLISION" });
  assert.deepEqual(fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), before);
});

for (const deliverable of ["film", "edit", "web", "ui"]) {
  test("project root record " + deliverable + " executes unchanged from unrelated cwd with a spaced project", () => {
    const dir = path.join(tmp(), "selected project with spaces");
    fs.mkdirSync(dir);
    const elsewhere = tmp();
    initState(dir, { deliverable, tier: "standard" });
    const action = nextAction(dir);
    // Placeholders are filled and the optional anti-goal list left out, as an agent with none would.
    const run = (template, answer) => {
      const command = template.replace(' [--anti-goal "<anti-goal>" ...]', "").replace(/"<[^"]*>"/, `"${answer}"`);
      const child = spawnSync(command + " --json", { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
      assert.equal(child.status, 0, child.stdout + child.stderr);
      assert.equal(JSON.parse(child.stdout).status, "recorded");
    };
    if (deliverable === "web") {
      // The playback, the correction and the stated skip each run as returned; none writes a brief.
      // Each answer is a sentence: a recorded decision needs six words and a correction three.
      const playback = "A copied playback for a bakery preorder page";
      const stated = "I will build the page from this copied line";
      run(action.record, playback);
      assert.deepEqual(readState(dir).decisions.intake, { answer: playback, playback: "confirmed" });
      run(action.correction, "The copied correction says pickup is weekends only");
      assert.equal(nextAction(dir).stage, "intake");
      run(action.skip, stated);
      assert.deepEqual(readState(dir).decisions.intake, { answer: stated, skipped: true });
      assert.ok(!fs.readdirSync(dir).some(name => name.toLowerCase() === "brief.md"), "web intake writes no brief");
    } else {
      run(action.record, "copied answer");
      assert.equal(fs.readFileSync(path.join(dir, "brief.md"), "utf8"), "# Brief\n\ncopied answer\n");
      assert.ok(readState(dir).decisions.intake);
    }
    assert.deepEqual(fs.readdirSync(elsewhere), [], "nothing is created in the shell cwd");
  });
}

test("project root binds all emitted workflow command and record routes including validators", () => {
  const dir = path.join(tmp(), "selected project with spaces");
  fs.mkdirSync(dir);
  const expected = '"' + dir.split(path.sep).join("/") + '"';
  const assertBound = action => {
    for (const field of TEMPLATES) {
      if (!action[field]) continue;
      assert.ok(action[field].includes("--root " + expected), action[field]);
      if (action[field].includes("--project-root")) assert.ok(action[field].includes("--project-root " + expected), action[field]);
      assert.ok(!/--project-root \.(?: |$)/.test(action[field]), action[field]);
    }
    for (const field of ["instruction", "first", "then"]) {
      const text = action[field];
      if (!text) continue;
      if (text.includes("node " + cliFile)) assert.ok(text.includes("--root " + expected), text);
      if (text.includes("npx --no-install")) assert.ok(text.includes("--prefix " + expected), text);
      if (text.includes("ffmpeg -i")) assert.ok(text.includes(expected.slice(0, -1) + "/"), text);
    }
  };
  assertBound(nextAction(dir));
  for (const deliverable of ["film", "edit", "web", "ui"]) {
    for (const tier of ["quick", "standard", "full"]) {
      for (const mode of ["brief", "replicate", "freeform"]) {
        const state = { deliverable, tier, mode, decisions: {}, gates: {}, rules: [] };
        if (deliverable === "ui") {
          const selected = path.join(dir, tier + "-" + mode);
          fs.mkdirSync(selected);
          initState(selected, state);
          const action = nextAction(selected);
          assert.ok((action.record || action.command || action.instruction).includes('"' + selected.split(path.sep).join("/") + '"'));
        } else {
          const workflow = { film, edit, web }[deliverable];
          for (const withFiles of [false, true]) {
            if (withFiles) for (const name of ["concepts.md", "storyboard.json", "interaction.json", "sources/a.mp4", "out.mp4"]) touch(dir, name, name === "interaction.json" ? auditProbeFile : "{}");
            for (const stage of workflow.stages(state)) assertBound(stage.action(state, dir));
          }
        }
      }
    }
  }
});

test("project root storyboard validator runs as returned from unrelated cwd", () => {
  const dir = path.join(tmp(), "selected project with spaces");
  fs.mkdirSync(dir);
  const elsewhere = tmp();
  initState(dir, { deliverable: "film", tier: "quick" });
  fs.copyFileSync(path.resolve(__dirname, "../skill/references/film-choreography/storyboard.example.json"), path.join(dir, "storyboard.json"));
  const action = nextAction(dir);
  assert.equal(action.stage, "plan");
  const child = spawnSync(action.command + " --json", { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  assert.equal(JSON.parse(child.stdout).status, "passed");
  assert.equal(readState(dir).gates.storyboard.status, "passed");
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("project root scaffold handoffs bind runtime and sample record to the selected project", () => {
  const dir = path.join(tmp(), "selected project with spaces");
  fs.mkdirSync(dir);
  const elsewhere = tmp();
  writePlan(dir, "制作产品宣传动画");
  initState(dir, { deliverable: "film", tier: "quick" });
  const action = nextAction(dir);
  const child = spawnSync(action.command + " --json", { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  const result = JSON.parse(child.stdout);
  const root = '"' + dir.split(path.sep).join("/") + '"';
  assert.ok(result.runtime.install.includes(root), result.runtime.install);
  assert.ok(result.runtime.run.includes(root), result.runtime.run);
  const sample = result.next.find(line => line.includes("--stage sample"));
  assert.ok(sample.includes("--root " + root), sample);
  assert.ok(sample.includes("--project-root " + root), sample);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("project root reference resample handoff executes from unrelated cwd", {
  skip: !["ffmpeg", "ffprobe"].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0),
}, () => {
  const dir = path.join(tmp(), "selected project with spaces");
  fs.mkdirSync(dir);
  const elsewhere = tmp();
  initState(dir, { deliverable: "web", tier: "standard", mode: "replicate" });
  confirmPlayback(dir);
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=32x24:rate=10:duration=1", "-c:v", "ffv1", path.join(dir, "input.mkv")], { encoding: "utf8", windowsHide: true });
  assert.equal(created.status, 0, created.stderr);
  const sampled = require("../skill/scripts/reference-video-core.cjs").analyzeVideo(dir, { path: "input.mkv", output: "analysis" });
  touch(dir, "reference-evidence.json", canonicalJson({ videoAnalysis: sampled.descriptor }));
  const action = nextAction(dir);
  assert.equal(action.stage, "reference");
  const resample = action.observation.resample;
  assert.ok(resample.args.includes("--root"), "attached resampling must also bind the selected project");
  const args = resample.args.map(arg => arg === "<new-evidence-dir>" ? "resampled" : arg);
  const child = spawnSync(resample.command + " " + args.map(arg => '"' + arg + '"').join(" ") + " --json", { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  assert.equal(JSON.parse(child.stdout).status, "prepared");
  assert.ok(fs.existsSync(path.join(dir, "resampled")));
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("project root recorded gate repair command binds the block catalog to the selected project", () => {
  const dir = path.join(tmp(), "selected project with spaces");
  fs.mkdirSync(dir);
  const elsewhere = tmp();
  initState(dir, { deliverable: "film", tier: "quick" });
  const board = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
  board.beats[0].block = "unknown-practice-block";
  touch(dir, "storyboard.json", canonicalJson(board));
  const report = require("../skill/scripts/film-core.cjs").checkStoryboard(board, { blockNames: new Set(["known-example-block"]), projectRoot: dir });
  recordGate(dir, "storyboard", report.status, ["storyboard.json"], report);
  const finding = nextAction(dir).verification.findings.find(item => item.code === "block-unknown");
  assert.ok(finding);
  const expected = '"' + dir.split(path.sep).join("/") + '"';
  assert.ok(finding.fix.includes("--root " + expected), finding.fix);
  assert.ok(finding.fix.includes("node " + cliFile), finding.fix);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

function savedBlockRecovery() {
  const dir = path.join(tmp(), "selected project with spaces");
  fs.mkdirSync(dir);
  initState(dir, { deliverable: "film", tier: "quick" });
  touch(dir, "storyboard.json", fs.readFileSync(path.resolve(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
  const command = 'designer-pipeline film blocks --query "camera" --json';
  recordGate(dir, "storyboard", "failed", ["storyboard.json"], {
    findings: [{ code: "block-unknown", severity: "error", message: "Choose a catalog block.", fix: `Run ${command}` }],
    next: command,
  });
  return { dir, command, stateFile: path.join(dir, ".design-pipeline", "state.json") };
}

test("saved gate next projects legacy film blocks without rewriting evidence", () => {
  const { dir, command, stateFile } = savedBlockRecovery();
  const saved = fs.readFileSync(stateFile);
  const verification = nextAction(dir).verification;
  const root = '"' + dir.split(path.sep).join("/") + '"';
  assert.ok(runnable(verification.next), verification.next);
  assert.ok(verification.next.includes("--root " + root), verification.next);
  assert.ok(verification.next.includes("--project-root " + root), verification.next);
  assert.ok(verification.next.endsWith('--query "camera" --json'), verification.next);
  assert.equal(verification.findings[0].fix, `Run ${verification.next}`);
  assert.deepEqual(fs.readFileSync(stateFile), saved);
  assert.equal(readState(dir).gates.storyboard.next, command);
});

test("saved gate next legacy film blocks executes from unrelated cwd", () => {
  const { dir, stateFile } = savedBlockRecovery();
  const elsewhere = tmp();
  // Use the existing offline catalog cache contract: no rendering tools or network are needed.
  touch(dir, ".design-pipeline/hyperframes-catalog.json", canonicalJson({
    schema: "design-pipeline.hyperframes-catalog-cache.v1",
    items: [{ name: "camera-orbit", title: "Camera orbit", type: "block", tags: ["camera"], description: "An orbit." }],
  }));
  const saved = fs.readFileSync(stateFile);
  const command = nextAction(dir).verification.next;
  const child = spawnSync(command, { cwd: elsewhere, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, "found");
  assert.equal(result.cached, true);
  assert.equal(result.catalogSize, 1);
  assert.equal(result.results[0].name, "camera-orbit");
  assert.deepEqual(fs.readFileSync(stateFile), saved);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("intake symlink collision cannot claim ownership from matching brief bytes", t => {
  const dir = tmp();
  initState(dir, { deliverable: "ui", tier: "standard" });
  decide(dir, { stage: "intake", answer: "owned answer" });
  const file = path.join(dir, "brief.md"), target = path.join(dir, "intake-copy.md");
  fs.renameSync(file, target);
  try { fs.symlinkSync(target, file, "file"); }
  catch (error) { if (error.code === "EPERM" || error.code === "EACCES") return t.skip("Host cannot create file symlinks"); throw error; }
  const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), bytes = fs.readFileSync(target);
  assert.throws(() => decide(dir, { stage: "intake", answer: "must not replace target" }), { code: "OUTPUT_COLLISION" });
  assert.deepEqual(fs.readFileSync(target), bytes);
  assert.deepEqual(fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), before);
});

test("intake duplicate case collisions refuse even with an owned brief", t => {
  const dir = tmp();
  initState(dir, { deliverable: "ui", tier: "standard" });
  decide(dir, { stage: "intake", answer: "owned answer" });
  try { fs.writeFileSync(path.join(dir, "BRIEF.md"), "user assignment", { flag: "wx" }); }
  catch (error) { if (error.code === "EEXIST") return t.skip("Host filesystem aliases case variants"); throw error; }
  const before = fs.readFileSync(path.join(dir, ".design-pipeline/state.json"));
  assert.throws(() => decide(dir, { stage: "intake", answer: "must not replace" }), { code: "OUTPUT_COLLISION" });
  assert.equal(fs.readFileSync(path.join(dir, "BRIEF.md"), "utf8"), "user assignment");
  assert.equal(fs.readFileSync(path.join(dir, "brief.md"), "utf8"), "# Brief\n\nowned answer\n");
  assert.deepEqual(fs.readFileSync(path.join(dir, ".design-pipeline/state.json")), before);
});

test("intake hardlink collision preserves external bytes and state through the CLI", t => {
  const dir = tmp(), external = path.join(tmp(), "user-brief.md");
  initState(dir, { deliverable: "ui", tier: "standard" });
  const record = answer => spawnSync(process.execPath, [cliFile, "decide", "--root", dir, "--project-root", dir, "--stage", "intake", "--answer", answer, "--json"], { encoding: "utf8", windowsHide: true });
  const initial = record("owned answer");
  assert.equal(initial.status, 0, initial.stdout + initial.stderr);
  const file = path.join(dir, "brief.md");
  fs.renameSync(file, external);
  try { fs.linkSync(external, file); }
  catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "EOPNOTSUPP", "ENOSYS"].includes(error.code)) return t.skip(`Host cannot create file hardlinks: ${error.code}`);
    throw error;
  }
  assert.ok(fs.lstatSync(file).nlink > 1, "fixture must share the external file's inode");
  const bytes = fs.readFileSync(external);
  const stateFile = path.join(dir, ".design-pipeline/state.json"), before = fs.readFileSync(stateFile);
  const entries = fs.readdirSync(dir);
  const result = record("must not replace external bytes");
  assert.deepEqual(fs.readFileSync(external), bytes, "external file bytes must remain unchanged");
  assert.deepEqual(fs.readFileSync(file), bytes, "the rejected brief must remain unchanged");
  assert.deepEqual(fs.readFileSync(stateFile), before, "state must remain unchanged");
  assert.deepEqual(fs.readdirSync(dir), entries, "refusal must not leave temporary files");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).error.code, "OUTPUT_COLLISION");
});

test("intake owned rewrite replaces the brief entry through the CLI", () => {
  const dir = tmp();
  initState(dir, { deliverable: "ui", tier: "standard" });
  const record = answer => spawnSync(process.execPath, [cliFile, "decide", "--root", dir, "--project-root", dir, "--stage", "intake", "--answer", answer, "--json"], { encoding: "utf8", windowsHide: true });
  const initial = record("owned answer");
  assert.equal(initial.status, 0, initial.stdout + initial.stderr);
  const file = path.join(dir, "brief.md"), before = fs.lstatSync(file, { bigint: true });
  assert.equal(before.nlink, 1n);
  const entries = fs.readdirSync(dir);
  const result = record("updated answer");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "recorded");
  assert.equal(fs.readFileSync(file, "utf8"), "# Brief\n\nupdated answer\n");
  assert.equal(readState(dir).decisions.intake.answer, "updated answer");
  assert.equal(fs.lstatSync(file, { bigint: true }).dev, before.dev);
  assert.notEqual(fs.lstatSync(file, { bigint: true }).ino, before.ino, "rewrite must replace rather than truncate the existing inode");
  assert.deepEqual(fs.readdirSync(dir), entries, "accepted rewrite must not leave temporary files");
});
