## ADDED Requirements

### Requirement: Native completion requires task work beyond verifier evidence

Native completion SHALL observe at least one task-window change within the current task's source scope or declared outputs before verification writes and through snapshot rechecks. Exact verifier-owned check reports, completion metadata and native state/event controls SHALL NOT count as task work. Dispatch and scope repair SHALL preserve their existing baseline behavior.

#### Scenario: A pre-existing good page is submitted unchanged

- **WHEN** a dispatched task has a passing output but no new task change
- **THEN** completion SHALL remain blocked before browser execution or report/metadata writes
- **AND** repeating next or completion SHALL retain the original baseline

#### Scenario: Only verifier-owned files change inside a broad source scope

- **WHEN** the only task-window changes are exact reports, completion metadata or native state/event controls
- **THEN** completion SHALL remain blocked
- **AND** a real source or declared output edit in the same directory SHALL remain eligible

#### Scenario: A real task edit is measured repeatedly

- **WHEN** an actual scoped edit is retained while a failed verifier is rerun
- **THEN** existing observed failure evidence and counts SHALL remain valid for the measured snapshot
- **AND** a passing supported verifier SHALL complete that current snapshot without granting Visual Acceptance

### Requirement: Native contract rejection checks do not require a browser

Repository tests SHALL exercise browser-independent native contract failures without resolving Chrome. Scenarios that execute the browser SHALL use existing tool resolution and skip only when required tools are unavailable.

#### Scenario: Chrome is unavailable during contract rejection checks

- **WHEN** missing-plan, guide-conflict or report-only fixtures reject before browser execution
- **THEN** those checks SHALL run and assert their contract failures even if Chrome resolution would fail
