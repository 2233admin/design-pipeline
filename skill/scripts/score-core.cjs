"use strict";

// Music as code with Strudel (strudel.cc). Strudel is AGPL-3.0-or-later, so this MIT package
// never bundles it: `film score` installs pinned Strudel packages into the film project on first
// use (like HyperFrames), builds a browser bundle there, and renders patterns offline in headless
// Chrome. Only Strudel's built-in synth and noise sounds are enabled, so no third-party sample
// licenses enter the score. The pattern's own event grid (queryArc) is exported, so cuts and
// sound cues can be checked against the music's real events instead of detected onsets.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { assertEnum, fail } = require("./contract-utils.cjs");

const SCOPE = "film score";
const GRID_SCHEMA = "design-pipeline.score-grid.v1";
const HOME = path.join(".design-pipeline", "strudel");
const PINNED = { "@strudel/core": "1.2.6", "@strudel/mini": "1.2.6", "@strudel/tonal": "1.2.6", "@strudel/webaudio": "1.3.0", superdough: "1.3.0", esbuild: "0.28.2" };
const BEATS_PER_CYCLE = 4;

// Synth-only templates. Placeholders: {root} key root (e.g. c), {prog} chord roots per bar.
// Each is a Strudel expression; sections are expressed with `arrange` over cycles.
const TEMPLATES = {
  "punchy-launch": {
    mood: "confident product launch, builds to a clear drop",
    code: `arrange(
  [{intro}, stack(
    note("<{prog}>").s("sawtooth").lpf(sine.range(400, 1600).slow(4)).gain(0.35),
    s("white*8").hpf(8000).decay(0.03).gain(0.12)
  )],
  [{drop}, stack(
    note("<{prog}>").s("sawtooth").lpf(2200).gain(0.4),
    note("<{prog}>").add(12).s("square").struct("x ~ x x ~ x ~ x").decay(0.12).gain(0.22),
    note("{root}1").s("sine").struct("x ~ ~ ~ x ~ ~ ~").decay(0.25).gain(0.7),
    s("white").struct("~ x ~ x").hpf(2500).decay(0.08).gain(0.25),
    s("white*8").hpf(8000).decay(0.03).gain(0.12)
  )]
)`,
  },
  "calm-build": {
    mood: "calm, spacious, slowly opening",
    code: `arrange(
  [{intro}, stack(
    note("<{prog}>").s("triangle").attack(0.4).release(1.2).gain(0.35),
    note("<{prog}>").add(19).s("sine").struct("~ x ~ ~").decay(0.6).gain(0.18)
  )],
  [{drop}, stack(
    note("<{prog}>").s("triangle").attack(0.3).release(1.2).gain(0.4),
    note("<{prog}>").add(12).s("sine").struct("x ~ x ~ ~ x ~ ~").decay(0.4).gain(0.2),
    note("{root}2").s("sine").struct("x ~ ~ ~").decay(0.5).gain(0.45)
  )]
)`,
  },
  "tech-pulse": {
    mood: "precise, technical, steady pulse",
    code: `arrange(
  [{intro}, stack(
    note("{root}2*8").s("square").lpf(900).decay(0.07).gain(0.25),
    s("white*16").hpf(9000).decay(0.015).gain(0.08)
  )],
  [{drop}, stack(
    note("{root}2*8").s("square").lpf(1600).decay(0.07).gain(0.28),
    note("<{prog}>").add(12).s("sawtooth").struct("x ~ ~ x ~ ~ x ~").lpf(3000).decay(0.15).gain(0.2),
    note("{root}1").s("sine").struct("x ~ x ~").decay(0.2).gain(0.6),
    s("white*16").hpf(9000).decay(0.015).gain(0.1)
  )]
)`,
  },
};
const PROGRESSIONS = { c: "c3 a2 f2 g2", d: "d3 b2 g2 a2", e: "e3 c3 a2 b2", f: "f2 d3 a2# c3", g: "g2 e3 c3 d3", a: "a2 f2 c3 g2" };

function cpsFor(bpm) {
  if (!(bpm >= 40 && bpm <= 240)) fail(SCOPE, `bpm ${bpm} is out of range; use 40-240`);
  return bpm / 60 / BEATS_PER_CYCLE;
}

// Fill a template so its drop lands on the storyboard's first downbeat/impact cue (or halfway).
function scoreFromTemplate(name, { bpm, durationSec, key = "c", dropSec }) {
  assertEnum(name, Object.keys(TEMPLATES), "template", SCOPE);
  assertEnum(key, Object.keys(PROGRESSIONS), "key", SCOPE);
  const cps = cpsFor(bpm);
  const cycles = Math.max(1, Math.round(durationSec * cps));
  const intro = Math.min(cycles - 1, Math.max(1, Math.round((dropSec ?? durationSec / 2) * cps)));
  const code = TEMPLATES[name].code
    .replaceAll("{intro}", String(intro))
    .replaceAll("{drop}", String(Math.max(1, cycles - intro)))
    .replaceAll("{prog}", PROGRESSIONS[key])
    .replaceAll("{root}", key);
  return { code, bpm, cps, cycles, dropSec: intro / cps };
}

function runNpm(args, cwd) {
  const cli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  const [command, prefix] = fs.existsSync(cli) ? [process.execPath, [cli]] : ["npm", []];
  return spawnSync(command, [...prefix, ...args], { cwd, encoding: "utf8", windowsHide: true, timeout: 600000, maxBuffer: 64 << 20 });
}

const ENTRY = `import * as core from "@strudel/core";
import * as mini from "@strudel/mini";
import * as tonal from "@strudel/tonal";
import * as webaudio from "@strudel/webaudio";
import { registerSynthSounds } from "superdough";
window.strudel = { ...core, ...mini, ...tonal, ...webaudio, registerSynthSounds };
`;
// @strudel/core 1.2.6 imports SalatRepl, which @kabelsalat/web 0.4.1 does not export; the
// kabelsalat live-coding feature is unused for offline scores, so it is stubbed.
const BUILD = `import { build } from "esbuild";
await build({
  entryPoints: ["entry.mjs"], bundle: true, format: "iife", outfile: "strudel.bundle.js", platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error",
  plugins: [{ name: "stub-kabelsalat", setup(b) {
    b.onResolve({ filter: /^@kabelsalat\\/web$/ }, () => ({ path: "kabelsalat-stub", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export class SalatRepl { constructor() { throw new Error('kabelsalat is unavailable in offline scores'); } }", loader: "js" }));
  } }],
});
`;

// Installs pinned Strudel into the film project (never into this package) and builds the bundle.
function ensureStrudel(projectDir, options = {}) {
  const home = path.join(projectDir, HOME);
  const bundle = path.join(home, "strudel.bundle.js");
  const manifest = { name: "design-pipeline-strudel", private: true, type: "module", license: "AGPL-3.0-or-later", dependencies: PINNED };
  const manifestFile = path.join(home, "package.json");
  const current = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, "utf8") : null;
  const wanted = `${JSON.stringify(manifest, null, 2)}\n`;
  if (current === wanted && fs.existsSync(bundle) && !options.reinstall) return { home, bundle, installed: false };
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(manifestFile, wanted);
  fs.writeFileSync(path.join(home, "entry.mjs"), ENTRY);
  fs.writeFileSync(path.join(home, "build.mjs"), BUILD);
  fs.writeFileSync(path.join(home, ".gitignore"), "node_modules/\nstrudel.bundle.js\npattern.render.js\n");
  fs.writeFileSync(path.join(home, "README.md"), "Strudel (AGPL-3.0-or-later) installed by design-pipeline `film score` for offline scoring.\nNot part of the design-pipeline package. Delete this folder to remove it.\n");
  const install = (options.npm || runNpm)(["install", "--no-audit", "--no-fund", "--loglevel=error"], home);
  if (install.status !== 0) fail(SCOPE, `installing Strudel failed: ${String(install.stderr).trim().split("\n").slice(-1)[0]}. Fix: check network access to the npm registry, then re-run film score`, { code: "TOOL_FAILED" });
  const built = spawnSync(process.execPath, ["build.mjs"], { cwd: home, encoding: "utf8", windowsHide: true, timeout: 300000 });
  if (built.status !== 0 || !fs.existsSync(bundle)) fail(SCOPE, `building the Strudel bundle failed: ${String(built.stderr).trim().split("\n").slice(-1)[0]}`, { code: "TOOL_FAILED" });
  return { home, bundle, installed: true };
}

// Grid from the pattern's events: every onset with its sound and time in seconds.
function summarizeGrid(events, { bpm, cps, durationSec }) {
  const beatSec = 60 / bpm;
  const beats = [];
  for (let t = 0; t <= durationSec + 1e-9; t += beatSec) beats.push(Number(t.toFixed(4)));
  return {
    schema: GRID_SCHEMA,
    bpm,
    cps,
    beatsPerCycle: BEATS_PER_CYCLE,
    durationSec,
    beats,
    events: events.map((event) => ({ atSec: Number(event.atSec.toFixed(4)), durSec: Number(event.durSec.toFixed(4)), sound: event.value.s || null, note: event.value.note ?? null, gain: event.value.gain ?? null })),
  };
}

// Off-grid cuts invite review; explicit accent cues still promise an actual musical event.
function checkGridAlignment(board, grid, options = {}) {
  const frame = 1 / (options.fps || board.fps || 30);
  const tolerance = options.toleranceSec ?? frame;
  const points = [...new Set([...grid.beats, ...grid.events.map((event) => event.atSec)])].sort((a, b) => a - b);
  const nearest = (t) => points.reduce((best, p) => (Math.abs(p - t) < Math.abs(best - t) ? p : best), points[0]);
  const findings = [];
  for (const beat of board.beats.slice(1)) {
    if (!["hard-cut", "match-cut"].includes(beat.handoff)) continue;
    const snap = nearest(beat.startSec);
    if (Math.abs(snap - beat.startSec) > tolerance) findings.push({ code: "cut-off-grid", severity: "warn", beatId: beat.id, message: `cut at ${beat.startSec}s is ${Math.abs(snap - beat.startSec).toFixed(3)}s from the nearest musical event`, fix: `Review the intended phrase or counterpoint. If accidental, move the cut to ${snap}s (nearest beat or event), or move the pattern's event onto the cut.` });
  }
  for (const cue of board.sound.cues || []) {
    if (!["downbeat", "accent", "impact"].includes(cue.kind)) continue;
    const snap = nearest(cue.atSec);
    if (Math.abs(snap - cue.atSec) > tolerance) findings.push({ code: "cue-off-grid", message: `${cue.kind} cue ${cue.id} at ${cue.atSec}s is ${Math.abs(snap - cue.atSec).toFixed(3)}s from the nearest musical event`, fix: `Set the cue to ${snap}s and move the visual action with it, or change the pattern so an event lands at ${cue.atSec}s.` });
  }
  return { status: findings.some((finding) => finding.severity !== "warn") ? "failed" : "passed", findings, toleranceSec: Number(tolerance.toFixed(4)) };
}

module.exports = { GRID_SCHEMA, HOME, PINNED, TEMPLATES, checkGridAlignment, cpsFor, ensureStrudel, scoreFromTemplate, summarizeGrid };
