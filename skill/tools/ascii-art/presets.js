/*
 * The preset table for ascii-art.js. Choose a row by name with index.html#<name>,
 * index.html?preset=<name>, the Preset control, or data-preset on the page's <html> element.
 *
 *   piece     the ascii.rest piece in pieces.js
 *   options   overrides for the piece's own option defaults
 *   fps       the sample rate: frames sit at k / fps seconds
 *   cols/rows the piece's grid, checked against the piece itself
 *   ink       the one colour of a text piece drawn mono, a cell no paint rule holds, and the controls
 *   ground    the colour behind the art
 *   duration  seconds that renderStudy(0..1) and the live loop cover; duration × fps ≤ 3600
 *   paint     how a text piece's cells are coloured, one colour a cell; a scene (a piece with its
 *             own palette) colours its cells itself and takes no paint. The first rule that holds a
 *             drawn cell colours it:
 *               glyphs   the glyphs the rule holds, as an array of strings; every glyph when left out
 *               rows     [first, last] rows the rule holds; every row when left out
 *               by       "glyph": each glyphs string takes the colour at its place;
 *                        "row" / "column": the colours spread evenly down the rule's rows or
 *                        across the columns; left out for a rule with one colour
 *               colours  #rrggbb colours, never blended
 *   mono      true draws a text piece as text in its one ink; index.html?mono does the same for
 *             any text preset. A scene has no one-ink form.
 */
(function (root) {
  "use strict";
  const presets = [
    {
      name: "donut", piece: "donut", options: {}, fps: 30, cols: 40, rows: 22, ink: "#f4efe6", ground: "#101010", duration: 8,
      // lit from the upper left: shadowed plum through vermilion and amber to a cream highlight
      paint: [{ glyphs: [".,", "-~", ":;", "=!", "*#", "$@"], by: "glyph", colours: ["#7d2448", "#a8323f", "#d24c38", "#ee7c37", "#f8b44c", "#ffe9a8"] }],
    },
    {
      name: "donut-paper", piece: "donut", options: {}, fps: 30, cols: 40, rows: 22, ink: "#22201c", ground: "#f2ede3", duration: 8,
      // on paper the piece flips its ramp, so the light strokes are the lit side: ochre to aubergine
      paint: [{ glyphs: [".,", "-~", ":;", "=!", "*#", "$@"], by: "glyph", colours: ["#d08a3c", "#c0622f", "#9e3f2c", "#76282f", "#4d1e3a", "#2a1736"] }],
    },
    {
      name: "doom-fire", piece: "doom-fire", options: {}, fps: 24, cols: 60, rows: 18, ink: "#ff8a3d", ground: "#0f0705", duration: 8,
      // the classic fire ramp by heat: embers, deep red, red, orange, yellow, white
      paint: [{ glyphs: [".", ":", ";", "!", "+", "*", "#", "%", "@"], by: "glyph", colours: ["#4a0f07", "#721508", "#a01d08", "#cb2d0a", "#e9500e", "#f87c19", "#ffaa2b", "#ffd84d", "#fff6d9"] }],
    },
    {
      name: "fireworks", piece: "fireworks", options: {}, fps: 30, cols: 64, rows: 24, ink: "#fff3d6", ground: "#06081a", duration: 8,
      paint: [
        // the burst flash burns white; the rest takes its hue from its fifth of the sky, so shells
        // bursting left, centre and right come up rose, gold and cyan, and wide ones run into the next
        { glyphs: ["@"], colours: ["#fffaf0"] },
        { by: "column", colours: ["#b86bff", "#ff4f8b", "#ffc93f", "#3fd8ff", "#7dff9a"] },
      ],
    },
    {
      name: "matrix-rain", piece: "matrix-rain", options: {}, fps: 20, cols: 63, rows: 24, ink: "#5dfc8d", ground: "#020b05", duration: 8,
      // white-hot heads, a bright collar, a green body thinning to dark trails
      paint: [{ glyphs: ["@#%&$", "acdeghkmnorsuvxz", "0123456789ABCDEFHKMNPRSTXZ", "=+*<>", ":;!|il^~", ".,'`"], by: "glyph", colours: ["#effff3", "#a6ffbe", "#52ec80", "#2fbf5e", "#1f8e44", "#146432"] }],
    },
    {
      name: "rotozoomer", piece: "rotozoomer", options: {}, fps: 30, cols: 64, rows: 24, ink: "#e0c9a6", ground: "#17120e", duration: 8,
      // brick by surface: shadowed bevel, face, side-lit and top-lit bevels, over dark mortar; the
      // shade glyphs are dithers, so their colours are brighter than the brick they read as
      paint: [{ glyphs: ["░", "▒", "▓", "█"], by: "glyph", colours: ["#8a3b26", "#d65a3a", "#f08a52", "#ffd3a1"] }],
    },
    {
      name: "sparks", piece: "sparks", options: {}, fps: 30, cols: 64, rows: 20, ink: "#ffc861", ground: "#0b0b0d", duration: 8,
      paint: [
        // the plate: a lit top edge over its front face
        { rows: [17, 19], by: "row", colours: ["#a3adbd", "#5c6472", "#3e4451"] },
        // sparks by heat: white at the bite, yellow, orange, red, and amber streaks
        { glyphs: ["#@", "*", "+", "·", ".", "-/|\\"], by: "glyph", colours: ["#fff5d6", "#ffd84a", "#ff9b2e", "#ff5c1f", "#c4361a", "#ffb347"] },
        // the grinder in cool steel, so the sparks stand off it
        { glyphs: ["░", "▒", "▓", "█", "▘▝▀▖▌▞▛▗▚▐▜▄▙▟"], by: "glyph", colours: ["#33414f", "#4f6478", "#7590a6", "#b2c6d6", "#8fa8bc"] },
      ],
    },
    {
      name: "synthwave", piece: "synthwave", options: {}, fps: 20, cols: 65, rows: 28, ink: "#ff5fd2", ground: "#12041d", duration: 8,
      paint: [
        // the sun, yellow at the top through orange and pink to magenta at the horizon
        { glyphs: ["▀▄█"], rows: [2, 11], by: "row", colours: ["#fff27a", "#ffc83f", "#ff933a", "#ff5f6d", "#ff3f9c", "#e03ccf"] },
        // the ridge's outline, then the stars
        { glyphs: ["/\\_"], rows: [0, 11], colours: ["#b26bff"] },
        { rows: [0, 11], colours: ["#fbe9ff"] },
        // the floor, magenta at the horizon to cyan at the viewer
        { rows: [12, 27], by: "row", colours: ["#ff3fd4", "#d94dff", "#a65cff", "#7a6dff", "#4f8dff", "#3fc8ff", "#3ff0ff"] },
      ],
    },
    {
      name: "tunnel", piece: "tunnel", options: {}, fps: 30, cols: 64, rows: 24, ink: "#8fd3ff", ground: "#040a14", duration: 8,
      // hue by depth: the piece shades by fog, so the far end's faint strokes are violet and the near walls cyan-white
      paint: [{ glyphs: [".", ",", ":", ";", "-", "=", "+", "*", "#", "%", "@"], by: "glyph", colours: ["#2c1b63", "#3d2486", "#4f2fa8", "#5e3dc8", "#4f61e2", "#3f88ef", "#2fb2f0", "#36d4e6", "#70f0d8", "#b6fbe8", "#f2fffb"] }],
    },
    {
      name: "tv-static", piece: "tv-static", options: { set: true }, fps: 20, cols: 58, rows: 26, ink: "#e8e8e8", ground: "#141414", duration: 8,
      paint: [
        // the picture: a grey ramp with a faint cold phosphor tint
        { glyphs: [".", ":", "+", "░", "▒", "▓", "█"], rows: [7, 21], by: "glyph", colours: ["#4b5357", "#6b7579", "#8c979b", "#aab5b9", "#c5cfd2", "#dde5e7", "#f2f7f8"] },
        // the set around it, and the card's circle and cross, in warm bakelite
        { colours: ["#c9a37a"] },
      ],
    },
    { name: "aurora-fjord", piece: "aurora-fjord", options: {}, fps: 15, cols: 200, rows: 100, ink: "#d6e0f2", ground: "#05080f", duration: 8 },
    { name: "night-coast", piece: "night-coast", options: {}, fps: 15, cols: 200, rows: 100, ink: "#d8dfea", ground: "#080b12", duration: 8 },
    { name: "ocean-sunset", piece: "ocean-sunset", options: {}, fps: 15, cols: 200, rows: 100, ink: "#ffdcc0", ground: "#0b0817", duration: 8 },
  ];
  if (typeof module === "object" && module && module.exports) module.exports = presets;
  else root.ASCII_ART_PRESETS = presets;
})(typeof globalThis !== "undefined" ? globalThis : this);
