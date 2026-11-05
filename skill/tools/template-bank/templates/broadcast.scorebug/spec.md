# broadcast.scorebug

Scorebug as a strip of tape: stencil codes and scores on black and ink plates, a paper centre with map and clock; reflows at half size.

Style: `xerox-flyer` (`styles/xerox-flyer/style.json`). A live scorebug for a two-team best-of series over gameplay; --param scale=half reflows it for a picture-in-picture or mobile window (not a uniform shrink). Match point: --param sticker=true; technical pause: --param centre_frame=dashed with the pause copy in centre_label / centre_title / clock.

## Where it comes from

Rebuilt from the case's scorebug(state, {f}) flex layout as explicit geometry: widths come from the lettering and the text model, so the plates fit their copy; the half-scale reflow follows the case's rule (max(min size, size x f), bridges off below 0.75).

Samples: esports-broadcast/01-scorebug, esports-broadcast/01b-scorebug-onair.

- Case v2: scorebug first pass 1 tool finding (a ransom scrap fell back to Barlow and lost a CJK glyph) and 3 by eye; on-air composite 5 (sticker off-canvas 3, a missing ▸ glyph 2); final 0.
- 50% reflow: smallest text 11 px in the case (MAP 4 · BO5); this template keeps the bank's 12 px minimum.

## Relations to keep

- Team A prints pink, team B prints paper white, everyone else black and white: teams differ by code, not only colour.
- The whole bug tilts -1.2 degrees with one hard 6 px black shadow; the sticker -4 degrees over its top-left corner.
- At half scale nothing goes under 12 px and the stencil bridges go (they close up at 20 px).

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `feed` | image | - | - |  |
| `team_a_code` | lettering | 4 | - | ANV |
| `team_a_name` | text | 4 | sans | 铁砧 |
| `score_a` | lettering | 2 | - | 12 |
| `team_b_code` | lettering | 4 | - | NFR |
| `team_b_name` | text | 4 | sans | 夜航 |
| `score_b` | lettering | 2 | - | 9 |
| `centre_label` | text | 12 | num | MAP 4 · BO5 |
| `centre_title` | text | 4 | sans | 熔炉站 |
| `clock` | text | 5 | num | 1:42 |
| `sticker_{i}` | text | 1 | sans | 赛 / 点 / ! |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `scale` | proportion | full / half | full | half = the 50% reflow: every text max(12 px, size x 0.5), codes and scores drop their spray bridges |
| `maps_a` | decoration | 0-3 | 2 | maps won by team A (pips) |
| `maps_b` | decoration | 0-3 | 1 | maps won by team B (pips) |
| `centre_frame` | decoration | solid / dashed | solid | dashed = paused |
| `sticker` | decoration | true / false | true | the ransom-note match-point sticker above team A |
| `backdrop` | decoration | true / false | true | draw the gameplay feed slot under the bug (false: a transparent overlay) |

## Decoration

- Map pips, spray bridges, the dashed pause frame, the feed placeholder.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
