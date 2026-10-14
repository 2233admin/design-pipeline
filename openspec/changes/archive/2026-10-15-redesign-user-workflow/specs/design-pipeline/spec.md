# Design pipeline delta

## ADDED Requirements

### Requirement: single next step
The pipeline SHALL provide a `next` command that reads project state and returns exactly one
action: run a command, ask the user one decision with a recommended answer, or report done with
evidence. Completed steps SHALL NOT be repeated.

#### Scenario: Work has a next action
- **WHEN** project state contains unfinished work
- **THEN** `next` SHALL return exactly one action to run a command or ask the user one decision with a recommended answer
- **AND** it SHALL NOT repeat completed steps

#### Scenario: Work is done
- **WHEN** project state shows all steps complete
- **THEN** `next` SHALL report done with evidence

### Requirement: project state
The pipeline SHALL record deliverable, tier, mode, stage and human decisions in
`.design-pipeline/state.json`, and SHALL treat a recorded artifact that no longer exists as stale.

#### Scenario: Project state is recorded
- **WHEN** project state is updated
- **THEN** `.design-pipeline/state.json` SHALL record deliverable, tier, mode, stage, and human decisions

#### Scenario: Recorded artifact no longer exists
- **WHEN** a recorded artifact no longer exists
- **THEN** the pipeline SHALL treat it as stale

### Requirement: ceremony tiers
Work SHALL run at a quick, standard or full tier. OpenSpec artifacts SHALL be required only at the
full tier and for changes to this repository.

#### Scenario: OpenSpec requirement is determined
- **WHEN** work runs below the full tier and is not a change to this repository
- **THEN** OpenSpec artifacts SHALL NOT be required
- **AND** they SHALL be required at full tier and for repository changes

### Requirement: two human decisions
Standard work SHALL ask the user to pick one of three concepts and to accept or reject a draft
that has passed all error gates; a rejection SHALL be recorded with its reason.

#### Scenario: Standard work reaches decision points
- **WHEN** standard work reaches concept choice and draft review
- **THEN** the pipeline SHALL ask the user to pick one of three concepts and accept or reject a draft that passed all error gates
- **AND** it SHALL record a rejection with its reason

### Requirement: small front door
The entry skill SHALL stay under 5 KB and route to deliverable workflows and references loaded on
demand; every existing command SHALL remain available.

#### Scenario: Entry skill is delivered
- **WHEN** the entry skill is delivered
- **THEN** it SHALL stay under 5 KB, route to deliverable workflows and on-demand references, and keep every existing command available
