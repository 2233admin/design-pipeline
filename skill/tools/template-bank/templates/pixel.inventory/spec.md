# pixel.inventory

Pixel inventory: tabbed paper panels on a dithered Prussian-blue ground, a 6 x 5 slot grid with rarity by frame colour and gem count, a detail panel and actions.

Style: `woodblock-pixel` (`styles/woodblock-pixel/style.json`). An RPG inventory screen on the 480 x 270 grid: tabs, a slot grid (filled, empty and locked slots), the selected item's detail, three actions and a load / gold footer.

## Where it comes from

Ported from the case's screens.cjs inventory: grid origin 18,50, pitch 26, the case's seventeen items as placeholders; counts, tabs and selection became parameters.

Samples: pixel-rpg-ui/4-inventory.

- Round 2 first pass: two green effect lines on paper 2.2:1; final 0 (pine green on paper).
- Text all 12 px or 24 px native, checked at the native 480 x 270 (12 px counts as body text: 4.5:1).

## Relations to keep

- Rarity never by colour alone: frame colour plus 0-4 gem pips (common, fine, rare, epic, legendary).
- Every panel is paper with its dark-red plate 2 px down-right; the selected tab and action are pale with vermilion lines.
- Counts are 3 x 5 bitmap digits outlined in ink inside the slot; gold only on graphics, never as text on paper (1.6:1).

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `tab_{i}` | text | 2 | pixel | 全部 / 消耗 / 信件 / 材料 / 贵重 |
| `tab_hint` | text | 10 | pixel | Q / E 切换 |
| `item_name` | text | 8 | title | 潮汐罗盘 |
| `item_rarity` | text | 2 | pixel | 史诗 |
| `item_type` | text | 10 | pixel | 贵重品 · 不可出售 |
| `desc_{i}` | text | 22 | pixel | 旧船上拆下来的罗盘，指针不指北， / 总是指向离你最近的一盏灯。 |
| `effect_{i}` | text | 9 | pixel | 夜间视野 ＋2 / 雾中不会迷路 |
| `flavor` | text | 22 | pixel | 「灯在哪，路就在哪。」 |
| `button_{i}` | text | 4 | pixel | 装备 / 查看 / 丢弃 |
| `button_note` | text | 10 | pixel | 贵重品不能丢 |
| `capacity` | text | 13 | pixel | 背包 17 / 24 格 |
| `load_label` | text | 2 | pixel | 负重 |
| `load_value` | text | 6 | pixel | 18/30 |
| `gold` | text | 7 | pixel | 1,284 |
| `key_hint` | text | 12 | pixel | Z 装备  X 返回 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tab` | decoration | 0-4 | 0 | active tab |
| `selected` | decoration | 0-16 | 2 | selected slot (shown in the detail panel) |
| `filled` | decoration | 0-17 | 17 | slots holding the placeholder items |
| `capacity` | decoration | 18-30 | 24 | usable slots; the rest are locked |
| `load` | decoration | 0-30 | 18 | carried weight on the load bar (of 30) |

## Decoration

- Dithered ground, slot frames and gems, item icons (the case's sixteen drawn 16 x 16 icons as placeholders), locks, the load bar, coin.

Sizes: 1920x1080, 960x540, 480x270. A passing check is technical conformance only, not visual acceptance.
