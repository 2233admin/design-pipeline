/* canvas-instrument-24s: the reference composition build (UMD).
 *
 * Appends the six plates of storyboard.json to a paused GSAP timeline with the instrument kit and
 * ends the timeline at exactly 24 s. Everything it needs comes in through `context`, so the same
 * function runs in index.html (globals) and in a Node test (a recorder timeline):
 *
 *   build(tl, { FilmPatterns, FilmAudio, audio, GROUND })
 *     FilmPatterns  lib/patterns.js       the kit
 *     FilmAudio     lib/audio-events.js   the adapter
 *     audio         FilmAudio.fromScoreGrid()
 *     GROUND        the per-section colour tables of index.html (literals: the kit cannot read var())
 *
 * Voices are selectors over the score grid (sound, note range, step length, gain), see sound.md.
 * Each animated (target, property) belongs to exactly one instrument. Nothing here reads a clock
 * or a random number; the shake and the cell choice are hash(seed, index) inside the kit.
 */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CanvasInstrumentBuild = api;
})(typeof self === "undefined" ? this : self, () => {
  "use strict";

  const DURATION = 24;

  const ids = (prefix, count) => Array.from({ length: count }, (_, index) => `#${prefix}${index}`);

  function build(tl, context) {
    const { FilmPatterns: P, FilmAudio: A, audio, GROUND: G } = context;
    const bar = (k, count) => A.bar(audio, k, count);

    // ---- voices (sound.md, "Voices") ----
    const kick = (from, to) => A.hits(audio, { sound: "sine", midiMax: "b1", from, to });
    const clap = (from, to) => A.hits(audio, { sound: "white", gainMin: 0.2, from, to });
    const hat = (from, to) => A.hits(audio, { sound: "white", durMax: 0.3, from, to });
    const snare = (from, to) => A.hits(audio, { sound: "pink", from, to });
    const pulse = (from, to) => A.hits(audio, { sound: "square", durMax: 0.6, from, to });
    const bass = (from, to) => A.hits(audio, { sound: "sawtooth", midiMax: "c3", durMax: 0.5, from, to });
    const swell = (from, to) => A.hits(audio, { sound: "triangle", from, to });

    // ---- 1 type-on-pad: bar 1, intro. The prompt node's log answers the beat ticks. ----
    const intro = bar(1);
    P["tick-ticker"](tl, { target: "#intro-log-col", hits: A.beats(audio, { from: intro.from, to: intro.to }), at: intro.from, until: intro.to, rowPx: 96, rows: 4 });

    // ---- 2 cells-on-kick: bars 2-5, groove. A node graph: the kick fires the generation node and its input
    //      wire, the clap routes signal along the queue wire, the hats along the log wire. ----
    const groove = bar(2, 4);
    P["grid-pulse"](tl, { cells: ids("cell", 24), hits: kick(groove.from, groove.to), at: groove.from, until: groove.to, rest: G.groove.rest, lit: G.groove.accent, perHit: 0.25, seed: 7 });
    P["audio-meter"](tl, { target: "#w1-bar", hits: kick(groove.from, groove.to), at: groove.from, until: groove.to, axis: "x", floor: 0 });
    P["audio-meter"](tl, { target: "#queue-bar", hits: clap(groove.from, groove.to), at: groove.from, until: groove.to, axis: "x", floor: 0.12 });
    P["audio-meter"](tl, { target: "#w2-bar", hits: clap(groove.from, groove.to), at: groove.from, until: groove.to, axis: "x", floor: 0 });
    P["tick-ticker"](tl, { target: "#jobs-col", hits: hat(groove.from, groove.to), at: groove.from, until: groove.to, rowPx: 44, rows: 32 });
    P["audio-meter"](tl, { target: "#w3-bar", hits: hat(groove.from, groove.to), at: groove.from, until: groove.to, axis: "x", floor: 0 });

    // ---- 3 countdown-build: bars 6-7, build. The last beat (0.5 s) is silent and still. ----
    const built = bar(6, 2);
    const freeze = 0.5;
    const stillFrom = built.to - freeze;
    P["build-countdown"](tl, {
      target: "#count-value", hits: snare(built.from, stillFrom), at: built.from, until: built.to, freeze,
      format: (value) => value.toFixed(2).padStart(5, "0"), textColor: G.build.text, alert: G.build.alert,
    });
    P["audio-meter"](tl, { target: "#depth-bar", hits: pulse(built.from, stillFrom), at: built.from, until: stillFrom, floor: 0.1 });
    P["audio-meter"](tl, { target: "#w4-bar", hits: pulse(built.from, stillFrom), at: built.from, until: stillFrom, axis: "x", floor: 0 });
    P["tick-ticker"](tl, { target: "#render-col", hits: A.beats(audio, { from: built.from, to: stillFrom }), at: built.from, until: stillFrom, rowPx: 56, rows: 7 });

    // ---- 4 drop-impact: bars 8-10, drop. The finished strip node takes the impact; frames light on the kick;
    //      the clap and the bass send signal up the wires from two throughput nodes. ----
    const drop = bar(8, 3);
    P["hold-then-hit"](tl, { hit: drop.from, flash: "#drop-flash", target: "#drop-stage", freeze, zoom: 1.08, shake: 18, shakeFrames: 8, seed: 3 });
    P["grid-pulse"](tl, { cells: ids("frame", 4), hits: kick(drop.from, drop.to), at: drop.from, until: drop.to, rest: G.drop.rest, lit: G.drop.accent, perHit: 0.25, seed: 11, peakScale: 1.05 });
    P["audio-meter"](tl, { target: "#clap-bar", hits: clap(drop.from, drop.to), at: drop.from, until: drop.to, axis: "x", floor: 0.12 });
    P["audio-meter"](tl, { target: "#bass-bar", hits: bass(drop.from, drop.to), at: drop.from, until: drop.to, axis: "x", floor: 0.12 });
    P["audio-meter"](tl, { target: "#wa-bar", hits: clap(drop.from, drop.to), at: drop.from, until: drop.to, axis: "y", floor: 0 });
    P["audio-meter"](tl, { target: "#wb-bar", hits: bass(drop.from, drop.to), at: drop.from, until: drop.to, axis: "y", floor: 0 });

    // ---- 5 break-settle: bar 11, break. Drums out: a pulse travels across the trace, a slow drift, then stillness. ----
    const brk = bar(11);
    const hold = 0.6;
    const settled = brk.to - hold;
    P["event-scope"](tl, { columns: ids("trace", 24), hits: swell(brk.from, settled), at: brk.from, until: settled, travel: 0.6, decay: 0.97, floor: 0.1 });
    tl.fromTo("#trace-frame", { y: 0 }, { y: -16, duration: settled - brk.from, ease: "power1.out", immediateRender: false }, brk.from);

    // ---- 6 brand: bar 12, outro. A flash-only accent on the stab, the logo resolves, the rule closes the film. ----
    const outro = bar(12);
    P["hold-then-hit"](tl, { hit: outro.from, flash: "#brand-flash", target: "#brand-stage", freeze: hold, zoom: 1, shakeFrames: 0 });
    P["reveal-in-context"](tl, { subject: "#wordmark", at: outro.from + 0.05, duration: 0.6, direction: "up" });
    tl.fromTo("#brand-rule", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: outro.to - (outro.from + 0.1), ease: "power2.out", immediateRender: false }, outro.from + 0.1);

    return outro.to;
  }

  return { build, DURATION };
});
