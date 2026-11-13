// Endfield-grammar pieces, laid out by hand (not slot-filled): neutral ground, one computed subject,
// titles on one shared left line, code-drawn condensed Latin over a CJK serif title, one fluorescent accent.
const { emit, rng, r } = require('./common.cjs');
const L = require('../../../skill/tools/template-bank/lettering.cjs');
const W = 1920, H = 1080, ACC = '#F2EE1C', INK = '#1A1A1C', INK2 = '#6B6B70';
const SERIF = "'Noto Serif SC','Noto Serif CJK SC',serif", SANS = "'Noto Sans SC','Noto Sans CJK SC',sans-serif";
const css = (ink = INK, ink2 = INK2) => `
.cjk{font-family:${SERIF};font-weight:900;fill:${ink}}
.sans{font-family:${SANS};font-weight:500;fill:${ink};letter-spacing:.04em}
.lab{font:400 11px 'IBM Plex Mono';fill:${ink2};letter-spacing:.18em}.b{fill:${ink};font-weight:500}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
const lt = (t, x, y, h, fill, o = {}) => L.setText(t, x, y, h, { fill, width: o.width ?? .5, stroke: o.stroke ?? .15, tracking: o.tracking ?? 30, ...o }).svg;
const ticks = (x, y, n, gap, c) => Array.from({ length: n }, (_, i) => `<line x1="${x + i * gap}" y1="${y}" x2="${x + i * gap}" y2="${y + (i % 5 ? 6 : 12)}" stroke="${c}"/>`).join('');

// ── ⑱ 圭表 · key visual ─────────────────────────────────────────────────────
{
  const S = 30, BASE = 930, LAT = 34.40, EPS = 23.53, G = 9.81;
  const towerL = 220, towerR = towerL + 16 * S, towerTop = BASE - 9.5 * S, topInset = 4 * S;    // ~16 m base, ~8 m top (truncated pyramid)
  const XC = towerR - 10, YC = BASE - G * S;                                                    // crossbar on the north face, 40 chi above the scale
  const SAND = '#E9DFC8', SEAL = '#B8322A', SINK = '#2A2118'; let s = `<rect width="${W}" height="${H}" fill="${SAND}"/>`;
  s += `<pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="1.4" height="1.4" fill="${SINK}" opacity=".10"/></pattern><rect width="${W}" height="${H}" fill="url(#g)"/>`;
  // ground + 31 m stone scale running north
  s += `<line x1="0" y1="${BASE}" x2="${W}" y2="${BASE}" stroke="${INK}" stroke-width="1.2"/><rect x="${XC}" y="${BASE}" width="${31 * S}" height="16" fill="#EDEBE4" stroke="${INK}"/>` + ticks(XC, BASE + 16, 32, S, INK);
  for (let m = 0; m <= 30; m += 5) s += `<text x="${XC + m * S}" y="${BASE + 50}" class="lab" text-anchor="middle">${m} M</text>`;
  // tower: truncated pyramid in elevation with the north groove and the crossbar
  s += `<path d="M${towerL},${BASE} L${towerL + topInset},${towerTop} L${towerR - topInset},${towerTop} L${towerR},${BASE} Z" fill="#E9E6DD" stroke="${INK}" stroke-width="1.6"/>`;
  for (let k = 1; k < 9; k++) { const y = BASE - k * (BASE - towerTop) / 9; const ins = topInset * k / 9; s += `<line x1="${r(towerL + ins)}" y1="${r(y)}" x2="${r(towerR - ins)}" y2="${r(y)}" stroke="${INK}" stroke-opacity=".12"/>`; }
  s += `<rect x="${towerR - topInset - 40}" y="${r(YC - 6)}" width="56" height="${r(BASE - YC + 6)}" fill="#D9D5C9" stroke="${INK}"/><rect x="${towerR - topInset - 70}" y="${r(towerTop - 70)}" width="120" height="70" fill="#E9E6DD" stroke="${INK}" stroke-width="1.6"/><path d="M${towerR - topInset - 80},${r(towerTop - 70)} h140 l-10,-14 h-120 Z" fill="${INK}"/>`;
  s += `<line x1="${XC - 70}" y1="${r(YC)}" x2="${XC + 14}" y2="${r(YC)}" stroke="${INK}" stroke-width="6"/>`;
  // noon rays through the crossbar for the solstices and equinox (computed)
  const marks = [[EPS, '夏至', 0], [0, '春秋分', 0], [-EPS, '冬至', 1]];
  for (const [dec, name, hero] of marks) {
    const alt = 90 - LAT + dec, len = G / Math.tan(alt * Math.PI / 180), xe = XC + len * S;
    const dx = Math.cos(alt * Math.PI / 180), dy = Math.sin(alt * Math.PI / 180), back = 2600;
    const x0 = XC - dx * back, y0 = YC - dy * back;
    if (hero) s += `<path d="M${XC},${r(YC)} L${r(xe)},${BASE} L${XC},${BASE} Z" fill="${SINK}" opacity=".14"/><rect x="${XC}" y="${BASE}" width="${r(xe - XC)}" height="16" fill="${SINK}" class="ray"/>`;
    s += `<path d="M${r(hero ? x0 : XC - dx * 260)},${r(hero ? y0 : YC - dy * 260)} L${r(xe)},${BASE}" stroke="${hero ? SEAL : SINK}" stroke-width="${hero ? 2.4 : 1}" ${hero ? '' : 'stroke-dasharray="5 5" stroke-opacity=".6"'}/>`;
    s += `<path d="M${r(xe)},${BASE - 24} v18" stroke="${INK}" stroke-width="${hero ? 3 : 1.5}"/><text x="${r(xe)}" y="${BASE - 34 - (hero ? 0 : 0)}" class="sans" font-size="${hero ? 22 : 15}" text-anchor="middle">${name}</text><text x="${r(xe)}" y="${BASE + 84}" class="lab b" text-anchor="middle">${len.toFixed(2)} M</text>`;
  }
  // vertical CJK title on the right, a seal, and a short horizontal note — no shared left line here
  const VX = 1700;
  s += `<text x="${VX}" y="150" class="cjk" font-size="150" style="writing-mode:vertical-rl;fill:${SINK};letter-spacing:.12em">圭表测影</text>`;
  s += `<rect x="${VX - 150}" y="160" width="62" height="62" fill="${SEAL}"/><text x="${VX - 119}" y="200" class="cjk" font-size="26" text-anchor="middle" style="fill:${SAND}">至元</text>`;
  s += `<text x="${VX - 130}" y="270" class="sans" font-size="20" style="writing-mode:vertical-rl;fill:${SINK}">郭守敬 · 登封观星台 · 一二七九</text>`;
  s += `<text x="120" y="150" class="sans" font-size="22" style="fill:${SINK}">四丈高表，影落三十一米石圭。</text><text x="120" y="182" class="sans" font-size="22" style="fill:${SINK}">冬至影最长，夏至影最短。</text>`;
  s += `<text x="120" y="222" class="lab b" style="fill:${SINK}">GNOMON 9.81 M · 34.40° N · NOON SHADOWS COMPUTED</text>`;
  // file mark + small credits
  
  s += `<text x="120" y="${H - 30}" class="lab">OBLIQUITY 23.53° (1279) · NO REFRACTION OR PENUMBRA · SOURCES: CCTV 2025-02-03; ZHENGZHOU EVENING NEWS 2011-10-20</text>`;
  emit('FuseKV', '圭表测影 · key visual', W, H, css('#2A2118', '#6F604A') + `@keyframes ray{50%{stroke-opacity:.55}}.ray{animation:ray 4s ease-in-out infinite}`, s, '#E9DFC8');
}

// ── ⑲ 四海测验 · mission briefing (dark) ─────────────────────────────────────
{
  const BG = '#111518', T = '#F2F4F4', T2 = '#9AA6AB', HOR = 860, K = 13, LAT = 34.40;
  const PX = 1300, PY = HOR - LAT * K;              // north celestial pole sits LAT degrees above the north horizon
  let s = `<rect width="${W}" height="${H}" fill="${BG}"/><radialGradient id="sky" cx=".68" cy=".9" r=".8"><stop offset="0" stop-color="#22303a"/><stop offset="1" stop-color="${BG}"/></radialGradient><rect width="${W}" height="${HOR}" fill="url(#sky)"/>`;
  s += `<clipPath id="above"><rect width="${W}" height="${HOR}"/></clipPath>`;
  rng(1279); let trails = '';
  for (let i = 0; i < 340; i++) {
    const dec = 30 + 60 * Math.sqrt(rng()), rad = (90 - dec) * K, a0 = rng() * 360, span = 52, mag = rng();
    const p = (a) => [PX + Math.cos(a * Math.PI / 180) * rad, PY + Math.sin(a * Math.PI / 180) * rad];
    const [x0, y0] = p(a0), [x1, y1] = p(a0 + span);
    trails += `<path d="M${r(x0)},${r(y0)} A${r(rad)},${r(rad)} 0 0 1 ${r(x1)},${r(y1)}" stroke="#E8EEF2" stroke-opacity="${(.15 + .7 * mag ** 2).toFixed(2)}" stroke-width="${(.6 + 1.8 * mag ** 3).toFixed(2)}" fill="none" stroke-linecap="round"/>`;
  }
  s += `<g clip-path="url(#above)"><g class="sky" style="transform-origin:${PX}px ${r(PY)}px">${trails}</g></g>`;
  s += `<circle cx="${PX}" cy="${r(PY)}" r="4" fill="${ACC}"/><path d="M${PX - 26},${r(PY)}h16M${PX + 10},${r(PY)}h16M${PX},${r(PY - 26)}v16M${PX},${r(PY + 10)}v16" stroke="${ACC}"/><text x="${PX + 34}" y="${r(PY + 4)}" class="lab" style="fill:${ACC}">NORTH CELESTIAL POLE · ALT ${LAT.toFixed(2)}°</text>`;
  // altitude scale at the pole's meridian
  for (let a = 0; a <= 60; a += 10) s += `<line x1="${PX - 6}" y1="${HOR - a * K}" x2="${PX + 6}" y2="${HOR - a * K}" stroke="${T2}"/><text x="${PX - 14}" y="${HOR - a * K + 4}" class="lab" text-anchor="end" style="fill:${T2}">${a}°</text>`;
  s += `<line x1="${PX}" y1="${HOR}" x2="${PX}" y2="${r(PY + 30)}" stroke="${T2}" stroke-dasharray="2 4"/>`;
  // horizon + observatory silhouette with its scale running north
  s += `<rect y="${HOR}" width="${W}" height="${H - HOR}" fill="#0A0D0F"/><line x1="0" y1="${HOR}" x2="${W}" y2="${HOR}" stroke="${T2}" stroke-opacity=".6"/>`;
  s += `<path d="M1020,${HOR} L1046,${HOR - 58} L1098,${HOR - 58} L1124,${HOR} Z M1080,${HOR - 58} h26 v-16 h-26 Z" fill="#000"/><rect x="1110" y="${HOR - 2}" width="190" height="4" fill="#000"/>`;
  s += `<text x="1020" y="${HOR + 32}" class="lab" style="fill:${T2}">GAOCHENG OBSERVATORY · FACING NORTH</text>`;
  // latitude ladder of the survey (15–65° N), Dengfeng marked
  const LX = 1780; for (let la = 15; la <= 65; la += 5) { const y = 760 - (la - 15) * 11; s += `<line x1="${LX}" y1="${y}" x2="${LX + 16}" y2="${y}" stroke="${T2}"/><text x="${LX - 8}" y="${y + 4}" class="lab" text-anchor="end" style="fill:${T2}">${la}°</text>`; }
  s += `<line x1="${LX + 8}" y1="${760 - 50 * 11}" x2="${LX + 8}" y2="760" stroke="${T2}"/><circle cx="${LX + 8}" cy="${r(760 - (LAT - 15) * 11)}" r="6" fill="${ACC}"/><text x="${LX + 8}" y="186" class="lab" text-anchor="middle" style="fill:${T2}">SURVEY BAND</text>`;
  // left column, shared line x = 120
  const X = 120;
  s += lt('// MISSION 1279', X, 120, 18, T2, { width: .55, stroke: .14 });
  s += `<text x="${X}" y="270" class="cjk" font-size="112" style="fill:${T}">四海测验</text>`;
  s += lt('SIHAI SURVEY', X, 300, 64, T, { width: .46, stroke: .17, tracking: 30 });
  s += `<text x="${X}" y="420" class="sans" font-size="20" style="fill:${T}">二十七处测站同测日影与北极高度，</text><text x="${X}" y="452" class="sans" font-size="20" style="fill:${T}">汇成《授时历》。</text>`;
  [['01', '二十七处测站', '北纬 15°–65°，东至朝鲜半岛，南达南海'], ['02', '回归年 365.2425 日', '与今测值相差约 26 秒'], ['03', '影符读影', '针孔成像，影端读数约 2 毫米']].forEach(([n, a, b], i) => {
    const y = 530 + i * 86; s += `<line x1="${X}" y1="${y - 30}" x2="${X + 560}" y2="${y - 30}" stroke="${T2}" stroke-opacity=".35"/>` + lt(n, X, y - 14, 30, T2, { width: .5 }) + `<text x="${X + 70}" y="${y + 8}" class="sans" font-size="24" style="fill:${T}">${a}</text><text x="${X + 70}" y="${y + 36}" class="sans" font-size="15" style="fill:${T2}">${b}</text>`;
  });
  s += `<rect x="${X}" y="${HOR + 60}" width="240" height="56" rx="28" fill="${ACC}"/><text x="${X + 120}" y="${HOR + 96}" class="sans" font-size="22" text-anchor="middle" style="fill:${BG};font-weight:700">开始测验 →</text>`;
  s += `<text x="${X + 270}" y="${HOR + 82}" class="lab" style="fill:${T2}">至元十六年 · 登封告成</text><text x="${X + 270}" y="${HOR + 102}" class="lab" style="fill:${T2}">STAR TRAILS: 340 SAMPLED STARS · 3.5 H EXPOSURE · SKETCH</text>`;
  s += lt('FILE / SIHAI-1279', W - 120, 72, 16, T2, { anchor: 'end', width: .55 });
  emit('FuseActivity', '四海测验 · mission briefing (endfield grammar)', W, H, css(T, T2) + `@keyframes sky{to{transform:rotate(-360deg)}}.sky{animation:sky 240s linear infinite}`, s, BG);
}

// ── ⑳ 锝 · element entrance ─────────────────────────────────────────────────
{
  const CX = 1160, CY = 540, R = 380; let s = `<rect width="${W}" height="${H}" fill="${ACC}"/>`;
  s += `<pattern id="g2" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="1.4" height="1.4" fill="${INK}" opacity=".1"/></pattern><rect width="${W}" height="${H}" fill="url(#g2)"/>`;
  s += lt('43', 1010, 120, 760, '#E3DE12', { width: .5, stroke: .17, tracking: 10 });
  // magnet pole + two dees (top view)
  s += `<circle cx="${CX}" cy="${CY}" r="${R + 40}" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-dasharray="2 6"/>`;
  s += `<path d="M${CX - 10},${CY - R} A${R},${R} 0 0 0 ${CX - 10},${CY + R} Z" fill="none" stroke="${INK}" stroke-width="2"/><path d="M${CX + 10},${CY - R} A${R},${R} 0 0 1 ${CX + 10},${CY + R} Z" fill="none" stroke="${INK}" stroke-width="2"/>`;
  // beam: radius grows with the square root of the turns walked
  let d = '', tail = ''; const TMAX = Math.PI * 2 * 9;
  for (let t = 0; t <= TMAX; t += .025) { const rr = (R - 24) * Math.sqrt(t / TMAX); const p = `${r(CX + Math.cos(t) * rr)},${r(CY + Math.sin(t) * rr)}`; d += `${d ? 'L' : 'M'}${p}`; if (t > TMAX - Math.PI) tail += `${tail ? 'L' : 'M'}${p}`; }
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".9"/><path d="${tail}" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;
  const ex = CX + (R - 24), ey = CY;
  s += `<path d="M${ex},${ey} L${ex + 210},${ey - 120}" stroke="${INK}" stroke-width="7" class="beam"/>`;
  s += `<rect x="${ex + 204}" y="${ey - 176}" width="22" height="110" fill="${INK}" stroke="${INK}" transform="rotate(-30 ${ex + 215} ${ey - 121})"/><text x="${ex + 150}" y="${ey - 30}" class="lab b">MO FOIL</text><text x="${ex + 150}" y="${ey - 12}" class="lab">TARGET · DEUTERONS</text>`;
  s += `<text x="${CX}" y="${CY - R - 60}" class="lab" text-anchor="middle">CYCLOTRON, TOP VIEW · BEAM RADIUS ∝ √TURNS · SCHEMATIC</text>`;
  // shards (accent, within budget)
  
  // title + element plate on the shared line x = 120
  const X = 120;
  s += lt('// ELEMENT SERIES 01', X, 120, 18, INK2, { width: .55, stroke: .14 });
  s += `<text x="${X}" y="192" class="sans" font-size="20">第一个人造元素</text>`;
  s += `<rect x="${X}" y="610" width="560" height="350" fill="${INK}"/>`;
  s += lt('43', X + 40, 640, 120, ACC, { width: .5, stroke: .17 }) + lt('TC', X + 230, 640, 120, '#FAFAF8', { width: .5, stroke: .17 });
  s += `<text x="${X + 420}" y="752" class="cjk" font-size="110" style="fill:#FAFAF8">锝</text>`;
  s += lt('TECHNETIUM', X + 40, 790, 40, '#FAFAF8', { width: .46, stroke: .17, tracking: 40 });
  [['[Kr]4d⁵5s²', '熔点 2157 °C'], ['锝-97 半衰期 ≈ 421 万年', '1937 · 巴勒莫'], ['PERRIER & SEGRÈ', '1947 定名 · TECHNETOS「人造」']].forEach(([a, b], i) => { const y = 872 + i * 28; s += `<text x="${X + 40}" y="${y}" class="sans" font-size="16" style="fill:#FAFAF8">${a}</text><text x="${X + 520}" y="${y}" class="sans" font-size="16" text-anchor="end" style="fill:#B9B9B4">${b}</text>`; });
  s += lt('FILE / TC-1937', W - 120, 72, 16, INK2, { anchor: 'end', width: .55 }) + `<text x="${W - 120}" y="${H - 30}" class="lab" text-anchor="end">SOURCES: WIKIPEDIA, TECHNETIUM; SCIENCENOTES; PERIODIC-TABLE.IO · CONCEPT STUDY</text>`;
  emit('FuseGacha', '锝 · element entrance', W, H, css(INK, '#3E3D2A') + `@keyframes bm{to{stroke-dashoffset:-40}}.beam{stroke-dasharray:14 6;animation:bm .8s linear infinite}`, s, ACC);
}
console.log('ok');
