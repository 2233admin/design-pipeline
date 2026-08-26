## ADDED Requirements

### Requirement: Source resolution is requested before reference artifacts are written

The pipeline SHALL resolve the reference source to a file path, or explicitly record it as pending,
before any reference or reconstruction artifact is authored.

#### Scenario: The reference is not a resolvable file

- **WHEN** a reconstruction request supplies a reference that is not a resolvable file path
- **THEN** the pipeline SHALL request a file path from the user before writing reference artifacts
- **AND** the request SHALL state that the path unlocks rectification, camera calibration, landmark
  error, and the fidelity receipt.

#### Scenario: The user does not supply a path

- **WHEN** the user cannot or does not supply a resolvable path
- **THEN** the pipeline SHALL record `source.availability` as `pending` and continue
- **AND** it SHALL NOT block all remaining work.

### Requirement: Missing measurement downgrades the claim, not the request

The pipeline SHALL treat an unavailable source as a limit on the verification claim and SHALL NOT
treat it as grounds to change requested fidelity.

#### Scenario: Progress pressure meets a missing source

- **WHEN** requested fidelity is `exact-reconstruction`
- **AND** the source is pending
- **THEN** the recorded verification claim SHALL be `unverified`
- **AND** requested fidelity SHALL remain `exact-reconstruction`
- **AND** a fidelity downgrade SHALL require explicit user approval recorded in the downgrade field.

#### Scenario: The run is reported

- **WHEN** a run completes with a pending source
- **THEN** the final report SHALL name the action that unlocks the measured gates.
