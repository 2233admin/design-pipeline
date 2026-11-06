# DataTable

The data table: a `panel-muted` header with sort buttons, hairline rows, right-aligned tabular numbers, item cells with an icon slot, and a rarity bar on the first cell.

## Provide

Columns (which sort, which are numeric), rows, an optional `data-v` sort key per cell and a caption.

## Use

Stat tables, material lists, multiplier tables and the table view of an index.

## States

- Sortable header: a button inside `th`; the sorted column carries `aria-sort` and a turned arrow.
- Row hover `panel-hover`; rarity rows set `data-rarity` and show a 3px bar in that colour.
- Wide tables scroll horizontally inside `at-tablewrap` on phones.

## Don't

- Do not sort by clicking the `th` itself; use the button so it is keyboard reachable.
- Do not centre numbers: right-align them.
