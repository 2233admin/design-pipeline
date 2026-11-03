"use strict";

// `reference extract` (OpenSpec change reference-palette-extract): deterministic, no-model measurement
// of a reference page's palette, type scale and spacing from computed styles, written as the palette
// evidence palette-foundation-core checks (design-pipeline.palette-evidence.v1) and draft DESIGN.md
// front-matter tokens. The agent judges the draft; nothing here decides roles beyond the measured ones.
// Method ported from yuvrajangadsingh/brandmd (MIT; src/extract.js, src/analyze.js): computed styles over
// visible elements, :root custom properties from cssRules, fonts.ready, cookie and overlay dismissal,
// an instant-scroll walk, CIEDE2000 clustering below 15, share tiers (25% dominant, 5% accent, a
// saturated colour never below accent), 0.5 px clustering of type and spacing, and "(low confidence)"
// where the evidence does not support a value. This file is our own CommonJS implementation.

const { fail } = require("./contract-utils.cjs");
const { collectBlockSignals, detectBlockPage, refuseBlockPage } = require("./block-page-core.cjs");

const SCOPE = "reference extract";
const PALETTE_SCHEMA = "design-pipeline.palette-evidence.v1";
const EXTRACTION_SCHEMA = "design-pipeline.reference-extraction.v1";
const LOW = "(low confidence)";
const CLUSTER_DELTA_E = 15;
// A merge this far apart (CIEDE2000 3 to 15) may be a designed surface step, not rendering noise
// (sub-pixel and anti-aliasing noise stays under 2; a dark card on a dark page measured 4.1).
const NEAR_MERGE = 3;
const DOMINANT_SHARE = 0.25;
const ACCENT_SHARE = 0.05;
const SATURATED = 0.5;
const GROUP_LIMITS = { background: 6, text: 4, border: 3 };
const NAVIGATION_TIMEOUT_MS = 45000;
const CHALLENGE_WAIT_MS = 15000;
const CONTENT_WAIT_MS = 15000;
const STABLE_MS = 500;
const FILES = { extraction: "extraction.json", palette: "palette-evidence.json", draft: "design-md-draft.md" };

// --- colour math -------------------------------------------------------------------------------------

const hex2 = (value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
const toHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const fromHex = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const linear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// WCAG relative luminance of an sRGB colour.
function luminance(rgb) {
  const [r, g, b] = rgb.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// sRGB (D65) to CIE L*a*b*.
function toLab(rgb) {
  const [r, g, b] = rgb.map(linear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// CIEDE2000 colour difference (Sharma, Wu and Dalal 2005), kL = kC = kH = 1.
function deltaE2000(rgbA, rgbB) {
  const [L1, a1, b1] = toLab(rgbA);
  const [L2, a2, b2] = toLab(rgbB);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b, a) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hbarp - 30) * rad) + 0.24 * Math.cos(2 * hbarp * rad) + 0.32 * Math.cos((3 * hbarp + 6) * rad) - 0.2 * Math.cos((4 * hbarp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

// HSL saturation, lightness and hue (degrees) of an sRGB colour.
function hsl(rgb) {
  const [r, g, b] = rgb.map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

// How CTA-like a colour is: saturated and mid-light scores above 0; near-black, near-white or grey <= 0.
function vividness(rgb) {
  const { s, l } = hsl(rgb);
  if (l <= 0.15 || l >= 0.9 || s < 0.3) return -1;
  return s * (1 - Math.abs(l - 0.55));
}

// A colour as the screen shows it: composited over the solid colour under it.
function composite([r, g, b, a], under) {
  if (a >= 1) return [r, g, b];
  return [0, 1, 2].map((index) => a * [r, g, b][index] + (1 - a) * under[index]);
}

const round = (value, places = 2) => Math.round(value * 10 ** places) / 10 ** places;
const roundPx = (value) => Math.round(value * 2) / 2;

// --- in-page work (serialized into the page; everything it needs is defined inside) ------------------

// Removes what covers the page instead of being it: by geometry, any fixed element that covers 60% of
// the viewport or more and is on top (it is what the viewport shows at most sample points);
// by name, as an extra, fixed or sticky cookie, consent and GDPR banners and fixed high overlays and
// modals of any size. Returns what it removed.
function dismissOverlays() {
  const removed = [];
  const describe = (el) => `${el.localName}${el.id ? `#${el.id}` : ""}${typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : ""}`.slice(0, 80);
  const remove = (el) => {
    if (!el.isConnected) return;
    removed.push(describe(el));
    el.remove();
  };
  const width = window.innerWidth;
  const height = window.innerHeight;
  const points = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([x, y]) => [x * width, y * height]);
  // Sticky elements are left to the name rules: a full-height sticky section is usually content.
  const pinned = [...document.querySelectorAll("body *")].filter((el) => getComputedStyle(el).position === "fixed");
  for (const el of pinned) {
    if (!el.isConnected) continue;
    const box = el.getBoundingClientRect();
    const covered = Math.max(0, Math.min(box.right, width) - Math.max(box.left, 0)) * Math.max(0, Math.min(box.bottom, height) - Math.max(box.top, 0));
    if (covered < 0.6 * width * height) continue;
    const onTop = points.filter(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit && (hit === el || el.contains(hit));
    }).length;
    if (onTop >= 3) remove(el);
  }
  const banner = '[class*="cookie" i],[id*="cookie" i],[class*="consent" i],[id*="consent" i],[class*="gdpr" i],[id*="gdpr" i],[class*="banner" i],[id*="onetrust" i],[class*="cc-"],[id*="cc-"]';
  for (const el of document.querySelectorAll(banner)) {
    if (!el.isConnected) continue;
    const position = getComputedStyle(el).position;
    if (position === "fixed" || position === "sticky") remove(el);
  }
  for (const el of document.querySelectorAll('[class*="overlay" i],[class*="modal" i],[role="dialog"][aria-modal="true"]')) {
    if (!el.isConnected) continue;
    const style = getComputedStyle(el);
    if (style.position === "fixed" && (Number.parseFloat(style.zIndex) > 100 || el.matches('[aria-modal="true"]'))) remove(el);
  }
  // A modal usually locks scrolling; unlock it so the walk reaches the whole page.
  for (const el of [document.documentElement, document.body]) if (el && getComputedStyle(el).overflowY === "hidden") el.style.setProperty("overflow", "visible", "important");
  return removed;
}

// What the page shows: its visible text length and visible media and control count.
function contentSize() {
  const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim().length;
  let elements = 0;
  for (const el of document.querySelectorAll("img,svg,video,canvas,picture,input,button,iframe")) {
    const box = el.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) elements += 1;
  }
  return { text, elements, nodes: document.getElementsByTagName("*").length };
}

async function fontsReady(ms) {
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, ms))]);
  return document.fonts ? document.fonts.status : "unsupported";
}

// One walk over the visible elements: colours by group with weight, count and largest element, font
// families by role, rendered type samples, spacing values and :root custom properties.
function measureStyles(elementLimit) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  // Any CSS colour to [r, g, b, a] in sRGB: rgb()/rgba() exactly, other spaces through the canvas.
  const rgba = (value) => {
    if (!value) return null;
    if (cache.has(value)) return cache.get(value);
    let out = null;
    const legacy = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i.exec(value.trim());
    if (legacy) {
      out = [Number(legacy[1]), Number(legacy[2]), Number(legacy[3]), legacy[4] === undefined ? 1 : Number(legacy[4]) / (legacy[5] ? 100 : 1)];
    } else {
      context.fillStyle = "#123456";
      context.fillStyle = value;
      const first = context.fillStyle;
      context.fillStyle = "#654321";
      context.fillStyle = value;
      if (first === context.fillStyle) {
        context.clearRect(0, 0, 1, 1);
        context.fillRect(0, 0, 1, 1);
        const data = context.getImageData(0, 0, 1, 1).data;
        out = [data[0], data[1], data[2], round3(data[3] / 255)];
      }
    }
    cache.set(value, out);
    return out;
  };
  function round3(value) { return Math.round(value * 1000) / 1000; }
  const describe = (el) => `${el.localName}${el.id ? `#${el.id}` : ""}${typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : ""}`.slice(0, 80);
  const colors = { background: {}, text: {}, border: {} };
  const add = (group, value, weight, el, area) => {
    const color = rgba(value);
    if (!color || color[3] === 0) return;
    const key = color.join(",");
    const entry = colors[group][key] || (colors[group][key] = { rgba: color, weight: 0, count: 0, region: null, area: -1 });
    entry.weight += weight;
    entry.count += 1;
    if (area > entry.area) {
      entry.area = area;
      entry.region = describe(el);
    }
  };
  const GENERIC = new Set(["sans-serif", "serif", "monospace", "cursive", "fantasy", "math", "fangsong", "emoji", "system-ui", "-apple-system", "blinkmacsystemfont", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded", "apple color emoji", "segoe ui emoji", "noto color emoji", "inherit", "initial", "unset"]);
  // The first named (non-generic) family of a font-family list; commas inside quotes or parens do not split.
  const family = (list) => {
    const tokens = [];
    let buffer = "";
    let quote = null;
    let depth = 0;
    for (const ch of String(list || "")) {
      if (quote) { if (ch === quote) quote = null; buffer += ch; continue; }
      if (ch === "'" || ch === '"') { quote = ch; buffer += ch; continue; }
      if (ch === "(") depth += 1;
      if (ch === ")" && depth > 0) depth -= 1;
      if ((ch === "," || ch === ";") && depth === 0) { tokens.push(buffer); buffer = ""; continue; }
      buffer += ch;
    }
    tokens.push(buffer);
    for (const token of tokens) {
      const name = token.replace(/['"]/g, "").trim();
      if (name && !GENERIC.has(name.toLowerCase())) return name;
    }
    return null;
  };
  const stops = (image) => (!image || image === "none" || !/gradient\(/i.test(image) ? [] : image.match(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\([^)]*\)/gi) || []);
  const fonts = { all: {}, heading: {}, body: {}, button: {}, display: {} };
  const tally = (bucket, key) => { bucket[key] = (bucket[key] || 0) + 1; };
  const type = {};
  const spacing = {};
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  // The root painters (canvas, html and body backgrounds) are weighted by the area no opaque element
  // covers, on a 32 px grid over the document, so a full-bleed hero is not outvoted by a white canvas.
  const CELL = 32;
  const docWidth = Math.max(document.documentElement.scrollWidth, window.innerWidth);
  const docHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight);
  const columns = Math.ceil(docWidth / CELL);
  const rows = Math.ceil(docHeight / CELL);
  const coverage = new Uint8Array(columns * rows);
  const cover = (box) => {
    const left = Math.max(0, Math.floor((box.left + window.scrollX) / CELL));
    const right = Math.min(columns - 1, Math.ceil((box.right + window.scrollX) / CELL) - 1);
    const top = Math.max(0, Math.floor((box.top + window.scrollY) / CELL));
    const bottom = Math.min(rows - 1, Math.ceil((box.bottom + window.scrollY) / CELL) - 1);
    for (let row = top; row <= bottom; row += 1) coverage.fill(1, row * columns + left, row * columns + right + 1);
  };
  const roots = [];
  let measured = 0;
  const elements = document.querySelectorAll("html, body, body *");
  for (const el of elements) {
    if (measured >= elementLimit) break;
    if (el.closest("script,style,noscript,template,head")) continue;
    const box = el.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
    measured += 1;
    const area = box.width * box.height;
    const share = Math.min(area / viewportArea, 1);
    const isRoot = el === document.documentElement || el === document.body;
    if (isRoot) roots.push({ el, value: style.backgroundColor });
    else {
      add("background", style.backgroundColor, 1 + share * 25, el, area);
      const fill = rgba(style.backgroundColor);
      if ((fill && fill[3] >= 0.99) || (style.backgroundImage && style.backgroundImage !== "none")) cover(box);
    }
    for (const stop of stops(style.backgroundImage)) add("background", stop, 1 + share * 10, el, area);
    const ownText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
    if (ownText) add("text", style.color, 1, el, area);
    const bordered = ["Top", "Right", "Bottom", "Left"].some((side) => Number.parseFloat(style[`border${side}Width`]) > 0 && !["none", "hidden"].includes(style[`border${side}Style`]));
    if (bordered) add("border", style.borderTopColor, 1, el, area);
    const name = family(style.fontFamily);
    const size = Number.parseFloat(style.fontSize) || 0;
    if (ownText && name) {
      tally(fonts.all, name);
      if (/^h[1-6]$/.test(el.localName)) tally(fonts.heading, name);
      else if (el.localName === "button" || el.getAttribute("role") === "button") tally(fonts.button, name);
      else if (size >= 40) tally(fonts.display, name);
      else tally(fonts.body, name);
    }
    if (ownText && size > 0) {
      const sample = type[size] || (type[size] = { count: 0, lineHeights: {}, weights: {}, families: {} });
      sample.count += 1;
      if (style.lineHeight && style.lineHeight !== "normal") tally(sample.lineHeights, style.lineHeight);
      tally(sample.weights, style.fontWeight);
      if (name) tally(sample.families, name);
    }
    for (const prop of ["marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap"]) {
      const value = style[prop];
      if (value && /^-?[\d.]+px$/.test(value) && value !== "0px") tally(spacing, value);
    }
  }
  // An unpainted root shows the browser canvas, white: it is the page background the eye sees.
  const rootBg = rgba(getComputedStyle(document.documentElement).backgroundColor);
  const bodyBg = document.body ? rgba(getComputedStyle(document.body).backgroundColor) : null;
  const pageBackground = rootBg && rootBg[3] > 0 ? rootBg : bodyBg && bodyBg[3] > 0 ? bodyBg : [255, 255, 255, 1];
  let open = 0;
  for (const cell of coverage) if (!cell) open += 1;
  const uncoveredArea = open * CELL * CELL;
  const rootWeight = 1 + Math.min(uncoveredArea / viewportArea, 1) * 25;
  const uncovered = Math.round((open / Math.max(1, coverage.length)) * 1000) / 1000;
  for (const root of roots) add("background", root.value, rootWeight, root.el, Number.MAX_SAFE_INTEGER);
  if (!(rootBg && rootBg[3] > 0) && !(bodyBg && bodyBg[3] > 0)) {
    const key = "255,255,255,1";
    const entry = colors.background[key] || (colors.background[key] = { rgba: [255, 255, 255, 1], weight: 0, count: 0, region: null, area: -1 });
    entry.weight += rootWeight;
    entry.count += 1;
    entry.region = "page canvas (no background set)";
    entry.area = Number.MAX_SAFE_INTEGER;
  }
  const vars = [];
  const seen = new Set();
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules && !rule.selectorText) { walk(rule.cssRules); continue; }
      const selector = (rule.selectorText || "").toLowerCase();
      if (!(selector.includes(":root") || selector === "html" || selector.startsWith("html["))) continue;
      for (const prop of rule.style) {
        if (!prop.startsWith("--") || seen.has(prop)) continue;
        seen.add(prop);
        const value = getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || rule.style.getPropertyValue(prop).trim();
        vars.push({ name: prop, value: value.slice(0, 200), rgba: /^(#|rgb|hsl|hwb|oklch|oklab|lab|lch|color\()/i.test(value) ? rgba(value) : null });
      }
    }
  };
  let unreadableSheets = 0;
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules); } catch { unreadableSheets += 1; }
  }
  return {
    title: document.title || "",
    bodyTextLength: (document.body?.innerText || "").replace(/\s+/g, " ").trim().length,
    elementsMeasured: measured,
    elementLimitReached: measured >= elementLimit,
    uncoveredShare: uncovered,
    pageBackground,
    colors,
    fonts,
    type,
    spacing,
    vars,
    unreadableSheets,
  };
}

// --- browser run -------------------------------------------------------------------------------------

function validateUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { fail(SCOPE, "--url must be a URL. Fix: pass the reference page's full http(s) address", { code: "OPTION_INVALID" }); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) fail(SCOPE, "--url must be a credential-free http(s) address. Fix: pass the public page address without a user name or password", { code: "OPTION_INVALID" });
  return raw;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// Waits until the page shows text or media and its content size has not changed for STABLE_MS; a page
// that shows nothing by the deadline fails, so an unrendered app shell is never measured.
async function waitForContent(page, url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  let since = Date.now();
  for (;;) {
    const size = await page.evaluate(contentSize).catch(() => null);
    const key = size ? `${size.text}:${size.elements}:${size.nodes}` : null;
    if (key !== last) {
      last = key;
      since = Date.now();
    }
    const shows = size && (size.text > 0 || size.elements > 0);
    if (shows && Date.now() - since >= STABLE_MS) return size;
    if (Date.now() >= deadline) {
      if (shows) return size;
      fail(SCOPE, `${url} rendered no visible text or media within ${Math.round(timeoutMs / 1000)} s, so there is nothing to measure. Fix: check the page renders in a browser without signing in; if it needs a login or a click first, use a screenshot of it as an image reference`, { code: "REFERENCE_EMPTY" });
    }
    await sleep(100);
  }
}

async function extractReference(url, options = {}) {
  validateUrl(url);
  const { browserIdentity, resolveBrowser } = require("./browser-locate.cjs");
  const { settle } = require("./page-refs-core.cjs");
  const { resolvePuppeteer } = require("./film-capture-core.cjs");
  const viewport = { width: options.width || 1440, height: options.height || 900, deviceScaleFactor: 1 };
  let puppeteer;
  try {
    puppeteer = resolvePuppeteer(options.cwd || process.cwd(), options.puppeteerModule);
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    fail(SCOPE, "puppeteer-core not found. Fix: run `npm i puppeteer-core` in the --root project, or pass --puppeteer-module <path to puppeteer-core>", { code: "TOOL_MISSING" });
  }
  const executablePath = resolveBrowser(options.chrome);
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    // The status of the latest main-document response: a challenge that clears navigates again.
    let status = null;
    page.on("response", (response) => {
      if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) status = response.status();
    });
    try {
      const response = await page.goto(url, { waitUntil: "load", timeout: options.navigationTimeoutMs || NAVIGATION_TIMEOUT_MS });
      if (status === null && response) status = response.status();
    } catch (error) {
      fail(SCOPE, `could not load ${url}: ${error.message}. Fix: check the address opens in a browser from this machine, then run reference extract again`, { code: "REFERENCE_UNREACHABLE" });
    }
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
    let signals = await page.evaluate(collectBlockSignals);
    let verdict = detectBlockPage({ ...signals, status });
    // A JavaScript challenge may clear itself; a block page does not, and is refused at once.
    const deadline = Date.now() + (options.challengeWaitMs ?? CHALLENGE_WAIT_MS);
    while (verdict.blocked && verdict.kind === "challenge" && Date.now() < deadline) {
      await sleep(1000);
      try {
        signals = await page.evaluate(collectBlockSignals);
        verdict = detectBlockPage({ ...signals, status: null });
      } catch {
        // mid-navigation: keep waiting
      }
    }
    if (verdict.blocked) refuseBlockPage(SCOPE, url, verdict);
    // An error status is not the reference, however designed its error page is.
    if (status !== null && status >= 400) {
      fail(SCOPE, `the URL returned HTTP ${status}; a reference must be the real page, not an error page, so nothing was measured. Fix: open the address in a browser, copy the address of the page you mean (it answers 200), then run reference extract again`, { code: "REFERENCE_HTTP_STATUS", httpStatus: status });
    }
    // A client-rendered page paints after load: wait until it shows content and stops changing.
    await waitForContent(page, url, options.contentWaitMs ?? CONTENT_WAIT_MS);
    signals = await page.evaluate(collectBlockSignals);
    verdict = detectBlockPage({ ...signals, status });
    if (verdict.blocked) refuseBlockPage(SCOPE, url, verdict);
    const dismissed = await page.evaluate(dismissOverlays);
    await settle(page);
    const fontStatus = await page.evaluate(fontsReady, 5000);
    // Banners that appear on scroll are dismissed too, before anything is measured.
    dismissed.push(...await page.evaluate(dismissOverlays));
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    const measured = await page.evaluate(measureStyles, options.elementLimit || 20000);
    const after = detectBlockPage({ ...signals, status, backgrounds: Object.keys(measured.colors.background), fonts: Object.keys(measured.fonts.all) });
    if (after.blocked) refuseBlockPage(SCOPE, url, after);
    return {
      url,
      finalUrl: page.url(),
      httpStatus: status,
      viewport: { width: viewport.width, height: viewport.height },
      browser: await browserIdentity(browser, executablePath),
      capturedAt: new Date().toISOString(),
      fontStatus,
      overlaysDismissed: dismissed,
      ...measured,
    };
  } finally {
    await browser.close();
  }
}

// --- analysis (pure) ---------------------------------------------------------------------------------

// Merges colours closer than CIEDE2000 15. Heaviest first, so each cluster is named by its heaviest member.
function clusterColors(entries, threshold = CLUSTER_DELTA_E) {
  // Ties keep document order (a gradient's first stop before its later ones).
  const sorted = entries.map((entry, index) => ({ entry, index })).sort((a, b) => b.entry.weight - a.entry.weight || a.index - b.index).map(({ entry }) => entry);
  const clusters = [];
  for (const entry of sorted) {
    const rgb = fromHex(entry.hex);
    let distance = null;
    const home = clusters.find((cluster) => {
      distance = deltaE2000(rgb, cluster.rgb);
      return distance < threshold;
    });
    if (home) {
      if (distance >= NEAR_MERGE && entry.hex !== home.hex) home.near.push({ hex: entry.hex, deltaE: round(distance, 1) });
      home.weight += entry.weight;
      home.count += entry.count;
      if (!home.members.includes(entry.hex)) home.members.push(entry.hex);
      if (entry.area > home.area) {
        home.area = entry.area;
        home.region = entry.region;
      }
    } else {
      clusters.push({ hex: entry.hex, rgb, weight: entry.weight, count: entry.count, members: [entry.hex], near: [], region: entry.region, area: entry.area });
    }
  }
  return clusters;
}

// Share of its own group: >= 25% dominant, >= 5% accent, else incidental; a saturated colour is never
// below accent, because a call-to-action colour covers little area and still carries the brand.
function tierOf(share, rgb) {
  const tier = share >= DOMINANT_SHARE ? "dominant" : share >= ACCENT_SHARE ? "accent" : "incidental";
  return tier === "incidental" && hsl(rgb).s > SATURATED ? "accent" : tier;
}

function analyzePalette(measurement) {
  const page = composite(measurement.pageBackground, [255, 255, 255]);
  const varsByHex = new Map();
  for (const item of measurement.vars || []) {
    if (!item.rgba || item.rgba[3] === 0) continue;
    const hex = toHex(composite(item.rgba, page));
    varsByHex.set(hex, [...(varsByHex.get(hex) || []), item.name]);
  }
  const groups = {};
  for (const group of ["background", "text", "border"]) {
    const entries = Object.values(measurement.colors?.[group] || {})
      .filter((entry) => Array.isArray(entry.rgba) && entry.rgba[3] >= 0.05)
      .map((entry) => ({ hex: toHex(composite(entry.rgba, page)), weight: entry.weight, count: entry.count, region: entry.region, area: entry.area, translucent: entry.rgba[3] < 1 }));
    const clusters = clusterColors(entries);
    const total = clusters.reduce((sum, cluster) => sum + cluster.weight, 0) || 1;
    groups[group] = clusters.map((cluster) => {
      const share = cluster.weight / total;
      const vars = [...new Set(cluster.members.flatMap((hex) => varsByHex.get(hex) || []))].sort();
      return { hex: cluster.hex, share: round(share, 4), tier: tierOf(share, cluster.rgb), count: cluster.count, weight: round(cluster.weight), members: cluster.members, ...(cluster.near.length ? { nearMerges: cluster.near } : {}), region: cluster.region, vars };
    });
  }
  return groups;
}

const TIER_RANK = { dominant: 0, accent: 1, incidental: 2 };

// The measured roles: page background and surface, text and muted text, border, and the primary
// (most CTA-like) colour. A role the evidence does not support is listed as low confidence, not guessed.
function pickRoles(groups) {
  const roles = [];
  const low = [];
  const neutral = (item) => vividness(fromHex(item.hex)) <= 0;
  const [background, ...otherBackgrounds] = groups.background;
  if (background) roles.push({ role: "background", group: "background", ...background });
  else low.push("background: no painted background was measured");
  const surface = otherBackgrounds.find((item) => neutral(item) && item.tier !== "incidental");
  if (surface) roles.push({ role: "surface", group: "background", ...surface });
  const [text, ...otherTexts] = groups.text;
  if (text) roles.push({ role: "text", group: "text", ...text });
  else low.push("text: no rendered text colour was measured");
  // Muted text sits between the text colour and the background, never on the far side of the text
  // (white button labels on a light page are not muted text).
  const lumBg = background ? luminance(fromHex(background.hex)) : null;
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const between = (item) => {
    if (lumBg === null || !text) return true;
    const lum = luminance(fromHex(item.hex));
    return Math.abs(lum - lumBg) < Math.abs(luminance(fromHex(text.hex)) - lumBg) && contrast(lum, lumBg) >= 2;
  };
  const muted = otherTexts.find((item) => neutral(item) && item.tier !== "incidental" && between(item));
  if (muted) roles.push({ role: "text-muted", group: "text", ...muted });
  const border = groups.border.find(neutral) || groups.border[0];
  if (border) roles.push({ role: "border", group: "border", ...border });
  else low.push("border: no visible border was measured");
  const candidates = ["background", "text", "border"]
    .flatMap((group) => groups[group].map((item) => ({ group, ...item, vivid: vividness(fromHex(item.hex)) })))
    .filter((item) => item.vivid > 0)
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.vivid - a.vivid || b.weight - a.weight);
  if (candidates[0]) roles.push({ role: "primary", ...candidates[0] });
  else low.push("primary: no saturated, mid-light colour was measured, so no brand or action colour is named");
  if (roles.length < 4) low.push(`roles: only ${roles.length} semantic roles were measured; the palette check needs four`);
  return { roles, low };
}

function dominantKey(bucket) {
  return Object.entries(bucket || {}).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? null;
}

const clusterLineHeight = (value) => (/px$/.test(value) ? `${roundPx(Number.parseFloat(value))}px` : value);

function analyzeType(measurement) {
  const sizes = new Map();
  for (const [raw, sample] of Object.entries(measurement.type || {})) {
    const px = roundPx(Number(raw));
    if (!(px > 0)) continue;
    const item = sizes.get(px) || { px, count: 0, lineHeights: {}, weights: {}, families: {} };
    item.count += sample.count;
    for (const [lh, count] of Object.entries(sample.lineHeights || {})) {
      const key = clusterLineHeight(lh);
      if (key !== "0px") item.lineHeights[key] = (item.lineHeights[key] || 0) + count;
    }
    for (const [weight, count] of Object.entries(sample.weights || {})) item.weights[weight] = (item.weights[weight] || 0) + count;
    for (const [name, count] of Object.entries(sample.families || {})) item.families[name] = (item.families[name] || 0) + count;
    sizes.set(px, item);
  }
  const scale = [...sizes.values()]
    .map((item) => {
      const family = dominantKey(item.families);
      return { size: `${item.px}px`, px: item.px, count: item.count, lineHeight: dominantKey(item.lineHeights), fontWeight: dominantKey(item.weights), fontFamily: family, familyCount: family ? item.families[family] : 0 };
    })
    .sort((a, b) => a.px - b.px);
  const low = [];
  const body = [...scale].sort((a, b) => b.count - a.count || a.px - b.px)[0] || null;
  if (!body) low.push("type scale: no rendered text was measured");
  else if (body.count < 2) low.push(`type scale: the body size ${body.size} rests on one element`);
  const supported = (bucket) => {
    const name = dominantKey(bucket);
    return name && bucket[name] >= 2 ? name : null;
  };
  const fonts = measurement.fonts || {};
  const merged = (...buckets) => buckets.reduce((out, bucket) => {
    for (const [name, count] of Object.entries(bucket || {})) out[name] = (out[name] || 0) + count;
    return out;
  }, {});
  const families = {
    heading: supported(merged(fonts.display, fonts.heading)),
    body: supported(fonts.body) || supported(fonts.all),
  };
  if (!families.heading) low.push("heading font: no named family appears on two or more heading or display elements");
  if (!families.body) low.push("body font: no named family appears on two or more text elements");
  // A family seen on one element of a size is evidence of that size's face only when it is also the
  // supported heading or body family (a hero size is often used once).
  for (const item of scale) {
    if (item.fontFamily && item.familyCount < 2 && item.fontFamily !== families.heading && item.fontFamily !== families.body) item.fontFamily = null;
    delete item.familyCount;
  }
  return { scale, body: body ? body.size : null, families, low };
}

function analyzeSpacing(measurement) {
  const counts = new Map();
  for (const [raw, count] of Object.entries(measurement.spacing || {})) {
    const px = roundPx(Number.parseFloat(raw));
    if (!(px > 0 && px <= 200)) continue;
    counts.set(px, (counts.get(px) || 0) + count);
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  let grid = null;
  for (const base of [8, 4]) {
    if (total < 3) break;
    let fit = 0;
    for (const [px, count] of counts) {
      const mod = px % base;
      if (mod < 0.5 || base - mod < 0.5) fit += count;
    }
    if (fit / total >= 0.8) {
      grid = { base: `${base}px`, coverage: round(fit / total) };
      break;
    }
  }
  const scale = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 12)
    .map(([px, count]) => ({ value: `${px}px`, px, count }))
    .sort((a, b) => a.px - b.px);
  const low = [];
  if (!scale.length) low.push("spacing: no margin, padding or gap values were measured");
  else if (total < 3) low.push(`spacing grid: only ${total} spacing value${total === 1 ? "" : "s"} measured, too few to claim a base grid`);
  else if (!grid) low.push("spacing grid: no 8 px or 4 px base covers 80% of the measured spacing values");
  return { scale, grid, low };
}

function analyzeMeasurement(measurement) {
  const palette = analyzePalette(measurement);
  const { roles, low: roleLow } = pickRoles(palette);
  const type = analyzeType(measurement);
  const spacing = analyzeSpacing(measurement);
  const mergeLow = palette.background.filter((item) => item.nearMerges).map((item) => `background surfaces: ${item.nearMerges.map((near) => `${near.hex} (CIEDE2000 ${near.deltaE})`).join(", ")} merged into ${item.hex}; on a dark or tinted site this may be a designed surface step, so check the raw members in extraction.json before dropping it`);
  return { palette, roles, type, spacing, lowConfidence: [...roleLow, ...mergeLow, ...type.low, ...spacing.low] };
}

// --- outputs ------------------------------------------------------------------------------------------

function temperature(groups) {
  let x = 0;
  let y = 0;
  let weight = 0;
  let neutralB = 0;
  let neutralWeight = 0;
  for (const item of [...groups.background, ...groups.text, ...groups.border]) {
    const rgb = fromHex(item.hex);
    const { h, s } = hsl(rgb);
    if (s >= 0.3 && vividness(rgb) > -1) {
      x += Math.cos((h * Math.PI) / 180) * item.share;
      y += Math.sin((h * Math.PI) / 180) * item.share;
      weight += item.share;
    } else {
      neutralB += toLab(rgb)[2] * item.share;
      neutralWeight += item.share;
    }
  }
  const b = neutralWeight ? neutralB / neutralWeight : 0;
  const neutrals = b > 2 ? `warm-tinted neutrals (mean b* ${round(b, 1)})` : b < -2 ? `cool-tinted neutrals (mean b* ${round(b, 1)})` : `untinted neutrals (mean b* ${round(b, 1)})`;
  if (!weight) return `neutral: no chromatic colour; ${neutrals}`;
  let hue = (Math.atan2(y, x) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  const posture = hue < 90 || hue >= 330 ? "warm" : hue >= 150 && hue < 300 ? "cool" : "mixed";
  return `${posture}: chromatic colours centre on hue ${Math.round(hue)}°; ${neutrals}`;
}

function saturation(groups, roles) {
  const chromatic = [...groups.background, ...groups.text, ...groups.border].filter((item) => hsl(fromHex(item.hex)).s >= 0.3 && vividness(fromHex(item.hex)) > -1);
  const primary = roles.find((role) => role.role === "primary");
  if (!chromatic.length) return "achromatic: no measured colour reaches HSL saturation 0.3";
  const max = Math.max(...chromatic.map((item) => hsl(fromHex(item.hex)).s));
  return `${chromatic.length === 1 ? "neutral base with one saturated colour" : `neutral base with ${chromatic.length} saturated colours`}${primary ? ` (primary ${primary.hex}, HSL saturation ${round(hsl(fromHex(primary.hex)).s)})` : ""}; highest saturation ${round(max)}`;
}

function paletteEvidence({ url, targetId, measurement, analysis }) {
  const { palette, roles } = analysis;
  const listed = new Set();
  const colors = [];
  for (const group of ["background", "text", "border"]) {
    const keep = palette[group].filter((item, index) => index < GROUP_LIMITS[group] || item.tier !== "incidental" || roles.some((role) => role.hex === item.hex));
    for (const item of keep) {
      const key = `${group}:${item.hex}`;
      if (listed.has(key)) continue;
      listed.add(key);
      colors.push({
        hex: item.hex,
        role: `${group} ${item.tier}`,
        region: `${group} of ${item.count} visible element${item.count === 1 ? "" : "s"}, ${Math.round(item.share * 100)}% of the ${group} group, largest ${item.region || "unknown"}${item.vars.length ? `, var ${item.vars.join(" ")}` : ""}`,
      });
    }
  }
  const token = (role) => `--color-${role}`;
  const notes = [
    `Measured by reference extract from DOM computed styles at ${measurement.viewport.width}x${measurement.viewport.height} (${measurement.elementsMeasured} visible elements; colours closer than CIEDE2000 ${CLUSTER_DELTA_E} merged).`,
    "Coverage is each role's share of its own group: backgrounds weighted by element area, text and borders by element count.",
    "Raster-media palette is pending: measure the screenshot and imagery as a separate source, compare it with this DOM palette, judge the roles, then set both sources and the evidence status to ready.",
    ...(measurement.finalUrl && measurement.finalUrl !== url ? [`The page redirected to ${measurement.finalUrl}; confirm it is the reference.`] : []),
    ...(measurement.overlaysDismissed?.length ? [`Dismissed before measuring: ${measurement.overlaysDismissed.join(", ")}.`] : []),
    ...(measurement.unreadableSheets ? [`${measurement.unreadableSheets} cross-origin stylesheet(s) could not be read for custom properties.`] : []),
    ...analysis.lowConfidence.map((item) => `${LOW} ${item}`),
  ];
  return {
    schema: PALETTE_SCHEMA,
    targetId,
    sourceUrl: url,
    status: "pending",
    capturedAt: measurement.capturedAt,
    sources: {
      domComputed: { status: "ready", evidencePaths: [FILES.extraction], colors },
      rasterMedia: { status: "pending", evidencePaths: [], regions: [], colors: [] },
    },
    semanticRoles: roles.map((role) => ({ role: role.role, sourceColor: role.hex, targetToken: token(role.role) })),
    relationships: {
      coverage: roles.map((role) => ({ role: role.role, min: Math.floor(role.share * 100) / 100, max: Math.min(1, Math.ceil(role.share * 100) / 100) })),
      luminanceHierarchy: [...roles].sort((a, b) => luminance(fromHex(b.hex)) - luminance(fromHex(a.hex)) || a.role.localeCompare(b.role)).map((role) => role.role),
      saturationPosture: saturation(palette, roles),
      temperaturePosture: temperature(palette),
    },
    targetProjectTokens: roles.map((role) => ({ token: token(role.role), value: role.hex, sourceRole: role.role })),
    notes,
  };
}

// Names the measured sizes around the body size: larger ones heading-1 (largest) down, smaller ones small-1 down.
function typeTokens(type) {
  if (!type.body) return [];
  const body = type.scale.find((item) => item.size === type.body);
  const larger = type.scale.filter((item) => item.px > body.px).sort((a, b) => b.count - a.count || b.px - a.px).slice(0, 6).sort((a, b) => b.px - a.px);
  const smaller = type.scale.filter((item) => item.px < body.px).sort((a, b) => b.count - a.count || b.px - a.px).slice(0, 3).sort((a, b) => b.px - a.px);
  return [
    ...larger.map((item, index) => ({ name: `heading-${index + 1}`, ...item })),
    { name: "body", ...body },
    ...smaller.map((item, index) => ({ name: `small-${index + 1}`, ...item })),
  ];
}

function designMdDraft({ url, measurement, analysis }) {
  const quote = (value) => JSON.stringify(String(value));
  const host = new URL(url).host;
  const roles = new Map(analysis.roles.map((role) => [role.role, role.hex]));
  const lines = ["---", "version: alpha", `name: ${quote(`${host} (draft)`)}`, `description: ${quote(`Draft tokens measured from ${url} by reference extract; judge every value before adopting it.`)}`, "colors:"];
  lines.push(`  primary: ${quote(roles.get("primary") || LOW)}`);
  for (const role of ["background", "surface", "text", "text-muted", "border"]) if (roles.has(role)) lines.push(`  ${role}: ${quote(roles.get(role))}`);
  const type = typeTokens(analysis.type);
  if (type.length) {
    lines.push("typography:");
    for (const item of type) {
      lines.push(`  ${item.name}:`, `    fontFamily: ${quote(item.fontFamily || LOW)}`, `    fontSize: ${item.size}`);
      if (item.fontWeight) lines.push(`    fontWeight: ${item.fontWeight}`);
      if (item.lineHeight) lines.push(`    lineHeight: ${item.lineHeight}`);
    }
  }
  if (analysis.spacing.scale.length) {
    lines.push("spacing:");
    if (analysis.spacing.grid) lines.push(`  base: ${analysis.spacing.grid.base}`);
    analysis.spacing.scale.forEach((item, index) => lines.push(`  space-${index + 1}: ${item.value}`));
  }
  lines.push("---", "", `# ${host} (draft)`, "", "## Measured, not judged", "",
    `These tokens were measured from ${url} at ${measurement.viewport.width}x${measurement.viewport.height} on ${measurement.capturedAt} by \`reference extract\` (DOM computed styles; no model).`,
    "Judge them against the reference before copying any into DESIGN.md: rename roles, drop incidental values and record what you borrow under Source Decisions.",
    "", "## Fonts", "",
    `- Heading: ${analysis.type.families.heading || LOW}`,
    `- Body: ${analysis.type.families.body || LOW}`);
  if (analysis.lowConfidence.length) lines.push("", "## Low confidence", "", ...analysis.lowConfidence.map((item) => `- ${LOW} ${item}`));
  return `${lines.join("\n")}\n`;
}

function extractionRecord({ url, targetId, measurement, analysis }) {
  return {
    schema: EXTRACTION_SCHEMA,
    targetId,
    url,
    finalUrl: measurement.finalUrl,
    httpStatus: measurement.httpStatus,
    capturedAt: measurement.capturedAt,
    viewport: measurement.viewport,
    browser: measurement.browser,
    fontStatus: measurement.fontStatus,
    elementsMeasured: measurement.elementsMeasured,
    elementLimitReached: measurement.elementLimitReached,
    overlaysDismissed: measurement.overlaysDismissed,
    uncoveredShare: measurement.uncoveredShare,
    method: { clusterDeltaE2000: CLUSTER_DELTA_E, nearMergeDeltaE2000: NEAR_MERGE, dominantShare: DOMINANT_SHARE, accentShare: ACCENT_SHARE, saturatedFloor: SATURATED, sizeClusterPx: 0.5 },
    palette: analysis.palette,
    roles: analysis.roles.map(({ role, group, hex, share, tier }) => ({ role, group, hex, share, tier })),
    type: { scale: analysis.type.scale, body: analysis.type.body, families: analysis.type.families },
    spacing: { scale: analysis.spacing.scale, grid: analysis.spacing.grid },
    cssVariables: (measurement.vars || []).map(({ name, value }) => ({ name, value })),
    lowConfidence: analysis.lowConfidence,
  };
}

function targetIdFor(url) {
  return new URL(url).hostname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "reference";
}

module.exports = {
  CLUSTER_DELTA_E,
  EXTRACTION_SCHEMA,
  FILES,
  LOW,
  analyzeMeasurement,
  clusterColors,
  deltaE2000,
  designMdDraft,
  dismissOverlays,
  extractReference,
  extractionRecord,
  measureStyles,
  paletteEvidence,
  targetIdFor,
  tierOf,
  validateUrl,
};
