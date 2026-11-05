# ui.gacha-recruit

Recruit screen: the limited banner as a record sleeve with the record sliding out, tabs as pinned cards, a lemon ten-pull button.

Style: `citypop-sleeve` (`styles/citypop-sleeve/style.json`). A gacha recruit (summon) screen with one featured limited banner, its rates, pity progress and single / ten pulls.

## Where it comes from

Geometry taken from the case's final recruit screen (ui-gacha.cjs) in 1920-unit coordinates; the talent card, rates and pity copy are the case's original fiction.

Samples: gacha-event/03-recruit.

- First pass: 4 tool findings (quote, rates and pity text over the record 1:1, a CJK glyph in the Latin name) and 1 by eye (the record ran into the right column); final 0.

## Relations to keep

- Sleeve (square, tilted) is the largest object, its record peeking out right; the banner name sits right of it at 1:9 to body text.
- Tabs pinned on the left, each a few degrees off; the active one lemon.
- The ten-pull button is the only lemon button and the largest; the single pull is paper with a hard ink shadow.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `screen_title` | text | 12 | head | 招募 · 公馆前台 |
| `cur_{i}_label` | text | 4 | label | 日光券 / 蓝晶 / 汽水瓶盖 |
| `cur_{i}_value` | text | 6 | num | 12 / 3,580 / 40 |
| `tab_{i}_kicker` | text | 10 | label | 限定 · 6★ UP / 常驻 / 新手 / 复刻 |
| `tab_{i}_name` | text | 6 | head | 盛夏来信 / 公馆名册 / 入住指南 / 冬日暖炉 |
| `tab_{i}_note` | text | 12 | label | 剩余 21 天 / 常驻开放 / 已完成 20/20 / 08.12 开启 |
| `side_label` | text | 24 | num | SIDE A · SUMMER LETTER |
| `stars` | text | 6 | label | ★★★★★★ |
| `featured_name` | text | 3 | display | 澄夏 |
| `featured_latin` | text | 10 | num | SUMIKA |
| `sleeve_tag` | text | 2 | label | 限定 |
| `banner_name` | text | 5 | display | 盛夏来信 |
| `quote` | text | 24 | head | 「信写到一半，泳池就关门了。」 |
| `up_{i}_name` | text | 4 | head | 柚子 / 白露 |
| `up_{i}_note` | text | 13 | label | 5★ 调酒师 · 概率提升 / 5★ 跳水员 · 概率提升 |
| `talent_title` | text | 14 | head | 天赋 · 午后三点 |
| `talent_body` | text | 72 | body | 部署后每回合为全体友方叠加 1 层「树荫」（最多 3 层），每层使受到的灼烧伤害降低 8%。 |
| `rates` | text | 70 | body | 6★ 2%（澄夏占 6★ 的 50%）· 5★ 8% · 4★ 50% · 3★ 40% · 每 80 次招募内必得 6★ |
| `pity_label` | text | 5 | label | 6★ 保底 |
| `pity_count` | text | 8 | num | 37 / 80 |
| `pull_one` | text | 4 | head | 招募一次 |
| `pull_one_cost` | text | 12 | label | 日光券 ×1 |
| `pull_ten` | text | 4 | head | 招募十次 |
| `pull_ten_cost` | text | 24 | label | 日光券 ×10 · 第 10 次必出 5★ 以上 |
| `note` | text | 36 | body | 重复角色转化为「汽水瓶盖」，可兑换潜能信物。 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tabs` | decoration | 2-4 | 4 | banner tabs on the left (the first is active; from the third on they are dashed: finished or locked) |
| `sleeve_tilt` | rhythm | -5--2 | -4 | sleeve tilt, degrees |
| `pity` | decoration | 0-1 | 0.4625 | pity progress bar fill (data) |
| `up_icon_0` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | cocktail | icon of the first rate-up card |
| `up_icon_1` | decoration | lifebuoy / cocktail / board / palm / record / tray / camera | board | icon of the second rate-up card |

## Decoration

- Record behind the sleeve, sun and pool inside the sleeve, pool tiles, icons: drawn.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
