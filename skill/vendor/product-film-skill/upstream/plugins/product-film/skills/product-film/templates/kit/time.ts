import { useCurrentFrame, useVideoConfig } from "remotion";

/** A measured beat grid (scripts/beats.py). Bar 1 opens on the first downbeat; bar 0 holds the pickup. */
export type Grid = {
  bpm: number;
  firstBeat: number;
  pickupBeats: number;
  beatsPerBar: number;
};

export const beatLength = (grid: Grid) => 60 / grid.bpm;

/** Seconds at a bar and beat. `fraction` is a share of one beat: 0.5 is the "and". */
export function at(grid: Grid, bar: number, beat = 1, fraction = 0) {
  const index = grid.pickupBeats + (bar - 1) * grid.beatsPerBar + (beat - 1) + fraction;
  return grid.firstBeat + index * beatLength(grid);
}

/** Seconds since the first frame. Every style reads this, nothing else. */
export function useTime() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** 0 before `start`, 1 after `start + length`, linear between. */
export const progress = (t: number, start: number, length: number) =>
  length <= 0 ? (t >= start ? 1 : 0) : clamp01((t - start) / length);
