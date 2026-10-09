/**
 * A free-form cursor path through timed stops (cubic Hermite with
 * Catmull-Rom velocities, in time), for moments where the cursor wanders
 * instead of hopping between targets. Stops listed in `hold` keep zero velocity
 * (the cursor rests there: the click, the beat after it).
 */
export type Stop = { t: number; x: number; y: number };

export function pathAt(stops: readonly Stop[], t: number, hold: readonly number[] = []) {
  if (t <= stops[0].t) return { x: stops[0].x, y: stops[0].y };
  const last = stops[stops.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y };
  const index = stops.findIndex((stop, i) => t >= stop.t && t < stops[i + 1].t);
  const [p0, p1] = [stops[index], stops[index + 1]];
  const velocity = (i: number, axis: "x" | "y") => {
    if (hold.includes(stops[i].t)) return 0;
    const before = stops[Math.max(0, i - 1)];
    const after = stops[Math.min(stops.length - 1, i + 1)];
    return (after[axis] - before[axis]) / (after.t - before.t);
  };
  const span = p1.t - p0.t;
  const u = (t - p0.t) / span;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
  const h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2;
  const h11 = u ** 3 - u ** 2;
  const along = (axis: "x" | "y") => h00 * p0[axis] + h10 * span * velocity(index, axis) + h01 * p1[axis] + h11 * span * velocity(index + 1, axis);
  return { x: along("x"), y: along("y") };
}

/**
 * Look-at keys for anything that follows the path (an arrow, a spotlight, a highlight):
 * every `every` seconds, the direction from `center` to the cursor as -1..1
 * (x over `reach.x`, y over `reach.y`). Feed them to sprung tracks.
 */
export function followKeys(stops: readonly Stop[], from: number, to: number, center: { x: number; y: number }, reach = { x: 600, y: 400 }, every = 0.1, hold: readonly number[] = []) {
  const keys: (readonly [time: number, x: number, y: number])[] = [];
  for (let time = from; time <= to + 1e-9; time += every) {
    const point = pathAt(stops, time, hold);
    keys.push([time, Math.max(-1, Math.min(1, (point.x - center.x) / reach.x)), Math.max(-1, Math.min(1, (point.y - center.y) / reach.y))] as const);
  }
  return keys;
}
