"use strict";

// Layouts of the citypop-sleeve style pack (styles/citypop-sleeve/style.json): a 1980s Japanese
// city-pop record-sleeve grammar (flat empty pool, white modernist wall, hard cast shadow, a
// striped sun, an afternoon with nobody in it) carried into a gacha event: key visual, limited
// banner as a record sleeve, ten-pull results as a wall of postcards. Geometry in 1920 x 1080
// units scaled to the canvas, taken from the gacha-event case's v3 final (reviewed, check 0).
// Everything is drawn here: the striped numerals, the pool-gear icons, the sun, tiles and the
// fan-palm shadow. A cut palm silhouette can replace the drawn one through the `palm` collage slot.

const { f1, esc, rbox, tilt, ngon, discStripes, invalid } = require("./layout-kit.cjs");

// Striped numerals: a hand-drawn skeleton per character on a 60 x 100 cell, stroked three times
// (20 / 11 / 4 units: paper, pool, paper) over a hard deep-teal shadow, sheared -10 degrees.
const SKELETON = {
  0: "M12 20 Q12 6 30 6 Q48 6 48 20 V80 Q48 94 30 94 Q12 94 12 80Z", 1: "M18 18 L32 6 V94", 2: "M10 22 Q12 6 30 6 Q48 6 48 24 Q48 40 10 94 H50",
  3: "M10 12 Q14 6 30 6 Q48 6 48 26 Q48 46 26 48 Q50 50 50 72 Q50 94 30 94 Q12 94 8 84", 4: "M38 94 V6 L8 66 H52", 5: "M48 6 H14 L12 46 Q20 40 32 40 Q50 40 50 66 Q50 94 30 94 Q14 94 8 84",
  6: "M44 10 Q38 6 30 6 Q12 6 12 40 V76 Q12 94 30 94 Q48 94 48 72 Q48 52 30 52 Q16 52 12 62", 7: "M8 6 H50 L24 94", 8: "M30 48 Q12 46 12 27 Q12 6 30 6 Q48 6 48 27 Q48 46 30 48 Q10 50 10 72 Q10 94 30 94 Q50 94 50 72 Q50 50 30 48Z",
  9: "M48 38 Q44 50 30 50 Q12 50 12 28 Q12 6 30 6 Q48 6 48 30 V62 Q48 94 26 94 Q16 94 12 88", "-": "M10 50 H50", "/": "M50 6 L10 94",
};
const DOTS = { ":": [32, 72], ".": [88] };

function stripeWidth(text) {
  let x = 0;
  for (const ch of String(text)) x += DOTS[ch] || ch === " " ? 30 : 66;
  return x;
}

// Draws the numerals slot as a lettering unit: the check measures its extent from the paths, its
// cap height from data-cap, and its contrast from the group fill, which is the deep-teal cast
// shadow (the white tube alone is about 2.2:1 on pool; the shadow is what makes it read).
function stripes(d, name, x, y, h, o = {}) {
  const { spec, text } = d.value(name);
  const bad = [...String(text)].filter((ch) => !(SKELETON[ch] || DOTS[ch] || ch === " "));
  if (bad.length) throw invalid(`slot ${name} draws the digits 0-9 and : . - / only, got ${[...new Set(bad)].join(" ")}. Fix: set it to a time, date or count such as 15:00, or put words in a text slot`);
  const s = h / 100;
  const col = d.pal[o.tube || "paper"]; const mid = d.pal[o.mid || "pool"]; const sh = d.pal.ink;
  let cx = 0; const tube = []; const shadow = [];
  for (const ch of String(text)) {
    if (DOTS[ch]) {
      for (const cy of DOTS[ch]) { shadow.push(`<path d="${ngon(cx + 19, cy + 5, 9.5)}" fill="${sh}"/>`); tube.push(`<path d="${ngon(cx + 14, cy, 9.5)}" fill="${col}"/>`); }
      cx += 30; continue;
    }
    if (ch === " ") { cx += 30; continue; }
    const p = SKELETON[ch];
    shadow.push(`<path transform="translate(${cx + 5} 5)" d="${p}" fill="none" stroke="${sh}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`);
    tube.push(`<g transform="translate(${cx} 0)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${p}" stroke="${col}" stroke-width="20"/><path d="${p}" stroke="${mid}" stroke-width="11"/><path d="${p}" stroke="${col}" stroke-width="4"/></g>`);
    cx += 66;
  }
  const width = cx * s;
  const shear = Math.tan((-(o.skew ?? 10) * Math.PI) / 180);
  const box = o.box || [x - 0.3 * h, y - 0.12 * h, width + 0.4 * h, 1.24 * h];
  d.raw(`<g ${d.slotAttrs(name, spec, { box: d.clipBox(box) })} data-role="ink" data-cap="100"><g class="lettering" data-text="${esc(text)}" fill="${sh}" transform="matrix(${s.toFixed(4)} 0 ${(shear * s).toFixed(4)} ${s.toFixed(4)} ${f1(x)} ${f1(y)})">${shadow.join("")}${tube.join("")}</g></g>`);
  return { width };
}

// Pool-gear icon family (one flat layer plus a hard offset shadow), on a 100-unit cell.
const ICONS = {
  lifebuoy: "<path d=\"M50 14 A36 36 0 1 0 50 86 A36 36 0 1 0 50 14Z M50 34 A16 16 0 1 1 50 66 A16 16 0 1 1 50 34Z\" fill-rule=\"evenodd\"/>",
  cocktail: "<path d=\"M18 16 H82 L54 52 V80 H70 V88 H30 V80 H46 V52Z\"/>",
  board: "<rect x=\"10\" y=\"40\" width=\"70\" height=\"10\"/><rect x=\"18\" y=\"50\" width=\"10\" height=\"40\"/><path d=\"M62 40 Q74 18 90 26 L84 30 Q74 26 68 40Z\"/>",
  palm: "<path d=\"M50 46 Q20 30 8 40 Q26 18 50 40 Q56 12 86 16 Q66 22 54 44 Q82 34 94 52 Q70 44 52 48Z\"/><rect x=\"47\" y=\"44\" width=\"6\" height=\"46\"/>",
  record: "<path d=\"M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10Z M50 44 A6 6 0 1 1 50 56 A6 6 0 1 1 50 44Z\" fill-rule=\"evenodd\"/>",
  tray: "<rect x=\"10\" y=\"62\" width=\"80\" height=\"8\"/><path d=\"M30 62 L34 30 H50 L54 62Z\"/><circle cx=\"68\" cy=\"50\" r=\"12\"/>",
  camera: "<path d=\"M10 30 H38 L44 20 H64 L70 30 H90 V82 H10Z M50 40 A15 15 0 1 0 50 70 A15 15 0 1 0 50 40Z\" fill-rule=\"evenodd\"/>",
};
function icon(d, kind, x, y, size, colorRole) {
  const k = size / 100;
  d.raw(`<g data-deco="1" transform="translate(${f1(x)} ${f1(y)}) scale(${k.toFixed(4)})"><g fill="${d.pal.ink}" transform="translate(6 6)">${ICONS[kind]}</g><g fill="${d.pal[colorRole]}">${ICONS[kind]}</g></g>`);
}

// Striped sun: a disc with horizon bands cut out of its lower half (bands drawn in the ground colour).
function sun(d, cx, cy, r, discRole, cutRole) {
  d.raw(`<path data-deco="1" d="${ngon(cx, cy, r, 48)}" fill="${d.pal[discRole]}"/>`);
  const bands = [58, 68, 78, 88].map((y, i) => [(y - 2) / 96, ((3 + i * 1.6) / 96) * 2 * r]);
  for (const [x, y, w, h] of discStripes(cx, cy, r, bands)) d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${d.pal[cutRole]}"/>`);
}

function tiles(d, x, y, w, h, step) {
  const lines = [];
  for (let gx = x; gx <= x + w; gx += step) lines.push(`M${f1(gx)} ${f1(y)}V${f1(y + h)}`);
  for (let gy = y; gy <= y + h; gy += step) lines.push(`M${f1(x)} ${f1(gy)}H${f1(x + w)}`);
  d.raw(`<path data-deco="1" d="${lines.join("")}" fill="none" stroke="${d.pal.paper}" stroke-opacity="0.22" stroke-width="${f1(2 * d.k)}"/>`);
}

// Fan-palm cast shadow: blades fanning from a crown, deep teal at 30% (drawn when no cut palm is given).
function palmShadow(d, cx, cy, r, rot) {
  const blades = [];
  for (let i = 0; i < 15; i += 1) {
    const a = ((-170 + i * 12 + rot) * Math.PI) / 180;
    const len = r * (0.78 + 0.22 * Math.sin(i * 1.7) ** 2);
    const w = r * 0.028;
    const tip = [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
    const n = [-Math.sin(a) * w, Math.cos(a) * w];
    blades.push(`M${f1(cx)} ${f1(cy)}L${f1(cx + Math.cos(a) * len * 0.45 + n[0])} ${f1(cy + Math.sin(a) * len * 0.45 + n[1])}L${f1(tip[0])} ${f1(tip[1])}L${f1(cx + Math.cos(a) * len * 0.45 - n[0])} ${f1(cy + Math.sin(a) * len * 0.45 - n[1])}Z`);
  }
  blades.push(`M${f1(cx - r * 0.025)} ${f1(cy)}L${f1(cx + r * 0.025)} ${f1(cy)}L${f1(cx + r * 0.06)} ${f1(cy + r * 1.4)}L${f1(cx - r * 0.02)} ${f1(cy + r * 1.4)}Z`);
  d.raw(`<path data-deco="1" d="${blades.join("")}" fill="${d.pal.ink}" opacity="0.3"/>`);
}

// A plate with its hard cast shadow (deep teal at 26%, offset down-right).
function plate(d, x, y, w, h, role, s, off = 12) {
  d.rect(x + off * s, y + off * s, w, h, "ink", "opacity=\"0.26\" data-deco=\"1\"");
  d.rect(x, y, w, h, role);
}

function topbar(d, s, title, chips) {
  const { W } = d;
  d.rect(0, 84 * s, W, 10 * s, "ink", "opacity=\"0.26\"");
  d.rect(0, 0, W, 84 * s, "paper");
  d.text(title, 36 * s, 58 * s, 34 * s, { role: "ink", family: "head", italic: true, box: [32 * s, 14 * s, 1000 * s, 60 * s] });
  chips.forEach(([label, value, kind], i) => {
    const x = (1170 + i * 236) * s;
    d.rect(x, 18 * s, 216 * s, 48 * s, "pool");
    icon(d, kind, x + 8 * s, 25 * s, 34 * s, "paper");
    d.text(label, x + 50 * s, 48 * s, 17 * s, { role: "ink", family: "label", box: [x + 48 * s, 26 * s, 76 * s, 30 * s] });
    d.text(value, x + 206 * s, 52 * s, 26 * s, { role: "ink", family: "num", anchor: "end", box: [x + 122 * s, 22 * s, 88 * s, 38 * s] });
  });
  d.raw(`<path data-deco="1" d="M${f1(1877 * s)} ${f1(31 * s)}L${f1(1899 * s)} ${f1(53 * s)}M${f1(1899 * s)} ${f1(31 * s)}L${f1(1877 * s)} ${f1(53 * s)}" stroke="${d.pal.ink}" stroke-width="${f1(4 * s)}"/>`);
}

const RARITY = { 6: { bg: "lemon", ink: "ink", ic: "pool" }, 5: { bg: "paper", ink: "ink", ic: "lemon" }, 4: { bg: "ink", ink: "paper", ic: "pool" }, 3: { bg: "sand", ink: "ink", ic: "paper" } };

const LAYOUTS = {
  "cover.event-kv"(d) {
    const { W, H, p } = d; const s = W / 1920; const PY = 440 * s;
    d.rect(0, 0, W, PY, "sky");
    if (p.sun) sun(d, 830 * s, 236 * s, 140 * s, "lemon", "sky");
    d.rect(1130 * s, 40 * s, 790 * s, PY - 40 * s, "paper");
    d.rect(1130 * s, 40 * s, 56 * s, PY - 40 * s, "wall_shade");
    for (let r = 0; r < 3; r += 1) for (let c = 0; c < 4; c += 1) d.rect((1250 + c * 160) * s, (90 + r * 110) * s, 120 * s, 80 * s, "pool_deep", "data-deco=\"1\"");
    d.image("palm", 1190 * s, -60 * s, 900 * s, 0, "", { rotate: -8 });
    if (p.palm && !d.values.palm) palmShadow(d, 1640 * s, 330 * s, 520 * s, 0);
    d.rect(0, PY, W, H - PY, "pool");
    tiles(d, 0, PY, W, H - PY, 64 * s);
    d.rect(0, PY, W, 34 * s, "paper");
    d.rect(0, PY + 34 * s, W, 22 * s, "ink", "opacity=\"0.26\"");
    // diving board
    d.rect(60 * s, PY - 146 * s, 420 * s, 12 * s, "ink", "opacity=\"0.26\"");
    d.rect(60 * s, PY - 166 * s, 420 * s, 20 * s, "paper");
    d.rect(60 * s, PY - 150 * s, 24 * s, 184 * s, "paper");
    // brand and tagline (top left, on the sky)
    d.text("brand_cjk", 60 * s, 84 * s, 32 * s, { role: "ink", family: "head", tracking: 190, box: [56 * s, 48 * s, 230 * s, 44 * s] });
    d.text("brand_latin", 290 * s, 82 * s, 18 * s, { role: "ink", family: "num", tracking: 330, box: [286 * s, 60 * s, 340 * s, 28 * s] });
    d.text("tagline", 62 * s, 128 * s, 20 * s, { role: "ink", family: "body", weight: 700, box: [58 * s, 104 * s, 560 * s, 30 * s] });
    // signature: striped numerals, a corner under the postcard
    const th = p.time_size * H;
    stripes(d, "time", 40 * s, PY + 120 * s, th);
    // title postcard, tilted
    const [px, py, pw, ph] = [1210 * s, 478 * s, 640 * s, 400 * s];
    const pc = [px + pw / 2, py + ph / 2];
    tilt(d, p.card_tilt, ...pc);
    plate(d, px, py, pw, ph, "paper", s, 16);
    const rb = (b) => rbox(b, p.card_tilt, pc);
    d.text("kicker", px + 40 * s, py + 54 * s, 20 * s, { role: "ink", family: "num", tracking: 240, box: rb([px + 36 * s, py + 30 * s, 590 * s, 30 * s]) });
    d.text("title_1", px + 40 * s, py + 150 * s, 92 * s, { role: "ink", family: "display", italic: true, tracking: -20, box: rb([px + 30 * s, py + 64 * s, 580 * s, 108 * s]) });
    d.text("title_2", px + 40 * s, py + 246 * s, 92 * s, { role: "ink", family: "display", italic: true, tracking: -20, box: rb([px + 30 * s, py + 160 * s, 580 * s, 108 * s]) });
    d.text("subtitle", px + 40 * s, py + 298 * s, 24 * s, { role: "ink", family: "head", box: rb([px + 36 * s, py + 270 * s, 570 * s, 36 * s]) });
    d.text("dates", px + 40 * s, py + 352 * s, 40 * s, { role: "ink", family: "num", box: rb([px + 36 * s, py + 312 * s, 570 * s, 52 * s]) });
    d.raw("</g>");
    // limited-banner sticker, tilted the other way
    const [sx, sy, sw, sh] = [1500 * s, 930 * s, 380 * s, 100 * s];
    const sc = [sx + sw / 2, sy + sh / 2];
    tilt(d, p.sticker_tilt, ...sc);
    plate(d, sx, sy, sw, sh, "lemon", s, 12);
    icon(d, "lifebuoy", sx + 18 * s, sy + 18 * s, 64 * s, "paper");
    d.text("sticker_title", sx + 100 * s, sy + 44 * s, 26 * s, { role: "ink", family: "head", weight: 900, box: rbox([sx + 96 * s, sy + 14 * s, 280 * s, 38 * s], p.sticker_tilt, sc) });
    d.text("sticker_line", sx + 100 * s, sy + 76 * s, 18 * s, { role: "ink", family: "body", weight: 700, box: rbox([sx + 96 * s, sy + 56 * s, 280 * s, 28 * s], p.sticker_tilt, sc) });
    d.raw("</g>");
    d.guideRect(px, py, pw, ph, "title postcard");
  },

  "ui.gacha-recruit"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "pool");
    tiles(d, 0, 0, W, H, 64 * s);
    topbar(d, s, "screen_title", [["cur_0_label", "cur_0_value", "tray"], ["cur_1_label", "cur_1_value", "record"], ["cur_2_label", "cur_2_value", "cocktail"]]);
    // banner tabs: the active one in lemon, others paper, a locked one dashed
    const tilts = [-3, 2, -1.5, 2.5];
    for (let i = 0; i < p.tabs; i += 1) {
      const [x, y, w, h] = [40 * s, (130 + i * 140) * s, 310 * s, 118 * s];
      const c = [x + w / 2, y + h / 2]; const deg = tilts[i % 4];
      tilt(d, deg, ...c);
      const dashed = i >= 2;
      if (dashed) d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="${d.pal.ink}" stroke-width="${f1(3 * s)}" stroke-dasharray="${f1(10 * s)} ${f1(7 * s)}"/>`);
      else plate(d, x, y, w, h, i === 0 ? "lemon" : "paper", s, 10);
      d.text(`tab_${i}_kicker`, x + 20 * s, y + 30 * s, 16 * s, { role: "ink", family: "label", box: rbox([x + 16 * s, y + 12 * s, 270 * s, 24 * s], deg, c) });
      d.text(`tab_${i}_name`, x + 20 * s, y + 74 * s, 34 * s, { role: "ink", family: "head", weight: 900, italic: true, box: rbox([x + 16 * s, y + 40 * s, 270 * s, 44 * s], deg, c) });
      d.text(`tab_${i}_note`, x + 20 * s, y + 104 * s, 16 * s, { role: "ink", family: "label", box: rbox([x + 16 * s, y + 86 * s, 270 * s, 24 * s], deg, c) });
      d.raw("</g>");
    }
    // the limited pool as a record sleeve, the record sliding out behind it
    const SX = 430 * s; const SY = 140 * s; const SW = 640 * s;
    const rc = [SX + 410 * s, SY + 320 * s];
    d.raw(`<path data-deco="1" d="${ngon(rc[0], rc[1], 270 * s, 64)}" fill="${d.pal.ink}"/><path data-deco="1" d="${ngon(rc[0], rc[1], 90 * s, 48)}" fill="${d.pal.lemon}"/><path data-deco="1" d="${ngon(rc[0], rc[1], 8 * s, 16)}" fill="${d.pal.ink}"/>`);
    const sc = [SX + SW / 2, SY + SW / 2]; const st = p.sleeve_tilt;
    tilt(d, st, ...sc);
    plate(d, SX, SY, SW, SW, "sky", s, 20);
    sun(d, SX + SW / 2, SY + 260 * s, 200 * s, "lemon", "sky");
    d.rect(SX, SY + SW * 0.62, SW, SW * 0.38, "pool");
    tiles(d, SX, SY + SW * 0.62, SW, SW * 0.38, 40 * s);
    const rb = (b) => rbox(b, st, sc);
    d.text("side_label", SX + 34 * s, SY + 50 * s, 20 * s, { role: "ink", family: "num", tracking: 240, box: rb([SX + 30 * s, SY + 28 * s, 430 * s, 30 * s]) });
    d.text("stars", SX + SW - 34 * s, SY + 54 * s, 26 * s, { role: "ink", family: "label", anchor: "end", box: rb([SX + SW - 250 * s, SY + 26 * s, 220 * s, 36 * s]) });
    icon(d, "lifebuoy", SX + 34 * s, SY + SW - 200 * s, 120 * s, "paper");
    d.text("featured_name", SX + 176 * s, SY + SW - 110 * s, 84 * s, { role: "ink", family: "display", italic: true, box: rb([SX + 170 * s, SY + SW - 196 * s, 300 * s, 100 * s]) });
    d.text("featured_latin", SX + 176 * s, SY + SW - 64 * s, 24 * s, { role: "ink", family: "num", tracking: 330, box: rb([SX + 172 * s, SY + SW - 90 * s, 300 * s, 34 * s]) });
    d.rect(SX + SW - 104 * s, SY + SW - 60 * s, 74 * s, 34 * s, "ink");
    d.text("sleeve_tag", SX + SW - 67 * s, SY + SW - 36 * s, 17 * s, { role: "lemon", family: "label", anchor: "middle", box: rb([SX + SW - 104 * s, SY + SW - 60 * s, 74 * s, 34 * s]) });
    d.raw("</g>");
    // right column: banner name, quote, talent card, rates, pity bar, the two pull buttons
    const RX = 1130 * s;
    d.text("banner_name", RX, 246 * s, 140 * s, { role: "ink", family: "display", italic: true, tracking: -30, box: [RX - 6 * s, 112 * s, 760 * s, 160 * s] });
    d.text("quote", RX, 302 * s, 26 * s, { role: "ink", family: "head", box: [RX - 4 * s, 276 * s, 760 * s, 36 * s] });
    const tc = [RX + 370 * s, 386 * s];
    tilt(d, 1, ...tc);
    plate(d, RX, 330 * s, 740 * s, 116 * s, "paper", s, 12);
    d.text("talent_title", RX + 24 * s, 372 * s, 22 * s, { role: "ink", family: "head", weight: 900, box: rbox([RX + 20 * s, 350 * s, 700 * s, 30 * s], 1, tc) });
    d.text("talent_body", RX + 24 * s, 410 * s, 19 * s, { role: "ink", family: "body", lineHeight: 1.6, box: rbox([RX + 20 * s, 390 * s, 700 * s, 50 * s], 1, tc) });
    d.raw("</g>");
    for (let i = 0; i < 2; i += 1) {
      const [x, y, w, h] = [RX + i * 358 * s, 478 * s, 340 * s, 92 * s]; const deg = i ? 1.5 : -1.5; const c = [x + w / 2, y + h / 2];
      tilt(d, deg, ...c);
      plate(d, x, y, w, h, "paper", s, 10);
      icon(d, p[`up_icon_${i}`], x + 14 * s, y + 13 * s, 66 * s, "lemon");
      d.text(`up_${i}_name`, x + 94 * s, y + 46 * s, 30 * s, { role: "ink", family: "head", italic: true, box: rbox([x + 90 * s, y + 12 * s, 236 * s, 40 * s], deg, c) });
      d.text(`up_${i}_note`, x + 94 * s, y + 74 * s, 16 * s, { role: "ink", family: "label", box: rbox([x + 90 * s, y + 56 * s, 236 * s, 24 * s], deg, c) });
      d.raw("</g>");
    }
    d.text("rates", RX, 620 * s, 17 * s, { role: "ink", family: "body", box: [RX - 4 * s, 600 * s, 780 * s, 56 * s] });
    d.text("pity_label", RX, 700 * s, 18 * s, { role: "ink", family: "label", box: [RX - 4 * s, 680 * s, 110 * s, 28 * s] });
    d.rect(RX + 110 * s, 684 * s, 520 * s, 16 * s, "paper");
    d.rect(RX + 110 * s, 684 * s, 520 * s * p.pity, 16 * s, "ink");
    d.text("pity_count", RX + 760 * s, 704 * s, 32 * s, { role: "ink", family: "num", anchor: "end", box: [RX + 640 * s, 676 * s, 124 * s, 40 * s] });
    const b1 = [RX, 858 * s, 300 * s, 116 * s]; const c1 = [b1[0] + b1[2] / 2, b1[1] + b1[3] / 2];
    tilt(d, -2, ...c1);
    d.rect(b1[0] + 10 * s, b1[1] + 10 * s, b1[2], b1[3], "ink");
    d.rect(...b1, "paper");
    d.text("pull_one", c1[0], b1[1] + 62 * s, 38 * s, { role: "ink", family: "head", weight: 900, italic: true, anchor: "middle", box: rbox([b1[0] + 10 * s, b1[1] + 20 * s, b1[2] - 20 * s, 50 * s], -2, c1) });
    d.text("pull_one_cost", c1[0], b1[1] + 94 * s, 17 * s, { role: "ink", family: "label", anchor: "middle", box: rbox([b1[0] + 10 * s, b1[1] + 76 * s, b1[2] - 20 * s, 26 * s], -2, c1) });
    d.raw("</g>");
    const b2 = [RX + 330 * s, 836 * s, 430 * s, 150 * s]; const c2 = [b2[0] + b2[2] / 2, b2[1] + b2[3] / 2];
    tilt(d, -3, ...c2);
    d.rect(b2[0] + 14 * s, b2[1] + 14 * s, b2[2], b2[3], "ink");
    d.rect(...b2, "lemon");
    d.text("pull_ten", c2[0], b2[1] + 86 * s, 60 * s, { role: "ink", family: "head", weight: 900, italic: true, tracking: 100, anchor: "middle", box: rbox([b2[0] + 10 * s, b2[1] + 20 * s, b2[2] - 20 * s, 76 * s], -3, c2) });
    d.text("pull_ten_cost", c2[0], b2[1] + 124 * s, 18 * s, { role: "ink", family: "label", anchor: "middle", box: rbox([b2[0] + 10 * s, b2[1] + 104 * s, b2[2] - 20 * s, 28 * s], -3, c2) });
    d.raw("</g>");
    d.rect(40 * s, 720 * s, 346 * s, 74 * s, "paper");
    d.text("note", 56 * s, 750 * s, 16 * s, { role: "ink", family: "body", lineHeight: 1.6, box: [52 * s, 732 * s, 326 * s, 52 * s] });
  },

  "ui.tenpull-wall"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "pool");
    tiles(d, 0, 0, W, H, 64 * s);
    topbar(d, s, "screen_title", [["cur_0_label", "cur_0_value", "tray"], ["cur_1_label", "cur_1_value", "record"], ["cur_2_label", "cur_2_value", "cocktail"]]);
    const SPOTS = [[70, 150, -5], [326, 186, 3], [1150, 160, 4], [1404, 140, -3], [1660, 182, 5], [84, 560, 4], [340, 590, -4], [1130, 586, -2], [1380, 566, 4]];
    const tilts = p.wobble;
    const card = (i, x, y, w, h, deg, big) => {
      const stars = String(d.value(`card_${i}_stars`).text);
      const rarity = [...stars].filter((ch) => ch === "\u2605").length;
      if (!RARITY[rarity] || [...stars].length !== rarity) throw invalid(`card_${i}_stars sets the rarity: 3 to 6 stars (\u2605), got ${JSON.stringify(stars)}. Fix: --set card_${i}_stars=\u2605\u2605\u2605\u2605`);
      const k = RARITY[rarity]; const u = w / 236; const c = [x + w / 2, y + h / 2];
      tilt(d, deg * tilts, ...c);
      const rb = (b) => rbox(b, deg * tilts, c, 2 * s);
      plate(d, x, y, w, h, k.bg, 1, 12 * u);
      if (big) sun(d, x + w / 2, y + 160 * u, 110 * u, "paper", k.bg);
      d.raw(`<rect data-deco="1" x="${f1(x + 14 * u)}" y="${f1(y + 14 * u)}" width="${f1(rarity * 21 * u + 18 * u)}" height="${f1(28 * u)}" fill="none" stroke="${d.pal[k.ink]}" stroke-width="${f1(2 * u)}" stroke-dasharray="${f1(5 * u)} ${f1(3 * u)}"/>`);
      d.text(`card_${i}_stars`, x + 22 * u, y + 35 * u, 16 * u, { role: k.ink, family: "label", box: rb([x + 18 * u, y + 16 * u, rarity * 21 * u + 14 * u, 26 * u]) });
      icon(d, p[`icon_${i}`], x + w / 2 - 62 * u, y + 76 * u, 124 * u, k.ic);
      d.text(`card_${i}_name`, x + w / 2, y + 248 * u, 42 * u, { role: k.ink, family: "head", weight: 900, italic: true, anchor: "middle", box: rb([x + 8 * u, y + 206 * u, w - 16 * u, 52 * u]) });
      d.text(`card_${i}_latin`, x + w / 2, y + 276 * u, 16 * u, { role: k.ink, family: "num", tracking: 250, anchor: "middle", box: rb([x + 8 * u, y + 260 * u, w - 16 * u, 22 * u]) });
      d.text(`card_${i}_note`, x + w / 2, y + 306 * u, 16 * u, { role: k.ink, family: "label", anchor: "middle", box: rb([x + 8 * u, y + 288 * u, w - 16 * u, 24 * u]) });
      d.raw("</g>");
    };
    // the wall: nine small cards, the top pull at twice their size in the middle
    SPOTS.forEach(([x, y, deg], j) => card(j + 1, x * s, y * s, 236 * s, 330 * s, deg, false));
    card(0, 620 * s, 150 * s, 480 * s, 672 * s, -3, true);
    // NEW stamp on the top pull
    const nc = [1068 * s, 182 * s];
    d.raw(`<path data-deco="1" d="${ngon(nc[0], nc[1], 64 * s, 32)}" fill="${d.pal.ink}"/>`);
    d.text("top_stamp", nc[0], nc[1] + 14 * s, 40 * s, { role: "lemon", family: "num", anchor: "middle", box: [nc[0] - 52 * s, nc[1] - 24 * s, 104 * s, 48 * s] });
    // summary postcard and buttons
    const sx = 1650 * s; const sy = 570 * s; const sc = [sx + 120 * s, sy + 165 * s];
    tilt(d, -3, ...sc);
    plate(d, sx, sy, 240 * s, 330 * s, "paper", s, 12);
    d.text("summary_title", sx + 20 * s, sy + 56 * s, 32 * s, { role: "ink", family: "head", weight: 900, italic: true, box: rbox([sx + 16 * s, sy + 22 * s, 210 * s, 42 * s], -3, sc) });
    d.text("summary_range", sx + 20 * s, sy + 88 * s, 18 * s, { role: "ink", family: "label", box: rbox([sx + 16 * s, sy + 70 * s, 210 * s, 26 * s], -3, sc) });
    for (let r = 0; r < 4; r += 1) d.text(`summary_row_${r}`, sx + 20 * s, sy + (138 + r * 37) * s, 22 * s, { role: "ink", family: "label", box: rbox([sx + 16 * s, sy + (114 + r * 37) * s, 210 * s, 32 * s], -3, sc) });
    d.text("summary_pity", sx + 20 * s, sy + 300 * s, 16 * s, { role: "ink", family: "body", box: rbox([sx + 16 * s, sy + 282 * s, 210 * s, 26 * s], -3, sc) });
    d.raw("</g>");
    d.rect(40 * s, 960 * s, 600 * s, 52 * s, "paper");
    d.text("note", 56 * s, 992 * s, 17 * s, { role: "ink", family: "body", box: [52 * s, 970 * s, 580 * s, 30 * s] });
    const b1 = [1060 * s, 944 * s, 240 * s, 96 * s]; const c1 = [b1[0] + b1[2] / 2, b1[1] + b1[3] / 2];
    tilt(d, -2, ...c1);
    d.rect(b1[0] + 10 * s, b1[1] + 10 * s, b1[2], b1[3], "ink");
    d.rect(...b1, "paper");
    d.text("confirm", c1[0], b1[1] + 62 * s, 38 * s, { role: "ink", family: "head", weight: 900, tracking: 200, anchor: "middle", box: rbox([b1[0] + 10 * s, b1[1] + 20 * s, b1[2] - 20 * s, 54 * s], -2, c1) });
    d.raw("</g>");
    const b2 = [1330 * s, 944 * s, 560 * s, 96 * s]; const c2 = [b2[0] + b2[2] / 2, b2[1] + b2[3] / 2];
    tilt(d, -2, ...c2);
    d.raw(`<rect data-deco="1" x="${f1(b2[0])}" y="${f1(b2[1])}" width="${f1(b2[2])}" height="${f1(b2[3])}" fill="none" stroke="${d.pal.ink}" stroke-width="${f1(4 * s)}" stroke-dasharray="${f1(12 * s)} ${f1(8 * s)}"/>`);
    d.text("again", b2[0] + 40 * s, b2[1] + 60 * s, 34 * s, { role: "ink", family: "head", weight: 900, italic: true, box: rbox([b2[0] + 34 * s, b2[1] + 22 * s, 240 * s, 48 * s], -2, c2) });
    d.rect(b2[0] + 290 * s, b2[1] + 30 * s, 240 * s, 36 * s, "ink");
    d.text("again_note", b2[0] + 300 * s, b2[1] + 55 * s, 16 * s, { role: "paper", family: "label", box: rbox([b2[0] + 294 * s, b2[1] + 34 * s, 232 * s, 28 * s], -2, c2) });
    d.raw("</g>");
  },
};

module.exports = { LAYOUTS, ICONS, SKELETON };
