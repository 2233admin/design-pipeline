// Ref #4 family: line-art desk inventory. Themes × layouts, with Linear-style ambient motion.
const { emit, rng, r } = require('./common.cjs');

const THEMES = {
  navy:  { bg: '#ffffff', line: '#1c2d5e', ink: '#13224f', fill: '#ffffff', block: '#dfe8f6', tone: '#13224f', ghost: '#c8ccd3', accent: '#d6402f', blend: 'normal', grain: 0 },
  riso:  { bg: '#f3eee3', line: '#2f53a3', ink: '#2f53a3', fill: '#f3eee3', block: '#ffc2dc', tone: '#ff4f9a', ghost: '#e3c9d2', accent: '#ff4f9a', blend: 'multiply', grain: .09, misreg: true },
  night: { bg: '#0e1a3a', line: '#e6ecf7', ink: '#e6ecf7', fill: '#0e1a3a', block: '#17295a', tone: '#3c5fb8', ghost: '#26386a', accent: '#f2b33d', blend: 'normal', grain: .05 },
};

// ---- objects, each drawn at its own origin --------------------------------
const O = {
  ticket(T) {
    // fan-fold line-printer paper: tractor holes, channel columns of intensity codes; one column reads 6 E Q U J 5
    let o = `<rect x="0" y="0" width="420" height="700" class="obj"/><line x1="34" y1="0" x2="34" y2="700" class="dot"/><line x1="386" y1="0" x2="386" y2="700" class="dot"/><line x1="0" y1="350" x2="420" y2="350" class="dot"/>`;
    for (let y = 22; y < 700; y += 36) o += `<circle cx="17" cy="${y}" r="6" class="thin"/><circle cx="403" cy="${y}" r="6" class="thin"/>`;
    o += `<text x="48" y="40" class="mono small">OSURO  BIG EAR  1977 AUG 15</text><text x="48" y="60" class="mono small">CH  1 2 3 4 5 6 7 8 9 ...</text>`;
    rng(17); const wow = ['6', 'E', 'Q', 'U', 'J', '5'];
    for (let row = 0; row < 26; row++) { let line = ''; for (let c = 0; c < 12; c++) { if (c === 1 && row >= 12 && row < 18) { line += wow[row - 12] + ' '; continue; } const v = rng(); line += (v < .55 ? '1' : v < .8 ? ' ' : v < .95 ? '2' : '3') + ' '; } o += `<text x="66" y="${92 + row * 22}" class="mono pr">${line}</text>`; }
    o += `<ellipse cx="98" cy="${92 + 14.5 * 22}" rx="22" ry="78" fill="none" stroke="${T.accent}" stroke-width="3" class="circ" pathLength="1"/>`;
    o += `<text x="136" y="${92 + 13 * 22}" class="hand1" style="fill:${T.accent}" transform="rotate(-8 136 ${92 + 13 * 22})">Wow!</text>`;
    return o;
  },
  clock(T, R = 150) {
    const ang = (h) => (h / 24) * 2 * Math.PI - Math.PI / 2, pt = (h, rr) => [Math.cos(ang(h)) * rr, Math.sin(ang(h)) * rr];
    const arc = (h0, h1, rr) => { const [x0, y0] = pt(h0, rr), [x1, y1] = pt(h1, rr); return `M${r(x0)},${r(y0)} A${rr},${rr} 0 ${h1 - h0 > 12 ? 1 : 0} 1 ${r(x1)},${r(y1)}`; };
    let o = `<circle r="${R}" class="obj"/><circle r="${R - 14}" class="thin"/>`;
    for (let h = 0; h < 24; h++) { const [x0, y0] = pt(h, R - 14), [x1, y1] = pt(h, R - (h % 6 ? 24 : 34)); o += `<line x1="${r(x0)}" y1="${r(y0)}" x2="${r(x1)}" y2="${r(y1)}" class="${h % 6 ? 'thin' : 'ln'}"/>`; }
    for (const h of [0, 6, 12, 18]) { const [x, y] = pt(h, R - 52); o += `<text x="${r(x)}" y="${r(y + 5)}" class="mono" text-anchor="middle">${String(h).padStart(2, '0')}</text>`; }
    const hx = pt(22 + 16 / 60, R - 30);
    o += `<path d="${arc(21.6, 22.5, R - 76)}" fill="none" stroke="${T.accent}" stroke-width="12" class="pulse"/>`;
    o += `<line x1="0" y1="0" x2="${r(hx[0])}" y2="${r(hx[1])}" class="ln" style="stroke-width:3"/><g class="hand"><line x1="0" y1="0" x2="0" y2="${-(R - 40)}" class="thin"/></g><circle r="5" class="ink"/>`;
    return o;
  },
  key(T) {
    // IBM-style 80-column card, clipped corner, punched holes
    let o = `<path d="M18,0 H330 V150 H0 V18 Z" class="obj"/>`;
    rng(23); for (let c = 0; c < 40; c++) for (let rr = 0; rr < 10; rr++) { const x = 16 + c * 7.6, y = 22 + rr * 12.5; if (rng() < .13) o += `<rect x="${r(x)}" y="${r(y)}" width="3.4" height="7" class="ink"/>`; else if (rr === 0 && c % 5 === 0) o += `<text x="${r(x)}" y="${r(y + 6)}" class="mono" style="font-size:6px">${c}</text>`; }
    o += `<circle cx="300" cy="20" r="5" class="led" style="fill:${T.accent}"/>`;
    return o;
  },
  calc(T) {
    let o = `<rect x="0" y="0" width="300" height="430" rx="14" class="obj"/><rect x="26" y="26" width="248" height="86" class="obj"/>`;
    [['1420.3556', 'd1'], ['1420.4058', 'd2'], ['1420.4556', 'd3']].forEach(([v, c]) => o += `<text x="256" y="90" class="mono ${c}" style="font-size:34px" text-anchor="end">${v}</text>`);
    ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+'].forEach((k, i) => { const x = 26 + (i % 4) * 64, y = 136 + Math.floor(i / 4) * 66; o += `<rect x="${x}" y="${y}" width="52" height="52" rx="6" class="obj ${i === 10 ? 'press' : ''}"/><text x="${x + 26}" y="${y + 33}" class="mono" text-anchor="middle">${k}</text>`; });
    return o;
  },
  coffee(T) {
    let o = `<circle r="96" class="obj"/><circle r="78" class="ln"/><circle r="70" fill="${T.block}"/><path d="M-96,-20 C-170,-30 -180,40 -94,32" class="ln"/>`;
    for (let i = 0; i < 3; i++) o += `<path d="M${-30 + i * 30},-40 c-14,-24 14,-36 0,-60 c-14,-24 14,-36 0,-60" class="ln steam s${i}"/>`;
    return o;
  },
  note(T) {
    return `<rect x="0" y="0" width="230" height="200" fill="${T.block}" stroke="${T.line}" stroke-width="2"/><text x="24" y="90" class="hand1">check horn B.</text><text x="24" y="140" class="hand1">never again?</text>
<rect x="14" y="56" width="210" height="44" fill="${T.block}" class="wipe w1"/><rect x="14" y="106" width="210" height="44" fill="${T.block}" class="wipe w2"/>`;
  },
  logo(T) {
    return `<rect x="0" y="0" width="190" height="190" class="obj"/><rect x="46" y="46" width="98" height="98" fill="none" stroke="${T.ink}" stroke-width="7"/><path d="M60,130 L130,60" stroke="${T.ink}" stroke-width="7"/><rect x="110" y="52" width="20" height="20" style="fill:${T.accent}"/>`;
  },
};

function halftone(T, X0, Y0, PW, PH, step = 10) {
  // the Milky Way toward Sagittarius: a diagonal glow band, dark dust lanes, a scatter of stars
  rng(29);
  const stars = Array.from({ length: 70 }, () => [rng(), rng(), .004 + rng() * rng() * .02]);
  const n = (u, v) => Math.sin(u * 11 + Math.sin(v * 7) * 1.6) * Math.cos(v * 13 - Math.sin(u * 5) * 2) + .5 * Math.sin(u * 29 + v * 23);
  let d = '';
  for (let y = Y0 + step / 2; y < Y0 + PH; y += step) for (let x = X0 + step / 2; x < X0 + PW; x += step) {
    const u = (x - X0) / PW, v = (y - Y0) / PH;
    const band = Math.exp(-(((u + v * .9) - 1.0) ** 2) / .06);              // glow along the diagonal
    const dust = Math.max(0, n(u, v) - .2) * Math.exp(-(((u + v * .9) - 1.02) ** 2) / .02);
    let dark = .82 - .62 * band + .7 * dust;
    for (const [su, sv, sr] of stars) { const rr = Math.hypot((u - su) * PW / PH, v - sv); if (rr < sr) dark = Math.min(dark, .05); }
    const e = Math.min(x - X0, X0 + PW - x, y - Y0, Y0 + PH - y); if (e < 40) dark *= .35 + .65 * e / 40;
    const rad = Math.max(0, Math.min(1, dark)) * step * .56; if (rad > .6) d += `<circle cx="${x}" cy="${y}" r="${r(rad)}"/>`;
  }
  const tx = X0 + PW * .8, ty = Y0 + PH * .36;
  return `<g fill="${T.tone}" style="mix-blend-mode:${T.blend}">${d}</g><rect x="${X0}" y="${Y0}" width="${PW}" height="${PH}" class="sweep"/>
<g class="pulse"><circle cx="${tx}" cy="${ty}" r="26" fill="none" stroke="${T.accent === T.line ? '#fff' : T.accent}" stroke-width="2"/><path d="M${tx - 40},${ty}h22M${tx + 18},${ty}h22M${tx},${ty - 40}v22M${tx},${ty + 18}v22" stroke="${T.accent === T.line ? '#fff' : T.accent}" stroke-width="2"/></g>`;
}
const pix = (x, y) => `<g class="pix"><rect x="${x}" y="${y}" width="26" height="26" class="ink p1"/><rect x="${x + 36}" y="${y + 20}" width="26" height="26" class="ink p2"/><rect x="${x + 22}" y="${y + 46}" width="26" height="26" class="ink p3"/></g>`;
const at = (x, y, rot, body, cls = '') => `<g transform="translate(${x},${y}) rotate(${rot})"><g class="${cls}">${body}</g></g>`;

function scatter(T) {
  let s = `<text x="120" y="1440" class="ghost">wow!</text>`;
  for (const [x, y, w, h] of [[1060, 150, 110, 110], [1360, 520, 210, 640], [200, 1150, 150, 50]]) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${T.block}" style="mix-blend-mode:${T.blend}"/>`;
  s += halftone(T, 300, 330, 1000, 930);
  for (const [x, y, w, h] of [[400, 240, 560, 640], [1230, 300, 450, 470], [860, 1010, 700, 470], [180, 470, 210, 210], [240, 870, 380, 260]]) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="frame" pathLength="1"/>`;
  s += at(470, 150, -5, O.ticket(T), 'float f1') + `<text x="990" y="300" class="lab">the printout</text>`;
  s += at(1455, 540, 0, O.clock(T)) + `<text x="1455" y="730" class="lab" text-anchor="middle">observatory clock (EDT)</text>`;
  s += `<text x="1625" y="500" class="mono small">22:16 EDT · 15 AUG 1977</text><text x="1625" y="522" class="mono small">02:16 UTC · 16 AUG</text><text x="1625" y="544" class="mono small">72 s IN THE BEAM</text>`;
  s += at(1520, 860, 18, O.key(T), 'float f2') + `<text x="1560" y="1140" class="lab">a punched card</text>`;
  s += at(980, 1030, -4, O.calc(T), 'float f3') + `<text x="1330" y="1460" class="lab">three answers (MHz)</text>`;
  s += at(230, 1000, 0, O.coffee(T)) + `<text x="230" y="1135" class="lab" text-anchor="middle">cold coffee</text>`;
  s += at(1590, 1160, 5, O.note(T)) + `<text x="1700" y="1400" class="lab" text-anchor="middle">a note to self</text>`;
  s += at(190, 480, 0, O.logo(T)) + `<text x="190" y="705" class="lab">KATANAview</text>`;
  s += pix(1420, 170) + pix(150, 380) + pix(1300, 950);
  s += `<text x="1870" y="140" class="t1" text-anchor="end">KATANAview Archive</text><text x="1870" y="196" class="t2" text-anchor="end">Card #02 · Big Ear, 1977</text>`;
  s += `<text x="150" y="1555" class="big">6EQUJ5</text><text x="640" y="1555" class="mid">72 s</text><text x="900" y="1555" class="cred">Observer: Jerry R. Ehman</text><text x="1870" y="1555" class="cred" text-anchor="end">Sky: Sagittarius</text>`;
  return s;
}

function catalogue(T) {
  // museum-style inventory sheet: 3 × 2 numbered cells, each object centred with a spec line
  const cells = [
    ['01', 'the printout', 'IBM 1130 line printer', (x, y) => at(x - 150, y - 250, -3, `<g transform="scale(.7)">${O.ticket(T)}</g>`, 'float f1')],
    ['02', 'observatory clock', '22:16 EDT · 15 AUG 1977', (x, y) => at(x, y, 0, O.clock(T, 170))],
    ['03', 'a punched card', '80 columns, 12 rows', (x, y) => at(x - 165, y - 75, 0, O.key(T), 'float f2')],
    ['04', 'three answers', 'Kraus · H line · Ehman (MHz)', (x, y) => at(x - 130, y - 190, 0, `<g transform="scale(.88)">${O.calc(T)}</g>`, 'float f3')],
    ['05', 'cold coffee', 'three days of printouts', (x, y) => at(x, y + 30, 0, O.coffee(T))],
    ['06', 'a note to self', 'one beam saw it, one did not', (x, y) => at(x - 115, y - 100, 3, O.note(T))],
  ];
  let s = `<text x="560" y="1760" class="ghost" style="font-size:330px">6EQUJ5</text>`;
  s += `<rect x="100" y="100" width="1800" height="1" class="inkfill"/><text x="100" y="80" class="t2">KATANAview Archive · Big Ear, 15 Aug 1977</text><text x="1900" y="80" class="t2" text-anchor="end">Inventory Sheet 02 / 06 items</text>`;
  const CW = 600, CH = 640, X0 = 100, Y0 = 140;
  cells.forEach(([n, name, spec, draw], i) => {
    const cx = X0 + (i % 3) * CW, cy = Y0 + Math.floor(i / 3) * CH;
    if (i === 1) s += `<rect x="${cx}" y="${cy}" width="${CW}" height="${CH}" fill="${T.block}" style="mix-blend-mode:${T.blend}"/>`;
    if (i === 3) s += `<g clip-path="url(#cell${i})"><clipPath id="cell${i}"><rect x="${cx}" y="${cy}" width="${CW}" height="${CH}"/></clipPath>${halftone(T, cx, cy + 80, CW, CH - 200, 9)}</g>`;
    s += `<rect x="${cx}" y="${cy}" width="${CW}" height="${CH}" class="frame" pathLength="1"/>`;
    s += draw(cx + CW / 2, cy + CH / 2 - 10);
    s += `<text x="${cx + 24}" y="${cy + 46}" class="num">${n}</text><text x="${cx + 24}" y="${cy + CH - 52}" class="lab">${name}</text><text x="${cx + 24}" y="${cy + CH - 24}" class="mono small">${spec}</text>`;
  });
  s += pix(1780, 150) + pix(1820, 1450);
  s += `<text x="100" y="1560" class="big" style="font-size:56px">WOW! SIGNAL</text><text x="1900" y="1560" class="cred" text-anchor="end">Sources: Ehman (1998); Ohio History Connection</text>`;
  return s;
}

function css(T) {
  return `
.ghost{font:300 340px Outfit;fill:none;stroke:${T.ghost};stroke-width:2}
.obj{fill:${T.fill};stroke:${T.line};stroke-width:2;stroke-linejoin:round}
.ln{fill:none;stroke:${T.line};stroke-width:2}.thin{fill:none;stroke:${T.line};stroke-width:1}
.dot{stroke:${T.line};stroke-dasharray:2 4;stroke-width:1}
.ink,.inkfill{fill:${T.ink}}
.frame{fill:none;stroke:${T.line};stroke-width:1.5;opacity:.85;stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.6s cubic-bezier(.2,.8,.2,1) .2s forwards}
.mono{font:500 15px 'IBM Plex Mono';fill:${T.ink};letter-spacing:.06em}.pr{font-size:14px;letter-spacing:.12em;white-space:pre}
@keyframes circ{0%,20%{stroke-dashoffset:1}50%,100%{stroke-dashoffset:0}}.circ{stroke-dasharray:1;animation:circ 6s cubic-bezier(.6,0,.3,1) infinite}.small{font-size:13px}
.lab{font:500 22px Outfit;fill:${T.ink}}.num{font:300 40px Outfit;fill:${T.ink}}
.hand1{font:29px 'Nothing You Could Do';fill:${T.ink}}
.t1{font:500 44px Outfit;fill:${T.ink}}.t2{font:300 32px Outfit;fill:${T.ink}}
.big{font:300 74px Outfit;fill:${T.ink};letter-spacing:.08em}.mid{font:300 50px Outfit;fill:${T.ink};letter-spacing:.04em}.cred{font:300 32px Outfit;fill:${T.ink}}
${T.misreg ? `.obj,.ln,.thin{filter:drop-shadow(3px 2px 0 ${T.tone}99)}` : ''}
/* ambient motion — slow, small, staggered (Linear-style) */
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.float{animation:float 7s ease-in-out infinite}.f2{animation-delay:-2.3s}.f3{animation-delay:-4.6s}
@keyframes scan{0%{transform:translateY(0);opacity:0}10%{opacity:.9}60%{transform:translateY(88px);opacity:.9}70%,100%{transform:translateY(88px);opacity:0}}
.scan{animation:scan 3.2s cubic-bezier(.4,0,.2,1) infinite}
@keyframes spin{to{transform:rotate(360deg)}}.hand{animation:spin 24s linear infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}.pulse{animation:pulse 2.8s ease-in-out infinite}
@keyframes led{0%,88%,100%{opacity:1}92%{opacity:.15}}.led{animation:led 2.4s steps(1) infinite}
@keyframes d1{0%,30%{opacity:1}33%,100%{opacity:0}}@keyframes d2{0%,30%{opacity:0}33%,63%{opacity:1}66%,100%{opacity:0}}@keyframes d3{0%,63%{opacity:0}66%,100%{opacity:1}}
.d1{animation:d1 6s infinite}.d2{animation:d2 6s infinite}.d3{animation:d3 6s infinite}
@keyframes press{0%,60%,72%,100%{fill:${T.fill}}64%,68%{fill:${T.block}}}.press{animation:press 2s infinite}
@keyframes steam{0%{opacity:0;transform:translateY(10px)}30%{opacity:.8}100%{opacity:0;transform:translateY(-26px)}}
.steam{animation:steam 4s ease-out infinite}.s1{animation-delay:-1.3s}.s2{animation-delay:-2.6s}
@keyframes wipe{0%,15%{transform:scaleX(1)}45%,85%{transform:scaleX(0)}100%{transform:scaleX(1)}}
.wipe{transform:scaleX(0);transform-origin:100% 50%;transform-box:fill-box;animation:wipe 8s cubic-bezier(.6,0,.3,1) infinite}.w2{animation-delay:.6s}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}.p1{animation:blink 3s steps(1) infinite}.p2{animation:blink 3s steps(1) -1s infinite}.p3{animation:blink 3s steps(1) -2s infinite}
@keyframes sweep{0%{transform:translateX(-30%);opacity:0}20%,80%{opacity:1}100%{transform:translateX(130%);opacity:0}}
.sweep{fill:url(#sw);transform-box:fill-box;animation:sweep 9s cubic-bezier(.4,0,.2,1) infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.frame,.circ{stroke-dashoffset:0}.d1,.d2{opacity:0}}`;
}
const defs = (T) => `<defs><linearGradient id="sw" x1="0" x2="1"><stop offset="0" stop-color="${T.bg}" stop-opacity="0"/><stop offset=".5" stop-color="${T.bg}" stop-opacity=".35"/><stop offset="1" stop-color="${T.bg}" stop-opacity="0"/></linearGradient>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .4 0 0 0 0 .35 0 0 0 0 .3 0 0 0 ${T.grain} 0"/></filter></defs>`;

const jobs = [
  ['Desk', 'navy', scatter, 2000, 1600, 'Archive Card #02 · Big Ear 1977 (animated)'],
  ['DeskRiso', 'riso', scatter, 2000, 1600, 'Archive Card #02 · Riso'],
  ['DeskNight', 'night', scatter, 2000, 1600, 'Archive Card #02 · Night'],
  ['DeskCatalogue', 'navy', catalogue, 2000, 1600, 'Archive · Inventory Sheet 02'],
];
for (const [name, th, layout, W, H, title] of jobs) {
  const T = { ...THEMES[th], night: th === 'night' };
  const body = defs(T) + layout(T) + (T.grain ? `<rect width="${W}" height="${H}" filter="url(#grain)" style="pointer-events:none"/>` : '');
  emit(name, title, W, H, css(T), body, T.bg);
}
