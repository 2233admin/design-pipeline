# Design: atomic-age

## Decisions

- **Name.** `atomic-age` (pack) and `atomic-age-kit` (example): a period name, no brand, agency or work.
  Template defaults are original (Orbitville Gazette, Halcyon Orbital Lines, Meridian 88, Halcyon 7); a test
  greps the pack for programme, agency, brand and astronaut names.
- **Measured on the board, privately.** 17 panels: k-means palette, light and dark shares, chroma share,
  visual-weight centre; proportions read on the panels (masthead ink 0.16-0.18 of the cover height, sun disc
  0.216 W, contents column 0.16 W, margins 0.054 W, ad rocket 0.49 W, wordmark tracking about 0.5 em, two
  hours to a flight-plan page with a tick a minute, five holes on a checklist). Numbers are in each
  manifest's provenance and in the kit's GRAMMAR.md; the board is not shipped.
- **One palette, two grammars.** Cream paper #EAD5B0, teal #17555B, vermilion #C4421D (the main colour),
  mustard #E8922A, charcoal #211E1B; documents are sheets #F2EFE8 with charcoal type, ballpoint #2A4A9C and
  stamp #B5322A. Vermilion as small type is rust #A8360F (4.6:1 on paper); the solar print's measured field
  (#C84927) is darkened to #B03D1C so 12-14 px labels pass 4.5:1.
- **Embedded-face widths, not a looser model.** Condensed titles in League Gothic are about half the sans
  model's width. Options: widen boxes (titles then sit far too small or misalign), compress Noto (a different
  face), or measure the face. A pack opts its faces in; the layout and the check read the advances (+1%) from
  the embedded font file itself (cmap and hmtx), and only when the file embeds that face with `@font-face` at
  that weight, so the browser cannot fall back to a wider face behind the check's back, and another build of
  the family is measured as itself (a first version kept a static table per family and weight; review pointed
  out a different file of the same name would have borrowed it). Without `--font-dir` the layouts pin the
  role to Noto Sans SC and size from the model (#323). A test strips the `@font-face` rules from a render and
  sees the masthead fail `text-overflow` again.
- **Marks are slots.** Every template that carries a mark has an image slot (`logo`, `emblem`,
  `publisher_mark`) whose note gives its size, safe area and clear space; the layout never draws one. Owner
  files are placed only outside the repository (a private preview).
- **Vehicles are glyphs.** Swept rocket, classic rocket and satellite are a few flat polygons, as on the
  board's flat rocket shapes; realistic scenes are image slots (`art`, `craft`) with task sheets or
  public-domain period images (#301). A template whose slot is mode-dependent (`art=drawn|slot`,
  `craft=glyph|slot`, `emblem`) writes an empty slot group in the drawn mode, as `layouts-ink.cjs` does.
- **Print effects through materials.** The code draws flat inks, an optional code dot screen on shapes and
  offset (misregistered) shape plates; real ageing, halftone and misregistration come from `materials
  generate` (paper: age, foxing, stains, creases; print: litho flat with a misregistered second ink) and
  `materials process` (duotone with `misregisterMm`, halftone, photocopy), each recorded with params and seed.
  Templates take a generated sheet in a `paper` / `board` ground slot.
- **Real-world flavour lives in the example.** The sheet and page carry real programmes, dates and crews as
  historical text, NASA period imagery (1964-1975; public domain; captioned "Imagery: NASA. Not endorsed by
  NASA.") and two pages of the Apollo 11 Final Flight Plan for comparison. No insignia, logotype or seal, no
  signatures, no quotes or endorsements, no astronauts in promo-style pieces. The owner's private preview
  with real marks stays outside the repository.
- **Latin faces take Latin copy.** Layouts refuse CJK in Latin roles with a Fix; mixed copy goes to `body`.
- **Accent budgets per template.** Ad 0.62 (the lens is the hero; measured vermilion 44%), poster 0.36,
  cover 0.08, field label 0.04, documents 0.01 (ballpoint and stamp only).

## Not done

- A design-system component package for the kit (the owner asked for the template set first; the kit is a
  sheet and one page).
- Generated art for the two task sheets.
- NASA Image and Video Library as a `materials` source: reachable and keyless (images-api.nasa.gov answered
  200), but it needs a licence rule for NASA marks and third-party material; follow-up.
