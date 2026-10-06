# Product film delta

## ADDED Requirements

### Requirement: timeline gate
The pipeline SHALL check a `design-pipeline.film-timeline.v1` manifest against its storyboard and
SHALL report layout-property tweens, infinite repeats, tweens past the film end, duration drift,
action beats without animated tweens, action beats that animate only opacity or scale, and planned
continuation, morph or camera-carry handoffs that no non-ambient subject carries.

#### Scenario: Timeline contains invalid timing or layout motion
- **WHEN** a timeline has layout-property tweens, infinite repeats, tweens past the film end, or duration drift
- **THEN** the gate SHALL report each condition

#### Scenario: Action beat lacks qualifying motion
- **WHEN** an action beat has no animated tween or animates only opacity or scale
- **THEN** the gate SHALL report the action beat

#### Scenario: Planned handoff has no carrier
- **WHEN** a planned continuation, morph, or camera-carry handoff has no non-ambient subject carrying it
- **THEN** the gate SHALL report the handoff

### Requirement: timeline probe
The package SHALL ship a read-only probe that serializes a GSAP timeline, including nested
timelines, into absolute-time tween records without seeking or playing it.

#### Scenario: Nested timeline is probed
- **WHEN** the probe receives a GSAP timeline, including nested timelines
- **THEN** it SHALL serialize absolute-time tween records without seeking or playing the timeline

### Requirement: cross-model film evaluation
The pipeline SHALL convert per-system film runs into benchmark v2 measurements using only the
film gates, SHALL leave missing scenario runs unmeasured, and SHALL rely on the existing benchmark
evaluation for fairness, channels and required-scenario verdicts.

#### Scenario: Film evaluation has missing scenario runs
- **WHEN** a film evaluation has a missing scenario run
- **THEN** that run SHALL remain unmeasured
- **AND** evaluation SHALL rely on the existing benchmark evaluation for fairness, channels, and required-scenario verdicts
