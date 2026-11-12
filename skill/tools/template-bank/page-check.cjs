#!/usr/bin/env node
"use strict";

// Browser half of `template check`: loads an SVG or HTML page in headless Chrome and measures what
// is actually drawn, including layers injected after rendering and hand-written SVG.
//
// Text units: every [data-chk] element, every template slot ([data-slot] of kind text or
// lettering), and every other element with its own text (SVG <text> included); a unit owns its
// descendants, and a marked element that holds other marked elements is only a container. data-grp / data-chk / data-slot name the unit's group; units whose groups share
// the prefix before "/" are one block and are not checked against each other. data-deco (or the
// template's data-decor) exempts a unit from overlap and contrast; data-bleed exempts it from the
// canvas edge.
//
// Collage layers: <img>, SVG <image> and [data-collage] elements outside text units. An image inside
// [data-layer="ground"] (a template slot declared as a layer-contract ground, or a page's
// composited scene) is the text's ground: it is sampled for contrast and never counted as collage.
// The same holds for an image whose file is a ground output listed in a composite.json receipt
// beside it (materials composite). Images tied to a receipt bring its measurements (halo, black
// point, colour difference, upscale) and, for the character layer, its face and hand boxes, which
// are checked against the measured text ink (safe-area-type).
//
// Measurements (all from screenshots of the page at 1 device pixel per CSS pixel):
//   ink      every text unit painted alone in black and then in white with all other text and
//            collage hidden; where the two shots differ is its coverage, so the ink box is the
//            glyphs, not the em box, and plates painted above the text are respected;
//   ground   per text unit, the page with only that unit hidden (other text and collage kept);
//   alone    each unit painted with everything else hidden: the ink nothing covers (occlusion);
//   collage  each layer's visible pixels: the full page against the page without that layer, so a
//            layer counts only where its alpha actually paints, never by its rotated frame.
// Rules: text-overlap (ink of two groups touching), text-occluded (a non-collage layer hides the
// glyphs), off-canvas (text cut by the canvas edge), asset-missing (a request failed),
// font-collection (@font-face pointing at a .ttc),
// collage-cover (a collage layer painting inside a text unit's ink zone, above it or as its ground), contrast (10th percentile of
// the text colour against the ground inside the ink box), glyph-coverage (a string the browser
// would set with per-glyph fallback).

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL, fileURLToPath } = require("node:url");
const { decodePng } = require("../../scripts/png-core.cjs");
const { rgbToOklab } = require("../../scripts/brand-design-systems-core.cjs");
const coverage = require("./coverage.cjs");

const PAGE_RULES = Object.freeze({
  inkThreshold: 48, // coverage (max channel difference of the black and white shots) that counts as ink
  overlapGapEm: 0.06, // ink closer than this share of the smaller font size counts as touching
  overlapMinGapPx: 2,
  overlapMinPx: 6,
  overlapMinShare: 0.002,
  coverMinShare: 0.01, // share of a text unit's ink zone a collage layer may paint (above or below)
  coverZoneEm: 0.1, // the ink zone: glyph pixels grown by this share of the font size
  occludedMaxShare: 0.15, // share of a text's own glyph pixels that another layer may hide
  occludedMinPx: 12,
  coverMinPx: 12,
  edgeTolerancePx: 1,
  contrastPercentile: 10,
  contrastShrink: 0.08,
  contrastNormal: 4.5,
  contrastLarge: 3,
  largePx: 24,
  largeBoldPx: 18.66,
  // hue-budget (opt-in: only a page that declares data-hue-brand / -counter / -alert / -timed on its root)
  hueMinChroma: 0.08, // OKLab chroma from which a pixel counts as a saturated hue
  hueMatchDeg: 25, // hue distance within which a pixel belongs to a declared role
  hueCounterMax: 0.03, // share of the canvas the counter colour may paint
  hueStatusMax: 0.01, // share of the canvas alert and timed may paint together
  hueOtherMax: 0.001, // share of the canvas any undeclared saturated hue may paint
});

const STYLE = `
*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}
[data-tc-off],[data-tc-off] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;fill:transparent!important;stroke:transparent!important;text-decoration-color:transparent!important}
[data-tc-key="0"],[data-tc-key="0"] *{color:#000!important;-webkit-text-fill-color:#000!important;-webkit-text-stroke-color:#000!important;fill:#000!important;stroke:transparent!important;text-shadow:none!important;opacity:1!important}
[data-tc-key="1"],[data-tc-key="1"] *{color:#fff!important;-webkit-text-fill-color:#fff!important;-webkit-text-stroke-color:#fff!important;fill:#fff!important;stroke:transparent!important;text-shadow:none!important;opacity:1!important}
[data-tc-key="0"] [fill="none"],[data-tc-key="0"] [fill="none"] *{fill:transparent!important;stroke:#000!important}
[data-tc-key="1"] [fill="none"],[data-tc-key="1"] [fill="none"] *{fill:transparent!important;stroke:#fff!important}
[data-tc-hide]:not([data-tc-bg]){visibility:hidden!important}
[data-tc-hide][data-tc-bg]{background-image:none!important}
:root[data-tc-iso] *{visibility:hidden!important}
:root[data-tc-iso] [data-tc-solo],:root[data-tc-iso] [data-tc-solo] *{visibility:visible!important}
:root[data-tc-hue] [data-deco],:root[data-tc-hue] [data-decor="1"]{visibility:hidden!important}
`;

// ---- runs in the page --------------------------------------------------------------------------
function discover() {
  const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE", "METADATA", "DEFS", "desc", "title", "metadata", "defs", "style", "script", "clipPath", "mask", "pattern", "filter", "symbol", "marker", "linearGradient", "radialGradient"]);
  const effectiveOpacity = (element) => {
    let value = 1;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement || node.parentNode) {
      const style = getComputedStyle(node);
      if (style.display === "none") return 0;
      value *= Number(style.opacity);
    }
    return value;
  };
  const insideSkipped = (element) => {
    for (let node = element; node && node.nodeType === 1; node = node.parentElement || node.parentNode) {
      if (skipTags.has(node.tagName) || skipTags.has(node.localName) || node.id === "guides") return true;
    }
    return false;
  };
  const ownText = (element) => [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const marked = [...document.querySelectorAll("[data-chk],[data-slot][data-kind=text],[data-slot][data-kind=lettering]")];
  const units = [];
  const isUnit = new Set();
  const underUnit = (element) => { for (let node = element.parentElement || element.parentNode; node && node.nodeType === 1; node = node.parentElement || node.parentNode) if (isUnit.has(node)) return true; return false; };
  // a marked element that holds other marked elements is a group container, not a unit
  const markedSet = new Set(marked);
  const holdsMarked = (element) => marked.some((other) => other !== element && element.contains(other));
  for (const element of markedSet) { if (!insideSkipped(element) && !holdsMarked(element)) isUnit.add(element); }
  const all = [...document.querySelectorAll("body *, svg *, svg")];
  for (const element of all) {
    if (isUnit.has(element) || underUnit(element) || insideSkipped(element)) continue;
    if (element.localName === "tspan") continue;
    if (ownText(element) || (element.localName === "text" && element.textContent.trim())) isUnit.add(element);
  }
  for (const element of all) if (isUnit.has(element) && underUnit(element)) isUnit.delete(element);
  const W = document.documentElement.clientWidth || innerWidth;
  const H = document.documentElement.clientHeight || innerHeight;
  let index = 0;
  for (const element of all) {
    if (!isUnit.has(element)) continue;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const opacity = effectiveOpacity(element);
    if (style.visibility === "hidden" || opacity < 0.05 || rect.width < 1 || rect.height < 1) continue;
    const svgText = element instanceof SVGElement;
    // Drawn lettering: a lettering slot, or any element marked data-chk whose glyphs are paths (an
    // SVG numeral, a stencil word) and that holds no text; data-cap gives its cap height.
    const drawn = !(element.textContent || "").trim() && !!element.querySelector("path");
    const lettering = (element.getAttribute("data-kind") === "lettering" || (element.hasAttribute("data-chk") && drawn)) && !element.querySelector("text");
    const vertical = (style.writingMode || "").startsWith("vertical");
    const fontSize = lettering ? Number(element.getAttribute("data-cap") || rect.height) / 0.72 : parseFloat(style.fontSize);
    // layout box: per-line rects with the cross axis cut to about the font size (line boxes overstate ink).
    let box = { x0: rect.left, y0: rect.top, x1: rect.right, y1: rect.bottom };
    if (!lettering) {
      let rects = [];
      if (svgText) rects = [rect];
      else { const range = document.createRange(); range.selectNodeContents(element); rects = [...range.getClientRects()].filter((q) => q.width > 1 && q.height > 1); }
      if (rects.length) {
        let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
        for (const q of rects) {
          let a = q.left; let b = q.top; let c = q.right; let d = q.bottom;
          if (!vertical && q.height > fontSize) { const m = (b + d) / 2; b = m - fontSize * 0.46; d = m + fontSize * 0.46; }
          if (vertical && q.width > fontSize) { const m = (a + c) / 2; a = m - fontSize * 0.46; c = m + fontSize * 0.46; }
          x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
        }
        box = { x0, y0, x1, y1 };
      }
    }
    const colourSource = lettering ? (element.querySelector(".lettering path") || element.querySelector("path") || element) : element;
    const colourStyle = getComputedStyle(colourSource);
    // a stroked glyph (fill none) paints with its stroke
    const color = svgText || lettering ? (lettering && colourStyle.fill === "none" ? colourStyle.stroke : colourStyle.fill) : colourStyle.color;
    // text runs with the font stack that sets them (a ruby or span may use another family)
    const runs = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\s+/g, "");
      if (!text) continue;
      const parentStyle = getComputedStyle(node.parentElement || element);
      // each run's own paint: an SVG <text> inside a marked <g> paints with its own fill, a span with its own colour
      // an HTML run paints with -webkit-text-fill-color (it computes to color when unset); a text
      // outline (-webkit-text-stroke) is recorded so a transparent fill is measured by its stroke
      const svgRun = node.parentElement instanceof SVGElement;
      const painted = svgRun ? parentStyle.fill : parentStyle.webkitTextFillColor || parentStyle.color;
      const outline = !svgRun && parseFloat(parentStyle.webkitTextStrokeWidth) > 0 ? parentStyle.webkitTextStrokeColor : null;
      runs.push({ text, family: parentStyle.fontFamily, weight: Number(parentStyle.fontWeight) || 400, color: painted, ...(outline ? { outline } : {}) });
    }
    const id = element.getAttribute("data-chk") || element.getAttribute("data-slot") || element.getAttribute("data-id") || `${element.localName}:${(element.textContent || "").trim().slice(0, 12)}`;
    const group = element.getAttribute("data-grp") || element.getAttribute("data-chk") || element.getAttribute("data-slot") || `u${index}`;
    element.setAttribute("data-tc-unit", String(index));
    units.push({
      index, id, group, text: (element.textContent || "").trim().slice(0, 60), runs,
      deco: element.hasAttribute("data-deco") || element.getAttribute("data-decor") === "1",
      bleed: element.hasAttribute("data-bleed") && element.getAttribute("data-bleed") !== "0",
      lettering, svg: svgText, color, fontSize, fontWeight: Number(style.fontWeight) || 400, opacity,
      layout: box, rect: { x0: rect.left, y0: rect.top, x1: rect.right, y1: rect.bottom },
    });
    index += 1;
  }
  let layerSources = null;
  try { layerSources = JSON.parse(document.getElementById("template-params")?.textContent || "null")?.layerSources || null; } catch { layerSources = null; }
  const collage = [];
  const images = [];
  let c = 0;
  // Collage layers: images, [data-collage], and elements painting a background image (url, normal
  // blend; multiply / screen texture overlays are paper and grain, not collage). A background layer
  // is switched off by removing its background, so text inside it stays.
  const bgLayers = [...document.querySelectorAll("body *")].filter((element) => {
    const style = getComputedStyle(element);
    return /url\(/.test(style.backgroundImage) && (style.mixBlendMode || "normal") === "normal" && !element.closest("[data-tc-unit]") && !insideSkipped(element);
  });
  for (const element of [...document.querySelectorAll("img, image, [data-collage]"), ...bgLayers]) {
    if (element.hasAttribute("data-tc-collage")) continue;
    if (element.closest("[data-tc-unit]") || insideSkipped(element)) continue;
    if (element.parentElement && element.parentElement.closest("[data-collage]")) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || effectiveOpacity(element) < 0.05) continue;
    // A ground declaration is read at the slot level only: on the image itself, or on its own slot
    // element ([data-slot][data-layer], the template's <g> around one <image>); never inherited from
    // an arbitrary ancestor, so a wrapper cannot exempt the collage inside it.
    const isImage = element.tagName === "IMG" || element.localName === "image";
    const slotEl = element.parentElement && element.parentElement.matches && element.parentElement.matches("[data-slot][data-layer]") ? element.parentElement : null;
    const layerRole = isImage ? (element.getAttribute("data-layer") || slotEl?.getAttribute("data-layer") || null) : null;
    const slot = slotEl?.getAttribute("data-slot") || element.closest("[data-slot]")?.getAttribute("data-slot") || null;
    const rawSrc = element.getAttribute("src") || element.getAttribute("href") || element.getAttribute("xlink:href") || "";
    const absolute = rawSrc && !rawSrc.startsWith("data:") ? new URL(rawSrc, document.baseURI).href : null;
    const dataUri = rawSrc.startsWith("data:") && slot && layerSources && layerSources[slot] ? rawSrc : null;
    if (isImage) images.push({ slot, role: layerRole, src: absolute, dataUri, rect: { x0: rect.left, y0: rect.top, x1: rect.right, y1: rect.bottom }, collage: layerRole === "ground" ? null : c });
    if (layerRole === "ground") continue;
    element.setAttribute("data-tc-collage", String(c));
    if (bgLayers.includes(element) && !["IMG", "image"].includes(element.tagName) && !element.hasAttribute("data-collage")) element.setAttribute("data-tc-bg", "");
    const bg = /url\(\s*["']?([^"')]+)/.exec(getComputedStyle(element).backgroundImage);
    const src = element.getAttribute("data-collage") || element.getAttribute("src") || element.getAttribute("href") || element.getAttribute("xlink:href") || (bg ? `bg:${bg[1]}` : element.localName);
    collage.push({ index: c, id: element.getAttribute("data-collage") || element.getAttribute("data-slot") || (bg && element.hasAttribute("data-tc-bg") ? `bg:${bg[1].startsWith("data:") ? "embedded" : bg[1].split("/").pop()}` : `${element.localName}:${String(src).startsWith("data:") ? "embedded" : String(src).split("/").pop()}`), rect: { x0: rect.left, y0: rect.top, x1: rect.right, y1: rect.bottom } });
    c += 1;
  }
  // @font-face files the page loads (for glyph coverage)
  const faces = [];
  const collect = (rules) => {
    for (const rule of rules) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const family = rule.style.getPropertyValue("font-family").trim().replace(/^["']|["']$/g, "");
        const src = rule.style.getPropertyValue("src");
        const weight = Number(String(rule.style.getPropertyValue("font-weight") || "400").split(/\s+/)[0]) || 400;
        const urls = [...src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => new URL(m[1], rule.parentStyleSheet?.href || document.baseURI).href);
        for (const url of urls) faces.push({ family, weight, url });
      } else if (rule.cssRules) collect(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch { /* cross-origin sheet */ } }
  // Declared colour roles for the hue budget: data-hue-brand / -counter / -alert / -timed on the root,
  // resolved to [r, g, b] by the browser (any CSS colour); null when the value is not a colour.
  const hueRoles = {};
  const root = document.documentElement;
  const probe = root instanceof SVGSVGElement ? document.createElementNS("http://www.w3.org/2000/svg", "g") : document.createElement("i");
  root.appendChild(probe);
  for (const role of ["brand", "counter", "alert", "timed"]) {
    const value = (root.getAttribute(`data-hue-${role}`) || "").trim();
    if (!value) continue;
    probe.style.color = "rgb(0 0 0 / 0)";
    probe.style.color = value;
    const parts = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number);
    hueRoles[role] = parts.length >= 3 && (parts.length < 4 || parts[3] > 0) ? parts.slice(0, 3) : null;
  }
  probe.remove();
  return { W, H, units, collage, images, layerSources, faces, hueRoles, noText: root.hasAttribute("data-no-text") };
}

// ---- pixel helpers -----------------------------------------------------------------------------
function luminance([r, g, b]) {
  const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
// [r, g, b, alpha] of a CSS colour, or null for none / transparent / non-colour paint
function parseCss(value) {
  const m = String(value || "").match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[ ,/]+/).filter(Boolean).map((v) => (v.endsWith("%") ? Number(v.slice(0, -1)) / 100 : Number(v)));
  const alpha = parts.length > 3 ? parts[3] : 1;
  if (!(alpha > 0.01)) return null;
  return [parts[0], parts[1], parts[2], alpha];
}
const r1 = (v) => Math.round(v * 10) / 10;
const box4 = (b) => [Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1)];

// Saturated-hue budget of a page shot. roles maps brand, counter, alert and timed to [r, g, b] (or null
// for a value that is not a colour). Each saturated pixel (OKLab chroma >= hueMinChroma) goes to the
// declared role whose hue is nearest within hueMatchDeg (alert and timed count as one status share),
// or else to a 10-degree hue bin; runs of occupied bins are the undeclared hues. Shares are of all
// sampled pixels (every second pixel of a row). The brand share is reported, never limited.
function hueBudget(shot, roles, rules = PAGE_RULES) {
  const hueOf = (a, b) => (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  const declared = [];
  const unmeasured = [];
  for (const [role, rgb] of Object.entries(roles)) {
    if (!rgb) { unmeasured.push(`${role} is not a colour`); continue; }
    const [, a, b] = rgbToOklab(rgb.map((v) => v / 255));
    if (Math.hypot(a, b) < rules.hueMinChroma) { unmeasured.push(`${role} ${hex(rgb)} is not saturated (OKLab chroma under ${rules.hueMinChroma}), so it has no hue to measure`); continue; }
    declared.push({ role, group: role === "alert" || role === "timed" ? "status" : role, hue: hueOf(a, b) });
  }
  const BINS = 36;
  const bins = Array.from({ length: BINS }, () => ({ n: 0, r: 0, g: 0, b: 0 }));
  const count = { brand: 0, counter: 0, status: 0 };
  const d = shot.data;
  let total = 0;
  for (let i = 0; i + 2 < d.length; i += 8) {
    total += 1;
    const r = d[i]; const g = d[i + 1]; const bl = d[i + 2];
    if (Math.max(r, g, bl) - Math.min(r, g, bl) < 16) continue; // near grey: cannot reach the chroma floor
    const [, a, b] = rgbToOklab([r / 255, g / 255, bl / 255]);
    if (Math.hypot(a, b) < rules.hueMinChroma) continue;
    const h = hueOf(a, b);
    let best = null;
    for (const dec of declared) {
      const dist = Math.min(Math.abs(h - dec.hue), 360 - Math.abs(h - dec.hue));
      if (dist <= rules.hueMatchDeg && (!best || dist < best.dist)) best = { group: dec.group, dist };
    }
    if (best) count[best.group] += 1;
    else { const bin = bins[Math.floor(h / (360 / BINS)) % BINS]; bin.n += 1; bin.r += r; bin.g += g; bin.b += bl; }
  }
  const share = Object.fromEntries(Object.entries(count).map(([k, v]) => [k, total ? v / total : 0]));
  // runs of occupied bins (circular), ignoring single-pixel noise
  const on = bins.map((bin) => bin.n > total * 0.0001);
  const others = [];
  const start = on.findIndex((v, i) => v && !on[(i - 1 + BINS) % BINS]);
  if (on.every(Boolean)) others.push({ hue: "all", n: bins.reduce((s, x) => s + x.n, 0), ...bins.reduce((s, x) => ({ r: s.r + x.r, g: s.g + x.g, b: s.b + x.b }), { r: 0, g: 0, b: 0 }) });
  else if (start >= 0) {
    for (let k = 0; k < BINS; k += 1) {
      const i = (start + k) % BINS;
      if (!on[i]) continue;
      if (!on[(i - 1 + BINS) % BINS]) others.push({ h0: i, h1: i, n: 0, r: 0, g: 0, b: 0 });
      const run = others[others.length - 1];
      run.h1 = i; run.n += bins[i].n; run.r += bins[i].r; run.g += bins[i].g; run.b += bins[i].b;
    }
  }
  return {
    total, share, unmeasured,
    declared: declared.map((x) => ({ role: x.role, hue: Math.round(x.hue) })),
    others: others.map((o) => ({
      hue: o.hue || `${o.h0 * (360 / BINS)}-${(o.h1 + 1) * (360 / BINS)}`,
      share: total ? o.n / total : 0,
      color: hex([o.r / o.n, o.g / o.n, o.b / o.n]),
    })).sort((p, q) => q.share - p.share),
  };
}

function clampRegion(b, W, H, pad = 0) {
  const x0 = Math.max(0, Math.floor(b.x0 - pad)); const y0 = Math.max(0, Math.floor(b.y0 - pad));
  const x1 = Math.min(W, Math.ceil(b.x1 + pad)); const y1 = Math.min(H, Math.ceil(b.y1 + pad));
  return x1 - x0 >= 1 && y1 - y0 >= 1 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

// mask over a region: pixels where shot differs from base (base is a full-canvas image)
function diffMask(shot, base, region, threshold) {
  const mask = new Uint8Array(region.w * region.h);
  let count = 0;
  for (let y = 0; y < region.h; y += 1) {
    for (let x = 0; x < region.w; x += 1) {
      const s = (y * shot.width + x) * 4;
      const b = ((y + region.y) * base.width + (x + region.x)) * 4;
      const d = Math.max(Math.abs(shot.data[s] - base.data[b]), Math.abs(shot.data[s + 1] - base.data[b + 1]), Math.abs(shot.data[s + 2] - base.data[b + 2]));
      if (d >= threshold) { mask[y * region.w + x] = 1; count += 1; }
    }
  }
  return { region, mask, count };
}

function maskBox(m) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let y = 0; y < m.region.h; y += 1) for (let x = 0; x < m.region.w; x += 1) {
    if (!m.mask[y * m.region.w + x]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x0 === Infinity ? null : { x0: x0 + m.region.x, y0: y0 + m.region.y, x1: x1 + m.region.x + 1, y1: y1 + m.region.y + 1 };
}
const at = (m, X, Y) => { const x = X - m.region.x; const y = Y - m.region.y; return x >= 0 && y >= 0 && x < m.region.w && y < m.region.h && m.mask[y * m.region.w + x] === 1; };

// Square dilation by d px (Chebyshev), in O(pixels): a running window per row, then per column.
// The result's region grows by d on each side.
function dilate(m, d) {
  const w = m.region.w + 2 * d; const h = m.region.h + 2 * d;
  const rows = new Uint8Array(w * h);
  for (let y = 0; y < m.region.h; y += 1) {
    let run = 0;
    const line = new Int32Array(w + 1);
    for (let x = 0; x < m.region.w; x += 1) if (m.mask[y * m.region.w + x]) { line[x] += 1; line[x + 2 * d + 1] -= 1; }
    for (let x = 0; x < w; x += 1) { run += line[x]; if (run > 0) rows[(y + d) * w + x] = 1; }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x += 1) {
    let run = 0;
    const col = new Int32Array(h + 1);
    for (let y = d; y < d + m.region.h; y += 1) if (rows[y * w + x]) { col[y - d] += 1; col[y + d + 1] -= 1; }
    for (let y = 0; y < h; y += 1) { run += col[y]; if (run > 0) out[y * w + x] = 1; }
  }
  let count = 0;
  for (const v of out) count += v;
  return { region: { x: m.region.x - d, y: m.region.y - d, w, h }, mask: out, count };
}

// pixels of b's mask inside a's mask
function within(a, b) {
  let count = 0;
  for (let y = 0; y < b.region.h; y += 1) for (let x = 0; x < b.region.w; x += 1) {
    if (b.mask[y * b.region.w + x] && at(a, x + b.region.x, y + b.region.y)) count += 1;
  }
  return count;
}

const intersects = (a, b, pad = 0) => a && b && Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > -pad && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > -pad;

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))))];
}

// Smallest axis move of box b that separates it from box a by gap px.
function separation(a, b, gap) {
  const moves = [
    { dir: "right", px: a.x1 - b.x0 + gap }, { dir: "left", px: b.x1 - a.x0 + gap },
    { dir: "down", px: a.y1 - b.y0 + gap }, { dir: "up", px: b.y1 - a.y0 + gap },
  ].filter((m) => m.px > 0).sort((p, q) => p.px - q.px);
  return moves[0] || { dir: "none", px: 0 };
}

// Images tied to a materials composite receipt: by file (composite.json beside the image) or, for a
// template render whose images are embedded, by the render's layerSources (slot -> receipt).
function linkReceipts(found, pageFile) {
  const out = [], notes = [], cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) { try { const r = JSON.parse(fs.readFileSync(file, "utf8")); cache.set(file, r?.schema === "design-pipeline.composite.v1" ? r : null); } catch { cache.set(file, null); } }
    return cache.get(file);
  };
  for (const image of found.images || []) {
    let receiptFile = null, name = null, bytes = null;
    if (image.src && image.src.startsWith("file:")) {
      try { const local = fileURLToPath(image.src); receiptFile = path.join(path.dirname(local), "composite.json"); name = path.basename(local); if (fs.existsSync(local)) bytes = fs.readFileSync(local); } catch { receiptFile = null; }
    } else if (image.slot && found.layerSources?.[image.slot]) {
      const source = found.layerSources[image.slot];
      receiptFile = path.resolve(path.dirname(pageFile), source.receipt); name = source.file;
      const m = /^data:[^;,]+;base64,(.*)$/s.exec(image.dataUri || "");
      bytes = m ? Buffer.from(m[1], "base64") : null;
    }
    if (!receiptFile || !fs.existsSync(receiptFile)) continue;
    const receipt = read(receiptFile), output = receipt?.outputs?.[name];
    if (!output) continue;
    // a receipt vouches only for the bytes it recorded: a copied or edited image is not linked
    const actual = bytes ? crypto.createHash("sha256").update(bytes).digest("hex") : null;
    if (!output.sha256 || actual !== output.sha256) { notes.push(`${image.slot || name}: ${path.basename(receiptFile)} lists ${name} but its sha256 does not match the image shown; the receipt is ignored (ground exemption and composite checks not applied). Fix: composite again, or use the recorded output unchanged`); continue; }
    out.push({ image, receipt, receiptFile, file: name, output });
  }
  return { links: out, notes };
}

// ---- main ----------------------------------------------------------------------------------------
async function launch({ file = null, chrome, puppeteerModule } = {}) {
  const { resolvePuppeteer } = require("../../scripts/film-capture-core.cjs");
  const { resolveBrowser } = require("../../scripts/browser-locate.cjs");
  const puppeteer = resolvePuppeteer(file ? path.dirname(path.resolve(file)) : process.cwd(), puppeteerModule || undefined);
  return puppeteer.launch({ executablePath: resolveBrowser(chrome || undefined), headless: true, args: ["--allow-file-access-from-files", "--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars"] });
}

// browser: an open puppeteer browser to reuse (the caller closes it); otherwise one is launched.
async function checkPage({ file, chrome, puppeteerModule, browser: shared = null, size = null, faces: extraFaces = [], rules: overrides = {} }) {
  const rules = { ...PAGE_RULES, ...overrides };
  const absolute = path.resolve(file);
  const browser = shared || await launch({ file, chrome, puppeteerModule });
  const pages = [];
  try {
    const page = await browser.newPage();
    pages.push(page);
    const errors = [];
    const pageErrors = [];
    page.on("pageerror", (error) => { pageErrors.push(error.message); errors.push(error.message); });
    page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) { pageErrors.push(message.text()); errors.push(message.text()); } });
    const failed = [];
    page.on("requestfailed", (request) => { failed.push(request.url()); errors.push(`request failed: ${request.url().slice(-120)}`); });
    let [W, H] = size ? size : [1920, 1080];
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(absolute).href, { waitUntil: "load", timeout: 60000 });
    if (!size) {
      const natural = await page.evaluate(() => {
        const root = document.documentElement;
        if (root instanceof SVGSVGElement) {
          const vb = root.viewBox && root.viewBox.baseVal;
          return [parseFloat(root.getAttribute("width")) || (vb && vb.width) || 0, parseFloat(root.getAttribute("height")) || (vb && vb.height) || 0];
        }
        const style = getComputedStyle(root);
        return [parseFloat(style.width) || 0, parseFloat(style.height) || 0];
      });
      if (natural[0] >= 16 && natural[1] >= 16) [W, H] = natural.map(Math.round);
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    }
    await page.evaluate(async (css) => {
      const svgRoot = document.documentElement instanceof SVGSVGElement;
      const style = document.createElementNS(svgRoot ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1999/xhtml", "style");
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
      if (document.fonts) await document.fonts.ready;
      await Promise.all([...document.images].map((img) => (img.complete ? 0 : new Promise((resolve) => { img.onload = img.onerror = resolve; }))));
    }, STYLE);
    await new Promise((resolve) => setTimeout(resolve, 120));
    const found = await page.evaluate(discover);
    const units = found.units;
    // composite receipts behind the images: a ground output leaves the collage list
    const { links: linked, notes: receiptNotes } = linkReceipts(found, absolute);
    const grounds = new Set(linked.filter((l) => l.output.layer === "ground" && l.image.collage !== null).map((l) => l.image.collage));
    if (grounds.size) await page.evaluate((drop) => { for (const el of document.querySelectorAll("[data-tc-collage]")) if (drop.includes(Number(el.getAttribute("data-tc-collage")))) el.removeAttribute("data-tc-collage"); }, [...grounds]);
    const collage = found.collage.filter((layer) => !grounds.has(layer.index));
    const shot = async (region) => decodePng(Buffer.from(await page.screenshot({ type: "png", clip: region ? { x: region.x, y: region.y, width: region.w, height: region.h } : { x: 0, y: 0, width: W, height: H } })), "screenshot");
    const setState = (state) => page.evaluate((s) => {
      if (s.isolate) document.documentElement.setAttribute("data-tc-iso", ""); else document.documentElement.removeAttribute("data-tc-iso");
      for (const el of document.querySelectorAll("[data-tc-unit]")) {
        const i = Number(el.getAttribute("data-tc-unit"));
        el.removeAttribute("data-tc-key");
        if (s.isolate && s.key && s.key.unit === i) el.setAttribute("data-tc-solo", ""); else el.removeAttribute("data-tc-solo");
        if (s.textOff === "all" || (Array.isArray(s.textOff) && s.textOff.includes(i))) el.setAttribute("data-tc-off", ""); else el.removeAttribute("data-tc-off");
        if (s.key && s.key.unit === i) { el.removeAttribute("data-tc-off"); el.setAttribute("data-tc-key", String(s.key.tone)); }
      }
      for (const el of document.querySelectorAll("[data-tc-collage]")) {
        const i = Number(el.getAttribute("data-tc-collage"));
        if (s.collageOff === "all" || (Array.isArray(s.collageOff) && s.collageOff.includes(i))) el.setAttribute("data-tc-hide", ""); else el.removeAttribute("data-tc-hide");
      }
    }, state);

    const full = await shot();
    // ink per unit: painted alone in black, then in white, with all other text and collage hidden;
    // the difference of the two shots is the unit's coverage (alpha) whatever the ground, and plates
    // painted above the text cancel out. ink = coverage >= inkThreshold / 255.
    for (const unit of units) {
      const pad = Math.ceil(Math.max(4, unit.fontSize * 0.25));
      const region = clampRegion({ x0: Math.min(unit.rect.x0, unit.layout.x0), y0: Math.min(unit.rect.y0, unit.layout.y0), x1: Math.max(unit.rect.x1, unit.layout.x1), y1: Math.max(unit.rect.y1, unit.layout.y1) }, W, H, pad);
      if (!region) { unit.ink = null; continue; }
      const shots = [];
      for (const tone of [0, 1]) {
        await setState({ textOff: "all", collageOff: "all", key: { unit: unit.index, tone } });
        shots.push(await shot(region));
      }
      const local = { ...region, x: 0, y: 0 };
      const ink = diffMask(shots[0], shots[1], local, rules.inkThreshold);
      ink.region = region;
      unit.ink = ink.count ? ink : null;
      unit.inkBox = ink.count >= 4 ? maskBox(ink) : null;
      // the same unit with every other element hidden: the ink it would have if nothing covered it
      const alone = [];
      for (const tone of [0, 1]) {
        await setState({ textOff: "all", collageOff: "all", key: { unit: unit.index, tone }, isolate: true });
        alone.push(await shot(region));
      }
      const expected = diffMask(alone[0], alone[1], local, rules.inkThreshold);
      expected.region = region;
      unit.expected = expected;
      // the ground for this unit's contrast: the page with only this unit hidden (other text stays,
      // so small text over a giant glyph is measured against that glyph)
      await setState({ textOff: [unit.index], collageOff: [] });
      unit.ground = await shot(region);
      unit.groundRegion = region;
    }
    // visible pixels of each collage layer
    for (const layer of collage) {
      const region = clampRegion(layer.rect, W, H, 24);
      if (!region) { layer.mask = null; continue; }
      await setState({ textOff: [], collageOff: [layer.index] });
      layer.mask = diffMask(await shot(region), full, region, rules.inkThreshold);
      layer.visibleBox = layer.mask.count ? maskBox(layer.mask) : null;
    }
    await setState({ textOff: [], collageOff: [] });
    // hue budget: the page as drawn, minus decoration marked data-deco / data-decor (colour control strips, ghost numerals)
    let hue = null;
    if (Object.keys(found.hueRoles || {}).length) {
      await page.evaluate(() => document.documentElement.setAttribute("data-tc-hue", ""));
      const hueShot = await shot();
      await page.evaluate(() => document.documentElement.removeAttribute("data-tc-hue"));
      hue = hueBudget(hueShot, found.hueRoles, rules);
    }

    // a page that navigated away or lost its document is not the file asked for: the check broke
    const startUrl = pathToFileURL(absolute).href;
    if (page.url() !== startUrl) throw new Error(`the page navigated away from ${path.basename(absolute)} to ${page.url()} during the check`);
    const findings = [];
    const measured = [];
    const notes = [...receiptNotes];
    // a ground declared on the page without a matching receipt is taken at its word, and said so
    for (const image of found.images.filter((i) => i.role === "ground" && !linked.some((l) => l.image === i && l.output.layer === "ground"))) {
      notes.push(`self-declared ground: ${image.slot || (image.src ? image.src.split("/").pop() : "embedded image")} is exempt from collage-cover by its data-layer="ground" alone (no matching composite receipt); make sure it is the scene behind the text, not a cut-out`);
    }
    for (const message of [...new Set(pageErrors)]) {
      findings.push({
        rule: "page-error", slot: "page", measuredBy: "browser", measured: { message: message.slice(0, 300) }, limit: { errors: 0 },
        message: `the page reported an error: ${message.slice(0, 200)}`,
        fix: "Fix the script error (open the file in a browser and read the console); what was measured may not be what the page should show.",
      });
    }
    // no text measured: only a page that declares itself text-free (data-no-text on its root) may pass
    if (!units.length && !found.noText) {
      findings.push({
        rule: "no-text-measured", slot: "page", measuredBy: "browser", measured: { textUnits: 0 }, limit: { textUnits: 1 },
        message: "no visible text was found on the page, so overlap, contrast and coverage measured nothing",
        fix: "Check that the text renders (fonts, scripts, visibility, the right file); if the page is meant to have no text, add data-no-text to its root element (<html> or <svg>).",
      });
    }
    const prefix = (group) => String(group).split("/")[0];
    // 0. missing resources: a failed image or font request changes what is measured
    for (const url of [...new Set(failed)]) {
      findings.push({
        rule: "asset-missing", slot: url.split("/").pop(), measuredBy: "browser", measured: { url }, limit: { failedRequests: 0 },
        message: `the page could not load ${url}`,
        fix: `Restore ${url.split("/").pop()} or fix its path (relative to the page), then check again; text, collage and contrast were measured without it.`,
      });
    }
    // 0b. text hidden by a layer that is not collage (a plate, a panel, another element above it)
    for (const unit of units.filter((u) => !u.deco && u.expected && u.expected.count >= rules.occludedMinPx)) {
      let kept = 0; let probe = null;
      const e = unit.expected;
      for (let y = 0; y < e.region.h; y += 1) for (let x = 0; x < e.region.w; x += 1) {
        if (!e.mask[y * e.region.w + x]) continue;
        if (unit.ink && at(unit.ink, x + e.region.x, y + e.region.y)) kept += 1; else if (!probe) probe = [x + e.region.x, y + e.region.y];
      }
      const lost = 1 - kept / e.count;
      if (lost > rules.occludedMaxShare && e.count - kept >= rules.occludedMinPx) {
        const above = probe ? await page.evaluate(([px, py], self) => {
          const own = document.querySelector(`[data-tc-unit="${self}"]`);
          const hit = document.elementsFromPoint(px + 0.5, py + 0.5).find((el) => el !== own && !own.contains(el) && !el.contains(own));
          if (!hit) return null;
          return hit.getAttribute("data-chk") || hit.getAttribute("data-slot") || (hit.id ? `#${hit.id}` : `${hit.localName}${hit.classList.length ? `.${[...hit.classList].join(".")}` : ""}`);
        }, probe, unit.index) : null;
        findings.push({
          rule: "text-occluded", slot: unit.id, measuredBy: "browser",
          measured: { visibleInkShare: Math.round((kept / e.count) * 1000) / 1000, expectedInkPx: e.count, visibleInkPx: kept, coveredBy: above || "an element painted above it" },
          limit: { maxHiddenShare: rules.occludedMaxShare },
          message: `${Math.round(lost * 100)}% of ${unit.id}'s glyphs are hidden by ${above || "an element painted above it"}`,
          fix: `Bring ${unit.id} above ${above || "the covering element"} in paint order (later in the document or a higher z-index), or move one of them apart; if the cover is intended, mark the text data-deco.`,
        });
      }
    }
    // 1. text overlap by ink
    const live = units.filter((u) => !u.deco && u.ink);
    for (let i = 0; i < live.length; i += 1) for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i]; const b = live[j];
      if (a.group === b.group || prefix(a.group) === prefix(b.group)) continue;
      const gap = Math.max(rules.overlapMinGapPx, Math.round(rules.overlapGapEm * Math.min(a.fontSize, b.fontSize)));
      if (!intersects(a.inkBox, b.inkBox, gap)) continue;
      const [small, large] = a.ink.count <= b.ink.count ? [a, b] : [b, a];
      const px = within(dilate(large.ink, gap), small.ink);
      if (px >= Math.max(rules.overlapMinPx, rules.overlapMinShare * small.ink.count)) {
        const move = separation(large.inkBox, small.inkBox, gap);
        findings.push({
          rule: "text-overlap", slot: small.id, with: large.id, measuredBy: "browser",
          measured: { touchingInkPx: px, inkBox: box4(small.inkBox), otherInkBox: box4(large.inkBox), gapPx: gap },
          limit: { touchingInkPx: Math.ceil(Math.max(rules.overlapMinPx, rules.overlapMinShare * small.ink.count)) },
          message: `${small.id} ink touches ${large.id} ink (${px}px within ${gap}px)`,
          fix: `Move ${small.id} ${move.dir} by ${Math.ceil(move.px)}px (ink box ${box4(small.inkBox).join(",")} against ${box4(large.inkBox).join(",")}), or put a solid plate under it, or give both the same data-grp if they are one lock-up.`,
        });
      }
    }
    // 2. off-canvas
    for (const unit of units.filter((u) => !u.deco && !u.bleed)) {
      const t = rules.edgeTolerancePx;
      const out = { left: -unit.layout.x0, top: -unit.layout.y0, right: unit.layout.x1 - W, bottom: unit.layout.y1 - H };
      const worst = Object.entries(out).filter(([, v]) => v > t).sort((p, q) => q[1] - p[1]);
      if (!worst.length) continue;
      const [side, px] = worst[0];
      const along = side === "left" || side === "right" ? unit.layout.x1 - unit.layout.x0 : unit.layout.y1 - unit.layout.y0;
      const chars = [...unit.text.replace(/\s+/g, "")].length || 1;
      const keep = Math.max(0, Math.floor(chars * (along - px) / Math.max(along, 1)));
      findings.push({
        rule: "off-canvas", slot: unit.id, measuredBy: "browser",
        measured: { box: box4(unit.layout), outsidePx: Object.fromEntries(worst.map(([k, v]) => [k, r1(v)])) }, limit: { canvas: [W, H], tolerancePx: t },
        message: `${unit.id} runs ${r1(px)}px past the ${side} edge of the ${W}x${H} canvas`,
        fix: `Move ${unit.id} ${({ left: "right", right: "left", top: "down", bottom: "up" })[side]} by ${Math.ceil(px)}px, or cut it to about ${keep} characters / split it into another line or column; if the crop is intended, mark it data-bleed.`,
      });
    }
    // 3. collage on the copy: a layer's painted pixels (alpha, not its frame) inside the text's ink
    //    zone (glyphs grown by 0.1 em), above the text or under it as its ground
    for (const unit of units.filter((u) => !u.deco && u.ink)) {
      const near = collage.filter((l) => l.mask && l.visibleBox && intersects(l.visibleBox, unit.inkBox, unit.fontSize * rules.coverZoneEm));
      if (!near.length) continue;
      const zone = dilate(unit.ink, Math.max(2, Math.round(unit.fontSize * rules.coverZoneEm)));
      for (const layer of near) {
        const px = within(zone, layer.mask);
        const share = px / zone.count;
        if (px >= rules.coverMinPx && share > rules.coverMinShare) {
          const move = separation(unit.inkBox, layer.visibleBox, 8);
          findings.push({
            rule: "collage-cover", slot: unit.id, layer: layer.id, measuredBy: "browser",
            measured: { paintedPx: px, zoneShare: Math.round(share * 1000) / 1000, inkBox: box4(unit.inkBox), layerVisibleBox: box4(layer.visibleBox) },
            limit: { maxShare: rules.coverMinShare },
            message: `${layer.id} paints ${Math.round(share * 1000) / 10}% of the ink zone of ${unit.id} (its glyphs and ${Math.round(rules.coverZoneEm * 100) / 100} em around them)`,
            fix: `Move ${layer.id} ${move.dir} by ${Math.ceil(move.px)}px (its painted pixels ${box4(layer.visibleBox).join(",")} against the text ink ${box4(unit.inkBox).join(",")}), or shrink it; collage never covers copy or serves as its ground.`,
          });
        }
      }
    }
    // 4. contrast against the ground with text hidden, 10th percentile inside the ink box
    for (const unit of units) {
      const row = { slot: unit.id, text: unit.text, sizePx: r1(unit.fontSize), inkBox: unit.inkBox ? box4(unit.inkBox) : null, layoutBox: box4(unit.layout) };
      measured.push(row);
      if (unit.deco) continue;
      // every colour the unit's text runs paint (mixed-colour spans: the worst wins); lettering has no runs
      // a run with a transparent fill and a painted outline is measured by its outline colour
      const colours = [...new Set((unit.runs.length && !unit.lettering ? unit.runs.map((r) => (!parseCss(r.color) && r.outline ? r.outline : r.color)) : [unit.color]))];
      const paints = colours.map((c) => ({ css: c, paint: parseCss(c) })).filter((c) => c.paint);
      if (!paints.length) { notes.push(`${unit.id}: text colour ${colours.join(", ")} is not a colour; contrast not measured`); continue; }
      const base = unit.inkBox || unit.layout;
      if (!unit.inkBox) notes.push(`${unit.id}: no ink found (text matches its ground or is clipped); contrast measured over its layout box`);
      const dx = (base.x1 - base.x0) * rules.contrastShrink; const dy = (base.y1 - base.y0) * rules.contrastShrink;
      const region = clampRegion({ x0: base.x0 + dx, y0: base.y0 + dy, x1: base.x1 - dx, y1: base.y1 - dy }, W, H);
      if (!region || region.w < 2 || region.h < 2 || !unit.ground) continue;
      const ground = unit.ground; const gr = unit.groundRegion;
      const lums = new Float64Array(region.w * region.h);
      let worstPaint = null;
      let k = 0;
      for (const { paint } of paints) {
        const fg = paint.slice(0, 3);
        const alpha = Math.min(1, paint[3] * (unit.opacity ?? 1));
        const values = new Float64Array(region.w * region.h);
        k = 0;
        for (let y = region.y; y < region.y + region.h; y += 1) for (let x = region.x; x < region.x + region.w; x += 1) {
          if (x < gr.x || y < gr.y || x >= gr.x + gr.w || y >= gr.y + gr.h) continue;
          const p = ((y - gr.y) * ground.width + (x - gr.x)) * 4;
          const under = [ground.data[p], ground.data[p + 1], ground.data[p + 2]];
          const L = luminance(under);
          // a translucent text colour (rgba, opacity) is composited over the ground it sits on
          const seen = alpha >= 0.999 ? fg : fg.map((v, i) => alpha * v + (1 - alpha) * under[i]);
          values[k] = ratio(luminance(seen), L); lums[k] = L; k += 1;
        }
        if (!k) break;
        const v = percentile(values.subarray(0, k), rules.contrastPercentile);
        if (!worstPaint || v < worstPaint.value) worstPaint = { value: v, fg, alpha };
      }
      if (!k || !worstPaint) continue;
      const { value, fg, alpha } = worstPaint;
      if (paints.length > 1) row.colours = paints.map((c) => c.css);
      // the ground's dark and light ends (10th and 90th percentile luminance) for the colour advice
      const darkL = percentile(lums.subarray(0, k), rules.contrastPercentile); const lightL = percentile(lums.subarray(0, k), 100 - rules.contrastPercentile);
      const greyOf = (L) => { const c = L <= 0.0031308 ? L * 12.92 : 1.055 * L ** (1 / 2.4) - 0.055; return hex([c * 255, c * 255, c * 255]); };
      const large = unit.fontSize >= rules.largePx || (unit.fontSize >= rules.largeBoldPx && unit.fontWeight >= 700);
      const need = large ? rules.contrastLarge : rules.contrastNormal;
      row.contrast = Math.round(value * 100) / 100;
      row.limit = need;
      if (value + 1e-9 < need) {
        const white = ratio(1, lightL);
        const black = ratio(0, darkL);
        const pick = white >= black ? { name: "white #FFFFFF", value: white } : { name: "black #000000", value: black };
        const bigger = !large && value >= rules.contrastLarge ? `, or set it at ${rules.largePx}px or more (the large-text limit is ${rules.contrastLarge}:1)` : "";
        const range = `${greyOf(darkL)}-${greyOf(lightL)} in luminance`;
        findings.push({
          rule: "contrast", slot: unit.id, measuredBy: "browser",
          measured: { ratio: Math.round(value * 100) / 100, percentile: rules.contrastPercentile, text: hex(fg), ...(alpha < 0.999 ? { alpha: Math.round(alpha * 100) / 100 } : {}), groundLuminance: [Math.round(darkL * 1000) / 1000, Math.round(lightL * 1000) / 1000], box: box4(base) },
          limit: { min: need, large },
          message: `${unit.id} contrast ${Math.round(value * 100) / 100}:1 (${rules.contrastPercentile}th percentile of the ground under it) is below ${need}:1`,
          fix: pick.value >= need
            ? `Change the text colour of ${unit.id} from ${hex(fg)} to ${pick.name} (${Math.round(pick.value * 100) / 100}:1 against the ground under it, ${range})${bigger}, or put a solid plate under it.`
            : `Put a solid plate under ${unit.id} or move it to a flat part of the ground: the ground under it spans ${range}, so no text colour reaches ${need}:1 (best ${pick.name}, ${Math.round(pick.value * 100) / 100}:1).`,
        });
      }
    }
    // 4b. composited layers: the receipt's measurements, and the character's face and hands against
    //     the measured text ink of this page
    const seenReceipts = new Set();
    for (const link of linked) {
      const key = `${link.receiptFile}#${link.output.size}`;
      const sizeRecord = link.receipt.sizes?.[link.output.size];
      if (!sizeRecord) continue;
      if (!seenReceipts.has(key)) {
        seenReceipts.add(key);
        for (const f of sizeRecord.findings || []) {
          if (f.code === "safe-area-type") continue; // declared type boxes: replaced by the measured ink below
          // warn bands (black point, colour difference, halo) are notes; errors (upscale, occluder on a safe area) fail
          if (f.severity === "error") findings.push({ rule: f.code, slot: link.image.slot || path.basename(link.receiptFile, ".json"), layer: path.basename(link.file), measuredBy: "composite-receipt", measured: f.measured || {}, limit: link.receipt.limits || {}, message: f.message, fix: f.fix });
          else notes.push(`${f.code} (composite ${link.output.size}, warn band): ${f.message}. Fix: ${f.fix}`);
        }
      }
      if (link.output.layer !== "char") continue;
      const [OW, OH] = String(link.output.size).split("x").map(Number);
      const sx = (link.image.rect.x1 - link.image.rect.x0) / OW, sy = (link.image.rect.y1 - link.image.rect.y0) / OH;
      const toPage = (b) => ({ x0: link.image.rect.x0 + b[0] * sx, y0: link.image.rect.y0 + b[1] * sy, x1: link.image.rect.x0 + b[2] * sx, y1: link.image.rect.y0 + b[3] * sy });
      const parts = [...(sizeRecord.boxes?.face ? [["face", sizeRecord.boxes.face]] : []), ...(sizeRecord.boxes?.hands || []).map((b, i) => [`hand ${i + 1}`, b])];
      for (const [part, box] of parts) {
        const pb = toPage(box);
        for (const unit of units.filter((u) => !u.deco && u.inkBox && intersects(u.inkBox, pb))) {
          let px = 0;
          for (let y = Math.max(Math.floor(pb.y0), unit.ink.region.y); y < Math.min(Math.ceil(pb.y1), unit.ink.region.y + unit.ink.region.h); y += 1) for (let x = Math.max(Math.floor(pb.x0), unit.ink.region.x); x < Math.min(Math.ceil(pb.x1), unit.ink.region.x + unit.ink.region.w); x += 1) if (at(unit.ink, x, y)) px += 1;
          if (px < rules.coverMinPx) continue;
          const move = separation(pb, unit.inkBox, 8);
          findings.push({
            rule: "safe-area-type", slot: unit.id, layer: path.basename(link.file), measuredBy: "browser",
            measured: { part, inkPxOnPart: px, partBox: box4(pb), inkBox: box4(unit.inkBox) }, limit: { inkPxOnPart: rules.coverMinPx },
            message: `${unit.id} sets ${px} px of ink over the character's ${part} (${box4(pb).join(",")})`,
            fix: `Move ${unit.id} ${move.dir} by ${Math.ceil(move.px)}px, or move the figure in the layer contract (sizes.${link.output.size}.char.foot / height) and composite again; titles and UI never cover the face or hands.`,
          });
        }
      }
    }
    // 5. glyph coverage: a run whose first family lacks characters falls back glyph by glyph
    const faces = [];
    for (const face of found.faces) {
      if (!face.url.startsWith("file:")) continue;
      try { const local = fileURLToPath(face.url); if (fs.existsSync(local)) faces.push({ family: face.family, weight: face.weight, file: local }); } catch { /* not a local file */ }
    }
    for (const face of extraFaces) faces.push(face);
    // @font-face cannot pick a face inside a collection: Chrome takes the first (for Noto CJK that is JP)
    for (const face of found.faces.filter((f) => /\.ttc(\?|#|$)/i.test(f.url))) {
      findings.push({
        rule: "font-collection", slot: face.family, measuredBy: "browser", measured: { family: face.family, url: face.url }, limit: { collections: 0 },
        message: `@font-face for ${face.family} loads a font collection (${face.url.split("/").pop()}); the browser uses its first face, which may be another region's glyph forms`,
        fix: `Use src: local('${face.family}') for an installed collection, or point the rule at a single-face file (.otf, .ttf, .woff) of ${face.family}.`,
      });
    }
    const checkedRuns = new Set();
    for (const unit of units) {
      for (const run of unit.runs) {
        const stack = run.family.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        if (!stack.length) continue;
        const primary = stack[0];
        const result = coverage.missingGlyphs(primary, run.text, { weight: run.weight, faces });
        const key = `${unit.id}|${primary}|${run.text}`;
        if (checkedRuns.has(key)) continue;
        checkedRuns.add(key);
        if (!result.known) { notes.push(`${unit.id}: coverage of ${primary} unknown (no font file or catalog entry); glyph coverage not checked`); continue; }
        if (!result.missing) continue;
        const choice = coverage.chooseFamily(stack.slice(1), run.text, { weight: run.weight, faces });
        findings.push({
          rule: "glyph-coverage", slot: unit.id, measuredBy: "browser",
          measured: { family: primary, missing: result.missing, text: run.text.slice(0, 40) }, limit: { missing: "" },
          message: `${primary} lacks ${result.missing} in ${unit.id}; the browser would set those characters in another font inside one string`,
          fix: choice.family
            ? `Set the whole string ${JSON.stringify(run.text.slice(0, 20))} in ${choice.family} (the first font in its stack that covers every character), not glyph by glyph; or rewrite it without ${result.missing}.`
            : `Pick one font that covers every character of ${JSON.stringify(run.text.slice(0, 20))} (font roles or the font catalog) and set the whole string in it; no font in the stack is known to cover ${result.missing}.`,
        });
      }
    }
    // 6. hue budget (opt-in): the counter colour, the status colours and any undeclared saturated hue
    //    against their share of the canvas; the brand colour is reported and never limited
    if (hue) {
      const pct = (v) => `${Math.round(v * 1000) / 10}%`;
      for (const reason of hue.unmeasured) notes.push(`hue-budget: ${reason}`);
      notes.push(`hue-budget: brand ${pct(hue.share.brand)}, counter ${pct(hue.share.counter)}, status ${pct(hue.share.status)} of the canvas`);
      const declare = "data-hue-brand, data-hue-counter, data-hue-alert and data-hue-timed on the root element";
      if (hue.share.counter > rules.hueCounterMax) {
        findings.push({
          rule: "hue-budget", slot: "counter", measuredBy: "browser",
          measured: { share: Math.round(hue.share.counter * 10000) / 10000 }, limit: { maxShare: rules.hueCounterMax },
          message: `the counter colour paints ${pct(hue.share.counter)} of the canvas (limit ${pct(rules.hueCounterMax)})`,
          fix: "Keep the counter colour to index numerals, emphasis words and hairlines: remove it from panels, fields and large shapes, or mark decoration data-deco.",
        });
      }
      if (hue.share.status > rules.hueStatusMax) {
        findings.push({
          rule: "hue-budget", slot: "status", measuredBy: "browser",
          measured: { share: Math.round(hue.share.status * 10000) / 10000 }, limit: { maxShare: rules.hueStatusMax },
          message: `the alert and timed colours paint ${pct(hue.share.status)} of the canvas together (limit ${pct(rules.hueStatusMax)})`,
          fix: "Use alert and timed colours only as small tags on the item whose state they report; remove them from fills, bars and decoration.",
        });
      }
      for (const other of hue.others.filter((o) => o.share >= rules.hueOtherMax)) {
        findings.push({
          rule: "hue-budget", slot: `hue ${other.hue}`, measuredBy: "browser",
          measured: { hueDeg: other.hue, color: other.color, share: Math.round(other.share * 10000) / 10000 }, limit: { maxShare: rules.hueOtherMax },
          message: `a saturated hue near ${other.color} (${other.hue} degrees) paints ${pct(other.share)} of the canvas and matches no declared role`,
          fix: `Desaturate it, shrink it to a tiny dot or a colour control strip marked data-deco, or declare it as the brand, counter, alert or timed colour if it is one (${declare}).`,
        });
      }
    }
    return {
      status: findings.length ? "failed" : "passed",
      canvas: [W, H], measuredBy: "browser",
      summary: { textUnits: units.length, collageLayers: collage.length, findings: findings.length },
      ...(hue ? { hue: { share: hue.share, declared: hue.declared, others: hue.others.filter((o) => o.share >= rules.hueOtherMax / 10) } } : {}),
      findings, notes: [...new Set(notes)], measured,
      collage: collage.map((l) => ({ id: l.id, frame: box4(l.rect), visibleBox: l.visibleBox ? box4(l.visibleBox) : null })),
      grounds: found.images.filter((i) => i.role === "ground" || (i.collage !== null && grounds.has(i.collage))).map((i) => ({ slot: i.slot, src: i.src ? i.src.split("/").pop() : "embedded", frame: box4(i.rect) })),
      composites: [...seenReceipts],
      errors,
      rules,
    };
  } finally {
    for (const page of pages) await page.close().catch(() => {});
    if (!shared) await browser.close();
  }
}

module.exports = { PAGE_RULES, checkPage, hueBudget, launch };

if (require.main === module) {
  // kernel: page-check.cjs <file> [--size WxH] [--chrome exe] [--puppeteer-module dir]
  const argv = process.argv.slice(2);
  const options = { file: argv[0] };
  for (let i = 1; i < argv.length; i += 2) {
    const name = argv[i]; const value = argv[i + 1];
    if (name === "--size") options.size = value.split("x").map(Number);
    else if (name === "--chrome") options.chrome = value;
    else if (name === "--puppeteer-module") options.puppeteerModule = value;
    else { process.stderr.write(`unknown option ${name}\n`); process.exit(1); }
  }
  // stderr starts with TOOL_MISSING when no browser stack is found, CHECK_FAILED when the check broke
  (async () => {
    let browser;
    try { browser = await launch(options); } catch (error) { process.stderr.write(`TOOL_MISSING: ${error.message}\n`); process.exitCode = 1; return; }
    try {
      const report = await checkPage({ ...options, browser });
      process.stdout.write(`${JSON.stringify({ ok: true, ...report })}\n`);
    } catch (error) {
      process.stderr.write(`CHECK_FAILED: ${error.message}\n`); process.exitCode = 1;
    } finally {
      await browser.close().catch(() => {});
    }
  })();
}
