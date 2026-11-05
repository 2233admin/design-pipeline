---
version: alpha
name: Broadsheet
description: Light editorial house style for magazine covers and explainer cards
colors:
  background: "#F3F4F1"
  surface: "#FFFFFF"
  rule: "#CDD2D0"
  text: "#121417"
  muted: "#565C61"
  primary: "#0B6E4F"
  highlight: "#F2C230"
typography:
  masthead:
    fontFamily: "Noto Serif SC"
    fontSize: 96px
    fontWeight: 900
    lineHeight: 1.05
  headline:
    fontFamily: "Noto Serif SC"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.2
  deck:
    fontFamily: "Noto Serif SC"
    fontSize: 44px
    fontWeight: 400
    lineHeight: 1.3
  lead:
    fontFamily: "Noto Sans SC"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "Noto Sans SC"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.7
  kicker:
    fontFamily: "Noto Sans SC"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
rounded:
  none: 0px
spacing:
  unit: 8px
  edge: 88px
---

# Broadsheet

## Product Context

Broadsheet is a weekly long-read magazine. Covers and explainer cards are shared as images on
social feeds and read on phones, so text must hold at reduced size.

Real brands: none

## Overview

Cool newsprint paper, black ink and one deep green. The page reads like a well-set newspaper:
strong serif headlines, a calm sans-serif body, thin rules between parts. Confidence comes from
scale contrast and whitespace, not ornament.

## Colors

- `background` #F3F4F1 is the paper; `surface` #FFFFFF is only for inset boxes.
- `text` #121417 is the ink for all body and headline text; `muted` #565C61 for bylines, dates and
  captions.
- `primary` green #0B6E4F marks the kicker, one key phrase or a pull quote. `highlight` #F2C230 is a
  marker stroke behind at most one short phrase; never text colour.
- `rule` #CDD2D0 draws 1-2 px rules.
- No cream, terracotta or beige; no gradients. Every colour on the page comes from this list.

## Typography

- Headlines and mastheads use Noto Serif SC; lead, body and kickers use Noto Sans SC.
- Sizes come only from the scale: 96, 64, 44, 32, 28 and 22 px.
- Nothing is smaller than 22 px. Body text is 28 px with 1.7 line height; keep lines between 18 and
  32 Chinese characters.

## Layout

- 8 px unit; 88 px clear from every canvas edge.
- A single column with a strong top: kicker, headline, deck, then body. Thin rules separate parts.

## Elevation & Depth

Flat paper. No shadows, no cards floating over the page.

## Shapes

Square corners everywhere.

## Components

- **Kicker:** Noto Sans SC 22 px bold, `primary`, letter-spaced, above the headline.
- **Rule:** 2 px `rule` line across the text column.
- **Pull quote:** Noto Serif SC 44 px, `primary`, with a 4 px `primary` bar on its left.

## Do's and Don'ts

### Do

- Let the headline dominate; keep one green accent per page.
- Keep every line of text inside the 88 px margin.

### Don't

- Don't use gradients, drop shadows, emoji, stock icons or decorative illustrations.
- Don't use sizes outside the type scale or colours outside the token list.

## Source Decisions

### Adopted

- An original newsprint palette and type scale written for this evaluation.

### Rejected

- Masthead logos, cover art and type treatments of real publications: none are used.
