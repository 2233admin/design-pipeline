# card.atomic-field-label

Product label card (field-guide style): a framed card on mustard, a tracked geometric title, a subtitle between rules, typed fields under vermilion labels, an unsigned script line.

Style: `atomic-age` (`styles/atomic-age/style.json`). Product labels, field-guide and kit cards, packaging fronts, about cards.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's field_guide panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/field_guide.

- mustard #E68B25 31%, card #E5E0CD 40%
- aspect 1.96; inner frame inset about 6%

## Relations to keep

- Card inset 0.065 W, ruled 4 units; title centred, subtitle centred between two rules.
- Typed fields in mono tracked 0.04 em under geometric labels in rust; dotted dividers.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `board` | image | - | - | aged board from materials generate (ground layer) |
| `emblem` | image | - | - | mark slot for the owner's logo, insignia or emblem file (PNG or SVG with alpha), placed with fit contain; square, 0.08 W; keep clear space of 0.25 of its side; never drawn by the template |
| `title` | text | 24 | geo | ORBITAL FIELD GUIDE |
| `subtitle` | text | 34 | geo | KNOW YOUR SKY. PLAN YOUR FLIGHT |
| `label_1` | text | 14 | geo | SERVICE: |
| `text_1` | text | 80 | mono | CHARTS, TABLES AND CHECKLISTS FOR THE WEEKEND NAVIGATOR. |
| `label_2` | text | 14 | geo | ISSUED BY: |
| `script` | text | 28 | hand | Halcyon Survey Office |
| `text_2` | text | 32 | mono | HALCYON SURVEY OFFICE LTD. |
| `field_{i}` | text | 16 | geo | ORIGIN: / SERVING: / FIRST ISSUED: |
| `value_{i}` | text | 34 | mono | PALM MESA, NEW MEXICO / AMATEUR SKYWATCHERS / 1959 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `ground` | decoration | mustard / teal | mustard | board colour |
| `emblem` | decoration | true / false | false | show the emblem slot over the top right corner (off: the slot is declared but left empty) |

## Decoration

- the frame, rules and dotted dividers

Sizes: 2000x1000, 1000x500, 1400x700. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
