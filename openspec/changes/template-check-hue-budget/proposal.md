# Proposal: `template check --browser` measures a saturated-hue budget by declared role

## Why

The industrial sci-fi sheet grammar (change `industrial-document-sheets`) holds a sheet to one
dominant brand colour, an optional counter colour for numerals and hairlines, status colours as
small tags, and nothing else saturated. The upstream checker enforces it with area limits per
role. `template check --browser` has no such measure: its static `accent-budget` reads a template's
own accent role from the SVG it wrote, and the browser half measures text (overlap, off-canvas,
contrast, coverage) and collage, never how much of the page a hue paints. A hand-built page with a
stray green panel or a counter colour used as a fill passes today.

## What changes

- New rule `hue-budget` in the browser half (`tools/template-bank/page-check.cjs`), **opt-in**: it
  runs only on a page whose root declares colour roles with `data-hue-brand`, `data-hue-counter`,
  `data-hue-alert` and `data-hue-timed` (any CSS colour). A page that declares none is not measured.
- Measure: one screenshot of the page as drawn, with elements marked `data-deco` / `data-decor`
  hidden; each pixel at OKLab chroma 0.08 or more goes to the declared role whose hue is nearest
  within 25 degrees, otherwise to a 10-degree hue bin. Runs of occupied bins are the undeclared hues.
  The shot is read at full resolution, and an undeclared-hue pixel counts only when at least 5 of its
  8 neighbours are undeclared too (`hueBlockNeighbours`), so a 1 px rule and the colour fringe of
  antialiased text (LCD subpixel rendering) are not an area. Declared roles count every pixel.
- Limits in `PAGE_RULES`: counter 3% of the canvas, alert and timed 1% together, any undeclared hue
  0.1%. The brand colour is reported in a note and in the result's `hue`, never limited.
- A declared value that is not a colour, or not saturated, is said in a note and not measured.
- `references/template-bank.md` documents the rule and the declaration; the guide
  `industrial-document-sheets.md` states the same numbers, and a test keeps them equal.

## Reused, not added

- `template check --browser`, its finding shape (`rule`, `slot`, `measuredBy`, `measured`, `limit`,
  `message`, `fix`), the `data-deco` exemption, exit codes 0 / 2 / 1, `PAGE_RULES` overrides.
- The OKLab conversion of the brand design-system catalogue (`rgbToOklab`, now exported); no second
  colour-space implementation.

## Boundaries

- No new gate, command, CLI flag, receipt schema or style-pack `checks` entry; static `accent-budget`
  is unchanged. No existing page changes verdict, because nothing is measured without a declaration.
- The medium-based text-size floor (screen 9, feed 14, slides 16, CJK +2 px) is **not** added: the
  browser half has no size rule today, and a default-on floor would change the verdict of existing
  pages. Deciding between an opt-in medium declaration and a default floor is left to a follow-up.
- An undeclared colour drawn as a line 1 px thick, or as text thinner than 2 px, is not counted; the
  rule limits area, and a thin accent is judged by eye.
- A passing check is technical conformance only; it grants neither visual nor creative acceptance.

## Capabilities

- `design-pipeline`: ADDED `Template check measures a saturated-hue budget by declared role`.
