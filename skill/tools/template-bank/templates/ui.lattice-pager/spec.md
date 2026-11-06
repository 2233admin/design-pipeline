# ui.lattice-pager

Right-rail pager: a giant wide numeral cut to its top 55%, the '// 02 / 05' line on a ground plate, the screen name in wide caps.

Style: `lattice-dossier` (`styles/lattice-dossier/style.json`). The fixed screen pager in the right rail of a paged site or a game menu. current and total are two-digit numbers.

## Where it comes from

computed style of the reference pager: numeral 86.4 px with a 47.52 px line box, '// 02 / 05' 18 px, name 18 px at 1.8 px tracking. Borrow grammar, never assets: the captures of the reference site are private and nothing from them is shipped; all copy is the case's own original fiction (雾航信标).

Samples: fogwake/pager.

- Reference: right edge x 1882, numeral top y 480 on inner screens, y 398 on the first.
- Case: the plate keeps the small line at 4.5:1 over the numeral.

## Relations to keep

- Numeral 86.4 units in a 47.5-unit window, right edge 38 units in.
- The small line sits 13 units below the numeral's top, over its right half, on a ground plate.
- Screen name 16-18 units, 10% tracking, right-aligned under the window.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `current` | text | 2 | mono | 02 |
| `total` | text | 2 | mono | 05 |
| `numeral` | text | 2 | wide | 02 |
| `section` | text | 12 | wide | PILOTS |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |

## Decoration

- The rail hairline and the numeral: drawn.

Sizes: 236x120, 354x180. A passing check is technical conformance only, not visual acceptance.
