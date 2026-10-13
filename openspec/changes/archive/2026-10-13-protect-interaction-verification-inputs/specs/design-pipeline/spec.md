## ADDED Requirements

### Requirement: Interaction verification preserves measurement inputs

Interaction verification SHALL reject a report destination that aliases its probe, resolved local page or existing workflow state before browser execution. Rejection SHALL preserve their bytes and SHALL NOT record a gate pass.

#### Scenario: Report aliases a measured page or state

- **WHEN** the report destination names the measured local page or workflow state through an exact path, hard link or symbolic link
- **THEN** verification SHALL return a machine-readable contract error before capture
- **AND** the probe, page and state SHALL remain unchanged

#### Scenario: A separate contained report is requested

- **WHEN** the report destination is contained and distinct from the measurement inputs and state
- **THEN** verification SHALL retain its existing capture, evaluation and measured-page binding behavior
- **AND** a gate pass SHALL NOT grant owner Visual Acceptance

## MODIFIED Requirements

### Requirement: The public CLI is a safe orchestration facade

The pipeline SHALL expose stable JSON results and exit semantics for lifecycle, foundation, scene,
evidence, motion/component, interoperability, benchmark, adapter, style-signal, and feedback gates.
All project paths SHALL remain below explicit `--root` after link resolution.

#### Scenario: A command receives an escaping artifact path

- **WHEN** a caller references an artifact outside `--root`
- **THEN** the command SHALL fail before reading or writing it
- **AND** the JSON error envelope SHALL remain machine-readable.

#### Scenario: Interaction output escapes through a default directory or report link

- **WHEN** the default or explicit interaction output directory, or its final report file, resolves outside `--root`
- **THEN** verification SHALL reject the destination before capture or writing the report
- **AND** no gate pass or external report SHALL be produced

#### Scenario: A destination contains an unresolved filesystem link

- **WHEN** a project destination contains a filesystem link whose target does not exist
- **THEN** the CLI SHALL reject it as an unresolved containment boundary before reading or writing that destination
- **AND** interaction verification SHALL NOT start capture or record a gate pass
