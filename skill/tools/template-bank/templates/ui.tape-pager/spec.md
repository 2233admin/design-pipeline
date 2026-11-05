# ui.tape-pager

Right-edge vertical pager: a black bar, acid to-previous and to-next marks around the current number set sideways, the next number half visible.

Style: `street-tape` (`styles/street-tape/style.json`). The fixed section pager on the right edge of a long page or a game menu. current and next are two-digit numbers.

## Where it comes from

Measured on the board: bar 46 px wide, 263-268 px visible, acid part 150 px; the case's pager is the same. Borrow grammar, never assets: the reference board is private and nothing from it is shipped; all copy is the case's own original fiction (回放街区).

Samples: replay-ward/pager.

- Board: black bar 46 x 263 at the right edge, acid marks and number 28 x 150 px.
- Case: the pager stays readable at 390 wide scaled to 0.75.

## Relations to keep

- Bar 46 units wide, round inner corners (12), bleeding off the right edge.
- Current number acid, sideways, between the two acid marks; the next number white, cut by the bar's bottom.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `current` | text | 2 | num | 02 |
| `next` | text | 2 | num | 03 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |

## Decoration

- The bar-and-chevron marks: drawn.

Sizes: 46x268, 92x536, 138x804. A passing check is technical conformance only, not visual acceptance.
