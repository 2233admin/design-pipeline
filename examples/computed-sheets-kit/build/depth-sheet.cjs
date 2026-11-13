"use strict";

// Industrial document layout around a gritty hologram hero. Imagery is raster (with grit); every word and
// number is crisp vector on top, so it stays readable.
// The scene modules emit the clean hologram (Scene*) and export where LAST and the ask wall land; grit.py
// turns a screenshot of each scene into art/depth-scene-*.jpg, which the sheet clips into its hero window.
const { emit, r } = require('./common.cjs');
function sheet(variant, href, A) {
const W = 1920, H = 1080, BG = '#0d0806', OR = '#FF7A2A', CR = '#F2E6D8', MU = '#9A8676', HL = '#3a2014';
const HX = 540, HY = 150, HW = 1320, HH = 730;
const s0 = A.snaps[0], bid = s0.bid.reduce((a, b) => a + b, 0), ask = s0.ask.reduce((a, b) => a + b, 0), imb = (bid - ask) / (bid + ask);
let s = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
// hero window
s += `<clipPath id="hero"><rect x="${HX}" y="${HY}" width="${HW}" height="${HH}"/></clipPath><image href="${href}" x="0" y="0" width="${W}" height="${H}" clip-path="url(#hero)"/>`;
s += `<rect x="${HX}" y="${HY}" width="${HW}" height="${HH}" fill="none" stroke="${MU}" stroke-opacity=".5"/>`;
for (const [x, y, dx, dy] of [[HX, HY, 1, 1], [HX + HW, HY, -1, 1], [HX, HY + HH, 1, -1], [HX + HW, HY + HH, -1, -1]]) s += `<path d="M${x},${y + dy * 22}V${y}H${x + dx * 22}" fill="none" stroke="${OR}" stroke-width="2"/>`;
for (let i = 0; i <= 22; i++) { const x = HX + i * HW / 22; s += `<line x1="${r(x)}" y1="${HY + HH}" x2="${r(x)}" y2="${HY + HH + (i % 2 ? 6 : 12)}" stroke="${MU}"/>`; }
s += `<rect x="${HX}" y="${HY - 26}" width="360" height="20" fill="${OR}"/><text x="${HX + 10}" y="${HY - 11}" class="bar">PROJECTION · ${variant === 'space' ? 'DEEP FIELD' : 'MEGASTRUCTURE'}</text>`;
s += `<text x="${HX + HW}" y="${HY - 11}" class="lab" text-anchor="end">46 SNAPSHOTS · HEIGHT = CUMULATIVE SIZE · DEPTH = TIME</text>`;
// crisp callouts on the hero
const tag = (x, y, t, fill, ink) => `<rect x="${r(x)}" y="${r(y - 21)}" width="${t.length * 10.4 + 24}" height="30" fill="${fill}"/><text x="${r(x + 11)}" y="${r(y - 1)}" class="tag" style="fill:${ink}">${t}</text>`;
const [lx, ly] = A.last, [wx, wy] = A.wall;
s += `<circle cx="${r(lx)}" cy="${r(ly)}" r="10" fill="none" stroke="${CR}" stroke-width="2"/><path d="M${r(lx - 12)},${r(ly - 12)} L${r(lx - 80)},${r(ly - 80)} H${r(lx - 120)}" fill="none" stroke="${CR}"/>` + tag(lx - 120 - 150, ly - 70, 'LAST 403.21', CR, BG);
s += `<circle cx="${r(wx)}" cy="${r(wy)}" r="6" fill="${OR}"/><path d="M${r(wx)},${r(wy)} L${r(wx - 70)},${r(Math.max(wy - 120, HY + 40))} H${r(wx - 110)}" fill="none" stroke="${OR}"/>` + tag(wx - 110 - 210, Math.max(wy - 110, HY + 50), 'ASK WALL · L6 × 3.0', OR, BG);
// header
s += `<rect x="96" y="60" width="30" height="30" fill="none" stroke="${CR}" stroke-width="1.4"/><path d="M101,85 L121,65" stroke="${CR}" stroke-width="1.4"/><rect x="114" y="66" width="7" height="7" fill="${OR}"/>`;
s += `<text x="142" y="76" class="h1">KATANAVIEW · DEPTH LAB</text><text x="142" y="96" class="lab">ORDER BOOK DEPTH RECORD / L2 REPLAY</text>`;
s += `<text x="${W - 60}" y="76" class="h1" text-anchor="end">FILE DEP-0003</text><text x="${W - 60}" y="96" class="lab" text-anchor="end">SHEET ${variant === 'space' ? '02' : '01'} OF 02 / 600519.XSHG</text><line x1="96" y1="116" x2="${W - 60}" y2="116" stroke="${MU}" stroke-opacity=".4"/>`;
// left column
const LX = 96, LW = 400;
s += `<text x="${LX}" y="196" class="num">03</text><text x="${LX + 112}" y="176" class="h2">DEPTH</text><text x="${LX + 114}" y="200" class="cn">盘口深度</text>`;
let tx = LX; [['CANYON'], ['HOLO', 1], ['LADDER']].forEach(([t, on]) => { const w = 34 + t.length * 11; s += `<rect x="${tx}" y="226" width="${w}" height="24" fill="${on ? OR : 'none'}" stroke="${on ? OR : MU}"/><text x="${tx + w / 2}" y="243" class="tab" text-anchor="middle" style="fill:${on ? BG : MU}">${t}</text>`; tx += w + 8; });
s += `<circle cx="${tx + 10}" cy="238" r="4" fill="${OR}" class="blink"/><text x="${tx + 20}" y="242" class="lab" style="fill:${OR}">SIM</text>`;
[['INSTRUMENT', '600519.XSHG'], ['MODE', 'L2 REPLAY'], ['LEVELS', '10 × 2'], ['SNAPSHOTS', '46'], ['DATA', 'SIMULATED']].forEach(([k, v], i) => { const y = 292 + i * 26; s += `<text x="${LX}" y="${y}" class="lab">${k}</text><text x="${LX + LW}" y="${y}" class="val" text-anchor="end">${v}</text><line x1="${LX}" y1="${y + 9}" x2="${LX + LW}" y2="${y + 9}" stroke="${MU}" stroke-opacity=".2"/>`; });
// ladder: readable book now
s += `<text x="${LX}" y="452" class="h3">BOOK · NOW</text><text x="${LX + 182}" y="452" class="lab" text-anchor="end">BID</text><text x="${LX + 218}" y="452" class="lab">ASK</text>`;
const mx = Math.max(...s0.bid, ...s0.ask);
for (let k = 0; k < 10; k++) { const y = 474 + k * 34, bw = s0.bid[k] / mx * 150, aw = s0.ask[k] / mx * 150, wall = k === 5;
  if (wall) s += `<rect x="${LX - 6}" y="${y - 4}" width="${LW + 12}" height="30" fill="${HL}"/>`;
  s += `<rect x="${LX + 190 - 8 - bw}" y="${y + 2}" width="${r(bw)}" height="18" fill="${CR}" fill-opacity=".75"/><rect x="${LX + 210 + 8}" y="${y + 2}" width="${r(aw)}" height="18" fill="${wall ? OR : CR}" fill-opacity="${wall ? 1 : .45}"/>`;
  s += `<text x="${LX + 200}" y="${y + 16}" class="lvl" text-anchor="middle">${k + 1}</text><text x="${LX}" y="${y + 16}" class="val">${Math.round(s0.bid[k])}</text><text x="${LX + LW}" y="${y + 16}" class="val" text-anchor="end" style="${wall ? `fill:${OR}` : ''}">${Math.round(s0.ask[k])}</text>`; }
// metrics row
const M = [['BID SIZE', Math.round(bid)], ['ASK SIZE', Math.round(ask)], ['IMBALANCE', (Math.abs(imb) < .005 ? '0.00' : (imb > 0 ? '+' : '−') + Math.abs(imb).toFixed(2))], ['SPREAD', '0.01'], ['LAST', '403.21'], ['WALL', 'L6 ×3.0']];
M.forEach(([k, v], i) => { const x = HX + i * 220; s += `<line x1="${x}" y1="912" x2="${x}" y2="986" stroke="${i === 5 ? OR : MU}" stroke-opacity="${i === 5 ? 1 : .5}"/><text x="${x + 16}" y="930" class="lab">${k}</text><text x="${x + 16}" y="976" class="big" style="${i === 5 ? `fill:${OR}` : ''}">${v}</text>`; });
// footer
s += `<line x1="96" y1="1014" x2="${W - 60}" y2="1014" stroke="${MU}" stroke-opacity=".3"/><text x="96" y="1040" class="foot">SOURCES / SIMULATED L2 BOOK FOR DESIGN STUDY · NOT MARKET DATA · PROJECTION IMAGERY COMPUTED, GRIT PASS APPLIED TO IMAGERY ONLY</text>`;
['#2459b3', '#2a8fa0', '#6b8a2a', '#b07a1e', '#c23d3d', '#9b3c8f', '#6d7a86'].forEach((c, i) => s += `<rect x="${W - 60 - 168 + i * 24}" y="1032" width="22" height="5" fill="${c}"/>`);
for (const [x, y] of [[72, 40], [W - 40, 40], [72, H - 24], [W - 40, H - 24]]) s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${CR}"/>`;
const css = `.h1{font:400 16px Michroma;fill:${CR};letter-spacing:.18em}.h2{font:400 34px Michroma;fill:${CR};letter-spacing:.12em}.h3{font:400 14px Michroma;fill:${CR};letter-spacing:.16em}
.num{font:400 52px Michroma;fill:${OR}}.cn{font:900 20px 'Noto Serif SC',serif;fill:${CR};letter-spacing:.3em}
.lab{font:400 11px 'IBM Plex Mono';fill:${MU};letter-spacing:.15em}.val{font:500 14px 'IBM Plex Mono';fill:${CR};letter-spacing:.06em}.lvl{font:500 12px 'IBM Plex Mono';fill:${MU}}
.bar{font:400 11px Michroma;fill:${BG};letter-spacing:.14em}.tab{font:400 11px Michroma;letter-spacing:.1em}.tag{font:500 15px 'IBM Plex Mono';letter-spacing:.08em}
.big{font:400 30px Michroma;fill:${CR};letter-spacing:.02em}.foot{font:400 10px 'IBM Plex Mono';fill:${MU};letter-spacing:.14em}
@keyframes bl{50%{opacity:.25}}.blink{animation:bl 1.2s steps(1) infinite}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit(variant === 'space' ? 'DepthSheetSpace' : 'DepthSheetMega', `DEP-0003 · ${variant}`, W, H, css, s, BG);
}
sheet('mega', '../art/depth-scene-mega.jpg', require('./depth-scene-mega.cjs'));
sheet('space', '../art/depth-scene-space.jpg', require('./depth-scene-space.cjs'));
