# Design

## Decisions (made without asking)

- **Named by the grammar, never the game**: `street-tape` (stripe bands and a film strip, "tape" also the
  case's cassette brand). Templates are named by what they are (`ui.tape-topbar`, `ui.tape-pager`). No
  file, test, commit or PR names the reference game, its studio, characters or city; the lineage line is a
  generic genre description. The board stays with the owner; the pack carries only numbers measured on it.
- **The board's numbers, not taste**: one cut angle of 49 degrees (container edge, slab edge and stripes
  each measure dx/dy 0.86-0.87; the brief's first guess was 45); acid `#D8FA00` on the board, `#D4FF00` in
  the case and the pack (the brief's value; same family, our own); stripes 3.9 on a 13.2 pitch; title ink
  heights 1 : 0.42 : 2.6-2.9; capsule sizes 103 x 35 and 93 x 33; the 6-unit ring on dark capsules.
- **The number is sized from the resolved family's digit height**, so 2.6-2.9 holds with or without Anton:
  a per-family table (digit 0 ink bbox in em, read from the font files: Anton 0.875, Oswald 0.826, Noto Sans
  SC 0.772) and the size is 2.6 x the CJK size / that height (Anton: 148 units at 1920). The family is the
  first of the `num` stack that `--font-dir` supplies (its `@font-face` is in the SVG, so it is what
  renders); with none supplied no condensed face can be relied on, so the number is pinned to the stack's
  last family, Noto Sans SC (the catalog-resolved family the case's copy is set in), sized from its digits
  and recorded in `fontSwitches` with the reason that it renders as sized only where it is installed. The
  test measures ink rows in the rendered PNG, not the formula, and only with the measured faces supplied
  through `--font-dir`.
- **Why not Oswald without `--font-dir` (fix after #313 turned main's CI red)**: the first version pinned
  the unsupplied case to Oswald and sized for Oswald's 0.826 em digits. On a machine with Oswald installed
  that held (ratio about 2.75); on the ubuntu runner, which has no Oswald, the stack fell through to the
  runner's own sans-serif and the measured ratio was 2.33 (2.38 locally with Oswald hidden from
  fontconfig). A size computed from a font that is not loaded is a guess, so the layout now sizes from a
  family only when `--font-dir` embeds it, and otherwise from Noto Sans SC, the one `num` family the pack
  already depends on for its CJK copy. The test supplies its fonts: an OFL subset of Oswald (printable
  ASCII, `tests/fixtures/street-tape/fonts/`, licence beside it), the skill's bundled Anton and
  Noto Sans SC 900 from `skill/tools/art-motion/fonts/`, so each ratio is measured in the family it was
  sized for on any machine. Bundling Anton for the pack (the package already ships `Anton-400.woff`) would
  make the condensed number the default everywhere; it changes the pack's "named, not bundled" contract
  and is left for its own change.
- **Stripes the static check can read**: a band is a flat `#222122` path (the ground the static check
  sees) with the 49-degree lines as a clipped, stroked decoration group; clip ids count per render so
  `template.svg` stays byte-stable. Thumbs lean as parallelograms instead of `skewX` (the static check does
  not measure skew).
- **Pager numerals sideways**: `rotate(90)` about the digits' ink centre (0.434 em above the baseline) with
  an `rbox` box; 30 units so the ink stays inside the 46-unit bar; the next number bleeds off the bar's
  end (`bleed`), as on the board.
- **Templates are the parts, not the site**: the case's single page has scripts, scroll-driven state and a
  responsive layout; the bank keeps the five parts that recur in every section and screen. The site and the
  in-game screens stay example renders with the owner.
- **Characters are not drawn**: image slots carry the pictures; the pack's recipe points at an
  image-generation task sheet (#311) and `materials cut` for cut-outs.

## Evidence

- Case: first pass 54 findings over 9 pages (32 glyph coverage, 8 logo text-overlap, 10 mixed-colour
  units, 3 ghost letters, 1 small-label contrast); final 0. `fonts query --style gothic --weight 900` covers
  all 524 characters of the copy with Noto Sans SC.
- Templates: every default render, each listed size and 50 seeds pass the static check; the variants
  (`side=right`, `control=dots`, `current=4`, pager `06`/`01`) pass; every default render passes the
  browser check. First browser pass of the templates: pager numeral off-canvas (34 units sideways), number
  touching the Latin line with Anton's taller digits; both fixed by the measured metrics above.

## Compatibility

Additive. No schema, rule, gate, receipt or CLI change; other templates' renders are unchanged.
