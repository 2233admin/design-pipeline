# kv.survey-album

Album screen: the big wordmark, the section title, a picture with a yellow (or grey) side band and its vertical wide label, the pager capsule and the caption.

Style: `frontier-survey` (`styles/frontier-survey/style.json`). A gameplay or feature section; side=right with band=grey is the mirrored companion screen (the band moves left, the title right, no wordmark).

## Where it comes from

The case's gameplay and workline sections (site/index.html #gameplay, #workline) as one parametric screen; numbers from the reference's DOM. Borrow grammar, never assets: the reference site's screenshots are private and nothing from them is shipped; all copy is the case's own original fiction (远垦导线).

Samples: traverse/section-06, traverse/section-07.

- Reference: GameplayAlbum 1338 x 653 = 1109 picture + 228 band (#FFFA00, or #EDEDED mirrored), band title 54 px wide face vertical, line 27 x 618 white, pagination 164 x 63 r 31.5 with 56 px buttons.
- Case: the wide label is about 1.0 em per capital in Michroma (measured), so the band label is budgeted at 10 characters.

## Relations to keep

- Picture 1109 x 653 plus a 229-unit band on the far side; a 27-unit white rule and the vertical label on the band.
- Pager capsule on the picture's bottom-left corner; caption 40 units under the album on the picture's left edge.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `mark_latin` | text | 8 | wide | TRAVERSE |
| `title_cjk` | text | 6 | head | 玩法介绍 |
| `title_latin` | text | 12 | wide | GAMEPLAY |
| `media` | image | - | - |  |
| `band_latin` | text | 10 | wide | GAMEPLAY |
| `index` | text | 5 | geo | 1/4 |
| `caption` | text | 12 | body | 沿线探索 |
| `desc` | text | 50 | body | 勘察晨昏带，立起界桩，把导线一段段延伸到地图之外。 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `side` | decoration | left / right | left | band side; right mirrors the album |
| `band` | decoration | yellow / grey | yellow | side band colour |
| `wordmark` | decoration | true / false | true | the wordmark row above (off pulls the album up) |

## Decoration

- The datum mark, the decoration group, the pager buttons, the grey icon tile: drawn.

Sizes: 1920x1080. A passing check is technical conformance only, not visual acceptance.
