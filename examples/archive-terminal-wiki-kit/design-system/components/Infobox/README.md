# Infobox

Two infobox forms: the entity hero panel (portrait slot on a grid ground, stamp, stars, display name, codename, key–value grid and a short bio) and the compact item infobox (icon slot, name with rarity chip, labelled rows).

## Provide

For entities: portrait art or task id, rarity, name, codename, 4–8 key–value pairs and one paragraph. For items: icon, name, rarity, type and the rows.

## Use

Top of an entity or item page, once.

## States

- The entity panel floats on `shadow-panel`; a `--rarity` coloured bar marks its top-left edge.
- Keys are 12px `ink-muted`, values 14px bold; a wide row spans both columns.
- Under 1024px the art stacks above the info at 3:4; under 760px the key–value grid stays two columns with tighter gaps.

## Don't

- Do not put more than eight pairs in the grid; move the rest into a table section.
- Do not draw the portrait over the info column.
