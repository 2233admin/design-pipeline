# ui.tenpull-wall

Ten-pull results as a wall of postcards: nine cards pinned at ±5 degrees, the top pull twice their size in the middle.

Style: `citypop-sleeve` (`styles/citypop-sleeve/style.json`). The result screen of a ten-pull: ten results of mixed rarity, a summary card and confirm / pull-again buttons.

## Where it comes from

Card positions and tilts taken from the case's final ten-pull screen (ui-result.cjs) in 1920-unit coordinates; names are the case's original roster.

Samples: gacha-event/04-ten-pull.

- First pass: 12 contrast findings (4-star cards on deep pool #1AA3AD: deep-teal text 4.03:1) and 1 by eye (white lifebuoy on the white sun); final 0 after 4-star plates became deep teal with paper text.

## Relations to keep

- The top pull (card 0) is twice the other cards and the only lemon plate when it is 6 stars; it overlaps nothing.
- Rarity is the plate, not a glow: 6 lemon, 5 paper, 4 deep teal with paper text, 3 sand.
- Cards tilt -5 to +5 degrees, each with the same hard shadow; the summary card sits at the right edge.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `screen_title` | text | 12 | head | 招募结果 · 盛夏来信 |
| `cur_{i}_label` | text | 4 | label | 日光券 / 蓝晶 / 汽水瓶盖 |
| `cur_{i}_value` | text | 6 | num | 2 / 3,580 / 60 |
| `card_{i}_stars` | text | 6 | label | ★★★★★★ / ★★★★ / ★★★ / ★★★★ / ★★★ / ★★★★★ / ★★★ / ★★★★ / ★★★ / ★★★★ |
| `card_{i}_name` | text | 3 | head | 澄夏 / 小满 / 七月 / 阿蓝 / 冰冰 / 白露 / 栗子 / 米洛 / 阿布 / 塔尼 |
| `card_{i}_latin` | text | 10 | num | SUMIKA / MAN / JULY / LAN / BING / HAKURO / KURI / MILO / ABU / TANI |
| `card_{i}_note` | text | 14 | label | 救生员 / 园丁 · NEW / DJ / 侍应 / 重复 · 汽水瓶盖 +10 / 跳水员 · NEW / 园丁 / 重复 · 汽水瓶盖 +10 / 侍应 / 摄影师 · NEW |
| `top_stamp` | text | 3 | num | NEW |
| `summary_title` | text | 5 | head | 十连结果 |
| `summary_range` | text | 10 | label | 第 38–47 次 |
| `summary_row_{i}` | text | 8 | label | 6★ ×1 / 5★ ×1 / 4★ ×4 / 3★ ×4 |
| `summary_pity` | text | 13 | body | 保底重新计数 7/80 |
| `note` | text | 34 | body | 重复角色已转化：汽水瓶盖 +20 · 获得角色已入住「公馆名册」 |
| `confirm` | text | 3 | head | 确认 |
| `again` | text | 5 | head | 再招募十次 |
| `again_note` | text | 12 | label | 日光券不足（剩余 2） |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `wobble` | rhythm | 0.6-1.2 | 1 | scale of every card's tilt (1 = the case's -5 to +5 degrees) |
| `icon_0` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | lifebuoy | icon of the top pull (card 0) |
| `icon_1` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | palm | icon of card 1 |
| `icon_2` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | record | icon of card 2 |
| `icon_3` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | tray | icon of card 3 |
| `icon_4` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | cocktail | icon of card 4 |
| `icon_5` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | board | icon of card 5 |
| `icon_6` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | palm | icon of card 6 |
| `icon_7` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | record | icon of card 7 |
| `icon_8` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | tray | icon of card 8 |
| `icon_9` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | camera | icon of card 9 |

## Decoration

- Dashed star frames, sun on the top pull, icons, pool tiles: drawn.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
