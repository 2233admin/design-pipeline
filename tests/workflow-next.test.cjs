"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, decideVisualTask, initState, nextAction, nextVisualTask, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { createInitialState, inspectConsistency, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { createArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { canonicalJson } = require("../skill/scripts/contract-utils.cjs");
const { analyzeVideo } = require("../skill/scripts/reference-video-core.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "workflow-"));
const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const touch = (dir, rel, body = "x") => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), body); };

function visualFixture(nativePhase = "implementation") {
  const dir = tmp();
  const state = createInitialState({ changeId: "visual-example", timestamp: new Date().toISOString(), phase: nativePhase, status: "implementing" });
  writeNewChange(path.join(dir, "state.json"), path.join(dir, "events.jsonl"), state);
  touch(dir, "reference.json", '{"outline":"rounded"}');
  touch(dir, "references/reference-spec.md", "Inspect the source before changing the declared property.");
  const phase = (id, depends_on, property) => ({ id, depends_on, inputs: ["reference.json"], outputs: [`${id}.js`], gates: [], goal: `Match the observed ${property}.`, visual: { target: "main-surface", property, references: ["reference.json"], scope: [`${id}.js`], guides: ["references/reference-spec.md"], checks: [`${id}-check.json`] } });
  const plan = { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "visual-example", input_hash: "sha256:" + "a".repeat(64), mode: "clone", fidelity: "exact", phases: [phase("outline", [], "outline"), phase("surface", ["outline"], "roughness")] };
  touch(dir, "visual-plan.json", canonicalJson(plan));
  return { dir, plan: "visual-plan.json" };
}

function visualEvidence(fixture, action, report = { status: "passed", checks: ["Observed the fixed-time runtime frame."] }) {
  const task = action.task, inputHashes = action.inputHashes;
  for (const output of task.outputs) touch(fixture.dir, output, `rendered ${task.id}`);
  const dependencies = fixture.plan && JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8")).phases.filter(p => task.depends_on.includes(p.id)).flatMap(p => p.outputs) || [];
  const metadata = task.outputs.map(file => createArtifactMetadata({ path: file, producer: "test-runtime", input_hashes: inputHashes, dependencies, created_at: new Date().toISOString() }, { changeRoot: fixture.dir }));
  const reportInputs = { ...inputHashes, ...Object.fromEntries(metadata.map(m => ["output:" + m.path, m.artifact_hash])) };
  for (const check of task.visual.checks) {
    touch(fixture.dir, check, canonicalJson(report));
    metadata.push(createArtifactMetadata({ path: check, producer: "test-runtime-check", input_hashes: reportInputs, dependencies: task.outputs, created_at: new Date().toISOString() }, { changeRoot: fixture.dir }));
  }
  touch(fixture.dir, "completion.json", canonicalJson(metadata));
  return "completion.json";
}

test("native visual next asks for a concrete decomposition without creating legacy workflow state", () => {
  const { dir } = visualFixture();
  const action = nextVisualTask(dir);
  assert.equal(action.stage, "decompose");
  assert.equal(action.type, "run");
  assert.ok(action.template.phases[0].visual.target);
  assert.ok(action.template.phases[0].visual.property);
  assert.ok(action.template.phases[0].visual.checks.length);
  assert.match(action.command, /sourceObservation.*report.*shotId.*observationIds/);
  assert.equal(fs.existsSync(path.join(dir, ".design-pipeline/state.json")), false);
});

test("native visual next dispatches one goal and advances only with bound outputs and passed checks", () => {
  const fixture = visualFixture();
  let action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  assert.equal(action.task.id, "outline");
  assert.equal(action.task.visual.property, "outline");
  assert.match(action.inputHashes["reference.json"], /^sha256:/);
  assert.match(action.inputHashes.$plan, /^sha256:/);
  assert.match(action.inputHashes.$task, /^sha256:/);
  assert.equal(action.visualAcceptance, "not-evaluated");
  touch(fixture.dir, "outline.js", "exists but has no completion evidence");
  assert.equal(nextVisualTask(fixture.dir, { plan: fixture.plan }).task.id, "outline");
  assert.throws(() => decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "surface", verdict: "complete", artifact: "completion.json" }), /current|outline/);
  let artifact = visualEvidence(fixture, action, { status: "failed", checks: ["Runtime frame is blank."] });
  assert.equal(decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "complete", artifact }).next.task.id, "outline");
  assert.match(JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks.failures.outline, /passed|failed/);
  artifact = visualEvidence(fixture, action);
  const completed = decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "complete", artifact });
  assert.equal(completed.next.task.id, "surface");
  assert.match(completed.next.inputHashes["outline.js"], /^sha256:/);
  action = completed.next;
  artifact = visualEvidence(fixture, action);
  const done = decideVisualTask(fixture.dir, { choice: "surface", verdict: "complete", artifact });
  assert.equal(done.next.type, "done");
  assert.equal(done.next.visualAcceptance, "not-evaluated");
  const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
  assert.equal(inspectConsistency(state, fs.readFileSync(path.join(fixture.dir, "events.jsonl"), "utf8")).status, "consistent");
  assert.equal(fs.existsSync(path.join(fixture.dir, ".design-pipeline/state.json")), false);
});

test("native visual completion rejects unbound checks and stale passed reports", () => {
  const fixture = visualFixture(), action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  const artifact = visualEvidence(fixture, action);
  const metadata = JSON.parse(fs.readFileSync(path.join(fixture.dir, artifact), "utf8"));
  metadata[1].input_hashes["output:outline.js"] = "sha256:" + "f".repeat(64);
  touch(fixture.dir, artifact, canonicalJson(metadata));
  const rejected = decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "complete", artifact });
  assert.equal(rejected.next.task.id, "outline");
  assert.match(rejected.failure, /input|output|binding/);
  visualEvidence(fixture, action, { status: "passed", checks: [] });
  assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).next.task.id, "outline");
});

test("native visual completion never promotes inconclusive, skipped or stale check rows", () => {
  for (const status of ["inconclusive", "skipped", "stale"]) {
    const fixture = visualFixture(), action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    const artifact = visualEvidence(fixture, action, { status: "passed", checks: [{ id: "runtime", status }] });
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).next.task.id, "outline", status);
  }
});

test("native visual task progress stays inside the implementation phase", () => {
  const fixture = visualFixture("tasks");
  assert.throws(() => nextVisualTask(fixture.dir, { plan: fixture.plan }), /implementation/);
  assert.throws(() => decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "reject", answer: "Need work." }), /implementation/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).phase, "tasks");
});

test("native visual reference drift invalidates downstream while retaining old artifact evidence", () => {
  const fixture = visualFixture();
  for (const id of ["outline", "surface"]) {
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    assert.equal(action.task.id, id);
    decideVisualTask(fixture.dir, { plan: fixture.plan, choice: id, verdict: "complete", artifact: visualEvidence(fixture, action) });
  }
  touch(fixture.dir, "reference.json", '{"outline":"angular"}');
  assert.equal(nextVisualTask(fixture.dir).task.id, "outline");
  const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks;
  assert.equal(progress.completed.outline.status, "stale");
  assert.equal(progress.completed.surface.status, "stale");
  assert.ok(progress.completed.outline.artifacts.length);
});

test("native visual guide drift invalidates completed work and missing declared inputs block dispatch", t => {
  const fixture = visualFixture();
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  for (const id of ["outline", "surface"]) {
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    assert.match(action.inputHashes["references/reference-spec.md"], /^sha256:/);
    decideVisualTask(fixture.dir, { choice: id, verdict: "complete", artifact: visualEvidence(fixture, action) });
  }
  touch(fixture.dir, "references/reference-spec.md", "Corrected wheel entry and adaptation instructions.");
  assert.equal(nextVisualTask(fixture.dir).task.id, "outline");
  const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks;
  assert.equal(progress.completed.outline.status, "stale");
  assert.equal(progress.completed.surface.status, "stale");
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].inputs.push("assets/rebuilt-character.svg");
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const blocked = nextVisualTask(fixture.dir);
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.blockers[0], /rebuilt-character/);
  touch(fixture.dir, "assets/rebuilt-character.svg", "<svg></svg>");
  assert.equal(nextVisualTask(fixture.dir).status, undefined);
});

test("native video visual tasks bind real local evidence at dispatch and recheck it at completion", {
  skip: !["ffmpeg", "ffprobe"].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0),
}, t => {
  const fixture = visualFixture();
  t.after(() => fs.rmSync(fixture.dir, { recursive: true, force: true }));
  const created = spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=32x24:rate=10:duration=1", "-c:v", "ffv1", path.join(fixture.dir, "input.mkv")], { windowsHide: true, encoding: "utf8" });
  assert.equal(created.status, 0, created.stderr);
  const sampled = analyzeVideo(fixture.dir, { path: "input.mkv", output: "analysis" });
  const report = sampled.report, reportPath = sampled.descriptor.path;
  const frameIds = report.frames.map(frame => frame.id);
  report.shots = [{ id: "test-shot", startSec: report.sampling.startSec, endSec: report.sampling.endSec, frameIds, targets: [{ target: "main-surface", properties: ["geometry.contour"] }] }];
  report.observations = [{ id: "test-contour", target: "main-surface", property: "geometry.contour", startSec: report.sampling.startSec, endSec: report.sampling.endSec, startState: "Visible outline at the first frame", endState: "Visible outline at the last frame", frameIds, basis: "observed", description: "The test source has visible outlined color regions.", uncertainties: [] }];
  const saveReport = () => touch(fixture.dir, reportPath, canonicalJson(report));
  saveReport();
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases.forEach(phase => {
    phase.visual.property = "geometry.contour";
    phase.visual.references = [reportPath];
    phase.visual.sourceObservation = { report: reportPath, shotId: "test-shot", observationIds: ["test-contour"] };
  });
  const savePlan = () => touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const binding = plan.phases[0].visual.sourceObservation;
  delete plan.phases[0].visual.sourceObservation; savePlan();
  assert.match(nextVisualTask(fixture.dir, { plan: fixture.plan }).blockers[0], /sourceObservation/);
  plan.phases[0].visual.sourceObservation = { ...binding, observationIds: ["not-an-observation"] }; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.sourceObservation = { ...binding, shotId: "wrong-shot" }; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.sourceObservation = binding;
  plan.phases[0].visual.property = "material.roughness"; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.property = "geometry.contour";
  plan.phases[0].visual.target = "other-object"; savePlan();
  assert.equal(nextVisualTask(fixture.dir).status, "blocked");
  plan.phases[0].visual.target = "main-surface"; savePlan();
  let action = nextVisualTask(fixture.dir);
  assert.equal(action.status, undefined, action.blockers?.join("; "));
  assert.equal(action.sourceEvidence.shot.id, "test-shot");
  assert.deepEqual(action.sourceEvidence.observations.map(row => row.id), ["test-contour"]);
  for (const file of [reportPath, "input.mkv", ...report.frames.map(frame => frame.path), "references/reference-spec.md"]) assert.match(action.inputHashes[file], /^sha256:/);
  const artifact = visualEvidence(fixture, action);
  report.observations[0].basis = "unknown";
  report.observations[0].uncertainties = ["The claimed observation needs review."]; saveReport();
  assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact }).status, "blocked", "dispatch evidence cannot conceal report drift before completion");
  report.observations[0].basis = "observed";
  report.observations[0].uncertainties = []; saveReport();
  for (const id of ["outline", "surface"]) {
    action = nextVisualTask(fixture.dir);
    assert.equal(action.task.id, id);
    assert.equal(decideVisualTask(fixture.dir, { choice: id, verdict: "complete", artifact: visualEvidence(fixture, action) }).status, "recorded");
  }
  assert.equal(nextVisualTask(fixture.dir).type, "done");
  fs.appendFileSync(path.join(fixture.dir, "input.mkv"), "changed source bytes");
  const changed = nextVisualTask(fixture.dir);
  assert.equal(changed.status, "blocked");
  const progress = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8")).extensions.visualTasks;
  assert.equal(progress.completed.outline.status, "stale");
  assert.equal(progress.completed.surface.status, "stale");
});

test("native visual rejection stays on the current goal with concrete feedback", () => {
  const fixture = visualFixture();
  nextVisualTask(fixture.dir, { plan: fixture.plan });
  assert.throws(() => decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "reject" }), /answer|feedback/);
  const result = decideVisualTask(fixture.dir, { plan: fixture.plan, choice: "outline", verdict: "reject", answer: "The upper edge is too round." });
  assert.equal(result.next.task.id, "outline");
  assert.match(result.next.feedback, /upper edge/);
});

test("native visual CLI next and decide share the native projection and failed checks do not advance", () => {
  const fixture = visualFixture();
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8" });
    return { exitCode: result.status, value: JSON.parse(result.stdout) };
  };
  assert.equal(run("next").value.stage, "decompose");
  const next = run("next", "--plan", fixture.plan);
  assert.equal(next.exitCode, 0);
  assert.equal(next.value.task.id, "outline");
  let artifact = visualEvidence(fixture, next.value, { status: "failed", checks: ["Missing fixed-time frame."] });
  const failed = run("decide", "--choice", "outline", "--verdict", "complete", "--artifact", artifact);
  assert.equal(failed.exitCode, 2);
  assert.equal(failed.value.next.task.id, "outline");
  artifact = visualEvidence(fixture, next.value);
  const completed = run("decide", "--choice", "outline", "--verdict", "complete", "--artifact", artifact);
  assert.equal(completed.exitCode, 0);
  assert.equal(completed.value.next.task.id, "surface");
  assert.equal(run("next").value.task.id, "surface");
  assert.equal(fs.existsSync(path.join(fixture.dir, ".design-pipeline/state.json")), false);
});

test("public native visual review asks for its exact evidence and advances only after scoped acceptance", () => {
  const fixture = visualFixture();
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].visual.review = true;
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8" });
    return { exitCode: result.status, value: JSON.parse(result.stdout) };
  };
  const action = run("next", "--plan", fixture.plan).value;
  const artifact = visualEvidence(fixture, action);
  const completed = run("decide", "--choice", "outline", "--verdict", "complete", "--artifact", artifact);
  assert.equal(completed.exitCode, 0);
  const review = completed.value.next;
  assert.equal(review.type, "ask");
  assert.equal(review.stage, "visual-review");
  assert.equal(review.task.id, "outline");
  assert.equal(review.technicalCompletion, "passed");
  assert.equal(review.visualAcceptance, "not-evaluated");
  assert.match(review.question, /main-surface.*outline/);
  assert.match(review.record, /--verdict accept\|reject.*--artifact/);
  assert.deepEqual(review.artifacts, JSON.parse(fs.readFileSync(path.join(fixture.dir, artifact), "utf8")));
  assert.deepEqual(review.evidence.outputs.map(item => item.path), ["outline.js"]);
  assert.deepEqual(review.evidence.checks.map(item => item.path), ["outline-check.json"]);
  assert.ok(review.show.includes(path.join(fixture.dir, "outline.js")));
  assert.equal(run("next").value.stage, "visual-review");
  assert.equal(run("decide", "--choice", "surface", "--verdict", "complete", "--artifact", artifact).exitCode, 1);
  assert.equal(run("decide", "--choice", "surface", "--verdict", "reject", "--answer", "A future task cannot be rejected.").exitCode, 1);
  assert.equal(run("decide", "--choice", "outline", "--verdict", "accept").exitCode, 2);
  const accepted = run("decide", "--choice", "outline", "--verdict", "accept", "--artifact", artifact);
  assert.equal(accepted.exitCode, 0);
  assert.equal(accepted.value.visualAcceptance, "not-evaluated");
  assert.equal(accepted.value.review.verdict, "accept");
  assert.equal(accepted.value.review.valid, true);
  assert.match(accepted.value.review.artifactHash, /^sha256:/);
  assert.equal(accepted.value.next.task.id, "surface");
  const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
  assert.equal(inspectConsistency(state, fs.readFileSync(path.join(fixture.dir, "events.jsonl"), "utf8")).status, "consistent");
});

test("native review cannot accept or reject an older completion version", () => {
  const fixture = visualFixture();
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].visual.review = true;
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
  const artifact = visualEvidence(fixture, action);
  touch(fixture.dir, "old-completion.json", fs.readFileSync(path.join(fixture.dir, artifact), "utf8"));
  decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact });
  const newer = JSON.parse(fs.readFileSync(path.join(fixture.dir, artifact), "utf8"));
  newer.forEach(metadata => { metadata.created_at = new Date(Date.parse(metadata.created_at) + 1000).toISOString(); });
  touch(fixture.dir, artifact, canonicalJson(newer));
  decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact });
  const before = fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8");
  for (const verdict of ["accept", "reject"]) {
    const result = decideVisualTask(fixture.dir, { choice: "outline", verdict, artifact: "old-completion.json", answer: "The older outline was wrong." });
    assert.equal(result.status, "blocked", verdict);
    assert.match(result.failure, /completion|snapshot|version|metadata/i);
    assert.equal(result.next.stage, "visual-review");
    assert.equal(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"), before, "an old decision must not change the current evidence or feedback");
  }
  assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact }).next.task.id, "surface");
});

test("public native rejection reopens a completed target and invalidates dependent evidence", () => {
  const fixture = visualFixture();
  const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
  plan.phases[0].invalidates = []; // Explicit extra invalidations cannot hide real dependency lineage.
  plan.phases.forEach(task => { task.visual.review = true; });
  touch(fixture.dir, fixture.plan, canonicalJson(plan));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", fixture.dir, "--change-root", ".", "--json"], { encoding: "utf8" });
    return { exitCode: result.status, value: JSON.parse(result.stdout) };
  };
  for (const id of ["outline", "surface"]) {
    const action = run("next", "--plan", fixture.plan).value;
    const artifact = visualEvidence(fixture, action);
    touch(fixture.dir, `${id}-completion.json`, fs.readFileSync(path.join(fixture.dir, artifact), "utf8"));
    assert.equal(run("decide", "--choice", id, "--verdict", "complete", "--artifact", `${id}-completion.json`).exitCode, 0);
    assert.equal(run("next").value.stage, "visual-review");
    assert.equal(run("decide", "--choice", id, "--verdict", "accept", "--artifact", `${id}-completion.json`).exitCode, 0);
  }
  assert.equal(run("next").value.type, "done");
  assert.equal(run("decide", "--choice", "outline", "--verdict", "reject", "--answer", "A completed version needs its evidence.").exitCode, 2);
  assert.equal(run("next").value.type, "done");
  assert.equal(run("decide", "--choice", "outline", "--verdict", "reject", "--artifact", "outline-completion.json").exitCode, 1);
  const rejected = run("decide", "--choice", "outline", "--verdict", "reject", "--artifact", "outline-completion.json", "--answer", "The upper corner must be less rounded.");
  assert.equal(rejected.exitCode, 2);
  assert.equal(rejected.value.next.task.id, "outline");
  assert.match(rejected.value.next.feedback, /upper corner/);
  assert.ok(rejected.value.next.previousArtifacts.every(metadata => metadata.status === "stale"));
  const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
  assert.equal(state.extensions.visualTasks.completed.outline.status, "stale");
  assert.equal(state.extensions.visualTasks.completed.surface.status, "stale");
  assert.equal(state.extensions.visualTasks.completed.outline.review.valid, false);
  assert.equal(state.extensions.visualTasks.completed.surface.review.valid, false);
  assert.equal(state.extensions.visualTasks.completed.surface.artifacts.length, 2);
  assert.equal(inspectConsistency(state, fs.readFileSync(path.join(fixture.dir, "events.jsonl"), "utf8")).status, "consistent");
  assert.equal(run("decide", "--choice", "surface", "--verdict", "reject", "--answer", "Future repair must wait.").exitCode, 1);
  assert.equal(run("decide", "--choice", "unknown", "--verdict", "reject", "--answer", "No such target.").exitCode, 1);
});

test("native input, output and plan drift invalidate accepted task reviews while preserving their history", () => {
  for (const changed of ["input", "output", "plan"]) {
    const fixture = visualFixture();
    const plan = JSON.parse(fs.readFileSync(path.join(fixture.dir, fixture.plan), "utf8"));
    plan.phases[0].visual.review = true;
    touch(fixture.dir, fixture.plan, canonicalJson(plan));
    const action = nextVisualTask(fixture.dir, { plan: fixture.plan });
    const artifact = visualEvidence(fixture, action);
    decideVisualTask(fixture.dir, { choice: "outline", verdict: "complete", artifact });
    const accepted = decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact });
    assert.equal(accepted.status, "recorded");
    const oldReview = accepted.review;
    if (changed === "input") touch(fixture.dir, "reference.json", '{"outline":"angular"}');
    if (changed === "output") touch(fixture.dir, "outline.js", "a different rendered version");
    if (changed === "plan") { plan.phases[0].goal = "Match the corrected outline."; touch(fixture.dir, fixture.plan, canonicalJson(plan)); }
    const repair = nextVisualTask(fixture.dir);
    assert.equal(repair.stage, "visual-task", changed);
    assert.equal(repair.task.id, "outline");
    const state = JSON.parse(fs.readFileSync(path.join(fixture.dir, "state.json"), "utf8"));
    const review = state.extensions.visualTasks.completed.outline.review;
    assert.deepEqual(review, { ...oldReview, valid: false });
    assert.equal(decideVisualTask(fixture.dir, { choice: "outline", verdict: "accept", artifact }).status, "blocked");
  }
});

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
  const waived = tmp();
  initState(waived, { deliverable: "film", tier: "standard" });
  decide(waived, { stage: "intake", answer: "default" });
  decide(waived, { stage: "reference", answer: "none" });
  decide(waived, { stage: "concept", choice: "1" });
  for (const project of [dir, waived]) {
    touch(project, "reference.md", "Unused scaffold reference note.");
    for (const board of [null, "{}"]) {
      if (board) touch(project, "storyboard.json", board);
      const action = nextAction(project);
      assert.match(action.command, /brief|chosen direction/);
      assert.doesNotMatch(action.command, /observed shots|frame ids|Set reference/);
    }
  }
});

test("replicate film requires material routing before build and returns the recorded route", () => {
  const dir = tmp();
  try {
    initState(dir, { deliverable: "film", tier: "quick", mode: "replicate" });
    touch(dir, "reference.md", "Observed blue enamel, metal bevel and foil color at changing angles.");
    touch(dir, "storyboard.json", JSON.stringify({}));
    recordGate(dir, "storyboard", "passed");
    const missing = nextAction(dir);
    assert.equal(missing.stage, "plan");
    assert.match(missing.command, /storyboard.json.rendering/);
    touch(dir, "storyboard.json", JSON.stringify({ rendering: { route: "webgl", requirements: ["clearcoat", "view-dependent-color"], reason: "Enamel reference", samples: [] } }));
    recordGate(dir, "storyboard", "passed");
    const build = nextAction(dir);
    assert.equal(build.stage, "build");
    assert.match(build.command, /clearcoat.*view-dependent-color.*webgl/);
    assert.match(build.command, /enamel.mjs/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
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

test("replicate film adapts the scaffold before building and reference edits reopen the plan", () => {
  const dir = tmp();
  initState(dir, { deliverable: "film", tier: "quick", mode: "replicate" });
  touch(dir, "reference.md", "Source shot: the badge turns; separate its base and enamel face. Asset gaps: edge thickness.");
  const board = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
  board.id = "renamed-example";
  board.rendering = { route: "webgl", requirements: [], reason: "Recorded route for a controlled test", samples: [] };
  touch(dir, "storyboard.json", JSON.stringify(board));
  recordGate(dir, "storyboard", "passed");
  const runNext = () => {
    const result = spawnSync(process.execPath, [cli, "next", "--root", dir, "--project-root", dir, "--json"], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };
  const unadapted = runNext();
  assert.equal(unadapted.stage, "plan", "a structurally passing renamed sample is still the source example");
  assert.match(unadapted.command, /reference\.md/);
  assert.match(unadapted.command, /subject.*productAction.*transformation/);
  assert.ok(unadapted.guides.includes("references/product-film-direction.md#from-reference-to-producible-shots"));
  board.beats[0].subject = "badge enamel face";
  board.beats[0].productAction = "The enamel face turns into the light";
  touch(dir, "storyboard.json", JSON.stringify(board));
  recordGate(dir, "storyboard", "passed");
  assert.equal(runNext().stage, "build", "template detection is not semantic or visual acceptance");
  const later = new Date(Date.now() + 1000);
  fs.utimesSync(path.join(dir, "reference.md"), later, later);
  assert.equal(runNext().stage, "plan", "changed source notes invalidate the prior plan check");
});

test("quick frontend replication observes the reference before existing output and cannot waive it", () => {
  for (const deliverable of ["web", "ui"]) {
    const dir = tmp();
    try {
      initState(dir, { deliverable, tier: "quick", mode: "replicate" });
      touch(dir, "index.html");
      const observed = nextAction(dir);
      assert.equal(observed.stage, "reference", `${deliverable} must observe before continuing existing output`);
      assert.equal(observed.then, undefined);
      assert.match(observed.command, /reference-spec\.md/);
      assert.match(observed.command, /reconstruction-spec\.md/);
      assert.match(observed.command, /bounded graybox/);
      assert.match(observed.command, /document delivery.*not.*verified observation/);
      assert.throws(() => decide(dir, { stage: "reference", answer: "none" }), /replicate mode cannot skip/);
      touch(dir, "reference.md", "Observed structure and motion; measurements remain to be checked.");
      recordGate(dir, "reference", "failed");
      assert.equal(nextAction(dir).stage, deliverable === "web" ? "probe" : "work", "aggregate checks must not deadlock observation before graybox exists");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("frontend replication uses the reference at every tier without replacement concept selection", () => {
  for (const deliverable of ["web", "ui"]) {
    for (const tier of ["quick", "standard", "full"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable, tier, mode: "replicate" });
        if (tier !== "quick") decide(dir, { stage: "intake", answer: "default" });
        assert.equal(nextAction(dir).stage, "reference");
        touch(dir, "reference.md");
        const build = nextAction(dir);
        assert.equal(build.stage, deliverable === "web" ? "build" : "work");
        assert.match(build.command, /reference.*invariants/);
        assert.doesNotMatch(build.command, /chosen concept/);
        assert.equal(/OpenSpec change/.test(build.command), tier === "full");
        assert.equal(readState(dir).decisions.concept, undefined);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  }
});

test("frontend actions define bounded visual tasks and keep polish dependent on complete existing checks", () => {
  for (const deliverable of ["web", "ui"]) {
    const dir = tmp();
    try {
      initState(dir, { deliverable, tier: "quick", mode: "replicate" });
      touch(dir, "reference.md");
      const build = nextAction(dir);
      assert.match(build.command, /tasks\.md/);
      for (const field of ["reference region", "scene node", "goal", "invariants", "inputs", "literal modification scope", "outputs", "runtime", "comparison", "failure return"]) {
        assert.ok(build.command.includes(field), `${deliverable} task instruction must include ${field}`);
      }
      assert.match(build.command, /bounded graybox.*structure and occlusion/);
      assert.match(build.command, /complete results.*reference check.*reconstruction check.*scene check/);
      assert.match(build.command, /not ready.*repair.*before material.*polish.*motion/);
      assert.equal(nextAction(dir).stage, build.stage, "task instructions do not create a file-existence completion gate");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("brief and freeform frontend work preserve their quick and concept workflows", () => {
  for (const mode of ["brief", "freeform"]) {
    for (const deliverable of ["web", "ui"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable, tier: "quick", mode });
        assert.equal(nextAction(dir).stage, deliverable === "web" ? "build" : "work");
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    for (const tier of ["standard", "full"]) {
      const dir = tmp();
      try {
        initState(dir, { deliverable: "web", tier, mode });
        decide(dir, { stage: "intake", answer: "default" });
        decide(dir, { stage: "reference", answer: "none" });
        assert.equal(nextAction(dir).stage, "concepts");
        touch(dir, "concepts.md");
        assert.equal(nextAction(dir).type, "ask");
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
  }
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
