"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { decide, initState, nextAction } = require("../skill/scripts/workflow-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");
const { validateMotionFoundationText } = require("../skill/scripts/motion-foundation-core.cjs");
const { pngBytes } = require("./helpers/reference-fixtures.cjs");

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const roots = [];
test.after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function project(tier = "standard") {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-ui-"));
  roots.push(parent);
  const root = path.join(parent, "console");
  fs.mkdirSync(root);
  initState(root, { deliverable: "ui", tier });
  return root;
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return { path: rel, sha256: hash(content) };
}

// Two rendered candidates that differ on every axis.
function writePreview(root) {
  const shot = (id) => write(root, `direction-previews/${id}.png`, Buffer.concat([pngBytes({ width: 1440, height: 900 }), Buffer.from(id)]));
  const receipt = {
    schema: "design-pipeline.direction-preview.v1",
    changeId: path.basename(root),
    applicability: { status: "required", reason: "open-surface" },
    comparison: {
      brief: write(root, "brief.md", "# Console\n"),
      index: write(root, "direction-previews/index.html", '<main data-direction-preview><section data-direction-id="notebook"></section><section data-direction-id="desk"></section></main>'),
      viewport: { width: 1440, height: 900 },
      contentFixtureSha256: hash("fixture"),
      stateCoverage: ["default", "empty"],
    },
    directions: [
      { id: "notebook", name: "Notebook", thesis: "A research notebook", signature: "Margin entries", axes: { luminance: "light", typeFamily: "serif", color: "warm", layout: "column", density: "low", era: "classic", material: "paper" }, screenshot: shot("notebook") },
      { id: "desk", name: "Desk", thesis: "A trading desk", signature: "Status bar", axes: { luminance: "dark", typeFamily: "mono", color: "signal", layout: "panes", density: "high", era: "terminal", material: "screen" }, screenshot: shot("desk") },
    ],
    decision: { status: "pending", selectedDirectionId: null, rationale: null },
  };
  fs.writeFileSync(path.join(root, "direction-preview.json"), JSON.stringify(receipt, null, 2));
}

test("ui intake asks interface questions, not a film's duration", () => {
  const ids = nextAction(project()).questions.map((q) => q.id);
  assert.deepEqual(ids, ["product", "audience", "content", "assets"]);
});

test("ui standard runs Stage 0 and a direction preview before the work", () => {
  const root = project();
  decide(root, { by: "owner", stage: "intake", answer: "default" });
  const first = nextAction(root);
  assert.equal(first.stage, "concepts");
  assert.match(first.instruction, /Stage 0[\s\S]*direction-preview\.json/);
  writePreview(root);
  const ask = nextAction(root);
  assert.equal(ask.type, "ask");
  assert.match(ask.question, /notebook \(Notebook\), desk \(Desk\)/);
  assert.equal(ask.show.length, 3);
});

test("the owner's pick is written into the receipt; agents, unknown ids and bare answers are refused", () => {
  const root = project();
  decide(root, { by: "owner", stage: "intake", answer: "default" });
  writePreview(root);
  assert.throws(() => decide(root, { by: "agent", stage: "concept", choice: "notebook", answer: "Reads like a lab notebook" }), /owner's pick|owner/);
  assert.throws(() => decide(root, { by: "owner", stage: "concept", choice: "ledger", answer: "Reads like a lab notebook" }), /name a candidate direction/);
  assert.throws(() => decide(root, { by: "owner", stage: "concept", choice: "notebook", answer: "ok" }), /owner's words/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "direction-preview.json"), "utf8")).decision.status, "pending");
  decide(root, { by: "owner", stage: "concept", choice: "notebook", answer: "Reads like a lab notebook" });
  const receipt = JSON.parse(fs.readFileSync(path.join(root, "direction-preview.json"), "utf8"));
  assert.deepEqual(receipt.decision, { status: "selected", selectedDirectionId: "notebook", rationale: "Reads like a lab notebook", by: "owner" });
  assert.equal(nextAction(root).stage, "work");
});

test("quick ui has no direction stage", () => {
  assert.equal(nextAction(project("quick")).stage, "work");
});

test("a relative --project-root names --root in its error", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-ui-root-"));
  roots.push(parent);
  fs.mkdirSync(path.join(parent, "app"));
  const result = execute(["foundation", "check", "--root", path.join(parent, "app"), "--project-root", "app", "--json"]);
  assert.equal(result.exitCode, 1);
  assert.match(result.output.error.message, /relative --project-root is resolved against --root/);
});

test("MOTION.md source decisions say which lines are missing", () => {
  const text = "---\nschema: design-pipeline.motion-foundation.v0.1\nname: x\nposture: static\nprimitiveRegistry: design-pipeline.motion-primitives.v1\n---\n\n# x\n\n## Motion Thesis\n\nStill.\n\n## Motion Principles\n\n- Still.\n\n## Motion Vocabulary\n\nNone.\n\n## Procedural Motion\n\nDisabled.\n\n## Runtime Policy\n\nNone.\n\n## Reduced Motion\n\nSubstitute: none. Fallback: identical.\n\n## Source Decisions\n\nWe adopted stillness and rejected motion.\n";
  assert.throws(() => validateMotionFoundationText(text), /line that starts with Adopted:/);
});

test("under --director the art director records the pick, bound to the saved state", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-ui-director-"));
  roots.push(parent);
  const root = path.join(parent, "console");
  fs.mkdirSync(root);
  initState(root, { deliverable: "ui", tier: "standard", director: "claude-opus-5-5" });
  decide(root, { by: "owner", stage: "intake", answer: "default" });
  writePreview(root);
  const ask = nextAction(root);
  assert.match(ask.record, /--by agent/);
  decide(root, { by: "agent", stage: "concept", choice: "desk", answer: "Dense enough for daily use" });
  const decision = JSON.parse(fs.readFileSync(path.join(root, "direction-preview.json"), "utf8")).decision;
  assert.equal(decision.by, "agent");
  assert.equal(decision.agent, "claude-opus-5-5");
  assert.equal(decision.delegation.stateSha256, hash(fs.readFileSync(path.join(root, ".design-pipeline", "state.json"))));
  assert.equal(nextAction(root).stage, "work");
});

test("a recorded direction reopens when its receipt drifts or disappears", () => {
  const root = project();
  decide(root, { by: "owner", stage: "intake", answer: "default" });
  writePreview(root);
  decide(root, { by: "owner", stage: "concept", choice: "notebook", answer: "Reads like a lab notebook" });
  assert.equal(nextAction(root).stage, "work");
  fs.appendFileSync(path.join(root, "direction-previews", "desk.png"), "changed");
  assert.equal(nextAction(root).stage, "concepts");
  fs.rmSync(path.join(root, "direction-preview.json"));
  assert.match(nextAction(root).instruction, /Stage 0/);
});
