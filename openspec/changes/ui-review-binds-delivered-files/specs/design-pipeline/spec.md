## ADDED Requirements

### Requirement: ui acceptance binds the reviewed files

A ui delivery SHALL name the files under review with `--file` and record their hashes. The owner's acceptance SHALL bind those hashes. When any reviewed file changes or disappears after acceptance, `next` SHALL return to the final review with the changed files named, instead of `done`.

#### Scenario: Page changed after acceptance

- **WHEN** the owner accepts a ui delivery of `index.html` and `index.html` is then changed
- **THEN** `next` SHALL NOT return `done`
- **AND** it SHALL ask for the final review again, stating that the owner accepted an earlier version and naming `index.html`

#### Scenario: Files unchanged

- **WHEN** the reviewed files are unchanged after the owner accepts
- **THEN** `next` SHALL return `done`

#### Scenario: Delivery without files

- **WHEN** `decide --stage deliver` for ui has `--answer` but no `--file`
- **THEN** it SHALL fail with `INPUT_MISSING`

#### Scenario: File outside the project

- **WHEN** `--file` names a path outside the project root or a directory
- **THEN** the delivery SHALL be refused

#### Scenario: Replicate mode keeps its extraction binding

- **WHEN** a replicate-mode ui delivery is accepted and the confirmed extraction changes
- **THEN** the review SHALL be asked again as before this change
