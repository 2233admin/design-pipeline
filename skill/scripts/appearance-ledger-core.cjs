"use strict";

// The appearance ledger (OpenSpec change directions-from-three-sources): a user-level record of what
// delivered projects looked like, so the direction stage can avoid repeating it. It keeps appearance
// and sources only, never project text: a project hash, the date, the measured palette family, fonts,
// layout skeleton signature and motion posture, and the sources the direction came from.
//
// Location: ~/.design-pipeline/ledger.json, or the file DESIGN_PIPELINE_LEDGER names (tests, CI).
// Measurement reuses `composition capture`'s elements.json (visible text and blocks with box, font and
// effective colors); with no browser it falls back to the page's own CSS, and says so (`measured`).

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCHEMA = "design-pipeline.appearance-ledger.v1";
const KEEP = 200;
const RECENT = 3;

function ledgerPath() {
  return process.env.DESIGN_PIPELINE_LEDGER ? path.resolve(process.env.DESIGN_PIPELINE_LEDGER) : path.join(os.homedir(), ".design-pipeline", "ledger.json");
}

// An unreadable or foreign ledger reads as empty: a user-level file must never block a project.
function readLedger(file = ledgerPath()) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value?.schema !== SCHEMA || !Array.isArray(value.entries)) return [];
    return value.entries.filter((entry) => entry && typeof entry.project === "string" && entry.appearance && Array.isArray(entry.sources));
  } catch {
    return [];
  }
}

const recentEntries = (count = RECENT, file) => readLedger(file).slice(-count);

function projectId(root) {
  return `p-${crypto.createHash("sha256").update(fs.realpathSync.native(path.resolve(root))).digest("hex").slice(0, 16)}`;
}

// One entry per project: a later delivery or acceptance of the same project replaces its entry.
function recordEntry(entry, file = ledgerPath()) {
  const entries = [...readLedger(file).filter((item) => item.project !== entry.project), entry].slice(-KEEP);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify({ schema: SCHEMA, entries }, null, 2)}\n`);
  fs.renameSync(temporary, file);
  return entries.length;
}

// ---- measurement ----------------------------------------------------------------------------------

const GENERIC_FONTS = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "inherit", "initial", "unset", "emoji", "math", "-apple-system", "blinkmacsystemfont", "segoe ui"]);
const family = (list) => String(list || "").split(",").map((name) => name.trim().replace(/^["']|["']$/g, "").toLowerCase()).find((name) => name && !GENERIC_FONTS.has(name) && !name.startsWith("var(")) || null;

function rgbToHsl([r, g, b]) {
  const [x, y, z] = [r, g, b].map((value) => value / 255);
  const max = Math.max(x, y, z);
  const min = Math.min(x, y, z);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === x ? (y - z) / d + (y < z ? 6 : 0) : max === y ? (z - x) / d + 2 : (x - y) / d + 4;
  return { h: h * 60, s, l };
}

const HUE_FAMILIES = [[15, "red"], [45, "orange"], [70, "yellow"], [165, "green"], [200, "teal"], [255, "blue"], [300, "violet"], [345, "pink"], [360, "red"]];
const hueFamily = (h) => HUE_FAMILIES.find(([limit]) => h < limit)[1];
// Colors with no saturation or at the extremes of lightness are neutrals: they set the lightness, not the hue.
const chromatic = ({ s, l }) => s >= 0.18 && l > 0.1 && l < 0.92;
const lightnessOf = (l) => (l < 0.28 ? "dark" : l > 0.62 ? "light" : "mid");

function tally(map, key, weight) {
  if (key) map.set(key, (map.get(key) || 0) + weight);
}
const top = (map, count) => [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, count).map(([key]) => key);

// The page's motion posture from its own source: keyframes, animation libraries and scroll-driven
// effects are "animated", transitions alone "subtle", neither "none".
function motionPosture(source) {
  if (/@keyframes|animation(?:-name)?\s*:|animation-timeline|gsap|anime\(|lottie|framer-motion|IntersectionObserver|requestAnimationFrame|<canvas|three\.js|THREE\./i.test(source)) return "animated";
  return /transition\s*:|transition-property/i.test(source) ? "subtle" : "none";
}

function colorLiterals(css) {
  const colors = [];
  for (const [, hex] of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    colors.push([0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)));
  }
  for (const [, r, g, b] of css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) colors.push([Number(r), Number(g), Number(b)]);
  return colors;
}

// The source-only measurement: what the page's CSS declares.
function fromSource(source) {
  const fonts = new Map();
  for (const [, list] of source.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) tally(fonts, family(list), 1);
  const hues = new Map();
  for (const rgb of colorLiterals(source)) {
    const hsl = rgbToHsl(rgb);
    if (chromatic(hsl)) tally(hues, hueFamily(hsl.h), 1);
  }
  const backgrounds = new Map();
  for (const [, value] of source.matchAll(/background(?:-color)?\s*:\s*([^;}{]+)/gi)) {
    const [rgb] = colorLiterals(value);
    if (rgb) tally(backgrounds, lightnessOf(rgbToHsl(rgb).l), 1);
  }
  return { lightness: top(backgrounds, 1)[0] || "light", hues: top(hues, 2), fonts: top(fonts, 2), skeleton: "unmeasured" };
}

// The browser measurement over composition capture's elements.json.
function fromElements(elements) {
  const { width, height } = elements.viewport;
  const texts = elements.items.filter((item) => item.kind === "text" && item.box);
  const blocks = elements.items.filter((item) => item.kind === "block" && item.box);
  const backgrounds = new Map();
  const hues = new Map();
  const add = (rgb, weight) => {
    if (!Array.isArray(rgb)) return;
    const hsl = rgbToHsl(rgb);
    if (chromatic(hsl)) tally(hues, hueFamily(hsl.h), weight);
  };
  const area = (item) => Math.max(1, item.box.w * item.box.h);
  for (const block of blocks) {
    if (Array.isArray(block.fill)) {
      tally(backgrounds, lightnessOf(rgbToHsl(block.fill).l), area(block));
      add(block.fill, area(block));
    }
  }
  if (Array.isArray(elements.background)) tally(backgrounds, lightnessOf(rgbToHsl(elements.background).l), width * height * 0.5);
  for (const text of texts) {
    if (!backgrounds.size && Array.isArray(text.background)) tally(backgrounds, lightnessOf(rgbToHsl(text.background).l), area(text));
    add(text.color, area(text) * 0.5);
  }
  const fonts = new Map();
  const display = [...texts].sort((a, b) => b.fontSize - a.fontSize)[0];
  const body = new Map();
  for (const text of texts) if (text.fontSize <= 22) tally(body, family(text.fontFamily), String(text.text).length);
  tally(fonts, family(display?.fontFamily), 1e9);
  for (const name of top(body, 1)) tally(fonts, name, 1e6);

  let skeleton = "unmeasured";
  if (texts.length) {
    const share = { left: 0, center: 0, right: 0 };
    for (const text of texts) share[text.box.x + text.box.w / 2 < width * 0.4 ? "left" : text.box.x + text.box.w / 2 > width * 0.6 ? "right" : "center"] += area(text);
    const total = share.left + share.center + share.right;
    const balance = share.left / total >= 0.3 && share.right / total >= 0.3 ? "split" : top(new Map(Object.entries(share)), 1)[0];
    const cx = display.box.x + display.box.w / 2;
    const cy = display.box.y + display.box.h / 2;
    const hero = `${cy < height / 3 ? "top" : cy > (height * 2) / 3 ? "bottom" : "middle"}-${cx < width * 0.4 ? "left" : cx > width * 0.6 ? "right" : "center"}`;
    const sizes = texts.map((text) => text.fontSize).sort((a, b) => a - b);
    const contrast = display.fontSize / sizes[Math.floor(sizes.length / 2)];
    skeleton = `${balance}/${hero}/${contrast >= 4 ? "bold" : contrast < 2.2 ? "even" : "mid"}/${texts.length < 12 ? "sparse" : texts.length < 30 ? "normal" : "dense"}`;
  }
  return { lightness: top(backgrounds, 1)[0] || "light", hues: top(hues, 2), fonts: top(fonts, 2), skeleton };
}

function summarizeAppearance({ elements, source }) {
  const base = elements && Array.isArray(elements.items) && elements.viewport ? { ...fromElements(elements), measured: "browser" } : { ...fromSource(source), measured: "source" };
  return { measured: base.measured, lightness: base.lightness, hues: base.hues, fonts: base.fonts, skeleton: base.skeleton, motion: motionPosture(source) };
}

// A page's own source: the HTML and the local stylesheets and scripts it names (a bounded read).
function pageSource(file) {
  const html = fs.readFileSync(file, "utf8");
  const parts = [html];
  const dir = path.dirname(file);
  let budget = 2 * 1024 * 1024;
  for (const [, ref] of [...html.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi), ...html.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi)].slice(0, 20)) {
    if (/^[a-z]+:|^\/\//i.test(ref)) continue;
    try {
      const target = path.resolve(dir, ref.split(/[?#]/)[0]);
      if (path.relative(dir, target).startsWith("..") || !fs.statSync(target).isFile() || fs.statSync(target).size > budget) continue;
      budget -= fs.statSync(target).size;
      parts.push(fs.readFileSync(target, "utf8"));
    } catch { /* an unreadable asset only narrows the measurement */ }
  }
  return parts.join("\n");
}

// `composition capture` on the page, best effort: no browser or a failing page means no elements.
function captureElements(file, { width = 1440, height = 900, timeout = 90000 } = {}) {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "appearance-"));
  try {
    const child = spawnSync(process.execPath, [path.join(__dirname, "capture-composition.cjs"), "--composition", file, "--output", output, "--width", String(width), "--height", String(height)], { encoding: "utf8", timeout, windowsHide: true });
    if (child.status !== 0) return null;
    return JSON.parse(fs.readFileSync(path.join(output, "elements.json"), "utf8"));
  } catch {
    return null;
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
}

function measurePage(file, options = {}) {
  const elements = options.elements === undefined ? captureElements(file, options) : options.elements;
  return summarizeAppearance({ elements, source: pageSource(file) });
}

// Written on delivery: the page at the project root measured, with the sources its direction used.
// Returns why nothing was written when the project has no page or the page shows nothing to measure.
function recordDelivery(root, sources, options = {}) {
  const file = path.join(path.resolve(root), "index.html");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return { status: "skipped", reason: "the project has no index.html to measure" };
  const appearance = measurePage(file, options);
  if (!appearance.fonts.length && !appearance.hues.length && appearance.skeleton === "unmeasured") return { status: "skipped", reason: "index.html declares no fonts or colors to measure" };
  const date = new Date(process.env.DESIGN_PIPELINE_NOW || Date.now()).toISOString().slice(0, 10);
  recordEntry({ project: projectId(root), date, appearance, sources: [...new Set(sources)] });
  return { status: "recorded", ledger: ledgerPath(), appearance };
}

// ---- collision ------------------------------------------------------------------------------------

const paletteKey = (appearance) => `${appearance.lightness}:${appearance.hues?.[0] || "neutral"}`;

// What two appearances share. They collide when the palette family matches and either the display
// font or the layout skeleton does too: the same dressing over the same shape.
function sharedAspects(a, b) {
  const shared = [];
  if (paletteKey(a) === paletteKey(b)) shared.push("palette");
  if (a.fonts?.[0] && a.fonts[0] === b.fonts?.[0]) shared.push("display font");
  if (a.skeleton && a.skeleton !== "unmeasured" && a.skeleton === b.skeleton) shared.push("layout skeleton");
  return shared;
}
const collides = (a, b) => {
  const shared = sharedAspects(a, b);
  return shared.includes("palette") && shared.length >= 2 ? shared : null;
};

// The sources the last deliveries used, as the keys cards and roulette draws are compared by.
const recentSources = (entries) => new Set(entries.flatMap((entry) => entry.sources));

module.exports = { RECENT, SCHEMA, collides, ledgerPath, measurePage, motionPosture, paletteKey, projectId, readLedger, recentEntries, recentSources, recordDelivery, recordEntry, sharedAspects, summarizeAppearance, pageSource };
