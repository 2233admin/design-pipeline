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

const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const newestRender = (root) => ["out.mp4", path.join("renders", "edit.mp4")].find((rel) => exists(root, rel)) || (exists(root, "renders") ? (fs.readdirSync(path.join(root, "renders")).find((name) => name.endsWith(".mp4")) ? "renders" : null) : null);
const gatePassed = (state, gate) => Boolean(state.gates && state.gates[gate] && state.gates[gate].status === "passed" && state.gates[gate].at >= (state.gates[gate].inputsAt || 0));

// Each stage: id, finished(state, root) -> boolean, action(state, root) -> action object.
const INTAKE = {
  id: "intake",
  finished: (state, root) => exists(root, "brief.md"),
  action: () => ({
    type: "ask",
    question: "Answer in one reply; \"default\" accepts every recommendation.",
    questions: [
      { id: "product", ask: "What is the product and the one thing the viewer should understand?", recommended: "Take it from the conversation so far." },
      { id: "audience", ask: "Who watches it and where (site hero, social, launch event)?", recommended: "Product website hero, general audience." },
      { id: "duration", ask: "How long?", recommended: "15-30 s for a promo, 30-60 s for an edit." },
      { id: "assets", ask: "Which footage, screenshots, models, logos or music can be used, and are they licensed for this use?", recommended: "Only material you own; missing pieces are generated." },
    ],
    record: `${CLI} decide --project-root . --stage intake --answer "<the user's reply>"`,
    why: "Only facts that change the result are asked; style comes from references and judgment.",
  }),
};
const REFERENCE = {
  id: "reference",
  finished: (state, root) => exists(root, "reference.md") || state.decisions?.reference === "none",
  action: () => ({ type: "run", command: "Study 1-3 moving references and write reference.md (observed timings, cuts, rests, sound; what to transfer). See references/product-film-direction.md section 1.", why: "Direction comes from watched references, not from a familiar template.", then: `Or, if the user gave no references and wants none: ${CLI} decide --project-root . --stage reference --answer none` }),
};
const CONCEPTS = {
  id: "concepts",
  finished: (state) => Boolean(state.decisions?.concept),
  action: (state, root) => (exists(root, "concepts.md")
    ? { type: "ask", question: "Which concept should we make?", options: "the three cards in concepts.md", recommended: "Recommend the concept whose carrier best demonstrates the product action.", record: `${CLI} decide --project-root . --stage concept --choice <1|2|3> [--answer "<changes>"]`, why: "The first of two human decisions." }
    : { type: "run", command: "Write concepts.md: three cards whose central ideas differ. Each card: central idea, what carries attention between beats, look, tools (one line), and any missing license. Render one key frame per card.", why: "Divergence before convergence; the user picks one." }),
};
const REVIEW = {
  id: "review",
  finished: (state) => (state.decisions?.drafts || []).some((draft) => draft.verdict === "accept"),
  action: (state) => ({ type: "ask", question: "Accept this draft, or reject it with one sentence on what is wrong?", show: ["the draft video", "evidence/contact-sheet.png", "the gate summary"], recommended: "Accept if nothing reads wrong at full speed.", record: `${CLI} decide --project-root . --stage review --verdict accept|reject [--answer "<reason>"]`, why: `The second human decision${(state.decisions?.drafts || []).length ? `; ${(state.decisions.drafts).length} earlier draft(s) were rejected and their reasons are project rules` : ""}.` }),
};

function filmStages(tier) {
  const plan = { id: "plan", finished: (state, root) => exists(root, "storyboard.json") && gatePassed(state, "storyboard"), action: (state, root) => (exists(root, "storyboard.json") ? { type: "run", command: `${CLI} verify film-storyboard --storyboard storyboard.json`, why: "The storyboard gate must pass before building.", record: "fix each finding, then run next again" } : { type: "run", command: `${CLI} film scaffold --output .`, why: "Start from a passing storyboard and a composition with one call per beat." }) };
  const build = { id: "build", finished: (state, root) => Boolean(newestRender(root)), action: () => ({ type: "run", command: "Build index.html from the storyboard beats (film-choreography patterns, HyperFrames blocks via film blocks, Blender shots via film blender, score via film score), then: npx hyperframes render --output out.mp4", why: "Pick the lowest-rung tool that reaches each beat." }) };
  const check = { id: "check", finished: (state) => gatePassed(state, "film"), action: () => ({ type: "run", command: `${CLI} film check --project-root .`, why: "Every error gate must pass before anyone sees the draft; apply each finding's fix and rerun." }) };
  const deliver = { id: "deliver", finished: (state) => Boolean(state.decisions?.delivered), action: () => ({ type: "run", command: `Render the final quality (npx hyperframes render --quality high --output final.mp4), then: ${CLI} decide --project-root . --stage deliver --answer final.mp4`, why: "Drafts are cheap; the final render happens once, after acceptance." }) };
  if (tier === "quick") return [plan, build, check];
  return [INTAKE, REFERENCE, CONCEPTS, plan, build, check, REVIEW, deliver];
}

function editStages(tier) {
  const analyze = { id: "analyze", finished: (state, root) => exists(root, path.join("edit", "analysis.json")), action: (state, root) => (exists(root, "sources") ? { type: "run", command: `${CLI} film-edit analyze --project-root . --audio <music file>`, why: "Beat grid and footage shots first; record footage licenses in sources/licenses.json." } : { type: "run", command: "Put the footage in sources/ and the music in assets/, with sources/licenses.json", why: "An edit starts from real footage and music." }) };
  const style = { id: "style", finished: (state) => tier === "quick" || Boolean(state.decisions?.concept), action: () => ({ type: "ask", question: "MAD (fast, energy-driven cuts) or PV (readable shots on phrases)?", recommended: "mad for fan edits and hype, pv for product and music videos.", record: `${CLI} decide --project-root . --stage concept --choice mad|pv`, why: "The first of two human decisions for an edit." }) };
  const cut = { id: "cut", finished: (state, root) => exists(root, "edit.json"), action: (state) => ({ type: "run", command: `${CLI} film-edit auto --project-root . --style ${state.decisions?.concept || "mad"}`, why: "Shots placed on the beat grid; adjust edit.json by hand afterwards." }) };
  const render = { id: "render", finished: (state, root) => exists(root, path.join("renders", "edit.mp4")), action: () => ({ type: "run", command: `${CLI} film-edit render --project-root .`, why: "Assemble the draft." }) };
  const check = { id: "check", finished: (state) => gatePassed(state, "edit"), action: () => ({ type: "run", command: `${CLI} film-edit check --project-root .`, why: "Every error gate must pass before anyone sees the draft." }) };
  const deliver = { id: "deliver", finished: (state) => Boolean(state.decisions?.delivered), action: () => ({ type: "run", command: `${CLI} decide --project-root . --stage deliver --answer renders/edit.mp4`, why: "Record the delivered file." }) };
  if (tier === "quick") return [analyze, cut, render, check];
  return [INTAKE, analyze, style, cut, render, check, REVIEW, deliver];
}

function codeStages(deliverable, tier) {
  const guide = deliverable === "web" ? "references/pipeline-reference.md (motion and web sections)" : "references/pipeline-reference.md";
  const work = { id: "work", finished: (state) => Boolean(state.decisions?.delivered), action: () => ({ type: "run", command: tier === "full" ? `Open an OpenSpec change under openspec/changes/<id>/ and follow ${guide}; when verified: ${CLI} decide --project-root . --stage deliver --answer <evidence>` : `Follow ${guide} at the ${tier} tier (no OpenSpec; create DESIGN.md/MOTION.md only at standard if missing), verify the rendered surface, then: ${CLI} decide --project-root . --stage deliver --answer <evidence>`, why: tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the gates." }) };
  return tier === "quick" ? [work] : [INTAKE, work];
}

function stagesFor(state) {
  if (state.deliverable === "film") return filmStages(state.tier);
  if (state.deliverable === "edit") return editStages(state.tier);
  return codeStages(state.deliverable, state.tier);
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
    return { ...action, ...directed, ...rules, stage: stage.id, deliverable: state.deliverable, tier: state.tier, completed: done, remaining: stages.length - done.length, line: `${state.deliverable}/${state.tier}: ${stage.id} (${done.length + 1}/${stages.length}) - ${action.type === "ask" ? action.question : action.command}` };
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
    state.decisions.reference = options.answer || "none";
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
      state.gates = Object.fromEntries(Object.entries(state.gates || {}).filter(([gate]) => !["film", "edit"].includes(gate)));
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
