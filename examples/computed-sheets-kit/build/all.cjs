"use strict";

// Render every piece of the kit to renders/ and write renders/index.html, a contact sheet that links them.
// The dense rasters in art/ come from dense.py (numpy); run it first when they are missing or changed.
const fs = require("node:fs");
const path = require("node:path");
const { written, OUT } = require("./common.cjs");

const PIECES = [
  ["kelly-dialects.cjs", "Product dialects: one computed hero in terminal, paper and field"],
  ["kelly-2d.cjs", "Paper dialect, protocol column + 2D surface with projections"],
  ["protocol-tcp.cjs", "Protocol sheet: TCP opening and header bit map"],
  ["structure-webb.cjs", "Structure sheet: Webb primary mirror segment map"],
  ["pulsar-collage.cjs", "Half-dome specimen collage: CP 1919"],
  ["technetium-kv.cjs", "Key visual with a 3D render slot: element 43"],
  ["object-cards.cjs", "Line-art object cards: Big Ear 1977, four styles"],
  ["teaser.cjs", "Beat-cut teaser, 15 s loop"],
  ["media.cjs", "Other media: receipt, release sheet, 404, badge, ribbon, small multiples, dial"],
  ["fusion.cjs", "Game-grammar pieces: gnomon KV, survey briefing, element entrance"],
  ["math.cjs", "Computed figures: Lorenz, phyllotaxis, Fourier, Ulam, Kepler, bifurcation"],
  ["dense.cjs", "Dense point clouds: Buddhabrot, standard map, de Jong, Clifford, Lyapunov"],
  ["kondratiev.cjs", "Kondratiev waves as a spiral"],
  ["collage.cjs", "Computed material triptych: sand ripples, dusk, Gray-Scott"],
  ["engine-and-faktura.cjs", "Depth canyon in an engine look (ray-marched raster) and a constructivist faktura composition"],
  ["holo-depth.cjs", "Holographic order-book projection with HUD cards at several depths"],
  ["holo-nihei.cjs", "Hologram in an orange megastructure: ink-hatched pillars, beams and cables"],
  ["holo-space.cjs", "Hologram in deep space: hatched gas giant, rings, asteroid ship"],
  ["depth-sheet.cjs", "Depth archive sheet: gritty hologram in a hero window, readings and callouts as crisp vector (megastructure, deep space)"],
  ["stage.cjs", "Blue/yellow stage: a computed machine in duotone on white with beams, pillars, stars and dot grids (Webb mirror, cyclotron, order-book depth)"],
  ["depth-3d.cjs", "3D order-book depth from simulated L2 snapshots"],
];
const groups = [];
for (const [file, label] of PIECES) {
  const before = written.length;
  require(path.join(__dirname, file));
  groups.push({ file, label, pieces: written.slice(before) });
}
const cards = groups.map((g) => `<section><h2>${g.label}</h2><p><code>build/${g.file}</code></p><ul>${g.pieces.map((p) => `<li><a href="${p.name}.html">${p.title}</a> <span>${p.width}×${p.height}</span></li>`).join("")}</ul></section>`).join("");
fs.writeFileSync(path.join(OUT, "index.html"), `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Computed sheets kit</title><style>body{margin:48px;font:14px/1.5 'IBM Plex Mono',monospace;background:#0d0d0f;color:#e8e4da}h1{font-weight:400;letter-spacing:.1em}h2{font-size:14px;font-weight:500;margin:32px 0 4px}a{color:#e8e4da}span,code{color:#8c877c}ul{padding-left:18px}</style></head><body><h1>COMPUTED SHEETS KIT</h1>${cards}</body></html>`);
console.log(JSON.stringify({ out: OUT, pieces: written.length }));
