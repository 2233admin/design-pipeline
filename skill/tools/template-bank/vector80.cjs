"use strict";

// Early-80s vector display plates from a JSON spec. The renderer draws crisp phosphor lines on black
// (no filters); vector80-glow.py then gives them the physical glow of a vector screen shot on film
// (white-hot cores, three bloom halos, heat shift where light piles up, scan tears, phosphor speckle,
// halation, film fog, grain, vignette, slight barrel). Three layouts:
//   scope  - oscilloscope graticule (dot lattice, cross axes) carrying circles, lines, Lissajous
//            figures and tangent circle pencils, one phosphor
//   plate  - isometric platform with tabs, floor rings, way-markers and flag tags around a computed
//            subject: menger (level n), field (height-field preset) or dome (lat/long sphere)
//   panel  - instrument panel: framed title, status boxes, right readout column, corner crosshairs and
//            a view window holding a globe (graticule + contour rings) or a plot
const fs = require("node:fs");
const path = require("node:path");

const GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&display=swap";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const PHOSPHORS = { red: "#FF3B2A", orange: "#FF8A2A", amber: "#FFB23F", yellow: "#FFD84A", green: "#58F0A0", teal: "#3FE0C8", blue: "#3D8BFF", white: "#E8F0FF" };
const DIM = (hex, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
const r = (x) => (+x).toFixed(1);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const C30 = Math.cos(Math.PI / 6);

function ctxOf(spec) {
  const [W, H] = spec.size || [1080, 1440];
  const ph = Object.assign({ primary: "green", secondary: "red", accent: "yellow", rings: "orange" }, spec.phosphor || {});
  const col = {}; for (const k in ph) col[k] = PHOSPHORS[ph[k]] || ph[k];
  return { W, H, col, used: new Set() };
}
const use = (ctx, c) => { ctx.used.add(c); return c; };
const ln = (ctx, a, b, c, w = 2) => `<line x1="${r(a[0])}" y1="${r(a[1])}" x2="${r(b[0])}" y2="${r(b[1])}" stroke="${use(ctx, c)}" stroke-width="${w}"/>`;
const pg = (ctx, pts, c, w = 2, fill = "none") => `<polygon points="${pts.map((p) => `${r(p[0])},${r(p[1])}`).join(" ")}" fill="${fill}" stroke="${use(ctx, c)}" stroke-width="${w}" stroke-linejoin="round"/>`;
const pathOf = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${r(p[0])},${r(p[1])}`).join("");

// ---------- subjects for the plate ----------
const SUBJECTS = {
  menger(ctx, iso, s) {
    const n = s.level ?? 2, N = 3 ** n, out = [];
    const keep = (x, y, z) => { for (let k = 0; k < n; k++) { const a = Math.floor(x / 3 ** k) % 3, b = Math.floor(y / 3 ** k) % 3, c = Math.floor(z / 3 ** k) % 3; if ((a === 1) + (b === 1) + (c === 1) >= 2) return false; } return true; };
    const L = []; for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) for (let z = 0; z < N; z++) if (keep(x, y, z)) L.push([x, y, z]);
    L.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]) || a[2] - b[2]);
    const P = ctx.col.primary, D = DIM(P, .45), DD = DIM(P, .22);
    for (const [x, y, z] of L) {
      const f = (pts) => pts.map(([u, v, w]) => iso(u, v, w));
      const fx = f([[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]]), fy = f([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]), tp = f([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]);
      for (const [face, outer] of [[fx, x === N - 1], [fy, y === N - 1], [tp, z === N - 1]]) out.push(pg(ctx, face, outer ? P : D, outer ? 1.6 : 1.2, "#000"), ln(ctx, face[0], face[2], outer ? D : DD, .9));
    }
    return { svg: out.join(""), extent: N, count: L.length, center: [N / 2, N / 2], top: N };
  },
  field(ctx, iso, s) {
    const nx = s.nx ?? 20, ny = s.ny ?? 12, k = s.height ?? 1;
    const peaks = s.peaks || [[nx * .3, ny * .33, 2.4, 10], [nx * .7, ny * .66, 1.6, 14], [nx * .55, ny * .25, -.9, 6]];
    const h = (x, y) => k * (peaks.reduce((a, [px, py, amp, sp]) => a + amp * Math.exp(-((x - px) ** 2 + (y - py) ** 2) / sp), 0) + .25 * Math.sin(x * .9) * Math.cos(y * .8));
    const cells = []; for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) cells.push([x, y]);
    cells.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    const P = ctx.col.primary, D = DIM(P, .45), out = [];
    for (const [x, y] of cells) { const q = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([u, v]) => iso(u, v, h(u, v))); out.push(pg(ctx, q, P, 1.3, "#000"), ln(ctx, q[0], q[2], D, .8)); }
    return { svg: out.join(""), extent: Math.max(nx, ny), count: nx * ny, center: [nx / 2, ny / 2], top: 3 * k, nx, ny, h };
  },
  dome(ctx, iso, s) {
    const R = s.radius ?? 4, c = [R, R], out = [], P = ctx.col.secondary;
    for (let lat = 0; lat < 90; lat += 15) { const pts = []; for (let a = 0; a <= 360; a += 6) { const t = a * Math.PI / 180, rr = R * Math.cos(lat * Math.PI / 180); pts.push(iso(c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t), R * Math.sin(lat * Math.PI / 180))); } out.push(`<path d="${pathOf(pts)}" fill="none" stroke="${use(ctx, P)}" stroke-width="1.6"/>`); }
    for (let lon = 0; lon < 360; lon += 20) { const pts = []; for (let lat = 0; lat <= 90; lat += 5) { const t = lon * Math.PI / 180, rr = R * Math.cos(lat * Math.PI / 180); pts.push(iso(c[0] + rr * Math.cos(t), c[1] + rr * Math.sin(t), R * Math.sin(lat * Math.PI / 180))); } out.push(`<path d="${pathOf(pts)}" fill="none" stroke="${use(ctx, P)}" stroke-width="1.4"/>`); }
    return { svg: out.join(""), extent: 2 * R, count: 0, center: c, top: R };
  },
};

// ---------- layouts ----------
function textBlock(ctx, spec, color) {
  const c = spec.captions || {}, { W, H } = ctx; let s = "";
  if (spec.title) s += `<text x="90" y="150" class="v-hd" style="fill:${use(ctx, color)}">${esc(spec.title)}</text>`;
  if (c.tl) s += `<text x="90" y="186" class="v-sm" style="fill:${color}">${esc(c.tl)}</text>`;
  if (c.tr) s += `<text x="${W - 90}" y="150" class="v-hd" text-anchor="end" style="fill:${color}">${esc(c.tr)}</text>`;
  if (c.tr2) s += `<text x="${W - 90}" y="186" class="v-sm" text-anchor="end" style="fill:${color}">${esc(c.tr2)}</text>`;
  if (c.bl) s += `<text x="90" y="${H - 130}" class="v-sm" style="fill:${color}">${esc(c.bl)}</text>`;
  if (c.br) s += `<text x="${W - 90}" y="${H - 130}" class="v-sm" text-anchor="end" style="fill:${color}">${esc(c.br)}</text>`;
  return s;
}

const LAYOUTS = {
  scope(ctx, spec, findings) {
    const { W, H } = ctx, P = ctx.col.primary, g = spec.scope || {}, step = g.grid ?? 64;
    const cx = g.center?.[0] ?? W / 2, cy = g.center?.[1] ?? H / 2, unit = g.unit ?? 64;
    let s = "";
    for (let x = cx % step; x <= W; x += step) for (let y = cy % step; y <= H; y += step) s += `<circle cx="${r(x)}" cy="${r(y)}" r="2" fill="${use(ctx, P)}" opacity=".75"/>`;
    s += ln(ctx, [60, cy], [W - 60, cy], P, 2.2) + ln(ctx, [cx, 200], [cx, H - 200], P, 2.2);
    const toPx = (x, y) => [cx + x * unit, cy - y * unit];
    for (const t of g.traces || []) {
      if (t.type === "circle") s += `<circle cx="${r(toPx(...t.c)[0])}" cy="${r(toPx(...t.c)[1])}" r="${r(t.r * unit)}" fill="none" stroke="${use(ctx, P)}" stroke-width="2.2"/>`;
      else if (t.type === "line") s += ln(ctx, toPx(...t.a), toPx(...t.b), P, 1.4);
      else if (t.type === "pencil") for (const R of t.radii) { const c = toPx(t.at[0] + R, t.at[1]); s += `<circle cx="${r(c[0])}" cy="${r(c[1])}" r="${r(R * unit)}" fill="none" stroke="${use(ctx, P)}" stroke-width="1.8"/>`; }
      else if (t.type === "lissajous") { const pts = []; for (let i = 0; i <= 1200; i++) { const u = i / 1200 * 2 * Math.PI; pts.push(toPx(t.A * Math.sin(t.a * u + (t.delta ?? Math.PI / 2)), t.B * Math.sin(t.b * u))); } s += `<path d="${pathOf(pts)}" fill="none" stroke="${use(ctx, P)}" stroke-width="2"/>`; }
      else findings.push({ rule: "trace-unknown", message: t.type });
    }
    if (g.tag) { const p = toPx(...g.tag.at); s += `<text x="${r(p[0])}" y="${r(p[1])}" class="v-tag" style="fill:${P}">${esc(g.tag.text)}</text>`; }
    return s + textBlock(ctx, spec, P);
  },
  plate(ctx, spec, findings) {
    const { W } = ctx, p = spec.plate || {}, sub = p.subject || { type: "menger", level: 2 };
    if (!SUBJECTS[sub.type]) { findings.push({ rule: "subject-unknown", message: sub.type }); return ""; }
    const S = p.scale ?? 34, OX = p.origin?.[0] ?? W / 2, OY = p.origin?.[1] ?? 560;
    const iso = (x, y, z) => [OX + (x - y) * C30 * S, OY + (x + y) * .5 * S - z * S];
    const body = SUBJECTS[sub.type](ctx, iso, sub);
    const R = ctx.col.secondary, O = ctx.col.rings, Y = ctx.col.accent, Z0 = -.5, A = -(p.margin ?? 3.5), B = body.extent + (p.margin ?? 3.5);
    let s = "";
    const plate = (d, z) => [iso(A - d, A - d, z), iso(B + d, A - d, z), iso(B + d, B + d, z), iso(A - d, B + d, z)];
    s += pg(ctx, plate(0, Z0), R, 2.4) + pg(ctx, plate(.55, Z0), R, 2) + pg(ctx, plate(.55, Z0 - .5), R, 1.4);
    for (const i of [1, 2, 3]) s += ln(ctx, plate(.55, Z0)[i], plate(.55, Z0 - .5)[i], R, 1.4);
    for (let t = A + 1.5; t < B; t += 1.5) s += ln(ctx, iso(t, A, Z0), iso(t, B, Z0), DIM(R, .45), 1) + ln(ctx, iso(A, t, Z0), iso(B, t, Z0), DIM(R, .45), 1);
    const span = B - A;
    for (const k of [0, 1]) {
      for (let i = 0; i < 4; i++) { const t = A + span * (.15 + i * .2); const q = k ? [iso(B + .55, t, Z0), iso(B + 1.3, t, Z0), iso(B + 1.3, t + 1.6, Z0), iso(B + .55, t + 1.6, Z0)] : [iso(t, B + .55, Z0), iso(t, B + 1.3, Z0), iso(t + 1.6, B + 1.3, Z0), iso(t + 1.6, B + .55, Z0)]; s += pg(ctx, q, R, 1.8); }
      for (let i = 0; i < 9; i++) { const t = A + 1 + i * .55; const a = k ? iso(A - 1.2, t, Z0) : iso(t, A - 1.2, Z0); s += `<ellipse cx="${r(a[0])}" cy="${r(a[1])}" rx="7" ry="4" fill="none" stroke="${use(ctx, Y)}" stroke-width="1.6"/>`; }
    }
    if (p.rings !== false) { const [cx, cy] = body.center; const base = body.extent * (p.ringStart ?? .8); [[0, 300], [20, 330], [-30, 250], [40, 280]].forEach(([a0, a1], i) => { const RR = base + i * body.extent * (p.ringStep ?? .2), pts = []; for (let a = a0; a <= a1; a += 3) { const t = a * Math.PI / 180; pts.push(iso(cx + RR * Math.cos(t), cy + RR * Math.sin(t), Z0)); } s += `<path d="${pathOf(pts)}" fill="none" stroke="${use(ctx, O)}" stroke-width="2"/>`; }); }
    for (const [x, y] of p.markers || []) { const c = iso(x, y, Z0); s += `<path d="M${r(c[0])},${r(c[1] - 9)} L${r(c[0] + 14)},${r(c[1])} L${r(c[0])},${r(c[1] + 9)} L${r(c[0] - 14)},${r(c[1])} Z" fill="none" stroke="${use(ctx, Y)}" stroke-width="1.8"/>`; }
    s += body.svg;
    for (const f of p.flags || []) {
      const b = iso(...f.at), t = [b[0], b[1] - (f.pole ?? 120)], w = 52 + 13.5 * (`${f.label} ${f.value}`.length);
      s += ln(ctx, b, t, Y, 2.2) + `<rect x="${r(t[0] - 4)}" y="${r(t[1] - 30)}" width="${w}" height="38" fill="#000" stroke="${use(ctx, R)}" stroke-width="2.4"/><rect x="${r(t[0] + 4)}" y="${r(t[1] - 22)}" width="22" height="22" fill="none" stroke="${R}" stroke-width="2.4"/><rect x="${r(t[0] + 10)}" y="${r(t[1] - 16)}" width="10" height="10" fill="${R}"/><text x="${r(t[0] + 34)}" y="${r(t[1] - 3)}" class="v-tag" style="fill:${R}">${esc(f.label)} ${esc(f.value)}</text>`;
    }
    ctx.subject = body;
    return s + textBlock(ctx, spec, ctx.col.primary);
  },
  panel(ctx, spec, findings) {
    const { W, H } = ctx, F = ctx.col.frame || PHOSPHORS.blue, T = ctx.col.text || PHOSPHORS.teal, p = spec.panel || {};
    ctx.col.frame = F; ctx.col.text = T;
    const X0 = 70, Y0 = 150, X1 = W - 70, Y1 = H - 150, RX = X1 - 300;
    let s = `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="none" stroke="${use(ctx, F)}" stroke-width="3"/><rect x="${X0 + 12}" y="${Y0 + 12}" width="${RX - X0 - 24}" height="${Y1 - Y0 - 24}" fill="none" stroke="${F}" stroke-width="2.4"/><rect x="${RX}" y="${Y0 + 12}" width="${X1 - RX - 12}" height="${Y1 - Y0 - 24}" fill="none" stroke="${F}" stroke-width="2.4"/>`;
    const HY = Y0 + 130;
    s += ln(ctx, [X0 + 12, HY], [RX - 12, HY], F, 2.4) + `<text x="${X0 + 50}" y="${Y0 + 88}" class="v-pt" style="fill:${use(ctx, T)}">${esc(spec.title || "")}</text>`;
    (p.status || []).forEach((t, i) => { const x = RX - 300, y = Y0 + 30 + i * 46, w = 270; s += `<rect x="${x}" y="${y}" width="${w}" height="34" fill="none" stroke="${T}" stroke-width="2"/><text x="${x + 12}" y="${y + 24}" class="v-ps" style="fill:${T}">${esc(t)}</text>`; });
    let ry = Y0 + 60;
    for (const [k, v] of p.readout || []) { s += `<text x="${RX + 24}" y="${ry}" class="v-ps" style="fill:${T}">${esc(k)}</text>`; ry += 30; if (v != null && v !== "") { s += `<rect x="${RX + 20}" y="${ry - 24}" width="${Math.min(240, 24 + 14 * String(v).length)}" height="32" fill="none" stroke="${T}" stroke-width="2"/><text x="${RX + 30}" y="${ry - 1}" class="v-ps" style="fill:${T}">${esc(v)}</text>`; ry += 44; } else ry += 8; }
    if (ry > Y1 - 20) findings.push({ rule: "readout-overflow", message: `readout column ends at ${ry}, beyond ${Y1 - 20}` });
    const VX0 = X0 + 12, VY0 = HY, VX1 = RX - 12, VY1 = Y1 - 12;
    for (const [x, y] of [[VX0 + 80, VY0 + 80], [VX1 - 80, VY0 + 80], [VX0 + 80, VY1 - 80], [VX1 - 80, VY1 - 80]]) s += ln(ctx, [x - 40, y], [x + 40, y], F, 3) + ln(ctx, [x, y - 40], [x, y + 40], F, 3);
    const v = p.view || { type: "globe" };
    if (v.type === "globe") {
      const R = v.radius ?? (VY1 - VY0) * .62, cx = v.center?.[0] ?? VX1 - R * .55, cy = v.center?.[1] ?? (VY0 + VY1) / 2, tilt = (v.tilt ?? 20) * Math.PI / 180, rot = (v.rotate ?? -30) * Math.PI / 180;
      const proj = (lat, lon) => { const x = Math.cos(lat) * Math.sin(lon + rot), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon + rot); const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt); return z2 > 0 ? [cx + R * x, cy - R * y2] : null; };
      const clip = `<clipPath id="v-view"><rect x="${VX0}" y="${VY0}" width="${VX1 - VX0}" height="${VY1 - VY0}"/></clipPath>`;
      let g = `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(R)}" fill="none" stroke="${use(ctx, ctx.col.primary)}" stroke-width="2.4"/>`;
      const curve = (fn, n, c, w) => { let d = "", pen = false; for (let i = 0; i <= n; i++) { const q = fn(i / n); if (q) { d += `${pen ? "L" : "M"}${r(q[0])},${r(q[1])}`; pen = true; } else pen = false; } return `<path d="${d}" fill="none" stroke="${use(ctx, c)}" stroke-width="${w}"/>`; };
      for (let lat = -60; lat <= 60; lat += 30) g += curve((u) => proj(lat * Math.PI / 180, u * 2 * Math.PI), 180, ctx.col.primary, 2);
      for (let lon = 0; lon < 360; lon += 30) g += curve((u) => proj((u - .5) * Math.PI, lon * Math.PI / 180), 120, ctx.col.primary, 2);
      // contour rings: closed noisy loops around a few centres on the sphere, in accent and secondary
      const rings = v.rings || [[25, -20, [6, 10, 14], "accent"], [-10, 15, [5, 9], "secondary"], [40, 30, [4, 7, 11], "secondary"]];
      for (const [la, lo, radii, which] of rings) for (const rad of radii) g += curve((u) => { const a = u * 2 * Math.PI, wob = 1 + .18 * Math.sin(3 * a + rad) + .1 * Math.sin(7 * a); return proj((la + rad * wob * Math.sin(a)) * Math.PI / 180, (lo + rad * wob * Math.cos(a) / Math.cos(la * Math.PI / 180)) * Math.PI / 180); }, 160, ctx.col[which] || ctx.col.accent, 2);
      s += `<defs>${clip}</defs><g clip-path="url(#v-view)">${g}</g>`;
    } else findings.push({ rule: "view-unknown", message: v.type });
    return s;
  },
};

function render(spec) {
  const findings = [];
  const ctx = ctxOf(spec);
  if (!LAYOUTS[spec.layout]) return { svg: "", findings: [{ rule: "layout-unknown", message: String(spec.layout) }], ctx };
  const body = LAYOUTS[spec.layout](ctx, spec, findings);
  const phos = [...ctx.used].filter((c) => /^#[0-9A-Fa-f]{6}$/.test(c) && Object.values(PHOSPHORS).map((x) => x.toLowerCase()).includes(c.toLowerCase()));
  if (phos.length > 5) findings.push({ rule: "phosphor-budget", message: `${phos.length} phosphors; a vector plate holds at most five` });
  const tz = spec.tearZone || [0, 0];
  const { W, H } = ctx;
  const css = `.v-hd{font:700 30px ${MONO};letter-spacing:.14em}.v-sm{font:500 17px ${MONO};letter-spacing:.18em}.v-tag{font:700 20px ${MONO};letter-spacing:.08em}.v-pt{font:700 44px ${MONO};letter-spacing:.12em}.v-ps{font:700 22px ${MONO};letter-spacing:.06em}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-tear-zone="${tz.join(",")}" role="img" aria-label="${esc(spec.title || spec.layout)}"><style>${css}</style><rect width="${W}" height="${H}" fill="#000"/>${body}</svg>`;
  return { svg, findings, ctx };
}

function page(svg, title) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="${GOOGLE_FONTS}"><style>body{margin:0;background:#000}</style></head><body>${svg}</body></html>`;
}

module.exports = { render, page, LAYOUTS, SUBJECTS, PHOSPHORS };

if (require.main === module) {
  const args = process.argv.slice(2);
  const [specPath, out] = args.filter((a) => !a.startsWith("--"));
  if (!specPath || !out) { console.error("usage: vector80.cjs spec.json out.html [--png out.png]  (CHROME_PATH picks the browser)   then: python3 vector80-glow.py out.png final.jpg"); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const res = render(spec);
  fs.writeFileSync(out, page(res.svg, spec.title || spec.layout));
  const pngAt = args.indexOf("--png");
  const finish = () => { console.log(JSON.stringify({ out, findings: res.findings })); process.exit(res.findings.length ? 2 : 0); };
  if (pngAt > -1) {
    let pw; try { pw = require("playwright"); } catch { console.error("--png needs playwright (npm run browser:install at the repository root); screenshot the html at 2x instead"); process.exit(1); }
    (async () => { const b = await pw.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}).catch((e) => { console.error(`could not start a browser (${e.message.split("\n")[0]}); set CHROME_PATH or screenshot the html at 2x`); process.exit(1); }); const p = await b.newPage({ viewport: { width: res.ctx.W, height: res.ctx.H }, deviceScaleFactor: 2 }); await p.goto("file://" + path.resolve(out)); await p.waitForTimeout(800); await p.screenshot({ path: args[pngAt + 1] }); await b.close(); finish(); })();
  } else finish();
}
