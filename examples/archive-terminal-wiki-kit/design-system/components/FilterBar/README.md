# FilterBar

The filter panel of an index page: a striped ground, a mono code line and a title, tools (name filter, view switch, reset), and rows of toggle chips.

## Provide

The filter groups (label and options), the item set they filter, and the count line.

## Use

Index and list pages.

## States

- Toggle chips are `aria-pressed` buttons; selected `accent` with `on-accent`; hover `panel-hover`; disabled outlined in `rule-strong`.
- Filtering updates the count line (`aria-live`) and shows the empty state when nothing matches; reset returns every group to 全部 and focuses the first chip.
- On phones the label stacks above its chips.

## Don't

- Do not allow two selected chips in a single-choice group.
- Do not filter on page load without showing which filters are on.
