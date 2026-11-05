"use strict";

// Layouts of the cyanotype-specimen style pack (styles/cyanotype-specimen/style.json): a trading card
// game printed as cyanotype specimen sheets (Anna Atkins' 1843 photograms: hand-brushed sensitiser
// with ragged, bristle-streaked edges, one Prussian blue, the specimen a white shadow on the blue)
// with early trading-card information positions. Rarity changes the process, not the ground colour:
// paper edge (common), silver frame (rare), tannin-toned field and copper foil (epic), full deep field
// on gold foil (legend). Geometry in card pixels (750 x 1050) from the card-game case's final
// (card.css / cards.js / pack.html, check 0). The specimen is your processed print (art slot); a
// drawn algae frond stands in until it is filled.

const { f1, rbox, rng, ngon } = require("./layout-kit.cjs");

const CW = 750; const CH = 1050;
const RARITY = {
  common: { field: "field_blue", foil: null, name: "寻常" },
  rare: { field: "field_blue", foil: "silver", name: "珍稀" },
  epic: { field: "field_tea", foil: "copper", name: "奇异" },
  legend: { field: "field_deep", foil: "gold", name: "孤品" },
};
const FOIL_LINE = { silver: "#6F879C", copper: "#7A4630", gold: "#8A6A24" };

// Hand-brushed field: a rectangle whose edges wobble (brush start and stop), with bristle streaks.
function brushedField(d, x, y, w, h, role, seed, k) {
  const r = rng(seed); const pts = []; const amp = 7 * k; const step = 18 * k;
  const wob = () => (r() - 0.5) * 2 * amp + (r() - 0.5) * 2 * 2.5 * k;
  for (let px = x; px < x + w; px += step) pts.push([px, y + Math.abs(wob())]);
  for (let py = y; py < y + h; py += step) pts.push([x + w - Math.abs(wob()), py]);
  for (let px = x + w; px > x; px -= step) pts.push([px, y + h - Math.abs(wob())]);
  for (let py = y + h; py > y; py -= step) pts.push([x + Math.abs(wob()), py]);
  d.poly(pts, role);
  const streaks = [];
  for (let i = 0; i < 26; i += 1) {
    const sy = y + 20 * k + r() * (h - 40 * k); const sx = x + 16 * k + r() * w * 0.3; const sw = w * (0.3 + r() * 0.6); const sh = (1 + r() * 3) * k;
    streaks.push(`M${f1(sx)} ${f1(sy)}h${f1(Math.min(sw, x + w - 16 * k - sx))}v${f1(sh)}h${f1(-Math.min(sw, x + w - 16 * k - sx))}z`);
  }
  d.raw(`<path data-deco="1" d="${streaks.join("")}" fill="${d.pal.paper}" opacity="0.07"/>`);
}

// Flat foil: guilloche lines over the foil colour (no gloss; a sweep of light only in motion).
function foil(d, x, y, w, h, kind, k) {
  d.rect(x, y, w, h, kind, `rx="${f1(20 * k)}"`);
  const lines = [];
  for (let n = 0; n < 64; n += 1) {
    const y0 = y + (h / 64) * n; const seg = [`M${f1(x)} ${f1(y0)}`];
    for (let px = 0; px <= w; px += 12 * k) seg.push(`L${f1(x + px)} ${f1(y0 + Math.sin(px / (23 * k) + n * 0.7) * 7 * k + Math.sin(px / (7.3 * k)) * 1.6 * k)}`);
    lines.push(seg.join(""));
  }
  d.raw(`<path data-deco="1" d="${lines.join("")}" fill="none" stroke="${FOIL_LINE[kind]}" stroke-width="${f1(1.1 * k)}"/>`);
}

// Stand-in specimen: a branching algae frond as white lines (a cyanotype photogram's subject).
function frond(d, cx, cy, size, seed, k) {
  const r = rng(seed); const paths = [];
  const branch = (x, y, ang, len, depth) => {
    if (depth > 5 || len < 6 * k) return;
    const segs = 6; let px = x; let py = y; let a = ang; const parts = [`M${f1(px)} ${f1(py)}`];
    for (let i = 0; i < segs; i += 1) {
      a += (r() - 0.5) * 0.5; px += Math.cos(a) * (len / segs); py += Math.sin(a) * (len / segs); parts.push(`L${f1(px)} ${f1(py)}`);
      if (i > 1 && r() < 0.45) branch(px, py, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * 0.55, depth + 1);
    }
    paths.push(`<path d="${parts.join("")}" stroke-width="${f1(Math.max(1, (5.5 - depth) * k))}"/>`);
  };
  for (let i = 0; i < 5; i += 1) branch(cx + (r() - 0.5) * 40 * k, cy + size * 0.48, -Math.PI / 2 + (i - 2) * 0.32, size * (0.55 + r() * 0.3), 0);
  d.raw(`<g data-deco="1" fill="none" stroke="${d.pal.specimen}" stroke-linecap="round" opacity="0.92">${paths.join("")}</g>`);
}

const SIGIL = {
  common: (c) => `<circle cx="16" cy="16" r="9" fill="none" stroke="${c}" stroke-width="3"/>`,
  rare: (c) => `<path d="M16 3L27 16L16 29L5 16Z" fill="none" stroke="${c}" stroke-width="3"/><path d="M16 10L21 16L16 22L11 16Z" fill="${c}"/>`,
  epic: (c) => `<path d="M16 3L27 22H5ZM16 29L5 10H27Z" fill="none" stroke="${c}" stroke-width="2.5"/>`,
  legend: (c) => `<circle cx="16" cy="16" r="6" fill="${c}"/>${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; const r1 = i % 2 ? 13 : 15.5; return `<line x1="${f1(16 + Math.cos(a) * 9)}" y1="${f1(16 + Math.sin(a) * 9)}" x2="${f1(16 + Math.cos(a) * r1)}" y2="${f1(16 + Math.sin(a) * r1)}" stroke="${c}" stroke-width="2.4"/>`; }).join("")}`,
};
const SIGIL_COLOUR = { common: "paper", rare: "silver_light", epic: "copper_light", legend: "gold_light" };

// One card at (x, y) and scale k (1 = 750 x 1050), rotated by deg about its centre.
// full = the full card template (every text slot); otherwise a miniature on the pack screen
// (cost, name, rarity and stats only: the rules are below 12 px at that scale).
function card(d, o) {
  const { x, y, k, deg = 0, rarity, prefix = "", full = true } = o;
  const R = RARITY[rarity]; const legend = rarity === "legend";
  const c = [x + (CW * k) / 2, y + (CH * k) / 2];
  const at = (px, py) => [x + px * k, y + py * k];
  const box = (px, py, w, h) => rbox([x + px * k, y + py * k, w * k, h * k], deg, c, 2 * k);
  const slot = (name) => (full ? name : `${prefix}${name}`);
  d.raw(`<g transform="rotate(${f1(deg)} ${f1(c[0])} ${f1(c[1])})">`);
  if (R.foil) foil(d, x, y, CW * k, CH * k, R.foil, k);
  if (!legend) d.rect(...(R.foil ? at(18, 18) : at(0, 0)), (R.foil ? CW - 36 : CW) * k, (R.foil ? CH - 36 : CH) * k, "paper", `rx="${f1((R.foil ? 8 : 20) * k)}"`);
  else d.rect(...at(20, 20), 710 * k, 1010 * k, "paper", `rx="${f1(6 * k)}"`);
  const fx = legend ? 20 : R.foil ? 36 : 30; const fy = fx; const fw = legend ? 710 : R.foil ? 678 : 690; const fh = legend ? 1010 : R.foil ? 630 : 640;
  brushedField(d, ...at(fx, fy), fw * k, fh * k, R.field, (o.seed || 7) + rarity.length, k);
  if (rarity === "rare") {
    d.raw(`<g data-deco="1" fill="none" stroke="${d.pal.silver_light}"><rect x="${f1(x + 48 * k)}" y="${f1(y + 48 * k)}" width="${f1(654 * k)}" height="${f1(604 * k)}" stroke-width="${f1(3 * k)}"/><rect x="${f1(x + 41 * k)}" y="${f1(y + 41 * k)}" width="${f1(668 * k)}" height="${f1(618 * k)}" stroke-width="${f1(1 * k)}"/><path d="M${f1(x + 36 * k)} ${f1(y + 80 * k)}V${f1(y + 36 * k)}H${f1(x + 80 * k)}M${f1(x + 714 * k)} ${f1(y + 620 * k)}V${f1(y + 664 * k)}H${f1(x + 670 * k)}" stroke-width="${f1(4 * k)}"/></g>`);
  }
  // the specimen: your print in the art slot, a drawn frond until then
  if (full && d.values.art) d.image("art", ...at(70, 204), 610 * k, 0);
  else { if (full) d.image("art", ...at(70, 204), 610 * k, 0); frond(d, ...at(375, 380), 300 * k, (o.seed || 7) * 13, k); }
  if (legend) d.rect(...at(20, 628), 710 * k, 48 * k, "deep_band");
  // cost, name, latin name
  if (legend) {
    d.raw(`<path data-deco="1" d="${ngon(x + 92 * k, y + 96 * k, 56 * k, 40)}" fill="${d.pal.gold}"/>`);
    d.raw(`<path d="${ngon(x + 92 * k, y + 96 * k, 52 * k, 40)}" fill="${d.pal.deep_band}"/>`);
    d.text(slot("cost"), ...at(92, 124), 76 * k, { role: "paper", family: "serif", weight: 900, anchor: "middle", box: box(48, 52, 88, 88) });
    if (full) d.text("cost_label", ...at(92, 178), 18 * k, { role: "gold_light", family: "serif", weight: 700, tracking: 300, anchor: "middle", box: box(52, 160, 84, 26) });
    d.rect(...at(150, 48), 330 * k, 80 * k, "gold");
    d.text(slot("name"), ...at(170, 108), 52 * k, { role: "ink", family: "serif", weight: 900, tracking: 60, box: box(160, 52, 316, 72) });
    if (full) { d.rect(...at(170, 130), 300 * k, 40 * k, "deep_band"); d.text("latin", ...at(180, 160), 26 * k, { role: "gold_light", family: "latin", weight: 500, italic: true, box: box(174, 132, 292, 36) }); }
  } else {
    d.text(slot("cost"), ...at(124, 190), 140 * k, { role: "paper", family: "serif", weight: 900, anchor: "middle", box: box(66, 56, 116, 150) });
    d.text(slot("name"), ...at(182, 134), 56 * k, { role: "paper", family: "serif", weight: 900, tracking: 60, box: box(176, 76, 490, 70) });
    if (full) d.text("latin", ...at(186, 176), 26 * k, { role: "latin_light", family: "latin", weight: 500, italic: true, box: box(182, 152, 480, 34) });
  }
  // type line and rarity sigil
  const ty = legend ? 641 : 584;
  if (full) d.text("type", ...at(legend ? 62 : 78, ty + 23), 22 * k, { role: "paper", family: "sans", weight: 600, tracking: 120, box: box(legend ? 58 : 74, ty, 300, 32) });
  d.raw(`<g data-deco="1" transform="translate(${f1(x + (legend ? 560 : 576) * k)} ${f1(y + (ty - 2) * k)}) scale(${(30 / 32 * k).toFixed(4)})">${SIGIL[rarity](d.pal[SIGIL_COLOUR[rarity]])}</g>`);
  d.text(slot("rarity_name"), ...at(legend ? 688 : 672, ty + 23), 22 * k, { role: "paper", family: "sans", weight: 600, tracking: 120, anchor: "end", content: full && d.values.rarity_name ? undefined : R.name, box: box(legend ? 600 : 612, ty, 92, 32) });
  // rules box (a tilted paper label on the legend), stats, collector line
  if (full) {
    const bx = legend ? 44 : 56; const by = legend ? 690 : 700;
    if (legend) {
      const lc = [x + (bx + 331) * k, y + (by + 125) * k];
      d.raw(`<g transform="rotate(-1.6 ${f1(lc[0])} ${f1(lc[1])})">`);
      d.rect(...at(bx, by + 3), 662 * k, 250 * k, "ink", "opacity=\"0.25\" data-deco=\"1\"");
      d.rect(...at(bx, by), 662 * k, 250 * k, "paper");
    }
    const lb = (px, py, w, h) => (legend ? rbox(box(px, py, w, h), -1.6, [x + (bx + 331) * k, y + (by + 125) * k], 2 * k) : box(px, py, w, h));
    const ix = bx + (legend ? 24 : 0); const iy = by + (legend ? 20 : 0);
    d.raw(`<g data-deco="1" transform="translate(${f1(x + ix * k)} ${f1(y + (iy + 6) * k)}) scale(${(26 / 24 * k).toFixed(4)})" fill="none" stroke="${d.pal.blue_ink}" stroke-width="2"><path d="M15 3a9 9 0 1 0 6 13A8 8 0 0 1 15 3z"/><path d="M9 10l3 1M9 13l4 1M10 16l3 1" stroke-width="1.2"/></g>`);
    d.text("keyword", ...at(ix + 32, iy + 28), 27 * k, { role: "ink", family: "sans", weight: 800, box: lb(ix + 28, iy, 200, 38) });
    d.text("rules", ...at(ix, iy + 70), 27 * k, { role: "ink", family: "sans", weight: 500, lineHeight: 1.52, box: lb(ix - 2, iy + 40, 638 - (legend ? 48 : 0), 90) });
    d.text("flavor", ...at(ix, iy + 168), 21 * k, { role: "flavor", family: "serif", weight: 400, box: lb(ix - 2, iy + 146, 638 - (legend ? 48 : 0), 32) });
    if (legend) d.raw("</g>");
  }
  if (!full) d.raw(`<path data-deco="1" d="${[0, 1, 2].map((i) => `M${f1(x + 56 * k)} ${f1(y + (730 + i * 44) * k)}h${f1((i === 2 ? 380 : 620) * k)}v${f1(10 * k)}h${f1(-(i === 2 ? 380 : 620) * k)}z`).join("")}" fill="${d.pal[legend ? "paper" : "credit_ink"]}" opacity="0.3"/>`);
  const pty = CH - 40;
  const statRole = legend ? "paper" : "ink"; const slashRole = legend ? "gold_light" : "slash";
  d.text(slot("atk"), ...at(52, pty - 10), 58 * k, { role: statRole, family: "serif", weight: 900, box: box(48, pty - 66, 70, 66) });
  d.raw(`<path data-deco="1" d="M${f1(x + 128 * k)} ${f1(y + (pty - 4) * k)}L${f1(x + 146 * k)} ${f1(y + (pty - 50) * k)}" stroke="${d.pal[slashRole]}" stroke-width="${f1(3 * k)}"/>`);
  d.text(slot("hp"), ...at(158, pty - 10), 58 * k, { role: statRole, family: "serif", weight: 900, box: box(154, pty - 66, 70, 66) });
  if (full) {
    if (legend) d.rect(...at(54, CH - 32), 92 * k, 22 * k, "deep_band");
    d.text("stat_label", ...at(58, CH - (legend ? 16 : 23)), 14 * k, { role: legend ? "gold_light" : "stat_ink", family: "sans", weight: 600, tracking: 300, box: box(54, CH - (legend ? 32 : 39), 96, 22) });
    d.text("collector", ...at(CW - 56, CH - 52), 14 * k, { role: legend ? "gold_pale" : "credit_ink", family: "sans", weight: 500, tracking: 40, anchor: "end", box: box(CW - 420, CH - 68, 366, 22) });
    d.text("credit", ...at(CW - 56, CH - 30), 14 * k, { role: legend ? "gold_pale" : "credit_ink", family: "sans", weight: 500, tracking: 40, anchor: "end", box: box(CW - 420, CH - 46, 366, 22) });
  }
  d.raw("</g>");
}

function cardBack(d, x, y, k, deg, gold, name) {
  const c = [x + (CW * k) / 2, y + (CH * k) / 2];
  d.raw(`<g transform="rotate(${f1(deg)} ${f1(c[0])} ${f1(c[1])})">`);
  d.rect(x, y, CW * k, CH * k, "back", `rx="${f1(20 * k)}"`);
  if (gold) d.raw(`<rect data-deco="1" x="${f1(x - 8 * k)}" y="${f1(y - 8 * k)}" width="${f1((CW + 16) * k)}" height="${f1((CH + 16) * k)}" rx="${f1(26 * k)}" fill="none" stroke="${d.pal.gold_light}" stroke-width="${f1(10 * k)}"/>`);
  brushedField(d, x + 95 * k, y + 145 * k, 560 * k, 760 * k, "field_deep", 3, k);
  d.raw(`<g data-deco="1" fill="none" stroke="${d.pal.gold_light}"><path d="${ngon(c[0], c[1], 150 * k, 48)}" stroke-width="${f1(3 * k)}"/><path d="${ngon(c[0], c[1], 134 * k, 48)}" stroke-width="${f1(2 * k)}"/></g>`);
  d.text(name, c[0], c[1] + 14 * k, 40 * k, { role: "gold_light", family: "latin", weight: 700, tracking: 400, anchor: "middle", box: rbox([c[0] - 140 * k, c[1] - 24 * k, 280 * k, 50 * k], deg, c, 2 * k) });
  d.raw("</g>");
}

const LAYOUTS = {
  "card.tcg-frame"(d) {
    const k = d.W / CW;
    card(d, { x: 0, y: 0, k, rarity: d.p.rarity, seed: d.p.field_seed });
  },

  "ui.pack-open"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "table");
    const r = rng(11); const grain = [];
    for (let i = 0; i < 120; i += 1) { const gy = r() * H; grain.push(`M0 ${f1(gy)}h${f1(W)}v${f1((0.5 + r() * 1.5) * s)}h${f1(-W)}z`); }
    d.raw(`<path data-deco="1" d="${grain.join("")}" fill="${d.pal.paper}" opacity="0.025"/>`);
    d.text("title", 64 * s, 84 * s, 44 * s, { role: "paper", family: "serif", weight: 900, tracking: 100, box: [60 * s, 36 * s, 600 * s, 56 * s] });
    d.text("subtitle", 64 * s, 118 * s, 19 * s, { role: "pale", family: "sans", weight: 500, tracking: 80, box: [60 * s, 100 * s, 760 * s, 26 * s] });
    // currency chips
    const chipW = [176, 128];
    let cx = W - 64 * s;
    for (let i = 1; i >= 0; i -= 1) {
      const w = chipW[i] * s; cx -= w;
      d.rect(cx, 44 * s, w, 40 * s, "chip");
      d.raw(`<rect data-deco="1" x="${f1(cx + 0.75 * s)}" y="${f1(44.75 * s)}" width="${f1(w - 1.5 * s)}" height="${f1(38.5 * s)}" fill="none" stroke="${d.pal.gold_light}" stroke-width="${f1(1.5 * s)}"/>`);
      if (i === 0) d.raw(`<rect data-deco="1" x="${f1(cx + 16 * s)}" y="${f1(57 * s)}" width="${f1(14 * s)}" height="${f1(14 * s)}" transform="rotate(45 ${f1(cx + 23 * s)} ${f1(64 * s)})" fill="${d.pal.gold_light}"/>`);
      d.text(`wallet_${i}`, cx + (i === 0 ? 40 : 16) * s, 71 * s, 20 * s, { role: "paper", family: "sans", weight: 700, tracking: 40, box: [cx + (i === 0 ? 36 : 12) * s, 48 * s, w - (i === 0 ? 44 : 20) * s, 32 * s] });
      cx -= 14 * s;
    }
    // the opened pack, its flap torn up
    const px = 196 * s; const py = 600 * s; const pk = 0.62 * s; const pw = 380 * pk; const ph = 540 * pk; const pc = [px, py];
    d.raw(`<g transform="rotate(-6 ${f1(pc[0])} ${f1(pc[1])})">`);
    const zig = [];
    for (let i = 0; i <= 16; i += 1) zig.push([px - pw / 2 + (pw * i) / 16, py - ph / 2 + (i % 2 ? 63 : 71) * pk]);
    d.poly([...zig, [px + pw / 2, py + ph / 2], [px - pw / 2, py + ph / 2]], "pack");
    brushedField(d, px - pw / 2 + 22 * pk, py - ph / 2 + 84 * pk, 336 * pk, 300 * pk, "field_blue", 5, pk);
    frond(d, px, py - ph / 2 + 240 * pk, 220 * pk, 31, pk);
    d.rect(px - pw / 2 + 22 * pk, py + ph / 2 - 126 * pk, pw - 44 * pk, 2 * pk, "ink");
    const lb = (bx, by, w, h) => rbox([bx, by, w, h], -6, pc, 2 * s);
    d.text("pack_name", px - pw / 2 + 22 * pk, py + ph / 2 - 76 * pk, 34 * pk, { role: "ink", family: "serif", weight: 900, tracking: 100, box: lb(px - pw / 2 + 18 * pk, py + ph / 2 - 114 * pk, 250 * pk, 46 * pk) });
    d.text("pack_meta", px - pw / 2 + 22 * pk, py + ph / 2 - 44 * pk, 16 * pk < 12 * s ? 12 * s : 16 * pk, { role: "credit_ink", family: "sans", weight: 600, tracking: 60, box: lb(px - pw / 2 + 18 * pk, py + ph / 2 - 62 * pk, 330 * pk, 26 * pk) });
    d.raw(`<path d="${ngon(px + pw / 2 - 62 * pk, py + ph / 2 - 84 * pk, 32 * pk, 32)}" fill="${d.pal.seal}"/>`);
    d.text("pack_seal", px + pw / 2 - 62 * pk, py + ph / 2 - 74 * pk, 26 * pk, { role: "seal_ink", family: "serif", weight: 900, anchor: "middle", box: lb(px + pw / 2 - 94 * pk, py + ph / 2 - 116 * pk, 64 * pk, 64 * pk) });
    d.raw("</g>");
    const flap = [];
    for (let i = 0; i <= 16; i += 1) flap.push([px - pw / 2 + (pw * i) / 16 + 40 * s * 0.62, py - ph / 2 + (i % 2 ? 63 : 71) * pk - 60 * s * 0.62]);
    d.raw(`<g data-deco="1" transform="rotate(12 ${f1(px - pw / 2)} ${f1(py - ph / 2)})"><polygon points="${[[px - pw / 2 + 25 * s, py - ph / 2 - 37 * s], [px + pw / 2 + 25 * s, py - ph / 2 - 37 * s], ...flap.reverse()].map(([a, b]) => `${f1(a)},${f1(b)}`).join(" ")}" fill="${d.pal.pack}"/></g>`);
    // five cards fanned on the table: revealed miniatures and face-down backs
    const FAN = [[-600, 26, -8], [-300, 0, -4], [0, -14, 0], [300, 0, 4], [600, 26, 8]];
    const SC = 0.36 * s; const fx = 1060 * s; const fy = 520 * s;
    FAN.forEach(([dx, dy, rot], i) => {
      const revealed = i < p.revealed ? true : false;
      const order = [0, 1, 3, 2, 4]; // the case reveals 1, 2 and 4 first; the hovered middle card is still down
      const shown = order.indexOf(i) < p.revealed;
      const sc = SC * (i === 2 && !shown ? 1.08 : 1);
      const x = fx + dx * s - (CW * sc) / 2; const y = fy + dy * s - (CH * sc) / 2;
      if (shown) {
        card(d, { x, y, k: sc, deg: rot, rarity: p[`rarity_${i}`], prefix: `card_${i}_`, full: false, seed: 3 + i });
        if (i === p.new_card) {
          const c = [x + (CW * sc) / 2, y + (CH * sc) / 2];
          const nb = [x + CW * sc + 45 * sc - 85 * sc, y - 46 * sc + 85 * sc];
          const t = (pt) => { const a = (rot * Math.PI) / 180; const dx0 = pt[0] - c[0]; const dy0 = pt[1] - c[1]; return [c[0] + dx0 * Math.cos(a) - dy0 * Math.sin(a), c[1] + dx0 * Math.sin(a) + dy0 * Math.cos(a)]; };
          const [nx, ny] = t(nb);
          d.raw(`<path data-deco="1" d="${ngon(nx, ny, 85 * sc, 40)}" fill="${d.pal.seal}"/>`);
          d.text("new_badge", nx, ny + 6 * s, 19 * s, { role: "seal_ink", family: "serif", weight: 900, anchor: "middle", box: [nx - 24 * s, ny - 16 * s, 48 * s, 28 * s] });
          d.text("new_badge_sub", nx, ny + 24 * s, 12 * s, { role: "seal_ink", family: "sans", weight: 700, tracking: 200, anchor: "middle", box: [nx - 26 * s, ny + 12 * s, 52 * s, 18 * s] });
        }
      } else {
        cardBack(d, x, y, sc, rot, p[`rarity_${i}`] === "legend", "back_word");
        if (i === 2) {
          d.raw(`<rect data-deco="1" x="${f1(x - 14 * sc)}" y="${f1(y - 14 * sc)}" width="${f1((CW + 28) * sc)}" height="${f1((CH + 28) * sc)}" rx="${f1(30 * sc)}" fill="none" stroke="${d.pal.paper}" stroke-width="${f1(8 * sc)}"/>`);
          const tx = x + (CW * sc) / 2; const ty = y - 150 * sc;
          d.rect(tx - 80 * s, ty - 8 * s, 160 * s, 40 * s, "paper");
          d.raw(`<polygon data-deco="1" points="${f1(tx - 8 * s)},${f1(ty + 32 * s)} ${f1(tx + 8 * s)},${f1(ty + 32 * s)} ${f1(tx)},${f1(ty + 40 * s)}" fill="${d.pal.paper}"/>`);
          d.text("tip", tx, ty + 20 * s, 18 * s, { role: "ink", family: "sans", weight: 800, tracking: 80, anchor: "middle", box: [tx - 78 * s, ty - 6 * s, 156 * s, 36 * s] });
        }
      }
    });
    // footer: progress, buttons, pity
    d.text("progress", 64 * s, 1000 * s, 22 * s, { role: "paper", family: "sans", weight: 700, tracking: 80, box: [60 * s, 976 * s, 300 * s, 30 * s] });
    d.text("progress_hint", 64 * s, 1028 * s, 17 * s, { role: "pale", family: "sans", weight: 500, box: [60 * s, 1010 * s, 300 * s, 24 * s] });
    d.text("pity", W - 64 * s, 1000 * s, 20 * s, { role: "paper", family: "sans", weight: 700, tracking: 60, anchor: "end", box: [W - 364 * s, 976 * s, 300 * s, 30 * s] });
    d.text("pity_hint", W - 64 * s, 1028 * s, 17 * s, { role: "pale", family: "sans", weight: 500, anchor: "end", box: [W - 364 * s, 1010 * s, 300 * s, 24 * s] });
    const by = 966 * s; const bh = 72 * s;
    const b = [[452, 156], [628, 212], [860, 300]];
    d.rect(b[0][0] * s, by + 6 * s, b[0][1] * s, bh, "gold");
    d.rect(b[0][0] * s, by, b[0][1] * s, bh, "gold_light");
    d.text("button_open_all", (b[0][0] + b[0][1] / 2) * s, by + 46 * s, 26 * s, { role: "ink", family: "sans", weight: 800, tracking: 120, anchor: "middle", box: [b[0][0] * s + 4 * s, by + 10 * s, b[0][1] * s - 8 * s, 52 * s] });
    d.rect(b[1][0] * s, by, b[1][1] * s, bh, "chip");
    d.raw(`<rect data-deco="1" x="${f1(b[1][0] * s + s)}" y="${f1(by + s)}" width="${f1(b[1][1] * s - 2 * s)}" height="${f1(bh - 2 * s)}" fill="none" stroke="${d.pal.paper}" stroke-width="${f1(2 * s)}"/>`);
    d.text("button_again", b[1][0] * s + 28 * s, by + 46 * s, 26 * s, { role: "paper", family: "sans", weight: 800, tracking: 120, box: [b[1][0] * s + 24 * s, by + 10 * s, 128 * s, 52 * s] });
    d.text("button_again_count", b[1][0] * s + 160 * s, by + 46 * s, 17 * s, { role: "paper", family: "sans", weight: 600, box: [b[1][0] * s + 156 * s, by + 24 * s, 50 * s, 30 * s] });
    d.rect(b[2][0] * s, by, b[2][1] * s, bh, "disabled");
    d.raw(`<rect data-deco="1" x="${f1(b[2][0] * s + s)}" y="${f1(by + s)}" width="${f1(b[2][1] * s - 2 * s)}" height="${f1(bh - 2 * s)}" fill="none" stroke="${d.pal.disabled_line}" stroke-width="${f1(2 * s)}"/>`);
    d.text("button_store", b[2][0] * s + 30 * s, by + 46 * s, 26 * s, { role: "disabled_ink", family: "sans", weight: 800, tracking: 120, box: [b[2][0] * s + 26 * s, by + 10 * s, 128 * s, 52 * s] });
    d.text("button_store_note", b[2][0] * s + 160 * s, by + 44 * s, 15 * s, { role: "disabled_ink", family: "sans", weight: 600, box: [b[2][0] * s + 156 * s, by + 24 * s, 136 * s, 28 * s] });
  },
};

module.exports = { LAYOUTS, RARITY };
