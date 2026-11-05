#!/usr/bin/env node
"use strict";

// Kernel for `composition capture`: loads a page (local HTML file or http(s) URL) in headless
// Chrome, writes screenshot.png and elements.json (visible text with box, font and effective
// colors; block boxes for alignment). Reuses the browser stack resolved for film capture.

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolvePuppeteer } = require("./film-capture-core.cjs");
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
      // The glyphs' own line boxes (content area, no padding or the rest of a block's row): the
      // ground that matters for contrast is under these, not under the element's border box.
      const lines = [];
      for (const node of element.childNodes) {
        if (node.nodeType !== 3 || !node.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) lines.push({ x: r.x, y: r.y, w: r.width, h: r.height });
      }
      items.push({ kind: "text", id, text: text.slice(0, 80), box, ...(lines.length ? { lines } : {}), fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight) || 400, fontFamily: style.fontFamily, color: color ? color.slice(0, 3) : null, background: effectiveBackground(element) });
    } else if (element.children.length === 0 || (parse(style.backgroundColor) || [0, 0, 0, 0])[3] > 0.5 || style.borderStyle !== "none") {
      const fill = parse(style.backgroundColor);
      items.push({ kind: "block", id, box, ...(fill && fill[3] >= 0.99 ? { fill: fill.slice(0, 3) } : {}) });
    }
  }
  return { viewport: { width: innerWidth, height: innerHeight }, background: effectiveBackground(document.body), items };
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
    const puppeteer = resolvePuppeteer(file ? path.dirname(file) : process.cwd(), options["--puppeteer-module"]);
    browser = await puppeteer.launch({ executablePath: resolveBrowser(options["--chrome"]), headless: true, args: ["--allow-file-access-from-files"] });
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.evaluateOnNewDocument(() => { window.__timelines = window.__timelines || {}; });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    if (options["--seek"]) {
      const at = Number(options["--seek"]);
      await page.evaluate((t) => { for (const tl of Object.values(window.__timelines || {})) if (tl && tl.seek) tl.seek(t, false); }, at);
    }
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "screenshot.png"), type: "png" });
    const elements = await page.evaluate(extract);
    if (elements.items.some((item) => item.kind === "text" && !item.background)) {
      await page.addStyleTag({ content: HIDE_TEXT });
      await page.screenshot({ path: path.join(output, "ground.png"), type: "png" });
      groundSamples(decodePng(fs.readFileSync(path.join(output, "ground.png")), "ground.png"), elements.items);
    }
    fs.writeFileSync(path.join(output, "elements.json"), `${JSON.stringify(elements, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", output, screenshot: "screenshot.png", elements: "elements.json", items: elements.items.length }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
