# frontier-survey: an industrial sci-fi frontier game site grammar as a style pack

## Why

Closes #315. The owner asked to learn the layout grammar of an industrial sci-fi frontier game's official
site and its in-game UI, with no characters in the showcase (figures come later from an image model and are
composited in). We captured the reference site with Playwright at 1920 and 390 (screenshots, computed
styles, clip paths, transitions and keyframes; private, never shipped), measured it, built an original
one-page site on the grammar (远垦导线 TRAVERSE: eight sections, a 390-wide page, a no-figure showcase
with a `?slot=1` placeholder mode, two in-game screens) and brought it to 0 findings in
`template check --browser` from 68 on the first pass. The grammar (a white page with a fixed left rail,
one signal yellow only as tall columns and side bands, a four-layer section title, hatched ghost
lettering, contours and data marks, a dark middle pair of sections) is not in the bank:
the key-art packs cover promotional art, not the site and UI layer, and `street-tape` is a grey
page with black stripes and 49-degree cuts. Without a pack the next brief of this kind re-measures it and
re-learns the same traps.

## What Changes

- **Style pack `frontier-survey`** in `skill/tools/template-bank/styles/frontier-survey/style.json` in the
  existing `design-pipeline.template-bank-style.v1` shape: font roles through the catalog with fallbacks
  (Noto Sans SC 700 / 500 for CJK, Michroma and Poppins for Latin and digits only), the measured grammar
  (1.5x unit, rail 90 / 60-unit pitch, title block 78 x 24 + 27 : 36, column 656 x 1043, band 229, yellow
  0-6% with key art and 15-30% without), materials and recipes, motion grammar with the measured timings and
  the flicker keyframes, checks with the 64 px test and the case's traps as guidance, provenance and
  examples. It names no game: the lineage is "the official-site grammar of industrial sci-fi frontier games".
- **Five templates** rendered from parameters with original copy: `ui.survey-rail` (270 x 1080, the open
  rail, `current`), `card.survey-section-title` (960 x 540, `tone=light|dark`), `card.survey-dossier`
  (1920 x 1080 crew screen with a portrait slot), `kv.survey-album` (1920 x 1080, `side=right`,
  `band=yellow|grey`, `wordmark`), `banner.survey-timeline` (1920 x 640). Structural slots are validated:
  wide Latin slots take Latin caps, indexes take digits and `/`, dates take `MM.DD`.
- No change to `template check`, its rules, schemas, gates or CLI flags.

## Capabilities

- `design-pipeline`: the template bank gains one style pack and five templates.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.image`/`Doc.zone`/`Doc.def`,
  `rng`, `esc` and `invalid` from `layout-kit.cjs`, the `BankError` codes and exit codes 0 / 2 / 1.

## Impact

- New: `tools/template-bank/layouts-survey.cjs`, `styles/frontier-survey/style.json`, five template
  folders, `tests/template-frontier-survey.test.cjs`.
- Changed: `bank.cjs` (layout registry list), `references/template-bank.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `CHANGELOG.md`; counts in `tests/template-bank.test.cjs` and
  `tests/template-style-pack.test.cjs`.
