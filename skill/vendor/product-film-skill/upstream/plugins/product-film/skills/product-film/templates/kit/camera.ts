import { track, type SpringConfig } from "./spring";

/** The frame the camera films. Change for 9:16 or other sizes. */
export const FRAME = { width: 1920, height: 1080 } as const;

/** Camera keys in world units: the world point at the frame's center, and the zoom. */
export type CameraKey = readonly [time: number, x: number, y: number, zoom: number];
export type Camera = { x: number; y: number; zoom: number };

/** Slow, heavy, no overshoot: a camera that feels held, not thrown. */
export const cameraSpring: SpringConfig = { damping: 30, mass: 1.2, stiffness: 120 };

/** The camera at time t. Zoom springs in log space, so a push reads the same at any scale. */
export function camera(t: number, keys: readonly CameraKey[], config: SpringConfig = cameraSpring): Camera {
  return {
    x: track(t, keys.map(([time, x]) => [time, x] as const), config),
    y: track(t, keys.map(([time, , y]) => [time, y] as const), config),
    zoom: Math.exp(track(t, keys.map(([time, , , zoom]) => [time, Math.log(zoom)] as const), config)),
  };
}

/** Screen position of a world point. */
export function project(view: Camera, x: number, y: number) {
  return { x: FRAME.width / 2 + (x - view.x) * view.zoom, y: FRAME.height / 2 + (y - view.y) * view.zoom };
}

/** CSS transform for a world layer (transform-origin 0 0). Never add will-change to it. */
export function worldTransform(view: Camera) {
  return `translate(${FRAME.width / 2}px, ${FRAME.height / 2}px) scale(${view.zoom}) translate(${-view.x}px, ${-view.y}px)`;
}
