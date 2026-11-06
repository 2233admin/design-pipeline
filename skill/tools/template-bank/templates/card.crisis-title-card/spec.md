# card.crisis-title-card

Episode title card: the number line at half size, the title in heavy Mincho broken into an L (one glyph, then the rest after a half-pitch comma) on black, paper or the red card.

Style: `crisis-command` (`styles/crisis-command/style.json`). Chapter, episode or section openers; the cut-in card of a film or a deck.

## Where it comes from

glyph ink boxes on the 2048 x 1536 broadcast card (number 240 x 237, title 483 x 474, comma 154 wide, lines at 405 and 930), composition share and weight centre. Borrow grammar, never assets. The frames of the reference are private and nothing from them is shipped; all copy is the case's own original fiction (潮位警报 TIDEMARK).

Samples: tidemark/crisis-title-card.

- Reference: dark 79%, type 19%, weight centre (0.38, 0.60).
- Case: 第壹报 水 / 位、越线 at 0 findings.

## Relations to keep

- Left margin 6.5% of H, number ink top 6.4% of H; number ink 15.4% of H, title ink 31% of H (2:1).
- Line one ink top at 26.4% of H, line two at 60.5% of H; the comma advances half a glyph.
- The type block weighs to the lower left; the right tenth of the card stays empty.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `number` | text | 5 | head | 第壹报 |
| `head_1` | text | 3 | head | 水 |
| `head_2` | text | 3 | head | 位 |
| `head_3` | text | 4 | head | 越线 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `ground` | decoration | black / paper / red | black | black: white on black; paper: black on #F0F2F0; red: red-orange on #140202 |
| `number` | proportion | row / column | row | row: the number over the title at half its size; column: set vertically down the left edge |
| `compress` | proportion | 0.65-1 | 1 | horizontal compression of the title lines (a line wider than the card is compressed further, never under 0.65) |
| `scale` | rhythm | 0.9-1 | 1 | title size against the measured 31% of the card height |

## Decoration

- Nothing: a title card carries no decoration.

Sizes: 1440x1080, 960x720, 2048x1536. A passing check is technical conformance only, not visual acceptance.
