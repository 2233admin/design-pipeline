# Gauge

A segmented gauge: square cells lit in `line` up to the value, horizontal or vertical.

## Provide

Label, caps line, value 0–1, the printed value, cell count, state.

## Use

For pressure, hull, oxygen, descent rate on HUD screens.

## States

- Alarm: lit cells and the value in `alarm`.
- It is a `meter` with `aria-valuenow`.

## Don't

- Do not animate the cells continuously.
