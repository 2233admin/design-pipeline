## RENAMED Requirements

- FROM: `### Requirement: Component-first stage commands are read-only compatibility surfaces`
- TO: `### Requirement: Component-first commands share one receipt-chain artifact`

- FROM: `### Requirement: Component-first v2 binds one target snapshot through chained receipts`
- TO: `### Requirement: Component-first receipts bind one target snapshot through a chain`

## MODIFIED Requirements

### Requirement: Component-first conformance has layered deterministic boundaries

The pipeline SHALL expose synchronous `checkComponentFirstGate()` and `component-first` CLI commands
through a thin facade. Filesystem, path, hash, PNG, and existing-core work SHALL occur only in
adapters. Stack/runtime, component contract, Playground, page usage, and evidence gates SHALL be
pure, SHALL NOT import one another, and SHALL return one versioned GateResult shape. The
orchestrator SHALL resolve context once and the receipt builder SHALL contain no domain decisions.

#### Scenario: Independent requirements fail

- **WHEN** multiple independently evaluable component-first requirements are unmet
- **THEN** every independent finding SHALL be collected in stable gate and reason-code order
- **AND** invalid SHALL take precedence over blocked, and blocked over passed
- **AND** an invalid dependency SHALL mark only dependent work `not_evaluated`.

### Requirement: Website-cloning requests use a focused superset module

The pipeline SHALL route authorized live-page clone, rebuild, reproduction, and reverse-engineering requests to a progressively disclosed module that preserves all existing design-pipeline gates.

#### Scenario: User supplies a primary live URL

- **WHEN** the user asks for a faithful implementation of a live page
- **THEN** the pipeline SHALL initialize an isolated, resumable target and SHALL preserve the target project's established framework and conventions.

### Requirement: Component-first commands share one receipt-chain artifact

The CLI SHALL provide `component-first check|stack|components|playground|page|verify|select|promote`.
`check` SHALL return one `component-first-gate.v2` artifact with aggregate status, reason codes
and findings, and SHALL require `target.snapshotDigest`; stage commands SHALL return their
`component-first-stage-receipt.v2` and findings; `verify` SHALL check an artifact. Exit codes SHALL
be `0` passed, `1` invalid or contract error, and `2` blocked.

#### Scenario: A stage is blocked

- **WHEN** a valid stage input lacks required conformance evidence
- **THEN** the command SHALL write its versioned result to stdout and exit `2`
- **AND** it SHALL NOT write pipeline state, generate browser evidence, or install dependencies.

#### Scenario: A request has no snapshot digest

- **WHEN** `check` or a stage command receives a target without `snapshotDigest`
- **THEN** it SHALL fail as a contract error with exit `1` and no fallback snapshot.

#### Scenario: A removed v1 surface is used

- **WHEN** a request carries a schema id, or `component-first-v2`, `component-first migrate` or
  `high-fidelity` is invoked
- **THEN** the pipeline SHALL reject it without migration, alias or shim.

### Requirement: Component-first receipts bind one target snapshot through a chain

The gate SHALL bind stack, component, Playground, page, and browser evidence to one target
identity, snapshot digest, and policy digest. An upstream digest change SHALL invalidate downstream
receipts. Prototype evidence SHALL require an explicit promotion receipt before satisfying a
production target. Component conformance SHALL remain distinct from visual acceptance.

#### Scenario: An upstream target snapshot changes

- **WHEN** a component or target snapshot digest differs from the digest bound by a downstream page
  or browser receipt
- **THEN** the downstream receipt SHALL become stale and SHALL NOT satisfy component conformance
- **AND** visual acceptance SHALL remain a separate result rather than being inferred.
