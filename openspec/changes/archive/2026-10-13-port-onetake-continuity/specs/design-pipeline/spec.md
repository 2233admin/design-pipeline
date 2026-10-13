# Design pipeline delta

## ADDED Requirements

### Requirement: named carriers
A storyboard beat joined to the previous beat by a carried handoff SHALL name what survives the
boundary.

#### Scenario: Carried handoff is declared
- **WHEN** a storyboard beat is joined to the previous beat by a carried handoff
- **THEN** the beat SHALL name what survives the boundary

### Requirement: rhythm
The storyboard gate SHALL reject near-uniform beat lengths in films of four or more beats and
films of eight seconds or more without any rest.

#### Scenario: Film rhythm violates a threshold
- **WHEN** a film has four or more beats with near-uniform lengths, or lasts eight seconds or more without any rest
- **THEN** the storyboard gate SHALL reject it

### Requirement: measured continuity
Film check SHALL report a continuity score over carried boundaries and SHALL fail when a planned
carry renders as a scene cut or when the score is below 0.6 with three or more carried boundaries.

#### Scenario: Planned carry renders as a cut
- **WHEN** a planned carry renders as a scene cut
- **THEN** film check SHALL fail and report continuity over carried boundaries

#### Scenario: Continuity score is too low
- **WHEN** at least three carried boundaries exist and their continuity score is below 0.6
- **THEN** film check SHALL fail and report the score
