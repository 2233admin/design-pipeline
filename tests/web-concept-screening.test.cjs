"use strict";

// The web concepts stage: six direction cards from three sources, the thumbnail board and three full
// first-screen versions a, b and c that `direction check` gates before the owner picks, mixes or
// rejects; tiers and modes without the stage. Assertions pin behaviour (stages, action shapes,
// records, rules), not the wording of a question.

const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { decide, initState, nextAction, readState } = require("../skill/scripts/workflow-core.cjs");
const flow = require("./helpers/web-flow.cjs");
const { readReceipt, saveReceipt, writeDirectionSet } = require("./helpers/direction-fixture.cjs");

const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

function project(t, { tier = "standard", mode = "brief" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-concepts-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }));
  initState(root, { deliverable: "web", tier, mode });
  return root;
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

const rulesFrom = root => readState(root).rules.map(rule => rule.from);

for (const tier of ["standard", "full"]) {
  test(`web ${tier} concepts first asks for six cards, the thumbnail board and three full versions`, t => {
    const root = project(t, { tier });
    flow.confirmPlayback(root);
    decide(root, { by: "owner", stage: "reference", answer: "none" });
    const action = nextAction(root);
    assert.equal(action.stage, "concepts");
    assert.equal(action.type, "run");
    for (const part of [/direction draw/, /two per logic|two roulette/, /designer/, /composition capture/, /seen to false/, /thumbs\.html/, /dir-1\.html/, /alone/, /overdone|prop, metaphor/]) {
      assert.match(action.instruction, part);
    }
    assert.doesNotMatch(action.instruction, /switcher|concepts\.html/);
  });
}

test("the full versions must be named a, b and c, and a failing check returns findings with their fixes", t => {
  const root = project(t);
  flow.confirmPlayback(root);
  decide(root, { by: "owner", stage: "reference", answer: "none" });
  refuses(root, { by: "owner", stage: "concept", choice: "a" }, "WORKFLOW_NOT_READY");
  writeDirectionSet(root, { ids: ["x", "y", "z"] });
  const named = nextAction(root);
  assert.equal(named.type, "run");
  assert.deepEqual(named.findings.map(item => item.code), ["web-version-ids"]);
  const receipt = writeDirectionSet(root, { ids: ["a", "b", "c"] });
  delete receipt.thumbs;
  saveReceipt(root, receipt);
  const broken = nextAction(root);
  assert.equal(broken.type, "run");
  assert.ok(broken.findings.every(item => item.fix), "every finding carries its fix");
  assert.ok(broken.findings.some(item => item.code === "thumbs-missing"));
});

test("the owner is shown the board and three captures and picks, mixes or rejects", t => {
  const fresh = project(t);
  flow.confirmPlayback(fresh);
  decide(fresh, { by: "owner", stage: "reference", answer: "none" });
  flow.writeVariants(fresh);
  const choose = nextAction(fresh);
  assert.equal(choose.type, "ask");
  assert.equal(choose.alternates.length, 3);
  assert.equal(choose.show.length, 4);
  assert.match(choose.record, /--choice <a\|b\|c/);
  assert.match(choose.correction, /--verdict reject/);

  for (const choice of ["2", "d", "a,a"]) refuses(fresh, { by: "owner", stage: "concept", choice, answer: "I like it" }, "CONTRACT_INVALID");
  refuses(fresh, { by: "owner", stage: "concept", choice: "b,c" }, "CONTRACT_INVALID");
  refuses(fresh, { by: "owner", stage: "concept", choice: "b", mix: ["layout=b"], answer: "B please" }, "CONTRACT_INVALID");
  refuses(fresh, { by: "owner", stage: "concept", choice: "b" }, "CONTRACT_INVALID");
  decide(fresh, { by: "owner", stage: "concept", choice: "b", answer: "B reads right" });
  assert.equal(readState(fresh).decisions.concept, "b");
  assert.equal(nextAction(fresh).stage, "components");
  // Editing the receipt after the pick reopens the stage: later stages must read what the owner saw.
  const picked = readReceipt(fresh);
  const original = JSON.parse(JSON.stringify(picked));
  picked.directions[1].thesis = "Rewritten after the pick";
  saveReceipt(fresh, picked);
  assert.equal(nextAction(fresh).stage, "concepts");
  saveReceipt(fresh, original);
  assert.equal(nextAction(fresh).stage, "components");
  decide(fresh, { by: "owner", stage: "concept", choice: "b,c", mix: ["layout=b", "colour=c"], taste: ["too plain, more like a magazine"], answer: "B's layout with C's colour" });
  const { concept, conceptNotes, conceptMix, variants } = readState(fresh).decisions;
  assert.equal(concept, "b,c");
  assert.equal(conceptNotes, "B's layout with C's colour");
  assert.deepEqual(conceptMix, { layout: "b", colour: "c" });
  assert.deepEqual(variants.map(item => [item.verdict, item.choice]), [["pick", "b"], ["pick", "b,c"]]);
  assert.ok(readState(fresh).rules.some(rule => rule.from === "direction taste" && /magazine/.test(rule.text)));
});

test("a directions rejection becomes a rule and asks for a redo until the receipt changes", t => {
  const root = project(t);
  flow.confirmPlayback(root);
  decide(root, { by: "owner", stage: "reference", answer: "none" });
  flow.writeVariants(root);
  decide(root, { by: "owner", stage: "concept", verdict: "reject", answer: "All three look like templates" });
  const redo = nextAction(root);
  assert.equal(redo.type, "ask");
  assert.ok(redo.first.includes("All three look like templates"), redo.first);
  assert.deepEqual(readState(root).rules.map(({ text, from, scope }) => ({ text, from, scope })), [{ text: "All three look like templates", from: "variants 1", scope: "object" }]);
  const receipt = readReceipt(root);
  receipt.directions[0].thesis = "Redone without the template look";
  saveReceipt(root, receipt);
  assert.equal(nextAction(root).first, undefined);
  decide(root, { by: "owner", stage: "concept", verdict: "reject", answer: "C is still a stock grid" });
  assert.deepEqual(rulesFrom(root), ["variants 1", "variants 2"]);
  flow.pickVariant(root, "C");
  assert.equal(nextAction(root).stage, "components");
});

test("quick and replicate projects have no directions to pick or reject", t => {
  for (const [tier, mode] of [["quick", "brief"], ["quick", "replicate"], ["standard", "replicate"], ["full", "replicate"]]) {
    const root = project(t, { tier, mode });
    flow.toComponents(root);
    flow.writeVariants(root);
    refuses(root, { by: "owner", stage: "concept", choice: "a" }, "CONTRACT_INVALID");
    refuses(root, { by: "owner", stage: "concept", verdict: "reject", answer: "None of these" }, "CONTRACT_INVALID");
    assert.equal(nextAction(root).stage, "components", `${tier}/${mode}`);
  }
});
