// KATANAview specimen sheet — Kelly growth curve. All curves computed, nothing hand-drawn except the note.
const fs = require('fs');
const { emit } = require('./common.cjs');
const fonts = '';

// ---- model -------------------------------------------------------------
const EX = 0.08;            // mu - r, assumed
const SIG = 0.20;           // sigma, assumed
const g = (f, s = SIG) => f * EX - 0.5 * f * f * s * s;   // excess log-growth
const fStar = EX / (SIG * SIG);                            // 2.0
const gStar = g(fStar);                                    // 0.08

// ---- chart frame --------------------------------------------------------
const X0 = 190, X1 = 1560, Y0 = 350, Y1 = 880;
const FMAX = 4.5, GMIN = -4, GMAX = 12;
const sx = (f) => X0 + (f / FMAX) * (X1 - X0);
const sy = (gp) => Y1 - ((gp - GMIN) / (GMAX - GMIN)) * (Y1 - Y0);
const curve = (s, a = 0, b = FMAX, n = 300) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = a + (b - a) * i / n, v = g(f, s) * 100;
    if (v < GMIN - 0.2) break;
    pts.push(`${sx(f).toFixed(2)},${sy(v).toFixed(2)}`);
  }
  return pts;
};
const r = (x) => x.toFixed(2);

let svg = '';
// grid: vertical every 0.25x, horizontal every 1%
for (let f = 0; f <= FMAX + 1e-9; f += 0.25) svg += `<line x1="${r(sx(f))}" y1="${Y0}" x2="${r(sx(f))}" y2="${Y1}" class="grid${Math.abs(f % 1) < 1e-9 ? ' major' : ''}"/>`;
for (let v = GMIN; v <= GMAX; v += 1) svg += `<line x1="${X0}" y1="${r(sy(v))}" x2="${X1}" y2="${r(sy(v))}" class="grid${v % 4 === 0 ? ' major' : ''}"/>`;

// fills: 0..f* solid, f*..2f* hatched
const zero = sy(0);
const area = (a, b) => `M${r(sx(a))},${r(zero)} L${curve(SIG, a, b).join(' L')} L${r(sx(b))},${r(zero)} Z`;
svg += `<path d="${area(0, fStar)}" fill="#e2702a" opacity=".92"/>`;
svg += `<path d="${area(fStar, 2 * fStar)}" fill="url(#hatch)"/>`;
svg += `<path d="${area(fStar, 2 * fStar)}" fill="#e2702a" opacity=".07"/>`;

/*GHOSTS*/
const ghosts = [0.18, 0.22, 0.25, 0.30];
for (const s of ghosts) {
  svg += `<polyline points="${curve(s).join(' ')}" class="ghost"/>`;
  const s2 = s * s, fe = (EX + Math.sqrt(EX * EX + 2 * s2 * 0.04)) / s2; // where g = -4%
  if (fe > FMAX) svg += `<text x="${X1 - 6}" y="${r(sy(g(FMAX, s) * 100) - 8)}" class="gl" text-anchor="end">σ ${Math.round(s * 100)}</text>`;
  else svg += `<text x="${r(sx(fe) + 6)}" y="${Y1 - 8}" class="gl">σ ${Math.round(s * 100)}</text>`;
}

// zero line + g* line
svg += `<line x1="${X0}" y1="${r(zero)}" x2="${X1}" y2="${r(zero)}" class="axis"/>`;
svg += `<line x1="${X0}" y1="${r(sy(gStar * 100))}" x2="${X1}" y2="${r(sy(gStar * 100))}" class="dash-o"/>`;
svg += `<text x="${X1 + 14}" y="${r(sy(gStar * 100) + 4)}" class="ol">+${(gStar * 100).toFixed(2)}</text>`;
svg += `<text x="${X1 + 14}" y="${r(zero + 4)}" class="tl">0.00</text>`;
// main curve
svg += `<polyline points="${curve(SIG).join(' ')}" class="main"/>`;
// crosshair at f*
svg += `<line x1="${r(sx(fStar))}" y1="${Y0 - 92}" x2="${r(sx(fStar))}" y2="${Y1}" class="dot-v"/>`;
svg += `<path d="M${r(sx(fStar) - 8)},${r(sy(gStar * 100))}h16M${r(sx(fStar))},${r(sy(gStar * 100) - 8)}v16" class="cross"/>`;

// markers
const marks = [[0, 'F0'], [fStar / 2, '½K'], [fStar, 'K'], [1.5 * fStar, '1½K'], [2 * fStar, '2K']];
for (const [f, lab] of marks) {
  const x = sx(f), y = sy(g(f) * 100);
  svg += `<rect x="${r(x - 4)}" y="${r(y - 4)}" width="8" height="8" class="mk"/>`;
  svg += `<text x="${r(x)}" y="${r(zero + 22)}" class="tl" text-anchor="middle">${lab}</text>`;
}

// axes ticks + labels
for (let f = 0; f <= FMAX + 1e-9; f += 0.5) {
  svg += `<line x1="${r(sx(f))}" y1="${Y1}" x2="${r(sx(f))}" y2="${Y1 + 10}" class="axis"/>`;
  svg += `<text x="${r(sx(f))}" y="${Y1 + 30}" class="tl" text-anchor="middle">${f.toFixed(1)}×</text>`;
}
for (let v = GMIN; v <= GMAX; v += 4) {
  svg += `<line x1="${X0 - 10}" y1="${r(sy(v))}" x2="${X0}" y2="${r(sy(v))}" class="axis"/>`;
  svg += `<text x="${X0 - 18}" y="${r(sy(v) + 4)}" class="tl" text-anchor="end">${v > 0 ? '+' : ''}${v}%</text>`;
}
svg += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" class="frame"/>`;
svg += `<text x="${X0}" y="${Y1 + 62}" class="cap">F · LEVERAGE, MULTIPLE OF EQUITY</text>`;
svg += `<text transform="translate(${X0 - 92},${Y1}) rotate(-90)" class="cap">G · EXCESS LOG-GROWTH / YEAR</text>`;

// top projection strip: portfolio vol = f·σ
const TY = Y0 - 58;
svg += `<line x1="${X0}" y1="${TY}" x2="${X1}" y2="${TY}" class="axis"/>`;
for (let f = 0; f <= FMAX + 1e-9; f += 0.25) {
  const big = Math.abs(f % 0.5) < 1e-9;
  svg += `<line x1="${r(sx(f))}" y1="${TY}" x2="${r(sx(f))}" y2="${TY - (big ? 10 : 5)}" class="axis"/>`;
  if (Math.abs(f % 1) < 1e-9) svg += `<text x="${r(sx(f))}" y="${TY - 18}" class="tl" text-anchor="middle">${Math.round(f * SIG * 100)}%</text>`;
}
svg += `<rect x="${X0}" y="${TY + 6}" width="${r(sx(fStar) - X0)}" height="5" fill="#e2702a"/>`;
svg += `<rect x="${r(sx(fStar))}" y="${TY + 6}" width="${r(sx(2 * fStar) - sx(fStar))}" height="5" fill="url(#hatch)"/>`;
svg += `<text x="${X1}" y="${TY - 18}" class="tl" text-anchor="end">σp = f · σ</text>`;

// ---- handwritten note (wobbly loop around ½K) --------------------------
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hx = sx(fStar / 2), hy = sy(g(fStar / 2) * 100);
let loop = '';
for (let i = 0; i <= 64; i++) {
  const t = -0.35 + (i / 64) * (Math.PI * 2 + 0.55);
  const w = 1 + (rnd() - 0.5) * 0.06;
  const x = hx + Math.cos(t) * 62 * w, y = hy + Math.sin(t) * 40 * w - i * 0.12;
  loop += (i ? 'L' : 'M') + r(x) + ',' + r(y);
}
svg += `<path d="${loop}" class="hand"/>`;
const ax0 = hx + 150, ay0 = hy - 128, ax1 = hx + 58, ay1 = hy - 34;
svg += `<path d="M${r(ax0)},${r(ay0)} C${r(ax0 - 10)},${r(ay0 + 40)} ${r(ax1 + 40)},${r(ay1 - 30)} ${r(ax1)},${r(ay1)}" class="hand"/>`;
svg += `<path d="M${r(ax1 + 3)},${r(ay1 - 20)} L${r(ax1)},${r(ay1)} L${r(ax1 + 19)},${r(ay1 - 9)}" class="hand"/>`;
svg += `<text x="${r(ax0 - 28)}" y="${r(ay0 - 16)}" class="note" transform="rotate(-4 ${r(ax0)} ${r(ay0)})">half the risk, 3/4 of the growth</text>`;

// ---- right column: protocol table --------------------------------------
const rows = [
  ['INSTRUMENT', '600519.XSHG'],
  ['MODEL', 'GBM, LOG UTILITY'],
  ['μ − r', '8.0 %/YR ASSUMED'],
  ['σ', '20.0 %/YR ASSUMED'],
  ['REBALANCE', 'CONTINUOUS'],
  ['FAMILY', 'σ 18/22/25/30'],
];
let col = '';
const CX = 1640, CW = 220;
col += `<text x="${CX}" y="360" class="sec">PROTOCOL</text>`;
rows.forEach(([k, v], i) => {
  const y = 400 + i * 34;
  col += `<text x="${CX}" y="${y}" class="k">${k}</text><text x="${CX + CW}" y="${y}" class="v" text-anchor="end">${v}</text>`;
  col += `<line x1="${CX}" y1="${y + 12}" x2="${CX + CW}" y2="${y + 12}" class="hair"/>`;
});
col += `<text x="${CX}" y="660" class="sec">READINGS</text>`;
const reads = [['½ K', '1.00×', '+6.00', '75%'], ['K', '2.00×', '+8.00', '100%'], ['1½ K', '3.00×', '+6.00', '75%'], ['2 K', '4.00×', '±0.00', '0%']];
reads.forEach((rw, i) => {
  const y = 698 + i * 28;
  col += `<text x="${CX}" y="${y}" class="v">${rw[0]}</text><text x="${CX + 52}" y="${y}" class="v">${rw[1]}</text><text x="${CX + 168}" y="${y}" class="v" text-anchor="end">${rw[2]}</text><text x="${CX + CW}" y="${y}" class="k" text-anchor="end">${rw[3]}</text>`;
});

// ---- metrics row --------------------------------------------------------
const metrics = [['EXCESS DRIFT', '8.0', '%/YR'], ['VOLATILITY', '20.0', '%/YR'], ['KELLY F*', '2.00', '×'], ['MAX GROWTH', '8.00', '%/YR'], ['VOL AT F*', '40.0', '%'], ['BREAK-EVEN', '4.00', '×']];
let met = '';
metrics.forEach(([k, v, u], i) => {
  const x = 190 + i * 222;
  met += `<line x1="${x}" y1="958" x2="${x}" y2="1022" class="hair2"/>`;
  met += `<text x="${x + 18}" y="972" class="k">${k}</text>`;
  met += `<text x="${x + 18}" y="1012" class="big">${v}<tspan class="unit" dx="10">${u}</tspan></text>`;
});
const LX = 1560;
met += `<rect x="${LX}" y="962" width="22" height="11" fill="#e2702a"/><text x="${LX + 36}" y="972" class="k">0 → F* / EFFICIENT</text>`;
met += `<rect x="${LX}" y="986" width="22" height="11" fill="url(#hatch)"/><text x="${LX + 36}" y="996" class="k">F* → 2F* / DOMINATED</text>`;
met += `<line x1="${LX}" y1="1015" x2="${LX + 22}" y2="1015" class="ghost"/><text x="${LX + 36}" y="1020" class="k">OTHER σ / SAME DRIFT</text>`;

// plus-mark lattice
let plus = '';
for (let x = 190; x <= 1860; x += 238.6) for (const y of [228, 920]) plus += `<path d="M${r(x - 5)},${y}h10M${r(x)},${y - 5}v10" class="plus"/>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>KATANAview · Risk Lab · Sheet 01</title>
<style>${fonts}
html,body{margin:0;background:#0b131c;height:100%}
body{display:flex;align-items:center;justify-content:center;overflow:hidden}
svg{width:100vw;height:100vh;display:block}
text{fill:#c9d4de}
.grid{stroke:#9fb3c6;stroke-opacity:.07;stroke-width:1}.grid.major{stroke-opacity:.14}
.ghost{fill:none;stroke:#c9d4de;stroke-opacity:.32;stroke-width:1}
.main{fill:none;stroke:#f3f6f8;stroke-width:2.2}
.axis{stroke:#9fb3c6;stroke-opacity:.55;stroke-width:1}
.frame{fill:none;stroke:#9fb3c6;stroke-opacity:.35}
.dash-o{stroke:#e2702a;stroke-dasharray:6 5;stroke-width:1.2;opacity:.9}
.dot-v{stroke:#f3f6f8;stroke-dasharray:2 4;stroke-opacity:.6}
.cross{stroke:#f3f6f8;stroke-width:1.4}
.mk{fill:#0b131c;stroke:#f3f6f8;stroke-width:1.4}
.hair{stroke:#9fb3c6;stroke-opacity:.18}.hair2{stroke:#9fb3c6;stroke-opacity:.3}
.plus{stroke:#9fb3c6;stroke-opacity:.35}
.hand{fill:none;stroke:#f3f6f8;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.note{font:30px Hand;fill:#f3f6f8;letter-spacing:.02em}
.tl,.gl,.k,.v,.cap,.sub,.foot{font-family:Plex;letter-spacing:.16em}
.tl{font-size:11px;fill:#8ea2b5}.gl{font-size:10px;fill:#8ea2b5}
.ol{font:500 12px Plex;fill:#e2702a;letter-spacing:.08em}
.cap{font-size:11px;fill:#8ea2b5}
.k{font-size:11px;fill:#8ea2b5}.v{font-size:11px;fill:#dfe7ee}
.sec{font:13px Michroma;letter-spacing:.2em;fill:#dfe7ee}
.big{font:34px Michroma;fill:#f3f6f8;letter-spacing:.02em}.unit{font:11px Plex;fill:#8ea2b5;letter-spacing:.16em}
.h1{font:19px Michroma;letter-spacing:.24em;fill:#f3f6f8}.h2{font:26px Michroma;letter-spacing:.14em;fill:#f3f6f8}
.num{font:46px Michroma;fill:#e2702a}
.sub{font-size:11px;fill:#8ea2b5}.foot{font-size:10px;fill:#6f8396}
</style></head><body>
<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<defs>
 <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#e2702a" stroke-width="1.6"/></pattern>
 <pattern id="dots" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#9fb3c6" opacity=".07"/></pattern>
 <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="46"/></filter>
 <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .8 0 0 0 0 .85 0 0 0 0 .9 0 0 0 .07 0"/></filter>
 <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1722"/><stop offset=".55" stop-color="#132332"/><stop offset="1" stop-color="#0a1119"/></linearGradient>
</defs>
<rect width="1920" height="1080" fill="url(#bg)"/>
<g filter="url(#blur)" opacity=".55">
 <path d="M-100,620 C260,420 520,760 900,560 S1500,380 2050,600 L2050,700 C1500,520 1200,780 880,690 S240,560 -100,760Z" fill="#2b4a66"/>
 <path d="M-100,300 C400,220 800,380 1200,260 S1800,200 2050,280 L2050,330 C1700,260 1300,420 900,360 S200,300 -100,360Z" fill="#203a52"/>
 <ellipse cx="1500" cy="240" rx="320" ry="90" fill="#3a5a76" opacity=".7"/>
</g>
<rect width="1920" height="1080" fill="url(#dots)"/>
<rect width="1920" height="1080" filter="url(#grain)"/>
${[[72, 72], [1842, 72], [72, 1002], [1842, 1002]].map(([x, y]) => `<rect x="${x}" y="${y}" width="6" height="6" fill="#dfe7ee"/>`).join('')}
<g>
 <rect x="96" y="80" width="34" height="34" fill="none" stroke="#dfe7ee" stroke-width="1.4"/>
 <path d="M101,109 L125,85" stroke="#dfe7ee" stroke-width="1.4"/><rect x="117" y="88" width="6" height="6" fill="#e2702a"/>
 <text x="146" y="98" class="h1">KATANAVIEW · RISK LAB</text>
 <text x="146" y="116" class="sub">POSITION SIZING RECORD / LOG-OPTIMAL LEVERAGE</text>
 <text x="1824" y="98" class="h1" text-anchor="end">FILE RSK-0001</text>
 <text x="1824" y="116" class="sub" text-anchor="end">SHEET 01 OF 03 / 600519.XSHG</text>
 <line x1="96" y1="140" x2="1824" y2="140" stroke="#9fb3c6" stroke-opacity=".3"/>
</g>
${plus}
<text x="96" y="208" class="num">01</text>
<text x="212" y="192" class="h2">GROWTH RATE / LEVERAGE</text>
<text x="212" y="214" class="sub">g(f) = r + f(μ − r) − ½ f² σ²  ·  CONTINUOUS-TIME, CONSTANT-PROPORTION REBALANCING</text>
${svg}
${col}
${met}
<line x1="96" y1="1044" x2="1824" y2="1044" stroke="#9fb3c6" stroke-opacity=".22"/>
<text x="96" y="1066" class="foot">SOURCES / J. L. KELLY JR., BELL SYST. TECH. J. 35 (1956) 917–926; E. O. THORP, THE KELLY CRITERION IN BLACKJACK, SPORTS BETTING AND THE STOCK MARKET (2006). CURVES COMPUTED; DRIFT AND VOL ASSUMED.</text>
<text x="1824" y="1066" class="foot" text-anchor="end">KTV / RSK-0001 / 01</text>
</svg></body></html>`;

console.log('fStar', fStar, 'gStar', gStar, 'g(half)', g(fStar / 2), 'g(2f)', g(2 * fStar), 'g(1.5f)', g(1.5 * fStar));

// ---- dialect variants: same data, different ground/type/graphics -------
function variant(name, map, inject) {
  let h = html;
  for (const [a, b] of map) h = h.split(a).join(b);
  for (const [anchor, add, before] of inject) h = h.replace(anchor, before ? add + anchor : anchor + add);
  return h;
}
const paper = variant('paper', [
  ['#e2702a', '#2459b3'], ['#0d1722', '#eef2f6'], ['#132332', '#e4ecf3'], ['#0a1119', '#e9eef3'], ['#0b131c', '#edf1f5'],
  ['#2b4a66', '#bccfe2'], ['#203a52', '#cddbe8'], ['#3a5a76', '#aec5dc'],
  ['#f3f6f8', '#142233'], ['#dfe7ee', '#1d2a3a'], ['#c9d4de', '#2a3a4c'], ['#8ea2b5', '#5a6e83'], ['#6f8396', '#6b7d90'], ['#9fb3c6', '#45607c'],
  ['0 0 0 0 .8 0 0 0 0 .85 0 0 0 0 .9 0 0 0 .07 0', '0 0 0 0 .1 0 0 0 0 .15 0 0 0 0 .2 0 0 0 .05 0'],
  ['fill="#2459b3" opacity=".92"', 'fill="#2459b3" opacity=".85"'],
], [
  ['${met}', '', false],
  ['<line x1="96" y1="1044"', `<rect x="1640" y="806" width="220" height="128" fill="#2459b3"/><text x="1658" y="842" style="font:22px Michroma;fill:#fff">01</text><text x="1658" y="886" style="font:11px Plex;letter-spacing:.16em;fill:#fff">LOG-OPTIMAL SIZING</text><text x="1658" y="918" style="font:9px Plex;letter-spacing:.16em;fill:#dbe6f6">KELLY 1956 · THORP 2006</text><path d="M1842,812v10h-10" stroke="#fff" fill="none"/>`, true],
  ['<line x1="96" y1="1044"', `<g>${['#2459b3', '#2a8fa0', '#6b8a2a', '#b07a1e', '#c23d3d', '#9b3c8f', '#6d7a86'].map((c, i) => `<rect x="${1700 + i * 22}" y="1034" width="20" height="5" fill="${c}"/>`).join('')}</g>`, true],
]);
const field = variant('field', [
  ['#e2702a', '#f5c518'], ['#0d1722', '#f3f2ed'], ['#132332', '#eceae3'], ['#0a1119', '#e6e4dc'], ['#0b131c', '#f1f0ea'],
  ['#2b4a66', '#d9d6cb'], ['#203a52', '#e2dfd6'], ['#3a5a76', '#cfccc0'],
  ['#f3f6f8', '#17191c'], ['#dfe7ee', '#1d2024'], ['#c9d4de', '#2b2f35'], ['#8ea2b5', '#5e6369'], ['#6f8396', '#6e7378'], ['#9fb3c6', '#3a3f45'],
  ['0 0 0 0 .8 0 0 0 0 .85 0 0 0 0 .9 0 0 0 .07 0', '0 0 0 0 .1 0 0 0 0 .1 0 0 0 0 .1 0 0 0 .06 0'],
  ['<line x1="0" y1="0" x2="0" y2="9" stroke="#f5c518"', '<line x1="0" y1="0" x2="0" y2="9" stroke="#17191c"'],
  ['.ol{font:500 12px Plex;fill:#f5c518', '.ol{font:500 12px Plex;fill:#17191c'],
  ['.num{font:46px Michroma;fill:#f5c518}', '.num{font:46px Michroma;fill:#17191c}'],
  ['.dash-o{stroke:#f5c518', '.dash-o{stroke:#17191c'],
  ['class="dot-v"', 'class="dot-v" style="stroke:#17191c"'],
  ['<g>\n <rect x="96" y="80"', '<path d="M72,64H1848V150H90L72,132Z" fill="#1d2024"/><g class="rev">\n <rect x="96" y="80"'],
  ['<text x="${CX}"', '<text x="${CX}"'],
], [
  ['.grid{', '.rev text{fill:#e9e7df !important}.rev .sub,.rev .k{fill:#a9a79f !important}.rev .hair{stroke:#e9e7df;stroke-opacity:.2}.rev rect[fill="none"],.rev path[d^="M101"]{stroke:#e9e7df}\n', true],
  ['<text x="1640" y="360" class="sec">', '<g class="rev"><path d="M1620,322H1880V800H1638L1620,782Z" fill="#1d2024" stroke="none"/>', true],
  ['<line x1="190" y1="958"', '</g>', true],
  ['<text x="96" y="208" class="num">', '<rect x="88" y="158" width="112" height="62" fill="#f5c518"/>', true],
]);
const svgOf = (h) => h.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
const cssOf = (h) => h.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/html,body\{[^}]*\}\s*body\{[^}]*\}\s*svg\{[^}]*\}/, '')
  .replace(/(\d+px) Mich\b/g, '$1 Michroma').replace(/\bMich\b/g, 'Michroma').replace(/font-family:Plex/g, "font-family:'IBM Plex Mono'").replace(/(\d+px) Plex/g, "$1 'IBM Plex Mono'").replace(/(\d+px) Hand/g, "$1 'Nothing You Could Do'");
emit('kelly-terminal', 'RSK-0001 · Terminal dialect', 1920, 1080, cssOf(html), svgOf(html), '#0b131c');
emit('kelly-paper', 'RSK-0001 · Paper dialect', 1920, 1080, cssOf(paper), svgOf(paper), '#edf1f5');
emit('kelly-field', 'RSK-0001 · Field dialect', 1920, 1080, cssOf(field), svgOf(field), '#f1f0ea');
