// Protocol sheet in the SCION-sheet grammar: TCP three-way handshake + header bit map (RFC 9293).
const { emit, r } = require('./common.cjs');
const W = 1920, H = 1080, RED = '#c23a2e', INK = '#1d232b', MUTE = '#5d6670';
let s = `<defs><filter id="b40"><feGaussianBlur stdDeviation="40"/></filter><pattern id="fine" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${INK}" opacity=".06"/></pattern></defs>`;
s += `<rect width="${W}" height="${H}" fill="#e6e9ec"/><g filter="url(#b40)" opacity=".5"><ellipse cx="400" cy="700" rx="500" ry="120" fill="#cfd6dc"/><ellipse cx="1500" cy="250" rx="420" ry="90" fill="#d8dee3"/></g><rect width="${W}" height="${H}" fill="url(#fine)"/>`;
for (const [x, y] of [[96, 96], [1824, 96], [96, 984], [1824, 984]]) s += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${INK}"/>`;
for (const x of [1152, 1344, 1536]) s += `<path d="M${x - 5},108h10M${x},103v10" stroke="${INK}" stroke-opacity=".35"/>`;
// header
s += `<text x="96" y="118" class="h1">KATANAVIEW ARCHIVE</text><text x="96" y="140" class="lab">NETWORK SHEETS · TRANSPORT LAYER</text>`;
s += `<text x="1824" y="118" class="h1" text-anchor="end">KTV/NET-01</text><text x="1824" y="140" class="lab" text-anchor="end">SPECIAL SHEET</text>`;
s += `<rect x="96" y="188" width="300" height="20" fill="${INK}"/><text x="104" y="203" class="bar">PROTOCOL SHEET · TCP</text>`;
s += `<text x="96" y="246" class="lab b">THREE PACKETS BEFORE THE FIRST BYTE. EACH SIDE PICKS ITS OWN SEQUENCE.</text>`;

// ---- ladder diagram (left) ------------------------------------------------
const LX = 240, RX = 900, T0 = 330, DT = 150;
s += `<rect x="140" y="${T0 - 50}" width="100" height="20" fill="${INK}"/><text x="148" y="${T0 - 35}" class="bar">CLIENT</text><rect x="${RX - 30}" y="${T0 - 50}" width="106" height="20" fill="${INK}"/><text x="${RX - 22}" y="${T0 - 35}" class="bar">SERVER</text>`;
s += `<path d="M${LX},${T0} V${T0 + 4 * DT + 40} M${RX},${T0} V${T0 + 4 * DT + 40}" stroke="${INK}" stroke-width="1.4"/>`;
for (let i = 0; i <= 4; i++) s += `<path d="M${LX - 6},${T0 + i * DT}h12M${RX - 6},${T0 + i * DT}h12" stroke="${INK}"/>`;
// states
[['CLOSED', LX, T0 - 6, 'end'], ['SYN-SENT', LX, T0 + 60, 'end'], ['ESTABLISHED', LX, T0 + 2 * DT + 20, 'end'], ['LISTEN', RX, T0 - 6, 'start'], ['SYN-RECEIVED', RX, T0 + DT + 40, 'start'], ['ESTABLISHED', RX, T0 + 3 * DT - 10, 'start']]
  .forEach(([t, x, y, a]) => s += `<text x="${a === 'end' ? x - 14 : x + 14}" y="${y}" class="lab" text-anchor="${a}">${t}</text>`);
// packets (example values)
const pk = [
  [LX, T0 + 30, RX, T0 + DT, 'SYN', 'SEQ 1000', ''],
  [RX, T0 + DT + 10, LX, T0 + 2 * DT, 'SYN · ACK', 'SEQ 5000', 'ACK 1001'],
  [LX, T0 + 2 * DT + 30, RX, T0 + 3 * DT, 'ACK', 'SEQ 1001', 'ACK 5001'],
  [LX, T0 + 3 * DT + 50, RX, T0 + 4 * DT, 'DATA', 'SEQ 1001', 'LEN 512'],
];
pk.forEach(([x0, y0, x1, y1, n, a, b], i) => {
  const sel = i === 0, col = sel ? RED : INK;
  const ang = Math.atan2(y1 - y0, x1 - x0), ah = (k) => `${r(x1 - 12 * Math.cos(ang + k))},${r(y1 - 12 * Math.sin(ang + k))}`;
  s += `<path d="M${x0},${y0} L${x1},${y1}" stroke="${col}" stroke-width="${sel ? 3 : 1.4}" ${i === 3 ? 'stroke-dasharray="6 5"' : ''} />${sel ? `<circle r="6" fill="${RED}" class="pkt" style="--dx:${x1 - x0}px;--dy:${y1 - y0}px" cx="${x0}" cy="${y0}"/>` : ''}<path d="M${ah(.4)} L${x1},${y1} L${ah(-.4)}" fill="none" stroke="${col}" stroke-width="${sel ? 3 : 1.4}"/>`;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  s += `<text x="${mx}" y="${my - 14}" class="pk" text-anchor="middle" style="fill:${col}" transform="rotate(${r(ang * 180 / Math.PI + (x1 < x0 ? 180 : 0))} ${mx} ${my})">${n}</text>`;
  s += `<text x="${mx}" y="${my + 20}" class="lab" text-anchor="middle" transform="rotate(${r(ang * 180 / Math.PI + (x1 < x0 ? 180 : 0))} ${mx} ${my})">${a}${b ? '  ·  ' + b : ''}</text>`;
});
s += `<circle cx="${LX}" cy="${T0 + 30}" r="9" fill="none" stroke="${RED}" stroke-width="1.5"/><path d="M${LX + 9},${T0 + 30} H 1100 V 692 H 1184" fill="none" stroke="${RED}" stroke-width="1"/>`;
s += `<text x="${LX - 14}" y="${T0 + 4 * DT + 30}" class="lab" text-anchor="end">t ↓</text>`;
s += `<text x="140" y="${T0 + 4 * DT + 62}" class="lab">1 RTT TO OPEN · SEQUENCE NUMBERS ARE EXAMPLE VALUES</text>`;
// big ghost numerals
s += `<text x="300" y="900" class="ghost">3</text>`;
// handwriting
s += `<text x="560" y="300" class="hand" transform="rotate(-5 560 300)">ISN picked at random</text><path d="M555,296 C470,300 430,320 ${LX + 40},${T0 + 32}" class="pen"/><path d="M${LX + 52},${T0 + 22} L${LX + 40},${T0 + 32} L${LX + 56},${T0 + 38}" class="pen"/>`;

// ---- header bit map (right) -------------------------------------------------
const BX = 1184, BW = 640, BY = 330, RH = 30, bit = BW / 32;
s += `<text x="${BX}" y="286" class="h3">TCP HEADER · RFC 9293</text><text x="${BX + BW}" y="286" class="lab" text-anchor="end">FIXED PART 20 BYTES</text>`;
for (let b = 0; b <= 32; b++) s += `<line x1="${r(BX + b * bit)}" y1="${BY - 6}" x2="${r(BX + b * bit)}" y2="${BY - (b % 8 ? 2 : 10)}" stroke="${INK}"/>`;
for (const b of [0, 8, 16, 24, 31]) s += `<text x="${r(BX + b * bit + (b === 31 ? bit / 2 : 0))}" y="${BY - 14}" class="lab" text-anchor="middle">${b}</text>`;
const rows = [
  [['SOURCE PORT', 16, '52 814'], ['DESTINATION PORT', 16, '443']],
  [['SEQUENCE NUMBER', 32, '1000']],
  [['ACKNOWLEDGMENT NUMBER', 32, '0']],
  [['OFF', 4, '5'], ['RSV', 4, ''], ['CWR', 1], ['ECE', 1], ['URG', 1], ['ACK', 1], ['PSH', 1], ['RST', 1], ['SYN', 1, '', 1], ['FIN', 1], ['WINDOW', 16, '64 240']],
  [['CHECKSUM', 16, '0x3A9F'], ['URGENT POINTER', 16, '0']],
  [['OPTIONS · MSS 1460 · SACK-PERM · WSCALE 7 · TIMESTAMPS', 32, '']],
];
const names = ['WORD 0', 'WORD 1', 'WORD 2', 'WORD 3', 'WORD 4', 'WORD 5+'];
rows.forEach((row, j) => {
  const y = BY + j * (RH + 14); let x = BX;
  s += `<text x="${BX - 12}" y="${y + 19}" class="lab" text-anchor="end">${names[j]}</text>`;
  for (const [n, w, v, on] of row) {
    const ww = w * bit, hl = on;
    s += `<rect x="${r(x)}" y="${y}" width="${r(ww)}" height="${RH}" fill="${hl ? RED : j === 3 ? '#dfe3e7' : '#eef1f3'}" stroke="${INK}" stroke-width=".8" class="${hl ? 'blink' : ''}"/>`;
    const fs = w === 1 ? 'style="font-size:7px;letter-spacing:.04em' + (hl ? ';fill:#fff' : '') + '"' : (hl ? 'style="fill:#fff"' : '');
    s += `<text x="${r(x + ww / 2)}" y="${y + (v ? 13 : 19)}" class="cell" text-anchor="middle" ${fs}>${n}</text>`;
    if (v) s += `<text x="${r(x + ww / 2)}" y="${y + 25}" class="cell v" text-anchor="middle">${v}</text>`;
    x += ww;
  }
});
s += `<path d="M${BX + BW + 10},${BY} h8 V${BY + 5 * (RH + 14) - 14} h-8" fill="none" stroke="${INK}"/><text transform="translate(${BX + BW + 34},${BY + 90}) rotate(90)" class="lab">FIXED</text>`;
s += `<path d="M${BX + BW + 10},${BY + 5 * (RH + 14)} h8 V${BY + 5 * (RH + 14) + RH} h-8" fill="none" stroke="${INK}"/><text transform="translate(${BX + BW + 34},${BY + 5 * (RH + 14) - 4}) rotate(90)" class="lab">≤ 40 B</text>`;

// tabs + table
s += `<text x="${BX}" y="636" class="lab">PACKETS IN THE OPENING, SELECTED IN RED</text>`;
let tx = BX; [['SYN', 1], ['SYN · ACK'], ['ACK'], ['DATA']].forEach(([t, on]) => { const w = 32 + t.length * 13; s += `<rect x="${tx}" y="652" width="${w}" height="26" fill="${on ? RED : 'none'}" stroke="${on ? RED : '#8a939c'}"/><text x="${tx + w / 2}" y="670" class="tab" text-anchor="middle" style="fill:${on ? '#fff' : MUTE}">${t}</text>`; tx += w + 8; });
s += `<circle cx="${tx + 12}" cy="665" r="3.5" fill="${RED}" class="blink"/><text x="${tx + 22}" y="669" class="lab">CAPTURED 4 S AGO</text>`;
[['SPECIFICATION', 'RFC 793 (1981) → RFC 9293 (2022)'], ['HEADER', '20 – 60 BYTES'], ['FLAGS', '8 BITS · CWR ECE URG ACK PSH RST SYN FIN'], ['OPEN / CLOSE', '3 SEGMENTS / 4 SEGMENTS']]
  .forEach(([k, v], i) => { const y = 726 + i * 26; s += `<text x="${BX}" y="${y}" class="lab">${k}</text><text x="${BX + BW}" y="${y}" class="lab b" text-anchor="end">${v}</text><line x1="${BX}" y1="${y + 9}" x2="${BX + BW}" y2="${y + 9}" stroke="${INK}" stroke-opacity=".15"/>`; });
// legend + footer
s += `<line x1="700" y1="946" x2="740" y2="946" stroke="${RED}" stroke-width="3"/><text x="752" y="950" class="lab">SELECTED SEGMENT</text><line x1="920" y1="946" x2="960" y2="946" stroke="${INK}" stroke-dasharray="6 5"/><text x="972" y="950" class="lab">PAYLOAD</text>`;
s += `<text x="96" y="1040" class="foot">SOURCES: RFC 9293, TRANSMISSION CONTROL PROTOCOL (IETF, 2022); RFC 793 (1981). PORTS, SEQUENCE NUMBERS AND CHECKSUM ARE EXAMPLE VALUES.</text><text x="1824" y="1040" class="foot" text-anchor="end">CONCEPT STUDY · KATANAVIEW ARCHIVE</text>`;
['#2459b3', '#2a8fa0', '#6b8a2a', '#b07a1e', '#c23d3d', '#9b3c8f', '#6d7a86'].forEach((c, i) => s += `<rect x="${1656 + i * 24}" y="1004" width="22" height="5" fill="${c}"/>`);

const css = `
.h1{font:400 17px Michroma;fill:${INK};letter-spacing:.18em}.h3{font:400 13px Michroma;fill:${INK};letter-spacing:.16em}
.lab{font:400 10px 'IBM Plex Mono';fill:${MUTE};letter-spacing:.14em}.b{fill:${INK};font-weight:500}
.bar{font:400 12px Michroma;fill:#fff;letter-spacing:.12em}.tab{font:400 11px Michroma;letter-spacing:.1em}
.pk{font:400 13px Michroma;letter-spacing:.14em}
.cell{font:500 8.5px 'IBM Plex Mono';fill:${INK};letter-spacing:.08em}.v{font-weight:400;fill:${MUTE}}
.ghost{font:300 520px Outfit;fill:${INK};opacity:.06}
.hand{font:28px 'Nothing You Could Do';fill:${INK}}.pen{fill:none;stroke:${INK};stroke-width:1.6;stroke-linecap:round}
.foot{font:400 8.5px 'IBM Plex Mono';fill:${MUTE};letter-spacing:.14em}
@keyframes pkt{0%{transform:translate(0,0);opacity:0}8%{opacity:1}80%{transform:translate(var(--dx),var(--dy));opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:0}}.pkt{animation:pkt 2.4s cubic-bezier(.5,0,.3,1) infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.55}}.blink{animation:blink 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
emit('NetTCP', 'KTV/NET-01 · TCP protocol sheet', W, H, css, s, '#e6e9ec');
