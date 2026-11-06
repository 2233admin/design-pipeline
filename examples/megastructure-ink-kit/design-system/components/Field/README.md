# Field

A text field: label plate above, data face inside, a `line` underline, hint below.

## Provide

Id, label, caps line, value, placeholder, state, hint.

## Use

For call signs and keys.

## States

- Hover: `line` edge.
- Focus-visible: 2px `focus-ring` outline.
- Invalid: `alarm` edge and hint, `aria-invalid`.
- Disabled: `panel` fill, `text-faint` value.

## Don't

- Do not put CJK into a data-face field without switching its font.
