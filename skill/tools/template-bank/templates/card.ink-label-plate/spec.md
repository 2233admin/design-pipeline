# card.ink-label-plate

Monitor label plate with a readout: a square tile, a dark plate with a thin label and caps, a caption, and a large tabular value in hairline corners.

Style: `megastructure-ink` (`styles/megastructure-ink/style.json`). A HUD tile or a stat card. tone=panel|screen|alarm.

## Where it comes from

The case's LabelPlate and Readout components at 1:1. Borrow grammar, never assets: the reference images are private and nothing from them is shipped; all copy is the case's own original fiction (穹井). No figure, mecha or object is drawn; structure is an abstract line system.

Samples: megastructure-ink-kit/label-plate.

- Reference monitors: a dark label plate about 2.4% of frame height with a thin CJK label and a small caption.

## Relations to keep

- Tile 40 x 44 beside a 160 x 44 plate; the label tracked 0.3em; the value 56 units on a 1-unit rule in the tone's colour.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `plate` | text | 4 | body | 实况 |
| `plate_en` | text | 10 | wide | LIVE |
| `plate_note` | text | 12 | data | 03:12:44 |
| `label` | text | 4 | body | 当前深度 |
| `label_en` | text | 10 | wide | DEPTH |
| `value` | text | 8 | data | −41,200 |
| `unit` | text | 4 | data | m |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `tone` | decoration | panel / screen / alarm | panel | plate tone |

## Decoration

- Corners, tile marks: drawn.

Sizes: 720x200, 1440x400. A passing check is technical conformance only, not visual acceptance.
