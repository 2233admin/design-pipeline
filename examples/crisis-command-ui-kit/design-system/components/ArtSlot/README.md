# ArtSlot

Art slot: a monitor frame that waits for generated art; in show mode an empty monitor with a crosshair, in slot mode (`?slot=1`) the task id, size and safe area.

## Provide

Task id, names, size, ratio, safe area.

## Use

Every picture position: frames (mecha), operators, feeds.

## States

- Show mode: grid and crosshair, FEED PENDING.
- Slot mode: hatched with a dashed safe box and the task line.

## Don't

- Never draw mecha, weapons or people in code; fill the slot from its task sheet (art-tasks/).
