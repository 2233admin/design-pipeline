# ui.ink-topbar

Top bar: rail-script mark, compressed name, Latin name, seven nav items labelled with their depth, a silence indicator and one signal button.

Style: `megastructure-ink` (`styles/megastructure-ink/style.json`). The fixed 56-unit bar of a game site. current picks the highlighted nav item (1-7).

## Where it comes from

The case's top bar at 1920. Borrow grammar, never assets: the reference images are private and nothing from them is shipped; all copy is the case's own original fiction (穹井). No figure, mecha or object is drawn; structure is an abstract line system.

Samples: megastructure-ink-kit/topbar.

- Case: bar 56, nav labels 13 / depths 10, button 92 x 32.

## Relations to keep

- Bar 56 units on ground with a rule2 seam; nav from x 318, each item a 13-unit label over a 10-unit depth; the current item and its depth in signal with a 2-unit underline.
- One signal fill only (the button); the live square is 6 units.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `brand_cjk` | text | 4 | head | 穹井 |
| `brand_latin` | text | 12 | wide | VAULTWELL |
| `silence` | text | 2 | body | 静默 |
| `cta` | text | 4 | body | 预约下潜 |
| `nav_1` | text | 4 | body | 首层 |
| `depth_1` | text | 7 | data | −000 |
| `nav_2` | text | 4 | body | 穹井 |
| `depth_2` | text | 7 | data | −120 |
| `nav_3` | text | 4 | body | 测深署 |
| `depth_3` | text | 7 | data | −860 |
| `nav_4` | text | 4 | body | 缄默体 |
| `depth_4` | text | 7 | data | −2,410 |
| `nav_5` | text | 4 | body | 接线台 |
| `depth_5` | text | 7 | data | −3,377 |
| `nav_6` | text | 4 | body | 通讯 |
| `depth_6` | text | 7 | data | −3,960 |
| `nav_7` | text | 4 | body | 下潜 |
| `depth_7` | text | 7 | data | −4,112 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-7 | 1 | highlighted nav item |

## Decoration

- Rail-script mark, seam, live square, menu button: drawn.

Sizes: 1920x56, 2880x84. A passing check is technical conformance only, not visual acceptance.
