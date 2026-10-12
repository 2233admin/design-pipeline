/*
 * The preset table for ascii-art.js. Choose a row by name with index.html#<name>,
 * index.html?preset=<name>, the Preset control, or data-preset on the page's <html> element.
 *
 *   piece     the ascii.rest piece in pieces.js
 *   options   overrides for the piece's own option defaults
 *   fps       the sample rate: frames sit at k / fps seconds
 *   cols/rows the piece's grid, checked against the piece itself
 *   ink       the text colour of a mono piece (and of the controls)
 *   ground    the colour behind the art; coloured pieces take their glyph colours from their palette
 *   duration  seconds that renderStudy(0..1) and the live loop cover; duration × fps ≤ 3600
 */
(function (root) {
  "use strict";
  const presets = [
    { name: "donut", piece: "donut", options: {}, fps: 30, cols: 40, rows: 22, ink: "#f4efe6", ground: "#101010", duration: 8 },
    { name: "donut-paper", piece: "donut", options: {}, fps: 30, cols: 40, rows: 22, ink: "#22201c", ground: "#f2ede3", duration: 8 },
    { name: "doom-fire", piece: "doom-fire", options: {}, fps: 24, cols: 60, rows: 18, ink: "#ff8a3d", ground: "#0f0705", duration: 8 },
    { name: "fireworks", piece: "fireworks", options: {}, fps: 30, cols: 64, rows: 24, ink: "#fff3d6", ground: "#06081a", duration: 8 },
    { name: "matrix-rain", piece: "matrix-rain", options: {}, fps: 20, cols: 63, rows: 24, ink: "#5dfc8d", ground: "#020b05", duration: 8 },
    { name: "rotozoomer", piece: "rotozoomer", options: {}, fps: 30, cols: 64, rows: 24, ink: "#e0c9a6", ground: "#17120e", duration: 8 },
    { name: "sparks", piece: "sparks", options: {}, fps: 30, cols: 64, rows: 20, ink: "#ffc861", ground: "#0b0b0d", duration: 8 },
    { name: "synthwave", piece: "synthwave", options: {}, fps: 20, cols: 65, rows: 28, ink: "#ff5fd2", ground: "#12041d", duration: 8 },
    { name: "tunnel", piece: "tunnel", options: {}, fps: 30, cols: 64, rows: 24, ink: "#8fd3ff", ground: "#040a14", duration: 8 },
    { name: "tv-static", piece: "tv-static", options: { set: true }, fps: 20, cols: 58, rows: 26, ink: "#e8e8e8", ground: "#141414", duration: 8 },
    { name: "night-coast", piece: "night-coast", options: {}, fps: 15, cols: 200, rows: 100, ink: "#d8dfea", ground: "#080b12", duration: 8 },
    { name: "ocean-sunset", piece: "ocean-sunset", options: {}, fps: 15, cols: 200, rows: 100, ink: "#ffdcc0", ground: "#0b0817", duration: 8 },
  ];
  if (typeof module === "object" && module && module.exports) module.exports = presets;
  else root.ASCII_ART_PRESETS = presets;
})(typeof globalThis !== "undefined" ? globalThis : this);
