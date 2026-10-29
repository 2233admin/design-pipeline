# Editable PPTX from HTML: Constraints

Use this when a deck must be delivered as a PowerPoint file whose text stays editable: text boxes, not
flattened pictures. This document covers writing HTML so that a converter can turn each element into a native
PowerPoint object. It does not include a converter. This repository has no PPTX export script yet; a converter
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
