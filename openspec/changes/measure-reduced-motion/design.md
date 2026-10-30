## Decisions

1. Emulate with `page.emulateMediaFeatures([{name: "prefers-reduced-motion", value}])` before navigation, so CSS media
   queries and `matchMedia` both see it.
2. Animation inventory: `document.getAnimations()` filtered to `playState === "running"`. Identity:
   `CSSAnimation.animationName` or `CSSTransition.transitionProperty`, else `Animation.id`, else `script`; plus a selector
   path of `effect.target` (ids, else tag and nth-of-type up to the nearest id). Timing and animated properties come from
   `effect.getComputedTiming()` and `effect.getKeyframes()`. "Moving" properties are `transform`, `translate`, `rotate`,
   `scale`, `top`, `left`, `right`, `bottom`, `width`, `height`, `margin*`, `inset*`, `offset*` and `background-position`.
   The no-preference and reduce inventories are matched by identity.
3. Pixel change: eleven viewport screenshots at 1000 + k·97 ms (k = 0..10), an interval that does not divide common loop
   periods. Changed share per consecutive pair via `motionMap` from `visual-diagnostics/diagnostics.cjs`; the aggregate is
   the maximum pair share. Threshold 0.5 %.
4. Artifact `design-pipeline.reduced-motion.v1`: `target` (`{kind: "file", path, sha256}` or `{kind: "url", url}`),
   `capture` (`{screenshot: "screenshot.png", sha256}`: the screenshot written by the same `composition capture`
   run), `viewport`, `browser` (resolver identity), `capturedAt`, `passes.reduce` and `passes.noPreference` each with
   `animations[]` and `pixelChange{samples, maxShare}`. A JSON Schema is published beside the other evidence schemas.
5. Lineage: `verify composition --image <png> --reduced-motion <file>` rejects the artifact when `capture.sha256`
   is not the sha256 of `--image`, or when the target file's current hash differs from `target.sha256`. The
   composition gate has no policy digest or receipt of its own; the capture hash is its lineage, and the result
   stays Component Conformance only.
6. `capture-composition.cjs` today parses every option as a name/value pair; it gains boolean option parsing for
   `--reduced-motion`.

## Risks

- A carousel that auto-advances once after more than two seconds can be missed; the report lists the measured window so
  the reviewer knows what was covered.
