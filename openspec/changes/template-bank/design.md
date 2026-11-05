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
- `<text>` extents use an advance model, because the fonts are named, not bundled, and a browser
  measurement would depend on installed fonts and make every `check` need Chrome. Printable ASCII uses
  per-character tables measured in headless Chrome with Noto Sans / Serif CJK SC (maximum over the faces
  each table covers, plus 2 percent): REGULAR for the sans at 400-700, HEAVY for the sans at 900 and the
  serif. Floors: capitals 0.72 em, digits 0.62, W M m w 0.95, `!` 0.42, `@` 1.05; emoji 1.3; other
  scripts below U+2000 1.1 (1.25 heavy); CJK, kana, Hangul and full-width forms 1 em; ascent 0.88 em,
  descent 0.12 em; vertical text 1 em per character. The guarantee is only this:
  `tests/template-bank-browser.test.cjs` (skipped without Chrome and the fonts) asserts the model is at
  least Chrome's width for every calibration string in every family and weight the layouts use. The
  first review found the earlier class model under-measured wide Latin (WWWW 374 vs 328) and a serif
  Black slot overflowed by 57 px while passing; that is why the tables are measured.
- Contrast composites every painted shape under 27 sample points (9 x 3) of the text extent, in
  document order over white: rects, polygons, circles, lettering paths, opacity, fill-opacity and linear
  gradients; an opaque shape hides what is under it. An empty image slot counts as its declared ground
  tone (a palette role, `bg` by default), and its placeholder is hatched in that tone. When the slot holds
  a real image, the geometry cannot know its pixels: the CLI renders the SVG in headless Chrome with every
  text and lettering slot hidden (`template-sample.cjs`, the same puppeteer and browser resolution as
  `composition capture`), reads the pixels at the same 27 points and judges the minimum contrast. If the
  browser is missing, `--tone <slot>=#RRGGBB` declares the tone instead; with neither, the check fails
  with `contrast-unverified` and the fix names both. `bank.check(svg, { tones, pixels })` takes the same
  inputs, and `bank.pixelRequests(svg)` lists the points to sample.
- Unsupported geometry fails: nested `<svg>`, `<use>`, `<foreignObject>`, `<textPath>`, CSS rules or
  style attributes that move or restyle, tspans with `dx`, `x`, `y` or `rotate` (the renderer's own
  tspans carry only `dy` and the parent `x`), and transform functions other than translate, rotate,
  scale and matrix. A file the check cannot model must not pass.
- What a hand edit cannot change: figure zones, title flags, alignment lines and the accent budget are
  written into the file at render time, and the check does not track an image swapped into the file;
  re-render with `--set`.
- Lettering: characters outside the glyph set (now the study's 53 plus `, ; " &` and the euro sign) make
  the slot fall back to the CJK font; the check reports `lettering-fallback` with the characters, as the
  style changed. Lowercase drawn as capitals is a note.
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
range with a seeded generator (mulberry32), so a seed is repeatable; explicit `--param` wins. Seeds vary
sizes, gaps, tracking and lettering shape, not the layout: layout variation comes from another template
or from setting proportion parameters. Ranges
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
from the project, the working directory or the skill. The check runs first; a failed capture adds a
warning and leaves the check result and exit code as they are. Help lists the region-template actions
and the bank actions under two headings of the same `template` command.

## Not in this change

- No wiring into `next`, stages or receipts: the bank is a supporting tool.
- Templates T1-T7 from the ignoredone tutorials (strategy-video cover, stream kit, Q/A cards, texture
  recipes) are recorded in `docs/research/ignoredone-arknights-design.md` for later templates.
