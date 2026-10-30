## ADDED Requirements

### Requirement: Reviewed upstream methods are internalized with provenance

Each internalized method SHALL be either vendored at a pinned commit with its licence or distilled into a project-owned reference that names its source repository, commit and licence. Distilled references SHALL NOT copy upstream prose.

#### Scenario: Mobile web guidance

- **WHEN** a ui or web task targets phones
- **THEN** the routed guidance SHALL include the mobile web reference with safe-area and viewport-unit rules

#### Scenario: Worst-case states

- **WHEN** a component matrix selects the long-name and empty states from the worst-case reference
- **THEN** each selected state SHALL require a capture like any other declared state

#### Scenario: Added anti-slop checks

- **WHEN** the first viewport overflows its column at 390 px
- **THEN** the mechanical lint SHALL report a hard finding under responsive content integrity

#### Scenario: Provenance

- **WHEN** a distilled reference is packaged
- **THEN** it SHALL name its source repository, commit and licence
