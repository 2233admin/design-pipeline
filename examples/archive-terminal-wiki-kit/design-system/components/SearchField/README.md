# SearchField

The search field with its keyboard hints, live suggestions, and the large search-page variant with a labelled accent button.

## Provide

The form action, a placeholder, the suggestion source, and on the search page the current query.

## Use

Top bar (compact) and the search page (large).

## States

- Rest: `control-edge` border, `/` and `⌘K` kbd caps. Focus-within: border `accent-strong` and a 2px `wash` glow.
- Suggestions: a listbox under the field on `panel` with `shadow-menu`; the active option is `accent-soft` with `ink`; arrows move, Enter opens, Escape closes.
- `/` or Ctrl/⌘ + K focuses the top-bar field from anywhere except another text field.

## Don't

- Do not hide the field's label: it is visually hidden, not removed.
- Do not open suggestions before the first character.
