---
version: "1.0"
name: Megastructure Ink
description: A game-site and in-game UI kit in a megastructure-ink grammar
colors:
  void: "#040505"
  ground: "#0a0b0c"
  panel: "#101214"
  panel-raised: "#16191b"
  panel-hover: "#1d2124"
  rule: "#262b2e"
  rule-strong: "#3a4044"
  line: "#cdd5d7"
  text: "#e8ecec"
  text-muted: "#a2abae"
  text-faint: "#7e888c"
  signal: "#7fe6ea"
  primary: "#7fe6ea"
  signal-strong: "#b4f4f6"
  signal-dim: "#2e6e73"
  on-signal: "#031113"
  screen: "#072a2f"
  screen-line: "#0f4a51"
  alarm: "#ff5547"
  alarm-dim: "#4a1210"
  on-alarm: "#120201"
  paper: "#e4e6e5"
  on-paper: "#0a0b0b"
  focus-ring: "#7fe6ea"
  scrim: "#040505cc"
typography:
  display-title:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"Source Han Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: 128px
    fontWeight: 900
    lineHeight: 1
    letterSpacing: 0.02em
  display-depth:
    fontFamily: "\"Chakra Petch\", \"Noto Sans SC\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 96px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.01em
  title-section:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"Source Han Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: 40px
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: 0.24em
  title-block:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"Source Han Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.08em
  body:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"Source Han Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: 16px
    fontWeight: 300
    lineHeight: 1.85
    letterSpacing: 0.04em
  body-sm:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"Source Han Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0.04em
  label:
    fontFamily: "\"Noto Sans SC\", \"Noto Sans CJK SC\", \"Source Han Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.2em
  caps:
    fontFamily: "\"Michroma\", \"Noto Sans SC\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.22em
  readout:
    fontFamily: "\"Chakra Petch\", \"Noto Sans SC\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: 0.02em
  data-sm:
    fontFamily: "\"Chakra Petch\", \"Noto Sans SC\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.08em
rounded:
  radius-none: 0px
  radius-dot: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-6: 24px
  space-8: 32px
  space-12: 48px
  space-16: 64px
---

# Megastructure Ink

## Product Context
An official site and in-game screens for an exploration game about descending an endless structure. Readers
come for the world, the people, the news and the download; players read HUDs and a survey terminal. The kit
ships the grammar, a design-system package, a seven-screen one-page site, two in-game screens and a gallery;
the demo world, 《穹井》 VAULTWELL, is original.

## Overview
Monumental structure seen from inside: walls, beams and cables drawn as ink line systems with screentone and
hatching, a tiny person stated only by a scale marker, black and cold grey with one light, white-line HUD frames
on black, monitor panels with scanlines, the kit's own rail script, and almost no text. Rules for agents live in
`design-system/README.md`; the measured grammar is in `GRAMMAR.md`.

## Colors
`void` and `ground` carry every screen; `panel` surfaces; `line` is the white hairline of every frame and ruler.
`signal` (#7fe6ea) is the single light and stays under 3% of a screen; `alarm` only for hostile contact; `screen`
for in-world monitors; `paper` and `on-paper` for ink plates.

## Typography
A CJK sans in three voices: 900 compressed to 78% for the name once, 300 tracked wide for section titles and
body, 400 tracked for labels. Latin capitals in a wide techno face (Michroma) and digits in a squared face
(Chakra Petch), both OFL subsets shipped in `design-system/fonts/`; CJK never goes into them.

## Layout
56px bar, 72px depth rail, one screen per section; 64px margins; grids 5:6 and 7:4; in-game screens are
1920 × 1080 grids around a viewport or a map.

## Elevation & Depth
Flat. Depth is drawn in the plates (one-point perspective, 26 levels, fading to black); only the dialog lifts.

## Shapes
Square corners, hairline edges, HUD corners of 14px; round only for status dots and radio marks.

## Components
Top bar, depth rail, scale marker, rail script, section head, buttons, label plate, readout, gauge, alert
banner, terminal log, handshake, tabs, switch and radio, field, loader, member card, dossier, log list, data
table, strata map, HUD frame, art slot, dialog, toast, footer — one folder each under `design-system/components/`.

## Do's and Don'ts
Do state scale with numbers and the scale marker, keep `signal` scarce, pair every label with its caps line and
keep CJK out of the Latin faces. Don't draw figures, mecha or objects in code, add a second accent, round
corners, or let the rail script carry information alone.

## Source Decisions
- Adopted: the grammar of a lineage of manga and anime about endless megastructures, measured privately on
  reference images (tone shares, line orientation, edge density, figure-to-frame ratio, monitor colours;
  `GRAMMAR.md`). Values were re-entered as our tokens; no image, glyph, logo, name or font from the references
  is used.
- Changed: monitor cyan lifted to #7fe6ea so it reads 4.5:1 as text on `screen`; the reference monitors'
  scanline pitch (about 4px at 1920) set to 3px so small text keeps its shape.
- Rejected: drawn figures, mecha and creatures (they stay art slots with task sheets); the references' scripts
  (we drew our own rail script); proprietary fonts.
