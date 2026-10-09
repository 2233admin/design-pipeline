"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const toolRoot = path.resolve(__dirname, "../skill/tools/gepa");
const sourceManifest = path.resolve(toolRoot, "../../vendor/gepa/manifest.json");
const reviewedRevision = JSON.parse(fs.readFileSync(sourceManifest, "utf8")).source.revision;
const python = process.env.GEPA_PYTHON || "python";
const execute = (args, cwd) => spawnSync(python, args, {
  cwd, encoding: "utf8", windowsHide: true, timeout: 30000,
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
});
const hasPython = execute(["--version"]).status === 0;
const hasGepa = hasPython && execute(["-c", "from gepa.optimize_anything import OptimizeAnythingConfig, optimize_anything"]).status === 0;
const pythonSkip = !hasPython && "optional Python interpreter unavailable";
const nativeSkip = !hasGepa && "optional pinned GEPA runtime unavailable; set GEPA_PYTHON to a prepared task-local Python";
const taskSource = fs.readFileSync(path.join(toolRoot, "synthetic-task.py"), "utf8");
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fixture(t, suffix = "", relocate = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-gepa-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let tools = toolRoot;
  if (relocate) {
    tools = path.join(root, "installed/skill/tools/gepa");
    fs.cpSync(toolRoot, tools, { recursive: true });
    const relocatedManifest = path.resolve(tools, "../../vendor/gepa/manifest.json");
    fs.mkdirSync(path.dirname(relocatedManifest), { recursive: true });
    fs.copyFileSync(sourceManifest, relocatedManifest);
  }
  const seed = path.join(root, "seed.md"), task = path.join(root, "task.py");
  fs.copyFileSync(path.join(tools, "seed.md"), seed);
  fs.writeFileSync(task, taskSource + suffix);
  return { root, seed, task, tools, output: path.join(root, "experiment") };
}

function run(item, options = []) {
  return execute([
    path.join(item.tools, "optimize.py"), "--seed", item.seed, "--task", item.task,
    "--run-dir", item.output, "--max-evals", "16", ...options,
  ], item.root);
}

const resultOf = (item) => JSON.parse(fs.readFileSync(path.join(item.output, "result.json"), "utf8"));

test("GEPA CLI validates its complete request without creating output or bytecode", { skip: pythonSkip }, (t) => {
  const cases = [
    ["budget zero", "", ["--max-evals", "0"], /positive integer/],
    ["budget negative", "", ["--max-evals", "-1"], /positive integer/],
    ["budget nonfinite", "", ["--max-evals", "NaN"], /positive integer/],
    ["budget fractional", "", ["--max-evals", "1.5"], /positive integer/],
    ["missing inference", "\ncustom_candidate_proposer = None\n", [], /explicit reflection_lm/],
    ["invalid inference", "\ncustom_candidate_proposer = None\nreflection_lm = True\n", [], /reflection_lm must/],
    ["ambiguous inference", "\nreflection_lm = 'explicit/test-model'\n", [], /exactly one/],
    ["empty inference", "\ncustom_candidate_proposer = None\nreflection_lm = ''\n", [], /reflection_lm must/],
    ["noncallable proposer", "\ncustom_candidate_proposer = 'wrong'\n", [], /must be callable/],
    ["missing evaluator", "\nevaluator = None\n", [], /callable evaluator/],
    ["empty objective", "\nobjective = ' '\n", [], /objective must/],
    ["empty split", "\ndataset = []\n", [], /nonempty JSON list/],
    ["missing split", "\ndel test_set\n", [], /nonempty JSON list/],
    ["overlap", "\nvalset[0]['id'] = 'train'\n", [], /unique and disjoint/],
    ["duplicate", "\ndataset.append(dataset[0].copy())\n", [], /unique and disjoint/],
    ["empty id", "\ndataset[0]['id'] = ' '\n", [], /nonempty string ids/],
    ["non-string id", "\ndataset[0]['id'] = True\n", [], /nonempty string ids/],
    ["non-JSON data", "\ndataset[0]['required'] = {'not-a-list'}\n", [], /only JSON data/],
    ["nonfinite data", "\ndataset[0]['number'] = float('nan')\n", [], /JSON compliant/],
    ["non-string JSON key", "\ndataset[0][3] = 'wrong'\n", [], /string JSON keys/],
  ];
  for (const [name, suffix, options, pattern] of cases) {
    const item = fixture(t, suffix);
    const result = run(item, options);
    assert.equal(result.status, 1, `${name}: ${result.stderr || result.stdout}`);
    assert.match(result.stderr, pattern, name);
    assert.equal(fs.existsSync(item.output), false, name);
    assert.equal(fs.existsSync(path.join(item.root, "__pycache__")), false, name);
  }
  const empty = fixture(t);
  fs.writeFileSync(empty.seed, " \n");
  assert.match(run(empty).stderr, /seed must be nonempty/);
  assert.equal(fs.existsSync(empty.output), false);
  const missingOption = execute([path.join(toolRoot, "optimize.py"), "--seed", empty.seed], empty.root);
  assert.equal(missingOption.status, 1);
  assert.match(missingOption.stderr, /required/);
});

test("GEPA rejects existing output and task-import input mutation before output creation", { skip: pythonSkip }, (t) => {
  const existing = fixture(t);
  fs.mkdirSync(existing.output);
  fs.writeFileSync(path.join(existing.output, "previous.json"), "preserve this evidence");
  const result = run(existing);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /fresh directory/);
  assert.deepEqual(fs.readdirSync(existing.output), ["previous.json"]);
  assert.equal(fs.readFileSync(path.join(existing.output, "previous.json"), "utf8"), "preserve this evidence");

  const mutation = fixture(t, "\nfrom pathlib import Path\nPath(__file__).with_name('seed.md').write_text('mutated during import')\n");
  const drift = run(mutation);
  assert.equal(drift.status, 1);
  assert.match(drift.stderr, /input drift while loading task/);
  assert.equal(fs.existsSync(mutation.output), false);

  const installed = fixture(t);
  const forbidden = path.join(toolRoot, `forbidden-run-${path.basename(installed.root)}`);
  const protectedOutput = run(installed, ["--run-dir", forbidden]);
  assert.equal(protectedOutput.status, 1);
  assert.match(protectedOutput.stderr, /outside the packaged skill/);
  assert.equal(fs.existsSync(forbidden), false);
});

test("missing optional GEPA fails clearly before creating output", { skip: pythonSkip || hasGepa }, (t) => {
  const item = fixture(t);
  const result = run(item);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GEPA runtime unavailable/);
  assert.equal(fs.existsSync(item.output), false);
});

test("GEPA rejects unreviewed distribution provenance and shadowed imports before output or package execution", { skip: pythonSkip }, (t) => {
  const cases = [
    ["missing provenance", "None", /provenance unavailable/],
    ["local source", JSON.stringify(JSON.stringify({ url: "file:///local/source", dir_info: {} })), /provenance unavailable/],
    ["other revision", JSON.stringify(JSON.stringify({ vcs_info: { vcs: "git", commit_id: "0".repeat(40) } })), /does not match reviewed/],
    ["invalid provenance", JSON.stringify("invalid-json"), /provenance is invalid/],
    ["shadowed package", JSON.stringify(JSON.stringify({ vcs_info: { vcs: "git", commit_id: reviewedRevision } })), /import path does not belong/],
  ];
  for (const [name, directUrl, pattern] of cases) {
    const item = fixture(t, `\nimport importlib.metadata\nfrom pathlib import Path\nclass FakeDistribution:\n    version = '0.1.4'\n    def read_text(self, name):\n        return ${directUrl}\n    def locate_file(self, name):\n        return Path(__file__).with_name('reviewed-package')\nimportlib.metadata.distribution = lambda name: FakeDistribution()\n`);
    const shadow = path.join(item.root, "gepa");
    fs.mkdirSync(shadow);
    fs.writeFileSync(path.join(shadow, "__init__.py"), "from pathlib import Path\nPath(__file__).parent.parent.joinpath('unknown-package-executed').write_text('wrong')\n");
    const result = run(item);
    assert.equal(result.status, 1, `${name}: ${result.stderr || result.stdout}`);
    assert.match(result.stderr, pattern, name);
    assert.equal(fs.existsSync(item.output), false, name);
    assert.equal(fs.existsSync(path.join(item.root, "unknown-package-executed")), false, name);
  }
});

test("a relocated GEPA helper exports a native improving proposal with lineage and sealed final-test evidence", { skip: nativeSkip }, (t) => {
  const item = fixture(t, "", true);
  const hashes = { seed: sha(item.seed), task: sha(item.task) };
  const runResult = run(item);
  assert.equal(runResult.status, 0, runResult.stderr || runResult.stdout);
  const summary = JSON.parse(runResult.stdout);
  assert.equal(summary.status, "proposed");
  const report = resultOf(item);
  assert.equal(report.status, "proposed");
  assert.equal(report.ComponentConformance, "not-evaluated");
  assert.equal(report.VisualAcceptance, "not-evaluated");
  assert.equal(report.runtime.name, "gepa");
  assert.equal(report.runtime.revision, reviewedRevision);
  assert.equal(typeof report.runtime.version, "string");
  assert.equal(report.metadata.baseline_test_score, 0);
  assert.equal(report.metadata.test_score, 1);
  assert.ok(report.total_evals > 0 && report.total_evals <= 16);
  assert.ok(Number.isInteger(report.total_metric_calls) && report.total_metric_calls > 0 && report.total_metric_calls <= 16);
  assert.equal(report.metadata.budget.max_evals, 16);
  assert.ok(report.native.candidates.length >= 2);
  assert.deepEqual(report.native.parents[0], [null]);
  assert.deepEqual(report.native.parents[1], [0]);
  assert.ok(report.native.best_idx > 0);
  assert.equal(report.native.val_aggregate_scores[report.native.best_idx], 1);
  assert.deepEqual(report.inputs_before, report.inputs_after);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(item.output, "inputs.json"), "utf8")), report.inputs_before);
  assert.equal(report.inputs_before.seed.sha256, hashes.seed);
  assert.equal(sha(item.seed), hashes.seed);
  assert.equal(sha(item.task), hashes.task);
  assert.equal(sha(path.join(item.output, "seed.md")), hashes.seed);
  const best = fs.readFileSync(path.join(item.output, "best-candidate.md"), "utf8");
  assert.match(best, /Check the output/);
  assert.match(best, /Check keyboard focus/);
  assert.match(best, /Check reduced motion/);
  assert.match(fs.readFileSync(path.join(item.output, "candidate.diff"), "utf8"), /\+Check keyboard focus/);
  assert.equal(fs.existsSync(path.join(item.output, "state/gepa_state.bin")), true);
  assert.equal(fs.existsSync(path.join(item.output, "evaluations/summary.json")), true);
  assert.equal(JSON.stringify(report.eval_log).includes("heldout-sentinel"), false);
  const reflectionFiles = fs.readdirSync(path.join(item.output, "state/iterations"))
    .map((id) => path.join(item.output, "state/iterations", id, "reflective_dataset.json"))
    .filter((file) => fs.existsSync(file));
  assert.ok(reflectionFiles.length > 0);
  for (const file of reflectionFiles) assert.equal(fs.readFileSync(file, "utf8").includes("heldout-sentinel"), false);
  const preserved = fs.readFileSync(path.join(item.output, "result.json"), "utf8");
  assert.equal(run(item).status, 1);
  assert.equal(fs.readFileSync(path.join(item.output, "result.json"), "utf8"), preserved);
});

test("native GEPA rejects invalid evaluator scores and feedback while retaining failed evidence", { skip: nativeSkip }, (t) => {
  for (const [value, info, pattern] of [
    ["True", "{}", /finite number, not bool/],
    ["float('nan')", "{}", /finite number/],
    ["float('inf')", "{}", /finite number/],
    ["0.0", "[]", /side_info must be a dict/],
    ["0.0", "{'nonfinite_detail': float('nan')}", /Out of range float values/],
    ["0.0", "{'nonfinite_detail': float('inf')}", /Out of range float values/],
    ["0.0", "{('wrong',): 'value'}", /keys must be/],
  ]) {
    const item = fixture(t, `\ndef evaluator(candidate, example):\n    return ${value}, ${info}\n`);
    const runResult = run(item);
    assert.equal(runResult.status, 1, runResult.stdout);
    assert.match(runResult.stderr, pattern);
    const report = resultOf(item);
    assert.equal(report.status, "failed");
    assert.match(report.error, pattern);
    assert.ok(report.evaluator_errors.length > 0);
    assert.equal(fs.existsSync(path.join(item.output, "error.txt")), true);
    assert.equal(fs.existsSync(path.join(item.output, "inputs.json")), true);
    assert.equal(fs.existsSync(path.join(item.output, "best-candidate.md")), false);
    assert.deepEqual(report.inputs_before, report.inputs_after);
  }
  const circular = fixture(t, `\ndef evaluator(candidate, example):\n    info = {}\n    info['self'] = info\n    return 0.0, info\n`);
  assert.equal(run(circular).status, 1);
  const circularReport = resultOf(circular);
  assert.equal(circularReport.status, "failed");
  assert.match(circularReport.error, /Circular reference/);
  assert.ok(circularReport.evaluator_errors.length > 0);

  const printable = fixture(t, `\noriginal_evaluator = evaluator\ndef evaluator(candidate, example):\n    score, info = original_evaluator(candidate, example)\n    info['printable_diagnostic'] = object()\n    return score, info\n`);
  const printableResult = run(printable);
  assert.equal(printableResult.status, 0, printableResult.stderr);
  assert.equal(resultOf(printable).status, "proposed");

  const finalTestFailure = fixture(t, `\noriginal_evaluator = evaluator\ndef evaluator(candidate, example):\n    if example['id'] == 'heldout-sentinel' and 'Check keyboard focus.' in candidate:\n        return float('nan'), {}\n    return original_evaluator(candidate, example)\n`);
  assert.equal(run(finalTestFailure).status, 1);
  const report = resultOf(finalTestFailure);
  assert.equal(report.status, "failed");
  assert.match(report.error, /finite number/);
  assert.ok(report.native.candidates.length >= 2, "search evidence survives a swallowed final-test exception");
  assert.equal(fs.existsSync(path.join(finalTestFailure.output, "best-candidate.md")), false);

  const overflow = fixture(t, `\ntest_set.append({**test_set[0], 'id': 'heldout-overflow'})\noriginal_evaluator = evaluator\ndef evaluator(candidate, example):\n    if example['id'].startswith('heldout-'):\n        return 1e308, {}\n    return original_evaluator(candidate, example)\n`);
  const overflowResult = run(overflow);
  assert.equal(overflowResult.status, 1, overflowResult.stdout);
  const overflowReport = resultOf(overflow);
  assert.equal(overflowReport.status, "failed");
  assert.match(overflowReport.error, /Out of range float values/);
  assert.deepEqual(overflowReport.evaluator_errors, []);
  assert.equal(fs.existsSync(path.join(overflow.output, "state/gepa_state.bin")), true);
  assert.equal(fs.existsSync(path.join(overflow.output, "error.txt")), true);
  assert.equal(fs.existsSync(path.join(overflow.output, "best-candidate.md")), false);
});

test("GEPA detects callback drift in seed, task and frozen fixtures and preserves native evidence", { skip: nativeSkip }, (t) => {
  for (const mutation of [
    "Path(__file__).with_name('seed.md').write_text('changed by callback')",
    "Path(__file__).write_text(Path(__file__).read_text() + '\\n# changed by callback\\n')",
    "dataset[0]['unexpected'] = 'changed by callback'",
  ]) {
    const item = fixture(t, `\nfrom pathlib import Path\noriginal_evaluator = evaluator\nmutated = False\ndef evaluator(candidate, example):\n    global mutated\n    if not mutated:\n        mutated = True\n        ${mutation}\n    return original_evaluator(candidate, example)\n`);
    const runResult = run(item);
    assert.equal(runResult.status, 1, runResult.stdout);
    assert.match(runResult.stderr, /input drift/);
    const report = resultOf(item);
    assert.equal(report.status, "failed");
    assert.notDeepEqual(report.inputs_before, report.inputs_after);
    assert.ok(report.native.candidates.length >= 2);
    assert.equal(fs.existsSync(path.join(item.output, "state/gepa_state.bin")), true);
    assert.equal(fs.existsSync(path.join(item.output, "best-candidate.md")), false);
  }
});
