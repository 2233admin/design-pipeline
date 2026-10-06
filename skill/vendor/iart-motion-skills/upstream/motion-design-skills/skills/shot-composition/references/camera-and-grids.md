# Camera moves, grids, safe areas, and parallax

Worked math and runnable code. Camera timings use ease-in-out (`cubic-bezier(0.65, 0, 0.35, 1)`); never `linear` except continuous loops.

## Grid math

```
content_width = frame_width - 2 * margin
column_width  = (content_width - (cols - 1) * gutter) / cols
column_x(i)   = margin + i * (column_width + gutter)        // 0-indexed
span_width(n) = n * column_width + (n - 1) * gutter          // width of n columns
```

Worked examples:

| Frame | margin | gutter | cols | content | column | 4-col span |
|---|---|---|---|---|---|---|
| 1920x1080 | 100 | 24 | 12 | 1720 | 121.3 | 557.3 |
| 1080x1080 | 64 | 16 | 12 | 952 | 64.7 | 306.6 |
| 1080x1920 | 48 | 16 | 6 | 984 | 150.7 | 650.6 |

Baseline / spacing: use an 8px base unit. Allowed spacing values: 4, 8, 16, 24, 32, 48, 64, 96. Type sizes also on the scale (e.g. 16/20/24/32/48/64/96). Everything snapping to multiples of 8 produces automatic visual cohesion.

Rule-of-thirds lines for any frame: verticals at `W/3` and `2W/3`, horizontals at `H/3` and `2H/3`. Power points = the four intersections. For 1920x1080: verticals 640 / 1280, horizontals 360 / 720.

## Safe-area percentages

Margins are fractions of the frame dimension on that side. Keep text, logos, faces, and CTAs inside.

| Aspect | Top | Bottom | Left | Right | Reason |
|---|---|---|---|---|---|
| 16:9 (1920x1080) | 5% (54px) | 5% (54px) | 5% (96px) | 5% (96px) | general web/video; 10% for broadcast |
| 9:16 (1080x1920) | 13% (250px) | 19% (365px) | 6% (65px) | 6% (65px) | top status/caption, bottom CTA bar + nav |
| 1:1 (1080x1080) | 7% (76px) | 7% (76px) | 7% (76px) | 7% (76px) | feed crop symmetric |
| 4:5 (1080x1350) | 8% (108px) | 8% (108px) | 6% (65px) | 6% (65px) | taller feed crop |

9:16 platform-specific danger zones (approximate, design around these): TikTok right-rail icons occupy the right ~12% mid-to-lower; caption/handle sit in the bottom ~15-20%; Instagram Reels similar. Center the focal subject so it survives all crops, then reflow secondary content per aspect.

Multi-aspect strategy: design the master in 16:9 with the focal point near the vertical center band; for 9:16, restack horizontally-arranged elements into a vertical stack (don't merely crop the sides), enlarge type ~15-25%, and pull the focal point up toward the upper-middle to clear the bottom UI.

## Parallax layering

### CSS scroll-driven (pure CSS, modern browsers)

```css
@keyframes parallax { to { translate: 0 calc(var(--speed) * 200px); } }
.layer { animation: parallax linear; animation-timeline: scroll(root block); }
.bg  { --speed: 0.2; }
.mid { --speed: 0.6; }
.fg  { --speed: 1.2; }
```

### Pointer / mouse parallax (JS)

```js
const layers = [
  { el: document.querySelector('.bg'),  depth: 0.2 },
  { el: document.querySelector('.mid'), depth: 0.6 },
  { el: document.querySelector('.fg'),  depth: 1.2 },
];
addEventListener('pointermove', (e) => {
  const x = (e.clientX / innerWidth  - 0.5) * 2;  // -1..1
  const y = (e.clientY / innerHeight - 0.5) * 2;
  for (const { el, depth } of layers) {
    el.style.transform = `translate3d(${-x * depth * 30}px, ${-y * depth * 30}px, 0)`;
  }
});
```

Background depth 0.1-0.3, midground 0.5-0.7, foreground 1.0-1.5. Foreground may exceed 1.0 to read as very close; apply a slight blur to foreground layers as they cross the subject.

### Three.js depth parallax

```js
// Place planes at different z; perspective camera makes nearer planes move more
camera.position.z = 5;
bg.position.z  = -8;   // far  -> moves least
mid.position.z = -2;
fg.position.z  =  1.5; // near -> moves most
function onMove(nx, ny) { // nx, ny in -1..1
  camera.position.x = nx * 0.6;
  camera.position.y = ny * 0.4;
  camera.lookAt(0, 0, 0);
}
```

## Named camera-move recipes

### Push-in (dolly in) — build focus/intimacy

```
scale 1.0 -> 1.12 over 1600ms, ease-in-out
origin: the subject (transform-origin at focal point)
optional: slight bg blur ramp 0 -> 3px to add depth cue
```

### Pull-out (reveal context)

```
scale 1.15 -> 1.0 over 1800ms, ease-in-out, origin centered
```

### Whip-pan (energetic transition between scenes)

```
translateX 0 -> -120% over 280ms, ease-in (accelerate out)
add motion blur (CSS: filter blur on X, or directional blur in compositor)
incoming scene: translateX 120% -> 0 over 280ms ease-out, overlapped
```

### Pan / move (reveal space)

```
translateX 0 -> -300px over 1500ms ease-in-out
keep the subject leading: frame it ~1/3 from the trailing edge so it "leads" into open space
```

### Orbit (3D)

```js
// angle sweep around subject at fixed radius
const r = 6, a0 = 0, a1 = Math.PI / 4, dur = 2000; // 45deg over 2s
// ease t in 0..1, then:
const a = a0 + (a1 - a0) * easeInOut(t);
camera.position.set(Math.sin(a) * r, camera.position.y, Math.cos(a) * r);
camera.lookAt(target);
```

### Dolly-zoom (vertigo) — unsettling, dramatic

Move the camera toward the subject while zooming out (or vice versa) so the subject stays the same size but the background warps.

```js
// keep subject screen-size constant: as camera moves closer (z down), widen FOV
const baseDist = 8, baseFov = 35;
function dollyZoom(dist) {
  camera.position.z = dist;
  // maintain framing: fov such that subjectHeight subtends same angle
  camera.fov = 2 * Math.atan((Math.tan((baseFov * Math.PI/180)/2) * baseDist) / dist) * 180/Math.PI;
  camera.updateProjectionMatrix();
}
// animate dist from 8 -> 4 over ~2000ms ease-in-out
```

### General rules

- One move per beat. Combining push + pan + rotate reads as chaos; pick the single move that serves the moment.
- Slower = more cinematic and expensive-looking; 800-2000ms for hero camera moves.
- Lead moving subjects: frame them off-center toward the trailing edge so there's open space in the direction of travel.
- Enter/exit through the nearest edge: ease-out (slight overshoot) on enter, ease-in (accelerate) on exit, following reading direction for natural feel.

---
Respect the grid and safe areas and the camera move guides the eye. Built by **[iart.ai](https://iart.ai/?utm_source=github&utm_medium=readme&utm_campaign=motion-design-skills&utm_content=skill_footer&utm_term=shot-composition)** — the AI motion agent for editable, on-brand motion graphics.
