# Annotations, captions & screen-to-screen transitions

Frame-driven implementations for the layers that turn a framed screenshot into a readable demo: spotlight highlights, callout connectors, a typed feature-caption track, and the four screen transitions. All values derive from `useCurrentFrame()` so renders are deterministic.

## Spotlight highlight (dim the surround)

The cheapest way to direct the eye: cut a transparent hole over the focal element and dim everything else. A huge `box-shadow` spread fills the frame with the dim color, leaving only the element lit.

```jsx
const Spotlight = ({ rect, startFrame }) => {
  const frame = useCurrentFrame();
  const dim = interpolate(frame, [startFrame, startFrame + 12], [0, 0.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h,
      borderRadius: 10, boxShadow: `0 0 0 9999px rgba(0,0,0,${dim})`,
      outline: "2px solid rgba(80,140,255,.9)" }} />
  );
};
```

For a ring-only highlight (no dim), drop the `box-shadow` and animate `outline` width with a `spring` for a quick pulse.

## Callout connector (arrow + label)

Point at the element, then clear. Animate the connector drawing in, hold, fade out.

```jsx
const Callout = ({ from, to, label, startFrame, hold = 60 }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [startFrame, startFrame + 14], [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });
  const out = interpolate(frame, [startFrame + hold, startFrame + hold + 12], [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = from.x + (to.x - from.x) * draw;
  const y = from.y + (to.y - from.y) * draw;
  return (
    <g opacity={out}>
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={from.x} y1={from.y} x2={x} y2={y} stroke="#fff" strokeWidth="2.5" />
        <circle cx={to.x} cy={to.y} r={6 * draw} fill="#508cff" />
      </svg>
      <div style={{ position: "absolute", left: from.x, top: from.y - 36, transform: "translateX(-50%)",
        background: "#fff", color: "#111", padding: "6px 14px", borderRadius: 8, fontWeight: 600,
        whiteSpace: "nowrap" }}>{label}</div>
    </g>
  );
};
```

Rule: one callout on screen at a time. Annotate the moment, fade it, then move on — stacked callouts compete and read as clutter.

## Typed feature-caption track

Captions are data, not hardcoded JSX. A track maps each caption to a window of frames, so editing copy or retiming is a one-line change and the same track can render in any aspect.

```jsx
const captions = [
  { text: "Open any report",          in: 30,  out: 110 },
  { text: "One-click export",         in: 150, out: 230 },
  { text: "Choose CSV, PDF, or API",  in: 270, out: 350 },
];

const CaptionTrack = ({ track = captions }) => {
  const frame = useCurrentFrame();
  const active = track.find((c) => frame >= c.in && frame < c.out);
  if (!active) return null;
  const o = interpolate(frame, [active.in, active.in + 8, active.out - 8, active.out],
    [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [active.in, active.in + 8], [16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center",
      opacity: o, transform: `translateY(${y}px)` }}>
      <span style={{ background: "rgba(0,0,0,.62)", color: "#fff", padding: "12px 28px",
        borderRadius: 999, fontSize: 32, fontWeight: 600 }}>{active.text}</span>
    </div>
  );
};
```

Copy rule: one benefit per caption, a noun phrase not a sentence ("Real-time analytics", not "You can see your analytics update in real time"). Enter on the zoom-in, exit before the transition.

## Screen-to-screen transitions

Pick one transition language for the whole demo. Each below is frame-driven; place the outgoing and incoming screens in adjacent `<Sequence>`s and crossfade/translate in the overlap.

```jsx
// Push (slide) — outgoing exits left, incoming enters from right
const Push = ({ progress, children }) => (
  <div style={{ transform: `translateX(${interpolate(progress, [0, 1], [0, -100])}%)` }}>{children}</div>
);

// Cross-zoom — outgoing scales up & fades, incoming scales from 1.08 → 1
const CrossZoom = ({ progress, outgoing, incoming }) => (
  <>
    <div style={{ position: "absolute", inset: 0, opacity: 1 - progress,
      transform: `scale(${1 + progress * 0.15})` }}>{outgoing}</div>
    <div style={{ position: "absolute", inset: 0, opacity: progress,
      transform: `scale(${1.08 - progress * 0.08})` }}>{incoming}</div>
  </>
);
```

| Transition | Implementation note | Best for |
|---|---|---|
| Push / slide | translateX the pair in the overlap window | Linear step-by-step walkthroughs |
| Cross-zoom | scale + opacity crossfade (above) | Diving into a detail / sub-view |
| Crossfade | opacity 0↔1 over ~10 frames | Neutral context switch |
| Match-cut | keep a shared card at the same screen position across both shots, fade the rest | Same element persists between screens |

Timing: 8–14 frames of overlap (≈0.3–0.5s) at 30fps. Always let the current step's click resolve before starting the transition — never cut mid-cursor-move.

## Multi-aspect: 16:9 and 9:16

Render a 16:9 master, then reframe (don't letterbox) for vertical. Reuse the same `<Demo/>` component inside a second composition sized 1080×1920; scale the framed screen to fit width and stack the caption in the lower third.

| Aspect | Resolution | Caption zone | Note |
|---|---|---|---|
| 16:9 | 1920×1080 | bottom 80–120px | Landing hero, YouTube |
| 9:16 | 1080×1920 | center 80% width, above bottom 18% | Reels/Shorts; keep cursor targets within center 80% |

Keep cursor targets and zoom focal points inside the center 80% so they survive the vertical crop. Captions live in the title-safe lower third in both aspects, so the caption track is identical across renders — only the frame size and the screen's scale-to-fit change.

## Pacing reference

| Demo length | Steps | Per-step budget |
|---|---|---|
| 15s | 3–4 | ~3.5s (tight: shorter holds) |
| 30s | 5–7 | ~4s (the default) |
| 60–90s | 8–14 | ~4–5s (room for longer holds on dense screens) |

Never speed up by shortening the *settle* and *read* holds — speed up by cutting steps. A demo that out-paces reading converts worse than a shorter one that the viewer follows.
