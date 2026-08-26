## ADDED Requirements

### Requirement: Component-first conformance has layered deterministic boundaries

The pipeline SHALL expose synchronous `checkComponentFirstGate()` and aggregate/stage CLI commands
through a thin facade. Filesystem, path, hash, PNG, and existing-core work SHALL occur only in
adapters. Stack/runtime, component contract, Playground, page usage, and evidence gates SHALL be
pure, SHALL NOT import one another, and SHALL return one versioned GateResult shape. The
orchestrator SHALL resolve context once and the serializers SHALL contain no domain decisions.

#### Scenario: Independent requirements fail

- **WHEN** multiple independently evaluable component-first requirements are unmet
- **THEN** every independent finding SHALL be collected in stable gate and reason-code order
- **AND** invalid SHALL take precedence over blocked, and blocked over passed
- **AND** an invalid dependency SHALL mark only dependent work `not_evaluated`.

### Requirement: Component-first v1 preserves explicit component and readiness semantics

The v1 policy SHALL require the five baseline roles `action`, `form-control`, `selection`,
`overlay`, and `feedback`, while keeping route-specific page requirements separate. Component
origin SHALL be modeled independently from runtime stack. A project-owned component SHALL NOT pass
without source, symbol, contract, token, keyboard, focus, state, Playground, and page-use evidence.
Readiness SHALL contain both level and prototype/production scope.

#### Scenario: Prototype evidence is evaluated for a production target

- **WHEN** a sandbox reaches `page-ready` with `scope: prototype`
- **AND** the target requires production readiness
- **THEN** the page gate SHALL remain blocked
- **AND** it SHALL NOT reinterpret the prototype receipt as production evidence.

### Requirement: Component-first evidence is externally produced and byte-verified

Component-first gates SHALL NOT execute a browser or target project. An adapter SHALL read external
evidence, verify contained paths and actual byte hashes, and fully decode PNG screenshots before a
pure gate evaluates them. Hash binding SHALL be documented as mismatch/staleness protection, not
producer authenticity.

#### Scenario: A file only has a PNG suffix

- **WHEN** screenshot bytes cannot be completely decoded as PNG
- **THEN** the evidence gate SHALL return invalid with a stable reason code
- **AND** the aggregate SHALL exit `1` without browser execution or state mutation.

### Requirement: Component-first stage commands are read-only compatibility surfaces

The CLI SHALL provide `component-first check|stack|components|playground|page` and SHALL keep
`high-fidelity check` as an aggregate delegation alias. Stage JSON SHALL use
`component-first-stage-result.v1`. Exit codes SHALL be `0` passed, `1` invalid, and `2` blocked.

#### Scenario: A stage is blocked

- **WHEN** a valid stage input lacks required conformance evidence
- **THEN** the command SHALL write its versioned result to stdout and exit `2`
- **AND** it SHALL NOT write pipeline state, generate browser evidence, or install dependencies.
