# ui.ops-dock

Bottom dock: a 52-unit bar of six items with a raised five-sided CTA plate in the middle, the current item underlined in green over a dot field.

Style: `milspec-ops` (`styles/milspec-ops/style.json`). The fixed bottom navigation of a full-screen-per-topic game site or a game lobby. Six destinations, one two-line call to action.

## Where it comes from

Measured on the reference: dock 52 high, items 147 x 93, CTA 165 x 110 at x 878; the case keeps them. Borrow grammar, never assets: the reference site is measured privately and nothing from it is shipped; all copy is the case's own original fiction (寂原行动).

Samples: stillfield/dock.

- Reference: items at x 391, 537, 684 | 1090, 1236, 1383; label 15.75 px #8E8E8E, the current one a dot-grid glow and a 2 px green line.
- Case: our plate is five-sided (not the reference's triangle), with a light sweeping down every 1.5 s.

## Relations to keep

- Bar 52 units high; items 147 wide from x 391 (three left, three right of the plate).
- The plate is 165 x 110, centred, its shoulders at 34% of its height; the CTA is two lines of two characters in green on the deep green plate.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `nav_1` | text | 4 | head | 首页 |
| `nav_2` | text | 4 | head | 新闻 |
| `nav_3` | text | 4 | head | 模式 |
| `nav_4` | text | 4 | head | 干员 |
| `nav_5` | text | 4 | head | 武器 |
| `nav_6` | text | 4 | head | 载具 |
| `cta_1` | text | 2 | head | 立即 |
| `cta_2` | text | 2 | head | 下载 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-6 | 1 | the current item (1-6) |
| `glow` | decoration | true / false | true | the green dot field over the current item |

## Decoration

- The dot field, the underline, the plate outline and the chevron: drawn.

Sizes: 1920x110, 2880x165, 3840x220. A passing check is technical conformance only, not visual acceptance.
