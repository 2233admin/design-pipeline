// Random computed pieces: the mathematics is the image. Each one gets its own ground, type and composition.
const { emit, r } = require('./common.cjs');
const SERIF = "'Noto Serif SC','Noto Serif CJK SC',serif";
const rm = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';

// ── A · Lorenz attractor, one long line on bone paper ─────────────────────
{
  const W = 1920, H = 1080, BONE = '#EEE9DF', INK = '#141414', RED = '#D23A1E';
  const sg = 10, rh = 28, be = 8 / 3, dt = 0.005; let x = 1, y = 1, z = 1; const pts = [];
  const f = (x, y, z) => [sg * (y - x), x * (rh - z) - y, x * y - be * z];
  for (let i = 0; i < 16000; i++) { // RK4
    const k1 = f(x, y, z), k2 = f(x + dt / 2 * k1[0], y + dt / 2 * k1[1], z + dt / 2 * k1[2]), k3 = f(x + dt / 2 * k2[0], y + dt / 2 * k2[1], z + dt / 2 * k2[2]), k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2]);
    x += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); y += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); z += dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    if (i > 300) pts.push([x, z]);
  }
  const P = ([a, b]) => `${r(1180 + a * 30)},${r(1040 - b * 19)}`;
  let d = 'M' + pts.map(P).join('L');
  let s = `<rect width="${W}" height="${H}" fill="${BONE}"/><path d="${d}" fill="none" stroke="${INK}" stroke-width=".55" stroke-opacity=".85"/>`;
  const fp = Math.sqrt(be * (rh - 1));
  for (const sx of [-1, 1]) s += `<circle cx="${r(1180 + sx * fp * 30)}" cy="${r(1040 - (rh - 1) * 19)}" r="7" fill="none" stroke="${RED}" stroke-width="2"/>`;
  const last = pts[pts.length - 1];
  s += `<circle cx="${P(last).split(',')[0]}" cy="${P(last).split(',')[1]}" r="9" fill="${RED}" class="pulse"/>`;
  s += `<text x="120" y="190" class="big">LORENZ</text><text x="126" y="250" class="mono">dx/dt = σ(y − x)   dy/dt = x(ρ − z) − y   dz/dt = xy − βz</text>`;
  s += `<text x="126" y="290" class="mono">σ = 10 · ρ = 28 · β = 8/3 · RK4, Δt = 0.005, 16 000 STEPS · x–z PLANE</text>`;
  s += `<text x="126" y="960" class="cn">确定，却不可预测。</text><text x="126" y="1000" class="mono">E. N. LORENZ, “DETERMINISTIC NONPERIODIC FLOW”, 1963 · RED RINGS: THE TWO FIXED POINTS C±</text>`;
  emit('MathLorenz', 'Lorenz attractor', W, H, `.big{font:300 150px Outfit;fill:${INK};letter-spacing:.06em}.mono{font:400 13px 'IBM Plex Mono';fill:${INK};letter-spacing:.08em}.cn{font:900 44px ${SERIF};fill:${INK}}@keyframes p{50%{opacity:.3}}.pulse{animation:p 1.2s steps(1) infinite}${rm}`, s, BONE);
}

// ── C · golden-angle phyllotaxis on deep green ───────────────────────────
{
  const W = 1080, H = 1350, BG = '#0E3B2C', CREAM = '#F1E6C8', LIME = '#C9F23A';
  const GA = Math.PI * (3 - Math.sqrt(5)), N = 1400, c = 11.6, CX = 540, CY = 640; let s = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  for (let n = 1; n <= N; n++) {
    const a = n * GA, rr = c * Math.sqrt(n), x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr; if (y > H - 220 || y < 60) continue;
    const on34 = n % 34 === 7, sz = 2 + 4.2 * Math.sqrt(n / N);
    s += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(sz)}" fill="${on34 ? LIME : CREAM}" opacity="${on34 ? 1 : .85}"/>`;
  }
  s += `<rect y="${H - 210}" width="${W}" height="210" fill="${BG}"/>`;
  s += `<text x="80" y="${H - 120}" class="t">137.508°</text><text x="640" y="${H - 148}" class="m">GOLDEN ANGLE = 360°(2 − φ)</text><text x="640" y="${H - 126}" class="m">VOGEL 1979 · r = c√n, θ = n · 137.508°</text><text x="640" y="${H - 104}" class="m">1 400 SEEDS · LIME: EVERY 34TH SEED</text>`;
  s += `<text x="80" y="${H - 60}" class="cn">黄金角 · 向日葵的种子从不排成直线</text>`;
  emit('MathPhyllo', 'Golden-angle phyllotaxis', W, H, `.t{font:400 76px Michroma;fill:${CREAM};letter-spacing:.02em}.m{font:400 12px 'IBM Plex Mono';fill:${CREAM};letter-spacing:.12em;opacity:.8}.cn{font:900 30px ${SERIF};fill:${LIME}}${rm}`, s, BG);
}

// ── D · Fourier: a square wave assembled from odd harmonics (portrait) ─────
{
  const W = 1080, H = 1350, BG = '#FFFFFF', BLUE = '#1F3FD1', INK = '#101010'; let s = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  const rows = [1, 2, 3, 5, 9, 25], X0 = 160, X1 = 1000, RH = 150;
  s += `<text x="80" y="120" class="t">SQUARE</text><text x="80" y="160" class="m">f(x) = 4/π · Σ sin((2k − 1)x) / (2k − 1) · PARTIAL SUMS, k TERMS</text>`;
  rows.forEach((K, i) => {
    const y0 = 270 + i * (RH + 18); let d = '';
    for (let px = 0; px <= X1 - X0; px++) { const xx = px / (X1 - X0) * 4 * Math.PI; let v = 0; for (let k = 1; k <= K; k++) v += Math.sin((2 * k - 1) * xx) / (2 * k - 1); v *= 4 / Math.PI; d += `${px ? 'L' : 'M'}${X0 + px},${r(y0 + RH / 2 - v * RH * .36)}`; }
    s += `<line x1="${X0}" y1="${y0 + RH / 2}" x2="${X1}" y2="${y0 + RH / 2}" stroke="${INK}" stroke-opacity=".15"/><path d="${d}" fill="none" stroke="${i === rows.length - 1 ? BLUE : INK}" stroke-width="${i === rows.length - 1 ? 2.2 : 1.2}"/>`;
    s += `<text x="80" y="${y0 + RH / 2 + 8}" class="k">${K}</text>`;
  });
  // Gibbs overshoot on the last row, measured from the computed sum
  { const K = 25; let mx = 0; for (let px = 1; px < 400; px++) { const xx = px / 4000 * Math.PI; let v = 0; for (let k = 1; k <= K; k++) v += Math.sin((2 * k - 1) * xx) / (2 * k - 1); mx = Math.max(mx, v * 4 / Math.PI); }
    const over = (mx - 1) / 2 * 100, y0 = 270 + 5 * (RH + 18);
    s += `<text x="${X1}" y="${y0 - 6}" class="m" text-anchor="end" style="fill:${BLUE}">GIBBS OVERSHOOT AT 25 TERMS: ${over.toFixed(2)} % OF THE JUMP · LIMIT ≈ 8.95 %</text>`; }
  s += `<text x="80" y="1300" class="m">J. FOURIER 1807 · J. W. GIBBS 1899 · THE CORNER NEVER QUITE ARRIVES</text>`;
  emit('MathFourier', 'Fourier square wave', W, H, `.t{font:600 120px 'Inter Tight';fill:${INK};letter-spacing:-.03em}.m{font:400 12px 'IBM Plex Mono';fill:${INK};letter-spacing:.1em}.k{font:300 44px Outfit;fill:${BLUE}}${rm}`, s, BG);
}

// ── E · Ulam spiral, square, primes only ─────────────────────────────────
{
  const W = 1080, H = 1080, BG = '#0B0B0D', DOT = '#E9E4D8', RED = '#FF4A2E', N = 201; let s = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  const sieve = new Uint8Array(N * N + 1).fill(1); sieve[0] = sieve[1] = 0; for (let i = 2; i * i <= N * N; i++) if (sieve[i]) for (let j = i * i; j <= N * N; j += i) sieve[j] = 0;
  let x = 0, y = 0, dx = 1, dy = 0, seg = 1, run = 0, turns = 0; const C = 5;
  const euler = (n) => { for (let k = 0; k < 40; k++) if (k * k + k + 41 === n) return true; return false; };
  let count = 0;
  for (let n = 1; n <= N * N; n++) {
    if (sieve[n]) { const px = 540 + x * C, py = 540 - y * C; s += `<rect x="${px - 1.6}" y="${py - 1.6}" width="3.2" height="3.2" fill="${euler(n) ? RED : DOT}"/>`; count++; }
    x += dx; y += dy; run++; if (run === seg) { run = 0; [dx, dy] = [-dy, dx]; turns++; if (turns % 2 === 0) seg++; }
  }
  s += `<rect x="40" y="40" width="300" height="88" fill="${BG}"/><text x="56" y="88" class="t">ULAM</text><text x="58" y="114" class="m">1963 · INTEGERS 1–${(N * N).toLocaleString('en')} ON A SQUARE SPIRAL · ${count.toLocaleString('en')} PRIMES</text>`;
  s += `<text x="58" y="1040" class="m" style="fill:${RED}">RED: n² + n + 41 FOR n = 0…39 (EULER) — ALL PRIME, ALL ON DIAGONALS</text>`;
  emit('MathUlam', 'Ulam spiral', W, H, `.t{font:400 40px Michroma;fill:${DOT};letter-spacing:.2em}.m{font:400 10px 'IBM Plex Mono';fill:${DOT};letter-spacing:.12em;opacity:.85}${rm}`, s, BG);
}

// ── F · Kepler's second law: equal areas in equal times ──────────────────
{
  const W = 1920, H = 1080, BG = '#101A33', T = '#E8ECF5', ORANGE = '#FF8A1F', e = .6, a = 560, b = a * Math.sqrt(1 - e * e), FX = 980, FY = 560;
  const cx = FX + a * e; let s = `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  const pos = (Mean) => { let E = Mean; for (let i = 0; i < 30; i++) E -= (E - e * Math.sin(E) - Mean) / (1 - e * Math.cos(E)); return [cx - a * Math.cos(E), FY + b * Math.sin(E)]; };  // E = 0 at perihelion, on the focus side
  // 12 equal time steps (equal mean-anomaly), alternate sectors filled
  for (let k = 0; k < 12; k++) {
    let d = `M${FX},${FY}`; for (let j = 0; j <= 24; j++) { const [x, y] = pos((k + j / 24) / 12 * 2 * Math.PI); d += `L${r(x)},${r(y)}`; }
    s += `<path d="${d}Z" fill="${k % 2 ? 'none' : ORANGE}" fill-opacity="${k % 2 ? 0 : .85}" stroke="${T}" stroke-opacity=".5" stroke-width="1"/>`;
  }
  s += `<ellipse cx="${cx}" cy="${FY}" rx="${a}" ry="${r(b)}" fill="none" stroke="${T}" stroke-width="1.4"/><circle cx="${FX}" cy="${FY}" r="18" fill="#FFD27A"/><circle cx="${cx + a * e}" cy="${FY}" r="4" fill="none" stroke="${T}"/>`;
  s += `<g class="orbit"><circle r="9" fill="${T}"/></g>`;
  s += `<text x="120" y="160" class="t">EQUAL AREAS</text><text x="120" y="210" class="cn">相等时间，扫过相等面积</text>`;
  s += `<text x="120" y="900" class="m">KEPLER, ASTRONOMIA NOVA, 1609 · SECOND LAW</text><text x="120" y="922" class="m">e = 0.6 · 12 EQUAL TIME STEPS · POSITIONS FROM KEPLER'S EQUATION M = E − e sin E</text><text x="120" y="944" class="m">FAST AT PERIHELION, SLOW AT APHELION — EVERY WEDGE HAS THE SAME AREA</text>`;
  // the moving planet: keyframes sampled from the same equation (time-uniform)
  let kf = ''; for (let i = 0; i <= 48; i++) { const [x, y] = pos(i / 48 * 2 * Math.PI); kf += `${(i / 48 * 100).toFixed(2)}%{transform:translate(${r(x)}px,${r(y)}px)}`; }
  emit('MathKepler', 'Kepler second law', W, H, `.t{font:400 64px Michroma;fill:${T};letter-spacing:.1em}.cn{font:900 34px ${SERIF};fill:${ORANGE}}.m{font:400 12px 'IBM Plex Mono';fill:${T};letter-spacing:.12em;opacity:.8}@keyframes orb{${kf}}.orbit{animation:orb 12s linear infinite}${rm}`, s, BG);
}

// ── B · logistic map bifurcation (raster from numpy + vector notes) ────────
{
  const W = 1920, H = 1080, RED = '#FF3B2F', T = '#EDEDED'; const X = (rr) => (rr - 2.8) / 1.2 * W;
  let s = `<rect width="${W}" height="${H}" fill="#000"/><image href="../art/bifurcation.jpg" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`;
  for (const [rr, lab] of [[3, 'r = 3 · PERIOD 2'], [1 + Math.sqrt(6), 'r ≈ 3.449 · PERIOD 4'], [3.56995, 'r ≈ 3.56995 · ONSET OF CHAOS'], [1 + Math.sqrt(8), 'r ≈ 3.828 · PERIOD-3 WINDOW']])
    s += `<line x1="${r(X(rr))}" y1="40" x2="${r(X(rr))}" y2="${H - 40}" stroke="${RED}" stroke-width="1" stroke-dasharray="3 5"/><text x="${r(X(rr) + 8)}" y="${rr > 3.5 ? 1000 : 120}" class="m" style="fill:${RED}">${lab}</text>`;
  s += `<text x="60" y="980" class="t">x → rx(1 − x)</text><text x="62" y="1020" class="m">LOGISTIC MAP, r FROM 2.8 TO 4.0 · 600 WARM-UP + 900 PLOTTED ITERATES PER r · FEIGENBAUM δ ≈ 4.6692</text>`;
  emit('MathBif', 'Logistic map bifurcation', W, H, `.t{font:300 72px Outfit;fill:${T}}.m{font:400 12px 'IBM Plex Mono';fill:${T};letter-spacing:.1em}${rm}`, s, '#000');
}
console.log('ok');
