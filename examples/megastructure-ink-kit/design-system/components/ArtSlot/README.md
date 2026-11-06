# ArtSlot

An art slot. Show mode: a procedural structure plate (walls, beams, cables, screentone; never a figure) or nothing. Slot mode (`?slot=1`): the frame, diagonals, a dashed safe area, size and task id.

## Provide

The slot id from `build/data.cjs` (size, safe area, plate parameters) and an aspect ratio.

## Use

For every picture position; each id has a task sheet in `art-tasks/`.

## States

- Plates redraw on resize at device pixel ratio up to 2.

## Don't

- Do not draw figures, mecha or objects in code.
- Do not ship a slot without a task sheet.
