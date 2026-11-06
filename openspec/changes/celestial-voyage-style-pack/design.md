# Design

## Decisions (made without asking)

- **Named by the grammar, never the game**: `celestial-voyage`, distinct from `street-tape` and from the
  two other packs being built in parallel. Templates are named by what they are (`ui.voyage-topbar`,
  `card.voyage-ticket`). No file, test, commit or PR names the reference game, its studio, characters,
  organisations or vehicle; the lineage is a genre description. The vehicle in the case is a star-sail ship,
  not a train, and the case avoids the reference's crescent-and-comet logo shapes and any mascot.
- **The reference's numbers, not taste**: measured with computed styles, not eyeballed: bar 75 at
  rgba(0,0,0,.8); nav 139 wide from x 353, 22.5 / 24 units, #747474 / #E1B066; download tab 225 x 83,
  only bottom-left radius 22.5; news card 626 x 518, corners 37.5 / 22.5, rim #C99D66, pitch 673; caption
  27/36 #CECECE with a 6 x 33 tick; panel 18-1531 x 313-915; story box 475 wide, radius 10.5; avatars 87.
  The orbit's centre and radius were solved from three medallion centres (radius about 760, centre off the
  left, 13.7 degrees apart). The bar's grey went from #747474 to #8C8C8C in the pack so it reads 4.5:1.
- **Show mode carries screens with the grammar, not drawn pictures** (owner feedback mid-job): a first
  version drew props, constellations and a lantern astrolabe; next to the reference's painted art that read
  cheap. The case now carries each screen with type (the serif title and ghost, giant vertical names),
  frames, data (a boarding pass with route, dates and crew; a dossier with stats; port distances) and real
  textures from `materials generate` (FM star dust, a printed ink flat, a paper stub). Drawn objects stay
  abstract (orbit lines, ticks, four-point stars). The pack records this as guidance and as recipes.
- **No lighthouse motif** (owner feedback across the sister jobs): the case renamed its faction, port and
  copy; the task sheets forbid lighthouses.
- **The ghost is decoration with a group**: the Latin ghost overlaps its title by design, so the pack draws
  it stroke-only as a `decor` slot (`data-deco`) and the case gives title and ghost one `data-grp` prefix.
- **Templates are the parts, not the site**: the site's canvas sky, the draggable chart and the boarding
  pass stay example renders; the bank keeps the bar, the ticket, the news row and the roster with its orbit.
- **Medallions carry one character**: the current one shows the first character of `faction`, the others a
  four-point star and one locked `?`, so the template draws no faction emblems of its own.

- **A bar is not a key visual**: distill classed every layout wider than 1.15:1 as landscape, so the
  1920 x 140 bar became the nearest template of the left-title 16:9 archetype in the distill test. Rather
  than widen the test's accepted list, `aspectClass` adds a `strip` class above 4:1, shared by references
  and templates (one function, no parallel classifier); no existing reference or template in the tests is
  that wide except page bars.

## Evidence

- Case: first pass 39 findings over 7 pages; after the show-mode rework the KV pass was re-checked (5
  findings: a numeral under the orbit lines, four small labels on the paper pass) and fixed; final 0 on the
  4 sections, the 390 page, 2 in-game screens and the 6 slot-mode pages.
- Templates: every default render, each listed size and 50 seeds pass the static check; the variants pass;
  every default render passes the browser check.

## Compatibility

Additive. No schema, rule, gate, receipt or CLI change; other templates' renders are unchanged. Other packs being
built in parallel also bump the bank counts in the same two tests; whichever merges second
rebases those numbers.
