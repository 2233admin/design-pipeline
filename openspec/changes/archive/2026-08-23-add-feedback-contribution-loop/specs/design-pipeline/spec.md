# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: Data-driven companion compatibility

The pipeline SHALL keep companion install groups and capability profiles in a machine-readable registry that can be updated without changing checker control flow.

#### Scenario: A companion suite changes its advertised capability

- **WHEN** a maintainer updates a registry profile and its source reference
- **THEN** self-check SHALL evaluate the new markers across explicit skill roots and SHALL expose missing skills and missing markers separately.

### Requirement: Synchronous feedback capture

The pipeline SHALL be able to record a finding in the same command that detects it without requiring a background process.

#### Scenario: Self-check finds a stale installed companion

- **WHEN** self-check runs with explicit feedback recording enabled
- **THEN** it SHALL write a durable observation and a reviewable local contribution draft.

### Requirement: Feedback privacy and deduplication

Feedback artifacts SHALL redact common secrets and machine-specific paths and SHALL deduplicate repeated findings by deterministic fingerprint.

#### Scenario: The same warning appears twice

- **WHEN** the same normalized kind, skill, and title are recorded again
- **THEN** the existing observation SHALL increment its occurrence count and update evidence instead of creating another draft.

### Requirement: Remote contribution requires authority

The pipeline SHALL NOT create remote Issues, PRs, comments, pushes, or releases during normal self-check or feedback recording.

#### Scenario: A local draft is ready

- **WHEN** a maintainer wants to publish the draft
- **THEN** an authorized GitHub or ship workflow SHALL review the remote, evidence, privacy boundary, tests, and user authority before publication.

### Requirement: Self-hosted pipeline improvement

Maintainers SHALL use the same artifact lifecycle, feedback capture, review, QA, and contribution gates when changing the pipeline itself.

#### Scenario: A downstream user exposes a missing capability

- **WHEN** the observation is accepted
- **THEN** the maintainer SHALL link it to an OpenSpec change, update the registry or implementation, verify the package, and preserve the resolved learning.
