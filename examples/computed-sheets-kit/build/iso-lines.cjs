"use strict";

// Isometric line drawings (30° grid), four boards, each with a trace of one reference flavour:
//   IsoMenger   - Menger sponge L2, red phosphor lines with glow over a dot lattice (oscilloscope)
//   IsoSolids   - the five Platonic solids as a plate: hidden edges dashed, V/E/F table, leaders (approach chart)
//   IsoField    - a 240-cell height field in amber inside a recording HUD, slight RGB misregistration (CRT)
//   IsoHilbert  - a 3D Hilbert curve, nodes as dots, mono text blocks on red (poster)
const { emit, r } = require('./common.cjs');
const W = 1080, H = 1440;
const C30 = Math.cos(Math.PI / 6), S30 = .5;
const iso = (x, y, z, s, ox, oy) => [ox + (x - y) * C30 * s, oy + (x + y) * S30 * s - z * s];
const P = (pts) => pts.map((p) => `${r(p[0])},${r(p[1])}`).join(' ');
const glow = (id, sd) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const grain = (id, a) => `<filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${a} 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;

// cubes drawn back to front as filled faces with stroked edges = hidden-line removal for free
function cubes(list, s, ox, oy, fill, stroke, sw) {
  list.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]) || a[2] - b[2]);
  let o = '';
  for (const [x, y, z] of list) {
    const top = [iso(x, y, z + 1, s, ox, oy), iso(x + 1, y, z + 1, s, ox, oy), iso(x + 1, y + 1, z + 1, s, ox, oy), iso(x, y + 1, z + 1, s, ox, oy)];
    const fx = [iso(x + 1, y, z, s, ox, oy), iso(x + 1, y + 1, z, s, ox, oy), iso(x + 1, y + 1, z + 1, s, ox, oy), iso(x + 1, y, z + 1, s, ox, oy)];
    const fy = [iso(x, y + 1, z, s, ox, oy), iso(x + 1, y + 1, z, s, ox, oy), iso(x + 1, y + 1, z + 1, s, ox, oy), iso(x, y + 1, z + 1, s, ox, oy)];
    for (const f of [fx, fy, top]) o += `<polygon points="${P(f)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  return o;
}

// ---------- 1. Menger sponge, red phosphor ----------
{
  const RED = '#FF5A3C', BG = '#0B0909';
  const keep = (x, y, z) => { for (let k = 0; k < 2; k++) { const a = Math.floor(x / 3 ** k) % 3, b = Math.floor(y / 3 ** k) % 3, c = Math.floor(z / 3 ** k) % 3; if ((a === 1) + (b === 1) + (c === 1) >= 2) return false; } return true; };
  const L = []; for (let x = 0; x < 9; x++) for (let y = 0; y < 9; y++) for (let z = 0; z < 9; z++) if (keep(x, y, z)) L.push([x, y, z]);
  let s = `<defs>${glow('g', 3.2)}${grain('n', .14)}</defs><rect width="${W}" height="${H}" fill="${BG}"/>`;
  // dot lattice + cross hairs (oscilloscope graticule)
  for (let x = 90; x <= W - 90; x += 60) for (let y = 220; y <= H - 220; y += 60) s += `<circle cx="${x}" cy="${y}" r="1.6" fill="${RED}" opacity=".55"/>`;
  s += `<g filter="url(#g)" stroke="${RED}" fill="none"><line x1="70" y1="640" x2="${W - 70}" y2="640" stroke-width="1.6" opacity=".7"/><line x1="${W / 2}" y1="200" x2="${W / 2}" y2="${H - 200}" stroke-width="1.6" opacity=".55"/>`;
  [470, 420].forEach((R) => s += `<circle cx="${W / 2}" cy="640" r="${R}" stroke-width="1.4" opacity=".45"/>`);
  s += `</g>`;
  s += `<g filter="url(#g)">${cubes(L, 42, W / 2, 640, BG, RED, 1.7)}</g>`;
  s += `<text x="90" y="160" class="mono" fill="${RED}">MENGER SPONGE · LEVEL 2</text><text x="${W - 90}" y="160" class="mono" fill="${RED}" text-anchor="end">${L.length} / 729 CUBES</text>`;
  s += `<text x="90" y="${H - 140}" class="mono" fill="${RED}">D = LOG 20 / LOG 3 ≈ 2.727</text><text x="${W - 90}" y="${H - 140}" class="mono" fill="${RED}" text-anchor="end">ISO 30° · CH-1</text>`;
  s += `<rect width="${W}" height="${H}" fill="#fff" filter="url(#n)"/>`;
  emit('IsoMenger', 'Isometric · Menger sponge L2', W, H, `.mono{font:500 15px 'IBM Plex Mono';letter-spacing:.18em}`, s, BG);
}

// ---------- 2. Platonic solids plate ----------
{
  const FG = '#EDEDED', BG = '#0A0A0A', MU = '#8A8A8A';
  const phi = (1 + Math.sqrt(5)) / 2;
  const solids = {
    TETRAHEDRON: { v: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], F: 4 },
    CUBE: { v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], F: 6 },
    OCTAHEDRON: { v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((p) => p.map((c) => c * 1.45)), F: 8 },
    DODECAHEDRON: { v: [...[-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((c) => [a, b, c]))), ...[-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [[0, a / phi, b * phi], [a / phi, b * phi, 0], [b * phi, 0, a / phi]]))].map((p) => p.map((c) => c * .8)), F: 12 },
    ICOSAHEDRON: { v: [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [[0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]])).map((p) => p.map((c) => c * .78)), F: 20 },
  };
  // convex hull faces by brute force: a triple of vertices whose plane has all others on one side, merged by plane
  function hull(v) {
    const faces = new Map();
    const sub = (a, b) => a.map((x, i) => x - b[i]), cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) for (let k = j + 1; k < v.length; k++) {
      let n = cross(sub(v[j], v[i]), sub(v[k], v[i])); const L = Math.hypot(...n); if (L < 1e-9) continue; n = n.map((x) => x / L);
      const d = dot(n, v[i]); let pos = 0, neg = 0; v.forEach((p) => { const e = dot(n, p) - d; if (e > 1e-6) pos++; else if (e < -1e-6) neg++; });
      if (pos && neg) continue; if (pos) { n = n.map((x) => -x); }
      const key = n.map((x) => (Math.round(x * 1000) / 1000 + 0).toFixed(3)).join(','); if (!faces.has(key)) faces.set(key, { n, idx: new Set() });
      [i, j, k].forEach((q) => faces.get(key).idx.add(q));
    }
    return [...faces.values()];
  }
  const VIEW = [1, 1, 1].map((x) => x / Math.sqrt(3));
  function draw(name, cx, cy, sc) {
    const { v } = solids[name]; const F = hull(v);
    const edges = new Map();
    for (const f of F) {
      const ids = [...f.idx]; const c = ids.reduce((a, i) => a.map((x, k) => x + v[i][k] / ids.length), [0, 0, 0]);
      // order face vertices around centre
      const u = [v[ids[0]][0] - c[0], v[ids[0]][1] - c[1], v[ids[0]][2] - c[2]]; const w = [f.n[1] * u[2] - f.n[2] * u[1], f.n[2] * u[0] - f.n[0] * u[2], f.n[0] * u[1] - f.n[1] * u[0]];
      ids.sort((a, b) => { const pa = v[a].map((x, k) => x - c[k]), pb = v[b].map((x, k) => x - c[k]); return Math.atan2(pa[0] * w[0] + pa[1] * w[1] + pa[2] * w[2], pa[0] * u[0] + pa[1] * u[1] + pa[2] * u[2]) - Math.atan2(pb[0] * w[0] + pb[1] * w[1] + pb[2] * w[2], pb[0] * u[0] + pb[1] * u[1] + pb[2] * u[2]); });
      const front = f.n[0] * VIEW[0] + f.n[1] * VIEW[1] + f.n[2] * VIEW[2] > 0;
      ids.forEach((a, t) => { const b = ids[(t + 1) % ids.length]; const k = a < b ? `${a}-${b}` : `${b}-${a}`; edges.set(k, (edges.get(k) || false) || front); });
    }
    const pr = (p) => iso(p[0], p[1], p[2], sc, cx, cy);
    let o = '';
    for (const [k, fr] of edges) { const [a, b] = k.split('-').map(Number); const A = pr(v[a]), B = pr(v[b]); o += `<line x1="${r(A[0])}" y1="${r(A[1])}" x2="${r(B[0])}" y2="${r(B[1])}" stroke="${fr ? FG : MU}" stroke-width="${fr ? 2 : 1.2}" ${fr ? '' : 'stroke-dasharray="5 5"'}/>`; }
    v.forEach((p) => { const q = pr(p); o += `<circle cx="${r(q[0])}" cy="${r(q[1])}" r="2.4" fill="${FG}"/>`; });
    return { o, V: v.length, E: edges.size, F: F.length };
  }
  let s = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  // header like a chart plate
  s += `<rect x="90" y="96" width="210" height="34" rx="6" fill="none" stroke="${FG}"/><text x="195" y="119" class="m" text-anchor="middle">50 - 1 │ 5 SOLIDS</text>`;
  s += `<text x="90" y="186" class="h">PLATONIC <tspan class="hs">SET</tspan> 05</text><text x="${W - 90}" y="150" class="m" text-anchor="end">Plate - ISO / 30°</text><text x="${W - 90}" y="186" class="h" text-anchor="end">REGULAR CONVEX</text>`;
  s += `<rect x="90" y="206" width="${W - 180}" height="1020" rx="14" fill="none" stroke="${FG}" stroke-width="2"/>`;
  // ticks along the frame
  for (let x = 110; x < W - 90; x += 24) s += `<line x1="${x}" y1="206" x2="${x}" y2="${x % 120 === 110 % 120 ? 220 : 213}" stroke="${FG}"/>`;
  for (let y = 226; y < 1226; y += 24) s += `<line x1="${W - 90}" y1="${y}" x2="${W - 104}" y2="${y}" stroke="${FG}"/>`;
  // a range ring around the centre piece, like the 10nm circle
  s += `<circle cx="${W / 2}" cy="590" r="300" fill="none" stroke="${FG}" stroke-width="1.2"/><text x="${W / 2}" y="910" class="s" text-anchor="middle">r = 1.000</text>`;
  const pos = { ICOSAHEDRON: [W / 2, 590, 105], TETRAHEDRON: [240, 380, 50], CUBE: [W - 240, 380, 50], OCTAHEDRON: [240, 820, 56], DODECAHEDRON: [W - 240, 820, 54] };
  const rows = [];
  for (const [n, [cx, cy, sc]] of Object.entries(pos)) {
    const d = draw(n, cx, cy, sc); s += d.o; rows.push([n, d.V, d.E, d.F]);
    // label box with leader
    const lx = cx < W / 2 ? cx - 80 : cx - 80, ly = cy + (cy < 600 ? -130 : 120);
    if (n !== 'ICOSAHEDRON') s += `<line x1="${cx}" y1="${cy + (cy < 600 ? -90 : 90)}" x2="${lx + 60}" y2="${ly + (cy < 600 ? 20 : -16)}" stroke="${FG}"/><rect x="${lx}" y="${ly - 16}" width="160" height="40" fill="${BG}" stroke="${FG}"/><text x="${lx + 80}" y="${ly + 10}" class="s" text-anchor="middle">${n}</text>`;
  }
  s += `<rect x="${W / 2 - 110}" y="250" width="220" height="40" fill="${BG}" stroke="${FG}"/><text x="${W / 2}" y="276" class="s" text-anchor="middle">ICOSAHEDRON</text>`;
  // profile strip: Euler line V − E + F = 2
  s += `<line x1="90" y1="1010" x2="${W - 90}" y2="1010" stroke="${FG}" stroke-width="2"/><text x="120" y="1060" class="m">V − E + F = 2</text><text x="120" y="1090" class="s">EULER · HOLDS FOR ALL FIVE</text>`;
  s += `<path d="M520,1170 L660,1090 L880,1090" fill="none" stroke="${FG}" stroke-width="2"/><path d="M860,1080 L890,1090 L860,1100" fill="${FG}"/><text x="520" y="1200" class="s">DUALS  CUBE↔OCTA · DODECA↔ICOSA · TETRA↔TETRA</text>`;
  // V/E/F table
  const tx = 90, ty = 1244; s += `<rect x="${tx}" y="${ty}" width="${W - 180}" height="${26 + 24 * 5 + 14}" fill="none" stroke="${FG}" stroke-width="2"/>`;
  const cols = [tx + 20, tx + 380, tx + 520, tx + 660, tx + 800];
  ['SOLID', 'V', 'E', 'F', 'FACE'].forEach((h, i) => s += `<text x="${cols[i]}" y="${ty + 26}" class="m">${h}</text>`);
  const faceN = { TETRAHEDRON: 'TRI', CUBE: 'SQ', OCTAHEDRON: 'TRI', DODECAHEDRON: 'PENT', ICOSAHEDRON: 'TRI' };
  rows.forEach(([n, V, E, F], i) => { const y = ty + 52 + i * 24; s += `<line x1="${tx}" y1="${y - 20}" x2="${W - 90}" y2="${y - 20}" stroke="${MU}" stroke-width=".8"/>`; [n, V, E, F, faceN[n]].forEach((c, k) => s += `<text x="${cols[k]}" y="${y}" class="s">${c}</text>`); });
  emit('IsoSolids', 'Isometric · Platonic solids plate', W, H, `.h{font:500 34px 'Inter Tight',sans-serif;fill:${FG}}.hs{font-size:22px}.m{font:500 16px 'IBM Plex Mono';fill:${FG}}.s{font:400 13px 'IBM Plex Mono';fill:${FG};letter-spacing:.06em}`, s, BG);
}

// ---------- 3. 240-cell height field, amber CRT ----------
{
  const AM = '#FFB23F', BG = '#0E0C08', NX = 20, NY = 12;
  const h = (x, y) => 2.4 * Math.exp(-((x - 6) ** 2 + (y - 4) ** 2) / 10) + 1.6 * Math.exp(-((x - 14) ** 2 + (y - 8) ** 2) / 14) - .9 * Math.exp(-((x - 11) ** 2 + (y - 3) ** 2) / 6) + .25 * Math.sin(x * .9) * Math.cos(y * .8);
  const sc = 30, ox = W / 2 - 60, oy = 520;
  let field = '';
  // painter: draw cells back to front as filled quads with stroked edges
  const cells = []; for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) cells.push([x, y]);
  cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  for (const [x, y] of cells) {
    const q = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([u, v]) => iso(u, v, h(u, v), sc, ox, oy));
    field += `<polygon points="${P(q)}" fill="${BG}" stroke="${AM}" stroke-width="1.3" stroke-linejoin="round"/>`;
  }
  // base plate outline
  const base = [[0, 0], [NX, 0], [NX, NY], [0, NY]].map(([u, v]) => iso(u, v, -1.6, sc, ox, oy));
  let s = `<defs>${glow('g', 2)}${grain('n', .12)}</defs><rect width="${W}" height="${H}" fill="${BG}"/>`;
  s += `<polygon points="${P(base)}" fill="none" stroke="${AM}" stroke-width="1" stroke-dasharray="4 6" opacity=".6"/>`;
  for (const [u, v] of [[0, NY], [NX, NY], [NX, 0]]) { const a = iso(u, v, h(u, v), sc, ox, oy), b = iso(u, v, -1.6, sc, ox, oy); s += `<line x1="${r(a[0])}" y1="${r(a[1])}" x2="${r(b[0])}" y2="${r(b[1])}" stroke="${AM}" stroke-dasharray="4 6" opacity=".6"/>`; }
  // misregistration: a cyan and a red ghost under the field
  s += `<g opacity=".35" transform="translate(-2,0)">${field.replaceAll(AM, '#4FD8FF').replaceAll(`fill="${BG}"`, 'fill="none"')}</g><g opacity=".35" transform="translate(2,0)">${field.replaceAll(AM, '#FF4A3C').replaceAll(`fill="${BG}"`, 'fill="none"')}</g>`;
  s += `<g filter="url(#g)">${field}</g>`;
  // HUD frame
  const box = (x, y, w, hh, t, anchor = 'start') => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="none" stroke="${AM}" stroke-width="2.4"/><text x="${anchor === 'end' ? x + w - 18 : x + 18}" y="${y + hh / 2 + 9}" class="hud" text-anchor="${anchor}">${t}</text>`;
  s += `<g filter="url(#g)"><path d="M70,150 H${W - 70} V${H - 260} H70 Z" fill="none" stroke="${AM}" stroke-width="2.4"/>`;
  s += box(70, 150, 300, 70, '240 CELLS') + box(W - 370, 150, 300, 70, 'RECORDING_', 'end');
  s += `<text x="90" y="270" class="lab">GRID 20 × 12</text><text x="${W - 90}" y="270" class="lab" text-anchor="end">FIELD</text>`;
  s += `<text x="90" y="${H - 380}" class="lab">TARGET</text><text x="420" y="${H - 380}" class="lab">TYPE</text><text x="${W - 90}" y="${H - 380}" class="lab" text-anchor="end">SCALE</text>`;
  s += box(70, H - 350, 330, 90, 'Z = h(x, y)') + box(400, H - 350, 330, 90, 'HEIGHT FIELD') + box(W - 350, H - 350, 280, 90, '1 : 30', 'end') + `</g>`;
  // terminal readout under the frame
  const rows = ['PEAK A   (6, 4)    +2.40', 'PEAK B   (14, 8)   +1.60', 'BASIN    (11, 3)   −0.90', 'RIPPLE   0.25 · sin 0.9x · cos 0.8y'];
  rows.forEach((t, i) => s += `<text x="90" y="${H - 180 + i * 30}" class="term">${t}</text>`);
  s += `<rect x="${W - 260}" y="${H - 200}" width="170" height="26" fill="${AM}"/><text x="${W - 250}" y="${H - 181}" class="inv">SYSTEM NOMINAL</text>`;
  s += `<rect width="${W}" height="${H}" fill="#fff" filter="url(#n)"/>`;
  for (let y = 0; y < H; y += 4) s += `<rect x="0" y="${y}" width="${W}" height="1.4" fill="#000" opacity=".22"/>`;
  emit('IsoField', 'Isometric · 240-cell height field (CRT)', W, H, `.hud{font:700 30px 'IBM Plex Mono';fill:${AM};letter-spacing:.06em}.lab{font:700 24px 'IBM Plex Mono';fill:${AM};letter-spacing:.06em}.term{font:500 18px 'IBM Plex Mono';fill:${AM};letter-spacing:.04em}.inv{font:700 14px 'IBM Plex Mono';fill:${BG}}`, s, BG);
}

// ---------- 4. 3D Hilbert curve on red ----------
{
  const RED = '#D6061C', INK = '#1A0204';
  // 3D Hilbert curve via the standard state-table-free recursive construction (Skilling's transpose)
  function hilbert3(order) {
    const n = 1 << order, out = [];
    for (let d = 0; d < n * n * n; d++) {
      // decode index d into coordinates with Skilling's algorithm (TransposetoAxes)
      const X = [0, 0, 0]; let t = d;
      for (let b = 0; b < order; b++) for (let i = 2; i >= 0; i--) { X[i] |= (t & 1) << b; t >>= 1; }
      // gray decode
      const N = 2 << (order - 1); let tt = X[2] >> 1;
      for (let i = 2; i > 0; i--) X[i] ^= X[i - 1]; X[0] ^= tt;
      for (let Q = 2; Q !== N; Q <<= 1) { const P_ = Q - 1; for (let i = 2; i >= 0; i--) { if (X[i] & Q) X[0] ^= P_; else { tt = (X[0] ^ X[i]) & P_; X[0] ^= tt; X[i] ^= tt; } } }
      out.push([...X]);
    }
    return out;
  }
  const pts = hilbert3(3), sc = 52, ox = W / 2, oy = 560;
  const pr = pts.map(([x, y, z]) => iso(x, y, z, sc, ox, oy));
  let s = `<defs>${grain('n', .1)}</defs><rect width="${W}" height="${H}" fill="${RED}"/>`;
  // faint isometric grid floor
  for (let i = 0; i <= 8; i++) { const a = iso(i - .5, -.5, -.5, sc, ox, oy), b = iso(i - .5, 7.5, -.5, sc, ox, oy), c = iso(-.5, i - .5, -.5, sc, ox, oy), d = iso(7.5, i - .5, -.5, sc, ox, oy); s += `<line x1="${r(a[0])}" y1="${r(a[1])}" x2="${r(b[0])}" y2="${r(b[1])}" stroke="${INK}" stroke-width=".6" opacity=".35"/><line x1="${r(c[0])}" y1="${r(c[1])}" x2="${r(d[0])}" y2="${r(d[1])}" stroke="${INK}" stroke-width=".6" opacity=".35"/>`; }
  s += `<polyline points="${P(pr)}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" opacity=".85"/>`;
  pr.forEach((p, i) => { if (i % 4 === 0 || i === pr.length - 1) s += `<circle cx="${r(p[0])}" cy="${r(p[1])}" r="${i === 0 || i === pr.length - 1 ? 7 : 4}" fill="${INK}" opacity=".8"/>`; });
  const blk = (x, y, lines, anchor = 'start') => lines.map((t, i) => `<text x="${x}" y="${y + i * 28}" class="t" text-anchor="${anchor}">${t}</text>`).join('');
  s += blk(90, 100, ['ISOMETRIC SYSTEM', 'V.01']) + blk(W - 90, 100, ['SPACE-FILLING', 'FAMILY 03'], 'end');
  s += blk(90, H - 330, ['HILBERT CURVE IN', 'THREE DIMENSIONS,', 'ORDER 3: ONE PATH', 'THROUGH 512 CELLS,', 'EACH VISITED ONCE.']);
  s += blk(W - 90, H - 330, ['8 × 8 × 8 LATTICE', 'ISO 30° PROJECTION', 'NODES EVERY 4TH STEP'], 'end');
  s += `<text x="90" y="${H - 80}" class="big">HILBERT³</text><text x="${W - 90}" y="${H - 80}" class="t" text-anchor="end">ISO / 004</text>`;
  s += `<rect width="${W}" height="${H}" fill="#000" filter="url(#n)" opacity=".5"/>`;
  emit('IsoHilbert', 'Isometric · 3D Hilbert curve', W, H, `.t{font:500 20px 'IBM Plex Mono';fill:${INK};letter-spacing:.04em}.big{font:700 64px 'IBM Plex Mono';fill:${INK};letter-spacing:-.01em}`, s, RED);
}
