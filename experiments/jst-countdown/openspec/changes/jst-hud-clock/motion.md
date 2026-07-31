# Change Motion — jst-hud-clock

Foundation: project `MOTION.md` — `JST Mission Clock Board Motion`, posture `minimal`,
sha256 `243bf67e4211f57598c5f9ca726356aea2d311647a90dd49e8dc29216eefbf3b`.
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
- Timing: continuous, no cycle shorter than 11s so no loop is perceptible.
- Easing: none; the driver is fractal noise, not a curve.
- Amplitude: 4% luminance ceiling, per the project procedural-motion contract.
- Bound channels: emission opacity and glow luminance only. No geometry channel is bound.
- Choreography: one shared layer above the plane. Registers do not animate individually.
- Interruption: paused on `visibilitychange` to hidden.
- Implementation: inline SVG `feTurbulence` + CSS `opacity` keyframes on a compositor-only layer.
  Primitive `distortion.fractal-noise`, opacity/luminance channels only.
- Performance budget: composite-only; must not invalidate the numeral layer.
- Reduced motion: disabled. Substitute is the same seeded turbulence rendered once as a static
  texture, so the material character survives with zero temporal change.

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

- Runtime: CSS + one DOM timer. No animation library, no canvas, no WebGL.
- Capability status: `feTurbulence`, CSS 3D transforms, and `prefers-reduced-motion` are required
  and available in all target browsers. No degradation path is needed.
- Degradation: if `feTurbulence` were unavailable, `phosphor` falls back to a flat emission layer
  at the same opacity. Legibility is unaffected.

No motion in this change was invented outside the project vocabulary, and no parallel motion
language was introduced.
