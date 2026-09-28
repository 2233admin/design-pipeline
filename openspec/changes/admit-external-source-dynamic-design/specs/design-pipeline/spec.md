## ADDED Requirements

### Requirement: External sources require governed promotion before executable admission

The pipeline SHALL keep every external source `reference-only` until an explicit governed promotion binds its source revision/content identity, provenance and license status, admission outcome, declared deploy profile, and allowlisted sandbox boundary. For an admitted source that is VCS-backed, the VCS revision/commit SHALL be bound as part of the source identity; a non-VCS source SHALL use its applicable revision/content identity and SHALL NOT require Git.

#### Scenario: Reference-only source remains inert

- **WHEN** an external repository, page, archive, or tool reference is ingested without a governed promotion
- **THEN** its admission SHALL remain `reference-only`
- **AND** it SHALL NOT be installed, materialized as executable, or used as a runtime dependency

#### Scenario: Governed promotion creates an isolated executable snapshot

- **WHEN** an external source passes the explicit admission decision with matching revision/content identity, provenance, license/status, declared deploy profile, and sandbox allowlist
- **THEN** Deploy/Runtime MAY materialize that source as an isolated executable snapshot inside the declared sandbox
- **AND** the promotion SHALL remain bound to the existing execution-target, route, toolchain, and receipt authorities

#### Scenario: An untrusted repository cannot expand execution

- **WHEN** an external repository requests an arbitrary command, lifecycle hook, package script, or deploy action outside the declared allowlist
- **THEN** the request SHALL be rejected as blocked or invalid
- **AND** no repository-provided instruction SHALL expand the sandbox or deploy profile

### Requirement: Promoted sources use an isolated companion workspace

Deploy/Runtime SHALL own a disposable/companion workspace for each promoted external source. The workspace MUST be outside both the source tree and the target tree, bound to the execution-target and declared deploy profile, and isolated and contained. Workspace lifecycle, cleanup, retention, disposal, and recovery policy SHALL be explicit and SHALL reuse existing execution-target, route, toolchain, receipt, and Probe/Gate authorities rather than adding a parallel gate.

#### Scenario: Companion workspace excludes source and target trees

- **WHEN** a promoted source is materialized for execution
- **THEN** Deploy/Runtime SHALL place its disposable/companion workspace outside the source tree and target tree
- **AND** the workspace SHALL be bound to the execution-target and declared deploy profile and remain isolated and contained

#### Scenario: Source writeback or target-tree mutation is blocked

- **WHEN** a companion workspace or promoted-source operation attempts to write back, push, or commit to the source location, or mutate the target tree
- **THEN** the operation SHALL be rejected or remain blocked
- **AND** the source location and target tree SHALL remain unchanged

#### Scenario: Companion workspace policy is explicit and hash-bound

- **WHEN** Deploy/Runtime materializes an admitted source snapshot
- **THEN** the snapshot SHALL carry a versioned companion-workspace policy containing `retentionWindowMs`, `maxSnapshots`, `disposeOnFailure`, and `recoveryFromPartialStaging`
- **AND** the policy hash SHALL be bound into the snapshot content identity and any lifecycle receipt

#### Scenario: Retention and disposal are contained and idempotent

- **WHEN** an owner prunes or disposes a companion workspace
- **THEN** it SHALL remove only entries contained by the canonical companion workspace root, preserve source and target trees, and emit a receipt
- **AND** repeating the same operation SHALL be an idempotent no-op with an explicit lifecycle status

#### Scenario: Partial staging recovery preserves published materialization

- **WHEN** materialization fails with partial staging entries
- **THEN** recovery SHALL remove partial staging while preserving the last published snapshot by default
- **AND** when `disposeOnFailure` is true, recovery MAY dispose the remaining companion workspace entries without touching source or target trees


### Requirement: Dynamic Design owns composition rather than source or runtime execution

Dynamic Design SHALL consume only a governed live endpoint or a built static artifact and SHALL emit a structured motion/interaction composition with evidence references. Dynamic Design SHALL NOT clone sources, build artifacts, start runtimes, capture observations, run Probe/Gate, package outputs, or publish final artifacts.

#### Scenario: Dynamic Design consumes a governed endpoint

- **WHEN** Deploy/Runtime provides a governed live endpoint with its execution-target, route, toolchain, and receipt identity
- **THEN** Dynamic Design SHALL use that endpoint as an input to composition
- **AND** the composition SHALL retain references to the evidence supporting the result

#### Scenario: Dynamic Design consumes a built static artifact

- **WHEN** Deploy/Runtime provides a built static artifact with matching identity and receipt lineage
- **THEN** Dynamic Design SHALL compose against that artifact
- **AND** it SHALL not clone the source, rebuild the artifact, or start a runtime

#### Scenario: Dynamic Design cannot publish

- **WHEN** a composition is complete
- **THEN** Dynamic Design SHALL hand off the composition and evidence references to the owning downstream authorities
- **AND** it SHALL not capture, package, or publish a final artifact

### Requirement: Capture, Probe/Gate, and Package/Publish preserve complete lineage

The pipeline SHALL preserve source revision/content identity and artifact hashes through the admitted snapshot, execution target and deploy profile, governed endpoint or static artifact, Dynamic Design composition, Capture observation, Probe/Gate evidence, and Package/Publish final artifact. It SHALL reuse existing execution-target, route, toolchain, and receipt authorities rather than introducing a second gate system.

#### Scenario: Source identity flows to the final artifact

- **WHEN** a source is promoted and a final artifact is prepared for publication
- **THEN** lineage SHALL resolve from source revision/content identity through every intermediate handoff to the final artifact
- **AND** for a VCS-backed source, its bound VCS revision/commit SHALL be carried through the final lineage
- **AND** for a non-VCS source, its applicable revision/content identity SHALL be carried through the final lineage without inventing or requiring a Git revision/commit

#### Scenario: Capture and Probe/Gate retain ownership

- **WHEN** a governed endpoint or static artifact is observed and verified
- **THEN** Capture SHALL own the observation evidence
- **AND** Probe/Gate SHALL own verification evidence and readiness status
- **AND** neither stage SHALL rewrite source identity or upstream receipts

#### Scenario: Final publication requires the existing gate outcome

- **WHEN** Package/Publish receives a candidate final artifact
- **THEN** it SHALL publish only when lineage is complete, identities and hashes agree, and the existing required Probe/Gate outcome permits publication
- **AND** an incomplete, mismatched, blocked, review-only, invalid, or unverified candidate SHALL not be published

### Requirement: motion-web remains a reviewed reference/parity fixture

The pipeline SHALL use the reviewed motion-web revision only as a reference/parity fixture. It SHALL NOT make motion-web a dependency, runtime, namespace, or copied implementation, and SHALL respect its observed CC BY-NC boundary.

#### Scenario: Motion-web reference is used without copying

- **WHEN** a capability or parity review consults motion-web
- **THEN** the project-owned capability and existing authorities SHALL remain the implementation source
- **AND** upstream code, assets, fonts, case names, prompts, CLI, tests, workflow, and one-for-one motifs SHALL not be copied or redistributed
- **AND** no motion-web runtime or package dependency SHALL be introduced
