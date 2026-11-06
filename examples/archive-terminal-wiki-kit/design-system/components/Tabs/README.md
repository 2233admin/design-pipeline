# Tabs

Tabs in two forms: bilingual text tabs with a sliding accent underline, and a segmented picker of small mono tabs for stages.

## Provide

Tab labels (中文 with an ENGLISH `small`), panels, and which tab is selected or disabled.

## Use

Skill panels, view switches (grid / table) and stage pickers.

## States

- Selected: `ink` and a 3px `accent` underline that scales in over `dur-panel`; segmented: `accent` fill with `on-accent`.
- Hover `panel-hover`; focus-visible inset `focus-ring`; disabled stays readable in `ink-muted` with a not-allowed cursor.
- Keyboard: arrows move and select, Home and End jump, only the selected tab is in the tab order.

## Don't

- Do not put more than five text tabs in one row.
- Do not use tabs for navigation between pages.
