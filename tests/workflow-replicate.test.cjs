"use strict";

// Replicate mode for ui and web (OpenSpec change replicate-extract-first): `next` extracts the
// reference into DESIGN.md and MOTION.md before anything is built, runs the existing checks itself,
// asks the owner to confirm, and later stages stay bound to what was confirmed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { decide, initState, nextAction, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { routeJob } = require("../skill/scripts/job-route-core.cjs");
const { stages: webStages } = require("../skill/scripts/workflows/web.cjs");
const { confirmExtraction, extractReplicate, writeEvidence, writeFoundations, writeReference } = require("./helpers/replicate-flow.cjs");
const { approveDescription, confirmPlayback, statedSkip } = require("./helpers/web-flow.cjs");

const cli = path.join(__dirname, "..", "skill", "scripts", "designer-pipeline.cjs");
const roots = [];
test.after(() => { for (const dir of roots) fs.rmSync(dir, { recursive: true, force: true }); });

function project(options) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-replicate-"));
  roots.push(dir);
  initState(dir, { mode: "replicate", ...options });
  return dir;
}
const codes = action => (action.findings || []).map(finding => finding.code);
const append = (dir, rel, text) => fs.appendFileSync(path.join(dir, rel), text);

test("ui replicate holds at extract until the reference is registered and the foundations pass their checks", () => {
  const dir = project({ deliverable: "ui", tier: "quick" });
  const reference = nextAction(dir);
  assert.equal(reference.stage, "reference");
  assert.match(reference.instruction, /reference-evidence\.json/);
  assert.doesNotMatch(reference.instruction, /timed frames|bounded graybox/);
  writeReference(dir);
  const bare = nextAction(dir);
  assert.deepEqual([bare.stage, bare.type], ["extract", "run"]);
  assert.deepEqual(codes(bare), ["reference-evidence-missing", "design-missing", "motion-missing"]);
  assert.ok(bare.findings.every(finding => finding.fix), "every finding names its fix");
  assert.match(bare.command, /foundation check .*--kind all/);
  assert.match(bare.instruction, /not borrow|content, copy, brand marks and logos/);
  writeEvidence(dir);
  assert.deepEqual(codes(nextAction(dir)), ["design-missing", "motion-missing"]);
  // DESIGN.md that passes foundation check but never says what is not borrowed still blocks.
  writeFoundations(dir);
  const design = fs.readFileSync(path.join(dir, "DESIGN.md"), "utf8");
  fs.writeFileSync(path.join(dir, "DESIGN.md"), design.replace(/^- Rejected the reference's content, copy, brand marks and logos\.\n/m, ""));
  assert.deepEqual(codes(nextAction(dir)), ["design-source-decisions-incomplete"]);
  fs.writeFileSync(path.join(dir, "DESIGN.md"), design);
  fs.rmSync(path.join(dir, "MOTION.md"));
  assert.deepEqual(codes(nextAction(dir)), ["motion-missing"]);
  fs.writeFileSync(path.join(dir, "MOTION.md"), "not a motion foundation\n");
  assert.deepEqual(codes(nextAction(dir)), ["motion-invalid"]);
});

test("a reference whose approval is pending blocks extract; a pending graybox does not", () => {
  const dir = project({ deliverable: "ui", tier: "quick" });
  writeReference(dir);
  writeEvidence(dir);
  writeFoundations(dir);
  const evidence = JSON.parse(fs.readFileSync(path.join(dir, "reference-evidence.json"), "utf8"));
  fs.writeFileSync(path.join(dir, "reference-evidence.json"), JSON.stringify({ ...evidence, approval: { status: "pending", evidence: "The owner has not confirmed the reading." } }));
  assert.deepEqual(codes(nextAction(dir)), ["reference-approval-pending"]);
  fs.writeFileSync(path.join(dir, "reference-evidence.json"), JSON.stringify(evidence));
  const ask = nextAction(dir);
  assert.deepEqual([ask.stage, ask.type], ["extract", "ask"], "there is no graybox yet, and the build makes it");
});

test("standard replicate also requires the design-system package", () => {
  const dir = project({ deliverable: "ui", tier: "standard" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  writeReference(dir);
  writeEvidence(dir);
  writeFoundations(dir);
  assert.equal(nextAction(dir).type, "ask", "the fixture package is ready");
  fs.rmSync(path.join(dir, "design-system"), { recursive: true });
  const missing = nextAction(dir);
  assert.deepEqual([missing.stage, missing.type], ["extract", "run"]);
  assert.deepEqual(codes(missing), ["design-system-missing"]);
  assert.match(missing.instruction, /design-system compile/);
});

test("the owner confirms the extraction: the ask shows tokens, previews and the borrowed list; only the owner records it", () => {
  const dir = project({ deliverable: "ui", tier: "standard" });
  decide(dir, { by: "owner", stage: "intake", answer: "default" });
  writeReference(dir);
  writeEvidence(dir);
  writeFoundations(dir);
  const previews = path.join(dir, ".design-pipeline", "design-system", "previews");
  fs.mkdirSync(previews, { recursive: true });
  fs.writeFileSync(path.join(previews, "Entry.html"), "<p>Entry</p>");
  fs.writeFileSync(path.join(previews, "Cover.html"), "<p>Cover</p>");
  const ask = nextAction(dir);
  assert.deepEqual([ask.stage, ask.type], ["extract", "ask"]);
  assert.ok(ask.show.includes(path.join(dir, "DESIGN.md")) && ask.show.includes(path.join(dir, "MOTION.md")));
  assert.equal(ask.show.find(file => file.includes("previews")), path.join(previews, "Cover.html"), "the cover comes first");
  assert.ok(ask.tokens.colors > 0 && ask.tokens.typography > 0, "token summary: " + JSON.stringify(ask.tokens));
  assert.match(ask.borrowed, /Adopted/);
  assert.match(ask.borrowed, /content, copy, brand marks and logos/);
  assert.match(ask.record, /--by owner --stage extract --verdict accept/);
  assert.throws(() => decide(dir, { by: "agent", stage: "extract", verdict: "accept", answer: "Looks fine to me" }), /stays with the owner/);
  assert.throws(() => decide(dir, { by: "owner", stage: "extract", verdict: "accept", answer: "<the owner's words>" }), /placeholder/);
  assert.throws(() => decide(dir, { by: "owner", stage: "extract", answer: "Yes" }), /accept\|reject/);
  const recorded = confirmExtraction(dir);
  assert.equal(recorded.next.stage, "work");
  const [entry] = readState(dir).decisions.extractions;
  assert.equal(entry.by, "owner");
  assert.deepEqual(Object.keys(entry.inputs), ["DESIGN.md", "MOTION.md", "reference.md", "reference-evidence.json"]);
  assert.ok(Object.values(entry.inputs).every(hash => /^sha256:[0-9a-f]{64}$/.test(hash)));
});

test("editing DESIGN.md after the confirmation reopens it, and a ui delivery and review bound to the old one reopen with it", () => {
  const dir = project({ deliverable: "ui", tier: "quick" });
  extractReplicate(dir);
  assert.equal(nextAction(dir).stage, "work");
  decide(dir, { by: "owner", stage: "deliver", answer: "index.html at 390px and 1280px, checked" });
  assert.equal(nextAction(dir).stage, "review");
  append(dir, "DESIGN.md", "\nAn edit after the owner confirmed.\n");
  const reopened = nextAction(dir);
  assert.deepEqual([reopened.stage, reopened.type], ["extract", "ask"]);
  assert.match(reopened.first, /DESIGN\.md changed/);
  assert.throws(() => decide(dir, { by: "owner", stage: "review", verdict: "accept", answer: "Looks right" }), /Cannot record review while extract is unfinished/);
  confirmExtraction(dir);
  const rebuilt = nextAction(dir);
  assert.equal(rebuilt.stage, "work", "the delivery was bound to the old extraction");
  decide(dir, { by: "owner", stage: "deliver", answer: "index.html rebuilt on the new extraction" });
  assert.equal(nextAction(dir).stage, "review");
  decide(dir, { by: "owner", stage: "review", verdict: "accept", answer: "Looks right to me" });
  assert.equal(nextAction(dir).type, "done");
  // reference.md and the evidence are bound too.
  append(dir, "reference.md", "A late note.\n");
  assert.equal(nextAction(dir).stage, "extract");
  confirmExtraction(dir);
  assert.equal(nextAction(dir).stage, "work");
});

test("the owner's rejection becomes a rule and sends the files back for revision", () => {
  const dir = project({ deliverable: "ui", tier: "quick" });
  writeReference(dir);
  writeEvidence(dir);
  writeFoundations(dir);
  const recorded = decide(dir, { by: "owner", stage: "extract", verdict: "reject", answer: "The type scale is too large; keep the headline under 48px" });
  assert.equal(recorded.next.stage, "extract");
  assert.equal(recorded.next.type, "run");
  assert.match(recorded.next.instruction, /rejected this extraction/);
  assert.ok(readState(dir).rules.some(rule => /48px/.test(rule.text) && rule.from === "extraction 1"));
  assert.ok(nextAction(dir).rules.some(rule => /48px/.test(rule)), "the rule comes back with the next actions");
  append(dir, "DESIGN.md", "\nHeadline capped at 48px.\n");
  const again = nextAction(dir);
  assert.deepEqual([again.stage, again.type], ["extract", "ask"]);
  assert.match(again.first, /rejected the earlier extraction/);
});

test("--stage extract applies only to ui and web replicate projects", () => {
  const dir = project({ deliverable: "ui", tier: "quick", mode: "brief" });
  assert.throws(() => decide(dir, { by: "owner", stage: "extract", verdict: "accept", answer: "Yes please" }), /only to ui and web replicate/);
  const film = project({ deliverable: "film", tier: "quick" });
  assert.throws(() => decide(film, { by: "owner", stage: "extract", verdict: "accept", answer: "Yes please" }), /only to ui and web replicate/);
});

test("web replicate lists extract after the reference and binds the description approval to the extraction", () => {
  assert.deepEqual(webStages({ tier: "quick", mode: "replicate" }).map(stage => stage.id), ["intake", "reference", "extract", "components", "build", "probe", "review"]);
  const dir = project({ deliverable: "web", tier: "standard" });
  confirmPlayback(dir);
  assert.equal(nextAction(dir).stage, "reference");
  extractReplicate(dir);
  decide(dir, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  approveDescription(dir);
  assert.equal(nextAction(dir).stage, "build");
  append(dir, "DESIGN.md", "\nA type-scale correction after approval.\n");
  assert.equal(nextAction(dir).stage, "extract");
  confirmExtraction(dir, "Yes, with the corrected type scale");
  const stale = nextAction(dir);
  assert.equal(stale.stage, "description", "the approval was given under the old extraction");
  assert.match(stale.first || stale.instruction || "", /confirmed extraction/);
  assert.throws(() => decide(dir, { by: "owner", stage: "description", verdict: "accept", choice: "first-screen" }), /--revision/);
  decide(dir, { by: "owner", stage: "description", verdict: "accept", choice: "first-screen", revision: "commitment", affects: "all" });
  assert.equal(nextAction(dir).stage, "build");
});

test("a web interaction pass binds the reference files, so editing reference.md makes the probe stale", () => {
  const dir = project({ deliverable: "web", tier: "quick" });
  statedSkip(dir);
  extractReplicate(dir);
  decide(dir, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  fs.writeFileSync(path.join(dir, "component-manifest.json"), JSON.stringify({ fromScratch: true, entries: [] }));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><html><body><main>page</main></body></html>");
  fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify({ probes: [{ kind: "audit" }] }));
  recordGate(dir, "interaction", "passed", ["interaction.json", "index.html"], {}, { files: ["index.html"], tokens: ["DESIGN.md", "MOTION.md"], absent: [], remote: [] });
  const hashes = readState(dir).gates.interaction.inputHashes;
  assert.ok(hashes["reference.md"] && hashes["reference-evidence.json"] && hashes["DESIGN.md"] && hashes["MOTION.md"]);
  assert.equal(nextAction(dir).stage, "review");
  // The reference note changes after the pass; the confirmation reopens first.
  append(dir, "reference.md", "More observations.\n");
  assert.equal(nextAction(dir).stage, "extract");
  confirmExtraction(dir);
  const probe = nextAction(dir);
  assert.equal(probe.stage, "probe", "the pass was recorded over the old reference notes");
  assert.equal(probe.verification.status, "stale");
});

test("a website-cloning manifest that is not complete keeps the probe open and names the evaluator", () => {
  const dir = project({ deliverable: "web", tier: "quick" });
  statedSkip(dir);
  extractReplicate(dir);
  decide(dir, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  fs.writeFileSync(path.join(dir, "component-manifest.json"), JSON.stringify({ fromScratch: true, entries: [] }));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><html><body><main>page</main></body></html>");
  fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify({ probes: [{ kind: "audit" }] }));
  const lineage = { files: ["index.html"], tokens: ["DESIGN.md", "MOTION.md"], absent: [], remote: [] };
  recordGate(dir, "interaction", "passed", ["interaction.json", "index.html"], {}, lineage);
  assert.equal(nextAction(dir).stage, "review", "without a manifest the pass finishes the probe");
  const change = path.join(dir, "design", "changes", "clone-example");
  fs.mkdirSync(change, { recursive: true });
  const manifest = { status: "fidelity-limited", verification: { status: "failed", reasons: ["landing: hero spacing differs from the reference"] }, implementationAuthority: { protectedInvariants: ["component topology"], allowedDifferences: ["brand marks"] } };
  fs.writeFileSync(path.join(change, "website-cloning.json"), JSON.stringify(manifest));
  const probe = nextAction(dir);
  assert.deepEqual([probe.stage, probe.type], ["probe", "run"]);
  assert.match(probe.command, /evaluate-website-clone\.cjs --change-root .*clone-example --evidence/);
  assert.match(probe.instruction, /fidelity-limited/);
  assert.match(probe.instruction, /hero spacing differs/);
  assert.match(probe.instruction, /component topology/);
  assert.match(probe.instruction, /brand marks/);
  fs.writeFileSync(path.join(change, "website-cloning.json"), JSON.stringify({ ...manifest, status: "complete", verification: { status: "passed", reasons: [] } }));
  assert.equal(nextAction(dir).stage, "review");
  const other = path.join(dir, "design", "changes", "clone-older");
  fs.mkdirSync(other, { recursive: true });
  fs.writeFileSync(path.join(other, "website-cloning.json"), JSON.stringify(manifest));
  const ambiguous = nextAction(dir);
  assert.deepEqual([ambiguous.stage, ambiguous.type], ["probe", "blocked"], "two clone manifests never pick one silently");
  assert.match(ambiguous.blocker, /clone-example.*clone-older|clone-older.*clone-example/);
});

test("natural reference phrasings route to the clone and reconstruction jobs", () => {
  for (const query of ["copy this page", "make it like this", "like this site", "照着做", "照这个做", "像这个网站", "仿照", "参考这个页面"]) {
    assert.equal(routeJob({ query }).job, "website-clone", query);
  }
  assert.equal(routeJob({ query: "screenshot to code" }).job, "reference-reconstruction");
  const result = spawnSync(process.execPath, [cli, "route", "--query", "照这个做", "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /website-clone/);
  const skill = fs.readFileSync(path.join(__dirname, "..", "skill", "SKILL.md"), "utf8");
  assert.match(skill, /reference page or screenshot to follow.*next --project-root <project> --deliverable web\\\|ui --mode replicate/);
});

test("freeform is not a mode, and web intake accepts default like ui and film", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-replicate-"));
  roots.push(dir);
  assert.throws(() => initState(dir, { deliverable: "ui", tier: "quick", mode: "freeform" }), /mode has invalid value freeform; allowed: brief, replicate/);
  const result = spawnSync(process.execPath, [cli, "next", "--root", dir, "--project-root", dir, "--deliverable", "ui", "--tier", "quick", "--mode", "freeform", "--json"], { encoding: "utf8", windowsHide: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /freeform/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "..", "skill", "SKILL.md"), "utf8"), /freeform/);

  const web = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-replicate-"));
  roots.push(web);
  initState(web, { deliverable: "web", tier: "standard" });
  const ask = nextAction(web);
  assert.match(ask.default, /--stage intake --answer default/);
  assert.throws(() => decide(web, { by: "owner", stage: "intake", choice: "skip", answer: "default" }), /at least 6 words/);
  const recorded = decide(web, { by: "owner", stage: "intake", answer: "default" });
  assert.deepEqual(readState(web).decisions.intake, { answer: "default", defaulted: true, by: "owner" });
  assert.equal(recorded.next.stage, "reference");
  const quick = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-replicate-"));
  roots.push(quick);
  initState(quick, { deliverable: "web", tier: "quick" });
  assert.throws(() => decide(quick, { by: "owner", stage: "intake", answer: "default" }), /web intake records/);
});
