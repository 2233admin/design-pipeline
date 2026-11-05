# pixel.title-screen

Pixel title screen as a road-station woodblock print: bokashi sky, an out-of-register peak, a vertical vermilion title cartouche, stepped menu panels.

Style: `woodblock-pixel` (`styles/woodblock-pixel/style.json`). The title screen of a pixel-art game drawn on a 480 x 270 grid and scaled by a whole number (x4 = 1080p). The scene is the style's procedural print; replace it by editing the scene, not by pasting a raster.

## Where it comes from

Ported from the case's screens.cjs (scene() and the title UI), drawn on the native grid in code: pixel writes are run-length paths per colour, large dithers are 4 x 4 Bayer patterns; text in the pixel font at 12 / 24 px on whole pixels.

Samples: pixel-rpg-ui/1-title.

- Round 2: first pass 11 contrast findings over the screens (small text on the dithered field 2.48:1, vermilion on the selected bar 4.07:1); final 0, minimum 4.76:1 after the ink bar and dark accents.
- Pixel discipline (case snap.py): 0 off-palette pixels before snapping, 0 mixed 4 x 4 blocks at x4, 15 of 16 colours used.

## Relations to keep

- Title cartouche vertical and vermilion, upper right, its series cartouche in paper beside it; both with the dark-red plate 2 px off.
- Menu panels step down and right 12 px per entry, like a road climbing the print.
- A dark ink bar at the bottom carries version and copyright: nothing small sits on the dithered field.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `logo` | text | 5 | title | 白垩驿路 |
| `series` | text | 7 | pixel | 第二十三驿 |
| `menu_{i}` | text | 7 | pixel | 继续旅程 / 新的旅程 / 读取存档 / 新游戏＋ / 设置 |
| `menu_tag` | text | 4 | pixel | 第二章 |
| `logo_latin` | text | 20 | pixel | C H A L K R O A D |
| `version` | text | 14 | pixel | v0.9.3 试玩版 |
| `copyright` | text | 14 | pixel | © 2027 白垩工坊 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `items` | decoration | 3-5 | 5 | menu entries |
| `selected` | decoration | 0-4 | 0 | selected entry (vermilion seal cursor, pale bar) |
| `locked` | decoration | -1-4 | 3 | locked entry (muted, padlock); -1 for none |
| `peak_x` | proportion | 120-180 | 150 | the peak's summit, native px |
| `moon_x` | proportion | 300-370 | 334 | the moon, native px |
| `mist` | decoration | true / false | true | horizontal mist bands across the peak |
| `traveller` | decoration | true / false | true | one 6 px traveller on the road: the scale of the print |

## Decoration

- Bokashi sky in dither bands, stars, moon, peak with snow dither and the ink line 1 px off, mist bands, hills, field dither, the paper road, six pines, the station, the traveller: all drawn on the grid.

Sizes: 1920x1080, 960x540, 480x270. A passing check is technical conformance only, not visual acceptance.
