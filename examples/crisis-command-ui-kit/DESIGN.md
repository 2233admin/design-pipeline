---
version: "1.0"
name: Crisis Command
description: A crisis-terminal kit in heavy compressed Mincho, red hexagon alarms and amber segment clocks
colors:
  primary: "#000000"
  void: "#000000"
  panel: "#0d0906"
  panel-raised: "#1a120b"
  rule: "#3b2a17"
  rule-strong: "#7a5524"
  grid: "#2a1a0c"
  ink: "#ffffff"
  ink-muted: "#c9beb5"
  ink-dim: "#9c918a"
  amber: "#f2a93b"
  amber-strong: "#ffc766"
  amber-dim: "#a07a3f"
  amber-wash: "#2b1d0b"
  glow: "#7a4a10"
  alert: "#e8380d"
  alert-strong: "#ff5530"
  alert-dim: "#7a1d08"
  alert-ink: "#ff6a45"
  alert-deep: "#b8182c"
  on-alert: "#000000"
  on-amber: "#000000"
  alarm: "#b0081f"
  alarm-strong: "#d0102a"
  alarm-rule: "#ff6a4a"
  on-alarm: "#fff1ea"
  screen: "#2b4f69"
  screen-deep: "#18324a"
  lattice: "#6f95b0"
  paper: "#f0f2f0"
  on-paper: "#000000"
  blood: "#140202"
  ok: "#7fb241"
  ok-deep: "#2f4a17"
  focus-ring: "#f2a93b"
typography:
  head-xl:
    fontFamily: "\"Noto Serif SC\", \"Noto Serif CJK SC\", \"Source Han Serif SC\", serif"
    fontSize: 72px
    fontWeight: 900
    lineHeight: 1
  head-l:
    fontFamily: "\"Noto Serif SC\", \"Noto Serif CJK SC\", \"Source Han Serif SC\", serif"
    fontSize: 48px
    fontWeight: 900
    lineHeight: 1.05
  head-m:
    fontFamily: "\"Noto Serif SC\", \"Noto Serif CJK SC\", \"Source Han Serif SC\", serif"
    fontSize: 28px
    fontWeight: 900
    lineHeight: 1.15
  grot-label:
    fontFamily: "\"Archivo\", \"Helvetica Neue\", Arial, \"Noto Sans SC\", sans-serif"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.14em
  data:
    fontFamily: "\"Archivo\", \"Helvetica Neue\", Arial, \"Noto Sans SC\", sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.7
  body-s:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"PingFang SC\", \"Microsoft YaHei\", system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  radius-none: 0px
  radius-box: 6px
  radius-round: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-5: 20px
  space-6: 24px
  space-8: 32px
  space-12: 48px
  space-16: 64px
---

# Crisis Command

## Product Context
An organisation's command terminal and its public site: operators watch levels, gates, reserve power and a
consensus vote; visitors read the reports. Screens are mostly desktop consoles at 1920 × 1080, with a 390-wide
phone layout for the site. The demo content is an original fiction, 《潮位警报》 TIDEMARK: the Ring-Sea Sluice
Authority (环海闸务局) keeps a city built in a sinking basin.

## Overview
The crisis-terminal grammar of a 1990s giant-robot anime and its film remakes, measured privately and rebuilt from
open parts: type cards in heavy Mincho compressed by a transform on black, red elongated-hexagon alarm walls over a
blue lattice screen, amber segment-digit clocks, coupling graphs with a dashed threshold, and our own five-seat vote.
Rules for agents live in `design-system/README.md`; the measured grammar is in `GRAMMAR.md`.

## Colors
`void` is the ground; one hot family per screen: `alert` (#e8380d, the main colour) for warnings, danger,
thresholds and the current nav rule, `amber` (#f2a93b) for data. Alarm panels are `alarm` with `on-alarm` type
on the `screen` blue. Red-orange text under 24px uses `alert-ink`. One theme, Terminal: the grammar has no light mode
(the inverse `paper` card is a card, not a theme).

## Typography
Heavy Mincho (Noto Serif SC Black, a subset in `fonts/`) for every Chinese title, label and unit, compressed in
measured steps (1.00 card, 0.85 panel and section, 0.65 credits, 0.40 film title). Archivo for English captions under
the Chinese. Noto Sans SC for paragraphs. Digits are drawn segments, not a font.

## Layout
56px command bar; site screens are full-height sections padded 32 by 48 px; app screens are fixed 1920 × 1080
grids (side columns of 420–560 px). The title card keeps its measured 4:3 proportions and margins.

## Elevation & Depth
Flat. Depth comes from frames (bezels, double-ruled hexagons, monitor frames) and from the screen behind the panels,
not shadows; only the clock digits glow.

## Shapes
Square corners or 45° cuts; elongated hexagons with 55° tips; a 6px radius only on the MODE box.

## Components
Title card, film title, section header, warning band, hexagon panel, alarm wall ground, stamp, segment digits,
countdown clock, bracket label, mode row, status plate, ratio readout, graph board, five-seat vote, terminal log,
command field, command bar, buttons, tabs, sluice table, dialog, toast, art slot, report index, footer — one folder
each under `design-system/components/`.

## Do's and Don'ts
Do keep type cards empty except for the type, compress Mincho only in the measured steps, keep one hot colour per
screen and cut state changes hard. Don't draw mecha, weapons or people in code (art slots carry a task sheet), don't
put scanlines on a type card, don't blink a whole band, and don't use a lighthouse or any mark of the reference.

## Source Decisions
- Adopted: the grammar measured privately on broadcast and film frames (glyph ink boxes for the compression steps,
  palettes, light and colour shares of whole screens, frame-by-frame luminance of the countdown states). Values were
  re-entered as our tokens; no frame, logo, organisation, character, line or font of the reference is used.
- Changed: the film-title red lifted from #66041a (fails 3:1) to `alert-deep`; the screen blue darkened so panels read;
  red-orange text under 24px moved to `alert-ink`; blinking moved from the whole band to its stripes so text keeps
  contrast; the film title compressed to 0.40, not 0.35, because the open face's horizontals thin out.
- Rejected: the reference's three-seat computer vote (ours has five seats), its leaf and pyramid marks, its proprietary
  Mincho, its title texts and episode names.
