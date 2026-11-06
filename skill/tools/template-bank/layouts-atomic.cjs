"use strict";

// Layouts of the atomic-age style pack (styles/atomic-age/style.json): mid-century Space-Age
// retro-futurism in two linked grammars, measured privately on an owner-supplied mood board (never
// shipped) and proven on an original example world (examples/atomic-age-kit).
//
// A) The atomic-age editorial and poster grammar: cream paper, teal + vermilion + mustard + charcoal,
//    condensed and geometric sans titles, starbursts, orbit ellipses, boomerang shapes, swept rockets
//    drawn only as flat glyph silhouettes, Googie scenes in image slots, halftone and misregistration.
// B) The mission-document grammar: typewriter mono on white sheets, vertical time ladders, ruled forms
//    with edition and date tables, punched holes, rubber stamps, unsigned ballpoint annotations,
//    orbital diagrams and white-line plates on black, press credential cards.
//
// Logos, insignia and emblems are never drawn: every template that carries a mark has an image slot
// for it, with its size, safe area and clear space stated in the manifest. Realistic scenes are image
// slots with generation task sheets. Ageing, halftone and misregistration of real outputs come from
// `materials generate` / `materials process` (the `paper` ground slot and the art slots); the code draws
// only flat inks, an optional code halftone on shapes and offset (misregistered) shape plates.

const { f1, invalid, rng, rbox, ngon } = require("./layout-kit.cjs");
const measure = require("./measure.cjs");

// ---- faces --------------------------------------------------------------------------------------
// Advance widths (em, hmtx / unitsPerEm + 1%, rounded up) of the pack's OFL faces, read with fontTools
// from the instances named in style.json (google/fonts 86aced91). Registered with the measure so that
// text in an embedded face is measured at its own width (measure.cjs registerFaceAdvances).
const ADV = require("./atomic-advances.json");
const FACES = {
  display: ["League Gothic", 400, "LeagueGothic-Regular"],
  geo: ["Jost", 700, "Jost-Bold"],
  label: ["Jost", 500, "Jost-Medium"],
  mono: ["Courier Prime", 400, "CourierPrime-Regular"],
  monob: ["Courier Prime", 700, "CourierPrime-Bold"],
  hand: ["Caveat", 600, "Caveat-SemiBold"],
};
for (const [family, weight, file] of Object.values(FACES)) measure.registerFaceAdvances(family, weight, ADV[file]);

// The measured board, as numbers the layouts use (see GRAMMAR in the example kit).
const GRAMMAR = {
  masthead: 0.17, // magazine masthead ink height / cover height (0.16-0.18 measured)
  sun: 0.216, // sun disc diameter / cover width
  column: 0.16, // contents column / cover width
  margin: 0.055, // outer margin / width (magazine, poster, field guide 0.05-0.06)
  wordmarkTracking: 520, // tracked geometric caps on the ad panel, per mille of the size
  rocketLength: 0.49, // swept rocket glyph / panel width on the ad panel
  ladderTicks: [10, 1], // minutes per major and minor tick on the time ladder
  orbitStep: 0.031, // solar print ring spacing / width (10 rings; measured 0.038 on a print with labels outside the frame)
  holes: 5, // punched holes along the top edge
};

// The family a role renders in: the pack's face when --font-dir supplies it (embedded, measured with its
// table), else the role is pinned to Noto Sans SC and sized from the calibrated model (#323).
function face(d, role) {
  const [family, weight] = FACES[role];
  const supplied = d.faces.some((f) => f.family === family && Number(f.weight || 400) === weight && !/\.ttc$/i.test(f.file));
  const table = supplied ? measure.faceAdvances(family, weight) : null;
  return {
    family: role, resolved: supplied ? family : "Noto Sans SC", weight, supplied,
    width: (t, size, tracking = 0) => measure.textWidth(String(t), size, (tracking / 1000) * size, { serif: false, weight, face: table }),
  };
}
// Cap height of each face in em (measured on the instances; Noto Sans SC 0.73 when pinned).
const CAP = { display: 0.74, geo: 0.7, label: 0.7, mono: 0.57, monob: 0.57, hand: 0.6 };
const capOf = (f) => (f.supplied ? CAP[f.family] : 0.73);

// One line of text fitted to a width: the size is the smaller of maxSize and what fits maxW.
function fitLine(d, name, role, x, y, maxSize, maxW, o = {}) {
  if (o.content === undefined) asciiOnly(d, name);
  const f = face(d, role);
  const text = o.content !== undefined ? o.content : d.value(name).text;
  const tracking = o.tracking || 0;
  const w1 = Math.max(1e-6, f.width(text, 1, tracking));
  const size = Math.max(1, Math.min(maxSize, maxW / w1));
  return put(d, name, role, x, y, size, { ...o, content: o.content, _f: f, _text: text });
}
// Place one line at a size; the box is the measured width plus a small pad (slant adds 0.22 em).
function put(d, name, role, x, y, size, o = {}) {
  if (o.content === undefined) asciiOnly(d, name);
  const f = o._f || face(d, role);
  const text = o._text !== undefined ? o._text : (o.content !== undefined ? o.content : d.value(name).text);
  const tracking = o.tracking || 0;
  const w = f.width(text, size, tracking);
  const anchor = o.anchor || "start";
  const x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  const pad = 0.04 * size + 2;
  const slant = o.italic ? 0.24 * size : 0;
  // o.rotate: [deg, cx, cy] turns the line about a point (stamps, chalk labels); the box is the turned box's bounds
  let box = o.box || [x0 - pad, y - 0.96 * size, w + 2 * pad + slant, size * 1.22];
  let transform;
  if (o.rotate) { const [deg, cx, cy] = o.rotate; transform = `rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})`; box = rbox(box, deg, [cx, cy], 1); }
  d.text(name, x, y, size, { role: o.role || "ink", family: role, resolved: f.resolved, anchor, tracking, box, italic: o.italic, content: o.content, transform, lineHeight: o.lineHeight });
  return { x0, w, size, cap: capOf(f) * size };
}
// A wrapped block (the slot declares lines); the box holds the budget of lines at this size.
function block(d, name, role, x, y, size, w, o = {}) {
  asciiOnly(d, name);
  const f = face(d, role);
  const { spec } = d.value(name);
  const lines = spec.lines || 1;
  const lh = o.lineHeight || 1.25;
  // shrink until the copy wraps inside its line budget at this face's width (never below 0.6 of the size)
  const text = String(d.value(name).text);
  const spacing = (sz) => ((o.tracking || 0) / 1000) * sz;
  const fits = (sz) => { const fnt = { serif: false, weight: f.weight, face: f.supplied ? measure.faceAdvances(FACES[role][0], f.weight) : null }; const wrapped = measure.wrapText(text, sz, w, spacing(sz), fnt); return wrapped.length <= lines && wrapped.every((ln) => measure.textWidth(ln, sz, spacing(sz), fnt) <= w); };
  const min = size * 0.6;
  while (size > min && !fits(size)) size *= 0.95;
  d.text(name, x, y, size, { role: o.role || "ink", family: role, resolved: f.resolved, tracking: o.tracking || 0, lineHeight: lh, box: [x, y - 0.96 * size, w, size * (1.22 + (lines - 1) * lh)] });
}
function asciiOnly(d, name) {
  const { text } = d.value(name);
  if (!/^[\x20-\x7E–—‘’“”•·°×…©]*$/.test(String(text))) {
    throw invalid(`slot ${name} is set in the pack's Latin faces (Latin, digits, ASCII punctuation and – — ‘ ’ “ ” • · ° × … ©), got ${JSON.stringify(text)}. Fix: write it in Latin, or put mixed CJK copy in a body slot`);
  }
}

// ---- shapes (all decoration: data-deco) --------------------------------------------------------
const P = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)} ${f1(y)}`).join("") + "Z";
// local (u, v) -> canvas, rotated by deg about the origin, scaled by k, moved to (x, y)
const xf = (x, y, k, deg) => { const a = (deg * Math.PI) / 180; const c = Math.cos(a); const s = Math.sin(a); return ([u, v]) => [x + k * (u * c - v * s), y + k * (u * s + v * c)]; };

// The starburst: four long rays and four short ones as thin diamonds, a dot at two long tips.
function starburst(d, cx, cy, r, role, o = {}) {
  const t = xf(cx, cy, r, o.rotate || 0);
  let path = "";
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4; const len = i % 2 ? (o.short || 0.5) : 1; const wdt = (i % 2 ? 0.035 : 0.05);
    const ca = Math.cos(a); const sa = Math.sin(a);
    path += P([[len * ca, len * sa], [wdt * -sa, wdt * ca], [-0.06 * ca, -0.06 * sa], [wdt * sa, -wdt * ca]].map(t));
  }
  const dots = (o.dots ?? 2) > 0 ? [0, 2].slice(0, o.dots ?? 2).map((i) => { const a = (i * Math.PI) / 4 + ((o.rotate || 0) * Math.PI) / 180; return `<circle cx="${f1(cx + r * 1.12 * Math.cos(a))}" cy="${f1(cy + r * 1.12 * Math.sin(a))}" r="${f1(r * 0.05)}"/>`; }).join("") : "";
  d.raw(`<g data-deco="1" fill="${d.pal[role]}"><path d="${path}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.07)}"/>${dots}</g>`);
}
// An orbit ellipse (stroke only), optionally dashed.
function orbit(d, cx, cy, rx, ry, deg, role, w, o = {}) {
  d.raw(`<ellipse data-deco="1" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})" fill="none" stroke="${d.pal[role]}" stroke-width="${f1(w)}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.opacity ? ` opacity="${o.opacity}"` : ""}/>`);
}
// Discs are 64-gon paths, so the static check composites them as ground and counts their accent area.
function disc(d, cx, cy, r, role, extra = "") { d.raw(`<path data-deco="1" d="${ngon(cx, cy, r, 64)}" fill="${d.pal[role]}"${extra}/>`); }
// The boomerang (amoeba) shape: two rounded arms, open angle about 100 degrees.
function boomerang(d, cx, cy, k, deg, role, extra = "") {
  const t = xf(cx, cy, k, deg);
  const c = [[-1, -0.25], [-0.55, -0.55], [-0.12, 0.05], [0, 0.32], [0.12, 0.05], [0.55, -0.55], [1, -0.25], [0.78, 0.2], [0.25, 0.62], [0, 0.78], [-0.25, 0.62], [-0.78, 0.2]].map(t);
  const p = `M${f1(c[0][0])} ${f1(c[0][1])}C${[1, 2, 3].map((i) => `${f1(c[i][0])} ${f1(c[i][1])}`).join(" ")}C${[4, 5, 6].map((i) => `${f1(c[i][0])} ${f1(c[i][1])}`).join(" ")}C${[7, 8, 9].map((i) => `${f1(c[i][0])} ${f1(c[i][1])}`).join(" ")}C${[10, 11, 0].map((i) => `${f1(c[i][0])} ${f1(c[i][1])}`).join(" ")}Z`;
  d.raw(`<path data-deco="1" d="${p}" fill="${d.pal[role]}"${extra}/>`);
}
// The swept rocket glyph, a flat silhouette pointing along deg: needle fuselage, swept wings, one fin,
// a pod; length k. Never a rendered vehicle (#301).
const SWEPT = [
  [[1, 0], [0.62, -0.03], [0.18, -0.038], [0, -0.03], [0, 0.03], [0.18, 0.038], [0.62, 0.03]],
  [[0.56, 0.03], [0.3, 0.2], [0.22, 0.21], [0.36, 0.03]],
  [[0.5, -0.03], [0.32, -0.12], [0.27, -0.12], [0.38, -0.03]],
  [[0.13, -0.035], [0.03, -0.17], [-0.03, -0.17], [0.03, -0.03]],
  [[0.42, 0.075], [0.6, 0.075], [0.62, 0.095], [0.6, 0.115], [0.42, 0.115], [0.4, 0.095]],
];
function sweptRocket(d, x, y, k, deg, role, o = {}) {
  const t = xf(x, y, k, deg);
  let trail = "";
  if (o.trail !== false) {
    for (const [v, len] of [[-0.012, 1.25], [0.012, 1.1], [0.032, 0.8]]) { const [a, b] = [t([-0.02, v]), t([-0.02 - len, v])]; trail += `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }
  }
  const off = o.offset ? `<g fill="${d.pal[o.offset.role]}">${SWEPT.map((s) => `<path d="${P(s.map(t).map(([a, b]) => [a + o.offset.dx, b + o.offset.dy]))}"/>`).join("")}</g>` : "";
  d.raw(`<g data-deco="1">${off}${trail ? `<path d="${trail}" fill="none" stroke="${d.pal[o.trailRole || role]}" stroke-width="${f1(Math.max(1, k * 0.007))}"/>` : ""}<g fill="${d.pal[role]}">${SWEPT.map((s) => `<path d="${P(s.map(t))}"/>`).join("")}</g>${o.window ? `<path d="${P([[0.7, -0.012], [0.82, -0.008], [0.82, 0.004], [0.7, 0.004]].map(t))}" fill="${d.pal[o.window]}"/>` : ""}</g>`);
}
// The classic rocket glyph (bullet body, three fins), pointing along deg; k is its length.
function classicRocket(d, x, y, k, deg, role) {
  const t = xf(x, y, k / 2, deg - 90);
  const body = [[0, -1], [0.3, -0.55], [0.22, 0.35], [0.42, 0.62], [0.4, 0.86], [0.14, 0.62], [0.06, 0.74], [-0.06, 0.74], [-0.14, 0.62], [-0.4, 0.86], [-0.42, 0.62], [-0.22, 0.35], [-0.3, -0.55]].map(t);
  const p = `M${f1(body[0][0])} ${f1(body[0][1])}Q${f1(body[1][0])} ${f1(body[1][1])} ${f1(body[2][0])} ${f1(body[2][1])}${body.slice(3, 12).map(([a, b]) => `L${f1(a)} ${f1(b)}`).join("")}Q${f1(body[12][0])} ${f1(body[12][1])} ${f1(body[0][0])} ${f1(body[0][1])}Z`;
  d.raw(`<path data-deco="1" d="${p}" fill="${d.pal[role]}"/>`);
}
// The satellite glyph: a sphere with four swept antennas.
function satellite(d, x, y, r, deg, role) {
  const t = xf(x, y, r, deg);
  const ant = [[-0.2, -0.85], [-0.75, -0.55], [-0.85, 0.15], [-0.4, 0.8]].map(([u, v]) => { const [a, b] = t([u, v]); const [c, e] = t([u - 3.4, v * 1.9 + 0.2]); return `M${f1(a)} ${f1(b)}L${f1(c)} ${f1(e)}`; }).join("");
  d.raw(`<g data-deco="1"><path d="${ant}" stroke="${d.pal[role]}" stroke-width="${f1(Math.max(1, r * 0.05))}" fill="none"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${d.pal[role]}"/></g>`);
}
// A code halftone on a shape: a dot screen pattern (decoration); real halftones come from materials.
function dotScreen(d, role, period, coverage, angle = 45) {
  const id = `ht-${d.htN = (d.htN || 0) + 1}`;
  const r = Math.sqrt(coverage / Math.PI) * period;
  d.def(`<pattern id="${id}" width="${f1(period)}" height="${f1(period)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${f1(period / 2)}" cy="${f1(period / 2)}" r="${f1(r)}" fill="${d.pal[role]}"/></pattern>`);
  return `url(#${id})`;
}
// Linen weave: fine threads both ways (decoration).
function linen(d, x, y, w, h, role, s) {
  const id = `linen-${d.linN = (d.linN || 0) + 1}`;
  const p = 5 * s;
  d.def(`<pattern id="${id}" width="${f1(p)}" height="${f1(p)}" patternUnits="userSpaceOnUse"><rect width="${f1(p)}" height="${f1(Math.max(0.6, p * 0.22))}" fill="${d.pal[role]}" opacity="0.5"/><rect width="${f1(Math.max(0.6, p * 0.18))}" height="${f1(p)}" fill="${d.pal[role]}" opacity="0.35"/></pattern>`);
  d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="url(#${id})"/>`);
}
// The paper ground: a materials-made sheet in the `paper` slot (ground layer: sampled for contrast),
// else the flat paper ink.
function ground(d, role, name = "paper") {
  const { text } = d.value(name);
  if (typeof text === "string" && text.startsWith("data:image/")) d.image(name, 0, 0, d.W, d.H);
  else { slotMarker(d, name, [0, 0, d.W, d.H], role); d.rect(0, 0, d.W, d.H, role); }
}
// An image slot left empty in this mode (the drawn variant, an unfilled ground): an empty slot group in its
// declared ground tone, so the render still names the slot (as layouts-ink.cjs plateSlot does).
function slotMarker(d, name, box, role) {
  const { spec } = d.value(name);
  d.raw(`<g ${d.slotAttrs(name, spec, { box: d.clipBox(box) })} data-ground="${d.pal[role || spec.ground]}"${spec.layer ? ` data-layer="${spec.layer}"` : ""}></g>`);
}
// Image slot in slot mode or when filled; otherwise the marker, and the caller draws its flat variant.
function slotOr(d, name, box, mode, note) {
  const { text } = d.value(name);
  if (mode === "slot" || String(text).startsWith("data:image/")) { d.image(name, ...box, note); return true; }
  slotMarker(d, name, box);
  return false;
}
// Mark the text just placed as part of a lock-up (page-check groups data-grp by the prefix before /).
function lockup(d, grp) { const i = d.body.length - 1; d.body[i] = d.body[i].replace("<text ", `<text data-grp="${grp}" `); }
// A mark slot (logo, emblem, insignia): an image the owner supplies; the placeholder states its rule.
function mark(d, name, x, y, w, h, note) { d.image(name, x, y, w, h, note); }
function holes(d, n, y, r, role, x0, x1) {
  for (let i = 0; i < n; i += 1) disc(d, x0 + ((x1 - x0) * i) / (n - 1), y, r, role);
}
function rule(d, x, y, w, role, t) { d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(Math.max(1, t))}" fill="${d.pal[role]}"/>`); }
function frame(d, x, y, w, h, role, t, extra = "") { d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="${d.pal[role]}" stroke-width="${f1(Math.max(1, t))}"${extra}/>`); }
const titleSlots = (names) => names;

const LAYOUTS = {
  // ---- A1 magazine cover: 1500 x 2000 (3:4) --------------------------------------------------------
  "cover.atomic-magazine"(d) {
    const { W, H, p } = d; const s = W / 1500; const m = GRAMMAR.margin * W;
    ground(d, "paper");
    // the shapes: teal block, charcoal block, the sun, a small disc, the big orbit, a mobile of poles
    const reg = p.misregister * s;
    d.raw(`<path data-deco="1" d="${P([[0.37 * W, 0.47 * H], [0.6 * W, 0.5 * H], [0.6 * W, 0.66 * H], [W, 0.66 * H], [W, 0.95 * H], [0.37 * W, 0.95 * H]])}" fill="${d.pal.teal}"/>`);
    d.raw(`<path data-deco="1" d="${P([[0.37 * W, 0.72 * H], [0.52 * W, 0.7 * H], [0.52 * W, 0.95 * H], [0.37 * W, 0.95 * H]])}" fill="${d.pal.ink}"/>`);
    const sunR = (GRAMMAR.sun * W) / 2;
    if (reg) disc(d, 0.8 * W + reg, 0.42 * H + reg * 0.6, sunR, "mustard", ' opacity="0.85"');
    disc(d, 0.8 * W, 0.42 * H, sunR, "vermilion");
    if (p.halftone) d.raw(`<circle data-deco="1" cx="${f1(0.8 * W)}" cy="${f1(0.42 * H)}" r="${f1(sunR)}" fill="${dotScreen(d, "rust", 9 * s, 0.22)}"/>`);
    disc(d, 0.82 * W, 0.65 * H, 0.06 * W, "teal");
    orbit(d, 0.72 * W, 0.52 * H, 0.31 * W, 0.31 * W, 0, "ink", 2.5 * s);
    d.raw(`<path data-deco="1" d="M${f1(0.39 * W)} ${f1(0.52 * H)}h${f1(0.06 * W)}M${f1(0.99 * W)} ${f1(0.52 * H)}h${f1(-0.06 * W)}M${f1(0.6 * W)} ${f1(0.35 * H)}v${f1(0.55 * H)}" stroke="${d.pal.ink}" stroke-width="${f1(2 * s)}"/>`);
    for (const [x, top, r, role] of [[0.46, 0.6, 0.012, "paper"], [0.49, 0.64, 0.009, "ink"], [0.44, 0.78, 0.014, "paper"]]) {
      d.raw(`<path data-deco="1" d="M${f1(x * W)} ${f1(top * H)}V${f1(0.95 * H)}" stroke="${d.pal.paper}" stroke-width="${f1(2 * s)}"/>`);
      disc(d, x * W, top * H, r * W, role);
    }
    if (p.starburst) starburst(d, 0.85 * W, 0.215 * H, 0.085 * W, "ink", { rotate: 12 });
    // the scene: Googie architecture from an image slot
    d.image("art", 0.46 * W, 0.59 * H, 0.54 * W, 0.31 * H, "GOOGIE SCENE · 3:2 · TASK SHEET");
    // the masthead: a small lowercase word, two colours in one condensed word, a tracked line
    const top = 0.03 * H;
    const k = put(d, "kicker", "display", m, top + 0.05 * H, 0.06 * H, { role: "ink" });
    const mh = (GRAMMAR.masthead * H) / 0.92;
    const fa = face(d, "display");
    const wa = fa.width(d.value("masthead_a").text, 1, -10); const wb = fa.width(d.value("masthead_b").text, 1, -10);
    const size = Math.min(mh, (0.74 * W - m) / (wa + wb + 0.01));
    const base = top + 0.06 * H + 0.92 * size;
    // one word in two inks: the halves are one lock-up (data-grp), so their ink may touch as letters do
    const a = put(d, "masthead_a", "display", m, base, size, { role: "teal", tracking: -10 });
    lockup(d, "masthead/a");
    put(d, "masthead_b", "display", m + a.w + 0.01 * size, base, size, { role: "vermilion", tracking: -10 });
    lockup(d, "masthead/b");
    const c = fitLine(d, "masthead_c", "geo", m, base + 0.075 * H, 0.072 * H, 0.52 * W, { role: "ink", tracking: 40 });
    fitLine(d, "tagline", "label", m, base + 0.075 * H + 0.04 * H, 0.022 * H, 0.6 * W, { role: "teal", tracking: 80 });
    put(d, "date", "display", W - m, top + 0.05 * H, 0.032 * H, { anchor: "end", role: "ink" });
    put(d, "price", "display", W - m, top + 0.05 * H + 0.04 * H, 0.03 * H, { anchor: "end", role: "rust" });
    // the contents column: dot, two-line head, two-line deck, page, a rule
    const colW = GRAMMAR.column * W * 1.4; let y = 0.385 * H;
    const n = p.items;
    const step = (0.9 * H - y) / n;
    const u = step / 0.135; // entry rhythm: 0.135 of H per entry at four entries
    for (let i = 1; i <= n; i += 1) {
      const role = i % 2 ? "teal" : "rust";
      disc(d, m + 0.006 * W, y, 0.006 * W, i % 2 ? "teal" : "vermilion");
      block(d, `item_${i}`, "display", m, y + 0.032 * H, 0.024 * H, colW, { role, lineHeight: 1.0 });
      block(d, `deck_${i}`, "label", m, y + 0.072 * H, 0.0135 * H, colW, { role: "ink", lineHeight: 1.3 });
      put(d, `page_${i}`, "label", m, y + 0.112 * H * Math.min(1, u), 0.012 * H, { role: "ink" });
      rule(d, m, y + step - 0.004 * H, colW, i % 2 ? "teal" : "vermilion", 2.5 * s);
      y += step;
    }
    // the PLUS strip
    const py = 0.955 * H;
    disc(d, m + 0.04 * W, py, 0.042 * W, "ink");
    fitLine(d, "plus", "display", m + 0.04 * W, py + 0.011 * H, 0.03 * H, 0.06 * W, { anchor: "middle", role: "paper" });
    fitLine(d, "plus_line", "label", m + 0.1 * W, py + 0.007 * H, 0.016 * H, 0.6 * W, { role: "ink", tracking: 60 });
    mark(d, "emblem", W - m - 0.07 * W, 0.915 * H, 0.07 * W, 0.07 * W, "EMBLEM 1:1");
    d.zone("masthead", "safe", [m * 0.5, 0, W - m, base + 0.13 * H], { slots: ["masthead_a", "masthead_b", "masthead_c"] });
    d.align("left", "left", m, ["masthead_a", "item_1", "deck_1"], 0.012);
    void k; void c;
  },

  // ---- A2 travel / space poster: 1600 x 2400 (2:3) ------------------------------------------------
  "poster.atomic-travel"(d) {
    const { W, H, p } = d; const s = W / 1600; const m = GRAMMAR.margin * W;
    const sky = p.ground; const titleRole = p.title_ink;
    if (measure.contrastRatio(measure.parseColor(d.pal[titleRole]), measure.parseColor(d.pal[sky])) < 3) throw invalid(`title_ink ${titleRole} on ground ${sky} is under 3:1. Fix: --param title_ink=paper or --param title_ink=mustard on navy and teal; vermilion only on ink`);
    d.rect(0, 0, W, H, sky);
    const artBox = [m, 0.3 * H, W - 2 * m, 0.48 * H];
    const slotted = slotOr(d, "art", artBox, p.art, "SCENE · TASK SHEET");
    // the stars: small four-point bursts on a seeded field
    const r = rng(p.star_seed);
    for (let i = 0; i < 14; i += 1) { const x = r() * W; const y = 0.18 * H + r() * 0.42 * H; starburst(d, x, y, (6 + r() * 14) * s, "paper", { dots: 0, short: 0.35 }); }
    // the planet limb: a disc centred below the frame, with a code halftone shade and a misregistered plate
    const pr = 1.05 * W; const pcx = 0.62 * W; const pcy = H + 0.72 * W;
    const reg = p.misregister * s;
    if (reg) disc(d, pcx - reg, pcy - reg, pr, "mustard");
    disc(d, pcx, pcy, pr, p.planet);
    if (p.halftone) d.raw(`<circle data-deco="1" cx="${f1(pcx)}" cy="${f1(pcy)}" r="${f1(pr)}" fill="${dotScreen(d, "ink", 14 * s, 0.18)}" opacity="0.55"/>`);
    orbit(d, 0.5 * W, 0.62 * H, 0.62 * W, 0.12 * W, -14, "paper", 3 * s, { dash: `${f1(2 * s)} ${f1(10 * s)}` });
    // a scene in the slot paints above the planet and the orbit (it was opened before them to keep its place in the slot order)
    if (slotted) d.body.push(d.body.splice(d.body.findIndex((b) => b.includes('data-slot="art"')), 1)[0]);
    else if (p.vehicle === "satellite") satellite(d, 0.6 * W, 0.5 * H, 0.08 * W, -20, "paper");
    else sweptRocket(d, 0.82 * W, 0.34 * H, 0.62 * W, -32, "paper", { trailRole: "paper", window: sky, offset: reg ? { role: "vermilion", dx: reg, dy: reg } : null });
    // the title: heavy condensed, slanted, top left; the kicker over it
    put(d, "kicker", "geo", m, 0.07 * H, 0.022 * H, { role: "paper", tracking: 120 });
    const t = fitLine(d, "title", "display", m, 0.07 * H + 0.16 * H, 0.17 * H, W - 2 * m - 0.2 * W, { role: titleRole, italic: p.italic });
    block(d, "subtitle", "geo", m, 0.07 * H + 0.16 * H + 0.06 * H, 0.032 * H, 0.62 * W, { role: "paper", lineHeight: 1.12 });
    mark(d, "emblem", W - m - 0.13 * W, 0.04 * H, 0.13 * W, 0.13 * W, "EMBLEM 1:1");
    // the bottom band: the line and the date
    const by = 0.9 * H;
    d.rect(0, by, W, H - by, "vermilion");
    fitLine(d, "band", "geo", W / 2, by + 0.062 * H, 0.04 * H, W - 2 * m, { role: "ink", anchor: "middle", tracking: 60 });
    // the date sits on the planet limb: paper on a dark planet, charcoal on mustard
    const onPlanet = measure.contrastRatio(measure.parseColor(d.pal.paper), measure.parseColor(d.pal[p.planet])) >= 3 ? "paper" : "ink";
    put(d, "date", "display", W - m, by - 0.03 * H, 0.036 * H, { anchor: "end", role: onPlanet });
    d.zone("title", "safe", [m * 0.5, 0, W - m, 0.36 * H], { slots: ["title", "kicker", "subtitle"] });
    d.align("left", "left", m, ["title", "kicker", "subtitle"], 0.012);
    void t;
  },

  // ---- A3 linen book cover: 1200 x 1800 (2:3) -----------------------------------------------------
  "cover.atomic-linen-book"(d) {
    const { W, H, p } = d; const s = W / 1200; const m = 0.09 * W;
    const dark = p.cloth === "charcoal";
    d.rect(0, 0, W, H, dark ? "ink" : "linen");
    linen(d, 0, 0, W, H, dark ? "linen_dark_thread" : "linen_thread", s);
    const line = dark ? "paper" : p.swoop_ink;
    const bw = 0.045 * W;
    if (p.swoop === "loop") {
      // the swoosh that curls round the title: one thick curve, a hairline inside it
      d.raw(`<path data-deco="1" d="M${f1(0.05 * W)} ${f1(0.97 * H)}C${f1(-0.25 * W)} ${f1(0.35 * H)} ${f1(0.55 * W)} ${f1(0.02 * H)} ${f1(0.95 * W)} ${f1(0.3 * H)}C${f1(1.15 * W)} ${f1(0.5 * H)} ${f1(1.05 * W)} ${f1(0.9 * H)} ${f1(0.62 * W)} ${f1(1.02 * H)}" fill="none" stroke="${d.pal[line]}" stroke-width="${f1(bw * 2.2)}" stroke-linecap="round"/>`);
      d.raw(`<path data-deco="1" d="M${f1(0.3 * W)} ${f1(0.2 * H)}C${f1(0.7 * W)} ${f1(0.12 * H)} ${f1(1.0 * W)} ${f1(0.42 * H)} ${f1(0.86 * W)} ${f1(0.86 * H)}" fill="none" stroke="${d.pal[dark ? "ink" : "linen"]}" stroke-width="${f1(3 * s)}"/>`);
      // the glyph is cut out of the band where it turns (t = 0.5 of the curve), pointing along it
      sweptRocket(d, 0.2375 * W + 0.08 * W * Math.cos((-41 * Math.PI) / 180), 0.297 * H + 0.08 * W * Math.sin((-41 * Math.PI) / 180), 0.16 * W, -41, dark ? "ink" : "linen", { trail: false });
    } else {
      // one swooping line from the lower left, a classic rocket at its head; a second, paler band
      d.raw(`<path data-deco="1" d="M${f1(0.82 * W)} ${f1(-0.02 * H)}C${f1(0.62 * W)} ${f1(0.35 * H)} ${f1(0.4 * W)} ${f1(0.7 * H)} ${f1(0.12 * W)} ${f1(1.02 * H)}" fill="none" stroke="${d.pal.swoop_pale}" stroke-width="${f1(bw)}"/>`);
      d.raw(`<path data-deco="1" d="M${f1(0.04 * W)} ${f1(0.53 * H)}C${f1(0.12 * W)} ${f1(0.44 * H)} ${f1(0.2 * W)} ${f1(0.38 * H)} ${f1(0.29 * W)} ${f1(0.29 * H)}" fill="none" stroke="${d.pal[line]}" stroke-width="${f1(0.016 * W)}" stroke-linecap="round"/>`);
      classicRocket(d, 0.33 * W, 0.235 * H, 0.1 * W, -52, "vermilion");
    }
    // the title block: three stacked lines of condensed caps, left aligned
    const ty = p.swoop === "loop" ? 0.48 * H : 0.62 * H;
    const role = dark ? "paper" : "ink";
    const f = face(d, "display");
    const lines = [1, 2, 3].map((i) => d.value(`title_${i}`).text);
    const widest = Math.max(...lines.map((t) => f.width(t, 1, 30)));
    const size = Math.min(0.085 * H, (0.62 * W) / widest);
    const x = p.swoop === "loop" ? 0.18 * W : m;
    lines.forEach((t, i) => put(d, `title_${i + 1}`, "display", x, ty + i * size * 1.02, size, { role, tracking: 30 }));
    fitLine(d, "author", "label", x, ty + 3 * size * 1.02 + 0.03 * H, 0.024 * H, 0.6 * W, { role, tracking: 160 });
    mark(d, "publisher_mark", W / 2 - 0.045 * W, 0.91 * H, 0.09 * W, 0.06 * H, "MARK");
    d.align("left", "left", x, ["title_1", "title_2", "title_3", "author"], 0.008);
  },

  // ---- A4 ad / brochure panel: 1800 x 900 (2:1) ---------------------------------------------------
  "banner.atomic-ad-panel"(d) {
    const { W, H, p } = d; const s = W / 1800; const m = GRAMMAR.margin * W;
    d.rect(0, 0, W, H, "ink");
    // the field: a vermilion lens off the right edge
    const reg = p.misregister * s;
    const lens = (dx, dy) => `M${f1(0.33 * W + dx)} ${f1(0.66 * H + dy)}C${f1(0.37 * W + dx)} ${f1(0.12 * H + dy)} ${f1(0.75 * W + dx)} ${f1(-0.05 * H + dy)} ${f1(1.1 * W + dx)} ${f1(0.02 * H + dy)}L${f1(1.1 * W + dx)} ${f1(0.82 * H + dy)}C${f1(0.8 * W + dx)} ${f1(0.95 * H + dy)} ${f1(0.45 * W + dx)} ${f1(0.95 * H + dy)} ${f1(0.33 * W + dx)} ${f1(0.66 * H + dy)}Z`;
    if (reg) d.raw(`<path data-deco="1" d="${lens(reg, -reg)}" fill="${d.pal.mustard}"/>`);
    d.raw(`<path data-role="vermilion" d="${lens(0, 0)}" fill="${d.pal.vermilion}"/>`);
    // the rocket crossing out of the field, trail to the lower left
    sweptRocket(d, 0.57 * W, 0.42 * H, GRAMMAR.rocketLength * W * 0.62, -27, "ink", { trailRole: "paper" });
    d.raw(`<path data-deco="1" d="${P([[0.42 * W, 0.42 * H], [0.47 * W, 0.4 * H], [0.47 * W, 0.42 * H], [0.42 * W, 0.44 * H]])}" fill="${d.pal.paper}"/>`);
    put(d, "year", "display", m, 0.26 * H, 0.17 * H, { role: "paper" });
    fitLine(d, "brand", "display", 0.92 * W, 0.66 * H, 0.15 * H, 0.42 * W, { role: "ink", anchor: "end", tracking: 20 });
    fitLine(d, "wordmark", "geo", W / 2, 0.94 * H, 0.06 * H, W - 2 * m, { role: "paper", anchor: "middle", tracking: GRAMMAR.wordmarkTracking });
    mark(d, "logo", W - m - 0.11 * W, 0.08 * H, 0.11 * W, 0.18 * H, "LOGO");
    d.zone("type", "safe", [m * 0.5, 0, W - m, H], { slots: ["year", "brand", "wordmark"] });
  },

  // ---- A5 product label card (field guide): 2000 x 1000 (2:1) -------------------------------------
  "card.atomic-field-label"(d) {
    const { W, H, p } = d; const s = W / 2000;
    ground(d, p.ground === "teal" ? "teal" : "mustard", "board");
    const ix = 0.065 * W; const iy = 0.12 * H; const iw = W - 2 * ix; const ih = H - 2 * iy + 0.06 * H;
    d.rect(ix, iy, iw, ih, "card");
    frame(d, ix, iy, iw, ih, "ink", 4 * s);
    const cx = W / 2; const pad = 0.035 * W;
    const title = fitLine(d, "title", "geo", cx, iy + 0.17 * H, 0.12 * H, iw - 2 * pad, { role: "ink", anchor: "middle", tracking: 30 });
    const sub = fitLine(d, "subtitle", "geo", cx, iy + 0.255 * H, 0.04 * H, iw * 0.62, { role: "rust", anchor: "middle", tracking: 180 });
    rule(d, ix + pad, iy + 0.24 * H, cx - sub.w / 2 - ix - pad - 0.015 * W, "ink", 3 * s);
    rule(d, cx + sub.w / 2 + 0.015 * W, iy + 0.24 * H, ix + iw - pad - (cx + sub.w / 2 + 0.015 * W), "ink", 3 * s);
    // the boxed pair: a label and a typed paragraph, a dotted divider, a label, a script line and a typed line
    const bx = ix + pad * 0.6; const by = iy + 0.31 * H; const bw = iw - pad * 1.2; const bh = 0.27 * H;
    frame(d, bx, by, bw, bh, "ink", 3 * s);
    const half = bx + bw * 0.52;
    d.raw(`<path data-deco="1" d="M${f1(half)} ${f1(by + 0.03 * H)}V${f1(by + bh - 0.03 * H)}" stroke="${d.pal.ink}" stroke-width="${f1(5 * s)}" stroke-dasharray="${f1(2 * s)} ${f1(12 * s)}" stroke-linecap="round"/>`);
    put(d, "label_1", "geo", bx + 0.012 * W, by + 0.07 * H, 0.04 * H, { role: "rust" });
    block(d, "text_1", "mono", bx + 0.012 * W, by + 0.135 * H, 0.033 * H, half - bx - 0.03 * W, { role: "ink", lineHeight: 1.25, tracking: 40 });
    put(d, "label_2", "geo", half + 0.02 * W, by + 0.07 * H, 0.04 * H, { role: "rust" });
    fitLine(d, "script", "hand", half + 0.02 * W, by + 0.165 * H, 0.075 * H, bx + bw - half - 0.04 * W, { role: "ink" });
    fitLine(d, "text_2", "mono", half + 0.02 * W, by + 0.235 * H, 0.033 * H, bx + bw - half - 0.04 * W, { role: "ink", tracking: 40 });
    // three fields under the box
    const fy = by + bh + 0.07 * H; const cols = [bx + 0.012 * W, bx + bw * 0.36, bx + bw * 0.68];
    for (let i = 0; i < 3; i += 1) {
      put(d, `field_${i + 1}`, "geo", cols[i], fy, 0.04 * H, { role: "rust" });
      block(d, `value_${i + 1}`, "mono", cols[i], fy + 0.065 * H, 0.033 * H, bw * 0.29, { role: "ink", tracking: 40 });
      if (i) d.raw(`<path data-deco="1" d="M${f1(cols[i] - 0.02 * W)} ${f1(fy - 0.04 * H)}V${f1(fy + 0.12 * H)}" stroke="${d.pal.ink}" stroke-width="${f1(5 * s)}" stroke-dasharray="${f1(2 * s)} ${f1(12 * s)}" stroke-linecap="round"/>`);
    }
    if (!slotOr(d, "emblem", [ix + iw - 0.09 * W, iy - 0.1 * H, 0.08 * W, 0.08 * W], p.emblem ? "slot" : "drawn", "EMBLEM")) { /* no emblem: the corner stays board */ }
    d.zone("card", "safe", [ix, iy, iw, ih], { slots: ["title", "subtitle", "label_1", "text_1", "label_2", "text_2", "script"] });
    void title;
  },

  // ---- B1 flight-plan page: 1700 x 2200 (US letter) -----------------------------------------------
  "doc.atomic-flight-plan"(d) {
    const { W, H, p } = d; const s = W / 1700;
    ground(d, "sheet");
    if (p.holes) holes(d, 3, 0.035 * H, 0.012 * W, "punch", 0.2 * W, 0.8 * W);
    put(d, "code", "monob", 0.1 * W, 0.075 * H, 0.016 * H, { role: "ink" });
    fitLine(d, "header", "geo", 0.84 * W, 0.085 * H, 0.03 * H, 0.4 * W, { role: "ink", anchor: "end", tracking: 40 });
    // the time ladder: a rail with a tick every minute, a long one every ten, labels every ten
    const lx = 0.32 * W; const top = 0.115 * H; const bot = 0.83 * H; const minutes = 120;
    const step = (bot - top) / minutes;
    let ticks = "";
    for (let i = 0; i <= minutes; i += 1) { const len = i % GRAMMAR.ladderTicks[0] === 0 ? 0.022 * W : 0.011 * W; ticks += `M${f1(lx)} ${f1(top + i * step)}h${f1(len)}`; }
    d.raw(`<path data-deco="1" d="M${f1(lx)} ${f1(top)}V${f1(bot)}${ticks}" stroke="${d.pal.ink}" stroke-width="${f1(2.2 * s)}" fill="none"/>`);
    put(d, "zone_time", "mono", lx - 0.005 * W, top - 0.03 * H, 0.0155 * H, { role: "ink", anchor: "end" });
    const h0 = p.start_hour;
    for (let i = 0; i <= minutes; i += 10) {
      const hh = h0 + Math.floor(i / 60); const mm = i % 60;
      const label = mm === 0 ? `${hh}:00` : `:${String(mm).padStart(2, "0")}`;
      put(d, `tick_${i / 10}`, "mono", lx - 0.012 * W, top + i * step + 0.006 * H, 0.0155 * H, { role: "ink", anchor: "end", content: label });
    }
    // the bracket rail, the network column (vertical letters), the dotted rail
    const r1 = 0.37 * W; const r2 = 0.395 * W; const r3 = 0.42 * W;
    d.raw(`<g data-deco="1" stroke="${d.pal.ink}" fill="none" stroke-width="${f1(2.2 * s)}"><path d="M${f1(r1)} ${f1(top)}V${f1(bot)}M${f1(r1 - 8 * s)} ${f1(top)}h${f1(16 * s)}M${f1(r1 - 8 * s)} ${f1(bot)}h${f1(16 * s)}"/><path d="M${f1(r3)} ${f1(top)}V${f1(bot)}" stroke-width="${f1(7 * s)}" stroke-dasharray="${f1(2 * s)} ${f1(3 * s)}"/></g>`);
    d.raw(`<path data-deco="1" d="M${f1(r2)} ${f1(top)}V${f1(top + 0.42 * H)}M${f1(r2)} ${f1(top + 0.58 * H)}V${f1(bot)}" stroke="${d.pal.ink}" stroke-width="${f1(2.2 * s)}"/>`);
    d.text("net", r2, top + 0.43 * H, 0.016 * H, { role: "ink", family: "mono", resolved: face(d, "mono").resolved, vertical: true, anchor: "start", box: [r2 - 0.012 * H, top + 0.425 * H, 0.024 * H, 0.15 * H] });
    // the activity column: a long period with its label, events at their minutes
    const ax = 0.44 * W;
    const at = (min) => top + min * step;
    d.raw(`<path data-deco="1" d="M${f1(0.62 * W)} ${f1(at(0))}V${f1(at(p.period_end))}M${f1(0.6 * W)} ${f1(at(0))}h${f1(0.04 * W)}M${f1(0.6 * W)} ${f1(at(p.period_end))}h${f1(0.12 * W)}" stroke="${d.pal.ink}" stroke-width="${f1(2.2 * s)}"/>`);
    d.rect(0.53 * W, at(p.period_end * 0.33) - 0.012 * H, 0.18 * W, 0.06 * H, "sheet");
    block(d, "period", "mono", 0.535 * W, at(p.period_end * 0.33) + 0.01 * H, 0.0165 * H, 0.17 * W, { role: "ink", lineHeight: 1.2 });
    for (let i = 1; i <= p.events; i += 1) {
      const min = p.period_end + 5 + ((i - 1) * (minutes - 8 - p.period_end - 5)) / Math.max(1, p.events - 1);
      block(d, `event_${i}`, "mono", ax, at(min), 0.0165 * H, 0.36 * W, { role: "ink", lineHeight: 1.22 });
    }
    // the boxed checklist with unsigned ballpoint ticks
    const cx0 = 0.82 * W; const cy0 = at(p.period_end) - 0.17 * H;
    put(d, "box_title", "mono", cx0, cy0 - 0.012 * H, 0.0165 * H, { role: "ink" });
    frame(d, cx0 - 0.008 * W, cy0, 0.17 * W, 0.17 * H, "ink", 2.2 * s);
    for (let i = 1; i <= 6; i += 1) {
      fitLine(d, `box_line_${i}`, "mono", cx0, cy0 + 0.025 * H + (i - 1) * 0.025 * H, 0.0155 * H, 0.155 * W, { role: "ink" });
      if (p.annotations) d.raw(`<path data-deco="1" d="M${f1(cx0 - 0.045 * W)} ${f1(cy0 + 0.018 * H + (i - 1) * 0.025 * H)}l${f1(0.01 * W)} ${f1(0.008 * H)}l${f1(0.022 * W)} ${f1(-0.02 * H)}" stroke="${d.pal.ballpoint}" stroke-width="${f1(2.4 * s)}" fill="none" stroke-linecap="round"/>`);
    }
    if (p.annotations) {
      const nx = 0.5 * W; const ny = at(p.period_end) - 0.045 * H;
      put(d, "note", "hand", nx, ny, 0.032 * H, { role: "ballpoint", rotate: [-14, nx, ny] });
      d.raw(`<path data-deco="1" d="M${f1(nx - 0.06 * W)} ${f1(ny + 0.02 * H)}L${f1(nx + 0.14 * W)} ${f1(ny - 0.035 * H)}" stroke="${d.pal.ballpoint}" stroke-width="${f1(2 * s)}"/>`);
      put(d, "margin_note", "hand", 0.07 * W, 0.2 * H, 0.03 * H, { role: "ballpoint" });
    }
    // the side note in a bracket, bottom left
    for (let i = 1; i <= 3; i += 1) put(d, `side_${i}`, "mono", 0.085 * W, at(minutes - 10) + (i - 1) * 0.021 * H, 0.0155 * H, { role: "ink" });
    d.raw(`<path data-deco="1" d="M${f1(0.08 * W)} ${f1(at(minutes - 10) + 0.006 * H)}V${f1(at(minutes - 10) + 0.05 * H)}M${f1(0.08 * W)} ${f1(at(minutes - 10) + 0.006 * H)}h${f1(0.16 * W)}" stroke="${d.pal.ink}" stroke-width="${f1(2 * s)}" fill="none"/>`);
    // the edition table
    const tx = 0.08 * W; const ty = 0.865 * H; const tw = 0.84 * W; const rh = 0.028 * H;
    const cols = [0, 0.16, 0.33, 0.53, 0.7, 0.86, 1];
    frame(d, tx, ty, tw, rh * 2, "ink", 3 * s);
    rule(d, tx, ty + rh, tw, "ink", 2 * s);
    for (let i = 1; i < 6; i += 1) d.raw(`<path data-deco="1" d="M${f1(tx + cols[i] * tw)} ${f1(ty)}v${f1(rh * 2)}" stroke="${d.pal.ink}" stroke-width="${f1(2 * s)}"/>`);
    const heads = ["MISSION", "EDITION", "DATE", "TIME", "DAY/REV", "PAGE"];
    heads.forEach((h, i) => {
      const cx = tx + ((cols[i] + cols[i + 1]) / 2) * tw;
      put(d, `col_${i + 1}`, "geo", cx, ty + rh * 0.74, 0.0145 * H, { role: "ink", anchor: "middle", tracking: 60, content: h });
      fitLine(d, `cell_${i + 1}`, "mono", cx, ty + rh * 1.72, 0.0155 * H, (cols[i + 1] - cols[i]) * tw - 0.012 * W, { role: "ink", anchor: "middle" });
    });
    put(d, "form", "mono", tx, ty + rh * 2 + 0.018 * H, 0.012 * H, { role: "ink" });
    put(d, "branch", "geo", tx + tw / 2, ty + rh * 2 + 0.018 * H, 0.012 * H, { role: "ink", anchor: "middle", tracking: 60 });
    d.zone("sheet", "safe", [0.04 * W, 0.05 * H, 0.92 * W, 0.92 * H], { slots: ["header", "event_1", "cell_1"] });
  },

  // ---- B2 checklist page: 1700 x 2200 -------------------------------------------------------------
  "doc.atomic-checklist"(d) {
    const { W, H, p } = d; const s = W / 1700;
    ground(d, "sheet");
    if (p.holes) holes(d, GRAMMAR.holes, 0.028 * H, 0.013 * W, "punch", 0.1 * W, 0.9 * W);
    fitLine(d, "title", "geo", W / 2, 0.085 * H, 0.026 * H, 0.8 * W, { role: "ink", anchor: "middle", tracking: 50 });
    put(d, "card_id", "mono", 0.08 * W, 0.12 * H, 0.0155 * H, { role: "ink" });
    put(d, "phase", "mono", 0.92 * W, 0.12 * H, 0.0155 * H, { role: "ink", anchor: "end" });
    rule(d, 0.08 * W, 0.132 * H, 0.84 * W, "ink", 3 * s);
    // rows: a section bar, numbered steps with a dotted leader, a value and a checkbox
    let y = 0.17 * H; const rh = 0.031 * H; const x0 = 0.08 * W; const x1 = 0.92 * W;
    let step = 0;
    for (let sct = 1; sct <= p.sections; sct += 1) {
      d.rect(x0, y - 0.022 * H, x1 - x0, 0.03 * H, "ink");
      put(d, `section_${sct}`, "monob", x0 + 0.01 * W, y, 0.0165 * H, { role: "sheet" });
      y += rh;
      for (let i = 1; i <= p.rows; i += 1) {
        step += 1;
        put(d, `n_${step}`, "mono", x0 + 0.04 * W, y, 0.0165 * H, { role: "ink", anchor: "end", content: String(step).padStart(2, "0") });
        const it = put(d, `item_${step}`, "mono", x0 + 0.055 * W, y, 0.0165 * H, { role: "ink" });
        const v = put(d, `value_${step}`, "mono", x1 - 0.06 * W, y, 0.0165 * H, { role: "ink", anchor: "end" });
        d.raw(`<path data-deco="1" d="M${f1(it.x0 + it.w + 0.01 * W)} ${f1(y)}H${f1(v.x0 - 0.01 * W)}" stroke="${d.pal.ink}" stroke-width="${f1(2.4 * s)}" stroke-dasharray="${f1(1.5 * s)} ${f1(8 * s)}" stroke-linecap="round"/>`);
        frame(d, x1 - 0.035 * W, y - 0.016 * H, 0.022 * H, 0.022 * H, "ink", 2 * s);
        if (p.annotations && step <= p.checked) d.raw(`<path data-deco="1" d="M${f1(x1 - 0.034 * W)} ${f1(y - 0.006 * H)}l${f1(0.009 * W)} ${f1(0.009 * H)}l${f1(0.022 * W)} ${f1(-0.026 * H)}" stroke="${d.pal.ballpoint}" stroke-width="${f1(3 * s)}" fill="none" stroke-linecap="round"/>`);
        y += rh;
      }
      y += 0.01 * H;
    }
    // the attitude diagram: a craft (image slot or the satellite glyph), a shaded body, axis lines
    const gy = 0.715 * H; const gx = 0.5 * W;
    d.raw(`<g data-deco="1" stroke="${d.pal.ink}" stroke-width="${f1(2.2 * s)}" fill="none"><path d="M${f1(0.12 * W)} ${f1(gy + 0.06 * H)}L${f1(0.86 * W)} ${f1(gy + 0.02 * H)}"/><path d="M${f1(gx)} ${f1(gy + 0.05 * H)}V${f1(0.93 * H)}"/><path d="M${f1(gx)} ${f1(gy + 0.05 * H)}L${f1(0.3 * W)} ${f1(gy + 0.13 * H)}"/></g>`);
    const br = 0.055 * W; const bcx = 0.22 * W; const bcy = gy + 0.15 * H;
    d.raw(`<circle data-deco="1" cx="${f1(bcx)}" cy="${f1(bcy)}" r="${f1(br)}" fill="${d.pal.sheet}" stroke="${d.pal.ink}" stroke-width="${f1(2.2 * s)}"/>`);
    d.raw(`<path data-deco="1" d="M${f1(bcx - br * 0.7)} ${f1(bcy - br * 0.7)}A${f1(br)} ${f1(br)} 0 0 1 ${f1(bcx + br * 0.7)} ${f1(bcy + br * 0.7)}Z" fill="${dotScreen(d, "ink", 6 * s, 0.3)}" stroke="${d.pal.ink}" stroke-width="${f1(2 * s)}"/>`);
    if (!slotOr(d, "craft", [gx - 0.12 * W, gy - 0.02 * H, 0.24 * W, 0.12 * H], p.craft, "LINE-ART CRAFT")) satellite(d, gx, gy + 0.045 * H, 0.025 * W, 0, "ink");
    put(d, "axis_1", "mono", gx + 0.01 * W, 0.925 * H, 0.0145 * H, { role: "ink" });
    put(d, "axis_2", "mono", 0.86 * W, gy + 0.05 * H, 0.0145 * H, { role: "ink", anchor: "end" });
    put(d, "axis_3", "mono", 0.62 * W, gy - 0.01 * H, 0.0145 * H, { role: "ink" });
    // the rubber stamp
    if (p.stamp) {
      const sx = 0.68 * W; const sy = 0.78 * H; const rot = -7;
      const T = `rotate(${rot} ${f1(sx + 0.11 * W)} ${f1(sy + 0.04 * H)})`; const R = [rot, sx + 0.11 * W, sy + 0.04 * H];
      d.raw(`<g data-deco="1" transform="${T}" fill="none" stroke="${d.pal.stamp}"><rect x="${f1(sx)}" y="${f1(sy)}" width="${f1(0.22 * W)}" height="${f1(0.085 * H)}" stroke-width="${f1(6 * s)}"/><rect x="${f1(sx + 8 * s)}" y="${f1(sy + 8 * s)}" width="${f1(0.22 * W - 16 * s)}" height="${f1(0.085 * H - 16 * s)}" stroke-width="${f1(2 * s)}"/></g>`);
      put(d, "stamp", "geo", sx + 0.11 * W, sy + 0.045 * H, 0.03 * H, { role: "stamp", anchor: "middle", tracking: 80, rotate: R });
      put(d, "stamp_date", "monob", sx + 0.11 * W, sy + 0.072 * H, 0.0165 * H, { role: "stamp", anchor: "middle", rotate: R });
    }
    put(d, "page_id", "mono", 0.08 * W, 0.965 * H, 0.0135 * H, { role: "ink" });
    put(d, "revision", "mono", 0.92 * W, 0.965 * H, 0.0135 * H, { role: "ink", anchor: "end" });
    d.zone("sheet", "safe", [0.04 * W, 0.05 * H, 0.92 * W, 0.93 * H], { slots: ["title", "item_1", "page_id"] });
  },

  // ---- B3 orbital-diagram plate (dark): 1600 x 1800 -----------------------------------------------
  "poster.atomic-orbit-plate"(d) {
    const { W, H, p } = d; const s = W / 1600; const lw = 2.4 * s;
    d.rect(0, 0, W, H, "night");
    if (p.grid) {
      let g = ""; const c = 0.0625 * W;
      for (let x = c; x < W; x += c) g += `M${f1(x)} 0V${f1(H)}`;
      for (let y = c; y < H; y += c) g += `M0 ${f1(y)}H${f1(W)}`;
      d.raw(`<path data-deco="1" d="${g}" stroke="${d.pal.grid}" stroke-width="${f1(1.4 * s)}"/>`);
    }
    const C = d.pal.chalk;
    // the celestial sphere: a circle, three tilted rings, an axis
    const sx = 0.25 * W; const sy = 0.22 * H; const sr = 0.17 * W;
    d.raw(`<g data-deco="1" fill="none" stroke="${C}" stroke-width="${f1(lw)}"><circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(sr)}" stroke-width="${f1(lw * 2.2)}" stroke-dasharray="${f1(10 * s)} ${f1(4 * s)}"/><circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(sr - 9 * s)}"/>`
      + [[-12, 0.3], [18, 0.22], [-30, 0.5]].map(([a, k]) => `<ellipse cx="${f1(sx)}" cy="${f1(sy)}" rx="${f1(sr)}" ry="${f1(sr * k)}" transform="rotate(${a} ${f1(sx)} ${f1(sy)})"/>`).join("")
      + `<path d="M${f1(sx - 0.05 * W)} ${f1(sy + sr + 0.03 * H)}L${f1(sx + 0.06 * W)} ${f1(sy - sr - 0.03 * H)}"/><ellipse cx="${f1(sx + 0.06 * W)}" cy="${f1(sy - sr - 0.035 * H)}" rx="${f1(0.05 * W)}" ry="${f1(0.008 * H)}"/></g>`);
    put(d, "label_sphere", "hand", sx - 0.05 * W, sy + 0.005 * H, 0.024 * H, { role: "chalk", rotate: [12, sx - 0.05 * W, sy] });
    put(d, "label_top", "hand", sx - 0.02 * W, 0.03 * H, 0.022 * H, { role: "chalk" });
    // the primary body, cut by the lower left edge, a hatched rim
    const bx = 0.38 * W; const by = 1.0 * H; const br = 0.46 * W;
    d.raw(`<g data-deco="1" fill="none" stroke="${C}"><circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(br)}" stroke-width="${f1(lw * 3)}" stroke-dasharray="${f1(16 * s)} ${f1(6 * s)}"/><circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(br - 14 * s)}" stroke-width="${f1(lw)}"/></g>`);
    // trajectories: three ellipses through the body, a dotted escape line, a small moon
    const ex = 0.62 * W; const ey = 0.6 * H;
    for (const [rx, ry, a, dash] of [[0.42, 0.13, -38, null], [0.36, 0.09, -52, `${f1(3 * s)} ${f1(9 * s)}`], [0.5, 0.2, -30, `${f1(14 * s)} ${f1(8 * s)}`]]) orbit(d, ex, ey, rx * W, ry * W, a, "chalk", lw, { dash });
    d.raw(`<path data-deco="1" d="M${f1(0.6 * W)} ${f1(0.02 * H)}C${f1(0.7 * W)} ${f1(0.3 * H)} ${f1(0.76 * W)} ${f1(0.55 * H)} ${f1(0.98 * W)} ${f1(0.98 * H)}" fill="none" stroke="${C}" stroke-width="${f1(lw * 2.4)}" stroke-dasharray="${f1(1 * s)} ${f1(14 * s)}" stroke-linecap="round"/>`);
    d.raw(`<g data-deco="1" fill="none" stroke="${C}" stroke-width="${f1(lw)}"><circle cx="${f1(0.84 * W)} " cy="${f1(0.66 * H)}" r="${f1(0.05 * W)}"/><path d="M${f1(0.79 * W)} ${f1(0.66 * H)}H${f1(0.89 * W)}M${f1(0.84 * W)} ${f1(0.61 * H)}V${f1(0.71 * H)}"/></g>`);
    // little stars
    const r = rng(p.star_seed);
    let st = ""; for (let i = 0; i < 18; i += 1) { const x = r() * W; const y = r() * H; const k = (4 + r() * 6) * s; st += `M${f1(x - k)} ${f1(y)}H${f1(x + k)}M${f1(x)} ${f1(y - k)}V${f1(y + k)}`; }
    d.raw(`<path data-deco="1" d="${st}" stroke="${C}" stroke-width="${f1(lw * 0.8)}"/>`);
    // the formula, the arrowed label, the distance tag, the plate title
    const fx = 0.52 * W; const fy = 0.36 * H;
    put(d, "formula", "mono", fx, fy, 0.03 * H, { role: "chalk" });
    put(d, "label_arrow", "hand", 0.33 * W, fy + 0.06 * H, 0.026 * H, { role: "chalk", rotate: [6, 0.33 * W, fy + 0.06 * H] });
    d.raw(`<path data-deco="1" d="M${f1(0.5 * W)} ${f1(fy + 0.058 * H)}L${f1(0.55 * W)} ${f1(fy + 0.04 * H)}H${f1(0.7 * W)}l${f1(-14 * s)} ${f1(-8 * s)}M${f1(0.7 * W)} ${f1(fy + 0.04 * H)}l${f1(-14 * s)} ${f1(8 * s)}" fill="none" stroke="${C}" stroke-width="${f1(lw)}"/>`);
    const tx = 0.66 * W; const ty = 0.82 * H; const T = `rotate(-62 ${f1(tx)} ${f1(ty)})`;
    d.raw(`<rect data-deco="1" x="${f1(tx - 0.11 * W)}" y="${f1(ty - 0.03 * H)}" width="${f1(0.22 * W)}" height="${f1(0.045 * H)}" fill="none" stroke="${C}" stroke-width="${f1(lw)}" transform="${T}"/>`);
    put(d, "distance", "mono", tx, ty, 0.021 * H, { role: "chalk", anchor: "middle", rotate: [-62, tx, ty] });
    d.rect(0.56 * W, 0.915 * H, 0.42 * W, 0.07 * H, "night");
    frame(d, 0.56 * W, 0.915 * H, 0.42 * W, 0.07 * H, "chalk", lw);
    fitLine(d, "plate", "geo", 0.77 * W, 0.945 * H, 0.022 * H, 0.38 * W, { role: "chalk", anchor: "middle", tracking: 140 });
    fitLine(d, "caption", "mono", 0.77 * W, 0.972 * H, 0.016 * H, 0.38 * W, { role: "chalk", anchor: "middle" });
    d.zone("plate", "safe", [0.02 * W, 0.02 * H, 0.96 * W, 0.97 * H], { slots: ["plate", "formula", "caption"] });
  },

  // ---- B4 credential / ID card: 1500 x 620 --------------------------------------------------------
  "card.atomic-credential"(d) {
    const { W, H, p } = d; const s = W / 1500;
    ground(d, "card");
    if (p.hole) d.raw(`<rect data-deco="1" x="${f1(0.025 * W)}" y="${f1(0.42 * H)}" width="${f1(0.012 * W)}" height="${f1(0.16 * H)}" rx="${f1(0.006 * W)}" fill="${d.pal.punch}"/>`);
    const m = 0.07 * W;
    const t = fitLine(d, "mission", "display", m, 0.36 * H, 0.27 * H, 0.42 * W, { role: "ink", tracking: 10 });
    mark(d, "emblem", 0.545 * W, 0.06 * H, 0.17 * W, 0.17 * W * (W / H) * (H / W), "EMBLEM 1:1");
    put(d, "number", "display", W - m, 0.36 * H, 0.27 * H, { role: "ink", anchor: "end" });
    const lines = [["name", "name_label", 0.62], ["org", "org_label", 0.86]];
    for (const [v, l, y] of lines) {
      fitLine(d, v, "mono", m + 0.035 * W, y * H - 0.035 * H, 0.085 * H, 0.62 * W, { role: "ink", tracking: 120 });
      rule(d, m, y * H - 0.022 * H, 0.75 * W, "ink", 3 * s);
      put(d, l, "geo", m, y * H + 0.03 * H, 0.04 * H, { role: "ink", tracking: 60 });
    }
    if (p.stamp) {
      const sx = 0.86 * W; const sy = 0.72 * H; const T = `rotate(-12 ${f1(sx)} ${f1(sy)})`; const R = [-12, sx, sy];
      d.raw(`<rect data-deco="1" x="${f1(sx - 0.085 * W)}" y="${f1(sy - 0.1 * H)}" width="${f1(0.17 * W)}" height="${f1(0.15 * H)}" fill="none" stroke="${d.pal.stamp}" stroke-width="${f1(5 * s)}" transform="${T}"/>`);
      put(d, "stamp", "geo", sx, sy + 0.012 * H, 0.07 * H, { role: "stamp", anchor: "middle", tracking: 120, rotate: R });
    }
    d.zone("card", "safe", [0.04 * W, 0.04 * H, 0.92 * W, 0.92 * H], { slots: ["mission", "number", "name", "org"] });
    void t;
  },

  // ---- A6 orbit / solar-system print: 1400 x 2000 (0.7) ------------------------------------------
  "poster.atomic-solar-print"(d) {
    const { W, H, p } = d; const s = W / 1400;
    ground(d, p.ground);
    const cx = 0.5 * W; const cy = 0.5 * H; const lw = 2 * s;
    const n = p.rings; const step = GRAMMAR.orbitStep * W * (10 / n);
    let rings = "";
    for (let i = 1; i <= n; i += 1) rings += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(0.06 * W + i * step)}"/>`;
    d.raw(`<g data-deco="1" fill="none" stroke="${d.pal.line}" stroke-width="${f1(lw)}">${rings}</g>`);
    disc(d, cx, cy, 0.05 * W, "line");
    // planets on the rings; leaders run to the margins, labels sit on the leaders
    const r = rng(p.seed);
    const m = 0.06 * W;
    // labels alternate sides; on each side they are spread evenly between 0.24 and 0.76 of H, and the planet
    // sits where its ring meets the label's row (the leader runs from it to the margin, crossing outer rings)
    const per = { left: [], right: [] };
    for (let i = 1; i <= p.labels; i += 1) per[i % 2 === 0 ? "right" : "left"].push(i);
    const rmax = 0.06 * W + n * step;
    for (const side of ["left", "right"]) {
      const list = per[side];
      list.forEach((i, k) => {
        const ring = Math.round(((i - 1) / Math.max(1, p.labels - 1)) * (n - 1)) + 1;
        const rad = 0.06 * W + ring * step;
        const t = list.length > 1 ? k / (list.length - 1) : 0.5;
        const jitter = (r() - 0.5) * 0.02 * H;
        let py = cy - rmax * 1.25 + t * rmax * 2.5 + jitter;
        py = Math.max(cy - rad * 0.92, Math.min(cy + rad * 0.92, py));
        const dx = Math.sqrt(Math.max(0, rad * rad - (py - cy) ** 2));
        const right = side === "right";
        const px = cx + (right ? dx : -dx);
        const pr = (6 + r() * 12) * s;
        disc(d, px, py, pr, "line");
        if (r() > 0.6) orbit(d, px, py, pr * 2.1, pr * 0.6, -18, "line", lw);
        const ex = right ? W - m : m;
        d.raw(`<path data-deco="1" d="M${f1(px + (right ? pr + 6 * s : -pr - 6 * s))} ${f1(py)}H${f1(ex)}" stroke="${d.pal.line}" stroke-width="${f1(lw * 0.8)}"/>`);
        put(d, `label_${i}`, "geo", ex, py - 0.008 * H, 0.012 * H, { role: "line", anchor: right ? "end" : "start", tracking: 120 });
      });
    }
    fitLine(d, "title", "geo", cx, 0.045 * H, 0.016 * H, 0.7 * W, { role: "line", anchor: "middle", tracking: 160 });
    fitLine(d, "edition", "label", cx, 0.965 * H, 0.0135 * H, 0.6 * W, { role: "line", anchor: "middle", tracking: 120 });
    d.zone("print", "safe", [0.03 * W, 0.02 * H, 0.94 * W, 0.96 * H], { slots: ["title", "edition", "label_1"] });
  },
};

module.exports = { LAYOUTS, GRAMMAR, FACES, face, sweptRocket, classicRocket, starburst, boomerang, satellite };
