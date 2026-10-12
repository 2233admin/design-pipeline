"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { analyzeProject } = require("../skill/scripts/edit-project-core.cjs");

const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "edit handoff "));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const ff = args => {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
};
const execute = (command, cwd) => {
  const result = spawnSync(`${command} --json`, { cwd, shell: true, encoding: "utf8", windowsHide: true, timeout: 120000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return JSON.parse(result.stdout);
};

test("edit analyze and auto handoffs execute outside the spaced project and render returns a bound check", t => {
  const root = temporary(t), elsewhere = temporary(t);
  fs.mkdirSync(path.join(root, "sources"));
  ff(["-f", "lavfi", "-i", "testsrc2=s=160x90:r=30", "-t", "4", "-pix_fmt", "yuv420p", path.join(root, "sources", "bars.mp4")]);
  ff(["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", path.join(root, "music.wav")]);
  fs.writeFileSync(path.join(root, "score-grid.json"), JSON.stringify({ bpm: 120, beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] }));
  fs.writeFileSync(path.join(root, "sources", "licenses.json"), JSON.stringify({ "bars.mp4": { license: "generated", commercialUse: true } }));
  const analysis = analyzeProject(root, { music: "music.wav" });
  const autoCommand = analysis.next[0].replace("mad|pv", "pv").replace("[--duration <sec>]", "--duration 2 --width 160 --height 90");
  const edited = execute(autoCommand, elsewhere);
  assert.equal(edited.status, "edited");
  assert.ok(fs.existsSync(path.join(root, "edit.json")));
  const rendered = execute(edited.next[0], elsewhere);
  assert.equal(rendered.status, "rendered");
  assert.ok(fs.statSync(path.join(root, rendered.output)).size > 0);
  assert.match(rendered.next[0], /film-edit check/);
  assert.ok(rendered.next[0].includes(root.split(path.sep).join("/")), rendered.next[0]);
  assert.match(rendered.next[0], /--root .* --project-root /);
  assert.deepEqual(fs.readdirSync(elsewhere), []);
});
