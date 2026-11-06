---
schema: design-pipeline.motion-foundation.v0.1
name: Crisis Command motion
posture: expressive
primitiveRegistry: design-pipeline.motion-primitives.v1
---

# Crisis Command motion

## Motion Thesis
Motion is machinery under stress: clocks tick, traces scroll, screens shimmer, the band's stripes blink. State changes
never animate: they cut, the way the measured danger switch cuts in one frame.

## Motion Principles
- State changes are hard cuts (`dur-cut`): danger, breach, the lit mode cell, the lit plate.
- Live screens shimmer at low amplitude (2–3% luminance, `dur-flicker`), never flash.
- The only large blink is the band's stripes at 1 Hz (`dur-blink`), under 3 flashes a second.
- Type cards never move.

## Motion Vocabulary
- primitive: reveal.trim-line — the scan band crosses a screen top to bottom in `dur-scan` (4 s).
- Supporting: clocks tick every `dur-tick`; the graph's main trace scrolls every 100 ms; the band's line runs left at
  24 s a loop; pending vote seats show a stepping bar and resolve one by one every 1.4 s; hover colour changes take
  `dur-hover` with `ease-standard`.

## Procedural Motion
The main trace's next point is a bounded random step (±15 of 500 units) every 100 ms; nothing else is random.

## Runtime Policy
CSS owns the blink, shimmer, scan band, caret and stepping bars; `kit.js` ticks clocks, scrolls the trace, resolves
pending votes and toggles states. No animation library.

## Reduced Motion
Fallback: under `prefers-reduced-motion: reduce` clocks stop ticking, the trace and band stop, every CSS animation runs
once for 1ms; state changes still cut.

## Source Decisions
- Adopted: hard cuts for state changes and low-amplitude flicker, measured frame by frame on the reference's countdown
  (red share 7% → 18% and 15% → 46% in one frame; 6.7 Hz at 2/255 and 12.5 Hz at 2.4% shimmer).
- Changed: the 1 Hz band blink and the 4 s scan are our values, not measured; flicker kept under 3% luminance.
- Rejected: full-screen red flashes; any flash rate above 3 per second.
