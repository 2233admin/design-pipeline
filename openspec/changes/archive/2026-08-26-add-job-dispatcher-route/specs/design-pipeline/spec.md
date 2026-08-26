## ADDED Requirements

### Requirement: Stage 0 dispatches through one job registry

The pipeline SHALL classify each brief into exactly one primary job from a versioned job registry
before opening a knowledge catalog. A new capability SHALL be added by registering a job, not by
adding another mandatory Stage 0 search.

#### Scenario: A clone brief is dispatched

- **WHEN** the brief asks to clone, rebuild, or 1:1 replicate a live page
- **THEN** `designer-pipeline route` SHALL select the website-clone job as the only primary
- **AND** other catalogs SHALL remain secondary or unused

#### Scenario: Two exclusive jobs tie

- **WHEN** an explicit job and another explicit job of equal score and priority both match
- **THEN** the route SHALL report `needs-clarification`
- **AND** it SHALL NOT pick a primary or search every catalog

#### Scenario: A new capability is registered

- **WHEN** a valid job object is added to the job registry
- **THEN** matching briefs SHALL route to that job without changing dispatcher source
- **AND** an invalid registry SHALL fail closed

#### Scenario: Kernel commands stay attached

- **WHEN** a route is `ready`
- **THEN** the result SHALL include foundation and toolchain kernel steps
- **AND** knowledge-catalog hits SHALL NOT become executable ready by being selected
