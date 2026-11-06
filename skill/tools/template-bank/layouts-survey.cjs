"use strict";

// Layouts of the frontier-survey style pack (styles/frontier-survey/style.json): the official-site
// grammar of industrial sci-fi frontier games, measured on a reference site (screenshots kept
// private, never shipped) and proven on the original site 远垦导线 TRAVERSE. A white page with a
// fixed left rail, one signal yellow in tall columns and side bands, a four-layer section title
// (micro path, grey arrow block + wide Latin caps, CJK), hatched ghost lettering, isometric
// topographic contours and data marks (rulers, datum marks, the three-colour rule); objects are
// left to the image slots (no drawn pseudo-illustration).
// Geometry in the reference's own 1920 units (a 1280 design at 1.5x) scaled to the canvas.

const { f1, esc, rng, invalid } = require("./layout-kit.cjs");

// Topographic contours: closed wobbling rings around a few centres (deterministic decoration).
function contours(d, x0, y0, w, h, seed, color) {
  const r = rng(seed); let p = "";
  for (let c = 0; c < 3; c += 1) {
    const cx = x0 + w * (0.15 + r() * 0.7); const cy = y0 + h * (0.2 + r() * 0.6); const ph = r() * 6;
    for (let k = 1; k <= 7; k += 1) {
      const R = k * Math.min(w, h) * 0.07; let ring = "";
      for (let i = 0; i <= 48; i += 1) { const a = (i / 48) * Math.PI * 2; const rr = R * (1 + 0.16 * Math.sin(a * 3 + ph + k * 0.4) + 0.08 * Math.sin(a * 5 - ph)); ring += `${i ? "L" : "M"}${f1(cx + Math.cos(a) * rr * 1.35)} ${f1(cy + Math.sin(a) * rr)}`; }
      p += ring + "Z";
    }
  }
  return `<path data-deco="1" d="${p}" fill="none" stroke="${color}" stroke-width="${f1(1.2 * d.k)}"/>`;
}
// −45 degree hatch used for ghost lettering and empty lanes.
function hatch(d, id, color, gap, w) {
  d.def(`<pattern id="${id}" width="${f1(gap)}" height="${f1(gap)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="${f1(w)}" height="${f1(gap)}" fill="${color}"/></pattern>`);
  return `url(#${id})`;
}
// Survey datum mark (the placeholder brand): ring, cross, solid centre.
const datum = (cx, cy, r, c, w) => `<g fill="none" stroke="${c}" stroke-width="${f1(w)}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/><path d="M${f1(cx - r * 1.35)} ${f1(cy)}H${f1(cx + r * 1.35)}M${f1(cx)} ${f1(cy - r * 1.35)}V${f1(cy + r * 1.35)}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.32)}" fill="${c}"/></g>`;
// Round arrow button (the 54-56 unit #FAFAFA disc) and the capsule track that holds two.
// dir: 1 points left, -1 right, "up" / "down" vertical
const arrowBtn = (d, cx, cy, r, dir) => {
  const k = d.k; const v = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  const path = v ? `M${f1(cx - 8 * k)} ${f1(cy - 3 * v * k)} l${f1(8 * k)} ${f1(8 * v * k)} l${f1(8 * k)} ${f1(-8 * v * k)}` : `M${f1(cx + 3 * dir * k)} ${f1(cy - 8 * k)} l${f1(-8 * dir * k)} ${f1(8 * k)} l${f1(8 * dir * k)} ${f1(8 * k)}`;
  return `<g data-deco="1"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${d.pal.btn_light}"/><path d="${path}" fill="none" stroke="${d.pal.ink}" stroke-width="${f1(3.4 * k)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
};
function pager(d, x, y, s, dark) {
  const w = 164 * s; const h = 63 * s;
  d.raw(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${d.pal[dark ? "track_dark" : "grey2"]}" data-role="${dark ? "track_dark" : "grey2"}"/>`);
  d.raw(arrowBtn(d, x + 32 * s, y + h / 2, 28 * s, 1) + arrowBtn(d, x + w - 32 * s, y + h / 2, 28 * s, -1));
}
// Tri-code: the three-colour rule (red, yellow, cyan) under names and on cards.
const tri = (d, x, y, w, h) => `<g data-deco="1"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w * 0.28)}" height="${f1(h)}" fill="${d.pal.red}"/><rect x="${f1(x + w * 0.28)}" y="${f1(y)}" width="${f1(w * 0.28)}" height="${f1(h)}" fill="${d.pal.yellow}"/><rect x="${f1(x + w * 0.56)}" y="${f1(y)}" width="${f1(w * 0.44)}" height="${f1(h)}" fill="${d.pal.cyan}"/></g>`;
// Micro decoration (the cross box, two micro lines, six grey squares, the tri-code stub).
function microDeco(d, x, y, s, color) {
  let g = `<g data-deco="1"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(11 * s)}" height="${f1(11 * s)}" fill="none" stroke="${color}" stroke-width="${f1(1.2 * s)}"/><path d="M${f1(x + 2.5 * s)} ${f1(y + 5.5 * s)}h${f1(6 * s)}M${f1(x + 5.5 * s)} ${f1(y + 2.5 * s)}v${f1(6 * s)}" stroke="${color}" stroke-width="${f1(1.2 * s)}"/>`;
  g += `<text data-deco="1" x="${f1(x)}" y="${f1(y + 22 * s)}" font-family="${esc(d.families.wide)}" font-size="${f1(6 * s)}" fill="${color}">MISSION-GRADE SURVEY</text><text data-deco="1" x="${f1(x)}" y="${f1(y + 30 * s)}" font-family="${esc(d.families.wide)}" font-size="${f1(6 * s)}" fill="${color}">FIELD INTERFACES</text>`;
  for (let i = 0; i < 6; i += 1) g += `<rect x="${f1(x + i * 11 * s)}" y="${f1(y + 42 * s)}" width="${f1(7 * s)}" height="${f1(7 * s)}" fill="${d.pal.grey4}"/>`;
  g += `<rect x="${f1(x)}" y="${f1(y + 60 * s)}" width="${f1(6 * s)}" height="${f1(22 * s)}" fill="${d.pal.red}"/><rect x="${f1(x)}" y="${f1(y + 82 * s)}" width="${f1(6 * s)}" height="${f1(22 * s)}" fill="${d.pal.cyan}"/><rect x="${f1(x)}" y="${f1(y + 104 * s)}" width="${f1(6 * s)}" height="${f1(34 * s)}" fill="${d.pal.yellow}"/><rect x="${f1(x + 6 * s)}" y="${f1(y + 60 * s)}" width="${f1(6 * s)}" height="${f1(34 * s)}" fill="${d.pal.grey3}"/>`;
  return `${g}</g>`;
}
// The four-layer section title: micro path, grey arrow block + wide Latin caps, CJK below.
// Sizes from the reference at 1920: block 78 x 24, Latin 27 (wide face set at 21), CJK 36, gap 6.
function titleBlock(d, x, y, s, { right = false, dark = false } = {}) {
  const ink = dark ? "white" : "ink"; const bw = 78 * s; const bh = 24 * s;
  const { text: lat } = d.value("title_latin"); const { text: cjk } = d.value("title_cjk");
  if (!/^[A-Z0-9 &:./-]+$/.test(String(lat))) throw invalid(`slot title_latin takes Latin caps, digits and & : . / - only (a wide Latin face draws it), got ${JSON.stringify(lat)}. Fix: --set title_latin=GAMEPLAY ; put CJK in title_cjk`);
  const lw = String(lat).length * 21 * s * 1.04; const cw = [...String(cjk)].length * 36 * s * 1.04;
  const bx = right ? x - bw - 8 * s - lw : x;
  d.raw(`<text data-deco="1" x="${f1(bx)}" y="${f1(y - 7 * s)}" font-family="${esc(d.families.wide)}" font-size="${f1(6.5 * s)}" fill="${d.pal[dark ? "mute_dark" : "mute"]}">+ TRAVERSE · FIELD RECORD</text>`);
  d.raw(`<rect x="${f1(bx)}" y="${f1(y)}" width="${f1(bw)}" height="${f1(bh)}" fill="${d.pal.grey3}" data-role="grey3"/><path data-deco="1" d="M${f1(bx + bw - 22 * s)} ${f1(y + 6 * s)}l${f1(12 * s)} ${f1(12 * s)}m${f1(-9 * s)} 0h${f1(9 * s)}v${f1(-9 * s)}" fill="none" stroke="${d.pal.ink}" stroke-width="${f1(2.4 * s)}"/>`);
  d.text("title_latin", bx + bw + 8 * s, y + bh - 3 * s, 21 * s, { role: ink, family: "wide", box: [bx + bw + 6 * s, y - 1 * s, lw + 6 * s, bh + 2 * s] });
  d.text("title_cjk", right ? x : bx, y + bh + 6 * s + 31 * s, 36 * s, { role: ink, family: "head", anchor: right ? "end" : "start", box: [right ? x - cw - 4 * s : bx - 2 * s, y + bh + 3 * s, cw + 6 * s, 42 * s] });
  return { bottom: y + bh + 42 * s, left: bx };
}
function digitsOnly(d, name, re, example) {
  const { text } = d.value(name);
  if (!re.test(String(text))) throw invalid(`slot ${name} takes ${re === DATE ? "digits and . only" : re === INDEX_ALBUM ? "digits and / only, one digit each side" : "digits and / only"}, got ${JSON.stringify(text)}. Fix: --set ${name}=${example} ; put words in a text slot`);
}
const DATE = /^\d{1,2}\.\d{2}$/; const INDEX = /^\d{1,2} ?\/ ?\d{1,2}$/;
// the album's index box is 28 units wide (the caption starts 30 units in): one digit each side
const INDEX_ALBUM = /^\d ?\/ ?\d$/;

const LAYOUTS = {
  // ---- the left rail, open: 270 x 1080 ----------------------------------------------------------
  "ui.survey-rail"(d) {
    const { W, H, p } = d; const s = H / 1080;
    d.rect(0, 0, W, H, "white");
    d.raw(`<rect x="${f1(W - 1 * s)}" y="0" width="${f1(1 * s)}" height="${f1(H)}" fill="${d.pal.grey2}" data-deco="1"/>`);
    // brand: black square with the datum mark, a yellow rule
    d.raw(`<g data-deco="1"><rect x="${f1(14 * s)}" y="${f1(14 * s)}" width="${f1(62 * s)}" height="${f1(62 * s)}" fill="${d.pal.ink}"/>${datum(45 * s, 43 * s, 14 * s, d.pal.yellow, 4 * s)}<rect x="${f1(22 * s)}" y="${f1(66 * s)}" width="${f1(46 * s)}" height="${f1(3 * s)}" fill="${d.pal.yellow}"/></g>`);
    const cur = Math.round(p.current);
    d.raw(`<rect x="0" y="${f1((152 + (cur - 1) * 60) * s)}" width="${f1(252 * s)}" height="${f1(60 * s)}" fill="${d.pal.grey2}" data-role="grey2"/><rect x="0" y="${f1((152 + (cur - 1) * 60) * s)}" width="${f1(9 * s)}" height="${f1(60 * s)}" fill="${d.pal.ink}" data-role="ink"/>`);
    for (let i = 1; i <= 7; i += 1) {
      const y = (152 + (i - 1) * 60) * s;
      d.raw(`<g data-deco="1">${datum(46 * s, y + 30 * s, 9 * s, d.pal[i === cur ? "ink" : "grey4"], 2.4 * s)}</g>`);
      d.text(`nav_${i}`, 84 * s, y + 35 * s, 14 * s, { role: "ink", family: "body", box: [82 * s, y + 18 * s, 164 * s, 24 * s] });
    }
    // tool capsule (open: a 234 x 139 plate), go block, share
    d.raw(`<rect x="${f1(18 * s)}" y="${f1(680 * s)}" width="${f1(234 * s)}" height="${f1(139 * s)}" rx="${f1(4 * s)}" fill="${d.pal.grey1}" data-role="grey1"/>`);
    for (let i = 1; i <= 3; i += 1) {
      const y = (680 + (i - 1) * 46.3) * s;
      if (i > 1) d.raw(`<rect data-deco="1" x="${f1(30 * s)}" y="${f1(y)}" width="${f1(210 * s)}" height="${f1(1 * s)}" fill="${d.pal.grey3}"/>`);
      d.raw(`<circle data-deco="1" cx="${f1(48 * s)}" cy="${f1(y + 23 * s)}" r="${f1(8 * s)}" fill="${d.pal.grey5}"/>`);
      d.text(`tool_${i}`, 135 * s, y + 28 * s, 14 * s, { role: "ink", family: "body", anchor: "middle", box: [72 * s, y + 10 * s, 170 * s, 24 * s] });
    }
    d.raw(`<rect x="${f1(18 * s)}" y="${f1(848 * s)}" width="${f1(234 * s)}" height="${f1(48 * s)}" rx="${f1(4 * s)}" fill="${d.pal.ink}" data-role="ink"/><path data-deco="1" d="M${f1(34 * s)} ${f1(862 * s)}h${f1(22 * s)}l${f1(-11 * s)} ${f1(20 * s)}z" fill="${d.pal.yellow}"/><rect data-deco="1" x="${f1(70 * s)}" y="${f1(860 * s)}" width="${f1(1.5 * s)}" height="${f1(24 * s)}" fill="${d.pal.grey5}"/>`);
    d.text("go", 150 * s, 878 * s, 16 * s, { role: "white", family: "body", anchor: "middle", box: [80 * s, 858 * s, 150 * s, 28 * s] });
    d.raw(`<rect data-deco="1" x="${f1(18 * s)}" y="${f1(912 * s)}" width="${f1(234 * s)}" height="${f1(33 * s)}" rx="${f1(4 * s)}" fill="${d.pal.grey2}"/>`);
    for (let i = 0; i < 7; i += 1) d.raw(`<circle data-deco="1" cx="${f1((40 + i * 31) * s)}" cy="${f1(928.5 * s)}" r="${f1(7 * s)}" fill="${d.pal.grey4}"/>`);
    d.raw(`<g data-deco="1" fill="${d.pal.ink}"><path d="M${f1(210 * s)} ${f1(1030 * s)}v${f1(12 * s)}l${f1(-9 * s)} ${f1(-6 * s)}z"/><rect x="${f1(216 * s)}" y="${f1(1031 * s)}" width="${f1(18 * s)}" height="${f1(2.5 * s)}"/><rect x="${f1(216 * s)}" y="${f1(1037 * s)}" width="${f1(18 * s)}" height="${f1(2.5 * s)}"/></g>`);
    d.zone("rail", "safe", [0, 0, W, H], { slots: ["nav_1", "nav_2", "nav_3", "nav_4", "nav_5", "nav_6", "nav_7", "tool_1", "tool_2", "tool_3", "go"] });
  },

  // ---- section opener: 960 x 540 -----------------------------------------------------------------
  "card.survey-section-title"(d) {
    const { W, H, p } = d; const s = W / 960; const dark = p.tone === "dark";
    d.rect(0, 0, W, H, dark ? "navy" : "white");
    d.raw(contours(d, 0, 0, W, H, 7, d.pal[dark ? "line_dark" : "line"]));
    const cx = W * p.col_x; const cw = 168 * s;
    d.raw(`<rect x="${f1(cx)}" y="0" width="${f1(cw)}" height="${f1(H)}" fill="${d.pal.yellow}" data-role="yellow"/>`);
    // hatched ghost lettering behind: a word, never information
    const { text: ghost } = d.value("ghost_latin");
    const fill = hatch(d, "survey-ghost", d.pal[dark ? "ghost_dark" : "ink"], 7 * s, 1.6 * s);
    d.raw(`<text data-slot="ghost_latin" data-kind="text" data-decor="1" data-bleed="1" data-deco="1" x="${f1(40 * s)}" y="${f1(520 * s)}" font-family="${esc(d.families.wide)}" font-size="${f1(150 * s)}" fill="${fill}" opacity=".55" letter-spacing="${f1(-8 * s)}">${esc(ghost)}</text>`);
    if (p.ruler) { // a survey ruler and datum on the column: abstract, never an object drawing
      let r = ""; for (let i = 0; i <= 30; i += 1) r += `<rect x="${f1(cx + cw - (i % 5 ? 18 : 40) * s)}" y="${f1((70 + i * 12) * s)}" width="${f1((i % 5 ? 18 : 40) * s)}" height="${f1(2 * s)}" fill="${d.pal.ink}"/>`;
      d.raw(`<g data-deco="1">${r}${datum(cx + cw * 0.42, 250 * s, 30 * s, d.pal.ink, 5 * s)}<path d="M${f1(cx + cw * 0.42)} ${f1(150 * s)}V${f1(350 * s)}M${f1(cx + 12 * s)} ${f1(250 * s)}H${f1(cx + cw - 50 * s)}" stroke="${d.pal.ink}" stroke-width="${f1(1.5 * s)}" stroke-dasharray="${f1(6 * s)} ${f1(5 * s)}"/></g>`);
    }
    titleBlock(d, 60 * s, 110 * s, s, { dark });
    d.raw(microDeco(d, 60 * s, 230 * s, s, d.pal[dark ? "mute_dark" : "mute"]));
    d.zone("title", "safe", [0, 60 * s, cx, 220 * s], { slots: ["title_cjk", "title_latin"] });
  },

  // ---- crew dossier: 1920 x 1080 ------------------------------------------------------------------
  "card.survey-dossier"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "white");
    d.raw(`<rect x="${f1(p.col_x * W)}" y="0" width="${f1(656 * s)}" height="${f1(1043 * s)}" fill="${d.pal.yellow}" data-role="yellow"/>`);
    const { text: ghost } = d.value("ghost_latin");
    const fill = hatch(d, "survey-ghost-d", d.pal.ink, 11 * s, 2.4 * s);
    d.raw(`<text data-slot="ghost_latin" data-kind="text" data-decor="1" data-bleed="1" data-deco="1" x="${f1(349 * s)}" y="${f1(560 * s)}" font-family="${esc(d.families.wide)}" font-size="${f1(214 * s)}" fill="${fill}" opacity=".6" letter-spacing="${f1(-14 * s)}">${esc(ghost)}</text>`);
    d.image("portrait", 860 * s, 20 * s, 1060 * s, 1060 * s, "figure 2120 x 2120, safe x 190-830", { labelAt: [0.5, 0.42] });
    // avatar rail: five 102-unit circles on a grey column, the current one yellow-ringed
    d.raw(`<rect x="${f1(194 * s)}" y="${f1(120 * s)}" width="${f1(105 * s)}" height="${f1(790 * s)}" fill="${d.pal.grey1}" data-role="grey1"/>`);
    d.raw(arrowBtn(d, 247 * s, 192 * s, 28 * s, "up") + arrowBtn(d, 247 * s, 858 * s, 28 * s, "down"));
    for (let i = 0; i < 4; i += 1) { const cy = (300 + i * 147) * s; d.raw(`<circle data-deco="1" cx="${f1(247 * s)}" cy="${f1(cy)}" r="${f1(49 * s)}" fill="${d.pal.white}" stroke="${d.pal[i === 1 ? "yellow" : "grey1"]}" stroke-width="${f1((i === 1 ? 2 : 3) * s)}"/><circle data-deco="1" cx="${f1(247 * s)}" cy="${f1(cy)}" r="${f1(43 * s)}" fill="${d.pal.grey2}"/>`); }
    // REC head, code bar, rank marks
    const x = 367 * s;
    d.raw(`<g data-deco="1" font-family="${esc(d.families.wide)}"><text data-deco="1" x="${f1(x)}" y="${f1(186 * s)}" font-size="${f1(16 * s)}" fill="${d.pal.mute}">[</text><text data-deco="1" x="${f1(x + 34 * s)}" y="${f1(186 * s)}" font-size="${f1(17 * s)}" fill="${d.pal.ink}">REC</text><text data-deco="1" x="${f1(x + 104 * s)}" y="${f1(186 * s)}" font-size="${f1(16 * s)}" fill="${d.pal.mute}">]</text></g>`);
    d.raw(`<rect x="${f1(x)}" y="${f1(198 * s)}" width="${f1(233 * s)}" height="${f1(16 * s)}" fill="${d.pal.grey3}" data-role="grey3"/>`);
    d.text("code", x + 4 * s, 211 * s, 12 * s, { role: "ink", family: "geo", box: [x + 2 * s, 197 * s, 160 * s, 17 * s] });
    digitsOnly(d, "index", INDEX, "1/5");
    d.text("index", x + 229 * s, 211 * s, 12 * s, { role: "ink", family: "geo", anchor: "end", box: [x + 170 * s, 197 * s, 62 * s, 17 * s] });
    const rank = Math.round(p.rank);
    for (let i = 0; i < 6; i += 1) { const rx = x + i * 50 * s; d.raw(`<g data-deco="1"><polygon points="${f1(rx + 23 * s)},${f1(232 * s)} ${f1(rx + 43 * s)},${f1(272 * s)} ${f1(rx + 3 * s)},${f1(272 * s)}" fill="${d.pal[i < rank ? "ink" : "grey2"]}"/><polygon points="${f1(rx + 23 * s)},${f1(248 * s)} ${f1(rx + 31 * s)},${f1(266 * s)} ${f1(rx + 15 * s)},${f1(266 * s)}" fill="${d.pal[i < rank && i === 5 ? "yellow" : "white"]}"/></g>`); }
    // grey tape rules
    d.raw(`<g data-deco="1" fill="${d.pal.grey3}"><rect x="${f1(x)}" y="${f1(599 * s)}" width="${f1(75 * s)}" height="${f1(8 * s)}"/><rect x="${f1(780 * s)}" y="${f1(599 * s)}" width="${f1(900 * s)}" height="${f1(8 * s)}"/></g>`);
    // name in brackets with two badges
    d.raw(`<g data-deco="1"><rect x="${f1(x)}" y="${f1(651 * s)}" width="${f1(41 * s)}" height="${f1(41 * s)}" fill="${d.pal.ink}"/><path d="M${f1(x + 10 * s)} ${f1(662 * s)}h${f1(21 * s)}l${f1(-10.5 * s)} ${f1(19 * s)}z" fill="${d.pal.white}"/><rect x="${f1(x + 41 * s)}" y="${f1(651 * s)}" width="${f1(41 * s)}" height="${f1(41 * s)}" fill="${d.pal.yellow}"/>${datum(x + 61.5 * s, 671.5 * s, 9 * s, d.pal.ink, 2.4 * s)}</g>`);
    d.raw(`<g data-deco="1" font-family="${esc(d.families.geo)}" font-weight="300" font-size="${f1(40 * s)}" fill="${d.pal.mute}"><text data-deco="1" x="${f1(x + 110 * s)}" y="${f1(690 * s)}">[</text></g>`);
    const { text: nm } = d.value("name"); const nw = [...String(nm)].length * 58 * s;
    d.text("name", x + 150 * s, 695 * s, 58 * s, { role: "ink", family: "head", box: [x + 146 * s, 640 * s, nw + 10 * s, 70 * s] });
    d.raw(`<text data-deco="1" x="${f1(x + 166 * s + nw)}" y="${f1(690 * s)}" font-family="${esc(d.families.geo)}" font-weight="300" font-size="${f1(40 * s)}" fill="${d.pal.mute}">]</text>`);
    d.raw(tri(d, x, 744 * s, 545 * s, 3 * s));
    // label / value chips, two columns
    for (let i = 1; i <= 4; i += 1) {
      const cx = x + ((i - 1) % 2) * 285 * s; const cy = (761 + Math.floor((i - 1) / 2) * 48) * s; const voice = i > 2;
      d.raw(`<rect x="${f1(cx)}" y="${f1(cy)}" width="${f1(90 * s)}" height="${f1(24 * s)}" fill="${d.pal[voice ? "yellow" : "ink"]}" data-role="${voice ? "yellow" : "ink"}"/><rect x="${f1(cx + 90 * s)}" y="${f1(cy)}" width="${f1(165 * s)}" height="${f1(24 * s)}" fill="${d.pal.grey1}" data-role="grey1"/>`);
      d.text(`label_${i}`, cx + 45 * s, cy + 18 * s, 16 * s, { role: voice ? "ink" : "white", family: "body", anchor: "middle", box: [cx + 2 * s, cy + 1 * s, 86 * s, 22 * s] });
      d.text(`value_${i}`, cx + 172.5 * s, cy + 18 * s, 16 * s, { role: "ink", family: "body", anchor: "middle", box: [cx + 92 * s, cy + 1 * s, 161 * s, 22 * s] });
    }
    d.text("quote", x, 880 * s, 19 * s, { role: "ink", family: "body", box: [x - 2 * s, 858 * s, 556 * s, 28 * s] });
    d.text("bio", x, 920 * s, 17 * s, { role: "ink", family: "body", lineHeight: 1.62, box: [x - 2 * s, 900 * s, 556 * s, 92 * s] });
    d.zone("info", "safe", [x - 10 * s, 150 * s, 600 * s, 860 * s], { slots: ["name", "quote", "bio", "code", "index"] });
  },

  // ---- album screen: 1920 x 1080 --------------------------------------------------------------------
  "kv.survey-album"(d) {
    const { W, H, p } = d; const s = W / 1920; const right = p.side === "right"; const grey = p.band === "grey";
    d.rect(0, 0, W, H, "white");
    let top = 270 * s;
    if (p.wordmark) {
      const { text: mark } = d.value("mark_latin");
      if (!/^[A-Z0-9 ]+$/.test(String(mark))) throw invalid(`slot mark_latin takes Latin caps and digits only, got ${JSON.stringify(mark)}. Fix: --set mark_latin=TRAVERSE`);
      d.raw(`<g data-deco="1">${datum(300 * s, 140 * s, 52 * s, d.pal.ink, 15 * s)}</g>`);
      d.text("mark_latin", 400 * s, 196 * s, 146 * s, { role: "ink", family: "wide", tracking: -34, box: [394 * s, 40 * s, 1440 * s, 180 * s] });
    } else top = 69 * s;
    const ax = right ? 112 * s : 456 * s; const aw = 1338 * s; const ah = 653 * s;
    const imgX = right ? ax + 229 * s : ax; const bandX = right ? ax : ax + 1109 * s;
    d.image("media", imgX, top, 1109 * s, ah, "scene 2218 x 1306", { labelAt: [0.5, 0.45] });
    d.raw(`<rect x="${f1(bandX)}" y="${f1(top)}" width="${f1(229 * s)}" height="${f1(ah)}" fill="${d.pal[grey ? "band_grey" : "yellow"]}" data-role="${grey ? "band_grey" : "yellow"}"/><rect data-deco="1" x="${f1(bandX + 23 * s)}" y="${f1(top + 18 * s)}" width="${f1(27 * s)}" height="${f1(618 * s)}" fill="${d.pal.white}"/>`);
    const { text: band } = d.value("band_latin"); const bl = String(band).length * 50 * s * 1.04;
    const bx = bandX + 34 * s; const by = top + 24 * s;
    d.text("band_latin", bx, by, 50 * s, { role: "ink", family: "wide", transform: `rotate(90 ${f1(bx)} ${f1(by)})`, box: [bx - 16 * s, by - 2 * s, 66 * s, Math.min(bl + 6 * s, 600 * s)] });
    d.raw(`<text data-deco="1" x="${f1(bandX + 190 * s)}" y="${f1(top + 560 * s)}" font-family="${esc(d.families.wide)}" font-size="${f1(6 * s)}" fill="${d.pal.ink}" transform="rotate(90 ${f1(bandX + 190 * s)} ${f1(top + 560 * s)})">SURVEY MANUAL / FIELD EDITION</text>`);
    pager(d, imgX + 27 * s, top + ah - 48 * s, s, true);
    // caption: index, title, description
    digitsOnly(d, "index", INDEX_ALBUM, "1/4");
    const cx = imgX + 30 * s; const cy = top + ah + 40 * s;
    d.text("index", imgX, cy - 22 * s, 12 * s, { role: "ink", family: "geo", box: [imgX - 2 * s, cy - 36 * s, 28 * s, 18 * s] });
    d.text("caption", cx, cy + 10 * s, 36 * s, { role: "ink", family: "body", box: [cx - 2 * s, cy - 26 * s, 700 * s, 44 * s] });
    d.text("desc", cx, cy + 50 * s, 20 * s, { role: "ink", family: "body", lineHeight: 1.5, box: [cx - 2 * s, cy + 28 * s, 700 * s, 84 * s] });
    // the title block and its micro decoration on the open side
    const tx = right ? 1500 * s : 128 * s; const ty = right ? 81 * s : top + 10 * s;
    titleBlock(d, tx, ty, s);
    d.raw(microDeco(d, tx, ty + 110 * s, s, d.pal.mute));
    d.raw(`<rect data-deco="1" x="${f1(tx)}" y="${f1(right ? 613 * s : top + ah - 111 * s)}" width="${f1(111 * s)}" height="${f1(111 * s)}" fill="${d.pal.grey3}"/>`);
    d.zone("caption", "safe", [imgX - 10 * s, top + ah, 760 * s, H - top - ah], { slots: ["index", "caption", "desc"] });
  },

  // ---- version timeline: 1920 x 640 ----------------------------------------------------------------
  "banner.survey-timeline"(d) {
    const { W, H, p } = d; const s = W / 1920; const days = 44;
    d.rect(0, 0, W, H, "white");
    const x0 = 116 * s; const lane0 = 150 * s; const laneH = 104 * s; const catW = 118 * s; const gx = x0 + catW; const gw = W - gx - 40 * s; const day = gw / days;
    // the date rail: a grey band with day ticks and three black date chips
    d.raw(`<rect x="${f1(40 * s)}" y="${f1(60 * s)}" width="${f1(W - 80 * s)}" height="${f1(39 * s)}" fill="${d.pal.grey2}" data-role="grey2"/>`);
    for (let k = 0; k < days; k += 2) { const dd = 18 + k; const n = dd > 30 ? dd - 30 : dd; d.raw(`<text data-deco="1" x="${f1(gx + k * day + 4 * s)}" y="${f1(84 * s)}" font-family="${esc(d.families.geo)}" font-weight="500" font-size="${f1(12 * s)}" fill="${d.pal.mute}">${String(n).padStart(2, "0")}</text>`); }
    const marks = [2, 16, 30];
    marks.forEach((m, i) => {
      digitsOnly(d, `date_${i + 1}`, DATE, "11.20");
      const cx = gx + m * day - 6 * s; const on = i === Math.round(p.current) - 1;
      d.raw(`<rect x="${f1(cx)}" y="${f1(60 * s)}" width="${f1(104 * s)}" height="${f1(37 * s)}" fill="${d.pal[on ? "yellow" : "ink"]}" data-role="${on ? "yellow" : "ink"}"/><rect data-deco="1" x="${f1(cx)}" y="${f1(97 * s)}" width="${f1(104 * s)}" height="${f1(3 * s)}" fill="${d.pal[on ? "ink" : "yellow"]}"/><rect data-deco="1" x="${f1(cx + 4 * s)}" y="${f1(64 * s)}" width="${f1(6 * s)}" height="${f1(6 * s)}" fill="${d.pal[on ? "ink" : "yellow"]}"/>`);
      d.text(`date_${i + 1}`, cx + 18 * s, 90 * s, 28 * s, { role: on ? "ink" : "white", family: "geo", weight: 500, box: [cx + 14 * s, 62 * s, 88 * s, 34 * s] });
    });
    // lanes: hatched empty ground, a category column per group
    const lanes = 4; const hl = hatch(d, "survey-lane", d.pal.lane_hatch, 14 * s, 2 * s);
    for (let i = 0; i < lanes; i += 1) d.raw(`<rect data-deco="1" x="${f1(gx)}" y="${f1(lane0 + i * laneH)}" width="${f1(gw)}" height="${f1(laneH - 1 * s)}" fill="${hl}"/><rect data-deco="1" x="${f1(gx)}" y="${f1(lane0 + (i + 1) * laneH - 1 * s)}" width="${f1(gw)}" height="${f1(1 * s)}" fill="${d.pal.grey2}"/>`);
    [[0, 2, "cat_1"], [2, 2, "cat_2"]].forEach(([a, n, slot]) => {
      d.raw(`<rect x="${f1(x0)}" y="${f1(lane0 + a * laneH)}" width="${f1(catW)}" height="${f1(n * laneH - 2 * s)}" fill="${d.pal.grey1}" data-role="grey1"/><rect x="${f1(x0)}" y="${f1(lane0 + a * laneH)}" width="${f1(6 * s)}" height="${f1(n * laneH - 2 * s)}" fill="${d.pal.ink}" data-role="ink"/>`);
      d.text(slot, x0 + catW - 12 * s, lane0 + a * laneH + 28 * s, 18 * s, { role: "ink", family: "head", anchor: "end", box: [x0 + 12 * s, lane0 + a * laneH + 8 * s, catW - 22 * s, 26 * s] });
    });
    // events: start day, length in days, lane, tone
    const ev = [[2, 14, 0, "yellow"], [16, 14, 1, "ink"], [2, 14, 2, "white"], [9, Math.round(p.last_len), 3, "ink"]];
    ev.forEach(([a, n, lane, tone], i) => {
      const ex = gx + a * day; const ew = n * day; const ey = lane0 + lane * laneH + 12 * s; const eh = 82 * s;
      d.raw(`<rect x="${f1(ex)}" y="${f1(ey)}" width="${f1(ew)}" height="${f1(eh)}" fill="${d.pal[tone]}" data-role="${tone}"${tone === "white" ? ` stroke="${d.pal.grey3}"` : ""}/>`);
      d.def(`<clipPath id="survey-ev-${i + 1}"><rect x="${f1(ex)}" y="${f1(ey)}" width="${f1(ew)}" height="${f1(eh)}"/></clipPath>`);
      d.raw(`<g data-deco="1" clip-path="url(#survey-ev-${i + 1})">${contours(d, ex, ey - eh, ew, eh * 3, 20 + i, d.pal[tone === "ink" ? "line_dark" : tone === "yellow" ? "yellow_dk" : "line"])}</g>`);
      d.raw(tri(d, ex, ey + eh - 6 * s, Math.min(ew * 0.6, 240 * s), 6 * s));
      d.raw(`<rect x="${f1(ex)}" y="${f1(ey - 1 * s)}" width="${f1(52 * s)}" height="${f1(19 * s)}" fill="${d.pal.yellow}" data-role="yellow"/>`);
      d.raw(`<text data-deco="1" x="${f1(ex + 5 * s)}" y="${f1(ey + 14 * s)}" font-family="${esc(d.families.geo)}" font-weight="500" font-size="${f1(14 * s)}" fill="${d.pal.ink}">${["11.20", "12.04", "11.20", "11.27"][i]}</text>`);
      d.raw(`<rect x="${f1(ex + ew - 96 * s)}" y="${f1(ey + 8 * s)}" width="${f1(86 * s)}" height="${f1(22 * s)}" fill="${d.pal[tone === "ink" ? "white" : "ink"]}" data-role="${tone === "ink" ? "white" : "ink"}"/>`);
      d.text(`kind_${i + 1}`, ex + ew - 53 * s, ey + 24 * s, 14 * s, { role: tone === "ink" ? "ink" : "white", family: "body", anchor: "middle", box: [ex + ew - 94 * s, ey + 9 * s, 82 * s, 20 * s] });
      d.text(`event_${i + 1}`, ex + 18 * s, ey + 60 * s, 26 * s, { role: tone === "ink" ? "white" : "ink", family: "head", box: [ex + 14 * s, ey + 32 * s, Math.min(ew - 120 * s, 360 * s), 36 * s] });
    });
    d.zone("lanes", "safe", [x0, lane0, W - x0, lanes * laneH], { slots: ["event_1", "event_2", "event_3", "event_4", "kind_1", "kind_2", "kind_3", "kind_4", "cat_1", "cat_2"] });
  },
};

module.exports = { LAYOUTS, DATE, INDEX };
