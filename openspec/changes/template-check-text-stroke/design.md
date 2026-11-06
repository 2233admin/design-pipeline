## Decisions

1. `[data-tc-off]` gets `-webkit-text-stroke:0!important`. The ground is shot with the unit hidden; a stroke left
   in it is part of the text, not ground.
2. `[data-tc-key="0"|"1"]` get `-webkit-text-stroke-color:#000|#fff!important`. The stroke width stays the page's, so
   a page without a stroke measures the same ink as before.
3. `discover` reads, per text run, `-webkit-text-fill-color` (the painted fill) plus `-webkit-text-stroke-width`
   and `-webkit-text-stroke-color`. When the fill parses to no colour (transparent) and the stroke width is above 0
   with a visible colour, the run is measured with the stroke colour. When both fill and stroke paint, the fill is
   measured as before: the stroke is an outline around a visible fill, and mixed-colour spans keep "worst wins".
4. Reading `-webkit-text-fill-color` instead of `color` changes nothing when it is unset (it computes to `color`),
   so existing pages and templates keep their output. This is proved by running the check before and after on
   every template (seeds 1, 7, 42) and every HTML fixture and comparing the reports byte for byte (see the PR).
5. The note "text colour ... is not a colour; contrast not measured" stays for text that really has no paint
   (transparent fill, no stroke).
6. A stroke straddles the glyph outline, so only its outer half adds to the ink; the 10th percentile inside the ink
   box shrunk by 8% is unchanged and measures the ground under the whole drawn word.

## Out of scope

- `paint-order`, `text-shadow` as text colour, and SVG `<text stroke>` (already read).
