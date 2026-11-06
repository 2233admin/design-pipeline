# card.ops-select-rail

Selection rail: thumbs on a hairline with square markers, the current frame and marker amber, joined by a short connector.

Style: `milspec-ops` (`styles/milspec-ops/style.json`). The left list of a detail screen (modes, operators, weapons, vehicles) or an in-game picker. 3-6 items.

## Where it comes from

Measured on the reference: line at x 106, markers 9 x 9 at x 102, frames 231 x 111 at x 139 on a 126 pitch, amber #F4CF67 2 px on the current one. Borrow grammar, never assets: the reference site is measured privately and nothing from it is shipped; all copy is the case's own original fiction (寂原行动).

Samples: stillfield/rail.

- Reference: the same rail on four screens (modes, operators, firearms, vehicles), the list masked at the bottom.
- Case: the phone turns the rail into a 4-column grid (a scroller ran off the canvas).

## Relations to keep

- Frames 231 x 111 on a 126 pitch, 41 units right of the hairline; 9-unit square markers centred on the line.
- The current frame has a 2-unit amber border; its marker grows to 17 with an amber core and an amber connector to the frame.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `pic_1` | image | - | - | thumb 223 x 103 |
| `name_1` | text | 8 | head | 全面突击 |
| `pic_2` | image | - | - | thumb 223 x 103 |
| `name_2` | text | 8 | head | 寂原撤离 |
| `pic_3` | image | - | - | thumb 223 x 103 |
| `name_3` | text | 8 | head | 断桥协议 |
| `pic_4` | image | - | - | thumb 223 x 103 |
| `name_4` | text | 8 | head | 灰隼 |
| `pic_5` | image | - | - | thumb 223 x 103 |
| `name_5` | text | 8 | head | 锚点 |
| `pic_6` | image | - | - | thumb 223 x 103 |
| `name_6` | text | 8 | head | 白噪 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `items` | decoration | 3-6 | 6 | number of items |
| `current` | decoration | 1-6 | 1 | the selected item |

## Decoration

- The hairline, markers, connector and the dark band under each name: drawn.

Sizes: 320x900, 480x1350, 640x1800. A passing check is technical conformance only, not visual acceptance.
