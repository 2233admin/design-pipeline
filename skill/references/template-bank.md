# Template bank: parameterised layout templates, rendered by id and audited on render

The template bank is a set of SVG layout skeletons for covers, key visuals, cards, banners and UI
panels. Each one is a structure measured from a reference corpus, with named slots, parameters with
measured ranges, palette roles and provenance. You render one by id with your copy and knobs, and the
render is checked on the spot: text fit, minimum size, contrast, figure and crop zones, accent area
and shared alignment lines. It works like a sound-effects bank: sounds as code, played by id with
knobs, measured on playback.

Code: `tools/template-bank/` (`bank.cjs` render and check, `layouts.cjs` geometry, `lettering.cjs`
code-drawn display lettering, `templates/<id>/manifest.json` + `template.svg` + `spec.md`).

## When to use it

- A cover, key visual, card, banner or UI panel whose structure matches a template, when you want a
  measured starting layout instead of placing everything by eye.
- Text that has to fit: the check tells you which slot overflows and by how much, before anyone looks.
- A study of a house style: render the template, change one relation, compare.

It is a **starting structure for small improvements, not a finished design**. The figure, key art and
logo are placeholders; the templates carry proportions and relations, not the look of a finished
piece. Put real art in, then judge the pixels against the brief. A passing check is technical
conformance only; it does not grant visual or creative acceptance.

Do not use it when the brief needs a layout none of the templates have (pick another route in
[capability routing](capability-routing.md) rather than forcing copy into the wrong slots), or when
the deliverable is a full page or product flow (use `next`).

## Commands

```sh
designer-pipeline template list [--family kv|cover|card|banner|ui]
designer-pipeline template render <id> --set slot=value ... --param name=value ... \
  [--seed <n>] [--size WxH] -o out.svg [--png out.png]
designer-pipeline template check out.svg
```

- `list` gives each template's id, family, sizes, slots with their character budgets, and its
  variation knobs.
- `render` writes the SVG and returns the check in the same result; exit 0 when it passes, 2 when a
  finding fails (the file is still written so you can look), 1 for usage errors (unknown template,
  slot, parameter, value out of range, wrong aspect).
  - `--set` fills a slot. Text and lettering slots take copy; image slots take a png, jpg, webp or svg
    path, embedded into the SVG.
  - `--param` sets a parameter inside its measured range, or a palette role:
    `--param palette.accent=#E0344F`.
  - `--size` takes any size with the template's aspect; `list` shows the tested sizes.
  - `--png` rasterises through the headless browser used by `composition capture`
    (`--chrome`, `--puppeteer-module` as there).
- `check` re-measures any render, including one edited by hand after rendering.

Every finding carries a `fix`: how many characters fit, which parameter to set and to what value
(inside its measured range, or a statement that only shorter copy helps), how far to move an element.

## What the check measures

Measured on the rendered SVG, from its geometry and the rules embedded at render time:

| Rule | Measured | Limit |
| --- | --- | --- |
| `text-overflow` | Each text slot's extent (lettering from its path coordinates; `<text>` from an advance model at or above the bold widths of the named CJK fonts) against the slot's box, and wrapped lines against the slot's line budget | Inside the box |
| `text-length` | Characters against the slot's budget | `maxChars` |
| `type-size` | Font size, or cap height for lettering | 12 px, 9 px cap |
| `contrast` | Text colour against the ground composited under nine points of its extent (shapes, opacity, gradients; image slots count as their declared ground tone) | 4.5:1, 3:1 for large text |
| `figure-zone` | Horizontal overlap of title slots with the figure zone while they share rows | 30% of the title width |
| `safe-zone` | Listed slots inside a crop zone (the 16:9 centre crop of a 16:10 cover) | Inside |
| `accent-budget` | Area of accent-role or accent-coloured paint, clipped to the canvas; text at 45% of its extent | The template's `accent_max_share` |
| `align-line` | Ink edge of each listed element against the template's shared left (or right) line | 0.5% of the width |

Decoration slots (watermark words, micro-markers, barcodes) are exempt from size and contrast; slots
marked `bleed` are exempt from the box. When the ground is an image slot, the result notes it: check
contrast again on the real image (`--png` and sample it).

## Variation knobs: so outputs do not all look the same

Every parameter has a class in the manifest:

- `proportion`: measured relations (margins, title column, figure position, zone edges). Keep them
  inside their range; they are why the template works.
- `rhythm`: sizes, gaps, the display lettering's width, stroke, chamfer and stencil, tracking.
  These are the knobs for variety. `--seed <n>` picks every rhythm value inside its range
  (repeatable: the same seed gives the same render); `--param` overrides it.
- `decoration`: on/off layers and counts (watermark, glow, ticks, shards, rank marks).

Vary on purpose: change the palette roles to the project's colours, run a few seeds, turn decoration
off where the subject is busy. Keep the relations the manifest lists in `relations`. The same template
with the same knobs on every cover is a house style at best and a cliché at worst.

## Fonts

Latin display slots use the code-drawn lettering (`lettering.cjs`, 53 glyphs, condensed,
chamfered, optional stencil); it renders as paths and needs no font. Text the glyph set cannot draw
(CJK) falls back to the manifest's open fonts: Source Han Sans / Serif or Noto Sans / Serif CJK
(SIL OFL 1.1). They are named, not bundled: install them where you render the SVG or PNG.

## Add a template distilled from a reference

1. Collect the references and record each in a provenance list (id, source URL, size, category, date).
   Keep the images out of the repository; record only their URLs and your measurements.
2. Measure, do not trace: annotate layout boxes (title, figure, logo corner), take medians and
   ranges, and measure colour (largest-cluster lightness and chroma, vivid share, hue spread). Write
   the numbers and sample counts in `spec.md`.
3. Write the layout in `layouts.cjs` as fractions of W and H: placeholder slots for art and logos, a
   box for every text slot, `zone()` for figure keep-out or crop zones, `align()` for shared lines. No
   traced shapes, logos or official text.
4. Write `manifest.json` (schema `design-pipeline.template-bank-template.v1`): sizes and aspect,
   slots with kind, default, budget and size parameter, parameters with default, range and class,
   palette roles with their use, the accent roles and budget, `relations`, `decoration`, and
   `provenance` (corpus, URL, access date, sample ids, measured facts, method).
5. Render it at every listed size and run `template check`. Where the measured study fails its own
   check (a colour below 4.5:1, a budget that overflows its box), fix it and list the change in
   `changesFromStudy`.
6. Write `template.svg` from the default render, add tests, list the files in
   `references/package-resources.json`, and name the reference owner and licence in
   `THIRD_PARTY_NOTICES.md` (reference only, not redistributed).

The current nine templates come from a measured study of official Arknights / Endfield promotional
art (reference only, © HYPERGRYPH):
`docs/research/arknights-endfield-template-study.md` in the repository.
