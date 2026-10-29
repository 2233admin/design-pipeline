## ADDED Requirements

### Requirement: Reference projects are internalized by a recorded gap matrix

The pipeline SHALL record, for each feature of a reference project, whether it is internalized (with its file), to be internalized (with its target tier), or deliberately not internalized (with its reason). A feature SHALL NOT be internalized without a matrix row.

#### Scenario: A feature with no counterpart

- **WHEN** a reference project feature has no file in this repository
- **THEN** the matrix SHALL give it a tier or an exclusion reason

#### Scenario: A feature already internalized

- **WHEN** a reference project feature is already in the repository
- **THEN** the matrix SHALL name the file and SHALL NOT propose re-adoption

### Requirement: Internalized reference features keep provenance

Each internalized feature SHALL record its source, licence, `codeCopied` state, and the parts adopted and rejected. Code, text or assets copied from a reference project SHALL have an explicit owner decision and an attribution entry in `THIRD_PARTY_NOTICES.md` that carries the upstream licence text.

#### Scenario: Concepts only

- **WHEN** a feature is adopted as a concept or method
- **THEN** `codeCopied` SHALL be `false`

#### Scenario: Copied text or assets

- **WHEN** text or an asset is copied from a reference project
- **THEN** the owner SHALL approve it, and the notice SHALL include the upstream copyright and MIT text

#### Scenario: Licence unverified

- **WHEN** a feature's licence is unverified
- **THEN** the feature SHALL stay deferred and SHALL NOT be copied
