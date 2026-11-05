"use strict";

// Layouts of the xerox-flyer style pack (styles/xerox-flyer/style.json): a 1970s-80s punk
// photocopy-flyer grammar (one fluorescent ink, black-and-white copier grain, ransom-note cut
// letters, spray-stencil numerals) carried into esports broadcast graphics: a scorebug that
// reflows at half size, a ban/pick board and a tour-flyer schedule poster. Geometry in the case's
// own pixel units scaled to the canvas, from the esports-broadcast case's v2 final (check 0).
// Stencil numerals and codes are the template bank's lettering with two spray bridges; the copier
// crowd comes in through the `xerox` collage slot, and drawn toner specks stand in until it does.

const lettering = require("./lettering.cjs");
const measure = require("./measure.cjs");
const { f1, rbox, tilt, rng, invalid } = require("./layout-kit.cjs");

const STENCIL = { stencil: 0, width: 0.52, stroke: 0.21, chamfer: 0.05, chamfer_mode: "all", tracking: 30, slant: -0.1 };
const stencilWidth = (text, h) => lettering.setText(String(text), 0, 0, h, STENCIL).width;

// Spray-stencil lettering: code-drawn caps plus two bridges in the ground colour across the word.
function stencil(d, name, x, y, h, o = {}) {
  const { text } = d.value(name);
  const w = stencilWidth(text, h);
  const box = o.box || [x - 0.12 * h, y - 0.16 * h, w + 0.3 * h, 1.32 * h];
  d.lettering(name, x, y, h, { ...STENCIL, role: o.role || "paper", box, trim: false });
  if (o.bridges !== false) {
    const c = `${f1(x + w / 2)} ${f1(y + h / 2)}`;
    for (const t of [0.3, 0.68]) d.raw(`<rect data-deco="1" x="${f1(x - 0.2 * h)}" y="${f1(y + t * h)}" width="${f1(w + 0.4 * h)}" height="${f1(0.045 * h)}" fill="${d.pal[o.ground || "black"]}" transform="rotate(-4 ${c})"/>`);
  }
  return w;
}

// Ransom note: each scrap is its own slot, one character on its own paper with its own font and tilt.
const LOOKS = [["black", "paper", "sans"], ["paper", "black", "serif"], ["pink", "black", "sans"], ["paper", "black", "num"], ["black", "pink", "serif"]];
function ransom(d, prefix, count, x, y, size, seed) {
  const r = rng(seed);
  let cx = x;
  for (let i = 0; i < count; i += 1) {
    const name = `${prefix}_${i}`;
    const { text } = d.value(name);
    if (!String(text).trim()) { cx += size * 0.3; continue; }
    let [bg, fg, family] = LOOKS[Math.floor(r() * LOOKS.length)];
    if (family === "num" && /[^\x00-\x7f]/.test(text)) family = "sans";
    const sz = size * (0.86 + r() * 0.3);
    const deg = (r() - 0.5) * 12;
    const dy = (r() - 0.5) * size * 0.16;
    const w = Math.max(measure.textWidth(String(text), sz, 0, { serif: family === "serif", weight: 900 }), sz * 0.5);
    const box = [cx, y + dy - sz * 0.06, w + sz * 0.2, sz * 1.12];
    const c = [box[0] + box[2] / 2, box[1] + box[3] / 2];
    tilt(d, deg, ...c);
    d.rect(...box, bg);
    d.text(name, cx + sz * 0.1, y + dy + sz * 0.88, sz, { role: fg, family, weight: 900, box: rbox(box, deg, c, sz * 0.2) });
    d.raw("</g>");
    cx += box[2] + size * 0.06;
  }
  return cx - x;
}

// Hero glyphs: twenty geometric marks, each cut by two spray bridges (the case's stencil icon set).
const HERO = [
  "<circle cx=\"50\" cy=\"40\" r=\"22\"/><rect x=\"36\" y=\"66\" width=\"28\" height=\"18\"/>", "<path d=\"M8 62 L50 20 L92 62 L50 46Z\"/><path d=\"M40 50 L50 86 L60 50Z\"/>",
  "<path d=\"M16 16H84V84H16Z M34 34V66H66V34Z\" fill-rule=\"evenodd\"/>", "<path d=\"M10 74 A40 40 0 0 1 90 74 H78 A28 28 0 0 0 22 74Z\"/>",
  "<path d=\"M50 10 L90 50 L50 90 L10 50Z M50 24 L76 50 L50 76 L24 50Z\" fill-rule=\"evenodd\"/>", "<path d=\"M50 6 L64 50 L50 94 L36 50Z\"/><rect x=\"16\" y=\"46\" width=\"68\" height=\"8\"/>",
  "<path d=\"M8 30 Q29 10 50 30 T92 30 V42 Q71 22 50 42 T8 42Z M8 58 Q29 38 50 58 T92 58 V70 Q71 50 50 70 T8 70Z\"/>", "<circle cx=\"42\" cy=\"60\" r=\"28\"/><rect x=\"62\" y=\"16\" width=\"8\" height=\"26\" transform=\"rotate(40 66 29)\"/>",
  "<path d=\"M50 8 L92 86 H8Z M50 38 L68 72 H32Z\" fill-rule=\"evenodd\"/>", "<path d=\"M66 10 A40 40 0 1 0 90 66 A32 32 0 1 1 66 10Z\"/>",
  "<path d=\"M6 28 L50 58 L94 28 L50 86Z\"/>", "<path d=\"M50 8 Q80 44 68 72 Q60 92 50 92 Q40 92 32 72 Q22 46 50 8Z\"/>",
  "<rect x=\"45\" y=\"12\" width=\"10\" height=\"74\"/><rect x=\"26\" y=\"28\" width=\"48\" height=\"9\"/><path d=\"M14 56 H24 Q28 80 50 80 Q72 80 76 56 H86 Q82 90 50 90 Q18 90 14 56Z\"/>", "<path d=\"M10 56 Q38 18 90 28 Q62 40 58 62 Q50 84 18 78Z\"/>",
  "<rect x=\"16\" y=\"28\" width=\"18\" height=\"60\"/><rect x=\"41\" y=\"28\" width=\"18\" height=\"60\"/><rect x=\"66\" y=\"28\" width=\"18\" height=\"60\"/><rect x=\"24\" y=\"12\" width=\"52\" height=\"8\"/>", "<path d=\"M50 6 L68 16 V36 L50 46 L32 36 V16Z M30 42 L48 52 V72 L30 82 L12 72 V52Z M70 42 L88 52 V72 L70 82 L52 72 V52Z\"/>",
  "<path d=\"M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10Z M50 20 A30 30 0 1 1 50 80 A30 30 0 1 1 50 20Z\" fill-rule=\"evenodd\"/><path d=\"M50 16 L59 50 L50 84 L41 50Z\"/>", "<circle cx=\"30\" cy=\"66\" r=\"18\"/><circle cx=\"58\" cy=\"56\" r=\"24\"/><circle cx=\"76\" cy=\"78\" r=\"12\"/><circle cx=\"40\" cy=\"32\" r=\"13\"/>",
  "<path d=\"M28 90 H72 L64 52 H36Z M50 8 L64 40 H36Z\"/>", "<path d=\"M8 44 H92 V56 H8Z M14 40 A36 22 0 0 1 86 40 H74 A26 14 0 0 0 26 40Z M14 60 H26 A26 14 0 0 0 74 60 H86 A36 22 0 0 1 14 60Z\"/>",
];
function heroGlyph(d, i, x, y, size, colour, ground) {
  const k = size / 100;
  d.raw(`<g data-deco="1" transform="translate(${f1(x)} ${f1(y)}) scale(${k.toFixed(4)})"><g fill="${d.pal[colour]}">${HERO[i % HERO.length]}</g><g fill="${d.pal[ground]}"><rect x="0" y="31" width="100" height="5" transform="rotate(-12 50 50)"/><rect x="0" y="64" width="100" height="5" transform="rotate(-12 50 50)"/></g></g>`);
}
function heroSlot(d, name, i, x, y, size, colour, ground) {
  if (d.values[name]) { d.image(name, x, y, size, size); return; }
  heroGlyph(d, i, x, y, size, colour, ground);
}

// Copier toner on the pink ground: specks and streaks that stand in for a processed photograph.
function toner(d, x, y, w, h, seed, density) {
  const r = rng(seed); const parts = [];
  const n = Math.round(w * h * density / 4000);
  for (let i = 0; i < n; i += 1) {
    const px = x + r() * w; const py = y + r() * h; const s = (2 + r() ** 3 * 26) * d.k;
    const a = r() * Math.PI;
    parts.push(`M${f1(px)} ${f1(py)}l${f1(Math.cos(a) * s)} ${f1(Math.sin(a) * s * 0.4)}l${f1(-Math.sin(a) * s * 0.5)} ${f1(Math.cos(a) * s * 0.5)}l${f1(-Math.cos(a) * s * 0.8)} ${f1(-Math.sin(a) * s * 0.2)}Z`);
  }
  for (let i = 0; i < 6; i += 1) { const py = y + r() * h; parts.push(`M${f1(x)} ${f1(py)}h${f1(w)}v${f1((1 + r() * 3) * d.k)}h${f1(-w)}Z`); }
  d.raw(`<path data-deco="1" d="${parts.join("")}" fill="${d.pal.black}"/>`);
}

const LAYOUTS = {
  "broadcast.scorebug"(d) {
    const { W, H, p } = d; const s = W / 1920;
    const half = p.scale === "half"; const f = (half ? 0.5 : 1) * s;
    const px = (n) => Math.max(12 * s, n * f);
    if (p.backdrop) d.image("feed", 0, 0, W, H, "gameplay frame (the bug sits on it)");
    const hh = 84 * f;
    const side = (code, name, score, maps, inkRole) => {
      const codeH = 40 * f; const codeW = stencilWidth(d.value(code).text, codeH);
      const nameS = px(28); const nameW = measure.textWidth(String(d.value(name).text), nameS, 0, { weight: 900 });
      const plateW = 14 * f + codeW + 12 * f + nameW + 12 * f + 12 * f + 14 * f;
      return { code, name, score, maps, inkRole, codeH, codeW, nameS, nameW, plateW, width: plateW + 108 * f };
    };
    const A = side("team_a_code", "team_a_name", "score_a", p.maps_a, "pink");
    const B = side("team_b_code", "team_b_name", "score_b", p.maps_b, "paper");
    const centreW = 230 * f;
    const total = A.width + centreW + B.width;
    const x0 = (W - total) / 2; const y0 = (half ? 40 : 74) * s;
    const c = [W / 2, y0 + hh / 2]; const deg = -1.2;
    const rb = (b) => rbox(b, deg, c, 2 * s);
    tilt(d, deg, ...c);
    d.rect(x0 + 6 * f, y0 + 6 * f, total, hh, "black");
    const drawSide = (S, x, right) => {
      const plateX = right ? x + 108 * f : x; const scoreX = right ? x : x + S.plateW;
      d.rect(plateX, y0, S.plateW, hh, "black");
      d.rect(scoreX, y0, 108 * f, hh, S.inkRole);
      const order = right ? ["pips", "name", "code"] : ["code", "name", "pips"];
      let cx = plateX + 14 * f;
      for (const part of order) {
        if (part === "code") { stencil(d, S.code, cx, y0 + (hh - S.codeH) / 2, S.codeH, { role: S.inkRole, bridges: !half, box: rb([cx - 4 * f, y0 + 6 * f, S.codeW + 8 * f, hh - 12 * f]) }); cx += S.codeW + 12 * f; }
        if (part === "name") { d.text(S.name, cx, y0 + hh / 2 + S.nameS * 0.36, S.nameS, { role: "paper", family: "sans", weight: 900, box: rb([cx - 2 * f, y0 + 6 * f, S.nameW + 6 * f, hh - 12 * f]) }); cx += S.nameW + 12 * f; }
        if (part === "pips") { for (let i = 0; i < 3; i += 1) { const py = y0 + hh / 2 - 21 * f + i * 15 * f; if (i < S.maps) d.rect(cx, py, 12 * f, 12 * f, S.inkRole, "data-deco=\"1\""); else d.raw(`<rect data-deco="1" x="${f1(cx + 1.25 * f)}" y="${f1(py + 1.25 * f)}" width="${f1(9.5 * f)}" height="${f1(9.5 * f)}" fill="none" stroke="${d.pal.grey}" stroke-width="${f1(Math.max(1.5, 2.5 * f))}"/>`); } cx += 12 * f + 12 * f; }
      }
      const sh = 60 * f; const sw = stencilWidth(d.value(S.score).text, sh);
      stencil(d, S.score, scoreX + (108 * f - sw) / 2, y0 + (hh - sh) / 2, sh, { role: "black", ground: S.inkRole, bridges: !half, box: rb([scoreX + 2 * f, y0 + 2 * f, 104 * f, hh - 4 * f]) });
    };
    drawSide(A, x0, false);
    const cx = x0 + A.width;
    d.rect(cx, y0, centreW, hh, "paper");
    if (p.centre_frame === "dashed") d.raw(`<rect data-deco="1" x="${f1(cx + 1.5 * f)}" y="${f1(y0 + 1.5 * f)}" width="${f1(centreW - 3 * f)}" height="${f1(hh - 3 * f)}" fill="none" stroke="${d.pal.black}" stroke-width="${f1(3 * f)}" stroke-dasharray="${f1(8 * f)} ${f1(5 * f)}"/>`);
    else { d.rect(cx, y0, 4 * f, hh, "black"); d.rect(cx + centreW - 4 * f, y0, 4 * f, hh, "black"); }
    const ls = px(16); const ms = px(24); const cs = px(30);
    d.text("centre_label", cx + centreW / 2, y0 + 12 * f + ls * 0.88, ls, { role: "black", family: "num", tracking: 120, anchor: "middle", box: rb([cx + 6 * f, y0 + 6 * f, centreW - 12 * f, ls * 1.3]) });
    const row = y0 + hh - 14 * f;
    d.text("centre_title", cx + centreW / 2 - 6 * f, row, ms, { role: "black", family: "sans", weight: 900, anchor: "end", box: rb([cx + 6 * f, row - ms * 1.05, centreW / 2 - 12 * f, ms * 1.3]) });
    d.text("clock", cx + centreW / 2 + 4 * f, row, cs, { role: "black", family: "num", box: rb([cx + centreW / 2, row - cs * 0.95, centreW / 2 - 6 * f, cs * 1.15]) });
    drawSide(B, cx + centreW, true);
    if (p.sticker) ransom(d, "sticker", 3, x0 - 10 * f, y0 - 58 * f, Math.max(34 * f, 18 * s), 5);
    d.raw("</g>");
  },

  "broadcast.bp-board"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "pink");
    // header: team codes on black plates, the stencil timer, the round line
    for (const [side, right] of [["a", false], ["b", true]]) {
      const ch = 92 * s; const cw = stencilWidth(d.value(`team_${side}_code`).text, ch);
      const plateW = cw + 40 * s; const x = right ? W - 40 * s - plateW : 40 * s;
      d.rect(x, 28 * s, plateW, 132 * s, "black");
      stencil(d, `team_${side}_code`, x + 20 * s, 28 * s + 20 * s, ch, { role: side === "a" ? "pink" : "paper", box: [x + 4 * s, 34 * s, plateW - 8 * s, 120 * s] });
      const tx = right ? x - 18 * s : x + plateW + 18 * s; const anchor = right ? "end" : "start";
      d.text(`team_${side}_name`, tx, 98 * s, 34 * s, { role: "black", family: "sans", weight: 900, anchor, box: [right ? tx - 200 * s : tx, 62 * s, 200 * s, 44 * s] });
      d.text(`team_${side}_side`, tx, 126 * s, 18 * s, { role: "black", family: "sans", weight: 700, anchor, box: [right ? tx - 200 * s : tx, 108 * s, 200 * s, 26 * s] });
    }
    const th = 150 * s; const tw = stencilWidth(d.value("timer").text, th);
    stencil(d, "timer", W / 2 - tw / 2, 14 * s, th, { role: "black", ground: "pink", box: [W / 2 - 260 * s, 0, 520 * s, 186 * s] });
    d.text("round_line", W / 2, 214 * s, 20 * s, { role: "black", family: "sans", weight: 700, anchor: "middle", box: [W / 2 - 340 * s, 192 * s, 680 * s, 30 * s] });
    // bans: three per team; done ones dark with a spray cross in the team ink, the pending one dashed
    for (const [side, right] of [["a", false], ["b", true]]) {
      const done = p[`bans_${side}`];
      for (let i = 0; i < 3; i += 1) {
        const x = right ? W - 40 * s - 118 * s - (2 - i) * 130 * s : (40 + i * 130) * s; const y = 236 * s;
        if (i < done) {
          d.rect(x, y, 118 * s, 96 * s, "plate_dark");
          heroSlot(d, `ban_${side}_${i}_icon`, (i * 7 + (right ? 3 : 0)) % 20, x + 34 * s, y + 8 * s, 50 * s, "grey", "plate_dark");
          d.text(`ban_${side}_${i}`, x + 59 * s, y + 82 * s, 16 * s, { role: "paper", family: "sans", weight: 700, anchor: "middle", box: [x + 4 * s, y + 64 * s, 110 * s, 26 * s] });
          d.raw(`<path data-deco="1" d="M${f1(x + 8 * s)} ${f1(y + 8 * s)}L${f1(x + 110 * s)} ${f1(y + 88 * s)}M${f1(x + 110 * s)} ${f1(y + 8 * s)}L${f1(x + 8 * s)} ${f1(y + 88 * s)}" stroke="${d.pal[side === "a" ? "pink" : "paper"]}" stroke-width="${f1(10 * s)}" stroke-linecap="square" opacity="0.92"/>`);
        } else {
          d.raw(`<rect data-deco="1" x="${f1(x + 1.5 * s)}" y="${f1(y + 1.5 * s)}" width="${f1(115 * s)}" height="${f1(93 * s)}" fill="none" stroke="${d.pal.black}" stroke-width="${f1(3 * s)}" stroke-dasharray="${f1(8 * s)} ${f1(5 * s)}"/>`);
          d.text("ban_waiting", x + 59 * s, y + 54 * s, 17 * s, { role: "black", family: "sans", weight: 700, anchor: "middle", box: [x + 4 * s, y + 34 * s, 110 * s, 28 * s] });
        }
      }
    }
    // picks: five rows a side; picked rows are tilted paper plates, the rest dashed
    const rots = [-1.5, 1, -0.5, 1.5, -1];
    for (const [side, right] of [["a", false], ["b", true]]) {
      const picked = p[`picks_${side}`];
      for (let i = 0; i < 5; i += 1) {
        const x = right ? W - 40 * s - 440 * s : 40 * s; const y = (360 + i * 128) * s; const w = 440 * s; const h = 108 * s;
        const deg = rots[i] * (right ? -1 : 1); const c = [x + w / 2, y + h / 2]; const rb = (b) => rbox(b, deg, c, 2 * s);
        const at = (dx, wd) => (right ? x + w - dx - wd : x + dx);
        if (i < picked) {
          tilt(d, deg, ...c);
          d.rect(x + 6 * s, y + 6 * s, w, h, "black");
          d.rect(x, y, w, h, "paper");
          d.rect(at(14 * s, 84 * s), y + 12 * s, 84 * s, 84 * s, "black");
          heroSlot(d, `pick_${side}_${i}_icon`, (i * 3 + (right ? 11 : 1)) % 20, at(14 * s, 84 * s) + 10 * s, y + 22 * s, 64 * s, side === "a" ? "pink" : "paper", "black");
          d.text(`pick_${side}_${i}_hero`, right ? x + w - 116 * s : x + 116 * s, y + 52 * s, 34 * s, { role: "black", family: "sans", weight: 900, anchor: right ? "end" : "start", box: rb([at(116 * s, 300 * s), y + 12 * s, 300 * s, 46 * s]) });
          d.text(`pick_${side}_${i}_player`, right ? x + w - 116 * s : x + 116 * s, y + 88 * s, 24 * s, { role: "black", family: "num", anchor: right ? "end" : "start", box: rb([at(116 * s, 170 * s), y + 64 * s, 170 * s, 32 * s]) });
          d.text(`pick_${side}_${i}_role`, right ? x + w - 296 * s : x + 296 * s, y + 88 * s, 17 * s, { role: "black", family: "sans", weight: 500, anchor: right ? "end" : "start", box: rb([at(296 * s, 120 * s), y + 66 * s, 120 * s, 28 * s]) });
          d.raw("</g>");
        } else {
          const next = i === picked;
          d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="none" stroke="${d.pal.black}" stroke-width="${f1((next ? 5 : 3) * s)}" stroke-dasharray="${f1(10 * s)} ${f1(6 * s)}"/>`);
          const label = next ? "next_label" : "wait_label";
          const ls = (next ? 26 : 20) * s;
          d.text(label, right ? x + w - 20 * s : x + 20 * s, y + 64 * s, ls, { role: "black", family: "sans", weight: 900, anchor: right ? "end" : "start", box: [at(20 * s, 100 * s), y + 30 * s, 100 * s, 46 * s] });
          d.text(`pick_${side}_${i}_player`, right ? x + w - 130 * s : x + 130 * s, y + 64 * s, 24 * s, { role: "black", family: "num", anchor: right ? "end" : "start", box: [at(130 * s, 160 * s), y + 38 * s, 160 * s, 34 * s] });
          d.text(`pick_${side}_${i}_role`, right ? x + w - 300 * s : x + 300 * s, y + 64 * s, 17 * s, { role: "black", family: "sans", weight: 500, anchor: right ? "end" : "start", box: [at(300 * s, 120 * s), y + 42 * s, 120 * s, 28 * s] });
        }
      }
    }
    // the hero pool: 5 x 4 tiles; state per tile
    const PX = 548 * s; const PY = 358 * s; const TW = 152 * s; const TH = 124 * s; const G = 14 * s;
    let hover = null;
    for (let i = 0; i < 20; i += 1) {
      const x = PX + (i % 5) * (TW + G); const y = PY + Math.floor(i / 5) * (TH + G);
      const state = p[`tile_${i}`];
      if (state === "hover") { hover = [i, x, y]; continue; }
      const dark = state !== "free";
      d.rect(x, y, TW, TH, dark ? "plate_dark" : "paper");
      if (state === "picked_a" || state === "picked_b") d.rect(x, y + TH - 8 * s, TW, 8 * s, state === "picked_a" ? "pink" : "paper");
      heroSlot(d, `hero_${i}_icon`, i, x + TW / 2 - 25 * s, y + 18 * s, 50 * s, dark ? "grey" : "black", dark ? "plate_dark" : "paper");
      d.text(`hero_${i}`, x + TW / 2, y + (state === "banned" ? 90 : 98) * s, 18 * s, { role: dark ? "paper" : "black", family: "sans", weight: dark ? 700 : 900, anchor: "middle", box: [x + 4 * s, y + (state === "banned" ? 70 : 78) * s, TW - 8 * s, 28 * s] });
      if (state === "banned") d.text("banned_tag", x + TW / 2, y + 114 * s, 14 * s, { role: "paper", family: "sans", weight: 700, anchor: "middle", box: [x + 4 * s, y + 100 * s, TW - 8 * s, 20 * s] });
    }
    if (hover) {
      const [i, x, y] = hover; const c = [x + TW / 2, y + TH / 2];
      tilt(d, -3, ...c);
      d.rect(x - 14 * s, y - 14 * s, TW + 28 * s, TH + 28 * s, "black");
      d.rect(x - 8 * s, y - 8 * s, TW + 16 * s, TH + 16 * s, "pink");
      heroSlot(d, `hero_${i}_icon`, i, x + TW / 2 - 28 * s, y + 6 * s, 56 * s, "black", "pink");
      d.text(`hero_${i}`, x + TW / 2, y + 100 * s, 20 * s, { role: "black", family: "sans", weight: 900, anchor: "middle", box: rbox([x, y + 78 * s, TW, 30 * s], -3, c, 2 * s) });
      d.raw("</g>");
      ransom(d, "hover_note", 4, x - 20 * s, y - 52 * s, 22 * s, 4);
    }
    // ban/pick order track
    const T0 = 548 * s; const T1 = 1372 * s; const TY = 990 * s;
    const tc = [(T0 + T1) / 2, TY + 12 * s];
    tilt(d, -1, ...tc);
    d.rect(T0 - 30 * s, TY - 30 * s, T1 - T0 + 60 * s, 84 * s, "paper");
    const ORDER = [["a", 0], ["b", 0], ["a", 0], ["b", 0], ["a", 1], ["b", 1], ["b", 1], ["a", 1], ["a", 1], ["b", 1], ["b", 0], ["a", 0], ["b", 1], ["a", 1], ["a", 1], ["b", 1]];
    ORDER.forEach(([side, pick], i) => {
      const x = T0 + ((T1 - T0) * i) / 15; const role = side === "a" ? "pink" : "black";
      if (i < p.step) d.rect(x - 12 * s, TY - 18 * s, 24 * s, 24 * s, role, "data-deco=\"1\"");
      else d.raw(`<rect data-deco="1" x="${f1(x - 10 * s)}" y="${f1(TY - 16 * s)}" width="${f1(20 * s)}" height="${f1(20 * s)}" fill="none" stroke="${d.pal[role]}" stroke-width="${f1(4 * s)}"/>`);
      if (i === p.step) d.raw(`<rect data-deco="1" x="${f1(x - 18 * s)}" y="${f1(TY - 24 * s)}" width="${f1(36 * s)}" height="${f1(36 * s)}" fill="none" stroke="${d.pal.black}" stroke-width="${f1(5 * s)}"/>`);
      d.text(pick ? "pick_word" : "ban_word", x, TY + 30 * s, 17 * s, { role: "black", family: "sans", weight: i === p.step ? 900 : 700, anchor: "middle", box: rbox([x - 16 * s, TY + 12 * s, 32 * s, 24 * s], -1, tc, 2 * s) });
    });
    d.raw("</g>");
    d.text("order_note", T0, TY - 52 * s, 18 * s, { role: "black", family: "sans", weight: 700, box: [T0 - 4 * s, TY - 72 * s, T1 - T0, 28 * s] });
  },

  "poster.tour-flyer"(d) {
    const { W, H, p } = d; const s = W / 1080;
    d.rect(0, 0, W, H, "pink");
    d.image("xerox", -120 * s, 150 * s, 1320 * s, 0, "");
    if (!d.values.xerox && p.toner) toner(d, 0, 170 * s, W, 640 * s, 31, p.toner_density);
    d.rect(0, 0, W, 150 * s, "black");
    ransom(d, "title", p.title_scraps, 44 * s, 30 * s, 66 * s, 31);
    d.text("subtitle", 48 * s, 134 * s, 20 * s, { role: "paper", family: "num", tracking: 300, box: [44 * s, 112 * s, 990 * s, 30 * s] });
    // the final's date, sprayed big and tilted, its label pasted over the corner
    const dh = 250 * s; const dw = stencilWidth(d.value("date").text, dh);
    const dc = [30 * s + dw / 2, 330 * s + dh / 2];
    tilt(d, -6, ...dc);
    stencil(d, "date", 30 * s, 330 * s, dh, { role: "paper", ground: "black", box: rbox([0, 290 * s, dw + 90 * s, dh * 1.32], -6, dc) });
    d.raw("</g>");
    const lc = [300 * s, 274 * s];
    tilt(d, -6, ...lc);
    d.rect(60 * s, 250 * s, 480 * s, 56 * s, "paper");
    d.text("date_label", 76 * s, 290 * s, 34 * s, { role: "black", family: "sans", weight: 900, box: rbox([70 * s, 254 * s, 460 * s, 48 * s], -6, lc, 2 * s) });
    d.raw("</g>");
    // the match-up band
    const mc = [520 * s, 690 * s];
    tilt(d, -2, ...mc);
    d.rect(60 * s, 650 * s, 920 * s, 98 * s, "black");
    const aw = stencil(d, "team_a", 80 * s, 664 * s, 70 * s, { role: "pink", box: rbox([70 * s, 650 * s, stencilWidth(d.value("team_a").text, 70 * s) + 24 * s, 98 * s], -2, mc) });
    d.text("versus", 80 * s + aw + 26 * s, 714 * s, 40 * s, { role: "paper", family: "sans", weight: 900, box: rbox([80 * s + aw + 20 * s, 670 * s, 56 * s, 60 * s], -2, mc, 2 * s) });
    const bx = 80 * s + aw + 96 * s;
    const bw = stencil(d, "team_b", bx, 664 * s, 70 * s, { role: "paper", box: rbox([bx - 10 * s, 650 * s, stencilWidth(d.value("team_b").text, 70 * s) + 24 * s, 98 * s], -2, mc) });
    const nx = bx + bw + 28 * s;
    d.text("matchup", nx, 692 * s, 30 * s, { role: "paper", family: "sans", weight: 900, box: rbox([nx - 4 * s, 660 * s, 960 * s - nx + 60 * s, 40 * s], -2, mc, 2 * s) });
    d.text("venue", nx, 728 * s, 20 * s, { role: "paper", family: "sans", weight: 500, box: rbox([nx - 4 * s, 708 * s, 960 * s - nx + 60 * s, 28 * s], -2, mc, 2 * s) });
    d.raw("</g>");
    // the tour schedule: one line per date
    const sx = 40 * s; const sy = 806 * s; const sw = 1000 * s; const rows = p.rows;
    const sh = (70 + rows * 52 + 50) * s; const sc = [sx + sw / 2, sy + sh / 2];
    tilt(d, 1, ...sc);
    d.rect(sx, sy, sw, sh, "paper");
    const rb = (b) => rbox(b, 1, sc, 2 * s);
    d.text("schedule_head", sx + 24 * s, sy + 42 * s, 22 * s, { role: "black", family: "sans", weight: 900, box: rb([sx + 20 * s, sy + 18 * s, 600 * s, 32 * s]) });
    d.text("schedule_count", sx + sw - 24 * s, sy + 42 * s, 22 * s, { role: "black", family: "sans", weight: 900, anchor: "end", box: rb([sx + sw - 340 * s, sy + 18 * s, 320 * s, 32 * s]) });
    d.rect(sx + 24 * s, sy + 56 * s, sw - 48 * s, 4 * s, "black");
    for (let i = 0; i < rows; i += 1) {
      const by = sy + (70 + i * 52) * s; const base = by + 38 * s;
      d.text(`row_${i}_date`, sx + 24 * s, base, 32 * s, { role: "black", family: "num", box: rb([sx + 20 * s, by + 6 * s, 100 * s, 40 * s]) });
      d.text(`row_${i}_day`, sx + 132 * s, base, 20 * s, { role: "black", family: "num", box: rb([sx + 128 * s, by + 16 * s, 56 * s, 28 * s]) });
      d.text(`row_${i}_stage`, sx + 196 * s, base, 20 * s, { role: "black", family: "sans", weight: 700, box: rb([sx + 192 * s, by + 16 * s, 220 * s, 28 * s]) });
      const win = p[`win_${i}`];
      for (const [slot, x, side] of [[`row_${i}_a`, 430, "a"], [`row_${i}_score`, 520, null], [`row_${i}_b`, 600, "b"]]) {
        d.text(slot, (x + (side ? 0 : 30)) * s, base, 30 * s, { role: "black", family: "num", anchor: side ? "start" : "middle", box: rb([(x - (side ? 4 : 0)) * s, by + 8 * s, (side ? 90 : 60) * s, 38 * s]) });
        if (side && win === side) d.rect(x * s, base + 5 * s, 66 * s, 4 * s, "black", "data-deco=\"1\"");
      }
      d.rect(sx + 24 * s, by + 50 * s, sw - 48 * s, 1.5 * s, "black", "data-deco=\"1\"");
    }
    d.text("footnote", sx + 24 * s, sy + sh - 20 * s, 18 * s, { role: "black", family: "sans", weight: 500, box: rb([sx + 20 * s, sy + sh - 44 * s, sw - 40 * s, 30 * s]) });
    d.raw("</g>");
  },
};

module.exports = { LAYOUTS, HERO, STENCIL };
