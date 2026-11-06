# Buttons

Buttons: primary `signal` fill, ghost hairline, danger `alarm`, and square icon buttons, in rest, hover, active, focus, disabled and loading.

## Provide

Label (with an optional 16px leading icon), kind, size (40px, 32px `--sm`, 48px `--lg`).

## Use

Primary for the one action of a view (开始下潜, 预约下潜); ghost for the rest; danger only to cut a line.

## States

- Hover: `signal-strong`; ghost to `panel-hover` with `signal-strong` text and edge.
- Active: 1px press.
- Focus-visible: 2px `focus-ring` outline offset 2px.
- Disabled: `panel` fill, `rule-strong` edge, `text-faint` label (no opacity).
- Loading (`aria-busy`): the label hides and a light sweeps along a 2px line.

## Don't

- Do not round corners.
- Do not put two primary buttons side by side.
