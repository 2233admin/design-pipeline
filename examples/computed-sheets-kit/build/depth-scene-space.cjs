// Hologram scene for the depth archive sheet: the holo piece with its HUD cards, callouts and titles removed
// and the object moved right into the sheet's hero window. Exports the anchors the sheet draws callouts at.
const { emit, rng, r } = require('./common.cjs');
const W = 1920, H = 1080, T = 46, L = 10, CY_ = '#FF7A2A', AMB = '#FFE2B8';
rng(43); let mid = 0; const snaps = [];
for (let t = 0; t < T; t++) { mid += (rng() - .5) * .25; const bid = [], ask = []; for (let k = 1; k <= L; k++) { const b = 40 + 22 * k + 18 * Math.sin(t / 5 + k); bid.push(b * (.7 + .6 * rng()) * 1.15); ask.push(b * (.7 + .6 * rng()) * (k === 6 && t < 30 ? 3.0 : 1)); } snaps.push({ mid, bid, ask }); }
const cum = (a) => a.reduce((o, v) => (o.push((o.at(-1) || 0) + v), o), []);
// world: x = level (−10…10), y = cumulative size, z = time. Camera orbits the object.
const yaw = -0.62, pitch = 0.33, Fo = 1250, OX = 1180, OY = 690, DIST = 50;
const rot = ([x, y, z]) => { const cx = Math.cos(yaw), sx = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  let X = x * cx + z * sx, Z = -x * sx + z * cx; let Y = y * cp - Z * sp; Z = y * sp + Z * cp; return [X, Y, Z]; };
const P = (x, y, z) => { const [X, Y, Z] = rot([x, y, z - T / 2]); const s = Fo / (Z + DIST); return [OX + X * s, OY - Y * s, Z]; };
const ys = 1 / 115;
let holo = '', amber = '';
// curtains: one polyline per snapshot across both sides; every 5th brighter
for (let t = 0; t < T; t++) {
  const b = cum(snaps[t].bid), a = cum(snaps[t].ask), pts = [];
  for (let k = L - 1; k >= 0; k--) pts.push(P(-(k + 1), b[k] * ys, t));
  pts.push(P(snaps[t].mid * .4 - .3, 0, t), P(snaps[t].mid * .4 + .3, 0, t));
  for (let k = 0; k < L; k++) pts.push(P(k + 1, a[k] * ys, t));
  const op = (.25 + .55 * (1 - t / T)) * (t % 5 ? 1 : 1.6);
  holo += `<path d="M${pts.map((p) => r(p[0]) + ',' + r(p[1])).join('L')}" fill="none" stroke="${CY_}" stroke-opacity="${Math.min(1, op).toFixed(2)}" stroke-width="${t % 5 ? .9 : 1.6}"/>`;
}
// level ribs along time
for (const side of [-1, 1]) for (let k = 0; k < L; k += 1) { let d = ''; for (let t = 0; t < T; t++) { const c = cum(side < 0 ? snaps[t].bid : snaps[t].ask)[k]; const p = P(side * (k + 1), c * ys, t); d += `${t ? 'L' : 'M'}${r(p[0])},${r(p[1])}`; } holo += `<path d="${d}" fill="none" stroke="${CY_}" stroke-opacity=".28" stroke-width=".7"/>`; }
// price line on the floor
{ let d = ''; for (let t = 0; t < T; t++) { const p = P(snaps[t].mid * .4, 0, t); d += `${t ? 'L' : 'M'}${r(p[0])},${r(p[1])}`; } holo += `<path d="${d}" fill="none" stroke="#FFF4E0" stroke-width="2.4"/>`; }
// ask wall: amber translucent prisms
for (let t = 0; t < 29; t += 2) { const a = cum(snaps[t].ask); const q = [P(5.5, a[4] * ys, t), P(6.5, a[5] * ys, t), P(6.5, a[5] * ys, t + 1.6), P(5.5, a[4] * ys, t + 1.6)]; const g = [P(6, a[4] * ys, t), P(6, a[5] * ys * 1.9, t)]; amber += `<path d="M${q.map((p) => r(p[0]) + ',' + r(p[1])).join('L')}Z" fill="${AMB}" fill-opacity=".18" stroke="${AMB}" stroke-opacity=".8" stroke-width=".8"/><line x1="${r(g[0][0])}" y1="${r(g[0][1])}" x2="${r(g[1][0])}" y2="${r(g[1][1])}" stroke="${AMB}" stroke-opacity=".5"/>`; }
// base plate: concentric rings + radial ticks on the floor (y = 0), centred under the object
let base = ''; for (const [R, o] of [[13, .55], [15.5, .3], [18, .18]]) { let d = ''; for (let a = 0; a <= 360; a += 4) { const p = P(Math.cos(a * Math.PI / 180) * R, -.2, T / 2 + Math.sin(a * Math.PI / 180) * R * 1.4); d += `${a ? 'L' : 'M'}${r(p[0])},${r(p[1])}`; } base += `<path d="${d}" fill="none" stroke="${CY_}" stroke-opacity="${o}" stroke-width="1.2"/>`; }
for (let a = 0; a < 360; a += 6) { const p0 = P(Math.cos(a * Math.PI / 180) * 15.5, -.2, T / 2 + Math.sin(a * Math.PI / 180) * 21.7), p1 = P(Math.cos(a * Math.PI / 180) * (a % 30 ? 16.2 : 17.2), -.2, T / 2 + Math.sin(a * Math.PI / 180) * (a % 30 ? 22.7 : 24)); base += `<line x1="${r(p0[0])}" y1="${r(p0[1])}" x2="${r(p1[0])}" y2="${r(p1[1])}" stroke="${CY_}" stroke-opacity=".5"/>`; }
// vertical scale on a floating axis
let axis = ''; for (let v = 0; v <= 20; v += 5) { const p = P(-12.5, v, 0); axis += `<line x1="${r(p[0])}" y1="${r(p[1])}" x2="${r(p[0] + 14)}" y2="${r(p[1])}" stroke="${CY_}"/><text x="${r(p[0] - 8)}" y="${r(p[1] + 4)}" class="ax" text-anchor="end">${v * 115}</text>`; }
const [a0] = [P(-12.5, 0, 0)], a1 = P(-12.5, 20, 0); axis += `<line x1="${r(a0[0])}" y1="${r(a0[1])}" x2="${r(a1[0])}" y2="${r(a1[1])}" stroke="${CY_}" stroke-opacity=".6"/>`;
const [lx, ly] = P(snaps[0].mid * .4, 0, 0), wp = P(6, cum(snaps[14].ask)[5] * ys * 1.9, 14);

let s = `<defs>
<radialGradient id="bg" cx=".55" cy=".62" r=".75"><stop offset="0" stop-color="#2a1208"/><stop offset=".5" stop-color="#120705"/><stop offset="1" stop-color="#050202"/></radialGradient>
<linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${CY_}" stop-opacity=".35"/><stop offset="1" stop-color="${CY_}" stop-opacity="0"/></linearGradient>
<filter id="g1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="g2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="dof" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="dof2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" opacity=".35"/></pattern>
<clipPath id="hclip"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`;
s += `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
{ rng(77); let m = '';
  // star field, a few bright ones with crosses
  for (let i = 0; i < 900; i++) { const x = rng() * W, y = rng() * H, b = rng(); m += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(.3 + b * b * 1.6)}" fill="#ffe9d2" opacity="${(.2 + .8 * b * b).toFixed(2)}"/>`; if (b > .985) m += `<path d="M${r(x - 9)},${r(y)}h18M${r(x)},${r(y - 9)}v18" stroke="#ffe9d2" stroke-width=".6" opacity=".7"/>`; }
  // gas giant limb, lower left: hatched terminator, banded cloud lines
  const GX = 380, GY = 1580, GR = 1100;
  m += `<clipPath id="planet"><circle cx="${GX}" cy="${GY}" r="${GR}"/></clipPath><circle cx="${GX}" cy="${GY}" r="${GR}" fill="#1a0b06"/>`;
  let bands = ''; for (let k = 0; k < 60; k++) { const y = GY - GR + k * 22 + Math.sin(k) * 6; bands += `<path d="M${GX - GR},${r(y)} C${GX},${r(y - 30 + rng() * 60)} ${GX + GR / 2},${r(y + 20 - rng() * 40)} ${GX + GR},${r(y)}" fill="none" stroke="#6a3418" stroke-width="${r(.6 + rng() * 2)}" stroke-opacity="${(.25 + rng() * .5).toFixed(2)}"/>`; }
  let hat = ''; for (let i = -GR; i < GR * 2; i += 6) hat += `<line x1="${GX + i}" y1="${GY - GR}" x2="${GX + i - 700}" y2="${GY + GR}" stroke="#050202" stroke-width="2.6" stroke-opacity=".75"/>`;
  m += `<g clip-path="url(#planet)">${bands}<g clip-path="url(#term)">${hat}</g></g><clipPath id="term"><circle cx="${GX - 260}" cy="${GY + 220}" r="${GR}"/></clipPath>`;
  m += `<circle cx="${GX}" cy="${GY}" r="${GR}" fill="none" stroke="#FF7A2A" stroke-width="3" stroke-opacity=".9"/><circle cx="${GX}" cy="${GY}" r="${GR + 10}" fill="none" stroke="#FF7A2A" stroke-width="18" stroke-opacity=".12"/>`;
  // ring system, a thin ellipse in perspective
  m += `<ellipse cx="${GX + 120}" cy="${GY - 160}" rx="${GR * 1.55}" ry="190" fill="none" stroke="#c96a30" stroke-width="2" stroke-opacity=".5" transform="rotate(-14 ${GX} ${GY})"/><ellipse cx="${GX + 120}" cy="${GY - 160}" rx="${GR * 1.62}" ry="205" fill="none" stroke="#c96a30" stroke-width="1" stroke-opacity=".3" transform="rotate(-14 ${GX} ${GY})"/>`;
  // asteroid-ship silhouette, upper right: rocky mass with a long hull, hatched, with tiny lights
  const sx = 1840, sy = 120; let rock = ''; for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2, rr = 120 + 30 * Math.sin(a * 3) + 18 * Math.sin(a * 7) + rng() * 10; rock += `${k ? 'L' : 'M'}${r(sx + Math.cos(a) * rr * 1.3)},${r(sy + Math.sin(a) * rr * .8)}`; }
  m += `<path d="${rock}Z" fill="#120806" stroke="#FF7A2A" stroke-opacity=".5"/><path d="M${sx - 60},${sy + 40} L${sx - 760},${sy + 300} L${sx - 760},${sy + 330} L${sx - 40},${sy + 90} Z" fill="#120806" stroke="#FF7A2A" stroke-opacity=".45"/>`;
  let sh = ''; for (let i = 0; i < 120; i++) sh += `<line x1="${sx - 760 + i * 6}" y1="${r(sy + 300 - i * 2.2)}" x2="${sx - 760 + i * 6 + 4}" y2="${r(sy + 330 - i * 2.2 - 8)}" stroke="#6a3418" stroke-opacity=".7"/>`;
  m += sh; for (let i = 0; i < 24; i++) m += `<rect x="${r(sx - 740 + i * 30)}" y="${r(sy + 306 - i * 11)}" width="2" height="2" fill="#ffe2b8"/>`;
  for (let i = 0; i < 6; i++) m += `<path d="M${r(300 + rng() * 1300)},${r(120 + rng() * 300)} l14,-3 l2,3 l-14,3 Z" fill="#ffe2b8" opacity=".7"/>`;
  s += `<g opacity=".95">${m}</g>`;
}
// lab background: out-of-focus panels and floor grid
s += `<g filter="url(#dof)" opacity=".5"><rect x="80" y="120" width="300" height="700" fill="none" stroke="${CY_}" stroke-opacity=".25"/><rect x="1560" y="90" width="260" height="380" fill="${CY_}" fill-opacity=".04" stroke="${CY_}" stroke-opacity=".2"/></g>`;
let grid = ''; for (let i = -30; i <= 30; i += 2) { const p0 = P(i, -3, -20), p1 = P(i, -3, T + 30); grid += `<line x1="${r(p0[0])}" y1="${r(p0[1])}" x2="${r(p1[0])}" y2="${r(p1[1])}"/>`; } for (let z = -20; z <= T + 30; z += 3) { const p0 = P(-30, -3, z), p1 = P(30, -3, z); grid += `<line x1="${r(p0[0])}" y1="${r(p0[1])}" x2="${r(p1[0])}" y2="${r(p1[1])}"/>`; }

// projector beam (volumetric cone) under the object
const pc = P(0, -3, T / 2); s += `<path d="M${r(pc[0] - 40)},${r(pc[1] + 30)} L${r(pc[0] - 560)},${r(pc[1] - 520)} L${r(pc[0] + 520)},${r(pc[1] - 560)} L${r(pc[0] + 40)},${r(pc[1] + 30)} Z" fill="url(#beam)" filter="url(#g2)" opacity=".55"/><ellipse cx="${r(pc[0])}" cy="${r(pc[1] + 26)}" rx="90" ry="18" fill="${CY_}" filter="url(#g1)" opacity=".8"/>`;
// hologram: wide glow + soft glow + core + chromatic ghosts + scanlines, flickering
const H3 = base + holo + axis;
s += `<g class="flick" style="mix-blend-mode:screen">`;
s += `<g filter="url(#g2)" opacity=".7">${H3}${amber}</g><g filter="url(#g1)" opacity=".9">${H3}${amber}</g>`;
s += `<g transform="translate(-2,0)" opacity=".35" style="mix-blend-mode:screen"><g style="filter:hue-rotate(160deg)">${holo}</g></g>`;
s += `<g>${H3}${amber}</g></g>`;
s += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#scan)" opacity=".5"/><rect class="sweep" x="0" y="0" width="${W}" height="90" fill="${CY_}" opacity=".06"/>`;
module.exports = { last: [lx, ly], wall: [wp[0], wp[1]], snaps: snaps.map((q) => ({ bid: q.bid, ask: q.ask })) };
// particles
rng(2); for (let i = 0; i < 160; i++) { const z = rng(); s += `<circle cx="${r(rng() * W)}" cy="${r(rng() * H)}" r="${r(.5 + z * z * 4)}" fill="${CY_}" opacity="${(.15 + .45 * rng()).toFixed(2)}" ${z > .7 ? 'filter="url(#dof2)"' : ''}/>`; }

const css = `.t{font:400 30px Michroma;fill:#FFE9D2;letter-spacing:.24em}.sim{font:400 12px 'IBM Plex Mono';fill:${CY_};letter-spacing:.14em}
.ax{font:400 10px 'IBM Plex Mono';fill:${CY_}}.call{font:500 14px 'IBM Plex Mono';fill:#FFE9D2;letter-spacing:.1em}
.ct{font:400 13px Michroma;fill:${CY_};letter-spacing:.16em}.cr{font:400 12px 'IBM Plex Mono';fill:${CY_};letter-spacing:.1em}
@keyframes fl{0%,100%{opacity:1}47%{opacity:1}48%{opacity:.82}49%{opacity:1}73%{opacity:.93}}.flick{animation:fl 3.2s steps(1) infinite}
@keyframes sw{from{transform:translateY(-100px)}to{transform:translateY(${H}px)}}.sweep{animation:sw 5s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}.spin{animation:sp 6s linear infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit('DepthSceneSpace', 'Holographic order-book depth · deep space (simulated)', W, H, css, s, '#050202');
