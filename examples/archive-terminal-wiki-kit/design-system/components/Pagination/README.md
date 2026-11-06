# Pagination

Pagination: chamfered number tiles with the current page in accent, previous and next arrows, and a gap marker.

## Provide

Current page, total pages, link targets.

## Use

Under lists, search results and recent changes.

## States

- Current: `accent` with `on-accent`, `aria-current="page"`. Hover `panel-hover`.
- Unavailable previous/next: `aria-disabled`, transparent with `ink-muted`.

## Don't

- Do not show more than seven tiles; use the gap marker.
- Do not drop the arrow labels (they are announced).
