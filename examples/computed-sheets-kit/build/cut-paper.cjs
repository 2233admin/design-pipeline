"use strict";

// Cut-paper emblems: one subject in the middle (a figure stacked from strips, or an animal), emblems of
// its world packed around it, khaki four- and eight-point stars, on white with soft grey blotches. Every
// shape carries a brushed texture (fingerprint whorls, wood grain, dry-brush skips), torn edges and a
// thin orange / blue offset fringe. The rasters come from cut_*.py (library: cut.py); this page frames them.
const { emit } = require("./common.cjs");
const W = 1080, H = 1080, BG = "#F4F3F1";
for (const [name, file, title] of [
  ["CutCartographer", "cut-cartographer.jpg", "Cut-paper emblem · the cartographer"],
  ["CutSquirrel", "cut-squirrel.jpg", "Cut-paper emblem · the squirrel"],
  ["CutClaude", "cut-claude.jpg", "Cut-paper emblem · self-portrait as a game character"],
]) emit(name, title, W, H, "", `<image href="../art/${file}" x="0" y="0" width="${W}" height="${H}"/>`, BG);
