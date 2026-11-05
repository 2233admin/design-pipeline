"use strict";

// Layouts of the woodblock-pixel style pack (styles/woodblock-pixel/style.json): Edo road-station
// woodblock prints carried onto a 480 x 270 pixel grid - a bokashi sky in ordered-dither bands, a
// monumental peak whose ink line is printed one pixel out of register, paper panels each backed by
// a dark-red plate two pixels off, a vertical vermilion title cartouche, a 7 x 7 seal as the cursor.
// Pixel discipline: everything is drawn on the native grid and scaled by an integer (the canvas
// must be 480 x 270 times n); 16 colours; text in a 12 px pixel font at 12 or 24 px on whole
// pixels. Ported from the pixel-rpg-ui case's round-2 screens (pix.cjs / screens.cjs).

const { f1, invalid } = require("./layout-kit.cjs");

const NW = 480; const NH = 270;
// palette keys of the case -> palette roles of the style
const KEY = { k: "ink", w: "ink", n: "paper", d: "pale", s: "shade", m: "muted", c: "frame", g: "vermilion", o: "persimmon", r: "plate", M: "pine", l: "young", S: "prussian", y: "blue", e: "plum", E: "gold", N: "night" };
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const RAR = { common: { c: "c", gems: 0 }, fine: { c: "M", gems: 1 }, rare: { c: "S", gems: 2 }, epic: { c: "e", gems: 3 }, legend: { c: "g", gems: 4 } };
const ICONMAP = { w: "n", c: "s", g: "E", E: "g", m: "s" };
const DIG = { 0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"], 2: ["111", "001", "111", "100", "111"], 3: ["111", "001", "111", "001", "111"], 4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"], 6: ["111", "100", "111", "101", "111"], 7: ["111", "001", "010", "010", "010"], 8: ["111", "101", "111", "101", "111"], 9: ["111", "101", "111", "001", "111"] };
// 16 x 16 icons drawn for the case, one palette key per pixel ("." = transparent).
const ICON = {
  letter: [
    "................", "................", "................", ".kkkkkkkkkkkkkk.", ".kwwwwwwwwwwwwk.", ".kwkwwwwwwwwkwk.", ".kwwkwwwwwwkwwk.", ".kwwwkwwwwkwwwk.",
    ".kwwwwkEEkwwwwk.", ".kwwwwEEEEwwwwk.", ".kwwwwwEEwwwwwk.", ".kcwwwwwwwwwwck.", ".kcccccccccccck.", ".kkkkkkkkkkkkkk.", "................", "................"],
  blueletter: [
    "................", "................", "................", ".kkkkkkkkkkkkkk.", ".kwwwwwwwwwwwwk.", ".kwkwwwwwwwwkwk.", ".kwwkwwwwwwkwwk.", ".kwwwkwwwwkwwwk.",
    ".kwwwwkyykwwwwk.", ".kwwwwyySywwwwk.", ".kwwwwwyywwwwwk.", ".kcwwwwwwwwwwck.", ".kcccccccccccck.", ".kkkkkkkkkkkkkk.", "................", "................"],
  lantern: [
    "......kkkk......", ".....k....k.....", "......kkkk......", ".....kooook.....", "....kkkkkkkk....", "....kgwwwwgk....", "....kgwggwgk....", "....kgggggg k...".replace(" ", "").slice(0, 16),
    "....kgwggwgk....", "....kgwwwwgk....", "....kkkkkkkk....", ".....kooook.....", "......kkkk......", "................", "................", "................"],
  chalk: [
    "................", "................", "...........kk...", "..........kwwk..", ".........kwwck..", "........kwwck...", ".......kwwck....", "......kwwck.....",
    ".....kwwck......", "....kwwck.......", "...kwwck........", "...kcck.........", "....kk..........", "................", "................", "................"],
  bread: [
    "................", "................", "................", "................", ".....kkkkkk.....", "...kkooooookk...", "..kooggogggook..", ".koogoogoogooook",
    ".kooooooooooook.", ".krooooooooook..", "..krrooooorrk...", "...kkrrrrrkk....", ".....kkkkk......", "................", "................", "................"].map((r) => r.padEnd(16, ".").slice(0, 16)),
  potion: [
    "................", "......kkkk......", "......kook......", "......kkkk......", ".......kk.......", "......kwck......", ".....kwwcck.....", "....kEEEEEEk....",
    "...kEwEEEEEEk...", "...kEwEEEEEEk...", "...kEEEEEEErk...", "...kEEEEEErrk...", "....kEErrrrk....", ".....kkkkkk.....", "................", "................"],
  elixir: [
    "................", "......kkkk......", "......kook......", "......kkkk......", ".......kk.......", "......kwck......", ".....kwwcck.....", "....kyyyyyyk....",
    "...kywyyyyyyk...", "...kywyyyyyyk...", "...kyyyyyyySk...", "...kyyyyyySSk...", "....kyySSSSk....", ".....kkkkkk.....", "................", "................"],
  key: [
    "................", "................", "................", "...kkkk.........", "..kggggk........", ".kgk..kgk.......", ".kg....gkkkkkkk.", ".kg....ggggggggk",
    ".kgk..kgkkkgkgk.", "..kggggk..kgkgk.", "...kkkk....k.k..", "................", "................", "................", "................", "................"],
  map: [
    "................", "................", "..kkkkkkkkkkkk..", ".kowwwwwwwwwwok.", ".kowwkwwwwlwwok.", ".kowwwkwwlllwok.", ".kowwwwkwwlwwok.", ".kowwwwwkwwwwok.",
    ".kowwywwwkwEwok.", ".koyyyywwwEwEok.", ".kowyywwwwwEwok.", ".kowwwwwwwwwwok.", "..kkkkkkkkkkkk..", "................", "................", "................"],
  boots: [
    "................", "................", "....kkkkk.......", "....krrrk.......", "....krrrk.......", "....krork.......", "....krrrk.......", "....krrrk.......",
    "....krrrkkkk....", "...krrrrrrrrk...", "...krrorrrrrrk..", "...kkkkkkkkkkk..", "...kssssssssssk.", "....kkkkkkkkkk..", "................", "................"].map((r) => r.slice(0, 16)),
  compass: [
    "................", ".....kkkkkk.....", "....kggggggk....", "...kgkkkkkkgk...", "..kgkwwwwwwkgk..", "..kgkwwEwwwkgk..", "..kgkwwEEwwkgk..", "..kgkwwkkwwkgk..",
    "..kgkwwyywwkgk..", "..kgkwwwywwkgk..", "..kgkwwwwwwkgk..", "...kgkkkkkkgk...", "....kggggggk....", ".....kkkkkk.....", "................", "................"],
  coin: [
    "................", "................", "................", ".....kkkkkk.....", "....kggggggk....", "...kggwwgggok...", "...kgwgggggok...", "...kgggkkggok...",
    "...kgggkkggok...", "...kggggggook...", "...kogggggook...", "....kooooook....", ".....kkkkkk.....", "................", "................", "................"],
  ring: [
    "................", "................", "......kkkk......", ".....keeeek.....", ".....kewwek.....", "......keek......", ".....kkkkkk.....", "....kgggggok....",
    "...kgk....kok...", "...kgk....kok...", "...kgk....kok...", "....kgoooook....", ".....kkkkkk.....", "................", "................", "................"],
  feather: [
    "................", "............kk..", "...........kwk..", "..........kwck..", ".........kwcck..", "........kwcck...", ".......kwcck....", "......kwcck.....",
    ".....kwcck......", "....kwcck.......", "....kcck........", "...kk.kk........", "..kk............", ".kk.............", "................", "................"],
  seal: [
    "................", "................", "......kkkk......", ".....kssssk.....", ".....kssssk.....", "......kssk......", "......kssk......", ".....kkkkkk.....",
    "....kEEEEEEk....", "...kEEwEEEEEk...", "...kEEEEEEErk...", "....kErrrrrk....", ".....kkkkkk.....", "................", "................", "................"],
  parcel: [
    "................", "................", "................", "...kkkkkkkkkk...", "..kooooooooook..", "..kooooEooooook.".slice(0, 16), "..kkkkkEkkkkkkk.".slice(0, 16), "..koooooEooooook".slice(0, 16),
    "..koooooEooook..", "..koooooEooook..", "..koooooEooook..", "..krrrrrErrrrk..", "..kkkkkkkkkkkk..", "................", "................", "................"],
  lock: [
    "......kkkk......", ".....kmmmmk.....", "....km....mk....", "....km....mk....", "...kkkkkkkkkk...", "...kmmmmmmmmk...", "...kmmmkkmmmk...", "...kmmmkkmmmk...",
    "...kmmmmmmmmk...", "...kkkkkkkkkk...", "................", "................", "................", "................", "................", "................"],
};
for (const [k, v] of Object.entries(ICON)) ICON[k] = v.map((r) => r.padEnd(16, ".").slice(0, 16));


// A native-resolution pixel canvas. Pixel writes collect in a layer; large ordered dithers are
// pattern fills (one 4 x 4 Bayer tile per colour pair and level), drawn over a flat rect of their
// mean colour so the static check sees a ground. The layer is written as one run-length path per
// colour whenever a pattern has to go on top of it, so the paint order of the case is kept.
class PixelCanvas {
  constructor(d) {
    this.d = d; this.buf = new Uint8Array(NW * NH); this.keys = [null]; this.index = new Map(); this.out = []; this.patterns = new Set(); this.dirty = false;
  }
  key(k) { if (!this.index.has(k)) { this.index.set(k, this.keys.length); this.keys.push(k); } return this.index.get(k); }
  rect(x, y, w, h, k) {
    const v = this.key(k); x |= 0; y |= 0; w |= 0; h |= 0;
    for (let j = Math.max(0, y); j < Math.min(NH, y + h); j += 1) for (let i = Math.max(0, x); i < Math.min(NW, x + w); i += 1) this.buf[j * NW + i] = v;
    this.dirty = true;
  }
  px(x, y, k) { this.rect(x, y, 1, 1, k); }
  flush() {
    if (!this.dirty) return;
    const runs = new Map();
    for (let y = 0; y < NH; y += 1) {
      let x = 0;
      while (x < NW) {
        const v = this.buf[y * NW + x];
        if (!v) { x += 1; continue; }
        let e = x + 1;
        while (e < NW && this.buf[y * NW + e] === v) e += 1;
        if (!runs.has(v)) runs.set(v, []);
        runs.get(v).push(`M${x} ${y}h${e - x}v1h${x - e}z`);
        x = e;
      }
    }
    for (const [v, list] of runs) this.out.push(`<path data-deco="1" d="${list.join("")}" fill="${this.d.pal[KEY[this.keys[v]]]}"/>`);
    this.buf.fill(0); this.dirty = false;
  }
  pattern(c1, c2, t) {
    const q = [].concat(...BAY).filter((b) => (b + 0.5) / 16 < t).length;
    if (q === 0) return { solid: c1 }; if (q === 16) return { solid: c2 };
    const id = `bay-${c1}${c2}-${q}`.replace(/[^a-zA-Z0-9-]/g, (ch) => ch.charCodeAt(0).toString(16));
    if (!this.patterns.has(id)) {
      this.patterns.add(id);
      const cells = [];
      for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) if ((BAY[j][i] + 0.5) / 16 < t) cells.push(`M${i} ${j}h1v1h-1z`);
      this.d.def(`<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${this.d.pal[KEY[c1]]}"/><path d="${cells.join("")}" fill="${this.d.pal[KEY[c2]]}"/></pattern>`);
    }
    return { id, q };
  }
  mean(c1, c2, q) {
    const a = this.d.pal[KEY[c1]]; const b = this.d.pal[KEY[c2]]; const f = q / 16;
    const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - f) + ch(b, i) * f).toString(16).padStart(2, "0")).join("")}`;
  }
  // a dithered rectangle: a pattern for big areas, pixels for small ones
  dither(x, y, w, h, c1, c2, t) {
    if (w * h < 400) { for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.px(x + i, y + j, (BAY[(y + j) & 3][(x + i) & 3] + 0.5) / 16 < t ? c2 : c1); return; }
    this.flush();
    const p = this.pattern(c1, c2, t);
    if (p.solid) { this.out.push(`<rect data-deco="1" x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.d.pal[KEY[p.solid]]}"/>`); return; }
    this.out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.mean(c1, c2, p.q)}"/><rect data-deco="1" x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p.id})"/>`);
  }
  // stepped bands between colour stops, dithered at each seam (bokashi)
  vgrad(x, y, w, h, stops) {
    let band = null;
    const emit = () => { if (band) this.dither(x, band.y0, w, band.y1 - band.y0, band.a, band.b, band.t); };
    for (let j = 0; j < h; j += 1) {
      const t = j / (h - 1);
      let a = stops[0]; let b = stops.at(-1);
      for (let k = 0; k < stops.length - 1; k += 1) if (t >= stops[k][0] && t <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
      const u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      const q = [].concat(...BAY).filter((v) => (v + 0.5) / 16 < u).length;
      if (band && band.a === a[1] && band.b === b[1] && band.q === q) band.y1 = y + j + 1;
      else { emit(); band = { a: a[1], b: b[1], q, t: u, y0: y + j, y1: y + j + 1 }; }
    }
    emit();
  }
  checker(x, y, w, h, k) {
    this.flush();
    const id = `chk-${k}`.replace(/[^a-zA-Z0-9-]/g, (ch) => ch.charCodeAt(0).toString(16));
    if (!this.patterns.has(id)) { this.patterns.add(id); this.d.def(`<pattern id="${id}" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 0h1v1h-1zM1 1h1v1h-1z" fill="${this.d.pal[KEY[k]]}"/></pattern>`); }
    this.out.push(`<rect data-deco="1" x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`);
  }
  bmp(x, y, rows, s = 1, map) { for (let j = 0; j < rows.length; j += 1) for (let i = 0; i < rows[j].length; i += 1) { let ch = rows[j][i]; if (ch === ".") continue; if (map && map[ch]) ch = map[ch]; this.rect(x + i * s, y + j * s, s, s, ch); } }
  icon(x, y, name, s = 1, map) { this.bmp(x, y, ICON[name], s, { ...ICONMAP, ...(map || {}) }); }
  // paper panel: ink line, chalk inner line with notched corners, paper speckle, dark-red plate 2 px off
  frame(x, y, w, h, o = {}) {
    const line = o.line || "c"; const fill = o.fill || "n";
    if (o.shadow !== false) this.rect(x + 2, y + 2, w, h, o.plate || "r");
    this.rect(x + 1, y, w - 2, 1, "k"); this.rect(x + 1, y + h - 1, w - 2, 1, "k"); this.rect(x, y + 1, 1, h - 2, "k"); this.rect(x + w - 1, y + 1, 1, h - 2, "k");
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
    if (fill === "n" && !o.plain) { let q = x * 7 + y; for (let j = 2; j < h - 2; j += 3) for (let i = 2; i < w - 2; i += 5) { q = (q * 1103515245 + 12345) & 0x7fffffff; if (q % 11 === 0) this.px(x + i, y + j, "d"); } }
    this.rect(x + 3, y + 1, w - 6, 1, line); this.rect(x + 3, y + h - 2, w - 6, 1, line); this.rect(x + 1, y + 3, 1, h - 6, line); this.rect(x + w - 2, y + 3, 1, h - 6, line);
    for (const [px, py] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) this.px(px, py, line);
  }
  selbar(x, y, w, h) { this.rect(x, y, w, h, "d"); this.rect(x, y, 1, h, "g"); this.rect(x + w - 1, y, 1, h, "g"); for (const [a, b] of [[x + 1, y], [x + 1, y + h - 1], [x + w - 3, y], [x + w - 3, y + h - 1]]) this.rect(a, b, 2, 1, "g"); }
  cursor(x, y, c = "g") { this.bmp(x - 1, y, ["ggggggg", "gnnnnng", "gnggnng", "gnnnnng", "gnnggng", "gnnnnng", "ggggggg"], 1, { g: c }); }
  bar(x, y, w, v, max, c) { this.rect(x, y, w, 5, "k"); this.rect(x + 1, y + 1, w - 2, 3, "d"); const f = Math.round(((w - 2) * v) / max); this.rect(x + 1, y + 1, f, 3, c); this.rect(x + 1, y + 1, f, 1, "n"); }
  digits(x, y, str, c = "n") {
    let cx = x;
    for (const ch of String(str)) { const dg = DIG[ch]; if (!dg) { cx += 2; continue; } for (let j = -1; j <= 5; j += 1) for (let i = -1; i <= 3; i += 1) this.px(cx + i, y + j, "k"); for (let j = 0; j < 5; j += 1) for (let i = 0; i < 3; i += 1) if (dg[j][i] === "1") this.px(cx + i, y + j, c); cx += 4; }
  }
  slot(x, y, rar, o = {}) {
    const R = RAR[rar] || { c: "s", gems: 0 }; const line = o.disabled ? "s" : R.c;
    this.rect(x + 1, y + 1, 24, 24, "r"); this.rect(x, y, 24, 24, "k"); this.rect(x + 1, y + 1, 22, 22, o.disabled ? "d" : "n");
    this.rect(x + 1, y + 1, 22, 1, line); this.rect(x + 1, y + 22, 22, 1, line); this.rect(x + 1, y + 1, 1, 22, line); this.rect(x + 22, y + 1, 1, 22, line);
    for (let i = 0; i < R.gems; i += 1) this.rect(x + 19 - i * 3, y + 3, 2, 2, line);
    if (o.item) this.icon(x + 4, y + 4, o.item, 1, o.disabled ? { w: "m", c: "s", g: "m", o: "s", E: "m", y: "m", e: "m", r: "s", l: "m", S: "s" } : null);
    if (o.count) this.digits(x + 22 - String(o.count).length * 4, y + 17, o.count);
    if (o.disabled) this.bmp(x + 2, y + 14, ["kkk..", "kmk..", "kkkk.", "kmmk.", "kkkk."]);
    if (o.isNew) { this.rect(x + 1, y + 1, 5, 7, "E"); this.rect(x + 3, y + 2, 1, 3, "w"); this.px(x + 3, y + 6, "w"); }
  }
  selected(x, y, w, h, c = "g") { for (const [cx, cy, sx, sy] of [[x - 2, y - 2, 1, 1], [x + w + 1, y - 2, -1, 1], [x - 2, y + h + 1, 1, -1], [x + w + 1, y + h + 1, -1, -1]]) { this.rect(Math.min(cx, cx + sx * 4), cy, 5, 1, c); this.rect(cx, Math.min(cy, cy + sy * 4), 1, 5, c); } }
  // write the drawing into the document, scaled by u, crisp
  commit() { this.flush(); this.d.raw(`<g transform="scale(${this.d.u})" shape-rendering="crispEdges">${this.out.join("")}</g>`); this.out = []; }
}

function grid(d) {
  const u = d.W / NW;
  if (!Number.isInteger(u) || d.H !== NH * u) throw invalid(`${d.m.id} draws on a ${NW} x ${NH} pixel grid scaled by a whole number; ${d.W}x${d.H} is not. Fix: --size 480x270, 960x540, 1440x810 or 1920x1080`);
  d.u = u;
  return u;
}

// Text on the grid: the pixel font at 12 or 24 px (native), top-left on a whole pixel, baseline at +10/12 of the size.
function T(d, name, x, y, k, o = {}) {
  const size = (o.size || 12) * d.u; const u = d.u;
  const anchor = o.align === "center" ? "middle" : o.align === "right" ? "end" : "start";
  const width = (o.w || 120) * u;
  const x0 = anchor === "start" ? x * u : anchor === "middle" ? x * u - width / 2 : x * u - width;
  const box = o.vertical ? [x * u - size * 0.7, y * u - u, size * 1.4, (o.h || 120) * u] : [x0 - u, y * u - u, width + 2 * u, size + 3 * u];
  d.text(name, x * u, o.vertical ? y * u : y * u + size * (10 / 12), size, { role: KEY[k], family: (o.size || 12) === 24 ? "title" : "pixel", weight: 400, anchor, vertical: o.vertical, tracking: o.tracking || 0, box });
}

// The road-station scene: bokashi sky, stars, moon, the peak with its out-of-register ink line,
// drifting mist bands, near hills, the field, the paper road, pines, the station and one traveller.
function scene(c, p) {
  c.vgrad(0, 0, 480, 158, [[0, "N"], [0.3, "S"], [0.62, "y"], [0.86, "d"], [1, "n"]]);
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40; i += 1) { const x = (r() * 480) | 0; const y = (r() * 44) | 0; c.px(x, y, r() < 0.3 ? "n" : "d"); }
  for (let j = -13; j <= 13; j += 1) for (let i = -13; i <= 13; i += 1) if (i * i + j * j <= 169) c.px(p.moon_x + i, 40 + j, "n");
  const peak = (x) => Math.round(44 + Math.abs(x - p.peak_x) * 0.62 + 3 * Math.sin(x / 9));
  for (let x = 0; x < 330 + (p.peak_x - 150); x += 1) {
    const top = peak(x);
    c.rect(x, top, 1, 158 - top, "y");
    for (let y = top; y < Math.min(158, top + 18 - Math.abs(x - p.peak_x) / 14); y += 1) if ((BAY[y & 3][x & 3] + 0.5) / 16 < 0.75 - (y - top) / 24) c.px(x, y, "n");
  }
  for (let x = 0; x < 330 + (p.peak_x - 150); x += 1) c.px(x + 1, peak(x) + 1, "k");
  if (p.mist) for (const [y, len, off] of [[96, 220, 0], [104, 160, 140], [124, 260, 300]]) for (let i = 0; i < len; i += 1) { const x = ((off + i) % 560) - 40; c.rect(x, y, 1, 3, "d"); if (i % 3) c.px(x, y + 3, "n"); }
  for (let x = 0; x < 480; x += 1) { const h = 148 - Math.round(8 * Math.sin(x / 41 + 1) + 5 * Math.sin(x / 13)); c.rect(x, h, 1, 170 - h, "M"); }
  c.rect(0, 160, 480, 110, "l"); c.dither(0, 156, 480, 10, "M", "l", 0.5); c.dither(0, 232, 480, 38, "l", "M", 0.35);
  for (let y = 150; y < 270; y += 1) { const u = (y - 150) / 120; const cx = 118 + u * u * 250 + u * 60; const hw = 1 + u * u * 46; c.rect(Math.round(cx - hw), y, Math.round(hw * 2), 1, "n"); c.px(Math.round(cx + hw), y, "s"); }
  for (const [x, y, h, lean] of [[176, 176, 22, -1], [214, 190, 30, 1], [262, 206, 40, -1], [324, 226, 56, 1], [150, 166, 14, 1], [134, 160, 10, -1]]) {
    let q = x * 31 + h; const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) % 1000) / 1000;
    for (let j = 0; j < h; j += 1) c.rect(x + Math.round((lean * j * j) / (h * 6)), y - j, Math.max(1, Math.round(h / 18)), 1, "k");
    const tx = x + Math.round((lean * h) / 6);
    for (const [f, wf, side] of [[0.95, 0.34, 0], [0.72, 0.5, -1], [0.5, 0.42, 1]]) {
      const cy = y - Math.round(h * f); const cw = Math.round(h * wf); const ch = Math.max(2, Math.round(h / 7)); const cx = tx + side * Math.round(h / 6);
      for (let j = 0; j < ch; j += 1) { const ww = Math.round(cw * (0.55 + 0.45 * (j / ch))); for (let i = -ww; i <= ww; i += 1) if (rr() > (Math.abs(i) > ww - 2 ? 0.45 : 0.02)) c.px(cx + i, cy + j - ch, "k"); }
      for (let i = -cw; i <= cw; i += 2) if (rr() > 0.4) c.px(cx + i, cy, "M");
    }
  }
  c.rect(108, 140, 16, 10, "k"); c.rect(109, 141, 14, 9, "o"); for (let i = 0; i < 6; i += 1) c.rect(106 + i, 140 - i, 20 - 2 * i, 1, "k"); c.rect(114, 144, 4, 3, "E");
  if (p.traveller) { c.rect(352, 240, 3, 6, "k"); c.rect(351, 239, 5, 1, "k"); c.px(353, 238, "k"); c.px(355, 243, "k"); }
}

const ITEMS = [
  ["blueletter", "rare", 1, { isNew: 1 }], ["letter", "common", 4], ["compass", "epic", 0], ["lantern", "fine", 1], ["bread", "common", 6], ["potion", "fine", 3],
  ["elixir", "rare", 1], ["key", "rare", 1], ["map", "fine", 1], ["chalk", "common", 12], ["seal", "legend", 1], ["boots", "common", 1],
  ["ring", "epic", 1], ["feather", "fine", 2], ["parcel", "common", 2], ["coin", "common", 0], ["potion", "fine", 0, { disabled: 1 }],
];

const LAYOUTS = {
  "pixel.title-screen"(d) {
    grid(d); const { p } = d;
    const c = new PixelCanvas(d);
    scene(c, p);
    c.rect(0, 250, 480, 20, "k"); c.rect(0, 250, 480, 1, "g");
    // series cartouche (paper) and title cartouche (vermilion), both vertical, out-of-register plate behind
    c.rect(398, 18, 20, 104, "r"); c.rect(396, 16, 20, 104, "k"); c.rect(397, 17, 18, 102, "n");
    c.rect(424, 18, 40, 136, "r"); c.rect(422, 16, 40, 136, "k"); c.rect(423, 17, 38, 134, "g");
    c.rect(425, 19, 34, 1, "n"); c.rect(425, 148, 34, 1, "n"); c.rect(425, 19, 1, 130, "n"); c.rect(458, 19, 1, 130, "n");
    const n = p.items;
    for (let i = 0; i < n; i += 1) c.frame(24 + i * 12, 168 + i * 18, 112, 16, { plate: "r" });
    if (p.locked >= 0 && p.locked < n) c.icon(24 + p.locked * 12 + 92, 168 + p.locked * 18, "lock");
    const sel = Math.min(p.selected, n - 1);
    c.selbar(25 + sel * 12, 169 + sel * 18, 110, 14); c.cursor(30 + sel * 12, 172 + sel * 18);
    c.commit();
    T(d, "logo", 444, 28, "n", { size: 24, vertical: true, tracking: 167, h: 120 });
    T(d, "series", 406, 24, "k", { vertical: true, h: 92 });
    for (let i = 0; i < n; i += 1) T(d, `menu_${i}`, 40 + i * 12, 170 + i * 18, i === sel ? "w" : i === p.locked ? "m" : "c", { w: i === sel ? 52 : 92 });
    T(d, "menu_tag", 132 + sel * 12, 170 + sel * 18, "r", { align: "right", w: 40 });
    T(d, "logo_latin", 240, 255, "E", { align: "center", w: 200 });
    T(d, "version", 8, 255, "n", { w: 120 });
    T(d, "copyright", 472, 255, "n", { align: "right", w: 120 });
  },

  "pixel.inventory"(d) {
    grid(d); const { p } = d;
    const c = new PixelCanvas(d);
    c.rect(0, 0, 480, 270, "S"); c.dither(0, 0, 480, 270, "S", "N", 0.35); c.vgrad(0, 0, 480, 38, [[0, "N"], [1, "S"]]);
    for (let i = 0; i < 5; i += 1) c.frame(10 + i * 48, 10, 40, 20, i === p.tab ? { fill: "d", line: "g" } : {});
    c.cursor(4 + p.tab * 48, 16);
    c.frame(8, 40, 172, 182);
    const GX = 18; const GY = 50; const GS = 26;
    const locked = 30 - p.capacity;
    for (let i = 0; i < 30; i += 1) {
      const x = GX + (i % 6) * GS; const y = GY + Math.floor(i / 6) * GS;
      if (i >= 30 - locked) { c.rect(x, y, 24, 24, "k"); c.rect(x + 1, y + 1, 22, 22, "n"); c.checker(x + 1, y + 1, 22, 22, "d"); c.icon(x + 4, y + 4, "lock"); continue; }
      const item = ITEMS[i];
      if (!item || i >= p.filled) { c.rect(x, y, 24, 24, "k"); c.rect(x + 1, y + 1, 22, 22, "n"); c.rect(x + 1, y + 1, 22, 1, "d"); c.rect(x + 1, y + 22, 22, 1, "d"); c.rect(x + 1, y + 1, 1, 22, "d"); c.rect(x + 22, y + 1, 1, 22, "d"); continue; }
      const [ic, rar, cnt, o = {}] = item;
      c.slot(x, y, rar, { item: ic, count: cnt > 1 ? cnt : 0, disabled: !!o.disabled, isNew: !!o.isNew });
      if (i === p.selected) { c.selected(x, y, 24, 24, "g"); c.selected(x - 1, y - 1, 26, 26, "k"); }
    }
    c.frame(186, 40, 286, 182);
    const sel = ITEMS[Math.min(p.selected, ITEMS.length - 1)];
    c.rect(196, 52, 38, 38, "k"); c.slot(197, 53, sel[1]); c.rect(198, 54, 36, 36, "k"); c.rect(199, 55, 34, 34, "n"); c.icon(201, 57, sel[0], 2);
    for (let i = 0; i < (RAR[sel[1]] || { gems: 0 }).gems; i += 1) c.rect(272 + i * 6, 83, 4, 4, RAR[sel[1]].c);
    c.frame(196, 176, 62, 20, { fill: "d", line: "g" }); c.frame(264, 176, 62, 20); c.frame(332, 176, 62, 20, { fill: "n", line: "s" });
    c.frame(8, 228, 464, 34); c.bar(54, 236, 96, p.load, 30, "l"); c.icon(258, 237, "coin");
    c.commit();
    for (let i = 0; i < 5; i += 1) T(d, `tab_${i}`, 18 + i * 48, 14, i === p.tab ? "w" : "c", { w: 26 });
    T(d, "tab_hint", 462, 15, "n", { align: "right", w: 110 });
    T(d, "item_name", 244, 54, "e", { size: 24, w: 220 });
    T(d, "item_rarity", 244, 80, "e", { w: 26 });
    T(d, "item_type", 326, 80, "c", { w: 136 });
    T(d, "desc_0", 198, 100, "w", { w: 266 }); T(d, "desc_1", 198, 116, "w", { w: 266 });
    T(d, "effect_0", 198, 136, "M", { w: 112 }); T(d, "effect_1", 318, 136, "M", { w: 146 });
    T(d, "flavor", 198, 156, "m", { w: 266 });
    T(d, "button_0", 227, 180, "w", { align: "center", w: 56 }); T(d, "button_1", 295, 180, "c", { align: "center", w: 56 }); T(d, "button_2", 363, 180, "m", { align: "center", w: 56 });
    T(d, "button_note", 332, 202, "m", { w: 132 });
    T(d, "capacity", 18, 204, "m", { w: 156 });
    T(d, "load_label", 18, 238, "c", { w: 30 }); T(d, "load_value", 156, 238, "w", { w: 40 });
    T(d, "gold", 276, 238, "g", { w: 60 });
    T(d, "key_hint", 462, 238, "m", { align: "right", w: 120 });
  },
};

module.exports = { LAYOUTS, PixelCanvas, NW, NH, KEY };
