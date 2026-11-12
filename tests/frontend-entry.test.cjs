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
const { decide, initState, nextAction, nextVisualTask, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { ARTIFACT_KEYS, validateReceipt } = require("../skill/scripts/evidence-core.cjs");
const { normalizeSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const flow = require("./helpers/web-flow.cjs");
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
    const decision = flow.consumeScratchDecision(root, { authorityText: QUERY, authoritySource: "request", catalog: { schema: "design-pipeline.design-system-catalog.v1", version: "1", namespace: "owner-scratch", entries: [] } });
    assert.equal(decision.status, "ready");
    assert.equal(decision.selection.basis, "owner-scratch");
    assert.deepEqual(decision.selection.authority, { actor: "owner", source: "request", text: QUERY, choice: "custom" });
    assert.equal(decision.capabilityInventory, null);
    assert.deepEqual(decision.request.catalog.entries, [], "an explicit scratch choice needs neither candidates nor catalog exhaustion");
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

test("a changed frontend request reopens observation and its intake binding rather than retaining the prior purpose", t => {
  const root = project(t, EXISTING, { query: "Improve this existing bakery frontend without changing its reservation function." });
  observe(root);
  flow.confirmPlayback(root);
  const previous = readState(root).decisions.intake.entry;
  const changed = spawnSync(process.execPath, [cli, "next", "--root", root, "--project-root", root, "--query", QUERY, "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(changed.status, 0, changed.stdout + changed.stderr);
  assert.equal(JSON.parse(changed.stdout).stage, "observe");
  observe(root);
  assert.equal(readState(root).decisions.frontendPurpose.choice, "new");
  assert.equal(nextAction(root).stage, "intake");
  flow.statedSkip(root);
  assert.notEqual(readState(root).decisions.intake.entry, previous);
  assert.equal(nextAction(root).stage, "design-system");
});

test("a replay-consistent embedded catalog cannot replace its actual bound catalog source", t => {
  const root = project(t, {}, { tier: "quick", query: QUERY });
  observe(root);
  flow.statedSkip(root);
  flow.consumeScratchDecision(root);
  const value = JSON.parse(fs.readFileSync(path.join(root, "design-system-decision.json"), "utf8"));
  value.request.catalog = normalizeSnapshot({
    schema: "design-pipeline.design-system-snapshot.v1", version: "1", namespace: "other-catalog",
    provenance: { source: "https://example.test/other-catalog", license: "MIT" }, components: [],
  });
  json(root, "design-system-decision.json", value);
  assert.throws(() => decide(root, { stage: "design-system", artifact: "design-system-decision.json", answer: flow.SCRATCH_REPLY }), { code: "DESIGN_SYSTEM_DECISION_STALE" });
  assert.equal(nextAction(root).stage, "design-system");
});

test("a settled quick scratch selection is recorded without a second component-source interview", t => {
  const root = project(t, {}, { tier: "quick", query: QUERY });
  observe(root);
  flow.statedSkip(root);
  flow.consumeScratchDecision(root);
  const action = nextAction(root);
  assert.equal(action.stage, "components");
  assert.equal(action.type, "run");
  assert.equal(action.question, undefined);
  assert.deepEqual(action.selection, { choice: "scratch", answer: flow.SCRATCH_REPLY });
  decide(root, { stage: "components", ...action.selection });
  assert.equal(nextAction(root).stage, "build");
});
