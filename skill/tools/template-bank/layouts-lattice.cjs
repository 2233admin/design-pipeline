"use strict";

// Layouts of the lattice-dossier style pack (styles/lattice-dossier/style.json): an industrial
// dossier-terminal game site grammar, measured on an official site captured privately (never
// shipped) and proven on the original site 雾航信标 FOGWAKE. A near-black ground with a 172-unit
// square lattice crossed by both diagonals, three hairlines that frame every screen (y 152, y 900,
// x 1683), one signal cyan used only for state (current, progress, numbers, tags), a right rail with
// a giant wide numeral cut to its top 55%, Latin set as a sign above or beside the CJK, and a
// ghost word sitting under the y900 line. Geometry in 1920 units scaled to the canvas. No rounded
// corners anywhere. Pictures are image slots; the lattice and frame are drawn here.

const { f1, invalid } = require("./layout-kit.cjs");

const GRID = 172; // lattice square, 1920 units
const FRAME = { top: 152, base: 900, rail: 1683 }; // hairlines, 1920 x 1080 units

// The lattice: squares with both diagonals, decoration only (the static check reads the ground rect).
function lattice(d, x0, y0, w, h, s, ox = 137) {
  const g = GRID * s; let p = "";
  for (let x = x0 + ((ox * s) % g) - g; x <= x0 + w; x += g) p += `M${f1(x)} ${f1(y0)}V${f1(y0 + h)}`;
  for (let y = y0; y <= y0 + h; y += g) p += `M${f1(x0)} ${f1(y)}H${f1(x0 + w)}`;
  for (let k = -Math.ceil(h / g); k <= Math.ceil(w / g) + 1; k += 1) {
    const x = x0 + ((ox * s) % g) - g + k * g;
    p += `M${f1(x)} ${f1(y0)}l${f1(h)} ${f1(h)}M${f1(x)} ${f1(y0)}l${f1(-h)} ${f1(h)}`;
  }
  d.def(`<clipPath id="lat-${d.latN = (d.latN || 0) + 1}"><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${f1(h)}"/></clipPath>`);
  d.raw(`<g data-deco="1" clip-path="url(#lat-${d.latN})"><path d="${p}" fill="none" stroke="${d.pal.grid}" stroke-width="${f1(Math.max(1, 1.2 * s))}"/></g>`);
}
const hair = (d, x1, y1, x2, y2, s) => d.raw(`<path data-deco="1" d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" stroke="${d.pal.line}" stroke-width="${f1(Math.max(1, s))}"/>`);
const chev = (x, y, s, c, dir = 1) => `<path d="M${f1(x)} ${f1(y - 5 * s)}l${f1(5 * s * dir)} ${f1(5 * s)}l${f1(-5 * s * dir)} ${f1(5 * s)}" fill="none" stroke="${c}" stroke-width="${f1(2 * s)}"/>`;
function digits(d, name, n = 2) {
  const { text } = d.value(name);
  if (!new RegExp(`^\\d{1,${n}}$`).test(String(text))) throw invalid(`slot ${name} is a ${n}-digit screen number (digits only), got ${JSON.stringify(text)}. Fix: --set ${name}=02 ; put words in a text slot`);
}
function dateOnly(d, name) {
  const { text } = d.value(name);
  if (!/^[\d/ ]+$/.test(String(text))) throw invalid(`slot ${name} is a date in the dossier form 2026 // 11 / 06 (digits, spaces and /), got ${JSON.stringify(text)}. Fix: --set ${name}="2026 // 11 / 06"; put words in the title`);
}
// The brand mark of the placeholder: concentric lens rings crossed by one horizontal beam (no letter shapes).
const lens = (x, y, r, s, c, acc) => `<g data-deco="1" fill="none"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" stroke="${c}" stroke-width="${f1(2.4 * s)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.53)}" stroke="${c}" stroke-width="${f1(1.6 * s)}"/><path d="M${f1(x - r - 3 * s)} ${f1(y)}H${f1(x + r * 7.4)}" stroke="${c}" stroke-width="${f1(1.6 * s)}"/><path d="M${f1(x + r * 1.2)} ${f1(y)}H${f1(x + r * 7.4)}" stroke="${acc}" stroke-width="${f1(2.4 * s)}"/></g>`;
const ICON = {
  share: (x, y, s, c) => `<g fill="none" stroke="${c}" stroke-width="${f1(2.4 * s)}"><circle cx="${f1(x - 7 * s)}" cy="${f1(y)}" r="${f1(4 * s)}"/><circle cx="${f1(x + 7 * s)}" cy="${f1(y - 8 * s)}" r="${f1(4 * s)}"/><circle cx="${f1(x + 7 * s)}" cy="${f1(y + 8 * s)}" r="${f1(4 * s)}"/><path d="M${f1(x - 3.5 * s)} ${f1(y - 2 * s)}l${f1(7 * s)} ${f1(-4 * s)}M${f1(x - 3.5 * s)} ${f1(y + 2 * s)}l${f1(7 * s)} ${f1(4 * s)}"/></g>`,
  audio: (x, y, s, c) => `<path d="${[-12, -7, -2, 3, 8, 13].map((dx, i) => `M${f1(x + dx * s)} ${f1(y - [4, 9, 13, 9, 5, 2][i] * s)}v${f1([8, 18, 26, 18, 10, 4][i] * s)}`).join("")}" stroke="${c}" stroke-width="${f1(2.4 * s)}" stroke-linecap="round"/>`,
  user: (x, y, s, c) => `<g fill="${c}"><circle cx="${f1(x)}" cy="${f1(y - 6 * s)}" r="${f1(6 * s)}"/><path d="M${f1(x - 12 * s)} ${f1(y + 14 * s)}c0 -7 ${f1(5 * s)} -11 ${f1(12 * s)} -11s${f1(12 * s)} 4 ${f1(12 * s)} 11z"/></g>`,
  route: (x, y, s, c) => `<g fill="none" stroke="${c}" stroke-width="${f1(4 * s)}"><path d="M${f1(x)} ${f1(y - 26 * s)}l${f1(26 * s)} ${f1(26 * s)}l${f1(-26 * s)} ${f1(26 * s)}l${f1(-26 * s)} ${f1(-26 * s)}z"/><path d="M${f1(x - 12 * s)} ${f1(y + 4 * s)}c${f1(6 * s)} ${f1(-12 * s)} ${f1(18 * s)} ${f1(4 * s)} ${f1(24 * s)} ${f1(-8 * s)}"/></g>`,
  blocks: (x, y, s, c) => `<path d="M${f1(x - 24 * s)} ${f1(y + 12 * s)}l${f1(24 * s)} ${f1(12 * s)}l${f1(24 * s)} ${f1(-12 * s)}M${f1(x - 24 * s)} ${f1(y)}l${f1(24 * s)} ${f1(12 * s)}l${f1(24 * s)} ${f1(-12 * s)}M${f1(x - 24 * s)} ${f1(y - 12 * s)}l${f1(24 * s)} ${f1(-12 * s)}l${f1(24 * s)} ${f1(12 * s)}l${f1(-24 * s)} ${f1(12 * s)}z" fill="none" stroke="${c}" stroke-width="${f1(4 * s)}"/>`,
  play: (x, y, s, c) => `<path d="M${f1(x - 18 * s)} ${f1(y - 24 * s)}L${f1(x + 22 * s)} ${f1(y)}L${f1(x - 18 * s)} ${f1(y + 24 * s)}z" fill="none" stroke="${c}" stroke-width="${f1(4 * s)}"/>`,
  book: (x, y, s, c) => `<path d="M${f1(x - 24 * s)} ${f1(y - 20 * s)}c${f1(10 * s)} ${f1(-4 * s)} ${f1(18 * s)} ${f1(-4 * s)} ${f1(24 * s)} ${f1(2 * s)}c${f1(6 * s)} ${f1(-6 * s)} ${f1(14 * s)} ${f1(-6 * s)} ${f1(24 * s)} ${f1(-2 * s)}v${f1(40 * s)}c${f1(-10 * s)} ${f1(-4 * s)} ${f1(-18 * s)} ${f1(-4 * s)} ${f1(-24 * s)} ${f1(2 * s)}c${f1(-6 * s)} ${f1(-6 * s)} ${f1(-14 * s)} ${f1(-6 * s)} ${f1(-24 * s)} ${f1(-2 * s)}zM${f1(x)} ${f1(y - 18 * s)}v${f1(40 * s)}" fill="none" stroke="${c}" stroke-width="${f1(4 * s)}"/>`,
};

// The rail numeral: a giant wide two-digit number cut to its top 55% (decoration; the readable
// number is the small "// 02 / 05" line), a ground plate under the small line where it crosses it.
function railNumber(d, right, top, s) {
  const { text: cur } = d.value("current"); digits(d, "current"); digits(d, "total");
  const size = 86.4 * s; const keep = 47.5 * s;
  d.def(`<clipPath id="rail-cut-${d.railN = (d.railN || 0) + 1}"><rect x="${f1(right - 190 * s)}" y="${f1(top)}" width="${f1(190 * s)}" height="${f1(keep)}"/></clipPath>`);
  d.raw(`<g clip-path="url(#rail-cut-${d.railN})">`);
  d.text("numeral", right - 190 * s, top + size * 0.72, size, { role: "cyan", family: "wide", content: String(cur), tracking: -45, box: [right - 192 * s, top - size * 0.2, 192 * s, size * 1.25] });
  d.raw("</g>");
  const oy = top + 13 * s; const ow = 104 * s;
  d.rect(right - ow, oy, ow, 22 * s, "bg");
  d.raw(`<text data-deco="1" x="${f1(right - ow + 8 * s)}" y="${f1(oy + 17 * s)}" font-family="${d.families.mono}" font-size="${f1(18 * s)}" fill="${d.pal.white}">//</text>`);
  d.text("current", right - 62 * s, oy + 17 * s, 18 * s, { role: "white", family: "mono", anchor: "end", box: [right - 86 * s, oy, 28 * s, 22 * s] });
  d.raw(`<text data-deco="1" x="${f1(right - 52 * s)}" y="${f1(oy + 17 * s)}" font-family="${d.families.mono}" font-size="${f1(18 * s)}" fill="${d.pal.white}">/</text>`);
  d.text("total", right, oy + 17 * s, 18 * s, { role: "white", family: "mono", anchor: "end", box: [right - 26 * s, oy, 26 * s, 22 * s] });
  d.text("section", right, top + 72 * s, 16 * s, { role: "white", family: "wide", anchor: "end", tracking: 100, box: [right - 230 * s, top + 54 * s, 230 * s, 22 * s] });
}

// Ghost word: Oswald 112 units, -5% tracking, sitting on the base hairline and bleeding off the bottom.
function ghost(d, x, y, s) {
  d.text("ghost", x, y + 94 * s, 112 * s, { role: "ghost", family: "narrow", tracking: -50, weight: 500, box: [x - 4 * s, y, 1100 * s, 106 * s] });
}

const LAYOUTS = {
  // ---- top frame: 1920 x 152 ----------------------------------------------------------------
  "ui.lattice-topbar"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "top");
    d.raw(lens(68 * s, 52 * s, 15 * s, s, d.pal.white, d.pal.cyan));
    d.text("brand_cjk", 92 * s, 46 * s, 19 * s, { role: "white", family: "head", tracking: 150, box: [90 * s, 24 * s, 100 * s, 26 * s] });
    d.text("brand_latin", 92 * s, 76 * s, 12 * s, { role: "t2", family: "wide", tracking: 200, box: [90 * s, 62 * s, 150 * s, 18 * s] });
    let x = p.nav_x * s;
    for (let i = 1; i <= 6; i += 1) {
      const on = i === p.current; const role = on ? "cyan" : "white";
      const { text: en } = d.value(`nav_en_${i}`); const { text: zh } = d.value(`nav_zh_${i}`);
      const w = Math.max(String(en).length * 22 * 0.5, [...String(zh)].length * 14) * s;
      d.text(`nav_en_${i}`, x, 52 * s, 22 * s, { role, family: "narrow", weight: 500, box: [x - 2 * s, 27 * s, Math.max(w, String(en).length * 22 * 0.78 * s) + 4 * s, 30 * s] });
      d.text(`nav_zh_${i}`, x, 75 * s, 14 * s, { role, family: "head", weight: 500, box: [x - 2 * s, 59 * s, [...String(zh)].length * 15 * s + 4 * s, 20 * s] });
      x += w + 80 * s;
    }
    if (p.icons) d.raw(`<g data-deco="1">${ICON.share(1733 * s, 54 * s, s, d.pal.white)}${ICON.audio(1808 * s, 54 * s, s, d.pal.cyan)}${ICON.user(1883 * s, 54 * s, s, d.pal.white)}</g>`);
    hair(d, 0, H - 0.5 * s, W, H - 0.5 * s, s);
    hair(d, FRAME.rail * s, 0, FRAME.rail * s, H, s);
    d.zone("bar", "safe", [0, 0, FRAME.rail * s, H], { slots: ["brand_cjk", "brand_latin", ...[1, 2, 3, 4, 5, 6].flatMap((i) => [`nav_en_${i}`, `nav_zh_${i}`])] });
  },

  // ---- right-rail pager: 236 x 120 ----------------------------------------------------------
  "ui.lattice-pager"(d) {
    const { W, H } = d; const s = W / 236;
    d.rect(0, 0, W, H, "bg");
    hair(d, 0.5 * s, 0, 0.5 * s, H, s);
    railNumber(d, W - 38 * s, 18 * s, s);
  },

  // ---- section heading with the ghost word: 960 x 540 ---------------------------------------
  "card.lattice-ghost-title"(d) {
    const { W, H, p } = d; const s = W / 960;
    d.rect(0, 0, W, H, "bg");
    lattice(d, 0, 0, W, H, s * 0.5);
    hair(d, 0, 76 * s, W, 76 * s, s); hair(d, 0, 450 * s, W, 450 * s, s); hair(d, 841 * s, 0, 841 * s, H, s);
    d.image("media", 430 * s, 90 * s, 400 * s, 350 * s, "object or figure", { labelAt: [0.5, 0.5] });
    const x = 72 * s;
    d.text("tag", x, 112 * s, 13 * s, { role: "white", family: "narrow", weight: 500, box: [x - 2 * s, 99 * s, 200 * s, 18 * s] });
    d.text("label", x, 140 * s, 20 * s, { role: "white", family: "narrow", weight: 500, box: [x - 2 * s, 120 * s, 200 * s, 26 * s] });
    const ty = p.title_y * s;
    d.text("title_latin", x, ty, 24 * s, { role: "white", family: "wide", box: [x - 2 * s, ty - 24 * s, 340 * s, 30 * s] });
    d.text("title_cjk", x, ty + 46 * s, 36 * s, { role: "white", family: "head", tracking: 60, box: [x - 2 * s, ty + 6 * s, 340 * s, 48 * s] });
    d.rect(x, ty + 62 * s, 115 * s, 4 * s, "cyan");
    d.text("note", x, ty + 104 * s, 13 * s, { role: "white", family: "body", box: [x - 2 * s, ty + 90 * s, 300 * s, 18 * s] });
    ghost(d, 68 * s, 450 * s, s * 0.75);
    d.zone("column", "safe", [0, 90 * s, 420 * s, 350 * s], { slots: ["tag", "label", "title_latin", "title_cjk", "note"] });
  },

  // ---- bulletin screen: 1920 x 1080 ---------------------------------------------------------
  "kv.lattice-bulletin"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "bg");
    lattice(d, 0, 0, W, H, s);
    d.image("art", 550 * s, 152 * s, 1133 * s, 748 * s, "key art 2266 x 1496", { labelAt: [0.62, 0.5] });
    d.def(`<linearGradient id="bfade" x1="0" x2="1"><stop offset="0" stop-color="${d.pal.bg}" stop-opacity=".95"/><stop offset="1" stop-color="${d.pal.bg}" stop-opacity="0"/></linearGradient>`);
    d.raw(`<rect data-deco="1" x="${f1(550 * s)}" y="${f1(152 * s)}" width="${f1(180 * s)}" height="${f1(748 * s)}" fill="url(#bfade)"/>`);
    d.rect(0, 0, W, 152 * s, "top");
    hair(d, 0, 152 * s, W, 152 * s, s); hair(d, 0, 900 * s, W, 900 * s, s); hair(d, FRAME.rail * s, 0, FRAME.rail * s, H, s);
    ghost(d, 136 * s, 900 * s, s);
    // tabs: the current one is a 90 x 20 cyan block with black text and a chevron
    const cur = p.tab;
    for (let i = 1; i <= 4; i += 1) {
      const x = (62 + (i - 1) * 112) * s; const y = 188 * s;
      if (i === cur) { d.rect(x, y + 2 * s, 90 * s, 20 * s, "cyan"); d.raw(`<g data-deco="1">${chev(x + 76 * s, y + 12 * s, s, d.pal.black)}</g>`); }
      d.text(`tab_${i}`, x + 2 * s, y + 19 * s, 16 * s, { role: i === cur ? "black" : "white", family: "head", box: [x, y + 2 * s, 70 * s, 20 * s] });
    }
    const n = Math.round(p.items);
    for (let i = 1; i <= n; i += 1) {
      const y = (230 + (i - 1) * 96) * s;
      d.text(`cat_${i}`, 62 * s, y + 54 * s, 18 * s, { role: "cyan", family: "head", box: [60 * s, y + 34 * s, 60 * s, 26 * s] });
      dateOnly(d, `date_${i}`);
      d.text(`date_${i}`, 142 * s, y + 20 * s, 15 * s, { role: "t2", family: "mono", tracking: 60, box: [140 * s, y + 4 * s, 240 * s, 20 * s] });
      d.text(`news_${i}`, 142 * s, y + 46 * s, 17 * s, { role: "t2", family: "head", tracking: 80, box: [140 * s, y + 26 * s, 290 * s, 60 * s] });
      hair(d, 62 * s, y + 96 * s, 422 * s, y + 96 * s, s);
    }
    const by = (230 + n * 96 + 30) * s;
    d.rect(62 * s, by, 122 * s, 24 * s, "btn");
    d.text("read_more", 72 * s, by + 17 * s, 14 * s, { role: "t2", family: "mono", box: [70 * s, by + 2 * s, 94 * s, 20 * s] });
    d.raw(`<g data-deco="1">${chev(166 * s, by + 12 * s, s, d.pal.t2)}</g>`);
    // headline block and the main button
    dateOnly(d, "head_date");
    d.text("head_date", 50 * s, 698 * s, 16 * s, { role: "t2", family: "mono", tracking: 60, box: [48 * s, 682 * s, 240 * s, 20 * s] });
    d.text("headline", 50 * s, 746 * s, 34 * s, { role: "white", family: "head", tracking: 60, box: [48 * s, 712 * s, 480 * s, 96 * s] });
    d.rect(51 * s, 870 * s, 230 * s, 60 * s, "cyan_dim");
    d.text("button", 67 * s, 898 * s, 20 * s, { role: "black", family: "head", box: [64 * s, 876 * s, 150 * s, 28 * s] });
    d.text("button_latin", 67 * s, 918 * s, 13 * s, { role: "black", family: "mono", box: [64 * s, 906 * s, 150 * s, 18 * s] });
    d.raw(`<g data-deco="1">${chev(254 * s, 900 * s, s * 1.2, d.pal.black)}</g>`);
    // progress: grey track, the current segment cyan
    d.rect(944 * s, 902 * s, 976 * s, 8 * s, "track");
    d.rect((944 + 120 + (Math.round(p.active) - 1) * 260) * s, 902 * s, 195 * s, 8 * s, "cyan");
    railNumber(d, W - 38 * s, 480 * s, s);
    d.zone("list", "safe", [0, 152 * s, 550 * s, 748 * s], { slots: ["tab_1", "tab_2", "tab_3", "tab_4", "read_more"] });
  },

  // ---- more: four full-height columns, 1920 x 1080 ------------------------------------------
  "banner.lattice-columns"(d) {
    const { W, H, p } = d; const s = W / 1920; const n = 4; const cw = W / n;
    d.rect(0, 0, W, H, "bg");
    const icons = ["route", "blocks", "play", "book"];
    for (let i = 1; i <= n; i += 1) {
      const x = (i - 1) * cw;
      d.image(`col_${i}`, x, 0, cw, 690 * s, "column art 960 x 2160 (top part)", { labelAt: [0.5, 0.4] });
      d.rect(x, 690 * s, cw, H - 690 * s, "plate");
      if (p.icons) d.raw(`<g data-deco="1">${ICON[icons[i - 1]](x + 90 * s, 742 * s, s, d.pal.white)}</g>`);
      d.text(`col_zh_${i}`, x + 134 * s, 762 * s, 50 * s, { role: "white", family: "head", box: [x + 132 * s, 708 * s, cw - 150 * s, 66 * s] });
      d.text(`col_en_${i}`, x + 134 * s, 820 * s, 14 * s, { role: "white", family: "wide", box: [x + 132 * s, 804 * s, cw - 150 * s, 20 * s] });
      d.text(`view_${i}`, x + 134 * s, 840 * s, 12 * s, { role: "white", family: "mono", box: [x + 132 * s, 827 * s, 140 * s, 17 * s] });
      d.rect(x + 134 * s, 856 * s, 108 * s, Math.max(1, 1.5 * s), "white");
    }
    hair(d, 0, 900 * s, W, 900 * s, s); hair(d, 0, 152 * s, W, 152 * s, s);
    d.zone("labels", "safe", [0, 690 * s, W, 210 * s], { slots: [1, 2, 3, 4].flatMap((i) => [`col_zh_${i}`, `col_en_${i}`]) });
  },
};

module.exports = { LAYOUTS, GRID, FRAME };
