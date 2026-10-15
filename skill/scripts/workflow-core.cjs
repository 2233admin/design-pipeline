"use strict";

// The user workflow: one project state file and one next step at a time.
// `next` reads .design-pipeline/state.json, walks the stages of the project's deliverable and tier,
// and returns the first unfinished stage as exactly one action:
//   run  - a command for the agent, with the reason
//   ask  - one decision for the user, with a recommended answer (concept pick, draft verdict)
//   blocked - nothing can go on until a recorded blocker is resolved (a product that cannot be sourced)
//   done - the deliverable is finished, with its evidence
// Stages are finished by artifacts on disk or decisions in the state, so `next` never repeats work.
// A film may bind its Stage 0 job plan (state.jobPlan); `next` re-verifies the bound plan every time.

const fs = require("node:fs");
const path = require("node:path");
const { assertEnum, canonicalJson, fail, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");
const { validatePlan } = require("./plan-core.cjs");
const { createArtifactMetadata, validateArtifactMetadata } = require("./artifact-core.cjs");
const { captureGitSnapshot, inspectGitChanges, samePath } = require("./execution-target-core.cjs");
const { RESULT_SCHEMA, validateProbeFile, journeyResultFailure, auditResultFailure } = require("./interaction-core.cjs");
const { advanceChange } = require("./pipeline-state-core.cjs");
const { readState: readNativeState } = require("./control-runtime-core.cjs");
const { downstreamPhases, invalidateDownstream } = require("./invalidation-core.cjs");
const { resolveVideoObservation } = require("./reference-video-core.cjs");
const { bindJobPlan, validateJobPlan } = require("./job-route-core.cjs");

const SCHEMA = "design-pipeline.workflow-state.v1";
const STATE = path.join(".design-pipeline", "state.json");
const DELIVERABLES = ["film", "edit", "web", "ui"];
const TIERS = ["quick", "standard", "full"];
const MODES = ["brief", "replicate", "freeform"];

// Sub-workflows by deliverable (Q5, Q7): film, edit and web have their own stage modules and
// guides.
const { cliCommand, shellPath, INTAKE, REVIEW, componentDecisionDigest, deliveryRecorded, gateStatus, invalidateCheckedEvidence, reason, reference, reviewInputHashes, statement } = require("./workflows/shared.cjs");
const roles = require("./workflows/roles.cjs");
const rules = require("./workflows/rules.cjs");
const away = require("./workflows/away.cjs");
const SUB_WORKFLOWS = { film: require("./workflows/film.cjs"), edit: require("./workflows/edit.cjs"), web: require("./workflows/web.cjs") };
const REFERENCE = reference("Inspect the supplied reference and its timed frames; write reference.md with reference regions, observable structure and motion, invariants and uncertainties using references/reference-spec.md. Follow references/reconstruction-spec.md and applicable references/3d-spec.md; the next work starts a bounded graybox. reference.md marks document delivery, not verified observation; do not require aggregate reference readiness before the graybox exists.");

function codeStages(state) {
  const { tier, mode } = state;
  const work = {
    id: "work",
    finished: (state) => Boolean(state.decisions?.delivered),
    action: (_state, root) => ({
      type: "run",
      instruction: `${tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/ and follow references/pipeline-reference.md" : `Follow references/pipeline-reference.md at the ${tier} tier (no OpenSpec; create DESIGN.md/MOTION.md only at standard if missing)`}${mode === "replicate" ? "; reproduce the reference and its invariants" : ""}. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. Verify the rendered surface; file delivery and engineering checks do not grant visual acceptance. When verified, run the command to record the delivery (replace <evidence>).`,
      command: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage deliver --answer <evidence>`,
      ...(mode === "replicate" ? { guide: "references/pipeline-reference.md" } : {}),
      why: tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the gates.",
    }),
  };
  // Every tier ends with the owner's acceptance of the delivered work: visual quality is not
  // something a passing check can accept on the owner's behalf.
  return [...(tier === "quick" ? [] : [INTAKE]), ...(mode === "replicate" ? [REFERENCE] : []), work, REVIEW];
}

function stagesFor(state) {
  const sub = SUB_WORKFLOWS[state.deliverable];
  if (sub) return sub.stages(state);
  return codeStages(state);
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

// Stage 0 binding: the four fields a toolchain request carries. A film binds the job plan it was
// routed under; every later call re-verifies it, and a plan is never rewritten here.
const JOB_PLAN = "job-plan.json";
const reasonOf = error => String(error?.message ?? error).replace(/^[\w .-]+: /, "").replace(/\.$/, "");
const replanFix = (root, where) => `re-plan from the original brief with \`${cliCommand()} route --root ${shellPath(path.resolve(root))} --query "<brief>" --write --output ${shellPath(where)}\``;
const planBinding = (plan, where) => ({ jobId: plan.jobId, jobPlanSha256: plan.planSha256, jobPlanPath: where, deliverableForm: plan.deliverableForm });
const readPlan = (root, rel) => readJson(resolveInside(root, rel, "Stage 0 job plan", { scope: "workflow", mustExist: true }), "job plan");

function staleJobPlan(root, where, error) {
  fail("workflow", `the bound Stage 0 job plan ${where} is stale: ${reasonOf(error)}. Fix: ${replanFix(root, where)}, then rebind with \`${cliCommand()} next --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --job-plan ${shellPath(where)}\``, { code: "JOB_PLAN_STALE" });
}

// A plan to bind now: contained, valid, and recorded by its project-relative posix path.
function newJobPlan(root, file) {
  const target = resolveInside(root, file, "Stage 0 job plan", { scope: "workflow", mustExist: true });
  const where = path.relative(root, target).split(path.sep).join("/");
  try { return planBinding(validateJobPlan(readJson(target, "job plan")), where); }
  catch (error) { fail("workflow", `the Stage 0 job plan ${where} is invalid: ${reasonOf(error)}. Fix: ${replanFix(root, where)}, then rerun \`${cliCommand()} next --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --job-plan ${shellPath(where)}\``); }
}

// The film's binding re-verified against the bound file (missing, edited, replaced, or its query now
// classified as another form: stale), or null when the project has none.
function stateJobPlan(root, state) {
  const binding = state.jobPlan;
  if (!binding) return null;
  try { return planBinding(bindJobPlan(binding, readPlan(root, binding.jobPlanPath)), binding.jobPlanPath); }
  catch (error) { staleJobPlan(root, typeof binding.jobPlanPath === "string" && binding.jobPlanPath ? binding.jobPlanPath : JOB_PLAN, error); }
}

function discoveredJobPlan(root) {
  if (!fs.existsSync(path.join(root, JOB_PLAN))) return null;
  try { return planBinding(validateJobPlan(readPlan(root, JOB_PLAN)), JOB_PLAN); }
  catch (error) { staleJobPlan(root, JOB_PLAN, error); }
}

// The project's Stage 0 binding: the state's (or null), else a job-plan.json a film would bind.
function projectJobPlan(root) {
  const state = readState(root);
  return state ? stateJobPlan(root, state) : discoveredJobPlan(root);
}

// Binds or rebinds an existing film (next --job-plan without --deliverable). Checks recorded earlier
// reopen through their unbound or changed job-plan input.
function bindStateJobPlan(root, file) {
  const state = readState(root);
  if (!state) fail("workflow", "no project state to bind. Fix: start the film with next --deliverable film --tier quick|standard|full --job-plan <file>", { code: "INPUT_MISSING" });
  if (state.deliverable !== "film") fail("workflow", `a Stage 0 job plan binds a film, not a ${state.deliverable} project. Fix: drop --job-plan`);
  state.jobPlan = newJobPlan(root, file);
  writeState(root, state);
  return { ...state.jobPlan };
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
  // A film binds its Stage 0 plan: the named file, else a job-plan.json at the project root.
  const named = options.jobPlan !== undefined && options.jobPlan !== null;
  if (named && options.deliverable !== "film") fail("workflow", `a Stage 0 job plan binds a film, not a ${options.deliverable} project. Fix: drop --job-plan, or start a film with --deliverable film`);
  let jobPlan = null;
  if (named) jobPlan = newJobPlan(root, options.jobPlan);
  else if (options.deliverable === "film" && fs.existsSync(path.join(root, JOB_PLAN))) jobPlan = newJobPlan(root, JOB_PLAN);
  const state = { schema: SCHEMA, deliverable: options.deliverable, tier, mode, director: options.director || null, assistedBy: options.assistedBy || null, ...(jobPlan ? { jobPlan } : {}), decisions: {}, gates: {}, rules: [], createdAt: new Date().toISOString() };
  state.delegation = roles.defaultDelegation(state, stagesFor(state).map(stage => stage.id));
  writeState(root, state);
  return state;
}

// One line per action: the question (after any first step), the blocker, or the instruction and its command.
function actionLine(action) {
  if (action.type === "ask") return `${action.first ? `${action.first} ` : ""}${action.question}`;
  if (action.type === "blocked") return `blocked (${action.blocker.kind}): ${action.blocker.reason} Needs: ${action.blocker.needs}`;
  return action.instruction && action.command ? `${action.instruction} Command: ${action.command}` : action.instruction || action.command;
}

// What an owner ask is about, so a deferral wakes when it changes: the files the ask shows, the built
// page at a web section or final review, the checked inputs at a final review, and the cut sample.
function askSubject(state, root, stageId, action) {
  const files = [].concat(action.show ?? []).map(file => [path.relative(root, file).split(path.sep).join("/"), fs.existsSync(file) && fs.statSync(file).isFile() ? "sha256:" + sha256(fs.readFileSync(file)) : null]);
  return {
    files,
    page: state.deliverable === "web" && (stageId === "review" || stageId === "build" && action.section) ? SUB_WORKFLOWS.web.pageDigest(root) : null,
    review: stageId === "review" ? reviewInputHashes(state) : null,
    sample: stageId === "sample" && SUB_WORKFLOWS.film.sampleBinding ? SUB_WORKFLOWS.film.sampleBinding(root) : null,
  };
}

// `deferral: false` returns the owner ask a deferral holds back (decide --later re-defers it).
function nextAction(root, { deferral = true } = {}) {
  const state = readState(root);
  if (!state) {
    return { type: "ask", stage: "start", language: LANGUAGE, question: "What are we making, and how big is it?", recommended: "film/standard for a promo or explainer; edit/standard for PV or MAD; quick for a single motion, shot or component; full only for large shared work.", record: `${cliCommand()} next --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --deliverable film|edit|web|ui --tier quick|standard|full [--mode brief|replicate|freeform] [--job-plan job-plan.json]`, line: "No project state yet: choose the deliverable and tier." };
  }
  stateJobPlan(root, state);
  const stages = stagesFor(state);
  roles.ensureDelegation(state, stages.map(stage => stage.id)); // In memory only: next never writes state.
  const done = [];
  for (const stage of stages) {
    const verification = stage.gate ? gateStatus(state, root, stage.gate.name, stage.gate.inputs(state, root)) : null;
    if ((!stage.finished || stage.finished(state, root)) && (!verification || verification.status === "passed")) { done.push(stage.id); continue; }
    const action = ownerFacing(withRoles(stage.action(state, root), state), state, stage.id);
    // The owner's ask, unless an art director takes it (owner-attention-away): its identity is read before
    // the numbered page is captured, so a deferred next launches no browser.
    const directedAsk = action.type === "ask" && (action.director || state.director && ["concepts", "sample", "build"].includes(stage.id));
    const key = action.type === "ask" && !directedAsk ? away.askKey(stage.id, action, askSubject(state, root, stage.id, action)) : null;
    const position = { stage: stage.id, deliverable: state.deliverable, tier: state.tier, completed: done, remaining: stages.length - done.length };
    if (key && deferral && away.holds(state, key)) {
      const held = away.deferredAction(state, action);
      return { ...held, ...position, line: `${state.deliverable}/${state.tier}: ${stage.id} (${done.length + 1}/${stages.length}) - ${actionLine(held)}` };
    }
    // A web review that still faces the owner offers the numbered page (owner-attention-page-refs);
    // a delegated self-check is a run by now, so it launches no browser for no one.
    if (state.deliverable === "web" && action.type === "ask" && (stage.id === "review" || stage.id === "build" && action.section)) {
      const refs = SUB_WORKFLOWS.web.refsStep(root, action.director || state.director && stage.id === "build" ? "the art director" : "the owner");
      // A repeated ask shows the screenshots last judged at this scope beside the new ones.
      const compare = SUB_WORKFLOWS.web.compareStep(state, root, stage.id === "review" ? "review" : action.section);
      action.first = [action.first, refs.first, compare.first].filter(Boolean).join(" ");
      action.show = [...(action.show || []), ...refs.show, ...compare.show];
      if (compare.pageChanges && !action.pageChanges) action.pageChanges = compare.pageChanges;
    }
    // Visual picks go to the art director: the concept pick, a sample, a built web section. Final
    // acceptance never does; it stays with the owner.
    const directed = state.director && action.type === "ask" && ["concepts", "sample", "build"].includes(stage.id) ? { director: `Switch to ${state.director} for this step (art director mode).` } : {};
    if (stage.id === "intake" && action.type === "ask") action.delegation = delegationHint(state);
    const active = rules.activeRules(state);
    const ruleTexts = active.length ? { rules: active } : {};
    // The final review offers once to keep, for the rest of the project, rules given about one object.
    const offered = stage.id === "review" && action.type === "ask" ? rules.candidates(state) : [];
    if (offered.length) {
      action.ruleCandidates = offered;
      action.instruction = `${action.instruction ? `${action.instruction} ` : ""}Before or with this review, ask the owner once whether to keep, for the rest of the project, any of the ruleCandidates given about more than one thing or phrased as a principle; add --promote "<from>" to their review record for each one they keep, and nothing for the rest.`;
    }
    // An owner ask tells the owner first what happened since their last recorded answer.
    const caughtUp = key ? away.catchUp(state, action.question) : null;
    if (caughtUp) {
      action.away = caughtUp;
      action.first = [away.catchUpLine(caughtUp), action.first].filter(Boolean).join(" ");
    }
    const guide = SUB_WORKFLOWS[state.deliverable] ? { guide: `references/workflow-${state.deliverable}.md#${stage.id}` } : {};
    const result = { ...action, ...guide, ...directed, ...ruleTexts, ...(verification ? { verification } : {}), stage: stage.id, deliverable: state.deliverable, tier: state.tier, completed: done, remaining: stages.length - done.length, line: `${state.deliverable}/${state.tier}: ${stage.id} (${done.length + 1}/${stages.length}) - ${actionLine(action)}` };
    // Not printed: what decide --later records as the ask it defers.
    if (key) Object.defineProperty(result, "askKey", { value: key, enumerable: false });
    return result;
  }
  return { type: "done", stage: "done", deliverable: state.deliverable, tier: state.tier, completed: done, ...SUB_WORKFLOWS[state.deliverable]?.doneFields?.(state, root), evidence: { delivered: state.decisions.delivered || null, gates: state.gates, drafts: state.decisions.drafts || [] }, diligence: roles.statementStatus(root, state, deliveryCurrent(state, root)), line: `${state.deliverable}/${state.tier}: done` };
}

// A delivery recorded for a deliverable with a deliver stage must still match what was reviewed; ui
// records its delivery evidence in its work stage, and its review binds that evidence.
const deliveryCurrent = (state, root) => state.deliverable === "ui" ? Boolean(state.decisions?.delivered) : deliveryRecorded(state, root);

// Returned decide commands carry the role the delegation map gives their checkpoint: agent where the
// agent (or the art director) decides, owner otherwise. Only a command whose checkpoint has no entry
// falls back to the action type: an ask records the owner's words, a run the agent's decision.
function withRoles(action, state) {
  const out = { ...action };
  for (const key of ["record", "correction", "skip", "command", "then"]) {
    if (typeof out[key] !== "string" || !/ decide --root /.test(out[key]) || /--by /.test(out[key])) continue;
    const checkpoint = /--stage (\S+)/.exec(out[key])?.[1];
    const entry = state.delegation?.[checkpoint];
    const role = entry ? (entry.to === "agent" ? "agent" : "owner") : action.type === "ask" ? "owner" : "agent";
    out[key] = out[key].replace(/ --stage /, ` --by ${role} --stage `);
  }
  return out;
}

const LANGUAGE = "Speak to the owner in the project's language: the brief's, else the one the owner writes in. Translate the wording here; keep commands, ids and file names unchanged.";
const TRADEOFF = "Ask the owner only when this carries a trade-off they have not settled: something that changes cost, content or behaviour";
const SOURCE_TRADEOFF = "; for component sources, only a new dependency, a license obligation or a notable cost";
const ASK_SHAPE = ". Then ask in one message: what is new, your recommendation and its cost, and how they can see the difference. Record their answer with --by owner and --tradeoff \"<what you asked>\": the command with --by owner in place of --by agent when they take your recommendation, the correction when they say no. Their \"no\" becomes a rule; never record one yourself.";

// Who the step faces (OpenSpec change owner-attention-asks). A web review checkpoint the delegation map
// gives to the agent, and not to an art director, becomes a self-check run: the agent checks the work
// against what the owner already settled and records it, asking the owner only about a new trade-off.
// Every other ask stays an ask; each ask and self-check carries the language line.
function ownerFacing(action, state, stageId) {
  const { selfCheck: check, accept, ...rest } = action;
  if (rest.type !== "ask") return rest;
  const checkpoint = roles.checkpointOf(state, stageId);
  const entry = state.delegation?.[checkpoint];
  const delegated = state.deliverable === "web" && roles.SELF_CHECKED.has(checkpoint) && entry?.to === "agent"
    && !(state.director && roles.DIRECTED.has(checkpoint));
  if (!delegated) return { ...rest, language: LANGUAGE };
  if (!check) throw new Error(`${stageId} has no self-check text for its delegated ${checkpoint} checkpoint`);
  const { question: _question, record, correction, skip: _skip, first, instruction: _ask, ...kept } = rest;
  const command = withRoles({ type: "run", command: accept || record }, state).command;
  // withRoles stamped the correction for the agent; a "no" is always the owner's words.
  const owner = correction ? correction.replace(/ --by agent /, " --by owner ") : undefined;
  const before = first ? `${first.replace(/^Before asking, /, "").replace(/,? then ask:$/, ".")} ` : "";
  return {
    ...kept,
    type: "run",
    selfCheck: true,
    checkpoint,
    check,
    instruction: `${before}${check} ${TRADEOFF}${checkpoint === "components" ? SOURCE_TRADEOFF : ""}${ASK_SHAPE}`,
    command,
    ...(owner ? { correction: owner } : {}),
    language: LANGUAGE,
  };
}

// What the intake playback tells the owner: which checkpoints the agent decides and which are theirs.
function delegationHint(state) {
  const entries = Object.entries(state.delegation || {});
  return {
    agent: entries.filter(([, entry]) => entry.to === "agent").map(([checkpoint]) => checkpoint),
    owner: entries.filter(([, entry]) => entry.to === "owner").map(([checkpoint]) => checkpoint),
    locked: entries.filter(([, entry]) => entry.locked).map(([checkpoint]) => checkpoint),
    instruction: `In the playback, tell the owner in one line what you will decide and what stays theirs.${state.delegation?.section ? " Offer once that they can review each section with you (--keep section)." : ""} Record their changes on the intake record with --delegate <checkpoint> (hand it to you) or --keep <checkpoint> (keep it theirs), each repeatable. Final acceptance and creative intent always stay with the owner.`,
  };
}

// `decide --later [--until <time>]` (owner-attention-away): the owner will answer the current owner ask
// later. Records state.pending only; `next` reads it and ignores it once it no longer holds.
function deferAsk(root, { until } = {}) {
  const state = readState(root);
  if (!state) fail("workflow", "no project state. Fix: run next with --deliverable and --tier first", { code: "INPUT_MISSING" });
  let time = null;
  if (until !== undefined && until !== null) {
    // A full date and time with its offset: a bare 09:00 would mean the host's zone, not the owner's.
    const text = String(until).trim();
    const parsed = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(text) ? Date.parse(text) : NaN;
    if (!Number.isFinite(parsed) || parsed <= Date.now()) fail("workflow", "--until must be a time in the future with its offset, such as 2026-10-16T09:00:00+08:00 (the owner's time zone). Fix: give the time the owner named, or drop --until");
    time = new Date(parsed).toISOString();
  }
  const ask = nextAction(root, { deferral: false });
  if (!ask.askKey) fail("workflow", `--later defers a question the owner is asked, and next is ${ask.type === "ask" ? "an art director's pick" : `a ${ask.type}`} at ${ask.stage}. Fix: follow next`, { code: "WORKFLOW_NOT_READY" });
  state.pending = { ask: { stage: ask.askKey.stage, section: ask.askKey.section }, basis: ask.askKey.basis, until: time, roles: (state.decisions?.roles || []).length, at: new Date().toISOString() };
  writeState(root, state);
  return { status: "deferred", stage: ask.stage, ...(ask.section ? { section: ask.section } : {}), until: time, next: nextAction(root) };
}

// Inside decide the owner may be answering a deferred ask: the ask is checked as next would ask it.
const ANSWERING = { deferral: false };

function decide(root, options = {}) {
  const state = readState(root);
  if (!state) fail("workflow", "no project state. Fix: run next with --deliverable and --tier first", { code: "INPUT_MISSING" });
  stateJobPlan(root, state); // A stale Stage 0 binding records nothing.
  const stage = options.stage;
  assertEnum(stage, ["intake", "reference", "concept", "components", "description", "section", "sample", "review", "deliver"], "stage", "workflow");
  state.decisions = state.decisions || {};
  // Filled in memory; the map is saved with the decision, so a refused call changes nothing.
  roles.ensureDelegation(state, stagesFor(state).map(item => item.id));
  const delegate = [].concat(options.delegate ?? []), keep = [].concat(options.keep ?? []);
  if ((delegate.length || keep.length) && stage !== "intake") fail("workflow", "--delegate and --keep go on the intake record, where the owner hears what the agent will decide. Fix: follow next.");
  // --revision and --affects belong to a re-approval of the description (change tiers).
  if ((options.revision !== undefined && options.revision !== null || options.affects !== undefined && options.affects !== null) && (stage !== "description" || options.verdict !== "accept")) fail("workflow", "--revision and --affects go only with a re-approval (--verdict accept) of the web description. Fix: drop them");
  // --ref names the page elements an owner's "no" is about (owner-attention-page-refs).
  const cites = [].concat(options.ref ?? []);
  if (cites.length) {
    if (state.deliverable !== "web" || !["section", "review"].includes(stage)) fail("workflow", "--ref goes only with a web section review or the web final review. Fix: drop --ref");
    if (options.verdict !== "reject") fail("workflow", "--ref names the elements the owner's \"no\" is about, so it goes only with --verdict reject. Fix: drop --ref");
    if (!(typeof options.answer === "string" && options.answer.trim())) fail("workflow", "--ref goes with --answer: the owner's words about the elements they cite");
  }
  const carryForward = stage === "description" && options.verdict === "accept" && options.revision === "bytes";
  const role = roles.recordRole(state, stage, options.by, { carryForward });
  if (role.carriedForward) options = { ...options, carriedForward: true };
  // A trade-off ask is the owner's answer to a question the agent put to them during a self-check.
  if (options.tradeoff !== undefined && options.tradeoff !== null) {
    if (role.by !== "owner") fail("workflow", "--tradeoff records the owner's answer to a trade-off you asked them about, so it goes only with --by owner. Fix: ask the owner, then record their answer with --by owner --tradeoff \"<what you asked>\"");
    options = { ...options, tradeoff: statement(options.tradeoff, "say what you asked the owner: what is new, your recommendation and its cost", "--tradeoff") };
  }
  const scope = rules.checkScope(options.scope, options.verdict);
  // Only these records can hold the owner's "no"; refuse a scope elsewhere before any file is written.
  if (scope && (["reference", "deliver"].includes(stage) || (stage === "intake" && state.deliverable !== "web"))) fail("workflow", `--scope goes with a record that holds the owner's "no", and a ${stage} record holds none. Fix: drop --scope`);
  const promoted = rules.checkPromote(state, options.promote, stage, role.by);
  const rulesBefore = (state.rules || []).length;
  // A "no" is the owner's words; only an art director's pick may reject on the agent's side.
  if (role.by === "agent" && options.verdict === "reject" && !(state.director && roles.DIRECTED.has(stage))) {
    fail("workflow", "an agent cannot record a \"no\": it is the owner's words and becomes a rule. Fix: when your check finds a fault, fix the work and record the decision; record a \"no\" only with the owner's words and --by owner");
  }
  // Only the owner changes who decides what; an agent cannot hand itself checkpoints.
  if ((delegate.length || keep.length) && role.by !== "owner") fail("workflow", "--delegate and --keep record the owner's choice, so they go only on an intake recorded with --by owner. Fix: ask the owner, then record their reply with --by owner");
  if (delegate.length || keep.length) roles.applyDelegation(state, delegate, keep);
  const before = roles.historySizes(state);
  // Web records its conversation, variants, decision round, description and sections itself (workflows/web.cjs).
  const webRecord = state.deliverable === "web" ? SUB_WORKFLOWS.web.decisions[stage] : null;
  if (!webRecord && ["components", "description", "section"].includes(stage)) fail("workflow", `--stage ${stage} applies only to web workflows; this project is a ${state.deliverable} workflow. Fix: follow next.`);
  // Anti-goals go with a web intake's confirmed playback or skip; elsewhere they would be dropped.
  if ([].concat(options.antiGoals ?? []).length && !(webRecord && stage === "intake")) fail("workflow", "--anti-goal applies only to a web intake playback or skip. Fix: follow next.");
  if (webRecord) {
    webRecord(state, root, options, () => nextAction(root, ANSWERING));
  } else if (stage === "intake") {
    if (!options.answer) fail("workflow", "--answer is required: the user's reply to the intake questions");
    const collisions = fs.readdirSync(root).filter(name => name.toLowerCase() === "brief.md");
    const file = path.join(root, collisions[0] || "brief.md");
    // Only a byte-bound intake record owns this brief. Legacy decisions still complete intake,
    // but neither a decision alone nor matching answer text grants permission to overwrite.
    const existing = collisions.length === 1 ? fs.lstatSync(file) : null;
    const owned = existing?.isFile() && existing.nlink === 1
      && state.decisions.intake?.briefSha256 === "sha256:" + sha256(fs.readFileSync(file));
    if (collisions.length && !owned) fail("workflow", "brief.md collides (case-insensitively) with a file not written by this intake, or changed since intake wrote it. Fix: rename or move the existing brief outside this name, then record intake again; the existing file and state are unchanged.", { code: "OUTPUT_COLLISION" });
    const brief = `# Brief\n\n${options.answer}\n`;
    const temporary = path.join(root, `.brief-${require("node:crypto").randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temporary, brief, { flag: "wx" });
      fs.renameSync(temporary, file);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
    state.decisions.intake = { answer: options.answer, briefSha256: "sha256:" + sha256(brief) };
  } else if (stage === "reference") {
    const answer = options.answer || "none";
    if (answer === "none" && state.mode === "replicate") fail("workflow", "replicate mode cannot skip the reference. Fix: write reference.md from the reference you are reproducing");
    state.decisions.reference = answer;
  } else if (stage === "concept") {
    if (!options.choice) fail("workflow", "--choice is required: the concept number, or mad/pv for an edit");
    state.decisions.concept = String(options.choice);
    if (options.answer) state.decisions.conceptNotes = options.answer;
  } else if (stage === "sample") {
    assertEnum(options.verdict, ["accept", "reject"], "verdict", "workflow");
    if (options.verdict === "reject") reason(options.answer, "say in one sentence what is wrong with the sample; it becomes a rule");
    const next = nextAction(root, ANSWERING);
    if (next.stage !== "sample") fail("workflow", `Cannot record the sample verdict while ${next.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    // The verdict binds the sample bytes and the product record they were cut from.
    const binding = SUB_WORKFLOWS.film.sampleBinding(root);
    if (!binding) fail("workflow", "there is no sample.mp4 to judge. Fix: cut sample.mp4 at the project root from the admitted captures, then follow next", { code: "INPUT_MISSING" });
    if (next.type !== "ask") {
      const first = next.findings?.[0];
      fail("workflow", first ? `${first.message} Fix: ${first.fix}` : "the sample is not ready to be judged. Fix: follow next.", { code: first ? "SAMPLE_INVALID" : "WORKFLOW_NOT_READY" });
    }
    state.decisions.samples = [...(state.decisions.samples || []), { verdict: options.verdict, reason: options.answer || null, at: new Date().toISOString(), ...binding }];
    if (options.verdict === "reject") rules.addRule(state, options.answer, `sample ${state.decisions.samples.length}`, { stage: "sample" });
  } else if (stage === "review") {
    assertEnum(options.verdict, ["accept", "reject"], "verdict", "workflow");
    if (options.verdict === "reject") reason(options.answer, "say in one sentence what is wrong; it becomes a rule");
    // The owner's web acceptance is their own words from the conversation, never a bare record.
    if (state.deliverable === "web" && options.verdict === "accept" && role.by === "owner") {
      reason(options.answer, "quote the owner's words of acceptance from the conversation; record only words they gave");
      if (/<[^<>]*>/.test(options.answer)) fail("workflow", "--answer still holds the placeholder. Fix: replace it with the owner's own words from the conversation");
    }
    const next = nextAction(root, ANSWERING);
    const rejectCurrent = options.verdict === "reject" && ["deliver", "done"].includes(next.stage) && REVIEW.finished(state);
    if (!stagesFor(state).some(item => item.id === "review") || next.stage !== "review" && !rejectCurrent) {
      fail("workflow", `Cannot record review while ${next.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    }
    const cited = options.verdict === "reject" ? SUB_WORKFLOWS.web.citedRefs(root, cites) : [];
    const componentDecision = componentDecisionDigest(state);
    // The final review is the owner's: a web verdict keeps the numbered screenshots they judged.
    const captures = state.deliverable === "web" && role.by === "owner" ? SUB_WORKFLOWS.web.reviewedCaptures(root) : null;
    state.decisions.drafts = [...(state.decisions.drafts || []), { verdict: options.verdict, reason: options.answer || null, at: new Date().toISOString(), inputHashes: structuredClone(reviewInputHashes(state)), ...(componentDecision ? { componentDecision } : {}), ...(captures ? { captures } : {}) }];
    if (options.verdict === "reject") {
      rules.addRule(state, options.answer, `draft ${state.decisions.drafts.length}`, cited.length ? { ...rules.RESULT, refs: cited } : rules.RESULT);
      // A rejected draft must be rebuilt and rechecked.
      invalidateCheckedEvidence(state);
    }
  } else if (stage === "deliver") {
    const next = nextAction(root, ANSWERING);
    const allowed = state.deliverable === "ui" ? ["work", "review", "done"] : ["deliver", "done"];
    if (!allowed.includes(next.stage)) fail("workflow", `Cannot record delivery while ${next.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    // The owner reviews what ui delivery names, so it must name something.
    if (state.deliverable === "ui" && !(typeof options.answer === "string" && options.answer.trim())) fail("workflow", "ui delivery needs --answer naming the delivered interface and its evidence; the owner reviews what it names", { code: "INPUT_MISSING" });
    if (["film", "edit"].includes(state.deliverable)) {
      const file = resolveInside(root, options.answer, "delivery file (--answer)", { scope: "workflow", mustExist: true });
      if (!fs.statSync(file).isFile()) fail("workflow", "delivery output must be a file, not a directory");
      state.decisions.deliveredSha256 = "sha256:" + sha256(fs.readFileSync(file));
    }
    state.decisions.delivered = options.answer || true;
    if (state.deliverable !== "ui") state.decisions.deliveryInputHashes = structuredClone(reviewInputHashes(state));
  }
  // A skipped standard conversation hands intake to the agent: the owner chose not to be asked.
  if (stage === "intake" && state.decisions.intake?.skipped && state.delegation?.intake && state.tier !== "quick") state.delegation.intake = { ...state.delegation.intake, to: "agent", set: "owner" };
  // "From now on" makes this call's "no" a project rule; --scope on a record that made none is refused.
  if (scope && !(state.rules || []).slice(rulesBefore).some(rule => !rules.isProject(rule))) fail("workflow", `--scope ${scope} goes with a record that holds the owner's "no", and this record made no rule. Fix: drop --scope`);
  if (scope === "project") rules.widen(state, rulesBefore);
  rules.promote(state, promoted);
  roles.stampRecord(state, before, stage, role, options);
  // The screenshots a person's verdict names are copied only now, after every check, so a refused call
  // writes nothing (owner-attention-mobile-compare).
  if (state.deliverable === "web") {
    for (const key of ["sections", "drafts"]) {
      const list = state.decisions[key] || [];
      if (list.length > (before[key] ?? 0) && list.at(-1).captures) SUB_WORKFLOWS.web.storeReviewed(root, list.at(-1).captures);
    }
    // A verdict given on the review page keeps the block the owner submitted (owner-attention-page-review).
    if (options.pageReview) require("./workflows/page-review.cjs").keepPageReview(root, options.pageReview);
  }
  // The playback card the owner confirms carries the creative intent, so confirming it records that
  // locked checkpoint as the owner's; a stated skip leaves it unstated.
  // A card puts each intent line on its own line; a one-paragraph playback records no creative intent.
  const card = String(state.decisions.intake?.answer ?? "").split(/\r?\n/).filter(line => line.trim()).length >= 3;
  if (state.deliverable === "web" && stage === "intake" && options.verdict === "accept" && role.by === "owner" && state.delegation?.["creative-intent"] && card) roles.recordCreativeIntent(state, state.decisions.intake.answer);
  writeState(root, state);
  const next = nextAction(root);
  // Reaching done renders the diligence statement from the state just written.
  if (next.type === "done") {
    roles.writeStatement(root, readState(root), { delivered: state.decisions.delivered || null, deliveryCurrent: deliveryCurrent(state, root), gates: state.gates });
    return { status: "recorded", stage, next: nextAction(root) };
  }
  return { status: "recorded", stage, next };
}

// The diligence statement on demand: rendered from the current state, written only with write.
function diligence(root, options = {}) {
  const state = readState(root);
  if (!state) fail("workflow", "no project state. Fix: run next with --deliverable and --tier first", { code: "INPUT_MISSING" });
  roles.ensureDelegation(state, stagesFor(state).map(stage => stage.id));
  const context = { delivered: state.decisions?.delivered || null, deliveryCurrent: deliveryCurrent(state, root), gates: state.gates || {} };
  const text = roles.renderStatement(state, context);
  if (options.write) roles.writeStatement(root, state, context);
  return { path: roles.STATEMENT.split(path.sep).join("/"), written: Boolean(options.write), text };
}

// Gates report back here so `next` knows a check passed without rerunning it.
// ponytail: hashes cover declared primary files; add explicit asset dependencies when coverage requires them.
// `lineage` (the interaction gate) names what the checked page actually loaded and the project's
// design-token sources; a pass hashes those too and keeps the lineage for gateStatus.
function recordGate(root, gate, status, inputs = [], report = {}, lineage = null) {
  const state = readState(root);
  if (!state) return;
  const bound = lineage ? [...inputs, ...lineage.files, ...lineage.tokens] : inputs;
  const inputHashes = status === "passed" ? Object.fromEntries(bound.filter(Boolean).map(input => {
    const file = resolveInside(root, input, "checked input", { scope: "workflow", mustExist: true });
    return [path.relative(root, file).split(path.sep).join("/"), "sha256:" + sha256(fs.readFileSync(file))];
  })) : {};
  const steps = Array.isArray(report.steps) ? report.steps : [];
  const rawFindings = report.findings || (steps.length ? steps.flatMap(step => [
    ...(step.findings || []).map(item => ({ gate: step.gate, ...item })),
    ...((step.stale || step.status === "skipped") && (step.reason || step.source) ? [{ code: "workflow-step-blocked", severity: "error", gate: step.gate, message: step.reason || step.source, fix: step.next || report.next || "Repair this step, then rerun the returned check." }] : []),
  ]) : report.fixes) || [];
  const fields = ["code", "severity", "message", "fix", "gate", "beatId", "probeId", "shot", "selector", "expected", "actual", "viewport", "related"];
  const findings = Array.isArray(rawFindings) ? rawFindings.filter(item => item && typeof item === "object").map(item => Object.fromEntries(fields.filter(field => typeof item[field] === "string").map(field => [field, item[field]]))) : [];
  const next = typeof report.next === "string" ? report.next : steps.filter(step => typeof step.next === "string").map(step => step.next).join(" ");
  const lineageRecord = status === "passed" && lineage ? { lineage: { files: [...lineage.files], tokens: [...lineage.tokens], absent: [...lineage.absent], remote: [...lineage.remote] } } : {};
  state.gates = { ...(state.gates || {}), [gate]: { status, at: Date.now(), inputHashes, findings, ...(next ? { next } : {}), ...lineageRecord } };
  writeState(root, state);
}

const visualHash = value => "sha256:" + sha256(value);
const visualPath = value => value.replaceAll("\\", "/");

function visualContext(changeRoot, options) {
  const root = fs.realpathSync.native(path.resolve(changeRoot)), stateHash = sha256(fs.readFileSync(path.join(root, "state.json"))), native = readNativeState(root);
  native.stateHash = stateHash;
  if (native.state.phase !== "implementation") fail("workflow", "Visual task progress requires the native implementation phase.");
  const stored = native.state.extensions.visualTasks;
  const requested = options.plan || stored?.planPath;
  if (!requested) return { root, native };
  const planFile = resolveInside(root, requested, "visual plan", { scope: "workflow" });
  if (!fs.existsSync(planFile)) return { root, native, missingPlan: requested };
  const plan = validatePlan(readJson(planFile, "visual plan"), { requireVisualTasks: true });
  const planHash = visualHash(fs.readFileSync(planFile)), planPath = visualPath(path.relative(root, planFile));
  const progress = { planHash, planPath, completed: structuredClone(stored?.completed || {}), failures: { ...(stored?.failures || {}) }, ...(stored?.active ? { active: structuredClone(stored.active) } : {}) };
  const context = { root, native, plan, progress, videoCache: new Map(), sourceEvidence: new Map() };
  if (stored && stored.planHash !== planHash) {
    for (const id of Object.keys(progress.completed)) markVisualStale(context, id, "visual plan changed");
  }
  return context;
}

function persistVisual(context, summary, type = "visual-task-progress") {
  const { root, native, progress } = context;
  return advanceChange(native.stateFile, native.eventsFile, {
    expectedSha256: native.stateHash,
    timestamp: new Date().toISOString(), summary, type,
    status: "implementing", visualTasks: progress,
  });
}

function markVisualStale(context, id, reason) {
  const { plan, progress } = context;
  const affected = plan.phases.some(phase => phase.id === id)
    ? [...new Set([
      ...invalidateDownstream(plan, Object.values(progress.completed).flatMap(record => record.artifacts), id, { cause: reason }).invalidatedPhases,
      ...downstreamPhases(plan, id),
    ])]
    : [id];
  for (const affectedId of affected) {
    const record = progress.completed[affectedId];
    if (!record) continue;
    record.status = "stale";
    record.artifacts = record.artifacts.map(artifact => ({ ...artifact, status: "stale", stale_cause: reason }));
    if (record.review) record.review.valid = false;
  }
}

function visualInputs(context, task) {
  const hashes = { $plan: context.progress.planHash, $task: visualHash(canonicalJson(task)) };
  const dependencies = context.plan.phases.filter(phase => task.depends_on.includes(phase.id)).flatMap(phase => phase.outputs);
  const binding = task.visual.sourceObservation, videoReferences = [];
  for (const reference of task.visual.references) {
    const file = resolveInside(context.root, reference, "visual reference", { scope: "workflow", mustExist: true });
    if (!fs.statSync(file).isFile()) fail("workflow", `visual reference is not a file: ${reference}`);
    const bytes = fs.readFileSync(file);
    if (!bytes.subarray(0, 64).toString("utf8").trimStart().startsWith("{")) continue;
    let value;
    try { value = JSON.parse(bytes.toString("utf8")); } catch { continue; }
    if (value?.source?.kind === "video" && Object.hasOwn(value, "sampling")) videoReferences.push(path.posix.normalize(visualPath(reference)));
  }
  if (videoReferences.some(reference => !binding || reference !== path.posix.normalize(visualPath(binding.report)))) {
    fail("workflow", `Video report references require a matching visual.sourceObservation binding: ${videoReferences.join(", ")}`);
  }
  const evidence = binding ? resolveVideoObservation(context.root, binding, { target: task.visual.target, property: task.visual.property, cache: context.videoCache }) : null;
  if (evidence) context.sourceEvidence.set(task.id, evidence);
  const sourceInputs = evidence ? [binding.report, evidence.source.path, ...evidence.frames.map(frame => frame.path)] : [];
  for (const input of new Set([...task.inputs, ...task.visual.references, ...task.visual.guides, ...sourceInputs, ...dependencies])) {
    const key = visualPath(input);
    if (key === "$plan" || key === "$task" || key.startsWith("output:")) fail("workflow", `reserved visual input key: ${key}`);
    const file = resolveInside(context.root, input, "visual input", { scope: "workflow", mustExist: true });
    if (!fs.statSync(file).isFile()) fail("workflow", `visual input is not a file: ${input}`);
    hashes[key] = visualHash(fs.readFileSync(file));
  }
  return hashes;
}

const taskMetadataPath = task => `${task.id}-completion.json`;
const normalizedVisualPath = value => path.posix.normalize(visualPath(value));

function visualBindingsFailure(task) {
  const bindings = task.visual.verification;
  if (!Array.isArray(bindings) || task.visual.checks.some(check => bindings.filter(binding => binding.kind === "interaction" && normalizedVisualPath(binding.check) === normalizedVisualPath(check)).length !== 1)) {
    return "Every check needs a supported visual.verification interaction binding (probe input, local target output and check path). Update the plan, then dispatch with next; report-only evidence cannot complete a task.";
  }
  return null;
}

function inspectVisualAttempt(context, task) {
  const active = context.progress.active;
  if (!active) return "Task baseline is missing. Dispatch this task with next before working or completing it.";
  if (!samePath(active.changeRoot, context.root)) return "Task baseline belongs to another change root; repair the original execution window.";
  const result = inspectGitChanges(active.baseline, active.authorization, { root: context.root });
  context.scopeObservation = result;
  if (result.status !== "passed") return `Task scope is blocked: ${[...result.blockers, ...result.outOfScope.map(file => `outside original authorization: ${file}`)].join("; ")}. Repair the original window; repeating next or expanding the plan does not erase it.`;
  if (task) {
    const gitPath = raw => visualPath(path.relative(active.baseline.root, resolveInside(context.root, raw, "task change path", { scope: "workflow" }))) + (visualPath(raw).endsWith("/") ? "/" : "");
    const sourceScopes = [...task.visual.scope, ...task.outputs].map(gitPath);
    const verifierPaths = new Set([...task.visual.checks, active.metadataPath, "state.json", "events.jsonl"].map(gitPath));
    if (!result.changedFiles.some(file => !verifierPaths.has(file) && sourceScopes.some(scope => scope.endsWith("/") ? file.startsWith(scope) : file === scope))) return "Completion requires an actual task change within its source scope or declared outputs. Verifier reports, metadata and native controls do not count; edit the task in its original window before completing.";
  }
  return null;
}

function bindVisualAttempt(context, task) {
  const active = context.progress.active;
  if (active) {
    const failure = inspectVisualAttempt(context);
    if (failure) return failure;
    if (active.taskId === task.id && active.taskHash === visualHash(canonicalJson(task)) && active.planHash === context.progress.planHash) return null;
  }
  try {
    const baseline = captureGitSnapshot(context.root);
    const metadataPath = taskMetadataPath(task);
    const authorization = [...new Set([...task.visual.scope, ...task.outputs, ...task.visual.checks, context.progress.planPath, "state.json", "events.jsonl", metadataPath].map(raw => {
      const target = resolveInside(context.root, raw, "task authorization", { scope: "workflow" });
      const relative = visualPath(path.relative(baseline.root, target));
      if (!relative || relative === ".." || relative.startsWith("../") || path.isAbsolute(relative)) fail("workflow", "Task scope must remain inside its observed Git root.");
      return relative + (visualPath(raw).endsWith("/") ? "/" : "");
    }))];
    context.progress.active = { taskId: task.id, taskHash: visualHash(canonicalJson(task)), planHash: context.progress.planHash, changeRoot: context.root, metadataPath, authorization, baseline };
    return null;
  } catch (error) { return `Cannot observe this task's Git baseline: ${error.message}`; }
}

function interactionResultFailure(report, rawProbe) {
  const probe = validateProbeFile(rawProbe);
  if (report?.schema !== RESULT_SCHEMA || report.id !== probe.id || report.url !== probe.url || report.status !== "passed" || !Array.isArray(report.probes) || report.probes.length !== probe.probes.length || !Array.isArray(report.findings) || report.findings.some(row => row.severity === "error")) return "Interaction report must contain the actual passed interaction-result.v1 measurements for every declared probe.";
  for (let index = 0; index < probe.probes.length; index++) {
    const row = report.probes[index], samples = row?.samples;
    if (probe.probes[index].steps) {
      const failure = journeyResultFailure(probe.probes[index], row);
      if (failure) return failure;
      continue;
    }
    // Audit rows carry per-viewport check coverage, never motion samples.
    if (probe.probes[index].kind === "audit") {
      const failure = auditResultFailure(probe.probes[index], row);
      if (failure) return failure;
      continue;
    }
    if (row?.id !== probe.probes[index].id || row.status !== "passed" || !Array.isArray(row.findings) || row.findings.some(finding => finding.severity === "error") || !Number.isInteger(samples?.count) || samples.count < 5 || !Number.isFinite(samples.firstMs) || !Number.isFinite(samples.lastMs) || samples.lastMs <= samples.firstMs || row.metrics?.frames !== samples.count || !Number.isFinite(row.metrics.durationMs)) return `Interaction probe ${probe.probes[index].id} is failed, incomplete or unmeasured.`;
  }
  return null;
}

function visualEvidenceFailure(context, task, inputHashes, artifacts) {
  if (!Array.isArray(artifacts) || !artifacts.length) return "Completion requires artifact.v1 metadata for outputs and checks.";
  const outputs = task.outputs.map(normalizedVisualPath), checks = task.visual.checks.map(normalizedVisualPath);
  const required = new Set([...outputs, ...checks]), byPath = new Map();
  for (const metadata of artifacts) {
    try {
      const result = validateArtifactMetadata(metadata, { changeRoot: context.root });
      if (result.status !== "ready") return result.reason || `Artifact is ${result.status}: ${metadata.path}`;
      if (!required.has(metadata.path) || byPath.has(metadata.path)) return `Unexpected or duplicate task artifact: ${metadata.path}`;
      byPath.set(metadata.path, metadata);
    } catch (error) { return error.message; }
  }
  for (const file of required) if (!byPath.has(file)) return `Missing artifact metadata for ${file}`;
  const outputHashes = Object.fromEntries(outputs.map(file => ["output:" + file, byPath.get(file).artifact_hash]));
  for (const [file, metadata] of byPath) {
    const expected = checks.includes(file) ? { ...inputHashes, ...outputHashes } : inputHashes;
    if (canonicalJson(metadata.input_hashes) !== canonicalJson(expected)) return `Artifact input/output binding differs from current task: ${file}`;
  }
  for (const file of checks) {
    let report;
    try { report = readJson(resolveInside(context.root, file, "visual check", { scope: "workflow", mustExist: true }), "visual check"); }
    catch (error) { return error.message; }
    const binding = task.visual.verification?.find(binding => normalizedVisualPath(binding.check) === normalizedVisualPath(file));
    if (!binding) return `Check has no supported observed verification binding: ${file}`;
    try {
      const failure = interactionResultFailure(report, readJson(resolveInside(context.root, binding.probe, "interaction probe", { scope: "workflow", mustExist: true }), "interaction probe"));
      if (failure) return `${file}: ${failure}`;
    } catch (error) { return error.message; }
  }
  return null;
}

function currentVisual(context) {
  let current = null, inputHashes = null, blocker = null, waitingReview = false;
  for (const task of context.plan.phases) {
    const record = context.progress.completed[task.id];
    let expected;
    try { expected = visualInputs(context, task); }
    catch (error) {
      if (record && record.status !== "stale") markVisualStale(context, task.id, error.message);
      current = task; blocker = error.message; break;
    }
    if (record && (record.status || "ready") === "ready") {
      const failure = !record.observation || record.observation.kind !== "interaction" || record.observation.attempt?.taskHash !== record.taskHash || record.observation.attempt?.planHash !== context.progress.planHash || !samePath(record.observation.attempt?.changeRoot, context.root) || canonicalJson(record.observation.checks) !== canonicalJson(task.visual.checks)
        ? "Legacy or unobserved completion requires fresh dispatch and actual verification."
        : record.taskHash !== expected.$task || canonicalJson(record.inputHashes) !== canonicalJson(expected)
        ? "Task or upstream input changed."
        : visualEvidenceFailure(context, task, expected, record.artifacts);
      if (!failure) {
        const review = record.review;
        if (task.visual.review === true && !(review?.verdict === "accept" && review.valid === true && review.artifactHash === visualHash(canonicalJson(record.artifacts)))) {
          current = task; inputHashes = expected; waitingReview = true; break;
        }
        continue;
      }
      markVisualStale(context, task.id, failure);
    }
    current = task; inputHashes = expected; break;
  }
  return { current, inputHashes, blocker, waitingReview };
}

function visualDecomposition(context) {
  return {
    type: "run", stage: "decompose", visualAcceptance: "not-evaluated",
    instruction: "Write a design-plan.v1 with one observed property per phase. This example checks a menu's declared open, selection, close, Escape and focus states through the documented eight-step interaction.json journey in a stable #menu-demo wrapper; use #menu-trigger, #sort-menu, #sort-default, #sort-updated and #selection-value, reading the loaded QA method copied to guides/qa.md. It does not prove structural fidelity, backend persistence or visual acceptance. Bind reference files, scope, outputs, checks and dependencies. Bind each local-web check through visual.verification: interaction probe input, exact local page output and check result path. Guides must name actual readable method files. A video report reference requires visual.sourceObservation with report, confirmed shotId and observed observationIds; its target/property must match. Then run the command (replace <file>) before working in an owned Git window.",
    command: `${cliCommand()} next --root ${shellPath(context.root)} --change-root ${shellPath(context.root)} --plan <file>`,
    ...(context.missingPlan ? { missingPlan: context.missingPlan } : {}),
    template: { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "sort-menu", input_hash: "sha256:" + "0".repeat(64), mode: "greenfield", fidelity: "adaptive", phases: [{ id: "menu-selection", depends_on: [], inputs: ["brief.md", "interaction.json", "guides/qa.md"], outputs: ["index.html"], gates: [], goal: "Open the menu, select 按更新时间, close it, then use Escape to restore focus while preserving the selected value.", visual: { target: "sort-menu", property: "menu.selection", references: ["brief.md"], scope: ["index.html", "implementation.md"], guides: ["guides/qa.md"], checks: ["evidence/menu-check.json"], review: true, verification: [{ kind: "interaction", probe: "interaction.json", target: "index.html", check: "evidence/menu-check.json" }] } }] },
  };
}

function visualOutputHashes(context, task) {
  return Object.fromEntries(task.outputs.map(raw => {
    const file = resolveInside(context.root, raw, "task output", { scope: "workflow", mustExist: true });
    if (!fs.statSync(file).isFile()) fail("workflow", `Task output is not a file: ${raw}`);
    return ["output:" + normalizedVisualPath(raw), visualHash(fs.readFileSync(file))];
  }));
}

function visualFailureFeedback(context, task, inputHashes) {
  const failure = context.progress.failures[task.id];
  if (!failure) return {};
  if (typeof failure === "string") return { feedback: failure };
  let sameSnapshot = false;
  try { sameSnapshot = canonicalJson(failure.inputHashes) === canonicalJson({ ...inputHashes, ...visualOutputHashes(context, task) }); } catch { /* Missing outputs still need repair before verification. */ }
  return {
    feedback: failure.message, findings: failure.findings, attempts: failure.attempts, sameSnapshot,
    ...(sameSnapshot && failure.attempts >= 3 ? { recovery: { code: "stop-repeating", message: "This measured input/output snapshot has failed at least three times. Stop repeating the unchanged verification.", fix: "Read the failing check and its findings, repair the declared behavior, then complete the changed snapshot. Keep the original scope window; this hint never permits skipping verification or granting acceptance." } } : {}),
  };
}

function nextVisualTask(changeRoot, options = {}) {
  const context = visualContext(changeRoot, options);
  if (!context.plan) return visualDecomposition(context);
  const { current, inputHashes, blocker: inputBlocker, waitingReview } = currentVisual(context);
  let blocker = inputBlocker;
  if (current && !waitingReview) blocker ||= visualBindingsFailure(current) || bindVisualAttempt(context, current);
  if (canonicalJson(context.native.state.extensions.visualTasks || null) !== canonicalJson(context.progress)) persistVisual(context, "Bound current visual tasks and invalidated changed evidence.");
  if (!current) return { type: "done", stage: "visual-tasks", technicalCompletion: "passed", visualAcceptance: "not-evaluated", evidence: context.progress.completed };
  if (waitingReview) {
    const artifacts = context.progress.completed[current.id].artifacts;
    const evidence = {
      outputs: artifacts.filter(metadata => current.outputs.some(file => normalizedVisualPath(file) === metadata.path)),
      checks: artifacts.filter(metadata => current.visual.checks.some(file => normalizedVisualPath(file) === metadata.path)),
    };
    return {
      type: "ask", stage: "visual-review", task: current, inputHashes,
      ...(context.sourceEvidence.has(current.id) ? { sourceEvidence: context.sourceEvidence.get(current.id) } : {}),
      planHash: context.progress.planHash, taskHash: inputHashes.$task, planPath: context.progress.planPath,
      artifacts, evidence, show: evidence.outputs.map(metadata => resolveInside(context.root, metadata.path, "review output", { scope: "workflow", mustExist: true })),
      technicalCompletion: "passed", visualAcceptance: "not-evaluated",
      question: `Inspect only ${current.visual.target}'s ${current.visual.property}: ${current.goal} Accept this exact evidence version, or reject it with the concrete difference to repair. This decision covers this target property, not the whole component or film.`,
      record: `${cliCommand()} decide --root ${shellPath(context.root)} --change-root ${shellPath(context.root)} --choice ${current.id} --verdict accept|reject --artifact <metadata.json> [--answer "<concrete feedback>"]`,
    };
  }
  return {
    type: "run", stage: "visual-task", task: current, inputHashes,
    ...(context.sourceEvidence.has(current.id) ? { sourceEvidence: context.sourceEvidence.get(current.id) } : {}),
    planHash: context.progress.planHash, taskHash: inputHashes?.$task || visualHash(canonicalJson(current)),
    planPath: context.progress.planPath, metadataPath: taskMetadataPath(current), visualAcceptance: "not-evaluated",
    ...(blocker ? { status: "blocked", blockers: [blocker] } : {}),
    ...visualFailureFeedback(context, current, inputHashes),
    ...(context.progress.completed[current.id]?.status === "stale" ? { previousArtifacts: context.progress.completed[current.id].artifacts } : {}),
    instruction: `Work only on ${current.id}: ${current.goal} Read the named guides and references; keep this execution window owned and changes inside its scope. Produce the declared outputs, then run the command. Completion runs the bound browser verifier and writes artifact.v1 metadata itself. A technical completion never grants visual acceptance.`,
    command: `${cliCommand()} decide --root ${shellPath(context.root)} --change-root ${shellPath(context.root)} --choice ${current.id} --verdict complete --artifact ${taskMetadataPath(current)}`,
  };
}

function completionArtifacts(context, raw) {
  if (!raw) fail("workflow", "Completion requires an artifact metadata file.");
  const value = readJson(resolveInside(context.root, raw, "task completion", { scope: "workflow", mustExist: true }), "task completion");
  return Array.isArray(value) ? value : [value];
}

function completedDecisionFailure(context, task, record, raw) {
  if (!record || (record.status || "ready") !== "ready") return "A review decision requires the current technically completed snapshot; complete the repaired task first.";
  try {
    const expected = visualInputs(context, task);
    if (record.taskHash !== expected.$task || canonicalJson(record.inputHashes) !== canonicalJson(expected)) return "Task or upstream input changed since this completion snapshot.";
    const artifacts = completionArtifacts(context, raw);
    if (canonicalJson(artifacts) !== canonicalJson(record.artifacts)) return "Review metadata must match the exact stored completion version.";
    return visualEvidenceFailure(context, task, expected, artifacts);
  } catch (error) { return error.message; }
}

function recheckVisualSnapshot(context, task, inputHashes, outputHashes) {
  if (visualHash(fs.readFileSync(path.join(context.root, context.progress.planPath))) !== context.progress.planHash || canonicalJson(visualInputs(context, task)) !== canonicalJson(inputHashes)) fail("workflow", "Plan or bound inputs drifted during browser verification; rerun on the repaired snapshot.");
  for (const raw of task.outputs) if (visualHash(fs.readFileSync(resolveInside(context.root, raw, "checked output", { scope: "workflow", mustExist: true }))) !== outputHashes["output:" + normalizedVisualPath(raw)]) fail("workflow", `Output drifted during browser verification: ${raw}. Rerun the checked snapshot.`);
  const scopeFailure = inspectVisualAttempt(context, task);
  if (scopeFailure) fail("workflow", scopeFailure);
  readNativeState(context.root);
  if (sha256(fs.readFileSync(context.native.stateFile)) !== context.native.stateHash) fail("workflow", "Native state changed during verification; completion CAS cannot promote this snapshot.", { code: "HASH_MISMATCH" });
}

function observeVisualTask(context, task, inputHashes, options) {
  const bindingFailure = visualBindingsFailure(task) || inspectVisualAttempt(context, task);
  if (bindingFailure) fail("workflow", bindingFailure);
  const active = context.progress.active;
  if (active.taskId !== task.id || active.taskHash !== inputHashes.$task || active.planHash !== context.progress.planHash) fail("workflow", "Completion baseline does not bind this task/plan. Close the original scope window and dispatch with next.");
  if (options.artifact && normalizedVisualPath(options.artifact) !== active.metadataPath) fail("workflow", `Completion writes its observed metadata to ${active.metadataPath}; --artifact must name that exact destination.`);
  const { observeInteraction, preflightInteraction } = require("./cli-core.cjs");
  const outputHashes = visualOutputHashes(context, task);
  const boundFiles = [...Object.keys(inputHashes).filter(key => key !== "$plan" && key !== "$task"), ...task.outputs, context.progress.planPath, "state.json", "events.jsonl"].map(raw => resolveInside(context.root, raw, "bound task file", { scope: "workflow" }));
  const protectedFiles = [...boundFiles, resolveInside(context.root, active.metadataPath, "completion metadata", { scope: "workflow" })];
  const bindings = task.visual.verification.map(binding => ({
    ...binding, resultFile: binding.check,
    protectedFiles: [...protectedFiles, ...task.visual.checks.filter(check => normalizedVisualPath(check) !== normalizedVisualPath(binding.check)).map(raw => resolveInside(context.root, raw, "other check", { scope: "workflow" }))],
    // Completion writes every check and its metadata after all observations, so no page may load any.
    reportFiles: [...task.visual.checks, active.metadataPath],
    chrome: options.chrome, puppeteer: options.puppeteerModule,
  }));
  // Preflight every destination before executing or writing any check.
  for (const binding of bindings) preflightInteraction(context.root, binding);
  const metadataOptions = { ...bindings[0], resultFile: active.metadataPath, protectedFiles: [...boundFiles, ...task.visual.checks.map(raw => path.join(context.root, raw))] };
  preflightInteraction(context.root, metadataOptions);
  const observations = bindings.map(binding => observeInteraction(context.root, binding));
  recheckVisualSnapshot(context, task, inputHashes, outputHashes);
  for (const binding of bindings) preflightInteraction(context.root, binding);
  preflightInteraction(context.root, metadataOptions);
  const failures = observations.map((observed, index) => interactionResultFailure(observed.result, observed.doc) && `${bindings[index].check}: ${interactionResultFailure(observed.result, observed.doc)}`).filter(Boolean);
  observations.forEach((observed, index) => {
    const destination = resolveInside(context.root, bindings[index].check, "observed report", { scope: "workflow" });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, canonicalJson(observed.result));
  });
  if (failures.length) {
    recheckVisualSnapshot(context, task, inputHashes, outputHashes);
    for (const [index, observed] of observations.entries()) {
      if (visualHash(fs.readFileSync(resolveInside(context.root, bindings[index].check, "observed report", { scope: "workflow", mustExist: true }))) !== visualHash(canonicalJson(observed.result))) fail("workflow", "Observed report changed while recording failed verification; repair and rerun.");
    }
    const fields = ["code", "severity", "message", "fix", "probeId", "stepId", "selector", "name"];
    const findings = observations.flatMap((observed, index) => observed.result.status === "failed" ? (observed.result.findings || []).filter(finding => finding && ["code", "severity", "message", "fix"].every(field => typeof finding[field] === "string" && finding[field])).map(finding => ({ ...Object.fromEntries(fields.filter(field => typeof finding[field] === "string").map(field => [field, finding[field]])), ...Object.fromEntries(["expected", "actual"].filter(field => Object.hasOwn(finding, field)).map(field => [field, finding[field]])), path: bindings[index].check })) : []);
    const observedFailure = findings.length ? { message: `Observed interaction verification failed: ${findings.filter(finding => finding.severity === "error").map(finding => `${finding.path}${finding.stepId ? ` (${finding.stepId})` : ""}: ${finding.message}`).join("; ")}`, findings, inputHashes: { ...inputHashes, ...outputHashes } } : null;
    fail("workflow", failures.join("; "), observedFailure ? { code: "VERIFICATION_FAILED", observedFailure } : {});
  }
  const dependencies = context.plan.phases.filter(phase => task.depends_on.includes(phase.id)).flatMap(phase => phase.outputs);
  const at = new Date().toISOString();
  const artifacts = [...task.outputs, ...task.visual.checks].map(file => createArtifactMetadata({ path: file, producer: "designer-pipeline observed interaction", input_hashes: task.visual.checks.includes(file) ? { ...inputHashes, ...outputHashes } : inputHashes, dependencies: task.visual.checks.includes(file) ? task.outputs : dependencies, created_at: at }, { changeRoot: context.root }));
  const failure = visualEvidenceFailure(context, task, inputHashes, artifacts);
  if (failure) fail("workflow", failure);
  const metadataFile = resolveInside(context.root, active.metadataPath, "observed metadata", { scope: "workflow" });
  fs.mkdirSync(path.dirname(metadataFile), { recursive: true });
  fs.writeFileSync(metadataFile, canonicalJson(artifacts));
  recheckVisualSnapshot(context, task, inputHashes, outputHashes);
  const finalFailure = visualEvidenceFailure(context, task, inputHashes, artifacts);
  if (finalFailure) fail("workflow", finalFailure);
  const measuredScope = context.scopeObservation;
  return { taskHash: inputHashes.$task, inputHashes, artifacts, status: "ready", observation: { kind: "interaction", attempt: structuredClone(active), checks: [...task.visual.checks], scope: { changedFiles: measuredScope.changedFiles, commitChangedFiles: measuredScope.commitChangedFiles, head: measuredScope.current.head }, at } };
}

function decideVisualTask(changeRoot, options = {}) {
  assertEnum(options.verdict, ["complete", "accept", "reject"], "verdict", "workflow");
  const context = visualContext(changeRoot, options);
  if (!context.plan) fail("workflow", "A visual task plan is required before completion.");
  const { current, inputHashes, blocker, waitingReview } = currentVisual(context);
  const chosen = context.plan.phases.find(task => task.id === options.choice);
  if (!chosen) fail("workflow", `Unknown visual task: ${String(options.choice)}.`);
  const record = context.progress.completed[chosen.id];
  const blockedDecision = failure => ({ status: "blocked", taskId: chosen.id, failure, visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) });
  if (options.verdict === "accept") {
    if (!waitingReview || current?.id !== chosen.id) return blockedDecision("Only the current technically completed review checkpoint can be accepted.");
    const failure = completedDecisionFailure(context, chosen, record, options.artifact);
    if (failure) return blockedDecision(failure);
    record.review = { verdict: "accept", at: new Date().toISOString(), artifactHash: visualHash(canonicalJson(record.artifacts)), valid: true };
    delete context.progress.failures[chosen.id];
    persistVisual(context, `${chosen.id} owner accepted this exact target-property evidence.`, "visual-task-review");
    return { status: "recorded", taskId: chosen.id, review: record.review, technicalCompletion: "passed", visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) };
  }
  if (options.verdict === "reject") {
    if (typeof options.answer !== "string" || !options.answer.trim()) fail("workflow", "A rejection needs --answer with concrete feedback.");
    if (record && ((record.status || "ready") === "ready" || options.artifact)) {
      const failure = completedDecisionFailure(context, chosen, record, options.artifact);
      if (failure) return blockedDecision(failure);
      const scopeFailure = context.progress.active && inspectVisualAttempt(context);
      if (scopeFailure) return blockedDecision(scopeFailure);
      markVisualStale(context, chosen.id, options.answer.trim());
      delete context.progress.active;
      context.progress.failures[chosen.id] = options.answer.trim();
      persistVisual(context, `${chosen.id} owner rejected this evidence: ${options.answer.trim()}`, "visual-task-failed");
      return { status: "blocked", taskId: chosen.id, failure: options.answer.trim(), visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) };
    }
  }
  if (!current || current.id !== chosen.id) fail("workflow", `Only the current task ${current?.id || "(none)"} can be completed or rejected without completed evidence.`);
  let failure = blocker, failureCode, observedFailure;
  if (options.verdict === "reject") {
    failure = options.answer.trim();
  } else if (!failure) {
    try {
      context.progress.completed[current.id] = observeVisualTask(context, current, inputHashes, options);
    } catch (error) { failure = error.message; failureCode = error.code; observedFailure = error.details?.observedFailure; }
    if (!failure) {
      delete context.progress.failures[current.id];
      delete context.progress.active;
    }
  }
  // A destination aliasing native controls must not receive even a failure-state write.
  if (failureCode === "OUTPUT_COLLISION") return { status: "blocked", taskId: current.id, failure, visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) };
  if (sha256(fs.readFileSync(context.native.stateFile)) !== context.native.stateHash) return { status: "blocked", taskId: current.id, failure: failure || "Native completion CAS conflict; rerun next.", visualAcceptance: "not-evaluated", next: { type: "run", stage: "visual-task", command: "Rerun next --change-root <change> and repair the concurrent state change before completing." } };
  if (failure) {
    const previous = context.progress.failures[current.id];
    if (observedFailure) context.progress.failures[current.id] = { ...observedFailure, attempts: Math.min(typeof previous === "object" && canonicalJson(previous.inputHashes) === canonicalJson(observedFailure.inputHashes) ? previous.attempts + 1 : 1, Number.MAX_SAFE_INTEGER) };
    else context.progress.failures[current.id] = typeof previous === "object" ? { ...previous, message: failure } : failure;
  }
  persistVisual(context, failure ? `${current.id} needs repair: ${failure}` : `${current.id} technical evidence passed.`, failure ? "visual-task-failed" : "visual-task-complete");
  return { status: failure ? "blocked" : "recorded", taskId: current.id, ...(failure ? { failure } : {}), visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) };
}

module.exports = { DELIVERABLES, SCHEMA, STATE, TIERS, bindStateJobPlan, decide, decideVisualTask, deferAsk, diligence, initState, nextAction, nextVisualTask, projectJobPlan, readState, recordGate };
