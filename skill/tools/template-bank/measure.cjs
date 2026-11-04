"use strict";

// Measures a rendered template-bank SVG: slot extents, ground colour under each text slot,
// contrast, accent area, figure and safe zones, and shared alignment lines. It reads only the
// rendered file (geometry, fills and the embedded check rules), so `template check` audits what
// was actually written, not what the generator intended.
//
// Text set in <text> is measured with the advance model below (the fonts are named, not bundled):
// full-width CJK, kana, Hangul and symbols take 1 em; Latin takes per-class widths at or above the
// bold widths of Source Han Sans / Noto Sans CJK, so the model errs towards overflow, not under.
// Lettering (<path> glyphs) is measured exactly from its path coordinates.

const ASCENT = 0.88;
const DESCENT = 0.12;
const TEXT_INK_FACTOR = 0.45; // share of a text extent covered by ink, for the accent budget

const NARROW = new Set([..."il.,:;!'|`ıj"]);
const SEMI = new Set([..."ftrIJ()[]{}-\"/\\ "]);
const WIDE_UPPER = new Set([..."MWQOGD@%&"]);
const WIDE_LOWER = new Set([..."mw"]);

function isFullWidth(code) {
  return (code >= 0x1100 && code <= 0x11ff) || (code >= 0x2e80 && code <= 0x9fff) || (code >= 0xa960 && code <= 0xa97f)
    || (code >= 0xac00 && code <= 0xd7ff) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe30 && code <= 0xfe4f)
    || (code >= 0xff00 && code <= 0xff60) || (code >= 0xffe0 && code <= 0xffe6) || code >= 0x20000;
}

function isCjk(ch) { return isFullWidth(ch.codePointAt(0)); }

function advanceEm(ch) {
  const code = ch.codePointAt(0);
  if (isFullWidth(code) || code > 0x2000) return 1; // CJK, full-width forms, arrows, dingbats, ©-like symbols beyond Latin-1
  if (code === 0x20) return 0.25;
  if (NARROW.has(ch)) return 0.3;
  if (SEMI.has(ch)) return 0.4;
  if (/[A-Z]/.test(ch)) return WIDE_UPPER.has(ch) ? 0.82 : 0.68;
  if (/[a-z]/.test(ch)) return WIDE_LOWER.has(ch) ? 0.86 : 0.57;
  if (/[0-9]/.test(ch)) return 0.6;
  if (WIDE_UPPER.has(ch)) return 0.9;
  if (code < 0x80) return 0.6;
  return 1; // other Latin-1 symbols (©, ·, ×): counted full-width
}

function textWidth(text, size, letterSpacing = 0) {
  const chars = [...String(text)];
  if (!chars.length) return 0;
  return chars.reduce((sum, ch) => sum + advanceEm(ch) * size, 0) + letterSpacing * (chars.length - 1);
}

// Greedy wrap by measured width: CJK breaks between any characters, Latin at spaces.
function wrapText(text, size, maxWidth, letterSpacing = 0) {
  const tokens = String(text).match(/[ᄀ-ᇿ⺀-鿿가-퟿豈-﫿︰-﹏＀-￦]|[^\sᄀ-ᇿ⺀-鿿가-퟿豈-﫿︰-﹏＀-￦]+|\s+/gu) || [];
  const lines = [];
  let line = "";
  for (const token of tokens) {
    const candidate = line + token;
    if (line && textWidth(candidate.trimEnd(), size, letterSpacing) > maxWidth && token.trim()) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = candidate;
    }
  }
  if (line.trim() || !lines.length) lines.push(line.trimEnd());
  return lines;
}

// ---- minimal XML parser (well-formed SVG subset written by the renderer or an editor) --------
function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "lt") return "<";
    if (lower === "gt") return ">";
    if (lower === "quot") return "\"";
    if (lower === "apos") return "'";
    return String.fromCodePoint(lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10));
  });
}

function parseXml(source) {
  const root = { name: "#root", attrs: {}, children: [], parent: null, text: "" };
  let current = root;
  const pattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let match;
  while ((match = pattern.exec(source))) {
    if (match[1] !== undefined) { current.text += match[1]; continue; }
    if (match[2]) {
      if (current.name !== match[2]) throw new Error(`malformed SVG: </${match[2]}> closes <${current.name}>`);
      current = current.parent;
      continue;
    }
    if (match[3]) {
      const attrs = {};
      for (const attr of match[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[attr[1]] = decode(attr[2] ?? attr[3]);
      const node = { name: match[3], attrs, children: [], parent: current, text: "" };
      current.children.push(node);
      if (!match[5]) current = node;
      continue;
    }
    if (match[6] !== undefined) {
      current.children.push({ name: "#text", text: decode(match[6]), parent: current, attrs: {}, children: [] });
      current.text += decode(match[6]);
    }
  }
  if (current !== root) throw new Error(`malformed SVG: <${current.name}> is not closed`);
  return root;
}

function* walk(node) {
  for (const child of node.children) {
    if (child.name === "#text") continue;
    yield child;
    yield* walk(child);
  }
}

function textContent(node) {
  if (node.name === "#text") return node.text;
  return node.children.map(textContent).join("");
}

// ---- transforms and geometry ---------------------------------------------------------------
const IDENTITY = [1, 0, 0, 1, 0, 0];
function multiply(m, n) {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
function parseTransform(value) {
  let m = IDENTITY;
  if (!value) return m;
  for (const [, op, args] of value.matchAll(/(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g)) {
    const a = args.split(/[\s,]+/).filter(Boolean).map(Number);
    let n = IDENTITY;
    if (op === "matrix") n = a;
    if (op === "translate") n = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    if (op === "scale") n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    if (op === "rotate") {
      const r = ((a[0] || 0) * Math.PI) / 180;
      const rot = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      n = a.length >= 3 ? multiply(multiply([1, 0, 0, 1, a[1], a[2]], rot), [1, 0, 0, 1, -a[1], -a[2]]) : rot;
    }
    m = multiply(m, n);
  }
  return m;
}
function ctm(node) {
  const chain = [];
  for (let current = node; current; current = current.parent) chain.unshift(current);
  return chain.reduce((m, item) => multiply(m, parseTransform(item.attrs?.transform)), IDENTITY);
}
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function pathSubpaths(d) {
  const subpaths = [];
  let current = null;
  for (const [, command, rest] of d.matchAll(/([MLZmlz])([^MLZmlz]*)/g)) {
    if (command === "Z" || command === "z") { current = null; continue; }
    const numbers = rest.split(/[\s,]+/).filter(Boolean).map(Number);
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      let point = [numbers[i], numbers[i + 1]];
      if (command === "m" || command === "l") {
        const last = current?.at(-1) || subpaths.at(-1)?.at(-1) || [0, 0];
        point = [last[0] + point[0], last[1] + point[1]];
      }
      if ((command === "M" || command === "m") && i === 0) { current = [point]; subpaths.push(current); } else if (current) current.push(point);
    }
  }
  return subpaths;
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    sum += x0 * y1 - x1 * y0;
  }
  return Math.abs(sum) / 2;
}

function clipToBox(points, [bx, by, bw, bh]) {
  const edges = [
    (p) => p[0] >= bx, (p) => p[0] <= bx + bw, (p) => p[1] >= by, (p) => p[1] <= by + bh,
  ];
  const cross = [
    (a, b) => { const t = (bx - a[0]) / (b[0] - a[0]); return [bx, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (bx + bw - a[0]) / (b[0] - a[0]); return [bx + bw, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (by - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), by]; },
    (a, b) => { const t = (by + bh - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), by + bh]; },
  ];
  let output = points;
  for (let e = 0; e < 4 && output.length; e += 1) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i += 1) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      const inCurrent = edges[e](current);
      const inPrevious = edges[e](previous);
      if (inCurrent) {
        if (!inPrevious) output.push(cross[e](previous, current));
        output.push(current);
      } else if (inPrevious) {
        output.push(cross[e](previous, current));
      }
    }
  }
  return output;
}

function insidePolygon([x, y], points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bounds(points) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1 - x0, y1 - y0];
}

const round = (value, digits = 1) => Number(value.toFixed(digits));
const roundBox = (box) => box.map((value) => round(value));

// ---- colour --------------------------------------------------------------------------------
function parseColor(value) {
  if (!value) return null;
  const text = value.trim().toLowerCase();
  if (text === "white") return [255, 255, 255];
  if (text === "black") return [0, 0, 0];
  let m = text.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = text.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = text.match(/^rgba?\(([^)]+)\)$/);
  if (m) return m[1].split(/[\s,/]+/).slice(0, 3).map(Number);
  return null;
}
const hex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const mix = (under, over, alpha) => under.map((v, i) => v * (1 - alpha) + over[i] * alpha);

// ---- reading the render ----------------------------------------------------------------------
function attr(node, name) {
  for (let current = node; current && current.attrs; current = current.parent) {
    if (current.attrs[name] !== undefined) return current.attrs[name];
  }
  return undefined;
}
function opacityOf(node) {
  let value = Number(node.attrs["fill-opacity"] ?? 1);
  for (let current = node; current && current.attrs; current = current.parent) value *= Number(current.attrs.opacity ?? 1);
  return value;
}
function hidden(node) {
  for (let current = node; current && current.attrs; current = current.parent) {
    if (current.attrs.display === "none" || current.attrs.id === "guides" || current.name === "defs" || current.name === "metadata" || current.name === "pattern") return true;
  }
  return false;
}
function slotAncestor(node) {
  for (let current = node; current && current.attrs; current = current.parent) if (current.attrs["data-slot"]) return current;
  return null;
}
const numberList = (value) => String(value).split(/[\s,]+/).filter(Boolean).map(Number);

function gradients(tree) {
  const map = new Map();
  for (const node of walk(tree)) {
    if (node.name !== "linearGradient") continue;
    const stops = node.children.filter((child) => child.name === "stop").map((stop) => ({
      offset: Number(String(stop.attrs.offset ?? 0).replace("%", "")) / (String(stop.attrs.offset).includes("%") ? 100 : 1),
      color: parseColor(stop.attrs["stop-color"] || "#000"),
      opacity: Number(stop.attrs["stop-opacity"] ?? 1),
    }));
    map.set(node.attrs.id, { x1: Number(node.attrs.x1 ?? 0), y1: Number(node.attrs.y1 ?? 0), x2: Number(node.attrs.x2 ?? 1), y2: Number(node.attrs.y2 ?? 0), stops });
  }
  return map;
}
function gradientAt(gradient, box, [x, y]) {
  const u = box[2] ? (x - box[0]) / box[2] : 0;
  const v = box[3] ? (y - box[1]) / box[3] : 0;
  const dx = gradient.x2 - gradient.x1;
  const dy = gradient.y2 - gradient.y1;
  const t = Math.max(0, Math.min(1, ((u - gradient.x1) * dx + (v - gradient.y1) * dy) / ((dx * dx + dy * dy) || 1)));
  const stops = gradient.stops;
  if (!stops.length) return null;
  if (t <= stops[0].offset) return { color: stops[0].color, opacity: stops[0].opacity };
  for (let i = 1; i < stops.length; i += 1) {
    if (t <= stops[i].offset) {
      const a = stops[i - 1];
      const b = stops[i];
      const k = (t - a.offset) / ((b.offset - a.offset) || 1);
      return { color: mix(a.color, b.color, k), opacity: a.opacity + (b.opacity - a.opacity) * k };
    }
  }
  return { color: stops.at(-1).color, opacity: stops.at(-1).opacity };
}

// Every painted area in document order, as global polygons with a fill.
function paints(tree) {
  const out = [];
  let order = 0;
  for (const node of walk(tree)) {
    order += 1;
    node.order = order;
    if (hidden(node)) continue;
    const slot = slotAncestor(node);
    if (node.name === "g" && node.attrs["data-kind"] === "image") {
      const box = numberList(node.attrs["data-box"]);
      const m = ctm(node);
      const rings = [[[box[0], box[1]], [box[0] + box[2], box[1]], [box[0] + box[2], box[1] + box[3]], [box[0], box[1] + box[3]]].map((p) => apply(m, p))];
      out.push({ node, order, slot: node.attrs["data-slot"], rings, rule: "nonzero", fill: node.attrs["data-ground"] || null, opacity: 1, image: true });
      continue;
    }
    if (slot && slot.attrs["data-kind"] === "image") continue; // placeholder hatch and label stand for the ground colour above
    let rings = null;
    let rule = "nonzero";
    const a = node.attrs;
    if (node.name === "rect") {
      const x = Number(a.x || 0); const y = Number(a.y || 0);
      const w = String(a.width).endsWith("%") ? Number.NaN : Number(a.width); const h = String(a.height).endsWith("%") ? Number.NaN : Number(a.height);
      if (!Number.isFinite(w) || !Number.isFinite(h)) continue;
      rings = [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
    } else if (node.name === "polygon") {
      const values = numberList(a.points);
      const ring = [];
      for (let i = 0; i + 1 < values.length; i += 2) ring.push([values[i], values[i + 1]]);
      rings = [ring];
    } else if (node.name === "path") {
      rings = pathSubpaths(a.d || "");
      rule = a["fill-rule"] || attr(node, "fill-rule") || "nonzero";
    } else if (node.name === "circle") {
      const cx = Number(a.cx || 0); const cy = Number(a.cy || 0); const r = Number(a.r || 0);
      rings = [Array.from({ length: 24 }, (_, i) => [cx + r * Math.cos((i / 24) * 2 * Math.PI), cy + r * Math.sin((i / 24) * 2 * Math.PI)])];
    }
    if (!rings) continue;
    const fill = node.name === "path" ? attr(node, "fill") : a.fill;
    if (!fill || fill === "none") continue;
    const m = ctm(node);
    const local = node.name === "rect" ? rings[0] : null;
    out.push({ node, order, slot: slot?.attrs["data-slot"] || null, rings: rings.map((ring) => ring.map((p) => apply(m, p))), localBox: local ? bounds(local) : null, rule, fill, opacity: opacityOf(node) });
  }
  return out;
}

function containsPoint(paint, point) {
  if (paint.rule === "evenodd" || paint.rings.length > 1) return paint.rings.filter((ring) => insidePolygon(point, ring)).length % 2 === 1;
  return insidePolygon(point, paint.rings[0]);
}

function paintArea(paint, canvasBox) {
  const areas = paint.rings.map((ring) => polygonArea(clipToBox(ring, canvasBox))).sort((x, y) => y - x);
  if (!areas.length) return 0;
  return paint.rule === "evenodd" ? Math.max(0, areas[0] - areas.slice(1).reduce((s, v) => s + v, 0)) : areas.reduce((s, v) => s + v, 0);
}

// Ground colour at a point: composite every paint below `order` that covers it, over white.
function groundAt(point, layers, grads, beforeOrder, skipSlot) {
  let color = [255, 255, 255];
  let assumed = null;
  for (const layer of layers) {
    if (layer.order >= beforeOrder) break;
    if (skipSlot && layer.slot === skipSlot) continue;
    if (!containsPoint(layer, point)) continue;
    const gradient = /^url\(#([^)]+)\)$/.exec(layer.fill || "");
    if (gradient) {
      const g = grads.get(gradient[1]);
      if (!g) continue;
      const sample = gradientAt(g, layer.localBox || bounds(layer.rings[0]), point);
      if (sample) color = mix(color, sample.color, sample.opacity * layer.opacity);
      continue;
    }
    const rgb = parseColor(layer.fill);
    if (!rgb) continue;
    color = mix(color, rgb, layer.opacity);
    if (layer.image) assumed = layer.slot;
  }
  return { color, assumed };
}

// ---- slots ----------------------------------------------------------------------------------
function letteringExtent(slotNode) {
  const points = [];
  for (const node of walk(slotNode)) {
    if (node.name !== "path") continue;
    const m = ctm(node);
    for (const ring of pathSubpaths(node.attrs.d || "")) for (const p of ring) points.push(apply(m, p));
  }
  return points.length ? bounds(points) : null;
}

function textLines(textNode) {
  const tspans = textNode.children.filter((child) => child.name === "tspan");
  if (!tspans.length) return [{ text: textContent(textNode), dy: 0 }];
  return tspans.map((tspan, index) => ({ text: textContent(tspan), dy: index === 0 ? 0 : Number(tspan.attrs.dy || 0) }));
}

function textExtent(textNode) {
  const a = textNode.attrs;
  const size = Number(a["font-size"] || 16);
  const spacing = Number(a["letter-spacing"] || 0);
  const x = Number(a.x || 0);
  const y = Number(a.y || 0);
  const anchor = a["text-anchor"] || "start";
  const vertical = /vertical/.test(a["writing-mode"] || "");
  const m = ctm(textNode);
  const lines = textLines(textNode);
  const measured = [];
  let offset = 0;
  for (const line of lines) {
    offset += line.dy;
    const length = vertical ? [...line.text].length * size + spacing * Math.max(0, [...line.text].length - 1) : textWidth(line.text, size, spacing);
    let box;
    if (vertical) {
      const lx = x - offset;
      const y0 = anchor === "start" ? y : anchor === "middle" ? y - length / 2 : y - length;
      box = [lx - size / 2, y0, size, length];
    } else {
      const ly = y + offset;
      const x0 = anchor === "start" ? x : anchor === "middle" ? x - length / 2 : x - length;
      box = [x0, ly - ASCENT * size, length, (ASCENT + DESCENT) * size];
    }
    const corners = [[box[0], box[1]], [box[0] + box[2], box[1]], [box[0] + box[2], box[1] + box[3]], [box[0], box[1] + box[3]]].map((p) => apply(m, p));
    measured.push({ text: line.text, box: bounds(corners), length });
  }
  const all = measured.flatMap((line) => [[line.box[0], line.box[1]], [line.box[0] + line.box[2], line.box[1] + line.box[3]]]);
  const scale = Math.hypot(m[0], m[1]);
  return { box: bounds(all), lines: measured, size: size * scale, spacing, vertical, fill: a.fill || attr(textNode, "fill"), weight: Number(a["font-weight"] || attr(textNode, "font-weight") || 400) };
}

function readSlots(tree) {
  const slots = [];
  for (const node of walk(tree)) {
    if (hidden(node)) continue;
    const a = node.attrs;
    if (!a["data-slot"]) continue;
    const kind = a["data-kind"] || "shape";
    const base = {
      slot: a["data-slot"], kind, node,
      box: a["data-box"] ? numberList(a["data-box"]) : null,
      maxChars: a["data-max-chars"] ? Number(a["data-max-chars"]) : null,
      maxLines: a["data-lines"] ? Number(a["data-lines"]) : 1,
      title: a["data-title"] === "1", decor: a["data-decor"] === "1", bleed: a["data-bleed"] === "1",
      sizeParam: a["data-size-param"] || null,
    };
    if (kind === "text") {
      const textNode = node.name === "text" ? node : [...walk(node)].find((child) => child.name === "text");
      if (!textNode) continue;
      const extent = textExtent(textNode);
      const content = extent.lines.map((line) => line.text).join("");
      slots.push({ ...base, text: content, extent: extent.box, lines: extent.lines, size: extent.size, weight: extent.weight, fill: extent.fill, vertical: extent.vertical, textNode, capHeight: null });
    } else if (kind === "lettering") {
      const group = [...walk(node)].find((child) => child.attrs?.class === "lettering");
      const fallback = [...walk(node)].find((child) => child.name === "text");
      if (fallback && !group) {
        const extent = textExtent(fallback);
        slots.push({ ...base, kind: "lettering", fallback: true, text: extent.lines.map((line) => line.text).join(""), extent: extent.box, lines: extent.lines, size: extent.size, weight: extent.weight, fill: extent.fill, textNode: fallback });
        continue;
      }
      if (!group) continue;
      const extent = letteringExtent(group);
      const cap = Number(a["data-cap"] || 0) * Math.hypot(...ctm(group).slice(0, 2));
      slots.push({ ...base, text: group.attrs["data-text"] || "", extent, size: cap, capHeight: cap, fill: group.attrs.fill, textNode: group });
    } else {
      const m = ctm(node);
      let extent = null;
      if (kind === "image" && base.box) extent = base.box;
      else if (node.name === "rect") {
        const x = Number(a.x || 0); const y = Number(a.y || 0);
        extent = bounds([[x, y], [x + Number(a.width), y + Number(a.height)]].map((p) => apply(m, p)));
      } else if (node.name === "polygon") {
        const values = numberList(a.points);
        const pts = [];
        for (let i = 0; i + 1 < values.length; i += 2) pts.push(apply(m, [values[i], values[i + 1]]));
        extent = bounds(pts);
      }
      slots.push({ ...base, extent });
    }
  }
  return slots;
}

module.exports = {
  ASCENT, DESCENT, TEXT_INK_FACTOR,
  advanceEm, isCjk, textWidth, wrapText,
  parseXml, walk, textContent, ctm, apply, bounds, polygonArea, clipToBox,
  parseColor, hex, luminance, contrastRatio, mix,
  gradients, paints, paintArea, groundAt, readSlots, round, roundBox,
};
