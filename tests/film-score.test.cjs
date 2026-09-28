"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { TEMPLATES, PINNED, checkGridAlignment, cpsFor, ensureStrudel, scoreFromTemplate, summarizeGrid } = require("../skill/scripts/score-core.cjs");
const { scoreFilm } = require("../skill/scripts/score-project-core.cjs");
const { checkFilmProject, scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "film-score-"));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/package-resources.json"), "utf8"));

// A fake render: one kick per beat plus the given extra onsets, as the kernel would return them.
function fakeRender(extra = []) {
  return (args) => {
    const duration = Number(args[args.indexOf("--duration") + 1]);
    const cps = Number(args[args.indexOf("--cps") + 1]);
    const out = args[args.indexOf("--output") + 1];
    fs.writeFileSync(out, "RIFF");
    const beat = 1 / cps / 4;
    const events = [];
    for (let t = 0; t < duration; t += beat) events.push({ atSec: t, durSec: beat, value: { s: "sine", note: "c1" } });
    for (const at of extra) events.push({ atSec: at, durSec: 0.1, value: { s: "white" } });
    return { status: "rendered", events };
  };
}
const fakeEnsure = (root) => {
  const home = path.join(root, ".design-pipeline", "strudel");
  fs.mkdirSync(home, { recursive: true });
  return { home, bundle: path.join(home, "strudel.bundle.js"), installed: false };
};

test("tempo maps to cycles per second at four beats per cycle", () => {
  assert.equal(cpsFor(120), 0.5);
  assert.throws(() => cpsFor(20), /40-240/);
});

test("templates fill to the film length, land the drop on the cue and leave no placeholders", () => {
  for (const name of Object.keys(TEMPLATES)) {
    const score = scoreFromTemplate(name, { bpm: 120, durationSec: 12, key: "c", dropSec: 5 });
    assert.equal(score.cycles, 6);
    assert.equal(score.dropSec, 6, "drop snaps to a whole cycle near the cue");
    assert.ok(!/\{\w+\}/.test(score.code), name);
    let depth = 0;
    for (const ch of score.code) { if (ch === "(") depth += 1; if (ch === ")") depth -= 1; assert.ok(depth >= 0); }
    assert.equal(depth, 0, `${name} has balanced parentheses`);
  }
  assert.throws(() => scoreFromTemplate("dubstep", { bpm: 120, durationSec: 12 }), /allowed: punchy-launch, calm-build, tech-pulse/);
});

test("grid alignment flags cuts and accent cues off the musical grid with the snap point", () => {
  const board = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/film-choreography/storyboard.example.json"), "utf8"));
  const grid = summarizeGrid([], { bpm: 120, cps: 0.5, durationSec: 12 });
  const result = checkGridAlignment(board, grid);
  assert.deepEqual(result.findings.map((f) => f.code), ["cue-off-grid", "cue-off-grid"]);
  assert.match(result.findings[0].fix, /2\.5s/);
  board.beats[2].handoff = "hard-cut";
  board.beats[2].startSec = 5.1;
  assert.ok(checkGridAlignment(board, grid).findings.some((f) => f.code === "cut-off-grid" && /5s/.test(f.fix)));
  const withEvents = summarizeGrid([{ atSec: 2.4, durSec: 0.1, value: { s: "white" } }, { atSec: 8.2, durSec: 0.1, value: { s: "white" } }], { bpm: 120, cps: 0.5, durationSec: 12 });
  board.beats[2].handoff = "camera-carry";
  board.beats[2].startSec = 5;
  assert.equal(checkGridAlignment(board, withEvents).status, "passed", "an event on the cue counts even off the beat");
});

test("film score writes the pattern, grid and license record, and refuses to overwrite a pattern", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    const result = scoreFilm(dir, { template: "punchy-launch", bpm: 120, write: true, ensure: fakeEnsure, render: fakeRender([2.4, 8.2]) });
    assert.equal(result.status, "scored");
    assert.equal(result.alignment.status, "passed");
    assert.ok(fs.existsSync(path.join(dir, "score.strudel.js")));
    const grid = JSON.parse(fs.readFileSync(path.join(dir, "score-grid.json"), "utf8"));
    assert.equal(grid.schema, "design-pipeline.score-grid.v1");
    const board = JSON.parse(fs.readFileSync(path.join(dir, "storyboard.json"), "utf8"));
    const asset = board.sound.assets.find((entry) => entry.id === "score");
    assert.equal(asset.commercialUse, true);
    assert.match(asset.license, /AGPL-3\.0 tool, not bundled/);
    assert.match(result.next[0], /audio master/);
    assert.throws(() => scoreFilm(dir, { template: "calm-build", bpm: 90, ensure: fakeEnsure, render: fakeRender() }), /--replace/);
    assert.throws(() => scoreFilm(dir, { ensure: fakeEnsure, render: fakeRender() }), /--bpm is required/);
    const check = checkFilmProject(dir);
    assert.equal(check.steps.find((step) => step.gate === "score").status, "passed");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("film score without a pattern or template names both ways forward", () => {
  const dir = tmp();
  try {
    scaffoldFilm(dir);
    assert.throws(() => scoreFilm(dir, { bpm: 120, ensure: fakeEnsure, render: fakeRender() }), /--template punchy-launch\|calm-build\|tech-pulse/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("Strudel is installed into the film project with pinned versions, never into this package", () => {
  const dir = tmp();
  try {
    assert.throws(() => ensureStrudel(dir, { npm: () => ({ status: 1, stderr: "E404 registry unreachable" }) }), /registry unreachable.*Fix: check network access/s);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, ".design-pipeline", "strudel", "package.json"), "utf8"));
    assert.deepEqual(manifest.dependencies, PINNED);
    assert.equal(manifest.license, "AGPL-3.0-or-later");
    assert.match(fs.readFileSync(path.join(dir, ".design-pipeline", "strudel", ".gitignore"), "utf8"), /node_modules/);
    const shipped = JSON.stringify(pkg);
    assert.ok(!/strudel\.bundle|@strudel/.test(shipped), "no Strudel code is listed as a package resource");
    const root = JSON.parse(fs.readFileSync(path.join(__dirname, "../skill/references/frontend-stack-registry.json"), "utf8"));
    assert.ok(root);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
