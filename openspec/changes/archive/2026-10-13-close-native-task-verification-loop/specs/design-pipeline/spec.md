## ADDED Requirements

### Requirement: Native completion observes its required verification

Native task completion SHALL run each supported required verifier through its trusted public completion operation and use the observed result before promotion. Caller-written reports, receipt invocation fields and producer labels SHALL NOT substitute for that execution. Failed, missing, partial or unsupported verification SHALL block completion.

#### Scenario: Correctly hashed self-written evidence is submitted

- **WHEN** a caller submits a passed report or success receipt without observed verification
- **THEN** completion SHALL run the declared supported verifier or remain blocked
- **AND** the report alone SHALL NOT authorize technical completion or owner review

#### Scenario: The existing browser interaction check runs

- **WHEN** the current local web task has a supported interaction verification binding
- **THEN** completion SHALL use actual browser measurements and the existing evaluator verdict
- **AND** missing tools, failed capture, timeout or incomplete measurements SHALL block promotion

#### Scenario: The probe targets a different page

- **WHEN** the first-slice probe targets a remote URL or a local page other than its declared task output
- **THEN** native completion SHALL reject the verification binding
- **AND** the probe and actual output SHALL be included in the checked snapshot rather than substituting an unrelated default page

### Requirement: Native task scope uses a preserved observed baseline

Before native task work, the tool SHALL capture a task-bound baseline and at completion compare actual observable changes with that task's literal scope and explicitly declared artifact paths. Unchanged pre-existing edits SHALL NOT count as new task changes. A missing baseline or unobservable target SHALL block scope-verified completion.

#### Scenario: A pre-existing dirty file is unchanged

- **WHEN** another dirty file existed before dispatch and retains its exact content and status
- **THEN** it SHALL NOT be counted as a new out-of-scope task change
- **AND** modifying that same dirty file afterward SHALL be detected even if its Git status stays unchanged

#### Scenario: Only staged contents change

- **WHEN** a file's Git index contents change while its working bytes and porcelain status remain unchanged
- **THEN** the change SHALL be included in the observed task delta
- **AND** unresolved merge stages SHALL block scope-verified completion

#### Scenario: An out-of-scope commit is reverted

- **WHEN** the attempt commits an out-of-scope change and later reverts it in another visible commit
- **THEN** the changed paths in that commit history SHALL still block completion
- **AND** an unverifiable history replacement SHALL NOT establish a clean task delta

#### Scenario: Work escapes the current task scope

- **WHEN** the observed task delta contains an out-of-scope file, including a file belonging to a different task
- **THEN** completion SHALL be blocked before review and SHALL retain the changed files and diagnostic evidence
- **AND** another task's scope SHALL NOT authorize the change

#### Scenario: The caller repeats next or retries failed work

- **WHEN** next is repeated or an unfinished attempt fails
- **THEN** the original active baseline SHALL remain bound to that attempt
- **AND** repeating dispatch SHALL NOT adopt an out-of-scope edit into a fresh baseline

#### Scenario: A changed plan expands the allowed scope

- **WHEN** the plan changes while an attempt has unresolved changes
- **THEN** the tool SHALL inspect that attempt against its preserved original authorization before adopting a new window
- **AND** the new scope SHALL NOT retroactively authorize an old out-of-scope edit

### Requirement: Native verification commits one current evidence snapshot

Observed verification and scope results SHALL bind the current target, task, plan, inputs, outputs and artifacts. A changed binding during verification SHALL prevent completion. Upstream drift SHALL invalidate dependent technical evidence and review. Existing state/event transaction and artifact lineage SHALL remain authoritative.

#### Scenario: Output changes while verification runs

- **WHEN** an input, output, task or plan changes between verification start and completion commit
- **THEN** the observed result SHALL NOT be bound to the changed version
- **AND** completion SHALL return a repair or rerun action rather than passed

#### Scenario: The report destination aliases another bound file

- **WHEN** the proposed check report aliases any bound input, declared output, another check destination, active plan, native state or event ledger
- **THEN** completion SHALL reject the destination before capture and preserve those files

#### Scenario: Probe expectations change after a pass

- **WHEN** the probe bytes change after observed verification
- **THEN** the task's previous check and dependent review SHALL become stale and require verification of the new expectations

#### Scenario: Completion evidence changes after review

- **WHEN** a completed task's observed evidence or bound output changes
- **THEN** the task and affected downstream evidence SHALL become stale
- **AND** previous owner acceptance SHALL NOT authorize the changed version

### Requirement: Native verification exposes its coverage and recovery

Native next SHALL return one concrete supported action with missing prerequisites or verifier failure context. Technical results SHALL identify the observed check and scope coverage and SHALL NOT imply producer authentication outside the trusted execution boundary, complete filesystem write policing, Component Conformance or Visual Acceptance.

#### Scenario: An old plan has only report paths

- **WHEN** a native plan or completion record lacks an executable verification binding or task baseline
- **THEN** it SHALL remain readable and require explicit binding and fresh verification before advancement
- **AND** next SHALL identify the required repair without deleting history

#### Scenario: Verification is outside the supported first slice

- **WHEN** the task needs an unsupported verifier or its scope cannot be observed
- **THEN** next SHALL report blocked with the missing capability
- **AND** an agent narrative or an unknown result SHALL NOT substitute for a pass

#### Scenario: An observed technical check passes

- **WHEN** required verification and observable scope checks pass for the same snapshot
- **THEN** the existing exact-version owner review SHALL remain applicable
- **AND** Component Conformance and Visual Acceptance SHALL be reported separately from that technical pass
