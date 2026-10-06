# Ken Burns — seeded per-photo motion

The goal: every still gets a slow, continuous pan+zoom, but **each photo moves differently** and the difference is **deterministic** (seeded by its index). Deterministic matters for video: a frame renderer may render frame 200 before frame 10, so randomness must come from a pure function of the index, never `Math.random()`.

## The motion vocabulary

Pick from a small, curated set so the set has variety without chaos. Eight moves cover it: zoom-in or zoom-out, crossed with a pan direction.

```js
// references/ken-burns.md — motion vocabulary
const MOVES = [
  { zoom: "in",  pan: [ 1,  0] }, // zoom in, drift right
  { zoom: "in",  pan: [-1,  0] }, // zoom in, drift left
  { zoom: "in",  pan: [ 0,  1] }, // zoom in, drift down
  { zoom: "in",  pan: [ 0, -1] }, // zoom in, drift up
  { zoom: "out", pan: [ 1,  1] }, // pull back, diagonal
  { zoom: "out", pan: [-1, -1] },
  { zoom: "out", pan: [ 1, -1] },
  { zoom: "in",  pan: [-1,  1] },
];
```

## Seeded PRNG

`mulberry32` is a tiny, fast, well-distributed 32-bit PRNG. Seed it with the photo index so photo 0 always gets the same move, but adjacent photos differ.

```js
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// derive a move + amounts for a given photo index
function motionFor(index) {
  const rng = mulberry32(index * 2654435761); // spread indices apart
  const move = MOVES[Math.floor(rng() * MOVES.length)];
  const zoomAmt = 0.06 + rng() * 0.06;         // 0.06–0.12 zoom delta (subtle)
  const panAmt  = 24 + rng() * 36;             // 24–60 px of drift
  // guarantee adjacent photos don't share a move: nudge if equal to previous
  return { move, zoomAmt, panAmt };
}
```

To hard-guarantee no repeats back-to-back, precompute moves for the whole list and re-roll any that equal the previous one — cheap, and worth it for the polish.

## The component

```jsx
import { useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill, Img } from "remotion";

export const KenBurnsImage = ({ src, index, durationInFrames, anchor = "50% 50%" }) => {
  const frame = useCurrentFrame();
  const { move, zoomAmt, panAmt } = motionFor(index);

  // p: 0 → 1 over the slide, eased like real Ken Burns (no jolt)
  const p = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });

  // start scale >= 1.05 so a pan never reveals an empty edge
  const base = 1.05;
  const [from, to] = move.zoom === "in"
    ? [base, base + zoomAmt]
    : [base + zoomAmt, base];
  const scale = from + (to - from) * p;

  const x = move.pan[0] * panAmt * p;
  const y = move.pan[1] * panAmt * p;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transformOrigin: anchor,
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
          willChange: "transform",
        }}
      />
    </AbsoluteFill>
  );
};
```

## Subject-aware anchoring

A pan that pushes a face out of frame looks broken. If subject coordinates are known (face detection, or a manual focal point in the manifest), set `transform-origin` toward the subject so it stays framed as the image scales.

```js
// focal point in 0–1 image space → transform-origin percentage
const anchor = focal ? `${focal.x * 100}% ${focal.y * 100}%` : "50% 50%";
```

Without detection, a useful heuristic: anchor portraits toward the upper third (faces sit high), landscapes at center.

## Why not animate width/height

Animating `width`/`height` (or `top`/`left`) triggers layout on every frame — it stutters and can flicker on a renderer. `transform: scale()/translate()` is composited on the GPU and is frame-exact. Always Ken Burns with `transform`.

## FFmpeg equivalent (`zoompan`)

When React/Remotion isn't available, FFmpeg's `zoompan` does Ken Burns directly. The pain points: `zoompan` defaults to a per-input-frame zoom (looks jerky on a single still) and pans in scaled-pixel space. Upscale first so the zoom is smooth, set `d` to the slide's frame count, and drive `z` off `on` (output frame number).

```bash
# 5s zoom-in on one photo at 30fps (150 frames), 1080p, smooth
ffmpeg -loop 1 -i photo.jpg -t 5 -r 30 -filter_complex \
  "scale=8000:-1,zoompan=z='min(zoom+0.0008,1.10)':d=150:\
   x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30" \
  -c:v libx264 -pix_fmt yuv420p out.mp4
```

For a pan instead of a center zoom, ramp `x` or `y` with `on` (e.g. `x='(iw-iw/zoom)*on/150'`). To vary motion per photo without code, generate each slide command from a seeded list in a shell/Python loop and concat the clips. Remotion is far easier for varied, beat-synced, captioned sets; reach for `zoompan` only for quick, uniform batches.
