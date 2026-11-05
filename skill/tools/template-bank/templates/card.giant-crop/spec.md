# card.giant-crop: Crop card: a two-character word set so large the frame shows only part of it, one small label on a plate

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 1280x720, 3840x2160). Source: Nocturne Corridor c07 final (samples c07-black-crop).

## When to use
A title word as texture: legible as shape, readable from the label.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| word | text (display) | <= 2, bleeds |
| label | text (display) | <= 3 |

## Measured
- 回廊 1500px from x -260, top -300; label 34px on a 330x80 plate at 1500,900; the em-box check reported an overlap, the ink check (plate above the word) does not

## Relations vs decoration
- **Relation**: The label sits on a plate of the ground colour so the word never runs under it.
- **Decoration**: Red word on black (large text, 3.5:1).
