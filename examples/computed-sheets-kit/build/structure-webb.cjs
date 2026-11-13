// Structure sheet in the ISS-sheet grammar: JWST primary mirror segment map + bill of elements.
const { emit, r } = require('./common.cjs');
const W = 1920, H = 1080, GOLD = '#c8962e', INK = '#1d232b', MUTE = '#5d6670';
const S = 92;                                  // px per metre
const F = 1.32, R = F / Math.sqrt(3);          // segment flat-to-flat, circumradius (m)
const MX = 760, MY = 640;                      // mirror centre
let s = `<defs><filter id="b40"><feGaussianBlur stdDeviation="40"/></filter><filter id="b6"><feGaussianBlur stdDeviation="6"/></filter>
<pattern id="fine" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${INK}" opacity=".07"/></pattern>
<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${INK}" stroke-opacity=".35"/></pattern>
<linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b752"/><stop offset=".5" stop-color="${GOLD}"/><stop offset="1" stop-color="#a87920"/></linearGradient>
<radialGradient id="ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#e2b752"/><stop offset="1" stop-color="#8a6116"/></radialGradient></defs>`;
s += `<rect width="${W}" height="${H}" fill="#e7eaed"/><g filter="url(#b40)" opacity=".55"><ellipse cx="1500" cy="800" rx="520" ry="160" fill="#cfd7de"/><ellipse cx="300" cy="300" rx="380" ry="90" fill="#dde3e8"/></g><rect width="${W}" height="${H}" fill="url(#fine)"/>`;
for (const [x, y] of [[72, 72], [1848, 72], [72, 1008], [1848, 1008]]) s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${INK}"/>`;
for (let x = 192; x < 1800; x += 192) for (const y of [158, 960]) s += `<path d="M${x - 5},${y}h10M${x},${y - 5}v10" stroke="${INK}" stroke-opacity=".25"/>`;
// header
s += `<rect x="96" y="82" width="30" height="30" fill="none" stroke="${INK}" stroke-width="1.4"/><path d="M101,107 L121,87" stroke="${INK}" stroke-width="1.4"/><rect x="114" y="88" width="7" height="7" fill="${GOLD}"/>`;
s += `<text x="142" y="98" class="h1">KATANAVIEW ARCHIVE</text><text x="142" y="116" class="lab">OBSERVATORY RECORD / SUN–EARTH L2</text>`;
s += `<text x="1824" y="98" class="h1" text-anchor="end">FILE 2021-130A</text><text x="1824" y="116" class="lab" text-anchor="end">SHEET 02 OF 03 / NORAD 50463</text><line x1="96" y1="134" x2="1824" y2="134" stroke="${INK}" stroke-opacity=".25"/>`;
s += `<text x="96" y="214" class="num">02</text><text x="206" y="198" class="h2">PRIMARY MIRROR / SEGMENT MAP</text><text x="206" y="218" class="lab">18 HEXAGONAL BERYLLIUM SEGMENTS, GOLD COATED · FACE-ON VIEW · SCALE IN METRES</text>`;

// ---- segment layout: flat-top hexes; A ring at 1 flat, B radial at 2 flats, C between at √3 flats ----
const hex = (cx, cy, rad) => Array.from({ length: 6 }, (_, k) => { const t = k * Math.PI / 3; return `${r(cx + Math.cos(t) * rad)},${r(cy + Math.sin(t) * rad)}`; }).join(' ');
const segs = [];
for (let k = 0; k < 6; k++) {
  const a = (90 - k * 60) * Math.PI / 180;                      // A1 at top, numbered clockwise
  segs.push(['A' + (k + 1), Math.cos(a) * F, Math.sin(a) * F]);
  segs.push(['B' + (k + 1), Math.cos(a) * 2 * F, Math.sin(a) * 2 * F]);
  const c = a - Math.PI / 6; segs.push(['C' + (k + 1), Math.cos(c) * Math.sqrt(3) * F, Math.sin(c) * Math.sqrt(3) * F]);
}
const P = (x, y) => [MX + x * S, MY - y * S];
let order = 0;
for (const [n, x, y] of segs) {
  const [px, py] = P(x, y), wing = Math.abs(x) > 1.6 * F;
  s += `<polygon points="${hex(px, py, R * S - 2)}" fill="url(#au)" stroke="${INK}" stroke-width="1.2" class="seg" style="animation-delay:${(order++ * 0.18).toFixed(2)}s"/>`;
  s += `<text x="${r(px)}" y="${r(py + 5)}" class="sg" text-anchor="middle">${n}</text>`;
  if (wing) s += `<polygon points="${hex(px, py, R * S - 2)}" fill="url(#hatch)" opacity=".35"/>`;
}
// centre aperture + fold lines
s += `<polygon points="${hex(MX, MY, R * S - 2)}" fill="none" stroke="${INK}" stroke-dasharray="3 4"/><circle cx="${MX}" cy="${MY}" r="10" fill="${INK}"/>`;
for (const sx of [-1, 1]) { const x = MX + sx * 2.25 * R * S; s += `<line x1="${r(x)}" y1="${r(MY - 2.75 * F * S)}" x2="${r(x)}" y2="${r(MY + 2.75 * F * S)}" stroke="${INK}" stroke-dasharray="8 6"/>`; }
s += `<text x="${r(MX + 2.25 * R * S + 8)}" y="${r(MY - 2.62 * F * S)}" class="lab">HINGE</text><text x="${r(MX - 2.25 * R * S - 8)}" y="${r(MY - 2.62 * F * S)}" class="lab" text-anchor="end">HINGE</text>`;
s += `<text x="${r(MX + 3 * R * S)}" y="${r(MY + 2.1 * F * S)}" class="lab" text-anchor="middle">WING · FOLDS</text><text x="${r(MX - 3 * R * S)}" y="${r(MY + 2.1 * F * S)}" class="lab" text-anchor="middle">WING · FOLDS</text>`;
// dimensions
const top = MY - 2.5 * F * S, bot = MY + 2.5 * F * S, dimX = MX + 5.2 * R * S;
s += `<path d="M${r(dimX - 8)},${r(top)}h16M${r(dimX - 8)},${r(bot)}h16M${r(dimX)},${r(top)}V${r(bot)}" stroke="${INK}"/><rect x="${r(dimX - 12)}" y="${r(MY - 46)}" width="24" height="92" fill="#e7eaed"/><text transform="translate(${r(dimX + 4)},${MY}) rotate(-90)" class="dim" text-anchor="middle">6.6 M</text>`;
const [ax, ay] = P(Math.sqrt(3) * F, F); const ah = (F / 2) * S;
s += `<path d="M${r(ax + R * S + 8)},${r(ay - ah)}h14M${r(ax + R * S + 8)},${r(ay + ah)}h14M${r(ax + R * S + 15)},${r(ay - ah)}V${r(ay + ah)}" stroke="${INK}"/><text x="${r(ax + R * S + 26)}" y="${r(ay + 4)}" class="dim">1.32 M</text>`;
// scale bar
s += `<text x="96" y="890" class="lab">FACE-ON / HATCHED = WING SEGMENTS</text>`;
for (let m = 0; m < 3; m++) s += `<rect x="${96 + m * S}" y="904" width="${S}" height="7" fill="${m % 2 ? '#fff' : INK}" stroke="${INK}"/>`;
[0, 1, 2, 3].forEach((m) => s += `<text x="${96 + m * S}" y="930" class="lab" text-anchor="middle">${m}${m === 3 ? ' M' : ''}</text>`);

// sunshield inset at 1:6 of the main scale, mirror outline drawn inside for comparison
const k6 = S / 6, IX = 300, IY = 470, L = 21.197 * k6, Wd = 14.162 * k6;
s += `<text x="${IX - L / 2}" y="${IY - Wd / 2 - 20}" class="lab">SUNSHIELD · 21.197 × 14.162 M · INSET 1:6</text>`;
s += `<polygon points="${r(IX - L / 2)},${IY} ${r(IX - L / 4)},${r(IY - Wd / 2)} ${r(IX + L / 4)},${r(IY - Wd / 2)} ${r(IX + L / 2)},${IY} ${r(IX + L / 4)},${r(IY + Wd / 2)} ${r(IX - L / 4)},${r(IY + Wd / 2)}" fill="none" stroke="${INK}" stroke-dasharray="4 4"/>`;
for (let i = 1; i < 5; i++) s += `<polygon points="${r(IX - L / 2 + i * 3)},${IY} ${r(IX - L / 4 + i * 2)},${r(IY - Wd / 2 + i * 3)} ${r(IX + L / 4 - i * 2)},${r(IY - Wd / 2 + i * 3)} ${r(IX + L / 2 - i * 3)},${IY} ${r(IX + L / 4 - i * 2)},${r(IY + Wd / 2 - i * 3)} ${r(IX - L / 4 + i * 2)},${r(IY + Wd / 2 - i * 3)}" fill="none" stroke="${INK}" stroke-opacity=".25"/>`;
s += `<polygon points="${hex(IX, IY, 3.3 * k6)}" fill="${GOLD}" opacity=".85"/><text x="${IX}" y="${r(IY + Wd / 2 + 22)}" class="lab" text-anchor="middle">5 LAYERS · KAPTON E</text>`;

// gold note (like the ISS sheet's water blob)
s += `<circle cx="1210" cy="330" r="34" fill="url(#ball)"/><ellipse cx="1198" cy="316" rx="10" ry="6" fill="#fff" opacity=".6" filter="url(#b6)"/><line x1="1210" y1="296" x2="1210" y2="266" stroke="${INK}"/>`;
s += `<text x="1150" y="246" class="lab b">AU / 48.25 G ON 25 M²</text><text x="1150" y="262" class="lab">ABOUT ONE GOLF BALL · NOT TO SCALE</text>`;

// ---- bill of elements ----
const BX = 1440;
s += `<text x="${BX}" y="270" class="h3">BILL OF ELEMENTS</text><text x="${BX}" y="292" class="lab">IDX</text><text x="${BX + 46}" y="292" class="lab">ELEMENT</text><text x="${BX + 384}" y="292" class="lab" text-anchor="end">ORIGIN</text><line x1="${BX}" y1="302" x2="${BX + 384}" y2="302" stroke="${INK}"/>`;
[['PRIMARY MIRROR · 18 SEG.', 'US'], ['SECONDARY MIRROR', 'US'], ['TERTIARY + FINE STEERING', 'US'], ['SUNSHIELD · 5 LAYERS', 'US'], ['NIRCAM', 'US'], ['NIRSPEC', 'ESA'], ['MIRI', 'ESA / US'], ['NIRISS + FGS', 'CSA'], ['SPACECRAFT BUS', 'US'], ['ARIANE 5 ECA · LAUNCH', 'ESA']]
  .forEach(([n, o], i) => { const y = 326 + i * 25; s += `<text x="${BX}" y="${y}" class="idx">${String(i + 1).padStart(2, '0')}</text><text x="${BX + 46}" y="${y}" class="row">${n}</text><text x="${BX + 384}" y="${y}" class="row" text-anchor="end">${o}</text><line x1="${BX}" y1="${y + 8}" x2="${BX + 384}" y2="${y + 8}" stroke="${INK}" stroke-opacity=".12"/>`; });
s += `<text x="${BX}" y="590" class="lab">LAUNCHED 2021-12-25 12:20 UTC · KOUROU</text>`;
[['CLEAR APERTURE', '25 M²'], ['FOCAL LENGTH', '131.4 M'], ['OBSERVATORY MASS', '≈ 6 500 KG']].forEach(([k, v], i) => { const y = 650 + i * 70; s += `<rect x="${BX}" y="${y - 6}" width="4" height="52" fill="${GOLD}"/><text x="${BX + 18}" y="${y + 8}" class="lab">${k}</text><text x="${BX + 18}" y="${y + 40}" class="big">${v}</text>`; });
// barcode
let bx = BX; for (let i = 0; bx < BX + 330; i++) { const w = 1 + ((i * 7919) % 4); s += `<rect x="${bx}" y="880" width="${w}" height="38" fill="${INK}"/>`; bx += w + 1 + ((i * 104729) % 3); }
s += `<text x="${BX}" y="938" class="lab">ASSET TAG / 50463</text>`;
// footer
s += `<line x1="96" y1="1000" x2="1824" y2="1000" stroke="${INK}" stroke-opacity=".2"/><text x="96" y="1022" class="foot">SOURCES / NASA WEBB FACT SHEET; NASA NTRS 20160002952 (SEGMENT LAYOUT); NORTHROP GRUMMAN JWST DATASHEET; JWST KEY FACTS. SUNSHIELD OUTLINE SCHEMATIC.</text><text x="1824" y="1022" class="foot" text-anchor="end">KTV / 2021-130A / 02</text>`;

const css = `
.h1{font:400 17px Michroma;fill:${INK};letter-spacing:.18em}.h2{font:400 24px Michroma;fill:${INK};letter-spacing:.14em}.h3{font:400 15px Michroma;fill:${INK};letter-spacing:.16em}
.num{font:400 44px Michroma;fill:${GOLD}}
.lab{font:400 10px 'IBM Plex Mono';fill:${MUTE};letter-spacing:.16em}.b{fill:${INK};font-weight:500}
.sg{font:500 13px 'IBM Plex Mono';fill:${INK};letter-spacing:.06em}
.dim{font:500 12px 'IBM Plex Mono';fill:${INK};letter-spacing:.1em}
.idx{font:400 13px Michroma;fill:${GOLD}}.row{font:400 11px 'IBM Plex Mono';fill:${INK};letter-spacing:.12em}
.big{font:400 26px Michroma;fill:${INK};letter-spacing:.04em}
.foot{font:400 8.5px 'IBM Plex Mono';fill:${MUTE};letter-spacing:.14em}
@keyframes phase{0%,4%{filter:brightness(1)}2%{filter:brightness(1.35)}}
.seg{animation:phase 6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit('Webb', 'FILE 2021-130A · Webb primary mirror', W, H, css, s, '#e7eaed');
