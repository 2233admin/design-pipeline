# card.atomic-credential

Credential / ID card: a condensed mission name, an emblem slot, a number, typed name and organisation on rules with small geometric labels, a rubber stamp.

Style: `atomic-age` (`styles/atomic-age/style.json`). Badges, passes, tickets, name cards, membership cards.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's credential panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/credential.

- card #FBEFC5 52%, ink 9%
- aspect 2.44

## Relations to keep

- Mission name and number at 0.27 H, the emblem between them.
- Two typed lines on rules at 0.62 and 0.86 H, labels under the rules.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `paper` | image | - | - | aged sheet from materials generate --generator paper (ground layer: sampled for contrast); empty draws the flat ink |
| `emblem` | image | - | - | mark slot for the owner's logo, insignia or emblem file (PNG or SVG with alpha), placed with fit contain; square, 0.17 W, between the name and the number; keep clear space of 0.15 of its side; never drawn by the template |
| `mission` | text | 12 | display | HALCYON |
| `number` | text | 3 | display | 7 |
| `name` | text | 24 | mono | IRIS MALLORY |
| `name_label` | text | 12 | geo | NAME |
| `org` | text | 26 | mono | PALM MESA GAZETTE |
| `org_label` | text | 14 | geo | ORGANIZATION |
| `stamp` | text | 8 | geo | PRESS |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `hole` | decoration | true / false | true | lanyard slot |
| `stamp` | decoration | true / false | true | rubber stamp |

## Decoration

- lanyard slot, rules, stamp frame

Sizes: 1500x620, 750x310. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
