## ADDED Requirements

### Requirement: Bundled interface discipline

The pipeline SHALL ship a complete, pinned, license-attributed interface-discipline source snapshot
as a core package resource. It SHALL apply that protocol to product UI, flows, shared
component/token changes, and interface reviews without depending on globally installed skills or
network access.

#### Scenario: Fresh standalone installation reviews UI

- **WHEN** a user installs only `design-pipeline` and starts product UI work
- **THEN** the package SHALL contain the interface router, six quality-domain skills, and
  change-scoped review skill with their supporting references
- **AND** the pipeline SHALL select full coverage by default, allowing quick coverage only for a
  narrow repair with documented scope.

#### Scenario: Changed UI is reviewed

- **WHEN** a change affects user-visible UI
- **THEN** Stage 0 SHALL identify affected flows, shared components/tokens, and consumers
- **AND** Stage 6 SHALL record review scope, domains, evidence, and every finding's
  `Introduced`, `Regression`, or `Pre-existing` status in `qa.md`.

#### Scenario: Source snapshot is changed

- **WHEN** the bundled interface source is updated or altered
- **THEN** its source revision, license, import scope, file count, and canonical tree hash SHALL be
  updated together
- **AND** a deterministic integrity test SHALL fail for a partial or byte-drifted snapshot.
