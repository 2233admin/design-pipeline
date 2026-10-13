# design-pipeline Specification Delta

## ADDED Requirements

### Requirement: Feedback state corruption fails closed

The recorder SHALL validate an existing observation and feedback index before writing any updated
artifact.

#### Scenario: Existing feedback JSON is corrupt

- **WHEN** a matching observation or the feedback index cannot be parsed or validated
- **THEN** recording SHALL fail with a contextual error and SHALL NOT overwrite or increment the
  existing observation.

### Requirement: Specific paths are redacted first

The recorder SHALL redact longer path scopes before their parent scopes.

#### Scenario: Feedback root is nested under the project root

- **WHEN** evidence contains the exact nested feedback root
- **THEN** it SHALL be represented as `<FEEDBACK_ROOT>` rather than a partial
  `<PROJECT_ROOT>` path.

### Requirement: Capability registry patterns are validated before evaluation

The self-check SHALL validate profile, requirement, and regular-expression structure before
producing compatibility results.

#### Scenario: A registry pattern is invalid

- **WHEN** a capability requirement contains an invalid regular expression
- **THEN** self-check SHALL fail with the profile and requirement identity instead of reporting a
  false compatibility result.
