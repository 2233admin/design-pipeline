"use strict";

// Geometric industrial lettering drawn in code: no font file, no traced artwork.
// Port of the art-study lettering.py (docs/research/arknights-endfield-template-study.md, section 5).
//
// Each glyph is a stroke skeleton on a unit box (x right, y down, 0..1). Rendering turns the
// skeleton into filled outlines with mitred joins, so the output is plain SVG <path> data.
//
// Parameters (relative to cap height H unless noted):
//   stroke        stroke width / H                       (default 0.17)
//   width         base glyph width / H                   (default 0.60; 0.45 = condensed)
//   chamfer       corner cut on the centre line / H      (default 0.10; 0 = square)
//   chamfer_mode  all | diag (top-left and bottom-right corners only) | none
//   stencil       stencil gap / H, 0 = off               (default 0)
//   tracking      extra advance, 1/1000 em (em = H)      (default 40)
//   slant         horizontal shear, tan(angle)           (default 0)
//   sidebearing   side bearing / H                       (default 0.07)
//
// Spacing: advance = glyph width + 2 side bearings + tracking, plus the pair table KERN.

const G = {
  A: { p: [[[0, 1], [0, 0], [1, 0], [1, 1]], [[0, 0.56], [1, 0.56]]], cut: [[0.5, 0]] },
  B: { p: [[[0, 0.5], [0.82, 0.5], [0.82, 0], [0, 0], [0, 1], [1, 1], [1, 0.5], [0.82, 0.5]]], cut: [[0.4, 0], [0.5, 1]] },
  C: { p: [[[1, 0], [0, 0], [0, 1], [1, 1]]], cut: [[0.35, 0], [0.35, 1]] },
  D: { c: [[[0, 0], [0.72, 0], [1, 0.28], [1, 0.72], [0.72, 1], [0, 1]]], cut: [[0.4, 0], [0.4, 1]] },
  E: { p: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.78, 0.5]]], cut: [[0.35, 0], [0.35, 1], [0.35, 0.5]] },
  F: { p: [[[1, 0], [0, 0], [0, 1]], [[0, 0.52], [0.78, 0.52]]], cut: [[0.5, 0]] },
  G: { p: [[[1, 0], [0, 0], [0, 1], [1, 1], [1, 0.52], [0.55, 0.52]]], cut: [[0.35, 0], [0.35, 1]] },
  H: { p: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]] },
  I: { w: 0, p: [[[0.5, 0], [0.5, 1]]] },
  J: { w: 0.85, p: [[[1, 0], [1, 1], [0, 1], [0, 0.68]]], cut: [[0.5, 1]] },
  K: { p: [[[0, 0], [0, 1]], [[1, 0], [0.42, 0.52], [0, 0.52]], [[0.42, 0.52], [1, 1]]] },
  L: { w: 0.85, p: [[[0, 0], [0, 1], [1, 1]]] },
  M: { w: 1.3, p: [[[0, 1], [0, 0], [1, 0], [1, 1]], [[0.5, 0], [0.5, 0.78]]], cut: [[0.25, 0], [0.75, 0]] },
  N: { p: [[[0, 1], [0, 0], [1, 1], [1, 0]]] },
  O: { c: [[[0, 0], [1, 0], [1, 1], [0, 1]]], cut: [[0.5, 0], [0.5, 1]] },
  P: { p: [[[0, 1], [0, 0], [1, 0], [1, 0.56], [0, 0.56]]], cut: [[0.5, 0]] },
  Q: { c: [[[0, 0], [1, 0], [1, 1], [0, 1]]], p: [[[0.58, 0.72], [1.0, 1.06]]], cut: [[0.5, 0], [0.3, 1]] },
  R: { p: [[[0, 1], [0, 0], [1, 0], [1, 0.54], [0, 0.54]], [[0.48, 0.54], [1, 1]]], cut: [[0.5, 0]] },
  S: { p: [[[1, 0.18], [1, 0], [0, 0], [0, 0.5], [1, 0.5], [1, 1], [0, 1], [0, 0.82]]], cut: [[0.5, 0], [0.5, 1]] },
  T: { p: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]] },
  U: { p: [[[0, 0], [0, 1], [1, 1], [1, 0]]], cut: [[0.5, 1]] },
  V: { w: 1.05, p: [[[0, 0], [0.5, 1], [1, 0]]] },
  W: { w: 1.4, p: [[[0, 0], [0.24, 1], [0.5, 0.3], [0.76, 1], [1, 0]]] },
  X: { p: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]] },
  Y: { p: [[[0, 0], [0.5, 0.52], [1, 0]], [[0.5, 0.52], [0.5, 1]]] },
  Z: { p: [[[0, 0], [1, 0], [0, 1], [1, 1]]] },
  0: { w: 0.88, c: [[[0, 0], [1, 0], [1, 1], [0, 1]]], p: [[[0.72, 0.28], [0.28, 0.72]]], cut: [[0.5, 0], [0.5, 1]] },
  1: { w: 0.55, p: [[[0, 0.22], [0.62, 0], [0.62, 1]]] },
  2: { w: 0.88, p: [[[0, 0], [1, 0], [1, 0.5], [0, 0.5], [0, 1], [1, 1]]] },
  3: { w: 0.88, p: [[[0, 0], [1, 0], [1, 1], [0, 1]], [[0.3, 0.5], [1, 0.5]]], cut: [[0.5, 0], [0.5, 1]] },
  4: { w: 0.88, p: [[[0, 0], [0, 0.64], [1, 0.64]], [[0.74, 0.28], [0.74, 1]]] },
  5: { w: 0.88, p: [[[1, 0], [0, 0], [0, 0.46], [1, 0.46], [1, 1], [0, 1]]] },
  6: { w: 0.88, p: [[[1, 0], [0, 0], [0, 1], [1, 1], [1, 0.5], [0, 0.5]]], cut: [[0.5, 1]] },
  7: { w: 0.88, p: [[[0, 0], [1, 0], [1, 0.26], [0.46, 1]]] },
  8: { w: 0.88, c: [[[0, 0], [1, 0], [1, 1], [0, 1]]], p: [[[0, 0.5], [1, 0.5]]], cut: [[0.5, 0], [0.5, 1]] },
  9: { w: 0.88, p: [[[1, 0.5], [0, 0.5], [0, 0], [1, 0], [1, 1], [0, 1]]], cut: [[0.5, 0]] },
  "/": { w: 0.55, p: [[[1, 0], [0, 1]]] },
  "\\": { w: 0.55, p: [[[0, 0], [1, 1]]] },
  "-": { w: 0.55, p: [[[0, 0.52], [1, 0.52]]] },
  _: { w: 0.8, p: [[[0, 1], [1, 1]]] },
  "+": { w: 0.75, p: [[[0, 0.52], [1, 0.52]], [[0.5, 0.2], [0.5, 0.84]]] },
  ".": { w: 0, p: [[[0.5, 0.9], [0.5, 1]]] },
  ":": { w: 0, p: [[[0.5, 0.22], [0.5, 0.32]], [[0.5, 0.9], [0.5, 1]]] },
  "[": { w: 0.32, p: [[[1, 0], [0, 0], [0, 1], [1, 1]]] },
  "]": { w: 0.32, p: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
  "<": { w: 0.55, p: [[[1, 0.14], [0, 0.52], [1, 0.9]]] },
  ">": { w: 0.55, p: [[[0, 0.14], [1, 0.52], [0, 0.9]]] },
  "|": { w: 0, p: [[[0.5, -0.08], [0.5, 1.08]]] },
  "#": { w: 0.9, p: [[[0.3, 0], [0.3, 1]], [[0.7, 0], [0.7, 1]], [[0, 0.33], [1, 0.33]], [[0, 0.7], [1, 0.7]]] },
  "%": { w: 0.95, p: [[[1, 0], [0, 1]], [[0, 0], [0, 0.22]], [[1, 0.78], [1, 1]]] },
  "!": { w: 0, p: [[[0.5, 0], [0.5, 0.68]], [[0.5, 0.9], [0.5, 1]]] },
  "?": { w: 0.8, p: [[[0, 0.2], [0, 0], [1, 0], [1, 0.42], [0.5, 0.42], [0.5, 0.68]], [[0.5, 0.9], [0.5, 1]]] },
  "'": { w: 0, p: [[[0.5, 0], [0.5, 0.26]]] },
  " ": { w: 0.5, p: [] },
};

// Pair kerning, 1/1000 em (negative = tighter).
const KERN = new Map([["LT", -60], ["TA", -30], ["AT", -30], ["LY", -40], ["//", -40], ["[ ", -80], [" ]", -80], ["F.", -60], ["T.", -60], ["P.", -40]]);

const DEFAULTS = Object.freeze({ stroke: 0.17, width: 0.6, chamfer: 0.1, chamfer_mode: "diag", stencil: 0, tracking: 40, slant: 0, sidebearing: 0.07 });
const PARAM_RANGES = Object.freeze({
  stroke: [0.05, 0.5], width: [0.25, 1.2], chamfer: [0, 0.3], stencil: [0, 0.2], tracking: [-200, 1200], slant: [-0.4, 0.4], sidebearing: [0, 0.3],
});
const CHAMFER_MODES = ["all", "diag", "none"];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const perp = (a) => [-a[1], a[0]];
const at = (list, index) => list[((index % list.length) + list.length) % list.length];

function offsetPolyline(pts, half, closed) {
  const n = pts.length;
  const L = [];
  const R = [];
  for (let i = 0; i < n; i += 1) {
    let p0; let p1; let p2;
    if (closed) {
      p0 = at(pts, i - 1); p1 = pts[i]; p2 = at(pts, i + 1);
    } else {
      p1 = pts[i];
      p0 = i > 0 ? pts[i - 1] : null;
      p2 = i < n - 1 ? pts[i + 1] : null;
    }
    if (p0 === null) {
      const nrm = perp(unit(sub(p2, p1)));
      L.push(add(p1, mul(nrm, half))); R.push(sub(p1, mul(nrm, half)));
      continue;
    }
    if (p2 === null) {
      const nrm = perp(unit(sub(p1, p0)));
      L.push(add(p1, mul(nrm, half))); R.push(sub(p1, mul(nrm, half)));
      continue;
    }
    const n0 = perp(unit(sub(p1, p0)));
    const n1 = perp(unit(sub(p2, p1)));
    const m = unit(add(n0, n1));
    const cosv = m[0] * n0[0] + m[1] * n0[1];
    const k = half / Math.max(cosv, 0.25);
    if (cosv >= 0.6) { // up to about a 106 degree turn: plain mitre
      L.push(add(p1, mul(m, k))); R.push(sub(p1, mul(m, k)));
      continue;
    }
    // Sharp join: bevel the outer side (flat industrial tip), mitre the inner side.
    const d0 = unit(sub(p1, p0));
    const d1 = unit(sub(p2, p1));
    const turn = sub(d1, d0);
    const leftInner = (n0[0] + n1[0]) * turn[0] + (n0[1] + n1[1]) * turn[1] > 0;
    const inner = mul(m, k);
    if (leftInner) {
      L.push(add(p1, inner));
      R.push(sub(p1, mul(n0, half))); R.push(sub(p1, mul(n1, half)));
    } else {
      R.push(sub(p1, inner));
      L.push(add(p1, mul(n0, half))); L.push(add(p1, mul(n1, half)));
    }
  }
  return [L, R];
}

function chamferPoints(pts, closed, c, cornerOk) {
  if (c <= 0) return pts;
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const p1 = pts[i];
    if (!closed && (i === 0 || i === n - 1)) { out.push(p1); continue; }
    const p0 = at(pts, i - 1);
    const p2 = at(pts, i + 1);
    const d0 = unit(sub(p1, p0));
    const d1 = unit(sub(p2, p1));
    const rightAngle = Math.abs(d0[0] * d1[0] + d0[1] * d1[1]) < 0.15;
    if (rightAngle && cornerOk(p1)) {
      const cc = Math.min(c, len(sub(p1, p0)) * 0.45, len(sub(p2, p1)) * 0.45);
      out.push(sub(p1, mul(d0, cc))); out.push(add(p1, mul(d1, cc)));
    } else {
      out.push(p1);
    }
  }
  return out;
}

// Split a skeleton at stencil cut points. Returns [points, capStart, capEnd] pieces where a cap is
// "square" for a natural end and "butt" for a cut end; an uncut loop returns [points, null, null].
function splitAtCuts(pts, closed, cuts, gap) {
  const segs = [];
  const ring = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i + 1 < ring.length; i += 1) segs.push([ring[i], ring[i + 1]]);
  const hits = [];
  for (const [cx, cy] of cuts) {
    for (let si = 0; si < segs.length; si += 1) {
      const [a, b] = segs[si];
      const ab = sub(b, a);
      const l2 = ab[0] ** 2 + ab[1] ** 2;
      if (l2 === 0) continue;
      const t = ((cx - a[0]) * ab[0] + (cy - a[1]) * ab[1]) / l2;
      const q = add(a, mul(ab, t));
      if (t > 0.02 && t < 0.98 && len(sub(q, [cx, cy])) < 1e-6) { hits.push([si, t]); break; }
    }
  }
  if (!hits.length) return closed ? [[pts, null, null]] : [[pts, "square", "square"]];
  hits.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const point = (si, t) => { const [a, b] = segs[si]; return add(a, mul(sub(b, a), t)); };
  const halfGap = gap / 2;
  const trim = (from, to, amount) => add(from, mul(unit(sub(to, from)), amount));
  const pieces = [];
  if (closed) {
    const order = [...hits, [hits[0][0] + segs.length, hits[0][1]]];
    for (let k = 0; k < hits.length; k += 1) {
      const [s0, t0] = order[k];
      const [s1, t1] = order[k + 1];
      const seq = [point(s0 % segs.length, t0)];
      for (let s = s0 + 1; s <= s1; s += 1) seq.push(segs[s % segs.length][0]);
      seq.push(point(s1 % segs.length, t1));
      seq[0] = trim(seq[0], seq[1], halfGap);
      seq[seq.length - 1] = trim(seq[seq.length - 1], seq[seq.length - 2], halfGap);
      pieces.push([seq, "butt", "butt"]);
    }
  } else {
    const bounds = [[0, 0, "square"], ...hits.map(([s, t]) => [s, t, "butt"]), [segs.length - 1, 1, "square"]];
    for (let k = 0; k + 1 < bounds.length; k += 1) {
      const [s0, t0, c0] = bounds[k];
      const [s1, t1, c1] = bounds[k + 1];
      const seq = [point(s0, t0)];
      for (let s = s0 + 1; s <= s1; s += 1) seq.push(segs[s][0]);
      seq.push(point(s1, t1));
      if (c0 === "butt") seq[0] = trim(seq[0], seq[1], halfGap);
      if (c1 === "butt") seq[seq.length - 1] = trim(seq[seq.length - 1], seq[seq.length - 2], halfGap);
      pieces.push([seq, c0, c1]);
    }
  }
  return pieces;
}

const num = (value) => { const text = value.toFixed(2); return text === "-0.00" ? "0.00" : text; }; // float noise around 0 prints as 0.00
const fmt = (p) => `${num(p[0])},${num(p[1])}`;

function resolveParams(overrides = {}) {
  const params = { ...DEFAULTS };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    if (!Object.hasOwn(DEFAULTS, key)) throw new Error(`unknown lettering parameter ${key}; allowed: ${Object.keys(DEFAULTS).join(", ")}`);
    if (key === "chamfer_mode") {
      if (!CHAMFER_MODES.includes(value)) throw new Error(`chamfer_mode must be one of ${CHAMFER_MODES.join(", ")}`);
      params[key] = value;
      continue;
    }
    const number = Number(value);
    const [min, max] = PARAM_RANGES[key];
    if (!Number.isFinite(number) || number < min || number > max) throw new Error(`lettering ${key} must be a number in [${min}, ${max}], got ${value}`);
    params[key] = number;
  }
  return params;
}

const hasGlyph = (ch) => Object.hasOwn(G, ch.toUpperCase());

// One glyph at cap height H with its box top-left at (x0, y0): { paths: [{ d, rule }], advance }.
function glyphPaths(ch, H, x0 = 0, y0 = 0, overrides = {}) {
  const P = resolveParams(overrides);
  const g = G[ch.toUpperCase()] || (ch.trim() ? G["?"] : G[" "]);
  const s = P.stroke * H;
  const wf = g.w ?? 1;
  const W = wf === 0 ? s : Math.max(s * 1.8, wf * P.width * H);
  const half = s / 2;
  const M = (u) => [x0 + (wf === 0 ? W / 2 : half + u[0] * (W - s)), y0 + half + u[1] * (H - s)];
  const c = P.chamfer * H;
  const cornerOk = (p) => {
    if (P.chamfer_mode === "all") return true;
    if (P.chamfer_mode === "none") return false;
    const ux = (p[0] - x0 - half) / Math.max(W - s, 1e-6);
    const uy = (p[1] - y0 - half) / Math.max(H - s, 1e-6);
    return (ux < 0.5 && uy < 0.5) || (ux > 0.5 && uy > 0.5);
  };
  const shear = P.slant;
  const sh = (p) => [p[0] + shear * (y0 + H - p[1]), p[1]];
  let items = [...(g.p || []).map((pl) => [pl, false]), ...(g.c || []).map((pl) => [pl, true])];
  if (ch === "0" && (W - s) / H < 0.32) items = items.filter((item) => item[1]); // too narrow for the slash
  const paths = [];
  let inkMin = Infinity;
  let inkMax = -Infinity;
  const track = (list) => { for (const p of list) { const x = sh(p)[0]; inkMin = Math.min(inkMin, x); inkMax = Math.max(inkMax, x); } };
  for (const [pl, closed] of items) {
    const pts = pl.map(M);
    if (pts.length === 2 && pts[0][0] === pts[1][0] && pts[0][1] === pts[1][1]) continue;
    const cuts = P.stencil > 0 ? (g.cut || []).map(M) : [];
    const pieces = cuts.length ? splitAtCuts(pts, closed, cuts, P.stencil * H) : (closed ? [[pts, null, null]] : [[pts, "square", "square"]]);
    for (const [rawSeq, c0, c1] of pieces) {
      const isLoop = closed && c0 === null;
      const seq = chamferPoints(rawSeq, isLoop, c, cornerOk);
      if (isLoop) {
        const [Lp, Rp] = offsetPolyline(seq, half, true);
        track(Lp); track(Rp);
        paths.push({ d: `M${Lp.map((p) => fmt(sh(p))).join(" L")} Z M${Rp.map((p) => fmt(sh(p))).join(" L")} Z`, rule: "evenodd" });
        continue;
      }
      if (c0 === "square") seq[0] = sub(seq[0], mul(unit(sub(seq[1], seq[0])), half));
      if (c1 === "square") seq[seq.length - 1] = add(seq[seq.length - 1], mul(unit(sub(seq[seq.length - 1], seq[seq.length - 2])), half));
      const [Lp, Rp] = offsetPolyline(seq, half, false);
      const poly = [...Lp, ...Rp.reverse()];
      track(poly);
      paths.push({ d: `M${poly.map((p) => fmt(sh(p))).join(" L")} Z`, rule: "nonzero" });
    }
  }
  return { paths, advance: W + 2 * P.sidebearing * H, ink: Number.isFinite(inkMin) ? [inkMin, inkMax] : null };
}

const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Set TEXT as SVG paths. (x, y) is the top of the cap box at its left (anchor start), centre
// (middle) or right (end). `width` is the advance width of the original (side bearings included,
// last tracking excluded). With trimStart the run is placed by its ink instead: the leftmost ink
// sits on x for start, the ink centre on x for middle, the rightmost ink on x for end (optical
// alignment). Returns { svg, width, visibleWidth, left }.
function setText(text, x, y, height, options = {}) {
  const { fill = "currentColor", anchor = "start", trimStart = false, attrs = "", ...overrides } = options;
  const P = resolveParams(overrides);
  const H = height;
  const chars = [...String(text)];
  const glyphs = [];
  let cx = 0;
  let inkLeft = Infinity;
  let inkRight = -Infinity;
  chars.forEach((ch, index) => {
    const glyph = glyphPaths(ch, H, cx + P.sidebearing * H, 0, P);
    glyphs.push(glyph.paths);
    if (glyph.ink) { inkLeft = Math.min(inkLeft, glyph.ink[0]); inkRight = Math.max(inkRight, glyph.ink[1]); }
    cx += glyph.advance + (P.tracking / 1000) * H;
    if (index + 1 < chars.length) cx += (KERN.get(`${ch.toUpperCase()}${chars[index + 1].toUpperCase()}`) || 0) / 1000 * H;
  });
  const total = chars.length ? cx - (P.tracking / 1000) * H : 0;
  const hasInk = Number.isFinite(inkLeft);
  const optical = trimStart && hasInk;
  const lead = optical ? inkLeft : 0;
  const visible = optical ? inkRight - inkLeft : total;
  const ox = (anchor === "start" ? x : anchor === "middle" ? x - visible / 2 : x - visible) - lead;
  const body = glyphs.flat().map(({ d, rule }) => `<path d="${d}" fill-rule="${rule}"/>`).join("");
  const params = Object.keys(P).sort().map((key) => `${key}=${P[key]}`).join(" ");
  const svg = `<g class="lettering" transform="translate(${num(ox)},${num(y)})" fill="${esc(fill)}" data-text="${esc(text)}" data-lettering="${params}"${attrs ? ` ${attrs}` : ""}>${body}</g>`;
  return { svg, width: total, visibleWidth: visible, left: ox + lead };
}

function specimen(overrides = {}) {
  const rows = ["ABCDEFGHIJKLM", "NOPQRSTUVWXYZ", "0123456789", "//[ ]+-.:#%!?<>|_"];
  const variants = [
    ["default diag chamfer", {}],
    ["condensed + stencil", { width: 0.44, stencil: 0.07, stroke: 0.15 }],
    ["wide, all chamfers", { width: 0.8, chamfer_mode: "all", chamfer: 0.14 }],
    ["square, light, tracked", { chamfer: 0, stroke: 0.1, tracking: 180 }],
  ];
  const H = 56;
  let y = 30;
  const parts = [];
  for (const [label, variant] of variants) {
    const params = resolveParams({ ...overrides, ...variant });
    parts.push(`<text x="20" y="${y + 10}" font-family="monospace" font-size="12" fill="#888">${label}: ${["stroke", "width", "chamfer", "chamfer_mode", "stencil", "tracking"].map((key) => `${key}=${params[key]}`).join(", ")}</text>`);
    y += 22;
    for (const row of rows) {
      parts.push(setText(row, 20, y, H, { fill: "#1A1A1A", ...params }).svg);
      y += H * 1.35;
    }
    y += 20;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${Math.round(y)}" viewBox="0 0 1400 ${Math.round(y)}"><rect width="100%" height="100%" fill="#EDEDEA"/>${parts.join("")}</svg>`;
}

module.exports = { DEFAULTS, PARAM_RANGES, CHAMFER_MODES, GLYPHS: Object.keys(G), KERN, glyphPaths, hasGlyph, resolveParams, setText, specimen };
