# CategoryTiles

The category tile grid: chamfered tiles with an icon on a striped diamond plate, a 中文 name and an ENGLISH caption.

## Provide

Each category's icon, `zh`, `en`, link, and optionally a live flag.

## Use

Home page entry points and any index of categories.

## States

- Rest: `panel`, `plate-bg` horizontal stripes in a 45° diamond, icon in `accent-ink`.
- Hover: ground to `panel-muted`, the signal strip wipes across the top edge (`dur-wipe`), an `accent` wash rises from the bottom, the diamond fills `accent` and the icon turns `on-accent`.
- Live flag: a 7px `danger` diamond at the top-right.
- Long English captions truncate with an ellipsis; on phones the grid is two columns.

## Don't

- Do not use photos in tiles.
- Do not mix tiles with and without English captions.
