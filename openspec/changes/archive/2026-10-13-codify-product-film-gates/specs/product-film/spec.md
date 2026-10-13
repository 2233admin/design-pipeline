# Product film delta

## ADDED Requirements

### Requirement: storyboard gate
The pipeline SHALL validate `storyboard.json` against `design-pipeline.film-storyboard.v1`. It
SHALL fail open or gapped timelines, action beats without a product action or before/after
transformation, surface-only action motion, slideshow handoff patterns, dominant or chained holds,
unknown choreography ids, and scored films without an entry cue or beat-bound sound. It SHALL
report `creativeAcceptance: not-assessed`.

#### Scenario: Storyboard violates structure or choreography
- **WHEN** `storyboard.json` has an open or gapped timeline, an action beat without a product action or before/after transformation, surface-only action motion, a slideshow handoff, dominant or chained holds, or an unknown choreography id
- **THEN** the pipeline SHALL fail storyboard validation

#### Scenario: Scored film lacks required sound cues
- **WHEN** a scored film has no entry cue or beat-bound sound
- **THEN** the pipeline SHALL fail storyboard validation

#### Scenario: Storyboard gate reports acceptance
- **WHEN** storyboard validation completes
- **THEN** it SHALL report `creativeAcceptance: not-assessed`

### Requirement: render evidence
The pipeline SHALL measure a rendered film's duration against the storyboard, detect scene cuts
and compare them with planned cut handoffs, report the share of cuts aligned with audio onsets,
flag a scored film without audio, and optionally write one midpoint frame per beat and a contact
sheet. Evidence SHALL NOT be reported as creative acceptance.

#### Scenario: Render evidence is collected
- **WHEN** a rendered film is checked
- **THEN** the pipeline SHALL measure duration against the storyboard, detect scene cuts, compare them with planned cut handoffs, and report the share of cuts aligned with audio onsets
- **AND** it MAY write one midpoint frame per beat and a contact sheet
- **AND** evidence SHALL NOT be reported as creative acceptance

#### Scenario: Scored film has no audio
- **WHEN** a scored film has no audio
- **THEN** the pipeline SHALL flag it

### Requirement: choreography library
The package SHALL ship parametric choreography patterns that tween only seek-safe properties at
absolute times, are deterministic, and match a registry consumed by the storyboard gate.

#### Scenario: Choreography is packaged
- **WHEN** the package includes choreography patterns
- **THEN** patterns SHALL be parametric, tween only seek-safe properties at absolute times, be deterministic, and match the registry consumed by the storyboard gate
