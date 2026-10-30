## Why

`composition capture` takes one screenshot right after `networkidle0`. A CSS transition, an entrance
animation, a blinking caret or a late font swap lands in that screenshot, and the composition gate,
`composition compare` and page comparison then measure a frame the page does not settle on. `evidence
refs` already freezes CSS and Web Animations (`freezeMotion` in `page-refs-core.cjs`) and checks that two
screenshots are identical; the other capture paths do not. Playwright's `toHaveScreenshot` uses the same
recipe (disable animations, hide the caret, wait for two identical frames) to stop flaky visual diffs.

## What Changes

- Move `freezeMotion` out of `page-refs-core.cjs` into one shared capture helper and use it in
  `composition capture` (without `--seek`) and the web evidence capture, plus caret hiding and
  `document.fonts.ready`.
- After freezing, take screenshots 100 ms apart until two consecutive ones are byte-identical, at most five
  attempts. The output records `stabilization: {frozen, attempts, stable}`.
- A capture that never stabilises still writes its last screenshot, with `stable: false`. `verify composition`
  given that capture's elements reports `capture-unstable` as a warning naming the attempt count.
- With `--seek`, the timeline seek happens first and freezing applies after it, so seeked frames are unchanged.
- Motion driven by a script's own timers is not stopped; the stability check is what catches it.

## Capabilities

- `composition`: ADDED `Captures settle before measurement`.

## Reuse

- `freezeMotion` and the two-screenshot equality check from `page-refs-core.cjs`; no new browser dependency.

## Impact

- `elements.json`/capture output gains `stabilization`; existing captures without it stay readable.
- `evidence refs` keeps its behaviour and uses the shared helper.
