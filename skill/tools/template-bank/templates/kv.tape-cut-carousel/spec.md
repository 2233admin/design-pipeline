# kv.tape-cut-carousel

Section screen: an acid slab and a white slab cut at 49 degrees with a stripe band between, the title block, a picture card with caption, a 'more' capsule and a carousel control.

Style: `street-tape` (`styles/street-tape/style.json`). A full section of a game site (news, media, archive) at 16:9: one picture with its caption and a carousel. control=track gives a capsule track with three thumbs; control=dots gives dots.

## Where it comes from

The case's news section (1920 x 1080) with the carousel of its characters section; angles and radii from the board. Borrow grammar, never assets: the reference board is private and nothing from it is shipped; all copy is the case's own original fiction (回放街区).

Samples: replay-ward/section-04.

- Board: slab corner radius about 48 px; container cut dx/dy 0.867 (49 degrees); acid 22% of the news section.
- Case: 0 findings at 1920 x 1080 after the logo and glyph fixes.

## Relations to keep

- Acid slab corner at 0.39-0.41 W, radius 52; white slab corner one stripe band (196 units) to its right; both cuts at 49 degrees (below 0.39 the number runs off the acid onto the stripes).
- Title block at x 290 (or ending 290 from the right), top at 338; picture card 800 x 400 in the white slab, caption under it.
- Acid only on the slab, the tag, the current thumb or dot.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title_cjk` | text | 5 | head | 新闻资讯 |
| `title_latin` | text | 14 | label | NEWS & INFO |
| `number` | text | 2 | num | 04 |
| `media` | image | - | - |  |
| `tag` | text | 4 | head | 公告 |
| `date` | text | 10 | label | 2026/11/05 |
| `headline` | text | 24 | head | 1.3 版本「霜降夜频」更新维护预告 |
| `more_label` | text | 4 | head | 查看更多 |
| `ghost_latin` | text | 8 | num | NEWS |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `side` | decoration | left / right | left | title edge; right mirrors the slabs |
| `cut_x` | rhythm | 0.39-0.41 | 0.4 | acid slab corner x / W |
| `control` | decoration | track / dots | track | carousel control |
| `items` | decoration | 3-8 | 6 | number of dots (control=dots) |
| `active` | decoration | 1-8 | 1 | current dot |
| `ghost` | decoration | true / false | true | ghost letters on the stripe band |
| `film` | decoration | true / false | true | film strip over the band |

## Decoration

- Stripe band, film strip, ghost letters, thumbs, arrows, dots: drawn.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.
