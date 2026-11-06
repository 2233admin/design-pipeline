"use strict";

// Layouts of the megastructure-ink style pack (styles/megastructure-ink/style.json): the grammar of
// manga and anime about endless megastructures, measured privately on reference images (never shipped)
// and proven on the original kit 《穹井》 VAULTWELL (examples/megastructure-ink-kit). Black and cold
// grey with one light (signal), white hairline HUD frames on black, monitor panels with scanlines,
// structure drawn as an abstract ink line system (a one-point-perspective shaft: frames, walls with
// screentone, ribs, beams, cables; never a figure, a vehicle or an object), a scale marker that states
// the person-to-structure ratio in numbers, and the kit's own rail script. Geometry in 1920 units.

const { f1, esc, rng, invalid } = require("./layout-kit.cjs");

// ---- rail script: the kit's own glyphs (same algorithm as examples/megastructure-ink-kit/templates/glyphs.js)
const RAIL = { CELL: 4, GAP: 1.5, WORD: 3, H: 7.6, SPANS: [[0, 4], [0, 2.5], [1.5, 4], [1, 3]], ROWS: [0, 2.5, 5] };
function railHash(cp) {
  let x = (cp * 2654435761) >>> 0;
  x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995) >>> 0; x ^= x >>> 15;
  return x >>> 0;
}
function railGlyph(cp) {
  const h = railHash(cp);
  let rows = [0, 1, 2].filter((i) => (h >> i) & 1);
  if (rows.length < 2) rows = [0, 2];
  const rects = rows.map((i) => { const s = RAIL.SPANS[(h >> (3 + i * 2)) & 3]; return [s[0], RAIL.ROWS[i], s[1] - s[0], 1]; });
  const side = (h >> 9) & 1 ? 3 : 0;
  const top = RAIL.ROWS[rows[0]], bottom = (h >> 10) & 1 ? 7 : RAIL.ROWS[rows[rows.length - 1]] + 1;
  rects.push([side, top, 1, bottom - top]);
  if ((h >> 11) & 1) rects.push([side === 0 ? 1.4 : 1.6, (h >> 12) & 1 ? 1.25 : 3.75, 1, 1]);
  return rects;
}
function railLayout(text) {
  const rects = []; let x = 0, wordStart = 0;
  const close = () => { if (x > wordStart) rects.push([wordStart, 7, x - wordStart - RAIL.GAP, 0.6]); };
  for (const ch of [...String(text)]) {
    if (/\s/.test(ch)) { close(); x += RAIL.WORD; wordStart = x; continue; }
    for (const [rx, ry, rw, rh] of railGlyph(ch.codePointAt(0))) rects.push([x + rx, ry, rw, rh]);
    x += RAIL.CELL + RAIL.GAP;
  }
  close();
  return { rects, width: Math.max(0, x - RAIL.GAP), height: RAIL.H };
}
// Rail script at (x, top) with height h px (decoration). Returns the drawn width.
function rail(d, text, x, y, h, color) {
  const { rects, width } = railLayout(text); const k = h / RAIL.H;
  d.raw(`<path data-deco="1" d="${rects.map(([rx, ry, rw, rh]) => `M${f1(x + rx * k)} ${f1(y + ry * k)}h${f1(rw * k)}v${f1(rh * k)}h${f1(-rw * k)}z`).join("")}" fill="${color}"/>`);
  return width * k;
}

// ---- the structure plate: an abstract shaft drawn as an ink line system ------------------------
function tonePatterns(d, s) {
  if (d.inkTones) return;
  const p = Math.max(3, 6 * s);
  [0.12, 0.28, 0.48, 0.7].forEach((v, i) => {
    const r = Math.sqrt((v * p * p) / Math.PI);
    d.def(`<pattern id="ink-tone-${i}" width="${f1(p)}" height="${f1(p)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${f1(p)}" height="${f1(p)}" fill="${d.pal.paper}"/><circle cx="${f1(p / 2)}" cy="${f1(p / 2)}" r="${f1(r)}" fill="${d.pal.ink}"/></pattern>`);
  });
  d.inkTones = true;
}
const lerp = (a, b, t) => a + (b - a) * t;
const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const qp = (Q, u, v) => lp(lp(Q[0], Q[1], u), lp(Q[3], Q[2], u), v);
const poly = (pts) => `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}Z`;

// A shaft in one-point perspective inside box [x, y, w, h]: frames shrink toward the vanishing point
// (ratio about 0.84 a level), each wall face filled with screentone by depth, panel seams, ribs that run
// through several levels, beams across, cables between the walls; the core goes black with one light slit.
function shaft(d, [bx, by, bw, bh], s, { seed = 11, vx = 0.42, vy = 0.44, levels = 18, roll = -6 } = {}) {
  tonePatterns(d, s);
  const r = rng(seed); const vp = [bx + bw * vx, by + bh * vy];
  const F = []; let k = 1.3;
  for (let i = 0; i <= levels; i += 1) {
    F.push([[vp[0] - (vp[0] - bx) * k, vp[1] - (vp[1] - by) * k], [vp[0] + (bx + bw - vp[0]) * k, vp[1] - (vp[1] - by) * k], [vp[0] + (bx + bw - vp[0]) * k, vp[1] + (by + bh - vp[1]) * k], [vp[0] - (vp[0] - bx) * k, vp[1] + (by + bh - vp[1]) * k]]);
    k *= 0.8 + r() * 0.08;
  }
  const lit = [0, 1, 3, 1]; // tone step added per face: top, right, bottom, left
  let fills = ""; let lines = ""; let dark = "";
  for (let i = levels - 1; i >= 0; i -= 1) {
    const A = F[i], B = F[i + 1], depth = i / levels, lw = Math.max(0.6, 2.6 * s * Math.pow(0.86, i));
    const faces = [[A[0], A[1], B[1], B[0]], [A[1], A[2], B[2], B[1]], [A[2], A[3], B[3], B[2]], [A[3], A[0], B[0], B[3]]];
    faces.forEach((Q, fi) => {
      const step = Math.min(4, Math.floor(depth * 4.4) + lit[fi]);
      if (step >= 4) dark += poly(Q); else fills += `<path d="${poly(Q)}" fill="url(#ink-tone-${step})"/>`;
      const cuts = 1 + Math.floor(r() * (2 + depth * 4));
      for (let c = 1; c <= cuts; c += 1) { const u = c / (cuts + 1) + (r() - 0.5) * 0.1; lines += `<path d="M${qp(Q, u, 0).map(f1).join(" ")}L${qp(Q, u, 1).map(f1).join(" ")}" stroke-width="${f1(lw * 0.5)}"/>`; }
      if (r() < 0.22) { const u = r() * 0.7, v = 0.2 + r() * 0.3; dark += poly([qp(Q, u, v), qp(Q, u + 0.18, v), qp(Q, u + 0.18, v + 0.45), qp(Q, u, v + 0.45)]); }
    });
    lines += `<path d="${poly(B)}" stroke-width="${f1(i % 3 === 0 ? lw * 1.1 : lw * 0.5)}"/>`;
    if (i === Math.floor(levels * 0.4)) { // a beam across the shaft
      const t0 = 0.58; const Q = [lp(A[0], A[3], t0), lp(A[1], A[2], t0), lp(A[1], A[2], t0 + 0.08), lp(A[0], A[3], t0 + 0.08)];
      fills += `<path d="${poly(Q)}" fill="url(#ink-tone-0)"/>`;
      dark += poly([Q[3], Q[2], lp(B[1], B[2], t0 + 0.08), lp(B[0], B[3], t0 + 0.08)]);
      for (let c = 1; c < 12; c += 1) lines += `<path d="M${qp(Q, c / 12, 0).map(f1).join(" ")}L${qp(Q, c / 12, 1).map(f1).join(" ")}" stroke-width="${f1(lw * 0.5)}"/>`;
      lines += `<path d="${poly(Q)}" stroke-width="${f1(lw)}"/>`;
    }
    if (r() < 0.4) { const a = lp(A[3], A[0], 0.2 + r() * 0.6), b = lp(A[1], A[2], 0.1 + r() * 0.6), sag = Math.abs(b[0] - a[0]) * (0.05 + r() * 0.15); for (let c = 0; c < 1 + Math.floor(r() * 4); c += 1) lines += `<path d="M${f1(a[0])} ${f1(a[1] + c * lw * 2)}Q${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2 + sag + c * lw * 2)} ${f1(b[0])} ${f1(b[1] + c * lw)}" stroke-width="${f1(lw * 0.7)}"/>`; }
  }
  // ribs: dark bands along depth through several levels
  for (let n = 0; n < 4; n += 1) {
    const f = Math.floor(r() * 4), u = 0.08 + r() * 0.8, w = 0.015 + r() * 0.03, to = 4 + Math.floor(r() * levels * 0.5);
    for (let i = 0; i < to; i += 1) { const A = F[i], B = F[i + 1]; const Q = [[A[0], A[1], B[1], B[0]], [A[1], A[2], B[2], B[1]], [A[2], A[3], B[3], B[2]], [A[3], A[0], B[0], B[3]]][f]; dark += poly([qp(Q, u, 0), qp(Q, u + w, 0), qp(Q, u + w, 1), qp(Q, u, 1)]); }
  }
  const core = F[levels]; const slitY = lerp(core[0][1], core[3][1], 0.55);
  d.def(`<clipPath id="ink-shaft-${d.shaftN = (d.shaftN || 0) + 1}"><rect x="${f1(bx)}" y="${f1(by)}" width="${f1(bw)}" height="${f1(bh)}"/></clipPath>`);
  d.raw(`<g data-deco="1" clip-path="url(#ink-shaft-${d.shaftN})"><g transform="rotate(${f1(roll)} ${f1(vp[0])} ${f1(vp[1])})"><rect x="${f1(bx - bw)}" y="${f1(by - bh)}" width="${f1(bw * 3)}" height="${f1(bh * 3)}" fill="${d.pal.ink}"/>${fills}<path d="${dark}${poly(core)}" fill="${d.pal.ink}"/><g fill="none" stroke="${d.pal.ink}">${lines}</g><rect x="${f1(lerp(core[0][0], core[1][0], 0.2))}" y="${f1(slitY)}" width="${f1((core[1][0] - core[0][0]) * 0.6)}" height="${f1(Math.max(1.5, 2 * s))}" fill="${d.pal.paper}"/></g></g>`);
  return vp;
}

// An image slot the default render keeps empty: the drawn plate stands in for it; a filled slot or
// mode "slot" shows the picture or its placeholder instead.
function plateSlot(d, name, box, mode, note, draw) {
  const { spec, text } = d.value(name);
  if (mode === "slot" || String(text).startsWith("data:image/")) { d.image(name, ...box, note); return; }
  d.raw(`<g ${d.slotAttrs(name, spec, { box })} data-ground="${d.pal[spec.ground]}" data-layer="${spec.layer}"></g>`);
  draw();
}

// ---- shared parts ------------------------------------------------------------------------------
const NUM = /^[−\-]?[\d,.]+$/;
function numberSlot(d, name) {
  const { text } = d.value(name);
  if (!NUM.test(String(text))) throw invalid(`slot ${name} is a readout (digits, , and . with an optional minus sign), got ${JSON.stringify(text)}. Fix: --set ${name}=−41,200 ; put words in the label`);
}
function capsSlot(d, name) {
  const { text } = d.value(name);
  if (!/^[A-Z0-9 .:/·\-]+$/.test(String(text))) throw invalid(`slot ${name} is a Latin caps line (A-Z, digits, space . : / · -), got ${JSON.stringify(text)}. Fix: --set ${name}=SOUNDING ; put CJK in the label slot`);
}
// A bilingual label: CJK over a caps line.
function bi(d, zh, en, x, y, s, { role = "text", en2 = "faint", size = 13 } = {}) {
  capsSlot(d, en);
  d.text(zh, x, y + size * s, size * s, { role, family: "body", weight: 400, tracking: 200, box: [x - 2 * s, y - 2 * s, 140 * s, (size + 6) * s] });
  d.text(en, x, y + (size + 15) * s, 12 * s, { role: en2, family: "wide", tracking: 220, box: [x - 2 * s, y + (size + 4) * s, 240 * s, 17 * s] });
}
// HUD frame: four hairline corners (decoration).
function corners(d, [x, y, w, h], s, role = "line", arm = 14) {
  const a = arm * s; const c = d.pal[role];
  d.raw(`<path data-deco="1" d="M${f1(x)} ${f1(y + a)}V${f1(y)}H${f1(x + a)}M${f1(x + w - a)} ${f1(y)}H${f1(x + w)}V${f1(y + a)}M${f1(x + w)} ${f1(y + h - a)}V${f1(y + h)}H${f1(x + w - a)}M${f1(x + a)} ${f1(y + h)}H${f1(x)}V${f1(y + h - a)}" fill="none" stroke="${c}" stroke-width="${f1(Math.max(1, (role === "alarm" ? 2 : 1) * s))}"/>`);
}
// Scale marker: a person-height tick beside a structure bracket, with the ratio.
function scaleMarker(d, x, y, s, len = 420) {
  d.rect(x - 10 * s, y - 14 * s, (len + 40) * s, 62 * s, "scrim");
  d.raw(`<g data-deco="1" fill="none" stroke="${d.pal.line}" stroke-width="${f1(Math.max(1, s))}"><path d="M${f1(x)} ${f1(y)}v${f1(10 * s)}"/><path d="M${f1(x + 14 * s)} ${f1(y)}v${f1(10 * s)}H${f1(x + (14 + len) * s)}v${f1(-10 * s)}"/></g>`);
  d.text("scale_small", x, y + 34 * s, 12 * s, { role: "text", family: "data", box: [x - 2 * s, y + 20 * s, 60 * s, 18 * s] });
  d.text("scale_large", x + 90 * s, y + 34 * s, 12 * s, { role: "text", family: "data", box: [x + 88 * s, y + 20 * s, 90 * s, 18 * s] });
  d.text("scale_ratio", x + (14 + len) * s, y + 34 * s, 12 * s, { role: "signal", family: "data", anchor: "end", box: [x + (len - 110) * s, y + 20 * s, 126 * s, 18 * s] });
}
function readout(d, k, x, y, s, role = "text") {
  numberSlot(d, `value_${k}`);
  d.rect(x, y, Math.max(1, s), 70 * s, role === "signal" ? "signal" : "line");
  bi(d, `label_${k}`, `label_en_${k}`, x + 12 * s, y, s, { size: 12 });
  d.text(`value_${k}`, x + 12 * s, y + 66 * s, 28 * s, { role, family: "data", box: [x + 10 * s, y + 38 * s, 200 * s, 34 * s] });
}
function scanlines(d, [x, y, w, h], s) {
  const p = Math.max(2, 3 * s);
  d.def(`<pattern id="ink-scan" width="4" height="${f1(p)}" patternUnits="userSpaceOnUse"><rect y="${f1(p - Math.max(1, s))}" width="4" height="${f1(Math.max(1, s))}" fill="${d.pal.scanline}"/></pattern>`);
  d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="url(#ink-scan)" opacity=".55"/>`);
}
// Monitor label plate: icon tile, dark plate with a thin label and caps, a caption.
function plate(d, x, y, s, { tone = "panel" } = {}) {
  const tile = tone === "alarm" ? "alarm" : tone === "screen" ? "signal" : "line";
  const body = tone === "alarm" ? "alarm_dim" : tone === "screen" ? "screen" : "panel";
  d.rect(x, y, 40 * s, 44 * s, tile);
  d.raw(`<path data-deco="1" d="M${f1(x + 12 * s)} ${f1(y + 30 * s)}v-6M${f1(x + 17 * s)} ${f1(y + 30 * s)}v-10M${f1(x + 22 * s)} ${f1(y + 30 * s)}v-14M${f1(x + 27 * s)} ${f1(y + 30 * s)}v-8" stroke="${d.pal[tone === "panel" ? "ink" : tone === "screen" ? "on_signal" : "on_alarm"]}" stroke-width="${f1(1.5 * s)}"/>`);
  d.rect(x + 40 * s, y, 160 * s, 44 * s, body, `stroke="${d.pal[tone === "alarm" ? "alarm" : "rule2"]}" stroke-width="${f1(Math.max(1, s))}"`);
  d.text("plate", x + 54 * s, y + 21 * s, 14 * s, { role: "text", family: "body", weight: 400, tracking: 300, box: [x + 52 * s, y + 4 * s, 140 * s, 22 * s] });
  capsSlot(d, "plate_en");
  d.text("plate_en", x + 54 * s, y + 37 * s, 12 * s, { role: tone === "panel" ? "faint" : tone === "screen" ? "signal" : "alarm", family: "wide", tracking: 240, box: [x + 52 * s, y + 24 * s, 140 * s, 16 * s] });
  d.text("plate_note", x + 52 * s, y + 62 * s, 12 * s, { role: "faint", family: "data", box: [x + 50 * s, y + 49 * s, 150 * s, 17 * s] });
}

const STREAM = ["line open", "echo late", "no reply", "keep silent", "listen", "carrier lost"]; // rail-script stream words (decoration)

const LAYOUTS = {
  // ---- key visual: the shaft plate, the scale marker, the name and three readouts: 1920 x 1080 ----
  "kv.ink-shaft-hero"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "void");
    plateSlot(d, "plate", [0, 0, W, H * 0.7], p.plate, "structure plate 3840 x 2160, no figure", () => shaft(d, [0, 0, W, H * 0.7], s, { seed: p.seed_plate, vx: 0.24, vy: 0.56, roll: -7 }));
    // the black floor the type stands on (66% down), with a hairline seam
    d.rect(0, H * 0.66, W, H * 0.34, "void");
    d.raw(`<rect data-deco="1" x="0" y="${f1(H * 0.66)}" width="${f1(W)}" height="${f1(Math.max(1, s))}" fill="${d.pal.rule2}"/>`);
    scaleMarker(d, 900 * s, 360 * s, s);
    const tx = 64 * s; let y = 742 * s;
    const kw = rail(d, String(d.value("title_latin").text).toLowerCase(), tx, y, 10 * s, d.pal.line);
    d.text("kicker", tx + kw + 12 * s, y + 10 * s, 12 * s, { role: "faint", family: "body", weight: 400, tracking: 80, box: [tx + kw + 10 * s, y - 4 * s, 300 * s, 18 * s] });
    y += 30 * s;
    const { text: name } = d.value("title_cjk"); const size = 128 * s; const cw = [...String(name)].length * size * 0.78;
    d.text("title_cjk", 0, size * 0.88, size, { role: "text", family: "head", weight: 900, transform: `translate(${f1(tx)} ${f1(y)}) scale(0.78 1)`, box: [tx, y, cw + 4 * s, size * 1.02] });
    y += size + 12 * s;
    capsSlot(d, "title_latin");
    d.text("title_latin", tx, y + 12 * s, 12 * s, { role: "muted", family: "wide", tracking: 500, box: [tx - 2 * s, y, 400 * s, 18 * s] });
    d.text("tagline", tx, y + 48 * s, 16 * s, { role: "text", family: "body", weight: 300, tracking: 40, box: [tx - 2 * s, y + 30 * s, 480 * s, 24 * s] });
    const by = y + 74 * s;
    d.rect(tx, by, 162 * s, 48 * s, "signal");
    d.text("cta", tx + 81 * s, by + 30 * s, 15 * s, { role: "on_signal", family: "body", weight: 400, anchor: "middle", tracking: 200, box: [tx + 8 * s, by + 10 * s, 146 * s, 26 * s] });
    for (let k = 1; k <= 3; k += 1) readout(d, k, (1236 + (k - 1) * 192) * s, 936 * s, s, k === 1 ? "signal" : "text");
  },

  // ---- top bar: rail-script mark, compressed name, nav with depths: 1920 x 56 --------------------
  "ui.ink-topbar"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "ground");
    d.raw(`<rect data-deco="1" x="0" y="${f1(H - Math.max(1, s))}" width="${f1(W)}" height="${f1(Math.max(1, s))}" fill="${d.pal.rule2}"/>`);
    const bw = rail(d, String(d.value("brand_latin").text).toLowerCase(), 24 * s, 23 * s, 10 * s, d.pal.line);
    const bx = 24 * s + bw + 12 * s; const { text: name } = d.value("brand_cjk"); const nw = [...String(name)].length * 26 * s * 0.78;
    d.text("brand_cjk", 0, 23 * s, 26 * s, { role: "text", family: "head", weight: 900, transform: `translate(${f1(bx)} ${f1(14 * s)}) scale(0.78 1)`, box: [bx, 13 * s, nw + 2 * s, 29 * s] });
    capsSlot(d, "brand_latin");
    d.text("brand_latin", bx + nw + 14 * s, 32 * s, 12 * s, { role: "faint", family: "wide", tracking: 300, box: [bx + nw + 12 * s, 21 * s, 130 * s, 15 * s] });
    let x = 318 * s;
    for (let i = 1; i <= 7; i += 1) {
      const on = i === p.current; numberSlot(d, `depth_${i}`);
      const { text: zh } = d.value(`nav_${i}`); const w = Math.max([...String(zh)].length * 13 * 1.2, 44) * s + 24 * s;
      d.text(`nav_${i}`, x + 12 * s, 26 * s, 13 * s, { role: on ? "signal" : "muted", family: "body", weight: 400, tracking: 200, box: [x + 10 * s, 11 * s, w - 20 * s, 19 * s] });
      d.text(`depth_${i}`, x + 12 * s, 42 * s, 12 * s, { role: on ? "signal" : "faint", family: "data", box: [x + 10 * s, 30 * s, w - 20 * s, 16 * s] });
      if (on) d.rect(x, H - 2 * s, w, 2 * s, "signal");
      x += w + 4 * s;
    }
    d.raw(`<rect data-deco="1" x="${f1(1690 * s)}" y="${f1(25 * s)}" width="${f1(6 * s)}" height="${f1(6 * s)}" fill="${d.pal.signal}"/>`);
    d.text("silence", 1702 * s, 33 * s, 12 * s, { role: "muted", family: "body", weight: 400, tracking: 200, box: [1700 * s, 19 * s, 40 * s, 18 * s] });
    d.rect(1748 * s, 12 * s, 92 * s, 32 * s, "signal");
    d.text("cta", 1794 * s, 33 * s, 12 * s, { role: "on_signal", family: "body", weight: 400, anchor: "middle", tracking: 200, box: [1752 * s, 18 * s, 84 * s, 20 * s] });
    d.raw(`<g data-deco="1"><rect x="${f1(1856 * s)}" y="${f1(8 * s)}" width="${f1(40 * s)}" height="${f1(40 * s)}" fill="none" stroke="${d.pal.rule2}" stroke-width="${f1(Math.max(1, s))}"/><path d="M${f1(1866 * s)} ${f1(21 * s)}h${f1(20 * s)}M${f1(1866 * s)} ${f1(28 * s)}h${f1(20 * s)}M${f1(1866 * s)} ${f1(35 * s)}h${f1(13 * s)}" stroke="${d.pal.text}" stroke-width="${f1(1.5 * s)}"/></g>`);
  },

  // ---- monitor label plate with a readout: 720 x 200 --------------------------------------------
  "card.ink-label-plate"(d) {
    const { W, H, p } = d; const s = W / 720;
    d.rect(0, 0, W, H, "void");
    corners(d, [8 * s, 8 * s, W - 16 * s, H - 16 * s], s, p.tone === "alarm" ? "alarm" : "line");
    plate(d, 40 * s, 44 * s, s, { tone: p.tone });
    numberSlot(d, "value");
    d.rect(300 * s, 44 * s, Math.max(1, s), 112 * s, p.tone === "alarm" ? "alarm" : p.tone === "screen" ? "signal" : "line");
    bi(d, "label", "label_en", 316 * s, 44 * s, s, { size: 12 });
    d.text("value", 316 * s, 140 * s, 56 * s, { role: p.tone === "alarm" ? "alarm" : p.tone === "screen" ? "signal" : "text", family: "data", box: [314 * s, 88 * s, 300 * s, 62 * s] });
    d.text("unit", 316 * s + Math.min(280, String(d.value("value").text).length * 30) * s, 140 * s, 14 * s, { role: "faint", family: "data", box: [316 * s + Math.min(280, String(d.value("value").text).length * 30) * s - 2 * s, 124 * s, 60 * s, 20 * s] });
  },

  // ---- in-game descent HUD: white hairlines on black around a viewport: 1920 x 1080 ------------
  "ui.ink-hud-frame"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "void");
    // heading ruler
    let ticks = "";
    for (let i = 0; i <= 30; i += 1) ticks += `M${f1((600 + i * 24) * s)} ${f1(84 * s)}v${f1((i % 5 === 0 ? -12 : -6) * s)}`;
    d.raw(`<path data-deco="1" d="${ticks}" stroke="${d.pal.line}" stroke-width="${f1(Math.max(1, s))}"/>`);
    d.rect(910 * s, 44 * s, 100 * s, 34 * s, "void");
    d.text("heading", 960 * s, 72 * s, 28 * s, { role: "text", family: "data", anchor: "middle", box: [912 * s, 44 * s, 96 * s, 34 * s] });
    plate(d, 32 * s, 32 * s, s, { tone: "panel" });
    // depth ladder
    numberSlot(d, "depth");
    const { text: depth } = d.value("depth"); const base = Number(String(depth).replace(/[^\d]/g, "")) || 41200;
    let lad = "";
    for (let i = 0; i < 13; i += 1) {
      const yy = (130 + i * 24) * s; const cur = i === 6;
      lad += `<path d="M${f1(250 * s)} ${f1(yy - 4 * s)}h${f1((cur ? -20 : -8) * s)}" stroke="${cur ? d.pal.signal : d.pal.line}" stroke-width="${f1(Math.max(1, s))}"/><text x="${f1(222 * s)}" y="${f1(yy)}" text-anchor="end" font-family="${esc(d.families.data)}" font-weight="500" font-size="${f1(11 * s)}" fill="${cur ? d.pal.signal : d.pal.faint}">−${(base + (6 - i) * 10).toLocaleString("en-US")}</text>`;
    }
    d.raw(`<g data-deco="1">${lad}<path d="M${f1(270 * s)} ${f1(118 * s)}V${f1(430 * s)}" stroke="${d.pal.line}" stroke-width="${f1(Math.max(1, s))}"/></g>`);
    d.rect(32 * s, 456 * s, Math.max(1, s), 76 * s, "signal");
    bi(d, "depth_label", "depth_label_en", 44 * s, 458 * s, s, { size: 12 });
    d.text("depth", 44 * s, 526 * s, 30 * s, { role: "signal", family: "data", box: [42 * s, 494 * s, 200 * s, 36 * s] });
    // viewport
    const vb = [308 * s, 132 * s, 1224 * s, 712 * s];
    plateSlot(d, "view", vb, p.view, "viewport 3840 x 2160, structure only", () => shaft(d, vb, s, { seed: p.seed_plate, vx: 0.5, vy: 0.5, roll: 0, levels: 18 }));
    corners(d, [vb[0] - 12 * s, vb[1] - 12 * s, vb[2] + 24 * s, vb[3] + 24 * s], s, "line");
    const cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
    d.raw(`<g data-deco="1" fill="none" stroke="${d.pal.line}" stroke-width="${f1(Math.max(1, s))}"><rect x="${f1(cx - 60 * s)}" y="${f1(cy - 60 * s)}" width="${f1(120 * s)}" height="${f1(120 * s)}"/><path d="M${f1(cx)} ${f1(cy - 84 * s)}v${f1(30 * s)}M${f1(cx)} ${f1(cy + 54 * s)}v${f1(30 * s)}M${f1(cx - 84 * s)} ${f1(cy)}h${f1(30 * s)}M${f1(cx + 54 * s)} ${f1(cy)}h${f1(30 * s)}"/></g>`);
    scaleMarker(d, vb[0] + 30 * s, vb[1] + vb[3] - 70 * s, s, 320);
    // gauges
    for (let g = 1; g <= 3; g += 1) {
      const gy = (128 + (g - 1) * 86) * s; const v = Math.max(0, Math.min(1, Number(p[`gauge_${g}`]))); const alarm = g === 3 && v < 0.35;
      bi(d, `gauge_${g}`, `gauge_en_${g}`, 1568 * s, gy, s, { size: 12 });
      let cells = "";
      for (let c = 0; c < 24; c += 1) cells += `<rect x="${f1((1568 + c * 13.33) * s)}" y="${f1(gy + 40 * s)}" width="${f1(11.3 * s)}" height="${f1(10 * s)}" fill="${c < Math.round(v * 24) ? (alarm ? d.pal.alarm : d.pal.line) : d.pal.rule2}"/>`;
      d.raw(`<g data-deco="1">${cells}</g>`);
    }
    // comms screen
    const cb = [32 * s, 880 * s, 920 * s, 168 * s];
    d.rect(...cb, "screen");
    scanlines(d, cb, s);
    d.text("comms", 48 * s, 910 * s, 12 * s, { role: "text", family: "body", weight: 400, tracking: 200, box: [46 * s, 896 * s, 100 * s, 18 * s] });
    for (let l = 1; l <= 3; l += 1) {
      const ly = (952 + (l - 1) * 30) * s;
      d.text(`time_${l}`, 48 * s, ly, 12 * s, { role: "signal", family: "data", box: [46 * s, ly - 13 * s, 76 * s, 17 * s] });
      d.text(`line_${l}`, 140 * s, ly, 13 * s, { role: "text", family: "body", weight: 400, box: [138 * s, ly - 14 * s, 780 * s, 19 * s] });
    }
    if (p.alert) {
      const ab = [976 * s, 944 * s, 616 * s, 104 * s];
      d.rect(...ab, "alarm_dim", `stroke="${d.pal.alarm}" stroke-width="${f1(Math.max(1, s))}"`);
      d.raw(`<path data-deco="1" d="M${f1(1012 * s)} ${f1(964 * s)}l${f1(10 * s)} ${f1(18 * s)}h${f1(-20 * s)}z" fill="none" stroke="${d.pal.alarm}" stroke-width="${f1(1.5 * s)}"/>`);
      bi(d, "alert", "alert_en", 1040 * s, 962 * s, s, { size: 15, en2: "alarm" });
      d.text("alert_text", 1040 * s, 1030 * s, 13 * s, { role: "text", family: "body", weight: 400, box: [1038 * s, 1016 * s, 540 * s, 19 * s] });
    }
  },

  // ---- switchboard terminal: monitor log, handshake steps, rail-script stream: 1920 x 640 -------
  "banner.ink-terminal"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "void");
    const tb = [64 * s, 64 * s, 1000 * s, 512 * s];
    d.rect(...tb, "screen", `stroke="${d.pal.scanline}" stroke-width="${f1(Math.max(1, s))}"`);
    scanlines(d, tb, s);
    bi(d, "title", "title_en", 84 * s, 84 * s, s, { size: 13, en2: "signal" });
    d.text("line_id", 1044 * s, 100 * s, 12 * s, { role: "signal", family: "data", anchor: "end", box: [900 * s, 88 * s, 146 * s, 16 * s] });
    d.raw(`<rect data-deco="1" x="${f1(64 * s)}" y="${f1(132 * s)}" width="${f1(1000 * s)}" height="${f1(Math.max(1, s))}" fill="${d.pal.scanline}"/>`);
    const n = Math.round(p.lines);
    for (let l = 1; l <= n; l += 1) {
      const ly = (180 + (l - 1) * 40) * s; const err = l === n && p.state === "fail";
      if (err) d.rect(76 * s, ly - 18 * s, 2 * s, 24 * s, "alarm");
      d.text(`time_${l}`, 86 * s, ly, 12 * s, { role: "signal", family: "data", box: [84 * s, ly - 13 * s, 76 * s, 17 * s] });
      d.text(`kind_${l}`, 170 * s, ly, 12 * s, { role: "signal", family: "data", box: [168 * s, ly - 13 * s, 44 * s, 17 * s] });
      d.text(`line_${l}`, 222 * s, ly, 13 * s, { role: "text", family: "body", weight: 400, box: [220 * s, ly - 14 * s, 820 * s, 19 * s] });
    }
    d.raw(`<rect data-deco="1" x="${f1(86 * s)}" y="${f1(540 * s)}" width="${f1(9 * s)}" height="${f1(14 * s)}" fill="${d.pal.signal}"/>`);
    // handshake steps
    const hx = 1112 * s; const hb = [hx, 64 * s, 744 * s, 260 * s];
    d.rect(...hb, "panel", `stroke="${d.pal.rule2}" stroke-width="${f1(Math.max(1, s))}"`);
    for (let k = 1; k <= 4; k += 1) {
      const sx = hx + 24 * s + (k - 1) * 176 * s; const done = k < 3 || (p.state !== "fail" && k < 4); const fail = p.state === "fail" && k === 3;
      d.rect(sx, 88 * s, 172 * s, 96 * s, fail ? "alarm_dim" : "ground");
      d.rect(sx, 88 * s, 172 * s, 2 * s, fail ? "alarm" : done ? "line" : "rule2");
      d.raw(`<text data-deco="1" x="${f1(sx + 12 * s)}" y="${f1(116 * s)}" font-family="${esc(d.families.data)}" font-weight="500" font-size="${f1(11 * s)}" fill="${fail ? d.pal.alarm : d.pal.faint}">0${k}</text>`);
      bi(d, `step_${k}`, `step_en_${k}`, sx + 12 * s, 130 * s, s, { size: 12, en2: fail ? "alarm" : "faint" });
    }
    d.text("message", hx + 24 * s, 220 * s, 13 * s, { role: p.state === "fail" ? "alarm" : "muted", family: "body", weight: 400, box: [hx + 22 * s, 206 * s, 700 * s, 19 * s] });
    d.rect(hx + 24 * s, 248 * s, 150 * s, 40 * s, "signal");
    d.text("send", hx + 99 * s, 274 * s, 14 * s, { role: "on_signal", family: "body", weight: 400, anchor: "middle", tracking: 200, box: [hx + 30 * s, 256 * s, 138 * s, 24 * s] });
    // rail-script stream (decoration)
    const words = STREAM;
    for (let r = 0; r < 6; r += 1) rail(d, `${words[r % words.length]} ${words[(r * 4 + 3) % words.length]}`.trim(), hx, (356 + r * 22) * s, 12 * s, d.pal.signal_dim);
  },
};

module.exports = { LAYOUTS, railLayout, shaft };
