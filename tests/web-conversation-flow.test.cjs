"use strict";

// The conversational web workflow through the public next/decide functions and the real CLI: the
// opening and the stated skip, the confirmed playback, the switchable variants, the decision round,
// the description gate, the section-by-section build, the lineage that sends work back, the
// runtime-review Feedback a section rejection can cite, and the project rule every "no" becomes.
// Assertions pin behaviour (stages, action shapes, records, rules), not the wording of a question.

const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { STATE, decide, initState, nextAction, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const flow = require("./helpers/web-flow.cjs");

const CLI = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const SWITCHER = fs.readFileSync(path.resolve(__dirname, "../skill/tools/variant-switcher/variant-switcher.js"), "utf8");
const AUDIT_PROBE_FILE = JSON.stringify({ schema: "design-pipeline.interaction-probe.v1", id: "page", url: "index.html", probes: [{ id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } }] });
const LINEAGE = { files: ["index.html"], tokens: [], absent: [], remote: [] };
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function project(t, { deliverable = "web", tier = "standard", mode = "brief" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-flow-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  initState(root, { deliverable, tier, mode });
  return root;
}

function write(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}

// Every file under the project with its digest; a refused record changes none of them.
function snapshot(root, dir = root, files = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) snapshot(root, file, files);
    else files[path.relative(root, file).split(path.sep).join("/")] = sha256(fs.readFileSync(file));
  }
  return files;
}

function refuses(root, options, code) {
  const before = snapshot(root);
  assert.throws(() => decide(root, options), { code }, JSON.stringify(options));
  assert.deepEqual(snapshot(root), before, `refused ${JSON.stringify(options)} changed the project`);
}

// The real CLI, run from outside the project; stdout is exactly one JSON result.
function cli(...args) {
  const child = spawnSync(process.execPath, [CLI, ...args, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
  let json = null;
  try { json = JSON.parse(child.stdout); } catch { json = null; }
  assert.ok(json, `stdout is not one JSON result: ${child.stdout}${child.stderr}`);
  return { status: child.status, json, text: child.stdout + child.stderr };
}
const nextCli = root => cli("next", "--root", root, "--project-root", root).json;

function decideCli(root, ...args) {
  const result = cli("decide", "--root", root, "--project-root", root, ...args);
  assert.equal(result.status, 0, result.text);
  assert.equal(result.json.status, "recorded", result.text);
  return result.json.next;
}

function refusesCli(root, args, code) {
  const before = snapshot(root);
  const result = cli("decide", "--root", root, "--project-root", root, ...args);
  assert.equal(result.status, 1, result.text);
  assert.equal(result.json.ok, false, result.text);
  assert.equal(result.json.error.code, code, result.text);
  assert.deepEqual(snapshot(root), before, `refused ${args.join(" ")} changed the project`);
}

// Components written from scratch: the recorded decision and the manifest the build stage checks.
function fromScratch(root, answer = "Write the components from scratch") {
  decide(root, { stage: "components", choice: "scratch", answer });
  write(root, "component-manifest.json", JSON.stringify({ fromScratch: true, entries: [] }));
}

// index.html with one marked section per id, then anything extra (a revision, a shipped switcher).
function buildPage(root, ids, extra = "") {
  write(root, "index.html", `<!doctype html>\n<html lang="en"><body>\n${ids.map(id => `<section data-section="${id}"><h2>${id}</h2></section>\n`).join("")}${extra}</body></html>\n`);
}

// A project at build whose approved description names `sections`, with components from scratch.
function approved(t, sections = ["first-screen", "proof"], options = {}) {
  const root = project(t, options);
  flow.toComponents(root);
  fromScratch(root);
  flow.toBuild(root, sections);
  return root;
}

// A project whose sections are all built and accepted, standing at probe.
function atProbe(t, sections = ["first-screen"]) {
  const root = approved(t, sections);
  buildPage(root, sections);
  assert.equal(flow.acceptSections(root).stage, "probe");
  return root;
}

// The interaction pass the probe stage waits for, bound to the checked page.
function passProbe(root) {
  write(root, "interaction.json", AUDIT_PROBE_FILE);
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
}

const rulesFrom = root => readState(root).rules.map(rule => rule.from);

function feedbackRecord(feedback = {}) {
  return {
    schema: "design-pipeline.runtime-review-record.v1",
    lifecycle: "recorded",
    feedback: { schema: "design-pipeline.runtime-review-feedback.v1", objectId: "hero-reserve-button", category: "visual-acceptance", actual: "The reserve button is grey on grey and easy to miss.", expected: "A warm, high-contrast reserve button above the fold.", acceptance: ["The button reads at arm's length on a phone"], ...feedback },
    contextAtRecord: {},
    recordedAt: "2026-10-13T08:00:00.000Z",
  };
}

// --- intake ------------------------------------------------------------------------------------------

test("standard and full intake open with the skip line and one open question, never a list", t => {
  const questions = {};
  for (const tier of ["standard", "full"]) for (const mode of ["brief", "freeform", "replicate"]) {
    const root = project(t, { tier, mode });
    const before = snapshot(root);
    const ask = nextAction(root);
    assert.deepEqual(nextAction(root), ask, "next is stable");
    assert.deepEqual(snapshot(root), before, "next only reads");
    assert.equal(ask.type, "ask");
    assert.equal(ask.stage, "intake");
    assert.match(ask.first, /skip/i, `${tier}/${mode} first offers the skip`);
    assert.match(ask.first, /start/i);
    assert.equal(typeof ask.question, "string");
    assert.doesNotMatch(ask.question, /\n/, "one question, not a list");
    assert.match(ask.question, /\?$/);
    for (const key of ["questions", "options", "recommended"]) assert.equal(ask[key], undefined, `${tier}/${mode} intake has no ${key}`);
    assert.match(ask.record, /--stage intake --verdict accept --answer /);
    assert.match(ask.correction, /--stage intake --verdict reject --answer /);
    assert.match(ask.skip, /--stage intake --choice skip --answer /);
    questions[mode] = ask.question;
  }
  assert.equal(questions.freeform, questions.brief);
  assert.notEqual(questions.replicate, questions.brief, "replicate opens on the page being reproduced");
  assert.match(questions.replicate, /stay/i);
});

test("a skip records only a stated decision through the CLI, and web intake never writes brief.md", t => {
  const root = project(t);
  const skip = answer => ["--stage", "intake", "--choice", "skip", ...(answer === undefined ? [] : ["--answer", answer])];
  for (const answer of [undefined, "default", "ok", "OK.", "just start", "默认"]) refusesCli(root, skip(answer), "CONTRACT_INVALID");
  refusesCli(root, ["--stage", "intake", "--answer", "A landing page for a bakery"], "CONTRACT_INVALID");
  assert.equal(decideCli(root, ...skip(flow.STATED)).stage, "reference");
  assert.deepEqual(readState(root).decisions.intake, { answer: flow.STATED, skipped: true });
  assert.equal(fs.existsSync(path.join(root, "brief.md")), false);

  const quick = project(t, { tier: "quick" });
  const run = nextCli(quick);
  assert.equal(run.type, "run");
  assert.equal(run.stage, "intake");
  assert.match(run.command, / decide .*--stage intake --choice skip --answer /);
  refusesCli(quick, skip("默认"), "CONTRACT_INVALID");
  refusesCli(quick, ["--stage", "intake", "--answer", flow.STATED], "CONTRACT_INVALID");
  assert.equal(decideCli(quick, ...skip(flow.STATED)).stage, "components");
  assert.deepEqual(readState(quick).decisions.intake, { answer: flow.STATED, skipped: true });
  assert.equal(fs.existsSync(path.join(quick, "brief.md")), false);
});

test("the playback must be confirmed before concepts; each correction becomes a rule and reopens intake", t => {
  const root = project(t);
  const opening = nextAction(root);
  decide(root, { stage: "intake", verdict: "reject", answer: "It is for florists, not bakeries" });
  const corrected = nextAction(root);
  assert.equal(corrected.stage, "intake");
  assert.equal(corrected.type, "ask");
  assert.notEqual(corrected.first, opening.first);
  assert.ok(corrected.first.includes("It is for florists, not bakeries"), corrected.first);
  assert.notEqual(corrected.question, opening.question);
  assert.match(corrected.question, /wrong/i);
  assert.equal(corrected.questions, undefined);
  // Later work on disk opens nothing while the playback is unconfirmed.
  decide(root, { stage: "reference", answer: "none" });
  flow.writeVariants(root);
  assert.equal(nextAction(root).stage, "intake");
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");
  refuses(root, { stage: "concept", verdict: "reject", answer: "Too busy" }, "WORKFLOW_NOT_READY");
  decide(root, { stage: "intake", verdict: "reject", answer: "Mention same-day pickup" });
  assert.equal(nextAction(root).stage, "intake");
  assert.deepEqual(readState(root).rules, [
    { text: "It is for florists, not bakeries", from: "playback 1", scope: "project" },
    { text: "Mention same-day pickup", from: "playback 2", scope: "project" },
  ]);

  decide(root, { stage: "intake", verdict: "accept", answer: flow.PLAYBACK });
  const concepts = nextAction(root);
  assert.equal(concepts.stage, "concepts");
  assert.equal(concepts.type, "ask");
  assert.deepEqual(readState(root).decisions.intake, { answer: flow.PLAYBACK, playback: "confirmed" });
  assert.deepEqual(readState(root).decisions.playbacks.map(item => item.verdict), ["reject", "reject", "accept"]);
  assert.equal(fs.existsSync(path.join(root, "brief.md")), false);

  flow.pickVariant(root, "A");
  assert.equal(nextAction(root).stage, "components");
  decide(root, { stage: "intake", verdict: "reject", answer: "Pickup is on weekends only" });
  assert.equal(nextAction(root).stage, "intake", "a later correction reopens intake");
  assert.deepEqual(rulesFrom(root), ["playback 1", "playback 2", "playback 3"]);
  flow.confirmPlayback(root);
  assert.equal(nextAction(root).stage, "components");
});

// --- variants ----------------------------------------------------------------------------------------

test("the variants page needs three marked first screens and the switcher before the owner picks", t => {
  const root = project(t);
  flow.confirmPlayback(root);
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");
  decide(root, { stage: "reference", answer: "none" });
  const run = nextAction(root);
  assert.equal(run.stage, "concepts");
  assert.equal(run.type, "run");
  assert.equal(run.findings, undefined);
  assert.match(run.instruction, /concepts\.md/);
  assert.match(run.instruction, /concepts\.html/);
  write(root, "concepts.md", "# Concepts\n");
  assert.equal(nextAction(root).type, "run", "concepts.md alone is not the variants page");
  refuses(root, { stage: "concept", verdict: "reject", answer: "They look the same" }, "WORKFLOW_NOT_READY");

  const codes = () => {
    const action = nextAction(root);
    assert.equal(action.type, "run");
    return action.findings.map(item => item.code);
  };
  write(root, "concepts.html", "<!doctype html><p>Three ideas</p>");
  assert.deepEqual(codes(), ["variants-incomplete", "variant-switcher-missing"]);
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");
  write(root, "concepts.html", flow.variantsPage(["A", "B"]));
  assert.deepEqual(codes(), ["variants-incomplete"]);
  write(root, "concepts.html", flow.variantsPage().replace(/<script>[\s\S]*<\/script>/, ""));
  assert.deepEqual(codes(), ["variant-switcher-missing"]);
  refuses(root, { stage: "concept", choice: "A" }, "WORKFLOW_NOT_READY");

  flow.writeVariants(root);
  const ask = nextAction(root);
  assert.equal(ask.stage, "concepts");
  assert.equal(ask.type, "ask");
  assert.equal(ask.first, undefined);
  assert.match(ask.question, /concepts\.html/);
  for (const key of ["A", "B", "C"]) assert.match(ask.question, new RegExp(`\\b${key}\\b`));
  assert.match(ask.record, /--stage concept --choice /);
  assert.match(ask.correction, /--stage concept --verdict reject --answer /);

  for (const choice of ["2", "D", "A,A"]) refuses(root, { stage: "concept", choice }, "CONTRACT_INVALID");
  refuses(root, { stage: "concept", choice: "B,C" }, "CONTRACT_INVALID");
  decide(root, { stage: "concept", choice: "b" });
  assert.equal(readState(root).decisions.concept, "B");
  assert.equal(nextAction(root).stage, "components");
  decide(root, { stage: "concept", choice: "B,C", answer: "B's header with C's proof grid" });
  const { concept, conceptNotes, variants } = readState(root).decisions;
  assert.equal(concept, "B,C");
  assert.equal(conceptNotes, "B's header with C's proof grid");
  assert.deepEqual(variants.map(item => [item.verdict, item.choice]), [["pick", "B"], ["pick", "B,C"]]);
});

test("a variants rejection becomes a rule and asks for a redo until concepts.html changes", t => {
  const root = project(t);
  flow.toComponents(root);
  const page = fs.readFileSync(path.join(root, "concepts.html"));
  decide(root, { stage: "concept", verdict: "reject", answer: "All three look like templates" });
  const redo = nextAction(root);
  assert.equal(redo.stage, "concepts");
  assert.equal(redo.type, "ask");
  assert.ok(redo.first.includes("All three look like templates"), redo.first);
  assert.deepEqual(fs.readFileSync(path.join(root, "concepts.html")), page);
  assert.deepEqual(readState(root).rules, [{ text: "All three look like templates", from: "variants 1", scope: "project" }]);
  fs.appendFileSync(path.join(root, "concepts.html"), "<!-- redone without the template look -->\n");
  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.equal(ask.first, undefined);
  decide(root, { stage: "concept", verdict: "reject", answer: "C is still a stock grid" });
  assert.deepEqual(rulesFrom(root), ["variants 1", "variants 2"]);
  flow.pickVariant(root, "C");
  assert.equal(nextAction(root).stage, "components");
  assert.deepEqual(readState(root).decisions.variants.map(item => item.verdict), ["pick", "reject", "reject", "pick"]);
});

test("quick and replicate projects have no variants to pick or reject", t => {
  for (const [tier, mode] of [["quick", "brief"], ["quick", "replicate"], ["standard", "replicate"], ["full", "replicate"]]) {
    const root = project(t, { tier, mode });
    flow.toComponents(root);
    flow.writeVariants(root);
    refuses(root, { stage: "concept", choice: "A" }, "CONTRACT_INVALID");
    refuses(root, { stage: "concept", verdict: "reject", answer: "None of these" }, "CONTRACT_INVALID");
    assert.equal(nextAction(root).stage, "components", `${tier}/${mode}`);
  }
});

// --- decision round ------------------------------------------------------------------------------

test("the decision round asks the sections and the components with recommendations; quick asks components only", t => {
  for (const [tier, mode] of [["standard", "brief"], ["full", "freeform"], ["standard", "replicate"], ["quick", "brief"], ["quick", "replicate"]]) {
    const root = project(t, { tier, mode });
    flow.toComponents(root);
    const ask = nextAction(root);
    assert.equal(ask.stage, "components");
    assert.equal(ask.type, "ask");
    assert.deepEqual(ask.questions.map(question => question.id), tier === "quick" ? ["components"] : ["sections", "components"], `${tier}/${mode}`);
    for (const question of ask.questions) assert.ok(question.recommended?.trim(), `${tier}/${mode} ${question.id} has a recommended answer`);
    assert.equal(ask.questions.find(question => question.id === "components").options.length, 5);
    assert.match(ask.recommended, /project,index,discover/);
    assert.match(ask.record, /--stage components --choice .+ --answer /);
  }
});

// --- description ---------------------------------------------------------------------------------

test("nothing is built until the owner approves the description, through the CLI", t => {
  const root = project(t);
  flow.toComponents(root);
  fromScratch(root);
  buildPage(root, ["first-screen"]);
  const unwritten = nextCli(root);
  assert.equal(unwritten.stage, "description", "a page written early does not skip the description");
  assert.equal(unwritten.type, "run");
  assert.match(unwritten.instruction, /brief\.md/);
  refusesCli(root, ["--stage", "description", "--verdict", "accept", "--choice", "first-screen"], "WORKFLOW_NOT_READY");
  refusesCli(root, ["--stage", "section", "--choice", "first-screen", "--verdict", "accept"], "WORKFLOW_NOT_READY");

  flow.writeDescription(root, ["first-screen", "proof"]);
  const ask = nextCli(root);
  assert.equal(ask.stage, "description");
  assert.equal(ask.type, "ask");
  assert.match(ask.question, /brief\.md/);
  assert.match(ask.record, /--stage description --verdict accept --choice /);
  assert.match(ask.correction, /--stage description --verdict reject --answer /);
  refusesCli(root, ["--stage", "section", "--choice", "first-screen", "--verdict", "accept"], "WORKFLOW_NOT_READY");
  for (const choice of ["first-screen,pricing", "First-Screen", "first-screen,first-screen"]) {
    refusesCli(root, ["--stage", "description", "--verdict", "accept", "--choice", choice], "CONTRACT_INVALID");
  }

  const revise = decideCli(root, "--stage", "description", "--verdict", "reject", "--answer", "Say who the regulars are");
  assert.equal(revise.stage, "description");
  assert.equal(revise.type, "ask");
  assert.ok(revise.first.includes("Say who the regulars are"), revise.first);
  assert.deepEqual(readState(root).rules, [{ text: "Say who the regulars are", from: "description 1", scope: "project" }]);
  fs.appendFileSync(path.join(root, "brief.md"), "\nFor regulars who reserve tomorrow's bread on their phones.\n");

  fs.rmSync(path.join(root, "index.html"));
  const build = decideCli(root, "--stage", "description", "--verdict", "accept", "--choice", "first-screen,proof");
  assert.equal(build.stage, "build");
  assert.equal(build.type, "run");
  assert.equal(build.section, "first-screen");
  assert.match(build.instruction, /first screen/i);
  assert.match(build.instruction, /data-section="first-screen"/);
  assert.doesNotMatch(build.instruction, /data-section="proof"/);
  assert.match(build.instruction, /## Treatment/);
  const approval = readState(root).decisions.descriptions.at(-1);
  assert.equal(approval.verdict, "accept");
  assert.deepEqual(approval.sections, ["first-screen", "proof"]);
  assert.equal(approval.sha256, `sha256:${sha256(fs.readFileSync(path.join(root, "brief.md")))}`);
});

test("the first build step names only the first section, with the treatment outside replicate and OpenSpec at full", t => {
  for (const [tier, mode] of [["standard", "freeform"], ["full", "brief"], ["standard", "replicate"], ["full", "replicate"]]) {
    const root = approved(t, ["hero", "pickup"], { tier, mode });
    const run = nextAction(root);
    assert.equal(run.stage, "build", `${tier}/${mode}`);
    assert.equal(run.type, "run");
    assert.equal(run.section, "hero");
    assert.match(run.instruction, /data-section="hero"/);
    assert.doesNotMatch(run.instruction, /data-section="pickup"/);
    if (mode === "replicate") assert.doesNotMatch(run.instruction, /treatment/i, `${tier}/${mode} names no treatment`);
    else assert.match(run.instruction, /## Treatment/, `${tier}/${mode} asks for the treatment first`);
    assert.equal(/OpenSpec/.test(run.instruction), tier === "full", `${tier}/${mode} OpenSpec`);
  }
});

test("an owner's BRIEF.md is the description the approval binds", t => {
  const root = project(t);
  flow.toComponents(root);
  fromScratch(root);
  write(root, "BRIEF.md", "# Brief\n\nThe owner's own brief. Sections in build order: first-screen.\n");
  const ask = nextAction(root);
  assert.equal(ask.stage, "description");
  assert.equal(ask.type, "ask");
  assert.match(ask.question, /BRIEF\.md/);
  decide(root, { stage: "description", verdict: "accept", choice: "first-screen" });
  assert.equal(nextAction(root).stage, "build");
  fs.appendFileSync(path.join(root, "BRIEF.md"), "\nAdded after the approval.\n");
  assert.equal(nextAction(root).stage, "description");
});

test("quick builds the whole page with no description and no section reviews", t => {
  const root = project(t, { tier: "quick" });
  flow.toComponents(root);
  fromScratch(root);
  const run = nextAction(root);
  assert.equal(run.stage, "build");
  assert.equal(run.type, "run");
  assert.equal(run.section, undefined);
  assert.doesNotMatch(run.instruction, /treatment/i);
  refuses(root, { stage: "description", verdict: "accept", choice: "first-screen" }, "CONTRACT_INVALID");
  buildPage(root, []);
  assert.equal(nextAction(root).stage, "probe");
  refuses(root, { stage: "section", choice: "first-screen", verdict: "reject", answer: "Bigger" }, "CONTRACT_INVALID");
});

// --- sections ------------------------------------------------------------------------------------

test("sections are built and accepted one at a time in the approved order, each rejection a rule", t => {
  const root = approved(t, ["first-screen", "proof"]);
  assert.equal(nextAction(root).section, "first-screen");
  buildPage(root, ["first-screen"]);
  const first = nextAction(root);
  assert.equal(first.stage, "build");
  assert.equal(first.type, "ask");
  assert.equal(first.section, "first-screen");
  assert.equal(first.first, undefined);
  assert.match(first.question, /first-screen/);
  assert.match(first.record, /--stage section --choice first-screen --verdict accept\|reject/);
  refuses(root, { stage: "section", choice: "proof", verdict: "accept" }, "WORKFLOW_NOT_READY");
  buildPage(root, ["first-screen", "proof"]);
  assert.equal(nextAction(root).section, "first-screen", "a later section waits for the first");
  refuses(root, { stage: "section", choice: "proof", verdict: "accept" }, "WORKFLOW_NOT_READY");
  refuses(root, { stage: "section", choice: "pricing", verdict: "reject", answer: "Add prices" }, "CONTRACT_INVALID");

  buildPage(root, ["first-screen"]);
  decide(root, { stage: "section", choice: "first-screen", verdict: "accept" });
  const second = nextAction(root);
  assert.equal(second.stage, "build");
  assert.equal(second.type, "run");
  assert.equal(second.section, "proof");
  assert.match(second.instruction, /data-section="proof"/);
  buildPage(root, ["first-screen", "proof"]);
  const proof = nextAction(root);
  assert.equal(proof.type, "ask");
  assert.equal(proof.section, "proof");
  refuses(root, { stage: "section", choice: "proof", verdict: "reject" }, "CONTRACT_INVALID");

  decide(root, { stage: "section", choice: "proof", verdict: "reject", answer: "The quotes need names and photos" });
  const revise = nextAction(root);
  assert.equal(revise.type, "ask");
  assert.equal(revise.section, "proof");
  assert.ok(revise.first.includes("The quotes need names and photos"), revise.first);
  assert.deepEqual(readState(root).rules, [{ text: "The quotes need names and photos", from: "section proof 1", scope: "project" }]);
  buildPage(root, ["first-screen", "proof"], "<!-- quotes with names and photos -->\n");
  const revised = nextAction(root);
  assert.equal(revised.section, "proof");
  assert.equal(revised.first, undefined);

  decide(root, { stage: "section", choice: "first-screen", verdict: "reject", answer: "The headline wraps on phones" });
  assert.equal(nextAction(root).section, "first-screen", "a later rejection reopens an accepted section");
  assert.deepEqual(rulesFrom(root), ["section proof 1", "section first-screen 1"]);
  assert.equal(flow.acceptSections(root).stage, "probe");
  assert.deepEqual(readState(root).decisions.sections.map(item => `${item.section} ${item.verdict}`), ["first-screen accept", "proof reject", "first-screen reject", "first-screen accept", "proof accept"]);
});

test("a section rejection can cite recorded runtime-review Feedback through the CLI, and nothing else", t => {
  const root = approved(t, ["first-screen"]);
  buildPage(root, ["first-screen"]);
  const record = feedbackRecord();
  write(root, "runtime-review/feedback/x.json", `${JSON.stringify(record, null, 2)}\n`);
  write(root, "runtime-review/feedback/y.json", `${JSON.stringify(feedbackRecord({ objectId: "pickup-steps", category: "component-conformance", actual: "The steps are a plain list.", expected: "The project's Steps component." }), null, 2)}\n`);
  write(root, "runtime-review/feedback/not-a-record.json", JSON.stringify({ objectId: "hero", actual: "grey", expected: "warm" }));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "web-flow-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true, maxRetries: 3 }));
  write(outside, "x.json", JSON.stringify(record));
  const reject = (...evidence) => ["--stage", "section", "--choice", "first-screen", "--verdict", "reject", ...evidence.flatMap(file => ["--evidence", file])];

  refusesCli(root, reject("runtime-review/feedback/not-a-record.json"), "CONTRACT_INVALID");
  refusesCli(root, reject("runtime-review/feedback/missing.json"), "CONTRACT_INVALID");
  refusesCli(root, reject(path.join(outside, "x.json")), "CONTRACT_INVALID");
  refusesCli(root, reject(`../${path.basename(outside)}/x.json`), "CONTRACT_INVALID");
  for (const invalid of [{ ...record, lifecycle: "exported" }, { ...record, schema: "design-pipeline.runtime-review-feedback.v1" }, feedbackRecord({ category: "taste" }), feedbackRecord({ expected: " " })]) {
    write(root, "runtime-review/feedback/invalid.json", JSON.stringify(invalid));
    refuses(root, { stage: "section", choice: "first-screen", verdict: "reject", evidence: ["runtime-review/feedback/invalid.json"] }, "CONTRACT_INVALID");
  }

  const next = decideCli(root, ...reject("runtime-review/feedback/x.json"));
  assert.equal(next.stage, "build");
  assert.equal(next.type, "ask");
  assert.equal(next.section, "first-screen");
  assert.equal(typeof next.first, "string", "the section is asked again with a revise step");
  const cited = readState(root).decisions.sections.at(-1);
  assert.equal(cited.verdict, "reject");
  assert.equal(cited.reason, null);
  assert.deepEqual(cited.evidence, [{ path: "runtime-review/feedback/x.json", sha256: `sha256:${sha256(fs.readFileSync(path.join(root, "runtime-review/feedback/x.json")))}`, objectId: "hero-reserve-button", category: "visual-acceptance" }]);
  const [rule] = readState(root).rules;
  assert.equal(rule.from, "section first-screen 1");
  for (const part of [record.feedback.objectId, record.feedback.actual, record.feedback.expected]) assert.ok(rule.text.includes(part), `${rule.text} cites ${part}`);
  assert.deepEqual(next.rules, [rule.text]);

  decideCli(root, ...reject("runtime-review/feedback/x.json", "runtime-review/feedback/y.json"), "--answer", "And the photo is too dark");
  const rules = readState(root).rules.slice(1);
  assert.deepEqual(rules.map(item => item.from), ["section first-screen 2", "section first-screen 2", "section first-screen 2"]);
  assert.equal(rules[0].text, "And the photo is too dark");
  assert.ok(rules[2].text.includes("pickup-steps"));
  assert.deepEqual(readState(root).decisions.sections.at(-1).evidence.map(item => item.path), ["runtime-review/feedback/x.json", "runtime-review/feedback/y.json"]);
});

// --- lineage -------------------------------------------------------------------------------------

test("a changed description goes back for approval, and earlier section verdicts stop counting", t => {
  const root = atProbe(t, ["first-screen", "proof"]);
  const verdicts = readState(root).decisions.sections;
  fs.appendFileSync(path.join(root, "brief.md"), "\nPickup is on weekends only.\n");
  const stale = nextAction(root);
  assert.equal(stale.stage, "description");
  assert.equal(stale.type, "ask");
  assert.equal(typeof stale.first, "string");
  refuses(root, { stage: "section", choice: "first-screen", verdict: "accept" }, "WORKFLOW_NOT_READY");
  decide(root, { stage: "description", verdict: "accept", choice: "first-screen,proof" });
  const again = nextAction(root);
  assert.equal(again.stage, "build");
  assert.equal(again.type, "ask");
  assert.equal(again.section, "first-screen", "sections accepted under the old approval are asked again");
  assert.ok(!again.completed.includes("build"));
  assert.deepEqual(readState(root).decisions.sections, verdicts, "earlier verdicts are kept, not rewritten");
  assert.equal(flow.acceptSections(root).stage, "probe");
});

test("a different component decision, a re-picked variant or a new playback makes the approval stale", t => {
  const root = atProbe(t);
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  decide(root, { stage: "components", choice: "scratch", answer: "Write them from scratch, plainer" });
  assert.equal(readState(root).gates.interaction, undefined, "the interaction pass bound the old decision");
  const components = nextAction(root);
  assert.equal(components.stage, "description");
  assert.equal(components.type, "ask");
  decide(root, { stage: "description", verdict: "accept", choice: "first-screen" });
  assert.equal(nextAction(root).section, "first-screen");
  assert.equal(flow.acceptSections(root).stage, "probe");

  flow.pickVariant(root, "C");
  assert.equal(nextAction(root).stage, "description", "a re-picked variant");
  decide(root, { stage: "description", verdict: "accept", choice: "first-screen" });
  assert.equal(flow.acceptSections(root).stage, "probe");

  flow.confirmPlayback(root, `${flow.PLAYBACK} Pickup is on weekends only.`);
  assert.equal(nextAction(root).stage, "description", "a new playback");
});

test("the probe binds the checked page, and the final review still turns a rejection into a rule", t => {
  const root = atProbe(t);
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  fs.appendFileSync(path.join(root, "index.html"), "<!-- edited after the check -->\n");
  const stale = nextAction(root);
  assert.equal(stale.stage, "probe");
  assert.equal(stale.verification.status, "stale");
  assert.ok(stale.verification.findings.some(item => item.code === "workflow-input-changed" && item.path === "index.html"), JSON.stringify(stale.verification.findings));
  passProbe(root);
  assert.equal(nextAction(root).stage, "review");
  decide(root, { stage: "review", verdict: "reject", answer: "The reserve button gets lost below the fold" });
  assert.deepEqual(readState(root).rules, [{ text: "The reserve button gets lost below the fold", from: "draft 1", scope: "project" }]);
  assert.equal(readState(root).gates.interaction, undefined);
  assert.equal(nextAction(root).stage, "probe");
});

test("the prototype switcher never ships: build stays unfinished while index.html carries it", t => {
  const shipped = `<script>\n${SWITCHER}\n</script>\n`;
  const root = approved(t, ["first-screen"]);
  buildPage(root, ["first-screen"], shipped);
  const blocked = nextAction(root);
  assert.equal(blocked.stage, "build");
  assert.equal(blocked.type, "run");
  assert.deepEqual(blocked.findings.map(item => item.code), ["variant-switcher-shipped"]);
  refuses(root, { stage: "section", choice: "first-screen", verdict: "accept" }, "WORKFLOW_NOT_READY");
  buildPage(root, ["first-screen"]);
  assert.equal(nextAction(root).type, "ask");
  assert.equal(flow.acceptSections(root).stage, "probe");
  buildPage(root, ["first-screen"], shipped);
  assert.deepEqual(nextAction(root).findings.map(item => item.code), ["variant-switcher-shipped"], "an accepted page that gains the switcher reopens build");

  const quick = project(t, { tier: "quick" });
  flow.toComponents(quick);
  fromScratch(quick);
  buildPage(quick, [], shipped);
  const quickBlocked = nextAction(quick);
  assert.equal(quickBlocked.stage, "build");
  assert.deepEqual(quickBlocked.findings.map(item => item.code), ["variant-switcher-shipped"]);
  buildPage(quick, []);
  assert.equal(nextAction(quick).stage, "probe");
});

// --- rules, other deliverables, legacy -----------------------------------------------------------

test("every no along the way is a project rule, and next returns them all", t => {
  const root = project(t);
  decide(root, { stage: "intake", verdict: "reject", answer: "It is for florists" });
  flow.confirmPlayback(root);
  decide(root, { stage: "reference", answer: "none" });
  flow.writeVariants(root);
  decide(root, { stage: "concept", verdict: "reject", answer: "No stock photography" });
  flow.pickVariant(root, "B");
  fromScratch(root);
  flow.writeDescription(root, ["first-screen"]);
  decide(root, { stage: "description", verdict: "reject", answer: "Name the opening hours" });
  flow.approveDescription(root, ["first-screen"]);
  buildPage(root, ["first-screen"]);
  decide(root, { stage: "section", choice: "first-screen", verdict: "reject", answer: "The reserve button is too small" });
  const next = nextAction(root);
  assert.deepEqual(rulesFrom(root), ["playback 1", "variants 1", "description 1", "section first-screen 1"]);
  assert.ok(readState(root).rules.every(rule => rule.scope === "project"));
  assert.deepEqual(next.rules, ["It is for florists", "No stock photography", "Name the opening hours", "The reserve button is too small"]);
});

test("description and section records are refused on film, edit and ui projects", t => {
  for (const deliverable of ["film", "edit", "ui"]) {
    const root = project(t, { deliverable });
    refuses(root, { stage: "description", verdict: "accept", choice: "first-screen" }, "CONTRACT_INVALID");
    refuses(root, { stage: "description", verdict: "reject", answer: "Too long" }, "CONTRACT_INVALID");
    refuses(root, { stage: "section", choice: "first-screen", verdict: "accept" }, "CONTRACT_INVALID");
    refuses(root, { stage: "section", choice: "first-screen", verdict: "reject", answer: "Too dark" }, "CONTRACT_INVALID");
  }
});

test("a web project recorded by the earlier question form is past intake and concepts", t => {
  const root = project(t);
  const brief = "# Brief\n\nA product page\n";
  write(root, "brief.md", brief);
  const state = readState(root);
  state.decisions = { intake: { answer: "A product page", briefSha256: `sha256:${sha256(brief)}` }, reference: "none", concept: "1" };
  write(root, STATE, `${JSON.stringify(state, null, 2)}\n`);
  assert.equal(nextAction(root).stage, "components");
  fromScratch(root);
  const ask = nextAction(root);
  assert.equal(ask.stage, "description");
  assert.equal(ask.type, "ask");
  assert.deepEqual(ask.completed, ["intake", "reference", "concepts", "components"]);
});
