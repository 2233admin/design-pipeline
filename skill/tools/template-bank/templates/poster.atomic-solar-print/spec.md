# poster.atomic-solar-print

Orbit / solar-system print: concentric cream rings on a printed vermilion field, a sun disc, planets on the rings, leaders to tracked labels at the margins.

Style: `atomic-age` (`styles/atomic-age/style.json`). Art prints, end papers, chapter plates, about pages.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's solar panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/solar.

- vermilion field #CA4E2B / #CE5A36 / #C64523 93%, cream lines #EED4AA 7%
- ten rings, labels on leaders to both margins
- visual-weight centre (0.49, 0.51)

## Relations to keep

- Rings centred at (0.5 W, 0.5 H), spaced 0.038 W for ten; the sun 0.1 W across.
- Leaders horizontal to the margins (0.06 W); labels tracked 0.12 em.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `paper` | image | - | - | aged sheet from materials generate --generator paper (ground layer: sampled for contrast); empty draws the flat ink |
| `title` | text | 40 | geo | THE KNOWN PLANETS · CHART NO. 4 |
| `edition` | text | 52 | label | HALCYON SURVEY OFFICE · SECOND EDITION 1961 |
| `label_{i}` | text | 12 | geo | MERCURY / VENUS / EARTH / MARS / CERES / JUPITER / SATURN / URANUS / NEPTUNE / PLUTO |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `ground` | decoration | terra / teal / ink | terra | field |
| `rings` | proportion | 8-12 | 10 | orbits |
| `labels` | proportion | 4-10 | 8 | labelled planets |
| `seed` | rhythm | 1-999 | 5 | planet angles |

## Decoration

- rings, sun, planets, ring ellipses, leaders

Sizes: 1400x2000, 700x1000, 2100x3000. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
