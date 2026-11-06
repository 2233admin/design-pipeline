# ui.crisis-countdown

Countdown bezel: a chamfered amber bezel with a bracketed Mincho label, a capsule-digit clock with Mincho units, a slanted LCD elapsed clock, a row of four mode cells and a danger cell, two supply plates (one lit).

Style: `crisis-command` (`styles/crisis-command/style.json`). Countdowns, launch and deadline screens, live timers on a status page.

## Where it comes from

a reference film's clock (strip, middle third): digits 0.36 wide per digit with gap, units 0.21, label 0.27 in bracket bars; a reference countdown's mode row and danger cell; frame-by-frame red share of the danger cut. Borrow grammar, never assets. The frames of the reference are private and nothing from them is shipped; all copy is the case's own original fiction (潮位警报 TIDEMARK).

Samples: tidemark/crisis-countdown.

- Reference: hot 21-31%, weight centre (0.41-0.49, 0.50).
- Case: 蓄压剩余 04:59:58 at 0 findings in both states.

## Relations to keep

- Units at 0.21 of the digit height, the label at 0.27 between vertical bracket bars.
- The elapsed clock at 0.32 of the main clock, slanted 6 degrees.
- Bezel corners cut at 45 degrees; one mode cell lit.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `label` | text | 6 | head | 蓄压剩余 |
| `label_latin` | text | 30 | grot | RESERVE PRESSURE REMAINING |
| `clock` | lettering | 8 | drawn segments | 04:59:58 |
| `unit_h` | text | 1 | head | 时 |
| `unit_m` | text | 1 | head | 分 |
| `unit_s` | text | 1 | head | 秒 |
| `t_label` | text | 12 | grot | T+ ELAPSED |
| `elapsed` | lettering | 11 | drawn segments | 00:12:07.53 |
| `mode_1` | text | 8 | grot | HOLD |
| `mode_2` | text | 8 | grot | LOW |
| `mode_3` | text | 8 | grot | NORMAL |
| `mode_4` | text | 8 | grot | SURGE |
| `danger_1` | text | 10 | grot | DANGER |
| `danger_2` | text | 10 | grot | EMERGENCY |
| `plate_cjk_1` | text | 2 | head | 内蓄 |
| `plate_latin_1` | text | 9 | grot | RESERVE |
| `plate_cjk_2` | text | 2 | head | 外接 |
| `plate_latin_2` | text | 9 | grot | LINKED |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `state` | decoration | normal / danger | normal | danger turns the ink red-orange and fills the danger cell (a hard cut) |
| `mode` | decoration | 1-4 | 3 | the lit mode cell |
| `supply` | decoration | 1-2 | 1 | the lit supply plate |
| `scanlines` | decoration | true / false | true | scanlines inside the bezel |

## Decoration

- Hazard stripes on the lit plate, the bezel's inner rule, scanlines and the mark are drawn and exempt.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
