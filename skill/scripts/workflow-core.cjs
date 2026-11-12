"use strict";

// The user workflow: one project state file and one next step at a time.
// `next` reads .design-pipeline/state.json, walks the stages of the project's deliverable and tier,
// and returns the first unfinished stage as exactly one action:
//   run  - a command for the agent, with the reason
//   ask  - one decision for the user, with a recommended answer (concept pick, draft verdict)
//   done - the deliverable is finished, with its evidence
// Stages are finished by artifacts on disk or decisions in the state, so `next` never repeats work.

const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, fail, readJson } = require("./contract-utils.cjs");

const SCHEMA = "design-pipeline.workflow-state.v1";
const STATE = path.join(".design-pipeline", "state.json");
const DELIVERABLES = ["film", "edit", "web", "ui"];
const TIERS = ["quick", "standard", "full"];
const MODES = ["brief", "replicate", "freeform"];
const CLI = "designer-pipeline";

// Sub-workflows by deliverable (Q5, Q7): film, edit and web have their own stage modules and
// guides.
const { INTAKE } = require("./workflows/shared.cjs");
const { compareHostTests, hostWorkCommand, inspectHost, snapshotHostTests } = require("./existing-project-core.cjs");
const SUB_WORKFLOWS = { film: require("./workflows/film.cjs"), edit: require("./workflows/edit.cjs"), web: require("./workflows/web.cjs") };

// The ui deliverable builds screens, not a film, so it asks about what is built. Stage id, finish
// rule, record, question and why come from the shared intake.
const UI_INTAKE = {
  ...INTAKE,
  action: () => ({
    ...INTAKE.action(),
    questions: [
      { id: "product", ask: "What are we building (a screen, a set of components or a design system), and what should a person be able to do with it?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who uses it, and on which devices?", recommended: "People using a browser on desktop and phone." },
      { id: "scope", ask: "Which screens, components or states are in scope, and what does a person do first?", recommended: "The smallest set that lets one person finish the first task." },
      { id: "assets", ask: "Which existing code, design system, brand rules, copy or images can be used, and are they licensed for this use?", recommended: "Only what you own or may use; reuse what the project already has first." },
    ],
  }),
};

// In an existing project (a root package.json) the work action is host-first: the facts are found
// again at every call and printed; nothing is written and no stage reads them back.
// `tests` is the live comparison with the start snapshot (or null): a snapshot test file that is
// gone keeps `work` open even after a delivery, so deleting after delivering does not finish the job.
function codeStages(tier, tests) {
  const deliver = `${CLI} decide --project-root . --stage deliver --answer <evidence>`;
  const deleted = tests?.deleted || [];
  const work = { id: "work", finished: (state) => Boolean(state.decisions?.delivered) && !deleted.length, action: (state, root) => {
    if (deleted.length) return { type: "run", command: `Restore the test files that existed when this job started, extend them instead of deleting them, then: ${deliver}`, findings: deletedFindings(deleted), why: "A test file present at the start of the job is gone; the job cannot be done until it is back." };
    const host = inspectHost(root);
    if (host) return { type: "run", command: hostWorkCommand(host, tier, deliver), why: "The host project's own rules and checks govern the work; the facts are found again at every call and are a prompt, not a record or evidence." };
    return { type: "run", command: tier === "full" ? `Open an OpenSpec change under openspec/changes/<id>/ and follow references/pipeline-reference.md; when verified: ${deliver}` : `Follow references/pipeline-reference.md at the ${tier} tier (no OpenSpec; create DESIGN.md/MOTION.md only at standard if missing), verify the rendered surface, then: ${deliver}`, why: tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the gates." };
  } };
  return tier === "quick" ? [work] : [UI_INTAKE, work];
}

function deletedFindings(deleted) {
  return deleted.map((file) => ({ code: "host-test-file-deleted", severity: "error", message: `${file.path} existed when this job started and is gone${file.titles.length ? ` (tests: ${file.titles.join(" | ")})` : ""}`, fix: "Restore the file and extend it instead of deleting it; if the user wants it gone, they delete it themselves." }));
}

// The user's confirmation of changes to the host's existing tests, separate from the Visual
// Acceptance `review` verdict. It is in the stage list while snapshot test files differ from the
// snapshot, and finished only by an `accept` recorded for exactly the current changes (their
// digest): a verdict about older changes no longer counts. It is meant to be the user's answer;
// the tool cannot prove who typed it.
function testReviewStage(tests) {
  return {
    id: "test-review",
    finished: (state) => { const last = (state.decisions?.testReviews || []).at(-1); return Boolean(last && last.verdict === "accept" && last.digest === tests.digest); },
    action: () => ({ type: "ask", question: "Existing tests were removed or weakened during this job. They need your confirmation: accept these test changes, or reject them with one sentence?", show: tests.weakened, added: tests.added, recommended: "Reject unless you asked for these tests to change; removed test titles and fewer tests or assertion lines usually mean weaker tests.", record: `${CLI} decide --project-root . --stage test-review --verdict accept|reject --answer "<reason>"`, why: "This verdict is meant to be the user's, about the tests only; the tool cannot prove who typed it. A rejection sends the job back to work and becomes a project rule. Purely additive test changes need no verdict; they are listed in the done evidence." }),
  };
}

// Recomputed at every `next` and `decide`: nothing about the current tests is cached in the state.
function liveHostTests(state, root) {
  return state.deliverable === "ui" && state.hostTests ? compareHostTests(root, state.hostTests) : null;
}

function stagesFor(state, root) {
  const sub = SUB_WORKFLOWS[state.deliverable];
  if (sub) return sub.stages(state);
  const tests = liveHostTests(state, root);
  return [...codeStages(state.tier, tests), ...(tests?.weakened.length ? [testReviewStage(tests)] : [])];
}

function readState(root) {
  const file = path.join(root, STATE);
  if (!fs.existsSync(file)) return null;
  const state = readJson(file, "workflow state");
  if (state.schema !== SCHEMA) fail("workflow", `state schema must be ${SCHEMA}`);
  return state;
}

function writeState(root, state) {
  const file = path.join(root, STATE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`);
}

// Tier from the request size when the agent does not choose: one element is quick, a whole
// deliverable is standard, shared or multi-part work is full.
function initState(root, options = {}) {
  const previous = readState(root);
  if (previous && !options.replace) fail("workflow", "this project already has .design-pipeline/state.json. Fix: run next, or pass --replace to start over", { code: "OUTPUT_EXISTS" });
  assertEnum(options.deliverable, DELIVERABLES, "deliverable", "workflow");
  const tier = options.tier || "standard";
  assertEnum(tier, TIERS, "tier", "workflow");
  const mode = options.mode || "brief";
  assertEnum(mode, MODES, "mode", "workflow");
  const state = { schema: SCHEMA, deliverable: options.deliverable, tier, mode, director: options.director || null, decisions: {}, gates: {}, rules: [], createdAt: new Date().toISOString() };
  // An existing project's test files as they are when the ui job starts (the user's uncommitted
  // edits included); deliver compares against this, never against git. --replace over a snapshot
  // is refused while test files are missing or weakened without an accepted test-review, so starting
  // over cannot make unconfirmed weakened tests the new baseline.
  if (previous?.hostTests) {
    const tests = compareHostTests(root, previous.hostTests);
    const last = (previous.decisions?.testReviews || []).at(-1);
    const confirmed = !tests.weakened.length || (last?.verdict === "accept" && last.digest === tests.digest);
    if (tests.deleted.length || !confirmed) fail("workflow", `--replace would make removed or weakened tests the new baseline: ${[...tests.deleted.map((file) => `${file.path} (deleted)`), ...(confirmed ? [] : tests.weakened.map((change) => `${change.path} (weakened)`))].join(", ")}. Fix: restore those test files, or have the user confirm the changes with decide --stage test-review, then replace`);
  }
  if (options.deliverable === "ui" && inspectHost(root)) state.hostTests = snapshotHostTests(root);
  writeState(root, state);
  return state;
}

function nextAction(root) {
  const state = readState(root);
  if (!state) {
    return { type: "ask", stage: "start", question: "What are we making, and how big is it?", recommended: "film/standard for a promo or explainer; edit/standard for PV or MAD; quick for a single motion, shot or component; full only for large shared work.", record: `${CLI} next --project-root . --deliverable film|edit|web|ui --tier quick|standard|full [--mode brief|replicate|freeform]`, line: "No project state yet: choose the deliverable and tier." };
  }
  const stages = stagesFor(state, root);
  const done = [];
  for (const stage of stages) {
    if (stage.finished(state, root)) { done.push(stage.id); continue; }
    const action = stage.action(state, root);
    const directed = state.director && action.type === "ask" && ["concepts", "review"].includes(stage.id) ? { director: `Switch to ${state.director} for this step (art director mode).` } : {};
    const rules = state.rules.length ? { rules: state.rules.map((rule) => rule.text) } : {};
    const guide = SUB_WORKFLOWS[state.deliverable] ? { guide: `references/workflow-${state.deliverable}.md#${stage.id}` } : {};
    return { ...action, ...guide, ...directed, ...rules, stage: stage.id, deliverable: state.deliverable, tier: state.tier, completed: done, remaining: stages.length - done.length, line: `${state.deliverable}/${state.tier}: ${stage.id} (${done.length + 1}/${stages.length}) - ${action.type === "ask" ? action.question : String(action.command).split("\n")[0]}` };
  }
  // A ui job with a test snapshot shows what changed in the host's tests next to the verdicts, so a
  // downstream reviewer sees it; other jobs keep the old evidence shape.
  const tests = liveHostTests(state, root);
  const testReviews = tests ? { testChanges: { since: tests.since, changed: tests.changed.map(({ sha256, ...change }) => change), added: tests.added }, testReviews: state.decisions.testReviews || [] } : {};
  return { type: "done", stage: "done", deliverable: state.deliverable, tier: state.tier, completed: done, evidence: { delivered: state.decisions.delivered || null, gates: state.gates, drafts: state.decisions.drafts || [], ...testReviews }, line: `${state.deliverable}/${state.tier}: done` };
}

function decide(root, options = {}) {
  const state = readState(root);
  if (!state) fail("workflow", "no project state. Fix: run next with --deliverable and --tier first", { code: "INPUT_MISSING" });
  const stage = options.stage;
  assertEnum(stage, ["intake", "reference", "concept", "review", "deliver", "test-review"], "stage", "workflow");
  state.decisions = state.decisions || {};
  if (stage === "intake") {
    if (!options.answer) fail("workflow", "--answer is required: the user's reply to the intake questions");
    fs.writeFileSync(path.join(root, "brief.md"), `# Brief\n\n${options.answer}\n`);
  } else if (stage === "reference") {
    const answer = options.answer || "none";
    if (answer === "none" && state.mode === "replicate") fail("workflow", "replicate mode cannot skip the reference. Fix: write reference.md from the reference you are reproducing");
    state.decisions.reference = answer;
  } else if (stage === "concept") {
    if (!options.choice) fail("workflow", "--choice is required: the concept number, or mad/pv for an edit");
    state.decisions.concept = String(options.choice);
    if (options.answer) state.decisions.conceptNotes = options.answer;
  } else if (stage === "review") {
    assertEnum(options.verdict, ["accept", "reject"], "verdict", "workflow");
    if (options.verdict === "reject" && !options.answer) fail("workflow", "a rejection needs --answer with one sentence on what is wrong; it becomes a project rule");
    state.decisions.drafts = [...(state.decisions.drafts || []), { verdict: options.verdict, reason: options.answer || null, at: new Date().toISOString() }];
    if (options.verdict === "reject") {
      state.rules = [...(state.rules || []), { text: options.answer, from: `draft ${state.decisions.drafts.length}`, scope: "project" }];
      // A rejected draft must be rebuilt and rechecked.
      state.gates = Object.fromEntries(Object.entries(state.gates || {}).filter(([gate]) => !["film", "edit", "interaction"].includes(gate)));
    }
  } else if (stage === "test-review") {
    const tests = liveHostTests(state, root);
    if (!tests?.weakened.length) fail("workflow", "no removed or weakened tests wait for a verdict. Fix: run next; test-review is asked only while existing tests of a ui job have fewer titles, tests or assertion lines than at its start", { code: "INPUT_MISSING" });
    assertEnum(options.verdict, ["accept", "reject"], "verdict", "workflow");
    if (!options.answer) fail("workflow", "--answer is required: one sentence on why the test changes are accepted or rejected", { code: "INPUT_MISSING" });
    // The verdict is bound to the changes it judged; a later edit gives a new digest and asks again.
    state.decisions.testReviews = [...(state.decisions.testReviews || []), { verdict: options.verdict, reason: options.answer, digest: tests.digest, changed: tests.weakened.map((change) => change.path), at: new Date().toISOString() }];
    if (options.verdict === "reject") {
      state.rules = [...(state.rules || []), { text: options.answer, from: `test review ${state.decisions.testReviews.length}`, scope: "project" }];
      delete state.decisions.delivered; // back to work
    }
  } else if (stage === "deliver") {
    const hostTests = deliverHostTests(state, root);
    if (hostTests.deleted?.length) return { status: "failed", stage, findings: deletedFindings(hostTests.deleted), hostTests, next: nextAction(root) };
    state.decisions.delivered = options.answer || true;
    writeState(root, state);
    return { status: "recorded", stage, ...(hostTests.checked === undefined && !hostTests.changed ? {} : { hostTests }), next: nextAction(root) };
  }
  writeState(root, state);
  return { status: "recorded", stage, next: nextAction(root) };
}

// ui deliveries in an existing project compare the test files with the start snapshot. Old state
// without a snapshot only gets a note; a new project gets nothing.
function deliverHostTests(state, root) {
  if (state.deliverable !== "ui") return {};
  if (state.hostTests) return liveHostTests(state, root);
  return inspectHost(root) ? { checked: false, reason: "this job started without a test snapshot (state from an older version), so test changes were not checked" } : {};
}

// Gates report back here so `next` knows a check passed without rerunning it.
function recordGate(root, gate, status) {
  const state = readState(root);
  if (!state) return;
  state.gates = { ...(state.gates || {}), [gate]: { status, at: Date.now() } };
  writeState(root, state);
}

module.exports = { DELIVERABLES, SCHEMA, STATE, TIERS, decide, initState, nextAction, readState, recordGate };
