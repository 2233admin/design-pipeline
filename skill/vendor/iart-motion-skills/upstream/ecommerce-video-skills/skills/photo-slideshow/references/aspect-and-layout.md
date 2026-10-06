# Aspect ratios & layout

A real photo folder mixes portrait phone shots (3:4, 9:16), landscape cameras (3:2, 4:3), and the odd square. The frame is one fixed shape. **Never stretch a photo to fit** — non-uniform scaling distorts faces and is the most jarring error in a slideshow. Choose a fitting strategy instead.

## The three strategies

| Strategy | What it does | Trade-off | Use when |
|---|---|---|---|
| **Blurred pad** | photo fit (`contain`) over a scaled+blurred copy of itself (`cover`) | none visually; the modern default | mixed orientations |
| **Fill / cover** | photo fills the frame, edges cropped off | crops the subject's edges | photos roughly match frame shape |
| **Fit / letterbox** | photo fully visible on a solid/gradient | dead bars | every pixel matters (art, documents) |

Blurred-pad wins for mixed folders: it fills the frame, never crops the subject, and the soft blur reads as intentional depth rather than empty bars.

## Orientation detection

Decide per photo from its natural dimensions (read during manifest building, or via `Img` `onLoad`). A photo is "matched" to the frame if its aspect ratio is within ~15% of the frame's.

```js
function fitStrategy(imgW, imgH, frameW, frameH) {
  const imgAR = imgW / imgH, frameAR = frameW / frameH;
  const mismatch = Math.abs(imgAR - frameAR) / frameAR;
  return mismatch < 0.15 ? "cover" : "blurred-pad";
}
```

## Blurred-pad component

Render the source twice: a `cover` layer scaled up and blurred behind, the `contain` sharp photo in front. The Ken Burns transform applies to the **front** photo only; keep the blurred layer static (or pan it a touch slower) so it reads as a backdrop.

```jsx
import { AbsoluteFill, Img } from "remotion";

export const BlurredPad = ({ src, children }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {/* blurred backdrop: cover + scale up so blur edges never show */}
    <Img src={src} style={{
      width: "100%", height: "100%", objectFit: "cover",
      transform: "scale(1.15)", filter: "blur(40px) brightness(0.7)",
    }} />
    {/* sharp foreground photo, fully visible; Ken Burns wraps this */}
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children /* the <KenBurnsImage> with objectFit: contain */}
    </AbsoluteFill>
  </AbsoluteFill>
);
```

Note: for the foreground photo inside a blurred-pad, switch `KenBurnsImage`'s `objectFit` to `contain` (so the whole photo shows) and keep the pan amount small — a `contain` image has less room to travel before showing a gap.

### FFmpeg blurred-pad (one photo)

```bash
ffmpeg -i photo.jpg -filter_complex \
  "[0]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=40[bg];\
   [0]scale=1920:1080:force_original_aspect_ratio=decrease[fg];\
   [bg][fg]overlay=(W-w)/2:(H-h)/2" -frames:v 1 padded.png
```

## Multi-aspect export & safe zones

Compose with a center safe zone so one master reframes cleanly to every platform — don't just letterbox a 16:9 into 9:16.

| Aspect | Use | Resolution | Safe zone |
|---|---|---|---|
| 16:9 | YouTube, desktop, TV | 1920×1080 | captions within center 90% |
| 9:16 | Reels, TikTok, Shorts, Stories | 1080×1920 | text in center 80% height; avoid top 12% / bottom 18% (UI overlays) |
| 1:1 | Feed posts | 1080×1080 | center square of the 16:9 frame |

Keep titles, dates and the outro CTA inside the **1:1 center square** so they survive every crop. For vertical (9:16) slideshows of mostly-landscape photos, blurred-pad is almost mandatory — a landscape photo `contain`-fit into 9:16 leaves huge bars that the blur turns into a full, finished frame.

Render the composition once per aspect (different `width`/`height` and safe-zone props); the photos, motion and timing stay identical.
