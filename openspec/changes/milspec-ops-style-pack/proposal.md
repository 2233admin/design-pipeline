# milspec-ops: a tactical extraction shooter's site and in-game UI grammar as a style pack

## Why

Closes #319. The owner named a live official site of a tactical extraction shooter and asked to learn its
layout grammar for an official site and in-game UI, as in the street-tape case: measure it privately,
build an original site and in-game screens on it, ship the grammar under a generic name. We captured the
site (screens, computed styles, motion keyframes, interaction states; private, never shipped), built an
original one-page site (寂原行动 STILLFIELD: six full screens, a 390-wide page, a slot mode for generated
art) and three in-game screens (gunsmith, extraction pre-match inventory, match HUD), and brought
`template check --browser` to 0 findings from 29 on the first pass (and from 6 again after a rework that
replaced code-drawn scenery with data grounds). The grammar (dark slate full screens,
one signal green at the hot spots, amber for the selected item, hairline frames with corner ticks, a
selection rail, a right detail column, part callouts on a pegboard, a docked bottom nav with a raised CTA)
is in none of the bank's packs; the nearest, `acid-print-hud`, is acid yellow-green on black slabs with
halftone. Without a pack the next brief of this kind starts from zero and re-learns the same traps (CJK
values in a Latin face, labels in a scene on fog, a slice-scaled phone scene cropping its markers).

## What Changes

- **Style pack `milspec-ops`** in `skill/tools/template-bank/styles/milspec-ops/style.json`, in the existing
  `design-pipeline.template-bank-style.v1` shape: font roles through the catalog with fallbacks (Noto Sans
  SC for CJK and mixed copy, Rajdhani and Barlow Condensed for Latin and digits only), layout grammar with
  the reference's numbers, materials and recipes, motion grammar (measured keyframes), checks with the 64 px
  test and the case's traps, provenance (case, generic lineage, "borrow grammar, never assets", rounds) and
  examples. It names no game, studio, operator, faction, map or real weapon.
- **Five templates** rendered from parameters with original copy: `ui.ops-dock` (1920 x 110, a five-sided
  CTA plate), `card.ops-select-rail` (320 x 900, 3-6 items), `kv.ops-callout` (1920 x 1080, a generic
  code-drawn rifle with 3-5 callouts), `card.ops-intel` (483 x 424; `date` takes digits and `/ . -`) and
  `ui.ops-brief` (500 x 640, 2-4 rows).
- No change to `template check`, its rules, schemas, gates or CLI flags.

## Capabilities

- `design-pipeline`: the template bank gains one style pack and five templates.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.image`/`Doc.zone`,
  `invalid` from `layout-kit.cjs`, the `BankError` codes and exit codes 0 / 2 / 1.

## Impact

- New: `tools/template-bank/layouts-ops.cjs`, `styles/milspec-ops/style.json`, five template folders,
  `tests/template-milspec-ops.test.cjs`.
- Changed: `bank.cjs` (layout registry list), `references/template-bank.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `CHANGELOG.md`; counts in `tests/template-bank.test.cjs` and
  `tests/template-style-pack.test.cjs`.
