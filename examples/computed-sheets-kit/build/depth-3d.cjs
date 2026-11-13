// 3D order-book depth: 91 L2 snapshots × 10 levels a side as a lit canyon. Simulated data (SIM).
const { emit, rng, r } = require('./common.cjs');
const W = 1920, H = 1080, T = 91, L = 10, BG = '#0A0607';
rng(43);
// --- simulate: mid random walk, depth per level grows with distance, one persistent ask wall at L6
let mid = 403.2; const snaps = [];
for (let t = 0; t < T; t++) {
  mid += (rng() - .5) * .04;
  const bid = [], ask = [];
  for (let k = 1; k <= L; k++) {
    const base = 40 + 22 * k + 18 * Math.sin(t / 9 + k);
    bid.push(base * (.7 + .6 * rng()) * 1.15);
    ask.push(base * (.7 + .6 * rng()) * (k === 6 && t > 30 ? 3.2 : 1));
  }
  snaps.push({ mid, bid, ask });
}
const cum = (a) => a.reduce((o, v) => (o.push((o.at(-1) || 0) + v), o), []);
// --- camera: X = level (−10 bid … +10 ask), Z = snapshot age (0 = newest, near), Y = cumulative size
const CX = 960, HOR = 330, F = 1500, CAMY = 2200, D = 11;
const P = (X, Y, Z) => { const z = Z * .9 + D; return [CX + F * X * 1.15 / z, HOR + F * (CAMY - Y) / 260 / z]; };
const heat = (k, side) => { const t = (k - 1) / (L - 1); const a = side < 0 ? [255, 214, 140] : [255, 236, 190], b = side < 0 ? [190, 52, 22] : [220, 80, 30]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; };
let s = `<rect width="${W}" height="${H}" fill="${BG}"/><radialGradient id="glow" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#5a1408" stop-opacity=".55"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#glow)"/>`;
// background wire mountains (value noise ridges), far planes first
let wire = '';
for (let row = 0; row < 26; row++) {
  const Z = 130 - row * 4.6; let d = '';
  for (let col = -40; col <= 40; col++) { const X = col * .7, n = Math.sin(col * .9 + row) * Math.cos(col * .37 - row * .6) + Math.sin(col * .23 + row * 1.7) * .6; const Y = Math.max(0, n) * 900 + (Math.abs(X) > 9 ? 300 + Math.abs(X) * 20 : 0); const [x, y] = P(X, Y, Z); d += `${col === -40 ? 'M' : 'L'}${r(x)},${r(y)}`; }
  wire += `<path d="${d}" fill="none" stroke="#c23a2e" stroke-opacity="${(.12 + row * .012).toFixed(3)}" stroke-width=".8"/>`;
}
s += wire;
// canyon surfaces: draw from oldest (far) to newest (near)
let surf = '';
for (let t = T - 2; t >= 0; t--) {
  for (const side of [-1, 1]) {
    const a = cum(side < 0 ? snaps[t].bid : snaps[t].ask), b = cum(side < 0 ? snaps[t + 1].bid : snaps[t + 1].ask);
    for (let k = L - 1; k >= 0; k--) {
      const x0 = side * (k + .35), x1 = side * (k + 1.35), y0 = k ? a[k - 1] : 0, y1 = a[k], y0b = k ? b[k - 1] : 0, y1b = b[k];
      const q = [P(x0, y0, t), P(x1, y1, t), P(x1, y1b, t + 1), P(x0, y0b, t + 1)];
      surf += `<path d="M${q.map((p) => r(p[0]) + ',' + r(p[1])).join('L')}Z" fill="${heat(k + 1, side)}" fill-opacity="${(.55 + .45 * (1 - t / T)).toFixed(2)}" stroke="#2a0a04" stroke-opacity=".55" stroke-width=".6"/>`;
    }
  }
}
s += surf;
// last-price line in the canyon floor, ask wall bars at the back
let lp = ''; for (let t = T - 1; t >= 0; t--) { const off = (snaps[t].mid - 403.2) * 3; const [x, y] = P(off, 0, t); lp += `${t === T - 1 ? 'M' : 'L'}${r(x)},${r(y)}`; }
s += `<path d="${lp}" fill="none" stroke="#000" stroke-width="10"/><path d="${lp}" fill="none" stroke="#5fc8f0" stroke-width="2.4"/>`;
let wall = ''; for (let t = 88; t >= 31; t -= 3) { const a = cum(snaps[t].ask); const [x0, yb] = P(6.35, a[4], t), [x1] = P(7.35, a[5], t), [, yt] = P(6.35, a[5] * 2.4, t); wall += `<rect x="${r(x0)}" y="${r(yt)}" width="${r(Math.max(2, x1 - x0))}" height="${r(yb - yt)}" fill="#ffd9a0" fill-opacity=".16" stroke="#ffe8c4" stroke-opacity=".7" stroke-width=".8"/>`; }
s += wall;
const [lx, ly] = P((snaps[22].mid - 403.2) * 3, 0, 22); const [wx, wy] = P(6.85, cum(snaps[60].ask)[5] * 2.4, 60);
const tag = (x, y, t, bg, fg) => `<rect x="${x}" y="${y - 20}" width="${t.length * 9.2 + 20}" height="28" fill="${bg}"/><text x="${x + 10}" y="${y - 1}" class="tag" style="fill:${fg}">${t}</text>`;
s += `<circle cx="${r(lx)}" cy="${r(ly)}" r="7" fill="none" stroke="#5fc8f0" stroke-width="2"/><line x1="${r(lx)}" y1="${r(ly)}" x2="${r(lx + 70)}" y2="${r(ly)}" stroke="#5fc8f0"/>` + tag(r(lx + 70), r(ly + 8), `LAST ${snaps[0].mid.toFixed(2)}`, '#5fc8f0', '#06121a');
s += `<line x1="${r(wx)}" y1="${r(wy)}" x2="${r(wx - 90)}" y2="${r(wy - 60)}" stroke="#ffd9a0"/>` + tag(r(wx - 360), r(wy - 56), 'ASK WALL · L6 × 3.2', '#ffd9a0', '#1a0d04');
const [bx, by] = P(-4.5, cum(snaps[14].bid)[3], 14); s += `<line x1="${r(bx)}" y1="${r(by)}" x2="${r(bx - 160)}" y2="${r(by + 120)}" stroke="#fff"/>` + tag(r(bx - 320), r(by + 130), 'BID FLOOR', '#f4efe6', '#140806');
// HUD
const bidVol = snaps[0].bid.reduce((a, b) => a + b, 0), askVol = snaps[0].ask.reduce((a, b) => a + b, 0), imb = (bidVol - askVol) / (bidVol + askVol);
s += `<rect width="${W}" height="30" fill="#140a08"/><text x="20" y="20" class="hud">■ KATANAVIEW · 3D DEPTH · 600519.XSHG · 10 LEVELS · 91 SNAPSHOTS · L2 REPLAY</text><text x="${W - 20}" y="20" class="hud" text-anchor="end"><tspan style="fill:#ffb020">● SIM</tspan>  DEPTH 10 · SNAPSHOTS ${T}</text>`;
s += `<text x="40" y="80" class="h">600519.XSHG</text><text x="40" y="104" class="hud">SIMULATED BOOK · NOT MARKET DATA</text>`;
for (let k = 1; k <= L; k++) s += `<rect x="40" y="${118 + k * 22}" width="12" height="12" fill="${heat(k, -1)}"/><text x="60" y="${128 + k * 22}" class="hud">LEVEL ${k}</text>`;
s += `<text x="40" y="${118 + 11 * 22 + 14}" class="hud" style="fill:#5fc8f0">— LAST PRICE</text>`;
s += `<rect x="${W - 440}" y="${H - 130}" width="410" height="100" fill="#140a08" stroke="#5a2a1a"/><text x="${W - 420}" y="${H - 100}" class="hud">BID SIZE ${Math.round(bidVol)} · ASK SIZE ${Math.round(askVol)}</text><text x="${W - 420}" y="${H - 76}" class="hud">IMBALANCE ${imb >= 0 ? '+' : ''}${imb.toFixed(2)} · LVL L1–L10</text><text x="${W - 420}" y="${H - 52}" class="hud">HEIGHT = CUMULATIVE SIZE · DEPTH = TIME</text>`;
const css = `.hud{font:400 13px 'IBM Plex Mono';fill:#e9ddd0;letter-spacing:.08em}.h{font:400 26px Michroma;fill:#f4efe6;letter-spacing:.12em}.tag{font:500 14px 'IBM Plex Mono';letter-spacing:.08em}`;
emit('Depth3D', '3D depth (simulated L2)', W, H, css, s, BG);
