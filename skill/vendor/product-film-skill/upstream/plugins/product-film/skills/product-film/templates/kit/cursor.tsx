import { Easing } from "remotion";

import { clamp01 } from "./time";

/**
 * A cursor stop. `world` points follow the camera. The cursor arrives exactly
 * at `t` (it starts gliding up to 0.46 s earlier); a click fires on arrival.
 * `release` holds the button down until then.
 */
export type CursorKey = { t: number; x: number; y: number; world?: boolean; click?: boolean; release?: number };

const glide = Easing.bezier(0.42, 0, 0.12, 1);

/** Where the cursor is at `t`: curved glides between stops, a short squash on each click. */
export function cursorAt(t: number, keys: readonly CursorKey[], toScreen: (x: number, y: number) => { x: number; y: number }) {
  const points = keys.map((key) => ({ ...key, ...(key.world ? toScreen(key.x, key.y) : { x: key.x, y: key.y }) }));
  let x = points[0].x;
  let y = points[0].y;
  for (let index = 1; index < points.length; index++) {
    const to = points[index];
    if (t >= to.t) {
      x = to.x;
      y = to.y;
      continue;
    }
    const from = points[index - 1];
    const duration = Math.min(0.46, (to.t - from.t) * 0.82);
    const u = clamp01((t - (to.t - duration)) / duration);
    const eased = glide(u);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    // A slight arc, like a hand, never a ruler line.
    const bulge = Math.sin(Math.PI * u) * Math.min(70, length * 0.09);
    x = from.x + dx * eased - (dy / length) * bulge;
    y = from.y + dy * eased + (dx / length) * bulge;
    break;
  }

  let squash = 1;
  let pressed = false;
  for (const key of keys) {
    if (key.click && t >= key.t && t - key.t < 0.16) squash = Math.min(squash, 1 - 0.2 * Math.sin((Math.PI * (t - key.t)) / 0.16));
    if (key.release !== undefined && t >= key.t && t < key.release) pressed = true;
  }
  if (pressed) squash = Math.min(squash, 0.86);
  return { x, y, squash, pressed };
}

/** The user's cursor: the macOS arrow. Add the product's own cursor next to it if the product automates. */
export function UserCursor({ x, y, squash }: { x: number; y: number; squash: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <svg width={36} height={36} viewBox="0 0 24 24" style={{ position: "absolute", left: -7, top: -3, scale: String(squash), transformOrigin: "7px 3px", overflow: "visible" }}>
        <path d="M5 2 L5 19 L9.5 15.5 L12.5 22 L15.5 20.5 L12.5 14 L18.5 14 Z" fill="#ffffff" stroke="#000000" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
