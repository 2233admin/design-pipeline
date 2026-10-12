"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { initState, nextAction, decide, readState } = require("../skill/scripts/workflow-core.cjs");
const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const tiers = ["quick", "standard", "full"];
const modes = ["brief", "freeform", "replicate"];

function fixture(t, tier = "quick", mode = "brief") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-components-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "web", tier, mode });
  if (tier !== "quick") decide(root, { stage: "intake", answer: "A product page" });
  if (mode === "replicate") fs.writeFileSync(path.join(root, "reference.md"), "# Observed reference\nStructure and timing");
  else if (tier !== "quick") decide(root, { stage: "reference", answer: "none" });
  if (tier !== "quick" && mode !== "replicate") decide(root, { stage: "concept", choice: "1" });
  return root;
}
function manifest(root, entries) {
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries }));
}
const entry = () => ({ name: "Project card", sourceId: "project.card", availability: "project-owned", license: { state: "project-owned" }, usedIn: [{ file: "index.html", how: "Product feature card" }] });

for (const tier of tiers) for (const mode of modes) {
  test(`web ${tier}/${mode} asks components immediately before build and follows the recorded answer`, t => {
    const root = fixture(t, tier, mode);
    const ask = nextAction(root);
    assert.equal(ask.stage, "components");
    assert.equal(ask.type, "ask");
    assert.match(ask.question, /components/i);
    assert.match(JSON.stringify(ask.options), /project.*paths.*GitHub.*index.*scratch/i);
    assert.match(ask.recommended, /project.*first.*index/i);
    assert.match(ask.record, /--stage components --answer/);
    assert.ok(!ask.record.includes("--project-root ."));
    const answer = 'Use src/components first, then search the index for "pricing"';
    const recorded = spawnSync(process.execPath, [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--answer", answer, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
    assert.equal(recorded.status, 0, recorded.stdout + recorded.stderr);
    assert.equal(readState(root).decisions.components, answer);
    const build = nextAction(root);
    assert.equal(build.stage, "build");
    assert.equal(build.type, "run");
    assert.ok(build.instruction.includes(JSON.stringify(answer)));
    assert.match(build.instruction, /references\/component-source-catalog\.json/);
    assert.match(build.instruction, /component-manifest\.json/);
    assert.match(build.instruction, /sourceId.*availability.*license.*usedIn/s);
    assert.match(build.instruction, /unverified.*commercial.*never copied/s);
    assert.match(build.instruction, /design-system route .*--query "<page brief>" --platform web/);
    assert.match(build.instruction, /design-system search/);
    fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><h1>Page</h1>");
    assert.equal(nextAction(root).stage, "build", "HTML without a manifest is unfinished");
    manifest(root, [entry()]);
    assert.equal(nextAction(root).stage, "probe");
    assert.deepEqual(readState(root).gates, {}, "completion does not introduce a gate");
  });
}

test("web component manifest requires an HTML file, entries array and each required field", t => {
  const root = fixture(t);
  decide(root, { stage: "components", answer: "Existing project components" });
  manifest(root, [entry()]);
  assert.equal(nextAction(root).stage, "build");
  fs.mkdirSync(path.join(root, "index.html"));
  assert.equal(nextAction(root).stage, "build", "a directory is not an HTML deliverable");
  fs.rmdirSync(path.join(root, "index.html"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  for (const body of ["{", "null", "[]", '{"entries":{}}']) {
    fs.writeFileSync(path.join(root, "component-manifest.json"), body);
    assert.equal(nextAction(root).stage, "build", `invalid manifest ${body}`);
  }
  const invalid = [null, {}, { ...entry(), name: " " }, { ...entry(), sourceId: "" }, { ...entry(), availability: "downloaded" }, { ...entry(), license: "MIT" }, { ...entry(), license: { state: "MIT" } }, { ...entry(), usedIn: [] }, { ...entry(), usedIn: [{ file: "index.html" }] }, { ...entry(), usedIn: [{ file: " ", how: "card" }] }];
  for (const value of invalid) {
    manifest(root, [value]);
    assert.equal(nextAction(root).stage, "build", JSON.stringify(value));
  }
  const fromUrl = entry();
  delete fromUrl.sourceId;
  fromUrl.url = "https://github.com/example/components";
  manifest(root, [fromUrl]);
  assert.equal(nextAction(root).stage, "probe", "a URL can identify a user-named source");
});

test("scratch build accepts an empty manifest but still needs the recorded decision", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  manifest(root, []);
  assert.equal(nextAction(root).stage, "components");
  assert.throws(() => decide(root, { stage: "components", answer: " " }), /answer/);
  decide(root, { stage: "components", answer: "Write from scratch" });
  assert.equal(nextAction(root).stage, "probe");
});

test("non-scratch component decisions cannot finish build with an empty manifest", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  manifest(root, []);
  for (const answer of [
    "Use src/components",
    "Search this skill's component source index",
    "Use https://github.com/shadcn-ui/ui",
    "Reuse project components, then write from scratch if needed",
  ]) {
    decide(root, { stage: "components", answer });
    assert.equal(nextAction(root).stage, "build", `empty manifest must not satisfy ${answer}`);
  }
  decide(root, { stage: "components", answer: "Write from scratch" });
  assert.equal(nextAction(root).stage, "probe");
});

test("returned component decision and index commands work from outside the project", t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-components-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const answer = "Project components first, then search the index";
  const record = nextAction(root).record.replace('"<the user\'s reply>"', JSON.stringify(answer));
  const decided = spawnSync(record, { cwd: outside, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(decided.status, 0, decided.stdout + decided.stderr);
  assert.equal(readState(root).decisions.components, answer);
  const instruction = nextAction(root).instruction;
  for (const action of ["route", "search"]) {
    const command = instruction.match(new RegExp('`(node [^`]+ design-system ' + action + ' [^`]+)`'))?.[1];
    assert.ok(command, `${action} command in ${instruction}`);
    assert.ok(command.includes(cli.replaceAll(path.sep, "/")));
    const result = spawnSync(command.replace('"<page brief>"', '"button"') + " --json", { cwd: outside, shell: true, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const value = JSON.parse(result.stdout);
    assert.ok(value.status);
    if (action === "search") assert.equal(value.namespace, "frontend-component-sources");
  }
});

test("ui keeps its generic work and evidence-delivery contract", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-components-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "ui", tier: "quick" });
  const action = nextAction(root);
  assert.equal(action.stage, "work");
  assert.match(action.command, /--stage deliver --answer <evidence>/);
  assert.doesNotMatch(action.instruction, /component-manifest\.json|build index\.html/);
});
