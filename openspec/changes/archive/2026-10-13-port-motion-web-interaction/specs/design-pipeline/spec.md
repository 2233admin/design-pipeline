# Design pipeline delta

## ADDED Requirements

### Requirement: measured interaction
The pipeline SHALL verify declared web interactions by driving real input in a headless browser
and SHALL fail interactions that do not respond, do not settle, drift from their rest position, only
change opacity, or load resources from other origins.

#### Scenario: Interaction fails to behave correctly
- **WHEN** an interaction does not respond, does not settle, drifts from its rest position, changes only opacity, or loads resources from other origins
- **THEN** the pipeline SHALL fail the interaction

#### Scenario: Interaction is verified
- **WHEN** a declared web interaction is verified
- **THEN** the pipeline SHALL drive real input in a headless browser

### Requirement: web sub-workflow
Web work SHALL follow a sub-workflow whose guide lists each stage's commands, and SHALL not show a
draft before its interaction probe passes.

#### Scenario: Web workflow reaches draft review
- **WHEN** web work progresses toward showing a draft
- **THEN** its guide SHALL list each stage's commands and the interaction probe SHALL pass before the draft is shown
