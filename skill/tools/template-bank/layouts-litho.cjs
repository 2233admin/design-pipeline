"use strict";

// Layouts of the cassandre-litho style pack (styles/cassandre-litho/style.json) and the Steam
// capsule set: one key design re-composed for every Steam store and library size (not cropped).
// Grammar: a Cassandre-style lithograph poster - a dominant vermilion field, a monumental object
// seen from below and bleeding off the frame, a flat beam of unprinted paper that carries the
// title, halftone dots eating the beam's far end, the ink plate printed slightly out of register.
// Per-size composition (tower foot and lantern, beam angle and spread, title distance along the
// beam, title size and tilt) is the steam-capsules case's v2 final, one table row per size in the
// size's own pixels and scaled to the canvas. The monument is drawn; `monument` takes your own.

const lettering = require("./lettering.cjs");
const { f1, rbox, rng } = require("./layout-kit.cjs");

const LATIN = { width: 0.78, stroke: 0.2, chamfer: 0, chamfer_mode: "none", stencil: 0.08, tracking: 180 };

// One row per Steam size, in that size's pixels (steam-capsules work/final2.cjs, round 2).
const SIZES = {
  "steam.header-capsule": { w: 920, h: 430, hz: 0.84, tower: { bx: 150, by: 470, bw: 190, lx: 112, ly: 70, tw: 64 }, beam: { ang: 4, spread: 15, len: 1.15 }, rays: [[-28, 3], [-58, 2]], boats: [[0.82, 0.9, 0.6]], dotsAt: 0.7, glow: 0.9, waves: 30, logo: { at: 0.45, size: 112, rot: 4, mode: "row" } },
  "steam.small-capsule": { w: 462, h: 174, hz: 0.93, tower: { bx: 40, by: 200, bw: 66, lx: 30, ly: 26, tw: 26 }, beam: { ang: 6, spread: 30, len: 1.25 }, rays: [], boats: [], dotsAt: 0.85, glow: 0.6, waves: 6, logo: { at: 0.44, size: 92, rot: 3, mode: "row", enRatio: 0.28, dy: 7 } },
  "steam.main-capsule": { w: 1232, h: 706, hz: 0.82, tower: { bx: 210, by: 780, bw: 300, lx: 150, ly: 112, tw: 96 }, beam: { ang: 8, spread: 14, len: 1.1 }, rays: [[-24, 3], [-52, 2], [38, 1.5]], boats: [[0.7, 0.88, 0.9], [0.86, 0.86, 0.6]], dotsAt: 0.7, glow: 0.9, waves: 30, logo: { at: 0.42, size: 150, rot: 8, mode: "row" } },
  "steam.vertical-capsule": { w: 748, h: 896, hz: 0.88, tower: { bx: 170, by: 1000, bw: 260, lx: 110, ly: 470, tw: 84 }, beam: { ang: -36, spread: 24, len: 1.05 }, rays: [[-82, 3], [6, 2]], boats: [[0.8, 0.94, 0.8]], dotsAt: 0.8, glow: 0.9, waves: 30, logo: { at: 0.47, size: 172, rot: -10, mode: "stack" } },
  "steam.library-capsule": { w: 600, h: 900, hz: 0.89, tower: { bx: 130, by: 1000, bw: 220, lx: 86, ly: 520, tw: 72 }, beam: { ang: -42, spread: 25, len: 1.0 }, rays: [[-86, 3], [2, 2]], boats: [[0.8, 0.95, 0.7]], dotsAt: 0.82, glow: 0.9, waves: 30, logo: { at: 0.46, size: 140, rot: -12, mode: "stack" } },
  "steam.event-cover": { w: 800, h: 450, hz: 0.64, tower: { bx: 700, by: 500, bw: 170, lx: 722, ly: 112, tw: 56 }, beam: { ang: 179, spread: 13, len: 1.05 }, rays: [[220, 3]], boats: [], dotsAt: 0.75, glow: 0.9, waves: 10, logo: { at: 0.5, size: 84, rot: -1, mode: "row" } },
  "steam.event-header": { w: 1920, h: 622, hz: 0.86, tower: { bx: 520, by: 720, bw: 260, lx: 470, ly: 110, tw: 84 }, beam: { ang: 5, spread: 9, len: 0.75 }, rays: [[-25, 2], [200, 4]], boats: [[0.55, 0.92, 1]], dotsAt: 0.65, glow: 0.9, waves: 30, logo: { at: 0.4, size: 104, rot: 5, mode: "row" } },
};

const rad = (deg) => (deg * Math.PI) / 180;

// Beam wedge from the lantern: start half-width w0, length len, half-spread in degrees.
function wedge(lx, ly, ang, len, spread, w0, from = 0) {
  const a = rad(ang); const sp = rad(spread); const nx = -Math.sin(a); const ny = Math.cos(a);
  const at = (t, side) => [lx + Math.cos(a + side * sp) * len * t + side * nx * w0 * (1 - t), ly + Math.sin(a + side * sp) * len * t + side * ny * w0 * (1 - t)];
  return [at(from, -1), at(1, -1), at(1, 1), at(from, 1)];
}
const pts = (list) => list.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");

function dotPattern(d, id, period, r, role, angle = 45) {
  d.def(`<pattern id="${id}" width="${f1(period)}" height="${f1(period)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${f1(period / 2)}" cy="${f1(period / 2)}" r="${f1(r)}" fill="${d.pal[role]}"/></pattern>`);
}

// The monument: a tower seen from below, its ink plate shifted by `mis` over a rust under-plate.
function tower(d, t, k, mis) {
  const { bx, by, bw, lx, ly, tw } = t;
  const top = ly + tw * 0.9;
  const shaft = (dx = 0, dy = 0) => [[bx - bw / 2 + dx, by + dy], [bx + bw / 2 + dx, by + dy], [lx + tw * 0.42 + dx, top + dy], [lx - tw * 0.42 + dx, top + dy]];
  const at = (u) => [bx + (lx - bx) * u, by + (top - by) * u, bw + (tw * 0.84 - bw) * u];
  const head = (dx, dy, role) => {
    const out = [`<rect x="${f1(lx - tw * 0.75 + dx)}" y="${f1(top - tw * 0.12 + dy)}" width="${f1(tw * 1.5)}" height="${f1(tw * 0.14)}" fill="${d.pal[role]}"/>`];
    for (let i = 0; i < 9; i += 1) out.push(`<rect x="${f1(lx - tw * 0.72 + i * tw * 0.18 + dx)}" y="${f1(top - tw * 0.38 + dy)}" width="${f1(tw * 0.035)}" height="${f1(tw * 0.27)}" fill="${d.pal[role]}"/>`);
    out.push(`<rect x="${f1(lx - tw * 0.75 + dx)}" y="${f1(top - tw * 0.4 + dy)}" width="${f1(tw * 1.5)}" height="${f1(tw * 0.04)}" fill="${d.pal[role]}"/>`);
    out.push(`<path d="M${f1(lx - tw * 0.5 + dx)} ${f1(ly - tw * 0.5 + dy)} A${f1(tw * 0.5)} ${f1(tw * 0.42)} 0 0 1 ${f1(lx + tw * 0.5 + dx)} ${f1(ly - tw * 0.5 + dy)} Z" fill="${d.pal[role]}"/>`);
    out.push(`<rect x="${f1(lx - tw * 0.03 + dx)}" y="${f1(ly - tw * 1.12 + dy)}" width="${f1(tw * 0.06)}" height="${f1(tw * 0.25)}" fill="${d.pal[role]}"/>`);
    return out.join("");
  };
  const parts = [`<polygon points="${pts(shaft(mis, mis * 0.6))}" fill="${d.pal.rust}"/>`, head(mis, mis * 0.6, "rust"), `<polygon points="${pts(shaft())}" fill="${d.pal.ink}"/>`];
  for (const [a, b] of [[0.18, 0.3], [0.5, 0.58], [0.74, 0.79]]) {
    const [x0, y0, w0] = at(a); const [x1, y1, w1] = at(b);
    parts.push(`<polygon points="${pts([[x0 - w0 / 2, y0], [x0 + w0 / 2, y0], [x1 + w1 / 2, y1], [x1 - w1 / 2, y1]])}" fill="${d.pal.paper}"/>`);
  }
  const [sx0, sy0, sw0] = at(0); const [sx1, sy1, sw1] = at(1);
  parts.push(`<polygon points="${pts([[sx0 + sw0 * 0.18, sy0], [sx0 + sw0 / 2, sy0], [sx1 + sw1 / 2, sy1], [sx1 + sw1 * 0.18, sy1]])}" fill="${d.pal.rust}" opacity="0.55"/>`);
  parts.push(head(0, 0, "ink"));
  parts.push(`<rect x="${f1(lx - tw * 0.45)}" y="${f1(ly - tw * 0.5)}" width="${f1(tw * 0.9)}" height="${f1(tw * 0.95)}" fill="${d.pal.paper}"/>`);
  for (const f of [-0.22, 0.05, 0.3]) parts.push(`<rect x="${f1(lx + tw * f - tw * 0.02)}" y="${f1(ly - tw * 0.5)}" width="${f1(tw * 0.04)}" height="${f1(tw * 0.95)}" fill="${d.pal.ink}"/>`);
  d.raw(`<g data-deco="1">${parts.join("")}</g>`);
}

// Title group: the CJK title in ink with a rust out-of-register shadow and three beam slits, the
// Latin name in code-drawn wide lettering beside it (row) or under it (stack), tilted with the beam.
function title(d, x, y, size, rot, mode, enRatio, k) {
  const er = enRatio || (mode === "stack" ? 0.26 : 0.34);
  const enH = size * er * 0.72;
  const { text: latin } = d.value("title_latin");
  const enW = lettering.setText(String(latin), 0, 0, enH, LATIN).width;
  const { text: cjk } = d.value("title");
  const zhW = Math.max(1, [...String(cjk)].length) * size * 0.98;
  const gap = mode === "stack" ? size * 0.12 : size * 0.16;
  const gw = mode === "stack" ? Math.max(zhW, enW) : zhW + gap + enW;
  const gh = mode === "stack" ? size + gap + enH : Math.max(size, enH);
  const gx = x - gw / 2; const gy = y - gh / 2;
  const zx = mode === "stack" ? x - zhW / 2 : gx; const zy = gy;
  const ex = mode === "stack" ? x - enW / 2 : gx + zhW + gap; const ey = mode === "stack" ? gy + size + gap : y - enH / 2;
  const sh = [size / 60, size / 90];
  d.raw(`<g transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})">`);
  const zbox = rbox([zx - size * 0.06, zy - size * 0.04, zhW + size * 0.16, size * 1.12], rot, [x, y], 2 * k);
  d.def(`<filter id="plate-shadow" x="-10%" y="-10%" width="130%" height="130%" color-interpolation-filters="sRGB"><feOffset in="SourceAlpha" dx="${f1(sh[0])}" dy="${f1(sh[1])}" result="o"/><feFlood flood-color="${d.pal.rust}"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  d.text("title", zx, zy + 0.88 * size, size, { role: "ink", family: "display", tracking: -20, filter: "plate-shadow", box: zbox });
  [0.3, 0.52, 0.74].forEach((f, i) => d.raw(`<rect data-deco="1" x="${f1(zx - zhW * 0.04)}" y="${f1(zy + f * size)}" width="${f1(zhW * 1.08)}" height="${f1(Math.max(1, size * (i === 1 ? 0.035 : 0.022)))}" fill="${d.pal.paper}"/>`));
  d.lettering("title_latin", ex, ey, enH, { ...LATIN, role: "ink", trim: false, shadow: { dx: sh[0], dy: sh[1], role: "rust" }, box: rbox([ex - enH * 0.2, ey - enH * 0.2, enW + enH * 0.5, enH * 1.4], rot, [x, y], 2 * k) });
  d.raw("</g>");
}

function capsule(d, id) {
  const spec = SIZES[id];
  const { W, H, p } = d;
  const k = W / spec.w;
  const t = Object.fromEntries(Object.entries(spec.tower).map(([key, v]) => [key, v * k]));
  const hz = H * spec.hz;
  const b = spec.beam; const len = b.len * Math.max(W, H);
  d.rect(0, 0, W, H, "field");
  // halftone glow around the lantern: three rings of dots, larger near the light
  const R = Math.max(W, H) * spec.glow * 0.5;
  [[1, 0.18], [0.66, 0.28], [0.36, 0.38]].forEach(([f, r], i) => {
    dotPattern(d, `glow${i}`, 18 * k, 18 * k * r, "field_hi");
    d.raw(`<circle data-deco="1" cx="${f1(t.lx)}" cy="${f1(t.ly)}" r="${f1(R * f)}" fill="url(#glow${i})"/>`);
  });
  if (p.rays) for (const [ra, rs] of spec.rays) d.raw(`<polygon data-deco="1" points="${pts(wedge(t.lx, t.ly, ra, len, rs, t.tw * 0.2))}" fill="${d.pal.field_hi}"/>`);
  if (hz < H) {
    d.rect(0, hz, W, H - hz, "sea");
    const r = rng(5);
    for (let i = 0; i < spec.waves; i += 1) {
      const yy = hz + 4 * k + ((i / 30) ** 1.5) * (H - hz);
      d.raw(`<rect data-deco="1" x="${f1(r() * W)}" y="${f1(yy)}" width="${f1(W * (0.03 + r() * 0.1))}" height="${f1(Math.max(1, H * 0.003))}" fill="${d.pal.paper}" opacity="0.55"/>`);
    }
  }
  // the beam: flat paper, its far end eaten by vermilion dots in three steps
  d.poly(wedge(t.lx, t.ly, b.ang, len, b.spread, t.tw * 0.35), "paper");
  const start = p.dots_at ?? spec.dotsAt;
  const steps = 3;
  for (let i = 0; i < steps; i += 1) {
    const from = start + ((1 - start) * i) / steps;
    dotPattern(d, `eat${i}`, 18 * k, 18 * k * (0.2 + 0.12 * i), "field", 45);
    const outer = wedge(t.lx, t.ly, b.ang, len, b.spread, t.tw * 0.35, from);
    d.raw(`<polygon data-deco="1" points="${pts(outer)}" fill="url(#eat${i})"/>`);
  }
  if (p.boats) for (const [bx, by, sc] of spec.boats) d.raw(`<g data-deco="1" transform="translate(${f1(W * bx)} ${f1(H * by)}) scale(${(sc * k).toFixed(3)})"><polygon points="-16,0 16,0 10,7 -10,7" fill="${d.pal.ink}"/><polygon points="0,-1 0,-28 13,-2" fill="${d.pal.paper}"/><polygon points="-2,-2 -2,-20 -11,-2" fill="${d.pal.ink}"/></g>`);
  d.image("monument", t.lx - t.bw / 2, t.ly - t.tw * 1.2, t.bw, 0);
  if (!d.values.monument) tower(d, t, k, p.misregister * k);
  // title on the beam axis at a fraction of the beam's length from the lantern
  const L = spec.logo;
  if (L) {
    const a = rad(b.ang); const dist = len * (p.title_at ?? L.at);
    const x = t.lx + Math.cos(a) * dist; const y = t.ly + Math.sin(a) * dist + (L.dy || 0) * k;
    title(d, x, y, L.size * k * p.title_scale, L.rot ?? b.ang, L.mode, L.enRatio, k);
  }
  return { k, hz };
}

const LAYOUTS = Object.fromEntries(Object.keys(SIZES).map((id) => [id, (d) => {
  const { k } = capsule(d, id);
  if (id === "steam.event-cover") {
    d.text("event_kicker", 40 * k, 324 * k, 22 * k, { role: "paper", family: "label", tracking: 140, box: [36 * k, 298 * k, 440 * k, 32 * k] });
    d.text("event_title", 40 * k, 370 * k, 40 * k, { role: "paper", family: "display", box: [36 * k, 330 * k, 560 * k, 52 * k] });
    d.text("event_line", 40 * k, 405 * k, 20 * k, { role: "paper", family: "body", box: [36 * k, 386 * k, 560 * k, 28 * k] });
  }
  if (id === "steam.event-header") d.text("event_line", 1180 * k, 582 * k, 30 * k, { role: "paper", family: "label", tracking: 60, box: [1176 * k, 552 * k, 720 * k, 40 * k] });
  d.zone("store-crop", "safe", [0, 0, d.W, d.H], { slots: ["title", "title_latin"] });
}]));

module.exports = { LAYOUTS, SIZES };
