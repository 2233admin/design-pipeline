"use strict";

// Shared output for the computed-sheets kit: every piece is one self-contained HTML page with an
// inline SVG, written to renders/<name>.html. Fonts are named and loaded from Google Fonts (all OFL);
// nothing is bundled.
const fs = require("node:fs");
const path = require("node:path");

const OUT = process.env.COMPUTED_SHEETS_OUT || path.join(__dirname, "..", "renders");
const GF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=Inter+Tight:wght@500;600&amp;family=Michroma&amp;family=Nothing+You+Could+Do&amp;family=Outfit:wght@300;400;500&amp;family=Noto+Serif+SC:wght@900&amp;family=Noto+Sans+SC:wght@500;700&amp;display=swap";
const written = [];

function emit(name, title, W, H, css, svgBody, bg) {
  fs.mkdirSync(OUT, { recursive: true });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="${GF}"><style>body{margin:0;background:${bg}}\n${css}</style></head><body><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="${title}" role="img">${svgBody}</svg></body></html>`;
  fs.writeFileSync(path.join(OUT, `${name}.html`), html);
  written.push({ name, title, width: W, height: H });
}

let seed = 1;
const rng = (s) => { if (s !== undefined) seed = s; seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const r = (x) => (+x).toFixed(1);
module.exports = { emit, rng, r, written, OUT };
