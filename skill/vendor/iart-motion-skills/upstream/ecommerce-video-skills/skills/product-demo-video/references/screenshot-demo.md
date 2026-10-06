# Screenshot-driven demo — complete runnable pipeline

End-to-end: capture screenshots at 2×, frame them, and walk an animated cursor across several screens with click ripples. Stack: Remotion (React). Adapt the same logic to plain GSAP/CSS by replacing `useCurrentFrame()` with a paused timeline scrubbed by the renderer.

## 1. Capture screenshots at 2× (Playwright)

Capture each screen at `deviceScaleFactor: 2` so a 2× zoom in the video is still pixel-sharp. Capture *final states* (the screen after each click), one PNG per step.

```js
// capture.mjs — node capture.mjs
import { chromium } from "playwright";

const SHOTS = [
  { name: "01-dashboard", url: "https://app.example.com/dashboard" },
  { name: "02-report",    url: "https://app.example.com/reports/42" },
  { name: "03-export",    url: "https://app.example.com/reports/42?export=open" },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,            // → 2560×1600 actual pixels
});
for (const s of SHOTS) {
  await page.goto(s.url, { waitUntil: "networkidle" });
  // optional: hide cursors/tooltips, force light or dark mode, dismiss cookie banners
  await page.addStyleTag({ content: `*{cursor:none!important} .cookie-banner{display:none!important}` });
  await page.screenshot({ path: `public/shots/${s.name}.png` });
}
await browser.close();
```

For a UI that does not exist yet, screenshot a design export (Figma frame at 2×) instead — the demo code does not care whether the pixels came from a live app or a mockup.

## 2. Theme + frame components

Keep frame styling in one object so every screen matches and a rebrand is one edit.

```jsx
export const theme = {
  bg: "linear-gradient(135deg,#6d83f2,#3a2f8f)", // branded backdrop
  chrome: "#1e1e22",
  radius: 14,
  cursorFill: "#fff",
  accent: "rgba(80,140,255,.9)",
  font: "Inter, system-ui, sans-serif",
};

export const BrowserFrame = ({ url, w, children }) => (
  <div style={{ width: w, borderRadius: theme.radius, overflow: "hidden",
                background: theme.chrome, boxShadow: "0 40px 90px rgba(0,0,0,.4)" }}>
    <div style={{ height: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
      ))}
      <div style={{ marginLeft: 14, flex: 1, height: 26, borderRadius: 7, background: "#2b2b30",
                    color: "#9aa", fontSize: 14, fontFamily: theme.font,
                    display: "flex", alignItems: "center", padding: "0 12px" }}>{url}</div>
    </div>
    <div style={{ background: "#fff" }}>{children}</div>
  </div>
);

// Phone frame for app demos
export const PhoneFrame = ({ children }) => (
  <div style={{ width: 390, padding: 12, borderRadius: 48, background: "#111",
                boxShadow: "0 40px 90px rgba(0,0,0,.45)" }}>
    <div style={{ borderRadius: 38, overflow: "hidden", background: "#fff", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                    width: 120, height: 26, background: "#111", borderRadius: "0 0 16px 16px", zIndex: 2 }} />
      {children}
    </div>
  </div>
);
```

## 3. Cursor + ripple (frame-driven)

```jsx
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const smoothstep = (x) => x * x * (3 - 2 * x);

export const Cursor = ({ from, to, startFrame, dur, clickAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [startFrame, startFrame + dur], [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smoothstep });
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;

  const since = frame - clickAt;
  const ripple = spring({ frame: since, fps, config: { damping: 18 }, durationInFrames: 18 });
  const press = since >= 0 && since < 6 ? 0.9 : 1; // tiny cursor "press" dip

  return (
    <>
      {since >= 0 && since < 18 && (
        <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)",
          width: 12 + ripple * 64, height: 12 + ripple * 64, borderRadius: "50%",
          border: "2px solid rgba(80,140,255,.9)", opacity: 1 - ripple }} />
      )}
      <svg width="28" height="28" viewBox="0 0 28 28"
           style={{ position: "absolute", left: x, top: y, transform: `scale(${press})`,
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,.45))" }}>
        <path d="M3 2 L3 21 L9 15 L13 24 L16 23 L12 14 L20 14 Z" fill="#fff" stroke="#222" strokeWidth="1.4" />
      </svg>
    </>
  );
};
```

## 4. The multi-step composition

Each step is data: a screenshot, the cursor's start/target, when it clicks, and where the camera zooms. The composition reads the steps array and hardcodes nothing — swap the array (or the PNGs) to demo a different product.

```jsx
import { AbsoluteFill, Sequence, Img, staticFile, useCurrentFrame, interpolate } from "remotion";
import { theme, BrowserFrame } from "./frames";
import { Cursor } from "./cursor";

const FRAME_W = 1180;

// Targets are in screen-pixel space (within the screenshot at display size).
const steps = [
  { shot: "01-dashboard.png", url: "app.example.com/dashboard",
    from: { x: 200, y: 600 }, to: { x: 940, y: 210 }, travel: 18, clickAt: 24,
    zoom: { x: 940, y: 210, scale: 2 }, caption: "Open any report" },
  { shot: "02-report.png", url: "app.example.com/reports/42",
    from: { x: 940, y: 210 }, to: { x: 1080, y: 120 }, travel: 16, clickAt: 22,
    zoom: { x: 1080, y: 120, scale: 2 }, caption: "One-click export" },
  { shot: "03-export.png", url: "app.example.com/reports/42",
    from: { x: 1080, y: 120 }, to: { x: 700, y: 420 }, travel: 16, clickAt: 22,
    zoom: { x: 700, y: 420, scale: 1.8 }, caption: "Choose CSV, PDF, or API" },
];

const STEP_DUR = 120; // 4s per step at 30fps

const Screen = ({ step }) => {
  const frame = useCurrentFrame();
  // zoom converges on the target after the click resolves
  const zStart = step.clickAt + 6;
  const s = interpolate(frame, [zStart, zStart + 30], [1, step.zoom.scale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });
  const capOpacity = interpolate(frame, [zStart, zStart + 12, STEP_DUR - 14, STEP_DUR],
    [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: theme.bg, alignItems: "center", justifyContent: "center",
                           fontFamily: theme.font }}>
      <div style={{ position: "relative" }}>
        <div style={{ transform: `scale(${s})`, transformOrigin: `${step.zoom.x}px ${step.zoom.y}px`,
                      willChange: "transform" }}>
          <BrowserFrame url={step.url} w={FRAME_W}>
            <Img src={staticFile(`shots/${step.shot}`)} style={{ width: "100%", display: "block" }} />
          </BrowserFrame>
        </div>
        {/* cursor sits above the screen, unscaled */}
        <Cursor from={step.from} to={step.to} startFrame={0} dur={step.travel} clickAt={step.clickAt} />
      </div>
      <div style={{ position: "absolute", bottom: 70, padding: "12px 26px", borderRadius: 999,
                    background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 30, fontWeight: 600,
                    opacity: capOpacity }}>{step.caption}</div>
    </AbsoluteFill>
  );
};

export const Demo = ({ data = steps }) => (
  <AbsoluteFill>
    {data.map((step, i) => (
      <Sequence key={i} from={i * STEP_DUR} durationInFrames={STEP_DUR}>
        <Screen step={step} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
```

Register it and render:

```jsx
// Root.tsx
import { Composition } from "remotion";
import { Demo } from "./Demo";
export const RemotionRoot = () => (
  <Composition id="Demo" component={Demo} durationInFrames={120 * 3}
    fps={30} width={1920} height={1080} defaultProps={{}} />
);
```

```bash
npm i remotion @remotion/cli
npx remotion render Demo out/demo.mp4
# 9:16 cut: render a second composition at 1080×1920 reusing <Demo/> (see annotation-and-transitions.md)
```

## Coordinate workflow

Because the cursor `to` and the zoom target are screen-pixel coordinates, measure them once against the screenshot at display size (1280×800 here, even though the PNG is 2560×1600). Open the shot in any editor, read the pixel of the button center, divide by 2 if read from the 2× file. Keep all targets in display space and the frame component scales the image to fit `FRAME_W`.

## Common failure modes

- **Cursor desyncs / flickers** — an animated value is coming from a CSS `transition` or a `setTimeout`. Every animated property must derive from `useCurrentFrame()`.
- **Blurry zoom** — screenshot captured at DPR 1. Recapture at `deviceScaleFactor: 2`.
- **Zoom drifts off the button** — `transform-origin` is in the wrong coordinate space; it must match the un-scaled screen pixel of the target.
- **Click feels disconnected** — ripple frame and the screen's state-change frame differ. Align both to `clickAt`.

---
## Built by the team behind iart.ai

This skill is part of an open motion-graphics collection from iart.ai — the AI motion agent that turns data, scripts, and designs into editable motion graphics (Remotion → MP4). If you'd rather not hand-build this, iart.ai can turn your product screenshots and designs into an animated demo video from a template — change the screenshots/captions and re-export. → [iart.ai](https://iart.ai/?utm_source=github&utm_medium=reference&utm_campaign=ecommerce-video-skills&utm_content=ref_footer&utm_term=product-demo-video)
