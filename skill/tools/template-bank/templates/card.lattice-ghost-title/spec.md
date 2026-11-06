# card.lattice-ghost-title

Section heading on the lattice: a small tag and label, wide Latin over a CJK title and a cyan bar, a note, a picture slot, the ghost word on the base hairline.

Style: `lattice-dossier` (`styles/lattice-dossier/style.json`). The opening of a screen or a section card in a deck; the media slot is the section's object, scene or figure.

## Where it comes from

computed style of the reference's archive screen: tag 14 / label 24 condensed, title wide 50 over CJK 60, a 230 x 6 cyan bar, ghost 112 at -5.6 px. Borrow grammar, never assets: the captures of the reference site are private and nothing from them is shipped; all copy is the case's own original fiction (雾航信标).

Samples: fogwake/archive.

- Reference: title block at x 144, y 550-700; ghost at y 900.
- Case: 雾港资料馆 in the same block at 0 findings.

## Relations to keep

- Hairlines at 76, 450 and x 841 (the 1920 frame halved).
- Wide Latin over CJK, a 115 x 4 cyan bar under them, left edge 72.
- The ghost word sits on the 450 line and bleeds off the bottom.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `tag` | text | 20 | narrow | BEACON BUREAU :// |
| `label` | text | 14 | narrow | ARCHIVE |
| `title_latin` | text | 10 | wide | ARCHIVE |
| `title_cjk` | text | 7 | head | 雾港资料馆 |
| `note` | text | 18 | body | 请选择您要查看的内容 |
| `ghost` | text | 14 | narrow | ARCHIVE ROOM |
| `media` | image | – | – | (image) |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `title_y` | rhythm | 270-310 | 290 | baseline of the Latin title line, 960 units |

## Decoration

- The lattice and hairlines: drawn.

Sizes: 960x540, 1920x1080. A passing check is technical conformance only, not visual acceptance.
