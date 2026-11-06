# doc.atomic-flight-plan

Flight-plan page: a two-hour time ladder (a tick a minute, a long one every ten), bracket and dotted rails, typed events at their minute, a rest period, a boxed checklist, an edition table, punched holes.

Style: `atomic-age` (`styles/atomic-age/style.json`). Schedules, run sheets, timetables, production plans and mission timelines.

## Where it comes from

k-means palette (6 clusters, OKLab-free RGB on a 160 px reduction), light and dark shares, visual-weight centre and proportions read on the board's flightplan, flightplan_small panel. Borrow grammar, never assets: the board is private and nothing from it is shipped; the default copy is our own original fiction (Halcyon Orbital Lines). Marks are empty image slots; the template never draws a logo, insignia or emblem.

Samples: moodboard/flightplan.

- sheet #E9E6E0 / #FEFEFE, ink #0B0B0B 6%; no chroma
- two hours to a page, 120 ticks, labels every ten minutes
- table: MISSION | EDITION | DATE | TIME | DAY/REV | PAGE

## Relations to keep

- Ladder rail at 0.32 W from 0.115 to 0.83 of H: 120 ticks, long every ten, labels right aligned left of the rail.
- Bracket rail 0.37 W, network rail 0.395 W with vertical letters, dotted rail 0.42 W; events from 0.44 W.
- Edition table 0.84 W wide at 0.865 H, six columns.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `paper` | image | - | - | aged sheet from materials generate --generator paper (ground layer: sampled for contrast); empty draws the flat ink |
| `code` | text | 8 | monob | OPS-2 |
| `header` | text | 16 | geo | FLIGHT PLAN |
| `zone_time` | text | 10 | mono | 0815 GMT |
| `tick_{i}` | text (derived) | 6 | mono | ladder labels from start_hour |
| `net` | text | 6 | mono | RELAY |
| `period` | text | 30 | mono | REST PERIOD (8 HOURS) |
| `event_{i}` | text | 60 | mono | WATER TANK CHANGE NO. 4 (3 INTO B, STOW 4 IN C2) / REPORT CABIN TEMP AND PRESSURE / MEAL PERIOD - ALL / O2 CELL PURGE / V22 - SEND STATE VECTOR TO PAD |
| `box_title` | text | 14 | mono | POST SLEEP |
| `box_line_{i}` | text | 13 | mono | CREW STATUS / CYCLE FANS / ALIGN GYROS / CONSUMABLES / SELECT NORMAL / LOG ATTITUDE |
| `note` | text | 14 | hand | 08:41 ok |
| `margin_note` | text | 14 | hand | check |
| `side_{i}` | text | 16 | mono | UPLINK / STATE VECTOR / TARGET LOAD |
| `col_{i}` | text (derived) | 8 | geo | table heads |
| `cell_{i}` | text | 14 | mono | HALCYON 7 / FINAL / JUNE 2, 1961 / 40:00-42:00 / 3/27 / 3-41 |
| `form` | text | 24 | mono | FORM OP-7 (MAY 61) |
| `branch` | text | 30 | geo | FLIGHT PLANNING SECTION |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `start_hour` | proportion | 0-299 | 40 | the first hour on the ladder |
| `period_end` | proportion | 30-70 | 56 | minute where the long period ends |
| `events` | proportion | 3-5 | 5 | typed events after the period |
| `holes` | decoration | true / false | true | three punched holes along the top |
| `annotations` | decoration | true / false | true | unsigned ballpoint ticks and notes |

## Decoration

- ladder ticks, rails, period line, checklist box, ballpoint ticks, table rules, holes

Sizes: 1700x2200, 1275x1650, 850x1100. Render with `--font-dir` holding the pack's faces. A passing check is technical conformance only, not visual acceptance.
