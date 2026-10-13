## ADDED Requirements

### Requirement: GEPA is a packaged independent supporting tool

The pipeline SHALL expose a separately runnable guidance optimizer through the supporting-tool path, with the complete pinned official source skill, license and byte-verifiable provenance. Optimization SHALL use the reviewed native engine and SHALL NOT become a mandatory production stage or require a global skill installation.

#### Scenario: Explicit guidance optimization

- **WHEN** a user requests offline improvement of a bounded design instruction
- **THEN** the supporting-tool route SHALL provide the packaged guide and callable optimizer
- **AND** ordinary design delivery SHALL retain its existing workflow.

#### Scenario: Source revision or bytes drift

- **WHEN** import receives a dirty or unreviewed source, or packaged source bytes drift
- **THEN** verification SHALL fail while preserving the previously imported snapshot.

#### Scenario: Installed runtime provenance is unknown or unreviewed

- **WHEN** the selected Python environment lacks the recorded Git commit matching the bundled source manifest, or imports GEPA from another location
- **THEN** optimization SHALL fail before invoking the native engine or creating experiment output
- **AND** a package version label alone SHALL NOT establish the reviewed runtime.

### Requirement: Optimization experiments freeze independent case splits

Each optimization SHALL require a seed, a trusted task evaluator, nonempty disjoint training, validation and final-test fixtures with unique ids, an explicit proposer or reflection model, and a finite positive evaluation budget. Inputs SHALL be validated before optimization and bound by hashes in the local experiment record.

#### Scenario: Missing or overlapping fixtures

- **WHEN** fixture ids overlap, a split is empty, or required inputs are missing
- **THEN** the request SHALL fail before optimization or output-directory creation.

#### Scenario: Final-test evidence remains independent

- **WHEN** candidates are generated and selected
- **THEN** final-test fixtures SHALL remain outside search and selection
- **AND** the seed and selected candidate SHALL be compared on final-test fixtures outside search, with the comparison available after search.

### Requirement: Native optimization produces reviewable candidates

The optimizer SHALL feed finite evaluator scores and diagnostic feedback into native candidate search, retain native history and parent relationships, and export the selected candidate and seed diff. Outputs SHALL use a fresh local experiment directory, preserve failed-run evidence and SHALL NOT overwrite the seed or frozen inputs.

#### Scenario: Synthetic native search succeeds

- **WHEN** a deterministic evaluator and proposer expose an improving candidate
- **THEN** native search SHALL evaluate and select it, export its diff and retain candidate lineage
- **AND** the result SHALL be identified as integration evidence rather than design-quality improvement.

#### Scenario: Invalid score or existing output

- **WHEN** an evaluator returns a non-finite score or output already exists
- **THEN** execution SHALL fail without replacing earlier results or reporting success.

### Requirement: Search results preserve existing adoption authority

Search outputs SHALL remain reviewable proposals. Packaged guidance adoption SHALL use the feedback/OpenSpec maintainer workflow; finite project/user adaptation SHALL retain its existing lifecycle. Component Conformance and Visual Acceptance SHALL remain separate; search scores SHALL NOT grant gate passage, visual acceptance or installed-skill promotion.

#### Scenario: Search score improves

- **WHEN** the optimizer selects a higher-scoring guidance candidate
- **THEN** its output SHALL remain proposed until independent applicable checks and review
- **AND** it SHALL NOT change evaluation criteria, constraints, gates, policy digests or live installed skills.

#### Scenario: Required evidence fails or is unknown

- **WHEN** candidate evaluation has failed or unknown required evidence
- **THEN** existing checks SHALL retain that outcome regardless of aggregate search score
- **AND** the evaluator SHALL not turn missing evidence into a successful observation.
