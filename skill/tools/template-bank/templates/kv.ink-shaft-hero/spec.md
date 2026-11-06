# kv.ink-shaft-hero

Key visual: an abstract ink shaft over the top 70%, a scale marker stating the person-to-structure ratio, a compressed name, a tagline, one signal button and three readouts on a black floor.

Style: `megastructure-ink` (`styles/megastructure-ink/style.json`). The first screen of a game site or a key visual. plate=drawn draws the abstract structure plate (no figure); plate=slot leaves an image slot for generated art.

## Where it comes from

The case's first screen at 1920 with the plate parameters of its hero slot. Borrow grammar, never assets: the reference images are private and nothing from them is shipped; all copy is the case's own original fiction (穹井). No figure, mecha or object is drawn; structure is an abstract line system.

Samples: megastructure-ink-kit/hero.

- Reference manga pages: structure covers 67-79% of the frame; figure height 8.2-8.8% of the frame.
- Case: plate texture over 54% of the screen, signal 0.54%.

## Relations to keep

- The plate fills y 0-70%; a void floor starts at 66% with a hairline seam; every line of type stands on the floor or on the scale marker's scrim.
- The name is 128 units at 900 compressed to 78% (scale 0.78 1); labels are 12 units: 10.7 : 1.
- The scale marker is a 10-unit tick beside a 420-unit bracket at (900, 360) with the ratio in signal.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `plate` | image | — | — | (image: structure plate 3840 x 2160, no figure) |
| `kicker` | text | 22 | body | 第 4,112 层 · 深 41,200 m |
| `title_cjk` | text | 4 | head | 穹井 |
| `title_latin` | text | 14 | wide | VAULTWELL |
| `tagline` | text | 16 | body | 向下，没有尽头。 |
| `cta` | text | 5 | body | 开始下潜 |
| `scale_small` | text | 8 | data | 1.7 m |
| `scale_large` | text | 10 | data | 3,400 m |
| `scale_ratio` | text | 11 | data | 1 : 2,000 |
| `label_1` | text | 4 | body | 当前深度 |
| `label_en_1` | text | 10 | wide | DEPTH |
| `value_1` | text | 8 | data | −41,200 |
| `label_2` | text | 4 | body | 已测层 |
| `label_en_2` | text | 10 | wide | SOUNDED |
| `value_2` | text | 8 | data | 4,112 |
| `label_3` | text | 4 | body | 回声 |
| `label_en_3` | text | 10 | wide | ECHO |
| `value_3` | text | 8 | data | 3.2 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `plate` | decoration | drawn / slot | drawn | draw the abstract plate or leave the image slot |
| `seed_plate` | rhythm | 1-999 | 11 | seed of the structure plate |

## Decoration

- Structure plate (frames, screentone, seams, ribs, a beam, cables, light slit), the seam: drawn.
- The kicker's rail script spells title_latin in lowercase (decoration beside the kicker).

Sizes: 1920x1080, 3840x2160. A passing check is technical conformance only, not visual acceptance.
