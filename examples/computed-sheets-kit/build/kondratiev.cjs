// Kondratiev long waves as a spiral: one turn per wave, angle = phase within that wave, radius grows with time.
// Wave boundaries follow Grinin & Korotayev (Table 1); a boundary given as a decade is drawn as a band, not a line.
const { emit, r } = require('./common.cjs');
const S = 1600, CX = 800, CY = 840, BG = '#0B0B0D', T = '#EDE7DA', T2 = '#8C877C', RED = '#FF4A2E';
const SERIF = "'Noto Serif SC','Noto Serif CJK SC',serif";
// [start-low, start-high] for each boundary; last wave's end is open
const B = [[1780, 1780], [1840, 1849], [1890, 1899], [1940, 1949], [1980, 1984], [2020, 2020]];
const mid = B.map(([a, b]) => (a + b) / 2);
const names = [['纺织 · 蒸汽', 'TEXTILES'], ['铁路 · 煤 · 钢', 'RAILWAYS, COAL, STEEL'], ['电力 · 化工 · 重型机械', 'ELECTRICITY, CHEMICALS'], ['汽车 · 合成材料 · 电子', 'AUTOMOBILES, ELECTRONICS'], ['微电子 · 个人电脑', 'MICROELECTRONICS, PCS'], ['第六波？', 'SIXTH WAVE?']];
const R0 = 70, DR = 90;
const waveOf = (y) => { for (let i = mid.length - 1; i >= 0; i--) if (y >= mid[i]) return i; return 0; };
const len = (i) => i < mid.length - 1 ? mid[i + 1] - mid[i] : 50;            // open last wave: assume 50 y for drawing only
const polar = (y) => { const i = waveOf(y), f = (y - mid[i]) / len(i), th = -Math.PI / 2 + f * 2 * Math.PI, rr = R0 + DR * (i + f); return [CX + Math.cos(th) * rr, CY + Math.sin(th) * rr, th, rr]; };
let s = `<rect width="${S}" height="${S}" fill="${BG}"/>`;
// season quadrants (model): spring/summer = upswing, autumn/winter = downswing
const seasons = [['春 · 回升', 0], ['夏 · 繁荣', 1], ['秋 · 衰退', 2], ['冬 · 萧条', 3]];
const outer = R0 + DR * 6 + 30;
seasons.forEach(([n, q]) => {
  const a0 = -Math.PI / 2 + q * Math.PI / 2, a1 = a0 + Math.PI / 2;
  s += `<path d="M${CX},${CY} L${r(CX + Math.cos(a0) * outer)},${r(CY + Math.sin(a0) * outer)} A${outer},${outer} 0 0 1 ${r(CX + Math.cos(a1) * outer)},${r(CY + Math.sin(a1) * outer)} Z" fill="${T}" fill-opacity="${[.04, .07, .025, 0][q]}"/>`;
  const am = (a0 + a1) / 2; s += `<text x="${r(CX + Math.cos(am) * (outer + 34))}" y="${r(CY + Math.sin(am) * (outer + 34) + 6)}" class="sea" text-anchor="middle">${n}</text>`;
  s += `<line x1="${CX}" y1="${CY}" x2="${r(CX + Math.cos(a0) * outer)}" y2="${r(CY + Math.sin(a0) * outer)}" stroke="${T}" stroke-opacity=".12"/>`;
});
// the spiral of years, 1780 → 2070, in fine radial ticks (one per year) along the ribbon
let d = ''; for (let y = 1780; y <= 2070; y += .25) { const [x, yy] = polar(y); d += `${d ? 'L' : 'M'}${r(x)},${r(yy)}`; }
s += `<path d="${d}" fill="none" stroke="${T}" stroke-width="1.4"/>`;
for (let y = 1780; y <= 2070; y++) {
  const [x, yy, th] = polar(y), L = y % 50 === 0 ? 26 : y % 10 === 0 ? 14 : 6, nx = Math.cos(th), ny = Math.sin(th);
  s += `<line x1="${r(x)}" y1="${r(yy)}" x2="${r(x + nx * L)}" y2="${r(yy + ny * L)}" stroke="${T}" stroke-opacity="${y > 2026 ? .25 : y % 10 ? .45 : .9}" stroke-width="${y % 10 ? .7 : 1.2}"/>`;
  if (y % 50 === 0) s += `<text x="${r(x + nx * 44)}" y="${r(yy + ny * 44 + 4)}" class="yr" text-anchor="middle">${y}</text>`;
}
// boundary bands where sources give a decade
B.slice(1).forEach(([a, b], i) => { if (b - a < 1) return; let p = ''; for (let y = a; y <= b; y += .25) { const [x, yy] = polar(y); p += `${p ? 'L' : 'M'}${r(x)},${r(yy)}`; } s += `<path d="${p}" fill="none" stroke="${T}" stroke-width="10" stroke-opacity=".28" stroke-linecap="round"/>`; });
// wave names on the spring axis (top), one per turn
names.forEach(([cn, en], i) => { const rr = R0 + DR * i + DR * .5; s += `<text x="${CX + 14}" y="${r(CY - rr + 5)}" class="wn">${String(i + 1).padStart(2, '0')}  ${cn}</text><text x="${CX + 14}" y="${r(CY - rr + 22)}" class="we">${mid[i] | 0}–${i < 5 ? mid[i + 1] | 0 : '?'} · ${en}</text>`; });
// a lifetime: born 1990, 80 years
let life = ''; for (let y = 1990; y <= 2070; y += .25) { const [x, yy] = polar(y); life += `${life ? 'L' : 'M'}${r(x)},${r(yy)}`; }
s += `<path d="${life}" fill="none" stroke="${RED}" stroke-width="4" stroke-opacity=".9" pathLength="1" class="life"/>`;
const [lx, ly] = polar(1990), [ex, ey] = polar(2070);
s += `<circle cx="${r(lx)}" cy="${r(ly)}" r="5" fill="${RED}"/><circle cx="${r(ex)}" cy="${r(ey)}" r="5" fill="none" stroke="${RED}" stroke-width="2"/>`;
const [nx, ny] = polar(2026); s += `<circle cx="${r(nx)}" cy="${r(ny)}" r="9" fill="${RED}" class="now"/><text x="${r(nx + 18)}" y="${r(ny - 12)}" class="now-t">2026</text>`;
// titles
s += `<text x="80" y="140" class="title">康波</text><text x="84" y="190" class="sub">KONDRATIEV LONG WAVES · ONE TURN = ONE WAVE</text>`;
s += `<text x="${S - 80}" y="120" class="note" text-anchor="end">红线：生于 1990 年，活到 80 岁</text><text x="${S - 80}" y="150" class="note" text-anchor="end">一生约走过一圈半</text>`;
s += `<text x="80" y="${S - 96}" class="foot">ANGLE = PHASE WITHIN A WAVE, NOT CALENDAR TIME · SEASON QUADRANTS ARE A MODEL, REAL PHASES ARE UNEQUAL · GREY BANDS: SOURCES GIVE ONLY A DECADE</text>`;
s += `<text x="80" y="${S - 74}" class="foot">CHRONOLOGY: GRININ & KOROTAYEV, THE DYNAMICS OF KONDRATIEFF WAVES (TABLE 1) · KONDRATIEFF 1925 · A HETERODOX THEORY: START AND END YEARS ARE DISPUTED</text>`;
s += `<text x="80" y="${S - 52}" class="foot">TURNS AFTER 2020 ARE DRAWN AT AN ASSUMED 50 YEARS AND FADED · NOT A FORECAST</text>`;
const css = `.title{font:900 110px ${SERIF};fill:${T}}.sub{font:400 13px 'IBM Plex Mono';fill:${T2};letter-spacing:.2em}
.sea{font:900 22px ${SERIF};fill:${T2}}.yr{font:400 13px Michroma;fill:${T}}.wn{font:900 17px ${SERIF};fill:${T}}.we{font:400 10px 'IBM Plex Mono';fill:${T2};letter-spacing:.12em}
.note{font:900 26px ${SERIF};fill:${RED}}.now-t{font:400 20px Michroma;fill:${RED}}.foot{font:400 10px 'IBM Plex Mono';fill:${T2};letter-spacing:.1em}
@keyframes lf{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}.life{animation:lf 4s cubic-bezier(.3,0,.2,1) both}
@keyframes nw{50%{opacity:.3}}.now{animation:nw 1.4s ease-in-out infinite}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit('KWave', '康波 · Kondratiev spiral', S, S, css, s, BG);
