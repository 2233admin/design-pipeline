# Delta Spec: Executable Pipeline P0-P3

## Requirement: Executable control plane

The pipeline SHALL expose versioned machine contracts and deterministic CLI validators for state,
Scene Runtime, evidence, motion/component states, tokens/UI IR/source maps, benchmarks, adapters,
design-tool receipts, intake, and style signals.

### Scenario: Optional integration is absent

- **WHEN** a requested host adapter is not explicitly configured and successfully probed
- **THEN** the pipeline SHALL return `blocked` or `unknown`
- **AND** it SHALL NOT resolve ambient modules, download dependencies, fabricate evidence, or claim
  installed support.

### Scenario: Existing state is resumed

- **WHEN** either supported v1 state dialect is read
- **THEN** status SHALL be inspectable without mutation
- **AND** mutation SHALL require deterministic explicit migration with crash-safe write semantics.
