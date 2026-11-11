---
version: alpha
name: Foundry App
description: Dark control-room house style of the Foundry studio, with the type scale and spacing of its product screens
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
  page:
    fontFamily: "Noto Sans SC"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.25
  section:
    fontFamily: "Noto Sans SC"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
  subsection:
    fontFamily: "Noto Sans SC"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans SC"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Noto Sans SC"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: "JetBrains Mono"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  none: 0px
  sm: 2px
spacing:
  unit: 4px
  edge: 24px
---

# Foundry App

## Product Context

Foundry is a small studio that makes a factory-building game and a build-monitoring tool for game
teams. This is the look of the tool itself: the screens a build engineer keeps open all day on a
desktop monitor. It shares the control-room palette of the studio's covers and uses a smaller type
scale made for dense lists and forms.

Real brands: none

## Overview

A dark, quiet control-room surface with one warm signal colour. Panels are flat and edged with thin
lines, never glassy. Rows are dense and aligned; codes, versions and timestamps sit in a monospace
face beside Chinese text. The screen should read at a glance and stay calm after eight hours.

## Colors

- `background` #0D0F11 fills the window. `surface` #171B1F is for panels, rows under the pointer and
  inputs; `line` #2C333A draws 1 px panel edges, row rules and input borders.
- `text` #E8EAEC is for all primary text; `muted` #8B949C for secondary text, column heads and
  timestamps.
- `primary` amber #F5A623 is the signal colour: the one main action on a screen and the running
  state. `secondary` teal #36C5C0 marks success, live data and links. `danger` #E5484D only for
  failure states and destructive actions.
- A state is never carried by colour alone: every status has a text label.
- No gradients, no glow, no purple or blue neon. Every colour on the screen comes from this list.

## Typography

- Chinese and Latin interface text use Noto Sans SC; codes, versions, durations and timestamps use
  JetBrains Mono. Fall back to the system sans-serif and monospace.
- Sizes come only from the scale: 32, 24, 20, 16, 14 and 13 px.
- 32 px is for the page title only. Body and row text are 16 px; labels and column heads 14 px;
  codes 13 px. Nothing is smaller than 13 px.

## Layout

- 4 px spacing unit; 24 px clear from the window edges.
- A fixed navigation column on the left, the working area in the middle, an optional detail panel
  on the right. Rows share one left edge per column.
- One main action per screen.

## Elevation & Depth

Flat. Depth comes from `surface` panels on `background` and 1 px `line` edges. No shadows, blur or
glass.

## Shapes

Square corners (0-2 px radius).

## Components

- **Row:** 44-48 px tall, 1 px `line` rule below, text on one baseline.
- **Status label:** JetBrains Mono 13 px with a text label; `secondary` for success, `primary` for
  running, `danger` for failed.
- **Button:** at least 32 px tall. Main action: `primary` fill with `background` text. Other
  actions: `surface` fill with a 1 px `line` border and `text` label.
- **Empty panel:** says what belongs here in one sentence and offers one next action.

## Do's and Don'ts

### Do

- Keep one amber main action per screen and everything else in the neutral ramp.
- Give every status a text label next to its colour.

### Don't

- Don't add gradients, glows, glass, emoji or stock icons.
- Don't use sizes outside the type scale or colours outside the token list.

## Source Decisions

### Adopted

- The Foundry Console palette, with an original product type scale written for this evaluation.

### Rejected

- Third-party product screenshots, logos and copied interface art: none are used.
