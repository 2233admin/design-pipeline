## Why

Reduced motion is only declared. The component state gate (`gate-core.cjs`) fails when an interactive entry
has no `reducedMotion` text, and `MOTION.md` must name a fallback, but nothing opens the page with
`prefers-reduced-motion: reduce` to see whether it stops moving. A page can declare "animations disabled"
and keep an infinite parallax loop running for users who asked for less motion.

## What Changes

- `composition capture --reduced-motion` loads the page twice, once with `prefers-reduced-motion: reduce` and
  once with `no-preference`. In each pass it waits one second after load, then for one more second records the
  running Web Animations (with iteration count and duration) and the share of pixels that change between
  frames taken at irregular intervals. It writes `reduced-motion.json` (`design-pipeline.reduced-motion.v1`) next to
  the capture, bound to the target's sha256 (or URL and capture time), viewport and browser identity.
- `verify composition --image <png> --reduced-motion <reduced-motion.json>` loads and validates the artifact, rejects
  it when the target file's current sha256 differs, and fails with `reduced-motion-still-moving` when the
  reduce pass still has motion one second after load: an infinite or longer-than-one-second running animation
  that moves (transform, position, size or scroll), or more than 0.5 % of pixels changing between consecutive frames.
  Each animation is named by a stable identity: CSS animation name or transitioned property, plus the target's
  selector path; Web Animations created by script use their `id` when set.
  Opacity and colour changes are reported but do not fail, since they are the usual reduced-motion substitute.
- The no-preference pass is recorded so the report can say what reduce removed; a page with no motion in either
  pass passes and says so.
- The component state gate keeps requiring the declaration; this adds the measurement behind it.

## Capabilities

- `composition`: ADDED `Reduced motion is measured, not only declared`.

## Reuse

- `composition capture` browser launch and `verify composition` findings; the stabilisation helper from
  `capture-stable-frames` is not used here, because this pass must see motion.

## Impact

- New optional capture flag and verify flag; captures without them are unchanged.
