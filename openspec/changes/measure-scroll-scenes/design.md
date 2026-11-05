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
   clamped to the scroller's range; the actual position is recorded. Scrolling is
   `scrollTo({behavior: "instant"})` so `scroll-behavior: smooth` cannot turn a jump into motion.
   The scroller is the target's nearest ancestor that scrolls vertically (overflow auto, scroll or
   overlay with taller content), else the document (review of #275: a scene inside an overflow
   container was never scrolled and read as never started). Geometry is then measured in that
   scroller's content box. If nothing can scroll (`maxScroll` 0) the capture stops with the contract
   error "the target is not inside a scrollable area"; it is not reported as never started. A point
   that ends more than 1 px from its plan (scroll snapping, a clamp) is measured where it stopped,
   listed in the coverage's `offPlan` and in the result's `notes`; it is not a finding.
   A GSAP pin wraps the target in a generated `.pin-spacer`; the guide says to target
   `.pin-spacer:has(> #scene)`, the element that spans the hold. When GSAP never ran that spacer
   does not exist: the capture stops with a contract error that names the page errors it saw
   (measured: "ScrollTrigger is not defined"), so no pass is recorded.
3. **Scene state (never started).** For the target and up to 400 descendants, except elements
   matching `ignore`: box relative to its frame of reference (the nearest fixed or sticky ancestor
   inside the scene, else the target), rounded to 0.5 px, plus computed transform, opacity, filter,
   clip-path and visibility, and the target's text. A fixed or sticky element is its own frame and
   its own box is left out (only its styles count), so a sticky header that shrinks does not start
   a scene. Relative boxes keep plain scrolling and pinning from reading as animation; text
   catches scroll-driven counters. Canvas and video content is not in the DOM: each fully visible
   canvas/video (up to 4) is cropped from the screenshot and averaged into an 8 x 8 grid of RGB
   means. Two states differ when the DOM hash differs or a grid cell moved by more than 8/255.
   An exact pixel hash was tried first and failed on a phone page without a viewport meta tag: the
   same static canvas resamples differently at each scroll offset, so it read as started. A canvas
   or video whose grid changed during the rest window is playing on its own (a loop, a Lottie, a
   video) and is marked `moving`: it is not compared, so it cannot make a static scene count as
   started. Canvas and video inside an ignored element are left out.
   `scroll-never-started` fails the motion pass when no progress point after 0 % differs from 0 %.
   A reduced pass that does not change is allowed (that is a valid reduced-motion substitute).
4. **Rest (never rests).** After the pass's settle the boxes and opacities of the not-ignored
   elements are stored in the page and a screenshot is taken; after `restWindowMs` both are taken
   again. Still moving: a box moved more than 2 px in the motion pass or 0.5 px in the reduced pass
   (the motion probe's rest number), opacity more than 0.01, elements were added or removed, or more
   than 0.5 % of the scene's visible pixels outside ignored elements changed by more than 8/255 on a
   channel. The motion pass allows 2 px because smooth-scroll libraries ease toward the scroll
   position (review of #275: a 0.06 lerp and a ScrollSmoother-style fixed wrapper failed at 0.5 px);
   `web-motion.md` states the convergence a library must reach: a 0.06 lerp rests for jumps up to
   about 250 px (measured 2.2 to 2.6 px drift after 300 px, 0.8 to 0.9 px after 100 px). The reduced
   pass keeps 0.5 px: under reduced motion the easing should stop. The default settle is 1200 ms,
   the motion probe's default: measured on GSAP 3.15 ScrollTrigger, `scrub: 1` still moved 1 to
   5.5 px at 500 ms and rested at 1200 ms, while `scrub: 4` still moves at 1200 ms.
   **Reduced settle.** The review asked for a 400 ms reduced settle if the fixtures still settle.
   They do not all: at 400 ms GSAP `scrub: 1` (which does not follow reduced motion by itself) still
   moved 2.2 to 10.7 px in the reduced pass on 6 of 9 points, while the CSS timeline, scroll-handler,
   canvas and GSAP `scrub: true` / `0.5` fixtures rested. So `reducedSettleMs` exists and defaults
   to 1200; a page that jumps under reduced motion can lower it.
5. **Ambient elements: `ignore`.** Review of #275 found a breathing opacity loop, an infinite
   gradient and a Lottie-like canvas each failing never-rests although the scene itself rested. The
   probe's optional `ignore` (at most 16 selectors, validated in the page) leaves the matched
   elements' own state out of both comparisons and masks their screenshot pixels; their
   descendants are still measured, so ignoring a breathing stage keeps the scene's moving parts in
   (`".glow *"` leaves a subtree out). This is the one field that narrows what is measured, unlike
   the audit, and it is named in the probe for review.
6. **Contact sheets.** `verify interaction` passes `--frames-dir <output>/scroll` to the kernel (an
   internal kernel argument, not a CLI flag, so `KNOWN_OPTIONS` is unchanged). One JPEG per viewport
   and pass, labelled per point, drawn in a separate page of the same browser; the result row names
   it in `coverage[].sheet`. Native completion does not write sheets (its Git scope check would see
   them as unauthorized files); the measurement is the same.
7. **Time.** Per viewport and pass the plan is a 2 s load allowance, the pass's initial settle and
   `(points + 3) x (settle + restWindowMs)`; it is capped at 120 s per probe at validation, and when
   a run's plan exceeds 90 s the CLI prints a note on stderr before it starts. The CLI kernel
   timeout is 60 s plus twice the plan. `points` defaults to 6 (was 10): 66.8 s planned at the
   defaults, against 112 s measured end to end for one probe at 10 points.

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
- What still reads as started: a fixed or sticky element's style change (a header that fades or
  changes transform), and in-flow content that a sticky element's size change reflows (measured:
  a sticky header shrinking from 80 to 40 px with `body` as the target moves every later section,
  so the page counts as started). Target the scene's section, or ignore the header.
- An ignored element's descendants are still measured; an ignored element that covers the scene
  masks the pixel half of the rest check over that area, leaving the element half.
- GSAP pins with `pinType: "transform"` (a custom scroller) move the pinned element by a changing
  transform, which the state counts as change: such a static scene could pass never-started. The
  default body-scroller pin uses `position: fixed` and is measured as designed.
- Headless timing: a page under heavy load may need a larger `settleMs`; the finding names the
  measured movement so a slow-but-settling scene is told apart from one that never settles.
- The checks are Component Conformance only. Whether each frame reads well is Visual Acceptance,
  judged from the contact sheets by a person.
