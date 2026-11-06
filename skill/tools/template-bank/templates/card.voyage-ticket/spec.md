# card.voyage-ticket

Gilt news ticket: a rounded frame (37.5) around a picture inset 8 units (22.5 corners, a 1-unit gold rim), a dark caption bar with a gold tick, and the ticket perforation.

Style: `celestial-voyage` (`styles/celestial-voyage/style.json`). One news or event card; active=false drops the gold rim for the cards beside the current one.

## Where it comes from

The case's news ticket at the reference card size. Borrow grammar, never assets: the reference captures are private and nothing from them is shipped; all copy is the case's own original fiction (长庚航志).

Samples: vesperwake/section-02.

- Reference: card 626 x 518, corners 37.5 and 22.5, inner rim 1 px #C99D66, caption 27/36 px #CECECE with a 6 x 33 #E1B066 tick.
- Case: the perforation is the case's own signature for news (a boarding ticket), not in the reference.

## Relations to keep

- Outer corners 37.5, picture inset 8 with 22.5 corners; caption bar 140 units with a 6 x 33 gold tick and two 27/36-unit lines.
- The perforation (two half-circle bites and a dashed gold line) sits on the caption bar's top edge.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `cover` | image | - | - |  |
| `tag` | text | 2 | body | 版本 |
| `headline` | text | 34 | body | 《长庚航志》4.2 版本「星潮回声」PV——「潮水替我们记得」 |
| `date` | text | 10 | label | 2026.11.10 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `active` | decoration | true / false | true | gold rim and glow of the current card |

## Decoration

- Glow, corner masks, picture rim, bites and dashed perforation: drawn.

Sizes: 626x518, 1252x1036. A passing check is technical conformance only, not visual acceptance.
