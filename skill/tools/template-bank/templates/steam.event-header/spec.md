# steam.event-header

Steam event header (1920x622) from the one lithograph key design: the title rides the paper beam.

Style: `cassandre-litho` (`styles/cassandre-litho/style.json`). Event page header: one line of event copy on the sea. One of the steam.* family: render every size from the same copy and palette; each size is re-composed, not cropped. Steam's graphical-asset rules allow only art, the game name and an official subtitle on capsules.

## Where it comes from

Composition row for 1920x622 from the case's final2.cjs (tower foot and lantern, beam angle, spread and length, title distance, size and tilt), scaled to the canvas; halftone and glow drawn as dot patterns instead of the case's PNG screens. Sizes checked against the Steamworks graphical-asset documentation (accessed 2026-11-05).

Samples: steam-capsules/final/event-header_1920x622.

- Round 2 final: 0 findings; title ink on paper light 14.42:1.
- OCR reads the tilted, slit title poorly at large sizes (2 of 11 sizes): a real cost of the bold title, judged by eye instead.

## Relations to keep

- The title sits inside the paper beam, on its axis, tilted with it (-12 to +8 degrees): it is the thing the light finds.
- The monument is seen from below, bleeds off the bottom edge and is printed out of register over a rust plate.
- Vermilion field dominates; the light is unprinted paper; the beam's far end dissolves into halftone; no gradients.
- Every size is its own composition from the same parts: never crop one asset into another.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title` | text | 4 | display | 远灯 |
| `title_latin` | lettering | 10 | - | FARLAMP |
| `monument` | image | - | - |  |
| `event_line` | text | 20 | label | 试玩更新 · 雾港群岛新增 12 关 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `title_at` | proportion | 0.34-0.46 | 0.4 | title centre along the beam, as a fraction of its length from the lantern (keeps the whole title in the paper light) |
| `title_scale` | rhythm | 0.92-1.06 | 1 | title size against the measured size for this asset |
| `misregister` | rhythm | 2-6 | 4 | ink plate offset over the rust under-plate, px at this size |
| `dots_at` | proportion | 0.5700000000000001-0.73 | 0.65 | where the halftone starts eating the beam (fraction of its length) |
| `rays` | decoration | true / false | true | secondary rays in the light orange |
| `boats` | decoration | true / false | true | boats on the sea |

## Decoration

- Halftone glow around the lantern, secondary rays, sea dashes, boats, beam slits through the title.

Sizes: 1920x622. A passing check is technical conformance only, not visual acceptance.
