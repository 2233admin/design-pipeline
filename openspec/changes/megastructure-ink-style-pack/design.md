# Design

## Decisions (made without asking)

- **Named by the grammar, never the source**: `megastructure-ink`; templates are `*.ink-*`; the example is
  `megastructure-ink-kit`. No file, test, commit or PR names the lineage's works, author, characters,
  organisations or vehicles; two tests fail if such a name appears in the pack or the kit. The reference
  images and the comparison sheets stay private.
- **No figures, and code draws only abstract structure** (#301): people, creatures, mecha and objects are art
  slots with task sheets and layer contracts. The structure plate is drawn because the grammar's subject is
  structure, and it is abstract (perspective frames, screentone walls, seams, ribs, a beam, cables, a light
  slit). It was kept only after a 64 px comparison beside the references: the plate screens read in the same
  family; the first flat-vector version read as a screensaver tunnel and a second "well" scene read as random
  lines — both were discarded. The person is stated by a scale marker (1.7 m against 3,400 m, 1 : 2,000).
- **One light**: the reference monitors' cyan (#73EDEE) lifted to #7FE6EA so it reads 4.5:1 as text on the
  monitor face; measured at 0.06–0.54% of a screen in the case. Alarm red only for hostile contact.
- **Our own glyphs**: the rail script is a generator (bars hung on a baseline rail, from the character code),
  not a tracing of any invented script; the pack's `railLayout` and the kit's `glyphs.js` are the same
  algorithm and a test keeps them identical.
- **Fonts**: no proprietary face. The heavy name is Noto Sans SC 900 compressed to 78% (horizontals thin more
  than in a true condensed cut, recorded in GRAMMAR.md). Latin caps Michroma, readouts Chakra Petch — OFL
  subsets that keep − ° · × – → because the readouts use them; CJK never goes into either (CJK readouts
  switch to the sans face). Share Tech Mono was considered and dropped: its OFL declares the Reserved Font
  Name "Share", so a subset could not keep the name.
- **Templates are the parts, not the site**: the site's canvas plates and scripts stay example pages; the
  bank keeps the key visual, the bar, the label plate, the HUD frame and the terminal. The template plate is
  a lighter SVG port of the canvas plate (18 levels, four tone steps) with an image-slot alternative.
- **Sections cap their height** (`min(100vh, 1080px)`), so the browser check can measure the whole page at its
  real height instead of growing every screen with the canvas.

## Evidence

- Case, `template check --browser`: first pass 566 findings over 5 pages (site 1920: 277, site 390: 249,
  HUD 17, terminal 4, gallery 19) — viewport-sized sections that grew with the check canvas, glyphs outside the
  first ASCII subsets, CJK in the data face, a skip link above the page; second pass 18 (dim decorative codes,
  a caption under the bar in slot mode, a wrapped tab row); final 0 on all five pages and the slot-mode page.
- `fonts query --style gothic` on the copy of every page: Noto Sans SC covers all of it.
- `design-system check`: ready, 26 components, every contrast pair passes, no unused token but `primary`;
  `foundation check --kind all`: ready.
- Templates: every default render, each listed size and 50 seeds pass the static check; variants pass; every
  default render passes the browser check with the fixture fonts.
- Whole-screen measures (private): reference manga pages 67–79% textured structure, edge density 29–34%,
  figure 8.2–8.8% of frame height; the case's hero 54% textured; the interface-only screens 5–10%.

## Compatibility

Additive. No schema, rule, gate, receipt or CLI change; other templates' renders are unchanged. Other packs
built in parallel also bump the bank counts in the same two tests; whichever merges second rebases them.
