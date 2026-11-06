# ui.ink-hud-frame

In-game descent HUD: a heading ruler, a depth ladder and readout, a viewport (abstract plate or image slot) in hairline corners with a reticle and the scale marker, three segmented gauges, a monitor comms panel and an alarm banner.

Style: `megastructure-ink` (`styles/megastructure-ink/style.json`). An in-game cockpit or terminal screen. view=drawn|slot; alert shows the banner; gauge_1-3 set the gauges (0-1).

## Where it comes from

The case's hud.html at 1920 x 1080. Borrow grammar, never assets: the reference images are private and nothing from them is shipped; all copy is the case's own original fiction (穹井). No figure, mecha or object is drawn; structure is an abstract line system.

Samples: megastructure-ink-kit/hud.

- Reference interface frames: edge density 2.4-3.2%, black 59%; monitor highlights about #77EEF3.

## Relations to keep

- Viewport 1224 x 712 at (308, 132) in 14-unit corners with a 120-unit reticle; the scale marker at its lower left.
- Ladder of 13 depths 24 units apart, the current one in signal; gauges of 24 cells at x 1568; comms monitor 920 x 168 with 3-unit scanlines.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `view` | image | — | — | (image: viewport 3840 x 2160, structure only) |
| `heading` | text | 5 | data | 214° |
| `plate` | text | 4 | body | 实况 |
| `plate_en` | text | 10 | wide | LIVE |
| `plate_note` | text | 12 | data | 03:12:44 |
| `depth_label` | text | 4 | body | 深度 |
| `depth_label_en` | text | 10 | wide | DEPTH |
| `depth` | text | 8 | data | −41,200 |
| `scale_small` | text | 8 | data | 1.7 m |
| `scale_large` | text | 10 | data | 3,400 m |
| `scale_ratio` | text | 11 | data | 1 : 2,000 |
| `gauge_1` | text | 4 | body | 外压 |
| `gauge_en_1` | text | 10 | wide | PRESSURE |
| `gauge_2` | text | 4 | body | 舱体 |
| `gauge_en_2` | text | 10 | wide | HULL |
| `gauge_3` | text | 4 | body | 氧 |
| `gauge_en_3` | text | 10 | wide | OXYGEN |
| `comms` | text | 4 | body | 队内 |
| `time_1` | text | 8 | data | 03:12:40 |
| `line_1` | text | 30 | body | S-07  回声晚到了半秒。 |
| `time_2` | text | 8 | data | 03:12:42 |
| `line_2` | text | 30 | body | S-19  别回话。 |
| `time_3` | text | 8 | data | 03:12:44 |
| `line_3` | text | 30 | body | S-23  后面干净。 |
| `alert` | text | 6 | body | 回声缺口 |
| `alert_en` | text | 12 | wide | ECHO GAP |
| `alert_text` | text | 28 | body | 右前方 1,240 m。保持静默。 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `view` | decoration | drawn / slot | drawn | draw the abstract viewport plate or leave the image slot |
| `seed_plate` | rhythm | 1-999 | 47 | seed of the viewport plate |
| `alert` | decoration | true / false | true | show the alarm banner |
| `gauge_1` | decoration | 0-1 | 0.74 | gauge 1 |
| `gauge_2` | decoration | 0-1 | 0.88 | gauge 2 |
| `gauge_3` | decoration | 0-1 | 0.31 | gauge 3 (alarm under 0.35) |

## Decoration

- Heading ticks, ladder, corners, reticle, gauge cells, scanlines, alarm triangle, the viewport plate: drawn.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
