const { emit } = require('./common.cjs');
const W = 1800, H = 600, P = 600; const href = '../art/collage.jpg';
let s = `<image href="${href}" x="0" y="0" width="${W}" height="${H}"/>`;
const cap = [['01 · SAND / PAPER', 'RIPPLES = sin((y + fbm·40 + 0.08x) / 7.5) · TORN EDGE = RANDOM WALK'], ['02 · DUSK', 'SKY GRADIENT · HORIZON GLOW exp(−(t − 0.48)² / 0.012²)'], ['03 · REACTION–DIFFUSION', 'GRAY–SCOTT · F 0.029 · K 0.057 · 5 000 STEPS · RELIEF FROM ∇']];
cap.forEach(([a, b], i) => { s += `<text x="${i * P + 20}" y="${H - 34}" class="a">${a}</text><text x="${i * P + 20}" y="${H - 16}" class="b">${b}</text>`; });
emit('Collage', 'Computed material triptych', W, H, `.a{font:500 13px 'IBM Plex Mono';fill:#fff;letter-spacing:.14em;paint-order:stroke;stroke:#000;stroke-width:3px}.b{font:400 9px 'IBM Plex Mono';fill:#fff;letter-spacing:.1em;paint-order:stroke;stroke:#000;stroke-width:2.5px}`, s, '#000');
