# poster.atomic-orbit-plate

Orbital-diagram plate (dark): white lines on black, a faint grid, a celestial sphere, a hatched body cut by the edge, trajectories, a formula, chalk labels, a ruled plate title.

Style: `atomic-age` (`styles/atomic-age/style.json`). Section openers, diagrams, data plates, end papers, dark backgrounds with notation.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's chalk panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/chalk.

- dark 90%, ground #1D1F22, chalk #93938F-#ECE8DC
- no chroma

## Relations to keep

- Ground #1B1D21 (90% dark), every line chalk; grid 0.0625 W.
- Body: a circle of radius 0.46 W centred at (0.38 W, H), its rim hatched.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `label_sphere` | text | 22 | hand | celestial sphere |
| `label_top` | text | 22 | hand | precession circle |
| `formula` | text | 22 | mono | Ug = -Gm1m2/r |
| `label_arrow` | text | 22 | hand | escape velocity |
| `distance` | text | 14 | mono | 35,786 km |
| `plate` | text | 34 | geo | PLATE IV · TRANSLUNAR GEOMETRY |
| `caption` | text | 36 | mono | Halcyon Survey Office, 1961 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `grid` | decoration | true / false | true | faint grid |
| `star_seed` | rhythm | 1-999 | 11 | star placement |

## Decoration

- grid, sphere, body, trajectories, dotted escape line, moon, stars, arrow, tag frame

Sizes: 1600x1800, 800x900. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
