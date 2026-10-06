# Intro & Outro — full reference

Deep recipes for the 3-5s branded intro and the last-20s end-screen outro: complete runnable components, a CSS/GSAP variant, the end-screen coordinate map, audio-impact sync, and the brand-template pipeline.

## 1. Timing conventions (why the numbers are what they are)

YouTube's algorithm watches the first seconds of every video for drop-off. A branded intro is a cost paid against retention, so it must be short and identical every time (repetition is what builds recognition).

| Piece | Length | Rule |
|---|---|---|
| Logo hit (the readable moment) | 1-2s | the brand mark must be legible inside 2s |
| Whole intro | 3-5s max | beyond 5s, retention drops measurably |
| End-screen window | last 5-20s | YouTube only renders elements here |
| Outro plate hold | ~20s | match the max element window so cards have a home |
| Minimum total video length | 25s | below this, end screens are not allowed at all |

Outro caveat: a 20s outro on a 4-minute video is fine, but on Shorts (≤60s) it eats the whole thing — for Shorts use a 2-3s end card and a verbal CTA instead of native end-screen elements (Shorts do not support them).

## 2. Logo sting — full Remotion composition

The sting is windup → impact → settle. The single most important detail is that the brand mark snaps to full on the **same frame** as the audio's loudest transient. Everything else is decoration.

```jsx
import {
  useCurrentFrame, useVideoConfig, spring, interpolate,
  Img, Audio, staticFile, AbsoluteFill,
} from "remotion";

export const LogoSting = ({brand}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const IMPACT = Math.round(0.8 * fps);   // logo lands here — must match the sting's hit
  const f = frame - IMPACT;

  // Windup: a faint, fast-growing glow before the hit (builds tension)
  const windup = interpolate(frame, [0, IMPACT], [0, 1], {extrapolateRight: "clamp"});

  // Impact: spring overshoots from 1.18 → 1. The overshoot IS the snap.
  const scale = spring({frame: f, fps, from: 1.18, to: 1, config: {damping: 9, mass: 0.5}});
  const logoOpacity = f < 0 ? 0 : 1;

  // The white flash on the hit, decaying over ~6 frames
  const flash = interpolate(f, [0, 6], [0.9, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  // Tagline fades in during the settle, then everything holds
  const tagline = interpolate(f, [10, 22], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return (
    <AbsoluteFill style={{background: brand.bg, alignItems: "center", justifyContent: "center"}}>
      <Audio src={staticFile(brand.sting)} />
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: 999,
        background: brand.accent, filter: "blur(120px)", opacity: windup * 0.5,
      }} />
      <div style={{textAlign: "center"}}>
        <Img src={staticFile(brand.logo)}
             style={{width: 420, opacity: logoOpacity, transform: `scale(${scale})`}} />
        <div style={{
          marginTop: 28, color: brand.fg, opacity: tagline,
          font: "600 34px Inter", letterSpacing: 1,
        }}>{brand.name}</div>
      </div>
      <AbsoluteFill style={{background: "#fff", opacity: flash}} />
    </AbsoluteFill>
  );
};
```

Composition registration (3.5s at 30fps):

```jsx
import {Composition} from "remotion";
import brand from "../brand.json";

<Composition id="Intro" component={LogoSting}
  durationInFrames={Math.round(3.5 * 30)} fps={30} width={1920} height={1080}
  defaultProps={{brand}} />
```

## 3. CSS / GSAP logo-sting variant (no Remotion)

For web embeds or quick HTML proofs. The same windup → impact → settle, driven by a GSAP timeline that an audio `play` event starts so picture and sound stay locked.

```html
<div class="sting"><img id="logo" src="logo.png"><div class="flash"></div></div>
<audio id="sfx" src="sting.mp3"></audio>
```
```css
.sting { position: fixed; inset: 0; display: grid; place-items: center; background: #0B0B14; }
#logo  { width: 420px; opacity: 0; }
.flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
```
```js
import gsap from "gsap";
const IMPACT = 0.8; // seconds — the sting's hit
const tl = gsap.timeline({paused: true});
tl.set("#logo", {opacity: 1, scale: 1.18}, IMPACT)
  .to("#logo", {scale: 1, duration: 0.22, ease: "back.out(3)"}, IMPACT)   // overshoot snap
  .fromTo(".flash", {opacity: 0.9}, {opacity: 0, duration: 0.25}, IMPACT) // white hit
  .to("#logo", {duration: 1.5}, ">");                                      // hold
const sfx = document.getElementById("sfx");
sfx.addEventListener("play", () => tl.play(0));
sfx.play();
```

## 4. Syncing the reveal to the audio impact

The reveal looks cheap when the logo lands a few frames off the sound. To find the impact frame in any sting:

1. Open the sting in any waveform view (Audacity, the DAW, even a quick Python plot). The impact is the tallest transient — usually a sub hit or a cymbal after the whoosh.
2. Read its time in seconds, e.g. 0.78s.
3. Set `IMPACT = Math.round(0.78 * fps)` and make the logo's `opacity`/`scale` snap key fall on that frame.
4. If you can't move code, instead trim the audio so its transient sits at your fixed `IMPACT` (e.g. 0.8s) — same result.

Rule of thumb: the whoosh occupies the windup; the hit marks the impact; the tail rings out under the settle. A reveal feels "expensive" when the white flash, the scale overshoot, and the loudest sample all share one frame.

## 5. End-screen coordinate map (16:9)

YouTube overlays clickable elements only on the **last 5-20s** and only on videos **≥25s**. Up to **4 elements** on a 16:9 video. Native element sizes are fixed; YouTube scales them per device, but design for 1920×1080. The active region is the **right two-thirds**; your own brand belongs in the **left third**; everything stays clear of corners and the bottom ~12% (mobile progress bar + controls).

```
1920 × 1080, origin top-left:

  +----------------------+---------------------------------+
  |  LEFT THIRD (≈0-640) |  RIGHT TWO-THIRDS (≈640-1920)   |
  |                      |                                 |
  |  logo      (80,90)   |   next-video card 615×345       |
  |  channel name        |   anchored right:90 top:110     |
  |  "Subscribe →"       |                                 |
  |                      |        subscribe circle 294×294 |
  |                      |        right:250 bottom:150     |
  +----------------------+---------------------------------+
        ↑ your branding lives here   ↑ leave empty for YouTube
   (bottom ~130px: keep clear — mobile progress bar / controls)
```

Element reference:

| Element | Native px | Notes |
|---|---|---|
| Video / playlist card | 615×345 | the money element; one per outro is plenty |
| Subscribe / channel circle | 294×294 | circular; place off the right edge, not in a corner |
| Link / approved-website card | 294×294 | rarely worth the slot |
| Max elements | 4 | highest CTR layout = **1 video card + subscribe**, nothing else |

Highest-converting layout is the simplest: one full next-video card on the right, a subscribe circle beside it, your brand quietly on the left. More elements split attention and lower clicks.

### 9:16 (Shorts) note

Shorts do **not** support native end-screen elements. For a vertical 1080×1920 outro, bake a visual "Subscribe" button and a "Watch next" thumbnail into the frame and rely on a spoken/on-screen CTA. Keep them within the center 80% of height; avoid the top ~10% and bottom ~18% where the Shorts UI (title, actions, progress) sits.

## 6. Outro plate with toggleable guides

Ship guides only in preview; the final render is a clean plate. Drive the toggle from a prop so the same component does both.

```jsx
import {useCurrentFrame, interpolate, Img, staticFile, AbsoluteFill} from "remotion";

export const EndScreen = ({brand, showGuides = false}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: "clamp"});
  const guide = showGuides
    ? {border: "2px dashed rgba(255,255,255,.25)", borderRadius: 12}
    : {};

  return (
    <AbsoluteFill style={{background: brand.bg, opacity: fade}}>
      <div style={{position: "absolute", left: 80, top: 90, width: 560}}>
        <Img src={staticFile(brand.logo)} style={{width: 220}} />
        <div style={{color: brand.fg, font: "700 56px Inter", marginTop: 24}}>{brand.name}</div>
        <div style={{color: brand.accent, font: "500 30px Inter", marginTop: 8}}>Subscribe for more →</div>
      </div>
      {/* right two-thirds: empty in final render; YouTube draws live elements here */}
      <div style={{position: "absolute", width: 615, height: 345, right: 90, top: 110, ...guide}} />
      <div style={{position: "absolute", width: 294, height: 294, right: 250, bottom: 150, borderRadius: 999, ...guide}} />
    </AbsoluteFill>
  );
};
```

Render the working plate without guides:

```jsx
<Composition id="Outro" component={EndScreen}
  durationInFrames={20 * 30} fps={30} width={1920} height={1080}
  defaultProps={{brand, showGuides: false}} />
```

After uploading, open YouTube Studio → end screen editor, turn on the grid and "snap to element", and drop the real subscribe + video elements onto the empty right-side zones you reserved.

## 7. Brand template & batch pipeline

Nothing brand-specific is hardcoded. One `brand` object feeds both compositions; swap it to re-skin everything.

```ts
// brand.ts — the schema
export type Brand = {
  name: string;     // channel name shown on the outro
  logo: string;     // file in /public, used by both intro and outro
  sting: string;    // audio file in /public; its impact transient defines IMPACT
  bg: string;       // background
  fg: string;       // primary text
  accent: string;   // glow / CTA color
};
```

```json
// brands/pixelforge.json
{ "name": "PixelForge", "logo": "pixelforge.png", "sting": "pixelforge-sting.mp3",
  "bg": "#0B0B14", "fg": "#FFFFFF", "accent": "#7C5CFF" }
```

```bash
# render intro + outro for every brand in /brands
for f in brands/*.json; do
  name=$(basename "$f" .json)
  npx remotion render Intro "out/${name}-intro.mp4" --props="$f"
  npx remotion render Outro "out/${name}-outro.mp4" --props="$f"
done
```

Keep fonts, sizes, timing, and layout fixed in the components — only `brand.json` changes. That is what makes a template: structural consistency across channels, identity supplied per render. To onboard a new channel, drop a logo + sting in `/public`, write one JSON file, and run the loop.

---
## Built by the team behind iart.ai

This skill is part of an open motion-graphics collection from iart.ai — the AI motion agent that turns data, scripts, and designs into editable motion graphics (Remotion → MP4). If you'd rather not hand-build this, iart.ai can produce branded intros/outros from a template — change the text/logo and re-export. → [iart.ai](https://iart.ai/?utm_source=github&utm_medium=reference&utm_campaign=youtube-video-skills&utm_content=ref_footer&utm_term=youtube-intro-outro)
