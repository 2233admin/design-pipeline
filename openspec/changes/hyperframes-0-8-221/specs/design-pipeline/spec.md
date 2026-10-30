## ADDED Requirements

### Requirement: Film runtime upgrade keeps the pipeline's contract in charge

The package SHALL use one pinned HyperFrames version everywhere. Upstream check findings SHALL be recorded as pipeline findings, with broken output as errors and craft advice as warnings. Upstream's creative workflow SHALL NOT replace the storyboard, gates or owner acceptance.

#### Scenario: Lost audio

- **WHEN** `hyperframes check` reports audio the render would lose
- **THEN** `film check` SHALL fail with that finding and a fix naming the element

#### Scenario: Craft advice

- **WHEN** `hyperframes check` reports `dead_stretch`
- **THEN** `film check` SHALL report a warning and SHALL NOT fail on it

#### Scenario: Retired upstream route

- **WHEN** the route guide is packaged
- **THEN** it SHALL NOT name any retired upstream workflow skill

#### Scenario: Wrapped timeline

- **WHEN** a composition's timeline is wrapped by the runtime
- **THEN** capture and timeline probes SHALL seek the real timeline and produce the same frame as before the wrapper
