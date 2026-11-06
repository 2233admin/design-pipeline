/* Segment digits drawn as SVG (no font): "capsule" (thick, upright; the film-remake clock) and "lcd"
   (thin, slanted 6 degrees; the broadcast countdown). Shared by build/ (previews, pages) and the pages'
   live clocks. Characters: 0-9 : . - and space. */
(function (root) {
  "use strict";
  var SEGS = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcfgd", "-": "g", " ": "" };
  var STYLE = { lcd: { w: 0.5, t: 0.12, gap: 0.02, slant: 6, pitch: 0.66 }, capsule: { w: 0.42, t: 0.16, gap: 0.025, slant: 0, pitch: 0.54 } };
  function r(v) { return Math.round(v * 10) / 10; }
  function path(text, h, style) {
    var S = STYLE[style] || STYLE.lcd, w = S.w * h, t = S.t * h, g = S.gap * h, k = Math.tan(S.slant * Math.PI / 180);
    var cx = 0, d = "";
    function sk(p) { return [p[0] + (h - p[1]) * k, p[1]]; }
    function poly(pts) { return "M" + pts.map(function (p) { p = sk(p); return r(p[0]) + " " + r(p[1]); }).join("L") + "Z"; }
    function hs(x0, x1, y) { return [[x0, y], [x0 + t / 2, y - t / 2], [x1 - t / 2, y - t / 2], [x1, y], [x1 - t / 2, y + t / 2], [x0 + t / 2, y + t / 2]]; }
    function vs(x, y0, y1) { return [[x, y0], [x + t / 2, y0 + t / 2], [x + t / 2, y1 - t / 2], [x, y1], [x - t / 2, y1 - t / 2], [x - t / 2, y0 + t / 2]]; }
    String(text).split("").forEach(function (ch) {
      if (ch === ":" || ch === ".") {
        var dot = function (y) { return poly([[cx + t * 0.2, y - t / 2], [cx + t * 1.2, y - t / 2], [cx + t * 1.2, y + t / 2], [cx + t * 0.2, y + t / 2]]); };
        d += ch === ":" ? dot(h * 0.3) + dot(h * 0.7) : dot(h - t / 2);
        cx += t * 1.6; return;
      }
      var on = SEGS[ch]; if (on === undefined) on = "";
      var L = cx + t / 2, R = cx + w - t / 2, T = t / 2, M = h / 2, B = h - t / 2;
      var parts = { a: hs(L + g, R - g, T), g: hs(L + g, R - g, M), d: hs(L + g, R - g, B), f: vs(L, T + g, M - g), b: vs(R, T + g, M - g), e: vs(L, M + g, B - g), c: vs(R, M + g, B - g) };
      on.split("").forEach(function (s) { d += poly(parts[s]); });
      cx += S.pitch * h;
    });
    return { d: d, width: r(cx - (S.pitch - S.w) * h + h * k) };
  }
  // Inline SVG of the text at height h (CSS px); the SVG scales with font-size via the em-based class.
  function svg(text, style, label) {
    var p = path(text, 100, style || "lcd");
    return '<svg class="cc-seg__svg" viewBox="-2 -2 ' + (p.width + 4) + ' 104" style="aspect-ratio: ' + (p.width + 4) + ' / 104" role="img" aria-label="' + (label || text) + '"><path d="' + p.d + '"/></svg>';
  }
  var api = { path: path, svg: svg };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CCSeg = api;
})(this);
