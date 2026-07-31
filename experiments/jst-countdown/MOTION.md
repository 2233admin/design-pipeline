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
  no periodicity a viewer can lock onto.
- `dim-stale`: a single 240ms luminance ramp to the stale tier when a time source stops updating,
  and the same ramp back when it recovers. This is a state change, not a loop.

Nothing else is permitted to move.

## Procedural Motion

Procedural motion is declarative-only and limited to the `phosphor` surface layer.

- Generator: fractal noise over time, consumed as a scalar in `[0, 1]` per frame.
- Bound channels: emission opacity and glow luminance. No geometry channel may be bound.
- Amplitude ceiling: 4% of the emissive tier's luminance.
- Frequency band: irregular, with no repeating cycle shorter than the observation window, so the
  surface never reads as a loop.
- Determinism: the generator is seeded so a captured frame can be reproduced for evidence.
- The registry entry describes a semantic contract only. The runtime implementation is authored
  for this project; no upstream animation code is copied.

## Runtime Policy

- Default runtime: CSS only. Surface noise is an SVG filter plus CSS opacity; clock values are
  written to the DOM by a single timer.
- One clock owns time. A single interval updates every register. No component runs its own timer,
  and no animation library owns the frame loop.
- No animation dependency may be added. GSAP, Anime.js, and canvas/WebGL runtimes are out of scope
  for this surface; if a future surface needs one, it must be justified in that change's
  `motion.md`, not assumed here.
- Update cadence: 10Hz maximum for the centisecond readout, 1Hz for all wall-clock registers. The
  board must idle near zero CPU when only 1Hz registers are visible.
- Budget: the surface layer must not force layout or paint of the numeral layer. Compositing only.
- Background tabs: the timer coalesces and the board resynchronises from the wall clock on
  visibility change rather than replaying missed ticks.

## Reduced Motion

Under `prefers-reduced-motion: reduce`:

- `phosphor` is disabled entirely. Its substitute is a static, seeded noise texture rendered once,
  so the panel keeps its material character with zero temporal change.
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
