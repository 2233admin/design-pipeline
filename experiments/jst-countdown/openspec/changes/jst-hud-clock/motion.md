# Change Motion — jst-hud-clock

Foundation: project `MOTION.md` — `JST Mission Clock Board Motion`, posture `minimal`,
sha256 `5ecac0c3978a7448d96920189243338feab2183f879587e98893bacd6272c04a`.
Primitive registry: `design-pipeline.motion-primitives.v1`.
Selected primitive ids: `distortion.fractal-noise`.

Provenance: **authored**, not observed. The reference is a single still frame and carries no timing
evidence. Every value below is derived from product logic, not from the source.

## Motions

### `tick` — value replacement

- Trigger: the owning clock crosses a value boundary.
- Purpose: report that time advanced. This is information, not decoration.
- Timing: 0ms. Duration zero by contract.
- Easing: none. No interpolated intermediate value may ever be displayed.
- Choreography: all registers driven by one timer; JST and GMT at 1Hz, `T+` tail at 10Hz.
- Interruption: none possible; each tick is atomic.
- Implementation: `textContent` assignment inside a single `setTimeout` chain aligned to the wall
  clock. No library.
- Performance budget: writes to pre-sized fixed-advance cells so no layout or reflow occurs.
- Reduced motion: **retained**. Suppressing it would break the product. Documented exception.

### `phosphor` — emissive surface noise

- Trigger: page load; runs continuously while visible.
- Purpose: make the panel read as an emissive phosphor surface rather than a flat fill.
- Timing: continuous and aperiodic. There is no cycle length to quote, because there is no cycle.
  An earlier revision used three CSS keyframe cross-fades (11.3s / 7.1s / 13.7s); the 7.1s layer
  broke the stated floor outright, and the other two only pushed a loop past it. A keyframe cycle
  is periodic by construction, so no duration could have satisfied the project contract and the
  mechanism was replaced rather than retuned.
- Easing: none; the driver is fractal noise, not a curve.
- Amplitude: 4% luminance ceiling, per the project procedural-motion contract. The resampled
  opacity envelope is unchanged from the keyframe revision it replaces: g1 `0.10-0.34`,
  g2 `0.12-0.32`, g3 `0.11-0.30`, measured `0.109-0.330` over a 30-minute sample of g1.
- Bound channels: emission opacity only. No geometry channel is bound.
- Choreography: one shared layer above the plane. Registers do not animate individually.
- Interruption: the driver returns early while `document.hidden`, so the surface stops with the tab.
- Implementation: inline SVG `feTurbulence` (seeds 17 / 58 / 93) for the spatial grain. Each
  layer's emission opacity is written by the board's single 10Hz timer from a seeded two-octave
  value-noise function — smoothstep interpolation between hashed lattice values, lattice periods
  2.6s / 3.3s / 4.1s, octave ratio 2.37 so the octaves never re-align. Lattice values come from a
  hash of `(seed, index)`, so the value stream never repeats at any observation length while
  staying exactly reproducible from the seeds plus a capture timestamp. Primitive
  `distortion.fractal-noise`, opacity channel only. No keyframes, no second timer, no library.
- Performance budget: composite-only; must not invalidate the numeral layer.
- Reduced motion: disabled. The driver never writes, so the authored static opacity for each seeded
  turbulence layer stands — the same seeded turbulence rendered once as a static texture, with zero
  temporal change. Those static values are authored at `.grain .g1` specificity so they win against
  the `.grain .g { opacity: 0 }` base rule; an earlier revision declared them at `.g1` and the base
  rule won, which meant the reduced-motion fallback resolved to fully transparent — a removed
  texture, not a static one.

### `dim-stale` — source loss

- Trigger: a register's time source stops updating.
- Purpose: make failure legible without motion vocabulary reserved for normal operation.
- Timing: 240ms, once, in each direction.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Choreography: only the affected register.
- Interruption: recovery ramp interrupts and reverses the dim ramp.
- Implementation: CSS `opacity`/`filter` transition on the register.
- Performance budget: single-property transition on one subtree.
- Reduced motion: ramp removed; the luminance change applies immediately.

## Runtime And Capability

- Runtime: CSS + one DOM timer, which owns both the clock values and the surface-noise scalar. No
  animation library, no canvas, no WebGL, and no CSS keyframe cycle on the surface layer.
- Capability status: `feTurbulence`, CSS 3D transforms, and `prefers-reduced-motion` are required
  and available in all target browsers. No degradation path is needed.
- Degradation: if `feTurbulence` were unavailable, `phosphor` falls back to a flat emission layer
  at the same opacity. Legibility is unaffected.

No motion in this change was invented outside the project vocabulary, and no parallel motion
language was introduced.
