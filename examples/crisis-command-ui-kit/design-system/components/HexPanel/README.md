# HexPanel

Hexagon panel: an elongated hexagon (55° tips) in a double rule with alarm fill; main, side and lower sizes, and interactive states.

## Provide

Content (stamps, Mincho lines, English, WARNING); size `--main`, `--side`, `--low` or `--h`; tone `--idle` or `--ok`.

## Use

Alarm walls and alarm states of a console; as a button for a gate or seat.

## States

- Hover (button): `alarm-strong`; idle hover: `panel`.
- Focus: the rule turns `focus-ring`.
- Pressed: the body moves 1px.
- Disabled: `panel` with `ink-dim`.

## Don't

- Do not round the tips or change the 55° angle on desktop.
- Do not put long paragraphs in a hexagon.
