"use strict";

// Layout of the acid-print-hud style pack (styles/acid-print-hud/style.json): a combat HUD after a
// graphic-realism UI grammar (one acid ink on black slabs, giant chamfered code-drawn numerals with
// a misregistered second plate, Swiss-poster type scale, micro labels) over a scene printed as a
// cold two-ink halftone. Positions in 1920 x 1080 units scaled to the canvas, from the tactical-hud
// case's round-2 final (render(state) in hud2.js / hud2.css; check 0). The scene is an image slot;
// the case printed its own drawn harbour through a halftone pass (see the style's recipes).

const lettering = require("./lettering.cjs");
const { f1, rbox, tilt } = require("./layout-kit.cjs");

const NUM = { width: 0.55, stroke: 0.19, chamfer: 0.12, chamfer_mode: "diag", stencil: 0, slant: 0.1, sidebearing: 0.05, tracking: 20 };
const numWidth = (text, h) => lettering.setText(String(text), 0, 0, h, NUM).width;
const asNumber = (text, fallback) => { const v = Number(String(text).replace(/[^0-9.]/g, "")); return Number.isFinite(v) && String(text).trim() ? v : fallback; };

const ICON = {
  smoke: "<path d=\"M4 40h20a10 10 0 0 0-20 0zM16 40h24a12 12 0 0 0-24 0zM10 26h18a9 9 0 0 0-18 0z\"/><path d=\"M30 26l8-8h6l-8 8z\"/>",
  dash: "<path d=\"M4 8h12l14 16-14 16H4l14-16zM22 8h10l14 16-14 16H22l14-16z\"/>",
  pulse: "<path d=\"M24 15.5L32.5 24L24 32.5L15.5 24Z\"/><path d=\"M24 4L28 4L28 10L24 10ZM24 38L28 38L28 44L24 44Z\"/>",
  over: "<path d=\"M28 2L8 28h14l-6 18 26-30H28l6-14z\"/>",
  gren: "<path d=\"M24 4l17 10v20L24 44 7 34V14z\"/><path d=\"M33 8l6-6h4l-6 6z\"/>",
  rifle: "<path d=\"M2 12h20l4-4h44l2 3h30v5H90l-4 3H62l-6 10H46l3-9H30l-6 9H10l4-12H2z\"/>",
  pistol: "<path d=\"M2 3h50v8H22l-3 13H8l3-13H2z\"/>",
};
function glyph(d, kind, x, y, scale, role, extra = "") {
  d.raw(`<g data-deco="1" transform="translate(${f1(x)} ${f1(y)}) scale(${scale.toFixed(4)})" fill="${d.pal[role]}"${extra}>${ICON[kind]}</g>`);
}
function slab(d, x, y, w, h) { d.rect(x, y, w, h, "black", "opacity=\"0.88\""); }

const LAYOUTS = {
  "hud.combat"(d) {
    const { W, H, p } = d; const s = W / 1920;
    d.image("scene", 0, 0, W, H, "a cold two-ink halftone print", { labelAt: [0.5, 0.285] });
    // damage direction and edge
    if (p.damage) {
      const a0 = ((-70 - 18) * Math.PI) / 180; const a1 = ((-70 + 18) * Math.PI) / 180; const R = 222 * s; const r = 204 * s;
      const pt = (a, rr) => `${f1(960 * s + Math.sin(a) * rr)} ${f1(540 * s - Math.cos(a) * rr)}`;
      const steps = 8; const outer = []; const inner = [];
      for (let i = 0; i <= steps; i += 1) { const a = a0 + ((a1 - a0) * i) / steps; outer.push(pt(a, R)); inner.unshift(pt(a, r)); }
      d.raw(`<path data-deco="1" d="M${outer.join("L")}L${inner.join("L")}Z" fill="${d.pal.red}" opacity="0.6"/>`);
    }
    // minimap and location card
    slab(d, 40 * s, 40 * s, 286 * s, 286 * s);
    const mk = (286 / 272) * s;
    d.raw(`<g data-deco="1" transform="translate(${f1(40 * s)} ${f1(40 * s)}) scale(${mk.toFixed(4)})"><g fill="none" stroke="${d.pal.acid}" stroke-opacity="0.55" stroke-width="1.5">${[[36, 20, 46, 70], [36, 104, 46, 74], [36, 196, 46, 60], [188, 32, 50, 60], [188, 116, 50, 90], [188, 222, 50, 40]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join("")}</g><path d="M136 168L90 68L182 68Z" fill="${d.pal.acid}" fill-opacity="0.14"/>${[[112, 196], [160, 210], [118, 120], [70, 150]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${d.pal.white}"/>`).join("")}<rect x="143" y="63" width="14" height="14" transform="rotate(45 150 70)" fill="${d.pal.red}"/><rect x="199" y="143" width="14" height="14" transform="rotate(45 206 150)" fill="${d.pal.red}" opacity="0.55"/><path d="M136 154L146 178L136 172L126 178Z" fill="${d.pal.acid}"/>${[[136, 34, "white"], [60, 236, "white"], [214, 214, "red"]].map(([x, y, c]) => `<rect x="${x - 13}" y="${y - 13}" width="26" height="26" fill="${d.pal[c]}"/>`).join("")}</g>`);
    slab(d, 40 * s, 334 * s, 286 * s, 66 * s);
    d.text("location", 54 * s, 362 * s, 18 * s, { role: "white", family: "sans", weight: 800, tracking: 40, box: [50 * s, 342 * s, 270 * s, 26 * s] });
    d.text("location_sub", 54 * s, 388 * s, 15 * s, { role: "mute", family: "sans", weight: 600, tracking: 80, box: [50 * s, 372 * s, 270 * s, 22 * s] });
    // score: our score in an acid block, the clock, theirs outlined in red
    const sx = 960 * s - 199 * s; const sy = 34 * s; const sh = 76 * s;
    d.rect(sx, sy, 104 * s, sh, "acid");
    const us = 46 * s; d.lettering("score_us", sx + 52 * s - numWidth(d.value("score_us").text, us) / 2, sy + (sh - us) / 2, us, { ...NUM, role: "black", trim: false, box: [sx + 4 * s, sy + 4 * s, 96 * s, sh - 8 * s] });
    slab(d, sx + 104 * s, sy, 190 * s, sh);
    d.text("clock", 960 * s, sy + 42 * s, 38 * s, { role: "white", family: "num", anchor: "middle", box: [sx + 110 * s, sy + 6 * s, 178 * s, 42 * s] });
    d.text("round", 960 * s, sy + 66 * s, 15 * s, { role: "mute", family: "sans", weight: 600, tracking: 80, anchor: "middle", box: [sx + 110 * s, sy + 50 * s, 178 * s, 22 * s] });
    slab(d, sx + 294 * s, sy, 104 * s, sh);
    d.raw(`<rect data-deco="1" x="${f1(sx + 295 * s)}" y="${f1(sy + 1 * s)}" width="${f1(102 * s)}" height="${f1(sh - 2 * s)}" fill="none" stroke="${d.pal.red}" stroke-width="${f1(2 * s)}"/>`);
    d.lettering("score_them", sx + 346 * s - numWidth(d.value("score_them").text, us) / 2, sy + (sh - us) / 2, us, { ...NUM, role: "red", trim: false, box: [sx + 298 * s, sy + 4 * s, 96 * s, sh - 8 * s] });
    // compass strip, bearing, objective
    const cx0 = 640 * s; const cy0 = 132 * s;
    d.def(`<linearGradient id="cmpfade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${d.pal.black}" stop-opacity="0"/><stop offset="0.16" stop-color="${d.pal.black}" stop-opacity="0.88"/><stop offset="0.84" stop-color="${d.pal.black}" stop-opacity="0.88"/><stop offset="1" stop-color="${d.pal.black}" stop-opacity="0"/></linearGradient>`);
    d.raw(`<rect x="${f1(cx0)}" y="${f1(cy0)}" width="${f1(640 * s)}" height="${f1(40 * s)}" fill="url(#cmpfade)"/>`);
    const ticks = [];
    for (let deg = Math.ceil((p.bearing - 76) / 5) * 5; deg <= p.bearing + 76; deg += 5) {
      const n = ((deg % 360) + 360) % 360; const x = cx0 + (320 + (deg - p.bearing) * 4) * s; const big = n % 45 === 0; const mid = n % 15 === 0;
      const h = (big ? 12 : mid ? 8 : 5) * s;
      ticks.push(`<rect x="${f1(x - s)}" y="${f1(cy0 + 40 * s - h)}" width="${f1(2 * s)}" height="${f1(h)}" fill="${d.pal.acid}" opacity="${big ? 1 : 0.6}"/>`);
    }
    d.raw(`<g data-deco="1">${ticks.join("")}</g>`);
    const labels = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
    for (let deg = Math.ceil((p.bearing - 50) / 45) * 45; deg <= p.bearing + 50; deg += 45) {
      const n = ((deg % 360) + 360) % 360; const x = cx0 + (320 + (deg - p.bearing) * 4) * s;
      d.text("compass_mark", x, cy0 + 22 * s, 19 * s, { role: "acid", family: "num", anchor: "middle", content: labels[n], box: [x - 22 * s, cy0 + 2 * s, 44 * s, 24 * s] });
    }
    d.rect(936 * s, 176 * s, 48 * s, 24 * s, "acid");
    d.text("bearing", 960 * s, 195 * s, 20 * s, { role: "black", family: "num", anchor: "middle", content: String(Math.round(((p.bearing % 360) + 360) % 360)).padStart(3, "0"), box: [938 * s, 176 * s, 44 * s, 24 * s] });
    slab(d, 820 * s, 214 * s, 280 * s, 50 * s);
    d.rect(828 * s, 222 * s, 34 * s, 34 * s, "white");
    d.text("objective_letter", 845 * s, 248 * s, 24 * s, { role: "black", family: "num", anchor: "middle", box: [828 * s, 222 * s, 34 * s, 34 * s] });
    d.text("objective", 874 * s, 245 * s, 17 * s, { role: "white", family: "sans", weight: 700, box: [870 * s, 226 * s, 64 * s, 26 * s] });
    d.rect(944 * s, 235 * s, 90 * s, 8 * s, "white", "opacity=\"0.2\" data-deco=\"1\"");
    d.rect(944 * s, 235 * s, 90 * s * (p.capture / 100), 8 * s, "white", "data-deco=\"1\"");
    d.text("objective_pct", 1044 * s, 248 * s, 22 * s, { role: "white", family: "num", box: [1040 * s, 222 * s, 56 * s, 32 * s] });
    // world marker
    d.raw(`<rect data-deco="1" x="${f1(946 * s)}" y="${f1(356 * s)}" width="${f1(24 * s)}" height="${f1(24 * s)}" transform="rotate(45 ${f1(958 * s)} ${f1(368 * s)})" fill="${d.pal.white}" stroke="${d.pal.black}" stroke-width="${f1(2 * s)}"/>`);
    d.text("marker_letter", 958 * s, 375 * s, 18 * s, { role: "black", family: "num", anchor: "middle", box: [946 * s, 356 * s, 24 * s, 24 * s] });
    slab(d, 932 * s, 388 * s, 52 * s, 22 * s);
    d.text("marker_distance", 958 * s, 405 * s, 17 * s, { role: "white", family: "num", anchor: "middle", box: [934 * s, 388 * s, 48 * s, 22 * s] });
    // kill feed (top right): the player's own kill in acid
    for (let i = 0; i < 3; i += 1) {
      const y = (40 + i * 46) * s; const mine = i === 0; const w = (mine ? 270 : 230) * s; const x = 1880 * s - w;
      if (mine) d.rect(x, y, w, 40 * s, "acid"); else slab(d, x, y, w, 40 * s);
      const roles = [["black", "black"], ["white", "red"], ["red", "white"]][i];
      d.text(`feed_${i}_killer`, x + 14 * s, y + 27 * s, 18 * s, { role: roles[0], family: "sans", weight: 700, box: [x + 10 * s, y + 6 * s, 62 * s, 28 * s] });
      glyph(d, i === 2 ? "pistol" : "rifle", x + 76 * s, y + (i === 2 ? 9 : 10) * s, (i === 2 ? 46 / 56 : 84 / 120) * s, mine ? "black" : "mute");
      if (mine) { d.rect(x + 168 * s, y + 9 * s, 42 * s, 22 * s, "black"); d.text("feed_tag", x + 189 * s, y + 26 * s, 15 * s, { role: "acid", family: "sans", weight: 800, anchor: "middle", box: [x + 168 * s, y + 9 * s, 42 * s, 22 * s] }); }
      const vx = x + w - 14 * s;
      d.text(`feed_${i}_victim`, vx, y + 27 * s, 18 * s, { role: roles[1], family: "sans", weight: 700, anchor: "end", box: [vx - 50 * s, y + 6 * s, 52 * s, 28 * s] });
      if (mine) d.rect(vx - 36 * s, y + 31 * s, 36 * s, 3 * s, "red", "data-deco=\"1\"");
    }
    // crosshair with hit and kill marks
    const ch = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ch.push(`<line x1="${dx * 14}" y1="${dy * 14}" x2="${dx * 26}" y2="${dy * 26}" stroke="${d.pal.black}" stroke-width="6"/><line x1="${dx * 14}" y1="${dy * 14}" x2="${dx * 26}" y2="${dy * 26}" stroke="${d.pal.acid}" stroke-width="2.5"/>`);
    if (p.kill_sticker) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ch.push(`<line x1="${dx * 10}" y1="${dy * 10}" x2="${dx * 23}" y2="${dy * 23}" stroke="${d.pal.black}" stroke-width="7"/><line x1="${dx * 10}" y1="${dy * 10}" x2="${dx * 23}" y2="${dy * 23}" stroke="${d.pal.red}" stroke-width="3"/>`);
    d.raw(`<g data-deco="1" transform="translate(${f1(960 * s)} ${f1(540 * s)}) scale(${s.toFixed(4)})">${ch.join("")}<rect x="-2.5" y="-2.5" width="5" height="5" fill="${d.pal.acid}"/></g>`);
    // kill sticker, slapped on at an angle with a red offset plate
    if (p.kill_sticker) {
      const kw = 420 * s; const kh = 90 * s; const kx = 960 * s - kw / 2; const ky = 640 * s; const kc = [kx + kw / 2, ky + kh / 2];
      tilt(d, p.kill_tilt, ...kc);
      d.rect(kx + 9 * s, ky + 8 * s, kw, kh, "red");
      d.rect(kx, ky, kw, kh, "acid");
      const rb = (b) => rbox(b, p.kill_tilt, kc, 2 * s);
      d.text("kill_word", kx + 22 * s, ky + 70 * s, 64 * s, { role: "black", family: "sans", weight: 900, tracking: 60, box: rb([kx + 16 * s, ky + 6 * s, 150 * s, 78 * s]) });
      d.text("kill_name", kx + 182 * s, ky + 66 * s, 34 * s, { role: "black", family: "sans", weight: 800, box: rb([kx + 178 * s, ky + 30 * s, 110 * s, 44 * s]) });
      d.text("kill_points", kx + kw - 22 * s, ky + 66 * s, 34 * s, { role: "black", family: "num", anchor: "end", box: rb([kx + kw - 120 * s, ky + 30 * s, 102 * s, 44 * s]) });
      d.raw("</g>");
      if (p.medal) {
        const mx = kx + 290 * s; const my = ky + 112 * s; const mc = [mx + 50 * s, my + 24 * s];
        tilt(d, 4, ...mc);
        d.rect(mx, my, 100 * s, 48 * s, "black");
        d.text("medal", mx + 50 * s, my + 34 * s, 26 * s, { role: "acid", family: "sans", weight: 900, tracking: 160, anchor: "middle", box: rbox([mx + 4 * s, my + 4 * s, 92 * s, 40 * s], 4, mc, 2 * s) });
        d.raw("</g>");
      }
    }
    // vitals: a tilted slab, shield cells, hp bar, the giant HP numeral
    const vx = 40 * s; const vy = 858 * s; const vw = 560 * s; const vh = 178 * s; const vc = [vx, vy + vh]; const vt = p.vitals_tilt;
    const vb = (b) => rbox(b, vt, vc, 2 * s);
    d.raw(`<g transform="rotate(${f1(vt)} ${f1(vc[0])} ${f1(vc[1])})">`);
    slab(d, vx, vy, vw, vh);
    const shield = asNumber(d.value("shield_value").text, 50);
    for (let i = 0; i < 4; i += 1) {
      const v = Math.max(0, Math.min(25, shield - i * 25)); const x = vx + (26 + i * 66) * s; const y = vy + 22 * s; const k = 7 * s;
      const cell = `M${f1(x + k)} ${f1(y)}L${f1(x + 58 * s + k)} ${f1(y)}L${f1(x + 58 * s - k)} ${f1(y + 16 * s)}L${f1(x - k)} ${f1(y + 16 * s)}Z`;
      if (v >= 25) d.raw(`<path data-deco="1" d="${cell}" fill="${d.pal.acid}"/>`);
      else { d.raw(`<path data-deco="1" d="${cell}" fill="none" stroke="${d.pal.acid}" stroke-opacity="0.35" stroke-width="${f1(2 * s)}"/>`); if (v > 0) d.raw(`<path data-deco="1" d="M${f1(x + k)} ${f1(y)}L${f1(x + k + 58 * s * (v / 25))} ${f1(y)}L${f1(x - k + 58 * s * (v / 25))} ${f1(y + 16 * s)}L${f1(x - k)} ${f1(y + 16 * s)}Z" fill="${d.pal.acid}"/>`); }
    }
    d.text("shield_label", vx + 28 * s, vy + 66 * s, 15 * s, { role: "mute", family: "sans", weight: 600, box: vb([vx + 24 * s, vy + 50 * s, 40 * s, 22 * s]) });
    d.text("shield_value", vx + 70 * s, vy + 70 * s, 28 * s, { role: "acid", family: "num", box: vb([vx + 66 * s, vy + 44 * s, 60 * s, 34 * s]) });
    const hp = asNumber(d.value("hp").text, 68);
    d.rect(vx + 26 * s, vy + 84 * s, 262 * s, 10 * s, "acid", "opacity=\"0.18\" data-deco=\"1\"");
    d.rect(vx + 26 * s, vy + 84 * s, 262 * s * Math.min(1, p.hp_lag / 100), 10 * s, "red", "data-deco=\"1\"");
    d.rect(vx + 26 * s, vy + 84 * s, 262 * s * Math.min(1, hp / 100), 10 * s, hp <= 25 ? "red" : "acid", "data-deco=\"1\"");
    d.text("operator", vx + 26 * s, vy + 122 * s, 18 * s, { role: "white", family: "sans", weight: 700, tracking: 60, box: vb([vx + 22 * s, vy + 102 * s, 60 * s, 26 * s]) });
    d.text("operator_sub", vx + 92 * s, vy + 122 * s, 15 * s, { role: "mute", family: "sans", weight: 600, box: vb([vx + 88 * s, vy + 104 * s, 120 * s, 24 * s]) });
    d.rect(vx + 26 * s, vy + 136 * s, 76 * s, 25 * s, "red");
    d.text("status", vx + 35 * s, vy + 154 * s, 15 * s, { role: "black", family: "sans", weight: 700, box: vb([vx + 30 * s, vy + 136 * s, 70 * s, 25 * s]) });
    d.text("hp_label", vx + 316 * s, vy + 36 * s, 15 * s, { role: "mute", family: "sans", weight: 600, tracking: 80, box: vb([vx + 312 * s, vy + 20 * s, 100 * s, 22 * s]) });
    const bigH = 112 * s; const bigW = numWidth(d.value("hp").text, bigH);
    d.lettering("hp", vx + vw - 28 * s - bigW, vy + vh - 20 * s - bigH, bigH, { ...NUM, role: hp <= 25 ? "red" : "acid", trim: false, box: vb([vx + vw - 40 * s - bigW, vy + vh - 26 * s - bigH * 1.1, bigW + 32 * s, bigH * 1.2]) });
    d.raw("</g>");
    // abilities: three keys, the ultimate diamond, grenades
    const ax = 678 * s; const ay = 936 * s;
    const states = [p.ability_q, p.ability_e, p.ability_c];
    const icons = ["smoke", "dash", "pulse"];
    for (let i = 0; i < 3; i += 1) {
      const x = ax + i * 108 * s; const st = states[i];
      if (st === "ready") d.rect(x, ay, 92 * s, 92 * s, "acid");
      else { slab(d, x, ay, 92 * s, 92 * s); d.raw(`<rect data-deco="1" x="${f1(x + s)}" y="${f1(ay + s)}" width="${f1(90 * s)}" height="${f1(90 * s)}" fill="none" stroke="${d.pal[st === "cooldown" ? "acid" : "mute"]}" stroke-width="${f1(2 * s)}"${st === "off" ? ` stroke-dasharray="${f1(4 * s)} ${f1(4 * s)}"` : ""}/>`); }
      glyph(d, icons[i], x + 22 * s, ay + 22 * s, s, st === "ready" ? "black" : st === "cooldown" ? "acid" : "mute", st === "cooldown" ? " opacity=\"0.25\"" : "");
      if (st === "cooldown") d.text("ability_cooldown", x + 46 * s, ay + 64 * s, 52 * s, { role: "acid", family: "num", anchor: "middle", box: [x + 6 * s, ay + 14 * s, 80 * s, 64 * s] });
      d.rect(x - 8 * s, ay - 10 * s, 24 * s, 25 * s, "black");
      d.text(`ability_key_${i}`, x + 4 * s, ay + 9 * s, 18 * s, { role: st === "off" ? "mute" : "acid", family: "num", anchor: "middle", box: [x - 8 * s, ay - 10 * s, 24 * s, 25 * s] });
    }
    const ux = ax + 3 * 108 * s + 10 * s; const uy = ay - 20 * s; const uc = [ux + 66 * s, uy + 66 * s];
    d.raw(`<rect data-deco="1" x="${f1(ux + 16 * s)}" y="${f1(uy + 16 * s)}" width="${f1(100 * s)}" height="${f1(100 * s)}" transform="rotate(45 ${f1(uc[0])} ${f1(uc[1])})" fill="${d.pal[p.ult_ready ? "acid" : "black"]}" opacity="${p.ult_ready ? 1 : 0.88}" stroke="${d.pal.acid}" stroke-opacity="0.4" stroke-width="${f1(2 * s)}"/>`);
    glyph(d, "over", ux + 42 * s, uy + 30 * s, s, p.ult_ready ? "black" : "white");
    d.rect(ux + 40 * s, uy + 80 * s, 52 * s, 26 * s, "black");
    d.text("ult_charge", ux + 66 * s, uy + 100 * s, 22 * s, { role: "white", family: "num", anchor: "middle", box: [ux + 40 * s, uy + 80 * s, 52 * s, 26 * s] });
    d.rect(ux + 54 * s, uy + 120 * s, 24 * s, 25 * s, "black");
    d.text("ult_key", ux + 66 * s, uy + 139 * s, 18 * s, { role: "acid", family: "num", anchor: "middle", box: [ux + 54 * s, uy + 120 * s, 24 * s, 25 * s] });
    const gx = ux + 152 * s;
    slab(d, gx, ay + 2 * s, 72 * s, 88 * s);
    glyph(d, "gren", gx + 10 * s, ay + 10 * s, (52 / 48) * s, "acid");
    d.text("grenades", gx + 36 * s, ay + 84 * s, 24 * s, { role: "white", family: "num", anchor: "middle", box: [gx + 4 * s, ay + 62 * s, 64 * s, 28 * s] });
    // weapon: name, mode, magazine ticks, the giant ammo numeral printed over a misregistered plate
    const wx = 1284 * s; const wy = 836 * s;
    slab(d, wx, wy, 596 * s, 200 * s);
    d.text("weapon_code", wx + 28 * s, wy + 46 * s, 24 * s, { role: "acid", family: "num", tracking: 40, box: [wx + 24 * s, wy + 22 * s, 66 * s, 30 * s] });
    d.text("weapon_name", wx + 96 * s, wy + 45 * s, 22 * s, { role: "white", family: "sans", weight: 800, tracking: 40, box: [wx + 92 * s, wy + 22 * s, 120 * s, 30 * s] });
    d.text("weapon_mode", wx + 28 * s, wy + 72 * s, 15 * s, { role: "mute", family: "sans", weight: 600, tracking: 80, box: [wx + 24 * s, wy + 56 * s, 240 * s, 22 * s] });
    const ammo = asNumber(d.value("ammo").text, 24); const low = ammo <= 8;
    const mag = [];
    for (let i = 0; i < 30; i += 1) mag.push(`<rect x="${f1(wx + (28 + (i % 15) * 11) * s)}" y="${f1(wy + (92 + Math.floor(i / 15) * 20) * s)}" width="${f1(8 * s)}" height="${f1(16 * s)}" fill="${d.pal.acid}" opacity="${i < ammo ? 1 : 0.16}"/>`);
    d.raw(`<g data-deco="1">${mag.join("")}</g>`);
    d.raw(`<g data-deco="1">${Array.from({ length: 22 }, (_, i) => `<rect x="${f1(wx + 456 * s + i * 5 * s)}" y="${f1(wy + 26 * s)}" width="${f1([2, 1, 3, 1, 2, 2, 1, 3][i % 8] * s)}" height="${f1(26 * s)}" fill="${d.pal.mute}"/>`).join("")}</g>`);
    d.rect(wx + 28 * s, wy + 160 * s, 20 * s, 20 * s, "mute");
    d.text("secondary_key", wx + 38 * s, wy + 176 * s, 15 * s, { role: "black", family: "num", anchor: "middle", box: [wx + 28 * s, wy + 160 * s, 20 * s, 20 * s] });
    d.text("secondary", wx + 56 * s, wy + 176 * s, 15 * s, { role: "mute", family: "sans", weight: 600, tracking: 60, box: [wx + 52 * s, wy + 160 * s, 200 * s, 22 * s] });
    const aH = 168 * s; const aW = numWidth(d.value("ammo").text, aH);
    d.lettering("ammo", wx + 596 * s - 146 * s - aW, wy + 200 * s - 22 * s - aH, aH, { ...NUM, role: low ? "red" : "acid", trim: false, shadow: { dx: 7 * s, dy: 6 * s, role: low ? "acid" : "red" }, box: [wx + 596 * s - 160 * s - aW, wy + 4 * s, aW + 24 * s, 196 * s] });
    d.text("reserve_label", wx + 566 * s, wy + 112 * s, 16 * s, { role: "mute", family: "num", tracking: 140, anchor: "end", box: [wx + 460 * s, wy + 96 * s, 110 * s, 22 * s] });
    d.text("reserve", wx + 566 * s, wy + 166 * s, 44 * s, { role: "white", family: "num", anchor: "end", box: [wx + 456 * s, wy + 124 * s, 114 * s, 52 * s] });
  },
};

module.exports = { LAYOUTS, NUM };
