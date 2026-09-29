"use strict";

// Instrument kit: six audio-bound patterns in references/film-choreography/patterns.js.
// A recorder timeline feeds the real timeline probe and the real timeline gate, so this proves
// schedule-level seek safety and compatibility with the existing gates. It does not prove that a
// browser renders the tweens; that needs GSAP and Chrome.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const patterns = require("../skill/references/film-choreography/patterns.js");
const { probe } = require("../skill/references/film-choreography/timeline-probe.js");
const { checkTimeline, scanCompositionSource } = require("../skill/scripts/film-timeline-core.cjs");
const { checkStoryboard } = require("../skill/scripts/film-core.cjs");

const refs = path.join(__dirname, "../skill/references/film-choreography");
const registry = JSON.parse(fs.readFileSync(path.join(refs, "registry.json"), "utf8"));
const IDS = ["audio-meter", "event-scope", "tick-ticker", "grid-pulse", "build-countdown", "hold-then-hit"];
const PROPS = new Set(["clipPath", "backgroundColor", "color", "scale", "x", "y", "opacity", "innerText"]);
const OPTIONS = new Set(["duration", "ease", "immediateRender", "modifiers"]);
const FRAME = 1 / 30;
const codes = (result) => result.findings.map((finding) => finding.code);

// A mock GSAP timeline: records calls and exposes what the probe reads from real tweens.
function recorder() {
  const calls = [];
  const children = [];
  const add = (method, target, from, vars, position) => {
    calls.push({ method, target, from, vars, position });
    children.push({
      startTime: () => position,
      duration: () => vars.duration || 0,
      targets: () => [target],
      vars: from ? { ...vars, startAt: from } : vars,
      repeat: () => vars.repeat || 0,
    });
  };
  const tl = {
    set: (target, vars, position) => add("set", target, null, { ...vars, duration: 0 }, position),
    to: (target, vars, position) => add("to", target, null, vars, position),
    fromTo: (target, from, vars, position) => add("fromTo", target, from, vars, position),
  };
  const end = () => Math.max(0, ...calls.map((call) => call.position + (call.vars.duration || 0)));
  const root = (durationSec) => ({ duration: () => (durationSec === undefined ? end() : durationSec), timeScale: () => 1, getChildren: () => children });
  return { tl, calls, root };
}

function record(id, options) {
  const { tl, calls, root } = recorder();
  const end = patterns[id](tl, options);
  return { end, calls, root };
}

function rng(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

function every(step, from, until, strength = 1) {
  const hits = [];
  for (let t = from; t < until - 1e-9; t += step) hits.push({ atSec: Number(t.toFixed(3)), strength });
  return hits;
}

// Dense, unsorted, coincident hits from a fixed generator: times on a 20 ms grid (many
// coincident, many under one frame apart), shuffled, with random strengths.
function denseHits(seed, from, until, count) {
  const next = rng(seed);
  const hits = [];
  for (let i = 0; i < count; i += 1) hits.push({ atSec: Number((from + Math.round((next() * (until - from)) / 0.02) * 0.02).toFixed(3)), strength: Number(next().toFixed(3)) });
  hits.push(hits[0], hits[1], { atSec: from - 1 }, { atSec: until + 1 });
  for (let i = hits.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [hits[i], hits[j]] = [hits[j], hits[i]]; }
  return hits;
}

// ---------- the synthetic film: the golden shape of design.md section 7, all six kit patterns ----------

const cell = (i) => `#cell-${i}`;
const CELLS = Array.from({ length: 16 }, (_, i) => cell(i));
const COLUMNS = Array.from({ length: 12 }, (_, i) => `#col-${i}`);
const format = (value) => value.toFixed(2).padStart(5, "0");

function compose(tl) {
  patterns["tick-ticker"](tl, { target: "#log-a", hits: every(0.5, 0.5, 2), at: 0, until: 2, rowPx: 24, rows: 8 });
  patterns["hold-then-hit"](tl, { hit: 2, flash: "#flash", target: "#stage", zoom: 1, shakeFrames: 0, freeze: 0.5 });
  patterns["grid-pulse"](tl, { cells: CELLS, hits: every(0.5, 2, 10), at: 2, until: 10, rest: "#1e1e1e", lit: "#39d98a" });
  patterns["audio-meter"](tl, { target: "#load-bar", hits: every(0.5, 2, 10), at: 2, until: 10 });
  patterns["tick-ticker"](tl, { target: "#log-b", hits: every(0.25, 2.25, 10), at: 2, until: 10, rowPx: 24, rows: 40 });
  patterns["build-countdown"](tl, { target: "#timer", at: 10, until: 14, format, hits: [...every(0.5, 10, 12), ...every(0.25, 12, 13.5)], textColor: "#ebebeb", alert: "#ff5a3c" });
  patterns["tick-ticker"](tl, { target: "#log-c", hits: every(0.5, 10.5, 13.5), at: 10, until: 14, rowPx: 24, rows: 12 });
  patterns["hold-then-hit"](tl, { hit: 14, flash: "#flash", target: "#stage", seed: 3 });
  patterns["audio-meter"](tl, { target: "#thr-a", hits: every(0.5, 14, 20), at: 14, until: 20 });
  patterns["audio-meter"](tl, { target: "#thr-b", axis: "x", hits: every(1, 14.5, 20, 0.7), at: 14, until: 20 });
  patterns["event-scope"](tl, { columns: COLUMNS, hits: every(1, 20, 22), at: 20, until: 22 });
  patterns["hold-then-hit"](tl, { hit: 22, flash: "#flash", target: "#stage", zoom: 1, shakeFrames: 0, freeze: 0.5 });
  // The closing rule drifts through the last hold and ends the timeline at 24 s.
  tl.fromTo("#rule", { x: 0 }, { x: 30, duration: 1.9, ease: "power2.inOut", immediateRender: false }, 22.1);
}

function storyboard() {
  const beat = (id, startSec, endSec, extra) => ({
    id, startSec, endSec, role: "action", subject: `${id} instrument`, productAction: `The ${id} instrument answers the score`,
    transformation: { kind: "data-update", from: "idle instrument", to: "instrument answering the score" },
    handoff: "hard-cut", motion: ["audio-meter"], ...extra,
  });
  return {
    schema: "design-pipeline.film-storyboard.v1",
    id: "kit-synthetic-24s",
    durationSec: 24,
    fps: 30,
    grammar: "combination",
    benefit: "The canvas answers the music.",
    proofAction: "A node grid lights on the kick and a timer burns toward the drop.",
    reference: "reference.md#primary",
    sound: {
      mode: "scored",
      source: "synthetic click grid",
      usage: "internal",
      assets: [{ id: "score", license: "generated in this test", commercialUse: false, file: "assets/score.wav" }],
      cues: [
        { id: "music-in", atSec: 0, kind: "entry", note: "pad under the log" },
        { id: "groove-in", atSec: 2, kind: "downbeat", note: "kick enters" },
        { id: "build-riser", atSec: 10, kind: "riser", note: "snare roll" },
        { id: "drop-1", atSec: 14, kind: "impact", note: "the drop" },
        { id: "break-in", atSec: 20, kind: "silence", note: "drums out" },
        { id: "brand-hit", atSec: 22, kind: "accent", note: "one stab" },
        { id: "music-out", atSec: 24, kind: "exit", note: "ring out" },
      ],
    },
    beats: [
      beat("type-on-pad", 0, 2, { handoff: "open", soundCues: ["music-in"] }),
      beat("cells-on-kick", 2, 10, { soundCues: ["groove-in"] }),
      beat("countdown-build", 10, 14, { holdSec: 0.5, soundCues: ["build-riser"] }),
      beat("drop-impact", 14, 20, { soundCues: ["drop-1"] }),
      beat("break-settle", 20, 22, { holdSec: 0.6, soundCues: ["break-in"] }),
      { ...beat("brand", 22, 24, { holdSec: 0.6, soundCues: ["brand-hit", "music-out"] }), role: "brand-hold", transformation: { kind: "none" }, motion: ["fade-in"] },
    ],
  };
}

function tweenList(calls) {
  return calls.filter((call) => call.method !== "set" && (call.vars.duration || 0) > 0);
}

// Overlap check tighter than the gate's 1 ms: same target and property never overlap.
function assertNoOverlap(calls) {
  const tracks = new Map();
  for (const call of tweenList(calls)) {
    if (typeof call.target !== "string") continue;
    for (const key of Object.keys(call.vars).filter((name) => PROPS.has(name))) {
      const id = `${call.target}|${key}`;
      tracks.set(id, [...(tracks.get(id) || []), call]);
    }
  }
  for (const [id, list] of tracks) {
    list.sort((a, b) => a.position - b.position);
    for (let i = 1; i < list.length; i += 1) {
      const previousEnd = list[i - 1].position + list[i - 1].vars.duration;
      assert.ok(list[i].position >= previousEnd - 1e-9, `${id} overlaps at ${list[i].position} (previous ends ${previousEnd})`);
    }
  }
}

function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") for (const key of Object.keys(value)) strings(value[key], out);
  return out;
}

// ---------- the kit against the real probe and gate ----------

test("the six kit patterns pass the real probe and the timeline gate on the golden-shaped film", () => {
  const board = storyboard();
  const storyboardResult = checkStoryboard(board);
  assert.deepEqual(storyboardResult.findings, [], "the synthetic storyboard is itself clean");
  const { tl, calls, root } = recorder();
  compose(tl);
  const manifest = probe(root(), "main");
  assert.equal(manifest.durationSec, 24);
  const result = checkTimeline(manifest, board);
  assert.deepEqual(result.findings, []);
  assert.equal(result.status, "passed");
  assert.equal(result.metrics.fadeOnlyActionBeats, 0);
  assert.equal(result.metrics.staticActionBeats, 0);
  assert.ok(calls.length > 300, "hits x lanes produces hundreds of tweens");
  assertNoOverlap(calls);
});

test("every kit tween uses the property whitelist, fromTo with explicit endpoints, and an absolute position", () => {
  const { tl, calls } = recorder();
  compose(tl);
  const properties = new Set();
  for (const call of calls) {
    assert.equal(typeof call.position, "number", "every call has an absolute position");
    assert.ok(Number.isFinite(call.position) && call.position >= 0);
    const { duration, ...rest } = call.vars;
    const own = Object.keys(rest).filter((key) => !OPTIONS.has(key));
    for (const key of [...own, ...Object.keys(call.from || {})]) { assert.ok(PROPS.has(key), `${key} is on the whitelist`); properties.add(key); }
    for (const key of Object.keys(call.vars)) assert.ok(PROPS.has(key) || OPTIONS.has(key), `${key} is a property or an allowed option`);
    assert.equal(call.vars.repeat, undefined);
    assert.equal(call.vars.delay, undefined);
    assert.equal(call.vars.onComplete, undefined);
    if (call.method === "fromTo") {
      assert.equal(call.vars.immediateRender, false, "fromTo carries immediateRender: false");
      assert.deepEqual(Object.keys(call.from).sort(), own.sort(), "explicit start for every animated property");
      assert.ok(duration > 0, "a fromTo lasts");
    } else if (call.method === "set") {
      assert.equal(call.vars.duration, 0);
    } else {
      // The only `to` tweens: the countdown and its no-op hold.
      assert.ok(call.target === "#timer" || (typeof call.target === "object" && Object.keys(call.target).length === 0), `${call.method} on ${JSON.stringify(call.target)}`);
    }
  }
  assert.deepEqual([...properties].sort(), [...PROPS].sort(), "the golden film exercises the whole whitelist");
});

test("the probe treats modifiers as configuration, so a counter cannot hide a fade-only beat", () => {
  const tween = (vars, from) => ({ startTime: () => 0, duration: () => 1, targets: () => ["#n"], vars: from ? { ...vars, startAt: from } : vars, repeat: () => 0 });
  const root = { duration: () => 1, timeScale: () => 1, getChildren: () => [tween({ opacity: 1, duration: 1, modifiers: { opacity: (v) => v } }, { opacity: 0 })] };
  assert.deepEqual(probe(root, "main").tweens[0].props, ["opacity"]);
  const { calls, root: recorded } = (() => { const r = recorder(); patterns["build-countdown"](r.tl, { target: "#timer", at: 0, until: 2, format }); return r; })();
  assert.ok(calls.length > 0);
  assert.deepEqual(probe(recorded(), "main").tweens.filter((entry) => entry.targets[0] === "#timer").map((entry) => entry.props), [["innerText"]]);
});

// ---------- lane rule ----------

const LANE_WINDOW = { at: 2, until: 10 };

test("meter lanes: dense, unsorted and coincident hits give no overlap, attacks on hits, releases ended by the next hit", () => {
  for (const seed of [1, 2, 3, 4]) {
    const hits = denseHits(seed, LANE_WINDOW.at, LANE_WINDOW.until, 400);
    const { calls } = record("audio-meter", { target: "#m", hits, ...LANE_WINDOW });
    assertNoOverlap(calls);
    const rest = calls.find((call) => call.method === "set");
    assert.equal(rest.position, LANE_WINDOW.at);
    const attacks = calls.filter((call) => call.method === "fromTo" && call.from.clipPath === rest.vars.clipPath);
    const releases = calls.filter((call) => call.method === "fromTo" && call.vars.clipPath === rest.vars.clipPath);
    assert.ok(attacks.length > 20, "a dense list still yields many attacks");
    const inputTimes = new Set(hits.map((hit) => Number(hit.atSec.toFixed(3))));
    const kept = attacks.map((attack) => attack.position);
    assert.deepEqual(kept, [...kept].sort((a, b) => a - b));
    for (const time of kept) assert.ok(inputTimes.has(time), `attack at ${time} sits on an input hit`);
    for (let i = 1; i < kept.length; i += 1) assert.ok(kept[i] - kept[i - 1] >= FRAME - 0.0006, `kept hits are at least a frame apart (${kept[i - 1]}, ${kept[i]})`);
    assert.ok(LANE_WINDOW.until - kept[kept.length - 1] >= FRAME - 0.0006, "the last kept hit is a frame before until");
    // Every dropped in-window hit is under a frame after a kept hit or under a frame before until.
    for (const time of inputTimes) {
      if (time < LANE_WINDOW.at || time >= LANE_WINDOW.until || kept.includes(time)) continue;
      assert.ok(LANE_WINDOW.until - time < FRAME || kept.some((k) => k <= time && time - k < FRAME), `${time} was dropped without a reason`);
    }
    kept.forEach((time, index) => {
      const next = index + 1 < kept.length ? kept[index + 1] : LANE_WINDOW.until;
      const attack = attacks[index];
      assert.ok(attack.vars.duration >= FRAME - 0.0006, "an attack lasts about a frame or more");
      const release = releases.find((entry) => Math.abs(entry.position - (time + attack.vars.duration)) < 1e-9);
      const end = release ? release.position + release.vars.duration : time + attack.vars.duration;
      assert.ok(end <= next + 1e-9, `lane at ${time} ends at ${end}, after the next hit ${next}`);
    });
    const gate = checkTimeline(probe(recordedRoot(calls), "main"), storyboard());
    assert.ok(!codes(gate).includes("property-conflict"), JSON.stringify(gate.findings));
  }
});

function recordedRoot(calls) {
  const children = calls.map((call) => ({ startTime: () => call.position, duration: () => call.vars.duration || 0, targets: () => [call.target], vars: call.from ? { ...call.vars, startAt: call.from } : call.vars, repeat: () => 0 }));
  return { duration: () => 24, timeScale: () => 1, getChildren: () => children };
}

test("event-scope and grid-pulse lanes stay overlap-free and inside the window under dense hits", () => {
  for (const seed of [5, 6, 7]) {
    const hits = denseHits(seed, LANE_WINDOW.at, LANE_WINDOW.until, 300);
    for (const [id, extra] of [
      ["event-scope", { columns: COLUMNS }],
      ["grid-pulse", { cells: CELLS, rest: "#1e1e1e", lit: "#39d98a", perHit: 0.5 }],
    ]) {
      const { calls } = record(id, { hits, ...LANE_WINDOW, ...extra });
      assertNoOverlap(calls);
      for (const call of tweenList(calls)) {
        assert.ok(call.position >= LANE_WINDOW.at && call.position + call.vars.duration <= LANE_WINDOW.until + 1e-9, `${id} tween ${call.position} + ${call.vars.duration} leaves the window`);
      }
      const gate = checkTimeline(probe(recordedRoot(calls), "main"), storyboard());
      assert.ok(!codes(gate).includes("property-conflict"), `${id}: ${JSON.stringify(gate.findings)}`);
    }
  }
});

test("a lane truncates the release at the next hit and attack below one frame throws", () => {
  const { calls } = record("audio-meter", { target: "#m", hits: [{ atSec: 1 }, { atSec: 1.2 }, { atSec: 2 }], at: 0, until: 3 });
  const tweens = tweenList(calls);
  // hit 1.0: attack 0.05, release truncated to 1.2 - 1.05 = 0.15 (default 0.35); hit 1.2: attack, release 0.35.
  assert.deepEqual(tweens.map((call) => [call.position, call.vars.duration]), [[1, 0.05], [1.05, 0.15], [1.2, 0.05], [1.25, 0.35], [2, 0.05], [2.05, 0.35]]);
  const tight = record("audio-meter", { target: "#m", hits: [{ atSec: 1 }, { atSec: 1.04 }], at: 0, until: 3 });
  assert.deepEqual(tweenList(tight.calls).map((call) => [call.position, call.vars.duration]).slice(0, 2), [[1, 0.04], [1.04, 0.05]], "an attack is truncated at the next hit when it is under the attack time");
  assert.throws(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: [], at: 0, until: 3, attack: 0.03 }), /attack must be at least one frame/);
  assert.doesNotThrow(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: [], at: 0, until: 3, attack: 1 / 30 }));
  assert.doesNotThrow(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: [], at: 0, until: 3, attack: 0.04, fps: 60 }));
  assert.throws(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: [], at: 0, until: 3, attack: 0.04, fps: 24 }), /attack must be at least one frame/, "the frame rate sets the floor");
  const lastGuard = record("audio-meter", { target: "#m", hits: [{ atSec: 1 }, { atSec: 2.99 }], at: 0, until: 3 });
  assert.deepEqual(lastGuard.calls.filter((call) => call.method === "fromTo" && call.position > 2).length, 0, "a hit under a frame before until is dropped");
});

test("hits outside [at, until) are ignored and a hit list is validated", () => {
  const { calls } = record("audio-meter", { target: "#m", hits: [{ atSec: 0.5 }, { atSec: 1 }, { atSec: 3 }, { atSec: 4 }], at: 1, until: 3 });
  assert.deepEqual(tweenList(calls).map((call) => call.position), [1, 1.05]);
  assert.throws(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: [{ atSec: "1" }], at: 0, until: 3 }), /hits\[0\] needs a finite atSec/);
  assert.throws(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: "x", at: 0, until: 3 }), /hits must be an array/);
  assert.throws(() => patterns["audio-meter"](recorder().tl, { target: "#m", hits: [], at: 3, until: 3 }), /until must be a number of seconds after at/);
});

// ---------- formatting, colour guard, determinism ----------

test("no emitted string carries a trailing .0, and clip paths are written the way GSAP interpolates them", () => {
  const { tl, calls } = recorder();
  compose(tl);
  patterns["audio-meter"](tl, { target: "#odd", hits: denseHits(9, 0, 5, 60), at: 0, until: 5, floor: 0.1, axis: "x" });
  patterns["audio-meter"](tl, { target: "#odd2", hits: denseHits(10, 0, 5, 60), at: 0, until: 5, floor: 0.15 });
  const all = strings(calls.map((call) => [call.from, call.vars]));
  assert.ok(all.length > 100);
  for (const value of all) assert.ok(!/\d\.0(?!\d)/.test(value), `trailing .0 in ${value}`);
  const { calls: plain } = record("audio-meter", { target: "#m", hits: [{ atSec: 1, strength: 1 }], at: 0, until: 3, floor: 0.15 });
  assert.equal(plain[0].vars.clipPath, "inset(85% 0% 0% 0%)", "85, not 85.0");
  assert.equal(plain[1].vars.clipPath, "inset(0% 0% 0% 0%)");
  const x = record("audio-meter", { target: "#m", axis: "x", hits: [{ atSec: 1, strength: 0.5 }], at: 0, until: 3, floor: 0.1 });
  assert.deepEqual(x.calls.filter((call) => call.method === "fromTo")[0].vars.clipPath, "inset(0% 45% 0% 0%)");
  assert.equal(x.calls[0].vars.clipPath, "inset(0% 90% 0% 0%)");
});

test("colour options are literals; a var() colour throws with the fix", () => {
  const base = { cells: ["#a", "#b"], hits: [{ atSec: 1 }], at: 0, until: 3, rest: "#1e1e1e", lit: "#f5f5f5" };
  assert.throws(() => patterns["grid-pulse"](recorder().tl, { ...base, lit: "var(--fk-accent)" }), /lit is var\(--fk-accent\), a var\(\) colour.*Fix: pass the literal from the STYLE table/s);
  assert.throws(() => patterns["grid-pulse"](recorder().tl, { ...base, rest: " VAR(--fk-rest)" }), /rest is/);
  assert.throws(() => patterns["grid-pulse"](recorder().tl, { ...base, lit: 12 }), /lit must be a literal colour string/);
  const countdown = { target: "#t", at: 0, until: 3, format };
  assert.throws(() => patterns["build-countdown"](recorder().tl, { ...countdown, textColor: "var(--fk-text)", alert: "#ff0000" }), /textColor is var/);
  assert.throws(() => patterns["build-countdown"](recorder().tl, { ...countdown, textColor: "#eeeeee", alert: "var(--fk-alert)" }), /alert is var/);
  assert.throws(() => patterns["build-countdown"](recorder().tl, { ...countdown, textColor: "#eeeeee" }), /given together/);
  assert.doesNotThrow(() => patterns["grid-pulse"](recorder().tl, { ...base, lit: "rgb(245, 245, 245)" }));
});

test("identical inputs give identical tweens and the seed changes the choice", () => {
  const dump = (id, options) => JSON.stringify(record(id, options).calls, (_key, value) => (typeof value === "function" ? String(value) : value));
  const grid = { cells: CELLS, hits: every(0.5, 2, 10), at: 2, until: 10, rest: "#1e1e1e", lit: "#39d98a" };
  assert.equal(dump("grid-pulse", { ...grid, seed: 4 }), dump("grid-pulse", { ...grid, seed: 4 }));
  assert.notEqual(dump("grid-pulse", { ...grid, seed: 4 }), dump("grid-pulse", { ...grid, seed: 5 }));
  const hit = { hit: 14, flash: "#f", target: "#s" };
  assert.equal(dump("hold-then-hit", { ...hit, seed: 2 }), dump("hold-then-hit", { ...hit, seed: 2 }));
  assert.notEqual(dump("hold-then-hit", { ...hit, seed: 2 }), dump("hold-then-hit", { ...hit, seed: 3 }));
  for (const id of IDS) assert.equal(patterns[id].length, 2, `${id} takes (tl, options)`);
  const lit = record("grid-pulse", grid).calls.filter((call) => call.method === "fromTo" && call.from.backgroundColor === "#1e1e1e");
  const perHit = new Map();
  for (const call of lit) perHit.set(call.position, (perHit.get(call.position) || 0) + 1);
  assert.equal(perHit.size, 16, "every hit lights cells");
  for (const count of perHit.values()) assert.equal(count, 4, "a quarter of 16 cells per hit");
});

test("grid-pulse gives each hit its own cells; event-scope shifts and decays each column", () => {
  const { calls } = record("event-scope", { columns: ["#c0", "#c1", "#c2"], hits: [{ atSec: 1 }], at: 0, until: 5, travel: 1.2, decay: 0.5, floor: 0 });
  const attacks = calls.filter((call) => call.method === "fromTo" && call.from.clipPath === "inset(100% 0% 0% 0%)");
  assert.deepEqual(attacks.map((call) => [call.target, call.position, call.vars.clipPath]), [["#c0", 1, "inset(0% 0% 0% 0%)"], ["#c1", 1.4, "inset(50% 0% 0% 0%)"], ["#c2", 1.8, "inset(75% 0% 0% 0%)"]]);
  assert.throws(() => patterns["event-scope"](recorder().tl, { columns: ".fk-scope__col", hits: [], at: 0, until: 1 }), /columns must list one selector or element per item/);
  assert.throws(() => patterns["grid-pulse"](recorder().tl, { cells: [], hits: [], at: 0, until: 1, rest: "#000", lit: "#fff" }), /cells must list/);
});

// ---------- tick-ticker ----------

test("tick-ticker steps one row per hit, truncated at the next hit, and throws when hits exceed rows", () => {
  const { calls } = record("tick-ticker", { target: "#log", hits: [{ atSec: 1 }, { atSec: 1.04 }, { atSec: 2 }], at: 0, until: 3, rowPx: 24, rows: 3 });
  assert.deepEqual(calls[0].vars, { y: 0, duration: 0 });
  assert.deepEqual(tweenList(calls).map((call) => [call.position, call.from.y, call.vars.y, call.vars.duration]), [[1, 0, -24, 0.04], [1.04, -24, -48, 0.06], [2, -48, -72, 0.06]]);
  assert.throws(() => patterns["tick-ticker"](recorder().tl, { target: "#log", hits: every(0.5, 0, 3), at: 0, until: 3, rowPx: 24, rows: 3 }), /6 hits in the window but only 3 rows/);
  assert.throws(() => patterns["tick-ticker"](recorder().tl, { target: "#log", hits: [], at: 0, until: 3, rowPx: 24, step: 0.02 }), /step must be at least one frame/);
  assert.doesNotThrow(() => patterns["tick-ticker"](recorder().tl, { target: "#log", hits: every(0.5, 0, 3), at: 0, until: 3, rowPx: 24 }), "rows is optional");
});

// ---------- build-countdown ----------

test("build-countdown is one to tween with a custom ease, a formatter and an explicit hold; no start option", () => {
  const hits = [...every(0.5, 10, 12), ...every(0.25, 12, 13.5)];
  const { calls, end } = record("build-countdown", { target: "#timer", at: 10, until: 14, format, hits, textColor: "#ebebeb", alert: "#ff5a3c" });
  assert.equal(end, 14);
  assert.deepEqual(calls.map((call) => [call.method, call.position, call.vars.duration]), [["to", 10, 3.5], ["fromTo", 10, 3.5], ["to", 13.5, 0.5]]);
  const [count, tint, hold] = calls;
  assert.equal(count.target, "#timer");
  assert.equal(count.vars.innerText, 0, "counts to zero from the element's own static text");
  assert.equal(typeof count.vars.ease, "function");
  assert.deepEqual(Object.keys(count.vars.modifiers), ["innerText"]);
  assert.equal(count.vars.immediateRender, false);
  assert.deepEqual([tint.from, tint.vars.color], [{ color: "#ebebeb" }, "#ff5a3c"]);
  assert.deepEqual(hold.target, {}, "the hold is a driver no-op like camera-follow");
  assert.equal(count.position + count.vars.duration, hold.position, "the count reaches zero where the freeze begins");
  assert.equal(hold.position + hold.vars.duration, end, "the handoff time includes the freeze");
  const format2 = count.vars.modifiers.innerText;
  assert.equal(format2(8), "08.00");
  assert.equal(format2("4.7349"), "04.73");
  assert.equal(format2(-0.0000001), "00.00", "a rounding undershoot never prints a minus");
  const ignored = record("build-countdown", { target: "#timer", at: 10, until: 14, format, hits, start: 99 });
  assert.equal(ignored.calls.length, 2, "there is no start option: a stray start adds nothing");
  assert.equal(record("build-countdown", { target: "#timer", at: 10, until: 14, format, freeze: 0 }).calls.length, 1, "no freeze, no hold");
  assert.throws(() => patterns["build-countdown"](recorder().tl, { target: "#t", at: 10, until: 10.5, format }), /leaves 0 s before the 0.5 s freeze/);
  assert.throws(() => patterns["build-countdown"](recorder().tl, { target: "#t", at: 10, until: 14, format: "%d" }), /format must be a function/);
});

test("build-countdown ease: 0 to 0, 1 to 1, never decreasing, steepening, and every hit bites", () => {
  const hits = [...every(0.5, 10, 12), ...every(0.25, 12, 13.5)];
  for (const options of [{}, { hits }, { hits: denseHits(11, 10, 13.5, 200) }, { hits, curve: 3, bite: 0.6 }, { hits: [{ atSec: 11, strength: 0 }] }]) {
    const { calls } = record("build-countdown", { target: "#timer", at: 10, until: 14, format, ...options });
    const ease = calls[0].vars.ease;
    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    let previous = 0;
    for (let i = 0; i <= 2000; i += 1) {
      const value = ease(i / 2000);
      assert.ok(value >= previous - 1e-12 && value >= 0 && value <= 1, `ease decreases at ${i / 2000}: ${previous} -> ${value}`);
      previous = value;
    }
    const start = 8;
    const shown = (p) => start * (1 - ease(p));
    assert.equal(shown(1), 0, "zero at the end of the window, which is until - freeze");
  }
  const plain = record("build-countdown", { target: "#timer", at: 10, until: 14, format }).calls[0].vars.ease;
  assert.ok(Math.abs(plain(0.5) - 0.5 ** 1.9) < 1e-12, "without hits the share is p^curve");
  assert.ok(plain(0.9) - plain(0.8) > plain(0.2) - plain(0.1), "the burn steepens");
  // Two hits: at 11 s (progress 1/3.5) and 12 s; the ease jumps by bite * share right at each hit.
  const two = record("build-countdown", { target: "#timer", at: 10, until: 14, format, hits: [{ atSec: 11 }, { atSec: 12 }], bite: 0.4 }).calls[0].vars.ease;
  const q = 1 / 3.5;
  assert.ok(Math.abs(two(q + 1e-9) - two(q - 1e-9) - 0.4 * 0.5) < 1e-6, "the first hit bites its share of the bite");
  const q2 = 2 / 3.5;
  assert.ok(Math.abs(two(q2 + 1e-9) - two(q2 - 1e-9) - 0.4 * 0.5) < 1e-6, "the second hit bites the rest");
  const weighted = record("build-countdown", { target: "#timer", at: 10, until: 14, format, hits: [{ atSec: 11, strength: 1 }, { atSec: 12, strength: 0.25 }], bite: 0.4 }).calls[0].vars.ease;
  assert.ok(Math.abs(weighted(q + 1e-9) - weighted(q - 1e-9) - 0.4 * 0.8) < 1e-6, "strength weights the bite");
});

// ---------- hold-then-hit ----------

test("hold-then-hit: overlay zero at time 0, one-frame flash, zoom punch, a shake of one-frame steps", () => {
  const { calls, end } = record("hold-then-hit", { hit: 14, flash: "#flash", target: "#stage", seed: 3 });
  assert.equal(end, 14.4);
  assert.deepEqual([calls[0].method, calls[0].target, calls[0].vars.opacity, calls[0].position], ["set", "#flash", 0, 0]);
  const flash = calls[1];
  assert.deepEqual([flash.from, flash.vars.opacity, flash.position, flash.vars.duration], [{ opacity: 1 }, 0, 14, 0.033]);
  const scale = calls.filter((call) => call.target === "#stage" && "scale" in call.vars);
  assert.deepEqual(scale.map((call) => [call.from.scale, call.vars.scale, call.position]), [[1, 1.06, 14], [1.06, 1, 14.033]]);
  assert.ok(Math.abs(scale[1].position + scale[1].vars.duration - 14.4) < 1e-9, "the zoom releases exactly at hit + 0.4");
  const shake = calls.filter((call) => call.target === "#stage" && "x" in call.vars);
  assert.equal(shake.length, 8, "shakeFrames one-frame steps");
  let x = 0;
  let y = 0;
  shake.forEach((step, k) => {
    assert.deepEqual(step.from, { x, y }, "each step starts where the last ended");
    assert.ok(Math.abs(step.position - (14 + k / 30)) < 0.0006, "one frame per step");
    assert.equal(step.vars.ease, "none");
    assert.ok(Math.abs(step.vars.x) <= 12 && Math.abs(step.vars.y) <= 12);
    x = step.vars.x;
    y = step.vars.y;
  });
  assert.deepEqual([x, y], [0, 0], "the wrapper comes to rest");
  assert.ok(shake.some((step) => step.vars.x !== 0 || step.vars.y !== 0), "and it actually moves");
  assert.ok(shake[0].position + 8 / 30 <= 14.4 + 0.001);
  assertNoOverlap(calls);
});

test("hold-then-hit with zoom 1 and shakeFrames 0 is a flash-only accent; the freeze holds no tween", () => {
  const { calls } = record("hold-then-hit", { hit: 10, flash: "#flash", target: "#stage", zoom: 1, shakeFrames: 0 });
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.target === "#flash"), "the wrapper is untouched");
  const full = record("hold-then-hit", { hit: 14, flash: "#flash", target: "#stage", freeze: 0.5 });
  assert.ok(full.calls.filter((call) => call.position > 0).every((call) => call.position >= 14), "nothing starts in [hit - freeze, hit)");
  assert.equal(full.calls.filter((call) => call.position === 0).length, 1, "only the overlay rest state sits before the hit");
  assert.throws(() => patterns["hold-then-hit"](recorder().tl, { hit: 0.2, flash: "#f", target: "#s" }), /earlier than freeze/);
  assert.throws(() => patterns["hold-then-hit"](recorder().tl, { hit: 5, flash: "#f", target: "#s", shakeFrames: 13 }), /do not fit in 0.4 s/);
});

// ---------- registry documentation ----------

test("the registry documents every instrument, and required names make the pattern throw", () => {
  const entries = registry.patterns.filter((entry) => entry.kind === "instrument");
  assert.deepEqual(entries.map((entry) => entry.id).sort(), [...IDS].sort());
  const samples = {
    "audio-meter": { target: "#m", hits: every(0.5, 1, 3), at: 1, until: 3 },
    "event-scope": { columns: ["#c0", "#c1"], hits: every(0.5, 1, 3), at: 1, until: 3 },
    "tick-ticker": { target: "#log", hits: every(0.5, 1, 3), at: 1, until: 3, rowPx: 24 },
    "grid-pulse": { cells: ["#g0", "#g1"], hits: every(0.5, 1, 3), at: 1, until: 3, rest: "#111111", lit: "#eeeeee" },
    "build-countdown": { target: "#t", hits: every(0.5, 1, 3), at: 1, until: 3, format },
    "hold-then-hit": { hit: 2, flash: "#f", target: "#s" },
  };
  for (const entry of entries) {
    const id = entry.id;
    assert.equal(typeof patterns[id], "function");
    assert.deepEqual(entry.grammar, ["combination", "product-demonstration"], id);
    assert.equal(entry.transformation, id === "hold-then-hit" ? "state-change" : "data-update", id);
    assert.equal(entry.handoff, id === "hold-then-hit" ? "hard-cut" : "continuation", id);
    for (const field of ["audio", "markup", "productRole", "use"]) assert.ok(typeof entry[field] === "string" && entry[field].length > 20, `${id}.${field}`);
    for (const field of ["animates", "required", "optional"]) assert.ok(Array.isArray(entry[field]) && entry[field].every((name) => typeof name === "string"), `${id}.${field}`);
    assert.ok(entry.animates.length > 0 && entry.animates.every((name) => PROPS.has(name)), `${id}.animates is on the whitelist`);
    assert.ok(entry.required.length > 0);
    assert.deepEqual(entry.required.filter((name) => entry.optional.includes(name)), [], `${id}: an option is required or optional, not both`);
    assert.ok(/fk-/.test(entry.markup), `${id}.markup names chrome classes`);

    // The documented names are exactly the options the pattern reads.
    const read = new Set();
    const spy = new Proxy({ ...samples[id] }, { get: (target, key) => { if (typeof key === "string") read.add(key); return target[key]; } });
    patterns[id](recorder().tl, spy);
    assert.deepEqual([...read].sort(), [...entry.required, ...entry.optional].sort(), `${id}: documented options equal the options read`);

    // Every required name is enforced; the emitted properties are the documented ones.
    for (const name of entry.required) {
      const { [name]: _dropped, ...rest } = samples[id];
      assert.throws(() => patterns[id](recorder().tl, rest), new RegExp(`${id}: missing option ${name}`), `${id} requires ${name}`);
    }
    const emitted = new Set(recordAll(id, samples[id]).flatMap((call) => Object.keys(call.vars).filter((key) => PROPS.has(key))));
    assert.deepEqual([...emitted].sort(), [...entry.animates].sort(), `${id}: animates lists the tweened properties`);
  }
});

function recordAll(id, options) {
  const extra = id === "build-countdown" ? { textColor: "#eeeeee", alert: "#ff0000" } : {};
  return record(id, { ...options, ...extra }).calls;
}

test("the registry documents the audio adapter and the chrome", () => {
  const [helper, ...more] = registry.helpers;
  assert.equal(more.length, 0);
  assert.deepEqual([helper.id, helper.file, helper.global], ["audio-events", "audio-events.js", "FilmAudio"]);
  for (const name of ["fromScoreGrid", "fromAnalysis", "hits", "beats", "bar", "hash"]) assert.ok(helper.api.includes(name), name);
  assert.ok(fs.existsSync(path.join(refs, helper.file)));
  const chrome = registry.chrome;
  assert.equal(chrome.prefix, "fk-");
  assert.equal(chrome.file, "instrument-chrome.css");
  assert.deepEqual(chrome.properties.map((entry) => entry.name), ["--fk-ink", "--fk-line", "--fk-text", "--fk-rest", "--fk-accent", "--fk-alert", "--fk-font-label", "--fk-font-data", "--fk-font-display", "--fk-unit", "--fk-stroke", "--fk-radius", "--fk-row", "--fk-cols"]);
  const defaults = Object.fromEntries(chrome.properties.map((entry) => [entry.name, entry.default]));
  assert.deepEqual([defaults["--fk-ink"], defaults["--fk-line"], defaults["--fk-text"], defaults["--fk-rest"], defaults["--fk-accent"], defaults["--fk-alert"]], ["#111111", "#707070", "#ebebeb", "#1e1e1e", "#f5f5f5", "#ffffff"]);
  assert.equal(defaults["--fk-font-display"], "var(--fk-font-data)");
  assert.equal(defaults["--fk-row"], "24px");
  for (const entry of chrome.properties) assert.ok(entry.role && typeof entry.default === "string", entry.name);
  assert.equal(chrome.recipes.length, 25);
  assert.equal(new Set(chrome.recipes.map((recipe) => recipe.class)).size, 25);
  for (const recipe of chrome.recipes) assert.ok(/^fk-[a-z]+(__[a-z]+)?(--[a-z]+)?$/.test(recipe.class) && recipe.role && recipe.serves, recipe.class);
  const classes = new Set(chrome.recipes.map((recipe) => recipe.class));
  for (const entry of registry.patterns.filter((pattern) => pattern.kind === "instrument")) {
    for (const name of entry.markup.match(/fk-[a-z_-]+/g)) assert.ok(classes.has(name), `${entry.id} markup names ${name}, which chrome.recipes does not list`);
  }
  for (const recipe of chrome.recipes) assert.ok([...IDS, "annotation", "every instrument"].includes(recipe.serves), `${recipe.class} serves ${recipe.serves}`);
});

// ---------- source scan and the existing parity ----------

test("patterns.js reports nothing to the composition source scan", () => {
  const scan = scanCompositionSource([{ file: "index.html", html: '<script src="patterns.js"></script>' }], { root: refs });
  assert.deepEqual(scan.findings, []);
  assert.deepEqual(scan.scriptFiles, ["patterns.js"], "the scan read the file");
  assert.deepEqual(scan.unscanned, []);
});
