"use strict";

// `film score`: turn a storyboard into a rendered, licensed, grid-aligned score.
// 1. Take a Strudel pattern (a template filled to the storyboard's length and drop, or the
//    project's own score.strudel.js). 2. Install Strudel into the project on first use.
// 3. Render offline to WAV and export the pattern's event grid. 4. Check cuts and accent cues
// against the grid. 5. With --write, record the score as a licensed sound asset.

const fs = require("node:fs");
const path = require("node:path");
const { fail, readJson } = require("./contract-utils.cjs");
const { checkStoryboard } = require("./film-core.cjs");
const { checkGridAlignment, cpsFor, ensureStrudel, scoreFromTemplate, summarizeGrid } = require("./score-core.cjs");

const PATTERN = "score.strudel.js";
const GRID = "score-grid.json";

function scoreFilm(projectDir, options = {}) {
  const root = path.resolve(projectDir);
  const storyboardFile = path.join(root, "storyboard.json");
  if (!fs.existsSync(storyboardFile)) fail("film score", `no storyboard.json in ${root}. Fix: run film scaffold or write the storyboard first; the score is timed to it`, { code: "INPUT_MISSING" });
  const board = readJson(storyboardFile, "film storyboard");
  checkStoryboard(board);
  if (!options.bpm) fail("film score", "--bpm is required (tempo of the score, e.g. 120)", { code: "OPTION_REQUIRED" });
  const cps = cpsFor(options.bpm);
  const patternFile = path.join(root, options.pattern || PATTERN);

  let template = null;
  if (options.template) {
    if (fs.existsSync(patternFile) && !options.replace) fail("film score", `${path.basename(patternFile)} already exists. Fix: edit it and run without --template, or pass --replace to regenerate from the template`, { code: "OUTPUT_EXISTS" });
    const drop = (board.sound.cues || []).find((cue) => ["downbeat", "impact"].includes(cue.kind));
    template = scoreFromTemplate(options.template, { bpm: options.bpm, durationSec: board.durationSec, key: options.key || "c", dropSec: drop ? drop.atSec : undefined });
    fs.writeFileSync(patternFile, `// ${options.template} at ${options.bpm} BPM, drop at ${template.dropSec.toFixed(2)}s. Edit freely; it is plain Strudel.\n${template.code}\n`);
  } else if (!fs.existsSync(patternFile)) {
    fail("film score", `no ${path.basename(patternFile)}. Fix: pass --template punchy-launch|calm-build|tech-pulse to start from a template, or write one Strudel expression in that file`, { code: "INPUT_MISSING" });
  }

  const strudel = (options.ensure || ensureStrudel)(root, options);
  const output = path.join(root, options.output || path.join("assets", "score.wav"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  // The kernel evaluates one expression; strip line comments at the top of the file.
  const source = fs.readFileSync(patternFile, "utf8").split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  const staged = path.join(strudel.home, "pattern.render.js");
  fs.writeFileSync(staged, source);
  const rendered = options.render(["--bundle", strudel.bundle, "--pattern", staged, "--cps", String(cps), "--duration", String(board.durationSec), "--output", output, "--project", root]);
  if (!rendered || !Array.isArray(rendered.events)) fail("film score", "render returned no events", { code: "KERNEL_FAILED" });

  const grid = summarizeGrid(rendered.events, { bpm: options.bpm, cps, durationSec: board.durationSec });
  fs.writeFileSync(path.join(root, GRID), `${JSON.stringify(grid, null, 2)}\n`);
  const alignment = checkGridAlignment(board, grid);

  const relative = path.relative(root, output).split(path.sep).join("/");
  const asset = { id: "score", license: "generated with Strudel (AGPL-3.0 tool, not bundled); built-in synth sounds only, no samples", commercialUse: true, file: relative, source: "strudel" };
  if (options.write) {
    board.sound.mode = "scored";
    board.sound.source = `Strudel pattern ${path.basename(patternFile)} at ${options.bpm} BPM`;
    delete board.sound.reason;
    board.sound.assets = [...(board.sound.assets || []).filter((entry) => entry.id !== "score"), asset];
    fs.writeFileSync(storyboardFile, `${JSON.stringify(board, null, 2)}\n`);
  }
  return {
    status: "scored",
    installedStrudel: strudel.installed,
    pattern: path.basename(patternFile),
    template: options.template || null,
    output: relative,
    bpm: options.bpm,
    events: grid.events.length,
    grid: GRID,
    alignment,
    asset,
    recorded: Boolean(options.write),
    next: [
      `designer-pipeline audio master --input ${relative} --output ${relative.replace(/\.wav$/, "-mastered.wav")} --target web --fade-out 1`,
      `Host it: <audio src="${relative.replace(/\.wav$/, "-mastered.wav")}" data-start="0" data-duration="${board.durationSec}"></audio>`,
      alignment.findings.length ? "Apply each alignment fix (snap cuts/cues to the grid), then re-run film score." : "Cuts and accent cues sit on the musical grid.",
      options.write ? "Storyboard sound.assets now records the score's license." : "Pass --write to record the score as a licensed asset in the storyboard.",
    ],
  };
}

module.exports = { scoreFilm };
