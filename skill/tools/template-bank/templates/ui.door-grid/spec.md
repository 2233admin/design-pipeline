# ui.door-grid: Chapter list: black top bar, vertical heading, a 6x2 grid of door cards

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 2560x1440). Source: Nocturne Corridor nights page first pass and final (samples web-nights).

## When to use
Episode, chapter or level list on a site or in a game; each card a number, an episode mark, a door, a title and a second-language line.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| logo | text (display) | <= 5 |
| menu{i} | text (head) | <= 4 |
| heading | text (display) | <= 3 |
| reading | text (ruby) | <= 6 |
| intro | text (body) | <= 18, 3 lines |
| episodes | text (num) | <= 16 |
| card{i}_num | text (num) | <= 2 |
| card{i}_ep | text (display) | <= 4 |
| card{i}_title | text (head) | <= 10, 2 lines |
| card{i}_ja | text (ja) | <= 10 |
| badge | text (num) | <= 4 |

## Measured
- first pass: the reading じゅうにや 22px red on paper measured 4.48:1 (below 4.5); final 24px (large text)
- cards 236x410 with 20px gaps from x 330, y 150

## Relations vs decoration
- **Relation**: Navigation is a black bar with a red block on the active item; hover (in HTML) is an inverted block with a hard shadow.
- **Decoration**: Cut-paper door on each card; screentone band at the foot.
