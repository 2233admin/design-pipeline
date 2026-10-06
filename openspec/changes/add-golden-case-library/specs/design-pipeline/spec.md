# Design pipeline delta

## ADDED Requirements

### Requirement: golden case library
The repository SHALL keep deliverable-specific golden cases outside the shipped package and verify their evidence and rules in QA.

#### Scenario: Golden case is recorded
- **WHEN** a golden case is kept in the repository
- **THEN** it SHALL record its brief, user's approval state with the reviewed render's sha256 once decided, rules behind its choices, and counter-examples applying one named defect to the golden

#### Scenario: Golden case evidence fails QA
- **WHEN** a golden fails a storyboard, score, or timeline gate; a counter-example misses its named finding codes; or a claimed enforced rule lacks an exercising counter-example
- **THEN** repository QA SHALL fail

### Requirement: planned cuts found by pixel change
The render gate SHALL count a planned hard cut or match cut as present when either the scene
detector or the one-step pixel-change detector used for carried boundaries finds it.

#### Scenario: Planned cut is detected
- **WHEN** the scene detector or the one-step pixel-change detector used for carried boundaries finds a planned hard cut or match cut
- **THEN** the render gate SHALL count that cut as present

### Requirement: fades do not carry handoffs
The timeline gate SHALL NOT accept a tween that animates only opacity as the subject carrying a
planned continuation, morph or camera-carry handoff.

#### Scenario: Handoff uses only opacity
- **WHEN** a tween animates only opacity as the subject for a planned continuation, morph, or camera-carry handoff
- **THEN** the timeline gate SHALL reject it as a carried handoff
