"use strict";

// Layouts of the shinbo style pack (styles/shinbo/style.json): title cards, a poster, two UI
// screens and a title-card cut storyboard. Geometry is in fractions of W and H, taken from the
// Nocturne Corridor experiment's final round (the check fixtures in tests/fixtures/style-pack-shinbo).
// Architecture and cut-paper objects are drawn here as procedural material; photographs and
// engravings come in through collage image slots, which are drawn only when filled.

const measure = require("./measure.cjs");

const f1 = (v) => v.toFixed(1);
const pts = (list) => list.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
const lerp = (a, b, t) => a + (b - a) * t;
const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

// Ground tone of a card: role names for ground, main ink, mark (red) and small text.
function tone(d) {
  const tones = d.style.layout.groundTones;
  const key = d.p.ground;
  if (!tones[key]) throw Object.assign(new Error(`ground ${key} is not a ground tone of style ${d.style.id}`), { code: "TEMPLATE_INVALID" });
  return tones[key];
}

const BASE = 0.88; // baseline below the top of the em box (measure.cjs ASCENT)

function cutFilter(d, id, edge, paperRole) {
  d.def(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${f1(edge)}" result="d"/><feFlood flood-color="${d.pal[paperRole]}"/><feComposite in2="d" operator="in" result="edge"/><feGaussianBlur in="d" stdDeviation="${f1(edge * 0.8)}"/><feOffset dx="${f1(edge)}" dy="${f1(edge * 1.3)}" result="o"/><feFlood flood-color="#000" flood-opacity="0.45"/><feComposite in2="o" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
}

function tonePattern(d, id, period, angle, radius, role) {
  d.def(`<pattern id="${id}" width="${f1(period)}" height="${f1(period)}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="${f1(period)}" height="${f1(period)}" fill="${d.pal.paper}"/><circle cx="${f1(period / 2)}" cy="${f1(period / 2)}" r="${f1(period * radius)}" fill="${d.pal[role]}"/></pattern>`);
}

// One-point corridor: frames shrinking toward vp, toned walls, checker floor, side doors, red end.
function corridor(d, { rect: [X, Y, Wd, Hd], vp, n, ratio, wallFill, sw }) {
  const fr = [];
  for (let k = 0; k <= n; k += 1) {
    const s = ratio ** k;
    const tl = [vp[0] + (X - vp[0]) * s, vp[1] + (Y - vp[1]) * s];
    const br = [vp[0] + (X + Wd - vp[0]) * s, vp[1] + (Y + Hd - vp[1]) * s];
    fr.push([tl, [br[0], tl[1]], br, [tl[0], br[1]]]);
  }
  const out = [];
  const doors = { 1: ["L", "black"], 2: ["R", "red"], 3: ["L", "black"], 4: ["R", "black"] };
  for (let k = 0; k < n; k += 1) {
    const a = fr[k]; const b = fr[k + 1];
    out.push(`<polygon points="${pts([a[0], a[1], b[1], b[0]])}" fill="${d.pal.paper}"/>`);
    out.push(`<polygon points="${pts([a[0], b[0], b[3], a[3]])}" fill="${wallFill}"/>`);
    out.push(`<polygon points="${pts([a[1], b[1], b[2], a[2]])}" fill="${wallFill}"/>`);
    for (let r = 0; r < 2; r += 1) for (let i = 0; i < 8; i += 1) {
      const L0 = lp(a[3], b[3], r / 2); const R0 = lp(a[2], b[2], r / 2); const L1 = lp(a[3], b[3], (r + 1) / 2); const R1 = lp(a[2], b[2], (r + 1) / 2);
      if ((i + r + k * 2) % 2) out.push(`<polygon points="${pts([lp(L0, R0, i / 8), lp(L0, R0, (i + 1) / 8), lp(L1, R1, (i + 1) / 8), lp(L1, R1, i / 8)])}" fill="${d.pal.black}"/>`);
    }
    if (doors[k]) {
      const [side, role] = doors[k];
      const [t, u] = side === "R" ? [1, 2] : [0, 3];
      const B0 = lp(a[u], b[u], 0.25); const B1 = lp(a[u], b[u], 0.7);
      const T0 = lp(B0, lp(a[t], b[t], 0.25), 0.62); const T1 = lp(B1, lp(a[t], b[t], 0.7), 0.62);
      out.push(`<polygon points="${pts([B0, T0, T1, B1])}" fill="${d.pal[role]}" stroke="${d.pal.black}" stroke-width="${f1(sw * 0.6)}"/>`);
    }
  }
  for (let k = 0; k <= n; k += 1) out.push(`<polygon points="${pts(fr[k])}" fill="none" stroke="${d.pal.black}" stroke-width="${f1(Math.max(1, sw * ratio ** (k * 0.6)))}"/>`);
  for (const c of [0, 1, 2, 3]) out.push(`<line x1="${f1(fr[0][c][0])}" y1="${f1(fr[0][c][1])}" x2="${f1(fr[n][c][0])}" y2="${f1(fr[n][c][1])}" stroke="${d.pal.black}" stroke-width="${f1(sw)}"/>`);
  out.push(`<polygon points="${pts(fr[n])}" fill="${d.pal.red}" data-role="red"/>`);
  return out.join("");
}

const SHAPES = {
  butterfly: (pal) => `<path d="M0,-6 C30,-92 118,-118 152,-66 C176,-26 118,8 0,0 Z M0,-6 C-30,-92 -118,-118 -152,-66 C-176,-26 -118,8 0,0 Z M0,2 C64,8 116,42 94,92 C74,128 22,86 0,12 Z M0,2 C-64,8 -116,42 -94,92 C-74,128 -22,86 0,12 Z" fill="${pal.black}"/><circle cx="92" cy="-62" r="20" fill="${pal.red}"/><circle cx="-92" cy="-62" r="20" fill="${pal.red}"/><circle cx="92" cy="-62" r="8" fill="${pal.paper}"/><circle cx="-92" cy="-62" r="8" fill="${pal.paper}"/><ellipse cx="0" cy="8" rx="9" ry="62" fill="${pal.black}"/>`,
  door: (pal) => `<rect x="-60" y="-140" width="120" height="280" fill="${pal.black}"/><circle cx="34" cy="10" r="9" fill="${pal.paper}"/><rect x="-44" y="-122" width="88" height="110" fill="none" stroke="${pal.paper}" stroke-width="5"/><rect x="-44" y="10" width="88" height="110" fill="none" stroke="${pal.paper}" stroke-width="5"/>`,
};

function rotated(cx, cy, w, h, deg) {
  const a = (deg * Math.PI) / 180;
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
}

// Rhythm table of a title-card cut, built from the motion grammar and the knobs.
function cutEdl(d, shots) {
  const { p } = d;
  const motion = d.style.motion;
  const B = p.black_frames; const Hd = p.hold_frames; const F = p.flash_frames; const size = p.group_size;
  const finalHold = Math.min(motion.holdFrames[1], Math.round(Hd * 1.5));
  const variants = motion.variants;
  const build = (groups) => {
    const edl = [{ kind: "black", frames: B, ground: "black" }];
    let si = 0;
    const next = () => shots[(si++) % shots.length];
    for (let g = 0; g < groups; g += 1) {
      const a = next();
      edl.push({ kind: "hold", frames: Hd, shot: a.label, ground: a.ground });
      edl.push({ kind: "black", frames: B, ground: "black" });
      const lead = next();
      const pool = shots.filter((s) => s.ground === lead.ground);
      const start = pool.indexOf(lead);
      for (let k = 0; k < size; k += 1) {
        const shot = pool[(start + Math.floor(k / p.repeat)) % pool.length];
        const rep = k % p.repeat;
        edl.push({ kind: "flash", frames: F, shot: shot.label, ground: shot.ground, ...(rep ? { variant: variants[(rep - 1) % variants.length] } : {}), group: g });
      }
      const b = next();
      edl.push({ kind: "hold", frames: Hd, shot: b.label, ground: b.ground });
    }
    const last = shots[shots.length - 1];
    edl.push({ kind: "black", frames: B, ground: "black" }, { kind: "hold", frames: finalHold, shot: last.label, ground: last.ground }, { kind: "black", frames: B, ground: "black" });
    return edl;
  };
  const total = (edl) => edl.reduce((s, x) => s + x.frames, 0) / motion.fps;
  if (p.groups > 0) return build(p.groups);
  const target = (motion.durationSec[0] + motion.durationSec[1]) / 2;
  let best = build(1);
  for (let g = 1; g <= 12; g += 1) { const edl = build(g); if (Math.abs(total(edl) - target) < Math.abs(total(best) - target)) best = edl; }
  return best;
}

const LAYOUTS = {
  "card.onechar-bleed"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    const s = p.char_size * H;
    d.text("char", p.char_x * W, p.char_top * H + BASE * s, s, { role: g.ink, family: "display", weight: 800, box: [0, 0, W, H] });
    const rs = p.ruby_size * H; const rx = p.ruby_x * W; const ry = p.ruby_top * H;
    d.text("ruby", rx, ry, rs, { role: g.mark, family: "ruby", vertical: true, tracking: 300, box: [rx - rs * 0.6, ry - rs * 0.1, rs * 1.2, 6 * rs * 1.3 + rs * 0.2] });
    const ls = 0.026 * H;
    d.text("label", 0.05 * W, 0.93 * H, ls, { role: g.small, family: "label", tracking: 400, box: [0.05 * W - d.pad, 0.93 * H - ls, 6 * ls * 1.4, ls * 1.3] });
  },

  "card.episode-number"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    d.rect(0.078 * W, 0.278 * H, 0.0083 * W, 0.444 * H, g.mark);
    const ns = 0.059 * H; const nx = 0.109 * W; const ny = 0.278 * H;
    d.text("number", nx, ny + BASE * ns, ns, { role: g.ink, family: "display", tracking: 120, box: [nx - d.pad, ny - d.pad, 5 * ns * 1.12, ns * 1.3] });
    const ts = p.title_size * H; const tx = 0.097 * W; const ty = 0.407 * H;
    d.text("title", tx, ty + BASE * ts, ts, { role: g.ink, family: "title", tracking: 20, box: [tx - d.pad, ty - d.pad, 0.87 * W, ts * 1.3] });
    const js = 0.043 * H; const jy = 0.639 * H;
    d.text("ja", 0.115 * W, jy + BASE * js, js, { role: g.ink, family: "ja", tracking: 200, box: [0.115 * W - d.pad, jy - d.pad, 0.6 * W, js * 1.3] });
    const es = 0.02 * H;
    d.text("en", 0.95 * W, 0.926 * H, es, { role: g.small, family: "num", tracking: 320, anchor: "end", box: [0.5 * W, 0.926 * H - es, 0.45 * W + d.pad, es * 1.3] });
    d.align("left", "left", tx, ["title"], 0.02);
  },

  "card.vertical-sentence"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    const s = p.size * H;
    for (let i = 0; i < 3; i += 1) {
      const cx = (p.col_x - i * p.col_gap) * W; const top = (p.top + i * p.stagger) * H;
      d.text(`line${i}`, cx, top, s, { role: g.ink, family: "title", vertical: true, tracking: 120, box: [cx - s * 0.6, top - d.pad, s * 1.2, 0.98 * H - top] });
    }
    const bx = 0.078 * W; const by = 0.139 * H; const bw = 0.0573 * W;
    d.rect(bx, by, bw, bw, g.mark);
    const ns = 0.074 * H;
    d.text("mark_char", bx + bw / 2, by + bw / 2 + 0.35 * ns, ns, { role: g.bg === "red" ? "black" : "paper", family: "display", anchor: "middle", box: [bx, by, bw, bw] });
    const ls = 0.024 * H;
    d.text("label", bx, 0.27 * H + ls, ls, { role: g.small, family: "label", tracking: 400, box: [bx - d.pad, 0.27 * H - d.pad, 4 * ls * 1.4, ls * 1.3] });
  },

  "card.bracket-quote"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    const qs = p.quote_size * H; const qy = 0.435 * H;
    const quote = String(d.value("quote").text);
    const half = measure.textWidth(quote, qs, 0.06 * qs) / 2;
    // brackets sit diagonally outside the sentence's measured ends, never on its first or last glyph
    const bs = p.bracket_size * H; const gap = 0.012 * W;
    d.text("open", 0.5 * W - half - gap, qy - 0.16 * H + BASE * bs, bs, { role: g.mark, family: "display", anchor: "end", box: [0, 0, W, H] });
    d.text("close", 0.5 * W + half + gap, qy + qs * 0.5 + BASE * bs, bs, { role: g.mark, family: "display", box: [0, 0, W, H] });
    d.text("quote", 0.5 * W, qy + BASE * qs, qs, { role: g.ink, family: "title", anchor: "middle", tracking: 60, box: [0.1 * W, qy - d.pad, 0.8 * W, qs * 1.3] });
    const ls = 0.024 * H;
    d.text("label", 0.5 * W, 0.874 * H, ls, { role: g.small, family: "label", anchor: "middle", tracking: 500, box: [0.35 * W, 0.874 * H - ls, 0.3 * W, ls * 1.3] });
  },

  "card.giant-crop"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    const s = p.word_size * H;
    d.text("word", p.word_x * W, p.word_top * H + BASE * s, s, { role: g.mark, family: "display", tracking: -40, box: [0, 0, W, H] });
    const px = 0.781 * W; const py = 0.833 * H; const pw = 0.172 * W; const ph = 0.074 * H;
    d.rect(px, py, pw, ph, g.bg);
    const ls = 0.031 * H;
    d.text("label", px + 0.016 * W, py + ph / 2 + 0.36 * ls, ls, { role: g.small, family: "display", tracking: 500, box: [px, py, pw, ph] });
  },

  "card.collide"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    const bs = p.big_size * H; const by = 0.148 * H;
    d.text("big", 0.057 * W, by + BASE * bs, bs, { role: g.ink, family: "title", box: [0.05 * W, by - d.pad, 0.54 * W, bs * 1.25] });
    const pw = 0.36 * W; const ph = 0.27 * H; const px = p.plate_x * W; const py = 0.48 * H;
    const cx = px + pw / 2; const cy = py + ph / 2; const turn = `rotate(${p.tilt} ${f1(cx)} ${f1(cy)})`;
    d.poly(rotated(cx, cy, pw, ph, p.tilt), g.mark);
    const ss = 0.111 * H;
    d.text("block", px + 0.026 * W, py + 0.04 * H + BASE * ss, ss, { role: g.bg === "red" ? "paper" : "black", family: "sans", tracking: 60, transform: turn, box: [px - 0.01 * W, py - 0.02 * H, pw + 0.02 * W, ph * 0.8] });
    const us = 0.031 * H;
    d.text("sub", px + 0.03 * W, py + 0.2 * H + BASE * us, us, { role: "paper", family: "sans_body", tracking: 120, transform: turn, box: [px - 0.01 * W, py + 0.12 * H, pw + 0.02 * W, 0.16 * H] });
    const rs = 0.034 * H;
    d.text("ruby", 0.06 * W, 0.77 * H + BASE * rs, rs, { role: g.mark, family: "ruby", tracking: 500, box: [0.06 * W - d.pad, 0.77 * H - d.pad, 0.45 * W, rs * 1.3] });
  },

  "card.void-line"(d) {
    const { W, H, p } = d; const g = tone(d);
    d.rect(0, 0, W, H, g.bg);
    const s = p.line_size * H; const y = p.line_top * H;
    d.text("line", 0.5 * W, y + BASE * s, s, { role: g.ink, family: "head", anchor: "middle", tracking: 420, box: [0.15 * W, y - d.pad, 0.7 * W, s * 1.3] });
    const dot = 0.0063 * W;
    d.rect(0.5 * W - dot / 2, y + s * 2.6, dot, dot, g.mark);
    const ns = 0.02 * H;
    d.text("number", 0.95 * W, 0.074 * H + BASE * ns, ns, { role: g.bg === "black" ? "grey" : g.small, family: "num", anchor: "end", tracking: 300, box: [0.8 * W, 0.074 * H - d.pad, 0.15 * W + d.pad, ns * 1.3] });
  },

  "kv.vertical-band-corridor"(d) {
    const { W, H, p } = d;
    d.rect(0, 0, W, H, "paper");
    tonePattern(d, "sb-wall", 10 * d.k, 45, 0.32, "black");
    tonePattern(d, "sb-band", 8 * d.k, 45, 0.22, "black");
    cutFilter(d, "sb-cut", 4 * d.k, "paper");
    const ch = p.corridor_h * H;
    d.def(`<clipPath id="sb-corr"><rect x="0" y="0" width="${f1(W)}" height="${f1(ch)}"/></clipPath>`);
    d.raw(`<g clip-path="url(#sb-corr)" data-material="corridor">${corridor(d, { rect: [-0.056 * W, -0.042 * H, 1.11 * W, ch + 0.042 * H], vp: [p.vp_x * W, 0.365 * H], n: 8, ratio: 0.72, wallFill: "url(#sb-wall)", sw: 6 * d.k })}</g>`);
    d.rect(0, ch - 4 * d.k, W, 8 * d.k, "black");
    d.raw(`<rect x="0" y="${f1(0.885 * H)}" width="${f1(W)}" height="${f1(0.115 * H)}" fill="url(#sb-band)" data-material="screentone"/>`);
    d.rect(0.052 * W, 0.905 * H, 0.6 * W, 0.067 * H, "paper");
    d.rect(0.789 * W, 0.93 * H, 0.176 * W, 0.033 * H, "paper");
    const bandX = p.band_x * W;
    d.rect(bandX, 0, W - bandX, p.band_h * H, "red");
    // collage: one main object, up to three secondary ones, one procedural cut-paper butterfly
    const spots = [[-0.028, 0.036, 0.48, -12], [0.139, 0.172, 0.176, -24], [0.704, 0.651, 0.306, 8], [0.037, 0.521, 0.194, -6]];
    spots.forEach(([x, y, w, r], i) => d.image(`collage${i}`, x * W, y * H, w * W, w * W, "", { rotate: r }));
    if (p.butterfly) d.raw(`<g data-collage="butterfly" transform="translate(${f1(0.593 * W)},${f1(0.719 * H)}) rotate(18) scale(${f1(0.42 * d.k * 100) / 100})" filter="url(#sb-cut)">${SHAPES.butterfly(d.pal)}</g>`);
    const ts = p.title_size * H; const tcx = bandX + (W - bandX) / 2;
    d.text("title", tcx, 0.05 * H, ts, { role: "paper", family: "display", vertical: true, tracking: 20, box: [tcx - ts * 0.6, 0.05 * H - d.pad, ts * 1.2, 0.47 * H] });
    const rs = 0.0135 * H; const rcx = bandX + 0.022 * W;
    d.text("ruby", rcx, 0.521 * H, rs, { role: "paper", family: "ruby", vertical: true, tracking: 320, box: [rcx - rs * 0.6, 0.521 * H - d.pad, rs * 1.2, p.band_h * H - 0.521 * H - 0.01 * H] });
    const tx = 0.067 * W; const gs = 0.028 * H;
    d.text("tag1", tx, 0.708 * H + BASE * gs, gs, { role: "black", family: "title", tracking: 80, box: [tx - d.pad, 0.708 * H - d.pad, 0.67 * W, gs * 1.3] });
    d.text("tag2", tx, 0.748 * H + BASE * gs, gs, { role: "black", family: "title", tracking: 80, box: [tx - d.pad, 0.748 * H - d.pad, 0.67 * W, gs * 1.3] });
    const js = 0.0125 * H;
    d.text("tag_ja", tx, 0.797 * H + BASE * js, js, { role: "black", family: "ja", tracking: 120, box: [tx - d.pad, 0.797 * H - d.pad, 0.67 * W, js * 1.3] });
    d.rect(tx, 0.833 * H, 0.42 * W, 0.033 * H, "black");
    const os = 0.0177 * H;
    d.text("onair", tx + 0.019 * W, 0.8495 * H + 0.36 * os, os, { role: "paper", family: "head", tracking: 100, box: [tx, 0.833 * H, 0.42 * W, 0.033 * H] });
    const es = 0.0135 * H;
    d.text("en", tx, 0.917 * H + BASE * es, es, { role: "black", family: "num", tracking: 500, box: [tx - d.pad, 0.917 * H - d.pad, 0.585 * W, es * 1.3] });
    const cs = 0.0104 * H;
    d.text("credit", tx, 0.949 * H + BASE * cs, cs, { role: "black", family: "sans_body", tracking: 200, box: [tx - d.pad, 0.949 * H - d.pad, 0.585 * W, cs * 1.3] });
    const ns = 0.0177 * H;
    d.text("number", 0.815 * W, 0.9375 * H + BASE * ns, ns, { role: "black", family: "display", tracking: 300, box: [0.789 * W, 0.93 * H, 0.176 * W, 0.033 * H] });
    d.align("left", "left", tx, ["tag1", "tag2", "en", "credit"], 0.01);
  },

  "ui.door-grid"(d) {
    const { W, H, p } = d;
    cutFilter(d, "dg-cut", 6 * d.k, "paper");
    d.rect(0, 0, W, H, "paper");
    const barH = 0.078 * H;
    d.rect(0, 0, W, barH, "black");
    const ls = 0.031 * H;
    d.text("logo", 0.031 * W, barH / 2 + 0.36 * ls, ls, { role: "paper", family: "display", tracking: 100, box: [0.031 * W - d.pad, 0, 0.12 * W, barH] });
    const ms = 0.0185 * H;
    for (let i = 0; i < 6; i += 1) {
      const x = 0.155 * W + i * 0.0625 * W;
      if (i === p.active) d.rect(x - 0.0104 * W, barH * 0.22, 0.0625 * W - 0.004 * W, barH * 0.56, "red");
      d.text(`menu${i}`, x, barH / 2 + 0.36 * ms, ms, { role: "paper", family: "head", tracking: 200, box: [x - 0.004 * W, barH * 0.2, 0.058 * W, barH * 0.6] });
    }
    const hs = 0.13 * H; const hx = 0.094 * W;
    d.text("heading", hx, 0.139 * H, hs, { role: "black", family: "display", vertical: true, tracking: 80, box: [hx - hs * 0.6, 0.139 * H - d.pad, hs * 1.2, 0.43 * H] });
    const rs = 0.022 * H; const rx = 0.048 * W;
    d.text("reading", rx, 0.148 * H, rs, { role: "red", family: "ruby", vertical: true, tracking: 400, box: [rx - rs * 0.6, 0.148 * H - d.pad, rs * 1.2, 0.3 * H] });
    d.rect(0.057 * W, 0.574 * H, 0.073 * W, 0.0074 * H, "red");
    const ds = 0.0185 * H;
    d.text("intro", 0.057 * W, 0.604 * H + BASE * ds, ds, { role: "black", family: "body", tracking: 60, lineHeight: 1.7, box: [0.057 * W - d.pad, 0.604 * H - d.pad, 0.1 * W, ds * 1.7 * 3 + ds * 0.3] });
    const es = 0.0148 * H;
    d.text("episodes", 0.057 * W, 0.704 * H + BASE * es, es, { role: "black", family: "num", tracking: 200, box: [0.057 * W - d.pad, 0.704 * H - d.pad, 0.1 * W, es * 1.3] });
    const cw = 0.123 * W; const chh = 0.38 * H; const gx = 0.0104 * W; const gy = 0.0185 * H; const x0 = 0.172 * W; const y0 = 0.139 * H;
    const border = 3 * d.k;
    for (let i = 0; i < 12; i += 1) {
      const cx = x0 + (i % 6) * (cw + gx); const cy = y0 + Math.floor(i / 6) * (chh + gy);
      d.rect(cx, cy, cw, chh, "black");
      d.rect(cx + border, cy + border, cw - 2 * border, chh - 2 * border, "paper");
      const ns = 0.05 * H;
      d.text(`card${i}_num`, cx + 0.0073 * W, cy + 0.0074 * H + BASE * ns, ns, { role: "black", family: "num", tracking: -20, box: [cx + 0.004 * W, cy + border, cw * 0.55, ns * 1.2] });
      const vs = 0.0185 * H; const vx = cx + cw - 0.0063 * W - vs / 2;
      d.text(`card${i}_ep`, vx, cy + 0.013 * H, vs, { role: "black", family: "display", vertical: true, tracking: 200, box: [vx - vs * 0.6, cy + border, vs * 1.2, 5 * vs * 1.2 + vs * 0.4] });
      d.raw(`<g data-material="door" transform="translate(${f1(cx + cw / 2)},${f1(cy + 0.17 * H)}) scale(${f1(0.0006 * H * 100) / 100})" filter="url(#dg-cut)">${SHAPES.door(d.pal)}</g>`);
      const ts = 0.0194 * H; const ty = cy + 0.293 * H;
      d.text(`card${i}_title`, cx + 0.0073 * W, ty + BASE * ts, ts, { role: "black", family: "head", tracking: 40, lineHeight: 1.35, box: [cx + 0.006 * W, ty - d.pad, cw - 0.012 * W, ts * 1.35 * 2 + ts * 0.3] });
      const js = 0.0139 * H;
      d.text(`card${i}_ja`, cx + 0.0073 * W, cy + chh - 0.011 * H, js, { role: "black", family: "ja", tracking: 80, box: [cx + 0.006 * W, cy + chh - 0.011 * H - js * 1.05, cw - 0.012 * W, js * 1.3] });
      if (i === p.current) {
        const tw = 0.03 * W; const th = 0.025 * H;
        d.rect(cx + cw - tw + 0.005 * W, cy - 0.013 * H, tw, th, "red");
        const ns2 = 0.0139 * H;
        d.text(`badge`, cx + cw - tw / 2 + 0.005 * W, cy - 0.013 * H + th / 2 + 0.36 * ns2, ns2, { role: "paper", family: "num", anchor: "middle", tracking: 200, box: [cx + cw - tw + 0.005 * W, cy - 0.013 * H, tw, th] });
      }
    }
    d.raw(`<rect x="0" y="${f1(0.935 * H)}" width="${f1(W)}" height="${f1(0.065 * H)}" fill="url(#dg-band)" data-material="screentone"/>`);
    tonePattern(d, "dg-band", 8 * d.k, 45, 0.22, "black");
  },

  "ui.specimen-codex"(d) {
    const { W, H, p } = d;
    d.rect(0, 0, W, H, "black");
    const hs = 0.052 * H;
    d.text("heading", 0.036 * W, 0.087 * H, hs, { role: "paper", family: "title", tracking: 140, box: [0.036 * W - d.pad, 0.087 * H - hs, 0.18 * W, hs * 1.25] });
    const ts = 0.022 * H;
    for (let i = 0; i < 4; i += 1) {
      const x = 0.24 * W + i * 0.07 * W;
      if (i === p.tab) d.rect(x - 0.012 * W, 0.054 * H, 0.066 * W, 0.044 * H, "red");
      d.text(`tab${i}`, x, 0.084 * H, ts, { role: "paper", family: "head", tracking: 200, box: [x - 0.006 * W, 0.084 * H - ts, 0.058 * W, ts * 1.3] });
    }
    const cs = 0.02 * H;
    d.text("count", 0.964 * W, 0.084 * H, cs, { role: "paper", family: "num", anchor: "end", tracking: 160, box: [0.8 * W, 0.084 * H - cs, 0.164 * W + d.pad, cs * 1.3] });
    d.rect(0, 0.102 * H, W, 4 * d.k, "paper");
    const rowH = 0.072 * H; const lx = 0.036 * W; const lw = 0.224 * W; const ly = 0.148 * H;
    for (let i = 0; i < 7; i += 1) {
      const y = ly + i * rowH;
      const on = i === p.selected;
      if (on) d.rect(lx, y, lw, rowH, "red");
      d.line(lx, y + rowH, lx + lw, y + rowH, "grey", 1);
      const is = 0.0185 * H; const mid = y + rowH / 2;
      d.text(`row${i}_id`, lx + 0.0094 * W, mid + 0.36 * is, is, { role: on ? "paper" : "grey", family: "num", tracking: 100, box: [lx + 0.006 * W, y, 0.04 * W, rowH] });
      const ns = 0.024 * H;
      d.text(`row${i}_name`, lx + 0.053 * W, mid + 0.36 * ns, ns, { role: "paper", family: "head", tracking: 60, box: [lx + 0.05 * W, y, 0.12 * W, rowH] });
      const ss = 0.013 * H;
      d.text(`row${i}_state`, lx + lw - 0.008 * W, mid + 0.36 * ss, ss, { role: on ? "paper" : "grey", family: "num", anchor: "end", tracking: 50, box: [lx + lw - 0.05 * W, y, 0.045 * W, rowH] });
    }
    // specimen board: tilted paper plate with a hard red shadow, a grid and one collage object
    const bx = 0.292 * W; const by = 0.148 * H; const bw = 0.375 * W; const bh = 0.722 * H;
    const bcx = bx + bw / 2; const bcy = by + bh / 2;
    d.poly(rotated(bcx + 0.0073 * W, bcy + 0.0148 * H, bw, bh, p.board_tilt), "red");
    d.poly(rotated(bcx, bcy, bw, bh, p.board_tilt), "paper");
    const grid = [];
    for (let gx = 0.016 * W; gx < bw - 0.016 * W; gx += 0.0208 * W) grid.push(`<line x1="${f1(bx + gx)}" y1="${f1(by + 0.028 * H)}" x2="${f1(bx + gx)}" y2="${f1(by + bh - 0.028 * H)}"/>`);
    for (let gy = 0.028 * H; gy < bh - 0.028 * H; gy += 0.037 * H) grid.push(`<line x1="${f1(bx + 0.016 * W)}" y1="${f1(by + gy)}" x2="${f1(bx + bw - 0.016 * W)}" y2="${f1(by + gy)}"/>`);
    d.raw(`<g transform="rotate(${p.board_tilt} ${f1(bcx)} ${f1(bcy)})" stroke="${d.pal.black}" stroke-opacity="0.13" stroke-width="1">${grid.join("")}</g>`);
    d.image("specimen", bx + 0.14 * W, by + 0.033 * H, 0.099 * W, 0.099 * W, "", { rotate: 14 });
    const lbx = bx + 0.031 * W; const lby = by + bh - 0.17 * H;
    d.poly(rotated(lbx + 0.09 * W, lby + 0.05 * H, 0.18 * W, 0.1 * H, -3), "paper", `stroke="${d.pal.black}" stroke-width="${f1(2 * d.k)}"`);
    const pls = 0.026 * H;
    d.text("plate_name", lbx + 0.012 * W, lby + 0.042 * H, pls, { role: "black", family: "head", tracking: 60, transform: `rotate(-3 ${f1(lbx + 0.09 * W)} ${f1(lby + 0.05 * H)})`, box: [lbx - 0.004 * W, lby + 0.006 * H, 0.18 * W, 0.05 * H] });
    const pis = 0.0167 * H;
    d.text("plate_id", lbx + 0.012 * W, lby + 0.077 * H, pis, { role: "black", family: "num", tracking: 200, transform: `rotate(-3 ${f1(lbx + 0.09 * W)} ${f1(lby + 0.05 * H)})`, box: [lbx - 0.004 * W, lby + 0.055 * H, 0.18 * W, 0.035 * H] });
    // detail column
    const dx = 0.7 * W; const dw = 0.264 * W;
    const ns = 0.052 * H;
    d.text("name", dx, 0.2 * H + BASE * ns, ns, { role: "paper", family: "title", tracking: 60, box: [dx - d.pad, 0.2 * H - d.pad, dw, ns * 1.3] });
    const js = 0.022 * H;
    d.text("name_ja", dx, 0.27 * H + BASE * js, js, { role: "paper", family: "ja", tracking: 160, box: [dx - d.pad, 0.27 * H - d.pad, dw, js * 1.3] });
    d.rect(dx, 0.32 * H, 0.031 * W, 0.0074 * H, "red");
    const ws = 0.0185 * H;
    d.text("where", dx, 0.35 * H + BASE * ws, ws, { role: "paper", family: "body", tracking: 40, lineHeight: 1.6, box: [dx - d.pad, 0.35 * H - d.pad, dw, ws * 1.6 * 2 + ws * 0.3] });
    d.text("body", dx, 0.43 * H + BASE * ws, ws, { role: "paper", family: "body", tracking: 40, lineHeight: 1.8, box: [dx - d.pad, 0.43 * H - d.pad, dw, ws * 1.8 * 4 + ws * 0.3] });
    const rs = 0.024 * H;
    d.text("rarity", dx, 0.62 * H + BASE * rs, rs, { role: "red", family: "num", tracking: 300, box: [dx - d.pad, 0.62 * H - d.pad, dw, rs * 1.3] });
    const ks = 0.0167 * H;
    d.text("night", dx, 0.67 * H + BASE * ks, ks, { role: "grey", family: "label", tracking: 300, box: [dx - d.pad, 0.67 * H - d.pad, dw, ks * 1.3] });
    d.align("detail", "left", dx, ["name", "name_ja", "where", "body", "rarity", "night"], 0.004);
  },

  "motion.title-card-cut"(d) {
    const { W, H } = d;
    const motion = d.style.motion;
    d.rect(0, 0, W, H, "black");
    const shots = [];
    for (let i = 0; i < d.p.shots; i += 1) {
      const raw = String(d.value(`shot${i}`).text);
      const at = raw.indexOf(":");
      const ground = at > 0 ? raw.slice(0, at) : "";
      if (!d.style.layout.groundTones[ground]) throw Object.assign(new Error(`--set shot${i} must be <ground>:<label> with ground ${Object.keys(d.style.layout.groundTones).join("|")}, got ${raw}`), { code: "OPTION_VALUE_INVALID" });
      shots.push({ ground, label: raw.slice(at + 1) });
    }
    const edl = cutEdl(d, shots);
    const frames = edl.reduce((s, x) => s + x.frames, 0);
    d.edl = { fps: motion.fps, frames, seconds: Number((frames / motion.fps).toFixed(2)), segments: edl };
    d.rhythm = { fps: motion.fps, limits: { ...motion }, grounds: Object.fromEntries(Object.entries(d.style.layout.groundTones).map(([k, t]) => [k, d.pal[t.bg]])), edl };
    const hs = 0.033 * H;
    d.text("title", 0.042 * W, 0.1 * H, hs, { role: "paper", family: "head", tracking: 100, box: [0.042 * W - d.pad, 0.1 * H - hs, 0.6 * W, hs * 1.3] });
    const ss = 0.0185 * H;
    d.text("summary", 0.042 * W, 0.15 * H, ss, { content: `${d.edl.seconds} s · ${frames} frames · ${motion.fps} fps · ${edl.filter((x) => x.kind === "flash").length} flashes in ${new Set(edl.filter((x) => x.kind === "flash").map((x) => x.group)).size} groups`, role: "grey", family: "num", tracking: 100, box: [0.042 * W - d.pad, 0.15 * H - ss, 0.9 * W, ss * 1.3] });
    // strip: one cell per segment, width by frames, two rows when long
    const left = 0.042 * W; const width = 0.916 * W; const rowH = 0.15 * H;
    const perRow = Math.ceil(frames / 2);
    const px = width / perRow;
    let f = 0;
    const cells = [];
    for (const seg of edl) {
      let remaining = seg.frames; let at = f;
      while (remaining > 0) {
        const row = Math.floor(at / perRow); const inRow = at - row * perRow; const take = Math.min(remaining, perRow - inRow);
        const x = left + inRow * px; const y = 0.24 * H + row * (rowH + 0.09 * H);
        const fill = d.pal[d.style.layout.groundTones[seg.ground].bg];
        cells.push(`<rect x="${f1(x)}" y="${f1(y + (seg.kind === "flash" ? rowH * 0.18 : 0))}" width="${f1(Math.max(1, take * px - 1))}" height="${f1(seg.kind === "flash" ? rowH * 0.64 : rowH)}" fill="${fill}" stroke="${d.pal.grey}" stroke-width="1" data-kind-cut="${seg.kind}"/>`);
        remaining -= take; at += take;
      }
      f += seg.frames;
    }
    d.raw(`<g data-material="edl">${cells.join("")}</g>`);
    // ticks every second
    const ticks = [];
    for (let s = 0; s * motion.fps <= frames; s += 1) {
      const fr = s * motion.fps; const row = Math.min(1, Math.floor(fr / perRow)); const x = left + (fr - row * perRow) * px; const y = 0.24 * H + row * (rowH + 0.09 * H) + rowH;
      ticks.push(`<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(y + 0.012 * H)}" stroke="${d.pal.grey}" stroke-width="2"/>`);
    }
    d.raw(`<g data-material="ticks">${ticks.join("")}</g>`);
    // legend: the shots and their grounds
    const ls = 0.0185 * H;
    shots.forEach((shot, i) => {
      const col = i % 4; const row = Math.floor(i / 4);
      const x = left + col * 0.23 * W; const y = 0.72 * H + row * 0.07 * H;
      d.rect(x, y, 0.025 * H, 0.025 * H, d.style.layout.groundTones[shot.ground].bg, `stroke="${d.pal.grey}" stroke-width="1"`);
      d.text(`shot${i}`, x + 0.035 * H, y + 0.0125 * H + 0.36 * ls, ls, { content: `${String(i + 1).padStart(2, "0")} ${shot.label}`, role: "paper", family: "body", tracking: 40, box: [x + 0.03 * H, y - 0.005 * H, 0.2 * W, 0.035 * H] });
    });
  },
};

module.exports = { LAYOUTS, cutEdl };
