A wiki kit in a game-terminal grammar: a light grey ground ruled with a 40px hairline grid, white panels with
chamfered corners, one yellow accent, bilingual 中文 / ENGLISH labels, and a tri-colour signal strip.

## Content fundamentals

- Write Chinese first. Every navigation label, section title, tile and tab pairs a short 中文 name (2–4 characters
  where possible) with an ENGLISH caption: one to three words, uppercase via `caps` (0.16em), in `ink-subtle`.
  Never translate sentences into the caption; it names, it does not explain.
- Address the reader as 各位调查员 / 你 in notices; body text is neutral reference prose. No exclamation marks in
  titles.
- Dates are `YYYY-MM-DD` with tabular numbers (`meta`); times are `HH:MM` in `mono`. Counters use thousands
  separators (`6,204`). Byte deltas use `+` and the minus sign `−`.
- Fixed wording: 最新 (new flag), 进行中 (live), 全部 (the first toggle of every filter group), 查看全部 / 全部动态 →
  (section links), 知道了 (dismiss a notice), 关闭 (close a toast), 重置 (reset filters).
- Entity cards write the English name as `// English Name`; the hero kicker is a two-word English line.
- Missing pages are linked in `link-missing`, never removed: a red link invites the next edit.

## Visual foundations

- Colour: `ink` on `paper`, `panel` and `panel-muted`. `accent` is a fill only — active nav slab and bar, section
  accent bar, kicker bar, selected chips and tabs, mini bars, brackets, the accent button. Accent-coloured text uses
  `accent-ink`. The three signal colours (`signal-magenta`, `accent`, `signal-teal`) appear together only as the
  3px strip (35% / 47% / 18%) and on hover edges; `signal-yellow` and `signal-mint` belong to the notice modal and
  the card mini strip. Rarity colours (`rarity-1` … `rarity-6`) appear only beside a star count.
- Type: `display-hero` once per site (the archive title); `title-page` for page titles; `title-section` between
  [ ] brackets for body sections; `title-block` for home section headers; `body` and `body-sm` for prose and cells;
  `meta` for dates; `caps` for every ENGLISH caption; `stat-number` for counters; `mono` for versions and keys.
- Spacing: 4px base (`space-1` … `space-16`). Sections are `space-8` apart; card and panel padding `space-4` to
  `space-6`; the hero pads `space-10` by `space-16`.
- Layout: a 214px side nav (`sidebar-w`, 64px collapsed) beside a content column of at most 1184px
  (`content-max`); a 56px top bar plus the 3px strip. Under 1024px the nav becomes a drawer; under 760px grids go to
  two columns and side-by-side blocks stack.
- Borders and radii: corners are square (`radius-none`) and cut — `chamfer` (9px) on cards, tiles, buttons and
  panels, `chamfer-sm` (6px) on icon buttons, tags and chips. Hairlines are `rule`; grouping edges `rule-strong`;
  input edges `control-edge`. Only status dots are round (`radius-pill`).
- Texture: the 40px page grid (`grid-line`), the hero dot grid (`dot`, `dot-step`, `dot-size`, faded toward the
  middle), corner brackets (`bracket-arm`, 2px, in `accent` on the hero and `bracket` elsewhere), 135° hairline
  stripes on filter panels, empty states, slots and the modal body, and the horizontal-stripe diamond plate behind
  tile icons.
- Depth: flat by default. `shadow-panel` lifts the entity hero; `shadow-dialog` the modal; `shadow-menu`
  suggestions; `shadow-toast` toasts and hovered cards.
- States: hover moves a fill one step (`panel` → `panel-hover`/`panel-muted`, `accent` → `accent-strong`); active
  presses 1px; focus-visible is a 2px `focus-ring` outline offset 2px and the chamfer cut is dropped so the ring
  reads all round; disabled is `panel-muted` with `ink-muted` text (never opacity); loading is `aria-busy` with a
  spinner or the sweep bar.
- Motion: hover 150ms `ease-standard`; nav width `dur-panel`; drawer and modal `dur-drawer`; the strip, accent bars
  and tab underline wipe from the left with `ease-out-expo`; sections rise 8px over `dur-reveal`; the live dot
  pulses at `dur-pulse`. Under `prefers-reduced-motion` every animation and transition collapses to 1ms.
- Themes: `light` (Daylight) and `dark` (Night shift) switch on `data-theme` on `<html>`; the default follows the
  system and the choice is remembered.

## Iconography

- The kit's own line icons (`build/icons.cjs`): 24px grid, 2px round strokes in `currentColor`, no fills except
  the filled star. Sizes: 20px in nav and buttons, 16px in toolbars and chips, 24px on tile plates.
- Pages carry the icons as an inline SVG sprite and reference them with `<use href="#i-name">`; previews inline
  the paths. Icons are decorative (`aria-hidden`); the control carries the label.
- Nav and tile icons sit in `ink-muted` / `accent-ink`; on an `accent` fill they turn `on-accent`.
- No logo file ships: the archive mark is a line-drawn crate (`MARK` in `build/icons.cjs`) drawn in `ink`, 40px in
  the top bar (32px on phones) and in the footer card. Replace it with the product's own mark at the same size;
  never redraw a real brand's logo.
