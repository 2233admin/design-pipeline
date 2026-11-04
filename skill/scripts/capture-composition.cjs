#!/usr/bin/env node
"use strict";

// Kernel for `composition capture`: loads a page (local HTML file or http(s) URL) in headless
// Chrome, writes screenshot.png and elements.json (visible text with box, font and effective
// colors; block boxes for alignment). Reuses the browser stack resolved for film capture.
// --seek on a HyperFrames composition seeks through the HyperFrames runtime, as the renderer
// does, so clip windows (data-start/data-duration) hide what the rendered frame does not show.

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

const HYPERFRAMES_ROOT = /<[^>]*\sdata-composition-id\s*=/i;
const RENDER_FIX = "take the frame from the real render instead: `npx --no-install hyperframes render --format png-sequence --output <dir>` in the film project (frame_000001.png is 0 s; frame N is at (N-1)/fps seconds)";

// Seeks the page and returns the clock that drove it. A HyperFrames page goes through the
// runtime's renderSeek (what `hyperframes render` calls for every frame); any other page seeks
// its registered timelines, which cannot hide clips outside their windows.
async function seekPage(page, at) {
  const { hyperframes, runtime } = await page.evaluate(() => ({ hyperframes: Boolean(document.querySelector("[data-composition-id]")), runtime: Boolean(window.__hyperframes || window.__player || window.__hf) }));
  if (!hyperframes) {
    await page.evaluate((t) => { for (const tl of Object.values(window.__timelines || {})) if (tl && tl.seek) tl.seek(t, false); }, at);
    return "timeline";
  }
  // A runtime that is still building scenes gets time to finish; a page without one fails now.
  const ready = runtime && await page.waitForFunction(() => window.__renderReady === true && window.__player && typeof window.__player.renderSeek === "function", { timeout: 30000 }).then(() => true, () => false);
  if (!ready) fail("composition capture", `--seek on a HyperFrames composition needs the HyperFrames runtime, which did not become ready on this page, so clip windows (data-start/data-duration) would not apply. Fix: capture the project's index.html with hyperframes installed (npm install in the film project), or ${RENDER_FIX}`, { code: "TOOL_MISSING" });
  await page.evaluate(async (t) => {
    window.__player.renderSeek(t);
    if (typeof window.__hfWaitForSeekCompletion === "function") await window.__hfWaitForSeekCompletion();
    await document.fonts.ready;
  }, at);
  return "hyperframes-runtime";
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
    // The renderer injects the runtime into the page; a bare index.html needs the project's copy.
    let runtime = null;
    if (seek !== null && file && HYPERFRAMES_ROOT.test(fs.readFileSync(file, "utf8"))) {
      runtime = resolveHyperframesRuntime(path.dirname(file));
      if (!runtime) fail("composition capture", `--seek on a HyperFrames composition needs the HyperFrames runtime to apply clip windows (data-start/data-duration), and hyperframes is not installed for ${file}. Fix: run \`npm install\` in the film project (film scaffold pins hyperframes), or ${RENDER_FIX}`, { code: "TOOL_MISSING" });
    }
    const puppeteer = resolvePuppeteer(file ? path.dirname(file) : process.cwd(), options["--puppeteer-module"]);
    browser = await puppeteer.launch({ executablePath: resolveBrowser(options["--chrome"]), headless: true, args: ["--allow-file-access-from-files"] });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.evaluateOnNewDocument(() => { window.__timelines = window.__timelines || {}; });
    if (runtime) await page.evaluateOnNewDocument(fs.readFileSync(runtime, "utf8"));
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const clock = seek === null ? null : await seekPage(page, seek);
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "screenshot.png"), type: "png" });
    const elements = await page.evaluate(extract);
    fs.writeFileSync(path.join(output, "elements.json"), `${JSON.stringify(elements, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", output, screenshot: "screenshot.png", elements: "elements.json", items: elements.items.length, ...(clock ? { seek: { atSec: seek, clock } } : {}) }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
