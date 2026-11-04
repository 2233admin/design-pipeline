#!/usr/bin/env node
"use strict";

// Kernel for `composition capture`: loads a page (local HTML file or http(s) URL) in headless
// Chrome, writes screenshot.png and elements.json (visible text with box, font and effective
// colors; block boxes for alignment). Reuses the browser stack resolved for film capture.
// --seek on a HyperFrames composition seeks through the HyperFrames runtime at the render's frame
// rate, as the renderer does, so clip windows (data-start/data-duration) hide what the rendered
// frame does not show; see seekPage.

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolveHyperframesRuntime, resolvePuppeteer } = require("./film-capture-core.cjs");
const { resolveBrowser } = require("./browser-locate.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

function parseArgs(argv) {
  const allowed = new Set(["--composition", "--url", "--output", "--width", "--height", "--seek", "--chrome", "--puppeteer-module"]);
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!allowed.has(name)) fail("composition capture", `unknown option ${name}; allowed: ${[...allowed].join(", ")}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("composition capture", `${name} requires a value`);
    result[name] = value;
  }
  if (!result["--composition"] === !result["--url"]) fail("composition capture", "pass exactly one of --composition <html file> or --url <http(s) url>");
  if (!result["--output"]) fail("composition capture", "--output <dir> is required");
  return result;
}

// Runs in the page. Effective background walks ancestors to the first opaque background color;
// a background image or gradient on the way makes the background unknown (contrast skipped).
function extract() {
  const parse = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  };
  const effectiveBackground = (element) => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== "none") return null;
      const color = parse(style.backgroundColor);
      if (color && color[3] >= 0.99) return color.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const visible = (element, rect) => {
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
  };
  const items = [];
  let index = 0;
  for (const element of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "AUDIO"].includes(element.tagName)) continue;
    const rect = element.getBoundingClientRect();
    if (!visible(element, rect)) continue;
    const text = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join("").trim();
    const style = getComputedStyle(element);
    const id = element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}:${index += 1}`;
    const box = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    if (text) {
      const color = parse(style.color);
      items.push({ kind: "text", id, text: text.slice(0, 80), box, fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight) || 400, fontFamily: style.fontFamily, color: color ? color.slice(0, 3) : null, background: effectiveBackground(element) });
    } else if (element.children.length === 0 || (parse(style.backgroundColor) || [0, 0, 0, 0])[3] > 0.5 || style.borderStyle !== "none") {
      const fill = parse(style.backgroundColor);
      items.push({ kind: "block", id, box, ...(fill && fill[3] >= 0.99 ? { fill: fill.slice(0, 3) } : {}) });
    }
  }
  return { viewport: { width: innerWidth, height: innerHeight }, background: effectiveBackground(document.body), items };
}

const RENDER_FIX = "take the frame from the real render instead: `npx --no-install hyperframes render --format png-sequence --output <dir>` in the film project (frame_000001.png is 0 s; frame N is at (N-1)/fps seconds)";

// The frame rate `hyperframes render` uses: the root's data-fps (an integer, decimal or
// ffmpeg-style rational such as 30000/1001), else 30.
function renderFps(raw) {
  const text = String(raw || "").trim();
  const rational = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(text);
  const value = rational ? Number(rational[1]) / Number(rational[2]) : /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
  return Number.isFinite(value) && value > 0 ? value : 30;
}

// Seeks the loaded page and returns the seek record. A page with a [data-composition-id] root
// (checked in the DOM, so a mention in a comment or string does not count) is reloaded the way
// the renderer prepares it: its frame rate set before any script and the HyperFrames runtime
// present (the page's own, else the project's install), then seeked with the runtime's
// renderSeek, the call `hyperframes render` makes for each frame. Other pages seek their
// registered timelines, which cannot hide clips outside their data-start/data-duration windows.
async function seekPage(page, { url, compositionDir, at }) {
  const probe = await page.evaluate(() => {
    const root = document.querySelector("[data-composition-id]");
    return { hyperframes: Boolean(root), fps: root && root.getAttribute("data-fps"), runtime: Boolean(window.__hyperframes || window.__player || window.__hf) };
  });
  if (!probe.hyperframes) {
    await page.evaluate((t) => { for (const tl of Object.values(window.__timelines || {})) if (tl && tl.seek) tl.seek(t, false); }, at);
    return { atSec: at, clock: "timeline" };
  }
  const fps = renderFps(probe.fps);
  // Same shape and defaults the renderer's render-mode script installs; the runtime reads it at start.
  await page.evaluateOnNewDocument((value) => {
    window.__HF_EXPORT_RENDER_SEEK_CONFIG = { mode: "preview-phase", diagnostics: false, step: 1 / 120, offsetFraction: 0.5, fps: value, fpsSource: "render-options", owner: "runtime" };
  }, fps);
  if (!probe.runtime) {
    const runtime = compositionDir ? resolveHyperframesRuntime(compositionDir) : null;
    if (!runtime) {
      const where = compositionDir ? `hyperframes is not installed for ${compositionDir}. Fix: run \`npm install\` in the film project (film scaffold pins hyperframes), or ${RENDER_FIX}` : `the page at ${url} does not load it. Fix: capture through the HyperFrames preview or the project's index.html with hyperframes installed, or ${RENDER_FIX}`;
      fail("composition capture", `--seek on a HyperFrames composition needs the HyperFrames runtime to apply clip windows (data-start/data-duration), and ${where}`, { code: "TOOL_MISSING" });
    }
    await page.evaluateOnNewDocument(fs.readFileSync(runtime, "utf8"));
  }
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  // A runtime that is still building scenes gets time to finish.
  const ready = await page.waitForFunction(() => window.__renderReady === true && window.__player && typeof window.__player.renderSeek === "function", { timeout: 30000 }).then(() => true, () => false);
  if (!ready) fail("composition capture", `--seek on a HyperFrames composition needs the HyperFrames runtime, which did not become ready on this page, so clip windows (data-start/data-duration) would not apply. Fix: capture the project's index.html with hyperframes installed (npm install in the film project), or ${RENDER_FIX}`, { code: "TOOL_MISSING" });
  // The renderer's duration: the runtime's, else the root's data-duration.
  const durationSec = await page.evaluate(() => {
    const value = Number(window.__player.getDuration());
    return value > 0 ? value : Number(document.querySelector("[data-composition-id]").getAttribute("data-duration")) || 0;
  });
  if (!(at < durationSec)) {
    const lastFrameSec = Math.max(0, Math.ceil(durationSec * fps - 1e-9) - 1) / fps;
    fail("composition capture", `--seek ${at} is at or past the end of the composition (duration ${durationSec} s at ${Number(fps.toFixed(3))} fps); the render has no frame there, its last frame is at ${Number(lastFrameSec.toFixed(4))} s. Fix: pass --seek below ${durationSec}`, { code: "SEEK_OUT_OF_RANGE" });
  }
  const appliedSec = await page.evaluate(async (t) => {
    window.__player.renderSeek(t);
    if (typeof window.__hfWaitForSeekCompletion === "function") await window.__hfWaitForSeekCompletion();
    await document.fonts.ready;
    return Number(window.__player.getTime());
  }, at);
  return { atSec: at, appliedSec, fps, durationSec, clock: "hyperframes-runtime" };
}

(async () => {
  let browser;
  try {
    const options = parseArgs(process.argv.slice(2));
    const width = Number(options["--width"] || 1920);
    const height = Number(options["--height"] || 1080);
    const output = path.resolve(options["--output"]);
    const file = options["--composition"] ? path.resolve(options["--composition"]) : null;
    if (file && !fs.existsSync(file)) fail("composition capture", `composition not found: ${file}`);
    const url = file ? pathToFileURL(file).href : options["--url"];
    if (!file && !/^https?:\/\//.test(url)) fail("composition capture", "--url must be http(s)");
    const seek = options["--seek"] === undefined ? null : Number(options["--seek"]);
    if (seek !== null && !(Number.isFinite(seek) && seek >= 0)) fail("composition capture", `--seek must be a non-negative number of seconds, got ${options["--seek"]}`);
    const puppeteer = resolvePuppeteer(file ? path.dirname(file) : process.cwd(), options["--puppeteer-module"]);
    browser = await puppeteer.launch({ executablePath: resolveBrowser(options["--chrome"]), headless: true, args: ["--allow-file-access-from-files"] });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.evaluateOnNewDocument(() => { window.__timelines = window.__timelines || {}; });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const seeked = seek === null ? null : await seekPage(page, { url, compositionDir: file ? path.dirname(file) : null, at: seek });
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "screenshot.png"), type: "png" });
    const elements = await page.evaluate(extract);
    fs.writeFileSync(path.join(output, "elements.json"), `${JSON.stringify(elements, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", output, screenshot: "screenshot.png", elements: "elements.json", items: elements.items.length, ...(seeked ? { seek: seeked } : {}) }))}\n`);
  } catch (error) {
    // stderr keeps the message; the JSON error on stdout carries the code for the CLI to keep.
    process.stdout.write(`${JSON.stringify(jsonResult(false, {}, error))}\n`);
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
