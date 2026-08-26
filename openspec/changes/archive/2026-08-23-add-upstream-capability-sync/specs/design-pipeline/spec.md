# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: Version-sensitive sources are explicit

The pipeline SHALL support optional, validated source identity and freshness metadata on generic
capability profiles.

#### Scenario: A maintainer tracks an upstream companion

- **WHEN** source metadata is added to a profile
- **THEN** the registry SHALL identify the canonical source, reviewed revision or version, review
  timestamp, and freshness policy without adding checker-specific control flow.

### Requirement: Freshness is evidence-based

The pipeline SHALL distinguish current, stale, changed, untracked, and unknown source states.

#### Scenario: Remote evidence is unavailable

- **WHEN** a profile is tracked but the host does not provide current source evidence
- **THEN** the audit SHALL report `UNKNOWN` and SHALL NOT claim the profile is current.

### Requirement: Upstream content is data, not executable code

The pipeline SHALL NOT execute retrieved upstream content during capability audit.

#### Scenario: A source response contains executable text

- **WHEN** the host provides that response as evidence
- **THEN** the audit SHALL compare only validated metadata, hashes, and declared markers.

### Requirement: Remote publication uses an authorized host bridge

The pipeline SHALL prepare a machine-readable Issue or PR request but SHALL NOT publish it directly.

#### Scenario: A finding is ready for publication

- **WHEN** the user explicitly authorizes the exact action and repository
- **THEN** a host adapter MAY publish the validated request using its deterministic idempotency key.

### Requirement: Published contributions reconcile locally

The pipeline SHALL validate publication receipts before linking remote state to an observation.

#### Scenario: A host returns a mismatched receipt

- **WHEN** its idempotency key or target does not match the prepared request
- **THEN** reconciliation SHALL fail closed without modifying the observation or feedback index.

### Requirement: Capability sync scales across companion suites

The pipeline SHALL apply one audit contract across animation, design, framework, workflow, and
future companion profiles.

#### Scenario: A new companion suite is introduced

- **WHEN** its registry profile and source metadata satisfy the schemas
- **THEN** the existing audit and contribution flow SHALL evaluate it without a new hard-coded
  branch.
