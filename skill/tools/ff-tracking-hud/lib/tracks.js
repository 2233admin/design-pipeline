/* Tracking HUD tracks: the single data source of the film's picture and sound.
 *
 * Port of the `hud` crate of mrsarac/ff-tracking at cc7f4e1 (MIT, Copyright (c) 2026 Mustafa
 * Saraç): what the agent types, where the tracker boxes sit, where the camera looks on every
 * frame, where a point of the screen lands in the lens output, and the sound events. The flat
 * pass, the lens uniforms, the overlay, the storyboard and the sound all read this module, so
 * they agree on every frame. Positions are in the filmed screen's logical space (W x H).
 *
 *   const T = FFTracking.create(config);   // config: film.config.js
 *   T.shot(frame), T.track(shotIndex, shotFrame), T.project(shot, [x, y], 1920, 1080), T.events()
 *
 * Upstream computes in f32; this port computes in f64 and rounds to f32 only where a value
 * decides a discrete choice (random thresholds, typed character count).
 */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FFTracking = api;
})(typeof self === "undefined" ? this : self, () => {
  const W = 1920;
  const H = 1080;
  const MONO_ADV = 0.6; // JetBrains Mono advances 0.6 em per character
  const LOG_SIZE = 26;
  const LOG_LINE = 46;
  const LOG_X = 150;
  const FOCAL = 1.7; // must match FOCAL in the lens shader
  const KINDS = ["cursor", "typing", "collapse", "done"];
  const F = Math.fround;
  const TAU = F(Math.PI * 2);
  // Screen area typed lines and the Done pill stay inside: 60 px from the sides (upstream's right
  // margin), between the title rule (y 48) and the status rule (y 1016) with 8 px to spare.
  const SCREEN = { left: 60, right: W - 60, top: 56, bottom: 1008 };
  // Where the tracked target must land in the output frame (upstream `cargo test -p hud`).
  const SAFE_FRAME = { left: 200, right: 1720, top: 150, bottom: 930 };
  // The render gate's audio-sync window (film-core syncToleranceSec): a lock ping closer than this
  // to a cut merges with the cut glitch.
  const SYNC_SEC = 0.1;
  // WCAG contrast of a palette's text stop on its background stop: the large-text minimum the
  // composition gate applies to text of 24 px and up.
  const MIN_CONTRAST = 3;

  /** Deterministic noise in 0..1 (upstream `hud::rnd`, bit-exact). */
  function rnd(a, b) {
    let h = (Math.imul(a >>> 0, 0x9e3779b1) ^ Math.imul(b >>> 0, 0x85ebca77) ^ 0x27d4eb2f) >>> 0;
    h = (h ^ (h >>> 15)) >>> 0;
    h = Math.imul(h, 0x2c1b3c6d) >>> 0;
    h = (h ^ (h >>> 12)) >>> 0;
    h = Math.imul(h, 0x297a2d39) >>> 0;
    h = (h ^ (h >>> 15)) >>> 0;
    return F(F(h) / F(4294967295));
  }

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const isSpace = (ch) => /\s/u.test(ch);

  /** Cells a typing shot locks on: the last occurrence of `lock`, or (upstream) the last word. */
  function lockSpan(chars, lock) {
    const n = chars.length;
    if (lock === undefined) {
      let start = 0;
      for (let i = n - 1; i >= 0 && !isSpace(chars[i]); i -= 1) start = i;
      return [start, Math.max(0, n - 1)];
    }
    const word = Array.from(lock);
    for (let i = n - word.length; i >= 0; i -= 1) if (word.every((ch, k) => chars[i + k] === ch)) return [i, i + word.length - 1];
    return fail(`lock "${lock}" is not in the typed line "${chars.join("")}"`);
  }

  function hexToRgb(hex) {
    const n = Number.parseInt(String(hex).replace(/^#/, ""), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function fail(message) {
    throw new Error(`tracking-hud config: ${message}`);
  }

  function checkConfig(config) {
    if (!config || typeof config !== "object") fail("expected the film.config.js object");
    const { fps, shotFrames, timing, shots, palettes, screen, lens } = config;
    if (!Number.isInteger(fps) || fps <= 0) fail("fps must be a positive integer");
    if (!Number.isInteger(shotFrames) || shotFrames < 6) fail("shotFrames must be an integer of at least 6");
    if (!timing || !Number.isInteger(timing.typeEnd) || !Number.isInteger(timing.lockAt) || !Number.isInteger(timing.lockFrames) || !Number.isInteger(timing.chain)) fail("timing needs integer typeEnd, lockAt, lockFrames and chain");
    const { typeEnd, lockAt, lockFrames } = timing;
    if (!(typeEnd >= 1 && typeEnd < lockAt && lockFrames >= 1 && lockAt + lockFrames <= shotFrames)) fail(`timing: typing ends at shot frame ${typeEnd} and the lock holds frames ${lockAt}-${lockAt + lockFrames - 1}, in a shot of ${shotFrames} frames (0-${shotFrames - 1}); typing must end before the lock (1 <= typeEnd < lockAt) and the lock must end inside the shot (lockAt + lockFrames <= shotFrames, lockFrames >= 1)`);
    if (!(timing.typedAtCut >= 0 && timing.typedAtCut < 1)) fail("timing.typedAtCut must be in [0, 1)");
    if (!palettes || typeof palettes !== "object") fail("palettes must map names to five colours");
    for (const [name, stops] of Object.entries(palettes)) {
      if (!Array.isArray(stops) || stops.length !== 5 || stops.some((s) => !/^#[0-9a-f]{6}$/i.test(s))) fail(`palette ${name} needs five #rrggbb stops`);
    }
    if (!screen || !Array.isArray(screen.log) || !screen.log.length) fail("screen.log must list at least one line");
    if (!Array.isArray(shots) || !shots.length) fail("shots must be a non-empty array");
    for (const [i, s] of shots.entries()) {
      const at = `shots[${i}]`;
      if (!KINDS.includes(s.kind)) fail(`${at}.kind must be one of ${KINDS.join(", ")}`);
      if (typeof s.text !== "string") fail(`${at}.text must be a string`);
      if ((s.kind === "typing" || s.kind === "cursor") && !Array.from(s.text).some((ch) => !isSpace(ch))) fail(`${at} (${s.kind}) needs visible text`);
      if (s.kind === "typing" && isSpace(Array.from(s.text).at(-1))) fail(`${at}.text "${s.text}" ends with a space: the lock box would cover the whole line`);
      if (s.kind === "cursor" && Array.from(s.text).length > 2) fail(`${at} (cursor) holds a prompt of at most two characters`);
      if (s.lock !== undefined) {
        if (s.kind !== "typing") fail(`${at}.lock names the word a typing shot locks on; a ${s.kind} shot locks its own target`);
        if (typeof s.lock !== "string" || !s.lock.trim() || s.lock !== s.lock.trim()) fail(`${at}.lock must be a word or phrase of the typed line, without leading or trailing spaces`);
        if (!s.text.includes(s.lock)) fail(`${at}.lock "${s.lock}" is not in the typed line "${s.text}"`);
      }
      if (!palettes[s.palette]) fail(`${at}.palette ${s.palette} is not in palettes`);
      const c = s.camera || fail(`${at}.camera is missing`);
      for (const key of ["tiltX", "tiltY", "roll", "blur"]) if (!Number.isFinite(c[key])) fail(`${at}.camera.${key} must be a number`);
      for (const key of ["zoom", "pan"]) if (!Array.isArray(c[key]) || c[key].length !== 2 || !c[key].every(Number.isFinite)) fail(`${at}.camera.${key} must be [a, b]`);
      if (!(c.zoom[0] > 0 && c.zoom[1] > 0)) fail(`${at}.camera.zoom must be positive`);
      if (!Array.isArray(s.hero) || s.hero.length !== 2 || !s.hero.every(Number.isFinite)) fail(`${at}.hero must be [x, y]`);
      if (!(s.size > 0)) fail(`${at}.size must be positive`);
    }
    if (!lens || !Number.isInteger(lens.taps) || lens.taps < 1 || !Number.isInteger(lens.glowTaps) || lens.glowTaps < 1) fail("lens.taps and lens.glowTaps must be positive integers");
    const done = config.done;
    if (done !== undefined) {
      if (typeof done.label !== "string" || !done.label.trim()) fail("done.label must be visible text");
      if (!Array.isArray(done.center) || done.center.length !== 2 || !done.center.every(Number.isFinite)) fail("done.center must be [x, y]");
      if (!Array.isArray(done.size) || done.size.length !== 2 || !done.size.every((v) => Number.isFinite(v) && v > 0)) fail("done.size must be [width, height], both positive");
    }
  }

  function create(config) {
    checkConfig(config);
    const FPS = config.fps;
    const SHOT_FRAMES = config.shotFrames;
    const SHOTS = config.shots.length;
    const TOTAL_FRAMES = SHOT_FRAMES * SHOTS;
    const { typeEnd: TYPE_END, lockAt: LOCK_AT, lockFrames: LOCK_FRAMES, typedAtCut: TYPED_AT_CUT, chain: CHAIN } = config.timing;
    // Upstream fixes this at frame 11 of a 15-frame shot: the collapse ends. (Upstream also starts
    // a fade to black there; the port ends on the last shot's picture instead.)
    const SETTLE = SHOT_FRAMES - 4;
    const LOG = config.screen.log;
    const shots = config.shots.map((s) => {
      const chars = Array.from(s.text);
      return { ...s, chars, lockSpan: s.kind === "typing" ? lockSpan(chars, s.lock) : null, cam: { shake: 0, ...s.camera }, stops: config.palettes[s.palette].map(hexToRgb) };
    });
    const doneCfg = { label: "Done", center: [960, 540], size: [420, 132], ...(config.done || {}) };

    const shot0 = (i) => shots[Math.min(Math.max(i, 0), SHOTS - 1)];
    const split = (global) => {
      const g = Math.min(Math.max(global, 0), TOTAL_FRAMES - 1);
      return [Math.floor(g / SHOT_FRAMES), g % SHOT_FRAMES];
    };

    /** Characters of the hero line on screen at shot frame f. */
    function visible(si, f) {
      const s = shot0(si);
      const n = s.chars.length;
      if (s.kind !== "typing") return n;
      const p = F(Math.min(F(f / TYPE_END), 1));
      const share = F(F(TYPED_AT_CUT) + F(F(1 - F(TYPED_AT_CUT)) * p));
      return Math.min(n, Math.ceil(F(F(n) * share)));
    }

    /** Cell of character i of the hero line: [x, top, w, h]. */
    function cell(si, i) {
      const s = shot0(si);
      const adv = s.size * MONO_ADV;
      return [s.hero[0] + i * adv, s.hero[1] - s.size * 0.78, adv, s.size * 0.98];
    }

    /** Rows of the log for a shot: { text, x, y } (y = baseline). Rows near the hero line are left out. */
    function logRows(si) {
      const s = shot0(si);
      const rows = [];
      for (let r = 0; r < 1000; r += 1) {
        const y = 70 + r * LOG_LINE;
        if (y > H - 40) break;
        if (s.kind !== "collapse" && Math.abs(y - s.hero[1]) < s.size * 0.95 + 10 && y < s.hero[1] + 30) continue;
        if (s.kind !== "collapse" && y > s.hero[1] && y - s.hero[1] < 40) continue;
        rows.push({ text: LOG[(r + si * 2) % LOG.length], x: LOG_X, y });
      }
      return rows;
    }

    /** Icon squares in the log gutter, anchors for the tracker: [x, y, size]. */
    function icons(si) {
      return logRows(si)
        .map((row, r) => [row, r])
        .filter(([, r]) => rnd(si + 50, r) > F(0.62))
        .map(([row]) => [LOG_X - 64, row.y - 24, 30]);
    }

    function jitter(si, f, k, amp) {
      const a = si * 1000 + k * 37;
      return [(rnd(a, f) - 0.5) * 2 * amp, (rnd(a + 1, f + 999) - 0.5) * 2 * amp];
    }

    function boxed(x, y, w, h, pad, j, hatch) {
      return { x: x - pad + j[0], y: y - pad + j[1], w: w + 2 * pad, h: h + 2 * pad, hatch, locked: false };
    }

    const center = (b) => [b.x + b.w * 0.5, b.y + b.h * 0.5];

    function donePill() {
      return [doneCfg.center[0], doneCfg.center[1], doneCfg.size[0], doneCfg.size[1]];
    }
    function doneIcon() {
      const [cx, cy, w] = donePill();
      return [cx - w * 0.5 + 92, cy];
    }
    // The label starts 78 px right of the icon centre (upstream: cx - 40 in its 420 px pill), so a
    // wider pill keeps icon and label together.
    function doneLabel() {
      const [, cy] = donePill();
      return [doneIcon()[0] + 78, cy + 28];
    }

    /** Tracker state at shot frame f: boxes in chain order (last = target), tails, focus, lock. */
    function track(si, f) {
      const s = shot0(si);
      const lock = f >= LOCK_AT && f < LOCK_AT + LOCK_FRAMES;
      const boxes = [];
      const tails = [];

      // Two anchors on gutter icons near the hero line start every chain.
      const anchors = icons(si).sort((a, b) => Math.abs(a[1] - s.hero[1]) - Math.abs(b[1] - s.hero[1])).slice(0, 2);
      if (s.kind === "cursor" || s.kind === "typing") {
        anchors.forEach(([x, y, sz], k) => boxes.push(boxed(x, y, sz, sz, 5, jitter(si, f, 90 + k, 1.2), k === 0)));
      }

      if (s.kind === "typing") {
        const ch = s.chars;
        const n = visible(si, f);
        const idx = [];
        for (let i = 0; i < n; i += 1) if (!isSpace(ch[i])) idx.push(i);
        const from = Math.max(0, idx.length - CHAIN);
        idx.slice(from).forEach((i, k) => {
          const [x, y, w, h] = cell(si, i);
          const span = rnd(si, i + 7) > F(0.7) && i + 1 < n ? 2 : 1;
          const pad = 2 + rnd(si + 3, i) * 8;
          const hatch = rnd(si + 9, i) > F(0.35);
          boxes.push(boxed(x, y, w * span, h, pad, jitter(si, f, k, 1.6), hatch));
        });
        if (f >= LOCK_AT && boxes.length) {
          // The newest box grows over the locked word (`lock`, or the last word) and locks on it.
          const [start, end] = s.lockSpan;
          const [x0, y, , h] = cell(si, start);
          const [x1, , w1] = cell(si, end);
          const b = boxed(x0, y, x1 + w1 - x0, h, 10, jitter(si, f, 77, 0.8), true);
          b.locked = lock;
          boxes[boxes.length - 1] = b;
        }
      } else if (s.kind === "cursor") {
        const [x, y, w, h] = cell(si, 0);
        boxes.push(boxed(x, y, w, h, 6, jitter(si, f, 1, 1.5), false));
        const [cx, cy, cw, chh] = cell(si, 2);
        const b = boxed(cx, cy, cw * 0.8, chh, 8, jitter(si, f, 2, 1.5), true);
        b.locked = lock;
        boxes.push(b);
      } else if (s.kind === "collapse") {
        // Fourteen boxes spread over the log fall into one point and lock as a single box.
        const p = easeInOut(Math.min(f / SETTLE, 1));
        const c = s.hero;
        for (let k = 0; k < 14; k += 1) {
          const sx = 120 + rnd(77, k) * (W - 240);
          const sy = 90 + rnd(78, k) * (H - 180);
          const sw = 30 + rnd(79, k) * 90;
          const sh = 26 + rnd(80, k) * 60;
          const b = boxed(sx + (c[0] - 40 - sx) * p, sy + (c[1] - 40 - sy) * p, sw + (80 - sw) * p, sh + (80 - sh) * p, 0, jitter(si, f, k, 2.5 * (1 - p)), rnd(81, k) > F(0.4));
          b.locked = lock;
          boxes.push(b);
        }
        if (p >= 1) {
          boxes.length = 1;
          boxes[0] = boxed(c[0] - 40, c[1] - 40, 80, 80, 0, jitter(si, f, 3, 1), true);
          boxes[0].locked = lock;
        }
      } else {
        const [ix, iy] = doneIcon();
        boxes.push(boxed(ix - 38, iy - 32, 76, 64, 0, jitter(si, f, 1, 1.2), true));
        const [dx, dy] = doneLabel();
        const b = boxed(dx + 1, dy - 62, 44, 70, 3, jitter(si, f, 2, 1.2), false);
        b.locked = lock;
        boxes.push(b);
      }

      for (const [box, seed, salt] of [[boxes[0], si + 200, 1], [boxes[boxes.length - 1], si + 201, 2]]) {
        if (!box) continue;
        const c = center(box);
        const a = rnd(seed, salt) * TAU;
        tails.push([c, [c[0] + Math.cos(a) * 2600, c[1] + Math.sin(a) * 2600]]);
      }
      const focus = boxes.length ? center(boxes[boxes.length - 1]) : [s.hero[0], s.hero[1]];
      return { boxes, tails, focus, lock };
    }

    /** Camera state for one video frame. */
    function shot(global) {
      const [si, f] = split(global);
      const s = shot0(si);
      const t = f / (SHOT_FRAMES - 1);
      // The aim trails the target over the last four frames and leans to the hero line.
      let sx = 0;
      let sy = 0;
      for (let k = 0; k < 4; k += 1) {
        const p = track(si, Math.max(0, f - k)).focus;
        sx += p[0];
        sy += p[1];
      }
      const lag = [sx / 4, sy / 4];
      let heroMid = s.hero;
      if (s.kind === "typing" || s.kind === "cursor") {
        const [x, y, w, h] = cell(si, Math.floor(Math.max(0, visible(si, f) - 1) / 2));
        heroMid = [x + w * 0.5, y + h * 0.5];
      }
      const sh = [(rnd(si + 400, f) - 0.5) * 2 * s.cam.shake, (rnd(si + 401, f) - 0.5) * 2 * s.cam.shake];
      const aim = [
        lag[0] * 0.72 + heroMid[0] * 0.28 + s.cam.pan[0] * (t - 0.5) + sh[0],
        lag[1] * 0.72 + heroMid[1] * 0.28 + s.cam.pan[1] * (t - 0.5) + sh[1],
      ];
      const zt = easeOut(t);
      // A slow sway keeps every shot hand-held.
      const sway = Math.sin(si * 1.7 + t * 1.3) * 0.015;
      const tr = track(si, f);
      return {
        frame: Math.min(Math.max(global, 0), TOTAL_FRAMES - 1),
        shotIndex: si,
        shotFrame: f,
        time: Math.min(Math.max(global, 0), TOTAL_FRAMES - 1) / FPS,
        aim,
        focus: tr.focus,
        zoom: s.cam.zoom[0] + (s.cam.zoom[1] - s.cam.zoom[0]) * zt,
        tiltX: s.cam.tiltX + sway,
        tiltY: s.cam.tiltY - sway * 0.7,
        roll: s.cam.roll + sway * 0.4,
        blur: s.cam.blur,
        palette: s.palette,
        stops: s.stops,
        lock: tr.lock,
        cut: f === 0 ? 1 : f === 1 ? 0.45 : f === 2 ? 0.15 : 0,
        seed: si * 31 + f,
      };
    }

    // Same rotation as rotation() in the lens shader: Rz * Ry * Rx (column-major matrices).
    function rotate(s, v) {
      const [cx, sx] = [Math.cos(s.tiltX), Math.sin(s.tiltX)];
      const [cy, sy] = [Math.cos(s.tiltY), Math.sin(s.tiltY)];
      const [cz, sz] = [Math.cos(s.roll), Math.sin(s.roll)];
      const mul = (cols, u) => [
        cols[0][0] * u[0] + cols[1][0] * u[1] + cols[2][0] * u[2],
        cols[0][1] * u[0] + cols[1][1] * u[1] + cols[2][1] * u[2],
        cols[0][2] * u[0] + cols[1][2] * u[1] + cols[2][2] * u[2],
      ];
      const rx = [[1, 0, 0], [0, cx, sx], [0, -sx, cx]];
      const ry = [[cy, 0, -sy], [0, 1, 0], [sy, 0, cy]];
      const rz = [[cz, sz, 0], [-sz, cz, 0], [0, 0, 1]];
      return mul(rz, mul(ry, mul(rx, v)));
    }

    /** Where a logical point of the screen lands in a resW x resH lens output; null behind the camera. */
    function project(s, q, resW, resH) {
      const k = (FOCAL * H) / s.zoom;
      const lx = (q[0] - s.aim[0]) / k;
      const ly = (q[1] - s.aim[1]) / k;
      const eu = rotate(s, [1, 0, 0]);
      const ev = rotate(s, [0, 1, 0]);
      const p = [eu[0] * lx + ev[0] * ly, eu[1] * lx + ev[1] * ly, 1 + eu[2] * lx + ev[2] * ly];
      if (p[2] <= 0.05) return null;
      return [((FOCAL * p[0]) / p[2]) * resH + 0.5 * resW, ((FOCAL * p[1]) / p[2]) * resH + 0.5 * resH];
    }

    /** Sound events, in video frames. collapse/done are null when the film has no such shot. */
    function events() {
      const e = { cuts: [], locks: [], keys: [], collapse: null, done: null };
      for (let si = 0; si < SHOTS; si += 1) {
        const g0 = si * SHOT_FRAMES;
        e.cuts.push(g0);
        e.locks.push(g0 + LOCK_AT);
        if (shots[si].kind === "typing") for (let f = 1; f <= TYPE_END; f += 1) if (visible(si, f) > visible(si, f - 1)) e.keys.push(g0 + f);
        if (shots[si].kind === "collapse" && e.collapse === null) e.collapse = g0;
        if (shots[si].kind === "done" && e.done === null) e.done = g0;
      }
      return e;
    }

    const sec = (frame) => Number((frame / FPS).toFixed(4));
    const r1 = (v) => Number(v.toFixed(1));

    /** The upstream tracks.json document (seconds), the sound's input. */
    function tracksJson() {
      const e = events();
      const focus = [];
      for (let g = 0; g < TOTAL_FRAMES; g += 1) {
        const p = shot(g).focus;
        focus.push([r1(p[0]), r1(p[1])]);
      }
      return {
        fps: FPS,
        frames: TOTAL_FRAMES,
        seconds: sec(TOTAL_FRAMES),
        cuts: e.cuts.map(sec),
        locks: e.locks.map(sec),
        keys: e.keys.map(sec),
        collapse: e.collapse === null ? null : sec(e.collapse),
        done: e.done === null ? null : sec(e.done),
        focus,
      };
    }

    /** The upstream camera.json rows: camera per frame and where the target lands at W x H. */
    function cameraJson() {
      const frames = [];
      for (let g = 0; g < TOTAL_FRAMES; g += 1) {
        const s = shot(g);
        const fp = project(s, s.focus, W, H) || [960, 540];
        const cp = project(s, [W * 0.5, H * 0.5], W, H) || [960, 540];
        frames.push({ aim: s.aim, zoom: s.zoom, tilt_x: s.tiltX, tilt_y: s.tiltY, roll: s.roll, lock: s.lock, focus_screen: fp, centre_screen: cp });
      }
      return { fps: FPS, frames };
    }

    const corners = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    /** Output-pixel bounds [x0, y0, x1, y1] of screen rectangle [x, y, w, h] filmed by shot s; null when a corner is behind the camera. */
    function filmedBounds(s, rect, resW = W, resH = H) {
      const pts = corners(...rect).map((q) => project(s, q, resW, resH));
      if (pts.some((p) => !p)) return null;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    const span = (b) => `x ${Math.round(b[0])}..${Math.round(b[2])}, y ${Math.round(b[1])}..${Math.round(b[3])}`;
    const contrast = (a, b) => {
      const lum = (c) => c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    /** The Done pill with its outer ring, as a screen rectangle. */
    function donePillRect() {
      const [cx, cy, w, h] = donePill();
      return [cx - w / 2 - 16, cy - h / 2 - 16, w + 32, h + 32];
    }

    /** Upstream self-tests (`cargo test -p hud`) plus the checks new content needs, as data: an
     * empty list means the config is usable. */
    function problems() {
      const out = [];
      for (let si = 0; si < SHOTS; si += 1) {
        const s = shots[si];
        const n = s.chars.length;
        if (n > 0) {
          const [x, , w] = cell(si, n - 1);
          if (x + w >= W - 60) out.push(`shot ${si + 1}: the line "${s.text}" runs past the screen edge (ends at x ${Math.round(x + w)}, limit ${W - 60})`);
        }
        if (s.kind !== "typing" && s.kind !== "cursor") continue;
        const [x0, top, , h] = cell(si, 0);
        if (x0 < SCREEN.left) out.push(`shot ${si + 1}: the line "${s.text}" starts at x ${Math.round(x0)}, left of the screen margin ${SCREEN.left}`);
        if (top < SCREEN.top) out.push(`shot ${si + 1}: the line "${s.text}" reaches up to y ${Math.round(top)}, into the title bar (glyph cells must stay below y ${SCREEN.top}: lower hero[1] or reduce size)`);
        if (top + h > SCREEN.bottom) out.push(`shot ${si + 1}: the line "${s.text}" reaches down to y ${Math.round(top + h)}, into the status bar (glyph cells must stay above y ${SCREEN.bottom}: raise hero[1] or reduce size)`);
      }
      const before = LOCK_AT / FPS;
      const after = (SHOT_FRAMES - LOCK_AT) / FPS;
      if (before < SYNC_SEC || after < SYNC_SEC) out.push(`timing: each lock ping (shot frame ${LOCK_AT}) lands ${before.toFixed(3)} s after its cut and ${after.toFixed(3)} s before the next; keep it at least ${SYNC_SEC} s from both (the render gate's audio-sync window), or ping and cut glitch merge and the cut-sync measure counts the ping as the cut`);
      for (const name of new Set(shots.map((s) => s.palette))) {
        const stops = config.palettes[name];
        const ratio = contrast(hexToRgb(stops[4]), hexToRgb(stops[0]));
        if (ratio < MIN_CONTRAST) {
          const used = shots.map((s, i) => (s.palette === name ? i + 1 : 0)).filter(Boolean).join(", ");
          out.push(`palette ${name} (shot ${used}): text stop ${stops[4]} on background stop ${stops[0]} is ${ratio.toFixed(2)}:1, below ${MIN_CONTRAST}:1 (WCAG large text, as the composition gate requires); the filmed screen reads as a blank field and cuts between shots go unseen`);
        }
      }
      if (shots.some((s) => s.kind === "done")) {
        const [px, py, pw, ph] = donePillRect();
        if (px < SCREEN.left || py < SCREEN.top || px + pw > SCREEN.right || py + ph > SCREEN.bottom) out.push(`done: the pill and its ring span x ${Math.round(px)}..${Math.round(px + pw)}, y ${Math.round(py)}..${Math.round(py + ph)}, outside the screen area x ${SCREEN.left}..${SCREEN.right}, y ${SCREEN.top}..${SCREEN.bottom}; move done.center or shrink done.size`);
        const [cx, , w, h] = donePill();
        const labelEnd = doneLabel()[0] + Array.from(doneCfg.label).length * 80 * MONO_ADV;
        const inner = cx + w / 2 - 24;
        if (labelEnd > inner) out.push(`done.label "${doneCfg.label}" ends at x ${Math.round(labelEnd)}, past the pill's inner edge ${Math.round(inner)}; set done.size to at least [${Math.ceil(w + labelEnd - inner)}, ${h}]`);
      }
      for (let g = 0; g < TOTAL_FRAMES; g += 1) {
        const s = shot(g);
        const [si, f] = split(g);
        if (!track(si, f).boxes.length) out.push(`frame ${g}: no tracker box`);
        if (!(s.focus[0] > 0 && s.focus[0] < W && s.focus[1] > 0 && s.focus[1] < H)) out.push(`frame ${g} (shot ${si + 1}): target ${s.focus.map(Math.round).join(",")} is off the screen`);
        const p = project(s, s.focus, W, H);
        if (!p) out.push(`frame ${g} (shot ${si + 1}): target is behind the camera`);
        else if (!(p[0] > SAFE_FRAME.left && p[0] < SAFE_FRAME.right && p[1] > SAFE_FRAME.top && p[1] < SAFE_FRAME.bottom)) out.push(`frame ${g} (shot ${si + 1}): target lands at ${Math.round(p[0])},${Math.round(p[1])}, outside the safe frame ${SAFE_FRAME.left}-${SAFE_FRAME.right} x ${SAFE_FRAME.top}-${SAFE_FRAME.bottom}`);
      }
      // The film ends on its subject: the whole Done pill, or the last shot's target box.
      const last = TOTAL_FRAMES - 1;
      const [ls, lf] = split(last);
      const kind = shots[ls].kind;
      const target = track(ls, lf).boxes.at(-1);
      const subject = kind === "done" ? donePillRect() : target && [target.x, target.y, target.w, target.h];
      const bounds = subject && filmedBounds(shot(last), subject);
      if (subject && !(bounds && bounds[0] >= 0 && bounds[1] >= 0 && bounds[2] <= W && bounds[3] <= H)) out.push(`frame ${last} (last frame, shot ${ls + 1}): the ${kind === "done" ? "Done pill" : "target box"} is not whole in the frame (${bounds ? span(bounds) : "behind the camera"}); the film would end on part of its subject or on an empty screen. Zoom the last shot out or re-aim it`);
      return out;
    }

    return {
      config,
      rnd,
      W,
      H,
      FPS,
      FOCAL,
      LOG_SIZE,
      LOG_X,
      MONO_ADV,
      SHOT_FRAMES,
      SHOTS,
      TOTAL_FRAMES,
      DURATION: TOTAL_FRAMES / FPS,
      TYPE_END,
      LOCK_AT,
      LOCK_FRAMES,
      shots,
      lens: config.lens,
      split,
      visible,
      cell,
      logRows,
      icons,
      track,
      shot,
      project,
      events,
      tracksJson,
      cameraJson,
      problems,
      center,
      donePill,
      donePillRect,
      doneIcon,
      doneLabel,
      filmedBounds,
      easeOut,
    };
  }

  return { create, rnd, hexToRgb, W, H, FOCAL, SCREEN, SAFE_FRAME, SYNC_SEC, MIN_CONTRAST };
});
