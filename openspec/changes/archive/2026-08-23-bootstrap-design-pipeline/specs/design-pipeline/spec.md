# design-pipeline Bootstrap Delta

## ADDED Requirements

### Requirement: Repository distributes the skill under `skill/`

The repository SHALL place the distributable Codex skill under `skill/`.

#### Scenario: User installs from repository

- **WHEN** a user copies `skill/*` into their Codex skill root
- **THEN** `design-pipeline` SHALL be installable without copying `openspec/`.

### Requirement: Repository includes OpenSpec source of truth

The repository SHALL include `openspec/project.md`, `openspec/specs/`, and `openspec/changes/`.

#### Scenario: Maintainer reviews project direction

- **WHEN** a maintainer needs the durable product contract
- **THEN** they SHALL read `openspec/specs/design-pipeline/spec.md`.

