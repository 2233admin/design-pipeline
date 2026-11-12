---
sourceMeta:
  id: arknights-printer
  kind: github
  url: https://github.com/AspldeZ/arknights-printer/tree/20336d598f4848a257ce36002f339655c8655351
  reviewedRevision: 20336d598f4848a257ce36002f339655c8655351
  reviewedContentHash: e4ed7106ca0c081e6029c8b21806b21853a43b2eb8cb2c24ffd1dc4f18d8dcb3
  contentHashScope: ordered UTF-8 sourceFiles with path-and-newline separators
  sourceFiles: arknights-printer/SKILL.md, arknights-printer/references/techniques.md, arknights-printer/references/parameters.md, arknights-printer/references/outputs.md, arknights-printer/references/cjk-typography.md, arknights-printer/scripts/render_check.py, LICENSE
  reviewedAt: 2026-11-12T00:00:00.000Z
  freshnessDays: 365
  license: MIT
  useBoundary: reference-only; the method is restated here in this project's words and measured by the existing template check; do not install or execute the upstream skill or its Python scripts
---

# Industrial document sheets (poster or information sheet about a real subject)

A method for one kind of static piece: a poster, key visual, information sheet or archive card in
an industrial sci-fi grammar, about a **real subject** (a measurement, a structure, a route, an
event), drawn as a document an institution could have issued. It is the method behind the
`arknights-endfield` style pack's look, aimed at subjects with data instead of promotional art.

- Source: [AspldeZ/arknights-printer](https://github.com/AspldeZ/arknights-printer/tree/20336d598f4848a257ce36002f339655c8655351),
  MIT, unofficial fan project. It keeps a style and none of the works.
- Not bundled: the upstream skill and its two Python scripts (`bundle.py`, `render_check.py`) do not
  ship. Do not install or execute them here. The mechanical checks that were measurable moved into
  `template check --browser` (rule `hue-budget`); font embedding uses `fonts query` and the pack's
  `--font-dir`.
- Pack versus method: [template-bank.md](template-bank.md) has the measured `arknights-endfield`
  layouts (cover, key visual, card, banner, UI). Use this guide when the piece is a sheet *about
  something* and the layout comes from the subject, not from a template.

## 1. The document test

Before drawing, answer two questions in one sentence each.

1. Which institution issued this sheet (a real one, or one invented for the subject)?
2. What is the sheet for inside it: an operations terminal, an archive page, an equipment label, an
   inspection report, a requisition list, an annual-report insert?

Every index number, scale, coordinate, barcode and corner mark must be explainable from those two
answers. A mark nobody can explain is deleted. Content comes first (the real data, the real
process, the one striking figure); the institution's calm form carries it.

## 2. The grammar in eight lines

1. One **motif**, a single geometric primitive taken from the subject (or a 45° chamfer when the
   subject gives none). The emblem is built from it; its parts then do jobs: a very large ghost
   shape one step off the ground, a frame, a label-plate end, a bullet, a divider. One primitive per
   institution.
2. A **visible grid**: dot markers, corner squares, registration crosses, rulers.
3. A **calm ground** and **one brand color** in large flat areas. The brand color marks state (the
   selected path, the measured peak, the current tab), and lives inside the hero graphic.
4. **Three depth layers**: blurred light or a desaturated photograph at the bottom, a fine dot screen
   in the middle, razor-sharp hairlines and panels on top.
5. **One intruder** from the subject (liquid, terrain, handwriting, breakage) entering the straight
   line system as the one curve.
6. **Small type.** Wide or condensed sans, tracked, all labels. The title or index number is the
   largest text, at most about three times the label size. No display headline, anchor word or
   ghost type.
7. **Matte, flat light.** Glow only on screen wireframes; never on surfaces.
8. **Restraint.** Large empty fields, detail concentrated in a few dense areas.

The hero graphic is computed from real data or a real formula, in a cartographic or technical
genre that suits the subject (plan, section, transit diagram, spectrum, ground track), never drawn
by eye.

## 3. Dialects

One image speaks one dialect; a series switches dialect only when the issuing institution
changes. A dialect is its ground, type, graphics and texture, not a hue.

| | Field | Terminal | Paper | Wartime |
| --- | --- | --- | --- | --- |
| Sender | Frontier engineering company: signage, requisition forms | Dispatch, monitoring, medical or military screens | Research institute, publication, annual report | Institution at war or in ruins |
| Ground | Near-white with dark panels | Dark navy-black, or ice white | Off-white paper | Light grey with charcoal panels |
| Type | Condensed or wide sans, caps, with mono | Mono and wide sans, caps, small | Heavy grotesque at small sizes | Condensed labels, heavier |
| Graphics | Chamfered panels, hazard stripes where hazard exists, facility layouts | Blueprints, wireframes, leader lines | Diagrams, cropped photographs, colour blocks | Grey imagery cut by brand-colour slashes, routed node maps |
| Texture | Dot matrix, contour fills, grain, frosted panels | Pixel noise, scan lines, lit wireframes | Soft-focus photography, step-and-repeat | Distressed print, ink, cracks (only when the story is damage) |

- The brand color comes from the subject each time: the institution's corporate color, the
  material, or the emotional key. The upstream examples (yellow, cyan, olive, crimson) are examples.
- The same institution in another region keeps dialect and brand color; only the bottom layer's
  material changes (rust and dust, mist and ink-wash mountains, snow and ice).
- A new dialect needs all five rows filled before drawing and must stay industrial sci-fi.

## 4. Color budget by role

The roles are what `hue-budget` measures (see
[template-bank.md](template-bank.md#the-browser-half)). Everything else is judged by eye.

| Role | Use | Area limit |
| --- | --- | --- |
| Brand | The one saturated colour: fills and state | Free |
| Counter | Optional, one per sheet or series, far from the brand hue (deep blue against yellow): index numerals, emphasis words, hairlines | 3% |
| Status (alert, timed) | Small tags on the item whose state they report; never decoration | 1% together |
| Anything else | One tiny dot, or a colour control strip at the page edge | 0.1% per hue |

Imagery is desaturated toward grey. Large neutral areas keep a trace of warm or cool, never dead
grey. A signal yellow on a light ground is a fill, never a text colour.

## 5. Density

Whitespace is what makes the sheet look expensive; when unsure, take the sparser level. Budgets are
for a 1920×1080 sheet; portrait and square sheets go one level sparser because labels are larger.
Count before finishing: every label beyond the budget is deleted, not shrunk.

| | Airy | Standard (default) | Dense |
| --- | --- | --- | --- |
| Hero | One view | One view plus at most one linked aid | Up to three linked views and one detail cluster |
| Annotations on the hero | ≤ 6 | ≤ 12 | As the data needs |
| Text column | Header, document-type bar, one sentence, ≤ 4 fields | Adds mode tags and ≤ 8 fields, or one short list | Adds tables and legends |
| Empty area | At least half | About a third in one or two connected fields | One empty field of a quarter |

## 6. Type size by medium

Short side 1080 px; scale with the canvas. The browser check's `type-size` floor is separate
(12 px for template SVG); a hand-built sheet follows this table.

| Medium | Minimum | Viewed |
| --- | --- | --- |
| Screen | 9 px | Full-screen display, wallpaper, file opened at full size |
| Feed | 14 px | Social feed, phone, thumbnail |
| Slides | 16 px | Projected or shared screen |
| Print | 6 pt at final size | Check at 100% |

Chinese needs 2 px more than the Latin label at the same rank. Ghost shapes, colour control strips
and decorative scale numerals are exempt; mark them `data-deco`.

### Chinese labels on a sheet

These restate the label rules of the source and sit beside [cjk-typography.md](cjk-typography.md),
which governs interface copy.

- Noto Sans SC at 500-700 for labels and 700-900 for the title; Noto Serif SC 900 for at most one
  ceremonial element. Chinese has no case, so rhythm comes from weight and spacing: one weight and
  size per rank.
- Tracking 0.04-0.1 em. A fixed two-to-four-character tag (档案编号, 状态) may be spaced to match the
  Latin label beside it.
- Digits and Latin inside a Chinese label take the mono face, listed first in the stack so Chinese
  falls through to the sans. No full-width punctuation in labels; separate fields with a space,
  `/`, `·` or `—`.
- A bilingual label is two lines, one leading: lead line in ink at label size, second line a size
  smaller in the secondary grey. Decide the leading language once per document.
- One vertical Chinese column per sheet at most, as a side rail like a folder spine; two-digit
  numbers upright (`text-combine-upright`).
- In a reversed bar or beside Latin, Noto Sans SC can sit slightly high; nudge by 0.05-0.08 em after
  looking at the render.

## 7. Output types

- **Information sheet or series.** Frame: institution and department top-left, file and sheet
  number ("02 of 03") top-right, sources in one fine-print line bottom-left (`SRC` or `来源`),
  colour control strip bottom-right, plus a "concept study, not an official publication of …"
  line when a real institution's name appears. Instrument props make it a reading, not an
  illustration: mode tags with the current mode in the brand colour, a live dot with the last
  acquisition time, a fields table. Series share header, footer, palette, type and motif; each
  sheet has its own hero and composition.
- **Archive card.** Four layers: the subject enlarged one step off the ground, the local name (title
  size, heaviest), a reversed information bar (category, index, status), small labels and fine
  print. The subject stays the sharpest thing on the card.
- **Emblem or logo.** Simple geometry on a modular grid, shown as a construction drawing with two
  or three applications.
- **Background plates** come from an image model or the user; the HTML or SVG layers sit on top.
  Out of scope: character illustration and animation.

## 8. Not this

Gloss, bevels, chrome, lens flares; several saturated hues glowing together; hexagon fields,
circuit traces, random HUD rings and fake code; hazard stripes where nothing is hazardous; a large
headline carrying the poster; drop shadows and rainbow gradients; detail spread evenly with no
empty field; colour used for category where it should mark state.

## 9. Originality test

Borrow grammar, never assets. Put the result beside any reference: if someone can point out "this
part corresponds to that part", it is a tracing, so start again. No reference work's composition,
logos, lettering, event names, numbering, mascots, faction marks or invented place names; no work,
studio or publisher name in an image-generation prompt. The form grows from the subject's own
logic (its physics, process, data, history); the system is shared, the hero and motif are the
subject's alone.

## 10. Workflow in this project

1. Research the subject; collect real data, coordinates, years and terms.
2. Write the one-line concept, the institution, its document type and the dialect (§1, §3).
3. Choose the motif, the cartographic genre and the density level (§2, §5).
4. Build the sheet as hand-written HTML or SVG, or start from an `arknights-endfield` template
   when the piece is a cover, key visual, card or banner (`template list --style arknights-endfield`).
   Fonts: `fonts query --text-file copy.txt` before choosing a face for Chinese.
5. Declare the colour roles on the page root (`data-hue-brand`, `data-hue-counter`,
   `data-hue-alert`, `data-hue-timed`) and run `template check <page> --browser`. Fix by the
   findings' `fix` text, then look at the pixels yourself.
6. Go through the checklist below. A passing check is technical conformance only; it grants
   neither visual nor creative acceptance.

### Checklist

- The institution, the document's purpose and the dialect can each be named, and only one dialect
  appears.
- The motif comes from the subject and recurs at several sizes; the hero belongs to this subject
  and passes the originality test.
- One saturated brand colour dominates and marks state; counter and status colours stay inside
  their budgets; imagery is desaturated.
- All three depth layers exist; there is one intruder from the subject.
- No large type; every frame shape traces to the subject or the motif; every industrial mark has a
  nameable function.
- The sheet is inside its density budget and the empty field is empty.
- Text meets the medium's minimum (Chinese +2 px); facts are verified and sourced in the fine print.

## What was not adopted

- The upstream Python scripts and their font fetching from a font host. The pipeline's own check
  and font catalog replace them.
- The four-question intake. The pipeline's guided intake already asks about purpose and use first.
- Any upstream example image, kit stylesheet or template file. Nothing is copied.
