---
version: "1.0"
name: Archive Terminal
description: A wiki kit in a game-terminal grammar
colors:
  paper: "#f4f5f6"
  panel: "#ffffff"
  panel-muted: "#e9edf1"
  panel-hover: "#dfe3e8"
  inverse: "#111827"
  on-inverse: "#f8fafc"
  ink: "#111827"
  ink-muted: "#5f6672"
  ink-subtle: "#555a65"
  rule: "#e5e7eb"
  rule-strong: "#d1d5db"
  control-edge: "#858c96"
  grid-line: "#e9eaec"
  dot: "#e8eaed"
  accent: "#f2cc00"
  primary: "#f2cc00"
  accent-strong: "#d9ad00"
  accent-soft: "#fff1a6"
  on-accent: "#111827"
  accent-ink: "#7a5f00"
  focus-ring: "#111827"
  signal-magenta: "#ff00f0"
  signal-teal: "#00c7bd"
  signal-mint: "#00ffa2"
  signal-yellow: "#ffff21"
  on-signal-yellow: "#363636"
  modal-head: "#404040"
  on-modal-head: "#ffffff"
  link: "#1f4fb8"
  link-missing: "#b42318"
  danger: "#c81e1e"
  danger-soft: "#fde2e2"
  success: "#00756f"
  warn: "#a14a06"
  bracket: "#797979"
  scrim: "#000000"
  rarity-1: "#94a0aa"
  rarity-2: "#68b457"
  rarity-3: "#009fe6"
  rarity-4: "#9b76ff"
  rarity-5: "#f59600"
  rarity-6: "#ff3824"
typography:
  display-hero:
    fontFamily: "\"Inter Display\", \"Inter\", system-ui, \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 60px
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.08em
  title-page:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.11
    letterSpacing: -0.025em
  title-entity:
    fontFamily: "\"Inter Display\", \"Inter\", system-ui, \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 48px
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.05em
  title-section:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.4
  title-block:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 18px
    fontWeight: 900
    lineHeight: 1.56
  title-card:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  meta:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
  stat-number:
    fontFamily: "\"Inter Display\", \"Inter\", system-ui, \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif"
    fontSize: 24px
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.05em
  caps:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: 0.16em
  caps-strong:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 12px
    fontWeight: 900
    lineHeight: 1.33
    letterSpacing: 0.2em
  caps-sm:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", \"Noto Sans SC\", sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: 0.12em
  mono:
    fontFamily: "\"JetBrains Mono\", \"IBM Plex Mono\", \"DejaVu Sans Mono\", ui-monospace, monospace"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.4
rounded:
  radius-none: 0px
  radius-xs: 2px
  radius-pill: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-5: 20px
  space-6: 24px
  space-8: 32px
  space-10: 40px
  space-16: 64px
---

# Archive Terminal

## Product Context
A community-maintained game wiki: readers look things up (an agent's materials, an item's sources, this week's
event), editors keep entries current. Pages are dense reference pages viewed on desktop and phones, in light
and dark. The kit ships the grammar, a design-system package and seven page templates; the demo content is an
original fictional game, 《霜线》 FROSTLINE.

## Overview
A game-terminal reading of a wiki: a light grey ground ruled with a 40px hairline grid, white panels with
chamfered corners, one yellow accent used as a fill, bilingual 中文 / ENGLISH labels, corner brackets, dot grids,
hairline stripes and a magenta / yellow / teal signal strip. Rules for agents live in `design-system/README.md`;
the measured grammar and its sources are in `GRAMMAR.md`.

## Colors
`paper` ground, `panel` raised surfaces, `panel-muted` recesses, `ink` text. `accent` (#f2cc00 light, #d8bf00
dark) is the single accent and is never body text on light grounds; accent-coloured text uses `accent-ink`.
Signal colours appear only in the strip, the notice modal and the card mini strip. Rarity colours always sit beside
a star count. Dark theme “Night shift” swaps grounds to #181818 / #232323 and keeps the accent.

## Typography
System CJK sans for text, a heavy display face for the archive title, entity names and counters, mono for versions
and keys. Every label is a 中文 name over an uppercase ENGLISH caption at 12px with 0.16em tracking.

## Layout
56px top bar plus a 3px strip; 214px side nav (64px collapsed, a drawer under 1024px); content column up to
1184px with 24px gutters (12px on phones). Home stacks hero, news and tiles 32px apart.

## Elevation & Depth
Flat panels on the grid; shadows only for the floating entity hero, the modal, menus and toasts.

## Shapes
Square corners cut at 9px (6px on small controls) on the top-right and bottom-left; round only for status dots.

## Components
Top bar, side nav, archive hero, section headers, news feed, category tiles, entity card, infobox, data table,
tabs, badges and rarity stars, buttons, search field, version notice modal, toasts and skeletons, pagination,
breadcrumbs and page head, empty states, filter bar, art slot, recent-change rows, footer — one folder each under
`design-system/components/`.

## Do's and Don'ts
Do pair every label with its English caption, keep accent as a fill, drop the corner cut on focus so the ring reads,
and keep disabled text at 4.5:1. Don't round corners, add a second accent, dim with opacity, or ship character art:
art slots carry a size, a safe area and a task sheet instead.

## Source Decisions
- Adopted: the grammar measured from a private reference — a community game wiki styled after its game's
  in-game UI — through computed styles at 1440×900 in both themes and pixel samples (`GRAMMAR.md`). Values were
  re-entered as our tokens; none of the reference's CSS, scripts, icons, images, fonts or names are used.
- Changed: `ink-muted` one step darker in light (4.5:1 on `panel-muted`); `ink-subtle` flattened from 70% alpha;
  `accent-ink` added for accent-coloured text; `focus-ring` is ink in light (the reference ring is accent, 1.4:1);
  disabled states drop opacity for 4.5:1 text; `dot` lightened so text over the hero grid keeps 4.5:1.
- Rejected: the reference's game-specific item tooltip, enemy tooltip and gacha pager colours; its display font;
  its logo and art.
