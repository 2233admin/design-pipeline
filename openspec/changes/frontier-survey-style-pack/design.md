# Design

## Decisions (made without asking)

- **Named by the grammar, never the game**: `frontier-survey` (an industrial frontier, and the case's
  survey crew). Templates are named by what they are (`ui.survey-rail`, `card.survey-dossier`). No file,
  test, commit or PR names the reference game, its studio, characters or organisations; the lineage line
  is a generic genre description. The reference screenshots stay with the owner; the pack carries only
  numbers measured on them.
- **The reference's numbers, not taste**: the site is a 1280 design at 1.5x (root 12 px, every size a
  multiple of 1.5); signal yellow `#FFFA00` on the reference, `#FFEE00` in the case and the pack (same
  family, our own); ink `#191919`; rail 90 wide with items every 60 from y 152; title block 78 x 24 with
  Latin 27 and CJK 36; crew column 656 x 1043; album 1109 + 229 band; pager 164 x 63 with 56 buttons;
  timings 0.2 / 0.3 / 0.4 / 0.6 s and the 1 s flicker keyframes, all read from computed styles and
  stylesheets rather than from pixels.
- **Yellow budget without figures**: on the reference yellow is 0-6% of a section because the key art
  carries the colour. With no figures the case keeps the columns whole (about 18% home, 30% crew) so one
  colour still holds the page; the templates' accent budgets follow the case (0.05 rail, 0.12 album, 0.24
  title card and timeline, 0.4 dossier).
- **Wide Latin budgeted by measurement**: Michroma averages 1.0 em per capital (read from its hmtx), so
  wide slots are budgeted at 1.04 em a character and validated as Latin caps; without the face the Latin
  falls back to Noto Sans SC and reads narrower, never wider.
- **Decoration the checks can read**: ghost words are `data-decor` / `data-bleed` slots with a pattern
  fill; contours inside event bars are clipped to the bar (clip ids per bar, byte-stable); every drawn
  micro label carries `data-deco` on the text element itself (the case's first pass showed a group-level
  mark is not enough for off-canvas).
- **Templates are the parts, not the site**: the case's single page has scripts, a point-cloud canvas,
  scroll-driven state and a responsive layout; the bank keeps five parts that recur across sections. The
  site, the slot mode and the in-game screens stay example renders with the owner.
- **No drawn pseudo-illustration** (owner feedback mid-job): the first showcase drew survey instruments,
  a tower and machines as isometric line art; next to the reference's real art that read cheap, and a
  tower with a lamp read as a lighthouse. The showcase now carries each screen with type, frames, data
  slides, a stat card and generated paper / halftone textures; the pack draws only abstract data marks
  (a ruler and datum mark replace the line-art beacon on the section card).
- **Characters are not drawn**: the dossier and album take pictures in image slots; the pack's recipe
  points at an image-generation task sheet (#311), painted-in compositing and `materials cut`.

## Evidence

- Case: first pass 68 findings over 11 pages (33 on the mobile page, 18 contrast, 13 glyph coverage,
  2 overlap, 2 off-canvas); final 0. `fonts query --style gothic --weight 700` covers all 606 CJK
  characters of the copy; Noto Sans CJK SC 500 / 700 / 900 measured with `fonts measure`, none missing.
- Templates: every default render, each listed size and 50 seeds pass the static check; the variants
  (`tone=dark`, `side=right band=grey wordmark=false`, `current=6`, `rank=5`) pass; every default render
  passes the browser check. First static pass of the templates: the album's wordmark, vertical band label
  and two-line description overflowed their boxes (the band label's glyphs sit right of the rotated
  baseline); fixed by measured boxes and moving the album up.

## Compatibility

Additive. No schema, rule, gate, receipt or CLI change; other templates' renders are unchanged. A
parallel pack PR touching the same counts in the two bank tests would conflict only on those numbers.
