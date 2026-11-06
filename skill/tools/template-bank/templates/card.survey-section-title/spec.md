# card.survey-section-title

Section opener: the four-layer title block, its decoration group, a yellow column with a survey ruler and a hatched ghost word over contours.

Style: `frontier-survey` (`styles/frontier-survey/style.json`). The opening of a page section, or a section card in a deck. tone=dark sets it on navy for the lore and media sections.

## Where it comes from

The case's section title (all eight sections) at half scale on a 960 x 540 card; sizes from the reference's computed styles. Borrow grammar, never assets: the reference site's screenshots are private and nothing from them is shipped; all copy is the case's own original fiction (远垦导线).

Samples: traverse/section-title.

- Reference: SectionTitle arrow block 78 x 24 #D9D9D9, Latin 27 px line 24, CJK 36 px bold, at x 209 (119 into the content).
- Case first pass: the micro path label in #8C8C8C measured 3.36:1 on white; it is #6B6B6B now.

## Relations to keep

- Arrow block 78 x 24, Latin 27 (set 21 in the wide face), CJK 36, 6 between: the reference's sizes at 1920, kept at the card's own 960 width so the title reads at deck scale; one left edge.
- The column is square-cornered and full height; the ghost word sits behind the title and the column.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title_cjk` | text | 6 | head | 世界观 |
| `title_latin` | text | 12 | wide | LORE |
| `ghost_latin` | text | 10 | wide | TRAVERSE |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tone` | decoration | light / dark | light | white or navy section |
| `col_x` | rhythm | 0.62-0.7 | 0.66 | yellow column x / W |
| `ruler` | decoration | true / false | true | a survey ruler and datum mark on the column |

## Decoration

- Contours, the hatched ghost word, the ruler and datum mark, the decoration group: drawn.

Sizes: 960x540, 1920x1080. A passing check is technical conformance only, not visual acceptance.
