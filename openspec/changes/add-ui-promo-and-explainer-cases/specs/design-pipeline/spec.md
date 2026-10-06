# Design pipeline delta

## ADDED Requirements

### Requirement: real interface captures in golden cases
A golden case that shows another product's interface SHALL declare its capture script, its pinned
source (repository, full commit and license) and its captured files. Captured files SHALL be
regenerated locally and SHALL NOT be committed. Repository QA SHALL fail when any captured file
is tracked.

#### Scenario: Golden case shows another interface
- **WHEN** a golden case shows another product's interface
- **THEN** it SHALL declare its capture script, pinned source repository, full commit, license, and captured files
- **AND** captured files SHALL be regenerated locally and SHALL NOT be committed

#### Scenario: Captured file is tracked
- **WHEN** any captured file is tracked
- **THEN** repository QA SHALL fail

### Requirement: cuts between still frames
The render gate SHALL treat a one-step change as an instant replacement when both of its
neighbouring steps are under a tenth of it. This applies in addition to steps that stand out from
their 2 s window.

#### Scenario: One-step replacement is isolated
- **WHEN** a one-step change has both neighboring steps under one tenth of its magnitude
- **THEN** the render gate SHALL treat it as an instant replacement, in addition to detecting steps that stand out from their two-second window
