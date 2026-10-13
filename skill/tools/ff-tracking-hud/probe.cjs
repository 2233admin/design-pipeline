"use strict";

// Tracking HUD self-test: is every sampled frame deterministic, and do the tracker labels land on
// what the lens films? Run it in the project after `node build.cjs`, in the GPU mode and pixel
// ratio of the render you deliver (HyperFrames --browser-gpu / --no-browser-gpu, landscape-4k = 2):
//
//   node probe.cjs [--gpu auto|hardware|software] [--dpr 1|2] [--frames 4,9,13] [--chrome <exe>]
//
// It serves this directory over local HTTP, opens index.html in the HyperFrames headless Chrome
// with HyperFrames' GPU flags, and writes evidence/self-test.json:
// - determinism: SHA-256 of the page screenshot (what HyperFrames captures) and of the lens
//   pixels for every sampled frame after forward, backward and shuffled seeks of the paused
//   timeline, and again in a second browser process; any difference fails;
// - labels: each drawn label equals the rounded projection of its box centre;
// - markers: a dot at every tracker box centre, filmed through the lens camera (perspective,
//   exact sampling), lands within MARKER_TOLERANCE_PX of the position its label states;
// - glyphs: every boxed hero glyph, filmed through the lens camera with and without that glyph
//   (perspective, exact sampling): the centroid of the difference lands within
//   GLYPH_TOLERANCE_PX of where the CPU camera (tracks project(), as the labels use) puts the
//   glyph's ink, each ink pixel projected and weighted by its projected area (frames without the
//   cut or lock tear). The same measurement with the film's LED-cell sampling (ledShiftPx; halfCellPx is
//   half an LED cell at that glyph) and through the full lens (fullLensShiftPx: depth of field
//   gathers glyph light toward the defocused side) is reported, not judged: labels, like
//   upstream's, mark the geometric position the LED wall and the blur are built around.
// Exit 0 passed, 2 failed, 1 environment or usage error (no Chrome, no WebGL2, bad option).
// Passing is technical conformance of this composition, never creative or visual acceptance.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");

// In output pixels of a 1920 x 1080 frame; fixed before measuring.
const MARKER_TOLERANCE_PX = 1;
const GLYPH_TOLERANCE_PX = 3;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".cjs": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".ttf": "font/ttf", ".wav": "audio/wav", ".png": "image/png" };

function usage(message) {
  return Object.assign(new Error(`${message}\nusage: node probe.cjs [--gpu auto|hardware|software] [--dpr 1|2] [--frames 4,9,13] [--chrome <exe>] [--out evidence/self-test.json]`), { exitCode: 1 });
}

function parseArgs(argv) {
  const options = { gpu: "auto", dpr: 1, frames: null, chrome: null, out: "evidence/self-test.json" };
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (!["--gpu", "--dpr", "--frames", "--chrome", "--out"].includes(flag) || value === undefined) throw usage(`unknown or incomplete option ${flag}`);
    if (flag === "--gpu") {
      if (!["auto", "hardware", "software"].includes(value)) throw usage("--gpu must be auto, hardware or software");
      options.gpu = value;
    } else if (flag === "--dpr") {
      if (!["1", "2"].includes(value)) throw usage("--dpr must be 1 (1080p) or 2 (landscape-4k)");
      options.dpr = Number(value);
    } else if (flag === "--frames") {
      options.frames = value.split(",").map((v) => Number(v.trim()));
      if (!options.frames.length || options.frames.some((v) => !Number.isInteger(v) || v < 0)) throw usage("--frames must list frame numbers");
    } else options[flag.slice(2)] = value;
  }
  return options;
}

function newestChrome() {
  const root = path.join(os.homedir(), ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  if (!fs.existsSync(root)) return null;
  const exe = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  for (const build of fs.readdirSync(root).sort().reverse()) {
    for (const sub of fs.readdirSync(path.join(root, build))) {
      const candidate = path.join(root, build, sub, exe);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function environment(dir, options) {
  let puppeteer;
  try {
    puppeteer = require(require.resolve("puppeteer-core", { paths: [dir, process.cwd()] }));
  } catch {
    throw Object.assign(new Error("puppeteer-core not found. Fix: run `npm install` in this project (hyperframes installs it)"), { exitCode: 1 });
  }
  const chrome = options.chrome || process.env.HYPERFRAMES_BROWSER_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || newestChrome();
  if (!chrome || !fs.existsSync(chrome)) throw Object.assign(new Error("HyperFrames headless Chrome not found. Fix: run `npx --no-install hyperframes browser ensure`, or pass --chrome <exe>"), { exitCode: 1 });
  return { puppeteer, chrome };
}

// HyperFrames' Chrome flags for its two browser GPU modes (engine getBrowserGpuArgs, 0.8.137).
function gpuArgs(mode) {
  if (mode === "software") return ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  if (process.platform === "darwin") return ["--use-gl=angle", "--use-angle=metal", "--enable-gpu-rasterization"];
  if (process.platform === "win32") return ["--use-gl=angle", "--use-angle=d3d11", "--enable-gpu-rasterization"];
  return ["--use-gl=angle", "--use-angle=gl-egl", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--disable-software-rasterizer"];
}

function serve(dir) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
    const file = path.resolve(root, rel || "index.html");
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// Functions evaluated in the page.
const PAGE = {
  ready: () => Boolean(window.__timelines?.main && window.__ffTracking && (window.__ffTracking.draws > 0 || window.__ffTracking.error)),
  // Seeks the registered paused timeline as the HyperFrames renderer does; returns the frame the
  // composition drew and the SHA-256 of the lens pixels.
  async seek(frame) {
    const s = window.__ffTracking;
    const tl = window.__timelines.main;
    tl.pause();
    tl.totalTime(frame / s.T.FPS, false);
    const digest = await crypto.subtle.digest("SHA-256", s.lens.read().data);
    return { drawn: s.frame, lens: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("") };
  },
  measure(frame, tolerances) {
    const s = window.__ffTracking;
    const { T, flat, flatCanvas, lens } = s;
    const shot = T.shot(frame);
    const ratio = lens.pixelRatio;
    const flatScale = T.lens.flatScale;
    const fctx = flatCanvas.getContext("2d");
    const round2 = (p) => p.map((v) => +v.toFixed(2));
    // Centroid of what differs between two RGBA patches; `at` maps a patch pixel centre to output
    // pixels and its area there (default: the patch is already in output pixels).
    const centroidOf = (a, b, width, height, x0, y0, at = (x, y) => [x, y, 1]) => {
      let sw = 0;
      let sx = 0;
      let sy = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const w = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
          if (!w) continue;
          const p = at(x0 + x + 0.5, y0 + y + 0.5);
          if (!p) continue;
          sw += w * p[2];
          sx += w * p[2] * p[0];
          sy += w * p[2] * p[1];
        }
      }
      return sw ? [sx / sw, sy / sw] : null;
    };
    // A flat-screen pixel as the lens camera films it: its projected centre and the area it covers
    // there. A perspective warp scales area unevenly, so the filmed centroid of a glyph is the
    // area-weighted mean of its projected pixels, not the projection of its flat centroid.
    const filmedPixel = (fx, fy) => {
      const q = [fx / flatScale, fy / flatScale];
      const p = T.project(shot, q, T.W, T.H);
      const px = T.project(shot, [q[0] + 1 / flatScale, q[1]], T.W, T.H);
      const py = T.project(shot, [q[0], q[1] + 1 / flatScale], T.W, T.H);
      if (!p || !px || !py) return null;
      return [p[0], p[1], Math.abs((px[0] - p[0]) * (py[1] - p[1]) - (px[1] - p[1]) * (py[0] - p[0]))];
    };
    const lensWindow = (c, r) => {
      const x0 = Math.max(0, Math.floor(c[0] * ratio - r * ratio));
      const y0 = Math.max(0, Math.floor(c[1] * ratio - r * ratio));
      const x1 = Math.min(lens.canvas.width, Math.ceil(c[0] * ratio + r * ratio));
      const y1 = Math.min(lens.canvas.height, Math.ceil(c[1] * ratio + r * ratio));
      return { x0, y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
    };
    const readLens = (win) => {
      const gl = lens.gl;
      const data = new Uint8Array(win.w * win.h * 4);
      gl.readPixels(win.x0, lens.canvas.height - win.y0 - win.h, win.w, win.h, gl.RGBA, gl.UNSIGNED_BYTE, data);
      const rows = new Uint8Array(data.length);
      for (let y = 0; y < win.h; y += 1) rows.set(data.subarray((win.h - 1 - y) * win.w * 4, (win.h - y) * win.w * 4), y * win.w * 4);
      return rows;
    };
    // Output-pixel centroid of what changes when `paint(true)` replaces `paint(false)`.
    const filmedDifference = (win, paint, opts) => {
      paint(true);
      lens.draw(shot, flatCanvas, opts);
      const a = readLens(win);
      paint(false);
      lens.draw(shot, flatCanvas, opts);
      const b = readLens(win);
      const c = centroidOf(a, b, win.w, win.h, win.x0, win.y0);
      return c && [c[0] / ratio, c[1] / ratio];
    };
    const inFrame = (p, margin) => p && p[0] > margin && p[1] > margin && p[0] < T.W - margin && p[1] < T.H - margin;

    // Labels as drawn by the overlay, and the projection they must state.
    const drawn = s.overlay.draw(shot);
    const track = T.track(shot.shotIndex, shot.shotFrame);
    const labels = drawn.labels.map((label) => {
      const c = T.project(shot, T.center(track.boxes[label.box]), T.W, T.H);
      const expected = `${label.locked ? "LOCK " : ""}x: ${Math.round(c[0])} y: ${Math.round(c[1])}`;
      return { box: label.box, text: label.text, expected, ok: label.text === expected };
    });

    // Markers: a dot at each box centre on a black screen, perspective only, exact sampling.
    const markers = [];
    track.boxes.forEach((box, k) => {
      const c = T.center(box);
      const label = T.project(shot, c, T.W, T.H);
      if (!inFrame(label, 40)) return;
      const paint = (dot) => {
        fctx.setTransform(1, 0, 0, 1, 0, 0);
        fctx.fillStyle = "#000";
        fctx.fillRect(0, 0, flatCanvas.width, flatCanvas.height);
        if (!dot) return;
        fctx.setTransform(flatScale, 0, 0, flatScale, 0, 0);
        fctx.fillStyle = "#fff";
        fctx.beginPath();
        fctx.arc(c[0], c[1], 1.5, 0, Math.PI * 2);
        fctx.fill();
      };
      const measured = filmedDifference(lensWindow(label, 40), paint, { stage: 0, quantize: false });
      const errorPx = measured ? Math.hypot(measured[0] - label[0], measured[1] - label[1]) : null;
      markers.push({ box: k, label: round2(label), measured: measured && round2(measured), errorPx: errorPx === null ? null : +errorPx.toFixed(3), ok: errorPx !== null && errorPx <= tolerances.marker });
    });

    // Glyphs: each boxed hero glyph with and without it, on the flat screen and through the lens.
    const glyphs = [];
    const torn = shot.cut > 0 || shot.lock;
    const sh = T.shots[shot.shotIndex];
    if ((sh.kind === "typing" || sh.kind === "cursor") && !torn) {
      const n = T.visible(shot.shotIndex, shot.shotFrame);
      const boxed = new Set();
      for (const box of track.boxes) {
        for (let i = 0; i < n; i += 1) {
          const [x, y, w, h] = T.cell(shot.shotIndex, i);
          if (x + w / 2 > box.x && x + w / 2 < box.x + box.w && y + h / 2 > box.y && y + h / 2 < box.y + box.h && !/\s/u.test(sh.chars[i])) boxed.add(i);
        }
      }
      for (const i of [...boxed].sort((p, q) => p - q)) {
        const [x, y, w, h] = T.cell(shot.shotIndex, i);
        const cellCentre = T.project(shot, [x + w / 2, y + h / 2], T.W, T.H);
        const corners = [T.project(shot, [x, y], T.W, T.H), T.project(shot, [x + w, y + h], T.W, T.H)];
        if (!inFrame(cellCentre, 0) || !corners.every(Boolean)) continue;
        // Ink centroid on the flat screen, from the region around the cell.
        const fx0 = Math.max(0, Math.floor((x - w) * flatScale));
        const fy0 = Math.max(0, Math.floor((y - h * 0.3) * flatScale));
        const fw = Math.min(flatCanvas.width - fx0, Math.ceil(w * 3 * flatScale));
        const fh = Math.min(flatCanvas.height - fy0, Math.ceil(h * 1.6 * flatScale));
        flat.draw(frame);
        const fa = fctx.getImageData(fx0, fy0, fw, fh).data;
        flat.draw(frame, { omitGlyph: i });
        const fb = fctx.getImageData(fx0, fy0, fw, fh).data;
        const ink = centroidOf(fa, fb, fw, fh, fx0, fy0);
        const expected = centroidOf(fa, fb, fw, fh, fx0, fy0, filmedPixel);
        if (!ink || !expected) continue;
        const reach = Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) + 130;
        const win = lensWindow(cellCentre, reach);
        const paint = (with_) => flat.draw(frame, with_ ? {} : { omitGlyph: i });
        const shift = (p) => (p ? +Math.hypot(p[0] - expected[0], p[1] - expected[1]).toFixed(3) : null);
        const camera = filmedDifference(win, paint, { stage: 0, quantize: false });
        const led = filmedDifference(win, paint, { stage: 0 });
        const full = filmedDifference(win, paint, { stage: 4 });
        const errorPx = shift(camera);
        const ink0 = [ink[0] / flatScale, ink[1] / flatScale];
        const step = T.project(shot, [ink0[0] + T.lens.cell / 2, ink0[1]], T.W, T.H);
        glyphs.push({
          glyph: i,
          char: sh.chars[i],
          expected: round2(expected),
          measured: camera && round2(camera),
          errorPx,
          ok: errorPx !== null && errorPx <= tolerances.glyph,
          halfCellPx: step ? +Math.hypot(step[0] - expected[0], step[1] - expected[1]).toFixed(3) : null,
          ledShiftPx: shift(led),
          fullLensShiftPx: shift(full),
        });
      }
    }
    s.draw(frame);
    return { frame, shot: shot.shotIndex + 1, shotFrame: shot.shotFrame, torn, labels, markers, glyphs };
  },
};

async function openPage(env, url, mode, dpr) {
  const browser = await env.puppeteer.launch({
    executablePath: env.chrome,
    headless: true,
    args: ["--no-sandbox", "--enable-webgl", "--ignore-gpu-blocklist", ...gpuArgs(mode), "--font-render-hinting=none", "--force-color-profile=srgb", "--window-size=1920,1080", "--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: dpr });
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(PAGE.ready, { timeout: 60000 });
    const state = await page.evaluate(() => {
      const s = window.__ffTracking;
      return { error: s.error, renderer: s.renderer, dpr: window.devicePixelRatio, frames: s.T.TOTAL_FRAMES, shotFrames: s.T.SHOT_FRAMES, lockAt: s.T.LOCK_AT, shots: s.T.SHOTS };
    });
    return { browser, page, errors, state };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Seeks each frame in the given order and hashes what HyperFrames would capture.
async function hashFrames(page, frames) {
  const out = {};
  for (const frame of frames) {
    const { drawn, lens } = await page.evaluate(PAGE.seek, frame);
    const screen = await page.screenshot({ type: "png", captureBeyondViewport: false });
    out[frame] = { drawn, lens, screen: sha256(screen) };
  }
  return out;
}

function defaultFrames(state) {
  const frames = [];
  for (let si = 0; si < state.shots; si += 1) {
    const g0 = si * state.shotFrames;
    for (const f of [4, state.lockAt, state.shotFrames - 2]) frames.push(g0 + Math.min(f, state.shotFrames - 1));
  }
  return [...new Set(frames)].sort((a, b) => a - b);
}

async function selfTest(dir, options) {
  const env = environment(dir, options);
  const server = await serve(dir);
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  let first = null;
  try {
    let mode = options.gpu === "auto" ? "hardware" : options.gpu;
    first = await openPage(env, url, mode, options.dpr);
    if (options.gpu === "auto" && /swiftshader/i.test(String(first.state.renderer?.renderer))) {
      // As HyperFrames' auto probe: no hardware WebGL here, so the render uses SwiftShader.
      await first.browser.close();
      mode = "software";
      first = await openPage(env, url, mode, options.dpr);
    }
    if (first.state.error) throw Object.assign(new Error(first.state.error), { exitCode: 1 });
    const frames = options.frames || defaultFrames(first.state);
    if (frames.some((f) => f >= first.state.frames)) throw usage(`--frames must be below ${first.state.frames}`);
    const shuffled = frames.map((f, i) => [f, ((i + 1) * 7919) % 104729]).sort((a, b) => a[1] - b[1]).map(([f]) => f);
    const runs = [await hashFrames(first.page, frames), await hashFrames(first.page, [...frames].reverse()), await hashFrames(first.page, shuffled)];
    const second = await openPage(env, url, mode, options.dpr);
    try {
      runs.push(await hashFrames(second.page, [...frames].reverse()));
    } finally {
      await second.browser.close();
    }
    const determinism = frames.map((frame) => {
      const seen = runs.map((run) => run[frame]);
      const identical = seen.every((h) => h.drawn === frame && h.lens === seen[0].lens && h.screen === seen[0].screen);
      return { frame, identical, screen: seen[0].screen, lens: seen[0].lens, ...(identical ? {} : { runs: seen }) };
    });
    const tolerances = { marker: MARKER_TOLERANCE_PX, glyph: GLYPH_TOLERANCE_PX };
    const measured = [];
    for (const frame of frames) measured.push(await first.page.evaluate(PAGE.measure, frame, tolerances));
    const all = (key) => measured.flatMap((m) => m[key]);
    const worst = (list, key) => (list.length ? +Math.max(...list.map((m) => m[key] ?? Number.POSITIVE_INFINITY)).toFixed(3) : null);
    const mean = (list, key) => (list.length ? +(list.reduce((sum, m) => sum + (m[key] ?? 0), 0) / list.length).toFixed(3) : null);
    const checks = {
      determinism: determinism.every((d) => d.identical),
      labels: all("labels").every((l) => l.ok),
      markers: all("markers").length > 0 && all("markers").every((m) => m.ok),
      glyphs: all("glyphs").length > 0 && all("glyphs").every((g) => g.ok),
      pageErrors: first.errors.length === 0,
    };
    return {
      tool: "tracking-hud probe",
      status: Object.values(checks).every(Boolean) ? "passed" : "failed",
      checks,
      browser: { chrome: env.chrome, gpu: mode, requested: options.gpu, renderer: first.state.renderer, devicePixelRatio: first.state.dpr },
      tolerancesPx: tolerances,
      summary: {
        frames: frames.length,
        identicalFrames: determinism.filter((d) => d.identical).length,
        labels: all("labels").length,
        markers: all("markers").length,
        worstMarkerErrorPx: worst(all("markers"), "errorPx"),
        glyphs: all("glyphs").length,
        worstGlyphErrorPx: worst(all("glyphs"), "errorPx"),
        meanGlyphErrorPx: mean(all("glyphs"), "errorPx"),
        worstLedShiftPx: worst(all("glyphs"), "ledShiftPx"),
        worstHalfCellPx: worst(all("glyphs"), "halfCellPx"),
        worstFullLensShiftPx: worst(all("glyphs"), "fullLensShiftPx"),
        meanFullLensShiftPx: mean(all("glyphs"), "fullLensShiftPx"),
      },
      pageErrors: first.errors,
      determinism,
      frames: measured,
      creativeAcceptance: "not-assessed",
    };
  } finally {
    if (first) await first.browser.close().catch(() => {});
    server.close();
  }
}

if (require.main === module) {
  (async () => {
    try {
      const options = parseArgs(process.argv.slice(2));
      const result = await selfTest(__dirname, options);
      const out = path.resolve(__dirname, options.out);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
      console.log(JSON.stringify({ status: result.status, checks: result.checks, browser: result.browser, summary: result.summary, output: path.relative(__dirname, out) }, null, 2));
      process.exit(result.status === "passed" ? 0 : 2);
    } catch (error) {
      console.error(error.message);
      process.exit(error.exitCode || 1);
    }
  })();
}

module.exports = { GLYPH_TOLERANCE_PX, MARKER_TOLERANCE_PX, defaultFrames, gpuArgs, parseArgs, selfTest };
