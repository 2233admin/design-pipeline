# ui.tape-topbar

Site top bar: a black full-width bar, a sticker wordmark, a white capsule for the current page, one acid capsule CTA, round icon buttons.

Style: `street-tape` (`styles/street-tape/style.json`). The fixed top bar of a game's official site (1920 wide, 66 high). Six nav labels; the current one is a white capsule. Not for in-game HUD bars.

## Where it comes from

Positions measured on the board's top bar (66 px, capsules 103 x 35 and 93 x 33) and kept in 1920 units; the case's bar is the same. Borrow grammar, never assets: the reference board is private and nothing from it is shipped; all copy is the case's own original fiction (回放街区).

Samples: replay-ward/topbar.

- Board: bar #000 66 px; current capsule 103 x 35 white; CTA 93 x 33 acid; nav pitch about 123 px.
- Case: the brand Latin under the CJK name touched it at 2 px (8 text-overlap findings over 7 pages); the lockup is one block.

## Relations to keep

- Bar 66 units high, pure black, content between x 275 and 1620 (1370 wide, centred).
- Current page: white capsule 103 x 35, black 900 text; others mute grey on black, 121-unit pitch.
- One acid capsule CTA (100 x 33) after the nav, then three round buttons on a 70-unit pitch.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `brand_cjk` | text | 4 | head | 回放街区 |
| `brand_latin` | text | 12 | num | REPLAY WARD |
| `nav_1` | text | 4 | head | 首页 |
| `nav_2` | text | 4 | head | 角色介绍 |
| `nav_3` | text | 4 | head | 影像资料 |
| `nav_4` | text | 4 | head | 新闻资讯 |
| `nav_5` | text | 4 | head | 设定档案 |
| `nav_6` | text | 3 | head | 更多 |
| `cta` | text | 4 | head | 立即下载 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-6 | 1 | which nav item is the current page (white capsule) |
| `more_caret` | decoration | true / false | true | a caret after the sixth label (a 'more' menu) |
| `icons` | decoration | true / false | true | the three round icon buttons (music, community, account) |

## Decoration

- Cassette mark in the brand sticker, the caret, the three icons: drawn.

Sizes: 1920x66, 2560x88, 3840x132. A passing check is technical conformance only, not visual acceptance.
