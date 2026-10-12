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

const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "command audit "));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const execute = (command, cwd) => {
  const result = spawnSync(command, { cwd, shell: true, encoding: "utf8", windowsHide: true, timeout: 120000 });
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

test("audio loudness recovery command masters the same spaced file outside cwd", t => {
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

test("Windows scaffold frame-review command decodes per-second frames outside cwd without a percent path", { skip: process.platform !== "win32" && "Windows shell percent-pattern contract" }, t => {
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
