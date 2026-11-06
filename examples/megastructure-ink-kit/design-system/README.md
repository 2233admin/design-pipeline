A kit in a megastructure-ink grammar: black and cold grey, one light (`signal`), white hairlines, square
corners, structures drawn as ink with screentone, and almost no words.

## Content fundamentals

- Say less. A screen holds one section head, at most three short paragraphs of one or two sentences each,
  labels and readouts. No exclamation marks, no adjectives of scale (巨大, 无尽): the scale marker and the
  depth numerals say it.
- Labels pair 中文 (2–4 characters, `label`, tracked 0.2em) with an English line in `caps` (capitals, 1–3
  words). The English names; it never translates a sentence.
- Numbers are tabular in the `data` face: depths are written `−41,200 m` with a real minus sign (U+2212),
  thousands separators, a space before the unit. Times are `03:12:44`, dates `2026.11.06`, codes `S-07`,
  `TX-0412`, `LINE 0412`.
- Strings with CJK never go into the `wide` or `data` faces (they are Latin-only subsets): readouts and
  captions that hold CJK switch to `sans` (`.readout.is-cjk`, `.label`).
- Fixed wording: 开始下潜, 预约下潜, 静默, 发送握手, 接入被拒绝, 你在这里, 已测 / 测量中 / 危险 / 未知.
- The rail script (`GlyphLine`) is decoration with a reading beside it; it never carries information alone.

## Visual foundations

- Colour: `void` ground, `ground` bars and sections, `panel` / `panel-raised` surfaces. `text`, `text-muted`,
  `text-faint` on them. `line` is the white HUD hairline (frames, ruler majors, scale marker). `signal` is the
  one light: current state, primary button, focus, live readouts; keep it under 3% of a screen. `alarm` and
  `alarm-dim` are for hostile contact and lost lines only. `screen` with `screen-line` scanlines is the
  in-world monitor. `paper` / `on-paper` belong to ink plates and the plate tile.
- Type: `display-title` once (the name, compressed to 78% with `.ms-compress`); `display-depth` for the one
  giant numeral of a section; `title-section` thin (300) and tracked; `title-block` for card titles; `body`
  and `body-sm` light; `label`, `caps`, `readout` and `data-sm` for the HUD voice. Scale contrast is at least
  1:10 inside a screen (128px name over 12px labels; a 10px tick against a 420px bracket).
- Spacing: 4px base (`space-1` … `space-16`); 64px side margins (`space-16`); the depth ruler pitch is `tick`
  (8px).
- Layout: a 56px top bar (`bar-h`), a 72px depth rail (`rail-w`) on the right, one screen per section (min
  `min(100vh, 1080px)`), content grids of 5:6 or 7:4 columns; in-game screens are fixed 1920 × 1080 grids.
- Borders and radii: `radius-none` everywhere; `radius-dot` only for status dots and radio marks. Edges are
  `hairline`; selection and focus `stroke`. HUD frames are corners only (`corner`, 14px).
- Texture: ink plates (procedural structure, screentone, hatching) fill art slots in show mode; 3px
  scanlines (`scan-pitch`) on screens; the 8px ruler.
- Depth: flat. Only the dialog sits over a `scrim`.
- States: hover steps a fill (`panel` → `panel-hover`, `signal` → `signal-strong`); active presses 1px; focus
  is a 2px `focus-ring` outline offset 2px; disabled is `panel` with `text-faint` and `rule-strong` (no
  opacity); loading is `aria-busy` with a light sweeping a 2px line or a scanning head; alarm blinks on
  `dur-alarm` with `ease-step`.
- Motion: hover `dur-fast`; tabs and toggles `dur-base`; lines trace in over `dur-reveal`; terminal lines
  print at `dur-type` per character; cursor and live dots blink on `dur-blink`; scans take `dur-scan`. Under
  `prefers-reduced-motion` everything runs for 1ms once.
- Responsive: under 1280px grids stack; under 760px the bar is 48px, the nav becomes a drawer, the rail
  hides, the side margin is `space-4`.

## Iconography

- The kit's own line icons (`build/icons.cjs`): 24-unit grid, 1.5-unit square-capped strokes in
  `currentColor`, no fills except the play triangle. 20px in controls, 16px in buttons and plates.
- Pages reference an inline sprite (`<use href="#i-name">`); previews inline the paths. Icons are
  `aria-hidden`; the control carries the label.
- No logo file ships. The mark is the rail-script line of the work's Latin name beside the name in the
  display face (`Brand` in `build/parts.cjs`), 10px high in the bar. Replace both with the product's own
  mark at the same size; never redraw a real brand.
