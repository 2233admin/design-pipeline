# banner.tape-sticker-cta

Sticker CTA: one tilted white sticker word with a heavy black outline and an offset black plate, invented pseudo-glyphs under it, an acid flash, on grey with a stripe corner.

Style: `street-tape` (`styles/street-tape/style.json`). The loudest call to action of a first screen or a download banner. One per screen.

## Where it comes from

The case's first-screen download sticker (372 x 190 at 1920) set on its own banner. Borrow grammar, never assets: the reference board is private and nothing from it is shipped; all copy is the case's own original fiction (回放街区).

Samples: replay-ward/hero-sticker.

- Board: the download sticker tilts about +8 degrees with a black outline and an unreadable subtitle.
- Case: 0 findings; the subtitle is drawn bars, so no glyph or contrast rule reads it as text.

## Relations to keep

- Sticker tilted 5-9 degrees clockwise; outline 12 units; offset plate 9 x 11 units down-right.
- The pseudo-glyph line is decoration, never readable copy; the real platforms line sits level on the grey.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `cta` | text | 4 | head | 立即下载 |
| `flash` | text | 3 | head | 公测中 |
| `platforms` | text | 26 | body | PC · iOS · Android · 云游戏 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tilt` | rhythm | 5-9 | 7 | sticker tilt, degrees clockwise (the board's is about 8) |
| `film` | decoration | true / false | true | film strip in the stripe corner |

## Decoration

- Pseudo-glyphs, stripe corner, film strip: drawn.

Sizes: 800x400, 1600x800. A passing check is technical conformance only, not visual acceptance.
