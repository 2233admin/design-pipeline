"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { initState, nextAction, decide, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { validateComponentManifest } = require("../skill/scripts/design-system-catalog-core.cjs");
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
function manifest(root, entries, fromScratch = false) {
  fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify({ entries, fromScratch }));
}
const entry = () => ({ name: "Project card", sourceId: "index.html", availability: "project-owned", license: { state: "project-owned" }, usedIn: [{ file: "index.html", marker: "Page", how: "Product feature card" }] });

for (const tier of tiers) for (const mode of modes) {
  test(`web ${tier}/${mode} asks components immediately before build and follows the recorded answer`, t => {
    const root = fixture(t, tier, mode);
    const ask = nextAction(root);
    assert.equal(ask.stage, "components");
    assert.equal(ask.type, "ask");
    assert.match(ask.question, /components/i);
    assert.match(JSON.stringify(ask.options), /project.*paths.*GitHub.*index.*scratch/i);
    assert.match(ask.recommended, /project.*first.*index/i);
    assert.match(ask.record, /--stage components.*--choice.*--answer/);
    assert.ok(!ask.record.includes("--project-root ."));
    const answer = 'Use src/components first, then search the index for "pricing"';
    const recorded = spawnSync(process.execPath, [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--choice", "project,index", "--answer", answer, "--json"], { cwd: os.tmpdir(), encoding: "utf8", windowsHide: true });
    assert.equal(recorded.status, 0, recorded.stdout + recorded.stderr);
    assert.equal(readState(root).decisions.components, answer);
    assert.deepEqual(readState(root).decisions.componentSources, ["project", "index"]);
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
  decide(root, { stage: "components", choice: "project", answer: "Existing project components" });
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
  decide(root, { stage: "components", choice: "github", answer: "Use https://github.com/example/components" });
  manifest(root, [fromUrl]);
  assert.equal(nextAction(root).stage, "probe", "a URL can identify a user-named source");
});

test("scratch build accepts an empty manifest but still needs the recorded decision", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  manifest(root, [], true);
  assert.equal(nextAction(root).stage, "components");
  assert.throws(() => decide(root, { stage: "components", choice: "scratch", answer: " " }), /answer/);
  decide(root, { stage: "components", choice: "scratch", answer: "Write from scratch" });
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
    decide(root, { stage: "components", choice, answer });
    assert.equal(nextAction(root).stage, "build", `empty manifest must not satisfy ${answer}`);
  }
  decide(root, { stage: "components", choice: "scratch", answer: "Write from scratch" });
  assert.equal(nextAction(root).stage, "build", "scratch decision alone does not replace the explicit flag");
  manifest(root, [], true);
  assert.equal(nextAction(root).stage, "probe");
});

test("returned component decision and index commands work from outside the project", t => {
  const root = fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-components-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const answer = "Project components first, then search the index";
  const record = nextAction(root).record.replace("<project|github|index|scratch, comma-separated>", "project,index").replace('"<the user\'s reply>"', JSON.stringify(answer));
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
    decide(root, { stage: "components", choice, answer });
    fs.writeFileSync(path.join(root, "index.html"), '<!doctype html><nav class="Navigation">Page</nav>');
    fs.writeFileSync(path.join(root, "component-manifest.json"), JSON.stringify(body()));
    const value = body();
    if (expected === "build") assert.throws(() => validateComponentManifest(value, { root, decision: answer, componentSources: [choice] }), { code: "CONTRACT_INVALID" });
    else assert.equal(validateComponentManifest(value, { root, decision: answer, componentSources: [choice] }), value);
    assert.equal(nextAction(root).stage, expected);
  });
}

function checkManifest(root, decision, value, error, choice = "index") {
  decide(root, { stage: "components", choice, answer: decision });
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
  checkManifest(root, "Use src/Navigation.js", { entries: [owned] });
  const fileUrl = { ...owned, url: require("node:url").pathToFileURL(path.join(root, "src/Navigation.js")).href };
  delete fileUrl.sourceId;
  checkManifest(root, "Use project navigation", { entries: [fileUrl] });
  const github = { ...realEntry(), url: "https://github.com/example/component-library" };
  delete github.sourceId;
  github.license.state = "unverified";
  github.usedIn[0].how = "Study and reimplement Navigation independently";
  checkManifest(root, "Use https://github.com/example/component-library", { entries: [github] });
  checkManifest(root, "Use https://github.com/example/other-library", { entries: [github] }, /GitHub repository named/);
  checkManifest(root, "Use https://github.com/example/component-library-extra", { entries: [github] }, /GitHub repository named/);
  github.url = "https://example.com/components";
  checkManifest(root, "Use https://example.com/components", { entries: [github] }, /project file/);
});

test("manifest enforces indexed license states even through a named repository URL", t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
  const value = realEntry();
  value.license.state = "unverified";
  checkManifest(root, "Search the index", { entries: [value] }, /must match the indexed source/);
  value.url = "https://github.com/shadcn-ui/ui";
  delete value.sourceId;
  checkManifest(root, "Use https://github.com/shadcn-ui/ui", { entries: [value] }, /must match the indexed source/);
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
    checkManifest(root, "Use project components", { entries: [owned] }, /inside the project/);
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
    assert.equal(run(["next", "--deliverable", "web", "--tier", "quick", "--mode", "brief"]).stage, "components");
    run(["decide", "--stage", "components", "--choice", "scratch", "--answer", "从零写"]);
    fs.writeFileSync(path.join(root, "index.html"), '<nav class="Navigation">Page</nav>');
    manifest(root, []);
    assert.equal(run(["next"]).stage, "build");
    manifest(root, [], true);
    assert.equal(run(["next"]).stage, "probe");
    run(["decide", "--stage", "components", "--choice", "index", "--answer", "Search the index"]);
    const fake = { ...realEntry(), sourceId: "invented/library" };
    manifest(root, [fake]);
    assert.equal(run(["next"]).stage, "build");
    const missing = realEntry(); missing.usedIn[0].file = "absent.html";
    manifest(root, [missing]);
    assert.equal(run(["next"]).stage, "build");
    manifest(root, [realEntry()]);
    assert.equal(run(["next"]).stage, "probe");
    const owned = { ...entry(), sourceId: "index.html" };
    run(["decide", "--stage", "components", "--choice", "project", "--answer", "Use project components"]);
    manifest(root, [owned]);
    assert.equal(run(["next"]).stage, "probe");
    run(["decide", "--stage", "components", "--choice", "github", "--answer", "Use https://github.com/example/library"]);
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
    const args = [cli, "decide", "--root", root, "--project-root", root, "--stage", "components", "--answer", answer, "--json"];
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
  decide(root, { stage: "components", choice: "index,github,project,index,github", answer });
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
  assert.equal(action.options.length, 4);
  assert.match(action.record, /--choice <project\|github\|index\|scratch, comma-separated>/);
  assert.match(JSON.stringify(action), /https:\/\/github\.com\/<owner>\/<repo>/);
});

for (const answer of ["从零写，动效 motion 要克制", "Write the UI components from scratch", "Write from scratch with native HTML primitives"]) {
  test("round3 regression: scratch answer is independent of source names: " + answer, t => {
    const root = fixture(t);
    fs.writeFileSync(path.join(root, "index.html"), "Page");
    decide(root, { stage: "components", choice: "scratch", answer });
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
    decide(root, { stage: "components", choice, answer });
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
  decide(root, { stage: "components", choice: "scratch", answer });
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
  decide(root, { stage: "components", choice: "index", answer });
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
  decide(root, { stage: "components", choice: "index", answer: "Search the index for film" });
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

function checkedPage(root, choice = "index", answer = "Search the index") {
  decide(root, { stage: "components", choice, answer });
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html><h1>Page</h1>");
  manifest(root, [entry()]);
  fs.writeFileSync(path.join(root, "interaction.json"), "{}");
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"]);
}
const deliveryFields = state => ({ delivered: state.decisions.delivered, deliveryInputHashes: state.decisions.deliveryInputHashes, deliveredSha256: state.decisions.deliveredSha256 });

test("lineage regression: changed components decision invalidates a quick interaction pass", t => {
  const root = fixture(t);
  checkedPage(root);
  assert.equal(nextAction(root).type, "done");
  decide(root, { stage: "components", choice: "project", answer: "Use existing project components" });
  assert.equal(nextAction(root).stage, "probe");
  assert.equal(readState(root).gates.interaction, undefined);
  assert.deepEqual(readState(root).decisions.componentSources, ["project"]);
});

test("lineage regression: changed components decision unbinds review and delivery", t => {
  const root = fixture(t, "standard");
  checkedPage(root);
  decide(root, { stage: "review", verdict: "accept" });
  decide(root, { stage: "deliver", answer: "https://example.test/page" });
  assert.equal(nextAction(root).type, "done");
  decide(root, { stage: "components", choice: "project", answer: "Search the index" });
  assert.equal(nextAction(root).stage, "probe");
  recordGate(root, "interaction", "passed", ["interaction.json", "index.html"]);
  assert.equal(nextAction(root).stage, "review", "the earlier accept no longer covers the new decision");
  const state = readState(root);
  assert.deepEqual(deliveryFields(state), { delivered: undefined, deliveryInputHashes: undefined, deliveredSha256: undefined });
  assert.equal(state.decisions.drafts.length, 1, "review history is preserved");
  assert.equal(state.decisions.drafts[0].inputHashes, undefined);
});

test("lineage regression: identical components re-record keeps checked evidence", t => {
  const root = fixture(t, "standard");
  checkedPage(root, "project,index", "Use project components, then the index");
  decide(root, { stage: "review", verdict: "accept" });
  decide(root, { stage: "deliver", answer: "https://example.test/page" });
  const before = readState(root);
  decide(root, { stage: "components", choice: "index,project,index", answer: "Use project components, then the index" });
  const after = readState(root);
  assert.deepEqual(after.gates, before.gates);
  assert.deepEqual(after.decisions.drafts, before.decisions.drafts);
  assert.deepEqual(deliveryFields(after), deliveryFields(before));
  assert.deepEqual(after.decisions.componentSources, ["project", "index"]);
  assert.equal(nextAction(root).type, "done");
});
