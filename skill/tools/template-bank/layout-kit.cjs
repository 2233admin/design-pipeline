"use strict";

// Small geometry helpers shared by the game style packs' layouts (layouts-<style>.cjs). Boxes are
// [x, y, w, h] in canvas pixels; the check compares a slot's measured extent (after transforms)
// with its box, so a tilted slot's box is the axis-aligned bounds of its tilted local box.

const f1 = (v) => Number(v).toFixed(1);
const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function rotatePoint([x, y], deg, [cx, cy]) {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx; const dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

// Axis-aligned bounds of a box rotated by deg about (cx, cy), plus a pad.
function rbox([x, y, w, h], deg, centre, pad = 0) {
  const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map((p) => rotatePoint(p, deg, centre));
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
}

// Open a tilted group about (cx, cy); close it with d.raw("</g>").
function tilt(d, deg, cx, cy) { d.raw(`<g transform="rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})">`); }

// Deterministic generator for decoration that must not change between renders.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// A path ring for a regular polygon (circles the static check can measure as geometry).
function ngon(cx, cy, r, n = 16, start = 0) {
  return `M${Array.from({ length: n }, (_, i) => { const a = start + (i / n) * 2 * Math.PI; return `${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`; }).join(" L")}Z`;
}

// Horizontal chords of a disc: the horizon stripes of a city-pop or lithograph sun, drawn as
// rectangles inside the circle so no clip path is needed.
function discStripes(cx, cy, r, bands) {
  return bands.map(([t, h]) => {
    const y = cy - r + t * 2 * r;
    const half = Math.sqrt(Math.max(0, r * r - (y + h / 2 - cy) ** 2));
    return [cx - half, y, 2 * half, h];
  }).filter(([, , w]) => w > 1);
}

function invalid(message) { return Object.assign(new Error(message), { code: "OPTION_VALUE_INVALID" }); }

module.exports = { f1, esc, rotatePoint, rbox, tilt, rng, ngon, discStripes, invalid };
