// Style of ref #1: grey half-dome specimen collage. Original subject: "signal from the tape".
const { emit, rng, r } = require('./common.cjs');
const W = 1920, H = 1080;
const DARK = '#1f2429', DISC = '#d5d7d6', INK = '#2b3033', MID = '#5c6466', SAGE = '#7f9a92';
let s = '';
s += `<defs>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .22 0"/></filter>
<filter id="b8"><feGaussianBlur stdDeviation="8"/></filter><filter id="b30"><feGaussianBlur stdDeviation="30"/></filter>
<radialGradient id="lens" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#f4f5f4"/><stop offset=".45" stop-color="#9aa3a3"/><stop offset=".8" stop-color="#3d4446"/><stop offset="1" stop-color="#1c2124"/></radialGradient>
<radialGradient id="dark" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#9ea6a6"/><stop offset=".5" stop-color="#4a5254"/><stop offset="1" stop-color="#1b2023"/></radialGradient>
<linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#2a2f31"/><stop offset=".3" stop-color="#e9eceb"/><stop offset=".45" stop-color="#8a9292"/><stop offset=".7" stop-color="#f7f8f7"/><stop offset="1" stop-color="#3a4042"/></linearGradient>
<linearGradient id="prism" x1="0" x2="1"><stop offset="0" stop-color="#7fd6c8" stop-opacity="0"/><stop offset=".3" stop-color="#e9d36b" stop-opacity=".55"/><stop offset=".55" stop-color="#e58bb5" stop-opacity=".5"/><stop offset=".8" stop-color="#8fb3ff" stop-opacity=".4"/><stop offset="1" stop-color="#8fb3ff" stop-opacity="0"/></linearGradient>
<clipPath id="disc"><path d="M60,1000 A900,900 0 0 1 1860,1000 Z"/></clipPath>
<clipPath id="arch"><path d="M540,1000 A420,420 0 0 1 1380,1000 Z"/></clipPath>
<pattern id="dots" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#000" opacity=".12"/></pattern>
<radialGradient id="shade" cx=".38" cy=".25" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient>
<linearGradient id="curtain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f0" stop-opacity=".9"/><stop offset="1" stop-color="#eef2f0" stop-opacity="0"/></linearGradient>
<linearGradient id="ringmetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f7f6"/><stop offset=".35" stop-color="#5d6567"/><stop offset=".5" stop-color="#e9eceb"/><stop offset=".8" stop-color="#2a2f31"/><stop offset="1" stop-color="#c9cecd"/></linearGradient>
<pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".06"/></pattern>
<clipPath id="cvclip"><rect x="1160" y="820" width="396" height="100"/></clipPath></defs>`;
s += `<rect width="${W}" height="${H}" fill="${DARK}"/>`;
s += `<ellipse cx="1500" cy="250" rx="420" ry="160" fill="#2c3338" filter="url(#b30)"/>`;

// side glitch bands
const band = (x0, x1, y0, y1, sd) => { rng(sd); let o = ''; for (let x = x0; x < x1;) { const w = 2 + Math.floor(rng() * 14); const g = Math.floor(40 + rng() * 150); const sage = rng() < 0.25; o += `<rect x="${x}" y="${y0}" width="${w}" height="${y1 - y0}" fill="${sage ? `rgb(${g * 0.8 | 0},${g | 0},${g * 0.93 | 0})` : `rgb(${g},${g},${g})`}" opacity="${r(0.35 + rng() * 0.5)}"/>`; x += w; } return o; };
s += band(0, 330, 455, 610, 3) + band(0, 260, 255, 300, 4) + band(1590, 1920, 430, 610, 5) + band(1720, 1860, 290, 350, 6);

s += `<g style="mix-blend-mode:screen" opacity=".35"><g transform="translate(-3,0)" class="jit">${band(0, 330, 455, 610, 3).replace(/fill="rgb\([^)]*\)"/g, 'fill="#ff3b3b"')}</g><g transform="translate(3,0)">${band(1590, 1920, 430, 610, 5).replace(/fill="rgb\([^)]*\)"/g, 'fill="#2ee6d6"')}</g></g>`;
s += `<circle cx="960" cy="1000" r="960" fill="none" stroke="#3a4247" stroke-width="40" filter="url(#b30)" opacity=".6"/>`;
// the half disc + floor
s += `<rect x="0" y="905" width="${W}" height="175" fill="#c3c6c5"/>`;
s += `<path d="M60,1000 A900,900 0 0 1 1860,1000 Z" fill="${DISC}"/>`;
s += `<g clip-path="url(#disc)"><rect width="${W}" height="${H}" filter="url(#grain)"/></g>`;

s += `<path d="M60,1000 A900,900 0 0 1 1860,1000 Z" fill="url(#shade)"/>`;
s += `<path d="M66,1000 A894,894 0 0 1 1854,1000" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/><path d="M76,1000 A884,884 0 0 1 1844,1000" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1"/>`;
for (let k = 1; k <= 3; k++) s += `<path d="M${60 + k * 120},1000 A${900 - k * 120},${900 - k * 120} 0 0 1 ${1860 - k * 120},1000" fill="none" stroke="${INK}" stroke-opacity=".06"/>`;
// inner arch: dark interior with vertical bars + rings
s += `<g clip-path="url(#arch)"><rect x="540" y="560" width="840" height="460" fill="#3a4245"/>${band(540, 1380, 560, 1010, 9)}`;
for (let i = 0; i < 7; i++) s += `<ellipse cx="960" cy="1060" rx="${200 + i * 60}" ry="${60 + i * 22}" fill="none" stroke="#c9d0cf" stroke-opacity=".18"/>`;
s += `</g><path d="M540,1000 A420,420 0 0 1 1380,1000" fill="none" stroke="${MID}" stroke-width="1.2"/>`;

// --- left plates ---
// grid plate with contour lines of a computed field
const GX = 450, GY = 190, GS = 30, GN = 12;
let grid = '';
for (let i = 0; i <= GN; i++) grid += `<line x1="${GX + i * GS}" y1="${GY}" x2="${GX + i * GS}" y2="${GY + GN * GS}"/><line x1="${GX}" y1="${GY + i * GS}" x2="${GX + GN * GS}" y2="${GY + i * GS}"/>`;
s += `<g stroke="${INK}" stroke-opacity=".55" stroke-width="1">${grid}</g>`;
// marching-squares isolines of f(x,y)
const f = (x, y) => Math.sin(x / 47) * Math.cos(y / 39) + 0.6 * Math.sin((x + y) / 63) + 0.3 * Math.cos(x / 23 - y / 31);
let iso = '';
for (const lev of [-0.6, -0.1, 0.4, 0.9, 1.3]) for (let y = GY - 20; y < GY + GN * GS + 20; y += 6) for (let x = GX - 20; x < GX + GN * GS + 20; x += 6) {
  const a = f(x, y) - lev, b = f(x + 6, y) - lev, c = f(x + 6, y + 6) - lev, d = f(x, y + 6) - lev;
  const pts = [];
  if (a * b < 0) pts.push([x + 6 * a / (a - b), y]); if (b * c < 0) pts.push([x + 6, y + 6 * b / (b - c)]);
  if (c * d < 0) pts.push([x + 6 * d / (d - c), y + 6]); if (d * a < 0) pts.push([x, y + 6 * a / (a - d)]);
  if (pts.length >= 2) iso += `M${r(pts[0][0])},${r(pts[0][1])}L${r(pts[1][0])},${r(pts[1][1])}`;
}
s += `<clipPath id="gclip"><rect x="${GX - 6}" y="${GY - 6}" width="${GN * GS + 12}" height="${GN * GS + 12}"/></clipPath><path d="${iso}" fill="none" stroke="#8f9a98" stroke-width="1.6" clip-path="url(#gclip)"/>`;
s += `<text x="${GX - 30}" y="${GY + 140}" class="m">+ AREA  [VUL 19h21m]</text><text x="${GX + 10}" y="${GY + 30}" class="m l">D  W</text>`;
s += `<text x="${GX + 300}" y="${GY + 300}" class="m l">D²</text><text x="${GX + 170}" y="${GY + 240}" class="m l">A¹</text>`;
s += `<line x1="${GX + 190}" y1="${GY + 260}" x2="${GX + 300}" y2="${GY + 210}" stroke="${INK}"/><circle cx="${GX + 260}" cy="${GY + 228}" r="4" fill="${INK}"/>`;
// starburst plate
const SX = 560, SY = 560; let rays = '';
rng(21); for (let i = 0; i < 260; i++) { const a = rng() * Math.PI * 2, l = 20 + rng() * 90; rays += `M${r(SX + Math.cos(a) * 34)},${r(SY + Math.sin(a) * 34)}L${r(SX + Math.cos(a) * (34 + l))},${r(SY + Math.sin(a) * (34 + l))}`; }
s += `<rect x="${SX - 100}" y="${SY - 100}" width="200" height="200" fill="#bfc3c2"/><path d="${rays}" stroke="#f2f3f2" stroke-opacity=".7" stroke-width="1"/><circle cx="${SX}" cy="${SY}" r="34" fill="#f4f5f4"/>`;
s += `<text x="${SX - 60}" y="${SY + 130}" class="m l">P</text>`;
// gradient bar under grid
s += `<rect x="${GX + 20}" y="${GY + GN * GS + 70}" width="340" height="22" fill="url(#metal)" opacity=".8"/>`;
// waveform strip "+RECORD"
rng(31); let wf = ''; for (let i = 0; i < 110; i++) { const env = Math.sin(i / 110 * Math.PI) * (0.5 + 0.5 * Math.sin(i / 6)); const h = 4 + env * 26 * (0.4 + rng() * 0.6); wf += `<rect x="${290 + i * 2}" y="${r(415 - h)}" width="1" height="${r(h * 2)}" class="eq" style="animation-delay:${r(-(i % 17) * 0.13)}s"/>`; }
s += `<g fill="${INK}" opacity=".75">${wf}</g><text x="236" y="420" class="m s">+RECORD</text>`;
// THE STAR: two small discs
rng(41); let speck = ''; for (let i = 0; i < 160; i++) { const a = rng() * 6.28, rr = Math.sqrt(rng()) * 30; speck += `<circle cx="${r(278 + Math.cos(a) * rr)}" cy="${r(495 + Math.sin(a) * rr)}" r="${r(1 + rng() * 2.5)}"/>`; }
s += `<circle cx="278" cy="495" r="32" fill="#7d8786"/><g fill="#e8ecea" opacity=".8">${speck}</g>`;
s += `<circle cx="358" cy="495" r="30" fill="none" stroke="#5c6466" stroke-width="10" filter="url(#b8)" opacity=".8"/><circle cx="358" cy="495" r="30" fill="none" stroke="#3a4144" stroke-width="2"/>`;
s += `<text x="252" y="450" class="m s">THE STAR</text><text x="248" y="570" class="d">R⁺</text>`;
s += `<path d="M352,540 v50 M342,580 l10,12 l10,-12 M330,600 h44" stroke="${INK}" fill="none"/>`;
// compass
const KX = 380, KY = 770, KR = 120;
s += `<circle cx="${KX}" cy="${KY}" r="${KR}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
s += `<path d="M${KX - 30},${KY - KR + 4} L${KX + 32},${KY + KR - 4} M${KX - KR + 6},${KY + 30} L${KX + KR - 6},${KY - 26} M${KX - KR},${KY} H${KX + KR + 80}" stroke="${INK}" stroke-width="1" stroke-dasharray="0" fill="none"/>`;
s += `<text x="${KX - 32}" y="${KY - KR - 8}" class="m s">N</text><text x="${KX + 28}" y="${KY + KR + 18}" class="m s">S</text><text x="${KX + KR - 10}" y="${KY + 16}" class="m l">G</text>`;
s += `<path d="M${KX + 60},${KY + 100} L${KX + 230},${KY + 100} L${KX + 230},${KY + 40} Z" fill="url(#metal)" opacity=".5"/>`;
s += `<text x="${KX + 120}" y="${KY + 140}" class="m xs">Fig.1  the lighthouse</text>`;
// ruler + sine
let sin = ''; for (let x = 0; x <= 260; x += 1) { const ph = (x / 52) % 1; sin += `${x ? 'L' : 'M'}${470 + x},${r(708 - (ph < .03 ? 14 : 0))}`; }
s += `<path d="${sin}" fill="none" stroke="${INK}"/><path d="M470,698v14M730,698v14M470,730H730" stroke="${INK}"/>`;
['1E1', '1E2', '1E3', '1E4'].forEach((t, i) => s += `<text x="${474 + i * 70}" y="748" class="m xs">${t}</text>`);
s += `<text x="470" y="768" class="m xs">P : 1.3373 s, 0.04 s WIDE</text><text x="530" y="655" class="m">[EMD]</text>`;
s += `<rect x="455" y="612" width="4" height="70" fill="${INK}"/><rect x="465" y="640" width="10" height="42" fill="${INK}"/>`;

const fp = ['FOUND BY JOCELYN BELL IN THE CHART RECORD OF THE', 'CAMBRIDGE SCINTILLATION ARRAY, 81.5 MHZ, 1967: A BIT', 'OF SCRUFF THAT CAME BACK AT THE SAME SIDEREAL TIME.', 'PULSES EVERY 1.3373 S, EACH ABOUT 0.04 S WIDE. FIRST', 'NICKNAMED LGM-1, LITTLE GREEN MEN; NOW PSR B1919+21,', 'A ROTATING NEUTRON STAR IN VULPECULA.'];
fp.forEach((t, i) => s += `<text x="236" y="${640 + i * 9}" class="fp">${t}</text>`);
s += `<text transform="translate(${GX - 18},${GY + 380}) rotate(-90)" class="fp" style="font-size:8px">(C) KATANAVIEW ARCHIVE  RA 19h21m44.8s  DEC +21°53′02″  J2000</text>`;
s += `<text transform="translate(236,630) rotate(-90)" class="fp">NEUTRON STAR / ~1.4 M☉</text>`;
// --- right plates ---
// session phases (moon-phase dots)
[[1300, 280, 14, 1], [1336, 300, 12, 0.75], [1366, 320, 10, 0.5], [1390, 340, 9, 0.25]].forEach(([x, y, rr, k]) => { s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${INK}"/><circle cx="${x + rr * (2 * k)}" cy="${y}" r="${rr}" fill="${DISC}"/>`; });
s += `<text x="1290" y="250" class="m xs">ROTATION PHASE 0 / ¼ / ½ / ¾</text>`;
// photo plate (blurred sphere)
s += `<rect x="1150" y="210" width="80" height="80" fill="#5d6567"/><circle cx="1190" cy="245" r="24" fill="#eef0ee" filter="url(#b8)"/><text x="1145" y="305" class="m xs">Fig.2  THE CHART</text>`;
// orbit with node chain
s += `<ellipse cx="1340" cy="460" rx="240" ry="120" fill="none" stroke="${INK}" stroke-dasharray="3 4" stroke-opacity=".7" transform="rotate(-12 1340 460)"/>`;
[[1450, 400], [1490, 380], [1530, 395], [1570, 430]].forEach(([x, y], i, a) => { s += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${INK}"/>`; if (i) s += `<line x1="${a[i - 1][0]}" y1="${a[i - 1][1]}" x2="${x}" y2="${y}" stroke="${INK}"/>`; });
// textured disc (THE LIGHT) via isolines of a second field
const LX = 1260, LY = 470, LR = 110;
const f2 = (x, y) => Math.sin(x / 9) * Math.cos(y / 11) + Math.sin((x - y) / 17);
let iso2 = '';
for (let y = LY - LR; y < LY + LR; y += 4) for (let x = LX - LR; x < LX + LR; x += 4) {
  if ((x - LX) ** 2 + (y - LY) ** 2 > LR * LR) continue;
  const a = f2(x, y), b = f2(x + 4, y), d = f2(x, y + 4);
  if (a * b < 0) iso2 += `M${x},${y}l4,${r(4 * (a / (a - d) || 0))}`;
}
s += `<circle cx="${LX}" cy="${LY}" r="${LR}" fill="#e4e6e5" stroke="${INK}"/><path d="${iso2}" stroke="${INK}" stroke-opacity=".55" fill="none"/>`;
s += `<circle cx="${LX}" cy="${LY}" r="48" fill="none" stroke="#e4e6e5" stroke-width="18"/><circle cx="${LX + 20}" cy="${LY - 6}" r="14" fill="none" stroke="${INK}" stroke-width="3"/><text x="${LX - 10}" y="${LY + 62}" class="m xs">THE SKY</text>`;
// prism beam
s += `<polygon points="1040,500 1560,440 1560,480 1040,520" fill="url(#prism)" class="shim"/>`;
s += `<text x="1080" y="530" class="hand2">CP 1919 "</text>`;
// dark box
s += `<circle cx="1530" cy="620" r="130" fill="url(#dark)"/><g fill="#d9dddc" opacity=".7"><rect x="1500" y="640" width="30" height="30"/><rect x="1530" y="670" width="30" height="30" opacity=".6"/><rect x="1470" y="700" width="30" height="30" opacity=".4"/><rect x="1560" y="610" width="20" height="20" opacity=".5"/></g>`;
s += `<text x="1450" y="478" class="m s">DARK BOX</text>`;
s += `<text x="1670" y="700" class="dd">A</text><text x="1722" y="700" class="m">side</text>`;
// trade record form
const FX = 1170, FY = 700;
s += `<path d="M${FX},${FY}H${FX + 380}" stroke="${INK}"/><text x="${FX + 6}" y="${FY + 18}" class="m xs">FIELD</text><text x="${FX + 6}" y="${FY + 40}" class="m xs">OBSERVATION RECORD</text>`;
['SOURCE', 'DATE', 'FREQ', 'PERIOD', 'WIDTH'].forEach((t, i) => s += `<text x="${FX + 6 + i * 76}" y="${FY + 72}" class="m xxs">${t}</text><line x1="${FX + 6 + i * 76}" y1="${FY + 100}" x2="${FX + 70 + i * 76}" y2="${FY + 100}" stroke="${INK}" stroke-width=".8"/>`);
s += `<text x="${FX - 90}" y="${FY + 100}" class="m">LGM-1</text>`;
// tick waveform grid
const CGX = 1160, CGY = 820; let cg = '';
for (let i = 0; i <= 18; i++) cg += `<line x1="${CGX + i * 22}" y1="${CGY}" x2="${CGX + i * 22}" y2="${CGY + 100}"/>`;
for (let j = 0; j <= 4; j++) cg += `<line x1="${CGX}" y1="${CGY + j * 25}" x2="${CGX + 396}" y2="${CGY + j * 25}"/>`;
rng(77); let tick = ''; const PXS = 396 / (6 * 1.3373); const amps = []; for (let i = 0; i < 396; i += 1) { const t = i / PXS, ph = (t % 1.3373) / 1.3373; amps.push(ph < 0.04 / 1.3373 ? -(30 + rng() * 55) : (rng() - .5) * 6); } for (let k = 0; k < 2; k++) amps.forEach((a, j) => { tick += `M${CGX + k * 396 + j},${r(CGY + 80)}v${r(a)}`; });
s += `<g stroke="${INK}" stroke-opacity=".5" stroke-width=".8">${cg}</g><g clip-path="url(#cvclip)"><path d="${tick}" stroke="${INK}" stroke-width="1" class="roll"/></g><text x="${CGX + 8}" y="${CGY - 6}" class="m xs">CHART · 6 PERIODS</text>`;
// star
s += `<g stroke="${INK}" stroke-width="1"><path d="M1720,800 L1720,940 M1660,850 L1790,880 M1680,820 L1760,920 M1650,900 L1800,820"/></g><circle cx="1722" cy="866" r="7" fill="#9aa3a3"/>`;
s += `<text x="1600" y="910" class="m">ZIP.</text><text x="1780" y="910" class="m">03  B</text>`;

// --- centre instrument (code-drawn, stands in for the 3D machine) ---
const IX = 960, IY = 400;
s += `<circle cx="${IX + 50}" cy="${IY - 120}" r="200" fill="#c9cecd" opacity=".55" filter="url(#b8)"/>`;
s += `<circle cx="${IX + 50}" cy="${IY - 120}" r="200" fill="url(#dots)"/>`;
s += `<g class="sway" style="transform-origin:${IX - 40}px ${IY + 10}px"><path d="M${IX - 200},${IY - 330} A 330 330 0 0 1 ${IX + 270},${IY + 30}" fill="none" stroke="#1d2224" stroke-width="5"/>`;
[[IX + 200, IY - 240], [IX + 240, IY - 160], [IX + 256, IY - 80]].forEach(([x, y]) => s += `<rect x="${x - 9}" y="${y - 12}" width="18" height="24" fill="#1d2224" transform="rotate(40 ${x} ${y})"/>`);
s += `</g>`;
for (let i = 0; i < 6; i++) s += `<ellipse cx="${IX}" cy="${IY + 40}" rx="${150 + i * 9}" ry="${150 + i * 9}" fill="none" stroke="${i % 2 ? '#1d2224' : '#7c8584'}" stroke-width="${i % 2 ? 4 : 1.5}" clip-path="url(#none)"/>`;

let cur = ''; rng(91); for (let i = 0; i < 70; i++) { const x = IX - 70 + rng() * 140; cur += `<line x1="${r(x)}" y1="${IY + 100}" x2="${r(x + (rng() - .5) * 20)}" y2="${r(IY + 360 + rng() * 140)}"/>`; }
s += `<g stroke="url(#curtain)" stroke-width="1" class="curtain">${cur}</g>`;
let sc = ''; for (let a = 0; a < 360; a += 3) { const t = a * Math.PI / 180, l = a % 30 ? 6 : 14; sc += `M${r(Math.cos(t) * 186)},${r(Math.sin(t) * 186)}L${r(Math.cos(t) * (186 + l))},${r(Math.sin(t) * (186 + l))}`; }
s += `<g transform="translate(${IX},${IY + 40})"><g class="spin"><path d="${sc}" stroke="${INK}" stroke-width="1"/>${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a => { const t = a * Math.PI / 180; return `<text x="${r(Math.cos(t) * 214)}" y="${r(Math.sin(t) * 214 + 3)}" class="fp" text-anchor="middle">${String(a).padStart(3, '0')}</text>`; }).join('')}</g></g>`;
s += `<ellipse cx="${IX}" cy="${IY + 40}" rx="230" ry="70" fill="none" stroke="url(#ringmetal)" stroke-width="7" transform="rotate(-18 ${IX} ${IY + 40})"/>`;s += `<circle cx="${IX}" cy="${IY + 40}" r="140" fill="url(#lens)"/>`;
s += `<circle cx="${IX}" cy="${IY + 40}" r="140" fill="url(#dots)"/>`;
s += `<ellipse cx="${IX - 30}" cy="${IY}" rx="60" ry="34" fill="#fff" opacity=".35" filter="url(#b8)"/>`;
s += `<path d="M${IX - 110},${IY + 90} A140,140 0 0 0 ${IX + 100},${IY + 130}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" filter="url(#b8)"/>`;
s += `<g transform="translate(${IX - 52},${IY - 22})"><g class="glare"><path d="M0,-26 L3,-3 L26,0 L3,3 L0,26 L-3,3 L-26,0 L-3,-3Z" fill="#fff"/><circle r="5" fill="#fff"/></g></g>`;
rng(13); let dust = ''; for (let i = 0; i < 60; i++) { const a = rng() * 6.28, d = 30 + rng() * 100; dust += `<circle cx="${r(IX + Math.cos(a) * d)}" cy="${r(IY + 40 + Math.sin(a) * d)}" r="${r(.6 + rng() * 1.4)}"/>`; }
s += `<g fill="#fff" opacity=".6" class="dust">${dust}</g>`;
s += `<path d="M${IX + 140},${IY + 60} C${IX + 260},${IY + 120} ${IX + 200},${IY + 300} ${IX + 330},${IY + 420} M${IX - 150},${IY + 80} C${IX - 280},${IY + 200} ${IX - 180},${IY + 330} ${IX - 330},${IY + 470}" fill="none" stroke="#1d2224" stroke-width="1.5"/>`;
[[IX + 172, IY - 30, 30], [IX - 176, IY + 110, -40], [IX + 120, IY + 170, 60]].forEach(([x, y, a]) => s += `<rect x="${x - 14}" y="${y - 7}" width="28" height="14" fill="url(#metal)" stroke="#1d2224" transform="rotate(${a} ${x} ${y})"/>`);
for (const [x, w] of [[IX - 40, 18], [IX - 14, 26], [IX + 18, 14]]) s += `<rect x="${x}" y="${IY + 120}" width="${w}" height="${300}" fill="url(#metal)"/>`;
s += `<rect x="${IX - 70}" y="${IY + 140}" width="140" height="40" fill="url(#metal)"/><circle cx="${IX - 120}" cy="${IY + 30}" r="26" fill="url(#lens)" stroke="#1d2224" stroke-width="3"/><circle cx="${IX - 120}" cy="${IY + 30}" r="9" fill="#1d2224"/>`;
// checker tiles below
rng(55); for (let i = 0; i < 14; i++) { const x = IX - 260 + Math.floor(rng() * 10) * 26, y = IY + 220 + Math.floor(rng() * 8) * 26; s += `<rect x="${x}" y="${y}" width="24" height="48" fill="#2e3437" opacity=".85"/><rect x="${x + 4}" y="${y + 4}" width="16" height="40" fill="url(#dots)"/>`; }
// rail on the floor
s += `<rect x="560" y="935" width="900" height="26" fill="url(#metal)" opacity=".9"/><rect x="760" y="962" width="620" height="18" fill="url(#metal)" opacity=".7"/><rect x="1260" y="850" width="160" height="90" fill="url(#metal)" opacity=".6"/>`;

s += `<g opacity=".25" transform="translate(0,1952) scale(1,-1)"><rect x="560" y="935" width="900" height="26" fill="url(#metal)"/></g>`;
for (let i = 0; i < 4; i++) s += `<ellipse cx="960" cy="1030" rx="${160 + i * 110}" ry="${14 + i * 7}" fill="none" stroke="#fff" stroke-opacity="${.25 - i * .05}" class="ripple" style="animation-delay:${-i * 1.5}s"/>`;
// stray tokens
s += `<text x="520" y="260" class="m l">R</text><text x="276" y="420" class="m l" opacity="0">.</text><text x="270" y="340" class="m l">012</text>`;
s += `<text x="160" y="610" class="m s">%  M00_2 ~2</text><text x="1700" y="590" class="m">%  naN  --012</text><text x="1800" y="370" class="m l">A</text>`;
s += `<text x="150" y="930" class="m">RE        00</text>`;
s += `<text x="90" y="1050" class="m s" style="letter-spacing:.14em">SOUND FROM VULPECULA</text><text x="360" y="1050" class="m l">[81.5]</text><text x="450" y="1060" class="m xxs">MHZ  1967 11 28</text><text x="560" y="1050" class="m l">+   PSR B1919+21</text>`;
s += `<rect x="0" y="1068" width="1500" height="4" fill="#e9ecea"/><circle cx="1764" cy="1045" r="6" fill="#d8453b" class="rec"/><text x="1780" y="1052" class="m l">record</text>`;

s += `<rect width="${W}" height="${H}" fill="url(#scan)" style="pointer-events:none"/>`;
const css = `
.m{font:400 13px 'IBM Plex Mono';fill:${INK};letter-spacing:.06em}.l{font-size:20px}.s{font-size:11px}.xs{font-size:10px}.xxs{font-size:8px}
.d{font:400 30px 'IBM Plex Mono';fill:${INK}}.dd{font:400 76px 'IBM Plex Mono';fill:#2f3a39}
.hand2{font:italic 400 26px 'IBM Plex Mono';fill:#3b4646;opacity:.8}
.fp{font:400 6.5px 'IBM Plex Mono';fill:${INK};letter-spacing:.08em;opacity:.8}
@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 120s linear infinite}
@keyframes sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}.sway{animation:sway 14s ease-in-out infinite}
@keyframes roll{to{transform:translateX(-396px)}}.roll{animation:roll 12s linear infinite}
@keyframes eq{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.35)}}.eq{transform-box:fill-box;transform-origin:50% 50%;animation:eq 1.4s ease-in-out infinite}
@keyframes shim{0%,100%{opacity:.55}50%{opacity:1}}.shim{animation:shim 5s ease-in-out infinite}
@keyframes glare{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(.6) rotate(25deg)}}.glare{animation:glare 6s ease-in-out infinite}
@keyframes fall{to{stroke-dashoffset:-60}}.curtain line{stroke-dasharray:40 20;animation:fall 3s linear infinite}
@keyframes ripple{0%{opacity:0;transform:scale(.6)}30%{opacity:1}100%{opacity:0;transform:scale(1.15)}}.ripple{transform-box:fill-box;transform-origin:50% 50%;animation:ripple 6s ease-out infinite}
@keyframes rec{0%,49%{opacity:1}50%,100%{opacity:.15}}.rec{animation:rec 1.2s steps(1) infinite}
@keyframes jit{0%,92%,100%{transform:translateX(-3px)}94%{transform:translateX(9px)}96%{transform:translateX(-12px)}}.jit{animation:jit 5s steps(1) infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit('Signal', 'Sound from Vulpecula · CP 1919', W, H, css, s, DARK);
