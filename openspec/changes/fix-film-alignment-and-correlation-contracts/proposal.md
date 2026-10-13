## Why

The structural fallback for planned film cuts currently accepts `change = 1 - r` above a one-sided inclusive threshold. A contrast inversion with `r = -0.9` therefore counts despite retaining 81% shared structure; exact correlation boundaries also count despite the declared strict `r² < 0.5` criterion.

The tracking HUD alignment scenario says the full-lens centroid must meet the projection tolerance, while the archived design decision, maintained guide and probe enforce camera-stage alignment and report LED/full-lens centroid shifts as deliberate artistic effects. This followup formalizes that existing design without modifying the archive or introducing a failing-default full-lens gate.

## What Changes

- Enforce both strict structural-correlation bounds while preserving native-frame timing, preceding-step calmness and the existing result shape.
- Add permanent boundary and consumer-visible lossless inversion regressions to the existing film continuity test file; keep the existing dark-cut, dissolve and whip coverage.
- Replace the alignment scenario with explicit camera-stage marker/glyph budgets of 1 px / 3 px. LED/full-lens centroid offsets remain measured and reported separately, never full-lens alignment acceptance. Full-lens pixels remain covered by determinism.

## Capabilities

### Modified Capabilities

- `design-pipeline`: planned structural cut correlation and tracking HUD alignment evidence.

## Impact

Reuse `structureSteps`, `structureCut`, `evaluateFilmRender`, the existing probe result fields and existing film gates. No new commands, schemas, receipts, threshold tuning, vendor changes or archived-record edits. Implementation and regressions touch `skill/scripts/film-core.cjs` and `tests/film-continuity.test.cjs`; consolidated specification and changelog integration belong to the parent reviewer. The probe already implements the chosen alignment distinction and requires no runtime change.
