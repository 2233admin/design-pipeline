# Design

## Decisions (made without asking)

- **Named by the grammar, never the game**: `lattice-dossier` (the lattice ground and the dossier-terminal
  frame), a generic family name distinct from the sister case running in parallel. Templates are named by
  what they are. No file, test, commit or PR names the reference game, its studio, characters,
  organisations or terms; a test asserts the style file names none of them.
- **The live site's numbers, not taste**: frame hairlines at y 152, y 900 and x 1683 (pixel rows and
  columns); the lattice square 172 (vertical lines 137, 309, 481 ... 1512); cyan `#18D1FF` measured,
  `#1FCFFF` in the case and the pack (same family, our own); the rail numeral 86.4 in a 47.52 line box
  (computed style); nav 22 over 14 with 80-unit gaps; ghost 112 at -5%; motion from timed captures (the push
  half way at 200 ms, done by 350-400 ms) and the computed transitions (18 of 20 are 0.3 s).
- **The numeral is decoration**: it is the derived, decor slot `numeral` drawn from `current` inside a
  clip; the readable number is the small line on a ground plate. Without the plate the small line is white
  on cyan (1.84:1) — the case's first pass flagged exactly that.
- **`bg` is the ground role**, listed first, so `template distill --ablate` maps the draft ground onto it.
- **Small sizes are not offered**: at half size the 14-unit CJK nav and the 12-unit labels fall under the
  12 px floor, so the sizes go up (2880 x 228, 2560 x 1440), never down.
- **Templates are the parts, not the site**: the case is a paged site with scripts (full-screen paging,
  carousel, particle morphs, hotspots); the bank keeps the five parts that recur. The site and the two
  in-game screens stay example renders with the owner.
- **Characters are not drawn**: image slots carry the pictures; the case's `?slot=1` mode and its task
  sheets follow #311, with a painted-in blend (grade, fog wrap, cyan rim) rather than a sticker outline.

## Evidence

- Case: `template check --browser` on ten pages: 144, 42, 8, 0 findings by round. First pass: off-screen
  slides still visible (a visible child in a hidden section), white on the cyan numeral, ghost words not
  marked decoration, a `-webkit-text-stroke` title (the check's ground pass hides fill, not stroke), Latin
  faces given mixed copy, a mobile-only stack laid out on desktop. `fonts query --style gothic --weight 700`
  covers all 285 CJK characters; `fonts measure` finds nothing missing in Michroma, Oswald or Chakra Petch.
- Templates: every default render, each listed size and 50 seeds pass the static check, and so do the
  variants; every default render passes the browser check; cyan stays under 3% of each default render.

## Compatibility

Additive. No schema, rule, gate, receipt or CLI change; other templates' renders are unchanged.
