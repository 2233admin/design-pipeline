# Editable PPTX from HTML: Constraints

Use this when a deck must be delivered as a PowerPoint file whose text stays editable: text boxes, not
flattened pictures. This document covers writing HTML so that a converter can turn each element into a native
PowerPoint object, and the deck rules (titles, type scale, height budget, footer rail) for a deck bound for PowerPoint. It does not include a converter. This repository has no PPTX export script yet; a converter
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

## Deck rules for a PowerPoint deck

The four constraints keep a deck editable; the rules below keep it legible in a room. All sizes are
points on the 960 × 540 pt canvas. They guide the build and the owner's review; none is a gate.

**Plan the story**

- Draft every slide title before any slide exists, all in one form: either short topic labels
  ("Team Structure") or one-clause claims ("Asia leads revenue…"). The titles, read in order, must
  carry the argument by themselves. Show the list in chat and keep building unless the brief was
  ambiguous.
- A title opens its slide rather than delivering the conclusion. Cut dramatic verdicts, staged
  contrasts of the "not this, but that" kind, and invented "turning point" labels.
- Give each slide one idea; split rather than crowd. Before writing prose, decide what each slide
  is: table, diagram, quote, picture, row of cards or single large figure. Vary those kinds; several
  text-only slides in a row get revised.

**Size and space**

| Element | Size |
| --- | --- |
| Eyebrow label | 12–14 pt, upper case, letter-spaced |
| Sentence text | 14–16 pt in a 400–500 pt column |
| Agenda point | 20–24 pt |
| Large figure | 80–100 pt, line height 1 |
| Floor | 12 pt; if text only fits smaller, cut text |

- Use four or five of these sizes for the whole deck. Make every column, pill and legend entry wider
  than its longest word so no word breaks.
- Edge margins are 64 pt, leaving 412 pt of usable height. Sum the blocks before writing: a
  two-line 48 pt heading at 1.1 line height takes roughly 105 pt, each table text line roughly 2.1
  times its font size, each gap 24 pt. Over budget means a smaller table size or a second slide.
  Never fix a text box's height below what its text needs.

**Placement**

- On content slides, the heading sits at one fixed height across the deck so it never jumps between
  slides. Leave the column anchored to the top and distribute the body underneath (space-between, or
  a spacer before the final block). Vertical centring is only for slides with no heading over the
  body: a statement, a quotation, a closing line.
- A content slide whose body stops near the 60% mark looks abandoned; empty space under a lone
  statement is fine.
- Grounds carry meaning: dark for opening and closing, light for content, accent for the single
  statement people should remember. Every slide sets its background explicitly.
- Footer rail: page number, source line or logo form one 12 pt row, 32 pt above the bottom edge, in an
  identical position wherever it appears. On such slides content ends at 460 pt and only
  backdrops enter the band. A converter or a pass over the rendered HTML can measure it: list each
  block that crosses the rail with its slide number and how far it overruns.

**Charts, pictures, notes**

- Bar groups share a floor and a scale: a track of fixed height, bars anchored at its bottom, value
  labels above, category labels below. Only a waterfall lets its middle bars float.
- Words over a picture or diagram are separate text boxes layered over the `<img>`. Text baked into
  an image cannot use the deck fonts and cannot be edited in PowerPoint.
- Speaker notes only on request. With notes, the spoken script moves there in full sentences, and
  slides keep figures, quotations and one-line headlines instead of paragraphs.

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

The deck rules restate, as mechanisms, the slide craft and layout references of claude.ai's Slides
artifact type, as published in `JimLiu/baoyu-design` (`skills/claude-slides/artifact-type/reference/`,
Anthropic material, no licence granted), and the footer-rail audit of `nexu-io/open-design`
(`skills/pptx-html-fidelity-audit`, Apache-2.0), rewritten and converted to the point canvas; see `openspec/changes/distill-claude-design-methods/design.md`. `codeCopied: false`.
