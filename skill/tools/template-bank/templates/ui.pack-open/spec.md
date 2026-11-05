# ui.pack-open

Pack opening on a blue table: the torn pack at left, five cards fanned, revealed ones as cyanotype miniatures and the rest face-down with a gold edge for a legend.

Style: `cyanotype-specimen` (`styles/cyanotype-specimen/style.json`). The pack-opening screen of a card game: a pack of five, revealed and face-down cards, a hover tip, a new-card badge and the open-all / again / store buttons.

## Where it comes from

Positions from the case's pack.html static state (fan offsets, scale 0.36, pack at 196, 600 rotated -6 degrees, buttons centred at the bottom).

Samples: card-game/pack-opening-screen.

- First pass 76 findings (mostly textures counted as collage under text); final 0; the motion keyframe at 3.5 s keeps 1 explained finding (a card mid-flip).

## Relations to keep

- Five cards in a fan (-8 to +8 degrees), the middle one raised; a face-down legend tells itself by a gold edge.
- Only the primary button is gold; the disabled one is hatched with its reason beside the label.
- Miniatures keep cost, name, rarity and stats only; their rules would be under 12 px.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title` | text | 6 | serif | 开启卡包 |
| `subtitle` | text | 30 | sans | 第一辑「初开之匣」 · 每包 5 张 · 至少 1 张珍稀 |
| `wallet_{i}` | text | 9 | sans | 墨锭 1,240 / 卡包 × 3 |
| `pack_name` | text | 5 | serif | 初开之匣 |
| `pack_meta` | text | 20 | sans | RARIUM · 第一辑 · 5 张 |
| `pack_seal` | text | 1 | serif | 藏 |
| `card_{i}_cost` | text | 2 | serif | 1 / 3 / 1 / 6 / 7 |
| `card_{i}_name` | text | 4 | serif | 毒蝇伞 / 角鸮 / 灰翅蛾 / 铁甲犀 / 狮鹫 |
| `card_{i}_atk` | text | 2 | serif | 1 / 2 / 2 / 6 / 7 |
| `card_{i}_hp` | text | 2 | serif | 2 / 3 / 1 / 7 / 6 |
| `card_{i}_rarity_name` | text | 2 | sans | 寻常 / 珍稀 / 寻常 / 奇异 / 孤品 |
| `new_badge` | text | 1 | serif | 新 |
| `new_badge_sub` | text | 2 | sans | 收录 |
| `back_word` | text | 8 | latin | RARIUM |
| `tip` | text | 6 | sans | 点击翻开 |
| `progress` | text | 10 | sans | 已翻开 3 / 5 |
| `progress_hint` | text | 12 | sans | 悬停预览 · 点击翻开 |
| `pity` | text | 10 | sans | 距保底孤品 23 包 |
| `pity_hint` | text | 13 | sans | 金边背面 = 本包含孤品 |
| `button_open_all` | text | 4 | sans | 全部翻开 |
| `button_again` | text | 4 | sans | 再开一包 |
| `button_again_count` | text | 4 | sans | × 2 |
| `button_store` | text | 4 | sans | 收入匣中 |
| `button_store_note` | text | 8 | sans | 翻开全部后可用 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `revealed` | decoration | 0-5 | 3 | cards turned (order: 1st, 2nd, 4th, 3rd, 5th; the 3rd is the hovered one) |
| `new_card` | decoration | -1-4 | 1 | card that carries the new badge (-1: none) |
| `rarity_0` | decoration | common / rare / epic / legend | common | rarity of card 0; a face-down legend shows the gold edge |
| `rarity_1` | decoration | common / rare / epic / legend | rare | rarity of card 1; a face-down legend shows the gold edge |
| `rarity_2` | decoration | common / rare / epic / legend | common | rarity of card 2; a face-down legend shows the gold edge |
| `rarity_3` | decoration | common / rare / epic / legend | epic | rarity of card 3; a face-down legend shows the gold edge |
| `rarity_4` | decoration | common / rare / epic / legend | legend | rarity of card 4; a face-down legend shows the gold edge |

## Decoration

- Table grain, brushed fields, fronds, card backs with the ring, the torn flap, the seal, the hover frame.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
