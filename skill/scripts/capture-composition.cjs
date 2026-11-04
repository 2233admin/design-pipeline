#!/usr/bin/env node
"use strict";

// Kernel for `composition capture`: loads a page (local HTML file or http(s) URL) in headless
// Chrome, writes screenshot.png and elements.json (visible text with box, font, alignment, own fill
// and effective colors; block boxes for alignment; media boxes for the look signature). Reuses the
// browser stack resolved for film capture.

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolvePuppeteer } = require("./film-capture-core.cjs");
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
      const own = parse(style.backgroundColor);
      // Own gradient, or a small parent's (a label inside a gradient button), never a section's.
      const parent = element.parentElement;
      const parentRect = parent && parent !== document.body ? parent.getBoundingClientRect() : null;
      const stop = gradientStop(style) || (parentRect && parentRect.width * parentRect.height < innerWidth * innerHeight * 0.15 ? gradientStop(getComputedStyle(parent)) : null);
      items.push({ kind: "text", id, text: text.slice(0, 80), box, fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight) || 400, fontFamily: style.fontFamily, color: color ? color.slice(0, 3) : null, background: effectiveBackground(element), align: style.textAlign, ...(own && own[3] >= 0.99 ? { fill: own.slice(0, 3) } : {}), ...(stop && stop[3] >= 0.99 ? { gradient: stop.slice(0, 3) } : {}) });
    } else if (element.children.length === 0 || (parse(style.backgroundColor) || [0, 0, 0, 0])[3] > 0.5 || style.borderStyle !== "none") {
      const fill = parse(style.backgroundColor);
      items.push({ kind: "block", id, box, ...(fill && fill[3] >= 0.99 ? { fill: fill.slice(0, 3) } : {}) });
    }
  }
  await Promise.all(pending);
  return { viewport: { width: innerWidth, height: innerHeight }, background: effectiveBackground(document.body), items, media };
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
    fs.writeFileSync(path.join(output, "elements.json"), `${JSON.stringify(elements, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "captured", output, screenshot: "screenshot.png", elements: "elements.json", items: elements.items.length }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
