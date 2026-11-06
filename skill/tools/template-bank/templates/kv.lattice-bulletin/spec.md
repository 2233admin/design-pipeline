# kv.lattice-bulletin

Bulletin screen: tabs with a cyan current block, a dated news list, a key-art carousel between the frame lines, a headline with the main button, a progress segment, the rail pager.

Style: `lattice-dossier` (`styles/lattice-dossier/style.json`). The news or bulletin screen of a dark game site. items sets 2-3 list rows; tab and active pick the current tab and carousel item.

## Where it comes from

computed style and pixel samples of the reference bulletin: tabs 16 px with a 90 x 20 current block, rows 96 px, dates 16 px at 1 px tracking, headline 36 px, button 230 x 60, progress y 902-909. Borrow grammar, never assets: the captures of the reference site are private and nothing from them is shipped; all copy is the case's own original fiction (雾航信标).

Samples: fogwake/bulletin.

- Reference: carousel 1133 x 748 between the hairlines; segment about 195 px.
- Case: three original posters in the carousel, 0 findings.

## Relations to keep

- Art x 550-1683, y 152-900, a 180-unit fade from the ground on its left edge.
- List x 62-422: tabs at 112-unit pitch, rows at 96-unit pitch, 1-unit rules.
- Main button 230 x 60 at x 51, y 870, crossing the y900 line; progress track y 902-910 from x 944.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `tab_{i}` | text | 3 | head | 最新 / 公告 / 活动 / 新闻 |
| `cat_{i}` | text | 2 | head | 活动 / 公告 / 活动 |
| `date_{i}` | text | 16 | mono | 2026 // 11 / 06 / 2026 // 11 / 05 / 2026 // 11 / 01 |
| `news_{i}` | text | 16 | head | 「潮汐日」限时活动开启 / 11月06日 停航维护公告 / 「灯语」创作征集开启 |
| `read_more` | text | 10 | mono | READ MORE |
| `head_date` | text | 16 | mono | 2026 // 11 / 06 |
| `headline` | text | 24 | head | 「潮汐日 · 退潮之后」限时活动开启 |
| `button` | text | 5 | head | 更多情报 |
| `button_latin` | text | 10 | mono | READ MORE |
| `ghost` | text | 14 | narrow | BULLETIN BOARD |
| `current` | text | 2 | mono | 01 |
| `total` | text | 2 | mono | 05 |
| `numeral` | text | 2 | wide | 01 |
| `section` | text | 12 | wide | BULLETIN |
| `art` | image | – | – | (image) |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tab` | decoration | 1-4 | 1 | current tab |
| `items` | decoration | 2-3 | 3 | list rows |
| `active` | decoration | 1-3 | 1 | current carousel item (progress segment) |

## Decoration

- Lattice, hairlines, fade, chevrons: drawn.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
