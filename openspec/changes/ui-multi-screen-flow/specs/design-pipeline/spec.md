## ADDED Requirements

### Requirement: Multi-screen ui flows are declared, linked and verified

A ui project at standard or full MAY declare screens and transitions in `flow.json`. `verify flow` SHALL check that each screen exists and passes the composition gate, that each trigger reaches its target in the browser, and SHALL report unreachable screens. The owner SHALL review the generated flow map.

#### Scenario: Broken transition

- **WHEN** the sign-up screen's "Continue" button does not lead to the declared verify-email screen
- **THEN** `verify flow` SHALL fail naming the transition, the selector and where the click led

#### Scenario: Orphan screen

- **WHEN** a declared screen is the target of no transition and is not the first screen
- **THEN** `verify flow` SHALL report it as an orphan

#### Scenario: Single-page app screens

- **WHEN** screens are states of one document marked with `data-screen`
- **THEN** the transition check SHALL compare the `data-screen` value after the click

#### Scenario: Screen changed after acceptance

- **WHEN** any screen file changes after the owner accepted the flow
- **THEN** `next` SHALL ask for the review again, naming the changed screen

#### Scenario: Quick tier

- **WHEN** a ui project is at quick tier
- **THEN** no flow SHALL be offered and the single-screen behaviour SHALL be unchanged
