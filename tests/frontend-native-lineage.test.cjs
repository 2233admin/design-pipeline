"use strict";

// Consumer/byte-lineage regressions, not owner Visual Acceptance. Component screenshots and
// snapshot digests are structural fixtures. Native completion uses the real browser verifier
// for a tiny state-only journey; no supplied passing report or substituted observer is trusted.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { canonicalJson, sha256 } = require("../skill/scripts/contract-utils.cjs");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { advanceChange, createInitialState, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { bindStateFrontend, decide, decideVisualTask, initState, nextAction, nextVisualTask, readState } = require("../skill/scripts/workflow-core.cjs");
const { nativeFrontendStatus } = require("../skill/scripts/workflows/frontend.cjs");
const { checkComponentFirstGate } = require("../skill/scripts/component-first-core.cjs");
const { checkV2Artifact, migrateV1ToV2 } = require("../skill/scripts/component-first-v2-core.cjs");
const { validateArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { createComponentFirstFixture } = require("./fixtures/component-first-fixture.cjs");
const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");

// Same resolution the rest of the suite uses (e.g. tests/workflow-next.test.cjs): an explicit,
// repo-root-resolved puppeteer-core module and Chrome path, so real browser-backed completion in
// this file does not depend on an unrelated fixture directory's own module-resolution ancestry.
let REAL_BROWSER_TOOLS;
function realBrowserTools() {
  if (REAL_BROWSER_TOOLS) return REAL_BROWSER_TOOLS;
  resolvePuppeteer(process.cwd(), process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
  const chrome = resolveChrome();
  const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE
    ? path.resolve(process.env.DESIGN_PIPELINE_PUPPETEER_MODULE)
    : require.resolve("puppeteer-core", { paths: [process.cwd()] });
  REAL_BROWSER_TOOLS = { chrome, puppeteerModule };
  return REAL_BROWSER_TOOLS;
}

const REFERENCES = path.resolve(__dirname, "../skill/references");
const OWNER_REPLY = "Build this frontend from scratch with a project-owned custom design system.";
const PROTECTED = ["directions", "design-spec", "motion-spec", "tasks", "implementation", "gate-review", "verification", "release-readiness"];
const RUNTIME = new Set(["implementation", "gate-review", "verification", "release-readiness"]);
const write = (root, rel, bytes) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
};
const json = (root, rel, value) => write(root, rel, canonicalJson(value));
const load = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const hashFile = (root, rel) => "sha256:" + sha256(fs.readFileSync(path.join(root, rel)));
const timestamp = () => new Date().toISOString();

function temporary(t, prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  return fs.realpathSync.native(root);
}

function cli(root, args) {
  const result = execute([...args, "--root", root, "--project-root", root, "--json"]);
  assert.equal(result.exitCode, 0, JSON.stringify(result.output));
  return result.output;
}

function frontendProject(t, deliverable = "ui", root = temporary(t, "native-frontend-project-")) {
  initState(root, { deliverable, tier: "quick", purpose: "new", query: OWNER_REPLY });
  assert.equal(nextAction(root).stage, "observe");
  return root;
}

function finishEntry(root) {
  decide(root, { stage: "observe", answer: "The bounded static source inspection and exclusions were delivered. No rendered appearance or Visual Acceptance is claimed." });
  assert.equal(nextAction(root).stage, "intake");
  decide(root, { stage: "intake", choice: "skip", answer: OWNER_REPLY });
  assert.equal(nextAction(root).stage, "design-system");
}

// Resolve and publish through the CLI with actual on-disk request/catalog/stack bytes.
// In particular, owner-scratch has no capability search requirement.
function publish(root, { stackRequest, reference = false } = {}) {
  json(root, "frontend-stack-request.json", stackRequest || {
    schema: "design-pipeline.frontend-stack-request.v1", framework: "react",
    brief: OWNER_REPLY, requested: { styling: "none", uiLibrary: "none" },
  });
  cli(root, ["design-system", "resolve-stack", "--artifact", "frontend-stack-request.json", "--write", "--output", "frontend-stack-decision.json"]);
  const catalog = reference ? normalizeSnapshot({
    schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "structural-reference",
    provenance: { source: "https://example.test/reference-system", license: "MIT" },
    components: [{ id: "Dialog", name: "Dialog", status: "stable", description: "An app dialog used only as a design reference." }],
  }) : normalizeSnapshot(JSON.parse(fs.readFileSync(path.join(REFERENCES, "astryx-design-system-snapshot.json"), "utf8")));
  json(root, "design-system-catalog.json", catalog);
  const id = "structural-reference:component:Dialog";
  const selection = reference ? {
    basis: "capability-search",
    authority: { actor: "agent", source: "request", text: "Compare a dialog without adopting its runtime system.", choice: "reference" },
    rationale: "The actual capability search identifies a useful dialog reference.",
    compatibility: "Reference-only research adds no runtime dependency.",
    compared: [{ id, reason: "Compared the dialog structure and its non-runtime role." }],
  } : {
    basis: "owner-scratch", authority: { actor: "owner", source: "reply", text: OWNER_REPLY, choice: "custom" },
    rationale: "The owner explicitly chose a project-owned system from scratch.", compared: [],
  };
  if (reference) cli(root, ["design-system", "decompose", "--query", "app dialog", "--catalog", "design-system-catalog.json", "--write", "--output", "capability-inventory.json"]);
  json(root, "design-system-request.json", {
    schema: "design-pipeline.design-system-decision-request.v1", version: "1", mode: reference ? "reference" : "custom",
    project: {}, selection, frontendStackDecisionPath: "frontend-stack-decision.json",
    ...(reference ? { candidateId: id, capabilityInventoryPath: "capability-inventory.json" } : {}),
  });
  const decision = cli(root, ["design-system", "decide", "--artifact", "design-system-request.json", "--catalog", "design-system-catalog.json", "--write", "--output", "design-system-decision.json"]).decision;
  assert.equal(decision.status, "ready");
  assert.equal(decision.frontendStackDecision.status, "ready");
  if (!reference) assert.equal(decision.capabilityInventory, null);
  return decision;
}

function consume(root, options = {}) {
  const decision = publish(root, options);
  decide(root, { stage: "design-system", artifact: "design-system-decision.json", ...(options.reference ? {} : { answer: OWNER_REPLY }) });
  assert.equal(readState(root).decisions.designSystem.path, "design-system-decision.json");
  return decision;
}

function nativeChange(t, projectRoot, { phase = "implementation", bind = true, visual = false, dir = temporary(t, "native-frontend-change-"), target = "card.html" } = {}) {
  // Existing fixtures isolate task work; source lifecycle regressions deliberately share roots.
  writeNewChange(path.join(dir, "state.json"), path.join(dir, "events.jsonl"), createInitialState({
    changeId: "frontend-native-lineage", timestamp: timestamp(), phase,
    status: RUNTIME.has(phase) ? "implementing" : "planning",
    ...(bind ? { frontend: { projectRoot, deliverable: readState(projectRoot).deliverable } } : {}),
  }));
  if (visual) {
    write(dir, "reference.md", "Keep the card action and its confirmed state. Structural task fixture only.\n");
    write(dir, "guide.md", "Check the declared state journey separately from owner visual acceptance.\n");
    json(dir, "card-probe.json", {
      schema: "design-pipeline.interaction-probe.v1", id: "native-card", url: target,
      probes: [{ id: "confirm", target: "#card", steps: [
        { id: "initial", assertions: [{ selector: "#result", kind: "text", equals: "Pending" }], timeoutMs: 100 },
        { id: "confirm", input: { kind: "click", selector: "#confirm" }, assertions: [{ selector: "#result", kind: "text", equals: "Confirmed" }], timeoutMs: 100 },
      ] }],
    });
    json(dir, "visual-plan.json", {
      schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "frontend-native-lineage",
      input_hash: hashFile(dir, "reference.md"), mode: "clone", fidelity: "exact",
      phases: [{
        id: "card", depends_on: [], inputs: ["reference.md", "card-probe.json"], outputs: [target], gates: [],
        goal: "Preserve the card's confirmation action and visible confirmed state.",
        visual: { target: "confirmation-card", property: "layout", references: ["reference.md"], scope: [target], guides: ["guide.md"], checks: ["card-check.json"], review: true,
          verification: [{ kind: "interaction", probe: "card-probe.json", target, check: "card-check.json" }] },
      }],
    });
    for (const args of [["init", "-q"], ["config", "user.name", "Native Frontend Test"], ["config", "user.email", "native-frontend@example.invalid"], ["add", "."], ["commit", "-qm", "native structural fixture baseline"]]) {
      const result = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", windowsHide: true });
      assert.equal(result.status, 0, result.stderr || result.error?.message);
    }
  }
  return dir;
}

function advance(dir, extra = {}) {
  return advanceChange(path.join(dir, "state.json"), path.join(dir, "events.jsonl"), {
    expectedSha256: sha256(fs.readFileSync(path.join(dir, "state.json"))), timestamp: timestamp(),
    type: "native-consumer-test", summary: "Record through the native state consumer.", ...extra,
  });
}

function assertFrontendBlocked(action) {
  assert.equal(action.type, "blocked", JSON.stringify(action));
  assert.equal(action.stage, "design-system");
  assert.equal(action.blocker.kind, "frontend-design-system");
  assert.equal(action.visualAcceptance, "not-evaluated");
}

for (const deliverable of ["web", "ui"]) {
  test(`${deliverable} native protected phases reject missing entry, unconsumed and merely published decisions`, t => {
    const root = frontendProject(t, deliverable);
    for (const prerequisite of ["missing-entry", "unconsumed", "published-only"]) {
      if (prerequisite === "unconsumed") finishEntry(root);
      if (prerequisite === "published-only") publish(root);
      for (const phase of PROTECTED) {
        const dir = nativeChange(t, root, { phase });
        const stateBefore = fs.readFileSync(path.join(dir, "state.json"));
        const eventsBefore = fs.readFileSync(path.join(dir, "events.jsonl"));
        assert.throws(() => advance(dir, { phase }), { code: "BLOCKED" }, `${prerequisite}: ${phase}`);
        assert.deepEqual(fs.readFileSync(path.join(dir, "state.json")), stateBefore);
        assert.deepEqual(fs.readFileSync(path.join(dir, "events.jsonl")), eventsBefore);
      }
    }
    decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: OWNER_REPLY });
    for (const phase of PROTECTED) {
      const dir = nativeChange(t, root, { phase });
      const recorded = advance(dir, { phase });
      assert.equal(recorded.state.revision, 1, phase);
      assert.equal(nativeFrontendStatus(recorded.state, { runtime: RUNTIME.has(phase) }).status, "ready", phase);
      assert.equal(recorded.state.extensions.frontend.evidence.decisionPath, "design-system-decision.json");
    }
  });
}

test("reference-only exploratory authority permits native planning but never implementation, QA or release", t => {
  const root = frontendProject(t);
  finishEntry(root);
  const decision = consume(root, { reference: true });
  assert.equal(decision.mode, "reference");
  assert.equal(decision.projectAuthority, null);
  for (const phase of PROTECTED) {
    const dir = nativeChange(t, root, { phase });
    if (RUNTIME.has(phase)) assert.throws(() => advance(dir, { phase }), { code: "BLOCKED" }, phase);
    else assert.equal(advance(dir, { phase }).state.phase, phase);
  }
  const dir = nativeChange(t, root, { bind: false, visual: true });
  assertFrontendBlocked(nextVisualTask(dir, { projectRoot: root, plan: "visual-plan.json" }));
  assertFrontendBlocked(nextVisualTask(dir));
  assertFrontendBlocked(decideVisualTask(dir, { choice: "card", verdict: "complete" }));
  assert.equal(load(dir, "state.json").extensions.visualTasks.completed.card, undefined);
});

test("direct legacy and resumed native visual-task entry bind the actual frontend instead of inferring authority from task media", t => {
  const root = frontendProject(t);
  const dir = nativeChange(t, root, { bind: false, visual: true, dir: root });
  assertFrontendBlocked(decideVisualTask(dir, { projectRoot: root, plan: "visual-plan.json", choice: "card", verdict: "complete" }));
  assert.equal(load(dir, "state.json").extensions.frontend.projectRoot, root);
  assertFrontendBlocked(nextVisualTask(dir));
  finishEntry(root);
  publish(root);
  assertFrontendBlocked(nextVisualTask(dir));
  decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: OWNER_REPLY });
  const action = nextVisualTask(dir);
  assert.equal(action.stage, "visual-task");
  assert.equal(action.type, "run");
  assert.equal(action.status, undefined, JSON.stringify(action));
  assert.match(action.inputHashes.$frontend, /^sha256:[a-f0-9]{64}$/);
  assert.equal(nextVisualTask(dir).inputHashes.$frontend, action.inputHashes.$frontend, "resumption uses the persisted actual-project binding");
  fs.unlinkSync(path.join(root, "design-system-request.json"));
  assertFrontendBlocked(decideVisualTask(dir, { choice: "card", verdict: "complete" }));
  assertFrontendBlocked(nextVisualTask(dir));
});

test("cross-root native output scopes cannot borrow authority from a different frontend tree", t => {
  const root = frontendProject(t);
  const dir = nativeChange(t, root, { visual: true });
  finishEntry(root);
  consume(root);
  const action = nextVisualTask(dir, { plan: "visual-plan.json" });
  assert.equal(action.status, "blocked", JSON.stringify(action));
  assert.match(JSON.stringify(action), /frontend output scope must stay inside/);
  assert.equal(load(dir, "state.json").extensions.visualTasks.active, undefined);
  assert.equal(fs.existsSync(path.join(root, "card.html")), false);
});

for (const deliverable of ["film", "edit"]) {
  test(`unbound ${deliverable} native phase and visual controls retain their existing behavior`, t => {
    const root = temporary(t, "unbound-native-project-");
    initState(root, { deliverable, tier: "quick" });
    const dir = nativeChange(t, root, { bind: false, visual: true });
    assert.equal(advance(dir).state.phase, "implementation");
    const action = nextVisualTask(dir, { projectRoot: root, plan: "visual-plan.json" });
    assert.equal(action.type, "run", JSON.stringify(action));
    assert.equal(action.stage, "visual-task");
    assert.equal(action.status, undefined);
    assert.equal(action.inputHashes.$frontend, undefined);
    assert.equal(load(dir, "state.json").extensions.frontend, undefined);
  });
}

const CHANGES = [
  ["removed decision", "design-system-decision.json", null],
  ["changed decision authority", "design-system-decision.json", value => { value.projectAuthority.source = "replaced-project-authority.md"; }],
  ["removed request", "design-system-request.json", null],
  ["removed catalog", "design-system-catalog.json", null],
  ["changed request rationale", "design-system-request.json", value => { value.selection.rationale = "The owner changed the design-system selection rationale."; }],
  ["changed catalog provenance", "design-system-catalog.json", value => { value.entries[0].provenance.source = "https://example.test/replaced-catalog"; }],
  ["changed stack source", "frontend-stack-decision.json", value => { value.selected.styling.label = "Revised source styling identity"; }],
];
function mutate(root, rel, change) {
  if (!change) fs.unlinkSync(path.join(root, rel));
  else { const value = load(root, rel); change(value); json(root, rel, value); }
}

// Unlike a seeded ready/review flag, this baseline completes and accepts through the real
// public consumer. It requires the same Chrome + puppeteer-core tooling as native completion.
function completedNative(t) {
  const root = frontendProject(t);
  const dir = nativeChange(t, root, { visual: true, dir: root });
  finishEntry(root);
  consume(root);
  const action = nextVisualTask(dir, { plan: "visual-plan.json" });
  assert.equal(action.status, undefined, JSON.stringify(action));
  assert.equal(action.stage, "visual-task");
  // These are technical phase records, not design approval flags. Preserve a non-frontend
  // record as a contrast to downstream protected-phase invalidation.
  advance(dir, { control: { phaseStatus: "ready", outcome: "complete", phases: Object.fromEntries(["repo-read", ...PROTECTED].map(phase => [phase, { status: "ready", evidence: ["reference.md"] }])) } });
  write(dir, "card.html", '<!doctype html><meta charset="utf-8"><main id="card"><button id="confirm">Confirm</button><output id="result">Pending</output></main><script>document.querySelector("#confirm").onclick=()=>{document.querySelector("#result").textContent="Confirmed";};</script>');
  const completed = decideVisualTask(dir, { choice: "card", verdict: "complete", artifact: action.metadataPath, ...realBrowserTools() });
  assert.equal(completed.status, "recorded", JSON.stringify(completed));
  assert.equal(completed.next.stage, "visual-review", JSON.stringify(completed));
  const accepted = decideVisualTask(dir, { choice: "card", verdict: "accept", artifact: action.metadataPath });
  assert.equal(accepted.status, "recorded", JSON.stringify(accepted));
  assert.equal(accepted.next.type, "done");
  const record = load(dir, "state.json").extensions.visualTasks.completed.card;
  assert.equal(record.review.valid, true);
  assert.equal(record.observation.kind, "interaction");
  assert.equal(record.inputHashes.$frontend, action.inputHashes.$frontend);
  assert.ok(record.artifacts.every(artifact => artifact.input_hashes.$frontend === action.inputHashes.$frontend));
  assert.equal(accepted.visualAcceptance, "not-evaluated");
  return { root, dir, digest: action.inputHashes.$frontend };
}

const SOURCE_TARGET = "src/card.html";
const CARD_SOURCE = '<!doctype html><meta charset="utf-8"><main id="card"><button id="confirm">Confirm</button><output id="result">Pending</output></main><script>document.querySelector("#confirm").onclick=()=>{document.querySelector("#result").textContent="Confirmed";};</script>';

function frontendAuthority(root) {
  const state = readState(root);
  return canonicalJson({
    request: state.frontend.request,
    observation: state.decisions.frontendObservation,
    purpose: state.decisions.frontendPurpose,
    designSystem: state.decisions.designSystem,
  });
}

function sourceNative(t, existing = true) {
  const root = temporary(t, "native-frontend-source-");
  fs.mkdirSync(path.join(root, "src"));
  if (existing) write(root, SOURCE_TARGET, '<!doctype html><main id="card"><button id="confirm" disabled>Confirm</button><output id="result">Pending</output></main>');
  initState(root, { deliverable: "ui", tier: "quick", purpose: existing ? "optimize-existing" : "new", scope: "src", query: OWNER_REPLY });
  // Establish Git discovery before observing, and keep both state files in their existing locations:
  // workflow-state.v1 at .design-pipeline/state.json, native change state at state.json.
  nativeChange(t, root, { visual: true, dir: root, target: SOURCE_TARGET });
  const observation = nextAction(root);
  assert.equal(observation.stage, "observe");
  assert.deepEqual(observation.observation.scope, ["src"]);
  assert.deepEqual(observation.observation.files.map(file => file.path), existing ? [SOURCE_TARGET] : []);
  finishEntry(root);
  consume(root);
  return { root, authority: frontendAuthority(root) };
}

function dispatchSource(root) {
  const action = nextVisualTask(root, { plan: "visual-plan.json", projectRoot: root });
  assert.equal(action.type, "run", JSON.stringify(action));
  assert.equal(action.stage, "visual-task", JSON.stringify(action));
  assert.equal(action.task.id, "card");
  assert.equal(action.status, undefined, JSON.stringify(action));
  assert.equal(action.visualAcceptance, "not-evaluated");
  return action;
}

for (const existing of [true, false]) {
  const lifecycle = existing ? "edits an observed source" : "creates a declared in-scope source output";
  test(`native frontend ${lifecycle}, completes real interaction receipts and resumes without reopening immutable entry`, t => {
    const { root, authority } = sourceNative(t, existing);
    const action = dispatchSource(root);
    write(root, SOURCE_TARGET, CARD_SOURCE);
    assert.notEqual(nextAction(root).stage, "observe", "authorized task work must not invalidate its observed entry");
    assert.equal(frontendAuthority(root), authority, "source authorization must not rewrite observation or owner decisions");
    assert.equal(nativeFrontendStatus(load(root, "state.json"), { runtime: true }).status, "ready");

    const completed = decideVisualTask(root, { choice: "card", verdict: "complete", artifact: action.metadataPath, ...realBrowserTools() });
    assert.equal(completed.status, "recorded", JSON.stringify(completed));
    assert.equal(completed.next.stage, "visual-review", JSON.stringify(completed));
    assert.equal(completed.visualAcceptance, "not-evaluated", "browser conformance is not owner Visual Acceptance");
    assert.equal(load(root, "card-check.json").status, "passed", "completion must run the existing real interaction verifier");
    const record = load(root, "state.json").extensions.visualTasks.completed.card;
    assert.equal(record.observation.kind, "interaction");
    const output = record.artifacts.find(artifact => artifact.path === SOURCE_TARGET);
    const check = record.artifacts.find(artifact => artifact.path === "card-check.json");
    assert.ok(output && check, "completion must produce both existing output and verifier artifact receipts");
    assert.equal(validateArtifactMetadata(output, { changeRoot: root }).status, "ready");
    assert.equal(validateArtifactMetadata(check, { changeRoot: root }).status, "ready");
    assert.equal(output.artifact_hash, hashFile(root, SOURCE_TARGET));
    assert.equal(check.input_hashes["output:" + SOURCE_TARGET], output.artifact_hash);
    assert.equal(check.input_hashes.$frontend, action.inputHashes.$frontend);

    const accepted = decideVisualTask(root, { choice: "card", verdict: "accept", artifact: action.metadataPath });
    assert.equal(accepted.status, "recorded", JSON.stringify(accepted));
    assert.equal(accepted.next.type, "done", JSON.stringify(accepted));
    assert.equal(accepted.technicalCompletion, "passed");
    assert.equal(accepted.visualAcceptance, "not-evaluated");
    for (let resume = 0; resume < 3; resume++) {
      assert.equal(nextVisualTask(root).type, "done", "resume must not require another observe/decide/complete cycle");
      assert.equal(nativeFrontendStatus(load(root, "state.json"), { runtime: true }).status, "ready");
      assert.notEqual(nextAction(root).stage, "observe");
      assert.notEqual(nextAction(root).stage, "design-system");
      assert.equal(frontendAuthority(root), authority);
    }
    assert.equal(load(root, "state.json").extensions.visualTasks.completed.card.review.valid, true);

    // Output bytes, not a cached ready/review flag, govern the actual completed evidence.
    write(root, SOURCE_TARGET, CARD_SOURCE.replace(">Confirm<", ">Confirm again<"));
    const drift = validateArtifactMetadata(output, { changeRoot: root });
    assert.equal(drift.status, "stale");
    assert.equal(drift.code, "ARTIFACT_HASH_DRIFT");
    const resumed = nextVisualTask(root);
    assert.equal(resumed.type, "run", JSON.stringify(resumed));
    assert.equal(resumed.stage, "visual-task", JSON.stringify(resumed));
    assert.equal(resumed.status, undefined, JSON.stringify(resumed));
    const stale = load(root, "state.json").extensions.visualTasks.completed.card;
    assert.equal(stale.status, "stale");
    assert.equal(stale.review.valid, false);
    assert.ok(stale.artifacts.every(artifact => artifact.status === "stale"));
    assert.equal(frontendAuthority(root), authority);
    assert.equal(nativeFrontendStatus(load(root, "state.json"), { runtime: true }).status, "ready");
    assert.notEqual(nextAction(root).stage, "observe", "output drift reopens native evidence, not immutable entry");
  });
}

const IN_PROGRESS_CHANGES = [
  ["frontend request", root => bindStateFrontend(root, { query: OWNER_REPLY + " Change the product requirements." }), true],
  ["published decision", root => mutate(root, "design-system-decision.json", value => { value.selection.rationale += " changed"; }), true],
  ["decision request", root => mutate(root, "design-system-request.json", value => { value.selection.rationale += " changed"; }), true],
  ["catalog reference", root => mutate(root, "design-system-catalog.json", value => { value.version = "changed"; }), true],
  ["native task reference", root => write(root, "reference.md", "Changed the required card journey during task work.\n"), false],
];

for (const [label, change, frontend] of IN_PROGRESS_CHANGES) {
  test(`native frontend source authorization cannot hide ${label} drift during work`, t => {
    const { root } = sourceNative(t);
    const action = dispatchSource(root);
    write(root, SOURCE_TARGET, CARD_SOURCE);
    change(root);
    const resumed = nextVisualTask(root);
    if (frontend) assertFrontendBlocked(resumed);
    else assert.equal(resumed.status, "blocked", JSON.stringify(resumed));
    const completed = decideVisualTask(root, { choice: "card", verdict: "complete", artifact: action.metadataPath });
    if (frontend) assertFrontendBlocked(completed);
    else assert.equal(completed.status, "blocked", JSON.stringify(completed));
    assert.equal(fs.existsSync(path.join(root, "card-check.json")), false, "changed authority must fail before writing browser success evidence");
    assert.equal(fs.existsSync(path.join(root, action.metadataPath)), false, "changed authority must not produce a completion receipt");
    assert.equal(load(root, "state.json").extensions.visualTasks.completed.card, undefined);
  });
}

for (const operation of ["add", "remove"]) {
  test(`native frontend blocks observed scope ${operation} before task source authorization`, t => {
    const { root } = sourceNative(t);
    if (operation === "add") write(root, "src/unapproved.html", "<!doctype html><main>Unobserved source</main>");
    else fs.rmSync(path.join(root, SOURCE_TARGET));
    assert.equal(nextAction(root).stage, "observe", "scope coverage changes need a fresh observation before authorization");
    assertFrontendBlocked(nextVisualTask(root, { plan: "visual-plan.json", projectRoot: root }));
    assert.equal(fs.existsSync(path.join(root, "card-check.json")), false);
    assert.equal(load(root, "state.json").extensions.visualTasks?.active, undefined, "dispatch must not authorize already-changed source coverage");
  });
}

for (const [label, rel, change] of CHANGES) {
  test(`${label} invalidates native technical artifacts, downstream phase records and accepted reviews before resumed dispatch`, t => {
    const { root, dir } = completedNative(t);
    mutate(root, rel, change);
    assertFrontendBlocked(nextVisualTask(dir));
    const state = load(dir, "state.json"), record = state.extensions.visualTasks.completed.card;
    assert.equal(record.status, "stale");
    assert.equal(record.review.valid, false);
    assert.ok(record.artifacts.every(artifact => artifact.status === "stale"));
    for (const phase of PROTECTED) assert.equal(state.extensions.control.phases[phase].status, "stale", phase);
    assert.equal(state.extensions.control.phases["repo-read"].status, "ready");
    assertFrontendBlocked(decideVisualTask(dir, { choice: "card", verdict: "accept", artifact: "card-completion.json" }));
    assertFrontendBlocked(decideVisualTask(dir, { choice: "card", verdict: "complete" }));
    assert.throws(() => advance(dir, { phase: "implementation" }), { code: "BLOCKED" });
  });
}

for (const [label, rel, change] of CHANGES) {
  test(`${label} stales the migrated component-first stack receipt without changing target, snapshot or policy`, t => {
    const fixture = createComponentFirstFixture(t);
    const root = frontendProject(t, "ui", fixture.projectRoot);
    finishEntry(root);
    consume(root, { stackRequest: fixture.input.stack.request });
    const v1 = checkComponentFirstGate(fixture.input, { projectRoot: root });
    assert.equal(v1.status, "passed", JSON.stringify(v1));
    const stack = v1.stages.find(stage => stage.stage === "stack");
    assert.equal(stack.status, "passed");
    for (const source of ["design-system-decision.json", "design-system-request.json", "design-system-catalog.json", "frontend-stack-decision.json"]) {
      assert.ok(stack.evidenceRefs.some(ref => ref.kind === "design-system" && ref.path === source && ref.sha256 === hashFile(root, source)), source);
    }
    assert.ok(stack.evidenceRefs.some(ref => ref.kind === "frontend-entry"));
    // A byte-backed structural snapshot, not a captured live target or visual verdict.
    const snapshotDigest = hashFile(root, fixture.screenshot.path);
    const v2 = migrateV1ToV2(v1, { snapshotDigest });
    assert.deepEqual(v2.target, { ...v1.target, snapshotDigest, targetIdentityDigest: v2.target.targetIdentityDigest });
    assert.equal(v2.policy.digest, v1.policy.digest);
    assert.equal(v2.receipts.stack.inputDigest, stack.inputDigest);
    assert.deepEqual(v2.receipts.stack.evidenceRefs, stack.evidenceRefs);
    assert.equal(checkV2Artifact(v2, { projectRoot: root, current: { target: v2.target, policy: v2.policy } }).status, "passed");
    const authority = canonicalJson({ target: v2.target, policy: v2.policy });
    mutate(root, rel, change);
    const stale = checkV2Artifact(v2, { projectRoot: root, current: { target: v2.target, policy: v2.policy } });
    assert.equal(stale.status, "blocked", JSON.stringify(stale));
    assert.equal(stale.receipts.stack, "stale");
    assert.ok(stale.findings.some(finding => finding.code === "CF_V2_RECEIPT_STALE" && finding.stage === "stack"));
    assert.ok(!stale.reasonCodes.includes("CF_V2_TARGET_STALE"));
    assert.ok(!stale.reasonCodes.includes("CF_V2_POLICY_STALE"));
    assert.equal(stale.visualAcceptance, "not-evaluated");
    assert.equal(canonicalJson({ target: v2.target, policy: v2.policy }), authority);
    assert.notEqual(checkComponentFirstGate(fixture.input, { projectRoot: root }).status, "passed", "fresh v1 stack dispatch also refuses stale authority");
  });
}

test("republishing and consuming valid changed authority reopens native work and stales a migrated receipt, rather than inheriting its old review", t => {
  const { root, dir, digest } = completedNative(t);
  const request = load(root, "design-system-request.json");
  request.selection.rationale = "The owner clarified the scratch system's authority after the first reviewed implementation.";
  json(root, "design-system-request.json", request);
  const decision = cli(root, ["design-system", "decide", "--artifact", "design-system-request.json", "--catalog", "design-system-catalog.json", "--write", "--output", "design-system-decision.json"]).decision;
  assert.equal(decision.status, "ready");
  decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: OWNER_REPLY });
  const reopened = nextVisualTask(dir);
  assert.equal(reopened.stage, "visual-task");
  assert.equal(reopened.type, "run");
  assert.notEqual(reopened.inputHashes.$frontend, digest);
  const state = load(dir, "state.json");
  assert.equal(state.extensions.visualTasks.completed.card.status, "stale");
  assert.equal(state.extensions.visualTasks.completed.card.review.valid, false);
  for (const phase of PROTECTED) assert.equal(state.extensions.control.phases[phase].status, "stale", phase);
  assert.equal(state.extensions.control.phases["repo-read"].status, "ready");

  const fixture = createComponentFirstFixture(t);
  const stackRoot = frontendProject(t, "ui", fixture.projectRoot);
  finishEntry(stackRoot);
  consume(stackRoot, { stackRequest: fixture.input.stack.request });
  const before = checkComponentFirstGate(fixture.input, { projectRoot: stackRoot });
  assert.equal(before.status, "passed", JSON.stringify(before));
  const receipt = migrateV1ToV2(before, { snapshotDigest: hashFile(stackRoot, fixture.screenshot.path) });
  assert.equal(checkV2Artifact(receipt, { projectRoot: stackRoot }).status, "passed");
  const stackRequest = load(stackRoot, "design-system-request.json");
  stackRequest.selection.rationale = "The owner clarified component-system authority while keeping the actual stack, target and policy.";
  json(stackRoot, "design-system-request.json", stackRequest);
  assert.equal(cli(stackRoot, ["design-system", "decide", "--artifact", "design-system-request.json", "--catalog", "design-system-catalog.json", "--write", "--output", "design-system-decision.json"]).decision.status, "ready");
  decide(stackRoot, { stage: "design-system", artifact: "design-system-decision.json", answer: OWNER_REPLY });
  const fresh = checkComponentFirstGate(fixture.input, { projectRoot: stackRoot });
  assert.equal(fresh.status, "passed", JSON.stringify(fresh));
  assert.notEqual(fresh.stages.find(stage => stage.stage === "stack").inputDigest, before.stages.find(stage => stage.stage === "stack").inputDigest);
  assert.deepEqual(fresh.target, before.target);
  assert.deepEqual(fresh.policy, before.policy);
  const stale = checkV2Artifact(receipt, { projectRoot: stackRoot });
  assert.equal(stale.receipts.stack, "stale");
  assert.equal(stale.visualAcceptance, "not-evaluated");
});
