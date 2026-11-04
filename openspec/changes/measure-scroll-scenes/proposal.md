## Why

A scroll-driven scene (a section pinned while its content animates with scroll progress) can be
broken in two ways nobody sees in one screenshot. It never starts: the script that drives it failed
to load or threw, its scroll timeline is bound to the wrong element, or it shows its finished
composition from the first pixel of scroll. Or it never rests: a scrub lag, an easing loop that
never reaches its target or a loop left running under reduced motion keeps the scene moving after
the reader stops scrolling. `verify interaction` drives pointer, wheel and click input against one
target and an audit of the static page; nothing photographs a scene at fixed points of its scroll
progress or checks that it settles there (#242).

## What Changes

- `interaction.json` (`design-pipeline.interaction-probe.v1`) accepts a third named probe kind,
  `"kind": "scroll"`, with `id`, `target` and optional `points` (default 10), `settleMs` (default
  1200, the motion probe's settle default), `restWindowMs` (default 300) and `viewports` (default
  desktop 1440x900 and phone 390x844 `mobile: true`). Planned waiting is capped at 120 s per probe.
- The existing interaction capture (`capture-interaction.cjs` through `interaction-capture-core.cjs`)
  loads the page per viewport twice, with `prefers-reduced-motion` `no-preference` and `reduce`, and
  scrolls instantly to the scene's progress points: before, 0 %, 10 % ... 100 %, after. At each it
  waits `settleMs`, records the scene state and a screenshot, waits `restWindowMs` and records how
  far the scene still moved.
- The evaluator adds two findings to the existing interaction result, each with a concrete `fix`:
  `scroll-never-started` (motion pass: no progress point differs from the 0 % frame) and
  `scroll-never-rests` (any pass: a held position still changed in the rest window). Page errors
  seen during the pass are named in the never-started message. Requests outside the project fail
  with the existing `external-request` finding.
- `verify interaction` writes one labelled contact sheet per viewport and pass under
  `<output>/scroll/` and gives the kernel the probe's planned time on top of its usual minute.
  Native completion re-reads scroll rows like journey and audit rows.

## Capabilities

- `design-pipeline`: ADDED `Scroll scenes are measured across their progress`.

## Reuse

- The interaction probe document, capture kernel, evaluator, result schema, gate record, request
  lineage and `external-request` finding of `verify interaction`; `png-core.cjs` for pixels;
  `browser-locate.cjs` and the existing puppeteer resolution. No new command, gate, schema or flag.
- `motion-evidence-core.cjs` is not extended: it validates declared motion receipts, and a declared
  "scroll" lifecycle row would let a sentence stand in for this measurement.

## Impact

- Existing probe files are unchanged; a probe file without a scroll probe captures exactly as before.
- A scroll probe adds browser time (about 80 s planned waiting at the defaults, plus screenshots).
