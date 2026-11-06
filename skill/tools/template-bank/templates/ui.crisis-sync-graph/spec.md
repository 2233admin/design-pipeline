# ui.crisis-sync-graph

Coupling board: a Mincho label over a capsule-digit ratio, the threshold line in red-orange, a gridded graph board with three traces and a dashed border, and a row of five vote stamps with one dissent.

Style: `crisis-command` (`styles/crisis-command/style.json`). Live metrics with a threshold, consensus or approval states, monitoring dashboards.

## Where it comes from

the film remake's analysis HUD and the broadcast's command graphs: thin grids with a heavier line every 5 cells, one bright trace over dim ones, labels hung on the right end of a threshold. Borrow grammar, never assets. The frames of the reference are private and nothing from them is shipped; all copy is the case's own original fiction (潮位警报 TIDEMARK).

Samples: tidemark/crisis-sync-graph.

- Reference: dark 40%, hot 3%, weight centre (0.52, 0.52).
- Case: 耦合率 41.3% with one dissent at 0 findings.

## Relations to keep

- The ratio's capsule digits at 250 units over a 22-unit Latin caption (about 1:11).
- A heavier grid line every 5 cells; the main trace 3 units, the others 1.5.
- Five equal stamps; only the dissent is red.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `label` | text | 5 | head | 耦合率 |
| `label_latin` | text | 20 | grot | COUPLING RATIO |
| `ratio` | lettering | 5 | drawn segments | 41.3 |
| `percent` | text | 1 | grot | % |
| `threshold` | text | 16 | head | 阈值 30.0 · 低于即切断 |
| `border_tag` | text | 14 | grot | BORDER 30.0% |
| `axis` | text | 24 | grot | T-120 S   /   NOW |
| `vote_label` | text | 6 | head | 五席表决 |
| `vote_result` | text | 12 | head | 可决 4 · 否决 1 |
| `seat_1` | text | 8 | grot | SEAT 1 |
| `seat_2` | text | 8 | grot | SEAT 2 |
| `seat_3` | text | 8 | grot | SEAT 3 |
| `seat_4` | text | 8 | grot | SEAT 4 |
| `seat_5` | text | 8 | grot | SEAT 5 |
| `verdict_1` | text | 1 | head | 可 (derived) |
| `verdict_2` | text | 1 | head | 可 (derived) |
| `verdict_3` | text | 1 | head | 可 (derived) |
| `verdict_4` | text | 1 | head | 可 (derived) |
| `verdict_5` | text | 1 | head | 可 (derived) |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `dissent` | decoration | 1-5 | 4 | the seat that votes no (red) |
| `trace_seed` | decoration | 1-99 | 7 | seed of the three traces |
| `scanlines` | decoration | true / false | true | scanlines over the board |

## Decoration

- Grid, traces, the dashed border and the stamps' frames are drawn and exempt.

Sizes: 1920x1080, 2560x1440. A passing check is technical conformance only, not visual acceptance.
