# Logo Animation Patterns — Cookbook

Self-contained, runnable recipes for every logo technique. Pick ONE per logo.

## Timing guidance

| Beat | Duration | Easing |
|---|---|---|
| Stroke draw-on (per path) | 0.6–1.2s | `cubic-bezier(.65,0,.35,1)` (easeInOutCubic) |
| Mask wipe reveal | 0.5–0.9s | `cubic-bezier(.22,1,.36,1)` (easeOutQuint) |
| Build-on per piece | 0.4–0.6s, stagger 0.06–0.10s | `back.out(1.5)` |
| Morph | 0.6–1.0s | `power2.inOut` |
| Final settle / overshoot | 0.12–0.20s | scale 1.04→1.00, `power2.out` |
| Full reveal envelope | 0.8–2.5s total | — |
| Idle loop cycle | 1.5–4s, infinite | `sine.inOut` / `linear` for spin |

Rule of thumb: longer marks (wordmarks, detailed monograms) sit near 2.0–2.5s; simple icons near 0.8–1.4s. Hold the settled mark at least 0.4s before any sign-off cut.

## Brand clearspace & geometry rules

- **Clearspace**: keep a margin equal to the mark's cap-height (or the brand's defined unit) clear of moving particles, wipes, or overshoot. Motion must not visually crop into the safe margin.
- **No distortion**: scale uniformly, fade, translate, rotate-on-axis, and mask are safe. Avoid non-uniform `scaleX≠scaleY`, skew, and squash on the final mark — they read as off-brand. A squash-and-settle is acceptable ONLY as a sub-0.2s micro-overshoot that returns to 1.0.
- **Color**: never animate brand color away from spec mid-reveal. Reveal in brand color, or grayscale→brand as an intentional, approved beat.
- **Lockup integrity**: animate the symbol and wordmark with a clear hierarchy (symbol leads, wordmark follows) but land both in the exact locked relationship.

## 1. Stroke draw-on (SVG + CSS)

```html
<svg viewBox="0 0 240 80" id="mark">
  <path class="ink" pathLength="1" fill="none" stroke="#0A84FF"
        stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
        d="M12 64 L48 16 L84 64 M120 16 L120 64 M156 16 H204"/>
</svg>
<style>
  #mark .ink {
    stroke-dasharray: 1; stroke-dashoffset: 1;
    animation: draw 1.1s cubic-bezier(.65,0,.35,1) forwards;
  }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @media (prefers-reduced-motion: reduce){
    #mark .ink { animation: none; stroke-dashoffset: 0; }
  }
</style>
```

Draw-then-fill (line settles into a solid mark):

```css
#mark .ink { fill: transparent; }
@keyframes fill { to { fill: #0A84FF; stroke-width: 0; } }
#mark .ink { animation: draw 1.1s cubic-bezier(.65,0,.35,1) forwards,
                        fill .3s ease .9s forwards; }
```

GSAP equivalent with per-path stagger via DrawSVGPlugin:

```js
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
gsap.registerPlugin(DrawSVGPlugin);
gsap.fromTo("#mark .ink",
  { drawSVG: "0%" },
  { drawSVG: "100%", duration: 1.0, ease: "power2.inOut", stagger: 0.15 });
```

## 2. Mask wipe / build-on (clipPath)

Reveal a filled mark by sweeping a clip rect across it.

```html
<svg viewBox="0 0 200 80">
  <defs>
    <clipPath id="wipe"><rect id="wiper" x="0" y="0" width="0" height="80"/></clipPath>
  </defs>
  <g clip-path="url(#wipe)">
    <!-- the full filled logo art here -->
    <path d="M10 10 H190 V70 H10 Z" fill="#111"/>
  </g>
</svg>
<style>
  #wiper { animation: wipe .8s cubic-bezier(.22,1,.36,1) forwards; }
  @keyframes wipe { to { width: 200px; } }
  @media (prefers-reduced-motion: reduce){ #wiper{ animation:none; width:200px; } }
</style>
```

Directional variants: animate `y`/`height` for a top-down build, or use a radial `<clipPath>` with a growing `<circle r>` for an iris reveal.

## 3. Build-on with stagger (GSAP timeline)

```js
import gsap from "gsap";
const tl = gsap.timeline({ defaults: { ease: "back.out(1.6)" } });
tl.from("#base",   { scale: .8, opacity: 0, transformOrigin: "50% 50%", duration: .5 })
  .from(".accent", { scale: .7, opacity: 0, transformOrigin: "50% 50%",
                     duration: .45, stagger: 0.08 }, "-=0.2")
  .from(".word > *", { yPercent: 120, opacity: 0, duration: .4,
                       stagger: 0.04, ease: "power3.out" }, "-=0.15")
  .to("#mark", { scale: 1.04, duration: .12, ease: "power2.out" })
  .to("#mark", { scale: 1.0,  duration: .14, ease: "power2.inOut" });
```

## 4. Morph (GSAP MorphSVG)

Morph requires two paths; MorphSVG handles differing point counts.

```js
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
gsap.registerPlugin(MorphSVGPlugin);
// #shape: a simple start shape (e.g. circle path) -> #logoPath: the brand mark
gsap.to("#shape", {
  duration: .9, ease: "power2.inOut",
  morphSVG: { shape: "#logoPath", shapeIndex: "auto" }
});
```

No-plugin fallback (Flubber for interpolation + requestAnimationFrame):

```js
import { interpolate } from "flubber";
const from = "M10,10 ...", to = "M0,0 ...";
const lerp = interpolate(from, to, { maxSegmentLength: 2 });
const path = document.querySelector("#shape");
const dur = 900, t0 = performance.now();
(function frame(now){
  const k = Math.min(1, (now - t0) / dur);
  const e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2; // easeInOutQuad
  path.setAttribute("d", lerp(e));
  if (k < 1) requestAnimationFrame(frame);
})(t0);
```

## 5. Seamless idle loop (loader)

Loop must have identical start and end frames — design the cycle so frame 0 == frame N.

```css
#loader { animation: spin 1.4s linear infinite, pulse 2.8s ease-in-out infinite; }
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100%{ opacity:.85 } 50%{ opacity:1 } }
@media (prefers-reduced-motion: reduce){
  #loader { animation: pulse 2.8s ease-in-out infinite; } /* drop rotation */
}
```

GSAP `yoyo` loop for a breathing mark:

```js
gsap.to("#mark", { scale: 1.03, duration: 1.4, ease: "sine.inOut",
                   yoyo: true, repeat: -1 });
```

## 6. Lottie delivery (designer-made)

Export from After Effects via Bodymovin to `.json`, or compressed `.lottie`.

```html
<canvas id="logo-canvas" width="512" height="512"></canvas>
<script type="module">
  import { DotLottie } from "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/+esm";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dl = new DotLottie({
    canvas: document.querySelector("#logo-canvas"),
    src: "/logo.lottie", autoplay: !reduce, loop: false, speed: 1,
  });
  // Reduced motion: jump to the final settled frame, no playback.
  if (reduce) dl.addEventListener("load", () => dl.setFrame(dl.totalFrames - 1));
  // Sound-logo sync: fire audio when the settle frame is reached.
  dl.addEventListener("frame", ({ currentFrame }) => {
    if (currentFrame >= SETTLE_FRAME && !audioFired) { audio.play(); audioFired = true; }
  });
</script>
```

Classic `lottie-web` (SVG renderer, sharpest for vector logos):

```js
import lottie from "lottie-web";
const anim = lottie.loadAnimation({
  container: document.getElementById("logo"),
  renderer: "svg", loop: false, autoplay: !reduce, path: "/logo.json",
});
if (reduce) anim.goToAndStop(anim.totalFrames - 1, true);
```

Lottie tips: keep layers/effects Bodymovin-supported (no native blurs/expressions unless baked), name layers cleanly, and request a poster PNG of the final frame from the designer for the static fallback.

## 7. Reduced-motion fallback (always ship)

Every delivery must degrade to the static, fully-revealed mark:

- **CSS/SVG**: `@media (prefers-reduced-motion: reduce)` sets the final state (`stroke-dashoffset:0`, `width:full`, `opacity:1`) with `animation:none`.
- **Lottie**: `goToAndStop(totalFrames-1)` / `setFrame(last)`.
- **Video**: serve a poster image of the last frame; only autoplay motion when motion is allowed.
- **JS gate**: branch on `matchMedia("(prefers-reduced-motion: reduce)").matches` before building any timeline.

---
Match the reveal to the delivery target and a logo lands across web, video, and app. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=motion-design-skills&utm_content=skill_footer&utm_term=logo-animation)** — the AI motion agent for editable, on-brand motion graphics.
