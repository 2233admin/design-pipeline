"use strict";

// Layouts of the milspec-ops style pack (styles/milspec-ops/style.json): the official-site grammar of
// tactical extraction shooters, measured on a live reference site (screenshots and computed styles kept
// private, never shipped) and proven on the original site 寂原行动 STILLFIELD and three in-game screens.
// One dark slate ground, one signal green for the call to action and the current state, amber only for
// the selected item, hairline frames with corner ticks, square rail markers, callout leaders with
// L-brackets, and a docked bottom navigation whose middle is a raised five-sided plate. Geometry in the
// reference's own 1920 units scaled to the canvas. Weapons are generic code-drawn blueprint outlines;
// no scenery or figures are drawn: the grammar carries a screen until generated art drops in.

const { f1, invalid } = require("./layout-kit.cjs");

// Generic rifle silhouette, muzzle to the right, in local units (about 1000 long); anchors for callouts.
function rifle() {
  // blueprint: a near-black fill and a light hairline outline, no rendered shading
  const F = 'fill="#11171A" stroke="#BFC9C4" stroke-width="2.5" stroke-linejoin="round"';
  const H = 92; const recX = 230; const recW = 330; const hgX = recX + recW - 10; const hgW = 300; const barX = hgX + hgW; const barW = 120; const mzX = barX + barW;
  let s = `<path ${F} d="M${recX} 14L60 20L18 10L6 18L6 112L28 118L70 92L150 74L${recX} 70z"/><path d="M60 36h120M62 54h100" stroke="#BFC9C4" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path ${F} d="M${recX + 70} ${H - 6}L${recX + 112} ${H - 6}L${recX + 96} ${H + 92}L${recX + 54} ${H + 86}z"/>`;
  const mx = recX + 170;
  s += `<path ${F} d="M${mx} ${H - 8}L${mx + 56} ${H - 8}L${mx + 74} ${H + 120}L${mx + 26} ${H + 132}z"/>`;
  s += `<path ${F} d="M${recX - 6} 8L${recX + recW} 6L${recX + recW} ${H - 4}L${recX + 150} ${H}L${recX + 120} ${H + 8}L${recX - 6} ${H - 10}z"/><rect x="${recX + 140}" y="26" width="86" height="18" rx="3" fill="#11171A"/>`;
  s += `<rect x="${recX - 2}" y="-2" width="${hgX + hgW - recX - 6}" height="10" fill="#11171A" stroke="#BFC9C4" stroke-width="2"/>`;
  let slots = ""; for (let x = hgX + 26; x < hgX + hgW - 30; x += 46) slots += `<rect x="${x}" y="30" width="30" height="13" rx="6" fill="#11171A"/>`;
  s += `<path ${F} d="M${hgX} 8L${hgX + hgW} 12L${hgX + hgW} 74L${hgX} 80z"/>${slots}`;
  s += `<rect ${F} x="${barX - 4}" y="30" width="${barW + 8}" height="20"/><rect ${F} x="${mzX}" y="22" width="74" height="36" rx="4"/><path d="M${mzX + 18} 26v28M${mzX + 34} 26v28M${mzX + 50} 26v28" stroke="#BFC9C4" stroke-width="5"/>`;
  s += `<path ${F} d="M${hgX + 90} 78L${hgX + 170} 76L${hgX + 132} 120L${hgX + 104} 120z"/>`;
  const ox = recX + 90; const L = 250;
  s += `<path ${F} d="M${ox} -66L${ox + 34} -74L${ox + L - 40} -70L${ox + L} -80L${ox + L} -26L${ox + L - 40} -34L${ox + 34} -32L${ox} -40z"/><path d="M${ox + 40} -30v24M${ox + L - 70} -32v26" stroke="#BFC9C4" stroke-width="3"/>`;
  return { svg: s, box: [0, -100, mzX + 80, H + 240], anchors: { optic: [ox + L * 0.5, -60], muzzle: [mzX + 30, 40], fore: [hgX + 120, 100], grip: [recX + 80, H + 50], mag: [mx + 30, H + 80], stock: [110, 60] } };
}

// Corner ticks of a hairline frame (top-left and bottom-right, 2 units thick).
const ticks = (x, y, w, h, s, c, k = 9) => `<path data-deco="1" d="M${f1(x)} ${f1(y + k * s)}V${f1(y)}H${f1(x + k * s)}M${f1(x + w)} ${f1(y + h - k * s)}V${f1(y + h)}H${f1(x + w - k * s)}" fill="none" stroke="${c}" stroke-width="${f1(2 * s)}"/>`;
// Unreadable micro-text: tick bars standing in for the strip's tiny serial line (decoration).
function microBars(x, y, w, h, c, seed = 3) {
  let s = ""; let cx = x; let r = seed;
  while (cx < x + w) { r = (r * 1103515245 + 12345) % 2147483648; const bw = h * (0.4 + (r % 7) / 10); s += `<rect x="${f1(cx)}" y="${f1(y)}" width="${f1(bw)}" height="${f1(h)}"/>`; cx += bw + h * (r % 3 === 0 ? 1.4 : 0.5); }
  return `<g data-deco="1" fill="${c}">${s}</g>`;
}
function dateOnly(d, name) {
  const { text } = d.value(name);
  if (!/^[\d/.\- ]+$/.test(String(text))) throw invalid(`slot ${name} takes digits and / . - only, got ${JSON.stringify(text)}. Fix: --set ${name}=2026/10/28; put words in the title`);
}
const PENT = (x, y, w, h) => [[x + w / 2, y], [x + w, y + h * 0.336], [x + w, y + h], [x, y + h], [x, y + h * 0.336]];
const pts = (P) => P.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
const ICON = {
  role: '<path d="M4 18l8-13 8 13-8-4z"/>', dash: '<path d="M3 16h7M5 12h7M3 8h7"/><path d="M13 6l7 6-7 6z"/>',
  mine: '<rect x="5" y="11" width="14" height="7" rx="1"/><path d="M8 11V8h8v3M12 8V5"/>', smoke: '<circle cx="9" cy="14" r="4"/><circle cx="15" cy="12" r="5"/><path d="M5 20h14"/>',
  ammo: '<path d="M6 21V9l2-5 2 5v12zM14 21V9l2-5 2 5v12z"/>', pin: '<path d="M14.5 3.5l6 6-2.5 1-3.5 3.5.5 4-2 2-4-4-4.5 4.5-1-1L8 15l-4-4 2-2 4 .5L13.5 6z"/>',
};
const icon = (k, x, y, size, c, sw = 1.7) => `<g data-deco="1" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(size / 24)})" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">${ICON[k]}</g>`;

const LAYOUTS = {
  // ---- bottom dock: 1920 x 110, a 52-unit bar and a raised five-sided CTA plate --------------------
  "ui.ops-dock"(d) {
    const { W, H, p } = d; const s = W / 1920; const bar = 52 * s; const y0 = H - bar;
    d.rect(0, 0, W, H, "ink");
    d.rect(0, y0, W, bar, "dock");
    d.raw(`<rect data-deco="1" x="0" y="${f1(y0)}" width="${f1(W)}" height="${f1(1 * s)}" fill="${d.pal.rule}"/>`);
    const XS = [391, 537, 684, 1090, 1236, 1383]; const cur = Math.round(p.current);
    XS.forEach((x0, i) => {
      const x = x0 * s; const w = 147 * s; const on = i + 1 === cur;
      if (on) {
        if (p.glow) { let dots = ""; for (let gy = y0 + 4 * s; gy < H - 4 * s; gy += 5 * s) for (let gx = x + 3 * s; gx < x + w; gx += 5 * s) dots += `<circle cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(0.9 * s)}"/>`; d.raw(`<g data-deco="1" fill="${d.pal.green}" opacity=".35">${dots}</g>`); }
        d.raw(`<rect data-deco="1" x="${f1(x)}" y="${f1(H - 2 * s)}" width="${f1(w)}" height="${f1(2 * s)}" fill="${d.pal.green}"/>`);
      }
      d.text(`nav_${i + 1}`, x + w / 2, H - 16 * s, 16 * s, { role: on ? "text" : "mute", family: "head", anchor: "middle", box: [x + 8 * s, y0 + 8 * s, w - 16 * s, bar - 12 * s] });
    });
    const cx = 878 * s; const cw = 165 * s; const ch = 110 * s; const cy = H - ch;
    d.raw(`<polygon points="${pts(PENT(cx, cy, cw, ch))}" fill="${d.pal.green_deep}" data-role="green_deep"/>`);
    d.raw(`<polygon data-deco="1" points="${pts(PENT(cx, cy, cw, ch))}" fill="none" stroke="${d.pal.green}" stroke-width="${f1(2.5 * s)}"/>`);
    d.raw(`<path data-deco="1" d="M${f1(cx + cw / 2 - 20 * s)} ${f1(cy + 34 * s)}l${f1(20 * s)} ${f1(-18 * s)}l${f1(20 * s)} ${f1(18 * s)}" fill="none" stroke="${d.pal.green}" stroke-width="${f1(3 * s)}"/>`);
    d.text("cta_1", cx + cw / 2, cy + 70 * s, 20 * s, { role: "green", family: "head", anchor: "middle", tracking: 80, box: [cx + 40 * s, cy + 48 * s, cw - 80 * s, 28 * s] });
    d.text("cta_2", cx + cw / 2, cy + 95 * s, 20 * s, { role: "green", family: "head", anchor: "middle", tracking: 80, box: [cx + 40 * s, cy + 74 * s, cw - 80 * s, 28 * s] });
    d.zone("dock", "safe", [0, 0, W, H], { slots: ["nav_1", "nav_2", "nav_3", "nav_4", "nav_5", "nav_6", "cta_1", "cta_2"] });
  },

  // ---- left selection rail: 320 x 900, square markers on a hairline, the current frame amber ----------
  "card.ops-select-rail"(d) {
    const { W, H, p } = d; const s = W / 320; const n = Math.round(p.items); const cur = Math.round(p.current);
    d.rect(0, 0, W, H, "slate");
    d.raw(`<rect data-deco="1" x="${f1(8 * s)}" y="0" width="${f1(1 * s)}" height="${f1(H)}" fill="${d.pal.rule}"/>`);
    for (let i = 0; i < n; i += 1) {
      const y = (16 + i * 126) * s; const fx = 41 * s; const fw = 231 * s; const fh = 111 * s; const on = i + 1 === cur;
      if (on) {
        d.raw(`<rect data-deco="1" x="${f1(0)}" y="${f1(y + 47 * s)}" width="${f1(17 * s)}" height="${f1(17 * s)}" fill="${d.pal.slate}" stroke="${d.pal.amber}" stroke-width="${f1(2 * s)}"/><rect data-deco="1" x="${f1(6 * s)}" y="${f1(y + 53 * s)}" width="${f1(5 * s)}" height="${f1(5 * s)}" fill="${d.pal.amber}"/><rect data-deco="1" x="${f1(17 * s)}" y="${f1(y + 54.5 * s)}" width="${f1(24 * s)}" height="${f1(2 * s)}" fill="${d.pal.amber}"/>`);
      } else d.raw(`<rect data-deco="1" x="${f1(4 * s)}" y="${f1(y + 51 * s)}" width="${f1(9 * s)}" height="${f1(9 * s)}" fill="${d.pal.slate}" stroke="${d.pal.text}" stroke-width="${f1(1 * s)}"/>`);
      d.image(`pic_${i + 1}`, fx + 4 * s, y + 4 * s, fw - 8 * s, fh - 8 * s, "thumb", { labelAt: [0.72, 0.3] });
      d.raw(`<rect data-deco="1" x="${f1(fx + 4 * s)}" y="${f1(y + fh * 0.55)}" width="${f1(fw - 8 * s)}" height="${f1(fh * 0.45 - 4 * s)}" fill="${d.pal.ink}" opacity=".78"/>`);
      if (on) d.raw(`<rect data-deco="1" x="${f1(fx + 1 * s)}" y="${f1(y + 1 * s)}" width="${f1(fw - 2 * s)}" height="${f1(fh - 2 * s)}" fill="none" stroke="${d.pal.amber}" stroke-width="${f1(2 * s)}"/>`);
      d.text(`name_${i + 1}`, fx + 17 * s, y + 92 * s, 18 * s, { role: "text", family: "head", box: [fx + 12 * s, y + 70 * s, fw - 24 * s, 28 * s] });
    }
    for (let i = n; i < 6; i += 1) { d.value(`pic_${i + 1}`); d.value(`name_${i + 1}`); }
  },

  // ---- gunsmith callout screen: 1920 x 1080 ------------------------------------------------------
  "kv.ops-callout"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.rect(0, 0, W, H, "peg");
    const pid = "ops-peg";
    d.def(`<pattern id="${pid}" width="${f1(72 * s)}" height="${f1(72 * s)}" patternUnits="userSpaceOnUse"><circle cx="${f1(20 * s)}" cy="${f1(20 * s)}" r="${f1(5 * s)}" fill="${d.pal.hole}"/></pattern><radialGradient id="ops-glow"><stop offset="0" stop-color="#5D6E76" stop-opacity=".35"/><stop offset="1" stop-color="#5D6E76" stop-opacity="0"/></radialGradient>`);
    d.raw(`<rect data-deco="1" width="${f1(W)}" height="${f1(H)}" fill="url(#${pid})"/>`);
    const cx = 1150 * s; const cy = 560 * s;
    d.raw(`<ellipse data-deco="1" cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(720 * s)}" ry="${f1(360 * s)}" fill="url(#ops-glow)"/>`);
    const G = rifle(); const [bx, by, bw, bh] = G.box; const k = Math.min(1180 / bw, 520 / bh) * s; const rot = p.tilt; const R = (rot * Math.PI) / 180;
    const gcx = bx + bw / 2; const gcy = by + bh / 2;
    const T = ([x, y]) => { const dx = (x - gcx) * k; const dy = (y - gcy) * k; return [cx + dx * Math.cos(R) - dy * Math.sin(R), cy + dx * Math.sin(R) + dy * Math.cos(R)]; };
    d.raw(`<g data-deco="1" transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f1(rot)}) scale(${(k).toFixed(4)}) translate(${f1(-gcx)} ${f1(-gcy)})">${G.svg}</g>`);
    // callouts: label box with L-brackets, a hairline leader to a dot on the part
    const PARTS = [["optic", [-60, -230]], ["muzzle", [-60, -190]], ["stock", [-80, -170]], ["fore", [-40, 200]], ["grip", [-110, 210]]];
    const n = Math.round(p.callouts);
    PARTS.forEach(([part, off], i) => {
      const name = `part_${i + 1}`; const kind = `kind_${i + 1}`;
      if (i >= n) { d.value(name); d.value(kind); return; }
      const a = T(G.anchors[part]); const lx = Math.max(440 * s, Math.min(1640 * s, a[0] + off[0] * s)); const ly = Math.max(300 * s, Math.min(880 * s, a[1] + off[1] * s));
      const up = off[1] < 0; const ey = up ? ly + 52 * s : ly - 6 * s;
      d.raw(`<g data-deco="1"><path d="M${f1(a[0])} ${f1(a[1])}L${f1(lx)} ${f1(ey)}" stroke="${d.pal.text}" stroke-opacity=".55" stroke-width="${f1(1.2 * s)}"/><circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(4 * s)}" fill="${d.pal.text}"/><circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(10 * s)}" fill="none" stroke="${d.pal.text}" stroke-opacity=".4"/></g>`);
      d.raw(`<path data-deco="1" d="M${f1(lx)} ${f1(ly + 44 * s)}v${f1(9 * s)}h${f1(9 * s)}M${f1(lx + 196 * s)} ${f1(ly - 4 * s)}h${f1(9 * s)}v${f1(9 * s)}" fill="none" stroke="${d.pal.text}" stroke-opacity=".6" stroke-width="${f1(1.2 * s)}"/>`);
      d.text(name, lx + 10 * s, ly + 18 * s, 18 * s, { role: "text", family: "body", box: [lx + 8 * s, ly - 2 * s, 190 * s, 26 * s] });
      d.text(kind, lx + 10 * s, ly + 40 * s, 14 * s, { role: "dim", family: "body", box: [lx + 8 * s, ly + 26 * s, 190 * s, 20 * s] });
    });
    d.text("title_cjk", 409 * s, 196 * s, 36 * s, { role: "text", family: "head", box: [405 * s, 156 * s, 560 * s, 48 * s] });
    d.text("desc", 409 * s, 258 * s, 16 * s, { role: "text", family: "body", box: [405 * s, 240 * s, 620 * s, 26 * s] });
    d.raw(`<rect x="${f1(409 * s)}" y="${f1(100 * s)}" width="${f1(132 * s)}" height="${f1(30 * s)}" fill="${d.pal.green}" data-role="green"/>`);
    d.text("tag", 475 * s, 121 * s, 16 * s, { role: "ink", family: "head", anchor: "middle", box: [413 * s, 102 * s, 124 * s, 26 * s] });
    d.zone("head", "safe", [400 * s, 90 * s, 640 * s, 190 * s], { slots: ["title_cjk", "desc", "tag"] });
  },

  // ---- intel (news) card: 483 x 424, a folder strip, a picture, date / title / summary / more --------
  "card.ops-intel"(d) {
    const { W, H, p } = d; const s = W / 483; const top = 12 * s;
    d.rect(0, 0, W, H, "slate");
    d.raw(`<polygon data-deco="1" points="${pts([[0, 0], [104 * s, 0], [112 * s, top], [0, top]])}" fill="${d.pal.strip}"/><rect data-deco="1" x="${f1(104 * s)}" y="${f1(top - 4 * s)}" width="${f1(W - 104 * s)}" height="${f1(4 * s)}" fill="${d.pal.strip}"/>`);
    d.raw(microBars(6 * s, 4 * s, 90 * s, 4 * s, d.pal.mute));
    d.rect(0, top, W, H - top, "panel");
    d.raw(`<rect data-deco="1" x="${f1(0.5 * s)}" y="${f1(top + 0.5 * s)}" width="${f1(W - 1 * s)}" height="${f1(H - top - 1 * s)}" fill="none" stroke="${d.pal.hair}" stroke-opacity=".35"/>`);
    d.image("media", 2.5 * s, top + 14 * s, 478 * s, 269 * s, "478 x 269", { labelAt: [0.5, 0.5] });
    if (p.pin) d.raw(`<rect x="${f1(W - 50 * s)}" y="${f1(top + 22 * s)}" width="${f1(38 * s)}" height="${f1(38 * s)}" fill="${d.pal.amber}" data-role="amber"/>${icon("pin", W - 41 * s, top + 31 * s, 20 * s, d.pal.ink, 2)}`);
    const ix = 28 * s; const iy = top + 295 * s;
    dateOnly(d, "date");
    d.text("date", ix, iy + 13 * s, 15 * s, { role: "dim", family: "num", box: [ix - 2 * s, iy - 2 * s, 200 * s, 20 * s] });
    d.text("title", ix, iy + 45 * s, 22 * s, { role: "text", family: "head", box: [ix - 2 * s, iy + 20 * s, W - 2 * ix + 4 * s, 32 * s] });
    d.text("summary", ix, iy + 70 * s, 15 * s, { role: "mute", family: "body", box: [ix - 2 * s, iy + 54 * s, W - 2 * ix + 4 * s, 22 * s] });
    d.text("more", ix, iy + 98 * s, 14 * s, { role: "amber", family: "body", box: [ix - 2 * s, iy + 82 * s, 120 * s, 22 * s] });
  },

  // ---- detail column: 500 x 640, title, a green name line, ruled rows with icon, sub and body -----------
  "ui.ops-brief"(d) {
    const { W, H, p } = d; const s = W / 500; const n = Math.round(p.rows);
    d.rect(0, 0, W, H, "slate");
    d.text("title", 0, 40 * s, 36 * s, { role: "text", family: "head", box: [0, 4 * s, W, 48 * s] });
    d.text("name", 0, 76 * s, 16 * s, { role: "green", family: "body", box: [0, 60 * s, W, 24 * s] });
    let y = 104 * s;
    d.raw(`<rect data-deco="1" x="0" y="${f1(y)}" width="${f1(W)}" height="${f1(1 * s)}" fill="${d.pal.rule}"/>`);
    const IC = ["role", "dash", "mine", "smoke", "ammo"];
    for (let i = 0; i < 4; i += 1) {
      const sub = `sub_${i + 1}`; const body = `body_${i + 1}`;
      if (i >= n) { d.value(sub); d.value(body); continue; }
      const tx = p.icons ? 72 * s : 0; const first = i === 0;
      if (p.icons) d.raw(icon(IC[i], 8 * s, y + 30 * s, (first ? 48 : 40) * s, d.pal[first ? "red" : "text"]));
      d.text(sub, tx, y + 36 * s, 23 * s, { role: first ? "red" : "green", family: "head", box: [tx, y + 10 * s, W - tx, 32 * s] });
      d.text(body, tx, y + 62 * s, 16 * s, { role: "text", family: "body", box: [tx, y + 46 * s, W - tx, 48 * s], lineHeight: 1.5 });
      y += 112 * s;
      if (i < n - 1) d.raw(`<rect data-deco="1" x="0" y="${f1(y)}" width="${f1(W)}" height="${f1(1 * s)}" fill="${d.pal.rule}"/>`);
    }
  },
};

module.exports = { LAYOUTS, rifle, PENT };
