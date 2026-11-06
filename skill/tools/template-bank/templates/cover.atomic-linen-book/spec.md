# cover.atomic-linen-book

Linen book cover: cloth weave, one swooping line (or a loop round the title) with a rocket glyph at its head, three stacked condensed caps lines.

Style: `atomic-age` (`styles/atomic-age/style.json`). Book and report covers, manuals, data books, programme booklets.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's linen panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/linen.

- linen #DDD9C2 / #E4E0CA, dark cloth #282526 16%
- band width about 0.045 W; the rocket glyph about 0.1 W

## Relations to keep

- Title block left aligned, three lines at 1.02 of the size, the widest line 0.62 W.
- One band 0.045 W wide; the rocket glyph 0.1 W at the head of the dark line.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `publisher_mark` | image | - | - | mark slot for the owner's logo, insignia or emblem file (PNG or SVG with alpha), placed with fit contain; 0.09 W x 0.06 H, centred at the foot; keep clear space of half its height; never drawn by the template |
| `title_1` | text | 14 | display | ORBITAL |
| `title_2` | text | 14 | display | MECHANICS |
| `title_3` | text | 14 | display | FIELD BOOK |
| `author` | text | 28 | label | M. A. HOLLOWAY |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `cloth` | decoration | linen / charcoal | linen | cloth colour |
| `swoop` | proportion | line / loop | line | one line from the lower left, or a loop round the title |
| `swoop_ink` | decoration | ink / teal / vermilion | ink | the line's ink on pale linen |

## Decoration

- linen weave, the pale band, the dark line and the classic rocket glyph (line), or the loop with a hairline and a swept glyph (loop)

Sizes: 1200x1800, 600x900. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
