/* Cinetic's pure motion primitives, adapted to the caller's existing frame rate and beat grid. */
(function (root) {
  "use strict";
  const source = typeof module === "object" && module.exports
    ? require("./cinetic-motion-source.js") : root.MOTION;
  function create({ fps, bpm = 120 } = {}) {
    if (!Number.isInteger(fps) || fps <= 0 || !Number.isFinite(bpm) || bpm <= 0) throw new RangeError("FilmMotion: positive integer fps and positive bpm required");
    if (!source) throw new Error("FilmMotion: load cinetic-motion-source.js first");
    const b = (bar, beat = 0, sub = 0) => Math.round(((bar - 1) * 4 + beat + sub / 4) * 60 * fps / bpm);
    const sec = (frame) => frame / fps;
    function springFn(config = source.SPR.snap) {
      if (!config || typeof config !== "object" || Array.isArray(config)) throw new TypeError("FilmMotion: spring config must be an object");
      const names = config.response === undefined ? ["stiffness", "damping", "mass"] : ["response", "dampingFraction"];
      for (const name of names) if (config[name] !== undefined && (!Number.isFinite(config[name]) || config[name] <= 0)) throw new RangeError(`FilmMotion: spring ${name} must be finite and positive`);
      const x = source.springFn(config);
      if (![0, 1 / fps, 1].every((t) => Number.isFinite(x(t)))) throw new RangeError("FilmMotion: spring config produces non-finite motion");
      return x;
    }
    function spring(config = source.SPR.snap, epsilon = 1e-3) {
      if (!Number.isFinite(epsilon) || epsilon <= 0 || epsilon >= 1) throw new RangeError("FilmMotion: spring epsilon must be between 0 and 1");
      springFn(config);
      // ponytail: reuse the source's 20-second settle scan; unusually slow springs need a longer authored study.
      const base = source.spring(config, epsilon);
      if (Math.abs(1 - base.x(base.dur)) >= epsilon) throw new RangeError("FilmMotion: spring did not settle within the source's 20-second scan; author a longer study");
      const durF = Math.ceil(base.dur * fps);
      const dur = sec(durF);
      const residual = 1 - base.x(dur);
      const ease = (p) => p <= 0 ? 0 : p >= 1 ? 1 : base.x(p * dur) + residual * p;
      return { x: base.x, ease, dur, durF };
    }
    return { fps, bpm, b, sec, at: (bar, beat = 0, sub = 0) => sec(b(bar, beat, sub)),
      E: source.E, SPR: source.SPR, springFn, spring,
      peak: source.peak, settleOf: source.settleOf, startFor: source.startFor };
  }
  root.FilmMotion = { create };
  if (typeof module === "object" && module.exports) module.exports = { create };
})(typeof window !== "undefined" ? window : globalThis);
