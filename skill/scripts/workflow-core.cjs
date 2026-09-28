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
const SUB_WORKFLOWS = { film: require("./workflows/film.cjs"), edit: require("./workflows/edit.cjs"), web: require("./workflows/web.cjs") };

function codeStages(tier) {
  const work = { id: "work", finished: (state) => Boolean(state.decisions?.delivered), action: () => ({ type: "run", command: tier === "full" ? `Open an OpenSpec change under openspec/changes/<id>/ and follow references/pipeline-reference.md; when verified: ${CLI} decide --project-root . --stage deliver --answer <evidence>` : `Follow references/pipeline-reference.md at the ${tier} tier (no OpenSpec; create DESIGN.md/MOTION.md only at standard if missing), verify the rendered surface, then: ${CLI} decide --project-root . --stage deliver --answer <evidence>`, why: tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the gates." }) };
  return tier === "quick" ? [work] : [INTAKE, work];
}

function stagesFor(state) {
  const sub = SUB_WORKFLOWS[state.deliverable];
  if (sub) return sub.stages(state);
  return codeStages(state.tier);
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
  if (readState(root) && !options.replace) fail("workflow", "this project already has .design-pipeline/state.json. Fix: run next, or pass --replace to start over", { code: "OUTPUT_EXISTS" });
  assertEnum(options.deliverable, DELIVERABLES, "deliverable", "workflow");
  const tier = options.tier || "standard";
  assertEnum(tier, TIERS, "tier", "workflow");
  const mode = options.mode || "brief";
  assertEnum(mode, MODES, "mode", "workflow");
  const state = { schema: SCHEMA, deliverable: options.deliverable, tier, mode, director: options.director || null, decisions: {}, gates: {}, rules: [], createdAt: new Date().toISOString() };
  writeState(root, state);
  return state;
}

function nextAction(root) {
  const state = readState(root);
  if (!state) {
    return { type: "ask", stage: "start", question: "What are we making, and how big is it?", recommended: "film/standard for a promo or explainer; edit/standard for PV or MAD; quick for a single motion, shot or component; full only for large shared work.", record: `${CLI} next --project-root . --deliverable film|edit|web|ui --tier quick|standard|full [--mode brief|replicate|freeform]`, line: "No project state yet: choose the deliverable and tier." };
  }
  const stages = stagesFor(state);
  const done = [];
  for (const stage of stages) {
    if (stage.finished(state, root)) { done.push(stage.id); continue; }
    const action = stage.action(state, root);
    const directed = state.director && action.type === "ask" && ["concepts", "review"].includes(stage.id) ? { director: `Switch to ${state.director} for this step (art director mode).` } : {};
    const rules = state.rules.length ? { rules: state.rules.map((rule) => rule.text) } : {};
    const guide = SUB_WORKFLOWS[state.deliverable] ? { guide: `references/workflow-${state.deliverable}.md#${stage.id}` } : {};
    return { ...action, ...guide, ...directed, ...rules, stage: stage.id, deliverable: state.deliverable, tier: state.tier, completed: done, remaining: stages.length - done.length, line: `${state.deliverable}/${state.tier}: ${stage.id} (${done.length + 1}/${stages.length}) - ${action.type === "ask" ? action.question : action.command}` };
  }
  return { type: "done", stage: "done", deliverable: state.deliverable, tier: state.tier, completed: done, evidence: { delivered: state.decisions.delivered || null, gates: state.gates, drafts: state.decisions.drafts || [] }, line: `${state.deliverable}/${state.tier}: done` };
}

function decide(root, options = {}) {
  const state = readState(root);
  if (!state) fail("workflow", "no project state. Fix: run next with --deliverable and --tier first", { code: "INPUT_MISSING" });
  const stage = options.stage;
  assertEnum(stage, ["intake", "reference", "concept", "review", "deliver"], "stage", "workflow");
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
  } else if (stage === "deliver") {
    state.decisions.delivered = options.answer || true;
  }
  writeState(root, state);
  return { status: "recorded", stage, next: nextAction(root) };
}

// Gates report back here so `next` knows a check passed without rerunning it.
function recordGate(root, gate, status) {
  const state = readState(root);
  if (!state) return;
  state.gates = { ...(state.gates || {}), [gate]: { status, at: Date.now() } };
  writeState(root, state);
}

module.exports = { DELIVERABLES, SCHEMA, STATE, TIERS, decide, initState, nextAction, readState, recordGate };
