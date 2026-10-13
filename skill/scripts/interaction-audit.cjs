"use strict";

/*
 * Audit probes for `verify interaction`: measure the rendered page against the UI craft rules that
 * computed style and geometry can decide (typography, contrast, overflow, clipping, targets,
 * spacing, alignment and nested radii) at each declared viewport.
 *
 * `auditPage` runs inside the page through puppeteer's page.evaluate, which serializes it with
 * toString: it stays one self-contained function that refers to nothing outside its own body. The
 * rest of this module is plain Node: the probe contract, option normalization and the summary
 * that turns per-viewport measurements into statuses, coverage and findings.
 *
 * The visibility model, geometry primitives and page-design rules are adapted from lintapple
 * (https://github.com/gholtzap/lintapple), revision 90ddc736af6f2712903d53dd9a463445e109f586,
 * src/visibility.js and src/audit.js, used under the MIT License:
 *
 *   MIT License
 *
 *   Copyright (c) 2026 Gavin Holtzapple
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 *
 * Adaptations: selectors declared in the probe replace the data-ui-* markers; the copy rule and
 * every axe-backed rule are not ported; text contrast is WCAG 2 math over a resolved solid
 * background and anything else is indeterminate; control-size became a target floor that exempts
 * inline text links; tabular numbers are measured digit advance widths; failed or missing font
 * files also fail the family check; aria-hidden text, clipped screen-reader text and off-screen
 * content are not measured as visible text.
 */

const { fileURLToPath } = require("node:url");
const { fail, isObject, nonEmpty, resolveInside } = require("./contract-utils.cjs");

const SCOPE = "interaction probe";

const AUDIT_CODES = Object.freeze([
  "audit.font-family",
  "audit.font-loading",
  "audit.font-size",
  "audit.tabular-numbers",
  "audit.numeric-alignment",
  "audit.text-contrast",
  "audit.root-background",
  "audit.horizontal-overflow",
  "audit.viewport-bounds",
  "audit.content-clipping",
  "audit.content-overflow",
  "audit.target-size",
  "audit.control-gap",
  "audit.control-inset",
  "audit.layout-gap",
  "audit.layout-alignment",
  "audit.nested-radius",
]);

// An optional check measures only what the probe declares. Without its declaration it reports
// `not-declared`: listed in the coverage with a hint, never a finding, never passed, never failing.
// `audit.tabular-numbers` also measures numeric table cells the page has without a declaration.
const DECLARATIONS = Object.freeze({
  "audit.tabular-numbers": "declare.numbers",
  "audit.content-overflow": "declare.contentBoxes",
  "audit.control-inset": "declare.controlContainers",
  "audit.layout-gap": "declare.stacks",
  "audit.layout-alignment": "declare.alignGroups",
  "audit.nested-radius": "declare.radiusPairs",
});
const OPTIONAL_CODES = Object.freeze(Object.keys(DECLARATIONS));

// Thresholds a probe may override (copied from DESIGN.md); lists replace the default, they are not
// merged. `tolerances` are part of the contract, not overridable.
const AUDIT_DEFAULTS = Object.freeze({
  minFontPx: 12,
  minTargetPx: 24,
  minControlGapPx: 8,
  minControlInsetPx: 8,
  minLayoutGapPx: 8,
  contrastNormal: 4.5,
  contrastLarge: 3,
  fonts: Object.freeze([]),
  fontSizes: Object.freeze([]),
  tolerances: Object.freeze({ alignmentPx: 1, radiusPx: 1, boundsPx: 1, fontSizePx: 0.1, digitWidthPx: 0.5 }),
});

const PROBE_KEYS = ["id", "kind", "viewports", "thresholds", "declare"];
const NUMBER_THRESHOLDS = ["minFontPx", "minTargetPx", "minControlGapPx", "minControlInsetPx", "minLayoutGapPx", "contrastNormal", "contrastLarge"];
const THRESHOLD_KEYS = [...NUMBER_THRESHOLDS, "fonts", "fontSizes"];
const SELECTOR_LISTS = ["numbers", "stacks", "controlContainers", "contentBoxes"];
const DECLARE_KEYS = ["numbers", "stacks", "controlContainers", "alignGroups", "radiusPairs", "contentBoxes"];
const EDGES = ["start", "center", "end"];
const MAX_VIEWPORTS = 8;
const MAX_VIEWPORT_PX = 4096;
const MAX_CONTRAST = 21;
const PASSING = ["passed", "not-applicable"];
// The verifier's external-request finding, bounded by the project rather than the page origin: a
// CDN, a dev server and a file outside the project all escape the gate's hashes. It lists as many
// URLs as the verifier's other external-request findings. The fix also serves motion and journey
// probes on a local page, where an outside file shares the page's origin.
const MAX_LISTED_URLS = 20;
const EXTERNAL_FIX = "Copy every listed resource into the project, next to the page, and reference it with a relative URL: a verified local page may load only files the gate can hash, so fonts, styles and scripts are self-hosted.";

// What to declare so a `not-declared` check measures the page: the coverage carries it as a hint.
const NOT_DECLARED_HINT = Object.freeze({
  "audit.tabular-numbers": "Declare the selectors of changing or compared numbers (prices, counters, stats) in declare.numbers; numeric table cells are measured without it.",
  "audit.content-overflow": "Declare the boxes that must hold their text (cards, panels, callouts) in declare.contentBoxes.",
  "audit.control-inset": "Declare the containers that hold controls (toolbars, input groups, cards with actions) in declare.controlContainers.",
  "audit.layout-gap": "Declare the layout stacks (section lists, card grids, form fields) in declare.stacks.",
  "audit.layout-alignment": "Declare groups whose items share an edge in declare.alignGroups as {\"selector\", \"items\", \"edge\"}.",
  "audit.nested-radius": "Declare rounded surfaces nested in rounded surfaces in declare.radiusPairs as {\"outer\", \"inner\"}.",
});

// ---------- probe contract ----------

// Every problem in one pass, so the agent fixes the probe once instead of once per error.
function validateAuditProbe(probe, context = {}) {
  const label = context.label || "audit probe";
  const errors = [];
  const error = (path, message) => errors.push(`${label}${path} ${message}`);
  const unknown = (value, allowed, path, hint = "") => {
    const extras = Object.keys(value).filter((key) => !allowed.includes(key));
    if (extras.length) error(path, `has unsupported properties: ${extras.join(", ")}; allowed: ${allowed.join(", ")}${hint}`);
  };
  const selector = (value, path) => {
    if (!nonEmpty(value)) error(path, "must be a non-empty selector");
  };
  const selectorList = (value, path) => {
    if (!Array.isArray(value) || !value.length) return error(path, "must be a non-empty list of selectors");
    value.forEach((item, index) => selector(item, `${path}[${index}]`));
  };
  if (!isObject(probe)) return [`${label} must be an object`];
  for (const key of ["id", "kind"]) if (!Object.hasOwn(probe, key)) error("", `is missing ${key}`);
  // No probe field skips a subtree or waives a result; an old exclude/exceptions list says so.
  unknown(probe, PROBE_KEYS, "", ["exclude", "exceptions"].some((key) => Object.hasOwn(probe, key)) ? ". No probe field can skip or waive a result: remove it and fix the page" : "");
  if (Object.hasOwn(probe, "id") && !nonEmpty(probe.id)) error(".id", "must be a non-empty string");
  if (Object.hasOwn(probe, "kind") && probe.kind !== "audit") error(".kind", `has invalid value ${String(probe.kind)}; allowed: audit (motion probes have input and expect, journeys have steps)`);

  if (probe.viewports !== undefined) {
    if (!Array.isArray(probe.viewports) || !probe.viewports.length || probe.viewports.length > MAX_VIEWPORTS) error(".viewports", `must list 1 to ${MAX_VIEWPORTS} viewports`);
    else {
      const seen = new Set();
      probe.viewports.forEach((viewport, index) => {
        const path = `.viewports[${index}]`;
        if (!isObject(viewport)) return error(path, "must be { \"width\", \"height\" }");
        unknown(viewport, ["width", "height"], path);
        const sizes = [viewport.width, viewport.height];
        if (!sizes.every((size) => Number.isInteger(size) && size > 0 && size <= MAX_VIEWPORT_PX)) return error(path, `width and height must be positive integers of at most ${MAX_VIEWPORT_PX}`);
        const key = `${viewport.width}x${viewport.height}`;
        if (seen.has(key)) error(path, `duplicates viewport ${key}`);
        seen.add(key);
      });
    }
  }

  // Every page has text and DESIGN.md names its families, so the family list is required.
  const FONTS_FIX = "must be a non-empty list of font family names (copy them from DESIGN.md)";
  if (probe.thresholds === undefined) error(".thresholds.fonts", `is missing; it ${FONTS_FIX}`);
  else if (isObject(probe.thresholds)) {
    const thresholds = probe.thresholds;
    unknown(thresholds, THRESHOLD_KEYS, ".thresholds");
    for (const key of NUMBER_THRESHOLDS) {
      if (!Object.hasOwn(thresholds, key)) continue;
      const value = thresholds[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) error(`.thresholds.${key}`, "must be a positive number");
      else if (key.startsWith("contrast") && value > MAX_CONTRAST) error(`.thresholds.${key}`, `cannot exceed ${MAX_CONTRAST}, the highest contrast ratio there is`);
    }
    if (!Object.hasOwn(thresholds, "fonts")) error(".thresholds.fonts", `is missing; it ${FONTS_FIX}`);
    else if (!Array.isArray(thresholds.fonts) || !thresholds.fonts.length || !thresholds.fonts.every(nonEmpty)) error(".thresholds.fonts", FONTS_FIX);
    if (Object.hasOwn(thresholds, "fontSizes") && (!Array.isArray(thresholds.fontSizes) || !thresholds.fontSizes.length || !thresholds.fontSizes.every((size) => typeof size === "number" && Number.isFinite(size) && size > 0))) error(".thresholds.fontSizes", "must be a non-empty list of positive pixel sizes");
  } else error(".thresholds", "must be an object");

  if (probe.declare !== undefined) {
    const declare = probe.declare;
    if (isObject(declare)) {
      unknown(declare, DECLARE_KEYS, ".declare");
      for (const key of SELECTOR_LISTS) if (Object.hasOwn(declare, key)) selectorList(declare[key], `.declare.${key}`);
      if (Object.hasOwn(declare, "alignGroups")) {
        if (!Array.isArray(declare.alignGroups) || !declare.alignGroups.length) error(".declare.alignGroups", "must be a non-empty list of { \"selector\", \"items\", \"edge\" }");
        else declare.alignGroups.forEach((group, index) => {
          const path = `.declare.alignGroups[${index}]`;
          if (!isObject(group)) return error(path, "must be { \"selector\", \"items\", \"edge\" }");
          for (const key of ["selector", "items", "edge"]) if (!Object.hasOwn(group, key)) error(path, `is missing ${key}`);
          unknown(group, ["selector", "items", "edge"], path);
          if (Object.hasOwn(group, "selector")) selector(group.selector, `${path}.selector`);
          if (Object.hasOwn(group, "items")) selector(group.items, `${path}.items`);
          if (Object.hasOwn(group, "edge") && !EDGES.includes(group.edge)) error(`${path}.edge`, `has invalid value ${String(group.edge)}; allowed: ${EDGES.join(", ")}`);
        });
      }
      if (Object.hasOwn(declare, "radiusPairs")) {
        if (!Array.isArray(declare.radiusPairs) || !declare.radiusPairs.length) error(".declare.radiusPairs", "must be a non-empty list of { \"outer\", \"inner\" }");
        else declare.radiusPairs.forEach((pair, index) => {
          const path = `.declare.radiusPairs[${index}]`;
          if (!isObject(pair)) return error(path, "must be { \"outer\", \"inner\" }");
          for (const key of ["outer", "inner"]) if (!Object.hasOwn(pair, key)) error(path, `is missing ${key}`);
          unknown(pair, ["outer", "inner"], path);
          if (Object.hasOwn(pair, "outer")) selector(pair.outer, `${path}.outer`);
          if (Object.hasOwn(pair, "inner")) selector(pair.inner, `${path}.inner`);
        });
      }
    } else error(".declare", "must be an object");
  }
  return errors;
}

// The probe's own viewports, or the probe file's single viewport.
function auditViewports(probe, fileViewport) {
  const list = Array.isArray(probe?.viewports) && probe.viewports.length ? probe.viewports : [fileViewport];
  return list.map(({ width, height }) => ({ width, height }));
}

// Plain JSON for page.evaluate: defaults applied, every list present, nothing the page must guess.
function auditOptions(probe) {
  const thresholds = isObject(probe.thresholds) ? probe.thresholds : {};
  const declare = isObject(probe.declare) ? probe.declare : {};
  const number = (key) => (typeof thresholds[key] === "number" ? thresholds[key] : AUDIT_DEFAULTS[key]);
  return {
    thresholds: {
      ...Object.fromEntries(NUMBER_THRESHOLDS.map((key) => [key, number(key)])),
      fonts: [...(Array.isArray(thresholds.fonts) ? thresholds.fonts : AUDIT_DEFAULTS.fonts)],
      fontSizes: [...(Array.isArray(thresholds.fontSizes) ? thresholds.fontSizes : AUDIT_DEFAULTS.fontSizes)],
      tolerances: { ...AUDIT_DEFAULTS.tolerances },
    },
    declare: {
      ...Object.fromEntries(SELECTOR_LISTS.map((key) => [key, [...(Array.isArray(declare[key]) ? declare[key] : [])]])),
      alignGroups: (Array.isArray(declare.alignGroups) ? declare.alignGroups : []).map(({ selector, items, edge }) => ({ selector, items, edge })),
      radiusPairs: (Array.isArray(declare.radiusPairs) ? declare.radiusPairs : []).map(({ outer, inner }) => ({ outer, inner })),
    },
  };
}

// ---------- in-page measurement ----------

// Runs in the page (page.evaluate). Self-contained by necessity: puppeteer ships this function as
// source text, so every helper and constant it uses is defined inside it.
function auditPage(options) {
  const CODES = [
    "audit.font-family", "audit.font-loading", "audit.font-size", "audit.tabular-numbers", "audit.numeric-alignment",
    "audit.text-contrast", "audit.root-background", "audit.horizontal-overflow", "audit.viewport-bounds",
    "audit.content-clipping", "audit.content-overflow", "audit.target-size", "audit.control-gap", "audit.control-inset",
    "audit.layout-gap", "audit.layout-alignment", "audit.nested-radius",
  ];
  const OPTIONAL = ["audit.tabular-numbers", "audit.content-overflow", "audit.control-inset", "audit.layout-gap", "audit.layout-alignment", "audit.nested-radius"];
  const MAX_ITEMS = 100;
  const MAX_ELEMENTS = 5000;
  // Rounding slack for sizes and gaps measured in fractional layout pixels (lintapple's 0.1 px).
  const EPSILON = 0.1;
  const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong"]);
  const CODE_TEXT = "pre, code, kbd, samp";
  const TEXT_FIELD = ["text", "search", "email", "url", "tel", "number", "password", "date", "time", "datetime-local", "month", "week", "button", "submit", "reset"].map((type) => `input[type="${type}"]`).concat(["input:not([type])", "textarea", "select"]).join(", ");
  const CONTROL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="slider"], [role="combobox"]';
  const OVERLAY = 'dialog[open], [role="dialog"], [role="alertdialog"]';
  const REPLACED = new Set(["img", "svg", "video", "canvas", "iframe", "object", "embed"]);
  const FONT_PROPERTIES = ["font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-variant-numeric", "font-feature-settings", "font-variation-settings", "font-kerning", "font-optical-sizing", "font-synthesis", "text-rendering"];
  const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const FIX = {
    family: "Set font-family to a family from thresholds.fonts (copied from DESIGN.md) and make sure its font files load.",
    fontLoading: "Fix the font file URL or format in @font-face, serve the file next to the page, or remove the unused face.",
    fontSize: "Use a size from the declared type scale that is at least the floor in thresholds.minFontPx.",
    tabular: "Set font-variant-numeric: tabular-nums on these numbers, and use a font that has tabular figures.",
    numericAlign: "Align numeric table cells to the end edge (text-align: right or end) so the digits line up.",
    contrast: "Raise the contrast between the text and its background: change the text color or the background color.",
    contrastUnresolved: "Put the text on a measurable solid surface or scrim: an opaque background color directly behind the text.",
    rootBackground: "Set an opaque background color on html: the active theme's page color.",
    horizontalOverflow: "Constrain the element wider than the viewport (see audit.viewport-bounds) with responsive widths and wrapping; give wide content its own scroll region.",
    viewportBounds: "Use responsive widths and wrapping so the element stays inside the viewport; constrain fixed overlays and open dialogs to the viewport.",
    clipping: "Let the text wrap, make the clipping container large enough, or give it a scroll region.",
    contentOverflow: "Let the text wrap inside the declared box (overflow-wrap: anywhere, min-width: 0) or give the box a scroll region.",
    target: "Make the control at least the target size in each dimension (padding, min-width, min-height, or an absolutely positioned hit-area pseudo-element); a link inside a sentence is exempt.",
    controlGap: "Separate the controls with a gap or margin of at least the minimum, and remove any overlap.",
    controlInset: "Give the container enough padding around its controls; check absolute offsets and negative margins.",
    layoutGap: "Separate the stack's children with a gap of at least the minimum.",
    alignment: "Align the group's items on the declared edge: match their margins, padding and widths.",
    radius: "Set the inner radius to max(0, outer radius - inset); the inset includes the outer border.",
    radiusUnresolved: "Use equal insets and uniform pixel radii for concentric surfaces.",
    noMatch: "Correct the selector so it names elements on the page, or remove the declaration.",
  };
  const { thresholds, declare } = options;
  const tolerance = thresholds.tolerances;
  const root = document.documentElement;
  const viewport = { width: innerWidth, height: innerHeight };
  const round2 = (value) => Math.round(value * 100) / 100;

  // A selector the page itself rejects is a probe-contract error, never a measurement.
  const contractErrors = [];
  const accepts = (selector, label) => {
    try {
      document.querySelector(selector);
    } catch (error) {
      contractErrors.push(`${label} ${JSON.stringify(selector)} is not a selector this page accepts (${error.message})`);
    }
  };
  for (const key of ["numbers", "stacks", "controlContainers", "contentBoxes"]) declare[key].forEach((selector, index) => accepts(selector, `declare.${key}[${index}]`));
  declare.alignGroups.forEach((group, index) => { accepts(group.selector, `declare.alignGroups[${index}].selector`); accepts(group.items, `declare.alignGroups[${index}].items`); });
  declare.radiusPairs.forEach((pair, index) => { accepts(pair.outer, `declare.radiusPairs[${index}].outer`); accepts(pair.inner, `declare.radiusPairs[${index}].inner`); });
  if (contractErrors.length) return { viewport, contractErrors };

  // ---- caches: style and geometry do not change while the audit reads them
  const cache = (compute) => {
    const values = new Map();
    return (el) => {
      if (!values.has(el)) values.set(el, compute(el));
      return values.get(el);
    };
  };
  const styleOf = cache((el) => getComputedStyle(el));
  const rectOf = cache((el) => el.getBoundingClientRect());
  const textRectsOf = cache((el) => {
    const rects = [];
    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) if (rect.width > 0 && rect.height > 0) rects.push(rect);
    }
    return rects;
  });

  // ---- visibility (lintapple src/visibility.js): a semantic group can be visible without a box
  const generatedText = (el) => ["::before", "::after"].flatMap((pseudo) => {
    const style = getComputedStyle(el, pseudo);
    const literal = style.content.match(/^"((?:[^"\\]|\\.)*)"/)?.[1];
    const text = literal?.replace(/\\([\da-f]{1,6})\s?|\\(.)/gi, (_, hex, escaped) => (hex ? String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)) : escaped));
    if (!text?.trim() || style.display === "none" || style.visibility !== "visible" || (style.display !== "contents" && parseFloat(style.opacity) === 0) || parseFloat(style.fontSize) === 0) return [];
    return [{ pseudo, style }];
  });
  const rendered = (el) => {
    if (!el?.isConnected || el.closest("[inert]")) return false;
    const bounds = rectOf(el);
    if (el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && bounds.width > 0 && bounds.height > 0) return true;
    // Boxless elements can paint text. Opacity applies only to ancestor boxes.
    if (!generatedText(el).length && (styleOf(el).visibility !== "visible" || !textRectsOf(el).length)) return false;
    for (let node = el; node; node = node.parentElement) {
      const style = styleOf(node);
      if (style.display === "none" || style.contentVisibility === "hidden" || (style.display !== "contents" && parseFloat(style.opacity) === 0)) return false;
    }
    return true;
  };
  // Guard: the screen-reader-only clip pattern (a zero clip rect, clip-path inset of 50% or more,
  // or a box of at most 1 px that hides its overflow) paints nothing a sighted visitor can read.
  const clipsAway = (el) => {
    const style = styleOf(el);
    if (/^(absolute|fixed)$/.test(style.position)) {
      const clip = style.clip.match(/^rect\(([^)]*)\)$/);
      const [top, right, bottom, left] = clip ? clip[1].split(/[\s,]+/).map(parseFloat) : [];
      if (clip && [top, right, bottom, left].every(Number.isFinite) && Math.max(0, right - left) * Math.max(0, bottom - top) <= 1) return true;
    }
    const inset = style.clipPath.match(/^inset\(\s*([\d.]+)%\s*\)$/);
    if (inset && parseFloat(inset[1]) >= 50) return true;
    if (/^(inline|contents)$/.test(style.display)) return false;
    const box = rectOf(el);
    return box.width <= 1 && box.height <= 1 && (/^(hidden|clip)$/.test(style.overflowX) || /^(hidden|clip)$/.test(style.overflowY));
  };
  const concealed = cache((el) => (el && el !== root ? clipsAway(el) || concealed(el.parentElement) : false));
  // Guard: content parked in the negative scroll area (left: -9999px, a drawer translated out to
  // the left or above) can never be scrolled into view, so it is hidden, not overflowing.
  const offscreen = (el) => {
    const boxes = [...el.getClientRects()].filter((rect) => rect.width > 0 || rect.height > 0);
    const rects = boxes.length ? boxes : textRectsOf(el);
    return rects.length > 0 && rects.every((rect) => rect.right + scrollX <= 0 || rect.bottom + scrollY <= 0);
  };
  const visible = cache((el) => rendered(el) && !concealed(el) && !offscreen(el));
  const hasBox = (el) => rectOf(el).width > 0 || rectOf(el).height > 0;
  const hasVisibleContent = (el) => visible(el) || [...el.querySelectorAll("*")].some(visible);
  // Guard: aria-hidden text is decoration; the text checks skip it, the geometry checks do not.
  const decorative = (el) => Boolean(el.closest('[aria-hidden="true"]'));

  const everything = [...document.querySelectorAll("body, body *")];
  const elements = everything.filter((el) => visible(el));
  if (!elements.length) throw new Error("the page has no visible content to audit; check that url points at the built page and that it renders without a script error");
  if (elements.length > MAX_ELEMENTS) throw new Error(`the page has ${elements.length} visible elements, more than the ${MAX_ELEMENTS} one audit measures; audit a smaller page`);

  // ---- finding selectors: a unique id when there is one, otherwise a type/position chain
  const selectorOf = cache((el) => {
    if (el === root) return "html";
    if (el === document.body) return "body";
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const parent = el.parentElement;
    if (!parent) return el.localName;
    const index = [...parent.children].filter((sibling) => sibling.localName === el.localName).indexOf(el) + 1;
    return `${selectorOf(parent)} > ${el.localName}:nth-of-type(${index})`;
  });

  // ---- recording: every failed or indeterminate item counts; nothing in the probe suppresses one
  const checks = Object.fromEntries(CODES.map((code) => [code, {
    declared: !OPTIONAL.includes(code), checked: 0, failedCount: 0, indeterminateCount: 0, failed: [], indeterminate: [],
  }]));
  const record = (code, status, el, item) => {
    const check = checks[code];
    const selector = item.selector || selectorOf(el);
    const list = status === "failed" ? check.failed : check.indeterminate;
    if (status === "failed") check.failedCount += 1;
    else check.indeterminateCount += 1;
    if (list.length < MAX_ITEMS) list.push({ code, selector, expected: item.expected, actual: item.actual, message: item.message, fix: item.fix, ...(item.related ? { related: selectorOf(item.related) } : {}) });
  };
  const failed = (code, el, item) => record(code, "failed", el, item);
  const unresolved = (code, el, item) => record(code, "indeterminate", el, item);
  // A declared selector that matches nothing is a failure, so a typo cannot pass as "nothing to check".
  const noMatch = (code, selector, field) => failed(code, null, {
    selector, expected: `${field} to match at least one element`, actual: "no element matches",
    message: `${field} ${selector} matches no element on the page`, fix: FIX.noMatch,
  });
  const matchesSome = (selector) => Boolean(document.querySelector(selector));

  // ---- colors (WCAG 2 relative luminance, as composition-core.cjs computes it)
  const swatch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const parseColor = (value) => {
    const text = String(value).trim();
    const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
    if (rgb) {
      const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
      if (parts.length < 3) return null;
      const channel = (part) => (part.endsWith("%") ? parseFloat(part) * 2.55 : parseFloat(part));
      const alpha = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
      const color = { r: channel(parts[0]), g: channel(parts[1]), b: channel(parts[2]), a: alpha };
      return Object.values(color).every(Number.isFinite) ? color : null;
    }
    // Any other syntax the page can compute (color(), oklch(), lab()...) is drawn once and read back.
    swatch.clearRect(0, 0, 1, 1);
    swatch.fillStyle = "#010203";
    swatch.fillStyle = text;
    if (swatch.fillStyle === "#010203" && !/^#010203$/i.test(text)) return null;
    swatch.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = swatch.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const luminance = ({ r, g, b }) => {
    const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const contrastRatio = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };
  const hex = (color) => `#${[color.r, color.g, color.b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
  const paintsColor = (value) => {
    const color = parseColor(value);
    return color ? color.a > 0 : true;
  };

  // ---- geometry (lintapple src/audit.js)
  const edgeInsets = (outer, inner) => ({ left: inner.left - outer.left, top: inner.top - outer.top, right: outer.right - inner.right, bottom: outer.bottom - inner.bottom });
  const intersects = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const covers = (outer, rect) => rect.left >= outer.left - 1 && rect.right <= outer.right + 1 && rect.top >= outer.top - 1 && rect.bottom <= outer.bottom + 1;
  // One client-box primitive for control insets, content boxes and text clipping. Client
  // dimensions use rounded layout pixels, so their scale uses offset dimensions.
  const clientBounds = (container) => {
    if (!(container instanceof HTMLElement)) return null;
    const bounds = rectOf(container);
    const scaleX = container.offsetWidth ? bounds.width / container.offsetWidth : 1;
    const scaleY = container.offsetHeight ? bounds.height / container.offsetHeight : 1;
    const left = bounds.left + container.clientLeft * scaleX;
    const top = bounds.top + container.clientTop * scaleY;
    const result = { left, top, right: left + container.clientWidth * scaleX, bottom: top + container.clientHeight * scaleY };
    return Object.values(result).every(Number.isFinite) ? result : null;
  };
  // An absolutely positioned pseudo-element of a positioned element, placed by its resolved insets
  // against the element's padding box; null when its containing block is another element.
  const absolutePseudoBox = (el, style) => {
    if (!(el instanceof HTMLElement) || styleOf(el).position === "static" || style.position !== "absolute") return null;
    const padding = clientBounds(el);
    const insets = ["top", "right", "bottom", "left"].map((side) => style[side]);
    if (!padding || !insets.every((value) => /^-?[\d.]+px$/.test(value))) return null;
    const box = rectOf(el);
    const scaleX = el.offsetWidth ? box.width / el.offsetWidth : 1;
    const scaleY = el.offsetHeight ? box.height / el.offsetHeight : 1;
    const [top, right, bottom, left] = insets.map(parseFloat);
    return { left: padding.left + left * scaleX, top: padding.top + top * scaleY, right: padding.right - right * scaleX, bottom: padding.bottom - bottom * scaleY };
  };
  const scaleFor = (el) => {
    const bounds = rectOf(el);
    const style = styleOf(el);
    const length = (axis) => {
      const edges = axis === "width" ? ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"] : ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"];
      return parseFloat(style[axis]) + (style.boxSizing === "border-box" ? 0 : edges.reduce((sum, key) => sum + parseFloat(style[key]), 0));
    };
    return { x: bounds.width / (length("width") || el.offsetWidth), y: bounds.height / (length("height") || el.offsetHeight) };
  };
  const scrolls = (node, axis) => !["inline", "contents"].includes(styleOf(node).display) && /^(auto|scroll)$/.test(styleOf(node)[`overflow${axis}`]);
  const scrollsWithin = (ancestors, clip, axis) => {
    for (const node of ancestors) {
      if (node === clip.element || !clip.element.contains(node)) break;
      if (!scrolls(node, axis)) continue;
      const bounds = rectOf(node);
      const edges = axis === "X" ? ["left", "right"] : ["top", "bottom"];
      if (bounds[edges[0]] >= clip.bounds[edges[0]] - 1 && bounds[edges[1]] <= clip.bounds[edges[1]] + 1) return true;
    }
    return false;
  };
  const contextFor = (el) => {
    const ancestors = [];
    let containingBlock = null;
    let overlay = false;
    for (let node = el; node; node = node.parentElement) {
      overlay ||= styleOf(node).position === "fixed" || node.matches(OVERLAY);
      // Overflow below an absolute box's containing block cannot clip that box.
      if (containingBlock && node !== containingBlock) continue;
      ancestors.push(node);
      // A viewport-fixed box escapes ordinary ancestor scrolling and clipping.
      if (styleOf(node).position === "fixed") break;
      containingBlock = styleOf(node).position === "absolute" ? node.offsetParent ?? root : null;
    }
    const clips = ancestors
      .filter((node) => node instanceof HTMLElement && !["inline", "contents"].includes(styleOf(node).display))
      .map((node) => ({ element: node, x: /^(hidden|clip)$/.test(styleOf(node).overflowX), y: /^(hidden|clip)$/.test(styleOf(node).overflowY) }))
      .filter((clip) => clip.x || clip.y)
      .map((clip) => ({ ...clip, bounds: clientBounds(clip.element) }))
      .filter((clip) => clip.bounds);
    const page = (node) => node === document.body || node === root;
    return {
      ancestors, clips, overlay,
      boxScrollX: ancestors.slice(1).some((node) => scrolls(node, "X") && !page(node)),
      boxScrollY: ancestors.slice(1).some((node) => scrolls(node, "Y") && !page(node)),
      textScrollX: ancestors.some((node) => scrolls(node, "X") && !page(node)),
      textScrollY: ancestors.some((node) => scrolls(node, "Y") && !page(node)),
    };
  };
  const outside = (bounds, rect, x, y) => Object.entries(edgeInsets(bounds, rect)).filter(([edge, distance]) => distance < -tolerance.boundsPx && ((edge === "left" || edge === "right") ? x : y));
  const clippedRect = (rect, clips, el, includeSelf) => {
    const result = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    for (const clip of clips) {
      if ((!includeSelf && clip.element === el) || clip.element === document.body || clip.element === root) continue;
      if (clip.x) { result.left = Math.max(result.left, clip.bounds.left); result.right = Math.min(result.right, clip.bounds.right); }
      if (clip.y) { result.top = Math.max(result.top, clip.bounds.top); result.bottom = Math.min(result.bottom, clip.bounds.bottom); }
    }
    return result;
  };
  const describeEdges = (edges, noun) => [...edges].map(([edge, amount]) => `${edge} ${noun} ${round2(amount)}px`).join(", ");

  // ---- typography
  const textField = (el) => el.matches(TEXT_FIELD);
  const fieldText = (el) => (el.localName === "select" ? el.selectedOptions?.[0]?.textContent ?? "" : el.value ?? "");
  const textElements = elements.filter((el) => !decorative(el) && (textRectsOf(el).length > 0 || textField(el)));
  const firstFamily = (value) => {
    const match = /^\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,]*)/.exec(value);
    return (match ? match[1] : "").trim().replace(/^["']|["']$/g, "");
  };
  // Whether a family actually draws the text: a loaded face, a failed or still-pending face, or
  // (without @font-face) a local font that changes the width of a sample against three fallbacks.
  const familyStates = new Map();
  const measure = document.createElement("canvas").getContext("2d");
  const familyState = (family) => {
    const key = family.toLowerCase();
    if (familyStates.has(key)) return familyStates.get(key);
    let state = "renders";
    if (!GENERIC.has(key)) {
      const faces = [...document.fonts].filter((face) => face.family.replace(/^["']|["']$/g, "").toLowerCase() === key);
      if (faces.length) state = faces.some((face) => face.status === "loaded") ? "renders" : faces.every((face) => face.status === "error") ? "failed" : "pending";
      else {
        const sample = "mmmmmmmmmmlli1WwQ@#0123456789";
        const quoted = `"${family.replace(/["\\]/g, "\\$&")}"`;
        state = ["monospace", "serif", "sans-serif"].some((fallback) => {
          measure.font = `72px ${quoted}, ${fallback}`;
          const width = measure.measureText(sample).width;
          measure.font = `72px ${fallback}`;
          return width !== measure.measureText(sample).width;
        }) ? "renders" : "missing";
      }
    }
    familyStates.set(key, state);
    return state;
  };

  // Always on: validation requires thresholds.fonts.
  const fontFamily = checks["audit.font-family"];
  const approved = new Set(thresholds.fonts.map((family) => family.toLowerCase()));
  const expected = `one of ${thresholds.fonts.join(", ")}, rendered from its own font files`;
  for (const el of textElements) {
    if (el.closest(CODE_TEXT)) continue;
    fontFamily.checked += 1;
    const family = firstFamily(styleOf(el).fontFamily);
    if (!approved.has(family.toLowerCase())) {
      failed("audit.font-family", el, { expected, actual: family || "no font family", message: `text is set in ${family || "no font family"}, which thresholds.fonts does not approve`, fix: FIX.family });
      continue;
    }
    const state = familyState(family);
    if (state === "failed" || state === "missing") failed("audit.font-family", el, { expected, actual: `${family}: ${state === "failed" ? "every font file for it failed to load" : "no @font-face and not installed"}, so a fallback font draws the text`, message: `text asks for ${family} but renders in a fallback font`, fix: FIX.family });
    else if (state === "pending") unresolved("audit.font-family", el, { expected, actual: `${family}: its font files had not loaded when the page was measured`, message: `whether ${family} draws this text could not be measured`, fix: "Make the font load with the page (self-host it next to the page and avoid lazy font loading), then rerun the probe." });
  }

  const fontLoading = checks["audit.font-loading"];
  for (const face of document.fonts) {
    if (face.status === "unloaded") continue;
    fontLoading.checked += 1;
    const name = `${face.family} (weight ${face.weight}, style ${face.style})`;
    if (face.status === "error") failed("audit.font-loading", root, { expected: "every requested font file to load", actual: `font face ${name} failed to load`, message: `the font file for ${name} failed to load`, fix: FIX.fontLoading });
    else if (face.status === "loading") unresolved("audit.font-loading", root, { expected: "every requested font file to load", actual: `font face ${name} was still loading`, message: `the font file for ${name} had not finished loading when the page was measured`, fix: FIX.fontLoading });
  }

  const fontSize = checks["audit.font-size"];
  const scale = thresholds.fontSizes;
  const checkSize = (el, style, selector) => {
    fontSize.checked += 1;
    const size = parseFloat(style.fontSize);
    const onScale = el.closest(CODE_TEXT) || !scale.length || scale.some((allowed) => Math.abs(size - allowed) <= tolerance.fontSizePx);
    const belowFloor = size < thresholds.minFontPx - tolerance.fontSizePx;
    if (!belowFloor && onScale) return;
    const expected = `at least ${thresholds.minFontPx}px${scale.length && !el.closest(CODE_TEXT) ? ` and one of ${scale.join(", ")}px` : ""}`;
    failed("audit.font-size", el, { selector, expected, actual: `${round2(size)}px`, message: belowFloor ? `text is ${round2(size)}px, below the ${thresholds.minFontPx}px floor` : `text is ${round2(size)}px, off the declared type scale`, fix: FIX.fontSize });
  };
  for (const el of textElements) checkSize(el, styleOf(el), null);
  for (const el of elements) {
    if (decorative(el)) continue;
    for (const { pseudo, style } of generatedText(el)) checkSize(el, style, `${selectorOf(el)}${pseudo}`);
  }

  // Numeric meaning is declared for live values; numeric table cells are inferred.
  const numericText = (text) => /^[+−-]?[\d\s,.:%$€£]+$/.test(text) && /\d/.test(text);
  const inferredCells = [...document.querySelectorAll("td")].filter((cell) => numericText(cell.textContent.trim()));
  const tabular = checks["audit.tabular-numbers"];
  tabular.declared = declare.numbers.length > 0 || inferredCells.length > 0;
  const numbers = new Set();
  for (const selector of declare.numbers) {
    const matches = [...document.querySelectorAll(selector)];
    if (!matches.length) noMatch("audit.tabular-numbers", selector, "declare.numbers");
    for (const el of matches) if (visible(el) && !decorative(el)) numbers.add(el);
  }
  for (const cell of inferredCells) if (visible(cell) && !decorative(cell)) numbers.add(cell);
  if (numbers.size) {
    // Each digit is drawn alone in the element's own font settings: tabular figures have one
    // advance width, whatever font-variant-numeric claims.
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;white-space:pre;display:inline-block;margin:0;padding:0;border:0;letter-spacing:normal;pointer-events:none";
    (document.body || root).appendChild(probe);
    try {
      for (const el of numbers) {
        tabular.checked += 1;
        const style = styleOf(el);
        for (const property of FONT_PROPERTIES) probe.style.setProperty(property, style.getPropertyValue(property));
        const widths = DIGITS.map((digit) => { probe.textContent = digit; return probe.getBoundingClientRect().width; });
        const spread = Math.max(...widths) - Math.min(...widths);
        if (spread > tolerance.digitWidthPx) failed("audit.tabular-numbers", el, { expected: `digits 0-9 at one advance width (within ${tolerance.digitWidthPx}px)`, actual: `digit widths differ by ${round2(spread)}px (font-variant-numeric: ${style.fontVariantNumeric})`, message: `the digits of this number have different widths, so changing values shift sideways`, fix: FIX.tabular });
      }
    } finally {
      probe.remove();
    }
  }

  const numericAlignment = checks["audit.numeric-alignment"];
  for (const cell of inferredCells) {
    if (!visible(cell) || decorative(cell)) continue;
    numericAlignment.checked += 1;
    const style = styleOf(cell);
    const rtl = style.direction === "rtl";
    const aligned = (rtl ? ["left", "end", "-webkit-left"] : ["right", "end", "-webkit-right"]).includes(style.textAlign);
    if (!aligned) failed("audit.numeric-alignment", cell, { expected: `the end edge (text-align: end, or ${rtl ? "left" : "right"})`, actual: `text-align: ${style.textAlign}`, message: "a numeric table cell is not aligned to its end edge", fix: FIX.numericAlign });
  }

  // ---- contrast over a resolved solid background; anything else is indeterminate
  const contrast = checks["audit.text-contrast"];
  const htmlStyle = styleOf(root);
  const rootPaints = htmlStyle.backgroundImage !== "none" || paintsColor(htmlStyle.backgroundColor);
  const paintedPseudo = (node) => ["::before", "::after"].some((pseudo) => {
    const style = getComputedStyle(node, pseudo);
    return !["none", "normal"].includes(style.content) && style.display !== "none" && (style.backgroundImage !== "none" || paintsColor(style.backgroundColor));
  });
  const resolveBackground = (el, rects) => {
    for (let node = el; node; node = node.parentElement) {
      const style = styleOf(node);
      const boxless = style.display === "contents";
      if (!boxless && parseFloat(style.opacity) < 1) return { reason: `${selectorOf(node)} is translucent (opacity ${style.opacity})` };
      if (!boxless && (style.filter !== "none" || style.backdropFilter !== "none")) return { reason: `${selectorOf(node)} applies a filter` };
      if (!boxless && style.mixBlendMode !== "normal") return { reason: `${selectorOf(node)} blends with mix-blend-mode: ${style.mixBlendMode}` };
      if (style.backgroundClip === "text" || style.webkitBackgroundClip === "text") return { reason: `${selectorOf(node)} paints its background through the text (background-clip: text)` };
      if (paintedPseudo(node)) return { reason: `${selectorOf(node)} paints a ::before or ::after layer` };
      if (boxless) continue;
      // html, and body when html paints nothing, are the canvas: they lie behind every text.
      const canvas = node === root || (node === document.body && !rootPaints);
      const box = rectOf(node);
      if (!canvas && !rects.some((rect) => intersects(rect, box))) continue;
      const image = style.backgroundImage !== "none";
      const insetShadow = /\binset\b/.test(style.boxShadow);
      if (!image && !insetShadow && !paintsColor(style.backgroundColor)) continue;
      if (!canvas && !rects.every((rect) => covers(box, rect))) return { reason: `the text crosses the edge of the background of ${selectorOf(node)}` };
      if (image) return { reason: `${selectorOf(node)} has a background image or gradient` };
      if (insetShadow) return { reason: `${selectorOf(node)} has an inset shadow` };
      const color = parseColor(style.backgroundColor);
      if (!color) return { reason: `the background color of ${selectorOf(node)} (${style.backgroundColor}) could not be read` };
      if (color.a < 1) return { reason: `${selectorOf(node)} has a translucent background (${style.backgroundColor})` };
      return { color, provider: node };
    }
    return { reason: "no element behind the text paints an opaque background color" };
  };
  const painters = elements.filter((el) => {
    if (REPLACED.has(el.localName) || el.matches('input[type="image"]')) return true;
    if (el instanceof SVGGeometryElement || el instanceof SVGImageElement || el instanceof SVGUseElement) return styleOf(el).fill !== "none" || styleOf(el).stroke !== "none";
    const style = styleOf(el);
    return style.backgroundImage !== "none" || paintsColor(style.backgroundColor);
  });
  // Another painted box over or under the text changes what the text sits on. A box outside the
  // background's subtree is ignored only when hit testing shows it beneath that background.
  const overlappingPaint = (el, rects, provider) => {
    for (const other of painters) {
      if (other === el || other.contains(el) || el.contains(other)) continue;
      const box = rectOf(other);
      const hit = rects.find((rect) => intersects(rect, box));
      if (!hit) continue;
      if (!provider.contains(other)) {
        const x = (Math.max(hit.left, box.left) + Math.min(hit.right, box.right)) / 2;
        const y = (Math.max(hit.top, box.top) + Math.min(hit.bottom, box.bottom)) / 2;
        const stack = document.elementsFromPoint(x, y);
        const below = stack.indexOf(provider);
        const at = stack.indexOf(other);
        if (below >= 0 && at > below) continue;
      }
      return `${selectorOf(other)} paints over or under the text`;
    }
    return null;
  };
  const required = (style) => {
    const size = parseFloat(style.fontSize);
    return size >= 24 || (parseFloat(style.fontWeight) >= 700 && size >= 56 / 3) ? thresholds.contrastLarge : thresholds.contrastNormal;
  };
  const measureContrast = (el, selector, color, style, rects, effects, resolved = null) => {
    contrast.checked += 1;
    const need = required(style);
    const expected = `at least ${need}:1`;
    const unsure = (reason) => unresolved("audit.text-contrast", el, { selector, expected, actual: `not measurable: ${reason}`, message: `the contrast of ${selector} cannot be measured: ${reason}`, fix: FIX.contrastUnresolved });
    if (effects) return unsure(effects);
    if (!color) return unsure(`its text color could not be read`);
    if (color.a === 0) return unsure("its text color is transparent");
    const background = resolved || resolveBackground(el, rects);
    if (!background.color) return unsure(background.reason);
    const covering = rects.length ? overlappingPaint(el, rects, background.provider) : null;
    if (covering) return unsure(covering);
    const shown = color.a < 1 ? { r: color.r * color.a + background.color.r * (1 - color.a), g: color.g * color.a + background.color.g * (1 - color.a), b: color.b * color.a + background.color.b * (1 - color.a), a: 1 } : color;
    const ratio = contrastRatio(shown, background.color);
    if (ratio < need) failed("audit.text-contrast", el, { selector, expected, actual: `${Math.floor(ratio * 100) / 100}:1 (${hex(shown)} on ${hex(background.color)})`, message: `text contrast is ${Math.floor(ratio * 100) / 100}:1, below ${need}:1`, fix: FIX.contrast });
  };
  const textEffects = (style) => (style.textShadow === "none" ? parseFloat(style.webkitTextStrokeWidth) > 0 ? "the text has a stroke" : null : "the text has a shadow");
  // Generated text has no text node. It sits on its pseudo-element's own background when that
  // paints, otherwise on what lies behind its box: the element's box in flow, or the inset box of an
  // absolute pseudo-element of a positioned element. Any other placement cannot be located.
  const measureGenerated = (el, pseudo, style) => {
    const selector = `${selectorOf(el)}${pseudo}`;
    const color = parseColor(style.webkitTextFillColor || style.color);
    const effects = textEffects(style)
      || (style.filter !== "none" || style.backdropFilter !== "none" ? `${selector} applies a filter` : null)
      || (style.mixBlendMode === "normal" ? null : `${selector} blends with mix-blend-mode: ${style.mixBlendMode}`)
      || (style.backgroundClip === "text" || style.webkitBackgroundClip === "text" ? `${selector} paints its background through the text (background-clip: text)` : null);
    const opacity = parseFloat(style.opacity);
    const image = style.backgroundImage !== "none";
    const insetShadow = /\binset\b/.test(style.boxShadow);
    if (image || insetShadow || paintsColor(style.backgroundColor)) {
      const own = parseColor(style.backgroundColor);
      const reason = opacity < 1 ? `${selector} is translucent (opacity ${style.opacity})`
        : image ? `${selector} has a background image or gradient`
        : insetShadow ? `${selector} has an inset shadow`
        : own ? own.a < 1 ? `${selector} has a translucent background (${style.backgroundColor})` : null
        : `the background color of ${selector} (${style.backgroundColor}) could not be read`;
      return measureContrast(el, selector, color, style, [], effects, reason ? { reason } : { color: own });
    }
    if (color && opacity < 1) color.a *= opacity;
    const box = /^(absolute|fixed)$/.test(style.position) ? absolutePseudoBox(el, style) : rectOf(el);
    if (!box || box.right - box.left <= 0 || box.bottom - box.top <= 0) return measureContrast(el, selector, color, style, [], effects, { reason: `the box of ${selector} cannot be located` });
    measureContrast(el, selector, color, style, [box], effects);
  };
  for (const el of elements) {
    if (decorative(el) || el.closest(':disabled, [aria-disabled="true"]')) continue;
    const style = styleOf(el);
    const rects = textRectsOf(el);
    if (rects.length) {
      const svg = el instanceof SVGElement;
      const effects = textEffects(style) || (svg && style.stroke !== "none" ? "the SVG text has a stroke" : null);
      measureContrast(el, selectorOf(el), parseColor(svg ? style.fill : style.webkitTextFillColor || style.color), style, rects, effects);
    } else if (textField(el) && fieldText(el).trim()) {
      measureContrast(el, selectorOf(el), parseColor(style.webkitTextFillColor || style.color), style, [rectOf(el)], textEffects(style));
    }
    if (el.matches("input:placeholder-shown, textarea:placeholder-shown")) {
      const placeholder = getComputedStyle(el, "::placeholder");
      const color = parseColor(placeholder.color);
      if (color) color.a *= parseFloat(placeholder.opacity);
      measureContrast(el, `${selectorOf(el)}::placeholder`, color, placeholder, [rectOf(el)], textEffects(placeholder));
    }
    for (const { pseudo, style: generated } of generatedText(el)) measureGenerated(el, pseudo, generated);
  }

  const rootBackground = checks["audit.root-background"];
  rootBackground.checked = 1;
  const rootColor = parseColor(htmlStyle.backgroundColor);
  if (!rootColor || rootColor.a < 1) failed("audit.root-background", root, { expected: "an opaque background color on html", actual: htmlStyle.backgroundColor, message: "the page background is not an opaque color set on html", fix: FIX.rootBackground });

  // ---- bounds, clipping and declared content boxes
  const bounds = checks["audit.viewport-bounds"];
  const clipping = checks["audit.content-clipping"];
  const contentOverflow = checks["audit.content-overflow"];
  contentOverflow.declared = declare.contentBoxes.length > 0;
  for (const selector of declare.contentBoxes) if (!matchesSome(selector)) noMatch("audit.content-overflow", selector, "declare.contentBoxes");
  const contentBoxes = declare.contentBoxes.join(", ");
  const viewportBox = { left: 0, top: 0, right: root.clientWidth, bottom: root.clientHeight };
  const escapedElements = new Set();
  let widest = null;
  for (const el of elements.filter((node) => node instanceof HTMLElement || node.localName === "svg")) {
    const context = contextFor(el);
    const rects = textRectsOf(el);
    bounds.checked += 1;
    const escaped = new Map();
    for (const [rect, scrollX, scrollY, isText] of [[rectOf(el), context.boxScrollX, context.boxScrollY, false], ...rects.map((rect) => [rect, context.textScrollX, context.textScrollY, true])]) {
      const painted = clippedRect(rect, context.clips, el, isText);
      if (painted.left >= painted.right || painted.top >= painted.bottom) continue;
      for (const [edge, distance] of outside(viewportBox, painted, !scrollX, context.overlay && !scrollY)) escaped.set(edge, Math.max(escaped.get(edge) ?? 0, -distance));
    }
    if (escaped.size) {
      if ((escaped.get("right") ?? 0) > (widest?.amount ?? 0)) widest = { el, amount: escaped.get("right") };
      // Report the outermost escaping box: its descendants escape with it.
      let ancestor = el.parentElement;
      while (ancestor && !escapedElements.has(ancestor)) ancestor = ancestor.parentElement;
      escapedElements.add(el);
      if (!ancestor) failed("audit.viewport-bounds", el, { expected: "inside the viewport horizontally (fixed elements and open dialogs also vertically)", actual: describeEdges(escaped, "overflow"), message: "the element extends outside the viewport", fix: FIX.viewportBounds });
    }
    if (decorative(el) || !rects.length) continue;
    const container = contentOverflow.declared ? el.closest(contentBoxes) : null;
    const contract = container && visible(container) ? clientBounds(container) : null;
    if (contract) {
      contentOverflow.checked += 1;
      const box = { element: container, bounds: contract };
      const checkX = !(context.ancestors.includes(container) && scrolls(container, "X")) && !scrollsWithin(context.ancestors, box, "X");
      const checkY = !(context.ancestors.includes(container) && scrolls(container, "Y")) && !scrollsWithin(context.ancestors, box, "Y");
      const overflow = new Map();
      for (const rect of rects) {
        const painted = clippedRect(rect, context.clips, el, true);
        if (painted.left >= painted.right || painted.top >= painted.bottom) continue;
        for (const [edge, distance] of outside(contract, painted, checkX, checkY)) overflow.set(edge, Math.max(overflow.get(edge) ?? 0, -distance));
      }
      if (overflow.size) failed("audit.content-overflow", el, { expected: "text inside its declared content box", actual: describeEdges(overflow, "text overflow"), message: "text escapes its declared content box", fix: FIX.contentOverflow, related: container });
    }
    if (context.clips.length) {
      clipping.checked += 1;
      for (const clip of context.clips) {
        const cut = new Map();
        for (const rect of rects) for (const [edge, distance] of outside(clip.bounds, rect, clip.x && !scrollsWithin(context.ancestors, clip, "X"), clip.y && !scrollsWithin(context.ancestors, clip, "Y"))) cut.set(edge, Math.max(cut.get(edge) ?? 0, -distance));
        if (cut.size) {
          failed("audit.content-clipping", el, { expected: "text lines inside the clipping area", actual: describeEdges(cut, "text clipped"), message: "text is cut off by an overflow: hidden or clip container", fix: FIX.clipping, related: clip.element });
          break;
        }
      }
    }
  }

  const horizontal = checks["audit.horizontal-overflow"];
  horizontal.checked = 1;
  const overflowPx = Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0) - root.clientWidth;
  if (overflowPx > tolerance.boundsPx) failed("audit.horizontal-overflow", root, { expected: `no page-level horizontal overflow (within ${tolerance.boundsPx}px)`, actual: `${round2(overflowPx)}px wider than the ${root.clientWidth}px viewport`, message: "the page scrolls sideways", fix: FIX.horizontalOverflow, ...(widest ? { related: widest.el } : {}) });

  // ---- targets and control spacing
  // Sentence text is text in the link's own inline formatting context, outside other controls;
  // block-level and hidden descendants hold none of it.
  const sentenceText = (el) => {
    let block = el.parentElement;
    while (block && /^(inline|contents)$/.test(styleOf(block).display)) block = block.parentElement;
    if (!block) return false;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_ACCEPT : /^(inline|contents)$/.test(styleOf(node).display) ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT),
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!/[\p{L}\p{N}]/u.test(node.textContent)) continue;
      const owner = node.parentElement?.closest(CONTROL);
      if (owner && owner !== block && block.contains(owner)) continue;
      return true;
    }
    return false;
  };
  // WCAG 2.2 2.5.8: a link inside a sentence is constrained by the line height of the text around it.
  const inlineTextLink = (el) => el.matches('a[href], [role="link"]') && styleOf(el).display === "inline" && sentenceText(el);
  const controls = elements.filter((el) => el.matches(CONTROL) && !inlineTextLink(el));
  // An absolutely positioned pseudo-element of a positioned control is part of its hit area: the box
  // target-size measures and the one control spacing keeps apart.
  const hitArea = (el) => {
    const box = rectOf(el);
    const area = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    for (const pseudo of ["::before", "::after"]) {
      const style = getComputedStyle(el, pseudo);
      if (["none", "normal"].includes(style.content) || style.display === "none" || style.pointerEvents === "none") continue;
      const extent = absolutePseudoBox(el, style);
      if (!extent) continue;
      area.left = Math.min(area.left, extent.left);
      area.top = Math.min(area.top, extent.top);
      area.right = Math.max(area.right, extent.right);
      area.bottom = Math.max(area.bottom, extent.bottom);
    }
    return { ...area, width: area.right - area.left, height: area.bottom - area.top };
  };
  const targetSize = checks["audit.target-size"];
  for (const el of controls) {
    targetSize.checked += 1;
    const { width, height } = hitArea(el);
    const minimum = thresholds.minTargetPx;
    if (width + EPSILON < minimum || height + EPSILON < minimum) failed("audit.target-size", el, { expected: `at least ${minimum} x ${minimum}px`, actual: `${round2(width)} x ${round2(height)}px`, message: `the control's target is ${round2(width)} x ${round2(height)}px, smaller than ${minimum}px`, fix: FIX.target });
  }
  // One spacing primitive for control groups and declared stacks (lintapple checkGap). Distances are
  // edge to edge, along the diagonal when two boxes share neither axis, so near corners still count.
  const checkGap = (code, list, minimum, fix, noun, boxOf = rectOf) => {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = boxOf(list[i]);
        const b = boxOf(list[j]);
        const xOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const yOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const distance = yOverlap > 0 ? Math.max(a.left - b.right, b.left - a.right) : xOverlap > 0 ? Math.max(a.top - b.bottom, b.top - a.bottom) : Math.hypot(xOverlap, yOverlap);
        if (distance + EPSILON < minimum) failed(code, list[i], { expected: `at least ${minimum}px from ${selectorOf(list[j])}`, actual: distance < 0 ? `overlapping it by ${round2(-distance)}px` : `${round2(distance)}px from it`, message: `two ${noun} are ${distance < 0 ? "overlapping" : `${round2(distance)}px apart`}, closer than ${minimum}px`, fix, related: list[j] });
      }
    }
  };
  const controlGap = checks["audit.control-gap"];
  const groups = new Map();
  for (const el of controls) {
    if (!el.parentElement) continue;
    groups.set(el.parentElement, [...(groups.get(el.parentElement) || []), el]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    controlGap.checked += group.length;
    checkGap("audit.control-gap", group, thresholds.minControlGapPx, FIX.controlGap, "controls", hitArea);
  }

  const controlInset = checks["audit.control-inset"];
  controlInset.declared = declare.controlContainers.length > 0;
  if (controlInset.declared) {
    for (const selector of declare.controlContainers) if (!matchesSome(selector)) noMatch("audit.control-inset", selector, "declare.controlContainers");
    const containers = declare.controlContainers.join(", ");
    for (const el of controls) {
      const container = el.parentElement?.closest(containers);
      if (!container || !visible(container)) continue;
      const inner = clientBounds(container);
      if (!inner) continue;
      controlInset.checked += 1;
      const short = Object.entries(edgeInsets(inner, rectOf(el))).filter(([, distance]) => distance + EPSILON < thresholds.minControlInsetPx);
      if (short.length) failed("audit.control-inset", el, { expected: `at least ${thresholds.minControlInsetPx}px from each inner edge of its container`, actual: short.map(([edge, distance]) => `${edge} inset ${round2(distance)}px`).join(", "), message: "a control sits too close to the edge of its container", fix: FIX.controlInset, related: container });
    }
  }

  // ---- declared layout: stacks, alignment groups and concentric radii
  const inFlow = (el) => visible(el) && hasBox(el) && !/^(absolute|fixed)$/.test(styleOf(el).position);
  const layoutGap = checks["audit.layout-gap"];
  layoutGap.declared = declare.stacks.length > 0;
  const stacks = new Set();
  for (const selector of declare.stacks) {
    const matches = [...document.querySelectorAll(selector)];
    if (!matches.length) noMatch("audit.layout-gap", selector, "declare.stacks");
    for (const el of matches) if (hasVisibleContent(el)) stacks.add(el);
  }
  for (const stack of stacks) {
    const children = [...stack.children].filter(inFlow);
    if (children.length < 2) continue;
    layoutGap.checked += children.length;
    checkGap("audit.layout-gap", children, thresholds.minLayoutGapPx, FIX.layoutGap, "stacked items");
  }

  const alignment = checks["audit.layout-alignment"];
  alignment.declared = declare.alignGroups.length > 0;
  for (const group of declare.alignGroups) {
    const containers = [...document.querySelectorAll(group.selector)];
    if (!containers.length) { noMatch("audit.layout-alignment", group.selector, "declare.alignGroups selector"); continue; }
    if (!matchesSome(group.items)) { noMatch("audit.layout-alignment", group.items, "declare.alignGroups items"); continue; }
    for (const container of containers) {
      if (!hasVisibleContent(container)) continue;
      const items = [...container.querySelectorAll(group.items)].filter((item) => item.parentElement?.closest(group.selector) === container);
      if (items.length < 2) {
        failed("audit.layout-alignment", container, { expected: `at least two items matching ${group.items}`, actual: `${items.length} matching item${items.length === 1 ? "" : "s"}`, message: "an alignment group needs at least two items", fix: "Point items at two or more elements inside the group, or remove the declaration." });
        continue;
      }
      const targets = items.filter((item) => visible(item) && hasBox(item));
      if (targets.length < 2) continue;
      alignment.checked += targets.length;
      const rtl = styleOf(container).direction === "rtl";
      const position = (item) => {
        const rect = rectOf(item);
        return group.edge === "center" ? (rect.left + rect.right) / 2 : rect[(group.edge === "start") === rtl ? "right" : "left"];
      };
      const reference = targets[0];
      for (const item of targets.slice(1)) {
        const distance = Math.abs(position(item) - position(reference));
        if (distance > tolerance.alignmentPx) failed("audit.layout-alignment", item, { expected: `its ${group.edge} edge within ${tolerance.alignmentPx}px of ${selectorOf(reference)}`, actual: `${round2(distance)}px off`, message: `an item is ${round2(distance)}px off the group's ${group.edge} edge`, fix: FIX.alignment, related: reference });
      }
    }
  }

  const radius = checks["audit.nested-radius"];
  radius.declared = declare.radiusPairs.length > 0;
  const CORNERS = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];
  for (const pair of declare.radiusPairs) {
    const outers = [...document.querySelectorAll(pair.outer)];
    if (!outers.length) { noMatch("audit.nested-radius", pair.outer, "declare.radiusPairs outer"); continue; }
    if (!matchesSome(pair.inner)) { noMatch("audit.nested-radius", pair.inner, "declare.radiusPairs inner"); continue; }
    for (const outer of outers) {
      if (!visible(outer)) continue;
      const inners = [...outer.querySelectorAll(pair.inner)].filter((inner) => inner.parentElement?.closest(pair.outer) === outer && visible(inner));
      if (!inners.length) {
        failed("audit.nested-radius", outer, { expected: `a visible inner surface matching ${pair.inner}`, actual: "no visible inner surface", message: "a declared outer surface has no visible inner surface", fix: "Point inner at the nested surface, or remove the radius pair." });
        continue;
      }
      for (const inner of inners) {
        radius.checked += 1;
        const insets = Object.values(edgeInsets(rectOf(outer), rectOf(inner)));
        const outerValues = CORNERS.map((key) => styleOf(outer)[key]);
        const innerValues = CORNERS.map((key) => styleOf(inner)[key]);
        const outerScale = scaleFor(outer);
        const innerScale = scaleFor(inner);
        const uneven = [outerScale, innerScale].some((value) => !Number.isFinite(value.x) || !Number.isFinite(value.y) || Math.abs(value.x - value.y) > 0.01)
          || insets.some((inset) => inset < 0 || Math.abs(inset - insets[0]) > tolerance.radiusPx)
          || [...outerValues, ...innerValues].some((value) => !/^\d+(?:\.\d+)?px$/.test(value))
          || new Set(outerValues).size !== 1 || new Set(innerValues).size !== 1;
        if (uneven) {
          unresolved("audit.nested-radius", inner, { expected: "equal insets and one pixel radius per surface", actual: `insets ${insets.map(round2).join("/")}px, outer radius ${outerValues.join(" ")}, inner radius ${innerValues.join(" ")}`, message: "the nested radius cannot be judged: the surfaces are not evenly inset or their corners differ", fix: FIX.radiusUnresolved, related: outer });
          continue;
        }
        const expected = Math.max(0, parseFloat(outerValues[0]) * outerScale.x - insets[0]);
        const actual = parseFloat(innerValues[0]) * innerScale.x;
        if (Math.abs(actual - expected) > tolerance.radiusPx) failed("audit.nested-radius", inner, { expected: `${round2(expected / innerScale.x)}px inner radius (outer ${outerValues[0]} minus the ${round2(insets[0])}px inset)`, actual: innerValues[0], message: "the inner radius is not concentric with the outer radius", fix: FIX.radius, related: outer });
      }
    }
  }

  return {
    viewport,
    elements: elements.length,
    controls: controls.length,
    checks,
    contractErrors: [],
  };
}

// ---------- summary ----------

const viewportLabel = ({ width, height }) => `${width}x${height}`;

function readCheck(check, code, where) {
  const ok = isObject(check) && typeof check.declared === "boolean"
    && ["checked", "failedCount", "indeterminateCount"].every((key) => Number.isInteger(check[key]) && check[key] >= 0)
    && ["failed", "indeterminate"].every((key) => Array.isArray(check[key]));
  if (!ok) fail(SCOPE, `audit result ${where} has an incomplete ${code} check`);
  return check;
}

function checkStatus(check) {
  if (!check.declared) return "not-declared";
  if (check.failedCount) return "failed";
  if (check.indeterminateCount) return "indeterminate";
  return check.checked > 0 ? "passed" : "not-applicable";
}

// Whether the gate can hash what the page requested: a file inside the project (present or not;
// lineage binds a missing one as absent). Inline data:, blob: and about: never reach the log.
function bindable(url, project) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") return false;
    resolveInside(project, fileURLToPath(parsed), "loaded page file", { scope: SCOPE });
    return true;
  } catch {
    return false;
  }
}

// Turns per-viewport page measurements and request logs into one audit row: a status per check
// per viewport, error findings for failed and indeterminate items, a hint for each optional check
// left not-declared, and any selector the page rejected (contract errors). Every URL in the
// viewport logs and the probe's whole `requests` log that the gate cannot hash is listed once, in
// request order, in one external-request finding that fails the row; `project` bounds the files.
function summarizeAudit(probeId, viewportResults, project, requests = []) {
  if (!nonEmpty(probeId)) fail(SCOPE, "audit summary needs the probe id");
  if (!nonEmpty(project)) fail(SCOPE, `audit ${probeId} needs the project root that bounds the files its page may load`);
  if (!Array.isArray(viewportResults) || !viewportResults.length) fail(SCOPE, `audit ${probeId} has no viewport results`);
  const contractErrors = [];
  const coverage = [];
  const findings = [];
  const requested = new Set();
  for (const entry of viewportResults) {
    const viewport = { width: entry?.viewport?.width, height: entry?.viewport?.height };
    if (![viewport.width, viewport.height].every((size) => Number.isInteger(size) && size > 0)) fail(SCOPE, `audit ${probeId} has a viewport result without its viewport size`);
    const where = viewportLabel(viewport);
    const result = entry.result;
    if (!isObject(result)) fail(SCOPE, `audit ${probeId} at ${where} has no measurement`);
    if (Array.isArray(result.contractErrors) && result.contractErrors.length) {
      for (const message of result.contractErrors) if (!contractErrors.includes(message)) contractErrors.push(message);
      continue;
    }
    if (!isObject(result.checks) || Object.keys(result.checks).join() !== AUDIT_CODES.join()) fail(SCOPE, `audit ${probeId} at ${where} did not report exactly the ${AUDIT_CODES.length} audit checks`);
    if (!Array.isArray(entry.requests) || !entry.requests.every((url) => typeof url === "string")) fail(SCOPE, `audit ${probeId} at ${where} has no request log`);
    for (const url of entry.requests) requested.add(url);
    const checks = AUDIT_CODES.map((code) => {
      const check = readCheck(result.checks[code], code, `${probeId} at ${where}`);
      const status = checkStatus(check);
      const base = { severity: "error", probeId, viewport: where };
      for (const item of [...check.failed, ...check.indeterminate]) {
        findings.push({ code, ...base, selector: item.selector, expected: item.expected, actual: item.actual, message: `${where}: ${item.message}`, fix: item.fix, ...(item.related ? { related: item.related } : {}) });
      }
      return {
        code, status, checked: check.checked, failed: check.failedCount, indeterminate: check.indeterminateCount,
        ...(status === "not-declared" ? { hint: NOT_DECLARED_HINT[code] } : {}),
      };
    });
    coverage.push({ viewport, elements: result.elements, checks });
  }
  if (!Array.isArray(requests) || !requests.every((url) => typeof url === "string")) fail(SCOPE, `audit ${probeId} has no request log`);
  for (const url of requests) requested.add(url);
  const unbound = [...requested].filter((url) => !bindable(url, project));
  if (unbound.length) {
    const urls = unbound.slice(0, MAX_LISTED_URLS);
    // `actual` repeats the URLs because the gate record keeps a finding's string fields only.
    findings.push({ code: "external-request", severity: "error", probeId, message: `${unbound.length} request${unbound.length === 1 ? "" : "s"} went outside the project`, expected: "only files inside the project, or inline data: and blob: resources", actual: urls.join(", "), fix: EXTERNAL_FIX, urls });
  }
  // not-declared is reported, never passed and never failing; only an optional check can be it.
  const settled = (check) => PASSING.includes(check.status) || (check.status === "not-declared" && OPTIONAL_CODES.includes(check.code));
  const status = !contractErrors.length && !unbound.length && coverage.length === viewportResults.length && coverage.every((entry) => entry.checks.every(settled)) ? "passed" : "failed";
  return { status, coverage, findings, contractErrors };
}

module.exports = { AUDIT_CODES, OPTIONAL_CODES, AUDIT_DEFAULTS, EXTERNAL_FIX, validateAuditProbe, auditOptions, auditViewports, auditPage, bindable, summarizeAudit };
