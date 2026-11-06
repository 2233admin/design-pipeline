# celestial-voyage: a star-voyage fantasy RPG site grammar as a style pack

## Why

Closes #321. The owner named the public official site of a star-voyage fantasy RPG and asked for its
official-site and in-game UI grammar as a pack, with no characters in the showcase: character art will
come from an image model through the compositing pipeline. We captured the site with Playwright
(screenshots of every screen, computed styles, interaction states and timings; private, never shipped),
built an original one-page site on the grammar (长庚航志 VESPERWAKE: four fullpage sections and a footer, a
390-wide page, a `?slot=1` placeholder mode, a star chart and a banner screen) and brought it to 0 findings
in `template check --browser` from 39 on the first pass. The grammar (a deep navy star field, gold only as
hairlines and the current state, a heavy CJK serif title over a hairline italic Latin ghost, a hanging
logo with a cream download tab, gilt-rimmed cards, faction medallions on an off-screen-centred arc) is in
none of the bank's packs: street-tape is light grey and acid, acid-print-hud is acid and chamfered.

## What Changes

- **Style pack `celestial-voyage`** in `skill/tools/template-bank/styles/celestial-voyage/style.json` in the
  existing `design-pipeline.template-bank-style.v1` shape: font roles through the catalog with fallbacks
  (Noto Serif SC 900 for titles, Noto Sans SC for body and mixed copy, Cinzel and Cormorant Garamond for
  Latin only), layout grammar with the measured numbers, materials and recipes (generated star dust, an ink
  flat and a paper stub instead of drawn pictures), motion grammar, checks with the 64 px test, the show-mode
  rule and the case's traps, provenance and examples. It names no game.
- **Four templates** rendered from parameters with original copy: `ui.voyage-topbar` (1920 x 140),
  `card.voyage-ticket` (626 x 518), `kv.voyage-ticket-carousel` and `kv.voyage-orbit-roster` (1920 x 1080).
  Dates take digits and `/ . -`; the Latin ghost takes capitals, digits and `& . ' -`.
- `template distill` gives strips wider than 4:1 their own aspect class (`strip`), for references and
  templates alike, so a site bar is never the nearest layout of a 16:9 key visual (the new 1920 x 140 bar
  was, at distance 0.036, before this).
- No change to `template check`, its rules, schemas, gates or CLI flags.

## Capabilities

- `design-pipeline`: the template bank gains one style pack and four templates.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.image`/`Doc.zone`/
  `Doc.slotAttrs`, `rng` and `invalid` from `layout-kit.cjs`, `materials generate` (halftone, paper, print),
  the `BankError` codes and exit codes 0 / 2 / 1.

## Impact

- New: `tools/template-bank/layouts-voyage.cjs`, `styles/celestial-voyage/style.json`, four template
  folders, `tests/template-celestial-voyage.test.cjs`.
- Changed: `bank.cjs` (layout registry list), `distill.cjs` (aspect class), `references/template-bank.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `CHANGELOG.md`; counts in `tests/template-bank.test.cjs` and
  `tests/template-style-pack.test.cjs`; the distill test's list of left-title 16:9 nearest templates.
