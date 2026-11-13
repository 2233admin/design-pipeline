// Beat-cut teaser (120 BPM): glossy montage of scientific figures → wordmark. Every figure is computed.
const { emit, rng, r } = require('./common.cjs');
const W = 1920, H = 1080, CX = 960, CY = 540;
const BEAT = 0.5;                                  // s per beat at 120 BPM
const scenes = [];                                 // [beats, svg]
const add = (beats, svg) => scenes.push([beats, svg]);
const draw = (d, extra = '') => `<path d="${d}" pathLength="1" class="dr" ${extra}/>`;

// 1 · a point that breathes
add(2, `<circle cx="${CX}" cy="${CY}" r="6" fill="#fff" class="pop"/><circle cx="${CX}" cy="${CY}" r="60" fill="none" stroke="#fff" stroke-opacity=".3" class="ring"/>`);
// 2 · dipole field lines  r = L sin²θ
{ let o = ''; for (const L of [90, 150, 230, 330, 460, 620]) for (const s of [1, -1]) { let d = ''; for (let t = 0.02; t < Math.PI - 0.02; t += 0.02) { const rr = L * Math.sin(t) ** 2; d += `${d ? 'L' : 'M'}${r(CX + s * rr * Math.sin(t))},${r(CY - rr * Math.cos(t))}`; } o += draw(d, 'stroke="url(#chrome)" stroke-width="2"'); }
  add(3, o + `<rect x="${CX - 14}" y="${CY - 60}" width="28" height="120" fill="url(#chromeV)"/><text x="80" y="1000" class="cap">FIG. 01 · DIPOLE FIELD · r = L sin²θ</text>`); }
// 3 · cyclotron spiral  r ∝ √θ
{ let d = ''; for (let t = 0; t < Math.PI * 2 * 9; t += 0.04) { const rr = 46 * Math.sqrt(t); d += `${d ? 'L' : 'M'}${r(CX + Math.cos(t) * rr)},${r(CY + Math.sin(t) * rr * .55)}`; }
  add(2, draw(d, 'stroke="#f0a43a" stroke-width="2.4"') + `<text x="80" y="1000" class="cap">FIG. 02 · CYCLOTRON ORBIT · r ∝ √n · Tc-43, 1937</text>`); }
// 4 · pulsar pulse train (P = 1.3373 s, w = 0.04 s)
{ rng(4); let d = ''; const pxs = 1700 / (8 * 1.3373); for (let x = 0; x <= 1700; x++) { const ph = ((x / pxs) % 1.3373) / 1.3373; const y = ph < 0.04 / 1.3373 ? -(120 + rng() * 260) : (rng() - .5) * 18; d += `${x ? 'L' : 'M'}${110 + x},${r(CY + 140 + y)}`; }
  add(2, draw(d, 'stroke="#fff" stroke-width="1.6"') + `<text x="80" y="1000" class="cap">FIG. 03 · PSR B1919+21 · P = 1.3373 s · 81.5 MHz</text>`); }
// 5 · geometry: nested rotating polygons
{ let o = ''; for (let k = 3; k <= 9; k++) { const R = 60 + (k - 3) * 55; let d = ''; for (let i = 0; i <= k; i++) { const t = i / k * Math.PI * 2 - Math.PI / 2; d += `${i ? 'L' : 'M'}${r(Math.cos(t) * R)},${r(Math.sin(t) * R)}`; } o += `<g transform="translate(${CX},${CY})"><path d="${d}" fill="none" stroke="url(#chrome)" stroke-width="1.6" class="spin${k % 2 ? '' : ' rev'}"/></g>`; }
  add(2, o + `<text x="80" y="1000" class="cap">FIG. 04 · REGULAR POLYGONS, n = 3 … 9</text>`); }
// 6 · NMR multiplets (Pascal 1:2:1 and 1:3:3:1) as bars
{ let o = ''; const bars = [[620, [1, 3, 3, 1]], [1280, [1, 2, 1]]]; for (const [x0, w] of bars) w.forEach((v, i) => { const h = v * 120, x = x0 + i * 36 - w.length * 18; o += `<rect x="${x}" y="${CY + 220 - h}" width="10" height="${h}" fill="url(#chromeV)" class="rise" style="animation-delay:var(--d);"/>`; });
  o += `<line x1="300" y1="${CY + 220}" x2="1620" y2="${CY + 220}" stroke="#fff" stroke-opacity=".4"/>`;
  add(2, o + `<text x="80" y="1000" class="cap">FIG. 05 · J-COUPLING · CH₂ q 1:3:3:1 · CH₃ t 1:2:1</text>`); }
// 7 · ground track, i = 51.64°, period 92.9 min, Earth turns under it
{ let o = ''; const inc = 51.64 * Math.PI / 180; for (let k = 0; k < 16; k++) { let d = '', prev = null; for (let u = 0; u <= 360; u += 2) { const ph = u * Math.PI / 180; const lat = Math.asin(Math.sin(inc) * Math.sin(ph)) * 180 / Math.PI; let lon = Math.atan2(Math.cos(inc) * Math.sin(ph), Math.cos(ph)) * 180 / Math.PI - u * (92.9 / 1436) - k * 360 * 92.9 / 1436 - 120; lon = ((lon % 360) + 540) % 360 - 180; d += `${prev === null || Math.abs(lon - prev) > 180 ? 'M' : 'L'}${r(CX + lon * 4.6)},${r(CY - lat * 6)}`; prev = lon; } o += `<path d="${d}" fill="none" stroke="${k ? '#9fb6c9' : '#f0a43a'}" stroke-opacity="${k ? .35 : 1}" stroke-width="${k ? 1 : 2.4}"/>`; }
  add(3, o + `<line x1="${CX - 828}" y1="${CY}" x2="${CX + 828}" y2="${CY}" stroke="#fff" stroke-opacity=".25"/><text x="80" y="1000" class="cap">FIG. 06 · GROUND TRACK · i = 51.64° · 92.9 MIN</text>`); }
// 8 · halftone sphere with a moving light
{ let o = ''; for (let y = -300; y <= 300; y += 14) for (let x = -300; x <= 300; x += 14) { const z2 = 300 * 300 - x * x - y * y; if (z2 < 0) continue; const z = Math.sqrt(z2); const l = Math.max(0, (-.5 * x - .6 * y + .62 * z) / 300); const rad = 6.4 * (1 - l) + .4; o += `<circle cx="${CX + x}" cy="${CY + y}" r="${r(rad)}"/>`; }
  add(2, `<g fill="#e9eef2" class="breathe">${o}</g><text x="80" y="1000" class="cap">FIG. 07 · LAMBERT SPHERE, DOT SCREEN</text>`); }
// 9 · Kelly parabola fill
{ const g = (f) => f * .08 - .5 * f * f * .04; let d = `M${CX - 600},${CY + 200}`; for (let f = 0; f <= 4; f += .02) d += `L${r(CX - 600 + f * 300)},${r(CY + 200 - g(f) * 4000)}`; d += `L${CX + 600},${CY + 200}Z`;
  add(2, `<path d="${d}" fill="url(#chromeV)" class="wipeIn"/><line x1="${CX}" y1="${CY - 160}" x2="${CX}" y2="${CY + 200}" stroke="#f0a43a" stroke-dasharray="4 6"/><text x="80" y="1000" class="cap">FIG. 08 · LOG-OPTIMAL GROWTH · g(f) = fμ − ½f²σ²</text>`); }
// 10 · registration flash
{ let o = ''; for (let x = 160; x < W; x += 200) for (let y = 140; y < H; y += 200) o += `<path d="M${x - 10},${y}h20M${x},${y - 10}v20" stroke="#fff" stroke-width="2"/>`; add(1, o); }
// 11 · wordmark, sliced
const wm = (dx, cls = 'wm') => `<text x="${CX + dx}" y="${CY + 50}" class="${cls}" text-anchor="middle">KATANAVIEW</text>`;
add(1, `<clipPath id="s1"><rect width="${W}" height="${CY + 10}"/></clipPath><clipPath id="s2"><rect y="${CY + 10}" width="${W}" height="30"/></clipPath><clipPath id="s3"><rect y="${CY + 40}" width="${W}" height="500"/></clipPath><g clip-path="url(#s1)">${wm(-24)}</g><g clip-path="url(#s2)">${wm(40)}</g><g clip-path="url(#s3)">${wm(-8)}</g>`);
// 12 · end card
add(8, `<g class="glow">${wm(0)}</g>${wm(0)}<text x="${CX}" y="${CY + 120}" class="sub" text-anchor="middle">RISK LAB · ARCHIVE · TERMINAL</text><line x1="${CX - 260}" y1="${CY + 80}" x2="${CX + 260}" y2="${CY + 80}" stroke="#fff" stroke-opacity=".35" pathLength="1" class="dr"/>`);

// ---- timeline → CSS ----
const total = scenes.reduce((a, [b]) => a + b, 0) * BEAT;
let t0 = 0, body = '', css = '';
scenes.forEach(([beats, svg], i) => {
  const a = (t0 / total * 100), b = ((t0 + beats * BEAT) / total * 100);
  css += `@keyframes v${i}{0%{opacity:0}${a > 0 ? `${(a - .001).toFixed(3)}%{opacity:0}` : ''}${a.toFixed(3)}%{opacity:1}${(b - .001).toFixed(3)}%{opacity:1}${b < 100 ? `${b.toFixed(3)}%{opacity:0}100%{opacity:0}` : '100%{opacity:1}'}}\n.sc${i}{animation:v${i} ${total}s steps(1,end) infinite;--d:${t0}s}\n.sc${i} .dr,.sc${i} .rise,.sc${i} .wipeIn,.sc${i} .pop,.sc${i} .ring{animation-delay:${t0}s}\n`;
  body += `<g class="sc sc${i}">${svg}</g>`;
  t0 += beats * BEAT;
});
// in-scene motion re-triggers each loop: run with the loop period, active only in its window
css += `
.dr{fill:none;stroke-dasharray:1;stroke-dashoffset:1;animation:dr ${total}s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes dr{0%{stroke-dashoffset:1}${(1.2 / total * 100).toFixed(2)}%,100%{stroke-dashoffset:0}}
.rise{transform-box:fill-box;transform-origin:50% 100%;animation:rise ${total}s cubic-bezier(.2,.8,.2,1) infinite}
@keyframes rise{0%{transform:scaleY(0)}${(.5 / total * 100).toFixed(2)}%,100%{transform:scaleY(1)}}
.wipeIn{animation:wipe ${total}s cubic-bezier(.2,.8,.2,1) infinite;clip-path:inset(0 0 0 0)}
@keyframes wipe{0%{clip-path:inset(0 100% 0 0)}${(.8 / total * 100).toFixed(2)}%,100%{clip-path:inset(0 0 0 0)}}
.pop{transform-box:fill-box;transform-origin:50% 50%;animation:pop ${total}s ease-out infinite}
@keyframes pop{0%{transform:scale(0)}${(.25 / total * 100).toFixed(2)}%{transform:scale(1.6)}${(.5 / total * 100).toFixed(2)}%,100%{transform:scale(1)}}
.ring{transform-box:fill-box;transform-origin:50% 50%;animation:ring ${total}s ease-out infinite}
@keyframes ring{0%{transform:scale(.2);opacity:1}${(1 / total * 100).toFixed(2)}%,100%{transform:scale(3);opacity:0}}
.spin{transform-box:fill-box;transform-origin:50% 50%;animation:spin 6s linear infinite}.rev{animation-direction:reverse}
@keyframes spin{to{transform:rotate(360deg)}}
.breathe{animation:breathe 2s ease-in-out infinite}@keyframes breathe{50%{opacity:.75}}
.cap{font:400 13px 'IBM Plex Mono';fill:#aab6c0;letter-spacing:.2em}
.wm{font:400 120px Michroma;fill:url(#chromeT);letter-spacing:.12em}
.glow .wm{filter:url(#bloom);opacity:.6}
.sub{font:400 15px 'IBM Plex Mono';fill:#c9d2d9;letter-spacing:.42em}
@media (prefers-reduced-motion:reduce){.sc{animation:none!important;opacity:0}.sc${scenes.length - 1}{opacity:1}*{animation:none!important}.dr{stroke-dashoffset:0}}`;

const defs = `<defs>
<linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d6b78"/><stop offset=".3" stop-color="#f4f7f9"/><stop offset=".5" stop-color="#7c8a96"/><stop offset=".72" stop-color="#ffffff"/><stop offset="1" stop-color="#4a5560"/></linearGradient>
<linearGradient id="chromeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#8d9aa6"/><stop offset=".55" stop-color="#3b4550"/><stop offset="1" stop-color="#c9d3db"/></linearGradient>
<linearGradient id="chromeT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".48" stop-color="#c3cdd5"/><stop offset=".52" stop-color="#5c6873"/><stop offset="1" stop-color="#e8eef2"/></linearGradient>
<filter id="bloom" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .05 0"/></filter>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
</defs>`;
const frame = `<rect width="${W}" height="${H}" fill="#07090c"/>${body}<rect width="${W}" height="${H}" fill="url(#vig)" style="pointer-events:none"/><rect width="${W}" height="${H}" filter="url(#grain)" style="pointer-events:none"/>
<text x="80" y="80" class="cap">KATANAVIEW / TEASER</text><text x="${W - 80}" y="80" class="cap" text-anchor="end">120 BPM · ${total.toFixed(1)} s LOOP</text>`;
emit('Teaser', 'KATANAview teaser (beat-cut)', W, H, css, defs + frame, '#07090c');
console.log('total', total, 's');
