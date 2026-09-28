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

test("ui and web use OpenSpec only at the full tier", () => {
  const quick = tmp();
  initState(quick, { deliverable: "ui", tier: "quick" });
  assert.doesNotMatch(nextAction(quick).command, /OpenSpec change/);
  const full = tmp();
  initState(full, { deliverable: "web", tier: "full" });
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

test("film and edit actions name a guide section that exists for every stage", () => {
  for (const deliverable of ["film", "edit"]) {
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
