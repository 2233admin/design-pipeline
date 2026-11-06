# ui.crisis-alert-wall

Alarm wall: a red honeycomb of elongated hexagons over a blue screen with a 45-degree lattice; the main panel carries two stamps, two lines of compressed Mincho and two of English; side panels a WARNING and a level mark; the lower row two vote seats and a mode box.

Style: `crisis-command` (`styles/crisis-command/style.json`). Emergency and escalation screens, outage pages, the alert state of a dashboard.

## Where it comes from

a reference film's alarm wall (3834 x 695 strip, left third): hexagon 835 x 273 in the frame (3.06:1), tips 55 degrees, stamp 140 x 125, WARNING cap 40, red #BA0623 over blue #49688B. Borrow grammar, never assets. The frames of the reference are private and nothing from them is shipped; all copy is the case's own original fiction (潮位警报 TIDEMARK).

Samples: tidemark/crisis-alert-wall.

- Reference: hot 32%, dark 6%, weight centre (0.51, 0.44).
- Case: 第九排涝区 / 转入防潮战备 at 0 findings.

## Relations to keep

- Hexagons 3.06:1 with 55-degree tips; the main one 1274 x 417 at the top centre, side ones behind it, a lower row of two.
- Double rules 6 and 2 units, 12 apart; stamps 214 x 191.
- Mincho on the panels at 0.85, English at up to 0.9, under the CJK.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title_1` | text | 7 | head | 第九排涝区 |
| `title_2` | text | 7 | head | 转入防潮战备 |
| `latin_1` | text | 32 | grot | TRANSFER OF DRAINAGE ZONE 9 |
| `latin_2` | text | 32 | grot | TO FLOOD COMBAT READINESS |
| `stamp_left` | text | 2 | head | 警报 |
| `stamp_right` | text | 2 | head | 警报 |
| `warning_left` | text | 9 | grot | WARNING |
| `warning_right` | text | 9 | grot | WARNING |
| `level_left` | text | 9 | grot | LEVEL 3 |
| `level_right` | text | 9 | grot | LEVEL 3 |
| `seat_cjk_1` | text | 7 | head | 表决席 · 一 |
| `seat_latin_1` | text | 10 | grot | QUINTET 1 |
| `seat_cjk_2` | text | 7 | head | 表决席 · 四 |
| `seat_latin_2` | text | 10 | grot | QUINTET 4 |
| `mode` | text | 16 | grot | MODE: CONTAIN |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `scanlines` | decoration | true / false | true | CRT scanlines over the whole screen (3-unit period, 14%) |

## Decoration

- The lattice, rules and scanlines are drawn and exempt.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
