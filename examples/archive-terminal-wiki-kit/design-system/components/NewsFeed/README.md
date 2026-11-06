# NewsFeed

The news feed: a lead item with a 16:9 banner slot beside a dated timeline of chamfered entries, some with a thumbnail slot.

## Provide

Five or so items with date, title, optional `最新` flag and optional thumbnail; the lead item's banner art (or its task id).

## Use

Home page news; any dated list where the newest item deserves a picture.

## States

- Entries: `panel` with the `chamfer` cut, hover `panel-hover` and an underlined title; focus-visible drops the cut.
- Timeline: 1px `rule-strong` spine with 9px `accent` nodes ringed in `paper`.
- Dates are `meta` with tabular numbers in `ink-subtle`; the `最新` flag is an accent chip.
- Lead card lifts 2px on hover. Under 760px the lead and the list stack.

## Don't

- Do not show more than one lead item.
- Do not put long summaries in the list: title and date only.
