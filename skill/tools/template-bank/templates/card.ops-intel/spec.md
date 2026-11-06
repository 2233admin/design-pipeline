# card.ops-intel

Intel card: a folder strip of unreadable micro-text over a hairline card, a picture, a pin, date, title, summary and an amber 'read more'.

Style: `milspec-ops` (`styles/milspec-ops/style.json`). News and notices on a dark site; a briefing card in game.

## Where it comes from

Measured on the reference: cards 483 x 412 at a 497 pitch, banner 478 x 269, date 15, title 24.25 bold, summary 15, read-more 14.25 #F5D659, pin 38 x 39. Borrow grammar, never assets: the reference site is measured privately and nothing from it is shipped; all copy is the case's own original fiction (寂原行动).

Samples: stillfield/news.

- Reference: card hover lifts 27 px over 0.3 s.
- Case: titles longer than the budget are cut with an ellipsis on desktop and wrap to two lines on the phone.

## Relations to keep

- Card 483 x 412 under a 12-unit strip (a 112-unit tab and a 4-unit line); picture 478 x 269 inset 2.5 and 14.
- Text block from y 295: date 15, title 22 bold, summary 15, more 14 amber; 28-unit side margin.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `media` | image | - | - | picture 478 x 269 |
| `date` | text | 10 | num | 2026/10/28 |
| `title` | text | 16 | head | 第三赛季「静默潮汐」开启！ |
| `summary` | text | 22 | body | 北港码头夜战地图上线，撤离点全面重排！ |
| `more` | text | 6 | body | 阅读更多 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `pin` | decoration | true / false | true | the amber pin flag |

## Decoration

- The strip, its micro-text bars, the hairline and the pin glyph: drawn.

Sizes: 483x424, 966x848, 1449x1272. A passing check is technical conformance only, not visual acceptance.
