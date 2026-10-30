## Why

`composition compare` reports the share of pixels whose maximum channel changed. Font anti-aliasing,
sub-pixel layout and image resampling change many pixels that no one can see, so a faithful replication and a
visibly wrong one can get similar numbers, and page and frame comparisons point reviewers at noise. The
frame pairs proposed for `verify film-render` (#202) and the page comparisons reuse this function, so they inherit
the same weakness.

## What Changes

- Add an anti-aliasing-aware difference: pixels pixelmatch classifies as anti-aliasing are counted separately
  (`antialiasedPixels`) and excluded from `perceptualChangedFraction`.
- Add a structural similarity score (`ssim`, mean SSIM over 8×8 luminance windows) to the report.
- Write `difference-perceptual.png` (real differences red, anti-aliasing yellow) beside the existing images.
- Keep the existing metrics and `difference.png` unchanged. No score is a pass or fail; the report still says it
  is not a quality score.
- Vendor pixelmatch (ISC) unmodified into `skill/vendor/pixelmatch/` with its licence; SSIM is implemented here.

## Capabilities

- `design-pipeline`: ADDED `Composition comparison separates perceptual change from rasterisation noise`.

## Reuse

- `compareComposition` in `skill/tools/visual-diagnostics/diagnostics.cjs`, its report and viewer. Every caller
  (composition compare, film frame pairs, page comparison) gets the new metrics without changes.

## Impact

- Report gains fields; existing reports and their consumers stay valid.
