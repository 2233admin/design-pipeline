// Style of ref #2: chrome-machine key visual. The machine itself is a 3D render slot; type/data/HUD layers are final.
const { emit, rng, r } = require('./common.cjs');
const W = 1920, H = 1080;
const AMBER = '#e9a23b', WHITE = '#f1f4f2', INK = '#27302d';
let s = `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d3dad5"/><stop offset=".55" stop-color="#b3bdb7"/><stop offset="1" stop-color="#7f8a85"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f7a75" stop-opacity="0"/><stop offset="1" stop-color="#3c4541"/></linearGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .32 0 0 0 0 .3 0 0 0 .12 0"/></filter>
<filter id="b20"><feGaussianBlur stdDeviation="20"/></filter>
<pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${WHITE}" stroke-opacity=".22" stroke-width="1"/></pattern>
<clipPath id="slot"><rect x="300" y="110" width="1400" height="760"/></clipPath>
</defs>`;
s += `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
s += `<rect y="760" width="${W}" height="320" fill="url(#floor)"/>`;
// dark left plate with blurred band (stand-in for photo plate)
s += `<rect x="0" y="230" width="270" height="420" fill="#2c3431"/><ellipse cx="120" cy="440" rx="160" ry="50" fill="#8a6a55" opacity=".55" filter="url(#b20)"/>`;
// dotted concentric arcs (left)
let dots = '';
for (let k = 0; k < 7; k++) { const R = 120 + k * 46; for (let a = -1.3; a <= 1.3; a += 0.13) { const x = 330 + Math.cos(a + Math.PI) * -R * 0.98, y = 430 + Math.sin(a) * R; if (x > 120) dots += `<circle cx="${r(x - R * 0.15)}" cy="${r(y)}" r="${k % 2 ? 7 : 5}"/>`; } }
s += `<g fill="${WHITE}" opacity=".8">${dots}</g>`;
for (let k = 0; k < 4; k++) s += `<circle cx="330" cy="430" r="${150 + k * 90}" fill="none" stroke="${WHITE}" stroke-opacity=".35"/>`;
// topographic loops (right)
let topo = '';
for (let k = 0; k < 16; k++) { let d = ''; for (let t = 0; t <= 6.3; t += 0.06) { const R = 70 + k * 26 + 18 * Math.sin(3 * t + k * 0.3) + 10 * Math.cos(5 * t); d += `${t ? 'L' : 'M'}${r(1560 + Math.cos(t) * R * 1.25)},${r(300 + Math.sin(t) * R * 0.8)}`; } topo += `<path d="${d}Z"/>`; }
s += `<g fill="none" stroke="${WHITE}" stroke-opacity=".45" stroke-width="1.4">${topo}</g>`;
// step pattern (right edge)
let steps = ''; for (let i = 0; i < 6; i++) steps += `<rect x="${1760 + (i % 2) * 40}" y="${700 + i * 40}" width="40" height="40" fill="${WHITE}" opacity=".35"/>`;
s += steps;
s += `<rect width="${W}" height="${H}" filter="url(#grain)"/>`;

// ---- 3D render slot: wireframe guide of the machine (to be replaced by a render) ----
s += `<rect x="300" y="110" width="1400" height="760" fill="url(#hatch)" stroke="${WHITE}" stroke-opacity=".55" stroke-dasharray="6 6"/>`;
let wire = '';
// cyclotron seen at ~55° tilt: magnet poles, two dees, the beam spiral (r ∝ √turns), deflector, target
const CX0 = 1000, CY0 = 470, RD = 300, TILT = .5;
const P = (x, y, z = 0) => `${r(CX0 + x)},${r(CY0 + y * TILT - z)}`;
const ring = (rr, z) => { let d = ''; for (let a = 0; a <= 360; a += 6) { const t = a * Math.PI / 180; d += `${a ? 'L' : 'M'}${P(Math.cos(t) * rr, Math.sin(t) * rr, z)}`; } return d + 'Z'; };
wire += `<path d="${ring(RD + 60, 120)}"/><path d="${ring(RD + 60, 150)}"/><path d="${ring(RD + 60, -40)}"/><path d="${ring(RD + 60, -70)}"/>`;
for (const a of [0, 90, 180, 270]) { const t = a * Math.PI / 180; wire += `<path d="M${P(Math.cos(t) * (RD + 60), Math.sin(t) * (RD + 60), 150)} L${P(Math.cos(t) * (RD + 60), Math.sin(t) * (RD + 60), -70)}"/>`; }
const dee = (side) => { let d = ''; for (let a = -90; a <= 90; a += 6) { const t = a * Math.PI / 180; d += `${a === -90 ? 'M' : 'L'}${P(side * (Math.cos(t) * RD + 14), Math.sin(t) * RD, 30)}`; } return d + 'Z'; };
wire += `<path d="${dee(1)}"/><path d="${dee(-1)}"/>`;
let sp = ''; for (let th = 0; th <= 2 * Math.PI * 9; th += 0.05) { const rr = 38 * Math.sqrt(th); if (rr > RD - 10) break; sp += `${sp ? 'L' : 'M'}${P(Math.cos(th) * rr, Math.sin(th) * rr, 30)}`; }
wire += `<path d="${sp}" class="beam" stroke-width="1.6"/>`;
wire += `<path d="M${P(RD - 10, 0, 30)} L${P(RD + 140, -60, 30)} L${P(RD + 330, -110, 30)}"/>`;
wire += `<path d="M${P(RD + 320, -150, 0)} h 40 v 70 h -40 Z M${P(RD + 330, -150, 0)} v 70"/>`;
wire += `<path d="M${P(-RD - 60, 0, 60)} H 420 M${P(-RD - 60, 0, 40)} H 420"/>`;
s += `<g clip-path="url(#slot)" fill="none" stroke="${WHITE}" stroke-width="1.3" stroke-opacity=".9">${wire}</g>`;
// slot annotations
s += `<text x="316" y="138" class="m">SLOT A / 3D RENDER / 1400 × 760</text><text x="1684" y="138" class="m" text-anchor="end">REPLACE WITH RENDER · KEEP TYPE LAYER</text>`;
s += `<path d="M300,96 V86 H1700 V96" fill="none" stroke="${WHITE}"/><text x="1000" y="80" class="m" text-anchor="middle">1400</text>`;
// leader-line callouts
[[1300, 470, 1500, 210, 'DEE / polished copper'], [1000, 330, 620, 200, 'MAGNET POLE / matte painted steel'], [1080, 520, 470, 880, 'BEAM / iridescent film, r ∝ √n'], [1640, 360, 1520, 120, 'TARGET / molybdenum foil']].forEach(([x0, y0, x1, y1, t]) => {
  s += `<circle cx="${x0}" cy="${y0}" r="4" fill="${WHITE}"/><path d="M${x0},${y0} L${x1},${y1}" stroke="${WHITE}" stroke-width="1"/><text x="${x1 + 6}" y="${y1 - 6}" class="m">${t}</text>`;
});

// amber slash (the single accent)
s += `<polygon points="1660,330 1740,330 1490,700 1410,700" fill="${AMBER}"/>`;
// HUD marks
s += `<path d="M1740,250 h90 M1785,205 v90" stroke="${WHITE}" stroke-width="5"/><path d="M640,940 h50 M665,915 v50" stroke="${WHITE}" stroke-width="3"/><path d="M1790,700 h40" stroke="${WHITE}" stroke-width="3"/>`;
s += `<text x="440" y="300" class="m">Technetium</text><text x="930" y="660" class="m">[43]</text><text x="1300" y="660" class="m">(97)</text>`;
// data card behind wordmark
s += `<rect x="1150" y="780" width="270" height="220" fill="none" stroke="${WHITE}" stroke-opacity=".5"/><rect x="1420" y="780" width="290" height="220" fill="none" stroke="${WHITE}" stroke-opacity=".5"/>`;
s += `<text x="1160" y="830" class="dc">43</text><text x="1440" y="830" class="dc">[Kr]4d⁵5s²</text>`;
// spec micro-text block
['found   Perrier & Segrè, Palermo, 1937', 'source  Mo foil from the Berkeley cyclotron', 'named   technetos, "artificial" (1947)', 'melts   2157 °C · boils 4265 °C · 11 g/cm³', 'shells  2 8 18 13 2 · Tc-97 t½ 4.21 Myr'].forEach((t, i) => s += `<text x="330" y="${930 + i * 16}" class="xs">${t}</text>`);

// wordmark with glitch: ghost outline copy + sliced offsets
const WM = (dx, dy, cls) => `<text x="${860 + dx}" y="${1000 + dy}" class="${cls}">Technetium</text>`;
s += WM(70, -6, 'wm ghost');
s += `<clipPath id="c1"><rect x="0" y="0" width="1920" height="930"/></clipPath><clipPath id="c2"><rect x="0" y="930" width="1920" height="22"/></clipPath><clipPath id="c3"><rect x="0" y="952" width="1920" height="200"/></clipPath>`;
s += `<g clip-path="url(#c1)">${WM(0, 0, 'wm')}</g><g clip-path="url(#c2)">${WM(9, 0, 'wm')}</g><g clip-path="url(#c3)">${WM(-6, 0, 'wm')}</g>`;
rng(8); for (let i = 0; i < 10; i++) { const x = 880 + rng() * 880; s += `<rect x="${r(x)}" y="${r(880 + rng() * 110)}" width="${r(6 + rng() * 30)}" height="${r(3 + rng() * 6)}" fill="${INK}" opacity=".85"/>`; }
s += `<text x="880" y="1062" class="sub">Element Series 01 · the first artificial element</text><text x="1870" y="1062" class="sub" text-anchor="end">render / TBD</text><text x="850" y="1052" class="m">43</text>`;
// glitch hairlines at the floor
rng(12); for (let i = 0; i < 60; i++) { const x = 900 + rng() * 800; const c = ['#c9e4dc', '#e8c38a', '#b6c7e9', '#f1f4f2'][i % 4]; s += `<line x1="${r(x)}" y1="${r(990 + rng() * 40)}" x2="${r(x)}" y2="1080" stroke="${c}" stroke-opacity=".45"/>`; }

// emblem bottom-left: KATANAview mark in a diamond
s += `<g transform="translate(180,950)" fill="none" stroke="${WHITE}" stroke-width="2"><path d="M0,-90 L90,0 L0,90 L-90,0 Z"/><path d="M0,-70 L70,0 L0,70 L-70,0 Z"/><path d="M-110,-40 L-40,-110 M40,110 L110,40 M-110,40 L-40,110 M40,-110 L110,-40" stroke-width="1"/>
<rect x="-22" y="-22" width="44" height="44" stroke-width="3"/><path d="M-16,16 L16,-16" stroke-width="3"/></g><text x="180" y="1068" class="xs" text-anchor="middle">KATANAVIEW / 2026</text>`;

const css = `
.m{font:400 14px 'IBM Plex Mono';fill:${WHITE};letter-spacing:.04em}
.xs{font:400 10px 'IBM Plex Mono';fill:${WHITE};opacity:.85;white-space:pre}
.dc{font:500 34px 'Inter Tight';fill:${WHITE};opacity:.45}
.wm{font:600 150px 'Inter Tight';fill:#eef3f0;letter-spacing:-.02em}
.ghost{fill:none;stroke:${WHITE};stroke-width:2;opacity:.55}
.sub{font:italic 400 30px 'Inter Tight';fill:${WHITE}}
@keyframes beam{to{stroke-dashoffset:-50}}.beam{stroke:${AMBER};stroke-dasharray:40 10;animation:beam 1.2s linear infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
.art{font:italic 400 44px 'Inter Tight';fill:${WHITE}}`;
emit('Radium', 'Technetium · Key Visual (render slot)', W, H, css, s, '#b3bdb7');
