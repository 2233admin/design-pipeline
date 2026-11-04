---
version: alpha
name: Foundry Console
description: Dark industrial game-interface house style for covers and product pages of the Foundry studio
colors:
  background: "#0D0F11"
  surface: "#171B1F"
  line: "#2C333A"
  text: "#E8EAEC"
  muted: "#8B949C"
  primary: "#F5A623"
  secondary: "#36C5C0"
  danger: "#E5484D"
typography:
  display:
    fontFamily: "Barlow Condensed"
    fontSize: 112px
    fontWeight: 700
    lineHeight: 1.0
  headline:
    fontFamily: "Barlow Condensed"
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1.1
  title:
    fontFamily: "Noto Sans SC"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.2
  subtitle:
    fontFamily: "Noto Sans SC"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Noto Sans SC"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "JetBrains Mono"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.2
  micro:
    fontFamily: "JetBrains Mono"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.2
rounded:
  none: 0px
  sm: 2px
spacing:
  unit: 8px
  edge: 64px
---

# Foundry Console

## Product Context

Foundry is a small studio that makes a factory-building game and a build-monitoring tool for game
teams. Its covers, patch notes and product pages share one look: a control room at night. Readers
are players and developers who scan quickly on phones and desktop.

Real brands: none

## Overview

A dark, quiet control-room surface with one warm signal colour. Panels are flat and edged with thin
lines, never glassy. Information is labelled like equipment: short uppercase codes in a monospace
face beside Chinese text. The mood is calm competence, not neon spectacle.

## Colors

- `background` #0D0F11 fills the canvas. `surface` #171B1F is for panels; `line` #2C333A draws 1-2 px
  panel edges, rules and grid ticks.
- `text` #E8EAEC is for all primary text; `muted` #8B949C for secondary text and labels.
- `primary` amber #F5A623 is the signal colour: one headline word, one status mark or one call to
  action per surface. `secondary` teal #36C5C0 marks live data and links. `danger` #E5484D only for
  failure states.
- No gradients across the canvas, no glow, no purple or blue neon. Every colour on the surface comes
  from this list.

## Typography

- Latin display text uses Barlow Condensed; Chinese text uses Noto Sans SC; codes, versions and
  timestamps use JetBrains Mono. Fall back to the system sans-serif and monospace.
- Sizes come only from the scale: 112, 72, 48, 32, 24, 20 and 16 px.
- Covers and cards use 20 px or larger for every piece of text. Web pages may use 16 px for
  navigation and legal text only.

## Layout

- 8 px spacing unit; keep 64 px clear from every canvas edge for text.
- Align to a left edge; hierarchy comes from size and the amber signal, not from boxes inside boxes.
- One focal element per surface.

## Elevation & Depth

Flat. Depth comes from `surface` panels on `background` and 1-2 px `line` edges. No shadows, blur or
glass.

## Shapes

Square corners (0-2 px radius). Cut corners or corner ticks are allowed as panel markers.

## Components

- **Panel:** `surface` fill, 1 px `line` edge, 24-32 px inner padding.
- **Status tag:** JetBrains Mono 20 px uppercase, `primary` or `secondary` text on `surface`, 2 px
  radius.
- **Call to action:** `primary` fill, `background` text, 20-24 px label, square corners.

## Do's and Don'ts

### Do

- Use one amber signal per surface and keep everything else in the neutral ramp.
- Keep all text inside the canvas with the 64 px edge margin.

### Don't

- Don't add gradients, glows, glass, emoji or stock icons.
- Don't use sizes outside the type scale or colours outside the token list.

## Source Decisions

### Adopted

- An original control-room palette and type scale written for this evaluation.

### Rejected

- Third-party game assets, logos, screenshots and copied interface art: none are used.
