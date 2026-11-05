# card.tape-section-title

Section title block on its acid slab: ultra-black CJK, condensed caps and a giant two-digit number, with a stripe band and a rounded content slab cut at 49 degrees.

Style: `street-tape` (`styles/street-tape/style.json`). The opening of a numbered page section, or a section card in a deck. side=right mirrors it (sections alternate). The media slot is the section's picture.

## Where it comes from

The case's news section scaled to a 960 x 540 card; title sizes from the board's measured ink heights (45 / 19 / 115-130 px at 1920). Borrow grammar, never assets: the reference board is private and nothing from it is shipped; all copy is the case's own original fiction (回放街区).

Samples: replay-ward/section-04.

- Board: CJK ink 45 px (48-50 px type), Latin ink 19 px, number ink 115-130 px; left titles at x 290, right titles end at 1790.
- Case first pass: the number ran off the acid onto the stripes (black on #222122); the slab corner moved right (cut_x 0.41-0.47).

## Relations to keep

- Ink heights CJK : Latin : number = 1 : 0.42 : 2.7; gaps 9 and 18 units; one left (or right) edge.
- The acid slab's cut and the content slab's cut are parallel at 49 degrees with a stripe band between.
- The title sits on acid; the picture sits on white; nothing small on the stripes.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title_cjk` | text | 5 | head | 新闻资讯 |
| `title_latin` | text | 14 | label | NEWS & INFO |
| `number` | text | 2 | num | 04 |
| `media` | image | - | - |  |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `side` | decoration | left / right | left | title edge; right mirrors every cut |
| `cut_x` | rhythm | 0.41-0.47 | 0.44 | acid slab corner x / W (the cut runs down-left from it at 49 degrees) |
| `film` | decoration | true / false | true | a film strip crossing the top band |

## Decoration

- Stripe band, film strip: drawn.

Sizes: 960x540, 1920x1080. A passing check is technical conformance only, not visual acceptance.
