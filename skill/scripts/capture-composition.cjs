#!/usr/bin/env node
"use strict";

// Kernel for `composition capture`: loads a page (local HTML file or http(s) URL) in headless
// Chrome, writes screenshot.png and elements.json (visible text with box, font, alignment, own fill
// and effective colors; block boxes for alignment; media boxes for the look signature). Reuses the
// browser stack resolved for film capture.
// --seek on a HyperFrames composition seeks through the HyperFrames runtime at the render's frame
// rate, as the renderer does, so clip windows (data-start/data-duration) hide what the rendered
// frame does not show; see seekPage.

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolveHyperframesRuntime, resolvePuppeteer } = require("./film-capture-core.cjs");
const { resolveBrowser } = require("./browser-locate.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");
const { decodePng } = require("./png-core.cjs");

// Hides every glyph (fill, stroke, shadow, decoration) and nothing else, so the screenshot shows
// the ground each text sits on: image, gradient, texture, other elements.
const HIDE_TEXT = "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:0!important;text-shadow:none!important;text-decoration-color:transparent!important;caret-color:transparent!important}";

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// For each text with an unknown (image-backed) background: the ground under its line boxes with
// text hidden, as its mean colour and the 0th..100th percentiles of relative luminance. The gate turns
// these into the contrast of every ground pixel against the text colour and judges the worst 5%.
function groundSamples(ground, items) {
  for (const item of items) {
    if (item.kind !== "text" || item.background) continue;
    // Line boxes inflated by 2 px (antialiased edges, descenders); the border box only when the
    // text has no measurable line box.
    const rects = item.lines?.length ? item.lines.map((r) => ({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4 })) : [item.box];
    const seen = new Set(), lum = [], sum = [0, 0, 0];
    for (const rect of rects) {
      const x0 = Math.max(0, Math.floor(rect.x)), y0 = Math.max(0, Math.floor(rect.y));
      const x1 = Math.min(ground.width, Math.ceil(rect.x + rect.w)), y1 = Math.min(ground.height, Math.ceil(rect.y + rect.h));
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
        const p = y * ground.width + x;
        if (seen.has(p)) continue;
        seen.add(p);
        const i = p * 4, rgb = [ground.data[i], ground.data[i + 1], ground.data[i + 2]];
        lum.push(luminance(rgb)); for (let c = 0; c < 3; c += 1) sum[c] += rgb[c];
      }
    }
    if (!lum.length) continue;
    lum.sort((a, b) => a - b);
    item.ground = {
      source: "ground.png",
      region: item.lines?.length ? "line-boxes" : "box",
      pixels: lum.length,
      mean: sum.map((v) => Math.round(v / lum.length)),
      luminancePercentiles: Array.from({ length: 101 }, (_, p) => Number(lum[Math.round((p / 100) * (lum.length - 1))].toFixed(5))),
    };
  }
}

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
// a background image or gradient on the way makes the background unknown (null). Such text is
// then judged on the pixels under it: groundSamples() reads a second screenshot with text hidden.
// Async only to read the natural size of url() backgrounds, which says a photograph from a texture.
async function extract() {
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
  // Images, video, canvas and svg, and elements painted with a url() background: what the appearance
  // ledger's look signature reads a hero's media from. Kept apart from items, which alignment reads.
  const media = [];
  const MEDIA_TAGS = new Set(["IMG", "PICTURE", "VIDEO", "CANVAS", "SVG", "IFRAME"]);
  const pending = [];
  const urlOf = (value) => (String(value || "").match(/url\(\s*["']?([^"')]+)["']?\s*\)/i) || [])[1] || null;
  // A url() background's natural size, when the image loads within a short wait.
  const addBackgroundMedia = (tag, box, value) => {
    const entry = { tag, box, background: true };
    media.push(entry);
    const url = urlOf(value);
    if (!url) return;
    const image = new Image();
    pending.push(Promise.race([
      new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; image.src = url; }),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]).then(() => { if (image.naturalWidth > 0) entry.natural = { w: image.naturalWidth, h: image.naturalHeight }; }));
  };
  // The first colour stop of an element's own background gradient (a gradient button's colour).
  const gradientStop = (style) => (/gradient\(/i.test(style.backgroundImage || "") ? parse(style.backgroundImage) : null);
  for (const root of [document.documentElement, document.body]) {
    const style = getComputedStyle(root);
    if (/url\(/i.test(style.backgroundImage || "")) addBackgroundMedia(root.tagName.toLowerCase(), { x: 0, y: 0, w: innerWidth, h: Math.max(innerHeight, document.documentElement.scrollHeight) }, style.backgroundImage);
  }
  let index = 0;
  for (const element of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "AUDIO"].includes(element.tagName)) continue;
    const rect = element.getBoundingClientRect();
    if (!visible(element, rect)) continue;
    const text = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join("").trim();
    const style = getComputedStyle(element);
    const id = element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}:${index += 1}`;
    const box = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    const tag = element.tagName.toUpperCase();
    if (/url\(/i.test(style.backgroundImage || "")) addBackgroundMedia(tag.toLowerCase(), box, style.backgroundImage);
    else if (MEDIA_TAGS.has(tag)) media.push({ tag: tag.toLowerCase(), box, ...(tag === "IMG" && element.naturalWidth > 0 ? { natural: { w: element.naturalWidth, h: element.naturalHeight } } : {}), ...(tag === "VIDEO" && element.videoWidth > 0 ? { natural: { w: element.videoWidth, h: element.videoHeight } } : {}) });
    if (text) {
      const color = parse(style.color);
      // The glyphs' own line boxes (content area, no padding or the rest of a block's row): the
      // ground that matters for contrast is under these, not under the element's border box.
      const lines = [];
      for (const node of element.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) lines.push({ x: r.x, y: r.y, w: r.width, h: r.height });
      }
      const own = parse(style.backgroundColor);
      // Own gradient, or a small parent's (a label inside a gradient button), never a section's.
      const parent = element.parentElement;
      const parentRect = parent && parent !== document.body ? parent.getBoundingClientRect() : null;
      const stop = gradientStop(style) || (parentRect && parentRect.width * parentRect.height < innerWidth * innerHeight * 0.15 ? gradientStop(getComputedStyle(parent)) : null);
      items.push({ kind: "text", id, text: text.slice(0, 80), box, ...(lines.length ? { lines } : {}), fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight) || 400, fontFamily: style.fontFamily, color: color ? color.slice(0, 3) : null, background: effectiveBackground(element), align: style.textAlign, ...(own && own[3] >= 0.99 ? { fill: own.slice(0, 3) } : {}), ...(stop && stop[3] >= 0.99 ? { gradient: stop.slice(0, 3) } : {}) });
    } else if (element.children.length === 0 || (parse(style.backgroundColor) || [0, 0, 0, 0])[3] > 0.5 || style.borderStyle !== "none") {
      const fill = parse(style.backgroundColor);
      items.push({ kind: "block", id, box, ...(fill && fill[3] >= 0.99 ? { fill: fill.slice(0, 3) } : {}) });
    }
  }
  await Promise.all(pending);
  return { viewport: { width: innerWidth, height: innerHeight }, background: effectiveBackground(document.body), items, media };
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

async function main() {
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
    if (elements.items.some((item) => item.kind === "text" && !item.background)) {
      await page.addStyleTag({ content: HIDE_TEXT });
      await page.screenshot({ path: path.join(output, "ground.png"), type: "png" });
      groundSamples(decodePng(fs.readFileSync(path.join(output, "ground.png")), "ground.png"), elements.items);
    }
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
}

// `extract` runs in a page; exported so other callers can run it in their own browser session.
if (require.main === module) main();

module.exports = { extract };
