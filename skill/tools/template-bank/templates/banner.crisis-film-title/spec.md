# banner.crisis-film-title

Film title line: one centred line of heavy Mincho compressed to 0.40, a colon and a mark, an optional compressed English caption, on black.

Style: `crisis-command` (`styles/crisis-command/style.json`). Film, season or campaign title frames; the opening and closing card of a trailer.

## Where it comes from

per-glyph ink boxes on three film title cards (1920 x 1080, 1400 x 788, 1920 x 816): 新 劇 場 版 at 0.35 in all three, height 20-39% of the frame, centred (margins 148 / 143). Borrow grammar, never assets. The frames of the reference are private and nothing from them is shipped; all copy is the case's own original fiction (潮位警报 TIDEMARK).

Samples: tidemark/crisis-film-title.

- Reference: dark 91-97%, red 3-9%.
- Case: 潮位警报东缘闸：封 at 0 findings.

## Relations to keep

- One line centred, its vertical centre at 0.48 of the height.
- Ideographs at 0.35-0.40 of their width; the colon 0.4 em; the mark 12% wider than the title.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title` | text | 9 | head | 潮位警报东缘闸 |
| `mark` | text | 2 | head | 封 |
| `caption` | text | 36 | grot | TIDEMARK EAST GATE SEALED |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `compress` | proportion | 0.3-0.5 | 0.4 | the measured film step is 0.35; 0.40 keeps the open face's horizontals |
| `height` | proportion | 0.2-0.39 | 0.29 | title ink height as a share of the frame (measured 0.20-0.39) |
| `ink` | decoration | alert / deep / ink | alert | one colour per title |
| `caption` | decoration | true / false | true | the compressed English line under the title |

## Decoration

- Nothing but the type.

Sizes: 1920x816, 960x408. A passing check is technical conformance only, not visual acceptance.
