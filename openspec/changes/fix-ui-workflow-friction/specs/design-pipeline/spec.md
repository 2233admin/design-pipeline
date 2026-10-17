## ADDED Requirements

### Requirement: ui intake asks interface questions

The `ui` intake SHALL ask for the product's job, its users, devices and sharing, its content source and states, and licensed assets. It SHALL NOT ask for a duration, footage or music.

#### Scenario: A ui run starts

- **WHEN** `next` returns the intake ask for a `ui` deliverable
- **THEN** its questions SHALL be product, audience, content and assets

### Requirement: ui work starts from an owner-picked direction

At the standard and full tiers outside replicate mode, a `ui` run SHALL ask for Stage 0 and a `direction-preview.json` at the project root before work, and SHALL record the owner's pick into that receipt only when the selection check passes. A waived preview SHALL need the owner's agreement.

#### Scenario: The preview passes its check

- **WHEN** the receipt has rendered candidates that pass `direction check --stage preview`
- **THEN** `next` SHALL ask the owner which direction, showing the comparison page and screenshots

#### Scenario: An agent or an unknown candidate

- **WHEN** the pick is recorded by an agent, names no candidate, or has no reason
- **THEN** `decide` SHALL refuse it and leave the receipt pending

#### Scenario: Quick or replicate

- **WHEN** the tier is quick or the mode is replicate
- **THEN** the run SHALL have no direction stage

### Requirement: Path and foundation errors say how to fix them

A relative `--project-root` that cannot be found SHALL say it was resolved against `--root`. A `MOTION.md` whose source decisions lack an `Adopted:` or `Rejected:` line SHALL say which lines are needed.

#### Scenario: Both paths relative

- **WHEN** `--root app --project-root app` is passed from the parent folder
- **THEN** the error SHALL name `--root` and the fix
