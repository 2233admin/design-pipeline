---
name: product-demo-video
description: This skill should be used when the user asks to "make a product demo video", "create an app demo video", "build a feature announcement video", "do a SaaS demo", "make a UI walkthrough video", "animate product screenshots into a demo", "add an animated cursor/click to a screenshot", or "zoom into part of a UI". Covers turning static screenshots/designs (not screen recordings) into a clean animated demo: device/browser frames, animated cursor + click ripple, zoom/pan to focal UI, callout annotations, step pacing, screen-to-screen transitions, and feature captions.
version: 0.1.0
---

# Product Demo Video

Turn static product screenshots or designs into a polished, animated demo — no screen recorder, no jittery real cursor, no UI version drift. Frame each screen, glide a synthetic cursor to the exact pixel, ripple the click, then zoom to the part that matters and caption the feature. Because the input is static and the motion is code, every value is deterministic and re-renders identically when the screenshot changes.

## When to use

- App / SaaS demo, feature announcement, onboarding walkthrough (15–90s).
- Showing a *click path* through a UI you only have screenshots/designs of.
- Highlighting one focal region of a dense dashboard (zoom-to-region + callout).

## Why screenshots beat screen recordings

| Screen recording | Screenshot-driven (this skill) |
|---|---|
| Real cursor drifts, overshoots, jitters | Cursor follows an eased path to an exact target |
| Re-record the whole take to fix one step | Swap one PNG, re-render the same code |
| UI changes mid-take, mouse hunts | Each screen is a clean, final-state asset |
| Hard to zoom without pixelation | Export screenshots at 2× (DPR 2) → crisp zooms |

Capture inputs at twice the display size (retina / `deviceScaleFactor: 2`) so a 2× zoom stays sharp. See `references/screenshot-demo.md` for a Playwright capture script.

## The demo loop

Every demo is the same beat, repeated per feature. Hold long enough to read, move with intent, land the click, reveal the result.

| Beat | Budget | Job |
|---|---|---|
| Settle on screen | 0.5–1s | Let the viewer orient before anything moves |
| Cursor travels to target | 0.4–0.8s | Eased move (ease-in-out), not linear |
| Click ripple + state change | 0.2–0.3s | Tactile feedback; screen reacts on the same frame |
| Zoom to focal region | 1–2s in, hold 2–4s | 2× is the sweet spot — enough detail, keeps context |
| Caption the feature | hold with the zoom | One benefit phrase, e.g. "One-click export" |

Move the camera *or* the cursor, rarely both at once — two simultaneous motions split attention.

## Frame the screenshot

A raw screenshot reads as a bug report; a framed one reads as product. Wrap every screen in a browser or device chrome on a branded background.

```jsx
// Browser frame — drop a screenshot in, get a credible window
const BrowserFrame = ({ url, children }) => (
  <div style={{ borderRadius: 12, overflow: "hidden", background: "#1e1e22",
                boxShadow: "0 40px 80px rgba(0,0,0,.35)" }}>
    <div style={{ height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
      ))}
      <div style={{ marginLeft: 12, flex: 1, height: 24, borderRadius: 6, background: "#2b2b30",
                    color: "#9aa", fontSize: 13, display: "flex", alignItems: "center", padding: "0 10px" }}>
        {url}
      </div>
    </div>
    <div style={{ background: "#fff" }}>{children}</div>
  </div>
);
```

Put a real URL in the address bar (authenticity), add a soft shadow and a gradient backdrop. For mobile, swap to a phone frame with a notch and rounded corners. Keep the frame style in one theme object so every screen matches.

## Animated cursor + click ripple (the core move)

Drive position from the current frame, never from a CSS transition or wall clock — a video renderer needs every frame to be a pure function of the frame number, or the cursor desyncs and flickers.

```jsx
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

// Eased travel from `from` to `to` between startFrame and startFrame+dur
const useCursor = (from, to, startFrame, dur) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [startFrame, startFrame + dur], [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x * (3 - 2 * x) }); // smoothstep
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
};

export const Cursor = ({ from, to, startFrame, dur, clickAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { x, y } = useCursor(from, to, startFrame, dur);

  // Ripple expands once, at the click frame
  const since = frame - clickAt;
  const showRipple = since >= 0 && since < 18;
  const r = spring({ frame: since, fps, config: { damping: 18 }, durationInFrames: 18 });

  return (
    <>
      {showRipple && (
        <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)",
          width: 12 + r * 60, height: 12 + r * 60, borderRadius: "50%",
          border: "2px solid rgba(80,140,255,.9)", opacity: 1 - r }} />
      )}
      <svg width="28" height="28" viewBox="0 0 28 28"
           style={{ position: "absolute", left: x, top: y, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.4))" }}>
        <path d="M3 2 L3 21 L9 15 L13 24 L16 23 L12 14 L20 14 Z" fill="#fff" stroke="#222" strokeWidth="1.4" />
      </svg>
    </>
  );
};
```

The cursor uses **smoothstep** so it accelerates out of rest and decelerates into the target (a linear cursor reads as robotic). Fire the ripple *and* the screen's state change on the same `clickAt` frame so cause and effect line up. See `references/screenshot-demo.md` for the full composition wiring multiple clicks across multiple screens.

## Zoom to a region (Ken Burns for UI)

To zoom into a focal element, scale the screen and set `transform-origin` to that element's center, so the zoom converges on it instead of the frame center.

```jsx
const ZoomToRegion = ({ target, scale = 2, startFrame, dur, children }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [startFrame, startFrame + dur], [1, scale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) }); // easeOutCubic
  return (
    <div style={{ transform: `scale(${s})`, transformOrigin: `${target.x}px ${target.y}px`,
                  willChange: "transform" }}>
      {children}
    </div>
  );
};
```

Cap zoom around 2× (over 3× loses context and disorients). Hold the zoomed state 2–4s — long enough to read the detail — then ease back out before moving to the next screen. Pair the zoom with a callout, never raw.

## Callout annotations & feature captions

Annotate the inflection, then let it clear. A callout is a label + a connector (arrow, circle, or underline) that points at the focal element.

- **Highlight** the element with a soft ring or dimmed surround (`box-shadow: 0 0 0 9999px rgba(0,0,0,.45)` cuts a spotlight hole).
- **Caption** one benefit per beat — short noun phrase ("Real-time analytics"), not a sentence. Enter on the zoom, exit before the next step.
- **Keep captions in the lower third** and inside the title-safe area so they survive crops to 9:16.

See `references/annotation-and-transitions.md` for spotlight masks, arrow connectors, and a typed caption track.

## Screen-to-screen transitions

Between steps, move screens with one consistent language. Pick one and keep it:

| Transition | Feel | Use |
|---|---|---|
| Push / slide | "next step" forward motion | Linear walkthroughs |
| Cross-zoom | momentum, app-like | Jumping into a detail view |
| Crossfade | calm, neutral | Switching context (settings → dashboard) |
| Match-cut on a shared element | seamless | Same card persists across screens |

Hold the outgoing screen until its click resolves, then transition — never cut mid-motion. See `references/annotation-and-transitions.md`.

## Output checklist

- Inputs captured at 2× (DPR 2); zooms stay crisp at 2×.
- Every cursor/zoom value is a pure function of `useCurrentFrame()` — no CSS transitions for animated state.
- Cursor travels on an eased path (smoothstep); ripple and state change fire on the same click frame.
- Each screen framed (browser/device) with a real URL and consistent theme.
- One motion at a time (camera or cursor); zoom ≤ 2×, held 2–4s.
- One benefit caption per beat, in the title-safe lower third; transitions use one consistent language.

## Deliver & verify (rendered stills → MP4)

> **Packaged helper** (`scripts/`): tile your stills with `scripts/contact-sheet.sh sheet.png f-hook.png f-mid.png f-end.png`, then assert the encode with `scripts/probe-mp4.sh out.mp4 [WxH] [fps]`. See `scripts/README.md`.

This is heavy-tier: the deliverable is an MP4, not a live page. The demo ingests user assets — screenshots/designs, optional logo — so verification is mostly *did the right image actually load and land in frame*.

**Output contract:**
- A Remotion project with the composition registered (`<Composition>` + zod `schema` + `defaultProps`); every cursor/zoom/transition value a pure function of `useCurrentFrame()` (no CSS transitions, timers, `Date.now()`).
- Screenshots loaded via `staticFile()`, gated with `delayRender`/`continueRender` so the 2× PNG (and any web font) is present before the frame renders — otherwise the screen pops in blank mid-demo.
- Deliverable = the rendered `out/*.mp4` plus the project (re-render when the screenshot changes).

**Verify loop — render stills → inspect → encode.** Cheap PNGs first, video only once they're right.

```bash
# Frame-exact stills WITH THE PROPS YOU'LL SHIP (real screenshot paths), not defaultProps
npx remotion still ProductDemo out/f-settle.png --frame=15  --props=demo.json   # screen framed, before move
npx remotion still ProductDemo out/f-click.png  --frame=90  --props=demo.json   # cursor on target + ripple
npx remotion still ProductDemo out/f-zoom.png   --frame=150 --props=demo.json   # zoomed to focal region + caption
# end frame = durationInFrames - 1 (npx remotion compositions reads it)
```

Inspect each PNG for **fidelity** (correct screenshot loaded; cursor on the exact pixel; click ripple and state change on the same frame; caption text right) AND **artifacts** (image blank/not loaded, screen off-canvas, zoom pixelated or overshooting past the frame, caption out of the title-safe lower third, wrong aspect/letterboxing).

```bash
# Only after stills are clean:
npx remotion render ProductDemo out/demo.mp4 --props=demo.json
npx remotion render ProductDemo out/demo.gif --props=demo.json --codec=gif   # README first-screen proof
```

**Batch (one template, many products):** when re-skinning the demo per product, verify ONE representative product's props via stills before batch-rendering the catalog — catch a blank-image or off-canvas bug once, not N times.

**Before you finish:**
1. Stills render cleanly at settle / click / end — no errors, screenshots actually loaded (not blank).
2. Cursor lands on the exact target; ripple + state change on the same frame; caption text correct and in the title-safe lower third.
3. All motion frame-driven — no CSS transitions / timers / `Date.now()` / `Math.random()`.
4. The **shipped** props (real screenshot paths) render correctly, not just `defaultProps`.
5. Full MP4 encoded and plays; (optional) GIF rendered for the README.

## Reference files

- `references/screenshot-demo.md` — a complete runnable Remotion demo: capturing screenshots at 2× with Playwright, the browser/phone frame components, a multi-step composition that walks a cursor across several screens with click ripples, and a render command.
- `references/annotation-and-transitions.md` — spotlight masks, arrow/circle callout connectors, a typed feature-caption track, and the four screen-to-screen transitions with frame-driven implementations and multi-aspect (16:9 / 9:16) safe-area notes.
