## Why

`composition capture` takes one screenshot right after `networkidle0`. A CSS transition, an entrance
animation, a blinking caret or a late font swap lands in that screenshot, and the composition gate and
`composition compare` then measure a frame the page does not settle on. `evidence refs` already freezes CSS and
Web Animations (`freezeMotion` in `page-refs-core.cjs`) and checks that two screenshots are identical; composition
capture does not. Playwright's `toHaveScreenshot` uses the same recipe (disable animations, hide the caret, wait for
two identical frames) to stop flaky visual diffs.

## What Changes

- Move `freezeMotion` out of `page-refs-core.cjs` into a shared `capture-stability.cjs`, add caret hiding and
  `document.fonts.ready` to it, and add `settleScreenshot(page)`: screenshots 100 ms apart until two consecutive ones
  are byte-identical, at most five attempts. `page-refs-core.cjs` keeps its own `settle(page)` (scroll and reveal
  settling); the new name does not replace it.
- `composition capture` uses both for every capture. With `--seek`, the timeline seek happens first, then freezing and
  settling, so a seeked capture is also settled and records `stabilization`.
- `elements.json` gains `stabilization: {frozen, attempts, stable}`. A capture that never stabilises still writes its
  last screenshot with `stable: false`; `verify composition` given that `elements.json` reports `capture-unstable` as a
  warning naming the attempt count.
- `evidence refs` uses the shared `freezeMotion`, so it now also hides the caret. `refs.json` records
  `captureMethod: 2`; refs captured with an earlier method are stale, and the existing stale-capture path asks for a
  new capture instead of comparing old fingerprints with new ones.
- Motion driven by a script's own timers is not stopped; the stability check is what catches it.

## Out of scope

- Web evidence capture (`capture-web-evidence.cjs`) navigates and screenshots inside its Playwright and agent-browser
  adapters, and its receipt schema has no stabilisation field. Stabilising it needs adapter and receipt changes and is
  a separate change.

## Capabilities

- `composition`: ADDED `Captures settle before measurement`.

## Reuse

- `freezeMotion` and the two-screenshot equality check from `page-refs-core.cjs`; the stale-capture handling of
  `evidence refs`; no new browser dependency.

## Impact

- `elements.json` gains `stabilization`; captures without it stay readable. Existing `refs.json` files become stale
  once and are recaptured.
