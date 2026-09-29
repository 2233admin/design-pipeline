"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { summarizeGrid } = require("../skill/scripts/score-core.cjs");
const { scoreFilm } = require("../skill/scripts/score-project-core.cjs");
const { scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");
const { scanCompositionSource } = require("../skill/scripts/film-timeline-core.cjs");

const ADAPTER_FILE = path.join(__dirname, "../skill/references/film-choreography/audio-events.js");
const ADAPTER_SOURCE = fs.readFileSync(ADAPTER_FILE, "utf8");
const FilmAudio = require(ADAPTER_FILE);

// Kernel-shaped events ({ atSec, durSec, value: { s, note, gain } }) on a 120 BPM grid, the way
// punchy-launch reads on paper: a sine kick at c1 on beats 1 and 3 of every bar, white-noise claps
// (gain 0.25, 0.08 s) on beats 2 and 4, eighth-note hats (gain 0.12, 0.03 s) and one sawtooth pad
// per bar. Two square notes, one MIDI number and one flat note name, and one event with no gain.
const BPM = 120;
const CPS = 0.5;
const DURATION = 12;
function kernelEvents() {
  const events = [];
  for (let bar = 0; bar < 6; bar += 1) {
    const start = bar * 2;
    events.push({ atSec: start, durSec: 2, value: { s: "sawtooth", note: "c3", gain: 0.4 } });
    events.push({ atSec: start, durSec: 0.25, value: { s: "sine", note: "c1", gain: 0.7 } });
    events.push({ atSec: start + 1, durSec: 0.25, value: { s: "sine", note: "c1", gain: 0.35 } });
    events.push({ atSec: start + 0.5, durSec: 0.08, value: { s: "white", gain: 0.25 } });
    events.push({ atSec: start + 1.5, durSec: 0.08, value: { s: "white", gain: 0.25 } });
    for (let i = 0; i < 4; i += 1) events.push({ atSec: start + i * 0.5 + 0.25, durSec: 0.03, value: { s: "white", gain: 0.12 } });
  }
  events.push({ atSec: 3.1, durSec: 0.12, value: { s: "square", note: 55, gain: 0.22 } }); // g3
  events.push({ atSec: 3.6, durSec: 0.12, value: { s: "square", note: "eb2" } }); // no gain: Strudel's default 1
  return events;
}
const makeGrid = () => summarizeGrid(kernelEvents(), { bpm: BPM, cps: CPS, durationSec: DURATION });
const makeAudio = () => FilmAudio.fromScoreGrid(makeGrid());
const atTimes = (hits) => hits.map((hit) => hit.atSec);

test("hits select a voice by sound and note range, with names and MIDI numbers alike", () => {
  const audio = makeAudio();
  const kicks = FilmAudio.hits(audio, { sound: "sine", midiMax: "c2" });
  assert.equal(kicks.length, 12);
  assert.deepEqual(atTimes(kicks.slice(0, 3)), [0, 1, 2]);
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine", midiMax: 35 }), kicks, "c2 is 36; 35 keeps only the c1 kicks");
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine", midiMin: "c2" }), [], "no sine note is above c1");
  assert.equal(FilmAudio.hits(audio, { sound: "sine", midiMax: "b0" }).length, 0, "the range is by pitch, not by count");
  assert.deepEqual(atTimes(FilmAudio.hits(audio, { sound: "square", midiMin: "g3", midiMax: 55 })), [3.1], "range ends are inclusive");
  assert.deepEqual(atTimes(FilmAudio.hits(audio, { sound: "square", midiMax: "eb2" })), [3.6], "a flat note name is parsed");
  assert.deepEqual(atTimes(FilmAudio.hits(audio, { sound: ["square", "sawtooth"], from: 3, to: 4 })), [3.1, 3.6], "sound accepts a list");
  assert.deepEqual(FilmAudio.hits(audio, { sound: "white", midiMin: 0 }), [], "an event without a note never matches a note range");
  assert.equal(FilmAudio.hits(audio, { sound: "nope" }).length, 0);
  assert.equal(FilmAudio.hits(audio).length, makeGrid().events.length, "no option keeps every event");
});

test("gain and duration tell the clap from the hat, and strength is relative to the selection's largest gain", () => {
  const audio = makeAudio();
  const claps = FilmAudio.hits(audio, { sound: "white", gainMin: 0.2 });
  assert.equal(claps.length, 12);
  assert.ok(claps.every((hit) => hit.strength === 1), "the claps share one gain, so each is the largest");
  assert.deepEqual(atTimes(claps.slice(0, 2)), [0.5, 1.5]);
  const byDuration = FilmAudio.hits(audio, { sound: "white", durMin: 0.05 });
  assert.deepEqual(byDuration, claps, "duration selects the same voice as gain");
  const hats = FilmAudio.hits(audio, { sound: "white", durMax: 0.05 });
  assert.equal(hats.length, 24);
  assert.ok(hats.every((hit) => hit.strength === 1));
  const both = FilmAudio.hits(audio, { sound: "white", from: 0, to: 1 });
  assert.deepEqual(both.map((hit) => [hit.atSec, Number(hit.strength.toFixed(3))]), [[0.25, 0.48], [0.5, 1], [0.75, 0.48]], "hat gain 0.12 over clap gain 0.25 is 0.48");
  const kicks = FilmAudio.hits(audio, { sound: "sine", from: 0, to: 2 });
  assert.deepEqual(kicks.map((hit) => hit.strength), [1, 0.5], "0.35 over 0.7");
  const withDefault = FilmAudio.hits(audio, { sound: "square" });
  assert.deepEqual(withDefault.map((hit) => [hit.atSec, hit.strength]), [[3.1, 0.22], [3.6, 1]], "a missing gain counts as 1, so it is the largest");
  assert.equal(FilmAudio.hits(audio, { sound: "square", gainMin: 0.5 }).length, 1);
  assert.ok(FilmAudio.hits(audio).every((hit) => hit.strength >= 0 && hit.strength <= 1));
});

test("windows are half open and quiet windows remove exactly what is inside them", () => {
  const audio = makeAudio();
  assert.deepEqual(atTimes(FilmAudio.hits(audio, { sound: "sine", from: 1, to: 3 })), [1, 2], "from is inclusive and to is exclusive");
  const all = FilmAudio.hits(audio, { sound: "sine" });
  const quiet = FilmAudio.hits(audio, { sound: "sine", quiet: [[2, 4]] });
  assert.deepEqual(atTimes(all).filter((t) => t < 2 || t >= 4), atTimes(quiet), "kicks at 2 and 3 are out, the kick at 4 stays");
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine", quiet: [{ from: 2, to: 4 }] }), quiet, "objects and pairs are the same window");
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine", quiet: [2, 4] }), quiet, "one bare pair is one window");
  const two = FilmAudio.hits(audio, { sound: "sine", quiet: [[0, 1], [3, 5]] });
  assert.deepEqual(atTimes(two).slice(0, 3), [1, 2, 5]);
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine", quiet: [] }), all);
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine", quiet: [[3.5, 4]] }), all, "a window between hits removes nothing");
  assert.throws(() => FilmAudio.hits(audio, { quiet: [[4, 2]] }), /quiet\[0\]/);
  assert.throws(() => FilmAudio.hits(audio, { from: "2" }), /from must be a number/);
  assert.throws(() => FilmAudio.hits(audio, { midiMax: "h9" }), /not a note.*Fix/s);
});

test("hits come out sorted and inputs are never changed", () => {
  const source = makeGrid();
  source.events.reverse();
  const snapshot = JSON.stringify(source);
  const audio = FilmAudio.fromScoreGrid(source);
  const hits = FilmAudio.hits(audio, { sound: "white" });
  assert.deepEqual(atTimes(hits), [...atTimes(hits)].sort((a, b) => a - b));
  assert.equal(JSON.stringify(source), snapshot, "the grid is not mutated");
  assert.deepEqual(FilmAudio.hits(audio, { sound: "white" }), hits, "same input, same hits");
});

test("bars are numbered from 1 and cover the film without a phantom last bar", () => {
  const audio = makeAudio();
  assert.deepEqual(FilmAudio.bar(audio, 1), { bar: 1, from: 0, to: 2, durSec: 2 });
  assert.deepEqual(FilmAudio.bar(audio, 2, 4), { bar: 2, from: 2, to: 10, durSec: 8 }, "bars 2 to 5 of a two-second bar");
  assert.equal(FilmAudio.bar(audio, 6).to, DURATION);
  assert.throws(() => FilmAudio.bar(audio, 7), /do not exist.*6 bars/s, "summarizeGrid lists a beat at 12 s, which starts no bar");
  assert.throws(() => FilmAudio.bar(audio, 5, 3), /bars 5 to 7/);
  assert.throws(() => FilmAudio.bar(audio, 0), /numbered from 1/);
  assert.throws(() => FilmAudio.bar(audio, 1.5), /whole bar number/);
  const window = FilmAudio.bar(audio, 3);
  assert.deepEqual(atTimes(FilmAudio.hits(audio, { sound: "sine", from: window.from, to: window.to })), [4, 5]);
  const golden = FilmAudio.fromScoreGrid(summarizeGrid([], { bpm: 120, cps: 0.5, durationSec: 24 }));
  assert.equal(FilmAudio.bar(golden, 12).to, 24);
  assert.throws(() => FilmAudio.bar(golden, 13), /12 bars/);
});

test("beats return beat-locked hits and every counts from the first beat", () => {
  const audio = makeAudio();
  const all = FilmAudio.beats(audio);
  assert.equal(all.length, 25, "0 to 12 s at 120 BPM lists both ends");
  assert.deepEqual(all[1], { atSec: 0.5, strength: 1 });
  assert.deepEqual(atTimes(FilmAudio.beats(audio, { every: 4, from: 2, to: 8 })), [2, 4, 6]);
  assert.deepEqual(atTimes(FilmAudio.beats(audio, { every: 2, from: 0, to: 2.5 })), [0, 1, 2]);
  assert.throws(() => FilmAudio.beats(audio, { every: 0 }), /every/);
  assert.throws(() => FilmAudio.beats({}), /fromScoreGrid/);
});

test("a missing or foreign grid throws with the film score fix", () => {
  const fresh = () => {
    const context = vm.createContext({});
    vm.runInContext(ADAPTER_SOURCE, context);
    return context;
  };
  const context = fresh();
  assert.equal(vm.runInContext("typeof FilmAudio.fromScoreGrid", context), "function", "the adapter loads as a plain browser script and defines the global");
  assert.throws(() => vm.runInContext("FilmAudio.fromScoreGrid()", context), /no score grid was loaded.*designer-pipeline film score/s);
  assert.throws(() => vm.runInContext("FilmAudio.setGrid({ schema: 'other.v1' })", context), /designer-pipeline film score/);
  assert.throws(() => vm.runInContext("FilmAudio.fromScoreGrid()", context), /no score grid was loaded/, "a rejected grid is not kept");
  assert.throws(() => FilmAudio.fromScoreGrid(), /designer-pipeline film score/);
  assert.throws(() => FilmAudio.fromScoreGrid(null), /designer-pipeline film score/);
  assert.throws(() => FilmAudio.fromScoreGrid({ ...makeGrid(), schema: "design-pipeline.score-grid.v2" }), /expected schema design-pipeline\.score-grid\.v1.*designer-pipeline film score/s);
  assert.throws(() => FilmAudio.fromScoreGrid({ ...makeGrid(), beats: "none" }), /beats array.*designer-pipeline film score/s);
  assert.throws(() => FilmAudio.fromScoreGrid({ ...makeGrid(), events: [{ sound: "sine" }] }), /events\[0\].*atSec/s);
  vm.runInContext(`FilmAudio.setGrid(${JSON.stringify(makeGrid())})`, context);
  assert.equal(vm.runInContext("FilmAudio.fromScoreGrid().bpm", context), BPM, "setGrid feeds fromScoreGrid()");
});

test("fromAnalysis gives beats and bars but no events", () => {
  const music = { file: "track.wav", durationSec: 8.1, bpm: 120, gridSource: "detected", beats: [0.1, 0.6, 1.1, 1.6, 2.1, 2.6, 3.1, 3.6, 4.1, 4.6], downbeats: [0.1, 2.1, 4.1], bars: [{ startSec: 0.1, endSec: 2.1, energy: 0.2 }, { startSec: 2.1, endSec: 4.1, energy: 0.9 }, { startSec: 4.1, endSec: 8.1, energy: 0.5 }] };
  const audio = FilmAudio.fromAnalysis(music);
  assert.equal(audio.source, "edit-analysis");
  assert.deepEqual(FilmAudio.hits(audio, { sound: "sine" }), [], "an analysis has no events");
  assert.deepEqual(atTimes(FilmAudio.beats(audio, { from: 1, to: 3 })), [1.1, 1.6, 2.1, 2.6]);
  assert.deepEqual(FilmAudio.bar(audio, 2), { bar: 2, from: 2.1, to: 4.1, durSec: 2 });
  assert.deepEqual(FilmAudio.bar(audio, 2, 2), { bar: 2, from: 2.1, to: 8.1, durSec: 6 });
  assert.throws(() => FilmAudio.bar(audio, 4), /3 bars/);
  assert.deepEqual(FilmAudio.fromAnalysis({ schema: "design-pipeline.edit-analysis.v1", music, sources: {} }), audio, "the whole analysis document is accepted");
  const noBars = FilmAudio.fromAnalysis({ bpm: 120, durationSec: 5, beats: [0, 0.5, 1, 1.5], downbeats: [0, 2] });
  assert.deepEqual(FilmAudio.bar(noBars, 2), { bar: 2, from: 2, to: 5, durSec: 3 }, "bars fall back to the downbeats");
  assert.throws(() => FilmAudio.fromAnalysis(), /film-edit analyze/);
  assert.throws(() => FilmAudio.fromAnalysis({ bpm: 120, beats: [0] }), /downbeats.*film-edit analyze/s);
  assert.throws(() => FilmAudio.fromAnalysis({ bpm: 120, beats: ["0"], downbeats: [] }), /film-edit analyze/);
});

test("hash is a pure number in [0, 1) that depends on both seed and index", () => {
  assert.equal(FilmAudio.hash(7, 3), FilmAudio.hash(7, 3));
  const values = [];
  for (let index = 0; index < 200; index += 1) values.push(FilmAudio.hash(1, index));
  assert.ok(values.every((value) => value >= 0 && value < 1));
  assert.ok(new Set(values).size > 195, "indices give distinct values");
  assert.ok(values.some((value, index) => value !== FilmAudio.hash(2, index)), "the seed changes the sequence");
  assert.notEqual(FilmAudio.hash(1, 2), FilmAudio.hash(2, 1));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(mean > 0.4 && mean < 0.6, `mean ${mean} is spread across the interval`);
  assert.throws(() => FilmAudio.hash("a", 1), /seed and index must be numbers/);
});

test("the adapter passes the film-check source scan", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-audio-scan-"));
  try {
    fs.mkdirSync(path.join(dir, "lib"));
    fs.copyFileSync(ADAPTER_FILE, path.join(dir, "lib", "audio-events.js"));
    const scan = scanCompositionSource([{ file: "index.html", html: '<html><body><script src="lib/audio-events.js"></script></body></html>' }], { root: dir });
    assert.deepEqual(scan.findings, []);
    assert.deepEqual(scan.scriptFiles, ["lib/audio-events.js"], "the scan read the file, it did not skip it");
    assert.deepEqual(scan.unscanned, []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// One kick per beat plus extra white onsets, as the kernel would return them.
function fakeRender(extra = []) {
  return (args) => {
    const duration = Number(args[args.indexOf("--duration") + 1]);
    const cps = Number(args[args.indexOf("--cps") + 1]);
    fs.writeFileSync(args[args.indexOf("--output") + 1], "RIFF");
    const beat = 1 / cps / 4;
    const events = [];
    for (let t = 0; t < duration; t += beat) events.push({ atSec: t, durSec: beat, value: { s: "sine", note: "c1", gain: 0.7 } });
    for (const at of extra) events.push({ atSec: at, durSec: 0.1, value: { s: "white", gain: 0.25 } });
    return { status: "rendered", events };
  };
}
const fakeEnsure = (root) => {
  const home = path.join(root, ".design-pipeline", "strudel");
  fs.mkdirSync(home, { recursive: true });
  return { home, bundle: path.join(home, "strudel.bundle.js"), installed: false };
};

test("film score writes lib/score-grid.js that hands the same grid to FilmAudio.setGrid", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "film-audio-score-"));
  try {
    scaffoldFilm(dir);
    const result = scoreFilm(dir, { template: "punchy-launch", bpm: 120, ensure: fakeEnsure, render: fakeRender([2.4, 8.8]) });
    const gridJson = JSON.parse(fs.readFileSync(path.join(dir, "score-grid.json"), "utf8"));
    const script = fs.readFileSync(path.join(dir, "lib", "score-grid.js"), "utf8");
    assert.equal(result.gridScript, "lib/score-grid.js");
    assert.match(script, /^FilmAudio\.setGrid\(\{/);

    let received;
    const context = vm.createContext({ FilmAudio: { setGrid: (grid) => { received = JSON.parse(JSON.stringify(grid)); } } });
    vm.runInContext(script, context);
    assert.deepEqual(received, gridJson, "the script calls FilmAudio.setGrid with the JSON of score-grid.json");
    assert.deepEqual(Object.keys(context).sort(), ["FilmAudio"], "the script defines no global of its own");

    // The two script tags in load order: the composition reads the grid through the adapter.
    const page = vm.createContext({});
    vm.runInContext(`${ADAPTER_SOURCE}\n${script}`, page);
    assert.equal(vm.runInContext("FilmAudio.fromScoreGrid().bpm", page), 120);
    assert.equal(vm.runInContext("FilmAudio.hits(FilmAudio.fromScoreGrid(), { sound: 'white' }).length", page), 2);
    assert.equal(vm.runInContext("typeof FilmScoreGrid", page), "undefined", "no second global");
    assert.throws(() => vm.runInContext(script, vm.createContext({})), /FilmAudio is not defined/, "the adapter has to be loaded first");

    const scan = scanCompositionSource([{ file: "index.html", html: '<script src="lib/audio-events.js"></script><script src="lib/score-grid.js"></script>' }], { root: dir });
    assert.deepEqual(scan.findings.filter((finding) => finding.code === "nondeterministic-source"), []);
    assert.match(result.next.join("\n"), /lib\/audio-events\.js.*then.*lib\/score-grid\.js/s, "the next steps name the load order");

    const rerun = scoreFilm(dir, { bpm: 90, ensure: fakeEnsure, render: fakeRender() });
    const second = JSON.parse(fs.readFileSync(path.join(dir, "score-grid.json"), "utf8"));
    assert.equal(second.bpm, 90);
    vm.runInContext(fs.readFileSync(path.join(dir, "lib", "score-grid.js"), "utf8"), vm.createContext({ FilmAudio: { setGrid: (grid) => { received = JSON.parse(JSON.stringify(grid)); } } }));
    assert.deepEqual(received, second, "a re-run refreshes lib/score-grid.js with the new grid");
    assert.equal(rerun.gridScript, "lib/score-grid.js");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
