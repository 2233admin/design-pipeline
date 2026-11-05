# card.vertical-sentence: Vertical sentence card: two or three staggered columns read right to left, a numbered red block

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 1280x720, 3840x2160). Source: Nocturne Corridor c04 first pass and final (samples c04-black-vertical).

## When to use
A line of narration or dialogue as a beat, read top-down; up to three short columns.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| line{i} | text (title) | <= 6 |
| mark_char | text (display) | <= 1 |
| label | text (label) | <= 4 |

## Measured
- first pass: 会看见自己的背影。 in one 118px column from 290px ran 400px past the bottom (off-canvas); final split it into a third column

## Relations vs decoration
- **Relation**: Columns read right to left and each starts lower than the last.
- **Relation**: A sentence longer than the column budget is split into another column, never run off the frame.
- **Decoration**: Numbered red block top left.
