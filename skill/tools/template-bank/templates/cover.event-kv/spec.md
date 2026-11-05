# cover.event-kv

Event key visual: striped numerals on the pool, a tilted title postcard over their corner, a white wall with a palm shadow.

Style: `citypop-sleeve` (`styles/citypop-sleeve/style.json`). The landscape key visual of a limited event whose name has a time, date or number in it. Not for character art: the pool and the numerals are the subject.

## Where it comes from

Geometry taken from the case's final KV (1920 x 1080 HTML) in 1920-unit coordinates scaled to the canvas; the numerals, sun, icons and palm are ported from its common.cjs. All copy is the case's own original fiction.

Samples: gacha-event/01-kv.

- Final KV: tool 0, eye 0 (first pass: tagline over the numerals 1:1; palm tinted grey looked dirty; sun bands ran outside the disc; diving board over the sun).

## Relations to keep

- The numerals sit on the pool at the left, about 1:22 to the body text; the title postcard overlaps their last digit by a corner, never more.
- Pool line at 0.41 H with a paper coping band and its 26% shadow; sky above, pool below.
- Lemon only on the sun and the banner sticker.
- Brand and tagline top left on the sky; the wall with its window grid and palm shadow top right.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `brand_cjk` | text | 6 | head | 白昼公馆 |
| `brand_latin` | text | 16 | num | HAKUCHU HOUSE |
| `tagline` | text | 26 | body | 下午三点，泳池只剩一个人，和一封没写完的信。 |
| `time` | lettering | 5 | - | 15:00 |
| `kicker` | text | 36 | num | SUMMER EVENT · 3:00 P.M. POOLSIDE |
| `title_1` | text | 5 | display | 三点钟的 |
| `title_2` | text | 5 | display | 泳池 |
| `subtitle` | text | 14 | head | 白昼公馆 · 夏日限定活动 |
| `dates` | text | 16 | num | 07.18 — 08.08 |
| `sticker_title` | text | 10 | head | 限定招募「盛夏来信」 |
| `sticker_line` | text | 16 | body | 6★ 澄夏 · 救生员 同步开启 |
| `palm` | image | - | - |  |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `time_size` | rhythm | 0.36-0.42 | 0.407 | numeral height x H (440 px at 1080p: 22:1 against 20 px body) |
| `card_tilt` | rhythm | 1.5-4.5 | 3 | title postcard tilt, degrees |
| `sticker_tilt` | rhythm | -5--2 | -4 | banner sticker tilt, degrees |
| `sun` | decoration | true / false | true | striped sun in the sky |
| `palm` | decoration | true / false | true | drawn fan-palm shadow on the wall (ignored when the palm slot is filled) |

## Decoration

- Striped sun, window grid, diving board, pool tiles, palm shadow: all drawn; the palm can come from a cut photograph through the palm slot.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
