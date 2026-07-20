# Change Motion Spec

Create change-level `motion.md` when a change includes non-trivial animation or interaction motion.
Read `references/motion-foundation.md` first.

Project `MOTION.md` is the reusable language; change `motion.md` is an implementation plan and
evidence record. Never use this file to replace or redefine the foundation.

## Foundation Link

- Project foundation: `MOTION.md`
- Foundation schema:
- Foundation SHA-256:
- Foundation posture:
- Primitive registry: `design-pipeline.motion-primitives.v1`
- Selected primitive IDs:
- Any authored extension and why the registry is insufficient:

Run `check-motion-foundation.cjs` before writing the rest. Every selected primitive must exist in
`motion-primitives.json`, or be recorded as an authored extension with the same provenance,
accessibility, runtime, and evidence fields.

## Summary

- Change id:
- Surfaces:
- Motion owner:
- Motion risk: low / medium / high:
- Implementation target: CSS / WAAPI / Anime.js / GSAP / Canvas / SVG / WebGL / existing runtime:

## Motion Principles

- Purpose:
- Product feeling:
- What motion must never do:
- Reduced-motion principle:
- Maximum time before the user can interact:

Motion confirms state, preserves orientation, and explains change. It must not block reading,
navigation, repeated work, or input.

## Scene And Layer Model

| Scene id | Stage / viewport | Camera | Layers | Entry | Exit | Interruption |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

For each layer record:

- Layer id and semantic owner:
- Render surface:
- Coordinate space:
- Mask or clipping relationship:
- Z-order:
- Content that must remain readable or operable:

## Interaction Inventory

| Trigger | Target | Primitive / effect | Purpose | Start state | End state | Repeat behavior |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

Include hover, focus, press, drag, scroll, route, loading, success, error, and data-update motion
when applicable.

## Tracks And Timeline

| Track id | Scene / target | Channel | Start | Duration | Delay | Easing | Stagger | Driver |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
|  |  |  |  |  |  |  |  |  |

Rules:

- Use milliseconds for time-driven motion.
- Keep delay separate from stagger.
- Identify the timeline owner.
- Record dependency and overlap between tracks.
- Describe replay, reverse, seek, cancel, and fast repeated input.
- Scroll-driven tracks record range, scrub behavior, pinning, refresh, and reverse traversal.

## Procedural Generators

| Generator id | Primitive id | Parameters / units | Seed | Samples | Loop / phase | Surface |
| --- | --- | --- | --- | ---: | --- | --- |
|  |  |  |  |  |  |  |

Procedural definitions are declarative data. Do not embed arbitrary JavaScript or callbacks.
Record bounded parameter ranges, deterministic seeds, sampling/path resolution, trail behavior,
particle count, and mobile fallback.

## State Machine And Interruption

| State | Event | Guard | Next state | Running tracks cancelled / preserved | Focus behavior |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

Describe:

- repeated click/tap during entry;
- route change during a running timeline;
- scroll reversal;
- viewport resize;
- component unmount;
- loading success or failure while motion is active;
- cleanup of render loops, observers, contexts, filters, and listeners.

## Easing And Spatial Behavior

| Motion type | Easing | Origin / direction | Distance / scale | Opacity / filter | Why |
| --- | --- | --- | --- | --- | --- |
| Small UI feedback |  |  |  |  |  |
| Enter / reveal |  |  |  |  |  |
| Exit / dismiss |  |  |  |  |  |
| Route transition |  |  |  |  |  |
| Scroll-linked motion |  |  |  |  |  |

Prefer concrete cubic-bezier values or named spring parameters. Prefer `transform` and `opacity`;
layout, blur, filters, masks, Canvas, or WebGL require an explicit performance reason.

## Runtime Binding

| Primitive / track | Adapter | Capability | Degradation | Cleanup owner |
| --- | --- | --- | --- | --- |
|  | CSS / WAAPI / Anime.js / GSAP / custom | supported / degraded / unsupported |  |  |

Do not add multiple animation runtimes without distinct, non-overlapping ownership. If an adapter is
degraded, document which semantic property changes and why the result remains acceptable.

## Accessibility And Reduced Motion

- `prefers-reduced-motion` substitution:
- Keyboard focus during motion:
- Screen-reader impact:
- Pause / stop / skip:
- Touch-target stability:
- Non-motion equivalent for meaning:
- Flash, parallax, vestibular, and continuous-loop risks:

Reduced motion is a semantic substitute, not just `duration: 0`. Preserve state, order, focus, and
feedback.

## Performance Budget

- Target frame rate:
- Main-thread budget:
- Particle / element ceiling:
- Properties allowed:
- Properties avoided:
- Filter / Canvas / WebGL budget:
- Scroll observer refresh:
- Heavy asset strategy:
- Low-end mobile fallback:
- Deterministic sampling seed:

## Evidence And Provenance

| Evidence id | Fact | Classification | Source | Confidence | Artifact |
| --- | --- | --- | --- | ---: | --- |
|  |  | measured / instrumented / inferred / authored |  |  |  |

Never relabel an inference as measured. Benchmark pages are evidence inputs, not foundation
authority. External showcase repositories must record adopted and rejected properties and whether
code was copied.

Recommended artifacts:

- `motion-observation.json`
- temporal trace JSON
- frame sequence or WebM
- `motion-ir.json`
- `motion-verification.json`

These artifacts are optional until the corresponding capture/compiler/evaluator tools exist, but
their absence must be stated rather than replaced with guessed measurements.

## QA Scenarios

| Scenario | Expected result | Evidence |
| --- | --- | --- |
| Repeated rapid interaction |  |  |
| Keyboard navigation |  |  |
| Reduced motion |  |  |
| Mobile viewport |  |  |
| Slow device / network |  |  |
| Route interruption |  |  |
| Scroll up/down repeatedly |  |  |
| Resize during motion |  |  |

## Final Motion Score

Use 0-5.

| Dimension | Score | Notes |
| --- | ---: | --- |
| Purpose |  |  |
| Timing |  |  |
| Easing |  |  |
| Choreography |  |  |
| Interruption |  |  |
| Responsiveness |  |  |
| Accessibility |  |  |
| Performance |  |  |
| Foundation fit |  |  |
| Implementation fit |  |  |
