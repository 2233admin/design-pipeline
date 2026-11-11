---
version: alpha
name: Broadsheet App
description: Light editorial house style of the Broadsheet magazine, with the type scale and spacing of its account and editing screens
colors:
  background: "#F3F4F1"
  surface: "#FFFFFF"
  rule: "#CDD2D0"
  text: "#121417"
  muted: "#565C61"
  primary: "#0B6E4F"
  highlight: "#F2C230"
  danger: "#B42318"
typography:
  page:
    fontFamily: "Noto Serif SC"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.2
  section:
    fontFamily: "Noto Serif SC"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.3
  subsection:
    fontFamily: "Noto Sans SC"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans SC"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans SC"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  note:
    fontFamily: "Noto Sans SC"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
spacing:
  unit: 4px
  edge: 32px
---

# Broadsheet App

## Product Context

Broadsheet is a weekly long-read magazine. This is the look of its reader account and settings
screens, used on desktop by subscribers and by the small editorial team. It shares the paper and
ink of the magazine's covers and uses a smaller type scale made for forms.

Real brands: none

## Overview

Cool newsprint paper, black ink and one deep green. Settings read like a well-set page: a serif
page title, sans-serif labels and help text, thin rules between sections. Confidence comes from
alignment and whitespace, not from boxes and ornament.

## Colors

- `background` #F3F4F1 is the paper; `surface` #FFFFFF is for inputs and the one raised bar that
  holds the save action.
- `text` #121417 is the ink for titles, labels and values; `muted` #565C61 for help text and
  secondary values.
- `primary` green #0B6E4F is the main action and the switched-on state. `highlight` #F2C230 is a
  marker stroke behind at most one short phrase; never text colour.
- `danger` #B42318 is only for error text, the border of a field in error and destructive actions.
- `rule` #CDD2D0 draws 1 px rules and input borders.
- A state is never carried by colour alone: errors have a message, switches have a label.
- No cream, terracotta or beige; no gradients. Every colour on the page comes from this list.

## Typography

- The page title and section titles use Noto Serif SC; everything else uses Noto Sans SC. Fall back
  to the system serif and sans-serif.
- Sizes come only from the scale: 40, 28, 20, 16, 14 and 13 px.
- 40 px is for the page title only. Field values and body text are 16 px; labels 14 px; help and
  error text 13 px. Nothing is smaller than 13 px.

## Layout

- 4 px spacing unit; 32 px clear from the window edges.
- A narrow section list on the left, one form column on the right no wider than 640 px. Labels sit
  above their fields and share one left edge.
- One main action per screen.

## Elevation & Depth

Flat paper. No shadows; the save bar is separated by a 1 px `rule` line, not by a shadow.

## Shapes

Square corners everywhere.

## Components

- **Field:** label above, `surface` input 40 px tall with a 1 px `rule` border, help text below.
- **Field in error:** 1 px `danger` border and a `danger` message below that says how to fix it.
- **Button:** at least 36 px tall. Main action: `primary` fill with `surface` text. Other actions:
  `surface` fill with a 1 px `rule` border. Destructive: `danger` text with a 1 px `danger` border.
- **Rule:** 1 px `rule` line between sections.

## Do's and Don'ts

### Do

- Let the page title lead; keep one green main action per screen.
- Put every error next to its field with the way to fix it.

### Don't

- Don't use gradients, drop shadows, emoji, stock icons or decorative illustrations.
- Don't use sizes outside the type scale or colours outside the token list.

## Source Decisions

### Adopted

- The Broadsheet paper and ink, with an original product type scale written for this evaluation.

### Rejected

- Interface art, logos and type treatments of real publications and products: none are used.
