/* design-pipeline film timeline probe (design-pipeline.film-timeline.v1)
 *
 * Serializes a GSAP timeline registered at window.__timelines[id] into plain JSON so
 * `designer-pipeline verify film-timeline` can check what the composition actually animates,
 * beat by beat, without trusting the storyboard's description of it.
 *
 * In a HyperFrames preview (browser console, Playwright page.evaluate, or devtools snippet):
 *   const manifest = FilmTimelineProbe.probe(window.__timelines.main, "main");
 *   copy(JSON.stringify(manifest, null, 2)); // save as timeline.json
 *
 * The probe only reads the timeline; it never seeks, plays or mutates it.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FilmTimelineProbe = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Tween vars that configure the tween rather than name an animated property.
  const CONTROL = new Set([
    "duration", "delay", "ease", "stagger", "repeat", "repeatDelay", "repeatRefresh", "yoyo", "yoyoEase",
    "paused", "reversed", "immediateRender", "lazy", "overwrite", "id", "data", "callbackScope", "inherit",
    "runBackwards", "startAt", "keyframes", "onStart", "onUpdate", "onComplete", "onRepeat", "onReverseComplete",
    "onInterrupt", "onStartParams", "onUpdateParams", "onCompleteParams", "onRepeatParams", "onReverseCompleteParams",
    "defaults", "smoothChildTiming", "autoRemoveChildren", "parent", "clearProps",
  ]);

  function describeTarget(target) {
    if (target === null || target === undefined) return "unknown";
    if (typeof target === "string") return target;
    if (target.id) return `#${target.id}`;
    if (target.getAttribute && target.getAttribute("data-film-id")) return `[data-film-id=${target.getAttribute("data-film-id")}]`;
    if (target.classList && target.classList.length) return `${String(target.tagName || "").toLowerCase()}.${Array.from(target.classList).join(".")}`;
    if (target.tagName) return String(target.tagName).toLowerCase();
    return "object";
  }

  function isDriver(tween) {
    const targets = tween.targets ? tween.targets() : [];
    return targets.length > 0 && targets.every((target) => !(target && (target.nodeType === 1 || typeof target === "string")));
  }

  function props(vars) {
    const names = new Set();
    for (const key of Object.keys(vars || {})) if (!CONTROL.has(key)) names.add(key);
    if (vars && vars.startAt) for (const key of Object.keys(vars.startAt)) if (!CONTROL.has(key)) names.add(key);
    if (vars && Array.isArray(vars.keyframes)) for (const frame of vars.keyframes) for (const key of Object.keys(frame)) if (!CONTROL.has(key)) names.add(key);
    return Array.from(names).sort();
  }

  function round(value) { return Math.round(value * 1000) / 1000; }

  function walk(timeline, offset, out) {
    for (const child of timeline.getChildren(false, true, true)) {
      const start = offset + child.startTime() / (timeline.timeScale ? timeline.timeScale() || 1 : 1);
      if (typeof child.getChildren === "function") { walk(child, start, out); continue; }
      const vars = child.vars || {};
      const startAt = vars.startAt || {};
      out.push({
        targets: Array.from(new Set((child.targets ? child.targets() : []).map(describeTarget))),
        startSec: round(start),
        durationSec: round(child.duration()),
        props: props(vars),
        from: Object.fromEntries(Object.keys(startAt).filter((key) => !CONTROL.has(key)).map((key) => [key, startAt[key]]).filter(([, value]) => typeof value !== "function")),
        to: Object.fromEntries(Object.keys(vars).filter((key) => !CONTROL.has(key)).map((key) => [key, vars[key]]).filter(([, value]) => typeof value !== "function" && typeof value !== "object")),
        repeat: typeof child.repeat === "function" ? child.repeat() : vars.repeat || 0,
        ease: typeof vars.ease === "string" ? vars.ease : vars.ease ? "custom" : "default",
        // A driver tween animates a plain object (a progress value read by procedural, 3D or
        // shader code), not a DOM element, so its properties say nothing about the subject.
        ...(isDriver(child) ? { driver: true } : {}),
      });
    }
    return out;
  }

  function probe(timeline, compositionId) {
    if (!timeline || typeof timeline.getChildren !== "function") throw new Error("probe: expected a GSAP timeline");
    return {
      schema: "design-pipeline.film-timeline.v1",
      compositionId: String(compositionId || "main"),
      durationSec: round(timeline.duration()),
      tweens: walk(timeline, 0, []).sort((a, b) => a.startSec - b.startSec),
    };
  }

  return { probe };
});
