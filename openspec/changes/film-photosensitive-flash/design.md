## Decisions

1. Decode every frame at the render's native rate (no rate cap), streamed as RGB24 at a working size whose longer
   edge is 512 px, keeping each frame's presentation timestamp. Memory is bounded by the detector state, not the clip.
2. Luminance: sRGB channels normalised to 0..1, linearised, relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B.
3. Stateful transition detector per pixel: keep the last extreme luminance and the current direction. A transition is
   recorded when luminance moves at least 0.10 away from that extreme in the opposite direction and the darker of the
   two extremes is below 0.80; the new value becomes the extreme. Held frames between extremes do not reset the
   state. A flash is a pair of opposing transitions at a pixel; its time is the second transition's timestamp.
4. Area: for each frame where transitions complete, the transition mask is summed with a summed-area table and the
   maximum over all positions of the 10° field window (341×256 px at 1024×768, scaled to the working size) is taken.
   The frame counts toward a flash when that maximum covers at least 25 % of the window. Pixel-accurate, so separated
   small flashes are not rounded up.
5. Red flash (WCAG 2.2 working definition): a pixel is saturated red when R / (R + G + B) ≥ 0.8 (R + G + B = 0 is
   not saturated red). A red transition is a change involving a saturated-red state whose CIE 1976 UCS chromaticity
   difference (u′, v′ from linear RGB via XYZ) exceeds 0.2. Red flashes are opposing red transitions, with the same
   area rule.
6. Count flashes in a sliding one-second window of timestamps. More than three of either kind is an `error` finding
   `photosensitive-flash`; exactly three is reported in `photosensitivity.worstWindow` without a finding.

## Risks

- Not certified: the report and docs say so; broadcast delivery still needs a certified analyzer.
- Working-size downsampling can soften one-pixel flicker; it cannot hide an area large enough to matter (25 % of the
  field window is far above the sampling cell).
