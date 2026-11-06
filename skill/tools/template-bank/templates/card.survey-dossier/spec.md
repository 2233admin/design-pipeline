# card.survey-dossier

Crew dossier: REC head, code bar, rank marks, the hatched ghost word, the yellow column with the figure, the name in brackets, label / value chips, quote and bio.

Style: `frontier-survey` (`styles/frontier-survey/style.json`). A character or crew introduction screen. The portrait slot takes a transparent figure (2120 x 2120 from the task sheet), or an instrument drawing for a showcase without characters.

## Where it comes from

The case's crew section (site/index.html #crew) as a parametric screen; numbers from the reference's DOM. Borrow grammar, never assets: the reference site's screenshots are private and nothing from them is shipped; all copy is the case's own original fiction (远垦导线).

Samples: traverse/section-02.

- Reference: decoFlag clip 656 x 1043, hollow text 366 px at -0.08 em and 60% with a -45 degree stripe fill, switch items 102 every 147, title 58.5 px with 40.5 px brackets, label 90 x 24 and value 165 x 24 at 16.5 px.
- Case first pass: the bracket glyphs in #8C8C8C measured 3.36:1; they are #6B6B6B.

## Relations to keep

- Column 656 x 1043 from the top; avatars 102 every 147 on a grey column; text column at x 367, 553 wide.
- Name 58 bold between 40-unit grey brackets; chips 90 + 165 x 24 in two columns 285 apart, 48 between rows; voice rows yellow.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `ghost_latin` | text | 10 | wide | TRAVERSE |
| `portrait` | image | - | - |  |
| `code` | text | 12 | geo | GNOMON |
| `index` | text | 5 | geo | 1/5 |
| `name` | text | 4 | head | 岑砚 |
| `label_1` | text | 4 | body | 编队 |
| `value_1` | text | 8 | body | 第七导线队 |
| `label_2` | text | 4 | body | 出身 |
| `value_2` | text | 8 | body | 晨昏带 |
| `label_3` | text | 4 | body | 声线·中 |
| `value_3` | text | 8 | body | 方屿 |
| `label_4` | text | 4 | body | 声线·日 |
| `value_4` | text | 8 | body | 高槻凛 |
| `quote` | text | 28 | body | “偏差零点三度，重测。这条线要走一百年。” |
| `bio` | text | 90 | body | 岑砚是第七导线队的测绘组长，也是缓行站上资历最老的现役队员。她习惯在日出前把晷针插进冻土，用影子校准当天的第一条基线。 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `col_x` | rhythm | 0.36-0.4 | 0.376 | yellow column x / W (656 units wide) |
| `rank` | decoration | 1-6 | 6 | filled rank marks |

## Decoration

- The ghost word, avatar circles, rank marks, badges, tape rules and the tri-code rule: drawn.

Sizes: 1920x1080. A passing check is technical conformance only, not visual acceptance.
