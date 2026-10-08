## ADDED Requirements

### Requirement: Native verification preserves physical root identity

The existing containment and Git snapshot helpers SHALL recognize equivalent physical Windows directory spellings without treating an outside link or a distinct case-sensitive directory as the same authorized root. Native task coordinates SHALL remain consistent with the observed Git baseline. Existing snapshot, scope and receipt lineage SHALL remain authoritative.

#### Scenario: A task root has a Windows short-name alias

- **WHEN** native dispatch and Git discovery use different spellings of the same physical directory
- **THEN** dispatch SHALL retain that directory's physical identity and interpret task scope within the observed Git root
- **AND** equivalent spelling SHALL NOT itself block task verification

#### Scenario: An artifact uses an absolute spelling of its junction-root directory

- **WHEN** an accepted absolute path identifies a file within the caller's physical root using another spelling
- **THEN** the existing resolver SHALL return its equivalent path in the caller-root coordinates
- **AND** generated artifact metadata SHALL remain a contained relative path without a parent-directory escape

#### Scenario: An alias crosses an unauthorized boundary

- **WHEN** a path uses an external junction, linked ancestor, unresolved link or distinct case-sensitive root
- **THEN** existing containment and identity checks SHALL reject that path
- **AND** spelling normalization SHALL NOT expand the task's authorization
- **AND** a relative path outside the caller's lexical root SHALL NOT be accepted as an absolute physical alias

### Requirement: Native QA reports actual failed observations

Native QA SHALL report the failed attempt's code and reason when a run has no notice, and SHALL distinguish a measured semantic failure from unavailable, incomplete or drifted verification. A failed verification SHALL NOT be interpreted as user visual acceptance or rewritten as passed by a successful focused rerun.

#### Scenario: A handled task failure has no run notice

- **WHEN** a component run fails and an assertion expects review or completion
- **THEN** the assertion SHALL retain its expected-status failure with the latest attempt's diagnostic code and reason
- **AND** an undefined message SHALL NOT mask it with a separate argument-type error

#### Scenario: Verification cannot observe a changed output

- **WHEN** a changed output's capture or tool operation blocks before a complete semantic measurement
- **THEN** native progress SHALL preserve the previous observed failure evidence and SHALL NOT count a new semantic attempt
- **AND** QA SHALL expose the blocking reason before interpreting the failure counter
