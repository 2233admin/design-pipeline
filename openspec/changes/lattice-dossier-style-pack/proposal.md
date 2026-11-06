# lattice-dossier: an industrial dossier-terminal game site grammar as a style pack

## Why

Closes #316. The owner asked to learn the layout grammar of a dark industrial-fantasy squad game's official
site and to build an original, figure-free site and in-game UI on it, then to keep the grammar as a pack.
We captured the live site with a headless browser (every screen, interaction states, the news page and the
390-wide page), read computed styles and sampled pixels; the captures stay private and are never shipped.
The original case, 雾航信标 FOGWAKE (six full screens, a news page, a 390-wide page, a lobby terminal and a
battle HUD, a no-figure show mode and a `?slot=1` placeholder mode with 15 image-generation task sheets),
went from 144 findings to 0 in `template check --browser`. None of the bank's packs carries this grammar:
`street-tape` is grey and acid, `acid-print-hud` is an acid HUD, `arknights-endfield` is a single-KV title
column, not a site frame.

## What Changes

- **Style pack `lattice-dossier`** in `skill/tools/template-bank/styles/lattice-dossier/style.json` in the
  existing `design-pipeline.template-bank-style.v1` shape: font roles through the catalog with fallbacks
  (Noto Sans SC for CJK; Michroma, Oswald and Chakra Petch for Latin and digits only), layout grammar with
  the measured numbers (frame hairlines y 152 / y 900 / x 1683, a 172-unit lattice, cyan under 3% outside
  the first screen, a numeral cut to 55%), materials and recipes, motion grammar from the live site (a
  400 ms horizontal push, 0.3 s transitions), checks with the 64 px test and the case's traps as guidance,
  provenance and examples. It names no game: the lineage is "dark industrial-fantasy squad games".
- **Five templates** rendered from parameters with original copy: `ui.lattice-topbar` (1920 x 152),
  `ui.lattice-pager` (236 x 120), `card.lattice-ghost-title` (960 x 540), `kv.lattice-bulletin` (1920 x 1080,
  `tab`, `items`, `active`), `banner.lattice-columns` (1920 x 1080). Screen numbers take digits only; dates
  take the dossier form `2026 // 11 / 06`.
- No change to `template check`, its rules, schemas, gates or CLI flags.

## Capabilities

- `design-pipeline`: the template bank gains one style pack and five templates.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.image`/`Doc.zone`, derived and
  decor slots, `invalid` from `layout-kit.cjs`, the `BankError` codes and exit codes 0 / 2 / 1.

## Impact

- New: `tools/template-bank/layouts-lattice.cjs`, `styles/lattice-dossier/style.json`, five template folders,
  `tests/template-lattice-dossier.test.cjs`.
- Changed: `bank.cjs` (layout registry list), `references/template-bank.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `CHANGELOG.md`; counts in `tests/template-bank.test.cjs` and
  `tests/template-style-pack.test.cjs`; `tests/template-distill.test.cjs` accepts the new left-title card as a
  left-title archetype's nearest.
