## ADDED Requirements

### Requirement: Owner asks carry a new trade-off and its consequence

An ask the pipeline returns for the owner SHALL name what it decides that no earlier owner decision settled, the recommendation and its cost, and how the owner can see the difference. An ask that cannot name a new trade-off SHALL NOT be sent; the agent SHALL settle it within its delegation or as a self-check against earlier owner decisions.

#### Scenario: A section repeats the confirmed direction

- **WHEN** a built section follows the confirmed playback card and the chosen direction without a new trade-off
- **THEN** the pipeline SHALL record it as an agent self-check and SHALL NOT ask the owner

#### Scenario: A section changes behaviour

- **WHEN** a section introduces a behaviour or cost the card and direction do not settle
- **THEN** the owner ask SHALL state that trade-off, the recommendation and its cost, and show the difference

#### Scenario: The owner asks to review each section

- **WHEN** the owner's delegation asks to review each section
- **THEN** the pipeline SHALL show each built section to the owner until the owner changes that delegation

### Requirement: Owner attention principles govern new owner-facing output

New owner-facing output SHALL be placed where the owner already looks (the ask, the page under review, the PR) and SHALL NOT be a new document the owner must read to proceed. Internal records MAY stay complete for agents and audit.

#### Scenario: A new record is proposed

- **WHEN** a change adds information the owner should know
- **THEN** it SHALL appear in the ask, beside the page change or in the PR, and any full record SHALL be optional to open
