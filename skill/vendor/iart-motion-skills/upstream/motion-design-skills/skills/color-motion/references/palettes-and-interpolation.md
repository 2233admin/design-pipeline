# Palettes, gradients, interpolation, and grading

Exact recipes and runnable code. OKLCH notation: `oklch(L C H)`, L in 0-1 perceptual lightness, C chroma (0 to ~0.37), H hue degrees.

## Palette construction rules

1. **Count**: 1 primary, 1 accent, 2-3 neutrals. Resist adding hues.
2. **Contrast from lightness**: build a 5-9 step ramp by varying L while holding C and H roughly constant, nudging chroma down at the extremes (very light/dark colors can't hold high chroma).
3. **Accent placement**: accent hue should sit 90-180deg from the primary on the OKLCH wheel for clean separation; complementary (~180deg) is boldest, analogous (~30deg) is calmest.
4. **Neutral tinting**: give neutrals a tiny chroma (0.005-0.02) in the primary's hue family so the frame feels unified, not assembled from separate kits.
5. **Dark-scene accents**: high L (0.7-0.85), moderate C (0.12-0.18). Avoid max chroma — it vibrates on dark backgrounds.

### Generating a tonal ramp (hold hue, vary lightness)

```
oklch(0.97 0.03 264)   // 50
oklch(0.92 0.06 264)   // 100
oklch(0.84 0.10 264)   // 200
oklch(0.74 0.14 264)   // 300
oklch(0.66 0.18 264)   // 400
oklch(0.58 0.19 264)   // 500  (base)
oklch(0.50 0.17 264)   // 600
oklch(0.40 0.14 264)   // 700
oklch(0.28 0.10 264)   // 800
oklch(0.18 0.06 264)   // 900
```

Note chroma rises toward the mid-lightness band and falls at both ends — this matches what's physically representable and looks natural.

### Named starter palettes (OKLCH)

```
// "Midnight product" — confident, techy
primary  oklch(0.62 0.19 264)   accent oklch(0.78 0.17 50)
bg       oklch(0.16 0.02 264)   fg     oklch(0.97 0.005 264)

// "Warm editorial" — premium, soft
primary  oklch(0.55 0.12 25)    accent oklch(0.80 0.10 90)
bg       oklch(0.96 0.01 60)    fg     oklch(0.25 0.03 25)

// "Neon dark" — energetic, bold
primary  oklch(0.72 0.20 150)   accent oklch(0.68 0.24 330)
bg       oklch(0.14 0.03 280)   fg     oklch(0.95 0.02 150)
```

## Gradient cookbook

### Two-stop, vivid (OKLCH)

```css
background: linear-gradient(135deg in oklch, #2b6cff, #ffb02e);
/* control the hue arc explicitly */
background: linear-gradient(in oklch shorter hue, oklch(0.6 0.2 264), oklch(0.8 0.17 50));
```

`shorter hue` / `longer hue` / `increasing hue` / `decreasing hue` pick the direction around the wheel — `longer hue` produces rainbow sweeps, `shorter` the direct path.

### Mesh background (stacked radials)

```css
.mesh {
  background-color: #0b0f1a;
  background-image:
    radial-gradient(at 18% 22%, oklch(0.62 0.19 264 / 0.7), transparent 50%),
    radial-gradient(at 82% 28%, oklch(0.70 0.16 320 / 0.6), transparent 55%),
    radial-gradient(at 55% 88%, oklch(0.78 0.17 50  / 0.5), transparent 50%),
    radial-gradient(at 40% 50%, oklch(0.55 0.14 200 / 0.4), transparent 60%);
}
```

### Animated drift

```css
.mesh { background-size: 140% 140%; animation: drift 16s ease-in-out infinite alternate; }
@keyframes drift {
  0%   { background-position: 0% 0%; }
  100% { background-position: 12% -8%; }
}
```

### Conic

```css
background: conic-gradient(in oklch from 90deg, #2b6cff, #b02eff, #ffb02e, #2b6cff);
```

### Grain overlay (kills banding)

```html
<svg width="0" height="0">
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2"/></filter>
</svg>
```
```css
.grain::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  filter: url(#grain); opacity: 0.04; mix-blend-mode: overlay;
}
```

## Perceptual interpolation in code

### culori (JS) — interpolate and sample

```js
import { interpolate, formatHex, formatCss } from "culori";

// Interpolate in OKLCH (vivid midpoints, even lightness)
const mix = interpolate(["#2b6cff", "#ffb02e"], "oklch");
formatHex(mix(0.5));            // vivid mid, not gray

// Build N stops for an animated transition
const stops = Array.from({ length: 60 }, (_, i) => formatCss(mix(i / 59)));

// Control hue direction
import { fixupHueLonger } from "culori";
const rainbow = interpolate(["#2b6cff", "#ffb02e"], "oklch", {
  h: { use: fixupHueLonger },
});
```

### d3-interpolate / d3-scale-chromatic

```js
import { interpolateLab, interpolateHcl, quantize } from "d3-interpolate";

const lab = interpolateLab("#2b6cff", "#ffb02e");   // perceptual, smooth lightness
lab(0.5);                                            // mid color
const ramp = quantize(interpolateHcl("#2b6cff", "#ffb02e"), 8); // 8 even stops
```

`interpolateLab` and `interpolateHcl` avoid the sRGB gray-midpoint problem; `interpolateRgb` does not — only use RGB interpolation for near-identical colors.

### Animating a color with @property (CSS, browser interpolates)

```css
@property --from { syntax: "<color>"; initial-value: oklch(0.62 0.19 264); inherits: false; }
.swatch { background: var(--from); transition: --from 400ms cubic-bezier(0.16,1,0.3,1); }
.swatch.active { --from: oklch(0.78 0.17 50); }
```

Without `@property` registration the color snaps instead of interpolating. The browser interpolates registered `<color>` properties in OKLab by default — perceptually clean for free.

## Grading order checklist

Apply in this exact order; reordering changes the result.

1. **Exposure / white balance** — set overall brightness, neutralize or intentionally tint the cast.
2. **Contrast** — set black/white points, expand or compress tonal range.
3. **Midtones / saturation** — overall saturation and midtone color shift.
4. **Split-tone** — tint shadows and highlights separately. Cinematic default: teal shadows (`hue ~190`), orange highlights (`hue ~40`), kept subtle.
5. **Unify** — final overall tint / LUT and a gentle vignette.

### CSS-filter grade (quick, for web video/canvas)

```css
.graded {
  filter:
    brightness(1.02)      /* 1: exposure */
    contrast(1.12)        /* 2: contrast */
    saturate(1.08);       /* 3: saturation */
}
/* 4 split-tone: overlay a teal->orange gradient at low opacity with mix-blend-mode */
```

### Fragment-shader split-tone (GLSL sketch)

```glsl
vec3 graded = color;
float lum = dot(graded, vec3(0.2126, 0.7152, 0.0722));
vec3 shadowTint    = vec3(0.0, 0.45, 0.5);   // teal
vec3 highlightTint = vec3(1.0, 0.6, 0.2);    // orange
graded = mix(graded, graded * shadowTint,    (1.0 - lum) * 0.12);
graded = mix(graded, graded + highlightTint * 0.06, lum);
```

Keep split-tone strength under ~0.15; over-tinting reads as a cheap Instagram filter. Grade the whole piece with the same chain so cuts match.

---
Interpolate color in perceptual space and gradients shift without muddy mids. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=motion-design-skills&utm_content=skill_footer&utm_term=color-motion)** — the AI motion agent for editable, on-brand motion graphics.
