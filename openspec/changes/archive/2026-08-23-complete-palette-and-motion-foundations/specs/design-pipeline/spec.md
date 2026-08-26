# design-pipeline Delta Specification

## ADDED Requirements

### Requirement: Website cloning uses a blocking palette foundation

Every declared target SHALL preserve DOM and raster palette evidence separately and SHALL map the
reconciled semantic roles and relationships to implementation tokens before implementation or
fidelity completion. Palette evidence SHALL reject unknown fields, and its declared files SHALL
remain within the target research directory after symlinks or directory junctions are resolved.

#### Scenario: Palette evidence is incomplete

- **WHEN** any declared target lacks a complete palette foundation
- **THEN** exact and adaptive website-cloning runs SHALL remain blocked.

#### Scenario: Palette evidence escapes through a directory junction

- **WHEN** a declared evidence path resolves outside the target research directory
- **THEN** the palette checker SHALL reject the foundation.

### Requirement: Project MOTION.md is a validated foundation

Every project SHALL own a root `MOTION.md` that declares a reusable motion language or an explicit
static posture.

#### Scenario: Motion foundation is missing or invalid

- **WHEN** design-synthesis continuation reaches implementation
- **THEN** the pipeline SHALL fail closed until the project motion foundation is `ready`.

### Requirement: Change motion specializes the project language

Change-level motion SHALL link the project foundation hash, select stable primitive identifiers,
and treat runtime libraries as adapters rather than the motion language.

#### Scenario: Procedural motion is authored

- **WHEN** a change uses a procedural primitive
- **THEN** its parameters, bounds, determinism, runtime degradation, performance budget, and
  reduced-motion substitute SHALL be documented without executable content or fenced code blocks
  anywhere in the foundation.

### Requirement: Reference catalogs are optional evidence providers

External design catalogs MAY supply attributed evidence but SHALL NOT overwrite project
foundations or become required for local validation.

#### Scenario: Provider retrieval is unavailable

- **WHEN** the provider cannot return verified content
- **THEN** the pipeline SHALL preserve requirements-only and local-evidence synthesis.
