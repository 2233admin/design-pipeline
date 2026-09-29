#!/usr/bin/env node
"use strict";

// Regenerates score-grid.json for score.strudel.js. The grid is never typed: it is summarizeGrid
// (the function `designer-pipeline film score` uses) applied to the pattern's events.
//
// Strudel is AGPL and `film score` installs it on demand, so the suite cannot evaluate the pattern.
// This module states the same twelve bars row by row instead, as the events the Strudel kernel
// reports ({ atSec, durSec, value: { s, note, gain } }): one bar is one cycle of 2 s, a layer plays
// `steps` slots per bar and sounds on the slots in `on`; `note` is a name or one name per local bar
// of its row; `gain` is a number or one number per sounding slot. The model was compared once with
// the real events of @strudel/core 1.2.6 queryArc (README, "Fixture provenance"). Whoever changes
// score.strudel.js changes the rows below to match and repeats that comparison.
//
//   node skill/evals/film/music-driven/regenerate-grid.cjs     rewrites score-grid.json
//
// tests/film-timeline-eval.test.cjs imports patternEvents and goldenGrid and requires the fixture
// to deep-equal goldenGrid(), so the model and the fixture cannot drift apart.

const fs = require("node:fs");
const path = require("node:path");
const { summarizeGrid } = require("../../../scripts/score-core.cjs");

const BAR_SEC = 2;
const BPM = 120;
const CPS = 0.5;
const DURATION_SEC = 24;

function patternEvents() {
  const pad = { s: "sawtooth", note: ["c3", "a2", "f2", "g2"], steps: 1, gain: 0.35 };
  const kick = { s: "sine", note: "c1", steps: 8, on: [0, 2, 4, 6], gain: 0.7 };
  const clap = { s: "white", steps: 4, on: [1, 3], gain: 0.25 };
  const hats = { s: "white", steps: 8, gain: 0.12 };
  const bassLine = { s: "sawtooth", note: ["c2", "a1", "f1", "g1"], steps: 8, on: [0, 2, 3, 5, 7], gain: 0.45 };
  const rows = [
    { bar: 1, bars: 1, layers: [pad] },
    { bar: 2, bars: 4, layers: [pad, kick, clap, hats] },
    { bar: 6, bars: 1, layers: [pad, { s: "pink", steps: 8, gain: 0.2 }, { s: "square", note: "c4", steps: 4, gain: [0.12, 0.16, 0.2, 0.24] }] },
    { bar: 7, bars: 1, layers: [pad, { s: "pink", steps: 16, on: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], gain: 0.2 }, { s: "square", note: "c4", steps: 4, on: [0, 1, 2], gain: [0.28, 0.32, 0.36] }] },
    { bar: 8, bars: 3, layers: [pad, kick, clap, hats, bassLine] },
    { bar: 11, bars: 1, layers: [{ s: "triangle", note: "c2", steps: 4, on: [0, 1], gain: [0.35, 0.55] }] },
    { bar: 12, bars: 1, layers: [{ s: "square", note: "c4", steps: 1, gain: 0.3 }] },
  ];
  const events = [];
  for (const row of rows) {
    for (let local = 0; local < row.bars; local += 1) {
      for (const layer of row.layers) {
        const on = layer.on || Array.from({ length: layer.steps }, (_, step) => step);
        on.forEach((step, index) => {
          const value = { s: layer.s, gain: Array.isArray(layer.gain) ? layer.gain[index] : layer.gain };
          if (layer.note) value.note = Array.isArray(layer.note) ? layer.note[local % layer.note.length] : layer.note;
          events.push({ atSec: (row.bar - 1 + local + step / layer.steps) * BAR_SEC, durSec: BAR_SEC / layer.steps, value });
        });
      }
    }
  }
  // Time order, then voice: the fixture is canonical; the adapter sorts whatever order it is given.
  return events.sort((a, b) => a.atSec - b.atSec || a.value.s.localeCompare(b.value.s) || String(a.value.note || "").localeCompare(String(b.value.note || "")) || a.value.gain - b.value.gain);
}

function goldenGrid() {
  return summarizeGrid(patternEvents(), { bpm: BPM, cps: CPS, durationSec: DURATION_SEC });
}

const GRID_FILE = path.join(__dirname, "score-grid.json");

if (require.main === module) {
  fs.writeFileSync(GRID_FILE, `${JSON.stringify(goldenGrid(), null, 2)}\n`);
  process.stdout.write(`wrote ${path.relative(process.cwd(), GRID_FILE)}\n`);
}

module.exports = { patternEvents, goldenGrid, GRID_FILE };
