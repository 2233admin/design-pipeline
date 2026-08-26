## ADDED Requirements

### Requirement: User-facing language is direct without changing scope

User-facing interface copy and human decision artifacts SHALL put the first useful consequence or
available action before internal implementation detail. A second pass SHALL preserve the source's
affected group, event, scope/count, uncertainty, time/limit, exclusions, unchanged state, and
available actions.

#### Scenario: A partial operation fails

- **WHEN** three fields are unrecognized but the source file remains unchanged
- **THEN** the title and body SHALL describe the field-level failure rather than declaring the file invalid
- **AND** recovery controls SHALL name only actions the interface actually provides.

#### Scenario: A notice has a bounded delay

- **WHEN** a change may take up to ten minutes to appear
- **THEN** the first sentence SHALL expose that user-visible delay
- **AND** the rewrite SHALL preserve both `may` and `up to` rather than strengthening the claim.
