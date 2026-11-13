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
const CX = 1180, HOR = 400, F = 1500, CAMY = 1500, D = 9;
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
const band = { far: '', mid: '', near: '' };
for (let t = T - 2; t >= 0; t--) {
  const key = t > 52 ? 'far' : t > 9 ? 'mid' : 'near';
  for (const side of [-1, 1]) {
    const a = cum(side < 0 ? snaps[t].bid : snaps[t].ask), b = cum(side < 0 ? snaps[t + 1].bid : snaps[t + 1].ask);
    for (let k = L - 1; k >= 0; k--) {
      const x0 = side * (k + .35), x1 = side * (k + 1.35), y0 = k ? a[k - 1] : 0, y1 = a[k], y0b = k ? b[k - 1] : 0, y1b = b[k];
      const q = [P(x0, y0, t), P(x1, y1, t), P(x1, y1b, t + 1), P(x0, y0b, t + 1)];
      band[key] += `<path d="M${q.map((p) => r(p[0]) + ',' + r(p[1])).join('L')}Z" fill="${heat(k + 1, side)}" stroke="#2a0a04" stroke-opacity=".5" stroke-width=".6"/>`;
    }
  }
}
s += `<defs><filter id="bfar" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.6"/></filter><filter id="bnear" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter><filter id="bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter><filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a3a" stop-opacity="0"/><stop offset=".42" stop-color="#ff8a4a" stop-opacity=".55"/><stop offset=".6" stop-color="#3a0e06" stop-opacity="0"/></linearGradient></defs>`;
s += `<g filter="url(#bfar)" opacity=".75">${band.far}</g><rect x="0" y="${HOR - 260}" width="${W}" height="520" fill="url(#fog)"/>`;
s += `<g>${band.mid}</g>`;
// last-price line in the canyon floor, ask wall bars at the back
let lp = ''; for (let t = T - 1; t >= 0; t--) { const off = (snaps[t].mid - 403.2) * 3; const [x, y] = P(off, 0, t); lp += `${t === T - 1 ? 'M' : 'L'}${r(x)},${r(y)}`; }
s += `<path d="${lp}" fill="none" stroke="#000" stroke-width="10"/><path d="${lp}" fill="none" stroke="#5fc8f0" stroke-width="2.4"/>`;
let wall = ''; for (let t = 88; t >= 31; t -= 3) { const a = cum(snaps[t].ask); const [x0, yb] = P(6.35, a[4], t), [x1] = P(7.35, a[5], t), [, yt] = P(6.35, a[5] * 2.4, t); wall += `<rect x="${r(x0)}" y="${r(yt)}" width="${r(Math.max(2, x1 - x0))}" height="${r(yb - yt)}" fill="#ffd9a0" fill-opacity=".16" stroke="#ffe8c4" stroke-opacity=".7" stroke-width=".8"/>`; }
s += `<g filter="url(#bloom)" style="mix-blend-mode:screen" opacity=".9">${wall}</g>` + wall;
s += `<g filter="url(#bnear)" opacity=".95">${band.near}</g>`;
rng(5); for (let i = 0; i < 140; i++) { const z = rng(), x = rng() * W, y = rng() * H, rad = .6 + z * z * 7; s += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad)}" fill="#ffd9b0" opacity="${(.15 + .5 * (1 - z)).toFixed(2)}" ${z > .6 ? 'filter="url(#bnear)"' : z > .3 ? 'filter="url(#soft)"' : ''}/>`; }
const [lx, ly] = P((snaps[22].mid - 403.2) * 3, 0, 22); const [wx, wy] = P(6.85, cum(snaps[60].ask)[5] * 2.4, 60);
const tag = (x, y, t, bg, fg) => `<rect x="${x}" y="${y - 20}" width="${t.length * 9.2 + 20}" height="28" fill="${bg}"/><text x="${x + 10}" y="${y - 1}" class="tag" style="fill:${fg}">${t}</text>`;
s += `<circle cx="${r(lx)}" cy="${r(ly)}" r="7" fill="none" stroke="#5fc8f0" stroke-width="2"/><line x1="${r(lx)}" y1="${r(ly)}" x2="${r(lx + 70)}" y2="${r(ly)}" stroke="#5fc8f0"/>` + tag(r(lx + 70), r(ly + 8), `LAST ${snaps[0].mid.toFixed(2)}`, '#5fc8f0', '#06121a');
s += `<line x1="${r(wx)}" y1="${r(wy)}" x2="${r(wx - 90)}" y2="${r(wy - 60)}" stroke="#ffd9a0"/>` + tag(r(wx - 360), r(wy - 56), 'ASK WALL · L6 × 3.2', '#ffd9a0', '#1a0d04');
const [bx, by] = P(-4.5, cum(snaps[14].bid)[3], 14); s += `<line x1="${r(bx)}" y1="${r(by)}" x2="${r(bx - 160)}" y2="${r(by + 120)}" stroke="#fff"/>` + tag(r(bx - 320), r(by + 130), 'BID FLOOR', '#f4efe6', '#140806');
// game UI layer
const bidVol = snaps[0].bid.reduce((a, b) => a + b, 0), askVol = snaps[0].ask.reduce((a, b) => a + b, 0), imb = (bidVol - askVol) / (bidVol + askVol);
const cham = (x, y, w, h, c = 14) => `M${x + c},${y}H${x + w}V${y + h - c}L${x + w - c},${y + h}H${x}V${y + c}Z`;
s += `<path d="M0,0H760L720,64H0Z" fill="#120806" fill-opacity=".86"/><path d="M0,64H720" stroke="#ff8a4a"/><text x="40" y="40" class="h">DEPTH CANYON</text><text x="430" y="40" class="hud">600519.XSHG · L2 × 91</text>`;
s += `<rect x="760" y="22" width="8" height="8" fill="#ffb020" class="blink"/><text x="776" y="31" class="hud" style="fill:#ffb020">SIM · NOT MARKET DATA</text>`;
// left panel: per-level bars, bid left, ask right of a centre line
const PX = 40, PY = 130; s += `<path d="${cham(PX, PY, 380, 470)}" fill="#120806" fill-opacity=".78" stroke="#ff8a4a" stroke-opacity=".45"/><text x="${PX + 20}" y="${PY + 34}" class="sec">BOOK · NOW</text><text x="${PX + 360}" y="${PY + 34}" class="hud" text-anchor="end">L1–L10</text>`;
const mx = Math.max(...snaps[0].bid, ...snaps[0].ask);
for (let k = 0; k < L; k++) { const y = PY + 64 + k * 36, bw = snaps[0].bid[k] / mx * 150, aw = snaps[0].ask[k] / mx * 150;
  for (let j = 0; j < Math.round(bw / 10); j++) s += `<rect x="${PX + 182 - (j + 1) * 10}" y="${y}" width="8" height="16" fill="${heat(k + 1, -1)}"/>`;
  for (let j = 0; j < Math.round(aw / 10); j++) s += `<rect x="${PX + 198 + j * 10}" y="${y}" width="8" height="16" fill="${k === 5 ? '#ffe8c4' : heat(k + 1, 1)}"/>`;
  s += `<text x="${PX + 190}" y="${y + 13}" class="lvl" text-anchor="middle">${k + 1}</text>`; }
s += `<text x="${PX + 20}" y="${PY + 450}" class="hud">BID ${Math.round(bidVol)}</text><text x="${PX + 360}" y="${PY + 450}" class="hud" text-anchor="end">ASK ${Math.round(askVol)}</text>`;
// imbalance dial
const DX = 230, DY = 790, DR = 90; s += `<circle cx="${DX}" cy="${DY}" r="${DR + 18}" fill="#120806" fill-opacity=".8" stroke="#ff8a4a" stroke-opacity=".4"/><g class="spin" style="transform-origin:${DX}px ${DY}px"><circle cx="${DX}" cy="${DY}" r="${DR}" fill="none" stroke="#ff8a4a" stroke-dasharray="3 9" stroke-opacity=".7"/></g>`;
const ang = Math.PI * (1 - (imb + 1) / 2); s += `<path d="M${DX - DR + 14},${DY} A${DR - 14},${DR - 14} 0 0 1 ${DX + DR - 14},${DY}" fill="none" stroke="#3a1a10" stroke-width="10"/><line x1="${DX}" y1="${DY}" x2="${r(DX + Math.cos(ang) * (DR - 14))}" y2="${r(DY - Math.sin(ang) * (DR - 14))}" stroke="#5fc8f0" stroke-width="3"/><text x="${DX}" y="${DY + 40}" class="big" text-anchor="middle">${imb >= 0 ? '+' : ''}${imb.toFixed(2)}</text><text x="${DX}" y="${DY + 62}" class="hud" text-anchor="middle">IMBALANCE</text>`;
// reticle on the last price
s += `<g class="spin" style="transform-origin:${r(lx)}px ${r(ly)}px"><circle cx="${r(lx)}" cy="${r(ly)}" r="26" fill="none" stroke="#5fc8f0" stroke-width="1.5" stroke-dasharray="10 6"/></g><path d="M${r(lx - 40)},${r(ly)}h12M${r(lx + 28)},${r(ly)}h12M${r(lx)},${r(ly - 40)}v12M${r(lx)},${r(ly + 28)}v12" stroke="#5fc8f0" stroke-width="2"/>`;
// bottom tape strip
s += `<path d="M0,${H - 56}H${W}V${H}H0Z" fill="#120806" fill-opacity=".86"/><path d="M0,${H - 56}H${W}" stroke="#ff8a4a" stroke-opacity=".6"/>`;
let tx = 40; rng(9); for (let i = 0; i < 14; i++) { const up = rng() > .45, px = (snaps[0].mid + (rng() - .5) * .1).toFixed(2), q = Math.round(100 + rng() * 900); const t = `${px} × ${q}`; s += `<rect x="${tx}" y="${H - 42}" width="${t.length * 8.6 + 22}" height="28" fill="${up ? '#3a1408' : '#0c1c22'}" stroke="${up ? '#ff8a4a' : '#5fc8f0'}" stroke-opacity=".7"/><text x="${tx + 11}" y="${H - 23}" class="hud" style="fill:${up ? '#ffd9b0' : '#bfe8f6'}">${t}</text>`; tx += t.length * 8.6 + 32; }
const css = `.sec{font:400 16px Michroma;fill:#f4efe6;letter-spacing:.14em}.lvl{font:500 11px 'IBM Plex Mono';fill:#f4efe6}.big{font:400 30px Michroma;fill:#f4efe6}@keyframes sp{to{transform:rotate(360deg)}}.spin{animation:sp 14s linear infinite}@keyframes bl{50%{opacity:.25}}.blink{animation:bl 1.2s steps(1) infinite}@media (prefers-reduced-motion:reduce){*{animation:none!important}}.hud{font:400 13px 'IBM Plex Mono';fill:#e9ddd0;letter-spacing:.08em}.h{font:400 26px Michroma;fill:#f4efe6;letter-spacing:.12em}.tag{font:500 14px 'IBM Plex Mono';letter-spacing:.08em}`;
emit('Depth3D', '3D depth canyon · game UI (simulated L2)', W, H, css, s, BG);
