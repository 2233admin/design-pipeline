# Change Motion — jst-hud-clock

Foundation: project `MOTION.md` — `JST Mission Clock Board Motion`, posture `minimal`,
sha256 `165afdfa1e2e2883c2aa24df76b78851fdb76f459a671a14b7a5439b4750a875`.
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
- Choreography: all registers driven by the single value clock; JST and GMT at 1Hz, `T+` tail at
  10Hz.
- Interruption: none possible; each tick is atomic.
- Implementation: `textContent` assignment inside a single `setTimeout` chain aligned to the wall
  clock. No library.
- Performance budget: writes to pre-sized fixed-advance cells so no layout or reflow occurs.
- Reduced motion: **retained**. Suppressing it would break the product. Documented exception.

### `phosphor` — emissive surface noise

- Trigger: page load; runs continuously while visible.
- Purpose: make the panel read as an emissive phosphor surface rather than a flat fill.
- Timing: continuous, with no cycle detectable inside the supported observation window. The window
  and standard are stated identically in the project `MOTION.md`: 30 minutes of continuous wall
  clock sampled at 10Hz, repeat search over every lag from 1s to 15 minutes, zero repeating lags.
  This is a bounded, measured claim and not a guarantee — the generator is a finite deterministic
  state machine, so a period exists in principle and simply is not reachable inside the window. No
  "never repeats at any observation length" claim is made. An earlier revision used three CSS
  keyframe cross-fades (11.3s / 7.1s / 13.7s); all three cycle lengths sit inside the lag search, so
  a keyframe layer fails the window test by inspection at any duration, and the mechanism was
  replaced rather than retuned.
- Easing: none; the driver is fractal noise, not a curve.
- Amplitude: 4% luminance ceiling, per the project procedural-motion contract. The resampled
  opacity envelope is unchanged from the keyframe revision it replaces: g1 `0.10-0.34`,
  g2 `0.12-0.32`, g3 `0.11-0.30`, measured `0.109-0.330` over a 30-minute sample of g1.
- Bound channels: emission opacity only. No geometry channel is bound.
- Choreography: one shared layer above the plane. Registers do not animate individually.
- Interruption: the driver returns early while `document.hidden`, so the surface stops with the tab.
- Implementation: inline SVG `feTurbulence` (seeds 17 / 58 / 93) for the spatial grain. Each
  layer's emission opacity is written by the board's 10Hz value clock from a seeded two-octave
  value-noise function — smoothstep interpolation between hashed lattice values, lattice periods
  2.6s / 3.3s / 4.1s, octave ratio 2.37 chosen so the two octaves do not re-align anywhere inside
  the observation window. Lattice values come from a hash of `(seed, index)`, so the stream shows
  zero repeating lags inside the window while staying exactly reproducible from the seeds plus a
  capture timestamp. Primitive `distortion.fractal-noise`, opacity channel only. No keyframes and no
  library, and no timer other than the value clock touches this layer — the 1Hz staleness watchdog
  under Runtime And Capability writes only `dim-stale` state.
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

- Runtime: CSS plus two DOM timers with disjoint jobs. No animation library, no canvas, no WebGL,
  and no CSS keyframe cycle on the surface layer.
  - Value clock: a wall-clock-aligned `setTimeout` chain, re-armed each pass with
    `100 - Date.now() % 100`, so it runs at ~10Hz without accumulating drift. It owns every
    displayed value and the surface-noise scalar. This is the "one clock owns time" clock.
  - Staleness watchdog: a 1Hz `setInterval` that owns only the `dim-stale` state attribute. It
    compares the value clock's last-tick timestamp against the wall clock, returns early while
    `document.hidden`, and writes no value and no opacity.
  - A `visibilitychange` handler reseats the last-tick timestamp and calls render once on becoming
    visible. It is an event handler, not a third timer.
- Capability status: `feTurbulence`, CSS 3D transforms, and `prefers-reduced-motion` are required
  and available in all target browsers. No degradation path is needed.
- Degradation: if `feTurbulence` were unavailable, `phosphor` falls back to a flat emission layer
  at the same opacity. Legibility is unaffected.

No motion in this change was invented outside the project vocabulary, and no parallel motion
language was introduced.
