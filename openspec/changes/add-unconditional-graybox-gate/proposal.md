# Proposal: Unconditional Graybox Gate

## Problem

Two separable disciplines are currently welded together:

- **measured fidelity** — landmark solve, hash-bound receipts, SSIM. Genuinely requires the source
  raster on disk.
- **look before you detail** — render layout-only, capture it, compare it to the reference. Requires
  no source file and costs one screenshot.

The second is only reachable through the first. A graybox is required when the route is `3d` or
`hybrid` (`Reference evidence selects the spatial route`), and landmark geometry is required for
`exact-reconstruction` (`Static reference fidelity is explicit and non-downgradable`). A
`primary-target` `exact-reconstruction` on a `2.5d` route whose source is not a resolvable file
falls between both and has **no** look-before-polish gate at all.

Observed in the `jst-hud-clock` run: roughly 400 lines of layout, glow, bloom, grain, and vignette
were authored before the first render. That render showed two failures a graybox would have caught
immediately — a board unit roughly 40% oversized, and a register whose label was placed beside the
readout instead of above it. Both were then corrected by four render passes, which is exactly the
work the gate exists to prevent.

## Change

- Split the geometry gate into two stages: `graybox` and `geometry`.
- `graybox` is unconditional for every route and every fidelity mode, including `2d` and `2.5d`,
  and including runs whose source is unavailable.
- `graybox` requires a layout-only render capture plus a written structural comparison against the
  reference. When the source is not measurable, the comparison is recorded as qualitative.
- Block materials, glow, bloom, depth of field, scanlines, and cinematic grading until `graybox`
  reports `ready`, independently of whether `geometry` can run.
- `geometry` keeps its current measured behaviour and remains blocked without a source raster.
- Report the two stages separately so a blocked `geometry` never implies a passed `graybox`.

## Non-goals

- Weakening the measured geometry or final fidelity thresholds.
- Accepting a qualitative graybox comparison as fidelity evidence.
- Requiring a graybox for changes that have no visual reference at all.
