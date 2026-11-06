# ui.survey-rail

Left rail, open: the mark, seven nav items every 60 units with the current plate, a tool capsule, the dark go block and the share row.

Style: `frontier-survey` (`styles/frontier-survey/style.json`). The fixed left navigation of a site in this grammar, drawn open (270 wide; it is 90 wide closed). current moves the plate.

## Where it comes from

The case's rail (site/index.html .rail) in its open state; positions from the reference's DOM at 1920. Borrow grammar, never assets: the reference site's screenshots are private and nothing from them is shipped; all copy is the case's own original fiction (远垦导线).

Samples: traverse/rail.

- Reference: rail 90 wide (270 open), items at y 152 + 60 n, current plate 78 x 60 #E6E6E6 with a 9 px #191919 left border, tool capsule 45 x 139 r 22.5 at y 680, go block 54 x 117 r 4 at y 848.
- Case first pass: the open rail's labels measured clean; the closed drawer of the mobile header (a different part) ran off the canvas.

## Relations to keep

- Items every 60 units from y 152; the current plate 252 x 60 (78 closed) with a 9-unit ink bar.
- Tool capsule at y 680, go block at y 848, share row at y 912: the bottom group is fixed, not spaced to fit.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `nav_1` | text | 11 | body | 首页 |
| `nav_2` | text | 11 | body | 队员档案 |
| `nav_3` | text | 11 | body | 世界观 |
| `nav_4` | text | 11 | body | 影像资料 |
| `nav_5` | text | 11 | body | 版本日历 |
| `nav_6` | text | 11 | body | 玩法 & 工段规划 |
| `nav_7` | text | 11 | body | 公告 |
| `tool_1` | text | 6 | body | 账户 |
| `tool_2` | text | 6 | body | 充值中心 |
| `tool_3` | text | 6 | body | 声音:关闭 |
| `go` | text | 6 | body | 前往测绘 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-7 | 1 | current nav item |

## Decoration

- The datum mark, item icons, tool icons, share dots: drawn.

Sizes: 270x1080, 540x2160. A passing check is technical conformance only, not visual acceptance.
