# atomic-age: mid-century Space-Age retro-futurism as a style pack of ten templates and a small example kit

## Why

Closes #335. The owner supplied a mood board of mid-century Space-Age retro-futurism and asked for "a set
of templates": magazine covers, travel and science posters, cloth-bound books, car-brochure ads and labels
on one side, and on the other the flight plans, checklists, orbital plates and press credentials of the
early crewed space programmes. None of the bank's packs carries this grammar (cassandre-litho has one
lithograph poster composition, cyanotype-specimen one ink, no pack has documents).

The grammar's titles are condensed faces (League Gothic is about half as wide as the check's sans model).
The static check measures every `<text>` with that model, so a condensed title either fails
`text-overflow` or has to be set far smaller than the face allows.

## What Changes

- **Style pack `atomic-age`** (`styles/atomic-age/style.json`, the existing style schema): six OFL faces
  (League Gothic, Jost 500 and 700, Courier Prime 400 and 700, Caveat 600) with a catalog family behind each;
  the measured grammar; materials recipes for ageing, halftone and misregistration through `materials
  generate/process`; checks with the 64 px test, the no-drawn-mark rule, the no-drawn-vehicle rule (#301) and
  unsigned annotations.
- **Ten templates**: `cover.atomic-magazine`, `poster.atomic-travel`, `cover.atomic-linen-book`,
  `banner.atomic-ad-panel`, `card.atomic-field-label`, `doc.atomic-flight-plan`, `doc.atomic-checklist`,
  `poster.atomic-orbit-plate`, `card.atomic-credential`, `poster.atomic-solar-print` (new family `doc`).
  Logos, insignia and emblems are image slots with a size and clear-space rule; rockets and satellites are flat
  glyph silhouettes; scenes are image slots.
- **Embedded-face widths in the static check**: `measure.registerFaceAdvances(family, weight, table)`; text
  whose first family is a registered face at that weight, embedded in the same file by `@font-face`, is
  measured with the face's advances; any other text keeps the calibrated model. `Doc.text` wraps with the
  same table when the face comes from `--font-dir`.
- **Example `examples/atomic-age-kit/`**: a print-set sheet filling all ten templates (original world plus
  real history as text), a landing page at 1440 and 390 wide with a `?slot=1` placeholder mode, NASA period
  imagery (1964-1975, public domain) processed through `materials process`, generated papers and printed
  flats with their records, OFL subsets and two task sheets.
- OFL subset fixtures under `tests/fixtures/atomic-age/fonts/` so tests pass `--font-dir` (#323).

## Capabilities

- `design-pipeline`: the template bank gains one style pack, ten templates, the `doc` family and
  embedded-face widths; the examples gain the atomic-age kit.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`zone`/`align`/`image`,
  font pinning when a face is not supplied (#323), the empty-slot marker of `layouts-ink.cjs`, `layout-kit.cjs`
  (`rbox`, `ngon`, `rng`, `invalid`), `materials add|generate|process` and their records, `coverage.readFontCoverage`.

## Impact

- New: `tools/template-bank/layouts-atomic.cjs`, `atomic-advances.json`, `styles/atomic-age/style.json`, ten
  template folders, `examples/atomic-age-kit/`, `tests/template-atomic-age.test.cjs`,
  `tests/atomic-age-kit.test.cjs`, `tests/fixtures/atomic-age/`.
- Changed: `measure.cjs` (face advance registry, `@font-face` reading in `readSlots`), `bank.cjs` (layout
  registry, wrapping with an embedded face), `cli-core.cjs` help (`doc` family), `references/template-bank.md`,
  `package-resources.json`, `scripts/test-manifest.json`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`; the pack
  lists in `tests/template-style-pack.test.cjs` and the template count in `tests/template-bank.test.cjs`.
- No new CLI flag, rule, schema or gate. Existing templates' check output is unchanged (no other pack embeds a
  registered face).
