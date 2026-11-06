# banner.atomic-ad-panel

Ad / brochure panel (landscape): charcoal, a vermilion lens off the right edge, a swept rocket glyph crossing it, a condensed year and brand, a widely tracked wordmark.

Style: `atomic-age` (`styles/atomic-age/style.json`). Brochure and catalogue covers, owner portfolios, landscape ads; brand names are user-filled text.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's ad_1956 panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/ad_1956.

- charcoal #221B14 47%, vermilion #E64E1E + #E13E1A 44%
- rocket 0.49 W including its trail; year cap 0.145 H; wordmark tracking about 0.5 em
- visual-weight centre (0.46, 0.51)

## Relations to keep

- Year top left at 0.17 of H; brand right aligned at 0.92 W on the lens.
- Wordmark centred at the foot, tracked 0.52 em.
- Rocket glyph about 0.3 W at -27 degrees, its trail crossing the lens edge to the lower left.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `logo` | image | - | - | mark slot for the owner's logo, insignia or emblem file (PNG or SVG with alpha), placed with fit contain; 0.11 W x 0.18 H, top right; keep clear space of 0.25 of its height; never drawn by the template |
| `year` | text | 6 | display | 1958 |
| `brand` | text | 16 | display | MERIDIAN 88 |
| `wordmark` | text | 22 | geo | OWNER PORTFOLIO |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `misregister` | rhythm | 0-10 | 3 | offset of the mustard plate behind the lens |

## Decoration

- the lens and its misregistered plate, the rocket glyph and trail, a paper flare

Sizes: 1800x900, 1200x600, 900x450. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
