import { step, type SpringConfig } from "./spring";
import { clamp01 } from "./time";

/**
 * Magic move: the same element travels from where it was to where the next
 * scene needs it, resizing on the way. No cards, no cuts: the element is the
 * transition.
 */
export type Rect = { x: number; y: number; w: number; h: number };

const glide: SpringConfig = { stiffness: 150, damping: 20, mass: 1 };

export function move(t: number, start: number, from: Rect, to: Rect, config: SpringConfig = glide): Rect {
  const u = step(t - start, config);
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u,
    w: from.w + (to.w - from.w) * u,
    h: from.h + (to.h - from.h) * u,
  };
}

/** Content arriving after a move lands, leaving just before the next: a short blur swap. */
export function swapIn(t: number, from: number, to: number, delay = 0.18, out = 0.1) {
  const enter = clamp01((t - from - delay) / 0.18);
  const leave = to === Infinity ? 0 : clamp01((t - (to - out)) / out);
  const value = enter * (1 - leave);
  return { opacity: value, filter: value < 1 ? `blur(${(1 - value) * 10}px)` : undefined, visible: value > 0 };
}

export const center = (rect: Rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
