# banner.lattice-columns

More content: four full-height columns, each with an icon, a 50-unit CJK title, a wide Latin sign, VIEW MORE and a short white rule.

Style: `lattice-dossier` (`styles/lattice-dossier/style.json`). The last screen of a dark site (modes, media, comics) or a four-way hub; each column's picture goes in col_N.

## Where it comes from

computed style of the reference's last screen: four 480-wide columns, CJK 54 px at x+134 y 701, Latin 16, VIEW MORE 12, a 108-unit rule. Borrow grammar, never assets: the captures of the reference site are private and nothing from them is shipped; all copy is the case's own original fiction (雾航信标).

Samples: fogwake/more.

- Reference: titles y 701-780, rule y 856.
- Case: four code-drawn column scenes, 0 findings.

## Relations to keep

- Four equal columns; title block at column x + 134, CJK baseline y 762, Latin 820, VIEW MORE 840, rule 856.
- The lower part of each column is a dark plate under its title.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `col_{i}` | image | – | – | (image) |
| `col_zh_{i}` | text | 5 | head | 雾中航线 / 灯塔营建 / 动画短片 / 航标日志 |
| `col_en_{i}` | text | 14 | wide | FOG ROUTE / BEACON WORKS / ANIMATION / LOGBOOK |
| `view_{i}` | text | 12 | mono | VIEW MORE > |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `icons` | decoration | true / false | true | the line icon before each title |

## Decoration

- Icons and hairlines: drawn.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
