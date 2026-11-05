"use strict";

// `composition capture --seek` on a HyperFrames composition must show what `hyperframes render`
// shows at that time: clips outside their data-start/data-duration window are hidden (#269).
// The check compares the capture with the real render frame, not with a re-implementation.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PNG } = require("pngjs");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");

const repo = path.resolve(__dirname, "..");
const cli = path.join(repo, "skill/scripts/designer-pipeline.cjs");

function tools() {
  try {
    const puppeteerModule = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE || require.resolve("puppeteer-core");
    resolvePuppeteer(process.cwd(), puppeteerModule);
    const hyperframes = path.dirname(require.resolve("hyperframes/package.json"));
    return { puppeteerModule, chrome: resolveBrowser(), gsap: require.resolve("gsap/dist/gsap.min.js"), hyperframes };
  } catch (error) {
    if (!["TOOL_MISSING", "MODULE_NOT_FOUND"].includes(error.code)) throw error;
    return { skip: `browser, GSAP or HyperFrames unavailable: ${error.message}` };
  }
}
const TOOLS = tools();
// The render comparison runs `hyperframes render`, which needs ffmpeg and ffprobe on PATH even for a
// PNG sequence; film render checks skip without them (AGENTS.md), and the CI QA runner has neither.
// The capture-only tests below still run there.
const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { windowsHide: true }).status === 0 && spawnSync("ffprobe", ["-version"], { windowsHide: true }).status === 0;
const RENDER_SKIP = TOOLS.skip || (!hasFfmpeg && "ffmpeg and ffprobe not on PATH (hyperframes render needs them)");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "dp-capture-seek-"));

// Three clips: #world for the whole film, #early 0-1 s (ends exactly at a sampled time), #late
// 2-3 s. The timeline also moves #always, so the frame depends on both clock parts.
function film(dir, { withRuntime, fps = null, comment = "" }) {
  fs.mkdirSync(path.join(dir, "lib"), { recursive: true });
  fs.copyFileSync(TOOLS.gsap, path.join(dir, "lib/gsap.min.js"));
  if (withRuntime) {
    fs.mkdirSync(path.join(dir, "node_modules"), { recursive: true });
    fs.symlinkSync(TOOLS.hyperframes, path.join(dir, "node_modules/hyperframes"), "junction");
  }
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><meta charset="UTF-8"><script src="lib/gsap.min.js"></script>
<style>*{margin:0;padding:0}html,body{width:640px;height:360px;overflow:hidden;background:#0b0d12}
#root{position:relative;width:100%;height:100%}h1{position:absolute;font:bold 48px sans-serif;white-space:nowrap}</style></head><body>
${comment}<div id="root" data-composition-id="main" data-start="0" data-duration="4"${fps ? ` data-fps="${fps}"` : ""} data-width="640" data-height="360">
<div id="world" class="clip" data-start="0" data-duration="4" data-track-index="0"><h1 id="always" style="left:20px;top:20px;color:#fff">ALWAYS</h1></div>
<div id="early" class="clip" data-start="0" data-duration="1" data-track-index="1"><h1 style="left:20px;top:150px;color:#0ff">EARLY CLIP</h1></div>
<div id="late" class="clip" data-start="2" data-duration="1" data-track-index="2"><h1 style="left:20px;top:270px;color:#f0f">LATE CLIP</h1></div>
</div><script>
const tl = gsap.timeline({ paused: true });
tl.fromTo("#always", { x: 0 }, { x: 300, duration: 4, ease: "none" }, 0);
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
</script></body></html>`);
}

const capture = (dir, output, seek) => spawnSync(process.execPath, [cli, "composition", "capture", "--root", dir, "--composition", "index.html", "--output", output, "--width", "640", "--height", "360", "--seek", String(seek), "--chrome", TOOLS.chrome, "--puppeteer-module", TOOLS.puppeteerModule], { encoding: "utf8", windowsHide: true, timeout: 120000 });

// Lit pixels (any channel above half) of the opaque capture and of the render frame, whose
// background is transparent in a PNG sequence. Glyph edges can sit a pixel apart between the two
// browsers' rasterisation, so a lit pixel only counts as unmatched when the other image has no lit
// pixel within 2 px; a stray clip leaves thousands of unmatched pixels.
function unmatchedInk(captureFile, renderFile) {
  const a = PNG.sync.read(fs.readFileSync(captureFile));
  const b = PNG.sync.read(fs.readFileSync(renderFile));
  assert.deepEqual([a.width, a.height], [b.width, b.height]);
  const { width, height } = a;
  const mask = (png, alpha) => Uint8Array.from({ length: width * height }, (_, p) => (!alpha || png.data[p * 4 + 3] > 128) && Math.max(png.data[p * 4], png.data[p * 4 + 1], png.data[p * 4 + 2]) > 128 ? 1 : 0);
  const litA = mask(a, false);
  const litB = mask(b, true);
  const near = (lit, x, y) => {
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height && lit[ny * width + nx]) return true;
    }
    return false;
  };
  let unmatched = 0;
  let lit = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const p = y * width + x;
    if (litB[p]) lit += 1;
    if ((litA[p] && !near(litB, x, y)) || (litB[p] && !near(litA, x, y))) unmatched += 1;
  }
  return { unmatched, lit };
}

test("--seek on a HyperFrames composition matches the rendered frame", { skip: RENDER_SKIP, timeout: 600000 }, () => {
  const dir = tmp();
  try {
    film(dir, { withRuntime: true });
    const frames = path.join(dir, "frames");
    // HyperFrames' own CLI, as the film guide runs it; fps 2 puts frame N at (N-1)/2 s.
    const render = spawnSync(process.execPath, [path.join(TOOLS.hyperframes, "bin/hyperframes.mjs"), "render", "--format", "png-sequence", "--fps", "2", "--workers", "1", "--output", frames], {
      cwd: dir,
      encoding: "utf8",
      windowsHide: true,
      timeout: 300000,
      env: { ...process.env, PWD: dir, HYPERFRAMES_BROWSER_PATH: TOOLS.chrome, PRODUCER_HEADLESS_SHELL_PATH: TOOLS.chrome, HYPERFRAMES_NO_TELEMETRY: "1", DO_NOT_TRACK: "1" },
    });
    assert.equal(render.status, 0, `${render.stdout}\n${render.stderr}`.slice(-3000));
    const cases = [
      { at: 0.5, frame: 2, shown: ["ALWAYS", "EARLY CLIP"] },
      { at: 1, frame: 3, shown: ["ALWAYS"] }, // #early's window is [0, 1): gone at its end
      { at: 2.5, frame: 6, shown: ["ALWAYS", "LATE CLIP"] },
      { at: 3.5, frame: 8, shown: ["ALWAYS"] },
    ];
    for (const { at, frame, shown } of cases) {
      const output = path.join(dir, `cap-${at}`);
      const run = capture(dir, output, at);
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const result = JSON.parse(run.stdout);
      assert.deepEqual(result.seek, { atSec: at, appliedSec: at, fps: 30, durationSec: 4, clock: "hyperframes-runtime" });
      const elements = JSON.parse(fs.readFileSync(path.join(output, "elements.json"), "utf8"));
      assert.deepEqual(elements.items.filter((item) => item.kind === "text").map((item) => item.text).sort(), [...shown].sort(), `text at ${at}s`);
      const renderFrame = path.join(frames, `frame_${String(frame).padStart(6, "0")}.png`);
      const { unmatched, lit } = unmatchedInk(path.join(output, "screenshot.png"), renderFrame);
      assert.ok(lit > 500, `render frame ${frame} has content`);
      assert.ok(unmatched < lit * 0.01, `capture at ${at}s differs from render frame ${frame}: ${unmatched} unmatched of ${lit} lit pixels`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const cliJson = (run) => JSON.parse(run.stdout);

test("--seek on a HyperFrames composition without the runtime is refused with the render command", { skip: TOOLS.skip, timeout: 120000 }, () => {
  const dir = tmp();
  try {
    film(dir, { withRuntime: false });
    const run = capture(dir, path.join(dir, "cap"), 0.5);
    assert.equal(run.status, 1);
    const { error } = cliJson(run);
    assert.equal(error.code, "TOOL_MISSING");
    assert.match(error.message, /clip windows \(data-start\/data-duration\)/);
    assert.match(error.message, /hyperframes render --format png-sequence/);
    assert.equal(fs.existsSync(path.join(dir, "cap", "screenshot.png")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The runtime quantises to the render's frame rate (root data-fps, else 30) and reports the time
// it applied; a time at or past the end has no rendered frame and is refused.
test("--seek reports the frame time applied at the composition's fps and refuses times past the end", { skip: TOOLS.skip, timeout: 300000 }, () => {
  const dir = tmp();
  try {
    for (const [fps, at, applied] of [[24, 0.53, 0.5], [24, 3.99, 95 / 24], [60, 0.53, 31 / 60], [60, 3.99, 239 / 60], [null, 0.53, 0.5]]) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir);
      film(dir, { withRuntime: true, fps });
      const run = capture(dir, path.join(dir, "cap"), at);
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const { seek } = cliJson(run);
      assert.equal(seek.clock, "hyperframes-runtime");
      assert.equal(seek.fps, fps || 30);
      assert.equal(seek.atSec, at);
      assert.ok(Math.abs(seek.appliedSec - applied) < 1e-9, `${fps} fps, --seek ${at}: applied ${seek.appliedSec}, expected ${applied}`);
    }
    for (const at of [4, 11]) {
      const run = capture(dir, path.join(dir, `past-${at}`), at);
      assert.equal(run.status, 1);
      const { error } = cliJson(run);
      assert.equal(error.code, "SEEK_OUT_OF_RANGE");
      assert.match(error.message, /duration 4 s at 30 fps/);
      assert.match(error.message, /last frame is at 3\.9667 s/);
      assert.equal(fs.existsSync(path.join(dir, `past-${at}`, "screenshot.png")), false);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a data-composition-id mention outside the DOM does not make a page HyperFrames", { skip: TOOLS.skip, timeout: 120000 }, () => {
  const dir = tmp();
  try {
    fs.copyFileSync(TOOLS.gsap, path.join(dir, "gsap.min.js"));
    fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><script src="gsap.min.js"></script>
<style>body{margin:0;background:#fff}h1{position:absolute;left:0;top:0;font:40px sans-serif}</style></head><body>
<!-- <div data-composition-id="main" data-duration="4"> was the old root -->
<h1 id="t">Moves</h1><script>
const note = '<div data-composition-id="x">';
const tl = gsap.timeline({ paused: true }); tl.to("#t", { x: 200, duration: 2, ease: "none" }, 0); window.__timelines.main = tl;
</script></body></html>`);
    const run = capture(dir, path.join(dir, "cap"), 1);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(cliJson(run).seek, { atSec: 1, clock: "timeline" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--seek on a served HyperFrames page without the runtime is refused", { skip: TOOLS.skip, timeout: 120000 }, async () => {
  const dir = tmp();
  const http = require("node:http");
  film(dir, { withRuntime: false });
  const server = http.createServer((request, response) => {
    const file = path.join(dir, decodeURIComponent(new URL(request.url, "http://x").pathname));
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": file.endsWith(".html") ? "text/html" : "text/javascript" }).end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/index.html`;
    const run = await new Promise((resolve) => {
      const { spawn } = require("node:child_process");
      const child = spawn(process.execPath, [cli, "composition", "capture", "--url", url, "--output", "cap", "--seek", "0.5", "--chrome", TOOLS.chrome, "--puppeteer-module", TOOLS.puppeteerModule], { cwd: dir, windowsHide: true, env: { ...process.env, NO_PROXY: "127.0.0.1", no_proxy: "127.0.0.1" } });
      let out = "";
      child.stdout.on("data", (chunk) => { out += chunk; });
      child.stderr.on("data", (chunk) => { out += chunk; });
      child.on("close", (status) => resolve({ status, out }));
    });
    assert.notEqual(run.status, 0, run.out);
    assert.equal(JSON.parse(run.out.trim().split("\n")[0]).error.code, "TOOL_MISSING");
    assert.match(run.out, /does not load it/);
    assert.match(run.out, /hyperframes render --format png-sequence/);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--seek on a page without clips still seeks its registered timelines", { skip: TOOLS.skip, timeout: 120000 }, () => {
  const dir = tmp();
  try {
    fs.copyFileSync(TOOLS.gsap, path.join(dir, "gsap.min.js"));
    fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><script src="gsap.min.js"></script>
<style>body{margin:0;background:#fff}h1{position:absolute;left:0;top:0;font:40px sans-serif}</style></head><body><h1 id="t">Moves</h1><script>
const tl = gsap.timeline({ paused: true }); tl.to("#t", { x: 200, duration: 2, ease: "none" }, 0); window.__timelines.main = tl;
</script></body></html>`);
    const run = capture(dir, path.join(dir, "cap"), 1);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(JSON.parse(run.stdout).seek, { atSec: 1, clock: "timeline" });
    const elements = JSON.parse(fs.readFileSync(path.join(dir, "cap", "elements.json"), "utf8"));
    assert.equal(Math.round(elements.items.find((item) => item.id === "#t").box.x), 100);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--seek rejects a negative or non-numeric time", () => {
  const dir = tmp();
  try {
    for (const value of ["-1", "abc"]) {
      const run = spawnSync(process.execPath, [cli, "composition", "capture", "--url", "https://example.invalid/", "--output", "cap", `--seek=${value}`], { cwd: dir, encoding: "utf8", windowsHide: true, timeout: 60000 });
      assert.notEqual(run.status, 0);
      assert.match(`${run.stdout}${run.stderr}`, /--seek must be a non-negative number of seconds/);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
