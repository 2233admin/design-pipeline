# CommandField

Command field: a labelled input with a prompt mark and a hint, in rest, error and disabled states.

## Provide

Label, placeholder, hint.

## Use

Command entry in consoles; any single-line input.

## States

- Hover: `amber-dim` edge.
- Focus: `focus-ring` edge.
- Error: `alert` edge and `alert-ink` hint, `aria-invalid`.
- Disabled: `panel` with `ink-dim`.

## Don't

- Do not use placeholders as labels.
