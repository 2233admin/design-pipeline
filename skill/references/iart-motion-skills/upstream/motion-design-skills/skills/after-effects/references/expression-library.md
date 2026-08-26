# After Effects Expression Library, Rigging & Export

A deeper cookbook. All expressions are JavaScript (the modern AE expression engine). They evaluate on the property they are pasted on, where `value`, `time`, `index`, `thisLayer`, `thisComp` are in scope.

## Inertial bounce (parameterized)

```js
// Overshoot/settle after the most recent keyframe. Tune amp/freq/decay.
amp = 0.10;     // 0.05 = subtle, 0.2 = bouncy
freq = 3.0;     // oscillations per second
decay = 5.0;    // higher = settles faster

n = 0;
if (numKeys > 0) {
  n = nearestKey(time).index;
  if (key(n).time > time) n--;
}
if (n === 0) {
  value;
} else {
  t = time - key(n).time;
  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);
  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);
}
```

Inertial bounce works on multi-dimensional properties because `velocityAtTime` returns a vector; the arithmetic is per-component.

## Loop variants

```js
loopOut("cycle");          // A B C A B C ...
loopOut("pingpong");       // A B C B A B C ...
loopOut("offset");         // continues accumulating the delta each cycle
loopOut("continue");       // linear extension of the final velocity (no loop)
loopOut("cycle", 3);       // loop only the last 3 keyframes
loopIn("cycle", 2);        // loop the first 2 keyframes, backwards in time
loopOutDuration("cycle", 2); // loop the last 2 SECONDS of keyframes
```

Use `offset` for endless conveyor/scroll motion; `continue` for inertia past the last keyframe without oscillation.

## Wiggle — advanced

```js
// Full signature: wiggle(freq, amp, octaves, amp_mult, time)
wiggle(2, 30, 3, 0.5);     // 3 octaves adds finer detail

// Per-axis wiggle (different amplitude X vs Y)
x = wiggle(2, 50)[0];
y = wiggle(2, 10)[1];
[x, y];

// Wiggle only rotation while keeping keyframed position
wiggle(1, 5);              // on Rotation

// Smooth, looping ambient motion without true wiggle (loopable):
amp = 20; period = 4;      // seconds
[Math.sin(time / period * 2 * Math.PI) * amp,
 Math.cos(time / period * 2 * Math.PI) * amp] + value;
```

`wiggle` is non-looping noise; for seamless loops use periodic sin/cos as above.

## Stable randomness across a grid

```js
seedRandom(index, true);        // timeless=true → constant over time, varies per layer
startDelay = random(0, 0.5);    // each layer gets a stable random delay
opacity = ease(time, startDelay, startDelay + 0.4, 0, 100);
```

`seedRandom(index, false)` (timeless=false) lets `random()` vary over time — use for flicker; `true` for stable offsets.

## Time remap & valueAtTime echoes

```js
// Trailing/echo: sample the lead layer in the past, staggered by index
delay = 0.08 * (index - 1);
thisComp.layer("Lead").transform.position.valueAtTime(time - delay);

// Speed-ramp a time-remapped layer using easing on the source time
src = thisComp.layer("Source");
linear(time, 0, 2, 0, src.source.duration);   // play a 2s window of the source

// Sample own value in the past for motion smear / trail
valueAtTime(time - 0.1);
```

## Rigging walkthrough

### Control types and how to read them

```js
ctrl = thisComp.layer("Controls");
ctrl.effect("Intensity")("Slider");   // number
ctrl.effect("Visible")("Checkbox");   // 1 or 0
ctrl.effect("Brand")("Color");        // [r,g,b,a] 0..1
ctrl.effect("Spin")("Angle");         // degrees
ctrl.effect("Anchor")("Point");       // [x,y]
```

### One slider, staggered reveal across N layers

```js
// On each layer's Opacity:
master = thisComp.layer("Controls").effect("Reveal")("Slider"); // 0..100 driver
per = 6;                       // frames of stagger per layer
shift = framesToTime(per * (index - 1));
ease(master, 0, 100, 0, 100) * (time > shift ? 1 : 0);
```

### Coordinate-space conversions

```js
// Place this layer where another parented layer appears in comp space
target = thisComp.layer("Marker");
fromComp(target.toComp(target.anchorPoint));

// World position of a point on this layer
toComp([0, 0]);
```

`toComp` converts layer space → composition space; `fromComp` does the inverse. Use them whenever layers are parented or live in different (nested) comps.

### Linking many layers to a master null

1. Select all children → set Parent to the null.
2. Animate only the null; children inherit transform.
3. For non-transform links (effects, opacity), pick-whip to the control layer's effect.

## Essential Graphics / MOGRT export steps

1. **Window → Essential Graphics**, choose the master comp.
2. Drag exposed properties (Slider, Checkbox, Color, Text Source, Media replacement) into the panel.
3. Add **Group** headers, rename controls, fill comment fields for editors.
4. Use **Drop-Zone / Media Replacement** for swappable footage/logos.
5. Click **Export Motion Graphics Template**, choose destination (Local Templates Folder / Library / file). Toggle "Make fonts available" and check "Raster/vector" compatibility for Premiere.
6. Test in Premiere Pro's Essential Graphics → Browse panel.

Keep all motion driven by expressions referencing the exposed controls so editors only touch the exposed params; hide internal layers with shy.

## Lottie / Bodymovin export

Supported reliably:
- Shape layers, solids, transforms (position/scale/rotation/opacity/anchor).
- Masks and track mattes (alpha), parenting, basic gradients.
- Trim Paths, simple repeaters.
- Expressions: enable in Bodymovin settings, but verify on the target renderer — `lottie-web`, lottie-ios, and lottie-android differ in expression and effect support.

Not supported / risky (bake or avoid):
- Blend modes, most native Effects, layer blurs, 3D layers/cameras, time remapping, adjustment-layer effects.

Workflow:
1. Install Bodymovin extension; **Window → Extensions → Bodymovin**.
2. Select comp(s), set destination, choose Standard/Demo.
3. Settings: enable "Glyphs"/"Hidden", "Expressions" only if needed; "Assets" → export images or use base64.
4. Render `data.json`. Preview in a Lottie player; check file size and that masks/mattes survived.
5. For web, load with `lottie-web`:

```js
import lottie from 'lottie-web';
lottie.loadAnimation({
  container: document.getElementById('lottie'),
  renderer: 'svg',          // 'canvas' for heavy fills, better perf
  loop: true, autoplay: true,
  path: '/data.json',
});
```

## Media Encoder presets

| Use | Codec / format | Settings |
|---|---|---|
| Web/social delivery | H.264 (MP4) | VBR 2-pass, 1080p ~12–16 Mbps; 4K ~35–50 Mbps |
| Master/intermediate | ProRes 422 HQ (MOV) | full range, matched fps |
| With alpha | ProRes 4444 (MOV) | enable alpha channel |
| Lossless interchange | PNG sequence or ProRes 4444 | per-frame, alpha |
| GIF | via Media Encoder/Photoshop | reduce palette, dither, cap dimensions |

Tips:
- Match the comp frame rate; avoid frame-blending unless intentionally retiming.
- H.264 cannot store alpha — composite onto a background or use ProRes 4444 / PNG.
- For crisp text, render at the delivery resolution (don't upscale); set quality to maximum and use 2-pass VBR.
