"use strict";

// The appearance ledger (OpenSpec change directions-from-three-sources): a user-level record of what
// delivered projects looked like, so the direction stage can avoid repeating it. It keeps appearance
// and sources only, never project text: a project hash, the date, the measured palette family, fonts,
// layout skeleton signature and motion posture, and the sources the direction came from.
//
// The look signature (OpenSpec change direction-look-signature) adds, inside the same appearance, the
// five things a person recognises a page by: accent hex, display and body font families, light or
// dark theme and hero layout class. The direction stage shows the last LOOKS signatures as advisory
// "you used these recently" information; nothing about a signature blocks.
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
const LOOKS = 5;

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

// ---- look signature ------------------------------------------------------------------------------

const hex = (rgb) => `#${rgb.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
const unhex = (value) => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16));
// WCAG relative luminance; below 0.179 white text reads better than black, so the page is dark.
function luminance(rgb) {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const themeOf = (rgb) => (luminance(rgb) < 0.179 ? "dark" : "light");
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const HERO_CLASSES = ["centred", "split", "full-bleed-image", "left", "right", "none", "unmeasured"];

// A photograph, not a texture: a raster (img, video or url() background, the body's and html's
// included) whose natural size is at least 640x360. A tiled noise or paper tile is smaller; an svg or
// canvas under the heading is a decorative background, so neither makes a full-bleed image.
const RASTER_MIN = { w: 640, h: 360 };
const photographic = (item) => (item.background || ["img", "video"].includes(item.tag)) && item.natural && item.natural.w >= RASTER_MIN.w && item.natural.h >= RASTER_MIN.h;

// The hero is the largest text whose top is in the first viewport. A photograph covering most of the
// viewport under it is a full-bleed image; media or a filled panel beside it, across the centre line, is
// a split; otherwise its own text alignment names the class. No text of 24px or more up there is no hero.
function heroLayout(elements, texts, pageFill) {
  const { width, height } = elements.viewport;
  const heading = texts.filter((text) => text.box.y < height && text.box.y + text.box.h > 0).sort((a, b) => b.fontSize - a.fontSize || a.box.y - b.box.y)[0];
  if (!heading || heading.fontSize < 24) return "none";
  const media = (Array.isArray(elements.media) ? elements.media : []).filter((item) => item.box && item.box.y < height && item.box.w > 0 && item.box.h > 0);
  if (media.some((item) => photographic(item) && item.box.w >= width * 0.6 && item.box.h >= height * 0.4 && overlap(item.box, heading.box) > 0)) return "full-bleed-image";
  const panels = elements.items.filter((item) => item.kind === "block" && item.box && Array.isArray(item.fill) && hex(item.fill) !== pageFill && item.box.w < width * 0.6);
  const side = (box) => {
    const cx = box.x + box.w / 2;
    return cx < width * 0.45 ? -1 : cx > width * 0.55 ? 1 : 0;
  };
  const headingSide = side(heading.box);
  const beside = (box) => box.w * box.h >= width * height * 0.08 && box.y < height
    && Math.min(box.y + box.h, heading.box.y + heading.box.h + height * 0.25) > Math.max(box.y, heading.box.y - height * 0.25)
    && overlap(box, heading.box) < heading.box.w * heading.box.h * 0.2
    && headingSide !== 0 && side(box) === -headingSide;
  if ([...media.filter((item) => !["body", "html"].includes(item.tag)), ...panels].some((item) => beside(item.box))) return "split";
  const align = String(heading.align || "");
  const cx = heading.box.x + heading.box.w / 2;
  if (align === "center") return "centred";
  if (align === "right" || align === "end") return "right";
  // A start-aligned title that a flex or grid parent shrank and centred is centred: its box sits in the
  // middle fifth and is narrower than 80% of the viewport (a full-width block box says nothing).
  if (cx >= width * 0.4 && cx <= width * 0.6 && heading.box.w < width * 0.8) return "centred";
  if (align) return "left";
  return cx < width * 0.4 ? "left" : cx > width * 0.6 ? "right" : "centred";
}

// The accent is the most repeated chromatic colour on small things: a button's own fill (or its
// gradient's first stop) counts three, a small filled block two, coloured text one. Large fills are the
// theme, not the accent. Neutrals never are: a white button on a dark page leaves the accent null.
function accentOf(elements, texts) {
  const { width, height } = elements.viewport;
  const counts = new Map();
  const add = (rgb, weight) => {
    if (Array.isArray(rgb) && chromatic(rgbToHsl(rgb))) tally(counts, hex(rgb), weight);
  };
  for (const text of texts) {
    if (text.box.w * text.box.h < width * height * 0.15) add(text.fill || text.gradient, 3);
    add(text.color, 1);
  }
  for (const block of elements.items) if (block.kind === "block" && block.box && block.box.w * block.box.h < width * height * 0.15) add(block.fill, 2);
  const saturation = (value) => rgbToHsl(unhex(value)).s;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || saturation(b[0]) - saturation(a[0]) || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

function signatureFromElements(elements) {
  const { width, height } = elements.viewport;
  const texts = elements.items.filter((item) => item.kind === "text" && item.box);
  // The page colour is the body's effective background. Cards on it, or a tall footer below the fold,
  // do not change it. Without one (an image or gradient on the way), the fills seen in the first
  // viewport decide, by the area they cover there.
  let pageFill = Array.isArray(elements.background) ? hex(elements.background) : null;
  if (!pageFill) {
    const fills = new Map();
    const first = { x: 0, y: 0, w: width, h: height };
    for (const block of elements.items) if (block.kind === "block" && block.box && Array.isArray(block.fill)) tally(fills, hex(block.fill), overlap(block.box, first));
    pageFill = [...fills.entries()].filter(([, area]) => area > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
  }
  const display = [...texts].sort((a, b) => b.fontSize - a.fontSize)[0];
  const body = new Map();
  for (const text of texts) if (text.fontSize <= 22) tally(body, family(text.fontFamily), String(text.text).length);
  return {
    accent: accentOf(elements, texts),
    displayFont: family(display?.fontFamily),
    bodyFont: top(body, 1)[0] || null,
    theme: pageFill ? themeOf(unhex(pageFill)) : "light",
    hero: heroLayout(elements, texts, pageFill),
  };
}

// Without a browser: the accent token the CSS declares, the fonts and lightness fromSource found.
function signatureFromSource(source, base) {
  const token = source.match(/--(?:color-)?(?:accent|primary|brand)\s*:\s*([^;}{]+)/i);
  const [rgb] = token ? colorLiterals(token[1]) : [];
  return {
    accent: rgb && chromatic(rgbToHsl(rgb)) ? hex(rgb) : null,
    displayFont: base.fonts[0] || null,
    bodyFont: base.fonts[1] || base.fonts[0] || null,
    theme: base.lightness === "dark" ? "dark" : "light",
    hero: "unmeasured",
  };
}

function summarizeAppearance({ elements, source }) {
  const browser = elements && Array.isArray(elements.items) && elements.viewport;
  const base = browser ? { ...fromElements(elements), measured: "browser" } : { ...fromSource(source), measured: "source" };
  const signature = browser ? signatureFromElements(elements) : signatureFromSource(source, base);
  return { measured: base.measured, lightness: base.lightness, hues: base.hues, fonts: base.fonts, skeleton: base.skeleton, motion: motionPosture(source), signature };
}

// ---- recent looks (advisory) ----------------------------------------------------------------------

const HERO_WORDS = { centred: "centred hero", split: "split hero", "full-bleed-image": "full-bleed image hero", left: "left-aligned hero", right: "right-aligned hero", none: "no hero", unmeasured: "hero unmeasured" };

// One line a person reads: "dark theme, split hero, display fraunces, body inter, accent #e4572e".
function describeLook(look) {
  if (!look || typeof look !== "object") return "";
  return [
    look.theme ? `${look.theme} theme` : null,
    HERO_WORDS[look.hero] || null,
    look.displayFont ? `display ${look.displayFont}` : null,
    look.bodyFont && look.bodyFont !== look.displayFont ? `body ${look.bodyFont}` : null,
    look.accent ? `accent ${look.accent}` : null,
  ].filter(Boolean).join(", ");
}

const validLook = (look) => look && typeof look === "object" && (look.accent === null || /^#[0-9a-f]{6}$/.test(look.accent)) && HERO_CLASSES.includes(look.hero) && ["light", "dark"].includes(look.theme);

// The last `count` delivered looks, newest first, without the given project's own entry. Entries from
// before the signature existed, or with a malformed one, are left out rather than guessed.
function recentLooks(entries, { count = LOOKS, exclude = null } = {}) {
  return [...entries].reverse()
    .filter((entry) => entry.project !== exclude && validLook(entry.appearance?.signature))
    .slice(0, count)
    .map((entry) => ({ date: entry.date, look: entry.appearance.signature, says: describeLook(entry.appearance.signature) }));
}

// Which parts of a look a recent one repeats. Accents within 48 RGB units read as the same colour.
function lookOverlap(look, recent) {
  if (!validLook(look) || !validLook(recent)) return [];
  const shared = [];
  if (look.accent && recent.accent) {
    const [a, b] = [unhex(look.accent), unhex(recent.accent)];
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= 48) shared.push(`accent ${recent.accent}`);
  }
  if (look.displayFont && look.displayFont === recent.displayFont) shared.push(`display ${recent.displayFont}`);
  if (look.bodyFont && look.bodyFont === recent.bodyFont && look.bodyFont !== look.displayFont) shared.push(`body ${recent.bodyFont}`);
  if (look.theme === recent.theme) shared.push(`${recent.theme} theme`);
  if (!["none", "unmeasured"].includes(look.hero) && look.hero === recent.hero) shared.push(HERO_WORDS[recent.hero]);
  return shared;
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

module.exports = { LOOKS, RECENT, SCHEMA, collides, describeLook, lookOverlap, recentLooks, ledgerPath, measurePage, motionPosture, paletteKey, projectId, readLedger, recentEntries, recentSources, recordDelivery, recordEntry, sharedAspects, summarizeAppearance, pageSource };
