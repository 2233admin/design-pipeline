#!/usr/bin/env node
"use strict";

// Verify the golden case library.
//   node evals/cases/verify.cjs            goldens pass the static gates; every storyboard and
//                                          timeline counter-example produces its expected findings
//   node evals/cases/verify.cjs --render   also scores and renders each golden, runs `film check`
//                                          on it (every warning must have a recorded disposition),
//                                          and renders every render counter-example
//   --case <id>                            limit to one case
// Rendering needs the pinned toolchain: `npm install` in evals/cases (HyperFrames), plus network
// access on first use for Strudel. Exit 0 when everything holds, 1 otherwise.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkCounter, checkGolden, listCases, loadCase } = require("./cases.cjs");

const REPO = path.resolve(__dirname, "../..");
const CLI = path.join(REPO, "skill/scripts/designer-pipeline.cjs");
const WORK = path.join(__dirname, ".work");
const args = process.argv.slice(2);
const render = args.includes("--render");
const only = args.includes("--case") ? args[args.indexOf("--case") + 1] : null;

let failures = 0;
function report(ok, label, detail = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
}

// allowed: exit codes that still carry a result (the CLI exits 2 when a gate fails).
function run(command, commandArgs, cwd, allowed = [0]) {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 256 << 20, shell: process.platform === "win32" && command === "npx" });
  if (!allowed.includes(result.status)) throw new Error(`${command} ${commandArgs.join(" ")} exited ${result.status}: ${String(result.stderr || result.stdout).trim().split("\n").slice(-3).join(" | ")}`);
  return result.stdout;
}
function cli(commandArgs, allowed) {
  return JSON.parse(run(process.execPath, [CLI, ...commandArgs], REPO, allowed));
}

// Score (first time only), master and render a case directory to out.mp4.
function build(dir, spec) {
  const score = spec.golden.score;
  const mastered = path.join(dir, "assets", "score-mastered.wav");
  if (score && !fs.existsSync(mastered)) {
    cli(["film", "score", "--project-root", path.relative(REPO, dir), "--bpm", String(score.bpm)]);
    cli(["audio", "master", "--root", dir, "--input", "assets/score.wav", "--output", "assets/score-mastered.wav", "--target", "web", "--fade-out", String(score.fadeOutSec ?? 1)]);
  }
  run("npx", ["hyperframes", "render", "--output", "out.mp4", "--quiet", "--workers", "4"], dir);
  return path.join(dir, "out.mp4");
}

function filmCheck(dir) {
  const result = cli(["film", "check", "--project-root", path.relative(REPO, dir)], [0, 2]);
  const findings = (result.steps || []).flatMap((step) => (step.findings || []).map((finding) => ({ gate: step.gate, ...finding })));
  return { status: result.status, findings };
}

function verifyStatic(loaded) {
  const { spec } = loaded;
  const golden = checkGolden(loaded);
  report(golden.passed, `${spec.id} golden passes storyboard, score and timeline gates`, golden.codes.join(", "));
  for (const counter of spec.counterExamples.filter((entry) => entry.target !== "render")) {
    const result = checkCounter(loaded, counter);
    report(result.missing.length === 0, `${spec.id} counter ${counter.id} (${counter.target}) is caught`, result.missing.length ? `missing ${result.missing.join(", ")}; got ${result.codes.join(", ") || "nothing"}` : result.codes.join(", "));
    const leaked = counter.expect.filter((code) => golden.codes.includes(code));
    report(leaked.length === 0, `${spec.id} counter ${counter.id} isolates a defect the golden does not have`, leaked.join(", "));
  }
}

function verifyRender(loaded) {
  const { spec, dir } = loaded;
  const video = build(dir, spec);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(video)).digest("hex");
  const golden = filmCheck(dir);
  const errors = golden.findings.filter((finding) => finding.severity !== "warn");
  report(golden.status === "passed" && errors.length === 0, `${spec.id} golden render passes film check`, errors.map((finding) => `${finding.gate}:${finding.code}`).join(", "));
  const reviewed = spec.reviewedWarnings || [];
  const unexplained = golden.findings.filter((finding) => finding.severity === "warn" && !reviewed.some((entry) => entry.gate === finding.gate && entry.code === finding.code && (!entry.beatId || entry.beatId === finding.beatId)));
  report(unexplained.length === 0, `${spec.id} every golden warning has a recorded disposition`, unexplained.map((finding) => `${finding.gate}:${finding.code}@${finding.beatId || "-"}`).join(", "));
  console.log(`     ${spec.id} out.mp4 sha256 ${sha}`);

  for (const counter of spec.counterExamples.filter((entry) => entry.target === "render")) {
    const work = path.join(WORK, spec.id, counter.id);
    fs.rmSync(work, { recursive: true, force: true });
    fs.mkdirSync(path.join(work, "assets"), { recursive: true });
    for (const file of [spec.golden.storyboard, "score-grid.json"]) if (fs.existsSync(path.join(dir, file))) fs.copyFileSync(path.join(dir, file), path.join(work, file));
    const mastered = path.join(dir, "assets", "score-mastered.wav");
    if (fs.existsSync(mastered)) fs.copyFileSync(mastered, path.join(work, "assets", "score-mastered.wav"));
    let html = fs.readFileSync(path.join(dir, spec.golden.composition), "utf8");
    for (const edit of counter.edits) {
      if (!html.includes(edit.find)) { report(false, `${spec.id} counter ${counter.id} edit anchor exists`, edit.find.slice(0, 60)); continue; }
      html = html.replace(edit.find, edit.replace);
    }
    fs.writeFileSync(path.join(work, spec.golden.composition), html);
    build(work, spec);
    const result = filmCheck(work);
    const codes = [...new Set(result.findings.map((finding) => finding.code))];
    const missing = counter.expect.filter((code) => !codes.includes(code));
    report(missing.length === 0, `${spec.id} counter ${counter.id} (render) is caught`, missing.length ? `missing ${missing.join(", ")}; got ${codes.join(", ") || "nothing"}` : codes.join(", "));
  }
}

const dirs = listCases().filter((dir) => !only || path.basename(dir) === only);
if (!dirs.length) { console.log(only ? `no case ${only}` : "no cases"); process.exit(1); }
for (const dir of dirs) {
  let loaded;
  try { loaded = loadCase(dir); } catch (error) { report(false, `${path.relative(__dirname, dir)} case.json is valid`, error.message); continue; }
  console.log(`# ${loaded.spec.deliverableType}/${loaded.spec.id} (${loaded.spec.status})`);
  verifyStatic(loaded);
  if (render) {
    try { verifyRender(loaded); } catch (error) { report(false, `${loaded.spec.id} render verification ran`, error.message); }
  }
}
process.exit(failures ? 1 : 0);
