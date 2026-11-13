const { emit, r } = require('./common.cjs');
const T = '#EDEDED', RED = '#FF3B2F';
const css = (t = T) => `.t{font:300 72px Outfit;fill:${t}}.m{font:400 12px 'IBM Plex Mono';fill:${t};letter-spacing:.1em;opacity:.9}.k{font:400 22px Michroma;fill:${t};letter-spacing:.2em}@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
// rasters come from dense.py (numpy); the page references them next door in ../art/
const img = (_id, w, h, file) => `<image href="../art/${file}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`;
const D = '';
// Buddhabrot
{ const W = 1920, H = 1080, X = (re) => (re + 2.05) / 3.05 * W, Y = (im) => (im + .86) / 1.72 * H;
  let s = `<rect width="${W}" height="${H}" fill="#000"/>` + img('1aeea5b32d2e66f131a97dfc6f845458', W, H, 'buddha.jpg');
  s += `<path d="M${r(X(0) - 14)},${r(Y(0))}h10M${r(X(0) + 4)},${r(Y(0))}h10M${r(X(0))},${r(Y(0) - 14)}v10M${r(X(0))},${r(Y(0) + 4)}v10" stroke="${RED}"/><text x="${r(X(0) + 16)}" y="${r(Y(0) - 10)}" class="m" style="fill:${RED}">0 + 0i</text>`;
  s += `<line x1="${r(X(-2))}" y1="${r(Y(0) + 30)}" x2="${r(X(-2))}" y2="${r(Y(0) + 70)}" stroke="${RED}"/><text x="${r(X(-2))}" y="${r(Y(0) + 88)}" class="m" text-anchor="middle" style="fill:${RED}">−2</text>`;
  s += `<text x="60" y="110" class="t">z → z² + c</text><text x="62" y="1020" class="m">BUDDHABROT · DENSITY OF ESCAPING ORBITS ONLY · 12 000 000 RANDOM c · UP TO 600 ITERATIONS · REAL AXIS HORIZONTAL</text>`;
  emit('DenseBuddha', 'Buddhabrot', W, H, css(), s, '#000'); }
// Standard map
{ const W = 1920, H = 1080; let s = `<rect width="${W}" height="${H}" fill="#000"/>` + img('f9835878fd1d5fdbc07707393217b25a', W, H, 'stdmap.jpg');
  s += `<rect x="40" y="40" width="760" height="150" fill="#000" opacity=".82"/><text x="60" y="118" class="t" style="font-size:54px">pₙ₊₁ = pₙ + K sin θₙ</text><text x="62" y="170" class="m">θₙ₊₁ = θₙ + pₙ₊₁ (MOD 2π) · CHIRIKOV STANDARD MAP</text>`;
  s += `<rect x="40" y="${H - 96}" width="1100" height="60" fill="#000" opacity=".82"/><text x="62" y="${H - 58}" class="m"><tspan style="fill:${RED}">K = 0.971635</tspan> · GREENE'S CRITICAL VALUE: THE LAST GOLDEN KAM CURVE BREAKS · 2 400 ORBITS × 2 500 KICKS</text>`;
  emit('DenseStdmap', 'Standard map', W, H, css(), s, '#000'); }
// de Jong
{ const W = 1920, H = 1080; let s = `<rect width="${W}" height="${H}" fill="#000"/>` + img('0ba14dd3fe02b18b49b290315286001b', W, H, 'dejong.jpg');
  s += `<text x="1860" y="120" class="t" text-anchor="end" style="font-size:52px">x′ = sin(ay) − cos(bx)</text><text x="1860" y="186" class="t" text-anchor="end" style="font-size:52px">y′ = sin(cx) − cos(dy)</text>`;
  s += `<text x="1860" y="236" class="m" text-anchor="end">a = 1.4 · b = −2.3 · c = 2.4 · d = −2.1</text><text x="1860" y="1000" class="m" text-anchor="end">PETER DE JONG ATTRACTOR · 600 000 WALKERS × 72 STEPS · ≈ 43 000 000 POINTS</text>`;
  s += `<line x1="1500" y1="214" x2="1860" y2="214" stroke="${RED}"/>`;
  emit('DenseDeJong', 'de Jong attractor', W, H, css(), s, '#000'); }
// Clifford
{ const W = 1920, H = 1080; let s = `<rect width="${W}" height="${H}" fill="#000"/>` + img('9004c6ad0f79a54aa67167ba404b178b', W, H, 'clifford.jpg');
  s += `<text x="60" y="110" class="k">CLIFFORD</text><text x="62" y="150" class="m">x′ = sin(ay) + c·cos(ax)   y′ = sin(bx) + d·cos(by)</text><text x="62" y="172" class="m">a = −1.4 · b = 1.6 · c = 1.0 · d = 0.7 · AFTER CLIFFORD A. PICKOVER</text>`;
  s += `<line x1="62" y1="188" x2="420" y2="188" stroke="${RED}"/><text x="62" y="1020" class="m">600 000 WALKERS × 72 STEPS · LOG DENSITY</text>`;
  emit('DenseClifford', 'Clifford attractor', W, H, css(), s, '#000'); }
// Lyapunov (square)
{ const S = 1350; let s = `<rect width="${S}" height="${S}" fill="#000"/>` + img('c3744696a9df920eb8871fb9dc5afcde', S, S, 'lyapunov.jpg');
  for (let v = 2.5; v <= 4.001; v += .5) { const p = (v - 2.5) / 1.5 * S; s += `<line x1="${r(p)}" y1="${S - 14}" x2="${r(p)}" y2="${S}" stroke="${T}"/><line x1="0" y1="${r(S - p)}" x2="14" y2="${r(S - p)}" stroke="${T}"/>`; }
  s += `<rect x="40" y="40" width="720" height="170" fill="#000" opacity=".8"/><text x="60" y="118" class="t" style="font-size:58px">λ = ⟨ ln |r(1 − 2x)| ⟩</text><text x="62" y="160" class="m">LYAPUNOV FRACTAL · r ALTERNATES a, a, b, a, b · a → , b ↑ ∈ [2.5, 4]</text><text x="62" y="184" class="m"><tspan style="fill:#F0C45C">GOLD λ &lt; 0, STABLE</tspan> · BLACK λ &gt; 0, CHAOS · AFTER M. MARKUS</text>`;
  emit('DenseLyap', 'Lyapunov fractal', S, S, css(), s, '#000'); }
console.log('ok');
