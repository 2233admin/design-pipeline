## Decisions

1. Determinism sample: every whole second plus each planned cut, at most 30 times. Three passes per time: (a) fresh
   page, seek t; (b) one page seeking 0 → each time ascending; (c) one page seeking from the end descending. PNG bytes
   must match across passes; on mismatch the finding names the time and the changed fraction.
2. Embedding check reads the composition HTML, its linked CSS and scripts, and the network log of a capture: any
   request resolving to the reference file or the analysis directory fails; any raster response is hashed and
   compared with the reference source and analysis frames.
3. `storyboard.reference.text`: `[{text, fromSec, toSec}]`. Visible text is read from the DOM at the midpoint
   time; SVG `<text>` counts, outlined paths do not, so outlined words are declared with `outlined: true` and are
   reviewed by frame pairs instead.
4. Palette: decode at 4 fps, quantise to 5 bits per channel, keep colours above 0.5 % share, merge within ΔE2000 2.

## Risks

- Canvas renders can differ by GPU rasterisation between passes in one browser; the check runs all passes in one
  browser process with GPU disabled, as captures already do.
