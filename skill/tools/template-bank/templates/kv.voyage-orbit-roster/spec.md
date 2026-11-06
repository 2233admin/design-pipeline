# kv.voyage-orbit-roster

Character section: a translucent panel with the figure breaking its edges, an info column (name, romanised name, sign, CV, story, avatars), a serif quote on dark plates, and faction medallions on a huge arc centred off the left of the screen.

Style: `celestial-voyage` (`styles/celestial-voyage/style.json`). The character or crew screen of an official site; the art slot takes a transparent figure (2000 x 1840).

## Where it comes from

The case's crew section at 1920 with the reference's measured panel, info column and orbit. Borrow grammar, never assets: the reference captures are private and nothing from them is shipped; all copy is the case's own original fiction (长庚航志).

Samples: vesperwake/section-03.

- Reference: panel x 18-1531, y 313-915; name 52.5 px 700; story 475 wide rgba(0,0,0,.5) r 10.5; avatars 87 px; medallions on an arc through (1680, 190), (1745, 360), (1765, 540).
- Case: the arc's centre solved from three medallion centres: radius about 760.

## Relations to keep

- Panel x 18-1531, y 313-915; the figure breaks its top and bottom.
- Info column from x 195: name 52.5 units, story box 475 wide with corners 10.5, avatars 87 square on a 100 pitch at y 797.
- Orbit: radius 760 centred at (1005, 540); medallions 120 across, 13.7 degrees apart; the current one at the arc's rightmost point, larger, with gold diamonds and its label below.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title_cjk` | text | 6 | head | 乘员名录 |
| `title_latin` | text | 12 | ghost | CHARACTER |
| `art` | image | - | - |  |
| `name` | text | 5 | head | 岑星澜 |
| `name_latin` | text | 16 | label | CEN XINGLAN |
| `cv` | text | 5 | body | 沈一舟 |
| `story` | text | 81 | body | 长庚号的现任领航员，习惯把航线写在手背上。她相信每一条断掉的航线都只是在等人回来，于是一段一段地把它们重新连上。 |
| `quote` | text | 56 | head | 「航线不是画出来的，是一段一段走出来的。今晚这一段，交给我。」 |
| `faction` | text | 6 | body | 守夜同盟 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `rail` | decoration | true / false | true | the left rail line and social column |
| `avatars` | rhythm | 3-5 | 4 | avatar tiles |
| `active` | decoration | 1-5 | 1 | current avatar |

## Decoration

- Star dust, rail, sign diamond, CV mark, voice button, avatar tiles, orbit and medallions: drawn.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
