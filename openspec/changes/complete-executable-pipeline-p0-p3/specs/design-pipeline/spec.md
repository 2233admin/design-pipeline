# Delta Spec: Executable Pipeline P0-P3

## ADDED Requirements

### Requirement: Executable control plane

The pipeline SHALL expose versioned machine contracts and deterministic CLI validators for state,
Scene Runtime, evidence, motion/component states, tokens/UI IR/source maps, benchmarks, adapters,
design-tool receipts, intake, and style signals.

#### Scenario: Optional integration availability is unknown

- **WHEN** a requested host adapter is not explicitly configured and cannot be successfully probed
- **THEN** the pipeline SHALL return `unknown`
- **AND** it SHALL NOT resolve ambient modules, download dependencies, fabricate evidence, or claim
  installed support.

#### Scenario: Optional integration is configured but unavailable

- **WHEN** a requested host adapter is explicitly configured and its probe confirms that it cannot
  execute
- **THEN** the pipeline SHALL return `blocked`
- **AND** it SHALL NOT resolve ambient modules, download dependencies, fabricate evidence, or claim
  installed support.

#### Scenario: Existing state is resumed

- **WHEN** either supported v1 state dialect is read
- **THEN** status SHALL be inspectable without mutation
- **AND** mutation SHALL require deterministic explicit migration with crash-safe write semantics.
