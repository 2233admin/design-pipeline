## ADDED Requirements

### Requirement: Unmeasurable references are recorded, not omitted

The pipeline SHALL accept a schema-valid reference contract whose source is known but not resolvable
on disk, and SHALL distinguish that state from having no reference at all.

#### Scenario: The reference is supplied in conversation

- **WHEN** the user supplies a reference image that is not written to the repository
- **THEN** `reference-evidence.json` SHALL record `source.availability` as `pending`
- **AND** it SHALL record `pendingReason` and `requestedFrom`
- **AND** `sha256`, `width`, `height`, and `path` MAY be null
- **AND** route, classification, spatial cues, fidelity intent, required artifacts, and approval
  SHALL still be recorded.

#### Scenario: A pending source is checked

- **WHEN** `source.availability` is `pending`
- **AND** the contract is otherwise valid and approved
- **THEN** `designer-pipeline reference check` SHALL report `blocked` with reason `source-pending`
- **AND** the result SHALL NOT be reported as a contract failure.

#### Scenario: A resolved source omits its hash

- **WHEN** `source.availability` is `resolved`
- **AND** `sha256` is null or absent
- **THEN** reference validation SHALL fail.

#### Scenario: A measured stage is attempted against a pending source

- **WHEN** `source.availability` is `pending`
- **AND** `designer-pipeline reconstruction check` is run at stage `geometry` or `final`
- **THEN** the stage SHALL report `blocked`
- **AND** it SHALL NOT report `fidelity-limited`.

#### Scenario: A pending source does not downgrade fidelity

- **WHEN** `source.availability` is `pending`
- **AND** `intent.requestedFidelity` is `exact-reconstruction`
- **THEN** `intent.effectiveFidelity` SHALL remain `exact-reconstruction`
- **AND** `intent.downgrade.status` SHALL remain `not-requested`.

#### Scenario: A pending source later lands

- **WHEN** `source.availability` is `pending`
- **AND** the user supplies a contained PNG path
- **THEN** `designer-pipeline reference resolve` SHALL set `availability` to `resolved`
- **AND** it SHALL fill `path`, `width`, `height`, and `sha256` from the file
- **AND** it SHALL record `resolvedAt`
- **AND** it SHALL keep `requestedFrom` and `requestedAt`
- **AND** it SHALL NOT invent measurements by hand.
