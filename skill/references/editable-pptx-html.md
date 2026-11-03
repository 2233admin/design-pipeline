# Editable PPTX from HTML: Constraints

Use this when a deck must be delivered as a PowerPoint file whose text stays editable: text boxes, not
flattened pictures. This document covers writing HTML so that a converter can turn each element into a native
PowerPoint object, and the deck craft (titles, type scale, height budget, footer rail) any HTML deck follows. It does not include a converter. This repository has no PPTX export script yet; a converter
and its dependency need their own OpenSpec change and a licence check first.

## Choose the path first

| Situation | Path |
| --- | --- |
| The HTML is not written yet, and the deck is built from scratch | Write to the four constraints below; the result is the cleanest to edit |
| The HTML already exists and is visual (flex, centring, bare text, background images, SVG charts) | Use the rendered coordinates of the page instead (see `pptx-from-rendered-html`), with no rewrite |
| The client requires their own PowerPoint template | Only the rendered-coordinate path can inherit a template; the constraint path cannot |

Do not mix the two paths in one project.

## Canvas size

Use 960 × 540 pt (13.333 × 7.5 in), the 16:9 widescreen layout in PowerPoint. This is the default.

```css
body { width: 960pt; height: 540pt; }
```

A 1920 × 1080 px body becomes a non-standard 20 × 11.25 in page; text then looks too small when projected.
Size the body from the template when a client template is in use.

The physical size sets the point scale of the deck; it is not a resolution. Do not enlarge the body to make text
sharper.

## The four constraints

A converter classifies each element as text box, shape, picture or ignored. Each rule below follows from how
PowerPoint stores those objects.

1. **No loose text in a `div`.** Text sits inside `<p>` or `<h1>`–`<h6>`. A `div` provides position and background only.
   Inline `<span>` only styles text inside a `<p>` or heading; it is not a separate text box.
2. **No CSS gradients.** `linear-gradient` and `radial-gradient` count as background images. Use a solid fill, or
   suggest a gradient with several solid flex blocks.
3. **Backgrounds, borders and shadows go on a `div`, never on a text element.** A `<p>`, heading, `<ul>` or `<ol>`
   (and its `<li>`) with a background, border or box shadow fails the check.
4. **No `background-image` on a `div`.** Pictures are `<img>` elements with absolute `src`. Text over a picture
   is two elements placed on top of each other.

## Merge paragraphs into one text box

By default each `<p>` or heading becomes its own text box, so a card with three paragraphs becomes three stacked
boxes. Add `data-pptx-merge="true"` to the container to turn its paragraphs into one editable text box with
paragraph breaks between them.

## Deck craft

The constraints above make a deck editable; these rules make it readable from the back of the room.
Sizes are in points on the 960 × 540 pt canvas (on a 1920 × 1080 px canvas, double them). They are
review guidance: nothing here is a gate, and the owner judges the result.

1. **Titles before slides.** Write the whole title sequence first, in one grammatical style: short
   topic titles ("Market Research") or action titles ("Asia is our largest market…"). Read only the
   titles: they must tell the story on their own. Share that list before building; wait for approval
   only when the request was unclear. A title introduces its slide; it is not the punchline. Drop
   titles that announce a verdict, stage fake tension ("It's not X. It's Y."), or name a "magic
   moment".
2. **One idea per slide.** Several short slides beat one crowded slide. Decide per slide whether the
   content is a table, a diagram, a quote, an image, a card row or a big number before it becomes a
   paragraph. Mix those kinds across the deck; a run of identical text slides is a revision finding.
3. **A small type scale with a floor.** Pick four or five sizes and reuse them: eyebrows 12–14 pt in
   capitals with added tracking, sentences 14–16 pt, agenda points 20–24 pt, big numbers 80–100 pt
   with line height 1. Nothing goes below 12 pt; text that fits only below it is too much text.
   Sentences sit in a column 400–500 pt wide, not across the full width; every column, pill and
   legend item is at least as wide as its longest word.
4. **Margins and a height budget.** Keep 64 pt edge margins, which leaves 412 pt of height. Add the
   blocks up before writing them (a two-line 48 pt heading at line height 1.1 is about 105 pt; a
   table row is about 2.1 × its font size per line of text; a gap is 24 pt). If the sum is over, use
   a smaller table size or split the slide; never give a text box a fixed height smaller than its
   content.
5. **Headings stay put.** Every content slide places its heading at the same height, so it does not
   jump as the viewer flips. Keep the column top-aligned and spread the body below the heading
   (space between, or a spacer above the last block); centre vertically only slides with no heading
   above their body (a statement, a quote, a closing line). A content slide whose body stops at 60%
   of the height looks unfinished; open space below a statement slide is correct.
6. **Backgrounds on purpose.** The dark ground for the opening and closing slides, the light ground
   for content, the accent ground for the one statement the audience must remember. Set each
   slide's background explicitly.
7. **Footer rail.** A footer (page number, source line, logo) is one 12 pt row pinned 32 pt from the
   bottom, in the same place on every slide that has one. On those slides content stops at 460 pt;
   nothing but backdrops crosses into the footer band. A converter or a rendered-HTML pass can
   measure this: report every block whose bottom crosses the rail with its slide and the overrun.
8. **Charts and labels.** Bars stand on one baseline: a fixed-height track, bars aligned to its
   bottom, values above and category labels below, one scale for every group on the slide (a
   waterfall's middle bars are the exception). Labels on a picture or diagram are real text boxes
   placed over the `<img>`, never words drawn inside the image: fonts do not load inside images and
   PowerPoint cannot edit them.
9. **Speaker notes** only when asked. Then the notes carry the script, written as the presenter will
   say it, and the slides lose their paragraphs to figures, quotes and one-line headlines.

## Checks before handing over

- Every text element is inside a `<p>` or heading.
- No gradient, background image or border appears on a text element.
- Every picture is an `<img>` with a resolvable `src`.
- The body size matches the target layout.
- The deck opens in PowerPoint with each text box selectable and editable, and no text sits outside its box.

## What this document does not do

- It does not convert anything. A converter, its runtime and the PptxGenJS dependency are a separate decision.
- It does not check visual quality. The rendered slides still need review against the deck's contract.

## Provenance

The four constraints, the canvas choice and the paragraph-merge rule are adapted from the second reference
project's editable-PPTX reference (see THIRD_PARTY_NOTICES.md, design direction library section). Wording and
structure here are this repository's own. `codeCopied: false`.

The deck craft rules distil the slide craft and layout references of the claude.ai Slides artifact
type, as published in `JimLiu/baoyu-design` (`skills/claude-slides/artifact-type/reference/`,
Anthropic material, no licence granted), and the footer-rail audit of `nexu-io/open-design`
(`skills/pptx-html-fidelity-audit`, Apache-2.0). Mechanisms only, rewritten and converted to the
point canvas; see `openspec/changes/distill-claude-design-methods/design.md`. `codeCopied: false`.
