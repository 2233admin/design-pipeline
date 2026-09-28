# Design

Source record: `skill/references/reference-skill-motion-web.md` (pinned `5f4e40f1`). Ideas are
taken from its public README only and restated here; the implementation is independent.

## Probe contract (brief w4)

`interaction.json`, schema `design-pipeline.interaction-probe.v1`:

```json
{
  "schema": "design-pipeline.interaction-probe.v1",
  "id": "hero-card-tilt",
  "url": "index.html",
  "viewport": { "width": 1280, "height": 800 },
  "probes": [
    {
      "id": "card-follows-pointer",
      "target": "#card",
      "input": { "kind": "pointer-sweep", "from": [200, 400], "to": [1080, 400], "durationMs": 600 },
      "expect": { "responds": true, "settleWithinMs": 1200, "returnsToRest": true, "response": "spring" }
    }
  ]
}
```

- `input.kind`: `pointer-sweep` (from, to, durationMs), `wheel` (deltaY, steps, intervalMs),
  `click` (at). Coordinates are viewport pixels.
- Sampling: an in-page `requestAnimationFrame` recorder stores, per frame, the target's bounding
  box and computed `transform` and `opacity`, from 200 ms before the input to
  `settleWithinMs` after it ends (capped at 5 s).
- Findings (errors unless noted):
  - `dead-interaction`: `responds: true` but the target's box and transform never change.
  - `no-settle`: the target still moves more than 0.5 px per frame at `settleWithinMs` after input.
  - `rest-drift`: `returnsToRest: true` but the final box differs from the pre-input box by more
    than 1 px.
  - `linear-response` (warn): `response: "spring"` but no overshoot past the final value and the
    speed profile has no acceleration or deceleration phase.
  - `opacity-only`: opacity changes while the box and transform stay fixed.
  - `external-request`: any request during load or probing to an origin other than the page's own
    (or `file:`); lists the URLs.
- Result schema `design-pipeline.interaction-result.v1` with per-probe samples summary (peak
  displacement, overshoot, settle time) and findings, each with `fix` (film-hints style, new
  `interaction` section or a small hints map in the new core).
- CLI: `verify interaction --probe interaction.json [--output <dir>] [--chrome <exe>]
  [--puppeteer-module <path>]`, run in a child process like `film capture-timeline`. Exit codes
  follow the CLI convention (0 passed, 2 gate failed, 1 usage). Records the `interaction` gate
  through `workflow.recordGate` when the probe file sits in a project with state.

## Primitive and guide (brief w6)

- `spring-settle` in `motion-primitives.json`: channels position/rotation/scale, parameters
  stiffness, dampingRatio, mass, restValue, overshootLimit; drivers pointer, state, scroll;
  provenance `kind: idea`, source the motion-web record, `codeCopied: false`.
- `references/web-motion.md`: why motion is material, spring-damper parameters and what
  dampingRatio does (below 1 overshoots, 1 critical), stepped motion as a deliberate style, and how
  `verify interaction` checks it.

## Web sub-workflow (brief w5)

- `skill/scripts/workflows/web.cjs` and `references/workflow-web.md`, same shape as film and edit.
- Stages. quick: build, probe. standard/full: intake, reference, concepts, build, probe, review,
  deliver. `full` keeps the OpenSpec instruction from step 1.
- `probe` finishes when the `interaction` gate passed and is not older than `interaction.json` or the
  page file. Its action runs `verify interaction --probe interaction.json`; if `interaction.json`
  is missing, the action says to write one probe per key interaction.
- `ui` keeps the step 1 behavior.
