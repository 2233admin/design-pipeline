# design-pipeline Specification Delta

## Requirement: Deterministic design plan

The pipeline MUST compile a valid intent manifest into a `design-pipeline.design-plan.v1` artifact
whose canonical hash is stable for identical inputs.

### Scenario: Required intent is absent

- **WHEN** target platform, primary task, or target screen is absent
- **THEN** plan compilation MUST return `blocked` or invalid input
- **AND** it MUST report the missing field and an unlock action
- **AND** it MUST NOT emit a runnable plan

### Scenario: Identical manifest is compiled twice

- **WHEN** the manifest and governing registry are unchanged
- **THEN** both plans MUST have the same canonical content and input hash

## Requirement: Controlled phase progression

The pipeline MUST execute phases only through the declared plan DAG and MUST refuse a phase whose
required dependencies or gates are not ready.

### Scenario: Upstream phase is not ready

- **WHEN** a caller runs to a downstream phase with a blocked, stale, or inconclusive dependency
- **THEN** the runtime MUST return `blocked`
- **AND** it MUST identify the owning dependency and next permitted action
- **AND** it MUST NOT fabricate the missing artifact

### Scenario: Runtime resumes after interruption

- **WHEN** the existing state and event ledger are consistent
- **THEN** `resume` MUST start from the earliest runnable phase without discarding prior evidence

## Requirement: Hash-bound artifact lineage

Every required design artifact MUST record its producer, input hashes, artifact hash, dependencies,
creation time, contained path, and lifecycle status.

### Scenario: Upstream artifact changes

- **WHEN** an artifact hash no longer matches its recorded hash
- **THEN** that artifact MUST become `stale`
- **AND** every declared downstream dependent MUST become `stale`
- **AND** unrelated artifacts MUST remain unchanged

### Scenario: Artifact path escapes the change root

- **WHEN** an artifact path resolves outside the declared change root
- **THEN** validation MUST fail closed

## Requirement: Independent phase status and pipeline outcome

The pipeline MUST represent phase status independently from final outcome.

### Scenario: Validator cannot decide

- **WHEN** a validator returns neither pass nor fail evidence
- **THEN** the phase MUST be `inconclusive`
- **AND** the pipeline MUST NOT report `complete`

### Scenario: Fidelity is limited

- **WHEN** all required work is deliverable but a measured implementation limitation remains
- **THEN** the outcome MAY be `fidelity_limited`
- **AND** the limitation MUST include evidence and a reason

## Requirement: Core interaction state coverage

Every core interaction MUST declare `default` coverage and explicit applicability for non-default
states. Static default-only evidence MUST NOT satisfy the interaction-state gate.

### Scenario: Core interaction has only its static default state

- **WHEN** an interaction matrix entry declares `default` and no applicable non-default coverage
- **THEN** the gate MUST return `blocked`
- **AND** it MUST list the missing state coverage

### Scenario: Interactive control is covered

- **WHEN** a core control declares keyboard interaction
- **THEN** it MUST cover focus and pressed states
- **AND** it MUST declare a reduced-motion behavior
- **AND** it MUST cover mobile and desktop viewports

### Scenario: State does not apply

- **WHEN** a state is inapplicable to a core interaction
- **THEN** the matrix MUST record an explicit reason
- **AND** the validator MUST distinguish that reason from missing evidence

## Requirement: Component catalog failure semantics

The pipeline MUST distinguish `catalog_unavailable`, `catalog_partial`, `no_match`, and `match_found`.

### Scenario: Component catalog is unavailable

- **WHEN** the catalog cannot be loaded or verified
- **THEN** component routing MUST return `catalog_unavailable`
- **AND** it MUST NOT report `no_match`
- **AND** the phase MUST remain blocked

## Requirement: Package gate

The package command MUST include only required artifacts whose hashes and dependencies are current.

### Scenario: Required artifact is stale

- **WHEN** a required artifact is stale, blocked, or inconclusive
- **THEN** packaging MUST refuse a complete package
- **AND** it MUST identify the artifact and its blocking reason
