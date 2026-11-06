# SegmentDigits

Segment digits: capsule or LCD digits drawn as SVG from `templates/seg.js`, no font.

## Provide

Text (0-9 : . - space), style `capsule` or `lcd`; the size is the font-size.

## Use

Clocks, ratios, section numbers, figures.

## States

- Live clocks redraw through `CCSeg.svg()`.
- The SVG carries the reading as `aria-label`.

## Don't

- Do not set clock digits in a font.
- Do not mix capsule and LCD in one figure.
