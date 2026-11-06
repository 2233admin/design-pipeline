# poster.atomic-travel

Travel / space poster: a dark sky, a planet limb with halftone, a swept rocket (or satellite) glyph on a diagonal, a slanted condensed title, a vermilion band.

Style: `atomic-age` (`styles/atomic-age/style.json`). Travel and event posters, launch announcements, season key art.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's satellite_poster, book_cover_dark, shuttle_mars panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/satellite_poster.

- dark 40-65% (navy #283C44 / #141F27, charcoal #292727)
- vermilion 13-29% (planet, band, title)
- visual-weight centre (0.48, 0.46)

## Relations to keep

- Title top left at the margin (0.055 W), up to 0.17 of H, slanted; kicker and subtitle on the same left line.
- Planet limb: a disc of radius 1.05 W centred below the frame (0.62 W); the rocket crosses at -32 degrees, 0.62 W long, trail to the lower left.
- Band 0.1 of H at the foot, vermilion, charcoal tracked caps.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `art` | image | - | - | period scene (launch, Earth, Moon), 2:1.8; from a public-domain period source or a task sheet |
| `emblem` | image | - | - | mark slot for the owner's logo, insignia or emblem file (PNG or SVG with alpha), placed with fit contain; square, 0.13 of the width, top right; keep clear space of 0.25 of its side; never drawn by the template |
| `kicker` | text | 30 | geo | HALCYON ORBITAL LINES |
| `title` | text | 16 | display | SEE THE MOON |
| `subtitle` | text | 40 | geo | Weekly departures from Pad Nine |
| `band` | text | 36 | geo | A NEW ERA OF TRAVEL |
| `date` | text | 18 | display | SEASON OF 1961 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `ground` | decoration | navy / ink / teal | navy | sky ground |
| `title_ink` | decoration | mustard / paper / vermilion | mustard | vermilion only on ink (3:1) |
| `planet` | decoration | vermilion / mustard / teal | vermilion | planet limb ink |
| `vehicle` | decoration | rocket / satellite | rocket | flat glyph on the diagonal |
| `art` | decoration | drawn / slot | drawn | slot: a period scene image replaces the glyph |
| `italic` | decoration | true / false | true | slanted title |
| `halftone` | decoration | true / false | true | code dot screen on the planet |
| `misregister` | rhythm | 0-10 | 4 | offset of the second plate |
| `star_seed` | rhythm | 1-999 | 7 | star placement |

## Decoration

- seeded four-point stars, the planet with a code dot screen and a misregistered plate, a dashed orbit ellipse, the rocket or satellite glyph

Sizes: 1600x2400, 800x1200, 1200x1800. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
