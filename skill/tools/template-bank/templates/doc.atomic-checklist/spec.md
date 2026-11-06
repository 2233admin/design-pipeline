# doc.atomic-checklist

Checklist page: five punched holes, a centred title, section bars, numbered steps with dotted leaders, values and boxes, an attitude diagram, a rubber stamp.

Style: `atomic-age` (`styles/atomic-age/style.json`). Checklists, procedures, inspection sheets, onboarding steps.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's lunar_orbit, flightplan_small panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/lunar_orbit.

- sheet #FEFEFE 73%, ink 7.5%
- five holes along the top edge (ring binder)

## Relations to keep

- Five holes on the top edge at 0.1-0.9 W; title centred at 0.085 H.
- Rows 0.031 H; a dotted leader from the item to its value; boxes at the right margin.
- Diagram band from 0.715 H: a shaded body (code dot screen), axis lines, the craft.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `paper` | image | - | - | aged sheet from materials generate --generator paper (ground layer: sampled for contrast); empty draws the flat ink |
| `craft` | image | - | - | line-art spacecraft drawing (period technical illustration), transparent; never drawn |
| `title` | text | 36 | geo | STATION APPROACH CHECKLIST |
| `card_id` | text | 14 | mono | CARD 3-55 |
| `phase` | text | 22 | mono | RENDEZVOUS PHASE |
| `section_{i}` | text | 24 | monob | PRE-APPROACH / BRAKING / STATION KEEPING |
| `n_{i}` | text (derived) | 2 | mono | step numbers |
| `item_{i}` | text | 26 | mono | RADAR - LOCK / RANGE RATE - CHECK / ATTITUDE HOLD - ON / DOCKING LIGHT - ON / THRUST - 2 SEC BURN / RANGE - LOG / PITCH - 20 DOWN / RATE - NULL / CLOSING - 1 FT/S / TARGET - CENTRE / PROBE - EXTEND / CAPTURE LATCH - ARM |
| `value_{i}` | text | 9 | mono | TRACK / -12 FT/S / AUTO / BRIGHT / T+0 / 1.2 NM / 20° / 0.0 / 1.0 / +/-2° / OUT / ARMED |
| `axis_{i}` | text | 18 | mono | LOS EARTH / LOCAL HORIZONTAL / SUN 60 DEG |
| `stamp` | text | 10 | geo | APPROVED |
| `stamp_date` | text | 12 | monob | MAY 4 1961 |
| `page_id` | text | 10 | mono | 3-55a |
| `revision` | text | 14 | mono | Revision A |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `sections` | proportion | 2-3 | 3 | section bars |
| `rows` | proportion | 3-4 | 4 | steps per section |
| `checked` | decoration | 0-12 | 5 | ticked boxes |
| `craft` | decoration | glyph / slot | glyph | slot: a line-art craft image over the diagram |
| `holes` | decoration | true / false | true | five holes along the top |
| `stamp` | decoration | true / false | true | rubber stamp |
| `annotations` | decoration | true / false | true | ballpoint ticks |

## Decoration

- holes, section bars, leaders, boxes, ticks, diagram lines, stamp frame

Sizes: 1700x2200, 1275x1650, 850x1100. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
