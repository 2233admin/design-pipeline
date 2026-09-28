# Product film delta

## Requirement: storyboard gate
The pipeline SHALL validate `storyboard.json` against `design-pipeline.film-storyboard.v1`. It
SHALL fail open or gapped timelines, action beats without a product action or before/after
transformation, surface-only action motion, slideshow handoff patterns, dominant or chained holds,
unknown choreography ids, and scored films without an entry cue or beat-bound sound. It SHALL
report `creativeAcceptance: not-assessed`.

## Requirement: render evidence
The pipeline SHALL measure a rendered film's duration against the storyboard, detect scene cuts
and compare them with planned cut handoffs, report the share of cuts aligned with audio onsets,
flag a scored film without audio, and optionally write one midpoint frame per beat and a contact
sheet. Evidence SHALL NOT be reported as creative acceptance.

## Requirement: choreography library
The package SHALL ship parametric choreography patterns that tween only seek-safe properties at
absolute times, are deterministic, and match a registry consumed by the storyboard gate.
