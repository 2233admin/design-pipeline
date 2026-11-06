# Design: crisis-command

## Decisions

- **Name.** `crisis-command` (pack) and `crisis-command-ui-kit` (example): generic, no work, organisation or
  character name anywhere in the repository; tests grep for the reference's names.
- **Measure the whole screen first (#301).** Type cards: 79-97% dark, type 16-19% (3-9% on film titles),
  weight centre (0.38, 0.60) on the reference card. Alarm screens: 14-32% hot colour, centre near the middle.
  Our renders: title card 83% dark / 15% type / (0.42, 0.61); film title 93% dark / 6% red; alarm wall
  screen 28% hot / (0.41, 0.45).
- **Compression steps from glyph ink boxes.** Uncompressed Mincho reads 1.0 (483 / 474 on the reference
  card); captions 0.85, credits 0.64-0.70, film titles 0.35 in every reference film. The open substitute's
  horizontals thin out under 0.4, so the film template stops at 0.40 (range 0.30-0.50).
- **Compressed text in the bank.** `compress` wraps the `<text>` in `matrix(c 0 0 1 x(1-c) 0)`: scale-only,
  so the existing transform-aware extent measures it, and the browser renders it as written. Type size now
  comes from the vertical axis (`hypot(m[2], m[3])`), which equals the old value for rotation and uniform scale
  and keeps a compressed 120 px title at 120 px instead of 48 px. Considered and rejected: `textLength` with
  `lengthAdjust` (unsupported by the static measure), a separate compressed font role (the face does not have
  a width axis).
- **Segment digits are drawn, not set.** DSEG is OFL with a reserved font name, so a subset would have to be
  renamed; drawing the segments (`segText`) needs no font and is measured as lettering (digits and `: .` are in
  the lettering glyph list).
- **Latin width from the face that renders (#323).** With Archivo in `--font-dir`, widths are the larger of
  Archivo's advances and the check's text model (so the static extent fits the box too); without it the role
  is pinned to Noto Sans SC and recorded in `fontSwitches`.
- **Accent budgets per screen kind.** The alarm wall's accent is the panel red (budget 0.7, default 0.61);
  the board keeps red-orange to state (0.06); the countdown allows the danger cut (0.18).
- **Kit fonts ship as WOFF subsets** (Noto Serif SC Black from the Noto CJK release, Archivo), not WOFF2,
  so `coverage.readFontCoverage` and the browser check can read their cmaps; a test fails when copy uses a
  character outside the subset.
- **No drawn mecha or people (#301).** Every picture position is an art slot: an empty monitor in show mode,
  a hatched frame with task id, size and safe area in `?slot=1`; six task sheets and `layers.json`.

## Not done

- Generated art itself (task sheets only).
- A light theme: the grammar has none; the paper card is a card variant.
