# banner.survey-timeline

Version timeline: the date rail with black date chips (the current one yellow), category columns, hatched empty lanes and four event bars with kind chips.

Style: `frontier-survey` (`styles/frontier-survey/style.json`). A version calendar or schedule strip. current picks the highlighted date chip; event bars are drawn fills (pictures can be layered by the page).

## Where it comes from

The case's calendar section (site/index.html #calendar) as a parametric strip; layout from the reference's calendar. Borrow grammar, never assets: the reference site's screenshots are private and nothing from them is shipped; all copy is the case's own original fiction (远垦导线).

Samples: traverse/section-05.

- Reference: timeline 1761 x 39 under a 1697 x 366 head; date chips about 148 x 37 with 30 px white digits; event banners in lanes with a category icon column and -45 degree hatched empty ground.
- Case mobile first pass: an event's line-art object sat under its title on the narrow layout (1:1 ground); objects are dropped from event bars below 760 wide.

## Relations to keep

- 44 days across the lanes; date chips sit on the rail at their day; events start and end on their days.
- Lanes 104 units with 82-unit bars; categories own whole lanes; empty lane ground is hatched, never blank.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `date_1` | text | 5 | geo | 11.20 |
| `date_2` | text | 5 | geo | 12.04 |
| `date_3` | text | 5 | geo | 12.18 |
| `cat_1` | text | 4 | head | 招募 |
| `cat_2` | text | 4 | head | 活动 |
| `event_1` | text | 10 | head | 定向爆破 |
| `event_2` | text | 10 | head | 视差 |
| `event_3` | text | 10 | head | 越线测量 |
| `event_4` | text | 10 | head | 盐原拾遗 |
| `kind_1` | text | 4 | body | 限定招募 |
| `kind_2` | text | 4 | body | 限定招募 |
| `kind_3` | text | 4 | body | 限时活动 |
| `kind_4` | text | 4 | body | 限时活动 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-3 | 1 | current date chip |
| `last_len` | rhythm | 14-26 | 20 | length of the last event in days |

## Decoration

- Day ticks, contours inside bars, the tri-code rule, start-date tags: drawn.

Sizes: 1920x640. A passing check is technical conformance only, not visual acceptance.
