# RecentChanges

Recent-change rows: a day header with an accent node, then rows with a mono time, a kind mark (新 new, 编 edit, 微 minor), the page link with history and diff links, the edit summary, the byte delta and the editor.

## Provide

Grouped changes with time, kind, page, summary, signed byte delta and editor.

## Use

The recent changes page and page history.

## States

- Kind marks: new in `inverse`, edit in `accent-soft`, minor in `panel-muted`; each has a title.
- Deltas: additions in `success`, removals in `warn`, both mono; the minus is a real minus sign.
- Filtering by kind hides empty days; on phones the delta and editor wrap under the title.

## Don't

- Do not colour the whole row by kind.
- Do not drop the summary line; it is how people scan the list.
