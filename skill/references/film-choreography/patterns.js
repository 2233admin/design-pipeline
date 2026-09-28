/* design-pipeline film choreography patterns (design-pipeline.film-choreography.v1)
 *
 * Parametric GSAP choreography for HyperFrames compositions. Each pattern appends seek-safe
 * tweens to a paused timeline at an absolute time and returns the time its handoff lands.
 * Patterns only tween transform aliases (x, y, xPercent, yPercent, scale, rotation), opacity
 * and clipPath, never layout properties, never repeat: -1, and never read clocks or randomness,
 * so the renderer can seek any frame deterministically.
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

  return {
    "continuous-morph": continuousMorph,
    "match-cut": matchCut,
    "camera-push": cameraPush,
    "camera-follow": cameraFollow,
    "kinetic-type": kineticType,
    "ui-demo": uiDemo,
    "assembly": assembly,
    "reveal-in-context": revealInContext,
  };
});
