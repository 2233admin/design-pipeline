# Design Pipeline Delta

## ADDED Requirements

### Requirement: Project design foundation is mandatory

The pipeline SHALL require a reusable project `DESIGN.md` before any implementation stage begins.

#### Scenario: Foundation is missing

- **WHEN** a pipeline run cannot find project `DESIGN.md`
- **THEN** it SHALL report `synthesis-required`
- **AND** route through requirements-driven synthesis before implementation

#### Scenario: Foundation is invalid

- **WHEN** project `DESIGN.md` lacks required structure or source decisions
- **THEN** the pipeline SHALL fail closed
- **AND** SHALL NOT treat change-level lowercase `design.md` as a substitute

#### Scenario: Foundation is ready

- **WHEN** project `DESIGN.md` passes structure, provenance, and containment validation
- **THEN** the pipeline MAY continue into implementation
- **AND** change artifacts SHALL link or specialize the project foundation
