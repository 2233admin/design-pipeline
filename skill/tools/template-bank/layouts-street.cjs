"use strict";

// Layouts of the street-tape style pack (styles/street-tape/style.json): a Japanese street-fashion
// city game's official-site grammar, measured on an owner-supplied reference board (kept private,
// never shipped) and proven on the original site 回放街区 REPLAY WARD. One cut angle everywhere
// (49 degrees, measured three ways on the board), big rounded slabs, a black fine-stripe band at
// the same angle, a film-strip motif, one acid yellow-green as the only strong colour, the
// three-line section title (ultra-black CJK / condensed caps / a giant condensed two-digit number),
// a right-edge vertical pager and black capsule controls with a grey ring. Geometry in the board's
// own 1920 units scaled to the canvas. Everything is drawn here; pictures are image slots.

const { f1, esc, rbox, invalid } = require("./layout-kit.cjs");

const CUT = 49; // degrees from horizontal, the only diagonal in the grammar
const T = Math.tan((CUT * Math.PI) / 180);
const cutX = (x0, y0, y) => x0 - (y - y0) / T; // a cut through (x0, y0) going down-left

// Rounded polygon: points [[x, y, r?]], r is that corner's radius (default r0); quadratic corners.
function rp(points, r0 = 0) {
  const n = points.length; let d = "";
  for (let i = 0; i < n; i += 1) {
    const [x, y, rr] = points[i]; const r = rr ?? r0;
    const p = points[(i - 1 + n) % n]; const q = points[(i + 1) % n];
    const l1 = Math.hypot(x - p[0], y - p[1]) || 1; const l2 = Math.hypot(q[0] - x, q[1] - y) || 1;
    const k = Math.min(r, l1 / 2, l2 / 2);
    const a = [x + ((p[0] - x) / l1) * k, y + ((p[1] - y) / l1) * k];
    const b = [x + ((q[0] - x) / l2) * k, y + ((q[1] - y) / l2) * k];
    d += `${i ? "L" : "M"}${f1(a[0])} ${f1(a[1])} Q${f1(x)} ${f1(y)} ${f1(b[0])} ${f1(b[1])} `;
  }
  return `${d}Z`;
}
const mirror = (pts, W, on) => (on ? pts.map(([x, y, r]) => [W - x, y, r]).reverse() : pts);

// Fine-stripe band: a flat #222122 ground (what the static check reads) with 3-unit dark lines at
// 49 degrees on a 10-unit pitch, clipped to the band (decoration).
function stripeBand(d, pts, s) {
  const path = rp(pts, 0);
  d.raw(`<path d="${path}" fill="${d.pal.stripe}" data-role="stripe"/>`);
  d.tapeClips = (d.tapeClips || 0) + 1; // per render, so the default render is byte-stable
  const id = `tape-clip-${d.tapeClips}`;
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pitch = 13.2 * s; const span = (y1 - y0) / T;
  let lines = "";
  for (let x = x0 - span; x <= x1 + pitch; x += pitch) lines += `M${f1(x)} ${f1(y1)} L${f1(x + span)} ${f1(y0)} `;
  d.def(`<clipPath id="${id}"><path d="${path}"/></clipPath>`);
  d.raw(`<g data-deco="1" clip-path="url(#${id})"><path d="${lines}" fill="none" stroke="${d.pal.stripe_line}" stroke-width="${f1(3.9 * s)}"/></g>`);
}
// Film strip from (x1, y1) to (x2, y2): black band with rounded sprocket holes (decoration).
function film(d, x1, y1, x2, y2, s, hole = "grey") {
  const len = Math.hypot(x2 - x1, y2 - y1); const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI; const w = 72 * s;
  let holes = "";
  for (let x = 18 * s; x < len - 40 * s; x += 70 * s) holes += `<rect x="${f1(x)}" y="${f1(-18 * s)}" width="${f1(46 * s)}" height="${f1(36 * s)}" rx="${f1(7 * s)}" fill="${d.pal[hole]}"/>`;
  d.raw(`<g data-deco="1" transform="translate(${f1(x1)} ${f1(y1)}) rotate(${f1(ang)})"><rect x="0" y="${f1(-w / 2)}" width="${f1(len)}" height="${f1(w)}" fill="${d.pal.film}"/>${holes}</g>`);
}
function digits(d, name, n = 2) {
  const { text } = d.value(name);
  if (!new RegExp(`^\\d{1,${n}}$`).test(String(text))) throw invalid(`slot ${name} is the section's ${n}-digit number (digits only), got ${JSON.stringify(text)}. Fix: --set ${name}=0${Math.min(9, 2)} ; put words in a text slot`);
}
const chevron = (x, y, s, color, dir = 1) => `<path d="M${f1(x)} ${f1(y - 7 * s)} l${f1(7 * s * dir)} ${f1(7 * s)} l${f1(-7 * s * dir)} ${f1(7 * s)}" fill="none" stroke="${color}" stroke-width="${f1(4 * s)}"/>`;
// Circle arrow button (white disc, black ring, black arrow).
function circleArrow(d, cx, cy, r, dir, s, dim = false) {
  d.raw(`<g data-deco="1"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${dim ? d.pal.dim : d.pal.white}" stroke="${d.pal.ink}" stroke-width="${f1(3 * s)}"/><path d="M${f1(cx - 9 * s * dir)} ${f1(cy)} H${f1(cx + 9 * s * dir)} M${f1(cx + 2 * s * dir)} ${f1(cy - 7 * s)} l${f1(7 * s * dir)} ${f1(7 * s)} l${f1(-7 * s * dir)} ${f1(7 * s)}" fill="none" stroke="${d.pal.ink}" stroke-width="${f1(4 * s)}" stroke-linejoin="round"/></g>`);
}
// Dark capsule with a 6-unit grey ring and a chevron: the "查看更多" control.
function morePill(d, name, x, y, s) {
  const w = 173 * s; const h = 44 * s; const ring = 6 * s;
  d.raw(`<rect x="${f1(x - ring)}" y="${f1(y - ring)}" width="${f1(w + 2 * ring)}" height="${f1(h + 2 * ring)}" rx="${f1(h / 2 + ring)}" fill="${d.pal.ring}" data-role="ring"/>`);
  d.raw(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${d.pal.capsule}" data-role="capsule"/>`);
  d.text(name, x + w / 2 - 10 * s, y + h / 2 + 6.5 * s, 18 * s, { role: "white", family: "head", anchor: "middle", tracking: 40, box: [x + 6 * s, y + 4 * s, w - 34 * s, h - 8 * s] });
  d.raw(`<g data-deco="1">${chevron(x + w - 34 * s, y + h / 2, s, d.pal.white)}</g>`);
}
// Ink height of the digit 0 (bbox, overshoot included) in em, read from the font files with fontTools
// (Anton-Regular, Oswald[wght] at 400, Noto Sans SC at 900: the stack families of the "num" role).
const DIGIT_EM = { Anton: 0.875, Oswald: 0.826, "Noto Sans SC": 0.772 };
// The family the number is drawn and sized in: the first stack family whose face --font-dir supplies;
// with none supplied, Anton (named, not bundled) is taken as absent and the next family is used.
function numFamily(d) {
  const stack = d.roles.num.stack.filter((f) => DIGIT_EM[f]);
  const shipped = stack.find((f) => d.faces.some((face) => face.family === f));
  return shipped || stack[1] || stack[0];
}
// Three-line section title: CJK (head 900) / Latin caps (label) / giant number (num), on one edge.
function titleBlock(d, x, y, s, { right = false } = {}) {
  const anchor = right ? "end" : "start";
  const zh = 50 * s; const en = 25 * s;
  // number ink = 2.75 x CJK ink (measured on the rendered PNG; CJK ink is ~0.85 em of its size): the size follows the resolved family's digit height, so it holds without Anton
  const numFam = numFamily(d); const dh = DIGIT_EM[numFam]; const no = (zh * 2.6) / dh;
  const span = (n) => (right ? [x - n, 0] : [x, 0]);
  const { text: cjk } = d.value("title_cjk"); const { text: lat } = d.value("title_latin");
  const zw = [...String(cjk)].length * zh * 1.02; const ew = String(lat).length * en * 0.62 + en; const nw = 2 * no * 0.62 + no * 0.12;
  d.text("title_cjk", x, y + zh * 0.88, zh, { role: "ink", family: "head", anchor, box: [span(zw)[0] - 4 * s, y - 4 * s, zw + 8 * s, zh * 1.14] });
  const ey = y + zh + 9 * s;
  d.text("title_latin", x, ey + en * 0.8, en, { role: "ink", family: "label", anchor, box: [span(ew)[0] - 4 * s, ey - 4 * s, ew + 8 * s, en * 1.2] });
  digits(d, "number");
  const ny = ey + en + 18 * s;
  d.text("number", x, ny + no * dh, no, { role: "ink", family: "num", resolved: numFam, anchor, box: [span(nw)[0] - 6 * s, ny - no * 0.08, nw + 12 * s, no * 1.12] });
  return { bottom: ny + no * (dh + 0.03) };
}
// Cassette mark of the placeholder brand sticker (two reels, a tape bar, rewind triangles).
function cassette(x, y, w, h, fg, bg, acid) {
  const r = h * 0.3;
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h * 0.22)}" fill="${bg}" stroke="${fg}" stroke-width="${f1(h * 0.1)}"/>`
    + [0.3, 0.7].map((u) => `<circle cx="${f1(x + w * u)}" cy="${f1(y + h / 2)}" r="${f1(r)}" fill="${fg}"/><circle cx="${f1(x + w * u)}" cy="${f1(y + h / 2)}" r="${f1(r * 0.38)}" fill="${bg}"/>`).join("")
    + `<rect x="${f1(x + w * 0.3)}" y="${f1(y + h * 0.43)}" width="${f1(w * 0.4)}" height="${f1(h * 0.14)}" fill="${fg}"/>`
    + `<path d="M${f1(x + w * 0.5 - h * 0.18)} ${f1(y + h / 2)} l${f1(h * 0.16)} ${f1(-h * 0.14)} v${f1(h * 0.28)} z M${f1(x + w * 0.5)} ${f1(y + h / 2)} l${f1(h * 0.16)} ${f1(-h * 0.14)} v${f1(h * 0.28)} z" fill="${acid}"/>`;
}
// Invented pseudo-glyphs under a sticker word (unreadable by design, decoration).
function pseudoGlyphs(x, y, n, size, fill) {
  let s = ""; let cx = x; let seed = 5;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i += 1) {
    const w = size * (0.55 + r() * 0.35);
    s += `<rect x="${f1(cx)}" y="${f1(y)}" width="${f1(size * 0.18)}" height="${f1(size)}"/><rect x="${f1(cx)}" y="${f1(y + (r() > 0.5 ? 0 : size * 0.82))}" width="${f1(w)}" height="${f1(size * 0.18)}"/>`;
    if (r() > 0.4) s += `<rect x="${f1(cx + w - size * 0.18)}" y="${f1(y + size * 0.4 * r())}" width="${f1(size * 0.18)}" height="${f1(size * 0.6)}"/>`;
    s += `<rect x="${f1(cx)}" y="${f1(y + size * 0.41)}" width="${f1(w * (0.4 + r() * 0.6))}" height="${f1(size * 0.16)}"/>`;
    cx += w + size * (i % 4 === 3 ? 0.7 : 0.22);
  }
  return `<g data-deco="1" fill="${fill}">${s}</g>`;
}

const ICON = {
  music: (cx, cy, s, c) => `<path d="M${f1(cx - 3 * s)} ${f1(cy + 5.5 * s)}a2.5 2.5 0 1 1 -2 -2.45V${f1(cy - 6.5 * s)}l11 -2v11.5a2.5 2.5 0 1 1 -2 -2.45V${f1(cy - 4.8 * s)}l-7 1.3z" fill="${c}" transform="translate(${f1(-3 * s)} 0)"/>`,
  community: (cx, cy, s, c) => `<g fill="none" stroke="${c}" stroke-width="${f1(3 * s)}"><circle cx="${f1(cx - 5 * s)}" cy="${f1(cy - 5 * s)}" r="${f1(4.5 * s)}"/><circle cx="${f1(cx + 5.5 * s)}" cy="${f1(cy - 1 * s)}" r="${f1(3.5 * s)}"/><circle cx="${f1(cx - 4 * s)}" cy="${f1(cy + 6.5 * s)}" r="${f1(3.5 * s)}"/></g>`,
  account: (cx, cy, s, c) => `<g fill="none" stroke="${c}" stroke-width="${f1(3 * s)}"><circle cx="${f1(cx)}" cy="${f1(cy - 6 * s)}" r="${f1(4.5 * s)}"/><path d="M${f1(cx - 8 * s)} ${f1(cy + 11 * s)}v-4.5a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v4.5z"/></g>`,
};

const LAYOUTS = {
  // ---- top bar: 1920 x 66 -------------------------------------------------------------------
  "ui.tape-topbar"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "black");
    // brand sticker
    const bx = 275 * s; const by = 6 * s; const bw = 156 * s; const bh = 54 * s;
    d.raw(`<path d="${rp([[bx + 2 * s, by + 3 * s], [bx + bw, by], [bx + bw - 1 * s, by + bh], [bx, by + bh - 1 * s]], 9 * s)}" fill="${d.pal.ink}" stroke="${d.pal.white}" stroke-width="${f1(2.5 * s)}" data-role="ink"/>`);
    d.raw(`<g data-deco="1">${cassette(bx + 8 * s, by + 15 * s, 40 * s, 24 * s, d.pal.white, d.pal.ink, d.pal.acid)}</g>`);
    d.text("brand_cjk", bx + 55 * s, by + 24 * s, 18 * s, { role: "white", family: "head", box: [bx + 53 * s, by + 5 * s, 96 * s, 23 * s] });
    d.text("brand_latin", bx + 56 * s, by + 44 * s, 12 * s, { role: "acid", family: "num", tracking: 0, box: [bx + 53 * s, by + 31 * s, 101 * s, 16 * s] });
    // nav capsules: the current page is a white capsule with black text
    const cur = p.current;
    for (let i = 1; i <= 6; i += 1) {
      const x = 451 * s + (i - 1) * 121 * s; const y = 15.5 * s; const w = 103 * s; const h = 35 * s;
      if (i === cur) d.raw(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${d.pal.white}" data-role="white"/>`);
      const caret = i === 6 && p.more_caret;
      d.text(`nav_${i}`, x + w / 2 - (caret ? 6 * s : 0), y + h / 2 + 5.5 * s, 15 * s, { role: i === cur ? "ink" : "mute", family: "head", anchor: "middle", box: [x + 6 * s, y + 3 * s, w - (caret ? 20 : 12) * s, h - 6 * s] });
      if (caret) d.raw(`<path data-deco="1" d="M${f1(x + w - 26 * s)} ${f1(y + h / 2 - 2 * s)} l${f1(5 * s)} ${f1(6 * s)} l${f1(5 * s)} ${f1(-6 * s)} z" fill="${d.pal[i === cur ? "ink" : "mute"]}"/>`);
    }
    // acid capsule CTA
    const cx = 1304 * s; const cy = 16.5 * s; const cw = 100 * s; const ch = 33 * s;
    d.raw(`<rect x="${f1(cx)}" y="${f1(cy)}" width="${f1(cw)}" height="${f1(ch)}" rx="${f1(ch / 2)}" fill="${d.pal.acid}" data-role="acid"/>`);
    d.text("cta", cx + cw / 2, cy + ch / 2 + 5.5 * s, 15 * s, { role: "ink", family: "head", anchor: "middle", box: [cx + 5 * s, cy + 3 * s, cw - 10 * s, ch - 6 * s] });
    // round icon buttons
    if (p.icons) ["music", "community", "account"].forEach((k, i) => {
      const x = (1459 + i * 70) * s; const y = 33 * s;
      d.raw(`<g data-deco="1">${k === "music" ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(20 * s)}" fill="${d.pal.dim_dark}" stroke="${d.pal.ring}" stroke-width="${f1(2 * s)}"/>` : ""}${ICON[k](x, y, s, d.pal.white)}</g>`);
    });
    d.zone("bar", "safe", [0, 0, W, H], { slots: ["brand_cjk", "brand_latin", "cta", "nav_1", "nav_2", "nav_3", "nav_4", "nav_5", "nav_6"] });
  },

  // ---- section title block on its acid slab: 960 x 540 -----------------------------------------
  "card.tape-section-title"(d) {
    const { W, H, p } = d; const s = W / 960; const right = p.side === "right";
    d.rect(0, 0, W, H, "grey");
    const yT = 150 * s; const ax = W * p.cut_x;
    stripeBand(d, mirror([[-20 * s, -10 * s], [ax + 260 * s, -10 * s], [ax + 260 * s, yT], [cutX(ax + 260 * s, yT, H + 10 * s), H + 10 * s], [-20 * s, H + 10 * s]], W, right), s);
    if (p.film) { const fx = right ? W - (ax + 330 * s) : ax + 330 * s; film(d, fx, yT + 10 * s, fx + (right ? -1 : 1) * 150 * s, -20 * s, s); }
    d.raw(`<path d="${rp(mirror([[-20 * s, yT], [ax, yT, 30 * s], [cutX(ax, yT, H + 10 * s), H + 10 * s, 0], [-20 * s, H + 10 * s]], W, right))}" fill="${d.pal.acid}" data-role="acid"/>`);
    const cx = ax + 110 * s; const cb = H - 40 * s;
    d.raw(`<path d="${rp(mirror([[cx, yT, 36 * s], [W + 20 * s, yT, 0], [W + 20 * s, cb, 0], [cutX(cx, yT, cb), cb, 32 * s]], W, right))}" fill="${d.pal.white}" data-role="white"/>`);
    const mx = right ? 40 * s : cx + 20 * s; const mw = W - cx - 60 * s;
    d.image("media", mx, yT + 40 * s, mw, cb - yT - 80 * s, "picture, 2:1", { labelAt: [0.5, 0.5] });
    titleBlock(d, right ? W - 110 * s : 110 * s, yT + 34 * s, s * 0.62, { right });
    d.zone("slab", "safe", [0, yT, W, H - yT], { slots: ["title_cjk", "title_latin", "number"] });
  },

  // ---- right-edge vertical pager: 46 x 268 --------------------------------------------------
  "ui.tape-pager"(d) {
    const { W, H } = d; const s = W / 46;
    d.raw(`<path d="${rp([[0, 0, 12 * s], [W + 10 * s, 0, 0], [W + 10 * s, H, 0], [0, H, 12 * s]])}" fill="${d.pal.black}" data-role="black"/>`);
    const c = W / 2; const a = d.pal.acid;
    d.raw(`<g data-deco="1"><rect x="${f1(c - 11 * s)}" y="${f1(16 * s)}" width="${f1(22 * s)}" height="${f1(5 * s)}" rx="${f1(1 * s)}" fill="${a}"/><path d="M${f1(c - 10 * s)} ${f1(42 * s)} l${f1(10 * s)} ${f1(-10 * s)} l${f1(10 * s)} ${f1(10 * s)}" fill="none" stroke="${a}" stroke-width="${f1(5 * s)}" stroke-linejoin="round"/></g>`);
    digits(d, "current"); digits(d, "next");
    const ny = 92 * s; const size = 30 * s;
    d.text("current", c, ny, size, { role: "acid", family: "num", anchor: "middle", transform: `rotate(90 ${f1(c)} ${f1(ny - size * 0.434)})`, box: rbox([c - size * 0.62, ny - size * 0.92, size * 1.24, size], 90, [c, ny - size * 0.434], 2 * s) });
    d.raw(`<g data-deco="1"><path d="M${f1(c - 10 * s)} ${f1(124 * s)} l${f1(10 * s)} ${f1(10 * s)} l${f1(10 * s)} ${f1(-10 * s)}" fill="none" stroke="${a}" stroke-width="${f1(5 * s)}" stroke-linejoin="round"/><rect x="${f1(c - 11 * s)}" y="${f1(141 * s)}" width="${f1(22 * s)}" height="${f1(5 * s)}" rx="${f1(1 * s)}" fill="${a}"/></g>`);
    const py = 268 * s; // the next number is cut by the bar's end (bleed)
    d.text("next", c, py, size, { role: "white", family: "num", anchor: "middle", transform: `rotate(90 ${f1(c)} ${f1(py - size * 0.434)})`, box: rbox([c - size * 0.62, py - size * 0.92, size * 1.24, size], 90, [c, py - size * 0.434], 2 * s) });
  },

  // ---- big container with one cut, and its carousel: 1920 x 1080 ------------------------------
  "kv.tape-cut-carousel"(d) {
    const { W, H, p } = d; const s = W / 1920; const right = p.side === "right";
    const X = (x) => (right ? W - x : x);
    d.rect(0, 0, W, H, "grey");
    const yT = 300 * s; const ax = W * p.cut_x; const cx = ax + 196 * s; const cb = 980 * s;
    stripeBand(d, mirror([[-40 * s, -10 * s], [1100 * s, -10 * s], [1100 * s, yT], [cutX(1100 * s, yT, H + 10 * s), H + 10 * s], [-40 * s, H + 10 * s]], W, right), s);
    if (p.ghost) {
      const { spec, text } = d.value("ghost_latin");
      d.raw(`<text ${d.slotAttrs("ghost_latin", spec, { box: d.clipBox([X(0) - (right ? 1000 * s : 0), 0, 1000 * s, yT]) })} x="${f1(X(-20 * s))}" y="${f1(yT - 4 * s)}" font-family="${esc(d.families.num)}" font-size="${f1(330 * s)}" fill="${d.pal.ghost_dark}" text-anchor="${right ? "end" : "start"}" data-role="ghost_dark" data-deco="1">${esc(text)}</text>`);
    }
    if (p.film) film(d, X(1390 * s), yT + 30 * s, X(1390 * s) + (right ? -1 : 1) * 300 * s, yT + 30 * s - 300 * s * T, s);
    d.raw(`<path d="${rp(mirror([[-20 * s, yT], [ax, yT, 52 * s], [cutX(ax, yT, 1000 * s), 1000 * s, 0], [-20 * s, 1000 * s]], W, right))}" fill="${d.pal.acid}" data-role="acid"/>`);
    d.raw(`<path d="${rp(mirror([[cx, yT, 60 * s], [W + 40 * s, yT, 0], [W + 40 * s, cb, 0], [cutX(cx, yT, cb), cb, 56 * s]], W, right))}" fill="${d.pal.white}" data-role="white"/>`);
    // the picture: a rounded card inside the container
    const mx = right ? W - 1760 * s : 960 * s; const my = 352 * s; const mw = 800 * s; const mh = 400 * s;
    d.image("media", mx, my, mw, mh, "picture 1600 x 800", { labelAt: [0.5, 0.5] });
    // caption under the picture
    const tx = mx + 16 * s;
    d.raw(`<rect x="${f1(tx)}" y="${f1(my + mh + 30 * s)}" width="${f1(96 * s)}" height="${f1(28 * s)}" rx="${f1(6 * s)}" fill="${d.pal.acid}" data-role="acid"/>`);
    d.text("tag", tx + 48 * s, my + mh + 50 * s, 16 * s, { role: "ink", family: "head", anchor: "middle", box: [tx + 4 * s, my + mh + 32 * s, 88 * s, 24 * s] });
    const { text: date } = d.value("date");
    if (!/^[\d/.\- ]+$/.test(String(date))) throw invalid(`slot date takes digits and / . - only, got ${JSON.stringify(date)}. Fix: --set date=2026/11/05; put words in the headline`);
    d.text("date", tx + 112 * s, my + mh + 52 * s, 20 * s, { role: "ink", family: "label", box: [tx + 108 * s, my + mh + 30 * s, 200 * s, 28 * s] });
    d.text("headline", tx, my + mh + 92 * s, 22 * s, { role: "ink", family: "head", box: [tx - 2 * s, my + mh + 66 * s, 560 * s, 32 * s] });
    morePill(d, "more_label", mx + mw - 185 * s, my + mh + 48 * s, s);
    // carousel control: a dark capsule track with round arrows and three thumbs (current framed in acid),
    // or six dots (current acid with a black ring)
    const n = Math.round(p.items); const cur = Math.round(p.active);
    if (p.control === "track") {
      const kx = right ? W - 900 * s : 380 * s; const ky = 870 * s; const kw = 520 * s; const kh = 76 * s;
      d.raw(`<rect x="${f1(kx - 5 * s)}" y="${f1(ky - 5 * s)}" width="${f1(kw + 10 * s)}" height="${f1(kh + 10 * s)}" rx="${f1(kh / 2 + 5 * s)}" fill="${d.pal.ring_dark}" data-role="ring_dark"/><rect x="${f1(kx)}" y="${f1(ky)}" width="${f1(kw)}" height="${f1(kh)}" rx="${f1(kh / 2)}" fill="${d.pal.capsule}" data-role="capsule"/>`);
      circleArrow(d, kx + 38 * s, ky + kh / 2, 28 * s, -1, s, true);
      circleArrow(d, kx + kw - 38 * s, ky + kh / 2, 28 * s, 1, s);
      for (let i = 0; i < 3; i += 1) {
        const x = kx + 82 * s + i * 126 * s; const y = ky + 10 * s; const tones = ["acid", "dim", "ghost"];
        const on = i === 0;
        const k = 12 * s; // thumbs lean like the case's skewX(-12): parallelograms, so the check can read them
        const par = (px, py, w, h, r) => rp([[px + k, py, r], [px + w + k, py, r], [px + w - k, py + h, r], [px - k, py + h, r]]);
        d.raw(`<g data-deco="1">${on ? `<path d="${par(x - 4 * s, y - 4 * s, 124 * s, 64 * s, 15 * s)}" fill="${d.pal.acid}"/>` : ""}<path d="${par(x, y, 116 * s, 56 * s, 12 * s)}" fill="${d.pal[on ? "capsule" : tones[i]]}"/><path d="M${f1(x + 38 * s)} ${f1(y + 56 * s)} a${f1(20 * s)} ${f1(20 * s)} 0 0 1 ${f1(40 * s)} 0 z" fill="${d.pal[on ? "acid" : "capsule"]}"/></g>`);
      }
    } else {
      for (let i = 1; i <= n; i += 1) {
        const x = mx + 27 * s + (i - 1) * 48 * s; const y = 905 * s;
        d.raw(`<circle data-deco="1" cx="${f1(x)}" cy="${f1(y)}" r="${f1(11 * s)}" fill="${d.pal[i === cur ? "acid" : "capsule"]}" stroke="${d.pal[i === cur ? "ink" : "ring_dark"]}" stroke-width="${f1(3 * s)}"/>`);
      }
    }
    titleBlock(d, right ? W - 290 * s : 290 * s, 338 * s, s, { right });
    d.zone("slab", "safe", [right ? W - 760 * s : 0, yT, 760 * s, 700 * s], { slots: ["title_cjk", "title_latin", "number"] });
  },

  // ---- tilted sticker CTA: 800 x 400 ---------------------------------------------------------
  "banner.tape-sticker-cta"(d) {
    const { W, H, p } = d; const s = W / 800;
    d.rect(0, 0, W, H, "grey");
    stripeBand(d, [[cutX(560 * s, 230 * s, 230 * s), 230 * s], [W + 10 * s, 230 * s], [W + 10 * s, H + 10 * s], [cutX(560 * s, 230 * s, H + 10 * s), H + 10 * s]], s);
    if (p.film) film(d, 640 * s, H + 30 * s, 820 * s, H + 30 * s - 180 * s * T, s);
    const sx = 90 * s; const sy = 60 * s; const sw = 560 * s; const sh = 250 * s;
    const quad = [[sx + 30 * s, sy + 34 * s], [sx + sw - 20 * s, sy + 8 * s], [sx + sw, sy + sh - 50 * s], [sx + 52 * s, sy + sh]];
    const ccx = sx + sw / 2; const ccy = sy + sh / 2; const rot = p.tilt;
    d.raw(`<g transform="rotate(${f1(rot)} ${f1(ccx)} ${f1(ccy)})">`);
    d.raw(`<path d="${rp(quad, 36 * s)}" fill="${d.pal.ink}" transform="translate(${f1(9 * s)} ${f1(11 * s)})" data-role="ink"/>`);
    d.raw(`<path d="${rp(quad, 36 * s)}" fill="${d.pal.white}" stroke="${d.pal.ink}" stroke-width="${f1(12 * s)}" data-role="white"/>`);
    const size = 110 * s; const { text: cta } = d.value("cta"); const tw = [...String(cta)].length * size;
    d.text("cta", ccx, sy + 146 * s, size, { role: "ink", family: "head", anchor: "middle", tracking: 20, box: rbox([ccx - tw / 2 - 6 * s, sy + 146 * s - size * 0.92, tw + 12 * s, size * 1.1], rot, [ccx, ccy], 4 * s) });
    d.raw(pseudoGlyphs(sx + 70 * s, sy + 172 * s, 10, 34 * s, d.pal.ink));
    const fx = sx + sw - 120 * s; const fy = sy - 14 * s;
    d.raw(`<path d="${rp([[fx, fy + 4 * s], [fx + 112 * s, fy - 4 * s], [fx + 110 * s, fy + 44 * s], [fx + 4 * s, fy + 50 * s]], 10 * s)}" fill="${d.pal.acid}" stroke="${d.pal.ink}" stroke-width="${f1(5 * s)}" data-role="acid"/>`);
    d.text("flash", fx + 57 * s, fy + 32 * s, 24 * s, { role: "ink", family: "head", anchor: "middle", box: rbox([fx + 6 * s, fy + 4 * s, 102 * s, 36 * s], rot, [ccx, ccy], 3 * s) });
    d.raw("</g>");
    d.text("platforms", 60 * s, H - 34 * s, 20 * s, { role: "ink", family: "body", box: [56 * s, H - 58 * s, 420 * s, 32 * s] });
  },

  // ---- first screen as layers: 1920 x 1080 ----------------------------------------------------
  // The scene and the character are composited layers (materials composite: <WxH>-ground.png is
  // the text ground, <WxH>-upper.png the character, fx and foreground); the type is live and last.
  "kv.tape-hero"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "grey");
    if (p.stripes) stripeBand(d, [[1640 * s, 66 * s], [W + 10 * s, 66 * s], [W + 10 * s, H + 10 * s], [1640 * s, H + 10 * s]], s);
    const filled = (name) => String(d.values[name] || "").startsWith("data:image/");
    if (filled("scene")) d.image("scene", 0, 0, W, H);
    else d.image("scene", 200 * s, 66 * s, 1440 * s, 1014 * s, "ground layer", { labelAt: [0.8, 0.6] });
    if (filled("figure")) d.image("figure", 0, 0, W, H);
    else d.image("figure", 480 * s, 110 * s, 440 * s, 880 * s, "char layer", { labelAt: [0.5, 0.5] });
    // brand sticker: black rounded plate, cassette mark, CJK name, Latin name
    const bx = 236 * s; const by = 96 * s; const bw = 236 * s; const bh = 212 * s;
    d.raw(`<path d="${rp([[bx + 4 * s, by + 6 * s], [bx + bw, by], [bx + bw - 2 * s, by + bh], [bx, by + bh - 2 * s]], 26 * s)}" fill="${d.pal.ink}" stroke="${d.pal.white}" stroke-width="${f1(6 * s)}" data-role="ink"/>`);
    d.raw(`<g data-deco="1">${cassette(bx + 58 * s, by + 22 * s, 120 * s, 64 * s, d.pal.white, d.pal.ink, d.pal.acid)}</g>`);
    d.text("brand_cjk", bx + bw / 2, by + 150 * s, 50 * s, { role: "white", family: "head", anchor: "middle", box: [bx + 10 * s, by + 100 * s, bw - 20 * s, 62 * s] });
    d.text("brand_latin", bx + bw / 2, by + 192 * s, 26 * s, { role: "acid", family: "num", anchor: "middle", box: [bx + 10 * s, by + 166 * s, bw - 20 * s, 36 * s] });
    // download sticker: white plate with a heavy outline and an offset ink plate, acid flash tab
    const cx = 1236 * s; const cy = 150 * s; const cw = 380 * s; const ch = 190 * s;
    const quad = [[cx + 10 * s, cy + 12 * s], [cx + cw - 8 * s, cy], [cx + cw, cy + ch - 14 * s], [cx, cy + ch]];
    d.raw(`<path d="${rp(quad, 30 * s)}" fill="${d.pal.ink}" transform="translate(${f1(9 * s)} ${f1(11 * s)})" data-role="ink"/>`);
    d.raw(`<path d="${rp(quad, 30 * s)}" fill="${d.pal.white}" stroke="${d.pal.ink}" stroke-width="${f1(10 * s)}" data-role="white"/>`);
    d.text("cta", cx + cw / 2, cy + 116 * s, 82 * s, { role: "ink", family: "head", anchor: "middle", box: [cx + 16 * s, cy + 36 * s, cw - 32 * s, 96 * s] });
    d.raw(pseudoGlyphs(cx + 52 * s, cy + 136 * s, 9, 24 * s, d.pal.ink));
    const fx = cx + cw - 104 * s; const fy = cy - 18 * s;
    d.raw(`<path d="${rp([[fx, fy + 4 * s], [fx + 100 * s, fy - 2 * s], [fx + 98 * s, fy + 40 * s], [fx + 3 * s, fy + 44 * s]], 9 * s)}" fill="${d.pal.acid}" stroke="${d.pal.ink}" stroke-width="${f1(4 * s)}" data-role="acid"/>`);
    d.text("flash", fx + 50 * s, fy + 30 * s, 22 * s, { role: "ink", family: "head", anchor: "middle", box: [fx + 6 * s, fy + 4 * s, 88 * s, 32 * s] });
    d.text("platforms", 440 * s, 1052 * s, 20 * s, { role: "ink", family: "body", box: [436 * s, 1026 * s, 600 * s, 36 * s] });
  },
};

module.exports = { LAYOUTS, CUT, rp };
