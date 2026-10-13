# w2: render carry-cut, stillness and film check carryScore

Read `_common.md` first.

## Goal

Measure continuity on the rendered film.

1. In `evaluateFilmRender` (`skill/scripts/film-core.cjs`, render section): after cuts are
   detected, for every beat except the first whose `handoff` is `continuation`, `morph` or
   `camera-carry`, if a detected cut lies within `cutTolerance` of `beat.startSec`, add the error
   `carry-cut` with the beat id ("planned <handoff> at <t>s renders as a scene cut"). `match-cut`
   is a cut by design and is exempt.
2. Add a top-level render result field `stillness: { stillShare }`: the share of 10 fps motion
   samples whose changed share is below the existing `FROZEN_SHARE`, 3 decimals. Keep `motion` as
   the per-beat array. Report only; no finding.
3. In `checkFilmProject` (`skill/scripts/film-project-core.cjs`), compute `carryScore` over the
   planned carried boundaries (continuation, morph, camera-carry; not the first beat; not
   match-cut). A boundary counts as carried when (a) the timeline gate did not report
   `handoff-not-carried` for that beat, or the timeline gate did not run, and (b) the render gate
   did not report `carry-cut` for that beat, or the render gate did not run. If neither gate ran,
   `carryScore` is null. Return it with `carriedBoundaries` and `plannedCarriedBoundaries`,
   following the shape the check result already uses for metrics. With at least 3 planned carried
   boundaries and `carryScore < 0.6`, the check fails with the finding `low-carry`. Give it a fix
   in `film-hints.cjs` (add a `check` section to `HINTS` if none fits).
4. Workflow: `film check` already records its result through `workflow.recordGate`; make sure a
   `low-carry` failure records `failed`.

## Tests

Render-level tests need ffmpeg and must skip without it, like the existing film render tests (see
how `tests/film-gates.test.cjs` and `tests/film-motion-rules.test.cjs` synthesize videos with
ffmpeg lavfi sources). Cover:

- a carried boundary with a hard scene change gives `carry-cut`;
- the same boundary with continuous motion gives no finding;
- match-cut is exempt;
- `stillness.stillShare` is present and higher for a mostly static clip than for a moving one;
- `carryScore` is computed, and `low-carry` fires on a project with 3 carried boundaries of which
  2 are cut. A unit test on an exported aggregation function is fine if a full render is too slow.

## Files

`skill/scripts/film-core.cjs` (render section only), `skill/scripts/film-project-core.cjs`
(check only), `skill/scripts/film-hints.cjs` (render and check hints only), tests, CHANGELOG.

Branch: `onetake-w2-render-carry`.
