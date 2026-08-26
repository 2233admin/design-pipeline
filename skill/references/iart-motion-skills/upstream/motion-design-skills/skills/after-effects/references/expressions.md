# Expressions, Rigging & MOGRT

After Effects is GUI software, so this delivers knowledge: ready-to-paste JavaScript expressions, rigging setups that make motion controllable, and template/export pipelines. Expressions read on the property they are pasted on; `value` is that property's keyframed/static value, `time` is the composition time in seconds, and `index`, `thisLayer`, `thisComp` are in scope.

For a deeper cookbook (tuned inertial bounce, every loop variant, advanced per-axis wiggle, `valueAtTime` echoes, `seedRandom` grids, full rigging walkthrough, Essential Graphics → MOGRT steps, Lottie/Bodymovin + Media Encoder presets), see `expression-library.md`.

## Core expressions

### Inertial bounce (overshoot after the last keyframe)

Paste on a Position, Scale, or Rotation property. It continues the velocity at the final keyframe into a damped sine — the classic "settle" motion.

```js
amp = 0.08;   // overshoot amount
freq = 2.5;   // oscillations per second
decay = 6.0;  // how fast it settles
n = 0;
if (numKeys > 0) {
  n = nearestKey(time).index;
  if (key(n).time > time) n--;
}
if (n > 0) {
  t = time - key(n).time;
  v = velocityAtTime(key(n).time - 0.001);
  value + v * (amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t));
} else {
  value;
}
```

### Looping

```js
loopOut("cycle");        // repeat keyframed range forever
loopOut("pingpong");     // bounce back and forth
loopOut("offset");       // continue, accumulating (e.g. continuous travel)
loopOut("continue");     // extend final velocity linearly
loopOut("cycle", 2);     // loop only the last 2 keyframes
loopIn("cycle");         // mirror, before the first keyframe
```

### Wiggle and stable randomness

```js
wiggle(2, 30);              // 2 wiggles/sec, amplitude 30 (units match the property)
seedRandom(index, true);   // unique-but-stable per layer; timeless=true
random(0, 100);            // stable after seedRandom
wiggle(freq, amp, octaves=1, amp_mult=0.5, t=time);  // full signature
```

`seedRandom(index, true)` before `random()` or `wiggle()` makes each layer differ but stay constant across renders — essential for grids of layers that must not flicker.

### Time remap & value-at-time

```js
// Sample another property/layer at a shifted time (echo/trailing motion)
delay = 0.2 * index;
thisComp.layer("Lead").transform.position.valueAtTime(time - delay);

// Speed up a precomp via time remap
linear(time, 0, thisComp.duration, 0, 6);  // 6s source mapped over comp duration
```

## Rigging

Make motion controllable instead of hand-keyed:

1. Add a null/control layer (often a "Controls" layer). Add **Slider Control**, **Checkbox Control**, **Color Control**, **Angle Control**, or **Point Control** effects to it.
2. Reference them with the pick-whip or by path:

```js
ctrl = thisComp.layer("Controls");
amt  = ctrl.effect("Intensity")("Slider");      // Slider Control → ADBE Slider Control-0001
on   = ctrl.effect("Enable")("Checkbox");       // Checkbox: 1 or 0
col  = ctrl.effect("Tint")("Color");

if (on == 1) value * amt else value;
```

3. Parent transforms to a null so one move drives many layers. Use `toComp`/`fromComp` to convert coordinate spaces when layers are parented or in different comps.

```js
// Stagger N layers off one master slider
master = thisComp.layer("Controls").effect("Reveal")("Slider");
delay  = 4 * index;     // 4 frames per layer
master.valueAtTime(time - framesToTime(delay));
```

## Essential Graphics / MOGRT

1. Open **Window → Essential Graphics**, pick the comp as the Master.
2. Drag the Slider/Checkbox/Color/Text source properties into the panel to expose them.
3. Group, rename, and set comment fields for editors.
4. **Export Motion Graphics Template** → a `.mogrt` usable in Premiere Pro / AE. Keep driving expressions referencing the exposed controls so editors change only the exposed params.

Set "Allow fonts to substitute" off and embed/package fonts where possible so the template renders consistently elsewhere.

## Export from expressions/template work

### To Lottie (Bodymovin / `@lottiefiles/bodymovin`)

- Stick to Lottie-supported features: shape layers, transforms, masks, track mattes, basic expressions converted to keyframes.
- Avoid blur-heavy effects, blend modes, 3D layers, and most native effects — they don't translate.
- Bake expressions to keyframes if the renderer is strict, or use the `expressions` flag in Bodymovin and test on the target player (web/iOS/Android renderers differ).
- Run **Bodymovin → Render** to produce `data.json` (+ optional images). Verify in a Lottie preview before handoff.

### To video (Media Encoder)

- **File → Export → Add to Adobe Media Encoder Queue** (or render queue for AE-native).
- Delivery: **H.264** (MP4), bitrate ~10–20 Mbps for 1080p, VBR 2-pass.
- Master/intermediate: **ProRes 422 HQ** (or ProRes 4444 when alpha is needed).
- Transparency: ProRes 4444 or PNG/QuickTime with an alpha channel; H.264 cannot carry alpha. (See `export-recipes.md` for the full codec/alpha/bitrate matrix.)

## Quick reference

| Goal | Expression |
|---|---|
| Loop keyframes | `loopOut("cycle")` |
| Continuous travel | `loopOut("offset")` |
| Subtle life | `wiggle(2, 20)` |
| Stable per-layer random | `seedRandom(index,true); random(...)` |
| Settle/overshoot | inertial bounce (above) |
| Echo another layer | `valueAtTime(time - delay)` |
| Read a slider | `effect("Name")("Slider")` |
| Frames ↔ seconds | `framesToTime(n)` / `timeToFrames(t)` |

## Gotchas

- An expression overrides keyframes on that property unless it incorporates `value`; start most expressions from `value`.
- `index` is the layer's stacking number — it changes if layers are reordered; prefer named lookups for stable rigs.
- Expression errors disable the expression and show a yellow banner; check the property's path names (effect names must match exactly, including duplicates' suffixes).
- Pre-compose for reuse; name layers; use shy/lock and guide layers for safe areas before handoff.
</content>
</invoke>
