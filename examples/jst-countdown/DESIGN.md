---
name: JST Mission Clock Board
---

# JST Mission Clock Board — Project Design Foundation

Reusable product identity for a mission-control style time board: one physical-feeling display
panel, seen through a fixed camera, showing Japan Standard Time, mission elapsed time, and
Greenwich Mean Time simultaneously.

## Product Context

- Product: a wall-mounted operations time board for a launch/ops room, rebuilt as a web surface.
- Audience: operators who read the board from across a room, at a glance, repeatedly, for hours.
- Primary job: answer "what time is it, in every clock that matters, right now" in under one second.
- Pressure: low light, long dwell time, no interaction. The board is read, never operated.
- Surface: one full-viewport locked frame. No navigation, no menus, no pointer affordances.
- Constraint: no external assets. Fonts must resolve from system stacks; textures are generated.
- Non-goal: dashboards, settings, charts, or any general-purpose data UI.

## Overview

The board is an emissive object, not a page. Everything reads as light emitted by a dark panel:
type is the light source, and the panel is only visible where light lands on it.

Identity rules:

- One material world: warm amber phosphor on near-black. No second hue family.
- The panel is a physical plane held at an angle to the camera. Depth comes from perspective and
  falloff, never from stacked drop-shadow cards.
- Hierarchy is size and luminance only. There are no filled buttons, chips, or surfaces competing
  with the numerals.
- Labels are bilingual by design: Japanese is the primary label, Latin is the gloss beneath it.
- Empty space is the frame. The board must feel cropped by the camera, not laid out to fit.

## Colors

Warm amber phosphor, single hue family, luminance-ranked.

| Token | Value | Role |
| --- | --- | --- |
| `--ink-void` | `#0b0906` | Deepest background, outside the panel |
| `--ink-panel` | `#171208` | Panel body under the emission |
| `--ink-panel-lit` | `#241a0b` | Panel where nearby emission spills |
| `--amber-core` | `#fff8dc` | Numeral core, hottest light |
| `--amber-bright` | `#ffe9a3` | Primary numerals and primary labels |
| `--amber` | `#f0b03c` | Kanji units, badges, secondary values |
| `--amber-dim` | `#c07f24` | Latin glosses, small caps |
| `--amber-faint` | `#7a5218` | Hairline rules, frame strokes |
| `--glow-warm` | `rgba(255, 190, 70, 0.55)` | Bloom halo around emissive type |
| `--glow-cool` | `rgba(255, 240, 190, 0.35)` | Inner core halo |

Contrast posture:

- Primary numerals against panel exceed 12:1. They are the only thing guaranteed readable at
  distance.
- `--amber-dim` glosses are intentionally quiet but must stay at or above 4.5:1 against
  `--ink-panel`.
- `--amber-faint` is used for 1px structure only, never for text.
- Saturation rises with luminance: the brightest light is the least saturated (approaching warm
  white), which is how phosphor actually behaves. Do not invert this.

## Typography

Three roles, no more.

- Numerals (`--font-numeral`): the loudest element on the board. Ultra-heavy, wide, geometric,
  with large open counters so the digits survive bloom. Stack:
  `"Arial Black", "Archivo Black", "Helvetica Neue", Impact, system-ui, sans-serif`.
- Japanese labels (`--font-jp`): bold gothic, tight, boxed. Stack:
  `"Yu Gothic UI", "Yu Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "MS Gothic", sans-serif`.
- Latin glosses and technical values (`--font-tech`): narrow, mechanical, wide-tracked, uppercase.
  Stack: `Bahnschrift, "DIN Alternate", "Roboto Condensed", "Arial Narrow", sans-serif`.

Scale (relative to a `--u` board unit so the whole board scales as one object):

| Step | Size | Use |
| --- | --- | --- |
| `display` | `7.2u` | Live time numerals |
| `value` | `2.25u` | Countdown and GMT values |
| `unit` | `2.4u` | Kanji unit marks 時 / 分 / 秒 |
| `label-jp` | `1.35u` | Boxed Japanese row labels |
| `label` | `0.6u` | Latin section labels |
| `gloss` | `0.5u` | Latin translations under Japanese labels |
| `micro` | `0.85u` | Superscript unit letters |
| `tail` | `1.55u` | Trailing decimal on a value readout |

These are the calibrated ratios. The first authored set (`value 3.1u`, `unit 2.0u`, `label 0.78u`,
`gloss 0.62u`, `micro 0.52u`, no `tail` step) was never rendered; the values above are the ones that
survived four render passes against the reference frame, and they are what the implementation's
`--fs-*` custom properties carry. The step names are the contract; the numbers are tuned
proportions, not measurements, and any change to them is a re-calibration that must be re-rendered.

Note that `unit` sits above `value`: the kanji unit marks are optically smaller than Latin numerals
at the same em size, so matching them numerically would make them read as the smaller element.

Rules:

- Numerals use tabular figures and a fixed advance so the board never reflows while ticking.
- Latin labels are uppercase with `0.14em` tracking. Japanese labels are never tracked.
- Never mix a numeral-role font into a label, or a label font into a numeral.

## Layout & Spacing

- The board is a single plane in a fixed perspective camera. The plane, not the viewport, owns the
  grid. All layout is authored in the plane's own flat space and only then projected.
- Plane grid: three stacked register rows, each split into three columns —
  `label` (boxed bilingual name) / `mark` (badge) / `readout` (value).
- The first register is oversized: it takes roughly half the plane height because the live time is
  the only value read at distance.
- Spacing unit is `--u`; gaps are `0.6u` inside a cell, `1.4u` between columns, `1.1u` between
  registers.
- Rules: `1px` hairlines at `--amber-faint` separate registers and columns. Register one closes
  with a doubled rule. Hairlines are drawn in plane space so perspective bends them correctly.
- The camera crops the plane deliberately: the third register is cut by the bottom edge, and the
  plane bleeds past the left and right edges. The crop is part of the composition, not an overflow
  bug.
- Responsive posture: the board scales as a rigid object via a single `--u` derived from viewport
  size. Below `640px` the camera pulls back (shallower rotation, larger `--u` relative to width)
  rather than reflowing cells into a column stack. The plane never becomes a list.

## Components

- `board-plane`: the projected panel. Owns perspective, roll, vignette, grain, and scanlines.
- `register`: one horizontal row. States: `live` (ticking), `held` (static value), `cropped`
  (intentionally cut by the frame edge).
- `label-block`: boxed Japanese label plus Latin gloss. The box is an open stroke with a leading
  tick, never a filled chip.
- `mark-badge`: notched cartouche holding a 3-4 letter code (`MST`, `GMT`). Fixed width per code
  length so it never resizes when content changes.
- `readout`: numeral group. Sub-parts: `pair` (two digits), `unit-kanji`, `unit-super` (superscript
  Latin letter), `tail` (smaller trailing decimal).
- `emission`: shared glow treatment applied by luminance tier, not per component.

States every component must define: default, ticking, stale (source lost), and reduced-motion.
There are no hover, focus, pressed, or disabled states — the board takes no input.

## Do's And Don'ts

Do:

- Let numerals be the only bright thing. Everything else is structure.
- Keep the perspective as a real projection with a single camera.
- Use fixed-width numeral cells so a `1` and an `8` occupy identical space.
- Keep the crop. The board is a photographed object.
- Generate texture (grain, scanline, bloom) procedurally so the surface stays asset-free.

Don't:

- Don't add a second accent hue for "status". Luminance carries state.
- Don't stack translucent cards or add corner-radius panels to fake depth.
- Don't fake perspective by skewing individual elements independently.
- Don't center the board neatly inside the viewport with symmetric margins.
- Don't let bloom spread far enough to close the digit counters.
- Don't add hover affordances, tooltips, or a settings drawer.

## Source Decisions

Source: one supplied still frame of an amber mission-clock board, treated as `primary-target`.

Adopted from source:

- warm amber monochrome phosphor palette and its luminance ranking;
- fixed perspective plane with the near edge to the right and a slight camera roll;
- three-register structure of label / mark badge / readout;
- bilingual Japanese-primary, Latin-gloss label pattern;
- kanji unit marks between numeral pairs, superscript Latin letters above them;
- deliberate bottom crop of the third register;
- bloom, grain, and shallow depth falloff as surface treatment.

Rejected or not adopted:

- rejected: reproducing the source's exact proprietary numeral typeface. No licensed match is
  available offline; a system ultra-heavy stack substitutes and this is recorded as a fidelity gap.
- rejected: treating the perspective as a static baked image. The board must show live time, so the
  projection is authored as a real transform over live content.
- rejected: any additional hue, chart, or control surface implied by "dashboard" conventions.
- rejected: navigable or orbit camera. The approved output is a locked cinematic frame.
