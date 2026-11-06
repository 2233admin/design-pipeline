# ui.voyage-topbar

Top bar with a hanging logo and a cream download tab: a 75-unit black bar, nav on a 139-unit pitch with a gold current item and underline, a logo mark hanging 62 units below the bar.

Style: `celestial-voyage` (`styles/celestial-voyage/style.json`). The fixed top bar of a game's official site. current picks the highlighted nav item (1-7).

## Where it comes from

The case's top bar at 1920 with the reference's measured positions (computed styles of the bar, nav items and tab). Borrow grammar, never assets: the reference captures are private and nothing from them is shipped; all copy is the case's own original fiction (长庚航志).

Samples: vesperwake/topbar.

- Reference: bar 75 high rgba(0,0,0,.8); nav 139 wide from x 353, 22.5 units #747474, current 24 units #E1B066; tab 225 x 83 at (1695, -2), bottom-left radius 22.5, text 28.5 units 700 #1C1919.
- Case: nav grey raised to #8C8C8C so it reads 4.5:1 on the bar.

## Relations to keep

- Bar 75 units; the logo hangs 62 units below it; nav items 139 wide from x 353; the current item is gold at 24 units with a full-width 3-unit underline.
- The download tab is 225 x 81 visible, top edge at the canvas top, only the bottom-left corner rounded (22.5); it is taller than the bar.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `brand_cjk` | text | 4 | head | 长庚航志 |
| `brand_latin` | text | 12 | label | VESPERWAKE |
| `nav_1` | text | 5 | body | 首页 |
| `nav_2` | text | 5 | body | 新闻 |
| `nav_3` | text | 5 | body | 角色 |
| `nav_4` | text | 5 | body | 世界 |
| `nav_5` | text | 5 | body | 社区 |
| `nav_6` | text | 5 | body | 充值中心 |
| `nav_7` | text | 5 | body | 家长关护 |
| `login` | text | 3 | body | 登录 |
| `cta` | text | 5 | body | 下载游戏 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-7 | 2 | highlighted nav item |
| `login` | decoration | true / false | true | the login label and avatar |

## Decoration

- Logo ring mark, music button, divider, avatar, star dust: drawn.

Sizes: 1920x140, 2880x210. A passing check is technical conformance only, not visual acceptance.
