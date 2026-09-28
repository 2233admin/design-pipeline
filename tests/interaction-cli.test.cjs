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
