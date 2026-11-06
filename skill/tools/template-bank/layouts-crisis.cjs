"use strict";

// Layouts of the crisis-command style pack (styles/crisis-command/style.json): the crisis command
// terminal grammar of 1990s Japanese mecha anime, measured privately on
// reference frames (never shipped) and proven on the original case 潮位警报
// TIDEMARK. Two kinds of screen with two light regimes: type cards (an almost black ground carrying
// one heavy Mincho block) and alarm screens (a hot red-orange or amber field). Heavy Mincho is
// compressed mechanically in four measured steps (1.00 card, 0.85 caption, 0.65 credits, 0.35 film
// title; we stop the film title at 0.40 because the open substitute's horizontals thin out), English
// is compressed grotesque under or beside the CJK, digits are drawn as segments (no font), alarm
// panels are elongated hexagons (3.06:1, 55-degree tips) in double rules. Geometry in 1920 x 1080
// units (the title card in its own height) scaled to the canvas.

const { f1, esc, invalid } = require("./layout-kit.cjs");
const measure = require("./measure.cjs");

// Measured compression steps (ink width / ink height of one Mincho ideograph; uncompressed reads 1.0).
const COMPRESS = { card: 1, caption: 0.85, credits: 0.65, film: 0.35 };
// The alarm hexagon: width / height 3.06, tips at 55 degrees from the horizontal.
const HEX = { aspect: 3.06, tip: 55 };
// The title card, as fractions of the card height (4:3 card of 2048 x 1536 measured).
const CARD = { left: 0.065, numTop: 0.064, numInk: 0.154, line1Top: 0.264, line2Top: 0.605, titleInk: 0.31, commaPitch: 0.5 };
const INK = 0.95; // ideograph ink height in em (Noto Serif SC Black, measured on renders in Chrome)
const ASC = 0.855; // ideograph ink top above the baseline, in em

// Advance widths in em of printable ASCII in Archivo 700 (wdth 100), read from the font's hmtx.
const ARCHIVO = Object.fromEntries(Object.entries({
  " ": 0.196, "!": 0.301, "\"": 0.456, "#": 0.6, "%": 0.973, "&": 0.764, "'": 0.253, "(": 0.364, ")": 0.364, "+": 0.641, ",": 0.307, "-": 0.333, ".": 0.307, "/": 0.3,
  0: 0.595, 1: 0.596, 2: 0.596, 3: 0.596, 4: 0.597, 5: 0.595, 6: 0.596, 7: 0.596, 8: 0.596, 9: 0.595, ":": 0.335, ";": 0.335, "?": 0.613, "@": 1.001,
  A: 0.724, B: 0.722, C: 0.733, D: 0.739, E: 0.683, F: 0.622, G: 0.802, H: 0.754, I: 0.301, J: 0.603, K: 0.725, L: 0.591, M: 0.872, N: 0.754, O: 0.793, P: 0.681, Q: 0.793,
  R: 0.73, S: 0.679, T: 0.641, U: 0.748, V: 0.694, W: 0.964, X: 0.706, Y: 0.699, Z: 0.653, "[": 0.35, "]": 0.35, _: 0.518, "|": 0.253,
}));
// The family the grotesque role renders in: Archivo when --font-dir supplies it, else the stack is pinned
// to Noto Sans SC and every width is computed from the measured-model widths of that face (#323), so the
// compression that fits a line to its box is computed for the face that actually renders.
const model = (t, size) => measure.textWidth(String(t), size, 0, { serif: false, weight: 700 });
function grot(d) {
  const supplied = d.faces.some((face) => face.family === "Archivo");
  // With Archivo the width is the larger of its advances and the check's text model, so a line compressed
  // to its box fits both the face that renders and the static measure of the same file.
  return supplied ? { family: "Archivo", width: (t, size) => Math.max(model(t, size), [...String(t)].reduce((w, ch) => w + (ARCHIVO[ch] ?? 0.7), 0) * size) }
    : { family: "Noto Sans SC", width: (t, size) => model(t, size) };
}
const minchoWidth = (t, size) => measure.textWidth(String(t), size, 0, { serif: true, weight: 900 });

function latinOnly(d, name) {
  const { text } = d.value(name);
  if (!/^[\x20-\x7E]*$/.test(String(text))) throw invalid(`slot ${name} is set in the compressed grotesque (Latin, digits and ASCII punctuation only), got ${JSON.stringify(text)}. Fix: put CJK copy in a head or body slot; --set ${name}="WATER LEVEL CROSSED"`);
}

// ---- drawn segment digits ------------------------------------------------------------------
// Seven-segment digits as filled hexagonal segments (no font): style "lcd" (thin, slanted 6 degrees,
// a reference countdown) or "capsule" (thick, upright, 0.36 wide per digit with its gap: the
// reference-film clock). Characters: 0-9 : . - and space.
const SEGS = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcfgd", "-": "g", " ": "" };
const SEG_STYLE = { lcd: { w: 0.5, t: 0.12, gap: 0.02, slant: 6, pitch: 0.66 }, capsule: { w: 0.42, t: 0.16, gap: 0.025, slant: 0, pitch: 0.54 } };
function segText(text, x, y, h, style = "lcd") {
  const S = SEG_STYLE[style]; const w = S.w * h; const t = S.t * h; const g = S.gap * h;
  const k = Math.tan((S.slant * Math.PI) / 180);
  const sk = ([px, py]) => [px + (y + h - py) * k, py];
  const hseg = (x0, x1, yy) => [[x0, yy], [x0 + t / 2, yy - t / 2], [x1 - t / 2, yy - t / 2], [x1, yy], [x1 - t / 2, yy + t / 2], [x0 + t / 2, yy + t / 2]];
  const vseg = (xx, y0, y1) => [[xx, y0], [xx + t / 2, y0 + t / 2], [xx + t / 2, y1 - t / 2], [xx, y1], [xx - t / 2, y1 - t / 2], [xx - t / 2, y0 + t / 2]];
  const poly = (pts) => `M${pts.map(sk).map(([px, py]) => `${f1(px)} ${f1(py)}`).join("L")}Z`;
  let cx = x; let d = "";
  for (const ch of String(text)) {
    if (ch === ":" || ch === ".") {
      const dot = (yy) => poly([[cx + t * 0.2, yy - t / 2], [cx + t * 1.2, yy - t / 2], [cx + t * 1.2, yy + t / 2], [cx + t * 0.2, yy + t / 2]]);
      d += ch === ":" ? dot(y + h * 0.3) + dot(y + h * 0.7) : dot(y + h - t / 2);
      cx += t * 1.6; continue;
    }
    const on = SEGS[ch];
    if (on === undefined) throw invalid(`segment digits draw 0-9 : . - and space, got ${JSON.stringify(ch)}`);
    const L = cx + t / 2; const R = cx + w - t / 2; const T = y + t / 2; const M = y + h / 2; const B = y + h - t / 2;
    const parts = { a: hseg(L + g, R - g, T), g: hseg(L + g, R - g, M), d: hseg(L + g, R - g, B), f: vseg(L, T + g, M - g), b: vseg(R, T + g, M - g), e: vseg(L, M + g, B - g), c: vseg(R, M + g, B - g) };
    for (const s of on) d += poly(parts[s]);
    cx += S.pitch * h;
  }
  return { d, width: cx - x - (S.pitch - S.w) * h + h * k };
}
// A lettering-kind slot drawn as segments, measured as lettering (cap height h, colour from the fill).
function segments(d, name, x, y, h, role, style, o = {}) {
  const { spec, text } = d.value(name);
  const set = segText(text, x, y, h, style);
  const x0 = o.anchor === "end" ? x - set.width : o.anchor === "middle" ? x - set.width / 2 : x;
  const drawn = x0 === x ? set : segText(text, x0, y, h, style);
  const box = o.box || [x0 - 0.06 * h, y - 0.08 * h, set.width + 0.12 * h, h * 1.16];
  d.raw(`<g ${d.slotAttrs(name, spec, { box: d.clipBox(box) })} data-role="${role}" data-cap="${f1(h)}"><g class="lettering" fill="${d.pal[role]}" data-text="${esc(text)}"><path d="${drawn.d}"/></g></g>`);
  return { x: x0, width: set.width };
}
function digitsOnly(d, name, pattern, example) {
  const { text } = d.value(name);
  if (!pattern.test(String(text))) throw invalid(`slot ${name} is drawn as segment digits (${example}), got ${JSON.stringify(text)}. Fix: --set ${name}=${example}; put words in a text slot`);
}

// ---- shapes --------------------------------------------------------------------------------
// The alarm hexagon: flat top and bottom, tips at HEX.tip degrees.
function hexPts(cx, cy, w, h) {
  const dx = (h / 2) / Math.tan((HEX.tip * Math.PI) / 180);
  return [[cx - w / 2, cy], [cx - w / 2 + dx, cy - h / 2], [cx + w / 2 - dx, cy - h / 2], [cx + w / 2, cy], [cx + w / 2 - dx, cy + h / 2], [cx - w / 2 + dx, cy + h / 2]];
}
const ptsAttr = (pts) => pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
function inset(pts, by) { // shrink a convex polygon toward its centroid by a distance (approximate for hexagons)
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length; const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => { const dx = x - cx; const dy = y - cy; const l = Math.hypot(dx, dy); return [x - (dx / l) * by * (Math.abs(dx) > Math.abs(dy) * 2 ? 1.15 : 1.25), y - (dy / l) * by * 1.25]; });
}
// A panel in double rules: a translucent fill (role, alpha), an outer rule and an inner hairline.
function hexPanel(d, cx, cy, w, h, s, { fill = "panel", alpha = 0.9, rule = "rule_hot" } = {}) {
  const out = hexPts(cx, cy, w, h);
  d.raw(`<polygon points="${ptsAttr(out)}" fill="${d.pal[fill]}" fill-opacity="${alpha}" data-role="${fill}"/>`);
  d.raw(`<g data-deco="1" fill="none" stroke="${d.pal[rule]}"><polygon points="${ptsAttr(out)}" stroke-width="${f1(6 * s)}"/><polygon points="${ptsAttr(hexPts(cx, cy, w - 28 * s, h - 24 * s))}" stroke-width="${f1(2 * s)}"/></g>`);
}
// 45-degree hazard stripes, stripe width = gap, clipped to a box.
function stripes(d, x, y, w, h, role, period) {
  const id = `stripe-${d.stripeN = (d.stripeN || 0) + 1}`;
  d.def(`<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/></clipPath>`);
  let p = "";
  for (let k = -h; k < w + h; k += period) p += `M${f1(x + k)} ${f1(y + h)}l${f1(h)} ${f1(-h)}h${f1(period / 2)}l${f1(-h)} ${f1(h)}z`;
  d.raw(`<g data-deco="1" clip-path="url(#${id})"><path d="${p}" fill="${d.pal[role]}"/></g>`);
}
// The 45-degree lattice of the alarm wall's screen (decoration).
function lattice(d, x, y, w, h, step, s) {
  let p = "";
  for (let k = -h; k < w + h; k += step) p += `M${f1(x + k)} ${f1(y)}l${f1(h)} ${f1(h)}M${f1(x + k + h)} ${f1(y)}l${f1(-h)} ${f1(h)}`;
  const id = `lat-${d.latN = (d.latN || 0) + 1}`;
  d.def(`<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/></clipPath>`);
  d.raw(`<g data-deco="1" clip-path="url(#${id})"><path d="${p}" fill="none" stroke="${d.pal.lattice}" stroke-width="${f1(Math.max(1, 1.2 * s))}"/></g>`);
}
// CRT scanlines: a 3-unit period, 1-unit dark line (decoration, never over a type card).
function scanlines(d, x, y, w, h, s, opacity) {
  const id = `scan-${d.scanN = (d.scanN || 0) + 1}`;
  d.def(`<pattern id="${id}" width="${f1(4 * s)}" height="${f1(3 * s)}" patternUnits="userSpaceOnUse"><rect width="${f1(4 * s)}" height="${f1(Math.max(1, s))}" fill="#000000"/></pattern>`);
  d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="url(#${id})" opacity="${opacity}"/>`);
}
const chamfer = (x, y, w, h, c) => [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]];
// The placeholder mark: three sluice bars over one water line (no letter shapes).
const mark = (x, y, h, c) => `<g data-deco="1" fill="${c}">${[0, 1, 2].map((i) => `<rect x="${f1(x + i * h * 0.34)}" y="${f1(y)}" width="${f1(h * 0.2)}" height="${f1(h * 0.78)}"/>`).join("")}<rect x="${f1(x - h * 0.12)}" y="${f1(y + h * 0.88)}" width="${f1(h * 1.02)}" height="${f1(h * 0.12)}"/></g>`;

// A square stamp: double frame, two Mincho characters, cut by horizontal hairlines.
function stamp(d, name, x, y, w, h, s, role = "type_hot") {
  d.raw(`<g data-deco="1" fill="none" stroke="${d.pal[role]}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" stroke-width="${f1(5 * s)}"/><rect x="${f1(x + 12 * s)}" y="${f1(y + 12 * s)}" width="${f1(w - 24 * s)}" height="${f1(h - 24 * s)}" stroke-width="${f1(2 * s)}"/></g>`);
  const size = (w - 52 * s) / 2;
  d.text(name, x + w / 2, y + h / 2 + size * 0.36, size, { role, family: "head", anchor: "middle", box: [x + 14 * s, y + 14 * s, w - 28 * s, h - 28 * s] });
}

const LAYOUTS = {
  // ---- title card: 1440 x 1080 (4:3, measured), 1920 x 1080, 960 x 720 ------------------------
  "card.crisis-title-card"(d) {
    const { W, H, p } = d;
    const ground = p.ground === "paper" ? ["paper", "black"] : p.ground === "red" ? ["blood", "alert"] : ["bg", "ink"];
    d.rect(0, 0, W, H, ground[0]);
    const role = ground[1];
    const left = CARD.left * H;
    const col = p.number === "column";
    const sn = (col ? 0.125 : CARD.numInk / INK) * H;
    if (col) {
      d.text("number", left + sn / 2, CARD.numTop * H + sn * 0.1, sn, { role, family: "head", vertical: true, anchor: "start", box: [left - 2, CARD.numTop * H - 4, sn + 4, 4.4 * sn] });
    } else {
      d.text("number", left, CARD.numTop * H + ASC * sn, sn, { role, family: "head", box: [left - 4, CARD.numTop * H - 0.08 * sn, 3.4 * sn, sn * 1.12] });
    }
    const st = (CARD.titleInk / INK) * H * p.scale;
    const x0 = col ? left + 0.17 * H : left;
    const avail = W - x0 - left;
    const bl1 = CARD.line1Top * H + ASC * st; const bl2 = CARD.line2Top * H + ASC * st;
    // line 1: head_1 alone; line 2: head_2, the half-pitch comma, head_3 (the L of the measured card)
    const w1 = minchoWidth(d.value("head_1").text, st);
    const w2 = minchoWidth(d.value("head_2").text, st); const w3 = minchoWidth(d.value("head_3").text, st);
    const line2 = w2 + CARD.commaPitch * st + w3;
    // a line wider than the card is compressed (never below the credits step, 0.65); still too wide is a finding
    const c1 = Math.max(COMPRESS.credits, Math.min(p.compress, avail / w1));
    const c2 = Math.max(COMPRESS.credits, Math.min(p.compress, avail / line2));
    d.text("head_1", x0, bl1, st, { role, family: "head", compress: c1, box: [x0 - 4, bl1 - 0.9 * st - 6, Math.min(avail, w1 * c1) + 8, st * 1.12 + 6] });
    d.text("head_2", x0, bl2, st, { role, family: "head", compress: c2, box: [x0 - 4, bl2 - 0.9 * st - 6, w2 * c2 + 8, st * 1.12 + 6] });
    const cx = x0 + w2 * c2 - 0.04 * st * c2;
    d.raw(`<g transform="matrix(${Number(c2.toFixed(4))} 0 0 1 ${f1(cx * (1 - c2))} 0)"><text data-deco="1" x="${f1(cx)}" y="${f1(bl2)}" font-family="${esc(d.families.head)}" font-weight="900" font-size="${f1(st)}" fill="${d.pal[role]}">、</text></g>`);
    const x3 = x0 + (w2 + CARD.commaPitch * st) * c2;
    d.text("head_3", x3, bl2, st, { role, family: "head", compress: c2, box: [x3 - 4, bl2 - 0.9 * st - 6, Math.min(W - left - x3, w3 * c2) + 8, st * 1.12 + 6] });
    d.zone("card", "safe", [left * 0.5, 0, W - left, H], { slots: ["number", "head_1", "head_2", "head_3"] });
  },

  // ---- film title line: 1920 x 816 (2.35:1), 1920 x 1080 ------------------------------------
  "banner.crisis-film-title"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "bg");
    const st = (p.height * H) / INK; const c = p.compress;
    const wt = minchoWidth(d.value("title").text, st) * c; const wc = 0.4 * st * c; const wm = minchoWidth(d.value("mark").text, st) * c * 1.12;
    const total = wt + wc + wm; const x = (W - total) / 2; const bl = H * 0.48 + ((2 * ASC - INK) / 2) * st;
    const role = p.ink;
    d.text("title", x, bl, st, { role, family: "head", compress: c, tracking: -10, box: [x - 6 * s, bl - ASC * st - 8 * s, wt + 12 * s, st * 1.04 + 8 * s] });
    const xc = x + wt + 0.02 * st * c;
    d.raw(`<g transform="matrix(${Number(c.toFixed(4))} 0 0 1 ${f1(xc * (1 - c))} 0)"><text data-deco="1" x="${f1(xc)}" y="${f1(bl)}" font-family="${esc(d.families.head)}" font-weight="900" font-size="${f1(st)}" fill="${d.pal[role]}">：</text></g>`);
    const xm = x + wt + wc;
    d.text("mark", xm, bl, st, { role, family: "head", compress: c * 1.12, box: [xm - 6 * s, bl - ASC * st - 8 * s, wm + 12 * s, st * 1.04 + 8 * s] });
    if (p.caption) {
      latinOnly(d, "caption");
      const g = grot(d); const cs = 30 * s * (H / 816 > 1.2 ? 1.1 : 1); const cw = g.width(d.value("caption").text, cs) + [...String(d.value("caption").text)].length * 0.06 * cs; const cc = Math.min(0.62, (W * 0.6) / cw);
      d.text("caption", W / 2, bl + st * 0.38 + cs, cs, { role: "dim", family: "grot", resolved: g.family, anchor: "middle", compress: cc, tracking: 60, box: [W / 2 - (cw * cc) / 2 - 8 * s, bl + st * 0.38, cw * cc + 16 * s, cs * 1.3] });
    }
    d.zone("line", "safe", [W * 0.04, 0, W * 0.92, H], { slots: ["title", "mark"] });
  },

  // ---- the alarm wall: 1920 x 1080 ------------------------------------------------------------
  "ui.crisis-alert-wall"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "screen");
    lattice(d, 0, 0, W, H, 46 * s, s);
    const hh = 417 * s; const mw = HEX.aspect * 417 * s;
    // side hexes first (behind), then the lower row, then the main
    for (const [cx, side] of [[312 * s, "left"], [1608 * s, "right"]]) {
      hexPanel(d, cx, 590 * s, 760 * s, hh, s, { alpha: 0.86 });
      d.raw(`<g data-deco="1" fill="${d.pal.type_hot}"><path d="M${f1(cx)} ${f1(434 * s)}l${f1(44 * s)} ${f1(70 * s)}h${f1(-88 * s)}z"/></g>`);
      d.text(`level_${side}`, cx, 538 * s, 22 * s, { role: "type_hot", family: "grot", resolved: grot(d).family, anchor: "middle", tracking: 120, box: [cx - 110 * s, 518 * s, 220 * s, 28 * s] });
      const g = grot(d); const ws = 118 * s; const ww = g.width(d.value(`warning_${side}`).text, ws); const wc = Math.min(1, (560 * s) / ww);
      d.text(`warning_${side}`, cx, 660 * s, ws, { role: "type_hot", family: "grot", resolved: g.family, anchor: "middle", compress: wc, box: [cx - (ww * wc) / 2 - 8 * s, 546 * s, ww * wc + 16 * s, 136 * s] });
    }
    for (const [i, cx] of [[1, 640 * s], [2, 1280 * s]]) {
      hexPanel(d, cx, 862 * s, 780 * s, 330 * s, s, { alpha: 0.9 });
      d.text(`seat_cjk_${i}`, cx - 250 * s, 830 * s, 40 * s, { role: "type_hot", family: "head", box: [cx - 254 * s, 790 * s, 300 * s, 52 * s] });
      const g = grot(d); const ns = 92 * s; const nw = g.width(d.value(`seat_latin_${i}`).text, ns); const nc = Math.min(0.9, (500 * s) / nw);
      d.text(`seat_latin_${i}`, cx - 250 * s, 936 * s, ns, { role: "type_hot", family: "grot", resolved: g.family, compress: nc, box: [cx - 254 * s, 848 * s, nw * nc + 8 * s, 108 * s] });
    }
    // the mode box on the left lower row
    const g = grot(d);
    d.raw(`<rect data-deco="1" x="${f1(386 * s)}" y="${f1(956 * s)}" width="${f1(276 * s)}" height="${f1(46 * s)}" rx="${f1(6 * s)}" fill="none" stroke="${d.pal.type_hot}" stroke-width="${f1(3 * s)}"/>`);
    d.text("mode", 524 * s, 989 * s, 24 * s, { role: "type_hot", family: "grot", resolved: g.family, anchor: "middle", box: [392 * s, 960 * s, 264 * s, 38 * s] });
    // the main hexagon: stamps left and right, two compressed Mincho lines, two English lines
    hexPanel(d, 960 * s, 250 * s, mw, hh, s, { alpha: 0.92 });
    stamp(d, "stamp_left", 470 * s, 120 * s, 214 * s, 191 * s, s);
    stamp(d, "stamp_right", 1236 * s, 120 * s, 214 * s, 191 * s, s);
    const ts = 86 * s; const c = COMPRESS.caption;
    for (const [name, y] of [["title_1", 178], ["title_2", 270]]) {
      const w = minchoWidth(d.value(name).text, ts); const cc = Math.min(c, (500 * s) / w);
      d.text(name, 960 * s, y * s, ts, { role: "type_hot", family: "head", anchor: "middle", compress: cc, box: [960 * s - (w * cc) / 2 - 6 * s, y * s - ts * ASC - 6 * s, w * cc + 12 * s, ts * 1.02 + 6 * s] });
    }
    for (const [name, y] of [["latin_1", 356], ["latin_2", 400]]) {
      latinOnly(d, name);
      const ls = 40 * s; const w = g.width(d.value(name).text, ls); const cc = Math.min(0.9, (720 * s) / w);
      d.text(name, 960 * s, y * s, ls, { role: "type_hot", family: "grot", resolved: g.family, anchor: "middle", compress: cc, box: [960 * s - (w * cc) / 2 - 6 * s, y * s - ls - 2 * s, w * cc + 12 * s, ls * 1.3] });
    }
    if (p.scanlines) scanlines(d, 0, 0, W, H, s, 0.14);
    d.zone("wall", "safe", [0, 0, W, H], { slots: ["title_1", "title_2", "latin_1", "latin_2"] });
  },

  // ---- the countdown bezel: 1920 x 1080 -------------------------------------------------------
  "ui.crisis-countdown"(d) {
    const { W, H, p } = d; const s = W / 1920;
    const danger = p.state === "danger";
    const ink = danger ? "alert" : "amber";
    d.rect(0, 0, W, H, "bg");
    const bezel = chamfer(96 * s, 176 * s, 1284 * s, 640 * s, 48 * s);
    d.raw(`<polygon points="${ptsAttr(bezel)}" fill="${d.pal.plate}" data-role="plate"/>`);
    d.raw(`<g data-deco="1" fill="none" stroke="${d.pal[danger ? "alert" : "amber_line"]}"><polygon points="${ptsAttr(bezel)}" stroke-width="${f1(4 * s)}"/><polygon points="${ptsAttr(chamfer(112 * s, 192 * s, 1252 * s, 608 * s, 40 * s))}" stroke-width="${f1(1.5 * s)}"/></g>`);
    // the label in vertical brackets, its English under it
    d.rect(128 * s, 64 * s, 6 * s, 96 * s, ink); d.rect(560 * s, 64 * s, 6 * s, 96 * s, ink);
    const ls = 76 * s; const lw = minchoWidth(d.value("label").text, ls); const lc = Math.min(0.92, (400 * s) / lw);
    d.text("label", 152 * s, 128 * s, ls, { role: ink, family: "head", compress: lc, box: [148 * s, 56 * s, lw * lc + 8 * s, 82 * s] });
    latinOnly(d, "label_latin");
    const g = grot(d);
    d.text("label_latin", 152 * s, 156 * s, 20 * s, { role: ink, family: "grot", resolved: g.family, tracking: 40, box: [148 * s, 138 * s, 400 * s, 24 * s] });
    // the clock: three capsule pairs with Mincho units at 0.21 of the digit height
    digitsOnly(d, "clock", /^\d\d:\d\d:\d\d$/, "04:59:58");
    const [hh, mm, ss] = String(d.value("clock").text).split(":");
    const dh = 280 * s; const top = 246 * s; const us = (0.21 * dh) / INK;
    let x = 160 * s; const paths = []; const units = [];
    for (const [digits, unit] of [[hh, "unit_h"], [mm, "unit_m"], [ss, "unit_s"]]) {
      const set = segText(digits, x, top, dh, "capsule");
      paths.push(set.d); x += set.width + 16 * s;
      units.push([unit, x]); x += us * 1.1 + 40 * s;
    }
    // one lettering slot carries the whole clock (its three pairs); the Mincho units are text slots between them
    const { spec: clockSpec } = d.value("clock");
    d.raw(`<g ${d.slotAttrs("clock", clockSpec, { box: d.clipBox([150 * s, top - 24 * s, x - 150 * s, dh * 1.16]) })} data-role="${ink}" data-cap="${f1(dh)}"><g class="lettering" fill="${d.pal[ink]}" data-text="${esc(d.value("clock").text)}"><path d="${paths.join("")}"/></g></g>`);
    for (const [unit, ux] of units) d.text(unit, ux, top + dh, us, { role: ink, family: "head", box: [ux - 4 * s, top + dh - us - 4 * s, us * 1.1 + 8 * s, us * 1.2 + 8 * s] });
    // the second clock: T+ elapsed in thin slanted segments at 0.30
    d.text("t_label", 160 * s, 640 * s, 26 * s, { role: ink, family: "grot", resolved: g.family, box: [156 * s, 614 * s, 200 * s, 34 * s] });
    digitsOnly(d, "elapsed", /^\d\d:\d\d:\d\d\.\d\d$/, "00:12:07.53");
    segments(d, "elapsed", 160 * s, 656 * s, 96 * s, ink, "lcd");
    // modes: four equal boxes, the current one filled; the danger box on the right
    const modes = 4;
    for (let i = 1; i <= modes; i += 1) {
      const bx = (96 + (i - 1) * 228) * s; const by = 872 * s; const on = i === p.mode;
      if (on) d.rect(bx, by, 212 * s, 64 * s, ink); else d.raw(`<rect data-deco="1" x="${f1(bx)}" y="${f1(by)}" width="${f1(212 * s)}" height="${f1(64 * s)}" fill="none" stroke="${d.pal[ink]}" stroke-width="${f1(2 * s)}"/>`);
      d.text(`mode_${i}`, bx + 106 * s, by + 42 * s, 26 * s, { role: on ? "black" : ink, family: "grot", resolved: g.family, anchor: "middle", tracking: 60, box: [bx + 6 * s, by + 8 * s, 200 * s, 48 * s] });
    }
    const dx = 1040 * s; const dy = 872 * s;
    if (danger) d.rect(dx, dy, 340 * s, 120 * s, "alert"); else d.raw(`<rect data-deco="1" x="${f1(dx)}" y="${f1(dy)}" width="${f1(340 * s)}" height="${f1(120 * s)}" fill="none" stroke="${d.pal.amber_line}" stroke-width="${f1(2 * s)}"/>`);
    d.text("danger_1", dx + 170 * s, dy + 52 * s, 36 * s, { role: danger ? "black" : "amber_dim_text", family: "grot", resolved: g.family, anchor: "middle", tracking: 40, box: [dx + 8 * s, dy + 14 * s, 324 * s, 46 * s] });
    d.text("danger_2", dx + 170 * s, dy + 98 * s, 36 * s, { role: danger ? "black" : "amber_dim_text", family: "grot", resolved: g.family, anchor: "middle", tracking: 40, box: [dx + 8 * s, dy + 62 * s, 324 * s, 46 * s] });
    // the two supply plates: the current one lit, hazard stripes in the corner
    for (const [i, y, on] of [[1, 176, p.supply === 1], [2, 512, p.supply === 2]]) {
      const px = 1440 * s; const py = y * s; const pw = 384 * s; const ph = 304 * s;
      d.raw(`<polygon points="${ptsAttr(chamfer(px, py, pw, ph, 28 * s))}" fill="${d.pal[on ? ink : "plate"]}" data-role="${on ? ink : "plate"}"/>`);
      if (!on) d.raw(`<polygon data-deco="1" points="${ptsAttr(chamfer(px, py, pw, ph, 28 * s))}" fill="none" stroke="${d.pal.amber_line}" stroke-width="${f1(2 * s)}"/>`);
      if (on) stripes(d, px + pw - 120 * s, py + 12 * s, 100 * s, 64 * s, "plate", 26 * s);
      const pr = on ? "black" : "amber_dim_text";
      d.text(`plate_cjk_${i}`, px + 34 * s, py + 182 * s, 150 * s, { role: pr, family: "head", compress: 0.9, box: [px + 28 * s, py + 40 * s, 290 * s, 168 * s] });
      d.text(`plate_latin_${i}`, px + 36 * s, py + 252 * s, 40 * s, { role: pr, family: "grot", resolved: g.family, compress: 0.86, box: [px + 30 * s, py + 210 * s, 330 * s, 56 * s] });
    }
    if (p.scanlines) scanlines(d, 96 * s, 176 * s, 1284 * s, 640 * s, s, 0.12);
    d.raw(mark(1450 * s, 900 * s, 72 * s, d.pal.amber_line));
    d.zone("clock", "safe", [96 * s, 176 * s, 1284 * s, 640 * s], { slots: ["clock", "unit_h", "unit_m", "unit_s", "elapsed", "t_label"] });
  },

  // ---- coupling graph and the five-seat vote: 1920 x 1080 ------------------------------------
  "ui.crisis-sync-graph"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "bg");
    const g = grot(d);
    // left column: label, the big ratio in capsule digits, the threshold line
    d.rect(80 * s, 96 * s, 6 * s, 84 * s, "amber");
    d.text("label", 104 * s, 160 * s, 64 * s, { role: "amber", family: "head", compress: 0.92, box: [100 * s, 96 * s, 440 * s, 80 * s] });
    latinOnly(d, "label_latin");
    d.text("label_latin", 104 * s, 206 * s, 22 * s, { role: "amber", family: "grot", resolved: g.family, tracking: 80, box: [100 * s, 186 * s, 480 * s, 28 * s] });
    digitsOnly(d, "ratio", /^\d{1,3}\.\d$/, "41.3");
    const r = segments(d, "ratio", 96 * s, 260 * s, 250 * s, "amber", "capsule");
    d.text("percent", r.x + r.width + 18 * s, 510 * s, 96 * s, { role: "amber", family: "grot", resolved: g.family, box: [r.x + r.width + 12 * s, 418 * s, 112 * s, 110 * s] });
    d.rect(80 * s, 572 * s, 540 * s, Math.max(1, 2 * s), "amber_line");
    d.text("threshold", 96 * s, 626 * s, 30 * s, { role: "alert", family: "head", box: [92 * s, 596 * s, 520 * s, 40 * s] });
    // the graph board: 1 px grid, a heavier line every 5 cells, three traces, the dashed threshold
    const gx = 700 * s; const gy = 96 * s; const gw = 1140 * s; const gh = 600 * s; const cell = 40 * s;
    d.rect(gx, gy, gw, gh, "plate");
    let grid = ""; let major = "";
    for (let i = 0; i <= gw / cell + 0.01; i += 1) (i % 5 ? (grid += `M${f1(gx + i * cell)} ${f1(gy)}v${f1(gh)}`) : (major += `M${f1(gx + i * cell)} ${f1(gy)}v${f1(gh)}`));
    for (let j = 0; j <= gh / cell + 0.01; j += 1) (j % 5 ? (grid += `M${f1(gx)} ${f1(gy + j * cell)}h${f1(gw)}`) : (major += `M${f1(gx)} ${f1(gy + j * cell)}h${f1(gw)}`));
    d.raw(`<g data-deco="1" fill="none"><path d="${grid}" stroke="${d.pal.grid}" stroke-width="${f1(Math.max(1, s))}"/><path d="${major}" stroke="${d.pal.amber_line}" stroke-width="${f1(Math.max(1, 1.5 * s))}"/></g>`);
    const rnd = (() => { let v = (p.trace_seed * 2654435761) >>> 0; return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const trace = (base, amp, n) => { let y = base; const pts = []; for (let i = 0; i <= n; i += 1) { y = Math.min(0.95, Math.max(0.05, y + (rnd() - 0.5) * amp)); pts.push([gx + (i / n) * gw, gy + y * gh]); } return pts; };
    const line = (pts, role, w) => `<path data-deco="1" d="M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}" fill="none" stroke="${d.pal[role]}" stroke-width="${f1(w * s)}"/>`;
    d.raw(line(trace(0.7, 0.08, 60), "amber_line", 1.5)); d.raw(line(trace(0.55, 0.1, 60), "amber_line", 1.5)); d.raw(line(trace(0.35, 0.06, 90), "amber", 3));
    const ty = gy + 0.3 * gh;
    d.raw(`<path data-deco="1" d="M${f1(gx)} ${f1(ty)}h${f1(gw)}" stroke="${d.pal.alert}" stroke-width="${f1(2 * s)}" stroke-dasharray="${f1(14 * s)} ${f1(8 * s)}"/>`);
    d.rect(gx + gw - 236 * s, ty - 42 * s, 236 * s, 34 * s, "bg");
    d.text("border_tag", gx + gw - 12 * s, ty - 16 * s, 22 * s, { role: "alert", family: "grot", resolved: g.family, anchor: "end", tracking: 60, box: [gx + gw - 232 * s, ty - 40 * s, 228 * s, 30 * s] });
    d.text("axis", gx, gy + gh + 34 * s, 20 * s, { role: "amber", family: "grot", resolved: g.family, tracking: 60, box: [gx - 4 * s, gy + gh + 12 * s, 600 * s, 28 * s] });
    // the five-seat vote: square stamps, one red denial among approvals
    const n = 5; const vw = 196 * s; const vg = 40 * s; const vx = (W - (n * vw + (n - 1) * vg)) / 2 + 120 * s; const vy = 790 * s;
    d.text("vote_label", 96 * s, vy + 70 * s, 48 * s, { role: "ink", family: "head", box: [92 * s, vy + 18 * s, 400 * s, 64 * s] });
    d.text("vote_result", 96 * s, vy + 130 * s, 30 * s, { role: "amber", family: "head", box: [92 * s, vy + 100 * s, 400 * s, 40 * s] });
    for (let i = 1; i <= n; i += 1) {
      const x = vx + (i - 1) * (vw + vg); const deny = i === p.dissent;
      const role = deny ? "alert" : "ink";
      d.raw(`<g data-deco="1" fill="none" stroke="${d.pal[role]}"><rect x="${f1(x)}" y="${f1(vy)}" width="${f1(vw)}" height="${f1(vw)}" stroke-width="${f1(4 * s)}"/><rect x="${f1(x + 10 * s)}" y="${f1(vy + 10 * s)}" width="${f1(vw - 20 * s)}" height="${f1(vw - 20 * s)}" stroke-width="${f1(1.5 * s)}"/></g>`);
      d.text(`seat_${i}`, x + vw / 2, vy + 52 * s, 22 * s, { role, family: "grot", resolved: g.family, anchor: "middle", tracking: 80, box: [x + 14 * s, vy + 30 * s, vw - 28 * s, 28 * s] });
      d.text(`verdict_${i}`, x + vw / 2, vy + 156 * s, 84 * s, { role, family: "head", anchor: "middle", content: deny ? "否" : "可", box: [x + 14 * s, vy + 76 * s, vw - 28 * s, 96 * s] });
    }
    if (p.scanlines) scanlines(d, gx, gy, gw, gh, s, 0.1);
    d.zone("board", "safe", [0, 0, W, H], { slots: ["label", "ratio", "threshold", "vote_label"] });
  },
};

module.exports = { LAYOUTS, COMPRESS, HEX, CARD, ARCHIVO, segText, hexPts };
