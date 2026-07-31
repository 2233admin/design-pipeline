---
schema: design-pipeline.motion-foundation.v0.1
name: JST Mission Clock Board Motion
posture: minimal
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# JST Mission Clock Board — Project Motion Foundation

## Motion Thesis

The board does not animate. It runs. The only sanctioned motion is the passage of time itself and
the physical behaviour of the phosphor surface that displays it. Every moving pixel must be
explainable as either "the clock advanced" or "this is an emissive panel in a dark room".

Motion is never used to draw attention, introduce content, or reward the viewer. There is no
entrance choreography, no scroll response, and no pointer feedback, because the board takes no
input and is watched continuously rather than visited.

## Motion Principles

- Time-truth: a digit changes only when the underlying value changes. No eased digit transitions,
  no rolling odometers, no counting-up flourishes.
- Discrete over continuous: clock values step. Interpolating between 07 and 08 would render a
  number that was never true.
- Surface-only continuity: continuous motion is confined to the emissive surface layer — grain and
  luminance jitter — and never touches layout, position, or size.
- Sub-threshold amplitude: surface motion stays below the level at which a viewer can consciously
  track it. If it reads as an animation, it is too strong.
- No layout motion: nothing translates, scales, or reflows during normal operation. The camera is
  locked and the plane is rigid.
- Failure is legible without motion: a stale time source dims its register. It never blinks,
  pulses, or shakes.

## Motion Vocabulary

- primitive: distortion.fractal-noise — drives the emissive surface layer: film grain plus a very
  low-amplitude luminance jitter across the glow, so the panel reads as phosphor rather than as a
  flat fill. Channels used are opacity and luminance only. Position, rotation, and scale channels
  of this primitive are explicitly unused.

Named motions built from that vocabulary:

- `tick`: instantaneous value replacement on the second or centisecond boundary. Duration zero,
  no easing, no interpolation.
- `phosphor`: continuous surface noise on the emission layer, amplitude at or under 4% luminance,
  with no cycle detectable inside the observation window defined under Procedural Motion.
- `dim-stale`: a single 240ms luminance ramp to the stale tier when a time source stops updating,
  and the same ramp back when it recovers. This is a state change, not a loop.

Nothing else is permitted to move.

## Procedural Motion

Procedural motion is declarative-only and limited to the `phosphor` surface layer.

- Generator: fractal noise over time, consumed as a scalar in `[0, 1]` per frame.
- Bound channels: emission opacity and glow luminance. No geometry channel may be bound.
- Amplitude ceiling: 4% of the emissive tier's luminance.
- Frequency band: no detectable cycle inside the supported observation window. The window is
  30 minutes of continuous wall clock sampled at the board's 10Hz cadence, and the standard is that
  a repeat search over every lag from 1s to 15 minutes finds zero repeating lags. Every change's
  `motion.md` states this same window and standard verbatim, and its QA records the measured result.
  A keyframe cycle has a declared cycle length in seconds, so it fails this test by inspection and
  may not drive the surface layer at any duration. The scalar is instead sampled from a hash over
  time.
- Bounded claim, not a guarantee: the generator is a finite deterministic state machine, so a period
  exists in principle and the lattice periods can eventually re-align. What is asserted here is only
  what the window above can demonstrate. An unbounded "never repeats at any observation length"
  claim is unprovable and is not made anywhere in this project.
- Determinism: the generator is seeded, so a frame captured at a known timestamp reproduces exactly
  from the seed set plus that timestamp. This clause is provable and is verified by replaying one
  timestamp twice. No detectable cycle is not the same as unreproducible.
- The registry entry describes a semantic contract only. The runtime implementation is authored
  for this project; no upstream animation code is copied.

## Runtime Policy

- Default runtime: no animation library. Surface noise is an SVG filter for the spatial grain; its
  layer opacity, like every clock value, is written to the DOM by the value clock described below.
  CSS keyframes are not used for the surface layer, because they can only produce a cycle.
- One clock owns time. Exactly one timer may read the wall clock and write a displayed value or the
  surface-noise scalar, and no animation library may own the frame loop. Its mechanism is a
  `setTimeout` chain re-armed each pass against the wall clock (`100 - now % 100`), not a fixed
  interval, so drift never accumulates.
- A second timer exists and it owns no time. A 1Hz `setInterval` watchdog compares the value clock's
  last-tick timestamp against the wall clock and writes only the `dim-stale` state attribute. It
  reads no register, writes no value, and advances no noise scalar. A third timer, or any widening
  of this one into a value writer, breaks the contract. These are the only two timers on the board.
- Resynchronisation is an event handler, not a timer: a `visibilitychange` listener reseats the
  last-tick timestamp and calls the value clock's render once when the tab becomes visible.
- No animation dependency may be added. GSAP, Anime.js, and canvas/WebGL runtimes are out of scope
  for this surface; if a future surface needs one, it must be justified in that change's
  `motion.md`, not assumed here.
- Update cadence: 10Hz maximum for the centisecond readout, 1Hz for all wall-clock registers. The
  board must idle near zero CPU when only 1Hz registers are visible.
- Budget: the surface layer must not force layout or paint of the numeral layer. Compositing only.
- Background tabs: the value clock coalesces and the board resynchronises from the wall clock on
  visibility change rather than replaying missed ticks. The watchdog returns early while hidden, so
  throttling is never reported as source loss.

## Reduced Motion

Under `prefers-reduced-motion: reduce`:

- `phosphor` is disabled entirely: the noise driver never writes, and the authored static opacity
  for each seeded turbulence layer stands. Its substitute is therefore a static, seeded noise
  texture rendered once, so the panel keeps its material character with zero temporal change. The
  static values must win the cascade against the layer's base rule; a fallback that resolves to
  zero opacity is a removed texture, not a static one, and does not satisfy this clause.
- `dim-stale` loses its ramp; the fallback is an immediate luminance change to the stale tier.
- `tick` is unchanged. Clock advancement is information, not decoration, and suppressing it would
  break the product. This is a deliberate exception and is recorded in every change QA.
- No motion in this system conveys meaning that is lost when it is removed, apart from `tick`.

## Source Decisions

Source: the supplied still frame, which is a single static image and therefore carries no observed
timing evidence.

Adopted from source:

- the emissive phosphor surface character, interpreted as grain plus luminance jitter;
- the implication of a live board, interpreted as discrete ticking rather than a static render;
- the locked camera, interpreted as a prohibition on any layout or camera motion.

Rejected or not adopted:

- rejected: inferring easing curves, transition durations, or choreography from a still frame.
  A single frame contains no timing evidence and inventing one would be fabricated provenance.
- rejected: odometer or flip-digit transitions, which are a common clock-UI cliche but would
  display values that were never true.
- rejected: entrance, scroll, hover, and pointer-feedback motion, none of which apply to a
  non-interactive board.
- rejected: a continuous glow pulse or breathing effect, which would read as decoration and
  compete with the numerals.
