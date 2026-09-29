/* design-pipeline film choreography patterns (design-pipeline.film-choreography.v1)
 *
 * Parametric GSAP choreography for HyperFrames compositions. Each pattern appends seek-safe
 * tweens to a paused timeline at an absolute time and returns the time its handoff lands.
 * Patterns only tween transform aliases (x, y, xPercent, yPercent, scale, rotation), opacity
 * and clipPath, never layout properties, never repeat: -1, and never read clocks or randomness,
 * so the renderer can seek any frame deterministically.
 *
 * Jitter, shake and noise must be hash(seed, frameIndex), never a running random stream or the
 * continuous time t: the value is then constant across the shutter interval and identical in
 * preview and export. `film check` reports clocks, unseeded randomness, timers and autoplay in
 * index.html and compositions/*.html as nondeterministic-source.
 *
 * Instrument kit (audio-meter, event-scope, tick-ticker, grid-pulse, build-countdown,
 * hold-then-hit): patterns that answer a list of hits, plain data `[{ atSec, strength? }]`, so any
 * source of times can feed them (FilmAudio in audio-events.js turns a score grid into hits).
 * Kit contract:
 *   - Tween properties are exactly: clipPath, backgroundColor, color, scale, x, y, opacity,
 *     innerText. Tween options are exactly: duration, ease, immediateRender, modifiers. No
 *     callbacks, repeats, delays or layout properties: a property tween renders on every seek
 *     whatever `suppressEvents` the caller passes, and the timeline gate sees it.
 *   - Every property tween is a fromTo with explicit endpoints and immediateRender: false, and
 *     every call has an absolute position. The one exception is the countdown, a single `to`
 *     (a fromTo re-applies its raw start value, not the formatted text, after a rewind).
 *   - One lane per animated property: attacks start on their hit, releases are truncated at the
 *     next hit, so no two tweens of a lane overlap (property-conflict). Hits are sorted; a hit
 *     under one frame after the previous kept hit, or under one frame before `until`, is dropped.
 *     Times are snapped to 1 ms, the resolution of the timeline probe.
 *   - Numbers inside strings are written String(Number(x.toFixed(3))): never a trailing ".0",
 *     which stops GSAP interpolating a clipPath whose end value ends in ".0".
 *   - Colour options are literals. A var(...) colour throws: GSAP reads a var() start value as
 *     transparent. Apply the same literals to the --fk-* custom properties from one STYLE table.
 *   - Pseudo-random choice is hash(seed, index) with a caller seed, never a running stream.
 *
 * Usage inside a composition (after gsap is loaded):
 *   const tl = gsap.timeline({ paused: true });
 *   const end = FilmPatterns["continuous-morph"](tl, { from: "#prompt-node", to: "#image-node", at: 1.2 });
 *   FilmPatterns["camera-push"](tl, { stage: "#world", focus: { x: -240, y: 80 }, at: end });
 *   window.__timelines["main"] = tl;
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FilmPatterns = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function need(options, keys, id) {
    for (const key of keys) {
      if (options[key] === undefined || options[key] === null) throw new Error(`${id}: missing option ${key}`);
    }
    if (typeof options.at !== "number" || options.at < 0) throw new Error(`${id}: at must be a non-negative number of seconds`);
  }

  // One subject becomes the next: A travels to B's pose while B takes over from A's pose.
  // The viewer's eye never resets. `delta` is B's offset relative to A in pixels.
  function continuousMorph(tl, options) {
    need(options, ["from", "to"], "continuous-morph");
    const { from, to, at, duration = 0.9, delta = { x: 0, y: 0, scale: 1 }, ease = "power3.inOut" } = options;
    tl.fromTo(from, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: delta.x, y: delta.y, scale: delta.scale, opacity: 0, duration, ease }, at);
    tl.fromTo(to, { x: -delta.x, y: -delta.y, scale: 1 / (delta.scale || 1), opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration, ease }, at);
    return at + duration;
  }

  // Match cut: shape A fills its frame, hard cut on the shared silhouette to B, B settles.
  function matchCut(tl, options) {
    need(options, ["from", "to"], "match-cut");
    const { from, to, at, push = 0.35, settle = 0.5, fill = 1.35 } = options;
    tl.fromTo(from, { scale: 1 }, { scale: fill, duration: push, ease: "power2.in" }, at);
    tl.set(from, { opacity: 0 }, at + push);
    tl.fromTo(to, { opacity: 1, scale: fill }, { scale: 1, duration: settle, ease: "power3.out", immediateRender: false }, at + push);
    return at + push + settle;
  }

  // Camera push: the world moves, not the panel. Focus is the world offset that centers the subject.
  function cameraPush(tl, options) {
    need(options, ["stage", "focus"], "camera-push");
    const { stage, focus, at, duration = 1.6, scale = 1.6, ease = "power2.inOut" } = options;
    tl.to(stage, { x: focus.x * scale, y: focus.y * scale, scale, duration, ease }, at);
    return at + duration;
  }

  // Kinetic type: words arrive with weight and hand off to the object they name.
  function kineticType(tl, options) {
    need(options, ["words"], "kinetic-type");
    const { words, at, stagger = 0.08, duration = 0.5, rise = 40, target = null } = options;
    tl.fromTo(words, { yPercent: rise === 0 ? 0 : 100, rotation: 4, opacity: 0 }, { yPercent: 0, rotation: 0, opacity: 1, duration, stagger, ease: "expo.out" }, at);
    const settled = at + duration + stagger * Math.max(0, (options.count || 1) - 1);
    if (target) {
      tl.to(words, { scale: 0.4, y: options.targetOffsetY || 0, opacity: 0, duration: 0.45, ease: "power3.in", stagger: 0.02 }, settled + 0.3);
      tl.fromTo(target, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.6)" }, settled + 0.55);
      return settled + 1.1;
    }
    return settled;
  }

  // UI demonstration: a cursor travels, presses, and the product state visibly changes.
  function uiDemo(tl, options) {
    need(options, ["cursor", "path", "result"], "ui-demo");
    const { cursor, path, result, at, travel = 0.7, press = 0.12 } = options;
    let t = at;
    for (const point of path) {
      tl.to(cursor, { x: point.x, y: point.y, duration: travel, ease: "power2.inOut" }, t);
      t += travel;
    }
    tl.to(cursor, { scale: 0.82, duration: press, ease: "power1.in" }, t);
    tl.to(cursor, { scale: 1, duration: press, ease: "power1.out" }, t + press);
    tl.fromTo(result, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power3.out" }, t + press);
    return t + press + 0.6;
  }

  // Assembly: scattered pieces converge into the finished product surface.
  function assembly(tl, options) {
    need(options, ["pieces", "offsets"], "assembly");
    const { pieces, offsets, at, duration = 0.8, stagger = 0.05 } = options;
    if (!Array.isArray(offsets) || offsets.length === 0) throw new Error("assembly: offsets must list one {x,y,rotation} per piece");
    tl.fromTo(pieces, {
      x: (index) => offsets[index % offsets.length].x,
      y: (index) => offsets[index % offsets.length].y,
      rotation: (index) => offsets[index % offsets.length].rotation || 0,
      opacity: 0,
    }, { x: 0, y: 0, rotation: 0, opacity: 1, duration, stagger, ease: "power3.out" }, at);
    return at + duration + stagger * (offsets.length - 1);
  }

  // Reveal in context: a wipe exposes the product inside the scene it serves.
  function revealInContext(tl, options) {
    need(options, ["subject"], "reveal-in-context");
    const { subject, at, duration = 0.8, direction = "up" } = options;
    const start = { up: "inset(100% 0% 0% 0%)", down: "inset(0% 0% 100% 0%)", left: "inset(0% 0% 0% 100%)", right: "inset(0% 100% 0% 0%)" }[direction];
    if (!start) throw new Error("reveal-in-context: direction must be up, down, left or right");
    tl.fromTo(subject, { clipPath: start }, { clipPath: "inset(0% 0% 0% 0%)", duration, ease: "expo.out" }, at);
    return at + duration;
  }

  // Camera follow: `stage` is the world container, exactly as in camera-push. The subject moves
  // to each path point inside it; the stage compensates by the negated point plus a small `lead`
  // offset, so the subject settles centered in frame. The stage's tween is shorter than the
  // subject's and starts at the same time, so the view arrives first and the subject settles into
  // an already-framed shot. After the path, an explicit no-op tween holds for `rest` seconds so
  // the hold is part of the scheduled timeline, and the returned handoff time includes it.
  // Seek-safe: no repeats, transforms only, eases that accelerate in and settle out.
  function cameraFollow(tl, options) {
    const normalized = { at: 0, ...options };
    need(normalized, ["stage", "subject", "path", "lead", "rest"], "camera-follow");
    const { stage, subject, path, at, lead, rest, duration = 0.8, ease = "power2.inOut" } = normalized;
    if (!Array.isArray(path) || path.length === 0) throw new Error("camera-follow: path must list one or more {x,y} points");
    if (!lead || typeof lead.x !== "number" || typeof lead.y !== "number") throw new Error("camera-follow: lead must be a small {x,y} offset");
    if (typeof rest !== "number" || rest < 0) throw new Error("camera-follow: rest must be a non-negative number of seconds");
    let t = at;
    for (const point of path) {
      tl.to(stage, { x: -(point.x + lead.x), y: -(point.y + lead.y), duration: duration * 0.6, ease }, t);
      tl.to(subject, { x: point.x, y: point.y, duration, ease }, t);
      t += duration;
    }
    tl.to({}, { duration: rest }, t);
    return t + rest;
  }

  // ---------- instrument kit ----------

  const MIN_TWEEN_SEC = 0.001;
  const HALF_MS = 0.0005;

  function isNum(value) { return typeof value === "number" && Number.isFinite(value); }
  // Times are kept on a 1 ms grid: the probe rounds to 1 ms, so a schedule that lies on the grid
  // reads back exactly and its lanes never overlap by rounding.
  function snap(value) { return Number(value.toFixed(3)) + 0; }
  // The only way a number enters a string: never "85.0", which stops GSAP interpolating.
  function fmt(value) { return String(Number(value.toFixed(3))); }

  // 32-bit integer mix (murmur3 finalizer) of seed and index; same inputs, same number in [0, 1).
  function hash(seed, index) {
    let h = (Math.imul(Math.floor(seed) | 0, 0x9e3779b1) ^ Math.imul(Math.floor(index) | 0, 0x85ebca6b)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function kitNeed(options, keys, id) {
    if (!options || typeof options !== "object") throw new Error(`${id}: options must be an object`);
    for (const key of keys) {
      if (options[key] === undefined || options[key] === null) throw new Error(`${id}: missing option ${key}`);
    }
  }

  function frameSec(options, id) {
    const fps = options.fps === undefined ? 30 : options.fps;
    if (!isNum(fps) || fps <= 0) throw new Error(`${id}: fps must be a positive number. Fix: pass the composition frame rate (default 30)`);
    return 1 / fps;
  }

  function windowOf(options, id) {
    const { at, until } = options;
    if (!isNum(at) || at < 0) throw new Error(`${id}: at must be a non-negative number of seconds`);
    if (!isNum(until) || until <= at) throw new Error(`${id}: until must be a number of seconds after at. Fix: pass the absolute time the instrument's plate ends`);
    return { at: snap(at), until: snap(until) };
  }

  function numberOption(options, key, fallback, id, valid, rule) {
    const value = options[key] === undefined ? fallback : options[key];
    if (!isNum(value) || !valid(value)) throw new Error(`${id}: ${key} must be ${rule}`);
    return value;
  }

  function selectorList(list, key, id) {
    if (!Array.isArray(list) || list.length === 0) throw new Error(`${id}: ${key} must list one selector or element per item. Fix: pass ["#a0", "#a1"], not one class selector, so each item gets its own lane`);
    return list;
  }

  // A colour a tween interpolates must be a literal: GSAP reads a var() start value as transparent.
  function literalColor(value, key, id) {
    if (typeof value !== "string" || value.trim() === "") throw new Error(`${id}: ${key} must be a literal colour string`);
    if (/^var\(/i.test(value.trim())) throw new Error(`${id}: ${key} is ${value}, a var() colour; GSAP reads a var() start value as transparent. Fix: pass the literal from the STYLE table, for example "#f5f5f5", and apply the same literal to the --fk-* custom property`);
    return value.trim();
  }

  // Sorted hits inside [from, until), snapped to 1 ms; a hit under one frame after the previous
  // kept hit, or under one frame before `until`, is dropped. Of coincident hits the stronger stays.
  function prepareHits(hits, from, until, frame, id) {
    if (!Array.isArray(hits)) throw new Error(`${id}: hits must be an array of { atSec, strength? }. Fix: build it with FilmAudio.hits(audio, { ... })`);
    const list = hits.map((hit, index) => {
      if (!hit || !isNum(hit.atSec)) throw new Error(`${id}: hits[${index}] needs a finite atSec`);
      const strength = hit.strength === undefined ? 1 : hit.strength;
      if (!isNum(strength)) throw new Error(`${id}: hits[${index}].strength must be a number`);
      return { t: snap(hit.atSec), s: Math.min(1, Math.max(0, strength)) };
    }).filter((hit) => hit.t >= from && hit.t < until);
    list.sort((a, b) => a.t - b.t || b.s - a.s);
    const kept = [];
    for (const hit of list) {
      if (kept.length && hit.t - kept[kept.length - 1].t < frame - HALF_MS) continue;
      if (until - hit.t < frame - HALF_MS) continue;
      kept.push(hit);
    }
    return kept;
  }

  function laneSettings(options, id, frame, defaults) {
    const attack = numberOption(options, "attack", defaults.attack, id, (v) => v >= frame - 1e-9, "at least one frame (1 / fps) seconds. Fix: raise attack to at least 1 / fps seconds");
    const release = numberOption(options, "release", defaults.release, id, (v) => v > 0, "a positive number of seconds");
    const attackEase = options.attackEase === undefined ? defaults.attackEase : options.attackEase;
    const releaseEase = options.releaseEase === undefined ? defaults.releaseEase : options.releaseEase;
    return { attack, release, attackEase, releaseEase };
  }

  // One lane: a rest state written at `at`, then per hit an attack from rest to peak that starts
  // on the hit and a release from peak back to rest, truncated at the next hit (`until` after the
  // last). Both are fromTo with explicit endpoints, so any seek renders the same frame.
  function lane(tl, target, hits, at, until, rest, peakOf, settings) {
    tl.set(target, { ...rest }, at);
    hits.forEach((hit, index) => {
      const next = index + 1 < hits.length ? hits[index + 1].t : until;
      const peak = peakOf(hit);
      const attack = snap(Math.min(settings.attack, next - hit.t));
      tl.fromTo(target, { ...rest }, { ...peak, duration: attack, ease: settings.attackEase, immediateRender: false }, hit.t);
      const release = snap(Math.min(settings.release, next - hit.t - attack));
      if (release >= MIN_TWEEN_SEC) tl.fromTo(target, { ...peak }, { ...rest, duration: release, ease: settings.releaseEase, immediateRender: false }, snap(hit.t + attack));
    });
  }

  function meterClip(axis, level) {
    const open = fmt((1 - level) * 100);
    return axis === "y" ? `inset(${open}% 0% 0% 0%)` : `inset(0% ${open}% 0% 0%)`;
  }

  function meterLane(tl, target, hits, w, axis, floor, settings) {
    lane(tl, target, hits, w.at, w.until, { clipPath: meterClip(axis, floor) }, (hit) => ({ clipPath: meterClip(axis, floor + (1 - floor) * hit.s) }), settings);
  }

  function meterOptions(options, id) {
    const axis = options.axis === undefined ? "y" : options.axis;
    if (axis !== "x" && axis !== "y") throw new Error(`${id}: axis must be "x" or "y"`);
    const floor = numberOption(options, "floor", id === "event-scope" ? 0.1 : 0.15, id, (v) => v >= 0 && v < 1, "a number from 0 up to but not including 1");
    return { axis, floor };
  }

  // Audio meter: a bar (clip-path) that snaps up to the hit's strength and falls back to `floor`.
  function audioMeter(tl, options) {
    const id = "audio-meter";
    kitNeed(options, ["target", "hits", "at", "until"], id);
    const frame = frameSec(options, id);
    const w = windowOf(options, id);
    const { axis, floor } = meterOptions(options, id);
    const settings = laneSettings(options, id, frame, { attack: 0.05, release: 0.35, attackEase: "power4.out", releaseEase: "power2.in" });
    meterLane(tl, options.target, prepareHits(options.hits, w.at, w.until, frame, id), w, axis, floor, settings);
    return w.until;
  }

  // Event scope: N thin bars, each a meter lane fed the hits shifted by j * travel / N and scaled
  // by decay^j, so a pulse travels across the row. It shows events, not a waveform.
  function eventScope(tl, options) {
    const id = "event-scope";
    kitNeed(options, ["columns", "hits", "at", "until"], id);
    const frame = frameSec(options, id);
    const w = windowOf(options, id);
    const columns = selectorList(options.columns, "columns", id);
    const travel = numberOption(options, "travel", 1.2, id, (v) => v >= 0, "a non-negative number of seconds");
    const decay = numberOption(options, "decay", 0.9, id, (v) => v > 0 && v <= 1, "a number above 0 and at most 1");
    const { axis, floor } = meterOptions(options, id);
    const settings = laneSettings(options, id, frame, { attack: 0.05, release: 0.25, attackEase: "power4.out", releaseEase: "power2.in" });
    if (!Array.isArray(options.hits)) prepareHits(options.hits, w.at, w.until, frame, id);
    columns.forEach((column, j) => {
      const shifted = options.hits.map((hit) => (hit && isNum(hit.atSec)
        ? { atSec: hit.atSec + (j * travel) / columns.length, strength: (hit.strength === undefined ? 1 : hit.strength) * decay ** j }
        : hit));
      meterLane(tl, column, prepareHits(shifted, w.at, w.until, frame, id), w, axis, floor, settings);
    });
    return w.until;
  }

  // Tick ticker: one row scrolls in per hit. The column steps up by `rowPx` in at most `step`
  // seconds, truncated at the next hit, and stays there (no release).
  function tickTicker(tl, options) {
    const id = "tick-ticker";
    kitNeed(options, ["target", "hits", "at", "until", "rowPx"], id);
    const frame = frameSec(options, id);
    const w = windowOf(options, id);
    const rowPx = numberOption(options, "rowPx", undefined, id, (v) => v > 0, "the row height in pixels, equal to --fk-row");
    const step = numberOption(options, "step", 0.06, id, (v) => v >= frame - 1e-9, "at least one frame (1 / fps) seconds");
    const hits = prepareHits(options.hits, w.at, w.until, frame, id);
    if (options.rows !== undefined && (!Number.isInteger(options.rows) || options.rows < 1)) throw new Error(`${id}: rows must be a positive integer`);
    if (options.rows !== undefined && hits.length > options.rows) throw new Error(`${id}: ${hits.length} hits in the window but only ${options.rows} rows. Fix: add rows to the markup and raise rows, or narrow the hit selection`);
    tl.set(options.target, { y: 0 }, w.at);
    hits.forEach((hit, index) => {
      const next = index + 1 < hits.length ? hits[index + 1].t : w.until;
      tl.fromTo(options.target, { y: 0 - index * rowPx }, { y: 0 - (index + 1) * rowPx, duration: snap(Math.min(step, next - hit.t)), ease: "power2.out", immediateRender: false }, hit.t);
    });
    return w.until;
  }

  // Grid pulse: per hit, the `perHit` share of cells with the lowest hash(seed + hitIndex, cell)
  // light up (colour and scale) and release; each cell is its own lane. Strength is not used.
  function gridPulse(tl, options) {
    const id = "grid-pulse";
    kitNeed(options, ["cells", "hits", "at", "until", "rest", "lit"], id);
    const frame = frameSec(options, id);
    const w = windowOf(options, id);
    const cells = selectorList(options.cells, "cells", id);
    const rest = literalColor(options.rest, "rest", id);
    const lit = literalColor(options.lit, "lit", id);
    const perHit = numberOption(options, "perHit", 0.25, id, (v) => v > 0 && v <= 1, "a share above 0 and at most 1");
    const seed = numberOption(options, "seed", 1, id, () => true, "a number");
    const peakScale = numberOption(options, "peakScale", 1.12, id, (v) => v > 0, "a positive number");
    const settings = laneSettings(options, id, frame, { attack: 0.04, release: 0.3, attackEase: "power4.out", releaseEase: "power2.in" });
    const hits = prepareHits(options.hits, w.at, w.until, frame, id);
    const count = Math.min(cells.length, Math.max(1, Math.round(perHit * cells.length)));
    const own = cells.map(() => []);
    hits.forEach((hit, hitIndex) => {
      cells
        .map((_, cell) => ({ cell, key: hash(seed + hitIndex, cell) }))
        .sort((a, b) => a.key - b.key || a.cell - b.cell)
        .slice(0, count)
        .forEach(({ cell }) => own[cell].push(hit));
    });
    cells.forEach((cell, index) => {
      lane(tl, cell, own[index], w.at, w.until, { backgroundColor: rest, scale: 1 }, () => ({ backgroundColor: lit, scale: peakScale }), settings);
    });
    return w.until;
  }

  // The share of the countdown burned at progress p: a steepening curve plus the running,
  // normalised sum of the hits, so every hit bites. 0 at 0, 1 at 1, never decreasing.
  function burnEase(curve, bite, cuts) {
    return (p) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      const base = p ** curve;
      if (cuts.length === 0) return base;
      let running = 0;
      for (const cut of cuts) { if (cut.q <= p) running = cut.sum; else break; }
      return (1 - bite) * base + bite * running;
    };
  }

  // Build countdown: one `to` tween on the element's static text (`08.00`), rendered through
  // `modifiers`, then an explicit no-op hold for `freeze`. GSAP reads the start from the markup,
  // so a rewind before the window shows the formatted text, not a raw number.
  function buildCountdown(tl, options) {
    const id = "build-countdown";
    kitNeed(options, ["target", "at", "until", "format"], id);
    const frame = frameSec(options, id);
    const w = windowOf(options, id);
    if (typeof options.format !== "function") throw new Error(`${id}: format must be a function from a number to text. Fix: pass (value) => value.toFixed(2).padStart(5, "0")`);
    const freeze = numberOption(options, "freeze", 0.5, id, (v) => v >= 0, "a non-negative number of seconds");
    const curve = numberOption(options, "curve", 1.9, id, (v) => v > 0, "a positive number");
    const bite = numberOption(options, "bite", 0.28, id, (v) => v >= 0 && v < 1, "a number from 0 up to but not including 1");
    const end = snap(w.until - freeze);
    const length = snap(end - w.at);
    if (length < frame - HALF_MS) throw new Error(`${id}: the window is ${snap(w.until - w.at)} s, which leaves ${length} s before the ${freeze} s freeze. Fix: lengthen the window or shorten freeze`);
    if ((options.textColor === undefined) !== (options.alert === undefined)) throw new Error(`${id}: textColor and alert are given together or not at all`);
    const hits = options.hits === undefined ? [] : prepareHits(options.hits, w.at, end, frame, id);
    const total = hits.reduce((sum, hit) => sum + hit.s, 0);
    let sum = 0;
    const cuts = total > 0 ? hits.map((hit) => { sum += hit.s; return { q: (hit.t - w.at) / length, sum: sum / total }; }) : [];
    const format = options.format;
    tl.to(options.target, { innerText: 0, duration: length, ease: burnEase(curve, bite, cuts), modifiers: { innerText: (value) => format(Math.max(0, Number(value))) }, immediateRender: false }, w.at);
    if (options.textColor !== undefined) {
      tl.fromTo(options.target, { color: literalColor(options.textColor, "textColor", id) }, { color: literalColor(options.alert, "alert", id), duration: length, ease: "power2.in", immediateRender: false }, w.at);
    }
    if (freeze > 0) tl.to({}, { duration: freeze }, end);
    return w.until;
  }

  // Hold then hit: the caller keeps other instruments still for `freeze` before the cue (the
  // adapter's `quiet` option); this pattern starts at the cue. The overlay is set to 0 at time 0,
  // flashes for one frame, the wrapper punches in (`zoom`) and shakes for `shakeFrames` one-frame
  // steps of decaying, hashed offsets. With zoom 1 and shakeFrames 0 it is a flash-only accent.
  function holdThenHit(tl, options) {
    const id = "hold-then-hit";
    kitNeed(options, ["hit", "flash", "target"], id);
    const frame = frameSec(options, id);
    if (!isNum(options.hit) || options.hit < 0) throw new Error(`${id}: hit must be a non-negative number of seconds`);
    const freeze = numberOption(options, "freeze", 0.5, id, (v) => v >= 0, "a non-negative number of seconds");
    const zoom = numberOption(options, "zoom", 1.06, id, (v) => v > 0, "a positive scale");
    const shake = numberOption(options, "shake", 12, id, (v) => v >= 0, "a non-negative number of pixels");
    const shakeFrames = numberOption(options, "shakeFrames", 8, id, (v) => Number.isInteger(v) && v >= 0, "a non-negative integer");
    const seed = numberOption(options, "seed", 1, id, () => true, "a number");
    const hit = snap(options.hit);
    if (hit < freeze) throw new Error(`${id}: hit ${hit} is earlier than freeze ${freeze}. Fix: move the cue later or shorten freeze`);
    if (shakeFrames * frame > 0.4 + HALF_MS) throw new Error(`${id}: ${shakeFrames} shake frames do not fit in 0.4 s at ${Math.round(1 / frame)} fps. Fix: lower shakeFrames`);
    const end = snap(hit + 0.4);
    const at = (k) => snap(hit + k * frame);
    tl.set(options.flash, { opacity: 0 }, 0);
    tl.fromTo(options.flash, { opacity: 1 }, { opacity: 0, duration: snap(at(1) - hit), ease: "none", immediateRender: false }, hit);
    if (zoom !== 1) {
      tl.fromTo(options.target, { scale: 1 }, { scale: zoom, duration: snap(at(1) - hit), ease: "power4.out", immediateRender: false }, hit);
      tl.fromTo(options.target, { scale: zoom }, { scale: 1, duration: snap(end - at(1)), ease: "power2.out", immediateRender: false }, at(1));
    }
    if (shakeFrames > 0 && shake > 0) {
      let x = 0;
      let y = 0;
      for (let k = 0; k < shakeFrames; k += 1) {
        const amplitude = shake * (1 - (k + 1) / shakeFrames);
        const nextX = snap(amplitude * (hash(seed, 2 * k) * 2 - 1));
        const nextY = snap(amplitude * (hash(seed, 2 * k + 1) * 2 - 1));
        tl.fromTo(options.target, { x, y }, { x: nextX, y: nextY, duration: snap(at(k + 1) - at(k)), ease: "none", immediateRender: false }, at(k));
        x = nextX;
        y = nextY;
      }
    }
    return end;
  }

  return {
    "continuous-morph": continuousMorph,
    "match-cut": matchCut,
    "camera-push": cameraPush,
    "camera-follow": cameraFollow,
    "kinetic-type": kineticType,
    "ui-demo": uiDemo,
    "assembly": assembly,
    "reveal-in-context": revealInContext,
    "audio-meter": audioMeter,
    "event-scope": eventScope,
    "tick-ticker": tickTicker,
    "grid-pulse": gridPulse,
    "build-countdown": buildCountdown,
    "hold-then-hit": holdThenHit,
  };
});
