"use strict";

// Blue/yellow stage: white ground, cobalt + signal yellow, a duotone computed machine at the centre on a
// debris blob, light beams from the edges, pillars with halo rings, four-point stars, dot and plus grids,
// sweeping cables, a vertical axis and registration marks. Almost no text: a caption line on the frame.
const { emit, rng, r } = require('./common.cjs');
function stage(name, o) {
  const W = 1920, H = 1080, B = '#1418F0', Y = '#F6C935', K = '#121212', G = '#BEBEBC', P = '#F3F3EF';
  rng(o.seed || 3);
  const cx = 960, cy = o.cy || 430;
  let s = `<defs><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.4 1.1"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="${P}"/>`;
  // grid
  for (let x = 160; x <= 1760; x += 48) s += `<line x1="${x}" y1="90" x2="${x}" y2="${H - 60}" stroke="#DADAD6" stroke-width="1"/>`;
  for (let y = 90; y <= H - 60; y += 48) s += `<line x1="160" y1="${y}" x2="1760" y2="${y}" stroke="#DADAD6" stroke-width="1"/>`;
  // beams from both edges, converging toward the object
  const beam = (pts) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${Y}" fill-opacity=".82"/>`;
  s += `<g>${beam([[0, 60], [0, 250], [640, 330], [640, 250]])}${beam([[0, 500], [0, 760], [700, 470], [700, 400]])}${beam([[W, 60], [W, 280], [1280, 300], [1280, 220]])}${beam([[W, 420], [W, 760], [1240, 500], [1240, 420]])}</g>`;
  // frame
  s += `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${K}" stroke-width="1.5"/>`;
  // pillars with halo rings
  const pillar = (x, y0, y1, ringAt) => `<rect x="${x - 26}" y="${y0}" width="52" height="${y1 - y0}" fill="${G}"/><rect x="${x - 12}" y="${y0 + (y1 - y0) * .22}" width="24" height="${(y1 - y0) * .6}" fill="#fff"/><ellipse cx="${x}" cy="${ringAt}" rx="62" ry="22" fill="none" stroke="#F4E000" stroke-width="7"/>`;
  s += pillar(310, 0, 430, 430) + pillar(1610, 0, 430, 430) + pillar(460, 640, H, 640) + pillar(1460, 640, H, 640);
  // blob + perspective lines + circles
  s += `<image href="${o.blob}" x="${cx - 560}" y="${cy - 290}" width="1120" height="747"/>`;
  s += `<g stroke="${K}" stroke-width=".9" fill="none"><line x1="${cx - 150}" y1="0" x2="${cx - 380}" y2="${H}"/><line x1="${cx + 150}" y1="0" x2="${cx + 380}" y2="${H}"/><line x1="${cx - 60}" y1="0" x2="${cx - 260}" y2="${H}"/><line x1="${cx + 60}" y1="0" x2="${cx + 260}" y2="${H}"/>`;
  [330, 300].forEach((R) => s += `<circle cx="${cx}" cy="${cy + 40}" r="${R}"/>`); s += `</g>`;
  // cables
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const y0 = 640 + i * 90, y1 = cy + 30 + i * 70; const x0 = side < 0 ? 0 : W, x1 = cx + side * 120;
    s += `<path d="M${x0},${y0} C${x0 - side * -380},${y0 - 40} ${x1 + side * 380},${y1 + 240} ${x1},${y1}" fill="none" stroke="${K}" stroke-width="2.2"/>`; }
  // axis
  s += `<rect x="${cx - 9}" y="0" width="18" height="${H}" fill="${B}"/><rect x="${cx - 22}" y="0" width="44" height="${H}" fill="none" stroke="${B}" stroke-width="1.6"/>`;
  s += `<rect x="${cx + 14}" y="${cy + 70}" width="12" height="190" fill="${Y}"/><rect x="${cx + 14}" y="${cy + 70}" width="12" height="190" fill="none" stroke="${B}"/>`;
  s += `<rect x="${cx - 36}" y="${cy + 160}" width="72" height="200" fill="none" stroke="${B}" stroke-width="1.6"/><rect x="${cx - 28}" y="${cy + 170}" width="56" height="180" fill="none" stroke="${Y}"/>`;
  // header strip
  s += `<rect x="${cx - 350}" y="56" width="700" height="48" fill="#fff" stroke="${G}"/><rect x="${cx - 342}" y="62" width="120" height="36" fill="${Y}"/><rect x="${cx - 222}" y="62" width="20" height="36" fill="${G}"/><rect x="${cx - 200}" y="62" width="150" height="36" fill="${B}"/><rect x="${cx - 40}" y="68" width="160" height="24" fill="none" stroke="${B}"/><rect x="${cx + 130}" y="62" width="210" height="36" fill="none" stroke="${G}"/>`;
  s += `<rect x="${cx - 72}" y="100" width="144" height="64" fill="none" stroke="${B}" stroke-width="1.6"/>`;
  // object
  if (o.plate) s += `<ellipse cx="${cx}" cy="${cy + (o.dy || 0)}" rx="${o.plate[0]}" ry="${o.plate[1]}" fill="#F7F6F0" stroke="${B}" stroke-width="1.6"/>`;
  s += `<image href="${o.object}" x="${cx - o.size / 2}" y="${cy - o.size / 2 + (o.dy || 0)}" width="${o.size}" height="${o.size}"/>`;
  if (o.objectStroke) s += o.objectStroke(cx, cy, B);
  // stars
  const star = (x, y, R, k = .16) => { const q = R * k; return `<path d="M${x},${y - R} Q${x + q},${y - q} ${x + R},${y} Q${x + q},${y + q} ${x},${y + R} Q${x - q},${y + q} ${x - R},${y} Q${x - q},${y - q} ${x},${y - R}Z" fill="${B}"/>`; };
  (o.stars || [[560, 300, 230], [700, 420, 110], [1350, 250, 95]]).forEach(([x, y, R]) => s += star(x, y, R));
  // dot grids and plus grids
  const dots = (x, y, c, rr, st = 18, sz = 6) => { let d = ''; for (let i = 0; i < c; i++) for (let j = 0; j < rr; j++) d += `<rect x="${x + i * st}" y="${y + j * st}" width="${sz}" height="${sz}" fill="${B}"/>`; return d; };
  s += dots(170, 120, 3, 5) + dots(530, 720, 8, 3) + dots(1240, 760, 5, 3) + dots(1150, 240, 2, 6);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const x = 465 + i * 24, y = 160 + j * 24; s += `<path d="M${x - 6},${y}h12M${x},${y - 6}v12" stroke="${K}" stroke-width="1.6"/>`; }
  // dots and rings
  s += `<circle cx="${cx - 340}" cy="${cy + 120}" r="22" fill="${Y}"/><circle cx="${cx + 150}" cy="${cy + 255}" r="23" fill="${B}"/><circle cx="${cx + 80}" cy="${cy + 75}" r="5" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="${cx + 114}" cy="${cy + 82}" r="6" fill="none" stroke="#fff" stroke-width="1.5"/>`;
  // registration marks
  for (const [x, y] of [[48, 44], [W - 116, 44], [48, H - 112], [W - 116, H - 112]]) s += `<rect x="${x}" y="${y}" width="44" height="44" fill="none" stroke="${K}" stroke-width="1.6"/><rect x="${x + 22}" y="${y + 22}" width="44" height="44" fill="none" stroke="${K}" stroke-width="1.6"/><rect x="${x + 22}" y="${y + 22}" width="22" height="22" fill="${B}"/>`;
  // caption on the frame
  s += `<text x="120" y="${H - 34}" class="cap">${o.caption}</text><text x="${W - 120}" y="${H - 34}" class="cap" text-anchor="end">${o.caption2}</text>`;
  // grain over everything
  s += `<rect width="${W}" height="${H}" fill="#000" filter="url(#gr)" opacity=".09"/>`;
  const css = `.cap{font:500 12px 'IBM Plex Mono';fill:#121212;letter-spacing:.2em}`;
  emit(name, o.title, W, H, css, s, P);
}
stage('StageWebb', { title: 'Blue/yellow stage · Webb primary mirror', object: '../art/stage-mirror.png', blob: '../art/stage-blob.png', size: 470, caption: 'JWST PRIMARY · 18 SEGMENTS · 1.32 M FLAT TO FLAT · 6.5 M', caption2: 'COMPUTED · DUOTONE · NOT A PHOTOGRAPH' });
stage('StageCyclotron', { title: 'Blue/yellow stage · cyclotron, element 43', object: '../art/stage-cyclotron.png', blob: '../art/stage-blob.png', size: 470, seed: 5, stars: [[1380, 280, 210], [1230, 420, 95], [560, 240, 100]], caption: 'TECHNETIUM 43 · FIRST MADE IN A CYCLOTRON · BERKELEY 37-INCH · 1937', caption2: 'BEAM RADIUS GROWS AS √TURNS · COMPUTED' });
stage('StageDepth', { title: 'Blue/yellow stage · order-book depth (simulated)', object: '../art/stage-holo-ink.png', blob: '../art/stage-blob.png', size: 640, dy: 10, plate: [345, 230], seed: 9, stars: [[520, 280, 190], [600, 600, 80], [1410, 230, 110]], caption: 'KATANAVIEW · ORDER BOOK DEPTH · 46 SNAPSHOTS · 10 × 2 LEVELS', caption2: 'SIMULATED BOOK · NOT MARKET DATA' });
