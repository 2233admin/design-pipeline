# street-tape: a street-fashion city game site grammar as a style pack

## Why

Closes #312. The owner gave a reference board of six screenshots of a Japanese street-fashion urban
action game's official site and asked to learn its layout grammar ("我们做版式就可以"): no characters,
no assets, sized placeholder frames for the art. We measured the board (private, never shipped), built an
original one-page site on the grammar (回放街区 REPLAY WARD: six sections, a 390-wide page, two in-game
screens) and brought it to 0 findings in `template check --browser` from 54 on the first pass. The grammar
(light grey ground, one acid yellow-green, black fine stripes, rounded slabs with one 49-degree cut, a
three-line numbered section title, a right-edge pager, capsule controls, a sticker CTA) is not in any of
the bank's packs; the nearest, `acid-print-hud`, is dark-led. Without a pack the next brief of this kind
starts from zero and re-learns the same traps (Latin faces given mixed CJK copy; a logo lockup measured
as two touching texts; a capsule measured as one unit across three colours).

## What Changes

- **Style pack `street-tape`** in `skill/tools/template-bank/styles/street-tape/style.json` in the existing
  `design-pipeline.template-bank-style.v1` shape: font roles through the catalog with fallbacks (Noto Sans
  SC 900 for CJK, Anton and Oswald for Latin and digits only), layout grammar with the board's numbers
  (49-degree cut, title ink ratio 1 : 0.42 : 2.7, acid 15-22% of a section), materials and recipes, motion
  grammar, checks with the 64 px test and the case's traps as guidance, provenance (case, lineage,
  "borrow grammar, never assets", rounds) and examples. It names no game: the lineage is the generic
  "official-site grammar of Japanese street-fashion urban action games".
- **Five templates** rendered from parameters with original copy: `ui.tape-topbar` (1920 x 66 bar),
  `card.tape-section-title` (960 x 540, `side=right` mirrors), `ui.tape-pager` (46 x 268 pager),
  `kv.tape-cut-carousel` (1920 x 1080 section, `control=track|dots`, `side=right`), `banner.tape-sticker-cta`
  (800 x 400). Structural slots are validated: section and pager numbers take digits only, the date takes
  digits and `/ . -`.
- No change to `template check`, its rules, schemas, gates or CLI flags.

## Capabilities

- `design-pipeline`: the template bank gains one style pack and five templates.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.image`/`Doc.zone`, `rbox`
  and `invalid` from `layout-kit.cjs`, the `BankError` codes and exit codes 0 / 2 / 1.

## Impact

- New: `tools/template-bank/layouts-street.cjs`, `styles/street-tape/style.json`, five template folders,
  `tests/template-street-tape.test.cjs`.
- Changed: `bank.cjs` (layout registry list), `references/template-bank.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `CHANGELOG.md`; counts in `tests/template-bank.test.cjs` and
  `tests/template-style-pack.test.cjs`.
