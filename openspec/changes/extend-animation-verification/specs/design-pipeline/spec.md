## ADDED Requirements

### Requirement: Animation evidence probes remain deterministic and gate-neutral

The pipeline SHALL provide reusable adapter-neutral probes for authored-time animation evidence without introducing a second runtime, readiness gate, or receipt authority.

#### Scenario: Authored time is sampled

- **WHEN** a probe receives a seekable target and authored duration
- **THEN** it SHALL verify seek at start, middle, and end, settle at the declared end, and reset to the initial state
- **AND** fixed-step samples SHALL be available at 30, 60, and 120 fps without wall-clock dependence.

#### Scenario: Real interaction is replayed

- **WHEN** a probe receives a `design-pipeline.animation-input-trace.v1` envelope
- **THEN** it SHALL validate schema/version, source and viewport metadata, monotonic event timestamps, non-empty keyboard keys, legal pointer/touch phases, and drag `start` -> `move*` -> `end` ordering
- **AND** it SHALL repeat the ordered events and report whether state transitions are deterministic, including a focused touch scenario
- **AND** the envelope SHALL remain persistable for later replay while execution remains adapter-neutral and in-memory.

#### Scenario: Transition and accessibility behavior is checked

- **WHEN** sampled states are evaluated
- **THEN** evidence SHALL check a meaningful middle state and state exit at the declared end
- **AND** no-teleport SHALL require a declared scalar/vector extractor or channel list with per-channel thresholds, support multi-channel vectors, and return blocked/invalid when the metric declaration is missing
- **AND** reduced-motion evidence SHALL require an explicit expected terminal state and explicit preference signal, reach the terminal state without intermediate motion, and block when either is missing.

#### Scenario: Lifecycle and performance are measured

- **WHEN** a target is initialized and disposed or frame/input samples are evaluated
- **THEN** evidence SHALL require a non-empty sample array, check observable cleanup through `cleanupStatus()` or the compatible mount/metrics path, idempotent disposal, and zero tracked listeners/timers/animation handles/resources after disposal
- **AND** performance evidence SHALL consume validated core Animation Job `budgets` for object, particle, texture, and frame limits, with scalar frame input-latency/CPU limits when those samples are present, and SHALL block missing or over-budget evidence.

#### Scenario: Existing receipt references are adapted

- **WHEN** generic probe evidence is attached to an animation artifact
- **THEN** the adapter SHALL require source identity/revision/content hash, native source-admission receipt, materialized admitted snapshot, native execution target (including plan/state/outcome and ready toolchain-plan payload), deploy profile, runtime or static artifact, Dynamic Design composition, native capture evidence, existing motion gate receipt, and final artifact references
- **AND** every referenced owner validator SHALL execute with trusted contained roots and native receipt/hash linkage; transport wrappers SHALL only cross-check native identities
- **AND** any missing, incomplete, review-required, invalid, blocked, detached, or hash/schema/status-mismatched chain SHALL return blocked/invalid and SHALL NOT produce a final artifact
- **AND** the adapter SHALL reuse existing owner receipt/schema/gate authorities and SHALL NOT create a new lineage receipt schema, readiness gate, or replacement status authority.
