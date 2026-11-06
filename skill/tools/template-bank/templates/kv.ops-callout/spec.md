# kv.ops-callout

Gunsmith callout screen: a generic weapon silhouette on a pegboard with part callouts (dot, hairline leader, name over kind, L-brackets), title and line top-left.

Style: `milspec-ops` (`styles/milspec-ops/style.json`). A weapon or kit showcase on a site, or the background of an in-game gunsmith. Weapons are generic code-drawn silhouettes.

## Where it comes from

Measured on the reference: title 35 bold at (409, 152), line 16 at y 234, part labels 18 over 14 with corner brackets, pegboard holes on a 72-unit pitch. Borrow grammar, never assets: the reference site is measured privately and nothing from it is shipped; all copy is the case's own original fiction (寂原行动).

Samples: stillfield/arms, stillfield/gunsmith.

- Reference: six callouts with leaders on the firearm screen.
- Case: the same callouts drive the in-game gunsmith (slot nodes instead of labels).

## Relations to keep

- The weapon is centred at (1150, 560) and fills about 1180 x 520, tilted -4 to -10 degrees.
- Each callout: a 4-unit dot on the part, a hairline leader to the label's corner, an 18-unit name over a 14-unit muted kind, L-brackets at the bottom-left and top-right.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `tag` | text | 6 | head | 改枪方案 A |
| `title_cjk` | text | 14 | head | TR-11 战术步枪 |
| `desc` | text | 34 | body | TR-11 使用 7.2 毫米中间威力弹，射速稳定，配件槽位最多。 |
| `part_1` | text | 9 | body | 四倍棱镜瞄准镜 |
| `kind_1` | text | 6 | body | 瞄具 |
| `part_2` | text | 9 | body | 长效制退器 |
| `kind_2` | text | 6 | body | 枪口 |
| `part_3` | text | 9 | body | 可调战术枪托 |
| `kind_3` | text | 6 | body | 枪托 |
| `part_4` | text | 9 | body | 折角前握把 |
| `kind_4` | text | 6 | body | 前握把 |
| `part_5` | text | 9 | body | 橡胶战术握把 |
| `kind_5` | text | 6 | body | 后握把 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tilt` | rhythm | -10--4 | -7 | weapon tilt, degrees |
| `callouts` | decoration | 3-5 | 5 | number of callouts |

## Decoration

- The pegboard, the glow, the weapon silhouette, leaders and brackets: drawn.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
