## Decisions

1. Decode with FFmpeg to RGB24 at `min(render fps, 60)` and a working size whose longer edge is 512 px.
   Convert each pixel to relative luminance (sRGB linearised, WCAG coefficients). Work on a grid of cells
   the size of the scaled 10° field quarter so area can be summed without per-pixel connected regions.
2. General flash: a pixel takes part in a transition when its luminance changes by at least 0.10 of
   maximum between two frames and the darker of the two states is below 0.80. A flash is a pair of opposing
   transitions (up then down, or down then up) at the same pixels. A frame pair counts toward a flash when the
   transitioning area inside any 10° field window (341×256 at 1024×768, scaled) is at least 25 % of that window.
3. Red flash: the same counting on saturated red, where R/(R+G+B) ≥ 0.8 in either state and the change in
   (R − G − B) × 320 exceeds 20 (WCAG 2.x red flash definition).
4. Count flashes in a sliding one-second window. More than three of either kind is an `error` finding
   `photosensitive-flash`; exactly three is reported in `photosensitivity.worstWindow` without a finding.
5. Cost: one extra decode pass. Videos longer than 10 minutes are measured in full; the pass is streamed so
   memory stays bounded by two frames.

## Risks

- Approximation: the cell grid can count an area that is split into non-adjacent pieces. That errs toward
  failing, which is the safe direction for this check.
- Not certified: the report and docs say so; broadcast delivery still needs a certified analyzer.
