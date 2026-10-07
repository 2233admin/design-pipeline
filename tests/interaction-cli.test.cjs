"use strict";

// `verify interaction` is the only gate whose evidence comes from a browser, so the CLI has to keep
// three failures apart: a probe document the user can fix by editing JSON (exit 1), a measurement
// that never happened (exit 1, no evidence written), and a measurement that happened and failed
// (exit 2, evidence written). These tests drive the real CLI and pin that separation; the gate
// verdicts themselves are covered by the evaluator's unit tests.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "interaction-samples.json"), "utf8"));

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "interaction-cli-"));

function run(args, cwd = repoRoot) {
  const child = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", windowsHide: true, timeout: 60000 });
  let output = null;
  try { output = JSON.parse(child.stdout); } catch { output = null; }
  return { status: child.status, stdout: child.stdout, stderr: child.stderr, output };
}

// The probe document is the canonical one from the fixture the evaluator and the capture layer both
// measure against, so a test probe can never drift from the shape those two agree on.
function probeProject(dir, mutate = () => {}) {
  const doc = JSON.parse(JSON.stringify(fixture.document));
  mutate(doc);
  fs.writeFileSync(path.join(dir, "index.html"), '<!doctype html><div id="card">card</div>\n');
  fs.writeFileSync(path.join(dir, "interaction.json"), `${JSON.stringify(doc, null, 2)}\n`);
  return doc;
}

// A browser this run can never obtain: the module path does not exist, so the capture fails the same
// way whether or not puppeteer-core happens to be installed on the machine running the suite.
function unreachableBrowser(dir) {
  return ["--chrome", process.execPath, "--puppeteer-module", path.join(dir, "no-puppeteer-core-here")];
}

test("a malformed probe document is a contract error that never reaches a browser", () => {
  const dir = tmp();
  try {
    for (const [label, mutate, expected] of [
      ["wrong schema", (doc) => { doc.schema = "design-pipeline.interaction-probe.v2"; }, /schema must be design-pipeline\.interaction-probe\.v1/],
      ["unsupported input kind", (doc) => { doc.probes[0].input = { kind: "drag", from: [0, 0], to: [10, 10], durationMs: 100 }; }, /kind/],
      ["probe with no target", (doc) => { delete doc.probes[0].target; }, /target/],
    ]) {
      probeProject(dir, mutate);
      const result = run(["verify", "interaction", "--root", dir, "--probe", "interaction.json", ...unreachableBrowser(dir), "--json"]);
      assert.equal(result.status, 1, `${label}: ${result.stdout}${result.stderr}`);
      assert.equal(result.output.ok, false, label);
      assert.match(result.output.error.message, /^interaction probe: /, label);
      assert.match(result.output.error.message, expected, label);
      // The run carried a --chrome and a --puppeteer-module that cannot produce a browser. Naming the
      // probe rather than the capture is the proof that validation happened before any spawn.
      assert.doesNotMatch(result.output.error.message, /interaction capture/, label);
      assert.equal(fs.existsSync(path.join(dir, "evidence")), false, `${label} must not write evidence`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("the parser accepts --probe and still rejects a flag it does not know", () => {
  const dir = tmp();
  try {
    probeProject(dir);
    const unknown = run(["verify", "interaction", "--root", dir, "--probe-file", "interaction.json", "--json"]);
    assert.equal(unknown.status, 1, unknown.stdout);
    assert.equal(unknown.output.error.code, "UNKNOWN_OPTION");
    assert.match(unknown.output.error.message, /--probe-file/);

    // Same shape of command with the registered flag: it gets past the parser and fails on the value
    // it was given, which is only reachable once `--probe` is a known option carrying a path.
    const missing = run(["verify", "interaction", "--root", dir, "--probe", "not-written-yet.json", "--json"]);
    assert.equal(missing.status, 1, missing.stdout);
    assert.notEqual(missing.output.error.code, "UNKNOWN_OPTION");
    assert.match(missing.output.error.message, /--probe does not exist/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a capture that cannot run fails the measurement, never the gate", () => {
  const dir = tmp();
  try {
    probeProject(dir);
    const result = run(["verify", "interaction", "--root", dir, "--probe", "interaction.json", ...unreachableBrowser(dir), "--json"]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.notEqual(result.status, 2, "an unmeasured interaction must never be reported as a failed gate");
    assert.equal(result.output.ok, false);
    assert.equal(result.output.error.code, "KERNEL_FAILED");
    // The kernel's own diagnosis reaches the caller instead of being flattened into a generic wrapper
    // error; the missing tool is what the caller has to act on.
    assert.match(result.output.error.message, /puppeteer/i);
    // No verdict was reached, so nothing may be recorded as one.
    assert.equal(fs.existsSync(path.join(dir, "evidence", "interaction.json")), false);
    assert.equal(fs.existsSync(path.join(dir, ".design-pipeline")), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("--output is rejected before the capture when it leaves --root", () => {
  const dir = tmp();
  try {
    const project = path.join(dir, "site");
    fs.mkdirSync(project);
    probeProject(project);
    const result = run(["verify", "interaction", "--root", project, "--probe", "interaction.json", "--output", "../outside", ...unreachableBrowser(dir), "--json"]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.output.error.message, /--output must stay inside/);
    // Usage errors cost nothing: the browser was never asked for, so the message is about the flag.
    assert.doesNotMatch(result.output.error.message, /puppeteer/i);
    assert.equal(fs.existsSync(path.join(dir, "outside")), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("help documents verify interaction with its flags", () => {
  const result = run(["help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verify motion\|components\|audio\|composition\|interaction\|/);
  assert.match(result.stdout, /verify interaction --probe <interaction\.json> \[--output <evidence-dir>\] \[--chrome <exe>\] \[--puppeteer-module <path>\]/);
});

test("shared interaction preflight binds only the declared local target without writing evidence", () => {
  const { preflightInteraction, observeInteraction } = require("../skill/scripts/cli-core.cjs");
  const dir = tmp();
  try {
    probeProject(dir);
    fs.writeFileSync(path.join(dir, "other.html"), "another page");
    const options = { probe: "interaction.json", target: "index.html", resultFile: "evidence/interaction-check.json", chrome: process.execPath, puppeteer: path.join(dir, "missing-puppeteer.cjs") };
    const context = preflightInteraction(dir, options);
    assert.equal(context.probeFile, fs.realpathSync(path.join(dir, "interaction.json")));
    assert.equal(context.localPage, fs.realpathSync(path.join(dir, "index.html")));
    assert.equal(context.resultFile, path.join(dir, "evidence/interaction-check.json"));
    assert.equal(fs.existsSync(path.join(dir, "evidence")), false);
    for (const url of ["other.html", "https://example.invalid/index.html"]) {
      probeProject(dir, doc => { doc.url = url; });
      assert.throws(() => observeInteraction(dir, options), error => error.code === "INTERACTION_TARGET_MISMATCH");
    }
    assert.equal(preflightInteraction(dir, { ...options, target: undefined }).localPage, null, "legacy remote targets retain their capture path");
    assert.throws(() => observeInteraction(dir, { ...options, target: undefined }), error => error.code === "KERNEL_FAILED", "an unavailable tool, not native target policy, blocks a legacy remote capture");
    assert.equal(fs.existsSync(path.join(dir, "evidence")), false);
    assert.equal(fs.existsSync(path.join(dir, ".design-pipeline")), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("shared interaction preflight protects every bound file and an absent control destination", () => {
  const { observeInteraction, preflightInteraction } = require("../skill/scripts/cli-core.cjs");
  for (const file of ["reference.png", "guide.md", "secondary.js", "other-check.json", "plan.json", "state.json", "events.jsonl"]) {
    const dir = tmp();
    try {
      probeProject(dir);
      const protectedFile = path.join(dir, file);
      fs.writeFileSync(protectedFile, "protected original bytes");
      fs.mkdirSync(path.join(dir, "evidence"));
      fs.linkSync(protectedFile, path.join(dir, "evidence/check.json"));
      const before = fs.readFileSync(protectedFile);
      assert.throws(() => observeInteraction(dir, { probe: "interaction.json", target: "index.html", resultFile: "evidence/check.json", protectedFiles: [protectedFile], chrome: process.execPath, puppeteer: path.join(dir, "missing-module.cjs") }), error => error.code === "OUTPUT_COLLISION", file);
      assert.deepEqual(fs.readFileSync(protectedFile), before, file);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const dir = tmp();
  try {
    probeProject(dir);
    assert.throws(() => preflightInteraction(dir, { probe: "interaction.json", target: "index.html", resultFile: "events.jsonl", protectedFiles: ["events.jsonl"] }), error => error.code === "OUTPUT_COLLISION");
    assert.equal(fs.existsSync(path.join(dir, "events.jsonl")), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("shared interaction output rejects symbolic aliases and dangling external leaves before capture", () => {
  const { observeInteraction } = require("../skill/scripts/cli-core.cjs");
  for (const dangling of [false, true]) {
    const dir = tmp(), project = path.join(dir, "project");
    try {
      fs.mkdirSync(project);
      probeProject(project);
      fs.mkdirSync(path.join(project, "evidence"));
      const protectedFile = path.join(project, "reference.md");
      fs.writeFileSync(protectedFile, "reference is immutable");
      const external = path.join(dir, "outside-not-created.json");
      fs.symlinkSync(dangling ? external : protectedFile, path.join(project, "evidence/check.json"), "file");
      assert.throws(() => observeInteraction(project, { probe: "interaction.json", target: "index.html", resultFile: "evidence/check.json", protectedFiles: [protectedFile], chrome: process.execPath, puppeteer: path.join(project, "missing-module.cjs") }), error => dangling ? /unresolved symlink/.test(error.message) : error.code === "OUTPUT_COLLISION");
      assert.equal(fs.readFileSync(protectedFile, "utf8"), "reference is immutable");
      assert.equal(fs.existsSync(external), false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("shared observation preserves missing-tool and browser-timeout failures without report or state writes", () => {
  const { observeInteraction } = require("../skill/scripts/cli-core.cjs");
  const dir = tmp();
  try {
    probeProject(dir);
    const options = { probe: "interaction.json", target: "index.html", resultFile: "evidence/check.json", chrome: process.execPath, puppeteer: path.join(dir, "missing-module.cjs") };
    assert.throws(() => observeInteraction(dir, options), error => error.code === "KERNEL_FAILED" && /puppeteer/.test(error.message));
    // This module is an honest error-path fixture, not a browser or invocation-provenance proof.
    const timeoutModule = path.join(dir, "timeout-module.cjs");
    fs.writeFileSync(timeoutModule, 'module.exports = { launch: async () => { throw new Error("browser navigation timeout fixture"); } };');
    assert.throws(() => observeInteraction(dir, { ...options, puppeteer: timeoutModule }), error => error.code === "KERNEL_FAILED" && /browser navigation timeout fixture/.test(error.message));
    assert.equal(fs.existsSync(path.join(dir, "evidence")), false);
    assert.equal(fs.existsSync(path.join(dir, ".design-pipeline")), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("shared observation obtains real browser verdicts while its caller owns report and state writes", t => {
  const { observeInteraction } = require("../skill/scripts/cli-core.cjs");
  const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  let chrome, puppeteer;
  try {
    resolvePuppeteer(repoRoot, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    chrome = resolveChrome();
    puppeteer = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core", { paths: [repoRoot] });
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    t.skip(error.message);
    return;
  }
  const dir = tmp();
  try {
    fs.writeFileSync(path.join(dir, "state.json"), "native state must not be written by capture");
    fs.writeFileSync(path.join(dir, "events.jsonl"), "native event ledger must not be written by capture");
    const before = ["state.json", "events.jsonl"].map(file => fs.readFileSync(path.join(dir, file)));
    const options = { probe: "interaction.json", target: "index.html", resultFile: "evidence/exact-check.json", protectedFiles: ["state.json", "events.jsonl"], chrome, puppeteer };
    for (const responds of [false, true]) {
      probeProject(dir, doc => { doc.probes[0].expect.responds = responds; });
      const observed = observeInteraction(dir, options);
      assert.equal(observed.kernel.exitCode, 0, "the existing measurement kernel actually completed");
      assert.equal(observed.result.schema, "design-pipeline.interaction-result.v1");
      assert.equal(observed.result.status, responds ? "failed" : "passed");
      assert.equal(Object.hasOwn(observed.result, "checks"), false, "the actual interaction report is not reshaped into claimed checks");
      assert.equal(observed.result.probes.length, 1);
      if (responds) assert.ok(observed.result.findings.some(finding => finding.code === "dead-interaction"));
      assert.equal(fs.existsSync(observed.resultFile), false);
      assert.equal(fs.existsSync(path.join(dir, ".design-pipeline")), false);
      ["state.json", "events.jsonl"].forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(dir, file)), before[index]));
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("public interaction CLI records real menu states and fails animated but unapplied selection", t => {
  const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  let chrome, puppeteer;
  try {
    resolvePuppeteer(repoRoot, process.env.DESIGN_PIPELINE_PUPPETEER_MODULE);
    chrome = resolveChrome(); puppeteer = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core", { paths: [repoRoot] });
  } catch (error) { if (error.code !== "TOOL_MISSING") throw error; t.skip(error.message); return; }
  const dir = tmp();
  try {
    const doc = { schema: fixture.document.schema, id: "menu-cli", url: "index.html", probes: [{ id: "menu", target: "#wrapper", steps: [
      { id: "initial", timeoutMs: 20, assertions: [{ selector: "#menu", kind: "visible", equals: false }] },
      { id: "open", input: { kind: "click", selector: "#toggle" }, timeoutMs: 80, assertions: [{ selector: "#menu", kind: "visible", equals: true }] },
      { id: "choose", input: { kind: "click", selector: "#blue" }, timeoutMs: 80, assertions: [{ selector: "#selected", kind: "text", equals: "Blue" }] },
      { id: "close", input: { kind: "key", key: "Escape" }, timeoutMs: 80, assertions: [{ selector: "#menu", kind: "visible", equals: false }, { selector: "#toggle", kind: "focused", equals: true }, { selector: "#selected", kind: "text", equals: "Blue" }] },
    ] }] };
    for (const broken of [false, true]) {
      const html = `<!doctype html><div id="wrapper"><button id="toggle" onclick="document.querySelector('#menu').hidden=false">Open</button><div id="menu" hidden><button id="blue" onclick="this.style.transform='translateX(20px)';${broken ? "" : "document.querySelector('#selected').textContent='Blue'"}">Blue</button></div><output id="selected">None</output></div><script>document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelector('#menu').hidden=true;document.querySelector('#toggle').focus()}})</script>`;
      fs.writeFileSync(path.join(dir, "index.html"), html); fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(doc));
      const result = run(["verify", "interaction", "--root", dir, "--probe", "interaction.json", "--chrome", chrome, "--puppeteer-module", puppeteer, "--json"]);
      assert.equal(result.status, broken ? 2 : 0, result.stdout + result.stderr);
      assert.equal(result.output.status, broken ? "failed" : "passed");
      const recorded = JSON.parse(fs.readFileSync(path.join(dir, "evidence/interaction.json")));
      assert.equal(recorded.schema, "design-pipeline.interaction-result.v1");
      assert.equal(recorded.probes[0].steps.length, 4);
      assert.equal(Object.hasOwn(recorded.probes[0], "samples"), false);
      if (broken) {
        const finding = recorded.findings.find(finding => finding.stepId === "choose");
        assert.equal(finding.actual, "None"); assert.equal(finding.expected, "Blue"); assert.ok(finding.fix);
      }
    }
    const malformed = JSON.parse(JSON.stringify(doc)); malformed.probes[0].steps[1].input.script = "document.querySelector('#menu').hidden=false";
    fs.writeFileSync(path.join(dir, "interaction.json"), JSON.stringify(malformed));
    const result = run(["verify", "interaction", "--root", dir, "--probe", "interaction.json", "--output", "never-captured", ...unreachableBrowser(dir), "--json"]);
    assert.equal(result.status, 1); assert.match(result.output.error.message, /unsupported properties: script/);
    assert.equal(fs.existsSync(path.join(dir, "never-captured")), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
