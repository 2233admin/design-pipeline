# ModeRow

Mode row: equal cells (one lit) as a radio group, and a danger cell that fills red in the danger state.

## Provide

Four modes; the current one; disabled ones.

## Use

Pump, power or speed modes; any one-of-four setting.

## States

- Hover: `amber-wash`.
- Checked: `amber` with `on-amber`.
- Pressed: `amber-strong`, 1px down.
- Focus: 2px `focus-ring`.
- Disabled: `rule-strong` edge, `ink-dim`.
- Danger (`.is-danger` above it): the danger cell fills and its border blinks.
- Arrow keys move the selection.

## Don't

- Do not light two cells.
- Do not put icons in the cells.
