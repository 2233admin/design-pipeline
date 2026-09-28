# Product film delta

## Requirement: timeline gate
The pipeline SHALL check a `design-pipeline.film-timeline.v1` manifest against its storyboard and
SHALL report layout-property tweens, infinite repeats, tweens past the film end, duration drift,
action beats without animated tweens, action beats that animate only opacity or scale, and planned
continuation, morph or camera-carry handoffs that no non-ambient subject carries.

## Requirement: timeline probe
The package SHALL ship a read-only probe that serializes a GSAP timeline, including nested
timelines, into absolute-time tween records without seeking or playing it.

## Requirement: cross-model film evaluation
The pipeline SHALL convert per-system film runs into benchmark v2 measurements using only the
film gates, SHALL leave missing scenario runs unmeasured, and SHALL rely on the existing benchmark
evaluation for fairness, channels and required-scenario verdicts.
