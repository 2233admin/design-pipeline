## ADDED Requirements

### Requirement: Workflow passes bind current checked inputs

Workflow gate passes SHALL bind the current bytes of their declared checked files. Missing, changed or unbound required files SHALL reopen the existing check. The workflow and verifier SHALL use the same existing film render selection. A timestamp or a check of a different output SHALL NOT substitute for this binding.

#### Scenario: Changed content retains its timestamp

- **WHEN** a checked file changes while its original timestamp is restored
- **THEN** the workflow SHALL return the corresponding check rather than done

#### Scenario: Required input disappears or only legacy time is recorded

- **WHEN** a required checked file is missing or the stored pass contains only status and time
- **THEN** the workflow SHALL require fresh verification without deleting the old state

#### Scenario: A newer film render is present

- **WHEN** the existing verifier selects a newer nonempty film render
- **THEN** the workflow SHALL bind that same render and SHALL NOT reuse a check of an older video

#### Scenario: A custom edit output was checked

- **WHEN** a successful edit check targeted another output file
- **THEN** its pass SHALL NOT complete the default draft's check stage

#### Scenario: Interaction verification targets another page

- **WHEN** a probe measures a different local page or a remote URL
- **THEN** its pass SHALL NOT substitute an unrelated local index.html as the measured input

#### Scenario: Verification output would overwrite its input

- **WHEN** interaction output names the same file as its probe, including a filesystem alias
- **THEN** verification SHALL reject the output before capture and preserve the probe and workflow state

### Requirement: Workflow review belongs to the current draft

Draft acceptance SHALL bind the current checked-input snapshot and use the latest review decision. Rejection or a changed checked snapshot SHALL reopen review and any dependent standard delivery. Engineering checks SHALL NOT produce owner Visual Acceptance.

#### Scenario: An accepted draft is rejected

- **WHEN** the owner rejects the currently accepted draft with feedback
- **THEN** the workflow SHALL preserve both decisions and require a new review after rechecking

#### Scenario: Accepted output changes and passes another check

- **WHEN** an accepted draft changes and its new version passes engineering checks
- **THEN** the previous acceptance SHALL NOT authorize delivery of the new version

### Requirement: Delivery cannot bypass workflow prerequisites

Delivery recording SHALL reject unfinished prerequisites without writing state. Film and edit delivery SHALL name an existing contained file. Standard delivery SHALL bind its current check snapshot and local film/edit output. UI's existing work-stage declaration SHALL remain available with Visual Acceptance unevaluated; quick workflows MAY record delivery after all applicable stages finish.

#### Scenario: Delivery is recorded before verification

- **WHEN** delivery is requested while a prerequisite action remains
- **THEN** the command SHALL return a contract error naming that action and leave state unchanged

#### Scenario: Film or edit output is missing or escaping

- **WHEN** film/edit delivery names a missing file, directory or path outside the project
- **THEN** the command SHALL reject it without recording delivery

#### Scenario: A delivered standard output changes

- **WHEN** its check snapshot or bound delivery file changes
- **THEN** the previous delivery SHALL NOT complete the changed workflow

#### Scenario: Legacy UI records its bounded work

- **WHEN** UI reaches work after its intake and reference prerequisites
- **THEN** it MAY record the existing completion declaration and SHALL report Visual Acceptance as not evaluated

### Requirement: Agent verification instructions drive the real surface

The packaged QA guidance SHALL teach launch, readiness checks, real user-path verification, retained evidence, owned-process cleanup and failure recovery through existing commands. It SHALL distinguish partial capture, evidence integrity, functional checks and owner Visual Acceptance. The maintained instructions SHALL be exercised on at least one real public-command path before delivery.

#### Scenario: A partial capture validates structurally

- **WHEN** a capture is partial or an evidence validator exits successfully without exercising behavior
- **THEN** the agent SHALL retain that scope and SHALL NOT report full functional verification

#### Scenario: Verification cannot run

- **WHEN** a required instance, input, tool or observation is unavailable
- **THEN** the agent SHALL report the missing check and recovery action without inventing a passing result
