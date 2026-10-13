"use strict";

// Public frontend consumer contracts. DOM receipts below are structural byte-lineage fixtures,
// not live-browser captures, rendered measurements, or owner Visual Acceptance.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { decide, initState, nextAction, nextVisualTask, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { ARTIFACT_KEYS, validateReceipt } = require("../skill/scripts/evidence-core.cjs");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const flow = require("./helpers/web-flow.cjs");
const frontend = require("../skill/scripts/workflows/frontend.cjs");
const { advanceChange, createInitialState, writeNewChange } = require("../skill/scripts/pipeline-state-core.cjs");
const { createArtifactMetadata } = require("../skill/scripts/artifact-core.cjs");
const { runTo } = require("../skill/scripts/control-runtime-core.cjs");

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const sourceHash = (root, rel) => "sha256:" + hash(fs.readFileSync(path.join(root, rel)));
const write = (root, rel, bytes) => { const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
const json = (root, rel, value) => write(root, rel, JSON.stringify(value, null, 2) + "\n");
const QUERY = "Build a new pricing card from scratch for our bakery, with our existing copy and no component library.";
const SUMMARY = "The inspected source contains bakery preorder content and the pickup action. Only static source was inspected; no rendered layout or visual approval is claimed.";
const EXISTING = {
  "src/App.jsx": 'import "./brand.css";\nexport function App() { return <main><h1>Bakery preorders</h1><button onClick={reserve}>Reserve pickup</button></main>; }\n',
  "src/brand.css": ':root { --brand-color: #184e37; }\n',
  "index.html": '<!doctype html><script type="module" src="./src/App.jsx"></script>\n',
};

function project(t, files = {}, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "frontend-entry-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  for (const [rel, bytes] of Object.entries(files)) write(root, rel, bytes);
  initState(root, { deliverable: "web", tier: "standard", ...options });
  return root;
}

function capture(root, url = "https://reference.example.test/page") {
  const dir = path.join(root, "capture");
  write(root, "capture/dom.html", '<!doctype html><main><h1>Reference page</h1><nav><a href="/products">Products</a></nav></main>\n');
  const receipt = {
    schema: "design-pipeline.evidence-receipt.v1", id: "structural-dom-lineage", status: "partial",
    adapter: { id: "structural-dom-test-fixture", version: "1.0.0", availability: "available", probe: { ok: true, message: "Structural fixture only; no live-browser or visual measurements." } },
    target: { url, viewport: { width: 1280, height: 720 } }, capturedAt: "2026-10-14T08:00:00.000Z",
    artifacts: Object.fromEntries(ARTIFACT_KEYS.map(key => [key, key === "dom" ? "dom.html" : null])),
    hashes: { dom: hash(fs.readFileSync(path.join(dir, "dom.html"))) },
    redaction: { status: "not-required", notes: ["Local structural test data; not a browser proof or Visual Acceptance."] },
  };
  validateReceipt(receipt, { evidenceRoot: dir, requireFiles: true });
  json(root, "capture/evidence.json", receipt);
  return "capture/evidence.json";
}

function observe(root, artifact) {
  return decide(root, { stage: "observe", answer: SUMMARY, ...(artifact ? { artifact } : {}) }).next;
}

function readyIntake(root) {
  if (readState(root).tier === "quick") flow.statedSkip(root, QUERY);
  else { flow.confirmPlayback(root); decide(root, { stage: "reference", answer: "none" }); }
  assert.equal(nextAction(root).stage, "design-system");
}


function referenceDecision(root, retained = false) {
  const catalog = normalizeSnapshot({
    schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "structural-reference",
    provenance: { source: "https://example.test/reference-system", license: "MIT" },
    components: [{ id: "Dialog", name: "Dialog", status: "stable", description: "An app dialog used only as a design reference." }],
  });
  const id = "structural-reference:component:Dialog";
  const decision = flow.publishFrontendDecision(root, {
    mode: "reference", catalog, candidateId: id, searchQuery: "app dialog",
    ...(retained ? { project: { designSystem: { id: "bakery-system", source: "DESIGN.md" } } } : {}),
    selection: {
      basis: "capability-search",
      authority: { actor: "agent", source: "request", text: "Compare the dialog reference without changing the bakery's runtime system.", choice: "reference" },
      rationale: "The actual dialog capability search identifies a useful structural reference.",
      compatibility: "Reference-only research adds no dependency and retains any project-owned system.",
      compared: [{ id, reason: "Compared the dialog structure and checked its non-runtime role." }],
    },
  });
  decide(root, { stage: "design-system", artifact: "design-system-decision.json" });
  return decision;
}

for (const deliverable of ["web", "ui"]) {
  test(`${deliverable} first action inspects the supplied scope without changing source or asking questions`, t => {
    const query = "Improve bakery pickup layout for phone visitors; keep the reservation action and brand green.";
    const root = project(t, { ...EXISTING, "outside.jsx": "export const unrelated = true;", ".env": "SECRET_NOT_FOR_OBSERVATION" }, { deliverable, query, scope: "src", purpose: "optimize-existing" });
    const before = Object.fromEntries(Object.keys(EXISTING).map(rel => [rel, fs.readFileSync(path.join(root, rel))]));
    const stateBefore = fs.readFileSync(path.join(root, ".design-pipeline/state.json"));
    const action = nextAction(root);
    assert.equal(action.type, "run");
    assert.equal(action.stage, "observe");
    assert.equal(action.question, undefined);
    assert.equal(action.observation.method, "bounded-static-heuristic");
    assert.deepEqual(action.observation.scope, ["src"]);
    assert.deepEqual(action.observation.files.map(item => item.path).sort(), ["src/App.jsx", "src/brand.css"]);
    assert.equal(action.observation.query, query);
    assert.equal(action.visualAcceptance, "not-evaluated");
    assert.equal(action.observation.visualAcceptance, "not-evaluated");
    assert.ok(action.observation.discovery.exclusions.length > 0);
    assert.doesNotMatch(JSON.stringify(action.observation), /SECRET_NOT_FOR_OBSERVATION|unrelated = true/);
    assert.deepEqual(fs.readFileSync(path.join(root, ".design-pipeline/state.json")), stateBefore);
    for (const [rel, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(root, rel)), bytes, rel);
    observe(root);
    const state = readState(root);
    assert.equal(state.frontend.request, query);
    assert.equal(state.frontend.scope, "src");
    assert.equal(state.decisions.frontendPurpose.choice, "optimize-existing");
    assert.equal(state.decisions.frontendObservation.observedSourceHashes["src/App.jsx"], sourceHash(root, "src/App.jsx"));
    assert.equal(state.decisions.frontendObservation.visualAcceptance, "not-evaluated");
  });
}

test("empty observation establishes a genuinely new project and states its limited evidence", t => {
  const root = project(t, {}, { query: QUERY });
  const action = nextAction(root);
  assert.equal(action.stage, "observe");
  assert.deepEqual(action.observation.files, []);
  assert.equal(action.observation.status, "partial");
  assert.ok(action.observation.unknowns.some(item => item.code === "NO_SOURCE_READ"));
  assert.equal(action.observation.discovery.counts.read, 0);
  assert.equal(action.observation.visualAcceptance, "not-evaluated");
  observe(root);
  assert.equal(readState(root).decisions.frontendPurpose.choice, "new");
  assert.equal(nextAction(root).stage, "intake");
});

for (const [purpose, query, mode] of [
  ["optimize-existing", "Improve this existing bakery frontend without changing its reservation function or content.", "brief"],
  ["reference-for-existing", "Use the supplied link as inspiration for the existing bakery frontend, not replacement product content.", "brief"],
  ["faithful-reproduction", "Faithfully reproduce the supplied page and preserve its reference invariants.", "replicate"],
]) {
  test(`${purpose} resolves from supplied facts only after byte-backed observation`, t => {
    const url = "https://reference.example.test/page";
    const root = project(t, EXISTING, { query, url });
    assert.equal(nextAction(root).stage, "observe");
    assert.equal(readState(root).decisions.frontendPurpose, undefined);
    const next = observe(root, capture(root, url));
    assert.notEqual(next.stage, "purpose");
    const state = readState(root);
    assert.equal(state.decisions.frontendPurpose.choice, purpose);
    assert.equal(state.mode, mode);
    assert.equal(state.frontend.request, query);
    assert.equal(state.frontend.url, url);
    assert.equal(state.decisions.frontendObservation.inputHashes["capture/dom.html"], sourceHash(root, "capture/dom.html"));
    assert.equal(state.decisions.frontendObservation.inputHashes["capture/evidence.json"], sourceHash(root, "capture/evidence.json"));
    assert.equal(state.decisions.frontendObservation.visualAcceptance, "not-evaluated");
  });
}

test("a materially ambiguous link is observed before clarification, and the actual reply wins on resume", t => {
  const url = "https://reference.example.test/page";
  const root = project(t, EXISTING, { query: "Here is the page for our current bakery frontend.", url });
  assert.throws(() => decide(root, { stage: "purpose", choice: "faithful-reproduction", answer: "Reproduce this page faithfully." }), { code: "WORKFLOW_NOT_READY" });
  const action = observe(root, capture(root, url));
  assert.equal(action.stage, "purpose");
  assert.equal(action.type, "ask");
  assert.equal(readState(root).decisions.frontendPurpose, undefined);
  assert.throws(() => flow.confirmPlayback(root), { code: "WORKFLOW_NOT_READY" });
  const answer = "Reproduce this reference faithfully, keeping its interaction and layout invariants.";
  decide(root, { stage: "purpose", choice: "faithful-reproduction", answer });
  const state = readState(root);
  assert.equal(state.decisions.frontendPurpose.source, "reply");
  assert.equal(state.decisions.frontendPurpose.statement, answer);
  assert.equal(state.decisions.frontendPurpose.choice, "faithful-reproduction");
  assert.equal(state.mode, "replicate");
  assert.equal(nextAction(root).stage, "intake");
  assert.equal(nextAction(root).stage, "intake", "a resumed read must not reinterpret the original ambiguous request");
  assert.equal(readState(root).decisions.frontendPurpose.statement, answer);
});

test("replicate authority rejects conflicting purpose and takes precedence over optimization wording", t => {
  const root = project(t, EXISTING, { mode: "replicate", query: "Improve this existing page." });
  observe(root);
  assert.equal(readState(root).decisions.frontendPurpose.choice, "faithful-reproduction");
  assert.equal(readState(root).mode, "replicate");
  const before = fs.readFileSync(path.join(root, ".design-pipeline/state.json"));
  assert.throws(() => initState(root, { deliverable: "web", tier: "standard", mode: "replicate", purpose: "optimize-existing", query: "Improve this existing page.", replace: true }), /replicate.*conflict|conflict.*purpose/i);
  assert.deepEqual(fs.readFileSync(path.join(root, ".design-pipeline/state.json")), before, "a conflicting request cannot replace the reproduction authority");
});

test("an explicitly supplied purpose cannot be silently overwritten by a late clarification", t => {
  const root = project(t, EXISTING, { purpose: "optimize-existing", query: "Improve the current bakery layout." });
  observe(root);
  const before = fs.readFileSync(path.join(root, ".design-pipeline/state.json"));
  assert.throws(() => decide(root, { stage: "purpose", choice: "faithful-reproduction", answer: "Actually reproduce another page." }), /already explicit|supplied purpose/);
  assert.deepEqual(fs.readFileSync(path.join(root, ".design-pipeline/state.json")), before);
  assert.equal(readState(root).decisions.frontendPurpose.choice, "optimize-existing");
});

for (const deliverable of ["web", "ui"]) {
  test(`${deliverable} quick scratch consumes a real decision without catalog search or a new owner interview`, t => {
    const root = project(t, {}, { deliverable, tier: "quick", query: QUERY, purpose: "new" });
    observe(root);
    const intake = nextAction(root);
    assert.equal(intake.stage, "intake");
    assert.equal(intake.type, "run");
    assert.equal(intake.questions, undefined);
    flow.statedSkip(root, QUERY);
    assert.equal(nextAction(root).stage, "design-system");
    const decision = flow.consumeScratchDecision(root, { authorityText: QUERY, authoritySource: "request" });
    assert.equal(decision.status, "ready");
    assert.equal(decision.selection.basis, "owner-scratch");
    assert.deepEqual(decision.selection.authority, { actor: "owner", source: "request", text: QUERY, choice: "custom" });
    assert.equal(decision.capabilityInventory, null);
    assert.deepEqual(decision.selection.compared, [], "explicit scratch needs no candidate comparison or catalog exhaustion");
    assert.equal(fs.existsSync(path.join(root, "capability-inventory.json")), false);
    assert.equal(readState(root).decisions.frontendPurpose.source, "request");
    assert.equal(readState(root).decisions.frontendObservation.visualAcceptance, "not-evaluated");
    assert.equal(readState(root).decisions.designSystem.visualAcceptance, "not-evaluated");
    assert.equal(nextAction(root).stage, deliverable === "web" ? "components" : "work");
    if (deliverable === "ui") {
      assert.equal(nextAction(root).type, "run");
      const done = decide(root, { stage: "deliver", answer: "A completed UI with its evidence." }).next;
      assert.equal(done.type, "done");
      assert.equal(done.visualAcceptance, "not-evaluated");
    }
    assert.equal(readState(root).decisions.concept, undefined);
  });
}

test("generic UI asks frontend playback rather than film duration, footage or canvas questions", t => {
  const root = project(t, {}, { deliverable: "ui", query: "Build a settings panel for bakery staff." });
  assert.equal(nextAction(root).stage, "observe");
  observe(root);
  const intake = nextAction(root);
  assert.equal(intake.stage, "intake");
  assert.equal(intake.type, "ask");
  assert.equal(typeof intake.question, "string");
  assert.equal(intake.questions, undefined);
  assert.doesNotMatch(intake.question + " " + intake.instruction, /duration|footage|frame rate|aspect ratio/i);
  flow.confirmPlayback(root, "A settings panel for bakery staff to change pickup preferences without a film or narration.");
  assert.equal(fs.existsSync(path.join(root, "brief.md")), false);
  assert.equal(nextAction(root).stage, "design-system");
});

for (const purpose of ["optimize-existing", "faithful-reproduction"]) {
  test(`${purpose} preserves its implementation boundary and historical observation`, t => {
    const root = project(t, EXISTING, { deliverable: "ui", tier: "quick", purpose, query: purpose === "optimize-existing" ? "Improve the layout while keeping bakery content, reserve action and brand green." : "Reproduce the current bakery frontend faithfully with its existing invariants." });
    observe(root);
    flow.statedSkip(root);
    if (purpose === "faithful-reproduction") flow.writeReference(root);
    flow.consumeScratchDecision(root);
    const action = nextAction(root);
    assert.equal(action.stage, "work");
    assert.equal(action.type, "run");
    if (purpose === "optimize-existing") {
      assert.match(action.boundary, /function/i);
      assert.match(action.boundary, /content/i);
      assert.match(action.boundary, /brand/i);
      assert.match(action.boundary, /layout|visual/i);
      assert.equal(readState(root).mode, "brief");
    } else {
      assert.match(action.boundary, /fidelity|faithful/i);
      assert.match(action.boundary, /invariants/i);
      assert.equal(readState(root).mode, "replicate");
      assert.doesNotMatch(action.instruction, /chosen concept/i);
    }
    const record = readState(root).decisions.frontendObservation;
    const snapshot = fs.readFileSync(path.join(root, record.reportPath));
    const originalSourceHash = record.observedSourceHashes["src/App.jsx"];
    write(root, "src/App.jsx", "export function App() { return <main>Implemented revision</main>; }\n");
    assert.equal(nextAction(root).stage, "work", "implementation changes do not reopen the original historical observation");
    assert.deepEqual(fs.readFileSync(path.join(root, record.reportPath)), snapshot);
    assert.equal(readState(root).decisions.frontendObservation.observedSourceHashes["src/App.jsx"], originalSourceHash);
    assert.notEqual(originalSourceHash, sourceHash(root, "src/App.jsx"));
  });
}

test("link observation needs contained, matching, current receipt bytes, not an observed or approved flag", t => {
  const url = "https://reference.example.test/page";
  const root = project(t, EXISTING, { url, purpose: "reference-for-existing" });
  assert.throws(() => decide(root, { stage: "observe", answer: SUMMARY }), /artifact|path|capture|required/i);
  json(root, "claimed.json", { schema: "design-pipeline.evidence-receipt.v1", observed: true, approved: true });
  assert.throws(() => observe(root, "claimed.json"));
  assert.equal(nextAction(root).stage, "observe");
  const artifact = capture(root, "https://wrong.example.test/page");
  assert.throws(() => observe(root, artifact), { code: "FRONTEND_SOURCE_MISMATCH" });
  capture(root, url);
  fs.appendFileSync(path.join(root, "capture/dom.html"), "<!-- changed captured bytes -->\n");
  assert.throws(() => observe(root, artifact), /hashes\.dom.*does not match/);
  assert.equal(readState(root).decisions.frontendObservation, undefined);
  capture(root, url);
  observe(root, artifact);
  assert.notEqual(nextAction(root).stage, "observe");
});

for (const changed of ["capture/dom.html", "capture/evidence.json", "snapshot"]) for (const operation of ["edit", "remove"]) {
  test(`${operation} of ${changed} reopens observation rather than retaining delivered authority`, t => {
    const url = "https://reference.example.test/page";
    const root = project(t, EXISTING, { deliverable: "ui", tier: "quick", url, purpose: "reference-for-existing" });
    observe(root, capture(root, url));
    flow.statedSkip(root);
    flow.consumeScratchDecision(root);
    assert.equal(nextAction(root).stage, "work");
    const rel = changed === "snapshot" ? readState(root).decisions.frontendObservation.reportPath : changed;
    if (operation === "edit") fs.appendFileSync(path.join(root, rel), "\n ");
    else fs.unlinkSync(path.join(root, rel));
    assert.equal(nextAction(root).stage, "observe");
    assert.throws(() => decide(root, { stage: "deliver", answer: "old evidence" }), { code: "WORKFLOW_NOT_READY" });
  });
}

for (const deliverable of ["web", "ui"]) {
  test(`${deliverable} direct or resumed late decisions cannot bypass observation or a consumed decision`, t => {
    const root = project(t, {}, { deliverable, query: QUERY });
    const late = [
      { stage: "intake", verdict: "accept", answer: flow.PLAYBACK },
      { stage: "concept", choice: "A" },
      { stage: "description", verdict: "accept", choice: "first-screen" },
      { stage: "section", verdict: "accept", choice: "first-screen" },
      { stage: "deliver", answer: "finished evidence" },
    ];
    for (const options of late) {
      const before = fs.readFileSync(path.join(root, ".design-pipeline/state.json"));
      assert.throws(() => decide(root, options), { code: "WORKFLOW_NOT_READY" }, options.stage);
      assert.deepEqual(fs.readFileSync(path.join(root, ".design-pipeline/state.json")), before);
    }
    flow.finishFrontendObservation(root);
    flow.confirmPlayback(root);
    if (deliverable === "web") decide(root, { stage: "reference", answer: "none" });
    flow.writeVariants(root);
    flow.writeDescription(root);
    write(root, "index.html", '<!doctype html><section data-section="first-screen">Already built</section>');
    for (const options of late.slice(1)) assert.throws(() => decide(root, options), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" }, options.stage);
    assert.equal(nextAction(root).stage, "design-system", "later files do not authorize a resumed frontend");
    const published = flow.publishFrontendDecision(root);
    assert.equal(published.status, "ready");
    assert.equal(nextAction(root).stage, "design-system", "publication alone is not consumption");
    if (deliverable === "web") assert.throws(() => flow.pickVariant(root), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
  });
}

test("ready booleans, malformed and forged decisions cannot authorize the frontend", t => {
  const root = project(t, {}, { query: QUERY });
  flow.finishFrontendObservation(root);
  readyIntake(root);
  for (const value of [true, { ready: true, approved: true }, { schema: "design-pipeline.design-system-decision.v1", status: "ready", mode: "custom", selected: { id: "invented" } }]) {
    json(root, "claimed-decision.json", value);
    assert.throws(() => decide(root, { stage: "design-system", artifact: "claimed-decision.json", answer: flow.SCRATCH_REPLY }));
    assert.equal(nextAction(root).stage, "design-system");
    assert.equal(readState(root).decisions.designSystem, undefined);
  }
  const decision = flow.publishFrontendDecision(root);
  const forged = structuredClone(decision);
  forged.selected = { id: "unapproved-library", source: "project" };
  json(root, "forged-decision.json", forged);
  assert.throws(() => decide(root, { stage: "design-system", artifact: "forged-decision.json", answer: flow.SCRATCH_REPLY }));
  assert.equal(readState(root).decisions.designSystem, undefined);
  const unbound = structuredClone(decision);
  delete unbound.sourceBindings.inputHashes["frontend-stack-decision.json"];
  json(root, "unbound-decision.json", unbound);
  assert.throws(() => decide(root, { stage: "design-system", artifact: "unbound-decision.json", answer: flow.SCRATCH_REPLY }), /bound|binding|source|stale/i);
  assert.equal(nextAction(root).stage, "design-system");
});

test("a real scratch decision still needs the owner's actual request or reply, not asserted approval", t => {
  const root = project(t, {}, { query: QUERY });
  flow.finishFrontendObservation(root);
  readyIntake(root);
  flow.publishFrontendDecision(root, { authoritySource: "request", authorityText: "Build another page from scratch with a custom system." });
  assert.throws(() => decide(root, { stage: "design-system", artifact: "design-system-decision.json" }), { code: "DESIGN_SYSTEM_OWNER_MISMATCH" });
  flow.publishFrontendDecision(root);
  assert.throws(() => decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: "approved" }), { code: "DESIGN_SYSTEM_OWNER_MISMATCH" });
  assert.equal(readState(root).decisions.designSystem, undefined);
  decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: flow.SCRATCH_REPLY });
  assert.equal(nextAction(root).stage, "concepts");
});

for (const retained of [false, true]) {
  test(`reference research ${retained ? "retains the actual project system for work" : "allows concepts but cannot authorize implementation"}`, t => {
    const root = project(t, retained ? { ...EXISTING, "DESIGN.md": "# Bakery design\nUse the project-owned bakery system and brand green.\n" } : {}, { query: "Build a new bakery page with a dialog." });
    flow.finishFrontendObservation(root, { purpose: "new" });
    readyIntake(root);
    const decision = referenceDecision(root, retained);
    assert.equal(decision.mode, "reference");
    assert.equal(Boolean(decision.projectAuthority), retained);
    if (retained) assert.equal(decision.projectAuthority.id, "bakery-system");
    assert.equal(nextAction(root).stage, "concepts");
    flow.writeVariants(root);
    flow.pickVariant(root);
    decide(root, { stage: "components", choice: "scratch", answer: "Use project-owned markup without adopting the reference candidate." });
    flow.approveDescription(root);
    const build = nextAction(root);
    assert.equal(build.stage, "build");
    assert.equal(build.type, retained ? "run" : "blocked");
    if (!retained) {
      assert.equal(build.blocker.kind, "frontend-design-system");
      write(root, "index.html", '<section data-section="first-screen">Prebuilt</section>');
      assert.throws(() => decide(root, { stage: "section", choice: "first-screen", verdict: "accept" }), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
      assert.throws(() => decide(root, { stage: "deliver", answer: "old delivery" }), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
    } else assert.notEqual(decision.selected.id, decision.projectAuthority.id, "the reference candidate is not the retained runtime authority");
  });
}

function delivered(root, options = {}) {
  flow.finishFrontendObservation(root);
  readyIntake(root);
  flow.consumeScratchDecision(root, options);
  flow.writeVariants(root);
  flow.pickVariant(root);
  decide(root, { stage: "components", choice: "scratch", answer: "Write this page from project-owned markup." });
  flow.approveDescription(root);
  write(root, "index.html", '<!doctype html><section data-section="first-screen"><h1>Bakery</h1></section>');
  json(root, "component-manifest.json", { fromScratch: true, entries: [] });
  assert.equal(flow.acceptSections(root).stage, "probe");
  json(root, "interaction.json", { schema: "design-pipeline.interaction-probe.v1", id: "structural-lineage", url: "index.html", probes: [{ id: "audit", kind: "audit", thresholds: { fonts: ["Inter"] } }] });
  // A public recordGate fixture exercises technical invalidation only, not browser or visual proof.
  recordGate(root, "interaction", "passed", ["index.html", "interaction.json"], {}, { files: ["index.html"], tokens: [], absent: [], remote: [] });
  assert.equal(nextAction(root).stage, "review");
  decide(root, { stage: "review", verdict: "accept" });
  assert.equal(decide(root, { stage: "deliver", answer: "https://example.test/bakery" }).next.type, "done");
}

for (const file of ["design-system-decision.json", "design-system-request.json", "frontend-stack-decision.json", "design-system-catalog.json", "capability-inventory.json"]) for (const operation of ["edit", "remove"]) {
  test(`${operation} of bound ${file} reopens concepts, description, section and technical delivery evidence`, t => {
    const root = project(t, {}, { query: QUERY });
    let decisionOptions = {};
    if (file === "capability-inventory.json") {
      const catalog = normalizeSnapshot({ schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "lineage", provenance: { source: "https://example.test/system", license: "MIT" }, components: [{ id: "Dialog", name: "Dialog", description: "App dialog" }] });
      decisionOptions = { catalog, searchQuery: "app dialog" };
    }
    delivered(root, decisionOptions);
    const before = readState(root);
    assert.equal(before.gates.interaction.status, "passed");
    assert.ok(before.decisions.descriptions.some(item => item.verdict === "accept"));
    assert.ok(before.decisions.sections.some(item => item.verdict === "accept"));
    assert.equal(before.decisions.designSystem.inputHashes[file], sourceHash(root, file));
    const original = fs.readFileSync(path.join(root, file));
    if (operation === "edit") fs.appendFileSync(path.join(root, file), "\n ");
    else fs.unlinkSync(path.join(root, file));
    const reopened = nextAction(root);
    assert.equal(reopened.stage, "design-system");
    assert.notEqual(reopened.verification.status, "ready");
    const invalidated = readState(root);
    assert.equal(invalidated.decisions.concept, undefined);
    assert.equal(invalidated.gates.interaction, undefined);
    assert.equal(invalidated.decisions.delivered, undefined);
    assert.equal(invalidated.decisions.deliveryInputHashes, undefined);
    assert.throws(() => decide(root, { stage: "section", choice: "first-screen", verdict: "accept" }), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
    assert.throws(() => decide(root, { stage: "deliver", answer: "https://example.test/bakery" }), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
    write(root, file, original);
    decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: flow.SCRATCH_REPLY });
    assert.equal(nextAction(root).stage, "concepts", "restoring sources does not restore the old concept acceptance");
    flow.pickVariant(root);
    assert.equal(nextAction(root).stage, "description", "the old description is bound to the previous decision consumption");
    decide(root, { stage: "description", verdict: "accept", choice: "first-screen" });
    assert.equal(nextAction(root).stage, "build");
    assert.equal(nextAction(root).type, "ask", "the old section approval must not return");
    flow.acceptSections(root);
    assert.equal(nextAction(root).stage, "probe", "technical passes and delivery need new evidence too");
  });
}

test("the actual CLI preserves entry facts and rejects an unknown component library instead of guessing", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "frontend-cli-entry-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  write(root, "src/App.jsx", EXISTING["src/App.jsx"]);
  const query = "Improve bakery pickup layout for phone visitors without replacing our brand or reservation action.";
  const url = "https://reference.example.test/entry";
  const call = args => {
    const child = spawnSync(process.execPath, [cli, ...args, "--root", root, "--project-root", root, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
    return { status: child.status, output: JSON.parse(child.stdout), text: child.stdout + child.stderr };
  };
  const entry = call(["next", "--deliverable", "ui", "--tier", "quick", "--query", query, "--url", url, "--scope", "src", "--purpose", "optimize-existing"]);
  assert.equal(entry.status, 0, entry.text);
  assert.equal(entry.output.stage, "observe");
  assert.equal(entry.output.observation.query, query);
  assert.equal(readState(root).frontend.request, query);
  assert.equal(readState(root).frontend.url, url);
  assert.equal(readState(root).frontend.scope, "src");
  assert.equal(readState(root).frontend.suppliedPurpose, "optimize-existing");
  json(root, "unknown-stack.json", { schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief: query, requested: { styling: "none", uiLibrary: "private-unknown-atlas-ui" } });
  const unknown = call(["design-system", "resolve-stack", "--artifact", "unknown-stack.json", "--write", "--output", "unknown-decision.json"]);
  assert.equal(unknown.status, 1, unknown.text);
  assert.equal(unknown.output.ok, false);
  assert.equal(unknown.output.error.code, "CONTRACT_INVALID");
  assert.match(unknown.output.error.message, /UI library/i);
  assert.equal(fs.existsSync(path.join(root, "unknown-decision.json")), false);
  assert.equal(nextAction(root).stage, "observe", "a routing error neither guesses a replacement library nor completes entry");
});

function nativeFixture(root, phase = "implementation", bindFrontend = false) {
  const dir = path.join(root, `native-${phase}`);
  fs.mkdirSync(dir);
  const initial = createInitialState({
    changeId: "frontend-lineage", timestamp: new Date().toISOString(), phase,
    status: phase === "implementation" ? "implementing" : "planning",
    ...(bindFrontend ? { frontend: { deliverable: readState(root).deliverable, projectRoot: fs.realpathSync.native(root) } } : {}),
  });
  writeNewChange(path.join(dir, "state.json"), path.join(dir, "events.jsonl"), initial);
  write(dir, "reference.md", "Structural reference for the bakery pricing card; no rendered measurements or visual acceptance.");
  write(dir, "guide.md", "Keep the pickup action and product content. Verify only the declared task.");
  json(dir, "card-probe.json", { schema: "design-pipeline.interaction-probe.v1", id: "native-card", url: "card.html", probes: [{ id: "audit", kind: "audit", thresholds: { fonts: ["Inter"] } }] });
  const task = {
    id: "card", depends_on: [], inputs: ["reference.md", "card-probe.json"], outputs: ["card.html"], gates: [],
    goal: "Preserve bakery pricing and pickup while improving the card layout.",
    visual: { target: "pricing-card", property: "layout", references: ["reference.md"], scope: ["card.html"], guides: ["guide.md"], checks: ["card-check.json"], verification: [{ kind: "interaction", probe: "card-probe.json", target: "card.html", check: "card-check.json" }] },
  };
  json(dir, "visual-plan.json", { schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "frontend-lineage", input_hash: sourceHash(dir, "reference.md"), mode: "clone", fidelity: "exact", phases: [task] });
  if (phase === "implementation") {
    // A real temporary Git baseline is needed by the existing literal-scope task window.
    for (const args of [["init", "-q"], ["config", "user.name", "Frontend Contract Test"], ["config", "user.email", "frontend@example.invalid"], ["add", "."], ["commit", "-qm", "native fixture baseline"]]) {
      const child = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8", windowsHide: true });
      assert.equal(child.status, 0, child.stderr);
    }
  }
  return dir;
}

test("native frontend task dispatch cannot bypass unconsumed or reference-only decisions", t => {
  for (const selection of ["missing", "reference-only"]) {
    const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
    flow.finishFrontendObservation(root);
    flow.statedSkip(root, QUERY);
    if (selection === "reference-only") referenceDecision(root);
    const dir = nativeFixture(root);
    const action = nextVisualTask(dir, { plan: "visual-plan.json", projectRoot: root });
    assert.equal(action.type, "blocked", selection);
    assert.equal(action.stage, "design-system", selection);
    assert.equal(action.blocker.kind, "frontend-design-system");
    assert.equal(action.visualAcceptance, "not-evaluated");
  }
});

test("native frontend task inputs bind current sources and reopen on decision replacement or removal", t => {
  const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
  flow.finishFrontendObservation(root);
  flow.statedSkip(root, QUERY);
  flow.consumeScratchDecision(root);
  const dir = nativeFixture(root);
  const first = nextVisualTask(dir, { plan: "visual-plan.json", projectRoot: root });
  assert.equal(first.stage, "visual-task");
  assert.equal(first.type, "run");
  assert.equal(first.status, undefined, "the real Git baseline permits the existing scope window");
  assert.match(first.inputHashes.$frontend, /^sha256:[a-f0-9]{64}$/);
  const native = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"));
  assert.equal(native.extensions.frontend.projectRoot, fs.realpathSync.native(root));
  assert.equal(native.extensions.frontend.deliverable, "ui");
  assert.equal(native.extensions.frontend.evidence.digest, first.inputHashes.$frontend);
  for (const file of ["design-system-request.json", "design-system-decision.json", "frontend-stack-decision.json", "design-system-catalog.json"]) {
    assert.equal(native.extensions.frontend.evidence.inputHashes[file], sourceHash(root, file), file);
  }
  flow.consumeScratchDecision(root, { authorityText: "Build the bakery pricing frontend from scratch with a project-owned custom system and green brand." });
  const replacement = nextVisualTask(dir);
  assert.equal(replacement.stage, "visual-task");
  assert.notEqual(replacement.inputHashes.$frontend, first.inputHashes.$frontend, "a real decision replacement changes native task input lineage");
  fs.unlinkSync(path.join(root, "frontend-stack-decision.json"));
  const missing = nextVisualTask(dir);
  assert.equal(missing.stage, "design-system");
  assert.equal(missing.type, "blocked");
  assert.equal(missing.visualAcceptance, "not-evaluated");
});

test("native frontend phases require current input lineage even when a phase was previously ready", t => {
  const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
  flow.finishFrontendObservation(root);
  flow.statedSkip(root, QUERY);
  flow.consumeScratchDecision(root);
  const taskDir = nativeFixture(root);
  const task = nextVisualTask(taskDir, { plan: "visual-plan.json", projectRoot: root });
  assert.equal(task.stage, "visual-task");
  const dir = nativeFixture(root, "directions", true);
  write(dir, "directions.md", "# Bakery directions\nPreserve pricing content and the pickup action.\n");
  json(dir, "plan.json", {
    schema: "design-pipeline.design-plan.v1", schema_version: 1, plan_id: "frontend-directions",
    input_hash: sourceHash(root, "design-system-request.json"), mode: "clone", fidelity: "exact",
    phases: [{ id: "directions", depends_on: [], inputs: [], outputs: ["directions.md"], gates: [] }],
  });
  const metadata = input_hashes => createArtifactMetadata({ path: "directions.md", producer: "directions", input_hashes, dependencies: [], created_at: new Date().toISOString(), status: "ready" }, { changeRoot: dir });
  json(dir, "artifact-manifest.json", [metadata({})]);
  const unbound = runTo(path.join(dir, "plan.json"), dir, "directions");
  assert.equal(unbound.status, "blocked");
  assert.ok(unbound.state.extensions.control.phases.directions.blockers.some(item => item.code === "FRONTEND_DECISION_INPUT_UNBOUND"));
  json(dir, "artifact-manifest.json", [metadata({ $frontend: task.inputHashes.$frontend })]);
  const bound = runTo(path.join(dir, "plan.json"), dir, "directions");
  assert.equal(bound.status, "ready");
  assert.equal(bound.state.extensions.control.phases.directions.status, "ready");
  fs.appendFileSync(path.join(root, "design-system-request.json"), "\n ");
  const stale = runTo(path.join(dir, "plan.json"), dir, "directions");
  assert.equal(stale.status, "blocked");
  assert.ok(stale.state.extensions.control.phases.directions.blockers.some(item => item.code === "FRONTEND_DECISION_NOT_READY"));
  assert.notEqual(stale.state.extensions.control.phases.directions.status, "ready");
});

test("an authorized quick optimization preserves observed project authority without a new owner approval", t => {
  const query = "Optimize the bakery pricing card's spacing for phone visitors; retain our content, pickup action and green brand.";
  const root = project(t, { ...EXISTING, "DESIGN.md": "# Bakery system\nUse project-owned bakery components and brand green; preserve pickup and product content.\n" }, { deliverable: "ui", tier: "quick", query, purpose: "optimize-existing" });
  observe(root);
  const intake = nextAction(root);
  assert.equal(intake.stage, "intake");
  assert.equal(intake.type, "run");
  assert.equal(intake.question, undefined);
  assert.equal(intake.questions, undefined);
  flow.statedSkip(root, query);
  const statement = fs.readFileSync(path.join(root, "DESIGN.md"), "utf8");
  const decision = flow.publishFrontendDecision(root, {
    project: { designSystem: { id: "bakery-system", source: "DESIGN.md", text: statement } },
    selection: {
      basis: "preserve-existing",
      authority: { actor: "agent", source: "project", choice: "bakery-system", text: statement },
      rationale: "The bounded source observation identifies the existing project-owned system; only spacing improvements were authorized.",
      compared: [],
    },
  });
  decide(root, { stage: "design-system", artifact: "design-system-decision.json" });
  assert.equal(decision.selected.id, "bakery-system");
  assert.equal(decision.projectAuthority.id, "bakery-system");
  assert.equal(decision.selection.basis, "preserve-existing");
  assert.equal(decision.capabilityInventory, null);
  const work = nextAction(root);
  assert.equal(work.stage, "work");
  assert.equal(work.type, "run");
  assert.equal(work.question, undefined);
  assert.equal(readState(root).frontend.request, query);
  assert.equal(readState(root).decisions.frontendPurpose.choice, "optimize-existing");
  assert.equal(readState(root).decisions.concept, undefined);
  assert.equal(fs.readFileSync(path.join(root, "src/App.jsx"), "utf8"), EXISTING["src/App.jsx"]);
  assert.equal(fs.readFileSync(path.join(root, "src/brand.css"), "utf8"), EXISTING["src/brand.css"]);
  assert.equal(readState(root).decisions.designSystem.visualAcceptance, "not-evaluated");
});

test("direct native frontend phase records cannot bypass missing entry and decision evidence", t => {
  const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
  const dir = nativeFixture(root, "directions", true);
  const stateFile = path.join(dir, "state.json"), eventsFile = path.join(dir, "events.jsonl");
  const stateBefore = fs.readFileSync(stateFile), eventsBefore = fs.readFileSync(eventsFile);
  assert.throws(() => advanceChange(stateFile, eventsFile, { expectedSha256: hash(stateBefore), timestamp: new Date().toISOString(), phase: "directions", status: "implementing", type: "owner-phase-record", summary: "Attempting to proceed from the persisted frontend phase." }), { code: "BLOCKED" });
  assert.deepEqual(fs.readFileSync(stateFile), stateBefore);
  assert.deepEqual(fs.readFileSync(eventsFile), eventsBefore);
});

for (const change of ["edit", "remove", "add", "add-data", "add-content"]) {
  test(`an unauthorized observed-source ${change} reopens observation and invalidates downstream choices`, t => {
    const root = project(t, EXISTING, { purpose: "optimize-existing", query: "Improve the existing bakery frontend." });
    observe(root);
    readyIntake(root);
    flow.consumeScratchDecision(root);
    flow.writeVariants(root);
    flow.pickVariant(root);
    assert.equal(nextAction(root).stage, "components");
    if (change === "edit") write(root, "src/brand.css", ":root { --brand-color: purple; }\n");
    if (change === "remove") fs.unlinkSync(path.join(root, "src/App.jsx"));
    if (change === "add") write(root, "src/new-route.js", "export const route = '/new';\n");
    if (change === "add-data") json(root, "src/new-content.json", { title: "Unobserved product data" });
    if (change === "add-content") write(root, "new-content.md", "# Unobserved product content\n");
    const resumed = nextAction(root);
    assert.equal(resumed.stage, "observe");
    assert.equal(readState(root).decisions.concept, undefined);
    assert.notEqual(readState(root).decisions.designSystem.invalidated, undefined);
    assert.throws(() => decide(root, { stage: "components", choice: "scratch", answer: "Proceed using stale observations." }), { code: "WORKFLOW_NOT_READY" });
  });
}

test("an empty observed project becoming nonempty before authorized work requires another observation", t => {
  const root = project(t, {}, { tier: "quick", purpose: "new", query: QUERY });
  observe(root);
  assert.equal(nextAction(root).stage, "intake");
  write(root, "index.html", "<main>An unexpected existing product</main>");
  assert.equal(nextAction(root).stage, "observe");
  assert.throws(() => flow.statedSkip(root, QUERY), { code: "WORKFLOW_NOT_READY" });
});

test("bounded observation detects new sources beyond its read-file budget without claiming complete coverage", t => {
  const files = { "src/App.jsx": EXISTING["src/App.jsx"] };
  for (let index = 0; index < 512; index++) files[`src/data-${String(index).padStart(3, "0")}.js`] = `export const value = ${index};\n`;
  const root = project(t, files, { scope: "src", purpose: "optimize-existing" });
  const observed = nextAction(root).observation;
  assert.equal(observed.discovery.truncated, true);
  observe(root);
  write(root, "src/z-new.js", "export const extra = true;\n");
  assert.equal(nextAction(root).stage, "observe");
});

for (const query of [
  "Use this as inspiration; do not clone it.",
  "参考这个页面来优化，不要复刻，保留我们自己的产品内容。",
  "Improve our frontend.",
]) {
  test(`link role is not guessed from negated or incomplete purpose: ${query}`, t => {
    const url = "https://reference.example.test/page";
    const root = project(t, EXISTING, { url, query });
    const action = observe(root, capture(root, url));
    assert.notEqual(readState(root).decisions.frontendPurpose?.choice, "faithful-reproduction");
    assert.notEqual(readState(root).mode, "replicate");
    if (query === "Improve our frontend.") assert.equal(action.stage, "purpose");
    else assert.ok(["purpose", "intake"].includes(action.stage));
  });
}

test("an actual owner purpose correction leaves reproduction sequencing and survives renewed observation", t => {
  const url = "https://reference.example.test/page";
  const root = project(t, EXISTING, { url, query: "Consider this supplied link for our existing frontend." });
  const evidence = capture(root, url);
  observe(root, evidence);
  decide(root, { stage: "purpose", choice: "faithful-reproduction", answer: "Reproduce this link faithfully." });
  assert.equal(readState(root).mode, "replicate");
  decide(root, { stage: "purpose", choice: "reference-for-existing", answer: "Correction: use it only as a reference for our existing bakery, preserving product content." });
  assert.equal(readState(root).mode, "brief");
  assert.equal(readState(root).decisions.frontendPurpose.choice, "reference-for-existing");
  observe(root, evidence);
  assert.equal(readState(root).decisions.frontendPurpose.choice, "reference-for-existing");
  assert.equal(readState(root).mode, "brief");
  readyIntake(root);
  flow.consumeScratchDecision(root);
  assert.equal(nextAction(root).stage, "concepts");
});

test("scoped authorized UI outputs do not waive immutable source inputs or unrelated new sources", t => {
  const root = project(t, EXISTING, { deliverable: "ui", tier: "quick", purpose: "optimize-existing", query: "Improve bakery layout." });
  observe(root);
  flow.statedSkip(root);
  flow.consumeScratchDecision(root);
  assert.equal(nextAction(root).stage, "work");
  write(root, "src/App.jsx", "export function App() { return <main>Authorized implementation</main>; }\n");
  assert.equal(nextAction(root).stage, "work");
  write(root, "unrelated.js", "export const outsideAuthorizedOutputs = true;\n");
  assert.equal(nextAction(root).stage, "observe");
});

test("the full default public decision consumes without re-observation, search or a scratch interview", t => {
  const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
  observe(root);
  flow.statedSkip(root, QUERY);
  assert.equal(nextAction(root).stage, "design-system");
  const observation = readState(root).decisions.frontendObservation;
  const decision = flow.publishFrontendDecision(root, { authoritySource: "request", authorityText: QUERY });
  for (const rel of ["design-system-catalog.json", "design-system-decision.json"]) {
    assert.ok(fs.statSync(path.join(root, rel)).size > 262144, `${rel} must exercise the actual default evidence above the preview limit`);
  }
  assert.equal(decision.status, "ready");
  assert.equal(decision.capabilityInventory, null);
  assert.equal(fs.existsSync(path.join(root, "capability-inventory.json")), false);
  assert.equal(nextAction(root).stage, "design-system", "actual default producer outputs must not be mistaken for new product sources");
  decide(root, { stage: "design-system", artifact: "design-system-decision.json" });
  const work = nextAction(root);
  assert.equal(work.stage, "work");
  assert.equal(work.type, "run");
  assert.equal(work.question, undefined);
  assert.equal(work.questions, undefined);
  assert.deepEqual(readState(root).decisions.frontendObservation, observation);
});

test("consuming a decision drops an expired unused dispatch slot rather than hiding product content", t => {
  const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
  observe(root);
  flow.statedSkip(root, QUERY);
  assert.equal(nextAction(root).stage, "design-system");
  json(root, "capability-inventory.json", { productCopy: "Real new bakery content, not a capability inventory." });
  flow.publishFrontendDecision(root, { authoritySource: "request", authorityText: QUERY });
  const consumed = decide(root, { stage: "design-system", artifact: "design-system-decision.json" });
  assert.equal(consumed.next.stage, "observe");
  assert.throws(() => decide(root, { stage: "deliver", answer: "The expired slot cannot hide this source." }), { code: "WORKFLOW_NOT_READY" });
  observe(root);
  assert.ok(readState(root).decisions.frontendObservation.observedSourcePaths.includes("capability-inventory.json"));
});

test("same-state receipt invalidation clears cached dispatched roles before source freshness is reused", t => {
  const root = project(t, {}, { query: QUERY });
  observe(root);
  readyIntake(root);
  flow.consumeScratchDecision(root);
  assert.equal(nextAction(root).stage, "concepts");
  write(root, "concepts.html", "<!doctype html><main>Now actual product content at a formerly dispatched path.</main>");
  const state = readState(root);
  assert.equal(frontend.observationFinished(state, root), true, "the current dispatched path is not an upstream product");
  const request = JSON.parse(fs.readFileSync(path.join(root, "design-system-request.json"), "utf8"));
  request.selection.rationale += " Changed the upstream choice.";
  json(root, "design-system-request.json", request);
  assert.equal(frontend.synchronizeFrontend(state, root), true);
  assert.equal(frontend.observationFinished(state, root), false, "the same cached state must not retain expired dispatch roles");
  assert.equal(nextAction(root).stage, "observe");
});

test("an entry correction observes former dispatched content instead of inheriting its role", t => {
  const root = project(t, {}, { query: QUERY });
  observe(root);
  readyIntake(root);
  flow.consumeScratchDecision(root);
  assert.equal(nextAction(root).stage, "concepts");
  write(root, "concepts.html", "<!doctype html><main>Bakery product content to preserve.</main>");
  const result = execute(["next", "--root", root, "--query", "Improve this existing bakery frontend, preserving its content.", "--purpose", "optimize-existing", "--json"]);
  assert.equal(result.exitCode, 0, JSON.stringify(result.output));
  assert.equal(result.output.stage, "observe");
  observe(root);
  assert.ok(readState(root).decisions.frontendObservation.observedSourcePaths.includes("concepts.html"));
});

// Produce every receipt through the public CLI. Only the input requests and the real installed
// catalog are authored here; no decision, embedded catalog or ready flag is manufactured.
function publishNamedFrontendDecision(root) {
  const call = args => {
    const result = execute([...args, "--root", root, "--project-root", root, "--json"]);
    assert.equal(result.exitCode, 0, JSON.stringify(result.output));
    return result.output;
  };
  const names = {
    stack: "framework-evidence.json",
    catalog: "component-research.json",
    request: "owner-system-choice.json",
    artifact: "accepted-component-evidence.json",
  };
  json(root, ".design-pipeline/stack-input.json", {
    schema: "design-pipeline.frontend-stack-request.v1", framework: "react",
    brief: "Build the owner's project-owned frontend from scratch.",
    requested: { styling: "none", uiLibrary: "none" },
  });
  call(["design-system", "resolve-stack", "--artifact", ".design-pipeline/stack-input.json", "--write", "--output", names.stack]);
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/astryx-design-system-snapshot.json"), "utf8"));
  json(root, names.catalog, normalizeSnapshot(snapshot));
  json(root, names.request, {
    schema: "design-pipeline.design-system-decision-request.v1", version: "1", mode: "custom", project: {},
    frontendStackDecisionPath: names.stack,
    selection: {
      basis: "owner-scratch",
      authority: { actor: "owner", source: "request", text: QUERY, choice: "custom" },
      rationale: "The supplied owner request explicitly selects a project-owned system from scratch.",
      compared: [],
    },
  });
  const result = call(["design-system", "decide", "--artifact", names.request, "--catalog", names.catalog, "--write", "--output", names.artifact]);
  return { names, decision: result.decision };
}

for (const changed of ["artifact", "request", "stack", "catalog"]) {
  test(`validated large arbitrarily named evidence consumes and keeps its ${changed} bound to the owning receipt`, t => {
    const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
    observe(root);
    flow.statedSkip(root, QUERY);
    assert.equal(nextAction(root).stage, "design-system");
    const { names, decision } = publishNamedFrontendDecision(root);
    assert.equal(decision.status, "ready");
    assert.ok(fs.statSync(path.join(root, names.artifact)).size > 262144);
    assert.ok(fs.statSync(path.join(root, names.catalog)).size > 262144);
    decide(root, { stage: "design-system", artifact: names.artifact });
    assert.equal(nextAction(root).stage, "work");
    assert.equal(readState(root).decisions.designSystem.path, names.artifact);
    fs.appendFileSync(path.join(root, names[changed]), "\n ");
    assert.equal(nextAction(root).stage, "design-system", "admitted process inputs must stale their owning decision, not disappear from its lineage");
    assert.throws(() => decide(root, { stage: "deliver", answer: "Do not use stale metadata." }), { code: "DESIGN_SYSTEM_DECISION_REQUIRED" });
  });
}

test("large JSON product content is not exempted alongside admitted large process evidence", t => {
  const root = project(t, {}, { deliverable: "ui", tier: "quick", query: QUERY, purpose: "new" });
  observe(root);
  flow.statedSkip(root, QUERY);
  const { names } = publishNamedFrontendDecision(root);
  decide(root, { stage: "design-system", artifact: names.artifact });
  assert.equal(nextAction(root).stage, "work");
  json(root, "product-content.json", { productDescription: "Bakery preorder information. ".repeat(12000) });
  assert.ok(fs.statSync(path.join(root, "product-content.json")).size > 262144);
  assert.equal(nextAction(root).stage, "observe", "large JSON is still product source unless its exact process role was admitted");
});

for (const claimedRole of ["design-pipeline.design-system-decision.v1", "design-pipeline.frontend-stack-request.v1", "design-pipeline.artifact.v1"]) {
  test(`new product data cannot evade observation by claiming ${claimedRole}`, t => {
    const root = project(t, EXISTING, { deliverable: "ui", tier: "quick", purpose: "optimize-existing", query: "Improve bakery layout while preserving product data." });
    observe(root);
    flow.statedSkip(root);
    flow.consumeScratchDecision(root);
    assert.equal(nextAction(root).stage, "work");
    json(root, "src/menu-data.json", { schema: claimedRole, products: [{ name: "Unobserved sourdough", price: 8 }] });
    assert.equal(nextAction(root).stage, "observe", "a schema label is neither a dispatched output nor a validated process role");
    assert.throws(() => decide(root, { stage: "deliver", answer: "The product data has not been observed." }), { code: "WORKFLOW_NOT_READY" });
  });
}

for (const phase of ["before-work", "work"]) for (const change of ["becomes-readable", "unread-bytes", "unread-version"]) {
  test(`a previously unread app ${change} at the same path reopens observation ${phase}`, t => {
    const largeApp = `// ${"x".repeat(262144)}\n`;
    const root = project(t, { ...EXISTING, "src/App.jsx": largeApp }, { deliverable: "ui", tier: "quick", purpose: "optimize-existing", query: "Improve bakery layout." });
    const app = path.join(root, "src/App.jsx");
    const baselineTime = new Date("2026-10-14T08:00:00.000Z");
    fs.utimesSync(app, baselineTime, baselineTime);
    const report = nextAction(root).observation;
    assert.ok(report.sourcePaths.includes("src/App.jsx"));
    assert.equal(report.files.some(file => file.path === "src/App.jsx"), false);
    assert.ok(report.unknowns.some(item => item.code === "FILE_SIZE_LIMIT" && item.path === "src/App.jsx"));
    observe(root);
    if (phase === "work") {
      flow.statedSkip(root);
      flow.consumeScratchDecision(root);
      assert.equal(nextAction(root).stage, "work");
    } else assert.equal(nextAction(root).stage, "intake");
    if (change === "becomes-readable") write(root, "src/App.jsx", EXISTING["src/App.jsx"]);
    if (change === "unread-bytes") {
      const replacement = `// ${"y".repeat(262144)}\n`;
      assert.equal(Buffer.byteLength(replacement), Buffer.byteLength(largeApp));
      assert.notEqual(replacement, largeApp);
      write(root, "src/App.jsx", replacement);
    }
    const changedTime = new Date("2026-10-14T08:00:02.000Z");
    fs.utimesSync(app, changedTime, changedTime);
    assert.equal(nextAction(root).stage, "observe", "discovery alone must not authorize editing code that was never readable");
    assert.throws(() => decide(root, { stage: "deliver", answer: "Unread source has changed." }), { code: "WORKFLOW_NOT_READY" });
  });
}

test("an admitted link DOM remains reference evidence rather than an existing project", t => {
  const url = "https://reference.example.test/new-project";
  const root = project(t, {}, { deliverable: "ui", tier: "quick", url, query: "Use this link as inspiration for a new bakery frontend from scratch." });
  observe(root, capture(root, url));
  assert.equal(nextAction(root).stage, "intake");
  assert.equal(readState(root).decisions.frontendPurpose.choice, "new", "captured DOM does not create product-owned frontend content");
  flow.statedSkip(root, QUERY);
  flow.consumeScratchDecision(root);
  assert.equal(nextAction(root).stage, "work");
  assert.equal(readState(root).decisions.frontendObservation.observedSourceHashes["capture/dom.html"], undefined);
});

test("reference DOM cannot stand in for retained project-owned runtime authority", t => {
  const url = "https://reference.example.test/not-our-system";
  const root = project(t, {}, { deliverable: "ui", tier: "quick", url, purpose: "new", query: "Use the supplied page only as a visual reference for a new bakery frontend." });
  observe(root, capture(root, url));
  flow.statedSkip(root, QUERY);
  assert.equal(nextAction(root).stage, "design-system");
  const catalog = normalizeSnapshot({
    schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "reference-dom",
    provenance: { source: "https://example.test/reference", license: "MIT" },
    components: [{ id: "Dialog", name: "Dialog", description: "Dialog reference only." }],
  });
  const id = "reference-dom:component:Dialog";
  flow.publishFrontendDecision(root, {
    mode: "reference", catalog, candidateId: id, searchQuery: "dialog",
    project: { designSystem: { id: "not-a-project-system", source: "capture/dom.html" } },
    selection: {
      basis: "capability-search",
      authority: { actor: "agent", source: "request", choice: "reference", text: "Use the supplied page only as a visual reference for a new bakery frontend." },
      rationale: "Compare the dialog without authorizing runtime adoption.",
      compatibility: "Reference research does not add a component dependency.",
      compared: [{ id, reason: "Compare the dialog structure without adopting it." }],
    },
  });
  decide(root, { stage: "design-system", artifact: "design-system-decision.json" });
  const blocked = nextAction(root);
  assert.equal(blocked.stage, "work");
  assert.equal(blocked.type, "blocked", "a reference capture is not proof of a retained project system");
  assert.equal(blocked.blocker.kind, "frontend-design-system");
  assert.match(blocked.blocker.reason, /Reference-only research cannot authorize runtime adoption/);
});

for (const priorOutput of ["src/App.jsx", "index.html", "unrelated.js"]) {
  test(`a new consumed decision does not authorize an undispatched edit of ${priorOutput}`, t => {
    const root = project(t, EXISTING, { query: "Improve the existing bakery layout while preserving pickup and brand green.", purpose: "optimize-existing" });
    observe(root);
    readyIntake(root);
    flow.consumeScratchDecision(root);
    flow.writeVariants(root);
    flow.pickVariant(root);
    decide(root, { stage: "components", choice: "scratch", answer: "Use project-owned components for the requested improvement." });
    flow.approveDescription(root);
    assert.equal(nextAction(root).stage, "build");
    const revisedReply = "Build the bakery frontend from scratch with a project-owned custom system; use a revised compact layout.";
    flow.publishFrontendDecision(root, { authorityText: revisedReply });
    decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: revisedReply });
    assert.equal(nextAction(root).stage, "concepts", "the revised receipt requires new downstream choices");
    write(root, priorOutput, priorOutput === "index.html"
      ? "<!doctype html><main>New unobserved implementation</main>\n"
      : "export function App() { return <main>New unobserved implementation</main>; }\n");
    assert.equal(nextAction(root).stage, "observe", "entry-only historical permission must not survive a current decision/revision change");
    assert.throws(() => decide(root, { stage: "deliver", answer: "Do not inherit old build authorization." }), { code: "WORKFLOW_NOT_READY" });
  });
}
