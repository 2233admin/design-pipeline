"use strict";

// Layouts of the celestial-voyage style pack (styles/celestial-voyage/style.json): the official-site
// grammar of star-voyage fantasy RPGs, measured on the reference site the owner named (screenshots,
// computed styles and timings kept private, never shipped) and proven on the original site 长庚航志
// VESPERWAKE. A deep navy star field, gold only as hairlines and the current state, a heavy CJK serif
// title with a hairline italic Latin ghost overlapping its lower third, a 75-unit black bar with a
// logo hanging out of it and a cream download tab, gilt-framed rounded cards, and a faction orbit: a
// huge arc whose centre sits off the left of the screen, carrying round medallions. Geometry is in the
// reference's own 1920 units scaled to the canvas. Everything is drawn here; pictures are image slots.

const { f1, esc, rng, invalid } = require("./layout-kit.cjs");

const ORBIT = { cx: 1005, cy: 540, r: 760, step: 13.7 }; // the faction arc: centre off-screen left, nodes 13.7 degrees apart

// Star dust: deterministic dots over the navy ground (decoration).
function dust(d, x0, y0, w, h, n, s, seed = 3) {
  const r = rng(seed); let dots = "";
  for (let i = 0; i < n; i += 1) {
    const v = r(); const fill = v > 0.9 ? d.pal.cream_hi : v > 0.65 ? d.pal.ice : d.pal.white;
    dots += `<circle cx="${f1(x0 + r() * w)}" cy="${f1(y0 + r() * h)}" r="${f1((v > 0.95 ? 1.7 : v > 0.7 ? 1.1 : 0.7) * s)}" fill="${fill}" opacity="${f1(0.25 + r() * 0.6)}"/>`;
  }
  d.raw(`<g data-deco="1">${dots}</g>`);
}
// Four-point star (decoration).
const star4 = (x, y, r, fill, k = 0.16) => `<path d="M${f1(x)} ${f1(y - r)} Q${f1(x + r * k)} ${f1(y - r * k)} ${f1(x + r)} ${f1(y)} Q${f1(x + r * k)} ${f1(y + r * k)} ${f1(x)} ${f1(y + r)} Q${f1(x - r * k)} ${f1(y + r * k)} ${f1(x - r)} ${f1(y)} Q${f1(x - r * k)} ${f1(y - r * k)} ${f1(x)} ${f1(y - r)}Z" fill="${fill}"/>`;
// Rounded rectangle path; radii per corner [tl, tr, br, bl].
function rr(x, y, w, h, [tl, tr, br, bl]) {
  return `M${f1(x + tl)} ${f1(y)}H${f1(x + w - tr)}${tr ? `Q${f1(x + w)} ${f1(y)} ${f1(x + w)} ${f1(y + tr)}` : ""}V${f1(y + h - br)}${br ? `Q${f1(x + w)} ${f1(y + h)} ${f1(x + w - br)} ${f1(y + h)}` : ""}H${f1(x + bl)}${bl ? `Q${f1(x)} ${f1(y + h)} ${f1(x)} ${f1(y + h - bl)}` : ""}V${f1(y + tl)}${tl ? `Q${f1(x)} ${f1(y)} ${f1(x + tl)} ${f1(y)}` : ""}Z`;
}
// The left rail: a 1-unit line at x 77 broken for the social column, and the column's dots (decoration).
function rail(d, s, H) {
  const c = d.pal.mute;
  d.raw(`<g data-deco="1"><rect x="${f1(77 * s)}" y="${f1(75 * s)}" width="${f1(Math.max(1, s))}" height="${f1(215 * s)}" fill="${c}"/><rect x="${f1(77 * s)}" y="${f1(865 * s)}" width="${f1(Math.max(1, s))}" height="${f1(H - 865 * s)}" fill="${c}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${f1(62 * s)}" y="${f1((314 + i * 60) * s)}" width="${f1(30 * s)}" height="${f1(30 * s)}" rx="${f1(8 * s)}" fill="${d.pal.violet}"/>`).join("")}</g>`);
}
// Section title: a heavy CJK serif with a hairline italic Latin ghost overlapping its lower third.
function sectionTitle(d, x, y, s) {
  const zh = 52 * s; const gh = 60 * s;
  const { text: cjk } = d.value("title_cjk");
  const zw = [...String(cjk)].length * zh * 1.06;
  d.text("title_cjk", x, y + zh * 0.9, zh, { role: "white", family: "head", tracking: 60, box: [x - 4 * s, y - 4 * s, zw + 12 * s, zh * 1.18] });
  const { spec, text } = d.value("title_latin");
  if (!/^[A-Z0-9 &.'-]+$/.test(String(text))) throw invalid(`slot title_latin is the Latin ghost under the title (capitals, digits, space & . ' - only), got ${JSON.stringify(text)}. Fix: --set title_latin=NEWS ; put CJK in title_cjk`);
  const gy = y + 30 * s + gh * 0.78; const gw = String(text).length * gh * 0.8 + gh * 0.4;
  d.raw(`<text ${d.slotAttrs("title_latin", spec, { box: d.clipBox([x - 6 * s, y + 20 * s, gw + 30 * s, gh * 1.1]) })} x="${f1(x + 4 * s)}" y="${f1(gy)}" font-family="${esc(d.families.ghost)}" font-weight="300" font-style="italic" font-size="${f1(gh)}" letter-spacing="${f1(6 * s)}" fill="none" stroke="${d.pal.ghost}" stroke-width="${f1(1.3 * s)}" data-role="ghost" data-deco="1">${esc(text)}</text>`);
  return { bottom: y + 30 * s + gh };
}
const chevron = (cx, cy, s, color, dir) => `<path d="M${f1(cx - 4 * s * dir)} ${f1(cy - 9 * s)} l${f1(9 * s * dir)} ${f1(9 * s)} l${f1(-9 * s * dir)} ${f1(9 * s)}" fill="none" stroke="${color}" stroke-width="${f1(3.4 * s)}"/>`;
// Round arrow: a dark disc with a dark-gold ring and an inner hairline (decoration).
function arrow(d, cx, cy, s, dir) {
  d.raw(`<g data-deco="1"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(49 * s)}" fill="${d.pal.frame}" stroke="${d.pal.gold_dim}" stroke-width="${f1(1.5 * s)}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(43 * s)}" fill="none" stroke="${d.pal.gold_dim}" stroke-width="${f1(1 * s)}" opacity=".5"/>${chevron(cx, cy, s, d.pal.gold, dir)}</g>`);
}
// The gold-outline capsule ("more news +").
function moreCapsule(d, name, x, y, s) {
  const w = 172 * s; const h = 46 * s;
  d.raw(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${d.pal.navy}" stroke="${d.pal.gold_dim}" stroke-width="${f1(1.5 * s)}" data-role="navy"/>`);
  d.text(name, x + w / 2 - 10 * s, y + h / 2 + 6.5 * s, 18 * s, { role: "cream", family: "body", anchor: "middle", weight: 500, box: [x + 10 * s, y + 6 * s, w - 44 * s, h - 12 * s] });
  d.raw(`<path data-deco="1" d="M${f1(x + w - 36 * s)} ${f1(y + h / 2)}h${f1(13 * s)}M${f1(x + w - 29.5 * s)} ${f1(y + h / 2 - 6.5 * s)}v${f1(13 * s)}" stroke="${d.pal.cream}" stroke-width="${f1(2 * s)}"/>`);
}
function dateSlot(d, name) {
  const { text } = d.value(name);
  if (!/^[\d/.\- ]+$/.test(String(text))) throw invalid(`slot ${name} takes digits and / . - only, got ${JSON.stringify(text)}. Fix: --set ${name}=2026.11.10 ; put words in the headline`);
}
// One gilt ticket card: rounded outer frame, a picture inset 8 units with 22.5-unit corners, a dark
// caption bar with a 6 x 33 gold tick, and the ticket perforation (two half-circle bites + a dashed line).
function ticket(d, k, x, y, s, { active, slots = true }) {
  const W0 = 626 * s; const H0 = 518 * s; const i = 8 * s; const bar = 140 * s;
  if (active) d.raw(`<path data-deco="1" d="${rr(x - 6 * s, y - 6 * s, W0 + 12 * s, H0 + 12 * s, Array(4).fill(42 * s))}" fill="${d.pal.gold}" opacity=".16"/>`);
  d.raw(`<path d="${rr(x, y, W0, H0, Array(4).fill(37.5 * s))}" fill="${d.pal.frame}" stroke="${active ? d.pal.gold : d.pal.frame}" stroke-width="${f1(2 * s)}" data-role="frame"/>`);
  if (slots) d.image(`cover${k}`, x + i, y + i, W0 - 2 * i, H0 - 2 * i - bar, "news picture 1220 x 1004", { labelAt: [0.5, 0.45] });
  else d.raw(`<rect data-deco="1" x="${f1(x + i)}" y="${f1(y + i)}" width="${f1(W0 - 2 * i)}" height="${f1(H0 - 2 * i - bar)}" fill="${d.pal.panel}"/>`);
  // round the picture's top corners: frame-coloured corner masks (decoration)
  const cr = 22.5 * s; const px = x + i; const py = y + i; const pw = W0 - 2 * i;
  d.raw(`<path data-deco="1" d="M${f1(px)} ${f1(py)}h${f1(cr)}Q${f1(px)} ${f1(py)} ${f1(px)} ${f1(py + cr)}Z M${f1(px + pw)} ${f1(py)}h${f1(-cr)}Q${f1(px + pw)} ${f1(py)} ${f1(px + pw)} ${f1(py + cr)}Z" fill="${d.pal.frame}"/>`);
  d.raw(`<path d="${rr(px, y + H0 - i - bar, pw, bar, [0, 0, cr, cr])}" fill="${d.pal.bar}" data-role="bar"/>`);
  d.raw(`<path data-deco="1" d="${rr(px, py, pw, H0 - 2 * i, Array(4).fill(cr))}" fill="none" stroke="${d.pal.gold_line}" stroke-width="${f1(1 * s)}"/>`);
  const by = y + H0 - i - bar;
  d.raw(`<g data-deco="1"><path d="M${f1(x + 26 * s)} ${f1(by + 2 * s)}H${f1(x + W0 - 26 * s)}" stroke="${d.pal.gold}" stroke-width="${f1(2 * s)}" stroke-dasharray="${f1(6 * s)} ${f1(5 * s)}" opacity=".6"/><circle cx="${f1(x)}" cy="${f1(by)}" r="${f1(11 * s)}" fill="${d.pal.navy}" stroke="${d.pal.gold_line}" stroke-width="${f1(1 * s)}"/><circle cx="${f1(x + W0)}" cy="${f1(by)}" r="${f1(11 * s)}" fill="${d.pal.navy}" stroke="${d.pal.gold_line}" stroke-width="${f1(1 * s)}"/></g>`);
  if (!slots) return;
  d.rect(x + 20 * s, by + 28 * s, 6 * s, 33 * s, "gold");
  d.text(`headline${k}`, x + 36 * s, by + 54 * s, 27 * s, { role: "text", family: "body", weight: 500, lineHeight: 36 / 27, box: [x + 32 * s, by + 22 * s, W0 - 64 * s, 82 * s] });
  dateSlot(d, `date${k}`);
  d.text(`date${k}`, x + W0 - 26 * s, by + 128 * s, 14 * s, { role: "gold_line", family: "label", anchor: "end", tracking: 140, box: [x + W0 - 200 * s, by + 110 * s, 176 * s, 24 * s] });
  const tw = 62 * s;
  d.raw(`<rect x="${f1(x + 26 * s)}" y="${f1(y + 22 * s)}" width="${f1(tw)}" height="${f1(30 * s)}" rx="${f1(15 * s)}" fill="${d.pal.plate}" stroke="${d.pal.gold_line}" stroke-width="${f1(1 * s)}" data-role="plate"/>`);
  d.text(`tag${k}`, x + 26 * s + tw / 2, y + 43 * s, 15 * s, { role: "cream", family: "body", anchor: "middle", weight: 500, box: [x + 30 * s, y + 24 * s, tw - 8 * s, 26 * s] });
}
// A faction medallion on the orbit (decoration): navy disc, gold ring, dotted inner ring and one serif character.
function medallion(d, cx, cy, r, s, ch, on) {
  const g = d.pal.gold; const locked = ch === "?"; const mark = ch ? "" : star4(cx, cy, r * 0.3, d.pal.gold_line);
  return `<g data-deco="1"${on ? "" : ` opacity=".72"`}>${on ? `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 1.3)}" fill="${g}" opacity=".14"/>` : ""}<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${d.pal.panel}" stroke="${on ? g : d.pal.gold_line}" stroke-width="${f1((on ? 2.6 : 1.8) * s)}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.82)}" fill="none" stroke="${d.pal.gold_dim}" stroke-width="${f1(1 * s)}" stroke-dasharray="${f1(2 * s)} ${f1(4 * s)}"/>${mark}${ch ? `<text data-deco="1" x="${f1(cx)}" y="${f1(cy + r * 0.25)}" text-anchor="middle" font-family="${esc(locked ? d.families.label : d.families.head)}" font-weight="900" font-size="${f1(r * 0.7)}" fill="${locked ? d.pal.gold_dim : g}">${esc(ch)}</text>` : ""}${on ? [-1, 1].map((k) => `<path d="M${f1(cx + k * (r + 14 * s))} ${f1(cy - 7 * s)}l${f1(7 * s)} ${f1(7 * s)}l${f1(-7 * s)} ${f1(7 * s)}l${f1(-7 * s)} ${f1(-7 * s)}z" fill="${g}"/>`).join("") : ""}</g>`;
}

const LAYOUTS = {
  // ---- top bar with the hanging logo and the cream download tab: 1920 x 140 ----------------------
  "ui.voyage-topbar"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "navy");
    dust(d, 0, 75 * s, W, H - 75 * s, 60, s, 7);
    d.rect(0, 0, W, 75 * s, "bar");
    // the logo hangs 62 units below the bar: a gilt astrolabe ring mark (decoration) and the wordmark
    const mx = 117 * s; const my = 66 * s; const mr = 32 * s; let ticks = "";
    for (let i = 0; i < 24; i += 1) { const a = (i / 24) * Math.PI * 2; const r1 = mr - (i % 6 ? 3 : 7) * s; ticks += `M${f1(mx + Math.cos(a) * r1)} ${f1(my + Math.sin(a) * r1)}L${f1(mx + Math.cos(a) * mr)} ${f1(my + Math.sin(a) * mr)}`; }
    d.raw(`<g data-deco="1"><circle cx="${f1(mx)}" cy="${f1(my)}" r="${f1(mr)}" fill="none" stroke="${d.pal.gold}" stroke-width="${f1(2 * s)}"/><path d="${ticks}" stroke="${d.pal.gold}" stroke-width="${f1(1.4 * s)}"/><ellipse cx="${f1(mx)}" cy="${f1(my)}" rx="${f1(mr * 1.25)}" ry="${f1(mr * 0.34)}" transform="rotate(-24 ${f1(mx)} ${f1(my)})" fill="none" stroke="${d.pal.gold}" stroke-width="${f1(1.6 * s)}"/>${star4(mx, my, mr * 0.55, d.pal.gold)}</g>`);
    d.text("brand_cjk", 159 * s, 84 * s, 38 * s, { role: "white", family: "head", tracking: 30, box: [157 * s, 44 * s, 164 * s, 50 * s] });
    d.raw(`<rect data-deco="1" x="${f1(159 * s)}" y="${f1(95 * s)}" width="${f1(150 * s)}" height="${f1(Math.max(1, 1.2 * s))}" fill="${d.pal.gold}"/>`);
    d.text("brand_latin", 161 * s, 116 * s, 13.5 * s, { role: "cream", family: "label", tracking: 300, box: [157 * s, 101 * s, 170 * s, 20 * s] });
    const cur = Math.round(p.current);
    for (let i = 1; i <= 7; i += 1) {
      const x = (353 + (i - 1) * 139) * s; const on = i === cur;
      d.text(`nav_${i}`, x + 69.5 * s, 46 * s, (on ? 24 : 22.5) * s, { role: on ? "gold" : "mute", family: "body", anchor: "middle", weight: 400, box: [x + 4 * s, 18 * s, 131 * s, 38 * s] });
      if (on) d.rect(x, 72 * s, 139 * s, 3 * s, "gold");
    }
    d.raw(`<g data-deco="1"><circle cx="${f1(1413 * s)}" cy="${f1(37 * s)}" r="${f1(13.5 * s)}" fill="none" stroke="${d.pal.mute}" stroke-width="${f1(1.6 * s)}"/><path d="M${f1(1411 * s)} ${f1(43 * s)}a${f1(2.2 * s)} ${f1(2.2 * s)} 0 1 1 ${f1(-1.6 * s)} ${f1(-2.1 * s)}V${f1(31 * s)}l${f1(7.6 * s)} ${f1(-1.6 * s)}v${f1(8.8 * s)}" fill="none" stroke="${d.pal.mute}" stroke-width="${f1(1.6 * s)}"/><rect x="${f1(1479 * s)}" y="${f1(22 * s)}" width="${f1(Math.max(1, s))}" height="${f1(30 * s)}" fill="${d.pal.mute}"/></g>`);
    if (p.login) {
      d.text("login", 1538 * s, 45 * s, 18 * s, { role: "mute", family: "body", weight: 400, tracking: 220, box: [1534 * s, 24 * s, 64 * s, 28 * s] });
      d.raw(`<g data-deco="1"><circle cx="${f1(1615 * s)}" cy="${f1(38 * s)}" r="${f1(11 * s)}" fill="${d.pal.text}"/><circle cx="${f1(1615 * s)}" cy="${f1(35.6 * s)}" r="${f1(3.6 * s)}" fill="${d.pal.bar}"/><path d="M${f1(1608.6 * s)} ${f1(44.6 * s)}a${f1(7.4 * s)} ${f1(6 * s)} 0 0 1 ${f1(12.8 * s)} 0" fill="${d.pal.bar}"/></g>`);
    }
    // the cream download tab: 225 x 83, top bleeds 2 units, only the bottom-left corner rounds (22.5)
    const tx = 1695 * s; const tw = W - tx; const th = 81 * s;
    d.raw(`<path d="${rr(tx, 0, tw, th, [0, 0, 0, 22.5 * s])}" fill="${d.pal.cream}" data-role="cream"/>`);
    d.raw(`<path data-deco="1" d="${rr(tx + 10 * s, 8 * s, tw - 10 * s, th - 18 * s, [0, 0, 0, 15 * s])}" fill="none" stroke="${d.pal.gold_dim}" stroke-width="${f1(1 * s)}" opacity=".6"/>`);
    d.text("cta", tx + tw / 2, 52 * s, 28.5 * s, { role: "ink", family: "body", anchor: "middle", weight: 900, box: [tx + 14 * s, 18 * s, tw - 28 * s, 46 * s] });
    d.zone("bar", "safe", [0, 0, W, 140 * s], { slots: ["brand_cjk", "brand_latin", "cta", "nav_1", "nav_7"] });
  },

  // ---- one gilt news ticket: 626 x 518 ----------------------------------------------------------
  "card.voyage-ticket"(d) {
    const { W, p } = d; const s = W / 626;
    d.rect(0, 0, W, d.H, "navy");
    ticket(d, "", 0, 0, s, { active: p.active });
  },

  // ---- news section: the ticket carousel: 1920 x 1080 ------------------------------------------
  "kv.voyage-ticket-carousel"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "navy");
    dust(d, 0, 0, W, H, 260, s, 11);
    if (p.rail) rail(d, s, H);
    sectionTitle(d, 209 * s, 158 * s, s);
    const y = 352 * s; const pitch = 673 * s;
    ticket(d, "", 198 * s - pitch, y, s, { active: false, slots: false });
    ticket(d, "_1", 198 * s, y, s, { active: true });
    ticket(d, "_2", 198 * s + pitch, y, s, { active: false });
    ticket(d, "", 198 * s + 2 * pitch, y, s, { active: false, slots: false });
    arrow(d, 195 * s, 600 * s, s, -1);
    arrow(d, 1727 * s, 600 * s, s, 1);
    const n = Math.round(p.items);
    d.raw(`<g data-deco="1">${Array.from({ length: n }, (_, i) => `<rect x="${f1((209 + (i ? 74 + (i - 1) * 48 : 0)) * s)}" y="${f1(905 * s)}" width="${f1((i ? 34 : 60) * s)}" height="${f1(4 * s)}" fill="${i ? d.pal.gold_dim : d.pal.gold}"/>`).join("")}</g>`);
    moreCapsule(d, "more", 1578 * s, 890 * s, s);
    d.zone("title", "safe", [200 * s, 150 * s, 640 * s, 120 * s], { slots: ["title_cjk"] });
  },

  // ---- character section: info column, figure, quote and the faction orbit: 1920 x 1080 ---------
  "kv.voyage-orbit-roster"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "navy");
    dust(d, 0, 0, W, H, 240, s, 19);
    if (p.rail) rail(d, s, H);
    sectionTitle(d, 209 * s, 158 * s, s);
    d.raw(`<rect data-deco="1" x="0" y="${f1(304 * s)}" width="${f1(W)}" height="${f1(Math.max(1, s))}" fill="${d.pal.white}" opacity=".14"/>`);
    d.raw(`<rect x="${f1(18 * s)}" y="${f1(313 * s)}" width="${f1(1513 * s)}" height="${f1(602 * s)}" fill="${d.pal.panel}" stroke="${d.pal.gold_dim}" stroke-width="${f1(1 * s)}" data-role="panel"/>`);
    // the figure: a big image slot that breaks the panel's top and bottom edges
    d.image("art", 660 * s, 60 * s, 900 * s, 920 * s, "crew figure 2000 x 1840, transparent", { labelAt: [0.5, 0.3] });
    d.zone("figure", "figure", [760 * s, 80 * s, 720 * s, 520 * s]);
    // info column
    const x = 195 * s;
    d.text("name", x, 412 * s, 52.5 * s, { role: "white", family: "head", tracking: 40, box: [x - 4 * s, 356 * s, 400 * s, 66 * s] });
    d.text("name_latin", x + 2 * s, 444 * s, 15 * s, { role: "gold_line", family: "label", tracking: 330, box: [x - 2 * s, 428 * s, 400 * s, 22 * s] });
    d.raw(`<g data-deco="1"><path d="M${f1(x + 23 * s)} ${f1(462 * s)}l${f1(21 * s)} ${f1(21 * s)}l${f1(-21 * s)} ${f1(21 * s)}l${f1(-21 * s)} ${f1(-21 * s)}z" fill="${d.pal.plate}" stroke="${d.pal.gold}" stroke-width="${f1(1.4 * s)}"/>${star4(x + 23 * s, 483 * s, 9 * s, d.pal.gold)}</g>`);
    d.raw(`<text data-deco="1" x="${f1(x)}" y="${f1(553 * s)}" font-family="${esc(d.families.ghost)}" font-style="italic" font-weight="300" font-size="${f1(36 * s)}" fill="${d.pal.gold}">CV:</text>`);
    d.text("cv", x + 58 * s, 549 * s, 21 * s, { role: "cv", family: "body", weight: 500, box: [x + 54 * s, 526 * s, 150 * s, 30 * s] });
    d.raw(`<g data-deco="1"><circle cx="${f1(x + 238 * s)}" cy="${f1(541 * s)}" r="${f1(19 * s)}" fill="${d.pal.text}"/><rect x="${f1(x + 234.5 * s)}" y="${f1(531 * s)}" width="${f1(7 * s)}" height="${f1(13 * s)}" rx="${f1(3.5 * s)}" fill="${d.pal.ink}"/></g>`);
    d.raw(`<rect x="${f1(x)}" y="${f1(574 * s)}" width="${f1(475 * s)}" height="${f1(112 * s)}" rx="${f1(10.5 * s)}" fill="${d.pal.plate}" data-role="plate"/>`);
    d.text("story", x + 16 * s, 604 * s, 16.5 * s, { role: "text2", family: "body", weight: 500, lineHeight: 1.55, box: [x + 12 * s, 584 * s, 456 * s, 94 * s] });
    // avatars: square tiles, the current one framed in gold (decoration)
    const n = Math.round(p.avatars); const cur = Math.min(n, Math.round(p.active));
    d.raw(`<g data-deco="1">${Array.from({ length: n }, (_, i) => { const ax = x + 8 * s + i * 100 * s; const ay = 797 * s; const on = i + 1 === cur; return `<rect x="${f1(ax)}" y="${f1(ay)}" width="${f1(87 * s)}" height="${f1(87 * s)}" fill="${d.pal.plate}" stroke="${on ? d.pal.gold : d.pal.mute}" stroke-width="${f1((on ? 2.4 : 1) * s)}"/>${star4(ax + 43.5 * s, ay + 43.5 * s, 18 * s, on ? d.pal.gold : d.pal.gold_dim)}`; }).join("")}</g>`);
    // the quote: serif white lines on a dark plate, over the figure's lower right
    d.raw(`<rect x="${f1(1010 * s)}" y="${f1(650 * s)}" width="${f1(540 * s)}" height="${f1(84 * s)}" fill="${d.pal.plate}" data-role="plate"/>`);
    d.text("quote", 1022 * s, 682 * s, 19 * s, { role: "white", family: "head", weight: 700, lineHeight: 34 / 19, box: [1016 * s, 660 * s, 528 * s, 68 * s] });
    // the faction orbit: an arc centred off the left of the screen; medallions 13.7 degrees apart
    const { cx, cy, r, step } = ORBIT;
    d.raw(`<g data-deco="1"><circle cx="${f1(cx * s)}" cy="${f1(cy * s)}" r="${f1(r * s)}" fill="none" stroke="${d.pal.gold}" stroke-width="${f1(2 * s)}" opacity=".85"/><circle cx="${f1(cx * s)}" cy="${f1(cy * s)}" r="${f1((r + 80) * s)}" fill="none" stroke="${d.pal.gold_dim}" stroke-width="${f1(1 * s)}" stroke-dasharray="${f1(2 * s)} ${f1(7 * s)}"/></g>`);
    const { text: fac } = d.value("faction"); const head = [...String(fac)][0] || "?";
    let med = "";
    for (let k = -2; k <= 2; k += 1) {
      const a = (k * step * Math.PI) / 180; const mx = (cx + r * Math.cos(a)) * s; const my = (cy + r * Math.sin(a)) * s;
      med += medallion(d, mx, my, (k === 0 ? 70 : 60) * s, s, k === 0 ? head : k === 2 ? "?" : "", k === 0);
    }
    d.raw(med);
    const lx = (cx + r) * s;
    d.text("faction", lx, 664 * s, 17 * s, { role: "white", family: "body", anchor: "middle", weight: 500, tracking: 60, box: [lx - 80 * s, 644 * s, 160 * s, 28 * s] });
  },
};

module.exports = { LAYOUTS, ORBIT };
