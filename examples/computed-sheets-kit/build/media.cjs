// Divergent uses of the archive-sheet grammar: other media, other aspect ratios, other reading modes.
const { emit, rng, r } = require('./common.cjs');
const INK = '#1d232b', MUTE = '#5d6670', PAPER = '#e7eaed';
const base = (c = INK, m = MUTE) => `
.h1{font:400 17px Michroma;fill:${c};letter-spacing:.18em}.h2{font:400 24px Michroma;fill:${c};letter-spacing:.14em}
.lab{font:400 10px 'IBM Plex Mono';fill:${m};letter-spacing:.15em}.b{fill:${c};font-weight:500}
.mono{font:400 13px 'IBM Plex Mono';fill:${c};letter-spacing:.06em}.hand{font:28px 'Nothing You Could Do';fill:${c}}
.pen{fill:none;stroke:${c};stroke-width:1.6;stroke-linecap:round}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
const marks = (W, H, c = INK) => [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]].map(([x, y]) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${c}"/>`).join('');
const dots = (W, H, c = INK) => `<pattern id="dt" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${c}" opacity=".07"/></pattern><rect width="${W}" height="${H}" fill="url(#dt)"/>`;

// ── A · CI receipt (thermal paper, 640 wide) ─────────────────────────────────
{
  const W = 640, H = 1640, RED = '#c23a2e'; let s = `<rect width="${W}" height="${H}" fill="#d9dde1"/>`;
  let zz = `M40,40`; for (let x = 40; x <= 600; x += 16) zz += ` L${x + 8},${(x / 16) % 2 ? 28 : 40}`; let zb = `L600,${H - 40}`; for (let x = 600; x >= 40; x -= 16) zb += ` L${x - 8},${(x / 16) % 2 ? H - 28 : H - 40}`;
  s += `<path d="${zz} L600,40 ${zb} Z" fill="#fbfbf8" filter="url(#sh)"/>`;
  const L = (y, t, a = 'start', cls = 'mono') => `<text x="${a === 'end' ? 568 : a === 'middle' ? 320 : 72}" y="${y}" class="${cls}" text-anchor="${a}">${t}</text>`;
  const rule = (y) => `<line x1="72" y1="${y}" x2="568" y2="${y}" stroke="${INK}" stroke-dasharray="2 5"/>`;
  s += L(110, 'KATANAVIEW ARCHIVE', 'middle', 'h1') + L(134, 'CI RECEIPT · NOT A MERGE APPROVAL', 'middle', 'lab');
  s += rule(160) + L(190, 'REPO') + L(190, 'design-pipeline', 'end') + L(214, 'BRANCH') + L(214, 'claude/archive-sheet-kit', 'end') + L(238, 'COMMAND') + L(238, 'npm test', 'end') + L(262, 'DATE') + L(262, '2026-11-13 · UTC+8', 'end');
  s += rule(288);
  const rows = [['SHEET KIT', '7', '7', '0'], ['ABLATION EVAL', '16', '16', '0'], ['OPENSPEC STRICT', '1', '1', '0'], ['FULL SUITE*', '1763', '1762', '1']];
  s += L(318, 'SUITE', 'start', 'lab') + `<text x="400" y="318" class="lab" text-anchor="end">RUN</text><text x="480" y="318" class="lab" text-anchor="end">OK</text>` + L(318, 'FAIL', 'end', 'lab');
  rows.forEach(([n, a, b, c], i) => { const y = 350 + i * 28; s += L(y, n) + `<text x="400" y="${y}" class="mono" text-anchor="end">${a}</text><text x="480" y="${y}" class="mono" text-anchor="end">${b}</text><text x="568" y="${y}" class="mono" text-anchor="end" style="${c !== '0' ? `fill:${RED}` : ''}">${c}</text>`; });
  s += rule(470);
  // pass bar: one tick per 20 tests
  for (let i = 0; i < 89; i++) s += `<rect x="${72 + i * 5.6}" y="494" width="3.6" height="34" fill="${INK}"/>`;
  s += `<rect x="${72 + 89 * 5.6}" y="494" width="3.6" height="34" fill="${RED}" class="blink"/>` + L(548, 'ONE TICK = 20 TESTS · RED = THE ONE FAILURE', 'start', 'lab');
  s += rule(574) + L(606, 'FAILED', 'start', 'lab b') + L(634, 'ff-tracking-hud / sfx.cjs') + L(658, 'ffmpeg exit 8: Option not found') + L(682, 'UNRELATED TO THIS BRANCH', 'start', 'lab');
  s += `<g transform="rotate(-12 430 660)"><rect x="350" y="612" width="190" height="78" fill="none" stroke="${RED}" stroke-width="3"/><text x="445" y="648" class="h1" text-anchor="middle" style="fill:${RED};font-size:15px">ENV ISSUE</text><text x="445" y="672" class="lab" text-anchor="middle" style="fill:${RED}">RECHECK ON 5090</text></g>`;
  s += rule(714) + L(744, '* RUN STOPPED BEFORE THE END', 'start', 'lab') + L(762, '  WHEN THE SESSION RESTARTED', 'start', 'lab');
  s += L(820, 'TOTAL OK', 'start', 'h1') + L(820, '1762', 'end', 'h1');
  s += `<text x="320" y="900" class="hand" text-anchor="middle" transform="rotate(-4 320 900)">kept, not merged.</text>`;
  rng(9); let bx = 110; while (bx < 530) { const w = 1 + Math.floor(rng() * 4); s += `<rect x="${bx}" y="960" width="${w}" height="90" fill="${INK}"/>`; bx += w + 2 + Math.floor(rng() * 3); }
  s += L(1074, 'b7c0 · archive-sheet-kit', 'middle', 'lab');
  s += L(1140, 'THANK YOU FOR NOT FORCE-PUSHING', 'middle', 'lab b');
  for (let y = 1190; y < H - 80; y += 22) s += `<line x1="${72 + (y % 3) * 20}" y1="${y}" x2="${568 - (y % 5) * 30}" y2="${y}" stroke="${INK}" stroke-opacity=".06"/>`;
  emit('UseReceipt', 'Use · CI receipt (thermal)', W, H, base() + `@keyframes b{50%{opacity:.25}}.blink{animation:b 1s steps(1) infinite}`, `<defs><filter id="sh"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity=".18"/></filter></defs>` + s, '#d9dde1');
}

// ── B · Release sheet (feed 1080×1350) ──────────────────────────────────────
{
  const W = 1080, H = 1350, ACC = '#2459b3'; let s = `<rect width="${W}" height="${H}" fill="${PAPER}"/>` + dots(W, H) + marks(W, H);
  s += `<text x="-30" y="600" class="ver">0.14</text>`;
  s += `<text x="80" y="110" class="h1">DESIGN-PIPELINE</text><text x="80" y="132" class="lab">RELEASE INSPECTION · XARTLAB/DESIGN-PIPELINE</text><text x="1000" y="110" class="h1" text-anchor="end">REL-0.14.0</text><text x="1000" y="132" class="lab" text-anchor="end">2026-11-13</text>`;
  s += `<line x1="80" y1="150" x2="1000" y2="150" stroke="${INK}" stroke-opacity=".3"/>`;
  const items = [['A', 'browser script practice lint'], ['A', 'web scaffold and web preview'], ['A', 'state-machine transitions declared'], ['A', 'tactile product UI direction'], ['A', 'industrial document sheets method'], ['A', 'hue budget in template check'], ['A', 'tunables for films and pages'], ['A', 'section reads for skill and describe'], ['A', 'motion performance audit'], ['A', 'refine intents routable'], ['A', 'animate-ui as component source'], ['A', 'UI rule coverage map'], ['A', 'atomic-age style pack'], ['A', 'motion vocabulary'], ['F', 'ablation eval on Windows'], ['F', 'oklch contrast in design-system check'], ['C', 'repository moved to XartLab']];
  const col = { A: ACC, F: '#c23a2e', C: '#6b8a2a' };
  items.forEach(([k, t], i) => { const y = 600 + i * 34; s += `<rect x="420" y="${y - 15}" width="18" height="18" fill="none" stroke="${INK}"/><path d="M424,${y - 6} l5,6 l9,-12" stroke="${col[k]}" stroke-width="2.4" fill="none" class="tick" style="animation-delay:${i * .12}s"/><text x="452" y="${y}" class="mono">${t}</text><text x="1000" y="${y}" class="lab b" text-anchor="end" style="fill:${col[k]}">${{ A: 'ADDED', F: 'FIXED', C: 'CHANGED' }[k]}</text><line x1="420" y1="${y + 10}" x2="1000" y2="${y + 10}" stroke="${INK}" stroke-opacity=".1"/>`; });
  s += `<text x="420" y="560" class="h2">17 ITEMS INSPECTED</text><text x="420" y="580" class="lab">14 ADDED · 2 FIXED · 1 CHANGED · FROM CHANGELOG.MD</text>`;
  s += `<g transform="rotate(-8 230 1160)"><circle cx="230" cy="1160" r="110" fill="none" stroke="${ACC}" stroke-width="3"/><circle cx="230" cy="1160" r="96" fill="none" stroke="${ACC}"/><text x="230" y="1150" class="h1" text-anchor="middle" style="fill:${ACC}">RELEASED</text><text x="230" y="1180" class="lab" text-anchor="middle" style="fill:${ACC}">2026 · 11 · 13</text></g>`;
  s += `<text x="80" y="1300" class="lab">SOURCES / CHANGELOG.MD [0.14.0]</text>`;
  emit('UseRelease', 'Use · release inspection sheet (feed)', W, H, base() + `.ver{font:400 560px Michroma;fill:none;stroke:${ACC};stroke-width:2;opacity:.45;letter-spacing:-.02em}@keyframes t{0%{stroke-dasharray:30;stroke-dashoffset:30}20%,100%{stroke-dasharray:30;stroke-dashoffset:0}}.tick{animation:t 6s ease-out infinite both}`, s, PAPER);
}

// ── C · 404 / signal lost (product page 1440×900) ───────────────────────────
{
  const W = 1440, H = 900, ACC = '#e2702a', T = '#e6edf3', M = '#8ea2b5'; let s = `<rect width="${W}" height="${H}" fill="#0d1620"/>` + dots(W, H, '#9fb3c6') + marks(W, H, T);
  s += `<text x="80" y="90" class="h1">KATANAVIEW</text><text x="80" y="110" class="lab">WORKBENCH / ROUTE NOT FOUND</text><text x="1360" y="90" class="h1" text-anchor="end">ERR 404</text>`;
  let d = ''; for (let x = 0; x <= 1280; x += 2) { if (x > 560 && x < 820) continue; const y = Math.sin(x / 23) * 26 + Math.sin(x / 7) * 6; d += `${x === 0 || x === 820 ? 'M' : 'L'}${80 + x},${r(430 + y)}`; }
  s += `<path d="${d}" fill="none" stroke="${T}" stroke-width="1.6"/><rect x="640" y="380" width="260" height="100" fill="none" stroke="${ACC}" stroke-dasharray="5 5" class="pulse"/><text x="770" y="370" class="lab" text-anchor="middle" style="fill:${ACC}">NO SAMPLES · 260 PX OF NOTHING</text>`;
  s += `<text x="80" y="640" class="h2">NO RECORD AT THIS ADDRESS</text><text x="80" y="668" class="lab">THE PANEL MAY HAVE BEEN CLOSED, RENAMED OR NEVER OPENED</text>`;
  [['BACK TO WORKBENCH', 1], ['OPEN LAST PANEL'], ['REPORT A BROKEN LINK']].forEach(([t, on], i) => { const x = 80 + i * 250, w = 230; s += `<rect x="${x}" y="720" width="${w}" height="44" fill="${on ? ACC : 'none'}" stroke="${on ? ACC : M}"/><text x="${x + w / 2}" y="747" class="btn" text-anchor="middle" style="fill:${on ? '#0d1620' : T}">${t}</text>`; });
  s += `<text x="1360" y="840" class="lab" text-anchor="end">REQUEST ID 7F3A · ${new Date('2026-11-13T11:00:00Z').toISOString().slice(0, 10)}</text>`;
  emit('Use404', 'Use · 404 page in the terminal dialect', W, H, base(T, M) + `.btn{font:400 12px Michroma;letter-spacing:.12em}@keyframes p{50%{opacity:.35}}.pulse{animation:p 1.6s ease-in-out infinite}`, s, '#0d1620');
}

// ── D · agent badge (CR80, 1012×638) ────────────────────────────────────────
{
  const W = 1012, H = 638, ACC = '#f5c518'; let s = `<rect width="${W}" height="${H}" rx="34" fill="#f1f0ea"/><rect x="0" y="0" width="${W}" height="120" rx="34" fill="#1d2024"/><rect y="86" width="${W}" height="34" fill="#1d2024"/>`;
  s += `<text x="60" y="72" class="h1" style="fill:#e9e7df">NIGHTSHIFT</text><text x="60" y="96" class="lab" style="fill:#a9a79f">SOFTWARE FACTORY · WORKER CREDENTIAL</text><text x="952" y="80" class="h1" text-anchor="end" style="fill:${ACC}">W-07</text>`;
  // identicon from a hash instead of a photo
  let h = 0; for (const ch of 'worker-07@nightshift') h = (h * 31 + ch.charCodeAt(0)) >>> 0; let id = '';
  for (let y = 0; y < 6; y++) for (let x = 0; x < 3; x++) { if ((h >> (y * 3 + x)) & 1) for (const xx of [x, 5 - x]) id += `<rect x="${60 + xx * 34}" y="${170 + y * 34}" width="32" height="32" fill="#1d2024"/>`; }
  s += `<rect x="52" y="162" width="212" height="212" fill="none" stroke="#1d2024"/>${id}<text x="60" y="400" class="lab">IDENTICON · NO PHOTO ON FILE</text>`;
  [['ROLE', 'IMPLEMENTER · MODULE SCOPE'], ['MODEL', 'FAST TIER FOR MECHANICAL STEPS'], ['CLEARANCE', 'BRANCH + PR · NO MERGE'], ['REVIEWED BY', 'ORCHESTRATOR'], ['ISSUED', '2026-11-13']].forEach(([k, v], i) => { const y = 190 + i * 40; s += `<text x="320" y="${y}" class="lab">${k}</text><text x="952" y="${y}" class="mono" text-anchor="end">${v}</text><line x1="320" y1="${y + 12}" x2="952" y2="${y + 12}" stroke="#1d2024" stroke-opacity=".15"/>`; });
  s += `<rect x="320" y="420" width="90" height="70" rx="8" fill="${ACC}"/><path d="M320,443h90M320,467h90M350,420v70M380,420v70" stroke="#1d2024" stroke-opacity=".5"/>`;
  rng(3); let bx = 450; while (bx < 950) { const w = 1 + Math.floor(rng() * 4); s += `<rect x="${bx}" y="430" width="${w}" height="60" fill="#1d2024"/>`; bx += w + 2 + Math.floor(rng() * 3); }
  s += `<rect x="0" y="560" width="${W}" height="78" fill="${ACC}" clip-path="url(#card)"/><text x="60" y="608" class="h1" style="font-size:15px">IF FOUND, RETURN TO THE QUEUE</text><text x="952" y="608" class="lab b" text-anchor="end">FICTIONAL · DESIGN STUDY</text>`;
  emit('UseBadge', 'Use · worker credential (CR80)', W, H, base('#1d2024', '#5e6369'), `<defs><clipPath id="card"><rect width="${W}" height="${H}" rx="34"/></clipPath></defs>` + s, '#d9d6cb');
}

// ── E · timeline ribbon (2400×700): Voyager 1 outward ───────────────────────
{
  const W = 2400, H = 700, ACC = '#c23a2e'; let s = `<rect width="${W}" height="${H}" fill="${PAPER}"/>` + dots(W, H) + marks(W, H);
  const ev = [['1977-09-05', 0, 'LAUNCH', 'CAPE CANAVERAL'], ['1979-03-05', 5.2, 'JUPITER', 'CLOSEST APPROACH'], ['1980-11-12', 9.5, 'SATURN', 'TITAN FLYBY'], ['1990-02-14', 40.5, 'PALE BLUE DOT', 'FAMILY PORTRAIT'], ['2004-12-16', 94, 'TERMINATION SHOCK', 'SOLAR WIND SLOWS'], ['2012-08-25', 121, 'HELIOPAUSE', 'INTERSTELLAR SPACE']];
  const t = (d) => new Date(d).getTime(), t0 = t('1977-01-01'), t1 = t('2013-06-01');
  const X = (d) => 120 + (t(d) - t0) / (t1 - t0) * 2160, Y = (au) => 540 - au / 130 * 380;
  s += `<text x="120" y="96" class="h1">VOYAGER 1 / OUTWARD</text><text x="120" y="118" class="lab">HELIOCENTRIC DISTANCE AT SIX EVENTS, AU · STRAIGHT SEGMENTS BETWEEN THEM</text>`;
  for (let y = 1977; y <= 2013; y++) { const x = X(`${y}-01-01`); s += `<line x1="${r(x)}" y1="548" x2="${r(x)}" y2="${y % 5 ? 556 : 566}" stroke="${INK}"/>${y % 5 ? '' : `<text x="${r(x)}" y="590" class="lab" text-anchor="middle">${y}</text>`}`; }
  for (const au of [0, 40, 80, 120]) s += `<line x1="120" y1="${r(Y(au))}" x2="2280" y2="${r(Y(au))}" stroke="${INK}" stroke-opacity="${au ? .1 : .5}"/><text x="2300" y="${r(Y(au) + 4)}" class="lab">${au} AU</text>`;
  s += `<path d="${ev.map(([d, au], i) => `${i ? 'L' : 'M'}${r(X(d))},${r(Y(au))}`).join('')}" fill="none" stroke="${ACC}" stroke-width="2.6" pathLength="1" class="draw"/>`;
  ev.forEach(([d, au, n, sub], i) => { const x = X(d), y = Y(au); s += `<circle cx="${r(x)}" cy="${r(y)}" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="2"/><line x1="${r(x)}" y1="${r(y - 10)}" x2="${r(x)}" y2="${r(y - 60 - (i % 2) * 40)}" stroke="${INK}" stroke-opacity=".4"/><text x="${r(x + 6)}" y="${r(y - 66 - (i % 2) * 40)}" class="lab b">${n}</text><text x="${r(x + 6)}" y="${r(y - 52 - (i % 2) * 40)}" class="lab">${d} · ${au} AU · ${sub}</text>`; });
  s += `<text x="1500" y="250" class="hand" transform="rotate(-4 1500 250)">still talking to us</text>`;
  s += `<text x="120" y="660" class="lab">SOURCES / NASA JPL VOYAGER MISSION PAGES · DISTANCES ROUNDED · LINE IS NOT A TRAJECTORY</text>`;
  emit('UseRibbon', 'Use · timeline ribbon (2400×700)', W, H, base() + `@keyframes d{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}.draw{animation:d 3s cubic-bezier(.2,.8,.2,1) both}`, s, PAPER);
}

// ── F · small multiples: day length through the year at six latitudes (1600×1600) ─────
{
  const W = 1600, H = 1600, ACC = '#2a8fa0'; let s = `<rect width="${W}" height="${H}" fill="#f1f0ea"/>` + dots(W, H) + marks(W, H);
  s += `<text x="100" y="130" class="h2">DAYLIGHT / SIX LATITUDES</text><text x="100" y="156" class="lab">HOURS OF DAYLIGHT FOR EACH DAY OF A YEAR · cos ω = −tan φ tan δ · δ = 23.44° sin(360°(284+n)/365)</text>`;
  const places = [[0, 'EQUATOR'], [23.44, 'TROPIC OF CANCER'], [34.40, 'DENGFENG'], [51.48, 'GREENWICH'], [64.15, 'REYKJAVIK'], [69.65, 'TROMSØ']];
  places.forEach(([lat, name], i) => {
    const cx = 100 + (i % 3) * 480, cy = 240 + Math.floor(i / 3) * 640, w = 420, h = 440; let d = `M${cx},${cy + h}`, mx = 0, mn = 24;
    for (let n = 1; n <= 365; n++) { const dec = 23.44 * Math.sin(2 * Math.PI * (284 + n) / 365) * Math.PI / 180; const c = -Math.tan(lat * Math.PI / 180) * Math.tan(dec); const hrs = c <= -1 ? 24 : c >= 1 ? 0 : 2 * Math.acos(c) * 180 / Math.PI / 15; mx = Math.max(mx, hrs); mn = Math.min(mn, hrs); d += `L${r(cx + (n - 1) / 364 * w)},${r(cy + h - hrs / 24 * h)}`; }
    s += `<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-opacity=".3"/><line x1="${cx}" y1="${cy + h / 2}" x2="${cx + w}" y2="${cy + h / 2}" stroke="${INK}" stroke-dasharray="3 4" stroke-opacity=".4"/>`;
    s += `<path d="${d}L${cx + w},${cy + h}Z" fill="${ACC}" opacity="${.25 + i * .12}"/>`;
    s += `<text x="${cx}" y="${cy - 16}" class="lab b">${name}</text><text x="${cx + w}" y="${cy - 16}" class="lab" text-anchor="end">${lat.toFixed(2)}° N</text>`;
    s += `<text x="${cx}" y="${cy + h + 28}" class="lab">MAX ${mx.toFixed(1)} H · MIN ${mn.toFixed(1)} H</text>`;
    if (mx === 24) s += `<text x="${cx + w / 2}" y="${cy + 30}" class="lab b" text-anchor="middle" style="fill:${ACC}">MIDNIGHT SUN</text>`;
    ['J', 'M', 'M', 'J', 'S', 'N'].forEach((m, k) => s += `<text x="${r(cx + k / 6 * w + 4)}" y="${cy + h - 8}" class="lab">${m}</text>`);
  });
  s += `<text x="100" y="1530" class="lab">COMPUTED · SUNRISE AT THE SUN'S CENTRE, NO REFRACTION · DASHED LINE = 12 H</text>`;
  emit('UseMultiples', 'Use · small multiples (square)', W, H, base(), s, '#f1f0ea');
}

// ── G · circular dial: one day of sun altitude at Dengfeng (1400×1400) ──────
{
  const W = 1400, H = 1400, CX = 700, CY = 720, R = 470, ACC = '#b8862b'; let s = `<rect width="${W}" height="${H}" fill="#0d1620"/>` + dots(W, H, '#9fb3c6') + marks(W, H, '#e6edf3');
  const T = '#e6edf3', M = '#8ea2b5', lat = 34.40 * Math.PI / 180;
  s += `<text x="80" y="110" class="h1" style="fill:${T}">ONE DAY / SUN ALTITUDE</text><text x="80" y="132" class="lab">DENGFENG 34.40° N · 24 H AROUND THE DIAL · RADIUS = ALTITUDE, HORIZON AT THE DASHED RING</text>`;
  const rad = (alt) => R * (0.5 + alt / 180);   // −90°…+90° → 0…R
  for (const a of [-60, -30, 0, 30, 60, 90]) s += `<circle cx="${CX}" cy="${CY}" r="${r(rad(a))}" fill="none" stroke="${a === 0 ? T : M}" stroke-opacity="${a === 0 ? .8 : .25}" ${a === 0 ? 'stroke-dasharray="6 6"' : ''}/><text x="${CX + 6}" y="${r(CY - rad(a) - 4)}" class="lab" style="fill:${M}">${a}°</text>`;
  for (let h = 0; h < 24; h++) { const t = (h / 24) * 2 * Math.PI - Math.PI / 2 + Math.PI; s += `<line x1="${r(CX + Math.cos(t) * (R + 8))}" y1="${r(CY + Math.sin(t) * (R + 8))}" x2="${r(CX + Math.cos(t) * (R + (h % 6 ? 18 : 30)))}" y2="${r(CY + Math.sin(t) * (R + (h % 6 ? 18 : 30)))}" stroke="${T}"/>${h % 6 ? '' : `<text x="${r(CX + Math.cos(t) * (R + 56))}" y="${r(CY + Math.sin(t) * (R + 56) + 4)}" class="lab" text-anchor="middle" style="fill:${T}">${String(h).padStart(2, '0')}:00</text>`}`; }
  [[23.44, 'SUMMER SOLSTICE', 1], [0, 'EQUINOX', .55], [-23.44, 'WINTER SOLSTICE', .3]].forEach(([dd, n, o], i) => {
    const dec = dd * Math.PI / 180; let d = '';
    for (let m = 0; m <= 1440; m += 4) { const H = (m / 60 - 12) * 15 * Math.PI / 180; const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)) * 180 / Math.PI; const t = (m / 1440) * 2 * Math.PI - Math.PI / 2 + Math.PI; d += `${m ? 'L' : 'M'}${r(CX + Math.cos(t) * rad(alt))},${r(CY + Math.sin(t) * rad(alt))}`; }
    const noon = (90 - 34.40 + dd);
    s += `<path d="${d}Z" fill="none" stroke="${ACC}" stroke-opacity="${o}" stroke-width="${i ? 1.6 : 2.6}"/><text x="${CX}" y="${r(CY - rad(noon) - 10)}" class="lab b" text-anchor="middle" style="fill:${ACC};opacity:${Math.max(o, .6)}">${n} · NOON ${noon.toFixed(1)}°</text>`;
  });
  s += `<g class="spin" style="transform-origin:${CX}px ${CY}px"><line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R - 10}" stroke="${T}" stroke-opacity=".5"/></g><circle cx="${CX}" cy="${CY}" r="5" fill="${T}"/>`;
  s += `<text x="80" y="1330" class="lab">COMPUTED · sin h = sin φ sin δ + cos φ cos δ cos H · LOCAL APPARENT TIME · NO REFRACTION</text>`;
  emit('UseDial', 'Use · circular dial (sun altitude)', W, H, base(T, M) + `@keyframes sp{to{transform:rotate(360deg)}}.spin{animation:sp 24s linear infinite}`, s, '#0d1620');
}
console.log('ok');
