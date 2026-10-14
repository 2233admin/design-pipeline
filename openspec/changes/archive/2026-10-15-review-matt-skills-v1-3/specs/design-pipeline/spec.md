## MODIFIED Requirements

### Requirement: Data-driven companion compatibility

The pipeline SHALL keep companion install groups and capability profiles in a machine-readable registry and SHALL evaluate both single-skill and multi-skill suites. The optional Matt development group SHALL use official upstream installation names.

#### Scenario: A suite is only partially installed

- **WHEN** at least one skill in a capability suite is installed but another required skill or marker is missing
- **THEN** self-check SHALL report `WARN`, identify the missing skill or marker, and preserve the documented fallback.

#### Scenario: Official Matt skills are installed without local forks

- **WHEN** codebase-design, grill-with-docs, implement, tdd and code-review are present and matt-tdd and matt-code-review are absent
- **THEN** the existing self-check SHALL report the optional Matt group as installed
- **AND** it SHALL not require locally renamed aliases or treat presence as source verification
