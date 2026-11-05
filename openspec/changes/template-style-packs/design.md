# Design

## Decisions (made without asking; the issue left them open)

- **Where a style lives**: `skill/tools/template-bank/styles/<id>/style.json`, beside the templates
  it groups. The manifest names its style; font roles move from each manifest to the style (the
  per-manifest `fonts` block is deleted, not aliased). Palette stays per template; a template
  without one takes the style's.
- **One check, two halves**: the browser rules are more rules of `template check`, reported in the
  same findings list. No new gate, receipt, schema or resolver. The browser half is a child process
  (`page-check.cjs` doubles as the kernel) so the CLI keeps working without puppeteer when it is not
  asked for.
- **When the browser half runs**: always for HTML and SVG without template metadata (it is the only
  check that applies; no browser is exit 1 `TOOL_MISSING`), with `--browser`, and on every render or
  check of a style whose `checks.browserOnRender` is true (shinbo). Whenever it is needed and cannot
  run, the result is `unverified`: exit 1 `TOOL_MISSING` (no browser stack) or `KERNEL_FAILED` (the
  check broke: a page error, a timeout), never a pass; the rendered SVG is still written. There is no
  static-only escape: shinbo's collage, overlap and contrast rules need the pixels.
- **Review fixes (owner decisions on the PR review)**:
  - contrast ground per text unit: the page with only that unit hidden, so small text over a giant
    glyph is measured against the glyph (paper text on a paper stroke fails, black passes);
  - `text-occluded`: each unit is also painted with everything else hidden; when more than 15% of
    those glyph pixels (12 px or more) are missing from the page, the element above is named in the
    finding with a paint-order fix. Elements painting a `url()` background (normal blend) are
    collage layers, switched off by removing the background; multiply / screen texture overlays are not;
  - translucent text (rgba, opacity) is composited over each ground pixel before the ratio;
  - a failed request is an `asset-missing` finding; `@font-face` pointing at a `.ttc` is a
    `font-collection` finding (the browser takes face 0, JP for Noto CJK); render never embeds a
    collection and leaves it to the family name (verified: 直 in the render matches the SC face and
    differs from JP by 548k px);
  - a role's preferred font with unknown coverage keeps the stack, no switch is recorded;
  - rhythm: a black of 2-6 frames between two flashes is a black flash in the group; the flash rate
    uses each card's mean luminance when the cut list has it (ground tone otherwise) and says it is a
    cut-list approximation, not a verdict. The fixture is the experiment's whole final cut (394 frames,
    41 segments, `final/film-edl.json`); its remaining findings: a 7-frame hold, groups mixing grounds
    (segments 7, 18, 31, 37) and a 2-flash group;
  - the MODIFIED delta rewrites #271's "Not a template render" scenario; it archives after
    `template-bank`.
- **Contrast in both halves**: when the browser runs, its pixel contrast replaces the static
  estimate (the static model cannot see collage, filters, screentone or a real image), and static
  `glyph-coverage` findings for a slot the browser also reports are dropped.
- **The issue's acceptance, measured on the fixtures** (`tests/template-style-pack.test.cjs`):
  - first pass: `off-canvas` c04 l2 (400 px past the bottom); contrast 12 of the experiment's 13
    (c11 r3, codex r1st-r7st and sid, poster cr, home 故事简介, nights h1r at 4.48); the 13th, the
    poster tagline (2.21 in the prototype), came from a key sticker under the end of the line and the
    empty letter-spacing after it: the new check reports it as `collage-cover` (key over 9.8% of
    tag1's ink zone) together with the reading, the title and the second line (4 texts; the
    prototype's re-measure said 2);
  - final: passes every rule the experiment had; c01, c03 and c07 (em boxes intersect, the
    prototype's 3 overlaps) pass on ink; f03 (the key's rotated frame crosses the line, the
    prototype's 1 false `covered`) passes on alpha;
  - the new `glyph-coverage` rule finds 4 strings in the final codex that the experiment logged as
    switched but never switched (its UI helper returned the primary stack): Zen Kaku Gothic New
    lacks 场 发现 选择 换类. With those strings set whole in Noto Sans CJK SC the codex passes. This
    is a real defect in the final, not a false positive; the test asserts exactly these four.
  - from zero: seven cards, the poster (four CC0 collage pieces), the codex and the cut render with
    new copy and pass static and browser checks in one round.
- **Ink**: each text unit is painted alone in black and then in white with all other text and
  collage hidden; the per-pixel difference of the two shots is its coverage, independent of the
  ground, and zero where a plate is painted above it. Ink = coverage >= 48/255. Overlap: pixels of
  the smaller unit within the larger unit's ink dilated by max(2 px, 0.06 em of the smaller size);
  fail at >= max(6 px, 0.2% of the smaller ink). Units of one `data-grp` prefix are one lock-up.
- **Collage**: a layer's visible pixels are the full page against the page without that layer.
  `collage-cover` counts them inside the text's ink zone (ink dilated by 0.1 em), so a piece fails
  whether it is above the copy or under it as its ground (the grammar: collage never covers copy
  and engravings are never the ground of text); fail above 1% and 12 px. Layers: `img`, SVG
  `image`, `[data-collage]` (template collage slots and procedural cut-paper shapes carry it). The
  static paint model skips `[data-collage]`.
- **Contrast**: ground = the page with every text unit's colour, fill and shadows made transparent
  (collage kept); the ratio of the text colour against each ground pixel inside the ink box shrunk
  by 8%; reported value = 10th percentile (the prototype's measure; it reproduced h1r 4.48 and
  every other value within 0.1). The fix names black or white when one reaches the limit against the
  ground's 10th / 90th percentile luminance, the large-text size when that suffices, otherwise a plate.
- **Off-canvas** uses the layout box (per-line client rects, cross axis cut to 0.92 em), because ink
  outside the canvas cannot be photographed; `data-bleed` exempts.
- **Glyph coverage**: the browser half reads the `@font-face` files the page loads (local files)
  and asks registered providers; a family nobody knows is "unknown" in the notes, never "covered".
  Interface for #286: `coverage.registerProvider((family, { weight }) => Set<codepoint> | null)`.
  Until then `--font-dir` covers local font files matched to the style's face list by file name
  (any of .ttf .otf .ttc .woff; WOFF2 is not read here).
- **Rhythm**: segments carry the ground tone of their card; a flash group must keep one ground,
  so the cut alternates text, crop and push-in, not luminance. Flash rate counts opposing ground
  luminance changes of at least 0.1 with the darker side below 0.8 in any 30-frame window; more
  than three flashes fails. The experiment's own final edit fails this grammar in places (a 2-frame
  black, single flashes, three groups mixing grounds); the test keeps that as an adversarial case.
- **Fixtures**: regenerated from the experiment's source with relative asset paths; fonts are OFL
  subsets (WOFF) to the characters the pages use (Noto subsets carry all fixture text and ASCII so
  new copy from those characters renders on machines without CJK fonts); collage pieces are CC0,
  cut, downscaled to 560 px WebP; the paper overlay stays lossless (a JPEG moved h1r from 4.48 to
  4.57). `tests/fixtures/style-pack-shinbo/provenance.csv` lists every source; OFL texts sit beside
  the fonts.

## File ownership

- `styles/*/style.json`: style data. `layouts-shinbo.cjs`: shinbo geometry and procedural material.
- `page-check.cjs`: browser measurement and its findings; kernel entry when run directly.
- `coverage.cjs`: cmap reading and providers. `bank.cjs`: styles, roles, render, static check.

## Compatibility and migration

- Template ids, slots, parameters and renders of the nine templates are unchanged except the
  `data-font-role` attribute and `style` in the params metadata; their `template.svg` were
  regenerated. Manifests lose `fonts` (moved to the style). No migration path is kept.
- `template check` of an SVG without metadata changes from exit 1 to the browser check (see the
  proposal). `template list` gains `styles` in its result.

## Not in this change

- The font catalog itself (#286) and the material source catalog (#287); this change leaves the
  coverage provider interface and a `sources` note in the style.
- Hover states: the browser half checks the page as loaded; UI templates are SVG without hover.
- Encoding the title-card cut to video: the EDL is the output; the film flash check on video is the
  pending `film-photosensitive-flash` change.
