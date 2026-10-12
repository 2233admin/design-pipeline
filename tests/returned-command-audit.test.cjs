"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { checkDesignFoundation } = require("../skill/scripts/design-synthesis-core.cjs");
const { checkAudio } = require("../skill/scripts/audio-core.cjs");
const { scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { initState, nextAction, readState, recordGate } = require("../skill/scripts/workflow-core.cjs");
const { CACHE } = require("../skill/scripts/film-blocks-core.cjs");
// Media checks need ffmpeg and ffprobe on PATH and skip without them (AGENTS.md); CI runners have neither.
const hasFfmpeg = ["ffmpeg", "ffprobe"].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0);

const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "command audit "));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const execute = (command, cwd, options = {}) => {
  const result = spawnSync(command, { cwd, shell: true, encoding: "utf8", windowsHide: true, timeout: 120000, ...options });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result;
};

test("missing foundation initialization command selects the same spaced project outside cwd", t => {
  const root = temporary(t), elsewhere = temporary(t);
  const missing = checkDesignFoundation({ projectRoot: root });
  assert.equal(missing.status, "synthesis-required");
  const command = missing.nextCommand.replace("<change-id>", "recover-foundation").replace("<problem>", "Build a product-specific documentation site");
  execute(command, elsewhere);
  const manifests = fs.readdirSync(path.join(root, "design", "changes", "recover-foundation"));
  assert.ok(manifests.includes("design-synthesis.json"));
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("legacy catalog repair projection runs from unrelated cwd without media tools", t => {
  const root = temporary(t), elsewhere = temporary(t);
  initState(root, { deliverable: "film", tier: "quick" });
  fs.writeFileSync(path.join(root, "storyboard.json"), "{}");
  fs.writeFileSync(path.join(root, CACHE), JSON.stringify({
    schema: "design-pipeline.hyperframes-catalog-cache.v1",
    items: [{ name: "text-reveal", type: "block", title: "Text Reveal", tags: ["text"] }],
  }));
  const legacyFix = 'Use a block name from `designer-pipeline film blocks --query "text"` (the HyperFrames catalog), or remove the block field.';
  recordGate(root, "storyboard", "failed", ["storyboard.json"], {
    findings: [{ code: "block-unknown", severity: "error", message: "Unknown historical block.", fix: legacyFix }],
  });
  const stateBefore = fs.readFileSync(path.join(root, ".design-pipeline", "state.json"));
  const finding = nextAction(root).verification.findings.find(item => item.code === "block-unknown");
  assert.ok(finding, "next must project the saved legacy finding");
  const command = finding.fix.match(/`([^`]+)`/)[1];
  const child = execute(command + " --json", elsewhere, { env: { ...process.env, PATH: path.dirname(process.execPath) } });
  const result = JSON.parse(child.stdout);
  assert.equal(result.status, "found");
  assert.equal(result.cached, true, "no network or media tools are needed");
  assert.deepEqual(result.results.map(item => item.name), ["text-reveal"], "the original query still selects blocks");
  assert.deepEqual(fs.readFileSync(path.join(root, ".design-pipeline", "state.json")), stateBefore);
  assert.equal(readState(root).gates.storyboard.findings[0].fix, legacyFix, "projection must not rewrite cached evidence");
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("audio loudness recovery command masters the same spaced file outside cwd", { skip: !hasFfmpeg && "ffmpeg not installed" }, t => {
  const root = temporary(t), elsewhere = temporary(t);
  const input = path.join(root, "quiet score.wav");
  const generated = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", input], { encoding: "utf8", windowsHide: true });
  assert.equal(generated.status, 0, generated.stderr);
  const result = checkAudio(input, { target: "web" });
  const finding = result.findings.find(item => item.code === "loudness-off-target");
  assert.ok(finding, JSON.stringify(result));
  const command = [...finding.fix.matchAll(/`([^`]+)`/g)].map(match => match[1]).find(value => value.includes("audio master"));
  assert.ok(command, finding.fix);
  execute(command, elsewhere);
  assert.ok(fs.statSync(path.join(root, "quiet score-mastered.wav")).size > 0);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});

test("Windows frame-review command contract binds its root without media tools", t => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { ...platform, value: "win32" });
  t.after(() => Object.defineProperty(process, "platform", platform));
  const root = temporary(t);
  const scaffold = scaffoldFilm(root);
  const step = scaffold.next.find(value => value.includes("reference analyze-video"));
  assert.ok(step, JSON.stringify(scaffold.next));
  const command = [...step.matchAll(/`([^`]+)`/g)].map(match => match[1]).find(value => value.includes("reference analyze-video"));
  fs.mkdirSync(path.join(root, "evidence", "second-frames"), { recursive: true });
  const state = { deliverable: "film", tier: "quick", decisions: {} };
  const review = require("../skill/scripts/workflows/film.cjs").stages(state).find(stage => stage.id === "review").action(state, root);
  const reviewCommand = review.first.match(/`([^`]+)`/)[1];
  const expected = '"' + root.split(path.sep).join("/") + '"';
  for (const returned of [command, reviewCommand]) {
    assert.ok(returned.includes("--root " + expected), returned);
    assert.match(returned, /reference analyze-video/);
    assert.ok(!returned.includes("%"), returned);
  }
  assert.match(reviewCommand, /--output evidence\/second-frames-1/);
});

test("Windows scaffold frame-review command decodes per-second frames outside cwd without a percent path", { skip: process.platform !== "win32" ? "Windows shell percent-pattern contract" : !hasFfmpeg && "ffmpeg not installed" }, t => {
  const root = temporary(t), elsewhere = temporary(t);
  const scaffold = scaffoldFilm(root);
  const step = scaffold.next.find(value => value.includes("reference analyze-video"));
  assert.ok(step, JSON.stringify(scaffold.next));
  const command = [...step.matchAll(/`([^`]+)`/g)].map(match => match[1]).find(value => value.includes("reference analyze-video"));
  assert.ok(command, step);
  assert.ok(!command.includes("%"), command);
  const generated = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=160x90:r=12:d=2", path.join(root, "out.mp4")], { encoding: "utf8", windowsHide: true });
  assert.equal(generated.status, 0, generated.stderr);
  execute(command, elsewhere);
  const report = JSON.parse(fs.readFileSync(path.join(root, "evidence", "second-frames", "report.json")));
  assert.ok(report.frames.length >= 2, JSON.stringify(report.sampling));
  const state = { deliverable: "film", tier: "quick", decisions: {} };
  const review = require("../skill/scripts/workflows/film.cjs").stages(state).find(stage => stage.id === "review").action(state, root);
  const reviewCommand = review.first.match(/`([^`]+)`/)[1];
  assert.match(reviewCommand, /reference analyze-video/);
  assert.match(reviewCommand, /--output evidence\/second-frames-1/);
  assert.ok(!reviewCommand.includes("%"), reviewCommand);
  execute(reviewCommand, elsewhere);
  const reviewed = JSON.parse(fs.readFileSync(path.join(root, "evidence", "second-frames-1", "report.json")));
  assert.ok(reviewed.frames.length >= 2);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});
