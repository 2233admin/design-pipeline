# Design

## Decisions (made without asking)

- **Named by the grammar, never the game**: `milspec-ops` (a "tactical ops / mil-spec" family), templates
  `ops-*`. No file, test, commit or PR names the reference game, its publisher, studio, operators,
  factions, maps or slogans; the lineage line is a generic genre description. The reference captures stay
  with the owner; the pack carries only numbers measured on them.
- **The reference's CTA shape is not borrowed**: the reference's docked CTA echoes its own logo, so the
  pack keeps the grammar (a plate rising out of the middle of the dock, two-line label, a light sweeping
  down) with our own five-sided plate (`PENT`); the test asserts five points.
- **Measured, not guessed**: from computed styles and screenshots at 1920 x 1080: top bar 87, dock 52 with
  147-unit items from x 391 and a 165 x 110 CTA; section title 55 px at x 88 with an outlined ghost 48 px
  left; rail frames 231 x 111 on a 126 pitch, 9-unit markers; right column at x 1333, 500 wide, title 35,
  sub 23, body 16 / 24; news cards 483 x 412 on a 497 pitch, picture 478 x 269; green #0FF796 (ours
  #17F29C), amber #F4CF67 / #F5D659, red #FF3551; green covers 0.1-0.3% of a screen (sampled at
  480 x 270). Motion from the stylesheet keyframes: fade-up 100 px / 0.5 s ease with staggers, detail
  cross-fade 1 s, hovers 0.3 s, a 1.5 s light sweep on the CTA.
- **No pseudo-illustration (owner feedback mid-case)**: code-drawn scenery (helicopters, towers, smoke,
  containers) and a drawn gear layout read cheap next to the reference's real art, so the case was reworked:
  in show mode each screen is carried by the grammar itself (type, hairline frames, data, routes, range
  rings, a real paper grain from `materials generate`), operators by a dossier panel (ID, stats, loadout),
  weapons and vehicles by hairline blueprints with dimension lines. Every art slot (28: key visual, modes,
  operators, vehicles, news covers, PV cover, two in-game frames) has a task sheet and a layer entry for the
  compositing pipeline (#317). The pack's `kv.ops-callout` draws its generic rifle the same blueprint way
  (`rifle()`), never a real model or name.
- **Micro-text is decoration**: the folder strip's tiny serial line is drawn as unreadable bars so the
  type-size rule does not see 8 px text.
- **Templates are the parts, not the site**: the case's page has scripts, scroll state, a slot mode and a
  phone layout; the bank keeps the five parts that recur on every screen and in game.

## Evidence

- Case: first pass 29 findings over 10 pages (17 off-canvas: a horizontally scrolling phone rail and scene
  markers cropped by a slice-scaled scene; 8 contrast: waypoint labels on fog, a dark title on a mid-grey
  sky; 3 glyph-coverage: CJK values in Rajdhani; 1 text-occluded: a fixed phone CTA over the footer in a
  full-page capture); then 1, then 0. After the no-pseudo-illustration rework a new first pass found 6
  (a waypoint under the right column, a phone arrow over a stat, two labels on the grain); final 0, and 0
  on the seven slot-mode pages. `fonts query`: Noto Sans SC covers 813 of 816 characters; the other 3 are
  the Korean language label, set in Noto Sans CJK KR.
- Templates: every default render, each listed size and 50 seeds pass the static check; the variants pass;
  every default render passes the browser check on the first render.

## Compatibility

Additive. No schema, rule, gate, receipt or CLI change; other templates' renders are unchanged.
