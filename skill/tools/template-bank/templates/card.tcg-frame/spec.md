# card.tcg-frame

Trading card printed as a cyanotype specimen sheet, four rarities by process: paper edge, silver frame, tannin field with copper foil, full deep field on gold foil.

Style: `cyanotype-specimen` (`styles/cyanotype-specimen/style.json`). A trading card face (2.5 x 3.5 in at 300 dpi) in four rarities with --param rarity=common|rare|epic|legend; the specimen goes in the art slot as white lines with alpha, as a cyanotype prints it.

## Where it comes from

Positions from the case's card.css (750 x 1050) for all four rarities; the brushed field (case fields.py, a raster) is redrawn as a jittered polygon with bristle streaks; the foil guilloche as in cards.js.

Samples: card-game/cards/agaric (common), card-game/cards/owl (rare), card-game/cards/rhino (epic), card-game/cards/griffin (legend).

- First pass 10 / 20 / 21 / 15 findings on four cards: the paper and field textures were normal-blended images and counted as collage under text (fixed by multiplying them), and cost, name and type sat on the brushed edge at 1.9:1 (margins 26 to 14 px, text moved onto the solid field); final 0 on all nine cards.
- The legend's griffin head breaking the top edge needs a separate cut-out (the case's griffin-pop.png); this template keeps the art inside the field.

## Relations to keep

- One Prussian blue for every card; rarity is a different process, never a different hue (only epic is toned, with tannin).
- The specimen is a white shadow on the blue field, centred in the field; text stays on the solid part of the field, away from the brushed edge (the edge is where contrast drops).
- Rules on paper below the field; stats bottom left, collector and credit bottom right, 14 px.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `art` | image | - | - |  |
| `cost` | text | 2 | serif | 7 |
| `cost_label` | text | 2 | serif | 墨 |
| `name` | text | 5 | serif | 狮鹫 |
| `latin` | text | 22 | latin | Gryphus unicus |
| `type` | text | 8 | sans | 标本 · 异兽 |
| `rarity_name` | text | 2 | sans | 孤品 |
| `keyword` | text | 4 | sans | 飞行 |
| `rules` | text | 46 | sans | 入匣时：双方场上所有寻常标本洗回牌库。 |
| `flavor` | text | 26 | serif | 匣中唯一一件，没有人见过第二只。 |
| `atk` | text | 2 | serif | 7 |
| `hp` | text | 2 | serif | 6 |
| `stat_label` | text | 5 | sans | 攻 · 韧 |
| `collector` | text | 26 | sans | RAR·180/180 · LEGENDARY |
| `credit` | text | 26 | sans | 原图 作者 · 年代 · 公有领域 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `rarity` | proportion | common / rare / epic / legend | legend | the rarity sets the process: common paper edge, rare silver frame, epic tannin-toned field and copper foil, legend full deep field, gold foil, name on a gold label and the rules on a tilted paper label |
| `field_seed` | rhythm | 1-99 | 7 | seed of the hand-brushed field's edge and streaks |

## Decoration

- Brushed field edge and streaks, flat guilloche foil, silver corner brackets, rarity sigils (circle, lozenge, hexagram, rayed sun), the keyword icon.

Sizes: 750x1050, 1500x2100. A passing check is technical conformance only, not visual acceptance.
