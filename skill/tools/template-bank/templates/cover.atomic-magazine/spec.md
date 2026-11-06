# cover.atomic-magazine

Magazine cover: a two-ink condensed masthead at 0.17 of the height, a tracked line, a contents column, a sun disc, an orbit and a Googie scene slot on cream.

Style: `atomic-age` (`styles/atomic-age/style.json`). Magazine and zine covers, issue announcements, catalogue fronts.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's magazine panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/magazine.

- masthead ink 0.16-0.18 of H, the cool half teal #155056, the hot half vermilion #B33E10
- cream #E6CBA4 50.8% of the cover, dark 10.1%, chroma>30 7.8%
- sun disc diameter 0.216 W, contents column 0.16 W, left margin 0.054 W
- visual-weight centre (0.49, 0.54)

## Relations to keep

- Masthead ink 0.17 of the height, two inks in one word (teal then vermilion), set tight (-10).
- Contents column 0.2 of the width at the left margin (0.055), entries alternating teal and vermilion with a rule under each.
- Sun disc 0.216 of the width at (0.80, 0.42), an orbit circle of radius 0.31 W through it, a starburst at (0.85, 0.215).

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `paper` | image | - | - | aged sheet from materials generate --generator paper (ground layer: sampled for contrast); empty draws the flat ink |
| `art` | image | - | - | Googie or period scene, 3:2, from a public-domain period source or a task sheet; never drawn |
| `emblem` | image | - | - | mark slot for the owner's logo, insignia or emblem file (PNG or SVG with alpha), placed with fit contain; square, 0.07 of the width; keep clear space of 0.25 of its side; nothing of the cover inside it; never drawn by the template |
| `kicker` | text | 4 | display | the |
| `masthead_a` | text | 7 | display | orbit |
| `masthead_b` | text | 7 | display | ville |
| `masthead_c` | text | 10 | geo | GAZETTE |
| `tagline` | text | 44 | label | THE MAGAZINE OF THE DAY AFTER TOMORROW |
| `date` | text | 12 | display | JUNE 1962 |
| `price` | text | 5 | display | 35c |
| `item_{i}` | text | 20 | display | ATOMIC KITCHENS / ORBITAL HOLIDAYS / THE ROBOT BUTLER / CITIES IN THE SKY |
| `deck_{i}` | text | 34 | label | Cooking at the speed of light / Two weeks on the lunar lido / Meet the help of 1975 / Towers above the clouds |
| `page_{i}` | text | 9 | label | Page 18 / Page 32 / Page 44 / Page 56 |
| `plus` | text | 5 | display | PLUS: |
| `plus_line` | text | 52 | label | • JET-AGE FURNITURE  • DESERT MODERN  • ATOMIC ART |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `items` | proportion | 3-4 | 4 | contents entries |
| `misregister` | rhythm | 0-8 | 3 | offset of the mustard plate behind the sun (units at 1500 wide) |
| `halftone` | decoration | true / false | true | a code dot screen on the sun |
| `starburst` | decoration | true / false | true | the starburst top right |

## Decoration

- teal and charcoal blocks, the sun with a code dot screen and a misregistered mustard plate, a small teal disc, the orbit with crosshair ticks, a mobile of three poles, the starburst

Sizes: 1500x2000, 750x1000, 1200x1600. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
