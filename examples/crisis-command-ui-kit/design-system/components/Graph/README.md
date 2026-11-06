# Graph

Graph board: a 1px grid with a heavier line every 5 cells, one bright trace over dim ones, and a dashed threshold.

## Provide

Seed, label, threshold; `data-live-trace` scrolls the main trace.

## Use

Live metrics over time.

## States

- Live: the main trace scrolls every 100ms.
- Reduced motion: still.

## Don't

- One bright trace only.
- Do not fill under the trace.
