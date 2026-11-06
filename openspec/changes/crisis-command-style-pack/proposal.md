# crisis-command: a crisis-terminal and title-card grammar as a style pack, a UI kit and an original case

## Why

Closes #331. The owner asked for a template set, references and a component library in the interface and
title-card grammar of a 1990s giant-robot anime and its film remakes. We measured the grammar privately on
frames and title cards (glyph ink boxes, palettes, whole-screen light and colour shares, frame-by-frame
countdown states; never shipped, the work is not named) and built an original case on it (潮位警报 TIDEMARK:
an organisation terminal site with six screens, an operator console, a sortie coupling monitor, a 390-wide
page and a `?slot=1` placeholder mode with a task sheet per art slot). None of the bank's packs carries this
grammar: shinbo has Mincho cards but no mechanical compression, no alarm hexagons, no segment clocks.

The grammar's signature is mechanically compressed heavy Mincho (four measured steps: 1.00, 0.85, 0.65,
0.35). The bank could not set compressed text: a scale on a text group shrank the type size the check
reads, so a compressed title failed `type-size` as small text.

## What Changes

- **Style pack `crisis-command`** (`styles/crisis-command/style.json`, the existing style schema): Noto Serif
  SC Black for the Mincho role, Archivo for Latin only, Noto Sans SC for body; the measured grammar; materials
  and recipes; motion (hard cuts, low-amplitude shimmer, a 1 Hz band); checks with the 64 px test and the
  no-drawn-mecha rule (#301); provenance without the work's name.
- **Five templates**: `card.crisis-title-card` (4:3), `banner.crisis-film-title` (40:17),
  `ui.crisis-alert-wall`, `ui.crisis-countdown`, `ui.crisis-sync-graph` (16:9). Clocks and ratios are drawn
  segment digits in lettering slots; Latin roles take ASCII only; digit slots take only their pattern.
- **`Doc.text(..., { compress })`**: horizontal compression as a scale-only matrix about the anchor; the
  check's text extent already follows the transform. `measure.textExtent` now reads the type size from the
  vertical axis of the transform (unchanged for rotations and uniform scales).
- **Example `examples/crisis-command-ui-kit/`** in the design-system package format of #327: 26 components
  with states, a cover, DESIGN.md / MOTION.md, GRAMMAR.md, the case's pages, OFL font subsets, art tasks with
  `layers.json`, a generator with `--check`.
- OFL subset fixtures under `tests/fixtures/crisis-command/fonts/` so browser tests pass `--font-dir` (#323).

## Capabilities

- `design-pipeline`: the template bank gains one style pack, five templates and compressed text; the
  examples gain the crisis-command UI kit.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.zone`/`Doc.slotAttrs`/
  `Doc.clipBox`, lettering-kind slots, `invalid` from `layout-kit.cjs`, `pinFamily`-style font pinning (#323),
  `design-system check|compile|design-md-tokens`, `foundation check`, `coverage.readFontCoverage`.

## Impact

- New: `tools/template-bank/layouts-crisis.cjs`, `styles/crisis-command/style.json`, five template folders,
  `examples/crisis-command-ui-kit/`, `tests/template-crisis-command.test.cjs`,
  `tests/crisis-command-ui-kit.test.cjs`, `tests/fixtures/crisis-command/`.
- Changed: `bank.cjs` (layout registry, `compress`), `measure.cjs` (type size from the vertical axis),
  `references/template-bank.md`, `package-resources.json`, `scripts/test-manifest.json`, `CHANGELOG.md`,
  `THIRD_PARTY_NOTICES.md`; the pack lists in `tests/template-style-pack.test.cjs` and the template count in
  `tests/template-bank.test.cjs`.
- No new CLI flag, rule, schema or gate.
