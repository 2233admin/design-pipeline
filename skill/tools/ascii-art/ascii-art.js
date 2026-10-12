/*
 * ascii-art.js: plays ascii.rest pieces from an explicit time for design-pipeline compositions.
 *
 * A piece (https://github.com/bas3line/ascii, MIT, Copyright (c) 2026 bas3line; see
 * LICENSE.ascii-rest) is `frame(t, env)`. Mono pieces are drawn as text in a <pre>; pieces with a
 * palette are drawn onto a canvas through a glyph atlas adapted from ascii.rest's dist/mount.js.
 * Frames sit on the preset's sample grid and are evaluated by replaying a fresh piece from 0, so
 * the same time gives the same frame after cold, repeated and reordered seeks: some pieces carry
 * a simulation or a colour cache from one call to the next. Load as a classic script for
 * `window.AsciiArt`, or require() it in Node for the parts that need no DOM.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  else root.AsciiArt = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const LINE_HEIGHT = 1.2; // a text cell is about twice as tall as it is wide, as ascii.rest draws it
  const MAX_FRAMES = 3600; // duration × fps: the most frames one cold seek replays
  const TIMELINE_ID = "ascii-art";
  const NAME = /^[a-z0-9][a-z0-9-]*$/;
  const HEX = /^#[0-9a-f]{6}$/i;
  const PRESET_KEYS = new Set(["name", "piece", "options", "fps", "cols", "rows", "ink", "ground", "duration"]);

  // --- Parts that need no DOM --------------------------------------------------------------

  function isDark(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128; // ascii.rest's own test for env.paper
  }

  function frameIndex(t, fps) {
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0) throw new RangeError("ascii-art: time must be a finite number of seconds, 0 or more");
    return Math.floor(t * fps + 1e-6);
  }

  function checkPreset(preset, index = 0) {
    const where = `ascii-art: preset ${preset && typeof preset.name === "string" ? `"${preset.name}"` : index + 1}`;
    if (!preset || typeof preset !== "object" || Array.isArray(preset)) throw new TypeError(`${where} must be an object`);
    for (const key of Object.keys(preset)) if (!PRESET_KEYS.has(key)) throw new TypeError(`${where} has an unknown field "${key}"; fields are ${[...PRESET_KEYS].join(", ")}`);
    for (const key of ["name", "piece"]) if (typeof preset[key] !== "string" || !NAME.test(preset[key])) throw new TypeError(`${where}: ${key} must be lowercase letters, digits and hyphens`);
    if (preset.options !== undefined && (!preset.options || typeof preset.options !== "object" || Array.isArray(preset.options))) throw new TypeError(`${where}: options must be an object`);
    if (typeof preset.fps !== "number" || !Number.isFinite(preset.fps) || preset.fps <= 0 || preset.fps > 60) throw new TypeError(`${where}: fps must be more than 0 and at most 60`);
    for (const key of ["cols", "rows"]) if (!Number.isInteger(preset[key]) || preset[key] < 1) throw new TypeError(`${where}: ${key} must be a positive integer`);
    for (const key of ["ink", "ground"]) if (typeof preset[key] !== "string" || !HEX.test(preset[key])) throw new TypeError(`${where}: ${key} must be a #rrggbb colour`);
    if (typeof preset.duration !== "number" || !Number.isFinite(preset.duration) || preset.duration <= 0) throw new TypeError(`${where}: duration must be a positive number of seconds`);
    if (preset.duration * preset.fps > MAX_FRAMES) throw new RangeError(`${where}: duration × fps is ${preset.duration * preset.fps}; one seek replays at most ${MAX_FRAMES} frames, so shorten the duration or lower the fps`);
    return preset;
  }

  function checkPresets(presets) {
    if (!Array.isArray(presets) || presets.length === 0) throw new TypeError("ascii-art: presets.js must define a non-empty ASCII_ART_PRESETS array");
    const names = new Set();
    presets.forEach((preset, index) => {
      checkPreset(preset, index);
      if (names.has(preset.name)) throw new TypeError(`ascii-art: preset name "${preset.name}" is used twice`);
      names.add(preset.name);
    });
    return presets;
  }

  function checkPiece(piece, preset) {
    const meta = piece && piece.meta;
    if (!meta || typeof meta !== "object" || typeof piece.default !== "function") throw new TypeError(`ascii-art: piece "${preset.piece}" must export meta and a default function`);
    if (meta.cols !== preset.cols || meta.rows !== preset.rows) throw new RangeError(`ascii-art: preset "${preset.name}" says ${preset.cols}x${preset.rows} but piece "${preset.piece}" draws ${meta.cols}x${meta.rows}`);
    if (meta.clock) throw new RangeError(`ascii-art: piece "${preset.piece}" reads the real time, so it cannot be seeked`);
    return meta;
  }

  // The frame at time t: the preset's sample grid holds frames k / fps, and frame k is the k-th call
  // of a fresh piece played from 0 with one persistent env, as mount.js would play it. Seeking forward
  // continues; seeking back starts a fresh piece. The result never depends on the order of seeks.
  function createFrames(piece, preset) {
    const meta = checkPiece(piece, preset);
    const options = Object.assign({}, meta.options || {}, preset.options || {});
    const palette = Array.isArray(meta.palette) ? meta.palette : null;
    const paper = palette ? !isDark(preset.ground) : isDark(preset.ink);
    let frame = null, color, index = -1, text = "";
    const restart = () => {
      frame = piece.default(options);
      color = palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
      index = -1;
    };
    const step = () => {
      index += 1;
      text = frame(index / preset.fps, { paper, color });
      if (index === 0) {
        const lines = typeof text === "string" ? text.split("\n") : [];
        if (lines.length !== meta.rows || lines.some((line) => line.length !== meta.cols)) throw new RangeError(`ascii-art: piece "${preset.piece}" did not return ${meta.rows} lines of ${meta.cols} characters`);
      }
    };
    return {
      fps: preset.fps,
      paper,
      coloured: Boolean(palette),
      at(t) {
        const target = frameIndex(t, preset.fps);
        if (!frame || target < index) restart();
        while (index < target) step();
        return { index, time: index / preset.fps, text, color };
      },
    };
  }

  // Evaluates one embedded module source (an exact upstream file from pieces.js). A data: URL import
  // works from file:// pages, where Chromium refuses to load module files.
  async function loadPiece(entry, slug = "piece") {
    if (!entry || typeof entry.source !== "string") throw new TypeError(`ascii-art: pieces.js has no source for "${slug}"`);
    const piece = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(entry.source)}`);
    if (!piece.meta || typeof piece.default !== "function") throw new TypeError(`ascii-art: "${slug}" is not an ascii.rest piece`);
    return piece;
  }

  // --- The page ------------------------------------------------------------------------------

  function start(options = {}) {
    const doc = options.document || globalThis.document;
    const win = doc.defaultView;
    const html = doc.documentElement;
    const stage = doc.querySelector("[data-ascii-stage]");
    const pre = doc.querySelector("[data-ascii-text]");
    const canvas = doc.querySelector("[data-ascii-canvas]");
    const status = doc.querySelector("[data-ascii-status]");
    const controls = doc.querySelector("[data-ascii-controls]");
    const { preset: picker, play: playButton, time: scrub, clock } = controls.elements;
    const reducedMotion = win.matchMedia("(prefers-reduced-motion: reduce)");
    const modules = new Map();
    let presets = [], sources = {};
    let current = null, ready = false, failure = null, selecting = 0;
    let time = 0, shown = -1;
    let playing = false, raf = 0, anchor = null;

    status.hidden = true;

    const fail = (error) => {
      failure = error instanceof Error ? error : new Error(String(error));
      ready = false;
      pause();
      pre.hidden = true;
      canvas.hidden = true;
      status.textContent = failure.message;
      status.hidden = false;
      return failure;
    };
    const requireReady = () => {
      if (!ready) throw failure || new Error("ascii-art: the preset is still loading");
    };

    // The art fits inside the stage's padding box; outside capture mode the stage also keeps the
    // control bar's height clear at the bottom.
    const stageBox = () => {
      const reserve = html.dataset.mode === "capture" ? 0 : Math.ceil(controls.getBoundingClientRect().height) + 24;
      stage.style.setProperty("--reserve", `${reserve}px`);
      const style = win.getComputedStyle(stage);
      return {
        width: Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)),
        height: Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)),
      };
    };

    const textRenderer = (meta) => {
      const measure = doc.createElement("canvas").getContext("2d");
      measure.font = `100px ${FONT}`;
      const advance = measure.measureText("M").width / 100 || 0.6;
      return {
        kind: "pre",
        element: pre,
        fit() {
          const box = stageBox();
          const size = Math.min(box.width / (meta.cols * advance), box.height / (meta.rows * LINE_HEIGHT));
          pre.style.fontSize = `${Math.max(2, size).toFixed(2)}px`;
        },
        draw(frame) {
          pre.textContent = frame.text;
        },
      };
    };

    const canvasRenderer = (preset, meta) => {
      const palette = meta.palette;
      const cellShape = meta.cell === 1 ? 1 : 2;
      const context = canvas.getContext("2d");
      const atlas = doc.createElement("canvas");
      const glyphs = atlas.getContext("2d");
      const slots = new Map();
      let cw = 0, ch = 0;
      // Each (character, colour) pair is drawn once into an atlas slot the size of one cell and
      // copied from there, as mount.js does; cells sit on whole device pixels, so they tile exactly.
      const slot = (code, colour) => {
        const key = code * 256 + colour;
        let found = slots.get(key);
        if (found !== undefined) return found;
        if (slots.size === 1024) {
          glyphs.clearRect(0, 0, atlas.width, atlas.height);
          slots.clear();
        }
        found = slots.size;
        const x = (found % 32) * cw, y = Math.floor(found / 32) * ch;
        glyphs.save();
        glyphs.beginPath();
        glyphs.rect(x, y, cw, ch);
        glyphs.clip();
        glyphs.font = `${cw / 0.6}px ${FONT}`;
        glyphs.textAlign = "center";
        glyphs.textBaseline = "middle";
        glyphs.fillStyle = palette[colour] || palette[0];
        glyphs.fillText(String.fromCharCode(code), x + cw / 2, y + ch / 2);
        glyphs.restore();
        slots.set(key, found);
        return found;
      };
      return {
        kind: "canvas",
        element: canvas,
        fit() {
          const box = stageBox();
          const ratio = Math.max(1, win.devicePixelRatio || 1);
          const cell = Math.max(1, Math.floor(Math.min(box.width / meta.cols, box.height / (meta.rows * cellShape)) * ratio));
          if (cell !== cw || canvas.width !== meta.cols * cell) {
            cw = cell;
            ch = cell * cellShape;
            canvas.width = meta.cols * cw;
            canvas.height = meta.rows * ch;
            atlas.width = 32 * cw;
            atlas.height = 32 * ch;
            slots.clear();
          }
          canvas.style.width = `${canvas.width / ratio}px`;
          canvas.style.height = `${canvas.height / ratio}px`;
        },
        draw(frame) {
          const { text, color } = frame;
          context.fillStyle = preset.ground;
          context.fillRect(0, 0, canvas.width, canvas.height);
          for (let k = 0, x = 0, y = 0; k < text.length; k++) {
            const code = text.charCodeAt(k);
            if (code === 10) {
              x = 0;
              y++;
              continue;
            }
            if (code !== 32) {
              const s = slot(code, color[y * meta.cols + x]);
              context.drawImage(atlas, (s % 32) * cw, Math.floor(s / 32) * ch, cw, ch, x * cw, y * ch, cw, ch);
            }
            x++;
          }
        },
      };
    };

    const renderAt = (t, force = false) => {
      requireReady();
      const { preset, meta, frames, renderer } = current;
      const at = Math.min(Math.max(t, 0), preset.duration);
      const frame = frames.at(at);
      time = at;
      if (force || frame.index !== shown) {
        renderer.draw(frame);
        shown = frame.index;
      }
      scrub.value = String(at);
      clock.value = `${at.toFixed(2)} s`;
      const box = renderer.element.getBoundingClientRect();
      return {
        preset: preset.name, piece: preset.piece, time: frame.time, frame: frame.index, fps: preset.fps,
        cols: meta.cols, rows: meta.rows, renderer: renderer.kind, width: Math.round(box.width), height: Math.round(box.height),
      };
    };

    const refit = () => {
      if (!current) return;
      current.renderer.fit();
      if (ready) renderAt(time, true);
    };

    const enterCaptureMode = () => {
      if (html.dataset.mode === "capture") return;
      html.dataset.mode = "capture";
      refit();
    };

    function updatePlayButton() {
      playButton.textContent = playing ? "Pause" : reducedMotion.matches ? "Play anyway" : "Play";
      playButton.setAttribute("aria-pressed", String(playing));
    }

    // The live preview loop: only for a person watching. It never runs in the capture path.
    function tick(now) {
      if (anchor === null) anchor = { clock: now, time };
      const duration = current.preset.duration;
      renderAt((anchor.time + (now - anchor.clock) / 1000) % duration);
      raf = win.requestAnimationFrame(tick);
    }
    function play() {
      requireReady();
      if (playing) return;
      playing = true;
      anchor = null;
      if (!doc.hidden) raf = win.requestAnimationFrame(tick);
      updatePlayButton();
    }
    function pause() {
      playing = false;
      anchor = null;
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      updatePlayButton();
    }

    async function select(name) {
      const token = ++selecting;
      const wasPlaying = playing;
      pause();
      ready = false;
      failure = null;
      status.hidden = true;
      try {
        const preset = presets.find((item) => item.name === name);
        if (!preset) throw new RangeError(`ascii-art: unknown preset "${name}"; choose one of ${presets.map((item) => item.name).join(", ")}`);
        if (!modules.has(preset.piece)) modules.set(preset.piece, loadPiece(sources[preset.piece], preset.piece));
        const piece = await modules.get(preset.piece);
        if (token !== selecting) return null;
        const meta = checkPiece(piece, preset);
        const frames = createFrames(piece, preset);
        const renderer = meta.palette ? canvasRenderer(preset, meta) : textRenderer(meta);
        current = { preset, meta, frames, renderer };
        html.style.setProperty("--ink", preset.ink);
        html.style.setProperty("--ground", preset.ground);
        html.style.colorScheme = isDark(preset.ground) ? "dark" : "light";
        stage.setAttribute("aria-label", `${meta.name}: ${meta.note}`);
        pre.hidden = renderer.kind !== "pre";
        canvas.hidden = renderer.kind !== "canvas";
        picker.value = preset.name;
        scrub.max = String(preset.duration);
        scrub.step = String(1 / preset.fps);
        renderer.fit();
        ready = true;
        shown = -1;
        const state = renderAt(0, true);
        if (wasPlaying) play();
        return state;
      } catch (error) {
        if (token === selecting) throw fail(error);
        return null;
      }
    }

    // A preset named in the URL: the hash first, then ?preset=.
    const nameFromLocation = () => {
      const hash = win.location.hash.slice(1);
      if (hash) {
        try {
          return decodeURIComponent(hash);
        } catch {
          return hash;
        }
      }
      return new URLSearchParams(win.location.search).get("preset");
    };

    const hook = {
      seek(t) {
        requireReady();
        frameIndex(t, 1);
        pause();
        enterCaptureMode();
        renderAt(t, true);
        return hook;
      },
      time: () => time,
      duration: () => (current ? current.preset.duration : 0),
      pause() {
        pause();
        return hook;
      },
    };
    win.__timelines = win.__timelines || {};
    win.__timelines[TIMELINE_ID] = hook;
    win.renderStudy = (progress) => {
      requireReady();
      if (typeof progress !== "number" || !Number.isFinite(progress) || progress < 0 || progress > 1) throw new TypeError("ascii-art: progress must be between 0 and 1");
      pause();
      enterCaptureMode();
      return renderAt(progress * current.preset.duration, true);
    };

    let started;
    try {
      presets = checkPresets(options.presets || win.ASCII_ART_PRESETS);
      sources = options.pieces || win.ASCII_ART_PIECES || {};
      for (const preset of presets) picker.add(new win.Option(preset.name, preset.name));
      started = select(nameFromLocation() || html.dataset.preset || presets[0].name);
    } catch (error) {
      started = Promise.reject(fail(error));
    }
    const readyPromise = started.then((state) => {
      if (!reducedMotion.matches && html.dataset.mode !== "capture") play();
      return state;
    });
    readyPromise.catch(() => {});

    picker.addEventListener("change", () => {
      win.history.replaceState(null, "", `#${encodeURIComponent(picker.value)}`);
      select(picker.value).catch(() => {});
    });
    win.addEventListener("hashchange", () => {
      const name = nameFromLocation();
      if (name && (!current || name !== current.preset.name)) select(name).catch(() => {});
    });
    playButton.addEventListener("click", () => {
      if (playing) pause();
      else if (ready) play();
    });
    scrub.addEventListener("input", () => {
      if (!ready) return;
      pause();
      renderAt(Number(scrub.value));
    });
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) pause();
      updatePlayButton();
    });
    doc.addEventListener("visibilitychange", () => {
      if (doc.hidden && raf) {
        win.cancelAnimationFrame(raf);
        raf = 0;
      } else if (!doc.hidden && playing && !raf) {
        anchor = null;
        raf = win.requestAnimationFrame(tick);
      }
    });
    win.addEventListener("resize", refit);
    updatePlayButton();

    return {
      ready: readyPromise,
      select,
      renderAt: (t) => {
        pause();
        return renderAt(t, true);
      },
      play,
      pause,
      get presets() {
        return presets.map((preset) => preset.name);
      },
      get playing() {
        return playing;
      },
    };
  }

  return { FONT, MAX_FRAMES, TIMELINE_ID, isDark, frameIndex, checkPreset, checkPresets, checkPiece, createFrames, loadPiece, start };
});
