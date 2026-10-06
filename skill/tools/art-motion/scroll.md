# Caller-driven long-scroll helper

`scroll.js` provides a seekable horizontal route through caller-defined world segments. It lays
out segments contiguously, inserts timed interaction pauses, evaluates actor and camera state from
absolute elapsed seconds, and can draw the route in a Canvas 2D context. It supplies no scene,
character, artwork, camera behavior, aspect ratio, speed, scale, direction or total duration.

In Node, load it with `const { createLongScroll } = require("./scroll.js")`. In a browser, load
`scroll.js` and use `ArtMotionScroll.createLongScroll(...)`.

## Required options

- `segments`: 1–1000 segment objects in traversal order. Every segment needs a unique nonempty
  `id`, positive world-space `width`, and `groundAt(x, context)`, which returns the world-space y
  coordinate of the ground at world x. Adjacent ground heights must match at their shared
  boundary unless the caller explicitly selects a positive `groundTolerance`.
- `viewport`: positive `width` and `height` in output pixels.
- `start`: `{ x, y }`; `x` must be exactly the first segment's entry boundary. The route starts
  at `y` at time zero. Later y comes from `groundAt` unless a segment's `actorAt` supplies a pose.
- `speed`: positive world units per second. Walking duration for each distance is distance/speed.
- `camera(state, viewport)`: return finite world-space `{ x, y }` for the camera's top-left.
- `actorBounds(actor, state, viewport)`: return the caller's actor rectangle in world coordinates.
  It determines which segment actor callbacks overlap and should draw.

Optional top-level options are `direction` (`1` or `-1`, default `1`), positive `scale` (default
`1`), `groundTolerance` (default `0`), and `earnedItemsAt(state, segments)`. That last callback must
return an array and is evaluated on each state request, so derive it from time/state instead of
mutating accumulated state.

## Segment and interaction callbacks

A segment may provide:

- `actorAt({ distance, progress, x, time, phase, viewport, segment })` to supply an actor world
  point `{ x, y }`. Return `null` or `undefined` to use the default ground point.
- `interactions`: each interaction needs `at` within `0..segment.width` in world units from the
  segment entry and a positive `duration` in seconds. The helper sorts these by `at`, retaining
  input order for ties. An optional `id` is included in returned state, and
  `poseAt(localSeconds, globalSeconds)` may return caller-owned pose data. The actor stays at the
  interaction distance during its pause; the pause adds to total duration but does not change route
  distance.
- `drawBackground(context, frame)`, `drawActor(context, frame)`, `drawForeground(context, frame)`,
  and `drawSeam(context, frame)`. Backgrounds draw first, then each intersecting segment's actor
  treatment, then foregrounds for occlusion, then seam callbacks.
- `clip(context, frame, bounds)` to define the actor's clipping path for that segment. If omitted,
  the helper clips to the segment rectangle. It then calls `context.clip()` itself.

The helper invokes `drawActor` once for each visible segment intersected by `actorBounds`; this lets
the same caller-owned actor pose receive different adjacent world treatments across a seam. Keep
`actorAt`, camera, ground, earned-item, and drawing decisions deterministic from supplied state if
you need repeatable reverse seeking.

Drawing callbacks receive a `frame` object with `state`, `segment`, `viewport`, `scale`, `camera`,
`time` and `globalTime` (the same absolute seconds), `localTime` (time within the current walk or
interaction phase), `mode`, `interaction`, `earnedItems`, `actor`, and a compact `world` layout.
`context` is already transformed into world coordinates: the helper applies scale and camera
translation before invoking callbacks. Callback geometry and `actorBounds` therefore use world
units. The Canvas surface itself clips drawing to the viewport.

## Example

```js
const { createLongScroll } = require("./scroll.js");

const scene = createLongScroll({
  viewport: { width: 1280, height: 720 },
  start: { x: 0, y: 510 },
  speed: 180,
  direction: 1,
  scale: 1,
  groundTolerance: 0,
  segments: [
    {
      id: "meadow",
      width: 900,
      groundAt: x => 510 + 12 * Math.sin(x / 140),
      actorAt({ x, progress, segment }) {
        // Caller-owned motion adds a small arc without changing route distance.
        return { x, y: segment.groundAt(x) - 28 * Math.sin(Math.PI * progress) };
      },
      interactions: [{
        id: "pause-and-look",
        at: 420,
        duration: 1.4,
        poseAt(localSeconds, globalSeconds) { return { lookAmount: localSeconds / 1.4, globalSeconds }; },
      }],
      drawBackground(ctx, { segment }) {
        ctx.fillStyle = "#d8ebf4";
        ctx.fillRect(segment.x0, 0, segment.width, 720);
      },
      drawActor(ctx, { actor }) { drawMeadowTreatment(ctx, actor); },
      clip(ctx, frame, bounds) {
        // Optional custom clip path; draw() calls ctx.clip() afterwards.
        ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      },
    },
    {
      id: "interior",
      width: 640,
      groundAt: x => 510 + 12 * Math.sin(x / 140),
      drawBackground(ctx, { segment }) {
        ctx.fillStyle = "#453f55";
        ctx.fillRect(segment.x0, 0, segment.width, 720);
      },
      drawActor(ctx, { actor }) { drawInteriorTreatment(ctx, actor); },
      drawForeground(ctx, { segment }) { drawCallerOwnedOccluders(ctx, segment); },
      drawSeam(ctx, { boundary }) { drawCallerOwnedSeam(ctx, boundary); },
    },
  ],
  camera(state, viewport) {
    return { x: state.actor.x - viewport.width / 2, y: state.actor.y - viewport.height / 2 };
  },
  actorBounds(actor) { return { x: actor.x - 22, y: actor.y - 60, width: 44, height: 60 }; },
  earnedItemsAt(state) { return state.time >= 4 ? [{ id: "found-object" }] : []; },
});

const state = scene.stateAt(3.2); // Same input time yields the same state for reverse seeking.
const durationSeconds = scene.layout().durationSec;
scene.draw(canvas.getContext("2d"), 3.2);
```

`drawMeadowTreatment`, `drawInteriorTreatment`, `drawCallerOwnedOccluders`, and `canvas` above
belong to the consuming project; the helper creates none of them. The sample ground functions
match at the shared x boundary, as required.

## Returned API and limits

- `layout()` returns viewport, start, speed, direction, scale, computed duration, segment world
  boundaries and walking/interaction phases.
- `stateAt(seconds)` returns actor position, current segment, distance/progress, phase-local time,
  interaction state, caller-provided earned items and camera state. `seconds` must be in
  `0..durationSec`.
- `draw(context, seconds)` draws the callbacks in layer order and returns that state. It expects a
  Canvas 2D context. The helper does not own or resize the canvas, produce exports, provide
  responsive layout, validate creative continuity, or guarantee visual acceptance.

This is a horizontal segment layout with configurable traversal direction. It does not define the
project's route, lens, framing, speed, actor, orientation, or style. Treat its computed duration as
the sum of travel time and interaction pauses; scene-specific holds beyond those pauses remain the
caller's responsibility.
