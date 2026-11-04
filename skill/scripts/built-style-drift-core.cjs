"use strict";

// Measured spec drift (OpenSpec change measured-spec-drift). The Spec Reconciliation table is what
// the author says changed; this is what the built page actually paints. `reconciliation measure`
// loads the built index.html in headless Chromium, records every computed colour and font family it
// paints with how much of the page each covers, and writes `built-styles.json` in the change root.
// `reconciliation check` compares that record with the DESIGN.md front-matter tokens by CIEDE2000
// and folds the result into the existing `specDrift` record: a measured drift the table does not
// account for blocks the same gate, it is not a second one.

const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { fail, sha256 } = require("./contract-utils.cjs");
const { frontMatterGroups } = require("./design-system-package-core.cjs");

const SCOPE = "measured spec drift";
const BUILT_STYLES_SCHEMA = "design-pipeline.built-styles.v1";
const BUILT_STYLES_FILE = "built-styles.json";
// CIEDE2000 1.0 is about one just-noticeable difference; 2.0 leaves room for the rounding a token
// takes on its way through a preprocessor or `color-mix()` without hiding a deliberate repaint.
const DELTA_E_TOLERANCE = 2;
// A colour or family covering less than this share of its kind (text characters, painted area or
// border length) is a stray value: reported, never blocking. At or above it the drift is major.
const MAJOR_SHARE = 0.01;
// Area alone under-weighs the loudest drift: a primary button is a fraction of a percent of a long
// page, and a 1px card border needs dozens of cards to reach 1%. A colour this far from every token
// (CIEDE2000 10 is an obviously different colour, not a shade) blocks regardless of share when it
// sits on a control, is the page background, or is a surface or border repeated on this many elements.
const LOUD_DELTA_E = 10;
const LOUD_ELEMENTS = 3;
// What one measurement does and does not see; recorded with every measurement and in the gate result,
// so a clean result is never read as covering more than it measured.
const MEASUREMENT_SCOPE = {
  colorScheme: "light",
  measured: [
    "computed text colour of visible elements with their own text, composited over the nearest opaque background",
    "computed background, border and SVG fill/stroke colours of visible elements",
    "partial opacity: the product of an element's and its ancestors' opacity, composited",
    "the root canvas (html, body, else white)",
    "the first family each text element names and the first family of its stack the browser can render",
    "local files the page loaded (fonts, CSS, images), hashed into the measurement lineage",
  ],
  notMeasured: [
    "pixels drawn by <canvas>, <img>, <video>, CSS background images and gradients",
    "text-shadow, box-shadow, outline, filters and blend modes",
    "::before / ::after pseudo-element content",
    "dark colour scheme: the page is measured with prefers-color-scheme: light only",
    "per-glyph font fallback inside a family (CJK or emoji glyphs a token font lacks render in a fallback that is not detected)",
    "states the static page does not show (hover, focus, open menus) and viewports other than 1440x900",
    "translucent backgrounds stacked under a translucent ancestor background (composited over the nearest opaque one only)",
  ],
};
const ELEMENT_LIMIT = 6000;
const NAVIGATION_TIMEOUT_MS = 30000;
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const GENERIC_FAMILIES = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif",
  "ui-monospace", "ui-rounded", "emoji", "math", "fangsong", "-apple-system", "blinkmacsystemfont",
]);

// --- colour --------------------------------------------------------------------------------------
// Local CIEDE2000 (Sharma, Wu and Dalal 2005, kL = kC = kH = 1). The reference-extract change
// (PR #251) carries the same `deltaE2000(rgbA, rgbB)` signature; whichever lands second moves both
// callers onto one helper.

function parseHex(value) {
  if (typeof value !== "string") return null;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim());
  if (!match) return null;
  let digits = match[1];
  if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("");
  const rgb = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));
  const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
  return { rgb, alpha };
}

function toHex(rgb) {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function toLab([r, g, b]) {
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  // sRGB D65 -> XYZ, normalised by the D65 white point.
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) / 1;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE2000(rgbA, rgbB) {
  return deltaE2000Lab(toLab(rgbA), toLab(rgbB));
}

function deltaE2000Lab([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const meanC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const hue = (b, a) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const hp1 = hue(b1, ap1);
  const hp2 = hue(b2, ap2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
  const meanL = (L1 + L2) / 2;
  const meanCp = (Cp1 + Cp2) / 2;
  let meanH = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) <= 180) meanH /= 2;
    else meanH = hp1 + hp2 < 360 ? (meanH + 360) / 2 : (meanH - 360) / 2;
  }
  const T = 1 - 0.17 * Math.cos((meanH - 30) * rad) + 0.24 * Math.cos(2 * meanH * rad)
    + 0.32 * Math.cos((3 * meanH + 6) * rad) - 0.2 * Math.cos((4 * meanH - 63) * rad);
  const dTheta = 30 * Math.exp(-(((meanH - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(meanCp ** 7 / (meanCp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
  const SC = 1 + 0.045 * meanCp;
  const SH = 1 + 0.015 * meanCp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

// --- tokens --------------------------------------------------------------------------------------

function firstFamily(stack) {
  if (typeof stack !== "string") return null;
  const first = stack.split(",")[0].trim().replace(/^["']|["']$/g, "").trim();
  return first || null;
}

function familyKey(family) {
  return String(family).trim().replace(/^["']|["']$/g, "").toLowerCase();
}

// Front-matter colour tokens may point at each other (`{colors.primary}`); a reference is resolved,
// anything else that is not a hex colour is reported rather than silently dropped.
function designTokens(designText) {
  const groups = frontMatterGroups(designText);
  const colorGroup = groups.colors && typeof groups.colors === "object" ? groups.colors : {};
  const colors = [];
  const unreadable = [];
  const resolve = (value, seen = new Set()) => {
    const ref = typeof value === "string" ? /^\{colors\.([^}]+)\}$/.exec(value.trim()) : null;
    if (!ref) return value;
    if (seen.has(ref[1])) return null;
    seen.add(ref[1]);
    return resolve(colorGroup[ref[1]], seen);
  };
  for (const [name, raw] of Object.entries(colorGroup)) {
    const parsed = parseHex(resolve(raw));
    if (parsed) colors.push({ name, hex: toHex(parsed.rgb), rgb: parsed.rgb });
    else unreadable.push({ name, value: raw });
  }
  const typography = groups.typography && typeof groups.typography === "object" ? groups.typography : {};
  const families = new Map();
  for (const [name, style] of Object.entries(typography)) {
    const stack = style && typeof style === "object" ? style.fontFamily : null;
    const family = firstFamily(stack);
    if (!family) continue;
    const key = familyKey(family);
    if (!families.has(key)) families.set(key, { family, tokens: [] });
    families.get(key).tokens.push(`typography.${name}`);
  }
  return { colors, fonts: [...families.values()], unreadable };
}

// A CI gate must not fail open: a DESIGN.md with no colour or no font tokens would compare nothing
// and report a clean page forever, so the comparison is refused instead.
function baselineGaps(tokens) {
  const gaps = [];
  if (!tokens.colors.length) gaps.push("no hex colour token under `colors`");
  if (!tokens.fonts.length) gaps.push("no `fontFamily` under `typography`");
  return gaps;
}

// --- comparison ----------------------------------------------------------------------------------

function round(value, places = 2) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

// Text is weighed in characters, everything else in painted px² (a border is its width times its
// length), so a lone hairline is a sliver of the page rather than "100% of the borders". The root
// canvas is not in the denominator: it would dilute every painted colour by the page's length.
const PAINT_KINDS = ["surface", "border", "graphic"];

function colorShare(entry, totals) {
  const weights = entry.weights || {};
  const paintTotal = PAINT_KINDS.reduce((sum, kind) => sum + (totals[kind] || 0), 0);
  const paint = PAINT_KINDS.reduce((sum, kind) => sum + (weights[kind] || 0), 0);
  const text = totals.text > 0 ? (weights.text || 0) / totals.text : 0;
  return Math.max(text, paintTotal > 0 ? paint / paintTotal : 0);
}

// Why a colour far from every token blocks whatever its share, or null.
function loudness(entry, distance) {
  if (!(distance > LOUD_DELTA_E)) return null;
  if ((entry.weights || {}).canvas > 0) return "it is the page background";
  if ((entry.interactive || 0) > 0) return `it is on ${entry.interactive} interactive element(s)`;
  const elements = entry.elements || {};
  const repeated = Math.max(elements.surface || 0, elements.border || 0);
  if (repeated >= LOUD_ELEMENTS) return `it is a surface or border on ${repeated} elements`;
  return null;
}

function shareLabel(entry) {
  const kinds = Object.keys(entry.weights || {});
  const parts = [];
  if (kinds.includes("canvas")) parts.push("page background");
  if (kinds.includes("text")) parts.push("text");
  if (kinds.some((kind) => PAINT_KINDS.includes(kind))) parts.push("painted area");
  return parts.join(" or ");
}

function percent(share) {
  const value = share * 100;
  return value > 0 && value < 0.1 ? "<0.1%" : `${round(value, 1)}%`;
}

function where(samples) {
  return Array.isArray(samples) && samples.length ? ` (${samples.slice(0, 3).join(", ")})` : "";
}

function compareBuiltStyles(measurement, tokens, { tolerance = DELTA_E_TOLERANCE } = {}) {
  const findings = [];
  const usedTokens = new Set();
  const totals = measurement.totals || {};
  for (const entry of measurement.colors || []) {
    const parsed = parseHex(entry.hex);
    if (!parsed) continue;
    let nearest = null;
    for (const token of tokens.colors) {
      const distance = deltaE2000(parsed.rgb, token.rgb);
      // Every token the colour matches is in use, so an alias (`accent: "{colors.primary}"`) is too.
      if (distance <= tolerance) usedTokens.add(token.name);
      if (!nearest || distance < nearest.distance) nearest = { token, distance };
    }
    const share = colorShare(entry, totals);
    if (nearest && nearest.distance <= tolerance) continue;
    const hex = toHex(parsed.rgb);
    const token = nearest.token;
    const loud = loudness(entry, nearest.distance);
    findings.push({
      kind: "color",
      severity: share >= MAJOR_SHARE || loud ? "major" : "minor",
      ...(loud ? { loud } : {}),
      value: `colors.${token.name}`,
      specified: token.hex,
      implemented: hex,
      deltaE: round(nearest.distance),
      share: round(share, 4),
      samples: entry.samples || [],
      message: `the page paints ${hex}${where(entry.samples)}, up to ${percent(share)} of its ${shareLabel(entry)}${loud ? ` (${loud})` : ""}; `
        + `the nearest DESIGN.md token is colors.${token.name} ${token.hex} at CIEDE2000 ${round(nearest.distance)} (tolerance ${tolerance})`,
      fix: `paint colors.${token.name} (${token.hex}) where the page uses ${hex}, add ${hex} to DESIGN.md colors, `
        + `or record the row | colors.${token.name} | ${token.hex} | ${hex} | <what the render showed> | in Spec Reconciliation`,
    });
  }
  for (const token of tokens.colors) {
    if (usedTokens.has(token.name)) continue;
    findings.push({
      kind: "color",
      severity: "minor",
      value: `colors.${token.name}`,
      specified: token.hex,
      implemented: null,
      message: `DESIGN.md colors.${token.name} ${token.hex} is not painted anywhere on the built page within CIEDE2000 ${tolerance}`,
      fix: `use colors.${token.name} where the spec places it, or remove it from DESIGN.md if the design dropped it`,
    });
  }

  const tokenFamilies = new Map(tokens.fonts.map((font) => [familyKey(font.family), font]));
  const usedFamilies = new Set();
  const textTotal = totals.text || 0;
  for (const font of measurement.fonts || []) {
    const share = textTotal > 0 ? (font.chars || 0) / textTotal : 0;
    const severity = share >= MAJOR_SHARE ? "major" : "minor";
    const tokenList = tokens.fonts.map((item) => item.family).join(", ");
    // A token family named first but not rendered is drift even though the stylesheet names it.
    const firstToken = font.first ? tokenFamilies.get(familyKey(font.first)) : null;
    if (firstToken && font.available === false) {
      usedFamilies.add(familyKey(font.first));
      const token = firstToken;
      findings.push({
        kind: "font",
        severity,
        value: token.tokens[0],
        specified: token.family,
        implemented: font.rendered || font.stack,
        share: round(share, 4),
        samples: font.samples || [],
        message: `the page names ${token.family}${where(font.samples)} but the browser has no such font, so ${percent(share)} of its text renders in the fallback ${font.rendered || "of the stack"}`,
        fix: `ship ${token.family} with the page (an @font-face the page loads) or record the row | ${token.tokens[0]} | ${token.family} | ${font.rendered || font.stack} | <what the render showed> | in Spec Reconciliation`,
      });
      continue;
    }
    // Otherwise the text is compared by the family it renders in; the first family named stands in
    // only when nothing in the stack could be confirmed.
    const family = font.rendered || font.first || font.family;
    const key = familyKey(family);
    if (tokenFamilies.has(key)) {
      usedFamilies.add(key);
      continue;
    }
    const generic = GENERIC_FAMILIES.has(key);
    findings.push({
      kind: "font",
      severity,
      value: tokens.fonts[0] ? tokens.fonts[0].tokens[0] : "typography",
      specified: tokenList,
      implemented: family,
      share: round(share, 4),
      samples: font.samples || [],
      message: `${percent(share)} of the page's text${where(font.samples)} renders in ${generic ? "the generic family " : ""}${family}, which no DESIGN.md typography token names (${tokenList})`,
      fix: `set that text in a typography token family (${tokenList}), add ${family} to DESIGN.md typography, `
        + `or record the row | ${tokens.fonts[0] ? tokens.fonts[0].tokens[0] : "typography"} | ${tokenList} | ${family} | <what the render showed> | in Spec Reconciliation`,
    });
  }
  for (const font of tokens.fonts) {
    if (usedFamilies.has(familyKey(font.family))) continue;
    findings.push({
      kind: "font",
      severity: "minor",
      value: font.tokens[0],
      specified: font.family,
      implemented: null,
      message: `DESIGN.md ${font.tokens.join(", ")} names ${font.family}, which no text on the built page uses`,
      fix: `set the text ${font.tokens.join(", ")} describes in ${font.family}, or remove the token if the design dropped it`,
    });
  }
  for (const item of tokens.unreadable) {
    findings.push({
      kind: "color",
      severity: "minor",
      value: `colors.${item.name}`,
      specified: String(item.value),
      implemented: null,
      message: `DESIGN.md colors.${item.name} is ${JSON.stringify(item.value)}, which is not a hex colour, so it was not compared`,
      fix: `write colors.${item.name} as a hex colour (#rrggbb), as the DESIGN.md format requires`,
    });
  }
  return findings;
}

// A Spec Reconciliation row accounts for a measured drift when its Implemented cell names the measured
// value: a hex for a colour (any case, 3 or 6 digits), or one comma-separated entry equal to the family
// for a font, so `serif` never covers `sans-serif` and `Inter` never covers `Interstate`. Prose that
// does not name the value does not cover it.
function cellHexes(cell) {
  return (cell.match(/#[0-9a-f]{3,8}\b/gi) || []).map((value) => {
    const parsed = parseHex(value);
    return parsed ? toHex(parsed.rgb) : value.toLowerCase();
  });
}

function cellFamilies(cell) {
  return cell.split(",").map((item) => familyKey(item.trim())).filter(Boolean);
}

function coveringRow(finding, rows) {
  if (!finding.implemented) return null;
  if (finding.kind === "color") {
    const parsed = parseHex(finding.implemented);
    const needle = parsed ? toHex(parsed.rgb) : finding.implemented.toLowerCase();
    const row = (rows || []).find((item) => cellHexes(String(item.implemented || "")).includes(needle));
    return row ? row.index : null;
  }
  const needle = familyKey(finding.implemented);
  const row = (rows || []).find((item) => cellFamilies(String(item.implemented || "")).includes(needle));
  return row ? row.index : null;
}

// --- measurement record --------------------------------------------------------------------------

function validateMeasurement(value) {
  const problems = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["is not a JSON object"];
  if (value.schema !== BUILT_STYLES_SCHEMA) problems.push(`declares schema ${JSON.stringify(value.schema)} instead of ${BUILT_STYLES_SCHEMA}`);
  for (const field of ["page", "designFile", "designSha256", "capturedAt"]) {
    if (typeof value[field] !== "string" || !value[field]) problems.push(`records no ${field}`);
  }
  if (!Array.isArray(value.colors)) problems.push("records no colors array");
  if (!Array.isArray(value.fonts)) problems.push("records no fonts array");
  if (!value.totals || typeof value.totals !== "object") problems.push("records no totals");
  if (!value.lineage || typeof value.lineage !== "object" || Array.isArray(value.lineage)) problems.push("records no lineage of the files the page loaded");
  if (!value.scope || !Array.isArray(value.scope.notMeasured)) problems.push("records no scope (what was and was not measured)");
  // A page that painted nothing measurable is not a clean page; it is an empty capture.
  if (Array.isArray(value.colors) && Array.isArray(value.fonts) && !value.colors.length && !value.fonts.length) {
    problems.push("measured no colours and no fonts (an empty capture)");
  }
  return problems;
}

// --- browser side --------------------------------------------------------------------------------

// Runs in the page. Every colour is normalised through a 1x1 canvas, so `oklch()`, `color()` and
// named colours all come back as the 8-bit sRGB the screen shows. A translucent colour, and any
// element under partial `opacity` (the product of its own and its ancestors' opacity), is composited
// over the nearest opaque ancestor background (white past the root): what the eye compares with a
// token. What this does not see is listed in MEASUREMENT_SCOPE.notMeasured and recorded with every
// measurement.
function measureBuiltStyles(elementLimit) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  const pixel = (value, backdrop, opacity = 1) => {
    const key = `${value}|${backdrop || ""}|${opacity}`;
    if (cache.has(key)) return cache.get(key);
    // An unparseable value leaves fillStyle unchanged, so it is reset to transparent first.
    const paint = (colour, alphaScale) => {
      ctx.globalAlpha = alphaScale;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      ctx.globalAlpha = 1;
    };
    ctx.clearRect(0, 0, 1, 1);
    paint(value, 1);
    const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
    let result = null;
    if (alpha > 0 && opacity > 0) {
      ctx.clearRect(0, 0, 1, 1);
      if (backdrop) paint(backdrop, 1);
      paint(value, opacity);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      result = { hex: `#${[data[0], data[1], data[2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`, alpha: alpha / 255 };
    }
    cache.set(key, result);
    return result;
  };
  const opaque = (value) => {
    const read = pixel(value, null);
    return read && read.alpha === 1 ? read.hex : null;
  };
  const rootBackground = () => {
    for (const element of [document.documentElement, document.body]) {
      if (!element) continue;
      const hex = opaque(getComputedStyle(element).backgroundColor);
      if (hex) return hex;
    }
    return "#ffffff";
  };
  const canvasColor = rootBackground();
  const backdropOf = (element) => {
    for (let node = element.parentElement; node; node = node.parentElement) {
      const hex = opaque(getComputedStyle(node).backgroundColor);
      if (hex) return hex;
    }
    return canvasColor;
  };
  // The effective opacity: the product along the ancestor chain, 0 when anything hides the element.
  const effectiveOpacity = (element, style) => {
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return 0;
    let product = 1;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      product *= Number(getComputedStyle(node).opacity);
      if (product === 0) return 0;
    }
    return product;
  };
  const label = (element) => {
    const id = element.id ? `#${element.id}` : "";
    const cls = typeof element.className === "string" && element.className.trim() ? `.${element.className.trim().split(/\s+/)[0]}` : "";
    return `${element.localName}${id || cls}`;
  };
  const INTERACTIVE = "button, a[href], input, select, textarea, summary, [role=button], [role=link], [role=tab], [role=menuitem]";
  const colors = new Map();
  const totals = { text: 0, surface: 0, border: 0, graphic: 0 };
  const add = (hex, kind, weight, element) => {
    if (!hex || !(weight > 0)) return;
    if (!colors.has(hex)) colors.set(hex, { hex, weights: {}, elements: {}, samples: [], seenInteractive: new Set() });
    const entry = colors.get(hex);
    entry.weights[kind] = (entry.weights[kind] || 0) + weight;
    if (kind in totals) totals[kind] += weight;
    if (element) {
      entry.elements[kind] ||= new Set();
      entry.elements[kind].add(element);
      // A control, or anything inside one (the label span of a button), is where a token matters most.
      if (element.closest(INTERACTIVE)) entry.seenInteractive.add(element);
    }
    const name = element ? label(element) : "canvas";
    if (entry.samples.length < 3 && !entry.samples.includes(name)) entry.samples.push(name);
  };
  // The root canvas is its own kind: it is the page background, not a share of the painted area.
  const docArea = document.documentElement.scrollWidth * document.documentElement.scrollHeight;
  add(canvasColor, "canvas", docArea, null);

  const fonts = new Map();
  const probe = document.createElement("canvas").getContext("2d");
  const textWidth = (family) => {
    probe.font = `72px ${family}`;
    return probe.measureText("mmmmmmmmmmlli1WQ@#&%").width;
  };
  const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji", "math", "fangsong"]);
  const families = (stack) => stack.split(",").map((item) => item.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const quoted = (family) => (generic.has(family.toLowerCase()) ? family : `"${family.replace(/"/g, "")}"`);
  // A family is available when it changes the width of a sample against at least one fallback; a
  // family the browser cannot find measures exactly like the fallback it falls through to.
  const available = (family) => {
    if (generic.has(family.toLowerCase())) return true;
    return ["monospace", "serif", "sans-serif"].some((fallback) => textWidth(`${quoted(family)}, ${fallback}`) !== textWidth(fallback));
  };
  const availability = new Map();
  const isAvailable = (family) => {
    const key = family.toLowerCase();
    if (!availability.has(key)) availability.set(key, available(family));
    return availability.get(key);
  };

  const elements = [...(document.body ? document.body.querySelectorAll("*") : [])].slice(0, elementLimit);
  if (document.body) elements.unshift(document.body);
  let inspected = 0;
  for (const element of elements) {
    if (element.closest("script,style,noscript,template,head")) continue;
    const style = getComputedStyle(element);
    const opacity = effectiveOpacity(element, style);
    if (opacity === 0) continue;
    const box = element.getBoundingClientRect();
    inspected += 1;
    const ownText = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent).join("").replace(/\s+/g, "");
    if (ownText.length && box.width >= 1 && box.height >= 1) {
      const backdrop = opaque(style.backgroundColor) || backdropOf(element);
      const read = pixel(style.color, backdrop, opacity);
      if (read) add(read.hex, "text", ownText.length, element);
      const stack = families(style.fontFamily);
      const first = stack[0] || "";
      // The family the text renders in is the first one the browser has; the first one named is kept
      // so a token family that never loads is still seen behind a fallback.
      const rendered = stack.find((family) => isAvailable(family)) || null;
      const key = `${first.toLowerCase()}|${(rendered || "").toLowerCase()}`;
      if (!fonts.has(key)) fonts.set(key, { family: rendered || first, first, stack: style.fontFamily, available: isAvailable(first), rendered, chars: 0, samples: [] });
      const font = fonts.get(key);
      font.chars += ownText.length;
      const name = label(element);
      if (font.samples.length < 3 && !font.samples.includes(name)) font.samples.push(name);
    }
    if (element === document.body || box.width < 1 || box.height < 1) continue;
    const backdrop = backdropOf(element);
    const bg = pixel(style.backgroundColor, backdrop, opacity);
    if (bg && bg.hex !== backdrop) add(bg.hex, "surface", box.width * box.height, element);
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const width = parseFloat(style[`border${side}Width`]) || 0;
      if (!width || style[`border${side}Style`] === "none" || style[`border${side}Style`] === "hidden") continue;
      const read = pixel(style[`border${side}Color`], backdrop, opacity);
      const length = side === "Top" || side === "Bottom" ? box.width : box.height;
      if (read) add(read.hex, "border", width * length, element);
    }
    if (element instanceof SVGGeometryElement) {
      const area = box.width * box.height;
      for (const prop of ["fill", "stroke"]) {
        const value = style[prop];
        if (!value || value === "none" || /^url\(/.test(value)) continue;
        const read = pixel(value, backdrop, opacity);
        if (read) add(read.hex, "graphic", prop === "fill" ? area : (parseFloat(style.strokeWidth) || 1) * (box.width + box.height) * 2, element);
      }
    }
  }
  const sorted = [...colors.values()].map((entry) => ({
    hex: entry.hex,
    weights: Object.fromEntries(Object.entries(entry.weights).map(([kind, weight]) => [kind, Math.round(weight)])),
    elements: Object.fromEntries(Object.entries(entry.elements).map(([kind, set]) => [kind, set.size])),
    interactive: entry.seenInteractive.size,
    samples: entry.samples,
  })).sort((a, b) => Math.max(...Object.values(b.weights)) - Math.max(...Object.values(a.weights)));
  for (const kind of Object.keys(totals)) totals[kind] = Math.round(totals[kind]);
  return {
    canvas: canvasColor,
    inspected,
    truncated: (document.body ? document.body.querySelectorAll("*").length : 0) > elementLimit,
    totals,
    colors: sorted,
    fonts: [...fonts.values()].sort((a, b) => b.chars - a.chars),
  };
}

async function captureBuiltStyles(projectRoot, options = {}) {
  const { refsPuppeteer, settle, awaitResources, freezeMotion } = require("./page-refs-core.cjs");
  const { browserIdentity, resolveBrowser } = require("./browser-locate.cjs");
  const file = path.join(projectRoot, "index.html");
  if (!fs.existsSync(file)) fail(SCOPE, `index.html not found in ${projectRoot}. Fix: build the page before measuring it`);
  const puppeteer = refsPuppeteer(projectRoot, options.puppeteerModule);
  const executablePath = resolveBrowser(options.chrome);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: MEASUREMENT_SCOPE.colorScheme }]);
    // Every local file the page loads (CSS, @import, fonts, images): the CLI binds their hashes into the
    // measurement, so swapping a font file or stylesheet the page digest does not name makes it stale.
    const loaded = new Map();
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith("file:") || loaded.has(url)) return;
      let local;
      try { local = fileURLToPath(url); } catch { return; }
      loaded.set(url, { file: local, hash: fileHash(local) });
    });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load", timeout: NAVIGATION_TIMEOUT_MS });
    await settle(page);
    await awaitResources(page);
    await freezeMotion(page);
    const measured = await page.evaluate(measureBuiltStyles, ELEMENT_LIMIT);
    const moved = [...loaded.values()].find((item) => fileHash(item.file) !== item.hash);
    if (moved) fail(SCOPE, `${path.basename(moved.file)}, which the page loaded, changed during the measurement. Fix: stop editing the page and its files, then run \`reconciliation measure\` again`);
    return {
      measurement: { ...measured, viewport: { width: VIEWPORT.width, height: VIEWPORT.height }, browser: await browserIdentity(browser, executablePath) },
      loaded: Object.fromEntries([...loaded].filter(([, item]) => item.hash !== undefined).map(([url, item]) => [url, item.hash])),
    };
  } finally {
    await browser.close();
  }
}

// The bytes of a file: a hash, null while it does not exist, undefined for anything that is not a file.
function fileHash(file) {
  let stat;
  try { stat = fs.statSync(file); } catch { return null; }
  return stat.isFile() ? "sha256:" + sha256(fs.readFileSync(file)) : undefined;
}

function designSha(file) {
  return "sha256:" + sha256(fs.readFileSync(file));
}

module.exports = {
  BUILT_STYLES_FILE,
  BUILT_STYLES_SCHEMA,
  DELTA_E_TOLERANCE,
  LOUD_DELTA_E,
  LOUD_ELEMENTS,
  MAJOR_SHARE,
  MEASUREMENT_SCOPE,
  baselineGaps,
  captureBuiltStyles,
  compareBuiltStyles,
  coveringRow,
  deltaE2000,
  deltaE2000Lab,
  designSha,
  designTokens,
  fileHash,
  firstFamily,
  measureBuiltStyles,
  parseHex,
  toHex,
  toLab,
  validateMeasurement,
};
