## Why

Closes #320. Found in the review of #318. `template check --browser` cannot measure text drawn with
`-webkit-text-stroke`. Transparent text with a 3px `#101112` stroke on a `#101112` ground (the words are
invisible) passed with no finding and a single note. Same-colour fill, stroke and ground was judged 1:1, which is
right, but only because the stroke stayed in the "ground" shot and was compared with itself.

## What Changes

- The "text hidden" state of the browser check clears `-webkit-text-stroke` as well, so the ground under a text is
  the page without that text's stroke (same as `capture-composition.cjs` HIDE_TEXT).
- The black and white ink shots set `-webkit-text-stroke-color` too, so the stroke counts as ink: ink overlap,
  off-canvas and cover checks see the whole drawn word.
- A text whose fill is transparent but whose stroke is painted is measured with the stroke colour for contrast,
  instead of a note that the colour is not a colour. The fill is read from `-webkit-text-fill-color`, which is what
  Chrome paints (it falls back to `color`).
- Only hand-written HTML is affected. Template SVG strokes use the `stroke` attribute, which is already handled.

## Capabilities

- `design-pipeline`: ADDED `Template check measures stroked text`.

## Reuse

- `STYLE`, `discover` and the contrast loop in `skill/tools/template-bank/page-check.cjs`; the existing `contrast`
  rule and its fix text. No new rule, finding code, flag or schema.
