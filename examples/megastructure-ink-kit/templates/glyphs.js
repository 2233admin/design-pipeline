/* The kit's own glyph script ("rail script"): every character of a string maps to a stack of square
   bars hung on a continuous baseline rail. It is decoration with a reading beside it: never the only
   carrier of information. Deterministic: the same text always draws the same glyphs.
   Works in the browser (window.RailGlyphs) and in Node (require). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RailGlyphs = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Cell: 4 units wide, bars on rows 0, 2.5 and 5 (1 unit high), the rail at 7 (0.6 high).
  const CELL = 4, GAP = 1.5, WORD = 3, H = 7.6;
  const SPANS = [[0, 4], [0, 2.5], [1.5, 4], [1, 3]];
  const ROWS = [0, 2.5, 5];

  function hash(cp) {
    let x = (cp * 2654435761) >>> 0;
    x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995) >>> 0; x ^= x >>> 15;
    return x >>> 0;
  }

  // One glyph as rectangles [x, y, w, h] in cell units.
  function glyph(cp) {
    const h = hash(cp);
    let rows = [0, 1, 2].filter((i) => (h >> i) & 1);
    if (rows.length < 2) rows = [0, 2];
    const rects = rows.map((i) => { const s = SPANS[(h >> (3 + i * 2)) & 3]; return [s[0], ROWS[i], s[1] - s[0], 1]; });
    const side = (h >> 9) & 1 ? 3 : 0;
    const top = ROWS[rows[0]], bottom = (h >> 10) & 1 ? 7 : ROWS[rows[rows.length - 1]] + 1;
    rects.push([side, top, 1, bottom - top]);
    if ((h >> 11) & 1) rects.push([side === 0 ? 1.4 : 1.6, (h >> 12) & 1 ? 1.25 : 3.75, 1, 1]);
    return rects;
  }

  // Layout of a string: rectangles in units plus the total width.
  function layout(text) {
    const rects = [];
    let x = 0, wordStart = 0;
    const chars = [...String(text)];
    const closeWord = () => { if (x > wordStart) rects.push([wordStart, 7, x - wordStart - GAP, 0.6]); };
    chars.forEach((ch) => {
      if (/\s/.test(ch)) { closeWord(); x += WORD; wordStart = x; return; }
      for (const [rx, ry, rw, rh] of glyph(ch.codePointAt(0))) rects.push([x + rx, ry, rw, rh]);
      x += CELL + GAP;
    });
    closeWord();
    return { rects, width: Math.max(0, x - GAP), height: H };
  }

  // SVG markup. size: height in px of the whole line (glyphs and rail).
  function svg(text, { size = 14, cls = "ms-glyphs" } = {}) {
    const { rects, width, height } = layout(text);
    const d = rects.map(([x, y, w, h]) => `M${+x.toFixed(2)} ${+y.toFixed(2)}h${+w.toFixed(2)}v${+h.toFixed(2)}h${+(-w).toFixed(2)}z`).join("");
    const pxW = Math.round((width / height) * size * 10) / 10;
    return `<svg class="${cls}" viewBox="0 0 ${+width.toFixed(2)} ${height}" width="${pxW}" height="${size}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  }

  return { glyph, layout, svg, CELL, GAP, H };
});
