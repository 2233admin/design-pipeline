import type { CSSProperties } from "react";

import { clamp01 } from "./time";

/** The 4x4 Bayer matrix, normalized 0..1. A cell lights when BAYER[row & 3][col & 3] < value. */
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16));

export type Sweep = "up" | "down" | "left" | "right" | "out" | "in";

/**
 * Ordered-dither reveal: cells light in Bayer order under a front sweeping the
 * area; `band` is how soft the front is. Returns an SVG path of the lit cells
 * (use it as a clip-path `path("...")` or in a mask).
 */
export function bayerPath({ width, height, cell, progress, sweep = "up", band = 0.45, x = 0, y = 0 }: { width: number; height: number; cell: number; progress: number; sweep?: Sweep; band?: number; x?: number; y?: number }) {
  if (progress <= 0) return "";
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  if (progress >= 1) return `M${x} ${y}h${cols * cell}v${rows * cell}h${-cols * cell}z`;
  const front = progress * (1 + band);
  let d = "";
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const u = (col + 0.5) / cols;
      const v = (row + 0.5) / rows;
      const radial = Math.min(1, Math.hypot(u - 0.5, v - 0.5) * Math.SQRT2);
      const position = sweep === "up" ? 1 - v : sweep === "down" ? v : sweep === "left" ? 1 - u : sweep === "right" ? u : sweep === "out" ? radial : 1 - radial;
      if (BAYER[row & 3][col & 3] < clamp01((front - position) / band)) d += `M${x + col * cell} ${y + row * cell}h${cell}v${cell}h${-cell}z`;
    }
  }
  return d;
}

/** Style that dissolves an HTML element in (progress 0 to 1) with ordered dither, through a mask image. */
export function bayerReveal(width: number, height: number, progress: number, sweep: Sweep = "up", cell = 8): CSSProperties {
  if (progress >= 1) return {};
  if (progress <= 0) return { visibility: "hidden" };
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const context = canvas.getContext("2d");
  if (!context) return {};
  context.fillStyle = "#fff";
  context.fill(new Path2D(bayerPath({ width, height, cell, progress, sweep }) || "M0 0"));
  const image = `url(${canvas.toDataURL()})`;
  return { maskImage: image, WebkitMaskImage: image, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" };
}
