# Archive Terminal grammar

What this kit learned from its reference, as measurements and rules. The reference is a community-maintained
game wiki whose interface is styled after its game's in-game terminal UI. It was read on 2026-11-06 at 1440×900
(light and dark through `prefers-color-scheme`) and at 390×844, with `getComputedStyle` on the rendered page and
pixel samples from 2× screenshots where the DOM gave no value. Screenshots, the raw measurement dump and any
offline copy stay private to the owner and are not in this repository.

**Why none of the reference ships here.** The reference site's text is published under CC BY-NC-SA, its game
pictures and data belong to the game's publisher, and the licence of its site code is not stated. So this kit
contains no CSS, script, icon sprite, image, font, logo, wiki name, game name, character or text from it. What
carries over is numbers (colours, sizes, durations, curves) re-entered as our own tokens in
`design-system/tokens.json`, and the rules below, rebuilt in our own code with our own icons and an original
fictional game as demo content.

## 1. Colour

| Role | Light | Dark | Measured as | Kit token |
| --- | --- | --- | --- | --- |
| Page ground | #f4f5f6 | #181818 | `--color-surface` | `paper` |
| Raised panel | #ffffff | #232323 | `--color-surface-raised` | `panel` |
| Recess / toolbar fill | #e9edf1 | #1f1f1f | `--color-surface-muted` | `panel-muted` |
| Ink | #111827 | #eeeeee | `--color-ink` | `ink` |
| Muted ink | #6b7280 | #a8b0b7 | `--color-ink-muted` | `ink-muted` (light #5f6672, see below) |
| Caption ink | ink at 70% | white at 70% | `--color-ink-subtle` | `ink-subtle` (flattened #555a65 / #bababa) |
| Hairline / strong rule | #e5e7eb / #d1d5db | #2b3136 / #41484f | `--color-border(-strong)` | `rule`, `rule-strong` |
| Accent | #f2cc00 | #d8bf00 | `--color-accent` | `accent` |
| Accent strong / soft | #d9ad00 / #fff1a6 | #b99b00 / #272302 | | `accent-strong`, `accent-soft` |
| System teal | #00c7bd | #00c7bd | `--color-system` | `signal-teal` |
| Strip magenta | #ff00f0 | #ff00f0 | gradient stop | `signal-magenta` |
| Modal yellow / mint | #ffff21 / #00ffa2 | same | pixel samples | `signal-yellow`, `signal-mint` |
| Modal title bar | #404040 | — | pixel sample | `modal-head` |
| Bracket grey | #797979 | #8c8c8c | `--color-heading-bracket` | `bracket` |
| Rarity 1–6 | lab() values → #94a0aa #68b457 #009fe6 #9b76ff #f59600 #ff3824 | same | `--color-rarity-n` | `rarity-1` … `rarity-6` |
| Scrim | black 20% over white (#cccccc sample) | | pixel sample | `scrim` + `--scrim-fill` |

Accent rules: the accent is a fill (active nav slab and its 4px bar, section bars, kicker bar, selected chips, the
stage picker, mini bars, hero brackets, the search button, the notice dot). The reference also sets accent-coloured
numbers and a yellow focus ring; both measure under 3:1 on its light grounds, so the kit adds `accent-ink`
(#7a5f00) for accent text and uses ink for the light focus ring.

**Deviations from the measurement (accessibility):** `ink-muted` light #6b7280 → #5f6672 (4.11:1 → 4.92:1 on
`panel-muted`); disabled controls drop the reference's 50% opacity for `ink-muted` on `panel-muted`; hero dots
lightened (#e8eaed) so text crossing a dot keeps 4.5:1.

## 2. Type

| Use | Measured | Kit style |
| --- | --- | --- |
| Archive title | 60px / 1 / 900, −0.08em (48px sm, 36px phone at −0.05em), heavy display face | `display-hero` |
| Page title | 36px / 40px / 700, −0.025em | `title-page` |
| Wiki section title | 24px / 1.4 / 600 between “[” “]” in bracket grey | `title-section` + `.at-h2` |
| Home section title | 18px / 28px / 900 | `title-block` |
| Kicker | 12px / 16px / 900, 0.2em caps, 4px accent bar before it | `caps-strong` + `.at-kicker` |
| ENGLISH caption | 12px / 16px / 700 (400 in nav), 0.16em caps, ink 70% | `caps` |
| Counter | 24px / 24px / 900, −0.05em, tabular, accent | `stat-number` in `accent-ink` |
| Counter caption | 14px bold 中文 over 12px 0.12em caps | `.at-stat__zh` / `__en` |
| Nav label | 16px / 20px, 400 (700 current) | `.at-navlink .at-bi__zh` |
| Body / cells | 16px / 24px; 14px / 20px | `body`, `body-sm` |
| Dates, meta | 12px / 16px / 700, tabular | `meta` |
| Keys, versions | 12px mono 700; kbd cap with a 2px bottom edge | `mono`, `.at-kbd` |

The bilingual label pattern: 中文 name first at full weight, the English word underneath (nav, tiles, counters,
tabs) or beside it on the baseline (section headers), always uppercase with wide tracking and one step quieter in
colour. Tracking steps measured: 0.12em, 0.16em, 0.2em.

## 3. Space and layout

4px base. Top bar 56px + 3px strip (59px). Side nav 214px; links 56px tall, padding 10/12/10/16, icon–label gap
12px; section heads 12px bold with an accent diamond. Content column 1184px max. Hero padding 40px × 64px, min
height 392px, side column 360px. Home sections 32px apart. News entries 59px min, padding 10/12, 20px apart in a
timeline. Counter cells padding 4/12. Icon buttons 36px. Search 36px tall, ≤ 520px wide. Buttons 48px (hero), 32px
(toolbar). Page grid 40px. Breakpoints: side nav from 1024px, search field from 768px.

## 4. Shape, borders, shadows

- Corners are square (`--ef-radius: 0`) and **chamfered**: `clip-path` cuts the top-right and bottom-left corners
  by 9px on cards, news entries and hero buttons; 6px on icon buttons. Only status dots are round.
- Borders are 1px hairlines; inputs and kbd caps add a darker or 2px bottom edge.
- Shadows only on floating things: panel `0 12px 32px -10px` black 45%, dialog `0 18px 40px -16px` 55%, menu
  `0 16px 32px -20px` 70%, toast/toolbar `0 8px 18px -6px` 35%.

## 5. Motifs

- **Signal strip**: 3px under the very top: magenta 0–35%, accent 35–82%, teal 82–100%; wipes in on load. Reused on
  the hover edge of tiles and as the three-segment stripe on the notice modal and cards.
- **Page grid**: 1px ink lines at 4.3% every 40px behind everything.
- **Dot grid**: large grey dots (~10px on a ~28px pitch) in the hero, fading out toward the middle.
- **Corner brackets**: 2px L-shapes, ~16px arms, inset 8px, accent on the hero; bracket glyphs “[ ]” around body
  section titles.
- **Stripes**: faint 135° hairline stripes on filter panels, list grounds and the modal body; horizontal stripes
  inside the diamond icon plate of category tiles.
- **Diamond plate**: a 45° square behind tile icons that fills with accent on hover.
- **Contour lines**: topographic lines masked across the current nav item.
- **Mini bars**: a row of thin accent bars under each counter.

## 6. Components seen

App shell (sticky top bar, collapsible bilingual side nav with sections, mobile drawer), archive hero with counters,
section headers, news feed with a lead image and a dated timeline, category tile grid, entity cards (art, tri-colour
mini strip, `// ENGLISH` line, element glyph squares, rarity base line, UP/NEW flags), entity hero panel (art on a
grid, stamp, stars, display name, spaced codename, key–value grid, bio), stat grid with a level meter and a
segmented stage picker, skill blocks with multiplier tables, filter panels with toggle chips, search with a `/`
hint and a large search page, recent-change rows, breadcrumbs and page toolbar, version notice modal, loading
guide toast, footer welcome card.

## 7. Motion

Measured durations and curves: hover 150ms `cubic-bezier(.4,0,.2,1)`; side nav width 200ms ease-out; drawer
260ms `cubic-bezier(.22,1,.36,1)`; strip wipe 450ms and title print 560ms `cubic-bezier(.16,1,.3,1)`; section
reveal 600ms with a 160ms delay (quint); live dot 2.4s ease-in-out pulse; skeleton sweep; spinner. Modal: scales
and rises in with the accent bar wiping after it. The reference also plays a full-screen opening animation; the
kit leaves it out (it delays reading). See `MOTION.md`.

## 8. What the kit adds

States the reference leaves implicit, written down: focus-visible drops the chamfer so the ring reads; disabled
keeps 4.5:1; loading is `aria-busy` with a spinner; the drawer makes the page inert and returns focus; tabs use
roving tabindex; sortable headers are buttons with `aria-sort`; filter chips are `aria-pressed`; art slots are
`role="img"` with their size and task id.
