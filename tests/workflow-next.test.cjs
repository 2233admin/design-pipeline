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

const PANEL_TEST = [
  "describe('panel registry', () => {",
  "  it('has exactly 42 panel specs', () => {",
  "    expect(PANEL_SPECS.length).toBe(42)",
  "  })",
  "  it('aliases are collision-free', () => {",
  "    expect(collisions).toEqual([])",
  "  })",
  "})",
  "",
].join("\n");
const hostWithTests = () => {
  const dir = tmp();
  touch(dir, "package.json", JSON.stringify({ scripts: { test: "vitest run" } }));
  touch(dir, "components/panel-registry.test.ts", PANEL_TEST);
  touch(dir, "tests/visual/density.test.ts", "test('density', () => { expect(1).toBe(1) })\n");
  touch(dir, "node_modules/pkg/skip.test.js", "it('vendor', () => {})\n");
  return dir;
};
const git = (dir, ...args) => { const child = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" }); assert.equal(child.status, 0, child.stderr); return child.stdout; };

test("ui in an existing project snapshots its test files at the start; deleting one makes deliver fail with its titles", () => {
  const dir = hostWithTests();
  initState(dir, { deliverable: "ui", tier: "quick" });
  assert.deepEqual(Object.keys(readState(dir).hostTests.files), ["components/panel-registry.test.ts", "tests/visual/density.test.ts"]);
  assert.match(nextAction(dir).command, /Extend the project's existing tests freely\. Removing or weakening one needs the user's confirmation/);
  fs.unlinkSync(path.join(dir, "components/panel-registry.test.ts"));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args, "--root", dir], { encoding: "utf8" });
  const refused = run("decide", "--stage", "deliver", "--answer", "done");
  assert.equal(refused.status, 2);
  const result = JSON.parse(refused.stdout);
  assert.equal(result.status, "failed");
  assert.deepEqual(result.findings.map((finding) => finding.code), ["host-test-file-deleted"]);
  assert.match(result.findings[0].message, /components\/panel-registry\.test\.ts .*panel registry \| has exactly 42 panel specs \| aliases are collision-free/);
  assert.equal(readState(dir).decisions.delivered, undefined, "a refused delivery is not recorded");
  assert.equal(nextAction(dir).stage, "work");
});

test("a test edit the user made before the ui job started is not counted; a new test file is listed and needs no verdict", () => {
  const dir = hostWithTests();
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  touch(dir, "components/panel-registry.test.ts", PANEL_TEST.replace("  it('aliases are collision-free', () => {\n    expect(collisions).toEqual([])\n  })\n", ""));
  assert.match(git(dir, "status", "--porcelain"), /panel-registry\.test\.ts/, "the user's own uncommitted test edit");
  initState(dir, { deliverable: "ui", tier: "quick" });
  touch(dir, "components/feed-status.test.ts", "it('shows the source', () => { expect(1).toBe(1) })\n");
  const delivered = decide(dir, { stage: "deliver", answer: "vitest run: 3 passed" });
  assert.equal(delivered.status, "recorded");
  assert.deepEqual(delivered.hostTests.changed, []);
  assert.deepEqual(delivered.hostTests.deleted, []);
  assert.deepEqual(delivered.hostTests.added, ["components/feed-status.test.ts"]);
  assert.equal(delivered.next.type, "done");
  assert.deepEqual(delivered.next.completed, ["work"]);
});

test("changed existing tests hold delivery at test-review: reject goes back to work, accept finishes", () => {
  const dir = hostWithTests();
  initState(dir, { deliverable: "ui", tier: "quick" });
  const weakened = PANEL_TEST.replace("has exactly 42 panel specs", "has panel specs").replace("    expect(collisions).toEqual([])\n", "");
  touch(dir, "components/panel-registry.test.ts", weakened);
  const delivered = decide(dir, { stage: "deliver", answer: "done" });
  assert.equal(delivered.status, "recorded");
  const ask = delivered.next;
  assert.equal(ask.type, "ask");
  assert.equal(ask.stage, "test-review");
  assert.deepEqual(ask.completed, ["work"]);
  assert.match(ask.record, /--stage test-review --verdict accept\|reject --answer/);
  assert.match(ask.why, /cannot prove who typed it/);
  assert.deepEqual(ask.show, [{ path: "components/panel-registry.test.ts", weakening: true, removedTitles: ["has exactly 42 panel specs"], addedTitles: ["has panel specs"], tests: "3 -> 3", assertionLines: "2 -> 1", lines: "9 -> 8", sha256: ask.show[0].sha256 }]);
  assert.equal(nextAction(dir).stage, "test-review", "deliver alone does not finish the job");
  assert.throws(() => decide(dir, { stage: "test-review", verdict: "accept" }), /--answer is required/);

  decide(dir, { stage: "test-review", verdict: "reject", answer: "Keep the exact panel count." });
  const back = nextAction(dir);
  assert.equal(back.stage, "work");
  assert.deepEqual(back.rules, ["Keep the exact panel count."]);
  assert.equal(readState(dir).decisions.drafts, undefined, "the test verdict is not a Visual Acceptance verdict");

  decide(dir, { stage: "deliver", answer: "done again" });
  assert.equal(nextAction(dir).stage, "test-review", "the same changes are asked again after a rejection");
  decide(dir, { stage: "test-review", verdict: "accept", answer: "The user asked for the count to go." });
  const done = nextAction(dir);
  assert.equal(done.type, "done");
  assert.deepEqual(done.completed, ["work", "test-review"]);
  assert.deepEqual(done.evidence.testReviews.map((review) => review.verdict), ["reject", "accept"]);
  assert.deepEqual(done.evidence.drafts, []);
  assert.deepEqual(done.evidence.testChanges.changed, [{ path: "components/panel-registry.test.ts", weakening: true, removedTitles: ["has exactly 42 panel specs"], addedTitles: ["has panel specs"], tests: "3 -> 3", assertionLines: "2 -> 1", lines: "9 -> 8" }], "a downstream reviewer sees what changed");
});

test("purely additive edits of existing tests need no verdict and show in the done evidence; a removed title asks", () => {
  const dir = hostWithTests();
  initState(dir, { deliverable: "ui", tier: "quick" });
  const extended = PANEL_TEST.replace("  })\n})", "  })\n  it('has a feed-status panel', () => {\n    expect(PANEL_META.feedstatus).toBeDefined()\n  })\n})");
  touch(dir, "components/panel-registry.test.ts", extended);
  assert.equal(nextAction(dir).stage, "work", "an additive edit does not add test-review");
  const delivered = decide(dir, { stage: "deliver", answer: "vitest run passed" });
  assert.equal(delivered.next.type, "done");
  assert.deepEqual(delivered.next.completed, ["work"]);
  assert.deepEqual(delivered.next.evidence.testChanges.changed, [{ path: "components/panel-registry.test.ts", weakening: false, removedTitles: [], addedTitles: ["has a feed-status panel"], tests: "3 -> 4", assertionLines: "2 -> 3", lines: "9 -> 12" }]);
  assert.deepEqual(delivered.next.evidence.testReviews, []);
  assert.throws(() => decide(dir, { stage: "test-review", verdict: "accept", answer: "x" }), /no removed or weakened tests wait/);
  initState(dir, { deliverable: "ui", tier: "standard", replace: true });
  assert.equal(readState(dir).hostTests.files["components/panel-registry.test.ts"].titles.length, 4, "an additive edit does not block --replace");

  const dropped = hostWithTests();
  initState(dropped, { deliverable: "ui", tier: "quick" });
  touch(dropped, "components/panel-registry.test.ts", extended.replace("has exactly 42 panel specs", "has 43 panel specs"));
  const ask = decide(dropped, { stage: "deliver", answer: "done" }).next;
  assert.equal(ask.stage, "test-review", "a removed title asks even when the counts grew");
  assert.deepEqual(ask.show[0].removedTitles, ["has exactly 42 panel specs"]);
});

test("test-review without waiting changes is refused; old state without a snapshot only reports", () => {
  const dir = hostWithTests();
  initState(dir, { deliverable: "ui", tier: "quick" });
  assert.throws(() => decide(dir, { stage: "test-review", verdict: "accept", answer: "x" }), /no removed or weakened tests wait/);
  const state = readState(dir);
  delete state.hostTests;
  fs.writeFileSync(path.join(dir, ".design-pipeline/state.json"), JSON.stringify(state));
  fs.unlinkSync(path.join(dir, "components/panel-registry.test.ts"));
  const delivered = decide(dir, { stage: "deliver", answer: "done" });
  assert.equal(delivered.status, "recorded");
  assert.equal(delivered.hostTests.checked, false);
  assert.equal(delivered.next.type, "done");
  const fresh = tmp();
  initState(fresh, { deliverable: "ui", tier: "quick" });
  assert.equal(readState(fresh).hostTests, undefined, "a new project has no snapshot");
  assert.deepEqual(Object.keys(decide(fresh, { stage: "deliver", answer: "x" })), ["status", "stage", "next"]);
});

test("the test check runs at every next: deleting or weakening tests after delivery reopens the job", () => {
  const dir = hostWithTests();
  initState(dir, { deliverable: "ui", tier: "quick" });
  assert.equal(decide(dir, { stage: "deliver", answer: "done" }).next.type, "done", "nothing changed yet");

  const registry = path.join(dir, "components/panel-registry.test.ts");
  fs.unlinkSync(registry);
  const reopened = nextAction(dir);
  assert.equal(reopened.stage, "work", "deliver-then-delete is not done");
  assert.deepEqual(reopened.findings.map((finding) => finding.code), ["host-test-file-deleted"]);
  assert.match(reopened.command, /^Restore the test files/);
  assert.deepEqual(reopened.completed, []);

  touch(dir, "components/panel-registry.test.ts", PANEL_TEST.replace("    expect(collisions).toEqual([])\n", ""));
  const asked = nextAction(dir);
  assert.equal(asked.stage, "test-review", "deliver-then-weaken asks for a verdict");
  assert.deepEqual(asked.completed, ["work"]);
  decide(dir, { stage: "test-review", verdict: "accept", answer: "The user dropped that check." });
  assert.equal(nextAction(dir).type, "done");

  touch(dir, "components/panel-registry.test.ts", PANEL_TEST.replace("has exactly 42 panel specs", "has specs").replace("    expect(collisions).toEqual([])\n", ""));
  const again = nextAction(dir);
  assert.equal(again.stage, "test-review", "an accept about older changes no longer counts");
  assert.deepEqual(again.show[0].removedTitles, ["has exactly 42 panel specs"]);
  decide(dir, { stage: "test-review", verdict: "accept", answer: "Also asked for." });
  assert.equal(nextAction(dir).type, "done");

  touch(dir, "components/panel-registry.test.ts", PANEL_TEST);
  const restored = nextAction(dir);
  assert.equal(restored.type, "done", "tests back as they were need no verdict");
  assert.deepEqual(restored.completed, ["work"]);
});

test("next --replace over unconfirmed test changes is refused; with tests unchanged or confirmed it starts over with a new snapshot", () => {
  const dir = hostWithTests();
  initState(dir, { deliverable: "ui", tier: "quick" });
  const registry = path.join(dir, "components/panel-registry.test.ts");
  touch(dir, "components/panel-registry.test.ts", PANEL_TEST.replace("    expect(collisions).toEqual([])\n", ""));
  for (const deliverable of ["ui", "film"]) assert.throws(() => initState(dir, { deliverable, tier: "quick", replace: true }), /--replace would make removed or weakened tests the new baseline: components\/panel-registry\.test\.ts \(weakened\)/);
  fs.unlinkSync(registry);
  assert.throws(() => initState(dir, { deliverable: "ui", tier: "quick", replace: true }), /panel-registry\.test\.ts \(deleted\)/);
  touch(dir, "components/panel-registry.test.ts", PANEL_TEST.replace("    expect(collisions).toEqual([])\n", ""));
  decide(dir, { stage: "deliver", answer: "done" });
  decide(dir, { stage: "test-review", verdict: "accept", answer: "Asked for." });
  initState(dir, { deliverable: "ui", tier: "quick", replace: true });
  assert.equal(readState(dir).hostTests.files["components/panel-registry.test.ts"].assertions, 1, "confirmed changes become the new baseline");
  assert.equal(readState(dir).decisions.testReviews, undefined);

  const clean = hostWithTests();
  initState(clean, { deliverable: "ui", tier: "quick" });
  touch(clean, "components/new.test.ts", "it('new', () => {})\n");
  initState(clean, { deliverable: "ui", tier: "standard", replace: true });
  assert.equal(readState(clean).tier, "standard", "unchanged tests replace normally");
  assert.ok("components/new.test.ts" in readState(clean).hostTests.files, "and take a new snapshot");
});
