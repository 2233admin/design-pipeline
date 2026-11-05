# poster.tour-flyer

Schedule poster as a band's tour flyer: ransom title on a black band, the final's date sprayed huge and tilted, a match-up band and one line per date.

Style: `xerox-flyer` (`styles/xerox-flyer/style.json`). A tournament or season schedule poster with one headline date; social feed size 4:5.

## Where it comes from

Positions from the case's poster.cjs (1080 x 1350). The case's copier ground is George Bellows' Stag at Sharkey's (1909, Cleveland Museum of Art, CC0) through materials cut and a photocopy process; this template takes any processed photograph in the xerox slot and draws toner specks until then.

Samples: esports-broadcast/04-schedule-poster.

- Case v2: first pass 0 tool findings, 1 by eye (a meaningless header); final 0.

## Relations to keep

- Copy never sits on the copier grain: every line is on a solid paper or black plate (collage-cover).
- One giant stencil date (250 px against 18 px, 14:1) tilted -6 degrees, its label pasted on its corner.
- Schedule paper tilted +1 degree, one line per date, winners underlined.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `xerox` | image | - | - |  |
| `title_{i}` | text | 1 | sans | 北 / 线 / 联 / 赛 / 季 / 后 / 赛 /  |
| `subtitle` | text | 40 | num | NORTHLINE LEAGUE · PLAYOFF TOUR 2026 |
| `date` | lettering | 5 | - | 12.13 |
| `date_label` | text | 16 | sans | 总决赛 · SAT 19:00 |
| `team_a` | lettering | 4 | - | ANV |
| `versus` | text | 2 | sans | 对 |
| `team_b` | lettering | 4 | - | NFR |
| `matchup` | text | 10 | sans | 铁砧 vs 夜航 |
| `venue` | text | 10 | sans | 穹顶体育馆 |
| `schedule_head` | text | 20 | sans | 巡回日程 · 全部 BO5 · 北京时间 |
| `schedule_count` | text | 14 | sans | 6 场已赛 · 1 场待赛 |
| `row_{i}_date` | text | 5 | num | 11.21 / 11.21 / 11.22 / 11.22 / 12.05 / 12.06 / 12.12 |
| `row_{i}_day` | text | 3 | num | SAT / SAT / SUN / SUN / SAT / SUN / SAT |
| `row_{i}_stage` | text | 10 | sans | 四分之一决赛 / 四分之一决赛 / 四分之一决赛 / 四分之一决赛 / 半决赛 / 半决赛 / 季军赛 19:00 |
| `row_{i}_a` | text | 4 | num | ANV / TDL / NFR / DK9 / ANV / NFR / AMW |
| `row_{i}_score` | text | 3 | num | 3:1 / 2:3 / 3:0 / 3:2 / 3:2 / 3:1 / vs |
| `row_{i}_b` | text | 4 | num | PPC / AMW / WNZ / MGR / AMW / DK9 / DK9 |
| `footnote` | text | 46 | sans | 下划线 = 晋级 · 现场票 11.28 12:00 开售 · 全程直播：北线联赛官方频道 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `title_scraps` | decoration | 3-8 | 7 | number of ransom scraps in the headline |
| `rows` | decoration | 3-7 | 7 | schedule lines |
| `win_0` | decoration | a / b / none | a | underline the winner of line 0 |
| `win_1` | decoration | a / b / none | b | underline the winner of line 1 |
| `win_2` | decoration | a / b / none | a | underline the winner of line 2 |
| `win_3` | decoration | a / b / none | a | underline the winner of line 3 |
| `win_4` | decoration | a / b / none | a | underline the winner of line 4 |
| `win_5` | decoration | a / b / none | a | underline the winner of line 5 |
| `win_6` | decoration | a / b / none | none | underline the winner of line 6 |
| `toner` | decoration | true / false | true | drawn copier toner specks in the middle band (ignored when the xerox slot is filled) |
| `toner_density` | rhythm | 0.6-1.4 | 1 | toner speck density |

## Decoration

- Toner specks (or the processed photograph), stencil bridges, rules.

Sizes: 1080x1350, 2160x2700. A passing check is technical conformance only, not visual acceptance.
