# megastructure-ink: an endless-megastructure ink grammar as a style pack and a component-library example

## Why

Closes #330. The owner asked for the grammar of a manga-and-anime lineage about endless megastructures —
monumental structure with a tiny figure, dense ink and screentone, black and cold grey with sparse light,
near-silent text, invented scripts, white-line cockpit and terminal HUDs on black and cyan monitors — as a
reference study, a measured grammar, a component library, an original site and a style pack, with no
figures in the showcase and nothing drawn in code that reads cheap (#301). None of the bank's packs carries
it: lattice-dossier is near-black with one cyan but has no structure, no scale and no ink; street-tape and
celestial-voyage are light or gilt.

## What Changes

- **Style pack `megastructure-ink`** in `skill/tools/template-bank/styles/megastructure-ink/style.json` (the
  existing `design-pipeline.template-bank-style.v1` shape): font roles through the catalog with fallbacks
  (Noto Sans SC 900 compressed for the name, Noto Sans SC for labels and copy, Michroma for Latin caps,
  Chakra Petch for readouts; the last two Latin only), the measured grammar, materials and recipes, motion,
  checks with the 64 px and no-figure guidance and the case's traps, provenance and examples. It names no
  work, author, character or organisation.
- **Five templates** rendered from parameters with original copy: `kv.ink-shaft-hero` (1920 × 1080; an
  abstract shaft line system or an image slot, the scale marker, the compressed name, three readouts),
  `ui.ink-topbar` (1920 × 56), `card.ink-label-plate` (720 × 200; panel, screen and alarm tones),
  `ui.ink-hud-frame` (1920 × 1080; viewport, ladder, gauges, comms monitor, alarm) and
  `banner.ink-terminal` (1920 × 640; monitor log, handshake, rail-script stream). Readouts take digits,
  `,` `.` and a minus sign; caps lines Latin capitals (exit 1 with a fix otherwise).
- **Example `examples/megastructure-ink-kit/`** in the design-system package layout of #327: tokens, usage
  README, 26 components with READMEs and previews, a cover, OFL Latin subsets in `design-system/fonts/`;
  a gallery, a seven-screen one-page site (390 wide too, `?slot=1` placeholder mode), a descent HUD and a
  survey terminal; ten task sheets and two layer contracts; a generator with `--check`. Show mode carries art
  slots with a procedural structure plate (`templates/plates.js`; walls, beams, cables, screentone — never a
  figure, mecha or object) and the member cards with echo traces and codes.
- Test fixtures `tests/fixtures/megastructure-ink/` (Michroma and Chakra Petch OFL subsets that keep
  − ° · × – →) so font coverage never depends on installed fonts.
- No change to `template check`, its rules, schemas, gates, receipts or CLI flags.

## Capabilities

- `design-pipeline`: the template bank gains one style pack and five templates; the examples gain one kit.

## Reuse

- `template list|render|check`, the style and manifest schemas, `Doc.text`/`Doc.image`/`Doc.rect`/`Doc.def`,
  `rng` and `invalid` from `layout-kit.cjs`, the layer contract (`layers.cjs`), the design-system package
  check, `foundation check`, `design-system design-md-tokens`, `fonts query|measure`, `materials generate`.

## Impact

- New: `tools/template-bank/layouts-ink.cjs`, `styles/megastructure-ink/style.json`, five template folders,
  `examples/megastructure-ink-kit/`, `tests/template-megastructure-ink.test.cjs`,
  `tests/megastructure-ink-kit.test.cjs`, `tests/fixtures/megastructure-ink/`.
- Changed: `bank.cjs` (layout registry list), `references/template-bank.md`, `package-resources.json`,
  `scripts/test-manifest.json`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md`; counts in
  `tests/template-bank.test.cjs` and `tests/template-style-pack.test.cjs`.
