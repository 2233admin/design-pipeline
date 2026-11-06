# kv.voyage-ticket-carousel

News section: a serif title with a Latin ghost, a row of gilt tickets on a 673-unit pitch (the current one rimmed gold), round arrows on the gaps, dots and a 'more +' capsule, over a navy star field with the left rail.

Style: `celestial-voyage` (`styles/celestial-voyage/style.json`). The news screen of an official site, or any row of cards with a current one.

## Where it comes from

The case's news section at 1920 with the reference's measured card pitch and title position. Borrow grammar, never assets: the reference captures are private and nothing from them is shipped; all copy is the case's own original fiction (长庚航志).

Samples: vesperwake/section-02.

- Reference: cards at x 198 and 871 (pitch 673), y 352; arrows at x 146 and 1678; more capsule at (1574, 866).
- Case first pass: edge-card captions ran off the canvas (off-canvas); now hidden at the edges.

## Relations to keep

- Title at (209, 163); the ghost overlaps the CJK's lower third.
- Cards 626 x 518 on a 673 pitch, the current at x 198; half a card shows at the left edge and one and a half at the right, their captions hidden.
- Arrows 98 across centred on the gaps at y 600; the 'more +' capsule 172 x 46 at (1578, 890).

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title_cjk` | text | 6 | head | 航志通讯 |
| `title_latin` | text | 12 | ghost | NEWS |
| `cover_1` | image | - | - |  |
| `tag_1` | text | 2 | body | 版本 |
| `headline_1` | text | 34 | body | 《长庚航志》4.2 版本「星潮回声」PV——「潮水替我们记得」 |
| `date_1` | text | 10 | label | 2026.11.10 |
| `cover_2` | image | - | - |  |
| `tag_2` | text | 2 | body | 角色 |
| `headline_2` | text | 34 | body | 乘员预告：守夜同盟·白鹭「天亮之前，我先替你引路」 |
| `date_2` | text | 10 | label | 2026.11.08 |
| `more` | text | 4 | body | 更多新闻 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `rail` | decoration | true / false | true | the left rail line and social column |
| `items` | rhythm | 3-8 | 6 | number of dots |

## Decoration

- Star dust, rail, edge cards, arrows, dots, perforations: drawn.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
