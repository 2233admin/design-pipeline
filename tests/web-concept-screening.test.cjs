"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decide, initState } = require("../skill/scripts/workflow-core.cjs");

const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");

function conceptsAction(tier, ready) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "concept-screening-"));
  try {
    initState(root, { deliverable: "web", tier });
    decide(root, { stage: "intake", answer: "default" });
    decide(root, { stage: "reference", answer: "none" });
    if (ready) fs.writeFileSync(path.join(root, "concepts.md"), "# Three concept cards\n");
    const child = spawnSync(process.execPath, [cli, "next", "--project-root", root, "--json"], { cwd: root, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    return JSON.parse(child.stdout);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function requiresScreening(action) {
  const guidance = `${action.instruction || ""} ${action.why || ""}`;
  assert.match(guidance, /same[- ]size|equal[- ]size/i, "compare like-size first screens");
  assert.match(guidance, /contact sheet/i, "screen the three cards together");
  assert.match(guidance, /pre-screen/i, "agent screens before involving the user");
  assert.match(guidance, /same skeleton/i, "reject structural duplicates");
  assert.match(guidance, /common template/i, "reject generic template choices");
  assert.match(guidance, /hierarchy.*collaps|collaps.*hierarchy/i, "reject unreadable hierarchy");
  assert.match(guidance, /redo|rework/i, "repair failed cards rather than show them");
  assert.match(guidance, /before (asking|showing|presenting)|without showing/i, "screening precedes the user choice");
  assert.match(guidance, /not (?:owner )?Visual Acceptance/i, "screening cannot grant acceptance");
}

for (const tier of ["standard", "full"]) {
  test(`web ${tier} concept production requires structural divergence and screening`, () => {
    const action = conceptsAction(tier, false);
    assert.equal(action.stage, "concepts");
    assert.equal(action.type, "run");
    for (const relation of [/skeleton/i, /focal element/i, /type position/i, /image(?:'s)? role/i]) {
      assert.match(action.instruction, relation, "first-screen structure must genuinely diverge");
    }
    assert.match(action.instruction, /one[- ]line skeleton|skeleton in one line/i);
    requiresScreening(action);
  });

  test(`web ${tier} concept choice still requires screening when concepts.md exists`, () => {
    const action = conceptsAction(tier, true);
    assert.equal(action.stage, "concepts");
    assert.equal(action.type, "ask");
    requiresScreening(action);
  });
}
