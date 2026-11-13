// Paper dialect, structured like ref #3: protocol column + 2D surface with raster/contour halves and axis projections.
const { emit, r } = require('./common.cjs');
const W = 1920, H = 1080, BLUE = '#2459b3', INK = '#1a2433', MUTE = '#5a6878';
const EX = 0.08; // assumed excess drift
const g = (f, s) => f * EX - 0.5 * f * f * s * s;
// plot frame: x = leverage 0..4.5, y = sigma 10%..40% (top→bottom)
const X0 = 880, Y0 = 210, S = 660, FMAX = 4.5, SMIN = 0.10, SMAX = 0.40;
const sx = (f) => X0 + f / FMAX * S, sy = (s) => Y0 + (s - SMIN) / (SMAX - SMIN) * S;
const fx = (x) => (x - X0) / S * FMAX, sg = (y) => SMIN + (y - Y0) / S * (SMAX - SMIN);
let s = `<defs><filter id="b40"><feGaussianBlur stdDeviation="40"/></filter><clipPath id="plot"><rect x="${X0}" y="${Y0}" width="${S}" height="${S}"/></clipPath>
<clipPath id="upper"><polygon points="${X0},${Y0} ${X0 + S},${Y0} ${X0},${Y0 + S}"/></clipPath><clipPath id="lower"><polygon points="${X0 + S},${Y0} ${X0 + S},${Y0 + S} ${X0},${Y0 + S}"/></clipPath>
<pattern id="fine" width="11" height="11" patternUnits="userSpaceOnUse"><path d="M11,0H0V11" fill="none" stroke="${BLUE}" stroke-opacity=".08"/></pattern></defs>`;
s += `<rect width="${W}" height="${H}" fill="#e9eef3"/>`;
s += `<g filter="url(#b40)" opacity=".55"><path d="M-100,560 C200,380 360,760 640,560 S1100,380 1400,600 S1900,420 2050,560 L2050,640 C1700,520 1500,760 1200,680 S600,520 300,700 S-50,640 -100,700Z" fill="#c3d3e2"/><ellipse cx="300" cy="300" rx="320" ry="80" fill="#d3dfe9"/></g>`;
// registration crosses
for (let x = 768; x <= 1740; x += 192) for (const y of [108, 972]) s += `<path d="M${x - 5},${y}h10M${x},${y - 5}v10" class="plus"/>`;
for (const y of [324, 540, 756]) for (const x of [768, 1728]) s += `<path d="M${x - 5},${y}h10M${x},${y - 5}v10" class="plus"/>`;
for (const [x, y] of [[96, 96], [1820, 96], [96, 980], [1820, 980]]) s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${INK}"/>`;

// ---- left protocol column ---------------------------------------------------
s += `<text x="96" y="118" class="h1">KATANAVIEW</text><text x="96" y="140" class="lab">RISK LAB · PORTFOLIO MECHANICS</text>`;
s += `<rect x="96" y="196" width="318" height="20" fill="${INK}"/><text x="104" y="211" class="bar">SIZING PROTOCOL · 2D-KELLY</text>`;
s += `<text x="96" y="272" class="lab b">ONE SURFACE, TWO RISK AXES</text>`;
const tabs = [['1D', 44], ['2D-KELLY', 112, 1], ['DRAWDOWN', 118], ['MONTE CARLO', 146]]; let tx = 96;
for (const [t, w, on] of tabs) { s += `<rect x="${tx}" y="318" width="${w}" height="24" fill="${on ? BLUE : 'none'}" stroke="${on ? BLUE : '#8494a6'}"/><text x="${tx + w / 2}" y="335" class="tab" text-anchor="middle" style="fill:${on ? '#fff' : MUTE}">${t}</text>`; tx += w + 7; }
s += `<circle cx="${tx + 10}" cy="330" r="3.5" fill="${BLUE}" class="live"/><text x="${tx + 20}" y="334" class="lab">LAST RUN 2 MIN AGO</text>`;
const rows = [['INSTRUMENT', '600519.XSHG'], ['DRIFT μ − r', '8.0 %/YR, ASSUMED'], ['LEVERAGE AXIS', '0 – 4.5 ×'], ['VOLATILITY AXIS', '10 – 40 %/YR'], ['MODEL', 'GBM, LOG UTILITY'], ['SURFACE', 'g = f(μ−r) − ½ f²σ²'], ['CONTOURS', '7 LEVELS, LINEAR']];
rows.forEach(([k, v], i) => { const y = 410 + i * 26; s += `<text x="96" y="${y}" class="lab">${k}</text><text x="330" y="${y}" class="lab b">${v}</text><line x1="96" y1="${y + 9}" x2="620" y2="${y + 9}" class="hair"/>`; });
s += `<text x="96" y="628" class="h3">READINGS</text>`;
[[0.15], [0.20], [0.30], [0.40]].forEach(([sig], i) => { const fs = EX / sig ** 2, gs = EX ** 2 / (2 * sig ** 2); const y = 658 + i * 24;
  s += `<text x="96" y="${y}" class="lab b">σ ${(sig * 100).toFixed(0)} %</text><text x="210" y="${y}" class="lab">F*</text><text x="250" y="${y}" class="lab b">${fs.toFixed(2)} ×</text><text x="350" y="${y}" class="lab">G*</text><text x="390" y="${y}" class="lab b">${(gs * 100).toFixed(1)} %</text>`; });
s += `<rect x="96" y="770" width="524" height="210" fill="${BLUE}"/><text x="120" y="814" class="blk1">02</text><text x="120" y="872" class="blk2">LOG-OPTIMAL</text><text x="120" y="896" class="blk2">POSITION SIZING</text><text x="120" y="958" class="blk3">KELLY 1956 · THORP 2006</text><path d="M596,790v14h-14" stroke="#fff" fill="none"/>`;

// ---- surface ------------------------------------------------------------
s += `<rect x="${X0}" y="${Y0}" width="${S}" height="${S}" fill="#f2f6f9"/><rect x="${X0}" y="${Y0}" width="${S}" height="${S}" fill="url(#fine)"/>`;
// raster (upper-left half): one square per cell, opacity = g / cap
const N = 30, C = S / N; let ras = '';
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  if (i + j > N - 1) continue;
  const v = g(fx(X0 + (i + .5) * C), sg(Y0 + (j + .5) * C)); if (v <= 0) continue;
  const o = Math.min(1, v / 0.16); if (o < .06) continue;
  ras += `<rect x="${r(X0 + i * C + .5)}" y="${r(Y0 + j * C + .5)}" width="${r(C - 1)}" height="${r(C - 1)}" fill-opacity="${o.toFixed(2)}"/>`;
}
s += `<g fill="${BLUE}" clip-path="url(#upper)" class="ras">${ras}</g>`;
// contours (lower-right half) via marching squares
let iso = ''; const st = 4;
for (const lev of [0, 0.02, 0.04, 0.06, 0.08, 0.12, 0.16]) for (let y = Y0; y < Y0 + S; y += st) for (let x = X0; x < X0 + S; x += st) {
  const a = g(fx(x), sg(y)) - lev, b = g(fx(x + st), sg(y)) - lev, c = g(fx(x + st), sg(y + st)) - lev, d = g(fx(x), sg(y + st)) - lev, p = [];
  if (a * b < 0) p.push([x + st * a / (a - b), y]); if (b * c < 0) p.push([x + st, y + st * b / (b - c)]); if (c * d < 0) p.push([x + st * d / (d - c), y + st]); if (d * a < 0) p.push([x, y + st * a / (a - d)]);
  if (p.length >= 2) iso += `M${r(p[0][0])},${r(p[0][1])}L${r(p[1][0])},${r(p[1][1])}`;
}
s += `<path d="${iso}" fill="none" stroke="${BLUE}" stroke-width="1.2" clip-path="url(#lower)" class="iso"/>`;
// ridge f* = μ/σ² and zero line 2f*
const curve = (k) => { let d = ''; for (let y = Y0; y <= Y0 + S; y += 3) { const f = k * EX / sg(y) ** 2; if (f > FMAX) continue; d += `${d ? 'L' : 'M'}${r(sx(f))},${y}`; } return d; };
s += `<g clip-path="url(#plot)"><path d="${curve(1)}" fill="none" stroke="${INK}" stroke-width="1.6" class="ridge"/><path d="${curve(2)}" fill="none" stroke="${INK}" stroke-dasharray="4 4"/></g>`;
s += `<line x1="${X0}" y1="${Y0 + S}" x2="${X0 + S}" y2="${Y0}" stroke="${INK}" stroke-dasharray="3 5" stroke-opacity=".6"/>`;
s += `<text transform="translate(${X0 + S * .62},${Y0 + S * .38}) rotate(-45)" class="lab" text-anchor="middle">RASTER  /  KONTUR</text>`;
s += `<rect x="${X0}" y="${Y0}" width="${S}" height="${S}" fill="none" stroke="${INK}"/><text x="${X0 + 10}" y="${Y0 + 18}" class="tab" style="fill:${BLUE}">RASTER</text><text x="${X0 + S - 8}" y="${Y0 + S - 10}" class="tab" text-anchor="end" style="fill:${INK}">KONTUR</text>`;
// crosshair at σ = 20 %, f = 2.0
const cxv = sx(2), cyv = sy(0.20);
s += `<line x1="${r(cxv)}" y1="50" x2="${r(cxv)}" y2="${Y0 + S}" class="cross"/><line x1="720" y1="${r(cyv)}" x2="${X0 + S}" y2="${r(cyv)}" class="cross"/><circle cx="${r(cxv)}" cy="${r(cyv)}" r="5" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
// top projection: g(f) at σ = 20 %
let top = ''; for (let f = 0; f <= FMAX; f += 0.02) top += `${top ? 'L' : 'M'}${r(sx(f))},${r(184 - Math.max(-0.02, g(f, 0.2)) / 0.08 * 110)}`;
s += `<line x1="${X0}" y1="184" x2="${X0 + S}" y2="184" stroke="${INK}"/><path d="${top}" fill="none" stroke="${INK}" stroke-width="1.4" class="draw" pathLength="1"/><text x="${X0 + S + 12}" y="188" class="lab">σ = 20 %</text>`;
// left projection: g*(σ) = μ²/2σ² (capped)
let lft = ''; for (let y = Y0; y <= Y0 + S; y += 3) { const v = Math.min(0.32, EX ** 2 / (2 * sg(y) ** 2)); lft += `${lft ? 'L' : 'M'}${r(854 - v / 0.32 * 120)},${y}`; }
s += `<line x1="854" y1="${Y0}" x2="854" y2="${Y0 + S}" stroke="${INK}"/><path d="${lft}" fill="none" stroke="${INK}" stroke-width="1.4" class="draw" pathLength="1"/><text x="${734}" y="${Y0 - 8}" class="lab">MAX G*(σ)</text>`;
// axes
for (let f = 0; f <= FMAX + 1e-9; f += 0.5) s += `<line x1="${r(sx(f))}" y1="${Y0 + S}" x2="${r(sx(f))}" y2="${Y0 + S + 6}" stroke="${INK}"/><text x="${r(sx(f))}" y="${Y0 + S + 26}" class="ax" text-anchor="middle">${f.toFixed(1)}</text>`;
for (let v = 0.10; v <= 0.4001; v += 0.05) s += `<line x1="${X0 + S}" y1="${r(sy(v))}" x2="${X0 + S + 6}" y2="${r(sy(v))}" stroke="${INK}"/><text x="${X0 + S + 14}" y="${r(sy(v) + 4)}" class="ax">${(v * 100).toFixed(0)}</text>`;
s += `<text x="${X0}" y="${Y0 + S + 56}" class="lab">F · LEVERAGE (×)</text><text transform="translate(${X0 + S + 70},${Y0}) rotate(90)" class="lab">σ · VOLATILITY (%/YR)</text>`;
// handwriting
s += `<text x="${X0 + 300}" y="${Y0 + S - 120}" class="hand" transform="rotate(-6 ${X0 + 300} ${Y0 + S - 120})">Kelly ridge</text><text x="${X0 + 316}" y="${Y0 + S - 78}" class="hand" transform="rotate(-6 ${X0 + 316} ${Y0 + S - 78})">f* = μ / σ²</text>`;
s += `<path d="M${X0 + 290},${Y0 + S - 110} C${X0 + 220},${Y0 + S - 100} ${X0 + 200},${Y0 + S - 160} ${r(sx(EX / 0.33 ** 2) + 10)},${r(sy(0.33) + 4)}" class="pen"/><path d="M${r(sx(EX / 0.33 ** 2) + 26)},${r(sy(0.33) - 6)} L${r(sx(EX / 0.33 ** 2) + 10)},${r(sy(0.33) + 4)} L${r(sx(EX / 0.33 ** 2) + 28)},${r(sy(0.33) + 12)}" class="pen"/>`;
s += `<path d="M${X0 + 430},${Y0 + 120} c20,-14 40,-14 56,0 s36,14 56,0" class="pen"/><text x="${X0 + 552}" y="${Y0 + 128}" class="hand" style="font-size:22px">2f*</text>`;
// header right + footer
s += `<text x="1824" y="118" class="h1" text-anchor="end">KTV/RSK-02</text><text x="1824" y="140" class="lab" text-anchor="end">SHEET 02 / 03</text>`;
s += `<text x="96" y="1040" class="foot">SOURCES: J. L. KELLY JR., BELL SYST. TECH. J. 35 (1956) 917–926; E. O. THORP (2006). SURFACE COMPUTED FROM THE CLOSED FORM; DRIFT ASSUMED.</text>`;
s += `<text x="1824" y="1040" class="foot" text-anchor="end">CONCEPT STUDY · KATANAVIEW RISK LAB</text>`;
['#2459b3', '#2a8fa0', '#6b8a2a', '#b07a1e', '#c23d3d', '#9b3c8f', '#6d7a86'].forEach((c, i) => s += `<rect x="${1656 + i * 24}" y="1004" width="22" height="5" fill="${c}"/>`);

const css = `
.h1{font:400 17px Michroma;fill:${INK};letter-spacing:.18em}.h3{font:400 13px Michroma;fill:${INK};letter-spacing:.2em}
.lab{font:400 10px 'IBM Plex Mono';fill:${MUTE};letter-spacing:.14em}.b{fill:${INK};font-weight:500}
.ax{font:400 11px 'IBM Plex Mono';fill:${INK};letter-spacing:.08em}
.bar{font:400 12px Michroma;fill:#fff;letter-spacing:.12em}.tab{font:400 10px Michroma;letter-spacing:.1em}
.blk1{font:500 22px 'IBM Plex Mono';fill:#fff}.blk2{font:400 14px Michroma;fill:#fff;letter-spacing:.14em}.blk3{font:400 9px 'IBM Plex Mono';fill:#dbe6f6;letter-spacing:.16em}
.hair{stroke:${INK};stroke-opacity:.15}.plus{stroke:${INK};stroke-opacity:.35}
.cross{stroke:${INK};stroke-dasharray:1.5 3;stroke-opacity:.7}
.hand{font:30px 'Nothing You Could Do';fill:${INK}}.pen{fill:none;stroke:${INK};stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.foot{font:400 8.5px 'IBM Plex Mono';fill:${MUTE};letter-spacing:.14em}
@keyframes live{0%,100%{opacity:1}50%{opacity:.2}}.live{animation:live 1.6s ease-in-out infinite}
@keyframes draw{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}.draw{animation:draw 2.4s cubic-bezier(.2,.8,.2,1) both}
@keyframes rasIn{from{opacity:0}to{opacity:1}}.ras{animation:rasIn 1.2s ease-out .3s both}
@keyframes flow{to{stroke-dashoffset:-40}}.ridge{stroke-dasharray:10 6;animation:flow 4s linear infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit('PaperNMR', 'RSK-02 · 2D-Kelly (Paper, ref 3 structure)', W, H, css, s, '#e9eef3');
