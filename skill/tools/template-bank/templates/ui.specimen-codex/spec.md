# ui.specimen-codex: Item codex: list rows left, a tilted specimen board centre, details right

> Measured basis. Slot budgets, parameter ranges and palette are authoritative in `manifest.json`; the style pack (`styles/shinbo/style.json`) owns the font roles, grammar, materials, motion grammar and checks.

Canvas 1920x1080 (1920x1080, 2560x1440). Source: Nocturne Corridor codex first pass and final (samples game-codex).

## When to use
Game or site item codex, archive or collection screen.

## Slots
| Slot | Kind (font role) | Budget |
|---|---|---|
| heading | text (title) | <= 5 |
| tab{i} | text (head) | <= 3 |
| count | text (num) | <= 12 |
| row{i}_id | text (num) | <= 5 |
| row{i}_name | text (head) | <= 6 |
| row{i}_state | text (num) | <= 6 |
| specimen | image | collage, drawn when filled |
| plate_name | text (head) | <= 8 |
| plate_id | text (num) | <= 14 |
| name | text (title) | <= 6 |
| name_ja | text (ja) | <= 10 |
| where | text (body) | <= 26, 2 lines |
| body | text (body) | <= 60, 4 lines |
| rarity | text (num) | <= 5 |
| night | text (label) | <= 8 |

## Measured
- first pass: row states 14px red on black (2.3:1) and the id line 22px red: 8 contrast failures; final greys #8A847B or paper
- the codex's sans labels fell back glyph by glyph (Zen Kaku lacks 场 发现 选择 换类), found by the glyph-coverage rule

## Relations vs decoration
- **Relation**: The selected row is a red block; the board is the only tilted element; details share one left line.
- **Decoration**: Board grid, hard red shadow, label plate.
