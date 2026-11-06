# Template bank: parameterised layout templates, rendered by id and audited on render

The template bank is a set of SVG layout skeletons for covers, key visuals, cards, banners and UI
panels. Each one is a structure measured from a reference corpus, with named slots, parameters with
measured ranges, palette roles and provenance. You render one by id with your copy and knobs, and the
render is checked on the spot: text fit, minimum size, contrast, figure and crop zones, accent area
and shared alignment lines. It works like a sound-effects bank: sounds as code, played by id with
knobs, measured on playback.

Code: `tools/template-bank/` (`bank.cjs` render and static check, `page-check.cjs` the browser
check, `coverage.cjs` glyph coverage, `distill.cjs` / `reference-measure.cjs` reference distillation, `layouts.cjs` / `layouts-shinbo.cjs` / `layouts-<pack>.cjs` geometry (`layout-kit.cjs` shared helpers), `lettering.cjs`
code-drawn display lettering, `styles/<id>/style.json`, `templates/<id>/manifest.json` +
`template.svg` + `spec.md`).

Templates belong to **style packs**. A style is font roles + layout grammar + materials + motion
grammar + check rules; its templates are the parameterised layouts of that grammar:

| Style | Templates | Character |
| --- | --- | --- |
| `arknights-endfield` | 9 (kv, cover, card, banner, ui) | Measured from official promotional art: code-drawn condensed Latin over CJK sans/serif, one figure, a shared left line |
| `shinbo` | 11 (7 title cards, a corridor poster, a chapter grid, an item codex, a title-card cut) | Flat red/black/paper grounds, Mincho against small gothic, architecture and void, cut-paper collage that never touches copy, flash-hold-black rhythm |
| `citypop-sleeve` | 3 (event KV, recruit screen, ten-pull wall) | City-pop record sleeve: one pool cyan, white walls, hard cast shadows, striped numerals, postcards at small tilts; lemon only for the top rarity and the main button |
| `xerox-flyer` | 3 (scorebug with a half-size reflow, ban/pick board, tour-flyer poster) | Punk photocopy flyer: one fluorescent pink, black and paper as if copied, ransom-note scraps, spray-stencil numerals |
| `cassandre-litho` | 7 (the `steam.*` capsule set) | Lithograph poster: vermilion field, a monument from below, the title inside a beam of unprinted paper; one design re-composed for every Steam size |
| `woodblock-pixel` | 2 (title screen, inventory) | Road-station woodblock on a 480 x 270 grid: bokashi dither bands, ink one pixel out of register, paper panels on dark-red plates, a vertical vermilion cartouche |
| `acid-print-hud` | 1 (combat HUD) | One acid ink on black slabs, giant chamfered numerals with a misregistered plate, the scene as a cold halftone |
| `cyanotype-specimen` | 2 (card frame in four rarities, pack opening) | Cyanotype specimen sheets: one Prussian blue, hand-brushed fields, white-line specimens, rarity by process not colour |
| `street-tape` | 6 (site top bar, section title block, vertical pager, cut container with carousel, sticker CTA, first screen as layers) | Japanese street-fashion city game site: light grey, one acid yellow-green, black fine stripes, rounded slabs with one 49-degree cut, a film strip, numbered three-line section titles |
| `frontier-survey` | 5 (left rail, section opener, crew dossier, album screen, version timeline) | Industrial sci-fi frontier game site: a white page with a fixed left rail, one signal yellow as tall columns and side bands, four-layer section titles, hatched ghost lettering, contours and data marks (objects come from image slots) |
| `lattice-dossier` | 5 (top frame, rail pager, section heading with ghost word, bulletin screen, four columns) | Industrial dossier-terminal game site: near-black ground, a 172-unit lattice with both diagonals, three frame hairlines (y 152, y 900, x 1683), one signal cyan for state only, a rail numeral cut to its top 55% |
| `celestial-voyage` | 4 (site top bar with hanging logo and cream tab, gilt news ticket, news section, character section with faction orbit) | Star-voyage fantasy RPG site: deep navy star field, gold only as hairlines and the current state, a heavy CJK serif title over a hairline italic Latin ghost, gilt-rimmed rounded cards, faction medallions on an arc centred off-screen |
| `crisis-command` | 5 (title card, film title line, alarm wall, countdown bezel, coupling board with a five-seat vote) | Crisis-terminal and title-card grammar of 1990s Japanese mecha anime: heavy Mincho compressed in measured steps on black, red 3.06:1 hexagons with 55-degree tips over a blue lattice, drawn amber segment clocks, hard-cut state changes |

The six game packs come from owner-approved cases, `street-tape` from a reference board the owner supplied and `frontier-survey` from a reference site captured for the owner, `lattice-dossier` from a live official site captured and measured privately, `celestial-voyage` from a public reference site the owner named and `crisis-command` from reference frames measured privately (all kept private, measured, never shipped), each with an original site built on it (each pack's `provenance` names the case, its lineage and
the rule *borrow grammar, never assets*); `examples` in each pack lists the case screens that stayed example
renders because their structure was a one-off.

## When to use it

- A cover, key visual, card, banner or UI panel whose structure matches a template, when you want a
  measured starting layout instead of placing everything by eye.
- Text that has to fit: the check tells you which slot overflows and by how much, before anyone looks.
- A study of a house style: render the template, change one relation, compare.

It is a **starting structure for small improvements, not a finished design**. The figure, key art and
logo are placeholders; the templates carry proportions and relations, not the look of a finished
piece. Put real art in, then judge the pixels against the brief. A passing check is technical
conformance only; it does not grant visual or creative acceptance.

Do not use it when the brief needs a layout none of the templates have (pick another route in
[capability routing](capability-routing.md) rather than forcing copy into the wrong slots), or when
the deliverable is a full page or product flow (use `next`).

## Commands

```sh
designer-pipeline template list [--family kv|cover|card|banner|ui|motion|broadcast|poster|steam|pixel|hud] [--style <id>]
designer-pipeline template render <id> --set slot=value ... --param name=value ... \
  [--seed <n>] [--size WxH] -o out.svg [--png out.png] [--font-dir <dir>] [--browser]
designer-pipeline template check <out.svg | page.html | hand-made.svg> [--browser] [--size WxH]
designer-pipeline template distill <provenance.csv> --images <dir> -o <out-dir> [--annotations <file>] [--compare <style-id>] [--ablate]
```

- `list` gives each template's id, family, sizes, slots with their character budgets, and its
  variation knobs.
- `render` writes the SVG and returns the check in the same result; exit 0 when it passes, 2 when a
  finding fails (the file is still written so you can look), 1 for usage errors (unknown template,
  slot, parameter, value out of range, wrong aspect).
  - `--set` fills a slot. Text and lettering slots take copy; image slots take a png, jpg, webp or svg
    path, embedded into the SVG.
  - `--param` sets a parameter inside its measured range, or a palette role:
    `--param palette.accent=#E0344F`.
  - `--size` takes any size with the template's aspect; `list` shows the tested sizes.
  - `--tone <image-slot>=#RRGGBB` declares the tone of a real image under text when no browser
    can sample it (also on `check`).
  - `--png` rasterises through the headless browser used by `composition capture`
    (`--chrome`, `--puppeteer-module` as there). The check runs first; if the capture fails, the
    result still carries the check, plus a warning.
- `check` re-measures any render, including one whose geometry was edited by hand after rendering,
  and any HTML page or hand-written SVG (those get the browser half only). The rules it applies to
  a render (figure zones, which slots are titles, alignment lines, accent budget) are written into
  the file at render time, so an edit cannot add or move them; and the check does not track an image
  swapped into the file by hand: re-render with `--set` instead.
- `--style <id>` on `list` prints the pack: font roles, grammar, materials, motion grammar, checks.
- `--font-dir <dir>`: the style's font files (TTF, OTF, TTC or WOFF, matched by file name). Each
  string is then set in the first font of its role that covers every character, never glyph by
  glyph; the result lists `fontSwitches`, and the faces are embedded for `--png` and the browser.
- `--browser` adds the browser half (below); a style whose checks ask for it (shinbo) runs it on
  every render; without Chrome or puppeteer-core such a render is `unverified` (exit 1
  `TOOL_MISSING`), never a pass, and a broken check (including a page that navigates away) exits 1
  `KERNEL_FAILED`.

Every finding carries a `fix`: how many characters fit, which parameter to set and to what value
(inside its measured range, or a statement that only shorter copy helps), how far to move an element.

## What the check measures

Measured on the rendered SVG, from its geometry and the rules embedded at render time:

| Rule | Measured | Limit |
| --- | --- | --- |
| `text-overflow` | Each text slot's extent (lettering from its path coordinates; `<text>` from the advance model below) against the slot's box, and wrapped lines against the slot's line budget | Inside the box |
| `text-length` | Characters against the slot's budget | `maxChars` |
| `type-size` | Font size, or cap height for lettering | 12 px, 9 px cap |
| `contrast` | Text colour against the ground under 27 points of its extent: shapes, opacity and gradients composited from the file; an empty image slot counts as its declared ground tone; a real image is sampled as rendered pixels in a browser, or taken as its `--tone` | 4.5:1, 3:1 for large text |
| `contrast-unverified` | Text on a real image whose pixels could not be sampled and has no `--tone` | Fails; the fix names both options |
| `lettering-fallback` | Characters a lettering slot cannot draw; the slot falls back to the CJK font, so its style changed | None allowed (lowercase is drawn as capitals and only noted) |
| `unsupported-geometry` | Nested `<svg>`, `<use>`, `<foreignObject>`, CSS transforms or font styles (`@font-face` rules that only load faces are allowed), tspans with `dx`/`x`/`y`/`rotate`, transform functions other than translate, rotate, scale and matrix | None allowed: a file the check cannot measure fails |
| `figure-zone` | Horizontal overlap of title slots with the figure zone while they share rows | 30% of the title width |
| `safe-zone` | Listed slots inside a crop zone (the 16:9 centre crop of a 16:10 cover) | Inside |
| `accent-budget` | Area of accent-role or accent-coloured paint, clipped to the canvas; text at 45% of its extent | The template's `accent_max_share` |
| `align-line` | Ink edge of each listed element against the template's shared left (or right) line | 0.5% of the width |

| `glyph-coverage` | A string no font of its role covers (known from `--font-dir` or a coverage provider) | Every character covered |
| `rhythm` | Motion templates: frames per cut by kind (a 2-6 frame black between flashes is a black flash), flash groups (size, one ground tone), repeats, duration, and a cut-list approximation of the flash rate from each card's mean luminance (or ground tone) | The style's motion grammar; 3 flashes a second, confirmed only on the encoded film |

Filled paths are read as polygons: lines (`M L H V`, absolute and relative) exactly, curves by their
control polygon, arcs by their end points; an unparsed arc no longer adds a phantom triangle reaching the
origin that darkens the ground of text far away.

Decoration slots (watermark words, micro-markers, barcodes) are exempt from size and contrast; slots
marked `bleed` are exempt from the box.

**What the text-width model guarantees.** The fonts are named, not bundled, so `<text>` widths come
from per-character tables measured in headless Chrome with Noto Sans and Noto Serif CJK SC (one table
for the sans at 400 to 700, one for the sans at 900 and the serif), with floors for wide Latin. For
every string in the calibration set (`tests/template-bank-browser.test.cjs`) and every family and
weight the layouts use, the model is at least Chrome's width; that test skips where Chrome or the
fonts are missing. Nothing more is promised: another font, or a fallback font the browser picks for a
glyph the named fonts lack, can be wider. Render `--png` and look when the copy is unusual.

### The browser half

`page-check.cjs` loads the file in headless Chrome at its own size and measures pixels, so it also
sees layers injected after rendering, hand-written SVG and HTML pages:

| Rule | Measured | Limit |
| --- | --- | --- |
| `text-overlap` | Ink of each text unit (painted alone in black, then white; their difference is its coverage, so plates above it count and the em box does not) against the ink of other groups | Touching within 0.06 em |
| `off-canvas` | Line boxes (cross axis cut to the font size) past the canvas | 1 px; `data-bleed` exempts |
| `collage-cover` | Pixels a collage layer (`img`, `image`, `[data-collage]`, an element with a `url()` background) actually paints inside a text's ink zone (glyphs + 0.1 em), above it or as its ground; the rotated frame does not count | 1% of the zone |
| `contrast` | Each text run's own colour (a `<text>` fill inside a marked `<g>`, every span; the worst wins; translucent colours composited) against the page with only that text hidden, so other text under it counts, 10th percentile inside the ink box | 4.5:1, 3:1 at 24 px (18.66 px bold) |
| `text-occluded` | Glyph pixels of the text painted alone that are missing on the page (a plate or panel above it) | 15% |
| `asset-missing` | Requests that failed (images, fonts) | None |
| `font-collection` | `@font-face` pointing at a `.ttc` (the browser takes face 0) | None |
| `page-error` | Uncaught exceptions and console errors (other than failed loads, which are `asset-missing`) | None |
| `no-text-measured` | No visible text on the page; a text-free page declares `data-no-text` on its root | At least one text |
| `glyph-coverage` | Characters missing from the first font of a run's stack (the page's `@font-face` files, or a registered provider) | Every character |
| `safe-area-type` | Ink of each text unit over the face and hand boxes of a composited character (from its `materials composite` receipt, scaled to the image's rendered box) | 12 px of ink |
| receipt checks | `composite-upscale` and `safe-area-occluder` from the receipt fail; `composite-black-point`, `composite-colour-mismatch` and `matte-halo` are warn bands and go to the notes | See *Generated characters and layers* |

A drawn numeral or word (paths, no text) is measured as lettering when it is a lettering slot or
carries `data-chk` (give `data-cap` for its cap height): overlap, off-canvas and contrast, the colour
taken from its `.lettering` paths (the stroke when a glyph is stroked), so a page made only of drawn
numerals no longer needs `data-no-text`. An offset shadow plate of a lettering slot (`shadow` below)
is hidden with it and never taken as its ground.

Mark your own layers so they group and exempt correctly: `data-chk="<id>"` names a text unit (an
element holding marked children is a container), `data-grp="<group>/<n>"` makes a lock-up whose
parts may touch, `data-deco` exempts decoration from overlap and contrast, `data-bleed` from the
canvas edge, `data-collage` marks a cut-out drawn in SVG. An image that carries `data-layer="ground"`
itself, or whose own slot element does (`[data-slot][data-layer="ground"]`, as template image slots
declared `"layer": "ground"` render), is the text's ground: sampled for contrast, never counted as
collage; without a matching receipt the report notes it as self-declared. An ancestor wrapper does not
count. An image listed as a ground output in the `composite.json` beside it is ground too, but only when
its sha256 matches the receipt.
Do not put `data-chk` on decorative paths: a marked element is measured as text (overlap, off-canvas and
contrast), even when it holds only paths; use `data-deco` for decoration. Path data is read in full
(arc flags may be glued to the next number, as svgo writes them); a `d` that cannot be read is
reported as `unsupported-geometry` (unmeasured) with a fix, never measured in part. When both halves run, the browser's pixel
contrast replaces the static estimate.
Without it, the static check samples the rendered pixels under text on a real image slot (or
takes a declared `--tone`).

## Generated characters and layers (#311)

Showcase renders stay character-free; characters come from an external image model and join the
scene as layers. A template declares its **layer contract** in `manifest.layers`
(`design-pipeline.layer-contract.v1`; `kv.tape-hero` is the first):

- `stack`, in paint order, roles `bg`, `ground`, `ghost-type`, `mid` (behind), one `char`, `fx`, `fg`
  (in front), `texture` (`blend: multiply|dots`) and `type` (always last: titles and UI stay live text).
  `plate: true` marks a full design-space plate (`design: [w, h]`); other layers are sprites.
- `char`: key and rim light directions (vectors from the light, y down), `rimColour` (a palette role),
  key temperature, facing, cast shadow direction and length, safe parts (`face`, `hands`).
- `sizes["WxH"]`: `frame.rect` (and an optional `clip` polygon), the plate `crop` in design units,
  `char.foot` and `char.height` in output px, `char.frameBreak` edges, sprite `boxes`, the axis-aligned
  outer `type` boxes (rotate first), `pxScale` for the integration's pixel values.

The style pack's `integration` says how a character joins: `mode` `sticker` (die-cut white edge, black
line, offset plate) or `painted` (light wrap, rim, haze, cast shadow), each with its grade (OKLab: `bw`
black and white point, `meanvar`, `chroma`, `huePull` toward `hueRole`, a highlight shoulder), shadows,
occluder and outline in px at a 1080 px short side; `texture` per blend; `figure.rendering` and
`figure.references` (names, not adjectives) for the task sheet.

1. `materials request --template <id> [--subject ...]`: the task sheet (`materials/requests/<name>.md`
   with a prompt block, and `.json`). Figure height at least 2x the largest slot; transparent PNG or a
   flat backdrop chosen far from the palette; light and rim; palette; regions of the figure that the
   type or the occluder cover at some size (keep face and hands out); no text; original characters only.
   A subject that matches a derivative cue (fan art, cosplay, 同人, a character from an existing work) is
   refused (exit 2). That list is a heuristic, not a gate: the subject is folded to one line, capped at
   200 characters and quoted as data with the fixed original-characters constraint after it, and your
   review of the image is what actually decides.
2. `materials add --kind generated --tool <tool> --prompt materials/requests/<name>.md --landmarks '{...}'`:
   the output with its sheet's hashes and the returned foot, head, face and hand boxes. `materials check`
   fails when the sheet is gone or changed. The lineage is self-reported: the hashes prove the sheet was
   not changed afterwards, not that the image came from it.
3. `materials cut --mode grabcut --finish cut[,outline]`: colour models and graph cut (for gradients,
   vignettes and shadows the border and paper references cannot separate), a guided-filter edge and
   defringe; the cut records the halo before and after.
4. `materials composite --template <id> --set <layer>=materials/<file>.png ... [--mode] [--size]`: every
   declared size into `materials/composite/<name>/<WxH>{,-ground,-upper,-mask}.png` plus `composite.json`
   (inputs and hashes, parameters, per-size steps and measurements, the command to redo it). Measured
   per size: upscale (above 1.5x fails), black-point difference (warn above 0.03 L), mean colour
   difference (warn above 25; a residual of 10-20 on flat light grounds is expected, never pull it to
   0), halo at the use size (warn above 1 px), face and hands under a declared type box or the occluder
   (fail). Outputs are recorded; `materials check` marks them stale when an input, the template's layer
   contract or the style's integration changes, with the recorded (shell-quoted) command as the fix.
5. `template render <id> --set scene=<WxH-ground.png> --set figure=<WxH-upper.png>` (or `<img>` in a page):
   the browser check measures contrast on the composited pixels, takes the ground as ground, and checks
   the measured ink against the character's face and hands.

## Variation knobs: so outputs do not all look the same

Every parameter has a class in the manifest:

- `proportion`: measured relations (margins, title column, figure position, zone edges). Keep them
  inside their range; they are why the template works.
- `rhythm`: sizes, gaps, the display lettering's width, stroke, chamfer and stencil, tracking.
  `--seed <n>` picks every rhythm value inside its measured range (the same seed gives the same
  render); `--param` overrides it.
- `decoration`: on/off layers and counts (watermark, glow, ticks, shards, rank marks).

Be clear about what a seed does: it changes type sizes, gaps, tracking and the lettering's shape
within the measured ranges. It does not change the layout; every seed of a template has the same
structure. Layout variation comes from choosing another template, or from setting the `proportion`
parameters yourself (title column, figure position, plate position) inside their ranges.

Vary on purpose: change the palette roles to the project's colours, pick the template that fits the
subject, set the layout parameters, then use seeds for the finer rhythm, and turn decoration off
where the subject is busy. Keep the relations the manifest lists in `relations`. The same template
with the same knobs on every cover is a house style at best and a cliché at worst.

## Glyph coverage and the font catalog

A string is set in one font. `coverage.cjs` reads cmaps from font files and asks registered
providers first: the font catalog plugs in with
`require("tools/template-bank/coverage.cjs").registerProvider((family, { weight }) => Set<codepoint> | null)`.
Without either, coverage is reported as unknown, never as covered.

## Fonts

Font roles live in the style (`fonts.roles`: stack, weight, use). In the Arknights / Endfield
pack, Latin display slots use the code-drawn lettering (`lettering.cjs`: A-Z, 0-9, space and
`/ \ - _ + . , : ; [ ] < > | # % ! ? ' " & €`; condensed, chamfered, optional stencil); it renders
as paths and needs no font. Lowercase is drawn as capitals. Any other character (CJK, accented
letters, emoji) makes the whole slot fall back to the style's open fonts, and `check` reports it
as `lettering-fallback`, because the style changed: Source Han Sans / Serif or Noto Sans / Serif CJK
(SIL OFL 1.1). They are named, not bundled: install them where you render the SVG or PNG.

## Shinbo pack: what it encodes

- Title cards on one flat ground (`ground=black|paper|red`); a single character may fill and bleed
  the frame; small text goes to the far corner; brackets move with the measured sentence.
- Red text on black only at 24 px or more (3.5:1); white on red at any size (4.8:1); one jarring
  accent per piece, black text on it.
- Collage slots take cut-outs with alpha (PNG / WebP) and draw only when filled; the corridor,
  doors and butterfly are drawn in code. Collage never covers copy (`collage-cover`).
- `motion.title-card-cut` returns an EDL (`edl` in the result) of flash, hold and black segments
  built from the shots `ground:label`; `groups=0` picks the count that lands in 10-15 s. Encode it
  with your card renders, then check the film with `verify film-render`.
- Acceptance fixtures: `tests/fixtures/style-pack-shinbo/` (the experiment's first pass and final).

## Game packs: what they encode

- **citypop-sleeve**: `time` in `cover.event-kv` is a striped-numeral lettering slot (digits and `: . - /`);
  its contrast is the deep-teal cast shadow (the white tube alone is about 2.2:1 on pool). Ten-pull
  rarity is the number of stars in `card_<i>_stars` (3-6): the plate follows it (6 lemon, 5 paper, 4 deep
  teal, 3 sand). The palm shadow is drawn until a cut silhouette fills the `palm` slot.
- **xerox-flyer**: ransom notes are one slot per scrap (`sticker_<i>`, `title_<i>`, `hover_note_<i>`), each
  with a seeded look; codes, scores, timers and dates are stencil lettering with two spray bridges.
  `broadcast.scorebug --param scale=half` reflows the bug (nothing under 12 px, bridges off), it does not
  shrink it; the pause is `centre_frame=dashed` plus the pause copy.
- **cassandre-litho / steam.\***: one template per Steam size (header 920x430, small 462x174, main
  1232x706, vertical 748x896, library 600x900, event cover 800x450, event header 1920x622), each a row
  of the same composition (monument foot and lantern, beam angle and spread, title distance and tilt).
  Render every size from the same `--set title=… --set title_latin=…`; put your own monument in the
  `monument` slot. The small capsule keeps the title near half its height, so it still reads at the
  store's 120 x 45. Text-free assets (library hero, background, icons, logo) are not templates.
- **woodblock-pixel**: sizes are 480 x 270 times a whole number; anything else exits 1. Pixel writes are
  run-length paths, large dithers are 4 x 4 Bayer patterns over a flat rect of their mean colour (the static
  check sees a ground; the browser sees the pixels). Render with `--font-dir` holding the pixel font, or the
  text falls back to an outline font; `tests/template-game-packs.test.cjs` checks that every 4 x 4 block
  outside text is one palette colour at x4.
- **acid-print-hud**: HP, ammo and scores are chamfered lettering; HP and ammo also fill their bars and
  ticks, and turn red at 25 HP / 8 rounds (the ammo's misregistered plate swaps colour). The scene is an
  image slot: print it as a halftone first (pack recipes).
- **cyanotype-specimen**: `card.tcg-frame --param rarity=common|rare|epic|legend` changes the process, not
  the hue; the specimen goes in the `art` slot as white lines with alpha, and a drawn algae frond stands in.

- **street-tape**: every diagonal is 49 degrees (`CUT` in `layouts-street.cjs`; measured three ways on the
  board, not 45). The section number (`number`) and the pager's `current` / `next` take digits only; `date`
  takes digits and `/ . -`. Anton and Oswald are Latin-only roles (`num`, `label`): put mixed CJK and
  Latin copy in `head` or `body`, or the browser check reports glyph coverage. The number is sized from
  the digit height of the family that renders so its ink is 2.6-2.9 times the CJK title's, measured on the
  render: the first `num` family `--font-dir` supplies (Anton, else Oswald), and with neither it is pinned to
  Noto Sans SC (recorded in `fontSwitches`; an Oswald that is installed but not supplied is not used, since
  the size cannot rely on it). Pass `--font-dir` with Anton for the board's look. `side=right`
  mirrors the slabs and the title edge; `kv.tape-cut-carousel --param control=dots` swaps the thumb track
  for dots. Pictures go in `media`; characters come from an image-generation task sheet (#311).

- **frontier-survey**: wide Latin slots (`title_latin`, `mark_latin`, `band_latin`) take Latin caps and
  digits (Michroma is about 1.0 em a capital and is named, not bundled; without it the Latin falls back to
  Noto Sans SC); indexes take digits and `/`, timeline dates `MM.DD`. Mixed CJK and Latin copy goes in
  `head` or `body`. Yellow is the one accent and stays in columns and bands (`col_x` moves the column);
  `kv.survey-album --param side=right --param band=grey --param wordmark=false` is the mirrored companion
  screen. Figures go in `card.survey-dossier`'s `portrait` (transparent, from an image-generation task
  sheet, #311); a showcase without characters puts an instrument drawing there.

- **lattice-dossier**: the frame is fixed (`FRAME` in `layouts-lattice.cjs`: hairlines at y 152, y 900, x 1683
  of 1920; `GRID` 172). Cyan is for state only (current nav and tab, tags, progress, the rail numeral, a
  short bar under a title): every default render keeps it under 3% of the canvas. The rail numeral is the
  derived decor slot `numeral` drawn from `current`, cut to its top 55%; the readable number is the small
  line on its ground plate. `current` and `total` take digits only; dates take the dossier form
  `2026 // 11 / 06` (digits, spaces and `/`). Michroma, Oswald and Chakra Petch are Latin-only roles
  (`wide`, `narrow`, `mono`); mixed copy goes in `head` or `body`. Michroma is very wide: give its slots
  room. Art goes in `art`, `media` and `col_N`; characters come from an image-generation task sheet (#311)
  with a painted-in blend (grade to the scene, fog wrap, a cyan rim), not a sticker outline.

- **celestial-voyage**: gold is the only accent and stays a line (rims, ticks, underlines, the orbit):
  keep fills navy, panel or plate. `title_latin` is the stroke-only ghost under the CJK title (Latin
  capitals, digits, space `& . ' -`; `data-deco`, so it is exempt from overlap and contrast); dates take
  digits and `/ . -`. The faction orbit is a circle of radius 760 centred at (1005, 540) in 1920 units with
  medallions 13.7 degrees apart (`ORBIT` in `layouts-voyage.cjs`); the current one carries the first
  character of `faction`. Cinzel and Cormorant Garamond are Latin-only roles (`label`, `ghost`). In show
  mode, carry a screen with type, frames, data and `materials generate` textures (an ink flat, a paper
  stub, FM star dust), not drawn pseudo-illustration; figures go in `art` / `cover*` from a task sheet.

- **crisis-command**: Mincho is compressed, never redrawn: `d.text(..., { compress })` draws a scale-only matrix
  about the anchor (factors 0.30 to 2 only; the check keeps the vertical type size and reports a horizontal scale under 0.30 of it as `type-size`). The steps are `COMPRESS` in `layouts-crisis.cjs`
  (1.00 card, 0.85 panel, 0.65 credits, 0.35 film; the film template stops at 0.40 with the open face). The
  title card's three title slots make the L: `head_1` alone on line one, `head_2`, a half-pitch comma, `head_3`.
  Clock and ratio digits are drawn segments in lettering slots (`clock` hh:mm:ss, `elapsed` hh:mm:ss.cc, `ratio`
  digits with one decimal); Latin slots take ASCII only and are sized from Archivo when `--font-dir` supplies it,
  else pinned to Noto Sans SC. Hexagons are 3.06:1 with 55-degree tips (`HEX`). Mecha, pilots and feeds are image
  slots with task sheets; the example `examples/crisis-command-ui-kit/` carries the case's pages and 26 components.

Layout helpers for new packs: `layout-kit.cjs` (`rbox` for a tilted slot's box, `tilt`, `ngon`,
`discStripes`, a seeded `rng`); `d.text(..., { italic, filter, compress })` (compress scales x about the anchor and keeps the type size), `d.lettering(..., { shadow: { dx, dy,
role } })` for an offset plate, and `d.image(..., { labelAt: [fx, fy] })` to move a placeholder label off
the layout's copy. Placeholder labels switch to black or white when their grey would fall under 4.5:1 on
the slot's hatch.

## Add a style pack

1. Write `styles/<id>/style.json` (schema `design-pipeline.template-bank-style.v1`): `fonts.roles`
   (stack, generic, weight, use) and `fonts.faces` (family, weight, file, source, licence),
   `layout.grammar`, `materials` (procedural, collage rules, sources, budget), `motion` (or
   `motionNote`), `checks` (`static`, `browser`, `browserOnRender`).
2. Write the layouts with font roles (`family: "<role>"`) and give each template `"style": "<id>"`.
3. Render every template, check with `--browser`, and keep fixtures of real outputs that the check
   must catch and pass.

## Distill a style pack draft from references

Instead of measuring by hand, give the references to `template distill`:

```sh
designer-pipeline template distill refs/provenance.csv --images refs/raw -o drafts/<id> \
  [--annotations refs/annotations.csv | refs/labels.jsonl] [--category KV,COVER] [--id <id>] \
  [--compare <style-id>] [--ablate]
```

- **Board**: the provenance list below (id, source URL, size, category; a `file` column or
  `<id>.jpg|png|webp` in `--images`). Images are read locally (ffmpeg) and never copied: the outputs
  carry ids, source URLs, sha256 and numbers only. Keep the images out of the repository.
- **Annotations** (optional, recommended): the study's `annotations.csv` (title box, figure x range,
  logo corner, orientation) or `labels.jsonl` (text lines with box and size, figure box). Without
  them only the pixel features are measured; title, margins, type ratio and font roles are gaps.
- **What it measures** (no model): OKLab palette, ground lightness and chroma, main and neutral
  shares, hue spread, strong-colour share, visual-weight centre, mirror symmetry, whitespace cells,
  spectral texture; from annotations, title position and area, text margins, type-size ratio,
  figure centre and width, title over figure; stroke contrast and weight of annotated text.
- **Output** in `-o`: `style.json` (a style pack with `draft: true`; `checks.measured` holds each
  threshold with its kind, basis and support), `distill.json` (every reference's measures) and
  `report.md`. Thresholds are the reference distribution: a maximum is the p75, a minimum the p25,
  a band p25-p75; `measured` needs 8 references, `thin` 3, fewer is a `gap` (no limit). Only measured
  features write grammar into `style.json`; thin ones are listed as tendencies in the report.
- **Archetypes**: references grouped by aspect, title position, figure side (or symmetry) and
  whitespace; each names the nearest bank template or a skeleton (median boxes) to write.
- **Font roles**: mincho when stem / bar is 1.8 or more (the catalog's measure on 十), gothic at 1.35
  or less, otherwise left to the eye (brush kai and rounded faces read as even strokes). With the
  open-font catalog installed its candidates fill the stack; otherwise the report gives the
  `fonts query` command. Crops need text 16 px or more high: annotate on the full-size image.
- `--compare <style-id>` diffs a hand-made pack, with a reason for every difference. `--ablate`
  renders the nearest templates with the draft and with the measured palette, the neutral ground or
  the single hue removed (needs the browser, as `--png`), and reports the paired change in distance
  to the references. Read the change, not the absolute distance: templates carry placeholders.

The draft describes what the references are like, not what is good, and a template that sits at
the median is not better than one that does not. Read the gaps in the report, decide them, then copy
`style.json` into `styles/<id>/` and write its templates.

## Add a template distilled from a reference

1. Collect the references and record each in a provenance list (id, source URL, size, category, date).
   Keep the images out of the repository; record only their URLs and your measurements.
2. Measure, do not trace: annotate layout boxes (title, figure, logo corner), take medians and
   ranges, and measure colour (largest-cluster lightness and chroma, vivid share, hue spread). Write
   the numbers and sample counts in `spec.md`.
3. Write the layout in `layouts.cjs` as fractions of W and H: placeholder slots for art and logos, a
   box for every text slot, `zone()` for figure keep-out or crop zones, `align()` for shared lines. No
   traced shapes, logos or official text.
4. Write `manifest.json` (schema `design-pipeline.template-bank-template.v1`): its `style`, sizes and aspect,
   slots with kind, default, budget and size parameter, parameters with default, range and class,
   palette roles with their use, the accent roles and budget, `relations`, `decoration`, and
   `provenance` (corpus, URL, access date, sample ids, measured facts, method).
5. Render it at every listed size and run `template check`. Where the measured study fails its own
   check (a colour below 4.5:1, a budget that overflows its box), fix it and list the change in
   `changesFromStudy`.
6. Write `template.svg` from the default render, add tests, list the files in
   `references/package-resources.json`, and name the reference owner and licence in
   `THIRD_PARTY_NOTICES.md` (reference only, not redistributed).

The nine `arknights-endfield` templates come from a measured study of official Arknights / Endfield promotional
art (reference only, © HYPERGRYPH):
`docs/research/arknights-endfield-template-study.md` in the repository.
