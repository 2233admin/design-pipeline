# Badges

Chips, tags, stamps and rarity stars: the small labels that carry state and category.

## Provide

The label text and its kind: accent (new), live, neutral, outline, mono (versions), stamp (entity type); tags; star count 1–6.

## Use

Inline with titles, in cards and table cells.

## States

- `chip--accent` for 最新 / NEW, `chip--live` (danger on `danger-soft`, pulsing dot) for 进行中, `chip--stamp` (`inverse`) for type stamps, `chip--mono` for versions.
- Tags use the `chamfer-sm` cut on `panel-muted`; the warm tag uses `danger-soft`.
- Stars take the rarity colour from the nearest `data-rarity` and carry an `aria-label` with the count.

## Don't

- Do not invent new chip colours per category.
- Do not use a chip as a button; buttons and toggles have their own styles.
