## MODIFIED Requirements

### Requirement: Release QA is hermetic and reproducible

Release QA SHALL prove manifest parity, syntax, complete tests, deterministic package bytes,
archive completeness, failure atomicity, isolated package installation, installed public CLI
behavior, and unchanged repository status. Long test batches SHALL expose progress before completion. CI SHALL exercise Windows path identity and storyboard regressions, with unavailable optional filesystem capabilities explicitly skipped.

#### Scenario: Packaging fails after a previous successful build

- **WHEN** a required resource is missing or invalid
- **THEN** packaging SHALL fail without corrupting the prior artifacts
- **AND** no source-tree mutation SHALL be introduced by QA.

#### Scenario: Full test batch is running

- **WHEN** the repository tests emit output before exiting
- **THEN** that output SHALL be visible through QA and available to the caller's redirected log
- **AND** a failed test batch SHALL still fail QA.

#### Scenario: Windows physical path spelling differs

- **WHEN** CI runs the Windows path-identity regression
- **THEN** it SHALL exercise a distinct spelling of the same physical root and reject a different physical identity
- **AND** absent optional filesystem capabilities SHALL be reported explicitly rather than counted as successful assertions.

### Requirement: Contribution standards

The repository SHALL document how contributors propose changes, reconcile the PR target and review scope before freezing a full-QA tree, validate changes with canonical maintenance commands, and handle external skill intake. Evidence SHALL identify its tested revision and SHALL NOT be presented as covering later integrated code without verification.

#### Scenario: Contributor proposes an external skill

- **WHEN** a contributor proposes a new external skill source
- **THEN** the contribution SHALL classify it using the curation policy outcomes before it can be accepted.

#### Scenario: Contributor prepares full QA

- **WHEN** a contributor prepares the publication tree for full QA
- **THEN** they SHALL fetch the intended PR target and review divergent commits and the proposed diff before freezing the tested revision
- **AND** contribution guidance and the PR template SHALL use `npm test` and `npm run specs:check`.

#### Scenario: Integration changes the tested code

- **WHEN** target-branch integration changes code after a successful full-QA run
- **THEN** the old full-QA result SHALL remain scoped to its tested revision
- **AND** verification of the integrated code SHALL be reported separately.
