## Context

Issue #242 asks for scroll-scene captures from 0 to 100 % on desktop and phone, a reduced-motion
pass and "never started" / "rests" checks, after taste-skill's `scripts/scenes.mjs` (MIT, read as a
method only; no code taken). That script decides "never started" from class names its own runtime
sets (`is-live`, `is-rest`). Pages here use CSS scroll timelines, GSAP ScrollTrigger, Lenis or
hand-written handlers, so both checks must come from the rendered scene.

## Decisions

1. **Where it lives.** A named probe kind in the existing interaction probe, like `audit`: contract,
   in-page measurement and pure evaluation in `skill/scripts/interaction-scroll.cjs` (the shape of
   `interaction-audit.cjs`), the browser driver in `interaction-capture-core.cjs`, wiring in
   `interaction-core.cjs`, `workflow-core.cjs` and `cli-core.cjs`. `motion-evidence-core.cjs` is the
   validator for declared motion receipts and is left alone (proposal, Reuse). `interaction-audit.cjs`
   is not edited (#252 owns it): a kind other than `audit` or `scroll` is rejected in
   `interaction-core.cjs` before the audit validator sees it.
2. **Progress points.** Geometry is read after load and fonts: the target's document top and height,
   and the viewport height in CSS px (`documentElement.clientHeight`, because a phone page without a
   viewport meta tag lays out 980 px wide and is taller in CSS px than the declared device). A target
   taller than the viewport has a hold of `height - viewport`; progress runs over it, plus "before"
   (half a screen earlier) and "after" (0.6 screen later). A target no taller than the viewport runs
   from entering at the bottom edge to leaving at the top edge, without before/after. Positions are
   clamped to the page's scroll range; the actual `scrollY` is recorded. Scrolling is
   `scrollTo({behavior: "instant"})` so `scroll-behavior: smooth` cannot turn a jump into motion.
   A GSAP pin wraps the target in a generated `.pin-spacer`; the guide says to target
   `.pin-spacer:has(> #scene)`, the element that spans the hold. When GSAP never ran that spacer
   does not exist: the capture stops with a contract error that names the page errors it saw
   (measured: "ScrollTrigger is not defined"), so no pass is recorded.
3. **Scene state (never started).** For the target and up to 400 descendants: box relative to its
   frame of reference (the nearest fixed or sticky ancestor inside the scene, else the target),
   rounded to 0.5 px, plus computed transform, opacity, filter, clip-path and visibility, and the
   target's text. Relative boxes keep plain scrolling and pinning from reading as animation; text
   catches scroll-driven counters. Canvas and video content is not in the DOM: each fully visible
   canvas/video (up to 4) is cropped from the screenshot and averaged into an 8 x 8 grid of RGB
   means. Two states differ when the DOM hash differs or a grid cell moved by more than 8/255.
   An exact pixel hash was tried first and failed on a phone page without a viewport meta tag: the
   same static canvas resamples differently at each scroll offset, so it read as started.
   `scroll-never-started` fails the motion pass when no progress point after 0 % differs from 0 %.
   A reduced pass that does not change is allowed (that is a valid reduced-motion substitute).
4. **Rest (never rests).** After `settleMs` the element boxes and opacities are stored in the page
   and a screenshot is taken; after `restWindowMs` both are taken again. Still moving: a box moved
   more than 0.5 px or opacity more than 0.01 (the motion probe's rest numbers), elements were added
   or removed, or more than 0.5 % of the scene's visible pixels changed by more than 8/255 on a
   channel. Applies to every point of both passes. The default settle is 1200 ms, the motion probe's
   default: measured on GSAP 3.15 ScrollTrigger, `scrub: 1` still moved 1 to 5.5 px at 500 ms and
   rested at 1200 ms, while `scrub: 4` still moves at 1200 ms.
5. **No waiver field.** Like the audit, no probe field skips a subtree. A loop that is the point of a
   scene belongs outside the probed target; the fix says so.
6. **Contact sheets.** `verify interaction` passes `--frames-dir <output>/scroll` to the kernel (an
   internal kernel argument, not a CLI flag, so `KNOWN_OPTIONS` is unchanged). One JPEG per viewport
   and pass, labelled per point, drawn in a separate page of the same browser; the result row names
   it in `coverage[].sheet`. Native completion does not write sheets (its Git scope check would see
   them as unauthorized files); the measurement is the same.
7. **Time.** Planned waiting is `viewports x 2 x (points + 3) x (settleMs + restWindowMs)`, capped at
   120 s per probe at validation. The CLI kernel timeout becomes 60 s plus twice the planned waiting
   of the file's scroll probes. Measured at the defaults on the shared 2-CPU machine: 112 s for one
   probe end to end.

## Result shape

A scroll row is `{id, kind: "scroll", status, coverage, findings}`. `coverage` has one entry per
viewport and pass in declared order (`motion` then `reduced`): `viewport`, `pass`, `range`
(`hold` or `pass-through`), `points`, `changedPoints` (progress points that differ from 0 %),
`restingPoints`, `maxRest` (`shiftPx`, `opacity`, `pixelShare`) and `sheet` when written. Findings
carry `code`, `severity`, `viewport`, `pass`, `selector`, `message`, `actual`, `expected` and `fix`.
`scrollResultFailure` re-reads a row for native completion: every pass present in order, motion
passes with `changedPoints >= 1`, every pass with `restingPoints == points`.

## Compatibility

Additive. Probe files without `"kind": "scroll"` validate, capture and evaluate as before. No path
moves, no schema id changes.

## Risks

- A scene whose only change is outside the target (for example a fixed overlay elsewhere) reads as
  never started; the target must contain what the scene animates.
- GSAP pins with `pinType: "transform"` (a custom scroller) move the pinned element by a changing
  transform, which the state counts as change: such a static scene could pass never-started. The
  default body-scroller pin uses `position: fixed` and is measured as designed.
- Headless timing: a page under heavy load may need a larger `settleMs`; the finding names the
  measured movement so a slow-but-settling scene is told apart from one that never settles.
- The checks are Component Conformance only. Whether each frame reads well is Visual Acceptance,
  judged from the contact sheets by a person.
