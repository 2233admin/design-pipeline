# card.episode-number: Episode card: red bar, episode number, bracketed title, Japanese line, Latin credit

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 1280x720, 3840x2160). Source: Nocturne Corridor c02 final (samples c02-white-episode).

## When to use
Opening card of an episode or chapter: number, title in 「」, a second-language line.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| number | text (display) | <= 4 |
| title | text (title) | <= 11 |
| ja | text (ja) | <= 16 |
| en | text (num) | <= 30 |

## Measured
- bar 0.078W x 0.278-0.722H; number 64px; title 150px at 0.407H; Japanese line 46px; credit 22px bottom right

## Relations vs decoration
- **Relation**: Bar, number and title share the left edge zone; the Latin credit goes to the opposite corner.
- **Decoration**: The red bar is the only colour.
