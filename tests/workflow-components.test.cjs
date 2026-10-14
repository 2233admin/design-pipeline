"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { STATE, initState, nextAction, decide, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { validateComponentManifest } = require("../skill/scripts/design-system-catalog-core.cjs");
const { acceptSections, approveDescription, toBuild, toComponents } = require("./helpers/web-flow.cjs");
const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
const tiers = ["quick", "standard", "full"];
const modes = ["brief", "freeform", "replicate"];

function fixture(t, tier = "quick", mode = "brief") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-components-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "web", tier, mode });
  toComponents(root);
  return root;
}
function manifest(root, entries, fromScratch = false) {
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries, fromScratch }));
}
const entry = () => ({ name: "Project card", sourceId: "index.html", availability: "project-owned", license: { state: "project-owned" }, usedIn: [{ file: "index.html", marker: "Page", how: "Product feature card" }] });
const CHOICES = ["project", "github", "index", "discover", "scratch"];

// The components question offers each source by id with a plain label, and recommends the project's
// own components, then the index, then discovery, by their labels; record keeps the ids.
function assertComponentsAsk(ask) {
  const components = ask.questions.find(question => question.id === "components");
  assert.deepEqual(components.options.map(option => option.choice), CHOICES);
  for (const { choice, label } of components.options) {
    assert.ok(typeof label === "string" && label.trim(), `${choice} has a label`);
    assert.notEqual(label.trim().toLowerCase(), choice, `${choice} is labelled in words, not by its id`);
  }
  const label = id => components.options.find(option => option.choice === id).label.toLowerCase();
  for (const recommended of [components.recommended, ask.recommended]) {
    const at = ["project", "index", "discover"].map(id => recommended.toLowerCase().indexOf(label(id)));
    assert.ok(at[0] >= 0 && at[0] < at[1] && at[1] < at[2], `recommends project, index, then discover by label: ${recommended}`);
  }
  assert.match(ask.record, /--stage components .*--choice .*--answer /);
  assert.match(ask.correction, /--stage components --verdict reject/);
  return components;
}

for (const tier of tiers) for (const mode of modes) {
  test(`web ${tier}/${mode} asks components before build and follows the recorded answer`, t => {
    const root = fixture(t, tier, mode);
    const ask = nextAction(root);
    assert.equal(ask.stage, "components");
    assert.equal(ask.type, "ask");
    assert.deepEqual(ask.questions.map(question => question.id), tier === "quick" ? ["components"] : ["sections", "components"]);
    const components = assertComponentsAsk(ask);
    assert.ok(components.ask?.trim(), "the components question is asked");
    assert.match(ask.record, /--stage components.*--choice.*--answer/);
    assert.ok(!ask.record.includes("--project-root ."));
    const answer = 'Use src/components first, then search the index for "pricing"';
    const recorded = spawnSync(process.execPath, [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--by", "owner", "--choice", "project,index", "--answer", answer, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
    assert.equal(recorded.status, 0, recorded.stdout + recorded.stderr);
    assert.equal(readState(root).decisions.components, answer);
    assert.deepEqual(readState(root).decisions.componentSources, ["project", "index"]);
    if (tier !== "quick") assert.equal(nextAction(root).stage, "description", "standard and full describe the page before building it");
    toBuild(root);
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
    assert.equal(acceptSections(root).stage, "probe");
    assert.deepEqual(readState(root).gates, {}, "completion does not introduce a gate");
  });
}

test("web component manifest requires an HTML file, entries array and each required field", t => {
  const root = fixture(t);
  decide(root, { by: "owner", stage: "components", choice: "project", answer: "Existing project components" });
  manifest(root, [entry()]);
  assert.equal(nextAction(root).stage, "build");
  fs.mkdirSync(path.join(root, "index.html"));
  assert.equal(nextAction(root).stage, "build", "a directory is not an HTML deliverable");
  fs.rmdirSync(path.join(root, "index.html"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><h1>Page</h1>");
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
  fromUrl.availability = "reference-link";
  fromUrl.license.state = "unverified";
  fromUrl.usedIn[0].how = "Study and reimplement navigation independently";
  decide(root, { by: "owner", stage: "components", choice: "github", answer: "Use https://github.com/example/components" });
  manifest(root, [fromUrl]);
  assert.equal(nextAction(root).stage, "probe", "a URL can identify a user-named source");
});

test("scratch build accepts an empty manifest but still needs the recorded decision", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  manifest(root, [], true);
  assert.equal(nextAction(root).stage, "components");
  assert.throws(() => decide(root, { by: "owner", stage: "components", choice: "scratch", answer: " " }), /answer/);
  decide(root, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  assert.equal(nextAction(root).stage, "probe");
});

test("non-scratch component decisions cannot finish build with an empty manifest", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  manifest(root, []);
  for (const [choice, answer] of [
    ["project", "Use src/components"],
    ["index", "Search this skill's component source index"],
    ["github", "Use https://github.com/shadcn-ui/ui"],
    ["project", "Reuse project components, then write from scratch if needed"],
  ]) {
    decide(root, { by: "owner", stage: "components", choice, answer });
    assert.equal(nextAction(root).stage, "build", `empty manifest must not satisfy ${answer}`);
  }
  decide(root, { by: "owner", stage: "components", choice: "scratch", answer: "Write from scratch" });
  assert.equal(nextAction(root).stage, "build", "scratch decision alone does not replace the explicit flag");
  manifest(root, [], true);
  assert.equal(nextAction(root).stage, "probe");
});

test("returned component decision and index commands work from outside the project", t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-components-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const answer = "Project components first, then search the index";
  const record = nextAction(root).record.replace("<project|github|index|discover|scratch, comma-separated>", "project,index").replace('"<the user\'s reply>"', JSON.stringify(answer));
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

const realEntry = () => ({
  name: "Navigation", sourceId: "shadcn-ui/ui", availability: "reference-link",
  license: { state: "verified" },
  usedIn: [{ file: "index.html", marker: "Navigation", how: "Copy Navigation; retain MIT copyright and license notices in LICENSES.md" }],
});
const round2Cases = [
  ["fabricated sourceId", "index", "Search the index", () => ({ entries: [{ ...realEntry(), sourceId: "invented/library" }] }), "build"],
  ["nonexistent usedIn.file", "index", "Search the index", () => {
    const value = realEntry(); value.usedIn[0].file = "missing.html"; return { entries: [value] };
  }, "build"],
  ["marker absent from file", "index", "Search the index", () => {
    const value = realEntry(); value.usedIn[0].marker = "MissingNavigation"; return { entries: [value] };
  }, "build"],
  ["copying unverified source", "index", "Search the index", () => {
    const value = realEntry(); value.sourceId = "tommyjepsen/awesome-ux-skills";
    value.license.state = "unverified"; value.usedIn[0].how = "Copy the implementation"; return { entries: [value] };
  }, "build"],
  ["Chinese scratch answer", "scratch", "从零写", () => ({ fromScratch: true, entries: [] }), "probe"],
  ["scratch contradicts reuse choice", "github", "Use https://github.com/shadcn-ui/ui", () => ({ fromScratch: true, entries: [realEntry()] }), "build"],
];
for (const [name, choice, answer, body, expected] of round2Cases) {
  test('round2 regression: ' + name, t => {
    const root = fixture(t);
    decide(root, { by: "owner", stage: "components", choice, answer });
    fs.writeFileSync(path.join(root, "index.html"), '<!doctype html><nav class="Navigation">Page</nav>');
    fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify(body()));
    const value = body();
    if (expected === "build") assert.throws(() => validateComponentManifest(value, { root, decision: answer, componentSources: [choice] }), { code: "CONTRACT_INVALID" });
    else assert.equal(validateComponentManifest(value, { root, decision: answer, componentSources: [choice] }), value);
    assert.equal(nextAction(root).stage, expected);
  });
}

function checkManifest(root, decision, value, error, choice = "index") {
  decide(root, { by: "owner", stage: "components", choice, answer: decision });
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify(value));
  if (error) assert.throws(() => validateComponentManifest(value, { root, decision, componentSources: choice.split(",") }), error);
  else assert.equal(validateComponentManifest(value, { root, decision, componentSources: choice.split(",") }), value);
  assert.equal(nextAction(root).stage, error ? "build" : "probe");
}

test("real manifest resolves indexed, decision-named GitHub and project-owned sources", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src/Navigation.js"), 'export const Navigation = "nav";');
  checkManifest(root, "Search the index", { entries: [realEntry()] });
  const owned = { ...entry(), sourceId: "src/Navigation.js" };
  checkManifest(root, "Use src/Navigation.js", { entries: [owned] }, null, "project");
  const fileUrl = { ...owned, url: require("node:url").pathToFileURL(path.join(root, "src/Navigation.js")).href };
  delete fileUrl.sourceId;
  checkManifest(root, "Use project navigation", { entries: [fileUrl] }, null, "project");
  const github = { ...realEntry(), url: "https://github.com/example/component-library" };
  delete github.sourceId;
  github.license.state = "unverified";
  github.usedIn[0].how = "Study and reimplement Navigation independently";
  checkManifest(root, "Use https://github.com/example/component-library", { entries: [github] }, null, "github");
  checkManifest(root, "Use https://github.com/example/other-library", { entries: [github] }, /GitHub repository named/, "github");
  checkManifest(root, "Use https://github.com/example/component-library-extra", { entries: [github] }, /GitHub repository named/, "github");
  github.url = "https://example.com/components";
  checkManifest(root, "Use https://example.com/components", { entries: [github] }, /project file/, "project");
});

test("manifest enforces indexed license states even through a named repository URL", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
  const value = realEntry();
  value.license.state = "unverified";
  checkManifest(root, "Search the index", { entries: [value] }, /must match the indexed source/);
  value.url = "https://github.com/shadcn-ui/ui";
  delete value.sourceId;
  checkManifest(root, "Use https://github.com/shadcn-ui/ui", { entries: [value] }, /must match the indexed source/, "github");
});

test("verified imports and copies explicitly record notice handling in how", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
  for (const operation of ["Import", "Copy", "导入", "复制"]) {
    const value = realEntry();
    value.usedIn[0].how = operation + " Navigation";
    checkManifest(root, "Search the index", { entries: [value] }, /notice handling/);
    value.usedIn[0].how += "; retain copyright/license notices in LICENSES.md";
    checkManifest(root, "Search the index", { entries: [value] });
  }
});

test("unverified and commercial sources permit study/reimplementation but not adoption", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
  for (const [sourceId, state] of [["tommyjepsen/awesome-ux-skills", "unverified"], ["reactbits-pro", "commercial"]]) {
    const value = realEntry();
    value.sourceId = sourceId;
    value.license.state = state;
    value.usedIn[0].how = "Study and reimplement Navigation independently";
    checkManifest(root, "Search the index", { entries: [value] });
    for (const how of ["Copy Navigation", "Import Navigation", "复制 Navigation", "Adapt Navigation"]) {
      value.usedIn[0].how = how;
      checkManifest(root, "Search the index", { entries: [value] }, /cannot be copied or imported|only study/);
    }
  }
});

test("project source and usedIn paths must be contained existing files, including realpath containment", t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-outside-"));
  t.after(() => { fs.unlinkSync(path.join(outside, "outside.html")); fs.rmdirSync(outside); });
  fs.writeFileSync(path.join(outside, "outside.html"), "Navigation Page");
  fs.writeFileSync(path.join(root, "index.html"), "Navigation Page");
  fs.symlinkSync(outside, path.join(root, "escape"), "junction");
  for (const file of [path.join(outside, "outside.html"), path.relative(root, path.join(outside, "outside.html")), "escape/outside.html", ".", "missing.html"]) {
    const owned = { ...entry(), sourceId: file };
    checkManifest(root, "Use project components", { entries: [owned] }, /inside the project/, "project");
    const used = realEntry(); used.usedIn[0].file = file;
    checkManifest(root, "Search the index", { entries: [used] }, /inside the project/);
  }
  const marker = realEntry(); marker.usedIn[0].marker = " ";
  checkManifest(root, "Search the index", { entries: [marker] }, /requires how and marker/);
});

test("explicit scratch accepts answer words independently and rejects external entries", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), "Navigation Page");
  const scratch = { fromScratch: true, entries: [] };
  for (const answer of ["Use shadcn", "从零写，但使用 https://github.com/example/library", "Use React Bits", "Use GSAP", "从零写", "Write from scratch", "自行实现，不用组件库"]) {
    checkManifest(root, answer, scratch, undefined, "scratch");
  }
  checkManifest(root, "从零写", { fromScratch: "true", entries: [] }, /must be a boolean/, "scratch");
  checkManifest(root, "从零写", { entries: [] }, /fromScratch/, "scratch");
  checkManifest(root, "Write from scratch", { fromScratch: true, entries: [entry()] }, undefined, "scratch");
  checkManifest(root, "Write from scratch", { fromScratch: true, entries: [realEntry()] }, /external|project-owned|scratch/i, "scratch");
});

test("actual CLI outside the project accepts scratch and only valid real manifests", t => {
  const parent = fixture(t);
  const root = path.join(parent, "cli-project");
  fs.mkdirSync(root);
  const transcript = [];
  function run(args) {
    const result = spawnSync(process.execPath, [cli, ...args, "--root", root, "--project-root", root, "--json"], {
      cwd: os.tmpdir(), encoding: "utf8", windowsHide: true,
    });
    transcript.push(JSON.stringify({ cwd: os.tmpdir(), command: [process.execPath, cli, ...args, "--root", root, "--project-root", root, "--json"], exit: result.status, stdout: result.stdout, stderr: result.stderr }));
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  }
  try {
    assert.equal(run(["next", "--deliverable", "web", "--tier", "quick", "--mode", "brief"]).stage, "intake");
    run(["decide", "--stage", "intake", "--by", "owner", "--choice", "skip", "--answer", "I will build a one-screen navigation page from scratch."]);
    assert.equal(run(["next"]).stage, "components");
    run(["decide", "--stage", "components", "--by", "owner", "--choice", "scratch", "--answer", "从零写"]);
    fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
    manifest(root, []);
    assert.equal(run(["next"]).stage, "build");
    manifest(root, [], true);
    assert.equal(run(["next"]).stage, "probe");
    run(["decide", "--stage", "components", "--by", "owner", "--choice", "index", "--answer", "Search the index"]);
    const fake = { ...realEntry(), sourceId: "invented/library" };
    manifest(root, [fake]);
    assert.equal(run(["next"]).stage, "build");
    const missing = realEntry(); missing.usedIn[0].file = "absent.html";
    manifest(root, [missing]);
    assert.equal(run(["next"]).stage, "build");
    manifest(root, [realEntry()]);
    assert.equal(run(["next"]).stage, "probe");
    const owned = { ...entry(), sourceId: "index.html" };
    run(["decide", "--stage", "components", "--by", "owner", "--choice", "project", "--answer", "Use project components"]);
    manifest(root, [owned]);
    assert.equal(run(["next"]).stage, "probe");
    run(["decide", "--stage", "components", "--by", "owner", "--choice", "github", "--answer", "Use https://github.com/example/library"]);
    const github = { ...realEntry(), url: "https://github.com/example/library" };
    delete github.sourceId;
    github.license.state = "unverified";
    github.usedIn[0].how = "Study and reimplement Navigation independently";
    manifest(root, [github]);
    assert.equal(run(["next"]).stage, "probe");
  } finally {
    if (process.env.COMPONENT_MANIFEST_SMOKE_LOG) fs.writeFileSync(process.env.COMPONENT_MANIFEST_SMOKE_LOG, transcript.join("\n") + "\n");
  }
});

for (const [choice, answer, rule] of [
  [undefined, "Write from scratch", /choice/i],
  ["scratch,project", "Write from scratch", /scratch/i],
  ["github", "Use radix-ui/themes", /https:\/\/github\.com|GitHub.*URL/i],
  ["unknown", "Search components", /choice|project.*github.*index.*scratch/i],
]) {
  test("round3 regression: CLI rejects component choice " + String(choice), t => {
    const root = fixture(t);
    const args = [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--by", "owner", "--answer", answer, "--json"];
    if (choice !== undefined) args.push("--choice", choice);
    const result = spawnSync(process.execPath, args, { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, rule);
    assert.equal(readState(root).decisions.components, undefined, "invalid decisions must not be recorded");
  });
}

test("round3 regression: canonical deduplicated choices preserve the user's answer", t => {
  const root = fixture(t);
  const answer = '  Use https://github.com/example/library and project "Button"  ';
  decide(root, { by: "owner", stage: "components", choice: "index,github,project,index,github", answer });
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "github", "index"]);
  assert.equal(readState(root).decisions.components, answer);
  assert.equal(nextAction(root).stage, "build");
});

test("round3 regression: legacy answer-only decisions ask components again", t => {
  const root = fixture(t);
  const statePath = path.join(root, ".design-pipeline/state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  state.decisions.components = "Write from scratch";
  fs.writeFileSync(statePath, JSON.stringify(state));
  fs.writeFileSync(path.join(root, "index.html"), "Page");
  manifest(root, [], true);
  const action = nextAction(root);
  assert.equal(action.stage, "components");
  assert.equal(action.type, "ask");
  assert.equal(action.questions.find(question => question.id === "components").options.length, 5);
  assert.match(action.record, /--choice <project\|github\|index\|discover\|scratch, comma-separated>/);
  assert.match(JSON.stringify(action), /https:\/\/github\.com\/<owner>\/<repo>/);
});

for (const answer of ["从零写，动效 motion 要克制", "Write the UI components from scratch", "Write from scratch with native HTML primitives"]) {
  test("round3 regression: scratch answer is independent of source names: " + answer, t => {
    const root = fixture(t);
    fs.writeFileSync(path.join(root, "index.html"), "Page");
    decide(root, { by: "owner", stage: "components", choice: "scratch", answer });
    manifest(root, [], true);
    assert.equal(nextAction(root).stage, "probe");
    assert.equal(readState(root).decisions.components, answer);
  });
}

for (const choice of ["project", "github", "index"]) {
  test("round3 regression: reuse choice contradicts scratch manifest: " + choice, t => {
    const root = fixture(t);
    const answer = choice === "github" ? "Use https://github.com/example/library" : "Use the project's existing components in src/components/Button.tsx";
    fs.writeFileSync(path.join(root, "index.html"), "Page");
    decide(root, { by: "owner", stage: "components", choice, answer });
    const value = { fromScratch: true, entries: [] };
    manifest(root, value.entries, value.fromScratch);
    assert.throws(() => validateComponentManifest(value, { root, decision: answer, componentSources: [choice] }), { code: "CONTRACT_INVALID" });
    assert.equal(nextAction(root).stage, "build");
  });
}

test("round3 regression: scratch accepts the indexed project-owned source boundary", t => {
  const root = fixture(t);
  const answer = "Write from scratch";
  fs.writeFileSync(path.join(root, "index.html"), "Page");
  decide(root, { by: "owner", stage: "components", choice: "scratch", answer });
  const value = { fromScratch: true, entries: [{ ...entry(), sourceId: "project-components" }] };
  manifest(root, value.entries, true);
  assert.equal(validateComponentManifest(value, { root, decision: answer, componentSources: ["scratch"] }), value);
  const result = spawnSync(process.execPath, [cli, "next", "--root", root, "--project-root", root, "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).stage, "probe");
});

test("round3 regression: fabricated source reports the validator reason and remediation", t => {
  const root = fixture(t);
  const answer = "Search the index";
  decide(root, { by: "owner", stage: "components", choice: "index", answer });
  fs.writeFileSync(path.join(root, "index.html"), "Navigation Page");
  const value = { entries: [{ ...realEntry(), sourceId: "invented/library" }] };
  manifest(root, value.entries);
  let reason;
  assert.throws(() => validateComponentManifest(value, { root, decision: answer, componentSources: ["index"] }), error => {
    assert.equal(error.code, "CONTRACT_INVALID");
    assert.match(error.message, /entries\[0\]\.sourceId/);
    reason = error.message;
    return true;
  });
  const action = nextAction(root);
  assert.equal(action.stage, "build");
  const finding = action.findings?.find(item => item.code === "CONTRACT_INVALID");
  assert.ok(finding, JSON.stringify(action));
  assert.equal(finding.severity, "error");
  assert.equal(finding.message, reason);
  assert.ok(typeof finding.fix === "string" && finding.fix.trim());
  assert.ok(action.instruction.includes(reason), action.instruction);
});

test("round3 regression: returned search command excludes film-only records for film query", t => {
  const root = fixture(t);
  decide(root, { by: "owner", stage: "components", choice: "index", answer: "Search the index for film" });
  const instruction = nextAction(root).instruction;
  const command = instruction.match(/`(node [^`]+ design-system search [^`]+)`/)?.[1];
  assert.ok(command, instruction);
  const result = spawnSync(command.replace('"<page brief>"', '"film"') + " --json", { cwd: os.tmpdir(), shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.namespace, "frontend-component-sources");
  assert.ok(Array.isArray(value.results));
  assert.deepEqual(value.results.filter(record => record.webRanking === false).map(record => record.sourceId), []);
  assert.match(command, /--platform web/);
});

// A page whose probe stage passed: an audited probe file and an interaction pass with its lineage.
const AUDIT_PROBE_FILE = JSON.stringify({ schema: "design-pipeline.interaction-probe.v1", id: "page", url: "index.html", probes: [{ id: "page-audit", kind: "audit", thresholds: { fonts: ["Inter"] } }] });
const LINEAGE = { files: ["index.html"], tokens: [], absent: [], remote: [] };
function checkedPage(root, choice = "project", answer = "Use project components") {
  decide(root, { by: "owner", stage: "components", choice, answer });
  toBuild(root);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><h1>Page</h1>");
  manifest(root, [entry()]);
  assert.equal(acceptSections(root).stage, "probe");
  fs.writeFileSync(path.join(root, "interaction.json"), AUDIT_PROBE_FILE);
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
}
const deliveryFields = state => ({ delivered: state.decisions.delivered, deliveryInputHashes: state.decisions.deliveryInputHashes, deliveredSha256: state.decisions.deliveredSha256 });

test("lineage regression: changed components decision invalidates a quick interaction pass", t => {
  const root = fixture(t);
  checkedPage(root);
  assert.equal(nextAction(root).stage, "review", "a quick page ends with the owner's acceptance");
  decide(root, { by: "owner", stage: "components", choice: "project", answer: "Use existing project components" });
  assert.equal(nextAction(root).stage, "probe");
  assert.equal(readState(root).gates.interaction, undefined);
  assert.deepEqual(readState(root).decisions.componentSources, ["project"]);
});

test("lineage regression: changed components decision requires a fresh review and delivery", t => {
  const root = fixture(t, "standard");
  checkedPage(root);
  decide(root, { by: "owner", stage: "review", verdict: "accept" });
  decide(root, { by: "owner", stage: "deliver", answer: "https://example.test/page" });
  assert.equal(nextAction(root).type, "done");
  const recordedDrafts = structuredClone(readState(root).decisions.drafts);
  decide(root, { by: "owner", stage: "components", choice: "project", answer: "Search the index" });
  assert.equal(nextAction(root).stage, "description", "a different component decision makes the description approval stale");
  approveDescription(root);
  assert.equal(acceptSections(root).stage, "probe");
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
  assert.equal(nextAction(root).stage, "review", "the earlier accept no longer covers the new decision");
  const state = readState(root);
  assert.deepEqual(deliveryFields(state), { delivered: undefined, deliveryInputHashes: undefined, deliveredSha256: undefined });
  assert.deepEqual(state.decisions.drafts, recordedDrafts, "recorded review verdicts and their bindings are never rewritten");
  decide(root, { by: "owner", stage: "review", verdict: "accept" });
  assert.equal(nextAction(root).stage, "deliver", "a fresh accept under the new decision completes review");
});

test("lineage regression: identical components re-record keeps checked evidence", t => {
  const root = fixture(t, "standard");
  checkedPage(root, "project,index", "Use project components, then the index");
  decide(root, { by: "owner", stage: "review", verdict: "accept" });
  decide(root, { by: "owner", stage: "deliver", answer: "https://example.test/page" });
  const before = readState(root);
  decide(root, { by: "owner", stage: "components", choice: "index,project,index", answer: "Use project components, then the index" });
  const after = readState(root);
  assert.deepEqual(after.gates, before.gates);
  assert.deepEqual(after.decisions.drafts, before.decisions.drafts);
  assert.deepEqual(after.decisions.descriptions, before.decisions.descriptions, "the description approval stays");
  assert.deepEqual(after.decisions.sections, before.decisions.sections);
  assert.deepEqual(deliveryFields(after), deliveryFields(before));
  assert.deepEqual(after.decisions.componentSources, ["project", "index"]);
  assert.equal(nextAction(root).type, "done");
});

test("category regression: each entry's source category must be in the recorded componentSources", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
  const owned = () => ({ ...entry(), sourceId: "index.html" });
  checkManifest(root, "Use src/components", { entries: [realEntry()] }, /entries\[0\] source category index is not in the recorded componentSources project/, "project");
  checkManifest(root, "Search the index", { entries: [owned()] }, /entries\[0\] source category project is not in the recorded componentSources index/, "index");
  checkManifest(root, "Use https://github.com/example/library", { entries: [realEntry()] }, /entries\[0\] source category index is not in the recorded componentSources github/, "github");
  checkManifest(root, "Use https://github.com/shadcn-ui/ui", { entries: [realEntry()] }, /entries\[0\] source category index is not in the recorded componentSources github; cite a named GitHub repository by url/, "github");
  const byUrl = { ...realEntry(), url: "https://github.com/shadcn-ui/ui" };
  delete byUrl.sourceId;
  checkManifest(root, "Use https://github.com/shadcn-ui/ui", { entries: [byUrl] }, null, "github");
  checkManifest(root, "Use https://github.com/shadcn-ui/ui and the index", { entries: [realEntry()] }, null, "index");
  checkManifest(root, "Use project components, then the index", { entries: [owned(), realEntry()] }, null, "project,index");
  const platform = { ...entry(), sourceId: "native-dom", license: { state: "platform" } };
  checkManifest(root, "Use native DOM", { entries: [platform] }, /entries\[0\] source category index is not in the recorded componentSources project/, "project");
  checkManifest(root, "Use native DOM", { entries: [platform] }, null, "index");
});

test("lineage regression: first explicit components decision invalidates a legacy interaction pass", t => {
  const root = fixture(t);
  checkedPage(root);
  const file = path.join(root, STATE);
  const legacy = JSON.parse(fs.readFileSync(file, "utf8"));
  delete legacy.decisions.components;
  delete legacy.decisions.componentSources;
  fs.writeFileSync(file, JSON.stringify(legacy));
  assert.equal(readState(root).gates.interaction.status, "passed");
  decide(root, { by: "owner", stage: "components", choice: "project", answer: "Use project components" });
  assert.equal(readState(root).gates.interaction, undefined);
  assert.equal(nextAction(root).stage, "probe");
});

test("components decisions are rejected outside web workflows and leave their state untouched", t => {
  for (const deliverable of ["film", "edit", "ui"]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "non-web-components-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    initState(root, { deliverable, tier: "quick", mode: "brief" });
    const file = path.join(root, STATE);
    const seeded = JSON.parse(fs.readFileSync(file, "utf8"));
    seeded.gates = { ...(seeded.gates || {}), [deliverable === "ui" ? "interaction" : deliverable]: { status: "passed", inputHashes: { "out.bin": "sha256:0" } } };
    seeded.decisions = { ...(seeded.decisions || {}), delivered: true };
    fs.writeFileSync(file, JSON.stringify(seeded));
    const before = fs.readFileSync(file, "utf8");
    assert.throws(() => decide(root, { by: "owner", stage: "components", choice: "index", answer: "Search the index" }), /--stage components applies only to web workflows/, deliverable);
    assert.equal(fs.readFileSync(file, "utf8"), before, `${deliverable} state must stay byte-identical`);
  }
});

// Change let-agents-discover-open-source-resources: the components decision's `discover` source and
// discovered manifest entries extend the existing v1 decision and validateComponentManifest.
const PERMISSIVE = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Zlib", "Unlicense", "CC0-1.0"];
const DISCOVERY_PAGE = '<!doctype html><nav class="Navigation"><i class="ph-arrow-right"></i><div class="embla">Page</div></nav>';
const CAROUSEL_SHA = "4c3b2a19f8e7d6c5b4a39281706f5e4d3c2b1a09";

function discoveryFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "web-discovery-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  initState(root, { deliverable: "web", tier: "quick", mode: "brief" });
  toComponents(root);
  fs.writeFileSync(path.join(root, "index.html"), DISCOVERY_PAGE);
  fs.mkdirSync(path.join(root, "licenses"));
  fs.writeFileSync(path.join(root, "licenses/phosphor-core.txt"), "MIT License\n\nCopyright (c) Phosphor Icons\n");
  fs.writeFileSync(path.join(root, "licenses/embla-carousel.txt"), "MIT License\n\nCopyright (c) David Jerleke\n");
  return root;
}
const ownedNavigation = () => ({
  name: "Project navigation", sourceId: "index.html", availability: "project-owned", license: { state: "project-owned" },
  usedIn: [{ file: "index.html", marker: "Navigation", how: "Project navigation markup" }],
});
const icons = () => ({
  name: "Phosphor icons", url: "https://github.com/phosphor-icons/core", revision: "v2.1.1", availability: "reference-link",
  license: { state: "verified", id: "MIT", evidence: ["https://github.com/phosphor-icons/core/blob/v2.1.1/LICENSE"], file: "licenses/phosphor-core.txt" },
  usedIn: [{ file: "index.html", marker: "ph-arrow-right", how: "Import the arrow-right icon; keep the MIT copyright and license notice in licenses/phosphor-core.txt" }],
});
const carousel = () => ({
  name: "Embla carousel", url: "https://github.com/davidjerleke/embla-carousel", revision: CAROUSEL_SHA, availability: "bundled-implementation",
  license: { state: "verified", id: "MIT", evidence: [`https://github.com/davidjerleke/embla-carousel/blob/${CAROUSEL_SHA}/LICENSE`], file: "licenses/embla-carousel.txt" },
  usedIn: [{ file: "index.html", marker: "embla", how: "Copy the carousel core into the page bundle; keep its MIT license notice in licenses/embla-carousel.txt" }],
});
const studiedIcons = () => ({
  ...icons(),
  license: { state: "unverified", id: "NOASSERTION", evidence: ["https://github.com/phosphor-icons/core/tree/v2.1.1"] },
  usedIn: [{ file: "index.html", marker: "ph-arrow-right", how: "Study the arrow icon's geometry and reimplement it independently" }],
});

// Records the decision through the real decide, then checks that the validator and next agree.
function checkDiscovery(root, choice, answer, value, error) {
  decide(root, { by: "owner", stage: "components", choice, answer });
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify(value));
  const options = { root, decision: answer, componentSources: readState(root).decisions.componentSources };
  if (error) assert.throws(() => validateComponentManifest(value, options), error);
  else assert.equal(validateComponentManifest(value, options), value);
  assert.equal(nextAction(root).stage, error ? "build" : "probe");
}

test("discovery: decide records discover in canonical order and keeps scratch exclusive", t => {
  const root = discoveryFixture(t);
  decide(root, { by: "owner", stage: "components", choice: "discover,index,project,discover", answer: "Our components, then the index, then find more" });
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "index", "discover"]);
  decide(root, { by: "owner", stage: "components", choice: "discover,index,github,project", answer: "Use https://github.com/example/library, then find more" });
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "github", "index", "discover"]);
  decide(root, { by: "owner", stage: "components", choice: "discover", answer: "Find maintained open-source options" });
  assert.deepEqual(readState(root).decisions.componentSources, ["discover"]);
  for (const choice of ["scratch,discover", "discover,scratch"]) {
    assert.throws(() => decide(root, { by: "owner", stage: "components", choice, answer: "Write from scratch" }), /scratch cannot be combined/);
  }
  assert.deepEqual(readState(root).decisions.componentSources, ["discover"], "a rejected choice records nothing");
  const result = spawnSync(process.execPath, [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--by", "owner", "--choice", "discover,library", "--answer", "Find more", "--json"], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /project,github,index,discover,scratch/);
});

test("discovery: adding discover to a recorded decision invalidates checked evidence through the existing lineage", t => {
  const root = discoveryFixture(t);
  decide(root, { by: "owner", stage: "components", choice: "project", answer: "Use project components" });
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries: [ownedNavigation()] }));
  fs.writeFileSync(path.join(root, "interaction.json"), AUDIT_PROBE_FILE);
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
  assert.equal(nextAction(root).stage, "review");
  decide(root, { by: "owner", stage: "components", choice: "project,discover", answer: "Use project components" });
  assert.equal(readState(root).gates.interaction, undefined);
  assert.equal(nextAction(root).stage, "probe");
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"], {}, LINEAGE);
  decide(root, { by: "owner", stage: "components", choice: "discover,project", answer: "Use project components" });
  assert.equal(readState(root).gates.interaction.status, "passed", "re-recording the identical set keeps the pass");
});

test("discovery: components ask offers discover and recommends project, index, then discover", t => {
  const root = discoveryFixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-discovery-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const ask = nextAction(root);
  assert.equal(ask.stage, "components");
  const options = assertComponentsAsk(ask).options;
  assert.equal(options.length, 5);
  assert.doesNotMatch(ask.recommended, /project,index,discover/, "the recommendation names labels, not ids");
  assert.match(ask.record, /--choice <project\|github\|index\|discover\|scratch, comma-separated>/);
  assert.match(ask.why, /discover/);
  const answer = "Project components first, then the index, then find more";
  const record = ask.record.replace("<project|github|index|discover|scratch, comma-separated>", "project,index,discover").replace('"<the user\'s reply>"', JSON.stringify(answer));
  const decided = spawnSync(record, { cwd: outside, shell: true, encoding: "utf8", windowsHide: true });
  assert.equal(decided.status, 0, decided.stdout + decided.stderr);
  assert.deepEqual(readState(root).decisions.componentSources, ["project", "index", "discover"]);
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8", windowsHide: true });
  assert.match(help.stdout, /components requires --choice <project\|github\|index\|discover\|scratch, comma-separated>/);
});

test("discovery: build instruction searches the index first, routes discovery to GitHub and fonts to their guide", t => {
  const root = discoveryFixture(t);
  decide(root, { by: "owner", stage: "components", choice: "project,index,discover", answer: "Project components, the index, then find more" });
  const instruction = nextAction(root).instruction;
  assert.match(instruction, /search the index first/i);
  assert.match(instruction, /nothing indexed fits.*maintained open-source.*GitHub/s);
  assert.match(instruction, /pinned revision/);
  assert.match(instruction, /record its entry before using it/);
  assert.match(instruction, /prefer genuinely reusing/i);
  assert.match(instruction, /tools\/open-source-design\.md/);
  assert.match(instruction, /https:\/\/github\.com\/<owner>\/<repo>/);
  assert.match(instruction, /blob\/<revision>\/LICENSE/);
  assert.match(instruction, /license\.file/);
  assert.match(instruction, new RegExp(PERMISSIVE.slice(0, -1).join(", ").replace(/[.-]/g, "\\$&") + ",? or CC0-1\\.0"));
  assert.doesNotMatch(instruction, /OFL|npm|official project page|\bkind\b|font-family/);
  assert.match(instruction, /tools\/fonts\.md/);
  assert.match(instruction, /rather than silently defaulting to the system stack, and record the chosen family under Typography in DESIGN\.md, where the audit probe's thresholds\.fonts reads the approved families; use the system stack only when the page's direction deliberately calls for it/);
  assert.match(instruction, /not HEAD, main or master/);
  assert.match(instruction, /bundles, vendors, self-hosts or downloads the source counts as copying/);
  assert.match(instruction, /self-host/);
  assert.match(instruction, /references\/web-motion\.md#self-contained-pages/);
  assert.match(instruction, /permits empty or project-owned-only entries; every other source set forbids fromScratch: true and requires non-empty entries/);
  decide(root, { by: "owner", stage: "components", choice: "project,index", answer: "Project components, then the index" });
  const withoutDiscover = nextAction(root).instruction;
  assert.doesNotMatch(withoutDiscover, /nothing indexed fits/);
  assert.match(withoutDiscover, /tools\/fonts\.md/);
  // Standard and full brief builds extend a treatment, which is what may call for the system stack.
  const standard = fs.mkdtempSync(path.join(os.tmpdir(), "web-discovery-standard-"));
  t.after(() => fs.rmSync(standard, { recursive: true, force: true }));
  initState(standard, { deliverable: "web", tier: "standard", mode: "brief" });
  toComponents(standard);
  decide(standard, { by: "owner", stage: "components", choice: "project,index,discover", answer: "Project components, the index, then find more" });
  toBuild(standard);
  const treatment = nextAction(standard);
  assert.equal(treatment.stage, "build");
  assert.match(treatment.instruction, /use the system stack only when the treatment deliberately calls for it/);
});

test("discovery: discovered GitHub sources with pinned license provenance complete build", t => {
  const root = discoveryFixture(t);
  checkDiscovery(root, "project,index,discover", "Project components, the index, then find more", { entries: [ownedNavigation(), icons(), carousel()] });
  checkDiscovery(root, "discover", "Find maintained open-source icons", { entries: [studiedIcons()] });
  const commercial = carousel();
  commercial.license = { state: "commercial", id: "LicenseRef-Commercial", evidence: [`https://github.com/davidjerleke/embla-carousel/blob/${CAROUSEL_SHA}/LICENSE`] };
  commercial.availability = "reference-link";
  commercial.usedIn[0].how = "Study the carousel's drag physics and reimplement them";
  checkDiscovery(root, "discover", "Find maintained open-source options", { entries: [commercial] });
  // license.id is needed to copy or import; a study-only entry may leave it out.
  const unidentified = studiedIcons();
  delete unidentified.license.id;
  checkDiscovery(root, "discover", "Find maintained open-source icons", { entries: [unidentified] });
});

test("discovery: a discovered source without pinned license provenance is rejected with the missing field", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source icons";
  for (const [mutate, rule] of [
    [value => { delete value.revision; }, /entries\[0\]\.revision must pin/],
    [value => { value.revision = " "; }, /entries\[0\]\.revision must pin/],
    [value => { value.license.id = " "; }, /entries\[0\]\.license\.id, when given, must be the SPDX/],
    [value => { delete value.license.id; }, /entries\[0\]\.usedIn\[0\] copying or importing a discovered source requires license\.state verified and a permissive license\.id/],
    [value => { delete value.license.evidence; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.evidence = []; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.evidence = ["LICENSE"]; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.evidence = ["http://github.com/phosphor-icons/core/blob/v2.1.1/LICENSE"]; }, /entries\[0\]\.license\.evidence must be a non-empty array of https URLs/],
    [value => { value.license.state = "project-owned"; }, /entries\[0\] discovered sources use license\.state verified, unverified or commercial/],
    [value => { value.license.state = "platform"; }, /entries\[0\] discovered sources use license\.state verified, unverified or commercial/],
  ]) {
    const value = icons();
    mutate(value);
    checkDiscovery(root, "discover", answer, { entries: [value] }, rule);
  }
});

test("discovery: a discovered url must be a GitHub repository URL", t => {
  const root = discoveryFixture(t);
  for (const url of [
    "https://www.npmjs.com/package/embla-carousel",
    "https://www.embla-carousel.com/",
    "https://phosphoricons.com/",
    "https://github.com/phosphor-icons/core/tree/main/assets",
    "https://github.com/phosphor-icons",
    "https://gitlab.com/phosphor-icons/core",
    "http://github.com/phosphor-icons/core",
    "https://user:secret@github.com/phosphor-icons/core",
    "ftp://example.com/library",
  ]) {
    checkDiscovery(root, "discover", "Find maintained open-source icons", { entries: [{ ...studiedIcons(), url }] },
      /entries\[0\]\.url must be a GitHub repository URL https:\/\/github\.com\/<owner>\/<repo> or a project file/);
  }
});

test("discovery: license evidence must include the repository's license at the pinned revision", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source icons";
  const rule = /entries\[0\]\.license\.evidence must include a URL on https:\/\/github\.com\/phosphor-icons\/core whose blob, tree, raw, commit, releases\/tag or archive ref is the revision v2\.1\.1/;
  for (const evidence of [
    ["https://github.com/phosphor-icons/core/blob/main/LICENSE"],
    ["https://github.com/phosphor-icons/core/blob/v2.1.10/LICENSE"],
    ["https://github.com/someone/core-fork/blob/v2.1.1/LICENSE"],
    ["https://phosphoricons.com/v2.1.1/LICENSE"],
    ["https://raw.githubusercontent.com/phosphor-icons/core/v2.1.1/LICENSE"],
    // The revision must be the ref right after blob/tree/raw/commit/releases/tag/archive, compared undecoded.
    ["https://github.com/phosphor-icons/core/blob/main/v2.1.1/LICENSE"],
    ["https://github.com/phosphor-icons/core/v2.1.1/LICENSE"],
    ["https://github.com/phosphor-icons/core/blob/main%2Fv2.1.1%2F/LICENSE"],
    ["https://github.com/phosphor-icons/core/blob/main/tree/v2.1.1/LICENSE"],
    ["https://github.com/phosphor-icons/core/releases/v2.1.1"],
  ]) {
    const value = icons();
    value.license.evidence = evidence;
    checkDiscovery(root, "discover", answer, { entries: [value] }, rule);
    const studied = studiedIcons();
    studied.license.evidence = evidence;
    checkDiscovery(root, "discover", answer, { entries: [studied] }, rule);
  }
  for (const evidence of [
    ["https://phosphoricons.com/license", "https://github.com/Phosphor-Icons/Core/blob/v2.1.1/LICENSE"],
    ["https://github.com/phosphor-icons/core/tree/v2.1.1"],
    ["https://github.com/phosphor-icons/core/releases/tag/v2.1.1"],
    ["https://github.com/phosphor-icons/core/raw/v2.1.1/LICENSE"],
    ["https://github.com/phosphor-icons/core/commit/v2.1.1"],
    ["https://github.com/phosphor-icons/core/archive/v2.1.1.zip"],
    ["https://github.com/phosphor-icons/core/archive/refs/tags/v2.1.1.tar.gz"],
  ]) {
    const value = icons();
    value.license.evidence = evidence;
    checkDiscovery(root, "discover", answer, { entries: [value] });
  }
});

test("discovery: a path segment of the evidence URL other than its ref does not pin the revision", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source icons";
  for (const [revision, evidence] of [
    ["LICENSE", "https://github.com/phosphor-icons/core/blob/main/LICENSE"],
    ["blob", "https://github.com/phosphor-icons/core/blob/main/LICENSE"],
    ["deadbeef", "https://github.com/phosphor-icons/core/blob/main%2Fdeadbeef%2F/LICENSE"],
  ]) {
    const value = icons();
    value.revision = revision;
    value.license.evidence = [evidence];
    checkDiscovery(root, "discover", answer, { entries: [value] }, new RegExp(`entries\\[0\\]\\.license\\.evidence must include a URL on https://github\\.com/phosphor-icons/core whose blob, tree, raw, commit, releases/tag or archive ref is the revision ${revision}`));
  }
});

test("discovery: a moving ref such as HEAD, main or master does not pin the revision", t => {
  const root = discoveryFixture(t);
  for (const revision of ["HEAD", "main", "master", "Main"]) {
    const value = icons();
    value.revision = revision;
    value.license.evidence = [`https://github.com/phosphor-icons/core/blob/${revision}/LICENSE`];
    checkDiscovery(root, "discover", "Find maintained open-source icons", { entries: [value] },
      new RegExp(`entries\\[0\\]\\.revision must pin a commit SHA or tag, not the moving ref ${revision}`));
  }
});

test("discovery: GitHub pages that are not repositories are not discovered sources", t => {
  const root = discoveryFixture(t);
  for (const owner of ["topics", "orgs", "sponsors", "marketplace", "settings", "features", "collections", "explore", "enterprise", "login", "apps", "users", "search", "Topics"]) {
    const url = `https://github.com/${owner}/widgets`;
    const value = { ...studiedIcons(), url, revision: "v1.0.0", license: { state: "unverified", evidence: [`${url}/blob/v1.0.0/LICENSE`] } };
    checkDiscovery(root, "discover", "Find maintained open-source widgets", { entries: [value] },
      /entries\[0\]\.url must be a GitHub repository URL https:\/\/github\.com\/<owner>\/<repo> or a project file/);
  }
});

test("discovery: a discovered source uses bundled-implementation, reference-link or metadata-only availability", t => {
  const root = discoveryFixture(t);
  for (const availability of ["bundled-implementation", "reference-link", "metadata-only"]) {
    checkDiscovery(root, "discover", "Find a maintained open-source carousel", { entries: [{ ...carousel(), availability }] });
  }
  checkDiscovery(root, "discover", "Find a maintained open-source carousel", { entries: [{ ...carousel(), availability: "project-owned" }] },
    /entries\[0\] discovered sources use availability bundled-implementation, reference-link or metadata-only/);
});

test("discovery: bundling, vendoring, self-hosting or downloading a source counts as copying", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source options";
  for (const how of [
    "Studied the API, then bundled dist into vendor/widgets.js",
    "Studied and vendor it as vendor/widgets.js",
    "Bundled into vendor/widgets.js",
    "Study the drag physics, then self-host the build",
    "Studied it and self-hosted the dist files",
    "Downloaded the release and studied it",
    "VENDORING the core after studying it",
    "研究后打包进项目",
  ]) {
    const gpl = carousel();
    gpl.license.id = "GPL-3.0-only";
    gpl.usedIn[0].how = how;
    checkDiscovery(root, "discover", answer, { entries: [gpl] }, /copying or importing a discovered source requires license\.state verified and a permissive license\.id/);
    const unverified = carousel();
    unverified.license.state = "unverified";
    unverified.usedIn[0].how = how;
    checkDiscovery(root, "discover", answer, { entries: [unverified] }, /copying or importing a discovered source requires license\.state verified and a permissive license\.id/);
    const permissive = carousel();
    permissive.usedIn[0].how = how;
    checkDiscovery(root, "discover", answer, { entries: [permissive] }, /entries\[0\]\.usedIn\[0\]\.how must document attribution\/license-notice handling/);
    permissive.usedIn[0].how = how + "; keep its MIT license notice in licenses/embla-carousel.txt";
    checkDiscovery(root, "discover", answer, { entries: [permissive] });
    const indexed = { ...realEntry(), sourceId: "tommyjepsen/awesome-ux-skills", license: { state: "unverified" } };
    indexed.usedIn[0].how = how;
    checkDiscovery(root, "index", "Search the index", { entries: [indexed] }, /entries\[0\]\.usedIn\[0\] unverified\/commercial sources cannot be copied or imported/);
  }
});

test("discovery: an entry outside the recorded componentSources names the discover category", t => {
  const root = discoveryFixture(t);
  checkDiscovery(root, "project,index", "Project components, then the index", { entries: [ownedNavigation(), icons()] }, /entries\[1\] source category discover is not in the recorded componentSources project,index/);
  checkDiscovery(root, "github", "Use https://github.com/example/library", { entries: [carousel()] }, /entries\[0\] source category discover is not in the recorded componentSources github/);
  checkDiscovery(root, "scratch", "Write from scratch", { fromScratch: true, entries: [icons()] }, /entries\[0\] external source contradicts fromScratch/);
  checkDiscovery(root, "project,index,discover", "Project components, the index, then find more", { entries: [ownedNavigation(), icons()] });
});

test("discovery: copying or importing a discovered source requires a verified permissive license", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source options";
  for (const id of [...PERMISSIVE, "mit"]) {
    const value = carousel();
    value.license.id = id;
    checkDiscovery(root, "discover", answer, { entries: [value] });
  }
  for (const id of ["OFL-1.1", "GPL-3.0-only", "MIT OR Apache-2.0", "LicenseRef-Custom"]) {
    const value = carousel();
    value.license.id = id;
    checkDiscovery(root, "discover", answer, { entries: [value] }, /copying or importing a discovered source requires license\.state verified and a permissive license\.id/);
    value.usedIn[0].how = "Study the carousel's drag physics and reimplement them";
    // bundled-implementation ships the code whatever how says.
    checkDiscovery(root, "discover", answer, { entries: [value] }, /copying or importing a discovered source requires license\.state verified/);
    value.availability = "reference-link";
    checkDiscovery(root, "discover", answer, { entries: [value] });
    value.usedIn[0].how = "Adapt the carousel markup";
    checkDiscovery(root, "discover", answer, { entries: [value] }, /allows only study\/reimplementation/);
  }
  const unverified = carousel();
  unverified.license.state = "unverified";
  checkDiscovery(root, "discover", answer, { entries: [unverified] }, /requires license\.state verified and a permissive license\.id/);
  const unnoticed = carousel();
  unnoticed.usedIn[0].how = "Copy the carousel core into the page bundle";
  checkDiscovery(root, "discover", answer, { entries: [unnoticed] }, /notice handling/);
});

test("discovery: copying or importing a discovered source requires license.file", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source options";
  for (const value of [carousel(), icons()]) {
    delete value.license.file;
    checkDiscovery(root, "discover", answer, { entries: [value] },
      /entries\[0\]\.usedIn\[0\] copying or importing a discovered source requires license\.file naming the project file that holds its license text/);
    value.availability = "reference-link";
    value.usedIn[0].how = "Adapt the markup";
    checkDiscovery(root, "discover", answer, { entries: [value] }, /entries\[0\]\.usedIn\[0\] a discovered source without license\.state verified, a permissive license\.id and license\.file allows only study\/reimplementation/);
  }
  const studied = studiedIcons();
  assert.equal(studied.license.file, undefined);
  checkDiscovery(root, "discover", "Find maintained open-source icons", { entries: [studied] });
});

test("discovery: license.file must be a non-empty file contained in the project", t => {
  const root = discoveryFixture(t);
  const answer = "Find maintained open-source options";
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-license-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, "LICENSE"), "MIT License\n");
  fs.writeFileSync(path.join(root, "licenses/empty.txt"), "");
  fs.writeFileSync(path.join(root, "licenses/blank.txt"), " \n\t\n");
  for (const [file, rule] of [
    ["licenses/empty.txt", /entries\[0\]\.license\.file must not be empty/],
    ["licenses/blank.txt", /entries\[0\]\.license\.file must not be empty/],
    [path.join(outside, "LICENSE"), /entries\[0\]\.license\.file must be a file contained inside the project/],
    [path.relative(root, path.join(outside, "LICENSE")), /entries\[0\]\.license\.file must be a file contained inside the project/],
    ["licenses", /entries\[0\]\.license\.file must be a file contained inside the project/],
    ["licenses/missing.txt", /entries\[0\]\.license\.file must exist inside the project/],
    ["https://github.com/davidjerleke/embla-carousel/blob/main/LICENSE", /entries\[0\]\.license\.file must name a project file/],
    [" ", /entries\[0\]\.license\.file must name a project file/],
  ]) {
    const value = carousel();
    value.license.file = file;
    checkDiscovery(root, "discover", answer, { entries: [value] }, rule);
  }
});

test("discovery: a complete copied discovered entry is accepted", t => {
  const root = discoveryFixture(t);
  checkDiscovery(root, "discover", "Find a maintained open-source carousel", { entries: [carousel()] });
  const imported = icons();
  imported.license.file = path.join(root, "licenses/phosphor-core.txt");
  checkDiscovery(root, "index,discover", "Search the index, then find more", { entries: [imported, carousel()] });
});

test("discovery: a GitHub URL of an indexed source keeps the existing citation rule", t => {
  const root = discoveryFixture(t);
  const answer = "Search the index, then find more";
  const cited = url => ({
    ...carousel(), name: "Navigation", url,
    license: { state: "verified", id: "MIT", evidence: ["https://github.com/shadcn-ui/ui/blob/a85299a9edd2a961e32f01ced86963a852652bd2/LICENSE.md"], file: "licenses/embla-carousel.txt" },
  });
  for (const url of ["https://github.com/shadcn-ui/ui", "https://github.com/Shadcn-UI/ui.git", "https://github.com/shadcn-ui/ui/tree/main/apps/v4"]) {
    checkDiscovery(root, "index,discover", answer, { entries: [cited(url)] }, /entries\[0\]\.url matches the indexed source shadcn-ui\/ui: cite it by sourceId/);
  }
  const named = { ...cited("https://github.com/shadcn-ui/ui"), license: { state: "verified" } };
  delete named.revision;
  checkDiscovery(root, "github,discover", "Use https://github.com/shadcn-ui/ui", { entries: [named] });
  named.license.state = "unverified";
  named.usedIn[0].how = "Study and reimplement Navigation";
  checkDiscovery(root, "github,discover", "Use https://github.com/shadcn-ui/ui", { entries: [named] }, /must match the indexed source/);
  checkDiscovery(root, "github,discover", "Use https://github.com/example/library", { entries: [cited("https://github.com/example/library/tree/main/src")] },
    /entries\[0\]\.url links inside the named GitHub repository example\/library; cite the repository URL https:\/\/github\.com\/example\/library/);
  const bySourceId = { ...named, sourceId: "shadcn-ui/ui", license: { state: "verified" } };
  delete bySourceId.url;
  bySourceId.usedIn = [{ file: "index.html", marker: "Navigation", how: "Install the Navigation component; keep the MIT copyright and license notices in LICENSES.md" }];
  checkDiscovery(root, "index,discover", answer, { entries: [bySourceId] });
});
