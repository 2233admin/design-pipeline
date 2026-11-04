# Design

## Where things live

- `skill/tools/template-bank/` is a maintained helper, like the other `skill/tools/` entries, and ships
  in the package. The issue suggested `skill/assets/templates/`; the repository keeps callable helpers and
  their data in `skill/tools/`, and has no `skill/assets/`, so the bank follows that convention.
- `bank.cjs` owns manifests, parameter resolution, the document builder, render and check. `layouts.cjs`
  owns geometry only (fractions of W and H). `measure.cjs` owns SVG parsing, geometry, colour and the text
  advance model. `lettering.cjs` owns the glyph program.
- `templates/<id>/manifest.json` is the source of slot budgets, ranges, palette and provenance.
  `template.svg` is the default render, kept equal to `render(id)` by a test. `spec.md` is the study's
  measured basis, copied with a note that the manifest is authoritative.
- The Python originals are not a runtime dependency. `lettering.cjs` reproduces `lettering.py` path for
  path (54 glyph entries x 3 parameter sets compared; the only difference is `-0.00` printed as `0.00`),
  and the widths in the test are the Python results.

## Measured on the render

`template check` reads only the rendered file: geometry, fills and a `<metadata id="template-check">`
block written at render time (canvas, minimum sizes, contrast thresholds, accent roles, colours and
budget, zones, alignment lines). It therefore also audits a render edited by hand afterwards. When the
template id is known it reads the manifest to keep size advice inside the measured parameter range.

- Lettering extents come from the path coordinates through every ancestor transform (so the rotated
  Latin line of the vertical template is measured where it is drawn).
- `<text>` extents use an advance model: full-width CJK, kana, Hangul and symbols 1 em; Latin by
  class at or above the bold widths of Source Han Sans / Noto Sans CJK; ascent 0.88 em, descent 0.12
  em; vertical text 1 em per character. The fonts are named, not bundled, so the model is chosen to err
  towards overflow. A browser measurement would depend on installed fonts and make `check` need Chrome.
- Contrast composites every painted shape under nine sample points of the text extent, in document
  order over white: rects, polygons, circles, lettering paths, opacity, fill-opacity and linear
  gradients. An image slot counts as its declared ground tone (a palette role, `bg` by default); the
  placeholder is hatched in that tone so the preview shows what is checked, and the result notes that the
  real image needs a second look.
- Accent area sums accent-role or accent-coloured paint clipped to the canvas (overlaps counted twice,
  an upper bound); text at 45% of its extent.
- Figure zone: horizontal overlap share of a title slot with the zone while their rows intersect, limit
  30% (the study's rule: 0/13 outfit and 0/6 operator samples exceed it). The PV cover declares no figure
  zone (5/8 samples set the title over the figure on a scrim) and relies on contrast plus its 16:9 crop
  zone.
- Thresholds: 12 px text, 9 px lettering cap height, WCAG 4.5:1 and 3:1 for large text (24 px, or
  18.66 px at weight 700; lettering counts its cap height / 0.72), alignment tolerance 0.5% of the width.

## Parameters and variation

Each parameter has a class. `proportion` holds the measured relations; `rhythm` holds the variation
knobs; `decoration` holds layers and counts. `--seed n` draws every rhythm value uniformly inside its
range with a seeded generator (mulberry32), so a seed is repeatable; explicit `--param` wins. Ranges
were narrowed until 200 seeds per template pass the check; ranges for proportions stay near the
measured spread, and a few deliberately reach past it (the outfit figure centre down to 0.45) so the
check, not the range, stops a title over the figure.

## Where the study failed its own check

Running the measured study through the check found colours below contrast thresholds, budgets that
overflowed their boxes, and overlapping elements (credits past the frame, a separator over the line
text, a highlight line over the third skill line). Each fix is listed in the template's
`changesFromStudy`; the measured numbers in `spec.md` are unchanged.

## CLI

The bank joins the existing `template` command rather than adding a new top-level command; the
region-template actions are untouched. `dispatch` accepts a third positional only for actions that
declare `operand: true` (`template render`, `template check`); every other command still fails with
`UNKNOWN_ARGUMENT`. `-o` is accepted as the short form of `--output` for `template render` only.
`--png` reuses `capture-composition.cjs` (the `composition capture` kernel) with puppeteer-core resolved
from the project, the working directory or the skill.

## Not in this change

- No pixel-level check of real art under text; the result points to `--png`.
- No wiring into `next`, stages or receipts: the bank is a supporting tool.
- Templates T1-T7 from the ignoredone tutorials (strategy-video cover, stream kit, Q/A cards, texture
  recipes) are recorded in `docs/research/ignoredone-arknights-design.md` for later templates.
