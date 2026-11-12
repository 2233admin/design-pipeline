"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, initState, nextAction, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "workflow-"));
const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const touch = (dir, rel, body = "x") => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };

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
  assert.ok(review.show.includes("evidence/contact-sheet.png"));
  assert.throws(() => decide(dir, { stage: "review", verdict: "reject" }), /one sentence/);
  decide(dir, { stage: "review", verdict: "reject", answer: "The logo lands too early." });
  const again = nextAction(dir);
  assert.equal(again.stage, "check", "a rejection reopens the check for the rebuilt draft");
  assert.deepEqual(again.rules, ["The logo lands too early."]);
  recordGate(dir, "film", "passed");
  decide(dir, { stage: "review", verdict: "accept" });
  assert.equal(stage(), "deliver");
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
  const run = (...args) => JSON.parse(spawnSync(process.execPath, [cli, ...args, "--root", dir], { encoding: "utf8" }).stdout);
  assert.equal(run("next", "--deliverable", "film", "--tier", "quick").stage, "plan");
  run("film", "scaffold", "--output", ".");
  run("verify", "film-storyboard", "--storyboard", "storyboard.json");
  assert.equal(run("next").stage, "build", "verify film-storyboard recorded its pass in the state");
  assert.equal(run("decide", "--stage", "deliver", "--answer", "x").status, "recorded");
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
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(path.join(dir, "out.mp4"), later, later);
  assert.equal(nextAction(dir).stage, "check", "a re-rendered draft must be checked again");
  fs.utimesSync(path.join(dir, "storyboard.json"), later, later);
  assert.equal(nextAction(dir).stage, "plan", "an edited storyboard must pass its gate again");
});

test("a file written a few milliseconds after its gate still counts; a later edit does not", () => {
  // File times and Date.now() come from different clocks, so a loaded host can stamp an input a few
  // milliseconds after the gate that checked it.
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
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(path.join(dir, "index.html"), later, later);
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

const shared = require("../skill/scripts/workflows/shared.cjs");
const webStages = require("../skill/scripts/workflows/web.cjs").stages;
const PROMPT_FIELDS = ["question", "questions", "recommended", "options", "record", "why", "command"];
const promptOf = (action) => Object.fromEntries(PROMPT_FIELDS.filter((key) => key in action).map((key) => [key, action[key]]));

test("web intake asks product, audience, scope and assets, with no duration or film wording", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  const action = nextAction(dir);
  assert.equal(action.stage, "intake");
  assert.equal(action.type, "ask");
  assert.deepEqual(action.questions.map((question) => question.id), ["product", "audience", "scope", "assets"]);
  assert.ok(!action.questions.some((question) => question.id === "duration"));
  assert.doesNotMatch(JSON.stringify(action), /how long|duration|film|promo|video|footage|beat/i);
  assert.equal(action.record, shared.INTAKE.action().record);
});

test("web concepts asks for a section arc and a treatment, then keeps the shared choice record", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  touch(dir, "brief.md");
  decide(dir, { stage: "reference", answer: "none" });
  const write = nextAction(dir);
  assert.equal(write.stage, "concepts");
  assert.equal(write.type, "run");
  assert.match(write.command, /section/i);
  assert.match(write.command, /## Treatment/);
  assert.doesNotMatch(write.command, /between beats|the picture/i);
  touch(dir, "concepts.md");
  const choose = nextAction(dir);
  assert.equal(choose.type, "ask");
  assert.equal(choose.record, shared.CONCEPTS.action({}, dir).record);
});

test("film and edit prompts at intake and concepts equal the shared ones", () => {
  for (const deliverable of ["film", "edit"]) {
    const dir = tmp();
    initState(dir, { deliverable, tier: "standard" });
    const intake = nextAction(dir);
    assert.equal(intake.stage, "intake", deliverable);
    assert.deepEqual(promptOf(intake), promptOf(shared.INTAKE.action()), deliverable);
    assert.ok(intake.questions.some((question) => question.id === "duration"), `${deliverable} intake keeps the duration question`);
  }

  const film = tmp();
  initState(film, { deliverable: "film", tier: "standard" });
  decide(film, { stage: "intake", answer: "default" });
  decide(film, { stage: "reference", answer: "none" });
  const write = nextAction(film);
  assert.equal(write.stage, "concepts");
  assert.deepEqual(promptOf(write), promptOf(shared.CONCEPTS.action(readState(film), film)));
  touch(film, "concepts.md");
  const choose = nextAction(film);
  assert.equal(choose.type, "ask");
  assert.deepEqual(promptOf(choose), promptOf(shared.CONCEPTS.action(readState(film), film)));
});

test("ui intake asks about what is built, with no duration or film wording, and keeps the shared record", () => {
  const dir = tmp();
  initState(dir, { deliverable: "ui", tier: "standard" });
  const action = nextAction(dir);
  const sharedIntake = shared.INTAKE.action();
  assert.equal(action.stage, "intake");
  assert.equal(action.type, "ask");
  assert.deepEqual(action.questions.map((question) => question.id), ["product", "audience", "scope", "assets"]);
  assert.ok(action.questions.every((question) => question.ask && question.recommended));
  assert.doesNotMatch(JSON.stringify(action), /how long|duration|film|promo|video|footage|beat|music|launch event/i);
  assert.equal(action.record, sharedIntake.record);
  assert.equal(action.question, sharedIntake.question);
  assert.equal(action.why, sharedIntake.why);
});

test("ui stages keep their ids and order: quick is work; standard and full are intake then work", () => {
  const quick = tmp();
  initState(quick, { deliverable: "ui", tier: "quick" });
  const first = nextAction(quick);
  assert.equal(first.stage, "work");
  assert.equal(first.remaining, 1);
  assert.deepEqual(first.completed, []);

  for (const tier of ["standard", "full"]) {
    const dir = tmp();
    initState(dir, { deliverable: "ui", tier });
    const intake = nextAction(dir);
    assert.equal(intake.stage, "intake", tier);
    assert.equal(intake.remaining, 2, tier);
    decide(dir, { stage: "intake", answer: "a settings screen" });
    assert.ok(fs.existsSync(path.join(dir, "brief.md")), tier);
    const work = nextAction(dir);
    assert.equal(work.stage, "work", tier);
    assert.deepEqual(work.completed, ["intake"], tier);
    assert.equal(work.remaining, 1, tier);
    decide(dir, { stage: "deliver", answer: "checked in a browser" });
    assert.deepEqual(nextAction(dir).completed, ["intake", "work"], tier);
  }
});

test("web stage ids per tier keep their order", () => {
  assert.deepEqual(webStages({ tier: "quick" }).map((stage) => stage.id), ["build", "probe"]);
  for (const tier of ["standard", "full"]) {
    assert.deepEqual(webStages({ tier }).map((stage) => stage.id), ["intake", "reference", "concepts", "build", "probe", "review", "deliver"], tier);
  }
});

test("web build at standard and full extends the chosen card with a treatment; quick does not", () => {
  for (const tier of ["standard", "full"]) {
    const dir = tmp();
    initState(dir, { deliverable: "web", tier });
    decide(dir, { stage: "intake", answer: "default" });
    decide(dir, { stage: "reference", answer: "none" });
    touch(dir, "concepts.md");
    decide(dir, { stage: "concept", choice: 1 });
    const build = nextAction(dir);
    assert.equal(build.stage, "build", tier);
    assert.match(build.command, /## Treatment/, tier);
    if (tier === "standard") assert.equal(build.remaining, 4, "build, probe, review, deliver");
  }
  const quick = tmp();
  initState(quick, { deliverable: "web", tier: "quick" });
  const build = nextAction(quick);
  assert.equal(build.stage, "build");
  assert.doesNotMatch(build.command, /Treatment/i);
});

test("web review speaks of the page and keeps the shared decision contract", () => {
  const dir = tmp();
  initState(dir, { deliverable: "web", tier: "standard" });
  decide(dir, { stage: "intake", answer: "default" });
  decide(dir, { stage: "reference", answer: "none" });
  touch(dir, "concepts.md");
  decide(dir, { stage: "concept", choice: 1 });
  touch(dir, "index.html");
  touch(dir, "interaction.json", "{}");
  recordGate(dir, "interaction", "passed");
  const action = nextAction(dir);
  assert.equal(action.stage, "review");
  assert.equal(action.type, "ask");
  assert.doesNotMatch(JSON.stringify(action), /video|contact-sheet|footage|beat/i);
  assert.equal(action.record, shared.REVIEW.action(readState(dir)).record);
  decide(dir, { stage: "review", verdict: "accept" });
  assert.equal(nextAction(dir).stage, "deliver", "an accepted verdict finishes web review as before");
});

test("film and edit review actions equal the shared one", () => {
  const film = tmp();
  initState(film, { deliverable: "film", tier: "standard" });
  decide(film, { stage: "intake", answer: "default" });
  decide(film, { stage: "reference", answer: "none" });
  touch(film, "concepts.md");
  decide(film, { stage: "concept", choice: 1 });
  touch(film, "storyboard.json");
  recordGate(film, "storyboard", "passed");
  touch(film, "out.mp4");
  recordGate(film, "film", "passed");
  const filmReview = nextAction(film);
  assert.equal(filmReview.stage, "review");
  assert.deepEqual(promptOf(filmReview), promptOf(shared.REVIEW.action(readState(film))));
  assert.deepEqual(filmReview.show, shared.REVIEW.action(readState(film)).show);

  const edit = tmp();
  initState(edit, { deliverable: "edit", tier: "standard" });
  decide(edit, { stage: "intake", answer: "default" });
  touch(edit, "edit/analysis.json", "{}");
  decide(edit, { stage: "concept", choice: "pv" });
  touch(edit, "edit.json", "{}");
  touch(edit, "renders/edit.mp4");
  recordGate(edit, "edit", "passed");
  const editReview = nextAction(edit);
  assert.equal(editReview.stage, "review");
  assert.deepEqual(promptOf(editReview), promptOf(shared.REVIEW.action(readState(edit))));
  assert.deepEqual(editReview.show, shared.REVIEW.action(readState(edit)).show);
});

const existingProject = () => {
  const dir = tmp();
  touch(dir, "package.json", JSON.stringify({ scripts: { test: "vitest run", build: "next build", dev: "next dev" } }));
  touch(dir, "tsconfig.json", "{}");
  touch(dir, "AGENTS.md", "# Agents\n\nNever edit generated files.\n");
  touch(dir, "CONTEXT.md", "# Context\n禁区：订单流 canvas 引擎、注册表/架构。\n```\ndo not quote fenced code\n```\n");
  touch(dir, "docs/research/survey.md", "This library was never built for panels.\n");
  touch(dir, "docs/ux/ORDERFLOW_ACCEPTANCE_GATES.md", "面板不得自建 setInterval 循环。\n");
  touch(dir, "docs/ux/UX_DECISION_LEDGER.md", "# Ledger\n### D-005: panels must not start their own random walk\n");
  touch(dir, "docs/a.md", "plain notes\n");
  touch(dir, "docs/.drafts/hidden.md", "never\n");
  touch(dir, "src/panel.ts", "// never read by the tool\n");
  return dir;
};

test("ui work in an existing project prints its rule files, checks and constraint lines from rule, ledger and gate files, and writes nothing", () => {
  const dir = existingProject();
  initState(dir, { deliverable: "ui", tier: "quick" });
  const stateBefore = fs.readFileSync(path.join(dir, ".design-pipeline/state.json"), "utf8");
  const work = nextAction(dir);
  assert.equal(work.stage, "work");
  const lines = work.command.split("\n");
  const listed = lines.filter((line) => /^- (?:(?:AGENTS|CLAUDE|CONTEXT)\.md|docs\/\S+\.md)$/.test(line));
  assert.deepEqual(listed, ["- AGENTS.md", "- CONTEXT.md", "- docs/a.md", "- docs/research/survey.md", "- docs/ux/ORDERFLOW_ACCEPTANCE_GATES.md", "- docs/ux/UX_DECISION_LEDGER.md"]);
  assert.ok(lines.includes("- test: npm run test  (package.json scripts.test: vitest run)"));
  assert.ok(lines.some((line) => line.startsWith("- typecheck: npx tsc --noEmit")));
  assert.ok(lines.some((line) => line.startsWith("- lint: missing")));
  assert.ok(lines.includes("- build: npm run build  (package.json scripts.build: next build)"));
  const quoted = lines.filter((line) => /^- \S+\.md:\d+: /.test(line));
  assert.deepEqual(quoted, [
    "- AGENTS.md:3: Never edit generated files.",
    "- CONTEXT.md:2: 禁区：订单流 canvas 引擎、注册表/架构。",
    "- docs/ux/UX_DECISION_LEDGER.md:2: ### D-005: panels must not start their own random walk",
    "- docs/ux/ORDERFLOW_ACCEPTANCE_GATES.md:1: 面板不得自建 setInterval 循环。",
  ], "root rule files, then decision ledgers, then acceptance gates; a research doc is listed, never quoted");
  assert.doesNotMatch(work.command, /fenced code|hidden\.md|src\/panel\.ts|never built|DESIGN\.md\/MOTION\.md only at standard|follow references\/pipeline-reference\.md/i);
  assert.doesNotMatch(work.line, /\n/);
  assert.equal(fs.readFileSync(path.join(dir, ".design-pipeline/state.json"), "utf8"), stateBefore);
  assert.equal(fs.existsSync(path.join(dir, "brief.md")), false);

  touch(dir, "package.json", JSON.stringify({ scripts: { test: "vitest run", lint: "eslint .", typecheck: "tsc -p ." } }));
  touch(dir, "pnpm-lock.yaml", "");
  const again = nextAction(dir).command.split("\n");
  assert.ok(again.includes("- lint: pnpm run lint  (package.json scripts.lint: eslint .)"), "the facts are found again at every call");
  assert.ok(again.includes("- typecheck: pnpm run typecheck  (package.json scripts.typecheck: tsc -p .)"));
  assert.ok(again.some((line) => line.startsWith("- build: missing")));
});

test("ui work in an existing project caps the listed docs and quotes and says how many it left out", () => {
  const dir = tmp();
  touch(dir, "package.json", "{}");
  for (let index = 0; index < 30; index += 1) touch(dir, `docs/n${String(index).padStart(2, "0")}.md`, "never\n");
  touch(dir, "docs/zz-RULES.md", "Never hard-code colours.\n");
  touch(dir, "CONTEXT.md", ["never 1", "never 2", "never 3", "never 4", "never 5"].join("\n"));
  const facts = require("../skill/scripts/existing-project-core.cjs").inspectHost(dir);
  assert.equal(facts.ruleFiles.length, 26);
  assert.equal(facts.ruleFiles.at(-2), "docs/n23.md");
  assert.equal(facts.ruleFiles.at(-1), "docs/zz-RULES.md", "a quote source is listed even past the cap");
  assert.equal(facts.docsOmitted, 6);
  assert.deepEqual(facts.quotes.map((quote) => `${quote.path}:${quote.line}`), ["CONTEXT.md:1", "CONTEXT.md:2", "CONTEXT.md:3", "docs/zz-RULES.md:1"]);
  assert.equal(facts.quotesOmitted, 2);
  initState(dir, { deliverable: "ui", tier: "full" });
  decide(dir, { stage: "intake", answer: "a settings screen" });
  const command = nextAction(dir).command;
  assert.match(command, /^Open an OpenSpec change/);
  assert.doesNotMatch(command, /follow references\/pipeline-reference\.md|DESIGN\.md\/MOTION\.md only at standard/i);
  assert.match(command, /and 6 more \.md under docs\/ not listed/);
  assert.match(command, /and 2 more matching lines not shown/);
  assert.ok(command.split("\n").includes("- lint: missing (no lint script in package.json)"));
  assert.ok(command.split("\n").includes("- typecheck: missing (no typecheck script in package.json)"), "no tsconfig.json, no tsc fallback");
});
