A crisis-terminal kit: type cards in heavy Mincho compressed by a transform on black, red hexagon alarm walls over a blue
lattice screen, amber segment-digit clocks, coupling graphs and a five-seat vote. One theme (Terminal), because the grammar
has one: an almost black ground and one hot colour family per screen.

## Content fundamentals

- Write Chinese first, set in `mincho`; every label pairs a short Chinese name with an English caption under it (`grot-label`,
  caps, 0.14em). English never sits above the Chinese and never translates a sentence: it names.
- Titles are noun + verb with a comma: 水位、越线 / 闸门、不开. Reports are numbered 第壹报, 第弍报 … in financial numerals.
- State words are fixed: 常态 NORMAL, 警戒 CAUTION, 越线 BREACH, 检修 SERVICE, 待机 STANDBY, 出动 SORTIE, 封存 SEALED; votes
  are 可 / 否, results “可决 4 · 否决 1”.
- Times are `HH:MM:SS` in segment digits; elapsed time `HH:MM:SS.cc`; figures keep units (`1,450 m³/s`, `+4.21 m`, `41.3 %`).
- Log lines: time, a three-letter source (SYS, OPS, ERR), a plain sentence without a full stop at the end.
- No exclamation marks. Alarm copy states what happened and where (第九排涝区 转入防潮战备), never how to feel.

## Visual foundations

- Colour: `void` is the ground of everything except the alarm wall (`screen` with the `lattice`). One hot family per screen:
  `alert` (red-orange) for warnings, the band, danger, thresholds and the current nav rule; `amber` for data (clocks, labels,
  the main trace, lit cells). `alarm` fills hexagons with `on-alarm` type. `ink` and `paper` are structure. Red-orange text
  under 24px uses `alert-ink`. `ok` appears only on the normal tag.
- Two light regimes: type cards stay 79–97% `void` with one block of type; alarm screens carry 14–32% hot colour. Do not
  mix them on one screen.
- Type: `mincho` (Noto Serif SC Black, bundled as a subset in `fonts/`) for every Chinese title, label and unit, compressed
  with `transform: scaleX()` in the measured steps — 1.00 on a title card, 0.85 on panels and section titles (`.cc-sq`),
  0.65 for credits, 0.40 for the film title. `grot` (Archivo) for English, compressed with `font-stretch` or scale.
  `sans` for paragraphs (`body`, `body-s`). Section titles use `head-xl` at 0.85.
- Digits are drawn segments (`templates/seg.js`): capsule for clocks and ratios, LCD for elapsed time and the bar clock.
  Never set clock digits in a font.
- Spacing: 4px base (`space-1` … `space-16`); screens pad `space-8` by `space-12`; panels `space-5`.
- Borders and corners: square, or cut at 45° (`chamfer` on bezels and plates, `chamfer-sm` on buttons). Rules are 2px
  (`rule-strong`) or 1px (`rule`); hexagons are double-ruled (`hex-rule` 6px outside, 2px inside, 12px apart). Rounded
  only on the MODE box (`radius-box`) and the slot crosshair (`radius-round`).
- Hexagons are 3.06:1 at their measured size with 55° tips (`--hex-tip: 0.35` of the height); on phones the tip blunts to
  0.16 so copy fits.
- Texture: the 45° lattice (`lattice-step` 46px) and scanlines (`scan` 3px) only on screens (alarm wall, graph, slots),
  never on a type card; hazard stripes (`stripe`) only on the band, the dialog head and a lit plate's corner.
- States: hover steps a fill (`amber` → `amber-strong`, `alert` → `alert-strong`, transparent → `amber-wash` or
  `panel-raised`); pressed moves 1px; focus is a 2px `focus-ring` outline offset 2px (cut corners drop so it reads all
  round); disabled is `panel-raised` with `ink-dim` (never opacity); loading is `aria-busy` with a stepping bar.
- Danger is a state of the page (`.is-danger` on `body`): a hard cut (`dur-cut`) to red-orange clocks, a filled danger
  cell and a red state badge. Never fade into it.
- Motion: the band's stripes blink at 1 Hz (`dur-blink`), screens shimmer in 2-step flickers (`dur-flicker`), clocks
  tick (`dur-tick`), the graph scrolls every 100ms. Under `prefers-reduced-motion` all of it stops.
- Responsive: under 760px screens stack, the nav becomes a drawer, the honeycomb becomes a column (one side panel
  and one seat), the report grid goes to two columns and clock digits drop to 64px.

## Iconography

- Six square-capped 2px line icons in `currentColor` on a 24px grid (alert triangle, close, play, menu, arrow, lock,
  sound) inline in the markup (`build/parts.cjs`); 20px in controls, 16px in buttons. Decorative (`aria-hidden`); the
  control carries the label.
- The warning triangle on alarm panels is a solid CSS triangle, not an icon.
- No logo file ships: the mark is three sluice bars over a water line (`MARK` in `build/parts.cjs`), 28px in the
  command bar and footer, drawn in `alert`. Replace it with the product's own mark at the same size; never redraw a
  real organisation's logo.
