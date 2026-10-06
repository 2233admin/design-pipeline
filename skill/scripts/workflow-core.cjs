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
const { assertEnum, canonicalJson, fail, readJson, resolveInside, sha256 } = require("./contract-utils.cjs");
const { validatePlan } = require("./plan-core.cjs");
const { validateArtifactMetadata } = require("./artifact-core.cjs");
const { advanceChange } = require("./pipeline-state-core.cjs");
const { readState: readNativeState } = require("./control-runtime-core.cjs");
const { downstreamPhases, invalidateDownstream } = require("./invalidation-core.cjs");
const { resolveVideoObservation } = require("./reference-video-core.cjs");

const SCHEMA = "design-pipeline.workflow-state.v1";
const STATE = path.join(".design-pipeline", "state.json");
const DELIVERABLES = ["film", "edit", "web", "ui"];
const TIERS = ["quick", "standard", "full"];
const MODES = ["brief", "replicate", "freeform"];
const CLI = "designer-pipeline";

// Sub-workflows by deliverable (Q5, Q7): film, edit and web have their own stage modules and
// guides.
const { INTAKE, reference } = require("./workflows/shared.cjs");
const SUB_WORKFLOWS = { film: require("./workflows/film.cjs"), edit: require("./workflows/edit.cjs"), web: require("./workflows/web.cjs") };
const REFERENCE = reference("Inspect the supplied reference and its timed frames; write reference.md with reference regions, observable structure and motion, invariants and uncertainties using references/reference-spec.md. Follow references/reconstruction-spec.md and applicable references/3d-spec.md; the next work starts a bounded graybox. reference.md marks document delivery, not verified observation; do not require aggregate reference readiness before the graybox exists.");

function codeStages(state) {
  const { tier, mode } = state;
  const work = {
    id: "work",
    finished: (state) => Boolean(state.decisions?.delivered),
    action: () => ({
      type: "run",
      command: `${tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/ and follow references/pipeline-reference.md" : `Follow references/pipeline-reference.md at the ${tier} tier (no OpenSpec; create DESIGN.md/MOTION.md only at standard if missing)`}${mode === "replicate" ? "; reproduce the reference and its invariants" : ""}. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. Verify the rendered surface; file delivery and engineering checks do not grant visual acceptance. When verified: ${CLI} decide --project-root . --stage deliver --answer <evidence>`,
      ...(mode === "replicate" ? { guide: "references/pipeline-reference.md" } : {}),
      why: tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the gates.",
    }),
  };
  return [...(tier === "quick" ? [] : [INTAKE]), ...(mode === "replicate" ? [REFERENCE] : []), work];
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

const visualHash = value => "sha256:" + sha256(value);
const visualPath = value => value.replaceAll("\\", "/");

function visualContext(changeRoot, options) {
  const root = path.resolve(changeRoot), stateHash = sha256(fs.readFileSync(path.join(root, "state.json"))), native = readNativeState(root);
  native.stateHash = stateHash;
  if (native.state.phase !== "implementation") fail("workflow", "Visual task progress requires the native implementation phase.");
  const stored = native.state.extensions.visualTasks;
  const requested = options.plan || stored?.planPath;
  if (!requested) return { root, native };
  const planFile = resolveInside(root, requested, "visual plan", { scope: "workflow" });
  if (!fs.existsSync(planFile)) return { root, native, missingPlan: requested };
  const plan = validatePlan(readJson(planFile, "visual plan"), { requireVisualTasks: true });
  const planHash = visualHash(fs.readFileSync(planFile)), planPath = visualPath(path.relative(root, planFile));
  const progress = { planHash, planPath, completed: structuredClone(stored?.completed || {}), failures: { ...(stored?.failures || {}) } };
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

function visualEvidenceFailure(context, task, inputHashes, artifacts) {
  if (!Array.isArray(artifacts) || !artifacts.length) return "Completion requires artifact.v1 metadata for outputs and checks.";
  const outputs = task.outputs.map(visualPath), checks = task.visual.checks.map(visualPath);
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
    if (report?.status !== "passed" || !Array.isArray(report.checks) || !report.checks.length || report.checks.some(check => typeof check === "string" ? !check.trim() : !check || typeof check !== "object" || Array.isArray(check) || !Object.keys(check).length || Object.hasOwn(check, "status") && !["passed", "pass"].includes(check.status))) return `Check report must be passed with nonempty checks: ${file}`;
    if (Array.isArray(report.errors) && report.errors.length) return `Check report contains errors: ${file}`;
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
      const failure = record.taskHash !== expected.$task || canonicalJson(record.inputHashes) !== canonicalJson(expected)
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
    command: "Write a design-plan.v1 with one observed visual property per phase. Bind reference files, scope, outputs, checks and dependencies. Guides must name actual readable method files. A video report reference requires visual.sourceObservation with report, confirmed shotId and observed observationIds; its target/property must match. Then run next --change-root <change> --plan <file>. Do not build the whole surface first.",
    ...(context.missingPlan ? { missingPlan: context.missingPlan } : {}),
    template: { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "visual-goals", input_hash: "sha256:" + "0".repeat(64), mode: "clone", fidelity: "exact", phases: [{ id: "structure", depends_on: [], inputs: ["reference-evidence.json"], outputs: ["evidence/structure-output.json"], gates: [], goal: "Match one observed structural property.", visual: { target: "reference-region-id", property: "structure", references: ["reference-evidence.json"], scope: ["src/component.js"], guides: ["references/reference-spec.md"], checks: ["evidence/structure-check.json"] } }] },
  };
}

function nextVisualTask(changeRoot, options = {}) {
  const context = visualContext(changeRoot, options);
  if (!context.plan) return visualDecomposition(context);
  const { current, inputHashes, blocker, waitingReview } = currentVisual(context);
  if (canonicalJson(context.native.state.extensions.visualTasks || null) !== canonicalJson(context.progress)) persistVisual(context, "Bound current visual tasks and invalidated changed evidence.");
  if (!current) return { type: "done", stage: "visual-tasks", technicalCompletion: "passed", visualAcceptance: "not-evaluated", evidence: context.progress.completed };
  if (waitingReview) {
    const artifacts = context.progress.completed[current.id].artifacts;
    const evidence = {
      outputs: artifacts.filter(metadata => current.outputs.includes(metadata.path)),
      checks: artifacts.filter(metadata => current.visual.checks.includes(metadata.path)),
    };
    return {
      type: "ask", stage: "visual-review", task: current, inputHashes,
      ...(context.sourceEvidence.has(current.id) ? { sourceEvidence: context.sourceEvidence.get(current.id) } : {}),
      planHash: context.progress.planHash, taskHash: inputHashes.$task, planPath: context.progress.planPath,
      artifacts, evidence, show: evidence.outputs.map(metadata => resolveInside(context.root, metadata.path, "review output", { scope: "workflow", mustExist: true })),
      technicalCompletion: "passed", visualAcceptance: "not-evaluated",
      question: `Inspect only ${current.visual.target}'s ${current.visual.property}: ${current.goal} Accept this exact evidence version, or reject it with the concrete difference to repair. This decision covers this target property, not the whole component or film.`,
      record: `${CLI} decide --change-root <change> --choice ${current.id} --verdict accept|reject --artifact <metadata.json> [--answer "<concrete feedback>"]`,
    };
  }
  return {
    type: "run", stage: "visual-task", task: current, inputHashes,
    ...(context.sourceEvidence.has(current.id) ? { sourceEvidence: context.sourceEvidence.get(current.id) } : {}),
    planHash: context.progress.planHash, taskHash: inputHashes?.$task || visualHash(canonicalJson(current)),
    planPath: context.progress.planPath, visualAcceptance: "not-evaluated",
    ...(blocker ? { status: "blocked", blockers: [blocker] } : {}),
    ...(context.progress.failures[current.id] ? { feedback: context.progress.failures[current.id] } : {}),
    ...(context.progress.completed[current.id]?.status === "stale" ? { previousArtifacts: context.progress.completed[current.id].artifacts } : {}),
    command: `Work only on ${current.id}: ${current.goal} Read the named guides and references; keep changes inside its scope. Produce bound artifact.v1 metadata for every output/check, then decide --change-root <change> --choice ${current.id} --verdict complete --artifact <metadata.json>. A technical completion never grants visual acceptance.`,
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
      markVisualStale(context, chosen.id, options.answer.trim());
      context.progress.failures[chosen.id] = options.answer.trim();
      persistVisual(context, `${chosen.id} owner rejected this evidence: ${options.answer.trim()}`, "visual-task-failed");
      return { status: "blocked", taskId: chosen.id, failure: options.answer.trim(), visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) };
    }
  }
  if (!current || current.id !== chosen.id) fail("workflow", `Only the current task ${current?.id || "(none)"} can be completed or rejected without completed evidence.`);
  let failure = blocker;
  if (options.verdict === "reject") {
    failure = options.answer.trim();
  } else if (!failure) {
    let artifacts;
    try {
      artifacts = completionArtifacts(context, options.artifact);
      failure = visualEvidenceFailure(context, current, inputHashes, artifacts);
    } catch (error) { failure = error.message; }
    if (!failure) {
      context.progress.completed[current.id] = { taskHash: inputHashes.$task, inputHashes, artifacts, status: "ready" };
      delete context.progress.failures[current.id];
    }
  }
  if (failure) context.progress.failures[current.id] = failure;
  persistVisual(context, failure ? `${current.id} needs repair: ${failure}` : `${current.id} technical evidence passed.`, failure ? "visual-task-failed" : "visual-task-complete");
  return { status: failure ? "blocked" : "recorded", taskId: current.id, ...(failure ? { failure } : {}), visualAcceptance: "not-evaluated", next: nextVisualTask(changeRoot) };
}

module.exports = { DELIVERABLES, SCHEMA, STATE, TIERS, decide, decideVisualTask, initState, nextAction, nextVisualTask, readState, recordGate };
