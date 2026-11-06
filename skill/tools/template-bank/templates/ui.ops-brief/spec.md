# ui.ops-brief

Detail column: a title, a green name line, ruled rows each with an icon, a 23-unit sub-head and 16-unit body; the first row red for the role.

Style: `milspec-ops` (`styles/milspec-ops/style.json`). The right column of a detail screen (mode, operator, vehicle) or an in-game info panel.

## Where it comes from

Measured on the reference: column at x 1333, 500 wide; title 35 bold, name 16 green, sub 23 bold, body 16 / 24, rules 1 px at 50% white, icons 50-60. Borrow grammar, never assets: the reference site is measured privately and nothing from it is shipped; all copy is the case's own original fiction (寂原行动).

Samples: stillfield/operators, stillfield/modes.

- Reference: the same column on the modes, operators and vehicles screens.
- Case: the vehicle screen adds a spec plate under it.

## Relations to keep

- Column 500 wide; title 36 bold, name line 16 green, a 1-unit rule at 104.
- Rows 112 high, ruled; sub-head 23 bold (the role row red, the others green), body 16 on a 24 line; icons 40-48 in a 60-unit column.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title` | text | 6 | head | 灰隼 |
| `name` | text | 14 | body | 姓名：沈砚舟 |
| `sub_1` | text | 10 | head | 定位：突击 |
| `body_1` | text | 40 | body | 突击干员拥有更快的冲刺与换弹速度，可携带破片榴弹与震撼弹。 |
| `sub_2` | text | 12 | head | 战术装备 - 推进护腿 |
| `body_2` | text | 40 | body | 短时间内大幅提升冲刺速度，冲刺中开镜不受减速影响。 |
| `sub_3` | text | 12 | head | 战术道具 - 破门炸药 |
| `body_3` | text | 40 | body | 贴附在门与薄墙上远程起爆，炸开一条新的进攻路线。 |
| `sub_4` | text | 12 | head | 干员特长 - 疾行换弹 |
| `body_4` | text | 40 | body | 移动中换弹速度提升，不会打断冲刺。 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `rows` | decoration | 2-4 | 4 | number of rows |
| `icons` | decoration | true / false | true | row icons in a 60-unit column |

## Decoration

- Rules and icons: drawn.

Sizes: 500x640, 750x960, 1000x1280. A passing check is technical conformance only, not visual acceptance.
